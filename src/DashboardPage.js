// src/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { API_ENDPOINTS } from './config';

// MealRow component with swipe handlers
function MealRow({ meal, onToggle }) {
  const handlers = useSwipeable({
    onSwipedLeft:  () => onToggle(meal.id),
    onSwipedRight: () => onToggle(meal.id),
    trackMouse: true
  });

  return (
    <tr {...handlers} className={meal.completed ? 'table-success' : ''}>
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

  // Remove icon property
  const [dailyTasks, setDailyTasks] = useState([
    { id: 'task-1', title: 'Clean Litter Box', completed: false, repeatType: 'none', repeatInterval: 1, endDate: '' },
    { id: 'task-2', title: 'Fresh Water',      completed: false, repeatType: 'none', repeatInterval: 1, endDate: '' },
    { id: 'task-3', title: 'Brush Teeth',      completed: false, repeatType: 'none', repeatInterval: 1, endDate: '' },
    { id: 'task-4', title: 'Play Time',        completed: false, repeatType: 'none', repeatInterval: 1, endDate: '' }
  ]);

  // Add catId and repeat fields
  const [newTask, setNewTask] = useState({
    title: '',
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

  // Modal handlers
  const handleCustomizeMealSchedule = () => setShowCustomizeMealModal(true);
  const handleCloseMealModal     = () => setShowCustomizeMealModal(false);
  const handleCustomizeTasks     = () => setShowCustomizeTaskModal(true);
  const handleCloseTaskModal     = () => {
    setShowCustomizeTaskModal(false);
    setNewTask({ title: '', catId: '', repeatType: 'none', repeatInterval: 1, endDate: '' });
  };

  // Task add/delete
  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.catId) return;
    const t = {
      id: `task-${Date.now()}`,
      ...newTask,
      completed: false
    };
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
      {/* ... other dashboard sections remain unchanged ... */}

      {/* Daily Care Tasks */}
      <div className="col-12 mb-4">
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
                      <span className={task.completed ? 'text-decoration-line-through' : ''}>
                        {task.title}
                      </span>
                      {task.repeatType !== 'none' && (
                        <span className="badge bg-info ms-2">
                          {task.repeatInterval > 1 ? `Every ${task.repeatInterval} ` : 'Every '}
                          {task.repeatType}
                        </span>
                      )}
                      {task.catId === 'all' && (
                        <span className="badge bg-secondary ms-2">All Cats</span>
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

      {/* Daily Meal Timetable */}
      {/* ... meal timetable code remains unchanged ... */}

      {/* Customize Daily Tasks Modal */}
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
                        type="text"
                        className="form-control"
                        name="title"
                        value={newTask.title}
                        onChange={handleNewTaskChange}
                        placeholder="Enter task name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Cat</label>
                      <select
                        className="form-select"
                        name="catId"
                        value={newTask.catId}
                        onChange={handleNewTaskChange}
                        required
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
                  </div>
                  <div className="row mt-3">
                    <div className="col-md-3">
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
                        <div className="col-md-3">
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
                        <div className="col-md-3">
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
                        {task.title}
                        {task.repeatType !== 'none' && (
                          <span className="badge bg-info ms-2">
                            {task.repeatInterval > 1 ? `Every ${task.repeatInterval} ` : 'Every '}
                            {task.repeatType}
                          </span>
                        )}
                        {task.catId === 'all' && (
                          <span className="badge bg-secondary ms-2">All Cats</span>
                        )}
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        Delete
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
