const PRISM_JACOBIAN_ENGINE = {
    version: '1.0.0',
    name: 'Jacobian & Singularity Analysis Engine',

    // Compute geometric Jacobian matrix numerically
    // J maps joint velocities to end-effector velocities: ẋ = J * q̇
    computeJacobian: function(dhParams, jointAngles, delta = 0.0001) {
        const n = jointAngles.length;
        const J = [];

        // Initialize 6 rows (3 linear + 3 angular velocities)
        for (let i = 0; i < 6; i++) {
            J.push(new Array(n).fill(0));
        }
        // Get nominal forward kinematics
        const T0 = PRISM_DH_KINEMATICS.forwardKinematicsDH(dhParams, jointAngles);
        const pose0 = PRISM_DH_KINEMATICS.extractPose(T0);

        // Numerical differentiation for each joint
        for (let i = 0; i < n; i++) {
            // Perturb joint i
            const perturbedAngles = [...jointAngles];
            perturbedAngles[i] += delta;

            const Ti = PRISM_DH_KINEMATICS.forwardKinematicsDH(dhParams, perturbedAngles);
            const posei = PRISM_DH_KINEMATICS.extractPose(Ti);

            // Linear velocity columns (position change / delta)
            J[0][i] = (posei.position.x - pose0.position.x) / delta;
            J[1][i] = (posei.position.y - pose0.position.y) / delta;
            J[2][i] = (posei.position.z - pose0.position.z) / delta;

            // Angular velocity columns (orientation change / delta)
            J[3][i] = (posei.orientation.roll - pose0.orientation.roll) / delta * Math.PI / 180;
            J[4][i] = (posei.orientation.pitch - pose0.orientation.pitch) / delta * Math.PI / 180;
            J[5][i] = (posei.orientation.yaw - pose0.orientation.yaw) / delta * Math.PI / 180;
        }
        return J;
    },
    // Compute analytical Jacobian for 5-axis machines
    computeAnalyticalJacobian5Axis: function(config, jointValues, toolLength) {
        const { x, y, z, a = 0, b = 0, c = 0 } = jointValues;
        const aRad = a * Math.PI / 180;
        const bRad = b * Math.PI / 180;
        const cRad = c * Math.PI / 180;
        const L = toolLength || 0;

        // 6x5 Jacobian for 5-axis (3 linear + 2 rotary axes)
        const J = [];
        for (let i = 0; i < 6; i++) {
            J.push(new Array(5).fill(0));
        }
        // Linear axes contribute directly to position
        J[0][0] = 1; // dx/dX
        J[1][1] = 1; // dy/dY
        J[2][2] = 1; // dz/dZ

        // Rotary axis contributions depend on configuration
        if (config === 'BC' || config === 'HEAD_HEAD_BC') {
            // B rotation (around Y axis)
            const cb = Math.cos(bRad), sb = Math.sin(bRad);
            const cc = Math.cos(cRad), sc = Math.sin(cRad);

            // Tool tip offset due to B rotation
            J[0][3] = L * cb * cc;  // dx/dB
            J[1][3] = L * cb * sc;  // dy/dB
            J[2][3] = -L * sb;      // dz/dB

            // Tool tip offset due to C rotation
            J[0][4] = -L * sb * sc; // dx/dC
            J[1][4] = L * sb * cc;  // dy/dC
            J[2][4] = 0;            // dz/dC

            // Angular velocity contributions
            J[3][3] = 0;   // B contributes to pitch
            J[4][3] = 1;   // B is rotation around Y
            J[5][3] = 0;

            J[3][4] = sb;  // C contributes to roll when tilted
            J[4][4] = 0;
            J[5][4] = cb;  // C is rotation around Z when B=0
        } else if (config === 'AC' || config === 'TABLE_TABLE_AC') {
            // A rotation (around X axis)
            const ca = Math.cos(aRad), sa = Math.sin(aRad);
            const cc = Math.cos(cRad), sc = Math.sin(cRad);

            J[0][3] = 0;              // dx/dA
            J[1][3] = -L * ca * sc;   // dy/dA
            J[2][3] = -L * sa;        // dz/dA

            J[0][4] = -L * sa * sc;   // dx/dC
            J[1][4] = L * sa * cc;    // dy/dC
            J[2][4] = 0;              // dz/dC

            // Angular contributions
            J[3][3] = 1;   // A is rotation around X
            J[4][3] = 0;
            J[5][3] = 0;

            J[3][4] = 0;
            J[4][4] = sa;  // C contributes to pitch when tilted
            J[5][4] = ca;  // C is rotation around Z when A=0
        }
        return J;
    },
    // Detect singularities using Jacobian condition number
    detectSingularity: function(jacobian, threshold = 0.01) {
        // Compute singular values using power iteration on J^T * J
        const JtJ = this._multiplyJtJ(jacobian);
        const eigenvalues = this._powerIterationEigenvalues(JtJ, 100);

        const maxEig = Math.max(...eigenvalues);
        const minEig = Math.min(...eigenvalues.filter(e => e > 1e-10));

        // Condition number
        const conditionNumber = minEig > 1e-10 ? maxEig / minEig : Infinity;

        // Manipulability measure (sqrt of det(J*J^T))
        const manipulability = Math.sqrt(eigenvalues.reduce((a, b) => a * b, 1));

        return {
            nearSingularity: minEig < threshold || conditionNumber > 1000,
            conditionNumber: conditionNumber,
            manipulability: manipulability,
            minSingularValue: Math.sqrt(minEig),
            maxSingularValue: Math.sqrt(maxEig),
            eigenvalues: eigenvalues.map(e => Math.sqrt(e))
        };
    },
    // Check for kinematic singularities based on machine configuration
    checkConfigSingularities: function(config, angles) {
        const { a = 0, b = 0, c = 0 } = angles;
        const singularities = [];
        const warnings = [];

        // BC Configuration singularities
        if (config.includes('BC')) {
            // Singularity when B = 0 (C becomes undefined)
            if (Math.abs(b) < 1) {
                singularities.push({
                    type: 'gimbal_lock',
                    axis: 'B',
                    value: b,
                    severity: Math.abs(b) < 0.1 ? 'critical' : 'warning',
                    message: 'B-axis near zero causes C-axis singularity'
                });
            }
        }
        // AC Configuration singularities
        if (config.includes('AC')) {
            // Singularity when A = 0 (C becomes undefined)
            if (Math.abs(a) < 1) {
                singularities.push({
                    type: 'gimbal_lock',
                    axis: 'A',
                    value: a,
                    severity: Math.abs(a) < 0.1 ? 'critical' : 'warning',
                    message: 'A-axis near zero causes C-axis singularity'
                });
            }
            // Also check A = 90 for some configurations
            if (Math.abs(Math.abs(a) - 90) < 1) {
                singularities.push({
                    type: 'workspace_boundary',
                    axis: 'A',
                    value: a,
                    severity: 'warning',
                    message: 'A-axis near 90° limits workspace'
                });
            }
        }
        return {
            hasSingularity: singularities.some(s => s.severity === 'critical'),
            singularities,
            warnings
        };
    },
    // Helper: Multiply J^T * J
    _multiplyJtJ: function(J) {
        const m = J.length;
        const n = J[0].length;
        const result = [];

        for (let i = 0; i < n; i++) {
            result.push(new Array(n).fill(0));
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < m; k++) {
                    result[i][j] += J[k][i] * J[k][j];
                }
            }
        }
        return result;
    },
    // Helper: Power iteration for eigenvalues
    _powerIterationEigenvalues: function(matrix, maxIter) {
        const n = matrix.length;
        const eigenvalues = [];
        const A = matrix.map(row => [...row]);

        for (let eigIdx = 0; eigIdx < n; eigIdx++) {
            let v = new Array(n).fill(1);
            let eigenvalue = 0;

            for (let iter = 0; iter < maxIter; iter++) {
                // Multiply A * v
                const Av = new Array(n).fill(0);
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        Av[i] += A[i][j] * v[j];
                    }
                }
                // Normalize
                const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
                if (norm < 1e-12) break;

                v = Av.map(x => x / norm);
                eigenvalue = norm;
            }
            eigenvalues.push(eigenvalue);

            // Deflate matrix for next eigenvalue
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    A[i][j] -= eigenvalue * v[i] * v[j];
                }
            }
        }
        return eigenvalues;
    }
}