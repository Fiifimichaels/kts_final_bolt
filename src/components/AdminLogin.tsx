import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface AdminLoginProps {
  onLogin: () => void;
  onBack?: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const { login } = useApp();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await login(credentials.email, credentials.password);
      if (success) {
        onLogin();
      } else {
        setError('Invalid credentials or you are not authorized as an admin. Please ensure your email is registered in the admin system.');
      }
    } catch (err) {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={handleBack}
            disabled={loading}
            className="absolute top-6 left-6 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
            title="Back to booking"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Booking</span>
          </button>
        )}

        <div className="text-center mb-8 mt-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-gray-600 mt-2">Sign in to manage bus bookings</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Login Failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your admin email"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use the email registered in the admins table
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-medium text-amber-800 mb-1">Password Requirements:</p>
              <ul className="text-xs text-amber-700 space-y-0.5">
                <li>• At least one lowercase letter (a-z)</li>
                <li>• At least one uppercase letter (A-Z)</li>
                <li>• At least one number (0-9)</li>
                <li>• At least one special character (!@#$%^&*()_+-=[]{}etc.)</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              If this is your first login, an account will be created automatically
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || !credentials.email || !credentials.password}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {onBack && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Booking
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Admin Access</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Your email must be registered in the admins table</li>
            <li>• First-time login will create your authentication account</li>
            <li>• Contact system administrator if you need access</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;