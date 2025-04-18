import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function DashboardPage() {
  const [cats, setCats] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMealTab, setActiveMealTab] = useState('morning');
  const navigate = useNavigate();

  // Sample meal timetable data - replace with actual data from API later
  const mealTimetable = {
    first: [
      { time: '12:00 PM', food: 'raw', amount: '2oz' }
    ],
    second: [
      { time: '2:30 PM', food: 'raw', amount: '2oz' }
    ],
    third: [
      { time: '8:00 PM', food: 'Dry raw', amount: '2oz' }
    ]
  };

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
  
  // Mark meal as fed
  const markAsFed = (mealTime, index) => {
    // Add actual API call here to update feeding status
    console.log(`Marked ${mealTime} meal at index ${index} as fed`);
    
    // Show feedback message
    alert(`Marked ${mealTimetable[mealTime][index].food} at ${mealTimetable[mealTime][index].time} as fed!`);
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
          <div className="col-12 mb-4">
            <div className="card">
              <div className="card-header bg-primary bg-opacity-10">
                <h4 className="mb-0 text-primary">
                  <i className="bi bi-house me-2"></i>
                  My Cats
                </h4>
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
                                style={{ width: 'auto', maxHeight: '150px', objectFit: 'contain', margin: '0 auto' }}
                                onError={(e) => {
                                  e.target.onerror = null; 
                                  e.target.src = "https://placehold.co/400x300?text=Cat+Photo";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="text-center pt-3">
                              <img 
                                src="https://placehold.co/400x300?text=Cat+Photo" 
                                alt="Default cat"
                                style={{ width: 'auto', maxHeight: '150px', objectFit: 'contain', margin: '0 auto' }}
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
          
          {/* Recent Health Records */}
          <div className="col-12 mb-4">
            <div className="card">
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
                <ul className="nav nav-tabs mb-3">
                  <li className="nav-item">
                    <button 
                      className={`nav-link ${activeMealTab === 'morning' ? 'active' : ''}`} 
                      onClick={() => setActiveMealTab('morning')}
                    >
                      <i className="bi bi-sunrise me-1"></i>
                      Morning
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      className={`nav-link ${activeMealTab === 'noon' ? 'active' : ''}`} 
                      onClick={() => setActiveMealTab('noon')}
                    >
                      <i className="bi bi-sun me-1"></i>
                      Noon
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      className={`nav-link ${activeMealTab === 'evening' ? 'active' : ''}`} 
                      onClick={() => setActiveMealTab('evening')}
                    >
                      <i className="bi bi-moon me-1"></i>
                      Evening
                    </button>
                  </li>
                </ul>

                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Time</th>
                        <th>Food Type</th>
                        <th>Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mealTimetable[activeMealTab].map((meal, index) => (
                        <tr key={index}>
                          <td>{meal.time}</td>
                          <td>{meal.food}</td>
                          <td>{meal.amount}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-success"
                              onClick={() => markAsFed(activeMealTab, index)}
                            >
                              <i className="bi bi-check-circle me-1"></i>
                              Mark as Fed
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between mt-3">
                  <button className="btn btn-outline-success">
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
    </div>
  );
}

export default DashboardPage;