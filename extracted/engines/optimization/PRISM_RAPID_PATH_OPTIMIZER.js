/**
 * PRISM_RAPID_PATH_OPTIMIZER
 * Extracted from PRISM v8.89.002 monolith
 * References: 11
 * Lines: 318
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_RAPID_PATH_OPTIMIZER = {
    name: 'PRISM_RAPID_PATH_OPTIMIZER',
    version: '1.0.0',
    description: 'Optimize rapid movements, retract strategies, and linking moves',
    source: 'MIT 2.008, Manufacturing',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Optimize Rapid Sequence
    // ─────────────────────────────────────────────────────────────────────────────
    
    optimizeRapidSequence: function(points, options = {}) {
        const {
            startPoint = { x: 0, y: 0, z: 50 },
            clearanceHeight = 50,
            rapidFeed = 10000,
            method = 'nearest_neighbor'
        } = options;
        
        if (points.length === 0) {
            return { sequence: [], totalTime: 0 };
        }
        
        let sequence;
        let totalDistance;
        
        switch (method) {
            case 'nearest_neighbor':
                ({ sequence, totalDistance } = this._nearestNeighbor(points, startPoint));
                break;
            case 'opt2':
                ({ sequence, totalDistance } = this._twoOptOptimization(points, startPoint));
                break;
            case 'christofides':
                ({ sequence, totalDistance } = this._christofidesApprox(points, startPoint));
                break;
            default:
                ({ sequence, totalDistance } = this._nearestNeighbor(points, startPoint));
        }
        
        // Generate rapid moves
        const moves = this._generateRapidMoves(sequence.map(i => points[i]), startPoint, clearanceHeight);
        const totalTime = totalDistance / rapidFeed * 60; // seconds
        
        return {
            sequence,
            moves,
            totalDistance,
            totalTime,
            method
        };
    },
    
    _nearestNeighbor: function(points, start) {
        const n = points.length;
        const visited = new Set();
        const sequence = [];
        let currentPos = start;
        let totalDistance = 0;
        
        while (sequence.length < n) {
            let nearestIdx = -1;
            let nearestDist = Infinity;
            
            for (let i = 0; i < n; i++) {
                if (!visited.has(i)) {
                    const dist = this._distance3D(currentPos, points[i]);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = i;
                    }
                }
            }
            
            visited.add(nearestIdx);
            sequence.push(nearestIdx);
            totalDistance += nearestDist;
            currentPos = points[nearestIdx];
        }
        
        return { sequence, totalDistance };
    },
    
    _twoOptOptimization: function(points, start) {
        let { sequence, totalDistance } = this._nearestNeighbor(points, start);
        
        let improved = true;
        while (improved) {
            improved = false;
            
            for (let i = 0; i < sequence.length - 1; i++) {
                for (let j = i + 2; j < sequence.length; j++) {
                    const newSequence = [
                        ...sequence.slice(0, i + 1),
                        ...sequence.slice(i + 1, j + 1).reverse(),
                        ...sequence.slice(j + 1)
                    ];
                    
                    const newDistance = this._calculateTourDistance(newSequence, points, start);
                    
                    if (newDistance < totalDistance - 0.01) {
                        sequence = newSequence;
                        totalDistance = newDistance;
                        improved = true;
                    }
                }
            }
        }
        
        return { sequence, totalDistance };
    },
    
    _christofidesApprox: function(points, start) {
        // Simplified Christofides-like approach
        // Use MST + nearest neighbor for odd-degree vertices
        const n = points.length;
        
        if (n <= 3) {
            return this._nearestNeighbor(points, start);
        }
        
        // Build complete graph
        const nodes = points.map((_, i) => i);
        const edges = [];
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                edges.push({
                    from: i,
                    to: j,
                    weight: this._distance3D(points[i], points[j])
                });
            }
        }
        
        // Get MST
        const mst = PRISM_GRAPH_ALGORITHMS_ENGINE.kruskalMST(nodes, edges);
        
        // Find Eulerian path approximation
        const adjacency = {};
        for (const node of nodes) adjacency[node] = [];
        
        for (const edge of mst.edges) {
            adjacency[edge.from].push(edge.to);
            adjacency[edge.to].push(edge.from);
        }
        
        // DFS traversal for approximate tour
        const visited = new Set();
        const sequence = [];
        
        const dfs = (node) => {
            visited.add(node);
            sequence.push(node);
            for (const neighbor of adjacency[node]) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor);
                }
            }
        };
        
        dfs(0);
        
        const totalDistance = this._calculateTourDistance(sequence, points, start);
        
        // Apply 2-opt improvement
        return this._twoOptOptimization(points, start);
    },
    
    _calculateTourDistance: function(sequence, points, start) {
        let distance = this._distance3D(start, points[sequence[0]]);
        
        for (let i = 0; i < sequence.length - 1; i++) {
            distance += this._distance3D(points[sequence[i]], points[sequence[i + 1]]);
        }
        
        return distance;
    },
    
    _generateRapidMoves: function(orderedPoints, start, clearance) {
        const moves = [];
        let currentPos = { ...start };
        
        for (const point of orderedPoints) {
            // Rapid to clearance
            if (currentPos.z < clearance) {
                moves.push({
                    type: 'rapid',
                    to: { x: currentPos.x, y: currentPos.y, z: clearance }
                });
            }
            
            // Rapid to XY
            moves.push({
                type: 'rapid',
                to: { x: point.x, y: point.y, z: clearance }
            });
            
            // Rapid down to point Z (or just above)
            moves.push({
                type: 'rapid',
                to: { x: point.x, y: point.y, z: point.z + 2 }
            });
            
            currentPos = { x: point.x, y: point.y, z: point.z };
        }
        
        return moves;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Optimize Linking Moves
    // ─────────────────────────────────────────────────────────────────────────────
    
    optimizeLinkingMoves: function(toolpaths, options = {}) {
        const {
            linkType = 'direct', // 'direct', 'clearance', 'ramp'
            clearanceHeight = 5,
            rampAngle = 45
        } = options;
        
        const optimized = [];
        
        for (let i = 0; i < toolpaths.length - 1; i++) {
            const current = toolpaths[i];
            const next = toolpaths[i + 1];
            
            const endPoint = current.points[current.points.length - 1];
            const startPoint = next.points[0];
            
            // Add current toolpath
            optimized.push(current);
            
            // Generate linking move
            const linkMove = this._generateLinkMove(endPoint, startPoint, linkType, clearanceHeight, rampAngle);
            if (linkMove) {
                optimized.push(linkMove);
            }
        }
        
        // Add last toolpath
        if (toolpaths.length > 0) {
            optimized.push(toolpaths[toolpaths.length - 1]);
        }
        
        return optimized;
    },
    
    _generateLinkMove: function(from, to, type, clearance, rampAngle) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;
        const xyDist = Math.sqrt(dx*dx + dy*dy);
        
        switch (type) {
            case 'direct':
                if (xyDist < 1) { // Very close - direct move
                    return {
                        type: 'link',
                        linkType: 'direct',
                        points: [from, to]
                    };
                }
                // Fall through to clearance
                
            case 'clearance':
                return {
                    type: 'link',
                    linkType: 'clearance',
                    points: [
                        from,
                        { x: from.x, y: from.y, z: clearance },
                        { x: to.x, y: to.y, z: clearance },
                        to
                    ]
                };
                
            case 'ramp':
                const rampDist = Math.abs(dz) / Math.tan(rampAngle * Math.PI / 180);
                if (xyDist >= rampDist) {
                    // Can do full ramp
                    return {
                        type: 'link',
                        linkType: 'ramp',
                        points: [from, to]
                    };
                } else {
                    // Need partial ramp with clearance
                    return {
                        type: 'link',
                        linkType: 'ramp_clearance',
                        points: [
                            from,
                            { x: from.x, y: from.y, z: clearance },
                            { x: to.x, y: to.y, z: clearance },
                            to
                        ]
                    };
                }
        }
        
        return null;
    },
    
    _distance3D: function(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z || 0) - (b.z || 0);
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('rapid.optimizeSequence', 'PRISM_RAPID_PATH_OPTIMIZER.optimizeRapidSequence');
            PRISM_GATEWAY.register('rapid.optimizeLinking', 'PRISM_RAPID_PATH_OPTIMIZER.optimizeLinkingMoves');
        }
    }
}