import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import BookingForm from './components/BookingForm';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

const AppContent: React.FC = () => {
  const { isAdminLoggedIn, loading, error } = useApp();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const handleAdminAccess = () => {
    setShowAdminLogin(true);
  };

  const handleAdminLogin = () => {
    setShowAdminLogin(false);
  };

  const handleBackToBooking = () => {
    setShowAdminLogin(false);
  };

  // Show error state if there's a critical error
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (showAdminLogin && !isAdminLoggedIn) {
    return (
      <AdminLogin 
        onLogin={handleAdminLogin} 
        onBack={handleBackToBooking}
      />
    );
  }

  if (isAdminLoggedIn) {
    return <AdminDashboard />;
  }

  return (
    <div className="relative">
      <BookingForm />
      
      {/* Admin Access Button */}
      <button
        onClick={handleAdminAccess}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-sm z-40"
      >
        Admin Portal
      </button>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;