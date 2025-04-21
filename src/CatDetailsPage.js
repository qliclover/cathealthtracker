// src/CatDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
      {/* Cat Info Section */}
      <div className="cat-details-header">
        <h1 className="cat-details-title">{cat.name}</h1>
        <div className="cat-details-actions">
          <button className="cat-action-btn edit" onClick={handleEditCat}>
            <i className="bi bi-pencil-square"></i>Edit
          </button>
          <button className="cat-action-btn delete" onClick={toggleConfirmDelete}>
            <i className="bi bi-trash"></i>Delete
          </button>
        </div>
      </div>

      <div className="cat-details-section">
        <img
          src={cat.imageUrl || "https://placehold.co/400x300?text=Cat+Photo"}
          alt={cat.name}
          className="cat-details-photo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://placehold.co/400x300?text=Cat+Photo";
          }}
        />
        <div className="cat-info-grid">
          <div className="cat-info-item">
            <span className="cat-info-label">Breed</span>
            <span className="cat-info-value">{cat.breed}</span>
          </div>
          <div className="cat-info-item">
            <span className="cat-info-label">Birthdate</span>
            <div>
              <span className="cat-info-value">
                {new Date(cat.birthdate).toLocaleDateString()}
              </span>
              <span className="cat-info-badge ms-2">
                {calculateAge(cat.birthdate)}
              </span>
            </div>
          </div>
          <div className="cat-info-item">
            <span className="cat-info-label">Weight</span>
            <span className="cat-info-value">{cat.weight} kg</span>
          </div>
          {cat.description && (
            <div className="cat-info-item">
              <span className="cat-info-label">Description</span>
              <span className="cat-info-value">{cat.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Health Records Section */}
      <div className="cat-details-section">
        <div className="section-header">
          <h2 className="section-title">
            <i className="bi bi-journal-medical"></i>
            Health Records
          </h2>
          <Link to={`/cats/${id}/records/add`} className="add-record-btn">
            Add Record
          </Link>
        </div>
        <div className="section-body">
          {records.length === 0 ? (
            <div className="section-empty">No health records yet.</div>
          ) : (
            <div className="health-record-list">
              {records.map(record => (
                <div key={record.id} className="health-record-item">
                  <div className="health-record-header">
                    <h3 className="health-record-title">{record.type}</h3>
                    <span className="health-record-date">
                      {new Date(record.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="health-record-desc">{record.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Insurance Section */}
      <div className="cat-details-section">
        <div className="section-header">
          <h2 className="section-title">
            <i className="bi bi-shield-check"></i>
            Insurance
          </h2>
          {insurance.length === 0 && (
            <Link to={`/cats/${id}/insurance/add`} className="add-insurance-btn">
              Add Insurance
            </Link>
          )}
        </div>
        <div className="section-body">
          {insurance.length === 0 ? (
            <div className="section-empty">No insurance information yet.</div>
          ) : (
            insurance.map(ins => (
              <div key={ins.id} className="insurance-card">
                <div className="insurance-header">
                  <h3 className="insurance-company">{ins.company}</h3>
                  <button
                    className="insurance-edit-btn"
                    onClick={() => handleEditInsurance(ins.id)}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                </div>
                <div className="insurance-grid">
                  <div className="insurance-item">
                    <span className="insurance-label">Policy Number</span>
                    <span className="insurance-value">{ins.policyNumber}</span>
                  </div>
                  <div className="insurance-item">
                    <span className="insurance-label">Period</span>
                    <span className="insurance-value">
                      {new Date(ins.startDate).toLocaleDateString()} - 
                      {new Date(ins.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="insurance-item">
                    <span className="insurance-label">Premium</span>
                    <span className="insurance-value">${ins.premium}</span>
                  </div>
                  <div className="insurance-item">
                    <span className="insurance-label">Coverage</span>
                    <span className="insurance-value">{ins.coverage}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="delete-confirmation">
          <h3 className="delete-confirmation-title">Delete Cat</h3>
          <p className="delete-confirmation-text">
            Are you sure you want to delete {cat.name}? This cannot be undone.
          </p>
          <div className="delete-confirmation-actions">
            <button
              className="cat-action-btn edit"
              onClick={toggleConfirmDelete}
            >
              Cancel
            </button>
            <button
              className="cat-action-btn delete"
              onClick={handleDeleteCat}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CatDetailsPage;
