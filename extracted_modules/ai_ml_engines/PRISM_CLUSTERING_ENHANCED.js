const PRISM_CLUSTERING_ENHANCED = {
    name: 'PRISM Clustering Enhanced',
    version: '1.0.0',
    
    /**
     * DBSCAN: Density-Based Spatial Clustering
     * @param {Array} points - Array of n-dimensional points
     * @param {number} eps - Maximum distance between neighbors
     * @param {number} minPts - Minimum points to form cluster
     * @returns {Array} Cluster labels (-1 = noise, 0+ = cluster ID)
     */
    dbscan: function(points, eps, minPts) {
        const n = points.length;
        const labels = new Array(n).fill(-1); // -1 = unvisited
        let clusterId = 0;
        
        // Euclidean distance
        const distance = (p1, p2) => {
            return Math.sqrt(p1.reduce((sum, v, i) => sum + Math.pow(v - p2[i], 2), 0));
        };
        
        // Find all neighbors within eps
        const regionQuery = (pIdx) => {
            const neighbors = [];
            for (let i = 0; i < n; i++) {
                if (distance(points[pIdx], points[i]) <= eps) {
                    neighbors.push(i);
                }
            }
            return neighbors;
        };
        
        // Process each point
        for (let i = 0; i < n; i++) {
            if (labels[i] !== -1) continue; // Already processed
            
            const neighbors = regionQuery(i);
            
            if (neighbors.length < minPts) {
                labels[i] = 0; // Mark as noise
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
                    labels[q] = clusterId; // Change noise to border point
                }
                
                if (labels[q] !== -1) continue; // Already in a cluster
                
                labels[q] = clusterId;
                const qNeighbors = regionQuery(q);
                
                if (qNeighbors.length >= minPts) {
                    // Add new points to seeds
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
        
        // Distance matrix
        const dist = Array(n).fill(0).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const d = Math.sqrt(points[i].reduce((sum, v, idx) => 
                    sum + Math.pow(v - points[j][idx], 2), 0));
                dist[i][j] = d;
                dist[j][i] = d;
            }
        }
        
        // Initialize medoids randomly
        let medoids = [];
        const available = [...Array(n).keys()];
        for (let i = 0; i < k; i++) {
            const idx = Math.floor(Math.random() * available.length);
            medoids.push(available.splice(idx, 1)[0]);
        }
        
        let labels = this._assignToMedoids(dist, medoids);
        let totalCost = this._calculateCost(dist, labels, medoids);
        
        // Iteratively improve
        for (let iter = 0; iter < maxIter; iter++) {
            let improved = false;
            
            for (let i = 0; i < k; i++) {
                // Try swapping medoid i with each non-medoid
                for (let j = 0; j < n; j++) {
                    if (medoids.includes(j)) continue;
                    
                    const newMedoids = [...medoids];
                    newMedoids[i] = j;
                    
                    const newLabels = this._assignToMedoids(dist, newMedoids);
                    const newCost = this._calculateCost(dist, newLabels, newMedoids);
                    
                    if (newCost < totalCost) {
                        medoids = newMedoids;
                        labels = newLabels;
                        totalCost = newCost;
                        improved = true;
                    }
                }
            }
            
            if (!improved) break;
        }
        
        return { labels, medoids, cost: totalCost };
    },
    
    _assignToMedoids: function(dist, medoids) {
        const n = dist.length;
        return Array(n).fill(0).map((_, i) => {
            let minDist = Infinity;
            let label = 0;
            for (let m = 0; m < medoids.length; m++) {
                if (dist[i][medoids[m]] < minDist) {
                    minDist = dist[i][medoids[m]];
                    label = m;
                }
            }
            return label;
        });
    },
    
    _calculateCost: function(dist, labels, medoids) {
        let cost = 0;
        for (let i = 0; i < labels.length; i++) {
            cost += dist[i][medoids[labels[i]]];
        }
        return cost;
    },
    
    /**
     * t-SNE: t-Distributed Stochastic Neighbor Embedding
     * For visualization of high-dimensional data
     */
    tsne: function(X, params = {}) {
        const { dims = 2, perplexity = 30, maxIter = 500, learningRate = 100 } = params;
        const n = X.length;
        
        // Compute pairwise distances in high-D
        const D = this._pairwiseDistances(X);
        
        // Compute conditional probabilities P_j|i
        const P = this._computeP(D, perplexity);
        
        // Initialize low-D representation randomly
        let Y = Array(n).fill(0).map(() => 
            Array(dims).fill(0).map(() => (Math.random() - 0.5) * 0.0001)
        );
        
        let gains = Array(n).fill(0).map(() => Array(dims).fill(1));
        let momentum = Array(n).fill(0).map(() => Array(dims).fill(0));
        
        // Gradient descent
        for (let iter = 0; iter < maxIter; iter++) {
            // Compute Q probabilities (t-distribution)
            const Q = this._computeQ(Y);
            
            // Compute gradients
            const gradients = this._computeGradients(P, Q, Y);
            
            // Update with momentum
            const alpha = iter < 250 ? 0.5 : 0.8;
            
            for (let i = 0; i < n; i++) {
                for (let d = 0; d < dims; d++) {
                    // Adaptive learning rate
                    const sign = Math.sign(gradients[i][d]) === Math.sign(momentum[i][d]) ? -1 : 1;
                    gains[i][d] = Math.max(0.01, gains[i][d] + 0.2 * sign);
                    
                    momentum[i][d] = alpha * momentum[i][d] - learningRate * gains[i][d] * gradients[i][d];
                    Y[i][d] += momentum[i][d];
                }
            }
            
            // Center
            const center = Array(dims).fill(0);
            for (let i = 0; i < n; i++) {
                for (let d = 0; d < dims; d++) {
                    center[d] += Y[i][d];
                }
            }
            for (let i = 0; i < n; i++) {
                for (let d = 0; d < dims; d++) {
                    Y[i][d] -= center[d] / n;
                }
            }
        }
        
        return Y;
    },
    
    _pairwiseDistances: function(X) {
        const n = X.length;
        const D = Array(n).fill(0).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const d = Math.sqrt(X[i].reduce((sum, v, k) => sum + Math.pow(v - X[j][k], 2), 0));
                D[i][j] = d;
                D[j][i] = d;
            }
        }
        return D;
    },
    
    _computeP: function(D, perplexity, tol = 1e-5) {
        const n = D.length;
        const P = Array(n).fill(0).map(() => Array(n).fill(0));
        const targetEntropy = Math.log(perplexity);
        
        for (let i = 0; i < n; i++) {
            let betaMin = -Infinity, betaMax = Infinity;
            let beta = 1;
            
            // Binary search for sigma
            for (let iter = 0; iter < 50; iter++) {
                // Compute P_j|i
                let sumP = 0;
                for (let j = 0; j < n; j++) {
                    if (i === j) continue;
                    P[i][j] = Math.exp(-D[i][j] * D[i][j] * beta);
                    sumP += P[i][j];
                }
                
                // Normalize and compute entropy
                let H = 0;
                for (let j = 0; j < n; j++) {
                    if (i === j) continue;
                    P[i][j] /= sumP;
                    if (P[i][j] > 1e-10) {
                        H -= P[i][j] * Math.log(P[i][j]);
                    }
                }
                
                // Adjust beta
                const diff = H - targetEntropy;
                if (Math.abs(diff) < tol) break;
                
                if (diff > 0) {
                    betaMin = beta;
                    beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2;
                } else {
                    betaMax = beta;
                    beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2;
                }
            }
        }
        
        // Symmetrize
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const pij = (P[i][j] + P[j][i]) / (2 * n);
                P[i][j] = pij;
                P[j][i] = pij;
            }
        }
        
        return P;
    },
    
    _computeQ: function(Y) {
        const n = Y.length;
        const Q = Array(n).fill(0).map(() => Array(n).fill(0));
        let sumQ = 0;
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dist = Y[i].reduce((sum, v, k) => sum + Math.pow(v - Y[j][k], 2), 0);
                const q = 1 / (1 + dist); // t-distribution with df=1
                Q[i][j] = q;
                Q[j][i] = q;
                sumQ += 2 * q;
            }
        }
        
        // Normalize
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                Q[i][j] = Math.max(Q[i][j] / sumQ, 1e-12);
            }
        }
        
        return Q;
    },
    
    _computeGradients: function(P, Q, Y) {
        const n = Y.length;
        const dims = Y[0].length;
        const gradients = Array(n).fill(0).map(() => Array(dims).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                const dist = Y[i].reduce((sum, v, k) => sum + Math.pow(v - Y[j][k], 2), 0);
                const mult = 4 * (P[i][j] - Q[i][j]) / (1 + dist);
                
                for (let d = 0; d < dims; d++) {
                    gradients[i][d] += mult * (Y[i][d] - Y[j][d]);
                }
            }
        }
        
        return gradients;
    }
}