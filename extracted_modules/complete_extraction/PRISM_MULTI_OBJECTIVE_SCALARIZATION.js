const PRISM_MULTI_OBJECTIVE_SCALARIZATION = {
    name: 'PRISM_MULTI_OBJECTIVE_SCALARIZATION',
    version: '1.0.0',
    source: 'MIT 15.099 - Optimization Methods',
    
    /**
     * Epsilon-Constraint Method
     * Optimize one objective while constraining others
     * Source: MIT 15.099
     */
    epsilonConstraint: function(config) {
        const {
            objectives,      // Array of objective functions [f1, f2, ...]
            constraints = [],// Original constraints
            bounds,          // Variable bounds [{min, max}, ...]
            primaryIndex = 0,// Which objective to optimize
            epsilons,        // Bounds for other objectives [ε1, ε2, ...]
            solver = 'gradient', // 'gradient' or 'pso'
            maxIter = 1000
        } = config;
        
        const n = bounds.length;
        const numObjectives = objectives.length;
        
        // Validate epsilons
        if (!epsilons || epsilons.length !== numObjectives - 1) {
            throw new Error('Must provide epsilon bounds for all non-primary objectives');
        }
        
        // Create augmented constraint function
        const augmentedConstraints = [...constraints];
        let epsilonIdx = 0;
        
        for (let i = 0; i < numObjectives; i++) {
            if (i !== primaryIndex) {
                const objIdx = i;
                const eps = epsilons[epsilonIdx++];
                augmentedConstraints.push((x) => objectives[objIdx](x) - eps);
            }
        }
        
        // Solve constrained single-objective problem
        const primaryObj = objectives[primaryIndex];
        
        if (solver === 'pso') {
            return this._solvePSO(primaryObj, augmentedConstraints, bounds, maxIter);
        } else {
            return this._solveGradient(primaryObj, augmentedConstraints, bounds, maxIter);
        }
    },
    
    /**
     * Generate Pareto front using epsilon-constraint
     */
    generateParetoEpsilon: function(config) {
        const {
            objectives,
            bounds,
            numPoints = 20,
            constraints = []
        } = config;
        
        if (objectives.length !== 2) {
            throw new Error('Pareto generation currently supports 2 objectives');
        }
        
        // First find extreme points
        const paretoFront = [];
        
        // Find range of f2 by optimizing f2 alone
        const f2Min = this._findMinimum(objectives[1], bounds);
        const f2Max = this._findMaximum(objectives[1], bounds);
        
        // Generate epsilon values
        const epsilonRange = f2Max.value - f2Min.value;
        
        for (let i = 0; i < numPoints; i++) {
            const epsilon = f2Min.value + (i / (numPoints - 1)) * epsilonRange;
            
            try {
                const result = this.epsilonConstraint({
                    objectives,
                    constraints,
                    bounds,
                    primaryIndex: 0,
                    epsilons: [epsilon],
                    maxIter: 500
                });
                
                if (result.feasible) {
                    paretoFront.push({
                        x: result.x,
                        f1: objectives[0](result.x),
                        f2: objectives[1](result.x)
                    });
                }
            } catch (e) {
                // Infeasible for this epsilon, skip
            }
        }
        
        // Remove dominated solutions
        return this._filterDominated(paretoFront);
    },
    
    /**
     * Goal Programming
     * Minimize deviations from target values
     * Source: MIT 15.099
     */
    goalProgramming: function(config) {
        const {
            objectives,      // [{fn, target, weight, priority}]
            bounds,
            constraints = [],
            method = 'weighted', // 'weighted', 'lexicographic', 'minmax'
            maxIter = 1000
        } = config;
        
        const n = bounds.length;
        
        if (method === 'weighted') {
            // Weighted goal programming
            const goalObjective = (x) => {
                let totalDeviation = 0;
                for (const goal of objectives) {
                    const value = goal.fn(x);
                    const deviation = Math.abs(value - goal.target);
                    totalDeviation += (goal.weight || 1) * deviation;
                }
                return totalDeviation;
            };
            
            return this._solveGradient(goalObjective, constraints, bounds, maxIter);
            
        } else if (method === 'minmax') {
            // Minimize maximum deviation (Chebyshev)
            const minmaxObjective = (x) => {
                let maxDeviation = 0;
                for (const goal of objectives) {
                    const value = goal.fn(x);
                    const normalizedDev = Math.abs(value - goal.target) / (goal.target || 1);
                    maxDeviation = Math.max(maxDeviation, (goal.weight || 1) * normalizedDev);
                }
                return maxDeviation;
            };
            
            return this._solveGradient(minmaxObjective, constraints, bounds, maxIter);
            
        } else {
            // Lexicographic - solve in priority order
            return this.lexicographic({
                objectives: objectives.map(g => ({
                    fn: (x) => Math.abs(g.fn(x) - g.target),
                    priority: g.priority || 1
                })),
                bounds,
                constraints,
                maxIter
            });
        }
    },
    
    /**
     * Lexicographic Method
     * Solve objectives in strict priority order
     * Source: MIT 15.099
     */
    lexicographic: function(config) {
        const {
            objectives,      // [{fn, priority}] - lower priority = more important
            bounds,
            constraints = [],
            tolerance = 0.01, // Allow this much degradation from optimal
            maxIter = 1000
        } = config;
        
        // Sort by priority (ascending - lower number = higher priority)
        const sortedObj = [...objectives].sort((a, b) => (a.priority || 1) - (b.priority || 1));
        
        let currentConstraints = [...constraints];
        let x = bounds.map(b => (b.min + b.max) / 2); // Initial point
        let results = [];
        
        for (let level = 0; level < sortedObj.length; level++) {
            const obj = sortedObj[level];
            
            // Optimize this objective subject to all constraints
            const result = this._solveGradient(obj.fn, currentConstraints, bounds, maxIter, x);
            
            if (!result.feasible) {
                return {
                    feasible: false,
                    level,
                    reason: `Infeasible at priority level ${level}`
                };
            }
            
            x = result.x;
            const optimalValue = obj.fn(x);
            results.push({ priority: obj.priority, optimalValue });
            
            // Add constraint: this objective must stay within tolerance of optimal
            const allowedValue = optimalValue * (1 + tolerance);
            currentConstraints.push((x) => obj.fn(x) - allowedValue);
        }
        
        return {
            feasible: true,
            x,
            objectives: sortedObj.map(o => o.fn(x)),
            results,
            method: 'lexicographic'
        };
    },
    
    // Helper: Gradient-based solver with constraints
    _solveGradient: function(objective, constraints, bounds, maxIter, x0 = null) {
        const n = bounds.length;
        let x = x0 || bounds.map(b => (b.min + b.max) / 2);
        
        const penalty = 1000;
        const lr = 0.01;
        
        const penalizedObj = (x) => {
            let val = objective(x);
            
            // Constraint violations
            for (const c of constraints) {
                const violation = Math.max(0, c(x));
                val += penalty * violation * violation;
            }
            
            // Bound violations
            for (let i = 0; i < n; i++) {
                if (x[i] < bounds[i].min) val += penalty * Math.pow(bounds[i].min - x[i], 2);
                if (x[i] > bounds[i].max) val += penalty * Math.pow(x[i] - bounds[i].max, 2);
            }
            
            return val;
        };
        
        // Gradient descent with numerical gradient
        for (let iter = 0; iter < maxIter; iter++) {
            const grad = this._numericalGradient(penalizedObj, x);
            const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
            
            if (gradNorm < 1e-8) break;
            
            // Update
            for (let i = 0; i < n; i++) {
                x[i] -= lr * grad[i];
                x[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, x[i]));
            }
        }
        
        // Check feasibility
        const feasible = constraints.every(c => c(x) <= 1e-6);
        
        return {
            x,
            value: objective(x),
            feasible,
            method: 'gradient'
        };
    },
    
    _solvePSO: function(objective, constraints, bounds, maxIter) {
        const n = bounds.length;
        const swarmSize = 30;
        const penalty = 10000;
        
        const penalizedObj = (x) => {
            let val = objective(x);
            for (const c of constraints) {
                const violation = Math.max(0, c(x));
                val += penalty * violation * violation;
            }
            return val;
        };
        
        // Initialize swarm
        let particles = [];
        let globalBest = null;
        let globalBestValue = Infinity;
        
        for (let i = 0; i < swarmSize; i++) {
            const pos = bounds.map(b => b.min + Math.random() * (b.max - b.min));
            const vel = bounds.map(b => (Math.random() - 0.5) * (b.max - b.min) * 0.1);
            const value = penalizedObj(pos);
            
            particles.push({
                position: pos,
                velocity: vel,
                bestPosition: [...pos],
                bestValue: value
            });
            
            if (value < globalBestValue) {
                globalBestValue = value;
                globalBest = [...pos];
            }
        }
        
        const w = 0.7, c1 = 1.5, c2 = 1.5;
        
        for (let iter = 0; iter < maxIter; iter++) {
            for (const p of particles) {
                // Update velocity
                for (let i = 0; i < n; i++) {
                    p.velocity[i] = w * p.velocity[i]
                        + c1 * Math.random() * (p.bestPosition[i] - p.position[i])
                        + c2 * Math.random() * (globalBest[i] - p.position[i]);
                }
                
                // Update position
                for (let i = 0; i < n; i++) {
                    p.position[i] += p.velocity[i];
                    p.position[i] = Math.max(bounds[i].min, Math.min(bounds[i].max, p.position[i]));
                }
                
                // Evaluate
                const value = penalizedObj(p.position);
                
                if (value < p.bestValue) {
                    p.bestValue = value;
                    p.bestPosition = [...p.position];
                    
                    if (value < globalBestValue) {
                        globalBestValue = value;
                        globalBest = [...p.position];
                    }
                }
            }
        }
        
        const feasible = constraints.every(c => c(globalBest) <= 1e-6);
        
        return {
            x: globalBest,
            value: objective(globalBest),
            feasible,
            method: 'pso'
        };
    },
    
    _numericalGradient: function(f, x, h = 1e-6) {
        const grad = [];
        const fx = f(x);
        
        for (let i = 0; i < x.length; i++) {
            const xh = [...x];
            xh[i] += h;
            grad.push((f(xh) - fx) / h);
        }
        
        return grad;
    },
    
    _findMinimum: function(f, bounds) {
        const result = this._solveGradient(f, [], bounds, 500);
        return { x: result.x, value: result.value };
    },
    
    _findMaximum: function(f, bounds) {
        const negF = (x) => -f(x);
        const result = this._solveGradient(negF, [], bounds, 500);
        return { x: result.x, value: f(result.x) };
    },
    
    _filterDominated: function(solutions) {
        return solutions.filter((s, i) => {
            for (let j = 0; j < solutions.length; j++) {
                if (i !== j) {
                    const other = solutions[j];
                    if (other.f1 <= s.f1 && other.f2 <= s.f2 &&
                        (other.f1 < s.f1 || other.f2 < s.f2)) {
                        return false; // s is dominated
                    }
                }
            }
            return true;
        });
    }
}