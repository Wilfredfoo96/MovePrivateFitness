const { chromium } = require('playwright');
const { logger } = require('../utils/logger');

class AoikumoAutomationService {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isLoggedIn = false;
    }

    /**
     * Initialize browser
     */
    async initializeBrowser() {
        try {
            this.browser = await chromium.launch({
                headless: process.env.BROWSER_HEADLESS === 'true',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            this.context = await this.browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 }
            });

            this.page = await this.context.newPage();
            
            // Set timeout
            this.page.setDefaultTimeout(parseInt(process.env.BROWSER_TIMEOUT) || 30000);
            
            logger.info('Browser initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize browser:', error);
            throw error;
        }
    }

    /**
     * Login to Aoikumo
     */
    async login() {
        try {
            if (!this.page) {
                await this.initializeBrowser();
            }

            logger.info('Logging into Aoikumo...');

            // Navigate to login page
            await this.page.goto(process.env.AOIKUMO_LOGIN_URL);
            
            // Wait for login form to load
            await this.page.waitForSelector('input[name="username"], input[name="email"], input[type="email"]', { timeout: 10000 });
            
            // Fill login form
            const usernameSelector = await this.page.$('input[name="username"], input[name="email"], input[type="email"]');
            const passwordSelector = await this.page.$('input[name="password"], input[type="password"]');
            
            if (!usernameSelector || !passwordSelector) {
                throw new Error('Login form elements not found');
            }

            await usernameSelector.fill(process.env.AOIKUMO_USERNAME);
            await passwordSelector.fill(process.env.AOIKUMO_PASSWORD);
            
            // Submit form
            const submitButton = await this.page.$('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                await submitButton.click();
            } else {
                // Try pressing Enter
                await this.page.keyboard.press('Enter');
            }
            
            // Wait for login to complete (redirect or dashboard element)
            await this.page.waitForLoadState('networkidle');
            
            // Check if login was successful
            const isLoggedIn = await this.checkLoginStatus();
            if (!isLoggedIn) {
                throw new Error('Login failed - check credentials');
            }
            
            this.isLoggedIn = true;
            logger.info('Successfully logged into Aoikumo');
            
        } catch (error) {
            logger.error('Login failed:', error);
            throw error;
        }
    }

    /**
     * Check if user is logged in
     */
    async checkLoginStatus() {
        try {
            // Check for common elements that indicate successful login
            const loginIndicators = [
                'a[href*="logout"]',
                'a[href*="profile"]',
                '.user-menu',
                '.dashboard',
                '[data-user]'
            ];
            
            for (const selector of loginIndicators) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        return true;
                    }
                } catch (e) {
                    // Continue checking other selectors
                }
            }
            
            return false;
        } catch (error) {
            logger.warn('Error checking login status:', error);
            return false;
        }
    }

    /**
     * Navigate to a specific page in Aoikumo
     */
    async navigateToPage(url) {
        try {
            if (!this.isLoggedIn) {
                await this.login();
            }
            
            logger.info(`Navigating to: ${url}`);
            await this.page.goto(url);
            await this.page.waitForLoadState('networkidle');
            
        } catch (error) {
            logger.error(`Failed to navigate to ${url}:`, error);
            throw error;
        }
    }

    /**
     * Fill form with data
     */
    async fillForm(formData, formSelectors) {
        try {
            logger.info('Filling form with data', { rowCount: formData.length });
            
            for (let i = 0; i < formData.length; i++) {
                const row = formData[i];
                const rowNumber = row._rowNumber || (i + 1);
                
                logger.info(`Processing row ${rowNumber}`, { data: Object.keys(row) });
                
                try {
                    await this.fillFormRow(row, formSelectors);
                    logger.info(`Successfully processed row ${rowNumber}`);
                } catch (error) {
                    logger.error(`Failed to process row ${rowNumber}:`, error);
                    throw error;
                }
            }
            
            logger.info('Form filling completed successfully');
        } catch (error) {
            logger.error('Form filling failed:', error);
            throw error;
        }
    }

    /**
     * Fill a single form row
     */
    async fillFormRow(rowData, formSelectors) {
        for (const [fieldName, selector] of Object.entries(formSelectors)) {
            if (rowData[fieldName] !== undefined && rowData[fieldName] !== null) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        // Clear existing value
                        await element.clear();
                        
                        // Fill with new value
                        await element.fill(rowData[fieldName].toString());
                        
                        logger.debug(`Filled field ${fieldName} with value: ${rowData[fieldName]}`);
                    } else {
                        logger.warn(`Form element not found for field: ${fieldName}`, { selector });
                    }
                } catch (error) {
                    logger.warn(`Failed to fill field ${fieldName}:`, error);
                }
            }
        }
    }

    /**
     * Submit form
     */
    async submitForm(submitSelector = 'button[type="submit"], input[type="submit"]') {
        try {
            const submitButton = await this.page.$(submitSelector);
            if (submitButton) {
                await submitButton.click();
                await this.page.waitForLoadState('networkidle');
                logger.info('Form submitted successfully');
            } else {
                throw new Error('Submit button not found');
            }
        } catch (error) {
            logger.error('Form submission failed:', error);
            throw error;
        }
    }

    /**
     * Take screenshot for debugging
     */
    async takeScreenshot(filename) {
        try {
            if (this.page) {
                const screenshotPath = `./logs/screenshots/${filename}.png`;
                await this.page.screenshot({ path: screenshotPath, fullPage: true });
                logger.info(`Screenshot saved: ${screenshotPath}`);
                return screenshotPath;
            }
        } catch (error) {
            logger.warn('Failed to take screenshot:', error);
        }
        return null;
    }

    /**
     * Close browser
     */
    async closeBrowser() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.context = null;
                this.page = null;
                this.isLoggedIn = false;
                logger.info('Browser closed successfully');
            }
        } catch (error) {
            logger.error('Error closing browser:', error);
        }
    }

    /**
     * Get page content for debugging
     */
    async getPageContent() {
        try {
            if (this.page) {
                return await this.page.content();
            }
        } catch (error) {
            logger.error('Failed to get page content:', error);
        }
        return null;
    }
}

module.exports = AoikumoAutomationService;

