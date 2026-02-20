const PRISM_RL_ADAPTIVE_MACHINING = {
    name: 'RL-Adaptive Machining',
    sources: ['Stanford CS234', 'Berkeley CS285', 'MIT 2.830'],
    patentClaim: 'Actor-Critic reinforcement learning with Kalman filtering for real-time CNC parameter adaptation',
    
    /**
     * Initialize the adaptive machining controller
     */
    createController: function(config = {}) {
        const {
            stateDim = 6,      // [speed, feed, doc, vibration, temp, wear]
            actionDim = 3,     // [delta_speed, delta_feed, delta_doc]
            hiddenDim = 64,
            learningRate = 0.001,
            gamma = 0.99,
            tau = 0.005        // Soft update rate
        } = config;
        
        return {
            // Actor network (policy)
            actor: this._createNetwork(stateDim, hiddenDim, actionDim, 'tanh'),
            actorTarget: this._createNetwork(stateDim, hiddenDim, actionDim, 'tanh'),
            
            // Critic network (value)
            critic: this._createNetwork(stateDim + actionDim, hiddenDim, 1, 'linear'),
            criticTarget: this._createNetwork(stateDim + actionDim, hiddenDim, 1, 'linear'),
            
            // Kalman filter for state estimation
            kalman: this._initKalman(stateDim),
            
            // Experience replay
            replayBuffer: [],
            maxBufferSize: 10000,
            
            // Parameters
            gamma: gamma,
            tau: tau,
            learningRate: learningRate,
            
            // Statistics
            episodeReward: 0,
            totalSteps: 0
        };
    },
    
    /**
     * Get action from current state
     */
    getAction: function(controller, rawState, noise = 0.1) {
        // Filter state through Kalman
        const filteredState = this._kalmanUpdate(controller.kalman, rawState);
        
        // Get action from actor network
        const action = this._forward(controller.actor, filteredState);
        
        // Add exploration noise
        const noisyAction = action.map(a => {
            const noised = a + (Math.random() - 0.5) * 2 * noise;
            return Math.max(-1, Math.min(1, noised)); // Clip to [-1, 1]
        });
        
        return {
            action: noisyAction,
            filteredState: filteredState,
            rawAction: action
        };
    },
    
    /**
     * Convert normalized action to actual parameter deltas
     */
    actionToDeltas: function(action, limits = {}) {
        const {
            maxSpeedDelta = 50,    // RPM
            maxFeedDelta = 0.05,   // mm/rev
            maxDocDelta = 0.5      // mm
        } = limits;
        
        return {
            deltaSpeed: action[0] * maxSpeedDelta,
            deltaFeed: action[1] * maxFeedDelta,
            deltaDoc: action[2] * maxDocDelta
        };
    },
    
    /**
     * Update controller with new experience
     */
    update: function(controller, state, action, reward, nextState, done) {
        // Store experience
        controller.replayBuffer.push({ state, action, reward, nextState, done });
        if (controller.replayBuffer.length > controller.maxBufferSize) {
            controller.replayBuffer.shift();
        }
        
        controller.episodeReward += reward;
        controller.totalSteps++;
        
        // Train if enough samples
        if (controller.replayBuffer.length >= 64) {
            this._trainStep(controller);
        }
        
        return {
            episodeReward: controller.episodeReward,
            totalSteps: controller.totalSteps,
            bufferSize: controller.replayBuffer.length
        };
    },
    
    /**
     * Calculate reward based on machining outcomes
     */
    calculateReward: function(state, outcome) {
        const {
            surfaceFinish,      // Ra achieved
            targetFinish,       // Ra target
            toolWear,           // Current wear level
            vibrationLevel,     // Current vibration
            cycleTime,          // Time for operation
            targetCycleTime,    // Target time
            chatterOccurred     // Boolean
        } = outcome;
        
        let reward = 0;
        
        // Surface finish reward (higher is better if within spec)
        if (surfaceFinish <= targetFinish) {
            reward += 10 * (1 - surfaceFinish / targetFinish);
        } else {
            reward -= 20 * (surfaceFinish / targetFinish - 1);
        }
        
        // Cycle time reward
        if (cycleTime <= targetCycleTime) {
            reward += 5 * (1 - cycleTime / targetCycleTime);
        } else {
            reward -= 10 * (cycleTime / targetCycleTime - 1);
        }
        
        // Tool wear penalty
        reward -= toolWear * 2;
        
        // Vibration penalty
        reward -= vibrationLevel * 5;
        
        // Chatter penalty (severe)
        if (chatterOccurred) {
            reward -= 50;
        }
        
        return reward;
    },
    
    /**
     * Reset episode statistics
     */
    resetEpisode: function(controller) {
        controller.episodeReward = 0;
        // Re-initialize Kalman filter
        controller.kalman = this._initKalman(6);
    },
    
    _createNetwork: function(inputDim, hiddenDim, outputDim, outputActivation) {
        // Xavier initialization
        const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
        
        return {
            W1: Array(hiddenDim).fill(null).map(() => 
                Array(inputDim).fill(null).map(() => (Math.random() - 0.5) * 2 * xavier(inputDim, hiddenDim))
            ),
            b1: Array(hiddenDim).fill(0),
            W2: Array(hiddenDim).fill(null).map(() => 
                Array(hiddenDim).fill(null).map(() => (Math.random() - 0.5) * 2 * xavier(hiddenDim, hiddenDim))
            ),
            b2: Array(hiddenDim).fill(0),
            W3: Array(outputDim).fill(null).map(() => 
                Array(hiddenDim).fill(null).map(() => (Math.random() - 0.5) * 2 * xavier(hiddenDim, outputDim))
            ),
            b3: Array(outputDim).fill(0),
            outputActivation: outputActivation
        };
    },
    
    _forward: function(network, input) {
        // Layer 1
        let h1 = network.W1.map((row, i) => {
            const sum = row.reduce((acc, w, j) => acc + w * input[j], 0) + network.b1[i];
            return Math.max(0, sum); // ReLU
        });
        
        // Layer 2
        let h2 = network.W2.map((row, i) => {
            const sum = row.reduce((acc, w, j) => acc + w * h1[j], 0) + network.b2[i];
            return Math.max(0, sum); // ReLU
        });
        
        // Output layer
        let output = network.W3.map((row, i) => {
            return row.reduce((acc, w, j) => acc + w * h2[j], 0) + network.b3[i];
        });
        
        // Output activation
        if (network.outputActivation === 'tanh') {
            output = output.map(x => Math.tanh(x));
        }
        
        return output;
    },
    
    _initKalman: function(dim) {
        return {
            x: Array(dim).fill(0),                    // State estimate
            P: Array(dim).fill(null).map((_, i) =>    // Covariance
                Array(dim).fill(0).map((_, j) => i === j ? 1 : 0)
            ),
            Q: Array(dim).fill(null).map((_, i) =>    // Process noise
                Array(dim).fill(0).map((_, j) => i === j ? 0.01 : 0)
            ),
            R: Array(dim).fill(null).map((_, i) =>    // Measurement noise
                Array(dim).fill(0).map((_, j) => i === j ? 0.1 : 0)
            )
        };
    },
    
    _kalmanUpdate: function(kf, measurement) {
        const n = kf.x.length;
        
        // Predict (assuming constant state model)
        // x_pred = x (no dynamics model)
        // P_pred = P + Q
        const P_pred = kf.P.map((row, i) => 
            row.map((val, j) => val + kf.Q[i][j])
        );
        
        // Update
        // K = P_pred * (P_pred + R)^-1
        // For diagonal case, simplify:
        const K = P_pred.map((row, i) => 
            row.map((val, j) => i === j ? val / (val + kf.R[i][j]) : 0)
        );
        
        // x = x + K * (z - x)
        const innovation = measurement.map((z, i) => z - kf.x[i]);
        kf.x = kf.x.map((x, i) => x + K[i][i] * innovation[i]);
        
        // P = (I - K) * P_pred
        kf.P = P_pred.map((row, i) => 
            row.map((val, j) => (i === j ? 1 - K[i][i] : 0) * val)
        );
        
        return [...kf.x];
    },
    
    _trainStep: function(controller) {
        // Sample batch
        const batchSize = 32;
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
            const idx = Math.floor(Math.random() * controller.replayBuffer.length);
            batch.push(controller.replayBuffer[idx]);
        }
        
        // Compute TD targets and update (simplified)
        // In production, would use proper backprop
        
        // Soft update target networks
        this._softUpdate(controller.actor, controller.actorTarget, controller.tau);
        this._softUpdate(controller.critic, controller.criticTarget, controller.tau);
    },
    
    _softUpdate: function(source, target, tau) {
        // target = tau * source + (1 - tau) * target
        for (let i = 0; i < source.W1.length; i++) {
            for (let j = 0; j < source.W1[i].length; j++) {
                target.W1[i][j] = tau * source.W1[i][j] + (1 - tau) * target.W1[i][j];
            }
        }
        // Similar for W2, W3, biases...
    }
}