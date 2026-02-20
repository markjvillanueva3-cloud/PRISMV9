const PRISM_RIGID_BODY_DYNAMICS_ENGINE = {
    name: 'PRISM_RIGID_BODY_DYNAMICS_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.07, Stanford CS 223A',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INERTIA TENSOR COMPUTATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute inertia tensor for common shapes
     * @param {string} shape - Shape type
     * @param {Object} params - Shape parameters including mass
     * @returns {Array} 3×3 inertia tensor
     */
    inertiaTensor: function(shape, params) {
        const { mass: m } = params;
        let I;
        
        switch (shape.toLowerCase()) {
            case 'solid_cylinder':
            case 'spindle': {
                // Cylinder aligned with Z-axis
                const { radius: r, length: h } = params;
                const Ixx = (1/12) * m * (3 * r * r + h * h);
                const Iyy = Ixx;
                const Izz = (1/2) * m * r * r;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'hollow_cylinder':
            case 'tube': {
                const { innerRadius: ri, outerRadius: ro, length: h } = params;
                const r2Sum = ri * ri + ro * ro;
                const Ixx = (1/12) * m * (3 * r2Sum + h * h);
                const Iyy = Ixx;
                const Izz = (1/2) * m * r2Sum;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'rectangular_block':
            case 'table': {
                const { a, b, c } = params; // dimensions in x, y, z
                const Ixx = (1/12) * m * (b * b + c * c);
                const Iyy = (1/12) * m * (a * a + c * c);
                const Izz = (1/12) * m * (a * a + b * b);
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'solid_sphere':
            case 'ball': {
                const { radius: r } = params;
                const Iall = (2/5) * m * r * r;
                I = [[Iall, 0, 0], [0, Iall, 0], [0, 0, Iall]];
                break;
            }
            
            case 'thin_rod': {
                // Rod along X-axis
                const { length: L } = params;
                const Ixx = 0; // About own axis
                const Iyy = (1/12) * m * L * L;
                const Izz = Iyy;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'thin_disk': {
                // Disk in XY plane
                const { radius: r } = params;
                const Ixx = (1/4) * m * r * r;
                const Iyy = Ixx;
                const Izz = (1/2) * m * r * r;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            default:
                throw new Error(`Unknown shape: ${shape}`);
        }
        
        return {
            tensor: I,
            mass: m,
            shape,
            principalMoments: [I[0][0], I[1][1], I[2][2]]
        };
    },
    
    /**
     * Parallel axis theorem for shifted inertia
     * I_new = I_cm + m * (d² * Identity - d ⊗ d)
     * @param {Array} I_cm - Inertia tensor about center of mass
     * @param {number} mass - Total mass
     * @param {Array} offset - [dx, dy, dz] offset vector
     * @returns {Array} New inertia tensor
     */
    parallelAxisTheorem: function(I_cm, mass, offset) {
        const [dx, dy, dz] = offset;
        const d2 = dx*dx + dy*dy + dz*dz;
        
        return [
            [I_cm[0][0] + mass*(d2 - dx*dx), I_cm[0][1] - mass*dx*dy, I_cm[0][2] - mass*dx*dz],
            [I_cm[1][0] - mass*dy*dx, I_cm[1][1] + mass*(d2 - dy*dy), I_cm[1][2] - mass*dy*dz],
            [I_cm[2][0] - mass*dz*dx, I_cm[2][1] - mass*dz*dy, I_cm[2][2] + mass*(d2 - dz*dz)]
        ];
    },
    
    /**
     * Rotate inertia tensor: I_new = R * I * R^T
     * @param {Array} I - Original inertia tensor
     * @param {Array} R - 3×3 rotation matrix
     * @returns {Array} Rotated inertia tensor
     */
    rotateInertiaTensor: function(I, R) {
        const Rt = [
            [R[0][0], R[1][0], R[2][0]],
            [R[0][1], R[1][1], R[2][1]],
            [R[0][2], R[1][2], R[2][2]]
        ];
        
        // temp = R * I
        const temp = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    temp[i][j] += R[i][k] * I[k][j];
                }
            }
        }
        
        // result = temp * R^T
        const result = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    result[i][j] += temp[i][k] * Rt[k][j];
                }
            }
        }
        
        return result;
    },
    
    /**
     * Combine inertias of multiple rigid bodies
     * @param {Array} bodies - Array of {mass, inertia, position, orientation}
     * @returns {Object} Combined inertia properties
     */
    combineInertias: function(bodies) {
        let totalMass = 0;
        const com = [0, 0, 0]; // Center of mass
        
        // Calculate combined center of mass
        for (const body of bodies) {
            totalMass += body.mass;
            com[0] += body.mass * body.position[0];
            com[1] += body.mass * body.position[1];
            com[2] += body.mass * body.position[2];
        }
        com[0] /= totalMass;
        com[1] /= totalMass;
        com[2] /= totalMass;
        
        // Calculate combined inertia about COM
        let I_total = [[0,0,0], [0,0,0], [0,0,0]];
        
        for (const body of bodies) {
            // Offset from combined COM
            const offset = [
                body.position[0] - com[0],
                body.position[1] - com[1],
                body.position[2] - com[2]
            ];
            
            // Rotate body's inertia if orientation provided
            let I_body = body.inertia;
            if (body.orientation) {
                I_body = this.rotateInertiaTensor(body.inertia, body.orientation);
            }
            
            // Apply parallel axis theorem
            const I_shifted = this.parallelAxisTheorem(I_body, body.mass, offset);
            
            // Add to total
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    I_total[i][j] += I_shifted[i][j];
                }
            }
        }
        
        return {
            mass: totalMass,
            centerOfMass: { x: com[0], y: com[1], z: com[2] },
            inertiaTensor: I_total,
            principalMoments: [I_total[0][0], I_total[1][1], I_total[2][2]]
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // NEWTON-EULER DYNAMICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Newton-Euler equations of motion
     * F = m * a_cm
     * M = I * α + ω × (I * ω)
     * 
     * @param {Object} state - {position, velocity, orientation, angularVelocity}
     * @param {Object} body - {mass, inertiaTensor}
     * @param {Object} forces - {force: [Fx,Fy,Fz], torque: [Mx,My,Mz]}
     * @returns {Object} Accelerations
     */
    newtonEuler: function(state, body, forces) {
        const { mass, inertiaTensor: I } = body;
        const omega = state.angularVelocity || [0, 0, 0];
        const F = forces.force || [0, 0, 0];
        const M = forces.torque || [0, 0, 0];
        
        // Linear acceleration: a = F/m
        const linearAccel = F.map(f => f / mass);
        
        // I * ω
        const Iomega = [
            I[0][0]*omega[0] + I[0][1]*omega[1] + I[0][2]*omega[2],
            I[1][0]*omega[0] + I[1][1]*omega[1] + I[1][2]*omega[2],
            I[2][0]*omega[0] + I[2][1]*omega[1] + I[2][2]*omega[2]
        ];
        
        // ω × (I * ω) - gyroscopic term
        const gyroscopic = [
            omega[1]*Iomega[2] - omega[2]*Iomega[1],
            omega[2]*Iomega[0] - omega[0]*Iomega[2],
            omega[0]*Iomega[1] - omega[1]*Iomega[0]
        ];
        
        // M - ω × (I * ω)
        const torqueNet = [
            M[0] - gyroscopic[0],
            M[1] - gyroscopic[1],
            M[2] - gyroscopic[2]
        ];
        
        // Solve I * α = torqueNet for angular acceleration
        const Iinv = this._invert3x3(I);
        const angularAccel = [
            Iinv[0][0]*torqueNet[0] + Iinv[0][1]*torqueNet[1] + Iinv[0][2]*torqueNet[2],
            Iinv[1][0]*torqueNet[0] + Iinv[1][1]*torqueNet[1] + Iinv[1][2]*torqueNet[2],
            Iinv[2][0]*torqueNet[0] + Iinv[2][1]*torqueNet[1] + Iinv[2][2]*torqueNet[2]
        ];
        
        return {
            linearAcceleration: { x: linearAccel[0], y: linearAccel[1], z: linearAccel[2] },
            angularAcceleration: { x: angularAccel[0], y: angularAccel[1], z: angularAccel[2] },
            gyroscopicTorque: gyroscopic
        };
    },
    
    /**
     * Euler's equations of rotational motion (body frame)
     * For symmetric bodies (spindles), includes gyroscopic effects
     */
    eulerEquations: function(omega, torque, I) {
        // Euler's equations: I * ω_dot + ω × (I * ω) = τ
        // For principal axes: 
        //   I₁ω̇₁ + (I₃ - I₂)ω₂ω₃ = τ₁
        //   I₂ω̇₂ + (I₁ - I₃)ω₃ω₁ = τ₂
        //   I₃ω̇₃ + (I₂ - I₁)ω₁ω₂ = τ₃
        
        const I1 = I[0][0], I2 = I[1][1], I3 = I[2][2];
        const [w1, w2, w3] = omega;
        const [t1, t2, t3] = torque;
        
        const omega_dot = [
            (t1 - (I3 - I2) * w2 * w3) / I1,
            (t2 - (I1 - I3) * w3 * w1) / I2,
            (t3 - (I2 - I1) * w1 * w2) / I3
        ];
        
        return {
            angularAcceleration: omega_dot,
            gyroscopicCoupling: [
                (I3 - I2) * w2 * w3,
                (I1 - I3) * w3 * w1,
                (I2 - I1) * w1 * w2
            ]
        };
    },
    
    /**
     * Simulate spindle dynamics with unbalance
     * @param {Object} spindle - Spindle properties
     * @param {number} rpm - Rotational speed
     * @param {Object} unbalance - {mass, radius, angle}
     * @returns {Object} Dynamic response
     */
    spindleUnbalance: function(spindle, rpm, unbalance) {
        const omega = rpm * 2 * Math.PI / 60; // rad/s
        const { mass: m_u, radius: r, angle } = unbalance;
        
        // Centrifugal force from unbalance
        const F_centrifugal = m_u * r * omega * omega;
        
        // Force components (rotating with spindle)
        const theta = angle * Math.PI / 180;
        const Fx = F_centrifugal * Math.cos(theta);
        const Fy = F_centrifugal * Math.sin(theta);
        
        // Vibration amplitude (assuming simple spring model)
        const k = spindle.stiffness || 1e8; // N/m
        const amplitude = F_centrifugal / k;
        
        // Frequency of vibration equals rpm
        const vibrationFreq = rpm / 60;
        
        return {
            centrifugalForce: F_centrifugal,
            forceComponents: { Fx, Fy },
            vibrationAmplitude: amplitude * 1000, // mm
            vibrationFrequency: vibrationFreq, // Hz
            severity: this._classifyVibration(amplitude, rpm)
        };
    },
    
    _classifyVibration: function(amplitude, rpm) {
        // ISO 10816 vibration severity standards (simplified)
        const velocity = amplitude * rpm * Math.PI / 30; // mm/s RMS approx
        
        if (velocity < 1.8) return 'A - Good';
        if (velocity < 4.5) return 'B - Acceptable';
        if (velocity < 11.2) return 'C - Unsatisfactory';
        return 'D - Unacceptable';
    },
    
    _invert3x3: function(A) {
        const det = A[0][0]*(A[1][1]*A[2][2] - A[1][2]*A[2][1])
                  - A[0][1]*(A[1][0]*A[2][2] - A[1][2]*A[2][0])
                  + A[0][2]*(A[1][0]*A[2][1] - A[1][1]*A[2][0]);
        
        if (Math.abs(det) < 1e-15) {
            throw new Error('Matrix is singular');
        }
        
        const invDet = 1 / det;
        
        return [
            [
                (A[1][1]*A[2][2] - A[1][2]*A[2][1]) * invDet,
                (A[0][2]*A[2][1] - A[0][1]*A[2][2]) * invDet,
                (A[0][1]*A[1][2] - A[0][2]*A[1][1]) * invDet
            ],
            [
                (A[1][2]*A[2][0] - A[1][0]*A[2][2]) * invDet,
                (A[0][0]*A[2][2] - A[0][2]*A[2][0]) * invDet,
                (A[0][2]*A[1][0] - A[0][0]*A[1][2]) * invDet
            ],
            [
                (A[1][0]*A[2][1] - A[1][1]*A[2][0]) * invDet,
                (A[0][1]*A[2][0] - A[0][0]*A[2][1]) * invDet,
                (A[0][0]*A[1][1] - A[0][1]*A[1][0]) * invDet
            ]
        ];
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LAGRANGIAN MECHANICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute kinetic energy
     * T = (1/2) * m * v² + (1/2) * ω^T * I * ω
     */
    kineticEnergy: function(state, body) {
        const { mass, inertiaTensor: I } = body;
        const v = state.velocity || [0, 0, 0];
        const omega = state.angularVelocity || [0, 0, 0];
        
        // Translational KE
        const T_trans = 0.5 * mass * (v[0]**2 + v[1]**2 + v[2]**2);
        
        // Rotational KE: (1/2) * ω^T * I * ω
        const Iomega = [
            I[0][0]*omega[0] + I[0][1]*omega[1] + I[0][2]*omega[2],
            I[1][0]*omega[0] + I[1][1]*omega[1] + I[1][2]*omega[2],
            I[2][0]*omega[0] + I[2][1]*omega[1] + I[2][2]*omega[2]
        ];
        const T_rot = 0.5 * (omega[0]*Iomega[0] + omega[1]*Iomega[1] + omega[2]*Iomega[2]);
        
        return {
            total: T_trans + T_rot,
            translational: T_trans,
            rotational: T_rot
        };
    },
    
    /**
     * Compute potential energy
     * V = m * g * h + (1/2) * k * x²
     */
    potentialEnergy: function(state, body, environment = {}) {
        const { mass } = body;
        const g = environment.gravity || 9.81;
        const h = state.position?.[2] || state.position?.z || 0;
        
        // Gravitational PE
        const V_gravity = mass * g * h;
        
        // Spring PE (if spring connected)
        let V_spring = 0;
        if (environment.spring) {
            const { stiffness: k, equilibrium } = environment.spring;
            const pos = state.position || [0, 0, 0];
            const dx = (Array.isArray(pos) ? pos[0] : pos.x) - equilibrium[0];
            const dy = (Array.isArray(pos) ? pos[1] : pos.y) - equilibrium[1];
            const dz = (Array.isArray(pos) ? pos[2] : pos.z) - equilibrium[2];
            V_spring = 0.5 * k * (dx*dx + dy*dy + dz*dz);
        }
        
        return {
            total: V_gravity + V_spring,
            gravitational: V_gravity,
            spring: V_spring
        };
    },
    
    /**
     * Lagrangian L = T - V
     */
    lagrangian: function(state, body, environment = {}) {
        const T = this.kineticEnergy(state, body);
        const V = this.potentialEnergy(state, body, environment);
        
        return {
            lagrangian: T.total - V.total,
            kineticEnergy: T,
            potentialEnergy: V
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTEGRATION & SIMULATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Fourth-order Runge-Kutta integrator for rigid body dynamics
     */
    rungeKutta4: function(state, body, forces, dt) {
        const f = (s) => {
            const accel = this.newtonEuler(s, body, forces);
            return {
                velocity: accel.linearAcceleration,
                angularAcceleration: accel.angularAcceleration
            };
        };
        
        const k1 = f(state);
        
        // k2
        const state2 = {
            position: [
                state.position[0] + 0.5 * dt * k1.velocity.x,
                state.position[1] + 0.5 * dt * k1.velocity.y,
                state.position[2] + 0.5 * dt * k1.velocity.z
            ],
            velocity: [
                state.velocity[0] + 0.5 * dt * k1.velocity.x,
                state.velocity[1] + 0.5 * dt * k1.velocity.y,
                state.velocity[2] + 0.5 * dt * k1.velocity.z
            ],
            angularVelocity: [
                state.angularVelocity[0] + 0.5 * dt * k1.angularAcceleration.x,
                state.angularVelocity[1] + 0.5 * dt * k1.angularAcceleration.y,
                state.angularVelocity[2] + 0.5 * dt * k1.angularAcceleration.z
            ]
        };
        const k2 = f(state2);
        
        // k3
        const state3 = {
            position: [
                state.position[0] + 0.5 * dt * k2.velocity.x,
                state.position[1] + 0.5 * dt * k2.velocity.y,
                state.position[2] + 0.5 * dt * k2.velocity.z
            ],
            velocity: [
                state.velocity[0] + 0.5 * dt * k2.velocity.x,
                state.velocity[1] + 0.5 * dt * k2.velocity.y,
                state.velocity[2] + 0.5 * dt * k2.velocity.z
            ],
            angularVelocity: [
                state.angularVelocity[0] + 0.5 * dt * k2.angularAcceleration.x,
                state.angularVelocity[1] + 0.5 * dt * k2.angularAcceleration.y,
                state.angularVelocity[2] + 0.5 * dt * k2.angularAcceleration.z
            ]
        };
        const k3 = f(state3);
        
        // k4
        const state4 = {
            position: [
                state.position[0] + dt * k3.velocity.x,
                state.position[1] + dt * k3.velocity.y,
                state.position[2] + dt * k3.velocity.z
            ],
            velocity: [
                state.velocity[0] + dt * k3.velocity.x,
                state.velocity[1] + dt * k3.velocity.y,
                state.velocity[2] + dt * k3.velocity.z
            ],
            angularVelocity: [
                state.angularVelocity[0] + dt * k3.angularAcceleration.x,
                state.angularVelocity[1] + dt * k3.angularAcceleration.y,
                state.angularVelocity[2] + dt * k3.angularAcceleration.z
            ]
        };
        const k4 = f(state4);
        
        // Final integration
        return {
            position: [
                state.position[0] + dt/6 * (k1.velocity.x + 2*k2.velocity.x + 2*k3.velocity.x + k4.velocity.x),
                state.position[1] + dt/6 * (k1.velocity.y + 2*k2.velocity.y + 2*k3.velocity.y + k4.velocity.y),
                state.position[2] + dt/6 * (k1.velocity.z + 2*k2.velocity.z + 2*k3.velocity.z + k4.velocity.z)
            ],
            velocity: [
                state.velocity[0] + dt/6 * (k1.velocity.x + 2*k2.velocity.x + 2*k3.velocity.x + k4.velocity.x),
                state.velocity[1] + dt/6 * (k1.velocity.y + 2*k2.velocity.y + 2*k3.velocity.y + k4.velocity.y),
                state.velocity[2] + dt/6 * (k1.velocity.z + 2*k2.velocity.z + 2*k3.velocity.z + k4.velocity.z)
            ],
            angularVelocity: [
                state.angularVelocity[0] + dt/6 * (k1.angularAcceleration.x + 2*k2.angularAcceleration.x + 2*k3.angularAcceleration.x + k4.angularAcceleration.x),
                state.angularVelocity[1] + dt/6 * (k1.angularAcceleration.y + 2*k2.angularAcceleration.y + 2*k3.angularAcceleration.y + k4.angularAcceleration.y),
                state.angularVelocity[2] + dt/6 * (k1.angularAcceleration.z + 2*k2.angularAcceleration.z + 2*k3.angularAcceleration.z + k4.angularAcceleration.z)
            ]
        };
    },
    
    /**
     * Simulate rigid body motion over time
     */
    simulate: function(initialState, body, forceFn, timespan, dt = 0.001) {
        const results = [];
        let state = { ...initialState };
        let t = timespan.start || 0;
        const tEnd = timespan.end;
        
        while (t <= tEnd) {
            const forces = forceFn(t, state);
            const energy = this.lagrangian(state, body);
            
            results.push({
                time: t,
                state: { ...state },
                energy: energy,
                forces: forces
            });
            
            // Integrate one time step
            state = this.rungeKutta4(state, body, forces, dt);
            t += dt;
        }
        
        return {
            trajectory: results,
            finalState: state,
            statistics: this._computeStats(results)
        };
    },
    
    _computeStats: function(results) {
        const energies = results.map(r => r.energy.lagrangian);
        const positions = results.map(r => r.state.position);
        
        return {
            energyConservation: {
                initial: energies[0],
                final: energies[energies.length - 1],
                variation: Math.max(...energies) - Math.min(...energies)
            },
            boundingBox: {
                x: [Math.min(...positions.map(p => p[0])), Math.max(...positions.map(p => p[0]))],
                y: [Math.min(...positions.map(p => p[1])), Math.max(...positions.map(p => p[1]))],
                z: [Math.min(...positions.map(p => p[2])), Math.max(...positions.map(p => p[2]))]
            }
        };
    },
    
    // Registration system
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('dynamics.inertia.tensor', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.inertiaTensor');
            PRISM_GATEWAY.register('dynamics.inertia.parallel', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.parallelAxisTheorem');
            PRISM_GATEWAY.register('dynamics.inertia.rotate', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.rotateInertiaTensor');
            PRISM_GATEWAY.register('dynamics.inertia.combine', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.combineInertias');
            PRISM_GATEWAY.register('dynamics.newton_euler', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.newtonEuler');
            PRISM_GATEWAY.register('dynamics.euler_equations', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.eulerEquations');
            PRISM_GATEWAY.register('dynamics.spindle.unbalance', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.spindleUnbalance');
            PRISM_GATEWAY.register('dynamics.energy.kinetic', 'PRISM_RIGID