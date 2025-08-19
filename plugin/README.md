# Aoikumo Importer WordPress Plugin

A comprehensive WordPress plugin that allows non-technical users to import structured data from Google Sheets into Aoikumo automatically through a user-friendly web interface.

## Features

- **User-Friendly Interface**: Clean, branded dashboard for easy data import
- **Google Sheets Integration**: Direct import from Google Sheets using Sheet ID and range
- **Flexible Mapping**: Pre-defined mapping configurations for different data types
- **Dry Run Support**: Validate data before actual import
- **Real-Time Progress**: Live updates during import process
- **Job History**: Complete audit trail of all import jobs
- **Error Handling**: Detailed logging and retry mechanisms for failed rows
- **Security**: HMAC signature authentication for worker service communication
- **Responsive Design**: Works on desktop and mobile devices

## Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- MySQL 5.7 or higher
- External Node.js worker service (for Aoikumo automation)

## Installation

### 1. Plugin Installation

1. Upload the `aoikumo-importer` folder to your WordPress `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to 'Aoikumo Importer' in the admin menu to configure settings

### 2. Database Setup

The plugin will automatically create the necessary database tables upon activation. No manual database setup is required.

### 3. Worker Service Setup

You'll need to set up a Node.js worker service that handles:
- Google Sheets API integration
- Aoikumo automation via Playwright
- Job processing and status updates

## Configuration

### Plugin Settings

Navigate to **WordPress Admin → Aoikumo Importer → Settings** to configure:

1. **Worker Service URL**: The URL of your Node.js worker service
2. **HMAC Secret**: Secret key for secure communication (auto-generated)
3. **Default Google Sheet ID**: Pre-fill the sheet ID field
4. **Default Range**: Pre-fill the range field (e.g., A:Z)
5. **Available Mappings**: Define available mapping configurations

### Example Mappings

```
Customers.Basic
Products.Inventory
Orders.Complete
```

## Usage

### For End Users

1. **Access the Importer**: Use the shortcode `[aoikumo_importer]` on any page/post
2. **Configure Import**:
   - Enter Google Sheet ID
   - Specify range (e.g., A:Z)
   - Select mapping configuration
   - Choose dry run or actual import
3. **Monitor Progress**: Watch real-time progress updates
4. **Review Results**: Check success/failure counts and download logs

### For Administrators

1. **Dashboard Overview**: View statistics and recent jobs
2. **Job Management**: Monitor, retry, and manage import jobs
3. **Settings Configuration**: Configure worker service and defaults
4. **Job History**: Complete audit trail with filtering options

## API Endpoints

The plugin provides REST API endpoints for the worker service:

- `POST /wp-json/aoikumo-importer/v1/job-status` - Update job status
- `POST /wp-json/aoikumo-importer/v1/job-progress` - Update job progress

### Authentication

All API calls require HMAC signature authentication:
- Header: `X-HMAC-Signature`
- Header: `X-Timestamp`
- Body: JSON payload
- Signature: `hash_hmac('sha256', body, secret)`

## Worker Service Integration

Your Node.js worker service should:

1. **Receive Jobs**: Accept job requests from WordPress
2. **Process Data**: Read Google Sheets and process according to mapping
3. **Automate Aoikumo**: Use Playwright for web automation
4. **Report Progress**: Send status updates back to WordPress
5. **Handle Errors**: Log failures and provide retry mechanisms

### Example Worker Service Structure

```javascript
// Basic structure for your worker service
const express = require('express');
const { google } = require('googleapis');
const { chromium } = require('playwright');

app.post('/api/jobs', async (req, res) => {
  // Verify HMAC signature
  // Process Google Sheets data
  // Automate Aoikumo forms
  // Send progress updates to WordPress
});
```

## Security Features

- **HMAC Authentication**: Secure communication between WordPress and worker
- **Nonce Verification**: CSRF protection for AJAX requests
- **Input Sanitization**: All user inputs are properly sanitized
- **Permission Checks**: Role-based access control
- **Timestamp Validation**: Prevents replay attacks

## Database Schema

### Jobs Table
- `id`: Unique job identifier
- `sheet_id`: Google Sheet ID
- `range`: Sheet range
- `mapping`: Data mapping configuration
- `is_dry_run`: Whether this is a dry run
- `user_id`: WordPress user who created the job
- `status`: Current job status
- `progress_data`: JSON progress information
- `created_at`: Job creation timestamp
- `updated_at`: Last update timestamp

### Job Logs Table
- `id`: Log entry identifier
- `job_id`: Associated job ID
- `row_number`: Row number in the sheet
- `status`: Success/failure status
- `message`: Detailed message or error
- `created_at`: Log entry timestamp

## Troubleshooting

### Common Issues

1. **Worker Service Connection Failed**
   - Verify worker service URL is correct
   - Check HMAC secret matches
   - Ensure worker service is running

2. **Jobs Not Processing**
   - Check worker service logs
   - Verify Google Sheets API access
   - Check Aoikumo credentials

3. **Import Failures**
   - Review job logs for specific errors
   - Verify data format matches mapping
   - Check Aoikumo form structure

### Debug Mode

Enable WordPress debug mode to see detailed error messages:
```php
// wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## Development

### File Structure
```
aoikumo-importer/
├── aoikumo-importer.php          # Main plugin file
├── includes/                     # PHP classes
│   ├── class-aoikumo-importer.php
│   ├── class-aoikumo-importer-admin.php
│   ├── class-aoikumo-importer-api.php
│   └── class-aoikumo-importer-jobs.php
├── templates/                    # PHP templates
│   ├── importer-interface.php
│   ├── admin-page.php
│   └── history-page.php
├── assets/                       # Frontend assets
│   ├── js/
│   │   ├── aoikumo-importer.js
│   │   └── admin.js
│   └── css/
│       └── aoikumo-importer.css
└── README.md
```

### Hooks and Filters

The plugin provides several hooks for customization:

```php
// Modify job data before processing
add_filter('aoikumo_importer_job_data', function($job_data) {
    // Custom modifications
    return $job_data;
});

// Custom validation
add_filter('aoikumo_importer_validate_job', function($is_valid, $job_data) {
    // Custom validation logic
    return $is_valid;
}, 10, 2);
```

## Support

For support and questions:
1. Check the troubleshooting section above
2. Review WordPress error logs
3. Verify worker service configuration
4. Check Google Sheets API permissions

## Changelog

### Version 1.0.0
- Initial release
- Google Sheets integration
- Aoikumo automation support
- User-friendly interface
- Job management system
- Security features

## License

This plugin is licensed under the GPL v2 or later.

## Contributing

Contributions are welcome! Please ensure your code follows WordPress coding standards and includes proper documentation.

---

**Note**: This plugin requires an external Node.js worker service to handle the actual Google Sheets processing and Aoikumo automation. The WordPress plugin provides the user interface and job management, while the worker service handles the heavy lifting of data processing and web automation.
