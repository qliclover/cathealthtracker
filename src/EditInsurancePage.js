import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';

function EditInsurancePage() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [catId, setCatId] = useState(null);
  const [formData, setFormData] = useState({
    provider: '',
    policyNumber: '',
    startDate: '',
    endDate: '',
    coverage: '',
    premium: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch insurance details
    const fetchInsurance = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/insurance/${id}`, {
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
          throw new Error('Failed to fetch insurance details');
        }

        const data = await response.json();
        setCatId(data.catId);
        
        // Format dates for input fields
        const startDateFormatted = new Date(data.startDate).toISOString().split('T')[0];
        const endDateFormatted = new Date(data.endDate).toISOString().split('T')[0];
        
        setFormData({
          provider: data.provider,
          policyNumber: data.policyNumber,
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          coverage: data.coverage || '',
          premium: data.premium || ''
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInsurance();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/insurance/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update insurance information');
      }

      // Navigate back to cat details page
      navigate(`/cats/${catId}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this insurance record?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/insurance/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete insurance information');
      }

      // Navigate back to cat details page
      navigate(`/cats/${catId}`);
    } catch (err) {
      setError(err.message);
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

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h2 className="mb-0">Edit Insurance</h2>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="provider" className="form-label">Insurance Provider</label>
                    <input
                      type="text"
                      className="form-control"
                      id="provider"
                      name="provider"
                      value={formData.provider}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="policyNumber" className="form-label">Policy Number</label>
                    <input
                      type="text"
                      className="form-control"
                      id="policyNumber"
                      name="policyNumber"
                      value={formData.policyNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="startDate" className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="endDate" className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="premium" className="form-label">Premium Amount ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      id="premium"
                      name="premium"
                      value={formData.premium}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="coverage" className="form-label">Coverage Details</label>
                    <textarea
                      className="form-control"
                      id="coverage"
                      name="coverage"
                      value={formData.coverage}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>
                </div>
                
                <div className="d-grid gap-2 d-md-flex justify-content-md-between">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                  
                  <div>
                    <button
                      type="button"
                      className="btn btn-outline-secondary me-2"
                      onClick={() => navigate(`/cats/${catId}`)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditInsurancePage;