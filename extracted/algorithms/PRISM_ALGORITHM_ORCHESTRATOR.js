/**
 * PRISM_ALGORITHM_ORCHESTRATOR
 * Extracted from PRISM v8.89.002 monolith
 * References: 40
 * Category: core
 * Lines: 217
 * Session: R2.3.2 Algorithm Extraction
 */

const PRISM_ALGORITHM_ORCHESTRATOR = {
        version: '1.0.0',
        
        // Problem type patterns for auto-classification
        problemPatterns: {
            'speed_feed': ['speed', 'feed', 'cutting', 'sfm', 'rpm', 'ipm'],
            'tool_life': ['tool life', 'wear', 'taylor', 'tool change'],
            'chatter': ['chatter', 'vibration', 'stability', 'regenerative'],
            'scheduling': ['schedule', 'job', 'sequence', 'order', 'makespan'],
            'path_planning': ['path', 'route', 'toolpath', 'collision'],
            'optimization': ['optimize', 'minimize', 'maximize', 'best'],
            'prediction': ['predict', 'estimate', 'forecast', 'expected'],
            'classification': ['classify', 'categorize', 'identify', 'detect']
        },
        
        /**
         * Classify a problem from natural language description
         */
        classifyProblem: function(description) {
            const desc = description.toLowerCase();
            const problem = {
                type: 'general',
                multiObjective: desc.includes('multi') && desc.includes('objective'),
                continuous: !desc.includes('discrete') && !desc.includes('integer'),
                discrete: desc.includes('discrete') || desc.includes('sequence'),
                hasGradient: desc.includes('gradient') || desc.includes('derivative'),
                noGradient: desc.includes('black box') || desc.includes('no gradient'),
                largeDataset: desc.includes('large') || desc.includes('big data'),
                smallDataset: desc.includes('small') || desc.includes('few samples'),
                needsUncertainty: desc.includes('uncertainty') || desc.includes('confidence'),
                realTime: desc.includes('real-time') || desc.includes('fast'),
                constraints: desc.includes('constraint') || desc.includes('subject to')
            };
            
            // Classify problem type
            for (const [type, keywords] of Object.entries(this.problemPatterns)) {
                if (keywords.some(kw => desc.includes(kw))) {
                    problem.type = type;
                    break;
                }
            }
            
            // Set type-specific flags
            switch (problem.type) {
                case 'speed_feed':
                    problem.multiObjective = true;
                    problem.continuous = true;
                    break;
                case 'tool_life':
                    problem.toolLifePrediction = true;
                    problem.needsUncertainty = true;
                    break;
                case 'chatter':
                    problem.chatterPrediction = true;
                    problem.frequencyDomain = true;
                    break;
                case 'scheduling':
                    problem.discrete = true;
                    problem.combinatorial = true;
                    problem.constraints = true;
                    break;
                case 'path_planning':
                    problem.pathFinding = true;
                    problem.obstacles = true;
                    break;
            }
            
            return problem;
        },
        
        /**
         * Recommend algorithms for a problem
         */
        recommendAlgorithms: function(problemOrDescription, topN = 5) {
            let problem = problemOrDescription;
            
            // If string, classify first
            if (typeof problemOrDescription === 'string') {
                problem = this.classifyProblem(problemOrDescription);
            }
            
            return PRISM_ALGORITHM_REGISTRY.findBestMatch(problem, topN);
        },
        
        /**
         * Auto-select and execute best algorithm
         */
        autoSolve: function(problemDescription, data) {
            const problem = this.classifyProblem(problemDescription);
            const recommendations = this.recommendAlgorithms(problem, 1);
            
            if (recommendations.length === 0) {
                console.warn('[ORCHESTRATOR] No matching algorithm found');
                return null;
            }
            
            const best = recommendations[0];
            console.log(`[ORCHESTRATOR] Selected: ${best.name} (score: ${best.score})`);
            
            // Execute via gateway if available
            if (best.gateway && typeof PRISM_GATEWAY !== 'undefined') {
                try {
                    const result = PRISM_GATEWAY.call(best.gateway, data);
                    
                    // Record for learning
                    if (typeof PRISM_AI_LEARNING_PIPELINE !== 'undefined') {
                        PRISM_AI_LEARNING_PIPELINE.recordOutcome({
                            recommendationType: 'algorithm_selection',
                            recommended: { algorithm: best.id, score: best.score },
                            problem: problem,
                            timestamp: Date.now()
                        });
                    }
                    
                    return {
                        algorithm: best,
                        result: result,
                        problem: problem
                    };
                } catch (e) {
                    console.error(`[ORCHESTRATOR] Execution failed: ${e.message}`);
                    return { algorithm: best, error: e.message, problem: problem };
                }
            }
            
            return { algorithm: best, problem: problem, message: 'Gateway route not available' };
        },
        
        /**
         * Execute multiple algorithms and ensemble results
         */
        ensembleSolve: function(problemDescription, data, topN = 3) {
            const problem = this.classifyProblem(problemDescription);
            const recommendations = this.recommendAlgorithms(problem, topN);
            
            if (recommendations.length === 0) {
                return null;
            }
            
            const results = [];
            for (const alg of recommendations) {
                if (alg.gateway && typeof PRISM_GATEWAY !== 'undefined') {
                    try {
                        const result = PRISM_GATEWAY.call(alg.gateway, data);
                        results.push({
                            algorithm: alg,
                            result: result,
                            weight: alg.score / recommendations[0].score
                        });
                    } catch (e) {
                        console.warn(`[ORCHESTRATOR] ${alg.name} failed: ${e.message}`);
                    }
                }
            }
            
            if (results.length === 0) {
                return { recommendations, message: 'No algorithms could be executed' };
            }
            
            // Combine results
            const combined = PRISM_ALGORITHM_ENSEMBLER.combine(results, problem.type);
            
            return {
                combined: combined,
                individual: results,
                problem: problem
            };
        },
        
        /**
         * Get algorithm recommendation explanation
         */
        explainRecommendation: function(problemDescription) {
            const problem = this.classifyProblem(problemDescription);
            const recommendations = this.recommendAlgorithms(problem, 5);
            
            const explanation = {
                problemAnalysis: problem,
                recommendations: recommendations.map(r => ({
                    algorithm: r.name,
                    score: r.score,
                    gateway: r.gateway,
                    useCases: r.useCases,
                    characteristics: r.characteristics
                })),
                reasoning: this._generateReasoning(problem, recommendations)
            };
            
            return explanation;
        },
        
        _generateReasoning: function(problem, recommendations) {
            const reasons = [];
            
            if (recommendations.length === 0) {
                return 'No suitable algorithms found for this problem type.';
            }
            
            const top = recommendations[0];
            reasons.push(`Selected ${top.name} as the primary recommendation.`);
            
            if (problem.multiObjective) {
                reasons.push('Problem involves multiple objectives, favoring multi-objective optimizers.');
            }
            if (problem.needsUncertainty) {
                reasons.push('Uncertainty quantification needed, favoring Bayesian/probabilistic methods.');
            }
            if (problem.realTime) {
                reasons.push('Real-time requirement, favoring low-latency algorithms.');
            }
            if (problem.constraints) {
                reasons.push('Constraints present, favoring constraint-aware solvers.');
            }
            
            return reasons.join(' ');
        }
    }