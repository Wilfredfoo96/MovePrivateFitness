<?php
/**
 * Admin functionality for Aoikumo Importer
 */

class Aoikumo_Importer_Admin {
    
    /**
     * Initialize admin functionality
     */
    public function init() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('Aoikumo Importer', 'aoikumo-importer'),
            __('Aoikumo Importer', 'aoikumo-importer'),
            'manage_options',
            'aoikumo-importer',
            array($this, 'admin_page'),
            'dashicons-upload',
            30
        );
        
        add_submenu_page(
            'aoikumo-importer',
            __('Settings', 'aoikumo-importer'),
            __('Settings', 'aoikumo-importer'),
            'manage_options',
            'aoikumo-importer-settings',
            array($this, 'settings_page')
        );
        
        add_submenu_page(
            'aoikumo-importer',
            __('Job History', 'aoikumo-importer'),
            __('Job History', 'aoikumo-importer'),
            'manage_options',
            'aoikumo-importer-history',
            array($this, 'history_page')
        );
    }
    
    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('aoikumo_importer_settings', 'aoikumo_importer_worker_url');
        register_setting('aoikumo_importer_settings', 'aoikumo_importer_hmac_secret');
        register_setting('aoikumo_importer_settings', 'aoikumo_importer_default_sheet_id');
        register_setting('aoikumo_importer_settings', 'aoikumo_importer_default_range');
        register_setting('aoikumo_importer_settings', 'aoikumo_importer_available_mappings');
        
        add_settings_section(
            'aoikumo_importer_general',
            __('General Settings', 'aoikumo-importer'),
            array($this, 'general_settings_section'),
            'aoikumo_importer_settings'
        );
        
        add_settings_field(
            'aoikumo_importer_worker_url',
            __('Worker Service URL', 'aoikumo-importer'),
            array($this, 'worker_url_field'),
            'aoikumo_importer_settings',
            'aoikumo_importer_general'
        );
        
        add_settings_field(
            'aoikumo_importer_hmac_secret',
            __('HMAC Secret', 'aoikumo-importer'),
            array($this, 'hmac_secret_field'),
            'aoikumo_importer_settings',
            'aoikumo_importer_general'
        );
        
        add_settings_field(
            'aoikumo_importer_default_sheet_id',
            __('Default Google Sheet ID', 'aoikumo-importer'),
            array($this, 'default_sheet_id_field'),
            'aoikumo_importer_settings',
            'aoikumo_importer_general'
        );
        
        add_settings_field(
            'aoikumo_importer_default_range',
            __('Default Range', 'aoikumo-importer'),
            array($this, 'default_range_field'),
            'aoikumo_importer_settings',
            'aoikumo_importer_general'
        );
        
        add_settings_field(
            'aoikumo_importer_available_mappings',
            __('Available Mappings', 'aoikumo-importer'),
            array($this, 'available_mappings_field'),
            'aoikumo_importer_settings',
            'aoikumo_importer_general'
        );
    }
    
    /**
     * General settings section description
     */
    public function general_settings_section() {
        echo '<p>' . __('Configure the Aoikumo Importer plugin settings below.', 'aoikumo-importer') . '</p>';
    }
    
    /**
     * Worker URL field
     */
    public function worker_url_field() {
        $value = get_option('aoikumo_importer_worker_url');
        echo '<input type="url" name="aoikumo_importer_worker_url" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">' . __('The URL of your Node.js worker service', 'aoikumo-importer') . '</p>';
    }
    
    /**
     * HMAC Secret field
     */
    public function hmac_secret_field() {
        $value = get_option('aoikumo_importer_hmac_secret');
        echo '<input type="text" name="aoikumo_importer_hmac_secret" value="' . esc_attr($value) . '" class="regular-text" readonly />';
        echo '<p class="description">' . __('This secret is used to sign requests to the worker service. Keep it secure.', 'aoikumo-importer') . '</p>';
        echo '<button type="button" class="button" onclick="generateNewSecret()">' . __('Generate New Secret', 'aoikumo-importer') . '</button>';
    }
    
    /**
     * Default Sheet ID field
     */
    public function default_sheet_id_field() {
        $value = get_option('aoikumo_importer_default_sheet_id');
        echo '<input type="text" name="aoikumo_importer_default_sheet_id" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">' . __('Default Google Sheet ID to pre-fill in the importer form', 'aoikumo-importer') . '</p>';
    }
    
    /**
     * Default Range field
     */
    public function default_range_field() {
        $value = get_option('aoikumo_importer_default_range');
        echo '<input type="text" name="aoikumo_importer_default_range" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">' . __('Default range to pre-fill in the importer form (e.g., A:Z)', 'aoikumo-importer') . '</p>';
    }
    
    /**
     * Available Mappings field
     */
    public function available_mappings_field() {
        $value = get_option('aoikumo_importer_available_mappings', "Customers.Basic\nProducts.Inventory\nOrders.Complete");
        echo '<textarea name="aoikumo_importer_available_mappings" rows="5" cols="50" class="large-text">' . esc_textarea($value) . '</textarea>';
        echo '<p class="description">' . __('One mapping per line. Format: Category.Name', 'aoikumo-importer') . '</p>';
    }
    
    /**
     * Admin page content
     */
    public function admin_page() {
        include AOIKUMO_IMPORTER_PLUGIN_DIR . 'templates/admin-page.php';
    }
    
    /**
     * Settings page content
     */
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Aoikumo Importer Settings', 'aoikumo-importer'); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('aoikumo_importer_settings');
                do_settings_sections('aoikumo_importer_settings');
                submit_button();
                ?>
            </form>
        </div>
        <script>
        function generateNewSecret() {
            if (confirm('<?php _e('Are you sure you want to generate a new HMAC secret? This will invalidate existing worker connections.', 'aoikumo-importer'); ?>')) {
                var secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                document.querySelector('input[name="aoikumo_importer_hmac_secret"]').value = secret;
            }
        }
        </script>
        <?php
    }
    
    /**
     * History page content
     */
    public function history_page() {
        $jobs = Aoikumo_Importer_Jobs::get_all_jobs();
        include AOIKUMO_IMPORTER_PLUGIN_DIR . 'templates/history-page.php';
    }
    
    /**
     * Admin enqueue scripts
     */
    public function admin_enqueue_scripts($hook) {
        if (strpos($hook, 'aoikumo-importer') !== false) {
            wp_enqueue_script(
                'aoikumo-importer-admin-js',
                AOIKUMO_IMPORTER_PLUGIN_URL . 'assets/js/admin.js',
                array('jquery'),
                AOIKUMO_IMPORTER_VERSION,
                true
            );
        }
    }
}
