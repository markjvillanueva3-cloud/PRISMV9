/**
 * PRISM_INVERSE_KINEMATICS_SOLVER
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 350
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_INVERSE_KINEMATICS_SOLVER = {
    version: '1.0.0',
    name: 'Iterative Inverse Kinematics Solver',

    // Newton-Raphson iterative IK solver
    solveIK: function(targetPose, initialGuess, config, options = {}) {
        const maxIterations = options.maxIterations || 50;
        const positionTolerance = options.positionTolerance || 0.001; // mm
        const orientationTolerance = options.orientationTolerance || 0.01; // degrees
        const dampingFactor = options.dampingFactor || 0.1;

        let currentAngles = { ...initialGuess };
        const dhConfig = PRISM_DH_KINEMATICS.machineConfigs[config];

        if (!dhConfig) {
            return { success: false, error: 'Unknown machine configuration' };
        }
        let iterations = 0;
        let converged = false;
        const history = [];

        while (iterations < maxIterations && !converged) {
            // Get current end-effector pose
            const jointArray = this._anglesToArray(currentAngles, dhConfig);
            const T = PRISM_DH_KINEMATICS.forwardKinematicsDH(dhConfig.dhParams, jointArray);
            const currentPose = PRISM_DH_KINEMATICS.extractPose(T);

            // Compute pose error
            const error = this._computePoseError(targetPose, currentPose);
            history.push({ iteration: iterations, error: error.magnitude, angles: { ...currentAngles } });

            // Check convergence
            if (error.positionError < positionTolerance && error.orientationError < orientationTolerance) {
                converged = true;
                break;
            }
            // Compute Jacobian
            const J = PRISM_JACOBIAN_ENGINE.computeJacobian(dhConfig.dhParams, jointArray);

            // Check for singularity
            const singCheck = PRISM_JACOBIAN_ENGINE.detectSingularity(J);
            if (singCheck.nearSingularity) {
                // Use damped least squares (Levenberg-Marquardt)
                const deltaAngles = this._dampedLeastSquares(J, error.errorVector, dampingFactor);
                currentAngles = this._applyDelta(currentAngles, deltaAngles, dhConfig);
            } else {
                // Standard Newton-Raphson
                const Jinv = this._pseudoInverse(J);
                const deltaAngles = this._multiplyMatrixVector(Jinv, error.errorVector);
                currentAngles = this._applyDelta(currentAngles, deltaAngles, dhConfig);
            }
            // Apply joint limits
            currentAngles = this._applyJointLimits(currentAngles, dhConfig);

            iterations++;
        }
        // Final check
        const jointArray = this._anglesToArray(currentAngles, dhConfig);
        const Tfinal = PRISM_DH_KINEMATICS.forwardKinematicsDH(dhConfig.dhParams, jointArray);
        const finalPose = PRISM_DH_KINEMATICS.extractPose(Tfinal);
        const finalError = this._computePoseError(targetPose, finalPose);

        return {
            success: converged,
            solution: currentAngles,
            iterations: iterations,
            finalError: finalError,
            history: history,
            reachable: finalError.positionError < positionTolerance * 10,
            singularityWarning: PRISM_JACOBIAN_ENGINE.checkConfigSingularities(config, currentAngles)
        };
    },
    // Closed-form IK for 5-axis machines (faster than iterative)
    solveIKClosedForm: function(targetPosition, targetToolVector, config, toolLength = 0) {
        const { x, y, z } = targetPosition;
        const { i, j, k } = targetToolVector;

        let solution = { x, y, z, a: 0, b: 0, c: 0 };
        let valid = true;
        let warnings = [];

        // Normalize tool vector
        const mag = Math.sqrt(i*i + j*j + k*k);
        const ni = i / mag, nj = j / mag, nk = k / mag;

        if (config === 'TABLE_TABLE_AC' || config.includes('AC')) {
            // AC configuration closed-form solution
            // C = atan2(i, j) - angle in XY plane
            // A = atan2(-sqrt(i² + j²), k) - tilt from Z

            const xyMag = Math.sqrt(ni*ni + nj*nj);

            if (xyMag < 0.001) {
                // Tool pointing straight down or up - C is undefined (singularity)
                solution.c = 0; // Choose arbitrary C
                solution.a = nk > 0 ? 0 : 180;
                warnings.push('Near singularity: C-axis arbitrary');
            } else {
                solution.c = Math.atan2(ni, nj) * 180 / Math.PI;
                solution.a = Math.atan2(-xyMag, nk) * 180 / Math.PI;
            }
            // TCP compensation if tool length specified
            if (toolLength > 0) {
                const aRad = solution.a * Math.PI / 180;
                const cRad = solution.c * Math.PI / 180;

                // Adjust XYZ to keep tool tip at target
                solution.x = x + toolLength * ni;
                solution.y = y + toolLength * nj;
                solution.z = z + toolLength * (1 - nk);
            }
        } else if (config === 'HEAD_HEAD_BC' || config.includes('BC')) {
            // BC configuration closed-form solution
            // C = atan2(i, j) - rotation in XY plane
            // B = atan2(sqrt(i² + j²), k) - tilt from vertical

            const xyMag = Math.sqrt(ni*ni + nj*nj);

            if (xyMag < 0.001) {
                // Singularity
                solution.c = 0;
                solution.b = nk > 0 ? 0 : 180;
                warnings.push('Near singularity: C-axis arbitrary');
            } else {
                solution.c = Math.atan2(ni, nj) * 180 / Math.PI;
                solution.b = Math.atan2(xyMag, nk) * 180 / Math.PI;
            }
            // TCP compensation
            if (toolLength > 0) {
                const bRad = solution.b * Math.PI / 180;
                const cRad = solution.c * Math.PI / 180;

                solution.x = x - toolLength * Math.sin(bRad) * Math.sin(cRad);
                solution.y = y - toolLength * Math.sin(bRad) * Math.cos(cRad);
                solution.z = z + toolLength * (1 - Math.cos(bRad));
            }
        }
        return {
            success: valid,
            solution: solution,
            warnings: warnings,
            method: 'closed-form'
        };
    },
    // Helper methods
    _anglesToArray: function(angles, config) {
        return [angles.x || 0, angles.y || 0, angles.z || 0,
                angles.a || angles.b || 0, angles.c || 0];
    },
    _computePoseError: function(target, current) {
        const posErr = {
            x: target.position.x - current.position.x,
            y: target.position.y - current.position.y,
            z: target.position.z - current.position.z
        };
        const oriErr = {
            roll: (target.orientation?.roll || 0) - (current.orientation?.roll || 0),
            pitch: (target.orientation?.pitch || 0) - (current.orientation?.pitch || 0),
            yaw: (target.orientation?.yaw || 0) - (current.orientation?.yaw || 0)
        };
        const positionError = Math.sqrt(posErr.x*posErr.x + posErr.y*posErr.y + posErr.z*posErr.z);
        const orientationError = Math.sqrt(oriErr.roll*oriErr.roll + oriErr.pitch*oriErr.pitch + oriErr.yaw*oriErr.yaw);

        return {
            positionError,
            orientationError,
            magnitude: positionError + orientationError * 0.01,
            errorVector: [posErr.x, posErr.y, posErr.z,
                         oriErr.roll * Math.PI/180, oriErr.pitch * Math.PI/180, oriErr.yaw * Math.PI/180]
        };
    },
    _dampedLeastSquares: function(J, error, lambda) {
        // (J^T * J + λ²I)^(-1) * J^T * e
        const m = J.length, n = J[0].length;
        const JtJ = [];
        const Jte = new Array(n).fill(0);

        // Compute J^T * J + λ²I
        for (let i = 0; i < n; i++) {
            JtJ.push(new Array(n).fill(0));
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < m; k++) {
                    JtJ[i][j] += J[k][i] * J[k][j];
                }
                if (i === j) JtJ[i][j] += lambda * lambda;
            }
            // Compute J^T * e
            for (let k = 0; k < m; k++) {
                Jte[i] += J[k][i] * error[k];
            }
        }
        // Solve using Gauss-Jordan
        return this._solveLinearSystem(JtJ, Jte);
    },
    _pseudoInverse: function(J) {
        // Moore-Penrose pseudo-inverse: J^+ = (J^T * J)^(-1) * J^T
        const m = J.length, n = J[0].length;
        const JtJ = [];
        const Jt = [];

        // Compute J^T
        for (let i = 0; i < n; i++) {
            Jt.push(new Array(m).fill(0));
            for (let j = 0; j < m; j++) {
                Jt[i][j] = J[j][i];
            }
        }
        // Compute J^T * J
        for (let i = 0; i < n; i++) {
            JtJ.push(new Array(n).fill(0));
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < m; k++) {
                    JtJ[i][j] += Jt[i][k] * J[k][j];
                }
            }
        }
        // Invert J^T * J
        const JtJinv = this._invertMatrix(JtJ);

        // Compute (J^T * J)^(-1) * J^T
        const Jinv = [];
        for (let i = 0; i < n; i++) {
            Jinv.push(new Array(m).fill(0));
            for (let j = 0; j < m; j++) {
                for (let k = 0; k < n; k++) {
                    Jinv[i][j] += JtJinv[i][k] * Jt[k][j];
                }
            }
        }
        return Jinv;
    },
    _invertMatrix: function(matrix) {
        const n = matrix.length;
        const aug = matrix.map((row, i) => {
            const newRow = [...row];
            for (let j = 0; j < n; j++) {
                newRow.push(i === j ? 1 : 0);
            }
            return newRow;
        });

        // Gauss-Jordan elimination
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
                    maxRow = k;
                }
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

            // Scale pivot row
            const pivot = aug[i][i];
            if (Math.abs(pivot) < 1e-12) continue;

            for (let j = 0; j < 2 * n; j++) {
                aug[i][j] /= pivot;
            }
            // Eliminate column
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = aug[k][i];
                    for (let j = 0; j < 2 * n; j++) {
                        aug[k][j] -= factor * aug[i][j];
                    }
                }
            }
        }
        // Extract inverse
        return aug.map(row => row.slice(n));
    },
    _solveLinearSystem: function(A, b) {
        const n = A.length;
        const aug = A.map((row, i) => [...row, b[i]]);

        // Forward elimination
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
                    maxRow = k;
                }
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

            const pivot = aug[i][i];
            if (Math.abs(pivot) < 1e-12) continue;

            for (let j = i; j <= n; j++) {
                aug[i][j] /= pivot;
            }
            for (let k = i + 1; k < n; k++) {
                const factor = aug[k][i];
                for (let j = i; j <= n; j++) {
                    aug[k][j] -= factor * aug[i][j];
                }
            }
        }
        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= aug[i][j] * x[j];
            }
        }
        return x;
    },
    _multiplyMatrixVector: function(M, v) {
        return M.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
    },
    _applyDelta: function(angles, delta, config) {
        const result = { ...angles };
        const axes = ['x', 'y', 'z'];

        // Determine rotary axes from config
        if (config.name?.includes('AC')) {
            axes.push('a', 'c');
        } else if (config.name?.includes('BC')) {
            axes.push('b', 'c');
        } else {
            axes.push('a', 'c'); // default
        }
        axes.forEach((axis, i) => {
            if (delta[i] !== undefined) {
                result[axis] = (result[axis] || 0) + delta[i];
            }
        });

        return result;
    },
    _applyJointLimits: function(angles, config) {
        const limited = { ...angles };

        // Apply rotary limits from config
        config.dhParams.forEach(param => {
            if (param.jointType === 'revolute') {
                const axis = param.axis.toLowerCase();
                const limits = param.limits || [-180, 180];

                if (limited[axis] !== undefined) {
                    limited[axis] = Math.max(limits[0], Math.min(limits[1], limited[axis]));
                }
            }
        });

        return limited;
    }
}