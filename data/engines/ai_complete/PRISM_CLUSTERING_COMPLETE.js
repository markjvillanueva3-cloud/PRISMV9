// PRISM_CLUSTERING_COMPLETE - Lines 902115-902719 (605 lines) - Clustering complete\n\nconst PRISM_CLUSTERING_COMPLETE = {
    name: 'PRISM Clustering Complete',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 229',
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // K-MEDOIDS (PAM Algorithm)
    // More robust to outliers than K-Means
    // ─────────────────────────────────────────────────────────────────────────────────────────
    KMedoids: {
        /**
         * K-Medoids clustering using PAM (Partitioning Around Medoids)
         * @param {Array} data - Array of data points (each point is an array)
         * @param {number} k - Number of clusters
         * @param {Function} distanceFn - Distance function (default: Euclidean)
         * @param {number} maxIter - Maximum iterations
         * @returns {Object} {medoids, labels, cost}
         */
        cluster: function(data, k, distanceFn = null, maxIter = 100) {
            const n = data.length;
            if (k > n) throw new Error('k cannot exceed number of data points');
            
            distanceFn = distanceFn || this._euclideanDistance;
            
            // Precompute distance matrix
            const distMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const d = distanceFn(data[i], data[j]);
                    distMatrix[i][j] = d;
                    distMatrix[j][i] = d;
                }
            }
            
            // Initialize medoids randomly
            let medoids = this._randomSample(n, k);
            let labels = this._assignLabels(distMatrix, medoids);
            let cost = this._computeCost(distMatrix, medoids, labels);
            
            // PAM swap phase
            for (let iter = 0; iter < maxIter; iter++) {
                let improved = false;
                
                // Try swapping each medoid with each non-medoid
                for (let m = 0; m < k; m++) {
                    for (let i = 0; i < n; i++) {
                        if (medoids.includes(i)) continue;
                        
                        // Try swap
                        const newMedoids = [...medoids];
                        newMedoids[m] = i;
                        const newLabels = this._assignLabels(distMatrix, newMedoids);
                        const newCost = this._computeCost(distMatrix, newMedoids, newLabels);
                        
                        if (newCost < cost) {
                            medoids = newMedoids;
                            labels = newLabels;
                            cost = newCost;
                            improved = true;
                        }
                    }
                }
                
                if (!improved) {
                    console.log(`[K-Medoids] Converged after ${iter + 1} iterations`);
                    break;
                }
            }
            
            return {
                medoids: medoids.map(i => data[i]),
                medoidIndices: medoids,
                labels,
                cost,
                clusterCenters: medoids.map(i => data[i])
            };
        },
        
        _randomSample: function(n, k) {
            const indices = [];
            while (indices.length < k) {
                const i = Math.floor(Math.random() * n);
                if (!indices.includes(i)) indices.push(i);
            }
            return indices;
        },
        
        _assignLabels: function(distMatrix, medoids) {
            const n = distMatrix.length;
            const labels = Array(n);
            
            for (let i = 0; i < n; i++) {
                let minDist = Infinity;
                let label = 0;
                for (let m = 0; m < medoids.length; m++) {
                    const d = distMatrix[i][medoids[m]];
                    if (d < minDist) {
                        minDist = d;
                        label = m;
                    }
                }
                labels[i] = label;
            }
            
            return labels;
        },
        
        _computeCost: function(distMatrix, medoids, labels) {
            let cost = 0;
            for (let i = 0; i < labels.length; i++) {
                cost += distMatrix[i][medoids[labels[i]]];
            }
            return cost;
        },
        
        _euclideanDistance: function(a, b) {
            return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // MEAN SHIFT CLUSTERING
    // Non-parametric, finds modes of density
    // ─────────────────────────────────────────────────────────────────────────────────────────
    MeanShift: {
        /**
         * Mean Shift clustering
         * @param {Array} data - Array of data points
         * @param {number} bandwidth - Kernel bandwidth (auto-estimated if null)
         * @param {number} maxIter - Maximum iterations
         * @param {number} tolerance - Convergence tolerance
         * @returns {Object} {labels, clusterCenters, numClusters}
         */
        cluster: function(data, bandwidth = null, maxIter = 300, tolerance = 1e-4) {
            const n = data.length;
            const dim = data[0].length;
            
            // Auto-estimate bandwidth if not provided
            if (bandwidth === null) {
                bandwidth = this._estimateBandwidth(data);
            }
            
            // Initialize points at their data locations
            let points = data.map(p => [...p]);
            
            // Iterate mean shift for each point
            for (let iter = 0; iter < maxIter; iter++) {
                let maxShift = 0;
                
                for (let i = 0; i < n; i++) {
                    const newPoint = this._meanShiftPoint(points[i], data, bandwidth);
                    const shift = Math.sqrt(points[i].reduce((sum, v, d) => 
                        sum + (v - newPoint[d]) ** 2, 0));
                    maxShift = Math.max(maxShift, shift);
                    points[i] = newPoint;
                }
                
                if (maxShift < tolerance) {
                    console.log(`[MeanShift] Converged after ${iter + 1} iterations`);
                    break;
                }
            }
            
            // Merge nearby points into cluster centers
            const { centers, labels } = this._mergeModes(points, data, bandwidth / 2);
            
            return {
                labels,
                clusterCenters: centers,
                numClusters: centers.length,
                bandwidth
            };
        },
        
        /**
         * Mean shift for single point
         */
        _meanShiftPoint: function(point, data, bandwidth) {
            const dim = point.length;
            const numerator = Array(dim).fill(0);
            let denominator = 0;
            
            for (const x of data) {
                const dist = Math.sqrt(point.reduce((sum, v, i) => sum + (v - x[i]) ** 2, 0));
                const weight = this._gaussianKernel(dist / bandwidth);
                
                for (let d = 0; d < dim; d++) {
                    numerator[d] += weight * x[d];
                }
                denominator += weight;
            }
            
            return numerator.map(v => v / denominator);
        },
        
        /**
         * Gaussian kernel
         */
        _gaussianKernel: function(x) {
            return Math.exp(-0.5 * x * x);
        },
        
        /**
         * Estimate bandwidth using Scott's rule
         */
        _estimateBandwidth: function(data) {
            const n = data.length;
            const dim = data[0].length;
            
            // Compute standard deviation for each dimension
            const stds = [];
            for (let d = 0; d < dim; d++) {
                const values = data.map(p => p[d]);
                const mean = values.reduce((a, b) => a + b, 0) / n;
                const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
                stds.push(Math.sqrt(variance));
            }
            
            // Scott's rule
            const avgStd = stds.reduce((a, b) => a + b, 0) / dim;
            return avgStd * Math.pow(n, -1 / (dim + 4));
        },
        
        /**
         * Merge nearby modes into cluster centers
         */
        _mergeModes: function(modes, data, mergeDistance) {
            const centers = [];
            const labels = Array(data.length).fill(-1);
            
            // Find unique modes
            for (let i = 0; i < modes.length; i++) {
                let merged = false;
                for (let c = 0; c < centers.length; c++) {
                    const dist = Math.sqrt(modes[i].reduce((sum, v, d) => 
                        sum + (v - centers[c][d]) ** 2, 0));
                    if (dist < mergeDistance) {
                        labels[i] = c;
                        merged = true;
                        break;
                    }
                }
                if (!merged) {
                    labels[i] = centers.length;
                    centers.push(modes[i]);
                }
            }
            
            return { centers, labels };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // SPECTRAL CLUSTERING
    // Graph-based clustering using eigenvectors
    // ─────────────────────────────────────────────────────────────────────────────────────────
    SpectralClustering: {
        /**
         * Spectral Clustering
         * @param {Array} data - Array of data points
         * @param {number} k - Number of clusters
         * @param {number} sigma - RBF kernel bandwidth
         * @returns {Object} {labels, eigenvalues}
         */
        cluster: function(data, k, sigma = null) {
            const n = data.length;
            
            // Auto-estimate sigma if not provided
            if (sigma === null) {
                sigma = this._estimateSigma(data);
            }
            
            // Build affinity matrix (RBF kernel)
            const W = this._buildAffinityMatrix(data, sigma);
            
            // Compute degree matrix
            const D = Array(n).fill(0).map((_, i) => 
                W[i].reduce((sum, w) => sum + w, 0)
            );
            
            // Compute normalized Laplacian: L = I - D^(-1/2) W D^(-1/2)
            const L = this._normalizedLaplacian(W, D);
            
            // Find k smallest eigenvectors (using power iteration for simplicity)
            const eigenvectors = this._findSmallestEigenvectors(L, k);
            
            // Normalize rows
            for (let i = 0; i < n; i++) {
                const norm = Math.sqrt(eigenvectors[i].reduce((sum, v) => sum + v * v, 0));
                if (norm > 1e-10) {
                    for (let j = 0; j < k; j++) {
                        eigenvectors[i][j] /= norm;
                    }
                }
            }
            
            // K-means on eigenvector representation
            const labels = this._kmeansSimple(eigenvectors, k);
            
            return {
                labels,
                numClusters: k,
                sigma
            };
        },
        
        _buildAffinityMatrix: function(data, sigma) {
            const n = data.length;
            const W = Array(n).fill(0).map(() => Array(n).fill(0));
            
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const dist = Math.sqrt(data[i].reduce((sum, v, d) => 
                        sum + (v - data[j][d]) ** 2, 0));
                    const w = Math.exp(-dist * dist / (2 * sigma * sigma));
                    W[i][j] = w;
                    W[j][i] = w;
                }
            }
            
            return W;
        },
        
        _normalizedLaplacian: function(W, D) {
            const n = W.length;
            const L = Array(n).fill(0).map(() => Array(n).fill(0));
            
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        L[i][j] = 1;
                    } else if (D[i] > 0 && D[j] > 0) {
                        L[i][j] = -W[i][j] / Math.sqrt(D[i] * D[j]);
                    }
                }
            }
            
            return L;
        },
        
        _estimateSigma: function(data) {
            // Use median of pairwise distances
            const distances = [];
            for (let i = 0; i < Math.min(data.length, 100); i++) {
                for (let j = i + 1; j < Math.min(data.length, 100); j++) {
                    const dist = Math.sqrt(data[i].reduce((sum, v, d) => 
                        sum + (v - data[j][d]) ** 2, 0));
                    distances.push(dist);
                }
            }
            distances.sort((a, b) => a - b);
            return distances[Math.floor(distances.length / 2)];
        },
        
        _findSmallestEigenvectors: function(L, k) {
            const n = L.length;
            const eigenvectors = Array(n).fill(0).map(() => Array(k).fill(0));
            
            // Simplified: use random initialization and power iteration
            // In production, use proper eigendecomposition library
            for (let e = 0; e < k; e++) {
                // Initialize random vector
                let v = Array(n).fill(0).map(() => Math.random() - 0.5);
                
                // Power iteration on (I - L) to find eigenvector of smallest eigenvalue
                // This is a simplification - real implementation would use Lanczos
                for (let iter = 0; iter < 50; iter++) {
                    // Multiply by (I - L)
                    const newV = Array(n).fill(0);
                    for (let i = 0; i < n; i++) {
                        newV[i] = v[i];
                        for (let j = 0; j < n; j++) {
                            newV[i] -= L[i][j] * v[j];
                        }
                    }
                    
                    // Orthogonalize against previous eigenvectors
                    for (let prev = 0; prev < e; prev++) {
                        const dot = eigenvectors.reduce((sum, row, i) => 
                            sum + row[prev] * newV[i], 0);
                        for (let i = 0; i < n; i++) {
                            newV[i] -= dot * eigenvectors[i][prev];
                        }
                    }
                    
                    // Normalize
                    const norm = Math.sqrt(newV.reduce((sum, val) => sum + val * val, 0));
                    v = newV.map(val => val / norm);
                }
                
                for (let i = 0; i < n; i++) {
                    eigenvectors[i][e] = v[i];
                }
            }
            
            return eigenvectors;
        },
        
        _kmeansSimple: function(data, k, maxIter = 50) {
            const n = data.length;
            const dim = data[0].length;
            
            // Initialize centroids
            let centroids = data.slice(0, k).map(p => [...p]);
            let labels = Array(n).fill(0);
            
            for (let iter = 0; iter < maxIter; iter++) {
                // Assign labels
                for (let i = 0; i < n; i++) {
                    let minDist = Infinity;
                    for (let c = 0; c < k; c++) {
                        const dist = data[i].reduce((sum, v, d) => 
                            sum + (v - centroids[c][d]) ** 2, 0);
                        if (dist < minDist) {
                            minDist = dist;
                            labels[i] = c;
                        }
                    }
                }
                
                // Update centroids
                const newCentroids = Array(k).fill(0).map(() => Array(dim).fill(0));
                const counts = Array(k).fill(0);
                
                for (let i = 0; i < n; i++) {
                    const c = labels[i];
                    counts[c]++;
                    for (let d = 0; d < dim; d++) {
                        newCentroids[c][d] += data[i][d];
                    }
                }
                
                for (let c = 0; c < k; c++) {
                    if (counts[c] > 0) {
                        for (let d = 0; d < dim; d++) {
                            newCentroids[c][d] /= counts[c];
                        }
                    }
                }
                
                centroids = newCentroids;
            }
            
            return labels;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // HIERARCHICAL CLUSTERING
    // ─────────────────────────────────────────────────────────────────────────────────────────
    Hierarchical: {
        /**
         * Agglomerative hierarchical clustering
         * @param {Array} data - Array of data points
         * @param {number} k - Number of clusters (or null to return full dendrogram)
         * @param {string} linkage - 'single', 'complete', 'average'
         * @returns {Object} {labels, dendrogram}
         */
        cluster: function(data, k = null, linkage = 'average') {
            const n = data.length;
            
            // Initialize: each point is its own cluster
            let clusters = data.map((_, i) => [i]);
            const dendrogram = [];
            
            // Precompute distance matrix
            const distMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const d = Math.sqrt(data[i].reduce((sum, v, idx) => 
                        sum + (v - data[j][idx]) ** 2, 0));
                    distMatrix[i][j] = d;
                    distMatrix[j][i] = d;
                }
            }
            
            // Agglomerate
            while (clusters.length > 1) {
                // Find closest pair of clusters
                let minDist = Infinity;
                let merge_i = 0, merge_j = 1;
                
                for (let i = 0; i < clusters.length; i++) {
                    for (let j = i + 1; j < clusters.length; j++) {
                        const d = this._clusterDistance(clusters[i], clusters[j], distMatrix, linkage);
                        if (d < minDist) {
                            minDist = d;
                            merge_i = i;
                            merge_j = j;
                        }
                    }
                }
                
                // Merge clusters
                dendrogram.push({
                    merged: [clusters[merge_i], clusters[merge_j]],
                    distance: minDist,
                    newCluster: [...clusters[merge_i], ...clusters[merge_j]]
                });
                
                clusters[merge_i] = [...clusters[merge_i], ...clusters[merge_j]];
                clusters.splice(merge_j, 1);
                
                // Stop if we've reached desired number of clusters
                if (k !== null && clusters.length === k) break;
            }
            
            // Assign labels
            const labels = Array(n).fill(0);
            for (let c = 0; c < clusters.length; c++) {
                for (const i of clusters[c]) {
                    labels[i] = c;
                }
            }
            
            return { labels, dendrogram, numClusters: clusters.length };
        },
        
        _clusterDistance: function(c1, c2, distMatrix, linkage) {
            const distances = [];
            for (const i of c1) {
                for (const j of c2) {
                    distances.push(distMatrix[i][j]);
                }
            }
            
            switch (linkage) {
                case 'single':
                    return Math.min(...distances);
                case 'complete':
                    return Math.max(...distances);
                case 'average':
                default:
                    return distances.reduce((a, b) => a + b, 0) / distances.length;
            }
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────────────────────
    // MANUFACTURING CLUSTERING APPLICATIONS
    // ─────────────────────────────────────────────────────────────────────────────────────────
    Manufacturing: {
        /**
         * Cluster machining operations by similarity
         */
        clusterOperations: function(operations, k = 5) {
            // Extract features: [depth, width, length, material_hardness, tool_diameter]
            const features = operations.map(op => [
                op.depth || 0,
                op.width || 0,
                op.length || 0,
                op.materialHardness || 30,
                op.toolDiameter || 10
            ]);
            
            // Normalize features
            const normalized = this._normalizeFeatures(features);
            
            // Use K-Medoids for robustness
            return PRISM_CLUSTERING_COMPLETE.KMedoids.cluster(normalized, k);
        },
        
        /**
         * Cluster parts by geometric similarity
         */
        clusterParts: function(parts, k = 10) {
            // Extract features: [volume, surface_area, hole_count, pocket_count, complexity]
            const features = parts.map(part => [
                Math.log(part.volume + 1),
                Math.log(part.surfaceArea + 1),
                part.holeCount || 0,
                part.pocketCount || 0,
                part.complexity || 1
            ]);
            
            const normalized = this._normalizeFeatures(features);
            
            return PRISM_CLUSTERING_COMPLETE.SpectralClustering.cluster(normalized, k);
        },
        
        _normalizeFeatures: function(features) {
            const n = features.length;
            const dim = features[0].length;
            
            // Compute mean and std
            const means = Array(dim).fill(0);
            const stds = Array(dim).fill(0);
            
            for (let d = 0; d < dim; d++) {
                for (let i = 0; i < n; i++) {
                    means[d] += features[i][d];
                }
                means[d] /= n;
                
                for (let i = 0; i < n; i++) {
                    stds[d] += (features[i][d] - means[d]) ** 2;
                }
                stds[d] = Math.sqrt(stds[d] / n) || 1;
            }
            
            // Normalize
            return features.map(f => f.map((v, d) => (v - means[d]) / stds[d]));
        }
    }
};
