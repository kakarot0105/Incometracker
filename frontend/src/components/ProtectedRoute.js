import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    location.state?.user ? true : null
  );
  const [user, setUser] = useState(location.state?.user || null);
  
  useEffect(() => {
    // If user data passed from AuthCallback, skip auth check
    if (location.state?.user) {
      return;
    }
    
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          withCredentials: true
        });
        
        if (response.status === 200) {
          setUser(response.data);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, [location.state]);
  
  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#344E41] mx-auto mb-4"></div>
          <p className="text-[#5C6B61]" data-testid="checking-auth-text">Checking authentication...</p>
        </div>
      </div>
    );
  }
  
  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Authenticated - pass user to children via context or props
  return children;
}
