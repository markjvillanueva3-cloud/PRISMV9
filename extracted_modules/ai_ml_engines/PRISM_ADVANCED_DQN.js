const PRISM_ADVANCED_DQN = {
    name: 'PRISM Advanced DQN',
    version: '1.0.0',
    
    DoubleDQN: {
        createAgent: function(stateDim, actionDim, config = {}) {
            const { hiddenDim = 64, gamma = 0.99, epsilon = 1.0, epsilonMin = 0.01,
                    epsilonDecay = 0.995, learningRate = 0.001, targetUpdateFreq = 100 } = config;
            const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
            const createNetwork = () => ({
                W1: Array(stateDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(stateDim,hiddenDim))),
                b1: Array(hiddenDim).fill(0),
                W2: Array(hiddenDim).fill(0).map(() => Array(actionDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(hiddenDim,actionDim))),
                b2: Array(actionDim).fill(0)
            });
            return { onlineNetwork: createNetwork(), targetNetwork: createNetwork(), gamma, epsilon, epsilonMin, epsilonDecay, learningRate, targetUpdateFreq, stepCount: 0 };
        },
        
        forward: function(network, state) {
            const hidden = network.b1.map((b, j) => {
                let sum = b;
                for (let i = 0; i < state.length; i++) sum += state[i] * network.W1[i][j];
                return Math.max(0, sum);
            });
            const qValues = network.b2.map((b, k) => {
                let sum = b;
                for (let j = 0; j < hidden.length; j++) sum += hidden[j] * network.W2[j][k];
                return sum;
            });
            return { qValues, hidden };
        },
        
        selectAction: function(agent, state) {
            if (Math.random() < agent.epsilon) return Math.floor(Math.random() * agent.onlineNetwork.b2.length);
            const { qValues } = this.forward(agent.onlineNetwork, state);
            return qValues.indexOf(Math.max(...qValues));
        },
        
        update: function(agent, batch) {
            for (const { state, action, reward, nextState, done } of batch) {
                const { qValues: currentQ, hidden } = this.forward(agent.onlineNetwork, state);
                const { qValues: nextQOnline } = this.forward(agent.onlineNetwork, nextState);
                const bestAction = nextQOnline.indexOf(Math.max(...nextQOnline));
                const { qValues: nextQTarget } = this.forward(agent.targetNetwork, nextState);
                const targetValue = done ? reward : reward + agent.gamma * nextQTarget[bestAction];
                const tdError = targetValue - currentQ[action];
                
                for (let j = 0; j < agent.onlineNetwork.W2.length; j++) {
                    agent.onlineNetwork.W2[j][action] += agent.learningRate * tdError * hidden[j];
                }
                agent.onlineNetwork.b2[action] += agent.learningRate * tdError;
                for (let i = 0; i < agent.onlineNetwork.W1.length; i++) {
                    for (let j = 0; j < agent.onlineNetwork.W1[i].length; j++) {
                        if (hidden[j] > 0) agent.onlineNetwork.W1[i][j] += agent.learningRate * tdError * agent.onlineNetwork.W2[j][action] * state[i];
                    }
                }
            }
            agent.stepCount++;
            if (agent.stepCount % agent.targetUpdateFreq === 0) this.updateTargetNetwork(agent);
            agent.epsilon = Math.max(agent.epsilonMin, agent.epsilon * agent.epsilonDecay);
            return agent;
        },
        
        updateTargetNetwork: function(agent) {
            for (let i = 0; i < agent.onlineNetwork.W1.length; i++) {
                for (let j = 0; j < agent.onlineNetwork.W1[i].length; j++) {
                    agent.targetNetwork.W1[i][j] = agent.onlineNetwork.W1[i][j];
                }
            }
            agent.targetNetwork.b1 = [...agent.onlineNetwork.b1];
            for (let i = 0; i < agent.onlineNetwork.W2.length; i++) {
                for (let j = 0; j < agent.onlineNetwork.W2[i].length; j++) {
                    agent.targetNetwork.W2[i][j] = agent.onlineNetwork.W2[i][j];
                }
            }
            agent.targetNetwork.b2 = [...agent.onlineNetwork.b2];
        },
        
        softUpdateTarget: function(agent, tau = 0.005) {
            for (let i = 0; i < agent.onlineNetwork.W1.length; i++) {
                for (let j = 0; j < agent.onlineNetwork.W1[i].length; j++) {
                    agent.targetNetwork.W1[i][j] = tau * agent.onlineNetwork.W1[i][j] + (1-tau) * agent.targetNetwork.W1[i][j];
                }
            }
        }
    },
    
    DuelingDQN: {
        createNetwork: function(stateDim, actionDim, hiddenDim = 64) {
            const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
            return {
                W_shared: Array(stateDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(stateDim,hiddenDim))),
                b_shared: Array(hiddenDim).fill(0),
                W_value: Array(hiddenDim).fill(0).map(() => [(Math.random()-0.5)*2*xavier(hiddenDim,1)]),
                b_value: [0],
                W_advantage: Array(hiddenDim).fill(0).map(() => Array(actionDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(hiddenDim,actionDim))),
                b_advantage: Array(actionDim).fill(0)
            };
        },
        
        forward: function(network, state) {
            const actionDim = network.b_advantage.length;
            const features = network.b_shared.map((b, j) => {
                let sum = b;
                for (let i = 0; i < state.length; i++) sum += state[i] * network.W_shared[i][j];
                return Math.max(0, sum);
            });
            let value = network.b_value[0];
            for (let j = 0; j < features.length; j++) value += features[j] * network.W_value[j][0];
            const advantages = network.b_advantage.map((b, a) => {
                let sum = b;
                for (let j = 0; j < features.length; j++) sum += features[j] * network.W_advantage[j][a];
                return sum;
            });
            const meanAdvantage = advantages.reduce((a, b) => a + b, 0) / actionDim;
            const qValues = advantages.map(a => value + (a - meanAdvantage));
            return { qValues, value, advantages, features };
        }
    },
    
    PrioritizedReplay: {
        createBuffer: function(capacity = 100000, alpha = 0.6) {
            return { capacity, alpha, data: [], priorities: [], position: 0, maxPriority: 1.0 };
        },
        
        add: function(buffer, experience) {
            const priority = Math.pow(buffer.maxPriority, buffer.alpha);
            if (buffer.data.length < buffer.capacity) {
                buffer.data.push(experience);
                buffer.priorities.push(priority);
            } else {
                buffer.data[buffer.position] = experience;
                buffer.priorities[buffer.position] = priority;
            }
            buffer.position = (buffer.position + 1) % buffer.capacity;
            return buffer;
        },
        
        sample: function(buffer, batchSize, beta = 0.4) {
            if (buffer.data.length < batchSize) return null;
            const totalPriority = buffer.priorities.reduce((a, b) => a + b, 0);
            const probabilities = buffer.priorities.map(p => p / totalPriority);
            const samples = [], indices = [], weights = [];
            const segment = totalPriority / batchSize;
            
            for (let i = 0; i < batchSize; i++) {
                const target = (i + Math.random()) * segment;
                let cumSum = 0, idx = 0;
                while (cumSum < target && idx < buffer.data.length - 1) { cumSum += buffer.priorities[idx]; idx++; }
                idx = Math.max(0, idx - 1);
                samples.push(buffer.data[idx]);
                indices.push(idx);
                weights.push(Math.pow(buffer.data.length * probabilities[idx], -beta));
            }
            const maxWeight = Math.max(...weights);
            return { samples, indices, weights: weights.map(w => w / maxWeight) };
        },
        
        updatePriorities: function(buffer, indices, tdErrors, epsilon = 0.01) {
            for (let i = 0; i < indices.length; i++) {
                const priority = Math.pow(Math.abs(tdErrors[i]) + epsilon, buffer.alpha);
                buffer.priorities[indices[i]] = priority;
                buffer.maxPriority = Math.max(buffer.maxPriority, priority);
            }
            return buffer;
        }
    },
    
    NStepReturns: {
        createBuffer: function(n = 3, gamma = 0.99) { return { n, gamma, buffer: [] }; },
        
        addTransition: function(nStepBuffer, state, action, reward, nextState, done) {
            nStepBuffer.buffer.push({ state, action, reward, nextState, done });
            if (nStepBuffer.buffer.length < nStepBuffer.n && !done) return null;
            let nStepReturn = 0, discount = 1;
            for (let i = 0; i < nStepBuffer.buffer.length; i++) {
                nStepReturn += discount * nStepBuffer.buffer[i].reward;
                discount *= nStepBuffer.gamma;
                if (nStepBuffer.buffer[i].done) break;
            }
            const result = {
                state: nStepBuffer.buffer[0].state, action: nStepBuffer.buffer[0].action, nStepReturn,
                nextState: nStepBuffer.buffer[nStepBuffer.buffer.length-1].nextState,
                done: nStepBuffer.buffer[nStepBuffer.buffer.length-1].done, discountFactor: discount
            };
            nStepBuffer.buffer.shift();
            return result;
        }
    }
}