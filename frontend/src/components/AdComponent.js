import React, { useState, useRef } from 'react';
import axios from 'axios';
import './AdComponent.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';

function AdComponent({ adId, title, description, orientation = 'horizontal' }) {
  const [clicked, setClicked] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const clickHistory = useRef([]);
  const SPAM_THRESHOLD = 5;
  const TIME_WINDOW = 3000;
  
  // Add the isSpamClick function
  const isSpamClick = () => {
    const now = Date.now();
    clickHistory.current.push(now);
    
    // Filter clicks within the time window
    clickHistory.current = clickHistory.current.filter(
      timestamp => now - timestamp < TIME_WINDOW
    );
    
    // Return true if click count exceeds threshold
    return clickHistory.current.length >= SPAM_THRESHOLD;
  };
  
  const getAdDetails = () => {
    switch(adId) {
      case 'ad1':
        return {
          image: process.env.PUBLIC_URL + '/images/ads/smart-watch.jpg',
          title: title || 'Premium Smart Watch',
          description: description || 'Track your health, fitness, and sleep with our latest smartwatch. Features include heart rate monitoring, GPS tracking, and 7-day battery life. Limited time offer: 30% off!'
        };
      case 'ad2':
        return {
          image: process.env.PUBLIC_URL + '/images/ads/cloud-storage.jpg',
          title: title || 'Secure Cloud Storage',
          description: description || 'Get 1TB of encrypted cloud storage for all your files. Access anywhere, anytime. Military-grade encryption, automatic backup, and file sharing. Start your 30-day free trial today!'
        };
      case 'ad3':
        return {
          image: process.env.PUBLIC_URL + '/images/ads/fitness-gear.jpg',
          title: title || 'Professional Fitness Equipment',
          description: description || 'Transform your home into a gym with our professional-grade fitness equipment. Includes adjustable dumbbells, resistance bands, and yoga mat. Free shipping on orders over $100!'
        };
      default:
        return {
          image: process.env.PUBLIC_URL + '/images/ads/default-ad.jpg',
          title: title || 'Smart Device',
          description: description || 'Latest technology at your fingertips. Limited time offer available now!'
        };
    }
  };
  const adDetails = getAdDetails();
  const [scrollDepth, setScrollDepth] = useState(0);
  const [mouseMovements, setMouseMovements] = useState(0);
  const [timeOnSite, setTimeOnSite] = useState(0);
  const pageLoadTime = useRef(new Date());

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / document.documentElement.scrollHeight) * 100;
      setScrollDepth(Math.round(scrollPercent));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track mouse movements
  useEffect(() => {
    const handleMouseMove = () => {
      setMouseMovements(prev => prev + 1);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Track time on site
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOnSite(Math.round((new Date() - pageLoadTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const saveToJson = (clickData, prediction) => {
    // Convert to CSV format
    const csvRow = [
      new Date().toISOString(),
      clickData.device_type,
      clickData.browser,
      clickData.operating_system,
      clickData.ad_position,
      clickData.scroll_depth,
      clickData.mouse_movement,
      clickData.click_duration,
      prediction.is_fraud ? '1' : '0'
    ].join(',') + '\n';
  
    // Append to CSV file instead of downloading
    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvRow);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'fraud_data.csv';
    hiddenElement.click();
  };

  const [keystrokes, setKeystrokes] = useState(0);
  const clickStartTime = useRef(null);
  const [botLikelihood, setBotLikelihood] = useState(0);

  // Track keystrokes
  useEffect(() => {
    const handleKeyPress = () => {
      setKeystrokes(prev => prev + 1);
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Track click duration
  const handleMouseDown = () => {
    clickStartTime.current = performance.now();
  };

  const handleAdClick = async () => {
    setClicked(true);
    
    try {
      const isSpam = isSpamClick();
      const clickDuration = clickStartTime.current ? 
        performance.now() - clickStartTime.current : 0;

      // Calculate bot likelihood score (0-1) based on behavior
      const movementSpeed = mouseMovements / (timeOnSite || 1);
      const botScore = Math.min(1, 
        (isSpam ? 0.7 : 0) + 
        (movementSpeed < 2 ? 0.2 : 0) + 
        (keystrokes > 50 ? 0.1 : 0)
      );

      // Detect VPN/proxy (basic detection)
      const vpnUsage = navigator.connection?.type === 'vpn' ? 1 : 0;
      const proxyUsage = window.navigator?.webdriver ? 1 : 0;
      const click_frequency = clickHistory.current.length;

      const clickData = {
        timestamp: new Date().toISOString(),
        time_of_day: (() => {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 12) return 'morning';
            if (hour >= 12 && hour < 17) return 'afternoon';
            if (hour >= 17 && hour < 21) return 'evening';
            return 'night';
        })(),
        device_type: navigator.maxTouchPoints > 1 ? 'Mobile' : 'Desktop',
        browser: navigator.userAgentData.brands[0].brand,
        operating_system: navigator.platform,
        ad_position: orientation === 'horizontal' ? 'middle' : 'sidebar',
        device_ip_reputation: 'neutral',
        scroll_depth: scrollDepth,
        mouse_movement: mouseMovements,
        keystrokes_detected: keystrokes,
        click_duration: clickDuration,
        time_on_site: timeOnSite,  // Add this line
        click_frequency,
        bot_likelihood_score: botScore,
        VPN_usage: vpnUsage,
        proxy_usage: proxyUsage
      };

      const response = await axios.post('http://localhost:5000/demo-predict', clickData);
      console.log('Prediction response:', response.data);
      
      // Save to JSON file
      // Replace the saveToJson call in handleAdClick with:
      // In handleAdClick function, replace the axios.post call:
      const csvResponse = await axios.post('http://localhost:5000/append-csv', {
        ...clickData,
        is_fraud: response.data.is_fraud
      });
      
      // Update flagged status if backend detected fraud
      if (csvResponse.data.is_fraud) {
        setFlagged(true);
        toast.error('Rapid clicking detected! This appears to be fraud.');
      } else if (response.data.is_fraud) {
        setFlagged(true);
        toast.error('This click appears suspicious!');
      } else if (isSpam) {
        toast.warning('Too many clicks! Please slow down.');
      } else {
        toast.success('Redirecting to advertiser...');
      }
    } catch (error) {
      console.error('Error processing click:', error);
      toast.error('Error processing click data. Check console for details.');
    }
  };

  return (
    <div 
      className={`ad-container ${orientation}`} 
      onMouseDown={handleMouseDown}
      // Remove the onClick handler from the container
    >
      {/* Only the image container is clickable */}
      <div className="ad-component">
        <div 
          className={`ad-image-container ${clicked ? 'clicked' : ''}`}
          onClick={handleAdClick}
        >
          <img 
            src={adDetails.image} 
            alt={adDetails.title} 
            className="ad-image" 
            onError={(e) => {
              e.target.src = process.env.PUBLIC_URL + '/images/ads/default-ad.jpg';
              console.warn(`Failed to load image for ${adId}, using default`);
            }}
            // Remove any onClick handler if present on the image
          />
          {flagged && <div className="spam-warning">⚠️ Suspicious Activity Detected</div>}
        </div>
        
        <div className="ad-info">
          <h3 className="ad-title">{adDetails.title}</h3>
        </div>
      </div>
      
      <div className="ad-description-container">
        <p className="ad-description">{adDetails.description}</p>
      </div>
    </div>
  );
}

export default AdComponent;