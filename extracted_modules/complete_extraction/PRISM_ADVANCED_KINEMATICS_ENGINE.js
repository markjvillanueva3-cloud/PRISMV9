const PRISM_ADVANCED_KINEMATICS_ENGINE = {
    name: 'PRISM_ADVANCED_KINEMATICS_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.07, Stanford CS 223A',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // HOMOGENEOUS TRANSFORMATION MATRICES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Create rotation matrix about X axis
     * @param {number} theta - Angle in radians
     * @returns {Array} 4x4 homogeneous transformation matrix
     */
    rotX: function(theta) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [
            [1, 0,  0, 0],
            [0, c, -s, 0],
            [0, s,  c, 0],
            [0, 0,  0, 1]
        ];
    },
    
    /**
     * Create rotation matrix about Y axis
     */
    rotY: function(theta) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [
            [ c, 0, s, 0],
            [ 0, 1, 0, 0],
            [-s, 0, c, 0],
            [ 0, 0, 0, 1]
        ];
    },
    
    /**
     * Create rotation matrix about Z axis
     */
    rotZ: function(theta) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [
            [c, -s, 0, 0],
            [s,  c, 0, 0],
            [0,  0, 1, 0],
            [0,  0, 0, 1]
        ];
    },
    
    /**
     * Create translation matrix
     */
    translate: function(dx, dy, dz) {
        return [
            [1, 0, 0, dx],
            [0, 1, 0, dy],
            [0, 0, 1, dz],
            [0, 0, 0, 1]
        ];
    },
    
    /**
     * Multiply two 4x4 matrices
     */
    matMul4x4: function(A, B) {
        const result = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    },
    
    /**
     * Chain multiple transformations
     */
    chainTransforms: function(...transforms) {
        return transforms.reduce((acc, T) => this.matMul4x4(acc, T));
    },
    
    /**
     * Transform a point using 4x4 matrix
     */
    transformPoint: function(T, point) {
        const p = [point.x || point[0], point.y || point[1], point.z || point[2], 1];
        const result = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i] += T[i][j] * p[j];
            }
        }
        return { x: result[0], y: result[1], z: result[2] };
    },
    
    /**
     * Invert a homogeneous transformation matrix
     * For pure rotation + translation: inv(T) = [R^T, -R^T * t; 0, 1]
     */
    invertTransform: function(T) {
        // Extract rotation (3x3) and translation
        const R = [
            [T[0][0], T[0][1], T[0][2]],
            [T[1][0], T[1][1], T[1][2]],
            [T[2][0], T[2][1], T[2][2]]
        ];
        const t = [T[0][3], T[1][3], T[2][3]];
        
        // R^T (rotation part is orthogonal)
        const RT = [
            [R[0][0], R[1][0], R[2][0]],
            [R[0][1], R[1][1], R[2][1]],
            [R[0][2], R[1][2], R[2][2]]
        ];
        
        // -R^T * t
        const tNew = [
            -(RT[0][0]*t[0] + RT[0][1]*t[1] + RT[0][2]*t[2]),
            -(RT[1][0]*t[0] + RT[1][1]*t[1] + RT[1][2]*t[2]),
            -(RT[2][0]*t[0] + RT[2][1]*t[1] + RT[2][2]*t[2])
        ];
        
        return [
            [RT[0][0], RT[0][1], RT[0][2], tNew[0]],
            [RT[1][0], RT[1][1], RT[1][2], tNew[1]],
            [RT[2][0], RT[2][1], RT[2][2], tNew[2]],
            [0, 0, 0, 1]
        ];
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DENAVIT-HARTENBERG PARAMETERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Create DH transformation matrix
     * @param {Object} params - {theta, d, a, alpha} DH parameters
     * @returns {Array} 4x4 transformation matrix
     */
    dhTransform: function(params) {
        const { theta, d, a, alpha } = params;
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        const ca = Math.cos(alpha);
        const sa = Math.sin(alpha);
        
        return [
            [ct, -st*ca,  st*sa, a*ct],
            [st,  ct*ca, -ct*sa, a*st],
            [0,   sa,     ca,    d   ],
            [0,   0,      0,     1   ]
        ];
    },
    
    /**
     * Forward kinematics using DH parameters
     * @param {Array} dhTable - Array of {theta, d, a, alpha, type}
     * @param {Array} jointValues - Joint positions (radians for revolute, mm for prismatic)
     * @returns {Object} End effector pose
     */
    forwardKinematicsDH: function(dhTable, jointValues) {
        let T = [[1,0,0,0], [0,1,0,0], [0,0,1,0], [0,0,0,1]]; // Identity
        const transforms = [];
        
        for (let i = 0; i < dhTable.length; i++) {
            const dh = { ...dhTable[i] };
            
            // Apply joint value based on joint type
            if (dhTable[i].type === 'revolute') {
                dh.theta = (dh.theta || 0) + jointValues[i];
            } else if (dhTable[i].type === 'prismatic') {
                dh.d = (dh.d || 0) + jointValues[i];
            }
            
            const Ti = this.dhTransform(dh);
            T = this.matMul4x4(T, Ti);
            transforms.push({ joint: i, T: JSON.parse(JSON.stringify(T)) });
        }
        
        // Extract position and orientation
        const position = { x: T[0][3], y: T[1][3], z: T[2][3] };
        const rotation = [
            [T[0][0], T[0][1], T[0][2]],
            [T[1][0], T[1][1], T[1][2]],
            [T[2][0], T[2][1], T[2][2]]
        ];
        
        // Extract Euler angles (ZYX convention)
        const euler = this.rotationToEuler(rotation);
        
        return {
            position,
            rotation,
            euler,
            transform: T,
            intermediateTransforms: transforms
        };
    },
    
    /**
     * Extract Euler angles from rotation matrix (ZYX convention)
     */
    rotationToEuler: function(R) {
        let roll, pitch, yaw;
        
        // Check for gimbal lock
        if (Math.abs(R[2][0]) >= 1 - 1e-10) {
            yaw = 0;
            if (R[2][0] < 0) {
                pitch = Math.PI / 2;
                roll = Math.atan2(R[0][1], R[0][2]);
            } else {
                pitch = -Math.PI / 2;
                roll = Math.atan2(-R[0][1], -R[0][2]);
            }
        } else {
            pitch = Math.asin(-R[2][0]);
            roll = Math.atan2(R[2][1] / Math.cos(pitch), R[2][2] / Math.cos(pitch));
            yaw = Math.atan2(R[1][0] / Math.cos(pitch), R[0][0] / Math.cos(pitch));
        }
        
        return {
            roll: roll * 180 / Math.PI,
            pitch: pitch * 180 / Math.PI,
            yaw: yaw * 180 / Math.PI
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // JACOBIAN COMPUTATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute geometric Jacobian matrix
     * @param {Array} dhTable - DH parameters
     * @param {Array} jointValues - Current joint positions
     * @returns {Object} Jacobian matrix and related info
     */
    computeJacobian: function(dhTable, jointValues) {
        const n = dhTable.length;
        const J = [];
        
        // Compute all intermediate transforms
        const fk = this.forwardKinematicsDH(dhTable, jointValues);
        const transforms = fk.intermediateTransforms;
        const pn = [fk.position.x, fk.position.y, fk.position.z]; // End effector position
        
        // Build Jacobian column by column
        for (let i = 0; i < n; i++) {
            // Get z-axis of frame i-1 (before joint i)
            let zi, oi;
            if (i === 0) {
                zi = [0, 0, 1]; // Base frame z-axis
                oi = [0, 0, 0]; // Base frame origin
            } else {
                const Ti = transforms[i - 1].T;
                zi = [Ti[0][2], Ti[1][2], Ti[2][2]];
                oi = [Ti[0][3], Ti[1][3], Ti[2][3]];
            }
            
            if (dhTable[i].type === 'revolute') {
                // For revolute: Jv = z × (p - o), Jw = z
                const pMinusO = [pn[0] - oi[0], pn[1] - oi[1], pn[2] - oi[2]];
                const Jv = this.cross3(zi, pMinusO);
                J.push([Jv[0], Jv[1], Jv[2], zi[0], zi[1], zi[2]]);
            } else {
                // For prismatic: Jv = z, Jw = 0
                J.push([zi[0], zi[1], zi[2], 0, 0, 0]);
            }
        }
        
        // Transpose to get 6×n matrix
        const Jt = this.transpose(J);
        
        // Compute condition number for singularity detection
        const conditionNumber = this.estimateConditionNumber(Jt);
        
        return {
            jacobian: Jt,
            linearPart: Jt.slice(0, 3),
            angularPart: Jt.slice(3, 6),
            conditionNumber,
            nearSingularity: conditionNumber > 100
        };
    },
    
    /**
     * Cross product of two 3D vectors
     */
    cross3: function(a, b) {
        return [
            a[1]*b[2] - a[2]*b[1],
            a[2]*b[0] - a[0]*b[2],
            a[0]*b[1] - a[1]*b[0]
        ];
    },
    
    /**
     * Transpose matrix
     */
    transpose: function(A) {
        if (!A || !A.length) return [];
        return A[0].map((_, j) => A.map(row => row[j]));
    },
    
    /**
     * Estimate condition number (ratio of max to min singular value approximation)
     */
    estimateConditionNumber: function(J) {
        // Compute J * J^T
        const JJt = this.matMul(J, this.transpose(J));
        
        // Power iteration for max eigenvalue
        let v = Array(JJt.length).fill(1);
        for (let iter = 0; iter < 20; iter++) {
            const Av = JJt.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
            const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
            v = Av.map(x => x / norm);
        }
        const maxEig = v.reduce((s, vi, i) => 
            s + vi * JJt[i].reduce((ss, a, j) => ss + a * v[j], 0), 0);
        
        // Inverse power iteration for min eigenvalue
        const JJtInv = this.pseudoInverse(JJt);
        if (!JJtInv) return Infinity;
        
        let w = Array(JJtInv.length).fill(1);
        for (let iter = 0; iter < 20; iter++) {
            const Aw = JJtInv.map(row => row.reduce((s, a, j) => s + a * w[j], 0));
            const norm = Math.sqrt(Aw.reduce((s, x) => s + x * x, 0));
            if (norm < 1e-10) return Infinity;
            w = Aw.map(x => x / norm);
        }
        const minEigInv = w.reduce((s, wi, i) => 
            s + wi * JJtInv[i].reduce((ss, a, j) => ss + a * w[j], 0), 0);
        const minEig = 1 / minEigInv;
        
        return Math.sqrt(maxEig / Math.max(minEig, 1e-10));
    },
    
    /**
     * Matrix multiplication
     */
    matMul: function(A, B) {
        const m = A.length, n = B[0].length, p = B.length;
        const C = Array(m).fill(null).map(() => Array(n).fill(0));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < p; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    },
    
    /**
     * Pseudo-inverse using SVD approximation (simplified)
     */
    pseudoInverse: function(A) {
        const n = A.length;
        const At = this.transpose(A);
        const AtA = this.matMul(At, A);
        
        // Add regularization for numerical stability
        for (let i = 0; i < n; i++) {
            AtA[i][i] += 1e-10;
        }
        
        // Gauss-Jordan elimination
        const aug = AtA.map((row, i) => [...row, ...At[i]]);
        
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) return null;
            
            const pivot = aug[i][i];
            for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
            
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = aug[k][i];
                    for (let j = 0; j < 2 * n; j++) {
                        aug[k][j] -= factor * aug[i][j];
                    }
                }
            }
        }
        
        return aug.map(row => row.slice(n));
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 5-AXIS CNC SPECIFIC KINEMATICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * 5-Axis inverse kinematics with multiple solutions
     * @param {Object} toolPose - {position: {x,y,z}, axis: {i,j,k}}
     * @param {Object} config - Machine configuration
     * @returns {Array} Array of possible solutions
     */
    fiveAxisIK: function(toolPose, config = {}) {
        const { position, axis } = toolPose;
        const machineType = config.type || 'table-table'; // table-table, head-head, mixed
        
        // Normalize tool axis
        const len = Math.sqrt(axis.i**2 + axis.j**2 + axis.k**2);
        const n = { i: axis.i/len, j: axis.j/len, k: axis.k/len };
        
        const solutions = [];
        
        if (machineType === 'table-table') {
            // A-C table configuration (most common)
            // A rotates about X, C rotates about Z
            
            // Solution 1: Primary
            let A = Math.acos(-n.k) * 180 / Math.PI;
            let C = Math.atan2(n.j, n.i) * 180 / Math.PI;
            
            // Handle singularity at A = 0
            if (Math.abs(A) < 0.01) {
                C = config.previousC || 0;
            }
            
            solutions.push(this._computeXYZ(position, A, C, config, 1));
            
            // Solution 2: Alternative (A negative, C + 180)
            if (A > 0.01 && A < 179.99) {
                const A2 = -A;
                const C2 = C + 180;
                solutions.push(this._computeXYZ(position, A2, C2, config, 2));
            }
        } else if (machineType === 'head-head') {
            // A-C head configuration
            // Both rotary axes in spindle head
            
            let A = Math.acos(-n.k) * 180 / Math.PI;
            let C = Math.atan2(n.j, n.i) * 180 / Math.PI;
            
            solutions.push({
                X: position.x, Y: position.y, Z: position.z,
                A, C, valid: true, solution: 1
            });
        } else {
            // Mixed configuration (Table A, Head C or similar)
            let A = Math.acos(-n.k) * 180 / Math.PI;
            let C = Math.atan2(n.j, n.i) * 180 / Math.PI;
            
            solutions.push(this._computeXYZ(position, A, C, config, 1));
        }
        
        // Validate against limits
        return solutions.map(sol => ({
            ...sol,
            valid: this._checkLimits(sol, config.limits)
        }));
    },
    
    _computeXYZ: function(position, A, C, config, solutionNum) {
        const Arad = A * Math.PI / 180;
        const Crad = C * Math.PI / 180;
        
        // Pivot point compensation
        const pivot = config.pivotOffset || { x: 0, y: 0, z: 0 };
        
        // For table-table: compensate for table rotation
        const dx = pivot.x * (1 - Math.cos(Arad) * Math.cos(Crad));
        const dy = pivot.y * (1 - Math.cos(Arad) * Math.sin(Crad));
        const dz = pivot.z * (1 - Math.cos(Arad));
        
        return {
            X: position.x - dx,
            Y: position.y - dy,
            Z: position.z - dz,
            A, C,
            valid: true,
            solution: solutionNum
        };
    },
    
    _checkLimits: function(joints, limits) {
        if (!limits) return true;
        const axes = ['X', 'Y', 'Z', 'A', 'C'];
        for (const axis of axes) {
            if (limits[axis] && joints[axis] !== undefined) {
                const [min, max] = limits[axis];
                if (joints[axis] < min || joints[axis] > max) return false;
            }
        }
        return true;
    },
    
    /**
     * Singularity detection for 5-axis machines
     */
    detectSingularity: function(joints, config = {}) {
        const threshold = config.singularityThreshold || 1.0; // degrees
        const A = Math.abs(joints.A);
        
        const isSingular = A < threshold || Math.abs(A - 180) < threshold;
        
        return {
            isSingular,
            type: isSingular ? 'gimbal_lock' : 'none',
            aAngle: joints.A,
            recommendation: isSingular ? 
                'Modify toolpath to avoid vertical tool orientation' : 
                'No singularity issues'
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VELOCITY KINEMATICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute TCP velocity from joint velocities
     * @param {Array} jacobian - 6×n Jacobian matrix
     * @param {Array} jointVelocities - n×1 joint velocity vector
     * @returns {Object} TCP linear and angular velocities
     */
    tcpVelocity: function(jacobian, jointVelocities) {
        const v = jacobian.map(row => 
            row.reduce((sum, j, i) => sum + j * jointVelocities[i], 0)
        );
        
        return {
            linear: { vx: v[0], vy: v[1], vz: v[2] },
            angular: { wx: v[3], wy: v[4], wz: v[5] },
            magnitude: {
                linear: Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2),
                angular: Math.sqrt(v[3]**2 + v[4]**2 + v[5]**2)
            }
        };
    },
    
    /**
     * Compute required joint velocities for desired TCP velocity
     * @param {Array} jacobian - Jacobian matrix
     * @param {Object} tcpVel - Desired TCP velocity
     * @returns {Array} Joint velocities
     */
    inverseVelocity: function(jacobian, tcpVel) {
        const v = [
            tcpVel.linear?.vx || 0, tcpVel.linear?.vy || 0, tcpVel.linear?.vz || 0,
            tcpVel.angular?.wx || 0, tcpVel.angular?.wy || 0, tcpVel.angular?.wz || 0
        ];
        
        // Damped least squares (DLS) for numerical stability
        const lambda = 0.01; // Damping factor
        const Jt = this.transpose(jacobian);
        const JJt = this.matMul(jacobian, Jt);
        
        // Add damping: (J*J^T + λ²I)
        for (let i = 0; i < JJt.length; i++) {
            JJt[i][i] += lambda * lambda;
        }
        
        // Solve: q_dot = J^T * (J*J^T + λ²I)^-1 * v
        const JJtInv = this.pseudoInverse(JJt);
        if (!JJtInv) return null;
        
        const temp = this.matMul(JJtInv, v.map(x => [x])).map(r => r[0]);
        const qDot = this.matMul(Jt, temp.map(x => [x])).map(r => r[0]);
        
        return qDot;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('kinematics.transform.rotX', 'PRISM_ADVANCED_KINEMATICS_ENGINE.rotX');
            PRISM_GATEWAY.register('kinematics.transform.rotY', 'PRISM_ADVANCED_KINEMATICS_ENGINE.rotY');
            PRISM_GATEWAY.register('kinematics.transform.rotZ', 'PRISM_ADVANCED_KINEMATICS_ENGINE.rotZ');
            PRISM_GATEWAY.register('kinematics.transform.translate', 'PRISM_ADVANCED_KINEMATICS_ENGINE.translate');
            PRISM_GATEWAY.register('kinematics.transform.chain', 'PRISM_ADVANCED_KINEMATICS_ENGINE.chainTransforms');
            PRISM_GATEWAY.register('kinematics.transform.invert', 'PRISM_ADVANCED_KINEMATICS_ENGINE.invertTransform');
            PRISM_GATEWAY.register('kinematics.dh.transform', 'PRISM_ADVANCED_KINEMATICS_ENGINE.dhTransform');
            PRISM_GATEWAY.register('kinematics.fk.dh', 'PRISM_ADVANCED_KINEMATICS_ENGINE.forwardKinematicsDH');
            PRISM_GATEWAY.register('kinematics.jacobian.compute', 'PRISM_ADVANCED_KINEMATICS_ENGINE.computeJacobian');
            PRISM_GATEWAY.register('kinematics.5axis.ik', 'PRISM_ADVANCED_KINEMATICS_ENGINE.fiveAxisIK');
            PRISM_GATEWAY.register('kinematics.5axis.singularity', 'PRISM_ADVANCED_KINEMATICS_ENGINE.detectSingularity');
            PRISM_GATEWAY.register('kinematics.velocity.tcp', 'PRISM_ADVANCED_KINEMATICS_ENGINE.tcpVelocity');
            PRISM_GATEWAY.register('kinematics.velocity.inverse', 'PRISM_ADVANCED_KINEMATICS_ENGINE.inverseVelocity');
            console.log('[PRISM] PRISM_ADVANCED_KINEMATICS_ENGINE registered: 13 routes');
        }
    }
}