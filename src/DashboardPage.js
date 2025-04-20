// DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { API_ENDPOINTS } from './config';

function DashboardPage() {
  // State for storing cats, health records, and UI states
  const [cats, setCats] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCustomizeMealModal, setShowCustomizeMealModal] = useState(false);
  const [showCustomizeTaskModal, setShowCustomizeTaskModal] = useState(false);

  // Sample meal schedule data - would be replaced with API data in production
  const [mealSchedule, setMealSchedule] = useState([
    { id: 1, name: 'Morning', time: '12:00 PM', food: 'Raw',     amount: '2oz', completed: false },
    { id: 2, name: 'Noon',    time: '2:30 PM',  food: 'Raw',     amount: '2oz', completed: false },
    { id: 3, name: 'Evening', time: '8:00 PM',  food: 'Dry Raw', amount: '2oz', completed: false }
  ]);

  // Daily care tasks - would be fetched from API in production
  const [dailyTasks, setDailyTasks] = useState([
    { id: 'task-1', title: 'Clean Litter Box', completed: false, icon: 'trash' },
    { id: 'task-2', title: 'Fresh Water',      completed: false, icon: 'droplet' },
    { id: 'task-3', title: 'Brush Teeth',      completed: false, icon: 'brush' },
    { id: 'task-4', title: 'Play Time',        completed: false, icon: 'controller' }
  ]);

  // State for editing meals and creating new tasks
  const [editingMeal, setEditingMeal] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    icon: 'check-circle',
    catId: '',
    repeatType: 'none',
    repeatInterval: 1,
    endDate: ''
  });

  const navigate = useNavigate();

  // Toggle task completion status
  const toggleTaskComplete = (id) => {
    setDailyTasks(
      dailyTasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  // Fetch data on component mount
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
        if (!catsResponse.ok) throw new Error('Failed to fetch cats');
        const catsData = await catsResponse.json();
        setCats(catsData);

        // Fetch recent health records for each cat
        const allRecords = [];
        for (const cat of catsData) {
          const recordsResponse = await fetch(`${API_ENDPOINTS.GET_CAT}/${cat.id}/records`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (recordsResponse.ok) {
            const records = await recordsResponse.json();
            if (Array.isArray(records) && records.length > 0) {
              const withInfo = records.map(record => ({
                ...record,
                catName: cat.name,
                catId: cat.id
              }));
              allRecords.push(...withInfo);
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

  // Toggle meal fed status
  const markAsFed = (id) => {
    setMealSchedule(
      mealSchedule.map(meal =>
        meal.id === id
          ? { ...meal, completed: !meal.completed }
          : meal
      )
    );
  };

  // Modal handlers for meal schedule customization
  const handleCustomizeMealSchedule = () => setShowCustomizeMealModal(true);
  const handleCloseMealModal = () => {
    setShowCustomizeMealModal(false);
    setEditingMeal(null);
  };

  // Modal handlers for task customization
  const handleCustomizeTasks = () => setShowCustomizeTaskModal(true);
  const handleCloseTaskModal = () => {
    setShowCustomizeTaskModal(false);
    setNewTask({
      title: '',
      icon: 'check-circle',
      catId: '',
      repeatType: 'none',
      repeatInterval: 1,
      endDate: ''
    });
  };

  // Meal editing functions
  const handleEditMeal = (meal) => setEditingMeal({ ...meal });
  const handleSaveMeal = () => {
    if (!editingMeal) return;
    setMealSchedule(
      mealSchedule.map(meal =>
        meal.id === editingMeal.id ? editingMeal : meal
      )
    );
    setEditingMeal(null);
  };

  // Add new task with recurring options
  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.catId) return;
    const task = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      icon: newTask.icon,
      catId: newTask.catId,
      completed: false,
      repeatType: newTask.repeatType,
      repeatInterval: newTask.repeatInterval,
      endDate: newTask.endDate
    };
    setDailyTasks([...dailyTasks, task]);
    setNewTask({
      title: '',
      icon: 'check-circle',
      catId: newTask.catId,
      repeatType: 'none',
      repeatInterval: 1,
      endDate: ''
    });
  };

  // Delete task
  const handleDeleteTask = (id) => {
    setDailyTasks(dailyTasks.filter(task => task.id !== id));
  };

  // Input change handlers
  const handleMealInputChange = (e) => {
    const { name, value } = e.target;
    setEditingMeal(prev => ({ ...prev, [name]: value }));
  };
  const handleNewTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  // Loading and error states
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
          {/* Cats Overview */}
          <div className="col-12 mb-4">
            {/* … unchanged … */}
          </div>

          {/* Recent Health Records */}
          <div className="col-12 mb-4">
            {/* … unchanged … */}
          </div>

          {/* Daily Care Tasks */}
          <div className="col-12 mb-4">
            {/* … unchanged … */}
          </div>

          {/* Daily Meal Timetable */}
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-success bg-opacity-10">
                <h4 className="mb-0 text-success">
                  <i className="bi bi-clock-history me-2"></i>
                  Daily Meal Timetable
                </h4>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Meal</th>
                        <th>Time</th>
                        <th>Food Type</th>
                        <th>Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mealSchedule.map(meal => {
                        const handlers = useSwipeable({
                          onSwipedLeft:  () => markAsFed(meal.id),
                          onSwipedRight: () => markAsFed(meal.id),
                          trackMouse: true
                        });
                        return (
                          <tr
                            key={meal.id}
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
                                onClick={() => markAsFed(meal.id)}
                              >
                                {meal.completed ? 'Undo' : 'Mark as Fed'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="d-flex justify-content-between mt-3">
                  <button
                    className="btn btn-outline-success"
                    onClick={handleCustomizeMealSchedule}
                  >
                    <i className="bi bi-gear me-2"></i>
                    Customize Meal Schedule
                  </button>
                  <button className="btn btn-outline-primary">
                    <i className="bi bi-clock-history me-2"></i>
                    View Feeding History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                {editingMeal ? (
                  <div className="mb-3">
                    <div className="row g-3">
                      <div className="col-md-3">
                        <label className="form-label">Meal Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          value={editingMeal.name}
                          onChange={handleMealInputChange}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Time</label>
                        <input
                          type="text"
                          className="form-control"
                          name="time"
                          value={editingMeal.time}
                          onChange={handleMealInputChange}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Food Type</label>
                        <input
                          type="text"
                          className="form-control"
                          name="food"
                          value={editingMeal.food}
                          onChange={handleMealInputChange}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Amount</label>
                        <input
                          type="text"
                          className="form-control"
                          name="amount"
                          value={editingMeal.amount}
                          onChange={handleMealInputChange}
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button className="btn btn-primary" onClick={handleSaveMeal}>
                        Save Changes
                      </button>
                      <button className="btn btn-outline-secondary ms-2" onClick={() => setEditingMeal(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Meal</th>
                        <th>Time</th>
                        <th>Food Type</th>
                        <th>Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mealSchedule.map(meal => (
                        <tr
                          key={meal.id}
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
                              onClick={() => markAsFed(meal.id)}
                            >
                              {meal.completed ? 'Undo' : 'Mark as Fed'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseMealModal}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCloseMealModal}>
                  Save Changes
                </button>
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
                {/* … unchanged … */}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseTaskModal}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCloseTaskModal}>
                  Save Changes
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
