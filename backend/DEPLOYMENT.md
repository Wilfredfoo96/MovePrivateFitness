# Deploying to Vercel

This guide will help you deploy the Aoikumo Importer Worker Service to Vercel.

## 🚀 **Quick Deploy to Vercel**

### Option 1: Deploy from GitHub (Recommended)

1. **Fork/Clone this repository to your GitHub account**
2. **Go to [Vercel](https://vercel.com) and sign up/login**
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure the project:**
   - **Framework Preset**: Node.js
   - **Root Directory**: `backend` (if your repo has the structure: `automation/backend/`)
   - **Build Command**: Leave empty (Vercel will auto-detect)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`
6. **Click "Deploy"**

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to backend directory
cd backend

# Deploy
vercel

# Follow the prompts
```

## ⚙️ **Environment Variables Setup**

After deploying, you need to configure environment variables in Vercel:

1. **Go to your Vercel project dashboard**
2. **Click "Settings" → "Environment Variables"**
3. **Add the following variables:**

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

4. **Click "Save"**
5. **Redeploy your project** (Vercel will automatically redeploy when you add env vars)

## 🔧 **Vercel-Specific Considerations**

### **Playwright on Vercel**

Vercel has some limitations for Playwright:

1. **Browser Automation**: Vercel serverless functions have limitations for browser automation
2. **Alternative**: Consider using a different hosting provider for full Playwright support

### **Recommended Vercel Usage**

Use Vercel for:
- ✅ API endpoints
- ✅ Google Sheets integration
- ✅ WordPress communication
- ✅ Job processing logic

Consider alternatives for:
- ❌ Full browser automation (Playwright)
- ❌ Long-running processes

### **Modified Deployment for Vercel**

If you want to use Vercel for the API parts only:

1. **Remove Playwright dependencies** from `package.json`
2. **Modify the Aoikumo automation service** to use API calls instead of browser automation
3. **Deploy the modified version**

## 📝 **Post-Deployment Steps**

### 1. **Test Your Deployment**

```bash
# Test the health endpoint
curl https://your-vercel-app.vercel.app/api/health

# Test the root endpoint
curl https://your-vercel-app.vercel.app/
```

### 2. **Update WordPress Plugin Settings**

1. **Go to your WordPress admin**
2. **Navigate to Settings → Aoikumo Importer**
3. **Set Worker Service URL** to your Vercel deployment URL
4. **Copy the HMAC secret** to your Vercel environment variables
5. **Test the connection**

### 3. **Monitor Logs**

- **Vercel Dashboard**: View function logs
- **Function Logs**: Check for any runtime errors
- **Environment Variables**: Ensure all are properly set

## 🐛 **Troubleshooting Vercel Deployment**

### **Common Issues**

1. **"Function Timeout"**
   - Increase `maxDuration` in `vercel.json`
   - Consider breaking long operations into smaller functions

2. **"Environment Variables Not Found"**
   - Double-check variable names in Vercel dashboard
   - Ensure variables are added to the correct environment (Production/Preview/Development)

3. **"Module Not Found"**
   - Check `package.json` dependencies
   - Ensure `node_modules` is not in `.gitignore` (Vercel needs to install dependencies)

4. **"CORS Errors"**
   - Verify `WORDPRESS_URL` is correct
   - Check CORS configuration in your server code

### **Debug Mode**

Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

## 🔄 **Updating Your Deployment**

### **Automatic Updates**

- **GitHub Integration**: Vercel automatically redeploys when you push to your main branch
- **Manual Redeploy**: Use the "Redeploy" button in Vercel dashboard

### **Environment Variable Updates**

1. **Update variables in Vercel dashboard**
2. **Redeploy** (automatic or manual)
3. **Test the changes**

## 📊 **Monitoring & Analytics**

### **Vercel Analytics**

- **Function Execution**: Monitor function performance
- **Error Rates**: Track deployment health
- **Response Times**: Optimize performance

### **Custom Monitoring**

- **Health Checks**: Use the `/api/health` endpoint
- **Logs**: Check Vercel function logs
- **External Monitoring**: Set up uptime monitoring for your endpoints

## 🚀 **Scaling Considerations**

### **Vercel Limits**

- **Function Duration**: 10 seconds (Hobby), 60 seconds (Pro), 900 seconds (Enterprise)
- **Memory**: 1024 MB (Hobby), 3008 MB (Pro), 3008 MB (Enterprise)
- **Concurrent Functions**: Varies by plan

### **Optimization Tips**

1. **Keep functions lightweight**
2. **Use edge functions for simple operations**
3. **Implement proper error handling**
4. **Monitor function performance**

## 🔗 **Useful Links**

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Node.js Runtime](https://vercel.com/docs/runtimes#official-runtimes/node-js)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Function Configuration](https://vercel.com/docs/functions)

---

**Need help?** Check the Vercel dashboard logs, verify environment variables, and ensure your code is compatible with serverless functions.
