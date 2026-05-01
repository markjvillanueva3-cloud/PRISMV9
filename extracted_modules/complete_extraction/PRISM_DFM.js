const PRISM_DFM = {
    
    /**
     * Tolerance stackup analysis
     * @param {Array} tolerances - Array of {name, nominal, tolerance, distribution}
     * @param {string} method - 'worst_case', 'rss', 'monte_carlo'
     * @returns {Object} Stackup analysis
     */
    toleranceStackup: function(tolerances, method = 'rss') {
        const nominalStack = tolerances.reduce((sum, t) => sum + t.nominal, 0);
        const toleranceValues = tolerances.map(t => t.tolerance);
        
        let totalTolerance;
        switch (method) {
            case 'worst_case':
                totalTolerance = toleranceValues.reduce((sum, t) => sum + Math.abs(t), 0);
                break;
            case 'rss':
                totalTolerance = Math.sqrt(toleranceValues.reduce((sum, t) => sum + t * t, 0));
                break;
            case 'monte_carlo':
                // Simulate 10000 assemblies
                const simulations = 10000;
                const results = [];
                for (let i = 0; i < simulations; i++) {
                    const assembly = tolerances.reduce((sum, t) => {
                        const variation = (Math.random() - 0.5) * 2 * t.tolerance;
                        return sum + t.nominal + variation;
                    }, 0);
                    results.push(assembly);
                }
                const mean = results.reduce((a, b) => a + b, 0) / simulations;
                const variance = results.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / simulations;
                totalTolerance = 3 * Math.sqrt(variance); // 3-sigma
                break;
        }
        
        return {
            method,
            nominalDimension: nominalStack,
            totalTolerance: totalTolerance,
            minDimension: nominalStack - totalTolerance,
            maxDimension: nominalStack + totalTolerance,
            contributors: tolerances.map(t => ({
                name: t.name,
                nominal: t.nominal,
                tolerance: t.tolerance,
                percentContribution: (method === 'rss' ? 
                    (t.tolerance * t.tolerance / (totalTolerance * totalTolerance) * 100).toFixed(1) :
                    (Math.abs(t.tolerance) / toleranceValues.reduce((s, v) => s + Math.abs(v), 0) * 100).toFixed(1)
                )
            }))
        };
    },
    
    /**
     * Bolt joint preload calculation
     * @param {Object} params - Joint parameters
     * @returns {Object} Preload analysis
     */
    boltPreload: function(params) {
        const {
            torque_Nm = 25,
            diameter_mm = 10,
            nutFactor = 0.2,        // K factor
            yieldStrength_MPa = 640, // Bolt yield strength
            threadPitch_mm = 1.5,
            clamping_mm = 20
        } = params;
        
        const d = diameter_mm;
        const T = torque_Nm * 1000; // N·mm
        const K = nutFactor;
        
        // Preload force: F = T / (K × d)
        const preload_N = T / (K * d);
        
        // Bolt stress area (approximate)
        const d2 = d - 0.6495 * threadPitch_mm;
        const stressArea_mm2 = Math.PI / 4 * Math.pow((d2 + (d - threadPitch_mm)) / 2, 2);
        
        // Bolt stress
        const boltStress_MPa = preload_N / stressArea_mm2;
        const safetyFactor = yieldStrength_MPa / boltStress_MPa;
        
        // Bolt stiffness (approximate)
        const E_steel = 207000; // MPa
        const boltLength = clamping_mm + 0.5 * d;
        const K_bolt = E_steel * stressArea_mm2 / boltLength; // N/mm
        
        // Clamped material stiffness (rule of thumb: 3x bolt stiffness)
        const K_clamp = 3 * K_bolt;
        
        // Load factor
        const loadFactor = K_bolt / (K_bolt + K_clamp);
        
        return {
            torque_Nm,
            preload_N: Math.round(preload_N),
            boltStress_MPa: Math.round(boltStress_MPa),
            safetyFactor: safetyFactor.toFixed(2),
            stressArea_mm2: stressArea_mm2.toFixed(1),
            boltStiffness_N_mm: Math.round(K_bolt),
            clampStiffness_N_mm: Math.round(K_clamp),
            loadFactor: loadFactor.toFixed(3),
            recommendation: safetyFactor < 1.5 ? 
                'Warning: Low safety factor - reduce torque or use larger bolt' :
                safetyFactor > 3 ? 'Consider increasing torque for better clamping' :
                'Good preload for typical applications'
        };
    },
    
    /**
     * Fatigue analysis using Modified Goodman
     * @param {Object} params - Loading and material parameters
     * @returns {Object} Fatigue analysis
     */
    fatigueGoodman: function(params) {
        const {
            alternatingStress_MPa = 100,
            meanStress_MPa = 50,
            ultimateStrength_MPa = 500,
            enduranceLimit_MPa = 250,
            surfaceFactor = 0.9,
            sizeFactor = 0.85,
            loadFactor = 1.0,
            tempFactor = 1.0,
            reliabilityFactor = 0.897 // 90% reliability
        } = params;
        
        const Sa = alternatingStress_MPa;
        const Sm = meanStress_MPa;
        const Sut = ultimateStrength_MPa;
        const Se_prime = enduranceLimit_MPa;
        
        // Modified endurance limit
        const Se = surfaceFactor * sizeFactor * loadFactor * tempFactor * reliabilityFactor * Se_prime;
        
        // Modified Goodman: Sa/Se + Sm/Sut = 1/n
        const n = 1 / (Sa/Se + Sm/Sut);
        
        // Soderberg (more conservative): Sa/Se + Sm/Sy = 1/n
        const Sy = 0.9 * Sut; // Approximate yield
        const n_soderberg = 1 / (Sa/Se + Sm/Sy);
        
        // Gerber (less conservative): Sa/Se + (Sm/Sut)² = 1/n
        const n_gerber = 1 / (Sa/Se + Math.pow(Sm/Sut, 2));
        
        return {
            modifiedEnduranceLimit_MPa: Se.toFixed(1),
            safetyFactors: {
                goodman: n.toFixed(2),
                soderberg: n_soderberg.toFixed(2),
                gerber: n_gerber.toFixed(2)
            },
            recommendation: n < 1 ? 'FAILURE PREDICTED - redesign required' :
                           n < 1.5 ? 'Marginal design - consider increasing strength' :
                           n < 2.5 ? 'Acceptable for general applications' :
                           'Conservative design - could optimize',
            infiniteLife: n >= 1,
            modificationFactors: {
                surface: surfaceFactor,
                size: sizeFactor,
                load: loadFactor,
                temperature: tempFactor,
                reliability: reliabilityFactor
            }
        };
    }
}