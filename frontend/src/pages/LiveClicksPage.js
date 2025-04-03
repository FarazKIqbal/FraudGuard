import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/LiveClicksPage.css';

const LiveClicksPage = () => {
  const [liveClicks, setLiveClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLiveClicks = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/live-clicks');
      setLiveClicks(response.data);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch live clicks data');
      setLoading(false);
      console.error('Error fetching live clicks:', err);
    }
  };

  useEffect(() => {
    fetchLiveClicks();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchLiveClicks();
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="live-clicks-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Live Clicks Monitor</h1>
          <p>Real-time monitoring of click events and fraud detection results</p>
        </div>
      </div>

      <div className="live-clicks-container">
        <div className="controls-section">
          <button onClick={fetchLiveClicks} className="refresh-button">
            Refresh Data
          </button>
          {lastUpdated && (
            <div className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-message">
              <h3>Loading live clicks data...</h3>
              <p>Please wait while we fetch the latest information</p>
            </div>
          </div>
        ) : error ? (
          <div className="error-container">
            <h3>Error Loading Data</h3>
            <p>{error}</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Device Type</th>
                  <th>Browser</th>
                  <th>OS</th>
                  <th>Ad Position</th>
                  <th>Scroll Depth</th>
                  <th>Mouse Movement</th>
                  <th>Click Duration</th>
                  <th>Fraud Status</th>
                </tr>
              </thead>
              <tbody>
                {liveClicks.map((click, index) => (
                  <tr key={index} className={click.is_fraud === 1 ? 'fraud-row' : 'legitimate-row'}>
                    <td>{new Date(click.timestamp).toLocaleString()}</td>
                    <td>{click.device_type}</td>
                    <td>{click.browser}</td>
                    <td>{click.os}</td>
                    <td>{click.ad_position}</td>
                    <td>{click.scroll_depth}</td>
                    <td>{click.mouse_movement}</td>
                    <td>{click.click_duration.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${click.is_fraud === 1 ? 'fraud' : 'legitimate'}`}>
                        {click.is_fraud === 1 ? 'Fraud' : 'Legitimate'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClicksPage;