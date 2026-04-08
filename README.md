# Income Tracker

Income Tracker is a full-stack app for tracking freelance work, logged hours, payments received, balances owed, and downloadable PDF reports.

## Stack

- Frontend: React, React Router, Tailwind, Radix UI primitives
- Backend: FastAPI
- Database: MongoDB
- Auth: Google OAuth with cookie-based sessions
- Reports: PDF generation with ReportLab

## Current Deployment

This project is currently intended to run on an IONOS VPS.

Legacy deployment files for Render and Fly.io have been removed so the repository matches the current deployment approach.

## Features

- Google sign-in
- Create and manage jobs with hourly rates
- Log work hours
- Record payments received
- View dashboard totals and job breakdowns
- Generate invoice PDFs
- Generate monthly timesheet PDFs
- Generate earnings statement PDFs

## Repository Structure

```text
backend/                 FastAPI API
frontend/                React app
tests/                   Test package placeholder
IONOS_DEPLOY.md          VPS deployment guide
AUTH_SETUP.md            Google OAuth setup notes
```

## Local Development

### 1. Backend

Create a backend environment file at `backend/.env`.

Required environment variables:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=incometracker
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:3000
```

Start the backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

Create `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

Start the frontend:

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`.

## Core API Areas

- `/api/auth/*` for login, session lookup, and logout
- `/api/jobs` for job management
- `/api/hours` for logged work
- `/api/payments` for payment tracking
- `/api/dashboard/summary` for top-level totals
- `/api/invoices/generate` for invoice PDFs
- `/api/reports/*` for PDF reports

## Important Docs

- [IONOS_DEPLOY.md](/Users/bulmanik/Documents/GitHub/Incometracker/IONOS_DEPLOY.md)
- [AUTH_SETUP.md](/Users/bulmanik/Documents/GitHub/Incometracker/AUTH_SETUP.md)

## Notes

- The root README is the main source of project setup information.
- `frontend/README.md` contains frontend-specific commands only.
- If deployment changes again later, update the README at the same time so the repo stays trustworthy.
