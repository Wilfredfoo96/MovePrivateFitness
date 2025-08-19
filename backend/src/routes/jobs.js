const express = require('express');
const { logger } = require('../utils/logger');
const JobProcessor = require('../services/jobProcessor');
const { sanitizeForLogging } = require('../utils/security');

const router = express.Router();
const jobProcessor = new JobProcessor();

/**
 * POST /api/jobs/process
 * Process a new import job
 */
router.post('/process', async (req, res) => {
    try {
        const jobData = req.body;
        
        logger.info('Received job processing request', {
            jobData: sanitizeForLogging(jobData)
        });

        // Validate required fields
        const requiredFields = ['job_id', 'sheet_id', 'range', 'mapping'];
        for (const field of requiredFields) {
            if (!jobData[field]) {
                return res.status(400).json({
                    error: `Missing required field: ${field}`
                });
            }
        }

        // Validate mapping format
        if (!jobData.mapping.includes('.')) {
            return res.status(400).json({
                error: 'Invalid mapping format. Expected format: Category.Type (e.g., Customers.Basic)'
            });
        }

        // Process job asynchronously
        jobProcessor.processJob(jobData)
            .then(() => {
                logger.info('Job processed successfully', { jobId: jobData.job_id });
            })
            .catch((error) => {
                logger.error('Job processing failed:', error);
            });

        // Return immediate response
        res.json({
            success: true,
            message: 'Job queued for processing',
            job_id: jobData.job_id,
            status: 'queued'
        });

    } catch (error) {
        logger.error('Error processing job request:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/jobs/validate
 * Validate Google Sheets access and data structure
 */
router.post('/validate', async (req, res) => {
    try {
        const { sheet_id, range } = req.body;
        
        logger.info('Received sheet validation request', { sheet_id, range });

        if (!sheet_id || !range) {
            return res.status(400).json({
                error: 'Missing required fields: sheet_id and range'
            });
        }

        // Test Google Sheets access
        const googleSheets = require('../services/googleSheets');
        const sheetsService = new googleSheets();
        
        try {
            // Validate access
            const hasAccess = await sheetsService.validateAccess(sheet_id);
            if (!hasAccess) {
                return res.status(403).json({
                    error: 'Access denied to Google Sheets. Check permissions and service account configuration.'
                });
            }

            // Get metadata
            const metadata = await sheetsService.getSheetMetadata(sheet_id);
            
            // Read sample data
            const sampleData = await sheetsService.readSheetData(sheet_id, range);
            
            if (!sampleData || sampleData.length < 2) {
                return res.status(400).json({
                    error: 'No data found in sheet or insufficient rows. Ensure sheet has headers and data rows.'
                });
            }

            // Parse headers
            const headers = sampleData[0];
            const dataRows = sampleData.slice(1, 6); // First 5 data rows for preview

            res.json({
                success: true,
                message: 'Sheet validation successful',
                metadata: {
                    title: metadata.title,
                    total_sheets: metadata.sheets.length
                },
                data_preview: {
                    headers: headers,
                    sample_rows: dataRows,
                    total_rows: sampleData.length - 1
                }
            });

        } catch (sheetsError) {
            logger.error('Google Sheets validation failed:', sheetsError);
            res.status(500).json({
                error: `Google Sheets validation failed: ${sheetsError.message}`
            });
        }

    } catch (error) {
        logger.error('Error validating sheet:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/jobs/status/:jobId
 * Get status of a specific job
 */
router.get('/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        logger.info('Received job status request', { jobId });

        // This would typically query a local job database
        // For now, we'll return a basic response
        res.json({
            job_id: jobId,
            status: 'processing', // This would be dynamic
            message: 'Job status endpoint - implement local job tracking if needed'
        });

    } catch (error) {
        logger.error('Error getting job status:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/jobs/cancel/:jobId
 * Cancel a running job
 */
router.post('/cancel/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        logger.info('Received job cancellation request', { jobId });

        // This would implement job cancellation logic
        // For now, we'll return a basic response
        res.json({
            success: true,
            message: 'Job cancellation requested',
            job_id: jobId
        });

    } catch (error) {
        logger.error('Error cancelling job:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/jobs/mappings
 * Get available mapping configurations
 */
router.get('/mappings', (req, res) => {
    try {
        logger.info('Received mappings request');

        const mappings = [
            {
                id: 'Customers.Basic',
                name: 'Customers - Basic',
                description: 'Import basic customer information (name, email, phone)',
                required_fields: ['name', 'email', 'phone'],
                optional_fields: ['company', 'notes']
            },
            {
                id: 'Customers.Full',
                name: 'Customers - Full Profile',
                description: 'Import complete customer profiles with addresses and company details',
                required_fields: ['name', 'email', 'phone', 'address', 'company'],
                optional_fields: ['website', 'notes', 'tags']
            },
            {
                id: 'Products.Basic',
                name: 'Products - Basic',
                description: 'Import basic product information (name, price, category)',
                required_fields: ['name', 'price', 'category'],
                optional_fields: ['description', 'sku', 'weight']
            },
            {
                id: 'Orders.Basic',
                name: 'Orders - Basic',
                description: 'Import basic order information (order number, customer, total)',
                required_fields: ['order_number', 'customer_email', 'total'],
                optional_fields: ['order_date', 'status', 'notes']
            }
        ];

        res.json({
            success: true,
            mappings: mappings
        });

    } catch (error) {
        logger.error('Error getting mappings:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

module.exports = router;

