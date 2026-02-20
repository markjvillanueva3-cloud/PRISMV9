const PRISM_MONTE_CARLO = {

    /**
     * Simulate cycle time with uncertainty
     */
    simulateCycleTime: function(params, uncertainties, numSamples = 5000) {
        const {
            baseCycleTime,      // Base cycle time (minutes)
            operations = []     // List of operations
        } = params;

        const samples = [];

        for (let i = 0; i < numSamples; i++) {
            let time = baseCycleTime;

            // Apply uncertainties
            for (const [param, unc] of Object.entries(uncertainties)) {
                // Box-Muller for normal distribution
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

                time *= (1 + z * unc.stdDev * unc.sensitivity);
            }
            // Add random delays
            if (Math.random() < 0.05) time += 2;  // 5% chance of 2-min delay
            if (Math.random() < 0.02) time += 10; // 2% chance of 10-min delay

            samples.push(Math.max(0, time));
        }
        // Statistics
        samples.sort((a, b) => a - b);
        const mean = samples.reduce((a, b) => a + b, 0) / numSamples;
        const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / numSamples;

        return {
            mean,
            stdDev: Math.sqrt(variance),
            median: samples[Math.floor(numSamples / 2)],
            percentile10: samples[Math.floor(0.10 * numSamples)],
            percentile90: samples[Math.floor(0.90 * numSamples)],
            percentile95: samples[Math.floor(0.95 * numSamples)],
            percentile99: samples[Math.floor(0.99 * numSamples)],
            min: samples[0],
            max: samples[numSamples - 1],
            samples: samples.length
        };
    },
    /**
     * Simulate tool life distribution
     */
    simulateToolLife: function(params, numSamples = 5000) {
        const {
            baseToolLife,   // Expected tool life (minutes)
            material,
            speed,
            feed
        } = params;

        const samples = [];

        // Tool life typically follows Weibull distribution
        const shape = 3;  // Shape parameter (beta)
        const scale = baseToolLife * 1.13; // Scale parameter (eta)

        for (let i = 0; i < numSamples; i++) {
            // Weibull sampling using inverse CDF
            const u = Math.random();
            const T = scale * Math.pow(-Math.log(1 - u), 1 / shape);

            // Apply process variations
            const speedVariation = 1 + (Math.random() - 0.5) * 0.1;
            const feedVariation = 1 + (Math.random() - 0.5) * 0.1;

            const adjustedT = T * Math.pow(speedVariation, -1/0.25) * Math.pow(feedVariation, -0.3);

            samples.push(Math.max(0.5, adjustedT));
        }
        samples.sort((a, b) => a - b);
        const mean = samples.reduce((a, b) => a + b, 0) / numSamples;

        return {
            mean,
            median: samples[Math.floor(numSamples / 2)],
            percentile10: samples[Math.floor(0.10 * numSamples)],
            percentile90: samples[Math.floor(0.90 * numSamples)],
            recommendedChangeInterval: samples[Math.floor(0.10 * numSamples)], // Conservative
            distribution: 'Weibull',
            params: { shape, scale }
        };
    },
    /**
     * Risk analysis for parameter selection
     */
    riskAnalysis: function(params, iterations = 1000) {
        const { speed, feed, doc, material, constraints } = params;

        let failures = 0;
        let toolBreakages = 0;
        let chatterEvents = 0;
        let qualityIssues = 0;

        for (let i = 0; i < iterations; i++) {
            // Random variations
            const actualSpeed = speed * (1 + (Math.random() - 0.5) * 0.2);
            const actualFeed = feed * (1 + (Math.random() - 0.5) * 0.2);
            const actualDoc = doc * (1 + (Math.random() - 0.5) * 0.2);

            // Check constraints
            if (constraints.maxSpeed && actualSpeed > constraints.maxSpeed) failures++;
            if (constraints.maxForce) {
                const force = actualFeed * actualDoc * (material.Kc1 || 1500);
                if (force > constraints.maxForce) failures++;
                if (force > constraints.maxForce * 1.5) toolBreakages++;
            }
            // Chatter check (simplified)
            const LD = (constraints.toolStickout || 50) / (constraints.toolDiameter || 10);
            if (LD > 4 && actualDoc > 0.5 * (constraints.toolDiameter || 10)) {
                if (Math.random() < 0.3) chatterEvents++;
            }
            // Surface finish check
            const Ra = (actualFeed * actualFeed) / (32 * (constraints.noseRadius || 0.4)) * 1000;
            if (constraints.maxRa && Ra > constraints.maxRa) {
                qualityIssues++;
            }
        }
        return {
            totalIterations: iterations,
            failureRate: failures / iterations,
            toolBreakageRisk: toolBreakages / iterations,
            chatterRisk: chatterEvents / iterations,
            qualityRisk: qualityIssues / iterations,
            overallRisk: (failures + toolBreakages * 2 + chatterEvents + qualityIssues) / (iterations * 5),
            recommendation: this._getRiskRecommendation(failures / iterations, toolBreakages / iterations)
        };
    },
    _getRiskRecommendation: function(failureRate, breakageRate) {
        if (breakageRate > 0.05) {
            return 'HIGH RISK: Reduce parameters by 20-30%';
        } else if (failureRate > 0.2) {
            return 'MODERATE RISK: Consider reducing parameters by 10-15%';
        } else if (failureRate > 0.1) {
            return 'LOW RISK: Parameters acceptable with monitoring';
        } else {
            return 'SAFE: Parameters within acceptable range';
        }
    }
}