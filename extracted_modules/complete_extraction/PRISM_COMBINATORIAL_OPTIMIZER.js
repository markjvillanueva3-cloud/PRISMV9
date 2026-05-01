const PRISM_COMBINATORIAL_OPTIMIZER = {
    name: 'PRISM_COMBINATORIAL_OPTIMIZER',
    version: '1.0.0',
    description: 'Combinatorial optimization: Branch & Bound, Cutting Planes, DP',
    source: 'MIT 15.083J, Wolsey',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Branch and Bound (for Integer Programming)
    // ─────────────────────────────────────────────────────────────────────────────
    
    branchAndBound: function(config) {
        const {
            objective,            // Function to minimize
            constraints,          // Array of constraint functions g(x) <= 0
            bounds,               // [[lb, ub], ...] for each variable
            integerVars,          // Indices of integer variables
            relaxationSolver,     // Function to solve LP relaxation
            maxNodes = 10000,
            tolerance = 1e-6,
            branchingRule = 'most_infeasible'
        } = config;
        
        const n = bounds.length;
        
        // Initialize best solution
        let bestSolution = null;
        let bestObjective = Infinity;
        let nodesExplored = 0;
        
        // Priority queue (ordered by bound)
        const queue = [{
            bounds: bounds.map(b => [...b]),
            lowerBound: -Infinity,
            depth: 0
        }];
        
        const history = [];
        
        while (queue.length > 0 && nodesExplored < maxNodes) {
            nodesExplored++;
            
            // Select node (best-first)
            queue.sort((a, b) => a.lowerBound - b.lowerBound);
            const node = queue.shift();
            
            // Prune if bound is worse than best
            if (node.lowerBound >= bestObjective - tolerance) {
                continue;
            }
            
            // Solve relaxation
            const relaxResult = relaxationSolver({
                objective,
                constraints,
                bounds: node.bounds
            });
            
            if (!relaxResult.feasible) {
                continue; // Infeasible node
            }
            
            // Check if solution is integer
            const x = relaxResult.x;
            const isInteger = this._checkIntegerFeasibility(x, integerVars, tolerance);
            
            if (isInteger) {
                const objVal = objective(x);
                if (objVal < bestObjective) {
                    bestSolution = [...x];
                    bestObjective = objVal;
                    
                    history.push({
                        node: nodesExplored,
                        objective: objVal,
                        type: 'integer_solution'
                    });
                }
            } else {
                // Branch on most fractional integer variable
                const branchVar = this._selectBranchingVariable(x, integerVars, branchingRule);
                
                if (branchVar >= 0) {
                    const val = x[branchVar];
                    const floorVal = Math.floor(val);
                    const ceilVal = Math.ceil(val);
                    
                    // Left child: x[i] <= floor(val)
                    const leftBounds = node.bounds.map(b => [...b]);
                    leftBounds[branchVar][1] = Math.min(leftBounds[branchVar][1], floorVal);
                    
                    if (leftBounds[branchVar][0] <= leftBounds[branchVar][1]) {
                        queue.push({
                            bounds: leftBounds,
                            lowerBound: relaxResult.objective,
                            depth: node.depth + 1
                        });
                    }
                    
                    // Right child: x[i] >= ceil(val)
                    const rightBounds = node.bounds.map(b => [...b]);
                    rightBounds[branchVar][0] = Math.max(rightBounds[branchVar][0], ceilVal);
                    
                    if (rightBounds[branchVar][0] <= rightBounds[branchVar][1]) {
                        queue.push({
                            bounds: rightBounds,
                            lowerBound: relaxResult.objective,
                            depth: node.depth + 1
                        });
                    }
                }
            }
        }
        
        return {
            x: bestSolution,
            objective: bestObjective,
            optimal: queue.length === 0 || nodesExplored < maxNodes,
            nodesExplored,
            remainingNodes: queue.length,
            history,
            method: 'Branch and Bound'
        };
    },
    
    _checkIntegerFeasibility: function(x, integerVars, tol) {
        for (const i of integerVars) {
            if (Math.abs(x[i] - Math.round(x[i])) > tol) {
                return false;
            }
        }
        return true;
    },
    
    _selectBranchingVariable: function(x, integerVars, rule) {
        let bestVar = -1;
        let bestFrac = -1;
        
        for (const i of integerVars) {
            const frac = Math.abs(x[i] - Math.round(x[i]));
            
            if (frac > 1e-6) {
                if (rule === 'most_infeasible') {
                    // Most fractional (closest to 0.5)
                    const dist = Math.abs(frac - 0.5);
                    if (bestVar < 0 || dist < Math.abs(bestFrac - 0.5)) {
                        bestVar = i;
                        bestFrac = frac;
                    }
                } else {
                    // First fractional
                    if (bestVar < 0) {
                        bestVar = i;
                        bestFrac = frac;
                    }
                }
            }
        }
        
        return bestVar;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dynamic Programming Framework
    // ─────────────────────────────────────────────────────────────────────────────
    
    dynamicProgramming: function(config) {
        const {
            stages,               // Number of stages
            stateSpace,           // Function(stage) returning possible states
            transitions,          // Function(stage, state, action) returning {nextState, cost}
            actions,              // Function(stage, state) returning possible actions
            terminalCost = () => 0,
            maximize = false
        } = config;
        
        const cmp = maximize ? (a, b) => a > b : (a, b) => a < b;
        const worst = maximize ? -Infinity : Infinity;
        
        // Value function and policy
        const V = new Map();  // V[stage][state] = optimal cost-to-go
        const policy = new Map(); // policy[stage][state] = optimal action
        
        // Initialize terminal stage
        V.set(stages, new Map());
        const terminalStates = stateSpace(stages);
        for (const state of terminalStates) {
            V.get(stages).set(JSON.stringify(state), terminalCost(state));
        }
        
        // Backward induction
        for (let t = stages - 1; t >= 0; t--) {
            V.set(t, new Map());
            policy.set(t, new Map());
            
            const states = stateSpace(t);
            
            for (const state of states) {
                const stateKey = JSON.stringify(state);
                let bestValue = worst;
                let bestAction = null;
                
                const possibleActions = actions(t, state);
                
                for (const action of possibleActions) {
                    const { nextState, cost } = transitions(t, state, action);
                    const nextStateKey = JSON.stringify(nextState);
                    
                    const futureValue = V.get(t + 1).get(nextStateKey);
                    if (futureValue === undefined) continue;
                    
                    const totalValue = cost + futureValue;
                    
                    if (cmp(totalValue, bestValue)) {
                        bestValue = totalValue;
                        bestAction = action;
                    }
                }
                
                V.get(t).set(stateKey, bestValue);
                policy.get(t).set(stateKey, bestAction);
            }
        }
        
        return {
            valueFunction: V,
            policy,
            
            // Extract optimal trajectory from initial state
            getOptimalPath: function(initialState) {
                const path = [{ stage: 0, state: initialState }];
                let state = initialState;
                let totalCost = 0;
                
                for (let t = 0; t < stages; t++) {
                    const stateKey = JSON.stringify(state);
                    const action = policy.get(t).get(stateKey);
                    
                    if (action === null || action === undefined) break;
                    
                    const { nextState, cost } = transitions(t, state, action);
                    totalCost += cost;
                    
                    path.push({
                        stage: t + 1,
                        state: nextState,
                        action,
                        cost
                    });
                    
                    state = nextState;
                }
                
                return { path, totalCost };
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Knapsack Problem (0/1 and Bounded)
    // ─────────────────────────────────────────────────────────────────────────────
    
    knapsack01: function(weights, values, capacity) {
        const n = weights.length;
        
        // DP table: dp[i][w] = max value using items 0..i-1 with capacity w
        const dp = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));
        
        for (let i = 1; i <= n; i++) {
            for (let w = 0; w <= capacity; w++) {
                dp[i][w] = dp[i - 1][w]; // Don't take item i-1
                
                if (weights[i - 1] <= w) {
                    dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
                }
            }
        }
        
        // Backtrack to find selected items
        const selected = [];
        let w = capacity;
        for (let i = n; i > 0 && w > 0; i--) {
            if (dp[i][w] !== dp[i - 1][w]) {
                selected.push(i - 1);
                w -= weights[i - 1];
            }
        }
        
        return {
            maxValue: dp[n][capacity],
            selectedItems: selected.reverse(),
            totalWeight: selected.reduce((sum, i) => sum + weights[i], 0)
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Assignment Problem (Hungarian Algorithm)
    // ─────────────────────────────────────────────────────────────────────────────
    
    hungarian: function(costMatrix) {
        const n = costMatrix.length;
        const m = costMatrix[0].length;
        const size = Math.max(n, m);
        
        // Pad to square if necessary
        const cost = Array(size).fill(null).map((_, i) =>
            Array(size).fill(0).map((_, j) =>
                i < n && j < m ? costMatrix[i][j] : 0
            )
        );
        
        // Initialize
        const u = new Array(size + 1).fill(0);
        const v = new Array(size + 1).fill(0);
        const p = new Array(size + 1).fill(0);
        const way = new Array(size + 1).fill(0);
        
        for (let i = 1; i <= size; i++) {
            p[0] = i;
            let j0 = 0;
            const minv = new Array(size + 1).fill(Infinity);
            const used = new Array(size + 1).fill(false);
            
            do {
                used[j0] = true;
                const i0 = p[j0];
                let delta = Infinity;
                let j1 = 0;
                
                for (let j = 1; j <= size; j++) {
                    if (!used[j]) {
                        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                        if (cur < minv[j]) {
                            minv[j] = cur;
                            way[j] = j0;
                        }
                        if (minv[j] < delta) {
                            delta = minv[j];
                            j1 = j;
                        }
                    }
                }
                
                for (let j = 0; j <= size; j++) {
                    if (used[j]) {
                        u[p[j]] += delta;
                        v[j] -= delta;
                    } else {
                        minv[j] -= delta;
                    }
                }
                
                j0 = j1;
            } while (p[j0] !== 0);
            
            do {
                const j1 = way[j0];
                p[j0] = p[j1];
                j0 = j1;
            } while (j0);
        }
        
        // Extract assignment
        const assignment = [];
        let totalCost = 0;
        
        for (let j = 1; j <= size; j++) {
            if (p[j] !== 0 && p[j] <= n && j <= m) {
                assignment.push({ row: p[j] - 1, col: j - 1 });
                totalCost += costMatrix[p[j] - 1][j - 1];
            }
        }
        
        return { assignment, totalCost };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.branchAndBound', 'PRISM_COMBINATORIAL_OPTIMIZER.branchAndBound');
            PRISM_GATEWAY.register('opt.dp', 'PRISM_COMBINATORIAL_OPTIMIZER.dynamicProgramming');
            PRISM_GATEWAY.register('opt.knapsack', 'PRISM_COMBINATORIAL_OPTIMIZER.knapsack01');
            PRISM_GATEWAY.register('opt.hungarian', 'PRISM_COMBINATORIAL_OPTIMIZER.hungarian');
        }
    }
}