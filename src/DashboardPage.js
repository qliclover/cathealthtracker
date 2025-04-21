// src/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function DashboardPage() {
  const [cats, setCats] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Meal timetable state ---
  const [mealSchedule, setMealSchedule] = useState([
    { id: 1, name: 'Morning', time: '12:00 PM', food: 'Raw', amount: '2oz', completed: false },
    { id: 2, name: 'Noon',    time: '2:30 PM',  food: 'Raw', amount: '2oz', completed: false },
    { id: 3, name: 'Evening', time: '8:00 PM',  food: 'Dry Raw', amount: '2oz', completed: false }
  ]);

  // Mark a meal as fed / undo
  const markAsFed = (id) => {
    setMealSchedule(ms =>
      ms.map(m => m.id === id ? { ...m, completed: !m.completed } : m)
    );
  };

  // --- Tasks modal & state ---
  const [showCustomizeTaskModal, setShowCustomizeTaskModal] = useState(false);
  const [dailyTasks, setDailyTasks] = useState(() => {
    const stored = localStorage.getItem('dailyTasks');
    if (stored) {
      try { return JSON.parse(stored); }
      catch { localStorage.removeItem('dailyTasks'); }
    }
    return [];
  });
  useEffect(() => {
    localStorage.setItem('dailyTasks', JSON.stringify(dailyTasks));
  }, [dailyTasks]);

  const [newTask, setNewTask] = useState({
    title: '',
    catId: '',
    startDate: new Date().toISOString().split('T')[0],
    repeatType: 'none',
    repeatInterval: 1,
    endDate: ''
  });

  const toggleTaskComplete = (id) => {
    setDailyTasks(ts =>
      ts.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  };

  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.catId) return;
    const task = { id: `task-${Date.now()}`, ...newTask, completed: false };
    setDailyTasks(ts => [...ts, task]);
    setShowCustomizeTaskModal(false);
    setNewTask(prev => ({ ...prev, title: '' }));
  };

  const handleDeleteTask = (id) => {
    setDailyTasks(ts => ts.filter(t => t.id !== id));
  };

  const handleNewTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  const navigate = useNavigate();

  // Fetch cats & health records
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const catsRes = await fetch(API_ENDPOINTS.GET_CATS, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!catsRes.ok) throw new Error('Failed to fetch cats');
        const catsData = await catsRes.json();
        setCats(catsData);

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
    <div className="container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="dashboard-title">Welcome to Cat Health Tracker</h1>
            <p className="dashboard-subtitle">Manage your cats' health and daily care routines</p>
          </div>
          <Link to="/cats/add" className="dashboard-add-btn">
            <i className="bi bi-plus-circle me-2"></i>Add New Cat
          </Link>
        </div>
      </div>

      {/* Meal Schedule */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h2 className="dashboard-card-title">
            <i className="bi bi-clock"></i>Today's Meal Schedule
          </h2>
        </div>
        <div className="dashboard-card-body">
          <div className="meal-schedule">
            {mealSchedule.map(meal => (
              <div key={meal.id} className="meal-card">
                <div className="meal-time">{meal.time}</div>
                <div className="meal-details">
                  {meal.name} - {meal.food} ({meal.amount})
                </div>
                <div
                  className={`meal-status ${meal.completed ? 'completed' : 'pending'}`}
                  onClick={() => markAsFed(meal.id)}
                >
                  {meal.completed ? 'Fed ✓' : 'Mark as Fed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cats Overview */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h2 className="dashboard-card-title">
            <i className="bi bi-house"></i>My Cats
          </h2>
        </div>
        <div className="dashboard-card-body">
          {cats.length === 0 ? (
            <p className="text-muted">No cats yet. Add your first cat to get started!</p>
          ) : (
            <div className="cat-grid">
              {cats.map(cat => (
                <Link key={cat.id} to={`/cats/${cat.id}`} className="text-decoration-none">
                  <div className="cat-card">
                    <img
                      src={cat.imageUrl || "https://placehold.co/400x300?text=Cat+Photo"}
                      alt={cat.name}
                      className="cat-card-img"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = "https://placehold.co/400x300?text=Cat+Photo";
                      }}
                    />
                    <div className="cat-card-content">
                      <h3 className="cat-card-name">{cat.name}</h3>
                      <p className="cat-card-breed">{cat.breed}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Health Records */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h2 className="dashboard-card-title">
            <i className="bi bi-journal-medical"></i>Recent Health Records
          </h2>
        </div>
        <div className="dashboard-card-body">
          {healthRecords.length === 0 ? (
            <p className="text-muted">No health records yet.</p>
          ) : (
            <div className="health-record-list">
              {healthRecords.map(record => (
                <Link
                  key={record.id}
                  to={`/records/${record.id}/edit`}
                  className="health-record-item text-decoration-none"
                >
                  <div className="health-record-header">
                    <h3 className="health-record-title">{record.type} - {record.catName}</h3>
                    <span className="health-record-date">
                      {new Date(record.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="health-record-desc">{record.description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Care Tasks */}
      <div className="dashboard-card">
        <div className="dashboard-card-header d-flex justify-content-between align-items-center">
          <h2 className="dashboard-card-title">
            <i className="bi bi-check2-circle"></i>Daily Care Tasks
          </h2>
          <button
            className="task-btn"
            onClick={() => setShowCustomizeTaskModal(true)}
          >
            <i className="bi bi-plus-circle me-1"></i>Add Task
          </button>
        </div>
        <div className="dashboard-card-body">
          {dailyTasks.length === 0 ? (
            <p className="text-muted">No daily tasks yet. Add some tasks to track your cats' care routine!</p>
          ) : (
            <div className="task-list">
              {dailyTasks.map(task => (
                <div key={task.id} className="task-item">
                  <div
                    className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                    onClick={() => toggleTaskComplete(task.id)}
                  />
                  <div className="task-content">
                    <div className={`task-title ${task.completed ? 'completed' : ''}`}>
                      {task.title}
                    </div>
                    <div className="task-badges">
                      {task.repeatType !== 'none' && (
                        <span className="task-badge">
                          {task.repeatInterval > 1 ? `Every ${task.repeatInterval} ` : 'Every '}
                          {task.repeatType}
                        </span>
                      )}
                      <span className="task-badge">{task.startDate}</span>
                      {task.endDate && (
                        <span className="task-badge">until {task.endDate}</span>
                      )}
                    </div>
                  </div>
                  <div className="task-actions">
                    <button
                      className="task-btn"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {showCustomizeTaskModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Task</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCustomizeTaskModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Task Title</label>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    value={newTask.title}
                    onChange={handleNewTaskChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">For Cat</label>
                  <select
                    className="form-select"
                    name="catId"
                    value={newTask.catId}
                    onChange={handleNewTaskChange}
                  >
                    <option value="">Select a cat</option>
                    <option value="all">All Cats</option>
                    {cats.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="startDate"
                    value={newTask.startDate}
                    onChange={handleNewTaskChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Repeat</label>
                  <select
                    className="form-select"
                    name="repeatType"
                    value={newTask.repeatType}
                    onChange={handleNewTaskChange}
                  >
                    <option value="none">No repeat</option>
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
                {newTask.repeatType !== 'none' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Repeat Every</label>
                      <input
                        type="number"
                        className="form-control"
                        name="repeatInterval"
                        value={newTask.repeatInterval}
                        onChange={handleNewTaskChange}
                        min="1"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">End Date (Optional)</label>
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
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCustomizeTaskModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddTask}
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
