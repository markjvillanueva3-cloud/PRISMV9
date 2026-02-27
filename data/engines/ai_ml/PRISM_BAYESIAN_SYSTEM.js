// PRISM_BAYESIAN_SYSTEM - Lines 767655-767889 (235 lines) - Bayesian inference\n\nconst PRISM_BAYESIAN_SYSTEM = {

    /**
     * Bayesian Speed & Feed Optimizer
     * Learns optimal parameters from user feedback
     */
    BayesianParameterLearner: {

        // Prior distributions for cutting parameters
        priors: {
            speed_multiplier: { mean: 1.0, variance: 0.04 },
            feed_multiplier: { mean: 1.0, variance: 0.04 },
            doc_multiplier: { mean: 1.0, variance: 0.04 }
        },
        // Likelihood model
        likelihood: {
            observation_variance: 0.01
        },
        // Posterior (starts as prior)
        posteriors: null,

        // Observation history
        history: [],

        initialize: function() {
            this.posteriors = JSON.parse(JSON.stringify(this.priors));
            this.history = [];
        },
        /**
         * Update beliefs based on user feedback
         */
        update: function(observation) {
            // observation: { parameter, recommended, actual_used, outcome }
            // outcome: 1 = good, 0.5 = acceptable, 0 = bad

            const { parameter, recommended, actual_used, outcome } = observation;

            if (!this.posteriors) this.initialize();

            // Calculate multiplier used
            const multiplier = actual_used / recommended;

            // Bayesian update for the parameter
            const prior = this.posteriors[`${parameter}_multiplier`];
            const sigma_prior = Math.sqrt(prior.variance);
            const sigma_likelihood = Math.sqrt(this.likelihood.observation_variance);

            // Posterior mean (weighted average)
            const K = prior.variance / (prior.variance + this.likelihood.observation_variance);
            const posterior_mean = prior.mean + K * (multiplier - prior.mean);
            const posterior_variance = (1 - K) * prior.variance;

            // Update posterior
            this.posteriors[`${parameter}_multiplier`] = {
                mean: posterior_mean,
                variance: posterior_variance
            };
            // Store observation
            this.history.push({
                ...observation,
                timestamp: Date.now(),
                posterior_snapshot: JSON.parse(JSON.stringify(this.posteriors))
            });

            return {
                parameter,
                prior_mean: prior.mean,
                posterior_mean,
                confidence: 1 - Math.sqrt(posterior_variance)
            };
        },
        /**
         * Get adjusted recommendation using learned preferences
         */
        adjustRecommendation: function(baseRecommendation) {
            if (!this.posteriors) this.initialize();

            return {
                speed: baseRecommendation.speed * this.posteriors.speed_multiplier.mean,
                feed: baseRecommendation.feed * this.posteriors.feed_multiplier.mean,
                doc: baseRecommendation.doc * this.posteriors.doc_multiplier.mean,
                confidence: {
                    speed: 1 - Math.sqrt(this.posteriors.speed_multiplier.variance),
                    feed: 1 - Math.sqrt(this.posteriors.feed_multiplier.variance),
                    doc: 1 - Math.sqrt(this.posteriors.doc_multiplier.variance)
                }
            };
        },
        /**
         * Thompson Sampling for exploration/exploitation
         */
        thompsonSample: function() {
            if (!this.posteriors) this.initialize();

            const samples = {};

            for (const [key, dist] of Object.entries(this.posteriors)) {
                // Sample from posterior (Gaussian)
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                samples[key] = dist.mean + Math.sqrt(dist.variance) * z;
            }
            return samples;
        }
    },
    /**
     * Gaussian Process for Tool Life Prediction with Uncertainty
     */
    GaussianProcessToolLife: {

        // Training data
        X_train: [],
        y_train: [],

        // Hyperparameters
        lengthScale: 50,    // How similar nearby speeds are
        signalVariance: 1.0,
        noiseVariance: 0.01,

        // Precomputed inverse covariance
        K_inv: null,

        /**
         * RBF Kernel
         */
        kernel: function(x1, x2) {
            const diff = x1 - x2;
            return this.signalVariance * Math.exp(-diff * diff / (2 * this.lengthScale * this.lengthScale));
        },
        /**
         * Add training point
         */
        addObservation: function(speed, actualToolLife) {
            this.X_train.push(speed);
            this.y_train.push(actualToolLife);
            this.K_inv = null; // Invalidate cache
        },
        /**
         * Predict tool life with uncertainty
         */
        predict: function(speed) {
            if (this.X_train.length === 0) {
                // No data - return prior
                return {
                    mean: 30, // Prior mean tool life
                    variance: 100,
                    confidence95: [5, 55]
                };
            }
            // Compute covariance matrix if needed
            if (!this.K_inv) {
                this._computeInverse();
            }
            // k_star: covariance between test point and training points
            const k_star = this.X_train.map(x => this.kernel(speed, x));

            // Mean prediction: k_star^T @ K_inv @ y
            let mean = 0;
            for (let i = 0; i < this.X_train.length; i++) {
                let sum = 0;
                for (let j = 0; j < this.X_train.length; j++) {
                    sum += this.K_inv[i][j] * this.y_train[j];
                }
                mean += k_star[i] * sum;
            }
            // Variance: k(x*, x*) - k_star^T @ K_inv @ k_star
            let variance = this.kernel(speed, speed);
            for (let i = 0; i < this.X_train.length; i++) {
                for (let j = 0; j < this.X_train.length; j++) {
                    variance -= k_star[i] * this.K_inv[i][j] * k_star[j];
                }
            }
            variance = Math.max(0, variance);

            const std = Math.sqrt(variance);

            return {
                mean,
                variance,
                std,
                confidence95: [mean - 1.96 * std, mean + 1.96 * std]
            };
        },
        _computeInverse: function() {
            const n = this.X_train.length;
            const K = [];

            // Build covariance matrix
            for (let i = 0; i < n; i++) {
                K[i] = [];
                for (let j = 0; j < n; j++) {
                    K[i][j] = this.kernel(this.X_train[i], this.X_train[j]);
                    if (i === j) K[i][j] += this.noiseVariance;
                }
            }
            // Simple matrix inversion (for small matrices)
            this.K_inv = this._invertMatrix(K);
        },
        _invertMatrix: function(matrix) {
            const n = matrix.length;
            const aug = matrix.map((row, i) => {
                const newRow = [...row];
                for (let j = 0; j < n; j++) {
                    newRow.push(i === j ? 1 : 0);
                }
                return newRow;
            });

            // Gaussian elimination
            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                }
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

                const pivot = aug[i][i];
                if (Math.abs(pivot) < 1e-10) continue;

                for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;

                for (let k = 0; k < n; k++) {
                    if (k !== i) {
                        const factor = aug[k][i];
                        for (let j = 0; j < 2 * n; j++) {
                            aug[k][j] -= factor * aug[i][j];
                        }
                    }
                }
            }
            return aug.map(row => row.slice(n));
        }
    }
};
