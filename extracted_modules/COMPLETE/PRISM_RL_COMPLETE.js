const PRISM_RL_COMPLETE = {
    name: 'PRISM Reinforcement Learning Complete',
    version: '1.0.0',
    source: 'Stanford CS 229, MIT 6.036, MIT 6.867',
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // Q-LEARNING: Off-Policy TD Control
    // Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
    // ─────────────────────────────────────────────────────────────────────────────────────────
    QLearning: {
        /**
         * Initialize Q-table for Q-Learning
         * @param {Array} states - List of state identifiers
         * @param {Array} actions - List of action identifiers
         * @param {number} initValue - Initial Q-value (default 0)
         * @returns {Map} Q-table as Map for efficient lookup
         */
        createAgent: function(states, actions, initValue = 0) {
            const Q = new Map();
            for (const s of states) {
                const actionValues = new Map();
                for (const a of actions) {
                    actionValues.set(a, initValue);
                }
                Q.set(s, actionValues);
            }
            return {
                Q,
                actions,
                episodeRewards: [],
                totalSteps: 0
            };
        },
        
        /**
         * Get Q-value for state-action pair
         */
        getQ: function(agent, state, action) {
            if (!agent.Q.has(state)) {
                agent.Q.set(state, new Map());
            }
            if (!agent.Q.get(state).has(action)) {
                agent.Q.get(state).set(action, 0);
            }
            return agent.Q.get(state).get(action);
        },
        
        /**
         * Set Q-value for state-action pair
         */
        setQ: function(agent, state, action, value) {
            if (!agent.Q.has(state)) {
                agent.Q.set(state, new Map());
            }
            agent.Q.get(state).set(action, value);
        },
        
        /**
         * Select action using epsilon-greedy policy
         */
        selectAction: function(agent, state, epsilon = 0.1) {
            if (Math.random() < epsilon) {
                // Explore: random action
                return agent.actions[Math.floor(Math.random() * agent.actions.length)];
            } else {
                // Exploit: best known action
                return this.getBestAction(agent, state);
            }
        },
        
        /**
         * Get best action for a state
         */
        getBestAction: function(agent, state) {
            let bestAction = agent.actions[0];
            let bestValue = this.getQ(agent, state, agent.actions[0]);
            
            for (const action of agent.actions) {
                const value = this.getQ(agent, state, action);
                if (value > bestValue) {
                    bestValue = value;
                    bestAction = action;
                }
            }
            return bestAction;
        },
        
        /**
         * Q-Learning update step (off-policy)
         * @param {Object} agent - Q-learning agent
         * @param {*} state - Current state
         * @param {*} action - Action taken
         * @param {number} reward - Reward received
         * @param {*} nextState - Next state
         * @param {boolean} done - Episode terminal flag
         * @param {number} alpha - Learning rate
         * @param {number} gamma - Discount factor
         */
        update: function(agent, state, action, reward, nextState, done, alpha = 0.1, gamma = 0.99) {
            const currentQ = this.getQ(agent, state, action);
            
            // Find max Q-value for next state (off-policy: use max, not actual next action)
            let maxNextQ = 0;
            if (!done) {
                maxNextQ = Math.max(...agent.actions.map(a => this.getQ(agent, nextState, a)));
            }
            
            // Q-learning update: Q(s,a) ← Q(s,a) + α[r + γ max_a' Q(s',a') - Q(s,a)]
            const target = reward + gamma * maxNextQ;
            const tdError = target - currentQ;
            const newQ = currentQ + alpha * tdError;
            
            this.setQ(agent, state, action, newQ);
            agent.totalSteps++;
            
            return { newQ, tdError, target };
        }