const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.WORDPRESS_URL || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HMAC verification middleware
const verifyHmac = (req, res, next) => {
    const hmacSecret = process.env.WORDPRESS_HMAC_SECRET;
    if (!hmacSecret) {
        return res.status(500).json({ error: 'HMAC secret not configured' });
    }

    const signature = req.headers['x-hmac-signature'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!signature || !timestamp) {
        return res.status(401).json({ error: 'Missing HMAC signature or timestamp' });
    }

    // Verify timestamp is within 5 minutes
    const now = Date.now();
    if (Math.abs(now - parseInt(timestamp)) > 5 * 60 * 1000) {
        return res.status(401).json({ error: 'Request timestamp expired' });
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
        .createHmac('sha256', hmacSecret)
        .update(payload + timestamp)
        .digest('hex');

    if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    next();
};

// Simple health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        security: 'enabled',
        features: ['security', 'rate-limiting', 'hmac-verification']
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Aoikumo Importer Worker',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        security: 'enabled',
        features: ['security', 'rate-limiting', 'hmac-verification']
    });
});

// Job processing endpoint
app.post('/api/jobs/process', verifyHmac, async (req, res) => {
    try {
        const { jobId, sheetId, range, mapping } = req.body;
        
        // Basic validation
        if (!jobId || !sheetId || !range || !mapping) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['jobId', 'sheetId', 'range', 'mapping']
            });
        }

        // Simulate job processing
        const jobStatus = {
            jobId,
            status: 'processing',
            progress: 0,
            message: 'Job started successfully',
            timestamp: new Date().toISOString()
        };

        // Send status update to WordPress (if configured)
        if (process.env.WORDPRESS_URL) {
            try {
                await axios.post(`${process.env.WORDPRESS_URL}/wp-json/aoikumo-importer/v1/jobs/${jobId}/status`, {
                    status: 'processing',
                    progress: 0,
                    message: 'Job started on worker service'
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-HMAC-Signature': crypto
                            .createHmac('sha256', process.env.WORDPRESS_HMAC_SECRET)
                            .update(JSON.stringify({ status: 'processing', progress: 0 }))
                            .digest('hex'),
                        'X-Timestamp': Date.now().toString()
                    }
                });
            } catch (error) {
                console.error('Failed to update WordPress:', error.message);
            }
        }

        res.json({
            success: true,
            message: 'Job processing started',
            jobId,
            status: 'processing'
        });

    } catch (error) {
        console.error('Job processing error:', error);
        res.status(500).json({
            error: 'Failed to start job processing',
            message: error.message
        });
    }
});

// Job status endpoint
app.get('/api/jobs/:jobId/status', (req, res) => {
    const { jobId } = req.params;
    res.json({
        jobId,
        status: 'processing',
        progress: 50,
        message: 'Job is running',
        timestamp: new Date().toISOString()
    });
});

// Basic error handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Only start server if not in Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;


