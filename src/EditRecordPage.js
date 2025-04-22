import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function EditRecordPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [catId, setCatId] = useState(null);
  const [formData, setFormData] = useState({
    type: '',
    date: '',
    description: '',
    notes: ''
  });
  const [file, setFile] = useState(null);
  const [currentFileUrl, setCurrentFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Get record details
        const response = await fetch(`${API_ENDPOINTS.UPDATE_RECORD}/${id}`, {
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
          throw new Error('Failed to get health record');
        }

        const data = await response.json();
        setRecord(data);
        setCatId(data.catId);
        
        // Format date to YYYY-MM-DD format
        const formattedDate = new Date(data.date).toISOString().split('T')[0];
        
        setFormData({
          type: data.type,
          date: formattedDate,
          description: data.description,
          notes: data.notes || ''
        });
        
        // If record has a file, set it as current file
        if (data.fileUrl) {
          setCurrentFileUrl(data.fileUrl);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Use FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('type', formData.type);
      formDataToSend.append('date', formData.date);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('notes', formData.notes);
      
      if (file) {
        formDataToSend.append('file', file);
      }

      const response = await fetch(`${API_ENDPOINTS.UPDATE_RECORD}/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error('Failed to update health record');
      }

      // Navigate back to cat details page after successful update
      navigate(`/cats/${catId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
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

  if (!record) {
    return (
      <div className="alert alert-warning" role="alert">
        Health record not found
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Edit Health Record</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="type" className="form-label">Record Type</label>
                  <select
                    className="form-select"
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                  >
                    <option value="vaccination">Vaccination</option>
                    <option value="checkup">Check-up</option>
                    <option value="medication">Medication</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="date" className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="notes" className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                  />
                </div>
                
                {/* File upload section */}
                <div className="mb-3">
                  <label htmlFor="file" className="form-label">Upload File (optional)</label>
                  <input
                    type="file"
                    className="form-control"
                    id="file"
                    onChange={handleFileChange}
                  />
                  {currentFileUrl && !file && (
                    <div className="mt-2">
                      <p className="mb-1">Current file:</p>
                      <a href={currentFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info">
                        <i className="bi bi-file-earmark me-1"></i>
                        View File
                      </a>
                      <small className="d-block text-muted mt-1">Upload a new file to replace the current one</small>
                    </div>
                  )}
                </div>
                
                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitLoading}
                  >
                    {submitLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Updating...
                      </>
                    ) : (
                      'Update Record'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(`/cats/${catId}`)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditRecordPage;