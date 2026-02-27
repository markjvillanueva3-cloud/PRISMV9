// PRISM_SHOP_OPTIMIZER - Lines 825081-825308 (228 lines) - Shop optimizer\n\nconst PRISM_SHOP_OPTIMIZER = {
    version: '1.0.0',
    authority: 'PRISM_SHOP_OPTIMIZER',
    
    optimizeSchedule: function(params) {
        const { jobs, machines, constraints = {}, objective = 'makespan' } = params;
        const config = { popSize: 50, generations: 100, crossoverRate: 0.8, mutationRate: 0.1 };
        const bounds = this._calcBounds(jobs, machines);
        
        let population = this._initPop(jobs, config.popSize);
        let globalBest = null, globalBestFitness = -Infinity;
        
        for (let gen = 0; gen < config.generations; gen++) {
            const evaluated = population.map(c => ({ chromosome: c, fitness: this._evalSchedule(c, machines, constraints, objective) }));
            for (const ind of evaluated) {
                if (ind.fitness > globalBestFitness) { globalBestFitness = ind.fitness; globalBest = [...ind.chromosome]; }
            }
            const selected = this._tournament(evaluated, config.popSize);
            const offspring = this._crossover(selected, config.crossoverRate);
            this._mutate(offspring, config.mutationRate);
            population = offspring;
        }
        
        const schedule = this._buildSchedule(globalBest, machines);
        return { schedule, metrics: { makespan: this._calcMakespan(schedule), utilization: this._calcUtilization(schedule, machines) },
            fitness: globalBestFitness, generations: config.generations };
    },
    
    optimizeOperationSequence: function(params) {
        const { operations, setupMatrix } = params;
        const n = operations.length;
        if (n < 2) return { sequence: operations, totalSetup: 0 };
        
        const config = { ants: 20, iterations: 50, alpha: 1.0, beta: 2.0, rho: 0.1, Q: 100 };
        const pheromone = Array(n).fill(null).map(() => Array(n).fill(1.0));
        let best = null, bestLen = Infinity;
        
        for (let iter = 0; iter < config.iterations; iter++) {
            const solutions = [];
            for (let ant = 0; ant < config.ants; ant++) {
                const sol = this._antBuild(operations, pheromone, setupMatrix, config);
                const len = this._seqLen(sol, setupMatrix, operations);
                solutions.push({ sequence: sol, length: len });
                if (len < bestLen) { bestLen = len; best = [...sol]; }
            }
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pheromone[i][j] *= (1 - config.rho);
            for (const sol of solutions) {
                const deposit = config.Q / sol.length;
                for (let i = 0; i < sol.sequence.length - 1; i++) {
                    const from = operations.indexOf(sol.sequence[i]), to = operations.indexOf(sol.sequence[i + 1]);
                    pheromone[from][to] += deposit;
                }
            }
        }
        
        const origLen = this._seqLen(operations, setupMatrix, operations);
        return { sequence: best, totalSetup: bestLen, improvement: origLen > 0 ? ((origLen - bestLen) / origLen * 100).toFixed(1) + '%' : 'N/A' };
    },
    
    analyzeBottlenecks: function(params) {
        const { machines, currentSchedule } = params;
        const analysis = { bottlenecks: [], machineLoading: {}, recommendations: [] };
        
        for (const m of machines) {
            const jobs = currentSchedule?.filter(s => s.machine === m.id) || [];
            const totalTime = jobs.reduce((sum, j) => sum + (j.duration || 0), 0);
            const available = m.availableHours || 480;
            analysis.machineLoading[m.id] = { name: m.name || m.id, totalTime, availableTime: available,
                utilization: (totalTime / available * 100).toFixed(1) + '%', isBottleneck: totalTime > available * 0.9 };
            
            if (totalTime > available * 0.9) {
                analysis.bottlenecks.push({ type: 'machine_overload', machine: m.id, utilization: totalTime / available, severity: totalTime > available ? 'critical' : 'high' });
                analysis.recommendations.push({ type: 'offload', message: 'Consider offloading work from ' + m.id, priority: totalTime > available ? 'critical' : 'high' });
            }
        }
        return analysis;
    },
    
    johnsonsAlgorithm: function(jobs) {
        const list1 = [], list2 = [];
        for (const j of jobs) { if (j.machine1Time < j.machine2Time) list1.push(j); else list2.push(j); }
        list1.sort((a, b) => a.machine1Time - b.machine1Time);
        list2.sort((a, b) => b.machine2Time - a.machine2Time);
        const sequence = [...list1, ...list2];
        let m1End = 0, m2End = 0;
        for (const j of sequence) { m1End += j.machine1Time; m2End = Math.max(m2End, m1End) + j.machine2Time; }
        return { sequence: sequence.map(j => j.id), makespan: m2End, algorithm: 'Johnsons' };
    },
    
    _initPop: function(jobs, size) {
        const pop = [];
        for (let i = 0; i < size; i++) {
            const c = [...jobs];
            for (let j = c.length - 1; j > 0; j--) { const k = Math.floor(Math.random() * (j + 1)); [c[j], c[k]] = [c[k], c[j]]; }
            pop.push(c);
        }
        return pop;
    },
    
    _evalSchedule: function(chromosome, machines, constraints, objective) {
        const schedule = this._buildSchedule(chromosome, machines);
        const makespan = this._calcMakespan(schedule);
        return 1 / (makespan + 1);
    },
    
    _buildSchedule: function(chromosome, machines) {
        const schedule = [], machineEnd = {};
        for (const m of machines) machineEnd[m.id] = 0;
        
        for (const job of chromosome) {
            let bestMach = machines[0]?.id, earliest = Infinity;
            for (const m of machines) {
                if (!job.requiredMachine || job.requiredMachine === m.id) {
                    if (machineEnd[m.id] < earliest) { earliest = machineEnd[m.id]; bestMach = m.id; }
                }
            }
            const start = machineEnd[bestMach], duration = job.duration || job.processingTime || 60, end = start + duration;
            schedule.push({ jobId: job.id || job.jobId, machine: bestMach, start, end, duration });
            machineEnd[bestMach] = end;
        }
        return schedule;
    },
    
    _calcMakespan: function(schedule) { return schedule.length > 0 ? Math.max(...schedule.map(s => s.end)) : 0; },
    
    _calcUtilization: function(schedule, machines) {
        if (schedule.length === 0 || machines.length === 0) return 0;
        const makespan = this._calcMakespan(schedule);
        return schedule.reduce((sum, s) => sum + s.duration, 0) / (makespan * machines.length);
    },
    
    _tournament: function(evaluated, count) {
        const selected = [];
        for (let i = 0; i < count; i++) {
            const tournament = [];
            for (let j = 0; j < 3; j++) tournament.push(evaluated[Math.floor(Math.random() * evaluated.length)]);
            tournament.sort((a, b) => b.fitness - a.fitness);
            selected.push([...tournament[0].chromosome]);
        }
        return selected;
    },
    
    _crossover: function(pop, rate) {
        const offspring = [];
        for (let i = 0; i < pop.length; i += 2) {
            if (i + 1 < pop.length && Math.random() < rate) {
                const [c1, c2] = this._orderCrossover(pop[i], pop[i + 1]);
                offspring.push(c1, c2);
            } else {
                offspring.push([...pop[i]]);
                if (i + 1 < pop.length) offspring.push([...pop[i + 1]]);
            }
        }
        return offspring;
    },
    
    _orderCrossover: function(p1, p2) {
        const n = p1.length, start = Math.floor(Math.random() * n), end = start + Math.floor(Math.random() * (n - start));
        const c1 = new Array(n).fill(null), c2 = new Array(n).fill(null);
        for (let i = start; i <= end; i++) { c1[i] = p1[i]; c2[i] = p2[i]; }
        
        let idx1 = (end + 1) % n, idx2 = (end + 1) % n;
        for (let i = 0; i < n; i++) {
            const pos = (end + 1 + i) % n;
            if (!c1.includes(p2[pos])) { while (c1[idx1] !== null) idx1 = (idx1 + 1) % n; c1[idx1] = p2[pos]; }
            if (!c2.includes(p1[pos])) { while (c2[idx2] !== null) idx2 = (idx2 + 1) % n; c2[idx2] = p1[pos]; }
        }
        return [c1, c2];
    },
    
    _mutate: function(pop, rate) {
        for (const c of pop) {
            if (Math.random() < rate) { const i = Math.floor(Math.random() * c.length), j = Math.floor(Math.random() * c.length); [c[i], c[j]] = [c[j], c[i]]; }
        }
    },
    
    _antBuild: function(operations, pheromone, setupMatrix, config) {
        const n = operations.length, visited = new Set(), solution = [];
        let current = Math.floor(Math.random() * n);
        solution.push(operations[current]); visited.add(current);
        
        while (solution.length < n) {
            const probs = [];
            let total = 0;
            for (let j = 0; j < n; j++) {
                if (!visited.has(j)) {
                    const tau = Math.pow(pheromone[current][j], config.alpha);
                    const eta = setupMatrix ? Math.pow(1 / (setupMatrix[current][j] + 1), config.beta) : 1;
                    const prob = tau * eta; probs.push({ index: j, prob }); total += prob;
                }
            }
            let rand = Math.random() * total;
            for (const p of probs) { rand -= p.prob; if (rand <= 0) { current = p.index; break; } }
            solution.push(operations[current]); visited.add(current);
        }
        return solution;
    },
    
    _seqLen: function(sequence, setupMatrix, operations) {
        if (!setupMatrix || sequence.length < 2) return 0;
        let total = 0;
        for (let i = 0; i < sequence.length - 1; i++) {
            const from = operations.indexOf(sequence[i]), to = operations.indexOf(sequence[i + 1]);
            if (setupMatrix[from]?.[to] !== undefined) total += setupMatrix[from][to];
        }
        return total;
    },
    
    runSelfTests: function() {
        console.log('[SHOP_OPTIMIZER] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const r = this.optimizeSchedule({ jobs: [{ id: 'J1', duration: 30 }, { id: 'J2', duration: 45 }], machines: [{ id: 'M1' }, { id: 'M2' }] });
            if (r.schedule && r.metrics.makespan > 0) { results.passed++; results.tests.push({ name: 'Optimize Schedule', status: 'PASS' }); }
            else throw new Error('Invalid');
        } catch (e) { results.failed++; results.tests.push({ name: 'Optimize Schedule', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.johnsonsAlgorithm([{ id: 'A', machine1Time: 5, machine2Time: 2 }, { id: 'B', machine1Time: 1, machine2Time: 6 }]);
            if (r.sequence.length === 2 && r.makespan > 0) { results.passed++; results.tests.push({ name: 'Johnsons', status: 'PASS' }); }
            else throw new Error('Invalid');
        } catch (e) { results.failed++; results.tests.push({ name: 'Johnsons', status: 'FAIL', error: e.message }); }
        
        console.log('[SHOP_OPTIMIZER] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
};
