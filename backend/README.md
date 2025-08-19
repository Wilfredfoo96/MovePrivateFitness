# Aoikumo Importer Worker Service

A Node.js worker service that handles the automation of importing data from Google Sheets into Aoikumo using Playwright for browser automation.

## Features

- **Google Sheets Integration**: Read data from Google Sheets using Service Account authentication
- **Aoikumo Automation**: Automated form filling using Playwright browser automation
- **WordPress Communication**: Secure communication with WordPress plugin via HMAC signatures
- **Job Processing**: Asynchronous job processing with real-time progress updates
- **Comprehensive Logging**: Winston-based logging with file rotation
- **Security**: HMAC signature verification, rate limiting, and CORS protection
- **Health Monitoring**: Health check endpoints for monitoring and orchestration
- **Docker Support**: Containerized deployment with Docker and Docker Compose

## Architecture

```
WordPress Plugin → Worker Service → Google Sheets API
                    ↓
                Aoikumo (Playwright)
```

## Prerequisites

- Node.js 18+ 
- Google Cloud Project with Google Sheets API enabled
- Google Service Account with appropriate permissions
- Aoikumo account credentials
- WordPress site with the Aoikumo Importer plugin installed

## Installation

### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the environment example file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Worker Service Configuration
PORT=3000
NODE_ENV=production

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

### 3. Google Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API
4. Create a Service Account
5. Download the JSON key file
6. Share your Google Sheets with the service account email
7. Copy the private key and email to your `.env` file

### 4. WordPress Plugin Configuration

1. Install the Aoikumo Importer WordPress plugin
2. Go to plugin settings
3. Set the Worker Service URL to your worker service endpoint
4. Copy the generated HMAC secret to your worker service `.env` file

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

## API Endpoints

### Job Processing

- `POST /api/jobs/process` - Process a new import job
- `POST /api/jobs/validate` - Validate Google Sheets access and data
- `GET /api/jobs/status/:jobId` - Get job status
- `POST /api/jobs/cancel/:jobId` - Cancel a running job
- `GET /api/jobs/mappings` - Get available mapping configurations

### Health Monitoring

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## Job Processing Flow

1. **Job Reception**: WordPress sends job request with HMAC signature
2. **Authentication**: Worker verifies HMAC signature
3. **Google Sheets**: Read data from specified sheet and range
4. **Data Validation**: Validate data structure and required fields
5. **Aoikumo Automation**: Login and fill forms using Playwright
6. **Progress Updates**: Send real-time updates back to WordPress
7. **Completion**: Notify WordPress of job completion or failure

## Mapping Configurations

The worker service supports predefined mapping configurations:

- **Customers.Basic**: Name, email, phone
- **Customers.Full**: Complete customer profile with address and company
- **Products.Basic**: Product name, price, category
- **Orders.Basic**: Order number, customer email, total

## Security Features

- **HMAC Signature Verification**: Ensures requests come from authorized WordPress instances
- **Rate Limiting**: Prevents abuse and ensures service stability
- **CORS Protection**: Restricts access to authorized domains
- **Input Validation**: Validates all incoming data
- **Secure Logging**: Sanitizes sensitive information in logs

## Monitoring and Logging

### Log Files

- `logs/worker.log` - General application logs
- `logs/worker.error.log` - Error logs only
- `logs/worker.exceptions.log` - Uncaught exceptions
- `logs/screenshots/` - Screenshots for debugging

### Health Checks

The service provides health check endpoints suitable for:
- Load balancer health checks
- Kubernetes liveness/readiness probes
- Monitoring system integration

## Troubleshooting

### Common Issues

1. **Google Sheets Access Denied**
   - Verify service account email has access to the sheet
   - Check Google Sheets API is enabled
   - Ensure private key is correctly formatted

2. **Aoikumo Login Failed**
   - Verify credentials in `.env` file
   - Check if Aoikumo login page structure has changed
   - Ensure browser automation is working

3. **WordPress Communication Failed**
   - Verify WordPress URL and HMAC secret
   - Check WordPress plugin is properly configured
   - Ensure REST API endpoints are accessible

### Debug Mode

Enable debug logging by setting:

```env
LOG_LEVEL=debug
BROWSER_HEADLESS=false
```

### Screenshots

The service automatically takes screenshots on errors when `BROWSER_HEADLESS=false`. Check the `logs/screenshots/` directory for debugging.

## Development

### Project Structure

```
backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   └── utils/           # Utility functions
├── logs/                # Log files
├── server.js            # Main application entry point
├── package.json         # Dependencies and scripts
├── Dockerfile           # Docker container configuration
├── docker-compose.yml   # Docker Compose configuration
└── README.md            # This file
```

### Adding New Mappings

1. Update `getRequiredFieldsForMapping()` in `jobProcessor.js`
2. Update `getFormSelectorsForMapping()` with CSS selectors
3. Update `getFormUrlForMapping()` with form URLs
4. Add mapping to the `/api/jobs/mappings` endpoint

### Testing

```bash
# Run tests (when implemented)
npm test

# Lint code (when implemented)
npm run lint
```

## Deployment

### Production Considerations

- Use environment variables for all sensitive configuration
- Set up proper logging and monitoring
- Configure reverse proxy (nginx) for SSL termination
- Use PM2 or similar process manager for Node.js
- Set up log rotation and archival
- Monitor system resources and performance

### Scaling

- Run multiple worker instances behind a load balancer
- Use Redis for job queue management (future enhancement)
- Implement horizontal scaling with container orchestration

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Verify configuration settings
4. Check WordPress plugin configuration
5. Ensure all prerequisites are met

