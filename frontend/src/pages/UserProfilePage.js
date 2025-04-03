import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import HeroSection from '../components/HeroSection';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../styles/UserProfilePage.css';

function UserProfilePage() {
  const { currentUser, updateUserInfo } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: '',
    role: '',
    created_at: '',
    last_login: ''
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('No authentication token found');
          setError('Authentication required');
          setLoading(false);
          return;
        }
        
        console.log('Fetching user profile with token:', token.substring(0, 10) + '...');
        
        // Try the direct API endpoint
        const response = await axios.get('http://localhost:5000/api/auth/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('Profile API response:', response.data);
        
        if (response.data && response.data.user) {
          setUserDetails({
            name: response.data.user.name || '',
            email: response.data.user.email || '',
            role: response.data.user.role || 'user',
            created_at: response.data.user.created_at || '',
            last_login: response.data.user.last_login || ''
          });
        } else if (currentUser) {
          // Fallback to context data
          console.log('Using currentUser from context:', currentUser);
          setUserDetails({
            name: currentUser.name || '',
            email: currentUser.email || '',
            role: currentUser.role || 'user',
            created_at: currentUser.created_at || '',
            last_login: currentUser.last_login || ''
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        
        // Still try to use currentUser as fallback
        if (currentUser) {
          console.log('Using currentUser as fallback after error');
          setUserDetails({
            name: currentUser.name || '',
            email: currentUser.email || '',
            role: currentUser.role || 'user',
            created_at: currentUser.created_at || '',
            last_login: currentUser.last_login || ''
          });
        } else {
          setError('Failed to load user profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserDetails({
      ...userDetails,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use the updateUserInfo function from context
      const success = await updateUserInfo({
        name: userDetails.name
      });

      if (success) {
        toast.success('Profile updated successfully!');
        setEditing(false);
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (!currentUser) {
    return (
      <div className="container">
        <HeroSection 
          title="User Profile" 
          subtitle="View and manage your account details"
        />
        <div className="profile-container">
          <p className="not-logged-in">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <HeroSection 
        title="User Profile" 
        subtitle="View and manage your account details"
      />
      
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar-container">
              <div className="avatar">
                {userDetails.name && userDetails.name.length > 0 
                  ? userDetails.name[0].toUpperCase() 
                  : userDetails.email && userDetails.email.length > 0 
                    ? userDetails.email[0].toUpperCase() 
                    : '?'}
              </div>
            </div>
            <h2>{userDetails.name || userDetails.email || 'User'}</h2>
            <span className="role-badge">{userDetails.role || 'user'}</span>
          </div>
          
          <div className="profile-content">
            {editing ? (
              <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={userDetails.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={userDetails.email}
                    disabled
                    className="disabled-input"
                  />
                  <small>Email cannot be changed</small>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={() => {
                      setEditing(false);
                      // Reset to original values
                      if (currentUser) {
                        setUserDetails({
                          name: currentUser.name || '',
                          email: currentUser.email || '',
                          role: currentUser.role || '',
                          created_at: currentUser.created_at || '',
                          last_login: currentUser.last_login || ''
                        });
                      }
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="save-button"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-details">
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{userDetails.email || 'No email provided'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{userDetails.name || 'Not set'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Role:</span>
                  <span className="detail-value">{userDetails.role || 'user'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Account Created:</span>
                  <span className="detail-value">{formatDate(userDetails.created_at)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Last Login:</span>
                  <span className="detail-value">{formatDate(userDetails.last_login)}</span>
                </div>
                
                <button 
                  className="edit-button"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfilePage;