import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if token exists in local storage to determine if user is logged in
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    // Clear token and navigate to login page
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand" to="/">Cat Health Tracker</Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          style={{ borderColor: '#d46c4e' }}
        >
          <span className="navbar-toggler-icon" style={{ backgroundColor: '#d46c4e' }}></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {isLoggedIn ? (
              <>
                <li className="nav-item">
                <Link className="nav-link text-secondary" to="/">
                  <i className="bi bi-speedometer2 me-1"></i>Dashboard
                </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-secondary" to="/cats">
                    <i className="bi bi-house-door me-1"></i>My Cats
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-secondary" to="/calendar">
                    <i className="bi bi-calendar-week me-1"></i>Health Calendar
                  </Link>
                </li>
                <li className="nav-item">
                  <button 
                    className="nav-link btn btn-link text-secondary" 
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-secondary" to="/login">Login</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link text-secondary" to="/register">Register</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;