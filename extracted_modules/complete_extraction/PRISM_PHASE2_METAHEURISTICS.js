const PRISM_PHASE2_METAHEURISTICS = {
    name: 'Phase 2 Metaheuristics',
    version: '1.0.0',
    source: 'MIT 18.433',
    
    /**
     * Simulated Annealing
     * Source: MIT 18.433 - Combinatorial Optimization
     */
    simulatedAnnealing: function(f, neighbor, x0, options = {}) {
        const config = {
            T0: options.T0 || 1000,
            Tmin: options.Tmin || 0.001,
            alpha: options.alpha || 0.95,
            iterPerTemp: options.iterPerTemp || 100
        };
        
        let x = typeof x0 === 'function' ? x0() : [...x0];
        let fx = f(x);
        let best = { x: [...x], fx };
        let T = config.T0;
        let iterations = 0;
        
        while (T > config.Tmin) {
            for (let i = 0; i < config.iterPerTemp; i++) {
                const xNew = neighbor(x);
                const fxNew = f(xNew);
                const delta = fxNew - fx;
                
                if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
                    x = xNew;
                    fx = fxNew;
                    
                    if (fx < best.fx) {
                        best = { x: [...x], fx };
                    }
                }
                
                iterations++;
            }
            
            T *= config.alpha;
        }
        
        return {
            optimal: best.x,
            value: best.fx,
            iterations,
            finalTemperature: T,
            source: 'MIT 18.433 - Simulated Annealing'
        };
    },
    
    /**
     * Tabu Search
     * Source: MIT 18.433
     */
    tabuSearch: function(f, neighbors, x0, options = {}) {
        const config = {
            maxIter: options.maxIter || 1000,
            tabuSize: options.tabuSize || 20
        };
        
        let x = [...x0];
        let fx = f(x);
        let best = { x: [...x], fx };
        const tabuList = [];
        
        const isTabu = (move) => {
            return tabuList.some(t => 
                t.length === move.length && 
                t.every((v, i) => Math.abs(v - move[i]) < 1e-10)
            );
        };
        
        for (let iter = 0; iter < config.maxIter; iter++) {
            const candidateMoves = neighbors(x);
            
            let bestMove = null;
            let bestMoveFx = Infinity;
            
            for (const move of candidateMoves) {
                const moveFx = f(move);
                
                // Accept if not tabu or if aspiration criteria met
                if (!isTabu(move) || moveFx < best.fx) {
                    if (moveFx < bestMoveFx) {
                        bestMove = move;
                        bestMoveFx = moveFx;
                    }
                }
            }
            
            if (bestMove) {
                x = bestMove;
                fx = bestMoveFx;
                
                // Update tabu list
                tabuList.push([...x]);
                if (tabuList.length > config.tabuSize) {
                    tabuList.shift();
                }
                
                if (fx < best.fx) {
                    best = { x: [...x], fx };
                }
            }
        }
        
        return {
            optimal: best.x,
            value: best.fx,
            iterations: config.maxIter,
            source: 'MIT 18.433 - Tabu Search'
        };
    },
    
    /**
     * Branch and Bound
     * Source: MIT 18.433
     */
    branchAndBound: function(problem, options = {}) {
        const config = {
            maxNodes: options.maxNodes || 10000
        };
        
        const { objective, variables, constraints, bounds } = problem;
        const n = variables.length;
        
        let bestSolution = null;
        let bestValue = Infinity;
        let nodesExplored = 0;
        
        // Node: { bounds, level, fixedVars }
        const stack = [{ bounds: bounds.map(b => [...b]), level: 0, fixedVars: [] }];
        
        while (stack.length > 0 && nodesExplored < config.maxNodes) {
            const node = stack.pop();
            nodesExplored++;
            
            // Solve LP relaxation (simplified - just evaluate at midpoint)
            const x = node.bounds.map(b => (b[0] + b[1]) / 2);
            const value = objective(x);
            
            // Pruning
            if (value >= bestValue) continue;
            
            // Check if integer feasible
            let allInteger = true;
            let fractionalIdx = -1;
            
            for (let i = 0; i < n; i++) {
                if (variables[i].type === 'integer') {
                    if (Math.abs(x[i] - Math.round(x[i])) > 1e-6) {
                        allInteger = false;
                        fractionalIdx = i;
                        break;
                    }
                }
            }
            
            if (allInteger) {
                // Check constraints
                let feasible = true;
                if (constraints) {
                    for (const c of constraints) {
                        if (!c(x)) {
                            feasible = false;
                            break;
                        }
                    }
                }
                
                if (feasible && value < bestValue) {
                    bestValue = value;
                    bestSolution = [...x];
                }
            } else {
                // Branch
                const left = {
                    bounds: node.bounds.map(b => [...b]),
                    level: node.level + 1,
                    fixedVars: [...node.fixedVars]
                };
                left.bounds[fractionalIdx][1] = Math.floor(x[fractionalIdx]);
                
                const right = {
                    bounds: node.bounds.map(b => [...b]),
                    level: node.level + 1,
                    fixedVars: [...node.fixedVars]
                };
                right.bounds[fractionalIdx][0] = Math.ceil(x[fractionalIdx]);
                
                if (left.bounds[fractionalIdx][0] <= left.bounds[fractionalIdx][1]) {
                    stack.push(left);
                }
                if (right.bounds[fractionalIdx][0] <= right.bounds[fractionalIdx][1]) {
                    stack.push(right);
                }
            }
        }
        
        return {
            optimal: bestSolution,
            value: bestValue,
            nodesExplored,
            source: 'MIT 18.433 - Branch and Bound'
        };
    }
}