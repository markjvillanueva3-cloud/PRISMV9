const PRISM_KNOWLEDGE_INTEGRATION_ROUTES = {
    routes: {
        // ═══════════════════════════════════════════════════════════════════════
        // AI/ML ROUTES (25 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        // Reinforcement Learning
        'ai.rl.sarsa.update': 'PRISM_RL_ENHANCED.SARSA.update',
        'ai.rl.sarsa.episode': 'PRISM_RL_ENHANCED.SARSA.runEpisode',
        'ai.rl.sarsa.initQ': 'PRISM_RL_ENHANCED.SARSA.initQTable',
        'ai.rl.policy_gradient': 'PRISM_RL_ENHANCED.PolicyGradient.update',
        'ai.rl.actor_critic': 'PRISM_RL_ENHANCED.ActorCritic.update',
        'ai.rl.dqn.train': 'PRISM_RL_ENHANCED.DQN.train',
        'ai.rl.value_iteration': 'PRISM_RL_ENHANCED.ValueIteration.solve',
        
        // Neural Network Activations
        'ai.nn.activation.elu': 'PRISM_NN_ENHANCED.Activations.elu',
        'ai.nn.activation.gelu': 'PRISM_NN_ENHANCED.Activations.gelu',
        'ai.nn.activation.selu': 'PRISM_NN_ENHANCED.Activations.selu',
        'ai.nn.activation.swish': 'PRISM_NN_ENHANCED.Activations.swish',
        
        // Optimizers
        'ai.nn.optimizer.sgd': 'PRISM_NN_ENHANCED.Optimizers.sgd',
        'ai.nn.optimizer.adadelta': 'PRISM_NN_ENHANCED.Optimizers.adadelta',
        'ai.nn.optimizer.nadam': 'PRISM_NN_ENHANCED.Optimizers.nadam',
        'ai.nn.optimizer.adamw': 'PRISM_NN_ENHANCED.Optimizers.adamw',
        
        // Clustering
        'ai.cluster.dbscan': 'PRISM_CLUSTERING_ENHANCED.dbscan',
        'ai.cluster.kmedoids': 'PRISM_CLUSTERING_ENHANCED.kMedoids',
        'ai.cluster.tsne': 'PRISM_CLUSTERING_ENHANCED.tsne',
        
        // Signal Processing Enhanced
        'ai.signal.cross_correlation': 'PRISM_SIGNAL_ENHANCED.crossCorrelation',
        'ai.signal.auto_correlation': 'PRISM_SIGNAL_ENHANCED.autoCorrelation',
        
        // Evolutionary
        'ai.moead.optimize': 'PRISM_EVOLUTIONARY_ENHANCED.MOEAD.optimize',
        'ai.ga.elitism': 'PRISM_EVOLUTIONARY_ENHANCED.elitistSelection',
        
        // Explainable AI
        'ai.xai.gradient_saliency': 'PRISM_XAI_ENHANCED.gradientSaliency',
        'ai.xai.integrated_gradients': 'PRISM_XAI_ENHANCED.integratedGradients',
        'ai.xai.lime': 'PRISM_XAI_ENHANCED.lime',
        
        // Attention Mechanisms
        'ai.attention.scaled': 'PRISM_ATTENTION_ADVANCED.scaledDotProductAttention',
        'ai.attention.multihead': 'PRISM_ATTENTION_ADVANCED.multiHeadAttention',
        'ai.attention.sparse': 'PRISM_ATTENTION_ADVANCED.sparseAttention',
        'ai.attention.linear': 'PRISM_ATTENTION_ADVANCED.linearAttention',
        'ai.attention.cross': 'PRISM_ATTENTION_ADVANCED.crossAttention',
        
        // Model Compression
        'ai.compress.quantize': 'PRISM_MODEL_COMPRESSION.quantize',
        'ai.compress.prune': 'PRISM_MODEL_COMPRESSION.prune',
        'ai.compress.distill': 'PRISM_MODEL_COMPRESSION.distill',
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROCESS PLANNING ROUTES (20 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        'plan.search.astar': 'PRISM_PROCESS_PLANNING.aStarSearch',
        'plan.search.bfs': 'PRISM_PROCESS_PLANNING.bfs',
        'plan.search.dfs': 'PRISM_PROCESS_PLANNING.dfs',
        'plan.search.idastar': 'PRISM_PROCESS_PLANNING.idaStar',
        
        'plan.csp.solve': 'PRISM_PROCESS_PLANNING.cspSolver',
        'plan.csp.ac3': 'PRISM_PROCESS_PLANNING.ac3',
        'plan.csp.minconflicts': 'PRISM_PROCESS_PLANNING.minConflicts',
        
        'plan.motion.rrt': 'PRISM_PROCESS_PLANNING.rrt',
        'plan.motion.rrtstar': 'PRISM_PROCESS_PLANNING.rrtStar',
        'plan.motion.prm': 'PRISM_PROCESS_PLANNING.prm',
        
        'plan.hmm.forward': 'PRISM_PROCESS_PLANNING.hmm.forward',
        'plan.hmm.viterbi': 'PRISM_PROCESS_PLANNING.hmm.viterbi',
        'plan.hmm.baumWelch': 'PRISM_PROCESS_PLANNING.hmm.baumWelch',
        
        'plan.mdp.valueIteration': 'PRISM_PROCESS_PLANNING.mdp.valueIteration',
        'plan.mdp.policyIteration': 'PRISM_PROCESS_PLANNING.mdp.policyIteration',
        
        'plan.mcts.search': 'PRISM_PROCESS_PLANNING.mcts',
        
        // ═══════════════════════════════════════════════════════════════════════
        // OPTIMIZATION ROUTES (12 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        'optimize.newton': 'PRISM_OPTIMIZATION.newtonMethod',
        'optimize.steepest': 'PRISM_OPTIMIZATION.steepestDescent',
        'optimize.conjugate': 'PRISM_OPTIMIZATION.conjugateGradient',
        'optimize.bfgs': 'PRISM_OPTIMIZATION.bfgs',
        
        'optimize.penalty': 'PRISM_OPTIMIZATION.penaltyMethod',
        'optimize.barrier': 'PRISM_OPTIMIZATION.barrierMethod',
        'optimize.augmented': 'PRISM_OPTIMIZATION.augmentedLagrangian',
        
        'optimize.ip.branchBound': 'PRISM_OPTIMIZATION.branchAndBound',
        'optimize.ip.cuttingPlane': 'PRISM_OPTIMIZATION.cuttingPlane',
        'optimize.localSearch': 'PRISM_OPTIMIZATION.localSearch',
        'optimize.simulatedAnnealing': 'PRISM_OPTIMIZATION.simulatedAnnealing',
        
        // ═══════════════════════════════════════════════════════════════════════
        // PHYSICS/DYNAMICS ROUTES (15 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        'dynamics.fk.compute': 'PRISM_DYNAMICS.forwardKinematics',
        'dynamics.ik.solve': 'PRISM_DYNAMICS.inverseKinematics',
        'dynamics.jacobian': 'PRISM_DYNAMICS.jacobian',
        'dynamics.singularity': 'PRISM_DYNAMICS.singularityAnalysis',
        
        'dynamics.newtonEuler': 'PRISM_DYNAMICS.newtonEuler',
        'dynamics.lagrangian': 'PRISM_DYNAMICS.lagrangian',
        'dynamics.inertia': 'PRISM_DYNAMICS.inertiaMatrix',
        
        'vibration.modal': 'PRISM_DYNAMICS.modalAnalysis',
        'vibration.stability': 'PRISM_DYNAMICS.stabilityLobes',
        'vibration.frf': 'PRISM_DYNAMICS.frequencyResponse',
        
        'thermal.cutting': 'PRISM_DYNAMICS.cuttingTemperature',
        'thermal.conduction': 'PRISM_DYNAMICS.heatConduction',
        'thermal.convection': 'PRISM_DYNAMICS.convection'
    },
    
    registerAll: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            let registered = 0;
            for (const [route, target] of Object.entries(this.routes)) {
                try {
                    PRISM_GATEWAY.register(route, target);
                    registered++;
                } catch (e) {
                    console.warn(`[KNOWLEDGE] Failed to register route: ${route}`, e);
                }
            }
            console.log(`[KNOWLEDGE_INTEGRATION] Registered ${registered}/${Object.keys(this.routes).length} gateway routes`);
        }
    }
}