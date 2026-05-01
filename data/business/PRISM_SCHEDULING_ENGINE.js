// PRISM_SCHEDULING_ENGINE - Lines 770444-770618 (175 lines) - Scheduling engine\n\nconst PRISM_SCHEDULING_ENGINE = {

    version: '1.0.0',

    /**
     * Johnson's Algorithm for 2-machine flow shop
     * Minimizes makespan for jobs requiring Machine A then Machine B
     */
    johnsonsAlgorithm: function(jobs) {
        // jobs = [{ id, machineA: time, machineB: time }]
        const U = []; // Jobs where A < B (schedule early)
        const V = []; // Jobs where A >= B (schedule late)

        jobs.forEach(job => {
            if (job.machineA < job.machineB) {
                U.push(job);
            } else {
                V.push(job);
            }
        });

        // Sort U by increasing A time, V by decreasing B time
        U.sort((a, b) => a.machineA - b.machineA);
        V.sort((a, b) => b.machineB - a.machineB);

        const schedule = [...U, ...V];
        const makespan = this._calculateMakespan(schedule);

        return {
            sequence: schedule.map(j => j.id),
            schedule,
            makespan,
            machineAEnd: makespan.machineATotal,
            machineBEnd: makespan.total
        };
    },
    _calculateMakespan: function(schedule) {
        let machineAEnd = 0;
        let machineBEnd = 0;
        const timeline = [];

        schedule.forEach(job => {
            const aStart = machineAEnd;
            const aEnd = aStart + job.machineA;
            const bStart = Math.max(aEnd, machineBEnd);
            const bEnd = bStart + job.machineB;

            timeline.push({
                job: job.id,
                machineA: { start: aStart, end: aEnd },
                machineB: { start: bStart, end: bEnd }
            });

            machineAEnd = aEnd;
            machineBEnd = bEnd;
        });

        return {
            total: machineBEnd,
            machineATotal: machineAEnd,
            timeline
        };
    },
    /**
     * Priority Dispatching Rules
     */
    priorityDispatch: function(jobs, rule = 'EDD') {
        const sorted = [...jobs];

        switch (rule) {
            case 'EDD': // Earliest Due Date
                sorted.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                break;
            case 'SPT': // Shortest Processing Time
                sorted.sort((a, b) => a.processingTime - b.processingTime);
                break;
            case 'LPT': // Longest Processing Time
                sorted.sort((a, b) => b.processingTime - a.processingTime);
                break;
            case 'FCFS': // First Come First Served
                sorted.sort((a, b) => new Date(a.arrivalTime) - new Date(b.arrivalTime));
                break;
            case 'CR': // Critical Ratio
                const now = new Date();
                sorted.sort((a, b) => {
                    const crA = (new Date(a.dueDate) - now) / a.processingTime;
                    const crB = (new Date(b.dueDate) - now) / b.processingTime;
                    return crA - crB;
                });
                break;
            case 'SLACK': // Minimum Slack Time
                const today = new Date();
                sorted.sort((a, b) => {
                    const slackA = (new Date(a.dueDate) - today) / (1000 * 60 * 60 * 24) - a.processingTime / 8;
                    const slackB = (new Date(b.dueDate) - today) / (1000 * 60 * 60 * 24) - b.processingTime / 8;
                    return slackA - slackB;
                });
                break;
        }
        return {
            rule,
            sequence: sorted.map(j => j.id),
            schedule: sorted
        };
    },
    /**
     * Calculate Schedule Metrics
     */
    calculateMetrics: function(schedule) {
        let totalFlowTime = 0;
        let totalLateness = 0;
        let totalTardiness = 0;
        let lateJobs = 0;
        let currentTime = 0;
        const now = new Date();

        schedule.forEach(job => {
            currentTime += job.processingTime;
            const flowTime = currentTime;
            totalFlowTime += flowTime;

            const dueDate = new Date(job.dueDate);
            const completionDate = new Date(now);
            completionDate.setHours(completionDate.getHours() + flowTime);

            const lateness = (completionDate - dueDate) / (1000 * 60 * 60);
            totalLateness += lateness;

            if (lateness > 0) {
                totalTardiness += lateness;
                lateJobs++;
            }
        });

        const n = schedule.length;

        return {
            makespan: currentTime,
            avgFlowTime: (totalFlowTime / n).toFixed(2),
            avgLateness: (totalLateness / n).toFixed(2),
            avgTardiness: (totalTardiness / n).toFixed(2),
            lateJobs,
            onTimeRate: (((n - lateJobs) / n) * 100).toFixed(1) + '%'
        };
    },
    /**
     * Gantt Chart Data Generator
     */
    generateGanttData: function(schedule, startDate = new Date()) {
        const ganttData = [];
        let currentTime = 0;

        schedule.forEach(job => {
            const startTime = new Date(startDate);
            startTime.setHours(startTime.getHours() + currentTime);

            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + job.processingTime);

            ganttData.push({
                id: job.id,
                name: job.name || job.id,
                start: startTime.toISOString(),
                end: endTime.toISOString(),
                duration: job.processingTime,
                machine: job.machine || 'Machine 1',
                status: job.status || 'scheduled'
            });

            currentTime += job.processingTime;
        });

        return ganttData;
    }
};
