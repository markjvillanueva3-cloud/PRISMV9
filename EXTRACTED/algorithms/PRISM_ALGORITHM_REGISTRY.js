/**
 * PRISM_ALGORITHM_REGISTRY
 * Extracted from PRISM v8.89.002 monolith
 * References: 38
 * Category: core
 * Lines: 3559
 * Session: R2.3.2 Algorithm Extraction
 */

const PRISM_ALGORITHM_REGISTRY = {
        version: '1.0.0',
        totalAlgorithms: 210,
        
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 1: OPTIMIZATION ALGORITHMS (28)
        // Sources: MIT 15.084j, 15.099, 18.086, 6.034
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        optimization: {
            // Metaheuristic Optimization
            pso: {
                id: 'pso',
                name: 'Particle Swarm Optimization',
                category: 'optimization',
                subcategory: 'metaheuristic',
                gateway: 'ai.pso.optimize',
                source: 'MIT 15.099',
                complexity: 'O(n*p*i)',
                useCases: ['multi_objective', 'speed_feed', 'toolpath', 'parameter_tuning', 'continuous_optimization'],
                inputTypes: ['objective_function', 'bounds', 'constraints'],
                outputTypes: ['optimal_params', 'convergence_history', 'pareto_front'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    handlesConstraints: true,
                    multiObjective: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'medium',
                    accuracy: 'high'
                },
                parameters: {
                    particles: { default: 30, range: [10, 100] },
                    iterations: { default: 100, range: [50, 500] },
                    inertia: { default: 0.7, range: [0.4, 0.9] },
                    cognitive: { default: 1.5, range: [1.0, 2.0] },
                    social: { default: 1.5, range: [1.0, 2.0] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiObjective) score += 35;
                    if (problem.nonConvex) score += 25;
                    if (problem.noGradient) score += 20;
                    if (problem.continuous) score += 15;
                    if (problem.dimensions > 5) score += 10;
                    if (problem.type === 'speed_feed') score += 30;
                    return Math.min(score, 100);
                }
            },
            
            aco: {
                id: 'aco',
                name: 'Ant Colony Optimization',
                category: 'optimization',
                subcategory: 'metaheuristic',
                gateway: 'ai.aco.optimize',
                source: 'MIT 6.034',
                complexity: 'O(n²*a*i)',
                useCases: ['routing', 'sequencing', 'tsp', 'hole_drilling', 'operation_ordering', 'job_shop'],
                inputTypes: ['graph', 'distance_matrix', 'constraints'],
                outputTypes: ['optimal_sequence', 'path', 'tour_length'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    handlesConstraints: true,
                    discrete: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'slow',
                    accuracy: 'high'
                },
                parameters: {
                    ants: { default: 20, range: [10, 50] },
                    iterations: { default: 100, range: [50, 300] },
                    alpha: { default: 1.0, range: [0.5, 2.0] },
                    beta: { default: 2.0, range: [1.0, 5.0] },
                    evaporation: { default: 0.5, range: [0.1, 0.9] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.type === 'sequencing') score += 45;
                    if (problem.type === 'routing') score += 45;
                    if (problem.type === 'tsp') score += 50;
                    if (problem.discrete) score += 25;
                    if (problem.combinatorial) score += 25;
                    if (problem.graphBased) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            genetic: {
                id: 'genetic',
                name: 'Genetic Algorithm',
                category: 'optimization',
                subcategory: 'evolutionary',
                gateway: 'ai.genetic.evolve',
                source: 'MIT 6.034',
                complexity: 'O(p*g*f)',
                useCases: ['parameter_optimization', 'scheduling', 'toolpath_evolution', 'feature_selection', 'mixed_integer'],
                inputTypes: ['fitness_function', 'bounds', 'encoding'],
                outputTypes: ['best_individual', 'population_history', 'convergence'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    handlesConstraints: true,
                    mixedInteger: true,
                    computeCost: 'high',
                    convergenceSpeed: 'slow',
                    accuracy: 'medium'
                },
                parameters: {
                    population: { default: 50, range: [20, 200] },
                    generations: { default: 100, range: [50, 500] },
                    crossoverRate: { default: 0.8, range: [0.6, 0.95] },
                    mutationRate: { default: 0.1, range: [0.01, 0.3] },
                    elitism: { default: 2, range: [1, 10] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.mixedInteger) score += 35;
                    if (problem.multiModal) score += 30;
                    if (problem.noGradient) score += 20;
                    if (problem.largeSearchSpace) score += 20;
                    if (problem.type === 'scheduling') score += 25;
                    return Math.min(score, 100);
                }
            },
            
            simulatedAnnealing: {
                id: 'simulated_annealing',
                name: 'Simulated Annealing',
                category: 'optimization',
                subcategory: 'metaheuristic',
                gateway: 'opt.annealing',
                source: 'MIT 6.034',
                complexity: 'O(i)',
                useCases: ['discrete_optimization', 'combinatorial', 'escape_local_minima', 'scheduling'],
                inputTypes: ['objective_function', 'neighbor_function', 'initial_solution'],
                outputTypes: ['best_solution', 'temperature_history'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: false,
                    discrete: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'slow',
                    accuracy: 'medium'
                },
                parameters: {
                    initialTemp: { default: 1000, range: [100, 10000] },
                    coolingRate: { default: 0.995, range: [0.9, 0.999] },
                    iterations: { default: 10000, range: [1000, 100000] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.discrete) score += 35;
                    if (problem.manyLocalMinima) score += 35;
                    if (problem.noGradient) score += 20;
                    if (problem.combinatorial) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            // Gradient-Based Optimization
            gradientDescent: {
                id: 'gradient_descent',
                name: 'Gradient Descent',
                category: 'optimization',
                subcategory: 'first_order',
                gateway: 'opt.gradient.descent',
                source: 'MIT 18.086',
                complexity: 'O(n*i)',
                useCases: ['convex_optimization', 'neural_training', 'curve_fitting', 'regression'],
                inputTypes: ['objective_function', 'gradient_function', 'initial_point'],
                outputTypes: ['optimal_point', 'convergence_history'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: false,
                    parallelizable: false,
                    computeCost: 'low',
                    convergenceSpeed: 'fast',
                    accuracy: 'high'
                },
                parameters: {
                    learningRate: { default: 0.01, range: [0.0001, 0.1] },
                    maxIterations: { default: 1000, range: [100, 10000] },
                    tolerance: { default: 1e-6, range: [1e-10, 1e-4] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.convex) score += 50;
                    if (problem.hasGradient) score += 35;
                    if (problem.smooth) score += 20;
                    if (problem.largeDimensions) score -= 10;
                    return Math.min(Math.max(score, 0), 100);
                }
            },
            
            newton: {
                id: 'newton',
                name: 'Newton Method',
                category: 'optimization',
                subcategory: 'second_order',
                gateway: 'opt.newton',
                source: 'MIT 18.086',
                complexity: 'O(n³*i)',
                useCases: ['root_finding', 'small_optimization', 'nonlinear_equations', 'high_accuracy'],
                inputTypes: ['objective_function', 'gradient', 'hessian', 'initial_point'],
                outputTypes: ['optimal_point', 'convergence_history'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: false,
                    parallelizable: false,
                    computeCost: 'high',
                    convergenceSpeed: 'very_fast',
                    accuracy: 'very_high'
                },
                parameters: {
                    maxIterations: { default: 100, range: [10, 500] },
                    tolerance: { default: 1e-8, range: [1e-12, 1e-6] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.hasHessian) score += 40;
                    if (problem.dimensions < 10) score += 35;
                    if (problem.smooth) score += 20;
                    if (problem.needsHighAccuracy) score += 20;
                    if (problem.dimensions > 100) score -= 30;
                    return Math.min(Math.max(score, 0), 100);
                }
            },
            
            bfgs: {
                id: 'bfgs',
                name: 'BFGS Quasi-Newton',
                category: 'optimization',
                subcategory: 'quasi_newton',
                gateway: 'opt.bfgs',
                source: 'MIT 15.084j',
                complexity: 'O(n²*i)',
                useCases: ['medium_scale', 'neural_training', 'unconstrained', 'smooth_functions'],
                inputTypes: ['objective_function', 'gradient', 'initial_point'],
                outputTypes: ['optimal_point', 'inverse_hessian_approx'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: false,
                    parallelizable: false,
                    computeCost: 'medium',
                    convergenceSpeed: 'fast',
                    accuracy: 'high'
                },
                parameters: {
                    maxIterations: { default: 500, range: [100, 2000] },
                    tolerance: { default: 1e-6, range: [1e-10, 1e-4] }
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.hasGradient) score += 40;
                    if (problem.dimensions < 100) score += 30;
                    if (problem.smooth) score += 20;
                    if (!problem.hasHessian) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            conjugateGradient: {
                id: 'conjugate_gradient',
                name: 'Conjugate Gradient',
                category: 'optimization',
                subcategory: 'first_order',
                gateway: 'opt.cg',
                source: 'MIT 18.086',
                complexity: 'O(n*i)',
                useCases: ['large_sparse', 'linear_systems', 'quadratic_minimization'],
                inputTypes: ['matrix_A', 'vector_b', 'initial_guess'],
                outputTypes: ['solution_x', 'residual_history'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: false,
                    parallelizable: true,
                    computeCost: 'low',
                    convergenceSpeed: 'fast',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.sparse) score += 45;
                    if (problem.symmetric) score += 35;
                    if (problem.positiveDefinite) score += 30;
                    if (problem.linearSystem) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            trustRegion: {
                id: 'trust_region',
                name: 'Trust Region Method',
                category: 'optimization',
                subcategory: 'constrained',
                gateway: 'opt.trustregion.newton',
                source: 'MIT 15.084j',
                complexity: 'O(n³*i)',
                useCases: ['robust_optimization', 'ill_conditioned', 'nonlinear_least_squares'],
                inputTypes: ['objective_function', 'gradient', 'hessian', 'initial_point'],
                outputTypes: ['optimal_point', 'trust_radius_history'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: false,
                    parallelizable: false,
                    robust: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'fast',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.illConditioned) score += 45;
                    if (problem.needsRobustness) score += 35;
                    if (problem.hasHessian) score += 25;
                    if (problem.nonlinearLeastSquares) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            interiorPoint: {
                id: 'interior_point',
                name: 'Interior Point Method',
                category: 'optimization',
                subcategory: 'constrained',
                gateway: 'opt.interior',
                source: 'MIT 15.084j',
                complexity: 'O(n³*√n)',
                useCases: ['linear_programming', 'convex_optimization', 'inequality_constraints'],
                inputTypes: ['objective', 'equality_constraints', 'inequality_constraints'],
                outputTypes: ['optimal_point', 'lagrange_multipliers'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: false,
                    parallelizable: false,
                    handlesConstraints: true,
                    computeCost: 'high',
                    convergenceSpeed: 'fast',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.linearProgramming) score += 50;
                    if (problem.convex) score += 40;
                    if (problem.inequalityConstraints) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            simplex: {
                id: 'simplex',
                name: 'Simplex Algorithm',
                category: 'optimization',
                subcategory: 'linear',
                gateway: 'opt.lp.simplex',
                source: 'MIT 15.084j',
                complexity: 'O(2^n) worst, O(m*n) avg',
                useCases: ['linear_programming', 'resource_allocation', 'production_planning'],
                inputTypes: ['c_vector', 'A_matrix', 'b_vector'],
                outputTypes: ['optimal_x', 'optimal_value', 'basis'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: false,
                    computeCost: 'medium',
                    convergenceSpeed: 'fast',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.linearProgramming) score += 60;
                    if (problem.linear) score += 40;
                    if (problem.smallScale) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            differentialEvolution: {
                id: 'differential_evolution',
                name: 'Differential Evolution',
                category: 'optimization',
                subcategory: 'evolutionary',
                gateway: 'opt.de',
                source: 'MIT 15.099',
                complexity: 'O(p*g*n)',
                useCases: ['global_optimization', 'continuous', 'black_box'],
                inputTypes: ['objective_function', 'bounds'],
                outputTypes: ['optimal_point', 'convergence_history'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.continuous) score += 40;
                    if (problem.blackBox) score += 35;
                    if (problem.noGradient) score += 25;
                    if (problem.multiModal) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            bayesianOptimization: {
                id: 'bayesian_optimization',
                name: 'Bayesian Optimization',
                category: 'optimization',
                subcategory: 'surrogate',
                gateway: 'opt.bayesian',
                source: 'MIT 6.867',
                complexity: 'O(n³) per iteration',
                useCases: ['expensive_functions', 'hyperparameter_tuning', 'few_evaluations'],
                inputTypes: ['objective_function', 'bounds', 'prior'],
                outputTypes: ['optimal_point', 'uncertainty', 'surrogate_model'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: false,
                    sampleEfficient: true,
                    computeCost: 'low_evaluations',
                    convergenceSpeed: 'efficient',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.expensiveFunction) score += 50;
                    if (problem.fewEvaluations) score += 40;
                    if (problem.needsUncertainty) score += 25;
                    if (problem.blackBox) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            nelder_mead: {
                id: 'nelder_mead',
                name: 'Nelder-Mead Simplex',
                category: 'optimization',
                subcategory: 'derivative_free',
                gateway: 'opt.neldermead',
                source: 'MIT 18.086',
                complexity: 'O(n²*i)',
                useCases: ['small_dimension', 'noisy_functions', 'no_derivatives'],
                inputTypes: ['objective_function', 'initial_simplex'],
                outputTypes: ['optimal_point'],
                characteristics: {
                    globalOptimum: false,
                    gradientFree: true,
                    parallelizable: false,
                    computeCost: 'low',
                    convergenceSpeed: 'slow',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.noGradient) score += 40;
                    if (problem.dimensions < 10) score += 35;
                    if (problem.noisy) score += 25;
                    if (problem.dimensions > 20) score -= 30;
                    return Math.min(Math.max(score, 0), 100);
                }
            },
            
            // Multi-objective
            nsga2: {
                id: 'nsga2',
                name: 'NSGA-II',
                category: 'optimization',
                subcategory: 'multi_objective',
                gateway: 'opt.nsga2',
                source: 'MIT 15.099',
                complexity: 'O(m*n²)',
                useCases: ['multi_objective', 'pareto_front', 'conflicting_objectives'],
                inputTypes: ['objective_functions', 'bounds', 'constraints'],
                outputTypes: ['pareto_front', 'pareto_set'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    multiObjective: true,
                    computeCost: 'high',
                    convergenceSpeed: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiObjective) score += 60;
                    if (problem.objectives > 2) score += 30;
                    if (problem.needsParetoFront) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            moead: {
                id: 'moead',
                name: 'MOEA/D',
                category: 'optimization',
                subcategory: 'multi_objective',
                gateway: 'opt.moead',
                source: 'MIT 15.099',
                complexity: 'O(m*n*t)',
                useCases: ['many_objectives', 'decomposition', 'uniform_pareto'],
                inputTypes: ['objective_functions', 'weight_vectors', 'bounds'],
                outputTypes: ['pareto_front', 'weight_solutions'],
                characteristics: {
                    globalOptimum: true,
                    gradientFree: true,
                    parallelizable: true,
                    multiObjective: true,
                    manyObjectives: true,
                    computeCost: 'medium',
                    convergenceSpeed: 'fast',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiObjective) score += 50;
                    if (problem.objectives > 3) score += 40;
                    if (problem.needsUniformParetofront) score += 25;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 2: MACHINE LEARNING ALGORITHMS (45)
        // Sources: MIT 6.036, 6.867, Stanford CS229, MIT 15.773
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        machineLearning: {
            // Neural Networks
            neuralNetwork: {
                id: 'neural_network',
                name: 'Feedforward Neural Network',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.predict',
                source: 'MIT 6.036',
                useCases: ['pattern_recognition', 'regression', 'classification', 'function_approximation'],
                characteristics: {
                    requiresTraining: true,
                    dataHungry: true,
                    interpretable: false,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.largeDataset) score += 45;
                    if (problem.complexPatterns) score += 35;
                    if (problem.nonLinear) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            cnn: {
                id: 'cnn',
                name: 'Convolutional Neural Network',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.cnn',
                source: 'MIT 6.036',
                useCases: ['image_classification', 'feature_detection', 'visual_inspection'],
                characteristics: {
                    requiresTraining: true,
                    dataHungry: true,
                    spatial: true,
                    computeCost: 'very_high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.imageData) score += 60;
                    if (problem.spatial) score += 35;
                    if (problem.featureHierarchy) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            rnn: {
                id: 'rnn',
                name: 'Recurrent Neural Network',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.rnn',
                source: 'MIT 6.036',
                useCases: ['sequence_prediction', 'time_series', 'nlp'],
                characteristics: {
                    requiresTraining: true,
                    sequential: true,
                    memoryCapable: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.sequential) score += 50;
                    if (problem.timeSeries) score += 40;
                    if (problem.variableLength) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            lstm: {
                id: 'lstm',
                name: 'Long Short-Term Memory',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.lstm',
                source: 'MIT 15.773',
                useCases: ['long_sequences', 'time_series', 'machine_monitoring'],
                characteristics: {
                    requiresTraining: true,
                    sequential: true,
                    longTermMemory: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.longSequences) score += 55;
                    if (problem.timeSeries) score += 35;
                    if (problem.longTermDependencies) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            transformer: {
                id: 'transformer',
                name: 'Transformer (Attention)',
                category: 'ml',
                subcategory: 'deep_learning',
                gateway: 'ai.neural.transformer',
                source: 'MIT 15.773',
                useCases: ['nlp', 'sequence_to_sequence', 'attention_based'],
                characteristics: {
                    requiresTraining: true,
                    parallelizable: true,
                    attentionBased: true,
                    computeCost: 'very_high',
                    accuracy: 'state_of_art'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.nlp) score += 55;
                    if (problem.seq2seq) score += 40;
                    if (problem.largeDataset) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Probabilistic Models
            bayesianInference: {
                id: 'bayesian_inference',
                name: 'Bayesian Inference',
                category: 'ml',
                subcategory: 'probabilistic',
                gateway: 'ai.bayesian.predict',
                source: 'MIT 6.867',
                useCases: ['uncertainty_quantification', 'online_learning', 'small_data', 'prior_knowledge'],
                characteristics: {
                    requiresTraining: true,
                    dataHungry: false,
                    interpretable: true,
                    providesUncertainty: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.needsUncertainty) score += 45;
                    if (problem.smallDataset) score += 35;
                    if (problem.onlineLearning) score += 25;
                    if (problem.hasPrior) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            gaussianProcess: {
                id: 'gaussian_process',
                name: 'Gaussian Process Regression',
                category: 'ml',
                subcategory: 'probabilistic',
                gateway: 'ai.gp.predict',
                source: 'MIT 6.867',
                useCases: ['regression_uncertainty', 'bayesian_optimization', 'tool_life_prediction', 'surrogate_model'],
                characteristics: {
                    requiresTraining: true,
                    dataHungry: false,
                    interpretable: true,
                    providesUncertainty: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.needsConfidenceInterval) score += 45;
                    if (problem.smallDataset) score += 30;
                    if (problem.regression) score += 25;
                    if (problem.surrogate) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            hmm: {
                id: 'hmm',
                name: 'Hidden Markov Model',
                category: 'ml',
                subcategory: 'probabilistic',
                gateway: 'ai.hmm.predict',
                source: 'MIT 6.867',
                useCases: ['sequence_labeling', 'tool_condition_monitoring', 'state_estimation'],
                characteristics: {
                    requiresTraining: true,
                    sequential: true,
                    probabilistic: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.hiddenStates) score += 50;
                    if (problem.sequential) score += 35;
                    if (problem.markovian) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Clustering
            kmeans: {
                id: 'kmeans',
                name: 'K-Means Clustering',
                category: 'ml',
                subcategory: 'clustering',
                gateway: 'ai.cluster.kmeans',
                source: 'Stanford CS229',
                useCases: ['partitioning', 'vector_quantization', 'segmentation'],
                characteristics: {
                    requiresTraining: false,
                    unsupervised: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.knownClusters) score += 45;
                    if (problem.sphericalClusters) score += 35;
                    if (problem.largeDataset) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            dbscan: {
                id: 'dbscan',
                name: 'DBSCAN Clustering',
                category: 'ml',
                subcategory: 'clustering',
                gateway: 'ai.cluster.dbscan',
                source: 'Stanford CS229',
                useCases: ['anomaly_detection', 'grouping', 'noise_filtering', 'arbitrary_shapes'],
                characteristics: {
                    requiresTraining: false,
                    unsupervised: true,
                    handlesNoise: true,
                    arbitraryShapes: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.unknownClusters) score += 45;
                    if (problem.hasNoise) score += 35;
                    if (problem.arbitraryShape) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            hierarchical: {
                id: 'hierarchical_clustering',
                name: 'Hierarchical Clustering',
                category: 'ml',
                subcategory: 'clustering',
                gateway: 'ai.cluster.hierarchical',
                source: 'Stanford CS229',
                useCases: ['dendrogram', 'taxonomy', 'nested_structure'],
                characteristics: {
                    requiresTraining: false,
                    unsupervised: true,
                    deterministic: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.needsDendrogram) score += 50;
                    if (problem.hierarchical) score += 40;
                    if (problem.smallDataset) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            tSNE: {
                id: 'tsne',
                name: 't-SNE Dimensionality Reduction',
                category: 'ml',
                subcategory: 'dimensionality',
                gateway: 'ai.reduce.tsne',
                source: 'Stanford CS229',
                useCases: ['visualization', 'high_dimensional', 'cluster_discovery'],
                characteristics: {
                    requiresTraining: false,
                    nonLinear: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.visualization) score += 50;
                    if (problem.highDimensional) score += 40;
                    if (problem.clusterDiscovery) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            pca: {
                id: 'pca',
                name: 'Principal Component Analysis',
                category: 'ml',
                subcategory: 'dimensionality',
                gateway: 'ai.reduce.pca',
                source: 'MIT 18.086',
                useCases: ['dimensionality_reduction', 'feature_extraction', 'noise_reduction'],
                characteristics: {
                    requiresTraining: false,
                    linear: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.dimensionalityReduction) score += 45;
                    if (problem.linear) score += 30;
                    if (problem.varianceCapture) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Reinforcement Learning
            sarsa: {
                id: 'sarsa',
                name: 'SARSA',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.sarsa',
                source: 'Stanford CS229',
                useCases: ['online_control', 'safe_exploration', 'adaptive_machining'],
                characteristics: {
                    requiresTraining: true,
                    onPolicy: true,
                    tabular: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.safeExploration) score += 45;
                    if (problem.onlineControl) score += 35;
                    if (problem.discreteStates) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            qLearning: {
                id: 'q_learning',
                name: 'Q-Learning',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.qlearning',
                source: 'Stanford CS229',
                useCases: ['control', 'off_policy', 'optimal_policy'],
                characteristics: {
                    requiresTraining: true,
                    offPolicy: true,
                    tabular: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.offPolicy) score += 45;
                    if (problem.discreteActions) score += 35;
                    if (problem.optimalPolicy) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            dqn: {
                id: 'dqn',
                name: 'Deep Q-Network',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.dqn',
                source: 'MIT 6.036',
                useCases: ['complex_control', 'high_dimensional_state', 'game_playing'],
                characteristics: {
                    requiresTraining: true,
                    offPolicy: true,
                    deepLearning: true,
                    computeCost: 'very_high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highDimensionalState) score += 50;
                    if (problem.discreteActions) score += 30;
                    if (problem.experienceReplay) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            actorCritic: {
                id: 'actor_critic',
                name: 'Actor-Critic',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.actorcritic',
                source: 'MIT 6.036',
                useCases: ['continuous_control', 'policy_gradient', 'adaptive_machining'],
                characteristics: {
                    requiresTraining: true,
                    policyBased: true,
                    valueBased: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.continuousActions) score += 50;
                    if (problem.policyGradient) score += 35;
                    if (problem.varianceReduction) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            ppo: {
                id: 'ppo',
                name: 'Proximal Policy Optimization',
                category: 'ml',
                subcategory: 'reinforcement',
                gateway: 'ai.rl.ppo',
                source: 'Stanford CS229',
                useCases: ['robust_policy', 'continuous_control', 'robotics'],
                characteristics: {
                    requiresTraining: true,
                    policyBased: true,
                    robust: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.robotics) score += 50;
                    if (problem.continuousActions) score += 40;
                    if (problem.needsRobustness) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Bandits
            thompsonSampling: {
                id: 'thompson_sampling',
                name: 'Thompson Sampling',
                category: 'ml',
                subcategory: 'bandit',
                gateway: 'ai.bandit.thompson',
                source: 'MIT 6.867',
                useCases: ['exploration_exploitation', 'ab_testing', 'parameter_selection'],
                characteristics: {
                    requiresTraining: false,
                    onlineLearning: true,
                    bayesian: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.explorationExploitation) score += 55;
                    if (problem.onlineDecision) score += 35;
                    if (problem.multiArmed) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            ucb: {
                id: 'ucb',
                name: 'Upper Confidence Bound',
                category: 'ml',
                subcategory: 'bandit',
                gateway: 'ai.bandit.ucb',
                source: 'MIT 6.867',
                useCases: ['exploration_exploitation', 'optimism', 'regret_minimization'],
                characteristics: {
                    requiresTraining: false,
                    onlineLearning: true,
                    deterministic: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.explorationExploitation) score += 50;
                    if (problem.regretMinimization) score += 35;
                    if (problem.deterministic) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Classification
            decisionTree: {
                id: 'decision_tree',
                name: 'Decision Tree',
                category: 'ml',
                subcategory: 'classification',
                gateway: 'ai.classify.tree',
                source: 'Stanford CS229',
                useCases: ['classification', 'interpretable', 'feature_importance'],
                characteristics: {
                    requiresTraining: true,
                    interpretable: true,
                    handlesNonLinear: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.needsInterpretability) score += 50;
                    if (problem.classification) score += 35;
                    if (problem.categoricalFeatures) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            randomForest: {
                id: 'random_forest',
                name: 'Random Forest',
                category: 'ml',
                subcategory: 'ensemble',
                gateway: 'ai.classify.forest',
                source: 'Stanford CS229',
                useCases: ['classification', 'regression', 'feature_importance', 'robust'],
                characteristics: {
                    requiresTraining: true,
                    ensemble: true,
                    robust: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.classification) score += 40;
                    if (problem.regression) score += 35;
                    if (problem.featureImportance) score += 25;
                    if (problem.robust) score += 20;
                    return Math.min(score, 100);
                }
            },
            
            svm: {
                id: 'svm',
                name: 'Support Vector Machine',
                category: 'ml',
                subcategory: 'classification',
                gateway: 'ai.classify.svm',
                source: 'Stanford CS229',
                useCases: ['classification', 'high_dimensional', 'kernel_methods'],
                characteristics: {
                    requiresTraining: true,
                    kernelBased: true,
                    maxMargin: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highDimensional) score += 45;
                    if (problem.classification) score += 35;
                    if (problem.smallDataset) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            knn: {
                id: 'knn',
                name: 'K-Nearest Neighbors',
                category: 'ml',
                subcategory: 'instance',
                gateway: 'ai.classify.knn',
                source: 'Stanford CS229',
                useCases: ['classification', 'regression', 'simple_baseline'],
                characteristics: {
                    requiresTraining: false,
                    instanceBased: true,
                    lazy: true,
                    computeCost: 'low_train_high_predict',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.simpleBaseline) score += 40;
                    if (problem.smallDataset) score += 35;
                    if (problem.lowDimensional) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            naiveBayes: {
                id: 'naive_bayes',
                name: 'Naive Bayes',
                category: 'ml',
                subcategory: 'probabilistic',
                gateway: 'ai.classify.naivebayes',
                source: 'Stanford CS229',
                useCases: ['text_classification', 'spam_detection', 'fast_baseline'],
                characteristics: {
                    requiresTraining: true,
                    probabilistic: true,
                    fast: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.textClassification) score += 50;
                    if (problem.fastBaseline) score += 35;
                    if (problem.independentFeatures) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Ensemble Methods
            gradientBoosting: {
                id: 'gradient_boosting',
                name: 'Gradient Boosting',
                category: 'ml',
                subcategory: 'ensemble',
                gateway: 'ai.ensemble.gbm',
                source: 'Stanford CS229',
                useCases: ['classification', 'regression', 'feature_importance', 'tabular_data'],
                characteristics: {
                    requiresTraining: true,
                    ensemble: true,
                    sequential: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.tabularData) score += 50;
                    if (problem.classification) score += 35;
                    if (problem.needsAccuracy) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            xgboost: {
                id: 'xgboost',
                name: 'XGBoost',
                category: 'ml',
                subcategory: 'ensemble',
                gateway: 'ai.ensemble.xgboost',
                source: 'Stanford CS229',
                useCases: ['classification', 'regression', 'kaggle_winning', 'structured_data'],
                characteristics: {
                    requiresTraining: true,
                    ensemble: true,
                    regularized: true,
                    computeCost: 'medium',
                    accuracy: 'state_of_art'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.structuredData) score += 55;
                    if (problem.classification) score += 35;
                    if (problem.needsAccuracy) score += 25;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 3: SIGNAL PROCESSING ALGORITHMS (18)
        // Sources: MIT 18.086, 6.003, 2.830
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        signal: {
            fft: {
                id: 'fft',
                name: 'Fast Fourier Transform',
                category: 'signal',
                subcategory: 'frequency',
                gateway: 'signal.fft.analyze',
                source: 'MIT 18.086',
                complexity: 'O(n log n)',
                useCases: ['vibration_analysis', 'chatter_detection', 'frequency_spectrum', 'filtering'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.frequencyDomain) score += 55;
                    if (problem.periodicSignal) score += 35;
                    if (problem.chatterAnalysis) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            ifft: {
                id: 'ifft',
                name: 'Inverse FFT',
                category: 'signal',
                subcategory: 'frequency',
                gateway: 'signal.ifft',
                source: 'MIT 18.086',
                complexity: 'O(n log n)',
                useCases: ['frequency_filtering', 'signal_synthesis', 'convolution'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.frequencyToTime) score += 55;
                    if (problem.filtering) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            stft: {
                id: 'stft',
                name: 'Short-Time Fourier Transform',
                category: 'signal',
                subcategory: 'time_frequency',
                gateway: 'signal.stft',
                source: 'MIT 18.086',
                useCases: ['time_varying_spectrum', 'spectrogram', 'transient_analysis'],
                characteristics: {
                    realTime: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.timeVaryingFrequency) score += 55;
                    if (problem.spectrogram) score += 40;
                    if (problem.transient) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            wavelet: {
                id: 'wavelet',
                name: 'Discrete Wavelet Transform',
                category: 'signal',
                subcategory: 'time_frequency',
                gateway: 'signal.dwt',
                source: 'MIT 18.086',
                useCases: ['multiresolution', 'denoising', 'compression', 'transient_detection'],
                characteristics: {
                    realTime: true,
                    multiResolution: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiResolution) score += 50;
                    if (problem.transientDetection) score += 40;
                    if (problem.denoising) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            kalmanFilter: {
                id: 'kalman_filter',
                name: 'Kalman Filter',
                category: 'signal',
                subcategory: 'estimation',
                gateway: 'ai.kalman.filter',
                source: 'MIT 6.231',
                useCases: ['state_estimation', 'sensor_fusion', 'tool_wear_tracking', 'noise_filtering'],
                characteristics: {
                    realTime: true,
                    optimal: true,
                    computeCost: 'low',
                    accuracy: 'optimal_linear'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.stateEstimation) score += 45;
                    if (problem.noisyMeasurements) score += 35;
                    if (problem.linearSystem) score += 25;
                    if (problem.sensorFusion) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            extendedKalman: {
                id: 'extended_kalman',
                name: 'Extended Kalman Filter',
                category: 'signal',
                subcategory: 'estimation',
                gateway: 'ai.kalman.ekf',
                source: 'MIT 16.410',
                useCases: ['nonlinear_estimation', 'robot_localization', 'adaptive_control'],
                characteristics: {
                    realTime: true,
                    handlesNonlinear: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.nonlinearSystem) score += 50;
                    if (problem.stateEstimation) score += 35;
                    if (problem.realTime) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            unscentedKalman: {
                id: 'unscented_kalman',
                name: 'Unscented Kalman Filter',
                category: 'signal',
                subcategory: 'estimation',
                gateway: 'ai.kalman.ukf',
                source: 'MIT 16.410',
                useCases: ['highly_nonlinear', 'no_jacobian_needed', 'better_accuracy'],
                characteristics: {
                    realTime: true,
                    handlesNonlinear: true,
                    noJacobian: true,
                    computeCost: 'medium',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highlyNonlinear) score += 55;
                    if (problem.noJacobian) score += 35;
                    if (problem.stateEstimation) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            particleFilter: {
                id: 'particle_filter',
                name: 'Particle Filter',
                category: 'signal',
                subcategory: 'estimation',
                gateway: 'ai.filter.particle',
                source: 'MIT 16.410',
                useCases: ['non_gaussian', 'multimodal', 'robot_localization'],
                characteristics: {
                    realTime: false,
                    handlesNonGaussian: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.nonGaussian) score += 55;
                    if (problem.multimodal) score += 40;
                    if (problem.nonlinearSystem) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            lowpassFilter: {
                id: 'lowpass_filter',
                name: 'Lowpass Filter',
                category: 'signal',
                subcategory: 'filtering',
                gateway: 'signal.filter.lowpass',
                source: 'MIT 6.003',
                useCases: ['noise_removal', 'smoothing', 'antialiasing'],
                characteristics: {
                    realTime: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.noiseRemoval) score += 50;
                    if (problem.smoothing) score += 40;
                    if (problem.highFrequencyNoise) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            highpassFilter: {
                id: 'highpass_filter',
                name: 'Highpass Filter',
                category: 'signal',
                subcategory: 'filtering',
                gateway: 'signal.filter.highpass',
                source: 'MIT 6.003',
                useCases: ['dc_removal', 'edge_detection', 'trend_removal'],
                characteristics: {
                    realTime: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.dcRemoval) score += 50;
                    if (problem.trendRemoval) score += 40;
                    if (problem.edgeDetection) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            bandpassFilter: {
                id: 'bandpass_filter',
                name: 'Bandpass Filter',
                category: 'signal',
                subcategory: 'filtering',
                gateway: 'signal.filter.bandpass',
                source: 'MIT 6.003',
                useCases: ['frequency_isolation', 'tooth_pass_frequency', 'resonance_analysis'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.frequencyIsolation) score += 55;
                    if (problem.resonanceAnalysis) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            notchFilter: {
                id: 'notch_filter',
                name: 'Notch Filter',
                category: 'signal',
                subcategory: 'filtering',
                gateway: 'signal.filter.notch',
                source: 'MIT 6.003',
                useCases: ['frequency_removal', 'powerline_rejection', 'harmonic_removal'],
                characteristics: {
                    realTime: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.frequencyRemoval) score += 55;
                    if (problem.harmonicRejection) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            hilbertTransform: {
                id: 'hilbert_transform',
                name: 'Hilbert Transform',
                category: 'signal',
                subcategory: 'analysis',
                gateway: 'signal.hilbert',
                source: 'MIT 18.086',
                useCases: ['envelope_detection', 'instantaneous_frequency', 'analytic_signal'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.envelopeDetection) score += 55;
                    if (problem.instantaneousFrequency) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            crossCorrelation: {
                id: 'cross_correlation',
                name: 'Cross-Correlation',
                category: 'signal',
                subcategory: 'analysis',
                gateway: 'signal.xcorr',
                source: 'MIT 18.086',
                useCases: ['time_delay_estimation', 'pattern_matching', 'similarity'],
                characteristics: {
                    realTime: false,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.timeDelayEstimation) score += 55;
                    if (problem.patternMatching) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            autoCorrelation: {
                id: 'auto_correlation',
                name: 'Autocorrelation',
                category: 'signal',
                subcategory: 'analysis',
                gateway: 'signal.acorr',
                source: 'MIT 18.086',
                useCases: ['periodicity_detection', 'pitch_detection', 'self_similarity'],
                characteristics: {
                    realTime: false,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.periodicityDetection) score += 55;
                    if (problem.pitchDetection) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            psd: {
                id: 'psd',
                name: 'Power Spectral Density',
                category: 'signal',
                subcategory: 'frequency',
                gateway: 'signal.psd',
                source: 'MIT 2.830',
                useCases: ['power_distribution', 'vibration_analysis', 'noise_characterization'],
                characteristics: {
                    realTime: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.powerDistribution) score += 50;
                    if (problem.vibrationAnalysis) score += 40;
                    if (problem.noiseCharacterization) score += 30;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 4: PHYSICS & MANUFACTURING ALGORITHMS (30)
        // Sources: MIT 2.008, 2.830, 2.875
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        physics: {
            // Cutting Physics
            merchantCutting: {
                id: 'merchant_cutting',
                name: 'Merchant Cutting Force Model',
                category: 'physics',
                subcategory: 'cutting',
                gateway: 'physics.force.merchant',
                source: 'MIT 2.008',
                useCases: ['cutting_force_prediction', 'power_estimation', 'tool_deflection'],
                characteristics: {
                    physicsBased: true,
                    analytical: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.forcePrediction) score += 55;
                    if (problem.orthogonalCutting) score += 35;
                    if (problem.powerEstimation) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            kienzleCutting: {
                id: 'kienzle_cutting',
                name: 'Kienzle Cutting Force',
                category: 'physics',
                subcategory: 'cutting',
                gateway: 'physics.force.kienzle',
                source: 'MIT 2.008',
                useCases: ['milling_forces', 'turning_forces', 'empirical_prediction'],
                characteristics: {
                    empirical: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.millingForce) score += 50;
                    if (problem.turningForce) score += 50;
                    if (problem.empirical) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            taylorToolLife: {
                id: 'taylor_tool_life',
                name: 'Taylor Tool Life Equation',
                category: 'physics',
                subcategory: 'tool_wear',
                gateway: 'physics.toollife.taylor',
                source: 'MIT 2.008',
                useCases: ['tool_life_prediction', 'cutting_speed_selection', 'cost_optimization'],
                characteristics: {
                    empirical: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.toolLifePrediction) score += 55;
                    if (problem.cuttingSpeedSelection) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            extendedTaylor: {
                id: 'extended_taylor',
                name: 'Extended Taylor Tool Life',
                category: 'physics',
                subcategory: 'tool_wear',
                gateway: 'physics.toollife.extended',
                source: 'MIT 2.008',
                useCases: ['tool_life_multivar', 'feed_effect', 'doc_effect'],
                characteristics: {
                    empirical: true,
                    multiVariable: true,
                    computeCost: 'very_low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.toolLifePrediction) score += 45;
                    if (problem.multipleParameters) score += 40;
                    if (problem.feedEffect) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Vibration & Stability
            stabilityLobes: {
                id: 'stability_lobes',
                name: 'Stability Lobe Diagram',
                category: 'physics',
                subcategory: 'vibration',
                gateway: 'physics.stability.lobes',
                source: 'MIT 2.830',
                useCases: ['chatter_prediction', 'spindle_speed_selection', 'depth_optimization'],
                characteristics: {
                    physicsBased: true,
                    frequencyDomain: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.chatterPrediction) score += 55;
                    if (problem.millingStability) score += 40;
                    if (problem.spindleSelection) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            chatterDetection: {
                id: 'chatter_detection',
                name: 'Chatter Detection Algorithm',
                category: 'physics',
                subcategory: 'vibration',
                gateway: 'physics.chatter.detect',
                source: 'MIT 2.830',
                useCases: ['real_time_monitoring', 'chatter_onset', 'quality_control'],
                characteristics: {
                    realTime: true,
                    signalBased: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.realTimeMonitoring) score += 50;
                    if (problem.chatterDetection) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            frf: {
                id: 'frf',
                name: 'Frequency Response Function',
                category: 'physics',
                subcategory: 'vibration',
                gateway: 'physics.frf',
                source: 'MIT 2.830',
                useCases: ['modal_analysis', 'system_identification', 'transfer_function'],
                characteristics: {
                    physicsBased: true,
                    frequencyDomain: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.modalAnalysis) score += 55;
                    if (problem.systemIdentification) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            modalAnalysis: {
                id: 'modal_analysis',
                name: 'Modal Analysis',
                category: 'physics',
                subcategory: 'vibration',
                gateway: 'physics.modal',
                source: 'MIT 2.830',
                useCases: ['natural_frequencies', 'mode_shapes', 'structural_dynamics'],
                characteristics: {
                    physicsBased: true,
                    eigenvalueBased: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.naturalFrequencies) score += 55;
                    if (problem.modeShapes) score += 40;
                    if (problem.structuralAnalysis) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Thermal
            cuttingTemperature: {
                id: 'cutting_temperature',
                name: 'Cutting Temperature Model',
                category: 'physics',
                subcategory: 'thermal',
                gateway: 'physics.thermal.cutting',
                source: 'MIT 2.008',
                useCases: ['temperature_prediction', 'tool_wear_thermal', 'coating_selection'],
                characteristics: {
                    physicsBased: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.temperaturePrediction) score += 55;
                    if (problem.thermalAnalysis) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            heatPartition: {
                id: 'heat_partition',
                name: 'Heat Partition Model',
                category: 'physics',
                subcategory: 'thermal',
                gateway: 'physics.thermal.partition',
                source: 'MIT 2.008',
                useCases: ['heat_distribution', 'chip_temperature', 'workpiece_heating'],
                characteristics: {
                    physicsBased: true,
                    computeCost: 'low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.heatDistribution) score += 55;
                    if (problem.thermalAnalysis) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Surface Quality
            surfaceRoughness: {
                id: 'surface_roughness',
                name: 'Surface Roughness Prediction',
                category: 'physics',
                subcategory: 'surface',
                gateway: 'physics.surface.roughness',
                source: 'MIT 2.008',
                useCases: ['ra_prediction', 'finish_quality', 'parameter_selection'],
                characteristics: {
                    empirical: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.surfaceFinish) score += 55;
                    if (problem.qualityPrediction) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Kinematics
            forwardKinematics: {
                id: 'forward_kinematics',
                name: 'Forward Kinematics (DH)',
                category: 'physics',
                subcategory: 'kinematics',
                gateway: 'physics.kinematics.fk',
                source: 'MIT 2.12',
                useCases: ['position_calculation', 'robot_control', '5axis_position'],
                characteristics: {
                    analytical: true,
                    computeCost: 'very_low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.positionCalculation) score += 55;
                    if (problem.robotKinematics) score += 40;
                    if (problem.fiveAxis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            inverseKinematics: {
                id: 'inverse_kinematics',
                name: 'Inverse Kinematics',
                category: 'physics',
                subcategory: 'kinematics',
                gateway: 'physics.kinematics.ik',
                source: 'MIT 2.12',
                useCases: ['joint_calculation', 'path_planning', '5axis_control'],
                characteristics: {
                    iterative: true,
                    multiSolution: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.jointCalculation) score += 55;
                    if (problem.robotControl) score += 40;
                    if (problem.fiveAxis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            jacobian: {
                id: 'jacobian',
                name: 'Jacobian Matrix',
                category: 'physics',
                subcategory: 'kinematics',
                gateway: 'physics.kinematics.jacobian',
                source: 'MIT 2.12',
                useCases: ['velocity_mapping', 'singularity_detection', 'force_transformation'],
                characteristics: {
                    analytical: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.velocityMapping) score += 50;
                    if (problem.singularityAnalysis) score += 45;
                    if (problem.forceAnalysis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            singularityCheck: {
                id: 'singularity_check',
                name: 'Singularity Detection',
                category: 'physics',
                subcategory: 'kinematics',
                gateway: 'physics.kinematics.singularity',
                source: 'MIT 2.12',
                useCases: ['singularity_avoidance', 'path_validation', 'safety'],
                characteristics: {
                    analytical: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.singularityDetection) score += 60;
                    if (problem.pathValidation) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Material Models
            johnsonCook: {
                id: 'johnson_cook',
                name: 'Johnson-Cook Material Model',
                category: 'physics',
                subcategory: 'material',
                gateway: 'physics.material.johnsoncook',
                source: 'MIT 2.008',
                useCases: ['flow_stress', 'machining_simulation', 'high_strain_rate'],
                characteristics: {
                    physicsBased: true,
                    temperatureDependent: true,
                    strainRateDependent: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.flowStress) score += 50;
                    if (problem.highStrainRate) score += 40;
                    if (problem.machiningSimulation) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            // Dynamics
            newtonEuler: {
                id: 'newton_euler',
                name: 'Newton-Euler Dynamics',
                category: 'physics',
                subcategory: 'dynamics',
                gateway: 'physics.dynamics.newtoneuler',
                source: 'MIT 2.12',
                useCases: ['robot_dynamics', 'torque_calculation', 'force_analysis'],
                characteristics: {
                    analytical: true,
                    recursive: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.torqueCalculation) score += 55;
                    if (problem.robotDynamics) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            lagrangian: {
                id: 'lagrangian',
                name: 'Lagrangian Dynamics',
                category: 'physics',
                subcategory: 'dynamics',
                gateway: 'physics.dynamics.lagrangian',
                source: 'MIT 2.12',
                useCases: ['energy_based', 'complex_mechanisms', 'constraint_handling'],
                characteristics: {
                    analytical: true,
                    energyBased: true,
                    computeCost: 'medium',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.energyBased) score += 50;
                    if (problem.complexMechanism) score += 40;
                    if (problem.constraintHandling) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            // MRR & Economics
            mrr: {
                id: 'mrr',
                name: 'Material Removal Rate',
                category: 'physics',
                subcategory: 'productivity',
                gateway: 'physics.mrr',
                source: 'MIT 2.008',
                useCases: ['productivity_calculation', 'cycle_time', 'cost_estimation'],
                characteristics: {
                    analytical: true,
                    computeCost: 'very_low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.productivityCalculation) score += 55;
                    if (problem.cycleTime) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            specificCuttingEnergy: {
                id: 'specific_cutting_energy',
                name: 'Specific Cutting Energy',
                category: 'physics',
                subcategory: 'cutting',
                gateway: 'physics.energy.specific',
                source: 'MIT 2.008',
                useCases: ['power_calculation', 'energy_efficiency', 'machine_sizing'],
                characteristics: {
                    empirical: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.powerCalculation) score += 55;
                    if (problem.machineSizing) score += 35;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 5: PLANNING & SEARCH ALGORITHMS (25)
        // Sources: MIT 6.034, 16.410, 6.006
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        planning: {
            // Graph Search
            aStar: {
                id: 'a_star',
                name: 'A* Search',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.astar',
                source: 'MIT 6.034',
                complexity: 'O(b^d)',
                useCases: ['path_planning', 'toolpath_generation', 'collision_avoidance', 'optimal_path'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    heuristicGuided: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.pathFinding) score += 55;
                    if (problem.hasHeuristic) score += 35;
                    if (problem.needsOptimal) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            dijkstra: {
                id: 'dijkstra',
                name: 'Dijkstra\'s Algorithm',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.dijkstra',
                source: 'MIT 6.006',
                complexity: 'O((V+E) log V)',
                useCases: ['shortest_path', 'routing', 'network_optimization'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.shortestPath) score += 55;
                    if (problem.noHeuristic) score += 30;
                    if (problem.graphBased) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            bfs: {
                id: 'bfs',
                name: 'Breadth-First Search',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.bfs',
                source: 'MIT 6.006',
                complexity: 'O(V+E)',
                useCases: ['shortest_unweighted', 'level_order', 'connectivity'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    computeCost: 'low',
                    accuracy: 'optimal_unweighted'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.unweighted) score += 50;
                    if (problem.shortestPath) score += 35;
                    if (problem.levelOrder) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            dfs: {
                id: 'dfs',
                name: 'Depth-First Search',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.dfs',
                source: 'MIT 6.006',
                complexity: 'O(V+E)',
                useCases: ['topological_sort', 'cycle_detection', 'maze_solving'],
                characteristics: {
                    optimal: false,
                    complete: true,
                    memoryEfficient: true,
                    computeCost: 'low',
                    accuracy: 'any_solution'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.topologicalSort) score += 55;
                    if (problem.cycleDetection) score += 45;
                    if (problem.memoryConstrained) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            idaStar: {
                id: 'ida_star',
                name: 'IDA* Search',
                category: 'planning',
                subcategory: 'search',
                gateway: 'plan.search.idastar',
                source: 'MIT 6.034',
                complexity: 'O(b^d)',
                useCases: ['memory_limited', 'optimal_path', 'large_state_space'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    memoryEfficient: true,
                    computeCost: 'high',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.memoryLimited) score += 55;
                    if (problem.needsOptimal) score += 35;
                    if (problem.largeStateSpace) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Motion Planning
            rrt: {
                id: 'rrt',
                name: 'Rapidly-exploring Random Tree',
                category: 'planning',
                subcategory: 'motion',
                gateway: 'plan.motion.rrt',
                source: 'MIT 16.410',
                useCases: ['motion_planning', 'high_dof', 'robot_path', 'collision_free'],
                characteristics: {
                    optimal: false,
                    complete: true,
                    randomized: true,
                    computeCost: 'medium',
                    accuracy: 'good'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highDimensional) score += 50;
                    if (problem.continuousSpace) score += 35;
                    if (problem.obstacles) score += 25;
                    if (problem.motionPlanning) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            rrtStar: {
                id: 'rrt_star',
                name: 'RRT*',
                category: 'planning',
                subcategory: 'motion',
                gateway: 'plan.motion.rrtstar',
                source: 'MIT 16.410',
                useCases: ['optimal_motion', 'path_smoothing', 'high_quality_path'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    randomized: true,
                    computeCost: 'high',
                    accuracy: 'optimal_asymptotic'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.optimalMotion) score += 55;
                    if (problem.highDimensional) score += 35;
                    if (problem.pathQuality) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            prm: {
                id: 'prm',
                name: 'Probabilistic Roadmap',
                category: 'planning',
                subcategory: 'motion',
                gateway: 'plan.motion.prm',
                source: 'MIT 16.410',
                useCases: ['multi_query', 'static_environment', 'roadmap_construction'],
                characteristics: {
                    optimal: false,
                    multiQuery: true,
                    randomized: true,
                    computeCost: 'high_build_low_query',
                    accuracy: 'good'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multiQuery) score += 55;
                    if (problem.staticEnvironment) score += 35;
                    if (problem.motionPlanning) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            potentialField: {
                id: 'potential_field',
                name: 'Potential Field Method',
                category: 'planning',
                subcategory: 'motion',
                gateway: 'motion.potential.plan',
                source: 'MIT 16.410',
                useCases: ['reactive_navigation', 'obstacle_avoidance', 'real_time'],
                characteristics: {
                    optimal: false,
                    realTime: true,
                    localMinima: true,
                    computeCost: 'very_low',
                    accuracy: 'medium'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.realTimeNavigation) score += 55;
                    if (problem.obstacleAvoidance) score += 40;
                    if (problem.reactive) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Constraint Satisfaction
            cspBacktracking: {
                id: 'csp_backtracking',
                name: 'CSP Backtracking',
                category: 'planning',
                subcategory: 'constraint',
                gateway: 'plan.csp.solve',
                source: 'MIT 6.034',
                useCases: ['scheduling', 'resource_allocation', 'fixture_planning', 'assignment'],
                characteristics: {
                    complete: true,
                    exact: true,
                    computeCost: 'variable',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.constraints) score += 55;
                    if (problem.discrete) score += 30;
                    if (problem.satisfiability) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            ac3: {
                id: 'ac3',
                name: 'Arc Consistency (AC-3)',
                category: 'planning',
                subcategory: 'constraint',
                gateway: 'plan.csp.ac3',
                source: 'MIT 6.034',
                useCases: ['constraint_propagation', 'domain_reduction', 'preprocessing'],
                characteristics: {
                    complete: false,
                    preprocessing: true,
                    computeCost: 'low',
                    accuracy: 'reduction'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.constraintPropagation) score += 55;
                    if (problem.binaryConstraints) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Decision Making
            mcts: {
                id: 'mcts',
                name: 'Monte Carlo Tree Search',
                category: 'planning',
                subcategory: 'decision',
                gateway: 'plan.search.mcts',
                source: 'Stanford CS229',
                useCases: ['decision_making', 'game_playing', 'process_planning', 'large_branching'],
                characteristics: {
                    anytime: true,
                    randomized: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.sequentialDecisions) score += 50;
                    if (problem.largeBranchingFactor) score += 35;
                    if (problem.simulationAvailable) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            valueIteration: {
                id: 'value_iteration',
                name: 'Value Iteration',
                category: 'planning',
                subcategory: 'mdp',
                gateway: 'plan.mdp.value',
                source: 'MIT 6.231',
                useCases: ['optimal_policy', 'mdp_solving', 'small_state_space'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.mdp) score += 55;
                    if (problem.discreteStates) score += 30;
                    if (problem.smallStateSpace) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            policyIteration: {
                id: 'policy_iteration',
                name: 'Policy Iteration',
                category: 'planning',
                subcategory: 'mdp',
                gateway: 'plan.mdp.policy',
                source: 'MIT 6.231',
                useCases: ['optimal_policy', 'faster_convergence', 'small_action_space'],
                characteristics: {
                    optimal: true,
                    complete: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.mdp) score += 50;
                    if (problem.smallActionSpace) score += 35;
                    if (problem.fasterConvergence) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            // Scheduling
            johnsonsRule: {
                id: 'johnsons_rule',
                name: 'Johnson\'s Rule',
                category: 'planning',
                subcategory: 'scheduling',
                gateway: 'plan.schedule.johnson',
                source: 'MIT 2.854',
                useCases: ['two_machine_flow', 'makespan_minimization', 'job_shop'],
                characteristics: {
                    optimal: true,
                    polynomial: true,
                    computeCost: 'very_low',
                    accuracy: 'optimal_2machine'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.twoMachineFlow) score += 65;
                    if (problem.makespanMinimization) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            criticalPath: {
                id: 'critical_path',
                name: 'Critical Path Method',
                category: 'planning',
                subcategory: 'scheduling',
                gateway: 'plan.schedule.cpm',
                source: 'MIT 2.854',
                useCases: ['project_scheduling', 'duration_estimation', 'slack_analysis'],
                characteristics: {
                    optimal: true,
                    deterministic: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.projectScheduling) score += 55;
                    if (problem.precedenceConstraints) score += 35;
                    if (problem.slackAnalysis) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            geneticScheduling: {
                id: 'genetic_scheduling',
                name: 'Genetic Algorithm Scheduling',
                category: 'planning',
                subcategory: 'scheduling',
                gateway: 'plan.schedule.genetic',
                source: 'MIT 2.854',
                useCases: ['job_shop', 'flexible_manufacturing', 'multi_objective'],
                characteristics: {
                    optimal: false,
                    heuristic: true,
                    computeCost: 'high',
                    accuracy: 'good'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.jobShop) score += 50;
                    if (problem.multiObjective) score += 35;
                    if (problem.complexConstraints) score += 25;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 6: CAD/GEOMETRY ALGORITHMS (25)
        // Sources: MIT 6.837, 18.086
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        geometry: {
            // NURBS & Curves
            nurbsEvaluate: {
                id: 'nurbs_evaluate',
                name: 'NURBS Curve/Surface Evaluation',
                category: 'geometry',
                subcategory: 'curves',
                gateway: 'cad.nurbs.evaluate',
                source: 'MIT 6.837',
                useCases: ['surface_modeling', 'toolpath_interpolation', 'geometry_creation'],
                characteristics: {
                    analytical: true,
                    exact: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.surfaceModeling) score += 55;
                    if (problem.curveEvaluation) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            bezierSubdivision: {
                id: 'bezier_subdivision',
                name: 'Bezier Subdivision',
                category: 'geometry',
                subcategory: 'curves',
                gateway: 'cad.bezier.subdivide',
                source: 'MIT 6.837',
                useCases: ['curve_refinement', 'intersection', 'rendering'],
                characteristics: {
                    exact: true,
                    recursive: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.curveRefinement) score += 55;
                    if (problem.intersection) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Triangulation
            delaunay: {
                id: 'delaunay',
                name: 'Delaunay Triangulation',
                category: 'geometry',
                subcategory: 'mesh',
                gateway: 'cad.mesh.delaunay',
                source: 'MIT 6.837',
                complexity: 'O(n log n)',
                useCases: ['mesh_generation', 'interpolation', 'surface_reconstruction'],
                characteristics: {
                    optimal: true,
                    maximizeMinAngle: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.meshGeneration) score += 55;
                    if (problem.triangulation) score += 40;
                    if (problem.interpolation) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            voronoi: {
                id: 'voronoi',
                name: 'Voronoi Diagram',
                category: 'geometry',
                subcategory: 'partitioning',
                gateway: 'cad.voronoi',
                source: 'MIT 6.837',
                complexity: 'O(n log n)',
                useCases: ['medial_axis', 'offset_curves', 'proximity_analysis'],
                characteristics: {
                    dual: true,
                    computeCost: 'medium',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.medialAxis) score += 55;
                    if (problem.offsetCurves) score += 40;
                    if (problem.proximityAnalysis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            convexHull: {
                id: 'convex_hull',
                name: 'Convex Hull',
                category: 'geometry',
                subcategory: 'computational',
                gateway: 'cad.hull.convex',
                source: 'MIT 6.837',
                complexity: 'O(n log n)',
                useCases: ['bounding_volume', 'collision_detection', 'shape_analysis'],
                characteristics: {
                    optimal: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.boundingVolume) score += 50;
                    if (problem.collisionDetection) score += 40;
                    if (problem.shapeAnalysis) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            // Intersection
            rayTriangle: {
                id: 'ray_triangle',
                name: 'Ray-Triangle Intersection',
                category: 'geometry',
                subcategory: 'intersection',
                gateway: 'cad.intersect.raytri',
                source: 'MIT 6.837',
                useCases: ['ray_tracing', 'collision_detection', 'picking'],
                characteristics: {
                    exact: true,
                    computeCost: 'very_low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.rayTracing) score += 55;
                    if (problem.collision) score += 40;
                    if (problem.picking) score += 30;
                    return Math.min(score, 100);
                }
            },
            
            surfaceSurface: {
                id: 'surface_surface',
                name: 'Surface-Surface Intersection',
                category: 'geometry',
                subcategory: 'intersection',
                gateway: 'cad.intersect.surfaces',
                source: 'MIT 6.837',
                useCases: ['boolean_operations', 'trim_curves', 'cad_modeling'],
                characteristics: {
                    iterative: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.booleanOperations) score += 55;
                    if (problem.trimCurves) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Collision Detection
            bvh: {
                id: 'bvh',
                name: 'Bounding Volume Hierarchy',
                category: 'geometry',
                subcategory: 'collision',
                gateway: 'cad.collision.bvh',
                source: 'MIT 6.837',
                useCases: ['collision_detection', 'ray_tracing', 'proximity_queries'],
                characteristics: {
                    hierarchical: true,
                    computeCost: 'low_query',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.collisionDetection) score += 55;
                    if (problem.rayTracing) score += 40;
                    if (problem.manyObjects) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            gjk: {
                id: 'gjk',
                name: 'GJK Algorithm',
                category: 'geometry',
                subcategory: 'collision',
                gateway: 'cad.collision.gjk',
                source: 'MIT 6.837',
                useCases: ['convex_collision', 'distance_computation', 'penetration_depth'],
                characteristics: {
                    iterative: true,
                    convexOnly: true,
                    computeCost: 'low',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.convexCollision) score += 60;
                    if (problem.distanceComputation) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Offset & Boolean
            polygonOffset: {
                id: 'polygon_offset',
                name: 'Polygon Offset',
                category: 'geometry',
                subcategory: 'offset',
                gateway: 'cad.offset.polygon',
                source: 'MIT 6.837',
                useCases: ['tool_compensation', 'contour_offset', 'pocket_toolpath'],
                characteristics: {
                    exact: true,
                    computeCost: 'medium',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.toolCompensation) score += 55;
                    if (problem.contourOffset) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            clipperBoolean: {
                id: 'clipper_boolean',
                name: 'Polygon Boolean Operations',
                category: 'geometry',
                subcategory: 'boolean',
                gateway: 'cad.boolean.polygon',
                source: 'MIT 6.837',
                useCases: ['union', 'intersection', 'difference', 'xor'],
                characteristics: {
                    exact: true,
                    robust: true,
                    computeCost: 'medium',
                    accuracy: 'exact'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.booleanOperations) score += 55;
                    if (problem.polygonOperations) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Graphics
            frustumCulling: {
                id: 'frustum_culling',
                name: 'Frustum Culling',
                category: 'geometry',
                subcategory: 'graphics',
                gateway: 'graphics.frustum.cullObjects',
                source: 'MIT 6.837',
                useCases: ['visibility_culling', 'rendering_optimization', 'scene_management'],
                characteristics: {
                    realTime: true,
                    computeCost: 'very_low',
                    accuracy: 'conservative'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.visibilityCulling) score += 60;
                    if (problem.renderingOptimization) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            rayTracing: {
                id: 'ray_tracing',
                name: 'Ray Tracing',
                category: 'geometry',
                subcategory: 'graphics',
                gateway: 'graphics.raytrace.render',
                source: 'MIT 6.837',
                useCases: ['realistic_rendering', 'shadows', 'reflections'],
                characteristics: {
                    physicallyBased: true,
                    computeCost: 'very_high',
                    accuracy: 'photo_realistic'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.realisticRendering) score += 55;
                    if (problem.shadowsReflections) score += 40;
                    return Math.min(score, 100);
                }
            }
        },
        
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 7: CAM/TOOLPATH ALGORITHMS (25)
        // Sources: MIT 2.008, 2.830
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        cam: {
            // Toolpath Strategies
            adaptiveClearing: {
                id: 'adaptive_clearing',
                name: 'Adaptive Clearing',
                category: 'cam',
                subcategory: 'roughing',
                gateway: 'cam.adaptive.clear',
                source: 'MIT 2.008',
                useCases: ['roughing', 'constant_load', 'high_mrr'],
                characteristics: {
                    engagementControl: true,
                    computeCost: 'high',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.roughing) score += 55;
                    if (problem.constantLoad) score += 40;
                    if (problem.highMRR) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            trochoidalMilling: {
                id: 'trochoidal_milling',
                name: 'Trochoidal Milling',
                category: 'cam',
                subcategory: 'slotting',
                gateway: 'cam.trochoidal',
                source: 'MIT 2.008',
                useCases: ['slot_milling', 'reduced_forces', 'chip_thinning'],
                characteristics: {
                    circularMotion: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.slotMilling) score += 60;
                    if (problem.reducedForces) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            pocketMilling: {
                id: 'pocket_milling',
                name: 'Pocket Milling',
                category: 'cam',
                subcategory: 'pocketing',
                gateway: 'cam.pocket',
                source: 'MIT 2.008',
                useCases: ['pocket_clearing', 'parallel_offset', 'spiral'],
                characteristics: {
                    offsetBased: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.pocketClearing) score += 55;
                    if (problem.contourParallel) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            contourMilling: {
                id: 'contour_milling',
                name: 'Contour Milling',
                category: 'cam',
                subcategory: 'finishing',
                gateway: 'cam.contour',
                source: 'MIT 2.008',
                useCases: ['profile_machining', 'wall_finishing', 'edge_milling'],
                characteristics: {
                    offsetBased: true,
                    computeCost: 'low',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.profileMachining) score += 55;
                    if (problem.wallFinishing) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // 3D Surface
            waterline: {
                id: 'waterline',
                name: 'Waterline Finishing',
                category: 'cam',
                subcategory: 'surface',
                gateway: 'cam.surface.waterline',
                source: 'MIT 2.008',
                useCases: ['steep_walls', 'constant_z', 'semi_finish'],
                characteristics: {
                    constantZ: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.steepWalls) score += 60;
                    if (problem.constantZ) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            rasterFinishing: {
                id: 'raster_finishing',
                name: 'Raster/Parallel Finishing',
                category: 'cam',
                subcategory: 'surface',
                gateway: 'cam.surface.raster',
                source: 'MIT 2.008',
                useCases: ['shallow_areas', 'floor_finishing', 'uniform_cusp'],
                characteristics: {
                    parallelPaths: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.shallowAreas) score += 55;
                    if (problem.floorFinishing) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            spiralFinishing: {
                id: 'spiral_finishing',
                name: 'Spiral Finishing',
                category: 'cam',
                subcategory: 'surface',
                gateway: 'cam.surface.spiral',
                source: 'MIT 2.008',
                useCases: ['circular_parts', 'continuous_motion', 'reduced_retracts'],
                characteristics: {
                    continuous: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.circularParts) score += 60;
                    if (problem.continuousMotion) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // 5-Axis
            swarf: {
                id: 'swarf',
                name: 'SWARF Milling',
                category: 'cam',
                subcategory: 'multiaxis',
                gateway: 'cam.multiaxis.swarf',
                source: 'MIT 2.008',
                useCases: ['ruled_surfaces', 'blade_machining', 'side_cutting'],
                characteristics: {
                    fiveAxis: true,
                    sideCutting: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.ruledSurfaces) score += 60;
                    if (problem.bladeMachining) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            flowline: {
                id: 'flowline',
                name: 'Flowline Milling',
                category: 'cam',
                subcategory: 'multiaxis',
                gateway: 'cam.multiaxis.flowline',
                source: 'MIT 2.008',
                useCases: ['impeller_machining', 'turbine_blades', 'complex_surfaces'],
                characteristics: {
                    fiveAxis: true,
                    flowBased: true,
                    computeCost: 'high',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.impellerMachining) score += 65;
                    if (problem.turbineBlades) score += 50;
                    return Math.min(score, 100);
                }
            },
            
            // Drilling
            drillCycle: {
                id: 'drill_cycle',
                name: 'Drill Cycle Optimization',
                category: 'cam',
                subcategory: 'drilling',
                gateway: 'cam.drill.optimize',
                source: 'MIT 2.008',
                useCases: ['hole_sequencing', 'peck_drilling', 'cycle_selection'],
                characteristics: {
                    sequenceOptimization: true,
                    computeCost: 'medium',
                    accuracy: 'optimal'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.holeSequencing) score += 55;
                    if (problem.drilling) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Turning
            roughTurning: {
                id: 'rough_turning',
                name: 'Rough Turning',
                category: 'cam',
                subcategory: 'turning',
                gateway: 'cam.turn.rough',
                source: 'MIT 2.008',
                useCases: ['od_roughing', 'id_roughing', 'stock_removal'],
                characteristics: {
                    latheOperation: true,
                    computeCost: 'medium',
                    accuracy: 'high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.turning) score += 50;
                    if (problem.roughing) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            finishTurning: {
                id: 'finish_turning',
                name: 'Finish Turning',
                category: 'cam',
                subcategory: 'turning',
                gateway: 'cam.turn.finish',
                source: 'MIT 2.008',
                useCases: ['profile_finishing', 'surface_quality', 'tight_tolerances'],
                characteristics: {
                    latheOperation: true,
                    computeCost: 'low',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.turning) score += 45;
                    if (problem.finishing) score += 50;
                    return Math.min(score, 100);
                }
            },
            
            // Wire EDM
            wireEDM: {
                id: 'wire_edm',
                name: 'Wire EDM Path Planning',
                category: 'cam',
                subcategory: 'edm',
                gateway: 'cam.edm.wire',
                source: 'MIT 2.008',
                useCases: ['contour_cutting', 'hardened_materials', 'precision_cutting'],
                characteristics: {
                    nonContact: true,
                    computeCost: 'medium',
                    accuracy: 'very_high'
                },
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.wireEDM) score += 65;
                    if (problem.hardenedMaterial) score += 30;
                    return Math.min(score, 100);
                }
            }
        },

        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 8: NUMERICAL ALGORITHMS (20)
        // Sources: MIT 18.086, 18.335
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        numerical: {
            // Linear Algebra
            gaussElimination: {
                id: 'gauss_elimination',
                name: 'Gaussian Elimination',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.solve.gauss',
                source: 'MIT 18.086',
                complexity: 'O(n³)',
                useCases: ['linear_systems', 'matrix_inversion', 'determinant'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.linearSystem) score += 50;
                    if (problem.dense) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            luDecomposition: {
                id: 'lu_decomposition',
                name: 'LU Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.decompose.lu',
                source: 'MIT 18.086',
                complexity: 'O(n³)',
                useCases: ['multiple_rhs', 'matrix_factorization', 'determinant'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.multipleRHS) score += 55;
                    if (problem.matrixFactorization) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            choleskyDecomposition: {
                id: 'cholesky',
                name: 'Cholesky Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.decompose.cholesky',
                source: 'MIT 18.086',
                complexity: 'O(n³/3)',
                useCases: ['spd_systems', 'covariance', 'optimization'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.symmetricPositiveDefinite) score += 60;
                    if (problem.covariance) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            qrDecomposition: {
                id: 'qr_decomposition',
                name: 'QR Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.decompose.qr',
                source: 'MIT 18.086',
                complexity: 'O(2mn² - 2n³/3)',
                useCases: ['least_squares', 'eigenvalues', 'orthogonalization'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.leastSquares) score += 55;
                    if (problem.eigenvalues) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            svd: {
                id: 'svd',
                name: 'Singular Value Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.decompose.svd',
                source: 'MIT 18.086',
                complexity: 'O(min(mn², m²n))',
                useCases: ['rank', 'pseudoinverse', 'pca', 'compression'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.rank) score += 50;
                    if (problem.pseudoinverse) score += 45;
                    if (problem.compression) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            eigenvalue: {
                id: 'eigenvalue',
                name: 'Eigenvalue Decomposition',
                category: 'numerical',
                subcategory: 'linear',
                gateway: 'num.eigen',
                source: 'MIT 18.086',
                complexity: 'O(n³)',
                useCases: ['modal_analysis', 'stability', 'pca'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.eigenvalues) score += 55;
                    if (problem.modalAnalysis) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            // ODE Solvers
            rungeKutta4: {
                id: 'rk4',
                name: 'Runge-Kutta 4th Order',
                category: 'numerical',
                subcategory: 'ode',
                gateway: 'num.ode.rk4',
                source: 'MIT 18.086',
                useCases: ['ode_solving', 'simulation', 'dynamics'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.odeSolving) score += 55;
                    if (problem.dynamics) score += 40;
                    if (problem.smoothSolution) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            adaptiveRK: {
                id: 'adaptive_rk',
                name: 'Adaptive Runge-Kutta (RK45)',
                category: 'numerical',
                subcategory: 'ode',
                gateway: 'num.ode.rk45',
                source: 'MIT 18.086',
                useCases: ['adaptive_stepping', 'variable_dynamics', 'error_control'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.adaptiveStepping) score += 55;
                    if (problem.errorControl) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            bdf: {
                id: 'bdf',
                name: 'Backward Differentiation Formula',
                category: 'numerical',
                subcategory: 'ode',
                gateway: 'num.ode.bdf',
                source: 'MIT 18.086',
                useCases: ['stiff_odes', 'chemical_kinetics', 'implicit_solver'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.stiffODE) score += 65;
                    if (problem.chemicalKinetics) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            // Root Finding
            newtonRaphson: {
                id: 'newton_raphson',
                name: 'Newton-Raphson Method',
                category: 'numerical',
                subcategory: 'rootfinding',
                gateway: 'num.root.newton',
                source: 'MIT 18.086',
                useCases: ['root_finding', 'nonlinear_equations', 'fast_convergence'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.rootFinding) score += 55;
                    if (problem.hasDerivative) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            bisection: {
                id: 'bisection',
                name: 'Bisection Method',
                category: 'numerical',
                subcategory: 'rootfinding',
                gateway: 'num.root.bisection',
                source: 'MIT 18.086',
                useCases: ['robust_root', 'bracketed', 'guaranteed_convergence'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.robustRoot) score += 50;
                    if (problem.bracketed) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            secant: {
                id: 'secant',
                name: 'Secant Method',
                category: 'numerical',
                subcategory: 'rootfinding',
                gateway: 'num.root.secant',
                source: 'MIT 18.086',
                useCases: ['derivative_free', 'root_finding', 'fast'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.noDerivative) score += 50;
                    if (problem.rootFinding) score += 45;
                    return Math.min(score, 100);
                }
            },
            
            // Integration
            simpsonIntegration: {
                id: 'simpson',
                name: 'Simpson\'s Rule',
                category: 'numerical',
                subcategory: 'integration',
                gateway: 'num.integrate.simpson',
                source: 'MIT 18.086',
                useCases: ['numerical_integration', 'smooth_functions', 'high_accuracy'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.integration) score += 55;
                    if (problem.smooth) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            gaussQuadrature: {
                id: 'gauss_quadrature',
                name: 'Gaussian Quadrature',
                category: 'numerical',
                subcategory: 'integration',
                gateway: 'num.integrate.gauss',
                source: 'MIT 18.086',
                useCases: ['high_accuracy_integration', 'polynomial_exact', 'few_points'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.highAccuracyIntegration) score += 55;
                    if (problem.polynomial) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            // Interpolation
            splineInterpolation: {
                id: 'spline',
                name: 'Cubic Spline Interpolation',
                category: 'numerical',
                subcategory: 'interpolation',
                gateway: 'num.interp.spline',
                source: 'MIT 18.086',
                useCases: ['smooth_interpolation', 'curve_fitting', 'toolpath'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.smoothInterpolation) score += 55;
                    if (problem.curveFitting) score += 40;
                    return Math.min(score, 100);
                }
            }
        },
        
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 9: PROBABILISTIC/MONTE CARLO (12)
        // Sources: MIT 6.262, 6.867
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        probabilistic: {
            monteCarloSimulation: {
                id: 'monte_carlo',
                name: 'Monte Carlo Simulation',
                category: 'probabilistic',
                subcategory: 'simulation',
                gateway: 'ai.mc.simulate',
                source: 'MIT 6.262',
                useCases: ['risk_analysis', 'uncertainty_propagation', 'cycle_time_estimation'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.uncertainInputs) score += 45;
                    if (problem.riskAnalysis) score += 40;
                    if (problem.distributionOutput) score += 25;
                    return Math.min(score, 100);
                }
            },
            
            mcmcSampling: {
                id: 'mcmc',
                name: 'MCMC Sampling',
                category: 'probabilistic',
                subcategory: 'sampling',
                gateway: 'ai.mcmc.sample',
                source: 'MIT 6.867',
                useCases: ['posterior_sampling', 'bayesian_inference', 'complex_distributions'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.posteriorSampling) score += 55;
                    if (problem.complexDistribution) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            importanceSampling: {
                id: 'importance_sampling',
                name: 'Importance Sampling',
                category: 'probabilistic',
                subcategory: 'sampling',
                gateway: 'ai.mc.importance',
                source: 'MIT 6.262',
                useCases: ['rare_events', 'variance_reduction', 'efficient_estimation'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.rareEvents) score += 60;
                    if (problem.varianceReduction) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            bootstrapping: {
                id: 'bootstrapping',
                name: 'Bootstrap Resampling',
                category: 'probabilistic',
                subcategory: 'statistics',
                gateway: 'ai.stats.bootstrap',
                source: 'MIT 6.867',
                useCases: ['confidence_intervals', 'parameter_estimation', 'small_samples'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.confidenceIntervals) score += 55;
                    if (problem.smallSample) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            latinHypercube: {
                id: 'latin_hypercube',
                name: 'Latin Hypercube Sampling',
                category: 'probabilistic',
                subcategory: 'sampling',
                gateway: 'ai.mc.lhs',
                source: 'MIT 6.262',
                useCases: ['design_of_experiments', 'stratified_sampling', 'uncertainty_analysis'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.designOfExperiments) score += 55;
                    if (problem.stratifiedSampling) score += 40;
                    return Math.min(score, 100);
                }
            }
        },
        
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        // CATEGORY 10: BUSINESS/COSTING ALGORITHMS (15)
        // Sources: MIT 15.963, 15.760
        // ───────────────────────────────────────────────────────────────────────────────────────────────────────
        business: {
            activityBasedCosting: {
                id: 'abc',
                name: 'Activity-Based Costing',
                category: 'business',
                subcategory: 'costing',
                gateway: 'costing.abc.cost',
                source: 'MIT 15.963',
                useCases: ['job_costing', 'overhead_allocation', 'cost_analysis'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.jobCosting) score += 55;
                    if (problem.overheadAllocation) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            eoq: {
                id: 'eoq',
                name: 'Economic Order Quantity',
                category: 'business',
                subcategory: 'inventory',
                gateway: 'business.inventory.eoq',
                source: 'MIT 15.760',
                useCases: ['order_quantity', 'inventory_optimization', 'cost_minimization'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.inventoryOptimization) score += 55;
                    if (problem.orderQuantity) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            safetyStock: {
                id: 'safety_stock',
                name: 'Safety Stock Calculation',
                category: 'business',
                subcategory: 'inventory',
                gateway: 'business.inventory.safety',
                source: 'MIT 15.760',
                useCases: ['buffer_stock', 'service_level', 'demand_uncertainty'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.safetyStock) score += 55;
                    if (problem.serviceLevel) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            oee: {
                id: 'oee',
                name: 'Overall Equipment Effectiveness',
                category: 'business',
                subcategory: 'metrics',
                gateway: 'business.metrics.oee',
                source: 'MIT 2.854',
                useCases: ['equipment_efficiency', 'availability', 'performance', 'quality'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.equipmentEfficiency) score += 55;
                    if (problem.performanceMetrics) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            queuingTheory: {
                id: 'queuing',
                name: 'Queuing Theory (M/M/c)',
                category: 'business',
                subcategory: 'operations',
                gateway: 'business.queue.mmc',
                source: 'MIT 15.760',
                useCases: ['waiting_time', 'utilization', 'capacity_planning'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.queuingAnalysis) score += 55;
                    if (problem.capacityPlanning) score += 40;
                    return Math.min(score, 100);
                }
            },
            
            nasaTLX: {
                id: 'nasa_tlx',
                name: 'NASA Task Load Index',
                category: 'business',
                subcategory: 'ergonomics',
                gateway: 'business.ergonomics.tlx',
                source: 'NASA',
                useCases: ['workload_assessment', 'operator_fatigue', 'task_design'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.workloadAssessment) score += 60;
                    if (problem.ergonomics) score += 35;
                    return Math.min(score, 100);
                }
            },
            
            fittsLaw: {
                id: 'fitts_law',
                name: 'Fitts\' Law',
                category: 'business',
                subcategory: 'ergonomics',
                gateway: 'business.ergonomics.fitts',
                source: 'MIT',
                useCases: ['ui_design', 'movement_time', 'interface_optimization'],
                matchScore: function(problem) {
                    let score = 0;
                    if (problem.uiDesign) score += 55;
                    if (problem.movementTime) score += 40;
                    return Math.min(score, 100);
                }
            }
        },

        // ═══════════════════════════════════════════════════════════════════════════════════════════════════════
        // REGISTRY HELPER METHODS
        // ═══════════════════════════════════════════════════════════════════════════════════════════════════════
        
        /**
         * Get all algorithms as flat array
         */
        getAll: function() {
            const all = [];
            for (const [category, algorithms] of Object.entries(this)) {
                if (typeof algorithms === 'object' && category !== 'getAll' && 
                    category !== 'getByCategory' && category !== 'getByUseCase' &&
                    category !== 'getStats' && category !== 'findBestMatch') {
                    for (const [id, alg] of Object.entries(algorithms)) {
                        if (typeof alg === 'object' && alg.id) {
                            all.push({ ...alg, _category: category });
                        }
                    }
                }
            }
            return all;
        },
        
        /**
         * Get algorithms by category
         */
        getByCategory: function(category) {
            const cat = this[category];
            if (!cat) return [];
            return Object.values(cat).filter(a => a && a.id);
        },
        
        /**
         * Get algorithms by use case
         */
        getByUseCase: function(useCase) {
            const all = this.getAll();
            return all.filter(a => a.useCases && a.useCases.includes(useCase));
        },
        
        /**
         * Find best matching algorithms for a problem
         */
        findBestMatch: function(problem, topN = 5) {
            const all = this.getAll();
            const scored = [];
            
            for (const alg of all) {
                if (alg.matchScore) {
                    const score = alg.matchScore(problem);
                    if (score > 0) {
                        scored.push({ ...alg, score });
                    }
                }
            }
            
            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, topN);
        },
        
        /**
         * Get registry statistics
         */
        getStats: function() {
            const all = this.getAll();
            const categories = {};
            let withGateway = 0;
            let withMatchScore = 0;
            
            for (const alg of all) {
                const cat = alg.category || 'unknown';
                categories[cat] = (categories[cat] || 0) + 1;
                if (alg.gateway) withGateway++;
                if (alg.matchScore) withMatchScore++;
            }
            
            return {
                total: all.length,
                byCategory: categories,
                withGateway,
                withMatchScore,
                utilizationPotential: `${Math.round(withMatchScore / all.length * 100)}%`
            };
        }
    }