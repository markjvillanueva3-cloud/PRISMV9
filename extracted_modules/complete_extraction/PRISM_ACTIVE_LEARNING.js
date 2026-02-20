const PRISM_ACTIVE_LEARNING = {
    // Labeled data pool
    labeledData: [],
    
    // Unlabeled data pool
    unlabeledPool: [],
    
    // Query strategies
    strategies: {
        // Uncertainty sampling - select most uncertain predictions
        uncertainty(predictions) {
            return predictions.map((p, i) => ({
                index: i,
                score: p.uncertainty || (1 - Math.max(...(p.probabilities || [p.confidence])))
            })).sort((a, b) => b.score - a.score);
        },
        
        // Margin sampling - smallest margin between top two predictions
        margin(predictions) {
            return predictions.map((p, i) => {
                const probs = p.probabilities || [p.confidence, 1 - p.confidence];
                const sorted = [...probs].sort((a, b) => b - a);
                const margin = sorted[0] - (sorted[1] || 0);
                return { index: i, score: 1 - margin };
            }).sort((a, b) => b.score - a.score);
        },
        
        // Entropy sampling - highest entropy predictions
        entropy(predictions) {
            return predictions.map((p, i) => {
                const probs = p.probabilities || [p.confidence, 1 - p.confidence];
                const entropy = -probs.reduce((sum, prob) => {
                    if (prob > 0) sum += prob * Math.log2(prob);
                    return sum;
                }, 0);
                return { index: i, score: entropy };
            }).sort((a, b) => b.score - a.score);
        },
        
        // Query-by-committee - disagreement among ensemble
        committee(predictions) {
            return predictions.map((p, i) => {
                const votes = p.committeeVotes || [];
                if (votes.length === 0) return { index: i, score: 0 };
                
                // Count disagreement
                const counts = {};
                votes.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
                const maxAgree = Math.max(...Object.values(counts));
                const disagreement = 1 - (maxAgree / votes.length);
                
                return { index: i, score: disagreement };
            }).sort((a, b) => b.score - a.score);
        },
        
        // Expected model change
        expectedChange(predictions, model) {
            return predictions.map((p, i) => {
                // Estimate gradient magnitude (simplified)
                const gradMagnitude = p.gradientNorm || Math.abs(1 - p.confidence);
                return { index: i, score: gradMagnitude };
            }).sort((a, b) => b.score - a.score);
        },
        
        // Diversity-based (representative sampling)
        diversity(predictions, features) {
            // Use k-medoids or similar to find diverse samples
            const selected = [];
            const remaining = predictions.map((p, i) => ({ index: i, features: features[i] }));
            
            // Greedy diversity selection
            while (selected.length < predictions.length && remaining.length > 0) {
                let bestIdx = 0;
                let bestMinDist = -Infinity;
                
                for (let i = 0; i < remaining.length; i++) {
                    let minDist = Infinity;
                    
                    for (const s of selected) {
                        const dist = PRISM_ACTIVE_LEARNING._distance(remaining[i].features, s.features);
                        minDist = Math.min(minDist, dist);
                    }
                    
                    if (selected.length === 0 || minDist > bestMinDist) {
                        bestMinDist = minDist;
                        bestIdx = i;
                    }
                }
                
                selected.push(remaining.splice(bestIdx, 1)[0]);
            }
            
            return selected.map((s, rank) => ({ index: s.index, score: 1 - rank / selected.length }));
        }
    },
    
    _distance(a, b) {
        if (!a || !b) return Infinity;
        let sum = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    },
    
    // Select samples to query
    selectQueries(model, unlabeled, options = {}) {
        const {
            strategy = 'uncertainty',
            batchSize = 10,
            diversityWeight = 0.3
        } = options;
        
        // Get predictions for unlabeled data
        const predictions = unlabeled.map(sample => {
            const pred = model.predict ? model.predict(sample.features) : { confidence: 0.5 };
            return {
                ...pred,
                sample
            };
        });
        
        // Apply strategy
        const strategyFn = this.strategies[strategy];
        if (!strategyFn) {
            console.warn(`[ACTIVE_LEARNING] Unknown strategy: ${strategy}`);
            return [];
        }
        
        let ranked = strategyFn(predictions);
        
        // Apply diversity if weight > 0
        if (diversityWeight > 0 && strategy !== 'diversity') {
            const diverseRanked = this.strategies.diversity(
                predictions, 
                unlabeled.map(s => s.features)
            );
            
            // Combine rankings
            ranked = ranked.map(r => {
                const diverseRank = diverseRanked.findIndex(d => d.index === r.index);
                const diverseScore = diverseRank >= 0 ? diverseRanked[diverseRank].score : 0;
                return {
                    ...r,
                    score: (1 - diversityWeight) * r.score + diversityWeight * diverseScore
                };
            }).sort((a, b) => b.score - a.score);
        }
        
        // Select top batch
        return ranked.slice(0, batchSize).map(r => ({
            sample: unlabeled[r.index],
            score: r.score,
            index: r.index
        }));
    },
    
    // Add labeled sample
    addLabeledSample(sample, label) {
        this.labeledData.push({
            sample,
            label,
            timestamp: Date.now()
        });
    },
    
    // Add to unlabeled pool
    addUnlabeledSamples(samples) {
        this.unlabeledPool.push(...samples.map(s => ({
            ...s,
            addedAt: Date.now()
        })));
    },
    
    // Remove from unlabeled pool (after labeling)
    removeFromPool(indices) {
        const indexSet = new Set(indices);
        this.unlabeledPool = this.unlabeledPool.filter((_, i) => !indexSet.has(i));
    },
    
    // Generate query for user
    generateQuery(sample) {
        const query = {
            id: `query_${Date.now()}`,
            sample,
            question: this._generateQuestion(sample),
            options: this._generateOptions(sample),
            createdAt: Date.now()
        };
        
        return query;
    },
    
    _generateQuestion(sample) {
        if (sample.type === 'speed_feed') {
            return `For ${sample.material} with ${sample.tool}, would these parameters work well?\n` +
                   `Speed: ${sample.speed} RPM, Feed: ${sample.feed} IPM`;
        }
        
        if (sample.type === 'tool_life') {
            return `How long did the tool actually last with these parameters?`;
        }
        
        return 'Please provide the correct label for this sample:';
    },
    
    _generateOptions(sample) {
        if (sample.type === 'speed_feed') {
            return [
                { value: 'good', label: 'These parameters worked well' },
                { value: 'too_aggressive', label: 'Too aggressive (reduced life/quality)' },
                { value: 'too_conservative', label: 'Too conservative (could go faster)' },
                { value: 'bad', label: 'Parameters did not work' }
            ];
        }
        
        return [
            { value: 'correct', label: 'Prediction was correct' },
            { value: 'incorrect', label: 'Prediction was incorrect' }
        ];
    },
    
    // Get statistics
    getStatistics() {
        return {
            labeledCount: this.labeledData.length,
            unlabeledCount: this.unlabeledPool.length,
            recentLabels: this.labeledData.slice(-10).map(d => ({
                label: d.label,
                timestamp: d.timestamp
            }))
        };
    }
}