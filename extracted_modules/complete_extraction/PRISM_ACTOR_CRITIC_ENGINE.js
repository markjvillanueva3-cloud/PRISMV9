const PRISM_ACTOR_CRITIC_ENGINE = {
    name: 'PRISM_ACTOR_CRITIC_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.867, Stanford CS 234',

    init: function(stateDim, numActions, hiddenSize = 32) {
        return {
            // Actor network weights (policy)
            actor: {
                W1: this._initMatrix(stateDim, hiddenSize),
                b1: Array(hiddenSize).fill(0),
                W2: this._initMatrix(hiddenSize, numActions),
                b2: Array(numActions).fill(0)
            },
            // Critic network weights (value function)
            critic: {
                W1: this._initMatrix(stateDim, hiddenSize),
                b1: Array(hiddenSize).fill(0),
                W2: this._initMatrix(hiddenSize, 1),
                b2: [0]
            }
        };
    },

    _initMatrix: function(rows, cols) {
        const scale = Math.sqrt(2 / rows);
        return Array.from({ length: rows }, () => 
            Array.from({ length: cols }, () => (Math.random() - 0.5) * scale));
    },

    _relu: function(x) { return Math.max(0, x); },
    _reluDeriv: function(x) { return x > 0 ? 1 : 0; },

    _forward: function(x, W1, b1, W2, b2) {
        // Hidden layer with ReLU
        const h = b1.map((b, j) => 
            this._relu(b + x.reduce((s, xi, i) => s + xi * W1[i][j], 0)));
        // Output layer
        const out = b2.map((b, k) => 
            b + h.reduce((s, hj, j) => s + hj * W2[j][k], 0));
        return { h, out };
    },

    getPolicy: function(net, state) {
        const { out } = this._forward(state, net.actor.W1, net.actor.b1, net.actor.W2, net.actor.b2);
        // Softmax
        const maxOut = Math.max(...out);
        const exps = out.map(o => Math.exp(o - maxOut));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },

    getValue: function(net, state) {
        const { out } = this._forward(state, net.critic.W1, net.critic.b1, net.critic.W2, net.critic.b2);
        return out[0];
    },

    selectAction: function(probs) {
        const r = Math.random();
        let cumulative = 0;
        for (let i = 0; i < probs.length; i++) {
            cumulative += probs[i];
            if (r < cumulative) return i;
        }
        return probs.length - 1;
    },

    update: function(net, state, action, reward, nextState, done, params = {}) {
        const { alphaActor = 0.001, alphaCritic = 0.01, gamma = 0.99 } = params;

        const V = this.getValue(net, state);
        const V_next = done ? 0 : this.getValue(net, nextState);
        const td_target = reward + gamma * V_next;
        const advantage = td_target - V;

        // Critic update: minimize TD error
        const criticGrad = this._criticGradient(net.critic, state, advantage);
        this._applyGradient(net.critic, criticGrad, alphaCritic);

        // Actor update: maximize advantage * log π(a|s)
        const actorGrad = this._actorGradient(net.actor, state, action, advantage);
        this._applyGradient(net.actor, actorGrad, alphaActor);

        return { advantage, td_target, V };
    },

    _criticGradient: function(critic, state, tdError) {
        // Simplified gradient computation
        const { h } = this._forward(state, critic.W1, critic.b1, critic.W2, critic.b2);
        return {
            W2: h.map(hj => [2 * tdError * hj]),
            b2: [2 * tdError]
        };
    },

    _actorGradient: function(actor, state, action, advantage) {
        const probs = this.getPolicy({ actor }, state);
        const { h } = this._forward(state, actor.W1, actor.b1, actor.W2, actor.b2);
        
        const gradOutput = probs.map((p, a) => advantage * ((a === action ? 1 : 0) - p));
        return {
            W2: h.map(hj => gradOutput.map(g => g * hj)),
            b2: gradOutput
        };
    },

    _applyGradient: function(net, grad, alpha) {
        if (grad.W2) {
            for (let i = 0; i < net.W2.length; i++) {
                for (let j = 0; j < net.W2[i].length; j++) {
                    net.W2[i][j] += alpha * (grad.W2[i]?.[j] || 0);
                }
            }
        }
        if (grad.b2) {
            for (let i = 0; i < net.b2.length; i++) {
                net.b2[i] += alpha * (grad.b2[i] || 0);
            }
        }
    },

    train: function(env, params = {}) {
        const { episodes = 1000, alphaActor = 0.001, alphaCritic = 0.01, gamma = 0.99, maxSteps = 500 } = params;
        const net = this.init(env.getStateDim(), env.getNumActions());
        const rewards = [];

        for (let ep = 0; ep < episodes; ep++) {
            let state = env.reset(), totalReward = 0;

            for (let t = 0; t < maxSteps; t++) {
                const probs = this.getPolicy(net, state);
                const action = this.selectAction(probs);
                const { nextState, reward, done } = env.step(action);
                
                this.update(net, state, action, reward, nextState, done, { alphaActor, alphaCritic, gamma });
                totalReward += reward;
                state = nextState;
                if (done) break;
            }
            rewards.push(totalReward);
        }
        return { net, rewards };
    }
}