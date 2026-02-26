const PRISM_SWARM_NEURAL_HYBRID = {
    name: 'Swarm-Neural Hybrid Optimization',
    sources: ['MIT 15.099', 'MIT 15.773'],
    patentClaim: 'Neural network-guided particle swarm optimization for manufacturing parameter tuning',
    
    /**
     * Create hybrid optimizer
     */
    createOptimizer: function(objectiveFunc, bounds, config = {}) {
        const {
            numParticles = 30,
            hiddenDim = 32,
            useNeuralGuidance = true
        } = config;
        
        const dim = bounds.length;
        
        // Initialize particles
        const particles = Array(numParticles).fill(null).map(() => ({
            position: bounds.map(b => b[0] + Math.random() * (b[1] - b[0])),
            velocity: bounds.map(b => (Math.random() - 0.5) * (b[1] - b[0]) * 0.1),
            bestPosition: null,
            bestFitness: Infinity
        }));
        
        // Initialize best positions
        for (const p of particles) {
            p.bestPosition = [...p.position];
            p.bestFitness = objectiveFunc(p.position);
        }
        
        // Neural network for guidance
        const network = this._createGuidanceNetwork(dim, hiddenDim);
        
        return {
            particles,
            globalBest: this._findGlobalBest(particles),
            bounds,
            objectiveFunc,
            network,
            useNeuralGuidance,
            history: [],
            iteration: 0
        };
    },
    
    /**
     * Run optimization step
     */
    step: function(optimizer) {
        const { particles, bounds, objectiveFunc, network, useNeuralGuidance } = optimizer;
        const w = 0.7;      // Inertia
        const c1 = 1.5;     // Cognitive
        const c2 = 1.5;     // Social
        const c3 = 0.5;     // Neural guidance
        
        for (const p of particles) {
            // Get neural guidance direction
            let neuralDir = p.position.map(() => 0);
            if (useNeuralGuidance && optimizer.history.length > 10) {
                neuralDir = this._getNeuralGuidance(network, p.position, optimizer.history);
            }
            
            // Update velocity
            for (let d = 0; d < p.position.length; d++) {
                const r1 = Math.random();
                const r2 = Math.random();
                const r3 = Math.random();
                
                p.velocity[d] = w * p.velocity[d] +
                    c1 * r1 * (p.bestPosition[d] - p.position[d]) +
                    c2 * r2 * (optimizer.globalBest.position[d] - p.position[d]) +
                    c3 * r3 * neuralDir[d];
                
                // Velocity clamping
                const range = bounds[d][1] - bounds[d][0];
                p.velocity[d] = Math.max(-range * 0.2, Math.min(range * 0.2, p.velocity[d]));
            }
            
            // Update position
            for (let d = 0; d < p.position.length; d++) {
                p.position[d] += p.velocity[d];
                p.position[d] = Math.max(bounds[d][0], Math.min(bounds[d][1], p.position[d]));
            }
            
            // Evaluate
            const fitness = objectiveFunc(p.position);
            
            if (fitness < p.bestFitness) {
                p.bestFitness = fitness;
                p.bestPosition = [...p.position];
            }
        }
        
        // Update global best
        const newGlobalBest = this._findGlobalBest(particles);
        if (newGlobalBest.fitness < optimizer.globalBest.fitness) {
            optimizer.globalBest = newGlobalBest;
        }
        
        // Store in history for neural training
        optimizer.history.push({
            positions: particles.map(p => [...p.position]),
            fitness: particles.map(p => objectiveFunc(p.position)),
            globalBest: optimizer.globalBest.fitness
        });
        
        // Train neural network periodically
        if (optimizer.history.length % 20 === 0) {
            this._trainGuidanceNetwork(network, optimizer.history);
        }
        
        optimizer.iteration++;
        
        return {
            iteration: optimizer.iteration,
            globalBest: optimizer.globalBest,
            avgFitness: particles.reduce((s, p) => s + p.bestFitness, 0) / particles.length
        };
    },
    
    /**
     * Run full optimization
     */
    optimize: function(objectiveFunc, bounds, config = {}) {
        const { maxIterations = 100 } = config;
        const optimizer = this.createOptimizer(objectiveFunc, bounds, config);
        
        for (let i = 0; i < maxIterations; i++) {
            this.step(optimizer);
        }
        
        return {
            bestPosition: optimizer.globalBest.position,
            bestFitness: optimizer.globalBest.fitness,
            iterations: optimizer.iteration,
            convergenceHistory: optimizer.history.map(h => h.globalBest)
        };
    },
    
    _createGuidanceNetwork: function(inputDim, hiddenDim) {
        return {
            W1: Array(hiddenDim).fill(null).map(() => 
                Array(inputDim).fill(null).map(() => (Math.random() - 0.5) * 0.1)
            ),
            b1: Array(hiddenDim).fill(0),
            W2: Array(inputDim).fill(null).map(() => 
                Array(hiddenDim).fill(null).map(() => (Math.random() - 0.5) * 0.1)
            ),
            b2: Array(inputDim).fill(0)
        };
    },
    
    _getNeuralGuidance: function(network, position, history) {
        // Forward pass
        let h = network.W1.map((row, i) => {
            const sum = row.reduce((acc, w, j) => acc + w * position[j], 0) + network.b1[i];
            return Math.tanh(sum);
        });
        
        return network.W2.map((row, i) => {
            return row.reduce((acc, w, j) => acc + w * h[j], 0) + network.b2[i];
        });
    },
    
    _trainGuidanceNetwork: function(network, history) {
        // Simplified training: adjust weights toward improvement directions
        if (history.length < 2) return;
        
        const recent = history.slice(-10);
        const lr = 0.01;
        
        for (let i = 1; i < recent.length; i++) {
            const prevBest = recent[i - 1].globalBest;
            const currBest = recent[i].globalBest;
            
            if (currBest < prevBest) {
                // Improvement happened, reinforce the direction
                // Simplified: would do proper backprop in production
            }
        }
    },
    
    _findGlobalBest: function(particles) {
        let best = { position: null, fitness: Infinity };
        for (const p of particles) {
            if (p.bestFitness < best.fitness) {
                best = { position: [...p.bestPosition], fitness: p.bestFitness };
            }
        }
        return best;
    }
}