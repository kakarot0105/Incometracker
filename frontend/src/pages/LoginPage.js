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

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
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
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FDFCFB 0%, #F5F3EE 100%)'
      }}
      data-testid="login-page"
    >
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23344E41' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div 
          className="bg-white border border-[#EAE6DF] p-8 transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-sm"
          data-testid="login-card"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold tracking-tight text-[#344E41] mb-3" style={{ fontFamily: 'Outfit' }}>
              Income Tracker
            </h1>
            <p className="text-base leading-relaxed text-[#5C6B61]">
              Track your hours, jobs, and earnings in one place
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            data-testid="google-login-button"
            className="w-full bg-[#344E41] hover:bg-[#2B3A28] text-white py-3 px-6 flex items-center justify-center gap-3 transition-all duration-200 font-medium"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.8 10.2273C19.8 9.51818 19.7364 8.83637 19.6182 8.18182H10.2V12.05H15.5818C15.3273 13.3 14.5636 14.3591 13.4182 15.0682V17.5773H16.7364C18.7091 15.7682 19.8 13.2364 19.8 10.2273Z" fill="#4285F4"/>
              <path d="M10.2 20C12.9 20 15.1727 19.1045 16.7364 17.5773L13.4182 15.0682C12.4727 15.6682 11.2636 16.0227 10.2 16.0227C7.59091 16.0227 5.37273 14.2 4.52727 11.8H1.11364V14.3909C2.66818 17.4909 6.20909 20 10.2 20Z" fill="#34A853"/>
              <path d="M4.52727 11.8C4.30909 11.2 4.18182 10.5545 4.18182 9.88636C4.18182 9.21818 4.30909 8.57273 4.52727 7.97273V5.38182H1.11364C0.418182 6.77273 0 8.28182 0 9.88636C0 11.4909 0.418182 13 1.11364 14.3909L4.52727 11.8Z" fill="#FBBC05"/>
              <path d="M10.2 3.75C11.3636 3.75 12.4091 4.15909 13.2273 4.93636L16.1727 2C14.1682 0.190909 11.8955 -0.772727 10.2 -0.772727C6.20909 -0.772727 2.66818 1.73636 1.11364 4.83636L4.52727 7.42727C5.37273 5.04545 7.59091 3.75 10.2 3.75Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-[#5C6B61]">
              Securely track your freelance income
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-[#5C6B61]">
          <p>Simple • Organized • Trustworthy</p>
        </div>
      </div>
    </div>
  );
}
