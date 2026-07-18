/**
 * PRISM_MEMORY_EFFICIENT_SEARCH
 * Extracted from PRISM v8.89.002 monolith
 * References: 9
 * Category: search
 * Lines: 152
 * Session: R2.3.3 Algorithm Extraction Wave 2
 */

const PRISM_MEMORY_EFFICIENT_SEARCH = {
    name: 'PRISM_MEMORY_EFFICIENT_SEARCH',
    version: '1.0.0',
    source: 'MIT 6.034 - Artificial Intelligence',
    
    /**
     * Iterative Deepening A* (IDA*)
     * Memory-efficient optimal search - O(bd) space vs O(b^d) for A*
     * Source: MIT 6.034 Lecture 4
     */
    idaStar: function(problem) {
        const start = problem.initial;
        let threshold = problem.heuristic(start);
        const path = [start];
        let nodesExpanded = 0;
        const maxIterations = problem.maxIterations || 100;
        
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            const result = this._idaSearch(path, 0, threshold, problem);
            nodesExpanded += result.nodesExpanded;
            
            if (result.found) {
                return {
                    found: true,
                    path: result.path,
                    cost: result.cost,
                    nodesExpanded,
                    iterations: iteration + 1
                };
            }
            
            if (result.threshold === Infinity) {
                return { found: false, nodesExpanded, reason: 'No solution exists' };
            }
            
            threshold = result.threshold;
        }
        
        return { found: false, nodesExpanded, reason: 'Max iterations reached' };
    },
    
    _idaSearch: function(path, g, threshold, problem) {
        const current = path[path.length - 1];
        const f = g + problem.heuristic(current);
        let nodesExpanded = 1;
        
        if (f > threshold) {
            return { found: false, threshold: f, nodesExpanded };
        }
        
        if (problem.isGoal(current)) {
            return {
                found: true,
                path: path.map((s, i) => ({ state: s, step: i })),
                cost: g,
                nodesExpanded
            };
        }
        
        let minThreshold = Infinity;
        const successors = problem.getSuccessors(current);
        
        // Sort by f-value for better pruning
        successors.sort((a, b) => {
            const fA = g + a.cost + problem.heuristic(a.state);
            const fB = g + b.cost + problem.heuristic(b.state);
            return fA - fB;
        });
        
        for (const { state, cost } of successors) {
            const stateKey = JSON.stringify(state);
            const inPath = path.some(s => JSON.stringify(s) === stateKey);
            
            if (!inPath) {
                path.push(state);
                const result = this._idaSearch(path, g + cost, threshold, problem);
                nodesExpanded += result.nodesExpanded;
                
                if (result.found) {
                    return { ...result, nodesExpanded };
                }
                
                if (result.threshold < minThreshold) {
                    minThreshold = result.threshold;
                }
                
                path.pop();
            }
        }
        
        return { found: false, threshold: minThreshold, nodesExpanded };
    },
    
    /**
     * Depth-Limited Search
     * DFS with depth cutoff
     */
    depthLimitedSearch: function(problem, limit) {
        const result = this._dlsRecursive(problem.initial, problem, limit, new Set());
        return result;
    },
    
    _dlsRecursive: function(state, problem, limit, visited) {
        if (problem.isGoal(state)) {
            return { found: true, state, depth: 0 };
        }
        
        if (limit <= 0) {
            return { found: false, cutoff: true };
        }
        
        const stateKey = JSON.stringify(state);
        if (visited.has(stateKey)) {
            return { found: false, cutoff: false };
        }
        visited.add(stateKey);
        
        let cutoffOccurred = false;
        
        for (const { state: child } of problem.getSuccessors(state)) {
            const result = this._dlsRecursive(child, problem, limit - 1, visited);
            
            if (result.found) {
                return { found: true, state: child, depth: result.depth + 1 };
            }
            
            if (result.cutoff) {
                cutoffOccurred = true;
            }
        }
        
        visited.delete(stateKey);
        return { found: false, cutoff: cutoffOccurred };
    },
    
    /**
     * Iterative Deepening DFS
     * Complete and optimal for unit costs
     */
    iterativeDeepeningDFS: function(problem, maxDepth = 100) {
        for (let depth = 0; depth <= maxDepth; depth++) {
            const result = this.depthLimitedSearch(problem, depth);
            if (result.found) {
                return { found: true, depth, state: result.state };
            }
            if (!result.cutoff) {
                return { found: false, reason: 'No solution' };
            }
        }
        return { found: false, reason: 'Max depth reached' };
    }
}