# IONOS VPS Deployment Guide

This guide documents the current deployment approach for Income Tracker on an IONOS VPS running Ubuntu.

## Overview

The app is deployed as:

- FastAPI backend running on port `8000`
- React frontend built to static files
- Nginx serving the frontend and reverse proxying the backend
- MongoDB running on the VPS
- PM2 used to keep the backend process alive

## Prerequisites

- IONOS VPS with Ubuntu
- SSH access
- A domain or public IP
- Google OAuth credentials

## 1. Connect to the Server

```bash
ssh root@YOUR_SERVER_IP
```

## 2. Install System Packages

```bash
apt update && apt upgrade -y
apt install -y git curl wget nginx python3 python3-pip python3-venv nodejs npm mongodb
npm install -g pm2
```

Optional but recommended:

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## 3. Clone the Repository

```bash
cd /home/deploy
git clone https://github.com/kakarot0105/Incometracker.git
cd Incometracker
```

## 4. Backend Setup

```bash
cd /home/deploy/Incometracker/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=incometracker
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback
COOKIE_SECURE=true
CORS_ORIGINS=https://yourdomain.com
```

If you are deploying by IP only for initial testing, you can temporarily use:

```env
GOOGLE_REDIRECT_URI=http://YOUR_SERVER_IP/auth/callback
CORS_ORIGINS=http://YOUR_SERVER_IP
COOKIE_SECURE=false
```

Start the backend with PM2:

```bash
cd /home/deploy/Incometracker/backend
pm2 start "venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000" --name incometracker-backend
pm2 save
pm2 startup
```

## 5. Frontend Setup

```bash
cd /home/deploy/Incometracker/frontend
npm install
```

Create `frontend/.env.production`:

```env
REACT_APP_BACKEND_URL=https://yourdomain.com
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

Build the frontend:

```bash
npm run build
```

## 6. Nginx Configuration

Create `/etc/nginx/sites-available/incometracker`:

```nginx
server {
    listen 80;
    server_name yourdomain.com YOUR_SERVER_IP;

    root /home/deploy/Incometracker/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/incometracker /etc/nginx/sites-enabled/incometracker
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 7. MongoDB

Start and enable MongoDB:

```bash
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

For a simple single-server setup, the default local MongoDB instance is enough. If you later add authentication to MongoDB itself, update `MONGO_URL` accordingly.

## 8. HTTPS

Once DNS is pointed at the VPS, install TLS with Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

After HTTPS is enabled, keep these production settings:

```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback
REACT_APP_BACKEND_URL=https://yourdomain.com
COOKIE_SECURE=true
CORS_ORIGINS=https://yourdomain.com
```

Then rebuild the frontend and restart the backend:

```bash
cd /home/deploy/Incometracker/frontend
npm run build

cd /home/deploy/Incometracker/backend
pm2 restart incometracker-backend
```

## 9. Updating the App

```bash
cd /home/deploy/Incometracker
git pull origin main

cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart incometracker-backend

cd ../frontend
npm install
npm run build

sudo systemctl reload nginx
```

## 10. Verification

Check running services:

```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status mongodb
```

Open the app:

- `https://yourdomain.com`
- or `http://YOUR_SERVER_IP` during early setup

## Notes

- The backend expects `MONGO_URL`, not `MONGODB_URL`.
- The frontend expects `REACT_APP_BACKEND_URL`, not `REACT_APP_API_URL`.
- Google OAuth must include the exact callback URL you deploy, including protocol and domain.
