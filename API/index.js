require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

// Configure CORS to allow requests from the frontend
app.use(cors({
  origin: ['https://cathealthtracker.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Middleware: Verify JWT token
const authenticateToken = (req, res, next) => {
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

// User registration
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

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

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

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
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
    res.status(500).json({ message: 'Login failed, please try again' });
  }
});

// Get all cats
app.get('/api/cats', authenticateToken, async (req, res) => {
  try {
    const cats = await prisma.cat.findMany({
      where: { ownerId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get cat list' });
  }
});

// Get a single cat
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
    res.status(500).json({ message: 'Failed to get cat information' });
  }
});

// Create a cat
app.post('/api/cats', authenticateToken, async (req, res) => {
  try {
    const { name, breed, age, weight } = req.body;

    const cat = await prisma.cat.create({
      data: {
        name,
        breed,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        ownerId: req.user.userId
      }
    });

    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create cat' });
  }
});

// Update a cat
app.put('/api/cats/:id', authenticateToken, async (req, res) => {
  try {
    const { name, breed, age, weight } = req.body;
    const catId = parseInt(req.params.id);

    // Check if cat exists and belongs to current user
    const existingCat = await prisma.cat.findUnique({
      where: { id: catId }
    });

    if (!existingCat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (existingCat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this cat' });
    }

    const updatedCat = await prisma.cat.update({
      where: { id: catId },
      data: {
        name,
        breed,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null
      }
    });

    res.json(updatedCat);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update cat information' });
  }
});

// Add health record
app.post('/api/cats/:catId/records', authenticateToken, async (req, res) => {
  try {
    const { type, date, description, notes } = req.body;
    const catId = parseInt(req.params.catId);

    // Check if cat exists and belongs to current user
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    });

    if (!cat) {
      return res.status(404).json({ message: 'Cat not found' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to add records for this cat' });
    }

    const record = await prisma.healthRecord.create({
      data: {
        type,
        date: new Date(date),
        description,
        notes,
        catId
      }
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add health record' });
  }
});

// Get cat health records
app.get('/api/cats/:catId/records', authenticateToken, async (req, res) => {
  try {
    const catId = parseInt(req.params.catId);

    // Check if cat exists and belongs to current user
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
    res.status(500).json({ message: 'Failed to get health records' });
  }
});

// Update health record
app.put('/api/records/:id', authenticateToken, async (req, res) => {
  try {
    const { type, date, description, notes } = req.body;
    const recordId = parseInt(req.params.id);

    // Get record and check permissions
    const record = await prisma.healthRecord.findUnique({
      where: { id: recordId },
      include: { cat: true }
    });

    if (!record) {
      return res.status(404).json({ message: 'Health record not found' });
    }

    if (record.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to modify this record' });
    }

    const updatedRecord = await prisma.healthRecord.update({
      where: { id: recordId },
      data: {
        type,
        date: new Date(date),
        description,
        notes
      }
    });

    res.json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update health record' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});