<?php
/**
 * Job history page template
 */

// Get all jobs with pagination
$page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
$per_page = 20;
$offset = ($page - 1) * $per_page;

$jobs = Aoikumo_Importer_Jobs::get_all_jobs($per_page, $offset);
$total_jobs = Aoikumo_Importer_Jobs::get_total_jobs_count();
$total_pages = ceil($total_jobs / $per_page);

// Get filters
$status_filter = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';
$mapping_filter = isset($_GET['mapping']) ? sanitize_text_field($_GET['mapping']) : '';
$date_filter = isset($_GET['date']) ? sanitize_text_field($_GET['date']) : '';

// Get unique mappings for filter
$all_mappings = Aoikumo_Importer_Jobs::get_unique_mappings();
?>

<div class="wrap">
    <h1><?php _e('Import Job History', 'aoikumo-importer'); ?></h1>
    
    <!-- Filters -->
    <div class="tablenav top">
        <form method="get" class="alignleft actions">
            <input type="hidden" name="page" value="aoikumo-importer-history">
            
            <select name="status">
                <option value=""><?php _e('All Statuses', 'aoikumo-importer'); ?></option>
                <option value="pending" <?php selected($status_filter, 'pending'); ?>><?php _e('Pending', 'aoikumo-importer'); ?></option>
                <option value="processing" <?php selected($status_filter, 'processing'); ?>><?php _e('Processing', 'aoikumo-importer'); ?></option>
                <option value="completed" <?php selected($status_filter, 'completed'); ?>><?php _e('Completed', 'aoikumo-importer'); ?></option>
                <option value="failed" <?php selected($status_filter, 'failed'); ?>><?php _e('Failed', 'aoikumo-importer'); ?></option>
                <option value="cancelled" <?php selected($status_filter, 'cancelled'); ?>><?php _e('Cancelled', 'aoikumo-importer'); ?></option>
            </select>
            
            <select name="mapping">
                <option value=""><?php _e('All Mappings', 'aoikumo-importer'); ?></option>
                <?php foreach ($all_mappings as $mapping): ?>
                    <option value="<?php echo esc_attr($mapping); ?>" <?php selected($mapping_filter, $mapping); ?>>
                        <?php echo esc_html($mapping); ?>
                    </option>
                <?php endforeach; ?>
            </select>
            
            <input type="date" name="date" value="<?php echo esc_attr($date_filter); ?>" placeholder="<?php _e('Filter by date', 'aoikumo-importer'); ?>">
            
            <input type="submit" class="button" value="<?php _e('Filter', 'aoikumo-importer'); ?>">
            
            <?php if ($status_filter || $mapping_filter || $date_filter): ?>
                <a href="<?php echo admin_url('admin.php?page=aoikumo-importer-history'); ?>" class="button">
                    <?php _e('Clear Filters', 'aoikumo-importer'); ?>
                </a>
            <?php endif; ?>
        </form>
        
        <div class="tablenav-pages">
            <?php if ($total_pages > 1): ?>
                <span class="pagination-links">
                    <?php
                    echo paginate_links(array(
                        'base' => add_query_arg('paged', '%#%'),
                        'format' => '',
                        'prev_text' => __('&laquo;'),
                        'next_text' => __('&raquo;'),
                        'total' => $total_pages,
                        'current' => $page
                    ));
                    ?>
                </span>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Jobs Table -->
    <?php if (!empty($jobs)): ?>
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th class="check-column">
                        <input type="checkbox" id="cb-select-all-1">
                    </th>
                    <th class="column-job-id"><?php _e('Job ID', 'aoikumo-importer'); ?></th>
                    <th class="column-date"><?php _e('Date', 'aoikumo-importer'); ?></th>
                    <th class="column-user"><?php _e('User', 'aoikumo-importer'); ?></th>
                    <th class="column-sheet"><?php _e('Google Sheet', 'aoikumo-importer'); ?></th>
                    <th class="column-range"><?php _e('Range', 'aoikumo-importer'); ?></th>
                    <th class="column-mapping"><?php _e('Mapping', 'aoikumo-importer'); ?></th>
                    <th class="column-type"><?php _e('Type', 'aoikumo-importer'); ?></th>
                    <th class="column-status"><?php _e('Status', 'aoikumo-importer'); ?></th>
                    <th class="column-progress"><?php _e('Progress', 'aoikumo-importer'); ?></th>
                    <th class="column-actions"><?php _e('Actions', 'aoikumo-importer'); ?></th>
                </tr>
            </thead>
            
            <tbody>
                <?php foreach ($jobs as $job): ?>
                    <?php $user = get_user_by('id', $job->user_id); ?>
                    <tr>
                        <th scope="row" class="check-column">
                            <input type="checkbox" name="job_ids[]" value="<?php echo esc_attr($job->id); ?>">
                        </th>
                        <td class="column-job-id">
                            <strong>#<?php echo esc_html($job->id); ?></strong>
                        </td>
                        <td class="column-date">
                            <?php echo esc_html(date('M j, Y g:i A', strtotime($job->created_at))); ?>
                            <br>
                            <small><?php echo esc_html(human_time_diff(strtotime($job->created_at))); ?> <?php _e('ago', 'aoikumo-importer'); ?></small>
                        </td>
                        <td class="column-user">
                            <?php if ($user): ?>
                                <?php echo get_avatar($user->ID, 32); ?>
                                <strong><?php echo esc_html($user->display_name); ?></strong>
                                <br>
                                <small><?php echo esc_html($user->user_email); ?></small>
                            <?php else: ?>
                                <?php _e('Unknown User', 'aoikumo-importer'); ?>
                            <?php endif; ?>
                        </td>
                        <td class="column-sheet">
                            <code><?php echo esc_html(substr($job->sheet_id, 0, 25) . (strlen($job->sheet_id) > 25 ? '...' : '')); ?></code>
                            <br>
                            <small>
                                <a href="https://docs.google.com/spreadsheets/d/<?php echo esc_attr($job->sheet_id); ?>" target="_blank">
                                    <?php _e('View Sheet', 'aoikumo-importer'); ?>
                                </a>
                            </small>
                        </td>
                        <td class="column-range">
                            <code><?php echo esc_html($job->range); ?></code>
                        </td>
                        <td class="column-mapping">
                            <span class="mapping-badge"><?php echo esc_html($job->mapping); ?></span>
                        </td>
                        <td class="column-type">
                            <?php if ($job->is_dry_run): ?>
                                <span class="badge badge-dry-run"><?php _e('Dry Run', 'aoikumo-importer'); ?></span>
                            <?php else: ?>
                                <span class="badge badge-import"><?php _e('Import', 'aoikumo-importer'); ?></span>
                            <?php endif; ?>
                        </td>
                        <td class="column-status">
                            <span class="status-badge status-<?php echo esc_attr($job->status); ?>">
                                <?php echo esc_html(ucfirst($job->status)); ?>
                            </span>
                            <?php if ($job->status === 'processing'): ?>
                                <br>
                                <small><?php _e('Started', 'aoikumo-importer'); ?>: <?php echo esc_html(human_time_diff(strtotime($job->updated_at))); ?> <?php _e('ago', 'aoikumo-importer'); ?></small>
                            <?php endif; ?>
                        </td>
                        <td class="column-progress">
                            <?php if ($job->total_rows > 0): ?>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: <?php echo esc_attr(($job->current_row / $job->total_rows) * 100); ?>%"></div>
                                </div>
                                <div class="progress-stats">
                                    <span class="success"><?php echo esc_html($job->success_count); ?></span> / 
                                    <span class="total"><?php echo esc_html($job->total_rows); ?></span>
                                    <?php if ($job->error_count > 0): ?>
                                        <span class="error">(<?php echo esc_html($job->error_count); ?> <?php _e('errors', 'aoikumo-importer'); ?>)</span>
                                    <?php endif; ?>
                                </div>
                            <?php else: ?>
                                -
                            <?php endif; ?>
                        </td>
                        <td class="column-actions">
                            <div class="row-actions">
                                <span class="view">
                                    <a href="#" class="view-job-btn" data-job-id="<?php echo esc_attr($job->id); ?>">
                                        <?php _e('View Details', 'aoikumo-importer'); ?>
                                    </a>
                                </span>
                                <br>
                                <span class="logs">
                                    <a href="#" class="download-logs-btn" data-job-id="<?php echo esc_attr($job->id); ?>">
                                        <?php _e('Download Logs', 'aoikumo-importer'); ?>
                                    </a>
                                </span>
                                <?php if ($job->status === 'completed' && $job->error_count > 0): ?>
                                    <br>
                                    <span class="retry">
                                        <a href="#" class="retry-job-btn" data-job-id="<?php echo esc_attr($job->id); ?>">
                                            <?php _e('Retry Failed Rows', 'aoikumo-importer'); ?>
                                        </a>
                                    </span>
                                <?php endif; ?>
                                <?php if (current_user_can('manage_options')): ?>
                                    <br>
                                    <span class="delete">
                                        <a href="#" class="delete-job-btn" data-job-id="<?php echo esc_attr($job->id); ?>" style="color: #a00;">
                                            <?php _e('Delete Job', 'aoikumo-importer'); ?>
                                        </a>
                                    </span>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php else: ?>
        <div class="no-jobs">
            <p><?php _e('No import jobs found matching your criteria.', 'aoikumo-importer'); ?></p>
            <a href="<?php echo admin_url('admin.php?page=aoikumo-importer-history'); ?>" class="button">
                <?php _e('View All Jobs', 'aoikumo-importer'); ?>
            </a>
        </div>
    <?php endif; ?>
    
    <!-- Bottom Pagination -->
    <?php if ($total_pages > 1): ?>
        <div class="tablenav bottom">
            <div class="tablenav-pages">
                <span class="pagination-links">
                    <?php
                    echo paginate_links(array(
                        'base' => add_query_arg('paged', '%#%'),
                        'format' => '',
                        'prev_text' => __('&laquo;'),
                        'next_text' => __('&raquo;'),
                        'total' => $total_pages,
                        'current' => $page
                    ));
                    ?>
                </span>
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

<style>
.mapping-badge {
    display: inline-block;
    padding: 2px 8px;
    background: #f1f1f1;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
}

.progress-bar {
    width: 100px;
    height: 8px;
    background: #f1f1f1;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 5px;
}

.progress-fill {
    height: 100%;
    background: #0073aa;
    transition: width 0.3s ease;
}

.progress-stats {
    font-size: 11px;
}

.progress-stats .success { color: #46b450; }
.progress-stats .error { color: #dc3232; }
.progress-stats .total { color: #666; }

.row-actions {
    font-size: 13px;
    line-height: 1.4;
}

.row-actions a {
    text-decoration: none;
}

.row-actions a:hover {
    text-decoration: underline;
}

.no-jobs {
    text-align: center;
    padding: 40px;
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
}

.no-jobs p {
    margin-bottom: 20px;
    color: #666;
}
</style>
