/**
 * Aoikumo Importer Frontend JavaScript
 */

(function($) {
    'use strict';
    
    var AoikumoImporter = {
        currentJobId: null,
        progressInterval: null,
        startTime: null,
        
        init: function() {
            this.bindEvents();
            this.initializeForm();
        },
        
        bindEvents: function() {
            // Form submission
            $('#dry-run-btn').on('click', this.handleDryRun.bind(this));
            $('#import-btn').on('click', this.handleImport.bind(this));
            
            // Job actions
            $(document).on('click', '.view-job-btn', this.viewJobDetails.bind(this));
            $(document).on('click', '.retry-job-btn', this.retryFailedRows.bind(this));
            $(document).on('click', '.download-logs-btn', this.downloadLogs.bind(this));
            $(document).on('click', '.delete-job-btn', this.deleteJob.bind(this));
            
            // Modal close
            $(document).on('click', '.modal-close', this.closeModal.bind(this));
            $(document).on('click', '.aoikumo-modal', function(e) {
                if (e.target === this) {
                    AoikumoImporter.closeModal();
                }
            });
        },
        
        initializeForm: function() {
            // Set default values if available
            var defaultSheetId = $('#sheet_id').val();
            var defaultRange = $('#range').val();
            
            if (defaultSheetId) {
                $('#sheet_id').attr('placeholder', 'Using default: ' + defaultSheetId);
            }
            if (defaultRange) {
                $('#range').attr('placeholder', 'Using default: ' + defaultRange);
            }
        },
        
        handleDryRun: function(e) {
            e.preventDefault();
            
            if (!this.validateForm()) {
                return;
            }
            
            if (confirm(aoikumoImporter.strings.confirmDryRun)) {
                this.submitJob(true);
            }
        },
        
        handleImport: function(e) {
            e.preventDefault();
            
            if (!this.validateForm()) {
                return;
            }
            
            if (confirm(aoikumoImporter.strings.confirmImport)) {
                this.submitJob(false);
            }
        },
        
        validateForm: function() {
            var sheetId = $('#sheet_id').val().trim();
            var range = $('#range').val().trim();
            var mapping = $('#mapping').val();
            
            if (!sheetId) {
                alert('Please enter a Google Sheet ID');
                $('#sheet_id').focus();
                return false;
            }
            
            if (!range) {
                alert('Please enter a range');
                $('#range').focus();
                return false;
            }
            
            if (!mapping) {
                alert('Please select a mapping');
                $('#mapping').focus();
                return false;
            }
            
            return true;
        },
        
        submitJob: function(isDryRun) {
            var formData = {
                action: 'aoikumo_importer_submit_job',
                nonce: aoikumoImporter.nonce,
                sheet_id: $('#sheet_id').val().trim(),
                range: $('#range').val().trim(),
                mapping: $('#mapping').val(),
                is_dry_run: isDryRun
            };
            
            // Show progress section
            this.showProgressSection();
            this.updateStatusMessage(aoikumoImporter.strings.processing);
            
            // Disable form
            this.setFormEnabled(false);
            
            $.ajax({
                url: aoikumoImporter.ajaxUrl,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        AoikumoImporter.currentJobId = response.data.job_id;
                        AoikumoImporter.startTime = new Date();
                        AoikumoImporter.startProgressMonitoring();
                        AoikumoImporter.updateStatusMessage('Job submitted successfully. Starting import...');
                    } else {
                        AoikumoImporter.handleError(response.data || 'Failed to submit job');
                    }
                },
                error: function() {
                    AoikumoImporter.handleError('Network error occurred');
                }
            });
        },
        
        showProgressSection: function() {
            $('#progress-section').show();
            $('#results-section').hide();
            this.resetProgress();
        },
        
        resetProgress: function() {
            $('#total-rows').text('0');
            $('#processed-rows').text('0');
            $('#success-count').text('0');
            $('#error-count').text('0');
            $('#progress-fill').css('width', '0%');
        },
        
        startProgressMonitoring: function() {
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }
            
            this.progressInterval = setInterval(function() {
                AoikumoImporter.checkJobProgress();
            }, 2000);
        },
        
        checkJobProgress: function() {
            if (!this.currentJobId) {
                return;
            }
            
            $.ajax({
                url: aoikumoImporter.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'aoikumo_importer_get_job_status',
                    nonce: aoikumoImporter.nonce,
                    job_id: this.currentJobId
                },
                success: function(response) {
                    if (response.success) {
                        AoikumoImporter.updateProgress(response.data);
                        
                        if (response.data.status === 'completed' || response.data.status === 'failed') {
                            AoikumoImporter.jobCompleted(response.data);
                        }
                    }
                },
                error: function() {
                    // Continue monitoring even if this check fails
                }
            });
        },
        
        updateProgress: function(job) {
            if (job.total_rows > 0) {
                var progress = (job.current_row / job.total_rows) * 100;
                $('#progress-fill').css('width', progress + '%');
                $('#total-rows').text(job.total_rows);
                $('#processed-rows').text(job.current_row);
                $('#success-count').text(job.success_count);
                $('#error-count').text(job.error_count);
            }
            
            // Update status message
            var statusMsg = 'Processing row ' + job.current_row;
            if (job.total_rows > 0) {
                statusMsg += ' of ' + job.total_rows;
            }
            statusMsg += '...';
            this.updateStatusMessage(statusMsg);
        },
        
        jobCompleted: function(job) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
            
            // Show results section
            this.showResultsSection(job);
            
            // Re-enable form
            this.setFormEnabled(true);
            
            // Update final status
            var statusClass = job.status === 'completed' ? 'success' : 'error';
            var statusText = job.status === 'completed' ? 'Completed Successfully' : 'Failed';
            
            $('#final-status').html('<span class="' + statusClass + '">' + statusText + '</span>');
            $('#job-id').text('#' + job.id);
            
            if (this.startTime) {
                var duration = Math.round((new Date() - this.startTime) / 1000);
                $('#duration').text(duration + ' seconds');
            }
            
            // Show retry button if there are errors
            if (job.error_count > 0) {
                $('#retry-failed-btn').show();
            }
        },
        
        showResultsSection: function(job) {
            $('#progress-section').hide();
            $('#results-section').show();
        },
        
        updateStatusMessage: function(message) {
            $('#status-message').text(message);
        },
        
        setFormEnabled: function(enabled) {
            var inputs = $('#aoikumo-importer-form input, #aoikumo-importer-form select, #aoikumo-importer-form button');
            inputs.prop('disabled', !enabled);
        },
        
        handleError: function(message) {
            this.updateStatusMessage('Error: ' + message);
            this.setFormEnabled(true);
            $('#progress-section').hide();
        },
        
        viewJobDetails: function(e) {
            e.preventDefault();
            var jobId = $(e.target).data('job-id');
            this.loadJobDetails(jobId);
        },
        
        loadJobDetails: function(jobId) {
            $.ajax({
                url: aoikumoImporter.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'aoikumo_importer_get_job_status',
                    nonce: aoikumoImporter.nonce,
                    job_id: jobId
                },
                success: function(response) {
                    if (response.success) {
                        AoikumoImporter.displayJobDetails(response.data);
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
            content += '<tr><th>Sheet ID:</th><td><code>' + job.sheet_id + '</code></td></tr>';
            content += '<tr><th>Range:</th><td><code>' + job.range + '</code></td></tr>';
            content += '<tr><th>Mapping:</th><td>' + job.mapping + '</td></tr>';
            content += '<tr><th>Type:</th><td>' + (job.is_dry_run ? 'Dry Run' : 'Import') + '</td></tr>';
            
            if (job.total_rows > 0) {
                content += '<tr><th>Progress:</th><td>' + job.current_row + ' / ' + job.total_rows + ' rows</td></tr>';
                content += '<tr><th>Success:</th><td>' + job.success_count + ' rows</td></tr>';
                content += '<tr><th>Errors:</th><td>' + job.error_count + ' rows</td></tr>';
            }
            
            content += '</table>';
            content += '</div>';
            
            $('#job-details-content').html(content);
            $('#job-modal').show();
        },
        
        retryFailedRows: function(e) {
            e.preventDefault();
            var jobId = $(e.target).data('job-id') || this.currentJobId;
            
            if (!jobId) {
                alert('No job ID found');
                return;
            }
            
            if (confirm('Create a new job to retry failed rows?')) {
                $.ajax({
                    url: aoikumoImporter.ajaxUrl,
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
            var jobId = $(e.target).data('job-id') || this.currentJobId;
            
            if (!jobId) {
                alert('No job ID found');
                return;
            }
            
            // Create a form to submit the download request
            var form = $('<form>', {
                method: 'POST',
                action: aoikumoImporter.ajaxUrl,
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
        AoikumoImporter.init();
    });
    
})(jQuery);
