<?php
/**
 * API communication with worker service
 */

class Aoikumo_Importer_API {
    
    /**
     * Initialize API functionality
     */
    public function init() {
        // Add REST API endpoints for worker service to call back
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        register_rest_route('aoikumo-importer/v1', '/job-status', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_job_status'),
            'permission_callback' => array($this, 'verify_worker_signature'),
            'args' => array(
                'job_id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ),
                'status' => array(
                    'required' => true,
                    'type' => 'string',
                    'enum' => array('processing', 'completed', 'failed', 'cancelled')
                ),
                'progress' => array(
                    'required' => false,
                    'type' => 'object'
                ),
                'logs' => array(
                    'required' => false,
                    'type' => 'array'
                )
            )
        ));
        
        register_rest_route('aoikumo-importer/v1', '/job-progress', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_job_progress'),
            'permission_callback' => array($this, 'verify_worker_signature'),
            'args' => array(
                'job_id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ),
                'current_row' => array(
                    'required' => true,
                    'type' => 'integer'
                ),
                'total_rows' => array(
                    'required' => true,
                    'type' => 'integer'
                ),
                'success_count' => array(
                    'required' => true,
                    'type' => 'integer'
                ),
                'error_count' => array(
                    'required' => true,
                    'type' => 'integer'
                )
            )
        ));
    }
    
    /**
     * Send job to worker service
     */
    public function send_to_worker($job_id, $sheet_id, $range, $mapping, $is_dry_run) {
        $worker_url = get_option('aoikumo_importer_worker_url');
        $hmac_secret = get_option('aoikumo_importer_hmac_secret');
        
        if (empty($worker_url) || empty($hmac_secret)) {
            return array(
                'success' => false,
                'message' => __('Worker service not configured', 'aoikumo-importer')
            );
        }
        
        $payload = array(
            'job_id' => $job_id,
            'sheet_id' => $sheet_id,
            'range' => $range,
            'mapping' => $mapping,
            'is_dry_run' => $is_dry_run,
            'callback_url' => rest_url('aoikumo-importer/v1/job-status'),
            'progress_url' => rest_url('aoikumo-importer/v1/job-progress'),
            'timestamp' => time()
        );
        
        $json_payload = json_encode($payload);
        $signature = hash_hmac('sha256', $json_payload, $hmac_secret);
        
        $response = wp_remote_post($worker_url . '/api/jobs', array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-HMAC-Signature' => $signature,
                'X-Timestamp' => $payload['timestamp']
            ),
            'body' => $json_payload,
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        
        if ($status_code === 200) {
            $result = json_decode($body, true);
            if ($result && isset($result['success']) && $result['success']) {
                return array(
                    'success' => true,
                    'message' => __('Job sent to worker service successfully', 'aoikumo-importer')
                );
            } else {
                return array(
                    'success' => false,
                    'message' => isset($result['message']) ? $result['message'] : __('Unknown error from worker service', 'aoikumo-importer')
                );
            }
        } else {
            return array(
                'success' => false,
                'message' => sprintf(__('Worker service returned status code %d: %s', 'aoikumo-importer'), $status_code, $body)
            );
        }
    }
    
    /**
     * Verify worker service signature
     */
    public function verify_worker_signature($request) {
        $signature = $request->get_header('X-HMAC-Signature');
        $timestamp = $request->get_header('X-Timestamp');
        $hmac_secret = get_option('aoikumo_importer_hmac_secret');
        
        if (empty($signature) || empty($timestamp) || empty($hmac_secret)) {
            return false;
        }
        
        // Check timestamp (allow 5 minute window)
        if (abs(time() - intval($timestamp)) > 300) {
            return false;
        }
        
        // Verify signature
        $body = $request->get_body();
        $expected_signature = hash_hmac('sha256', $body, $hmac_secret);
        
        return hash_equals($expected_signature, $signature);
    }
    
    /**
     * Update job status (called by worker service)
     */
    public function update_job_status($request) {
        $job_id = $request->get_param('job_id');
        $status = $request->get_param('status');
        $progress = $request->get_param('progress');
        $logs = $request->get_param('logs');
        
        $jobs = new Aoikumo_Importer_Jobs();
        $result = $jobs->update_job_status($job_id, $status, $progress);
        
        if ($logs && is_array($logs)) {
            foreach ($logs as $log) {
                $jobs->add_job_log($job_id, $log['row_number'], $log['status'], $log['message']);
            }
        }
        
        if ($result) {
            return array(
                'success' => true,
                'message' => __('Job status updated successfully', 'aoikumo-importer')
            );
        } else {
            return array(
                'success' => false,
                'message' => __('Failed to update job status', 'aoikumo-importer')
            );
        }
    }
    
    /**
     * Update job progress (called by worker service)
     */
    public function update_job_progress($request) {
        $job_id = $request->get_param('job_id');
        $current_row = $request->get_param('current_row');
        $total_rows = $request->get_param('total_rows');
        $success_count = $request->get_param('success_count');
        $error_count = $request->get_param('error_count');
        
        $jobs = new Aoikumo_Importer_Jobs();
        $result = $jobs->update_job_progress($job_id, $current_row, $total_rows, $success_count, $error_count);
        
        if ($result) {
            return array(
                'success' => true,
                'message' => __('Job progress updated successfully', 'aoikumo-importer')
            );
        } else {
            return array(
                'success' => false,
                'message' => __('Failed to update job progress', 'aoikumo-importer')
            );
        }
    }
    
    /**
     * Test worker service connection
     */
    public function test_connection() {
        $worker_url = get_option('aoikumo_importer_worker_url');
        $hmac_secret = get_option('aoikumo_importer_hmac_secret');
        
        if (empty($worker_url) || empty($hmac_secret)) {
            return array(
                'success' => false,
                'message' => __('Worker service not configured', 'aoikumo-importer')
            );
        }
        
        $payload = array(
            'test' => true,
            'timestamp' => time()
        );
        
        $json_payload = json_encode($payload);
        $signature = hash_hmac('sha256', $json_payload, $hmac_secret);
        
        $response = wp_remote_post($worker_url . '/api/test', array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-HMAC-Signature' => $signature,
                'X-Timestamp' => $payload['timestamp']
            ),
            'body' => $json_payload,
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        
        if ($status_code === 200) {
            return array(
                'success' => true,
                'message' => __('Connection to worker service successful', 'aoikumo-importer')
            );
        } else {
            return array(
                'success' => false,
                'message' => sprintf(__('Worker service returned status code %d: %s', 'aoikumo-importer'), $status_code, $body)
            );
        }
    }
}
