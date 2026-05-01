const PRISM_METAHEURISTIC_OPTIMIZATION = {
    name: 'PRISM_METAHEURISTIC_OPTIMIZATION',
    version: '1.0.0',
    source: 'MIT 15.099 - Optimization Methods',
    
    /**
     * Tabu Search
     * Deterministic local search with memory
     * Source: MIT 15.099
     */
    tabuSearch: function(config) {
        const {
            initialSolution,
            costFunction,
            neighborhoodFunction,
            tabuTenure = 7,          // How long moves stay tabu
            maxIterations = 1000,
            maxNoImprove = 100,       // Stop if no improvement for this many iterations
            aspirationCriteria = true // Allow tabu moves that improve best
        } = config;
        
        let current = JSON.parse(JSON.stringify(initialSolution));
        let currentCost = costFunction(current);
        let best = JSON.parse(JSON.stringify(current));
        let bestCost = currentCost;
        
        const tabuList = new Map();  // move -> iteration when it becomes non-tabu
        const history = [{ iteration: 0, cost: currentCost, bestCost }];
        
        let noImproveCount = 0;
        
        for (let iter = 1; iter <= maxIterations; iter++) {
            const neighbors = neighborhoodFunction(current);
            
            if (neighbors.length === 0) break;
            
            // Find best non-tabu neighbor (or best tabu if aspiration)
            let bestNeighbor = null;
            let bestNeighborCost = Infinity;
            let bestMove = null;
            
            for (const { solution, move } of neighbors) {
                const cost = costFunction(solution);
                const moveKey = JSON.stringify(move);
                const isTabu = tabuList.has(moveKey) && tabuList.get(moveKey) > iter;
                
                // Aspiration: allow tabu if it improves global best
                const canUse = !isTabu || (aspirationCriteria && cost < bestCost);
                
                if (canUse && cost < bestNeighborCost) {
                    bestNeighborCost = cost;
                    bestNeighbor = solution;
                    bestMove = move;
                }
            }
            
            if (bestNeighbor === null) break;
            
            // Make the move
            current = JSON.parse(JSON.stringify(bestNeighbor));
            currentCost = bestNeighborCost;
            
            // Add to tabu list
            if (bestMove) {
                tabuList.set(JSON.stringify(bestMove), iter + tabuTenure);
                // Also add reverse move if applicable
                if (bestMove.reverse) {
                    tabuList.set(JSON.stringify(bestMove.reverse), iter + tabuTenure);
                }
            }
            
            // Update best
            if (currentCost < bestCost) {
                best = JSON.parse(JSON.stringify(current));
                bestCost = currentCost;
                noImproveCount = 0;
            } else {
                noImproveCount++;
            }
            
            // Clean old tabu entries
            if (iter % 50 === 0) {
                for (const [key, expiry] of tabuList) {
                    if (expiry <= iter) tabuList.delete(key);
                }
            }
            
            history.push({ iteration: iter, cost: currentCost, bestCost });
            
            // Early termination
            if (noImproveCount >= maxNoImprove) break;
        }
        
        return {
            solution: best,
            cost: bestCost,
            iterations: history.length - 1,
            history,
            method: 'Tabu Search'
        };
    }
}