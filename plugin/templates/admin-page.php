<?php
/**
 * Admin page template
 */

// Get job statistics
$stats = Aoikumo_Importer_Jobs::get_job_stats();
$recent_jobs = Aoikumo_Importer_Jobs::get_all_jobs(10, 0);
?>

<div class="wrap">
    <h1><?php _e('Aoikumo Importer', 'aoikumo-importer'); ?></h1>
    
    <div class="aoikumo-importer-dashboard">
        <!-- Statistics Overview -->
        <div class="stats-overview">
            <div class="stat-card">
                <h3><?php _e('Total Jobs', 'aoikumo-importer'); ?></h3>
                <div class="stat-number"><?php echo esc_html($stats->total_jobs); ?></div>
            </div>
            <div class="stat-card">
                <h3><?php _e('Completed', 'aoikumo-importer'); ?></h3>
                <div class="stat-number success"><?php echo esc_html($stats->completed_jobs); ?></div>
            </div>
            <div class="stat-card">
                <h3><?php _e('Failed', 'aoikumo-importer'); ?></h3>
                <div class="stat-number error"><?php echo esc_html($stats->failed_jobs); ?></div>
            </div>
            <div class="stat-card">
                <h3><?php _e('Processing', 'aoikumo-importer'); ?></h3>
                <div class="stat-number processing"><?php echo esc_html($stats->processing_jobs); ?></div>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="quick-actions">
            <a href="<?php echo admin_url('admin.php?page=aoikumo-importer-settings'); ?>" class="button button-primary">
                <?php _e('Configure Settings', 'aoikumo-importer'); ?>
            </a>
            <a href="<?php echo admin_url('admin.php?page=aoikumo-importer-history'); ?>" class="button button-secondary">
                <?php _e('View All Jobs', 'aoikumo-importer'); ?>
            </a>
        </div>
    </div>
    
    <!-- Main Importer Interface -->
    <div class="aoikumo-importer-main-admin">
        <?php echo do_shortcode('[aoikumo_importer show_history="false"]'); ?>
    </div>
    
    <!-- Recent Jobs Table -->
    <div class="recent-jobs-section">
        <h2><?php _e('Recent Import Jobs', 'aoikumo-importer'); ?></h2>
        
        <?php if (!empty($recent_jobs)): ?>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th><?php _e('Job ID', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Date', 'aoikumo-importer'); ?></th>
                        <th><?php _e('User', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Sheet ID', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Mapping', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Type', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Status', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Progress', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Actions', 'aoikumo-importer'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recent_jobs as $job): ?>
                        <?php $user = get_user_by('id', $job->user_id); ?>
                        <tr>
                            <td><strong>#<?php echo esc_html($job->id); ?></strong></td>
                            <td><?php echo esc_html(date('M j, Y g:i A', strtotime($job->created_at))); ?></td>
                            <td><?php echo $user ? esc_html($user->display_name) : __('Unknown', 'aoikumo-importer'); ?></td>
                            <td>
                                <code><?php echo esc_html(substr($job->sheet_id, 0, 20) . (strlen($job->sheet_id) > 20 ? '...' : '')); ?></code>
                            </td>
                            <td><?php echo esc_html($job->mapping); ?></td>
                            <td>
                                <?php if ($job->is_dry_run): ?>
                                    <span class="badge badge-dry-run"><?php _e('Dry Run', 'aoikumo-importer'); ?></span>
                                <?php else: ?>
                                    <span class="badge badge-import"><?php _e('Import', 'aoikumo-importer'); ?></span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <span class="status-badge status-<?php echo esc_attr($job->status); ?>">
                                    <?php echo esc_html(ucfirst($job->status)); ?>
                                </span>
                            </td>
                            <td>
                                <?php if ($job->total_rows > 0): ?>
                                    <div class="progress-mini">
                                        <div class="progress-mini-fill" style="width: <?php echo esc_attr(($job->current_row / $job->total_rows) * 100); ?>%"></div>
                                    </div>
                                    <small><?php echo esc_html($job->current_row); ?>/<?php echo esc_html($job->total_rows); ?></small>
                                <?php else: ?>
                                    -
                                <?php endif; ?>
                            </td>
                            <td>
                                <div class="row-actions">
                                    <span class="view">
                                        <a href="#" class="view-job-btn" data-job-id="<?php echo esc_attr($job->id); ?>">
                                            <?php _e('View', 'aoikumo-importer'); ?>
                                        </a> |
                                    </span>
                                    <span class="logs">
                                        <a href="#" class="download-logs-btn" data-job-id="<?php echo esc_attr($job->id); ?>">
                                            <?php _e('Logs', 'aoikumo-importer'); ?>
                                        </a>
                                        <?php if ($job->status === 'completed' && $job->error_count > 0): ?>
                                            | <span class="retry">
                                                <a href="#" class="retry-job-btn" data-job-id="<?php echo esc_attr($job->id); ?>">
                                                    <?php _e('Retry Failed', 'aoikumo-importer'); ?>
                                                </a>
                                            </span>
                                        <?php endif; ?>
                                    </span>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php else: ?>
            <p><?php _e('No import jobs found.', 'aoikumo-importer'); ?></p>
        <?php endif; ?>
    </div>
</div>

<style>
.aoikumo-importer-dashboard {
    margin: 20px 0;
}

.stats-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stat-card {
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 1px 1px rgba(0,0,0,.04);
}

.stat-card h3 {
    margin: 0 0 10px 0;
    color: #23282d;
    font-size: 14px;
    font-weight: 600;
}

.stat-number {
    font-size: 32px;
    font-weight: bold;
    color: #0073aa;
}

.stat-number.success { color: #46b450; }
.stat-number.error { color: #dc3232; }
.stat-number.processing { color: #ffb900; }

.quick-actions {
    margin-bottom: 30px;
}

.quick-actions .button {
    margin-right: 10px;
}

.aoikumo-importer-main-admin {
    margin: 30px 0;
    padding: 20px;
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
}

.recent-jobs-section {
    margin-top: 40px;
}

.badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
}

.badge-dry-run {
    background: #e7f3ff;
    color: #0073aa;
}

.badge-import {
    background: #e7f7e7;
    color: #46b450;
}

.progress-mini {
    width: 100px;
    height: 8px;
    background: #f1f1f1;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 5px;
}

.progress-mini-fill {
    height: 100%;
    background: #0073aa;
    transition: width 0.3s ease;
}

.row-actions {
    font-size: 13px;
}

.row-actions a {
    text-decoration: none;
}

.row-actions a:hover {
    text-decoration: underline;
}
</style>
