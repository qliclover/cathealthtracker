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
  
  // Function to generate and download an .ics file for a single task
  const handleAddToCalendar = (todo) => {
    // Create calendar event content
    const eventStart = new Date(todo.dueDate);
    const eventEnd = new Date(eventStart);
    eventEnd.setDate(eventEnd.getDate() + 1); // End time is start time + 1 day
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Cat Health Tracker//Health Tasks//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:${todo.title}`,
      `DTSTART:${formatDateForICS(eventStart)}`,
      `DTEND:${formatDateForICS(eventEnd)}`,
      `DESCRIPTION:Health task for cat: ${todo.catName}\\nType: ${todo.type}`,
      `LOCATION:Cat Health Tracker`,
      'STATUS:CONFIRMED',
      `UID:${todo.id}@cathealthtracker.vercel.app`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'TRIGGER:-PT24H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    // Create a Blob object and generate a download link
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${todo.type}-${todo.catName}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to format date for ICS format
  const formatDateForICS = (date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
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
                    <button 
                      className="btn btn-outline-info btn-sm me-2"
                      onClick={() => handleAddToCalendar(todo)}
                    >
                      <i className="bi bi-calendar-plus me-1"></i>
                      Add to Calendar
                    </button>
                    <button 
                      className="btn btn-primary btn-sm me-2" 
                      onClick={() => handleCreateRecord(todo)}
                    >
                      Create Record
                    </button>
                    <button 
                      className="btn btn-success btn-sm" 
                      onClick={() => handleToggleComplete(todo.id)}
                    >
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
                    <>
                      <button 
                        className="btn btn-outline-info btn-sm me-2"
                        onClick={() => handleAddToCalendar(todo)}
                      >
                        <i className="bi bi-calendar-plus me-1"></i>
                        Add to Calendar
                      </button>
                      <button 
                        className="btn btn-primary btn-sm me-2" 
                        onClick={() => handleCreateRecord(todo)}
                      >
                        Create Record
                      </button>
                    </>
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