const PRISM_POLICY_ITERATION_ENGINE = {
    name: 'PRISM_POLICY_ITERATION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Sutton & Barto',

    solve: function(mdp, params = {}) {
        const { epsilon = 1e-6, maxIterations = 100, gamma = 0.99 } = params;
        const { states, actions, transitions, rewards } = mdp;

        // Initialize random policy
        const policy = {};
        for (const s of states) policy[s] = actions[0];

        let stable = false, iteration = 0;

        while (!stable && iteration < maxIterations) {
            // Policy Evaluation
            const V = this._evaluatePolicy(policy, mdp, gamma, epsilon);

            // Policy Improvement
            stable = true;
            for (const s of states) {
                const oldAction = policy[s];

                let bestAction = actions[0], bestValue = -Infinity;
                for (const a of actions) {
                    let value = rewards[s]?.[a] || rewards[s] || 0;
                    const trans = transitions[s]?.[a];
                    if (trans) {
                        for (const s_next in trans) {
                            value += gamma * trans[s_next] * V[s_next];
                        }
                    }
                    if (value > bestValue) {
                        bestValue = value;
                        bestAction = a;
                    }
                }

                policy[s] = bestAction;
                if (oldAction !== bestAction) stable = false;
            }
            iteration++;
        }

        const V = this._evaluatePolicy(policy, mdp, gamma, epsilon);
        return { V, policy, iterations: iteration, converged: stable };
    },

    _evaluatePolicy: function(policy, mdp, gamma, epsilon) {
        const { states, transitions, rewards } = mdp;
        const V = {};
        for (const s of states) V[s] = 0;

        let delta = Infinity;
        while (delta > epsilon) {
            delta = 0;
            for (const s of states) {
                const a = policy[s];
                const oldV = V[s];
                
                let value = rewards[s]?.[a] || rewards[s] || 0;
                const trans = transitions[s]?.[a];
                if (trans) {
                    for (const s_next in trans) {
                        value += gamma * trans[s_next] * V[s_next];
                    }
                }
                V[s] = value;
                delta = Math.max(delta, Math.abs(V[s] - oldV));
            }
        }
        return V;
    }
}