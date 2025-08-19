<?php
/**
 * Plugin Name: Aoikumo Importer
 * Plugin URI: https://example.com/aoikumo-importer
 * Description: Import structured data from Google Sheets into Aoikumo automatically with a user-friendly interface.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: aoikumo-importer
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('AOIKUMO_IMPORTER_VERSION', '1.0.0');
define('AOIKUMO_IMPORTER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('AOIKUMO_IMPORTER_PLUGIN_URL', plugin_dir_url(__FILE__));
define('AOIKUMO_IMPORTER_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Include required files
require_once AOIKUMO_IMPORTER_PLUGIN_DIR . 'includes/class-aoikumo-importer.php';
require_once AOIKUMO_IMPORTER_PLUGIN_DIR . 'includes/class-aoikumo-importer-admin.php';
require_once AOIKUMO_IMPORTER_PLUGIN_DIR . 'includes/class-aoikumo-importer-api.php';
require_once AOIKUMO_IMPORTER_PLUGIN_DIR . 'includes/class-aoikumo-importer-jobs.php';

// Initialize the plugin
function aoikumo_importer_init() {
    $plugin = Aoikumo_Importer::get_instance();
    $plugin->init();
}
add_action('plugins_loaded', 'aoikumo_importer_init');

// Activation hook
register_activation_hook(__FILE__, 'aoikumo_importer_activate');
function aoikumo_importer_activate() {
    // Create database tables
    Aoikumo_Importer_Jobs::create_tables();
    
    // Set default options
    add_option('aoikumo_importer_worker_url', '');
    add_option('aoikumo_importer_hmac_secret', wp_generate_password(64, false));
    add_option('aoikumo_importer_default_sheet_id', '');
    add_option('aoikumo_importer_default_range', 'A:Z');
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'aoikumo_importer_deactivate');
function aoikumo_importer_deactivate() {
    // Clean up scheduled events
    wp_clear_scheduled_hook('aoikumo_importer_cleanup_logs');
}
