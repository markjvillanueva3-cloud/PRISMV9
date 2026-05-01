const PRISM_PHASE1_OPTIMIZERS = {
    name: 'Phase 1 Optimization Algorithms',
    version: '1.0.0',
    source: 'MIT 15.099, MIT 18.433, CMU 24-785',
    
    /**
     * PSO Speed/Feed Multi-Objective Optimization
     * Source: MIT 15.099 - Introduction to Optimization
     * Protocol B: Unit-Safe Development (metric internal)
     */
    psoSpeedFeed: function(params) {
        const {
            material,
            tool,
            machine,
            objectives = ['productivity', 'tool_life', 'surface_finish'],
            constraints = {}
        } = params;
        
        // Protocol E: Constants-First Development
        const PSO_CONFIG = {
            particles: typeof PRISM_CONSTANTS !== 'undefined' ? 
                PRISM_CONSTANTS.AI.PSO_MAX_PARTICLES : 30,
            iterations: typeof PRISM_CONSTANTS !== 'undefined' ? 
                PRISM_CONSTANTS.AI.PSO_MAX_ITERATIONS : 100,
            w: 0.729,      // Inertia weight
            c1: 1.49445,   // Cognitive parameter
            c2: 1.49445    // Social parameter
        };
        
        // Define search bounds (metric internal - Protocol B)
        const bounds = {
            speed: { min: 50, max: 500 },      // m/min
            feed: { min: 0.05, max: 0.5 },     // mm/tooth
            doc: { min: 0.5, max: 10 }         // mm
        };
        
        // Apply material constraints
        if (material && material.speedRange) {
            bounds.speed.min = Math.max(bounds.speed.min, material.speedRange.min || 50);
            bounds.speed.max = Math.min(bounds.speed.max, material.speedRange.max || 500);
        }
        
        // Initialize particles
        const particles = [];
        for (let i = 0; i < PSO_CONFIG.particles; i++) {
            particles.push({
                position: {
                    speed: bounds.speed.min + Math.random() * (bounds.speed.max - bounds.speed.min),
                    feed: bounds.feed.min + Math.random() * (bounds.feed.max - bounds.feed.min),
                    doc: bounds.doc.min + Math.random() * (bounds.doc.max - bounds.doc.min)
                },
                velocity: { speed: 0, feed: 0, doc: 0 },
                bestPosition: null,
                bestFitness: -Infinity
            });
            particles[i].bestPosition = { ...particles[i].position };
        }
        
        let globalBest = { position: null, fitness: -Infinity };
        
        // PSO main loop
        for (let iter = 0; iter < PSO_CONFIG.iterations; iter++) {
            for (const particle of particles) {
                // Evaluate fitness (multi-objective)
                const fitness = this._evaluateSpeedFeedFitness(
                    particle.position, material, tool, machine, objectives
                );
                
                // Update personal best
                if (fitness > particle.bestFitness) {
                    particle.bestFitness = fitness;
                    particle.bestPosition = { ...particle.position };
                }
                
                // Update global best
                if (fitness > globalBest.fitness) {
                    globalBest.fitness = fitness;
                    globalBest.position = { ...particle.position };
                }
            }
            
            // Update velocities and positions
            for (const particle of particles) {
                for (const dim of ['speed', 'feed', 'doc']) {
                    const r1 = Math.random();
                    const r2 = Math.random();
                    
                    particle.velocity[dim] = 
                        PSO_CONFIG.w * particle.velocity[dim] +
                        PSO_CONFIG.c1 * r1 * (particle.bestPosition[dim] - particle.position[dim]) +
                        PSO_CONFIG.c2 * r2 * (globalBest.position[dim] - particle.position[dim]);
                    
                    particle.position[dim] += particle.velocity[dim];
                    
                    // Clamp to bounds
                    particle.position[dim] = Math.max(bounds[dim].min, 
                        Math.min(bounds[dim].max, particle.position[dim]));
                }
            }
        }
        
        // Return optimized parameters with confidence
        return {
            optimizedParams: globalBest.position,
            fitness: globalBest.fitness,
            objectives: objectives,
            source: 'MIT 15.099 - PSO Multi-Objective',
            confidence: Math.min(0.95, 0.7 + globalBest.fitness * 0.25),
            iterations: PSO_CONFIG.iterations,
            particles: PSO_CONFIG.particles
        };
    },
    
    /**
     * Evaluate fitness for speed/feed optimization
     * Protocol O: AI-First Development
     */
    _evaluateSpeedFeedFitness: function(position, material, tool, machine, objectives) {
        let fitness = 0;
        const weights = {
            productivity: 0.4,
            tool_life: 0.35,
            surface_finish: 0.25
        };
        
        // Calculate MRR (productivity)
        const mrr = position.speed * position.feed * position.doc;
        const mrrNormalized = mrr / 100; // Normalize
        
        // Estimate tool life using Taylor equation
        const toolLife = this._estimateToolLife(position.speed, material);
        const toolLifeNormalized = Math.min(1, toolLife / 120); // Normalize to 120 min baseline
        
        // Estimate surface finish (lower is better)
        const surfaceFinish = this._estimateSurfaceFinish(position.feed, tool);
        const surfaceFinishNormalized = 1 - Math.min(1, surfaceFinish / 3.2); // Normalize to Ra 3.2
        
        // Weight objectives
        if (objectives.includes('productivity')) {
            fitness += weights.productivity * mrrNormalized;
        }
        if (objectives.includes('tool_life')) {
            fitness += weights.tool_life * toolLifeNormalized;
        }
        if (objectives.includes('surface_finish')) {
            fitness += weights.surface_finish * surfaceFinishNormalized;
        }
        
        return fitness;
    },
    
    _estimateToolLife: function(speed, material) {
        // Taylor's equation: VT^n = C
        const n = material?.taylorN || 0.25;
        const C = material?.taylorC || 300;
        return Math.pow(C / speed, 1 / n);
    },
    
    _estimateSurfaceFinish: function(feed, tool) {
        // Ra ≈ f² / (32 * r) for theoretical surface finish
        const noseRadius = tool?.noseRadius || 0.8; // mm
        return (feed * feed) / (32 * noseRadius) * 1000; // Convert to μm
    },
    
    /**
     * PSO Multi-Objective Generic Optimizer
     */
    psoMultiObjective: function(objectiveFunc, bounds, options = {}) {
        const config = {
            particles: options.particles || 30,
            iterations: options.iterations || 100,
            w: options.w || 0.729,
            c1: options.c1 || 1.49445,
            c2: options.c2 || 1.49445
        };
        
        const dimensions = Object.keys(bounds);
        const particles = [];
        
        // Initialize
        for (let i = 0; i < config.particles; i++) {
            const position = {};
            const velocity = {};
            for (const dim of dimensions) {
                position[dim] = bounds[dim].min + Math.random() * (bounds[dim].max - bounds[dim].min);
                velocity[dim] = 0;
            }
            particles.push({
                position,
                velocity,
                bestPosition: { ...position },
                bestFitness: -Infinity
            });
        }
        
        let globalBest = { position: null, fitness: -Infinity };
        
        // Main loop
        for (let iter = 0; iter < config.iterations; iter++) {
            for (const particle of particles) {
                const fitness = objectiveFunc(particle.position);
                
                if (fitness > particle.bestFitness) {
                    particle.bestFitness = fitness;
                    particle.bestPosition = { ...particle.position };
                }
                
                if (fitness > globalBest.fitness) {
                    globalBest.fitness = fitness;
                    globalBest.position = { ...particle.position };
                }
            }
            
            for (const particle of particles) {
                for (const dim of dimensions) {
                    const r1 = Math.random();
                    const r2 = Math.random();
                    
                    particle.velocity[dim] = 
                        config.w * particle.velocity[dim] +
                        config.c1 * r1 * (particle.bestPosition[dim] - particle.position[dim]) +
                        config.c2 * r2 * (globalBest.position[dim] - particle.position[dim]);
                    
                    particle.position[dim] = Math.max(bounds[dim].min,
                        Math.min(bounds[dim].max, particle.position[dim] + particle.velocity[dim]));
                }
            }
        }
        
        return {
            optimal: globalBest.position,
            fitness: globalBest.fitness,
            iterations: config.iterations,
            source: 'MIT 15.099 - PSO'
        };
    },
    
    /**
     * ACO Hole Sequence Optimization
     * Source: MIT 18.433 - Combinatorial Optimization
     */
    acoHoleSequence: function(holes, options = {}) {
        const config = {
            ants: options.ants || 20,
            iterations: options.iterations || 50,
            alpha: options.alpha || 1.0,      // Pheromone importance
            beta: options.beta || 2.0,        // Distance importance
            rho: options.rho || 0.1,          // Evaporation rate
            Q: options.Q || 100               // Pheromone deposit factor
        };
        
        const n = holes.length;
        if (n < 2) return { sequence: holes.map((_, i) => i), distance: 0 };
        
        // Calculate distance matrix
        const dist = [];
        for (let i = 0; i < n; i++) {
            dist[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    dist[i][j] = Infinity;
                } else {
                    const dx = holes[i].x - holes[j].x;
                    const dy = holes[i].y - holes[j].y;
                    const dz = (holes[i].z || 0) - (holes[j].z || 0);
                    dist[i][j] = Math.sqrt(dx*dx + dy*dy + dz*dz);
                }
            }
        }
        
        // Initialize pheromone matrix
        const tau = [];
        const tau0 = 1 / (n * this._nearestNeighborDistance(holes, dist));
        for (let i = 0; i < n; i++) {
            tau[i] = [];
            for (let j = 0; j < n; j++) {
                tau[i][j] = tau0;
            }
        }
        
        let bestSequence = null;
        let bestDistance = Infinity;
        
        // Main ACO loop
        for (let iter = 0; iter < config.iterations; iter++) {
            const antSolutions = [];
            
            // Each ant constructs a solution
            for (let ant = 0; ant < config.ants; ant++) {
                const visited = new Set();
                const sequence = [];
                
                // Start from random hole
                let current = Math.floor(Math.random() * n);
                sequence.push(current);
                visited.add(current);
                
                // Visit remaining holes
                while (sequence.length < n) {
                    const probabilities = [];
                    let totalProb = 0;
                    
                    for (let j = 0; j < n; j++) {
                        if (!visited.has(j)) {
                            const tauVal = Math.pow(tau[current][j], config.alpha);
                            const etaVal = Math.pow(1 / dist[current][j], config.beta);
                            probabilities[j] = tauVal * etaVal;
                            totalProb += probabilities[j];
                        } else {
                            probabilities[j] = 0;
                        }
                    }
                    
                    // Roulette wheel selection
                    let r = Math.random() * totalProb;
                    let next = -1;
                    for (let j = 0; j < n; j++) {
                        if (probabilities[j] > 0) {
                            r -= probabilities[j];
                            if (r <= 0) {
                                next = j;
                                break;
                            }
                        }
                    }
                    
                    if (next === -1) {
                        // Fallback: pick first unvisited
                        for (let j = 0; j < n; j++) {
                            if (!visited.has(j)) {
                                next = j;
                                break;
                            }
                        }
                    }
                    
                    sequence.push(next);
                    visited.add(next);
                    current = next;
                }
                
                // Calculate total distance
                let totalDist = 0;
                for (let i = 0; i < sequence.length - 1; i++) {
                    totalDist += dist[sequence[i]][sequence[i + 1]];
                }
                
                antSolutions.push({ sequence, distance: totalDist });
                
                if (totalDist < bestDistance) {
                    bestDistance = totalDist;
                    bestSequence = [...sequence];
                }
            }
            
            // Evaporate pheromones
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    tau[i][j] *= (1 - config.rho);
                }
            }
            
            // Deposit pheromones
            for (const sol of antSolutions) {
                const deposit = config.Q / sol.distance;
                for (let i = 0; i < sol.sequence.length - 1; i++) {
                    const from = sol.sequence[i];
                    const to = sol.sequence[i + 1];
                    tau[from][to] += deposit;
                    tau[to][from] += deposit;
                }
            }
        }
        
        return {
            sequence: bestSequence,
            distance: bestDistance,
            improvement: ((this._nearestNeighborDistance(holes, dist) - bestDistance) / 
                this._nearestNeighborDistance(holes, dist) * 100).toFixed(1) + '%',
            source: 'MIT 18.433 - ACO'
        };
    },
    
    _nearestNeighborDistance: function(holes, dist) {
        const n = holes.length;
        if (n < 2) return 0;
        
        const visited = new Set([0]);
        let current = 0;
        let tot