# 🔐 Authentication Setup Guide

## Current Issue

Your app currently uses **Emergent's authentication service**. Since we're removing Emergent branding, you need to set up your own auth.

---

## ✅ **Recommended: Google OAuth (Free & Easy)**

### **Option 1: Direct Google OAuth** ⭐ BEST (Free Forever)

**Setup Steps:**

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com

2. **Create New Project**
   - Click "Select a project" → "New Project"
   - Name: "Income Tracker"
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search "Google+ API"
   - Click "Enable"

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Income Tracker Web"
   
5. **Configure OAuth Consent Screen**
   - User type: "External"
   - App name: "Income Tracker"
   - User support email: your email
   - Developer contact: your email
   - Scopes: email, profile
   - Test users: Add your email

6. **Add Authorized URLs**
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     http://YOUR_IP_ADDRESS
     https://yourdomain.com (if you have one)
     ```
   
   - Authorized redirect URIs:
     ```
     http://localhost:3000/auth/callback
     http://YOUR_IP_ADDRESS/auth/callback
     https://yourdomain.com/auth/callback
     ```

7. **Get Your Credentials**
   - Copy "Client ID"
   - Copy "Client Secret"

8. **Update Your Code**

   **Backend (.env file):**
   ```env
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_REDIRECT_URI=http://YOUR_IP_ADDRESS/auth/callback
   ```

   **Frontend (LoginPage.js):**
   ```javascript
   const handleGoogleLogin = () => {
     const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
     const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
     const scope = encodeURIComponent('email profile');
     const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
     window.location.href = googleAuthUrl;
   };
   ```

---

## 🔧 **Backend Changes Needed**

### Update `backend/server.py`:

Add Google OAuth handler:
```python
from fastapi import FastAPI, HTTPException
import requests
import os

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

@app.get("/api/auth/callback")
async def google_callback(code: str):
    # Exchange code for token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    token_response = requests.post(token_url, data=token_data)
    token_json = token_response.json()
    access_token = token_json.get("access_token")
    
    # Get user info
    user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    user_response = requests.get(user_info_url, headers=headers)
    user_data = user_response.json()
    
    # Create/login user
    user_email = user_data.get("email")
    user_name = user_data.get("name")
    
    # TODO: Save user to database, create session token
    # For now, return user data
    
    return {"email": user_email, "name": user_name, "token": "session-token-here"}
```

---

## 🎯 **Alternative Options**

### **Option 2: Supabase Auth** (Easier, Managed)
- **Free tier:** 50,000 monthly active users
- **Setup:** 5 minutes
- **Includes:** Google, GitHub, email/password
- **Website:** https://supabase.com

### **Option 3: Firebase Auth** (Google's Service)
- **Free tier:** Unlimited users
- **Setup:** 10 minutes
- **Includes:** Google, email/password, social logins
- **Website:** https://firebase.google.com

### **Option 4: Clerk** (Modern Auth Platform)
- **Free tier:** 5,000 monthly active users
- **Setup:** 5 minutes
- **Best UX:** Beautiful pre-built components
- **Website:** https://clerk.com

---

## 💡 **My Recommendation**

**For your use case:** Direct Google OAuth (Option 1)

**Why:**
- ✅ 100% free forever
- ✅ You own the auth flow
- ✅ No third-party dependencies
- ✅ Simple for single-provider auth

**If you want easier setup:** Supabase (Option 2)
- ✅ Managed service
- ✅ Database included
- ✅ Real-time features
- ✅ Free tier is generous

---

## 🚨 **For Now (Testing Only)**

I've created a **temporary workaround** for local testing:

**File:** `frontend/src/pages/LoginPage.js`
```javascript
// TEMPORARY: Skip auth for testing
const handleGoogleLogin = () => {
  localStorage.setItem('session_token', 'test-token');
  window.location.href = '/';
};
```

**⚠️ This is INSECURE! Only for local testing!**

---

## ✅ **Once Deployed**

You MUST implement proper authentication before going live!

Choose one of the options above and follow the setup guide.

---

Need help setting up auth? Let me know which option you prefer! 🔐
