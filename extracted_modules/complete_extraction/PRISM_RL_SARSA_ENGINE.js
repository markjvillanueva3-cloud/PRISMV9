const PRISM_RL_SARSA_ENGINE = {
    name: 'PRISM_RL_SARSA_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, MIT 6.036',

    initQTable: function(states, actions) {
        const Q = {};
        for (const s of states) {
            Q[s] = {};
            for (const a of actions) Q[s][a] = 0;
        }
        return Q;
    },

    selectAction: function(Q, state, actions, epsilon = 0.1) {
        if (Math.random() < epsilon) {
            return actions[Math.floor(Math.random() * actions.length)];
        }
        let bestAction = actions[0], bestValue = Q[state]?.[actions[0]] || 0;
        for (const a of actions) {
            const value = Q[state]?.[a] || 0;
            if (value > bestValue) { bestValue = value; bestAction = a; }
        }
        return bestAction;
    },

    update: function(Q, s, a, r, s_next, a_next, alpha = 0.1, gamma = 0.99) {
        const currentQ = Q[s]?.[a] || 0;
        const nextQ = Q[s_next]?.[a_next] || 0;
        const target = r + gamma * nextQ;
        const tdError = target - currentQ;
        if (!Q[s]) Q[s] = {};
        Q[s][a] = currentQ + alpha * tdError;
        return { Q, tdError, target };
    },

    episode: function(env, Q, params = {}) {
        const { alpha = 0.1, gamma = 0.99, epsilon = 0.1, maxSteps = 1000 } = params;
        const actions = env.getActions();
        let state = env.reset();
        let action = this.selectAction(Q, state, actions, epsilon);
        let totalReward = 0, steps = 0;

        while (steps < maxSteps) {
            const { nextState, reward, done } = env.step(action);
            const nextAction = this.selectAction(Q, nextState, actions, epsilon);
            this.update(Q, state, action, reward, nextState, nextAction, alpha, gamma);
            totalReward += reward;
            state = nextState;
            action = nextAction;
            steps++;
            if (done) break;
        }
        return { Q, totalReward, steps };
    },

    train: function(env, params = {}) {
        const { episodes = 1000, alpha = 0.1, gamma = 0.99, epsilonStart = 1.0, epsilonEnd = 0.01, epsilonDecay = 0.995 } = params;
        const Q = this.initQTable(env.getStates(), env.getActions());
        const rewards = [];
        let epsilon = epsilonStart;

        for (let ep = 0; ep < episodes; ep++) {
            const result = this.episode(env, Q, { alpha, gamma, epsilon });
            rewards.push(result.totalReward);
            epsilon = Math.max(epsilonEnd, epsilon * epsilonDecay);
        }
        return { Q, rewards, policy: this._extractPolicy(Q, env.getActions()) };
    },

    _extractPolicy: function(Q, actions) {
        const policy = {};
        for (const s in Q) {
            policy[s] = actions.reduce((best, a) => Q[s][a] > Q[s][best] ? a : best, actions[0]);
        }
        return policy;
    }
}