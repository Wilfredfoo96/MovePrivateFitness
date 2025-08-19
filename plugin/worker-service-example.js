/**
 * Sample Node.js Worker Service for Aoikumo Importer
 * 
 * This is an example of how to set up the worker service that WordPress
 * communicates with to process Google Sheets data and automate Aoikumo.
 * 
 * You'll need to customize this for your specific use case and add
 * proper error handling, logging, and security measures.
 */

const express = require('express');
const { google } = require('googleapis');
const { chromium } = require('playwright');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Configuration
const config = {
    hmacSecret: process.env.HMAC_SECRET, // Must match WordPress HMAC secret
    googleServiceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    aoikumoCredentials: {
        username: process.env.AOIKUMO_USERNAME,
        password: process.env.AOIKUMO_PASSWORD
    }
};

// HMAC verification middleware
function verifyHMAC(req, res, next) {
    const signature = req.headers['x-hmac-signature'];
    const timestamp = req.headers['x-timestamp'];
    const body = JSON.stringify(req.body);
    
    if (!signature || !timestamp) {
        return res.status(401).json({ error: 'Missing authentication headers' });
    }
    
    // Check timestamp (allow 5 minute window)
    if (Math.abs(Date.now() - parseInt(timestamp)) > 300000) {
        return res.status(401).json({ error: 'Request expired' });
    }
    
    // Verify signature
    const expectedSignature = crypto
        .createHmac('sha256', config.hmacSecret)
        .update(body)
        .digest('hex');
    
    if (!crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    )) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    next();
}

