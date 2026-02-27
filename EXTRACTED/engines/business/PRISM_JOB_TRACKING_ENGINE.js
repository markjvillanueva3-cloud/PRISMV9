/**
 * PRISM_JOB_TRACKING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 240
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_JOB_TRACKING_ENGINE = {

    version: '1.0.0',

    // Job status states
    STATUS: {
        QUOTED: 'quoted',
        ORDERED: 'ordered',
        SCHEDULED: 'scheduled',
        IN_PROGRESS: 'in_progress',
        ON_HOLD: 'on_hold',
        QC_PENDING: 'qc_pending',
        QC_PASSED: 'qc_passed',
        QC_FAILED: 'qc_failed',
        FINISHING: 'finishing',
        COMPLETE: 'complete',
        SHIPPED: 'shipped',
        INVOICED: 'invoiced',
        CLOSED: 'closed'
    },
    // Active jobs store
    jobs: new Map(),

    /**
     * Create new job from quote
     */
    createJob: function(quote, orderDetails = {}) {
        const jobId = this._generateJobId();

        const job = {
            id: jobId,
            quoteNumber: quote.quoteNumber,

            customer: quote.customer,
            partInfo: quote.jobSummary,

            status: this.STATUS.ORDERED,
            statusHistory: [{
                status: this.STATUS.ORDERED,
                timestamp: new Date().toISOString(),
                user: orderDetails.createdBy || 'system'
            }],

            pricing: quote.pricing,

            schedule: {
                orderDate: new Date().toISOString().split('T')[0],
                dueDate: orderDetails.dueDate || this._calculateDueDate(quote.leadTime.standard),
                scheduledStart: null,
                scheduledEnd: null,
                actualStart: null,
                actualEnd: null
            },
            operations: [],

            progress: {
                percentComplete: 0,
                partsComplete: 0,
                partsTotal: quote.jobSummary.quantity
            },
            materials: {
                ordered: false,
                received: false,
                allocated: false
            },
            quality: {
                firstArticlePassed: null,
                inspectionResults: [],
                ncrs: []
            },
            timeTracking: {
                estimatedHours: 0,
                actualHours: 0,
                entries: []
            },
            costs: {
                estimated: quote.costBreakdown,
                actual: {},
                variance: {}
            },
            notes: [],
            attachments: []
        };
        this.jobs.set(jobId, job);
        return job;
    },
    /**
     * Update job status
     */
    updateStatus: function(jobId, newStatus, details = {}) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        const previousStatus = job.status;
        job.status = newStatus;
        job.statusHistory.push({
            status: newStatus,
            previousStatus,
            timestamp: new Date().toISOString(),
            user: details.user || 'system',
            notes: details.notes || ''
        });

        // Auto-update related fields
        if (newStatus === this.STATUS.IN_PROGRESS && !job.schedule.actualStart) {
            job.schedule.actualStart = new Date().toISOString();
        }
        if (newStatus === this.STATUS.COMPLETE || newStatus === this.STATUS.SHIPPED) {
            job.schedule.actualEnd = new Date().toISOString();
        }
        return { success: true, job };
    },
    /**
     * Record time entry
     */
    recordTime: function(jobId, timeEntry) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        const entry = {
            id: Date.now(),
            date: timeEntry.date || new Date().toISOString().split('T')[0],
            employee: timeEntry.employee,
            operation: timeEntry.operation,
            hours: timeEntry.hours,
            machine: timeEntry.machine,
            notes: timeEntry.notes || ''
        };
        job.timeTracking.entries.push(entry);
        job.timeTracking.actualHours += timeEntry.hours;

        return { success: true, entry };
    },
    /**
     * Update progress
     */
    updateProgress: function(jobId, partsComplete) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        job.progress.partsComplete = partsComplete;
        job.progress.percentComplete = Math.round((partsComplete / job.progress.partsTotal) * 100);

        return { success: true, progress: job.progress };
    },
    /**
     * Add inspection result
     */
    addInspectionResult: function(jobId, result) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        const inspection = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            inspector: result.inspector,
            type: result.type || 'in_process',
            partNumbers: result.partNumbers || [],
            passed: result.passed,
            measurements: result.measurements || [],
            notes: result.notes || ''
        };
        job.quality.inspectionResults.push(inspection);

        if (result.type === 'first_article') {
            job.quality.firstArticlePassed = result.passed;
        }
        return { success: true, inspection };
    },
    /**
     * Get job summary
     */
    getJobSummary: function(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return { error: 'Job not found' };

        // Calculate schedule variance
        const dueDate = new Date(job.schedule.dueDate);
        const today = new Date();
        const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        // Calculate cost variance
        const estimatedTotal = Object.values(job.costs.estimated).reduce((a, b) => a + b, 0);
        const actualTotal = Object.values(job.costs.actual).reduce((a, b) => a + b, 0);
        const costVariance = actualTotal - estimatedTotal;

        return {
            id: job.id,
            status: job.status,
            customer: job.customer.name,
            partNumber: job.partInfo.partNumber,
            quantity: job.partInfo.quantity,

            progress: job.progress,

            schedule: {
                dueDate: job.schedule.dueDate,
                daysRemaining,
                onSchedule: daysRemaining >= 0
            },
            financials: {
                quotePrice: job.pricing.totalPrice,
                actualCost: actualTotal,
                costVariance,
                projectedMargin: ((job.pricing.totalPrice - actualTotal) / job.pricing.totalPrice * 100).toFixed(1) + '%'
            },
            quality: {
                firstArticle: job.quality.firstArticlePassed,
                inspections: job.quality.inspectionResults.length,
                ncrs: job.quality.ncrs.length
            }
        };
    },
    /**
     * Get all active jobs
     */
    getActiveJobs: function() {
        const active = [];
        const closedStatuses = [this.STATUS.CLOSED, this.STATUS.SHIPPED, this.STATUS.INVOICED];

        for (const [id, job] of this.jobs) {
            if (!closedStatuses.includes(job.status)) {
                active.push(this.getJobSummary(id));
            }
        }
        return active.sort((a, b) => a.schedule.daysRemaining - b.schedule.daysRemaining);
    },
    _generateJobId: function() {
        const prefix = 'J';
        const year = new Date().getFullYear().toString().slice(-2);
        const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${year}${month}-${random}`;
    },
    _calculateDueDate: function(leadTimeDays) {
        const date = new Date();
        date.setDate(date.getDate() + leadTimeDays);
        return date.toISOString().split('T')[0];
    }
}