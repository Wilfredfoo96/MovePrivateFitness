const { logger } = require('../utils/logger');
const GoogleSheetsService = require('./googleSheets');
const AoikumoAutomationService = require('./aoikumoAutomation');
const WordPressCommunicationService = require('./wordpressCommunication');

class JobProcessor {
    constructor() {
        this.googleSheets = new GoogleSheetsService();
        this.aoikumo = new AoikumoAutomationService();
        this.wordpress = new WordPressCommunicationService();
        this.isProcessing = false;
    }

    /**
     * Process a job
     */
    async processJob(jobData) {
        if (this.isProcessing) {
            throw new Error('Another job is already processing');
        }

        this.isProcessing = true;
        const { job_id, sheet_id, range, mapping, is_dry_run } = jobData;

        try {
            logger.info('Starting job processing', { job_id, sheet_id, mapping, is_dry_run });

            // Update job status to processing
            await this.wordpress.updateJobStatus(job_id, 'processing');

            // Step 1: Read data from Google Sheets
            logger.info('Step 1: Reading data from Google Sheets');
            const sheetData = await this.googleSheets.readSheetData(sheet_id, range);
            
            if (!sheetData || sheetData.length < 2) {
                throw new Error('No data found in sheet or insufficient rows');
            }

            // Parse data with headers
            const parsedData = this.googleSheets.parseDataWithHeaders(sheetData);
            const totalRows = parsedData.length;

            logger.info(`Successfully read ${totalRows} rows from Google Sheets`);

            // Update progress
            await this.wordpress.updateJobProgress(job_id, 0, totalRows, 0, 0);

            // Step 2: Process data (dry run or actual import)
            if (is_dry_run) {
                logger.info('Step 2: Performing dry run validation');
                await this.performDryRun(job_id, parsedData, mapping);
            } else {
                logger.info('Step 2: Performing actual import');
                await this.performImport(job_id, parsedData, mapping);
            }

            // Step 3: Mark job as completed
            logger.info('Step 3: Marking job as completed');
            await this.wordpress.updateJobStatus(job_id, 'completed');

            logger.info('Job completed successfully', { job_id });

        } catch (error) {
            logger.error('Job processing failed:', error);
            
            // Update job status to failed
            await this.wordpress.notifyJobFailure(job_id, error);
            
            throw error;
        } finally {
            this.isProcessing = false;
            
            // Clean up browser
            try {
                await this.aoikumo.closeBrowser();
            } catch (cleanupError) {
                logger.warn('Browser cleanup failed:', cleanupError);
            }
        }
    }

    /**
     * Perform dry run validation
     */
    async performDryRun(jobId, data, mapping) {
        logger.info('Starting dry run validation', { jobId, rowCount: data.length });

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = row._rowNumber || (i + 2);

            try {
                // Validate row data
                const validationResult = await this.validateRowData(row, mapping);
                
                if (validationResult.isValid) {
                    successCount++;
                    await this.wordpress.addJobLog(jobId, rowNumber, 'success', 'Row validated successfully');
                } else {
                    errorCount++;
                    await this.wordpress.addJobLog(jobId, rowNumber, 'error', validationResult.error);
                }

                // Update progress
                await this.wordpress.updateJobProgress(jobId, i + 1, data.length, successCount, errorCount);

            } catch (error) {
                errorCount++;
                await this.wordpress.addJobLog(jobId, rowNumber, 'error', `Validation error: ${error.message}`);
                await this.wordpress.updateJobProgress(jobId, i + 1, data.length, successCount, errorCount);
            }
        }

        logger.info('Dry run completed', { jobId, successCount, errorCount });
        
