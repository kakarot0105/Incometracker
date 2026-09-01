import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

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
          toast.error('Invalid login attempt. Please try again.');
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

        const postLoginRedirect = sessionStorage.getItem('post_login_redirect');
        sessionStorage.removeItem('post_login_redirect');
        window.history.replaceState(null, '', '/');
        sessionStorage.removeItem('oauth_state');

        if (postLoginRedirect) {
          window.location.assign(postLoginRedirect);
          return;
        }

        navigate('/', { state: { user }, replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error(`Login failed: ${error.response?.data?.detail || error.message}`);
        navigate('/login');
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center">
        <div className="app-panel-solid w-full max-w-xl rounded-[34px] p-10 text-center">
          <div className="page-eyebrow mx-auto">Secure Access</div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
            Completing sign in
          </h1>
          <p className="mt-3 text-base leading-7 text-[#5a6d61]" data-testid="auth-loading-text">
            Finalizing your Google session and opening the workspace now.
          </p>
          <LoadingSpinner />
        </div>
      </div>
    </div>
  );
}
