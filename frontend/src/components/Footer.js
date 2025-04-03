import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="logo-text">FraudGuard</span>
            <span className="logo-icon">🛡️</span>
          </div>
          
          <div className="footer-links">
            <div className="footer-section">
              <h4>Navigation</h4>
              <Link to="/" className="footer-link">Home</Link>
              <Link to="/dashboard" className="footer-link">Dashboard</Link>
              <Link to="/about" className="footer-link">About</Link>
              <Link to="/contact" className="footer-link">Contact</Link>
            </div>
            
            <div className="footer-section">
              <h4>Resources</h4>
              <a href="#" className="footer-link">Documentation</a>
              <a href="#" className="footer-link">API Reference</a>
              <a href="#" className="footer-link">Support</a>
            </div>
            
            <div className="footer-section">
              <h4>Legal</h4>
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Terms of Service</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} FraudGuard. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;