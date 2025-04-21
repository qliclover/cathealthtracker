// src/CatDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function CatDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cat, setCat] = useState(null);
  const [records, setRecords] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [expandedRecords, setExpandedRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Truncate long text
  const truncate = (text, limit) =>
    text && text.length > limit ? text.slice(0, limit) + '…' : text;

  // Toggle expanded/collapsed description
  const toggleExpand = (recordId) =>
    setExpandedRecords(prev => ({ ...prev, [recordId]: !prev[recordId] }));

  // Calculate exact age from a birthdate string
  const calculateAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} years old`;
  };

  // Load cat info, records, insurance
  useEffect(() => {
    const fetchCatDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // 1) Cat basic info
        const catRes = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!catRes.ok) {
          if (catRes.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch cat information');
        }
        const catData = await catRes.json();
        setCat(catData);

        // 2) Health records
        const recRes = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}/records`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!recRes.ok) throw new Error('Failed to fetch health records');
        const recList = await recRes.json();
        setRecords(Array.isArray(recList) ? recList : []);

        // 3) Insurance
        const insRes = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}/insurance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (insRes.ok) {
          const insList = await insRes.json();
          setInsurance(Array.isArray(insList) ? insList : []);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCatDetails();
  }, [id, navigate]);

  // Toggle delete‑confirmation UI
  const toggleConfirmDelete = () => setConfirmDelete(prev => !prev);

  // Delete handler with detailed error
  const handleDeleteCat = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_ENDPOINTS.DELETE_CAT}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server responded ${res.status}: ${txt}`);
      }
      navigate('/cats');
    } catch (err) {
      console.error('Delete cat error:', err);
      setError(err.message);
    }
  };

  // Navigation helpers
  const handleEditCat = () => navigate(`/cats/${id}/edit`);
  const handleAddRecord = () => navigate(`/cats/${id}/records/add`);
  const handleEditRecord = (rid) => navigate(`/records/${rid}/edit`);
  const handleAddInsurance = () => navigate(`/cats/${id}/insurance/add`);
  const handleEditInsurance = (iid) => navigate(`/insurance/${iid}/edit`);

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
  if (!cat) {
    return <div className="alert alert-warning">Cat information not found</div>;
  }

  return (
    <div className="container mt-4">
      <div className="row">
        {/* Cat Info */}
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>{cat.name}</h2>
                <div>
                  <button className="btn btn-outline-primary me-2" onClick={handleEditCat}>
                    <i className="bi bi-pencil-square me-2"></i>Edit
                  </button>
                  <button className="btn btn-outline-danger" onClick={toggleConfirmDelete}>
                    <i className="bi bi-trash me-2"></i>Delete
                  </button>
                </div>
              </div>

              {cat.imageUrl ? (
                <div className="text-center mb-3">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    style={{ maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x300?text=Cat+Photo'; }}
                  />
                </div>
              ) : (
                <div className="text-center mb-3">
                  <img
                    src="https://placehold.co/400x300?text=Cat+Photo"
                    alt="Default cat"
                    style={{ maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }}
                  />
                </div>
              )}

              <p><strong>Breed:</strong> {cat.breed}</p>
              <p>
                <strong>Age:</strong>{' '}
                {cat.birthdate
                  ? calculateAge(cat.birthdate)
                  : cat.age != null
                    ? `${cat.age} years`
                    : 'Unknown'}
              </p>
              <p><strong>Weight:</strong> {cat.weight} kg</p>

              {cat.birthdate && (
                <p>
                  <strong>Birthdate:</strong> {new Date(cat.birthdate).toLocaleDateString()}{' '}
                  <span className="badge bg-primary ms-2">{calculateAge(cat.birthdate)}</span>
                </p>
              )}
              {cat.description && <p><strong>Description:</strong> {cat.description}</p>}
            </div>
          </div>

          {/* Delete Confirmation */}
          {confirmDelete && (
            <div className="card mb-4 border-danger">
              <div className="card-body">
                <h5 className="card-title text-danger">Delete Cat</h5>
                <p>Are you sure you want to delete {cat.name}? This cannot be undone.</p>
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

          {/* Insurance */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Insurance</h3>
                <button className="btn btn-primary" onClick={handleAddInsurance}>
                  <i className="bi bi-shield-plus me-2"></i>Add Insurance
                </button>
              </div>
              {insurance.length === 0 ? (
                <p className="text-muted">No insurance available</p>
              ) : (
                <div className="list-group">
                  {insurance.map(pol => (
                    <div key={pol.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5>{pol.provider}</h5>
                          <p className="mb-1"><strong>Policy:</strong> {pol.policyNumber}</p>
                          <p className="mb-1">
                            <strong>Period:</strong>{' '}
                            {new Date(pol.startDate).toLocaleDateString()} –{' '}
                            {new Date(pol.endDate).toLocaleDateString()}
                          </p>
                          {pol.premium != null && <p><strong>Premium:</strong> ${pol.premium.toFixed(2)}</p>}
                          {pol.coverage && <p><strong>Coverage:</strong> {pol.coverage}</p>}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleEditInsurance(pol.id)}
                        >
                          <i className="bi bi-pencil me-1"></i>Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Health Records */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Health Records</h3>
                <button className="btn btn-primary" onClick={handleAddRecord}>
                  <i className="bi bi-plus-circle me-2"></i>Add Record
                </button>
              </div>
              {records.length === 0 ? (
                <div className="text-center text-muted">No health records</div>
              ) : (
                <div className="list-group">
                  {records.map(rec => (
                    <div key={rec.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <span className="badge bg-info">{rec.type}</span>
                          <small className="text-muted ms-2">
                            <i className="bi bi-calendar3 me-1"></i>
                            {new Date(rec.date).toLocaleDateString()}
                          </small>
                          <p className="mt-1 mb-1">
                            {expandedRecords[rec.id] ? rec.description : truncate(rec.description, 100)}
                            {rec.description.length > 100 && (
                              <button className="btn btn-link p-0 ms-2" onClick={() => toggleExpand(rec.id)}>
                                {expandedRecords[rec.id] ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </p>
                          {rec.notes && (
                            <small className="text-muted">
                              <i className="bi bi-journal-text me-1"></i>Notes: {rec.notes}
                            </small>
                          )}
                          {rec.fileUrl && (
                            <div className="mt-2">
                              <a
                                href={rec.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-info"
                              >
                                <i className="bi bi-file-earmark me-1"></i>View Attachment
                              </a>
                            </div>
                          )}
                        </div>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleEditRecord(rec.id)}>
                          <i className="bi bi-pencil me-1"></i>Edit
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
