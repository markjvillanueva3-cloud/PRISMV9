const PRISM_DIMENSIONALITY_ENGINE = {
    name: 'PRISM_DIMENSIONALITY_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, van der Maaten 2008',

    /**
     * t-SNE: t-Distributed Stochastic Neighbor Embedding
     */
    tsne: function(X, params = {}) {
        const { dims = 2, perplexity = 30, maxIter = 500, learningRate = 100, earlyExaggeration = 4 } = params;
        const n = X.length;

        // Compute pairwise distances
        const D = this._pairwiseDistances(X);

        // Compute P (high-D probabilities with perplexity)
        const P = this._computeP(D, perplexity);

        // Initialize Y randomly
        let Y = Array.from({ length: n }, () =>
            Array.from({ length: dims }, () => (Math.random() - 0.5) * 0.0001));

        let momentum = Array.from({ length: n }, () => Array(dims).fill(0));
        let gains = Array.from({ length: n }, () => Array(dims).fill(1));

        // Gradient descent
        for (let iter = 0; iter < maxIter; iter++) {
            const exaggeration = iter < 100 ? earlyExaggeration : 1;
            const alpha = iter < 250 ? 0.5 : 0.8;

            // Compute Q (low-D probabilities using t-distribution)
            const Q = this._computeQ(Y);

            // Compute gradients
            const gradients = this._computeGradients(P, Q, Y, exaggeration);

            // Update Y
            for (let i = 0; i < n; i++) {
                for (let d = 0; d < dims; d++) {
                    // Adaptive learning rate
                    const sameSign = Math.sign(gradients[i][d]) === Math.sign(momentum[i][d]);
                    gains[i][d] = sameSign ? gains[i][d] * 0.8 : gains[i][d] + 0.2;
                    gains[i][d] = Math.max(0.01, gains[i][d]);

                    momentum[i][d] = alpha * momentum[i][d] - learningRate * gains[i][d] * gradients[i][d];
                    Y[i][d] += momentum[i][d];
                }
            }

            // Center Y
            const mean = Array(dims).fill(0);
            for (const y of Y) {
                for (let d = 0; d < dims; d++) mean[d] += y[d];
            }
            for (let d = 0; d < dims; d++) mean[d] /= n;
            for (const y of Y) {
                for (let d = 0; d < dims; d++) y[d] -= mean[d];
            }
        }

        return Y;
    },

    _pairwiseDistances: function(X) {
        const n = X.length;
        const D = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let sum = 0;
                for (let k = 0; k < X[i].length; k++) {
                    sum += (X[i][k] - X[j][k]) ** 2;
                }
                D[i][j] = D[j][i] = sum;
            }
        }
        return D;
    },

    _computeP: function(D, perplexity) {
        const n = D.length;
        const P = Array.from({ length: n }, () => Array(n).fill(0));
        const targetEntropy = Math.log(perplexity);

        for (let i = 0; i < n; i++) {
            // Binary search for sigma
            let sigmaMin = 0, sigmaMax = Infinity, sigma = 1;

            for (let iter = 0; iter < 50; iter++) {
                // Compute P_j|i
                let sumP = 0;
                for (let j = 0; j < n; j++) {
                    if (j !== i) {
                        P[i][j] = Math.exp(-D[i][j] / (2 * sigma * sigma));
                        sumP += P[i][j];
                    }
                }
                for (let j = 0; j < n; j++) {
                    P[i][j] /= sumP || 1;
                }

                // Compute entropy
                let entropy = 0;
                for (let j = 0; j < n; j++) {
                    if (P[i][j] > 1e-10) {
                        entropy -= P[i][j] * Math.log(P[i][j]);
                    }
                }

                // Adjust sigma
                if (Math.abs(entropy - targetEntropy) < 1e-5) break;
                if (entropy > targetEntropy) {
                    sigmaMax = sigma;
                    sigma = sigmaMax === Infinity ? sigma * 2 : (sigmaMin + sigmaMax) / 2;
                } else {
                    sigmaMin = sigma;
                    sigma = (sigmaMin + sigmaMax) / 2;
                }
            }
        }

        // Symmetrize
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const pij = (P[i][j] + P[j][i]) / (2 * n);
                P[i][j] = P[j][i] = Math.max(pij, 1e-12);
            }
        }

        return P;
    },

    _computeQ: function(Y) {
        const n = Y.length;
        const Q = Array.from({ length: n }, () => Array(n).fill(0));
        let sumQ = 0;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                let dist = 0;
                for (let d = 0; d < Y[i].length; d++) {
                    dist += (Y[i][d] - Y[j][d]) ** 2;
                }
                const q = 1 / (1 + dist); // t-distribution
                Q[i][j] = Q[j][i] = q;
                sumQ += 2 * q;
            }
        }

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                Q[i][j] = Math.max(Q[i][j] / sumQ, 1e-12);
            }
        }

        return Q;
    },

    _computeGradients: function(P, Q, Y, exaggeration) {
        const n = Y.length;
        const dims = Y[0].length;
        const gradients = Array.from({ length: n }, () => Array(dims).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) continue;

                let dist = 0;
                for (let d = 0; d < dims; d++) {
                    dist += (Y[i][d] - Y[j][d]) ** 2;
                }
                const qij = 1 / (1 + dist);

                const mult = 4 * (exaggeration * P[i][j] - Q[i][j]) * qij;

                for (let d = 0; d < dims; d++) {
                    gradients[i][d] += mult * (Y[i][d] - Y[j][d]);
                }
            }
        }

        return gradients;
    },

    /**
     * PCA: Principal Component Analysis
     */
    pca: function(X, numComponents) {
        const n = X.length;
        const dim = X[0].length;

        // Center the data
        const mean = Array(dim).fill(0);
        for (const x of X) {
            for (let d = 0; d < dim; d++) mean[d] += x[d];
        }
        for (let d = 0; d < dim; d++) mean[d] /= n;

        const centered = X.map(x => x.map((v, d) => v - mean[d]));

        // Compute covariance matrix
        const cov = Array.from({ length: dim }, () => Array(dim).fill(0));
        for (let i = 0; i < dim; i++) {
            for (let j = 0; j < dim; j++) {
                for (const x of centered) {
                    cov[i][j] += x[i] * x[j];
                }
                cov[i][j] /= (n - 1);
            }
        }

        // Power iteration for top eigenvectors
        const components = [];
        const eigenvalues = [];
        const covCopy = cov.map(row => [...row]);

        for (let k = 0; k < numComponents; k++) {
            // Power iteration
            let v = Array(dim).fill(0).map(() => Math.random() - 0.5);
            
            for (let iter = 0; iter < 100; iter++) {
                // Multiply by covariance
                const Av = Array(dim).fill(0);
                for (let i = 0; i < dim; i++) {
                    for (let j = 0; j < dim; j++) {
                        Av[i] += covCopy[i][j] * v[j];
                    }
                }

                // Normalize
                const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0)) || 1;
                v = Av.map(x => x / norm);
            }

            // Compute eigenvalue
            const Av = Array(dim).fill(0);
            for (let i = 0; i < dim; i++) {
                for (let j = 0; j < dim; j++) {
                    Av[i] += covCopy[i][j] * v[j];
                }
            }
            const eigenvalue = v.reduce((s, vi, i) => s + vi * Av[i], 0);

            components.push(v);
            eigenvalues.push(eigenvalue);

            // Deflate: remove this component from covariance
            for (let i = 0; i < dim; i++) {
                for (let j = 0; j < dim; j++) {
                    covCopy[i][j] -= eigenvalue * v[i] * v[j];
                }
            }
        }

        // Project data
        const projected = centered.map(x => 
            components.map(comp => x.reduce((s, xi, i) => s + xi * comp[i], 0)));

        return {
            projected,
            components,
            eigenvalues,
            explainedVariance: eigenvalues.map(e => e / eigenvalues.reduce((a, b) => a + b, 0)),
            mean
        };
    },

    /**
     * Incremental PCA (for large datasets)
     */
    incrementalPca: function(X, numComponents, batchSize = 100) {
        const n = X.length;
        const dim = X[0].length;
        let mean = Array(dim).fill(0);
        let components = Array.from({ length: numComponents }, () =>
            Array.from({ length: dim }, () => Math.random() - 0.5));
        
        // Normalize initial components
        for (let k = 0; k < numComponents; k++) {
            const norm = Math.sqrt(components[k].reduce((s, v) => s + v * v, 0));
            components[k] = components[k].map(v => v / norm);
        }

        // Process in batches
        for (let start = 0; start < n; start += batchSize) {
            const batch = X.slice(start, Math.min(start + batchSize, n));
            
            // Update mean
            for (const x of batch) {
                for (let d = 0; d < dim; d++) {
                    mean[d] = mean[d] * (start / (start + batch.length)) + 
                              x[d] * (batch.length / (start + batch.length));
                }
            }

            // Center batch
            const centered = batch.map(x => x.map((v, d) => v - mean[d]));

            // CCIPCA update
            for (const x of centered) {
                for (let k = 0; k < numComponents; k++) {
                    // Project and residual
                    const proj = components[k].reduce((s, c, i) => s + c * x[i], 0);
                    
                    // Update component
                    for (let d = 0; d < dim; d++) {
                        components[k][d] += (proj * x[d] - proj * proj * components[k][d]) * 0.01;
                    }

                    // Orthogonalize
                    for (let p = 0; p < k; p++) {
                        const dot = components[k].reduce((s, c, i) => s + c * components[p][i], 0);
                        for (let d = 0; d < dim; d++) {
                            components[k][d] -= dot * components[p][d];
                        }
                    }

                    // Normalize
                    const norm = Math.sqrt(components[k].reduce((s, v) => s + v * v, 0)) || 1;
                    components[k] = components[k].map(v => v / norm);
                }
            }
        }

        // Project all data
        const centered = X.map(x => x.map((v, d) => v - mean[d]));
        const projected = centered.map(x =>
            components.map(comp => x.reduce((s, xi, i) => s + xi * comp[i], 0)));

        return { projected, components, mean };
    }
}