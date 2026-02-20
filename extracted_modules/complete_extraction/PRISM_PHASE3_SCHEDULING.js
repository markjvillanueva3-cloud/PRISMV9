const PRISM_PHASE3_SCHEDULING = {
    name: 'Phase 3 Scheduling & Operations',
    version: '1.0.0',
    sources: ['MIT 15.053', 'MIT 15.099', 'MIT 2.008'],
    algorithmCount: 10,
    
    /**
     * Job Shop Scheduling with Genetic Algorithm
     * Source: MIT 15.053 - Optimization Methods
     * Usage: Optimize job sequencing across multiple machines
     */
    jobShopGA: function(jobs, machines, populationSize = 50, generations = 100) {
        const numJobs = jobs.length;
        const numMachines = machines.length;
        
        // Initialize population (permutations of job order)
        const population = [];
        for (let i = 0; i < populationSize; i++) {
            const chromosome = Array.from({length: numJobs}, (_, j) => j);
            this._shuffle(chromosome);
            population.push(chromosome);
        }
        
        // Fitness function: minimize makespan
        const fitness = (chromosome) => {
            const machineEndTimes = new Array(numMachines).fill(0);
            const jobEndTimes = new Array(numJobs).fill(0);
            
            for (const jobIdx of chromosome) {
                const job = jobs[jobIdx];
                for (const op of job.operations) {
                    const machineIdx = op.machine;
                    const startTime = Math.max(machineEndTimes[machineIdx], jobEndTimes[jobIdx]);
                    const endTime = startTime + op.duration;
                    machineEndTimes[machineIdx] = endTime;
                    jobEndTimes[jobIdx] = endTime;
                }
            }
            
            return -Math.max(...jobEndTimes); // Negative for maximization
        };
        
        // Evolve
        for (let gen = 0; gen < generations; gen++) {
            // Evaluate fitness
            const evaluated = population.map(chr => ({ chr, fit: fitness(chr) }));
            evaluated.sort((a, b) => b.fit - a.fit);
            
            // Selection: keep top 50%
            const survivors = evaluated.slice(0, Math.floor(populationSize / 2)).map(e => e.chr);
            
            // Crossover and mutation
            const newPopulation = [...survivors];
            while (newPopulation.length < populationSize) {
                const parent1 = survivors[Math.floor(Math.random() * survivors.length)];
                const parent2 = survivors[Math.floor(Math.random() * survivors.length)];
                
                // Order crossover
                const child = this._orderCrossover(parent1, parent2);
                
                // Mutation
                if (Math.random() < 0.1) {
                    const i = Math.floor(Math.random() * numJobs);
                    const j = Math.floor(Math.random() * numJobs);
                    [child[i], child[j]] = [child[j], child[i]];
                }
                
                newPopulation.push(child);
            }
            
            population.length = 0;
            population.push(...newPopulation);
        }
        
        // Return best
        const best = population.reduce((a, b) => fitness(a) > fitness(b) ? a : b);
        const makespan = -fitness(best);
        
        return {
            schedule: best,
            makespan,
            generations,
            source: 'MIT 15.053 - Job Shop GA'
        };
    },
    
    /**
     * Flow Shop Scheduling
     * Source: MIT 15.053
     */
    flowShop: function(jobs, method = 'neh') {
        const n = jobs.length;
        
        if (method === 'neh') {
            // NEH heuristic
            // Sort by total processing time (descending)
            const sorted = jobs.map((j, i) => ({
                idx: i,
                total: j.reduce((sum, p) => sum + p, 0)
            })).sort((a, b) => b.total - a.total);
            
            let sequence = [sorted[0].idx];
            
            for (let k = 1; k < n; k++) {
                const job = sorted[k].idx;
                let bestPos = 0;
                let bestMakespan = Infinity;
                
                for (let pos = 0; pos <= sequence.length; pos++) {
                    const testSeq = [...sequence.slice(0, pos), job, ...sequence.slice(pos)];
                    const makespan = this.makespan(testSeq.map(i => jobs[i]));
                    if (makespan < bestMakespan) {
                        bestMakespan = makespan;
                        bestPos = pos;
                    }
                }
                
                sequence = [...sequence.slice(0, bestPos), job, ...sequence.slice(bestPos)];
            }
            
            return {
                sequence,
                makespan: this.makespan(sequence.map(i => jobs[i])),
                method: 'NEH',
                source: 'MIT 15.053 - Flow Shop NEH'
            };
        }
        
        return {
            sequence: Array.from({length: n}, (_, i) => i),
            makespan: this.makespan(jobs),
            method: 'FIFO',
            source: 'MIT 15.053 - Flow Shop'
        };
    },
    
    /**
     * Johnson's Algorithm (2-machine flow shop)
     * Source: MIT 15.053
     */
    johnsonAlgorithm: function(jobs) {
        // Jobs: array of [machine1_time, machine2_time]
        const indexed = jobs.map((j, i) => ({ idx: i, m1: j[0], m2: j[1] }));
        
        const set1 = indexed.filter(j => j.m1 <= j.m2).sort((a, b) => a.m1 - b.m1);
        const set2 = indexed.filter(j => j.m1 > j.m2).sort((a, b) => b.m2 - a.m2);
        
        const sequence = [...set1, ...set2].map(j => j.idx);
        
        // Calculate makespan
        let m1End = 0, m2End = 0;
        for (const idx of sequence) {
            m1End += jobs[idx][0];
            m2End = Math.max(m1End, m2End) + jobs[idx][1];
        }
        
        return {
            sequence,
            makespan: m2End,
            source: 'MIT 15.053 - Johnson\'s Algorithm'
        };
    },
    
    /**
     * Critical Path Method
     * Source: MIT 15.053
     */
    criticalPath: function(activities) {
        // Activities: [{id, duration, predecessors: []}]
        const activityMap = {};
        
        for (const a of activities) {
            activityMap[a.id] = {
                ...a,
                es: 0, // Early start
                ef: 0, // Early finish
                ls: Infinity, // Late start
                lf: Infinity  // Late finish
            };
        }
        
        // Forward pass
        let changed = true;
        while (changed) {
            changed = false;
            for (const a of activities) {
                let maxPredEF = 0;
                for (const predId of (a.predecessors || [])) {
                    maxPredEF = Math.max(maxPredEF, activityMap[predId].ef);
                }
                
                if (maxPredEF > activityMap[a.id].es) {
                    activityMap[a.id].es = maxPredEF;
                    activityMap[a.id].ef = maxPredEF + a.duration;
                    changed = true;
                }
            }
        }
        
        // Project duration
        const projectDuration = Math.max(...activities.map(a => activityMap[a.id].ef));
        
        // Backward pass
        for (const a of activities) {
            activityMap[a.id].lf = projectDuration;
            activityMap[a.id].ls = projectDuration - a.duration;
        }
        
        changed = true;
        while (changed) {
            changed = false;
            for (const a of activities) {
                const successors = activities.filter(act => 
                    (act.predecessors || []).includes(a.id)
                );
                
                const minSuccLS = successors.length > 0 ?
                    Math.min(...successors.map(s => activityMap[s.id].ls)) :
                    projectDuration;
                
                if (minSuccLS < activityMap[a.id].lf) {
                    activityMap[a.id].lf = minSuccLS;
                    activityMap[a.id].ls = minSuccLS - a.duration;
                    changed = true;
                }
            }
        }
        
        // Find critical path
        const critical = activities.filter(a => 
            Math.abs(activityMap[a.id].es - activityMap[a.id].ls) < 0.001
        ).map(a => a.id);
        
        return {
            activities: activityMap,
            criticalPath: critical,
            projectDuration,
            source: 'MIT 15.053 - Critical Path'
        };
    },
    
    /**
     * Resource Leveling
     * Source: MIT 15.053
     */
    resourceLeveling: function(schedule, resourceLimit) {
        const leveled = [...schedule].sort((a, b) => a.start - b.start);
        const resourceUsage = [];
        
        for (const task of leveled) {
            let start = task.start;
            
            while (true) {
                const usage = resourceUsage.filter(r => 
                    r.start < start + task.duration && r.end > start
                ).reduce((sum, r) => sum + r.resource, 0);
                
                if (usage + (task.resource || 1) <= resourceLimit) {
                    break;
                }
                start++;
            }
            
            task.leveledStart = start;
            resourceUsage.push({
                start,
                end: start + task.duration,
                resource: task.resource || 1
            });
        }
        
        return {
            schedule: leveled,
            maxResourceUsage: Math.max(...leveled.map(t => t.resource || 1)),
            source: 'MIT 15.053 - Resource Leveling'
        };
    },
    
    /**
     * Earliest Due Date (EDD) Rule
     * Source: MIT 15.053
     */
    earliestDueDate: function(jobs) {
        // Jobs: [{processingTime, dueDate}]
        const sorted = jobs.map((j, i) => ({ ...j, idx: i }))
            .sort((a, b) => a.dueDate - b.dueDate);
        
        const sequence = sorted.map(j => j.idx);
        
        // Calculate lateness
        let currentTime = 0;
        let maxLateness = 0;
        let totalLateness = 0;
        
        for (const job of sorted) {
            currentTime += job.processingTime;
            const lateness = Math.max(0, currentTime - job.dueDate);
            maxLateness = Math.max(maxLateness, lateness);
            totalLateness += lateness;
        }
        
        return {
            sequence,
            maxLateness,
            totalLateness,
            makespan: currentTime,
            source: 'MIT 15.053 - Earliest Due Date'
        };
    },
    
    /**
     * Shortest Processing Time (SPT) Rule
     * Source: MIT 15.053
     */
    shortestProcessingTime: function(jobs) {
        const sorted = jobs.map((j, i) => ({ ...j, idx: i }))
            .sort((a, b) => a.processingTime - b.processingTime);
        
        const sequence = sorted.map(j => j.idx);
        
        // Calculate flow times
        let currentTime = 0;
        let totalFlowTime = 0;
        
        for (const job of sorted) {
            currentTime += job.processingTime;
            totalFlowTime += currentTime;
        }
        
        return {
            sequence,
            totalFlowTime,
            avgFlowTime: totalFlowTime / jobs.length,
            makespan: currentTime,
            source: 'MIT 15.053 - Shortest Processing Time'
        };
    },
    
    /**
     * Makespan Calculation
     * Source: MIT 15.053
     */
    makespan: function(jobs) {
        if (!jobs || jobs.length === 0) return 0;
        
        const numMachines = jobs[0].length || 1;
        const machineEndTimes = new Array(numMachines).fill(0);
        
        for (const job of jobs) {
            for (let m = 0; m < numMachines; m++) {
                const startTime = m === 0 ? 
                    machineEndTimes[m] : 
                    Math.max(machineEndTimes[m], machineEndTimes[m - 1]);
                machineEndTimes[m] = startTime + (job[m] || 0);
            }
        }
        
        return machineEndTimes[numMachines - 1];
    },
    
    /**
     * Tardiness Calculation
     * Source: MIT 15.053
     */
    tardiness: function(jobs, sequence) {
        let currentTime = 0;
        let totalTardiness = 0;
        let numTardy = 0;
        
        for (const idx of sequence) {
            const job = jobs[idx];
            currentTime += job.processingTime;
            const tardiness = Math.max(0, currentTime - job.dueDate);
            totalTardiness += tardiness;
            if (tardiness > 0) numTardy++;
        }
        
        return {
            totalTardiness,
            numTardy,
            avgTardiness: totalTardiness / jobs.length,
            source: 'MIT 15.053 - Tardiness'
        };
    },
    
    /**
     * Gantt Chart Generation
     * Source: MIT 15.053
     */
    ganttChart: function(schedule) {
        const gantt = {
            jobs: [],
            machines: {},
            makespan: 0
        };
        
        for (const task of schedule) {
            const start = task.leveledStart || task.start || 0;
            const end = start + task.duration;
            
            gantt.jobs.push({
                id: task.id,
                name: task.name || `Task ${task.id}`,
                start,
                end,
                duration: task.duration,
                machine: task.machine
            });
            
            if (task.machine !== undefined) {
                if (!gantt.machines[task.machine]) {
                    gantt.machines[task.machine] = [];
                }
                gantt.machines[task.machine].push({ id: task.id, start, end });
            }
            
            gantt.makespan = Math.max(gantt.makespan, end);
        }
        
        return {
            ...gantt,
            source: 'MIT 15.053 - Gantt Chart'
        };
    },
    
    // Helper functions
    _shuffle: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },
    
    _orderCrossover: function(parent1, parent2) {
        const n = parent1.length;
        const child = new Array(n).fill(-1);
        
        const start = Math.floor(Math.random() * n);
        const end = start + Math.floor(Math.random() * (n - start));
        
        for (let i = start; i <= end; i++) {
            child[i] = parent1[i];
        }
        
        let pos = (end + 1) % n;
        for (let i = 0; i < n; i++) {
            const gene = parent2[(end + 1 + i) % n];
            if (!child.includes(gene)) {
                child[pos] = gene;
                pos = (pos + 1) % n;
            }
        }
        
        return child;
    }
};