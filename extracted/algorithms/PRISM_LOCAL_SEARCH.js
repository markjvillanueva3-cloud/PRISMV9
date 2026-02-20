/**
 * PRISM_LOCAL_SEARCH
 * Extracted from PRISM v8.89.002 monolith
 * References: 17
 * Category: optimization
 * Lines: 377
 * Session: R2.3.2 Algorithm Extraction
 */

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
}