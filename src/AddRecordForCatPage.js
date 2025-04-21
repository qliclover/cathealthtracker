import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function AddRecordForCatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cat, setCat] = useState(null);
  const [type, setType] = useState('vaccination');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null); // Add file state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCat = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_ENDPOINTS.GET_CAT}/${id}`, {
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
          throw new Error('Failed to fetch cat information');
        }

        const data = await response.json();
        setCat(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchCat();
  }, [id, navigate]);

  // Add handler for file input changes
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Use FormData for potential file uploads
      const formDataToSend = new FormData();
      formDataToSend.append('type', type);
      formDataToSend.append('date', date);
      formDataToSend.append('description', description);
      formDataToSend.append('notes', notes);
      
      // Add file if selected
      if (file) {
        formDataToSend.append('file', file);
      }

      // Construct the proper URL
      const recordUrl = `${API_ENDPOINTS.GET_CAT}/${id}/records`;
      console.log("Sending request to:", recordUrl);
      
      const response = await fetch(recordUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add health record');
      }

      // Navigate to cat details page after successful addition
      navigate(`/cats/${id}`);
    } catch (err) {
      console.error("Error adding health record:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!cat) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Add Health Record for {cat.name}</h2>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="type" className="form-label">Record Type</label>
                  <select
                    className="form-select"
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
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
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="notes" className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="2"
                  />
                </div>
                {/* Add file upload field */}
                <div className="mb-3">
                  <label htmlFor="file" className="form-label">Attach File (Optional)</label>
                  <input
                    type="file"
                    className="form-control"
                    id="file"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Adding...' : 'Add Record'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate(`/cats/${id}`)}
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

export default AddRecordForCatPage;