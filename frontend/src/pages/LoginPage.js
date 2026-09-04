import { ArrowRight, BadgeCheck, Landmark, Orbit, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function LoginPage() {
  const handleGoogleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) { toast.error('Google Client ID is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID.'); return; }
    const next = new URLSearchParams(window.location.search).get('next');
    if (next?.startsWith('/api/oauth/authorize?')) sessionStorage.setItem('post_login_redirect', next); else sessionStorage.removeItem('post_login_redirect');
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback'); const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('oauth_state', state);
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent('email profile')}&state=${state}&access_type=offline&prompt=consent`;
  };
  return <main className="login-universe" data-testid="login-page">
    <div className="login-grid" /><div className="login-orbital login-orbit-one" /><div className="login-orbital login-orbit-two" /><div className="login-coin coin-a">₹</div><div className="login-coin coin-b">₹</div><div className="login-spark spark-a" /><div className="login-spark spark-b" />
    <header className="login-brand"><i>₹</i> Track<span>My</span>Bucks</header>
    <section className="login-copy"><p className="scene-kicker"><Orbit size={14} /> YOUR MONEY, IN MOTION</p><h1>See the world<br />behind every rupee.</h1><p>Income arrives. Costs move out. What matters stays in view.</p><div className="login-markers"><span><Landmark size={15} /> Reserve</span><span><Target size={15} /> Goals</span><span><BadgeCheck size={15} /> Secure</span></div></section>
    <section className="login-card" data-testid="login-card"><p className="scene-kicker"><BadgeCheck size={14} /> SECURE ENTRY</p><h2>Enter your<br />money universe.</h2><p>One calm place for the work you do and the money it makes.</p><Button onClick={handleGoogleLogin} data-testid="google-login-button" className="google-orbit-button"><svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true"><path d="M19.8 10.2273C19.8 9.51818 19.7364 8.83637 19.6182 8.18182H10.2V12.05H15.5818C15.3273 13.3 14.5636 14.3591 13.4182 15.0682V17.5773H16.7364C18.7091 15.7682 19.8 13.2364 19.8 10.2273Z" fill="#4285F4"/><path d="M10.2 20C12.9 20 15.1727 19.1045 16.7364 17.5773L13.4182 15.0682C12.4727 15.6682 11.2636 16.0227 10.2 16.0227C7.59091 16.0227 5.37273 14.2 4.52727 11.8H1.11364V14.3909C2.66818 17.4909 6.20909 20 10.2 20Z" fill="#34A853"/><path d="M4.52727 11.8C4.30909 11.2 4.18182 10.5545 4.18182 9.88636C4.18182 9.21818 4.30909 8.57273 4.52727 7.97273V5.38182H1.11364C.418182 6.77273 0 8.28182 0 9.88636C0 11.4909.418182 13 1.11364 14.3909L4.52727 11.8Z" fill="#FBBC05"/><path d="M10.2 3.75C11.3636 3.75 12.4091 4.15909 13.2273 4.93636L16.1727 2C14.1682 .190909 11.8955 -.772727 10.2 -.772727C6.20909 -.772727 2.66818 1.73636 1.11364 4.83636L4.52727 7.42727C5.37273 5.04545 7.59091 3.75 10.2 3.75Z" fill="#EA4335"/></svg> Continue with Google <ArrowRight size={18} /></Button><small>Connected through encrypted Google sign-in</small><p className="login-mcp">MCP enabled · secure connected tracking</p></section>
  </main>;
}
