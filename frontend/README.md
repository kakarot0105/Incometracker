# Frontend

This directory contains the React frontend for Income Tracker.

## Stack

- React
- React Router
- Tailwind CSS
- Radix-based UI components
- Axios
- Recharts

## Environment Variables

Create `frontend/.env` for local development:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

## Available Scripts

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Create a production build:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Main App Files

- `src/App.js`: route definitions
- `src/components/ProtectedRoute.js`: auth gate
- `src/components/Layout.js`: shared app shell
- `src/pages/Dashboard.js`: summary dashboard
- `src/pages/Jobs.js`: job management
- `src/pages/Hours.js`: hours logging
- `src/pages/Payments.js`: payment tracking
- `src/pages/Invoices.js`: invoice generation
- `src/pages/AuthCallback.js`: Google OAuth callback flow

## Production Notes

For the current project setup, the frontend is served as part of the IONOS VPS deployment flow documented in the root repository docs.
