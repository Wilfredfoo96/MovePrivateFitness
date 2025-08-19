const express = require('express');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', (req, res) => {
    try {
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        };

        logger.debug('Health check requested', healthData);
        
        res.json(healthData);
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/health/detailed
 * Detailed health check with service status
 */
router.get('/detailed', async (req, res) => {
    try {
        const healthChecks = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            services: {}
        };

        // Check Google Sheets service
        try {
            const GoogleSheetsService = require('../services/googleSheets');
            const sheetsService = new GoogleSheetsService();
            healthChecks.services.googleSheets = 'available';
        } catch (error) {
            healthChecks.services.googleSheets = 'error';
            healthChecks.status = 'degraded';
        }

        // Check WordPress communication
        try {
            const WordPressCommunicationService = require('../services/wordpressCommunication');
            const wpService = new WordPressCommunicationService();
            healthChecks.services.wordpress = 'available';
        } catch (error) {
            healthChecks.services.wordpress = 'error';
            healthChecks.status = 'degraded';
        }

        // Check environment variables
        const requiredEnvVars = [
            'WORDPRESS_URL',
            'WORDPRESS_HMAC_SECRET',
            'GOOGLE_SERVICE_ACCOUNT_EMAIL',
            'GOOGLE_PRIVATE_KEY',
            'AOIKUMO_LOGIN_URL',
            'AOIKUMO_USERNAME',
            'AOIKUMO_PASSWORD'
        ];

        healthChecks.environment_variables = {};
        for (const envVar of requiredEnvVars) {
            healthChecks.environment_variables[envVar] = process.env[envVar] ? 'set' : 'missing';
            if (!process.env[envVar]) {
                healthChecks.status = 'degraded';
            }
        }

        logger.debug('Detailed health check requested', healthChecks);
        
        res.json(healthChecks);
    } catch (error) {
        logger.error('Detailed health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/health/ready
 * Readiness probe for Kubernetes/container orchestration
 */
router.get('/ready', (req, res) => {
    try {
        // Check if the service is ready to accept requests
        const isReady = process.env.NODE_ENV !== 'test';
        
        if (isReady) {
            res.json({
                status: 'ready',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not_ready',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/health/live
 * Liveness probe for Kubernetes/container orchestration
 */
router.get('/live', (req, res) => {
    try {
        // Simple check if the process is alive
        res.json({
            status: 'alive',
            timestamp: new Date().toISOString(),
            pid: process.pid
        });
    } catch (error) {
        logger.error('Liveness check failed:', error);
        res.status(500).json({
            status: 'dead',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;

