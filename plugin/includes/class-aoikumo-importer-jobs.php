<?php
/**
 * Job management for Aoikumo Importer
 */

class Aoikumo_Importer_Jobs {
    
    /**
     * Initialize jobs functionality
     */
    public function init() {
        // Schedule cleanup task
        if (!wp_next_scheduled('aoikumo_importer_cleanup_logs')) {
            wp_schedule_event(time(), 'daily', 'aoikumo_importer_cleanup_logs');
        }
        
        add_action('aoikumo_importer_cleanup_logs', array($this, 'cleanup_old_logs'));
    }
    
    /**
     * Create database tables
     */
    public static function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Jobs table
        $table_jobs = $wpdb->prefix . 'aoikumo_importer_jobs';
        $sql_jobs = "CREATE TABLE $table_jobs (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            sheet_id varchar(255) NOT NULL,
            range varchar(50) NOT NULL,
            mapping varchar(100) NOT NULL,
            is_dry_run tinyint(1) NOT NULL DEFAULT 0,
            user_id bigint(20) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'pending',
            total_rows int(11) DEFAULT 0,
            current_row int(11) DEFAULT 0,
            success_count int(11) DEFAULT 0,
            error_count int(11) DEFAULT 0,
            progress_data longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY status (status),
            KEY user_id (user_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        // Job logs table
        $table_logs = $wpdb->prefix . 'aoikumo_importer_job_logs';
        $sql_logs = "CREATE TABLE $table_logs (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            job_id bigint(20) NOT NULL,
            row_number int(11) NOT NULL,
            status varchar(20) NOT NULL,
            message text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY job_id (job_id),
            KEY status (status)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_jobs);
        dbDelta($sql_logs);
    }
    
    /**
     * Create a new job
     */
    public function create_job($data) {
        global $wpdb;
        
        $table = $wpdb->prefix . 'aoikumo_importer_jobs';
        
        $result = $wpdb->insert(
            $table,
            array(
                'sheet_id' => $data['sheet_id'],
                'range' => $data['range'],
                'mapping' => $data['mapping'],
                'is_dry_run' => $data['is_dry_run'] ? 1 : 0,
                'user_id' => $data['user_id'],
                'status' => $data['status']
            ),
            array('%s', '%s', '%s', '%d', '%d', '%s')
        );
        
        if ($result === false) {
            return false;
        }
        
        return $wpdb->insert_id;
    }
    
    /**
     * Get a job by ID
     */
    public function get_job($job_id) {
        global $wpdb;
        
        $table = $wpdb->prefix . 'aoikumo_importer_jobs';
        
        $job = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE id = %d",
            $job_id
        ));
        
        if ($job) {
            $job->progress_data = json_decode($job->progress_data, true);
        }
        
        return $job;
    }
    
    /**
     * Get all jobs
     */
    public static function get_all_jobs($limit = 50, $offset = 0) {
        global $wpdb;
        
        $table = $wpdb->prefix . 'aoikumo_importer_jobs';
        
        $jobs = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table ORDER BY created_at DESC LIMIT %d OFFSET %d",
            $limit,
            $offset
        ));
        
        foreach ($jobs as $job) {
            $job->progress_data = json_decode($job->progress_data, true);
        }
        
        return $jobs;
    }
    
    /**
     * Update job status
     */
    public function update_job_status($job_id, $status, $progress = null) {
        global $wpdb;
        
        $table = $wpdb->prefix . 'aoikumo_importer_jobs';
        
        $data = array('status' => $status);
        
        if ($progress !== null) {
            $data['progress_data'] = json_encode($progress);
        }
        
        $result = $wpdb->update(
            $table,
            $data,
            array('id' => $job_id),
            array('%s'),
            array('%d')
        );
        
        return $result !== false;
    }
    
    /**
     * Update job progress
     */
    public function update_job_progress($job_id, $current_row, $total_rows, $success_count, $error_count) {
        global $wpdb;
        
        $table = $wpdb->prefix . 'aoikumo_importer_jobs';
        
        $result = $wpdb->update(
            $table,
            array(
                'current_row' => $current_row,
                'total_rows' => $total_rows,
                'success_count' => $success_count,
                'error_count' => $error_count
            ),
            array('id' => $job_id),
            array('%d', '%d', '%d', '%d'),
            array('%d')
        );
        
        return $result !== false;
    }
    
    /**
     * Add job log entry
     */
    public function add_job_log($job_id, $row_number, $status, $message) {
        global $wpdb;
        
        $table = $wpdb->prefix . 'aoikumo_importer_job_logs';
        
        $result = $wpdb->insert(
            $table,
            array(
                'job_id' => $job_id,
                'row_number' => $row_number,
                'status' => $status,
                'message' => $message
            ),
            array('%d', '%d', '%s', '%s')
        );
        
        return $result !== false;
    }
    
    /**
     * Get job logs
     */
    public function get_job_logs($job_id) {
        global $wpdb;
        
        $table = $wpdb->prefix . 'aoikumo_importer_job_logs';
        
        $logs = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table WHERE job_id = %d ORDER BY row_number ASC",
            $job_id
        ));
        
        return $logs;
    }
    
    /**
     * Retry failed rows for a job
     */
    public function retry_failed_rows($job_id) {
        $job = $this->get_job($job_id);
        
        if (!$job || $job->status !== 'completed') {
            return false;
        }
        
        // Get failed rows
        $failed_logs = $wpdb->get_results($wpdb->prepare(
            "SELECT DISTINCT row_number FROM {$wpdb->prefix}aoikumo_importer_job_logs 
             WHERE job_id = %d AND status = 'failed'",
            $job_id
        ));
        
        if (empty($failed_logs)) {
            return false;
        }
        
        // Create retry job
        $retry_job_id = $this->create_job(array(
            'sheet_id' => $job->sheet_id,
            'range' => $job->range,
            'mapping' => $job->mapping,
            'is_dry_run' => $job->is_dry_run,
            'user_id' => get_current_user_id(),
            'status' => 'pending'
        ));
        
        if ($retry_job_id) {
            // Add retry metadata
            $this->add_job_log($retry_job_id, 0, 'info', sprintf(
                'Retry job for failed rows from job #%d',
                $job_id
            ));
            
            return $retry_job_id;
        }
        
        return false;
    }
    
    /**
     * Get job statistics
     */
    public static function get_job_stats() {
        global $wpdb;
        
        $table = $wpdb->prefix . 'aoikumo_importer_jobs';
        
        $stats = $wpdb->get_row("
            SELECT 
                COUNT(*) as total_jobs,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_jobs,
                SUM(success_count) as total_success,
                SUM(error_count) as total_errors
            FROM $table
        ");
        
        return $stats;
    }
    
    /**
     * Cleanup old logs
     */
    public function cleanup_old_logs() {
        global $wpdb;
        
        // Keep logs for 30 days
        $cutoff_date = date('Y-m-d H:i:s', strtotime('-30 days'));
        
        $table_logs = $wpdb->prefix . 'aoikumo_importer_job_logs';
        $table_jobs = $wpdb->prefix . 'aoikumo_importer_jobs';
        
        // Delete old logs
        $wpdb->query($wpdb->prepare(
            "DELETE FROM $table_logs WHERE created_at < %s",
            $cutoff_date
        ));
        
        // Delete old completed jobs (keep for 90 days)
        $cutoff_date_jobs = date('Y-m-d H:i:s', strtotime('-90 days'));
        $wpdb->query($wpdb->prepare(
            "DELETE FROM $table_jobs WHERE status = 'completed' AND created_at < %s",
            $cutoff_date_jobs
        ));
    }
    
    /**
     * Delete a job and its logs
     */
    public function delete_job($job_id) {
        global $wpdb;
        
        $table_jobs = $wpdb->prefix . 'aoikumo_importer_jobs';
        $table_logs = $wpdb->prefix . 'aoikumo_importer_job_logs';
        
        // Delete logs first
        $wpdb->delete($table_logs, array('job_id' => $job_id), array('%d'));
        
        // Delete job
        $result = $wpdb->delete($table_jobs, array('id' => $job_id), array('%d'));
        
        return $result !== false;
    }
}
