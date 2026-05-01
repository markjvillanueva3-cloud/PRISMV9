const PRISM_MANUFACTURING_SEARCH_ENGINE = {
    name: 'PRISM_MANUFACTURING_SEARCH_ENGINE',
    version: '1.0.0',
    description: 'Manufacturing-specific search applications',
    source: 'MIT 2.008, MIT 16.410',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Optimal Hole Sequence Search (TSP-like)
    // Uses A* with MST heuristic
    // ─────────────────────────────────────────────────────────────────────────────
    
    optimizeHoleSequence: function(holes, options = {}) {
        const {
            startPosition = { x: 0, y: 0, z: 50 },
            rapidFeed = 10000, // mm/min
            maxSearchTime = 5000 // ms
        } = options;
        
        if (holes.length === 0) return { sequence: [], totalDistance: 0 };
        if (holes.length === 1) return { sequence: [0], totalDistance: this._distance3D(startPosition, holes[0]) };
        
        const startTime = Date.now();
        
        // For small problems, use exact A* with MST heuristic
        if (holes.length <= 12) {
            return this._astarTSP(holes, startPosition, maxSearchTime);
        }
        
        // For larger problems, use nearest neighbor + 2-opt improvement
        return this._nearestNeighborWithImprovement(holes, startPosition);
    },
    
    _astarTSP: function(holes, startPosition, maxTime) {
        const n = holes.length;
        const startState = {
            visited: new Set(),
            current: -1, // -1 = start position
            path: []
        };
        
        const pq = [{
            state: startState,
            g: 0,
            f: this._mstHeuristic(holes, new Set())
        }];
        
        const visited = new Set();
        const startTime = Date.now();
        
        while (pq.length > 0) {
            if (Date.now() - startTime > maxTime) {
                // Timeout - return best found
                return this._nearestNeighborWithImprovement(holes, startPosition);
            }
            
            // Get lowest f
            pq.sort((a, b) => a.f - b.f);
            const { state, g } = pq.shift();
            
            const stateKey = Array.from(state.visited).sort().join(',') + ':' + state.current;
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);
            
            // Goal check
            if (state.visited.size === n) {
                return {
                    sequence: state.path,
                    totalDistance: g,
                    method: 'A* with MST heuristic',
                    nodesExpanded: visited.size
                };
            }
            
            // Expand
            const currentPos = state.current === -1 ? startPosition : holes[state.current];
            
            for (let i = 0; i < n; i++) {
                if (state.visited.has(i)) continue;
                
                const newVisited = new Set(state.visited);
                newVisited.add(i);
                
                const stepCost = this._distance3D(currentPos, holes[i]);
                const newG = g + stepCost;
                const h = this._mstHeuristic(holes, newVisited);
                
                pq.push({
                    state: {
                        visited: newVisited,
                        current: i,
                        path: [...state.path, i]
                    },
                    g: newG,
                    f: newG + h
                });
            }
        }
        
        return { sequence: [], totalDistance: Infinity };
    },
    
    _mstHeuristic: function(holes, visited) {
        // Minimum spanning tree of unvisited nodes
        const unvisited = [];
        for (let i = 0; i < holes.length; i++) {
            if (!visited.has(i)) unvisited.push(i);
        }
        
        if (unvisited.length <= 1) return 0;
        
        // Prim's algorithm for MST
        const inMST = new Set([unvisited[0]]);
        let mstWeight = 0;
        
        while (inMST.size < unvisited.length) {
            let minEdge = Infinity;
            let nextNode = -1;
            
            for (const u of inMST) {
                for (const v of unvisited) {
                    if (!inMST.has(v)) {
                        const dist = this._distance3D(holes[u], holes[v]);
                        if (dist < minEdge) {
                            minEdge = dist;
                            nextNode = v;
                        }
                    }
                }
            }
            
            if (nextNode !== -1) {
                inMST.add(nextNode);
                mstWeight += minEdge;
            }
        }
        
        return mstWeight;
    },
    
    _nearestNeighborWithImprovement: function(holes, startPosition) {
        // Nearest neighbor construction
        const n = holes.length;
        const visited = new Set();
        const sequence = [];
        let currentPos = startPosition;
        let totalDistance = 0;
        
        for (let i = 0; i < n; i++) {
            let nearestIdx = -1;
            let nearestDist = Infinity;
            
            for (let j = 0; j < n; j++) {
                if (!visited.has(j)) {
                    const dist = this._distance3D(currentPos, holes[j]);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = j;
                    }
                }
            }
            
            visited.add(nearestIdx);
            sequence.push(nearestIdx);
            totalDistance += nearestDist;
            currentPos = holes[nearestIdx];
        }
        
        // 2-opt improvement
        const improved = this._twoOpt(sequence, holes, startPosition);
        
        return {
            sequence: improved.sequence,
            totalDistance: improved.totalDistance,
            method: 'Nearest Neighbor + 2-opt'
        };
    },
    
    _twoOpt: function(sequence, holes, startPosition) {
        let improved = true;
        let bestSequence = [...sequence];
        let bestDistance = this._calculateTourDistance(bestSequence, holes, startPosition);
        
        while (improved) {
            improved = false;
            
            for (let i = 0; i < bestSequence.length - 1; i++) {
                for (let j = i + 2; j < bestSequence.length; j++) {
                    // Try reversing segment [i+1, j]
                    const newSequence = [
                        ...bestSequence.slice(0, i + 1),
                        ...bestSequence.slice(i + 1, j + 1).reverse(),
                        ...bestSequence.slice(j + 1)
                    ];
                    
                    const newDistance = this._calculateTourDistance(newSequence, holes, startPosition);
                    
                    if (newDistance < bestDistance - 0.001) {
                        bestSequence = newSequence;
                        bestDistance = newDistance;
                        improved = true;
                    }
                }
            }
        }
        
        return { sequence: bestSequence, totalDistance: bestDistance };
    },
    
    _calculateTourDistance: function(sequence, holes, startPosition) {
        let distance = this._distance3D(startPosition, holes[sequence[0]]);
        
        for (let i = 0; i < sequence.length - 1; i++) {
            distance += this._distance3D(holes[sequence[i]], holes[sequence[i + 1]]);
        }
        
        return distance;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Operation Sequencing (Precedence-constrained scheduling)
    // ─────────────────────────────────────────────────────────────────────────────
    
    sequenceOperations: function(operations, precedenceConstraints, objective = 'makespan') {
        // operations: [{id, duration, machine, setup_time}]
        // precedenceConstraints: [{before, after}]
        
        // Build precedence graph
        const inDegree = {};
        const successors = {};
        
        for (const op of operations) {
            inDegree[op.id] = 0;
            successors[op.id] = [];
        }
        
        for (const { before, after } of precedenceConstraints) {
            successors[before].push(after);
            inDegree[after]++;
        }
        
        // Topological sort with priority
        const ready = operations.filter(op => inDegree[op.id] === 0);
        const sequence = [];
        const opMap = new Map(operations.map(op => [op.id, op]));
        
        // Priority function (critical path heuristic)
        const priority = {};
        const calculatePriority = (id) => {
            if (priority[id] !== undefined) return priority[id];
            
            const op = opMap.get(id);
            let maxSuccessorPriority = 0;
            
            for (const succ of successors[id]) {
                maxSuccessorPriority = Math.max(maxSuccessorPriority, calculatePriority(succ));
            }
            
            priority[id] = op.duration + maxSuccessorPriority;
            return priority[id];
        };
        
        for (const op of operations) {
            calculatePriority(op.id);
        }
        
        // Process in priority order
        while (ready.length > 0) {
            // Sort by priority (longest remaining path first)
            ready.sort((a, b) => priority[b.id] - priority[a.id]);
            
            const op = ready.shift();
            sequence.push(op.id);
            
            for (const succ of successors[op.id]) {
                inDegree[succ]--;
                if (inDegree[succ] === 0) {
                    ready.push(opMap.get(succ));
                }
            }
        }
        
        // Verify all operations scheduled
        if (sequence.length !== operations.length) {
            return { success: false, reason: 'Cyclic dependency detected' };
        }
        
        // Calculate makespan
        const startTimes = {};
        const endTimes = {};
        
        for (const id of sequence) {
            const op = opMap.get(id);
            let earliestStart = 0;
            
            // Find latest predecessor end time
            for (const { before, after } of precedenceConstraints) {
                if (after === id && endTimes[before] !== undefined) {
                    earliestStart = Math.max(earliestStart, endTimes[before]);
                }
            }
            
            startTimes[id] = earliestStart;
            endTimes[id] = earliestStart + op.duration;
        }
        
        const makespan = Math.max(...Object.values(endTimes));
        
        return {
            success: true,
            sequence,
            startTimes,
            endTimes,
            makespan,
            criticalPath: this._findCriticalPath(operations, precedenceConstraints, endTimes)
        };
    },
    
    _findCriticalPath: function(operations, constraints, endTimes) {
        const makespan = Math.max(...Object.values(endTimes));
        const opMap = new Map(operations.map(op => [op.id, op]));
        
        // Find operations that end at makespan
        const critical = [];
        for (const op of operations) {
            if (Math.abs(endTimes[op.id] - makespan) < 0.001) {
                critical.push(op.id);
            }
        }
        
        return critical;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Change Optimization
    // ─────────────────────────────────────────────────────────────────────────────
    
    optimizeToolChanges: function(operations, toolLibrary, magazineCapacity) {
        // Group operations by tool
        const toolOps = new Map();
        for (const op of operations) {
            if (!toolOps.has(op.tool)) {
                toolOps.set(op.tool, []);
            }
            toolOps.get(op.tool).push(op);
        }
        
        // Bin packing to minimize tool changes
        const uniqueTools = [...toolOps.keys()];
        
        if (uniqueTools.length <= magazineCapacity) {
            // All tools fit - no optimization needed
            return {
                success: true,
                sequences: [operations.map(op => op.id)],
                toolChanges: 0,
                toolSets: [uniqueTools]
            };
        }
        
        // Use first-fit decreasing for tool grouping
        const sequences = [];
        const toolSets = [];
        const assigned = new Set();
        
        // Sort tools by number of operations (most used first)
        uniqueTools.sort((a, b) => toolOps.get(b).length - toolOps.get(a).length);
        
        while (assigned.size < uniqueTools.length) {
            const currentSet = [];
            
            for (const tool of uniqueTools) {
                if (!assigned.has(tool) && currentSet.length < magazineCapacity) {
                    currentSet.push(tool);
                    assigned.add(tool);
                }
            }
            
            toolSets.push(currentSet);
            
            // Sequence operations for this tool set
            const setOps = operations.filter(op => currentSet.includes(op.tool));
            sequences.push(setOps.map(op => op.id));
        }
        
        return {
            success: true,
            sequences,
            toolChanges: toolSets.length - 1,
            toolSets
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Setup Planning (CSP-based)
    // ─────────────────────────────────────────────────────────────────────────────
    
    planSetups: function(features, fixtures, constraints) {
        // Model as CSP: assign each feature to a setup
        const csp = {
            variables: features.map(f => f.id),
            domains: {},
            constraints: []
        };
        
        // Domain is possible setups (based on accessibility)
        for (const feature of features) {
            csp.domains[feature.id] = fixtures
                .filter(fix => this._isAccessible(feature, fix))
                .map(fix => fix.id);
        }
        
        // Add constraints
        for (const c of constraints) {
            if (c.type === 'same_setup') {
                // Features must be in same setup
                csp.constraints.push({
                    variables: [c.feature1, c.feature2],
                    check: (assignment) => assignment[c.feature1] === assignment[c.feature2]
                });
            } else if (c.type === 'different_setup') {
                // Features must be in different setups
                csp.constraints.push({
                    variables: [c.feature1, c.feature2],
                    check: (assignment) => assignment[c.feature1] !== assignment[c.feature2]
                });
            }
        }
        
        // Solve using backtracking with MRV heuristic
        const solution = this._solveCSP(csp);
        
        if (!solution) {
            return { success: false, reason: 'No valid setup assignment found' };
        }
        
        // Group features by setup
        const setupGroups = {};
        for (const featureId in solution) {
            const setupId = solution[featureId];
            if (!setupGroups[setupId]) {
                setupGroups[setupId] = [];
            }
            setupGroups[setupId].push(featureId);
        }
        
        return {
            success: true,
            assignment: solution,
            setups: setupGroups,
            setupCount: Object.keys(setupGroups).length
        };
    },
    
    _isAccessible: function(feature, fixture) {
        // Check if feature can be machined in this fixture orientation
        // This is a simplified check - real implementation would be more complex
        const approach = feature.approach || { x: 0, y: 0, z: 1 };
        const fixtureNormal = fixture.normal || { x: 0, y: 0, z: 1 };
        
        // Dot product to check if approach direction aligns with fixture
        const dot = approach.x * fixtureNormal.x + 
                   approach.y * fixtureNormal.y + 
                   approach.z * fixtureNormal.z;
        
        return dot > 0.5; // Within 60 degrees
    },
    
    _solveCSP: function(csp) {
        const assignment = {};
        
        const backtrack = () => {
            // Select unassigned variable (MRV - Minimum Remaining Values)
            let minRemainingValues = Infinity;
            let selectedVar = null;
            
            for (const variable of csp.variables) {
                if (assignment[variable] === undefined) {
                    const validValues = csp.domains[variable].filter(value =>
                        this._isConsistent(assignment, variable, value, csp.constraints)
                    );
                    
                    if (validValues.length < minRemainingValues) {
                        minRemainingValues = validValues.length;
                        selectedVar = variable;
                    }
                }
            }
            
            if (!selectedVar) {
                // All variables assigned
                return true;
            }
            
            // Try values for selected variable
            const validValues = csp.domains[selectedVar].filter(value =>
                this._isConsistent(assignment, selectedVar, value, csp.constraints)
            );
            
            for (const value of validValues) {
                assignment[selectedVar] = value;
                
                if (backtrack()) {
                    return true;
                }
                
                delete assignment[selectedVar];
            }
            
            return false;
        };
        
        return backtrack() ? assignment : null;
    },
    
    _isConsistent: function(assignment, variable, value, constraints) {
        const testAssignment = { ...assignment, [variable]: value };
        
        for (const constraint of constraints) {
            // Check if all variables in constraint are assigned
            const allAssigned = constraint.variables.every(v => testAssignment[v] !== undefined);
            
            if (allAssigned && !constraint.check(testAssignment)) {
                return false;
            }
        }
        
        return true;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Utility Functions
    // ─────────────────────────────────────────────────────────────────────────────
    
    _distance3D: function(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.y - p1.y, 2) +
            Math.pow(p2.z - p1.z, 2)
        );
    }
}