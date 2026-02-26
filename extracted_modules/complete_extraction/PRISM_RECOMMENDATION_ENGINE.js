const PRISM_RECOMMENDATION_ENGINE = {
    // User interaction history
    userHistory: {
        interactions: [],
        preferences: {},
        successfulCuts: [],
        
        add(interaction) {
            this.interactions.push({
                ...interaction,
                timestamp: Date.now()
            });
            
            // Limit history size
            if (this.interactions.length > 10000) {
                this.interactions = this.interactions.slice(-10000);
            }
        },
        
        getRecent(n = 100) {
            return this.interactions.slice(-n);
        },
        
        recordSuccess(params, outcome) {
            this.successfulCuts.push({
                params,
                outcome,
                timestamp: Date.now()
            });
        }
    },
    
    // Item-based collaborative filtering
    itemSimilarity: new Map(),
    
    // Calculate similarity between two parameter sets
    calculateSimilarity(params1, params2) {
        const keys = new Set([...Object.keys(params1), ...Object.keys(params2)]);
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        keys.forEach(key => {
            const v1 = this._normalizeValue(params1[key]);
            const v2 = this._normalizeValue(params2[key]);
            
            if (v1 !== null && v2 !== null) {
                dotProduct += v1 * v2;
                norm1 += v1 * v1;
                norm2 += v2 * v2;
            }
        });
        
        if (norm1 === 0 || norm2 === 0) return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    },
    
    _normalizeValue(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value / 1000; // Normalize to ~0-1 range
        if (typeof value === 'string') return value.length / 100;
        return null;
    },
    
    // Get recommendations based on current context
    recommend(context, options = {}) {
        const { topN = 5, method = 'hybrid' } = options;
        
        let recommendations = [];
        
        switch (method) {
            case 'content':
                recommendations = this._contentBasedRecommend(context);
                break;
            case 'collaborative':
                recommendations = this._collaborativeRecommend(context);
                break;
            case 'hybrid':
            default:
                const contentRecs = this._contentBasedRecommend(context);
                const collabRecs = this._collaborativeRecommend(context);
                recommendations = this._mergeRecommendations(contentRecs, collabRecs);
        }
        
        // Sort by score and return top N
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, topN);
    },
    
    _contentBasedRecommend(context) {
        const recommendations = [];
        
        // Find similar successful cuts
        const successfulCuts = this.userHistory.successfulCuts;
        
        successfulCuts.forEach(cut => {
            const similarity = this.calculateSimilarity(context, cut.params);
            
            if (similarity > 0.5) {
                recommendations.push({
                    type: 'parameter_set',
                    params: cut.params,
                    score: similarity * (cut.outcome?.success ? 1.2 : 0.8),
                    reason: 'Similar to your previous successful cut',
                    source: 'content'
                });
            }
        });
        
        return recommendations;
    },
    
    _collaborativeRecommend(context) {
        const recommendations = [];
        
        // Recommend based on what similar contexts led to
        const recentInteractions = this.userHistory.getRecent(500);
        
        // Group by material-tool combination
        const combinations = new Map();
        
        recentInteractions.forEach(interaction => {
            if (!interaction.params) return;
            
            const key = `${interaction.params.material}-${interaction.params.tool}`;
            if (!combinations.has(key)) {
                combinations.set(key, { sum: {}, count: 0, successes: 0 });
            }
            
            const combo = combinations.get(key);
            combo.count++;
            if (interaction.outcome?.success) combo.successes++;
            
            // Accumulate parameter values
            Object.entries(interaction.params).forEach(([k, v]) => {
                if (typeof v === 'number') {
                    combo.sum[k] = (combo.sum[k] || 0) + v;
                }
            });
        });
        
        // Find matching combination
        const contextKey = `${context.material}-${context.tool}`;
        const match = combinations.get(contextKey);
        
        if (match && match.count >= 3) {
            const avgParams = {};
            Object.entries(match.sum).forEach(([k, v]) => {
                avgParams[k] = v / match.count;
            });
            
            recommendations.push({
                type: 'community_average',
                params: avgParams,
                score: match.successes / match.count,
                reason: `Based on ${match.count} similar operations`,
                source: 'collaborative'
            });
        }
        
        return recommendations;
    },
    
    _mergeRecommendations(contentRecs, collabRecs) {
        const merged = [];
        const seen = new Set();
        
        // Combine and deduplicate
        [...contentRecs, ...collabRecs].forEach(rec => {
            const key = JSON.stringify(rec.params);
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(rec);
            } else {
                // Boost score if recommended by both methods
                const existing = merged.find(r => JSON.stringify(r.params) === key);
                if (existing) {
                    existing.score *= 1.2;
                    existing.reason += ' (confirmed by multiple methods)';
                }
            }
        });
        
        return merged;
    },
    
    // Diversity-aware recommendation
    diversifyRecommendations(recommendations, diversityWeight = 0.3) {
        if (recommendations.length <= 1) return recommendations;
        
        const diversified = [recommendations[0]];
        const remaining = recommendations.slice(1);
        
        while (remaining.length > 0 && diversified.length < recommendations.length) {
            let bestIdx = 0;
            let bestScore = -Infinity;
            
            for (let i = 0; i < remaining.length; i++) {
                // Calculate diversity (dissimilarity to already selected)
                let minSimilarity = Infinity;
                for (const selected of diversified) {
                    const sim = this.calculateSimilarity(remaining[i].params, selected.params);
                    minSimilarity = Math.min(minSimilarity, sim);
                }
                
                // Combine relevance and diversity
                const score = (1 - diversityWeight) * remaining[i].score + 
                             diversityWeight * (1 - minSimilarity);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestIdx = i;
                }
            }
            
            diversified.push(remaining.splice(bestIdx, 1)[0]);
        }
        
        return diversified;
    },
    
    // Record feedback on recommendation
    recordFeedback(recommendationId, feedback) {
        this.userHistory.add({
            type: 'feedback',
            recommendationId,
            feedback,
            timestamp: Date.now()
        });
        
        // Update user preferences
        if (feedback.helpful !== undefined) {
            // Could update model weights here
        }
    },
    
    // Get explanation for recommendation
    explainRecommendation(recommendation) {
        const explanation = {
            summary: recommendation.reason,
            factors: [],
            confidence: recommendation.score
        };
        
        if (recommendation.source === 'content') {
            explanation.factors.push({
                factor: 'Similar operations',
                description: 'Based on your previous successful cuts with similar parameters'
            });
        }
        
        if (recommendation.source === 'collaborative') {
            explanation.factors.push({
                factor: 'Community data',
                description: 'Successful parameters used by others in similar situations'
            });
        }
        
        return explanation;
    }
}