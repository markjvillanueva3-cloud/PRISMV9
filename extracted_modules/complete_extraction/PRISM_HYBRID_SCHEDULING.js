const PRISM_HYBRID_SCHEDULING = {
    name: 'Hybrid Genetic-Swarm Scheduling',
    sources: ['CMU 24-785', 'MIT 15.083J'],
    patentClaim: 'Hybrid GA-PSO algorithm for job shop scheduling with dynamic priorities',
    
    /**
     * Schedule jobs using hybrid algorithm
     */
    schedule: function(jobs, machines, config = {}) {
        const {
            populationSize = 50,
            generations = 100,
            gaRatio = 0.6  // 60% GA, 40% PSO
        } = config;
        
        // Initialize population
        let population = this._initPopulation(jobs, machines, populationSize);
        
        // Evaluate initial population
        population = population.map(ind => ({
            chromosome: ind,
            fitness: this._evaluate(ind, jobs, machines)
        }));
        
        const history = [];
        
        for (let gen = 0; gen < generations; gen++) {
            // Split population for GA and PSO
            const gaSize = Math.floor(populationSize * gaRatio);
            const gaPop = population.slice(0, gaSize);
            const psoPop = population.slice(gaSize);
            
            // GA operations
            const gaOffspring = this._gaGeneration(gaPop, jobs, machines);
            
            // PSO operations
            const psoUpdated = this._psoGeneration(psoPop, jobs, machines);
            
            // Merge and select
            const combined = [...gaOffspring, ...psoUpdated];
            combined.sort((a, b) => a.fitness - b.fitness);
            population = combined.slice(0, populationSize);
            
            history.push(population[0].fitness);
        }
        
        // Convert best chromosome to schedule
        const bestSchedule = this._chromosomeToSchedule(population[0].chromosome, jobs, machines);
        
        return {
            schedule: bestSchedule,
            makespan: population[0].fitness,
            generations: generations,
            convergenceHistory: history,
            algorithm: 'Hybrid-GA-PSO'
        };
    },
    
    _initPopulation: function(jobs, machines, size) {
        return Array(size).fill(null).map(() => {
            // Random permutation of operations
            const ops = [];
            for (const job of jobs) {
                for (let i = 0; i < job.operations.length; i++) {
                    ops.push({ jobId: job.id, opIndex: i });
                }
            }
            return this._shuffle(ops);
        });
    },
    
    _evaluate: function(chromosome, jobs, machines) {
        // Calculate makespan
        const machineEndTimes = Array(machines.length).fill(0);
        const jobEndTimes = {};
        
        for (const op of chromosome) {
            const job = jobs.find(j => j.id === op.jobId);
            const operation = job.operations[op.opIndex];
            const machineIdx = operation.machine;
            
            const jobPrev = jobEndTimes[op.jobId] || 0;
            const machinePrev = machineEndTimes[machineIdx];
            
            const startTime = Math.max(jobPrev, machinePrev);
            const endTime = startTime + operation.duration;
            
            machineEndTimes[machineIdx] = endTime;
            jobEndTimes[op.jobId] = endTime;
        }
        
        return Math.max(...machineEndTimes);
    },
    
    _gaGeneration: function(population, jobs, machines) {
        const offspring = [];
        
        // Tournament selection and crossover
        for (let i = 0; i < population.length; i += 2) {
            const parent1 = this._tournamentSelect(population);
            const parent2 = this._tournamentSelect(population);
            
            const [child1, child2] = this._orderCrossover(parent1.chromosome, parent2.chromosome);
            
            // Mutation
            const mutated1 = Math.random() < 0.1 ? this._mutate(child1) : child1;
            const mutated2 = Math.random() < 0.1 ? this._mutate(child2) : child2;
            
            offspring.push({
                chromosome: mutated1,
                fitness: this._evaluate(mutated1, jobs, machines)
            });
            offspring.push({
                chromosome: mutated2,
                fitness: this._evaluate(mutated2, jobs, machines)
            });
        }
        
        return offspring;
    },
    
    _psoGeneration: function(population, jobs, machines) {
        // PSO-style update (adapted for discrete scheduling)
        const globalBest = population.reduce((a, b) => a.fitness < b.fitness ? a : b);
        
        return population.map(ind => {
            // Move toward global best
            const newChromosome = this._moveToward(ind.chromosome, globalBest.chromosome, 0.3);
            return {
                chromosome: newChromosome,
                fitness: this._evaluate(newChromosome, jobs, machines)
            };
        });
    },
    
    _tournamentSelect: function(pop) {
        const i1 = Math.floor(Math.random() * pop.length);
        const i2 = Math.floor(Math.random() * pop.length);
        return pop[i1].fitness < pop[i2].fitness ? pop[i1] : pop[i2];
    },
    
    _orderCrossover: function(p1, p2) {
        const n = p1.length;
        const start = Math.floor(Math.random() * n);
        const end = start + Math.floor(Math.random() * (n - start));
        
        const child1 = Array(n).fill(null);
        const child2 = Array(n).fill(null);
        
        // Copy segment
        for (let i = start; i <= end; i++) {
            child1[i] = p1[i];
            child2[i] = p2[i];
        }
        
        // Fill remaining
        let idx1 = (end + 1) % n;
        let idx2 = (end + 1) % n;
        
        for (let i = 0; i < n; i++) {
            const pos = (end + 1 + i) % n;
            
            if (!child1.some(c => c && c.jobId === p2[pos].jobId && c.opIndex === p2[pos].opIndex)) {
                while (child1[idx1] !== null) idx1 = (idx1 + 1) % n;
                child1[idx1] = p2[pos];
            }
            
            if (!child2.some(c => c && c.jobId === p1[pos].jobId && c.opIndex === p1[pos].opIndex)) {
                while (child2[idx2] !== null) idx2 = (idx2 + 1) % n;
                child2[idx2] = p1[pos];
            }
        }
        
        return [child1, child2];
    },
    
    _mutate: function(chromosome) {
        const c = [...chromosome];
        const i = Math.floor(Math.random() * c.length);
        const j = Math.floor(Math.random() * c.length);
        [c[i], c[j]] = [c[j], c[i]];
        return c;
    },
    
    _moveToward: function(current, target, rate) {
        const result = [...current];
        const n = Math.floor(current.length * rate);
        
        for (let k = 0; k < n; k++) {
            const i = Math.floor(Math.random() * result.length);
            const targetOp = target[i];
            const currentIdx = result.findIndex(o => o.jobId === targetOp.jobId && o.opIndex === targetOp.opIndex);
            if (currentIdx !== -1 && currentIdx !== i) {
                [result[i], result[currentIdx]] = [result[currentIdx], result[i]];
            }
        }
        
        return result;
    },
    
    _shuffle: function(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },
    
    _chromosomeToSchedule: function(chromosome, jobs, machines) {
        const schedule = machines.map(() => []);
        const machineEndTimes = Array(machines.length).fill(0);
        const jobEndTimes = {};
        
        for (const op of chromosome) {
            const job = jobs.find(j => j.id === op.jobId);
            const operation = job.operations[op.opIndex];
            const machineIdx = operation.machine;
            
            const jobPrev = jobEndTimes[op.jobId] || 0;
            const machinePrev = machineEndTimes[machineIdx];
            
            const startTime = Math.max(jobPrev, machinePrev);
            const endTime = startTime + operation.duration;
            
            schedule[machineIdx].push({
                jobId: op.jobId,
                operationIndex: op.opIndex,
                startTime: startTime,
                endTime: endTime
            });
            
            machineEndTimes[machineIdx] = endTime;
            jobEndTimes[op.jobId] = endTime;
        }
        
        return schedule;
    }
}