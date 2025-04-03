import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create the context
export const AuthContext = createContext();

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Log the token for debugging
      console.log('Token found in localStorage:', token.substring(0, 10) + '...');
      
      // Fetch user data when component mounts if token exists
      const fetchUserData = async () => {
        try {
          const response = await axios.get('http://localhost:5000/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          console.log('User data fetched:', response.data);
          setCurrentUser(response.data.user);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching user data:', error);
          localStorage.removeItem('token');
          setCurrentUser(null);
          setLoading(false);
        }
      };
      
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  // Login function
  // Update the login function with better error handling
  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', email);
      
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setCurrentUser(response.data.user);
        return { success: true };
      } else {
        console.error('No token in response:', response.data);
        return { 
          success: false, 
          message: 'Login failed. No token received.'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      
      return { 
        success: false, 
        message: error.response?.data?.error || 'Login failed. Please try again.'
      };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  // Update user info in context
  const updateUserInfo = (updatedUser) => {
    setCurrentUser(updatedUser);
  };
  
  // Add a new function to handle profile updates
  const updateProfile = async (userData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { 
          success: false, 
          message: 'Authentication required. Please log in again.' 
        };
      }
      
      console.log('Updating profile with data:', userData);
      
      const response = await axios.put(
        'http://localhost:5000/api/auth/user/profile',
        userData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('Profile update response:', response.data);
      
      if (response.data.user) {
        setCurrentUser(response.data.user);
        return { 
          success: true,
          message: 'Profile updated successfully'
        };
      } else {
        return { 
          success: false, 
          message: 'Failed to update profile. Please try again.' 
        };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      console.error('Error response:', error.response?.data);
      
      return { 
        success: false, 
        message: error.response?.data?.error || 'Failed to update profile. Please try again.'
      };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading, 
      login, 
      logout,
      updateUserInfo,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};