import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '@/components/LoadingSpinner';

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
      <div className="min-h-screen px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
          <div className="app-panel-solid w-full max-w-xl rounded-[34px] p-10 text-center">
            <div className="page-eyebrow">Secure Access</div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
              Checking authentication
            </h1>
            <p className="mt-3 text-base leading-7 text-[#5a6d61]" data-testid="checking-auth-text">
              Opening your workspace and confirming your session now.
            </p>
            <LoadingSpinner />
          </div>
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
