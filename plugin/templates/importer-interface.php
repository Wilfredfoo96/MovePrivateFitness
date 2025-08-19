<?php
/**
 * Main importer interface template
 */

// Get default values
$default_sheet_id = get_option('aoikumo_importer_default_sheet_id', '');
$default_range = get_option('aoikumo_importer_default_range', 'A:Z');
$available_mappings = get_option('aoikumo_importer_available_mappings', "Customers.Basic\nProducts.Inventory\nOrders.Complete");

// Parse mappings
$mappings = array_filter(array_map('trim', explode("\n", $available_mappings)));

// Get recent jobs
$recent_jobs = Aoikumo_Importer_Jobs::get_all_jobs(5, 0);
?>

<div class="aoikumo-importer-container">
    <div class="aoikumo-importer-header">
        <h2><?php _e('Aoikumo Importer', 'aoikumo-importer'); ?></h2>
        <p><?php _e('Import your Google Sheets data into Aoikumo automatically', 'aoikumo-importer'); ?></p>
    </div>

    <div class="aoikumo-importer-main">
        <div class="aoikumo-importer-form">
            <h3><?php _e('Import Configuration', 'aoikumo-importer'); ?></h3>
            
            <form id="aoikumo-importer-form">
                <div class="form-row">
                    <label for="sheet_id"><?php _e('Google Sheet ID:', 'aoikumo-importer'); ?></label>
                    <input type="text" id="sheet_id" name="sheet_id" value="<?php echo esc_attr($default_sheet_id); ?>" required>
                    <p class="description"><?php _e('The ID from your Google Sheets URL (e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)', 'aoikumo-importer'); ?></p>
                </div>

                <div class="form-row">
                    <label for="range"><?php _e('Range:', 'aoikumo-importer'); ?></label>
                    <input type="text" id="range" name="range" value="<?php echo esc_attr($default_range); ?>" required>
                    <p class="description"><?php _e('The range to import (e.g., A:Z, A1:D100)', 'aoikumo-importer'); ?></p>
                </div>

                <div class="form-row">
                    <label for="mapping"><?php _e('Mapping:', 'aoikumo-importer'); ?></label>
                    <select id="mapping" name="mapping" required>
                        <option value=""><?php _e('Select a mapping...', 'aoikumo-importer'); ?></option>
                        <?php foreach ($mappings as $mapping): ?>
                            <option value="<?php echo esc_attr($mapping); ?>"><?php echo esc_html($mapping); ?></option>
                        <?php endforeach; ?>
                    </select>
                    <p class="description"><?php _e('Select the data mapping configuration for this import', 'aoikumo-importer'); ?></p>
                </div>

                <div class="form-row">
                    <label class="checkbox-label">
                        <input type="checkbox" id="is_dry_run" name="is_dry_run">
                        <?php _e('Dry Run (validate without importing)', 'aoikumo-importer'); ?>
                    </label>
                </div>

                <div class="form-actions">
                    <button type="button" id="dry-run-btn" class="button button-secondary">
                        <?php _e('Dry Run', 'aoikumo-importer'); ?>
                    </button>
                    <button type="button" id="import-btn" class="button button-primary">
                        <?php _e('Run Import', 'aoikumo-importer'); ?>
                    </button>
                </div>
            </form>
        </div>

        <div class="aoikumo-importer-progress" id="progress-section" style="display: none;">
            <h3><?php _e('Import Progress', 'aoikumo-importer'); ?></h3>
            
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
            </div>
            
            <div class="progress-stats">
                <div class="stat-item">
                    <span class="stat-label"><?php _e('Total Rows:', 'aoikumo-importer'); ?></span>
                    <span class="stat-value" id="total-rows">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label"><?php _e('Processed:', 'aoikumo-importer'); ?></span>
                    <span class="stat-value" id="processed-rows">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label"><?php _e('Success:', 'aoikumo-importer'); ?></span>
                    <span class="stat-value success" id="success-count">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label"><?php _e('Failed:', 'aoikumo-importer'); ?></span>
                    <span class="stat-value error" id="error-count">0</span>
                </div>
            </div>
            
            <div class="progress-status">
                <span id="status-message"><?php _e('Initializing...', 'aoikumo-importer'); ?></span>
            </div>
        </div>

        <div class="aoikumo-importer-results" id="results-section" style="display: none;">
            <h3><?php _e('Import Results', 'aoikumo-importer'); ?></h3>
            
            <div class="results-summary">
                <div class="result-item">
                    <span class="result-label"><?php _e('Status:', 'aoikumo-importer'); ?></span>
                    <span class="result-value" id="final-status"></span>
                </div>
                <div class="result-item">
                    <span class="result-label"><?php _e('Job ID:', 'aoikumo-importer'); ?></span>
                    <span class="result-value" id="job-id"></span>
                </div>
                <div class="result-item">
                    <span class="result-label"><?php _e('Duration:', 'aoikumo-importer'); ?></span>
                    <span class="result-value" id="duration"></span>
                </div>
            </div>
            
            <div class="results-actions">
                <button type="button" id="download-logs-btn" class="button button-secondary">
                    <?php _e('Download Logs', 'aoikumo-importer'); ?>
                </button>
                <button type="button" id="retry-failed-btn" class="button button-primary" style="display: none;">
                    <?php _e('Retry Failed Rows', 'aoikumo-importer'); ?>
                </button>
            </div>
        </div>
    </div>

    <?php if ($atts['show_history'] === 'true' && !empty($recent_jobs)): ?>
    <div class="aoikumo-importer-history">
        <h3><?php _e('Recent Import Jobs', 'aoikumo-importer'); ?></h3>
        
        <div class="jobs-table">
            <table>
                <thead>
                    <tr>
                        <th><?php _e('Job ID', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Date', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Mapping', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Status', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Progress', 'aoikumo-importer'); ?></th>
                        <th><?php _e('Actions', 'aoikumo-importer'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recent_jobs as $job): ?>
                    <tr>
                        <td>#<?php echo esc_html($job->id); ?></td>
                        <td><?php echo esc_html(date('M j, Y g:i A', strtotime($job->created_at))); ?></td>
                        <td><?php echo esc_html($job->mapping); ?></td>
                        <td>
                            <span class="status-badge status-<?php echo esc_attr($job->status); ?>">
                                <?php echo esc_html(ucfirst($job->status)); ?>
                            </span>
                        </td>
                        <td>
                            <?php if ($job->total_rows > 0): ?>
                                <?php echo esc_html($job->success_count + $job->error_count); ?>/<?php echo esc_html($job->total_rows); ?>
                            <?php else: ?>
                                -
                            <?php endif; ?>
                        </td>
                        <td>
                            <button type="button" class="button button-small view-job-btn" data-job-id="<?php echo esc_attr($job->id); ?>">
                                <?php _e('View', 'aoikumo-importer'); ?>
                            </button>
                            <?php if ($job->status === 'completed' && $job->error_count > 0): ?>
                                <button type="button" class="button button-small retry-job-btn" data-job-id="<?php echo esc_attr($job->id); ?>">
                                    <?php _e('Retry Failed', 'aoikumo-importer'); ?>
                                </button>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <div class="view-all-jobs">
            <a href="<?php echo admin_url('admin.php?page=aoikumo-importer-history'); ?>" class="button button-secondary">
                <?php _e('View All Jobs', 'aoikumo-importer'); ?>
            </a>
        </div>
    </div>
    <?php endif; ?>
</div>

<!-- Job Details Modal -->
<div id="job-modal" class="aoikumo-modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h3><?php _e('Job Details', 'aoikumo-importer'); ?></h3>
            <span class="modal-close">&times;</span>
        </div>
        <div class="modal-body">
            <div id="job-details-content"></div>
        </div>
    </div>
</div>
