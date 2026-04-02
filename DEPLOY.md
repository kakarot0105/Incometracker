# 🚀 Fly.io Deployment Guide

## Prerequisites
- Fly.io account (free tier)
- flyctl CLI installed ✅

## Step-by-Step Deployment

### 1. Authenticate with Fly.io
```bash
export PATH="/Users/bulmanik/.fly/bin:$PATH"
flyctl auth login
```

### 2. Deploy Backend (FastAPI)
```bash
cd backend
flyctl launch --no-deploy
# Answer prompts:
# - App name: incometracker-backend (or press enter)
# - Region: iad (US East)
# - PostgreSQL: No
# - Redis: No

# Deploy
flyctl deploy

# Check status
flyctl status
flyctl logs
```

Your backend will be at: **https://incometracker-backend.fly.dev**

### 3. Set Environment Variables (if needed)
```bash
cd backend
flyctl secrets set MONGODB_URL="your-mongodb-url"
flyctl secrets set JWT_SECRET="your-secret-key"
```

### 4. Deploy Frontend (React)
```bash
cd ../frontend
flyctl launch --no-deploy
# Answer prompts:
# - App name: incometracker-frontend (or press enter)
# - Region: iad (US East)
# - PostgreSQL: No
# - Redis: No

# Deploy
flyctl deploy

# Check status
flyctl status
```

Your frontend will be at: **https://incometracker-frontend.fly.dev**

## Post-Deployment

### View Logs
```bash
flyctl logs
```

### Check App Status
```bash
flyctl status
```

### Scale (if needed)
```bash
flyctl scale count 1  # Keep 1 machine running
flyctl scale memory 256  # Use 256MB RAM
```

### Open App
```bash
flyctl open
```

## Troubleshooting

### Backend not connecting to frontend?
Update `frontend/nginx.conf` with correct backend URL:
```nginx
proxy_pass http://incometracker-backend.fly.dev;
```

Then redeploy frontend:
```bash
cd frontend
flyctl deploy
```

### App sleeping?
Free tier should NOT sleep. If it does:
```bash
cd backend  # or frontend
flyctl scale count 1
```

### MongoDB connection issues?
Set up MongoDB Atlas (free tier):
1. Go to mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Set secret:
```bash
flyctl secrets set MONGODB_URL="mongodb+srv://..."
```

## Custom Domain (Optional)

1. Buy domain from Porkbun ($0.99/year)
2. Add to Fly.io:
```bash
flyctl certs add yourdomain.com
```
3. Update DNS:
   - Type: CNAME
   - Name: @
   - Value: incometracker-frontend.fly.dev

## Free Tier Limits
- 3 VMs (256MB each)
- 3GB persistent storage
- 160GB outbound transfer/month

Your app uses:
- Backend: 1 VM (256MB)
- Frontend: 1 VM (256MB)
- **Total: 2 VMs = FREE ✅**

## URLs After Deployment
- **Frontend:** https://incometracker-frontend.fly.dev
- **Backend:** https://incometracker-backend.fly.dev

## Next Steps
1. Test your app
2. Share the URL with friends!
3. (Optional) Add custom domain

## Support
- Fly.io Docs: https://fly.io/docs
- Community: https://community.fly.io
