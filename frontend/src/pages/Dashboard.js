import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import HeroSection from '../components/HeroSection';
import '../styles/Dashboard.css';
import Navbar from '../components/Navbar';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = useContext(AuthContext);
  const currentUser = auth?.currentUser;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        
        const response = await axios.get('http://localhost:5000/dashboard-data', {
          headers: {
            Authorization: token ? `Bearer ${token}` : ''
          }
        });
        
        setDashboardData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Request failed with status code ' + 
                 (err.response ? err.response.status : 'unknown'));
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <HeroSection 
          title="Fraud Detection Dashboard" 
          subtitle="Real-time analytics and visualization of click fraud detection"
        />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <HeroSection 
          title="Fraud Detection Dashboard" 
          subtitle="Real-time analytics and visualization of click fraud detection"
        />
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Prepare data for device type chart
  const deviceData = {
    labels: Object.keys(dashboardData.fraud_by_device),
    datasets: [
      {
        label: 'Fraudulent Clicks',
        data: Object.values(dashboardData.fraud_by_device),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for time of day chart
  const hourLabels = Object.keys(dashboardData.fraud_by_hour);
  const hourData = Object.values(dashboardData.fraud_by_hour);

  const timeData = {
    labels: hourLabels,
    datasets: [
      {
        label: 'Fraudulent Clicks by Hour',
        data: hourData,
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4,
      },
    ],
  };

  // Prepare data for country chart
  const countryData = {
    labels: Object.keys(dashboardData.fraud_by_country),
    datasets: [
      {
        label: 'Fraudulent Clicks by Country',
        data: Object.values(dashboardData.fraud_by_country),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="dashboard-container">
      <HeroSection 
        title="Fraud Detection Dashboard" 
        subtitle="Real-time analytics and visualization of click fraud detection"
      />
      
      {currentUser && (
        <div className="welcome-message">
          Welcome back, {currentUser.name || currentUser.email}!
        </div>
      )}
      
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Clicks</h3>
          <p className="summary-value">{dashboardData.summary.total_clicks.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Fraudulent Clicks</h3>
          <p className="summary-value">{dashboardData.summary.fraud_clicks.toLocaleString()}</p>
        </div>
        <div className="summary-card">
          <h3>Fraud Rate</h3>
          <p className="summary-value">{dashboardData.summary.fraud_rate}%</p>
        </div>
        <div className="summary-card">
          <h3>Blocked Attempts</h3>
          <p className="summary-value">{dashboardData.summary.fraud_clicks.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="chart-grid">
        <div className="chart-card">
          <h3>Fraud by Device Type</h3>
          <div className="chart-container">
            <Pie data={deviceData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        
        <div className="chart-card">
          <h3>Fraud by Time of Day</h3>
          <div className="chart-container">
            <Line data={timeData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        
        <div className="chart-card">
          <h3>Fraud by Country</h3>
          <div className="chart-container">
            <Bar data={countryData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
      
      <div className="recent-fraud-container">
        <h3>Recent Fraud Attempts</h3>
        <div className="table-container">
          <table className="recent-fraud-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Ad ID</th>
                <th>IP Address</th>
                <th>Device</th>
                <th>Browser</th>
                <th>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.recent_fraud && dashboardData.recent_fraud.length > 0 ? (
                dashboardData.recent_fraud.map((item) => (
                  <tr key={item.id || `fraud-${item.timestamp}`}>
                    <td>{item.timestamp}</td>
                    <td>{item.id || 'N/A'}</td>
                    <td>{item.ip_address}</td>
                    <td>{item.device_type}</td>
                    <td>{item.browser}</td>
                    <td>
                      <div className="risk-score-wrapper">
                        <div 
                          className="risk-score-bar" 
                          style={{ width: `${item.risk_score * 100}%` }}
                          data-level={item.risk_score > 0.8 ? 'high' : item.risk_score > 0.5 ? 'medium' : 'low'}
                        ></div>
                      </div>
                      <span className="risk-score-text">{(item.risk_score * 100).toFixed(0)}%</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-data-message">No recent fraud attempts detected</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;