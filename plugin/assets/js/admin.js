/**
 * Aoikumo Importer Admin JavaScript
 */

(function($) {
    'use strict';
    
    var AoikumoImporterAdmin = {
        init: function() {
            this.bindEvents();
            this.initializeAdminFeatures();
        },
        
        bindEvents: function() {
            // Test connection button
            $(document).on('click', '#test-connection-btn', this.testConnection.bind(this));
            
            // Bulk actions
            $(document).on('click', '#doaction, #doaction2', this.handleBulkActions.bind(this));
            
            // Job actions
            $(document).on('click', '.view-job-btn', this.viewJobDetails.bind(this));
            $(document).on('click', '.retry-job-btn', this.retryFailedRows.bind(this));
            $(document).on('click', '.download-logs-btn', this.downloadLogs.bind(this));
            $(document).on('click', '.delete-job-btn', this.deleteJob.bind(this));
            
            // Modal close
            $(document).on('click', '.modal-close', this.closeModal.bind(this));
            $(document).on('click', '.aoikumo-modal', function(e) {
                if (e.target === this) {
                    AoikumoImporterAdmin.closeModal();
                }
            });
            
            // Settings validation
            $(document).on('change', '#aoikumo_importer_worker_url', this.validateWorkerUrl.bind(this));
        },
        
        initializeAdminFeatures: function() {
            // Add test connection button to settings page
            if ($('#aoikumo_importer_worker_url').length) {
                this.addTestConnectionButton();
            }
            
            // Initialize bulk actions
            this.initializeBulkActions();
            
            // Initialize tooltips
            this.initializeTooltips();
        },
        
        addTestConnectionButton: function() {
            var testButton = $('<button type="button" id="test-connection-btn" class="button button-secondary">Test Connection</button>');
            testButton.insertAfter('#aoikumo_importer_worker_url');
            
            // Add status indicator
            var statusDiv = $('<div id="connection-status" style="margin-top: 10px;"></div>');
            statusDiv.insertAfter(testButton);
        },
        
        testConnection: function(e) {
            e.preventDefault();
            
            var button = $(e.target);
            var statusDiv = $('#connection-status');
            var workerUrl = $('#aoikumo_importer_worker_url').val();
            
            if (!workerUrl) {
                statusDiv.html('<span style="color: #dc3232;">Please enter a worker service URL first.</span>');
                return;
            }
            
            // Disable button and show loading
            button.prop('disabled', true).text('Testing...');
            statusDiv.html('<span style="color: #666;">Testing connection...</span>');
            
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'aoikumo_importer_test_connection',
                    nonce: aoikumoImporter.nonce
                },
                success: function(response) {
                    if (response.success) {
                        statusDiv.html('<span style="color: #46b450;">✓ ' + response.data.message + '</span>');
                    } else {
                        statusDiv.html('<span style="color: #dc3232;">✗ ' + response.data + '</span>');
                    }
                },
                error: function() {
                    statusDiv.html('<span style="color: #dc3232;">✗ Network error occurred</span>');
                },
                complete: function() {
                    button.prop('disabled', false).text('Test Connection');
                }
            });
        },
        
        validateWorkerUrl: function(e) {
            var url = $(e.target).val();
            var statusDiv = $('#connection-status');
            
            if (url && !this.isValidUrl(url)) {
                statusDiv.html('<span style="color: #ffb900;">⚠ Please enter a valid URL</span>');
            } else if (url) {
                statusDiv.html('<span style="color: #666;">Click "Test Connection" to verify the service is working.</span>');
            } else {
                statusDiv.html('');
            }
        },
        
        isValidUrl: function(string) {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        },
        
        initializeBulkActions: function() {
            // Add bulk action options
            var bulkActions = $('#bulk-action-selector-top, #bulk-action-selector-bottom');
            
            if (bulkActions.length) {
                bulkActions.append('<option value="delete">Delete Selected</option>');
                bulkActions.append('<option value="retry">Retry Failed Rows</option>');
                bulkActions.append('<option value="download-logs">Download Logs</option>');
            }
        },
        
        handleBulkActions: function(e) {
            var action = $(e.target).prev('select').val();
            var selectedJobs = $('input[name="job_ids[]"]:checked').map(function() {
                return $(this).val();
            }).get();
            
            if (selectedJobs.length === 0) {
                alert('Please select jobs to perform bulk actions.');
                return false;
            }
            
            switch (action) {
                case 'delete':
                    if (confirm('Are you sure you want to delete ' + selectedJobs.length + ' selected job(s)? This action cannot be undone.')) {
                        this.bulkDeleteJobs(selectedJobs);
                    }
                    break;
                    
                case 'retry':
                    if (confirm('Create retry jobs for failed rows in ' + selectedJobs.length + ' selected job(s)?')) {
                        this.bulkRetryJobs(selectedJobs);
                    }
                    break;
                    
                case 'download-logs':
                    this.bulkDownloadLogs(selectedJobs);
                    break;
            }
            
            return false;
        },
        
        bulkDeleteJobs: function(jobIds) {
            // Implementation for bulk delete
            console.log('Bulk delete jobs:', jobIds);
            alert('Bulk delete functionality not implemented yet');
        },
        
        bulkRetryJobs: function(jobIds) {
            // Implementation for bulk retry
            console.log('Bulk retry jobs:', jobIds);
            alert('Bulk retry functionality not implemented yet');
        },
        
        bulkDownloadLogs: function(jobIds) {
            // Implementation for bulk download
            console.log('Bulk download logs for jobs:', jobIds);
            alert('Bulk download functionality not implemented yet');
        },
        
        initializeTooltips: function() {
            // Add tooltips to various elements
            $('.status-badge').each(function() {
                var status = $(this).text().toLowerCase();
                var tooltip = '';
                
                switch (status) {
                    case 'pending':
                        tooltip = 'Job is waiting to be processed';
                        break;
                    case 'processing':
                        tooltip = 'Job is currently being processed';
                        break;
                    case 'completed':
                        tooltip = 'Job has finished successfully';
                        break;
                    case 'failed':
                        tooltip = 'Job encountered an error and failed';
                        break;
                    case 'cancelled':
                        tooltip = 'Job was cancelled by user or system';
                        break;
                }
                
                if (tooltip) {
                    $(this).attr('title', tooltip);
                }
            });
        },
        
        viewJobDetails: function(e) {
            e.preventDefault();
            var jobId = $(e.target).data('job-id');
            this.loadJobDetails(jobId);
        },
        
        loadJobDetails: function(jobId) {
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'aoikumo_importer_get_job_status',
                    nonce: aoikumoImporter.nonce,
                    job_id: jobId
                },
                success: function(response) {
                    if (response.success) {
                        AoikumoImporterAdmin.displayJobDetails(response.data);
                    } else {
                        alert('Failed to load job details');
                    }
                },
                error: function() {
                    alert('Network error occurred');
                }
            });
        },
        
        displayJobDetails: function(job) {
            var content = '<div class="job-details">';
            content += '<table class="form-table">';
            content += '<tr><th>Job ID:</th><td>#' + job.id + '</td></tr>';
            content += '<tr><th>Status:</th><td><span class="status-badge status-' + job.status + '">' + job.status + '</span></td></tr>';
            content += '<tr><th>Created:</th><td>' + job.created_at + '</td></tr>';
            content += '<tr><th>Updated:</th><td>' + job.updated_at + '</td></tr>';
            content += '<tr><th>Sheet ID:</th><td><code>' + job.sheet_id + '</code></td></tr>';
            content += '<tr><th>Range:</th><td><code>' + job.range + '</code></td></tr>';
            content += '<tr><th>Mapping:</th><td>' + job.mapping + '</td></tr>';
            content += '<tr><th>Type:</th><td>' + (job.is_dry_run ? 'Dry Run' : 'Import') + '</td></tr>';
            
            if (job.total_rows > 0) {
                content += '<tr><th>Progress:</th><td>' + job.current_row + ' / ' + job.total_rows + ' rows</td></tr>';
                content += '<tr><th>Success:</th><td>' + job.success_count + ' rows</td></tr>';
                content += '<tr><th>Errors:</th><td>' + job.error_count + ' rows</td></tr>';
            }
            
            if (job.progress_data) {
                content += '<tr><th>Progress Data:</th><td><pre>' + JSON.stringify(job.progress_data, null, 2) + '</pre></td></tr>';
            }
            
            content += '</table>';
            content += '</div>';
            
            $('#job-details-content').html(content);
            $('#job-modal').show();
        },
        
        retryFailedRows: function(e) {
            e.preventDefault();
            var jobId = $(e.target).data('job-id');
            
            if (!jobId) {
                alert('No job ID found');
                return;
            }
            
            if (confirm('Create a new job to retry failed rows?')) {
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'aoikumo_importer_retry_failed_rows',
                        nonce: aoikumoImporter.nonce,
                        job_id: jobId
                    },
                    success: function(response) {
                        if (response.success) {
                            alert('Retry job created successfully');
                            location.reload();
                        } else {
                            alert('Failed to create retry job: ' + response.data);
                        }
                    },
                    error: function() {
                        alert('Network error occurred');
                    }
                });
            }
        },
        
        downloadLogs: function(e) {
            e.preventDefault();
            var jobId = $(e.target).data('job-id');
            
            if (!jobId) {
                alert('No job ID found');
                return;
            }
            
            // Create a form to submit the download request
            var form = $('<form>', {
                method: 'POST',
                action: ajaxurl,
                target: '_blank'
            });
            
            form.append($('<input>', {
                type: 'hidden',
                name: 'action',
                value: 'aoikumo_importer_download_logs'
            }));
            
            form.append($('<input>', {
                type: 'hidden',
                name: 'nonce',
                value: aoikumoImporter.nonce
            }));
            
            form.append($('<input>', {
                type: 'hidden',
                name: 'job_id',
                value: jobId
            }));
            
            $('body').append(form);
            form.submit();
            form.remove();
        },
        
        deleteJob: function(e) {
            e.preventDefault();
            var jobId = $(e.target).data('job-id');
            
            if (!jobId) {
                alert('No job ID found');
                return;
            }
            
            if (confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
                // Add delete functionality here
                alert('Delete functionality not implemented yet');
            }
        },
        
        closeModal: function() {
            $('#job-modal').hide();
        }
    };
    
    // Initialize when document is ready
    $(document).ready(function() {
        AoikumoImporterAdmin.init();
    });
    
})(jQuery);
