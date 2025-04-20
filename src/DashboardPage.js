// src/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { API_ENDPOINTS } from './config';

// Extracted row component so hooks can be used at top level
function MealRow({ meal, onToggle }) {
  const handlers = useSwipeable({
    onSwipedLeft:  () => onToggle(meal.id),
    onSwipedRight: () => onToggle(meal.id),
    trackMouse: true
  });

  return (
    <tr
      {...handlers}
      className={meal.completed ? 'table-success' : ''}
    >
      <td>
        <span className={meal.completed ? 'text-decoration-line-through' : ''}>
          {meal.name}
        </span>
      </td>
      <td>
        <span className={meal.completed ? 'text-decoration-line-through' : ''}>
          {meal.time}
        </span>
      </td>
      <td>
        <span className={meal.completed ? 'text-decoration-line-through' : ''}>
          {meal.food}
        </span>
      </td>
      <td>
        <span className={meal.completed ? 'text-decoration-line-through' : ''}>
          {meal.amount}
        </span>
      </td>
      <td>
        <button
          className={`btn btn-sm ${meal.completed ? 'btn-outline-secondary' : 'btn-success'}`}
          onClick={() => onToggle(meal.id)}
        >
          {meal.completed ? 'Undo' : 'Mark as Fed'}
        </button>
      </td>
    </tr>
  );
}

