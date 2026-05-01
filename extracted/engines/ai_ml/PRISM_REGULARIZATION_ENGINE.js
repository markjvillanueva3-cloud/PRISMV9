/**
 * PRISM_REGULARIZATION_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 12607
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_REGULARIZATION_ENGINE = {
    name: 'PRISM_REGULARIZATION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * Standard Dropout
     */
    dropout: function(x, p = 0.5, training = true) {
        if (!training || p === 0) return { output: x, mask: null };
        
        const mask = x.map(() => Math.random() > p ? 1 : 0);
        const scale = 1 / (1 - p);
        const output = x.map((v, i) => v * mask[i] * scale);
        
        return { output, mask };
    },

    /**
     * Spatial Dropout (for CNNs - drops entire channels)
     */
    spatialDropout: function(x, channels, p = 0.5, training = true) {
        if (!training || p === 0) return x;
        
        const channelSize = x.length / channels;
        const channelMask = Array(channels).fill(0).map(() => Math.random() > p ? 1 : 0);
        const scale = 1 / (1 - p);
        
        return x.map((v, i) => {
            const c = Math.floor(i / channelSize);
            return v * channelMask[c] * scale;
        });
    },

    /**
     * DropConnect (drops weights instead of activations)
     */
    dropConnect: function(weights, p = 0.5, training = true) {
        if (!training || p === 0) return weights;
        
        const scale = 1 / (1 - p);
        return weights.map(row =>
            Array.isArray(row)
                ? row.map(w => Math.random() > p ? w * scale : 0)
                : Math.random() > p ? row * scale : 0
        );
    },

    /**
     * Label Smoothing
     */
    labelSmoothing: function(labels, numClasses, smoothing = 0.1) {
        const smoothed = [];
        for (const label of labels) {
            const oneHot = Array(numClasses).fill(smoothing / numClasses);
            oneHot[label] = 1 - smoothing + smoothing / numClasses;
            smoothed.push(oneHot);
        }
        return smoothed;
    },

    /**
     * Mixup Data Augmentation
     */
    mixup: function(x1, y1, x2, y2, alpha = 0.2) {
        // Sample lambda from Beta(alpha, alpha)
        const lambda = this._sampleBeta(alpha, alpha);
        
        const mixedX = x1.map((v, i) => lambda * v + (1 - lambda) * x2[i]);
        const mixedY = y1.map((v, i) => lambda * v + (1 - lambda) * y2[i]);
        
        return { x: mixedX, y: mixedY, lambda };
    },

    /**
     * CutMix (for images represented as flat arrays)
     */
    cutmix: function(x1, y1, x2, y2, width, height) {
        const lambda = Math.random();
        const cutRatio = Math.sqrt(1 - lambda);
        
        const cutW = Math.floor(width * cutRatio);
        const cutH = Math.floor(height * cutRatio);
        const cx = Math.floor(Math.random() * width);
        const cy = Math.floor(Math.random() * height);
        
        const x1Start = Math.max(0, cx - cutW / 2);
        const y1Start = Math.max(0, cy - cutH / 2);
        const x1End = Math.min(width, cx + cutW / 2);
        const y1End = Math.min(height, cy + cutH / 2);

        const mixedX = [...x1];
        for (let y = y1Start; y < y1End; y++) {
            for (let x = x1Start; x < x1End; x++) {
                const idx = y * width + x;
                mixedX[idx] = x2[idx];
            }
        }

        const actualLambda = 1 - (x1End - x1Start) * (y1End - y1Start) / (width * height);
        const mixedY = y1.map((v, i) => actualLambda * v + (1 - actualLambda) * y2[i]);
        
        return { x: mixedX, y: mixedY, lambda: actualLambda };
    },

    /**
     * L1 Regularization (Lasso)
     */
    l1Regularization: function(weights, lambda = 0.01) {
        let penalty = 0;
        const flatten = (arr) => {
            if (!Array.isArray(arr)) return Math.abs(arr);
            return arr.reduce((sum, item) => sum + flatten(item), 0);
        };
        penalty = flatten(weights);
        return lambda * penalty;
    },

    /**
     * L2 Regularization (Ridge)
     */
    l2Regularization: function(weights, lambda = 0.01) {
        let penalty = 0;
        const flatten = (arr) => {
            if (!Array.isArray(arr)) return arr * arr;
            return arr.reduce((sum, item) => sum + flatten(item), 0);
        };
        penalty = flatten(weights);
        return 0.5 * lambda * penalty;
    },

    /**
     * Elastic Net (L1 + L2)
     */
    elasticNet: function(weights, lambda1 = 0.01, lambda2 = 0.01) {
        return this.l1Regularization(weights, lambda1) + this.l2Regularization(weights, lambda2);
    },

    // Helper: Sample from Beta distribution (approximation)
    _sampleBeta: function(alpha, beta) {
        const gamma1 = this._sampleGamma(alpha);
        const gamma2 = this._sampleGamma(beta);
        return gamma1 / (gamma1 + gamma2);
    },

    _sampleGamma: function(shape) {
        // Marsaglia and Tsang's method for shape >= 1
        if (shape < 1) {
            return this._sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
        }
        const d = shape - 1/3;
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
    },

    _randn: function() {
        const u = Math.random(), v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
};

// Gateway registrations
if (typeof PRISM_GATEWAY !== 'undefined') {
    // Activations
    PRISM_GATEWAY.register('ai.activation.relu', 'PRISM_ACTIVATIONS_ENGINE.relu');
    PRISM_GATEWAY.register('ai.activation.elu', 'PRISM_ACTIVATIONS_ENGINE.elu');
    PRISM_GATEWAY.register('ai.activation.selu', 'PRISM_ACTIVATIONS_ENGINE.selu');
    PRISM_GATEWAY.register('ai.activation.gelu', 'PRISM_ACTIVATIONS_ENGINE.gelu');
    PRISM_GATEWAY.register('ai.activation.swish', 'PRISM_ACTIVATIONS_ENGINE.swish');
    PRISM_GATEWAY.register('ai.activation.mish', 'PRISM_ACTIVATIONS_ENGINE.mish');
    PRISM_GATEWAY.register('ai.activation.leaky_relu', 'PRISM_ACTIVATIONS_ENGINE.leakyRelu');
    PRISM_GATEWAY.register('ai.activation.softmax', 'PRISM_ACTIVATIONS_ENGINE.softmax');
    PRISM_GATEWAY.register('ai.activation.apply', 'PRISM_ACTIVATIONS_ENGINE.apply');

    // Optimizers
    PRISM_GATEWAY.register('ai.optimizer.sgd', 'PRISM_OPTIMIZERS_ENGINE.createSGD');
    PRISM_GATEWAY.register('ai.optimizer.adam', 'PRISM_OPTIMIZERS_ENGINE.createAdam');
    PRISM_GATEWAY.register('ai.optimizer.adamw', 'PRISM_OPTIMIZERS_ENGINE.createAdamW');
    PRISM_GATEWAY.register('ai.optimizer.nadam', 'PRISM_OPTIMIZERS_ENGINE.createNAdam');
    PRISM_GATEWAY.register('ai.optimizer.rmsprop', 'PRISM_OPTIMIZERS_ENGINE.createRMSprop');
    PRISM_GATEWAY.register('ai.optimizer.adagrad', 'PRISM_OPTIMIZERS_ENGINE.createAdaGrad');
    PRISM_GATEWAY.register('ai.optimizer.adadelta', 'PRISM_OPTIMIZERS_ENGINE.createAdaDelta');

    // Normalization
    PRISM_GATEWAY.register('ai.norm.batch', 'PRISM_NORMALIZATION_ENGINE.batchNorm');
    PRISM_GATEWAY.register('ai.norm.layer', 'PRISM_NORMALIZATION_ENGINE.layerNorm');
    PRISM_GATEWAY.register('ai.norm.instance', 'PRISM_NORMALIZATION_ENGINE.instanceNorm');
    PRISM_GATEWAY.register('ai.norm.group', 'PRISM_NORMALIZATION_ENGINE.groupNorm');
    PRISM_GATEWAY.register('ai.norm.rms', 'PRISM_NORMALIZATION_ENGINE.rmsNorm');

    // Regularization
    PRISM_GATEWAY.register('ai.reg.dropout', 'PRISM_REGULARIZATION_ENGINE.dropout');
    PRISM_GATEWAY.register('ai.reg.spatial_dropout', 'PRISM_REGULARIZATION_ENGINE.spatialDropout');
    PRISM_GATEWAY.register('ai.reg.dropconnect', 'PRISM_REGULARIZATION_ENGINE.dropConnect');
    PRISM_GATEWAY.register('ai.reg.label_smooth', 'PRISM_REGULARIZATION_ENGINE.labelSmoothing');
    PRISM_GATEWAY.register('ai.reg.mixup', 'PRISM_REGULARIZATION_ENGINE.mixup');
    PRISM_GATEWAY.register('ai.reg.cutmix', 'PRISM_REGULARIZATION_ENGINE.cutmix');
    PRISM_GATEWAY.register('ai.reg.l1', 'PRISM_REGULARIZATION_ENGINE.l1Regularization');
    PRISM_GATEWAY.register('ai.reg.l2', 'PRISM_REGULARIZATION_ENGINE.l2Regularization');
    PRISM_GATEWAY.register('ai.reg.elastic', 'PRISM_REGULARIZATION_ENGINE.elasticNet');
}

console.log('[PRISM Session 1 Ultimate AI/ML Part 3] Modules 11-14 loaded');
console.log('  - PRISM_ACTIVATIONS_ENGINE (15+ activations)');
console.log('  - PRISM_OPTIMIZERS_ENGINE (7 optimizers)');
console.log('  - PRISM_NORMALIZATION_ENGINE (5 normalization methods)');
console.log('  - PRISM_REGULARIZATION_ENGINE (dropout, mixup, L1/L2)');
/**
 * PRISM SESSION 1 - ULTIMATE AI/ML ENHANCEMENT - PART 4
 * Clustering & Dimensionality Reduction
 * Sources: Stanford CS 229, MIT 6.036, scikit-learn
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 15: PRISM_CLUSTERING_ENGINE
// DBSCAN, K-Medoids, Hierarchical, Mean Shift, Spectral
// Source: Stanford CS 229, ESTER 1996 (DBSCAN)
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_CLUSTERING_ENGINE = {
    name: 'PRISM_CLUSTERING_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, ESTER 1996',

    // Helper: Euclidean distance
    _euclidean: function(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += (a[i] - b[i]) ** 2;
        }
        return Math.sqrt(sum);
    },

    // Helper: Distance matrix
    _distanceMatrix: function(points) {
        const n = points.length;
        const D = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                D[i][j] = D[j][i] = this._euclidean(points[i], points[j]);
            }
        }
        return D;
    },

    /**
     * DBSCAN: Density-Based Spatial Clustering
     * @param {Array} points - Array of data points
     * @param {number} eps - Epsilon neighborhood radius
     * @param {number} minPts - Minimum points for core point
     * @returns {Array} Cluster labels (-1 for noise)
     */
    dbscan: function(points, eps, minPts) {
        const n = points.length;
        const labels = Array(n).fill(-1); // -1 = unvisited
        let clusterId = 0;

        const regionQuery = (idx) => {
            const neighbors = [];
            for (let i = 0; i < n; i++) {
                if (this._euclidean(points[idx], points[i]) <= eps) {
                    neighbors.push(i);
                }
            }
            return neighbors;
        };

        for (let i = 0; i < n; i++) {
            if (labels[i] !== -1) continue;

            const neighbors = regionQuery(i);

            if (neighbors.length < minPts) {
                labels[i] = 0; // Noise
                continue;
            }

            // Start new cluster
            clusterId++;
            labels[i] = clusterId;

            // Expand cluster
            const seeds = [...neighbors.filter(j => j !== i)];
            let seedIdx = 0;

            while (seedIdx < seeds.length) {
                const q = seeds[seedIdx++];

                if (labels[q] === 0) {
                    labels[q] = clusterId; // Change noise to border
                }
                if (labels[q] !== -1) continue;

                labels[q] = clusterId;
                const qNeighbors = regionQuery(q);

                if (qNeighbors.length >= minPts) {
                    for (const neighbor of qNeighbors) {
                        if (labels[neighbor] === -1 || labels[neighbor] === 0) {
                            if (!seeds.includes(neighbor)) {
                                seeds.push(neighbor);
                            }
                        }
                    }
                }
            }
        }

        return labels;
    },

    /**
     * K-Medoids (PAM): Partitioning Around Medoids
     * More robust to outliers than K-Means
     */
    kmedoids: function(points, k, maxIter = 100) {
        const n = points.length;
        const D = this._distanceMatrix(points);

        // Initialize medoids randomly
        let medoids = [];
        const available = new Set(Array.from({ length: n }, (_, i) => i));
        for (let i = 0; i < k; i++) {
            const arr = Array.from(available);
            const idx = arr[Math.floor(Math.random() * arr.length)];
            medoids.push(idx);
            available.delete(idx);
        }

        let labels = this._assignToMedoids(D, medoids);
        let cost = this._medoidsCost(D, labels, medoids);

        for (let iter = 0; iter < maxIter; iter++) {
            let improved = false;

            // Try swapping each medoid with each non-medoid
            for (let m = 0; m < k; m++) {
                for (let o = 0; o < n; o++) {
                    if (medoids.includes(o)) continue;

                    const newMedoids = [...medoids];
                    newMedoids[m] = o;
                    const newLabels = this._assignToMedoids(D, newMedoids);
                    const newCost = this._medoidsCost(D, newLabels, newMedoids);

                    if (newCost < cost) {
                        medoids = newMedoids;
                        labels = newLabels;
                        cost = newCost;
                        improved = true;
                    }
                }
            }

            if (!improved) break;
        }

        return { labels, medoids, cost };
    },

    _assignToMedoids: function(D, medoids) {
        const n = D.length;
        return Array(n).fill(0).map((_, i) => {
            let minDist = Infinity, label = 0;
            for (let m = 0; m < medoids.length; m++) {
                if (D[i][medoids[m]] < minDist) {
                    minDist = D[i][medoids[m]];
                    label = m;
                }
            }
            return label;
        });
    },

    _medoidsCost: function(D, labels, medoids) {
        let cost = 0;
        for (let i = 0; i < labels.length; i++) {
            cost += D[i][medoids[labels[i]]];
        }
        return cost;
    },

    /**
     * K-Means Clustering
     */
    kmeans: function(points, k, maxIter = 100, tolerance = 1e-4) {
        const n = points.length;
        const dim = points[0].length;

        // Initialize centroids using k-means++
        const centroids = this._kmeanspp(points, k);
        let labels = Array(n).fill(0);

        for (let iter = 0; iter < maxIter; iter++) {
            // Assign points to nearest centroid
            const newLabels = points.map(p => {
                let minDist = Infinity, label = 0;
                for (let c = 0; c < k; c++) {
                    const dist = this._euclidean(p, centroids[c]);
                    if (dist < minDist) {
                        minDist = dist;
                        label = c;
                    }
                }
                return label;
            });

            // Update centroids
            const counts = Array(k).fill(0);
            const sums = Array.from({ length: k }, () => Array(dim).fill(0));

            for (let i = 0; i < n; i++) {
                const c = newLabels[i];
                counts[c]++;
                for (let d = 0; d < dim; d++) {
                    sums[c][d] += points[i][d];
                }
            }

            let maxShift = 0;
            for (let c = 0; c < k; c++) {
                if (counts[c] > 0) {
                    for (let d = 0; d < dim; d++) {
                        const newVal = sums[c][d] / counts[c];
                        maxShift = Math.max(maxShift, Math.abs(centroids[c][d] - newVal));
                        centroids[c][d] = newVal;
                    }
                }
            }

            labels = newLabels;
            if (maxShift < tolerance) break;
        }

        return { labels, centroids };
    },

    _kmeanspp: function(points, k) {
        const n = points.length;
        const centroids = [];
        
        // First centroid: random
        centroids.push([...points[Math.floor(Math.random() * n)]]);

        // Remaining centroids: weighted by distance squared
        for (let c = 1; c < k; c++) {
            const distances = points.map(p => {
                let minDist = Infinity;
                for (const centroid of centroids) {
                    minDist = Math.min(minDist, this._euclidean(p, centroid));
                }
                return minDist * minDist;
            });

            const totalDist = distances.reduce((a, b) => a + b, 0);
            let r = Math.random() * totalDist;
            
            for (let i = 0; i < n; i++) {
                r -= distances[i];
                if (r <= 0) {
                    centroids.push([...points[i]]);
                    break;
                }
            }
        }

        return centroids;
    },

    /**
     * Mean Shift Clustering
     */
    meanShift: function(points, bandwidth, maxIter = 100, tolerance = 1e-4) {
        const n = points.length;
        const dim = points[0].length;
        let modes = points.map(p => [...p]);

        for (let iter = 0; iter < maxIter; iter++) {
            let maxShift = 0;

            for (let i = 0; i < n; i++) {
                // Calculate mean shift vector
                let sumWeight = 0;
                const newMode = Array(dim).fill(0);

                for (let j = 0; j < n; j++) {
                    const dist = this._euclidean(modes[i], points[j]);
                    const weight = this._gaussianKernel(dist, bandwidth);
                    sumWeight += weight;
                    for (let d = 0; d < dim; d++) {
                        newMode[d] += weight * points[j][d];
                    }
                }

                if (sumWeight > 0) {
                    for (let d = 0; d < dim; d++) {
                        newMode[d] /= sumWeight;
                    }
                }

                maxShift = Math.max(maxShift, this._euclidean(modes[i], newMode));
                modes[i] = newMode;
            }

            if (maxShift < tolerance) break;
        }

        // Cluster modes that are close together
        return this._clusterModes(modes, bandwidth / 2);
    },

    _gaussianKernel: function(dist, bandwidth) {
        return Math.exp(-(dist * dist) / (2 * bandwidth * bandwidth));
    },

    _clusterModes: function(modes, threshold) {
        const n = modes.length;
        const labels = Array(n).fill(-1);
        let clusterId = 0;

        for (let i = 0; i < n; i++) {
            if (labels[i] !== -1) continue;
            labels[i] = clusterId;

            for (let j = i + 1; j < n; j++) {
                if (labels[j] === -1 && this._euclidean(modes[i], modes[j]) < threshold) {
                    labels[j] = clusterId;
                }
            }
            clusterId++;
        }

        return labels;
    },

    /**
     * Hierarchical Agglomerative Clustering
     */
    hierarchical: function(points, numClusters, linkage = 'average') {
        const n = points.length;
        const D = this._distanceMatrix(points);

        // Each point starts as its own cluster
        let clusters = Array.from({ length: n }, (_, i) => [i]);
        const mergeHistory = [];

        while (clusters.length > numClusters) {
            // Find closest pair of clusters
            let minDist = Infinity, minI = 0, minJ = 1;

            for (let i = 0; i < clusters.length; i++) {
                for (let j = i + 1; j < clusters.length; j++) {
                    const dist = this._clusterDistance(clusters[i], clusters[j], D, linkage);
                    if (dist < minDist) {
                        minDist = dist;
                        minI = i;
                        minJ = j;
                    }
                }
            }

            // Merge clusters
            mergeHistory.push({ i: minI, j: minJ, distance: minDist });
            clusters[minI] = [...clusters[minI], ...clusters[minJ]];
            clusters.splice(minJ, 1);
        }

        // Create labels
        const labels = Array(n).fill(0);
        for (let c = 0; c < clusters.length; c++) {
            for (const idx of clusters[c]) {
                labels[idx] = c;
            }
        }

        return { labels, mergeHistory };
    },

    _clusterDistance: function(c1, c2, D, linkage) {
        const distances = [];
        for (const i of c1) {
            for (const j of c2) {
                distances.push(D[i][j]);
            }
        }

        switch (linkage) {
            case 'single': return Math.min(...distances);
            case 'complete': return Math.max(...distances);
            case 'average': return distances.reduce((a, b) => a + b, 0) / distances.length;
            default: return distances.reduce((a, b) => a + b, 0) / distances.length;
        }
    },

    /**
     * Spectral Clustering
     */
    spectralClustering: function(points, k, sigma = 1.0) {
        const n = points.length;

        // Build similarity matrix (RBF kernel)
        const W = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dist = this._euclidean(points[i], points[j]);
                const sim = Math.exp(-(dist * dist) / (2 * sigma * sigma));
                W[i][j] = W[j][i] = sim;
            }
        }

        // Build degree matrix and Laplacian
        const D = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            D[i][i] = W[i].reduce((a, b) => a + b, 0);
        }

        // Normalized Laplacian: L = D^(-1/2) (D - W) D^(-1/2)
        const L = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    L[i][j] = 1;
                } else if (D[i][i] > 0 && D[j][j] > 0) {
                    L[i][j] = -W[i][j] / Math.sqrt(D[i][i] * D[j][j]);
                }
            }
        }

        // Find k smallest eigenvectors (using power iteration approximation)
        const eigenvectors = this._approximateEigenvectors(L, k);

        // Normalize rows
        const normalized = eigenvectors.map(row => {
            const norm = Math.sqrt(row.reduce((s, v) => s + v * v, 0)) || 1;
            return row.map(v => v / norm);
        });

        // K-means on the embedded space
        return this.kmeans(normalized, k);
    },

    _approximateEigenvectors: function(L, k) {
        const n = L.length;
        // Simplified: random initialization, power iteration
        const V = Array.from({ length: n }, () => 
            Array.from({ length: k }, () => Math.random() - 0.5));

        // QR iteration (simplified)
        for (let iter = 0; iter < 50; iter++) {
            // Multiply by (I - L) to find smallest eigenvalues
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < k; j++) {
                    let sum = V[i][j];
                    for (let m = 0; m < n; m++) {
                        sum -= L[i][m] * V[m][j] * 0.1;
                    }
                    V[i][j] = sum;
                }
            }

            // Orthogonalize (Gram-Schmidt)
            for (let j = 0; j < k; j++) {
                for (let p = 0; p < j; p++) {
                    let dot = 0, norm = 0;
                    for (let i = 0; i < n; i++) {
                        dot += V[i][j] * V[i][p];
                        norm += V[i][p] * V[i][p];
                    }
                    for (let i = 0; i < n; i++) {
                        V[i][j] -= (dot / norm) * V[i][p];
                    }
                }
                // Normalize
                let norm = 0;
                for (let i = 0; i < n; i++) norm += V[i][j] * V[i][j];
                norm = Math.sqrt(norm) || 1;
                for (let i = 0; i < n; i++) V[i][j] /= norm;
            }
        }

        return V;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 16: PRISM_DIMENSIONALITY_ENGINE
// t-SNE, PCA, UMAP (simplified), LDA
// Source: Stanford CS 229, van der Maaten 2008
// ═══════════════════════════════════════════════════════════════════════════════

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
};

// Gateway registrations
if (typeof PRISM_GATEWAY !== 'undefined') {
    // Clustering
    PRISM_GATEWAY.register('ai.cluster.dbscan', 'PRISM_CLUSTERING_ENGINE.dbscan');
    PRISM_GATEWAY.register('ai.cluster.kmedoids', 'PRISM_CLUSTERING_ENGINE.kmedoids');
    PRISM_GATEWAY.register('ai.cluster.kmeans', 'PRISM_CLUSTERING_ENGINE.kmeans');
    PRISM_GATEWAY.register('ai.cluster.meanshift', 'PRISM_CLUSTERING_ENGINE.meanShift');
    PRISM_GATEWAY.register('ai.cluster.hierarchical', 'PRISM_CLUSTERING_ENGINE.hierarchical');
    PRISM_GATEWAY.register('ai.cluster.spectral', 'PRISM_CLUSTERING_ENGINE.spectralClustering');

    // Dimensionality Reduction
    PRISM_GATEWAY.register('ai.dim.tsne', 'PRISM_DIMENSIONALITY_ENGINE.tsne');
    PRISM_GATEWAY.register('ai.dim.pca', 'PRISM_DIMENSIONALITY_ENGINE.pca');
    PRISM_GATEWAY.register('ai.dim.ipca', 'PRISM_DIMENSIONALITY_ENGINE.incrementalPca');
}

console.log('[PRISM Session 1 Ultimate AI/ML Part 4] Modules 15-16 loaded');
console.log('  - PRISM_CLUSTERING_ENGINE (DBSCAN, K-Medoids, K-Means, MeanShift, Hierarchical, Spectral)');
console.log('  - PRISM_DIMENSIONALITY_ENGINE (t-SNE, PCA, Incremental PCA)');
/**
 * PRISM SESSION 1 - ULTIMATE AI/ML ENHANCEMENT - PART 5
 * Model Compression & Explainable AI
 * Sources: MIT 6.036, Stanford CS 230, Google Research
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 17: PRISM_MODEL_COMPRESSION_ENGINE
// Quantization, Pruning, Knowledge Distillation
// Source: MIT 6.036, Google Research
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_MODEL_COMPRESSION_ENGINE = {
    name: 'PRISM_MODEL_COMPRESSION_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Google Research',

    // ─────────────────────────────────────────────────────────────────────────
    // QUANTIZATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Uniform Quantization to INT8
     */
    quantizeToInt8: function(weights, perChannel = false) {
        if (perChannel && Array.isArray(weights[0])) {
            // Per-channel quantization
            return {
                quantized: weights.map(channel => {
                    const { quantized, scale, zeroPoint } = this._quantizeArray(channel, 8);
                    return quantized;
                }),
                scales: weights.map(channel => {
                    const min = Math.min(...this._flatten(channel));
                    const max = Math.max(...this._flatten(channel));
                    return (max - min) / 255;
                }),
                zeroPoints: weights.map(channel => {
                    const min = Math.min(...this._flatten(channel));
                    return Math.round(-min / ((Math.max(...this._flatten(channel)) - min) / 255));
                })
            };
        }

        return this._quantizeArray(weights, 8);
    },

    /**
     * Quantize to arbitrary bit width
     */
    quantize: function(weights, bits = 8) {
        return this._quantizeArray(weights, bits);
    },

    _quantizeArray: function(arr, bits) {
        const flat = this._flatten(arr);
        const min = Math.min(...flat);
        const max = Math.max(...flat);
        const levels = (1 << bits) - 1;
        const scale = (max - min) / levels || 1;
        const zeroPoint = Math.round(-min / scale);

        const quantize = (x) => Math.round((x - min) / scale);
        const quantized = this._mapNested(arr, quantize);

        return { quantized, scale, zeroPoint, min, max, bits };
    },

    /**
     * Dequantize back to float
     */
    dequantize: function(quantized, scale, zeroPoint) {
        return this._mapNested(quantized, x => (x - zeroPoint) * scale);
    },

    /**
     * Dynamic Quantization (quantize at inference time)
     */
    dynamicQuantize: function(weights) {
        const flat = this._flatten(weights);
        const absMax = Math.max(...flat.map(Math.abs));
        const scale = absMax / 127;

        return {
            quantized: this._mapNested(weights, x => Math.round(x / scale)),
            scale
        };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PRUNING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Magnitude-based Pruning
     */
    magnitudePrune: function(weights, sparsity = 0.5) {
        const flat = this._flatten(weights);
        const magnitudes = flat.map(Math.abs).sort((a, b) => a - b);
        const threshold = magnitudes[Math.floor(magnitudes.length * sparsity)];

        const mask = this._mapNested(weights, w => Math.abs(w) >= threshold ? 1 : 0);
        const pruned = this._mapNested(weights, w => Math.abs(w) >= threshold ? w : 0);

        const prunedCount = flat.filter(w => Math.abs(w) < threshold).length;

        return {
            pruned,
            mask,
            threshold,
            actualSparsity: prunedCount / flat.length
        };
    },

    /**
     * Structured Pruning (prune entire neurons/channels)
     */
    structuredPrune: function(weights, sparsity = 0.5, dim = 0) {
        if (!Array.isArray(weights[0])) {
            return this.magnitudePrune(weights, sparsity);
        }

        // Calculate importance of each row/column
        const importance = dim === 0
            ? weights.map(row => this._l2Norm(row))
            : weights[0].map((_, j) => this._l2Norm(weights.map(row => row[j])));

        const sorted = [...importance].sort((a, b) => a - b);
        const threshold = sorted[Math.floor(sorted.length * sparsity)];

        const keepIndices = importance
            .map((imp, i) => imp >= threshold ? i : -1)
            .filter(i => i !== -1);

        let pruned;
        if (dim === 0) {
            pruned = keepIndices.map(i => weights[i]);
        } else {
            pruned = weights.map(row => keepIndices.map(j => row[j]));
        }

        return {
            pruned,
            keepIndices,
            prunedIndices: importance.map((_, i) => i).filter(i => !keepIndices.includes(i)),
            threshold
        };
    },

    /**
     * Gradual Magnitude Pruning (during training)
     */
    createGradualPruner: function(initialSparsity, finalSparsity, startStep, endStep) {
        return {
            initialSparsity,
            finalSparsity,
            startStep,
            endStep,

            getSparsity: function(step) {
                if (step < this.startStep) return this.initialSparsity;
                if (step > this.endStep) return this.finalSparsity;

                const progress = (step - this.startStep) / (this.endStep - this.startStep);
                // Cubic sparsity schedule
                return this.finalSparsity + (this.initialSparsity - this.finalSparsity) *
                       Math.pow(1 - progress, 3);
            },

            prune: function(weights, step) {
                const sparsity = this.getSparsity(step);
                return PRISM_MODEL_COMPRESSION_ENGINE.magnitudePrune(weights, sparsity);
            }
        };
    },

    /**
     * Lottery Ticket Hypothesis: Find winning tickets
     */
    findWinningTicket: function(initialWeights, trainedWeights, sparsity = 0.2) {
        // Prune based on trained magnitudes
        const { mask } = this.magnitudePrune(trainedWeights, sparsity);

        // Reset to initial values but keep mask
        const winningTicket = this._applyMask(initialWeights, mask);

        return { winningTicket, mask };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // KNOWLEDGE DISTILLATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Compute Distillation Loss
     * L = α * L_hard + (1-α) * T² * KL(soft_teacher || soft_student)
     */
    distillationLoss: function(studentLogits, teacherLogits, labels, temperature = 4.0, alpha = 0.5) {
        // Soft targets from teacher
        const softTeacher = this._softmaxWithTemperature(teacherLogits, temperature);
        const softStudent = this._softmaxWithTemperature(studentLogits, temperature);

        // KL divergence for soft targets
        let klLoss = 0;
        for (let i = 0; i < softTeacher.length; i++) {
            if (softTeacher[i] > 1e-10) {
                klLoss += softTeacher[i] * Math.log(softTeacher[i] / (softStudent[i] + 1e-10));
            }
        }

        // Cross-entropy for hard targets
        const hardStudent = this._softmax(studentLogits);
        let ceLoss = 0;
        for (let i = 0; i < labels.length; i++) {
            if (labels[i] > 0) {
                ceLoss -= labels[i] * Math.log(hardStudent[i] + 1e-10);
            }
        }

        // Combined loss
        const totalLoss = alpha * ceLoss + (1 - alpha) * temperature * temperature * klLoss;

        return { totalLoss, klLoss, ceLoss };
    },

    /**
     * Feature Distillation (intermediate layers)
     */
    featureDistillationLoss: function(studentFeatures, teacherFeatures) {
        // MSE loss between feature maps
        let loss = 0;
        for (let i = 0; i < studentFeatures.length; i++) {
            loss += Math.pow(studentFeatures[i] - teacherFeatures[i], 2);
        }
        return loss / studentFeatures.length;
    },

    /**
     * Attention Transfer
     */
    attentionTransferLoss: function(studentAttention, teacherAttention) {
        // Normalize attention maps
        const normStudent = this._normalizeAttention(studentAttention);
        const normTeacher = this._normalizeAttention(teacherAttention);

        // MSE between normalized attention
        let loss = 0;
        for (let i = 0; i < normStudent.length; i++) {
            loss += Math.pow(normStudent[i] - normTeacher[i], 2);
        }
        return loss / normStudent.length;
    },

    _normalizeAttention: function(attention) {
        const sum = attention.reduce((a, b) => a + Math.abs(b), 0) || 1;
        return attention.map(a => Math.abs(a) / sum);
    },

    // Helper functions
    _flatten: function(arr) {
        if (!Array.isArray(arr)) return [arr];
        return arr.reduce((acc, item) => acc.concat(this._flatten(item)), []);
    },

    _mapNested: function(arr, fn) {
        if (!Array.isArray(arr)) return fn(arr);
        return arr.map(item => this._mapNested(item, fn));
    },

    _applyMask: function(weights, mask) {
        if (!Array.isArray(weights)) return weights * mask;
        return weights.map((w, i) => this._applyMask(w, mask[i]));
    },

    _l2Norm: function(arr) {
        const flat = this._flatten(arr);
        return Math.sqrt(flat.reduce((s, x) => s + x * x, 0));
    },

    _softmax: function(logits) {
        const max = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },

    _softmaxWithTemperature: function(logits, T) {
        const scaled = logits.map(l => l / T);
        return this._softmax(scaled);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 18: PRISM_XAI_ENGINE
// Explainable AI: LIME, SHAP, Saliency, Integrated Gradients
// Source: Stanford CS 230, MIT 6.036, Ribeiro 2016 (LIME)
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_XAI_ENGINE = {
    name: 'PRISM_XAI_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 230, Ribeiro 2016',

    /**
     * Gradient Saliency
     * Compute |∂y/∂x| to highlight important input features
     */
    gradientSaliency: function(model, input, targetClass) {
        const epsilon = 1e-5;
        const saliency = [];

        // Numerical gradient approximation
        for (let i = 0; i < input.length; i++) {
            const inputPlus = [...input];
            const inputMinus = [...input];
            inputPlus[i] += epsilon;
            inputMinus[i] -= epsilon;

            const outputPlus = model(inputPlus);
            const outputMinus = model(inputMinus);

            const gradient = (outputPlus[targetClass] - outputMinus[targetClass]) / (2 * epsilon);
            saliency.push(Math.abs(gradient));
        }

        // Normalize
        const maxSal = Math.max(...saliency) || 1;
        return saliency.map(s => s / maxSal);
    },

    /**
     * Integrated Gradients
     * More principled attribution method
     */
    integratedGradients: function(model, input, baseline = null, steps = 50, targetClass = 0) {
        baseline = baseline || input.map(() => 0);
        const gradients = input.map(() => 0);
        const epsilon = 1e-5;

        for (let step = 0; step <= steps; step++) {
            const alpha = step / steps;

            // Interpolated input
            const interpolated = input.map((x, i) => baseline[i] + alpha * (x - baseline[i]));

            // Compute gradient at this point
            for (let i = 0; i < input.length; i++) {
                const interpPlus = [...interpolated];
                const interpMinus = [...interpolated];
                interpPlus[i] += epsilon;
                interpMinus[i] -= epsilon;

                const outPlus = model(interpPlus);
                const outMinus = model(interpMinus);

                const grad = (outPlus[targetClass] - outMinus[targetClass]) / (2 * epsilon);
                gradients[i] += grad;
            }
        }

        // Average gradients and multiply by (input - baseline)
        return gradients.map((g, i) => (g / (steps + 1)) * (input[i] - baseline[i]));
    },

    /**
     * LIME: Local Interpretable Model-agnostic Explanations
     */
    lime: function(model, input, numSamples = 1000, numFeatures = 10) {
        const n = input.length;
        const samples = [];
        const weights = [];
        const predictions = [];

        // Generate perturbed samples
        for (let i = 0; i < numSamples; i++) {
            // Random binary mask
            const mask = input.map(() => Math.random() > 0.5 ? 1 : 0);
            
            // Perturbed sample (zeros where mask is 0)
            const perturbed = input.map((x, j) => mask[j] ? x : 0);
            samples.push(mask);

            // Get model prediction
            const pred = model(perturbed);
            predictions.push(pred);

            // Compute weight based on distance to original
            const numDiff = mask.reduce((s, m) => s + (1 - m), 0);
            const distance = Math.sqrt(numDiff);
            const weight = Math.exp(-distance * distance / 2);
            weights.push(weight);
        }

        // Fit weighted linear model using least squares
        // Simplified: compute feature importance as weighted correlation
        const importance = [];
        const predMean = predictions.reduce((s, p) => s + p[0], 0) / numSamples;

        for (let j = 0; j < n; j++) {
            let weightedCov = 0, weightedVar = 0;
            const featureMean = samples.reduce((s, sam, i) => s + sam[j] * weights[i], 0) /
                               weights.reduce((a, b) => a + b, 0);

            for (let i = 0; i < numSamples; i++) {
                const featureDiff = samples[i][j] - featureMean;
                const predDiff = predictions[i][0] - predMean;
                weightedCov += weights[i] * featureDiff * predDiff;
                weightedVar += weights[i] * featureDiff * featureDiff;
            }

            importance.push(weightedVar > 0 ? weightedCov / weightedVar : 0);
        }

        // Sort and get top features
        const indexed = importance.map((imp, i) => ({ feature: i, importance: imp }));
        indexed.sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance));

        return {
            importance,
            topFeatures: indexed.slice(0, numFeatures)
        };
    },

    /**
     * SHAP: SHapley Additive exPlanations (Kernel SHAP approximation)
     */
    kernelShap: function(model, input, baseline = null, numSamples = 100) {
        const n = input.length;
        baseline = baseline || input.map(() => 0);

        // Generate coalition samples
        const coalitions = [];
        const predictions = [];
        const weights = [];

        for (let i = 0; i < numSamples; i++) {
            // Random coalition (subset of features)
            const coalition = input.map(() => Math.random() > 0.5);
            const numPresent = coalition.filter(c => c).length;

            // Skip trivial coalitions
            if (numPresent === 0 || numPresent === n) continue;

            // Create sample: use input for present features, baseline for absent
            const sample = input.map((x, j) => coalition[j] ? x : baseline[j]);
            
            coalitions.push(coalition);
            predictions.push(model(sample));

            // Shapley kernel weight
            const weight = (n - 1) / (this._binomial(n, numPresent) * numPresent * (n - numPresent));
            weights.push(weight);
        }

        // Compute SHAP values using weighted regression
        const shapValues = Array(n).fill(0);
        
        for (let j = 0; j < n; j++) {
            // Compute contribution of feature j
            let sumWith = 0, countWith = 0;
            let sumWithout = 0, countWithout = 0;

            for (let i = 0; i < coalitions.length; i++) {
                if (coalitions[i][j]) {
                    sumWith += predictions[i][0] * weights[i];
                    countWith += weights[i];
                } else {
                    sumWithout += predictions[i][0] * weights[i];
                    countWithout += weights[i];
                }
            }

            const avgWith = countWith > 0 ? sumWith / countWith : 0;
            const avgWithout = countWithout > 0 ? sumWithout / countWithout : 0;
            shapValues[j] = avgWith - avgWithout;
        }

        return { shapValues, baseValue: model(baseline)[0] };
    },

    /**
     * Attention Visualization
     * Extract and visualize attention weights
     */
    visualizeAttention: function(attentionWeights, inputTokens) {
        // Normalize attention for visualization
        const normalized = attentionWeights.map(row => {
            const sum = row.reduce((a, b) => a + b, 0) || 1;
            return row.map(w => w / sum);
        });

        // Create visualization data
        const visualization = [];
        for (let i = 0; i < inputTokens.length; i++) {
            for (let j = 0; j < inputTokens.length; j++) {
                visualization.push({
                    source: inputTokens[i],
                    target: inputTokens[j],
                    weight: normalized[i][j]
                });
            }
        }

        return {
            normalized,
            visualization,
            maxAttention: inputTokens.map((_, i) => {
                const row = normalized[i];
                const maxIdx = row.indexOf(Math.max(...row));
                return { token: inputTokens[maxIdx], weight: row[maxIdx] };
            })
        };
    },

    /**
     * Feature Importance via Permutation
     */
    permutationImportance: function(model, X, y, numPermutations = 10) {
        const n = X.length;
        const nFeatures = X[0].length;
        
        // Baseline score
        const baselinePreds = X.map(x => model(x));
        const baselineScore = this._accuracy(baselinePreds, y);

        const importance = [];

        for (let f = 0; f < nFeatures; f++) {
            let scoreSum = 0;

            for (let p = 0; p < numPermutations; p++) {
                // Create permuted dataset
                const permuted = X.map(x => [...x]);
                
                // Shuffle feature f
                const permutation = this._shuffle([...Array(n).keys()]);
                for (let i = 0; i < n; i++) {
                    permuted[i][f] = X[permutation[i]][f];
                }

                const permPreds = permuted.map(x => model(x));
                const permScore = this._accuracy(permPreds, y);
                scoreSum += baselineScore - permScore;
            }

            importance.push(scoreSum / numPermutations);
        }

        return { importance, baselineScore };
    },

    /**
     * Counterfactual Explanations
     * Find minimal changes to flip prediction
     */
    counterfactual: function(model, input, targetClass, maxIter = 100, stepSize = 0.1) {
        let current = [...input];
        const originalPred = model(input);
        const originalClass = originalPred.indexOf(Math.max(...originalPred));

        if (originalClass === targetClass) {
            return { found: true, counterfactual: input, changes: [] };
        }

        for (let iter = 0; iter < maxIter; iter++) {
            const pred = model(current);
            const currentClass = pred.indexOf(Math.max(...pred));

            if (currentClass === targetClass) {
                const changes = input.map((orig, i) => ({
                    feature: i,
                    original: orig,
                    counterfactual: current[i],
                    change: current[i] - orig
                })).filter(c => Math.abs(c.change) > 1e-6);

                return { found: true, counterfactual: current, changes };
            }

            // Gradient-based step toward target class
            const epsilon = 1e-5;
            for (let i = 0; i < current.length; i++) {
                const plus = [...current];
                const minus = [...current];
                plus[i] += epsilon;
                minus[i] -= epsilon;

                const gradPlus = model(plus)[targetClass];
                const gradMinus = model(minus)[targetClass];
                const gradient = (gradPlus - gradMinus) / (2 * epsilon);

                current[i] += stepSize * gradient;
            }
        }

        return { found: false, counterfactual: current, changes: [] };
    },

    // Helper functions
    _binomial: function(n, k) {
        if (k > n - k) k = n - k;
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    },

    _shuffle: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    _accuracy: function(predictions, labels) {
        let correct = 0;
        for (let i = 0; i < predictions.length; i++) {
            const predClass = predictions[i].indexOf(Math.max(...predictions[i]));
            if (predClass === labels[i]) correct++;
        }
        return correct / predictions.length;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 19: PRISM_LOSS_FUNCTIONS_ENGINE
// Comprehensive Loss Functions
// Source: MIT 6.036, Stanford CS 231N
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_LOSS_FUNCTIONS_ENGINE = {
    name: 'PRISM_LOSS_FUNCTIONS_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * Mean Squared Error
     */
    mse: function(predictions, targets) {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            sum += Math.pow(predictions[i] - targets[i], 2);
        }
        return sum / predictions.length;
    },

    /**
     * Mean Absolute Error
     */
    mae: function(predictions, targets) {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            sum += Math.abs(predictions[i] - targets[i]);
        }
        return sum / predictions.length;
    },

    /**
     * Huber Loss (smooth L1)
     */
    huber: function(predictions, targets, delta = 1.0) {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            const error = Math.abs(predictions[i] - targets[i]);
            if (error <= delta) {
                sum += 0.5 * error * error;
            } else {
                sum += delta * (error - 0.5 * delta);
            }
        }
        return sum / predictions.length;
    },

    /**
     * Cross-Entropy Loss
     */
    crossEntropy: function(predictions, targets, epsilon = 1e-15) {
        let loss = 0;
        for (let i = 0; i < predictions.length; i++) {
            const p = Math.max(epsilon, Math.min(1 - epsilon, predictions[i]));
            loss -= targets[i] * Math.log(p) + (1 - targets[i]) * Math.log(1 - p);
        }
        return loss / predictions.length;
    },

    /**
     * Categorical Cross-Entropy (for multi-class)
     */
    categoricalCrossEntropy: function(predictions, targetIndex, epsilon = 1e-15) {
        const p = Math.max(epsilon, Math.min(1 - epsilon, predictions[targetIndex]));
        return -Math.log(p);
    },

    /**
     * Focal Loss (for imbalanced data)
     */
    focalLoss: function(predictions, targets, gamma = 2.0, alpha = 0.25, epsilon = 1e-15) {
        let loss = 0;
        for (let i = 0; i < predictions.length; i++) {
            const p = Math.max(epsilon, Math.min(1 - epsilon, predictions[i]));
            const pt = targets[i] === 1 ? p : 1 - p;
            const alphat = targets[i] === 1 ? alpha : 1 - alpha;
            loss -= alphat * Math.pow(1 - pt, gamma) * Math.log(pt);
        }
        return loss / predictions.length;
    },

    /**
     * Hinge Loss (for SVM)
     */
    hingeLoss: function(predictions, targets, margin = 1.0) {
        let loss = 0;
        for (let i = 0; i < predictions.length; i++) {
            // targets should be -1 or 1
            loss += Math.max(0, margin - targets[i] * predictions[i]);
        }
        return loss / predictions.length;
    },

    /**
     * Contrastive Loss (for siamese networks)
     */
    contrastiveLoss: function(distance, label, margin = 1.0) {
        // label: 1 if same class, 0 if different
        if (label === 1) {
            return distance * distance;
        } else {
            return Math.max(0, margin - distance) ** 2;
        }
    },

    /**
     * Triplet Loss (for metric learning)
     */
    tripletLoss: function(anchor, positive, negative, margin = 1.0) {
        const distAP = this._euclidean(anchor, positive);
        const distAN = this._euclidean(anchor, negative);
        return Math.max(0, distAP - distAN + margin);
    },

    /**
     * KL Divergence
     */
    klDivergence: function(p, q, epsilon = 1e-15) {
        let divergence = 0;
        for (let i = 0; i < p.length; i++) {
            const pi = Math.max(epsilon, p[i]);
            const qi = Math.max(epsilon, q[i]);
            divergence += pi * Math.log(pi / qi);
        }
        return divergence;
    },

    /**
     * Jensen-Shannon Divergence
     */
    jsDivergence: function(p, q) {
        const m = p.map((pi, i) => (pi + q[i]) / 2);
        return (this.klDivergence(p, m) + this.klDivergence(q, m)) / 2;
    },

    _euclidean: function(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += (a[i] - b[i]) ** 2;
        }
        return Math.sqrt(sum);
    }
};

// Gateway registrations
if (typeof PRISM_GATEWAY !== 'undefined') {
    // Model Compression
    PRISM_GATEWAY.register('ai.compress.quantize', 'PRISM_MODEL_COMPRESSION_ENGINE.quantize');
    PRISM_GATEWAY.register('ai.compress.quantize_int8', 'PRISM_MODEL_COMPRESSION_ENGINE.quantizeToInt8');
    PRISM_GATEWAY.register('ai.compress.dequantize', 'PRISM_MODEL_COMPRESSION_ENGINE.dequantize');
    PRISM_GATEWAY.register('ai.compress.prune', 'PRISM_MODEL_COMPRESSION_ENGINE.magnitudePrune');
    PRISM_GATEWAY.register('ai.compress.structured_prune', 'PRISM_MODEL_COMPRESSION_ENGINE.structuredPrune');
    PRISM_GATEWAY.register('ai.compress.gradual_pruner', 'PRISM_MODEL_COMPRESSION_ENGINE.createGradualPruner');
    PRISM_GATEWAY.register('ai.compress.lottery_ticket', 'PRISM_MODEL_COMPRESSION_ENGINE.findWinningTicket');
    PRISM_GATEWAY.register('ai.compress.distill_loss', 'PRISM_MODEL_COMPRESSION_ENGINE.distillationLoss');
    PRISM_GATEWAY.register('ai.compress.feature_distill', 'PRISM_MODEL_COMPRESSION_ENGINE.featureDistillationLoss');

    // Explainable AI
    PRISM_GATEWAY.register('ai.xai.saliency', 'PRISM_XAI_ENGINE.gradientSaliency');
    PRISM_GATEWAY.register('ai.xai.integrated_gradients', 'PRISM_XAI_ENGINE.integratedGradients');
    PRISM_GATEWAY.register('ai.xai.lime', 'PRISM_XAI_ENGINE.lime');
    PRISM_GATEWAY.register('ai.xai.shap', 'PRISM_XAI_ENGINE.kernelShap');
    PRISM_GATEWAY.register('ai.xai.attention_viz', 'PRISM_XAI_ENGINE.visualizeAttention');
    PRISM_GATEWAY.register('ai.xai.permutation_importance', 'PRISM_XAI_ENGINE.permutationImportance');
    PRISM_GATEWAY.register('ai.xai.counterfactual', 'PRISM_XAI_ENGINE.counterfactual');

    // Loss Functions
    PRISM_GATEWAY.register('ai.loss.mse', 'PRISM_LOSS_FUNCTIONS_ENGINE.mse');
    PRISM_GATEWAY.register('ai.loss.mae', 'PRISM_LOSS_FUNCTIONS_ENGINE.mae');
    PRISM_GATEWAY.register('ai.loss.huber', 'PRISM_LOSS_FUNCTIONS_ENGINE.huber');
    PRISM_GATEWAY.register('ai.loss.cross_entropy', 'PRISM_LOSS_FUNCTIONS_ENGINE.crossEntropy');
    PRISM_GATEWAY.register('ai.loss.focal', 'PRISM_LOSS_FUNCTIONS_ENGINE.focalLoss');
    PRISM_GATEWAY.register('ai.loss.hinge', 'PRISM_LOSS_FUNCTIONS_ENGINE.hingeLoss');
    PRISM_GATEWAY.register('ai.loss.contrastive', 'PRISM_LOSS_FUNCTIONS_ENGINE.contrastiveLoss');
    PRISM_GATEWAY.register('ai.loss.triplet', 'PRISM_LOSS_FUNCTIONS_ENGINE.tripletLoss');
    PRISM_GATEWAY.register('ai.loss.kl', 'PRISM_LOSS_FUNCTIONS_ENGINE.klDivergence');
}

console.log('[PRISM Session 1 Ultimate AI/ML Part 5] Modules 17-19 loaded');
console.log('  - PRISM_MODEL_COMPRESSION_ENGINE (quantization, pruning, distillation)');
console.log('  - PRISM_XAI_ENGINE (LIME, SHAP, saliency, integrated gradients)');
console.log('  - PRISM_LOSS_FUNCTIONS_ENGINE (10+ loss functions)');
/**
 * PRISM SESSION 1 - ULTIMATE AI/ML ENHANCEMENT - PART 6
 * Evolutionary Algorithms & Advanced Techniques
 * Sources: MIT 6.036, Stanford CS 229, Nature-Inspired Computing
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 20: PRISM_EVOLUTIONARY_ENHANCED_ENGINE
// Enhanced PSO, ACO, Genetic Algorithms, Differential Evolution
// Source: MIT 6.036, Kennedy & Eberhart (PSO), Dorigo (ACO)
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_EVOLUTIONARY_ENHANCED_ENGINE = {
    name: 'PRISM_EVOLUTIONARY_ENHANCED_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Kennedy & Eberhart, Dorigo',

    /**
     * Enhanced Particle Swarm Optimization
     * With inertia weight decay, constriction factor, and local best
     */
    pso: function(objective, bounds, params = {}) {
        const {
            numParticles = 30,
            maxIterations = 100,
            w = 0.9,           // Initial inertia
            wMin = 0.4,        // Final inertia
            c1 = 2.05,         // Cognitive coefficient
            c2 = 2.05,         // Social coefficient
            useConstriction = true,
            topology = 'global' // 'global', 'ring', or 'vonNeumann'
        } = params;

        const dim = bounds.length;
        const phi = c1 + c2;
        const chi = useConstriction ? 2 / Math.abs(2 - phi - Math.sqrt(phi * phi - 4 * phi)) : 1;

        // Initialize particles
        const particles = [];
        for (let i = 0; i < numParticles; i++) {
            const position = bounds.map(([min, max]) => min + Math.random() * (max - min));
            const velocity = bounds.map(([min, max]) => (Math.random() - 0.5) * (max - min) * 0.1);
            const fitness = objective(position);
            particles.push({
                position,
                velocity,
                fitness,
                pBest: [...position],
                pBestFitness: fitness
            });
        }

        // Global best
        let gBest = [...particles[0].position];
        let gBestFitness = particles[0].fitness;

        for (const p of particles) {
            if (p.fitness < gBestFitness) {
                gBestFitness = p.fitness;
                gBest = [...p.position];
            }
        }

        const history = [{ iteration: 0, best: gBestFitness }];

        // Main loop
        for (let iter = 0; iter < maxIterations; iter++) {
            // Linear inertia decay
            const currentW = w - (w - wMin) * iter / maxIterations;

            for (let i = 0; i < numParticles; i++) {
                const p = particles[i];

                // Get neighborhood best based on topology
                const nBest = this._getNeighborhoodBest(particles, i, topology);

                // Update velocity
                for (let d = 0; d < dim; d++) {
                    const r1 = Math.random(), r2 = Math.random();
                    p.velocity[d] = chi * (
                        currentW * p.velocity[d] +
                        c1 * r1 * (p.pBest[d] - p.position[d]) +
                        c2 * r2 * (nBest[d] - p.position[d])
                    );

                    // Velocity clamping
                    const vMax = (bounds[d][1] - bounds[d][0]) * 0.5;
                    p.velocity[d] = Math.max(-vMax, Math.min(vMax, p.velocity[d]));
                }

                // Update position
                for (let d = 0; d < dim; d++) {
                    p.position[d] += p.velocity[d];
                    // Boundary handling (reflection)
                    if (p.position[d] < bounds[d][0]) {
                        p.position[d] = bounds[d][0];
                        p.velocity[d] *= -0.5;
                    }
                    if (p.position[d] > bounds[d][1]) {
                        p.position[d] = bounds[d][1];
                        p.velocity[d] *= -0.5;
                    }
                }

                // Evaluate
                p.fitness = objective(p.position);

                // Update personal best
                if (p.fitness < p.pBestFitness) {
                    p.pBestFitness = p.fitness;
                    p.pBest = [...p.position];
                }

                // Update global best
                if (p.fitness < gBestFitness) {
                    gBestFitness = p.fitness;
                    gBest = [...p.position];
                }
            }

            history.push({ iteration: iter + 1, best: gBestFitness });
        }

        return { bestPosition: gBest, bestFitness: gBestFitness, history };
    },

    _getNeighborhoodBest: function(particles, idx, topology) {
        if (topology === 'global') {
            let best = particles[0];
            for (const p of particles) {
                if (p.pBestFitness < best.pBestFitness) best = p;
            }
            return best.pBest;
        }

        if (topology === 'ring') {
            const n = particles.length;
            const neighbors = [
                particles[(idx - 1 + n) % n],
                particles[idx],
                particles[(idx + 1) % n]
            ];
            let best = neighbors[0];
            for (const p of neighbors) {
                if (p.pBestFitness < best.pBestFitness) best = p;
            }
            return best.pBest;
        }

        return particles[idx].pBest;
    },

    /**
     * Enhanced Ant Colony Optimization
     * For combinatorial optimization (TSP-style)
     */
    aco: function(distances, params = {}) {
        const {
            numAnts = 30,
            maxIterations = 100,
            alpha = 1.0,      // Pheromone importance
            beta = 2.0,       // Heuristic importance
            rho = 0.1,        // Evaporation rate
            Q = 100,          // Pheromone deposit factor
            elitist = true,   // Use elitist AS
            minMax = true     // Use Min-Max AS
        } = params;

        const n = distances.length;
        const pheromone = Array.from({ length: n }, () => Array(n).fill(1));
        const tauMax = 1, tauMin = 0.01;

        let bestTour = null, bestLength = Infinity;
        const history = [];

        for (let iter = 0; iter < maxIterations; iter++) {
            const antTours = [];
            const antLengths = [];

            // Construct solutions
            for (let ant = 0; ant < numAnts; ant++) {
                const tour = [Math.floor(Math.random() * n)];
                const visited = new Set(tour);

                while (tour.length < n) {
                    const current = tour[tour.length - 1];
                    const probs = [];
                    let probSum = 0;

                    for (let j = 0; j < n; j++) {
                        if (visited.has(j)) {
                            probs.push(0);
                        } else {
                            const tau = Math.pow(pheromone[current][j], alpha);
                            const eta = Math.pow(1 / distances[current][j], beta);
                            const prob = tau * eta;
                            probs.push(prob);
                            probSum += prob;
                        }
                    }

                    // Roulette wheel selection
                    let r = Math.random() * probSum;
                    let next = 0;
                    for (let j = 0; j < n; j++) {
                        r -= probs[j];
                        if (r <= 0) {
                            next = j;
                            break;
                        }
                    }

                    tour.push(next);
                    visited.add(next);
                }

                // Calculate tour length
                let length = 0;
                for (let i = 0; i < n; i++) {
                    length += distances[tour[i]][tour[(i + 1) % n]];
                }

                antTours.push(tour);
                antLengths.push(length);

                if (length < bestLength) {
                    bestLength = length;
                    bestTour = [...tour];
                }
            }

            // Pheromone evaporation
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    pheromone[i][j] *= (1 - rho);
                }
            }

            // Pheromone deposit
            for (let ant = 0; ant < numAnts; ant++) {
                const deposit = Q / antLengths[ant];
                for (let i = 0; i < n; i++) {
                    const from = antTours[ant][i];
                    const to = antTours[ant][(i + 1) % n];
                    pheromone[from][to] += deposit;
                    pheromone[to][from] += deposit;
                }
            }

            // Elitist: extra deposit on best tour
            if (elitist && bestTour) {
                const deposit = Q / bestLength;
                for (let i = 0; i < n; i++) {
                    const from = bestTour[i];
                    const to = bestTour[(i + 1) % n];
                    pheromone[from][to] += deposit;
                    pheromone[to][from] += deposit;
                }
            }

            // Min-Max bounds
            if (minMax) {
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        pheromone[i][j] = Math.max(tauMin, Math.min(tauMax, pheromone[i][j]));
                    }
                }
            }

            history.push({ iteration: iter, bestLength });
        }

        return { bestTour, bestLength, history };
    },

    /**
     * Enhanced Genetic Algorithm
     * With multiple crossover/mutation operators and elitism
     */
    geneticAlgorithm: function(fitness, genotype, params = {}) {
        const {
            populationSize = 50,
            maxGenerations = 100,
            crossoverRate = 0.8,
            mutationRate = 0.1,
            elitismRate = 0.1,
            crossoverType = 'twoPoint', // 'onePoint', 'twoPoint', 'uniform'
            selectionType = 'tournament', // 'roulette', 'tournament', 'rank'
            tournamentSize = 3
        } = params;

        const { type, length, bounds } = genotype;

        // Initialize population
        let population = [];
        for (let i = 0; i < populationSize; i++) {
            let individual;
            if (type === 'binary') {
                individual = Array.from({ length }, () => Math.random() > 0.5 ? 1 : 0);
            } else if (type === 'real') {
                individual = bounds.map(([min, max]) => min + Math.random() * (max - min));
            } else {
                individual = Array.from({ length }, () => Math.random());
            }
            population.push({
                genes: individual,
                fitness: fitness(individual)
            });
        }

        const history = [];
        let bestEver = population.reduce((best, ind) => ind.fitness > best.fitness ? ind : best);

        for (let gen = 0; gen < maxGenerations; gen++) {
            // Selection
            const selected = this._selection(population, populationSize, selectionType, tournamentSize);

            // Create new population
            const newPopulation = [];

            // Elitism
            const eliteCount = Math.floor(populationSize * elitismRate);
            const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
            for (let i = 0; i < eliteCount; i++) {
                newPopulation.push({ ...sorted[i] });
            }

            // Crossover and mutation
            while (newPopulation.length < populationSize) {
                let child1, child2;

                if (Math.random() < crossoverRate) {
                    const parent1 = selected[Math.floor(Math.random() * selected.length)];
                    const parent2 = selected[Math.floor(Math.random() * selected.length)];
                    [child1, child2] = this._crossover(parent1.genes, parent2.genes, crossoverType);
                } else {
                    child1 = [...selected[Math.floor(Math.random() * selected.length)].genes];
                    child2 = [...selected[Math.floor(Math.random() * selected.length)].genes];
                }

                // Mutation
                child1 = this._mutate(child1, mutationRate, type, bounds);
                child2 = this._mutate(child2, mutationRate, type, bounds);

                newPopulation.push({ genes: child1, fitness: fitness(child1) });
                if (newPopulation.length < populationSize) {
                    newPopulation.push({ genes: child2, fitness: fitness(child2) });
                }
            }

            population = newPopulation;

            // Track best
            const currentBest = population.reduce((best, ind) => ind.fitness > best.fitness ? ind : best);
            if (currentBest.fitness > bestEver.fitness) {
                bestEver = { ...currentBest };
            }

            history.push({
                generation: gen,
                bestFitness: currentBest.fitness,
                avgFitness: population.reduce((s, ind) => s + ind.fitness, 0) / populationSize
            });
        }

        return { best: bestEver, population, history };
    },

    _selection: function(population, count, type, tournamentSize) {
        const selected = [];

        if (type === 'tournament') {
            for (let i = 0; i < count; i++) {
                const tournament = [];
                for (let j = 0; j < tournamentSize; j++) {
                    tournament.push(population[Math.floor(Math.random() * population.length)]);
                }
                selected.push(tournament.reduce((best, ind) => ind.fitness > best.fitness ? ind : best));
            }
        } else if (type === 'roulette') {
            const fitnessSum = population.reduce((s, ind) => s + Math.max(0, ind.fitness), 0);
            for (let i = 0; i < count; i++) {
                let r = Math.random() * fitnessSum;
                for (const ind of population) {
                    r -= Math.max(0, ind.fitness);
                    if (r <= 0) {
                        selected.push(ind);
                        break;
                    }
                }
            }
        } else { // rank
            const sorted = [...population].sort((a, b) => a.fitness - b.fitness);
            const ranks = sorted.map((_, i) => i + 1);
            const rankSum = ranks.reduce((a, b) => a + b, 0);
            for (let i = 0; i < count; i++) {
                let r = Math.random() * rankSum;
                for (let j = 0; j < sorted.length; j++) {
                    r -= ranks[j];
                    if (r <= 0) {
                        selected.push(sorted[j]);
                        break;
                    }
                }
            }
        }

        return selected;
    },

    _crossover: function(p1, p2, type) {
        const len = p1.length;
        let c1 = [...p1], c2 = [...p2];

        if (type === 'onePoint') {
            const point = Math.floor(Math.random() * len);
            for (let i = point; i < len; i++) {
                [c1[i], c2[i]] = [c2[i], c1[i]];
            }
        } else if (type === 'twoPoint') {
            const p1Idx = Math.floor(Math.random() * len);
            const p2Idx = Math.floor(Math.random() * len);
            const start = Math.min(p1Idx, p2Idx);
            const end = Math.max(p1Idx, p2Idx);
            for (let i = start; i < end; i++) {
                [c1[i], c2[i]] = [c2[i], c1[i]];
            }
        } else { // uniform
            for (let i = 0; i < len; i++) {
                if (Math.random() > 0.5) {
                    [c1[i], c2[i]] = [c2[i], c1[i]];
                }
            }
        }

        return [c1, c2];
    },

    _mutate: function(individual, rate, type, bounds) {
        const mutated = [...individual];
        for (let i = 0; i < mutated.length; i++) {
            if (Math.random() < rate) {
                if (type === 'binary') {
                    mutated[i] = 1 - mutated[i];
                } else if (type === 'real' && bounds) {
                    const range = bounds[i][1] - bounds[i][0];
                    mutated[i] += (Math.random() - 0.5) * range * 0.1;
                    mutated[i] = Math.max(bounds[i][0], Math.min(bounds[i][1], mutated[i]));
                } else {
                    mutated[i] += (Math.random() - 0.5) * 0.1;
                }
            }
        }
        return mutated;
    },

    /**
     * Differential Evolution
     */
    differentialEvolution: function(objective, bounds, params = {}) {
        const {
            populationSize = 50,
            maxIterations = 100,
            F = 0.8,           // Mutation factor
            CR = 0.9,          // Crossover rate
            strategy = 'best1bin' // 'rand1bin', 'best1bin', 'rand2bin', 'best2bin'
        } = params;

        const dim = bounds.length;

        // Initialize population
        let population = [];
        for (let i = 0; i < populationSize; i++) {
            const individual = bounds.map(([min, max]) => min + Math.random() * (max - min));
            population.push({
                vector: individual,
                fitness: objective(individual)
            });
        }

        let best = population.reduce((b, ind) => ind.fitness < b.fitness ? ind : b);
        const history = [{ iteration: 0, best: best.fitness }];

        for (let iter = 0; iter < maxIterations; iter++) {
            const newPopulation = [];

            for (let i = 0; i < populationSize; i++) {
                const target = population[i];

                // Select mutation vectors
                let indices = [];
                while (indices.length < 5) {
                    const r = Math.floor(Math.random() * populationSize);
                    if (r !== i && !indices.includes(r)) indices.push(r);
                }

                // Mutation
                let mutant;
                if (strategy.includes('best')) {
                    mutant = best.vector.map((v, d) =>
                        v + F * (population[indices[0]].vector[d] - population[indices[1]].vector[d]));
                } else {
                    mutant = population[indices[0]].vector.map((v, d) =>
                        v + F * (population[indices[1]].vector[d] - population[indices[2]].vector[d]));
                }

                // Crossover
                const trial = target.vector.map((v, d) => {
                    if (Math.random() < CR || d === Math.floor(Math.random() * dim)) {
                        return Math.max(bounds[d][0], Math.min(bounds[d][1], mutant[d]));
                    }
                    return v;
                });

                // Selection
                const trialFitness = objective(trial);
                if (trialFitness <= target.fitness) {
                    newPopulation.push({ vector: trial, fitness: trialFitness });
                    if (trialFitness < best.fitness) {
                        best = { vector: [...trial], fitness: trialFitness };
                    }
                } else {
                    newPopulation.push(target);
                }
            }

            population = newPopulation;
            history.push({ iteration: iter + 1, best: best.fitness });
        }

        return { bestVector: best.vector, bestFitness: best.fitness, history };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 21: PRISM_LEARNING_RATE_SCHEDULER_ENGINE
// Learning Rate Scheduling Strategies
// Source: MIT 6.036, Stanford CS 231N
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_LEARNING_RATE_SCHEDULER_ENGINE = {
    name: 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * Step Decay
     */
    createStepDecay: function(initialLR, decayFactor = 0.1, decayEvery = 30) {
        return {
            getLR: function(epoch) {
                return initialLR * Math.pow(decayFactor, Math.floor(epoch / decayEvery));
            }
        };
    },

    /**
     * Exponential Decay
     */
    createExponentialDecay: function(initialLR, decayRate = 0.96) {
        return {
            getLR: function(step) {
                return initialLR * Math.pow(decayRate, step / 1000);
            }
        };
    },

    /**
     * Cosine Annealing
     */
    createCosineAnnealing: function(initialLR, minLR = 0, totalSteps = 1000) {
        return {
            getLR: function(step) {
                return minLR + 0.5 * (initialLR - minLR) * 
                       (1 + Math.cos(Math.PI * step / totalSteps));
            }
        };
    },

    /**
     * Cosine Annealing with Warm Restarts
     */
    createCosineWarmRestarts: function(initialLR, minLR = 0, T_0 = 10, T_mult = 2) {
        return {
            T_0, T_mult,
            getLR: function(epoch) {
                let T_i = T_0;
                let T_cur = epoch;
                
                while (T_cur >= T_i) {
                    T_cur -= T_i;
                    T_i *= T_mult;
                }
                
                return minLR + 0.5 * (initialLR - minLR) *
                       (1 + Math.cos(Math.PI * T_cur / T_i));
            }
        };
    },

    /**
     * Linear Warmup + Decay
     */
    createWarmupScheduler: function(initialLR, warmupSteps, totalSteps, decayType = 'linear') {
        return {
            getLR: function(step) {
                if (step < warmupSteps) {
                    return initialLR * step / warmupSteps;
                }
                
                const decaySteps = totalSteps - warmupSteps;
                const currentDecayStep = step - warmupSteps;
                
                if (decayType === 'linear') {
                    return initialLR * (1 - currentDecayStep / decaySteps);
                } else if (decayType === 'cosine') {
                    return 0.5 * initialLR * (1 + Math.cos(Math.PI * currentDecayStep / decaySteps));
                }
                return initialLR;
            }
        };
    },

    /**
     * Polynomial Decay
     */
    createPolynomialDecay: function(initialLR, endLR, totalSteps, power = 1.0) {
        return {
            getLR: function(step) {
                const decaySteps = Math.min(step, totalSteps);
                return (initialLR - endLR) * Math.pow(1 - decaySteps / totalSteps, power) + endLR;
            }
        };
    },

    /**
     * One Cycle Learning Rate
     */
    createOneCycle: function(maxLR, totalSteps, pctStart = 0.3, divFactor = 25, finalDivFactor = 1e4) {
        const initialLR = maxLR / divFactor;
        const minLR = initialLR / finalDivFactor;
        const upSteps = Math.floor(totalSteps * pctStart);
        const downSteps = totalSteps - upSteps;

        return {
            getLR: function(step) {
                if (step < upSteps) {
                    // Linear increase
                    return initialLR + (maxLR - initialLR) * step / upSteps;
                } else {
                    // Cosine decrease
                    const decayStep = step - upSteps;
                    return minLR + 0.5 * (maxLR - minLR) * 
                           (1 + Math.cos(Math.PI * decayStep / downSteps));
                }
            }
        };
    },

    /**
     * Reduce on Plateau
     */
    createReduceOnPlateau: function(initialLR, factor = 0.1, patience = 10, minLR = 1e-7) {
        return {
            lr: initialLR,
            bestMetric: Infinity,
            patienceCounter: 0,
            
            step: function(metric) {
                if (metric < this.bestMetric) {
                    this.bestMetric = metric;
                    this.patienceCounter = 0;
                } else {
                    this.patienceCounter++;
                    if (this.patienceCounter >= patience) {
                        this.lr = Math.max(minLR, this.lr * factor);
                        this.patienceCounter = 0;
                    }
                }
                return this.lr;
            },
            
            getLR: function() {
                return this.lr;
            }
        };
    },

    /**
     * Cyclic Learning Rate (triangular)
     */
    createCyclicLR: function(baseLR, maxLR, stepSize = 2000, mode = 'triangular') {
        return {
            getLR: function(step) {
                const cycle = Math.floor(1 + step / (2 * stepSize));
                const x = Math.abs(step / stepSize - 2 * cycle + 1);
                
                if (mode === 'triangular') {
                    return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x);
                } else if (mode === 'triangular2') {
                    return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x) / Math.pow(2, cycle - 1);
                } else if (mode === 'exp_range') {
                    return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x) * Math.pow(0.99994, step);
                }
                return baseLR;
            }
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 22: PRISM_ENSEMBLE_ENGINE
// Ensemble Methods: Bagging, Boosting, Stacking
// Source: Stanford CS 229, MIT 6.036
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_ENSEMBLE_ENGINE = {
    name: 'PRISM_ENSEMBLE_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 229, MIT 6.036',

    /**
     * Bagging (Bootstrap Aggregating)
     */
    bagging: function(baseModelCreator, X, y, numModels = 10, sampleRatio = 1.0) {
        const n = X.length;
        const sampleSize = Math.floor(n * sampleRatio);
        const models = [];

        for (let i = 0; i < numModels; i++) {
            // Bootstrap sample
            const indices = [];
            for (let j = 0; j < sampleSize; j++) {
                indices.push(Math.floor(Math.random() * n));
            }
            
            const Xsample = indices.map(idx => X[idx]);
            const ysample = indices.map(idx => y[idx]);

            // Train model
            const model = baseModelCreator();
            model.fit(Xsample, ysample);
            models.push(model);
        }

        return {
            models,
            predict: function(x) {
                const predictions = models.map(m => m.predict(x));
                // Classification: majority vote
                if (typeof predictions[0] === 'number' && Number.isInteger(predictions[0])) {
                    const counts = {};
                    for (const p of predictions) {
                        counts[p] = (counts[p] || 0) + 1;
                    }
                    return parseInt(Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b));
                }
                // Regression: average
                return predictions.reduce((a, b) => a + b, 0) / predictions.length;
            },
            predictProba: function(x) {
                const probas = models.map(m => m.predictProba ? m.predictProba(x) : [m.predict(x)]);
                // Average probabilities
                const numClasses = probas[0].length;
                const avgProba = Array(numClasses).fill(0);
                for (const p of probas) {
                    for (let c = 0; c < numClasses; c++) {
                        avgProba[c] += p[c];
                    }
                }
                return avgProba.map(p => p / numModels);
            }
        };
    },

    /**
     * AdaBoost (Adaptive Boosting)
     */
    adaBoost: function(baseModelCreator, X, y, numModels = 50) {
        const n = X.length;
        let weights = Array(n).fill(1 / n);
        const models = [];
        const alphas = [];

        for (let m = 0; m < numModels; m++) {
            // Train weak learner with weighted samples
            const model = baseModelCreator();
            model.fit(X, y, weights);

            // Get predictions and calculate error
            let weightedError = 0;
            const predictions = X.map(x => model.predict(x));
            
            for (let i = 0; i < n; i++) {
                if (predictions[i] !== y[i]) {
                    weightedError += weights[i];
                }
            }

            // Calculate alpha
            if (weightedError >= 0.5) break;
            const alpha = 0.5 * Math.log((1 - weightedError) / (weightedError + 1e-10));
            
            // Update weights
            for (let i = 0; i < n; i++) {
                if (predictions[i] !== y[i]) {
                    weights[i] *= Math.exp(alpha);
                } else {
                    weights[i] *= Math.exp(-alpha);
                }
            }
            
            // Normalize weights
            const weightSum = weights.reduce((a, b) => a + b, 0);
            weights = weights.map(w => w / weightSum);

            models.push(model);
            alphas.push(alpha);
        }

        return {
            models,
            alphas,
            predict: function(x) {
                const weightedVotes = {};
                for (let m = 0; m < models.length; m++) {
                    const pred = models[m].predict(x);
                    weightedVotes[pred] = (weightedVotes[pred] || 0) + alphas[m];
                }
                return parseInt(Object.keys(weightedVotes).reduce((a, b) =>
                    weightedVotes[a] > weightedVotes[b] ? a : b));
            }
        };
    },

    /**
     * Gradient Boosting (simplified)
     */
    gradientBoosting: function(baseModelCreator, X, y, numModels = 100, learningRate = 0.1) {
        const n = X.length;
        const models = [];
        
        // Initialize with mean
        const mean = y.reduce((a, b) => a + b, 0) / n;
        let predictions = Array(n).fill(mean);

        for (let m = 0; m < numModels; m++) {
            // Compute residuals
            const residuals = y.map((yi, i) => yi - predictions[i]);

            // Fit model to residuals
            const model = baseModelCreator();
            model.fit(X, residuals);
            models.push(model);

            // Update predictions
            for (let i = 0; i < n; i++) {
                predictions[i] += learningRate * model.predict(X[i]);
            }
        }

        return {
            models,
            mean,
            learningRate,
            predict: function(x) {
                let pred = this.mean;
                for (const model of this.models) {
                    pred += this.learningRate * model.predict(x);
                }
                return pred;
            }
        };
    },

    /**
     * Stacking (Meta-learning)
     */
    stacking: function(baseModels, metaModelCreator, X, y, cv = 5) {
        const n = X.length;
        const numBaseModels = baseModels.length;
        const foldSize = Math.floor(n / cv);
        
        // Generate meta-features through cross-validation
        const metaFeatures = Array.from({ length: n }, () => Array(numBaseModels).fill(0));
        
        for (let fold = 0; fold < cv; fold++) {
            const valStart = fold * foldSize;
            const valEnd = fold === cv - 1 ? n : (fold + 1) * foldSize;
            
            // Split data
            const trainIdx = [], valIdx = [];
            for (let i = 0; i < n; i++) {
                if (i >= valStart && i < valEnd) {
                    valIdx.push(i);
                } else {
                    trainIdx.push(i);
                }
            }
            
            const Xtrain = trainIdx.map(i => X[i]);
            const ytrain = trainIdx.map(i => y[i]);
            
            // Train each base model and predict on validation
            for (let m = 0; m < numBaseModels; m++) {
                const model = baseModels[m]();
                model.fit(Xtrain, ytrain);
                
                for (const i of valIdx) {
                    metaFeatures[i][m] = model.predict(X[i]);
                }
            }
        }
        
        // Train base models on full data
        const trainedBaseModels = baseModels.map(creator => {
            const model = creator();
            model.fit(X, y);
            return model;
        });
        
        // Train meta-model
        const metaModel = metaModelCreator();
        metaModel.fit(metaFeatures, y);
        
        return {
            baseModels: trainedBaseModels,
            metaModel,
            predict: function(x) {
                const basePreds = this.baseModels.map(m => m.predict(x));
                return this.metaModel.predict(basePreds);
            }
        };
    },

    /**
     * Voting Ensemble (simple)
     */
    voting: function(models, weights = null, type = 'hard') {
        weights = weights || Array(models.length).fill(1 / models.length);

        return {
            models,
            weights,
            predict: function(x) {
                if (type === 'hard') {
                    const votes = {};
                    for (let i = 0; i < models.length; i++) {
                        const pred = models[i].predict(x);
                        votes[pred] = (votes[pred] || 0) + weights[i];
                    }
                    return Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
                } else { // soft voting
                    const probas = models.map(m => m.predictProba(x));
                    const numClasses = probas[0].length;
                    const weighted = Array(numClasses).fill(0);
                    
                    for (let i = 0; i < models.length; i++) {
                        for (let c = 0; c < numClasses; c++) {
                            weighted[c] += weights[i] * probas[i][c];
                        }
                    }
                    
                    return weighted.indexOf(Math.max(...weighted));
                }
            }
        };
    }
};

// Gateway registrations
if (typeof PRISM_GATEWAY !== 'undefined') {
    // Evolutionary
    PRISM_GATEWAY.register('ai.evo.pso', 'PRISM_EVOLUTIONARY_ENHANCED_ENGINE.pso');
    PRISM_GATEWAY.register('ai.evo.aco', 'PRISM_EVOLUTIONARY_ENHANCED_ENGINE.aco');
    PRISM_GATEWAY.register('ai.evo.ga', 'PRISM_EVOLUTIONARY_ENHANCED_ENGINE.geneticAlgorithm');
    PRISM_GATEWAY.register('ai.evo.de', 'PRISM_EVOLUTIONARY_ENHANCED_ENGINE.differentialEvolution');

    // Learning Rate Schedulers
    PRISM_GATEWAY.register('ai.lr.step', 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE.createStepDecay');
    PRISM_GATEWAY.register('ai.lr.exponential', 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE.createExponentialDecay');
    PRISM_GATEWAY.register('ai.lr.cosine', 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE.createCosineAnnealing');
    PRISM_GATEWAY.register('ai.lr.warmup', 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE.createWarmupScheduler');
    PRISM_GATEWAY.register('ai.lr.onecycle', 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE.createOneCycle');
    PRISM_GATEWAY.register('ai.lr.plateau', 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE.createReduceOnPlateau');
    PRISM_GATEWAY.register('ai.lr.cyclic', 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE.createCyclicLR');

    // Ensemble
    PRISM_GATEWAY.register('ai.ensemble.bagging', 'PRISM_ENSEMBLE_ENGINE.bagging');
    PRISM_GATEWAY.register('ai.ensemble.adaboost', 'PRISM_ENSEMBLE_ENGINE.adaBoost');
    PRISM_GATEWAY.register('ai.ensemble.gradient_boost', 'PRISM_ENSEMBLE_ENGINE.gradientBoosting');
    PRISM_GATEWAY.register('ai.ensemble.stacking', 'PRISM_ENSEMBLE_ENGINE.stacking');
    PRISM_GATEWAY.register('ai.ensemble.voting', 'PRISM_ENSEMBLE_ENGINE.voting');
}

console.log('[PRISM Session 1 Ultimate AI/ML Part 6] Modules 20-22 loaded');
console.log('  - PRISM_EVOLUTIONARY_ENHANCED_ENGINE (PSO, ACO, GA, DE)');
console.log('  - PRISM_LEARNING_RATE_SCHEDULER_ENGINE (8 schedulers)');
console.log('  - PRISM_ENSEMBLE_ENGINE (Bagging, Boosting, Stacking)');


// ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
// ║ SESSION 2: PROCESS PLANNING & SEARCH ENHANCEMENT - 9 MODULES - 38 GATEWAY ROUTES         ║
// ║ Sources: MIT 16.410, MIT 6.046J, MIT 2.008, Stanford CS 221, CS 161                      ║
// ╚═══════════════════════════════════════════════════════════════════════════════════════════╝

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 2: PROCESS PLANNING & SEARCH ENHANCEMENT - PART 1                          ║
 * ║ Enhanced Search Algorithms + Manufacturing Applications                                   ║
 * ║ Source: MIT 16.410 (Autonomous Systems), MIT 6.046J (Algorithm Design)                   ║
 * ║ Target: +1,000 lines | 5 Modules | 25+ Gateway Routes                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 1: PRISM_SEARCH_ENHANCED_ENGINE
// Advanced Search Algorithms with Priority Queue Optimization
// Source: MIT 6.046J - Design and Analysis of Algorithms
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_SEARCH_ENHANCED_ENGINE = {
    name: 'PRISM_SEARCH_ENHANCED_ENGINE',
    version: '1.0.0',
    description: 'Advanced search algorithms with heap-based priority queues',
    source: 'MIT 6.046J, MIT 16.410',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Min-Heap Priority Queue (for efficient search)
    // ─────────────────────────────────────────────────────────────────────────────
    
    createPriorityQueue: function() {
        return {
            heap: [],
            keyMap: new Map(), // For decrease-key operations
            
            push: function(item, priority) {
                const node = { item, priority, index: this.heap.length };
                this.heap.push(node);
                const key = JSON.stringify(item);
                this.keyMap.set(key, node);
                this._bubbleUp(node.index);
            },
            
            pop: function() {
                if (this.heap.length === 0) return null;
                const min = this.heap[0];
                const last = this.heap.pop();
                if (this.heap.length > 0) {
                    this.heap[0] = last;
                    last.index = 0;
                    this._bubbleDown(0);
                }
                this.keyMap.delete(JSON.stringify(min.item));
                return min.item;
            },
            
            decreaseKey: function(item, newPriority) {
                const key = JSON.stringify(item);
                const node = this.keyMap.get(key);
                if (node && newPriority < node.priority) {
                    node.priority = newPriority;
                    this._bubbleUp(node.index);
                }
            },
            
            contains: function(item) {
                return this.keyMap.has(JSON.stringify(item));
            },
            
            isEmpty: function() {
                return this.heap.length === 0;
            },
            
            _bubbleUp: function(index) {
                while (index > 0) {
                    const parent = Math.floor((index - 1) / 2);
                    if (this.heap[parent].priority <= this.heap[index].priority) break;
                    this._swap(parent, index);
                    index = parent;
                }
            },
            
            _bubbleDown: function(index) {
                const length = this.heap.length;
                while (true) {
                    const left = 2 * index + 1;
                    const right = 2 * index + 2;
                    let smallest = index;
                    
                    if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
                        smallest = left;
                    }
                    if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
                        smallest = right;
                    }
                    if (smallest === index) break;
                    
                    this._swap(index, smallest);
                    index = smallest;
                }
            },
            
            _swap: function(i, j) {
                [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
                this.heap[i].index = i;
                this.heap[j].index = j;
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dijkstra's Algorithm (Optimal for non-negative weights)
    // ─────────────────────────────────────────────────────────────────────────────
    
    dijkstra: function(graph, start, goal = null) {
        const dist = new Map();
        const prev = new Map();
        const pq = this.createPriorityQueue();
        
        // Initialize
        for (const node of graph.nodes) {
            dist.set(node, Infinity);
        }
        dist.set(start, 0);
        pq.push(start, 0);
        
        let iterations = 0;
        const maxIter = graph.maxIterations || 100000;
        
        while (!pq.isEmpty() && iterations < maxIter) {
            iterations++;
            const u = pq.pop();
            
            if (goal !== null && u === goal) {
                return this._reconstructDijkstraPath(prev, goal, dist.get(goal));
            }
            
            const neighbors = graph.getNeighbors ? graph.getNeighbors(u) : (graph.edges[u] || []);
            
            for (const { node: v, weight } of neighbors) {
                const alt = dist.get(u) + weight;
                if (alt < dist.get(v)) {
                    dist.set(v, alt);
                    prev.set(v, u);
                    if (pq.contains(v)) {
                        pq.decreaseKey(v, alt);
                    } else {
                        pq.push(v, alt);
                    }
                }
            }
        }
        
        return { distances: Object.fromEntries(dist), previous: Object.fromEntries(prev), iterations };
    },
    
    _reconstructDijkstraPath: function(prev, goal, cost) {
        const path = [];
        let current = goal;
        while (current !== undefined) {
            path.unshift(current);
            current = prev.get(current);
        }
        return { found: true, path, cost };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Uniform Cost Search (A* with h=0)
    // ─────────────────────────────────────────────────────────────────────────────
    
    uniformCostSearch: function(problem) {
        const pq = this.createPriorityQueue();
        const visited = new Set();
        const gScore = new Map();
        const cameFrom = new Map();
        
        const startKey = JSON.stringify(problem.initial);
        pq.push(problem.initial, 0);
        gScore.set(startKey, 0);
        
        let iterations = 0;
        const maxIter = problem.maxIterations || 10000;
        
        while (!pq.isEmpty() && iterations < maxIter) {
            iterations++;
            const current = pq.pop();
            const currentKey = JSON.stringify(current);
            
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);
            
            if (problem.isGoal(current)) {
                return this._reconstructUCSPath(cameFrom, currentKey, gScore.get(currentKey));
            }
            
            const successors = problem.getSuccessors(current);
            for (const { state, action, cost } of successors) {
                const neighborKey = JSON.stringify(state);
                if (visited.has(neighborKey)) continue;
                
                const newG = gScore.get(currentKey) + cost;
                const existingG = gScore.get(neighborKey);
                
                if (existingG === undefined || newG < existingG) {
                    gScore.set(neighborKey, newG);
                    cameFrom.set(neighborKey, { parent: currentKey, action, cost });
                    pq.push(state, newG);
                }
            }
        }
        
        return { found: false, iterations };
    },
    
    _reconstructUCSPath: function(cameFrom, goalKey, totalCost) {
        const path = [];
        let current = goalKey;
        while (cameFrom.has(current)) {
            const { parent, action, cost } = cameFrom.get(current);
            path.unshift({ action, cost });
            current = parent;
        }
        return { found: true, path, totalCost, pathLength: path.length };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Best-First Search (Greedy)
    // ─────────────────────────────────────────────────────────────────────────────
    
    bestFirstSearch: function(problem) {
        const pq = this.createPriorityQueue();
        const visited = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        
        const startKey = JSON.stringify(problem.initial);
        pq.push(problem.initial, problem.heuristic(problem.initial));
        gScore.set(startKey, 0);
        
        let iterations = 0;
        const maxIter = problem.maxIterations || 10000;
        
        while (!pq.isEmpty() && iterations < maxIter) {
            iterations++;
            const current = pq.pop();
            const currentKey = JSON.stringify(current);
            
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);
            
            if (problem.isGoal(current)) {
                return this._reconstructUCSPath(cameFrom, currentKey, gScore.get(currentKey));
            }
            
            for (const { state, action, cost } of problem.getSuccessors(current)) {
                const neighborKey = JSON.stringify(state);
                if (!visited.has(neighborKey)) {
                    const newG = gScore.get(currentKey) + cost;
                    if (!gScore.has(neighborKey)) {
                        gScore.set(neighborKey, newG);
                        cameFrom.set(neighborKey, { parent: currentKey, action, cost });
                        pq.push(state, problem.heuristic(state)); // Priority = heuristic only
                    }
                }
            }
        }
        
        return { found: false, iterations };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Bidirectional Search
    // ─────────────────────────────────────────────────────────────────────────────
    
    bidirectionalSearch: function(problem) {
        const forwardFrontier = [{ state: problem.initial, path: [], cost: 0 }];
        const backwardFrontier = [{ state: problem.goal, path: [], cost: 0 }];
        
        const forwardVisited = new Map();
        const backwardVisited = new Map();
        
        forwardVisited.set(JSON.stringify(problem.initial), { path: [], cost: 0 });
        backwardVisited.set(JSON.stringify(problem.goal), { path: [], cost: 0 });
        
        let iterations = 0;
        const maxIter = problem.maxIterations || 10000;
        
        while (forwardFrontier.length > 0 && backwardFrontier.length > 0 && iterations < maxIter) {
            iterations++;
            
            // Expand forward
            if (forwardFrontier.length > 0) {
                const current = forwardFrontier.shift();
                const currentKey = JSON.stringify(current.state);
                
                for (const { state, action, cost } of problem.getSuccessors(current.state)) {
                    const neighborKey = JSON.stringify(state);
                    
                    // Check if we've met the backward search
                    if (backwardVisited.has(neighborKey)) {
                        const backward = backwardVisited.get(neighborKey);
                        return {
                            found: true,
                            forwardPath: [...current.path, action],
                            backwardPath: backward.path.reverse(),
                            totalCost: current.cost + cost + backward.cost,
                            iterations
                        };
                    }
                    
                    if (!forwardVisited.has(neighborKey)) {
                        const newPath = [...current.path, action];
                        const newCost = current.cost + cost;
                        forwardVisited.set(neighborKey, { path: newPath, cost: newCost });
                        forwardFrontier.push({ state, path: newPath, cost: newCost });
                    }
                }
            }
            
            // Expand backward (if reverse successors available)
            if (backwardFrontier.length > 0 && problem.getReverseSuccessors) {
                const current = backwardFrontier.shift();
                const currentKey = JSON.stringify(current.state);
                
                for (const { state, action, cost } of problem.getReverseSuccessors(current.state)) {
                    const neighborKey = JSON.stringify(state);
                    
                    if (forwardVisited.has(neighborKey)) {
                        const forward = forwardVisited.get(neighborKey);
                        return {
                            found: true,
                            forwardPath: forward.path,
                            backwardPath: [action, ...current.path],
                            totalCost: forward.cost + cost + current.cost,
                            iterations
                        };
                    }
                    
                    if (!backwardVisited.has(neighborKey)) {
                        const newPath = [action, ...current.path];
                        const newCost = current.cost + cost;
                        backwardVisited.set(neighborKey, { path: newPath, cost: newCost });
                        backwardFrontier.push({ state, path: newPath, cost: newCost });
                    }
                }
            }
        }
        
        return { found: false, iterations };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Weighted A* (Suboptimal but faster)
    // ─────────────────────────────────────────────────────────────────────────────
    
    weightedAStar: function(problem, weight = 1.5) {
        const pq = this.createPriorityQueue();
        const visited = new Set();
        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();
        
        const startKey = JSON.stringify(problem.initial);
        gScore.set(startKey, 0);
        fScore.set(startKey, weight * problem.heuristic(problem.initial));
        pq.push(problem.initial, fScore.get(startKey));
        
        let iterations = 0;
        const maxIter = problem.maxIterations || 10000;
        
        while (!pq.isEmpty() && iterations < maxIter) {
            iterations++;
            const current = pq.pop();
            const currentKey = JSON.stringify(current);
            
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);
            
            if (problem.isGoal(current)) {
                return {
                    ...this._reconstructUCSPath(cameFrom, currentKey, gScore.get(currentKey)),
                    weight,
                    iterations
                };
            }
            
            for (const { state, action, cost } of problem.getSuccessors(current)) {
                const neighborKey = JSON.stringify(state);
                if (visited.has(neighborKey)) continue;
                
                const newG = gScore.get(currentKey) + cost;
                const existingG = gScore.get(neighborKey);
                
                if (existingG === undefined || newG < existingG) {
                    gScore.set(neighborKey, newG);
                    const f = newG + weight * problem.heuristic(state);
                    fScore.set(neighborKey, f);
                    cameFrom.set(neighborKey, { parent: currentKey, action, cost });
                    pq.push(state, f);
                }
            }
        }
        
        return { found: false, iterations };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Beam Search (Memory-bounded)
    // ─────────────────────────────────────────────────────────────────────────────
    
    beamSearch: function(problem, beamWidth = 10) {
        let beam = [{ state: problem.initial, path: [], cost: 0, heuristic: problem.heuristic(problem.initial) }];
        const visited = new Set([JSON.stringify(problem.initial)]);
        
        let iterations = 0;
        const maxIter = problem.maxIterations || 1000;
        
        while (beam.length > 0 && iterations < maxIter) {
            iterations++;
            
            // Check for goal
            for (const node of beam) {
                if (problem.isGoal(node.state)) {
                    return { found: true, path: node.path, cost: node.cost, iterations };
                }
            }
            
            // Expand all nodes in beam
            const candidates = [];
            for (const node of beam) {
                for (const { state, action, cost } of problem.getSuccessors(node.state)) {
                    const key = JSON.stringify(state);
                    if (!visited.has(key)) {
                        visited.add(key);
                        candidates.push({
                            state,
                            path: [...node.path, action],
                            cost: node.cost + cost,
                            heuristic: problem.heuristic(state)
                        });
                    }
                }
            }
            
            // Sort by heuristic and keep top beamWidth
            candidates.sort((a, b) => a.heuristic - b.heuristic);
            beam = candidates.slice(0, beamWidth);
        }
        
        return { found: false, iterations };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('search.dijkstra', 'PRISM_SEARCH_ENHANCED_ENGINE.dijkstra');
            PRISM_GATEWAY.register('search.ucs', 'PRISM_SEARCH_ENHANCED_ENGINE.uniformCostSearch');
            PRISM_GATEWAY.register('search.bestFirst', 'PRISM_SEARCH_ENHANCED_ENGINE.bestFirstSearch');
            PRISM_GATEWAY.register('search.bidirectional', 'PRISM_SEARCH_ENHANCED_ENGINE.bidirectionalSearch');
            PRISM_GATEWAY.register('search.weightedAstar', 'PRISM_SEARCH_ENHANCED_ENGINE.weightedAStar');
            PRISM_GATEWAY.register('search.beam', 'PRISM_SEARCH_ENHANCED_ENGINE.beamSearch');
            PRISM_GATEWAY.register('search.priorityQueue', 'PRISM_SEARCH_ENHANCED_ENGINE.createPriorityQueue');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 2: PRISM_CSP_ENHANCED_ENGINE
// Enhanced Constraint Satisfaction with Advanced Techniques
// Source: MIT 6.034 (AI), Stanford CS 221
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_CSP_ENHANCED_ENGINE = {
    name: 'PRISM_CSP_ENHANCED_ENGINE',
    version: '1.0.0',
    description: 'Enhanced CSP solver with MRV, LCV, forward checking, min-conflicts',
    source: 'MIT 6.034, Stanford CS 221',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Enhanced CSP Solver with all heuristics
    // ─────────────────────────────────────────────────────────────────────────────
    
    solve: function(csp, options = {}) {
        const {
            useMRV = true,      // Minimum Remaining Values
            useLCV = true,      // Least Constraining Value
            useAC3 = true,      // Arc Consistency preprocessing
            useForwardChecking = true
        } = options;
        
        const { variables, domains, constraints } = csp;
        const domainsCopy = {};
        for (const v of variables) {
            domainsCopy[v] = [...domains[v]];
        }
        
        // Apply AC-3 preprocessing
        if (useAC3) {
            if (!this.ac3(variables, domainsCopy, constraints)) {
                return { solved: false, reason: 'AC-3 detected inconsistency' };
            }
        }
        
        const assignment = {};
        const stats = { backtracks: 0, nodesExplored: 0 };
        
        const result = this._backtrackEnhanced(
            assignment, variables, domainsCopy, constraints,
            useMRV, useLCV, useForwardChecking, stats
        );
        
        return result ? 
            { solved: true, assignment: result, stats } : 
            { solved: false, stats };
    },
    
    _backtrackEnhanced: function(assignment, variables, domains, constraints, useMRV, useLCV, useForwardChecking, stats) {
        stats.nodesExplored++;
        
        if (Object.keys(assignment).length === variables.length) {
            return { ...assignment };
        }
        
        // Select unassigned variable
        const variable = useMRV ? 
            this._selectVariableMRV(variables, assignment, domains) :
            variables.find(v => !(v in assignment));
        
        if (!variable) return null;
        
        // Order domain values
        const orderedValues = useLCV ?
            this._orderValuesLCV(variable, domains[variable], assignment, constraints, domains) :
            domains[variable];
        
        for (const value of orderedValues) {
            if (this._isConsistent(variable, value, assignment, constraints)) {
                assignment[variable] = value;
                
                // Forward checking
                let domainsCopy = domains;
                let consistent = true;
                
                if (useForwardChecking) {
                    domainsCopy = this._forwardCheck(variable, value, domains, constraints);
                    consistent = Object.values(domainsCopy).every(d => d.length > 0);
                }
                
                if (consistent) {
                    const result = this._backtrackEnhanced(
                        assignment, variables, domainsCopy, constraints,
                        useMRV, useLCV, useForwardChecking, stats
                    );
                    if (result) return result;
                }
                
                delete assignment[variable];
                stats.backtracks++;
            }
        }
        
        return null;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Minimum Remaining Values (MRV) Heuristic
    // ─────────────────────────────────────────────────────────────────────────────
    
    _selectVariableMRV: function(variables, assignment, domains) {
        let bestVar = null;
        let minRemaining = Infinity;
        
        for (const v of variables) {
            if (!(v in assignment)) {
                const remaining = domains[v].length;
                if (remaining < minRemaining) {
                    minRemaining = remaining;
                    bestVar = v;
                }
            }
        }
        
        return bestVar;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Least Constraining Value (LCV) Heuristic
    // ─────────────────────────────────────────────────────────────────────────────
    
    _orderValuesLCV: function(variable, values, assignment, constraints, domains) {
        const scores = values.map(value => {
            let ruledOut = 0;
            
            // Count how many values this rules out for neighbors
            for (const constraint of constraints) {
                if (!constraint.variables.includes(variable)) continue;
                
                for (const neighbor of constraint.variables) {
                    if (neighbor === variable || neighbor in assignment) continue;
                    
                    for (const neighborVal of domains[neighbor]) {
                        const testAssignment = { ...assignment, [variable]: value, [neighbor]: neighborVal };
                        if (!constraint.check(testAssignment)) {
                            ruledOut++;
                        }
                    }
                }
            }
            
            return { value, ruledOut };
        });
        
        // Sort by least constraining (fewest ruled out)
        scores.sort((a, b) => a.ruledOut - b.ruledOut);
        return scores.map(s => s.value);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Forward Checking
    // ─────────────────────────────────────────────────────────────────────────────
    
    _forwardCheck: function(variable, value, domains, constraints) {
        const newDomains = {};
        for (const v in domains) {
            newDomains[v] = [...domains[v]];
        }
        newDomains[variable] = [value];
        
        // Remove inconsistent values from neighbors
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            
            for (const neighbor of constraint.variables) {
                if (neighbor === variable) continue;
                
                newDomains[neighbor] = newDomains[neighbor].filter(neighborVal => {
                    const testAssignment = { [variable]: value, [neighbor]: neighborVal };
                    return constraint.check(testAssignment);
                });
            }
        }
        
        return newDomains;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // AC-3 Algorithm (Arc Consistency)
    // ─────────────────────────────────────────────────────────────────────────────
    
    ac3: function(variables, domains, constraints) {
        const queue = [];
        
        // Initialize queue with all arcs
        for (const c of constraints) {
            if (c.variables.length === 2) {
                queue.push([c.variables[0], c.variables[1], c]);
                queue.push([c.variables[1], c.variables[0], c]);
            }
        }
        
        while (queue.length > 0) {
            const [xi, xj, constraint] = queue.shift();
            
            if (this._revise(domains, xi, xj, constraint)) {
                if (domains[xi].length === 0) return false;
                
                // Add all neighbors of xi (except xj) to queue
                for (const c of constraints) {
                    if (c.variables.includes(xi)) {
                        for (const xk of c.variables) {
                            if (xk !== xi && xk !== xj) {
                                queue.push([xk, xi, c]);
                            }
                        }
                    }
                }
            }
        }
        
        return true;
    },
    
    _revise: function(domains, xi, xj, constraint) {
        let revised = false;
        
        domains[xi] = domains[xi].filter(x => {
            const hasSupport = domains[xj].some(y => {
                const testAssignment = { [xi]: x, [xj]: y };
                return constraint.check(testAssignment);
            });
            if (!hasSupport) revised = true;
            return hasSupport;
        });
        
        return revised;
    },
    
    _isConsistent: function(variable, value, assignment, constraints) {
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            
            // Check if all variables in constraint are assigned
            const allAssigned = constraint.variables.every(v => v === variable || v in assignment);
            if (!allAssigned) continue;
            
            const testAssignment = { ...assignment, [variable]: value };
            if (!constraint.check(testAssignment)) return false;
        }
        return true;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Min-Conflicts Local Search (for overconstrained problems)
    // ─────────────────────────────────────────────────────────────────────────────
    
    minConflicts: function(csp, maxIterations = 10000) {
        const { variables, domains, constraints } = csp;
        
        // Random initial assignment
        const assignment = {};
        for (const v of variables) {
            assignment[v] = domains[v][Math.floor(Math.random() * domains[v].length)];
        }
        
        for (let i = 0; i < maxIterations; i++) {
            // Find conflicted variables
            const conflicted = variables.filter(v => this._countConflicts(v, assignment, constraints) > 0);
            
            if (conflicted.length === 0) {
                return { solved: true, assignment, iterations: i };
            }
            
            // Pick random conflicted variable
            const variable = conflicted[Math.floor(Math.random() * conflicted.length)];
            
            // Find value that minimizes conflicts
            let bestValue = assignment[variable];
            let minConflicts = this._countConflicts(variable, assignment, constraints);
            
            for (const value of domains[variable]) {
                const testAssignment = { ...assignment, [variable]: value };
                const conflicts = this._countConflicts(variable, testAssignment, constraints);
                
                if (conflicts < minConflicts) {
                    minConflicts = conflicts;
                    bestValue = value;
                }
            }
            
            assignment[variable] = bestValue;
        }
        
        return { solved: false, assignment, reason: 'Max iterations reached' };
    },
    
    _countConflicts: function(variable, assignment, constraints) {
        let count = 0;
        
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            
            const allAssigned = constraint.variables.every(v => v in assignment);
            if (!allAssigned) continue;
            
            if (!constraint.check(assignment)) count++;
        }
        
        return count;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Constraint Propagation (Maintaining Arc Consistency - MAC)
    // ─────────────────────────────────────────────────────────────────────────────
    
    mac: function(csp) {
        const { variables, domains, constraints } = csp;
        const domainsCopy = {};
        for (const v of variables) {
            domainsCopy[v] = [...domains[v]];
        }
        
        const assignment = {};
        return this._macBacktrack(assignment, variables, domainsCopy, constraints);
    },
    
    _macBacktrack: function(assignment, variables, domains, constraints) {
        if (Object.keys(assignment).length === variables.length) {
            return { solved: true, assignment: { ...assignment } };
        }
        
        const variable = this._selectVariableMRV(variables, assignment, domains);
        if (!variable) return { solved: false };
        
        for (const value of domains[variable]) {
            if (this._isConsistent(variable, value, assignment, constraints)) {
                assignment[variable] = value;
                
                // Make a copy of domains and propagate
                const newDomains = {};
                for (const v in domains) {
                    newDomains[v] = [...domains[v]];
                }
                newDomains[variable] = [value];
                
                // Run AC-3 with inference
                if (this.ac3(variables, newDomains, constraints)) {
                    const result = this._macBacktrack(assignment, variables, newDomains, constraints);
                    if (result.solved) return result;
                }
                
                delete assignment[variable];
            }
        }
        
        return { solved: false };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('csp.solve.enhanced', 'PRISM_CSP_ENHANCED_ENGINE.solve');
            PRISM_GATEWAY.register('csp.minConflicts', 'PRISM_CSP_ENHANCED_ENGINE.minConflicts');
            PRISM_GATEWAY.register('csp.mac', 'PRISM_CSP_ENHANCED_ENGINE.mac');
            PRISM_GATEWAY.register('csp.ac3', 'PRISM_CSP_ENHANCED_ENGINE.ac3');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 3: PRISM_MOTION_PLANNING_ENHANCED_ENGINE
// Enhanced Motion Planning for CNC & Robotics
// Source: MIT 16.410, Stanford CS 326
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_MOTION_PLANNING_ENHANCED_ENGINE = {
    name: 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE',
    version: '1.0.0',
    description: 'Enhanced motion planning with PRM, potential fields, and CNC applications',
    source: 'MIT 16.410, Stanford CS 326',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Probabilistic Roadmap (PRM)
    // ─────────────────────────────────────────────────────────────────────────────
    
    prm: function(config) {
        const {
            bounds,
            obstacles = [],
            numSamples = 500,
            connectionRadius,
            start,
            goal
        } = config;
        
        const radius = connectionRadius || Math.sqrt(
            (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY) / numSamples
        ) * 2;
        
        // Sample random configurations
        const samples = [start, goal];
        let attempts = 0;
        const maxAttempts = numSamples * 3;
        
        while (samples.length < numSamples && attempts < maxAttempts) {
            attempts++;
            const point = this._randomPoint(bounds);
            
            if (!this._inCollision(point, obstacles)) {
                samples.push(point);
            }
        }
        
        // Build roadmap
        const edges = [];
        for (let i = 0; i < samples.length; i++) {
            for (let j = i + 1; j < samples.length; j++) {
                const dist = this._distance(samples[i], samples[j]);
                if (dist <= radius && this._edgeValid(samples[i], samples[j], obstacles)) {
                    edges.push({ from: i, to: j, cost: dist });
                    edges.push({ from: j, to: i, cost: dist });
                }
            }
        }
        
        // Build adjacency list
        const graph = {
            nodes: samples.map((_, i) => i),
            getNeighbors: (node) => {
                return edges
                    .filter(e => e.from === node)
                    .map(e => ({ node: e.to, weight: e.cost }));
            }
        };
        
        // Find path using Dijkstra
        const result = PRISM_SEARCH_ENHANCED_ENGINE.dijkstra(graph, 0, 1);
        
        if (result.found) {
            return {
                found: true,
                path: result.path.map(i => samples[i]),
                cost: result.cost,
                roadmapNodes: samples.length,
                roadmapEdges: edges.length / 2
            };
        }
        
        return { found: false, roadmapNodes: samples.length };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Potential Fields Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    potentialFields: function(config) {
        const {
            start,
            goal,
            obstacles = [],
            attractiveGain = 1.0,
            repulsiveGain = 100.0,
            repulsiveThreshold = 50.0,
            stepSize = 1.0,
            maxIterations = 10000,
            goalThreshold = 1.0
        } = config;
        
        const path = [{ ...start }];
        let current = { ...start };
        
        for (let i = 0; i < maxIterations; i++) {
            // Check if goal reached
            if (this._distance(current, goal) < goalThreshold) {
                path.push({ ...goal });
                return { found: true, path, iterations: i };
            }
            
            // Calculate attractive force (toward goal)
            const attractive = {
                x: attractiveGain * (goal.x - current.x),
                y: attractiveGain * (goal.y - current.y),
                z: goal.z !== undefined ? attractiveGain * (goal.z - current.z) : 0
            };
            
            // Calculate repulsive force (away from obstacles)
            const repulsive = { x: 0, y: 0, z: 0 };
            
            for (const obs of obstacles) {
                const obsCenter = {
                    x: (obs.minX + obs.maxX) / 2,
                    y: (obs.minY + obs.maxY) / 2,
                    z: obs.minZ !== undefined ? (obs.minZ + obs.maxZ) / 2 : 0
                };
                
                const dist = this._distance(current, obsCenter);
                
                if (dist < repulsiveThreshold && dist > 0) {
                    const force = repulsiveGain * (1/dist - 1/repulsiveThreshold) * (1/(dist*dist));
                    repulsive.x += force * (current.x - obsCenter.x) / dist;
                    repulsive.y += force * (current.y - obsCenter.y) / dist;
                    if (current.z !== undefined) {
                        repulsive.z += force * (current.z - obsCenter.z) / dist;
                    }
                }
            }
            
            // Total force
            const total = {
                x: attractive.x + repulsive.x,
                y: attractive.y + repulsive.y,
                z: attractive.z + repulsive.z
            };
            
            // Normalize and step
            const magnitude = Math.sqrt(total.x*total.x + total.y*total.y + total.z*total.z);
            if (magnitude < 0.001) {
                // Local minimum detected
                return { found: false, path, reason: 'Local minimum', iterations: i };
            }
            
            current = {
                x: current.x + stepSize * total.x / magnitude,
                y: current.y + stepSize * total.y / magnitude,
                z: current.z !== undefined ? current.z + stepSize * total.z / magnitude : undefined
            };
            
            // Check collision
            if (this._inCollision(current, obstacles)) {
                return { found: false, path, reason: 'Collision', iterations: i };
            }
            
            path.push({ ...current });
        }
        
        return { found: false, path, reason: 'Max iterations', iterations: maxIterations };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // RRT-Connect (Bidirectional RRT)
    // ─────────────────────────────────────────────────────────────────────────────
    
    rrtConnect: function(config) {
        const {
            start,
            goal,
            bounds,
            obstacles = [],
            maxIterations = 5000,
            stepSize = 5.0
        } = config;
        
        const treeA = [{ point: start, parent: null }];
        const treeB = [{ point: goal, parent: null }];
        
        let currentTree = 'A';
        
        for (let i = 0; i < maxIterations; i++) {
            const tree = currentTree === 'A' ? treeA : treeB;
            const otherTree = currentTree === 'A' ? treeB : treeA;
            
            // Random sample (with goal bias)
            const target = Math.random() < 0.1 ? 
                otherTree[otherTree.length - 1].point : 
                this._randomPoint(bounds);
            
            // Extend tree toward target
            const nearest = this._findNearest(tree, target);
            const newPoint = this._steer(nearest.point, target, stepSize);
            
            if (!this._inCollision(newPoint, obstacles) && 
                this._edgeValid(nearest.point, newPoint, obstacles)) {
                
                const newNode = { point: newPoint, parent: nearest };
                tree.push(newNode);
                
                // Try to connect to other tree
                const nearestOther = this._findNearest(otherTree, newPoint);
                const dist = this._distance(newPoint, nearestOther.point);
                
                if (dist < stepSize * 2 && 
                    this._edgeValid(newPoint, nearestOther.point, obstacles)) {
                    
                    // Trees connected!
                    const pathA = this._extractPath(newNode);
                    const pathB = this._extractPath(nearestOther);
                    
                    const path = currentTree === 'A' ?
                        [...pathA, ...pathB.reverse()] :
                        [...pathB, ...pathA.reverse()];
                    
                    return {
                        found: true,
                        path,
                        iterations: i,
                        treeANodes: treeA.length,
                        treeBNodes: treeB.length
                    };
                }
            }
            
            // Swap trees
            currentTree = currentTree === 'A' ? 'B' : 'A';
        }
        
        return { found: false, iterations: maxIterations };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Path Smoothing (Post-processing)
    // ─────────────────────────────────────────────────────────────────────────────
    
    smoothPath: function(path, obstacles, maxIterations = 100) {
        let smoothed = [...path];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            if (smoothed.length <= 2) break;
            
            // Pick random segment
            const i = Math.floor(Math.random() * (smoothed.length - 2));
            
            // Try to shortcut
            if (this._edgeValid(smoothed[i], smoothed[i + 2], obstacles)) {
                smoothed.splice(i + 1, 1);
            }
        }
        
        return smoothed;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Functions
    // ─────────────────────────────────────────────────────────────────────────────
    
    _randomPoint: function(bounds) {
        return {
            x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
            y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
            z: bounds.minZ !== undefined ? 
                bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ) : undefined
        };
    },
    
    _distance: function(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z !== undefined && b.z !== undefined) ? a.z - b.z : 0;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },
    
    _findNearest: function(nodes, point) {
        return nodes.reduce((nearest, n) =>
            this._distance(n.point, point) < this._distance(nearest.point, point) ? n : nearest
        );
    },
    
    _steer: function(from, to, stepSize) {
        const dist = this._distance(from, to);
        if (dist <= stepSize) return { ...to };
        
        const ratio = stepSize / dist;
        return {
            x: from.x + (to.x - from.x) * ratio,
            y: from.y + (to.y - from.y) * ratio,
            z: from.z !== undefined ? from.z + ((to.z || 0) - (from.z || 0)) * ratio : undefined
        };
    },
    
    _inCollision: function(point, obstacles) {
        for (const obs of obstacles) {
            if (point.x >= obs.minX && point.x <= obs.maxX &&
                point.y >= obs.minY && point.y <= obs.maxY) {
                if (obs.minZ === undefined || 
                    (point.z >= obs.minZ && point.z <= obs.maxZ)) {
                    return true;
                }
            }
        }
        return false;
    },
    
    _edgeValid: function(from, to, obstacles, numChecks = 10) {
        for (let i = 0; i <= numChecks; i++) {
            const t = i / numChecks;
            const point = {
                x: from.x + t * (to.x - from.x),
                y: from.y + t * (to.y - from.y),
                z: from.z !== undefined ? from.z + t * ((to.z || 0) - (from.z || 0)) : undefined
            };
            if (this._inCollision(point, obstacles)) return false;
        }
        return true;
    },
    
    _extractPath: function(node) {
        const path = [];
        while (node) {
            path.unshift(node.point);
            node = node.parent;
        }
        return path;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('motion.prm', 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE.prm');
            PRISM_GATEWAY.register('motion.potentialFields', 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE.potentialFields');
            PRISM_GATEWAY.register('motion.rrtConnect', 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE.rrtConnect');
            PRISM_GATEWAY.register('motion.smoothPath', 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE.smoothPath');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 1 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession2Part1() {
    PRISM_SEARCH_ENHANCED_ENGINE.register();
    PRISM_CSP_ENHANCED_ENGINE.register();
    PRISM_MOTION_PLANNING_ENHANCED_ENGINE.register();
    
    console.log('[Session 2 Part 1] Registered 3 modules, 15 gateway routes');
    console.log('  - PRISM_SEARCH_ENHANCED_ENGINE: Dijkstra, UCS, Best-First, Weighted A*, Beam');
    console.log('  - PRISM_CSP_ENHANCED_ENGINE: MRV, LCV, Forward Checking, Min-Conflicts, MAC');
    console.log('  - PRISM_MOTION_PLANNING_ENHANCED_ENGINE: PRM, Potential Fields, RRT-Connect');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_SEARCH_ENHANCED_ENGINE = PRISM_SEARCH_ENHANCED_ENGINE;
    window.PRISM_CSP_ENHANCED_ENGINE = PRISM_CSP_ENHANCED_ENGINE;
    window.PRISM_MOTION_PLANNING_ENHANCED_ENGINE = PRISM_MOTION_PLANNING_ENHANCED_ENGINE;
    registerSession2Part1();
}

console.log('[Session 2 Part 1] Process Planning Enhanced - 3 modules loaded');
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 2: PROCESS PLANNING & SEARCH ENHANCEMENT - PART 2                          ║
 * ║ Manufacturing Applications + Probabilistic Reasoning                                      ║
 * ║ Source: MIT 16.410, MIT 2.008 (Manufacturing), Stanford CS 221                           ║
 * ║ Target: +1,000 lines | 4 Modules | 20+ Gateway Routes                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 4: PRISM_MANUFACTURING_SEARCH_ENGINE
// Search Algorithms Applied to Manufacturing Problems
// Source: MIT 2.008, MIT 16.410
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_MANUFACTURING_SEARCH_ENGINE = {
    name: 'PRISM_MANUFACTURING_SEARCH_ENGINE',
    version: '1.0.0',
    description: 'Manufacturing-specific search applications',
    source: 'MIT 2.008, MIT 16.410',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Optimal Hole Sequence Search (TSP-like)
    // Uses A* with MST heuristic
    // ─────────────────────────────────────────────────────────────────────────────
    
    optimizeHoleSequence: function(holes, options = {}) {
        const {
            startPosition = { x: 0, y: 0, z: 50 },
            rapidFeed = 10000, // mm/min
            maxSearchTime = 5000 // ms
        } = options;
        
        if (holes.length === 0) return { sequence: [], totalDistance: 0 };
        if (holes.length === 1) return { sequence: [0], totalDistance: this._distance3D(startPosition, holes[0]) };
        
        const startTime = Date.now();
        
        // For small problems, use exact A* with MST heuristic
        if (holes.length <= 12) {
            return this._astarTSP(holes, startPosition, maxSearchTime);
        }
        
        // For larger problems, use nearest neighbor + 2-opt improvement
        return this._nearestNeighborWithImprovement(holes, startPosition);
    },
    
    _astarTSP: function(holes, startPosition, maxTime) {
        const n = holes.length;
        const startState = {
            visited: new Set(),
            current: -1, // -1 = start position
            path: []
        };
        
        const pq = [{
            state: startState,
            g: 0,
            f: this._mstHeuristic(holes, new Set())
        }];
        
        const visited = new Set();
        const startTime = Date.now();
        
        while (pq.length > 0) {
            if (Date.now() - startTime > maxTime) {
                // Timeout - return best found
                return this._nearestNeighborWithImprovement(holes, startPosition);
            }
            
            // Get lowest f
            pq.sort((a, b) => a.f - b.f);
            const { state, g } = pq.shift();
            
            const stateKey = Array.from(state.visited).sort().join(',') + ':' + state.current;
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);
            
            // Goal check
            if (state.visited.size === n) {
                return {
                    sequence: state.path,
                    totalDistance: g,
                    method: 'A* with MST heuristic',
                    nodesExpanded: visited.size
                };
            }
            
            // Expand
            const currentPos = state.current === -1 ? startPosition : holes[state.current];
            
            for (let i = 0; i < n; i++) {
                if (state.visited.has(i)) continue;
                
                const newVisited = new Set(state.visited);
                newVisited.add(i);
                
                const stepCost = this._distance3D(currentPos, holes[i]);
                const newG = g + stepCost;
                const h = this._mstHeuristic(holes, newVisited);
                
                pq.push({
                    state: {
                        visited: newVisited,
                        current: i,
                        path: [...state.path, i]
                    },
                    g: newG,
                    f: newG + h
                });
            }
        }
        
        return { sequence: [], totalDistance: Infinity };
    },
    
    _mstHeuristic: function(holes, visited) {
        // Minimum spanning tree of unvisited nodes
        const unvisited = [];
        for (let i = 0; i < holes.length; i++) {
            if (!visited.has(i)) unvisited.push(i);
        }
        
        if (unvisited.length <= 1) return 0;
        
        // Prim's algorithm for MST
        const inMST = new Set([unvisited[0]]);
        let mstWeight = 0;
        
        while (inMST.size < unvisited.length) {
            let minEdge = Infinity;
            let nextNode = -1;
            
            for (const u of inMST) {
                for (const v of unvisited) {
                    if (!inMST.has(v)) {
                        const dist = this._distance3D(holes[u], holes[v]);
                        if (dist < minEdge) {
                            minEdge = dist;
                            nextNode = v;
                        }
                    }
                }
            }
            
            if (nextNode !== -1) {
                inMST.add(nextNode);
                mstWeight += minEdge;
            }
        }
        
        return mstWeight;
    },
    
    _nearestNeighborWithImprovement: function(holes, startPosition) {
        // Nearest neighbor construction
        const n = holes.length;
        const visited = new Set();
        const sequence = [];
        let currentPos = startPosition;
        let totalDistance = 0;
        
        for (let i = 0; i < n; i++) {
            let nearestIdx = -1;
            let nearestDist = Infinity;
            
            for (let j = 0; j < n; j++) {
                if (!visited.has(j)) {
                    const dist = this._distance3D(currentPos, holes[j]);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = j;
                    }
                }
            }
            
            visited.add(nearestIdx);
            sequence.push(nearestIdx);
            totalDistance += nearestDist;
            currentPos = holes[nearestIdx];
        }
        
        // 2-opt improvement
        const improved = this._twoOpt(sequence, holes, startPosition);
        
        return {
            sequence: improved.sequence,
            totalDistance: improved.totalDistance,
            method: 'Nearest Neighbor + 2-opt'
        };
    },
    
    _twoOpt: function(sequence, holes, startPosition) {
        let improved = true;
        let bestSequence = [...sequence];
        let bestDistance = this._calculateTourDistance(bestSequence, holes, startPosition);
        
        while (improved) {
            improved = false;
            
            for (let i = 0; i < bestSequence.length - 1; i++) {
                for (let j = i + 2; j < bestSequence.length; j++) {
                    // Try reversing segment [i+1, j]
                    const newSequence = [
                        ...bestSequence.slice(0, i + 1),
                        ...bestSequence.slice(i + 1, j + 1).reverse(),
                        ...bestSequence.slice(j + 1)
                    ];
                    
                    const newDistance = this._calculateTourDistance(newSequence, holes, startPosition);
                    
                    if (newDistance < bestDistance - 0.001) {
                        bestSequence = newSequence;
                        bestDistance = newDistance;
                        improved = true;
                    }
                }
            }
        }
        
        return { sequence: bestSequence, totalDistance: bestDistance };
    },
    
    _calculateTourDistance: function(sequence, holes, startPosition) {
        let distance = this._distance3D(startPosition, holes[sequence[0]]);
        
        for (let i = 0; i < sequence.length - 1; i++) {
            distance += this._distance3D(holes[sequence[i]], holes[sequence[i + 1]]);
        }
        
        return distance;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Operation Sequencing (Precedence-constrained scheduling)
    // ─────────────────────────────────────────────────────────────────────────────
    
    sequenceOperations: function(operations, precedenceConstraints, objective = 'makespan') {
        // operations: [{id, duration, machine, setup_time}]
        // precedenceConstraints: [{before, after}]
        
        // Build precedence graph
        const inDegree = {};
        const successors = {};
        
        for (const op of operations) {
            inDegree[op.id] = 0;
            successors[op.id] = [];
        }
        
        for (const { before, after } of precedenceConstraints) {
            successors[before].push(after);
            inDegree[after]++;
        }
        
        // Topological sort with priority
        const ready = operations.filter(op => inDegree[op.id] === 0);
        const sequence = [];
        const opMap = new Map(operations.map(op => [op.id, op]));
        
        // Priority function (critical path heuristic)
        const priority = {};
        const calculatePriority = (id) => {
            if (priority[id] !== undefined) return priority[id];
            
            const op = opMap.get(id);
            let maxSuccessorPriority = 0;
            
            for (const succ of successors[id]) {
                maxSuccessorPriority = Math.max(maxSuccessorPriority, calculatePriority(succ));
            }
            
            priority[id] = op.duration + maxSuccessorPriority;
            return priority[id];
        };
        
        for (const op of operations) {
            calculatePriority(op.id);
        }
        
        // Process in priority order
        while (ready.length > 0) {
            // Sort by priority (longest remaining path first)
            ready.sort((a, b) => priority[b.id] - priority[a.id]);
            
            const op = ready.shift();
            sequence.push(op.id);
            
            for (const succ of successors[op.id]) {
                inDegree[succ]--;
                if (inDegree[succ] === 0) {
                    ready.push(opMap.get(succ));
                }
            }
        }
        
        // Verify all operations scheduled
        if (sequence.length !== operations.length) {
            return { success: false, reason: 'Cyclic dependency detected' };
        }
        
        // Calculate makespan
        const startTimes = {};
        const endTimes = {};
        
        for (const id of sequence) {
            const op = opMap.get(id);
            let earliestStart = 0;
            
            // Find latest predecessor end time
            for (const { before, after } of precedenceConstraints) {
                if (after === id && endTimes[before] !== undefined) {
                    earliestStart = Math.max(earliestStart, endTimes[before]);
                }
            }
            
            startTimes[id] = earliestStart;
            endTimes[id] = earliestStart + op.duration;
        }
        
        const makespan = Math.max(...Object.values(endTimes));
        
        return {
            success: true,
            sequence,
            startTimes,
            endTimes,
            makespan,
            criticalPath: this._findCriticalPath(operations, precedenceConstraints, endTimes)
        };
    },
    
    _findCriticalPath: function(operations, constraints, endTimes) {
        const makespan = Math.max(...Object.values(endTimes));
        const opMap = new Map(operations.map(op => [op.id, op]));
        
        // Find operations that end at makespan
        const critical = [];
        for (const op of operations) {
            if (Math.abs(endTimes[op.id] - makespan) < 0.001) {
                critical.push(op.id);
            }
        }
        
        return critical;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Change Optimization
    // ─────────────────────────────────────────────────────────────────────────────
    
    optimizeToolChanges: function(operations, toolLibrary, magazineCapacity) {
        // Group operations by tool
        const toolOps = new Map();
        for (const op of operations) {
            if (!toolOps.has(op.tool)) {
                toolOps.set(op.tool, []);
            }
            toolOps.get(op.tool).push(op);
        }
        
        // Bin packing to minimize tool changes
        const uniqueTools = [...toolOps.keys()];
        
        if (uniqueTools.length <= magazineCapacity) {
            // All tools fit - no optimization needed
            return {
                success: true,
                sequences: [operations.map(op => op.id)],
                toolChanges: 0,
                toolSets: [uniqueTools]
            };
        }
        
        // Use first-fit decreasing for tool grouping
        const sequences = [];
        const toolSets = [];
        const assigned = new Set();
        
        // Sort tools by number of operations (most used first)
        uniqueTools.sort((a, b) => toolOps.get(b).length - toolOps.get(a).length);
        
        while (assigned.size < uniqueTools.length) {
            const currentSet = [];
            
            for (const tool of uniqueTools) {
                if (!assigned.has(tool) && currentSet.length < magazineCapacity) {
                    currentSet.push(tool);
                    assigned.add(tool);
                }
            }
            
            toolSets.push(currentSet);
            
            // Sequence operations for this tool set
            const setOps = operations.filter(op => currentSet.includes(op.tool));
            sequences.push(setOps.map(op => op.id));
        }
        
        return {
            success: true,
            sequences,
            toolChanges: toolSets.length - 1,
            toolSets
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Setup Planning (CSP-based)
    // ─────────────────────────────────────────────────────────────────────────────
    
    planSetups: function(features, fixtures, constraints) {
        // Model as CSP: assign each feature to a setup
        const csp = {
            variables: features.map(f => f.id),
            domains: {},
            constraints: []
        };
        
        // Domain is possible setups (based on accessibility)
        for (const feature of features) {
            csp.domains[feature.id] = fixtures
                .filter(fix => this._isAccessible(feature, fix))
                .map(fix => fix.id);
        }
        
        // Add constraints
        for (const c of constraints) {
            if (c.type === 'same_setup') {
                // Features must be in same setup
                csp.constraints.push({
                    variables: [c.feature1, c.feature2],
                    check: (assignment) => assignment[c.feature1] === assignment[c.feature2]
                });
            } else if (c.type === 'different_setup') {
                // Features must be in different setups
                csp.constraints.push({
                    variables: [c.feature1, c.feature2],
                    check: (assignment) => assignment[c.feature1] !== assignment[c.feature2]
                });
            } else if (c.type === 'before') {
                // Feature1 setup must come before feature2 setup
                // (This is handled in post-processing)
            }
        }
        
        // Solve CSP
        const result = PRISM_CSP_ENHANCED_ENGINE.solve(csp);
        
        if (!result.solved) {
            return { success: false, reason: 'No valid setup plan found' };
        }
        
        // Group features by setup
        const setups = {};
        for (const [featureId, fixtureId] of Object.entries(result.assignment)) {
            if (!setups[fixtureId]) {
                setups[fixtureId] = [];
            }
            setups[fixtureId].push(featureId);
        }
        
        return {
            success: true,
            assignment: result.assignment,
            setups,
            numSetups: Object.keys(setups).length
        };
    },
    
    _isAccessible: function(feature, fixture) {
        // Simplified accessibility check
        // In real implementation, would check tool approach directions
        return feature.accessDirection !== fixture.blockingDirection;
    },
    
    _distance3D: function(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z || 0) - (b.z || 0);
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('mfg.optimizeHoleSequence', 'PRISM_MANUFACTURING_SEARCH_ENGINE.optimizeHoleSequence');
            PRISM_GATEWAY.register('mfg.sequenceOperations', 'PRISM_MANUFACTURING_SEARCH_ENGINE.sequenceOperations');
            PRISM_GATEWAY.register('mfg.optimizeToolChanges', 'PRISM_MANUFACTURING_SEARCH_ENGINE.optimizeToolChanges');
            PRISM_GATEWAY.register('mfg.planSetups', 'PRISM_MANUFACTURING_SEARCH_ENGINE.planSetups');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 5: PRISM_PROBABILISTIC_REASONING_ENGINE
// Enhanced Probabilistic Models for Manufacturing
// Source: MIT 16.410, Stanford CS 221
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_PROBABILISTIC_REASONING_ENGINE = {
    name: 'PRISM_PROBABILISTIC_REASONING_ENGINE',
    version: '1.0.0',
    description: 'Probabilistic reasoning with HMM, particle filters, and Bayesian networks',
    source: 'MIT 16.410, Stanford CS 221',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Particle Filter (Sequential Monte Carlo)
    // ─────────────────────────────────────────────────────────────────────────────
    
    createParticleFilter: function(config) {
        const {
            numParticles = 1000,
            transitionModel, // function(state, action) => newState
            observationModel, // function(state, observation) => likelihood
            initialDistribution // function() => state
        } = config;
        
        return {
            particles: [],
            weights: [],
            
            initialize: function() {
                this.particles = [];
                this.weights = [];
                
                for (let i = 0; i < numParticles; i++) {
                    this.particles.push(initialDistribution());
                    this.weights.push(1 / numParticles);
                }
                
                return this;
            },
            
            predict: function(action) {
                this.particles = this.particles.map(p => transitionModel(p, action));
                return this;
            },
            
            update: function(observation) {
                // Update weights based on observation
                for (let i = 0; i < this.particles.length; i++) {
                    this.weights[i] *= observationModel(this.particles[i], observation);
                }
                
                // Normalize
                const sum = this.weights.reduce((a, b) => a + b, 0);
                if (sum > 0) {
                    this.weights = this.weights.map(w => w / sum);
                }
                
                // Resample if effective sample size too low
                const ess = 1 / this.weights.reduce((a, w) => a + w * w, 0);
                if (ess < numParticles / 2) {
                    this._resample();
                }
                
                return this;
            },
            
            _resample: function() {
                const newParticles = [];
                const cumWeights = [];
                let cumSum = 0;
                
                for (const w of this.weights) {
                    cumSum += w;
                    cumWeights.push(cumSum);
                }
                
                for (let i = 0; i < numParticles; i++) {
                    const r = Math.random();
                    let idx = cumWeights.findIndex(cw => cw >= r);
                    if (idx === -1) idx = numParticles - 1;
                    
                    newParticles.push({ ...this.particles[idx] });
                }
                
                this.particles = newParticles;
                this.weights = new Array(numParticles).fill(1 / numParticles);
            },
            
            getEstimate: function() {
                // Weighted mean for continuous states
                const estimate = {};
                
                if (this.particles.length === 0) return null;
                
                const keys = Object.keys(this.particles[0]);
                for (const key of keys) {
                    if (typeof this.particles[0][key] === 'number') {
                        estimate[key] = 0;
                        for (let i = 0; i < this.particles.length; i++) {
                            estimate[key] += this.weights[i] * this.particles[i][key];
                        }
                    }
                }
                
                return estimate;
            },
            
            getVariance: function() {
                const mean = this.getEstimate();
                const variance = {};
                
                const keys = Object.keys(this.particles[0]);
                for (const key of keys) {
                    if (typeof this.particles[0][key] === 'number') {
                        variance[key] = 0;
                        for (let i = 0; i < this.particles.length; i++) {
                            const diff = this.particles[i][key] - mean[key];
                            variance[key] += this.weights[i] * diff * diff;
                        }
                    }
                }
                
                return variance;
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Tool Wear Particle Filter
    // ─────────────────────────────────────────────────────────────────────────────
    
    createToolWearFilter: function(initialWear = 0, wearRate = 0.001, observationNoise = 0.01) {
        return this.createParticleFilter({
            numParticles: 500,
            
            transitionModel: (state, action) => {
                // Action is cutting time in minutes
                const newWear = state.wear + action * wearRate * (0.8 + 0.4 * Math.random());
                return { wear: Math.max(0, newWear) };
            },
            
            observationModel: (state, observation) => {
                // Observation is measured wear
                const diff = observation - state.wear;
                return Math.exp(-diff * diff / (2 * observationNoise * observationNoise));
            },
            
            initialDistribution: () => ({
                wear: initialWear + (Math.random() - 0.5) * 0.02
            })
        });
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Enhanced HMM with Baum-Welch Learning
    // ─────────────────────────────────────────────────────────────────────────────
    
    baumWelch: function(hmm, observations, maxIterations = 100, tolerance = 1e-6) {
        const { states, observationSymbols, initial, transition, emission } = hmm;
        const N = states.length;
        const M = observationSymbols.length;
        const T = observations.length;
        
        // Map observations to indices
        const obsIdx = observations.map(o => observationSymbols.indexOf(o));
        
        let prevLogLikelihood = -Infinity;
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // E-step: Forward-Backward
            const { alpha, beta, logLikelihood } = this._forwardBackward(
                N, T, obsIdx, initial, transition, emission
            );
            
            // Check convergence
            if (Math.abs(logLikelihood - prevLogLikelihood) < tolerance) {
                return { converged: true, iterations: iter, hmm: { states, observationSymbols, initial, transition, emission } };
            }
            prevLogLikelihood = logLikelihood;
            
            // Compute gamma and xi
            const gamma = this._computeGamma(N, T, alpha, beta);
            const xi = this._computeXi(N, T, alpha, beta, transition, emission, obsIdx);
            
            // M-step: Update parameters
            // Update initial
            for (let i = 0; i < N; i++) {
                initial[i] = gamma[0][i];
            }
            
            // Update transition
            for (let i = 0; i < N; i++) {
                const gammaSum = gamma.slice(0, -1).reduce((sum, g) => sum + g[i], 0);
                for (let j = 0; j < N; j++) {
                    const xiSum = xi.reduce((sum, x) => sum + x[i][j], 0);
                    transition[i][j] = gammaSum > 0 ? xiSum / gammaSum : 1 / N;
                }
            }
            
            // Update emission
            for (let i = 0; i < N; i++) {
                const gammaSum = gamma.reduce((sum, g) => sum + g[i], 0);
                for (let k = 0; k < M; k++) {
                    let obsSum = 0;
                    for (let t = 0; t < T; t++) {
                        if (obsIdx[t] === k) obsSum += gamma[t][i];
                    }
                    emission[i][k] = gammaSum > 0 ? obsSum / gammaSum : 1 / M;
                }
            }
        }
        
        return { converged: false, iterations: maxIterations, hmm: { states, observationSymbols, initial, transition, emission } };
    },
    
    _forwardBackward: function(N, T, obsIdx, initial, transition, emission) {
        // Forward pass
        const alpha = [];
        let scaling = [];
        
        // Initialize
        alpha[0] = [];
        let c0 = 0;
        for (let i = 0; i < N; i++) {
            alpha[0][i] = initial[i] * emission[i][obsIdx[0]];
            c0 += alpha[0][i];
        }
        scaling[0] = c0;
        for (let i = 0; i < N; i++) alpha[0][i] /= c0;
        
        // Forward
        for (let t = 1; t < T; t++) {
            alpha[t] = [];
            let ct = 0;
            for (let j = 0; j < N; j++) {
                alpha[t][j] = 0;
                for (let i = 0; i < N; i++) {
                    alpha[t][j] += alpha[t-1][i] * transition[i][j];
                }
                alpha[t][j] *= emission[j][obsIdx[t]];
                ct += alpha[t][j];
            }
            scaling[t] = ct;
            for (let j = 0; j < N; j++) alpha[t][j] /= ct;
        }
        
        // Backward pass
        const beta = [];
        beta[T-1] = new Array(N).fill(1);
        
        for (let t = T - 2; t >= 0; t--) {
            beta[t] = [];
            for (let i = 0; i < N; i++) {
                beta[t][i] = 0;
                for (let j = 0; j < N; j++) {
                    beta[t][i] += transition[i][j] * emission[j][obsIdx[t+1]] * beta[t+1][j];
                }
                beta[t][i] /= scaling[t+1];
            }
        }
        
        const logLikelihood = scaling.reduce((sum, c) => sum + Math.log(c), 0);
        
        return { alpha, beta, logLikelihood, scaling };
    },
    
    _computeGamma: function(N, T, alpha, beta) {
        const gamma = [];
        for (let t = 0; t < T; t++) {
            gamma[t] = [];
            let sum = 0;
            for (let i = 0; i < N; i++) {
                gamma[t][i] = alpha[t][i] * beta[t][i];
                sum += gamma[t][i];
            }
            for (let i = 0; i < N; i++) {
                gamma[t][i] /= sum;
            }
        }
        return gamma;
    },
    
    _computeXi: function(N, T, alpha, beta, transition, emission, obsIdx) {
        const xi = [];
        for (let t = 0; t < T - 1; t++) {
            xi[t] = [];
            let sum = 0;
            for (let i = 0; i < N; i++) {
                xi[t][i] = [];
                for (let j = 0; j < N; j++) {
                    xi[t][i][j] = alpha[t][i] * transition[i][j] * emission[j][obsIdx[t+1]] * beta[t+1][j];
                    sum += xi[t][i][j];
                }
            }
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    xi[t][i][j] /= sum;
                }
            }
        }
        return xi;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Enhanced MCTS with UCT
    // ─────────────────────────────────────────────────────────────────────────────
    
    mctsUCT: function(config) {
        const {
            rootState,
            getActions,
            applyAction,
            isTerminal,
            getReward,
            iterations = 1000,
            explorationConstant = Math.sqrt(2),
            simulationDepth = 50
        } = config;
        
        const root = {
            state: rootState,
            parent: null,
            action: null,
            children: [],
            visits: 0,
            totalReward: 0,
            untriedActions: getActions(rootState)
        };
        
        for (let i = 0; i < iterations; i++) {
            // Selection
            let node = root;
            while (node.untriedActions.length === 0 && node.children.length > 0) {
                node = this._selectBestChild(node, explorationConstant);
            }
            
            // Expansion
            if (node.untriedActions.length > 0 && !isTerminal(node.state)) {
                const action = node.untriedActions.pop();
                const newState = applyAction(node.state, action);
                const child = {
                    state: newState,
                    parent: node,
                    action: action,
                    children: [],
                    visits: 0,
                    totalReward: 0,
                    untriedActions: getActions(newState)
                };
                node.children.push(child);
                node = child;
            }
            
            // Simulation
            let simState = node.state;
            let depth = 0;
            while (!isTerminal(simState) && depth < simulationDepth) {
                const actions = getActions(simState);
                if (actions.length === 0) break;
                const action = actions[Math.floor(Math.random() * actions.length)];
                simState = applyAction(simState, action);
                depth++;
            }
            const reward = getReward(simState);
            
            // Backpropagation
            while (node !== null) {
                node.visits++;
                node.totalReward += reward;
                node = node.parent;
            }
        }
        
        // Return best action (most visited)
        if (root.children.length === 0) {
            return { bestAction: null, visits: root.visits };
        }
        
        const bestChild = root.children.reduce((best, child) =>
            child.visits > best.visits ? child : best
        );
        
        return {
            bestAction: bestChild.action,
            confidence: bestChild.visits / root.visits,
            expectedReward: bestChild.totalReward / bestChild.visits,
            rootVisits: root.visits,
            actionStats: root.children.map(c => ({
                action: c.action,
                visits: c.visits,
                avgReward: c.totalReward / c.visits
            }))
        };
    },
    
    _selectBestChild: function(node, c) {
        return node.children.reduce((best, child) => {
            const exploitation = child.totalReward / child.visits;
            const exploration = c * Math.sqrt(Math.log(node.visits) / child.visits);
            const ucb = exploitation + exploration;
            
            const bestExploitation = best.totalReward / best.visits;
            const bestExploration = c * Math.sqrt(Math.log(node.visits) / best.visits);
            const bestUcb = bestExploitation + bestExploration;
            
            return ucb > bestUcb ? child : best;
        });
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('prob.particleFilter.create', 'PRISM_PROBABILISTIC_REASONING_ENGINE.createParticleFilter');
            PRISM_GATEWAY.register('prob.toolWearFilter', 'PRISM_PROBABILISTIC_REASONING_ENGINE.createToolWearFilter');
            PRISM_GATEWAY.register('prob.hmm.baumWelch', 'PRISM_PROBABILISTIC_REASONING_ENGINE.baumWelch');
            PRISM_GATEWAY.register('prob.mcts.uct', 'PRISM_PROBABILISTIC_REASONING_ENGINE.mctsUCT');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 6: PRISM_JOB_SHOP_SCHEDULING_ENGINE  
// Job Shop Scheduling with Advanced Methods
// Source: MIT 15.053, Operations Research
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_JOB_SHOP_SCHEDULING_ENGINE = {
    name: 'PRISM_JOB_SHOP_SCHEDULING_ENGINE',
    version: '1.0.0',
    description: 'Job shop scheduling with dispatching rules and optimization',
    source: 'MIT 15.053, Operations Research',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dispatching Rules
    // ─────────────────────────────────────────────────────────────────────────────
    
    dispatchingRules: {
        FIFO: (jobs) => jobs.sort((a, b) => a.arrivalTime - b.arrivalTime),
        SPT: (jobs) => jobs.sort((a, b) => a.processingTime - b.processingTime),
        LPT: (jobs) => jobs.sort((a, b) => b.processingTime - a.processingTime),
        EDD: (jobs) => jobs.sort((a, b) => a.dueDate - b.dueDate),
        CR: (jobs, currentTime) => jobs.sort((a, b) => {
            const crA = (a.dueDate - currentTime) / a.remainingTime;
            const crB = (b.dueDate - currentTime) / b.remainingTime;
            return crA - crB;
        }),
        SLACK: (jobs, currentTime) => jobs.sort((a, b) => {
            const slackA = a.dueDate - currentTime - a.remainingTime;
            const slackB = b.dueDate - currentTime - b.remainingTime;
            return slackA - slackB;
        })
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Single Machine Scheduling
    // ─────────────────────────────────────────────────────────────────────────────
    
    scheduleSingleMachine: function(jobs, rule = 'SPT', objective = 'makespan') {
        const sortedJobs = [...jobs];
        
        if (this.dispatchingRules[rule]) {
            this.dispatchingRules[rule](sortedJobs, 0);
        }
        
        let currentTime = 0;
        const schedule = [];
        let totalFlowTime = 0;
        let totalTardiness = 0;
        let tardinessCount = 0;
        
        for (const job of sortedJobs) {
            const startTime = Math.max(currentTime, job.arrivalTime || 0);
            const endTime = startTime + job.processingTime;
            
            const tardiness = Math.max(0, endTime - job.dueDate);
            if (tardiness > 0) tardinessCount++;
            
            schedule.push({
                jobId: job.id,
                startTime,
                endTime,
                tardiness,
                flowTime: endTime - (job.arrivalTime || 0)
            });
            
            totalFlowTime += endTime - (job.arrivalTime || 0);
            totalTardiness += tardiness;
            currentTime = endTime;
        }
        
        return {
            schedule,
            makespan: currentTime,
            totalFlowTime,
            averageFlowTime: totalFlowTime / jobs.length,
            totalTardiness,
            numberOfTardyJobs: tardinessCount,
            rule
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Flow Shop Scheduling (Johnson's Algorithm for 2 machines)
    // ─────────────────────────────────────────────────────────────────────────────
    
    johnsonsAlgorithm: function(jobs) {
        // jobs: [{id, machine1Time, machine2Time}]
        const U = []; // Jobs with min time on machine 1
        const V = []; // Jobs with min time on machine 2
        
        for (const job of jobs) {
            if (job.machine1Time <= job.machine2Time) {
                U.push(job);
            } else {
                V.push(job);
            }
        }
        
        // Sort U by machine1Time ascending
        U.sort((a, b) => a.machine1Time - b.machine1Time);
        
        // Sort V by machine2Time descending
        V.sort((a, b) => b.machine2Time - a.machine2Time);
        
        const sequence = [...U, ...V];
        
        // Calculate schedule
        let m1End = 0;
        let m2End = 0;
        const schedule = [];
        
        for (const job of sequence) {
            const m1Start = m1End;
            m1End = m1Start + job.machine1Time;
            
            const m2Start = Math.max(m1End, m2End);
            m2End = m2Start + job.machine2Time;
            
            schedule.push({
                jobId: job.id,
                machine1: { start: m1Start, end: m1End },
                machine2: { start: m2Start, end: m2End }
            });
        }
        
        return {
            sequence: sequence.map(j => j.id),
            schedule,
            makespan: m2End
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Job Shop Scheduling (Dispatching-based simulation)
    // ─────────────────────────────────────────────────────────────────────────────
    
    scheduleJobShop: function(jobs, machines, rule = 'SPT') {
        // jobs: [{id, operations: [{machine, processingTime}]}]
        // machines: [{id}]
        
        const machineQueues = {};
        const machineAvailable = {};
        for (const m of machines) {
            machineQueues[m.id] = [];
            machineAvailable[m.id] = 0;
        }
        
        // Track job progress
        const jobProgress = {};
        for (const job of jobs) {
            jobProgress[job.id] = {
                nextOpIndex: 0,
                available: job.arrivalTime || 0
            };
        }
        
        const schedule = [];
        let completedOps = 0;
        const totalOps = jobs.reduce((sum, j) => sum + j.operations.length, 0);
        let currentTime = 0;
        const maxTime = 100000;
        
        while (completedOps < totalOps && currentTime < maxTime) {
            // Add ready operations to machine queues
            for (const job of jobs) {
                const progress = jobProgress[job.id];
                if (progress.nextOpIndex < job.operations.length) {
                    const op = job.operations[progress.nextOpIndex];
                    if (progress.available <= currentTime) {
                        // Operation is ready
                        const queueItem = {
                            jobId: job.id,
                            opIndex: progress.nextOpIndex,
                            processingTime: op.processingTime,
                            arrivalTime: progress.available,
                            dueDate: job.dueDate || Infinity,
                            remainingTime: job.operations
                                .slice(progress.nextOpIndex)
                                .reduce((sum, o) => sum + o.processingTime, 0)
                        };
                        
                        if (!machineQueues[op.machine].some(q => 
                            q.jobId === job.id && q.opIndex === progress.nextOpIndex)) {
                            machineQueues[op.machine].push(queueItem);
                        }
                    }
                }
            }
            
            // Process each machine
            for (const m of machines) {
                if (machineAvailable[m.id] <= currentTime && machineQueues[m.id].length > 0) {
                    // Apply dispatching rule
                    const queue = machineQueues[m.id];
                    this.dispatchingRules[rule](queue, currentTime);
                    
                    const selected = queue.shift();
                    const startTime = currentTime;
                    const endTime = startTime + selected.processingTime;
                    
                    schedule.push({
                        jobId: selected.jobId,
                        operationIndex: selected.opIndex,
                        machine: m.id,
                        startTime,
                        endTime
                    });
                    
                    machineAvailable[m.id] = endTime;
                    jobProgress[selected.jobId].nextOpIndex++;
                    jobProgress[selected.jobId].available = endTime;
                    completedOps++;
                }
            }
            
            // Advance time
            const nextEvents = [
                ...Object.values(machineAvailable).filter(t => t > currentTime),
                ...Object.values(jobProgress).map(p => p.available).filter(t => t > currentTime)
            ];
            
            if (nextEvents.length > 0) {
                currentTime = Math.min(...nextEvents);
            } else {
                currentTime++;
            }
        }
        
        const makespan = Math.max(...schedule.map(s => s.endTime));
        
        return {
            schedule,
            makespan,
            rule,
            completedOperations: completedOps,
            totalOperations: totalOps
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('schedule.singleMachine', 'PRISM_JOB_SHOP_SCHEDULING_ENGINE.scheduleSingleMachine');
            PRISM_GATEWAY.register('schedule.johnsons', 'PRISM_JOB_SHOP_SCHEDULING_ENGINE.johnsonsAlgorithm');
            PRISM_GATEWAY.register('schedule.jobShop', 'PRISM_JOB_SHOP_SCHEDULING_ENGINE.scheduleJobShop');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 2 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession2Part2() {
    PRISM_MANUFACTURING_SEARCH_ENGINE.register();
    PRISM_PROBABILISTIC_REASONING_ENGINE.register();
    PRISM_JOB_SHOP_SCHEDULING_ENGINE.register();
    
    console.log('[Session 2 Part 2] Registered 3 modules, 11 gateway routes');
    console.log('  - PRISM_MANUFACTURING_SEARCH_ENGINE: Hole sequencing, Operation sequencing, Tool changes');
    console.log('  - PRISM_PROBABILISTIC_REASONING_ENGINE: Particle filter, Baum-Welch, MCTS-UCT');
    console.log('  - PRISM_JOB_SHOP_SCHEDULING_ENGINE: Dispatching rules, Johnsons, Job shop');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_MANUFACTURING_SEARCH_ENGINE = PRISM_MANUFACTURING_SEARCH_ENGINE;
    window.PRISM_PROBABILISTIC_REASONING_ENGINE = PRISM_PROBABILISTIC_REASONING_ENGINE;
    window.PRISM_JOB_SHOP_SCHEDULING_ENGINE = PRISM_JOB_SHOP_SCHEDULING_ENGINE;
    registerSession2Part2();
}

console.log('[Session 2 Part 2] Manufacturing Applications loaded - 3 modules');
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 2: PROCESS PLANNING & SEARCH ENHANCEMENT - PART 3                          ║
 * ║ Graph Algorithms + Path Optimization + Decision Making                                    ║
 * ║ Source: MIT 6.046J, MIT 16.410, Stanford CS 161                                          ║
 * ║ Target: +700 lines | 3 Modules | 15+ Gateway Routes                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 7: PRISM_GRAPH_ALGORITHMS_ENGINE
// Essential Graph Algorithms for Manufacturing
// Source: MIT 6.046J - Design and Analysis of Algorithms
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_GRAPH_ALGORITHMS_ENGINE = {
    name: 'PRISM_GRAPH_ALGORITHMS_ENGINE',
    version: '1.0.0',
    description: 'Graph algorithms: MST, shortest paths, topological sort, SCC',
    source: 'MIT 6.046J, Stanford CS 161',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Kruskal's Minimum Spanning Tree
    // ─────────────────────────────────────────────────────────────────────────────
    
    kruskalMST: function(nodes, edges) {
        // edges: [{from, to, weight}]
        const parent = {};
        const rank = {};
        
        // Union-Find helpers
        const find = (x) => {
            if (parent[x] !== x) {
                parent[x] = find(parent[x]); // Path compression
            }
            return parent[x];
        };
        
        const union = (x, y) => {
            const px = find(x);
            const py = find(y);
            
            if (px === py) return false;
            
            // Union by rank
            if (rank[px] < rank[py]) {
                parent[px] = py;
            } else if (rank[px] > rank[py]) {
                parent[py] = px;
            } else {
                parent[py] = px;
                rank[px]++;
            }
            return true;
        };
        
        // Initialize
        for (const node of nodes) {
            parent[node] = node;
            rank[node] = 0;
        }
        
        // Sort edges by weight
        const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
        
        const mstEdges = [];
        let totalWeight = 0;
        
        for (const edge of sortedEdges) {
            if (union(edge.from, edge.to)) {
                mstEdges.push(edge);
                totalWeight += edge.weight;
                
                if (mstEdges.length === nodes.length - 1) break;
            }
        }
        
        return {
            edges: mstEdges,
            totalWeight,
            isConnected: mstEdges.length === nodes.length - 1
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Prim's Minimum Spanning Tree
    // ─────────────────────────────────────────────────────────────────────────────
    
    primMST: function(nodes, adjacencyList) {
        // adjacencyList: {node: [{neighbor, weight}]}
        if (nodes.length === 0) return { edges: [], totalWeight: 0 };
        
        const inMST = new Set();
        const mstEdges = [];
        let totalWeight = 0;
        
        // Priority queue: {node, fromNode, weight}
        const pq = [{ node: nodes[0], fromNode: null, weight: 0 }];
        
        while (pq.length > 0 && inMST.size < nodes.length) {
            // Get min weight edge
            pq.sort((a, b) => a.weight - b.weight);
            const { node, fromNode, weight } = pq.shift();
            
            if (inMST.has(node)) continue;
            inMST.add(node);
            
            if (fromNode !== null) {
                mstEdges.push({ from: fromNode, to: node, weight });
                totalWeight += weight;
            }
            
            // Add neighbors to queue
            const neighbors = adjacencyList[node] || [];
            for (const { neighbor, weight: w } of neighbors) {
                if (!inMST.has(neighbor)) {
                    pq.push({ node: neighbor, fromNode: node, weight: w });
                }
            }
        }
        
        return {
            edges: mstEdges,
            totalWeight,
            isConnected: inMST.size === nodes.length
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Bellman-Ford (handles negative weights)
    // ─────────────────────────────────────────────────────────────────────────────
    
    bellmanFord: function(nodes, edges, source) {
        const dist = {};
        const prev = {};
        
        // Initialize
        for (const node of nodes) {
            dist[node] = node === source ? 0 : Infinity;
            prev[node] = null;
        }
        
        // Relax edges |V| - 1 times
        for (let i = 0; i < nodes.length - 1; i++) {
            let changed = false;
            
            for (const { from, to, weight } of edges) {
                if (dist[from] !== Infinity && dist[from] + weight < dist[to]) {
                    dist[to] = dist[from] + weight;
                    prev[to] = from;
                    changed = true;
                }
            }
            
            if (!changed) break; // Early termination
        }
        
        // Check for negative cycles
        for (const { from, to, weight } of edges) {
            if (dist[from] !== Infinity && dist[from] + weight < dist[to]) {
                return { success: false, reason: 'Negative cycle detected' };
            }
        }
        
        return { success: true, distances: dist, predecessors: prev };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Floyd-Warshall (All-pairs shortest paths)
    // ─────────────────────────────────────────────────────────────────────────────
    
    floydWarshall: function(nodes, edges) {
        const n = nodes.length;
        const nodeIndex = {};
        nodes.forEach((node, i) => nodeIndex[node] = i);
        
        // Initialize distance matrix
        const dist = [];
        const next = [];
        
        for (let i = 0; i < n; i++) {
            dist[i] = [];
            next[i] = [];
            for (let j = 0; j < n; j++) {
                dist[i][j] = i === j ? 0 : Infinity;
                next[i][j] = null;
            }
        }
        
        // Add edge weights
        for (const { from, to, weight } of edges) {
            const i = nodeIndex[from];
            const j = nodeIndex[to];
            dist[i][j] = weight;
            next[i][j] = j;
        }
        
        // Floyd-Warshall
        for (let k = 0; k < n; k++) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                        next[i][j] = next[i][k];
                    }
                }
            }
        }
        
        // Check for negative cycles
        for (let i = 0; i < n; i++) {
            if (dist[i][i] < 0) {
                return { success: false, reason: 'Negative cycle detected' };
            }
        }
        
        // Reconstruct path function
        const getPath = (from, to) => {
            const i = nodeIndex[from];
            const j = nodeIndex[to];
            
            if (next[i][j] === null) return null;
            
            const path = [from];
            let current = i;
            while (current !== j) {
                current = next[current][j];
                path.push(nodes[current]);
            }
            return path;
        };
        
        return {
            success: true,
            distances: dist,
            nodes,
            nodeIndex,
            getPath,
            getDistance: (from, to) => dist[nodeIndex[from]][nodeIndex[to]]
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Topological Sort (Kahn's Algorithm)
    // ─────────────────────────────────────────────────────────────────────────────
    
    topologicalSort: function(nodes, edges) {
        const inDegree = {};
        const adjacency = {};
        
        for (const node of nodes) {
            inDegree[node] = 0;
            adjacency[node] = [];
        }
        
        for (const { from, to } of edges) {
            adjacency[from].push(to);
            inDegree[to]++;
        }
        
        const queue = nodes.filter(n => inDegree[n] === 0);
        const sorted = [];
        
        while (queue.length > 0) {
            const node = queue.shift();
            sorted.push(node);
            
            for (const neighbor of adjacency[node]) {
                inDegree[neighbor]--;
                if (inDegree[neighbor] === 0) {
                    queue.push(neighbor);
                }
            }
        }
        
        if (sorted.length !== nodes.length) {
            return { success: false, reason: 'Graph contains cycle' };
        }
        
        return { success: true, order: sorted };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Strongly Connected Components (Kosaraju's)
    // ─────────────────────────────────────────────────────────────────────────────
    
    stronglyConnectedComponents: function(nodes, edges) {
        const adjacency = {};
        const reverseAdj = {};
        
        for (const node of nodes) {
            adjacency[node] = [];
            reverseAdj[node] = [];
        }
        
        for (const { from, to } of edges) {
            adjacency[from].push(to);
            reverseAdj[to].push(from);
        }
        
        // First DFS to get finish order
        const visited = new Set();
        const finishOrder = [];
        
        const dfs1 = (node) => {
            visited.add(node);
            for (const neighbor of adjacency[node]) {
                if (!visited.has(neighbor)) {
                    dfs1(neighbor);
                }
            }
            finishOrder.push(node);
        };
        
        for (const node of nodes) {
            if (!visited.has(node)) {
                dfs1(node);
            }
        }
        
        // Second DFS on reverse graph
        visited.clear();
        const components = [];
        
        const dfs2 = (node, component) => {
            visited.add(node);
            component.push(node);
            for (const neighbor of reverseAdj[node]) {
                if (!visited.has(neighbor)) {
                    dfs2(neighbor, component);
                }
            }
        };
        
        while (finishOrder.length > 0) {
            const node = finishOrder.pop();
            if (!visited.has(node)) {
                const component = [];
                dfs2(node, component);
                components.push(component);
            }
        }
        
        return {
            components,
            numComponents: components.length,
            isStronglyConnected: components.length === 1
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Critical Path Method (CPM)
    // ─────────────────────────────────────────────────────────────────────────────
    
    criticalPathMethod: function(activities) {
        // activities: [{id, duration, predecessors: []}]
        
        // Build graph
        const nodes = activities.map(a => a.id);
        const edges = [];
        const activityMap = new Map(activities.map(a => [a.id, a]));
        
        for (const activity of activities) {
            for (const pred of (activity.predecessors || [])) {
                edges.push({ from: pred, to: activity.id });
            }
        }
        
        // Topological sort
        const sortResult = this.topologicalSort(nodes, edges);
        if (!sortResult.success) {
            return { success: false, reason: 'Cyclic dependency' };
        }
        
        // Forward pass - calculate early start/finish
        const ES = {};
        const EF = {};
        
        for (const id of sortResult.order) {
            const activity = activityMap.get(id);
            const preds = activity.predecessors || [];
            
            ES[id] = preds.length === 0 ? 0 : Math.max(...preds.map(p => EF[p]));
            EF[id] = ES[id] + activity.duration;
        }
        
        const projectDuration = Math.max(...Object.values(EF));
        
        // Backward pass - calculate late start/finish
        const LF = {};
        const LS = {};
        
        for (const id of sortResult.order.slice().reverse()) {
            const activity = activityMap.get(id);
            
            // Find successors
            const successors = activities
                .filter(a => (a.predecessors || []).includes(id))
                .map(a => a.id);
            
            LF[id] = successors.length === 0 ? projectDuration : Math.min(...successors.map(s => LS[s]));
            LS[id] = LF[id] - activity.duration;
        }
        
        // Calculate slack and identify critical path
        const slack = {};
        const criticalPath = [];
        
        for (const id of nodes) {
            slack[id] = LS[id] - ES[id];
            if (Math.abs(slack[id]) < 0.001) {
                criticalPath.push(id);
            }
        }
        
        return {
            success: true,
            projectDuration,
            earlyStart: ES,
            earlyFinish: EF,
            lateStart: LS,
            lateFinish: LF,
            slack,
            criticalPath,
            schedule: activities.map(a => ({
                id: a.id,
                duration: a.duration,
                ES: ES[a.id],
                EF: EF[a.id],
                LS: LS[a.id],
                LF: LF[a.id],
                slack: slack[a.id],
                isCritical: Math.abs(slack[a.id]) < 0.001
            }))
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('graph.mst.kruskal', 'PRISM_GRAPH_ALGORITHMS_ENGINE.kruskalMST');
            PRISM_GATEWAY.register('graph.mst.prim', 'PRISM_GRAPH_ALGORITHMS_ENGINE.primMST');
            PRISM_GATEWAY.register('graph.bellmanFord', 'PRISM_GRAPH_ALGORITHMS_ENGINE.bellmanFord');
            PRISM_GATEWAY.register('graph.floydWarshall', 'PRISM_GRAPH_ALGORITHMS_ENGINE.floydWarshall');
            PRISM_GATEWAY.register('graph.topologicalSort', 'PRISM_GRAPH_ALGORITHMS_ENGINE.topologicalSort');
            PRISM_GATEWAY.register('graph.scc', 'PRISM_GRAPH_ALGORITHMS_ENGINE.stronglyConnectedComponents');
            PRISM_GATEWAY.register('graph.cpm', 'PRISM_GRAPH_ALGORITHMS_ENGINE.criticalPathMethod');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 8: PRISM_DECISION_TREE_ENGINE
// Decision Trees for Manufacturing Decisions
// Source: Stanford CS 229, MIT 6.036
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_DECISION_TREE_ENGINE = {
    name: 'PRISM_DECISION_TREE_ENGINE',
    version: '1.0.0',
    description: 'Decision trees for classification and manufacturing decisions',
    source: 'Stanford CS 229, MIT 6.036',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Build Decision Tree (ID3/C4.5 style)
    // ─────────────────────────────────────────────────────────────────────────────
    
    buildTree: function(data, targetAttribute, attributes, maxDepth = 10, minSamples = 2) {
        return this._buildTreeRecursive(data, targetAttribute, attributes, maxDepth, minSamples, 0);
    },
    
    _buildTreeRecursive: function(data, target, attributes, maxDepth, minSamples, depth) {
        // Base cases
        if (data.length === 0) {
            return { type: 'leaf', label: null };
        }
        
        const labels = data.map(d => d[target]);
        const uniqueLabels = [...new Set(labels)];
        
        // Pure node
        if (uniqueLabels.length === 1) {
            return { type: 'leaf', label: uniqueLabels[0], count: data.length };
        }
        
        // Max depth or min samples
        if (depth >= maxDepth || data.length < minSamples || attributes.length === 0) {
            return { 
                type: 'leaf', 
                label: this._majorityClass(labels), 
                count: data.length,
                distribution: this._getDistribution(labels)
            };
        }
        
        // Find best attribute
        const bestAttr = this._findBestAttribute(data, target, attributes);
        
        if (bestAttr.gain <= 0) {
            return { 
                type: 'leaf', 
                label: this._majorityClass(labels), 
                count: data.length 
            };
        }
        
        // Create decision node
        const node = {
            type: 'decision',
            attribute: bestAttr.attribute,
            children: {},
            count: data.length
        };
        
        // Split data and recurse
        const values = [...new Set(data.map(d => d[bestAttr.attribute]))];
        const remainingAttrs = attributes.filter(a => a !== bestAttr.attribute);
        
        for (const value of values) {
            const subset = data.filter(d => d[bestAttr.attribute] === value);
            node.children[value] = this._buildTreeRecursive(
                subset, target, remainingAttrs, maxDepth, minSamples, depth + 1
            );
        }
        
        return node;
    },
    
    _findBestAttribute: function(data, target, attributes) {
        const baseEntropy = this._entropy(data.map(d => d[target]));
        let bestGain = -Infinity;
        let bestAttr = null;
        
        for (const attr of attributes) {
            const gain = baseEntropy - this._conditionalEntropy(data, target, attr);
            if (gain > bestGain) {
                bestGain = gain;
                bestAttr = attr;
            }
        }
        
        return { attribute: bestAttr, gain: bestGain };
    },
    
    _entropy: function(labels) {
        const counts = {};
        for (const label of labels) {
            counts[label] = (counts[label] || 0) + 1;
        }
        
        let entropy = 0;
        for (const count of Object.values(counts)) {
            const p = count / labels.length;
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        
        return entropy;
    },
    
    _conditionalEntropy: function(data, target, attribute) {
        const values = [...new Set(data.map(d => d[attribute]))];
        let condEntropy = 0;
        
        for (const value of values) {
            const subset = data.filter(d => d[attribute] === value);
            const weight = subset.length / data.length;
            condEntropy += weight * this._entropy(subset.map(d => d[target]));
        }
        
        return condEntropy;
    },
    
    _majorityClass: function(labels) {
        const counts = {};
        for (const label of labels) {
            counts[label] = (counts[label] || 0) + 1;
        }
        
        return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    },
    
    _getDistribution: function(labels) {
        const counts = {};
        for (const label of labels) {
            counts[label] = (counts[label] || 0) + 1;
        }
        return counts;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Predict using Decision Tree
    // ─────────────────────────────────────────────────────────────────────────────
    
    predict: function(tree, instance) {
        if (tree.type === 'leaf') {
            return tree.label;
        }
        
        const value = instance[tree.attribute];
        const child = tree.children[value];
        
        if (!child) {
            // Unknown value - return most common in children
            const childLabels = Object.values(tree.children)
                .filter(c => c.type === 'leaf')
                .map(c => c.label);
            
            if (childLabels.length > 0) {
                return this._majorityClass(childLabels);
            }
            return null;
        }
        
        return this.predict(child, instance);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Tree Pruning (Reduced Error Pruning)
    // ─────────────────────────────────────────────────────────────────────────────
    
    prune: function(tree, validationData, target) {
        const pruned = JSON.parse(JSON.stringify(tree));
        
        const pruneRecursive = (node, data) => {
            if (node.type === 'leaf') return node;
            
            // Prune children first
            for (const value in node.children) {
                const subset = data.filter(d => d[node.attribute] === value);
                node.children[value] = pruneRecursive(node.children[value], subset);
            }
            
            // Calculate error with and without this subtree
            const currentError = data.filter(d => this.predict(node, d) !== d[target]).length;
            const majorityLabel = this._majorityClass(data.map(d => d[target]));
            const prunedError = data.filter(d => d[target] !== majorityLabel).length;
            
            // Prune if it doesn't increase error
            if (prunedError <= currentError) {
                return {
                    type: 'leaf',
                    label: majorityLabel,
                    count: data.length,
                    pruned: true
                };
            }
            
            return node;
        };
        
        return pruneRecursive(pruned, validationData);
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('dt.build', 'PRISM_DECISION_TREE_ENGINE.buildTree');
            PRISM_GATEWAY.register('dt.predict', 'PRISM_DECISION_TREE_ENGINE.predict');
            PRISM_GATEWAY.register('dt.prune', 'PRISM_DECISION_TREE_ENGINE.prune');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 9: PRISM_RAPID_PATH_OPTIMIZER
// Rapid Movement Optimization for CNC
// Source: MIT 2.008, Manufacturing Best Practices
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_RAPID_PATH_OPTIMIZER = {
    name: 'PRISM_RAPID_PATH_OPTIMIZER',
    version: '1.0.0',
    description: 'Optimize rapid movements, retract strategies, and linking moves',
    source: 'MIT 2.008, Manufacturing',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Optimize Rapid Sequence
    // ─────────────────────────────────────────────────────────────────────────────
    
    optimizeRapidSequence: function(points, options = {}) {
        const {
            startPoint = { x: 0, y: 0, z: 50 },
            clearanceHeight = 50,
            rapidFeed = 10000,
            method = 'nearest_neighbor'
        } = options;
        
        if (points.length === 0) {
            return { sequence: [], totalTime: 0 };
        }
        
        let sequence;
        let totalDistance;
        
        switch (method) {
            case 'nearest_neighbor':
                ({ sequence, totalDistance } = this._nearestNeighbor(points, startPoint));
                break;
            case 'opt2':
                ({ sequence, totalDistance } = this._twoOptOptimization(points, startPoint));
                break;
            case 'christofides':
                ({ sequence, totalDistance } = this._christofidesApprox(points, startPoint));
                break;
            default:
                ({ sequence, totalDistance } = this._nearestNeighbor(points, startPoint));
        }
        
        // Generate rapid moves
        const moves = this._generateRapidMoves(sequence.map(i => points[i]), startPoint, clearanceHeight);
        const totalTime = totalDistance / rapidFeed * 60; // seconds
        
        return {
            sequence,
            moves,
            totalDistance,
            totalTime,
            method
        };
    },
    
    _nearestNeighbor: function(points, start) {
        const n = points.length;
        const visited = new Set();
        const sequence = [];
        let currentPos = start;
        let totalDistance = 0;
        
        while (sequence.length < n) {
            let nearestIdx = -1;
            let nearestDist = Infinity;
            
            for (let i = 0; i < n; i++) {
                if (!visited.has(i)) {
                    const dist = this._distance3D(currentPos, points[i]);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = i;
                    }
                }
            }
            
            visited.add(nearestIdx);
            sequence.push(nearestIdx);
            totalDistance += nearestDist;
            currentPos = points[nearestIdx];
        }
        
        return { sequence, totalDistance };
    },
    
    _twoOptOptimization: function(points, start) {
        let { sequence, totalDistance } = this._nearestNeighbor(points, start);
        
        let improved = true;
        while (improved) {
            improved = false;
            
            for (let i = 0; i < sequence.length - 1; i++) {
                for (let j = i + 2; j < sequence.length; j++) {
                    const newSequence = [
                        ...sequence.slice(0, i + 1),
                        ...sequence.slice(i + 1, j + 1).reverse(),
                        ...sequence.slice(j + 1)
                    ];
                    
                    const newDistance = this._calculateTourDistance(newSequence, points, start);
                    
                    if (newDistance < totalDistance - 0.01) {
                        sequence = newSequence;
                        totalDistance = newDistance;
                        improved = true;
                    }
                }
            }
        }
        
        return { sequence, totalDistance };
    },
    
    _christofidesApprox: function(points, start) {
        // Simplified Christofides-like approach
        // Use MST + nearest neighbor for odd-degree vertices
        const n = points.length;
        
        if (n <= 3) {
            return this._nearestNeighbor(points, start);
        }
        
        // Build complete graph
        const nodes = points.map((_, i) => i);
        const edges = [];
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                edges.push({
                    from: i,
                    to: j,
                    weight: this._distance3D(points[i], points[j])
                });
            }
        }
        
        // Get MST
        const mst = PRISM_GRAPH_ALGORITHMS_ENGINE.kruskalMST(nodes, edges);
        
        // Find Eulerian path approximation
        const adjacency = {};
        for (const node of nodes) adjacency[node] = [];
        
        for (const edge of mst.edges) {
            adjacency[edge.from].push(edge.to);
            adjacency[edge.to].push(edge.from);
        }
        
        // DFS traversal for approximate tour
        const visited = new Set();
        const sequence = [];
        
        const dfs = (node) => {
            visited.add(node);
            sequence.push(node);
            for (const neighbor of adjacency[node]) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor);
                }
            }
        };
        
        dfs(0);
        
        const totalDistance = this._calculateTourDistance(sequence, points, start);
        
        // Apply 2-opt improvement
        return this._twoOptOptimization(points, start);
    },
    
    _calculateTourDistance: function(sequence, points, start) {
        let distance = this._distance3D(start, points[sequence[0]]);
        
        for (let i = 0; i < sequence.length - 1; i++) {
            distance += this._distance3D(points[sequence[i]], points[sequence[i + 1]]);
        }
        
        return distance;
    },
    
    _generateRapidMoves: function(orderedPoints, start, clearance) {
        const moves = [];
        let currentPos = { ...start };
        
        for (const point of orderedPoints) {
            // Rapid to clearance
            if (currentPos.z < clearance) {
                moves.push({
                    type: 'rapid',
                    to: { x: currentPos.x, y: currentPos.y, z: clearance }
                });
            }
            
            // Rapid to XY
            moves.push({
                type: 'rapid',
                to: { x: point.x, y: point.y, z: clearance }
            });
            
            // Rapid down to point Z (or just above)
            moves.push({
                type: 'rapid',
                to: { x: point.x, y: point.y, z: point.z + 2 }
            });
            
            currentPos = { x: point.x, y: point.y, z: point.z };
        }
        
        return moves;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Optimize Linking Moves
    // ─────────────────────────────────────────────────────────────────────────────
    
    optimizeLinkingMoves: function(toolpaths, options = {}) {
        const {
            linkType = 'direct', // 'direct', 'clearance', 'ramp'
            clearanceHeight = 5,
            rampAngle = 45
        } = options;
        
        const optimized = [];
        
        for (let i = 0; i < toolpaths.length - 1; i++) {
            const current = toolpaths[i];
            const next = toolpaths[i + 1];
            
            const endPoint = current.points[current.points.length - 1];
            const startPoint = next.points[0];
            
            // Add current toolpath
            optimized.push(current);
            
            // Generate linking move
            const linkMove = this._generateLinkMove(endPoint, startPoint, linkType, clearanceHeight, rampAngle);
            if (linkMove) {
                optimized.push(linkMove);
            }
        }
        
        // Add last toolpath
        if (toolpaths.length > 0) {
            optimized.push(toolpaths[toolpaths.length - 1]);
        }
        
        return optimized;
    },
    
    _generateLinkMove: function(from, to, type, clearance, rampAngle) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;
        const xyDist = Math.sqrt(dx*dx + dy*dy);
        
        switch (type) {
            case 'direct':
                if (xyDist < 1) { // Very close - direct move
                    return {
                        type: 'link',
                        linkType: 'direct',
                        points: [from, to]
                    };
                }
                // Fall through to clearance
                
            case 'clearance':
                return {
                    type: 'link',
                    linkType: 'clearance',
                    points: [
                        from,
                        { x: from.x, y: from.y, z: clearance },
                        { x: to.x, y: to.y, z: clearance },
                        to
                    ]
                };
                
            case 'ramp':
                const rampDist = Math.abs(dz) / Math.tan(rampAngle * Math.PI / 180);
                if (xyDist >= rampDist) {
                    // Can do full ramp
                    return {
                        type: 'link',
                        linkType: 'ramp',
                        points: [from, to]
                    };
                } else {
                    // Need partial ramp with clearance
                    return {
                        type: 'link',
                        linkType: 'ramp_clearance',
                        points: [
                            from,
                            { x: from.x, y: from.y, z: clearance },
                            { x: to.x, y: to.y, z: clearance },
                            to
                        ]
                    };
                }
        }
        
        return null;
    },
    
    _distance3D: function(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z || 0) - (b.z || 0);
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('rapid.optimizeSequence', 'PRISM_RAPID_PATH_OPTIMIZER.optimizeRapidSequence');
            PRISM_GATEWAY.register('rapid.optimizeLinking', 'PRISM_RAPID_PATH_OPTIMIZER.optimizeLinkingMoves');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 3 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession2Part3() {
    PRISM_GRAPH_ALGORITHMS_ENGINE.register();
    PRISM_DECISION_TREE_ENGINE.register();
    PRISM_RAPID_PATH_OPTIMIZER.register();
    
    console.log('[Session 2 Part 3] Registered 3 modules, 12 gateway routes');
    console.log('  - PRISM_GRAPH_ALGORITHMS_ENGINE: MST, Shortest paths, Topological sort, SCC, CPM');
    console.log('  - PRISM_DECISION_TREE_ENGINE: ID3/C4.5, Pruning');
    console.log('  - PRISM_RAPID_PATH_OPTIMIZER: Sequence optimization, Linking moves');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_GRAPH_ALGORITHMS_ENGINE = PRISM_GRAPH_ALGORITHMS_ENGINE;
    window.PRISM_DECISION_TREE_ENGINE = PRISM_DECISION_TREE_ENGINE;
    window.PRISM_RAPID_PATH_OPTIMIZER = PRISM_RAPID_PATH_OPTIMIZER;
    registerSession2Part3();
}

console.log('[Session 2 Part 3] Graph & Path Optimization loaded - 3 modules');


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 3: OPTIMIZATION ALGORITHMS ENHANCEMENT
// Integrated: 2026-01-18 05:13:44 UTC
// +3,975 lines | 8 modules | 36 gateway routes
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 3: ULTIMATE OPTIMIZATION ENHANCEMENT - PART 1                              ║
 * ║ Advanced Unconstrained Optimization Algorithms                                            ║
 * ║ Source: MIT 15.084j (Nonlinear Programming), MIT 6.251J (Mathematical Programming)       ║
 * ║ Target: +1,200 lines | 3 Modules | 20+ Gateway Routes                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 1: PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER
// L-BFGS, Steepest Descent Variants, Quasi-Newton Methods
// Source: MIT 15.084j, Nocedal & Wright
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER = {
    name: 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER',
    version: '1.0.0',
    description: 'Advanced unconstrained optimization: L-BFGS, Trust Region, Steepest Descent variants',
    source: 'MIT 15.084j, Nocedal & Wright',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Linear Algebra Utilities
    // ─────────────────────────────────────────────────────────────────────────────
    
    _dot: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _norm: function(v) {
        return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
    },
    
    _scale: function(v, s) {
        return v.map(vi => vi * s);
    },
    
    _add: function(a, b) {
        return a.map((ai, i) => ai + b[i]);
    },
    
    _sub: function(a, b) {
        return a.map((ai, i) => ai - b[i]);
    },
    
    _clone: function(v) {
        return [...v];
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // L-BFGS (Limited-Memory BFGS)
    // Efficient for large-scale optimization
    // ─────────────────────────────────────────────────────────────────────────────
    
    lbfgs: function(config) {
        const {
            f,
            gradient,
            x0,
            m = 10,           // Memory size (number of corrections stored)
            maxIter = 1000,
            tol = 1e-8,
            lineSearchMaxIter = 20,
            c1 = 1e-4,        // Armijo condition
            c2 = 0.9          // Curvature condition
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let g = gradient(x);
        
        // Storage for s and y vectors
        const sHistory = [];  // s_k = x_{k+1} - x_k
        const yHistory = [];  // y_k = g_{k+1} - g_k
        const rhoHistory = []; // rho_k = 1 / (y_k^T s_k)
        
        const history = [{ x: this._clone(x), f: f(x), gradNorm: this._norm(g) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const gradNorm = this._norm(g);
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'L-BFGS'
                };
            }
            
            // Compute search direction using two-loop recursion
            const d = this._lbfgsTwoLoop(g, sHistory, yHistory, rhoHistory);
            
            // Line search (Strong Wolfe conditions)
            const { alpha, fNew, gNew } = this._wolfeLineSearch(f, gradient, x, d, g, c1, c2, lineSearchMaxIter);
            
            if (alpha === 0) {
                return {
                    x,
                    f: f(x),
                    converged: false,
                    iterations: iter,
                    reason: 'Line search failed',
                    history
                };
            }
            
            // Compute s and y
            const s = this._scale(d, alpha);
            const xNew = this._add(x, s);
            const y = this._sub(gNew, g);
            
            // Update history
            const sTy = this._dot(s, y);
            if (sTy > 1e-10) { // Curvature condition
                if (sHistory.length >= m) {
                    sHistory.shift();
                    yHistory.shift();
                    rhoHistory.shift();
                }
                sHistory.push(s);
                yHistory.push(y);
                rhoHistory.push(1 / sTy);
            }
            
            x = xNew;
            g = gNew;
            
            history.push({
                x: this._clone(x),
                f: fNew,
                gradNorm: this._norm(g),
                alpha
            });
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'L-BFGS'
        };
    },
    
    _lbfgsTwoLoop: function(g, sHistory, yHistory, rhoHistory) {
        const k = sHistory.length;
        let q = this._clone(g);
        const alpha = [];
        
        // First loop (backward)
        for (let i = k - 1; i >= 0; i--) {
            alpha[i] = rhoHistory[i] * this._dot(sHistory[i], q);
            q = this._sub(q, this._scale(yHistory[i], alpha[i]));
        }
        
        // Initial Hessian approximation (scaled identity)
        let gamma = 1;
        if (k > 0) {
            gamma = this._dot(sHistory[k-1], yHistory[k-1]) / 
                    this._dot(yHistory[k-1], yHistory[k-1]);
        }
        let r = this._scale(q, gamma);
        
        // Second loop (forward)
        for (let i = 0; i < k; i++) {
            const beta = rhoHistory[i] * this._dot(yHistory[i], r);
            r = this._add(r, this._scale(sHistory[i], alpha[i] - beta));
        }
        
        // Negate for descent direction
        return this._scale(r, -1);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Steepest Descent with Adaptive Step Size
    // ─────────────────────────────────────────────────────────────────────────────
    
    steepestDescentAdaptive: function(config) {
        const {
            f,
            gradient,
            x0,
            maxIter = 10000,
            tol = 1e-8,
            initialStep = 1.0,
            stepIncrease = 1.2,
            stepDecrease = 0.5,
            c = 0.0001
        } = config;
        
        let x = this._clone(x0);
        let step = initialStep;
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: this._clone(x), f: fx, gradNorm, step });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Steepest Descent (Adaptive)'
                };
            }
            
            // Direction: negative gradient
            const d = this._scale(g, -1);
            
            // Adaptive step size with Armijo condition
            let alpha = step;
            let accepted = false;
            
            for (let ls = 0; ls < 50; ls++) {
                const xNew = this._add(x, this._scale(d, alpha));
                const fNew = f(xNew);
                
                // Armijo condition
                if (fNew <= fx + c * alpha * this._dot(g, d)) {
                    x = xNew;
                    accepted = true;
                    
                    // Increase step for next iteration
                    step = Math.min(alpha * stepIncrease, 10);
                    break;
                }
                
                alpha *= stepDecrease;
            }
            
            if (!accepted) {
                return {
                    x,
                    f: fx,
                    converged: false,
                    iterations: iter,
                    reason: 'Line search failed',
                    history
                };
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Steepest Descent (Adaptive)'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Nonlinear Conjugate Gradient (Fletcher-Reeves & Polak-Ribière)
    // ─────────────────────────────────────────────────────────────────────────────
    
    nonlinearCG: function(config) {
        const {
            f,
            gradient,
            x0,
            method = 'PR',    // 'FR' (Fletcher-Reeves) or 'PR' (Polak-Ribière)
            maxIter = 10000,
            tol = 1e-8,
            restartInterval = null
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let g = gradient(x);
        let d = this._scale(g, -1);
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: this._clone(x), f: fx, gradNorm });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: `Nonlinear CG (${method})`
                };
            }
            
            // Line search
            const alpha = this._backtrackingLineSearch(f, x, d, g);
            x = this._add(x, this._scale(d, alpha));
            
            const gNew = gradient(x);
            
            // Compute beta
            let beta;
            if (method === 'FR') {
                // Fletcher-Reeves
                beta = this._dot(gNew, gNew) / this._dot(g, g);
            } else {
                // Polak-Ribière (with restart)
                beta = Math.max(0, this._dot(gNew, this._sub(gNew, g)) / this._dot(g, g));
            }
            
            // Restart check
            if (restartInterval && (iter + 1) % restartInterval === 0) {
                beta = 0;
            }
            
            // Update direction
            d = this._add(this._scale(gNew, -1), this._scale(d, beta));
            g = gNew;
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: `Nonlinear CG (${method})`
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // SR1 (Symmetric Rank-1) Quasi-Newton
    // ─────────────────────────────────────────────────────────────────────────────
    
    sr1: function(config) {
        const {
            f,
            gradient,
            x0,
            maxIter = 1000,
            tol = 1e-8,
            skipThreshold = 1e-8
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let g = gradient(x);
        
        // Initialize Hessian approximation as identity
        let B = this._identity(n);
        
        const history = [{ x: this._clone(x), f: f(x), gradNorm: this._norm(g) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const gradNorm = this._norm(g);
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'SR1'
                };
            }
            
            // Solve B * d = -g for search direction
            const d = this._solveLinear(B, this._scale(g, -1));
            
            // Line search
            const alpha = this._backtrackingLineSearch(f, x, d, g);
            
            const s = this._scale(d, alpha);
            const xNew = this._add(x, s);
            const gNew = gradient(xNew);
            const y = this._sub(gNew, g);
            
            // SR1 update
            const Bs = this._matVec(B, s);
            const r = this._sub(y, Bs);
            const rTs = this._dot(r, s);
            
            // Skip update if denominator is too small
            if (Math.abs(rTs) > skipThreshold * this._norm(r) * this._norm(s)) {
                // B = B + (r * r') / (r' * s)
                const rrT = this._outer(r, r);
                B = this._matAdd(B, this._matScale(rrT, 1 / rTs));
            }
            
            x = xNew;
            g = gNew;
            
            history.push({
                x: this._clone(x),
                f: f(x),
                gradNorm: this._norm(g),
                alpha
            });
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'SR1'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // DFP (Davidon-Fletcher-Powell) Quasi-Newton
    // ─────────────────────────────────────────────────────────────────────────────
    
    dfp: function(config) {
        const {
            f,
            gradient,
            x0,
            maxIter = 1000,
            tol = 1e-8
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let g = gradient(x);
        
        // Initialize inverse Hessian approximation as identity
        let H = this._identity(n);
        
        const history = [{ x: this._clone(x), f: f(x), gradNorm: this._norm(g) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const gradNorm = this._norm(g);
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'DFP'
                };
            }
            
            // Search direction: d = -H * g
            const d = this._scale(this._matVec(H, g), -1);
            
            // Line search
            const alpha = this._backtrackingLineSearch(f, x, d, g);
            
            const s = this._scale(d, alpha);
            const xNew = this._add(x, s);
            const gNew = gradient(xNew);
            const y = this._sub(gNew, g);
            
            // DFP update
            const sTy = this._dot(s, y);
            if (sTy > 1e-10) {
                const Hy = this._matVec(H, y);
                const yTHy = this._dot(y, Hy);
                
                // H = H + (s * s') / (s' * y) - (Hy * Hy') / (y' * Hy)
                const ssT = this._outer(s, s);
                const HyyTH = this._outer(Hy, Hy);
                
                H = this._matAdd(H, this._matScale(ssT, 1 / sTy));
                H = this._matSub(H, this._matScale(HyyTH, 1 / yTHy));
            }
            
            x = xNew;
            g = gNew;
            
            history.push({
                x: this._clone(x),
                f: f(x),
                gradNorm: this._norm(g),
                alpha
            });
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'DFP'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Broyden's Method (for systems of equations)
    // ─────────────────────────────────────────────────────────────────────────────
    
    broyden: function(config) {
        const {
            F,              // Vector function F(x) = 0
            x0,
            maxIter = 100,
            tol = 1e-8
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let Fx = F(x);
        
        // Initialize Jacobian approximation as identity
        let J = this._identity(n);
        
        const history = [{ x: this._clone(x), residual: this._norm(Fx) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const residual = this._norm(Fx);
            
            if (residual < tol) {
                return {
                    x,
                    residual,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Broyden'
                };
            }
            
            // Solve J * s = -F for Newton step
            const s = this._solveLinear(J, this._scale(Fx, -1));
            
            const xNew = this._add(x, s);
            const FxNew = F(xNew);
            const y = this._sub(FxNew, Fx);
            
            // Broyden update: J = J + ((y - J*s) * s') / (s' * s)
            const Js = this._matVec(J, s);
            const diff = this._sub(y, Js);
            const sTs = this._dot(s, s);
            
            if (sTs > 1e-12) {
                const update = this._outer(diff, s);
                J = this._matAdd(J, this._matScale(update, 1 / sTs));
            }
            
            x = xNew;
            Fx = FxNew;
            
            history.push({ x: this._clone(x), residual: this._norm(Fx) });
        }
        
        return {
            x,
            residual: this._norm(Fx),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Broyden'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Line Search Methods
    // ─────────────────────────────────────────────────────────────────────────────
    
    _wolfeLineSearch: function(f, gradient, x, d, g, c1, c2, maxIter) {
        let alpha = 1;
        let alphaLo = 0;
        let alphaHi = Infinity;
        
        const fx = f(x);
        const gTd = this._dot(g, d);
        
        for (let i = 0; i < maxIter; i++) {
            const xNew = this._add(x, this._scale(d, alpha));
            const fNew = f(xNew);
            const gNew = gradient(xNew);
            
            // Armijo condition
            if (fNew > fx + c1 * alpha * gTd) {
                alphaHi = alpha;
                alpha = (alphaLo + alphaHi) / 2;
                continue;
            }
            
            // Curvature condition
            const gNewTd = this._dot(gNew, d);
            if (gNewTd < c2 * gTd) {
                alphaLo = alpha;
                alpha = alphaHi === Infinity ? 2 * alpha : (alphaLo + alphaHi) / 2;
                continue;
            }
            
            // Both conditions satisfied
            return { alpha, fNew, gNew };
        }
        
        // Return best found
        const xNew = this._add(x, this._scale(d, alpha));
        return { alpha, fNew: f(xNew), gNew: gradient(xNew) };
    },
    
    _backtrackingLineSearch: function(f, x, d, g, c = 0.0001, rho = 0.5) {
        let alpha = 1;
        const fx = f(x);
        const gTd = this._dot(g, d);
        
        for (let i = 0; i < 50; i++) {
            const xNew = this._add(x, this._scale(d, alpha));
            if (f(xNew) <= fx + c * alpha * gTd) {
                return alpha;
            }
            alpha *= rho;
        }
        
        return alpha;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Matrix Utilities
    // ─────────────────────────────────────────────────────────────────────────────
    
    _identity: function(n) {
        return Array(n).fill(null).map((_, i) => 
            Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
    },
    
    _outer: function(a, b) {
        return a.map(ai => b.map(bj => ai * bj));
    },
    
    _matVec: function(A, x) {
        return A.map(row => this._dot(row, x));
    },
    
    _matAdd: function(A, B) {
        return A.map((row, i) => row.map((a, j) => a + B[i][j]));
    },
    
    _matSub: function(A, B) {
        return A.map((row, i) => row.map((a, j) => a - B[i][j]));
    },
    
    _matScale: function(A, s) {
        return A.map(row => row.map(a => a * s));
    },
    
    _solveLinear: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        // Forward elimination with pivoting
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) continue;
            
            for (let k = i + 1; k < n; k++) {
                const factor = aug[k][i] / aug[i][i];
                for (let j = i; j <= n; j++) {
                    aug[k][j] -= factor * aug[i][j];
                }
            }
        }
        
        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= aug[i][j] * x[j];
            }
            x[i] /= aug[i][i] || 1;
        }
        
        return x;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.lbfgs', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs');
            PRISM_GATEWAY.register('opt.steepestAdaptive', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.steepestDescentAdaptive');
            PRISM_GATEWAY.register('opt.nlcg', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.nonlinearCG');
            PRISM_GATEWAY.register('opt.sr1', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.sr1');
            PRISM_GATEWAY.register('opt.dfp', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.dfp');
            PRISM_GATEWAY.register('opt.broyden', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.broyden');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 2: PRISM_TRUST_REGION_OPTIMIZER
// Trust Region Methods for Robust Optimization
// Source: MIT 15.084j, Conn-Gould-Toint
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_TRUST_REGION_OPTIMIZER = {
    name: 'PRISM_TRUST_REGION_OPTIMIZER',
    version: '1.0.0',
    description: 'Trust region methods: Cauchy Point, Dogleg, Steihaug-Toint CG',
    source: 'MIT 15.084j, Conn-Gould-Toint',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Cauchy Point Trust Region
    // ─────────────────────────────────────────────────────────────────────────────
    
    trustRegionCauchy: function(config) {
        const {
            f,
            gradient,
            hessian,
            x0,
            maxIter = 1000,
            tol = 1e-8,
            initialRadius = 1.0,
            maxRadius = 100.0,
            eta = 0.15
        } = config;
        
        let x = [...x0];
        let delta = initialRadius;
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: [...x], f: fx, gradNorm, delta });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Trust Region (Cauchy Point)'
                };
            }
            
            const H = hessian(x);
            
            // Compute Cauchy point
            const gHg = this._quadForm(g, H, g);
            let tau;
            
            if (gHg <= 0) {
                tau = 1;
            } else {
                tau = Math.min(1, Math.pow(gradNorm, 3) / (delta * gHg));
            }
            
            const pC = this._scale(g, -tau * delta / gradNorm);
            
            // Compute actual vs predicted reduction
            const xNew = this._add(x, pC);
            const fNew = f(xNew);
            
            const actualReduction = fx - fNew;
            const predictedReduction = -this._dot(g, pC) - 0.5 * this._quadForm(pC, H, pC);
            
            const rho = predictedReduction !== 0 ? actualReduction / predictedReduction : 0;
            
            // Update trust region radius
            if (rho < 0.25) {
                delta *= 0.25;
            } else if (rho > 0.75 && Math.abs(this._norm(pC) - delta) < 1e-8) {
                delta = Math.min(2 * delta, maxRadius);
            }
            
            // Accept or reject step
            if (rho > eta) {
                x = xNew;
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Trust Region (Cauchy Point)'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dogleg Trust Region
    // ─────────────────────────────────────────────────────────────────────────────
    
    trustRegionDogleg: function(config) {
        const {
            f,
            gradient,
            hessian,
            x0,
            maxIter = 1000,
            tol = 1e-8,
            initialRadius = 1.0,
            maxRadius = 100.0,
            eta = 0.15
        } = config;
        
        let x = [...x0];
        let delta = initialRadius;
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: [...x], f: fx, gradNorm, delta });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Trust Region (Dogleg)'
                };
            }
            
            const H = hessian(x);
            
            // Compute Newton step
            const pB = this._solveLinear(H, this._scale(g, -1));
            const pBNorm = this._norm(pB);
            
            // Compute Cauchy point
            const gHg = this._quadForm(g, H, g);
            const pU = this._scale(g, -gradNorm * gradNorm / gHg);
            const pUNorm = this._norm(pU);
            
            // Compute dogleg path
            let p;
            if (pBNorm <= delta) {
                // Newton step is inside trust region
                p = pB;
            } else if (pUNorm >= delta) {
                // Cauchy point is outside trust region
                p = this._scale(g, -delta / gradNorm);
            } else {
                // Interpolate between Cauchy and Newton
                const diff = this._sub(pB, pU);
                const a = this._dot(diff, diff);
                const b = 2 * this._dot(pU, diff);
                const c = this._dot(pU, pU) - delta * delta;
                
                const tau = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
                p = this._add(pU, this._scale(diff, tau));
            }
            
            // Compute actual vs predicted reduction
            const xNew = this._add(x, p);
            const fNew = f(xNew);
            
            const actualReduction = fx - fNew;
            const predictedReduction = -this._dot(g, p) - 0.5 * this._quadForm(p, H, p);
            
            const rho = predictedReduction !== 0 ? actualReduction / predictedReduction : 0;
            
            // Update trust region radius
            if (rho < 0.25) {
                delta *= 0.25;
            } else if (rho > 0.75 && Math.abs(this._norm(p) - delta) < 1e-8) {
                delta = Math.min(2 * delta, maxRadius);
            }
            
            // Accept or reject step
            if (rho > eta) {
                x = xNew;
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Trust Region (Dogleg)'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Steihaug-Toint CG Trust Region
    // ─────────────────────────────────────────────────────────────────────────────
    
    trustRegionSteihaugCG: function(config) {
        const {
            f,
            gradient,
            hessian,
            x0,
            maxIter = 1000,
            tol = 1e-8,
            initialRadius = 1.0,
            maxRadius = 100.0,
            eta = 0.15,
            cgMaxIter = 100
        } = config;
        
        let x = [...x0];
        let delta = initialRadius;
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: [...x], f: fx, gradNorm, delta });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Trust Region (Steihaug-CG)'
                };
            }
            
            const H = hessian(x);
            
            // Solve trust region subproblem using CG
            const p = this._steihaugCG(g, H, delta, gradNorm * 1e-3, cgMaxIter);
            
            // Compute actual vs predicted reduction
            const xNew = this._add(x, p);
            const fNew = f(xNew);
            
            const actualReduction = fx - fNew;
            const predictedReduction = -this._dot(g, p) - 0.5 * this._quadForm(p, H, p);
            
            const rho = predictedReduction !== 0 ? actualReduction / predictedReduction : 0;
            
            // Update trust region radius
            if (rho < 0.25) {
                delta *= 0.25;
            } else if (rho > 0.75 && Math.abs(this._norm(p) - delta) < 1e-8) {
                delta = Math.min(2 * delta, maxRadius);
            }
            
            // Accept or reject step
            if (rho > eta) {
                x = xNew;
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Trust Region (Steihaug-CG)'
        };
    },
    
    _steihaugCG: function(g, H, delta, tol, maxIter) {
        const n = g.length;
        let z = new Array(n).fill(0);
        let r = [...g];
        let d = this._scale(g, -1);
        
        if (this._norm(r) < tol) {
            return z;
        }
        
        for (let j = 0; j < maxIter; j++) {
            const Hd = this._matVec(H, d);
            const dHd = this._dot(d, Hd);
            
            // Check for negative curvature
            if (dHd <= 0) {
                // Find tau such that ||z + tau*d|| = delta
                const tau = this._findBoundaryIntersection(z, d, delta);
                return this._add(z, this._scale(d, tau));
            }
            
            const alpha = this._dot(r, r) / dHd;
            const zNew = this._add(z, this._scale(d, alpha));
            
            // Check if we hit the boundary
            if (this._norm(zNew) >= delta) {
                const tau = this._findBoundaryIntersection(z, d, delta);
                return this._add(z, this._scale(d, tau));
            }
            
            z = zNew;
            const rNew = this._add(r, this._scale(Hd, alpha));
            
            if (this._norm(rNew) < tol) {
                return z;
            }
            
            const beta = this._dot(rNew, rNew) / this._dot(r, r);
            d = this._add(this._scale(rNew, -1), this._scale(d, beta));
            r = rNew;
        }
        
        return z;
    },
    
    _findBoundaryIntersection: function(z, d, delta) {
        const a = this._dot(d, d);
        const b = 2 * this._dot(z, d);
        const c = this._dot(z, z) - delta * delta;
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return 0;
        
        return (-b + Math.sqrt(discriminant)) / (2 * a);
    },
    
    // Helper functions
    _norm: function(v) {
        return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
    },
    
    _dot: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _scale: function(v, s) {
        return v.map(vi => vi * s);
    },
    
    _add: function(a, b) {
        return a.map((ai, i) => ai + b[i]);
    },
    
    _sub: function(a, b) {
        return a.map((ai, i) => ai - b[i]);
    },
    
    _matVec: function(A, x) {
        return A.map(row => this._dot(row, x));
    },
    
    _quadForm: function(x, A, y) {
        return this._dot(x, this._matVec(A, y));
    },
    
    _solveLinear: function(A, b) {
        return PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER._solveLinear(A, b);
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.trustRegion.cauchy', 'PRISM_TRUST_REGION_OPTIMIZER.trustRegionCauchy');
            PRISM_GATEWAY.register('opt.trustRegion.dogleg', 'PRISM_TRUST_REGION_OPTIMIZER.trustRegionDogleg');
            PRISM_GATEWAY.register('opt.trustRegion.steihaugCG', 'PRISM_TRUST_REGION_OPTIMIZER.trustRegionSteihaugCG');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 1 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession3Part1() {
    PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.register();
    PRISM_TRUST_REGION_OPTIMIZER.register();
    
    console.log('[Session 3 Part 1] Registered 2 modules, 9 gateway routes');
    console.log('  - PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER: L-BFGS, Steepest, NLCG, SR1, DFP, Broyden');
    console.log('  - PRISM_TRUST_REGION_OPTIMIZER: Cauchy, Dogleg, Steihaug-CG');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER;
    window.PRISM_TRUST_REGION_OPTIMIZER = PRISM_TRUST_REGION_OPTIMIZER;
    registerSession3Part1();
}

console.log('[Session 3 Part 1] Advanced Unconstrained Optimization loaded - 2 modules');
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 3: ULTIMATE OPTIMIZATION ENHANCEMENT - PART 2                              ║
 * ║ Constrained Optimization: Barrier, Augmented Lagrangian, SQP, Interior Point             ║
 * ║ Source: MIT 15.084j, MIT 6.251J, Boyd & Vandenberghe                                     ║
 * ║ Target: +1,200 lines | 2 Modules | 15+ Gateway Routes                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 3: PRISM_CONSTRAINED_OPTIMIZER
// Penalty, Barrier, and Augmented Lagrangian Methods
// Source: MIT 15.084j, Boyd & Vandenberghe
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_CONSTRAINED_OPTIMIZER = {
    name: 'PRISM_CONSTRAINED_OPTIMIZER',
    version: '1.0.0',
    description: 'Constrained optimization: Penalty, Barrier, Augmented Lagrangian',
    source: 'MIT 15.084j, Boyd & Vandenberghe',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Linear Algebra Utilities
    // ─────────────────────────────────────────────────────────────────────────────
    
    _dot: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _norm: function(v) {
        return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
    },
    
    _scale: function(v, s) {
        return v.map(vi => vi * s);
    },
    
    _add: function(a, b) {
        return a.map((ai, i) => ai + b[i]);
    },
    
    _sub: function(a, b) {
        return a.map((ai, i) => ai - b[i]);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Quadratic Penalty Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    quadraticPenalty: function(config) {
        const {
            f,                    // Objective function
            gradient,             // Gradient of objective
            equalityConstraints = [],   // Array of h_i(x) = 0 functions
            inequalityConstraints = [], // Array of g_i(x) <= 0 functions
            x0,
            mu0 = 1,              // Initial penalty parameter
            muGrowth = 10,        // Growth factor for mu
            maxOuterIter = 50,
            maxInnerIter = 1000,
            outerTol = 1e-6,
            innerTol = 1e-8
        } = config;
        
        let x = [...x0];
        let mu = mu0;
        const history = [];
        
        for (let outer = 0; outer < maxOuterIter; outer++) {
            // Penalized objective
            const penalizedF = (x) => {
                let val = f(x);
                
                // Equality constraints: sum of h_i(x)^2
                for (const h of equalityConstraints) {
                    val += mu * Math.pow(h(x), 2);
                }
                
                // Inequality constraints: sum of max(0, g_i(x))^2
                for (const g of inequalityConstraints) {
                    val += mu * Math.pow(Math.max(0, g(x)), 2);
                }
                
                return val;
            };
            
            // Gradient of penalized objective (numerical)
            const penalizedGradient = (x) => {
                const eps = 1e-7;
                return x.map((_, i) => {
                    const xPlus = [...x];
                    const xMinus = [...x];
                    xPlus[i] += eps;
                    xMinus[i] -= eps;
                    return (penalizedF(xPlus) - penalizedF(xMinus)) / (2 * eps);
                });
            };
            
            // Solve unconstrained subproblem
            const result = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs({
                f: penalizedF,
                gradient: penalizedGradient,
                x0: x,
                maxIter: maxInnerIter,
                tol: innerTol
            });
            
            x = result.x;
            
            // Check constraint violation
            let maxViolation = 0;
            for (const h of equalityConstraints) {
                maxViolation = Math.max(maxViolation, Math.abs(h(x)));
            }
            for (const g of inequalityConstraints) {
                maxViolation = Math.max(maxViolation, Math.max(0, g(x)));
            }
            
            history.push({
                x: [...x],
                f: f(x),
                mu,
                maxViolation,
                innerIter: result.iterations
            });
            
            // Check convergence
            if (maxViolation < outerTol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    outerIterations: outer + 1,
                    constraintViolation: maxViolation,
                    history,
                    method: 'Quadratic Penalty'
                };
            }
            
            // Increase penalty
            mu *= muGrowth;
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            outerIterations: maxOuterIter,
            history,
            method: 'Quadratic Penalty'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Log Barrier Method (Interior Point)
    // ─────────────────────────────────────────────────────────────────────────────
    
    logBarrier: function(config) {
        const {
            f,                    // Objective function
            gradient,             // Gradient of objective
            inequalityConstraints = [], // Array of g_i(x) <= 0 functions
            x0,
            t0 = 1,               // Initial barrier parameter
            tGrowth = 10,         // Growth factor for t
            maxOuterIter = 50,
            maxInnerIter = 100,
            outerTol = 1e-6,
            innerTol = 1e-8
        } = config;
        
        const m = inequalityConstraints.length;
        let x = [...x0];
        let t = t0;
        const history = [];
        
        // Verify initial point is strictly feasible
        for (let i = 0; i < m; i++) {
            if (inequalityConstraints[i](x) >= 0) {
                console.warn(`Initial point violates constraint ${i}`);
            }
        }
        
        for (let outer = 0; outer < maxOuterIter; outer++) {
            // Barrier function: f(x) - (1/t) * sum(log(-g_i(x)))
            const barrierF = (x) => {
                let val = t * f(x);
                
                for (const g of inequalityConstraints) {
                    const gi = g(x);
                    if (gi >= 0) return Infinity; // Infeasible
                    val -= Math.log(-gi);
                }
                
                return val;
            };
            
            // Gradient of barrier function (numerical)
            const barrierGradient = (x) => {
                const eps = 1e-7;
                return x.map((_, i) => {
                    const xPlus = [...x];
                    const xMinus = [...x];
                    xPlus[i] += eps;
                    xMinus[i] -= eps;
                    const fPlus = barrierF(xPlus);
                    const fMinus = barrierF(xMinus);
                    if (!isFinite(fPlus) || !isFinite(fMinus)) {
                        // One-sided difference
                        return (barrierF(xPlus) - barrierF(x)) / eps;
                    }
                    return (fPlus - fMinus) / (2 * eps);
                });
            };
            
            // Solve barrier subproblem
            const result = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs({
                f: barrierF,
                gradient: barrierGradient,
                x0: x,
                maxIter: maxInnerIter,
                tol: innerTol
            });
            
            x = result.x;
            
            // Duality gap
            const dualityGap = m / t;
            
            history.push({
                x: [...x],
                f: f(x),
                t,
                dualityGap,
                innerIter: result.iterations
            });
            
            // Check convergence
            if (dualityGap < outerTol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    outerIterations: outer + 1,
                    dualityGap,
                    history,
                    method: 'Log Barrier'
                };
            }
            
            // Increase t
            t *= tGrowth;
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            outerIterations: maxOuterIter,
            history,
            method: 'Log Barrier'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Augmented Lagrangian Method (Method of Multipliers)
    // ─────────────────────────────────────────────────────────────────────────────
    
    augmentedLagrangian: function(config) {
        const {
            f,                    // Objective function
            gradient,             // Gradient of objective
            equalityConstraints = [],   // Array of h_i(x) = 0 functions
            inequalityConstraints = [], // Array of g_i(x) <= 0 functions
            x0,
            lambda0 = null,       // Initial Lagrange multipliers for equality
            mu0 = null,           // Initial Lagrange multipliers for inequality
            rho0 = 1,             // Initial penalty parameter
            rhoGrowth = 2,        // Growth factor for rho
            maxOuterIter = 50,
            maxInnerIter = 1000,
            outerTol = 1e-6,
            innerTol = 1e-8
        } = config;
        
        const nEq = equalityConstraints.length;
        const nIneq = inequalityConstraints.length;
        
        let x = [...x0];
        let lambda = lambda0 || new Array(nEq).fill(0);
        let mu = mu0 || new Array(nIneq).fill(0);
        let rho = rho0;
        
        const history = [];
        
        for (let outer = 0; outer < maxOuterIter; outer++) {
            // Augmented Lagrangian function
            const augLag = (x) => {
                let val = f(x);
                
                // Equality constraints
                for (let i = 0; i < nEq; i++) {
                    const hi = equalityConstraints[i](x);
                    val += lambda[i] * hi + (rho / 2) * hi * hi;
                }
                
                // Inequality constraints (using slack formulation)
                for (let i = 0; i < nIneq; i++) {
                    const gi = inequalityConstraints[i](x);
                    const term = Math.max(0, mu[i] + rho * gi);
                    val += (1 / (2 * rho)) * (term * term - mu[i] * mu[i]);
                }
                
                return val;
            };
            
            // Gradient of augmented Lagrangian (numerical)
            const augLagGradient = (x) => {
                const eps = 1e-7;
                return x.map((_, i) => {
                    const xPlus = [...x];
                    const xMinus = [...x];
                    xPlus[i] += eps;
                    xMinus[i] -= eps;
                    return (augLag(xPlus) - augLag(xMinus)) / (2 * eps);
                });
            };
            
            // Solve augmented Lagrangian subproblem
            const result = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs({
                f: augLag,
                gradient: augLagGradient,
                x0: x,
                maxIter: maxInnerIter,
                tol: innerTol
            });
            
            x = result.x;
            
            // Update multipliers
            for (let i = 0; i < nEq; i++) {
                lambda[i] += rho * equalityConstraints[i](x);
            }
            
            for (let i = 0; i < nIneq; i++) {
                mu[i] = Math.max(0, mu[i] + rho * inequalityConstraints[i](x));
            }
            
            // Check constraint violation
            let maxViolation = 0;
            for (let i = 0; i < nEq; i++) {
                maxViolation = Math.max(maxViolation, Math.abs(equalityConstraints[i](x)));
            }
            for (let i = 0; i < nIneq; i++) {
                maxViolation = Math.max(maxViolation, Math.max(0, inequalityConstraints[i](x)));
            }
            
            history.push({
                x: [...x],
                f: f(x),
                rho,
                maxViolation,
                lambda: [...lambda],
                mu: [...mu],
                innerIter: result.iterations
            });
            
            // Check convergence
            if (maxViolation < outerTol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    outerIterations: outer + 1,
                    constraintViolation: maxViolation,
                    lambda,
                    mu,
                    history,
                    method: 'Augmented Lagrangian'
                };
            }
            
            // Increase penalty
            rho *= rhoGrowth;
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            outerIterations: maxOuterIter,
            lambda,
            mu,
            history,
            method: 'Augmented Lagrangian'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Projected Gradient Method (for box constraints)
    // ─────────────────────────────────────────────────────────────────────────────
    
    projectedGradient: function(config) {
        const {
            f,
            gradient,
            x0,
            lowerBounds,
            upperBounds,
            maxIter = 10000,
            tol = 1e-8,
            learningRate = 0.01,
            lineSearch = true
        } = config;
        
        const project = (x) => {
            return x.map((xi, i) => {
                let val = xi;
                if (lowerBounds && lowerBounds[i] !== undefined) {
                    val = Math.max(val, lowerBounds[i]);
                }
                if (upperBounds && upperBounds[i] !== undefined) {
                    val = Math.min(val, upperBounds[i]);
                }
                return val;
            });
        };
        
        let x = project([...x0]);
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: [...x], f: fx, gradNorm });
            
            // Check convergence using projected gradient
            const xTest = project(this._sub(x, this._scale(g, 1)));
            const projGradNorm = this._norm(this._sub(x, xTest));
            
            if (projGradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Projected Gradient'
                };
            }
            
            // Line search or fixed step
            let alpha = learningRate;
            
            if (lineSearch) {
                // Backtracking line search with projection
                const c = 0.0001;
                for (let ls = 0; ls < 30; ls++) {
                    const xNew = project(this._sub(x, this._scale(g, alpha)));
                    if (f(xNew) <= fx + c * this._dot(g, this._sub(xNew, x))) {
                        x = xNew;
                        break;
                    }
                    alpha *= 0.5;
                }
            } else {
                x = project(this._sub(x, this._scale(g, alpha)));
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Projected Gradient'
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.penalty.quadratic', 'PRISM_CONSTRAINED_OPTIMIZER.quadraticPenalty');
            PRISM_GATEWAY.register('opt.barrier.log', 'PRISM_CONSTRAINED_OPTIMIZER.logBarrier');
            PRISM_GATEWAY.register('opt.augmentedLagrangian', 'PRISM_CONSTRAINED_OPTIMIZER.augmentedLagrangian');
            PRISM_GATEWAY.register('opt.projectedGradient', 'PRISM_CONSTRAINED_OPTIMIZER.projectedGradient');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 4: PRISM_SQP_INTERIOR_POINT_ENGINE
// Sequential Quadratic Programming and Primal-Dual Interior Point
// Source: MIT 6.251J, Wright (IPM book)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_SQP_INTERIOR_POINT_ENGINE = {
    name: 'PRISM_SQP_INTERIOR_POINT_ENGINE',
    version: '1.0.0',
    description: 'SQP and Interior Point methods for constrained optimization',
    source: 'MIT 6.251J, Wright',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Sequential Quadratic Programming (SQP)
    // ─────────────────────────────────────────────────────────────────────────────
    
    sqp: function(config) {
        const {
            f,
            gradient,
            hessianApprox = 'bfgs',
            equalityConstraints = [],
            inequalityConstraints = [],
            x0,
            maxIter = 100,
            tol = 1e-6
        } = config;
        
        const nEq = equalityConstraints.length;
        const nIneq = inequalityConstraints.length;
        const n = x0.length;
        
        let x = [...x0];
        let lambda = new Array(nEq).fill(0);
        let mu = new Array(nIneq).fill(1);
        
        // Initialize approximate Hessian
        let B = this._identity(n);
        
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const fx = f(x);
            
            // Evaluate constraints
            const h = equalityConstraints.map(c => c(x));
            const gIneq = inequalityConstraints.map(c => c(x));
            
            // Check KKT conditions
            const kktViolation = this._computeKKTViolation(g, h, gIneq, lambda, mu, equalityConstraints, inequalityConstraints, x);
            
            history.push({ x: [...x], f: fx, kktViolation });
            
            if (kktViolation < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    lambda,
                    mu,
                    history,
                    method: 'SQP'
                };
            }
            
            // Solve QP subproblem
            // min 0.5 * d' * B * d + g' * d
            // s.t. Ae * d + h = 0 (equality)
            //      Ai * d + gIneq <= 0 (inequality)
            
            // Compute constraint Jacobians (numerical)
            const Ae = this._computeJacobian(equalityConstraints, x);
            const Ai = this._computeJacobian(inequalityConstraints, x);
            
            // Simplified QP solve using active set method
            const qpResult = this._solveQP(B, g, Ae, h, Ai, gIneq);
            
            if (!qpResult.success) {
                console.warn('QP subproblem failed');
                break;
            }
            
            const d = qpResult.d;
            const lambdaNew = qpResult.lambda;
            const muNew = qpResult.mu;
            
            // Line search with merit function
            const alpha = this._meritLineSearch(f, equalityConstraints, inequalityConstraints, x, d, g, rho);
            
            // BFGS update for B
            const xNew = this._add(x, this._scale(d, alpha));
            const gNew = gradient(xNew);
            
            const s = this._scale(d, alpha);
            const y = this._sub(gNew, g);
            
            // Damped BFGS update
            B = this._dampedBFGSUpdate(B, s, y);
            
            // Update
            x = xNew;
            lambda = lambdaNew;
            mu = muNew.map(m => Math.max(0, m));
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'SQP'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Primal-Dual Interior Point Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    primalDualInteriorPoint: function(config) {
        const {
            c,                    // Linear objective coefficients
            A,                    // Inequality constraint matrix (Ax <= b)
            b,                    // Inequality constraint RHS
            Aeq = null,           // Equality constraint matrix
            beq = null,           // Equality RHS
            x0 = null,
            maxIter = 100,
            tol = 1e-8
        } = config;
        
        const m = A.length;      // Number of inequalities
        const n = c.length;      // Number of variables
        const mEq = Aeq ? Aeq.length : 0;
        
        // Initialize
        let x = x0 || new Array(n).fill(1);
        let s = new Array(m).fill(1);  // Slack variables
        let lambda = new Array(m).fill(1); // Dual variables for inequality
        let nu = mEq > 0 ? new Array(mEq).fill(0) : []; // Dual for equality
        
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Residuals
            const Ax = this._matVec(A, x);
            const rp = Ax.map((ai, i) => ai + s[i] - b[i]); // Primal residual
            const rd = this._add(c, this._matVec(this._transpose(A), lambda)); // Dual residual
            if (Aeq) {
                const rdEq = this._matVec(this._transpose(Aeq), nu);
                for (let i = 0; i < n; i++) rd[i] += rdEq[i];
            }
            const rc = s.map((si, i) => si * lambda[i]); // Complementarity
            
            const rpNorm = this._norm(rp);
            const rdNorm = this._norm(rd);
            const mu = rc.reduce((a, b) => a + b, 0) / m; // Duality measure
            
            history.push({
                x: [...x],
                objective: this._dot(c, x),
                rpNorm,
                rdNorm,
                mu
            });
            
            // Check convergence
            if (rpNorm < tol && rdNorm < tol && mu < tol) {
                return {
                    x,
                    objective: this._dot(c, x),
                    converged: true,
                    iterations: iter,
                    lambda,
                    history,
                    method: 'Primal-Dual Interior Point'
                };
            }
            
            // Centering parameter
            const sigma = 0.1;
            const muTarget = sigma * mu;
            
            // Solve Newton system
            // [0  A'  Aeq'] [dx]    [-rd]
            // [A  0   0   ] [ds]  = [-rp]
            // [S  Lambda 0] [dlam]  [-rc + muTarget*e]
            
            // Simplified: solve using Schur complement
            const { dx, ds, dlambda } = this._solveIPMSystem(
                A, Aeq, s, lambda, rd, rp, rc, muTarget
            );
            
            // Line search to maintain positivity
            let alphaP = 1;
            let alphaD = 1;
            const tau = 0.995;
            
            for (let i = 0; i < m; i++) {
                if (ds[i] < 0) {
                    alphaP = Math.min(alphaP, -tau * s[i] / ds[i]);
                }
                if (dlambda[i] < 0) {
                    alphaD = Math.min(alphaD, -tau * lambda[i] / dlambda[i]);
                }
            }
            
            // Update
            x = this._add(x, this._scale(dx, alphaP));
            s = this._add(s, this._scale(ds, alphaP));
            lambda = this._add(lambda, this._scale(dlambda, alphaD));
        }
        
        return {
            x,
            objective: this._dot(c, x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Primal-Dual Interior Point'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Linear Programming (Simplex-like for small problems)
    // ─────────────────────────────────────────────────────────────────────────────
    
    linearProgramming: function(config) {
        const {
            c,        // Objective: min c'x
            A,        // Inequality constraints: Ax <= b
            b,
            Aeq = null,
            beq = null,
            bounds = null, // [[lb, ub], ...]
            method = 'interior_point'
        } = config;
        
        if (method === 'interior_point') {
            return this.primalDualInteriorPoint({ c, A, b, Aeq, beq });
        }
        
        // Use revised simplex for small problems
        return this._revisedSimplex({ c, A, b, Aeq, beq, bounds });
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Quadratic Programming
    // ─────────────────────────────────────────────────────────────────────────────
    
    quadraticProgramming: function(config) {
        const {
            H,        // Hessian: 0.5 * x' * H * x
            f,        // Linear: f' * x
            A = [],   // Inequality: Ax <= b
            b = [],
            Aeq = [], // Equality: Aeq * x = beq
            beq = [],
            x0 = null,
            maxIter = 1000,
            tol = 1e-8
        } = config;
        
        const n = f.length;
        
        // Use active set method
        let x = x0 || new Array(n).fill(0);
        let activeSet = new Set();
        
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Current objective value
            const objVal = 0.5 * this._quadForm(x, H, x) + this._dot(f, x);
            
            // Gradient
            const g = this._add(this._matVec(H, x), f);
            
            history.push({ x: [...x], objective: objVal, activeSetSize: activeSet.size });
            
            // Build KKT system for active constraints
            const activeConstraints = [...activeSet];
            const nActive = activeConstraints.length;
            const nEq = Aeq.length;
            
            // Solve equality-constrained QP
            // [H  A_active']  [d]    = [-g]
            // [A_active  0 ]  [lambda]   [-residual]
            
            let d, lambda;
            
            if (nActive + nEq === 0) {
                // Unconstrained step
                d = this._solveLinear(H, this._scale(g, -1));
                lambda = [];
            } else {
                const result = this._solveEqualityQP(H, g, Aeq, beq, A, b, activeConstraints, x);
                d = result.d;
                lambda = result.lambda;
            }
            
            // Check if we can make progress
            const dNorm = this._norm(d);
            
            if (dNorm < tol) {
                // Check multipliers for active inequalities
                let minLambda = Infinity;
                let minIdx = -1;
                
                for (let i = 0; i < lambda.length - nEq; i++) {
                    if (lambda[i + nEq] < minLambda) {
                        minLambda = lambda[i + nEq];
                        minIdx = activeConstraints[i];
                    }
                }
                
                if (minLambda >= -tol) {
                    // Optimal
                    return {
                        x,
                        objective: objVal,
                        converged: true,
                        iterations: iter,
                        activeSet: [...activeSet],
                        history,
                        method: 'QP Active Set'
                    };
                }
                
                // Remove constraint with most negative multiplier
                activeSet.delete(minIdx);
            } else {
                // Find step length
                let alpha = 1;
                let blockingConstraint = -1;
                
                for (let i = 0; i < A.length; i++) {
                    if (activeSet.has(i)) continue;
                    
                    const Ad = this._dot(A[i], d);
                    if (Ad > tol) {
                        const slack = b[i] - this._dot(A[i], x);
                        const alphaI = slack / Ad;
                        if (alphaI < alpha) {
                            alpha = alphaI;
                            blockingConstraint = i;
                        }
                    }
                }
                
                // Take step
                x = this._add(x, this._scale(d, alpha));
                
                // Add blocking constraint to active set
                if (blockingConstraint >= 0) {
                    activeSet.add(blockingConstraint);
                }
            }
        }
        
        return {
            x,
            objective: 0.5 * this._quadForm(x, H, x) + this._dot(f, x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'QP Active Set'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────────────────────
    
    _computeJacobian: function(constraints, x, eps = 1e-7) {
        return constraints.map(c => {
            const cx = c(x);
            return x.map((_, j) => {
                const xPlus = [...x];
                xPlus[j] += eps;
                return (c(xPlus) - cx) / eps;
            });
        });
    },
    
    _computeKKTViolation: function(g, h, gIneq, lambda, mu, eqCon, ineqCon, x) {
        let violation = 0;
        
        // Gradient of Lagrangian
        let gradL = [...g];
        // Add contributions from constraints (simplified)
        violation += this._norm(g);
        
        // Equality constraints
        for (const hi of h) {
            violation += Math.abs(hi);
        }
        
        // Inequality constraints
        for (let i = 0; i < gIneq.length; i++) {
            violation += Math.max(0, gIneq[i]);
            violation += Math.abs(mu[i] * gIneq[i]); // Complementarity
        }
        
        return violation;
    },
    
    _solveQP: function(B, g, Ae, h, Ai, gIneq) {
        // Simplified QP solver for SQP subproblem
        const n = g.length;
        
        // Solve unconstrained problem as approximation
        const d = this._solveLinear(B, this._scale(g, -1));
        
        return {
            success: true,
            d,
            lambda: new Array(Ae.length).fill(0),
            mu: new Array(Ai.length).fill(0)
        };
    },
    
    _meritLineSearch: function(f, eqCon, ineqCon, x, d, g, rho = 10) {
        const merit = (x) => {
            let val = f(x);
            for (const h of eqCon) val += rho * Math.abs(h(x));
            for (const g of ineqCon) val += rho * Math.max(0, g(x));
            return val;
        };
        
        let alpha = 1;
        const m0 = merit(x);
        
        for (let i = 0; i < 20; i++) {
            const xNew = this._add(x, this._scale(d, alpha));
            if (merit(xNew) < m0 - 0.0001 * alpha * this._norm(d)) {
                return alpha;
            }
            alpha *= 0.5;
        }
        
        return alpha;
    },
    
    _dampedBFGSUpdate: function(B, s, y) {
        const sTy = this._dot(s, y);
        const sBs = this._quadForm(s, B, s);
        
        if (sTy < 0.2 * sBs) {
            // Damping
            const theta = 0.8 * sBs / (sBs - sTy);
            const yDamped = this._add(this._scale(y, theta), this._scale(this._matVec(B, s), 1 - theta));
            return this._bfgsUpdate(B, s, yDamped);
        }
        
        return this._bfgsUpdate(B, s, y);
    },
    
    _bfgsUpdate: function(B, s, y) {
        const n = s.length;
        const sTy = this._dot(s, y);
        if (sTy < 1e-10) return B;
        
        const Bs = this._matVec(B, s);
        const sBs = this._dot(s, Bs);
        
        const newB = B.map((row, i) => row.map((bij, j) =>
            bij - Bs[i] * Bs[j] / sBs + y[i] * y[j] / sTy
        ));
        
        return newB;
    },
    
    _solveIPMSystem: function(A, Aeq, s, lambda, rd, rp, rc, muTarget) {
        const m = A.length;
        const n = rd.length;
        
        // Simplified solve using diagonal scaling
        const D = s.map((si, i) => lambda[i] / si);
        const rcMod = rc.map((rci, i) => -rci + muTarget - lambda[i] * rp[i]);
        
        // Solve reduced system
        // (A' * D * A) * dx = -rd + A' * D * (rcMod / lambda - rp)
        
        const dx = new Array(n).fill(0);
        // Simple iteration (would use proper linear solve in production)
        for (let i = 0; i < n; i++) {
            dx[i] = -rd[i] / (1 + D.reduce((sum, di) => sum + di * A.reduce((s, row) => s + row[i] * row[i], 0), 0));
        }
        
        const ds = rp.map((rpi, i) => -rpi - this._dot(A[i], dx));
        const dlambda = rcMod.map((rci, i) => (rci - lambda[i] * ds[i]) / s[i]);
        
        return { dx, ds, dlambda };
    },
    
    _solveEqualityQP: function(H, g, Aeq, beq, A, b, activeSet, x) {
        const n = g.length;
        const nActive = activeSet.length;
        const nEq = Aeq.length;
        
        // Build full constraint matrix
        const nCon = nEq + nActive;
        
        if (nCon === 0) {
            return { d: this._solveLinear(H, this._scale(g, -1)), lambda: [] };
        }
        
        // [H  C'] [d]      = [-g]
        // [C  0 ] [lambda]   [residual]
        
        const C = [];
        const residual = [];
        
        for (let i = 0; i < nEq; i++) {
            C.push(Aeq[i]);
            residual.push(beq[i] - this._dot(Aeq[i], x));
        }
        
        for (const i of activeSet) {
            C.push(A[i]);
            residual.push(0); // Active constraint satisfied
        }
        
        // Solve using null-space method (simplified)
        const d = this._solveLinear(H, this._scale(g, -1));
        const lambda = new Array(nCon).fill(0);
        
        return { d, lambda };
    },
    
    // Basic utilities
    _dot: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _norm: function(v) {
        return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
    },
    
    _scale: function(v, s) {
        return v.map(vi => vi * s);
    },
    
    _add: function(a, b) {
        return a.map((ai, i) => ai + b[i]);
    },
    
    _matVec: function(A, x) {
        return A.map(row => this._dot(row, x));
    },
    
    _transpose: function(A) {
        if (A.length === 0) return [];
        return A[0].map((_, j) => A.map(row => row[j]));
    },
    
    _quadForm: function(x, A, y) {
        return this._dot(x, this._matVec(A, y));
    },
    
    _identity: function(n) {
        return Array(n).fill(null).map((_, i) =>
            Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
    },
    
    _solveLinear: function(A, b) {
        return PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER._solveLinear(A, b);
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.sqp', 'PRISM_SQP_INTERIOR_POINT_ENGINE.sqp');
            PRISM_GATEWAY.register('opt.interiorPoint.primalDual', 'PRISM_SQP_INTERIOR_POINT_ENGINE.primalDualInteriorPoint');
            PRISM_GATEWAY.register('opt.lp', 'PRISM_SQP_INTERIOR_POINT_ENGINE.linearProgramming');
            PRISM_GATEWAY.register('opt.qp', 'PRISM_SQP_INTERIOR_POINT_ENGINE.quadraticProgramming');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 2 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession3Part2() {
    PRISM_CONSTRAINED_OPTIMIZER.register();
    PRISM_SQP_INTERIOR_POINT_ENGINE.register();
    
    console.log('[Session 3 Part 2] Registered 2 modules, 8 gateway routes');
    console.log('  - PRISM_CONSTRAINED_OPTIMIZER: Penalty, Barrier, Augmented Lagrangian, Projected Gradient');
    console.log('  - PRISM_SQP_INTERIOR_POINT_ENGINE: SQP, Primal-Dual IPM, LP, QP');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_CONSTRAINED_OPTIMIZER = PRISM_CONSTRAINED_OPTIMIZER;
    window.PRISM_SQP_INTERIOR_POINT_ENGINE = PRISM_SQP_INTERIOR_POINT_ENGINE;
    registerSession3Part2();
}

console.log('[Session 3 Part 2] Constrained Optimization loaded - 2 modules');
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 3: ULTIMATE OPTIMIZATION ENHANCEMENT - PART 3                              ║
 * ║ Combinatorial Optimization & Advanced Metaheuristics                                      ║
 * ║ Source: MIT 15.083J (Integer Programming), Kirkpatrick 1983, Glover 1986                 ║
 * ║ Target: +1,000 lines | 2 Modules | 15+ Gateway Routes                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 5: PRISM_COMBINATORIAL_OPTIMIZER
// Branch & Bound, Cutting Planes, Dynamic Programming
// Source: MIT 15.083J, Wolsey
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_COMBINATORIAL_OPTIMIZER = {
    name: 'PRISM_COMBINATORIAL_OPTIMIZER',
    version: '1.0.0',
    description: 'Combinatorial optimization: Branch & Bound, Cutting Planes, DP',
    source: 'MIT 15.083J, Wolsey',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Branch and Bound (for Integer Programming)
    // ─────────────────────────────────────────────────────────────────────────────
    
    branchAndBound: function(config) {
        const {
            objective,            // Function to minimize
            constraints,          // Array of constraint functions g(x) <= 0
            bounds,               // [[lb, ub], ...] for each variable
            integerVars,          // Indices of integer variables
            relaxationSolver,     // Function to solve LP relaxation
            maxNodes = 10000,
            tolerance = 1e-6,
            branchingRule = 'most_infeasible'
        } = config;
        
        const n = bounds.length;
        
        // Initialize best solution
        let bestSolution = null;
        let bestObjective = Infinity;
        let nodesExplored = 0;
        
        // Priority queue (ordered by bound)
        const queue = [{
            bounds: bounds.map(b => [...b]),
            lowerBound: -Infinity,
            depth: 0
        }];
        
        const history = [];
        
        while (queue.length > 0 && nodesExplored < maxNodes) {
            nodesExplored++;
            
            // Select node (best-first)
            queue.sort((a, b) => a.lowerBound - b.lowerBound);
            const node = queue.shift();
            
            // Prune if bound is worse than best
            if (node.lowerBound >= bestObjective - tolerance) {
                continue;
            }
            
            // Solve relaxation
            const relaxResult = relaxationSolver({
                objective,
                constraints,
                bounds: node.bounds
            });
            
            if (!relaxResult.feasible) {
                continue; // Infeasible node
            }
            
            // Check if solution is integer
            const x = relaxResult.x;
            const isInteger = this._checkIntegerFeasibility(x, integerVars, tolerance);
            
            if (isInteger) {
                const objVal = objective(x);
                if (objVal < bestObjective) {
                    bestSolution = [...x];
                    bestObjective = objVal;
                    
                    history.push({
                        node: nodesExplored,
                        objective: objVal,
                        type: 'integer_solution'
                    });
                }
            } else {
                // Branch on most fractional integer variable
                const branchVar = this._selectBranchingVariable(x, integerVars, branchingRule);
                
                if (branchVar >= 0) {
                    const val = x[branchVar];
                    const floorVal = Math.floor(val);
                    const ceilVal = Math.ceil(val);
                    
                    // Left child: x[i] <= floor(val)
                    const leftBounds = node.bounds.map(b => [...b]);
                    leftBounds[branchVar][1] = Math.min(leftBounds[branchVar][1], floorVal);
                    
                    if (leftBounds[branchVar][0] <= leftBounds[branchVar][1]) {
                        queue.push({
                            bounds: leftBounds,
                            lowerBound: relaxResult.objective,
                            depth: node.depth + 1
                        });
                    }
                    
                    // Right child: x[i] >= ceil(val)
                    const rightBounds = node.bounds.map(b => [...b]);
                    rightBounds[branchVar][0] = Math.max(rightBounds[branchVar][0], ceilVal);
                    
                    if (rightBounds[branchVar][0] <= rightBounds[branchVar][1]) {
                        queue.push({
                            bounds: rightBounds,
                            lowerBound: relaxResult.objective,
                            depth: node.depth + 1
                        });
                    }
                }
            }
        }
        
        return {
            x: bestSolution,
            objective: bestObjective,
            optimal: queue.length === 0 || nodesExplored < maxNodes,
            nodesExplored,
            remainingNodes: queue.length,
            history,
            method: 'Branch and Bound'
        };
    },
    
    _checkIntegerFeasibility: function(x, integerVars, tol) {
        for (const i of integerVars) {
            if (Math.abs(x[i] - Math.round(x[i])) > tol) {
                return false;
            }
        }
        return true;
    },
    
    _selectBranchingVariable: function(x, integerVars, rule) {
        let bestVar = -1;
        let bestFrac = -1;
        
        for (const i of integerVars) {
            const frac = Math.abs(x[i] - Math.round(x[i]));
            
            if (frac > 1e-6) {
                if (rule === 'most_infeasible') {
                    // Most fractional (closest to 0.5)
                    const dist = Math.abs(frac - 0.5);
                    if (bestVar < 0 || dist < Math.abs(bestFrac - 0.5)) {
                        bestVar = i;
                        bestFrac = frac;
                    }
                } else {
                    // First fractional
                    if (bestVar < 0) {
                        bestVar = i;
                        bestFrac = frac;
                    }
                }
            }
        }
        
        return bestVar;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dynamic Programming Framework
    // ─────────────────────────────────────────────────────────────────────────────
    
    dynamicProgramming: function(config) {
        const {
            stages,               // Number of stages
            stateSpace,           // Function(stage) returning possible states
            transitions,          // Function(stage, state, action) returning {nextState, cost}
            actions,              // Function(stage, state) returning possible actions
            terminalCost = () => 0,
            maximize = false
        } = config;
        
        const cmp = maximize ? (a, b) => a > b : (a, b) => a < b;
        const worst = maximize ? -Infinity : Infinity;
        
        // Value function and policy
        const V = new Map();  // V[stage][state] = optimal cost-to-go
        const policy = new Map(); // policy[stage][state] = optimal action
        
        // Initialize terminal stage
        V.set(stages, new Map());
        const terminalStates = stateSpace(stages);
        for (const state of terminalStates) {
            V.get(stages).set(JSON.stringify(state), terminalCost(state));
        }
        
        // Backward induction
        for (let t = stages - 1; t >= 0; t--) {
            V.set(t, new Map());
            policy.set(t, new Map());
            
            const states = stateSpace(t);
            
            for (const state of states) {
                const stateKey = JSON.stringify(state);
                let bestValue = worst;
                let bestAction = null;
                
                const possibleActions = actions(t, state);
                
                for (const action of possibleActions) {
                    const { nextState, cost } = transitions(t, state, action);
                    const nextStateKey = JSON.stringify(nextState);
                    
                    const futureValue = V.get(t + 1).get(nextStateKey);
                    if (futureValue === undefined) continue;
                    
                    const totalValue = cost + futureValue;
                    
                    if (cmp(totalValue, bestValue)) {
                        bestValue = totalValue;
                        bestAction = action;
                    }
                }
                
                V.get(t).set(stateKey, bestValue);
                policy.get(t).set(stateKey, bestAction);
            }
        }
        
        return {
            valueFunction: V,
            policy,
            
            // Extract optimal trajectory from initial state
            getOptimalPath: function(initialState) {
                const path = [{ stage: 0, state: initialState }];
                let state = initialState;
                let totalCost = 0;
                
                for (let t = 0; t < stages; t++) {
                    const stateKey = JSON.stringify(state);
                    const action = policy.get(t).get(stateKey);
                    
                    if (action === null || action === undefined) break;
                    
                    const { nextState, cost } = transitions(t, state, action);
                    totalCost += cost;
                    
                    path.push({
                        stage: t + 1,
                        state: nextState,
                        action,
                        cost
                    });
                    
                    state = nextState;
                }
                
                return { path, totalCost };
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Knapsack Problem (0/1 and Bounded)
    // ─────────────────────────────────────────────────────────────────────────────
    
    knapsack01: function(weights, values, capacity) {
        const n = weights.length;
        
        // DP table: dp[i][w] = max value using items 0..i-1 with capacity w
        const dp = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));
        
        for (let i = 1; i <= n; i++) {
            for (let w = 0; w <= capacity; w++) {
                dp[i][w] = dp[i - 1][w]; // Don't take item i-1
                
                if (weights[i - 1] <= w) {
                    dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
                }
            }
        }
        
        // Backtrack to find selected items
        const selected = [];
        let w = capacity;
        for (let i = n; i > 0 && w > 0; i--) {
            if (dp[i][w] !== dp[i - 1][w]) {
                selected.push(i - 1);
                w -= weights[i - 1];
            }
        }
        
        return {
            maxValue: dp[n][capacity],
            selectedItems: selected.reverse(),
            totalWeight: selected.reduce((sum, i) => sum + weights[i], 0)
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Assignment Problem (Hungarian Algorithm)
    // ─────────────────────────────────────────────────────────────────────────────
    
    hungarian: function(costMatrix) {
        const n = costMatrix.length;
        const m = costMatrix[0].length;
        const size = Math.max(n, m);
        
        // Pad to square if necessary
        const cost = Array(size).fill(null).map((_, i) =>
            Array(size).fill(0).map((_, j) =>
                i < n && j < m ? costMatrix[i][j] : 0
            )
        );
        
        // Initialize
        const u = new Array(size + 1).fill(0);
        const v = new Array(size + 1).fill(0);
        const p = new Array(size + 1).fill(0);
        const way = new Array(size + 1).fill(0);
        
        for (let i = 1; i <= size; i++) {
            p[0] = i;
            let j0 = 0;
            const minv = new Array(size + 1).fill(Infinity);
            const used = new Array(size + 1).fill(false);
            
            do {
                used[j0] = true;
                const i0 = p[j0];
                let delta = Infinity;
                let j1 = 0;
                
                for (let j = 1; j <= size; j++) {
                    if (!used[j]) {
                        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
                        if (cur < minv[j]) {
                            minv[j] = cur;
                            way[j] = j0;
                        }
                        if (minv[j] < delta) {
                            delta = minv[j];
                            j1 = j;
                        }
                    }
                }
                
                for (let j = 0; j <= size; j++) {
                    if (used[j]) {
                        u[p[j]] += delta;
                        v[j] -= delta;
                    } else {
                        minv[j] -= delta;
                    }
                }
                
                j0 = j1;
            } while (p[j0] !== 0);
            
            do {
                const j1 = way[j0];
                p[j0] = p[j1];
                j0 = j1;
            } while (j0);
        }
        
        // Extract assignment
        const assignment = [];
        let totalCost = 0;
        
        for (let j = 1; j <= size; j++) {
            if (p[j] !== 0 && p[j] <= n && j <= m) {
                assignment.push({ row: p[j] - 1, col: j - 1 });
                totalCost += costMatrix[p[j] - 1][j - 1];
            }
        }
        
        return { assignment, totalCost };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.branchAndBound', 'PRISM_COMBINATORIAL_OPTIMIZER.branchAndBound');
            PRISM_GATEWAY.register('opt.dp', 'PRISM_COMBINATORIAL_OPTIMIZER.dynamicProgramming');
            PRISM_GATEWAY.register('opt.knapsack', 'PRISM_COMBINATORIAL_OPTIMIZER.knapsack01');
            PRISM_GATEWAY.register('opt.hungarian', 'PRISM_COMBINATORIAL_OPTIMIZER.hungarian');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 6: PRISM_ADVANCED_METAHEURISTICS
// Enhanced Simulated Annealing, Tabu Search, Variable Neighborhood Search
// Source: Kirkpatrick 1983, Glover 1986, Mladenovic 1997
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_ADVANCED_METAHEURISTICS = {
    name: 'PRISM_ADVANCED_METAHEURISTICS',
    version: '1.0.0',
    description: 'Advanced metaheuristics: SA variants, Tabu Search, VNS, ILS',
    source: 'Kirkpatrick 1983, Glover 1986',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Enhanced Simulated Annealing
    // ─────────────────────────────────────────────────────────────────────────────
    
    simulatedAnnealingEnhanced: function(config) {
        const {
            initialSolution,
            objective,
            neighbor,
            T0 = 1000,              // Initial temperature
            Tmin = 1e-8,            // Final temperature
            coolingSchedule = 'geometric', // 'geometric', 'linear', 'adaptive'
            alpha = 0.95,           // Cooling rate for geometric
            iterationsPerTemp = 100,
            maxIterations = 100000,
            reheatingEnabled = true,
            reheatingThreshold = 1000
        } = config;
        
        let x = initialSolution();
        let fx = objective(x);
        let xBest = x;
        let fBest = fx;
        
        let T = T0;
        let iteration = 0;
        let itersSinceImprovement = 0;
        
        const history = [];
        
        while (T > Tmin && iteration < maxIterations) {
            for (let i = 0; i < iterationsPerTemp; i++) {
                iteration++;
                
                const xNew = neighbor(x);
                const fNew = objective(xNew);
                const delta = fNew - fx;
                
                // Acceptance criterion
                if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
                    x = xNew;
                    fx = fNew;
                    
                    if (fx < fBest) {
                        xBest = x;
                        fBest = fx;
                        itersSinceImprovement = 0;
                    } else {
                        itersSinceImprovement++;
                    }
                } else {
                    itersSinceImprovement++;
                }
                
                // Reheating
                if (reheatingEnabled && itersSinceImprovement > reheatingThreshold) {
                    T = Math.max(T, T0 * 0.5);
                    itersSinceImprovement = 0;
                    x = xBest; // Restart from best
                    fx = fBest;
                }
            }
            
            history.push({
                iteration,
                temperature: T,
                currentObjective: fx,
                bestObjective: fBest
            });
            
            // Cooling
            switch (coolingSchedule) {
                case 'geometric':
                    T *= alpha;
                    break;
                case 'linear':
                    T -= (T0 - Tmin) / (maxIterations / iterationsPerTemp);
                    break;
                case 'adaptive':
                    // Adjust based on acceptance rate
                    const targetRate = 0.3;
                    // Simplified adaptive: slow cooling when stuck
                    if (itersSinceImprovement > iterationsPerTemp) {
                        T *= 0.99;
                    } else {
                        T *= alpha;
                    }
                    break;
            }
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: iteration,
            finalTemperature: T,
            history,
            method: 'Simulated Annealing (Enhanced)'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Tabu Search
    // ─────────────────────────────────────────────────────────────────────────────
    
    tabuSearch: function(config) {
        const {
            initialSolution,
            objective,
            neighborhood,          // Function returning array of neighbors with move info
            tabuTenure = 10,       // How long moves stay tabu
            maxIterations = 10000,
            aspirationCriterion = true,
            intensificationEnabled = true,
            diversificationEnabled = true,
            diversificationThreshold = 100
        } = config;
        
        let x = initialSolution();
        let fx = objective(x);
        let xBest = x;
        let fBest = fx;
        
        const tabuList = new Map(); // move -> iteration when it becomes non-tabu
        let itersSinceImprovement = 0;
        
        // Frequency memory for diversification
        const frequencyMemory = new Map();
        
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            const neighbors = neighborhood(x);
            
            let bestNeighbor = null;
            let bestNeighborF = Infinity;
            let bestMove = null;
            
            for (const { solution, move } of neighbors) {
                const moveKey = JSON.stringify(move);
                const fNew = objective(solution);
                
                // Check if move is tabu
                const isTabu = tabuList.has(moveKey) && tabuList.get(moveKey) > iter;
                
                // Aspiration: accept tabu move if it improves best
                const aspirationMet = aspirationCriterion && fNew < fBest;
                
                if ((!isTabu || aspirationMet) && fNew < bestNeighborF) {
                    bestNeighbor = solution;
                    bestNeighborF = fNew;
                    bestMove = move;
                }
            }
            
            if (bestNeighbor === null) {
                // No valid move found
                break;
            }
            
            // Make move
            x = bestNeighbor;
            fx = bestNeighborF;
            
            // Update tabu list
            const moveKey = JSON.stringify(bestMove);
            tabuList.set(moveKey, iter + tabuTenure);
            
            // Update frequency memory
            frequencyMemory.set(moveKey, (frequencyMemory.get(moveKey) || 0) + 1);
            
            // Update best
            if (fx < fBest) {
                xBest = x;
                fBest = fx;
                itersSinceImprovement = 0;
            } else {
                itersSinceImprovement++;
            }
            
            // Intensification: reduce tabu tenure when improving
            if (intensificationEnabled && itersSinceImprovement === 0) {
                // Could intensify search around best solution
            }
            
            // Diversification: escape from local region
            if (diversificationEnabled && itersSinceImprovement > diversificationThreshold) {
                // Restart from a diversified solution
                x = initialSolution();
                fx = objective(x);
                itersSinceImprovement = 0;
            }
            
            history.push({
                iteration: iter,
                currentObjective: fx,
                bestObjective: fBest,
                tabuListSize: tabuList.size
            });
            
            // Clean old tabu entries
            for (const [key, expiry] of tabuList) {
                if (expiry <= iter) {
                    tabuList.delete(key);
                }
            }
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'Tabu Search'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Variable Neighborhood Search (VNS)
    // ─────────────────────────────────────────────────────────────────────────────
    
    variableNeighborhoodSearch: function(config) {
        const {
            initialSolution,
            objective,
            neighborhoods,         // Array of neighborhood functions (increasing size)
            localSearch,           // Local search procedure
            maxIterations = 10000,
            maxNeighborhoodChanges = 100
        } = config;
        
        let x = initialSolution();
        let fx = objective(x);
        let xBest = x;
        let fBest = fx;
        
        const kMax = neighborhoods.length;
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            let k = 0;
            let neighborhoodChanges = 0;
            
            while (k < kMax && neighborhoodChanges < maxNeighborhoodChanges) {
                // Shaking: generate random solution in k-th neighborhood
                const xShake = neighborhoods[k](x);
                
                // Local search
                const xLocal = localSearch(xShake);
                const fLocal = objective(xLocal);
                
                // Move or not
                if (fLocal < fx) {
                    x = xLocal;
                    fx = fLocal;
                    k = 0; // Reset to first neighborhood
                    
                    if (fx < fBest) {
                        xBest = x;
                        fBest = fx;
                    }
                } else {
                    k++; // Try next neighborhood
                }
                
                neighborhoodChanges++;
            }
            
            history.push({
                iteration: iter,
                currentObjective: fx,
                bestObjective: fBest,
                neighborhoodIndex: k
            });
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'Variable Neighborhood Search'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Iterated Local Search (ILS)
    // ─────────────────────────────────────────────────────────────────────────────
    
    iteratedLocalSearch: function(config) {
        const {
            initialSolution,
            objective,
            localSearch,
            perturbation,
            acceptanceCriterion = 'improving', // 'improving', 'always', 'metropolis'
            maxIterations = 10000,
            temperature = 1
        } = config;
        
        // Initial solution
        let x = localSearch(initialSolution());
        let fx = objective(x);
        let xBest = x;
        let fBest = fx;
        
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Perturbation
            const xPert = perturbation(x);
            
            // Local search
            const xNew = localSearch(xPert);
            const fNew = objective(xNew);
            
            // Acceptance
            let accept = false;
            
            switch (acceptanceCriterion) {
                case 'improving':
                    accept = fNew < fx;
                    break;
                case 'always':
                    accept = true;
                    break;
                case 'metropolis':
                    accept = fNew < fx || Math.random() < Math.exp((fx - fNew) / temperature);
                    break;
            }
            
            if (accept) {
                x = xNew;
                fx = fNew;
            }
            
            // Update best
            if (fx < fBest) {
                xBest = x;
                fBest = fx;
            }
            
            history.push({
                iteration: iter,
                currentObjective: fx,
                bestObjective: fBest
            });
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'Iterated Local Search'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // GRASP (Greedy Randomized Adaptive Search Procedure)
    // ─────────────────────────────────────────────────────────────────────────────
    
    grasp: function(config) {
        const {
            greedyRandomizedConstruction,
            localSearch,
            objective,
            maxIterations = 1000,
            alpha = 0.3    // Randomization parameter (0 = greedy, 1 = random)
        } = config;
        
        let xBest = null;
        let fBest = Infinity;
        
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Construction phase
            const xConstruct = greedyRandomizedConstruction(alpha);
            
            // Local search phase
            const xLocal = localSearch(xConstruct);
            const fLocal = objective(xLocal);
            
            // Update best
            if (fLocal < fBest) {
                xBest = xLocal;
                fBest = fLocal;
            }
            
            history.push({
                iteration: iter,
                constructedObjective: objective(xConstruct),
                localObjective: fLocal,
                bestObjective: fBest
            });
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'GRASP'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Scatter Search
    // ─────────────────────────────────────────────────────────────────────────────
    
    scatterSearch: function(config) {
        const {
            diversificationGenerator,
            objective,
            improvement,
            combination,
            refSetSize = 20,
            maxIterations = 100
        } = config;
        
        // Generate diverse initial solutions
        const P = [];
        for (let i = 0; i < refSetSize * 5; i++) {
            const x = diversificationGenerator();
            const xImproved = improvement(x);
            P.push({ x: xImproved, f: objective(xImproved) });
        }
        
        // Sort by quality and diversity
        P.sort((a, b) => a.f - b.f);
        
        // Initialize reference set
        const refSet = P.slice(0, refSetSize);
        
        let xBest = refSet[0].x;
        let fBest = refSet[0].f;
        
        const history = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            const newSolutions = [];
            
            // Generate new solutions by combining pairs from refSet
            for (let i = 0; i < refSet.length; i++) {
                for (let j = i + 1; j < refSet.length; j++) {
                    const combined = combination(refSet[i].x, refSet[j].x);
                    for (const xNew of combined) {
                        const xImproved = improvement(xNew);
                        const fNew = objective(xImproved);
                        newSolutions.push({ x: xImproved, f: fNew });
                        
                        if (fNew < fBest) {
                            xBest = xImproved;
                            fBest = fNew;
                        }
                    }
                }
            }
            
            // Update reference set with best solutions
            const all = [...refSet, ...newSolutions];
            all.sort((a, b) => a.f - b.f);
            
            // Take best unique solutions
            const seen = new Set();
            refSet.length = 0;
            for (const sol of all) {
                const key = JSON.stringify(sol.x);
                if (!seen.has(key) && refSet.length < refSetSize) {
                    seen.add(key);
                    refSet.push(sol);
                }
            }
            
            history.push({
                iteration: iter,
                bestObjective: fBest,
                refSetBest: refSet[0].f
            });
        }
        
        return {
            x: xBest,
            objective: fBest,
            iterations: maxIterations,
            history,
            method: 'Scatter Search'
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('meta.sa.enhanced', 'PRISM_ADVANCED_METAHEURISTICS.simulatedAnnealingEnhanced');
            PRISM_GATEWAY.register('meta.tabu', 'PRISM_ADVANCED_METAHEURISTICS.tabuSearch');
            PRISM_GATEWAY.register('meta.vns', 'PRISM_ADVANCED_METAHEURISTICS.variableNeighborhoodSearch');
            PRISM_GATEWAY.register('meta.ils', 'PRISM_ADVANCED_METAHEURISTICS.iteratedLocalSearch');
            PRISM_GATEWAY.register('meta.grasp', 'PRISM_ADVANCED_METAHEURISTICS.grasp');
            PRISM_GATEWAY.register('meta.scatterSearch', 'PRISM_ADVANCED_METAHEURISTICS.scatterSearch');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 3 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession3Part3() {
    PRISM_COMBINATORIAL_OPTIMIZER.register();
    PRISM_ADVANCED_METAHEURISTICS.register();
    
    console.log('[Session 3 Part 3] Registered 2 modules, 10 gateway routes');
    console.log('  - PRISM_COMBINATORIAL_OPTIMIZER: Branch & Bound, DP, Knapsack, Hungarian');
    console.log('  - PRISM_ADVANCED_METAHEURISTICS: SA, Tabu, VNS, ILS, GRASP, Scatter Search');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_COMBINATORIAL_OPTIMIZER = PRISM_COMBINATORIAL_OPTIMIZER;
    window.PRISM_ADVANCED_METAHEURISTICS = PRISM_ADVANCED_METAHEURISTICS;
    registerSession3Part3();
}

console.log('[Session 3 Part 3] Combinatorial & Metaheuristics loaded - 2 modules');
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 3: ULTIMATE OPTIMIZATION ENHANCEMENT - PART 4                              ║
 * ║ Multi-Objective Optimization: NSGA-II, MOEA/D, Pareto Methods                            ║
 * ║ Source: Deb 2002, Zhang & Li 2007, MIT 15.084j                                           ║
 * ║ Target: +1,000 lines | 2 Modules | 15+ Gateway Routes                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 7: PRISM_MULTI_OBJECTIVE_ENGINE
// NSGA-II, NSGA-III, Pareto Dominance, Crowding Distance
// Source: Deb 2002, Deb & Jain 2014
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_MULTI_OBJECTIVE_ENGINE = {
    name: 'PRISM_MULTI_OBJECTIVE_ENGINE',
    version: '1.0.0',
    description: 'Multi-objective optimization: NSGA-II, NSGA-III, Pareto methods',
    source: 'Deb 2002, Deb & Jain 2014',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Pareto Dominance Check
    // ─────────────────────────────────────────────────────────────────────────────
    
    dominates: function(a, b) {
        // Returns true if a dominates b (all objectives minimized)
        let dominated = true;
        let strictlyBetter = false;
        
        for (let i = 0; i < a.length; i++) {
            if (a[i] > b[i]) {
                dominated = false;
                break;
            }
            if (a[i] < b[i]) {
                strictlyBetter = true;
            }
        }
        
        return dominated && strictlyBetter;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Non-Dominated Sorting
    // ─────────────────────────────────────────────────────────────────────────────
    
    nonDominatedSort: function(population) {
        const n = population.length;
        const dominationCount = new Array(n).fill(0);
        const dominatedBy = population.map(() => []);
        const fronts = [[]];
        
        // Calculate domination relationships
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (this.dominates(population[i].objectives, population[j].objectives)) {
                    dominatedBy[i].push(j);
                    dominationCount[j]++;
                } else if (this.dominates(population[j].objectives, population[i].objectives)) {
                    dominatedBy[j].push(i);
                    dominationCount[i]++;
                }
            }
            
            if (dominationCount[i] === 0) {
                population[i].rank = 0;
                fronts[0].push(i);
            }
        }
        
        // Build fronts
        let frontIndex = 0;
        while (fronts[frontIndex].length > 0) {
            const nextFront = [];
            
            for (const i of fronts[frontIndex]) {
                for (const j of dominatedBy[i]) {
                    dominationCount[j]--;
                    if (dominationCount[j] === 0) {
                        population[j].rank = frontIndex + 1;
                        nextFront.push(j);
                    }
                }
            }
            
            frontIndex++;
            fronts.push(nextFront);
        }
        
        fronts.pop(); // Remove empty last front
        return fronts;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Crowding Distance
    // ─────────────────────────────────────────────────────────────────────────────
    
    calculateCrowdingDistance: function(population, frontIndices) {
        const n = frontIndices.length;
        if (n === 0) return;
        
        const numObjectives = population[frontIndices[0]].objectives.length;
        
        // Initialize distances
        for (const i of frontIndices) {
            population[i].crowdingDistance = 0;
        }
        
        // Calculate distance for each objective
        for (let m = 0; m < numObjectives; m++) {
            // Sort by this objective
            const sorted = [...frontIndices].sort((a, b) =>
                population[a].objectives[m] - population[b].objectives[m]
            );
            
            // Boundary points get infinite distance
            population[sorted[0]].crowdingDistance = Infinity;
            population[sorted[n - 1]].crowdingDistance = Infinity;
            
            // Calculate range
            const fMin = population[sorted[0]].objectives[m];
            const fMax = population[sorted[n - 1]].objectives[m];
            const range = fMax - fMin;
            
            if (range === 0) continue;
            
            // Calculate distance for interior points
            for (let i = 1; i < n - 1; i++) {
                const prev = population[sorted[i - 1]].objectives[m];
                const next = population[sorted[i + 1]].objectives[m];
                population[sorted[i]].crowdingDistance += (next - prev) / range;
            }
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // NSGA-II
    // ─────────────────────────────────────────────────────────────────────────────
    
    nsgaII: function(config) {
        const {
            objectives,           // Array of objective functions
            bounds,               // [[lb, ub], ...] for each variable
            populationSize = 100,
            maxGenerations = 100,
            crossoverProbability = 0.9,
            mutationProbability = 0.1,
            mutationScale = 0.1
        } = config;
        
        const n = bounds.length;
        const numObjectives = objectives.length;
        
        // Initialize population
        let population = this._initializePopulation(populationSize, bounds);
        this._evaluatePopulation(population, objectives);
        
        const history = [];
        
        for (let gen = 0; gen < maxGenerations; gen++) {
            // Create offspring
            const offspring = [];
            
            while (offspring.length < populationSize) {
                // Tournament selection
                const parent1 = this._tournamentSelect(population);
                const parent2 = this._tournamentSelect(population);
                
                // Crossover
                let child1, child2;
                if (Math.random() < crossoverProbability) {
                    [child1, child2] = this._sbxCrossover(parent1.x, parent2.x, bounds);
                } else {
                    child1 = [...parent1.x];
                    child2 = [...parent2.x];
                }
                
                // Mutation
                this._polynomialMutation(child1, bounds, mutationProbability, mutationScale);
                this._polynomialMutation(child2, bounds, mutationProbability, mutationScale);
                
                offspring.push({ x: child1 });
                if (offspring.length < populationSize) {
                    offspring.push({ x: child2 });
                }
            }
            
            // Evaluate offspring
            this._evaluatePopulation(offspring, objectives);
            
            // Combine parent and offspring
            const combined = [...population, ...offspring];
            
            // Non-dominated sorting
            const fronts = this.nonDominatedSort(combined);
            
            // Select next generation
            const nextGeneration = [];
            let frontIndex = 0;
            
            while (nextGeneration.length + fronts[frontIndex].length <= populationSize) {
                for (const i of fronts[frontIndex]) {
                    nextGeneration.push(combined[i]);
                }
                frontIndex++;
                
                if (frontIndex >= fronts.length) break;
            }
            
            // Fill remaining with crowding distance
            if (nextGeneration.length < populationSize && frontIndex < fronts.length) {
                this.calculateCrowdingDistance(combined, fronts[frontIndex]);
                
                const lastFront = fronts[frontIndex].map(i => combined[i]);
                lastFront.sort((a, b) => b.crowdingDistance - a.crowdingDistance);
                
                const remaining = populationSize - nextGeneration.length;
                for (let i = 0; i < remaining; i++) {
                    nextGeneration.push(lastFront[i]);
                }
            }
            
            population = nextGeneration;
            
            // Get Pareto front for history
            const paretoFront = fronts[0].map(i => ({
                x: combined[i].x,
                objectives: combined[i].objectives
            }));
            
            history.push({
                generation: gen,
                paretoFrontSize: paretoFront.length,
                hypervolume: this._calculateHypervolume(paretoFront, numObjectives)
            });
        }
        
        // Final Pareto front
        const finalFronts = this.nonDominatedSort(population);
        const paretoFront = finalFronts[0].map(i => ({
            x: population[i].x,
            objectives: population[i].objectives
        }));
        
        return {
            paretoFront,
            population,
            generations: maxGenerations,
            history,
            method: 'NSGA-II'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Methods for NSGA-II
    // ─────────────────────────────────────────────────────────────────────────────
    
    _initializePopulation: function(size, bounds) {
        return Array(size).fill(null).map(() => ({
            x: bounds.map(([lb, ub]) => lb + Math.random() * (ub - lb))
        }));
    },
    
    _evaluatePopulation: function(population, objectives) {
        for (const individual of population) {
            individual.objectives = objectives.map(f => f(individual.x));
        }
    },
    
    _tournamentSelect: function(population, tournamentSize = 2) {
        let best = null;
        
        for (let i = 0; i < tournamentSize; i++) {
            const candidate = population[Math.floor(Math.random() * population.length)];
            
            if (best === null) {
                best = candidate;
            } else if (candidate.rank < best.rank) {
                best = candidate;
            } else if (candidate.rank === best.rank && candidate.crowdingDistance > best.crowdingDistance) {
                best = candidate;
            }
        }
        
        return best;
    },
    
    _sbxCrossover: function(parent1, parent2, bounds, eta = 20) {
        const n = parent1.length;
        const child1 = new Array(n);
        const child2 = new Array(n);
        
        for (let i = 0; i < n; i++) {
            if (Math.random() < 0.5) {
                const [lb, ub] = bounds[i];
                const y1 = Math.min(parent1[i], parent2[i]);
                const y2 = Math.max(parent1[i], parent2[i]);
                
                if (y2 - y1 > 1e-10) {
                    const beta1 = 1 + 2 * (y1 - lb) / (y2 - y1);
                    const beta2 = 1 + 2 * (ub - y2) / (y2 - y1);
                    
                    const alpha1 = 2 - Math.pow(beta1, -(eta + 1));
                    const alpha2 = 2 - Math.pow(beta2, -(eta + 1));
                    
                    const u = Math.random();
                    
                    const betaq1 = u <= 1/alpha1 ?
                        Math.pow(u * alpha1, 1/(eta + 1)) :
                        Math.pow(1 / (2 - u * alpha1), 1/(eta + 1));
                    
                    const betaq2 = u <= 1/alpha2 ?
                        Math.pow(u * alpha2, 1/(eta + 1)) :
                        Math.pow(1 / (2 - u * alpha2), 1/(eta + 1));
                    
                    child1[i] = 0.5 * ((y1 + y2) - betaq1 * (y2 - y1));
                    child2[i] = 0.5 * ((y1 + y2) + betaq2 * (y2 - y1));
                    
                    child1[i] = Math.max(lb, Math.min(ub, child1[i]));
                    child2[i] = Math.max(lb, Math.min(ub, child2[i]));
                } else {
                    child1[i] = parent1[i];
                    child2[i] = parent2[i];
                }
            } else {
                child1[i] = parent1[i];
                child2[i] = parent2[i];
            }
        }
        
        return [child1, child2];
    },
    
    _polynomialMutation: function(x, bounds, probability, scale, eta = 20) {
        for (let i = 0; i < x.length; i++) {
            if (Math.random() < probability) {
                const [lb, ub] = bounds[i];
                const delta = ub - lb;
                const u = Math.random();
                
                let deltaq;
                if (u < 0.5) {
                    deltaq = Math.pow(2 * u, 1/(eta + 1)) - 1;
                } else {
                    deltaq = 1 - Math.pow(2 * (1 - u), 1/(eta + 1));
                }
                
                x[i] += deltaq * delta * scale;
                x[i] = Math.max(lb, Math.min(ub, x[i]));
            }
        }
    },
    
    _calculateHypervolume: function(front, numObjectives) {
        // Simplified hypervolume calculation (2D only for now)
        if (numObjectives !== 2 || front.length === 0) {
            return 0;
        }
        
        // Reference point (nadir)
        const refPoint = [1.1, 1.1]; // Assuming normalized objectives
        
        // Sort by first objective
        const sorted = [...front].sort((a, b) => a.objectives[0] - b.objectives[0]);
        
        let hv = 0;
        for (let i = 0; i < sorted.length; i++) {
            const width = (i === sorted.length - 1 ? refPoint[0] : sorted[i + 1].objectives[0]) - sorted[i].objectives[0];
            const height = refPoint[1] - sorted[i].objectives[1];
            hv += width * height;
        }
        
        return hv;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('moo.nsgaII', 'PRISM_MULTI_OBJECTIVE_ENGINE.nsgaII');
            PRISM_GATEWAY.register('moo.dominates', 'PRISM_MULTI_OBJECTIVE_ENGINE.dominates');
            PRISM_GATEWAY.register('moo.nonDominatedSort', 'PRISM_MULTI_OBJECTIVE_ENGINE.nonDominatedSort');
            PRISM_GATEWAY.register('moo.crowdingDistance', 'PRISM_MULTI_OBJECTIVE_ENGINE.calculateCrowdingDistance');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 8: PRISM_MOEAD_ENGINE
// MOEA/D and Scalarization Methods
// Source: Zhang & Li 2007
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_MOEAD_ENGINE = {
    name: 'PRISM_MOEAD_ENGINE',
    version: '1.0.0',
    description: 'MOEA/D and scalarization methods for multi-objective optimization',
    source: 'Zhang & Li 2007',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MOEA/D (Multi-objective Evolutionary Algorithm based on Decomposition)
    // ─────────────────────────────────────────────────────────────────────────────
    
    moead: function(config) {
        const {
            objectives,
            bounds,
            numSubproblems = 100,
            neighborhoodSize = 20,
            maxGenerations = 100,
            scalarizationMethod = 'tchebycheff', // 'weighted_sum', 'tchebycheff', 'pbi'
            crossoverProbability = 0.9,
            mutationProbability = 0.1
        } = config;
        
        const n = bounds.length;
        const numObjectives = objectives.length;
        
        // Generate weight vectors
        const weights = this._generateWeightVectors(numSubproblems, numObjectives);
        
        // Calculate neighborhoods
        const neighborhoods = this._calculateNeighborhoods(weights, neighborhoodSize);
        
        // Initialize population (one solution per subproblem)
        const population = weights.map(() => ({
            x: bounds.map(([lb, ub]) => lb + Math.random() * (ub - lb))
        }));
        
        // Evaluate
        for (const ind of population) {
            ind.objectives = objectives.map(f => f(ind.x));
        }
        
        // Reference point (ideal point)
        let z = new Array(numObjectives).fill(Infinity);
        for (const ind of population) {
            for (let j = 0; j < numObjectives; j++) {
                z[j] = Math.min(z[j], ind.objectives[j]);
            }
        }
        
        const history = [];
        
        for (let gen = 0; gen < maxGenerations; gen++) {
            for (let i = 0; i < numSubproblems; i++) {
                // Select parents from neighborhood
                const neighborhood = neighborhoods[i];
                const p1Idx = neighborhood[Math.floor(Math.random() * neighborhood.length)];
                const p2Idx = neighborhood[Math.floor(Math.random() * neighborhood.length)];
                
                // Create offspring
                let child;
                if (Math.random() < crossoverProbability) {
                    [child] = this._deCrossover(
                        population[i].x,
                        population[p1Idx].x,
                        population[p2Idx].x,
                        bounds
                    );
                } else {
                    child = [...population[i].x];
                }
                
                // Mutation
                this._mutation(child, bounds, mutationProbability);
                
                // Evaluate
                const childObjectives = objectives.map(f => f(child));
                
                // Update reference point
                for (let j = 0; j < numObjectives; j++) {
                    z[j] = Math.min(z[j], childObjectives[j]);
                }
                
                // Update neighbors
                for (const j of neighborhood) {
                    const parentValue = this._scalarize(
                        population[j].objectives, weights[j], z, scalarizationMethod
                    );
                    const childValue = this._scalarize(
                        childObjectives, weights[j], z, scalarizationMethod
                    );
                    
                    if (childValue < parentValue) {
                        population[j] = {
                            x: [...child],
                            objectives: [...childObjectives]
                        };
                    }
                }
            }
            
            // Get non-dominated solutions
            const nonDominated = this._getNonDominated(population);
            
            history.push({
                generation: gen,
                nonDominatedCount: nonDominated.length
            });
        }
        
        // Final Pareto front
        const paretoFront = this._getNonDominated(population);
        
        return {
            paretoFront,
            population,
            weights,
            referencePoint: z,
            generations: maxGenerations,
            history,
            method: 'MOEA/D'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Weight Vector Generation (Das-Dennis method)
    // ─────────────────────────────────────────────────────────────────────────────
    
    _generateWeightVectors: function(H, numObjectives) {
        // Generate uniformly distributed weight vectors
        const weights = [];
        
        if (numObjectives === 2) {
            for (let i = 0; i <= H; i++) {
                weights.push([i / H, 1 - i / H]);
            }
        } else if (numObjectives === 3) {
            for (let i = 0; i <= H; i++) {
                for (let j = 0; j <= H - i; j++) {
                    weights.push([i / H, j / H, (H - i - j) / H]);
                }
            }
        } else {
            // Random weights for higher dimensions
            for (let i = 0; i < H; i++) {
                const w = new Array(numObjectives).fill(0).map(() => Math.random());
                const sum = w.reduce((a, b) => a + b, 0);
                weights.push(w.map(wi => wi / sum));
            }
        }
        
        return weights;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Neighborhood Calculation
    // ─────────────────────────────────────────────────────────────────────────────
    
    _calculateNeighborhoods: function(weights, T) {
        const N = weights.length;
        
        // Calculate Euclidean distances between weight vectors
        const distances = weights.map((w1, i) =>
            weights.map((w2, j) =>
                i === j ? Infinity : Math.sqrt(
                    w1.reduce((sum, w1k, k) => sum + Math.pow(w1k - w2[k], 2), 0)
                )
            )
        );
        
        // Find T nearest neighbors
        return distances.map(dists => {
            const indexed = dists.map((d, i) => ({ d, i }));
            indexed.sort((a, b) => a.d - b.d);
            return indexed.slice(0, T).map(({ i }) => i);
        });
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Scalarization Methods
    // ─────────────────────────────────────────────────────────────────────────────
    
    _scalarize: function(objectives, weights, z, method) {
        switch (method) {
            case 'weighted_sum':
                return objectives.reduce((sum, fi, i) => sum + weights[i] * fi, 0);
                
            case 'tchebycheff':
                return Math.max(...objectives.map((fi, i) => 
                    weights[i] * Math.abs(fi - z[i])
                ));
                
            case 'pbi': {
                const theta = 5; // Penalty parameter
                const d1 = objectives.reduce((sum, fi, i) => 
                    sum + weights[i] * (fi - z[i]), 0
                ) / Math.sqrt(weights.reduce((sum, wi) => sum + wi * wi, 0));
                
                const d2 = Math.sqrt(objectives.reduce((sum, fi, i) => {
                    const diff = fi - (z[i] + d1 * weights[i]);
                    return sum + diff * diff;
                }, 0));
                
                return d1 + theta * d2;
            }
                
            default:
                return objectives.reduce((sum, fi, i) => sum + weights[i] * fi, 0);
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Genetic Operators
    // ─────────────────────────────────────────────────────────────────────────────
    
    _deCrossover: function(target, p1, p2, bounds, F = 0.5) {
        const n = target.length;
        const child = new Array(n);
        
        for (let i = 0; i < n; i++) {
            child[i] = target[i] + F * (p1[i] - p2[i]);
            child[i] = Math.max(bounds[i][0], Math.min(bounds[i][1], child[i]));
        }
        
        return [child];
    },
    
    _mutation: function(x, bounds, probability) {
        for (let i = 0; i < x.length; i++) {
            if (Math.random() < probability) {
                const [lb, ub] = bounds[i];
                x[i] += (Math.random() - 0.5) * 0.1 * (ub - lb);
                x[i] = Math.max(lb, Math.min(ub, x[i]));
            }
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Get Non-Dominated Solutions
    // ─────────────────────────────────────────────────────────────────────────────
    
    _getNonDominated: function(population) {
        const nonDominated = [];
        
        for (const ind of population) {
            let dominated = false;
            
            for (const other of population) {
                if (ind !== other && PRISM_MULTI_OBJECTIVE_ENGINE.dominates(other.objectives, ind.objectives)) {
                    dominated = true;
                    break;
                }
            }
            
            if (!dominated) {
                nonDominated.push({
                    x: ind.x,
                    objectives: ind.objectives
                });
            }
        }
        
        return nonDominated;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Weighted Sum Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    weightedSum: function(config) {
        const {
            objectives,
            bounds,
            weights,
            optimizer = 'lbfgs'
        } = config;
        
        const scalarizedObjective = (x) =>
            objectives.reduce((sum, f, i) => sum + weights[i] * f(x), 0);
        
        const scalarizedGradient = (x) => {
            const eps = 1e-7;
            return x.map((_, i) => {
                const xPlus = [...x];
                const xMinus = [...x];
                xPlus[i] += eps;
                xMinus[i] -= eps;
                return (scalarizedObjective(xPlus) - scalarizedObjective(xMinus)) / (2 * eps);
            });
        };
        
        const x0 = bounds.map(([lb, ub]) => (lb + ub) / 2);
        
        const result = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs({
            f: scalarizedObjective,
            gradient: scalarizedGradient,
            x0
        });
        
        return {
            x: result.x,
            objectives: objectives.map(f => f(result.x)),
            weights,
            method: 'Weighted Sum'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Epsilon-Constraint Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    epsilonConstraint: function(config) {
        const {
            objectives,
            bounds,
            primaryObjective = 0,
            epsilons,   // Upper bounds for non-primary objectives
            optimizer = 'augmented_lagrangian'
        } = config;
        
        const numObjectives = objectives.length;
        
        // Primary objective
        const f = objectives[primaryObjective];
        
        // Epsilon constraints for other objectives
        const constraints = [];
        let epsilonIdx = 0;
        
        for (let i = 0; i < numObjectives; i++) {
            if (i !== primaryObjective) {
                const objIdx = i;
                const eps = epsilons[epsilonIdx++];
                constraints.push((x) => objectives[objIdx](x) - eps);
            }
        }
        
        const gradient = (x) => {
            const eps = 1e-7;
            return x.map((_, i) => {
                const xPlus = [...x];
                const xMinus = [...x];
                xPlus[i] += eps;
                xMinus[i] -= eps;
                return (f(xPlus) - f(xMinus)) / (2 * eps);
            });
        };
        
        const x0 = bounds.map(([lb, ub]) => (lb + ub) / 2);
        
        const result = PRISM_CONSTRAINED_OPTIMIZER.augmentedLagrangian({
            f,
            gradient,
            inequalityConstraints: constraints,
            x0
        });
        
        return {
            x: result.x,
            objectives: objectives.map(obj => obj(result.x)),
            epsilons,
            method: 'Epsilon-Constraint'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Generate Pareto Front (by varying weights)
    // ─────────────────────────────────────────────────────────────────────────────
    
    generateParetoFront: function(config) {
        const {
            objectives,
            bounds,
            numPoints = 20,
            method = 'weighted_sum'
        } = config;
        
        const numObjectives = objectives.length;
        const weights = PRISM_MOEAD_ENGINE._generateWeightVectors(numPoints, numObjectives);
        
        const paretoFront = [];
        
        for (const w of weights) {
            let result;
            
            if (method === 'weighted_sum') {
                result = this.weightedSum({ objectives, bounds, weights: w });
            } else if (method === 'epsilon') {
                // Use weighted sum first to estimate ranges
                const wsResult = this.weightedSum({ objectives, bounds, weights: w });
                const epsilons = wsResult.objectives.slice(1).map(o => o * 1.1);
                result = this.epsilonConstraint({ objectives, bounds, primaryObjective: 0, epsilons });
            }
            
            paretoFront.push({
                x: result.x,
                objectives: result.objectives,
                weights: w
            });
        }
        
        // Remove dominated solutions
        return paretoFront.filter((sol, i) =>
            !paretoFront.some((other, j) =>
                i !== j && PRISM_MULTI_OBJECTIVE_ENGINE.dominates(other.objectives, sol.objectives)
            )
        );
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('moo.moead', 'PRISM_MOEAD_ENGINE.moead');
            PRISM_GATEWAY.register('moo.weightedSum', 'PRISM_MOEAD_ENGINE.weightedSum');
            PRISM_GATEWAY.register('moo.epsilonConstraint', 'PRISM_MOEAD_ENGINE.epsilonConstraint');
            PRISM_GATEWAY.register('moo.generateParetoFront', 'PRISM_MOEAD_ENGINE.generateParetoFront');
            PRISM_GATEWAY.register('moo.weightVectors', 'PRISM_MOEAD_ENGINE._generateWeightVectors');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 4 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession3Part4() {
    PRISM_MULTI_OBJECTIVE_ENGINE.register();
    PRISM_MOEAD_ENGINE.register();
    
    console.log('[Session 3 Part 4] Registered 2 modules, 9 gateway routes');
    console.log('  - PRISM_MULTI_OBJECTIVE_ENGINE: NSGA-II, Pareto Dominance, Crowding Distance');
    console.log('  - PRISM_MOEAD_ENGINE: MOEA/D, Weighted Sum, Epsilon-Constraint, Pareto Generation');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_MULTI_OBJECTIVE_ENGINE = PRISM_MULTI_OBJECTIVE_ENGINE;
    window.PRISM_MOEAD_ENGINE = PRISM_MOEAD_ENGINE;
    registerSession3Part4();
}

console.log('[Session 3 Part 4] Multi-Objective Optimization loaded - 2 modules');

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4: PHYSICS & DYNAMICS ENHANCEMENT
// Source: MIT 16.07 Dynamics, MIT 16.050 Thermal Energy, MIT 2.004 Controls
// Algorithms: Kinematics, Dynamics, Vibration, Thermal Analysis
// Integration Date: January 18, 2026
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PRISM SESSION 4 PART 1: ADVANCED KINEMATICS & RIGID BODY DYNAMICS
// Source: MIT 16.07 (Dynamics), MIT 2.004 (Controls), Stanford CS 223A (Robotics)
// Algorithms: DH Parameters, Jacobian, Newton-Euler, Lagrangian, Inertia Tensor
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * PRISM_ADVANCED_KINEMATICS_ENGINE
 * Complete kinematics system for multi-axis machines
 * Source: MIT 16.07 Lectures 3-8, Stanford CS 223A
 */
const PRISM_ADVANCED_KINEMATICS_ENGINE = {
    name: 'PRISM_ADVANCED_KINEMATICS_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.07, Stanford CS 223A',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // HOMOGENEOUS TRANSFORMATION MATRICES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Create rotation matrix about X axis
     * @param {number} theta - Angle in radians
     * @returns {Array} 4x4 homogeneous transformation matrix
     */
    rotX: function(theta) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [
            [1, 0,  0, 0],
            [0, c, -s, 0],
            [0, s,  c, 0],
            [0, 0,  0, 1]
        ];
    },
    
    /**
     * Create rotation matrix about Y axis
     */
    rotY: function(theta) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [
            [ c, 0, s, 0],
            [ 0, 1, 0, 0],
            [-s, 0, c, 0],
            [ 0, 0, 0, 1]
        ];
    },
    
    /**
     * Create rotation matrix about Z axis
     */
    rotZ: function(theta) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        return [
            [c, -s, 0, 0],
            [s,  c, 0, 0],
            [0,  0, 1, 0],
            [0,  0, 0, 1]
        ];
    },
    
    /**
     * Create translation matrix
     */
    translate: function(dx, dy, dz) {
        return [
            [1, 0, 0, dx],
            [0, 1, 0, dy],
            [0, 0, 1, dz],
            [0, 0, 0, 1]
        ];
    },
    
    /**
     * Multiply two 4x4 matrices
     */
    matMul4x4: function(A, B) {
        const result = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    },
    
    /**
     * Chain multiple transformations
     */
    chainTransforms: function(...transforms) {
        return transforms.reduce((acc, T) => this.matMul4x4(acc, T));
    },
    
    /**
     * Transform a point using 4x4 matrix
     */
    transformPoint: function(T, point) {
        const p = [point.x || point[0], point.y || point[1], point.z || point[2], 1];
        const result = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i] += T[i][j] * p[j];
            }
        }
        return { x: result[0], y: result[1], z: result[2] };
    },
    
    /**
     * Invert a homogeneous transformation matrix
     * For pure rotation + translation: inv(T) = [R^T, -R^T * t; 0, 1]
     */
    invertTransform: function(T) {
        // Extract rotation (3x3) and translation
        const R = [
            [T[0][0], T[0][1], T[0][2]],
            [T[1][0], T[1][1], T[1][2]],
            [T[2][0], T[2][1], T[2][2]]
        ];
        const t = [T[0][3], T[1][3], T[2][3]];
        
        // R^T (rotation part is orthogonal)
        const RT = [
            [R[0][0], R[1][0], R[2][0]],
            [R[0][1], R[1][1], R[2][1]],
            [R[0][2], R[1][2], R[2][2]]
        ];
        
        // -R^T * t
        const tNew = [
            -(RT[0][0]*t[0] + RT[0][1]*t[1] + RT[0][2]*t[2]),
            -(RT[1][0]*t[0] + RT[1][1]*t[1] + RT[1][2]*t[2]),
            -(RT[2][0]*t[0] + RT[2][1]*t[1] + RT[2][2]*t[2])
        ];
        
        return [
            [RT[0][0], RT[0][1], RT[0][2], tNew[0]],
            [RT[1][0], RT[1][1], RT[1][2], tNew[1]],
            [RT[2][0], RT[2][1], RT[2][2], tNew[2]],
            [0, 0, 0, 1]
        ];
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DENAVIT-HARTENBERG PARAMETERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Create DH transformation matrix
     * @param {Object} params - {theta, d, a, alpha} DH parameters
     * @returns {Array} 4x4 transformation matrix
     */
    dhTransform: function(params) {
        const { theta, d, a, alpha } = params;
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        const ca = Math.cos(alpha);
        const sa = Math.sin(alpha);
        
        return [
            [ct, -st*ca,  st*sa, a*ct],
            [st,  ct*ca, -ct*sa, a*st],
            [0,   sa,     ca,    d   ],
            [0,   0,      0,     1   ]
        ];
    },
    
    /**
     * Forward kinematics using DH parameters
     * @param {Array} dhTable - Array of {theta, d, a, alpha, type}
     * @param {Array} jointValues - Joint positions (radians for revolute, mm for prismatic)
     * @returns {Object} End effector pose
     */
    forwardKinematicsDH: function(dhTable, jointValues) {
        let T = [[1,0,0,0], [0,1,0,0], [0,0,1,0], [0,0,0,1]]; // Identity
        const transforms = [];
        
        for (let i = 0; i < dhTable.length; i++) {
            const dh = { ...dhTable[i] };
            
            // Apply joint value based on joint type
            if (dhTable[i].type === 'revolute') {
                dh.theta = (dh.theta || 0) + jointValues[i];
            } else if (dhTable[i].type === 'prismatic') {
                dh.d = (dh.d || 0) + jointValues[i];
            }
            
            const Ti = this.dhTransform(dh);
            T = this.matMul4x4(T, Ti);
            transforms.push({ joint: i, T: JSON.parse(JSON.stringify(T)) });
        }
        
        // Extract position and orientation
        const position = { x: T[0][3], y: T[1][3], z: T[2][3] };
        const rotation = [
            [T[0][0], T[0][1], T[0][2]],
            [T[1][0], T[1][1], T[1][2]],
            [T[2][0], T[2][1], T[2][2]]
        ];
        
        // Extract Euler angles (ZYX convention)
        const euler = this.rotationToEuler(rotation);
        
        return {
            position,
            rotation,
            euler,
            transform: T,
            intermediateTransforms: transforms
        };
    },
    
    /**
     * Extract Euler angles from rotation matrix (ZYX convention)
     */
    rotationToEuler: function(R) {
        let roll, pitch, yaw;
        
        // Check for gimbal lock
        if (Math.abs(R[2][0]) >= 1 - 1e-10) {
            yaw = 0;
            if (R[2][0] < 0) {
                pitch = Math.PI / 2;
                roll = Math.atan2(R[0][1], R[0][2]);
            } else {
                pitch = -Math.PI / 2;
                roll = Math.atan2(-R[0][1], -R[0][2]);
            }
        } else {
            pitch = Math.asin(-R[2][0]);
            roll = Math.atan2(R[2][1] / Math.cos(pitch), R[2][2] / Math.cos(pitch));
            yaw = Math.atan2(R[1][0] / Math.cos(pitch), R[0][0] / Math.cos(pitch));
        }
        
        return {
            roll: roll * 180 / Math.PI,
            pitch: pitch * 180 / Math.PI,
            yaw: yaw * 180 / Math.PI
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // JACOBIAN COMPUTATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute geometric Jacobian matrix
     * @param {Array} dhTable - DH parameters
     * @param {Array} jointValues - Current joint positions
     * @returns {Object} Jacobian matrix and related info
     */
    computeJacobian: function(dhTable, jointValues) {
        const n = dhTable.length;
        const J = [];
        
        // Compute all intermediate transforms
        const fk = this.forwardKinematicsDH(dhTable, jointValues);
        const transforms = fk.intermediateTransforms;
        const pn = [fk.position.x, fk.position.y, fk.position.z]; // End effector position
        
        // Build Jacobian column by column
        for (let i = 0; i < n; i++) {
            // Get z-axis of frame i-1 (before joint i)
            let zi, oi;
            if (i === 0) {
                zi = [0, 0, 1]; // Base frame z-axis
                oi = [0, 0, 0]; // Base frame origin
            } else {
                const Ti = transforms[i - 1].T;
                zi = [Ti[0][2], Ti[1][2], Ti[2][2]];
                oi = [Ti[0][3], Ti[1][3], Ti[2][3]];
            }
            
            if (dhTable[i].type === 'revolute') {
                // For revolute: Jv = z × (p - o), Jw = z
                const pMinusO = [pn[0] - oi[0], pn[1] - oi[1], pn[2] - oi[2]];
                const Jv = this.cross3(zi, pMinusO);
                J.push([Jv[0], Jv[1], Jv[2], zi[0], zi[1], zi[2]]);
            } else {
                // For prismatic: Jv = z, Jw = 0
                J.push([zi[0], zi[1], zi[2], 0, 0, 0]);
            }
        }
        
        // Transpose to get 6×n matrix
        const Jt = this.transpose(J);
        
        // Compute condition number for singularity detection
        const conditionNumber = this.estimateConditionNumber(Jt);
        
        return {
            jacobian: Jt,
            linearPart: Jt.slice(0, 3),
            angularPart: Jt.slice(3, 6),
            conditionNumber,
            nearSingularity: conditionNumber > 100
        };
    },
    
    /**
     * Cross product of two 3D vectors
     */
    cross3: function(a, b) {
        return [
            a[1]*b[2] - a[2]*b[1],
            a[2]*b[0] - a[0]*b[2],
            a[0]*b[1] - a[1]*b[0]
        ];
    },
    
    /**
     * Transpose matrix
     */
    transpose: function(A) {
        if (!A || !A.length) return [];
        return A[0].map((_, j) => A.map(row => row[j]));
    },
    
    /**
     * Estimate condition number (ratio of max to min singular value approximation)
     */
    estimateConditionNumber: function(J) {
        // Compute J * J^T
        const JJt = this.matMul(J, this.transpose(J));
        
        // Power iteration for max eigenvalue
        let v = Array(JJt.length).fill(1);
        for (let iter = 0; iter < 20; iter++) {
            const Av = JJt.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
            const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
            v = Av.map(x => x / norm);
        }
        const maxEig = v.reduce((s, vi, i) => 
            s + vi * JJt[i].reduce((ss, a, j) => ss + a * v[j], 0), 0);
        
        // Inverse power iteration for min eigenvalue
        const JJtInv = this.pseudoInverse(JJt);
        if (!JJtInv) return Infinity;
        
        let w = Array(JJtInv.length).fill(1);
        for (let iter = 0; iter < 20; iter++) {
            const Aw = JJtInv.map(row => row.reduce((s, a, j) => s + a * w[j], 0));
            const norm = Math.sqrt(Aw.reduce((s, x) => s + x * x, 0));
            if (norm < 1e-10) return Infinity;
            w = Aw.map(x => x / norm);
        }
        const minEigInv = w.reduce((s, wi, i) => 
            s + wi * JJtInv[i].reduce((ss, a, j) => ss + a * w[j], 0), 0);
        const minEig = 1 / minEigInv;
        
        return Math.sqrt(maxEig / Math.max(minEig, 1e-10));
    },
    
    /**
     * Matrix multiplication
     */
    matMul: function(A, B) {
        const m = A.length, n = B[0].length, p = B.length;
        const C = Array(m).fill(null).map(() => Array(n).fill(0));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < p; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    },
    
    /**
     * Pseudo-inverse using SVD approximation (simplified)
     */
    pseudoInverse: function(A) {
        const n = A.length;
        const At = this.transpose(A);
        const AtA = this.matMul(At, A);
        
        // Add regularization for numerical stability
        for (let i = 0; i < n; i++) {
            AtA[i][i] += 1e-10;
        }
        
        // Gauss-Jordan elimination
        const aug = AtA.map((row, i) => [...row, ...At[i]]);
        
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) return null;
            
            const pivot = aug[i][i];
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
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 5-AXIS CNC SPECIFIC KINEMATICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * 5-Axis inverse kinematics with multiple solutions
     * @param {Object} toolPose - {position: {x,y,z}, axis: {i,j,k}}
     * @param {Object} config - Machine configuration
     * @returns {Array} Array of possible solutions
     */
    fiveAxisIK: function(toolPose, config = {}) {
        const { position, axis } = toolPose;
        const machineType = config.type || 'table-table'; // table-table, head-head, mixed
        
        // Normalize tool axis
        const len = Math.sqrt(axis.i**2 + axis.j**2 + axis.k**2);
        const n = { i: axis.i/len, j: axis.j/len, k: axis.k/len };
        
        const solutions = [];
        
        if (machineType === 'table-table') {
            // A-C table configuration (most common)
            // A rotates about X, C rotates about Z
            
            // Solution 1: Primary
            let A = Math.acos(-n.k) * 180 / Math.PI;
            let C = Math.atan2(n.j, n.i) * 180 / Math.PI;
            
            // Handle singularity at A = 0
            if (Math.abs(A) < 0.01) {
                C = config.previousC || 0;
            }
            
            solutions.push(this._computeXYZ(position, A, C, config, 1));
            
            // Solution 2: Alternative (A negative, C + 180)
            if (A > 0.01 && A < 179.99) {
                const A2 = -A;
                const C2 = C + 180;
                solutions.push(this._computeXYZ(position, A2, C2, config, 2));
            }
        } else if (machineType === 'head-head') {
            // A-C head configuration
            // Both rotary axes in spindle head
            
            let A = Math.acos(-n.k) * 180 / Math.PI;
            let C = Math.atan2(n.j, n.i) * 180 / Math.PI;
            
            solutions.push({
                X: position.x, Y: position.y, Z: position.z,
                A, C, valid: true, solution: 1
            });
        } else {
            // Mixed configuration (Table A, Head C or similar)
            let A = Math.acos(-n.k) * 180 / Math.PI;
            let C = Math.atan2(n.j, n.i) * 180 / Math.PI;
            
            solutions.push(this._computeXYZ(position, A, C, config, 1));
        }
        
        // Validate against limits
        return solutions.map(sol => ({
            ...sol,
            valid: this._checkLimits(sol, config.limits)
        }));
    },
    
    _computeXYZ: function(position, A, C, config, solutionNum) {
        const Arad = A * Math.PI / 180;
        const Crad = C * Math.PI / 180;
        
        // Pivot point compensation
        const pivot = config.pivotOffset || { x: 0, y: 0, z: 0 };
        
        // For table-table: compensate for table rotation
        const dx = pivot.x * (1 - Math.cos(Arad) * Math.cos(Crad));
        const dy = pivot.y * (1 - Math.cos(Arad) * Math.sin(Crad));
        const dz = pivot.z * (1 - Math.cos(Arad));
        
        return {
            X: position.x - dx,
            Y: position.y - dy,
            Z: position.z - dz,
            A, C,
            valid: true,
            solution: solutionNum
        };
    },
    
    _checkLimits: function(joints, limits) {
        if (!limits) return true;
        const axes = ['X', 'Y', 'Z', 'A', 'C'];
        for (const axis of axes) {
            if (limits[axis] && joints[axis] !== undefined) {
                const [min, max] = limits[axis];
                if (joints[axis] < min || joints[axis] > max) return false;
            }
        }
        return true;
    },
    
    /**
     * Singularity detection for 5-axis machines
     */
    detectSingularity: function(joints, config = {}) {
        const threshold = config.singularityThreshold || 1.0; // degrees
        const A = Math.abs(joints.A);
        
        const isSingular = A < threshold || Math.abs(A - 180) < threshold;
        
        return {
            isSingular,
            type: isSingular ? 'gimbal_lock' : 'none',
            aAngle: joints.A,
            recommendation: isSingular ? 
                'Modify toolpath to avoid vertical tool orientation' : 
                'No singularity issues'
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VELOCITY KINEMATICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute TCP velocity from joint velocities
     * @param {Array} jacobian - 6×n Jacobian matrix
     * @param {Array} jointVelocities - n×1 joint velocity vector
     * @returns {Object} TCP linear and angular velocities
     */
    tcpVelocity: function(jacobian, jointVelocities) {
        const v = jacobian.map(row => 
            row.reduce((sum, j, i) => sum + j * jointVelocities[i], 0)
        );
        
        return {
            linear: { vx: v[0], vy: v[1], vz: v[2] },
            angular: { wx: v[3], wy: v[4], wz: v[5] },
            magnitude: {
                linear: Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2),
                angular: Math.sqrt(v[3]**2 + v[4]**2 + v[5]**2)
            }
        };
    },
    
    /**
     * Compute required joint velocities for desired TCP velocity
     * @param {Array} jacobian - Jacobian matrix
     * @param {Object} tcpVel - Desired TCP velocity
     * @returns {Array} Joint velocities
     */
    inverseVelocity: function(jacobian, tcpVel) {
        const v = [
            tcpVel.linear?.vx || 0, tcpVel.linear?.vy || 0, tcpVel.linear?.vz || 0,
            tcpVel.angular?.wx || 0, tcpVel.angular?.wy || 0, tcpVel.angular?.wz || 0
        ];
        
        // Damped least squares (DLS) for numerical stability
        const lambda = 0.01; // Damping factor
        const Jt = this.transpose(jacobian);
        const JJt = this.matMul(jacobian, Jt);
        
        // Add damping: (J*J^T + λ²I)
        for (let i = 0; i < JJt.length; i++) {
            JJt[i][i] += lambda * lambda;
        }
        
        // Solve: q_dot = J^T * (J*J^T + λ²I)^-1 * v
        const JJtInv = this.pseudoInverse(JJt);
        if (!JJtInv) return null;
        
        const temp = this.matMul(JJtInv, v.map(x => [x])).map(r => r[0]);
        const qDot = this.matMul(Jt, temp.map(x => [x])).map(r => r[0]);
        
        return qDot;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('kinematics.transform.rotX', 'PRISM_ADVANCED_KINEMATICS_ENGINE.rotX');
            PRISM_GATEWAY.register('kinematics.transform.rotY', 'PRISM_ADVANCED_KINEMATICS_ENGINE.rotY');
            PRISM_GATEWAY.register('kinematics.transform.rotZ', 'PRISM_ADVANCED_KINEMATICS_ENGINE.rotZ');
            PRISM_GATEWAY.register('kinematics.transform.translate', 'PRISM_ADVANCED_KINEMATICS_ENGINE.translate');
            PRISM_GATEWAY.register('kinematics.transform.chain', 'PRISM_ADVANCED_KINEMATICS_ENGINE.chainTransforms');
            PRISM_GATEWAY.register('kinematics.transform.invert', 'PRISM_ADVANCED_KINEMATICS_ENGINE.invertTransform');
            PRISM_GATEWAY.register('kinematics.dh.transform', 'PRISM_ADVANCED_KINEMATICS_ENGINE.dhTransform');
            PRISM_GATEWAY.register('kinematics.fk.dh', 'PRISM_ADVANCED_KINEMATICS_ENGINE.forwardKinematicsDH');
            PRISM_GATEWAY.register('kinematics.jacobian.compute', 'PRISM_ADVANCED_KINEMATICS_ENGINE.computeJacobian');
            PRISM_GATEWAY.register('kinematics.5axis.ik', 'PRISM_ADVANCED_KINEMATICS_ENGINE.fiveAxisIK');
            PRISM_GATEWAY.register('kinematics.5axis.singularity', 'PRISM_ADVANCED_KINEMATICS_ENGINE.detectSingularity');
            PRISM_GATEWAY.register('kinematics.velocity.tcp', 'PRISM_ADVANCED_KINEMATICS_ENGINE.tcpVelocity');
            PRISM_GATEWAY.register('kinematics.velocity.inverse', 'PRISM_ADVANCED_KINEMATICS_ENGINE.inverseVelocity');
            console.log('[PRISM] PRISM_ADVANCED_KINEMATICS_ENGINE registered: 13 routes');
        }
    }
};


/**
 * PRISM_RIGID_BODY_DYNAMICS_ENGINE
 * Newton-Euler and Lagrangian dynamics for machine simulation
 * Source: MIT 16.07 Lectures 25-30, Stanford CS 223A Handout 7
 */
const PRISM_RIGID_BODY_DYNAMICS_ENGINE = {
    name: 'PRISM_RIGID_BODY_DYNAMICS_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.07, Stanford CS 223A',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INERTIA TENSOR COMPUTATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute inertia tensor for common shapes
     * @param {string} shape - Shape type
     * @param {Object} params - Shape parameters including mass
     * @returns {Array} 3×3 inertia tensor
     */
    inertiaTensor: function(shape, params) {
        const { mass: m } = params;
        let I;
        
        switch (shape.toLowerCase()) {
            case 'solid_cylinder':
            case 'spindle': {
                // Cylinder aligned with Z-axis
                const { radius: r, length: h } = params;
                const Ixx = (1/12) * m * (3 * r * r + h * h);
                const Iyy = Ixx;
                const Izz = (1/2) * m * r * r;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'hollow_cylinder':
            case 'tube': {
                const { innerRadius: ri, outerRadius: ro, length: h } = params;
                const r2Sum = ri * ri + ro * ro;
                const Ixx = (1/12) * m * (3 * r2Sum + h * h);
                const Iyy = Ixx;
                const Izz = (1/2) * m * r2Sum;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'rectangular_block':
            case 'table': {
                const { a, b, c } = params; // dimensions in x, y, z
                const Ixx = (1/12) * m * (b * b + c * c);
                const Iyy = (1/12) * m * (a * a + c * c);
                const Izz = (1/12) * m * (a * a + b * b);
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'solid_sphere':
            case 'ball': {
                const { radius: r } = params;
                const Iall = (2/5) * m * r * r;
                I = [[Iall, 0, 0], [0, Iall, 0], [0, 0, Iall]];
                break;
            }
            
            case 'thin_rod': {
                // Rod along X-axis
                const { length: L } = params;
                const Ixx = 0; // About own axis
                const Iyy = (1/12) * m * L * L;
                const Izz = Iyy;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            case 'thin_disk': {
                // Disk in XY plane
                const { radius: r } = params;
                const Ixx = (1/4) * m * r * r;
                const Iyy = Ixx;
                const Izz = (1/2) * m * r * r;
                I = [[Ixx, 0, 0], [0, Iyy, 0], [0, 0, Izz]];
                break;
            }
            
            default:
                throw new Error(`Unknown shape: ${shape}`);
        }
        
        return {
            tensor: I,
            mass: m,
            shape,
            principalMoments: [I[0][0], I[1][1], I[2][2]]
        };
    },
    
    /**
     * Parallel axis theorem for shifted inertia
     * I_new = I_cm + m * (d² * Identity - d ⊗ d)
     * @param {Array} I_cm - Inertia tensor about center of mass
     * @param {number} mass - Total mass
     * @param {Array} offset - [dx, dy, dz] offset vector
     * @returns {Array} New inertia tensor
     */
    parallelAxisTheorem: function(I_cm, mass, offset) {
        const [dx, dy, dz] = offset;
        const d2 = dx*dx + dy*dy + dz*dz;
        
        return [
            [I_cm[0][0] + mass*(d2 - dx*dx), I_cm[0][1] - mass*dx*dy, I_cm[0][2] - mass*dx*dz],
            [I_cm[1][0] - mass*dy*dx, I_cm[1][1] + mass*(d2 - dy*dy), I_cm[1][2] - mass*dy*dz],
            [I_cm[2][0] - mass*dz*dx, I_cm[2][1] - mass*dz*dy, I_cm[2][2] + mass*(d2 - dz*dz)]
        ];
    },
    
    /**
     * Rotate inertia tensor: I_new = R * I * R^T
     * @param {Array} I - Original inertia tensor
     * @param {Array} R - 3×3 rotation matrix
     * @returns {Array} Rotated inertia tensor
     */
    rotateInertiaTensor: function(I, R) {
        const Rt = [
            [R[0][0], R[1][0], R[2][0]],
            [R[0][1], R[1][1], R[2][1]],
            [R[0][2], R[1][2], R[2][2]]
        ];
        
        // temp = R * I
        const temp = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    temp[i][j] += R[i][k] * I[k][j];
                }
            }
        }
        
        // result = temp * R^T
        const result = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    result[i][j] += temp[i][k] * Rt[k][j];
                }
            }
        }
        
        return result;
    },
    
    /**
     * Combine inertias of multiple rigid bodies
     * @param {Array} bodies - Array of {mass, inertia, position, orientation}
     * @returns {Object} Combined inertia properties
     */
    combineInertias: function(bodies) {
        let totalMass = 0;
        const com = [0, 0, 0]; // Center of mass
        
        // Calculate combined center of mass
        for (const body of bodies) {
            totalMass += body.mass;
            com[0] += body.mass * body.position[0];
            com[1] += body.mass * body.position[1];
            com[2] += body.mass * body.position[2];
        }
        com[0] /= totalMass;
        com[1] /= totalMass;
        com[2] /= totalMass;
        
        // Calculate combined inertia about COM
        let I_total = [[0,0,0], [0,0,0], [0,0,0]];
        
        for (const body of bodies) {
            // Offset from combined COM
            const offset = [
                body.position[0] - com[0],
                body.position[1] - com[1],
                body.position[2] - com[2]
            ];
            
            // Rotate body's inertia if orientation provided
            let I_body = body.inertia;
            if (body.orientation) {
                I_body = this.rotateInertiaTensor(body.inertia, body.orientation);
            }
            
            // Apply parallel axis theorem
            const I_shifted = this.parallelAxisTheorem(I_body, body.mass, offset);
            
            // Add to total
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    I_total[i][j] += I_shifted[i][j];
                }
            }
        }
        
        return {
            mass: totalMass,
            centerOfMass: { x: com[0], y: com[1], z: com[2] },
            inertiaTensor: I_total,
            principalMoments: [I_total[0][0], I_total[1][1], I_total[2][2]]
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // NEWTON-EULER DYNAMICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Newton-Euler equations of motion
     * F = m * a_cm
     * M = I * α + ω × (I * ω)
     * 
     * @param {Object} state - {position, velocity, orientation, angularVelocity}
     * @param {Object} body - {mass, inertiaTensor}
     * @param {Object} forces - {force: [Fx,Fy,Fz], torque: [Mx,My,Mz]}
     * @returns {Object} Accelerations
     */
    newtonEuler: function(state, body, forces) {
        const { mass, inertiaTensor: I } = body;
        const omega = state.angularVelocity || [0, 0, 0];
        const F = forces.force || [0, 0, 0];
        const M = forces.torque || [0, 0, 0];
        
        // Linear acceleration: a = F/m
        const linearAccel = F.map(f => f / mass);
        
        // I * ω
        const Iomega = [
            I[0][0]*omega[0] + I[0][1]*omega[1] + I[0][2]*omega[2],
            I[1][0]*omega[0] + I[1][1]*omega[1] + I[1][2]*omega[2],
            I[2][0]*omega[0] + I[2][1]*omega[1] + I[2][2]*omega[2]
        ];
        
        // ω × (I * ω) - gyroscopic term
        const gyroscopic = [
            omega[1]*Iomega[2] - omega[2]*Iomega[1],
            omega[2]*Iomega[0] - omega[0]*Iomega[2],
            omega[0]*Iomega[1] - omega[1]*Iomega[0]
        ];
        
        // M - ω × (I * ω)
        const torqueNet = [
            M[0] - gyroscopic[0],
            M[1] - gyroscopic[1],
            M[2] - gyroscopic[2]
        ];
        
        // Solve I * α = torqueNet for angular acceleration
        const Iinv = this._invert3x3(I);
        const angularAccel = [
            Iinv[0][0]*torqueNet[0] + Iinv[0][1]*torqueNet[1] + Iinv[0][2]*torqueNet[2],
            Iinv[1][0]*torqueNet[0] + Iinv[1][1]*torqueNet[1] + Iinv[1][2]*torqueNet[2],
            Iinv[2][0]*torqueNet[0] + Iinv[2][1]*torqueNet[1] + Iinv[2][2]*torqueNet[2]
        ];
        
        return {
            linearAcceleration: { x: linearAccel[0], y: linearAccel[1], z: linearAccel[2] },
            angularAcceleration: { x: angularAccel[0], y: angularAccel[1], z: angularAccel[2] },
            gyroscopicTorque: gyroscopic
        };
    },
    
    /**
     * Euler's equations of rotational motion (body frame)
     * For symmetric bodies (spindles), includes gyroscopic effects
     */
    eulerEquations: function(omega, torque, I) {
        // Euler's equations: I * ω_dot + ω × (I * ω) = τ
        // For principal axes: 
        //   I₁ω̇₁ + (I₃ - I₂)ω₂ω₃ = τ₁
        //   I₂ω̇₂ + (I₁ - I₃)ω₃ω₁ = τ₂
        //   I₃ω̇₃ + (I₂ - I₁)ω₁ω₂ = τ₃
        
        const I1 = I[0][0], I2 = I[1][1], I3 = I[2][2];
        const [w1, w2, w3] = omega;
        const [t1, t2, t3] = torque;
        
        const omega_dot = [
            (t1 - (I3 - I2) * w2 * w3) / I1,
            (t2 - (I1 - I3) * w3 * w1) / I2,
            (t3 - (I2 - I1) * w1 * w2) / I3
        ];
        
        return {
            angularAcceleration: omega_dot,
            gyroscopicCoupling: [
                (I3 - I2) * w2 * w3,
                (I1 - I3) * w3 * w1,
                (I2 - I1) * w1 * w2
            ]
        };
    },
    
    /**
     * Simulate spindle dynamics with unbalance
     * @param {Object} spindle - Spindle properties
     * @param {number} rpm - Rotational speed
     * @param {Object} unbalance - {mass, radius, angle}
     * @returns {Object} Dynamic response
     */
    spindleUnbalance: function(spindle, rpm, unbalance) {
        const omega = rpm * 2 * Math.PI / 60; // rad/s
        const { mass: m_u, radius: r, angle } = unbalance;
        
        // Centrifugal force from unbalance
        const F_centrifugal = m_u * r * omega * omega;
        
        // Force components (rotating with spindle)
        const theta = angle * Math.PI / 180;
        const Fx = F_centrifugal * Math.cos(theta);
        const Fy = F_centrifugal * Math.sin(theta);
        
        // Vibration amplitude (assuming simple spring model)
        const k = spindle.stiffness || 1e8; // N/m
        const amplitude = F_centrifugal / k;
        
        // Frequency of vibration equals rpm
        const vibrationFreq = rpm / 60;
        
        return {
            centrifugalForce: F_centrifugal,
            forceComponents: { Fx, Fy },
            vibrationAmplitude: amplitude * 1000, // mm
            vibrationFrequency: vibrationFreq, // Hz
            severity: this._classifyVibration(amplitude, rpm)
        };
    },
    
    _classifyVibration: function(amplitude, rpm) {
        // ISO 10816 vibration severity standards (simplified)
        const velocity = amplitude * rpm * Math.PI / 30; // mm/s RMS approx
        
        if (velocity < 1.8) return 'A - Good';
        if (velocity < 4.5) return 'B - Acceptable';
        if (velocity < 11.2) return 'C - Unsatisfactory';
        return 'D - Unacceptable';
    },
    
    _invert3x3: function(A) {
        const det = A[0][0]*(A[1][1]*A[2][2] - A[1][2]*A[2][1])
                  - A[0][1]*(A[1][0]*A[2][2] - A[1][2]*A[2][0])
                  + A[0][2]*(A[1][0]*A[2][1] - A[1][1]*A[2][0]);
        
        if (Math.abs(det) < 1e-15) {
            throw new Error('Matrix is singular');
        }
        
        const invDet = 1 / det;
        
        return [
            [
                (A[1][1]*A[2][2] - A[1][2]*A[2][1]) * invDet,
                (A[0][2]*A[2][1] - A[0][1]*A[2][2]) * invDet,
                (A[0][1]*A[1][2] - A[0][2]*A[1][1]) * invDet
            ],
            [
                (A[1][2]*A[2][0] - A[1][0]*A[2][2]) * invDet,
                (A[0][0]*A[2][2] - A[0][2]*A[2][0]) * invDet,
                (A[0][2]*A[1][0] - A[0][0]*A[1][2]) * invDet
            ],
            [
                (A[1][0]*A[2][1] - A[1][1]*A[2][0]) * invDet,
                (A[0][1]*A[2][0] - A[0][0]*A[2][1]) * invDet,
                (A[0][0]*A[1][1] - A[0][1]*A[1][0]) * invDet
            ]
        ];
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LAGRANGIAN MECHANICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute kinetic energy
     * T = (1/2) * m * v² + (1/2) * ω^T * I * ω
     */
    kineticEnergy: function(state, body) {
        const { mass, inertiaTensor: I } = body;
        const v = state.velocity || [0, 0, 0];
        const omega = state.angularVelocity || [0, 0, 0];
        
        // Translational KE
        const T_trans = 0.5 * mass * (v[0]**2 + v[1]**2 + v[2]**2);
        
        // Rotational KE: (1/2) * ω^T * I * ω
        const Iomega = [
            I[0][0]*omega[0] + I[0][1]*omega[1] + I[0][2]*omega[2],
            I[1][0]*omega[0] + I[1][1]*omega[1] + I[1][2]*omega[2],
            I[2][0]*omega[0] + I[2][1]*omega[1] + I[2][2]*omega[2]
        ];
        const T_rot = 0.5 * (omega[0]*Iomega[0] + omega[1]*Iomega[1] + omega[2]*Iomega[2]);
        
        return {
            total: T_trans + T_rot,
            translational: T_trans,
            rotational: T_rot
        };
    },
    
    /**
     * Compute potential energy
     * V = m * g * h + (1/2) * k * x²
     */
    potentialEnergy: function(state, body, environment = {}) {
        const { mass } = body;
        const g = environment.gravity || 9.81;
        const h = state.position?.[2] || state.position?.z || 0;
        
        // Gravitational PE
        const V_gravity = mass * g * h;
        
        // Spring PE (if spring connected)
        let V_spring = 0;
        if (environment.spring) {
            const { stiffness: k, equilibrium } = environment.spring;
            const pos = state.position || [0, 0, 0];
            const dx = (Array.isArray(pos) ? pos[0] : pos.x) - equilibrium[0];
            const dy = (Array.isArray(pos) ? pos[1] : pos.y) - equilibrium[1];
            const dz = (Array.isArray(pos) ? pos[2] : pos.z) - equilibrium[2];
            V_spring = 0.5 * k * (dx*dx + dy*dy + dz*dz);
        }
        
        return {
            total: V_gravity + V_spring,
            gravitational: V_gravity,
            elastic: V_spring
        };
    },
    
    /**
     * Compute Lagrangian L = T - V
     */
    lagrangian: function(state, body, environment = {}) {
        const T = this.kineticEnergy(state, body);
        const V = this.potentialEnergy(state, body, environment);
        
        return {
            lagrangian: T.total - V.total,
            kineticEnergy: T,
            potentialEnergy: V,
            totalEnergy: T.total + V.total
        };
    },
    
    /**
     * Numerical solution of Lagrange's equations
     * d/dt(∂L/∂q̇) - ∂L/∂q = Q (generalized forces)
     */
    solveLagrangianODE: function(L_func, q0, qDot0, Q_func, dt, numSteps) {
        const n = q0.length;
        let q = [...q0];
        let qDot = [...qDot0];
        const history = [{ t: 0, q: [...q], qDot: [...qDot] }];
        
        const h = 1e-6; // Numerical differentiation step
        
        for (let step = 0; step < numSteps; step++) {
            const t = step * dt;
            const Q = Q_func(q, qDot, t);
            
            // Compute ∂L/∂q and ∂L/∂q̇ numerically
            const dLdq = Array(n).fill(0);
            const dLdqDot = Array(n).fill(0);
            const d2LdqDotdq = Array(n).fill(null).map(() => Array(n).fill(0));
            const d2LdqDot2 = Array(n).fill(null).map(() => Array(n).fill(0));
            
            for (let i = 0; i < n; i++) {
                // ∂L/∂q_i
                const qPlus = [...q]; qPlus[i] += h;
                const qMinus = [...q]; qMinus[i] -= h;
                dLdq[i] = (L_func(qPlus, qDot) - L_func(qMinus, qDot)) / (2 * h);
                
                // ∂L/∂q̇_i
                const qDotPlus = [...qDot]; qDotPlus[i] += h;
                const qDotMinus = [...qDot]; qDotMinus[i] -= h;
                dLdqDot[i] = (L_func(q, qDotPlus) - L_func(q, qDotMinus)) / (2 * h);
                
                // ∂²L/∂q̇∂q (Hessian components)
                for (let j = 0; j < n; j++) {
                    const qjPlus = [...q]; qjPlus[j] += h;
                    const qjMinus = [...q]; qjMinus[j] -= h;
                    const dLdqDot_qPlus = (L_func(qjPlus, qDotPlus) - L_func(qjPlus, qDotMinus)) / (2 * h);
                    const dLdqDot_qMinus = (L_func(qjMinus, qDotPlus) - L_func(qjMinus, qDotMinus)) / (2 * h);
                    d2LdqDotdq[i][j] = (dLdqDot_qPlus - dLdqDot_qMinus) / (2 * h);
                }
                
                // ∂²L/∂q̇²
                for (let j = 0; j < n; j++) {
                    const qDotjPlus = [...qDot]; qDotjPlus[j] += h;
                    const qDotjMinus = [...qDot]; qDotjMinus[j] -= h;
                    const dLdqDoti_jPlus = (L_func(q, qDotjPlus.map((v, k) => k === i ? v + h : v)) - 
                                            L_func(q, qDotjPlus.map((v, k) => k === i ? v - h : v))) / (2 * h);
                    const dLdqDoti_jMinus = (L_func(q, qDotjMinus.map((v, k) => k === i ? v + h : v)) - 
                                             L_func(q, qDotjMinus.map((v, k) => k === i ? v - h : v))) / (2 * h);
                    d2LdqDot2[i][j] = (dLdqDoti_jPlus - dLdqDoti_jMinus) / (2 * h);
                }
            }
            
            // Solve for q̈: M(q) * q̈ = Q + ∂L/∂q - ∂²L/∂q̇∂q * q̇
            // where M = ∂²L/∂q̇² (mass matrix)
            const rhs = Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                rhs[i] = Q[i] + dLdq[i];
                for (let j = 0; j < n; j++) {
                    rhs[i] -= d2LdqDotdq[i][j] * qDot[j];
                }
            }
            
            // Solve M * q̈ = rhs
            const M = d2LdqDot2;
            const qDotDot = this._solveLinearSystem(M, rhs);
            
            // Integrate using RK4
            const k1_q = qDot;
            const k1_v = qDotDot;
            
            const q_mid = q.map((qi, i) => qi + 0.5 * dt * k1_q[i]);
            const v_mid = qDot.map((vi, i) => vi + 0.5 * dt * k1_v[i]);
            
            // Update state
            for (let i = 0; i < n; i++) {
                q[i] += dt * qDot[i] + 0.5 * dt * dt * qDotDot[i];
                qDot[i] += dt * qDotDot[i];
            }
            
            history.push({ t: t + dt, q: [...q], qDot: [...qDot], qDotDot: [...qDotDot] });
        }
        
        return history;
    },
    
    _solveLinearSystem: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        // Gaussian elimination with partial pivoting
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) {
                aug[i][i] = 1e-12; // Regularization
            }
            
            for (let k = i + 1; k < n; k++) {
                const factor = aug[k][i] / aug[i][i];
                for (let j = i; j <= n; j++) {
                    aug[k][j] -= factor * aug[i][j];
                }
            }
        }
        
        // Back substitution
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= aug[i][j] * x[j];
            }
            x[i] /= aug[i][i];
        }
        
        return x;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('dynamics.inertia.tensor', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.inertiaTensor');
            PRISM_GATEWAY.register('dynamics.inertia.parallelAxis', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.parallelAxisTheorem');
            PRISM_GATEWAY.register('dynamics.inertia.rotate', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.rotateInertiaTensor');
            PRISM_GATEWAY.register('dynamics.inertia.combine', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.combineInertias');
            PRISM_GATEWAY.register('dynamics.newtonEuler', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.newtonEuler');
            PRISM_GATEWAY.register('dynamics.euler.equations', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.eulerEquations');
            PRISM_GATEWAY.register('dynamics.spindle.unbalance', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.spindleUnbalance');
            PRISM_GATEWAY.register('dynamics.energy.kinetic', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.kineticEnergy');
            PRISM_GATEWAY.register('dynamics.energy.potential', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.potentialEnergy');
            PRISM_GATEWAY.register('dynamics.lagrangian', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.lagrangian');
            PRISM_GATEWAY.register('dynamics.lagrangian.solve', 'PRISM_RIGID_BODY_DYNAMICS_ENGINE.solveLagrangianODE');
            console.log('[PRISM] PRISM_RIGID_BODY_DYNAMICS_ENGINE registered: 11 routes');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTRATION AND EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession4Part1() {
    PRISM_ADVANCED_KINEMATICS_ENGINE.register();
    PRISM_RIGID_BODY_DYNAMICS_ENGINE.register();
    
    console.log('[Session 4 Part 1] Registered 2 modules, 24 gateway routes');
    console.log('  - PRISM_ADVANCED_KINEMATICS_ENGINE: DH, Jacobian, 5-axis IK, velocity kinematics');
    console.log('  - PRISM_RIGID_BODY_DYNAMICS_ENGINE: Inertia tensor, Newton-Euler, Lagrangian');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    registerSession4Part1();
}

console.log('[Session 4 Part 1] Advanced Kinematics & Rigid Body Dynamics loaded - 2 modules');
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PRISM SESSION 4 PART 2: VIBRATION ANALYSIS & CHATTER PREDICTION
// Source: MIT 16.07 (Dynamics Lectures 19-22), MIT 2.14 (Control), Altintas (Machining Vibrations)
// Algorithms: Modal Analysis, FRF, Stability Lobes, Chatter Detection, Critical Speed
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * PRISM_VIBRATION_ANALYSIS_ENGINE
 * Complete vibration analysis for machine tool dynamics
 * Source: MIT 16.07, Altintas "Manufacturing Automation"
 */
const PRISM_VIBRATION_ANALYSIS_ENGINE = {
    name: 'PRISM_VIBRATION_ANALYSIS_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.07, Altintas Manufacturing Automation',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE DOF VIBRATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Calculate natural frequency and related parameters for SDOF system
     * @param {Object} params - {mass, stiffness, damping}
     * @returns {Object} System characteristics
     */
    sdofNaturalFrequency: function(params) {
        const { mass: m, stiffness: k, damping: c = 0 } = params;
        
        // Undamped natural frequency
        const omega_n = Math.sqrt(k / m);
        const f_n = omega_n / (2 * Math.PI);
        
        // Damping ratio
        const c_critical = 2 * Math.sqrt(k * m);
        const zeta = c / c_critical;
        
        // Damped natural frequency
        const omega_d = omega_n * Math.sqrt(Math.max(0, 1 - zeta * zeta));
        const f_d = omega_d / (2 * Math.PI);
        
        // Logarithmic decrement
        const delta = zeta < 1 ? 2 * Math.PI * zeta / Math.sqrt(1 - zeta * zeta) : null;
        
        // Quality factor
        const Q = zeta > 0 ? 1 / (2 * zeta) : Infinity;
        
        // Period
        const T_n = 1 / f_n;
        const T_d = zeta < 1 ? 1 / f_d : null;
        
        return {
            undampedNaturalFreq_rad: omega_n,
            undampedNaturalFreq_Hz: f_n,
            dampedNaturalFreq_rad: omega_d,
            dampedNaturalFreq_Hz: f_d,
            dampingRatio: zeta,
            criticalDamping: c_critical,
            logarithmicDecrement: delta,
            qualityFactor: Q,
            period_undamped: T_n,
            period_damped: T_d,
            systemType: zeta < 1 ? 'underdamped' : zeta === 1 ? 'critically_damped' : 'overdamped'
        };
    },
    
    /**
     * Free vibration response of SDOF system
     * @param {Object} params - System parameters
     * @param {Object} initial - {x0, v0} initial conditions
     * @param {number} t - Time
     * @returns {Object} Position and velocity
     */
    sdofFreeResponse: function(params, initial, t) {
        const { mass: m, stiffness: k, damping: c = 0 } = params;
        const { x0 = 0, v0 = 0 } = initial;
        
        const omega_n = Math.sqrt(k / m);
        const zeta = c / (2 * Math.sqrt(k * m));
        
        let x, v;
        
        if (zeta < 1) {
            // Underdamped
            const omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
            const A = x0;
            const B = (v0 + zeta * omega_n * x0) / omega_d;
            
            const envelope = Math.exp(-zeta * omega_n * t);
            x = envelope * (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t));
            v = envelope * (
                -zeta * omega_n * (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t)) +
                omega_d * (-A * Math.sin(omega_d * t) + B * Math.cos(omega_d * t))
            );
        } else if (zeta === 1) {
            // Critically damped
            const A = x0;
            const B = v0 + omega_n * x0;
            x = (A + B * t) * Math.exp(-omega_n * t);
            v = (B - omega_n * (A + B * t)) * Math.exp(-omega_n * t);
        } else {
            // Overdamped
            const s1 = -omega_n * (zeta - Math.sqrt(zeta * zeta - 1));
            const s2 = -omega_n * (zeta + Math.sqrt(zeta * zeta - 1));
            const A = (v0 - s2 * x0) / (s1 - s2);
            const B = (s1 * x0 - v0) / (s1 - s2);
            x = A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
            v = A * s1 * Math.exp(s1 * t) + B * s2 * Math.exp(s2 * t);
        }
        
        return { position: x, velocity: v };
    },
    
    /**
     * Forced vibration response (harmonic excitation)
     * @param {Object} system - {mass, stiffness, damping}
     * @param {Object} excitation - {amplitude, frequency}
     * @returns {Object} Steady-state response
     */
    sdofForcedResponse: function(system, excitation) {
        const { mass: m, stiffness: k, damping: c = 0 } = system;
        const { amplitude: F0, frequency: omega } = excitation;
        
        const omega_n = Math.sqrt(k / m);
        const zeta = c / (2 * Math.sqrt(k * m));
        const r = omega / omega_n; // Frequency ratio
        
        // Steady-state amplitude
        const X = (F0 / k) / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        // Phase angle
        const phi = Math.atan2(2 * zeta * r, 1 - r * r);
        
        // Magnification factor
        const MF = X / (F0 / k);
        
        // Transmissibility (force transmitted to base)
        const TR = Math.sqrt(1 + Math.pow(2 * zeta * r, 2)) / 
                   Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        // Power dissipated
        const P_dissipated = 0.5 * c * X * X * omega * omega;
        
        return {
            amplitude: X,
            phase_rad: phi,
            phase_deg: phi * 180 / Math.PI,
            magnificationFactor: MF,
            transmissibility: TR,
            frequencyRatio: r,
            dampingRatio: zeta,
            isResonant: Math.abs(r - 1) < 0.1,
            peakResponseFreq: omega_n * Math.sqrt(1 - 2 * zeta * zeta),
            powerDissipated: P_dissipated,
            response: (t) => X * Math.cos(omega * t - phi)
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FREQUENCY RESPONSE FUNCTION (FRF)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute FRF (compliance) for SDOF system
     * G(jω) = 1 / (k - mω² + jcω)
     */
    computeFRF: function(system, omega) {
        const { mass: m, stiffness: k, damping: c = 0 } = system;
        
        const real = k - m * omega * omega;
        const imag = c * omega;
        const denominator = real * real + imag * imag;
        
        const G_real = real / denominator;
        const G_imag = -imag / denominator;
        const magnitude = 1 / Math.sqrt(denominator);
        const phase = -Math.atan2(imag, real);
        
        return {
            real: G_real,
            imaginary: G_imag,
            magnitude,
            phase_rad: phase,
            phase_deg: phase * 180 / Math.PI,
            frequency_rad: omega,
            frequency_Hz: omega / (2 * Math.PI)
        };
    },
    
    /**
     * Generate FRF data over frequency range
     */
    generateFRFData: function(system, freqRange) {
        const { start, end, points } = freqRange;
        const data = [];
        
        for (let i = 0; i < points; i++) {
            const freq = start + (end - start) * i / (points - 1);
            const omega = 2 * Math.PI * freq;
            const frf = this.computeFRF(system, omega);
            data.push({
                frequency_Hz: freq,
                ...frf
            });
        }
        
        // Find resonance peak
        const peak = data.reduce((max, d) => d.magnitude > max.magnitude ? d : max);
        
        return {
            data,
            resonanceFreq: peak.frequency_Hz,
            peakMagnitude: peak.magnitude,
            halfPowerBandwidth: this._calculateHalfPowerBandwidth(data, peak)
        };
    },
    
    _calculateHalfPowerBandwidth: function(data, peak) {
        const halfPower = peak.magnitude / Math.sqrt(2);
        let f1 = null, f2 = null;
        
        for (let i = 1; i < data.length; i++) {
            if (!f1 && data[i].magnitude >= halfPower && data[i-1].magnitude < halfPower) {
                f1 = data[i].frequency_Hz;
            }
            if (f1 && data[i].magnitude < halfPower && data[i-1].magnitude >= halfPower) {
                f2 = data[i].frequency_Hz;
                break;
            }
        }
        
        return f1 && f2 ? f2 - f1 : null;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DOF MODAL ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Modal analysis for multi-DOF system
     * Solve eigenvalue problem: [K - ω²M]φ = 0
     * @param {Array} M - Mass matrix (n×n)
     * @param {Array} K - Stiffness matrix (n×n)
     * @returns {Object} Natural frequencies and mode shapes
     */
    modalAnalysis: function(M, K) {
        const n = M.length;
        
        // Use inverse power iteration with shifting for multiple modes
        const modes = [];
        const frequencies = [];
        
        // Find all eigenvalues using QR iteration (simplified)
        const eigenData = this._qrEigenvalues(M, K);
        
        // Sort by frequency
        eigenData.sort((a, b) => a.frequency - b.frequency);
        
        // Extract modal mass and stiffness
        for (let i = 0; i < eigenData.length; i++) {
            const phi = eigenData[i].modeShape;
            
            // Modal mass: m_i = φ_i^T * M * φ_i
            const modalMass = this._quadraticForm(phi, M, phi);
            
            // Modal stiffness: k_i = φ_i^T * K * φ_i
            const modalStiffness = this._quadraticForm(phi, K, phi);
            
            // Normalize mode shape
            const norm = Math.sqrt(phi.reduce((s, p) => s + p * p, 0));
            const normalizedPhi = phi.map(p => p / norm);
            
            // Mass-normalize: φ such that φ^T * M * φ = 1
            const massNormalizedPhi = phi.map(p => p / Math.sqrt(modalMass));
            
            modes.push({
                modeNumber: i + 1,
                frequency_rad: eigenData[i].omega,
                frequency_Hz: eigenData[i].frequency,
                modeShape: normalizedPhi,
                massNormalizedModeShape: massNormalizedPhi,
                modalMass,
                modalStiffness,
                participationFactor: this._participationFactor(normalizedPhi, M)
            });
        }
        
        return {
            numberOfModes: modes.length,
            modes,
            massMatrix: M,
            stiffnessMatrix: K
        };
    },
    
    _qrEigenvalues: function(M, K) {
        const n = M.length;
        const results = [];
        
        // Power iteration for each eigenvalue (simplified)
        for (let mode = 0; mode < n; mode++) {
            // Initial guess
            let v = Array(n).fill(0);
            v[mode] = 1;
            
            // Add some randomness to break symmetry
            v = v.map(x => x + 0.01 * (Math.random() - 0.5));
            
            // Solve K*x = λ*M*x iteratively
            for (let iter = 0; iter < 50; iter++) {
                // y = K^-1 * M * v (inverse iteration)
                const Mv = this._matVecMul(M, v);
                const y = this._solveSystem(K, Mv);
                
                // Rayleigh quotient
                const vMv = this._dotProduct(v, Mv);
                const vKv = this._dotProduct(v, this._matVecMul(K, v));
                const lambda = vKv / vMv;
                
                // Normalize
                const norm = Math.sqrt(y.reduce((s, yi) => s + yi * yi, 0));
                v = y.map(yi => yi / norm);
            }
            
            // Final eigenvalue
            const Mv = this._matVecMul(M, v);
            const Kv = this._matVecMul(K, v);
            const lambda = this._dotProduct(v, Kv) / this._dotProduct(v, Mv);
            const omega = Math.sqrt(Math.abs(lambda));
            
            results.push({
                omega,
                frequency: omega / (2 * Math.PI),
                modeShape: v
            });
        }
        
        return results;
    },
    
    _matVecMul: function(A, v) {
        return A.map(row => row.reduce((sum, a, j) => sum + a * v[j], 0));
    },
    
    _dotProduct: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _quadraticForm: function(v, M, w) {
        const Mw = this._matVecMul(M, w);
        return this._dotProduct(v, Mw);
    },
    
    _solveSystem: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) aug[i][i] = 1e-12;
            
            for (let k = i + 1; k < n; k++) {
                const factor = aug[k][i] / aug[i][i];
                for (let j = i; j <= n; j++) aug[k][j] -= factor * aug[i][j];
            }
        }
        
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
            x[i] /= aug[i][i];
        }
        
        return x;
    },
    
    _participationFactor: function(phi, M) {
        // Participation factor for seismic/base excitation
        const ones = Array(phi.length).fill(1);
        const numerator = this._dotProduct(phi, this._matVecMul(M, ones));
        const denominator = this._dotProduct(phi, this._matVecMul(M, phi));
        return numerator / denominator;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('vibration.sdof.natural', 'PRISM_VIBRATION_ANALYSIS_ENGINE.sdofNaturalFrequency');
            PRISM_GATEWAY.register('vibration.sdof.freeResponse', 'PRISM_VIBRATION_ANALYSIS_ENGINE.sdofFreeResponse');
            PRISM_GATEWAY.register('vibration.sdof.forcedResponse', 'PRISM_VIBRATION_ANALYSIS_ENGINE.sdofForcedResponse');
            PRISM_GATEWAY.register('vibration.frf.compute', 'PRISM_VIBRATION_ANALYSIS_ENGINE.computeFRF');
            PRISM_GATEWAY.register('vibration.frf.generate', 'PRISM_VIBRATION_ANALYSIS_ENGINE.generateFRFData');
            PRISM_GATEWAY.register('vibration.modal.analysis', 'PRISM_VIBRATION_ANALYSIS_ENGINE.modalAnalysis');
            console.log('[PRISM] PRISM_VIBRATION_ANALYSIS_ENGINE registered: 6 routes');
        }
    }
};


/**
 * PRISM_CHATTER_PREDICTION_ENGINE
 * Stability lobe diagram and chatter prediction
 * Source: Altintas "Manufacturing Automation", Tlusty, Tobias
 */
const PRISM_CHATTER_PREDICTION_ENGINE = {
    name: 'PRISM_CHATTER_PREDICTION_ENGINE',
    version: '1.0.0',
    source: 'Altintas, Tlusty, MIT 2.830',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STABILITY LOBE DIAGRAM
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Generate stability lobe diagram for milling
     * @param {Object} toolDynamics - {mass, stiffness, damping} or FRF
     * @param {Object} cuttingParams - {Kt, radialImmersion, numTeeth}
     * @param {Object} rpmRange - {min, max, points}
     * @returns {Object} Stability lobes data
     */
    generateStabilityLobes: function(toolDynamics, cuttingParams, rpmRange) {
        const { Kt, radialImmersion = 1, numTeeth = 4 } = cuttingParams;
        const { min: rpmMin, max: rpmMax, points = 100 } = rpmRange;
        
        // Get system FRF parameters
        let omega_n, zeta, k;
        if (toolDynamics.mass) {
            const { mass: m, stiffness, damping = 0 } = toolDynamics;
            k = stiffness;
            omega_n = Math.sqrt(k / m);
            zeta = damping / (2 * Math.sqrt(k * m));
        } else {
            // Assume FRF data provided
            omega_n = toolDynamics.naturalFreq * 2 * Math.PI;
            zeta = toolDynamics.dampingRatio;
            k = toolDynamics.stiffness;
        }
        
        // Average directional factor for milling
        const alphaxx = this._directionalFactor(radialImmersion, 'milling');
        
        const lobes = [];
        const numLobes = 5;
        
        // Generate lobes for different lobe numbers
        for (let lobeNum = 0; lobeNum < numLobes; lobeNum++) {
            const lobePoints = [];
            
            // Sweep through phase (0 to π)
            for (let i = 0; i <= points; i++) {
                const epsilon = Math.PI * i / points;
                
                // Chatter frequency
                const omega_c = omega_n * Math.sqrt(1 - zeta * zeta + 
                    Math.sqrt(Math.pow(1 - zeta * zeta, 2) + Math.pow(Math.tan(epsilon), 2)));
                
                // Real part of oriented FRF
                const G_real = -1 / (2 * k * zeta * Math.sqrt(1 - zeta * zeta));
                
                // Critical depth of cut (Altintas equation)
                const a_lim = -1 / (2 * Kt * alphaxx * G_real * Math.cos(epsilon));
                
                // Spindle speed
                const f_c = omega_c / (2 * Math.PI);
                const T = (2 * lobeNum * Math.PI + epsilon) / omega_c;
                const N = 60 / (numTeeth * T);
                
                if (N >= rpmMin && N <= rpmMax && a_lim > 0) {
                    lobePoints.push({
                        rpm: N,
                        depthLimit_mm: a_lim * 1000, // Convert to mm
                        chatterFrequency_Hz: f_c,
                        lobeNumber: lobeNum
                    });
                }
            }
            
            if (lobePoints.length > 0) {
                lobes.push({
                    lobeNumber: lobeNum,
                    points: lobePoints.sort((a, b) => a.rpm - b.rpm)
                });
            }
        }
        
        // Find optimal stable pockets
        const stablePockets = this._findStablePockets(lobes, rpmMin, rpmMax);
        
        return {
            lobes,
            stablePockets,
            toolDynamics: { naturalFreq_Hz: omega_n / (2 * Math.PI), dampingRatio: zeta, stiffness: k },
            cuttingParams,
            rpmRange: { min: rpmMin, max: rpmMax }
        };
    },
    
    _directionalFactor: function(radialImmersion, operation) {
        // Average directional factor for different operations
        if (operation === 'milling') {
            // Simplified - depends on engagement angle
            const phi_st = Math.acos(1 - 2 * radialImmersion);
            const phi_ex = Math.PI;
            return (1 / (2 * Math.PI)) * (Math.cos(2 * phi_st) - Math.cos(2 * phi_ex) + 2 * (phi_ex - phi_st));
        }
        return 1; // For turning
    },
    
    _findStablePockets: function(lobes, rpmMin, rpmMax) {
        const pockets = [];
        const stepSize = 100;
        
        for (let rpm = rpmMin; rpm <= rpmMax; rpm += stepSize) {
            let maxStableDepth = Infinity;
            
            for (const lobe of lobes) {
                for (let i = 0; i < lobe.points.length - 1; i++) {
                    const p1 = lobe.points[i];
                    const p2 = lobe.points[i + 1];
                    
                    if (rpm >= Math.min(p1.rpm, p2.rpm) && rpm <= Math.max(p1.rpm, p2.rpm)) {
                        const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
                        const depth = p1.depthLimit_mm + t * (p2.depthLimit_mm - p1.depthLimit_mm);
                        maxStableDepth = Math.min(maxStableDepth, depth);
                    }
                }
            }
            
            if (maxStableDepth > 0 && maxStableDepth < Infinity) {
                pockets.push({ rpm, maxStableDepth_mm: maxStableDepth });
            }
        }
        
        // Find peaks in stable pockets
        const peaks = [];
        for (let i = 1; i < pockets.length - 1; i++) {
            if (pockets[i].maxStableDepth_mm > pockets[i-1].maxStableDepth_mm &&
                pockets[i].maxStableDepth_mm > pockets[i+1].maxStableDepth_mm) {
                peaks.push(pockets[i]);
            }
        }
        
        return {
            all: pockets,
            peaks: peaks.sort((a, b) => b.maxStableDepth_mm - a.maxStableDepth_mm)
        };
    },
    
    /**
     * Check stability for given parameters
     * @param {number} rpm - Spindle speed
     * @param {number} axialDepth - Depth of cut in mm
     * @param {Object} lobes - Stability lobe data
     * @returns {Object} Stability assessment
     */
    checkStability: function(rpm, axialDepth, lobes) {
        let minStableDepth = Infinity;
        let criticalLobe = null;
        
        for (const lobe of lobes.lobes) {
            for (let i = 0; i < lobe.points.length - 1; i++) {
                const p1 = lobe.points[i];
                const p2 = lobe.points[i + 1];
                
                if (rpm >= Math.min(p1.rpm, p2.rpm) && rpm <= Math.max(p1.rpm, p2.rpm)) {
                    const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
                    const depth = p1.depthLimit_mm + t * (p2.depthLimit_mm - p1.depthLimit_mm);
                    if (depth < minStableDepth) {
                        minStableDepth = depth;
                        criticalLobe = lobe.lobeNumber;
                    }
                }
            }
        }
        
        const stable = axialDepth < minStableDepth;
        const margin = minStableDepth - axialDepth;
        const marginPercent = (margin / minStableDepth) * 100;
        
        return {
            stable,
            axialDepth_mm: axialDepth,
            criticalDepth_mm: minStableDepth,
            margin_mm: margin,
            marginPercent,
            criticalLobe,
            recommendation: stable ? 
                (marginPercent > 20 ? 'Good - adequate stability margin' : 'Caution - near stability limit') :
                'Unstable - reduce depth of cut or change RPM'
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CHATTER DETECTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Detect chatter from vibration signal
     * @param {Array} signal - Time-domain vibration signal
     * @param {Object} config - {sampleRate, teeth, rpm}
     * @returns {Object} Chatter detection results
     */
    detectChatter: function(signal, config) {
        const { sampleRate, teeth, rpm } = config;
        
        // Compute FFT
        const spectrum = this._fft(signal);
        const N = signal.length;
        const freqs = spectrum.map((_, i) => i * sampleRate / N);
        
        // Tooth passing frequency and harmonics
        const toothFreq = rpm * teeth / 60;
        const harmonics = [1, 2, 3, 4, 5].map(n => n * toothFreq);
        
        // Find spectral peaks
        const peaks = this._findPeaks(spectrum, freqs, sampleRate);
        
        // Classify peaks as harmonic or non-harmonic (potential chatter)
        const harmonicPeaks = [];
        const nonHarmonicPeaks = [];
        
        for (const peak of peaks) {
            const isHarmonic = harmonics.some(h => Math.abs(peak.frequency - h) < toothFreq * 0.1);
            if (isHarmonic) {
                harmonicPeaks.push(peak);
            } else {
                nonHarmonicPeaks.push(peak);
            }
        }
        
        // Chatter detection criteria
        let chatterDetected = false;
        let chatterFrequency = null;
        let chatterSeverity = 0;
        
        if (nonHarmonicPeaks.length > 0 && harmonicPeaks.length > 0) {
            const dominantNonHarmonic = nonHarmonicPeaks[0];
            const dominantHarmonic = harmonicPeaks[0];
            
            // Chatter if non-harmonic peak is significant relative to tooth passing
            const ratio = dominantNonHarmonic.magnitude / dominantHarmonic.magnitude;
            if (ratio > 0.3) {
                chatterDetected = true;
                chatterFrequency = dominantNonHarmonic.frequency;
                chatterSeverity = Math.min(1, ratio);
            }
        }
        
        return {
            chatterDetected,
            chatterFrequency_Hz: chatterFrequency,
            chatterSeverity, // 0-1 scale
            toothPassingFrequency_Hz: toothFreq,
            harmonicPeaks,
            nonHarmonicPeaks,
            spectrum: spectrum.slice(0, N / 2),
            frequencies: freqs.slice(0, N / 2),
            recommendation: chatterDetected ? 
                `Chatter detected at ${chatterFrequency?.toFixed(1)} Hz. Adjust RPM or reduce depth.` :
                'No chatter detected'
        };
    },
    
    _fft: function(signal) {
        const N = signal.length;
        const spectrum = [];
        
        // Radix-2 FFT (requires power of 2 length)
        const n = Math.pow(2, Math.ceil(Math.log2(N)));
        const padded = [...signal, ...Array(n - N).fill(0)];
        
        // DFT (use FFT algorithm for large signals in production)
        for (let k = 0; k < n; k++) {
            let real = 0, imag = 0;
            for (let t = 0; t < n; t++) {
                const angle = -2 * Math.PI * k * t / n;
                real += padded[t] * Math.cos(angle);
                imag += padded[t] * Math.sin(angle);
            }
            spectrum.push(Math.sqrt(real * real + imag * imag) / n);
        }
        
        return spectrum;
    },
    
    _findPeaks: function(spectrum, freqs, sampleRate) {
        const peaks = [];
        const minHeight = Math.max(...spectrum) * 0.05; // 5% of max
        
        // Only look at first half (positive frequencies)
        const halfN = Math.floor(spectrum.length / 2);
        
        for (let i = 2; i < halfN - 2; i++) {
            if (spectrum[i] > minHeight &&
                spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i-2] &&
                spectrum[i] > spectrum[i+1] && spectrum[i] > spectrum[i+2]) {
                peaks.push({
                    frequency: freqs[i],
                    magnitude: spectrum[i],
                    index: i
                });
            }
        }
        
        return peaks.sort((a, b) => b.magnitude - a.magnitude);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL SPEED ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Calculate critical speeds for rotating shaft
     * @param {Object} shaft - {length, diameter, E, density}
     * @param {Array} supports - [{position, type}] 
     * @returns {Object} Critical speeds
     */
    criticalSpeeds: function(shaft, supports = []) {
        const { length: L, diameter: d, E, density: rho } = shaft;
        
        // Cross-section properties
        const A = Math.PI * d * d / 4;
        const I = Math.PI * Math.pow(d, 4) / 64;
        
        // Mass per unit length
        const m_bar = rho * A;
        
        // Bending rigidity
        const EI = E * I;
        
        // Calculate first few critical speeds based on support conditions
        const supportType = supports.length === 0 ? 'simply-supported' : 
            supports.every(s => s.type === 'fixed') ? 'fixed-fixed' : 'simply-supported';
        
        const criticalSpeeds = [];
        const lambda_n = {
            'simply-supported': [Math.PI, 2 * Math.PI, 3 * Math.PI],
            'fixed-fixed': [4.730, 7.853, 10.996],
            'cantilever': [1.875, 4.694, 7.855]
        };
        
        const lambdas = lambda_n[supportType] || lambda_n['simply-supported'];
        
        for (let i = 0; i < lambdas.length; i++) {
            const lambda = lambdas[i];
            
            // Natural frequency: ω_n = (λ/L)² * sqrt(EI / (m_bar))
            const omega_n = Math.pow(lambda / L, 2) * Math.sqrt(EI / m_bar);
            const f_n = omega_n / (2 * Math.PI);
            const rpm_critical = f_n * 60;
            
            criticalSpeeds.push({
                mode: i + 1,
                frequency_Hz: f_n,
                criticalRPM: rpm_critical,
                wavelength: L / lambda
            });
        }
        
        return {
            shaft: { length: L, diameter: d, E, density: rho },
            supportType,
            criticalSpeeds,
            recommendedMaxRPM: criticalSpeeds[0].criticalRPM * 0.8,
            safeOperatingRanges: this._findSafeRanges(criticalSpeeds)
        };
    },
    
    _findSafeRanges: function(criticalSpeeds) {
        const ranges = [];
        const margin = 0.15; // 15% margin from critical
        
        let prevUpper = 0;
        for (const cs of criticalSpeeds) {
            const lower = cs.criticalRPM * (1 - margin);
            const upper = cs.criticalRPM * (1 + margin);
            
            if (lower > prevUpper) {
                ranges.push({
                    min: prevUpper,
                    max: lower,
                    description: `Safe range below critical speed ${cs.mode}`
                });
            }
            prevUpper = upper;
        }
        
        return ranges;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('chatter.stabilityLobes', 'PRISM_CHATTER_PREDICTION_ENGINE.generateStabilityLobes');
            PRISM_GATEWAY.register('chatter.checkStability', 'PRISM_CHATTER_PREDICTION_ENGINE.checkStability');
            PRISM_GATEWAY.register('chatter.detect', 'PRISM_CHATTER_PREDICTION_ENGINE.detectChatter');
            PRISM_GATEWAY.register('chatter.criticalSpeeds', 'PRISM_CHATTER_PREDICTION_ENGINE.criticalSpeeds');
            console.log('[PRISM] PRISM_CHATTER_PREDICTION_ENGINE registered: 4 routes');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTRATION AND EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession4Part2() {
    PRISM_VIBRATION_ANALYSIS_ENGINE.register();
    PRISM_CHATTER_PREDICTION_ENGINE.register();
    
    console.log('[Session 4 Part 2] Registered 2 modules, 10 gateway routes');
    console.log('  - PRISM_VIBRATION_ANALYSIS_ENGINE: SDOF/MDOF, FRF, Modal analysis');
    console.log('  - PRISM_CHATTER_PREDICTION_ENGINE: Stability lobes, Chatter detection, Critical speeds');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    registerSession4Part2();
}

console.log('[Session 4 Part 2] Vibration Analysis & Chatter Prediction loaded - 2 modules');
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PRISM SESSION 4 PART 3: CUTTING PHYSICS & FORCE MODELS
// Source: MIT 2.008 (Manufacturing), Merchant, Shaw, Kienzle
// Algorithms: Cutting Forces, Chip Formation, Tool Life, Surface Finish Prediction
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * PRISM_CUTTING_MECHANICS_ENGINE
 * Complete cutting force and chip formation analysis
 * Source: Merchant (1945), Shaw, MIT 2.008, MIT 2.830
 */
const PRISM_CUTTING_MECHANICS_ENGINE = {
    name: 'PRISM_CUTTING_MECHANICS_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.008, Merchant 1945, Shaw Metal Cutting',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MERCHANT'S CUTTING ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Merchant's orthogonal cutting model
     * @param {Object} params - Cutting parameters
     * @returns {Object} Complete force analysis
     */
    merchantAnalysis: function(params) {
        const {
            chipThickness: h,      // Uncut chip thickness (mm)
            width: b,              // Width of cut (mm)
            rakeAngle: alpha,      // Rake angle (radians)
            shearStrength: tau_s,  // Shear strength of workpiece (MPa)
            frictionCoeff: mu = 0.5 // Coefficient of friction
        } = params;
        
        // Friction angle
        const beta = Math.atan(mu);
        
        // Merchant's minimum energy criterion for shear angle
        // φ = π/4 - (β - α)/2
        const phi = Math.PI / 4 - (beta - alpha) / 2;
        
        // Alternative: Lee-Shaffer solution
        // φ = π/4 - β + α
        const phi_leeShaffer = Math.PI / 4 - beta + alpha;
        
        // Chip ratio (cutting ratio)
        const r_c = Math.cos(phi - alpha) / Math.cos(alpha);
        
        // Chip thickness
        const h_c = h / r_c;
        
        // Shear plane area
        const A_s = (b * h) / Math.sin(phi);
        
        // Shear velocity
        // V_s = V_c * cos(α) / cos(φ - α)
        
        // Shear force
        const F_s = tau_s * A_s;
        
        // Resultant force
        const R = F_s / Math.cos(phi + beta - alpha);
        
        // Cutting force (tangential)
        const F_c = R * Math.cos(beta - alpha);
        
        // Thrust force (feed direction)
        const F_t = R * Math.sin(beta - alpha);
        
        // Friction force (on rake face)
        const F_f = R * Math.sin(beta);
        
        // Normal force (on rake face)
        const F_n = R * Math.cos(beta);
        
        // Power consumption
        // P = F_c * V_c (need cutting speed)
        
        // Specific cutting energy (energy per unit volume)
        const u_c = F_c / (b * h); // J/mm³ = N/mm² = MPa
        
        return {
            shearAngle_rad: phi,
            shearAngle_deg: phi * 180 / Math.PI,
            frictionAngle_rad: beta,
            frictionAngle_deg: beta * 180 / Math.PI,
            chipRatio: r_c,
            chipThickness_mm: h_c,
            chipCompressionRatio: 1 / r_c,
            shearPlaneArea_mm2: A_s,
            forces: {
                shear_N: F_s,
                resultant_N: R,
                cutting_N: F_c,
                thrust_N: F_t,
                friction_N: F_f,
                normal_N: F_n
            },
            specificCuttingEnergy_MPa: u_c,
            coefficientOfFriction: mu,
            leeShaffer_phi_deg: phi_leeShaffer * 180 / Math.PI
        };
    },
    
    /**
     * Kienzle cutting force model
     * Fc = Kc × b × h
     * Kc = Kc1.1 × h^(-mc)
     */
    kienzleForce: function(params) {
        const {
            chipThickness: h,     // mm
            width: b,             // mm
            Kc1_1,               // Specific cutting force at h=1mm, b=1mm (N/mm²)
            mc = 0.25            // Material constant
        } = params;
        
        // Size effect: specific cutting force depends on chip thickness
        const Kc = Kc1_1 * Math.pow(h, -mc);
        
        // Main cutting force
        const Fc = Kc * b * h;
        
        // Corrected chip area
        const chipArea = b * h;
        
        return {
            specificCuttingForce_N_mm2: Kc,
            cuttingForce_N: Fc,
            chipArea_mm2: chipArea,
            Kc1_1,
            exponent_mc: mc,
            sizeEffectFactor: Math.pow(h, -mc)
        };
    },
    
    /**
     * Complete milling force model with tooth engagement
     * @param {Object} tool - Tool geometry
     * @param {Object} params - Cutting conditions
     * @returns {Object} Time-varying forces
     */
    millingForces: function(tool, params) {
        const {
            diameter: D,
            teeth: z,
            helixAngle: helix = 30,
            rakeAngle: alpha_r = 10
        } = tool;
        
        const {
            rpm,
            feed: f_z,           // Feed per tooth (mm)
            axialDepth: a_p,     // mm
            radialDepth: a_e,    // mm
            Ktc,                 // Tangential specific force (N/mm²)
            Krc = 0.3 * Ktc,     // Radial specific force
            Kac = 0.1 * Ktc      // Axial specific force
        } = params;
        
        const R = D / 2;
        const radialImmersion = a_e / D;
        
        // Entry and exit angles
        const phi_st = this._entryAngle(radialImmersion, 'down');
        const phi_ex = this._exitAngle(radialImmersion, 'down');
        
        // Generate force profile over one revolution
        const points = 360;
        const forces = [];
        
        for (let i = 0; i < points; i++) {
            const phi = (i / points) * 2 * Math.PI;
            
            let Fx = 0, Fy = 0, Fz = 0;
            
            // Sum contributions from each tooth
            for (let tooth = 0; tooth < z; tooth++) {
                const phi_tooth = phi + tooth * (2 * Math.PI / z);
                const phi_tooth_mod = phi_tooth % (2 * Math.PI);
                
                // Check if tooth is engaged
                if (phi_tooth_mod >= phi_st && phi_tooth_mod <= phi_ex) {
                    // Instantaneous chip thickness
                    const h = f_z * Math.sin(phi_tooth_mod);
                    
                    if (h > 0) {
                        // Tangential force
                        const Ft = Ktc * a_p * h;
                        // Radial force
                        const Fr = Krc * a_p * h;
                        // Axial force
                        const Fa = Kac * a_p * h;
                        
                        // Transform to XYZ (workpiece coordinates)
                        Fx += -Ft * Math.cos(phi_tooth_mod) - Fr * Math.sin(phi_tooth_mod);
                        Fy += Ft * Math.sin(phi_tooth_mod) - Fr * Math.cos(phi_tooth_mod);
                        Fz += Fa;
                    }
                }
            }
            
            forces.push({
                angle_deg: i,
                Fx, Fy, Fz,
                F_magnitude: Math.sqrt(Fx*Fx + Fy*Fy + Fz*Fz)
            });
        }
        
        // Calculate statistics
        const Fx_max = Math.max(...forces.map(f => Math.abs(f.Fx)));
        const Fy_max = Math.max(...forces.map(f => Math.abs(f.Fy)));
        const Fz_max = Math.max(...forces.map(f => Math.abs(f.Fz)));
        const Fx_avg = forces.reduce((s, f) => s + Math.abs(f.Fx), 0) / points;
        const Fy_avg = forces.reduce((s, f) => s + Math.abs(f.Fy), 0) / points;
        
        // Average cutting power
        const V_c = Math.PI * D * rpm / 1000; // m/min
        const P_avg = (Fx_avg * V_c / 60) / 1000; // kW
        
        return {
            forceProfile: forces,
            maxForces: { Fx: Fx_max, Fy: Fy_max, Fz: Fz_max },
            avgForces: { Fx: Fx_avg, Fy: Fy_avg },
            engagementAngles: {
                entry_deg: phi_st * 180 / Math.PI,
                exit_deg: phi_ex * 180 / Math.PI
            },
            power_kW: P_avg,
            torque_Nm: (P_avg * 1000 * 60) / (2 * Math.PI * rpm)
        };
    },
    
    _entryAngle: function(radialImmersion, direction) {
        if (direction === 'down') {
            return Math.acos(1 - 2 * radialImmersion);
        }
        return 0;
    },
    
    _exitAngle: function(radialImmersion, direction) {
        if (direction === 'down') {
            return Math.PI;
        }
        return Math.acos(1 - 2 * radialImmersion);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SPECIFIC CUTTING ENERGY DATABASE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Get specific cutting force for material
     * @param {string} material - Material name or code
     * @returns {Object} Cutting force constants
     */
    getMaterialCuttingData: function(material) {
        const database = {
            'aluminum_6061': { Kc1_1: 700, mc: 0.25, tau_s: 150 },
            'aluminum_7075': { Kc1_1: 900, mc: 0.25, tau_s: 220 },
            'steel_1018': { Kc1_1: 1800, mc: 0.25, tau_s: 350 },
            'steel_1045': { Kc1_1: 2200, mc: 0.26, tau_s: 450 },
            'steel_4140': { Kc1_1: 2500, mc: 0.27, tau_s: 520 },
            'steel_4340': { Kc1_1: 2800, mc: 0.28, tau_s: 580 },
            'stainless_304': { Kc1_1: 2400, mc: 0.23, tau_s: 480 },
            'stainless_316': { Kc1_1: 2600, mc: 0.24, tau_s: 510 },
            'titanium_ti6al4v': { Kc1_1: 1800, mc: 0.22, tau_s: 600 },
            'inconel_718': { Kc1_1: 3200, mc: 0.20, tau_s: 700 },
            'cast_iron_gray': { Kc1_1: 1200, mc: 0.28, tau_s: 280 },
            'brass': { Kc1_1: 800, mc: 0.20, tau_s: 180 },
            'copper': { Kc1_1: 1000, mc: 0.22, tau_s: 200 }
        };
        
        const key = material.toLowerCase().replace(/[\s-]/g, '_');
        return database[key] || { Kc1_1: 2000, mc: 0.25, tau_s: 400 };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('cutting.merchant', 'PRISM_CUTTING_MECHANICS_ENGINE.merchantAnalysis');
            PRISM_GATEWAY.register('cutting.kienzle', 'PRISM_CUTTING_MECHANICS_ENGINE.kienzleForce');
            PRISM_GATEWAY.register('cutting.milling', 'PRISM_CUTTING_MECHANICS_ENGINE.millingForces');
            PRISM_GATEWAY.register('cutting.materialData', 'PRISM_CUTTING_MECHANICS_ENGINE.getMaterialCuttingData');
            console.log('[PRISM] PRISM_CUTTING_MECHANICS_ENGINE registered: 4 routes');
        }
    }
}