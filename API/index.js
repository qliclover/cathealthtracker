require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs'); // Use bcryptjs for better compatibility
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ical = require('ical-generator');

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
      include: { 
        healthRecords: true,
        insurance: true  // Include insurance data
      }
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

// Get all insurance information for a cat
app.get('/api/cats/:catId/insurance', authenticateToken, async (req, res) => {
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
      return res.status(403).json({ message: 'Not authorized to view insurance for this cat' });
    }

    const insurance = await prisma.insurance.findMany({
      where: { catId },
      orderBy: { startDate: 'desc' }
    });

    res.json(insurance);
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
    });

    if (!insurance) {
      return res.status(404).json({ message: 'Insurance information not found' });
    }

    if (insurance.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this insurance information' });
    }

    await prisma.insurance.delete({
      where: { id: insuranceId }
    });

    res.json({ message: 'Insurance information deleted successfully' });
  } catch (error) {
    console.error('Delete insurance error:', error);
    res.status(500).json({ message: 'Failed to delete insurance information' });
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

// Calendar subscription endpoint
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function HealthTodoListPage() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTodo, setNewTodo] = useState({
    title: '',
    dueDate: '',
    catId: '',
    type: 'vaccination'
  });
  const [cats, setCats] = useState([]);
  const navigate = useNavigate();

  // Fetch cats and generate default todo tasks
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Get all cats owned by the user
        const catsResponse = await fetch(API_ENDPOINTS.GET_CATS, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!catsResponse.ok) throw new Error('Failed to fetch cats');
        const catsData = await catsResponse.json();
        setCats(catsData);

        // Create default health reminder tasks for each cat
        const defaultTodos = [];
        catsData.forEach(cat => {
          // Vaccination reminder
          defaultTodos.push({
            id: `vaccine-${cat.id}`,
            title: `Annual vaccination for ${cat.name}`,
            completed: false,
            dueDate: getNextAnnualDate(),
            catId: cat.id,
            catName: cat.name,
            type: 'vaccination'
          });
          
          // Checkup reminder
          defaultTodos.push({
            id: `checkup-${cat.id}`,
            title: `Regular checkup for ${cat.name}`,
            completed: false,
            dueDate: getNextQuarterlyDate(),
            catId: cat.id,
            catName: cat.name,
            type: 'checkup'
          });
        });
        setTodos(defaultTodos);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Calculate date one year from now
  const getNextAnnualDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  // Calculate date three months from now
  const getNextQuarterlyDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split('T')[0];
  };

  // Handle adding a new task
  const handleAddTodo = () => {
    if (!newTodo.title || !newTodo.dueDate || !newTodo.catId) return;
    const cat = cats.find(c => c.id === parseInt(newTodo.catId));
    const newTask = {
      id: `todo-${Date.now()}`,
      title: newTodo.title,
      completed: false,
      dueDate: newTodo.dueDate,
      catId: parseInt(newTodo.catId),
      catName: cat.name,
      type: newTodo.type
    };
    setTodos([...todos, newTask]);
    setNewTodo({ title: '', dueDate: '', catId: '', type: 'vaccination' });
  };

  // Toggle task completion status
  const handleToggleComplete = id => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Navigate to create a health record from a task
  const handleCreateRecord = (todo) => {
    // Guard: make sure we have all needed fields
    if (
      !todo ||
      typeof todo.catId === 'undefined' ||
      typeof todo.type !== 'string' ||
      typeof todo.title !== 'string'
    ) {
      console.warn('Cannot navigate, missing or invalid todo data:', todo);
      return;
    }
  
    // Encode the title for use in a URL
    const encodedTitle = encodeURIComponent(todo.title);
  
    // Build the target path
    const path = `/cats/${todo.catId}/records/add?type=${todo.type}&title=${encodedTitle}`;
  
    // Perform navigation, catching any errors
    try {
      navigate(path);
    } catch (err) {
      console.error('Navigation failed to', path, err);
    }
  };

  // Get appropriate badge color based on task type
  const getTypeBadgeClass = type => {
    switch (type) {
      case 'vaccination': return 'bg-primary';
      case 'checkup':     return 'bg-info';
      case 'followup':    return 'bg-secondary';
      case 'medication':  return 'bg-warning';
      case 'grooming':    return 'bg-success';
      default:            return 'bg-dark';
    }
  };

  // Sort tasks by due date and filter upcoming tasks (next 30 days)
  const sortedTodos = [...todos].sort(
    (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
  );
  const upcoming = sortedTodos.filter(
    todo =>
      !todo.completed &&
      new Date(todo.dueDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Health Tasks</h2>

      {/* Calendar subscription link - fixed to use the correct API_ENDPOINTS.BASE_URL */}
      <div className="mb-4">
        <a
          href={`${API_ENDPOINTS.BASE_URL}/api/calendar.ics?token=${localStorage.getItem('token')}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline-primary"
        >
          <i className="bi bi-calendar-plus me-2"></i>
          Subscribe to Health Reminders Calendar
        </a>
        <small className="text-muted d-block mt-1">
          Add these reminders to your personal calendar app
        </small>
      </div>

      {upcoming.length > 0 && (
        <div className="card mb-4 border-warning">
          <div className="card-header bg-warning text-white">
            <h4 className="mb-0">Upcoming Tasks</h4>
          </div>
          <div className="card-body">
            <div className="list-group">
              {upcoming.map(todo => (
                <div key={todo.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <span className={`badge ${getTypeBadgeClass(todo.type)} me-2`}>
                      {todo.type.charAt(0).toUpperCase() + todo.type.slice(1)}
                    </span>
                    {todo.title}
                    <div>
                      <small className="text-muted">
                        Due: {new Date(todo.dueDate).toLocaleDateString()} — Cat: {todo.catName}
                      </small>
                    </div>
                  </div>
                  <div>
                    <button className="btn btn-primary btn-sm me-2" onClick={() => handleCreateRecord(todo)}>
                      Create Record
                    </button>
                    <button className="btn btn-success btn-sm" onClick={() => handleToggleComplete(todo.id)}>
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header">
          <h4 className="mb-0">Add New Task</h4>
        </div>
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-3">
              <select
                className="form-select"
                value={newTodo.catId}
                onChange={e => setNewTodo({ ...newTodo, catId: e.target.value })}
              >
                <option value="">Select Cat</option>
                {cats.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={newTodo.type}
                onChange={e => setNewTodo({ ...newTodo, type: e.target.value })}
              >
                <option value="vaccination">Vaccination</option>
                <option value="checkup">Check-up</option>
                <option value="followup">Follow-up</option>
                <option value="medication">Medication</option>
                <option value="grooming">Grooming</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Task description"
                value={newTodo.title}
                onChange={e => setNewTodo({ ...newTodo, title: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control"
                value={newTodo.dueDate}
                onChange={e => setNewTodo({ ...newTodo, dueDate: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={handleAddTodo}>
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h4 className="mb-0">All Tasks</h4>
        </div>
        <div className="card-body">
          {sortedTodos.length === 0 ? (
            <p>No tasks found.</p>
          ) : (
            sortedTodos.map(todo => (
              <div
                key={todo.id}
                className={`list-group-item d-flex justify-content-between align-items-center ${
                  todo.completed ? 'list-group-item-success' : ''
                }`}
              >
                <div className={todo.completed ? 'text-decoration-line-through' : ''}>
                  <span className={`badge ${getTypeBadgeClass(todo.type)} me-2`}>
                    {todo.type.charAt(0).toUpperCase() + todo.type.slice(1)}
                  </span>
                  {todo.title}
                  <div>
                    <small className="text-muted">
                      Due: {new Date(todo.dueDate).toLocaleDateString()} — Cat: {todo.catName}
                    </small>
                  </div>
                </div>
                <div>
                  {!todo.completed && (
                    <button className="btn btn-primary btn-sm me-2" onClick={() => handleCreateRecord(todo)}>
                      Create Record
                    </button>
                  )}
                  <button
                    className={`btn btn-sm ${
                      todo.completed ? 'btn-outline-success' : 'btn-success'
                    }`}
                    onClick={() => handleToggleComplete(todo.id)}
                  >
                    {todo.completed ? 'Undo' : 'Complete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default HealthTodoListPage;

// ignore favicon requests
app.get('/favicon.ico', (req, res) => res.sendStatus(204));
// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});