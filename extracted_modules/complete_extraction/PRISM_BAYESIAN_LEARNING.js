const PRISM_BAYESIAN_LEARNING = {

    /**
     * Gaussian Process Regression for parameter prediction
     */
    GaussianProcess: class {
        constructor(lengthScale = 1.0, signalVariance = 1.0, noiseVariance = 0.1) {
            this.lengthScale = lengthScale;
            this.signalVariance = signalVariance;
            this.noiseVariance = noiseVariance;
            this.X_train = [];
            this.y_train = [];
            this.K_inv = null;
        }
        // RBF (Radial Basis Function) kernel
        kernel(x1, x2) {
            let sqDist = 0;
            for (let i = 0; i < x1.length; i++) {
                sqDist += Math.pow(x1[i] - x2[i], 2);
            }
            return this.signalVariance * Math.exp(-sqDist / (2 * this.lengthScale * this.lengthScale));
        }
        // Fit training data
        fit(X, y) {
            this.X_train = X;
            this.y_train = y;

            const n = X.length;
            const K = [];

            // Build covariance matrix
            for (let i = 0; i < n; i++) {
                K[i] = [];
                for (let j = 0; j < n; j++) {
                    K[i][j] = this.kernel(X[i], X[j]);
                    if (i === j) K[i][j] += this.noiseVariance;
                }
            }
            // Invert K (using simple Gauss-Jordan for small matrices)
            this.K_inv = this._invertMatrix(K);

            return this;
        }
        // Predict with uncertainty
        predict(X_test) {
            const predictions = [];

            for (const x of X_test) {
                // Compute k_star
                const k_star = this.X_train.map(xi => this.kernel(x, xi));

                // Mean prediction
                let mean = 0;
                for (let i = 0; i < this.X_train.length; i++) {
                    let kInvY = 0;
                    for (let j = 0; j < this.X_train.length; j++) {
                        kInvY += this.K_inv[i][j] * this.y_train[j];
                    }
                    mean += k_star[i] * kInvY;
                }
                // Variance
                const k_star_star = this.kernel(x, x);
                let variance = k_star_star;
                for (let i = 0; i < this.X_train.length; i++) {
                    for (let j = 0; j < this.X_train.length; j++) {
                        variance -= k_star[i] * this.K_inv[i][j] * k_star[j];
                    }
                }
                variance = Math.max(0, variance);

                predictions.push({
                    mean,
                    variance,
                    std: Math.sqrt(variance),
                    lower95: mean - 1.96 * Math.sqrt(variance),
                    upper95: mean + 1.96 * Math.sqrt(variance)
                });
            }
            return predictions;
        }
        // Update with new observation (online learning)
        update(x_new, y_new) {
            this.X_train.push(x_new);
            this.y_train.push(y_new);

            // Refit (for small datasets, this is acceptable)
            // For large datasets, use rank-1 update
            this.fit(this.X_train, this.y_train);

            return this;
        }
        _invertMatrix(matrix) {
            const n = matrix.length;
            const augmented = matrix.map((row, i) => {
                const identityRow = Array(n).fill(0);
                identityRow[i] = 1;
                return [...row, ...identityRow];
            });

            // Forward elimination
            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                        maxRow = k;
                    }
                }
                [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

                const pivot = augmented[i][i];
                if (Math.abs(pivot) < 1e-10) continue;

                for (let j = 0; j < 2 * n; j++) {
                    augmented[i][j] /= pivot;
                }
                for (let k = 0; k < n; k++) {
                    if (k !== i) {
                        const factor = augmented[k][i];
                        for (let j = 0; j < 2 * n; j++) {
                            augmented[k][j] -= factor * augmented[i][j];
                        }
                    }
                }
            }
            return augmented.map(row => row.slice(n));
        }
    },
    /**
     * Bayesian Optimization for hyperparameter tuning
     */
    BayesianOptimization: class {
        constructor(bounds, acquisitionFn = 'ei') {
            this.bounds = bounds; // [{min, max}, ...]
            this.acquisitionFn = acquisitionFn;
            this.gp = new PRISM_BAYESIAN_LEARNING.GaussianProcess(1.0, 1.0, 0.01);
            this.X_samples = [];
            this.y_samples = [];
            this.bestX = null;
            this.bestY = -Infinity;
        }
        // Expected Improvement acquisition function
        expectedImprovement(x, xi = 0.01) {
            const pred = this.gp.predict([x])[0];
            const mu = pred.mean;
            const sigma = pred.std;

            if (sigma < 1e-10) return 0;

            const imp = mu - this.bestY - xi;
            const z = imp / sigma;
            const cdf = 0.5 * (1 + this._erf(z / Math.sqrt(2)));
            const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

            return imp * cdf + sigma * pdf;
        }
        _erf(x) {
            const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
            const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
            const sign = x < 0 ? -1 : 1;
            x = Math.abs(x);
            const t = 1.0 / (1.0 + p * x);
            const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
            return sign * y;
        }
        // Suggest next point to evaluate
        suggest() {
            if (this.X_samples.length < 5) {
                // Random sampling for initial exploration
                return this.bounds.map(b => b.min + Math.random() * (b.max - b.min));
            }
            // Grid search over acquisition function
            let bestAcq = -Infinity;
            let bestX = null;

            const gridSize = 20;
            const dims = this.bounds.length;

            for (let i = 0; i < Math.pow(gridSize, Math.min(dims, 3)); i++) {
                const x = this.bounds.map((b, d) => {
                    const idx = Math.floor(i / Math.pow(gridSize, d)) % gridSize;
                    return b.min + (idx / (gridSize - 1)) * (b.max - b.min);
                });

                const acq = this.expectedImprovement(x);
                if (acq > bestAcq) {
                    bestAcq = acq;
                    bestX = x;
                }
            }
            return bestX;
        }
        // Register observation
        observe(x, y) {
            this.X_samples.push(x);
            this.y_samples.push(y);

            if (y > this.bestY) {
                this.bestY = y;
                this.bestX = x;
            }
            this.gp.fit(this.X_samples, this.y_samples);
        }
        // Run optimization
        optimize(objectiveFn, nIterations = 20) {
            for (let i = 0; i < nIterations; i++) {
                const x = this.suggest();
                const y = objectiveFn(x);
                this.observe(x, y);

                console.log(`[BayesOpt] Iteration ${i + 1}: y = ${y.toFixed(4)}, best = ${this.bestY.toFixed(4)}`);
            }
            return { bestX: this.bestX, bestY: this.bestY };
        }
    },
    /**
     * Thompson Sampling for parameter exploration
     */
    ThompsonSampling: class {
        constructor(nArms) {
            this.nArms = nArms;
            this.alpha = Array(nArms).fill(1); // Successes + 1
            this.beta = Array(nArms).fill(1);  // Failures + 1
        }
        // Sample from posterior and select arm
        select() {
            let bestArm = 0;
            let bestSample = -Infinity;

            for (let i = 0; i < this.nArms; i++) {
                // Sample from Beta distribution
                const sample = this._sampleBeta(this.alpha[i], this.beta[i]);
                if (sample > bestSample) {
                    bestSample = sample;
                    bestArm = i;
                }
            }
            return bestArm;
        }
        // Update posterior
        update(arm, reward) {
            if (reward > 0.5) {
                this.alpha[arm] += 1;
            } else {
                this.beta[arm] += 1;
            }
        }
        // Get expected values
        getExpected() {
            return this.alpha.map((a, i) => a / (a + this.beta[i]));
        }
        _sampleBeta(alpha, beta) {
            // Approximate beta sampling using gamma
            const x = this._sampleGamma(alpha);
            const y = this._sampleGamma(beta);
            return x / (x + y);
        }
        _sampleGamma(alpha) {
            // Marsaglia and Tsang's method
            if (alpha < 1) {
                return this._sampleGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
            }
            const d = alpha - 1/3;
            const c = 1 / Math.sqrt(9 * d);
            while (true) {
                let x, v;
                do {
                    x = this._randn();
                    v = 1 + c * x;
                } while (v <= 0);
                v = v * v * v;
                const u = Math.random();
                if (u < 1 - 0.0331 * x * x * x * x) return d * v;
                if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
            }
        }
        _randn() {
            const u1 = Math.random();
            const u2 = Math.random();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }
    }
};