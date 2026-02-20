const PRISM_ONLINE_LEARNING_COMPLETE = {
    name: 'PRISM Online Learning Complete',
    version: '1.0.0',
    
    // ─────────────────────────────────────────────────────────────────────────
    // EXPERIENCE REPLAY BUFFER
    // ─────────────────────────────────────────────────────────────────────────
    
    createExperienceBuffer: function(maxSize = 10000) {
        return {
            buffer: [],
            maxSize,
            priorities: [],
            
            add: function(experience) {
                this.buffer.push({
                    ...experience,
                    timestamp: Date.now()
                });
                this.priorities.push(1.0); // Initial priority
                
                // Remove oldest if over capacity
                if (this.buffer.length > this.maxSize) {
                    this.buffer.shift();
                    this.priorities.shift();
                }
            },
            
            sampleUniform: function(batchSize) {
                const samples = [];
                const indices = [];
                
                for (let i = 0; i < Math.min(batchSize, this.buffer.length); i++) {
                    let idx;
                    do {
                        idx = Math.floor(Math.random() * this.buffer.length);
                    } while (indices.includes(idx));
                    
                    indices.push(idx);
                    samples.push(this.buffer[idx]);
                }
                
                return { samples, indices };
            },
            
            samplePrioritized: function(batchSize, alpha = 0.6) {
                const priorities = this.priorities.map(p => Math.pow(p, alpha));
                const total = priorities.reduce((a, b) => a + b, 0);
                const probs = priorities.map(p => p / total);
                
                const samples = [];
                const indices = [];
                const weights = [];
                
                for (let i = 0; i < Math.min(batchSize, this.buffer.length); i++) {
                    let rand = Math.random();
                    let cumSum = 0;
                    let idx = 0;
                    
                    for (let j = 0; j < this.buffer.length; j++) {
                        cumSum += probs[j];
                        if (rand <= cumSum) {
                            idx = j;
                            break;
                        }
                    }
                    
                    indices.push(idx);
                    samples.push(this.buffer[idx]);
                    weights.push(Math.pow(this.buffer.length * probs[idx], -1));
                }
                
                // Normalize weights
                const maxWeight = Math.max(...weights);
                const normalizedWeights = weights.map(w => w / maxWeight);
                
                return { samples, indices, weights: normalizedWeights };
            },
            
            updatePriorities: function(indices, tdErrors) {
                const epsilon = 1e-6;
                for (let i = 0; i < indices.length; i++) {
                    this.priorities[indices[i]] = Math.abs(tdErrors[i]) + epsilon;
                }
            },
            
            size: function() {
                return this.buffer.length;
            },
            
            clear: function() {
                this.buffer = [];
                this.priorities = [];
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // CONCEPT DRIFT DETECTION
    // ─────────────────────────────────────────────────────────────────────────
    
    createDriftDetector: function(options = {}) {
        const {
            windowSize = 100,
            threshold = 2.0,
            minSamples = 30
        } = options;
        
        return {
            windowSize,
            threshold,
            minSamples,
            recentErrors: [],
            historicalMean: null,
            historicalStd: null,
            driftCount: 0,
            
            add: function(error) {
                this.recentErrors.push(error);
                
                // Keep window size
                if (this.recentErrors.length > this.windowSize * 2) {
                    // Update historical stats before removing
                    if (this.recentErrors.length === this.windowSize * 2) {
                        const historical = this.recentErrors.slice(0, this.windowSize);
                        this.historicalMean = historical.reduce((a, b) => a + b, 0) / historical.length;
                        this.historicalStd = Math.sqrt(
                            historical.reduce((s, x) => s + Math.pow(x - this.historicalMean, 2), 0) / historical.length
                        );
                    }
                    this.recentErrors.shift();
                }
            },
            
            detect: function() {
                if (this.recentErrors.length < this.minSamples) {
                    return { drift: false, confidence: 0, message: 'Insufficient data' };
                }
                
                const recent = this.recentErrors.slice(-this.windowSize);
                const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
                const recentStd = Math.sqrt(
                    recent.reduce((s, x) => s + Math.pow(x - recentMean, 2), 0) / recent.length
                );
                
                if (this.historicalMean === null) {
                    // First window - set baseline
                    this.historicalMean = recentMean;
                    this.historicalStd = recentStd;
                    return { drift: false, confidence: 0, message: 'Baseline established' };
                }
                
                // ADWIN-style drift detection using statistical test
                const zscore = this.historicalStd > 0 ? 
                    Math.abs(recentMean - this.historicalMean) / this.historicalStd : 0;
                
                const drift = zscore > this.threshold;
                
                if (drift) {
                    this.driftCount++;
                    // Reset baseline
                    this.historicalMean = recentMean;
                    this.historicalStd = recentStd;
                }
                
                return {
                    drift,
                    confidence: Math.min(1, zscore / (this.threshold * 2)),
                    zscore,
                    historicalMean: this.historicalMean,
                    recentMean,
                    trend: recentMean > this.historicalMean ? 'increasing' : 'decreasing',
                    driftCount: this.driftCount
                };
            },
            
            reset: function() {
                this.recentErrors = [];
                this.historicalMean = null;
                this.historicalStd = null;
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // ELASTIC WEIGHT CONSOLIDATION (EWC)
    // ─────────────────────────────────────────────────────────────────────────
    
    createEWC: function(lambda = 1000) {
        return {
            lambda,
            fisherDiagonals: [],
            optimalWeights: [],
            taskCount: 0,
            
            /**
             * Compute Fisher Information diagonal
             * F_ii ≈ E[∂L/∂θ_i]²
             */
            computeFisher: function(model, data, numSamples = 100) {
                const params = model.getParams ? model.getParams() : model.weights;
                const fisher = params.map(p => 
                    Array.isArray(p) ? p.map(() => 0) : 0
                );
                
                for (let s = 0; s < Math.min(numSamples, data.length); s++) {
                    const sample = data[s];
                    
                    // Compute gradients (model must provide this)
                    const gradients = model.computeGradients ? 
                        model.computeGradients(sample.input, sample.target) :
                        this._approximateGradients(model, sample);
                    
                    // Add squared gradients to Fisher
                    for (let i = 0; i < gradients.length; i++) {
                        if (Array.isArray(gradients[i])) {
                            for (let j = 0; j < gradients[i].length; j++) {
                                fisher[i][j] += gradients[i][j] * gradients[i][j];
                            }
                        } else {
                            fisher[i] += gradients[i] * gradients[i];
                        }
                    }
                }
                
                // Average
                for (let i = 0; i < fisher.length; i++) {
                    if (Array.isArray(fisher[i])) {
                        for (let j = 0; j < fisher[i].length; j++) {
                            fisher[i][j] /= numSamples;
                        }
                    } else {
                        fisher[i] /= numSamples;
                    }
                }
                
                return fisher;
            },
            
            /**
             * Register completed task
             */
            registerTask: function(model, data) {
                const fisher = this.computeFisher(model, data);
                const params = model.getParams ? model.getParams() : model.weights;
                
                this.fisherDiagonals.push(fisher);
                this.optimalWeights.push(JSON.parse(JSON.stringify(params)));
                this.taskCount++;
                
                return { taskId: this.taskCount - 1, fisherComputed: true };
            },
            
            /**
             * Compute EWC penalty term
             * L_EWC = Σ_i (λ/2) * F_i * (θ_i - θ*_i)²
             */
            computePenalty: function(currentWeights) {
                let penalty = 0;
                
                for (let t = 0; t < this.taskCount; t++) {
                    const fisher = this.fisherDiagonals[t];
                    const optimal = this.optimalWeights[t];
                    
                    for (let i = 0; i < currentWeights.length; i++) {
                        if (Array.isArray(currentWeights[i])) {
                            for (let j = 0; j < currentWeights[i].length; j++) {
                                const diff = currentWeights[i][j] - optimal[i][j];
                                penalty += fisher[i][j] * diff * diff;
                            }
                        } else {
                            const diff = currentWeights[i] - optimal[i];
                            penalty += fisher[i] * diff * diff;
                        }
                    }
                }
                
                return (this.lambda / 2) * penalty;
            },
            
            /**
             * Compute EWC gradient contribution
             */
            computePenaltyGradient: function(currentWeights) {
                const gradient = currentWeights.map(w => 
                    Array.isArray(w) ? w.map(() => 0) : 0
                );
                
                for (let t = 0; t < this.taskCount; t++) {
                    const fisher = this.fisherDiagonals[t];
                    const optimal = this.optimalWeights[t];
                    
                    for (let i = 0; i < currentWeights.length; i++) {
                        if (Array.isArray(currentWeights[i])) {
                            for (let j = 0; j < currentWeights[i].length; j++) {
                                const diff = currentWeights[i][j] - optimal[i][j];
                                gradient[i][j] += this.lambda * fisher[i][j] * diff;
                            }
                        } else {
                            const diff = currentWeights[i] - optimal[i];
                            gradient[i] += this.lambda * fisher[i] * diff;
                        }
                    }
                }
                
                return gradient;
            },
            
            _approximateGradients: function(model, sample, epsilon = 1e-5) {
                const params = model.getParams ? model.getParams() : model.weights;
                const gradients = [];
                
                const baseLoss = model.computeLoss ? 
                    model.computeLoss(sample.input, sample.target) :
                    Math.pow(model.forward(sample.input)[0] - sample.target, 2);
                
                for (let i = 0; i < params.length; i++) {
                    if (Array.isArray(params[i])) {
                        const layerGrad = [];
                        for (let j = 0; j < params[i].length; j++) {
                            params[i][j] += epsilon;
                            const newLoss = model.computeLoss ? 
                                model.computeLoss(sample.input, sample.target) :
                                Math.pow(model.forward(sample.input)[0] - sample.target, 2);
                            params[i][j] -= epsilon;
                            layerGrad.push((newLoss - baseLoss) / epsilon);
                        }
                        gradients.push(layerGrad);
                    } else {
                        params[i] += epsilon;
                        const newLoss = model.computeLoss ? 
                            model.computeLoss(sample.input, sample.target) :
                            Math.pow(model.forward(sample.input)[0] - sample.target, 2);
                        params[i] -= epsilon;
                        gradients.push((newLoss - baseLoss) / epsilon);
                    }
                }
                
                return gradients;
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // MULTI-ARMED BANDIT FOR EXPLORATION
    // ─────────────────────────────────────────────────────────────────────────
    
    createBandit: function(numArms) {
        return {
            numArms,
            counts: new Array(numArms).fill(0),
            values: new Array(numArms).fill(0),
            sumRewards: new Array(numArms).fill(0),
            sumSquaredRewards: new Array(numArms).fill(0),
            
            /**
             * Select arm using UCB1
             */
            selectUCB: function(c = 2) {
                const totalPulls = this.counts.reduce((a, b) => a + b, 0);
                
                // Pull each arm at least once
                for (let i = 0; i < this.numArms; i++) {
                    if (this.counts[i] === 0) return i;
                }
                
                let bestArm = 0;
                let bestUCB = -Infinity;
                
                for (let i = 0; i < this.numArms; i++) {
                    const exploitation = this.values[i];
                    const exploration = c * Math.sqrt(Math.log(totalPulls) / this.counts[i]);
                    const ucb = exploitation + exploration;
                    
                    if (ucb > bestUCB) {
                        bestUCB = ucb;
                        bestArm = i;
                    }
                }
                
                return bestArm;
            },
            
            /**
             * Select arm using Thompson Sampling (Beta-Bernoulli)
             */
            selectThompson: function() {
                let bestArm = 0;
                let bestSample = -Infinity;
                
                for (let i = 0; i < this.numArms; i++) {
                    // Sample from Beta distribution
                    const alpha = this.sumRewards[i] + 1;
                    const beta = this.counts[i] - this.sumRewards[i] + 1;
                    const sample = this._sampleBeta(alpha, beta);
                    
                    if (sample > bestSample) {
                        bestSample = sample;
                        bestArm = i;
                    }
                }
                
                return bestArm;
            },
            
            /**
             * Select arm using epsilon-greedy
             */
            selectEpsilonGreedy: function(epsilon = 0.1) {
                if (Math.random() < epsilon) {
                    return Math.floor(Math.random() * this.numArms);
                }
                
                let bestArm = 0;
                let bestValue = this.values[0];
                
                for (let i = 1; i < this.numArms; i++) {
                    if (this.values[i] > bestValue) {
                        bestValue = this.values[i];
                        bestArm = i;
                    }
                }
                
                return bestArm;
            },
            
            /**
             * Update arm statistics
             */
            update: function(arm, reward) {
                this.counts[arm]++;
                this.sumRewards[arm] += reward;
                this.sumSquaredRewards[arm] += reward * reward;
                
                // Incremental mean update
                const n = this.counts[arm];
                this.values[arm] += (reward - this.values[arm]) / n;
            },
            
            /**
             * Get arm statistics
             */
            getStats: function() {
                return {
                    counts: [...this.counts],
                    values: [...this.values],
                    bestArm: this.values.indexOf(Math.max(...this.values)),
                    totalPulls: this.counts.reduce((a, b) => a + b, 0)
                };
            },
            
            _sampleBeta: function(alpha, beta) {
                // Approximation using normal distribution
                const mean = alpha / (alpha + beta);
                const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
                return mean + Math.sqrt(variance) * (Math.random() + Math.random() + Math.random() - 1.5) * 1.22;
            }
        };
    }
}