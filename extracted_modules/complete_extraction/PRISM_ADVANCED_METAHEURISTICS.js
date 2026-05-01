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
}