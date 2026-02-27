/**
 * PRISM_PROBABILISTIC_REASONING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 413
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_PROBABILISTIC_REASONING_ENGINE = {
    name: 'PRISM_PROBABILISTIC_REASONING_ENGINE',
    version: '1.0.0',
    description: 'Probabilistic reasoning with HMM, particle filters, and Bayesian networks',
    source: 'MIT 16.410, Stanford CS 221',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Particle Filter (Sequential Monte Carlo)
    // ─────────────────────────────────────────────────────────────────────────────
    
    createParticleFilter: function(config) {
        const {
            numParticles = 1000,
            transitionModel, // function(state, action) => newState
            observationModel, // function(state, observation) => likelihood
            initialDistribution // function() => state
        } = config;
        
        return {
            particles: [],
            weights: [],
            
            initialize: function() {
                this.particles = [];
                this.weights = [];
                
                for (let i = 0; i < numParticles; i++) {
                    this.particles.push(initialDistribution());
                    this.weights.push(1 / numParticles);
                }
                
                return this;
            },
            
            predict: function(action) {
                this.particles = this.particles.map(p => transitionModel(p, action));
                return this;
            },
            
            update: function(observation) {
                // Update weights based on observation
                for (let i = 0; i < this.particles.length; i++) {
                    this.weights[i] *= observationModel(this.particles[i], observation);
                }
                
                // Normalize
                const sum = this.weights.reduce((a, b) => a + b, 0);
                if (sum > 0) {
                    this.weights = this.weights.map(w => w / sum);
                }
                
                // Resample if effective sample size too low
                const ess = 1 / this.weights.reduce((a, w) => a + w * w, 0);
                if (ess < numParticles / 2) {
                    this._resample();
                }
                
                return this;
            },
            
            _resample: function() {
                const newParticles = [];
                const cumWeights = [];
                let cumSum = 0;
                
                for (const w of this.weights) {
                    cumSum += w;
                    cumWeights.push(cumSum);
                }
                
                for (let i = 0; i < numParticles; i++) {
                    const r = Math.random();
                    let idx = cumWeights.findIndex(cw => cw >= r);
                    if (idx === -1) idx = numParticles - 1;
                    
                    newParticles.push({ ...this.particles[idx] });
                }
                
                this.particles = newParticles;
                this.weights = new Array(numParticles).fill(1 / numParticles);
            },
            
            getEstimate: function() {
                // Weighted mean for continuous states
                const estimate = {};
                
                if (this.particles.length === 0) return null;
                
                const keys = Object.keys(this.particles[0]);
                for (const key of keys) {
                    if (typeof this.particles[0][key] === 'number') {
                        estimate[key] = 0;
                        for (let i = 0; i < this.particles.length; i++) {
                            estimate[key] += this.weights[i] * this.particles[i][key];
                        }
                    }
                }
                
                return estimate;
            },
            
            getVariance: function() {
                const mean = this.getEstimate();
                const variance = {};
                
                const keys = Object.keys(this.particles[0]);
                for (const key of keys) {
                    if (typeof this.particles[0][key] === 'number') {
                        variance[key] = 0;
                        for (let i = 0; i < this.particles.length; i++) {
                            const diff = this.particles[i][key] - mean[key];
                            variance[key] += this.weights[i] * diff * diff;
                        }
                    }
                }
                
                return variance;
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Wear Particle Filter
    // ─────────────────────────────────────────────────────────────────────────────
    
    createToolWearFilter: function(initialWear = 0, wearRate = 0.001, observationNoise = 0.01) {
        return this.createParticleFilter({
            numParticles: 500,
            
            transitionModel: (state, action) => {
                // Action is cutting time in minutes
                const newWear = state.wear + action * wearRate * (0.8 + 0.4 * Math.random());
                return { wear: Math.max(0, newWear) };
            },
            
            observationModel: (state, observation) => {
                // Observation is measured wear
                const diff = observation - state.wear;
                return Math.exp(-diff * diff / (2 * observationNoise * observationNoise));
            },
            
            initialDistribution: () => ({
                wear: initialWear + (Math.random() - 0.5) * 0.02
            })
        });
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Enhanced HMM with Baum-Welch Learning
    // ─────────────────────────────────────────────────────────────────────────────
    
    baumWelch: function(hmm, observations, maxIterations = 100, tolerance = 1e-6) {
        const { states, observationSymbols, initial, transition, emission } = hmm;
        const N = states.length;
        const M = observationSymbols.length;
        const T = observations.length;
        
        // Map observations to indices
        const obsIdx = observations.map(o => observationSymbols.indexOf(o));
        
        let prevLogLikelihood = -Infinity;
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // E-step: Forward-Backward
            const { alpha, beta, logLikelihood } = this._forwardBackward(
                N, T, obsIdx, initial, transition, emission
            );
            
            // Check convergence
            if (Math.abs(logLikelihood - prevLogLikelihood) < tolerance) {
                return { converged: true, iterations: iter, hmm: { states, observationSymbols, initial, transition, emission } };
            }
            prevLogLikelihood = logLikelihood;
            
            // Compute gamma and xi
            const gamma = this._computeGamma(N, T, alpha, beta);
            const xi = this._computeXi(N, T, alpha, beta, transition, emission, obsIdx);
            
            // M-step: Update parameters
            // Update initial
            for (let i = 0; i < N; i++) {
                initial[i] = gamma[0][i];
            }
            
            // Update transition
            for (let i = 0; i < N; i++) {
                const gammaSum = gamma.slice(0, -1).reduce((sum, g) => sum + g[i], 0);
                for (let j = 0; j < N; j++) {
                    const xiSum = xi.reduce((sum, x) => sum + x[i][j], 0);
                    transition[i][j] = gammaSum > 0 ? xiSum / gammaSum : 1 / N;
                }
            }
            
            // Update emission
            for (let i = 0; i < N; i++) {
                const gammaSum = gamma.reduce((sum, g) => sum + g[i], 0);
                for (let k = 0; k < M; k++) {
                    let obsSum = 0;
                    for (let t = 0; t < T; t++) {
                        if (obsIdx[t] === k) obsSum += gamma[t][i];
                    }
                    emission[i][k] = gammaSum > 0 ? obsSum / gammaSum : 1 / M;
                }
            }
        }
        
        return { converged: false, iterations: maxIterations, hmm: { states, observationSymbols, initial, transition, emission } };
    },
    
    _forwardBackward: function(N, T, obsIdx, initial, transition, emission) {
        // Forward pass
        const alpha = [];
        let scaling = [];
        
        // Initialize
        alpha[0] = [];
        let c0 = 0;
        for (let i = 0; i < N; i++) {
            alpha[0][i] = initial[i] * emission[i][obsIdx[0]];
            c0 += alpha[0][i];
        }
        scaling[0] = c0;
        for (let i = 0; i < N; i++) alpha[0][i] /= c0;
        
        // Forward
        for (let t = 1; t < T; t++) {
            alpha[t] = [];
            let ct = 0;
            for (let j = 0; j < N; j++) {
                alpha[t][j] = 0;
                for (let i = 0; i < N; i++) {
                    alpha[t][j] += alpha[t-1][i] * transition[i][j];
                }
                alpha[t][j] *= emission[j][obsIdx[t]];
                ct += alpha[t][j];
            }
            scaling[t] = ct;
            for (let j = 0; j < N; j++) alpha[t][j] /= ct;
        }
        
        // Backward pass
        const beta = [];
        beta[T-1] = new Array(N).fill(1);
        
        for (let t = T - 2; t >= 0; t--) {
            beta[t] = [];
            for (let i = 0; i < N; i++) {
                beta[t][i] = 0;
                for (let j = 0; j < N; j++) {
                    beta[t][i] += transition[i][j] * emission[j][obsIdx[t+1]] * beta[t+1][j];
                }
                beta[t][i] /= scaling[t+1];
            }
        }
        
        const logLikelihood = scaling.reduce((sum, c) => sum + Math.log(c), 0);
        
        return { alpha, beta, logLikelihood, scaling };
    },
    
    _computeGamma: function(N, T, alpha, beta) {
        const gamma = [];
        for (let t = 0; t < T; t++) {
            gamma[t] = [];
            let sum = 0;
            for (let i = 0; i < N; i++) {
                gamma[t][i] = alpha[t][i] * beta[t][i];
                sum += gamma[t][i];
            }
            for (let i = 0; i < N; i++) {
                gamma[t][i] /= sum;
            }
        }
        return gamma;
    },
    
    _computeXi: function(N, T, alpha, beta, transition, emission, obsIdx) {
        const xi = [];
        for (let t = 0; t < T - 1; t++) {
            xi[t] = [];
            let sum = 0;
            for (let i = 0; i < N; i++) {
                xi[t][i] = [];
                for (let j = 0; j < N; j++) {
                    xi[t][i][j] = alpha[t][i] * transition[i][j] * emission[j][obsIdx[t+1]] * beta[t+1][j];
                    sum += xi[t][i][j];
                }
            }
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    xi[t][i][j] /= sum;
                }
            }
        }
        return xi;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Enhanced MCTS with UCT
    // ─────────────────────────────────────────────────────────────────────────────
    
    mctsUCT: function(config) {
        const {
            rootState,
            getActions,
            applyAction,
            isTerminal,
            getReward,
            iterations = 1000,
            explorationConstant = Math.sqrt(2),
            simulationDepth = 50
        } = config;
        
        const root = {
            state: rootState,
            parent: null,
            action: null,
            children: [],
            visits: 0,
            totalReward: 0,
            untriedActions: getActions(rootState)
        };
        
        for (let i = 0; i < iterations; i++) {
            // Selection
            let node = root;
            while (node.untriedActions.length === 0 && node.children.length > 0) {
                node = this._selectBestChild(node, explorationConstant);
            }
            
            // Expansion
            if (node.untriedActions.length > 0 && !isTerminal(node.state)) {
                const action = node.untriedActions.pop();
                const newState = applyAction(node.state, action);
                const child = {
                    state: newState,
                    parent: node,
                    action: action,
                    children: [],
                    visits: 0,
                    totalReward: 0,
                    untriedActions: getActions(newState)
                };
                node.children.push(child);
                node = child;
            }
            
            // Simulation
            let simState = node.state;
            let depth = 0;
            while (!isTerminal(simState) && depth < simulationDepth) {
                const actions = getActions(simState);
                if (actions.length === 0) break;
                const action = actions[Math.floor(Math.random() * actions.length)];
                simState = applyAction(simState, action);
                depth++;
            }
            const reward = getReward(simState);
            
            // Backpropagation
            while (node !== null) {
                node.visits++;
                node.totalReward += reward;
                node = node.parent;
            }
        }
        
        // Return best action (most visited)
        if (root.children.length === 0) {
            return { bestAction: null, visits: root.visits };
        }
        
        const bestChild = root.children.reduce((best, child) =>
            child.visits > best.visits ? child : best
        );
        
        return {
            bestAction: bestChild.action,
            confidence: bestChild.visits / root.visits,
            expectedReward: bestChild.totalReward / bestChild.visits,
            rootVisits: root.visits,
            actionStats: root.children.map(c => ({
                action: c.action,
                visits: c.visits,
                avgReward: c.totalReward / c.visits
            }))
        };
    },
    
    _selectBestChild: function(node, c) {
        return node.children.reduce((best, child) => {
            const exploitation = child.totalReward / child.visits;
            const exploration = c * Math.sqrt(Math.log(node.visits) / child.visits);
            const ucb = exploitation + exploration;
            
            const bestExploitation = best.totalReward / best.visits;
            const bestExploration = c * Math.sqrt(Math.log(node.visits) / best.visits);
            const bestUcb = bestExploitation + bestExploration;
            
            return ucb > bestUcb ? child : best;
        });
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('prob.particleFilter.create', 'PRISM_PROBABILISTIC_REASONING_ENGINE.createParticleFilter');
            PRISM_GATEWAY.register('prob.toolWearFilter', 'PRISM_PROBABILISTIC_REASONING_ENGINE.createToolWearFilter');
            PRISM_GATEWAY.register('prob.hmm.baumWelch', 'PRISM_PROBABILISTIC_REASONING_ENGINE.baumWelch');
            PRISM_GATEWAY.register('prob.mcts.uct', 'PRISM_PROBABILISTIC_REASONING_ENGINE.mctsUCT');
        }
    }
}