// Initialize Google Sheets API
function getGoogleSheets() {
    const auth = new google.auth.GoogleAuth({
        keyFile: config.googleServiceAccount,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    
    return google.sheets({ version: 'v4', auth });
}

// Initialize Playwright browser
async function getBrowser() {
    return await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
}

// Test endpoint
app.post('/api/test', verifyHMAC, (req, res) => {
    res.json({ success: true, message: 'Connection successful' });
});

// Main job processing endpoint
app.post('/api/jobs', verifyHMAC, async (req, res) => {
    const { job_id, sheet_id, range, mapping, is_dry_run, callback_url, progress_url } = req.body;
    
    try {
        // Acknowledge job received
        res.json({ success: true, message: 'Job accepted' });
        
        // Process job asynchronously
        processJob(job_id, sheet_id, range, mapping, is_dry_run, callback_url, progress_url);
        
    } catch (error) {
        console.error('Error processing job:', error);
        // Send failure status to WordPress
        await sendJobStatus(callback_url, job_id, 'failed', {
            error: error.message
        });
    }
});

// Main job processing function
async function processJob(job_id, sheet_id, range, mapping, is_dry_run, callback_url, progress_url) {
    let browser;
    
    try {
        // Update status to processing
        await sendJobStatus(callback_url, job_id, 'processing');
        
        // Read Google Sheets data
        const sheets = getGoogleSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheet_id,
            range: range
        });
        
        const rows = response.data.values || [];
        const headers = rows[0];
        const dataRows = rows.slice(1);
        
        if (dataRows.length === 0) {
            throw new Error('No data found in specified range');
        }
        
        // Update progress with total rows
        await sendProgress(progress_url, job_id, 0, dataRows.length, 0, 0);
        
        // Initialize browser for Aoikumo automation
        browser = await getBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Login to Aoikumo
        await loginToAoikumo(page);
        
        // Process each row
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowNumber = i + 2; // +2 because we skipped header and arrays are 0-indexed
            
            try {
                if (!is_dry_run) {
                    await processRow(page, row, headers, mapping);
                    successCount++;
                } else {
                    // For dry run, just validate the data
                    validateRowData(row, headers, mapping);
                    successCount++;
                }
                
                // Update progress
                await sendProgress(progress_url, job_id, rowNumber, dataRows.length, successCount, errorCount);
                
            } catch (error) {
                errorCount++;
                console.error(`Error processing row ${rowNumber}:`, error);
                
                // Log the error
                await sendJobStatus(callback_url, job_id, 'processing', null, [{
                    row_number: rowNumber,
                    status: 'failed',
                    message: error.message
                }]);
            }
        }
        
        // Job completed
        const finalStatus = errorCount === 0 ? 'completed' : 'completed';
        await sendJobStatus(callback_url, job_id, finalStatus, {
            total_rows: dataRows.length,
            success_count: successCount,
            error_count: errorCount
        });
        
    } catch (error) {
        console.error('Job processing failed:', error);
        await sendJobStatus(callback_url, job_id, 'failed', {
            error: error.message
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Login to Aoikumo
async function loginToAoikumo(page) {
    try {
        // Navigate to login page (customize URL for your Aoikumo instance)
        await page.goto('https://your-aoikumo-instance.com/login');
        
        // Fill login form
        await page.fill('input[name="username"]', config.aoikumoCredentials.username);
        await page.fill('input[name="password"]', config.aoikumoCredentials.password);
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Wait for successful login (customize selector)
        await page.waitForSelector('.dashboard', { timeout: 10000 });
        
        console.log('Successfully logged into Aoikumo');
        
    } catch (error) {
        throw new Error(`Failed to login to Aoikumo: ${error.message}`);
    }
}

// Process individual row
async function processRow(page, row, headers, mapping) {
    // This function should be customized based on your specific Aoikumo form structure
    // and the mapping configuration you're using
    
    try {
        // Example: Navigate to form page
        await page.goto('https://your-aoikumo-instance.com/forms/customer');
        
        // Map row data to form fields based on mapping configuration
        const mappedData = mapRowToForm(row, headers, mapping);
        
        // Fill form fields
        for (const [fieldName, value] of Object.entries(mappedData)) {
            const selector = getFieldSelector(fieldName);
            if (selector && value) {
                await page.fill(selector, value);
            }
        }
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Wait for success message or redirect
        await page.waitForSelector('.success-message', { timeout: 5000 });
        
        console.log('Row processed successfully');
        
    } catch (error) {
        throw new Error(`Failed to process row: ${error.message}`);
    }
}

// Validate row data (for dry runs)
function validateRowData(row, headers, mapping) {
    // Add your validation logic here
    // Check required fields, data types, etc.
    
    if (row.length !== headers.length) {
        throw new Error('Row data length does not match headers');
    }
    
    // Add more validation as needed
}

// Map row data to form fields
function mapRowToForm(row, headers, mapping) {
    // This function should be customized based on your mapping configuration
    // Example mapping: "Customers.Basic" might map specific columns to form fields
    
    const mappedData = {};
    
    // Example mapping logic
    headers.forEach((header, index) => {
        const value = row[index];
        
        switch (header.toLowerCase()) {
            case 'first_name':
                mappedData['firstName'] = value;
                break;
            case 'last_name':
                mappedData['lastName'] = value;
                break;
            case 'email':
                mappedData['email'] = value;
                break;
            case 'phone':
                mappedData['phone'] = value;
                break;
            // Add more mappings as needed
        }
    });
    
    return mappedData;
}

// Get field selector for form element
function getFieldSelector(fieldName) {
    // This function should return the appropriate CSS selector for each form field
    // Customize based on your Aoikumo form structure
    
    const selectors = {
        'firstName': 'input[name="firstName"]',
        'lastName': 'input[name="lastName"]',
        'email': 'input[name="email"]',
        'phone': 'input[name="phone"]',
        // Add more field selectors as needed
    };
    
    return selectors[fieldName] || null;
}

// Send job status to WordPress
async function sendJobStatus(callbackUrl, jobId, status, progress = null, logs = null) {
    try {
        const payload = {
            job_id: jobId,
            status: status,
            progress: progress,
            logs: logs
        };
        
        const response = await fetch(callbackUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-HMAC-Signature': generateHMAC(payload),
                'X-Timestamp': Date.now().toString()
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            console.error('Failed to send job status:', response.statusText);
        }
        
    } catch (error) {
        console.error('Error sending job status:', error);
    }
}

// Send progress update to WordPress
async function sendProgress(progressUrl, jobId, currentRow, totalRows, successCount, errorCount) {
    try {
        const payload = {
            job_id: jobId,
            current_row: currentRow,
            total_rows: totalRows,
            success_count: successCount,
            error_count: errorCount
        };
        
        const response = await fetch(progressUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-HMAC-Signature': generateHMAC(payload),
                'X-Timestamp': Date.now().toString()
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            console.error('Failed to send progress update:', response.statusText);
        }
        
    } catch (error) {
        console.error('Error sending progress update:', error);
    }
}

// Generate HMAC signature
function generateHMAC(payload) {
    return crypto
        .createHmac('sha256', config.hmacSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Start server
app.listen(PORT, () => {
    console.log(`Aoikumo Importer Worker Service running on port ${PORT}`);
    console.log('Make sure to configure your environment variables:');
    console.log('- HMAC_SECRET (must match WordPress)');
    console.log('- GOOGLE_SERVICE_ACCOUNT_PATH');
    console.log('- AOIKUMO_USERNAME');
    console.log('- AOIKUMO_PASSWORD');
});

/**
 * Environment Variables (.env file):
 * 
 * HMAC_SECRET=your_hmac_secret_from_wordpress
 * GOOGLE_SERVICE_ACCOUNT_PATH=path/to/service-account.json
 * AOIKUMO_USERNAME=your_aoikumo_username
 * AOIKUMO_PASSWORD=your_aoikumo_password
 * PORT=3000
 * 
 * Dependencies (package.json):
 * {
 *   "dependencies": {
 *     "express": "^4.18.0",
 *     "googleapis": "^118.0.0",
 *     "playwright": "^1.35.0",
 *     "dotenv": "^16.0.0"
 *   }
 * }
 */
