import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import './ModelTrainingResults.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const getMetricColor = (metric, alpha) => {
  const colors = {
    accuracy: `rgba(54, 162, 235, ${alpha})`,
    precision: `rgba(255, 99, 132, ${alpha})`,
    recall: `rgba(75, 192, 192, ${alpha})`,
    f1: `rgba(255, 206, 86, ${alpha})`,
    roc_auc: `rgba(153, 102, 255, ${alpha})`
  };
  return colors[metric] || `rgba(128, 128, 128, ${alpha})`;
};

const ModelTrainingResults = () => {
  const [trainingResults, setTrainingResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/model-scores')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
          throw new Error('No model data available');
        }
        setTrainingResults(data);
        // Set the first model as selected by default
        const models = Object.keys(data).filter(key => 
          data[key] && typeof data[key] === 'object'
        );
        if (models.length > 0) {
          setSelectedModel(models[0]);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading training results:', error);
        setError('Failed to load model training results. Please try again later.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-message">
          <h3>Loading Model Analysis</h3>
          <p>Fetching performance metrics and results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <h3>⚠️ Error Loading Results</h3>
        <p>{error}</p>
      </div>
    );
  }

  const models = Object.keys(trainingResults).filter(key => 
    trainingResults[key] && typeof trainingResults[key] === 'object'
  );

  if (models.length === 0) {
    return (
      <div className="error-message">
        <h3>⚠️ No Model Data</h3>
        <p>No valid model data is available for visualization.</p>
      </div>
    );
  }

  const metrics = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc'];

  const chartData = {
    labels: models.map(model => model.replace('_', ' ').toUpperCase()),
    datasets: metrics.map(metric => ({
      label: metric.toUpperCase(),
      data: models.map(model => {
        const value = trainingResults[model]?.[metric];
        return typeof value === 'number' ? value : 0;
      }),
      backgroundColor: getMetricColor(metric, 0.6),
      borderColor: getMetricColor(metric, 1),
      borderWidth: 1
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Model Performance Comparison',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            return `${context.dataset.label}: ${(value * 100).toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          callback: function(value) {
            return (value * 100) + '%';
          }
        }
      }
    }
  };

  const formatConfusionMatrix = (confusionMatrix) => {
    if (!confusionMatrix || !Array.isArray(confusionMatrix) || confusionMatrix.length !== 2) {
      return <p>Invalid confusion matrix data</p>;
    }
    
    const total = confusionMatrix[0][0] + confusionMatrix[0][1] + confusionMatrix[1][0] + confusionMatrix[1][1];
    
    return (
      <table className="confusion-matrix">
        <thead>
          <tr>
            <th></th>
            <th colSpan="2">Predicted Class</th>
          </tr>
          <tr>
            <th></th>
            <th>Predicted Legitimate (0)</th>
            <th>Predicted Fraud (1)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Actual Legitimate (0)</th>
            <td className="true-negative">
              <div className="cell-value">{confusionMatrix[0][0]}</div>
              <div className="cell-percent">{((confusionMatrix[0][0] / total) * 100).toFixed(1)}%</div>
            </td>
            <td className="false-positive">
              <div className="cell-value">{confusionMatrix[0][1]}</div>
              <div className="cell-percent">{((confusionMatrix[0][1] / total) * 100).toFixed(1)}%</div>
            </td>
          </tr>
          <tr>
            <th>Actual Fraud (1)</th>
            <td className="false-negative">
              <div className="cell-value">{confusionMatrix[1][0]}</div>
              <div className="cell-percent">{((confusionMatrix[1][0] / total) * 100).toFixed(1)}%</div>
            </td>
            <td className="true-positive">
              <div className="cell-value">{confusionMatrix[1][1]}</div>
              <div className="cell-percent">{((confusionMatrix[1][1] / total) * 100).toFixed(1)}%</div>
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  const formatClassificationReport = (report) => {
    if (!report || typeof report !== 'object') {
      return <p>Invalid classification report data</p>;
    }
    
    const classes = ['0', '1']; // Legitimate and Fraud
    const metrics = ['precision', 'recall', 'f1-score', 'support'];
    
    const getColorClass = (metric, value) => {
      if (metric !== 'support') {
        if (value >= 0.9) return 'metric-excellent';
        if (value >= 0.8) return 'metric-good';
        if (value >= 0.7) return 'metric-average';
        return 'metric-poor';
      }
      return '';
    };
    
    return (
      <table className="classification-report">
        <thead>
          <tr>
            <th>Class</th>
            <th>PRECISION</th>
            <th>RECALL</th>
            <th>F1 SCORE</th>
            <th>SUPPORT</th>
          </tr>
        </thead>
        <tbody>
          {classes.map(cls => (
            <tr key={cls}>
              <td>{cls === '0' ? 'Legitimate (0)' : 'Fraud (1)'}</td>
              <td className={getColorClass('precision', report[cls]?.precision)}>
                {report[cls]?.precision?.toFixed(4) || 'N/A'}
              </td>
              <td className={getColorClass('recall', report[cls]?.recall)}>
                {report[cls]?.recall?.toFixed(4) || 'N/A'}
              </td>
              <td className={getColorClass('f1-score', report[cls]?.['f1-score'])}>
                {report[cls]?.['f1-score']?.toFixed(4) || 'N/A'}
              </td>
              <td>
                {report[cls]?.support || 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderModelMetricGauges = (modelData) => {
    if (!modelData) return null;
    
    return (
      <div className="metric-gauges">
        {metrics.map(metric => {
          const value = modelData[metric];
          if (typeof value !== 'number') return null;
          
          const percentage = value * 100;
          const colorClass = 
            percentage >= 90 ? 'excellent' : 
            percentage >= 80 ? 'good' : 
            percentage >= 70 ? 'average' : 'poor';
          
          return (
            <div key={metric} className="gauge-container">
              <div className="gauge-label">{metric.replace('_', ' ').toUpperCase()}</div>
              <div className="gauge">
                <div className={`gauge-fill ${colorClass}`} style={{width: `${percentage}%`}}>
                  <span className="gauge-text">{percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="model-training-page">
      {/* Add Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>Model Training Results</h1>
          <p>Analyze and compare the performance of different fraud detection models</p>
        </div>
      </div>

      <div className="model-training-results">
        <div className="model-selection-tabs">
          {models.map(model => (
            <button 
              key={model}
              className={`model-tab ${selectedModel === model ? 'active' : ''}`}
              onClick={() => setSelectedModel(model)}
            >
              {model.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
        
        <div className="dashboard-container">
          <div className="main-chart-container">
            <div className="chart-container" style={{ height: '400px' }}>
              <Bar data={chartData} options={options} />
            </div>
          </div>
          
          {selectedModel && (
            <div className="selected-model-details">
              <div className="model-header">
                <h3>{selectedModel.replace('_', ' ').toUpperCase()}</h3>
                <div className="model-badge">
                  {models.indexOf(selectedModel) === 0 ? 'Best Performer' : `Rank ${models.indexOf(selectedModel) + 1}`}
                </div>
              </div>
              
              <div className="model-performance-overview">
                {renderModelMetricGauges(trainingResults[selectedModel])}
              </div>
              
              <div className="model-data-sections">
                <div className="data-section">
                  <div className="section-header">
                    <h4>🎯 Confusion Matrix</h4>
                    <div className="info-tooltip">
                      Hover for info
                      <span className="tooltip-text">
                        Shows how many instances were correctly and incorrectly classified.
                        Diagonal cells (top-left to bottom-right) represent correct predictions.
                      </span>
                    </div>
                  </div>
                  {formatConfusionMatrix(trainingResults[selectedModel].confusion_matrix)}
                </div>
                
                <div className="data-section">
                  <div className="section-header">
                    <h4>📋 Classification Report</h4>
                    <div className="info-tooltip">
                      Hover for info
                      <span className="tooltip-text">
                        Detailed metrics by class. 
                        Higher values (in green) indicate better performance.
                      </span>
                    </div>
                  </div>
                  {formatClassificationReport(trainingResults[selectedModel].classification_report)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelTrainingResults;