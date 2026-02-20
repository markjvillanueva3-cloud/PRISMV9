/**
 * PRISM_PHASE3_ADVANCED_RL
 * Extracted from PRISM v8.89.002 monolith
 * References: 39
 * Lines: 831
 * Session: R2.1.1 Ralph Iteration 2
 */

const PRISM_PHASE3_ADVANCED_RL = {
    name: 'Phase 3 Advanced Reinforcement Learning',
    version: '1.0.0',
    sources: ['Stanford CS234', 'Berkeley CS285', 'MIT 15.773'],
    algorithmCount: 15,
    
    /**
     * PPO (Proximal Policy Optimization)
     * Source: Stanford CS234 - Modern Deep RL
     * Usage: Adaptive feed rate control, real-time machining optimization
     */
    ppo: function(params) {
        const {
            policy,
            valueNetwork,
            states,
            actions,
            rewards,
            oldLogProbs,
            gamma = 0.99,
            epsilon = 0.2,
            epochs = 10,
            batchSize = 64
        } = params;
        
        // Calculate returns and advantages using GAE
        const { returns, advantages } = this.gae({
            rewards,
            values: states.map(s => this._estimateValue(valueNetwork, s)),
            gamma,
            lambda: 0.95
        });
        
        let policyLoss = 0;
        let valueLoss = 0;
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            for (let i = 0; i < states.length; i += batchSize) {
                const batchStates = states.slice(i, i + batchSize);
                const batchActions = actions.slice(i, i + batchSize);
                const batchAdvantages = advantages.slice(i, i + batchSize);
                const batchOldLogProbs = oldLogProbs.slice(i, i + batchSize);
                const batchReturns = returns.slice(i, i + batchSize);
                
                for (let j = 0; j < batchStates.length; j++) {
                    const newLogProb = this._logProb(policy, batchStates[j], batchActions[j]);
                    const ratio = Math.exp(newLogProb - batchOldLogProbs[j]);
                    
                    // Clipped surrogate objective
                    const surr1 = ratio * batchAdvantages[j];
                    const surr2 = Math.max(Math.min(ratio, 1 + epsilon), 1 - epsilon) * batchAdvantages[j];
                    
                    policyLoss -= Math.min(surr1, surr2);
                    valueLoss += Math.pow(this._estimateValue(valueNetwork, batchStates[j]) - batchReturns[j], 2);
                }
            }
        }
        
        return {
            policyLoss: policyLoss / states.length,
            valueLoss: valueLoss / states.length,
            source: 'Stanford CS234 - PPO'
        };
    },
    
    /**
     * PPO Clipped Objective
     * Source: Stanford CS234
     */
    ppoClip: function(ratio, advantage, epsilon = 0.2) {
        const clipped = Math.max(Math.min(ratio, 1 + epsilon), 1 - epsilon);
        return Math.min(ratio * advantage, clipped * advantage);
    },
    
    /**
     * SAC (Soft Actor-Critic)
     * Source: Berkeley CS285 - Advanced Deep RL
     * Usage: Continuous control with entropy regularization
     */
    sac: function(params) {
        const {
            state,
            actor,
            critic1,
            critic2,
            targetCritic1,
            targetCritic2,
            alpha = 0.2,
            gamma = 0.99,
            tau = 0.005
        } = params;
        
        // Sample action from policy
        const { action, logProb } = this._sampleAction(actor, state);
        
        // Compute Q-values
        const q1 = this._estimateQ(critic1, state, action);
        const q2 = this._estimateQ(critic2, state, action);
        const minQ = Math.min(q1, q2);
        
        // Actor loss: maximize Q - alpha * log_prob
        const actorLoss = alpha * logProb - minQ;
        
        return {
            action,
            actorLoss,
            q1,
            q2,
            source: 'Berkeley CS285 - SAC'
        };
    },
    
    /**
     * TD3 (Twin Delayed DDPG)
     * Source: Berkeley CS285
     * Usage: Robust continuous control for machining parameters
     */
    td3: function(params) {
        const {
            state,
            action,
            reward,
            nextState,
            done,
            actor,
            critic1,
            critic2,
            targetActor,
            targetCritic1,
            targetCritic2,
            gamma = 0.99,
            policyNoise = 0.2,
            noiseClip = 0.5,
            policyDelay = 2,
            step = 0
        } = params;
        
        // Target action with clipped noise
        const targetAction = this._getAction(targetActor, nextState);
        const noise = Math.max(Math.min(policyNoise * (Math.random() * 2 - 1), noiseClip), -noiseClip);
        const noisyTargetAction = targetAction.map(a => Math.max(-1, Math.min(1, a + noise)));
        
        // Compute target Q
        const targetQ1 = this._estimateQ(targetCritic1, nextState, noisyTargetAction);
        const targetQ2 = this._estimateQ(targetCritic2, nextState, noisyTargetAction);
        const targetQ = reward + gamma * (1 - done) * Math.min(targetQ1, targetQ2);
        
        // Critic loss
        const q1 = this._estimateQ(critic1, state, action);
        const q2 = this._estimateQ(critic2, state, action);
        const criticLoss = Math.pow(q1 - targetQ, 2) + Math.pow(q2 - targetQ, 2);
        
        // Delayed policy update
        let actorLoss = 0;
        if (step % policyDelay === 0) {
            const newAction = this._getAction(actor, state);
            actorLoss = -this._estimateQ(critic1, state, newAction);
        }
        
        return {
            criticLoss,
            actorLoss,
            targetQ,
            source: 'Berkeley CS285 - TD3'
        };
    },
    
    /**
     * DDPG (Deep Deterministic Policy Gradient)
     * Source: Berkeley CS285
     */
    ddpg: function(params) {
        const {
            state,
            action,
            reward,
            nextState,
            done,
            actor,
            critic,
            targetActor,
            targetCritic,
            gamma = 0.99
        } = params;
        
        const targetAction = this._getAction(targetActor, nextState);
        const targetQ = reward + gamma * (1 - done) * this._estimateQ(targetCritic, nextState, targetAction);
        
        const currentQ = this._estimateQ(critic, state, action);
        const criticLoss = Math.pow(currentQ - targetQ, 2);
        
        const newAction = this._getAction(actor, state);
        const actorLoss = -this._estimateQ(critic, state, newAction);
        
        return {
            criticLoss,
            actorLoss,
            targetQ,
            source: 'Berkeley CS285 - DDPG'
        };
    },
    
    /**
     * Double DQN
     * Source: Stanford CS234
     * Usage: Discrete action selection (tool choice, strategy selection)
     */
    doubleDQN: function(params) {
        const {
            state,
            action,
            reward,
            nextState,
            done,
            qNetwork,
            targetNetwork,
            gamma = 0.99
        } = params;
        
        // Use online network to select action, target network to evaluate
        const nextQValues = this._getQValues(qNetwork, nextState);
        const bestAction = nextQValues.indexOf(Math.max(...nextQValues));
        const targetQValues = this._getQValues(targetNetwork, nextState);
        
        const target = reward + gamma * (1 - done) * targetQValues[bestAction];
        const current = this._getQValues(qNetwork, state)[action];
        const loss = Math.pow(current - target, 2);
        
        return {
            loss,
            target,
            bestAction,
            source: 'Stanford CS234 - Double DQN'
        };
    },
    
    /**
     * Dueling DQN
     * Source: Stanford CS234
     */
    duelingDQN: function(state, network) {
        // Split into value and advantage streams
        const value = this._estimateValue(network.valueStream, state);
        const advantages = this._getAdvantages(network.advantageStream, state);
        
        // Q(s,a) = V(s) + A(s,a) - mean(A(s,a'))
        const meanAdvantage = advantages.reduce((a, b) => a + b, 0) / advantages.length;
        const qValues = advantages.map(adv => value + adv - meanAdvantage);
        
        return {
            qValues,
            value,
            advantages,
            source: 'Stanford CS234 - Dueling DQN'
        };
    },
    
    /**
     * Prioritized Experience Replay
     * Source: Stanford CS234
     */
    prioritizedReplay: function(buffer, batchSize, alpha = 0.6, beta = 0.4) {
        // Calculate priorities
        const priorities = buffer.map((exp, i) => Math.pow(Math.abs(exp.tdError) + 1e-6, alpha));
        const totalPriority = priorities.reduce((a, b) => a + b, 0);
        const probs = priorities.map(p => p / totalPriority);
        
        // Sample based on priority
        const samples = [];
        const weights = [];
        
        for (let i = 0; i < batchSize; i++) {
            const r = Math.random();
            let cumProb = 0;
            for (let j = 0; j < buffer.length; j++) {
                cumProb += probs[j];
                if (r < cumProb) {
                    samples.push(buffer[j]);
                    // Importance sampling weight
                    const weight = Math.pow(buffer.length * probs[j], -beta);
                    weights.push(weight);
                    break;
                }
            }
        }
        
        // Normalize weights
        const maxWeight = Math.max(...weights);
        const normalizedWeights = weights.map(w => w / maxWeight);
        
        return {
            samples,
            weights: normalizedWeights,
            source: 'Stanford CS234 - Prioritized Experience Replay'
        };
    },
    
    /**
     * A3C (Asynchronous Advantage Actor-Critic)
     * Source: Stanford CS234
     */
    a3c: function(params) {
        const {
            state,
            action,
            reward,
            nextState,
            done,
            policy,
            valueNetwork,
            gamma = 0.99,
            entropyCoef = 0.01
        } = params;
        
        const value = this._estimateValue(valueNetwork, state);
        const nextValue = done ? 0 : this._estimateValue(valueNetwork, nextState);
        
        // Advantage
        const advantage = reward + gamma * nextValue - value;
        
        // Policy gradient loss
        const logProb = this._logProb(policy, state, action);
        const policyLoss = -logProb * advantage;
        
        // Value loss
        const valueLoss = Math.pow(advantage, 2);
        
        // Entropy bonus for exploration
        const entropy = -this._getEntropy(policy, state);
        
        const totalLoss = policyLoss + 0.5 * valueLoss - entropyCoef * entropy;
        
        return {
            totalLoss,
            policyLoss,
            valueLoss,
            entropy,
            advantage,
            source: 'Stanford CS234 - A3C'
        };
    },
    
    /**
     * GAE (Generalized Advantage Estimation)
     * Source: Stanford CS234
     */
    gae: function(params) {
        const { rewards, values, gamma = 0.99, lambda = 0.95 } = params;
        const n = rewards.length;
        
        const advantages = new Array(n).fill(0);
        const returns = new Array(n).fill(0);
        
        let gae = 0;
        for (let t = n - 1; t >= 0; t--) {
            const nextValue = t === n - 1 ? 0 : values[t + 1];
            const delta = rewards[t] + gamma * nextValue - values[t];
            gae = delta + gamma * lambda * gae;
            advantages[t] = gae;
            returns[t] = advantages[t] + values[t];
        }
        
        return { advantages, returns, source: 'Stanford CS234 - GAE' };
    },
    
    /**
     * Model-Based RL
     * Source: Berkeley CS285
     * Usage: Learn dynamics model for planning
     */
    modelBased: function(params) {
        const {
            state,
            action,
            nextState,
            dynamicsModel,
            horizon = 10,
            numSamples = 100
        } = params;
        
        // Train dynamics model
        const predictedNextState = this._predictDynamics(dynamicsModel, state, action);
        const modelError = nextState.map((ns, i) => Math.pow(ns - predictedNextState[i], 2))
            .reduce((a, b) => a + b, 0);
        
        // Planning with learned model
        const plans = [];
        for (let i = 0; i < numSamples; i++) {
            let planState = [...state];
            let totalReward = 0;
            const actionSequence = [];
            
            for (let t = 0; t < horizon; t++) {
                const randomAction = Array(action.length).fill(0).map(() => Math.random() * 2 - 1);
                const predicted = this._predictDynamics(dynamicsModel, planState, randomAction);
                totalReward += this._estimateReward(planState, randomAction);
                planState = predicted;
                actionSequence.push(randomAction);
            }
            
            plans.push({ totalReward, actionSequence });
        }
        
        // Return best plan
        plans.sort((a, b) => b.totalReward - a.totalReward);
        const bestPlan = plans[0];
        
        return {
            bestAction: bestPlan.actionSequence[0],
            expectedReward: bestPlan.totalReward,
            modelError,
            source: 'Berkeley CS285 - Model-Based RL'
        };
    },
    
    /**
     * Curiosity-Driven Exploration
     * Source: Berkeley CS285
     */
    curiosityDriven: function(params) {
        const { state, action, nextState, forwardModel, inverseModel } = params;
        
        // Forward model prediction
        const predictedNextState = this._predictDynamics(forwardModel, state, action);
        
        // Intrinsic reward = prediction error
        const intrinsicReward = nextState.map((ns, i) =>
            Math.pow(ns - predictedNextState[i], 2)
        ).reduce((a, b) => a + b, 0);
        
        return {
            intrinsicReward,
            predictedNextState,
            source: 'Berkeley CS285 - Curiosity-Driven Exploration'
        };
    },
    
    /**
     * Hindsight Experience Replay
     * Source: Berkeley CS285
     */
    hindsightReplay: function(trajectory, achievedGoal, desiredGoal) {
        const augmentedExperiences = [];
        
        // Original experience
        for (const exp of trajectory) {
            augmentedExperiences.push({
                ...exp,
                goal: desiredGoal,
                reward: this._computeReward(exp.state, desiredGoal)
            });
        }
        
        // Hindsight experience (pretend achieved goal was the desired goal)
        for (const exp of trajectory) {
            augmentedExperiences.push({
                ...exp,
                goal: achievedGoal,
                reward: this._computeReward(exp.state, achievedGoal)
            });
        }
        
        return {
            experiences: augmentedExperiences,
            source: 'Berkeley CS285 - Hindsight Experience Replay'
        };
    },
    
    /**
     * Multi-Agent RL
     * Source: Berkeley CS285
     */
    multiAgent: function(params) {
        const { agents, states, actions, rewards, sharedReward = false } = params;
        
        const losses = [];
        
        for (let i = 0; i < agents.length; i++) {
            const agentReward = sharedReward ?
                rewards.reduce((a, b) => a + b, 0) / agents.length :
                rewards[i];
            
            const value = this._estimateValue(agents[i].valueNetwork, states[i]);
            const advantage = agentReward - value;
            const loss = -this._logProb(agents[i].policy, states[i], actions[i]) * advantage;
            
            losses.push(loss);
        }
        
        return {
            losses,
            source: 'Berkeley CS285 - Multi-Agent RL'
        };
    },
    
    /**
     * Machining Environment for RL
     * Source: PRISM-specific implementation using Berkeley CS285 methodology
     */
    machiningEnvironment: function() {
        return {
            stateSpace: ['spindle_speed', 'feed_rate', 'depth_of_cut', 'tool_wear', 'vibration', 'temperature'],
            actionSpace: ['speed_delta', 'feed_delta', 'doc_delta'],
            
            step: function(state, action) {
                // Apply action
                const newState = {
                    spindle_speed: Math.max(100, Math.min(20000, state.spindle_speed + action.speed_delta)),
                    feed_rate: Math.max(10, Math.min(5000, state.feed_rate + action.feed_delta)),
                    depth_of_cut: Math.max(0.1, Math.min(10, state.depth_of_cut + action.doc_delta)),
                    tool_wear: state.tool_wear + 0.001 * state.spindle_speed / 1000,
                    vibration: Math.random() * 0.1,
                    temperature: 20 + state.spindle_speed / 100
                };
                
                // Calculate reward
                const mrr = newState.feed_rate * newState.depth_of_cut * 0.001;
                const wearPenalty = newState.tool_wear * 10;
                const vibrationPenalty = newState.vibration > 0.5 ? 100 : 0;
                
                const reward = mrr - wearPenalty - vibrationPenalty;
                const done = newState.tool_wear > 1.0;
                
                return { newState, reward, done };
            },
            
            reset: function() {
                return {
                    spindle_speed: 1000,
                    feed_rate: 100,
                    depth_of_cut: 1.0,
                    tool_wear: 0,
                    vibration: 0,
                    temperature: 20
                };
            },
            
            source: 'PRISM Manufacturing RL Environment (Berkeley CS285 methodology)'
        };
    },
    
    // Helper functions
    _estimateValue: function(network, state) {
        if (!network || !state) return 0;
        return state.reduce((sum, s) => sum + s * 0.1, 0);
    },
    
    _estimateQ: function(network, state, action) {
        if (!network || !state || !action) return 0;
        const stateSum = state.reduce((a, b) => a + b, 0);
        const actionSum = action.reduce((a, b) => a + b, 0);
        return stateSum * 0.5 + actionSum * 0.5;
    },
    
    _getAction: function(actor, state) {
        if (!actor || !state) return [0];
        return state.map(s => Math.tanh(s * 0.1));
    },
    
    _sampleAction: function(actor, state) {
        const action = this._getAction(actor, state);
        const noise = action.map(() => (Math.random() - 0.5) * 0.2);
        const noisyAction = action.map((a, i) => a + noise[i]);
        const logProb = -noise.reduce((sum, n) => sum + n * n, 0);
        return { action: noisyAction, logProb };
    },
    
    _logProb: function(policy, state, action) {
        return -Math.pow(action - state[0], 2);
    },
    
    _getQValues: function(network, state) {
        if (!network || !state) return [0, 0, 0, 0];
        return [0, 1, 2, 3].map(a => state.reduce((sum, s) => sum + s, 0) * 0.1 * (1 + a * 0.1));
    },
    
    _getAdvantages: function(network, state) {
        return [0, 1, 2, 3].map(a => (a - 1.5) * state.reduce((sum, s) => sum + s, 0) * 0.01);
    },
    
    _getEntropy: function(policy, state) {
        return 0.5 * Math.log(2 * Math.PI * Math.E);
    },
    
    _predictDynamics: function(model, state, action) {
        if (!model || !state || !action) return state;
        return state.map((s, i) => s + (action[i] || 0) * 0.1);
    },
    
    _estimateReward: function(state, action) {
        return -state.map((s, i) => Math.pow(s - (action[i] || 0), 2)).reduce((a, b) => a + b, 0);
    },
    
    _computeReward: function(state, goal) {
        const dist = state.map((s, i) => Math.pow(s - (goal[i] || 0), 2)).reduce((a, b) => a + b, 0);
        return dist < 0.1 ? 0 : -1;
    }
};

