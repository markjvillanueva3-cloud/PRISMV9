const PRISM_SEARCH_ENHANCED_ENGINE = {
    name: 'PRISM_SEARCH_ENHANCED_ENGINE',
    version: '1.0.0',
    description: 'Advanced search algorithms with heap-based priority queues',
    source: 'MIT 6.046J, MIT 16.410',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Min-Heap Priority Queue (for efficient search)
    // ─────────────────────────────────────────────────────────────────────────────
    
    createPriorityQueue: function() {
        return {
            heap: [],
            keyMap: new Map(), // For decrease-key operations
            
            push: function(item, priority) {
                const node = { item, priority, index: this.heap.length };
                this.heap.push(node);
                const key = JSON.stringify(item);
                this.keyMap.set(key, node);
                this._bubbleUp(node.index);
            },
            
            pop: function() {
                if (this.heap.length === 0) return null;
                const min = this.heap[0];
                const last = this.heap.pop();
                if (this.heap.length > 0) {
                    this.heap[0] = last;
                    last.index = 0;
                    this._bubbleDown(0);
                }
                this.keyMap.delete(JSON.stringify(min.item));
                return min.item;
            },
            
            decreaseKey: function(item, newPriority) {
                const key = JSON.stringify(item);
                const node = this.keyMap.get(key);
                if (node && newPriority < node.priority) {
                    node.priority = newPriority;
                    this._bubbleUp(node.index);
                }
            },
            
            contains: function(item) {
                return this.keyMap.has(JSON.stringify(item));
            },
            
            isEmpty: function() {
                return this.heap.length === 0;
            },
            
            _bubbleUp: function(index) {
                while (index > 0) {
                    const parent = Math.floor((index - 1) / 2);
                    if (this.heap[parent].priority <= this.heap[index].priority) break;
                    this._swap(parent, index);
                    index = parent;
                }
            },
            
            _bubbleDown: function(index) {
                const length = this.heap.length;
                while (true) {
                    const left = 2 * index + 1;
                    const right = 2 * index + 2;
                    let smallest = index;
                    
                    if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
                        smallest = left;
                    }
                    if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
                        smallest = right;
                    }
                    if (smallest === index) break;
                    
                    this._swap(index, smallest);
                    index = smallest;
                }
            },
            
            _swap: function(i, j) {
                [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
                this.heap[i].index = i;
                this.heap[j].index = j;
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dijkstra's Algorithm (Optimal for non-negative weights)
    // ─────────────────────────────────────────────────────────────────────────────
    
    dijkstra: function(graph, start, goal = null) {
        const dist = new Map();
        const prev = new Map();
        const pq = this.createPriorityQueue();
        
        // Initialize
        for (const node of graph.nodes) {
            dist.set(node, Infinity);
        }
        dist.set(start, 0);
        pq.push(start, 0);
        
        let iterations = 0;
        const maxIter = graph.maxIterations || 100000;
        
        while (!pq.isEmpty() && iterations < maxIter) {
            iterations++;
            const u = pq.pop();
            
            if (goal !== null && u === goal) {
                return this._reconstructDijkstraPath(prev, goal, dist.get(goal));
            }
            
            const neighbors = graph.getNeighbors ? graph.getNeighbors(u) : (graph.edges[u] || []);
            
            for (const { node: v, weight } of neighbors) {
                const alt = dist.get(u) + weight;
                if (alt < dist.get(v)) {
                    dist.set(v, alt);
                    prev.set(v, u);
                    if (pq.contains(v)) {
                        pq.decreaseKey(v, alt);
                    } else {
                        pq.push(v, alt);
                    }
                }
            }
        }
        
        return { distances: Object.fromEntries(dist), previous: Object.fromEntries(prev), iterations };
    },
    
    _reconstructDijkstraPath: function(prev, goal, cost) {
        const path = [];
        let current = goal;
        while (current !== undefined) {
            path.unshift(current);
            current = prev.get(current);
        }
        return { found: true, path, cost };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Uniform Cost Search (A* with h=0)
    // ─────────────────────────────────────────────────────────────────────────────
    
    uniformCostSearch: function(problem) {
        const pq = this.createPriorityQueue();
        const visited = new Set();
        const gScore = new Map();
        const cameFrom = new Map();
        
        const startKey = JSON.stringify(problem.initial);
        pq.push(problem.initial, 0);
        gScore.set(startKey, 0);
        
        let iterations = 0;
        const maxIter = problem.maxIterations || 10000;
        
        while (!pq.isEmpty() && iterations < maxIter) {
            iterations++;
            const current = pq.pop();
            const currentKey = JSON.stringify(current);
            
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);
            
            if (problem.isGoal(current)) {
                return this._reconstructUCSPath(cameFrom, currentKey, gScore.get(currentKey));
            }
            
            const successors = problem.getSuccessors(current);
            for (const { state, action, cost } of successors) {
                const neighborKey = JSON.stringify(state);
                if (visited.has(neighborKey)) continue;
                
                const newG = gScore.get(currentKey) + cost;
                const existingG = gScore.get(neighborKey);
                
                if (existingG === undefined || newG < existingG) {
                    gScore.set(neighborKey, newG);
                    cameFrom.set(neighborKey, { parent: currentKey, action, cost });
                    pq.push(state, newG);
                }
            }
        }
        
        return { found: false, iterations };
    },
    
    _reconstructUCSPath: function(cameFrom, goalKey, totalCost) {
        const path = [];
        let current = goalKey;
        while (cameFrom.has(current)) {
            const { parent, action, cost } = cameFrom.get(current);
            path.unshift({ action, cost });
            current = parent;
        }
        return { found: true, path, totalCost, pathLength: path.length };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Best-First Search (Greedy)
    // ─────────────────────────────────────────────────────────────────────────────
    
    bestFirstSearch: function(problem) {
        const pq = this.createPriorityQueue();
        const visited = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        
        const startKey = JSON.stringify(problem.initial);
        pq.push(problem.initial, problem.heuristic(problem.initial));
        gScore.set(startKey, 0);
        
        let iterations = 0;
        const maxIter = problem.maxIterations || 10000;
        
        while (!pq.isEmpty() && iterations < maxIter) {
            iterations++;
            const current = pq.pop();
            const currentKey = JSON.stringify(current);
            
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);
            
            if (problem.isGoal(current)) {
                return this._reconstructUCSPath(cameFrom, currentKey, gScore.get(currentKey));
            }
            
            for (const { state, action, cost } of problem.getSuccessors(current)) {
                const neighborKey = JSON.stringify(state);
                if (!visited.has(neighborKey)) {
                    const newG = gScore.get(currentKey) + cost;
                    if (!gScore.has(neighborKey)) {
                        gScore.set(neighborKey, newG);
                        cameFrom.set(neighborKey, { parent: currentKey, action, cost });
                        pq.push(state, problem.heuristic(state)); // Priority = heuristic only
                    }
                }
            }
        }
        
        return { found: false, iterations };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Bidirectional Search
    // ─────────────────────────────────────────────────────────────────────────────
    
    bidirectionalSearch: function(problem) {
        const forwardFrontier = [{ state: problem.initial, path: [], cost: 0 }];
        const backwardFrontier = [{ state: problem.goal, path: [], cost: 0 }];
        
        const forwardVisited = new Map();
        const backwardVisited = new Map();
        
        forwardVisited.set(JSON.stringify(problem.initial), { path: [], cost: 0 });
        backwardVisited.set(JSON.stringify(problem.goal), { path: [], cost: 0 });
        
        let iterations = 0;
        const maxIter = problem.maxIterations || 10000;
        
        while (forwardFrontier.length > 0 && backwardFrontier.length > 0 && iterations < maxIter) {
            iterations++;
            
            // Expand forward
            if (forwardFrontier.length > 0) {
                const current = forwardFrontier.shift();
                const currentKey = JSON.stringify(current.state);
                
                for (const { state, action, cost } of problem.getSuccessors(current.state)) {
                    const neighborKey = JSON.stringify(state);
                    
                    // Check if we've met the backward search
                    if (backwardVisited.has(neighborKey)) {
                        const backward = backwardVisited.get(neighborKey);
                        return {
                            found: true,
                            forwardPath: [...current.path, action],
                            backwardPath: backward.path.reverse(),
                            totalCost: current.cost + cost + backward.cost,
                            iterations
                        };
                    }
                    
                    if (!forwardVisited.has(neighborKey)) {
                        const newPath = [...current.path, action];
                        const newCost = current.cost + cost;
                        forwardVisited.set(neighborKey, { path: newPath, cost: newCost });
                        forwardFrontier.push({ state, path: newPath, cost: newCost });
                    }
                }
            }
            
            // Expand backward (if reverse successors available)
            if (backwardFrontier.length > 0 && problem.getReverseSuccessors) {
                const current = backwardFrontier.shift();
                const currentKey = JSON.stringify(current.state);
                
                for (const { state, action, cost } of problem.getReverseSuccessors(current.state)) {
                    const neighborKey = JSON.stringify(state);
                    
                    if (forwardVisited.has(neighborKey)) {
                        const forward = forwardVisited.get(neighborKey);
                        return {
                            found: true,
                            forwardPath: forward.path,
                            backwardPath: [action, ...current.path],
                            totalCost: forward.cost + cost + current.cost,
                            iterations
                        };
                    }
                    
                    if (!backwardVisited.has(neighborKey)) {
                        const newPath = [action, ...current.path];
                        const newCost = current.cost + cost;
                        backwardVisited.set(neighborKey, { path: newPath, cost: newCost });
                        backwardFrontier.push({ state, path: newPath, cost: newCost });
                    }
                }
            }
        }
        
        return { found: false, iterations };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Weighted A* (Suboptimal but faster)
    // ─────────────────────────────────────────────────────────────────────────────
    
    weightedAStar: function(problem, weight = 1.5) {
        const pq = this.createPriorityQueue();
        const visited = new Set();
        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();
        
        const startKey = JSON.stringify(problem.initial);
        gScore.set(startKey, 0);
        fScore.set(startKey, weight * problem.heuristic(problem.initial));
        pq.push(problem.initial, fScore.get(startKey));
        
        let iterations = 0;
        const maxIter = problem.maxIterations || 10000;
        
        while (!pq.isEmpty() && iterations < maxIter) {
            iterations++;
            const current = pq.pop();
            const currentKey = JSON.stringify(current);
            
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);
            
            if (problem.isGoal(current)) {
                return {
                    ...this._reconstructUCSPath(cameFrom, currentKey, gScore.get(currentKey)),
                    weight,
                    iterations
                };
            }
            
            for (const { state, action, cost } of problem.getSuccessors(current)) {
                const neighborKey = JSON.stringify(state);
                if (visited.has(neighborKey)) continue;
                
                const newG = gScore.get(currentKey) + cost;
                const existingG = gScore.get(neighborKey);
                
                if (existingG === undefined || newG < existingG) {