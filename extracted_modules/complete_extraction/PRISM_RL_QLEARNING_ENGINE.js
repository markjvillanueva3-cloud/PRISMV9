const PRISM_RL_QLEARNING_ENGINE = {
    name: 'PRISM_RL_QLEARNING_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, Watkins 1989',

    initQTable: function(states, actions) {
        const Q = {};
        for (const s of states) {
            Q[s] = {};
            for (const a of actions) Q[s][a] = 0;
        }
        return Q;
    },

    update: function(Q, s, a, r, s_next, actions, alpha = 0.1, gamma = 0.99) {
        const currentQ = Q[s]?.[a] || 0;
        // Q-learning uses max over next state actions (off-policy)
        const maxNextQ = Math.max(...actions.map(ap => Q[s_next]?.[ap] || 0));
        const target = r + gamma * maxNextQ;
        const tdError = target - currentQ;
        if (!Q[s]) Q[s] = {};
        Q[s][a] = currentQ + alpha * tdError;
        return { Q, tdError, target };
    },

    selectAction: function(Q, state, actions, epsilon = 0.1) {
        if (Math.random() < epsilon) {
            return actions[Math.floor(Math.random() * actions.length)];
        }
        return actions.reduce((best, a) => (Q[state]?.[a] || 0) > (Q[state]?.[best] || 0) ? a : best, actions[0]);
    },

    episode: function(env, Q, params = {}) {
        const { alpha = 0.1, gamma = 0.99, epsilon = 0.1, maxSteps = 1000 } = params;
        const actions = env.getActions();
        let state = env.reset(), totalReward = 0, steps = 0;

        while (steps < maxSteps) {
            const action = this.selectAction(Q, state, actions, epsilon);
            const { nextState, reward, done } = env.step(action);
            this.update(Q, state, action, reward, nextState, actions, alpha, gamma);
            totalReward += reward;
            state = nextState;
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