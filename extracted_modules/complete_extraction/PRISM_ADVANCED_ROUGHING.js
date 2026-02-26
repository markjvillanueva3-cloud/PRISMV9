const PRISM_ADVANCED_ROUGHING = {

    VERSION: "3.0.0",

    // CHIP THINNING COMPENSATION TABLE
    // Based on radial engagement as percentage of tool diameter
    CHIP_THINNING: {
        // ae/D ratio : feed multiplier
        0.05: 2.50,   // 5% stepover = 2.5x feed
        0.10: 1.80,   // 10% stepover
        0.15: 1.55,   // 15% stepover
        0.20: 1.40,   // 20% stepover
        0.25: 1.30,   // 25% stepover
        0.30: 1.22,   // 30% stepover
        0.35: 1.16,   // 35% stepover
        0.40: 1.12,   // 40% stepover
        0.45: 1.08,   // 45% stepover
        0.50: 1.05,   // 50% stepover (conventional)
        0.60: 1.00,   // 60%+ no adjustment
        0.70: 0.95,   // Reduce for higher engagement
        0.80: 0.90,
        0.90: 0.85,
        1.00: 0.80    // Full slotting = reduce 20%
    },
    // CORNER DECELERATION FACTORS
    // Based on direction change angle
    CORNER_FACTORS: {
        // Angle (degrees) : max feed percentage
        180: 1.00,  // Straight - no reduction
        170: 0.98,
        160: 0.95,
        150: 0.90,
        140: 0.82,
        135: 0.78,  // 45° direction change
        130: 0.72,
        120: 0.65,
        110: 0.55,
        100: 0.45,
        90: 0.35,   // 90° corner - 35% of max feed
        80: 0.28,
        70: 0.22,
        60: 0.16,
        45: 0.10,   // Sharp corner - 10% max
        30: 0.06,
        0: 0.00     // Full reversal - must stop
    },
    // MATERIAL-SPECIFIC PARAMETERS
    MATERIAL_PARAMS: {
        // ISO P - Steels
        steel_mild: { kc: 1800, speedFactor: 1.0, feedFactor: 1.0, rampAngle: 3, helixAngle: 2 },
        steel_medium: { kc: 2200, speedFactor: 0.85, feedFactor: 0.9, rampAngle: 2.5, helixAngle: 1.5 },
        steel_hard: { kc: 2800, speedFactor: 0.65, feedFactor: 0.75, rampAngle: 2, helixAngle: 1 },
        steel_tool: { kc: 3200, speedFactor: 0.50, feedFactor: 0.65, rampAngle: 1.5, helixAngle: 0.75 },

        // ISO M - Stainless
        stainless_304: { kc: 2400, speedFactor: 0.55, feedFactor: 0.85, rampAngle: 2, helixAngle: 1.5 },
        stainless_316: { kc: 2600, speedFactor: 0.50, feedFactor: 0.80, rampAngle: 1.5, helixAngle: 1 },
        stainless_17_4: { kc: 2800, speedFactor: 0.45, feedFactor: 0.75, rampAngle: 1.5, helixAngle: 1 },

        // ISO K - Cast Iron
        cast_gray: { kc: 1100, speedFactor: 1.2, feedFactor: 1.1, rampAngle: 5, helixAngle: 3 },
        cast_ductile: { kc: 1500, speedFactor: 1.0, feedFactor: 1.0, rampAngle: 4, helixAngle: 2.5 },

        // ISO N - Non-ferrous
        aluminum_6061: { kc: 700, speedFactor: 3.0, feedFactor: 1.5, rampAngle: 5, helixAngle: 3 },
        aluminum_7075: { kc: 800, speedFactor: 2.5, feedFactor: 1.4, rampAngle: 4, helixAngle: 2.5 },
        aluminum_cast: { kc: 900, speedFactor: 2.0, feedFactor: 1.2, rampAngle: 4, helixAngle: 2 },
        copper: { kc: 1100, speedFactor: 1.5, feedFactor: 1.0, rampAngle: 3, helixAngle: 2 },
        brass: { kc: 780, speedFactor: 2.0, feedFactor: 1.2, rampAngle: 4, helixAngle: 2.5 },

        // ISO S - Superalloys
        titanium_6al4v: { kc: 1400, speedFactor: 0.25, feedFactor: 0.6, rampAngle: 1, helixAngle: 0.5 },
        inconel_718: { kc: 2800, speedFactor: 0.15, feedFactor: 0.5, rampAngle: 0.75, helixAngle: 0.4 },
        hastelloy: { kc: 3000, speedFactor: 0.12, feedFactor: 0.45, rampAngle: 0.5, helixAngle: 0.3 },

        // ISO H - Hardened
        hardened_45hrc: { kc: 4000, speedFactor: 0.35, feedFactor: 0.5, rampAngle: 1, helixAngle: 0.5 },
        hardened_55hrc: { kc: 5500, speedFactor: 0.25, feedFactor: 0.4, rampAngle: 0.75, helixAngle: 0.4 },
        hardened_62hrc: { kc: 7000, speedFactor: 0.15, feedFactor: 0.3, rampAngle: 0.5, helixAngle: 0.25 }
    },
    // G-FORCE LIMITS BY MACHINE CLASS
    GFORCE_LIMITS: {
        economy: { accel: 0.3, jerk: 20, cornerG: 0.2 },
        tier2: { accel: 0.5, jerk: 35, cornerG: 0.35 },
        performance: { accel: 0.8, jerk: 50, cornerG: 0.5 },
        highSpeed: { accel: 1.2, jerk: 80, cornerG: 0.7 },
        ultraHighSpeed: { accel: 2.0, jerk: 150, cornerG: 1.0 }
    },
    // FUNCTIONS

    /**
     * Calculate chip thinning adjusted feed rate
     */
    calculateChipThinningFeed: function(baseFeed, radialEngagement, toolDiameter) {
        const aeRatio = radialEngagement / toolDiameter;

        // Find closest ratio in table
        const ratios = Object.keys(this.CHIP_THINNING).map(Number).sort((a, b) => a - b);
        let multiplier = 1.0;

        for (let i = 0; i < ratios.length; i++) {
            if (aeRatio <= ratios[i]) {
                if (i === 0) {
                    multiplier = this.CHIP_THINNING[ratios[0]];
                } else {
                    // Interpolate
                    const lower = ratios[i - 1];
                    const upper = ratios[i];
                    const t = (aeRatio - lower) / (upper - lower);
                    multiplier = this.CHIP_THINNING[lower] * (1 - t) + this.CHIP_THINNING[upper] * t;
                }
                break;
            }
        }
        return Math.round(baseFeed * multiplier);
    },
    /**
     * Calculate corner-limited feed rate
     */
    calculateCornerFeed: function(baseFeed, cornerAngle, machineClass = 'standard') {
        const gLimits = this.GFORCE_LIMITS[machineClass] || this.GFORCE_LIMITS.standard;

        // Get corner factor
        const angles = Object.keys(this.CORNER_FACTORS).map(Number).sort((a, b) => b - a);
        let factor = 1.0;

        for (const angle of angles) {
            if (cornerAngle <= angle) {
                factor = this.CORNER_FACTORS[angle];
            }
        }
        // Adjust for machine capability
        factor *= (gLimits.cornerG / 0.35); // Normalize to standard
        factor = Math.min(factor, 1.0);

        return Math.round(baseFeed * factor);
    },
    /**
     * Calculate optimal roughing parameters
     */
    calculateRoughingParams: function(options) {
        const {
            toolDiameter,
            material = 'steel_mild',
            radialEngagement,
            axialDepth,
            baseFeed,
            baseSpeed,
            machineClass = 'standard'
        } = options;

        const matParams = this.MATERIAL_PARAMS[material] || this.MATERIAL_PARAMS.steel_mild;
        const gLimits = this.GFORCE_LIMITS[machineClass] || this.GFORCE_LIMITS.standard;

        // Chip thinning adjustment
        const chipThinFeed = this.calculateChipThinningFeed(baseFeed, radialEngagement, toolDiameter);

        // Material speed adjustment
        const adjustedSpeed = Math.round(baseSpeed * matParams.speedFactor);

        // Calculate MRR (Material Removal Rate)
        const mrr = radialEngagement * axialDepth * chipThinFeed;

        // Calculate cutting force
        const chipArea = (baseFeed / adjustedSpeed * toolDiameter) * axialDepth;
        const cuttingForce = matParams.kc * chipArea;

        return {
            adjustedFeed: chipThinFeed,
            adjustedSpeed: adjustedSpeed,
            mrr: mrr,
            cuttingForce: Math.round(cuttingForce),
            rampAngle: matParams.rampAngle,
            helixAngle: matParams.helixAngle,
            chipThinMultiplier: chipThinFeed / baseFeed,
            recommendations: {
                lookAhead: machineClass === 'highSpeed' ? 200 : (machineClass === 'tier2' ? 100 : 50),
                smoothingMode: machineClass === 'highSpeed' ? 'finish' : 'rough'
            }
        };
    }
}