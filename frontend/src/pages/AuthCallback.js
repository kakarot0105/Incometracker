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
        console.log('Auth callback - hash:', hash);
        
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          console.error('No session_id found in hash');
          navigate('/login');
          return;
        }
        
        const sessionId = sessionIdMatch[1];
        console.log('Exchanging session_id for session_token...');
        
        // Exchange session_id for session_token
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );
        
        console.log('Session exchange successful, user:', response.data);
        const user = response.data;
        
        // Clear the hash from URL
        window.history.replaceState(null, '', '/');
        
        // Navigate to dashboard with user data
        navigate('/', { state: { user }, replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        console.error('Error details:', error.response?.data);
        alert(`Login failed: ${error.response?.data?.detail || error.message}`);
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
