import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import Home from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import ModelPerformancePage from './components/ModelTrainingResults';
import ModelDemoPage from './pages/ModelDemoPage';
import About from './pages/AboutPage';
import Contact from './pages/ContactPage';
import BatchPredictionPage from './pages/BatchPredictionPage';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import UserProfilePage from './pages/UserProfilePage';
import Signup from './pages/Signup';
import LiveClicksPage from './pages/LiveClicksPage';

import './styles/GlobalStyles.css';

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
          limit={3}
          toastStyle={{
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            fontSize: '0.9rem'
          }}
        />
        <Navbar />
        <main className="main-content fade-in">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} /> {/* Add this line */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<UserProfilePage />} />
            </Route>
            <Route path="/training-results" element={<ModelPerformancePage />} />
            <Route path="/model-demo" element={<ModelDemoPage />} />
            <Route path="/live-clicks" element={<LiveClicksPage />} />
            <Route path="/batch-prediction" element={<BatchPredictionPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;