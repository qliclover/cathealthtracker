require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs'); 
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ical = require('ical-generator').default;
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// default image if photo not working
const defaultImageUrl = "https://placehold.co/400x300?text=Cat+Photo";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Initialize Prisma client with logging for easier debugging
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Improved database connection logic with retries
let connectionRetries = 0;
const maxRetries = 5;

const connectWithRetry = async () => {
  try {
    await prisma.$connect();
    console.log('Connected to database');
    connectionRetries = 0;  // Reset retry counter on successful connection
  } catch (e) {
    connectionRetries++;
    console.error(`Database connection attempt ${connectionRetries} failed:`, e);
    
    if (connectionRetries < maxRetries) {
      console.log(`Retrying connection in 5 seconds... (Attempt ${connectionRetries + 1}/${maxRetries})`);
      
      // Retry after 5 seconds
      setTimeout(connectWithRetry, 5000);
    } else {
      console.error('Maximum connection retries reached. Please check your database configuration.');
    }
  }
};

// Start connecting to database
connectWithRetry();

const app = express();

// CORS middleware to ensure all responses have proper headers,
// including error responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://cathealthtracker.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

// Basic settings
app.use(express.json());

// setting up cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cat-health-tracker',
    format: async (req, file) => 'jpg',
    public_id: (req, file) => `cat-${Date.now()}`
  }
});

// Using cloudinary
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    console.log("Upload file info:", file);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(' photo file only! '), false);
    }
  }
});

// Root path handler
app.get('/', (req, res) => {
  res.json({ 
    message: 'Cat Health Tracker API is running',
    version: '1.0.0',
    endpoints: {
      auth: ['/api/register', '/api/login'],
      cats: ['/api/cats', '/api/cats/:id'],
      records: ['/api/cats/:catId/records', '/api/records/:id'],
      insurance: ['/api/cats/:catId/insurance', '/api/insurance/:id'],
      careTasks: ['/api/cats/:catId/caretasks', '/api/caretasks/:id']
    }
  });
});

// Middleware: Verify JWT token
const authenticateToken = (req, res, next) => {
  // Skip authentication for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token not provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid authentication token' });
    }
    req.user = user;
    next();
  });
};

// User registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      return null;
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    }).catch(async (error) => {
      // If creation fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      // Retry creation after reconnect
      return await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword
        }
      });
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed, please try again',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    }).catch(async (error) => {
      // If query fails, try reconnecting and retry
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.user.findUnique({
        where: { email }
      });
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcryptjs.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed, please try again' });
  }
});

// Get all cats for the authenticated user
app.get('/api/cats', authenticateToken, async (req, res) => {
  try {
    // Try to fetch cats with retry logic
    const cats = await prisma.cat.findMany({
      where: { ownerId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      // Retry query after reconnect
      return await prisma.cat.findMany({
        where: { ownerId: req.user.userId },
        orderBy: { createdAt: 'desc' }
      });
    });
    
    res.json(cats || []);  // Ensure we always return an array
  } catch (error) {
    console.error('Get cats error:', error);
    res.status(500).json({ message: 'Failed to get cat list' });
  }
});

// Delete a cat
app.delete('/api/cats/:id', authenticateToken, async (req, res) => {
  try {
    const catId = parseInt(req.params.id);

    // Check if the cat exists and belongs to current user
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.findUnique({
        where: { id: catId }
      });
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this cat' });
    }

    // Delete the cat
    await prisma.cat.delete({
      where: { id: catId }
    }).catch(async (error) => {
      // If delete fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.delete({
        where: { id: catId }
      });
    });

    res.json({ message: 'Cat deleted successfully' });
  } catch (error) {
    console.error('Delete cat error:', error);
    res.status(500).json({ message: 'Failed to delete cat' });
  }
});

// Get a single cat along with its health records and care tasks
app.get('/api/cats/:id', authenticateToken, async (req, res) => {
  try {
    const cat = await prisma.cat.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { 
        healthRecords: true,
        insurance: true,
        careTasks: true
      }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      // Retry query after reconnect
      return await prisma.cat.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { 
          healthRecords: true,
          insurance: true,
          careTasks: true
        }
      });
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to access this cat' });
    }

    res.json(cat);
  } catch (error) {
    console.error('Get cat error:', error);
    res.status(500).json({ message: 'Failed to get cat information' });
  }
});

