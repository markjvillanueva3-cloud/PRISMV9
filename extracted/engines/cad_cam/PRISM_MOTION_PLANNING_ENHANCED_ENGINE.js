/**
 * PRISM_MOTION_PLANNING_ENHANCED_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 338
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_MOTION_PLANNING_ENHANCED_ENGINE = {
    name: 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE',
    version: '1.0.0',
    description: 'Enhanced motion planning with PRM, potential fields, and CNC applications',
    source: 'MIT 16.410, Stanford CS 326',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Probabilistic Roadmap (PRM)
    // ─────────────────────────────────────────────────────────────────────────────
    
    prm: function(config) {
        const {
            bounds,
            obstacles = [],
            numSamples = 500,
            connectionRadius,
            start,
            goal
        } = config;
        
        const radius = connectionRadius || Math.sqrt(
            (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY) / numSamples
        ) * 2;
        
        // Sample random configurations
        const samples = [start, goal];
        let attempts = 0;
        const maxAttempts = numSamples * 3;
        
        while (samples.length < numSamples && attempts < maxAttempts) {
            attempts++;
            const point = this._randomPoint(bounds);
            
            if (!this._inCollision(point, obstacles)) {
                samples.push(point);
            }
        }
        
        // Build roadmap
        const edges = [];
        for (let i = 0; i < samples.length; i++) {
            for (let j = i + 1; j < samples.length; j++) {
                const dist = this._distance(samples[i], samples[j]);
                if (dist <= radius && this._edgeValid(samples[i], samples[j], obstacles)) {
                    edges.push({ from: i, to: j, cost: dist });
                    edges.push({ from: j, to: i, cost: dist });
                }
            }
        }
        
        // Build adjacency list
        const graph = {
            nodes: samples.map((_, i) => i),
            getNeighbors: (node) => {
                return edges
                    .filter(e => e.from === node)
                    .map(e => ({ node: e.to, weight: e.cost }));
            }
        };
        
        // Find path using Dijkstra
        const result = PRISM_SEARCH_ENHANCED_ENGINE.dijkstra(graph, 0, 1);
        
        if (result.found) {
            return {
                found: true,
                path: result.path.map(i => samples[i]),
                cost: result.cost,
                roadmapNodes: samples.length,
                roadmapEdges: edges.length / 2
            };
        }
        
        return { found: false, roadmapNodes: samples.length };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Potential Fields Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    potentialFields: function(config) {
        const {
            start,
            goal,
            obstacles = [],
            attractiveGain = 1.0,
            repulsiveGain = 100.0,
            repulsiveThreshold = 50.0,
            stepSize = 1.0,
            maxIterations = 10000,
            goalThreshold = 1.0
        } = config;
        
        const path = [{ ...start }];
        let current = { ...start };
        
        for (let i = 0; i < maxIterations; i++) {
            // Check if goal reached
            if (this._distance(current, goal) < goalThreshold) {
                path.push({ ...goal });
                return { found: true, path, iterations: i };
            }
            
            // Calculate attractive force (toward goal)
            const attractive = {
                x: attractiveGain * (goal.x - current.x),
                y: attractiveGain * (goal.y - current.y),
                z: goal.z !== undefined ? attractiveGain * (goal.z - current.z) : 0
            };
            
            // Calculate repulsive force (away from obstacles)
            const repulsive = { x: 0, y: 0, z: 0 };
            
            for (const obs of obstacles) {
                const obsCenter = {
                    x: (obs.minX + obs.maxX) / 2,
                    y: (obs.minY + obs.maxY) / 2,
                    z: obs.minZ !== undefined ? (obs.minZ + obs.maxZ) / 2 : 0
                };
                
                const dist = this._distance(current, obsCenter);
                
                if (dist < repulsiveThreshold && dist > 0) {
                    const force = repulsiveGain * (1/dist - 1/repulsiveThreshold) * (1/(dist*dist));
                    repulsive.x += force * (current.x - obsCenter.x) / dist;
                    repulsive.y += force * (current.y - obsCenter.y) / dist;
                    if (current.z !== undefined) {
                        repulsive.z += force * (current.z - obsCenter.z) / dist;
                    }
                }
            }
            
            // Total force
            const total = {
                x: attractive.x + repulsive.x,
                y: attractive.y + repulsive.y,
                z: attractive.z + repulsive.z
            };
            
            // Normalize and step
            const magnitude = Math.sqrt(total.x*total.x + total.y*total.y + total.z*total.z);
            if (magnitude < 0.001) {
                // Local minimum detected
                return { found: false, path, reason: 'Local minimum', iterations: i };
            }
            
            current = {
                x: current.x + stepSize * total.x / magnitude,
                y: current.y + stepSize * total.y / magnitude,
                z: current.z !== undefined ? current.z + stepSize * total.z / magnitude : undefined
            };
            
            // Check collision
            if (this._inCollision(current, obstacles)) {
                return { found: false, path, reason: 'Collision', iterations: i };
            }
            
            path.push({ ...current });
        }
        
        return { found: false, path, reason: 'Max iterations', iterations: maxIterations };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // RRT-Connect (Bidirectional RRT)
    // ─────────────────────────────────────────────────────────────────────────────
    
    rrtConnect: function(config) {
        const {
            start,
            goal,
            bounds,
            obstacles = [],
            maxIterations = 5000,
            stepSize = 5.0
        } = config;
        
        const treeA = [{ point: start, parent: null }];
        const treeB = [{ point: goal, parent: null }];
        
        let currentTree = 'A';
        
        for (let i = 0; i < maxIterations; i++) {
            const tree = currentTree === 'A' ? treeA : treeB;
            const otherTree = currentTree === 'A' ? treeB : treeA;
            
            // Random sample (with goal bias)
            const target = Math.random() < 0.1 ? 
                otherTree[otherTree.length - 1].point : 
                this._randomPoint(bounds);
            
            // Extend tree toward target
            const nearest = this._findNearest(tree, target);
            const newPoint = this._steer(nearest.point, target, stepSize);
            
            if (!this._inCollision(newPoint, obstacles) && 
                this._edgeValid(nearest.point, newPoint, obstacles)) {
                
                const newNode = { point: newPoint, parent: nearest };
                tree.push(newNode);
                
                // Try to connect to other tree
                const nearestOther = this._findNearest(otherTree, newPoint);
                const dist = this._distance(newPoint, nearestOther.point);
                
                if (dist < stepSize * 2 && 
                    this._edgeValid(newPoint, nearestOther.point, obstacles)) {
                    
                    // Trees connected!
                    const pathA = this._extractPath(newNode);
                    const pathB = this._extractPath(nearestOther);
                    
                    const path = currentTree === 'A' ?
                        [...pathA, ...pathB.reverse()] :
                        [...pathB, ...pathA.reverse()];
                    
                    return {
                        found: true,
                        path,
                        iterations: i,
                        treeANodes: treeA.length,
                        treeBNodes: treeB.length
                    };
                }
            }
            
            // Swap trees
            currentTree = currentTree === 'A' ? 'B' : 'A';
        }
        
        return { found: false, iterations: maxIterations };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Path Smoothing (Post-processing)
    // ─────────────────────────────────────────────────────────────────────────────
    
    smoothPath: function(path, obstacles, maxIterations = 100) {
        let smoothed = [...path];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            if (smoothed.length <= 2) break;
            
            // Pick random segment
            const i = Math.floor(Math.random() * (smoothed.length - 2));
            
            // Try to shortcut
            if (this._edgeValid(smoothed[i], smoothed[i + 2], obstacles)) {
                smoothed.splice(i + 1, 1);
            }
        }
        
        return smoothed;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Functions
    // ─────────────────────────────────────────────────────────────────────────────
    
    _randomPoint: function(bounds) {
        return {
            x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
            y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
            z: bounds.minZ !== undefined ? 
                bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ) : undefined
        };
    },
    
    _distance: function(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z !== undefined && b.z !== undefined) ? a.z - b.z : 0;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },
    
    _findNearest: function(nodes, point) {
        return nodes.reduce((nearest, n) =>
            this._distance(n.point, point) < this._distance(nearest.point, point) ? n : nearest
        );
    },
    
    _steer: function(from, to, stepSize) {
        const dist = this._distance(from, to);
        if (dist <= stepSize) return { ...to };
        
        const ratio = stepSize / dist;
        return {
            x: from.x + (to.x - from.x) * ratio,
            y: from.y + (to.y - from.y) * ratio,
            z: from.z !== undefined ? from.z + ((to.z || 0) - (from.z || 0)) * ratio : undefined
        };
    },
    
    _inCollision: function(point, obstacles) {
        for (const obs of obstacles) {
            if (point.x >= obs.minX && point.x <= obs.maxX &&
                point.y >= obs.minY && point.y <= obs.maxY) {
                if (obs.minZ === undefined || 
                    (point.z >= obs.minZ && point.z <= obs.maxZ)) {
                    return true;
                }
            }
        }
        return false;
    },
    
    _edgeValid: function(from, to, obstacles, numChecks = 10) {
        for (let i = 0; i <= numChecks; i++) {
            const t = i / numChecks;
            const point = {
                x: from.x + t * (to.x - from.x),
                y: from.y + t * (to.y - from.y),
                z: from.z !== undefined ? from.z + t * ((to.z || 0) - (from.z || 0)) : undefined
            };
            if (this._inCollision(point, obstacles)) return false;
        }
        return true;
    },
    
    _extractPath: function(node) {
        const path = [];
        while (node) {
            path.unshift(node.point);
            node = node.parent;
        }
        return path;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('motion.prm', 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE.prm');
            PRISM_GATEWAY.register('motion.potentialFields', 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE.potentialFields');
            PRISM_GATEWAY.register('motion.rrtConnect', 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE.rrtConnect');
            PRISM_GATEWAY.register('motion.smoothPath', 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE.smoothPath');
        }
    }
}