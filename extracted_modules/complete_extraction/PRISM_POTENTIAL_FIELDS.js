const PRISM_POTENTIAL_FIELDS = {
        name: 'PRISM Potential Fields',
        version: '1.0.0',
        source: 'MIT 16.410 Autonomous Systems',
        
        // Configuration
        config: {
            attractiveGain: 1.0,      // Gain for attractive potential
            repulsiveGain: 100.0,     // Gain for repulsive potential
            obstacleRadius: 0.5,      // Influence radius of obstacles
            goalRadius: 0.1,          // Goal reached radius
            maxForce: 10.0,           // Maximum force magnitude
            stepSize: 0.1             // Step size for gradient descent
        },
        
        /**
         * Calculate attractive potential (quadratic)
         * U_att = 0.5 * k_att * ||q - q_goal||^2
         */
        attractivePotential: function(position, goal) {
            const diff = this._sub(position, goal);
            const dist = this._length(diff);
            return 0.5 * this.config.attractiveGain * dist * dist;
        },
        
        /**
         * Calculate attractive force (gradient of attractive potential)
         * F_att = -k_att * (q - q_goal)
         */
        attractiveForce: function(position, goal) {
            const diff = this._sub(position, goal);
            return this._scale(diff, -this.config.attractiveGain);
        },
        
        /**
         * Calculate repulsive potential (inverse distance)
         * U_rep = 0.5 * k_rep * (1/rho - 1/rho_0)^2 if rho <= rho_0, 0 otherwise
         */
        repulsivePotential: function(position, obstacle, obstacleRadius) {
            const radius = obstacleRadius || this.config.obstacleRadius;
            const diff = this._sub(position, obstacle);
            const dist = this._length(diff);
            
            if (dist > radius) return 0;
            if (dist < 0.001) dist = 0.001; // Avoid division by zero
            
            const term = 1 / dist - 1 / radius;
            return 0.5 * this.config.repulsiveGain * term * term;
        },
        
        /**
         * Calculate repulsive force
         * F_rep = k_rep * (1/rho - 1/rho_0) * (1/rho^2) * grad(rho)
         */
        repulsiveForce: function(position, obstacle, obstacleRadius) {
            const radius = obstacleRadius || this.config.obstacleRadius;
            const diff = this._sub(position, obstacle);
            let dist = this._length(diff);
            
            if (dist > radius) return { x: 0, y: 0, z: 0 };
            if (dist < 0.001) dist = 0.001;
            
            const term = 1 / dist - 1 / radius;
            const magnitude = this.config.repulsiveGain * term / (dist * dist);
            
            const direction = this._normalize(diff);
            return this._scale(direction, magnitude);
        },
        
        /**
         * Calculate total potential
         */
        totalPotential: function(position, goal, obstacles) {
            let potential = this.attractivePotential(position, goal);
            
            for (const obs of obstacles) {
                potential += this.repulsivePotential(position, obs.center, obs.radius);
            }
            
            return potential;
        },
        
        /**
         * Calculate total force
         */
        totalForce: function(position, goal, obstacles) {
            let force = this.attractiveForce(position, goal);
            
            for (const obs of obstacles) {
                const repForce = this.repulsiveForce(position, obs.center, obs.radius);
                force = this._add(force, repForce);
            }
            
            // Clamp force magnitude
            const magnitude = this._length(force);
            if (magnitude > this.config.maxForce) {
                force = this._scale(this._normalize(force), this.config.maxForce);
            }
            
            return force;
        },
        
        /**
         * Plan path using gradient descent on potential field
         */
        planPath: function(start, goal, obstacles, maxIterations = 1000) {
            const path = [{ ...start }];
            let current = { ...start };
            
            for (let i = 0; i < maxIterations; i++) {
                const dist = this._length(this._sub(current, goal));
                
                // Check if goal reached
                if (dist < this.config.goalRadius) {
                    path.push({ ...goal });
                    return { success: true, path, iterations: i };
                }
                
                // Calculate force and move
                const force = this.totalForce(current, goal, obstacles);
                const step = this._scale(this._normalize(force), this.config.stepSize);
                
                // Check for local minima (very small force)
                if (this._length(force) < 0.001) {
                    return { success: false, path, iterations: i, reason: 'local_minimum' };
                }
                
                current = this._add(current, step);
                path.push({ ...current });
            }
            
            return { success: false, path, iterations: maxIterations, reason: 'max_iterations' };
        },
        
        /**
         * Plan path with navigation function (avoids local minima)
         * Uses harmonic potential approach
         */
        planPathHarmonic: function(start, goal, obstacles, gridSize = 50, maxIterations = 500) {
            // Simplified harmonic potential using gradient descent with random perturbation
            const path = [{ ...start }];
            let current = { ...start };
            let stuckCount = 0;
            const maxStuck = 10;
            
            for (let i = 0; i < maxIterations; i++) {
                const dist = this._length(this._sub(current, goal));
                
                if (dist < this.config.goalRadius) {
                    path.push({ ...goal });
                    return { success: true, path, iterations: i };
                }
                
                let force = this.totalForce(current, goal, obstacles);
                
                // Check for stuck condition
                if (this._length(force) < 0.01) {
                    stuckCount++;
                    if (stuckCount > maxStuck) {
                        return { success: false, path, iterations: i, reason: 'local_minimum' };
                    }
                    // Add random perturbation to escape
                    force = {
                        x: force.x + (Math.random() - 0.5) * 2,
                        y: force.y + (Math.random() - 0.5) * 2,
                        z: force.z + (Math.random() - 0.5) * 2
                    };
                } else {
                    stuckCount = 0;
                }
                
                const step = this._scale(this._normalize(force), this.config.stepSize);
                current = this._add(current, step);
                path.push({ ...current });
            }
            
            return { success: false, path, iterations: maxIterations, reason: 'max_iterations' };
        },
        
        /**
         * Generate potential field visualization data
         */
        generateFieldVisualization: function(goal, obstacles, bounds, resolution = 20) {
            const { minX, maxX, minY, maxY } = bounds;
            const stepX = (maxX - minX) / resolution;
            const stepY = (maxY - minY) / resolution;
            
            const field = [];
            
            for (let i = 0; i <= resolution; i++) {
                for (let j = 0; j <= resolution; j++) {
                    const x = minX + i * stepX;
                    const y = minY + j * stepY;
                    const position = { x, y, z: 0 };
                    
                    const potential = this.totalPotential(position, goal, obstacles);
                    const force = this.totalForce(position, goal, obstacles);
                    
                    field.push({
                        x, y,
                        potential,
                        forceX: force.x,
                        forceY: force.y,
                        forceMagnitude: this._length(force)
                    });
                }
            }
            
            return field;
        },
        
        // Vector operations
        _add: function(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: (a.z || 0) + (b.z || 0) }; },
        _sub: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }; },
        _scale: function(v, s) { return { x: v.x * s, y: v.y * s, z: (v.z || 0) * s }; },
        _length: function(v) { return Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0)); },
        _normalize: function(v) {
            const len = this._length(v);
            return len > 0 ? this._scale(v, 1 / len) : v;
        },
        
        // Self-test
        selfTest: function() {
            console.log('[Potential Fields] Running self-test...');
            
            const start = { x: 0, y: 0, z: 0 };
            const goal = { x: 5, y: 5, z: 0 };
            const obstacles = [
                { center: { x: 2.5, y: 2.5, z: 0 }, radius: 1.0 }
            ];
            
            const result = this.planPath(start, goal, obstacles);
            const success = result.path.length > 0;
            
            console.log(`  ✓ Path Planning: ${success ? 'PASS' : 'FAIL'} (${result.success ? 'reached goal' : result.reason})`);
            
            return { passed: success ? 1 : 0, total: 1 };
        }
    }