// Create a cat with Cloudinary upload
app.post('/api/cats', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, breed, age, weight } = req.body;
    
    const imageUrl = req.file ? req.file.path : defaultImageUrl;
    
    console.log("Saving image URL:", imageUrl); // For debugging

    const cat = await prisma.cat.create({
      data: {
        name,
        breed,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        imageUrl,
        ownerId: req.user.userId
      }
    }).catch(async (error) => {
      // If creation fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      // Retry creation after reconnect
      return await prisma.cat.create({
        data: {
          name,
          breed,
          age: age ? parseInt(age) : null,
          weight: weight ? parseFloat(weight) : null,
          imageUrl,
          ownerId: req.user.userId
        }
      });
    });

    res.status(201).json(cat);
  } catch (error) {
    console.error('Create cat error:', error);
    res.status(500).json({ message: 'Failed to create cat' });
  }
});

// Update cat information with Cloudinary upload
app.put('/api/cats/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, breed, age, weight } = req.body;
    const catId = parseInt(req.params.id);

    // Check if the cat exists and belongs to current user
    const existingCat = await prisma.cat.findUnique({
      where: { id: catId }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.findUnique({
        where: { id: catId }
      });
    });

    if (!existingCat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (existingCat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this cat' });
    }

    const imageUrl = req.file ? req.file.path : existingCat.imageUrl;

    // For debugging
    console.log("Updating image URL:", imageUrl); 

    const updatedCat = await prisma.cat.update({
      where: { id: catId },
      data: {
        name,
        breed,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        imageUrl
      }
    }).catch(async (error) => {
      // If update fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.update({
        where: { id: catId },
        data: {
          name,
          breed,
          age: age ? parseInt(age) : null,
          weight: weight ? parseFloat(weight) : null,
          imageUrl
        }
      });
    });

    res.json(updatedCat);
  } catch (error) {
    console.error('Update cat error:', error);
    res.status(500).json({ message: 'Failed to update cat information' });
  }
});

const fileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cat-health-records',
    format: async (req, file) => 'auto',
    public_id: (req, file) => `record-${Date.now()}`
  }
});

const uploadFile = multer({ 
  storage: fileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Add a health record for a cat with file upload
app.post('/api/cats/:catId/records', authenticateToken, uploadFile.single('file'), async (req, res) => {
  try {
    const { type, date, description, notes } = req.body;
    const catId = parseInt(req.params.catId);

    // Check if the cat exists and belongs to current user
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.findUnique({
        where: { id: catId }
      });
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to add records for this cat' });
    }

    const fileUrl = req.file ? req.file.path : null;

    const record = await prisma.healthRecord.create({
      data: {
        type,
        date: new Date(date),
        description,
        notes,
        fileUrl,
        catId
      }
    }).catch(async (error) => {
      // If creation fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.healthRecord.create({
        data: {
          type,
          date: new Date(date),
          description,
          notes,
          fileUrl,
          catId
        }
      });
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Add health record error:', error);
    res.status(500).json({ message: 'Failed to add health record' });
  }
});

// Get health records for a cat
app.get('/api/cats/:catId/records', authenticateToken, async (req, res) => {
  try {
    const catId = parseInt(req.params.catId);

    // Check if the cat exists and belongs to the current user
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.findUnique({
        where: { id: catId }
      });
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to view records for this cat' });
    }

    const records = await prisma.healthRecord.findMany({
      where: { catId },
      orderBy: { date: 'desc' }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.healthRecord.findMany({
        where: { catId },
        orderBy: { date: 'desc' }
      });
    });

    res.json(records || []);
  } catch (error) {
    console.error('Get health records error:', error);
    res.status(500).json({ message: 'Failed to get health records' });
  }
});

// GET a single health record by ID (for editing)
app.get('/api/records/:id', authenticateToken, async (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    
    // Retrieve the health record with the associated cat data
    const record = await prisma.healthRecord.findUnique({
      where: { id: recordId },
      include: { cat: true }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.healthRecord.findUnique({
        where: { id: recordId },
        include: { cat: true }
      });
    });
    
    if (!record) {
      return res.status(404).json({ message: 'Health record not found' });
    }
    
    // Verify that the record belongs to the authenticated user
    if (record.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to view this record' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Error fetching health record:', error);
    res.status(500).json({ message: 'Server error while fetching record' });
  }
});

