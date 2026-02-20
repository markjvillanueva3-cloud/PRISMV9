const PRISM_UMAP = {
    name: 'PRISM UMAP',
    version: '1.0.0',
    
    create: function(config = {}) {
        const { nComponents = 2, nNeighbors = 15, minDist = 0.1, spread = 1.0, nEpochs = 200, learningRate = 1.0 } = config;
        return { nComponents, nNeighbors, minDist, spread, nEpochs, learningRate, a: 1.0, b: Math.log(2) / (spread - minDist) };
    },
    
    computeDistances: function(X, metric = 'euclidean') {
        const n = X.length;
        const distances = Array(n).fill(null).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dist = metric === 'euclidean' 
                    ? Math.sqrt(X[i].reduce((sum, v, k) => sum + (v - X[j][k]) ** 2, 0))
                    : X[i].reduce((sum, v, k) => sum + Math.abs(v - X[j][k]), 0);
                distances[i][j] = dist; distances[j][i] = dist;
            }
        }
        return distances;
    },
    
    findKNN: function(distances, k) {
        const n = distances.length;
        const knnIndices = [], knnDistances = [];
        for (let i = 0; i < n; i++) {
            const indexed = distances[i].map((d, j) => ({ idx: j, dist: d })).sort((a, b) => a.dist - b.dist);
            const neighbors = indexed.slice(1, k + 1);
            knnIndices.push(neighbors.map(n => n.idx));
            knnDistances.push(neighbors.map(n => n.dist));
        }
        return { knnIndices, knnDistances };
    },
    
    computeFuzzyGraph: function(knnIndices, knnDistances, nNeighbors) {
        const n = knnIndices.length;
        const graph = Array(n).fill(null).map(() => ({}));
        for (let i = 0; i < n; i++) {
            const rho = knnDistances[i][0];
            let sigma = 1.0;
            for (let iter = 0; iter < 64; iter++) {
                let sum = knnDistances[i].reduce((a, d) => a + Math.exp(-Math.max(0, d - rho) / sigma), 0);
                if (Math.abs(sum - nNeighbors) < 1e-5) break;
                sigma = sum < nNeighbors ? sigma * 2 : sigma / 2;
            }
            for (let j = 0; j < knnIndices[i].length; j++) {
                graph[i][knnIndices[i][j]] = Math.exp(-Math.max(0, knnDistances[i][j] - rho) / sigma);
            }
        }
        const symmetricGraph = Array(n).fill(null).map(() => ({}));
        for (let i = 0; i < n; i++) {
            for (const [j, wij] of Object.entries(graph[i])) {
                const jInt = parseInt(j);
                const wji = graph[jInt][i] || 0;
                const combined = wij + wji - wij * wji;
                symmetricGraph[i][jInt] = combined;
                symmetricGraph[jInt][i] = combined;
            }
        }
        return symmetricGraph;
    },
    
    fitTransform: function(params, X) {
        const n = X.length;
        const distances = this.computeDistances(X);
        const { knnIndices, knnDistances } = this.findKNN(distances, params.nNeighbors);
        const graph = this.computeFuzzyGraph(knnIndices, knnDistances, params.nNeighbors);
        
        let embedding = Array(n).fill(null).map(() => Array(params.nComponents).fill(0).map(() => (Math.random() - 0.5) * 20));
        
        for (let epoch = 0; epoch < params.nEpochs; epoch++) {
            const alpha = params.learningRate * (1 - epoch / params.nEpochs);
            for (let i = 0; i < n; i++) {
                for (const [jStr, weight] of Object.entries(graph[i])) {
                    const j = parseInt(jStr);
                    if (weight < 0.01) continue;
                    const distSq = embedding[i].reduce((sum, v, d) => sum + (v - embedding[j][d]) ** 2, 0);
                    const gradCoeff = -2 * params.a * params.b * Math.pow(distSq, params.b - 1) / (1 + params.a * Math.pow(distSq, params.b));
                    for (let d = 0; d < params.nComponents; d++) {
                        embedding[i][d] -= alpha * gradCoeff * (embedding[i][d] - embedding[j][d]) * weight;
                    }
                    const k = Math.floor(Math.random() * n);
                    if (k !== i && !graph[i][k]) {
                        const negDistSq = embedding[i].reduce((sum, v, d) => sum + (v - embedding[k][d]) ** 2, 0);
                        const repGradCoeff = 2 * params.b / ((0.001 + negDistSq) * (1 + params.a * Math.pow(negDistSq, params.b)));
                        for (let d = 0; d < params.nComponents; d++) {
                            embedding[i][d] += alpha * Math.max(-4, Math.min(4, repGradCoeff * (embedding[i][d] - embedding[k][d])));
                        }
                    }
                }
            }
        }
        return embedding;
    }
}