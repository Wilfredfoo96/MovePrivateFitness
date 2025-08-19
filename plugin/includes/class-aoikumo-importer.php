<?php
/**
 * Main Aoikumo Importer Plugin Class
 */

class Aoikumo_Importer {
    
    /**
     * Plugin instance
     */
    private static $instance = null;
    
    /**
     * Admin class instance
     */
    private $admin;
    
    /**
     * API class instance
     */
    private $api;
    
    /**
     * Jobs class instance
     */
    private $jobs;
    
    /**
     * Get plugin instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        // Initialize components
        $this->admin = new Aoikumo_Importer_Admin();
        $this->api = new Aoikumo_Importer_API();
        $this->jobs = new Aoikumo_Importer_Jobs();
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        // Initialize admin
        $this->admin->init();
        
        // Initialize API
        $this->api->init();
        
        // Initialize jobs
        $this->jobs->init();
        
        // Add AJAX handlers
        add_action('wp_ajax_aoikumo_importer_submit_job', array($this, 'ajax_submit_job'));
        add_action('wp_ajax_aoikumo_importer_get_job_status', array($this, 'ajax_get_job_status'));
        add_action('wp_ajax_aoikumo_importer_retry_failed_rows', array($this, 'ajax_retry_failed_rows'));
        add_action('wp_ajax_aoikumo_importer_download_logs', array($this, 'ajax_download_logs'));
        
        // Add shortcode for frontend display
        add_shortcode('aoikumo_importer', array($this, 'render_importer_shortcode'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
    }
    
    /**
     * Enqueue scripts and styles
     */
    public function enqueue_scripts() {
        wp_enqueue_script(
            'aoikumo-importer-js',
            AOIKUMO_IMPORTER_PLUGIN_URL . 'assets/js/aoikumo-importer.js',
            array('jquery'),
            AOIKUMO_IMPORTER_VERSION,
            true
        );
        
        wp_enqueue_style(
            'aoikumo-importer-css',
            AOIKUMO_IMPORTER_PLUGIN_URL . 'assets/css/aoikumo-importer.css',
            array(),
            AOIKUMO_IMPORTER_VERSION
        );
        
        // Localize script with AJAX URL and nonce
        wp_localize_script('aoikumo-importer-js', 'aoikumoImporter', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('aoikumo_importer_nonce'),
            'strings' => array(
                'confirmImport' => __('Are you sure you want to run this import?', 'aoikumo-importer'),
                'confirmDryRun' => __('Are you sure you want to run a dry run?', 'aoikumo-importer'),
                'processing' => __('Processing...', 'aoikumo-importer'),
                'error' => __('An error occurred', 'aoikumo-importer'),
                'success' => __('Success!', 'aoikumo-importer')
            )
        ));
    }
    
    /**
     * AJAX handler for submitting a job
     */
    public function ajax_submit_job() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'aoikumo_importer_nonce')) {
            wp_die(__('Security check failed', 'aoikumo-importer'));
        }
        
        // Validate required fields
        $sheet_id = sanitize_text_field($_POST['sheet_id']);
        $range = sanitize_text_field($_POST['range']);
        $mapping = sanitize_text_field($_POST['mapping']);
        $is_dry_run = isset($_POST['is_dry_run']) && $_POST['is_dry_run'] === 'true';
        
        if (empty($sheet_id) || empty($range) || empty($mapping)) {
            wp_send_json_error(__('All fields are required', 'aoikumo-importer'));
        }
        
        // Create job
        $job_id = $this->jobs->create_job(array(
            'sheet_id' => $sheet_id,
            'range' => $range,
            'mapping' => $mapping,
            'is_dry_run' => $is_dry_run,
            'user_id' => get_current_user_id(),
            'status' => 'pending'
        ));
        
        if ($job_id) {
            // Send to worker service
            $result = $this->api->send_to_worker($job_id, $sheet_id, $range, $mapping, $is_dry_run);
            
            if ($result['success']) {
                wp_send_json_success(array(
                    'job_id' => $job_id,
                    'message' => __('Job submitted successfully', 'aoikumo-importer')
                ));
            } else {
                wp_send_json_error($result['message']);
            }
        } else {
            wp_send_json_error(__('Failed to create job', 'aoikumo-importer'));
        }
    }
    
    /**
     * AJAX handler for getting job status
     */
    public function ajax_get_job_status() {
        if (!wp_verify_nonce($_POST['nonce'], 'aoikumo_importer_nonce')) {
            wp_die(__('Security check failed', 'aoikumo-importer'));
        }
        
        $job_id = intval($_POST['job_id']);
        $job = $this->jobs->get_job($job_id);
        
        if ($job) {
            wp_send_json_success($job);
        } else {
            wp_send_json_error(__('Job not found', 'aoikumo-importer'));
        }
    }
    
    /**
     * AJAX handler for retrying failed rows
     */
    public function ajax_retry_failed_rows() {
        if (!wp_verify_nonce($_POST['nonce'], 'aoikumo-importer_nonce')) {
            wp_die(__('Security check failed', 'aoikumo-importer'));
        }
        
        $job_id = intval($_POST['job_id']);
        $result = $this->jobs->retry_failed_rows($job_id);
        
        if ($result) {
            wp_send_json_success(__('Retry job created successfully', 'aoikumo-importer'));
        } else {
            wp_send_json_error(__('Failed to create retry job', 'aoikumo-importer'));
        }
    }
    
    /**
     * AJAX handler for downloading logs
     */
    public function ajax_download_logs() {
        if (!wp_verify_nonce($_POST['nonce'], 'aoikumo-importer_nonce')) {
            wp_die(__('Security check failed', 'aoikumo-importer'));
        }
        
        $job_id = intval($_POST['job_id']);
        $logs = $this->jobs->get_job_logs($job_id);
        
        if ($logs) {
            // Generate CSV download
            $filename = 'aoikumo-import-logs-' . $job_id . '-' . date('Y-m-d-H-i-s') . '.csv';
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            
            $output = fopen('php://output', 'w');
            fputcsv($output, array('Row', 'Status', 'Message', 'Timestamp'));
            
            foreach ($logs as $log) {
                fputcsv($output, array(
                    $log->row_number,
                    $log->status,
                    $log->message,
                    $log->created_at
                ));
            }
            
            fclose($output);
            exit;
        } else {
            wp_send_json_error(__('No logs found for this job', 'aoikumo-importer'));
        }
    }
    
    /**
     * Render importer shortcode
     */
    public function render_importer_shortcode($atts) {
        $atts = shortcode_atts(array(
            'show_history' => 'true'
        ), $atts);
        
        ob_start();
        include AOIKUMO_IMPORTER_PLUGIN_DIR . 'templates/importer-interface.php';
        return ob_get_clean();
    }
}
