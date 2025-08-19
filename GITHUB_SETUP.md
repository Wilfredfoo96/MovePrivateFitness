# GitHub Setup & Vercel Deployment Guide

This guide will walk you through setting up your GitHub repository and deploying the backend to Vercel.

## 🚀 **Step 1: Prepare Your Local Repository**

### 1.1 **Initialize Git (if not already done)**
```bash
cd automation
git init
git add .
git commit -m "Initial commit: Aoikumo Importer project"
```

### 1.2 **Create a New Branch for Backend**
```bash
git checkout -b backend-setup
```

## 📁 **Step 2: Organize Your Repository Structure**

Your repository should look like this:
```
automation/
├── plugin/                    # WordPress Plugin
│   ├── aoikumo-importer.php
│   ├── includes/
│   ├── templates/
│   ├── assets/
│   └── README.md
├── backend/                   # Node.js Worker Service
│   ├── src/
│   ├── server.js
│   ├── package.json
│   ├── vercel.json
│   ├── .gitignore
│   └── DEPLOYMENT.md
├── README.md                  # Main project README
└── GITHUB_SETUP.md           # This file
```

## 🔗 **Step 3: Connect to Your GitHub Repository**

### 3.1 **Add Remote Origin**
```bash
git remote add origin https://github.com/Wilfredfoo96/MovePrivateFitness.git
```

### 3.2 **Push Your Code**
```bash
git push -u origin backend-setup
```

### 3.3 **Create Pull Request (Optional)**
- Go to your GitHub repository
- Create a pull request from `backend-setup` to `main`
- Merge the changes

## 🚀 **Step 4: Deploy to Vercel**

### 4.1 **Go to Vercel**
1. Visit [vercel.com](https://vercel.com)
2. Sign up/Login with your GitHub account
3. Click "New Project"

### 4.2 **Import Your Repository**
1. **Import Git Repository**: Select `MovePrivateFitness`
2. **Framework Preset**: Select `Node.js`
3. **Root Directory**: Set to `backend`
4. **Build Command**: Leave empty (auto-detect)
5. **Output Directory**: Leave empty
6. **Install Command**: `npm install`

### 4.3 **Configure Project**
- **Project Name**: `aoikumo-worker` (or your preferred name)
- **Team**: Select your team/account
- **Click "Deploy"**

## ⚙️ **Step 5: Configure Environment Variables**

### 5.1 **In Vercel Dashboard**
1. Go to your project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add the following variables:

```env
# WordPress Configuration
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_HMAC_SECRET=your_hmac_secret_here

# Google Sheets API Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
GOOGLE_PROJECT_ID=your-google-project-id

# Aoikumo Configuration
AOIKUMO_LOGIN_URL=https://aoikumo.com/login
AOIKUMO_USERNAME=your_aoikumo_username
AOIKUMO_PASSWORD=your_aoikumo_password

# Security
JWT_SECRET=your_jwt_secret_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/worker.log

# Browser Configuration
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000
BROWSER_RETRY_ATTEMPTS=3
```

### 5.2 **Redeploy**
- Vercel will automatically redeploy when you add environment variables
- Or manually click "Redeploy" in the dashboard

## 🧪 **Step 6: Test Your Deployment**

### 6.1 **Test Health Endpoint**
```bash
curl https://your-vercel-app.vercel.app/api/health
```

### 6.2 **Test Root Endpoint**
```bash
curl https://your-vercel-app.vercel.app/
```

### 6.3 **Expected Response**
```json
{
  "service": "Aoikumo Importer Worker",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2024-01-XX..."
}
```

## 🔧 **Step 7: Update WordPress Plugin**

### 7.1 **Configure Plugin Settings**
1. Go to your WordPress admin
2. Navigate to **Settings** → **Aoikumo Importer**
3. Set **Worker Service URL** to your Vercel deployment URL
4. Copy the generated **HMAC Secret**
5. Add the HMAC secret to your Vercel environment variables

### 7.2 **Test Connection**
- Use the "Test Connection" button in WordPress settings
- Verify the connection is successful

## 📝 **Step 8: Update Your Main README**

### 8.1 **Update Deployment Instructions**
In your main `README.md`, update the deployment section:

```markdown
## 🚀 **Quick Deploy to Vercel**

1. **Fork this repository**
2. **Deploy to Vercel**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Wilfredfoo96/MovePrivateFitness&root-directory=backend)
3. **Configure environment variables** (see Configuration section)
4. **Update WordPress plugin settings**
```

## 🔄 **Step 9: Continuous Deployment**

### 9.1 **Automatic Deployments**
- Vercel automatically redeploys when you push to your main branch
- Each push triggers a new deployment

### 9.2 **Manual Deployments**
- Use the "Redeploy" button in Vercel dashboard
- Useful for testing environment variable changes

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"Function Not Found"**
   - Check your `vercel.json` configuration
   - Ensure `server.js` is in the correct location

2. **"Environment Variables Not Found"**
   - Verify variables are added to Vercel dashboard
   - Check variable names match exactly

3. **"Build Failed"**
   - Check `package.json` dependencies
   - Ensure all required packages are listed

4. **"CORS Errors"**
   - Verify `WORDPRESS_URL` is correct
   - Check CORS configuration in your code

### **Debug Steps**

1. **Check Vercel Function Logs**
2. **Verify Environment Variables**
3. **Test Endpoints Locally**
4. **Check GitHub Repository Structure**

## 📊 **Monitoring Your Deployment**

### **Vercel Analytics**
- Function execution metrics
- Error rates and response times
- Deployment health

### **Custom Monitoring**
- Health check endpoints
- External uptime monitoring
- Log analysis

## 🔗 **Useful Links**

- [Your GitHub Repository](https://github.com/Wilfredfoo96/MovePrivateFitness)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Documentation](https://vercel.com/docs)

## 🎯 **Next Steps**

1. **Test the complete workflow** from WordPress to Vercel
2. **Monitor performance** and optimize if needed
3. **Set up alerts** for any failures
4. **Document any custom configurations** for your team

---

**Need help?** Check the Vercel dashboard logs, verify your GitHub repository structure, and ensure all environment variables are properly configured.
