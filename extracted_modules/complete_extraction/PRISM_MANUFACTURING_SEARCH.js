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
}