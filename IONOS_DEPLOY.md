# 🚀 IONOS VPS Deployment Guide

## Complete setup for Income Tracker on IONOS VPS M

---

## 📋 Prerequisites

- ✅ IONOS VPS M purchased (2GB RAM, 80GB disk)
- ✅ Ubuntu 22.04 installed
- ✅ SSH access details from IONOS

---

## 🔑 Step 1: Connect to Your Server

IONOS will email you:
- **IP Address:** (e.g., 123.45.67.89)
- **Username:** root
- **Password:** (temporary)

### Connect via SSH:
```bash
ssh root@YOUR_IP_ADDRESS
# Enter password when prompted
# Change password on first login
```

---

## 🛠️ Step 2: Initial Server Setup

Run these commands one by one:

### Update system:
```bash
apt update && apt upgrade -y
```

### Install essential packages:
```bash
apt install -y git curl wget nginx python3 python3-pip python3-venv nodejs npm mongodb
```

### Install PM2 (process manager):
```bash
npm install -g pm2
```

### Create deployment user:
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

---

## 📥 Step 3: Clone Your Repository

```bash
cd /home/deploy
git clone https://github.com/kakarot0105/Incometracker.git
cd Incometracker
```

---

## 🐍 Step 4: Setup Backend (FastAPI)

### Create Python virtual environment:
```bash
cd /home/deploy/Incometracker/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Create environment file:
```bash
nano .env
```

Add:
```env
MONGODB_URL=mongodb://localhost:27017/incometracker
JWT_SECRET=your-super-secret-key-change-this
PORT=8000
```

Save: `Ctrl+X`, `Y`, `Enter`

### Start backend with PM2:
```bash
pm2 start "uvicorn server:app --host 0.0.0.0 --port 8000" --name incometracker-backend
pm2 save
pm2 startup
```

---

## ⚛️ Step 5: Setup Frontend (React)

### Install dependencies and build:
```bash
cd /home/deploy/Incometracker/frontend
npm install
```

### Create production environment:
```bash
nano .env.production
```

Add:
```env
REACT_APP_API_URL=http://YOUR_IP_ADDRESS/api
```

Save and build:
```bash
npm run build
```

---

## 🌐 Step 6: Configure Nginx

### Create Nginx config:
```bash
sudo nano /etc/nginx/sites-available/incometracker
```

Paste this:
```nginx
server {
    listen 80;
    server_name YOUR_IP_ADDRESS;

    # Frontend
    location / {
        root /home/deploy/Incometracker/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

Save and activate:
```bash
sudo ln -s /etc/nginx/sites-available/incometracker /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🗄️ Step 7: Configure MongoDB

### Secure MongoDB:
```bash
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Create database and user:
```bash
mongosh
```

In MongoDB shell:
```javascript
use incometracker
db.createUser({
  user: "incometracker",
  pwd: "secure-password-here",
  roles: ["readWrite"]
})
exit
```

### Update backend .env with credentials:
```bash
cd /home/deploy/Incometracker/backend
nano .env
```

Update:
```env
MONGODB_URL=mongodb://incometracker:secure-password-here@localhost:27017/incometracker
```

Restart backend:
```bash
pm2 restart incometracker-backend
```

---

## 🔥 Step 8: Setup Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (for later)
sudo ufw enable
```

---

## ✅ Step 9: Verify Deployment

### Check services:
```bash
pm2 status                    # Backend should be running
sudo systemctl status nginx   # Nginx should be active
sudo systemctl status mongodb # MongoDB should be active
```

### Test your app:
Open browser: `http://YOUR_IP_ADDRESS`

---

## 🔄 Step 10: Auto-Deploy Updates

Create update script:
```bash
nano /home/deploy/update.sh
```

Paste:
```bash
#!/bin/bash
cd /home/deploy/Incometracker
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart incometracker-backend

# Update frontend
cd ../frontend
npm install
npm run build

# Restart nginx
sudo systemctl reload nginx

echo "✅ Deployment updated!"
```

Make executable:
```bash
chmod +x /home/deploy/update.sh
```

### To update later:
```bash
/home/deploy/update.sh
```

---

## 🌐 Step 11: Add Domain (Optional)

If you have a domain (e.g., from Porkbun):

### Update DNS:
- Type: **A Record**
- Name: **@**
- Value: **YOUR_IP_ADDRESS**
- TTL: **3600**

### Update Nginx:
```bash
sudo nano /etc/nginx/sites-available/incometracker
```

Change:
```nginx
server_name YOUR_IP_ADDRESS;
```

To:
```nginx
server_name yourdomain.com www.yourdomain.com;
```

Restart:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Step 12: Add HTTPS (Free with Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow prompts, select "Redirect HTTP to HTTPS"

Auto-renewal:
```bash
sudo certbot renew --dry-run
```

---

## 📊 Monitoring

### View backend logs:
```bash
pm2 logs incometracker-backend
```

### View Nginx logs:
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check MongoDB:
```bash
mongosh
use incometracker
db.stats()
```

---

## 🆘 Troubleshooting

### Backend not starting?
```bash
pm2 logs incometracker-backend
cd /home/deploy/Incometracker/backend
source venv/bin/activate
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000
```

### Frontend not showing?
```bash
ls -la /home/deploy/Incometracker/frontend/build
sudo nginx -t
sudo systemctl status nginx
```

### MongoDB connection failed?
```bash
sudo systemctl status mongodb
mongosh
```

---

## 🎉 You're Done!

Your app is now live at:
- **HTTP:** http://YOUR_IP_ADDRESS
- **HTTPS:** https://yourdomain.com (if configured)

**24/7 uptime, full control, $4/month!** 🚀

---

## 💾 Backup (Important!)

### Manual backup:
```bash
mongodump --db incometracker --out /home/deploy/backups/$(date +%Y%m%d)
```

### Setup auto-backup (daily at 2 AM):
```bash
crontab -e
```

Add:
```cron
0 2 * * * mongodump --db incometracker --out /home/deploy/backups/$(date +\%Y\%m\%d)
```

---

## 🔄 Maintenance

### Update system monthly:
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### Update app:
```bash
/home/deploy/update.sh
```

---

**Need help? Just ask!** 🤝
