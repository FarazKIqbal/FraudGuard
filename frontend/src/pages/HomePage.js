import React, { useEffect, useState } from "react";
import AdComponent from "../components/AdComponent";
import { Link } from "react-router-dom";
import HeroSection from '../components/HeroSection';
import { toast } from 'react-toastify';
import axios from 'axios';

function HomePage() {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    // Check if backend is running
    const checkBackendStatus = async () => {
      try {
        const response = await axios.get('http://localhost:5000/status', { timeout: 3000 });
        if (response.status === 200) {
          setBackendStatus('connected');
          console.log('Backend connection successful');
        } else {
          setBackendStatus('error');
          toast.warning('Backend server returned an unexpected response', {
            position: "top-right",
            autoClose: 5000
          });
        }
      } catch (error) {
        console.error('Backend connection error:', error);
        setBackendStatus('error');
        toast.error('Cannot connect to backend server. Some features may not work.', {
          position: "top-right",
          autoClose: false
        });
      }
    };

    // Check if the public/images/ads directory exists
    const checkImagesExist = async () => {
      try {
        // This is just a client-side check to see if we can load one of the images
        const img = new Image();
        img.src = `${process.env.PUBLIC_URL}/images/ads/smart-watch.jpg`;
        
        img.onerror = () => {
          console.warn("Ad images not found. Please ensure the images are in the public/images/ads directory.");
          toast.info("Sample ad images not found. Using placeholder images instead.", {
            position: "bottom-right",
            autoClose: 5000
          });
        };
      } catch (error) {
        console.error("Error checking for ad images:", error);
      }
    };
    
    checkBackendStatus();
    checkImagesExist();
  }, []);

  return (
    <div className="container">
      <HeroSection 
        title="Ad Demonstration Platform" 
        subtitle="Interact with sample ads to experience FraudGuard's real-time click analysis"
      />

      {backendStatus === 'error' && (
        <div className="alert alert-warning">
          <strong>Warning:</strong> Cannot connect to backend server. Ad click analysis will not work.
          Please ensure the backend server is running at http://localhost:5000
        </div>
      )}

      <div className="content-card instruction-card">
        <h2 className="card-heading">
          <span className="icon">🖱️</span> How It Works
        </h2>
        <div className="instruction-steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Click Ad Images</h3>
            <p>Click on the ad images (not the text) to simulate user interactions</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Trigger Fraud Detection</h3>
            <p>Click rapidly (5+ times in 3 seconds) to simulate suspicious behavior</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>View Analysis</h3>
            <p>Monitor real-time fraud detection in the dashboard</p>
          </div>
        </div>
      </div>

      <div className="ads-container">
        <h2 className="section-heading">
          <span className="icon">📢</span> Sample Advertisements
        </h2>
        <p className="ads-instruction">Click on any ad image to simulate user interaction. Click rapidly to trigger fraud detection.</p>
        
        <div className="ad-grid">
          <AdComponent 
            adId="ad1" 
            title="Smart Watches" 
            description="Latest wearable tech with health monitoring. Track your fitness goals, heart rate, and sleep patterns with our premium smart watches. Water-resistant and compatible with all smartphones."
            orientation="horizontal"
          />
          <AdComponent 
            adId="ad2" 
            title="Cloud Storage" 
            description="Secure 1TB cloud storage solution with end-to-end encryption. Access your files from any device, anywhere in the world. Automatic backup ensures your data is always safe."
            orientation="horizontal"
          />
          <AdComponent 
            adId="ad3" 
            title="Fitness Gear" 
            description="Professional gym equipment for your home workout needs. Build strength, improve cardio, and achieve your fitness goals with our high-quality equipment. Free shipping on all orders."
            orientation="horizontal"
          />
        </div>
      </div>

      <div className="cta-section">
        <Link to="/dashboard" className="cta-button">
          View Fraud Detection Dashboard
        </Link>
      </div>
    </div>
  );
}

export default HomePage;