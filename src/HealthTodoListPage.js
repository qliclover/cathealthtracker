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
    type: 'vaccination' // Default type
  });
  const [cats, setCats] = useState([]);
  const navigate = useNavigate();

  // Fetch cats and health records data
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
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!catsResponse.ok) {
          throw new Error('Failed to fetch cats');
        }

        const catsData = await catsResponse.json();
        setCats(catsData);

        // Create default todo tasks
        const defaultTodos = [];
        
        // Generate health reminders for each cat
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

  // Get next annual date
  const getNextAnnualDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  // Get next quarterly date
  const getNextQuarterlyDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split('T')[0];
  };

  // Add a new todo
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
    setNewTodo({ 
      title: '', 
      dueDate: '', 
      catId: '',
      type: 'vaccination' 
    });
  };

  // Toggle todo completion status
  const handleToggleComplete = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  // Navigate to create health record page
  const handleCreateRecord = (todo) => {
    // Navigate to add record page with prefilled fields
    navigate(`/cats/${todo.catId}/records/add?type=${todo.type}&title=${encodeURIComponent(todo.title)}`);
  };

  // Get type badge class
  const getTypeBadgeClass = (type) => {
    switch(type) {
      case 'vaccination': return 'bg-primary';
      case 'checkup': return 'bg-info';
      case 'followup': return 'bg-secondary';
      case 'medication': return 'bg-warning';
      case 'grooming': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  // Sort todos by due date
  const sortedTodos = [...todos].sort((a, b) => 
    new Date(a.dueDate) - new Date(b.dueDate)
  );
  
  // Get upcoming tasks (within 30 days)
  const upcoming = sortedTodos.filter(todo => 
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
      
      {upcoming.length > 0 && (
        <div className="card mb-4 border-warning">
          <div className="card-header bg-warning text-white">
            <h4 className="mb-0">Upcoming Tasks</h4>
          </div>
          <div className="card-body">
            <div className="list-group">
              {upcoming.map(todo => (
                <div key={todo.id} className="list-group-item list-group-item-action">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">
                        <span className={`badge ${getTypeBadgeClass(todo.type)} me-2`}>
                          {todo.type.charAt(0).toUpperCase() + todo.type.slice(1)}
                        </span>
                        {todo.title}
                      </h5>
                      <small className="text-muted">
                        <i className="bi bi-calendar3 me-1"></i>
                        Due: {new Date(todo.dueDate).toLocaleDateString()}
                      </small>
                      <p className="mb-1">Cat: {todo.catName}</p>
                    </div>
                    <div>
                      <button 
                        className="btn btn-primary me-2"
                        onClick={() => handleCreateRecord(todo)}
                      >
                        Create Record
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={() => handleToggleComplete(todo.id)}
                      >
                        Complete
                      </button>
                    </div>
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
          <div className="row g-3">
            <div className="col-md-3">
              <select 
                className="form-select" 
                value={newTodo.catId}
                onChange={(e) => setNewTodo({...newTodo, catId: e.target.value})}
              >
                <option value="">Select Cat</option>
                {cats.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={newTodo.type}
                onChange={(e) => setNewTodo({...newTodo, type: e.target.value})}
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
                onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
              />
            </div>
            <div className="col-md-2">
              <input 
                type="date" 
                className="form-control"
                value={newTodo.dueDate}
                onChange={(e) => setNewTodo({...newTodo, dueDate: e.target.value})}
              />
            </div>
            <div className="col-md-1">
              <button 
                className="btn btn-primary w-100"
                onClick={handleAddTodo}
              >
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
          <div className="list-group">
            {sortedTodos.length === 0 ? (
              <p>No tasks found. Add your first health reminder above.</p>
            ) : (
              sortedTodos.map(todo => (
                <div key={todo.id} className={`list-group-item list-group-item-action ${todo.completed ? 'list-group-item-success' : ''}`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className={todo.completed ? 'text-decoration-line-through' : ''}>
                      <h5 className="mb-1">
                        <span className={`badge ${getTypeBadgeClass(todo.type)} me-2`}>
                          {todo.type.charAt(0).toUpperCase() + todo.type.slice(1)}
                        </span>
                        {todo.title}
                      </h5>
                      <small className="text-muted">
                        <i className="bi bi-calendar3 me-1"></i>
                        Due: {new Date(todo.dueDate).toLocaleDateString()}
                      </small>
                      <p className="mb-1">Cat: {todo.catName}</p>
                    </div>
                    <div>
                      {!todo.completed && (
                        <button 
                          className="btn btn-primary btn-sm me-2"
                          onClick={() => handleCreateRecord(todo)}
                        >
                          Create Record
                        </button>
                      )}
                      <button 
                        className={`btn btn-sm ${todo.completed ? 'btn-outline-success' : 'btn-success'}`}
                        onClick={() => handleToggleComplete(todo.id)}
                      >
                        {todo.completed ? 'Undo' : 'Complete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HealthTodoListPage;