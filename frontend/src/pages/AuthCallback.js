import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const storedState = sessionStorage.getItem('oauth_state');

        if (!code) {
          console.error('No authorization code found');
          navigate('/login');
          return;
        }

        // CSRF protection
        if (state !== storedState) {
          console.error('Invalid OAuth state');
          alert('Invalid login attempt. Please try again.');
          navigate('/login');
          return;
        }

        // Exchange code for session
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/google`,
          { code, redirect_uri: window.location.origin + '/auth/callback' },
          { withCredentials: true }
        );

        const user = response.data;

        // Clear URL params
        window.history.replaceState(null, '', '/');
        sessionStorage.removeItem('oauth_state');

        navigate('/', { state: { user }, replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        alert(`Login failed: ${error.response?.data?.detail || error.message}`);
        navigate('/login');
      }
    };

    processAuth();
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
