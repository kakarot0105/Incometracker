import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  
  useEffect(() => {
    // CRITICAL: Use useRef to prevent race conditions under StrictMode
    // Set synchronously at the start
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          navigate('/login');
          return;
        }
        
        const sessionId = sessionIdMatch[1];
        
        // Exchange session_id for session_token
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );
        
        const user = response.data;
        
        // Navigate to dashboard with user data
        navigate('/', { state: { user }, replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };
    
    processSession();
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#344E41] mx-auto mb-4"></div>
        <p className="text-[#5C6B61]" data-testid="auth-loading-text">Completing sign in...</p>
      </div>
    </div>
  );
}
