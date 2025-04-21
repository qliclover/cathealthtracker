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
      <div className="cats-header">
        <h1 className="cats-title">My Cats</h1>
        <Link to="/cats/add" className="add-cat-btn">
          Add Cat
        </Link>
      </div>

      {cats.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-text">You haven't added any cats yet. Click the "Add Cat" button to add your first cat.</p>
        </div>
      ) : (
        <div className="cats-grid">
          {cats.map(cat => (
            <div key={cat.id} className="cat-list-card">
              <img 
                src={cat.imageUrl || "https://placehold.co/400x300?text=Cat+Photo"} 
                alt={cat.name}
                className="cat-list-image"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = "https://placehold.co/400x300?text=Cat+Photo";
                }}
              />
              <div className="cat-list-info">
                <h2 className="cat-list-name">{cat.name}</h2>
                <p className="cat-list-breed">{cat.breed}</p>
                <div className="cat-list-details">
                  <div className="cat-detail-item">
                    <span className="detail-label">Age</span>
                    <span className="detail-value">{cat.age} years</span>
                  </div>
                  <div className="cat-detail-item">
                    <span className="detail-label">Weight</span>
                    <span className="detail-value">{cat.weight} kg</span>
                  </div>
                </div>
                <Link to={`/cats/${cat.id}`} className="view-details-btn">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CatListPage;