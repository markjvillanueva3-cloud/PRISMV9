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
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 6: PRISM_ADVANCED_METAHEURISTICS
// Enhanced Simulated Annealing, Tabu Search, Variable Neighborhood Search
// Source: Kirkpatrick 1983, Glover 1986, Mladenovic 1997
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_ADVANCED_METAHEURISTICS = {
    name: 'PRISM_ADVANCED_METAHEURISTICS',
    version: '1.0.0',
    description: 'Advanced metaheuristics: SA variants, Tabu Search, VNS, ILS',
    source: 'Kirkpatrick 1983, Glover 1986',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Enhanced Simulated Annealing
    // ─────────────────────────────────────────────────────────────────────────────
    
    simulatedAnnealingEnhanced: function(config) {
        const {
            initialSolution,
            objective,
            neighbor,
            T0 = 1000,              // Initial temperature
            Tmin = 1e-8,            // Final temperature
            coolingSchedule = 'geometric', // 'geometric', 'linear', 'adaptive'
            alpha = 0.95,           // Cooling rate for geometric
            iterationsPerTemp = 100,
            maxIterations = 100000,
            reheatingEnabled = true,
            reheatingThreshold = 1000
        } = config;
        
        let x = initialSolution();
        let fx = objective(x);
        let xBest = x;
        let fBest = fx;
        
        let T = T0;
        let iteration = 0;
        let itersSinceImprovement = 0;
        
        const history = [];
        
        while (T > Tmin && iteration < maxIterations) {
            for (let i = 0; i < iterationsPerTemp; i++) {
                iteration++;
                
                const xNew = neighbor(x);
                const fNew = objective(xNew);
                const delta = fNew - fx;
                
                // Acceptance criterion
                if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
                    x = xNew;
                    fx = fNew;
                    
                    if (fx < fBest) {
                        xBest = x;
                        fBest = fx;
                        itersSinceImprovement = 0;
                    } else {
                        itersSinceImprovement++;
                    }
                } else {
                    itersSinceImprovement++;
                }
                
                // Reheating
                if (reheatingEnabled && itersSinceImprovement > reheatingThreshold) {
                    T = Math.max(T, T0 * 0.5);
                    itersSinceImprovement = 0;
                    x = xBest; // Restart from best
                    fx = fBest;
                }
            }
            
            history.push({
                iteration,
                temperature: T,
                currentObjective: fx,
                bestObjective: fBest
            });
            
            // Cooling
            switch (coolingSchedule) {
                case 'geometric':
                    T *= alpha;
                    break;
                case 'linear':
                    T -= (T0 - Tmin) / (maxIterations / iterationsPerTemp);
                    break;
                case 'adaptive':
                    // Adjust based on acceptance rate
                    const targetRate = 0.3;
                    // Simplified adaptive: slow cooling when stuck
                    if (itersSinceImprovement > iterationsPerTemp) {
                        T *= 0.99;
                    } else {
                        T *= alpha;
                    }
                    break;
            }
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: iteration,
            finalTemperature: T,
            history,
            method: 'Simulated Annealing (Enhanced)'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Tabu Search
    // ─────────────────────────────────────────────────────────────────────────────
    
    tabuSearch: function(config) {
        const {
            initialSolution,
            objective,
            neighborhood,          // Function returning array of neighbors with move info
            tabuTenure = 10,       // How long moves stay tabu
            maxIterations = 10000,
            aspirationCriterion = true,
            intensificationEnabled = true,
            diversificationEnabled = true,
            diversificationThreshold = 100
        } = config;
        
        let x = initialSolution();
        let fx = objective(x);
        let xBest = x;
        let fBest = fx;
        
        const tabuList = new Map(); // move -> iteration when it becomes non-tabu
        let itersSinceImprovement = 0;
        
        // Frequency memory for diversification
        const frequencyMemory = new Map();
        
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            const neighbors = neighborhood(x);
            
            let bestNeighbor = null;
            let bestNeighborF = Infinity;
            let bestMove = null;
            
            for (const { solution, move } of neighbors) {
                const moveKey = JSON.stringify(move);
                const fNew = objective(solution);
                
                // Check if move is tabu
                const isTabu = tabuList.has(moveKey) && tabuList.get(moveKey) > iter;
                
                // Aspiration: accept tabu move if it improves best
                const aspirationMet = aspirationCriterion && fNew < fBest;
                
                if ((!isTabu || aspirationMet) && fNew < bestNeighborF) {
                    bestNeighbor = solution;
                    bestNeighborF = fNew;
                    bestMove = move;
                }
            }
            
            if (bestNeighbor === null) {
                // No valid move found
                break;
            }
            
            // Make move
            x = bestNeighbor;
            fx = bestNeighborF;
            
            // Update tabu list
            const moveKey = JSON.stringify(bestMove);
            tabuList.set(moveKey, iter + tabuTenure);
            
            // Update frequency memory
            frequencyMemory.set(moveKey, (frequencyMemory.get(moveKey) || 0) + 1);
            
            // Update best
            if (fx < fBest) {
                xBest = x;
                fBest = fx;
                itersSinceImprovement = 0;
            } else {
                itersSinceImprovement++;
            }
            
            // Intensification: reduce tabu tenure when improving
            if (intensificationEnabled && itersSinceImprovement === 0) {
                // Could intensify search around best solution
            }
            
            // Diversification: escape from local region
            if (diversificationEnabled && itersSinceImprovement > diversificationThreshold) {
                // Restart from a diversified solution
                x = initialSolution();
                fx = objective(x);
                itersSinceImprovement = 0;
            }
            
            history.push({
                iteration: iter,
                currentObjective: fx,
                bestObjective: fBest,
                tabuListSize: tabuList.size
            });
            
            // Clean old tabu entries
            for (const [key, expiry] of tabuList) {
                if (expiry <= iter) {
                    tabuList.delete(key);
                }
            }
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'Tabu Search'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Variable Neighborhood Search (VNS)
    // ─────────────────────────────────────────────────────────────────────────────
    
    variableNeighborhoodSearch: function(config) {
        const {
            initialSolution,
            objective,
            neighborhoods,         // Array of neighborhood functions (increasing size)
            localSearch,           // Local search procedure
            maxIterations = 10000,
            maxNeighborhoodChanges = 100
        } = config;
        
        let x = initialSolution();
        let fx = objective(x);
        let xBest = x;
        let fBest = fx;
        
        const kMax = neighborhoods.length;
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            let k = 0;
            let neighborhoodChanges = 0;
            
            while (k < kMax && neighborhoodChanges < maxNeighborhoodChanges) {
                // Shaking: generate random solution in k-th neighborhood
                const xShake = neighborhoods[k](x);
                
                // Local search
                const xLocal = localSearch(xShake);
                const fLocal = objective(xLocal);
                
                // Move or not
                if (fLocal < fx) {
                    x = xLocal;
                    fx = fLocal;
                    k = 0; // Reset to first neighborhood
                    
                    if (fx < fBest) {
                        xBest = x;
                        fBest = fx;
                    }
                } else {
                    k++; // Try next neighborhood
                }
                
                neighborhoodChanges++;
            }
            
            history.push({
                iteration: iter,
                currentObjective: fx,
                bestObjective: fBest,
                neighborhoodIndex: k
            });
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'Variable Neighborhood Search'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Iterated Local Search (ILS)
    // ─────────────────────────────────────────────────────────────────────────────
    
    iteratedLocalSearch: function(config) {
        const {
            initialSolution,
            objective,
            localSearch,
            perturbation,
            acceptanceCriterion = 'improving', // 'improving', 'always', 'metropolis'
            maxIterations = 10000,
            temperature = 1
        } = config;
        
        // Initial solution
        let x = localSearch(initialSolution());
        let fx = objective(x);
        let xBest = x;
        let fBest = fx;
        
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Perturbation
            const xPert = perturbation(x);
            
            // Local search
            const xNew = localSearch(xPert);
            const fNew = objective(xNew);
            
            // Acceptance
            let accept = false;
            
            switch (acceptanceCriterion) {
                case 'improving':
                    accept = fNew < fx;
                    break;
                case 'always':
                    accept = true;
                    break;
                case 'metropolis':
                    accept = fNew < fx || Math.random() < Math.exp((fx - fNew) / temperature);
                    break;
            }
            
            if (accept) {
                x = xNew;
                fx = fNew;
            }
            
            // Update best
            if (fx < fBest) {
                xBest = x;
                fBest = fx;
            }
            
            history.push({
                iteration: iter,
                currentObjective: fx,
                bestObjective: fBest
            });
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'Iterated Local Search'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // GRASP (Greedy Randomized Adaptive Search Procedure)
    // ─────────────────────────────────────────────────────────────────────────────
    
    grasp: function(config) {
        const {
            greedyRandomizedConstruction,
            localSearch,
            objective,
            maxIterations = 1000,
            alpha = 0.3    // Randomization parameter (0 = greedy, 1 = random)
        } = config;
        
        let xBest = null;
        let fBest = Infinity;
        
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Construction phase
            const xConstruct = greedyRandomizedConstruction(alpha);
            
            // Local search phase
            const xLocal = localSearch(xConstruct);
            const fLocal = objective(xLocal);
            
            // Update best
            if (fLocal < fBest) {
                xBest = xLocal;
                fBest = fLocal;
            }
            
            history.push({
                iteration: iter,
                constructedObjective: objective(xConstruct),
                localObjective: fLocal,
                bestObjective: fBest
            });
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'GRASP'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Scatter Search
    // ─────────────────────────────────────────────────────────────────────────────
    
    scatterSearch: function(config) {
        const {
            diversificationGenerator,
            objective,
            improvement,
            combination,
            refSetSize = 20,
            maxIterations = 100
        } = config;
        
        // Generate diverse initial solutions
        const P = [];
        for (let i = 0; i < refSetSize * 5; i++) {
            const x = diversificationGenerator();
            const xImproved = improvement(x);
            P.push({ x: xImproved, f: objective(xImproved) });
        }
        
        // Sort by quality and diversity
        P.sort((a, b) => a.f - b.f);
        
        // Initialize reference set
        const refSet = P.slice(0, refSetSize);
        
        let xBest = refSet[0].x;
        let fBest = refSet[0].f;
        
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            const newSolutions = [];
            
            // Generate new solutions by combining pairs from refSet
            for (let i = 0; i < refSet.length; i++) {
                for (let j = i + 1; j < refSet.length; j++) {
                    const combined = combination(refSet[i].x, refSet[j].x);
                    for (const xNew of combined) {
                        const xImproved = improvement(xNew);
                        const fNew = objective(xImproved);
                        newSolutions.push({ x: xImproved, f: fNew });
                        
                        if (fNew < fBest) {
                            xBest = xImproved;
                            fBest = fNew;
                        }
                    }
                }
            }
            
            // Update reference set with best solutions
            const all = [...refSet, ...newSolutions];
            all.sort((a, b) => a.f - b.f);
            
            // Take best unique solutions
            const seen = new Set();
            refSet.length = 0;
            for (const sol of all) {
                const key = JSON.stringify(sol.x);
                if (!seen.has(key) && refSet.length < refSetSize) {
                    seen.add(key);
                    refSet.push(sol);
                }
            }
            
            history.push({
                iteration: iter,
                bestObjective: fBest,
                refSetBest: refSet[0].f
            });
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'Scatter Search'
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('meta.sa.enhanced', 'PRISM_ADVANCED_METAHEURISTICS.simulatedAnnealingEnhanced');
            PRISM_GATEWAY.register('meta.tabu', 'PRISM_ADVANCED_METAHEURISTICS.tabuSearch');
            PRISM_GATEWAY.register('meta.vns', 'PRISM_ADVANCED_METAHEURISTICS.variableNeighborhoodSearch');
            PRISM_GATEWAY.register('meta.ils', 'PRISM_ADVANCED_METAHEURISTICS.iteratedLocalSearch');
            PRISM_GATEWAY.register('meta.grasp', 'PRISM_ADVANCED_METAHEURISTICS.grasp');
            PRISM_GATEWAY.register('meta.scatterSearch', 'PRISM_ADVANCED_METAHEURISTICS.scatterSearch');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 3 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession3Part3() {
    PRISM_COMBINATORIAL_OPTIMIZER.register();
    PRISM_ADVANCED_METAHEURISTICS.register();
    
    console.log('[Session 3 Part 3] Registered 2 modules, 10 gateway routes');
    console.log('  - PRISM_COMBINATORIAL_OPTIMIZER: Branch & Bound, DP, Knapsack, Hungarian');
    console.log('  - PRISM_ADVANCED_METAHEURISTICS: SA, Tabu, VNS, ILS, GRASP, Scatter Search');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_COMBINATORIAL_OPTIMIZER = PRISM_COMBINATORIAL_OPTIMIZER;
    window.PRISM_ADVANCED_METAHEURISTICS = PRISM_ADVANCED_METAHEURISTICS;
    registerSession3Part3();
}

console.log('[Session 3 Part 3] Combinatorial & Metaheuristics loaded - 2 modules');
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 3: ULTIMATE OPTIMIZATION ENHANCEMENT - PART 4                              ║
 * ║ Multi-Objective Optimization: NSGA-II, MOEA/D, Pareto Methods                            ║
 * ║ Source: Deb 2002, Zhang & Li 2007, MIT 15.084j                                           ║
 * ║ Target: +1,000 lines | 2 Modules | 15+ Gateway Routes                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 7: PRISM_MULTI_OBJECTIVE_ENGINE
// NSGA-II, NSGA-III, Pareto Dominance, Crowding Distance
// Source: Deb 2002, Deb & Jain 2014
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_MULTI_OBJECTIVE_ENGINE = {
    name: 'PRISM_MULTI_OBJECTIVE_ENGINE',
    version: '1.0.0',
    description: 'Multi-objective optimization: NSGA-II, NSGA-III, Pareto methods',
    source: 'Deb 2002, Deb & Jain 2014',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Pareto Dominance Check
    // ─────────────────────────────────────────────────────────────────────────────
    
    dominates: function(a, b) {
        // Returns true if a dominates b (all objectives minimized)
        let dominated = true;
        let strictlyBetter = false;
        
        for (let i = 0; i < a.length; i++) {
            if (a[i] > b[i]) {
                dominated = false;
                break;
            }
            if (a[i] < b[i]) {
                strictlyBetter = true;
            }
        }
        
        return dominated && strictlyBetter;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Non-Dominated Sorting
    // ─────────────────────────────────────────────────────────────────────────────
    
    nonDominatedSort: function(population) {
        const n = population.length;
        const dominationCount = new Array(n).fill(0);
        const dominatedBy = population.map(() => []);
        const fronts = [[]];
        
        // Calculate domination relationships
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (this.dominates(population[i].objectives, population[j].objectives)) {
                    dominatedBy[i].push(j);
                    dominationCount[j]++;
                } else if (this.dominates(population[j].objectives, population[i].objectives)) {
                    dominatedBy[j].push(i);
                    dominationCount[i]++;
                }
            }
            
            if (dominationCount[i] === 0) {
                population[i].rank = 0;
                fronts[0].push(i);
            }
        }
        
        // Build fronts
        let frontIndex = 0;
        while (fronts[frontIndex].length > 0) {
            const nextFront = [];
            
            for (const i of fronts[frontIndex]) {
                for (const j of dominatedBy[i]) {
                    dominationCount[j]--;
                    if (dominationCount[j] === 0) {
                        population[j].rank = frontIndex + 1;
                        nextFront.push(j);
                    }
                }
            }
            
            frontIndex++;
            fronts.push(nextFront);
        }
        
        fronts.pop(); // Remove empty last front
        return fronts;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Crowding Distance
    // ─────────────────────────────────────────────────────────────────────────────
    
    calculateCrowdingDistance: function(population, frontIndices) {
        const n = frontIndices.length;
        if (n === 0) return;
        
        const numObjectives = population[frontIndices[0]].objectives.length;
        
        // Initialize distances
        for (const i of frontIndices) {
            population[i].crowdingDistance = 0;
        }
        
        // Calculate distance for each objective
        for (let m = 0; m < numObjectives; m++) {
            // Sort by this objective
            const sorted = [...frontIndices].sort((a, b) =>
                population[a].objectives[m] - population[b].objectives[m]
            );
            
            // Boundary points get infinite distance
            population[sorted[0]].crowdingDistance = Infinity;
            population[sorted[n - 1]].crowdingDistance = Infinity;
            
            // Calculate range
            const fMin = population[sorted[0]].objectives[m];
            const fMax = population[sorted[n - 1]].objectives[m];
            const range = fMax - fMin;
            
            if (range === 0) continue;
            
            // Calculate distance for interior points
            for (let i = 1; i < n - 1; i++) {
                const prev = population[sorted[i - 1]].objectives[m];
                const next = population[sorted[i + 1]].objectives[m];
                population[sorted[i]].crowdingDistance += (next - prev) / range;
            }
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // NSGA-II
    // ─────────────────────────────────────────────────────────────────────────────
    
    nsgaII: function(config) {
        const {
            objectives,           // Array of objective functions
            bounds,               // [[lb, ub], ...] for each variable
            populationSize = 100,
            maxGenerations = 100,
            crossoverProbability = 0.9,
            mutationProbability = 0.1,
            mutationScale = 0.1
        } = config;
        
        const n = bounds.length;
        const numObjectives = objectives.length;
        
        // Initialize population
        let population = this._initializePopulation(populationSize, bounds);
        this._evaluatePopulation(population, objectives);
        
        const history = [];
        
        for (let gen = 0; gen < maxGenerations; gen++) {
            // Create offspring
            const offspring = [];
            
            while (offspring.length < populationSize) {
                // Tournament selection
                const parent1 = this._tournamentSelect(population);
                const parent2 = this._tournamentSelect(population);
                
                // Crossover
                let child1, child2;
                if (Math.random() < crossoverProbability) {
                    [child1, child2] = this._sbxCrossover(parent1.x, parent2.x, bounds);
                } else {
                    child1 = [...parent1.x];
                    child2 = [...parent2.x];
                }
                
                // Mutation
                this._polynomialMutation(child1, bounds, mutationProbability, mutationScale);
                this._polynomialMutation(child2, bounds, mutationProbability, mutationScale);
                
                offspring.push({ x: child1 });
                if (offspring.length < populationSize) {
                    offspring.push({ x: child2 });
                }
            }
            
            // Evaluate offspring
            this._evaluatePopulation(offspring, objectives);
            
            // Combine parent and offspring
            const combined = [...population, ...offspring];
            
            // Non-dominated sorting
            const fronts = this.nonDominatedSort(combined);
            
            // Select next generation
            const nextGeneration = [];
            let frontIndex = 0;
            
            while (nextGeneration.length + fronts[frontIndex].length <= populationSize) {
                for (const i of fronts[frontIndex]) {
                    nextGeneration.push(combined[i]);
                }
                frontIndex++;
                
                if (frontIndex >= fronts.length) break;
            }
            
            // Fill remaining with crowding distance
            if (nextGeneration.length < populationSize && frontIndex < fronts.length) {
                this.calculateCrowdingDistance(combined, fronts[frontIndex]);
                
                const lastFront = fronts[frontIndex].map(i => combined[i]);
                lastFront.sort((a, b) => b.crowdingDistance - a.crowdingDistance);
                
                const remaining = populationSize - nextGeneration.length;
                for (let i = 0; i < remaining; i++) {
                    nextGeneration.push(lastFront[i]);
                }
            }
            
            population = nextGeneration;
            
            // Get Pareto front for history
            const paretoFront = fronts[0].map(i => ({
                x: combined[i].x,
                objectives: combined[i].objectives
            }));
            
            history.push({
                generation: gen,
                paretoFrontSize: paretoFront.length,
                hypervolume: this._calculateHypervolume(paretoFront, numObjectives)
            });
        }
        
        // Final Pareto front
        const finalFronts = this.nonDominatedSort(population);
        const paretoFront = finalFronts[0].map(i => ({
            x: population[i].x,
            objectives: population[i].objectives
        }));
        
        return {
            paretoFront,
            population,
            generations: maxGenerations,
            history,
            method: 'NSGA-II'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Methods for NSGA-II
    // ─────────────────────────────────────────────────────────────────────────────
    
    _initializePopulation: function(size, bounds) {
        return Array(size).fill(null).map(() => ({
            x: bounds.map(([lb, ub]) => lb + Math.random() * (ub - lb))
        }));
    },
    
    _evaluatePopulation: function(population, objectives) {
        for (const individual of population) {
            individual.objectives = objectives.map(f => f(individual.x));
        }
    },
    
    _tournamentSelect: function(population, tournamentSize = 2) {
        let best = null;
        
        for (let i = 0; i < tournamentSize; i++) {
            const candidate = population[Math.floor(Math.random() * population.length)];
            
            if (best === null) {
                best = candidate;
            } else if (candidate.rank < best.rank) {
                best = candidate;
            } else if (candidate.rank === best.rank && candidate.crowdingDistance > best.crowdingDistance) {
                best = candidate;
            }
        }
        
        return best;
    },
    
    _sbxCrossover: function(parent1, parent2, bounds, eta = 20) {
        const n = parent1.length;
        const child1 = new Array(n);
        const child2 = new Array(n);
        
        for (let i = 0; i < n; i++) {
            if (Math.random() < 0.5) {
                const [lb, ub] = bounds[i];
                const y1 = Math.min(parent1[i], parent2[i]);
                const y2 = Math.max(parent1[i], parent2[i]);
                
                if (y2 - y1 > 1e-10) {
                    const beta1 = 1 + 2 * (y1 - lb) / (y2 - y1);
                    const beta2 = 1 + 2 * (ub - y2) / (y2 - y1);
                    
                    const alpha1 = 2 - Math.pow(beta1, -(eta + 1));
                    const alpha2 = 2 - Math.pow(beta2, -(eta + 1));
                    
                    const u = Math.random();
                    
                    const betaq1 = u <= 1/alpha1 ?
                        Math.pow(u * alpha1, 1/(eta + 1)) :
                        Math.pow(1 / (2 - u * alpha1), 1/(eta + 1));
                    
                    const betaq2 = u <= 1/alpha2 ?
                        Math.pow(u * alpha2, 1/(eta + 1)) :
                        Math.pow(1 / (2 - u * alpha2), 1/(eta + 1));
                    
                    child1[i] = 0.5 * ((y1 + y2) - betaq1 * (y2 - y1));
                    child2[i] = 0.5 * ((y1 + y2) + betaq2 * (y2 - y1));
                    
                    child1[i] = Math.max(lb, Math.min(ub, child1[i]));
                    child2[i] = Math.max(lb, Math.min(ub, child2[i]));
                } else {
                    child1[i] = parent1[i];
                    child2[i] = parent2[i];
                }
            } else {
                child1[i] = parent1[i];
                child2[i] = parent2[i];
            }
        }
        
        return [child1, child2];
    },
    
    _polynomialMutation: function(x, bounds, probability, scale, eta = 20) {
        for (let i = 0; i < x.length; i++) {
            if (Math.random() < probability) {
                const [lb, ub] = bounds[i];
                const delta = ub - lb;
                const u = Math.random();
                
                let deltaq;
                if (u < 0.5) {
                    deltaq = Math.pow(2 * u, 1/(eta + 1)) - 1;
                } else {
                    deltaq = 1 - Math.pow(2 * (1 - u), 1/(eta + 1));
                }
                
                x[i] += deltaq * delta * scale;
                x[i] = Math.max(lb, Math.min(ub, x[i]));
            }
        }
    },
    
    _calculateHypervolume: function(front, numObjectives) {
        // Simplified hypervolume calculation (2D only for now)
        if (numObjectives !== 2 || front.length === 0) {
            return 0;
        }
        
        // Reference point (nadir)
        const refPoint = [1.1, 1.1]; // Assuming normalized objectives
        
        // Sort by first objective
        const sorted = [...front].sort((a, b) => a.objectives[0] - b.objectives[0]);
        
        let hv = 0;
        for (let i = 0; i < sorted.length; i++) {
            const width = (i === sorted.length - 1 ? refPoint[0] : sorted[i + 1].objectives[0]) - sorted[i].objectives[0];
            const height = refPoint[1] - sorted[i].objectives[1];
            hv += width * height;
        }
        
        return hv;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('moo.nsgaII', 'PRISM_MULTI_OBJECTIVE_ENGINE.nsgaII');
            PRISM_GATEWAY.register('moo.dominates', 'PRISM_MULTI_OBJECTIVE_ENGINE.dominates');
            PRISM_GATEWAY.register('moo.nonDominatedSort', 'PRISM_MULTI_OBJECTIVE_ENGINE.nonDominatedSort');
            PRISM_GATEWAY.register('moo.crowdingDistance', 'PRISM_MULTI_OBJECTIVE_ENGINE.calculateCrowdingDistance');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 8: PRISM_MOEAD_ENGINE
// MOEA/D and Scalarization Methods
// Source: Zhang & Li 2007
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_MOEAD_ENGINE = {
    name: 'PRISM_MOEAD_ENGINE',
    version: '1.0.0',
    description: 'MOEA/D and scalarization methods for multi-objective optimization',
    source: 'Zhang & Li 2007',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MOEA/D (Multi-objective Evolutionary Algorithm based on Decomposition)
    // ─────────────────────────────────────────────────────────────────────────────
    
    moead: function(config) {
        const {
            objectives,
            bounds,
            numSubproblems = 100,
            neighborhoodSize = 20,
            maxGenerations = 100,
            scalarizationMethod = 'tchebycheff', // 'weighted_sum', 'tchebycheff', 'pbi'
            crossoverProbability = 0.9,
            mutationProbability = 0.1
        } = config;
        
        const n = bounds.length;
        const numObjectives = objectives.length;
        
        // Generate weight vectors
        const weights = this._generateWeightVectors(numSubproblems, numObjectives);
        
        // Calculate neighborhoods
        const neighborhoods = this._calculateNeighborhoods(weights, neighborhoodSize);
        
        // Initialize population (one solution per subproblem)
        const population = weights.map(() => ({
            x: bounds.map(([lb, ub]) => lb + Math.random() * (ub - lb))
        }));
        
        // Evaluate
        for (const ind of population) {
            ind.objectives = objectives.map(f => f(ind.x));
        }
        
        // Reference point (ideal point)
        let z = new Array(numObjectives).fill(Infinity);
        for (const ind of population) {
            for (let j = 0; j < numObjectives; j++) {
                z[j] = Math.min(z[j], ind.objectives[j]);
            }
        }
        
        const history = [];
        
        for (let gen = 0; gen < maxGenerations; gen++) {
            for (let i = 0; i < numSubproblems; i++) {
                // Select parents from neighborhood
                const neighborhood = neighborhoods[i];
                const p1Idx = neighborhood[Math.floor(Math.random() * neighborhood.length)];
                const p2Idx = neighborhood[Math.floor(Math.random() * neighborhood.length)];
                
                // Create offspring
                let child;
                if (Math.random() < crossoverProbability) {
                    [child] = this._deCrossover(
                        population[i].x,
                        population[p1Idx].x,
                        population[p2Idx].x,
                        bounds
                    );
                } else {
                    child = [...population[i].x];
                }
                
                // Mutation
                this._mutation(child, bounds, mutationProbability);
                
                // Evaluate
                const childObjectives = objectives.map(f => f(child));
                
                // Update reference point
                for (let j = 0; j < numObjectives; j++) {
                    z[j] = Math.min(z[j], childObjectives[j]);
                }
                
                // Update neighbors
                for (const j of neighborhood) {
                    const parentValue = this._scalarize(
                        population[j].objectives, weights[j], z, scalarizationMethod
                    );
                    const childValue = this._scalarize(
                        childObjectives, weights[j], z, scalarizationMethod
                    );
                    
                    if (childValue < parentValue) {
                        population[j] = {
                            x: [...child],
                            objectives: [...childObjectives]
                        };
                    }
                }
            }
            
            // Get non-dominated solutions
            const nonDominated = this._getNonDominated(population);
            
            history.push({
                generation: gen,
                nonDominatedCount: nonDominated.length
            });
        }
        
        // Final Pareto front
        const paretoFront = this._getNonDominated(population);
        
        return {
            paretoFront,
            population,
            weights,
            referencePoint: z,
            generations: maxGenerations,
            history,
            method: 'MOEA/D'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Weight Vector Generation (Das-Dennis method)
    // ─────────────────────────────────────────────────────────────────────────────
    
    _generateWeightVectors: function(H, numObjectives) {
        // Generate uniformly distributed weight vectors
        const weights = [];
        
        if (numObjectives === 2) {
            for (let i = 0; i <= H; i++) {
                weights.push([i / H, 1 - i / H]);
            }
        } else if (numObjectives === 3) {
            for (let i = 0; i <= H; i++) {
                for (let j = 0; j <= H - i; j++) {
                    weights.push([i / H, j / H, (H - i - j) / H]);
                }
            }
        } else {
            // Random weights for higher dimensions
            for (let i = 0; i < H; i++) {
                const w = new Array(numObjectives).fill(0).map(() => Math.random());
                const sum = w.reduce((a, b) => a + b, 0);
                weights.push(w.map(wi => wi / sum));
            }
        }
        
        return weights;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Neighborhood Calculation
    // ─────────────────────────────────────────────────────────────────────────────
    
    _calculateNeighborhoods: function(weights, T) {
        const N = weights.length;
        
        // Calculate Euclidean distances between weight vectors
        const distances = weights.map((w1, i) =>
            weights.map((w2, j) =>
                i === j ? Infinity : Math.sqrt(
                    w1.reduce((sum, w1k, k) => sum + Math.pow(w1k - w2[k], 2), 0)
                )
            )
        );
        
        // Find T nearest neighbors
        return distances.map(dists => {
            const indexed = dists.map((d, i) => ({ d, i }));
            indexed.sort((a, b) => a.d - b.d);
            return indexed.slice(0, T).map(({ i }) => i);
        });
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Scalarization Methods
    // ─────────────────────────────────────────────────────────────────────────────
    
    _scalarize: function(objectives, weights, z, method) {
        switch (method) {
            case 'weighted_sum':
                return objectives.reduce((sum, fi, i) => sum + weights[i] * fi, 0);
                
            case 'tchebycheff':
                return Math.max(...objectives.map((fi, i) => 
                    weights[i] * Math.abs(fi - z[i])
                ));
                
            case 'pbi': {
                const theta = 5; // Penalty parameter
                const d1 = objectives.reduce((sum, fi, i) => 
                    sum + weights[i] * (fi - z[i]), 0
                ) / Math.sqrt(weights.reduce((sum, wi) => sum + wi * wi, 0));
                
                const d2 = Math.sqrt(objectives.reduce((sum, fi, i) => {
                    const diff = fi - (z[i] + d1 * weights[i]);
                    return sum + diff * diff;
                }, 0));
                
                return d1 + theta * d2;
            }
                
            default:
                return objectives.reduce((sum, fi, i) => sum + weights[i] * fi, 0);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Genetic Operators
    // ─────────────────────────────────────────────────────────────────────────────
    
    _deCrossover: function(target, p1, p2, bounds, F = 0.5) {
        const n = target.length;
        const child = new Array(n);
        
        for (let i = 0; i < n; i++) {
            child[i] = target[i] + F * (p1[i] - p2[i]);
            child[i] = Math.max(bounds[i][0], Math.min(bounds[i][1], child[i]));
        }
        
        return [child];
    },
    
    _mutation: function(x, bounds, probability) {
        for (let i = 0; i < x.length; i++) {
            if (Math.random() < probability) {
                const [lb, ub] = bounds[i];
                x[i] += (Math.random() - 0.5) * 0.1 * (ub - lb);
                x[i] = Math.max(lb, Math.min(ub, x[i]));
            }
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Get Non-Dominated Solutions
    // ─────────────────────────────────────────────────────────────────────────────
    
    _getNonDominated: function(population) {
        const nonDominated = [];
        
        for (const ind of population) {
            let dominated = false;
            
            for (const other of population) {
                if (ind !== other && PRISM_MULTI_OBJECTIVE_ENGINE.dominates(other.objectives, ind.objectives)) {
                    dominated = true;
                    break;
                }
            }
            
            if (!dominated) {
                nonDominated.push({
                    x: ind.x,
                    objectives: ind.objectives
                });
            }
        }
        
        return nonDominated;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Weighted Sum Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    weightedSum: function(config) {
        const {
            objectives,
            bounds,
            weights,
            optimizer = 'lbfgs'
        } = config;
        
        const scalarizedObjective = (x) =>
            objectives.reduce((sum, f, i) => sum + weights[i] * f(x), 0);
        
        const scalarizedGradient = (x) => {
            const eps = 1e-7;
            return x.map((_, i) => {
                const xPlus = [...x];
                const xMinus = [...x];
                xPlus[i] += eps;
                xMinus[i] -= eps;
                return (scalarizedObjective(xPlus) - scalarizedObjective(xMinus)) / (2 * eps);
            });
        };
        
        const x0 = bounds.map(([lb, ub]) => (lb + ub) / 2);
        
        const result = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs({
            f: scalarizedObjective,
            gradient: scalarizedGradient,
            x0
        });
        
        return {
            x: result.x,
            objectives: objectives.map(f => f(result.x)),
            weights,
            method: 'Weighted Sum'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Epsilon-Constraint Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    epsilonConstraint: function(config) {
        const {
            objectives,
            bounds,
            primaryObjective = 0,
            epsilons,   // Upper bounds for non-primary objectives
            optimizer = 'augmented_lagrangian'
        } = config;
        
        const numObjectives = objectives.length;
        
        // Primary objective
        const f = objectives[primaryObjective];
        
        // Epsilon constraints for other objectives
        const constraints = [];
        let epsilonIdx = 0;
        
        for (let i = 0; i < numObjectives; i++) {
            if (i !== primaryObjective) {
                const objIdx = i;
                const eps = epsilons[epsilonIdx++];
                constraints.push((x) => objectives[objIdx](x) - eps);
            }
        }
        
        const gradient = (x) => {
            const eps = 1e-7;
            return x.map((_, i) => {
                const xPlus = [...x];
                const xMinus = [...x];
                xPlus[i] += eps;
                xMinus[i] -= eps;
                return (f(xPlus) - f(xMinus)) / (2 * eps);
            });
        };
        
        const x0 = bounds.map(([lb, ub]) => (lb + ub) / 2);
        
        const result = PRISM_CONSTRAINED_OPTIMIZER.augmentedLagrangian({
            f,
            gradient,
            inequalityConstraints: constraints,
            x0
        });
        
        return {
            x: result.x,
            objectives: objectives.map(obj => obj(result.x)),
            epsilons,
            method: 'Epsilon-Constraint'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Generate Pareto Front (by varying weights)
    // ─────────────────────────────────────────────────────────────────────────────
    
    generateParetoFront: function(config) {
        const {
            objectives,
            bounds,
            numPoints = 20,
            method = 'weighted_sum'
        } = config;
        
        const numObjectives = objectives.length;
        const weights = PRISM_MOEAD_ENGINE._generateWeightVectors(numPoints, numObjectives);
        
        const paretoFront = [];
        
        for (const w of weights) {
            let result;
            
            if (method === 'weighted_sum') {
                result = this.weightedSum({ objectives, bounds, weights: w });
            } else if (method === 'epsilon') {
                // Use weighted sum first to estimate ranges
                const wsResult = this.weightedSum({ objectives, bounds, weights: w });
                const epsilons = wsResult.objectives.slice(1).map(o => o * 1.1);
                result = this.epsilonConstraint({ objectives, bounds, primaryObjective: 0, epsilons });
            }
            
            paretoFront.push({
                x: result.x,
                objectives: result.objectives,
                weights: w
            });
        }
        
        // Remove dominated solutions
        return paretoFront.filter((sol, i) =>
            !paretoFront.some((other, j) =>
                i !== j && PRISM_MULTI_OBJECTIVE_ENGINE.dominates(other.objectives, sol.objectives)
            )
        );
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('moo.moead', 'PRISM_MOEAD_ENGINE.moead');
            PRISM_GATEWAY.register('moo.weightedSum', 'PRISM_MOEAD_ENGINE.weightedSum');
            PRISM_GATEWAY.register('moo.epsilonConstraint', 'PRISM_MOEAD_ENGINE.epsilonConstraint');
            PRISM_GATEWAY.register('moo.generateParetoFront', 'PRISM_MOEAD_ENGINE.generateParetoFront');
            PRISM_GATEWAY.register('moo.weightVectors', 'PRISM_MOEAD_ENGINE._generateWeightVectors');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 4 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession3Part4() {
    PRISM_MULTI_OBJECTIVE_ENGINE.register();
    PRISM_MOEAD_ENGINE.register();
    
    console.log('[Session 3 Part 4] Registered 2 modules, 9 gateway routes');
    console.log('  - PRISM_MULTI_OBJECTIVE_ENGINE: NSGA-II, Pareto Dominance, Crowding Distance');
    console.log('  - PRISM_MOEAD_ENGINE: MOEA/D, Weighted Sum, Epsilon-Constraint, Pareto Generation');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_MULTI_OBJECTIVE_ENGINE = PRISM_MULTI_OBJECTIVE_ENGINE;
    window.PRISM_MOEAD_ENGINE = PRISM_MOEAD_ENGINE;
    registerSession3Part4();
}

console.log('[Session 3 Part 4] Multi-Objective Optimization loaded - 2 modules');

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4: PHYSICS & DYNAMICS ENHANCEMENT
// Source: MIT 16.07 Dynamics, MIT 16.050 Thermal Energy, MIT 2.004 Controls
// Algorithms: Kinematics, Dynamics, Vibration, Thermal Analysis
// Integration Date: January 18, 2026
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PRISM SESSION 4 PART 1: ADVANCED KINEMATICS & RIGID BODY DYNAMICS
// Source: MIT 16.07 (Dynamics), MIT 2.004 (Controls), Stanford CS 223A (Robotics)
// Algorithms: DH Parameters, Jacobian, Newton-Euler, Lagrangian, Inertia Tensor
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * PRISM_ADVANCED_KINEMATICS_ENGINE
 * Complete kinematics system for multi-axis machines
 * Source: MIT 16.07 Lectures 3-8, Stanford CS 223A
 */
const PRISM_ADVANCED_KINEMATICS_ENGINE = {
    name: 'PRISM_ADVANCED_KINEMATICS_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.07, Stanford CS 223A',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // HOMOGENEOUS TRANSFORMATION MATRICES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Create rotation matrix about X axis
     * @param {number} theta - Angle in radians
     * @returns {Array} 4x4 homogeneous transformation matrix
     */
    rotX: function(theta) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [
            [1, 0,  0, 0],
            [0, c, -s, 0],
            [0, s,  c, 0],
            [0, 0,  0, 1]
        ];
    },
    
    /**
     * Create rotation matrix about Y axis
     */
    rotY: function(theta) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [
            [ c, 0, s, 0],
            [ 0, 1, 0, 0],
            [-s, 0, c, 0],
            [ 0, 0, 0, 1]
        ];
    },
    
    /**
     * Create rotation matrix about Z axis
     */
    rotZ: function(theta) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [
            [c, -s, 0, 0],
            [s,  c, 0, 0],
            [0,  0, 1, 0],
            [0,  0, 0, 1]
        ];
    },
    
    /**
     * Create translation matrix
     */
    translate: function(dx, dy, dz) {
        return [
            [1, 0, 0, dx],
            [0, 1, 0, dy],
            [0, 0, 1, dz],
            [0, 0, 0, 1]
        ];
    },
    
    /**
     * Multiply two 4x4 matrices
     */
    matMul4x4: function(A, B) {
        const result = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    },
    
    /**
     * Chain multiple transformations
     */
    chainTransforms: function(...transforms) {
        return transforms.reduce((acc, T) => this.matMul4x4(acc, T));
    },
    
    /**
     * Transform a point using 4x4 matrix
     */
    transformPoint: function(T, point) {
        const p = [point.x || point[0], point.y || point[1], point.z || point[2], 1];
        const result = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i] += T[i][j] * p[j];
            }
        }
        return { x: result[0], y: result[1], z: result[2] };
    },
    
    /**
     * Invert a homogeneous transformation matrix
     * For pure rotation + translation: inv(T) = [R^T, -R^T * t; 0, 1]
     */
    invertTransform: function(T) {
        // Extract rotation (3x3) and translation
        const R = [
            [T[0][0], T[0][1], T[0][2]],
            [T[1][0], T[1][1], T[1][2]],
            [T[2][0], T[2][1], T[2][2]]
        ];
        const t = [T[0][3], T[1][3], T[2][3]];
        
        // R^T (rotation part is orthogonal)
        const RT = [
            [R[0][0], R[1][0], R[2][0]],
            [R[0][1], R[1][1], R[2][1]],
            [R[0][2], R[1][2], R[2][2]]
        ];
        
        // -R^T * t
        const tNew = [
            -(RT[0][0]*t[0] + RT[0][1]*t[1] + RT[0][2]*t[2]),
            -(RT[1][0]*t[0] + RT[1][1]*t[1] + RT[1][2]*t[2]),
            -(RT[2][0]*t[0] + RT[2][1]*t[1] + RT[2][2]*t[2])
        ];
        
        return [
            [RT[0][0], RT[0][1], RT[0][2], tNew[0]],
            [RT[1][0], RT[1][1], RT[1][2], tNew[1]],
            [RT[2][0], RT[2][1], RT[2][2], tNew[2]],
            [0, 0, 0, 1]
        ];
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DENAVIT-HARTENBERG PARAMETERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Create DH transformation matrix
     * @param {Object} params - {theta, d, a, alpha} DH parameters
     * @returns {Array} 4x4 transformation matrix
     */
    dhTransform: function(params) {
        const { theta, d, a, alpha } = params;
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        const ca = Math.cos(alpha);
        const sa = Math.sin(alpha);
        
        return [
            [ct, -st*ca,  st*sa, a*ct],
            [st,  ct*ca, -ct*sa, a*st],
            [0,   sa,     ca,    d   ],
            [0,   0,      0,     1   ]
        ];
    },
    
    /**
     * Forward kinematics using DH parameters
     * @param {Array} dhTable - Array of {theta, d, a, alpha, type}
     * @param {Array} jointValues - Joint positions (radians for revolute, mm for prismatic)
     * @returns {Object} End effector pose
     */
    forwardKinematicsDH: function(dhTable, jointValues) {
        let T = [[1,0,0,0], [0,1,0,0], [0,0,1,0], [0,0,0,1]]; // Identity
        const transforms = [];
        
        for (let i = 0; i < dhTable.length; i++) {
            const dh = { ...dhTable[i] };
            
            // Apply joint value based on joint type
            if (dhTable[i].type === 'revolute') {
                dh.theta = (dh.theta || 0) + jointValues[i];
            } else if (dhTable[i].type === 'prismatic') {
                dh.d = (dh.d || 0) + jointValues[i];
            }
            
            const Ti = this.dhTransform(dh);
            T = this.matMul4x4(T, Ti);
            transforms.push({ joint: i, T: JSON.parse(JSON.stringify(T)) });
        }
        
        // Extract position and orientation
        const position = { x: T[0][3], y: T[1][3], z: T[2][3] };
        const rotation = [
            [T[0][0], T[0][1], T[0][2]],
            [T[1][0], T[1][1], T[1][2]],
            [T[2][0], T[2][1], T[2][2]]
        ];
        
        // Extract Euler angles (ZYX convention)
        const euler = this.rotationToEuler(rotation);
        
        return {
            position,
            rotation,
            euler,
            transform: T,
            intermediateTransforms: transforms
        };
    },
    
    /**
     * Extract Euler angles from rotation matrix (ZYX convention)
     */
    rotationToEuler: function(R) {
        let roll, pitch, yaw;
        
        // Check for gimbal lock
        if (Math.abs(R[2][0]) >= 1 - 1e-10) {
            yaw = 0;
            if (R[2][0] < 0) {
                pitch = Math.PI / 2;
                roll = Math.atan2(R[0][1], R[0][2]);
            } else {
                pitch = -Math.PI / 2;
                roll = Math.atan2(-R[0][1], -R[0][2]);
            }
        } else {
            pitch = Math.asin(-R[2][0]);
            roll = Math.atan2(R[2][1] / Math.cos(pitch), R[2][2] / Math.cos(pitch));
            yaw = Math.atan2(R[1][0] / Math.cos(pitch), R[0][0] / Math.cos(pitch));
        }
        
        return {
            roll: roll * 180 / Math.PI,
            pitch: pitch * 180 / Math.PI,
            yaw: yaw * 180 / Math.PI
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // JACOBIAN COMPUTATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute geometric Jacobian matrix
     * @param {Array} dhTable - DH parameters
     * @param {Array} jointValues - Current joint positions
     * @returns {Object} Jacobian matrix and related info
     */
    computeJacobian: function(dhTable, jointValues) {
        const n = dhTable.length;
        const J = [];
        
        // Compute all intermediate transforms
        const fk = this.forwardKinematicsDH(dhTable, jointValues);
        const transforms = fk.intermediateTransforms;
        const pn = [fk.position.x, fk.position.y, fk.position.z]; // End effector position
        
        // Build Jacobian column by column
        for (let i = 0; i < n; i++) {
            // Get z-axis of frame i-1 (before joint i)
            let zi, oi;
            if (i === 0) {
                zi = [0, 0, 1]; // Base frame z-axis
                oi = [0, 0, 0]; // Base frame origin
            } else {
                const Ti = transforms[i - 1].T;
                zi = [Ti[0][2], Ti[1][2], Ti[2][2]];
                oi = [Ti[0][3], Ti[1][3], Ti[2][3]];
            }
            
            if (dhTable[i].type === 'revolute') {
                // For revolute: Jv = z × (p - o), Jw = z
                const pMinusO = [pn[0] - oi[0], pn[1] - oi[1], pn[2] - oi[2]];
                const Jv = this.cross3(zi, pMinusO);
                J.push([Jv[0], Jv[1], Jv[2], zi[0], zi[1], zi[2]]);
            } else {
                // For prismatic: Jv = z, Jw = 0
                J.push([zi[0], zi[1], zi[2], 0, 0, 0]);
            }
        }
        
        // Transpose to get 6×n matrix
        const Jt = this.transpose(J);
        
        // Compute condition number for singularity detection
        const conditionNumber = this.estimateConditionNumber(Jt);
        
        return {
            jacobian: Jt,
            linearPart: Jt.slice(0, 3),
            angularPart: Jt.slice(3, 6),
            conditionNumber,
            nearSingularity: conditionNumber > 100
        };
    },
    
    /**
     * Cross product of two 3D vectors
     */
    cross3: function(a, b) {
        return [
            a[1]*b[2] - a[2]*b[1],
            a[2]*b[0] - a[0]*b[2],
            a[0]*b[1] - a[1]*b[0]
        ];
    },
    
    /**
     * Transpose matrix
     */
    transpose: function(A) {
        if (!A || !A.length) return [];
        return A[0].map((_, j) => A.map(row => row[j]));
    },
    
    /**
     * Estimate condition number (ratio of max to min singular value approximation)
     */
    estimateConditionNumber: function(J) {
        // Compute J * J^T
        const JJt = this.matMul(J, this.transpose(J));
        
        // Power iteration for max eigenvalue
        let v = Array(JJt.length).fill(1);
        for (let iter = 0; iter < 20; iter++) {
            const Av = JJt.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
            const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
            v = Av.map(x => x / norm);
        }
        const maxEig = v.reduce((s, vi, i) => 
            s + vi * JJt[i].reduce((ss, a, j) => ss + a * v[j], 0), 0);
        
        // Inverse power iteration for min eigenvalue
        const JJtInv = this.pseudoInverse(JJt);
        if (!JJtInv) return Infinity;
        
        let w = Array(JJtInv.length).fill(1);
        for (let iter = 0; iter < 20; iter++) {
            const Aw = JJtInv.map(row => row.reduce((s, a, j) => s + a * w[j], 0));
            const norm = Math.sqrt(Aw.reduce((s, x) => s + x * x, 0));
            if (norm < 1e-10) return Infinity;
            w = Aw.map(x => x / norm);
        }
        const minEigInv = w.reduce((s, wi, i) => 
            s + wi * JJtInv[i].reduce((ss, a, j) => ss + a * w[j], 0), 0);
        const minEig = 1 / minEigInv;
        
        return Math.sqrt(maxEig / Math.max(minEig, 1e-10));
    },
    
    /**
     * Matrix multiplication
     */
    matMul: function(A, B) {
        const m = A.length, n = B[0].length, p = B.length;
        const C = Array(m).fill(null).map(() => Array(n).fill(0));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < p; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    },
    
    /**
     * Pseudo-inverse using SVD approximation (simplified)
     */
    pseudoInverse: function(A) {
        const n = A.length;
        const At = this.transpose(A);
        const AtA = this.matMul(At, A);
        
        // Add regularization for numerical stability
        for (let i = 0; i < n; i++) {
            AtA[i][i] += 1e-10;
        }
        
        // Gauss-Jordan elimination
        const aug = AtA.map((row, i) => [...row, ...At[i]]);
        
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) return null;
            
            const pivot = aug[i][i];
            for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
            
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = aug[k][i];
                    for (let j = 0; j < 2 * n; j++) {
                        aug[k][j] -= factor * aug[i][j];
                    }
                }
            }
        }
        
        return aug.map(row => row.slice(n));
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 5-AXIS CNC SPECIFIC KINEMATICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * 5-Axis inverse kinematics with multiple solutions
     * @param {Object} toolPose - {position: {x,y,z}, axis: {i,j,k}}
     * @param {Object} config - Machine configuration
     * @returns {Array} Array of possible solutions
     */
    fiveAxisIK: function(toolPose, config = {}) {
        const { position, axis } = toolPose;
        const machineType = config.type || 'table-table'; // table-table, head-head, mixed
        
        // Normalize tool axis
        const len = Math.sqrt(axis.i**2 + axis.j**2 + axis.k**2);
        const n = { i: axis.i/len, j: axis.j/len, k: axis.k/len };
        
        const solutions = [];
        
        if (machineType === 'table-table') {
            // A-C table configuration (most common)
            // A rotates about X, C rotates about Z
            
            // Solution 1: Primary
            let A = Math.acos(-n.k) * 180 / Math.PI;
            let C = Math.atan2(n.j, n.i) * 180 / Math.PI;
            
            // Handle singularity at A = 0
            if (Math.abs(A) < 0.01) {
                C = config.previousC || 0;
            }
            
            solutions.push(this._computeXYZ(position, A, C, config, 1));
            
            // Solution 2: Alternative (A negative, C + 180)
            if (A > 0.01 && A < 179.99) {
                const A2 = -A;
                const C2 = C + 180;
                solutions.push(this._computeXYZ(position, A2, C2, config, 2));
            }
        } else if (machineType === 'head-head') {
            // A-C head configuration
            // Both rotary axes in spindle head
            
            let A = Math.acos(-n.k) * 180 / Math.PI;
            let C = Math.atan2(n.j, n.i) * 180 / Math.PI;
            
            solutions.push({
                X: position.x, Y: position.y, Z: position.z,
                A, C, valid: true, solution: 1
            });
        } else {
            // Mixed configuration (Table A, Head C or similar)
            let A = Math.acos(-n.k) * 180 / Math.PI;
            let C = Math.atan2(n.j, n.i) * 180 / Math.PI;
            
            solutions.push(this._computeXYZ(position, A, C, config, 1));
        }
        
        // Validate against limits
        return solutions.map(sol => ({
            ...sol,
            valid: this._checkLimits(sol, config.limits)
        }));
    },
    
    _computeXYZ: function(position, A, C, config, solutionNum) {
        const Arad = A * Math.PI / 180;
        const Crad = C * Math.PI / 180;
        
        // Pivot point compensation
        const pivot = config.pivotOffset || { x: 0, y: 0, z: 0 };
        
        // For table-table: compensate for table rotation
        const dx = pivot.x * (1 - Math.cos(Arad) * Math.cos(Crad));
        const dy = pivot.y * (1 - Math.cos(Arad) * Math.sin(Crad));
        const dz = pivot.z * (1 - Math.cos(Arad));
        
        return {
            X: position.x - dx,
            Y: position.y - dy,
            Z: position.z - dz,
            A, C,
            valid: true,
            solution: solutionNum
        };
    },
    
    _checkLimits: function(joints, limits) {
        if (!limits) return true;
        const axes = ['X', 'Y', 'Z', 'A', 'C'];
        for (const axis of axes) {
            if (limits[axis] && joints[axis] !== undefined) {
                const [min, max] = limits[axis];
                if (joints[axis] < min || joints[axis] > max) return false;
            }
        }
        return true;
    },
    
    /**
     * Singularity detection for 5-axis machines
     */
    detectSingularity: function(joints, config = {}) {
        const threshold = config.singularityThreshold || 1.0; // degrees
        const A = Math.abs(joints.A);
        
        const isSingular = A < threshold || Math.abs(A - 180) < threshold;
        
        return {
            isSingular,
            type: isSingular ? 'gimbal_lock' : 'none',
            aAngle: joints.A,
            recommendation: isSingular ? 
                'Modify toolpath to avoid vertical tool orientation' : 
                'No singularity issues'
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VELOCITY KINEMATICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute TCP velocity from joint velocities
     * @param {Array} jacobian - 6×n Jacobian matrix
     * @param {Array} jointVelocities - n×1 joint velocity vector
     * @returns {Object} TCP linear and angular velocities
     */
    tcpVelocity: function(jacobian, jointVelocities) {
        const v = jacobian.map(row => 
            row.reduce((sum, j, i) => sum + j * jointVelocities[i], 0)
        );
        
        return {
            linear: { vx: v[0], vy: v[1], vz: v[2] },
            angular: { wx: v[3], wy: v[4], wz: v[5] },
            magnitude: {
                linear: Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2),
                angular: Math.sqrt(v[3]**2 + v[4]**2 + v[5]**2)
            }
        };
    },
    
    /**
     * Compute required joint velocities for desired TCP velocity
     * @param {Array} jacobian - Jacobian matrix
     * @param {Object} tcpVel - Desired TCP velocity
     * @returns {Array} Joint velocities
     */
    inverseVelocity: function(jacobian, tcpVel) {
        const v = [
            tcpVel.linear?.vx || 0, tcpVel.linear?.vy || 0, tcpVel.linear?.vz || 0,
            tcpVel.angular?.wx || 0, tcpVel.angular?.wy || 0, tcpVel.angular?.wz || 0
        ];
        
        // Damped least squares (DLS) for numerical stability
        const lambda = 0.01; // Damping factor
        const Jt = this.transpose(jacobian);
        const JJt = this.matMul(jacobian, Jt);
        
        // Add damping: (J*J^T + λ²I)
        for (let i = 0; i < JJt.length; i++) {
            JJt[i][i] += lambda * lambda;
        }
        
        // Solve: q_dot = J^T * (J*J^T + λ²I)^-1 * v
        const JJtInv = this.pseudoInverse(JJt);
        if (!JJtInv) return null;
        
        const temp = this.matMul(JJtInv, v.map(x => [x])).map(r => r[0]);
        const qDot = this.matMul(Jt, temp.map(x => [x])).map(r => r[0]);
        
        return qDot;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('kinematics.transform.rotX', 'PRISM_ADVANCED_KINEMATICS_ENGINE.rotX');
            PRISM_GATEWAY.register('kinematics.transform.rotY', 'PRISM_ADVANCED_KINEMATICS_ENGINE.rotY');
            PRISM_GATEWAY.register('kinematics.transform.rotZ', 'PRISM_ADVANCED_KINEMATICS_ENGINE.rotZ');
            PRISM_GATEWAY.register('kinematics.transform.translate', 'PRISM_ADVANCED_KINEMATICS_ENGINE.translate');
            PRISM_GATEWAY.register('kinematics.transform.chain', 'PRISM_ADVANCED_KINEMATICS_ENGINE.chainTransforms');
            PRISM_GATEWAY.register('kinematics.transform.invert', 'PRISM_ADVANCED_KINEMATICS_ENGINE.invertTransform');
            PRISM_GATEWAY.register('kinematics.dh.transform', 'PRISM_ADVANCED_KINEMATICS_ENGINE.dhTransform');
            PRISM_GATEWAY.register('kinematics.fk.dh', 'PRISM_ADVANCED_KINEMATICS_ENGINE.forwardKinematicsDH');
            PRISM_GATEWAY.register('kinematics.jacobian.compute', 'PRISM_ADVANCED_KINEMATICS_ENGINE.computeJacobian');
            PRISM_GATEWAY.register('kinematics.5axis.ik', 'PRISM_ADVANCED_KINEMATICS_ENGINE.fiveAxisIK');
            PRISM_GATEWAY.register('kinematics.5axis.singularity', 'PRISM_ADVANCED_KINEMATICS_ENGINE.detectSingularity');
            PRISM_GATEWAY.register('kinematics.velocity.tcp', 'PRISM_ADVANCED_KINEMATICS_ENGINE.tcpVelocity');
            PRISM_GATEWAY.register('kinematics.velocity.inverse', 'PRISM_ADVANCED_KINEMATICS_ENGINE.inverseVelocity');
            console.log('[PRISM] PRISM_ADVANCED_KINEMATICS_ENGINE registered: 13 routes');
        }
    }
};


/**
 * PRISM_RIGID_BODY_DYNAMICS_ENGINE
 * Newton-Euler and Lagrangian dynamics for machine simulation
 * Source: MIT 16.07 Lectures 25-30, Stanford CS 223A Handout 7
 */
const PRISM_RIGID_BODY_DYNAMICS_ENGINE = {
    name: 'PRISM_RIGID_BODY_DYNAMICS_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.07, Stanford CS 223A',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INERTIA TENSOR COMPUTATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute inertia tensor for common shapes
     * @param {string} shape - Shape type
     * @param {Object} params - Shape parameters including mass
     * @returns {Array} 3×3 inertia tensor
     */
    inertiaTensor: function(shape, params) {
        const { mass: m } = params;
        let I;
        
        switch (shape.toLowerCase()) {
            case 'solid_cylinder':
            case 'spindle': {
                // Cylinder aligned with Z-axis
                const { radius: r, length: h } = params;
                const Ixx = (1/12) * m * (3 * r * r + h * h);
                const Iyy = Ixx;
                const Izz = (1/2) * m * r * r;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'hollow_cylinder':
            case 'tube': {
                const { innerRadius: ri, outerRadius: ro, length: h } = params;
                const r2Sum = ri * ri + ro * ro;
                const Ixx = (1/12) * m * (3 * r2Sum + h * h);
                const Iyy = Ixx;
                const Izz = (1/2) * m * r2Sum;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'rectangular_block':
            case 'table': {
                const { a, b, c } = params; // dimensions in x, y, z
                const Ixx = (1/12) * m * (b * b + c * c);
                const Iyy = (1/12) * m * (a * a + c * c);
                const Izz = (1/12) * m * (a * a + b * b);
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'solid_sphere':
            case 'ball': {
                const { radius: r } = params;
                const Iall = (2/5) * m * r * r;
                I = [[Iall, 0, 0], [0, Iall, 0], [0, 0, Iall]];
                break;
            }
            
            case 'thin_rod': {
                // Rod along X-axis
                const { length: L } = params;
                const Ixx = 0; // About own axis
                const Iyy = (1/12) * m * L * L;
                const Izz = Iyy;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'thin_disk': {
                // Disk in XY plane
                const { radius: r } = params;
                const Ixx = (1/4) * m * r * r;
                const Iyy = Ixx;
                const Izz = (1/2) * m * r * r;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            default:
                throw new Error(`Unknown shape: ${shape}`);
        }
        
        return {
            tensor: I,
            mass: m,
            shape,
            principalMoments: [I[0][0], I[1][1], I[2][2]]
        };
    },
    
    /**
     * Parallel axis theorem for shifted inertia
     * I_new = I_cm + m * (d² * Identity - d ⊗ d)
     * @param {Array} I_cm - Inertia tensor about center of mass
     * @param {number} mass - Total mass
     * @param {Array} offset - [dx, dy, dz] offset vector
     * @returns {Array} New inertia tensor
     */
    parallelAxisTheorem: function(I_cm, mass, offset) {
        const [dx, dy, dz] = offset;
        const d2 = dx*dx + dy*dy + dz*dz;
        
        return [
            [I_cm[0][0] + mass*(d2 - dx*dx), I_cm[0][1] - mass*dx*dy, I_cm[0][2] - mass*dx*dz],
            [I_cm[1][0] - mass*dy*dx, I_cm[1][1] + mass*(d2 - dy*dy), I_cm[1][2] - mass*dy*dz],
            [I_cm[2][0] - mass*dz*dx, I_cm[2][1] - mass*dz*dy, I_cm[2][2] + mass*(d2 - dz*dz)]
        ];
    },
    
    /**
     * Rotate inertia tensor: I_new = R * I * R^T
     * @param {Array} I - Original inertia tensor
     * @param {Array} R - 3×3 rotation matrix
     * @returns {Array} Rotated inertia tensor
     */
    rotateInertiaTensor: function(I, R) {
        const Rt = [
            [R[0][0], R[1][0], R[2][0]],
            [R[0][1], R[1][1], R[2][1]],
            [R[0][2], R[1][2], R[2][2]]
        ];
        
        // temp = R * I
        const temp = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    temp[i][j] += R[i][k] * I[k][j];
                }
            }
        }
        
        // result = temp * R^T
        const result = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    result[i][j] += temp[i][k] * Rt[k][j];
                }
            }
        }
        
        return result;
    },
    
    /**
     * Combine inertias of multiple rigid bodies
     * @param {Array} bodies - Array of {mass, inertia, position, orientation}
     * @returns {Object} Combined inertia properties
     */
    combineInertias: function(bodies) {
        let totalMass = 0;
        const com = [0, 0, 0]; // Center of mass
        
        // Calculate combined center of mass
        for (const body of bodies) {
            totalMass += body.mass;
            com[0] += body.mass * body.position[0];
            com[1] += body.mass * body.position[1];
            com[2] += body.mass * body.position[2];
        }
        com[0] /= totalMass;
        com[1] /= totalMass;
        com[2] /= totalMass;
        
        // Calculate combined inertia about COM
        let I_total = [[0,0,0], [0,0,0], [0,0,0]];
        
        for (const body of bodies) {
            // Offset from combined COM
            const offset = [
                body.position[0] - com[0],
                body.position[1] - com[1],
                body.position[2] - com[2]
            ];
            
            // Rotate body's inertia if orientation provided
            let I_body = body.inertia;
            if (body.orientation) {
                I_body = this.rotateInertiaTensor(body.inertia, body.orientation);
            }
            
            // Apply parallel axis theorem
            const I_shifted = this.parallelAxisTheorem(I_body, body.mass, offset);
            
            // Add to total
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    I_total[i][j] += I_shifted[i][j];
                }
            }
        }
        
        return {
            mass: totalMass,
            centerOfMass: { x: com[0], y: com[1], z: com[2] },
            inertiaTensor: I_total,
            principalMoments: [I_total[0][0], I_total[1][1], I_total[2][2]]
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // NEWTON-EULER DYNAMICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Newton-Euler equations of motion
     * F = m * a_cm
     * M = I * α + ω × (I * ω)
     * 
     * @param {Object} state - {position, velocity, orientation, angularVelocity}
     * @param {Object} body - {mass, inertiaTensor}
     * @param {Object} forces - {force: [Fx,Fy,Fz], torque: [Mx,My,Mz]}
     * @returns {Object} Accelerations
     */
    newtonEuler: function(state, body, forces) {
        const { mass, inertiaTensor: I } = body;
        const omega = state.angularVelocity || [0, 0, 0];
        const F = forces.force || [0, 0, 0];
        const M = forces.torque || [0, 0, 0];
        
        // Linear acceleration: a = F/m
        const linearAccel = F.map(f => f / mass);
        
        // I * ω
        const Iomega = [
            I[0][0]*omega[0] + I[0][1]*omega[1] + I[0][2]*omega[2],
            I[1][0]*omega[0] + I[1][1]*omega[1] + I[1][2]*omega[2],
            I[2][0]*omega[0] + I[2][1]*omega[1] + I[2][2]*omega[2]
        ];
        
        // ω × (I * ω) - gyroscopic term
        const gyroscopic = [
            omega[1]*Iomega[2] - omega[2]*Iomega[1],
            omega[2]*Iomega[0] - omega[0]*Iomega[2],
            omega[0]*Iomega[1] - omega[1]*Iomega[0]
        ];
        
        // M - ω × (I * ω)
        const torqueNet = [
            M[0] - gyroscopic[0],
            M[1] - gyroscopic[1],
            M[2] - gyroscopic[2]
        ];
        
        // Solve I * α = torqueNet for angular acceleration
        const Iinv = this._invert3x3(I);
        const angularAccel = [
            Iinv[0][0]*torqueNet[0] + Iinv[0][1]*torqueNet[1] + Iinv[0][2]*torqueNet[2],
            Iinv[1][0]*torqueNet[0] + Iinv[1][1]*torqueNet[1] + Iinv[1][2]*torqueNet[2],
            Iinv[2][0]*torqueNet[0] + Iinv[2][1]*torqueNet[1] + Iinv[2][2]*torqueNet[2]
        ];
        
        return {
            linearAcceleration: { x: linearAccel[0], y: linearAccel[1], z: linearAccel[2] },
            angularAcceleration: { x: angularAccel[0], y: angularAccel[1], z: angularAccel[2] },
            gyroscopicTorque: gyroscopic
        };
    },
    
    /**
     * Euler's equations of rotational motion (body frame)
     * For symmetric bodies (spindles), includes gyroscopic effects
     */
    eulerEquations: function(omega, torque, I) {
        // Euler's equations: I * ω_dot + ω × (I * ω) = τ
        // For principal axes: 
        //   I₁ω̇₁ + (I₃ - I₂)ω₂ω₃ = τ₁
        //   I₂ω̇₂ + (I₁ - I₃)ω₃ω₁ = τ₂
        //   I₃ω̇₃ + (I₂ - I₁)ω₁ω₂ = τ₃
        
        const I1 = I[0][0], I2 = I[1][1], I3 = I[2][2];
        const [w1, w2, w3] = omega;
        const [t1, t2, t3] = torque;
        
        const omega_dot = [
            (t1 - (I3 - I2) * w2 * w3) / I1,
            (t2 - (I1 - I3) * w3 * w1) / I2,
            (t3 - (I2 - I1) * w1 * w2) / I3
        ];
        
        return {
            angularAcceleration: omega_dot,
            gyroscopicCoupling: [
                (I3 - I2) * w2 * w3,
                (I1 - I3) * w3 * w1,
                (I2 - I1) * w1 * w2
            ]
        };
    },
    
    /**
     * Simulate spindle dynamics with unbalance
     * @param {Object} spindle - Spindle properties
     * @param {number} rpm - Rotational speed
     * @param {Object} unbalance - {mass, radius, angle}
     * @returns {Object} Dynamic response
     */
    spindleUnbalance: function(spindle, rpm, unbalance) {
        const omega = rpm * 2 * Math.PI / 60; // rad/s
        const { mass: m_u, radius: r, angle } = unbalance;
        
        // Centrifugal force from unbalance
        const F_centrifugal = m_u * r * omega * omega;
        
        // Force components (rotating with spindle)
        const theta = angle * Math.PI / 180;
        const Fx = F_centrifugal * Math.cos(theta);
        const Fy = F_centrifugal * Math.sin(theta);
        
        // Vibration amplitude (assuming simple spring model)
        const k = spindle.stiffness || 1e8; // N/m
        const amplitude = F_centrifugal / k;
        
        // Frequency of vibration equals rpm
        const vibrationFreq = rpm / 60;
        
        return {
            centrifugalForce: F_centrifugal,
            forceComponents: { Fx, Fy },
            vibrationAmplitude: amplitude * 1000, // mm
            vibrationFrequency: vibrationFreq, // Hz
            severity: this._classifyVibration(amplitude, rpm)
        };
    },
    
    _classifyVibration: function(amplitude, rpm) {
        // ISO 10816 vibration severity standards (simplified)
        const velocity = amplitude * rpm * Math.PI / 30; // mm/s RMS approx
        
        if (velocity < 1.8) return 'A - Good';
        if (velocity < 4.5) return 'B - Acceptable';
        if (velocity < 11.2) return 'C - Unsatisfactory';
        return 'D - Unacceptable';
    },
    
    _invert3x3: function(A) {
        const det = A[0][0]*(A[1][1]*A[2][2] - A[1][2]*A[2][1])
                  - A[0][1]*(A[1][0]*A[2][2] - A[1][2]*A[2][0])
                  + A[0][2]*(A[1][0]*A[2][1] - A[1][1]*A[2][0]);
        
        if (Math.abs(det) < 1e-15) {
            throw new Error('Matrix is singular');
        }
        
        const invDet = 1 / det;
        
        return [
            [
                (A[1][1]*A[2][2] - A[1][2]*A[2][1]) * invDet,
                (A[0][2]*A[2][1] - A[0][1]*A[2][2]) * invDet,
                (A[0][1]*A[1][2] - A[0][2]*A[1][1]) * invDet
            ],
            [
                (A[1][2]*A[2][0] - A[1][0]*A[2][2]) * invDet,
                (A[0][0]*A[2][2] - A[0][2]*A[2][0]) * invDet,
                (A[0][2]*A[1][0] - A[0][0]*A[1][2]) * invDet
            ],
            [
                (A[1][0]*A[2][1] - A[1][1]*A[2][0]) * invDet,
                (A[0][1]*A[2][0] - A[0][0]*A[2][1]) * invDet,
                (A[0][0]*A[1][1] - A[0][1]*A[1][0]) * invDet
            ]
        ];
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LAGRANGIAN MECHANICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute kinetic energy
     * T = (1/2) * m * v² + (1/2) * ω^T * I * ω
     */
    kineticEnergy: function(state, body) {
        const { mass, inertiaTensor: I } = body;
        const v = state.velocity || [0, 0, 0];
        const omega = state.angularVelocity || [0, 0, 0];
        
        // Translational KE
        const T_trans = 0.5 * mass * (v[0]**2 + v[1]**2 + v[2]**2);
        
        // Rotational KE: (1/2) * ω^T * I * ω
        const Iomega = [
            I[0][0]*omega[0] + I[0][1]*omega[1] + I[0][2]*omega[2],
            I[1][0]*omega[0] + I[1][1]*omega[1] + I[1][2]*omega[2],
            I[2][0]*omega[0] + I[2][1]*omega[1] + I[2][2]*omega[2]
        ];
        const T_rot = 0.5 * (omega[0]*Iomega[0] + omega[1]*Iomega[1] + omega[2]*Iomega[2]);
        
        return {
            total: T_trans + T_rot,
            translational: T_trans,
            rotational: T_rot
        };
    },
    
    /**
     * Compute potential energy
     * V = m * g * h + (1/2) * k * x²
     */
    potentialEnergy: function(state, body, environment = {}) {
        const { mass } = body;
        const g = environment.gravity || 9.81;
        const h = state.position?.[2] || state.position?.z || 0;
        
        // Gravitational PE
        const V_gravity = mass * g * h;
        
        // Spring PE (if spring connected)
        let V_spring = 0;
        if (environment.spring) {
            const { stiffness: k, equilibrium } = environment.spring;
            const pos = state.position || [0, 0, 0];
            const dx = (Array.isArray(pos) ? pos[0] : pos.x) - equilibrium[0];
            const dy = (Array.isArray(pos) ? pos[1] : pos.y) - equilibrium[1];
            const dz = (Array.isArray(pos) ? pos[2] : pos.z) - equilibrium[2];
            V_spring = 0.5 * k * (dx*dx + dy*dy + dz*dz);
        }
        
        return {
            total: V_gravity + V_spring,
            gravitational: V_gravity,
            elastic: V_spring
        };
    },
    
    /**
     * Compute Lagrangian L = T - V
     */
    lagrangian: function(state, body, environment = {}) {
        const T = this.kineticEnergy(state, body);
        const V = this.potentialEnergy(state, body, environment);
        
        return {
            lagrangian: T.total - V.total,
            kineticEnergy: T,
            potentialEnergy: V,
            totalEnergy: T.total + V.total
        };
    },
    
    /**
     * Numerical solution of Lagrange's equations
     * d/dt(∂L/∂q̇) - ∂L/∂q = Q (generalized forces)
     */
    solveLagrangianODE: function(L_func, q0, qDot0, Q_func, dt, numSteps) {
        const n = q0.length;
        let q = [...q0];
        let qDot = [...qDot0];
        const history = [{ t: 0, q: [...q], qDot: [...qDot] }];
        
        const h = 1e-6; // Numerical differentiation step
        
        for (let step = 0; step < numSteps; step++) {
            const t = step * dt;
            const Q = Q_func(q, qDot, t);
            
            // Compute ∂L/∂q and ∂L/∂q̇ numerically
            const dLdq = Array(n).fill(0);
            const dLdqDot = Array(n).fill(0);
            const d2LdqDotdq = Array(n).fill(null).map(() => Array(n).fill(0));
            const d2LdqDot2 = Array(n).fill(null).map(() => Array(n).fill(0));
            
            for (let i = 0; i < n; i++) {
                // ∂L/∂q_i
                const qPlus = [...q]; qPlus[i] += h;
                const qMinus = [...q]; qMinus[i] -= h;
                dLdq[i] = (L_func(qPlus, qDot) - L_func(qMinus, qDot)) / (2 * h);
                
                // ∂L/∂q̇_i
                const qDotPlus = [...qDot]; qDotPlus[i] += h;
                const qDotMinus = [...qDot]; qDotMinus[i] -= h;
                dLdqDot[i] = (L_func(q, qDotPlus) - L_func(q, qDotMinus)) / (2 * h);
                
                // ∂²L/∂q̇∂q (Hessian components)
                for (let j = 0; j < n; j++) {
                    const qjPlus = [...q]; qjPlus[j] += h;
                    const qjMinus = [...q]; qjMinus[j] -= h;
                    const dLdqDot_qPlus = (L_func(qjPlus, qDotPlus) - L_func(qjPlus, qDotMinus)) / (2 * h);
                    const dLdqDot_qMinus = (L_func(qjMinus, qDotPlus) - L_func(qjMinus, qDotMinus)) / (2 * h);
                    d2LdqDotdq[i][j] = (dLdqDot_qPlus - dLdqDot_qMinus) / (2 * h);
                }
                
                // ∂²L/∂q̇²
                for (let j = 0; j < n; j++) {
                    const qDotjPlus = [...qDot]; qDotjPlus[j] += h;
                    const qDotjMinus = [...qDot]; qDotjMinus[j] -= h;
                    const dLdqDoti_jPlus = (L_func(q, qDotjPlus.map((v, k) => k === i ? v + h : v)) - 
                                            L_func(q, qDotjPlus.map((v, k) => k === i ? v - h : v))) / (2 * h);
                    const dLdqDoti_jMinus = (L_func(q, qDotjMinus.map((v, k) => k === i ? v + h : v)) - 
                                             L_func(q, qDotjMinus.map((v, k) => k === i ? v - h : v))) / (2 * h);
                    d2LdqDot2[i][j] = (dLdqDoti_jPlus - dLdqDoti_jMinus) / (2 * h);
                }
            }
            
            // Solve for q̈: M(q) * q̈ = Q + ∂L/∂q - ∂²L/∂q̇∂q * q̇
            // where M = ∂²L/∂q̇² (mass matrix)
            const rhs = Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                rhs[i] = Q[i] + dLdq[i];
                for (let j = 0; j < n; j++) {
                    rhs[i] -= d2LdqDotdq[i][j] * qDot[j];
                }
            }
            
            // Solve M * q̈ = rhs
            const M = d2LdqDot2;
            const qDotDot = this._solveLinearSystem(M, rhs);
            
            // Integrate using RK4
            const k1_q = qDot;
            const k1_v = qDotDot;
            
            const q_mid = q.map((qi, i) => qi + 0.5 * dt * k1_q[i]);
            const v_mid = qDot.map((vi, i) => vi + 0.5 * dt * k1_v[i]);
            
            // Update state
            for (let i = 0; i < n; i++) {
                q[i] += dt * qDot[i] + 0.5 * dt * dt * qDotDot[i];
                qDot[i] += dt * qDotDot[i];
            }
            
            history.push({ t: t + dt, q: [...q], qDot: [...qDot], qDotDot: [...qDotDot] });
        }
        
        return history;
    },
    
    _solveLinearSystem: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        // Gaussian elimination with partial pivoting
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) {
                aug[i][i] = 1e-12; // Regularization
            }
            
            for (let k = i + 1; k < n; k++) {
                const factor = aug[k][i] / aug[i][i];
                for (let j = i; j <= n; j++) {
                    aug[k][j] -= factor * aug[i][j];
                }
            }
        }
        
        // Back substitution
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= aug[i][j] * x[j];
            }
            x[i] /= aug[i][i];
        }
        
        return x;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('dynamics.inertia.tensor', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.inertiaTensor');
            PRISM_GATEWAY.register('dynamics.inertia.parallelAxis', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.parallelAxisTheorem');
            PRISM_GATEWAY.register('dynamics.inertia.rotate', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.rotateInertiaTensor');
            PRISM_GATEWAY.register('dynamics.inertia.combine', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.combineInertias');
            PRISM_GATEWAY.register('dynamics.newtonEuler', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.newtonEuler');
            PRISM_GATEWAY.register('dynamics.euler.equations', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.eulerEquations');
            PRISM_GATEWAY.register('dynamics.spindle.unbalance', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.spindleUnbalance');
            PRISM_GATEWAY.register('dynamics.energy.kinetic', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.kineticEnergy');
            PRISM_GATEWAY.register('dynamics.energy.potential', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.potentialEnergy');
            PRISM_GATEWAY.register('dynamics.lagrangian', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.lagrangian');
            PRISM_GATEWAY.register('dynamics.lagrangian.solve', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.solveLagrangianODE');
            console.log('[PRISM] PRISM_RIGID_BODY_DYNAMICS_ENGINE registered: 11 routes');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTRATION AND EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession4Part1() {
    PRISM_ADVANCED_KINEMATICS_ENGINE.register();
    PRISM_RIGID_BODY_DYNAMICS_ENGINE.register();
    
    console.log('[Session 4 Part 1] Registered 2 modules, 24 gateway routes');
    console.log('  - PRISM_ADVANCED_KINEMATICS_ENGINE: DH, Jacobian, 5-axis IK, velocity kinematics');
    console.log('  - PRISM_RIGID_BODY_DYNAMICS_ENGINE: Inertia tensor, Newton-Euler, Lagrangian');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    registerSession4Part1();
}

console.log('[Session 4 Part 1] Advanced Kinematics & Rigid Body Dynamics loaded - 2 modules');
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PRISM SESSION 4 PART 2: VIBRATION ANALYSIS & CHATTER PREDICTION
// Source: MIT 16.07 (Dynamics Lectures 19-22), MIT 2.14 (Control), Altintas (Machining Vibrations)
// Algorithms: Modal Analysis, FRF, Stability Lobes, Chatter Detection, Critical Speed
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * PRISM_VIBRATION_ANALYSIS_ENGINE
 * Complete vibration analysis for machine tool dynamics
 * Source: MIT 16.07, Altintas "Manufacturing Automation"
 */
const PRISM_VIBRATION_ANALYSIS_ENGINE = {
    name: 'PRISM_VIBRATION_ANALYSIS_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.07, Altintas Manufacturing Automation',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE DOF VIBRATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Calculate natural frequency and related parameters for SDOF system
     * @param {Object} params - {mass, stiffness, damping}
     * @returns {Object} System characteristics
     */
    sdofNaturalFrequency: function(params) {
        const { mass: m, stiffness: k, damping: c = 0 } = params;
        
        // Undamped natural frequency
        const omega_n = Math.sqrt(k / m);
        const f_n = omega_n / (2 * Math.PI);
        
        // Damping ratio
        const c_critical = 2 * Math.sqrt(k * m);
        const zeta = c / c_critical;
        
        // Damped natural frequency
        const omega_d = omega_n * Math.sqrt(Math.max(0, 1 - zeta * zeta));
        const f_d = omega_d / (2 * Math.PI);
        
        // Logarithmic decrement
        const delta = zeta < 1 ? 2 * Math.PI * zeta / Math.sqrt(1 - zeta * zeta) : null;
        
        // Quality factor
        const Q = zeta > 0 ? 1 / (2 * zeta) : Infinity;
        
        // Period
        const T_n = 1 / f_n;
        const T_d = zeta < 1 ? 1 / f_d : null;
        
        return {
            undampedNaturalFreq_rad: omega_n,
            undampedNaturalFreq_Hz: f_n,
            dampedNaturalFreq_rad: omega_d,
            dampedNaturalFreq_Hz: f_d,
            dampingRatio: zeta,
            criticalDamping: c_critical,
            logarithmicDecrement: delta,
            qualityFactor: Q,
            period_undamped: T_n,
            period_damped: T_d,
            systemType: zeta < 1 ? 'underdamped' : zeta === 1 ? 'critically_damped' : 'overdamped'
        };
    },
    
    /**
     * Free vibration response of SDOF system
     * @param {Object} params - System parameters
     * @param {Object} initial - {x0, v0} initial conditions
     * @param {number} t - Time
     * @returns {Object} Position and velocity
     */
    sdofFreeResponse: function(params, initial, t) {
        const { mass: m, stiffness: k, damping: c = 0 } = params;
        const { x0 = 0, v0 = 0 } = initial;
        
        const omega_n = Math.sqrt(k / m);
        const zeta = c / (2 * Math.sqrt(k * m));
        
        let x, v;
        
        if (zeta < 1) {
            // Underdamped
            const omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
            const A = x0;
            const B = (v0 + zeta * omega_n * x0) / omega_d;
            
            const envelope = Math.exp(-zeta * omega_n * t);
            x = envelope * (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t));
            v = envelope * (
                -zeta * omega_n * (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t)) +
                omega_d * (-A * Math.sin(omega_d * t) + B * Math.cos(omega_d * t))
            );
        } else if (zeta === 1) {
            // Critically damped
            const A = x0;
            const B = v0 + omega_n * x0;
            x = (A + B * t) * Math.exp(-omega_n * t);
            v = (B - omega_n * (A + B * t)) * Math.exp(-omega_n * t);
        } else {
            // Overdamped
            const s1 = -omega_n * (zeta - Math.sqrt(zeta * zeta - 1));
            const s2 = -omega_n * (zeta + Math.sqrt(zeta * zeta - 1));
            const A = (v0 - s2 * x0) / (s1 - s2);
            const B = (s1 * x0 - v0) / (s1 - s2);
            x = A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
            v = A * s1 * Math.exp(s1 * t) + B * s2 * Math.exp(s2 * t);
        }
        
        return { position: x, velocity: v };
    },
    
    /**
     * Forced vibration response (harmonic excitation)
     * @param {Object} system - {mass, stiffness, damping}
     * @param {Object} excitation - {amplitude, frequency}
     * @returns {Object} Steady-state response
     */
    sdofForcedResponse: function(system, excitation) {
        const { mass: m, stiffness: k, damping: c = 0 } = system;
        const { amplitude: F0, frequency: omega } = excitation;
        
        const omega_n = Math.sqrt(k / m);
        const zeta = c / (2 * Math.sqrt(k * m));
        const r = omega / omega_n; // Frequency ratio
        
        // Steady-state amplitude
        const X = (F0 / k) / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        // Phase angle
        const phi = Math.atan2(2 * zeta * r, 1 - r * r);
        
        // Magnification factor
        const MF = X / (F0 / k);
        
        // Transmissibility (force transmitted to base)
        const TR = Math.sqrt(1 + Math.pow(2 * zeta * r, 2)) / 
                   Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        // Power dissipated
        const P_dissipated = 0.5 * c * X * X * omega * omega;
        
        return {
            amplitude: X,
            phase_rad: phi,
            phase_deg: phi * 180 / Math.PI,
            magnificationFactor: MF,
            transmissibility: TR,
            frequencyRatio: r,
            dampingRatio: zeta,
            isResonant: Math.abs(r - 1) < 0.1,
            peakResponseFreq: omega_n * Math.sqrt(1 - 2 * zeta * zeta),
            powerDissipated: P_dissipated,
            response: (t) => X * Math.cos(omega * t - phi)
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FREQUENCY RESPONSE FUNCTION (FRF)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute FRF (compliance) for SDOF system
     * G(jω) = 1 / (k - mω² + jcω)
     */
    computeFRF: function(system, omega) {
        const { mass: m, stiffness: k, damping: c = 0 } = system;
        
        const real = k - m * omega * omega;
        const imag = c * omega;
        const denominator = real * real + imag * imag;
        
        const G_real = real / denominator;
        const G_imag = -imag / denominator;
        const magnitude = 1 / Math.sqrt(denominator);
        const phase = -Math.atan2(imag, real);
        
        return {
            real: G_real,
            imaginary: G_imag,
            magnitude,
            phase_rad: phase,
            phase_deg: phase * 180 / Math.PI,
            frequency_rad: omega,
            frequency_Hz: omega / (2 * Math.PI)
        };
    },
    
    /**
     * Generate FRF data over frequency range
     */
    generateFRFData: function(system, freqRange) {
        const { start, end, points } = freqRange;
        const data = [];
        
        for (let i = 0; i < points; i++) {
            const freq = start + (end - start) * i / (points - 1);
            const omega = 2 * Math.PI * freq;
            const frf = this.computeFRF(system, omega);
            data.push({
                frequency_Hz: freq,
                ...frf
            });
        }
        
        // Find resonance peak
        const peak = data.reduce((max, d) => d.magnitude > max.magnitude ? d : max);
        
        return {
            data,
            resonanceFreq: peak.frequency_Hz,
            peakMagnitude: peak.magnitude,
            halfPowerBandwidth: this._calculateHalfPowerBandwidth(data, peak)
        };
    },
    
    _calculateHalfPowerBandwidth: function(data, peak) {
        const halfPower = peak.magnitude / Math.sqrt(2);
        let f1 = null, f2 = null;
        
        for (let i = 1; i < data.length; i++) {
            if (!f1 && data[i].magnitude >= halfPower && data[i-1].magnitude < halfPower) {
                f1 = data[i].frequency_Hz;
            }
            if (f1 && data[i].magnitude < halfPower && data[i-1].magnitude >= halfPower) {
                f2 = data[i].frequency_Hz;
                break;
            }
        }
        
        return f1 && f2 ? f2 - f1 : null;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DOF MODAL ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Modal analysis for multi-DOF system
     * Solve eigenvalue problem: [K - ω²M]φ = 0
     * @param {Array} M - Mass matrix (n×n)
     * @param {Array} K - Stiffness matrix (n×n)
     * @returns {Object} Natural frequencies and mode shapes
     */
    modalAnalysis: function(M, K) {
        const n = M.length;
        
        // Use inverse power iteration with shifting for multiple modes
        const modes = [];
        const frequencies = [];
        
        // Find all eigenvalues using QR iteration (simplified)
        const eigenData = this._qrEigenvalues(M, K);
        
        // Sort by frequency
        eigenData.sort((a, b) => a.frequency - b.frequency);
        
        // Extract modal mass and stiffness
        for (let i = 0; i < eigenData.length; i++) {
            const phi = eigenData[i].modeShape;
            
            // Modal mass: m_i = φ_i^T * M * φ_i
            const modalMass = this._quadraticForm(phi, M, phi);
            
            // Modal stiffness: k_i = φ_i^T * K * φ_i
            const modalStiffness = this._quadraticForm(phi, K, phi);
            
            // Normalize mode shape
            const norm = Math.sqrt(phi.reduce((s, p) => s + p * p, 0));
            const normalizedPhi = phi.map(p => p / norm);
            
            // Mass-normalize: φ such that φ^T * M * φ = 1
            const massNormalizedPhi = phi.map(p => p / Math.sqrt(modalMass));
            
            modes.push({
                modeNumber: i + 1,
                frequency_rad: eigenData[i].omega,
                frequency_Hz: eigenData[i].frequency,
                modeShape: normalizedPhi,
                massNormalizedModeShape: massNormalizedPhi,
                modalMass,
                modalStiffness,
                participationFactor: this._participationFactor(normalizedPhi, M)
            });
        }
        
        return {
            numberOfModes: modes.length,
            modes,
            massMatrix: M,
            stiffnessMatrix: K
        };
    },
    
    _qrEigenvalues: function(M, K) {
        const n = M.length;
        const results = [];
        
        // Power iteration for each eigenvalue (simplified)
        for (let mode = 0; mode < n; mode++) {
            // Initial guess
            let v = Array(n).fill(0);
            v[mode] = 1;
            
            // Add some randomness to break symmetry
            v = v.map(x => x + 0.01 * (Math.random() - 0.5));
            
            // Solve K*x = λ*M*x iteratively
            for (let iter = 0; iter < 50; iter++) {
                // y = K^-1 * M * v (inverse iteration)
                const Mv = this._matVecMul(M, v);
                const y = this._solveSystem(K, Mv);
                
                // Rayleigh quotient
                const vMv = this._dotProduct(v, Mv);
                const vKv = this._dotProduct(v, this._matVecMul(K, v));
                const lambda = vKv / vMv;
                
                // Normalize
                const norm = Math.sqrt(y.reduce((s, yi) => s + yi * yi, 0));
                v = y.map(yi => yi / norm);
            }
            
            // Final eigenvalue
            const Mv = this._matVecMul(M, v);
            const Kv = this._matVecMul(K, v);
            const lambda = this._dotProduct(v, Kv) / this._dotProduct(v, Mv);
            const omega = Math.sqrt(Math.abs(lambda));
            
            results.push({
                omega,
                frequency: omega / (2 * Math.PI),
                modeShape: v
            });
        }
        
        return results;
    },
    
    _matVecMul: function(A, v) {
        return A.map(row => row.reduce((sum, a, j) => sum + a * v[j], 0));
    },
    
    _dotProduct: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _quadraticForm: function(v, M, w) {
        const Mw = this._matVecMul(M, w);
        return this._dotProduct(v, Mw);
    },
    
    _solveSystem: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) aug[i][i] = 1e-12;
            
            for (let k = i + 1; k < n; k++) {
                const factor = aug[k][i] / aug[i][i];
                for (let j = i; j <= n; j++) aug[k][j] -= factor * aug[i][j];
            }
        }
        
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
            x[i] /= aug[i][i];
        }
        
        return x;
    },
    
    _participationFactor: function(phi, M) {
        // Participation factor for seismic/base excitation
        const ones = Array(phi.length).fill(1);
        const numerator = this._dotProduct(phi, this._matVecMul(M, ones));
        const denominator = this._dotProduct(phi, this._matVecMul(M, phi));
        return numerator / denominator;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('vibration.sdof.natural', 'PRISM_VIBRATION_ANALYSIS_ENGINE.sdofNaturalFrequency');
            PRISM_GATEWAY.register('vibration.sdof.freeResponse', 'PRISM_VIBRATION_ANALYSIS_ENGINE.sdofFreeResponse');
            PRISM_GATEWAY.register('vibration.sdof.forcedResponse', 'PRISM_VIBRATION_ANALYSIS_ENGINE.sdofForcedResponse');
            PRISM_GATEWAY.register('vibration.frf.compute', 'PRISM_VIBRATION_ANALYSIS_ENGINE.computeFRF');
            PRISM_GATEWAY.register('vibration.frf.generate', 'PRISM_VIBRATION_ANALYSIS_ENGINE.generateFRFData');
            PRISM_GATEWAY.register('vibration.modal.analysis', 'PRISM_VIBRATION_ANALYSIS_ENGINE.modalAnalysis');
            console.log('[PRISM] PRISM_VIBRATION_ANALYSIS_ENGINE registered: 6 routes');
        }
    }
};


/**
 * PRISM_CHATTER_PREDICTION_ENGINE
 * Stability lobe diagram and chatter prediction
 * Source: Altintas "Manufacturing Automation", Tlusty, Tobias
 */
const PRISM_CHATTER_PREDICTION_ENGINE = {
    name: 'PRISM_CHATTER_PREDICTION_ENGINE',
    version: '1.0.0',
    source: 'Altintas, Tlusty, MIT 2.830',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STABILITY LOBE DIAGRAM
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Generate stability lobe diagram for milling
     * @param {Object} toolDynamics - {mass, stiffness, damping} or FRF
     * @param {Object} cuttingParams - {Kt, radialImmersion, numTeeth}
     * @param {Object} rpmRange - {min, max, points}
     * @returns {Object} Stability lobes data
     */
    generateStabilityLobes: function(toolDynamics, cuttingParams, rpmRange) {
        const { Kt, radialImmersion = 1, numTeeth = 4 } = cuttingParams;
        const { min: rpmMin, max: rpmMax, points = 100 } = rpmRange;
        
        // Get system FRF parameters
        let omega_n, zeta, k;
        if (toolDynamics.mass) {
            const { mass: m, stiffness, damping = 0 } = toolDynamics;
            k = stiffness;
            omega_n = Math.sqrt(k / m);
            zeta = damping / (2 * Math.sqrt(k * m));
        } else {
            // Assume FRF data provided
            omega_n = toolDynamics.naturalFreq * 2 * Math.PI;
            zeta = toolDynamics.dampingRatio;
            k = toolDynamics.stiffness;
        }
        
        // Average directional factor for milling
        const alphaxx = this._directionalFactor(radialImmersion, 'milling');
        
        const lobes = [];
        const numLobes = 5;
        
        // Generate lobes for different lobe numbers
        for (let lobeNum = 0; lobeNum < numLobes; lobeNum++) {
            const lobePoints = [];
            
            // Sweep through phase (0 to π)
            for (let i = 0; i <= points; i++) {
                const epsilon = Math.PI * i / points;
                
                // Chatter frequency
                const omega_c = omega_n * Math.sqrt(1 - zeta * zeta + 
                    Math.sqrt(Math.pow(1 - zeta * zeta, 2) + Math.pow(Math.tan(epsilon), 2)));
                
                // Real part of oriented FRF
                const G_real = -1 / (2 * k * zeta * Math.sqrt(1 - zeta * zeta));
                
                // Critical depth of cut (Altintas equation)
                const a_lim = -1 / (2 * Kt * alphaxx * G_real * Math.cos(epsilon));
                
                // Spindle speed
                const f_c = omega_c / (2 * Math.PI);
                const T = (2 * lobeNum * Math.PI + epsilon) / omega_c;
                const N = 60 / (numTeeth * T);
                
                if (N >= rpmMin && N <= rpmMax && a_lim > 0) {
                    lobePoints.push({
                        rpm: N,
                        depthLimit_mm: a_lim * 1000, // Convert to mm
                        chatterFrequency_Hz: f_c,
                        lobeNumber: lobeNum
                    });
                }
            }
            
            if (lobePoints.length > 0) {
                lobes.push({
                    lobeNumber: lobeNum,
                    points: lobePoints.sort((a, b) => a.rpm - b.rpm)
                });
            }
        }
        
        // Find optimal stable pockets
        const stablePockets = this._findStablePockets(lobes, rpmMin, rpmMax);
        
        return {
            lobes,
            stablePockets,
            toolDynamics: { naturalFreq_Hz: omega_n / (2 * Math.PI), dampingRatio: zeta, stiffness: k },
            cuttingParams,
            rpmRange: { min: rpmMin, max: rpmMax }
        };
    },
    
    _directionalFactor: function(radialImmersion, operation) {
        // Average directional factor for different operations
        if (operation === 'milling') {
            // Simplified - depends on engagement angle
            const phi_st = Math.acos(1 - 2 * radialImmersion);
            const phi_ex = Math.PI;
            return (1 / (2 * Math.PI)) * (Math.cos(2 * phi_st) - Math.cos(2 * phi_ex) + 2 * (phi_ex - phi_st));
        }
        return 1; // For turning
    },
    
    _findStablePockets: function(lobes, rpmMin, rpmMax) {
        const pockets = [];
        const stepSize = 100;
        
        for (let rpm = rpmMin; rpm <= rpmMax; rpm += stepSize) {
            let maxStableDepth = Infinity;
            
            for (const lobe of lobes) {
                for (let i = 0; i < lobe.points.length - 1; i++) {
                    const p1 = lobe.points[i];
                    const p2 = lobe.points[i + 1];
                    
                    if (rpm >= Math.min(p1.rpm, p2.rpm) && rpm <= Math.max(p1.rpm, p2.rpm)) {
                        const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
                        const depth = p1.depthLimit_mm + t * (p2.depthLimit_mm - p1.depthLimit_mm);
                        maxStableDepth = Math.min(maxStableDepth, depth);
                    }
                }
            }
            
            if (maxStableDepth > 0 && maxStableDepth < Infinity) {
                pockets.push({ rpm, maxStableDepth_mm: maxStableDepth });
            }
        }
        
        // Find peaks in stable pockets
        const peaks = [];
        for (let i = 1; i < pockets.length - 1; i++) {
            if (pockets[i].maxStableDepth_mm > pockets[i-1].maxStableDepth_mm &&
                pockets[i].maxStableDepth_mm > pockets[i+1].maxStableDepth_mm) {
                peaks.push(pockets[i]);
            }
        }
        
        return {
            all: pockets,
            peaks: peaks.sort((a, b) => b.maxStableDepth_mm - a.maxStableDepth_mm)
        };
    },
    
    /**
     * Check stability for given parameters
     * @param {number} rpm - Spindle speed
     * @param {number} axialDepth - Depth of cut in mm
     * @param {Object} lobes - Stability lobe data
     * @returns {Object} Stability assessment
     */
    checkStability: function(rpm, axialDepth, lobes) {
        let minStableDepth = Infinity;
        let criticalLobe = null;
        
        for (const lobe of lobes.lobes) {
            for (let i = 0; i < lobe.points.length - 1; i++) {
                const p1 = lobe.points[i];
                const p2 = lobe.points[i + 1];
                
                if (rpm >= Math.min(p1.rpm, p2.rpm) && rpm <= Math.max(p1.rpm, p2.rpm)) {
                    const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
                    const depth = p1.depthLimit_mm + t * (p2.depthLimit_mm - p1.depthLimit_mm);
                    if (depth < minStableDepth) {
                        minStableDepth = depth;
                        criticalLobe = lobe.lobeNumber;
                    }
                }
            }
        }
        
        const stable = axialDepth < minStableDepth;
        const margin = minStableDepth - axialDepth;
        const marginPercent = (margin / minStableDepth) * 100;
        
        return {
            stable,
            axialDepth_mm: axialDepth,
            criticalDepth_mm: minStableDepth,
            margin_mm: margin,
            marginPercent,
            criticalLobe,
            recommendation: stable ? 
                (marginPercent > 20 ? 'Good - adequate stability margin' : 'Caution - near stability limit') :
                'Unstable - reduce depth of cut or change RPM'
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CHATTER DETECTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Detect chatter from vibration signal
     * @param {Array} signal - Time-domain vibration signal
     * @param {Object} config - {sampleRate, teeth, rpm}
     * @returns {Object} Chatter detection results
     */
    detectChatter: function(signal, config) {
        const { sampleRate, teeth, rpm } = config;
        
        // Compute FFT
        const spectrum = this._fft(signal);
        const N = signal.length;
        const freqs = spectrum.map((_, i) => i * sampleRate / N);
        
        // Tooth passing frequency and harmonics
        const toothFreq = rpm * teeth / 60;
        const harmonics = [1, 2, 3, 4, 5].map(n => n * toothFreq);
        
        // Find spectral peaks
        const peaks = this._findPeaks(spectrum, freqs, sampleRate);
        
        // Classify peaks as harmonic or non-harmonic (potential chatter)
        const harmonicPeaks = [];
        const nonHarmonicPeaks = [];
        
        for (const peak of peaks) {
            const isHarmonic = harmonics.some(h => Math.abs(peak.frequency - h) < toothFreq * 0.1);
            if (isHarmonic) {
                harmonicPeaks.push(peak);
            } else {
                nonHarmonicPeaks.push(peak);
            }
        }
        
        // Chatter detection criteria
        let chatterDetected = false;
        let chatterFrequency = null;
        let chatterSeverity = 0;
        
        if (nonHarmonicPeaks.length > 0 && harmonicPeaks.length > 0) {
            const dominantNonHarmonic = nonHarmonicPeaks[0];
            const dominantHarmonic = harmonicPeaks[0];
            
            // Chatter if non-harmonic peak is significant relative to tooth passing
            const ratio = dominantNonHarmonic.magnitude / dominantHarmonic.magnitude;
            if (ratio > 0.3) {
                chatterDetected = true;
                chatterFrequency = dominantNonHarmonic.frequency;
                chatterSeverity = Math.min(1, ratio);
            }
        }
        
        return {
            chatterDetected,
            chatterFrequency_Hz: chatterFrequency,
            chatterSeverity, // 0-1 scale
            toothPassingFrequency_Hz: toothFreq,
            harmonicPeaks,
            nonHarmonicPeaks,
            spectrum: spectrum.slice(0, N / 2),
            frequencies: freqs.slice(0, N / 2),
            recommendation: chatterDetected ? 
                `Chatter detected at ${chatterFrequency?.toFixed(1)} Hz. Adjust RPM or reduce depth.` :
                'No chatter detected'
        };
    },
    
    _fft: function(signal) {
        const N = signal.length;
        const spectrum = [];
        
        // Radix-2 FFT (requires power of 2 length)
        const n = Math.pow(2, Math.ceil(Math.log2(N)));
        const padded = [...signal, ...Array(n - N).fill(0)];
        
        // DFT (use FFT algorithm for large signals in production)
        for (let k = 0; k < n; k++) {
            let real = 0, imag = 0;
            for (let t = 0; t < n; t++) {
                const angle = -2 * Math.PI * k * t / n;
                real += padded[t] * Math.cos(angle);
                imag += padded[t] * Math.sin(angle);
            }
            spectrum.push(Math.sqrt(real * real + imag * imag) / n);
        }
        
        return spectrum;
    },
    
    _findPeaks: function(spectrum, freqs, sampleRate) {
        const peaks = [];
        const minHeight = Math.max(...spectrum) * 0.05; // 5% of max
        
        // Only look at first half (positive frequencies)
        const halfN = Math.floor(spectrum.length / 2);
        
        for (let i = 2; i < halfN - 2; i++) {
            if (spectrum[i] > minHeight &&
                spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i-2] &&
                spectrum[i] > spectrum[i+1] && spectrum[i] > spectrum[i+2]) {
                peaks.push({
                    frequency: freqs[i],
                    magnitude: spectrum[i],
                    index: i
                });
            }
        }
        
        return peaks.sort((a, b) => b.magnitude - a.magnitude);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL SPEED ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Calculate critical speeds for rotating shaft
     * @param {Object} shaft - {length, diameter, E, density}
     * @param {Array} supports - [{position, type}] 
     * @returns {Object} Critical speeds
     */
    criticalSpeeds: function(shaft, supports = []) {
        const { length: L, diameter: d, E, density: rho } = shaft;
        
        // Cross-section properties
        const A = Math.PI * d * d / 4;
        const I = Math.PI * Math.pow(d, 4) / 64;
        
        // Mass per unit length
        const m_bar = rho * A;
        
        // Bending rigidity
        const EI = E * I;
        
        // Calculate first few critical speeds based on support conditions
        const supportType = supports.length === 0 ? 'simply-supported' : 
            supports.every(s => s.type === 'fixed') ? 'fixed-fixed' : 'simply-supported';
        
        const criticalSpeeds = [];
        const lambda_n = {
            'simply-supported': [Math.PI, 2 * Math.PI, 3 * Math.PI],
            'fixed-fixed': [4.730, 7.853, 10.996],
            'cantilever': [1.875, 4.694, 7.855]
        };
        
        const lambdas = lambda_n[supportType] || lambda_n['simply-supported'];
        
        for (let i = 0; i < lambdas.length; i++) {
            const lambda = lambdas[i];
            
            // Natural frequency: ω_n = (λ/L)² * sqrt(EI / (m_bar))
            const omega_n = Math.pow(lambda / L, 2) * Math.sqrt(EI / m_bar);
            const f_n = omega_n / (2 * Math.PI);
            const rpm_critical = f_n * 60;
            
            criticalSpeeds.push({
                mode: i + 1,
                frequency_Hz: f_n,
                criticalRPM: rpm_critical,
                wavelength: L / lambda
            });
        }
        
        return {
            shaft: { length: L, diameter: d, E, density: rho },
            supportType,
            criticalSpeeds,
            recommendedMaxRPM: criticalSpeeds[0].criticalRPM * 0.8,
            safeOperatingRanges: this._findSafeRanges(criticalSpeeds)
        };
    },
    
    _findSafeRanges: function(criticalSpeeds) {
        const ranges = [];
        const margin = 0.15; // 15% margin from critical
        
        let prevUpper = 0;
        for (const cs of criticalSpeeds) {
            const lower = cs.criticalRPM * (1 - margin);
            const upper = cs.criticalRPM * (1 + margin);
            
            if (lower > prevUpper) {
                ranges.push({
                    min: prevUpper,
                    max: lower,
                    description: `Safe range below critical speed ${cs.mode}`
                });
            }
            prevUpper = upper;
        }
        
        return ranges;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('chatter.stabilityLobes', 'PRISM_CHATTER_PREDICTION_ENGINE.generateStabilityLobes');
            PRISM_GATEWAY.register('chatter.checkStability', 'PRISM_CHATTER_PREDICTION_ENGINE.checkStability');
            PRISM_GATEWAY.register('chatter.detect', 'PRISM_CHATTER_PREDICTION_ENGINE.detectChatter');
            PRISM_GATEWAY.register('chatter.criticalSpeeds', 'PRISM_CHATTER_PREDICTION_ENGINE.criticalSpeeds');
            console.log('[PRISM] PRISM_CHATTER_PREDICTION_ENGINE registered: 4 routes');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTRATION AND EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession4Part2() {
    PRISM_VIBRATION_ANALYSIS_ENGINE.register();
    PRISM_CHATTER_PREDICTION_ENGINE.register();
    
    console.log('[Session 4 Part 2] Registered 2 modules, 10 gateway routes');
    console.log('  - PRISM_VIBRATION_ANALYSIS_ENGINE: SDOF/MDOF, FRF, Modal analysis');
    console.log('  - PRISM_CHATTER_PREDICTION_ENGINE: Stability lobes, Chatter detection, Critical speeds');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    registerSession4Part2();
}

console.log('[Session 4 Part 2] Vibration Analysis & Chatter Prediction loaded - 2 modules');
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PRISM SESSION 4 PART 3: CUTTING PHYSICS & FORCE MODELS
// Source: MIT 2.008 (Manufacturing), Merchant, Shaw, Kienzle
// Algorithms: Cutting Forces, Chip Formation, Tool Life, Surface Finish Prediction
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * PRISM_CUTTING_MECHANICS_ENGINE
 * Complete cutting force and chip formation analysis
 * Source: Merchant (1945), Shaw, MIT 2.008, MIT 2.830
 */
const PRISM_CUTTING_MECHANICS_ENGINE = {
    name: 'PRISM_CUTTING_MECHANICS_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.008, Merchant 1945, Shaw Metal Cutting',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MERCHANT'S CUTTING ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Merchant's orthogonal cutting model
     * @param {Object} params - Cutting parameters
     * @returns {Object} Complete force analysis
     */
    merchantAnalysis: function(params) {
        const {
            chipThickness: h,      // Uncut chip thickness (mm)
            width: b,              // Width of cut (mm)
            rakeAngle: alpha,      // Rake angle (radians)
            shearStrength: tau_s,  // Shear strength of workpiece (MPa)
            frictionCoeff: mu = 0.5 // Coefficient of friction
        } = params;
        
        // Friction angle
        const beta = Math.atan(mu);
        
        // Merchant's minimum energy criterion for shear angle
        // φ = π/4 - (β - α)/2
        const phi = Math.PI / 4 - (beta - alpha) / 2;
        
        // Alternative: Lee-Shaffer solution
        // φ = π/4 - β + α
        const phi_leeShaffer = Math.PI / 4 - beta + alpha;
        
        // Chip ratio (cutting ratio)
        const r_c = Math.cos(phi - alpha) / Math.cos(alpha);
        
        // Chip thickness
        const h_c = h / r_c;
        
        // Shear plane area
        const A_s = (b * h) / Math.sin(phi);
        
        // Shear velocity
        // V_s = V_c * cos(α) / cos(φ - α)
        
        // Shear force
        const F_s = tau_s * A_s;
        
        // Resultant force
        const R = F_s / Math.cos(phi + beta - alpha);
        
        // Cutting force (tangential)
        const F_c = R * Math.cos(beta - alpha);
        
        // Thrust force (feed direction)
        const F_t = R * Math.sin(beta - alpha);
        
        // Friction force (on rake face)
        const F_f = R * Math.sin(beta);
        
        // Normal force (on rake face)
        const F_n = R * Math.cos(beta);
        
        // Power consumption
        // P = F_c * V_c (need cutting speed)
        
        // Specific cutting energy (energy per unit volume)
        const u_c = F_c / (b * h); // J/mm³ = N/mm² = MPa
        
        return {
            shearAngle_rad: phi,
            shearAngle_deg: phi * 180 / Math.PI,
            frictionAngle_rad: beta,
            frictionAngle_deg: beta * 180 / Math.PI,
            chipRatio: r_c,
            chipThickness_mm: h_c,
            chipCompressionRatio: 1 / r_c,
            shearPlaneArea_mm2: A_s,
            forces: {
                shear_N: F_s,
                resultant_N: R,
                cutting_N: F_c,
                thrust_N: F_t,
                friction_N: F_f,
                normal_N: F_n
            },
            specificCuttingEnergy_MPa: u_c,
            coefficientOfFriction: mu,
            leeShaffer_phi_deg: phi_leeShaffer * 180 / Math.PI
        };
    }