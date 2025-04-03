import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const isActive = (path) => {
    return location.pathname === path ? 'active-nav-link' : '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-text">FraudGuard</span>
          <span className="logo-icon">🛡️</span>
        </Link>
        
        <div className={`menu-icon ${menuOpen ? 'active' : ''}`} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        
        <ul className={menuOpen ? "nav-menu active" : "nav-menu"}>
          <li className="nav-item">
            <Link to="/" className={`nav-link ${isActive('/')}`} onClick={() => setMenuOpen(false)}>Home</Link>
          </li>
          
          {/* Only show these links if user is logged in */}
          {currentUser && (
            <>
              <li className="nav-item">
                <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link to="/batch-prediction" className={`nav-link ${isActive('/batch-prediction')}`} onClick={() => setMenuOpen(false)}>Batch Prediction</Link>
              </li>
            </>
          )}
          <li className="nav-item">
                <Link to="/training-results" className={`nav-link ${isActive('/training-results')}`} onClick={() => setMenuOpen(false)}>Training Results</Link>
          </li>
          <li className="nav-item">
                <Link to="/model-demo" className={`nav-link ${isActive('/model-demo')}`} onClick={() => setMenuOpen(false)}>Model Demo</Link>
          </li>
          <li className="nav-item">
                <Link to="/live-clicks" className={`nav-link ${isActive('/live-clicks')}`} onClick={() => setMenuOpen(false)}>Live Clicks</Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className={`nav-link ${isActive('/about')}`} onClick={() => setMenuOpen(false)}>About</Link>
          </li>
          <li className="nav-item">
            <Link to="/contact" className={`nav-link ${isActive('/contact')}`} onClick={() => setMenuOpen(false)}>Contact</Link>
          </li>
          
          {/* Authentication links */}
          {currentUser ? (
            <>
              <li className="nav-item">
                <Link to="/profile" className={`nav-link ${isActive('/profile')}`} onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
              </li>
              <li className="nav-item">
                <button className="nav-link logout-btn" onClick={handleLogout}>Logout</button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className={`nav-link ${isActive('/login')}`} onClick={() => setMenuOpen(false)}>Login</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;