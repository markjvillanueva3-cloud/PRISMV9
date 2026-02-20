const PRISM_JOB_SHOP_SCHEDULING_ENGINE = {
    name: 'PRISM_JOB_SHOP_SCHEDULING_ENGINE',
    version: '1.0.0',
    description: 'Job shop scheduling with dispatching rules and optimization',
    source: 'MIT 15.053, Operations Research',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dispatching Rules
    // ─────────────────────────────────────────────────────────────────────────────
    
    dispatchingRules: {
        FIFO: (jobs) => jobs.sort((a, b) => a.arrivalTime - b.arrivalTime),
        SPT: (jobs) => jobs.sort((a, b) => a.processingTime - b.processingTime),
        LPT: (jobs) => jobs.sort((a, b) => b.processingTime - a.processingTime),
        EDD: (jobs) => jobs.sort((a, b) => a.dueDate - b.dueDate),
        CR: (jobs, currentTime) => jobs.sort((a, b) => {
            const crA = (a.dueDate - currentTime) / a.remainingTime;
            const crB = (b.dueDate - currentTime) / b.remainingTime;
            return crA - crB;
        }),
        SLACK: (jobs, currentTime) => jobs.sort((a, b) => {
            const slackA = a.dueDate - currentTime - a.remainingTime;
            const slackB = b.dueDate - currentTime - b.remainingTime;
            return slackA - slackB;
        })
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Single Machine Scheduling
    // ─────────────────────────────────────────────────────────────────────────────
    
    scheduleSingleMachine: function(jobs, rule = 'SPT', objective = 'makespan') {
        const sortedJobs = [...jobs];
        
        if (this.dispatchingRules[rule]) {
            this.dispatchingRules[rule](sortedJobs, 0);
        }
        
        let currentTime = 0;
        const schedule = [];
        let totalFlowTime = 0;
        let totalTardiness = 0;
        let tardinessCount = 0;
        
        for (const job of sortedJobs) {
            const startTime = Math.max(currentTime, job.arrivalTime || 0);
            const endTime = startTime + job.processingTime;
            
            const tardiness = Math.max(0, endTime - job.dueDate);
            if (tardiness > 0) tardinessCount++;
            
            schedule.push({
                jobId: job.id,
                startTime,
                endTime,
                tardiness,
                flowTime: endTime - (job.arrivalTime || 0)
            });
            
            totalFlowTime += endTime - (job.arrivalTime || 0);
            totalTardiness += tardiness;
            currentTime = endTime;
        }
        
        return {
            schedule,
            makespan: currentTime,
            totalFlowTime,
            averageFlowTime: totalFlowTime / jobs.length,
            totalTardiness,
            numberOfTardyJobs: tardinessCount,
            rule
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Flow Shop Scheduling (Johnson's Algorithm for 2 machines)
    // ─────────────────────────────────────────────────────────────────────────────
    
    johnsonsAlgorithm: function(jobs) {
        // jobs: [{id, machine1Time, machine2Time}]
        const U = []; // Jobs with min time on machine 1
        const V = []; // Jobs with min time on machine 2
        
        for (const job of jobs) {
            if (job.machine1Time <= job.machine2Time) {
                U.push(job);
            } else {
                V.push(job);
            }
        }
        
        // Sort U by machine1Time ascending
        U.sort((a, b) => a.machine1Time - b.machine1Time);
        
        // Sort V by machine2Time descending
        V.sort((a, b) => b.machine2Time - a.machine2Time);
        
        const sequence = [...U, ...V];
        
        // Calculate schedule
        let m1End = 0;
        let m2End = 0;
        const schedule = [];
        
        for (const job of sequence) {
            const m1Start = m1End;
            m1End = m1Start + job.machine1Time;
            
            const m2Start = Math.max(m1End, m2End);
            m2End = m2Start + job.machine2Time;
            
            schedule.push({
                jobId: job.id,
                machine1: { start: m1Start, end: m1End },
                machine2: { start: m2Start, end: m2End }
            });
        }
        
        return {
            sequence: sequence.map(j => j.id),
            schedule,
            makespan: m2End
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Job Shop Scheduling (Dispatching-based simulation)
    // ─────────────────────────────────────────────────────────────────────────────
    
    scheduleJobShop: function(jobs, machines, rule = 'SPT') {
        // jobs: [{id, operations: [{machine, processingTime}]}]
        // machines: [{id}]
        
        const machineQueues = {};
        const machineAvailable = {};
        for (const m of machines) {
            machineQueues[m.id] = [];
            machineAvailable[m.id] = 0;
        }
        
        // Track job progress
        const jobProgress = {};
        for (const job of jobs) {
            jobProgress[job.id] = {
                nextOpIndex: 0,
                available: job.arrivalTime || 0
            };
        }
        
        const schedule = [];
        let completedOps = 0;
        const totalOps = jobs.reduce((sum, j) => sum + j.operations.length, 0);
        let currentTime = 0;
        const maxTime = 100000;
        
        while (completedOps < totalOps && currentTime < maxTime) {
            // Add ready operations to machine queues
            for (const job of jobs) {
                const progress = jobProgress[job.id];
                if (progress.nextOpIndex < job.operations.length) {
                    const op = job.operations[progress.nextOpIndex];
                    if (progress.available <= currentTime) {
                        // Operation is ready
                        const queueItem = {
                            jobId: job.id,
                            opIndex: progress.nextOpIndex,
                            processingTime: op.processingTime,
                            arrivalTime: progress.available,
                            dueDate: job.dueDate || Infinity,
                            remainingTime: job.operations
                                .slice(progress.nextOpIndex)
                                .reduce((sum, o) => sum + o.processingTime, 0)
                        };
                        
                        if (!machineQueues[op.machine].some(q => 
                            q.jobId === job.id && q.opIndex === progress.nextOpIndex)) {
                            machineQueues[op.machine].push(queueItem);
                        }
                    }
                }
            }
            
            // Process each machine
            for (const m of machines) {
                if (machineAvailable[m.id] <= currentTime && machineQueues[m.id].length > 0) {
                    // Apply dispatching rule
                    const queue = machineQueues[m.id];
                    this.dispatchingRules[rule](queue, currentTime);
                    
                    const selected = queue.shift();
                    const startTime = currentTime;
                    const endTime = startTime + selected.processingTime;
                    
                    schedule.push({
                        jobId: selected.jobId,
                        operationIndex: selected.opIndex,
                        machine: m.id,
                        startTime,
                        endTime
                    });
                    
                    machineAvailable[m.id] = endTime;
                    jobProgress[selected.jobId].nextOpIndex++;
                    jobProgress[selected.jobId].available = endTime;
                    completedOps++;
                }
            }
            
            // Advance time
            const nextEvents = [
                ...Object.values(machineAvailable).filter(t => t > currentTime),
                ...Object.values(jobProgress).map(p => p.available).filter(t => t > currentTime)
            ];
            
            if (nextEvents.length > 0) {
                currentTime = Math.min(...nextEvents);
            } else {
                currentTime++;
            }
        }
        
        const makespan = Math.max(...schedule.map(s => s.endTime));
        
        return {
            schedule,
            makespan,
            rule,
            completedOperations: completedOps,
            totalOperations: totalOps
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('schedule.singleMachine', 'PRISM_JOB_SHOP_SCHEDULING_ENGINE.scheduleSingleMachine');
            PRISM_GATEWAY.register('schedule.johnsons', 'PRISM_JOB_SHOP_SCHEDULING_ENGINE.johnsonsAlgorithm');
            PRISM_GATEWAY.register('schedule.jobShop', 'PRISM_JOB_SHOP_SCHEDULING_ENGINE.scheduleJobShop');
        }
    }
}