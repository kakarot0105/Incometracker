import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function LoginPage() {
  const [billProgress, setBillProgress] = useState(0);
  useEffect(() => {
    const update = () => setBillProgress(Math.min(1, window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)));
    update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);
  const handleGoogleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) { toast.error('Google Client ID is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID.'); return; }
    const next = new URLSearchParams(window.location.search).get('next');
    if (next?.startsWith('/api/oauth/authorize?')) sessionStorage.setItem('post_login_redirect', next); else sessionStorage.removeItem('post_login_redirect');
    const state = Math.random().toString(36).substring(7); sessionStorage.setItem('oauth_state', state);
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}&response_type=code&scope=${encodeURIComponent('email profile')}&state=${state}&access_type=offline&prompt=consent`;
  };
  return <main className="bill-journey" data-testid="login-page" style={{ '--bill-progress': billProgress }}>
    <header className="bill-brand"><i>$</i>Track<span>My</span>Bucks</header>
    <div className="bill-stage" aria-hidden="true"><div className="dollar-bill"><div className="bill-corner top-left">$</div><div className="bill-corner bottom-right">$</div><div className="bill-seal">TMB</div><div className="bill-portrait">$</div><p>TRACKMYBUCKS<br /><small>ONE CLEAR VIEW OF YOUR MONEY</small></p><b>01</b></div></div>
    <section className="bill-section bill-intro"><p>MONEY, MADE VISIBLE</p><h1>Know where<br />your money goes.</h1><span>Scroll to follow the flow <ArrowDown size={14} /></span></section>
    <section className="bill-section bill-middle"><p>ONE BILL. EVERY MOVE.</p><h2>Earn it.<br />Keep it.<br />Direct it.</h2></section>
    <section className="bill-section bill-end"><p>TRACKMYBUCKS</p><h2>Take control of<br />every dollar.</h2><Button onClick={handleGoogleLogin} data-testid="google-login-button" className="bill-login">Continue with Google <ArrowRight size={17} /></Button><small>MCP enabled · secure connected tracking</small></section>
  </main>;
}
