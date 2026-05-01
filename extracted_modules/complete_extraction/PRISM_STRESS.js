const PRISM_STRESS = {
    
    /**
     * Calculate principal stresses (2D)
     * @param {Object} stress - Stress state {sigmaX, sigmaY, tauXY}
     * @returns {Object} Principal stresses and angles
     */
    principalStress: function(stress) {
        const { sigmaX, sigmaY, tauXY } = stress;
        
        const sigmaAvg = (sigmaX + sigmaY) / 2;
        const R = Math.sqrt(Math.pow((sigmaX - sigmaY) / 2, 2) + tauXY * tauXY);
        
        const sigma1 = sigmaAvg + R;
        const sigma2 = sigmaAvg - R;
        
        // Principal angle (to sigma1)
        const theta_p = 0.5 * Math.atan2(2 * tauXY, sigmaX - sigmaY);
        
        // Maximum shear stress
        const tauMax = R;
        const theta_s = theta_p + Math.PI / 4;  // Shear plane angle
        
        return {
            sigma1,
            sigma2,
            principalAngle: theta_p * 180 / Math.PI,
            tauMax,
            shearAngle: theta_s * 180 / Math.PI,
            sigmaAvg,
            radius: R
        };
    },
    
    /**
     * Generate Mohr's circle data
     * @param {Object} stress - Stress state
     * @returns {Object} Mohr's circle parameters
     */
    mohrsCircle: function(stress) {
        const { sigmaX, sigmaY, tauXY } = stress;
        
        const center = (sigmaX + sigmaY) / 2;
        const radius = Math.sqrt(Math.pow((sigmaX - sigmaY) / 2, 2) + tauXY * tauXY);
        
        // Points on circle
        const pointX = { sigma: sigmaX, tau: tauXY };
        const pointY = { sigma: sigmaY, tau: -tauXY };
        
        // Generate circle points for plotting
        const circlePoints = [];
        for (let angle = 0; angle <= 2 * Math.PI; angle += 0.1) {
            circlePoints.push({
                sigma: center + radius * Math.cos(angle),
                tau: radius * Math.sin(angle)
            });
        }
        
        return {
            center,
            radius,
            pointX,
            pointY,
            sigma1: center + radius,
            sigma2: center - radius,
            tauMax: radius,
            circlePoints
        };
    },
    
    /**
     * Calculate Von Mises stress
     * @param {Object} stress - Stress state (2D or 3D)
     * @returns {Object} Von Mises stress and yield check
     */
    vonMises: function(stress, sigmaYield = null) {
        const { sigmaX = 0, sigmaY = 0, sigmaZ = 0, tauXY = 0, tauYZ = 0, tauXZ = 0 } = stress;
        
        // Von Mises stress formula
        const term1 = Math.pow(sigmaX - sigmaY, 2);
        const term2 = Math.pow(sigmaY - sigmaZ, 2);
        const term3 = Math.pow(sigmaZ - sigmaX, 2);
        const term4 = 6 * (tauXY * tauXY + tauYZ * tauYZ + tauXZ * tauXZ);
        
        const sigmaVM = Math.sqrt((term1 + term2 + term3 + term4) / 2);
        
        const result = {
            vonMisesStress: sigmaVM,
            formula: 'σ_vm = √[(σx-σy)² + (σy-σz)² + (σz-σx)² + 6(τxy² + τyz² + τxz²)] / √2'
        };
        
        if (sigmaYield !== null) {
            result.safetyFactor = sigmaYield / sigmaVM;
            result.yielding = sigmaVM >= sigmaYield;
        }
        
        return result;
    },
    
    /**
     * Tresca (maximum shear stress) criterion
     * @param {Object} principal - Principal stresses {sigma1, sigma2, sigma3}
     * @param {number} sigmaYield - Yield stress
     * @returns {Object} Tresca analysis
     */
    tresca: function(principal, sigmaYield = null) {
        const { sigma1 = 0, sigma2 = 0, sigma3 = 0 } = principal;
        
        // Sort principal stresses
        const sorted = [sigma1, sigma2, sigma3].sort((a, b) => b - a);
        const sigmaMax = sorted[0];
        const sigmaMin = sorted[2];
        
        const tauMax = (sigmaMax - sigmaMin) / 2;
        
        const result = {
            maxShearStress: tauMax,
            sigmaMax,
            sigmaMin
        };
        
        if (sigmaYield !== null) {
            const tauYield = sigmaYield / 2;
            result.safetyFactor = tauYield / tauMax;
            result.yielding = tauMax >= tauYield;
        }
        
        return result;
    }
}