import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const highlights = [
  {
    icon: Clock3,
    title: 'Log hours without the spreadsheet shuffle',
    description: 'Capture work quickly and keep earnings tied to the client that produced them.',
  },
  {
    icon: WalletCards,
    title: 'Track what has landed and what is still owed',
    description: 'Payments and balances stay visible, so no invoice slips through the cracks.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Keep every client in one calm workspace',
    description: 'Jobs, reports, and downloadable PDFs all stay in one organized place.',
  },
];

export default function LoginPage() {
  const handleGoogleLogin = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('Google Client ID is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID.');
      return;
    }

    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
    const scope = encodeURIComponent('email profile');
    const state = Math.random().toString(36).substring(7);

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=code&` +
      `scope=${scope}&` +
      `state=${state}&` +
      `access_type=offline&` +
      `prompt=consent`;

    sessionStorage.setItem('oauth_state', state);
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8" data-testid="login-page">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(167,239,138,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(239,193,119,0.2),transparent_26%)]" />

      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative z-10">
          <div className="page-eyebrow">Independent Work, Organized</div>

          <div className="mb-8 mt-5 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#173229] text-xl font-semibold text-white shadow-[0_24px_50px_-26px_rgba(23,50,41,0.78)]">
              IT
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#173229]">Income Tracker</h1>
              <p className="mt-1 text-sm text-[#5a6d61]">Freelance finance, minus the clutter.</p>
            </div>
          </div>

          <h2 className="max-w-2xl text-[clamp(3rem,7vw,5.2rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-[#173229]">
            A calmer way to manage freelance income.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#56695d]">
            Track jobs, log hours, record payments, and export polished reports from one tidy
            workspace.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {highlights.map((highlight) => {
              const Icon = highlight.icon;

              return (
                <div key={highlight.title} className="app-panel rounded-[28px] p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#173229]/8 text-[#173229]">
                    <Icon size={20} />
                  </div>
                  <h3
                    className="mt-4 text-lg font-semibold tracking-tight text-[#173229]"
                    style={{ fontFamily: 'Outfit' }}
                  >
                    {highlight.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5a6d61]">{highlight.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="app-panel-solid relative z-10 overflow-hidden rounded-[34px] p-6 sm:p-8 lg:p-10"
          data-testid="login-card"
        >
          <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[rgba(167,239,138,0.18)] blur-3xl" />

          <div className="relative z-10">
            <span className="status-chip status-chip-positive">
              <BadgeCheck size={14} />
              Secure Google sign-in
            </span>

            <h3
              className="mt-6 text-3xl font-semibold tracking-tight text-[#173229]"
              style={{ fontFamily: 'Outfit' }}
            >
              Welcome back
            </h3>
            <p className="mt-3 text-base leading-7 text-[#5a6d61]">
              Use your Google account to open your workspace and keep every client payment in one
              place.
            </p>

            <Button
              onClick={handleGoogleLogin}
              data-testid="google-login-button"
              className="mt-8 h-14 w-full justify-center text-base"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.8 10.2273C19.8 9.51818 19.7364 8.83637 19.6182 8.18182H10.2V12.05H15.5818C15.3273 13.3 14.5636 14.3591 13.4182 15.0682V17.5773H16.7364C18.7091 15.7682 19.8 13.2364 19.8 10.2273Z" fill="#4285F4"/>
                <path d="M10.2 20C12.9 20 15.1727 19.1045 16.7364 17.5773L13.4182 15.0682C12.4727 15.6682 11.2636 16.0227 10.2 16.0227C7.59091 16.0227 5.37273 14.2 4.52727 11.8H1.11364V14.3909C2.66818 17.4909 6.20909 20 10.2 20Z" fill="#34A853"/>
                <path d="M4.52727 11.8C4.30909 11.2 4.18182 10.5545 4.18182 9.88636C4.18182 9.21818 4.30909 8.57273 4.52727 7.97273V5.38182H1.11364C0.418182 6.77273 0 8.28182 0 9.88636C0 11.4909 0.418182 13 1.11364 14.3909L4.52727 11.8Z" fill="#FBBC05"/>
                <path d="M10.2 3.75C11.3636 3.75 12.4091 4.15909 13.2273 4.93636L16.1727 2C14.1682 0.190909 11.8955 -0.772727 10.2 -0.772727C6.20909 -0.772727 2.66818 1.73636 1.11364 4.83636L4.52727 7.42727C5.37273 5.04545 7.59091 3.75 10.2 3.75Z" fill="#EA4335"/>
              </svg>
              Continue with Google
              <ArrowRight size={18} />
            </Button>

            <div className="mt-6 rounded-[24px] border border-border/80 bg-[#faf6ed]/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <p className="page-eyebrow !bg-white/80">Inside Your Workspace</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[#44574c]">
                <p>Track hours alongside earnings so your work history and money stay in sync.</p>
                <p>Keep balances visible by client to know what has landed and what still needs a nudge.</p>
                <p>Export clean invoice, statement, and timesheet PDFs when it is time to send paperwork.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
