const PRISM_AB_TESTING = {

    experiments: new Map(),

    /**
     * Create new experiment
     */
    createExperiment: function(name, variants, config = {}) {
        const experiment = {
            name,
            variants,
            config: {
                minSamples: config.minSamples || 100,
                significanceLevel: config.significanceLevel || 0.05,
                ...config
            },
            data: variants.map(() => ({
                impressions: 0,
                conversions: 0,
                values: []
            })),
            status: 'running',
            created: Date.now(),
            winner: null
        };
        this.experiments.set(name, experiment);
        return experiment;
    },
    /**
     * Get variant assignment (deterministic by user ID)
     */
    getVariant: function(experimentName, userId = null) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment || experiment.status !== 'running') {
            return experiment?.winner || 0;
        }
        // Deterministic assignment based on user ID
        if (userId) {
            let hash = 0;
            for (let i = 0; i < userId.length; i++) {
                hash = ((hash << 5) - hash) + userId.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash) % experiment.variants.length;
        }
        // Random assignment
        return Math.floor(Math.random() * experiment.variants.length);
    },
    /**
     * Record impression
     */
    recordImpression: function(experimentName, variantIdx) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment) return;

        experiment.data[variantIdx].impressions++;
        this._checkSignificance(experimentName);
    },
    /**
     * Record conversion/success
     */
    recordConversion: function(experimentName, variantIdx, value = 1) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment) return;

        experiment.data[variantIdx].conversions++;
        experiment.data[variantIdx].values.push(value);
        this._checkSignificance(experimentName);
    },
    /**
     * Check statistical significance
     */
    _checkSignificance: function(experimentName) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment || experiment.status !== 'running') return;

        const { data, config, variants } = experiment;

        // Check if we have enough samples
        const totalSamples = data.reduce((sum, d) => sum + d.impressions, 0);
        if (totalSamples < config.minSamples * variants.length) return;

        // Perform chi-squared test for conversion rates
        const rates = data.map(d => d.conversions / Math.max(1, d.impressions));
        const overallRate = data.reduce((sum, d) => sum + d.conversions, 0) / totalSamples;

        let chiSquared = 0;
        for (let i = 0; i < variants.length; i++) {
            const expected = overallRate * data[i].impressions;
            const observed = data[i].conversions;
            if (expected > 0) {
                chiSquared += Math.pow(observed - expected, 2) / expected;
            }
        }
        // Chi-squared critical value for df=1, alpha=0.05 is ~3.84
        const criticalValue = variants.length === 2 ? 3.84 : 5.99; // df = variants - 1

        if (chiSquared > criticalValue) {
            // Find winner
            const winnerIdx = rates.indexOf(Math.max(...rates));
            experiment.winner = winnerIdx;
            experiment.status = 'completed';
            experiment.completedAt = Date.now();

            (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[A/B Testing] Experiment "${experimentName}" completed. Winner: Variant ${winnerIdx}`);
        }
    },
    /**
     * Get experiment results
     */
    getResults: function(experimentName) {
        const experiment = this.experiments.get(experimentName);
        if (!experiment) return null;

        const { data, variants, status, winner } = experiment;

        const results = variants.map((name, i) => {
            const d = data[i];
            const rate = d.conversions / Math.max(1, d.impressions);
            const avgValue = d.values.length > 0 ?
                d.values.reduce((a, b) => a + b, 0) / d.values.length : 0;

            // Confidence interval (Wilson score)
            const n = d.impressions;
            const p = rate;
            const z = 1.96;
            const denominator = 1 + z * z / n;
            const center = (p + z * z / (2 * n)) / denominator;
            const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denominator;

            return {
                variant: name,
                impressions: d.impressions,
                conversions: d.conversions,
                conversionRate: (rate * 100).toFixed(2) + '%',
                avgValue: avgValue.toFixed(2),
                confidenceInterval: {
                    lower: ((center - margin) * 100).toFixed(2) + '%',
                    upper: ((center + margin) * 100).toFixed(2) + '%'
                },
                isWinner: i === winner
            };
        });

        return {
            experimentName,
            status,
            winner: winner !== null ? variants[winner] : null,
            results
        };
    }
}