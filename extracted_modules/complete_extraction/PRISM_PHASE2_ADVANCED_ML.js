const PRISM_PHASE2_ADVANCED_ML = {
    name: 'Phase 2 Advanced Machine Learning',
    version: '1.0.0',
    source: 'Stanford CS229, MIT 6.036, Berkeley CS189',
    
    /**
     * Support Vector Machine (SVM) using SMO algorithm
     * Source: Stanford CS229
     */
    svm: function(X, y, options = {}) {
        const config = {
            C: options.C || 1.0,           // Regularization
            tol: options.tol || 1e-3,
            maxPasses: options.maxPasses || 100,
            kernel: options.kernel || 'linear'
        };
        
        const n = X.length;
        const m = X[0].length;
        
        // Initialize
        const alpha = new Array(n).fill(0);
        let b = 0;
        let passes = 0;
        
        // Kernel function
        const kernel = (x1, x2) => {
            if (config.kernel === 'linear') {
                return x1.reduce((sum, v, i) => sum + v * x2[i], 0);
            } else if (config.kernel === 'rbf') {
                const gamma = options.gamma || 0.1;
                const diff = x1.reduce((sum, v, i) => sum + Math.pow(v - x2[i], 2), 0);
                return Math.exp(-gamma * diff);
            }
            return x1.reduce((sum, v, i) => sum + v * x2[i], 0);
        };
        
        // SMO algorithm
        while (passes < config.maxPasses) {
            let numChangedAlphas = 0;
            
            for (let i = 0; i < n; i++) {
                // Calculate Ei
                let fi = b;
                for (let j = 0; j < n; j++) {
                    fi += alpha[j] * y[j] * kernel(X[j], X[i]);
                }
                const Ei = fi - y[i];
                
                if ((y[i] * Ei < -config.tol && alpha[i] < config.C) ||
                    (y[i] * Ei > config.tol && alpha[i] > 0)) {
                    
                    // Select j randomly
                    let j = Math.floor(Math.random() * n);
                    while (j === i) j = Math.floor(Math.random() * n);
                    
                    // Calculate Ej
                    let fj = b;
                    for (let k = 0; k < n; k++) {
                        fj += alpha[k] * y[k] * kernel(X[k], X[j]);
                    }
                    const Ej = fj - y[j];
                    
                    const alphaIOld = alpha[i];
                    const alphaJOld = alpha[j];
                    
                    // Compute L and H
                    let L, H;
                    if (y[i] !== y[j]) {
                        L = Math.max(0, alpha[j] - alpha[i]);
                        H = Math.min(config.C, config.C + alpha[j] - alpha[i]);
                    } else {
                        L = Math.max(0, alpha[i] + alpha[j] - config.C);
                        H = Math.min(config.C, alpha[i] + alpha[j]);
                    }
                    
                    if (L === H) continue;
                    
                    // Compute eta
                    const eta = 2 * kernel(X[i], X[j]) - kernel(X[i], X[i]) - kernel(X[j], X[j]);
                    if (eta >= 0) continue;
                    
                    // Update alpha[j]
                    alpha[j] = alpha[j] - (y[j] * (Ei - Ej)) / eta;
                    alpha[j] = Math.max(L, Math.min(H, alpha[j]));
                    
                    if (Math.abs(alpha[j] - alphaJOld) < 1e-5) continue;
                    
                    // Update alpha[i]
                    alpha[i] = alpha[i] + y[i] * y[j] * (alphaJOld - alpha[j]);
                    
                    // Compute b
                    const b1 = b - Ei - y[i] * (alpha[i] - alphaIOld) * kernel(X[i], X[i])
                        - y[j] * (alpha[j] - alphaJOld) * kernel(X[i], X[j]);
                    const b2 = b - Ej - y[i] * (alpha[i] - alphaIOld) * kernel(X[i], X[j])
                        - y[j] * (alpha[j] - alphaJOld) * kernel(X[j], X[j]);
                    
                    if (0 < alpha[i] && alpha[i] < config.C) {
                        b = b1;
                    } else if (0 < alpha[j] && alpha[j] < config.C) {
                        b = b2;
                    } else {
                        b = (b1 + b2) / 2;
                    }
                    
                    numChangedAlphas++;
                }
            }
            
            if (numChangedAlphas === 0) {
                passes++;
            } else {
                passes = 0;
            }
        }
        
        // Extract support vectors
        const supportVectors = [];
        for (let i = 0; i < n; i++) {
            if (alpha[i] > 1e-5) {
                supportVectors.push({ index: i, alpha: alpha[i], x: X[i], y: y[i] });
            }
        }
        
        return {
            alpha,
            b,
            supportVectors,
            kernel: config.kernel,
            predict: (xNew) => {
                let sum = b;
                for (const sv of supportVectors) {
                    sum += sv.alpha * sv.y * kernel(sv.x, xNew);
                }
                return sum >= 0 ? 1 : -1;
            },
            source: 'Stanford CS229 - SVM (SMO)'
        };
    },
    
    /**
     * SVM Classify helper
     */
    svmClassify: function(model, X) {
        return X.map(x => model.predict(x));
    },
    
    /**
     * DBSCAN Clustering
     * Source: Various - Density-based clustering
     */
    dbscan: function(X, eps, minPts) {
        const n = X.length;
        const labels = new Array(n).fill(-1); // -1 = unvisited
        let clusterId = 0;
        
        const distance = (a, b) => {
            return Math.sqrt(a.reduce((sum, v, i) => sum + Math.pow(v - b[i], 2), 0));
        };
        
        const regionQuery = (idx) => {
            const neighbors = [];
            for (let i = 0; i < n; i++) {
                if (distance(X[idx], X[i]) <= eps) {
                    neighbors.push(i);
                }
            }
            return neighbors;
        };
        
        const expandCluster = (idx, neighbors, clusterId) => {
            labels[idx] = clusterId;
            const queue = [...neighbors];
            
            while (queue.length > 0) {
                const currentIdx = queue.shift();
                
                if (labels[currentIdx] === -2) { // Noise becomes border point
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
                labels[i] = -2; // Noise
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
            noise: labels.filter(l => l === -1).length,
            source: 'DBSCAN Clustering'
        };
    },
    
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
        
        // Power iteration for eigenvectors (simplified)
        const components = [];
        let covCopy = cov.map(row => [...row]);
        
        for (let comp = 0; comp < Math.min(numComponents, m); comp++) {
            // Power iteration
            let v = new Array(m).fill(0).map(() => Math.random());
            let vNorm = Math.sqrt(v.reduce((s, x) => s + x*x, 0));
            v = v.map(x => x / vNorm);
            
            for (let iter = 0; iter < 100; iter++) {
                // v = Cv
                const vNew = new Array(m).fill(0);
                for (let i = 0; i < m; i++) {
                    for (let j = 0; j < m; j++) {
                        vNew[i] += covCopy[i][j] * v[j];
                    }
                }
                
                vNorm = Math.sqrt(vNew.reduce((s, x) => s + x*x, 0));
                if (vNorm < 1e-10) break;
                
                v = vNew.map(x => x / vNorm);
            }
            
            // Eigenvalue
            let eigenvalue = 0;
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < m; j++) {
                    eigenvalue += covCopy[i][j] * v[i] * v[j];
                }
            }
            
            components.push({ vector: v, eigenvalue });
            
            // Deflate
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < m; j++) {
                    covCopy[i][j] -= eigenvalue * v[i] * v[j];
                }
            }
        }
        
        // Calculate explained variance
        const totalVar = components.reduce((s, c) => s + c.eigenvalue, 0);
        const explainedVariance = components.map(c => c.eigenvalue / totalVar);
        
        return {
            components: components.map(c => c.vector),
            eigenvalues: components.map(c => c.eigenvalue),
            explainedVariance,
            mean,
            transform: (xNew) => {
                const centered = xNew.map((v, i) => v - mean[i]);
                return components.map(c => 
                    c.vector.reduce((sum, v, i) => sum + v * centered[i], 0)
                );
            },
            source: 'MIT 6.036 - PCA'
        };
    },
    
    /**
     * PCA Transform helper
     */
    pcaTransform: function(model, X) {
        return X.map(x => model.transform(x));
    },
    
    /**
     * Logistic Regression
     * Source: Stanford CS229
     */
    logisticRegression: function(X, y, options = {}) {
        const config = {
            learningRate: options.learningRate || 0.1,
            maxIter: options.maxIter || 1000,
            tol: options.tol || 1e-6
        };
        
        const n = X.length;
        const m = X[0].length;
        
        // Add bias term
        const Xb = X.map(row => [1, ...row]);
        const w = new Array(m + 1).fill(0);
        
        const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
        
        for (let iter = 0; iter < config.maxIter; iter++) {
            const grad = new Array(m + 1).fill(0);
            
            for (let i = 0; i < n; i++) {
                const z = Xb[i].reduce((sum, x, j) => sum + w[j] * x, 0);
                const h = sigmoid(z);
                const error = h - y[i];
                
                for (let j = 0; j <= m; j++) {
                    grad[j] += error * Xb[i][j];
                }
            }
            
            // Update weights
            let gradNorm = 0;
            for (let j = 0; j <= m; j++) {
                grad[j] /= n;
                w[j] -= config.learningRate * grad[j];
                gradNorm += grad[j] * grad[j];
            }
            
            if (Math.sqrt(gradNorm) < config.tol) break;
        }
        
        return {
            weights: w,
            predict: (xNew) => {
                const xb = [1, ...xNew];
                const z = xb.reduce((sum, x, j) => sum + w[j] * x, 0);
                return sigmoid(z);
            },
            classify: (xNew) => {
                const xb = [1, ...xNew];
                const z = xb.reduce((sum, x, j) => sum + w[j] * x, 0);
                return sigmoid(z) >= 0.5 ? 1 : 0;
            },
            source: 'Stanford CS229 - Logistic Regression'
        };
    },
    
    /**
     * K-Nearest Neighbors
     * Source: Stanford CS229
     */
    knn: function(X, y, k = 5) {
        return {
            X,
            y,
            k,
            predict: function(xNew) {
                const distances = X.map((x, i) => ({
                    distance: Math.sqrt(x.reduce((sum, v, j) => sum + Math.pow(v - xNew[j], 2), 0)),
                    label: y[i]
                }));
                
                distances.sort((a, b) => a.distance - b.distance);
                const neighbors = distances.slice(0, k);
                
                // Vote
                const votes = {};
                for (const n of neighbors) {
                    votes[n.label] = (votes[n.label] || 0) + 1;
                }
                
                let maxVotes = 0;
                let prediction = neighbors[0].label;
                for (const [label, count] of Object.entries(votes)) {
                    if (count > maxVotes) {
                        maxVotes = count;
                        prediction = parseInt(label);
                    }
                }
                
                return prediction;
            },
            source: 'Stanford CS229 - KNN'
        };
    },
    
    /**
     * Decision Tree
     * Source: Stanford CS229
     */
    decisionTree: function(X, y, options = {}) {
        const config = {
            maxDepth: options.maxDepth || 10,
            minSamplesLeaf: options.minSamplesLeaf || 2
        };
        
        const buildTree = (X, y, depth) => {
            if (depth >= config.maxDepth || X.length <= config.minSamplesLeaf) {
                // Leaf node - majority vote
                const counts = {};
                for (const label of y) {
                    counts[label] = (counts[label] || 0) + 1;
                }
                let maxCount = 0;
                let prediction = y[0];
                for (const [label, count] of Object.entries(counts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        prediction = parseInt(label);
                    }
                }
                return { isLeaf: true, prediction };
            }
            
            // Find best split
            const m = X[0].length;
            let bestGain = -Infinity;
            let bestFeature = 0;
            let bestThreshold = 0;
            
            const entropy = (labels) => {
                const counts = {};
                for (const l of labels) counts[l] = (counts[l] || 0) + 1;
                let e = 0;
                for (const count of Object.values(counts)) {
                    const p = count / labels.length;
                    if (p > 0) e -= p * Math.log2(p);
                }
                return e;
            };
            
            const parentEntropy = entropy(y);
            
            for (let f = 0; f < m; f++) {
                const values = [...new Set(X.map(x => x[f]))].sort((a, b) => a - b);
                
                for (let i = 0; i < values.length - 1; i++) {
                    const threshold = (values[i] + values[i + 1]) / 2;
                    
                    const leftIdx = X.map((x, idx) => x[f] <= threshold ? idx : -1).filter(i => i >= 0);
                    const rightIdx = X.map((x, idx) => x[f] > threshold ? idx : -1).filter(i => i >= 0);
                    
                    if (leftIdx.length < config.minSamplesLeaf || rightIdx.length < config.minSamplesLeaf) continue;
                    
                    const leftY = leftIdx.map(i => y[i]);
                    const rightY = rightIdx.map(i => y[i]);
                    
                    const gain = parentEntropy - 
                        (leftY.length / y.length) * entropy(leftY) - 
                        (rightY.length / y.length) * entropy(rightY);
                    
                    if (gain > bestGain) {
                        bestGain = gain;
                        bestFeature = f;
                        bestThreshold = threshold;
                    }
                }
            }
            
            if (bestGain <= 0) {
                const counts = {};
                for (const label of y) counts[label] = (counts[label] || 0) + 1;
                let maxCount = 0;
                let prediction = y[0];
                for (const [label, count] of Object.entries(counts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        prediction = parseInt(label);
                    }
                }
                return { isLeaf: true, prediction };
            }
            
            const leftIdx = X.map((x, idx) => x[bestFeature] <= bestThreshold ? idx : -1).filter(i => i >= 0);
            const rightIdx = X.map((x, idx) => x[bestFeature] > bestThreshold ? idx : -1).filter(i => i >= 0);
            
            return {
                isLeaf: false,
                feature: bestFeature,
                threshold: bestThreshold,
                left: buildTree(leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), depth + 1),
                right: buildTree(rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), depth + 1)
            };
        };
        
        const tree = buildTree(X, y, 0);
        
        const predictOne = (node, x) => {
            if (node.isLeaf) return node.prediction;
            if (x[node.feature] <= node.threshold) {
                return predictOne(node.left, x);
            } else {
                return predictOne(node.right, x);
            }
        };
        
        return {
            tree,
            predict: (xNew) => predictOne(tree, xNew),
            source: 'Stanford CS229 - Decision Tree'
        };
    },
    
    /**
     * Gradient Boosting
     * Source: Stanford CS229
     */
    gradientBoosting: function(X, y, options = {}) {
        const config = {
            numTrees: options.numTrees || 50,
            learningRate: options.learningRate || 0.1,
            maxDepth: options.maxDepth || 3
        };
        
        const n = X.length;
        const trees = [];
        let predictions = new Array(n).fill(0);
        
        // Initial prediction (mean for regression)
        const mean = y.reduce((a, b) => a + b, 0) / n;
        predictions = predictions.map(() => mean);
        
        for (let t = 0; t < config.numTrees; t++) {
            // Calculate residuals
            const residuals = y.map((yi, i) => yi - predictions[i]);
            
            // Fit tree to residuals
            const tree = this.decisionTree(X, residuals.map(r => r > 0 ? 1 : 0), { maxDepth: config.maxDepth });
            
            // Store tree with residuals for regression
            trees.push({
                tree: tree.tree,
                predict: (x) => {
                    const pred = tree.predict(x);
                    return pred === 1 ? config.learningRate : -config.learningRate;
                }
            });
            
            // Update predictions
            for (let i = 0; i < n; i++) {
                predictions[i] += trees[t].predict(X[i]);
            }
        }
        
        return {
            trees,
            initialPrediction: mean,
            predict: (xNew) => {
                let pred = mean;
                for (const tree of trees) {
                    pred += tree.predict(xNew);
                }
                return pred;
            },
            source: 'Stanford CS229 - Gradient Boosting'
        };
    },
    
    /**
     * AdaBoost
     * Source: Stanford CS229
     */
    adaBoost: function(X, y, options = {}) {
        const config = {
            numEstimators: options.numEstimators || 50
        };
        
        const n = X.length;
        let weights = new Array(n).fill(1 / n);
        const estimators = [];
        
        for (let t = 0; t < config.numEstimators; t++) {
            // Train weak learner (decision stump)
            const stump = this._trainStump(X, y, weights);
            
            // Calculate error
            let error = 0;
            for (let i = 0; i < n; i++) {
                if (stump.predict(X[i]) !== y[i]) {
                    error += weights[i];
                }
            }
            
            if (error >= 0.5) break;
            
            // Calculate alpha
            const alpha = 0.5 * Math.log((1 - error) / (error + 1e-10));
            
            estimators.push({ stump, alpha });
            
            // Update weights
            let sumWeights = 0;
            for (let i = 0; i < n; i++) {
                const prediction = stump.predict(X[i]);
                weights[i] *= Math.exp(-alpha * y[i] * prediction);
                sumWeights += weights[i];
            }
            
            // Normalize
            weights = weights.map(w => w / sumWeights);
        }
        
        return {
            estimators,
            predict: (xNew) => {
                let sum = 0;
                for (const { stump, alpha } of estimators) {
                    sum += alpha * stump.predict(xNew);
                }
                return sum >= 0 ? 1 : -1;
            },
            source: 'Stanford CS229 - AdaBoost'
        };
    },
    
    _trainStump: function(X, y, weights) {
        const n = X.length;
        const m = X[0].length;
        
        let bestError = Infinity;
        let bestFeature = 0;
        let bestThreshold = 0;
        let bestPolarity = 1;
        
        for (let f = 0; f < m; f++) {
            const values = [...new Set(X.map(x => x[f]))].sort((a, b) => a - b);
            
            for (let i = 0; i < values.length; i++) {
                const threshold = values[i];
                
                for (const polarity of [1, -1]) {
                    let error = 0;
                    for (let j = 0; j < n; j++) {
                        const pred = polarity * (X[j][f] <= threshold ? 1 : -1);
                        if (pred !== y[j]) {
                            error += weights[j];
                        }
                    }
                    
                    if (error < bestError) {
                        bestError = error;
                        bestFeature = f;
                        bestThreshold = threshold;
                        bestPolarity = polarity;
                    }
                }
            }
        }
        
        return {
            feature: bestFeature,
            threshold: bestThreshold,
            polarity: bestPolarity,
            predict: (x) => bestPolarity * (x[bestFeature] <= bestThreshold ? 1 : -1)
        };
    },
    
    /**
     * Naive Bayes
     * Source: Stanford CS229
     */
    naiveBayes: function(X, y) {
        const n = X.length;
        const m = X[0].length;
        
        // Get unique classes
        const classes = [...new Set(y)];
        
        // Calculate priors and likelihoods
        const priors = {};
        const means = {};
        const variances = {};
        
        for (const c of classes) {
            const classData = X.filter((_, i) => y[i] === c);
            priors[c] = classData.length / n;
            
            means[c] = new Array(m).fill(0);
            variances[c] = new Array(m).fill(0);
            
            for (const x of classData) {
                for (let j = 0; j < m; j++) {
                    means[c][j] += x[j];
                }
            }
            for (let j = 0; j < m; j++) {
                means[c][j] /= classData.length;
            }
            
            for (const x of classData) {
                for (let j = 0; j < m; j++) {
                    variances[c][j] += Math.pow(x[j] - means[c][j], 2);
                }
            }
            for (let j = 0; j < m; j++) {
                variances[c][j] = variances[c][j] / classData.length + 1e-6;
            }
        }
        
        const gaussianPdf = (x, mean, variance) => {
            return Math.exp(-Math.pow(x - mean, 2) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance);
        };
        
        return {
            classes,
            priors,
            means,
            variances,
            predict: (xNew) => {
                let bestClass = classes[0];
                let bestProb = -Infinity;
                
                for (const c of classes) {
                    let logProb = Math.log(priors[c]);
                    
                    for (let j = 0; j < m; j++) {
                        logProb += Math.log(gaussianPdf(xNew[j], means[c][j], variances[c][j]) + 1e-10);
                    }
                    
                    if (logProb > bestProb) {
                        bestProb = logProb;
                        bestClass = c;
                    }
                }
                
                return bestClass;
            },
            source: 'Stanford CS229 - Naive Bayes'
        };
    }
}