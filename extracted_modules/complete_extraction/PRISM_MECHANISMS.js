const PRISM_MECHANISMS = {
    
    /**
     * Gear train analysis
     * @param {Array} gears - Array of {teeth, type} objects
     * @returns {Object} Gear train analysis
     */
    gearTrain: function(gears) {
        if (gears.length < 2) {
            return { error: 'Need at least 2 gears' };
        }
        
        let totalRatio = 1;
        const stages = [];
        
        for (let i = 0; i < gears.length - 1; i += 2) {
            const driver = gears[i];
            const driven = gears[i + 1];
            const stageRatio = driven.teeth / driver.teeth;
            
            stages.push({
                stage: stages.length + 1,
                driver: driver.teeth,
                driven: driven.teeth,
                ratio: stageRatio
            });
            
            totalRatio *= stageRatio;
        }
        
        return {
            totalRatio,
            stages,
            speedReduction: totalRatio > 1,
            torqueMultiplication: totalRatio,
            outputDirection: gears.length % 2 === 0 ? 'same' : 'reversed'
        };
    },
    
    /**
     * Four-bar linkage analysis
     * @param {Object} links - Link lengths {a, b, c, d} where a=input crank
     * @returns {Object} Linkage classification and limits
     */
    fourBarLinkage: function(links) {
        const { a, b, c, d } = links;  // a=crank, b=coupler, c=rocker, d=ground
        const lengths = [a, b, c, d].sort((x, y) => x - y);
        const s = lengths[0];  // Shortest
        const l = lengths[3];  // Longest
        const p = lengths[1];
        const q = lengths[2];
        
        const grashof = s + l <= p + q;
        
        let type, description;
        if (grashof) {
            if (s === a) {
                type = 'crank-rocker';
                description = 'Input link rotates fully, output oscillates';
            } else if (s === d) {
                type = 'double-crank';
                description = 'Both input and output rotate fully';
            } else if (s === b) {
                type = 'double-rocker';
                description = 'Both links oscillate (coupler shortest)';
            } else {
                type = 'rocker-crank';
                description = 'Input oscillates, output rotates';
            }
        } else {
            type = 'triple-rocker';
            description = 'No link can rotate fully';
        }
        
        // Transmission angle limits (for crank-rocker)
        let muMin = null, muMax = null;
        if (type === 'crank-rocker') {
            // When crank aligned with ground
            const theta1 = 0;  // Crank along ground
            const theta2 = Math.PI;
            
            // Calculate transmission angles at extremes
            // This is simplified - full analysis needs iterative solution
            muMin = Math.acos((b*b + c*c - (a+d)*(a+d)) / (2*b*c));
            muMax = Math.acos((b*b + c*c - (d-a)*(d-a)) / (2*b*c));
        }
        
        return {
            grashofCondition: grashof,
            type,
            description,
            shortestLink: s,
            longestLink: l,
            transmissionAngleMin: muMin ? muMin * 180 / Math.PI : null,
            transmissionAngleMax: muMax ? muMax * 180 / Math.PI : null
        };
    },
    
    /**
     * Screw mechanism analysis
     * @param {Object} params - Screw parameters
     * @returns {Object} Screw mechanism properties
     */
    screwMechanism: function(params) {
        const {
            pitch,           // Thread pitch [mm]
            starts = 1,      // Number of starts
            diameter,        // Mean diameter [mm]
            frictionCoeff = 0.15  // Friction coefficient
        } = params;
        
        const lead = starts * pitch;
        const radius = diameter / 2;
        const circumference = 2 * Math.PI * radius;
        
        // Lead angle
        const leadAngle = Math.atan(lead / circumference);
        const leadAngleDeg = leadAngle * 180 / Math.PI;
        
        // Friction angle
        const frictionAngle = Math.atan(frictionCoeff);
        const frictionAngleDeg = frictionAngle * 180 / Math.PI;
        
        // Mechanical advantage
        const MA = circumference / lead;
        
        // Efficiency (square thread)
        const efficiency = Math.tan(leadAngle) / Math.tan(leadAngle + frictionAngle);
        
        // Self-locking check
        const selfLocking = leadAngle < frictionAngle;
        
        return {
            lead,
            leadAngleDeg,
            frictionAngleDeg,
            mechanicalAdvantage: MA,
            efficiency: efficiency * 100,  // Percentage
            selfLocking,
            backdrivable: !selfLocking,
            torqueToForce: (torque) => torque * 2 * Math.PI * efficiency / lead,
            forceToTorque: (force) => force * lead / (2 * Math.PI * efficiency)
        };
    }
}