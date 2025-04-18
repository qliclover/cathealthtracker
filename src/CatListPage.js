import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function CatListPage() {
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(API_ENDPOINTS.GET_CATS, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          throw new Error('Failed to retrieve cat list');
        }

        const data = await response.json();
        setCats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCats();
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
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Cats</h2>
        <Link to="/cats/add" className="btn btn-primary">
          Add Cat
        </Link>
      </div>

      {cats.length === 0 ? (
        <div className="alert alert-info">
          You haven't added any cats yet. Click the "Add Cat" button to add your first cat.
        </div>
      ) : (
        <div className="row">
          {cats.map(cat => (
            <div key={cat.id} className="col-md-4 mb-4">
            <div className="card h-100">
              {cat.imageUrl && (
                <div className="text-center pt-3">
                  <img 
                    src={cat.imageUrl} 
                    alt={cat.name}
                    className="card-img-top" 
                    style={{ width: 'auto', maxHeight: '150px', objectFit: 'contain', margin: '0 auto' }}
                    onError={(e) => {
                      e.target.onerror = null; 
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23F8F9FA'/%3E%3Ctext x='200' y='150' font-family='Arial' font-size='24' fill='%23DEE2E6' text-anchor='middle' dominant-baseline='middle'%3ECat Photo%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              )}
              <div className="card-body">
                <h5 className="card-title">{cat.name}</h5>
                <h6 className="card-subtitle mb-2 text-muted">{cat.breed}</h6>
                <p className="card-text">
                  <strong>Age:</strong> {cat.age} years<br />
                  <strong>Weight:</strong> {cat.weight} kg
                </p>
                <Link to={`/cats/${cat.id}`} className="btn btn-outline-primary">
                  View Details
                </Link>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CatListPage;