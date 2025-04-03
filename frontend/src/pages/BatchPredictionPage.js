import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import HeroSection from '../components/HeroSection';
import '../styles/BatchPredictionPage.css';

const BatchPredictionPage = () => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  // Remove model selection state
  const [downloading, setDownloading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast.error('Please upload a CSV file');
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        toast.error('Please upload a CSV file');
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const removeFile = () => {
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.warning('Please upload a CSV file first');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    
    // Use ensemble model by default without giving user a choice
    formData.append('model', 'ensemble');
    formData.append('threshold', 0.5);

    try {
      const response = await axios.post('http://localhost:5000/batch-predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResults(response.data);
      toast.success('Batch prediction completed successfully');
    } catch (error) {
      console.error('Error processing batch prediction:', error);
      toast.error(error.response?.data?.message || 'Error processing batch prediction');
    } finally {
      setIsProcessing(false);
    }
  };

  const getRiskLevel = (probability) => {
    if (probability >= 0.7) return 'high-risk';
    if (probability >= 0.4) return 'medium-risk';
    return 'low-risk';
  };

  const getRiskText = (probability) => {
    if (probability >= 0.7) return 'High Risk';
    if (probability >= 0.4) return 'Medium Risk';
    return 'Low Risk';
  };

  const downloadResults = () => {
    if (!results) return;
    
    try {
      // Check if backend provided direct CSV data
      if (results.csv_data) {
        // Use the CSV directly from the backend
        const blob = new Blob([results.csv_data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'fraud_predictions.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.info('Results downloaded successfully');
      } else {
        // Fall back to client-side CSV generation if backend doesn't provide direct CSV
        const csvContent = [
          // CSV header
          ['id', 'prediction', 'fraud_probability', 'risk_level'].join(','),
          // CSV rows
          ...(results.predictions || []).map(p => 
            [
              p.id || 'unknown', 
              (p.prediction === 1 ? 'Fraud' : 'Legitimate'), 
              (p.fraud_probability !== undefined ? p.fraud_probability.toFixed(4) : '0.0000'),
              getRiskText(p.fraud_probability || 0)
            ].join(',')
          )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'fraud_predictions.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.info('Results downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading results:', error);
      toast.error('Failed to download results');
    }
  };

  // Sample CSV data
  const sampleCsvData = `click_id,timestamp,device_type,browser,operating_system,click_duration,scroll_depth,mouse_movement,ad_position,VPN_usage
sdv-id-DSFRJc,2024-05-18 14:48:50,Desktop,Edge,macOS,1.26,58,498.0,Side,0
sdv-id-fcHBqL,2024-04-06 08:07:25,Tablet,Chrome,macOS,0.41,35,280.0,Top,0
d7a9b578-ac46-4505-aca9-736f007d0960,2024-03-11 16:46:39,Tablet,Opera,macOS,0.41,87,459.0,Bottom,0
83c9b2a1-d7e4-4f3c-b89a-5e8d63f12d45,2024-02-15 09:23:11,Mobile,Safari,iOS,0.82,42,315.0,Middle,1
9f4c8e2d-1b5a-4d6c-8e9f-7a3b5c9d1e2f,2024-01-22 17:35:28,Desktop,Firefox,Windows,1.54,75,622.0,Top,0`;

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'sample_data.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Consolidated renderSummary function
  const renderSummary = () => {
    if (!results) return null;
    
    // Get the first available model from the predictions object
    const availableModels = Object.keys(results.predictions || {});
    
    // If no models are available, show a message
    if (availableModels.length === 0) {
      return (
        <div className="no-results">
          <p>No prediction models available.</p>
        </div>
      );
    }
    
    // Use the first available model that doesn't have an error
    const defaultModel = availableModels.find(model => 
      results.predictions[model] && !results.predictions[model].error
    ) || availableModels[0];
    
    return (
      <div className="summary-container">
        {results.predictions[defaultModel] && !results.predictions[defaultModel].error ? (
          <div className="summary-content">
            <div className="summary-cards">
              <div className="summary-card">
                <h4>Total Records</h4>
                <div className="card-value">{results.total_records}</div>
              </div>
              <div className="summary-card">
                <h4>Fraud Detected</h4>
                <div className="card-value">{results.predictions[defaultModel].fraud_count}</div>
              </div>
              <div className="summary-card">
                <h4>Fraud Percentage</h4>
                <div className="card-value">{results.predictions[defaultModel].fraud_percentage}%</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="error-message">
            <p>Error with prediction: {results.predictions[defaultModel]?.error || 'Unknown error'}</p>
          </div>
        )}
      </div>
    );
  };

  // Modify renderDetailedResults to not use selectedModel
  const renderDetailedResults = () => {
    if (!results || !results.data) return null;
    
    // Get the first available model from the predictions object
    const availableModels = Object.keys(results.predictions || {});
    const defaultModel = availableModels.find(model => 
      results.predictions[model] && !results.predictions[model].error
    ) || availableModels[0];
    
    const modelData = results.predictions[defaultModel];
    if (!modelData || modelData.error) return null;
    
    return (
      <div className="detailed-results">
        <h3>Detailed Results</h3>
        <div className="download-section">
          <button 
            className="download-button"
            onClick={handleDownloadCSV}
            disabled={downloading || !results?.csv_data}
          >
            {downloading ? 'Downloading...' : 'Download Results CSV'}
          </button>
        </div>
        <div className="table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>Row #</th>
                {results.data[0] && Object.keys(results.data[0]).slice(0, 6).map(key => (
                  <th key={key}>{key}</th>
                ))}
                <th>Prediction</th>
              </tr>
            </thead>
            <tbody>
              {results.data.map((row, index) => (
                <tr 
                  key={index}
                  className={modelData.is_fraud[index] ? 'fraudulent' : 'legitimate'}
                >
                  <td>{index + 1}</td>
                  {Object.entries(row).slice(0, 6).map(([key, value]) => (
                    <td key={key}>{value !== null ? value.toString() : 'N/A'}</td>
                  ))}
                  <td className="prediction-cell">
                    {modelData.is_fraud[index] ? 
                      <span className="fraud-badge">Fraud</span> : 
                      <span className="legitimate-badge">Legitimate</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Add a handleDownloadCSV function
  const handleDownloadCSV = () => {
    if (!results || !results.csv_data) {
      toast.error('No CSV data available for download');
      return;
    }
    
    setDownloading(true);
    
    try {
      const blob = new Blob([results.csv_data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `fraud_predictions_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Results downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download results');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="container">
      <HeroSection 
        title="Batch Prediction" 
        subtitle="Upload CSV files to get fraud predictions for multiple records at once"
        backgroundClass="analytics-bg"
      />
      
      <div className="batch-prediction-sections">
        <div className="upload-section">
          <h2 className="section-title">
            <span>📤</span> Upload Data
          </h2>
          
          <p className="upload-instructions">
            Upload a CSV file containing click data to analyze for potential fraud. 
            Our model will process each row and provide fraud predictions.
          </p>
          
          <div className="csv-format-section">
            <h3 className="format-title">Required CSV Format</h3>
            <p className="format-description">
              Your CSV file must include these columns for accurate fraud prediction:
            </p>
            
            <div className="columns-grid">
              <div className="column-item">
                <span className="column-name">click_id</span>
                <span className="column-desc">Unique identifier for the click event</span>
              </div>
              <div className="column-item">
                <span className="column-name">timestamp</span>
                <span className="column-desc">Date and time of the click (YYYY-MM-DD HH:MM:SS)</span>
              </div>
              <div className="column-item">
                <span className="column-name">device_type</span>
                <span className="column-desc">Device category (Desktop, Mobile, Tablet)</span>
              </div>
              <div className="column-item">
                <span className="column-name">browser</span>
                <span className="column-desc">Browser used (Chrome, Firefox, Safari, etc.)</span>
              </div>
              <div className="column-item">
                <span className="column-name">operating_system</span>
                <span className="column-desc">OS of the device (Windows, macOS, iOS, etc.)</span>
              </div>
              <div className="column-item">
                <span className="column-name">click_duration</span>
                <span className="column-desc">Duration of the click in seconds</span>
              </div>
              <div className="column-item">
                <span className="column-name">scroll_depth</span>
                <span className="column-desc">Percentage of page scrolled (0-100)</span>
              </div>
              <div className="column-item">
                <span className="column-name">mouse_movement</span>
                <span className="column-desc">Pixel distance of mouse movement</span>
              </div>
              <div className="column-item">
                <span className="column-name">ad_position</span>
                <span className="column-desc">Position of ad (Top, Middle, Bottom, Side)</span>
              </div>
              <div className="column-item">
                <span className="column-name">VPN_usage</span>
                <span className="column-desc">VPN detected (0=No, 1=Yes)</span>
              </div>
            </div>
            
            <div className="sample-download">
              <button className="sample-button" onClick={downloadSampleCsv}>
                Download Sample CSV
              </button>
              <span className="sample-hint">
                Use this sample file as a template for your data
              </span>
            </div>
          </div>
          
          <div 
            className={`upload-area ${dragActive ? 'dragging' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <div className="upload-icon">📄</div>
            <h3 className="upload-text">Drag & Drop your CSV file here</h3>
            <p className="upload-hint">or click to browse your files</p>
            <input 
              type="file" 
              id="file-input" 
              className="file-input" 
              accept=".csv" 
              onChange={handleFileChange} 
            />
          </div>
          
          {file && (
            <div className="selected-file">
              <div className="file-icon">📊</div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
              <button className="remove-file" onClick={removeFile}>×</button>
            </div>
          )}
          
          <button 
            className="process-button"
            onClick={handleSubmit}
            disabled={!file || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Process Data'}
          </button>
        </div>
        
        {isProcessing && (
          <div className="results-section">
            <div className="processing-indicator">
              <div className="processing-spinner"></div>
              <p className="processing-message">Processing your data, this may take a moment...</p>
            </div>
          </div>
        )}
        
        {results && !isProcessing && (
          <div className="results-section">
            <h2 className="section-title">
              <span>📊</span> Prediction Results
            </h2>
            
            <div className="results-stats">
              <div className="stat-card">
                <div className="stat-label">Total Records</div>
                <div className="stat-value">{results.total_records || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Flagged as Fraud</div>
                <div className="stat-value">{results.fraud_count || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Fraud Percentage</div>
                <div className="stat-value">{results.fraud_percentage ? results.fraud_percentage.toFixed(1) : '0.0'}%</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Processing Time</div>
                <div className="stat-value">{results.processing_time ? results.processing_time.toFixed(2) : '0.00'}s</div>
              </div>
            </div>
            
            {/* Conditionally render summary or detailed results based on result structure */}
            {results.predictions && typeof results.predictions === 'object' && !Array.isArray(results.predictions) ? (
              renderSummary()
            ) : (
              <>
                <div className="results-table-wrapper">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Prediction</th>
                        <th>Fraud Probability</th>
                        <th>Risk Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(results.predictions || []).slice(0, 100).map((pred, index) => (
                        <tr key={index}>
                          <td>{pred.id || 'unknown'}</td>
                          <td>{pred.prediction === 1 ? 'Fraud' : 'Legitimate'}</td>
                          <td>{(pred.fraud_probability !== undefined ? (pred.fraud_probability * 100).toFixed(2) : '0.00')}%</td>
                          <td className={getRiskLevel(pred.fraud_probability || 0)}>
                            {getRiskText(pred.fraud_probability || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {results.predictions && results.predictions.length > 100 && (
                  <p className="results-note">
                    Showing 100 of {results.predictions.length} records. Download the full results for complete data.
                  </p>
                )}
                
                <button className="download-button" onClick={downloadResults}>
                  <span className="download-icon">📥</span> Download Full Results CSV
                </button>
              </>
            )}
            
            {/* Render detailed results if appropriate data structure exists */}
            {results.data && renderDetailedResults()}
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchPredictionPage;