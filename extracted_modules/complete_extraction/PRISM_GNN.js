const PRISM_GNN = {
    // Graph Convolutional Network (GCN) layer
    createGCNLayer(inputDim, outputDim) {
        const initWeight = () => (Math.random() - 0.5) * Math.sqrt(2 / (inputDim + outputDim));
        
        return {
            inputDim,
            outputDim,
            weights: Array(outputDim).fill().map(() => 
                Array(inputDim).fill().map(initWeight)
            ),
            bias: Array(outputDim).fill(0),
            
            forward(nodeFeatures, adjacency) {
                const numNodes = nodeFeatures.length;
                
                // Add self-loops and normalize adjacency
                const adjNorm = this._normalizeAdjacency(adjacency, numNodes);
                
                // Aggregate: A_norm * X
                const aggregated = this._matmul(adjNorm, nodeFeatures);
                
                // Transform: W * aggregated + b
                const output = [];
                for (let i = 0; i < numNodes; i++) {
                    const nodeOut = [];
                    for (let j = 0; j < this.outputDim; j++) {
                        let sum = this.bias[j];
                        for (let k = 0; k < this.inputDim; k++) {
                            sum += this.weights[j][k] * aggregated[i][k];
                        }
                        nodeOut.push(Math.max(0, sum)); // ReLU
                    }
                    output.push(nodeOut);
                }
                
                return output;
            },
            
            _normalizeAdjacency(adj, n) {
                // A_hat = A + I (add self-loops)
                // D_hat = degree matrix of A_hat
                // A_norm = D_hat^(-1/2) * A_hat * D_hat^(-1/2)
                
                const adjHat = adj.map((row, i) => 
                    row.map((v, j) => i === j ? v + 1 : v)
                );
                
                // Compute degree
                const degree = adjHat.map(row => row.reduce((a, b) => a + b, 0));
                const degreeInvSqrt = degree.map(d => d > 0 ? 1 / Math.sqrt(d) : 0);
                
                // Normalize
                const normalized = [];
                for (let i = 0; i < n; i++) {
                    const row = [];
                    for (let j = 0; j < n; j++) {
                        row.push(degreeInvSqrt[i] * adjHat[i][j] * degreeInvSqrt[j]);
                    }
                    normalized.push(row);
                }
                
                return normalized;
            },
            
            _matmul(A, B) {
                return A.map(row => {
                    const result = new Array(B[0].length).fill(0);
                    for (let i = 0; i < row.length; i++) {
                        for (let j = 0; j < B[0].length; j++) {
                            result[j] += row[i] * B[i][j];
                        }
                    }
                    return result;
                });
            }
        };
    },
    
    // Graph Attention Network (GAT) layer
    createGATLayer(inputDim, outputDim, numHeads = 4) {
        const headDim = Math.floor(outputDim / numHeads);
        const initWeight = () => (Math.random() - 0.5) * Math.sqrt(2 / inputDim);
        
        return {
            inputDim,
            outputDim,
            numHeads,
            headDim,
            
            // Per-head weights
            W: Array(numHeads).fill().map(() => 
                Array(headDim).fill().map(() => 
                    Array(inputDim).fill().map(initWeight)
                )
            ),
            // Attention weights
            a: Array(numHeads).fill().map(() => 
                Array(2 * headDim).fill().map(initWeight)
            ),
            
            forward(nodeFeatures, adjacency) {
                const numNodes = nodeFeatures.length;
                const headOutputs = [];
                
                for (let h = 0; h < this.numHeads; h++) {
                    // Linear transformation: W * x
                    const transformed = nodeFeatures.map(x => {
                        const out = [];
                        for (let i = 0; i < this.headDim; i++) {
                            let sum = 0;
                            for (let j = 0; j < this.inputDim; j++) {
                                sum += this.W[h][i][j] * x[j];
                            }
                            out.push(sum);
                        }
                        return out;
                    });
                    
                    // Compute attention coefficients
                    const attention = [];
                    for (let i = 0; i < numNodes; i++) {
                        const row = [];
                        for (let j = 0; j < numNodes; j++) {
                            if (adjacency[i][j] > 0 || i === j) {
                                // Concatenate transformed features
                                const concat = [...transformed[i], ...transformed[j]];
                                // Attention score: LeakyReLU(a^T * [Wh_i || Wh_j])
                                let score = 0;
                                for (let k = 0; k < concat.length; k++) {
                                    score += this.a[h][k] * concat[k];
                                }
                                score = score > 0 ? score : 0.01 * score; // LeakyReLU
                                row.push(score);
                            } else {
                                row.push(-1e9); // Masked
                            }
                        }
                        attention.push(row);
                    }
                    
                    // Softmax attention
                    const attentionNorm = attention.map(row => {
                        const max = Math.max(...row);
                        const exps = row.map(s => Math.exp(s - max));
                        const sum = exps.reduce((a, b) => a + b, 0);
                        return exps.map(e => e / sum);
                    });
                    
                    // Aggregate with attention
                    const headOut = [];
                    for (let i = 0; i < numNodes; i++) {
                        const nodeOut = new Array(this.headDim).fill(0);
                        for (let j = 0; j < numNodes; j++) {
                            for (let k = 0; k < this.headDim; k++) {
                                nodeOut[k] += attentionNorm[i][j] * transformed[j][k];
                            }
                        }
                        headOut.push(nodeOut);
                    }
                    
                    headOutputs.push(headOut);
                }
                
                // Concatenate heads
                return nodeFeatures.map((_, i) => 
                    headOutputs.flatMap(head => head[i])
                );
            }
        };
    },
    
    // Message Passing Neural Network (generic framework)
    createMPNNLayer(nodeInputDim, edgeInputDim, hiddenDim) {
        return {
            nodeInputDim,
            edgeInputDim,
            hiddenDim,
            
            // Message function weights
            messageWeights: Array(hiddenDim).fill().map(() => 
                Array(nodeInputDim * 2 + edgeInputDim).fill().map(() => 
                    (Math.random() - 0.5) * 0.1
                )
            ),
            
            // Update function weights
            updateWeights: Array(hiddenDim).fill().map(() => 
                Array(nodeInputDim + hiddenDim).fill().map(() => 
                    (Math.random() - 0.5) * 0.1
                )
            ),
            
            forward(nodeFeatures, edges, edgeFeatures = null) {
                const numNodes = nodeFeatures.length;
                
                // Message passing
                const messages = new Array(numNodes).fill().map(() => 
                    new Array(this.hiddenDim).fill(0)
                );
                
                for (const [src, dst] of edges) {
                    const edgeIdx = edges.findIndex(e => e[0] === src && e[1] === dst);
                    const edgeFeat = edgeFeatures ? edgeFeatures[edgeIdx] : [];
                    
                    // Compute message
                    const input = [...nodeFeatures[src], ...nodeFeatures[dst], ...edgeFeat];
                    const message = this._mlp(input, this.messageWeights);
                    
                    // Aggregate (sum)
                    for (let i = 0; i < this.hiddenDim; i++) {
                        messages[dst][i] += message[i];
                    }
                }
                
                // Update nodes
                const updated = [];
                for (let i = 0; i < numNodes; i++) {
                    const input = [...nodeFeatures[i], ...messages[i]];
                    const newFeatures = this._mlp(input, this.updateWeights);
                    updated.push(newFeatures);
                }
                
                return updated;
            },
            
            _mlp(input, weights) {
                const output = [];
                for (let i = 0; i < weights.length; i++) {
                    let sum = 0;
                    for (let j = 0; j < Math.min(input.length, weights[i].length); j++) {
                        sum += weights[i][j] * input[j];
                    }
                    output.push(Math.max(0, sum)); // ReLU
                }
                return output;
            }
        };
    },
    
    // Graph pooling (readout)
    pooling: {
        // Global mean pooling
        meanPool(nodeFeatures) {
            const dim = nodeFeatures[0].length;
            const result = new Array(dim).fill(0);
            
            for (const features of nodeFeatures) {
                for (let i = 0; i < dim; i++) {
                    result[i] += features[i];
                }
            }
            
            return result.map(v => v / nodeFeatures.length);
        },
        
        // Global max pooling
        maxPool(nodeFeatures) {
            const dim = nodeFeatures[0].length;
            const result = new Array(dim).fill(-Infinity);
            
            for (const features of nodeFeatures) {
                for (let i = 0; i < dim; i++) {
                    result[i] = Math.max(result[i], features[i]);
                }
            }
            
            return result;
        },
        
        // Global sum pooling
        sumPool(nodeFeatures) {
            const dim = nodeFeatures[0].length;
            const result = new Array(dim).fill(0);
            
            for (const features of nodeFeatures) {
                for (let i = 0; i < dim; i++) {
                    result[i] += features[i];
                }
            }
            
            return result;
        },
        
        // Set2Set pooling (attention-based)
        set2SetPool(nodeFeatures, numSteps = 3) {
            const dim = nodeFeatures[0].length;
            let query = new Array(dim).fill(0);
            let readout = new Array(dim * 2).fill(0);
            
            for (let step = 0; step < numSteps; step++) {
                // Compute attention
                const scores = nodeFeatures.map(f => 
                    f.reduce((sum, v, i) => sum + v * query[i], 0)
                );
                
                // Softmax
                const maxScore = Math.max(...scores);
                const exps = scores.map(s => Math.exp(s - maxScore));
                const sumExp = exps.reduce((a, b) => a + b, 0);
                const attention = exps.map(e => e / sumExp);
                
                // Weighted sum
                const weighted = new Array(dim).fill(0);
                for (let i = 0; i < nodeFeatures.length; i++) {
                    for (let j = 0; j < dim; j++) {
                        weighted[j] += attention[i] * nodeFeatures[i][j];
                    }
                }
                
                // Update query (simplified LSTM update)
                query = weighted;
                readout = [...query, ...weighted];
            }
            
            return readout;
        }
    },
    
    // Manufacturing-specific: Part connectivity graph
    createPartGraph(features, operations) {
        const nodes = features.map((f, i) => ({
            id: i,
            features: f,
            type: 'feature'
        }));
        
        const edges = [];
        const edgeFeatures = [];
        
        // Connect features that share operations
        for (let i = 0; i < features.length; i++) {
            for (let j = i + 1; j < features.length; j++) {
                // Check if features are connected (share face, edge, etc.)
                if (this._featuresConnected(features[i], features[j])) {
                    edges.push([i, j]);
                    edges.push([j, i]); // Bidirectional
                    edgeFeatures.push(this._computeEdgeFeatures(features[i], features[j]));
                    edgeFeatures.push(this._computeEdgeFeatures(features[j], features[i]));
                }
            }
        }
        
        return { nodes, edges, edgeFeatures };
    },
    
    _featuresConnected(f1, f2) {
        // Simplified: check if features are spatially adjacent
        return Math.random() > 0.5; // Placeholder
    },
    
    _computeEdgeFeatures(f1, f2) {
        // Compute relationship features between two manufacturing features
        return [1.0]; // Placeholder
    }
}