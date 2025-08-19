const crypto = require('crypto');
const { logger } = require('./logger');

/**
 * Verify HMAC signature from WordPress
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function verifyHmac(req, res, next) {
    try {
        const signature = req.headers['x-aoikumo-signature'];
        const timestamp = req.headers['x-aoikumo-timestamp'];
        const hmacSecret = process.env.WORDPRESS_HMAC_SECRET;

        if (!signature || !timestamp || !hmacSecret) {
            logger.warn('Missing HMAC verification headers', {
                hasSignature: !!signature,
                hasTimestamp: !!timestamp,
                hasSecret: !!hmacSecret
            });
            return res.status(401).json({
                error: 'Missing authentication headers'
            });
        }

        // Check if timestamp is recent (within 5 minutes)
        const requestTime = parseInt(timestamp);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = Math.abs(currentTime - requestTime);

        if (timeDiff > 300) { // 5 minutes
            logger.warn('Request timestamp too old', {
                requestTime,
                currentTime,
                timeDiff
            });
            return res.status(401).json({
                error: 'Request timestamp too old'
            });
        }

        // Create expected signature
        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', hmacSecret)
            .update(payload + timestamp)
            .digest('hex');

        // Compare signatures
        if (signature !== expectedSignature) {
            logger.warn('HMAC signature verification failed', {
                received: signature,
                expected: expectedSignature
            });
            return res.status(401).json({
                error: 'Invalid signature'
            });
        }

        logger.info('HMAC verification successful');
        next();
    } catch (error) {
        logger.error('HMAC verification error:', error);
        res.status(500).json({
            error: 'Authentication error'
        });
    }
}

/**
 * Generate HMAC signature for outgoing requests
 * @param {string} payload - Request payload
 * @param {string} secret - HMAC secret
 * @returns {Object} - Object containing signature and timestamp
 */
function generateHmac(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
        .createHmac('sha256', secret)
        .update(payload + timestamp)
        .digest('hex');

    return {
        signature,
        timestamp
    };
}

/**
 * Sanitize sensitive data for logging
 * @param {Object} data - Data object to sanitize
 * @returns {Object} - Sanitized data object
 */
function sanitizeForLogging(data) {
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'private_key'];
    const sanitized = { ...data };

    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });

    return sanitized;
}

module.exports = {
    verifyHmac,
    generateHmac,
    sanitizeForLogging
};