function DashboardPage() {
  const [cats, setCats] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCustomizeMealModal, setShowCustomizeMealModal] = useState(false);
  const [showCustomizeTaskModal, setShowCustomizeTaskModal] = useState(false);

  const [mealSchedule, setMealSchedule] = useState([
    { id: 1, name: 'Morning', time: '12:00 PM', food: 'Raw',     amount: '2oz', completed: false },
    { id: 2, name: 'Noon',    time: '2:30 PM',  food: 'Raw',     amount: '2oz', completed: false },
    { id: 3, name: 'Evening', time: '8:00 PM',  food: 'Dry Raw', amount: '2oz', completed: false }
  ]);

  const [dailyTasks, setDailyTasks] = useState([
    { id: 'task-1', title: 'Clean Litter Box', completed: false, icon: 'trash' },
    { id: 'task-2', title: 'Fresh Water',      completed: false, icon: 'droplet' },
    { id: 'task-3', title: 'Brush Teeth',      completed: false, icon: 'brush' },
    { id: 'task-4', title: 'Play Time',        completed: false, icon: 'controller' }
  ]);

  const [newTask, setNewTask] = useState({
    title: '',
    icon: 'check-circle',
    catId: '',
    repeatType: 'none',
    repeatInterval: 1,
    endDate: ''
  });

  const navigate = useNavigate();

  const toggleTaskComplete = (id) => {
    setDailyTasks(dailyTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

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

        const allRecs = [];
        for (const cat of catsData) {
          const recRes = await fetch(`${API_ENDPOINTS.GET_CAT}/${cat.id}/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (recRes.ok) {
            const recs = await recRes.json();
            if (Array.isArray(recs) && recs.length) {
              allRecs.push(...recs.map(r => ({ ...r, catName: cat.name })));
            }
          }
        }
        allRecs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHealthRecords(allRecs.slice(0, 5));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const markAsFed = (id) => {
    setMealSchedule(mealSchedule.map(m => m.id === id ? { ...m, completed: !m.completed } : m));
  };

  const handleCustomizeMealSchedule = () => setShowCustomizeMealModal(true);
  const handleCloseMealModal     = () => setShowCustomizeMealModal(false);
  const handleCustomizeTasks     = () => setShowCustomizeTaskModal(true);
  const handleCloseTaskModal     = () => {
    setShowCustomizeTaskModal(false);
    setNewTask({ title: '', icon: 'check-circle', catId: '', repeatType: 'none', repeatInterval: 1, endDate: '' });
  };

  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.catId) return;
    const t = { id: `task-${Date.now()}`, ...newTask, completed: false };
    setDailyTasks([...dailyTasks, t]);
    setNewTask(prev => ({ ...prev, title: '' }));
  };
  const handleDeleteTask = (id) => setDailyTasks(dailyTasks.filter(t => t.id !== id));

  const handleNewTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
      <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
    </div>
  );
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="container mt-4">
      <div className="row mb-4">
        <div className="col">
          <h1 className="mb-0">Dashboard</h1>
          <p className="text-muted">Manage your cats' health and care routines</p>
        </div>
        <div className="col-auto">
          <Link to="/cats/add" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2" />Add Cat
          </Link>
        </div>
      </div>

      {/* Cats Overview */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary bg-opacity-10">
              <h4 className="mb-0 text-primary"><i className="bi bi-house me-2" />My Cats</h4>
            </div>
            <div className="card-body">
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
              <div className="text-center mt-3">
                <Link to="/cats" className="btn btn-outline-primary">View All Cats</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Health Records */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-info bg-opacity-10">
              <h4 className="mb-0 text-info"><i className="bi bi-journal-medical me-2" />Recent Health Records</h4>
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
              <div className="text-center mt-3">
                <Link to="/calendar" className="btn btn-outline-info">View Health Calendar</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Care Tasks */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-warning bg-opacity-10 d-flex justify-content-between align-items-center">
              <h4 className="mb-0 text-warning"><i className="bi bi-check2-circle me-2" />Daily Care Tasks</h4>
              <button className="btn btn-sm btn-outline-warning" onClick={handleCustomizeTasks}>
                <i className="bi bi-pencil-square me-1" />Customize Tasks
              </button>
            </div>
            <div className="card-body">
              {dailyTasks.length === 0 ? (
                <p className="text-muted">No daily tasks yet. Click 'Customize Tasks' to add some.</p>
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
                        <i className={`bi bi-${task.icon} me-2`}></i>
                        <span className={task.completed ? 'text-decoration-line-through' : ''}>
                          {task.title}
                        </span>
                        {task.repeatType !== 'none' && (
                          <span className="badge bg-info ms-2">
                            {task.repeatInterval > 1 ? `Every ${task.repeatInterval} ` : 'Every '}
                            {task.repeatType}
                          </span>
                        )}
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
      </div>

      {/* Daily Meal Timetable */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-success bg-opacity-10">
              <h4 className="mb-0 text-success"><i className="bi bi-clock-history me-2" />Daily Meal Timetable</h4>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-light">
                    <tr><th>Meal</th><th>Time</th><th>Food Type</th><th>Amount</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {mealSchedule.map(meal => (
                      <MealRow key={meal.id} meal={meal} onToggle={markAsFed} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-between mt-3">
                <button className="btn btn-outline-success" onClick={handleCustomizeMealSchedule}>
                  <i className="bi bi-gear me-2" />Customize Meal Schedule
                </button>
                <button className="btn btn-outline-primary">
                  <i className="bi bi-clock-history me-2" />View Feeding History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customize Meal Schedule Modal */}
      {showCustomizeMealModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Customize Meal Schedule</h5>
                <button type="button" className="btn-close" onClick={handleCloseMealModal}></button>
              </div>
              <div className="modal-body">
                <table className="table table-bordered">
                  <thead><tr><th>Meal</th><th>Time</th><th>Food</th><th>Amount</th></tr></thead>
                  <tbody>
                    {mealSchedule.map(meal => (
                      <tr key={meal.id}>
                        <td>{meal.name}</td>
                        <td>{meal.time}</td>
                        <td>{meal.food}</td>
                        <td>{meal.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={handleCloseMealModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customize Tasks Modal */}
      {showCustomizeTaskModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Customize Daily Tasks</h5>
                <button type="button" className="btn-close" onClick={handleCloseTaskModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-4">
                  <h6>Add New Task</h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Task Title</label>
                      <input
                        type="text" className="form-control"
                        name="title" value={newTask.title}
                        onChange={handleNewTaskChange}
                        placeholder="Enter task name"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Icon</label>
                      <select
                        className="form-select"
                        name="icon" value={newTask.icon}
                        onChange={handleNewTaskChange}
                      >
                        <option value="check-circle">Check</option>
                        <option value="trash">Trash</option>
                        <option value="droplet">Water</option>
                        <option value="brush">Brush</option>
                        <option value="controller">Play</option>
                        <option value="heart">Health</option>
                        <option value="shield">Protection</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Cat</label>
                      <select
                        className="form-select"
                        name="catId" value={newTask.catId}
                        onChange={handleNewTaskChange}
                        required
                      >
                        <option value="">Select Cat</option>
                        {cats.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="row mt-3">
                    <div className="col-md-3">
                      <label className="form-label">Repeat</label>
                      <select
                        className="form-select"
                        name="repeatType" value={newTask.repeatType}
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
                        <div className="col-md-3">
                          <label className="form-label">Interval</label>
                          <div className="input-group">
                            <input
                              type="number" className="form-control"
                              name="repeatInterval" value={newTask.repeatInterval}
                              onChange={handleNewTaskChange} min="1"
                            />
                            <span className="input-group-text">{newTask.repeatType}</span>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">End Date</label>
                          <input
                            type="date" className="form-control"
                            name="endDate" value={newTask.endDate}
                            onChange={handleNewTaskChange}
                          />
                        </div>
                      </>
                    )}
                    <div className="col-md-3 d-flex align-items-end">
                      <button
                        className="btn btn-primary w-100"
                        onClick={handleAddTask}
                        disabled={!newTask.title.trim() || !newTask.catId}
                      >
                        Add Task
                      </button>
                    </div>
                  </div>
                </div>
                <hr />
                <h6>Current Tasks</h6>
                <ul className="list-group">
                  {dailyTasks.map(task => (
                    <li
                      key={task.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <i className={`bi bi-${task.icon} me-2`}></i>
                        {task.title}
                        {task.repeatType !== 'none' && (
                          <span className="badge bg-info ms-2">
                            {task.repeatInterval > 1 ? `Every ${task.repeatInterval} ` : 'Every '}
                            {task.repeatType}
                          </span>
                        )}
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <i className="bi bi-trash me-1" />Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={handleCloseTaskModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
