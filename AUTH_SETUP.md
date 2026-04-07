# Authentication Setup

Income Tracker already uses Google OAuth in the current codebase. This document explains how to configure it correctly.

## What the App Uses

The current implementation is:

- frontend starts Google OAuth from `frontend/src/pages/LoginPage.js`
- Google redirects to `/auth/callback`
- frontend sends the OAuth code to `POST /api/auth/google`
- backend exchanges the code with Google
- backend creates a session in MongoDB
- backend sets an HTTP-only `session_token` cookie

No extra auth provider is required.

## Required Backend Environment Variables

Set these in `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=incometracker
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:3000
```

For production on your VPS with HTTPS:

```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback
COOKIE_SECURE=true
CORS_ORIGINS=https://yourdomain.com
```

## Required Frontend Environment Variables

Set these in `frontend/.env` for local development:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

For production builds:

```env
REACT_APP_BACKEND_URL=https://yourdomain.com
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

## Google Cloud Console Setup

1. Go to Google Cloud Console.
2. Create or select a project.
3. Configure the OAuth consent screen.
4. Create an OAuth client of type `Web application`.
5. Add allowed origins.
6. Add allowed redirect URIs.

### Recommended Local Values

Authorized JavaScript origins:

```text
http://localhost:3000
```

Authorized redirect URIs:

```text
http://localhost:3000/auth/callback
```

### Recommended Production Values

Authorized JavaScript origins:

```text
https://yourdomain.com
```

Authorized redirect URIs:

```text
https://yourdomain.com/auth/callback
```

If you temporarily test by IP address before DNS is ready, use the IP-based versions too.

## Important Behavior

- The frontend uses `window.location.origin + '/auth/callback'` as the redirect target.
- The backend accepts the redirect URI sent by the frontend unless `GOOGLE_REDIRECT_URI` is explicitly set.
- The session is stored in MongoDB collection `user_sessions`.
- Authentication checks rely on the `session_token` cookie and `withCredentials: true` requests from the frontend.

## Common Problems

### Redirect URI mismatch

Cause:
- The URL in Google Cloud does not exactly match the deployed callback URL.

Fix:
- Make sure protocol, domain, port, and path all match exactly.

### Login works locally but not on production

Cause:
- Wrong `CORS_ORIGINS`
- `COOKIE_SECURE` not enabled for HTTPS
- Wrong `REACT_APP_BACKEND_URL`

Fix:
- Set:

```env
COOKIE_SECURE=true
CORS_ORIGINS=https://yourdomain.com
REACT_APP_BACKEND_URL=https://yourdomain.com
```

### Browser is not sending session cookies

Cause:
- Frontend requests are missing credentials
- cookie/security settings do not match deployment mode

Fix:
- Keep `withCredentials: true` in frontend requests
- use HTTPS in production
- set `COOKIE_SECURE=true` in production

## Source Files

- `backend/server.py`
- `frontend/src/pages/LoginPage.js`
- `frontend/src/pages/AuthCallback.js`
- `frontend/src/components/ProtectedRoute.js`
