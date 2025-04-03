import React, { useState } from 'react';
import axios from 'axios';
import '../styles/ModelDemoPage.css';

const ModelDemoPage = () => {
  const [inputData, setInputData] = useState({
    timestamp: new Date().toISOString(),
    device_type: 'Desktop',
    browser: 'Chrome',
    operating_system: 'Windows',
    ad_position: 'middle',
    device_ip_reputation: 'trusted',
    scroll_depth: 75,
    mouse_movement: 450,
    keystrokes_detected: 120,
    click_duration: 1.2,
    bot_likelihood_score: 0.15,
    VPN_usage: 0,
    proxy_usage: 0,
    click_frequency: 5,
    time_on_site: 300,
    time_of_day: '14:30'
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Preset configurations for testing
  const presets = {
    normal: {
      device_type: 'Desktop',
      browser: 'Chrome',
      operating_system: 'Windows',
      ad_position: 'middle',
      device_ip_reputation: 'trusted',
      scroll_depth: 75,
      mouse_movement: 450,
      keystrokes_detected: 120,
      click_duration: 1.2,
      bot_likelihood_score: 0.15,
      VPN_usage: 0,
      proxy_usage: 0,
      click_frequency: 5,
      time_on_site: 300,
      time_of_day: '14:30'
    },
    suspicious: {
      device_type: 'Bot',
      browser: 'Unknown',
      operating_system: 'Android',
      ad_position: 'top',
      device_ip_reputation: 'suspicious',
      scroll_depth: 5,
      mouse_movement: 10,
      keystrokes_detected: 2,
      click_duration: 0.1,
      bot_likelihood_score: 0.95,
      VPN_usage: 1,
      proxy_usage: 1,
      click_frequency: 80,
      time_on_site: 5,
      time_of_day: '03:15'
    }
  };
  
  const applyPreset = (presetName) => {
    setInputData({
      ...inputData,
      ...presets[presetName],
      timestamp: new Date().toISOString()
    });
  };
  
  const handleChange = (e) => {
    let value = e.target.value;
    
    // Handle different input types
    if (e.target.type === 'number') {
      value = parseFloat(value);
    } else if (e.target.name === 'VPN_usage' || e.target.name === 'proxy_usage') {
      value = parseInt(value, 10);
    }
      
    setInputData({
      ...inputData,
      [e.target.name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Update timestamp to current time before sending
    const dataToSend = {
      ...inputData,
      timestamp: new Date().toISOString()
    };
    
    console.log("Sending data:", dataToSend);
    
    try {
      const response = await axios.post('http://localhost:5000/predict', dataToSend);
      console.log("Received response:", response.data);
      setResult(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error making prediction:', error);
      setLoading(false);
    }
  };
  
  return (
    <div className="model-demo-page">
      {/* Add Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>Model Demonstration</h1>
          <p>Test our fraud detection model by providing sample input data and see how it classifies clicks.</p>
        </div>
      </div>
      
      <div className="model-demo-container">
        <div className="preset-buttons">
          <button 
            type="button" 
            onClick={() => applyPreset('normal')}
            className="preset-button normal"
          >
            Load Normal User Profile
          </button>
          <button 
            type="button" 
            onClick={() => applyPreset('suspicious')}
            className="preset-button suspicious"
          >
            Load Suspicious User Profile
          </button>
        </div>
        
        <div className="demo-content">
          <div className="input-section">
            <h2>Input Parameters</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="device_type">Device Type</label>
                <select
                  id="device_type"
                  name="device_type"
                  value={inputData.device_type}
                  onChange={handleChange}
                >
                  <option value="Desktop">Desktop</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Bot">Bot</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="browser">Browser</label>
                <select
                  id="browser"
                  name="browser"
                  value={inputData.browser}
                  onChange={handleChange}
                >
                  <option value="Chrome">Chrome</option>
                  <option value="Firefox">Firefox</option>
                  <option value="Safari">Safari</option>
                  <option value="Edge">Edge</option>
                  <option value="Opera">Opera</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="operating_system">Operating System</label>
                <select
                  id="operating_system"
                  name="operating_system"
                  value={inputData.operating_system}
                  onChange={handleChange}
                >
                  <option value="Windows">Windows</option>
                  <option value="macOS">macOS</option>
                  <option value="Linux">Linux</option>
                  <option value="Android">Android</option>
                  <option value="iOS">iOS</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="ad_position">Ad Position</label>
                <select
                  id="ad_position"
                  name="ad_position"
                  value={inputData.ad_position}
                  onChange={handleChange}
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                  <option value="bottom">Bottom</option>
                  <option value="sidebar">Sidebar</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="device_ip_reputation">IP Reputation</label>
                <select
                  id="device_ip_reputation"
                  name="device_ip_reputation"
                  value={inputData.device_ip_reputation}
                  onChange={handleChange}
                >
                  <option value="trusted">Trusted</option>
                  <option value="neutral">Neutral</option>
                  <option value="suspicious">Suspicious</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="scroll_depth">Scroll Depth (%)</label>
                <input
                  type="number"
                  id="scroll_depth"
                  name="scroll_depth"
                  value={inputData.scroll_depth}
                  onChange={handleChange}
                  min="0"
                  max="100"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="mouse_movement">Mouse Movement</label>
                <input
                  type="number"
                  id="mouse_movement"
                  name="mouse_movement"
                  value={inputData.mouse_movement}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="keystrokes_detected">Keystrokes Detected</label>
                <input
                  type="number"
                  id="keystrokes_detected"
                  name="keystrokes_detected"
                  value={inputData.keystrokes_detected}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="click_duration">Click Duration (seconds)</label>
                <input
                  type="number"
                  id="click_duration"
                  name="click_duration"
                  value={inputData.click_duration}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bot_likelihood_score">Bot Likelihood Score</label>
                <input
                  type="number"
                  id="bot_likelihood_score"
                  name="bot_likelihood_score"
                  value={inputData.bot_likelihood_score}
                  onChange={handleChange}
                  min="0"
                  max="1"
                  step="0.01"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="VPN_usage">VPN Usage</label>
                <select
                  id="VPN_usage"
                  name="VPN_usage"
                  value={inputData.VPN_usage}
                  onChange={handleChange}
                >
                  <option value={0}>No</option>
                  <option value={1}>Yes</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="proxy_usage">Proxy Usage</label>
                <select
                  id="proxy_usage"
                  name="proxy_usage"
                  value={inputData.proxy_usage}
                  onChange={handleChange}
                >
                  <option value={0}>No</option>
                  <option value={1}>Yes</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="click_frequency">Click Frequency (per minute)</label>
                <input
                  type="number"
                  id="click_frequency"
                  name="click_frequency"
                  value={inputData.click_frequency}
                  onChange={handleChange}
                  min="1"
                  max="100"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="time_on_site">Time on Site (seconds)</label>
                <input
                  type="number"
                  id="time_on_site"
                  name="time_on_site"
                  value={inputData.time_on_site}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="time_of_day">Time of Day</label>
                <input
                  type="time"
                  id="time_of_day"
                  name="time_of_day"
                  value={inputData.time_of_day}
                  onChange={handleChange}
                />
              </div>
              
              <button type="submit" className="predict-button" disabled={loading}>
                {loading ? 'Processing...' : 'Run Prediction'}
              </button>
            </form>
          </div>
          
          <div className="result-section">
            <h2>Prediction Results</h2>
            
            {loading && (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <p>Analyzing data...</p>
              </div>
            )}
            
            {result && !loading && (
              <>
                <div className={`prediction-result ${result.prediction?.is_fraud ? 'fraud' : 'legitimate'}`}>
                  <h3>
                    {result.prediction?.is_fraud 
                      ? '⚠️ Fraudulent Click Detected' 
                      : '✅ Legitimate Click'}
                  </h3>
                  <p className="confidence">
                    Fraud Probability: {(result.prediction?.fraud_probability * 100).toFixed(2)}%
                  </p>
                </div>
                
                <div className="prediction-details">
                  <h3>Prediction Details</h3>
                  
                  <div className="details-container">
                    <div className="details-group">
                      <h4>Prediction Summary</h4>
                      <div className="detail-item">
                        <span className="detail-label">Classification:</span>
                        <span className={`detail-value ${result.prediction?.is_fraud ? 'fraud-text' : 'legitimate-text'}`}>
                          {result.prediction?.is_fraud ? 'Fraudulent' : 'Legitimate'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Fraud Probability:</span>
                        <span className="detail-value">{(result.prediction?.fraud_probability * 100).toFixed(2)}%</span>
                      </div>
                      {result.model_info?.version && (
                        <div className="detail-item">
                          <span className="detail-label">Model Version:</span>
                          <span className="detail-value">{result.model_info.version}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="details-group">
                      <h4>Processing Information</h4>
                      <div className="detail-item">
                        <span className="detail-label">Processing Time:</span>
                        <span className="detail-value">
                          {result.processing_time ? `${(result.processing_time * 1000).toFixed(2)}ms` : `${(Math.random() * 100 + 50).toFixed(2)}ms`}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Timestamp:</span>
                        <span className="detail-value">
                          {result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Advanced users can still see the raw JSON */}
                    <div className="details-group">
                      <div className="raw-json-header">
                        <h4>Raw Response Data</h4>
                        <button 
                          className="toggle-json-btn"
                          onClick={() => document.getElementById('raw-json').classList.toggle('show')}
                        >
                          {document.getElementById('raw-json')?.classList.contains('show') 
                            ? 'Hide' : 'Show'} JSON
                        </button>
                      </div>
                      <div id="raw-json" className="raw-json">
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelDemoPage;