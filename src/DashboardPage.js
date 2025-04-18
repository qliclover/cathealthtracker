import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

// Task categories and definitions
const CARE_TASKS = {
  daily: [
    { id: 'litter', title: 'Litter Box Cleaning', icon: 'trash' },
    { id: 'water', title: 'Water Change', icon: 'droplet' },
    { id: 'play', title: 'Play / Exercise', icon: 'play-circle' }
  ],
  monthly: [
    { id: 'grooming', title: 'Grooming', icon: 'scissors' },
    { id: 'flea', title: 'Flea & Tick Prevention', icon: 'bug' },
    { id: 'weight', title: 'Weight Check', icon: 'award' }
  ],
  annual: [
    { id: 'vaccination', title: 'Vaccination', icon: 'shield' },
    { id: 'dental', title: 'Dental Cleaning', icon: 'smile' },
    { id: 'microchip', title: 'Microchip Renewal', icon: 'cpu' },
    { id: 'insurance', title: 'Insurance Review', icon: 'file-text' }
  ]
};

function DashboardPage() {
  const [cats, setCats] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch all cats
        const catsResponse = await fetch(API_ENDPOINTS.GET_CATS, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!catsResponse.ok) {
          throw new Error('Failed to fetch cats');
        }
        
        const catsData = await catsResponse.json();
        setCats(catsData);
        
        // Generate upcoming tasks - could be fetched from API in future
        const tasks = generateUpcomingTasks(catsData);
        setUpcomingTasks(tasks);
        
        // Generate today's routine care tasks
        const today = generateDailyTasks(catsData);
        setDailyTasks(today);
        
        // Fetch recent health records for each cat
        const allRecords = [];
        for (const cat of catsData) {
          const recordsResponse = await fetch(`${API_ENDPOINTS.GET_CAT}/${cat.id}/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (recordsResponse.ok) {
            const records = await recordsResponse.json();
            if (Array.isArray(records) && records.length > 0) {
              // Add cat info to each record
              const recordsWithCatInfo = records.map(record => ({
                ...record,
                catName: cat.name,
                catId: cat.id
              }));
              allRecords.push(...recordsWithCatInfo);
            }
          }
        }
        
        // Sort by date and take most recent 5
        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHealthRecords(allRecords.slice(0, 5));
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);
  
  // Generate upcoming health tasks based on cats
  const generateUpcomingTasks = (cats) => {
    const tasks = [];
    const now = new Date();
    
    cats.forEach(cat => {
      // Vaccination reminder (annual)
      const vaccineDate = new Date(now);
      vaccineDate.setFullYear(vaccineDate.getFullYear() + 1);
      tasks.push({
        id: `vaccine-${cat.id}`,
        title: `Vaccination for ${cat.name}`,
        dueDate: vaccineDate,
        type: 'vaccination',
        catId: cat.id,
        catName: cat.name
      });
      
      // Checkup reminder (quarterly)
      const checkupDate = new Date(now);
      checkupDate.setMonth(checkupDate.getMonth() + 3);
      tasks.push({
        id: `checkup-${cat.id}`,
        title: `Regular checkup for ${cat.name}`,
        dueDate: checkupDate,
        type: 'checkup',
        catId: cat.id,
        catName: cat.name
      });
      
      // Monthly tasks
      const groomingDate = new Date(now);
      groomingDate.setMonth(groomingDate.getMonth() + 1);
      tasks.push({
        id: `grooming-${cat.id}`,
        title: `Grooming for ${cat.name}`,
        dueDate: groomingDate,
        type: 'grooming',
        catId: cat.id,
        catName: cat.name
      });
    });
    
    // Sort by due date and filter for next 30 days
    return tasks
      .sort((a, b) => a.dueDate - b.dueDate)
      .filter(task => {
        const dueDate = new Date(task.dueDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return dueDate <= thirtyDaysFromNow;
      })
      .slice(0, 5); // Take top 5
  };
  
  // Generate daily care tasks
  const generateDailyTasks = (cats) => {
    const dailyTasks = [];
    
    // For each cat, create daily care tasks
    cats.forEach(cat => {
      CARE_TASKS.daily.forEach(taskType => {
        dailyTasks.push({
          id: `${taskType.id}-${cat.id}-${Date.now()}`,
          title: `${taskType.title} for ${cat.name}`,
          completed: false,
          type: taskType.id,
          icon: taskType.icon,
          catId: cat.id,
          catName: cat.name
        });
      });
    });
    
    return dailyTasks;
  };
  
  // Handle daily task completion
  const toggleTaskComplete = (id) => {
    setDailyTasks(
      dailyTasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };
  
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
      <div className="row mb-4">
        <div className="col">
          <h1 className="mb-0">Dashboard</h1>
          <p className="text-muted">Manage your cats' health and care routines</p>
        </div>
        <div className="col-auto">
          <Link to="/cats/add" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>Add Cat
          </Link>
        </div>
      </div>
      
      {cats.length === 0 ? (
        <div className="alert alert-info">
          <h4 className="alert-heading">Welcome to Cat Health Tracker!</h4>
          <p>You haven't added any cats yet. Click the "Add Cat" button to get started.</p>
        </div>
      ) : (
        <div className="row">
          {/* Cats Overview Card */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header bg-primary bg-opacity-10">
                <h4 className="mb-0 text-primary">
                  <i className="bi bi-house me-2"></i>
                  My Cats
                </h4>
              </div>
              <div className="card-body">
                <div className="row row-cols-1 row-cols-md-2 g-4">
                  {cats.map(cat => (
                    <div key={cat.id} className="col">
                      <Link to={`/cats/${cat.id}`} className="text-decoration-none">
                        <div className="card h-100 border-0 shadow-sm">
                          {cat.imageUrl && (
                            <div style={{ height: '120px', overflow: 'hidden' }}>
                              <img 
                                src={cat.imageUrl} 
                                alt={cat.name}
                                className="card-img-top object-fit-cover h-100 w-100" 
                              />
                            </div>
                          )}
                          <div className="card-body text-center">
                            <h5 className="card-title mb-1">{cat.name}</h5>
                            <p className="card-text small text-muted mb-0">{cat.breed}</p>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
                
                <div className="text-center mt-3">
                  <Link to="/cats" className="btn btn-outline-primary">View All Cats</Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Daily Care Tasks */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header bg-success bg-opacity-10">
                <h4 className="mb-0 text-success">
                  <i className="bi bi-check2-circle me-2"></i>
                  Daily Care
                </h4>
              </div>
              <div className="card-body">
                {dailyTasks.length === 0 ? (
                  <p className="text-muted">No daily tasks yet.</p>
                ) : (
                  <ul className="list-group">
                    {dailyTasks.map(task => (
                      <li key={task.id} 
                        className={`list-group-item d-flex justify-content-between align-items-center ${
                          task.completed ? 'list-group-item-success' : ''
                        }`}
                      >
                        <div>
                          <i className={`bi bi-${task.icon} me-2`}></i>
                          <span className={task.completed ? 'text-decoration-line-through' : ''}>
                            {task.title}
                          </span>
                        </div>
                        <button 
                          className={`btn btn-sm ${task.completed ? 'btn-outline-success' : 'btn-success'}`}
                          onClick={() => toggleTaskComplete(task.id)}
                        >
                          {task.completed ? 'Done ✓' : 'Mark Done'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          
          {/* Upcoming Health Tasks */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header bg-warning bg-opacity-10">
                <h4 className="mb-0 text-warning">
                  <i className="bi bi-calendar-check me-2"></i>
                  Upcoming Health Tasks
                </h4>
              </div>
              <div className="card-body">
                {upcomingTasks.length === 0 ? (
                  <p className="text-muted">No upcoming tasks.</p>
                ) : (
                  <div className="list-group">
                    {upcomingTasks.map(task => (
                      <Link 
                        key={task.id} 
                        to="/todos" 
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <h6 className="mb-1">{task.title}</h6>
                          <small className="text-muted">
                            Due: {task.dueDate.toLocaleDateString()}
                          </small>
                        </div>
                        <span className="badge bg-warning rounded-pill">
                          {Math.ceil((task.dueDate - new Date()) / (1000*60*60*24))} days
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="text-center mt-3">
                  <Link to="/todos" className="btn btn-outline-warning">View All Tasks</Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Health Records */}
          <div className="col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-header bg-info bg-opacity-10">
                <h4 className="mb-0 text-info">
                  <i className="bi bi-journal-medical me-2"></i>
                  Recent Health Records
                </h4>
              </div>
              <div className="card-body">
                {healthRecords.length === 0 ? (
                  <p className="text-muted">No health records yet.</p>
                ) : (
                  <div className="list-group">
                    {healthRecords.map(record => (
                      <Link 
                        key={record.id} 
                        to={`/records/${record.id}/edit`}
                        className="list-group-item list-group-item-action"
                      >
                        <div className="d-flex w-100 justify-content-between">
                          <h6 className="mb-1">{record.type} - {record.catName}</h6>
                          <small>{new Date(record.date).toLocaleDateString()}</small>
                        </div>
                        <p className="mb-1 small text-truncate">{record.description}</p>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="text-center mt-3">
                  <Link to="/calendar" className="btn btn-outline-info">View Health Calendar</Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="col-12 mb-4">
            <div className="card">
              <div className="card-header bg-secondary bg-opacity-10">
                <h4 className="mb-0 text-secondary">Quick Access</h4>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3 col-6">
                    <Link to="/cats" className="btn btn-outline-primary w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                      <i className="bi bi-house fs-2 mb-2"></i>
                      My Cats
                    </Link>
                  </div>
                  <div className="col-md-3 col-6">
                    <Link to="/calendar" className="btn btn-outline-info w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                      <i className="bi bi-calendar-week fs-2 mb-2"></i>
                      Health Calendar
                    </Link>
                  </div>
                  <div className="col-md-3 col-6">
                    <Link to="/todos" className="btn btn-outline-warning w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                      <i className="bi bi-check2-square fs-2 mb-2"></i>
                      Health Tasks
                    </Link>
                  </div>
                  <div className="col-md-3 col-6">
                    <Link to="/cats/add" className="btn btn-outline-success w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3">
                      <i className="bi bi-plus-circle fs-2 mb-2"></i>
                      Add New Cat
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;