import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function CatDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cat, setCat] = useState(null);
  const [records, setRecords] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState(null);

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
        setRecords(Array.isArray(recList) ? recList : []);

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

  const toggleConfirmDelete = () => setConfirmDelete(prev => !prev);
  const handleOpenDeleteRecord = (recordId) => setConfirmDeleteRecord(recordId);
  const handleCloseDeleteRecord = () => setConfirmDeleteRecord(null);

  const handleDeleteRecord = async (recordId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_ENDPOINTS.DELETE_RECORD}/${recordId}`, {
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
      setRecords(records.filter(r => r.id !== recordId));
      setConfirmDeleteRecord(null);
    } catch (err) {
      console.error('Delete record error:', err);
      setError(err.message);
    }
  };

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

  const handleEditCat = () => navigate(`/cats/${id}/edit`);
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
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!cat) return <div className="alert alert-warning">Cat information not found</div>;

  return (
    <div className="container mt-4">
      <div className="row mb-4">
        {/* Left Column */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>{cat.name}</h2>
                <div>
                  <button className="btn btn-outline-primary me-2" onClick={handleEditCat} aria-label="Edit cat">
                    <i className="bi bi-pencil-square me-2"></i>Edit
                  </button>
                  <button className="btn btn-outline-danger" onClick={toggleConfirmDelete } aria-label="Delete cat">
                    <i className="bi bi-trash me-2"></i>Delete
                  </button>
                </div>
              </div>

              <div className="text-center mb-3">
                <img
                  src={cat.imageUrl || "https://placehold.co/400x300?text=Cat+Photo"}
                  alt={cat.name}
                  style={{ maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }}
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x300?text=Cat+Photo"; }}
                />
              </div>

              <p><strong>Breed:</strong> {cat.breed}</p>
              {cat.birthdate ? (
                <p>
                  <strong>Birthdate:</strong> {new Date(cat.birthdate).toLocaleDateString()}
                  <span className="badge bg-primary ms-2">{calculateAge(cat.birthdate)}</span>
                </p>
              ) : (
                <p><strong>Age:</strong> {cat.age != null ? `${cat.age} years` : 'Unknown'}</p>
              )}
              <p><strong>Weight:</strong> {cat.weight} kg</p>
              {cat.description && <p><strong>Description:</strong> {cat.description}</p>}
            </div>
          </div>

          {confirmDelete && (
            <div className="card mb-4 border-danger mt-3">
              <div className="card-body">
                <h5 className="card-title text-danger">Delete Cat</h5>
                <p>Are you sure you want to delete {cat.name}? This cannot be undone.</p>
                <div className="d-flex justify-content-end">
                  <button className="btn btn-outline-secondary me-2" onClick={toggleConfirmDelete}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDeleteCat}>Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* Insurance Section */}
          <div className="card mt-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Insurance</h3>
                <Link to={`/cats/${id}/insurance/add`} className="btn btn-primary">
                  <i className="bi bi-shield-plus me-2"></i>Add Insurance
                </Link>
              </div>
              {insurance.length === 0 ? (
                <p className="text-muted">No insurance available</p>
              ) : (
                <div className="list-group">
                  {insurance.map(ins => (
                    <div key={ins.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5>{ins.provider}</h5>
                          <p className="mb-1"><strong>Policy:</strong> {ins.policyNumber}</p>
                          <p className="mb-1"><strong>Period:</strong> {new Date(ins.startDate).toLocaleDateString()} – {new Date(ins.endDate).toLocaleDateString()}</p>
                          {ins.premium != null && <p><strong>Premium:</strong> ${ins.premium.toFixed(2)}</p>}
                          {ins.coverage && <p><strong>Coverage:</strong> {ins.coverage}</p>}
                        </div>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleEditInsurance(ins.id)}>
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

        {/* Right Column - Records */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Health Records</h3>
                <Link to={`/cats/${id}/records/add`} className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i>Add Record
                </Link>
              </div>
              {records.length === 0 ? (
                <div className="text-center text-muted">No health records</div>
              ) : (
                <div className="list-group">
                  {records.map(record => (
                    <div key={record.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <span className="badge bg-info">{record.type}</span>
                          <small className="text-muted ms-2">
                            <i className="bi bi-calendar3 me-1"></i>
                            {new Date(record.date).toLocaleDateString()}
                          </small>
                          <p className="mt-1 mb-1">{record.description}</p>
                          {record.notes && (
                            <small className="text-muted">
                              <i className="bi bi-journal-text me-1"></i>Notes: {record.notes}
                            </small>
                          )}
                          {record.fileUrl && (
                            <div className="mt-2">
                              <a
                                href={record.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-info"
                              >
                                <i className="bi bi-file-earmark me-1"></i>View Attachment
                              </a>
                            </div>
                          )}
                        </div>
                        <div>
                          <Link to={`/records/${record.id}/edit`} className="btn btn-sm btn-outline-secondary me-2">
                            <i className="bi bi-pencil me-1"></i>Edit
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleOpenDeleteRecord(record.id)}
                          >
                            <i className="bi bi-trash me-1"></i>Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Record Modal */}
      {confirmDeleteRecord !== null && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Health Record</h5>
                <button type="button" className="btn-close" onClick={handleCloseDeleteRecord}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this health record? This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={handleCloseDeleteRecord}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={() => handleDeleteRecord(confirmDeleteRecord)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CatDetailsPage;
