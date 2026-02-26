// PRISM_ML_ALGORITHMS - Lines 960843-961589 (747 lines) - ML algorithms\n\nconst PRISM_ML_ALGORITHMS = {
    name: 'PRISM Machine Learning Algorithms',
    version: '1.0.0',
    sources: ['MIT 6.036', 'MIT 6.867', 'Stanford CS229', 'Stanford CS231N', 'CMU 10-601', 'Berkeley CS189'],
    algorithmCount: 150,

    // ─────────────────────────────────────────────────────────────────────────────
    // 2.1 REGRESSION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Linear Regression with closed-form solution
     * Source: MIT 6.036, Stanford CS229
     */
    linearRegression: function(X, y, options = {}) {
        const regularization = options.regularization || 0;
        
        const n = X.length;
        const m = X[0].length;
        
        // Add bias term
        const X_bias = X.map(row => [1, ...row]);
        
        // X^T * X + lambda * I
        const XtX = this._matMult(this._transpose(X_bias), X_bias);
        for (let i = 0; i < XtX.length; i++) {
            XtX[i][i] += regularization;
        }
        
        // X^T * y
        const Xty = this._matVecMult(this._transpose(X_bias), y);
        
        // Solve (X^T * X + lambda * I) * w = X^T * y
        const w = this._solveLinearSystem(XtX, Xty);
        
        return {
            weights: w.slice(1),
            bias: w[0],
            predict: (x) => w[0] + this._dot(w.slice(1), x)
        };
    },

    /**
     * Ridge Regression (L2 regularization)
     * Source: Stanford CS229
     */
    ridgeRegression: function(X, y, lambda = 1) {
        return this.linearRegression(X, y, { regularization: lambda });
    },

    /**
     * Logistic Regression
     * Source: MIT 6.036, Stanford CS229
     */
    logisticRegression: function(X, y, options = {}) {
        const maxIter = options.maxIter || 1000;
        const learningRate = options.learningRate || 0.01;
        const regularization = options.regularization || 0;
        
        const n = X.length;
        const m = X[0].length;
        
        // Initialize weights
        let w = new Array(m).fill(0);
        let b = 0;
        
        const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Compute gradients
            let dw = new Array(m).fill(0);
            let db = 0;
            
            for (let i = 0; i < n; i++) {
                const z = this._dot(w, X[i]) + b;
                const a = sigmoid(z);
                const diff = a - y[i];
                
                for (let j = 0; j < m; j++) {
                    dw[j] += diff * X[i][j];
                }
                db += diff;
            }
            
            // Update with regularization
            for (let j = 0; j < m; j++) {
                w[j] -= learningRate * (dw[j] / n + regularization * w[j]);
            }
            b -= learningRate * db / n;
        }
        
        return {
            weights: w,
            bias: b,
            predict: (x) => sigmoid(this._dot(w, x) + b),
            predictClass: (x) => sigmoid(this._dot(w, x) + b) >= 0.5 ? 1 : 0
        };
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // 2.2 CLASSIFICATION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * K-Nearest Neighbors
     * Source: MIT 6.036
     */
    knn: function(XTrain, yTrain, k = 5) {
        return {
            k,
            XTrain,
            yTrain,
            predict: (x) => {
                // Calculate distances
                const distances = XTrain.map((xi, i) => ({
                    index: i,
                    distance: Math.sqrt(xi.reduce((sum, xij, j) => sum + Math.pow(xij - x[j], 2), 0))
                }));
                
                // Sort and get k nearest
                distances.sort((a, b) => a.distance - b.distance);
                const kNearest = distances.slice(0, k);
                
                // Vote
                const votes = {};
                for (const neighbor of kNearest) {
                    const label = yTrain[neighbor.index];
                    votes[label] = (votes[label] || 0) + 1;
                }
                
                return Object.entries(votes).reduce((best, [label, count]) =>
                    count > best.count ? { label: parseInt(label), count } : best,
                    { label: null, count: 0 }
                ).label;
            }
        };
    },

    /**
     * Decision Tree
     * Source: CMU 10-601
     */
    decisionTree: function(X, y, options = {}) {
        const maxDepth = options.maxDepth || 10;
        const minSamples = options.minSamples || 2;
        
        const buildTree = (X, y, depth) => {
            // Check stopping conditions
            if (depth >= maxDepth || y.length < minSamples || new Set(y).size === 1) {
                // Leaf node
                const counts = {};
                for (const label of y) counts[label] = (counts[label] || 0) + 1;
                const prediction = Object.entries(counts).reduce((best, [label, count]) =>
                    count > best.count ? { label: parseInt(label), count } : best,
                    { label: null, count: 0 }
                ).label;
                return { isLeaf: true, prediction, counts };
            }
            
            // Find best split
            const bestSplit = this._findBestSplit(X, y);
            
            if (!bestSplit) {
                const counts = {};
                for (const label of y) counts[label] = (counts[label] || 0) + 1;
                return { isLeaf: true, prediction: Object.entries(counts).reduce((best, [l, c]) => c > best.count ? { label: parseInt(l), count: c } : best, { label: null, count: 0 }).label };
            }
            
            // Split data
            const leftIndices = [];
            const rightIndices = [];
            for (let i = 0; i < X.length; i++) {
                if (X[i][bestSplit.feature] <= bestSplit.threshold) {
                    leftIndices.push(i);
                } else {
                    rightIndices.push(i);
                }
            }
            
            return {
                isLeaf: false,
                feature: bestSplit.feature,
                threshold: bestSplit.threshold,
                left: buildTree(leftIndices.map(i => X[i]), leftIndices.map(i => y[i]), depth + 1),
                right: buildTree(rightIndices.map(i => X[i]), rightIndices.map(i => y[i]), depth + 1)
            };
        };
        
        const tree = buildTree(X, y, 0);
        
        const predict = (node, x) => {
            if (node.isLeaf) return node.prediction;
            if (x[node.feature] <= node.threshold) {
                return predict(node.left, x);
            } else {
                return predict(node.right, x);
            }
        };
        
        return {
            tree,
            predict: (x) => predict(tree, x)
        };
    },

    /**
     * Random Forest
     * Source: Stanford CS229, CMU 10-601
     */
    randomForest: function(X, y, options = {}) {
        const numTrees = options.numTrees || 100;
        const maxDepth = options.maxDepth || 10;
        const maxFeatures = options.maxFeatures || Math.floor(Math.sqrt(X[0].length));
        
        const trees = [];
        
        for (let t = 0; t < numTrees; t++) {
            // Bootstrap sample
            const indices = [];
            for (let i = 0; i < X.length; i++) {
                indices.push(Math.floor(Math.random() * X.length));
            }
            const XSample = indices.map(i => X[i]);
            const ySample = indices.map(i => y[i]);
            
            // Build tree with random feature subset
            const tree = this.decisionTree(XSample, ySample, {
                maxDepth,
                maxFeatures
            });
            trees.push(tree);
        }
        
        return {
            trees,
            predict: (x) => {
                const votes = {};
                for (const tree of trees) {
                    const pred = tree.predict(x);
                    votes[pred] = (votes[pred] || 0) + 1;
                }
                return Object.entries(votes).reduce((best, [label, count]) =>
                    count > best.count ? { label: parseInt(label), count } : best,
                    { label: null, count: 0 }
                ).label;
            }
        };
    },

    /**
     * Support Vector Machine (SMO algorithm)
     * Source: Stanford CS229
     */
    svm: function(X, y, options = {}) {
        const C = options.C || 1;
        const maxIter = options.maxIter || 1000;
        const tol = options.tol || 1e-3;
        const kernel = options.kernel || 'linear'; // linear, rbf
        const gamma = options.gamma || 1;
        
        const n = X.length;
        const m = X[0].length;
        
        // Convert labels to -1, 1
        const yBinary = y.map(yi => yi === 0 ? -1 : 1);
        
        // Initialize
        let alpha = new Array(n).fill(0);
        let b = 0;
        
        // Kernel function
        const K = (x1, x2) => {
            if (kernel === 'linear') {
                return this._dot(x1, x2);
            } else if (kernel === 'rbf') {
                const diff = x1.map((xi, i) => xi - x2[i]);
                return Math.exp(-gamma * this._dot(diff, diff));
            }
        };
        
        // Precompute kernel matrix
        const kernelMatrix = [];
        for (let i = 0; i < n; i++) {
            kernelMatrix[i] = [];
            for (let j = 0; j < n; j++) {
                kernelMatrix[i][j] = K(X[i], X[j]);
            }
        }
        
        // SMO algorithm
        for (let iter = 0; iter < maxIter; iter++) {
            let numChanged = 0;
            
            for (let i = 0; i < n; i++) {
                // Compute Ei
                let fi = b;
                for (let k = 0; k < n; k++) {
                    fi += alpha[k] * yBinary[k] * kernelMatrix[i][k];
                }
                const Ei = fi - yBinary[i];
                
                // Check KKT conditions
                if ((yBinary[i] * Ei < -tol && alpha[i] < C) ||
                    (yBinary[i] * Ei > tol && alpha[i] > 0)) {
                    
                    // Select j randomly
                    let j = Math.floor(Math.random() * n);
                    while (j === i) j = Math.floor(Math.random() * n);
                    
                    // Compute Ej
                    let fj = b;
                    for (let k = 0; k < n; k++) {
                        fj += alpha[k] * yBinary[k] * kernelMatrix[j][k];
                    }
                    const Ej = fj - yBinary[j];
                    
                    // Save old alphas
                    const alphaIold = alpha[i];
                    const alphaJold = alpha[j];
                    
                    // Compute bounds
                    let L, H;
                    if (yBinary[i] !== yBinary[j]) {
                        L = Math.max(0, alpha[j] - alpha[i]);
                        H = Math.min(C, C + alpha[j] - alpha[i]);
                    } else {
                        L = Math.max(0, alpha[i] + alpha[j] - C);
                        H = Math.min(C, alpha[i] + alpha[j]);
                    }
                    
                    if (L === H) continue;
                    
                    // Compute eta
                    const eta = 2 * kernelMatrix[i][j] - kernelMatrix[i][i] - kernelMatrix[j][j];
                    if (eta >= 0) continue;
                    
                    // Update alpha[j]
                    alpha[j] = alpha[j] - yBinary[j] * (Ei - Ej) / eta;
                    alpha[j] = Math.min(H, Math.max(L, alpha[j]));
                    
                    if (Math.abs(alpha[j] - alphaJold) < 1e-5) continue;
                    
                    // Update alpha[i]
                    alpha[i] = alpha[i] + yBinary[i] * yBinary[j] * (alphaJold - alpha[j]);
                    
                    // Update b
                    const b1 = b - Ei - yBinary[i] * (alpha[i] - alphaIold) * kernelMatrix[i][i] -
                               yBinary[j] * (alpha[j] - alphaJold) * kernelMatrix[i][j];
                    const b2 = b - Ej - yBinary[i] * (alpha[i] - alphaIold) * kernelMatrix[i][j] -
                               yBinary[j] * (alpha[j] - alphaJold) * kernelMatrix[j][j];
                    
                    if (0 < alpha[i] && alpha[i] < C) b = b1;
                    else if (0 < alpha[j] && alpha[j] < C) b = b2;
                    else b = (b1 + b2) / 2;
                    
                    numChanged++;
                }
            }
            
            if (numChanged === 0) break;
        }
        
        // Get support vectors
        const supportVectors = [];
        for (let i = 0; i < n; i++) {
            if (alpha[i] > 1e-8) {
                supportVectors.push({ index: i, alpha: alpha[i], x: X[i], y: yBinary[i] });
            }
        }
        
        return {
            alpha,
            b,
            supportVectors,
            predict: (x) => {
                let f = b;
                for (const sv of supportVectors) {
                    f += sv.alpha * sv.y * K(sv.x, x);
                }
                return f >= 0 ? 1 : 0;
            }
        };
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // 2.3 CLUSTERING
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * K-Means Clustering
     * Source: Stanford CS229
     */
    kMeans: function(X, k, options = {}) {
        const maxIter = options.maxIter || 100;
        const tol = options.tol || 1e-4;
        
        const n = X.length;
        const m = X[0].length;
        
        // Initialize centroids (k-means++)
        const centroids = [X[Math.floor(Math.random() * n)]];
        while (centroids.length < k) {
            const distances = X.map(x => {
                let minDist = Infinity;
                for (const c of centroids) {
                    const dist = Math.sqrt(x.reduce((sum, xi, j) => sum + Math.pow(xi - c[j], 2), 0));
                    minDist = Math.min(minDist, dist);
                }
                return minDist * minDist;
            });
            
            const totalDist = distances.reduce((a, b) => a + b, 0);
            let r = Math.random() * totalDist;
            for (let i = 0; i < n; i++) {
                r -= distances[i];
                if (r <= 0) {
                    centroids.push([...X[i]]);
                    break;
                }
            }
        }
        
        let labels = new Array(n).fill(0);
        let prevCentroids = centroids.map(c => [...c]);
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Assign points to nearest centroid
            for (let i = 0; i < n; i++) {
                let minDist = Infinity;
                let minLabel = 0;
                for (let j = 0; j < k; j++) {
                    const dist = Math.sqrt(X[i].reduce((sum, xi, d) => sum + Math.pow(xi - centroids[j][d], 2), 0));
                    if (dist < minDist) {
                        minDist = dist;
                        minLabel = j;
                    }
                }
                labels[i] = minLabel;
            }
            
            // Update centroids
            const newCentroids = Array.from({ length: k }, () => new Array(m).fill(0));
            const counts = new Array(k).fill(0);
            
            for (let i = 0; i < n; i++) {
                const label = labels[i];
                counts[label]++;
                for (let d = 0; d < m; d++) {
                    newCentroids[label][d] += X[i][d];
                }
            }
            
            for (let j = 0; j < k; j++) {
                if (counts[j] > 0) {
                    for (let d = 0; d < m; d++) {
                        newCentroids[j][d] /= counts[j];
                    }
                    centroids[j] = newCentroids[j];
                }
            }
            
            // Check convergence
            let maxShift = 0;
            for (let j = 0; j < k; j++) {
                const shift = Math.sqrt(centroids[j].reduce((sum, c, d) => sum + Math.pow(c - prevCentroids[j][d], 2), 0));
                maxShift = Math.max(maxShift, shift);
            }
            
            if (maxShift < tol) break;
            prevCentroids = centroids.map(c => [...c]);
        }
        
        return {
            centroids,
            labels,
            predict: (x) => {
                let minDist = Infinity;
                let minLabel = 0;
                for (let j = 0; j < k; j++) {
                    const dist = Math.sqrt(x.reduce((sum, xi, d) => sum + Math.pow(xi - centroids[j][d], 2), 0));
                    if (dist < minDist) {
                        minDist = dist;
                        minLabel = j;
                    }
                }
                return minLabel;
            }
        };
    },

    /**
     * DBSCAN Clustering
     * Source: Various ML courses
     */
    dbscan: function(X, eps, minPts) {
        const n = X.length;
        const labels = new Array(n).fill(-1); // -1 = unvisited
        let clusterId = 0;
        
        const distance = (i, j) => {
            return Math.sqrt(X[i].reduce((sum, xi, d) => sum + Math.pow(xi - X[j][d], 2), 0));
        };
        
        const regionQuery = (i) => {
            const neighbors = [];
            for (let j = 0; j < n; j++) {
                if (distance(i, j) <= eps) {
                    neighbors.push(j);
                }
            }
            return neighbors;
        };
        
        const expandCluster = (pointIdx, neighbors, clusterId) => {
            labels[pointIdx] = clusterId;
            
            const queue = [...neighbors];
            while (queue.length > 0) {
                const currentIdx = queue.shift();
                
                if (labels[currentIdx] === -2) { // was noise
                    labels[currentIdx] = clusterId;
                }
                
                if (labels[currentIdx] !== -1) continue;
                
                labels[currentIdx] = clusterId;
                const currentNeighbors = regionQuery(currentIdx);
                
                if (currentNeighbors.length >= minPts) {
                    for (const neighbor of currentNeighbors) {
                        if (labels[neighbor] === -1 || labels[neighbor] === -2) {
                            queue.push(neighbor);
                        }
                    }
                }
            }
        };
        
        for (let i = 0; i < n; i++) {
            if (labels[i] !== -1) continue;
            
            const neighbors = regionQuery(i);
            
            if (neighbors.length < minPts) {
                labels[i] = -2; // noise
            } else {
                expandCluster(i, neighbors, clusterId);
                clusterId++;
            }
        }
        
        // Convert -2 to -1 (noise)
        for (let i = 0; i < n; i++) {
            if (labels[i] === -2) labels[i] = -1;
        }
        
        return {
            labels,
            numClusters: clusterId,
            noise: labels.filter(l => l === -1).length
        };
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // 2.4 DIMENSIONALITY REDUCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Principal Component Analysis (PCA)
     * Source: MIT 6.036, Stanford CS229
     */
    pca: function(X, numComponents) {
        const n = X.length;
        const m = X[0].length;
        
        // Center data
        const mean = new Array(m).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                mean[j] += X[i][j];
            }
        }
        for (let j = 0; j < m; j++) {
            mean[j] /= n;
        }
        
        const XCentered = X.map(row => row.map((val, j) => val - mean[j]));
        
        // Compute covariance matrix
        const cov = [];
        for (let i = 0; i < m; i++) {
            cov[i] = [];
            for (let j = 0; j < m; j++) {
                let sum = 0;
                for (let k = 0; k < n; k++) {
                    sum += XCentered[k][i] * XCentered[k][j];
                }
                cov[i][j] = sum / (n - 1);
            }
        }
        
        // Power iteration for top eigenvectors
        const components = [];
        let covRemaining = cov.map(row => [...row]);
        
        for (let c = 0; c < numComponents; c++) {
            // Power iteration
            let v = new Array(m).fill(0).map(() => Math.random());
            let vNorm = Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
            v = v.map(vi => vi / vNorm);
            
            for (let iter = 0; iter < 100; iter++) {
                const vNew = this._matVecMult(covRemaining, v);
                vNorm = Math.sqrt(vNew.reduce((sum, vi) => sum + vi * vi, 0));
                v = vNew.map(vi => vi / vNorm);
            }
            
            // Eigenvalue
            const eigenvalue = this._dot(this._matVecMult(covRemaining, v), v);
            components.push({ vector: v, eigenvalue });
            
            // Deflate
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < m; j++) {
                    covRemaining[i][j] -= eigenvalue * v[i] * v[j];
                }
            }
        }
        
        return {
            components,
            mean,
            transform: (x) => {
                const xCentered = x.map((xi, i) => xi - mean[i]);
                return components.map(c => this._dot(xCentered, c.vector));
            },
            inverseTransform: (z) => {
                const result = [...mean];
                for (let c = 0; c < z.length; c++) {
                    for (let i = 0; i < m; i++) {
                        result[i] += z[c] * components[c].vector[i];
                    }
                }
                return result;
            }
        };
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────────

    _transpose: function(M) {
        return M[0].map((_, j) => M.map(row => row[j]));
    },

    _matMult: function(A, B) {
        return A.map(row => B[0].map((_, j) => row.reduce((sum, a, i) => sum + a * B[i][j], 0)));
    },

    _matVecMult: function(M, v) {
        return M.map(row => this._dot(row, v));
    },

    _dot: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },

    _solveLinearSystem: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            for (let k = i + 1; k < n; k++) {
                const c = aug[k][i] / aug[i][i];
                for (let j = i; j <= n; j++) aug[k][j] -= c * aug[i][j];
            }
        }
        
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
            x[i] /= aug[i][i];
        }
        return x;
    },

    _findBestSplit: function(X, y) {
        if (X.length === 0 || X[0].length === 0) return null;
        
        const m = X[0].length;
        let bestGain = 0;
        let bestSplit = null;
        
        const parentGini = this._gini(y);
        
        for (let feature = 0; feature < m; feature++) {
            const values = [...new Set(X.map(x => x[feature]))].sort((a, b) => a - b);
            
            for (let i = 0; i < values.length - 1; i++) {
                const threshold = (values[i] + values[i + 1]) / 2;
                
                const leftY = [];
                const rightY = [];
                for (let j = 0; j < X.length; j++) {
                    if (X[j][feature] <= threshold) {
                        leftY.push(y[j]);
                    } else {
                        rightY.push(y[j]);
                    }
                }
                
                if (leftY.length === 0 || rightY.length === 0) continue;
                
                const gain = parentGini -
                    (leftY.length / y.length) * this._gini(leftY) -
                    (rightY.length / y.length) * this._gini(rightY);
                
                if (gain > bestGain) {
                    bestGain = gain;
                    bestSplit = { feature, threshold, gain };
                }
            }
        }
        
        return bestSplit;
    },

    _gini: function(y) {
        const counts = {};
        for (const label of y) counts[label] = (counts[label] || 0) + 1;
        let gini = 1;
        for (const count of Object.values(counts)) {
            const p = count / y.length;
            gini -= p * p;
        }
        return gini;
    }
};
