const PRISM_SEARCH_ENHANCED = {
    name: 'PRISM_SEARCH_ENHANCED',
    version: '1.0.0',
    source: 'MIT 6.034 - Artificial Intelligence',
    
    /**
     * Best-First Search (Greedy)
     * Uses only heuristic f(n) = h(n)
     * Source: MIT 6.034 Lecture 4
     */
    bestFirstSearch: function(problem) {
        const openSet = [];
        const visited = new Set();
        let nodesExpanded = 0;
        
        openSet.push({
            state: problem.initial,
            path: [],
            cost: 0,
            h: problem.heuristic(problem.initial)
        });
        
        while (openSet.length > 0) {
            openSet.sort((a, b) => a.h - b.h);
            const current = openSet.shift();
            const stateKey = JSON.stringify(current.state);
            
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);
            nodesExpanded++;
            
            if (problem.isGoal(current.state)) {
                return { found: true, path: current.path, cost: current.cost, nodesExpanded };
            }
            
            const successors = problem.getSuccessors(current.state);
            for (const { state, action, cost } of successors) {
                const key = JSON.stringify(state);
                if (!visited.has(key)) {
                    openSet.push({
                        state,
                        path: [...current.path, action],
                        cost: current.cost + cost,
                        h: problem.heuristic(state)
                    });
                }
            }
        }
        return { found: false, nodesExpanded };
    },
    
    /**
     * Beam Search - Memory-bounded Best-First
     * Source: MIT 6.034 Lecture 4
     */
    beamSearch: function(problem, beamWidth = 3) {
        let currentLevel = [{
            state: problem.initial,
            path: [],
            cost: 0
        }];
        
        const visited = new Set([JSON.stringify(problem.initial)]);
        let nodesExpanded = 0;
        const maxIterations = 10000;
        
        for (let iteration = 0; iteration < maxIterations && currentLevel.length > 0; iteration++) {
            for (const node of currentLevel) {
                if (problem.isGoal(node.state)) {
                    return { found: true, path: node.path, cost: node.cost, nodesExpanded };
                }
            }
            
            const nextLevel = [];
            for (const node of currentLevel) {
                nodesExpanded++;
                for (const { state, action, cost } of problem.getSuccessors(node.state)) {
                    const key = JSON.stringify(state);
                    if (!visited.has(key)) {
                        visited.add(key);
                        nextLevel.push({
                            state,
                            path: [...node.path, action],
                            cost: node.cost + cost,
                            h: problem.heuristic(state)
                        });
                    }
                }
            }
            
            nextLevel.sort((a, b) => a.h - b.h);
            currentLevel = nextLevel.slice(0, beamWidth);
        }
        return { found: false, nodesExpanded };
    },
    
    /**
     * Bidirectional Search
     * Source: MIT 6.034 Lecture 3
     */
    bidirectionalSearch: function(problem) {
        const forwardFrontier = new Map();
        forwardFrontier.set(JSON.stringify(problem.initial), {
            state: problem.initial, path: [], cost: 0, direction: 'forward'
        });
        
        const backwardFrontier = new Map();
        backwardFrontier.set(JSON.stringify(problem.goal), {
            state: problem.goal, path: [], cost: 0, direction: 'backward'
        });
        
        const forwardVisited = new Map();
        const backwardVisited = new Map();
        let nodesExpanded = 0;
        
        for (let i = 0; i < 50000; i++) {
            if (forwardFrontier.size > 0) {
                const result = this._expandFrontier(forwardFrontier, forwardVisited, backwardVisited, problem.getSuccessors, 'forward');
                nodesExpanded++;
                if (result.found) return { found: true, path: result.path, cost: result.cost, nodesExpanded };
            }
            
            if (backwardFrontier.size > 0) {
                const result = this._expandFrontier(backwardFrontier, backwardVisited, forwardVisited, problem.getPredecessors || problem.getSuccessors, 'backward');
                nodesExpanded++;
                if (result.found) return { found: true, path: result.path, cost: result.cost, nodesExpanded };
            }
            
            if (forwardFrontier.size === 0 && backwardFrontier.size === 0) break;
        }
        return { found: false, nodesExpanded };
    },
    
    _expandFrontier: function(frontier, myVisited, otherVisited, getSuccessors, direction) {
        let minCost = Infinity, minKey = null;
        for (const [key, node] of frontier) {
            if (node.cost < minCost) { minCost = node.cost; minKey = key; }
        }
        if (!minKey) return { found: false };
        
        const current = frontier.get(minKey);
        frontier.delete(minKey);
        myVisited.set(minKey, current);
        
        if (otherVisited.has(minKey)) {
            const other = otherVisited.get(minKey);
            const path = direction === 'forward'
                ? [...current.path, ...other.path.reverse()]
                : [...other.path, ...current.path.reverse()];
            return { found: true, path, cost: current.cost + other.cost };
        }
        
        const successors = getSuccessors(current.state);
        for (const { state, action, cost } of successors) {
            const key = JSON.stringify(state);
            if (!myVisited.has(key) && !frontier.has(key)) {
                frontier.set(key, { state, path: [...current.path, action], cost: current.cost + cost, direction });
            }
        }
        return { found: false };
    },
    
    /**
     * Dijkstra's Algorithm - Source: MIT 6.006
     */
    dijkstra: function(graph, start, goal = null) {
        const distances = new Map();
        const predecessors = new Map();
        const visited = new Set();
        const pq = [];
        
        distances.set(start, 0);
        pq.push({ node: start, dist: 0 });
        
        while (pq.length > 0) {
            pq.sort((a, b) => a.dist - b.dist);
            const { node: current, dist: currentDist } = pq.shift();
            
            if (visited.has(current)) continue;
            visited.add(current);
            if (goal !== null && current === goal) break;
            if (currentDist > (distances.get(current) || Infinity)) continue;
            
            const neighbors = graph[current] || [];
            for (const neighbor of neighbors) {
                const { to, weight } = typeof neighbor === 'object' ? neighbor : { to: neighbor, weight: 1 };
                if (visited.has(to)) continue;
                
                const newDist = currentDist + weight;
                if (newDist < (distances.get(to) || Infinity)) {
                    distances.set(to, newDist);
                    predecessors.set(to, current);
                    pq.push({ node: to, dist: newDist });
                }
            }
        }
        
        let path = null;
        if (goal !== null && distances.has(goal)) {
            path = [];
            let current = goal;
            while (current !== undefined) {
                path.unshift(current);
                current = predecessors.get(current);
            }
        }
        
        return {
            distances: Object.fromEntries(distances),
            predecessors: Object.fromEntries(predecessors),
            path,
            pathCost: goal ? distances.get(goal) : null
        };
    },
    
    /**
     * Uniform Cost Search - A* with h(n)=0
     */
    uniformCostSearch: function(problem) {
        const frontier = [];
        const explored = new Set();
        const costSoFar = new Map();
        
        frontier.push({ state: problem.initial, path: [], cost: 0 });
        costSoFar.set(JSON.stringify(problem.initial), 0);
        
        let nodesExpanded = 0;
        
        while (frontier.length > 0) {
            frontier.sort((a, b) => a.cost - b.cost);
            const current = frontier.shift();
            const stateKey = JSON.stringify(current.state);
            
            if (problem.isGoal(current.state)) {
                return { found: true, path: current.path, cost: current.cost, nodesExpanded, optimal: true };
            }
            
            if (explored.has(stateKey)) continue;
            explored.add(stateKey);
            nodesExpanded++;
            
            for (const { state, action, cost } of problem.getSuccessors(current.state)) {
                const key = JSON.stringify(state);
                const newCost = current.cost + cost;
                if (!explored.has(key) && newCost < (costSoFar.get(key) || Infinity)) {
                    costSoFar.set(key, newCost);
                    frontier.push({ state, path: [...current.path, action], cost: newCost });
                }
            }
        }
        return { found: false, nodesExpanded };
    },
    
    /**
     * Weighted A* - f(n) = g(n) + w*h(n)
     */
    weightedAStar: function(problem, weight = 1.5) {
        const openSet = new Map();
        const closedSet = new Set();
        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();
        
        const startKey = JSON.stringify(problem.initial);
        openSet.set(startKey, problem.initial);
        gScore.set(startKey, 0);
        fScore.set(startKey, weight * problem.heuristic(problem.initial));
        
        let nodesExpanded = 0;
        
        while (openSet.size > 0 && nodesExpanded < 100000) {
            let currentKey = null, lowestF = Infinity;
            for (const [key, _] of openSet) {
                const f = fScore.get(key);
                if (f < lowestF) { lowestF = f; currentKey = key; }
            }
            
            const current = openSet.get(currentKey);
            nodesExpanded++;
            
            if (problem.isGoal(current)) {
                const path = [];
                let curr = currentKey;
                while (cameFrom.has(curr)) {
                    const { parent, action } = cameFrom.get(curr);
                    path.unshift(action);
                    curr = parent;
                }
                return { found: true, path, cost: gScore.get(currentKey), nodesExpanded };
            }
            
            openSet.delete(currentKey);
            closedSet.add(currentKey);
            
            for (const { state, action, cost } of problem.getSuccessors(current)) {
                const neighborKey = JSON.stringify(state);
                if (closedSet.has(neighborKey)) continue;
                
                const tentativeG = gScore.get(currentKey) + cost;
                if (!openSet.has(neighborKey)) {
                    openSet.set(neighborKey, state);
                    gScore.set(neighborKey, Infinity);
                }
                
                if (tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, { parent: currentKey, action, cost });
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + weight * problem.heuristic(state));
                }
            }
        }
        return { found: false, nodesExpanded };
    }
}