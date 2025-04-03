import React from 'react';
import HeroSection from '../components/HeroSection';
import '../styles/AboutPage.css';

function AboutPage() {
  return (
    <div className="container">
      <HeroSection 
        title="About FraudGuard" 
        subtitle="Real-time click fraud detection system protecting digital advertising ecosystems"
      />

      <div className="content-card mission-statement">
        <h2 className="card-heading">
          <span className="icon">🎯</span> Our Mission
        </h2>
        <p className="mission-text">
          Reduce ad fraud, optimize advertising spend, and improve the reliability of online advertising 
          through cutting-edge machine learning and real-time analytics.
        </p>
      </div>

      <div className="grid-layout">
        <div className="content-card">
          <h2 className="card-heading">
            <span className="icon">⚙️</span> Key Features
          </h2>
          <div className="feature-grid">
            <div className="feature-item">
              <h4>Data Collection</h4>
              <p>Aggregate clickstream data from multiple advertising platforms</p>
            </div>
            <div className="feature-item">
              <h4>ML Processing</h4>
              <p>XGBoost, Random Forest & Neural Network ensemble models</p>
            </div>
            <div className="feature-item">
              <h4>Real-Time Analysis</h4>
              <p>50ms response time for fraud detection</p>
            </div>
            <div className="feature-item">
              <h4>Interactive Dashboard</h4>
              <p>React-powered visualization of threat metrics</p>
            </div>
          </div>
        </div>

        <div className="content-card">
          <h2 className="card-heading">
            <span className="icon">🏗️</span> System Architecture
          </h2>
          <div className="architecture-grid">
            <div className="arch-layer">
              <h4>Frontend</h4>
              <ul>
                <li>React Dashboard</li>
                <li>Real-time Visualizations</li>
                <li>Interactive Analytics</li>
              </ul>
            </div>
            <div className="arch-layer">
              <h4>Backend</h4>
              <ul>
                <li>Flask API</li>
                <li>Data Processing</li>
                <li>Model Serving</li>
              </ul>
            </div>
            <div className="arch-layer">
              <h4>Database</h4>
              <ul>
                <li>Clickstream Storage</li>
                <li>Model Metadata</li>
                <li>Fraud Patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="content-card technical-roadmap">
        <h2 className="card-heading">
          <span className="icon">🚀</span> Deployment & Scaling
        </h2>
        <div className="roadmap-grid">
          <div className="roadmap-item">
            <h4>Cloud Infrastructure</h4>
            <p>Containerized deployment with Kubernetes for horizontal scaling</p>
          </div>
          <div className="roadmap-item">
            <h4>Performance Monitoring</h4>
            <p>Prometheus & Grafana dashboards for real-time system metrics</p>
          </div>
          <div className="roadmap-item">
            <h4>Continuous Learning</h4>
            <p>Automated model retraining pipeline with new data integration</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;