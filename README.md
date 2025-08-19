# Aoikumo Importer

A complete solution for automatically importing data from Google Sheets into Aoikumo using a WordPress plugin interface and a secure Node.js worker service.

## 🎯 **What This Does**

This system allows non-technical users to:
- Import customer data, products, orders, and more from Google Sheets
- Automatically fill Aoikumo forms using browser automation
- Monitor import progress in real-time
- Retry failed imports with detailed error logging
- Maintain a complete audit trail of all import operations

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WordPress     │    │   Node.js        │    │   Google        │
│   Plugin        │◄──►│   Worker Service │◄──►│   Sheets API    │
│   (Frontend)    │    │   (Backend)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Aoikumo       │
                       │   (Playwright)  │
                       │   Automation    │
                       └─────────────────┘
```

## ✨ **Key Features**

- **🔐 Secure Communication**: HMAC signature verification between WordPress and worker
- **📊 Real-time Progress**: Live updates during import operations
- **🔄 Retry Mechanism**: Automatic retry of failed rows with detailed logging
- **📝 Comprehensive Logging**: Winston-based logging with file rotation
- **🐳 Docker Support**: Containerized deployment with Docker Compose
- **🏥 Health Monitoring**: Health check endpoints for monitoring
- **📱 Responsive UI**: Modern, user-friendly WordPress interface
- **🔒 Security**: Rate limiting, CORS protection, and input validation

## 📁 **Project Structure**

```
automation/
├── plugin/                          # WordPress Plugin
│   ├── aoikumo-importer.php        # Main plugin file
│   ├── includes/                    # PHP classes
│   ├── templates/                   # Admin and frontend templates
│   ├── assets/                      # CSS, JS, and other assets
│   └── README.md                    # Plugin documentation
├── backend/                         # Node.js Worker Service
│   ├── src/                         # Source code
│   │   ├── routes/                  # API endpoints
│   │   ├── services/                # Business logic
│   │   └── utils/                   # Utilities
│   ├── server.js                    # Main server file
│   ├── package.json                 # Dependencies
│   ├── Dockerfile                   # Docker configuration
│   ├── docker-compose.yml           # Docker Compose
│   └── README.md                    # Backend documentation
└── README.md                        # This file
```

## 🚀 **Quick Start**

### Prerequisites

- **WordPress Site**: Version 5.0+ with REST API enabled
- **Node.js**: Version 18+ for the worker service
- **Google Cloud Project**: With Google Sheets API enabled
- **Aoikumo Account**: Valid login credentials
- **Server/Hosting**: For the Node.js worker service

### 1. **Deploy the Worker Service**

```bash
# Clone the repository
git clone <your-repo-url>
cd automation/backend

# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env with your credentials

# Start the service
npm start
```

**Or use Docker:**
```bash
cd automation/backend
docker-compose up -d
```

### 2. **Install WordPress Plugin**

1. Upload the `plugin/` folder to `/wp-content/plugins/` on your WordPress site
2. Activate the "Aoikumo Importer" plugin
3. Go to **Settings → Aoikumo Importer**
4. Configure the Worker Service URL and other settings

### 3. **Configure Google Sheets Access**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable Google Sheets API
3. Create a Service Account and download the JSON key
4. Share your Google Sheets with the service account email
5. Add the credentials to your backend `.env` file

### 4. **Test the Setup**

1. Use the "Test Connection" button in WordPress plugin settings
2. Try a small dry run import to verify everything works
3. Check the backend logs for any errors

## 🔧 **Configuration**

### Backend Environment Variables

```env
# Worker Service
PORT=3000
NODE_ENV=production

# WordPress
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_HMAC_SECRET=your_hmac_secret_here

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----"
GOOGLE_PROJECT_ID=your-google-project-id

# Aoikumo
AOIKUMO_LOGIN_URL=https://aoikumo.com/login
AOIKUMO_USERNAME=your_username
AOIKUMO_PASSWORD=your_password

