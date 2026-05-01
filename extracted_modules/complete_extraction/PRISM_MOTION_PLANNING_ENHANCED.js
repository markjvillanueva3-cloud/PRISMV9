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
}