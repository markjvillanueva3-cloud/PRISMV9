const PRISM_SELF_SUPERVISED = {
    // InfoNCE / NT-Xent loss (contrastive)
    infoNCELoss(anchor, positive, negatives, temperature = 0.07) {
        // Similarity between anchor and positive
        const posSim = this._cosineSimilarity(anchor, positive) / temperature;
        
        // Similarities between anchor and negatives
        const negSims = negatives.map(neg => 
            this._cosineSimilarity(anchor, neg) / temperature
        );
        
        // InfoNCE loss = -log(exp(pos) / (exp(pos) + sum(exp(negs))))
        const maxSim = Math.max(posSim, ...negSims);
        const expPos = Math.exp(posSim - maxSim);
        const expNegs = negSims.map(s => Math.exp(s - maxSim));
        const sumExp = expPos + expNegs.reduce((a, b) => a + b, 0);
        
        return -Math.log(expPos / sumExp);
    },
    
    // NT-Xent loss (SimCLR style - both directions)
    ntXentLoss(z1, z2, batchZs, temperature = 0.5) {
        // z1 and z2 are positive pair, batchZs contains all embeddings in batch
        const loss1 = this.infoNCELoss(z1, z2, 
            batchZs.filter(z => z !== z1 && z !== z2), temperature);
        const loss2 = this.infoNCELoss(z2, z1,
            batchZs.filter(z => z !== z1 && z !== z2), temperature);
        
        return (loss1 + loss2) / 2;
    },
    
    // Triplet loss
    tripletLoss(anchor, positive, negative, margin = 1.0) {
        const posDist = this._euclideanDistance(anchor, positive);
        const negDist = this._euclideanDistance(anchor, negative);
        return Math.max(0, posDist - negDist + margin);
    },
    
    // Data augmentation for contrastive learning
    augmentations: {
        // Random crop and resize (simulated for 1D/vector data)
        randomCrop(x, cropRatio = 0.8) {
            const cropSize = Math.floor(x.length * cropRatio);
            const start = Math.floor(Math.random() * (x.length - cropSize));
            return x.slice(start, start + cropSize);
        },
        
        // Add Gaussian noise
        gaussianNoise(x, std = 0.1) {
            return x.map(v => v + std * (Math.random() + Math.random() + Math.random() - 1.5) * 1.22);
        },
        
        // Random scaling
        randomScale(x, minScale = 0.8, maxScale = 1.2) {
            const scale = minScale + Math.random() * (maxScale - minScale);
            return x.map(v => v * scale);
        },
        
        // Dropout/masking
        randomMask(x, maskRatio = 0.15) {
            return x.map(v => Math.random() > maskRatio ? v : 0);
        },
        
        // Feature permutation
        randomPermute(x, blockSize = 4) {
            const result = [...x];
            const numBlocks = Math.floor(x.length / blockSize);
            
            for (let i = numBlocks - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Swap blocks
                for (let k = 0; k < blockSize; k++) {
                    const temp = result[i * blockSize + k];
                    result[i * blockSize + k] = result[j * blockSize + k];
                    result[j * blockSize + k] = temp;
                }
            }
            
            return result;
        },
        
        // Compose multiple augmentations
        compose(x, augmentationList) {
            let result = x;
            for (const aug of augmentationList) {
                result = aug(result);
            }
            return result;
        }
    },
    
    // SimCLR-style training step
    simCLRStep(batch, encoder, projector, augment1, augment2, temperature = 0.5) {
        const batchSize = batch.length;
        const embeddings = [];
        
        // Generate two views for each sample
        for (const x of batch) {
            const view1 = augment1(x);
            const view2 = augment2(x);
            
            // Encode and project
            const z1 = projector(encoder(view1));
            const z2 = projector(encoder(view2));
            
            embeddings.push(z1, z2);
        }
        
        // Compute loss for all pairs
        let totalLoss = 0;
        for (let i = 0; i < batchSize; i++) {
            const z1 = embeddings[2 * i];
            const z2 = embeddings[2 * i + 1];
            
            // Negatives are all other embeddings
            const negatives = embeddings.filter((_, j) => j !== 2*i && j !== 2*i+1);
            
            totalLoss += this.infoNCELoss(z1, z2, negatives, temperature);
            totalLoss += this.infoNCELoss(z2, z1, negatives, temperature);
        }
        
        return totalLoss / (2 * batchSize);
    },
    
    // BYOL-style (no negatives needed)
    byolLoss(onlinePred, targetProj) {
        // L2 normalize
        const normOnline = this._normalize(onlinePred);
        const normTarget = this._normalize(targetProj);
        
        // MSE loss
        let loss = 0;
        for (let i = 0; i < normOnline.length; i++) {
            loss += Math.pow(normOnline[i] - normTarget[i], 2);
        }
        return loss;
    },
    
    // Pretext tasks
    pretextTasks: {
        // Predict masked values (like BERT MLM)
        maskedPrediction(x, maskRatio = 0.15) {
            const masked = [...x];
            const labels = new Array(x.length).fill(null);
            const maskToken = 0; // Special mask token
            
            for (let i = 0; i < x.length; i++) {
                if (Math.random() < maskRatio) {
                    labels[i] = x[i]; // Store original for loss
                    
                    const r = Math.random();
                    if (r < 0.8) {
                        masked[i] = maskToken; // Replace with mask
                    } else if (r < 0.9) {
                        masked[i] = x[Math.floor(Math.random() * x.length)]; // Random token
                    }
                    // 10% keep original
                }
            }
            
            return { masked, labels };
        },
        
        // Predict rotation (for images/spatial data)
        rotationPrediction(x) {
            // Simulate rotation by circular shift
            const rotations = [0, 1, 2, 3]; // 0°, 90°, 180°, 270°
            const rotationLabel = rotations[Math.floor(Math.random() * 4)];
            
            let rotated = [...x];
            const quarterLen = Math.floor(x.length / 4);
            for (let r = 0; r < rotationLabel; r++) {
                rotated = [...rotated.slice(-quarterLen), ...rotated.slice(0, -quarterLen)];
            }
            
            return { rotated, label: rotationLabel };
        },
        
        // Predict order of sequence segments
        orderPrediction(x, numSegments = 4) {
            const segmentLen = Math.floor(x.length / numSegments);
            const segments = [];
            
            for (let i = 0; i < numSegments; i++) {
                segments.push(x.slice(i * segmentLen, (i + 1) * segmentLen));
            }
            
            // Shuffle segments
            const shuffled = [...segments];
            const order = Array.from({ length: numSegments }, (_, i) => i);
            
            for (let i = numSegments - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                [order[i], order[j]] = [order[j], order[i]];
            }
            
            return { 
                shuffled: shuffled.flat(), 
                originalOrder: order 
            };
        }
    },
    
    // Helper functions
    _cosineSimilarity(a, b) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
    },
    
    _euclideanDistance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    },
    
    _normalize(x) {
        const norm = Math.sqrt(x.reduce((s, v) => s + v * v, 0));
        return x.map(v => v / (norm + 1e-8));
    }
}