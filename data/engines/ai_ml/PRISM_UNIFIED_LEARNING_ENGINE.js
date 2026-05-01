/**
 * PRISM_UNIFIED_LEARNING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 15
 * Lines: 186
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_UNIFIED_LEARNING_ENGINE = {
    version: "2.0",

    // Learning categories
    categories: {
        cuttingParameters: {
            name: "Cutting Parameter Optimization",
            dataPoints: ["speed", "feed", "doc", "woc", "toolWear", "surfaceFinish"],
            learningRate: 0.1,
            minSamples: 10
        },
        toolSelection: {
            name: "Tool Selection Intelligence",
            dataPoints: ["material", "feature", "tolerance", "surfaceFinish", "successRate"],
            learningRate: 0.15,
            minSamples: 5
        },
        strategySelection: {
            name: "CAM Strategy Selection",
            dataPoints: ["feature", "material", "machine", "cycleTime", "quality"],
            learningRate: 0.1,
            minSamples: 8
        },
        feedbackIntegration: {
            name: "User Feedback Learning",
            dataPoints: ["parameterAdjustments", "strategyOverrides", "qualityRatings"],
            learningRate: 0.2,
            minSamples: 3
        }
    },
    // Experience database
    experienceDB: {
        storage: new Map(),

        addExperience: function(category, input, output, result) {
            const key = this.generateKey(category, input);
            const existing = this.storage.get(key) || { samples: [], avgResult: 0 };

            existing.samples.push({ input, output, result, timestamp: Date.now() });
            existing.avgResult = existing.samples.reduce((a, b) => a + b.result, 0) / existing.samples.length;

            this.storage.set(key, existing);
            return existing;
        },
        getExperience: function(category, input) {
            const key = this.generateKey(category, input);
            return this.storage.get(key);
        },
        generateKey: function(category, input) {
            return `${category}_${JSON.stringify(input)}`;
        }
    },
    // Parameter adjustment learning
    parameterLearning: {
        // Learn from successful cuts
        learnFromSuccess: function(params, result) {
            const adjustment = {
                speed: result.toolWear < 0.5 ? 1.05 : 0.95,
                feed: result.surfaceFinish < result.targetFinish ? 0.95 : 1.02,
                doc: result.vibration < 0.3 ? 1.1 : 0.9
            };
            return {
                recommendedSpeed: params.speed * adjustment.speed,
                recommendedFeed: params.feed * adjustment.feed,
                recommendedDoc: params.doc * adjustment.doc,
                confidence: this.calculateConfidence(result)
            };
        },
        calculateConfidence: function(result) {
            const factors = [
                result.toolWear < 0.7 ? 0.3 : 0.1,
                result.surfaceFinish <= result.targetFinish ? 0.3 : 0.1,
                result.vibration < 0.5 ? 0.2 : 0.1,
                result.cycleTime <= result.targetTime ? 0.2 : 0.1
            ];
            return factors.reduce((a, b) => a + b, 0);
        }
    },
    // Pattern recognition
    patternRecognition: {
        // Identify similar past jobs
        findSimilarJobs: function(currentJob) {
            const similarities = [];

            for (const [key, experience] of PRISM_UNIFIED_LEARNING_ENGINE.experienceDB.storage) {
                const similarity = this.calculateSimilarity(currentJob, experience);
                if (similarity > 0.7) {
                    similarities.push({ key, experience, similarity });
                }
            }
            return similarities.sort((a, b) => b.similarity - a.similarity);
        },
        calculateSimilarity: function(job1, job2) {
            let score = 0;
            let factors = 0;

            if (job1.material === job2.material) { score += 0.3; }
            if (job1.featureType === job2.featureType) { score += 0.25; }
            if (Math.abs(job1.tolerance - job2.tolerance) < 0.01) { score += 0.2; }
            if (job1.toolType === job2.toolType) { score += 0.15; }
            if (job1.machine === job2.machine) { score += 0.1; }

            return score;
        }
    },
    // Recommendation engine
    recommendations: {
        getRecommendation: function(category, input) {
            const experience = PRISM_UNIFIED_LEARNING_ENGINE.experienceDB.getExperience(category, input);

            if (!experience || experience.samples.length < 3) {
                return { type: 'default', confidence: 0.5, source: 'database' };
            }
            // Find best performing parameters
            const sortedSamples = experience.samples.sort((a, b) => b.result - a.result);
            const bestSample = sortedSamples[0];

            return {
                type: 'learned',
                parameters: bestSample.output,
                confidence: Math.min(0.95, 0.6 + experience.samples.length * 0.05),
                source: 'experience',
                sampleCount: experience.samples.length
            };
        },
        // Combine multiple sources
        combineRecommendations: function(sources) {
            const weights = {
                manufacturer: 0.3,
                experience: 0.4,
                simulation: 0.2,
                default: 0.1
            };
            const combined = {};
            let totalWeight = 0;

            for (const source of sources) {
                const weight = weights[source.type] || 0.1;
                totalWeight += weight;

                for (const [param, value] of Object.entries(source.parameters)) {
                    combined[param] = (combined[param] || 0) + value * weight;
                }
            }
            // Normalize
            for (const param of Object.keys(combined)) {
                combined[param] /= totalWeight;
            }
            return combined;
        }
    },
    // Continuous improvement
    continuousImprovement: {
        trackMetric: function(metric, value, target) {
            return {
                metric,
                value,
                target,
                performance: value <= target ? 'met' : 'missed',
                gap: target - value
            };
        },
        generateImprovementPlan: function(metrics) {
            const improvements = [];

            for (const m of metrics) {
                if (m.performance === 'missed') {
                    improvements.push({
                        metric: m.metric,
                        currentGap: m.gap,
                        suggestedAction: this.getSuggestedAction(m.metric, m.gap)
                    });
                }
            }
            return improvements.sort((a, b) => Math.abs(b.currentGap) - Math.abs(a.currentGap));
        },
        getSuggestedAction: function(metric, gap) {
            const actions = {
                cycleTime: gap > 0 ? "Increase feed rates or optimize toolpath" : "Current parameters optimal",
                surfaceFinish: gap > 0 ? "Reduce stepover or increase spindle speed" : "Current parameters optimal",
                toolWear: gap > 0 ? "Reduce cutting parameters or use coated tool" : "Current parameters optimal"
            };
            return actions[metric] || "Review parameters";
        }
    }
}