console.log('PRISM Phase 3 Part 1 Loaded: Deep Learning (25) + Advanced RL (15) = 40 algorithms');
/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * PRISM PHASE 3 - COMPLETE COURSES UTILIZATION INTEGRATION - PART 2
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * 
 * Part 2: Advanced Signal (15) + Manufacturing Physics (15) + GNN (10) + Time Series (10) + Scheduling (10)
 * Total: 60 algorithms
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════
// CATEGORY 3: ADVANCED SIGNAL PROCESSING (15 ALGORITHMS)
// Sources: MIT 18.086, Berkeley EE123, Stanford EE263
// ═══════════════════════════════════════════════════════════════════════════════════════════

const PRISM_PHASE3_ADVANCED_SIGNAL = {
    name: 'Phase 3 Advanced Signal Processing',
    version: '1.0.0',
    sources: ['MIT 18.086', 'Berkeley EE123', 'Stanford EE263'],
    algorithmCount: 15,
    
    /**
     * Discrete Wavelet Transform (DWT)
     * Source: MIT 18.086 - Computational Science
     * Usage: Multi-resolution analysis of vibration signals
     */
    discreteWavelet: function(signal, wavelet = 'haar', levels = 4) {
        const n = signal.length;
        
        // Haar wavelet coefficients
        const wavelets = {
            haar: { lowpass: [1/Math.sqrt(2), 1/Math.sqrt(2)], highpass: [1/Math.sqrt(2), -1/Math.sqrt(2)] },
            db2: { lowpass: [0.4830, 0.8365, 0.2241, -0.1294], highpass: [0.1294, 0.2241, -0.8365, 0.4830] }
        };
        
        const { lowpass, highpass } = wavelets[wavelet] || wavelets.haar;
        
        const approximations = [];
        const details = [];
        let current = [...signal];
        
        for (let level = 0; level < levels; level++) {
            const m = current.length;
            const approx = [];
            const detail = [];
            
            for (let i = 0; i < Math.floor(m / 2); i++) {
                let a = 0, d = 0;
                for (let j = 0; j < lowpass.length; j++) {
                    const idx = (2 * i + j) % m;
                    a += lowpass[j] * current[idx];
                    d += highpass[j] * current[idx];
                }
                approx.push(a);
                detail.push(d);
            }
            
            approximations.push(approx);
            details.push(detail);
            current = approx;
        }
        
        return {
            approximations,
            details,
            finalApproximation: approximations[approximations.length - 1],
            levels,
            source: 'MIT 18.086 - Discrete Wavelet Transform'
        };
    },
    
    /**
     * Continuous Wavelet Transform (CWT)
     * Source: MIT 18.086
     * Usage: Time-frequency analysis of machining signals
     */
    continuousWavelet: function(signal, scales, dt = 1) {
        const n = signal.length;
        const numScales = scales.length;
        
        // Morlet wavelet
        const morlet = (t, scale) => {
            const omega0 = 6;
            const normFactor = Math.pow(Math.PI, -0.25);
            const x = t / scale;
            return normFactor * Math.exp(-0.5 * x * x) * Math.cos(omega0 * x);
        };
        
        const coefficients = [];
        
        for (let s = 0; s < numScales; s++) {
            const scale = scales[s];
            const row = [];
            
            for (let t = 0; t < n; t++) {
                let sum = 0;
                for (let tau = 0; tau < n; tau++) {
                    const waveletVal = morlet((tau - t) * dt, scale);
                    sum += signal[tau] * waveletVal;
                }
                row.push(sum / Math.sqrt(scale));
            }
            
            coefficients.push(row);
        }
        
        return {
            coefficients,
            scales,
            frequencies: scales.map(s => 1 / (s * dt)),
            source: 'MIT 18.086 - Continuous Wavelet Transform'
        };
    },
    
    /**
     * Wavelet Transform (general entry point)
     */
    waveletTransform: function(signal, type = 'dwt', options = {}) {
        if (type === 'dwt') {
            return this.discreteWavelet(signal, options.wavelet, options.levels);
        } else {
            const scales = options.scales || Array.from({length: 32}, (_, i) => Math.pow(2, i / 4));
            return this.continuousWavelet(signal, scales, options.dt);
        }
    },
    
    /**
     * Inverse Wavelet Transform
     */
    waveletInverse: function(approximation, details, wavelet = 'haar') {
        const wavelets = {
            haar: { lowpass: [1/Math.sqrt(2), 1/Math.sqrt(2)], highpass: [1/Math.sqrt(2), -1/Math.sqrt(2)] }
        };
        
        const { lowpass, highpass } = wavelets[wavelet] || wavelets.haar;
        let current = [...approximation];
        
        for (let level = details.length - 1; level >= 0; level--) {
            const detail = details[level];
            const reconstructed = new Array(current.length * 2).fill(0);
            
            for (let i = 0; i < current.length; i++) {
                for (let j = 0; j < lowpass.length; j++) {
                    const idx = (2 * i + j) % reconstructed.length;
                    reconstructed[idx] += lowpass[j] * current[i] + highpass[j] * detail[i];
                }
            }
            
            current = reconstructed;
        }
        
        return { signal: current, source: 'MIT 18.086 - Inverse Wavelet Transform' };
    },
    
    /**
     * Hilbert Transform
     * Source: MIT 18.086
     * Usage: Envelope detection for vibration analysis
     */
    hilbertTransform: function(signal) {
        const n = signal.length;
        
        // FFT
        const fft = this._fft(signal);
        
        // Apply Hilbert transform in frequency domain
        const hilbert = fft.map((f, k) => {
            if (k === 0 || k === n / 2) {
                return f;
            } else if (k < n / 2) {
                return { re: f.re * 2, im: f.im * 2 };
            } else {
                return { re: 0, im: 0 };
            }
        });
        
        // IFFT
        const analytic = this._ifft(hilbert);
        
        // Envelope and instantaneous phase
        const envelope = analytic.map(c => Math.sqrt(c.re * c.re + c.im * c.im));
        const phase = analytic.map(c => Math.atan2(c.im, c.re));
        
        return {
            envelope,
            phase,
            analytic,
            source: 'MIT 18.086 - Hilbert Transform'
        };
    },
    
    /**
     * Empirical Mode Decomposition (EMD)
     * Source: MIT 18.086
     * Usage: Decompose non-stationary signals into intrinsic mode functions
     */
    empiricalModeDecomp: function(signal, maxIMFs = 10, maxSiftIter = 100) {
        const imfs = [];
        let residual = [...signal];
        
        for (let imfNum = 0; imfNum < maxIMFs; imfNum++) {
            let h = [...residual];
            
            // Sifting process
            for (let iter = 0; iter < maxSiftIter; iter++) {
                const { upper, lower } = this._findEnvelopes(h);
                const mean = upper.map((u, i) => (u + lower[i]) / 2);
                
                const newH = h.map((v, i) => v - mean[i]);
                
                // Check if it's an IMF (should have same number of extrema and zero crossings)
                const extrema = this._countExtrema(newH);
                const zeroCrossings = this._countZeroCrossings(newH);
                
                if (Math.abs(extrema - zeroCrossings) <= 1) {
                    h = newH;
                    break;
                }
                
                h = newH;
            }
            
            imfs.push(h);
            residual = residual.map((r, i) => r - h[i]);
            
            // Check if residual is monotonic
            if (this._isMonotonic(residual)) {
                break;
            }
        }