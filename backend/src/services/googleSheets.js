const { google } = require('googleapis');
const { logger } = require('../utils/logger');

class GoogleSheetsService {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.initializeAuth();
    }

    /**
     * Initialize Google Sheets authentication
     */
    async initializeAuth() {
        try {
            const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
            
            this.auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: privateKey,
                    type: 'service_account'
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            
            logger.info('Google Sheets authentication initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Google Sheets authentication:', error);
            throw error;
        }
    }

    /**
     * Read data from Google Sheets
     * @param {string} spreadsheetId - Google Sheets ID
     * @param {string} range - Range to read (e.g., 'A:Z')
     * @returns {Promise<Array>} - Array of rows
     */
    async readSheetData(spreadsheetId, range) {
        try {
            if (!this.sheets) {
                await this.initializeAuth();
            }

            logger.info(`Reading sheet data`, {
                spreadsheetId,
                range
            });

            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range
            });

            const rows = response.data.values;
            
            if (!rows || rows.length === 0) {
                logger.warn('No data found in sheet', { spreadsheetId, range });
                return [];
            }

            logger.info(`Successfully read ${rows.length} rows from sheet`);
            return rows;
        } catch (error) {
            logger.error('Error reading Google Sheets data:', error);
            throw new Error(`Failed to read Google Sheets: ${error.message}`);
        }
    }

    /**
     * Get sheet metadata
     * @param {string} spreadsheetId - Google Sheets ID
     * @returns {Promise<Object>} - Sheet metadata
     */
    async getSheetMetadata(spreadsheetId) {
        try {
            if (!this.sheets) {
                await this.initializeAuth();
            }

            const response = await this.sheets.spreadsheets.get({
                spreadsheetId
            });

            const sheet = response.data;
            const metadata = {
                title: sheet.properties.title,
                sheets: sheet.sheets.map(s => ({
                    title: s.properties.title,
                    sheetId: s.properties.sheetId,
                    gridProperties: s.properties.gridProperties
                }))
            };

            logger.info('Retrieved sheet metadata', { spreadsheetId, title: metadata.title });
            return metadata;
        } catch (error) {
            logger.error('Error getting sheet metadata:', error);
            throw new Error(`Failed to get sheet metadata: ${error.message}`);
        }
    }

    /**
     * Validate sheet access
     * @param {string} spreadsheetId - Google Sheets ID
     * @returns {Promise<boolean>} - Whether access is valid
     */
    async validateAccess(spreadsheetId) {
        try {
            await this.getSheetMetadata(spreadsheetId);
            return true;
        } catch (error) {
            logger.warn('Sheet access validation failed', { spreadsheetId, error: error.message });
            return false;
        }
    }

    /**
     * Parse sheet data with headers
     * @param {Array} rows - Raw sheet rows
     * @returns {Array} - Array of objects with header keys
     */
    parseDataWithHeaders(rows) {
        if (!rows || rows.length < 2) {
            return [];
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        return dataRows.map((row, index) => {
            const obj = {};
            headers.forEach((header, colIndex) => {
                if (header && row[colIndex] !== undefined) {
                    obj[header.trim()] = row[colIndex];
                }
            });
            obj._rowNumber = index + 2; // +2 because we start from row 2 (after headers)
            return obj;
        });
    }
}

module.exports = GoogleSheetsService;