// Update a health record with file upload
app.put('/api/records/:id', authenticateToken, uploadFile.single('file'), async (req, res) => {
  try {
    const { type, date, description, notes } = req.body;
    const recordId = parseInt(req.params.id);

    // Retrieve the existing record along with the associated cat
    const record = await prisma.healthRecord.findUnique({
      where: { id: recordId },
      include: { cat: true }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.healthRecord.findUnique({
        where: { id: recordId },
        include: { cat: true }
      });
    });

    if (!record) {
      return res.status(404).json({ message: 'Health record not found' });
    }

    // Verify that the record belongs to the authenticated user
    if (record.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this record' });
    }

    let fileUrl = record.fileUrl;
    if (req.file) {
      fileUrl = req.file.path;
    }

    const updatedRecord = await prisma.healthRecord.update({
      where: { id: recordId },
      data: {
        type,
        date: new Date(date),
        description,
        notes,
        fileUrl
      }
    }).catch(async (error) => {
      // If update fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.healthRecord.update({
        where: { id: recordId },
        data: {
          type,
          date: new Date(date),
          description,
          notes,
          fileUrl
        }
      });
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error('Update health record error:', error);
    res.status(500).json({ message: 'Failed to update health record' });
  }
});

// Get all care tasks for a cat
app.get('/api/cats/:catId/caretasks', authenticateToken, async (req, res) => {
  try {
    const catId = parseInt(req.params.catId);

    // Check if the cat exists and belongs to the current user
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.findUnique({
        where: { id: catId }
      });
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to view tasks for this cat' });
    }

    // Get today's date at midnight for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await prisma.careTask.findMany({
      where: { 
        catId,
        date: {
          gte: today
        }
      },
      orderBy: { date: 'asc' }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.careTask.findMany({
        where: { 
          catId,
          date: {
            gte: today
          }
        },
        orderBy: { date: 'asc' }
      });
    });

    res.json(tasks || []);
  } catch (error) {
    console.error('Get care tasks error:', error);
    res.status(500).json({ message: 'Failed to get care tasks' });
  }
});

// Create a care task for a cat
app.post('/api/cats/:catId/caretasks', authenticateToken, async (req, res) => {
  try {
    const { title, type, taskType, date, icon } = req.body;
    const catId = parseInt(req.params.catId);

    // Check if the cat exists and belongs to the current user
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.findUnique({
        where: { id: catId }
      });
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to add tasks for this cat' });
    }

    const task = await prisma.careTask.create({
      data: {
        title,
        type, 
        taskType, 
        date: new Date(date),
        icon,
        completed: false,
        catId
      }
    }).catch(async (error) => {
      // If creation fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.careTask.create({
        data: {
          title,
          type,
          taskType,
          date: new Date(date),
          icon,
          completed: false,
          catId
        }
      });
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Add care task error:', error);
    res.status(500).json({ message: 'Failed to add care task' });
  }
});

// Update care task (mark as complete/incomplete)
app.put('/api/caretasks/:id', authenticateToken, async (req, res) => {
  try {
    const { completed } = req.body;
    const taskId = parseInt(req.params.id);

    // Retrieve the task with associated cat data
    const task = await prisma.careTask.findUnique({
      where: { id: taskId },
      include: { cat: true }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.careTask.findUnique({
        where: { id: taskId },
        include: { cat: true }
      });
    });

    if (!task) {
      return res.status(404).json({ message: 'Care task not found' });
    }

    // Verify that the task belongs to a cat owned by the authenticated user
    if (task.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this task' });
    }

    const updatedTask = await prisma.careTask.update({
      where: { id: taskId },
      data: { completed }
    }).catch(async (error) => {
      // If update fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.careTask.update({
        where: { id: taskId },
        data: { completed }
      });
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Update care task error:', error);
    res.status(500).json({ message: 'Failed to update care task' });
  }
});

// Get all insurance information for a cat
app.get('/api/cats/:catId/insurance', authenticateToken, async (req, res) => {
  try {
    const catId = parseInt(req.params.catId);

    // Check if the cat exists and belongs to the current user
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.findUnique({
        where: { id: catId }
      });
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to view insurance for this cat' });
    }

    const insurance = await prisma.insurance.findMany({
      where: { catId },
      orderBy: { startDate: 'desc' }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.insurance.findMany({
        where: { catId },
        orderBy: { startDate: 'desc' }
      });
    });

    res.json(insurance || []);
  } catch (error) {
    console.error('Get insurance error:', error);
    res.status(500).json({ message: 'Failed to get insurance information' });
  }
});

