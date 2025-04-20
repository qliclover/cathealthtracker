// src/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function DashboardPage() {
  const [cats, setCats] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Control the "Customize Tasks" modal
  const [showCustomizeTaskModal, setShowCustomizeTaskModal] = useState(false);

  // Load tasks from localStorage (or empty array)
  const [dailyTasks, setDailyTasks] = useState(() => {
    const stored = localStorage.getItem('dailyTasks');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        localStorage.removeItem('dailyTasks');
      }
    }
    return [];
  });

  // Persist tasks whenever they change
  useEffect(() => {
    localStorage.setItem('dailyTasks', JSON.stringify(dailyTasks));
  }, [dailyTasks]);

  // New-task form state, now with startDate & optional endDate
  const [newTask, setNewTask] = useState({
    title: '',
    catId: '',
    startDate: new Date().toISOString().split('T')[0],
    repeatType: 'none',
    repeatInterval: 1,
    endDate: ''
  });

  const navigate = useNavigate();

  // Toggle a task's completed flag
  const toggleTaskComplete = (id) => {
    setDailyTasks(tasks =>
      tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  };

  // Add the new task
  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.catId) return;
    const task = {
      id: `task-${Date.now()}`,
      ...newTask,
      completed: false
    };
    setDailyTasks(tasks => [...tasks, task]);
    setShowCustomizeTaskModal(false);
    // Reset title but keep other values for convenience
    setNewTask(prev => ({ ...prev, title: '' }));
  };

  // Delete a task
  const handleDeleteTask = (id) => {
    setDailyTasks(tasks => tasks.filter(t => t.id !== id));
  };

  // Update newTask form fields
  const handleNewTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  // Fetch cats and recent health records
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch cats
        const catsRes = await fetch(API_ENDPOINTS.GET_CATS, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!catsRes.ok) throw new Error('Failed to fetch cats');
        const catsData = await catsRes.json();
        setCats(catsData);

        // Fetch up to 5 recent health records across all cats
        const recs = [];
        for (const cat of catsData) {
          const rRes = await fetch(`${API_ENDPOINTS.GET_CAT}/${cat.id}/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (rRes.ok) {
            const list = await rRes.json();
            recs.push(...list.map(r => ({ ...r, catName: cat.name })));
          }
        }
        recs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHealthRecords(recs.slice(0, 5));

      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

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
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="container mt-4">
      {/* Header */}
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

      {/* Cats Overview */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary bg-opacity-10">
              <h4 className="mb-0 text-primary">
                <i className="bi bi-house me-2"></i>My Cats
              </h4>
            </div>
            <div className="card-body">
              {cats.length === 0 ? (
                <p className="text-muted">No cats yet. Click “Add Cat” to start.</p>
              ) : (
                <div className="row row-cols-1 row-cols-md-3 g-4">
                  {cats.map(cat => (
                    <div key={cat.id} className="col">
                      <Link to={`/cats/${cat.id}`} className="text-decoration-none">
                        <div className="card h-100 border-0 shadow-sm">
                          {cat.imageUrl ? (
                            <div className="text-center pt-3">
                              <img
                                src={cat.imageUrl}
                                alt={cat.name}
                                style={{ maxHeight: '150px', objectFit: 'contain' }}
                                onError={e => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300?text=Cat+Photo'; }}
                              />
                            </div>
                          ) : (
                            <div className="text-center pt-3">
                              <img
                                src="https://placehold.co/400x300?text=Cat+Photo"
                                alt="Default cat"
                                style={{ maxHeight: '150px', objectFit: 'contain' }}
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Health Records */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-info bg-opacity-10">
              <h4 className="mb-0 text-info">
                <i className="bi bi-journal-medical me-2"></i>Recent Health Records
              </h4>
            </div>
            <div className="card-body">
              {healthRecords.length === 0 ? (
                <p className="text-muted">No health records yet.</p>
              ) : (
                <div className="list-group">
                  {healthRecords.map(r => (
                    <Link
                      key={r.id}
                      to={`/records/${r.id}/edit`}
                      className="list-group-item list-group-item-action"
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">{r.type} - {r.catName}</h6>
                        <small>{new Date(r.date).toLocaleDateString()}</small>
                      </div>
                      <p className="mb-1 small text-truncate">{r.description}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Care Tasks */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-warning bg-opacity-10 d-flex justify-content-between align-items-center">
              <h4 className="mb-0 text-warning">
                <i className="bi bi-check2-circle me-2"></i>Daily Care Tasks
              </h4>
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={() => setShowCustomizeTaskModal(true)}
              >
                <i className="bi bi-pencil-square me-1"></i>Customize Tasks
              </button>
            </div>
            <div className="card-body">
              {dailyTasks.length === 0 ? (
                <p className="text-muted">No daily tasks yet.</p>
              ) : (
                <ul className="list-group">
                  {dailyTasks.map(task => (
                    <li
                      key={task.id}
                      className={`list-group-item d-flex justify-content-between align-items-center ${
                        task.completed ? 'list-group-item-success' : ''
                      }`}
                    >
                      <div>
                        <span className={task.completed ? 'text-decoration-line-through' : ''}>
                          {task.title}
                        </span>
                        {task.repeatType !== 'none' && (
                          <span className="badge bg-info ms-2">
                            {task.repeatInterval > 1 ? `Every ${task.repeatInterval} ` : 'Every '}
                            {task.repeatType}
                          </span>
                        )}
                        <span className="badge bg-secondary ms-2">{task.startDate}</span>
                        {task.endDate && (
                          <span className="badge bg-secondary ms-2">until {task.endDate}</span>
                        )}
                        {task.catId === 'all' ? (
                          <span className="badge bg-secondary ms-2">All Cats</span>
                        ) : (
                          <span className="badge bg-secondary ms-2">
                            {cats.find(c => c.id === task.catId)?.name}
                          </span>
                        )}
                      </div>
                      <div>
                        <button
                          className={`btn btn-sm ${
                            task.completed ? 'btn-outline-success' : 'btn-success'
                          } me-2`}
                          onClick={() => toggleTaskComplete(task.id)}
                        >
                          {task.completed ? 'Done ✓' : 'Mark Done'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customize Tasks Modal */}
      {showCustomizeTaskModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Customize Daily Tasks</h5>
                <button className="btn-close" onClick={() => setShowCustomizeTaskModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Task Title</label>
                    <input
                      type="text"
                      className="form-control"
                      name="title"
                      value={newTask.title}
                      onChange={handleNewTaskChange}
                      placeholder="Enter task name"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Cat</label>
                    <select
                      className="form-select"
                      name="catId"
                      value={newTask.catId}
                      onChange={handleNewTaskChange}
                    >
                      <option value="">Select Cat</option>
                      <option value="all">All Cats</option>
                      {cats.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      name="startDate"
                      value={newTask.startDate}
                      onChange={handleNewTaskChange}
                    />
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Repeat</label>
                    <select
                      className="form-select"
                      name="repeatType"
                      value={newTask.repeatType}
                      onChange={handleNewTaskChange}
                    >
                      <option value="none">Never</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  {newTask.repeatType !== 'none' && (
                    <>
                      <div className="col-md-4">
                        <label className="form-label">Interval</label>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control"
                            name="repeatInterval"
                            value={newTask.repeatInterval}
                            onChange={handleNewTaskChange}
                            min="1"
                          />
                          <span className="input-group-text">{newTask.repeatType}</span>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">End Date (optional)</label>
                        <input
                          type="date"
                          className="form-control"
                          name="endDate"
                          value={newTask.endDate}
                          onChange={handleNewTaskChange}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCustomizeTaskModal(false)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddTask}
                  disabled={!newTask.title.trim() || !newTask.catId}
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
