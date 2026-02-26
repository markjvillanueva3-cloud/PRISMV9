const PRISM_AI_PARAMS = {
    getPSO: function() {
        return {
            particles: PRISM_CONSTANTS.AI.PSO_MAX_PARTICLES,
            iterations: PRISM_CONSTANTS.AI.PSO_MAX_ITERATIONS,
            inertiaWeight: PRISM_CONSTANTS.AI.PSO_INERTIA_WEIGHT,
            cognitiveFactor: PRISM_CONSTANTS.AI.PSO_COGNITIVE_FACTOR,
            socialFactor: PRISM_CONSTANTS.AI.PSO_SOCIAL_FACTOR,
            velocityClamp: PRISM_CONSTANTS.AI.PSO_VELOCITY_CLAMP
        };
    },
    
    getACO: function() {
        return {
            ants: PRISM_CONSTANTS.AI.ACO_MAX_ANTS,
            iterations: PRISM_CONSTANTS.AI.ACO_MAX_ITERATIONS,
            alpha: PRISM_CONSTANTS.AI.ACO_ALPHA,
            beta: PRISM_CONSTANTS.AI.ACO_BETA,
            evaporation: PRISM_CONSTANTS.AI.ACO_EVAPORATION,
            Q: PRISM_CONSTANTS.AI.ACO_Q
        };
    },
    
    getGA: function() {
        return {
            population: PRISM_CONSTANTS.AI.GA_MAX_POPULATION,
            generations: PRISM_CONSTANTS.AI.GA_MAX_GENERATIONS,
            mutationRate: PRISM_CONSTANTS.AI.GA_MUTATION_RATE,
            crossoverRate: PRISM_CONSTANTS.AI.GA_CROSSOVER_RATE,
            eliteRatio: PRISM_CONSTANTS.AI.GA_ELITE_RATIO,
            tournamentSize: PRISM_CONSTANTS.AI.GA_TOURNAMENT_SIZE
        };
    },
    
    getMonteCarlo: function() {
        return {
            samples: PRISM_CONSTANTS.AI.MONTE_CARLO_SAMPLES,
            minSamples: PRISM_CONSTANTS.AI.MONTE_CARLO_MIN_SAMPLES,
            convergence: PRISM_CONSTANTS.AI.MONTE_CARLO_CONVERGENCE
        };
    },
    
    getNeural: function() {
        return {
            maxLayers: PRISM_CONSTANTS.AI.NEURAL_MAX_LAYERS,
            maxNeurons: PRISM_CONSTANTS.AI.NEURAL_MAX_NEURONS,
            defaultLayers: PRISM_CONSTANTS.AI.NEURAL_DEFAULT_LAYERS,
            defaultNeurons: PRISM_CONSTANTS.AI.NEURAL_DEFAULT_NEURONS,
            learningRate: PRISM_CONSTANTS.AI.LEARNING_RATE_DEFAULT,
            batchSize: PRISM_CONSTANTS.AI.BATCH_SIZE_DEFAULT,
            dropout: PRISM_CONSTANTS.AI.DROPOUT_DEFAULT,
            epochs: PRISM_CONSTANTS.AI.EPOCHS_DEFAULT
        };
    },
    
    getBayesian: function() {
        return {
            confidenceThreshold: PRISM_CONSTANTS.AI.BAYESIAN_CONFIDENCE_THRESHOLD,
            minSamples: PRISM_CONSTANTS.AI.BAYESIAN_MIN_SAMPLES,
            priorWeight: PRISM_CONSTANTS.AI.BAYESIAN_PRIOR_WEIGHT,
            updateRate: PRISM_CONSTANTS.AI.BAYESIAN_UPDATE_RATE
        };
    },
    
    getRL: function() {
        return {
            discountFactor: PRISM_CONSTANTS.AI.RL_DISCOUNT_FACTOR,
            epsilonStart: PRISM_CONSTANTS.AI.RL_EPSILON_START,
            epsilonEnd: PRISM_CONSTANTS.AI.RL_EPSILON_END,
            epsilonDecay: PRISM_CONSTANTS.AI.RL_EPSILON_DECAY,
            replayBufferSize: PRISM_CONSTANTS.AI.RL_REPLAY_BUFFER_SIZE
        };
    }
}