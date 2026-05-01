const PRISM_MECHANISM_ANALYSIS = {
    /**
     * Calculate degrees of freedom using Gruebler's equation
     * @param {number} n - Number of links (including ground)
     * @param {number} j1 - Number of full joints (1 DOF: pins, sliders)
     * @param {number} j2 - Number of half joints (2 DOF: cam, gear contact)
     * @returns {number} Degrees of freedom
     */
    grueblerDOF: function(n, j1, j2 = 0) {
        return 3 * (n - 1) - 2 * j1 - j2;
    },

    /**
     * Check Grashof criterion for four-bar linkage
     * @param {Array} links - Array of 4 link lengths [L1, L2, L3, L4]
     * @returns {Object} Grashof analysis
     */
    grashofCriterion: function(links) {
        const sorted = [...links].sort((a, b) => a - b);
        const s = sorted[0]; // Shortest
        const l = sorted[3]; // Longest
        const p = sorted[1];
        const q = sorted[2];
        
        const grashofSum = s + l;
        const otherSum = p + q;
        
        let classification;
        if (grashofSum < otherSum) {
            classification = 'Class I Grashof (at least one crank)';
        } else if (grashofSum === otherSum) {
            classification = 'Special Grashof (change point mechanism)';
        } else {
            classification = 'Non-Grashof (no full rotation possible)';
        }
        
        return {
            isGrashof: grashofSum <= otherSum,
            shortest: s,
            longest: l,
            grashofSum: grashofSum,
            otherSum: otherSum,
            classification: classification,
            canHaveCrank: grashofSum <= otherSum
        };
    },

    /**
     * Four-bar linkage position analysis
     * @param {Object} params - {L1: ground, L2: crank, L3: coupler, L4: rocker}
     * @param {number} theta2 - Crank angle in radians
     * @returns {Object} Position solution
     */
    fourBarPosition: function(params, theta2) {
        const { L1, L2, L3, L4 } = params;
        
        // Using vector loop equation and Freudenstein's equation
        const K1 = L1 / L2;
        const K2 = L1 / L4;
        const K3 = (L2 * L2 - L3 * L3 + L4 * L4 + L1 * L1) / (2 * L2 * L4);
        
        const A = Math.cos(theta2) - K1 - K2 * Math.cos(theta2) + K3;
        const B = -2 * Math.sin(theta2);
        const C = K1 - (K2 + 1) * Math.cos(theta2) + K3;
        
        const discriminant = B * B - 4 * A * C;
        
        if (discriminant < 0) {
            return { valid: false, reason: 'No valid position - linkage cannot reach' };
        }
        
        // Two solutions (open and crossed configurations)
        const t1 = (-B + Math.sqrt(discriminant)) / (2 * A);
        const t2 = (-B - Math.sqrt(discriminant)) / (2 * A);
        
        const theta4_open = 2 * Math.atan(t1);
        const theta4_crossed = 2 * Math.atan(t2);
        
        // Calculate theta3 for open configuration
        const theta3 = Math.atan2(
            L4 * Math.sin(theta4_open) - L2 * Math.sin(theta2),
            L1 + L4 * Math.cos(theta4_open) - L2 * Math.cos(theta2)
        );
        
        return {
            valid: true,
            theta2: theta2,
            theta3: theta3,
            theta4_open: theta4_open,
            theta4_crossed: theta4_crossed,
            theta2Deg: theta2 * 180 / Math.PI,
            theta3Deg: theta3 * 180 / Math.PI,
            theta4Deg: theta4_open * 180 / Math.PI
        };
    },

    /**
     * Four-bar linkage velocity analysis
     * @param {Object} params - Link lengths
     * @param {number} theta2 - Crank angle (rad)
     * @param {number} theta3 - Coupler angle (rad)
     * @param {number} theta4 - Rocker angle (rad)
     * @param {number} omega2 - Crank angular velocity (rad/s)
     * @returns {Object} Angular velocities
     */
    fourBarVelocity: function(params, theta2, theta3, theta4, omega2) {
        const { L2, L3, L4 } = params;
        
        // Velocity equations from loop closure differentiation
        const denom = L3 * L4 * Math.sin(theta4 - theta3);
        
        const omega3 = (L2 * L4 * omega2 * Math.sin(theta4 - theta2)) / denom;
        const omega4 = (L2 * L3 * omega2 * Math.sin(theta2 - theta3)) / denom;
        
        return {
            omega2: omega2,
            omega3: omega3,
            omega4: omega4,
            velocityRatio34: omega4 / omega3,
            velocityRatio42: omega4 / omega2
        };
    }
};