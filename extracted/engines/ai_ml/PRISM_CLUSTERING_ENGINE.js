/**
 * PRISM_CLUSTERING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 5
 * Lines: 464
 * Session: R2.3.1 Wave 3 Engine Gap Extraction
 */

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
}