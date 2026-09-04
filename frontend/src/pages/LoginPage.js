import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) { toast.error('Google Client ID is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID.'); return; }
    const next = new URLSearchParams(window.location.search).get('next');
    if (next?.startsWith('/api/oauth/authorize?')) sessionStorage.setItem('post_login_redirect', next); else sessionStorage.removeItem('post_login_redirect');
    const state = Math.random().toString(36).substring(7); sessionStorage.setItem('oauth_state', state);
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}&response_type=code&scope=${encodeURIComponent('email profile')}&state=${state}&access_type=offline&prompt=consent`;
  };
  return <main className="minimal-3d" data-testid="login-page">
    <header className="minimal-brand"><i>₹</i>Track<span>My</span>Bucks</header>
    <div className="object-stage" aria-hidden="true"><div className="stage-halo" /><div className="stage-ring ring-back" /><div className="stage-ring ring-front" /><div className="money-object"><span>₹</span><i /><b /></div><div className="stage-shadow" /></div>
    <section className="minimal-message"><p>YOUR MONEY, IN MOTION</p><h1>Know where<br />your money goes.</h1><Button onClick={handleGoogleLogin} data-testid="google-login-button" className="minimal-login">Continue with Google <ArrowRight size={17} /></Button></section>
    <footer>MCP enabled · secure connected tracking</footer>
  </main>;
}
