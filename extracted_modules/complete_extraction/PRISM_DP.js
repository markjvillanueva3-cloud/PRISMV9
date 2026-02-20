const PRISM_DP = {
    
    /**
     * Longest Common Subsequence
     * @param {string|Array} X - First sequence
     * @param {string|Array} Y - Second sequence
     * @returns {Object} LCS length and sequence
     */
    lcs: function(X, Y) {
        const m = X.length, n = Y.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        // Fill DP table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (X[i - 1] === Y[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        // Reconstruct LCS
        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (X[i - 1] === Y[j - 1]) {
                lcs.unshift(X[i - 1]);
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        
        return {
            length: dp[m][n],
            sequence: typeof X === 'string' ? lcs.join('') : lcs
        };
    },
    
    /**
     * 0/1 Knapsack Problem
     * @param {Array} items - [{value, weight}]
     * @param {number} capacity - Maximum weight
     * @returns {Object} Maximum value and selected items
     */
    knapsack: function(items, capacity) {
        const n = items.length;
        const dp = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));
        
        // Fill DP table
        for (let i = 1; i <= n; i++) {
            for (let w = 0; w <= capacity; w++) {
                if (items[i - 1].weight <= w) {
                    dp[i][w] = Math.max(
                        dp[i - 1][w],
                        dp[i - 1][w - items[i - 1].weight] + items[i - 1].value
                    );
                } else {
                    dp[i][w] = dp[i - 1][w];
                }
            }
        }
        
        // Find selected items
        const selected = [];
        let w = capacity;
        for (let i = n; i > 0 && w > 0; i--) {
            if (dp[i][w] !== dp[i - 1][w]) {
                selected.unshift(i - 1);
                w -= items[i - 1].weight;
            }
        }
        
        return {
            maxValue: dp[n][capacity],
            selectedIndices: selected,
            selectedItems: selected.map(i => items[i]),
            totalWeight: selected.reduce((sum, i) => sum + items[i].weight, 0)
        };
    },
    
    /**
     * Edit Distance (Levenshtein Distance)
     * @param {string} s1 - First string
     * @param {string} s2 - Second string
     * @returns {Object} Distance and operations
     */
    editDistance: function(s1, s2) {
        const m = s1.length, n = s2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        // Initialize
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        // Fill DP table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j - 1], // Replace
                        dp[i - 1][j],     // Delete
                        dp[i][j - 1]      // Insert
                    );
                }
            }
        }
        
        // Reconstruct operations
        const ops = [];
        let i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
                i--; j--;
            } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
                ops.unshift({ op: 'replace', pos: i - 1, from: s1[i - 1], to: s2[j - 1] });
                i--; j--;
            } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
                ops.unshift({ op: 'delete', pos: i - 1, char: s1[i - 1] });
                i--;
            } else {
                ops.unshift({ op: 'insert', pos: i, char: s2[j - 1] });
                j--;
            }
        }
        
        return { distance: dp[m][n], operations: ops };
    },
    
    /**
     * Value Iteration for MDP
     * @param {Object} mdp - MDP definition
     * @returns {Object} Optimal value function and policy
     */
    valueIteration: function(mdp) {
        const {
            states,           // Array of states
            actions,          // Array of actions
            transition,       // function(s, a) => [{state, prob}]
            reward,           // function(s, a) => number
            gamma = 0.99,     // Discount factor
            epsilon = 0.001,  // Convergence threshold
            maxIter = 1000
        } = mdp;
        
        // Initialize value function
        const V = {};
        for (const s of states) V[s] = 0;
        
        let iter = 0;
        let delta;
        
        do {
            delta = 0;
            const newV = {};
            
            for (const s of states) {
                let maxQ = -Infinity;
                
                for (const a of actions) {
                    let q = reward(s, a);
                    for (const { state: sp, prob } of transition(s, a)) {
                        q += gamma * prob * V[sp];
                    }
                    maxQ = Math.max(maxQ, q);
                }
                
                newV[s] = maxQ;
                delta = Math.max(delta, Math.abs(newV[s] - V[s]));
            }
            
            for (const s of states) V[s] = newV[s];
            iter++;
        } while (delta > epsilon && iter < maxIter);
        
        // Extract policy
        const policy = {};
        for (const s of states) {
            let bestA = null, maxQ = -Infinity;
            
            for (const a of actions) {
                let q = reward(s, a);
                for (const { state: sp, prob } of transition(s, a)) {
                    q += gamma * prob * V[sp];
                }
                if (q > maxQ) {
                    maxQ = q;
                    bestA = a;
                }
            }
            policy[s] = bestA;
        }
        
        return { V, policy, iterations: iter, converged: delta <= epsilon };
    },
    
    /**
     * Q-Learning (model-free RL)
     * @param {Object} params - Learning parameters
     * @returns {Object} Q-table and derived policy
     */
    qLearning: function(params) {
        const {
            states,
            actions,
            episodes = 1000,
            alpha = 0.1,      // Learning rate
            gamma = 0.99,     // Discount factor
            epsilon = 0.1,    // Exploration rate
            getNextState,     // function(s, a) => {nextState, reward, done}
            initialState      // function() => starting state
        } = params;
        
        // Initialize Q-table
        const Q = {};
        for (const s of states) {
            Q[s] = {};
            for (const a of actions) {
                Q[s][a] = 0;
            }
        }
        
        const rewards = [];
        
        for (let ep = 0; ep < episodes; ep++) {
            let s = initialState();
            let totalReward = 0;
            let steps = 0;
            const maxSteps = 1000;
            
            while (steps < maxSteps) {
                // Epsilon-greedy action selection
                let a;
                if (Math.random() < epsilon) {
                    a = actions[Math.floor(Math.random() * actions.length)];
                } else {
                    a = actions.reduce((best, act) => 
                        Q[s][act] > Q[s][best] ? act : best, actions[0]);
                }
                
                const { nextState, reward, done } = getNextState(s, a);
                
                // Q-learning update
                const maxNextQ = Math.max(...actions.map(ap => Q[nextState]?.[ap] || 0));
                Q[s][a] = Q[s][a] + alpha * (reward + gamma * maxNextQ - Q[s][a]);
                
                totalReward += reward;
                s = nextState;
                steps++;
                
                if (done) break;
            }
            
            rewards.push(totalReward);
        }
        
        // Derive policy from Q-table
        const policy = {};
        for (const s of states) {
            policy[s] = actions.reduce((best, a) => 
                Q[s][a] > Q[s][best] ? a : best, actions[0]);
        }
        
        return {
            Q,
            policy,
            averageReward: rewards.reduce((a, b) => a + b, 0) / rewards.length,
            rewardHistory: rewards
        };
    }
}