# Security & Logging
LOG_LEVEL=info
BROWSER_HEADLESS=true
```

### WordPress Plugin Settings

- **Worker Service URL**: Your backend service endpoint
- **Default Google Sheet ID**: Pre-filled sheet ID for convenience
- **Default Range**: Pre-filled range (e.g., "A:Z")
- **HMAC Secret**: Automatically generated, copy to backend

## 📊 **Usage**

### 1. **Prepare Your Google Sheet**

- First row should contain column headers
- Data should start from row 2
- Ensure all required fields are filled

### 2. **Run an Import**

1. Go to **Aoikumo Importer** in your WordPress admin
2. Enter or verify the Google Sheet ID and range
3. Select the appropriate mapping (e.g., "Customers.Basic")
4. Choose between "Dry Run" (validation only) or "Run Import"
5. Monitor progress in real-time
6. Review results and retry any failed rows

### 3. **Monitor Jobs**

- View job history with timestamps and results
- Download detailed logs for troubleshooting
- Retry failed imports with the retry button

## 🔒 **Security Features**

- **HMAC Authentication**: All communication between WordPress and worker is signed
- **Rate Limiting**: Prevents abuse and ensures service stability
- **CORS Protection**: Restricts access to authorized domains
- **Input Validation**: All data is validated before processing
- **Secure Logging**: Sensitive information is redacted in logs

## 📈 **Supported Data Types**

### Customer Imports
- **Basic**: Name, email, phone
- **Full Profile**: Name, email, phone, address, company

### Product Imports
- **Basic**: Name, price, category
- **Extended**: Description, SKU, weight, tags

### Order Imports
- **Basic**: Order number, customer email, total
- **Extended**: Order date, status, notes, items

## 🐛 **Troubleshooting**

### Common Issues

1. **"Worker Service Unreachable"**
   - Check if the backend service is running
   - Verify the URL in WordPress settings
   - Check firewall and network configuration

2. **"Google Sheets Access Denied"**
   - Verify service account has access to the sheet
   - Check Google Sheets API is enabled
   - Ensure private key is correctly formatted

3. **"Aoikumo Login Failed"**
   - Verify credentials in backend `.env` file
   - Check if Aoikumo login page structure changed
   - Enable debug mode to see browser automation

### Debug Mode

Enable detailed logging by setting:
```env
LOG_LEVEL=debug
BROWSER_HEADLESS=false
```

This will provide more verbose logs and take screenshots for debugging.

## 📚 **API Reference**

### Worker Service Endpoints

- `GET /` - Service status
- `POST /api/jobs/process` - Process import job
- `POST /api/jobs/validate` - Validate Google Sheets access
- `GET /api/jobs/mappings` - Get available mappings
- `GET /api/health` - Health check

### WordPress REST API

- `POST /wp-json/aoikumo-importer/v1/job-status` - Update job status
- `POST /wp-json/aoikumo-importer/v1/job-progress` - Update progress
- `POST /wp-json/aoikumo-importer/v1/job-log` - Add log entry

## 🚀 **Deployment Options**

### Development
```bash
npm run dev  # Backend with auto-reload
```

### Production
```bash
npm start    # Backend
# Or use Docker
docker-compose up -d
```

### Scaling
- Run multiple worker instances behind a load balancer
- Use Redis for job queue management (future enhancement)
- Implement horizontal scaling with Kubernetes

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 **Support**

### Getting Help

1. **Check the documentation** - Start with this README and the individual component READMEs
2. **Review logs** - Check both WordPress and backend logs for error details
3. **Verify configuration** - Ensure all environment variables and settings are correct
4. **Test connections** - Use the built-in test functions to isolate issues
5. **Enable debug mode** - Set `LOG_LEVEL=debug` for more detailed information

### Common Support Scenarios

- **First-time setup**: Follow the Quick Start guide step-by-step
- **Import failures**: Check the job logs and retry failed rows
- **Performance issues**: Monitor backend resources and consider scaling
- **Security concerns**: Review the security features and HMAC configuration

## 🔮 **Future Enhancements**

- **Redis Integration**: Job queue management for better scalability
- **Webhook Support**: Notify external systems of job completion
- **Advanced Mappings**: Custom field mapping configurations
- **Batch Processing**: Process multiple sheets simultaneously
- **API Rate Limiting**: Respect Aoikumo API limits
- **Multi-tenant Support**: Handle multiple Aoikumo accounts

---

**Need help?** Check the troubleshooting section, review the logs, and ensure all prerequisites are met. This system is designed to be robust and user-friendly, but proper configuration is essential for success.
