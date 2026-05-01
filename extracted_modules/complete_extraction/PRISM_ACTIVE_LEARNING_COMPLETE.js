const PRISM_ACTIVE_LEARNING_COMPLETE = {
    name: 'PRISM Active Learning Complete',
    version: '1.0.0',
    
    // Data pools
    labeledData: [],
    unlabeledPool: [],
    
    // Query strategies
    strategies: {
        /**
         * Uncertainty sampling - select least confident predictions
         */
        uncertainty: function(predictions) {
            return predictions.map((p, i) => ({
                index: i,
                score: 1 - (p.confidence || Math.max(...(p.probabilities || [0.5])))
            })).sort((a, b) => b.score - a.score);
        },
        
        /**
         * Margin sampling - select smallest margin between top two classes
         */
        margin: function(predictions) {
            return predictions.map((p, i) => {
                const probs = p.probabilities || [p.confidence || 0.5, 1 - (p.confidence || 0.5)];
                const sorted = [...probs].sort((a, b) => b - a);
                const margin = sorted[0] - (sorted[1] || 0);
                return { index: i, score: 1 - margin };
            }).sort((a, b) => b.score - a.score);
        },
        
        /**
         * Entropy sampling - select highest entropy predictions
         */
        entropy: function(predictions) {
            return predictions.map((p, i) => {
                const probs = p.probabilities || [p.confidence || 0.5, 1 - (p.confidence || 0.5)];
                const entropy = -probs.reduce((sum, prob) => {
                    return prob > 0 ? sum + prob * Math.log2(prob) : sum;
                }, 0);
                return { index: i, score: entropy };
            }).sort((a, b) => b.score - a.score);
        },
        
        /**
         * Query-by-committee - select where ensemble disagrees
         */
        committee: function(predictions) {
            return predictions.map((p, i) => {
                const votes = p.committeeVotes || [];
                if (votes.length === 0) return { index: i, score: 0 };
                
                const counts = {};
                votes.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
                const maxAgree = Math.max(...Object.values(counts));
                const disagreement = 1 - (maxAgree / votes.length);
                
                return { index: i, score: disagreement };
            }).sort((a, b) => b.score - a.score);
        },
        
        /**
         * Expected model change
         */
        expectedChange: function(predictions) {
            return predictions.map((p, i) => ({
                index: i,
                score: p.gradientNorm || Math.abs(1 - (p.confidence || 0.5))
            })).sort((a, b) => b.score - a.score);
        },
        
        /**
         * Diversity-based (representative sampling)
         */
        diversity: function(predictions, features) {
            if (!features) return predictions.map((_, i) => ({ index: i, score: Math.random() }));
            
            const selected = [];
            const remaining = predictions.map((p, i) => ({ index: i, features: features[i] }));
            
            // Greedy diversity selection
            while (selected.length < predictions.length && remaining.length > 0) {
                let bestIdx = 0;
                let bestMinDist = -Infinity;
                
                for (let i = 0; i < remaining.length; i++) {
                    let minDist = selected.length === 0 ? Infinity : Infinity;
                    
                    for (const s of selected) {
                        const dist = PRISM_ACTIVE_LEARNING_COMPLETE._distance(remaining[i].features, s.features);
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
    
    _distance: function(a, b) {
        if (!a || !b) return Infinity;
        let sum = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    },
    
    /**
     * Select samples to query
     */
    selectQueries: function(model, unlabeled, options = {}) {
        const {
            strategy = 'uncertainty',
            batchSize = 10,
            diversityWeight = 0.3,
            features = null
        } = options;
        
        // Get predictions
        const predictions = unlabeled.map(sample => {
            const pred = model.predict ? model.predict(sample.features) : { confidence: 0.5 };
            return { ...pred, sample };
        });
        
        // Apply strategy
        const strategyFn = this.strategies[strategy];
        if (!strategyFn) {
            console.warn(`Unknown strategy: ${strategy}`);
            return [];
        }
        
        let ranked = strategyFn(predictions, features);
        
        // Apply diversity if weight > 0
        if (diversityWeight > 0 && strategy !== 'diversity' && features) {
            const diverseRanked = this.strategies.diversity(predictions, features);
            
            ranked = ranked.map(r => {
                const diverseRank = diverseRanked.findIndex(d => d.index === r.index);
                const diverseScore = diverseRank >= 0 ? diverseRanked[diverseRank].score : 0;
                return {
                    ...r,
                    score: (1 - diversityWeight) * r.score + diversityWeight * diverseScore
                };
            }).sort((a, b) => b.score - a.score);
        }
        
        return ranked.slice(0, batchSize).map(r => ({
            sample: unlabeled[r.index],
            score: r.score,
            index: r.index
        }));
    },
    
    /**
     * Add labeled sample
     */
    addLabeledSample: function(sample, label) {
        this.labeledData.push({
            sample,
            label,
            timestamp: Date.now()
        });
    },
    
    /**
     * Add to unlabeled pool
     */
    addUnlabeledSamples: function(samples) {
        this.unlabeledPool.push(...samples.map(s => ({
            ...s,
            addedAt: Date.now()
        })));
    },
    
    /**
     * Remove from unlabeled pool
     */
    removeFromPool: function(indices) {
        const indexSet = new Set(indices);
        this.unlabeledPool = this.unlabeledPool.filter((_, i) => !indexSet.has(i));
    },
    
    /**
     * Get statistics
     */
    getStatistics: function() {
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