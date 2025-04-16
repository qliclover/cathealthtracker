import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function CatDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State for storing cat info and health records
  const [cat, setCat] = useState(null);
  const [records, setRecords] = useState([]);
  
  // State for keeping track of which records are expanded (record id as key)
  const [expandedRecords, setExpandedRecords] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to truncate text if it's too long
  const truncate = (text, limit) => {
    if (!text) return '';
    return text.length > limit ? text.slice(0, limit) + '...' : text;
  };

  // Toggle expanded/collapsed state for a record
  const toggleExpand = (recordId) => {
    setExpandedRecords(prevState => ({
      ...prevState,
      [recordId]: !prevState[recordId]
    }));
  };

  // Fetch cat info and health records
  useEffect(() => {
    const fetchCatDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        // Fetch cat basic information
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

        // Fetch health records for the cat
        const recordsResponse = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}/records`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!recordsResponse.ok) {
          throw new Error('Failed to fetch health records');
        }
        const recordsData = await recordsResponse.json();
        setRecords(Array.isArray(recordsData) ? recordsData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCatDetails();
  }, [id, navigate]);

  // Navigation functions
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
        {/* Cat Basic Information */}
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>{cat.name}</h2>
                <button className="btn btn-outline-primary" onClick={handleEditCat}>
                  <i className="bi bi-pencil-square me-2"></i>
                  Edit Information
                </button>
              </div>
              {/* Show cat photo if available */}
              {cat.imageUrl && (
                <div className="cat-photo-container mb-3">
                  <img 
                    src={cat.imageUrl} 
                    alt={cat.name} 
                    className="cat-photo"
                  />
                </div>
              )}
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

        {/* Health Records List */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Health Records</h3>
                <button className="btn btn-primary" onClick={handleAddRecord}>
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Record
                </button>
              </div>

              {!Array.isArray(records) || records.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state-text">No health records yet</p>
                  <button className="btn btn-outline-primary mt-2" onClick={handleAddRecord}>
                    Add First Health Record
                  </button>
                </div>
              ) : (
                <div className="list-group health-record-list">
                  {records.map((record) => (
                    <div key={record.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="mb-1">
                            <span className={`record-badge record-badge-${record.type.toLowerCase()}`}>
                              {record.type}
                            </span>
                          </div>
                          <p className="mb-1">
                            <small className="text-muted">
                              <i className="bi bi-calendar3 me-1"></i>
                              {new Date(record.date).toLocaleDateString()}
                            </small>
                          </p>
                          {/* Display record description with expand/collapse functionality */}
                          <p className="mb-1">
                            {record.description && (expandedRecords[record.id] 
                              ? record.description 
                              : truncate(record.description, 100)
                            )}
                            {record.description && record.description.length > 100 && (
                              <button
                                className="btn btn-link p-0 ms-2"
                                onClick={() => toggleExpand(record.id)}
                              >
                                {expandedRecords[record.id] ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </p>
                          {record.notes && (
                            <p className="mb-1">
                              <small className="text-muted">
                                <i className="bi bi-journal-text me-1"></i>
                                Notes: {record.notes}
                              </small>
                            </p>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleEditRecord(record.id)}
                        >
                          <i className="bi bi-pencil me-1"></i>
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
