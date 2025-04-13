import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function CatDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cat, setCat] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCatDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch cat information
        const catResponse = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!catResponse.ok) {
          if (catResponse.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch cat information');
        }

        const catData = await catResponse.json();
        setCat(catData);

        // Fetch health records
        const recordsResponse = await fetch(`${API_ENDPOINTS.GET_CAT_RECORDS}/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!recordsResponse.ok) {
          throw new Error('Failed to fetch health records');
        }

        const recordsData = await recordsResponse.json();
        setRecords(recordsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCatDetails();
  }, [id, navigate]);

  const handleEditCat = () => {
    navigate(`/cats/${id}/edit`);
  };

  const handleAddRecord = () => {
    navigate(`/cats/${id}/records/add`);
  };

  const handleEditRecord = (recordId) => {
    navigate(`/records/${recordId}/edit`);
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

  if (!cat) {
    return (
      <div className="alert alert-warning" role="alert">
        Cat information not found
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>{cat.name}</h2>
                <button className="btn btn-outline-primary" onClick={handleEditCat}>
                  Edit Information
                </button>
              </div>
              <div className="mb-3">
                <strong>Breed:</strong> {cat.breed}
              </div>
              <div className="mb-3">
                <strong>Age:</strong> {cat.age} years
              </div>
              <div className="mb-3">
                <strong>Weight:</strong> {cat.weight}kg
              </div>
              {cat.description && (
                <div className="mb-3">
                  <strong>Description:</strong> {cat.description}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Health Records</h3>
                <button className="btn btn-primary" onClick={handleAddRecord}>
                  Add Record
                </button>
              </div>

              {records.length === 0 ? (
                <p className="text-muted">No health records yet</p>
              ) : (
                <div className="list-group">
                  {records.map((record) => (
                    <div key={record.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5 className="mb-1">{record.type}</h5>
                          <p className="mb-1">
                            <small className="text-muted">
                              {new Date(record.date).toLocaleDateString()}
                            </small>
                          </p>
                          <p className="mb-1">{record.description}</p>
                          {record.notes && (
                            <p className="mb-1">
                              <small className="text-muted">Notes: {record.notes}</small>
                            </p>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleEditRecord(record.id)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CatDetailsPage; 