// Add insurance information for a cat
app.post('/api/cats/:catId/insurance', authenticateToken, async (req, res) => {
  try {
    const { provider, policyNumber, startDate, endDate, coverage, premium } = req.body;
    const catId = parseInt(req.params.catId);

    // Check if the cat exists and belongs to the current user
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.findUnique({
        where: { id: catId }
      });
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to add insurance for this cat' });
    }

    const insurance = await prisma.insurance.create({
      data: {
        provider,
        policyNumber,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        coverage,
        premium: premium ? parseFloat(premium) : null,
        catId
      }
    }).catch(async (error) => {
      // If creation fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.insurance.create({
        data: {
          provider,
          policyNumber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          coverage,
          premium: premium ? parseFloat(premium) : null,
          catId
        }
      });
    });

    res.status(201).json(insurance);
  } catch (error) {
    console.error('Add insurance error:', error);
    res.status(500).json({ message: 'Failed to add insurance information' });
  }
});

// GET a single insurance record by ID
app.get('/api/insurance/:id', authenticateToken, async (req, res) => {
  try {
    const insuranceId = parseInt(req.params.id);
    
    // Retrieve the insurance with associated cat data
    const insurance = await prisma.insurance.findUnique({
      where: { id: insuranceId },
      include: { cat: true }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.insurance.findUnique({
        where: { id: insuranceId },
        include: { cat: true }
      });
    });
    
    if (!insurance) {
      return res.status(404).json({ message: 'Insurance information not found' });
    }
    
    // Verify that the insurance belongs to a cat owned by the authenticated user
    if (insurance.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to view this insurance information' });
    }
    
    res.json(insurance);
  } catch (error) {
    console.error('Error fetching insurance:', error);
    res.status(500).json({ message: 'Server error while fetching insurance information' });
  }
});

// Update insurance information
app.put('/api/insurance/:id', authenticateToken, async (req, res) => {
  try {
    const { provider, policyNumber, startDate, endDate, coverage, premium } = req.body;
    const insuranceId = parseInt(req.params.id);

    // Check if the insurance exists and belongs to a cat owned by the current user
    const insurance = await prisma.insurance.findUnique({
      where: { id: insuranceId },
      include: { cat: true }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.insurance.findUnique({
        where: { id: insuranceId },
        include: { cat: true }
      });
    });

    if (!insurance) {
      return res.status(404).json({ message: 'Insurance information not found' });
    }

    if (insurance.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this insurance information' });
    }

    const updatedInsurance = await prisma.insurance.update({
      where: { id: insuranceId },
      data: {
        provider,
        policyNumber,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        coverage,
        premium: premium ? parseFloat(premium) : null
      }
    }).catch(async (error) => {
      // If update fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.insurance.update({
        where: { id: insuranceId },
        data: {
          provider,
          policyNumber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          coverage,
          premium: premium ? parseFloat(premium) : null
        }
      });
    });

    res.json(updatedInsurance);
  } catch (error) {
    console.error('Update insurance error:', error);
    res.status(500).json({ message: 'Failed to update insurance information' });
  }
});

// Delete insurance information
app.delete('/api/insurance/:id', authenticateToken, async (req, res) => {
  try {
    const insuranceId = parseInt(req.params.id);

    // Check if the insurance exists and belongs to a cat owned by the current user
    const insurance = await prisma.insurance.findUnique({
      where: { id: insuranceId },
      include: { cat: true }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.insurance.findUnique({
        where: { id: insuranceId },
        include: { cat: true }
      });
    });

    if (!insurance) {
      return res.status(404).json({ message: 'Insurance information not found' });
    }

    if (insurance.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this insurance information' });
    }

    await prisma.insurance.delete({
      where: { id: insuranceId }
    }).catch(async (error) => {
      // If delete fails, try reconnecting
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.insurance.delete({
        where: { id: insuranceId }
      });
    });

    res.json({ message: 'Insurance information deleted successfully' });
  } catch (error) {
    console.error('Delete insurance error:', error);
    res.status(500).json({ message: 'Failed to delete insurance information' });
  }
});

// GET a single care task by ID
app.get('/api/caretasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // Retrieve the task with associated cat data
    const task = await prisma.careTask.findUnique({
      where: { id: taskId },
      include: { cat: true }
    }).catch(async (error) => {
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.careTask.findUnique({
        where: { id: taskId },
        include: { cat: true }
      });
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Care task not found' });
    }
    
    // Verify that the task belongs to a cat owned by the authenticated user
    if (task.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching care task:', error);
    res.status(500).json({ message: 'Server error while fetching care task' });
  }
});

