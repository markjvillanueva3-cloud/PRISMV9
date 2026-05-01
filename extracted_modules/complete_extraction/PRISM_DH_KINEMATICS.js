const PRISM_DH_KINEMATICS = {
    version: '1.0.0',
    name: 'Denavit-Hartenberg Kinematics Engine',
    source: 'Stanford CS 223A, MIT 2.003J',

    // Standard DH transformation matrix for a single link
    // T_i = Rot_z(θ) * Trans_z(d) * Trans_x(a) * Rot_x(α)
    dhTransformMatrix: function(theta, d, a, alpha) {
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        const ca = Math.cos(alpha);
        const sa = Math.sin(alpha);

        return [
            [ct, -st * ca,  st * sa, a * ct],
            [st,  ct * ca, -ct * sa, a * st],
            [0,   sa,       ca,      d     ],
            [0,   0,        0,       1     ]
        ];
    },
    // Forward kinematics using DH parameter chain
    // Returns: 4x4 transformation matrix from base to end-effector
    forwardKinematicsDH: function(dhParams, jointAngles) {
        // Start with identity matrix
        let T = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];

        for (let i = 0; i < dhParams.length; i++) {
            const param = dhParams[i];

            // Get joint value (either theta for revolute or d for prismatic)
            let theta = param.theta || 0;
            let d = param.d || 0;

            if (param.jointType === 'revolute') {
                theta = (jointAngles[i] || 0) * Math.PI / 180; // Convert to radians
            } else if (param.jointType === 'prismatic') {
                d = jointAngles[i] || param.d || 0;
            }
            const Ti = this.dhTransformMatrix(theta, d, param.a || 0, param.alpha || 0);
            T = this.multiplyMatrices4x4(T, Ti);
        }
        return T;
    },
    // Extract position and orientation from transformation matrix
    extractPose: function(T) {
        // Position is the last column
        const position = {
            x: T[0][3],
            y: T[1][3],
            z: T[2][3]
        };
        // Tool axis (Z direction of end-effector)
        const toolAxis = {
            x: T[0][2],
            y: T[1][2],
            z: T[2][2]
        };
        // Extract Euler angles (ZYX convention)
        let roll, pitch, yaw;

        // Check for gimbal lock
        if (Math.abs(T[2][0]) >= 0.99999) {
            // Gimbal lock
            yaw = 0;
            if (T[2][0] < 0) {
                pitch = Math.PI / 2;
                roll = Math.atan2(T[0][1], T[0][2]);
            } else {
                pitch = -Math.PI / 2;
                roll = Math.atan2(-T[0][1], -T[0][2]);
            }
        } else {
            pitch = Math.asin(-T[2][0]);
            roll = Math.atan2(T[2][1] / Math.cos(pitch), T[2][2] / Math.cos(pitch));
            yaw = Math.atan2(T[1][0] / Math.cos(pitch), T[0][0] / Math.cos(pitch));
        }
        return {
            position,
            toolAxis,
            orientation: {
                roll: roll * 180 / Math.PI,
                pitch: pitch * 180 / Math.PI,
                yaw: yaw * 180 / Math.PI
            },
            rotationMatrix: [
                [T[0][0], T[0][1], T[0][2]],
                [T[1][0], T[1][1], T[1][2]],
                [T[2][0], T[2][1], T[2][2]]
            ]
        };
    },
    // 4x4 matrix multiplication
    multiplyMatrices4x4: function(A, B) {
        const C = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    },
    // Predefined DH parameters for common 5-axis machine configurations
    machineConfigs: {
        // Table-Table AC Trunnion (DMG MORI DMU style)
        TABLE_TABLE_AC: {
            name: 'Table-Table AC Trunnion',
            // DH params: [theta, d, a, alpha, jointType]
            // For 5-axis: X, Y, Z (linear) + A (tilt) + C (rotate)
            dhParams: [
                { theta: 0, d: 0, a: 0, alpha: 0, jointType: 'prismatic', axis: 'X' },
                { theta: -Math.PI/2, d: 0, a: 0, alpha: -Math.PI/2, jointType: 'prismatic', axis: 'Y' },
                { theta: 0, d: 0, a: 0, alpha: 0, jointType: 'prismatic', axis: 'Z' },
                { theta: 0, d: 0, a: 0, alpha: Math.PI/2, jointType: 'revolute', axis: 'A' },
                { theta: 0, d: 0, a: 0, alpha: 0, jointType: 'revolute', axis: 'C' }
            ],
            singularities: [{ axis: 'A', angles: [0] }],
            rtcpSupport: true
        },
        // Head-Head BC (Hermle C42 style)
        HEAD_HEAD_BC: {
            name: 'Head-Head BC Fork/Swivel',
            dhParams: [
                { theta: 0, d: 0, a: 0, alpha: 0, jointType: 'prismatic', axis: 'X' },
                { theta: -Math.PI/2, d: 0, a: 0, alpha: -Math.PI/2, jointType: 'prismatic', axis: 'Y' },
                { theta: 0, d: 0, a: 0, alpha: 0, jointType: 'prismatic', axis: 'Z' },
                { theta: 0, d: 0, a: 0, alpha: -Math.PI/2, jointType: 'revolute', axis: 'B' },
                { theta: 0, d: 0, a: 0, alpha: 0, jointType: 'revolute', axis: 'C' }
            ],
            singularities: [{ axis: 'B', angles: [0] }],
            rtcpSupport: true
        },
        // Table-Head AC (Mixed configuration)
        TABLE_HEAD_AC: {
            name: 'Table-Head AC Mixed',
            dhParams: [
                { theta: 0, d: 0, a: 0, alpha: 0, jointType: 'prismatic', axis: 'X' },
                { theta: -Math.PI/2, d: 0, a: 0, alpha: -Math.PI/2, jointType: 'prismatic', axis: 'Y' },
                { theta: 0, d: 0, a: 0, alpha: 0, jointType: 'prismatic', axis: 'Z' },
                { theta: 0, d: 0, a: 0, alpha: Math.PI/2, jointType: 'revolute', axis: 'A', location: 'head' },
                { theta: 0, d: 0, a: 0, alpha: 0, jointType: 'revolute', axis: 'C', location: 'table' }
            ],
            singularities: [{ axis: 'A', angles: [0, 90] }],
            rtcpSupport: true
        }
    }
}