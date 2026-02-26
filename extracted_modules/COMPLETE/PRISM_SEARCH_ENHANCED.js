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
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: ENHANCED CSP ALGORITHMS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_CSP_ENHANCED = {
    name: 'PRISM_CSP_ENHANCED',
    version: '1.0.0',
    source: 'MIT 6.034 - Constraint Satisfaction',
    
    /**
     * Forward Checking - Source: MIT 6.034 Lecture 5
     */
    forwardChecking: function(csp) {
        const { variables, domains, constraints } = csp;
        const currentDomains = {};
        for (const v of variables) currentDomains[v] = [...domains[v]];
        
        const assignment = {};
        const result = this._fcBacktrack(assignment, variables, currentDomains, constraints);
        return result ? { solved: true, assignment: result } : { solved: false };
    },
    
    _fcBacktrack: function(assignment, variables, domains, constraints) {
        if (Object.keys(assignment).length === variables.length) return { ...assignment };
        
        const unassigned = variables.filter(v => !(v in assignment));
        const variable = unassigned.reduce((best, v) => domains[v].length < domains[best].length ? v : best);
        
        for (const value of this._orderDomainValues(variable, domains, constraints, assignment)) {
            if (this._isConsistent(variable, value, assignment, constraints)) {
                assignment[variable] = value;
                const savedDomains = this._saveDomains(domains, variables);
                const pruneResult = this._pruneDomainsFC(variable, value, domains, constraints);
                
                if (pruneResult.valid) {
                    const result = this._fcBacktrack(assignment, variables, domains, constraints);
                    if (result) return result;
                }
                
                this._restoreDomains(domains, savedDomains);
                delete assignment[variable];
            }
        }
        return null;
    },
    
    _pruneDomainsFC: function(variable, value, domains, constraints) {
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            for (const other of constraint.variables) {
                if (other === variable) continue;
                domains[other] = domains[other].filter(otherVal => {
                    return constraint.check({ [variable]: value, [other]: otherVal });
                });
                if (domains[other].length === 0) return { valid: false };
            }
        }
        return { valid: true };
    },
    
    _orderDomainValues: function(variable, domains, constraints, assignment) {
        const values = [...domains[variable]];
        const countConstraints = (value) => {
            let count = 0;
            for (const constraint of constraints) {
                if (!constraint.variables.includes(variable)) continue;
                for (const other of constraint.variables) {
                    if (other === variable || other in assignment) continue;
                    for (const otherVal of domains[other]) {
                        if (!constraint.check({ [variable]: value, [other]: otherVal })) count++;
                    }
                }
            }
            return count;
        };
        values.sort((a, b) => countConstraints(a) - countConstraints(b));
        return values;
    },
    
    _isConsistent: function(variable, value, assignment, constraints) {
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            const allAssigned = constraint.variables.every(v => v === variable || v in assignment);
            if (allAssigned) {
                const testAssignment = { ...assignment, [variable]: value };
                if (!constraint.check(testAssignment)) return false;
            }
        }
        return true;
    },
    
    _saveDomains: function(domains, variables) {
        const saved = {};
        for (const v of variables) saved[v] = [...domains[v]];
        return saved;
    },
    
    _restoreDomains: function(domains, saved) {
        for (const v in saved) domains[v] = saved[v];
    },
    
    /**
     * Conflict-Directed Backjumping - Source: MIT 6.034 Lecture 6
     */
    conflictDirectedBackjumping: function(csp) {
        const { variables, domains, constraints } = csp;
        const assignment = {};
        const conflictSets = {};
        for (const v of variables) conflictSets[v] = new Set();
        
        const result = this._cbjBacktrack(0, variables, domains, constraints, assignment, conflictSets);
        return result.solution ? { solved: true, assignment: result.solution } : { solved: false };
    },
    
    _cbjBacktrack: function(index, variables, domains, constraints, assignment, conflictSets) {
        if (index === variables.length) return { solution: { ...assignment } };
        
        const variable = variables[index];
        conflictSets[variable] = new Set();
        
        for (const value of domains[variable]) {
            const conflicts = this._findConflicts(variable, value, assignment, constraints);
            
            if (conflicts.length === 0) {
                assignment[variable] = value;
                const result = this._cbjBacktrack(index + 1, variables, domains, constraints, assignment, conflictSets);
                
                if (result.solution) return result;
                
                if (result.conflictSet) {
                    for (const v of result.conflictSet) {
                        if (v !== variable) conflictSets[variable].add(v);
                    }
                    if (!result.conflictSet.has(variable)) {
                        return { solution: null, conflictSet: result.conflictSet };
                    }
                }
                delete assignment[variable];
            } else {
                for (const cv of conflicts) conflictSets[variable].add(cv);
            }
        }
        return { solution: null, conflictSet: conflictSets[variable] };
    },
    
    _findConflicts: function(variable, value, assignment, constraints) {
        const conflicts = [];
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            for (const other of constraint.variables) {
                if (other === variable || !(other in assignment)) continue;
                const testAssignment = { ...assignment, [variable]: value };
                if (!constraint.check(testAssignment)) conflicts.push(other);
            }
        }
        return conflicts;
    },
    
    /**
     * Min-Conflicts Local Search - Source: MIT 6.034
     */
    minConflicts: function(csp, maxSteps = 10000) {
        const { variables, domains, constraints } = csp;
        
        const assignment = {};
        for (const v of variables) {
            assignment[v] = domains[v][Math.floor(Math.random() * domains[v].length)];
        }
        
        for (let step = 0; step < maxSteps; step++) {
            const conflicted = this._getConflictedVariables(assignment, constraints);
            if (conflicted.length === 0) return { solved: true, assignment, steps: step };
            
            const variable = conflicted[Math.floor(Math.random() * conflicted.length)];
            let minConflicts = Infinity, bestValue = assignment[variable];
            
            for (const value of domains[variable]) {
                const tempAssignment = { ...assignment, [variable]: value };
                const conflicts = this._countConflicts(variable, tempAssignment, constraints);
                if (conflicts < minConflicts) { minConflicts = conflicts; bestValue = value; }
            }
            assignment[variable] = bestValue;
        }
        
        return { solved: false, assignment, steps: maxSteps };
    },
    
    _getConflictedVariables: function(assignment, constraints) {
        const conflicted = new Set();
        for (const constraint of constraints) {
            const allAssigned = constraint.variables.every(v => v in assignment);
            if (allAssigned && !constraint.check(assignment)) {
                for (const v of constraint.variables) conflicted.add(v);
            }
        }
        return [...conflicted];
    },
    
    _countConflicts: function(variable, assignment, constraints) {
        let count = 0;
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            const allAssigned = constraint.variables.every(v => v in assignment);
            if (allAssigned && !constraint.check(assignment)) count++;
        }
        return count;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: ENHANCED MOTION PLANNING
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_MOTION_PLANNING_ENHANCED = {
    name: 'PRISM_MOTION_PLANNING_ENHANCED',
    version: '1.0.0',
    source: 'MIT 16.410 - Autonomous Systems',
    
    /**
     * Artificial Potential Fields - Source: MIT 16.410 Lecture 15
     */
    potentialFields: function(config) {
        const {
            start, goal, obstacles = [],
            stepSize = 0.5, maxIterations = 1000,
            attractiveGain = 1.0, repulsiveGain = 100.0, repulsiveRange = 5.0
        } = config;
        
        const path = [{ ...start }];
        let current = { ...start };
        
        for (let i = 0; i < maxIterations; i++) {
            const distToGoal = this._distance(current, goal);
            if (distToGoal < stepSize) {
                path.push({ ...goal });
                return { success: true, path, iterations: i, length: this._pathLength(path) };
            }
            
            const attractive = {
                x: attractiveGain * (goal.x - current.x),
                y: attractiveGain * (goal.y - current.y),
                z: goal.z !== undefined ? attractiveGain * (goal.z - current.z) : 0
            };
            
            const repulsive = { x: 0, y: 0, z: 0 };
            for (const obs of obstacles) {
                const dist = this._distanceToObstacle(current, obs);
                if (dist < repulsiveRange && dist > 0) {
                    const dir = this._directionFromObstacle(current, obs);
                    const mag = repulsiveGain * (1/dist - 1/repulsiveRange) * (1/(dist*dist));
                    repulsive.x += dir.x * mag;
                    repulsive.y += dir.y * mag;
                    repulsive.z += (dir.z || 0) * mag;
                }
            }
            
            const force = {
                x: attractive.x + repulsive.x,
                y: attractive.y + repulsive.y,
                z: (attractive.z || 0) + repulsive.z
            };
            
            const magnitude = Math.sqrt(force.x*force.x + force.y*force.y + (force.z||0)*(force.z||0));
            if (magnitude < 1e-6) {
                return { success: false, path, iterations: i, reason: 'Local minimum' };
            }
            
            current = {
                x: current.x + (force.x/magnitude) * stepSize,
                y: current.y + (force.y/magnitude) * stepSize,
                z: current.z !== undefined ? current.z + ((force.z||0)/magnitude) * stepSize : undefined
            };
            path.push({ ...current });
        }
        
        return { success: false, path, iterations: maxIterations, reason: 'Max iterations' };
    },
    
    _distance: function(a, b) {
        const dx = b.x - a.x, dy = b.y - a.y, dz = (b.z||0) - (a.z||0);
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },
    
    _distanceToObstacle: function(point, obs) {
        if (obs.type === 'sphere' || obs.radius) {
            return Math.max(0, this._distance(point, obs) - (obs.radius||0));
        }
        return this._distance(point, obs);
    },
    
    _directionFromObstacle: function(point, obs) {
        const center = obs.center || obs;
        const dx = point.x - center.x, dy = point.y - center.y;
        const dz = point.z !== undefined ? point.z - (center.z||0) : 0;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
        return { x: dx/dist, y: dy/dist, z: dz/dist };
    },
    
    _pathLength: function(path) {
        let length = 0;
        for (let i = 1; i < path.length; i++) length += this._distance(path[i-1], path[i]);
        return length;
    },
    
    /**
     * Probabilistic Roadmap (PRM) - Source: MIT 16.410
     */
    buildPRM: function(config) {
        const { bounds, obstacles = [], numSamples = 200, connectionRadius = 10, collisionChecker } = config;
        
        const nodes = [];
        const edges = [];
        let attempts = 0;
        
        while (nodes.length < numSamples && attempts < numSamples * 10) {
            attempts++;
            const sample = {
                id: nodes.length,
                x: bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
                y: bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y),
                z: bounds.min.z !== undefined
                    ? bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z) : undefined
            };
            
            if (this._isCollisionFree(sample, obstacles, collisionChecker)) {
                nodes.push(sample);
            }
        }
        
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dist = this._distance(nodes[i], nodes[j]);
                if (dist <= connectionRadius) {
                    if (this._edgeCollisionFree(nodes[i], nodes[j], obstacles, collisionChecker)) {
                        edges.push({ from: i, to: j, weight: dist });
                    }
                }
            }
        }
        
        return {
            nodes, edges, bounds, connectionRadius,
            query: (start, goal) => this._prmQuery(nodes, edges, start, goal, obstacles, connectionRadius, collisionChecker)
        };
    },
    
    _isCollisionFree: function(point, obstacles, checker) {
        if (checker) return checker(point);
        for (const obs of obstacles) {
            if (this._distanceToObstacle(point, obs) < 0.1) return false;
        }
        return true;
    },
    
    _edgeCollisionFree: function(a, b, obstacles, checker, resolution = 10) {
        for (let i = 0; i <= resolution; i++) {
            const t = i / resolution;
            const point = {
                x: a.x + t*(b.x-a.x), y: a.y + t*(b.y-a.y),
                z: a.z !== undefined ? a.z + t*(b.z-a.z) : undefined
            };
            if (!this._isCollisionFree(point, obstacles, checker)) return false;
        }
        return true;
    },
    
    _prmQuery: function(nodes, edges, start, goal, obstacles, connectionRadius, checker) {
        const startNode = { id: nodes.length, ...start };
        const goalNode = { id: nodes.length + 1, ...goal };
        const tempNodes = [...nodes, startNode, goalNode];
        const tempEdges = [...edges];
        
        for (let i = 0; i < nodes.length; i++) {
            const dStart = this._distance(startNode, nodes[i]);
            if (dStart <= connectionRadius && this._edgeCollisionFree(startNode, nodes[i], obstacles, checker)) {
                tempEdges.push({ from: startNode.id, to: i, weight: dStart });
            }
            const dGoal = this._distance(goalNode, nodes[i]);
            if (dGoal <= connectionRadius && this._edgeCollisionFree(goalNode, nodes[i], obstacles, checker)) {
                tempEdges.push({ from: i, to: goalNode.id, weight: dGoal });
            }
        }
        
        const graph = {};
        for (const node of tempNodes) graph[node.id] = [];
        for (const edge of tempEdges) {
            graph[edge.from].push({ to: edge.to, weight: edge.weight });
            graph[edge.to].push({ to: edge.from, weight: edge.weight });
        }
        
        const result = PRISM_SEARCH_ENHANCED.dijkstra(graph, startNode.id, goalNode.id);
        if (result.path) {
            return { success: true, path: result.path.map(id => tempNodes[id]), pathCost: result.pathCost };
        }
        return { success: false, reason: 'No path found' };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: MANUFACTURING APPLICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_MANUFACTURING_SEARCH = {
    name: 'PRISM_MANUFACTURING_SEARCH',
    version: '1.0.0',
    source: 'PRISM Innovation - Manufacturing Search',
    
    /**
     * Tool Change Optimization using Weighted A*
     */
    optimizeToolChanges: function(operations) {
        const problem = {
            initial: { completed: [], remaining: [...operations], currentTool: null, toolChanges: 0 },
            isGoal: (state) => state.remaining.length === 0,
            heuristic: (state) => {
                const tools = new Set(state.remaining.map(op => op.tool));
                return tools.size - (tools.has(state.currentTool) ? 1 : 0);
            },
            getSuccessors: (state) => {
                const successors = [];
                for (let i = 0; i < state.remaining.length; i++) {
                    const op = state.remaining[i];
                    const needsChange = state.currentTool !== op.tool;
                    successors.push({
                        state: {
                            completed: [...state.completed, op],
                            remaining: [...state.remaining.slice(0,i), ...state.remaining.slice(i+1)],
                            currentTool: op.tool,
                            toolChanges: state.toolChanges + (needsChange ? 1 : 0)
                        },
                        action: { operation: op, toolChange: needsChange },
                        cost: needsChange ? 1 : 0.001
                    });
                }
                return successors;
            }
        };
        return PRISM_SEARCH_ENHANCED.weightedAStar(problem, 1.0);
    },
    
    /**
     * Setup Planning using Forward Checking CSP
     */
    planSetups: function(features, directions) {
        const variables = features.map((f, i) => `feature_${i}`);
        const domains = {};
        for (let i = 0; i < features.length; i++) {
            domains[`feature_${i}`] = features[i].accessibleDirections || directions;
        }
        
        const constraints = [];
        for (let i = 0; i < features.length; i++) {
            for (let j = i + 1; j < features.length; j++) {
                if (features[i].relatedTo && features[i].relatedTo.includes(j)) {
                    constraints.push({
                        variables: [`feature_${i}`, `feature_${j}`],
                        check: (a) => a[`feature_${i}`] === a[`feature_${j}`]
                    });
                }
            }
        }
        
        return PRISM_CSP_ENHANCED.forwardChecking({ variables, domains, constraints });
    },
    
    /**
     * Rapid Movement Optimization
     */
    optimizeRapids: function(points, workpiece) {
        const paths = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i], end = points[i + 1];
            
            if (this._rapidCollisionFree(start, end, workpiece)) {
                paths.push({
                    type: 'direct',
                    points: [start, end],
                    distance: this._distance3D(start, end)
                });
            } else {
                const result = PRISM_MOTION_PLANNING_ENHANCED.potentialFields({
                    start, goal: end,
                    obstacles: workpiece.obstacles || [workpiece],
                    stepSize: 1.0, maxIterations: 500
                });
                
                if (result.success) {
                    paths.push({ type: 'avoidance', points: result.path, distance: result.length });
                } else {
                    const safeZ = workpiece.maxZ + 10;
                    paths.push({
                        type: 'retract',
                        points: [start, {...start, z: safeZ}, {...end, z: safeZ}, end],
                        distance: (safeZ - start.z) + Math.sqrt((end.x-start.x)**2 + (end.y-start.y)**2) + (safeZ - end.z)
                    });
                }
            }
        }
        
        return {
            paths,
            totalDistance: paths.reduce((sum, p) => sum + p.distance, 0),
            directPaths: paths.filter(p => p.type === 'direct').length,
            avoidancePaths: paths.filter(p => p.type === 'avoidance').length,
            retractPaths: paths.filter(p => p.type === 'retract').length
        };
    },
    
    _rapidCollisionFree: function(start, end, workpiece, resolution = 20) {
        for (let i = 0; i <= resolution; i++) {
            const t = i / resolution;
            const point = {
                x: start.x + t*(end.x-start.x),
                y: start.y + t*(end.y-start.y),
                z: start.z + t*(end.z-start.z)
            };
            if (this._pointInWorkpiece(point, workpiece)) return false;
        }
        return true;
    },
    
    _pointInWorkpiece: function(point, wp) {
        if (wp.type === 'box') {
            return point.x >= wp.min.x && point.x <= wp.max.x &&
                   point.y >= wp.min.y && point.y <= wp.max.y &&
                   point.z >= wp.min.z && point.z <= wp.max.z;
        }
        return false;
    },
    
    _distance3D: function(a, b) {
        return Math.sqrt((b.x-a.x)**2 + (b.y-a.y)**2 + (b.z-a.z)**2);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_SESSION2_GATEWAY_ROUTES = {
    'search.bestFirst': 'PRISM_SEARCH_ENHANCED.bestFirstSearch',
    'search.beam': 'PRISM_SEARCH_ENHANCED.beamSearch',
    'search.bidirectional': 'PRISM_SEARCH_ENHANCED.bidirectionalSearch',
    'search.dijkstra': 'PRISM_SEARCH_ENHANCED.dijkstra',
    'search.uniformCost': 'PRISM_SEARCH_ENHANCED.uniformCostSearch',
    'search.weightedAStar': 'PRISM_SEARCH_ENHANCED.weightedAStar',
    'csp.forwardChecking': 'PRISM_CSP_ENHANCED.forwardChecking',
    'csp.conflictBackjump': 'PRISM_CSP_ENHANCED.conflictDirectedBackjumping',
    'csp.minConflicts': 'PRISM_CSP_ENHANCED.minConflicts',
    'motion.potentialFields': 'PRISM_MOTION_PLANNING_ENHANCED.potentialFields',
    'motion.buildPRM': 'PRISM_MOTION_PLANNING_ENHANCED.buildPRM',
    'mfg.optimizeToolChanges': 'PRISM_MANUFACTURING_SEARCH.optimizeToolChanges',
    'mfg.planSetups': 'PRISM_MANUFACTURING_SEARCH.planSetups',
    'mfg.optimizeRapids': 'PRISM_MANUFACTURING_SEARCH.optimizeRapids'
};

// Register routes with gateway
(function registerSession2Routes() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        for (const [route, target] of Object.entries(PRISM_SESSION2_GATEWAY_ROUTES)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log('[SESSION2] Registered 14 new gateway routes');
    }
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_SESSION2_TESTS = {
    runAll: function() {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(' PRISM SESSION 2 ENHANCEMENT TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0, failed = 0;
        
        // Test 1: Best-First Search
        try {
            const problem = {
                initial: { x: 0, y: 0 },
                isGoal: (s) => s.x === 5 && s.y === 5,
                heuristic: (s) => Math.abs(5 - s.x) + Math.abs(5 - s.y),
                getSuccessors: (s) => [
                    { state: { x: s.x + 1, y: s.y }, action: 'right', cost: 1 },
                    { state: { x: s.x, y: s.y + 1 }, action: 'up', cost: 1 }
                ].filter(x => x.state.x <= 10 && x.state.y <= 10)
            };
            const result = PRISM_SEARCH_ENHANCED.bestFirstSearch(problem);
            if (result.found) { console.log('  ✓ Best-First Search'); passed++; }
            else { console.log('  ✗ Best-First Search'); failed++; }
        } catch (e) { console.log('  ✗ Best-First Search:', e.message); failed++; }
        
        // Test 2: Beam Search
        try {
            const problem = {
                initial: { x: 0, y: 0 },
                isGoal: (s) => s.x === 3 && s.y === 3,
                heuristic: (s) => Math.abs(3 - s.x) + Math.abs(3 - s.y),
                getSuccessors: (s) => [
                    { state: { x: s.x + 1, y: s.y }, action: 'right', cost: 1 },
                    { state: { x: s.x, y: s.y + 1 }, action: 'up', cost: 1 }
                ].filter(x => x.state.x <= 5 && x.state.y <= 5)
            };
            const result = PRISM_SEARCH_ENHANCED.beamSearch(problem, 2);
            if (result.found) { console.log('  ✓ Beam Search'); passed++; }
            else { console.log('  ✗ Beam Search'); failed++; }
        } catch (e) { console.log('  ✗ Beam Search:', e.message); failed++; }
        
        // Test 3: Dijkstra
        try {
            const graph = {
                'A': [{ to: 'B', weight: 1 }, { to: 'C', weight: 4 }],
                'B': [{ to: 'C', weight: 2 }, { to: 'D', weight: 5 }],
                'C': [{ to: 'D', weight: 1 }],
                'D': []
            };
            const result = PRISM_SEARCH_ENHANCED.dijkstra(graph, 'A', 'D');
            if (result.pathCost === 4) { console.log('  ✓ Dijkstra Algorithm'); passed++; }
            else { console.log('  ✗ Dijkstra Algorithm'); failed++; }
        } catch (e) { console.log('  ✗ Dijkstra:', e.message); failed++; }
        
        // Test 4: Forward Checking CSP
        try {
            const csp = {
                variables: ['A', 'B', 'C'],
                domains: { 'A': [1,2,3], 'B': [1,2,3], 'C': [1,2,3] },
                constraints: [
                    { variables: ['A','B'], check: (a) => a['A'] !== a['B'] },
                    { variables: ['B','C'], check: (a) => a['B'] !== a['C'] },
                    { variables: ['A','C'], check: (a) => a['A'] !== a['C'] }
                ]
            };
            const result = PRISM_CSP_ENHANCED.forwardChecking(csp);
            if (result.solved) { console.log('  ✓ CSP Forward Checking'); passed++; }
            else { console.log('  ✗ CSP Forward Checking'); failed++; }
        } catch (e) { console.log('  ✗ CSP Forward Checking:', e.message); failed++; }
        
        // Test 5: Min-Conflicts
        try {
            const csp = {
                variables: ['A', 'B'],
                domains: { 'A': [1,2], 'B': [1,2] },
                constraints: [{ variables: ['A','B'], check: (a) => a['A'] !== a['B'] }]
            };
            const result = PRISM_CSP_ENHANCED.minConflicts(csp, 100);
            if (result.solved) { console.log('  ✓ CSP Min-Conflicts'); passed++; }
            else { console.log('  ✗ CSP Min-Conflicts'); failed++; }
        } catch (e) { console.log('  ✗ CSP Min-Conflicts:', e.message); failed++; }
        
        // Test 6: Potential Fields
        try {
            const result = PRISM_MOTION_PLANNING_ENHANCED.potentialFields({
                start: { x: 0, y: 0 },
                goal: { x: 10, y: 10 },
                obstacles: [],
                stepSize: 1,
                maxIterations: 100
            });
            if (result.success) { console.log('  ✓ Potential Fields Motion'); passed++; }
            else { console.log('  ✗ Potential Fields Motion'); failed++; }
        } catch (e) { console.log('  ✗ Potential Fields:', e.message); failed++; }
        
        // Test 7: Tool Change Optimization
        try {
            const operations = [
                { id: 1, tool: 'T1' },
                { id: 2, tool: 'T2' },
                { id: 3, tool: 'T1' },
                { id: 4, tool: 'T2' }
            ];
            const result = PRISM_MANUFACTURING_SEARCH.optimizeToolChanges(operations);
            if (result.found && result.cost <= 2) { console.log('  ✓ Tool Change Optimization'); passed++; }
            else { console.log('  ✗ Tool Change Optimization'); failed++; }
        } catch (e) { console.log('  ✗ Tool Change Optimization:', e.message); failed++; }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(` SESSION 2 TESTS: ${passed}/${passed + failed} passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
};

// Run tests on load
(function() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log(' PRISM SESSION 2 ENHANCEMENT - LOADED');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(' NEW MODULES:');
    console.log('   ✅ PRISM_SEARCH_ENHANCED: Best-First, Beam, Bidirectional, Dijkstra, UCS, Weighted A*');
    console.log('   ✅ PRISM_CSP_ENHANCED: Forward Checking, Conflict-Directed Backjumping, Min-Conflicts');
    console.log('   ✅ PRISM_MOTION_PLANNING_ENHANCED: Potential Fields, PRM');
    console.log('   ✅ PRISM_MANUFACTURING_SEARCH: Tool Change, Setup Planning, Rapid Optimization');
    console.log('');
    console.log(' GATEWAY ROUTES: 14 new routes (search.*, csp.*, motion.*, mfg.*)');
    console.log(' SOURCE: MIT 6.034, 6.006, 16.410');
    console.log('');
    
    const testResults = PRISM_SESSION2_TESTS.runAll();
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log(' SESSION 2 INTEGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
})();

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION 2B: ADDITIONAL SEARCH & OPTIMIZATION ALGORITHMS
// Version: 1.0.0 | Date: January 18, 2026
// Source: MIT 6.034, 6.046J, 18.453
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PRISM SESSION 2B: COMPLETE REMAINING GAPS
 * 
 * NEW ALGORITHMS:
 * - IDA* (Iterative Deepening A*)
 * - Hill Climbing (Steepest Ascent)
 * - Simulated Annealing (Search)
 * - Local Beam Search
 * - Particle Filtering
 * - Christofides TSP Approximation
 * - Hungarian Algorithm (Assignment)
 * - 2-Opt Local Search
 * 
 * GATEWAY ROUTES: 12 new routes
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: MEMORY-EFFICIENT SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

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
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: LOCAL SEARCH ALGORITHMS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_LOCAL_SEARCH = {
    name: 'PRISM_LOCAL_SEARCH',
    version: '1.0.0',
    source: 'MIT 6.034 - Local Search & Optimization',
    
    /**
     * Hill Climbing (Steepest Ascent)
     * Source: MIT 6.034 Lecture 6
     */
    hillClimbing: function(problem) {
        let current = problem.initial;
        let currentValue = problem.evaluate(current);
        let iterations = 0;
        const maxIterations = problem.maxIterations || 10000;
        const history = [{ state: current, value: currentValue }];
        
        while (iterations < maxIterations) {
            iterations++;
            
            const neighbors = problem.getNeighbors(current);
            if (neighbors.length === 0) break;
            
            // Find best neighbor (steepest ascent)
            let bestNeighbor = null;
            let bestValue = currentValue;
            
            for (const neighbor of neighbors) {
                const value = problem.evaluate(neighbor);
                if (problem.maximize ? value > bestValue : value < bestValue) {
                    bestValue = value;
                    bestNeighbor = neighbor;
                }
            }
            
            if (bestNeighbor === null) {
                // Local optimum reached
                return {
                    success: true,
                    solution: current,
                    value: currentValue,
                    iterations,
                    history,
                    localOptimum: true
                };
            }
            
            current = bestNeighbor;
            currentValue = bestValue;
            history.push({ state: current, value: currentValue });
        }
        
        return {
            success: true,
            solution: current,
            value: currentValue,
            iterations,
            history,
            localOptimum: iterations < maxIterations
        };
    },
    
    /**
     * Hill Climbing with Random Restarts
     */
    hillClimbingRestarts: function(problem, numRestarts = 10) {
        let bestSolution = null;
        let bestValue = problem.maximize ? -Infinity : Infinity;
        const results = [];
        
        for (let i = 0; i < numRestarts; i++) {
            // Generate random initial state
            const initialState = problem.randomState ? problem.randomState() : problem.initial;
            const restartProblem = { ...problem, initial: initialState };
            
            const result = this.hillClimbing(restartProblem);
            results.push(result);
            
            const isBetter = problem.maximize 
                ? result.value > bestValue 
                : result.value < bestValue;
            
            if (isBetter) {
                bestValue = result.value;
                bestSolution = result.solution;
            }
        }
        
        return {
            success: true,
            solution: bestSolution,
            value: bestValue,
            restarts: numRestarts,
            results
        };
    },
    
    /**
     * Simulated Annealing
     * Probabilistic local search that escapes local optima
     * Source: MIT 6.034 Lecture 6
     */
    simulatedAnnealing: function(config) {
        const {
            problem,
            initialTemp = 1000,
            coolingRate = 0.995,
            minTemp = 0.01,
            maxIterations = 100000
        } = config;
        
        let current = problem.initial;
        let currentEnergy = problem.evaluate(current);
        let best = current;
        let bestEnergy = currentEnergy;
        let temperature = initialTemp;
        let iterations = 0;
        const history = [];
        
        while (temperature > minTemp && iterations < maxIterations) {
            iterations++;
            
            // Generate random neighbor
            const neighbors = problem.getNeighbors(current);
            if (neighbors.length === 0) break;
            
            const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            const neighborEnergy = problem.evaluate(neighbor);
            
            // Calculate energy difference (minimization)
            const deltaE = neighborEnergy - currentEnergy;
            
            // Accept if better, or probabilistically if worse
            const acceptProbability = deltaE < 0 ? 1 : Math.exp(-deltaE / temperature);
            
            if (Math.random() < acceptProbability) {
                current = neighbor;
                currentEnergy = neighborEnergy;
                
                // Track best solution
                if (currentEnergy < bestEnergy) {
                    best = current;
                    bestEnergy = currentEnergy;
                }
            }
            
            // Cool down
            temperature *= coolingRate;
            
            // Record history periodically
            if (iterations % 100 === 0) {
                history.push({
                    iteration: iterations,
                    temperature,
                    currentEnergy,
                    bestEnergy
                });
            }
        }
        
        return {
            success: true,
            solution: best,
            energy: bestEnergy,
            finalTemp: temperature,
            iterations,
            history
        };
    },
    
    /**
     * Local Beam Search
     * Maintains k states instead of just one
     * Source: MIT 6.034
     */
    localBeamSearch: function(problem, k = 5) {
        // Initialize with k random states
        let states = [];
        for (let i = 0; i < k; i++) {
            const state = problem.randomState ? problem.randomState() : problem.initial;
            states.push({
                state,
                value: problem.evaluate(state)
            });
        }
        
        const maxIterations = problem.maxIterations || 1000;
        
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Check for goal
            for (const s of states) {
                if (problem.isGoal && problem.isGoal(s.state)) {
                    return {
                        found: true,
                        solution: s.state,
                        value: s.value,
                        iterations: iteration
                    };
                }
            }
            
            // Generate all successors of all states
            const allSuccessors = [];
            for (const s of states) {
                const neighbors = problem.getNeighbors(s.state);
                for (const neighbor of neighbors) {
                    allSuccessors.push({
                        state: neighbor,
                        value: problem.evaluate(neighbor)
                    });
                }
            }
            
            if (allSuccessors.length === 0) break;
            
            // Keep k best successors
            allSuccessors.sort((a, b) => 
                problem.maximize ? b.value - a.value : a.value - b.value
            );
            states = allSuccessors.slice(0, k);
        }
        
        // Return best state found
        states.sort((a, b) => 
            problem.maximize ? b.value - a.value : a.value - b.value
        );
        
        return {
            found: false,
            solution: states[0].state,
            value: states[0].value,
            allStates: states
        };
    },
    
    /**
     * 2-Opt Local Search for TSP
     * Iteratively improves tour by swapping edges
     * Source: MIT 18.453 - Combinatorial Optimization
     */
    twoOpt: function(tour, distanceMatrix) {
        let improved = true;
        let currentTour = [...tour];
        let iterations = 0;
        const maxIterations = 10000;
        
        const tourLength = (t) => {
            let length = 0;
            for (let i = 0; i < t.length - 1; i++) {
                length += distanceMatrix[t[i]][t[i + 1]];
            }
            length += distanceMatrix[t[t.length - 1]][t[0]]; // Return to start
            return length;
        };
        
        let currentLength = tourLength(currentTour);
        
        while (improved && iterations < maxIterations) {
            improved = false;
            iterations++;
            
            for (let i = 0; i < currentTour.length - 1; i++) {
                for (let j = i + 2; j < currentTour.length; j++) {
                    // Skip adjacent edges
                    if (j === i + 1) continue;
                    
                    // Calculate improvement from 2-opt swap
                    const a = currentTour[i];
                    const b = currentTour[i + 1];
                    const c = currentTour[j];
                    const d = currentTour[(j + 1) % currentTour.length];
                    
                    const currentDist = distanceMatrix[a][b] + distanceMatrix[c][d];
                    const newDist = distanceMatrix[a][c] + distanceMatrix[b][d];
                    
                    if (newDist < currentDist - 1e-10) {
                        // Perform 2-opt swap: reverse segment between i+1 and j
                        const newTour = [
                            ...currentTour.slice(0, i + 1),
                            ...currentTour.slice(i + 1, j + 1).reverse(),
                            ...currentTour.slice(j + 1)
                        ];
                        currentTour = newTour;
                        currentLength = tourLength(currentTour);
                        improved = true;
                    }
                }
            }
        }
        
        return {
            tour: currentTour,
            length: currentLength,
            iterations,
            improved: iterations > 1
        };
    },
    
    /**
     * 3-Opt Local Search for TSP
     * More powerful but slower than 2-opt
     */
    threeOpt: function(tour, distanceMatrix, maxIterations = 1000) {
        let currentTour = [...tour];
        let improved = true;
        let iterations = 0;
        
        const tourLength = (t) => {
            let length = 0;
            for (let i = 0; i < t.length; i++) {
                length += distanceMatrix[t[i]][t[(i + 1) % t.length]];
            }
            return length;
        };
        
        let currentLength = tourLength(currentTour);
        
        while (improved && iterations < maxIterations) {
            improved = false;
            iterations++;
            
            for (let i = 0; i < currentTour.length - 2; i++) {
                for (let j = i + 2; j < currentTour.length - 1; j++) {
                    for (let k = j + 2; k < currentTour.length + (i > 0 ? 1 : 0); k++) {
                        const kMod = k % currentTour.length;
                        
                        // Try all 3-opt reconnections
                        const segments = this._get3OptSegments(currentTour, i, j, kMod);
                        
                        for (const newTour of segments) {
                            const newLength = tourLength(newTour);
                            if (newLength < currentLength - 1e-10) {
                                currentTour = newTour;
                                currentLength = newLength;
                                improved = true;
                                break;
                            }
                        }
                        if (improved) break;
                    }
                    if (improved) break;
                }
                if (improved) break;
            }
        }
        
        return {
            tour: currentTour,
            length: currentLength,
            iterations
        };
    },
    
    _get3OptSegments: function(tour, i, j, k) {
        const n = tour.length;
        const segments = [];
        
        // Segment A: 0 to i
        const A = tour.slice(0, i + 1);
        // Segment B: i+1 to j
        const B = tour.slice(i + 1, j + 1);
        // Segment C: j+1 to k
        const C = tour.slice(j + 1, k + 1);
        // Segment D: k+1 to end
        const D = k + 1 < n ? tour.slice(k + 1) : [];
        
        // All valid reconnections (excluding original)
        segments.push([...A, ...B.slice().reverse(), ...C, ...D]);
        segments.push([...A, ...B, ...C.slice().reverse(), ...D]);
        segments.push([...A, ...B.slice().reverse(), ...C.slice().reverse(), ...D]);
        segments.push([...A, ...C, ...B, ...D]);
        segments.push([...A, ...C.slice().reverse(), ...B, ...D]);
        segments.push([...A, ...C, ...B.slice().reverse(), ...D]);
        segments.push([...A, ...C.slice().reverse(), ...B.slice().reverse(), ...D]);
        
        return segments.filter(s => s.length === n);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: PROBABILISTIC ALGORITHMS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_PARTICLE_FILTER = {
    name: 'PRISM_PARTICLE_FILTER',
    version: '1.0.0',
    source: 'MIT 16.410 - Probabilistic State Estimation',
    
    /**
     * Particle Filter (Sequential Monte Carlo)
     * Real-time state estimation under uncertainty
     * Source: MIT 16.410 Lecture 18
     */
    create: function(config) {
        const {
            numParticles = 1000,
            initialDistribution,  // Function: () => particle
            motionModel,          // Function: (particle, control) => newParticle
            measurementModel,     // Function: (particle, measurement) => weight
            resampleThreshold = 0.5
        } = config;
        
        // Initialize particles
        let particles = [];
        let weights = [];
        
        for (let i = 0; i < numParticles; i++) {
            particles.push(initialDistribution());
            weights.push(1 / numParticles);
        }
        
        return {
            particles,
            weights,
            numParticles,
            motionModel,
            measurementModel,
            resampleThreshold,
            
            /**
             * Prediction step - propagate particles through motion model
             */
            predict: function(control) {
                this.particles = this.particles.map(p => this.motionModel(p, control));
            },
            
            /**
             * Update step - weight particles by measurement likelihood
             */
            update: function(measurement) {
                // Calculate weights
                this.weights = this.particles.map(p => this.measurementModel(p, measurement));
                
                // Normalize weights
                const weightSum = this.weights.reduce((a, b) => a + b, 0);
                if (weightSum > 0) {
                    this.weights = this.weights.map(w => w / weightSum);
                } else {
                    // All weights zero - uniform
                    this.weights = this.weights.map(() => 1 / this.numParticles);
                }
                
                // Check if resampling needed
                const nEff = 1 / this.weights.reduce((sum, w) => sum + w * w, 0);
                if (nEff < this.resampleThreshold * this.numParticles) {
                    this.resample();
                }
            },
            
            /**
             * Resample particles based on weights (low variance resampling)
             */
            resample: function() {
                const newParticles = [];
                const cumWeights = [];
                let cumSum = 0;
                
                for (const w of this.weights) {
                    cumSum += w;
                    cumWeights.push(cumSum);
                }
                
                // Low variance resampling
                const r = Math.random() / this.numParticles;
                let j = 0;
                
                for (let i = 0; i < this.numParticles; i++) {
                    const u = r + i / this.numParticles;
                    while (u > cumWeights[j] && j < this.numParticles - 1) {
                        j++;
                    }
                    newParticles.push(JSON.parse(JSON.stringify(this.particles[j])));
                }
                
                this.particles = newParticles;
                this.weights = this.weights.map(() => 1 / this.numParticles);
            },
            
            /**
             * Get estimated state (weighted mean)
             */
            getEstimate: function() {
                if (typeof this.particles[0] === 'number') {
                    return this.particles.reduce((sum, p, i) => sum + p * this.weights[i], 0);
                }
                
                // For object states, compute weighted mean of each property
                const estimate = {};
                const sample = this.particles[0];
                
                for (const key in sample) {
                    if (typeof sample[key] === 'number') {
                        estimate[key] = this.particles.reduce(
                            (sum, p, i) => sum + p[key] * this.weights[i], 0
                        );
                    }
                }
                
                return estimate;
            },
            
            /**
             * Get uncertainty (weighted covariance)
             */
            getUncertainty: function() {
                const mean = this.getEstimate();
                
                if (typeof mean === 'number') {
                    return Math.sqrt(
                        this.particles.reduce((sum, p, i) => 
                            sum + this.weights[i] * Math.pow(p - mean, 2), 0
                        )
                    );
                }
                
                const variance = {};
                for (const key in mean) {
                    variance[key] = Math.sqrt(
                        this.particles.reduce((sum, p, i) =>
                            sum + this.weights[i] * Math.pow(p[key] - mean[key], 2), 0
                        )
                    );
                }
                return variance;
            }
        };
    },
    
    /**
     * Tool Wear Particle Filter
     * Manufacturing-specific application
     */
    createToolWearFilter: function(config = {}) {
        const {
            numParticles = 500,
            initialWear = 0,
            wearRate = 0.001,  // mm per minute
            wearNoise = 0.0002,
            measurementNoise = 0.01
        } = config;
        
        return this.create({
            numParticles,
            
            initialDistribution: () => ({
                wear: initialWear + (Math.random() - 0.5) * 0.01,
                wearRate: wearRate + (Math.random() - 0.5) * wearRate * 0.2
            }),
            
            motionModel: (particle, cuttingTime) => ({
                wear: particle.wear + particle.wearRate * cuttingTime + 
                      (Math.random() - 0.5) * wearNoise * cuttingTime,
                wearRate: particle.wearRate + (Math.random() - 0.5) * wearNoise
            }),
            
            measurementModel: (particle, measuredWear) => {
                const error = Math.abs(particle.wear - measuredWear);
                return Math.exp(-error * error / (2 * measurementNoise * measurementNoise));
            }
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: COMBINATORIAL OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_COMBINATORIAL = {
    name: 'PRISM_COMBINATORIAL',
    version: '1.0.0',
    source: 'MIT 18.453 - Combinatorial Optimization',
    
    /**
     * Hungarian Algorithm (Kuhn-Munkres)
     * Optimal assignment problem O(n³)
     * Source: MIT 18.453
     */
    hungarian: function(costMatrix) {
        const n = costMatrix.length;
        const m = costMatrix[0].length;
        
        // Pad to square if needed
        const size = Math.max(n, m);
        const matrix = [];
        for (let i = 0; i < size; i++) {
            matrix[i] = [];
            for (let j = 0; j < size; j++) {
                if (i < n && j < m) {
                    matrix[i][j] = costMatrix[i][j];
                } else {
                    matrix[i][j] = 0; // Dummy assignments have zero cost
                }
            }
        }
        
        // Step 1: Subtract row minimum
        for (let i = 0; i < size; i++) {
            const minVal = Math.min(...matrix[i]);
            for (let j = 0; j < size; j++) {
                matrix[i][j] -= minVal;
            }
        }
        
        // Step 2: Subtract column minimum
        for (let j = 0; j < size; j++) {
            let minVal = Infinity;
            for (let i = 0; i < size; i++) {
                minVal = Math.min(minVal, matrix[i][j]);
            }
            for (let i = 0; i < size; i++) {
                matrix[i][j] -= minVal;
            }
        }
        
        // Steps 3-5: Find optimal assignment
        const assignment = this._hungarianAssign(matrix, size);
        
        // Calculate total cost using original matrix
        let totalCost = 0;
        const result = [];
        for (let i = 0; i < n; i++) {
            if (assignment[i] < m) {
                result.push({ row: i, col: assignment[i] });
                totalCost += costMatrix[i][assignment[i]];
            }
        }
        
        return { assignment: result, cost: totalCost };
    },
    
    _hungarianAssign: function(matrix, n) {
        const u = new Array(n + 1).fill(0);
        const v = new Array(n + 1).fill(0);
        const p = new Array(n + 1).fill(0);
        const way = new Array(n + 1).fill(0);
        
        for (let i = 1; i <= n; i++) {
            p[0] = i;
            let j0 = 0;
            const minv = new Array(n + 1).fill(Infinity);
            const used = new Array(n + 1).fill(false);
            
            do {
                used[j0] = true;
                const i0 = p[j0];
                let delta = Infinity;
                let j1 = 0;
                
                for (let j = 1; j <= n; j++) {
                    if (!used[j]) {
                        const cur = matrix[i0 - 1][j - 1] - u[i0] - v[j];
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
                
                for (let j = 0; j <= n; j++) {
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
        
        const result = new Array(n);
        for (let j = 1; j <= n; j++) {
            if (p[j] !== 0) {
                result[p[j] - 1] = j - 1;
            }
        }
        return result;
    },
    
    /**
     * Christofides Algorithm for TSP
     * 1.5-approximation for metric TSP
     * Source: MIT 18.453
     */
    christofides: function(distanceMatrix) {
        const n = distanceMatrix.length;
        
        // Step 1: Find Minimum Spanning Tree (Prim's)
        const mst = this._primMST(distanceMatrix);
        
        // Step 2: Find odd-degree vertices
        const degree = new Array(n).fill(0);
        for (const edge of mst) {
            degree[edge.from]++;
            degree[edge.to]++;
        }
        const oddVertices = [];
        for (let i = 0; i < n; i++) {
            if (degree[i] % 2 === 1) {
                oddVertices.push(i);
            }
        }
        
        // Step 3: Minimum weight matching on odd vertices
        const matching = this._minWeightMatching(oddVertices, distanceMatrix);
        
        // Step 4: Combine MST and matching to form Eulerian graph
        const eulerianEdges = [...mst, ...matching];
        
        // Step 5: Find Eulerian tour
        const eulerianTour = this._findEulerianTour(eulerianEdges, n);
        
        // Step 6: Convert to Hamiltonian tour (skip repeated vertices)
        const visited = new Set();
        const tour = [];
        for (const v of eulerianTour) {
            if (!visited.has(v)) {
                visited.add(v);
                tour.push(v);
            }
        }
        
        // Step 7: Apply 2-opt improvement
        const improved = PRISM_LOCAL_SEARCH.twoOpt(tour, distanceMatrix);
        
        return {
            tour: improved.tour,
            length: improved.length,
            mstWeight: mst.reduce((sum, e) => sum + e.weight, 0),
            matchingWeight: matching.reduce((sum, e) => sum + e.weight, 0)
        };
    }