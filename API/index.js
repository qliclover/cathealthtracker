require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs'); // Use bcryptjs for better compatibility
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Initialize Prisma client with logging for easier debugging
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Test database connection
prisma.$connect()
  .then(() => console.log('Connected to database'))
  .catch((e) => console.error('Failed to connect to database:', e));

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

// Simplified file handling for serverless environment
const storage = multer.memoryStorage();  // Use memory storage instead of disk
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    console.log("Upload file info:", file);
    cb(null, true);
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
      records: ['/api/cats/:catId/records', '/api/records/:id']
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
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
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
    const cats = await prisma.cat.findMany({
      where: { ownerId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cats);
  } catch (error) {
    console.error('Get cats error:', error);
    res.status(500).json({ message: 'Failed to get cat list' });
  }
});

// Get a single cat along with its health records
app.get('/api/cats/:id', authenticateToken, async (req, res) => {
  try {
    const cat = await prisma.cat.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { healthRecords: true }
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

// Create a cat with placeholder image
app.post('/api/cats', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, breed, age, weight } = req.body;
    
    // Use placeholder image URL instead of file upload
    const imageUrl = "https://placehold.co/400x300?text=Cat+Photo";

    const cat = await prisma.cat.create({
      data: {
        name,
        breed,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        imageUrl,
        ownerId: req.user.userId
      }
    });

    res.status(201).json(cat);
  } catch (error) {
    console.error('Create cat error:', error);
    res.status(500).json({ message: 'Failed to create cat' });
  }
});

// Update cat information
app.put('/api/cats/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, breed, age, weight } = req.body;
    const catId = parseInt(req.params.id);

    // Check if the cat exists and belongs to current user
    const existingCat = await prisma.cat.findUnique({
      where: { id: catId }
    });

    if (!existingCat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (existingCat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this cat' });
    }

    // Keep existing image or use placeholder
    const imageUrl = existingCat.imageUrl || "https://placehold.co/400x300?text=Cat+Photo";

    const updatedCat = await prisma.cat.update({
      where: { id: catId },
      data: {
        name,
        breed,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        imageUrl
      }
    });

    res.json(updatedCat);
  } catch (error) {
    console.error('Update cat error:', error);
    res.status(500).json({ message: 'Failed to update cat information' });
  }
});

// Add a health record for a cat
app.post('/api/cats/:catId/records', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { type, date, description, notes } = req.body;
    const catId = parseInt(req.params.catId);

    // Check if the cat exists and belongs to current user
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to add records for this cat' });
    }

    // For file uploads, use a placeholder file URL
    const fileUrl = req.file ? "https://placehold.co/100x100?text=File" : null;

    const record = await prisma.healthRecord.create({
      data: {
        type,
        date: new Date(date),
        description,
        notes,
        fileUrl,
        catId
      }
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
    });

    res.json(records);
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

// Update a health record
app.put('/api/records/:id', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { type, date, description, notes } = req.body;
    const recordId = parseInt(req.params.id);

    // Retrieve the existing record along with the associated cat
    const record = await prisma.healthRecord.findUnique({
      where: { id: recordId },
      include: { cat: true }
    });

    if (!record) {
      return res.status(404).json({ message: 'Health record not found' });
    }

    // Verify that the record belongs to the authenticated user
    if (record.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this record' });
    }

    // Keep existing file URL or use a placeholder if a new file is uploaded
    let fileUrl = record.fileUrl;
    if (req.file) {
      fileUrl = "https://placehold.co/100x100?text=File";
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
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error('Update health record error:', error);
    res.status(500).json({ message: 'Failed to update health record' });
  }
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

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});