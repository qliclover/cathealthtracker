import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function CatDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State for storing cat info and health records
  const [cat, setCat] = useState(null);
  const [records, setRecords] = useState([]);
  const [insurance, setInsurance] = useState([]);
  
  // State for keeping track of which records are expanded (record id as key)
  const [expandedRecords, setExpandedRecords] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  // Calculate age
  const calculateAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return `${age}years old`;
  };
  

  // Fetch cat info, health records, and insurance data
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
        // Ensure records is always an array
        setRecords(Array.isArray(recordsData) ? recordsData : []);
        
        // Fetch insurance information for the cat
        const insuranceResponse = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}/insurance`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (insuranceResponse.ok) {
          const insuranceData = await insuranceResponse.json();
          setInsurance(Array.isArray(insuranceData) ? insuranceData : []);
        }
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
  
  const handleAddInsurance = () => {
    navigate(`/cats/${id}/insurance/add`);
  };
  
  const handleEditInsurance = (insuranceId) => {
    navigate(`/insurance/${insuranceId}/edit`);
  };

  // Handle cat delete function
  const handleDeleteCat = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete cat');
      }

      // Return to the catlistpage
      navigate('/cats');
    } catch (err) {
      setError(err.message);
    }
  };

  // confirmation
  const toggleConfirmDelete = () => {
    setConfirmDelete(!confirmDelete);
  };

  // Check if insurance is active
  const isInsuranceActive = (policy) => {
    const today = new Date();
    const endDate = new Date(policy.endDate);
    return endDate >= today;
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
                <div>
                  <button className="btn btn-outline-primary me-2" onClick={handleEditCat}>
                    <i className="bi bi-pencil-square me-2"></i>
                    Edit
                  </button>
                  <button className="btn btn-outline-danger" onClick={toggleConfirmDelete}>
                    <i className="bi bi-trash me-2"></i>
                    Delete
                  </button>
                </div>
              </div>
              {cat.imageUrl ? (
                <div className="text-center mb-3">
                  <img 
                    src={cat.imageUrl} 
                    alt={cat.name} 
                    style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://placehold.co/400x300?text=Cat+Photo";
                    }}
                  />
                </div>
              ) : (
                <div className="text-center mb-3">
                  <img 
                    src="https://placehold.co/400x300?text=Cat+Photo" 
                    alt="Default cat" 
                    style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
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
              {cat.birthdate && (
                <div className="mb-3">
                  <strong>Birthdate:</strong> {new Date(cat.birthdate).toLocaleDateString()}
                  <span className="ms-2 badge bg-primary">
                    {calculateAge(cat.birthdate)}
                  </span>
                </div>
              )}
              {cat.description && (
                <div className="mb-3">
                  <strong>Description:</strong> {cat.description}
                </div>
              )}
            </div>
          </div>
          {/* Deletion confirmation alert */}
          {confirmDelete && (
            <div className="card mb-4 border-danger">
              <div className="card-body">
                <h5 className="card-title text-danger">Delete Cat</h5>
                <p>Are you sure you want to delete {cat.name}? This action cannot be undone.</p>
                <div className="d-flex justify-content-end">
                  <button className="btn btn-outline-secondary me-2" onClick={toggleConfirmDelete}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={handleDeleteCat}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Insurance Information */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Insurance</h3>
                <button className="btn btn-primary" onClick={handleAddInsurance}>
                  <i className="bi bi-shield-plus me-2"></i>
                  Add Insurance
                </button>
              </div>

              {insurance.length === 0 ? (
                <p className="text-muted">No insurance information available</p>
              ) : (
                <div className="list-group">
                  {insurance.map((policy) => (
                    <div key={policy.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="d-flex align-items-center mb-1">
                            <h5 className="mb-0">{policy.provider}</h5>
                            <span className={`badge ms-2 ${isInsuranceActive(policy) ? 'bg-success' : 'bg-danger'}`}>
                              {isInsuranceActive(policy) ? 'Active' : 'Expired'}
                            </span>
                          </div>
                          <p className="mb-1">
                            <strong>Policy:</strong> {policy.policyNumber}
                          </p>
                          <p className="mb-1">
                            <strong>Coverage Period:</strong> {new Date(policy.startDate).toLocaleDateString()} to {new Date(policy.endDate).toLocaleDateString()}
                          </p>
                          {policy.premium && (
                            <p className="mb-1">
                              <strong>Premium:</strong> ${policy.premium.toFixed(2)}
                            </p>
                          )}
                          {policy.coverage && (
                            <p className="mb-1">
                              <strong>Coverage:</strong> {policy.coverage}
                            </p>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleEditInsurance(policy.id)}
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

                          <p className="mb-1">
                            {record.description && (
                              expandedRecords[record.id]
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

                          {record.fileUrl && (
                            <p className="mb-1">
                              <a 
                                href={record.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn btn-sm btn-outline-info mt-2"
                              >
                                <i className="bi bi-file-earmark me-1"></i>
                                View Attachment
                              </a>
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