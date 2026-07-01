/**
 * PRISM_DQN_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 130
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_DQN_ENGINE = {
    name: 'PRISM_DQN_ENGINE',
    version: '1.0.0',
    source: 'DeepMind 2015, Stanford CS 234',

    init: function(stateDim, numActions, params = {}) {
        const { hiddenSize = 64, replaySize = 10000 } = params;
        return {
            qNetwork: this._initNetwork(stateDim, numActions, hiddenSize),
            targetNetwork: this._initNetwork(stateDim, numActions, hiddenSize),
            replayBuffer: [],
            replaySize,
            numActions,
            stateDim
        };
    },

    _initNetwork: function(inputSize, outputSize, hiddenSize) {
        const scale = (n) => Math.sqrt(2 / n);
        return {
            W1: Array.from({ length: inputSize }, () => 
                Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * scale(inputSize))),
            b1: Array(hiddenSize).fill(0),
            W2: Array.from({ length: hiddenSize }, () => 
                Array.from({ length: outputSize }, () => (Math.random() - 0.5) * scale(hiddenSize))),
            b2: Array(outputSize).fill(0)
        };
    },

    _forward: function(net, state) {
        // Hidden layer with ReLU
        const h = net.b1.map((b, j) => 
            Math.max(0, b + state.reduce((s, xi, i) => s + xi * net.W1[i][j], 0)));
        // Output layer (Q-values)
        return net.b2.map((b, k) => b + h.reduce((s, hj, j) => s + hj * net.W2[j][k], 0));
    },

    getQValues: function(dqn, state) {
        return this._forward(dqn.qNetwork, state);
    },

    selectAction: function(dqn, state, epsilon = 0.1) {
        if (Math.random() < epsilon) {
            return Math.floor(Math.random() * dqn.numActions);
        }
        const qValues = this.getQValues(dqn, state);
        return qValues.indexOf(Math.max(...qValues));
    },

    storeTransition: function(dqn, state, action, reward, nextState, done) {
        dqn.replayBuffer.push({ state, action, reward, nextState, done });
        if (dqn.replayBuffer.length > dqn.replaySize) {
            dqn.replayBuffer.shift();
        }
    },

    sampleBatch: function(dqn, batchSize = 32) {
        const batch = [];
        for (let i = 0; i < Math.min(batchSize, dqn.replayBuffer.length); i++) {
            const idx = Math.floor(Math.random() * dqn.replayBuffer.length);
            batch.push(dqn.replayBuffer[idx]);
        }
        return batch;
    },

    train: function(dqn, batch, params = {}) {
        const { alpha = 0.001, gamma = 0.99 } = params;

        for (const { state, action, reward, nextState, done } of batch) {
            const qValues = this._forward(dqn.qNetwork, state);
            const targetQValues = this._forward(dqn.targetNetwork, nextState);
            
            const target = done ? reward : reward + gamma * Math.max(...targetQValues);
            const tdError = target - qValues[action];

            // Simplified gradient update
            this._updateNetwork(dqn.qNetwork, state, action, tdError, alpha);
        }
    },

    _updateNetwork: function(net, state, action, tdError, alpha) {
        // Compute hidden activations
        const h = net.b1.map((b, j) => 
            Math.max(0, b + state.reduce((s, xi, i) => s + xi * net.W1[i][j], 0)));
        
        // Update output layer for selected action
        for (let j = 0; j < net.W2.length; j++) {
            net.W2[j][action] += alpha * tdError * h[j];
        }
        net.b2[action] += alpha * tdError;

        // Update hidden layer (simplified)
        for (let j = 0; j < h.length; j++) {
            if (h[j] > 0) {  // ReLU gradient
                const delta = alpha * tdError * net.W2[j][action];
                for (let i = 0; i < state.length; i++) {
                    net.W1[i][j] += delta * state[i];
                }
                net.b1[j] += delta;
            }
        }
    },

    updateTargetNetwork: function(dqn) {
        // Copy weights from Q-network to target network
        dqn.targetNetwork = JSON.parse(JSON.stringify(dqn.qNetwork));
    },

    trainEpisode: function(env, dqn, params = {}) {
        const { epsilon = 0.1, gamma = 0.99, alpha = 0.001, batchSize = 32, maxSteps = 500 } = params;
        let state = env.reset(), totalReward = 0;

        for (let t = 0; t < maxSteps; t++) {
            const action = this.selectAction(dqn, state, epsilon);
            const { nextState, reward, done } = env.step(action);
            
            this.storeTransition(dqn, state, action, reward, nextState, done);
            
            if (dqn.replayBuffer.length >= batchSize) {
                const batch = this.sampleBatch(dqn, batchSize);
                this.train(dqn, batch, { alpha, gamma });
            }

            totalReward += reward;
            state = nextState;
            if (done) break;
        }
        return { totalReward };
    }
}