import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import './styles/pages.css';

const CatPage = () => {
  const { id } = useParams();
  const [cat, setCat] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCatData = async () => {
      try {
        const response = await fetch(`/api/cats/${id}`);
        if (!response.ok) throw new Error('Failed to fetch cat data');
        const data = await response.json();
        setCat(data);
        
        const recordsResponse = await fetch(`/api/cats/${id}/health-records`);
        if (!recordsResponse.ok) throw new Error('Failed to fetch health records');
        const recordsData = await recordsResponse.json();
        setHealthRecords(recordsData);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchCatData();
  }, [id]);

  if (loading) return <div className="text-center p-5">Loading...</div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;
  if (!cat) return <div className="alert alert-info m-5">Cat not found</div>;

  const getRecordTypeBadgeClass = (type) => {
    const types = {
      vaccination: 'vaccination',
      checkup: 'checkup',
      medication: 'medication',
      other: 'other'
    };
    return types[type.toLowerCase()] || 'other';
  };

  return (
    <div className="container py-4">
      <div className="cat-profile">
        <div className="cat-profile-header">
          <img
            src={cat.imageUrl || "https://placehold.co/400x400?text=Cat+Photo"}
            alt={cat.name}
            className="cat-profile-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://placehold.co/400x400?text=Cat+Photo";
            }}
          />
          <div className="cat-profile-info">
            <h1 className="cat-profile-name">
              {cat.name}
              {cat.gender === 'Female' ? '♀️' : '♂️'}
            </h1>
            <p className="cat-profile-breed">{cat.breed}</p>
            <div className="cat-info-grid">
              <div className="cat-info-item">
                <div className="cat-info-label">Age</div>
                <div className="cat-info-value">{cat.age} years</div>
              </div>
              <div className="cat-info-item">
                <div className="cat-info-label">Weight</div>
                <div className="cat-info-value">{cat.weight} kg</div>
              </div>
              <div className="cat-info-item">
                <div className="cat-info-label">Birthday</div>
                <div className="cat-info-value">
                  {format(new Date(cat.birthday), 'MMM dd, yyyy')}
                </div>
              </div>
              <div className="cat-info-item">
                <div className="cat-info-label">Microchip</div>
                <div className="cat-info-value">{cat.microchipNumber || 'N/A'}</div>
              </div>
            </div>
            <div className="cat-actions">
              <Link to={`/cats/${id}/edit`} className="cat-action-btn primary">
                <i className="bi bi-pencil"></i>
                Edit Profile
              </Link>
              <Link to={`/cats/${id}/health-record/add`} className="cat-action-btn secondary">
                <i className="bi bi-plus-circle"></i>
                Add Health Record
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="health-records-section">
        <div className="health-records-header">
          <h2 className="health-records-title">
            <i className="bi bi-journal-medical"></i>
            Health Records
          </h2>
        </div>
        <div className="health-record-list">
          {healthRecords.length === 0 ? (
            <div className="empty-records">
              <div className="empty-records-text">No health records yet</div>
              <Link
                to={`/cats/${id}/health-record/add`}
                className="cat-action-btn primary"
              >
                Add First Record
              </Link>
            </div>
          ) : (
            healthRecords.map(record => (
              <div key={record.id} className="health-record-item">
                <div className={`record-type-badge ${getRecordTypeBadgeClass(record.type)}`}>
                  {record.type}
                </div>
                <div className="record-description">{record.description}</div>
                <div className="record-date">
                  {format(new Date(record.date), 'MMMM dd, yyyy')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CatPage; 