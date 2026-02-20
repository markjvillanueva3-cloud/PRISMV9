const PRISM_CONTINUAL_LEARNING = {
    // Elastic Weight Consolidation (EWC)
    createEWC(model, lambda = 1000) {
        return {
            model,
            lambda,
            fisherMatrices: [],
            optimalParams: [],
            taskCount: 0,
            
            // Compute Fisher Information Matrix for current task
            computeFisher(dataLoader, numSamples = 100) {
                const params = this._getParams();
                const fisher = params.map(p => new Array(p.length).fill(0));
                
                // Monte Carlo estimation of Fisher
                for (let i = 0; i < numSamples; i++) {
                    const sample = dataLoader.sample();
                    const gradients = this._computeGradients(sample);
                    
                    // Fisher = E[grad * grad^T]
                    for (let j = 0; j < gradients.length; j++) {
                        for (let k = 0; k < gradients[j].length; k++) {
                            fisher[j][k] += gradients[j][k] * gradients[j][k];
                        }
                    }
                }
                
                // Average
                for (let j = 0; j < fisher.length; j++) {
                    for (let k = 0; k < fisher[j].length; k++) {
                        fisher[j][k] /= numSamples;
                    }
                }
                
                return fisher;
            },
            
            // Register a new task (call after training on task)
            registerTask(dataLoader) {
                const fisher = this.computeFisher(dataLoader);
                this.fisherMatrices.push(fisher);
                this.optimalParams.push(this._getParams());
                this.taskCount++;
            },
            
            // Compute EWC penalty
            ewcPenalty() {
                if (this.taskCount === 0) return 0;
                
                const currentParams = this._getParams();
                let penalty = 0;
                
                for (let t = 0; t < this.taskCount; t++) {
                    const fisher = this.fisherMatrices[t];
                    const optimal = this.optimalParams[t];
                    
                    for (let i = 0; i < currentParams.length; i++) {
                        for (let j = 0; j < currentParams[i].length; j++) {
                            const diff = currentParams[i][j] - optimal[i][j];
                            penalty += fisher[i][j] * diff * diff;
                        }
                    }
                }
                
                return 0.5 * this.lambda * penalty;
            },
            
            // Total loss = task loss + EWC penalty
            totalLoss(taskLoss) {
                return taskLoss + this.ewcPenalty();
            },
            
            _getParams() {
                // Extract model parameters (simplified)
                return this.model.layers.map(l => l.weights ? l.weights.flat() : []);
            },
            
            _computeGradients(sample) {
                // Compute gradients via backprop (simplified placeholder)
                const params = this._getParams();
                return params.map(p => p.map(() => Math.random() - 0.5));
            }
        };
    },
    
    // Experience Replay
    createReplayBuffer(capacity = 10000, samplesPerTask = 1000) {
        return {
            capacity,
            samplesPerTask,
            buffer: [],
            taskBoundaries: [0],
            
            // Add samples from current task
            addTask(samples) {
                // Reservoir sampling if too many samples
                const toAdd = samples.length > this.samplesPerTask 
                    ? this._reservoirSample(samples, this.samplesPerTask)
                    : samples;
                
                // Add to buffer
                for (const sample of toAdd) {
                    if (this.buffer.length >= this.capacity) {
                        // Remove oldest sample (FIFO) or use reservoir sampling
                        const removeIdx = Math.floor(Math.random() * this.buffer.length);
                        this.buffer.splice(removeIdx, 1);
                    }
                    this.buffer.push({ ...sample, taskId: this.taskBoundaries.length - 1 });
                }
                
                this.taskBoundaries.push(this.buffer.length);
            },
            
            // Sample from buffer
            sample(batchSize, balanced = true) {
                if (this.buffer.length === 0) return [];
                
                if (balanced && this.taskBoundaries.length > 2) {
                    // Sample equally from each task
                    const numTasks = this.taskBoundaries.length - 1;
                    const perTask = Math.ceil(batchSize / numTasks);
                    const samples = [];
                    
                    for (let t = 0; t < numTasks; t++) {
                        const taskSamples = this.buffer.filter(s => s.taskId === t);
                        const taskBatch = this._randomSample(taskSamples, Math.min(perTask, taskSamples.length));
                        samples.push(...taskBatch);
                    }
                    
                    return samples.slice(0, batchSize);
                } else {
                    return this._randomSample(this.buffer, batchSize);
                }
            },
            
            _reservoirSample(array, k) {
                const result = array.slice(0, k);
                for (let i = k; i < array.length; i++) {
                    const j = Math.floor(Math.random() * (i + 1));
                    if (j < k) {
                        result[j] = array[i];
                    }
                }
                return result;
            },
            
            _randomSample(array, k) {
                const shuffled = [...array].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, k);
            }
        };
    },
    
    // Progressive Neural Networks (expandable architecture)
    createProgressiveNet(baseModel) {
        return {
            columns: [baseModel],
            lateralConnections: [],
            
            // Add a new column for a new task
            addColumn(newModel) {
                const colIdx = this.columns.length;
                
                // Create lateral connections from previous columns
                const laterals = [];
                for (let prev = 0; prev < colIdx; prev++) {
                    // Adapter from previous column to new column
                    laterals.push({
                        from: prev,
                        to: colIdx,
                        weights: this._initLateralWeights()
                    });
                }
                
                this.lateralConnections.push(laterals);
                this.columns.push(newModel);
                
                // Freeze previous columns
                for (let i = 0; i < colIdx; i++) {
                    this._freezeColumn(i);
                }
            },
            
            // Forward pass through progressive net
            forward(input, taskId) {
                const activations = [];
                
                // Compute activations for all columns up to taskId
                for (let col = 0; col <= taskId; col++) {
                    let colInput = input;
                    
                    // Add lateral connections from previous columns
                    if (col > 0 && this.lateralConnections[col - 1]) {
                        for (const lateral of this.lateralConnections[col - 1]) {
                            const prevActivation = activations[lateral.from];
                            const lateralContrib = this._applyLateral(prevActivation, lateral.weights);
                            colInput = colInput.map((v, i) => v + (lateralContrib[i] || 0));
                        }
                    }
                    
                    activations.push(this.columns[col].forward(colInput));
                }
                
                return activations[taskId];
            },
            
            _initLateralWeights() {
                return Array(64).fill().map(() => Math.random() * 0.01);
            },
            
            _applyLateral(activation, weights) {
                return activation.map((a, i) => a * (weights[i] || 0.01));
            },
            
            _freezeColumn(colIdx) {
                // Mark column as frozen (no gradient updates)
                this.columns[colIdx].frozen = true;
            }
        };
    },
    
    // Gradient Episodic Memory (GEM)
    createGEM(model, memoryStrength = 0.5) {
        return {
            model,
            memoryStrength,
            taskMemories: [],
            
            // Store gradients for a task
            storeTaskGradients(taskData) {
                // Compute reference gradients on task data
                const refGradients = this._computeTaskGradients(taskData);
                this.taskMemories.push(refGradients);
            },
            
            // Project gradients to avoid forgetting
            projectGradients(currentGradients) {
                if (this.taskMemories.length === 0) {
                    return currentGradients;
                }
                
                // Check if current gradients conflict with any task memory
                let projected = currentGradients;
                
                for (const taskGrad of this.taskMemories) {
                    const dotProduct = this._dot(projected, taskGrad);
                    
                    if (dotProduct < 0) {
                        // Gradient conflicts - project onto feasible region
                        const taskNormSq = this._dot(taskGrad, taskGrad);
                        if (taskNormSq > 0) {
                            const scale = dotProduct / taskNormSq;
                            projected = projected.map((g, i) => 
                                g - scale * taskGrad[i]
                            );
                        }
                    }
                }
                
                return projected;
            },
            
            _computeTaskGradients(taskData) {
                // Compute average gradient over task data
                return taskData[0].map(() => Math.random() - 0.5); // Placeholder
            },
            
            _dot(a, b) {
                return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
            }
        };
    },
    
    // Learning without Forgetting (LwF)
    createLwF(model, temperature = 2.0, lambda = 1.0) {
        return {
            model,
            temperature,
            lambda,
            oldModelOutputs: null,
            
            // Store outputs of old model on new task data
            recordOldOutputs(newTaskData) {
                this.oldModelOutputs = newTaskData.map(x => 
                    this._softmaxWithTemp(this.model.forward(x), this.temperature)
                );
            },
            
            // Compute LwF distillation loss
            lwfLoss(currentOutputs) {
                if (!this.oldModelOutputs) return 0;
                
                let loss = 0;
                for (let i = 0; i < currentOutputs.length; i++) {
                    const currentSoft = this._softmaxWithTemp(currentOutputs[i], this.temperature);
                    loss += this._crossEntropy(currentSoft, this.oldModelOutputs[i]);
                }
                
                return this.lambda * loss / currentOutputs.length * (this.temperature * this.temperature);
            },
            
            _softmaxWithTemp(logits, temp) {
                const scaled = logits.map(l => l / temp);
                const max = Math.max(...scaled);
                const exps = scaled.map(l => Math.exp(l - max));
                const sum = exps.reduce((a, b) => a + b, 0);
                return exps.map(e => e / sum);
            },
            
            _crossEntropy(pred, target) {
                return -target.reduce((sum, t, i) => 
                    sum + (t > 0 ? t * Math.log(pred[i] + 1e-10) : 0), 0
                );
            }
        };
    }
}