// Delete a care task
app.delete('/api/caretasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);

    // Check if the task exists and belongs to a cat owned by the current user
    const task = await prisma.careTask.findUnique({
      where: { id: taskId },
      include: { cat: true }
    }).catch(async (error) => {
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.careTask.findUnique({
        where: { id: taskId },
        include: { cat: true }
      });
    });

    if (!task) {
      return res.status(404).json({ message: 'Care task not found' });
    }

    if (task.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await prisma.careTask.delete({
      where: { id: taskId }
    }).catch(async (error) => {
      console.error('Database operation error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.careTask.delete({
        where: { id: taskId }
      });
    });

    res.json({ message: 'Care task deleted successfully' });
  } catch (error) {
    console.error('Delete care task error:', error);
    res.status(500).json({ message: 'Failed to delete care task' });
  }
});

// Calendar subscription endpoint with improved error handling
app.get('/api/calendar.ics', async (req, res) => {
  try {
    // Extract the JWT token from the query string
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication token not provided' });
    }

    // Verify and decode the JWT
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ message: 'Invalid authentication token' });
    }

    // Fetch all cats for the authenticated user
    const cats = await prisma.cat.findMany({ 
      where: { ownerId: payload.userId },
      include: { 
        healthRecords: true,
        careTasks: {
          where: {
            date: {
              gte: new Date()
            }
          }
        }
      }
    }).catch(async (error) => {
      // If query fails, try reconnecting
      console.error('Database query error, trying to reconnect:', error);
      await connectWithRetry();
      
      return await prisma.cat.findMany({
        where: { ownerId: payload.userId },
        include: { 
          healthRecords: true,
          careTasks: {
            where: {
              date: {
                gte: new Date()
              }
            }
          }
        }
      });
    });

    // Create an iCal calendar with safe defaults
    const calendar = ical({
      domain: process.env.APP_DOMAIN || 'cathealthtracker.vercel.app',
      name: 'Cat Health Reminders',
      timezone: process.env.TIMEZONE || 'UTC',
      prodId: {
        company: 'Cat Health Tracker',
        product: 'Health Reminders'
      }
    });

    // Generate events for each cat
    const now = new Date();
    cats.forEach(cat => {
      // Annual vaccination reminder
      const nextVaccine = new Date(now);
      nextVaccine.setFullYear(nextVaccine.getFullYear() + 1);
      calendar.createEvent({
        start: nextVaccine,
        end: new Date(nextVaccine.getTime() + 24 * 60 * 60 * 1000), // Next day
        allDay: true,
        summary: `Annual vaccination for ${cat.name}`,
        description: `Reminder: annual vaccination for ${cat.name}.`
      });

      // Quarterly checkup reminder
      const nextCheckup = new Date(now);
      nextCheckup.setMonth(nextCheckup.getMonth() + 3);
      calendar.createEvent({
        start: nextCheckup,
        end: new Date(nextCheckup.getTime() + 24 * 60 * 60 * 1000), // Next day
        allDay: true,
        summary: `Quarterly checkup for ${cat.name}`,
        description: `Reminder: quarterly checkup for ${cat.name}.`
      });

      // Include all future health records
      if (cat.healthRecords && Array.isArray(cat.healthRecords)) {
        cat.healthRecords.forEach(record => {
          const recordDate = new Date(record.date);
          if (recordDate > now) { // Only future records
            calendar.createEvent({
              start: recordDate,
              end: new Date(recordDate.getTime() + 24 * 60 * 60 * 1000),
              allDay: true,
              summary: `${cat.name}: ${record.type}`,
              description: record.description || `Health record for ${cat.name}`
            });
          }
        });
      }
      
      // Include all care tasks
      if (cat.careTasks && Array.isArray(cat.careTasks)) {
        cat.careTasks.forEach(task => {
          const taskDate = new Date(task.date);
          calendar.createEvent({
            start: taskDate,
            end: new Date(taskDate.getTime() + 24 * 60 * 60 * 1000),
            allDay: true,
            summary: `${task.title}`,
            description: `${task.type} care task for ${cat.name}`
          });
        });
      }
    });

    // Send the calendar as a .ics file
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cat-health.ics"');
    
    // Use toString method instead of serve for better compatibility
    res.send(calendar.toString());
    
  } catch (error) {
    console.error('Calendar generation error:', error);
    res.status(500).json({ message: 'Failed to generate calendar', error: error.message });
  }
});

// Ignore favicon requests
app.get('/favicon.ico', (req, res) => res.sendStatus(204));

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Enhanced error handling middleware with CORS headers
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Ensure CORS headers are set even on errors
  res.header('Access-Control-Allow-Origin', 'https://cathealthtracker.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  res.status(500).json({ 
    message: 'Server error occurred', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});