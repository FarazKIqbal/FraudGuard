import React from 'react';

function HeroSection({ title, subtitle }) {
  return (
    <div className="hero-section">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">{title}</h1>
          <p className="hero-subtitle">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;