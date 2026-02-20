const PRISM_GEAR_DESIGN = {
    /**
     * Calculate gear geometry parameters
     * @param {number} N - Number of teeth
     * @param {number} P - Diametral pitch (teeth/inch) or module (mm) if metric
     * @param {number} pressureAngle - Pressure angle in degrees (typically 14.5 or 20)
     * @param {boolean} isMetric - Use module instead of diametral pitch
     * @returns {Object} Gear geometry
     */
    calculateGeometry: function(N, P, pressureAngle = 20, isMetric = false) {
        const phi = pressureAngle * Math.PI / 180;
        
        let d, m, circularPitch;
        if (isMetric) {
            m = P; // P is module in mm
            d = m * N; // Pitch diameter in mm
            circularPitch = Math.PI * m;
        } else {
            d = N / P; // Pitch diameter in inches
            m = 25.4 / P; // Module in mm
            circularPitch = Math.PI / P;
        }
        
        const addendum = isMetric ? m : 1 / P;
        const dedendum = isMetric ? 1.25 * m : 1.25 / P;
        const clearance = isMetric ? 0.25 * m : 0.25 / P;
        const wholeDepth = addendum + dedendum;
        const workingDepth = 2 * addendum;
        
        const outsideDiameter = d + 2 * addendum;
        const rootDiameter = d - 2 * dedendum;
        const baseDiameter = d * Math.cos(phi);
        
        // Tooth thickness at pitch circle
        const toothThickness = circularPitch / 2;
        
        return {
            pitchDiameter: d,
            module: m,
            diametralPitch: isMetric ? 25.4 / m : P,
            circularPitch: circularPitch,
            addendum: addendum,
            dedendum: dedendum,
            clearance: clearance,
            wholeDepth: wholeDepth,
            workingDepth: workingDepth,
            outsideDiameter: outsideDiameter,
            rootDiameter: rootDiameter,
            baseDiameter: baseDiameter,
            toothThickness: toothThickness,
            pressureAngle: pressureAngle,
            numberOfTeeth: N
        };
    },

    /**
     * Generate involute curve points
     * @param {number} baseRadius - Base circle radius
     * @param {number} numPoints - Number of points to generate
     * @param {number} maxAngle - Maximum roll angle in radians
     * @returns {Array} Array of {x, y} points
     */
    generateInvoluteCurve: function(baseRadius, numPoints = 50, maxAngle = Math.PI / 2) {
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const theta = (i / (numPoints - 1)) * maxAngle;
            const x = baseRadius * (Math.cos(theta) + theta * Math.sin(theta));
            const y = baseRadius * (Math.sin(theta) - theta * Math.cos(theta));
            points.push({ x, y, theta });
        }
        return points;
    },

    /**
     * Calculate gear ratio for a gear train
     * @param {Array} gears - Array of {driver: N, driven: N} pairs
     * @returns {Object} Gear train analysis
     */
    calculateGearTrain: function(gears) {
        let totalRatio = 1;
        const stages = [];
        
        for (const pair of gears) {
            const stageRatio = pair.driven / pair.driver;
            totalRatio *= stageRatio;
            stages.push({
                driverTeeth: pair.driver,
                drivenTeeth: pair.driven,
                stageRatio: stageRatio,
                speedReduction: stageRatio > 1,
                torqueMultiplier: stageRatio
            });
        }
        
        return {
            totalRatio: totalRatio,
            stages: stages,
            outputSpeedFactor: 1 / totalRatio,
            outputTorqueFactor: totalRatio
        };
    },

    /**
     * Lewis bending stress calculation
     * @param {number} Wt - Transmitted tangential load (force)
     * @param {number} P - Diametral pitch
     * @param {number} F - Face width
     * @param {number} Y - Lewis form factor
     * @returns {number} Bending stress
     */
    lewisBendingStress: function(Wt, P, F, Y) {
        return (Wt * P) / (F * Y);
    },

    /**
     * Get Lewis form factor for standard 20° pressure angle gears
     * @param {number} N - Number of teeth
     * @returns {number} Lewis form factor Y
     */
    getLewisFormFactor: function(N) {
        // Approximate Lewis form factor for 20° pressure angle full-depth teeth
        // Based on AGMA standards
        const factorTable = {
            12: 0.245, 13: 0.261, 14: 0.277, 15: 0.290,
            16: 0.296, 17: 0.303, 18: 0.309, 19: 0.314,
            20: 0.322, 21: 0.328, 22: 0.331, 24: 0.337,
            26: 0.346, 28: 0.353, 30: 0.359, 34: 0.371,
            38: 0.384, 43: 0.397, 50: 0.409, 60: 0.422,
            75: 0.435, 100: 0.447, 150: 0.460, 300: 0.472
        };
        
        // Find closest value
        const keys = Object.keys(factorTable).map(Number).sort((a, b) => a - b);
        for (let i = 0; i < keys.length; i++) {
            if (N <= keys[i]) {
                if (i === 0) return factorTable[keys[0]];
                // Interpolate
                const lower = keys[i - 1];
                const upper = keys[i];
                const t = (N - lower) / (upper - lower);
                return factorTable[lower] + t * (factorTable[upper] - factorTable[lower]);
            }
        }
        return factorTable[300]; // Max value for rack
    },

    /**
     * Check minimum teeth to avoid interference
     * @param {number} pressureAngle - Pressure angle in degrees
     * @param {number} addendumCoeff - Addendum coefficient (typically 1)
     * @returns {number} Minimum number of teeth
     */
    minimumTeethNoInterference: function(pressureAngle = 20, addendumCoeff = 1) {
        const phi = pressureAngle * Math.PI / 180;
        return Math.ceil(2 * addendumCoeff / (Math.sin(phi) * Math.sin(phi)));
    }
}