        // Send completion notification
        await this.wordpress.notifyJobCompletion(jobId, {
            total_rows: data.length,
            success_count: successCount,
            error_count: errorCount,
            type: 'dry_run'
        });
    }

    /**
     * Perform actual import
     */
    async performImport(jobId, data, mapping) {
        logger.info('Starting actual import', { jobId, rowCount: data.length });

        // Login to Aoikumo
        await this.aoikumo.login();

        let successCount = 0;
        let errorCount = 0;
        const failedRows = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = row._rowNumber || (i + 2);

            try {
                // Process row in Aoikumo
                const importResult = await this.importRowToAoikumo(row, mapping);
                
                if (importResult.success) {
                    successCount++;
                    await this.wordpress.addJobLog(jobId, rowNumber, 'success', 'Row imported successfully');
                } else {
                    errorCount++;
                    failedRows.push({ rowNumber, error: importResult.error });
                    await this.wordpress.addJobLog(jobId, rowNumber, 'error', importResult.error);
                }

                // Update progress
                await this.wordpress.updateJobProgress(jobId, i + 1, data.length, successCount, errorCount);

            } catch (error) {
                errorCount++;
                failedRows.push({ rowNumber, error: error.message });
                await this.wordpress.addJobLog(jobId, rowNumber, 'error', `Import error: ${error.message}`);
                await this.wordpress.updateJobProgress(jobId, i + 1, data.length, successCount, errorCount);
            }
        }

        logger.info('Import completed', { jobId, successCount, errorCount });
        
        // Send completion notification
        await this.wordpress.notifyJobCompletion(jobId, {
            total_rows: data.length,
            success_count: successCount,
            error_count: errorCount,
            failed_rows: failedRows,
            type: 'import'
        });
    }

    /**
     * Validate row data
     */
    async validateRowData(rowData, mapping) {
        try {
            // Basic validation - check required fields based on mapping
            const requiredFields = this.getRequiredFieldsForMapping(mapping);
            
            for (const field of requiredFields) {
                if (!rowData[field] || rowData[field].toString().trim() === '') {
                    return {
                        isValid: false,
                        error: `Required field '${field}' is missing or empty`
                    };
                }
            }

            // Additional validation logic can be added here
            // For example, email format validation, phone number validation, etc.

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                error: `Validation error: ${error.message}`
            };
        }
    }

    /**
     * Import a single row to Aoikumo
     */
    async importRowToAoikumo(rowData, mapping) {
        try {
            // Get form selectors for the mapping
            const formSelectors = this.getFormSelectorsForMapping(mapping);
            
            // Navigate to the appropriate form page
            const formUrl = this.getFormUrlForMapping(mapping);
            await this.aoikumo.navigateToPage(formUrl);
            
            // Fill the form
            await this.aoikumo.fillFormRow(rowData, formSelectors);
            
            // Submit the form
            await this.aoikumo.submitForm();
            
            // Wait for submission to complete
            await this.aoikumo.page.waitForLoadState('networkidle');
            
            // Check for success indicators
            const isSuccess = await this.checkImportSuccess();
            
            if (isSuccess) {
                return { success: true };
            } else {
                return { success: false, error: 'Form submission did not complete successfully' };
            }
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get required fields for a mapping
     */
    getRequiredFieldsForMapping(mapping) {
        // This would be configured based on your specific mappings
        const mappingConfigs = {
            'Customers.Basic': ['name', 'email', 'phone'],
            'Customers.Full': ['name', 'email', 'phone', 'address', 'company'],
            'Products.Basic': ['name', 'price', 'category'],
            'Orders.Basic': ['order_number', 'customer_email', 'total']
        };

        return mappingConfigs[mapping] || ['name', 'email'];
    }

    /**
     * Get form selectors for a mapping
     */
    getFormSelectorsForMapping(mapping) {
        // This would be configured based on your specific mappings and Aoikumo form structure
        const selectorConfigs = {
            'Customers.Basic': {
                'name': 'input[name="customer_name"], input[name="name"]',
                'email': 'input[name="customer_email"], input[name="email"], input[type="email"]',
                'phone': 'input[name="customer_phone"], input[name="phone"], input[type="tel"]'
            },
            'Customers.Full': {
                'name': 'input[name="customer_name"], input[name="name"]',
                'email': 'input[name="customer_email"], input[name="email"], input[type="email"]',
                'phone': 'input[name="customer_phone"], input[name="phone"], input[type="tel"]',
                'address': 'textarea[name="customer_address"], input[name="address"]',
                'company': 'input[name="customer_company"], input[name="company"]'
            }
        };

        return selectorConfigs[mapping] || selectorConfigs['Customers.Basic'];
    }

    /**
     * Get form URL for a mapping
     */
    getFormUrlForMapping(mapping) {
        // This would be configured based on your specific mappings and Aoikumo URLs
        const urlConfigs = {
            'Customers.Basic': '/customers/add',
            'Customers.Full': '/customers/add-full',
            'Products.Basic': '/products/add',
            'Orders.Basic': '/orders/create'
        };

        const baseUrl = process.env.AOIKUMO_BASE_URL || 'https://aoikumo.com';
        return baseUrl + (urlConfigs[mapping] || '/customers/add');
    }

    /**
     * Check if import was successful
     */
    async checkImportSuccess() {
        try {
            // Look for success indicators on the page
            const successIndicators = [
                '.success-message',
                '.alert-success',
                '[data-status="success"]',
                'text=Successfully',
                'text=created',
                'text=added'
            ];

            for (const indicator of successIndicators) {
                try {
                    const element = await this.aoikumo.page.$(indicator);
                    if (element) {
                        return true;
                    }
                } catch (e) {
                    // Continue checking other indicators
                }
            }

            return false;
        } catch (error) {
            logger.warn('Error checking import success:', error);
            return false;
        }
    }
}

module.exports = JobProcessor;

