const PRISM_TOLERANCE_STACKUP_ENGINE = {
    version: "1.0",

    // Worst-case analysis (arithmetic)
    worstCase: {
        description: "Sum of all individual tolerances - 100% parts will be within limits",

        calculate: function(dimensions) {
            let nominalTotal = 0;
            let toleranceTotal = 0;

            for (const dim of dimensions) {
                nominalTotal += dim.nominal * (dim.direction === 'subtract' ? -1 : 1);
                toleranceTotal += Math.abs(dim.plusTol) + Math.abs(dim.minusTol);
            }
            return {
                method: "Worst Case",
                nominal: nominalTotal,
                totalTolerance: toleranceTotal / 2,
                max: nominalTotal + toleranceTotal / 2,
                min: nominalTotal - toleranceTotal / 2,
                cpk: null,
                probability: 1.0
            };
        }
    },
    // RSS (Root Sum Square) analysis
    rss: {
        description: "Statistical combination - approximately 99.73% within limits (3σ)",

        calculate: function(dimensions) {
            let nominalTotal = 0;
            let sumOfSquares = 0;

            for (const dim of dimensions) {
                nominalTotal += dim.nominal * (dim.direction === 'subtract' ? -1 : 1);
                const tolerance = (Math.abs(dim.plusTol) + Math.abs(dim.minusTol)) / 2;
                sumOfSquares += tolerance * tolerance;
            }
            const rssTolerance = Math.sqrt(sumOfSquares);

            return {
                method: "RSS (Root Sum Square)",
                nominal: nominalTotal,
                totalTolerance: rssTolerance,
                max: nominalTotal + rssTolerance,
                min: nominalTotal - rssTolerance,
                sigma: 3,
                probability: 0.9973
            };
        }
    },
    // Monte Carlo simulation
    monteCarlo: {
        description: "Statistical simulation with specified number of iterations",

        simulate: function(dimensions, iterations = 10000) {
            const results = [];

            for (let i = 0; i < iterations; i++) {
                let total = 0;

                for (const dim of dimensions) {
                    // Generate random value within tolerance (normal distribution)
                    const tolerance = (Math.abs(dim.plusTol) + Math.abs(dim.minusTol)) / 2;
                    const randomValue = this.normalRandom(dim.nominal, tolerance / 3);
                    total += randomValue * (dim.direction === 'subtract' ? -1 : 1);
                }
                results.push(total);
            }
            // Calculate statistics
            const mean = results.reduce((a, b) => a + b, 0) / results.length;
            const variance = results.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / results.length;
            const stdDev = Math.sqrt(variance);

            results.sort((a, b) => a - b);

            return {
                method: "Monte Carlo",
                iterations,
                mean,
                stdDev,
                min: results[0],
                max: results[results.length - 1],
                percentile_0_135: results[Math.floor(iterations * 0.00135)],
                percentile_99_865: results[Math.floor(iterations * 0.99865)],
                median: results[Math.floor(iterations / 2)]
            };
        },
        // Box-Muller transform for normal distribution
        normalRandom: function(mean, stdDev) {
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return z0 * stdDev + mean;
        }
    },
    // Create tolerance loop
    createToleranceLoop: function(dimensions) {
        return {
            dimensions: dimensions,

            analyze: function(method = 'all') {
                const results = {};

                if (method === 'all' || method === 'worstCase') {
                    results.worstCase = PRISM_TOLERANCE_STACKUP_ENGINE.worstCase.calculate(this.dimensions);
                }
                if (method === 'all' || method === 'rss') {
                    results.rss = PRISM_TOLERANCE_STACKUP_ENGINE.rss.calculate(this.dimensions);
                }
                if (method === 'all' || method === 'monteCarlo') {
                    results.monteCarlo = PRISM_TOLERANCE_STACKUP_ENGINE.monteCarlo.simulate(this.dimensions);
                }
                return results;
            },
            addDimension: function(dim) {
                this.dimensions.push(dim);
                return this;
            }
        };
    },
    // Quick stack-up example
    example: function() {
        const dims = [
            { name: "Part A", nominal: 25.0, plusTol: 0.1, minusTol: -0.1, direction: 'add' },
            { name: "Part B", nominal: 10.0, plusTol: 0.05, minusTol: -0.05, direction: 'add' },
            { name: "Part C", nominal: 5.0, plusTol: 0.02, minusTol: -0.02, direction: 'subtract' }
        ];

        const loop = this.createToleranceLoop(dims);
        return loop.analyze('all');
    }
}