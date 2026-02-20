const PRISM_POLICY_GRADIENT_ENGINE = {
    name: 'PRISM_POLICY_GRADIENT_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, Williams 1992',

    initWeights: function(stateDim, numActions) {
        // Simple linear policy: π(a|s) = softmax(W·s + b)
        return {
            W: Array.from({ length: stateDim }, () => 
                Array.from({ length: numActions }, () => (Math.random() - 0.5) * 0.1)),
            b: Array(numActions).fill(0)
        };
    },

    softmax: function(logits) {
        const maxLogit = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - maxLogit));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },

    getActionProbs: function(weights, state) {
        const logits = weights.b.map((b, a) => 
            b + state.reduce((sum, s, i) => sum + s * weights.W[i][a], 0));
        return this.softmax(logits);
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

    gradLogPolicy: function(weights, state, action) {
        const probs = this.getActionProbs(weights, state);
        const gradW = state.map(s => 
            probs.map((p, j) => s * ((j === action ? 1 : 0) - p)));
        const gradB = probs.map((p, j) => (j === action ? 1 : 0) - p);
        return { gradW, gradB };
    },

    update: function(weights, trajectory, alpha = 0.01, gamma = 0.99) {
        const T = trajectory.length;
        const returns = new Array(T);
        
        // Compute discounted returns G_t
        returns[T - 1] = trajectory[T - 1].reward;
        for (let t = T - 2; t >= 0; t--) {
            returns[t] = trajectory[t].reward + gamma * returns[t + 1];
        }

        // Update weights: θ ← θ + α * G_t * ∇log(π(a|s,θ))
        for (let t = 0; t < T; t++) {
            const { state, action } = trajectory[t];
            const G_t = returns[t];
            const { gradW, gradB } = this.gradLogPolicy(weights, state, action);

            for (let i = 0; i < weights.W.length; i++) {
                for (let j = 0; j < weights.W[i].length; j++) {
                    weights.W[i][j] += alpha * G_t * gradW[i][j];
                }
            }
            for (let j = 0; j < weights.b.length; j++) {
                weights.b[j] += alpha * G_t * gradB[j];
            }
        }
        return weights;
    },

    episode: function(env, weights, params = {}) {
        const { maxSteps = 1000 } = params;
        let state = env.reset();
        const trajectory = [];
        let totalReward = 0;

        for (let t = 0; t < maxSteps; t++) {
            const probs = this.getActionProbs(weights, state);
            const action = this.selectAction(probs);
            const { nextState, reward, done } = env.step(action);
            
            trajectory.push({ state, action, reward });
            totalReward += reward;
            state = nextState;
            if (done) break;
        }
        return { trajectory, totalReward };
    },

    train: function(env, params = {}) {
        const { episodes = 1000, alpha = 0.01, gamma = 0.99 } = params;
        const weights = this.initWeights(env.getStateDim(), env.getNumActions());
        const rewards = [];

        for (let ep = 0; ep < episodes; ep++) {
            const { trajectory, totalReward } = this.episode(env, weights);
            this.update(weights, trajectory, alpha, gamma);
            rewards.push(totalReward);
        }
        return { weights, rewards };
    }
}