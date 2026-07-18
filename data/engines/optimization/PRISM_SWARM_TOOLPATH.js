// PRISM_SWARM_TOOLPATH - Lines 971760-971996 (237 lines) - Swarm toolpath\n\nconst PRISM_SWARM_TOOLPATH = {
    name: 'Swarm-Optimized Toolpaths',
    sources: ['MIT 18.433 ACO', 'MIT 2.008 CAM'],
    patentClaim: 'Ant colony optimization for CNC toolpath sequencing with adaptive pheromone updates',
    
    /**
     * Optimize hole/feature sequence using ACO
     * @param {Array} features - Array of {x, y, z, type, diameter, depth}
     * @param {Object} options - ACO parameters
     * @returns {Object} Optimized sequence and metrics
     */
    optimizeSequence: function(features, options = {}) {
        const {
            numAnts = 20,
            iterations = 100,
            alpha = 1.0,      // Pheromone importance
            beta = 2.0,       // Heuristic importance
            rho = 0.1,        // Evaporation rate
            Q = 100,          // Pheromone deposit factor
            elitist = true    // Use elitist strategy
        } = options;
        
        const n = features.length;
        if (n < 2) return { sequence: features, distance: 0 };
        
        // Initialize distance matrix
        const dist = this._buildDistanceMatrix(features);
        
        // Initialize pheromone matrix
        const tau = Array(n).fill(null).map(() => Array(n).fill(1.0));
        
        // Track best solution
        let bestTour = null;
        let bestDistance = Infinity;
        const convergenceHistory = [];
        
        for (let iter = 0; iter < iterations; iter++) {
            const antTours = [];
            const antDistances = [];
            
            // Each ant constructs a tour
            for (let ant = 0; ant < numAnts; ant++) {
                const tour = this._constructTour(n, tau, dist, alpha, beta);
                const tourDist = this._tourDistance(tour, dist);
                
                antTours.push(tour);
                antDistances.push(tourDist);
                
                if (tourDist < bestDistance) {
                    bestDistance = tourDist;
                    bestTour = [...tour];
                }
            }
            
            // Evaporate pheromones
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    tau[i][j] *= (1 - rho);
                }
            }
            
            // Deposit pheromones
            for (let ant = 0; ant < numAnts; ant++) {
                const deposit = Q / antDistances[ant];
                const tour = antTours[ant];
                for (let i = 0; i < tour.length - 1; i++) {
                    tau[tour[i]][tour[i + 1]] += deposit;
                    tau[tour[i + 1]][tour[i]] += deposit;
                }
            }
            
            // Elitist: extra deposit on best tour
            if (elitist && bestTour) {
                const eliteDeposit = Q / bestDistance;
                for (let i = 0; i < bestTour.length - 1; i++) {
                    tau[bestTour[i]][bestTour[i + 1]] += eliteDeposit;
                    tau[bestTour[i + 1]][bestTour[i]] += eliteDeposit;
                }
            }
            
            convergenceHistory.push(bestDistance);
        }
        
        // Build optimized sequence
        const optimizedSequence = bestTour.map(i => features[i]);
        
        // Calculate improvement over naive sequence
        const naiveDistance = this._naiveSequenceDistance(features);
        const improvement = ((naiveDistance - bestDistance) / naiveDistance * 100).toFixed(1);
        
        return {
            sequence: optimizedSequence,
            indices: bestTour,
            distance: bestDistance,
            naiveDistance: naiveDistance,
            improvement: improvement + '%',
            iterations: iterations,
            convergenceHistory: convergenceHistory,
            algorithm: 'ACO-Elitist'
        };
    },
    
    /**
     * Optimize with tool change consideration
     */
    optimizeWithToolChanges: function(features, toolChangeTime = 30) {
        // Group features by tool
        const byTool = {};
        for (const f of features) {
            const tool = f.toolId || 'default';
            if (!byTool[tool]) byTool[tool] = [];
            byTool[tool].push(f);
        }
        
        // Optimize within each tool group
        const optimizedGroups = {};
        for (const [tool, group] of Object.entries(byTool)) {
            optimizedGroups[tool] = this.optimizeSequence(group);
        }
        
        // Optimize tool order (minimize total travel + tool changes)
        const toolOrder = this._optimizeToolOrder(optimizedGroups, toolChangeTime);
        
        // Build final sequence
        const finalSequence = [];
        let totalDistance = 0;
        let toolChanges = 0;
        
        for (const tool of toolOrder) {
            if (finalSequence.length > 0) toolChanges++;
            finalSequence.push(...optimizedGroups[tool].sequence);
            totalDistance += optimizedGroups[tool].distance;
        }
        
        return {
            sequence: finalSequence,
            toolOrder: toolOrder,
            totalDistance: totalDistance,
            toolChanges: toolChanges,
            estimatedTime: totalDistance / 5000 + toolChanges * toolChangeTime, // rough estimate
            algorithm: 'ACO-MultiTool'
        };
    },
    
    _buildDistanceMatrix: function(features) {
        const n = features.length;
        const dist = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = features[j].x - features[i].x;
                const dy = features[j].y - features[i].y;
                const dz = (features[j].z || 0) - (features[i].z || 0);
                const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                dist[i][j] = d;
                dist[j][i] = d;
            }
        }
        
        return dist;
    },
    
    _constructTour: function(n, tau, dist, alpha, beta) {
        const visited = new Set();
        const tour = [];
        
        // Start from random city
        let current = Math.floor(Math.random() * n);
        tour.push(current);
        visited.add(current);
        
        while (visited.size < n) {
            // Calculate probabilities
            const probs = [];
            let sum = 0;
            
            for (let j = 0; j < n; j++) {
                if (visited.has(j)) {
                    probs.push(0);
                } else {
                    const tauVal = Math.pow(tau[current][j], alpha);
                    const eta = dist[current][j] > 0 ? Math.pow(1 / dist[current][j], beta) : 1;
                    const p = tauVal * eta;
                    probs.push(p);
                    sum += p;
                }
            }
            
            // Roulette wheel selection
            const r = Math.random() * sum;
            let cumsum = 0;
            let next = 0;
            
            for (let j = 0; j < n; j++) {
                cumsum += probs[j];
                if (cumsum >= r) {
                    next = j;
                    break;
                }
            }
            
            tour.push(next);
            visited.add(next);
            current = next;
        }
        
        return tour;
    },
    
    _tourDistance: function(tour, dist) {
        let total = 0;
        for (let i = 0; i < tour.length - 1; i++) {
            total += dist[tour[i]][tour[i + 1]];
        }
        return total;
    },
    
    _naiveSequenceDistance: function(features) {
        let total = 0;
        for (let i = 0; i < features.length - 1; i++) {
            const dx = features[i + 1].x - features[i].x;
            const dy = features[i + 1].y - features[i].y;
            const dz = (features[i + 1].z || 0) - (features[i].z || 0);
            total += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        return total;
    },
    
    _optimizeToolOrder: function(groups, toolChangeTime) {
        const tools = Object.keys(groups);
        if (tools.length <= 2) return tools;
        
        // Simple greedy for now (could use ACO for large tool sets)
        // Sort by number of features (more features first)
        return tools.sort((a, b) => groups[b].sequence.length - groups[a].sequence.length);
    }
};
