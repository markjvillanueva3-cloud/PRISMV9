const PRISM_VALUE_ITERATION_ENGINE = {
    name: 'PRISM_VALUE_ITERATION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 221',

    solve: function(mdp, params = {}) {
        const { epsilon = 1e-6, maxIterations = 1000, gamma = 0.99 } = params;
        const { states, actions, transitions, rewards } = mdp;

        // Initialize V(s) = 0 for all states
        const V = {};
        for (const s of states) V[s] = 0;

        let iteration = 0, delta = Infinity;

        while (delta > epsilon && iteration < maxIterations) {
            delta = 0;

            for (const s of states) {
                const oldV = V[s];

                // V(s) = max_a [R(s,a) + γ Σ P(s'|s,a)V(s')]
                let maxValue = -Infinity;
                for (const a of actions) {
                    let value = rewards[s]?.[a] || rewards[s] || 0;
                    const trans = transitions[s]?.[a];
                    if (trans) {
                        for (const s_next in trans) {
                            value += gamma * trans[s_next] * V[s_next];
                        }
                    }
                    maxValue = Math.max(maxValue, value);
                }
                V[s] = maxValue === -Infinity ? 0 : maxValue;
                delta = Math.max(delta, Math.abs(V[s] - oldV));
            }
            iteration++;
        }

        // Extract policy
        const policy = this._extractPolicy(V, mdp, gamma);
        return { V, policy, iterations: iteration, converged: delta <= epsilon };
    },

    _extractPolicy: function(V, mdp, gamma) {
        const { states, actions, transitions, rewards } = mdp;
        const policy = {};

        for (const s of states) {
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
        }
        return policy;
    }
}