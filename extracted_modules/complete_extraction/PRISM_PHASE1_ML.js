const PRISM_PHASE1_ML = {
    name: 'Phase 1 Machine Learning Algorithms',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS229',
    
    /**
     * Linear Regression Prediction
     * Source: MIT 6.036 - Introduction to Machine Learning
     */
    linearPredict: function(X, y, xNew) {
        // Fit linear regression using normal equations: w = (X'X)^-1 X'y
        const n = X.length;
        const m = X[0].length;
        
        // Add bias column
        const Xb = X.map(row => [1, ...row]);
        const xNewB = [1, ...xNew];
        
        // X'X
        const XtX = this._matrixMultiply(this._transpose(Xb), Xb);
        
        // (X'X)^-1
        const XtXInv = this._matrixInverse(XtX);
        
        // X'y
        const Xty = this._matrixVectorMultiply(this._transpose(Xb), y);
        
        // w = (X'X)^-1 X'y
        const w = this._matrixVectorMultiply(XtXInv, Xty);
        
        // Predict
        const prediction = xNewB.reduce((sum, xi, i) => sum + xi * w[i], 0);
        
        return {
            prediction,
            weights: w,
            source: 'MIT 6.036 - Linear Regression'
        };
    },
    
    /**
     * Ridge Regression with regularization
     * Source: MIT 6.036
     */
    ridgePredict: function(X, y, xNew, lambda = 0.1) {
        const n = X.length;
        const m = X[0].length;
        
        const Xb = X.map(row => [1, ...row]);
        const xNewB = [1, ...xNew];
        
        const XtX = this._matrixMultiply(this._transpose(Xb), Xb);
        
        // Add regularization: (X'X + λI)
        for (let i = 0; i < XtX.length; i++) {
            XtX[i][i] += lambda;
        }
        
        const XtXInv = this._matrixInverse(XtX);
        const Xty = this._matrixVectorMultiply(this._transpose(Xb), y);
        const w = this._matrixVectorMultiply(XtXInv, Xty);
        
        const prediction = xNewB.reduce((sum, xi, i) => sum + xi * w[i], 0);
        
        return {
            prediction,
            weights: w,
            lambda,
            source: 'MIT 6.036 - Ridge Regression'
        };
    },
    
    /**
     * Random Forest Prediction
     * Source: Stanford CS229 - Machine Learning
     */
    randomForestPredict: function(X, y, xNew, options = {}) {
        const config = {
            numTrees: options.numTrees || 10,
            maxDepth: options.maxDepth || 5,
            minSamplesLeaf: options.minSamplesLeaf || 2,
            featureSampleRatio: options.featureSampleRatio || 0.7
        };
        
        const trees = [];
        const n = X.length;
        const m = X[0].length;
        
        // Build ensemble of decision trees
        for (let t = 0; t < config.numTrees; t++) {
            // Bootstrap sampling
            const indices = [];
            for (let i = 0; i < n; i++) {
                indices.push(Math.floor(Math.random() * n));
            }
            
            const Xboot = indices.map(i => X[i]);
            const yboot = indices.map(i => y[i]);
            
            // Feature subsampling
            const numFeatures = Math.ceil(m * config.featureSampleRatio);
            const features = this._sampleWithoutReplacement(m, numFeatures);
            
            // Build tree
            const tree = this._buildDecisionTree(Xboot, yboot, features, config.maxDepth, config.minSamplesLeaf);
            trees.push({ tree, features });
        }
        
        // Predict with ensemble
        const predictions = trees.map(({ tree, features }) => {
            const xFiltered = features.map(f => xNew[f]);
            return this._predictTree(tree, xFiltered, features);
        });
        
        // Average predictions (regression)
        const prediction = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
        
        // Calculate variance for confidence
        const variance = predictions.reduce((sum, p) => sum + Math.pow(p - prediction, 2), 0) / predictions.length;
        const confidence = Math.max(0, 1 - Math.sqrt(variance) / Math.abs(prediction || 1));
        
        return {
            prediction,
            confidence,
            numTrees: config.numTrees,
            variance,
            source: 'Stanford CS229 - Random Forest'
        };
    },
    
    /**
     * Random Forest for Tool Life Prediction
     * Specialized for manufacturing
     */
    forestToolLifePredict: function(params) {
        const { speed, feed, doc, material, tool, historicalData } = params;
        
        // If no historical data, use physics-based estimate
        if (!historicalData || historicalData.length < 5) {
            const n = material?.taylorN || 0.25;
            const C = material?.taylorC || 300;
            const baseLife = Math.pow(C / speed, 1 / n);
            
            // Adjust for feed and DOC
            const feedFactor = Math.pow(0.1 / feed, 0.2);
            const docFactor = Math.pow(1 / doc, 0.1);
            
            return {
                prediction: baseLife * feedFactor * docFactor,
                confidence: 0.6,
                method: 'physics_fallback',
                source: 'MIT 2.008 - Taylor Equation'
            };
        }
        
        // Build training data
        const X = historicalData.map(d => [d.speed, d.feed, d.doc]);
        const y = historicalData.map(d => d.toolLife);
        const xNew = [speed, feed, doc];
        
        return this.randomForestPredict(X, y, xNew, { numTrees: 15 });
    },
    
    /**
     * K-Means Clustering
     * Source: Stanford CS229
     */
    kmeansCluster: function(data, k, options = {}) {
        const config = {
            maxIter: options.maxIter || 100,
            tol: options.tol || 1e-6
        };
        
        const n = data.length;
        const m = data[0].length;
        
        // Initialize centroids randomly
        const centroids = [];
        const indices = this._sampleWithoutReplacement(n, k);
        for (const idx of indices) {
            centroids.push([...data[idx]]);
        }
        
        let assignments = new Array(n).fill(0);
        let prevCost = Infinity;
        
        for (let iter = 0; iter < config.maxIter; iter++) {
            // Assign points to nearest centroid
            for (let i = 0; i < n; i++) {
                let minDist = Infinity;
                for (let j = 0; j < k; j++) {
                    const dist = this._euclideanDistance(data[i], centroids[j]);
                    if (dist < minDist) {
                        minDist = dist;
                        assignments[i] = j;
                    }
                }
            }
            
            // Update centroids
            const newCentroids = [];
            for (let j = 0; j < k; j++) {
                const clusterPoints = data.filter((_, i) => assignments[i] === j);
                if (clusterPoints.length > 0) {
                    const centroid = new Array(m).fill(0);
                    for (const point of clusterPoints) {
                        for (let d = 0; d < m; d++) {
                            centroid[d] += point[d];
                        }
                    }
                    newCentroids.push(centroid.map(v => v / clusterPoints.length));
                } else {
                    newCentroids.push([...centroids[j]]);
                }
            }
            
            // Calculate cost
            let cost = 0;
            for (let i = 0; i < n; i++) {
                cost += this._euclideanDistance(data[i], newCentroids[assignments[i]]);
            }
            
            // Check convergence
            if (Math.abs(prevCost - cost) < config.tol) {
                return {
                    centroids: newCentroids,
                    assignments,
                    cost,
                    iterations: iter + 1,
                    converged: true,
                    source: 'Stanford CS229 - K-Means'
                };
            }
            
            for (let j = 0; j < k; j++) {
                centroids[j] = newCentroids[j];
            }
            prevCost = cost;
        }
        
        return {
            centroids,
            assignments,
            cost: prevCost,
            iterations: config.maxIter,
            converged: false,
            source: 'Stanford CS229 - K-Means'
        };
    },
    
    // Matrix utilities
    _transpose: function(A) {
        return A[0].map((_, j) => A.map(row => row[j]));
    },
    
    _matrixMultiply: function(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            result[i] = [];
            for (let j = 0; j < B[0].length; j++) {
                result[i][j] = 0;
                for (let k = 0; k < A[0].length; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    },
    
    _matrixVectorMultiply: function(A, v) {
        return A.map(row => row.reduce((sum, a, i) => sum + a * v[i], 0));
    },
    
    _matrixInverse: function(A) {
        const n = A.length;
        const augmented = A.map((row, i) => {
            const identityRow = new Array(n).fill(0);
            identityRow[i] = 1;
            return [...row, ...identityRow];
        });
        
        // Gaussian elimination
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
            
            const pivot = augmented[i][i];
            if (Math.abs(pivot) < 1e-10) {
                // Add small regularization
                augmented[i][i] = 1e-10;
            }
            
            for (let j = i; j < 2 * n; j++) {
                augmented[i][j] /= pivot;
            }
            
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = augmented[k][i];
                    for (let j = i; j < 2 * n; j++) {
                        augmented[k][j] -= factor * augmented[i][j];
                    }
                }
            }
        }
        
        return augmented.map(row => row.slice(n));
    },
    
    _sampleWithoutReplacement: function(n, k) {
        const indices = [...Array(n).keys()];
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        return indices.slice(0, k);
    },
    
    _euclideanDistance: function(a, b) {
        return Math.sqrt(a.reduce((sum, ai, i) => sum + Math.pow(ai - b[i], 2), 0));
    },
    
    _buildDecisionTree: function(X, y, features, maxDepth, minSamplesLeaf, depth = 0) {
        if (depth >= maxDepth || X.length <= minSamplesLeaf) {
            return { isLeaf: true, value: y.reduce((a, b) => a + b, 0) / y.length };
        }
        
        // Find best split
        let bestGain = -Infinity;
        let bestFeature = 0;
        let bestThreshold = 0;
        
        const parentVar = this._variance(y);
        
        for (const f of features) {
            const values = X.map(x => x[f]).sort((a, b) => a - b);
            const thresholds = values.filter((v, i) => i > 0 && v !== values[i - 1]);
            
            for (const threshold of thresholds) {
                const leftIdx = X.map((x, i) => x[f] <= threshold ? i : -1).filter(i => i >= 0);
                const rightIdx = X.map((x, i) => x[f] > threshold ? i : -1).filter(i => i >= 0);
                
                if (leftIdx.length < minSamplesLeaf || rightIdx.length < minSamplesLeaf) continue;
                
                const leftY = leftIdx.map(i => y[i]);
                const rightY = rightIdx.map(i => y[i]);
                
                const leftVar = this._variance(leftY);
                const rightVar = this._variance(rightY);
                
                const gain = parentVar - 
                    (leftY.length / y.length) * leftVar - 
                    (rightY.length / y.length) * rightVar;
                
                if (gain > bestGain) {
                    bestGain = gain;
                    bestFeature = f;
                    bestThreshold = threshold;
                }
            }
        }
        
        if (bestGain <= 0) {
            return { isLeaf: true, value: y.reduce((a, b) => a + b, 0) / y.length };
        }
        
        const leftIdx = X.map((x, i) => x[bestFeature] <= bestThreshold ? i : -1).filter(i => i >= 0);
        const rightIdx = X.map((x, i) => x[bestFeature] > bestThreshold ? i : -1).filter(i => i >= 0);
        
        return {
            isLeaf: false,
            feature: bestFeature,
            threshold: bestThreshold,
            left: this._buildDecisionTree(
                leftIdx.map(i => X[i]), leftIdx.map(i => y[i]), 
                features, maxDepth, minSamplesLeaf, depth + 1
            ),
            right: this._buildDecisionTree(
                rightIdx.map(i => X[i]), rightIdx.map(i => y[i]), 
                features, maxDepth, minSamplesLeaf, depth + 1
            )
        };
    },
    
    _predictTree: function(tree, x, features) {
        if (tree.isLeaf) return tree.value;
        
        const featureIdx = features.indexOf(tree.feature);
        if (featureIdx === -1) return tree.value || 0;
        
        if (x[featureIdx] <= tree.threshold) {
            return this._predictTree(tree.left, x, features);
        } else {
            return this._predictTree(tree.right, x, features);
        }
    },
    
    _variance: function(arr) {
        if (arr.length === 0) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
    }
}