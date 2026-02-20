const PRISM_SWARM_ALGORITHMS = {

    /**
     * Particle Swarm Optimization for Speed & Feed
     * Optimizes: cycle time, tool life, surface finish
     */
    PSO_SpeedFeed: {

        config: {
            swarmSize: 30,
            maxIterations: 100,
            w: 0.7,     // Inertia weight
            c1: 1.5,    // Cognitive coefficient
            c2: 1.5,    // Social coefficient
            wDecay: 0.99 // Inertia decay
        },
        optimize: function(material, tool, machine, objective = 'balanced') {
            const bounds = this._getBounds(material, tool, machine);

            // Initialize swarm
            const swarm = this._initializeSwarm(bounds);
            let globalBest = { fitness: -Infinity, position: null };

            // Main loop
            for (let iter = 0; iter < this.config.maxIterations; iter++) {
                // Evaluate fitness
                for (const particle of swarm) {
                    const fitness = this._evaluateFitness(particle.position, material, tool, objective);

                    if (fitness > particle.bestFitness) {
                        particle.bestFitness = fitness;
                        particle.bestPosition = [...particle.position];
                    }
                    if (fitness > globalBest.fitness) {
                        globalBest.fitness = fitness;
                        globalBest.position = [...particle.position];
                    }
                }
                // Update particles
                for (const particle of swarm) {
                    this._updateParticle(particle, globalBest, bounds, iter);
                }
            }
            // Decode solution
            return this._decodeSolution(globalBest.position, material, tool);
        },
        _getBounds: function(material, tool, machine) {
            // Get limits from material & machine
            const Vc_min = material.cutting_params?.roughing?.speed?.min || 50;
            const Vc_max = Math.min(
                material.cutting_params?.roughing?.speed?.max || 300,
                machine.max_spindle_speed * Math.PI * tool.diameter / 1000
            );

            return [
                { min: Vc_min, max: Vc_max },           // Cutting speed
                { min: 0.02, max: 0.3 },               // Feed per tooth
                { min: 0.1 * tool.diameter, max: tool.diameter }, // DOC
                { min: 0.1 * tool.diameter, max: tool.diameter }  // WOC
            ];
        },
        _initializeSwarm: function(bounds) {
            return Array(this.config.swarmSize).fill(null).map(() => ({
                position: bounds.map(b => b.min + Math.random() * (b.max - b.min)),
                velocity: bounds.map(b => (Math.random() - 0.5) * (b.max - b.min) * 0.1),
                bestPosition: null,
                bestFitness: -Infinity
            }));
        },
        _updateParticle: function(particle, globalBest, bounds, iter) {
            const w = this.config.w * Math.pow(this.config.wDecay, iter);

            particle.velocity = particle.velocity.map((v, i) => {
                const cognitive = this.config.c1 * Math.random() *
                    ((particle.bestPosition?.[i] || particle.position[i]) - particle.position[i]);
                const social = this.config.c2 * Math.random() *
                    (globalBest.position[i] - particle.position[i]);
                return w * v + cognitive + social;
            });

            particle.position = particle.position.map((p, i) => {
                let newP = p + particle.velocity[i];
                // Clamp to bounds
                newP = Math.max(bounds[i].min, Math.min(bounds[i].max, newP));
                return newP;
            });
        },
        _evaluateFitness: function(position, material, tool, objective) {
            const [Vc, fz, ap, ae] = position;

            // Calculate metrics
            const MRR = ae * ap * fz * tool.num_flutes *
                       (1000 * Vc / (Math.PI * tool.diameter)); // mm³/min

            const toolLife = PRISM_PHYSICS_ENGINE.extendedTaylorToolLife(Vc, fz, ap, material);
            const T = toolLife.toolLife;

            const surfaceFinish = PRISM_PHYSICS_ENGINE.predictSurfaceFinish({
                f: fz * tool.num_flutes,
                r: tool.corner_radius || 0.4
            });
            const Ra = surfaceFinish.Ra_um;

            // Objective functions
            let fitness;
            switch (objective) {
                case 'productivity':
                    fitness = MRR / 10000;
                    break;
                case 'tool_life':
                    fitness = T / 60;
                    break;
                case 'surface_finish':
                    fitness = 10 / (Ra + 0.1);
                    break;
                case 'balanced':
                default:
                    // Multi-objective: weighted sum
                    fitness = 0.4 * (MRR / 10000) +
                             0.3 * (T / 60) +
                             0.3 * (10 / (Ra + 0.1));
            }
            return fitness;
        },
        _decodeSolution: function(position, material, tool) {
            const [Vc, fz, ap, ae] = position;

            const rpm = Math.round(1000 * Vc / (Math.PI * tool.diameter));
            const feed = Math.round(fz * tool.num_flutes * rpm);

            return {
                cuttingSpeed: Math.round(Vc),
                feedPerTooth: Math.round(fz * 1000) / 1000,
                depthOfCut: Math.round(ap * 100) / 100,
                widthOfCut: Math.round(ae * 100) / 100,
                rpm,
                feedRate: feed,
                unit: { speed: 'm/min', feed: 'mm/min', depth: 'mm' }
            };
        }
    },
    /**
     * Ant Colony Optimization for Operation Sequencing
     * Minimizes: tool changes, setup time, total distance
     */
    ACO_OperationSequence: {

        config: {
            numAnts: 20,
            maxIterations: 50,
            alpha: 1.0,      // Pheromone importance
            beta: 2.0,       // Heuristic importance
            evaporation: 0.3,
            Q: 100           // Pheromone deposit factor
        },
        optimize: function(operations, toolChangeTime = 30, rapidFeedRate = 10000) {
            const n = operations.length;
            if (n <= 1) return { sequence: operations, totalTime: 0 };

            // Build distance/cost matrix
            const costs = this._buildCostMatrix(operations, toolChangeTime, rapidFeedRate);

            // Initialize pheromones
            let pheromones = Array(n).fill(null).map(() => Array(n).fill(1.0));

            let bestPath = null;
            let bestCost = Infinity;

            // Main loop
            for (let iter = 0; iter < this.config.maxIterations; iter++) {
                const paths = [];
                const pathCosts = [];

                // Each ant builds a path
                for (let ant = 0; ant < this.config.numAnts; ant++) {
                    const path = this._buildPath(n, pheromones, costs);
                    const cost = this._calculatePathCost(path, costs);

                    paths.push(path);
                    pathCosts.push(cost);

                    if (cost < bestCost) {
                        bestCost = cost;
                        bestPath = [...path];
                    }
                }
                // Update pheromones
                pheromones = this._updatePheromones(pheromones, paths, pathCosts);
            }
            // Return optimized sequence
            return {
                sequence: bestPath.map(i => operations[i]),
                totalTime: bestCost,
                improvement: this._calculateImprovement(operations, bestPath, costs)
            };
        },
        _buildCostMatrix: function(operations, toolChangeTime, rapidFeedRate) {
            const n = operations.length;
            const costs = Array(n).fill(null).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) continue;

                    let cost = 0;

                    // Tool change cost
                    if (operations[i].toolId !== operations[j].toolId) {
                        cost += toolChangeTime;
                    }
                    // Rapid move cost
                    const dx = (operations[j].startX || 0) - (operations[i].endX || 0);
                    const dy = (operations[j].startY || 0) - (operations[i].endY || 0);
                    const dz = (operations[j].startZ || 0) - (operations[i].endZ || 0);
                    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    cost += distance / rapidFeedRate * 60; // seconds

                    // Setup change cost
                    if (operations[i].fixtureId !== operations[j].fixtureId) {
                        cost += 60; // 1 minute fixture change
                    }
                    costs[i][j] = cost;
                }
            }
            return costs;
        },
        _buildPath: function(n, pheromones, costs) {
            const path = [];
            const visited = new Set();

            // Start from random node
            let current = Math.floor(Math.random() * n);
            path.push(current);
            visited.add(current);

            while (path.length < n) {
                const probabilities = [];
                let total = 0;

                for (let j = 0; j < n; j++) {
                    if (visited.has(j)) continue;

                    const tau = Math.pow(pheromones[current][j], this.config.alpha);
                    const eta = Math.pow(1 / (costs[current][j] + 0.1), this.config.beta);
                    const prob = tau * eta;

                    probabilities.push({ node: j, prob });
                    total += prob;
                }
                // Roulette wheel selection
                let rand = Math.random() * total;
                let next = probabilities[0].node;

                for (const { node, prob } of probabilities) {
                    rand -= prob;
                    if (rand <= 0) {
                        next = node;
                        break;
                    }
                }
                path.push(next);
                visited.add(next);
                current = next;
            }
            return path;
        },
        _calculatePathCost: function(path, costs) {
            let total = 0;
            for (let i = 0; i < path.length - 1; i++) {
                total += costs[path[i]][path[i + 1]];
            }
            return total;
        },
        _updatePheromones: function(pheromones, paths, pathCosts) {
            const n = pheromones.length;

            // Evaporation
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    pheromones[i][j] *= (1 - this.config.evaporation);
                }
            }
            // Deposit
            for (let ant = 0; ant < paths.length; ant++) {
                const deposit = this.config.Q / pathCosts[ant];
                const path = paths[ant];

                for (let i = 0; i < path.length - 1; i++) {
                    pheromones[path[i]][path[i + 1]] += deposit;
                    pheromones[path[i + 1]][path[i]] += deposit;
                }
            }
            return pheromones;
        },
        _calculateImprovement: function(operations, bestPath, costs) {
            // Original order cost
            const originalCost = this._calculatePathCost(
                operations.map((_, i) => i), costs
            );
            const optimizedCost = this._calculatePathCost(bestPath, costs);

            return {
                originalTime: originalCost,
                optimizedTime: optimizedCost,
                savedTime: originalCost - optimizedCost,
                improvement: ((originalCost - optimizedCost) / originalCost * 100).toFixed(1) + '%'
            };
        }
    }
}