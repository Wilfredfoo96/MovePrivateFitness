const axios = require('axios');
const { logger } = require('../utils/logger');
const { generateHmac } = require('../utils/security');

class WordPressCommunicationService {
    constructor() {
        this.baseUrl = process.env.WORDPRESS_URL;
        this.hmacSecret = process.env.WORDPRESS_HMAC_SECRET;
        
        if (!this.baseUrl || !this.hmacSecret) {
            throw new Error('WordPress configuration missing');
        }
        
        // Ensure base URL ends with slash
        if (!this.baseUrl.endsWith('/')) {
            this.baseUrl += '/';
        }
    }

    /**
     * Send job status update to WordPress
     */
    async updateJobStatus(jobId, status, progress = null) {
        try {
            const payload = {
                job_id: jobId,
                status: status,
                progress: progress,
                timestamp: new Date().toISOString()
            };

            const { signature, timestamp } = generateHmac(JSON.stringify(payload), this.hmacSecret);
            
            const response = await axios.post(`${this.baseUrl}wp-json/aoikumo-importer/v1/job-status`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Aoikumo-Signature': signature,
                    'X-Aoikumo-Timestamp': timestamp
                },
                timeout: 10000
            });

            logger.info('Job status updated successfully', { jobId, status, responseStatus: response.status });
            return response.data;
        } catch (error) {
            logger.error('Failed to update job status:', error);
            throw error;
        }
    }

    /**
     * Send job progress update to WordPress
     */
    async updateJobProgress(jobId, currentRow, totalRows, successCount, errorCount) {
        try {
            const payload = {
                job_id: jobId,
                current_row: currentRow,
                total_rows: totalRows,
                success_count: successCount,
                error_count: errorCount,
                timestamp: new Date().toISOString()
            };

            const { signature, timestamp } = generateHmac(JSON.stringify(payload), this.hmacSecret);
            
            const response = await axios.post(`${this.baseUrl}wp-json/aoikumo-importer/v1/job-progress`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Aoikumo-Signature': signature,
                    'X-Aoikumo-Timestamp': timestamp
                },
                timeout: 10000
            });

            logger.info('Job progress updated successfully', { 
                jobId, 
                currentRow, 
                totalRows, 
                successCount, 
                errorCount 
            });
            return response.data;
        } catch (error) {
            logger.error('Failed to update job progress:', error);
            throw error;
        }
    }

    /**
     * Send job log entry to WordPress
     */
    async addJobLog(jobId, rowNumber, status, message) {
        try {
            const payload = {
                job_id: jobId,
                row_number: rowNumber,
                status: status,
                message: message,
                timestamp: new Date().toISOString()
            };

            const { signature, timestamp } = generateHmac(JSON.stringify(payload), this.hmacSecret);
            
            const response = await axios.post(`${this.baseUrl}wp-json/aoikumo-importer/v1/job-log`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Aoikumo-Signature': signature,
                    'X-Aoikumo-Timestamp': timestamp
                },
                timeout: 10000
            });

            logger.info('Job log added successfully', { jobId, rowNumber, status });
            return response.data;
        } catch (error) {
            logger.error('Failed to add job log:', error);
            throw error;
        }
    }

    /**
     * Send job completion notification to WordPress
     */
    async notifyJobCompletion(jobId, results) {
        try {
            const payload = {
                job_id: jobId,
                status: 'completed',
                results: results,
                completed_at: new Date().toISOString(),
                timestamp: new Date().toISOString()
            };

            const { signature, timestamp } = generateHmac(JSON.stringify(payload), this.hmacSecret);
            
            const response = await axios.post(`${this.baseUrl}wp-json/aoikumo-importer/v1/job-complete`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Aoikumo-Signature': signature,
                    'X-Aoikumo-Timestamp': timestamp
                },
                timeout: 10000
            });

            logger.info('Job completion notified successfully', { jobId, results });
            return response.data;
        } catch (error) {
            logger.error('Failed to notify job completion:', error);
            throw error;
        }
    }

    /**
     * Send job failure notification to WordPress
     */
    async notifyJobFailure(jobId, error, failedRows = []) {
        try {
            const payload = {
                job_id: jobId,
                status: 'failed',
                error: error.message || error,
                failed_rows: failedRows,
                failed_at: new Date().toISOString(),
                timestamp: new Date().toISOString()
            };

            const { signature, timestamp } = generateHmac(JSON.stringify(payload), this.hmacSecret);
            
            const response = await axios.post(`${this.baseUrl}wp-json/aoikumo-importer/v1/job-failed`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Aoikumo-Signature': signature,
                    'X-Aoikumo-Timestamp': timestamp
                },
                timeout: 10000
            });

            logger.info('Job failure notified successfully', { jobId, error: error.message });
            return response.data;
        } catch (error) {
            logger.error('Failed to notify job failure:', error);
            throw error;
        }
    }

    /**
     * Test connection to WordPress
     */
    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}wp-json/aoikumo-importer/v1/health`, {
                timeout: 5000
            });

            logger.info('WordPress connection test successful', { status: response.status });
            return {
                success: true,
                status: response.status,
                message: 'Connection successful'
            };
        } catch (error) {
            logger.error('WordPress connection test failed:', error);
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    /**
     * Get job details from WordPress
     */
    async getJobDetails(jobId) {
        try {
            const response = await axios.get(`${this.baseUrl}wp-json/aoikumo-importer/v1/job/${jobId}`, {
                timeout: 10000
            });

            logger.info('Job details retrieved successfully', { jobId });
            return response.data;
        } catch (error) {
            logger.error('Failed to get job details:', error);
            throw error;
        }
    }
}

module.exports = WordPressCommunicationService;

