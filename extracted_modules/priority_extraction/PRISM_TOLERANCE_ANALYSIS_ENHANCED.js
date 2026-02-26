const PRISM_TOLERANCE_ANALYSIS_ENHANCED = {
    version: "2.0",

    // Statistical analysis methods
    statisticalAnalysis: {
        // Calculate process capability
        cpk: function(mean, stdDev, usl, lsl) {
            const cpu = (usl - mean) / (3 * stdDev);
            const cpl = (mean - lsl) / (3 * stdDev);
            return Math.min(cpu, cpl);
        },
        // Calculate Cp
        cp: function(stdDev, usl, lsl) {
            return (usl - lsl) / (6 * stdDev);
        },
        // Estimate defects per million
        dpmo: function(cpk) {
            // Approximate DPMO from Cpk
            const z = cpk * 3;
            return Math.round(1000000 * (1 - this.normalCDF(z)));
        },
        normalCDF: function(z) {
            const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
            const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
            const sign = z < 0 ? -1 : 1;
            z = Math.abs(z) / Math.sqrt(2);
            const t = 1 / (1 + p * z);
            const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
            return 0.5 * (1 + sign * y);
        }
    },
    // Worst case analysis
    worstCaseAnalysis: {
        calculate: function(dimensions) {
            let nominal = 0;
            let minStack = 0;
            let maxStack = 0;

            for (const dim of dimensions) {
                const dir = dim.direction === 'subtract' ? -1 : 1;
                nominal += dim.nominal * dir;
                minStack += (dim.nominal - Math.abs(dim.minusTol)) * dir;
                maxStack += (dim.nominal + Math.abs(dim.plusTol)) * dir;
            }
            return {
                method: 'Worst Case',
                nominal,
                min: Math.min(minStack, maxStack),
                max: Math.max(minStack, maxStack),
                totalTolerance: Math.abs(maxStack - minStack),
                probability: 1.0 // 100% of parts within limits
            };
        }
    },
    // RSS (Root Sum Square) analysis
    rssAnalysis: {
        calculate: function(dimensions) {
            let nominal = 0;
            let sumOfSquares = 0;

            for (const dim of dimensions) {
                const dir = dim.direction === 'subtract' ? -1 : 1;
                nominal += dim.nominal * dir;
                const tol = (Math.abs(dim.plusTol) + Math.abs(dim.minusTol)) / 2;
                sumOfSquares += tol * tol;
            }
            const rssTol = Math.sqrt(sumOfSquares);

            return {
                method: 'RSS (3σ)',
                nominal,
                min: nominal - rssTol,
                max: nominal + rssTol,
                totalTolerance: rssTol * 2,
                probability: 0.9973 // 99.73% within limits
            };
        }
    },
    // Monte Carlo simulation
    monteCarloSimulation: {
        simulate: function(dimensions, iterations = 10000) {
            const results = [];

            for (let i = 0; i < iterations; i++) {
                let stackup = 0;

                for (const dim of dimensions) {
                    const dir = dim.direction === 'subtract' ? -1 : 1;
                    const tol = (Math.abs(dim.plusTol) + Math.abs(dim.minusTol)) / 2;
                    // Normal distribution: Box-Muller transform
                    const u1 = Math.random(), u2 = Math.random();
                    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                    const value = dim.nominal + z * (tol / 3);
                    stackup += value * dir;
                }
                results.push(stackup);
            }
            results.sort((a, b) => a - b);

            const mean = results.reduce((a, b) => a + b, 0) / iterations;
            const variance = results.reduce((a, b) => a + (b - mean) ** 2, 0) / iterations;
            const stdDev = Math.sqrt(variance);

            return {
                method: 'Monte Carlo',
                iterations,
                mean,
                stdDev,
                min: results[0],
                max: results[iterations - 1],
                percentile_0_135: results[Math.floor(iterations * 0.00135)],
                percentile_50: results[Math.floor(iterations * 0.5)],
                percentile_99_865: results[Math.floor(iterations * 0.99865)]
            };
        }
    },
    // Combined analysis report
    fullAnalysis: function(dimensions, targetMin, targetMax) {
        const wc = this.worstCaseAnalysis.calculate(dimensions);
        const rss = this.rssAnalysis.calculate(dimensions);
        const mc = this.monteCarloSimulation.simulate(dimensions, 10000);

        return {
            dimensions: dimensions.length,
            target: { min: targetMin, max: targetMax, range: targetMax - targetMin },
            worstCase: {
                ...wc,
                meetsSpec: wc.min >= targetMin && wc.max <= targetMax
            },
            rss: {
                ...rss,
                meetsSpec: rss.min >= targetMin && rss.max <= targetMax
            },
            monteCarlo: {
                ...mc,
                estimatedYield: this.calculateYield(mc, targetMin, targetMax)
            },
            recommendation: this.getRecommendation(wc, rss, targetMin, targetMax)
        };
    },
    calculateYield: function(mc, targetMin, targetMax) {
        // Estimate percentage within spec from Monte Carlo
        const inSpec = mc.percentile_99_865 <= targetMax && mc.percentile_0_135 >= targetMin;
        if (inSpec) return 99.73;
        return 95; // Simplified
    },
    getRecommendation: function(wc, rss, targetMin, targetMax) {
        if (wc.min >= targetMin && wc.max <= targetMax) {
            return "Design is robust - meets worst-case analysis";
        }
        if (rss.min >= targetMin && rss.max <= targetMax) {
            return "Design relies on statistical tolerance - acceptable for high volume";
        }
        return "Design may need tighter component tolerances";
    }
}