# 🆓 Render.com Deployment Guide (100% FREE)

## What You Get
- ✅ FREE forever
- ✅ Auto-deploy on Git push
- ✅ HTTPS included
- ⚠️ Sleeps after 15 min (30s wake-up time)

---

## 🚀 Quick Deploy (5 minutes)

### Step 1: Sign Up
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub

### Step 2: Connect Repository
1. Click "New +" → "Blueprint"
2. Connect your GitHub account
3. Select `incometracker` repository
4. Click "Connect"

Render will auto-detect `render.yaml` and deploy both:
- Backend: `incometracker-backend.onrender.com`
- Frontend: `incometracker-frontend.onrender.com`

### Step 3: Configure Environment Variables (if needed)

**For Backend:**
1. Go to Dashboard → incometracker-backend
2. Click "Environment"
3. Add:
   - `MONGODB_URL` = your MongoDB connection string
   - `JWT_SECRET` = your secret key
   - Any other env vars

4. Click "Save Changes" (auto-redeploys)

### Step 4: Wait for Deploy
- First deploy: ~5-10 minutes
- Shows "Live" when ready
- Click URL to open your app!

---

## 📝 Manual Deploy (Alternative)

### Deploy Backend
1. Dashboard → "New +" → "Web Service"
2. Connect GitHub → Select `incometracker`
3. Settings:
   - **Name:** incometracker-backend
   - **Region:** Oregon (or closest to you)
   - **Branch:** main
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

4. Click "Create Web Service"

### Deploy Frontend
1. Dashboard → "New +" → "Static Site"
2. Connect GitHub → Select `incometracker`
3. Settings:
   - **Name:** incometracker-frontend
   - **Branch:** main
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
   - **Plan:** Free

4. Click "Create Static Site"

---

## 🔗 Connect Frontend to Backend

Update your frontend to use the backend URL:

1. Create `frontend/.env.production`:
```
REACT_APP_API_URL=https://incometracker-backend.onrender.com
```

2. Commit and push:
```bash
git add frontend/.env.production
git commit -m "Add production API URL"
git push
```

Render auto-redeploys! ✅

---

## ⚙️ Environment Variables

### Backend needs:
```
MONGODB_URL=mongodb+srv://...
JWT_SECRET=your-secret-key
```

Add in Render Dashboard → Backend → Environment

---

## 📊 After Deployment

### Your URLs:
- **Frontend:** https://incometracker-frontend.onrender.com
- **Backend API:** https://incometracker-backend.onrender.com

### Check Status:
- Dashboard shows "Live" when ready
- View logs: Click service → "Logs"

### Wake from Sleep:
- First request after 15min idle = ~30 seconds
- Keep awake (optional): Use UptimeRobot to ping every 14 min

---

## 🎯 Pros & Cons

### ✅ Pros:
- 100% FREE forever
- Auto-deploy on push
- Easy setup
- HTTPS included
- No credit card needed

### ⚠️ Cons:
- Sleeps after 15 min inactivity
- 30-second wake-up time
- 512MB RAM limit (free tier)

---

## 💡 Tips

### Speed up first load:
Use a free service to ping your app every 14 minutes:
- UptimeRobot.com (free)
- Cron-Job.org (free)

### Custom Domain:
1. Buy domain ($0.99/year from Porkbun)
2. Render Dashboard → Settings → Custom Domain
3. Add CNAME record in Porkbun

---

## 🆘 Troubleshooting

### Build fails?
- Check logs in Dashboard
- Verify `package.json` and `requirements.txt`

### Backend not connecting?
- Check environment variables
- Verify CORS settings in FastAPI

### Frontend can't reach backend?
- Update `REACT_APP_API_URL` in `.env.production`
- Redeploy frontend

---

## 🎉 That's It!

Your app is now deployed and accessible worldwide for **FREE**! 🚀

**Next Steps:**
1. Test your app
2. Share the URL
3. (Optional) Add custom domain
