// src/CatDetailsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FaEdit, FaTrash, FaPaperclip } from 'react-icons/fa';
import { API_ENDPOINTS } from './config';

function CatDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cat, setCat] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [insurance, setInsurance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const calculateAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const fetchCatDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

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

        const recRes = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}/records`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!recRes.ok) throw new Error('Failed to fetch health records');
        const recList = await recRes.json();
        setHealthRecords(Array.isArray(recList) ? recList : []);

        const insRes = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}/insurance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (insRes.ok) {
          const insData = await insRes.json();
          setInsurance(insData);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCatDetails();
  }, [id, navigate]);

  const handleDelete = async () => {
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

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!cat) return <div className="alert alert-warning">Cat information not found</div>;

  return (
    <div className="cat-details-container">
      <div className="cat-details-header">
        <div className="cat-details-title">
          <h1>{cat.name}</h1>
          <div className="cat-details-actions">
            <Link to={`/cats/${id}/edit`} className="btn btn-primary">
              <FaEdit /> Edit
            </Link>
            <button 
              className="btn btn-danger" 
              onClick={() => setShowDeleteConfirm(true)}
            >
              <FaTrash /> Delete
            </button>
          </div>
        </div>
        
        <div className="cat-details-info">
          <p><strong>Breed:</strong> {cat.breed}</p>
          <p><strong>Age:</strong> {calculateAge(cat.birthdate)} years</p>
          <p><strong>Weight:</strong> {cat.weight} kg</p>
          <p><strong>Description:</strong> {cat.description}</p>
        </div>
      </div>

      <div className="cat-details-section">
        <h2>Health Records</h2>
        <Link to={`/cats/${id}/health-records/new`} className="btn btn-primary mb-3">
          Add Health Record
        </Link>
        
        <div className="health-record-list">
          {healthRecords.map(record => (
            <div key={record.id} className="health-record-item">
              <div className="health-record-header">
                <div className="health-record-info">
                  <span className={`record-badge record-badge-${record.type.toLowerCase()}`}>
                    {record.type}
                  </span>
                  <span className="health-record-date">
                    {format(new Date(record.date), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="health-record-actions">
                  <Link 
                    to={`/cats/${id}/health-records/${record.id}/edit`}
                    className="record-action-btn"
                  >
                    <FaEdit />
                  </Link>
                  <button 
                    className="record-action-btn delete"
                    onClick={() => {/* Handle delete */}}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              <p className="health-record-desc">{record.description}</p>
              {record.fileUrl && (
                <a 
                  href={record.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="record-attachment-btn"
                >
                  <FaPaperclip /> View Attachment
                </a>
              )}
            </div>
          ))}
          {healthRecords.length === 0 && (
            <div className="empty-state">
              <p>No health records yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="cat-details-section">
        <h2>Insurance Information</h2>
        {insurance ? (
          <div className="insurance-card">
            <h3>{insurance.company}</h3>
            <p><strong>Policy Number:</strong> {insurance.policyNumber}</p>
            <p><strong>Coverage:</strong> {insurance.coverage}</p>
            <p><strong>Expiry Date:</strong> {format(new Date(insurance.endDate), 'MMM dd, yyyy')}</p>
            <Link to={`/cats/${id}/insurance/edit`} className="btn btn-primary">
              Edit Insurance
            </Link>
          </div>
        ) : (
          <div className="empty-state">
            <p>No insurance information</p>
            <Link to={`/cats/${id}/insurance/new`} className="btn btn-primary">
              Add Insurance
            </Link>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirmation">
          <h3 className="delete-confirmation-title">Delete Cat</h3>
          <p className="delete-confirmation-text">
            Are you sure you want to delete {cat.name}? This action cannot be undone.
          </p>
          <div className="delete-confirmation-actions">
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleDelete}
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
