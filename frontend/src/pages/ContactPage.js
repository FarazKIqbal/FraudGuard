import React, { useState } from 'react';
import HeroSection from '../components/HeroSection';
import '../styles/ContactPage.css';

function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const handleChange = (e) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      console.log('Form submitted:', formState);
      setSubmitting(false);
      setSubmitted(true);
      
      // Reset form
      setFormState({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      
      // Reset submission status after showing success message
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    }, 1500);
  };
  
  return (
    <div className="container">
      <HeroSection 
        title="Contact Support" 
        subtitle="Our team is ready to assist with any inquiries"
      />
      
      <div className="contact-content">
        <div className="contact-methods">
          <div className="contact-card">
            <h3>📧 Email Support</h3>
            <p>For general inquiries:</p>
            <a href="mailto:support@fraudguard.com" className="contact-link">
              support@fraudguard.com
            </a>
          </div>

          <div className="contact-card">
            <h3>📞 Technical Support</h3>
            <p>24/7 emergency line:</p>
            <a href="tel:+1-800-555-1234" className="contact-link">
              +1 (800) 555-1234
            </a>
          </div>

          <div className="contact-card">
            <h3>📍 Headquarters</h3>
            <p>FraudGuard Technologies<br/>
            123 Cybersecurity Lane<br/>
            San Francisco, CA 94107</p>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          {submitted ? (
            <div className="success-message">
              <h3>Thank you for your message!</h3>
              <p>We have received your inquiry and will respond shortly.</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  value={formState.name}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  value={formState.email}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input 
                  type="text" 
                  id="subject" 
                  name="subject" 
                  value={formState.subject}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea 
                  id="message" 
                  name="message" 
                  rows="5" 
                  value={formState.message}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                className="submit-button"
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default ContactPage;