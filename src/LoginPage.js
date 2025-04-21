import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';
import './styles/auth.css';

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTestLogin = () => {
    setFormData({ email: 'test2@example.com', password: 'password123' });
    handleSubmit(new Event('submit'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      navigate('/cats');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            className="auth-input"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            className="auth-input"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <button
            type="button"
            className="auth-btn-outline mt-2"
            onClick={handleTestLogin}
            disabled={loading}
          >
            Use Test Account
          </button>
        </form>

        <div className="mt-3 text-center">
          <p>Don't have an account? <a href="/register">Register now</a></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
