const PRISM_DEEP_LEARNING_PARAMS = {
    getCNN: function(complexity = 'medium') {
        const AI = PRISM_CONSTANTS.AI;
        let filters = AI.CNN_DEFAULT_FILTERS;
        if (complexity === 'simple') filters = filters.slice(0, 2);
        if (complexity === 'complex') filters = [...filters, 512];
        
        return {
            filters,
            kernelSize: AI.CNN_KERNEL_SIZE_DEFAULT,
            poolSize: AI.CNN_POOL_SIZE_DEFAULT,
            stride: AI.CNN_STRIDE_DEFAULT,
            padding: AI.CNN_PADDING_SAME
        };
    },
    
    getLSTM: function() {
        const AI = PRISM_CONSTANTS.AI;
        return {
            hiddenSize: AI.LSTM_HIDDEN_SIZE_DEFAULT,
            numLayers: AI.LSTM_NUM_LAYERS_DEFAULT,
            bidirectional: AI.LSTM_BIDIRECTIONAL,
            sequenceLength: AI.SEQUENCE_LENGTH_DEFAULT,
            dropout: AI.DROPOUT_RATE_HIDDEN
        };
    },
    
    getTransformer: function() {
        const AI = PRISM_CONSTANTS.AI;
        return {
            dModel: AI.TRANSFORMER_D_MODEL,
            nHeads: AI.TRANSFORMER_N_HEADS,
            nLayers: AI.TRANSFORMER_N_LAYERS,
            dFF: AI.TRANSFORMER_D_FF,
            dropout: AI.TRANSFORMER_DROPOUT,
            maxSeqLength: AI.TRANSFORMER_MAX_SEQ_LENGTH
        };
    },
    
    getOptimizer: function(name = 'adam') {
        const AI = PRISM_CONSTANTS.AI;
        switch (name.toLowerCase()) {
            case 'adam':
                return { name: 'Adam', lr: AI.LEARNING_RATE_DEFAULT, beta1: AI.ADAM_BETA1, beta2: AI.ADAM_BETA2, epsilon: AI.ADAM_EPSILON, weightDecay: AI.ADAM_WEIGHT_DECAY };
            case 'sgd':
                return { name: 'SGD', lr: AI.LEARNING_RATE_DEFAULT, momentum: AI.SGD_MOMENTUM, nesterov: AI.SGD_NESTEROV };
            case 'rmsprop':
                return { name: 'RMSprop', lr: AI.LEARNING_RATE_DEFAULT, alpha: AI.RMSPROP_ALPHA, epsilon: AI.RMSPROP_EPSILON };
            case 'adamw':
                return { name: 'AdamW', lr: AI.LEARNING_RATE_DEFAULT, beta1: AI.ADAM_BETA1, beta2: AI.ADAM_BETA2, weightDecay: AI.ADAMW_WEIGHT_DECAY };
            default:
                return this.getOptimizer('adam');
        }
    },
    
    getRegularization: function() {
        const AI = PRISM_CONSTANTS.AI;
        return {
            l1Lambda: AI.L1_LAMBDA,
            l2Lambda: AI.L2_LAMBDA,
            dropoutInput: AI.DROPOUT_RATE_INPUT,
            dropoutHidden: AI.DROPOUT_RATE_HIDDEN,
            dropoutOutput: AI.DROPOUT_RATE_OUTPUT,
            batchNorm: { momentum: AI.BATCH_NORM_MOMENTUM, epsilon: AI.BATCH_NORM_EPSILON },
            layerNorm: { epsilon: AI.LAYER_NORM_EPSILON }
        };
    },
    
    getEarlyStopping: function() {
        const AI = PRISM_CONSTANTS.AI;
        return {
            patience: AI.EARLY_STOPPING_PATIENCE,
            minDelta: AI.EARLY_STOPPING_MIN_DELTA,
            restoreBest: AI.EARLY_STOPPING_RESTORE_BEST
        };
    },
    
    getLRScheduler: function(type = 'step') {
        const AI = PRISM_CONSTANTS.AI;
        switch (type.toLowerCase()) {
            case 'step':
                return { type: 'StepLR', stepSize: AI.LR_SCHEDULER_STEP_SIZE, gamma: AI.LR_SCHEDULER_GAMMA };
            case 'cosine':
                return { type: 'CosineAnnealing', tMax: AI.LR_COSINE_T_MAX };
            case 'exponential':
                return { type: 'ExponentialLR', gamma: AI.LR_EXPONENTIAL_GAMMA };
            case 'plateau':
                return { type: 'ReduceOnPlateau', patience: AI.LR_PLATEAU_PATIENCE, factor: AI.LR_PLATEAU_FACTOR };
            case 'warmup':
                return { type: 'WarmupLR', warmupSteps: AI.LR_WARMUP_STEPS };
            default:
                return this.getLRScheduler('step');
        }
    },
    
    getGradientControl: function() {
        const AI = PRISM_CONSTANTS.AI;
        return {
            clipNorm: AI.GRADIENT_CLIP_NORM,
            clipValue: AI.GRADIENT_CLIP_VALUE,
            accumulationSteps: AI.GRADIENT_ACCUMULATION_STEPS
        };
    },
    
    getXGBoost: function() {
        const AI = PRISM_CONSTANTS.AI;
        return {
            maxDepth: AI.XGB_MAX_DEPTH,
            learningRate: AI.XGB_LEARNING_RATE,
            nEstimators: AI.XGB_N_ESTIMATORS,
            subsample: AI.XGB_SUBSAMPLE,
            colsampleBytree: AI.XGB_COLSAMPLE_BYTREE,
            regAlpha: AI.XGB_REG_ALPHA,
            regLambda: AI.XGB_REG_LAMBDA
        };
    },
    
    getAnomalyDetection: function(method = 'isolation_forest') {
        const AI = PRISM_CONSTANTS.AI;
        switch (method.toLowerCase()) {
            case 'isolation_forest':
                return { nEstimators: AI.ISOFOREST_N_ESTIMATORS, contamination: AI.ISOFOREST_CONTAMINATION, maxSamples: AI.ISOFOREST_MAX_SAMPLES };
            case 'lof':
                return { nNeighbors: AI.LOF_N_NEIGHBORS, contamination: AI.LOF_CONTAMINATION, metric: AI.LOF_METRIC };
            case 'ocsvm':
                return { nu: AI.OCSVM_NU, kernel: AI.OCSVM_KERNEL, gamma: AI.OCSVM_GAMMA };
            case 'statistical':
                return { zscoreThreshold: AI.ANOMALY_ZSCORE_THRESHOLD, iqrMultiplier: AI.ANOMALY_IQR_MULTIPLIER, madThreshold: AI.ANOMALY_MAD_THRESHOLD };
            default:
                return this.getAnomalyDetection('isolation_forest');
        }
    },
    
    getDimensionalityReduction: function(method = 'pca') {
        const AI = PRISM_CONSTANTS.AI;
        switch (method.toLowerCase()) {
            case 'pca':
                return { nComponents: AI.PCA_N_COMPONENTS, whiten: AI.PCA_WHITEN };
            case 'umap':
                return { nNeighbors: AI.UMAP_N_NEIGHBORS, minDist: AI.UMAP_MIN_DIST, nComponents: AI.UMAP_N_COMPONENTS, metric: AI.UMAP_METRIC };
            case 'tsne':
                return { perplexity: AI.TSNE_PERPLEXITY, learningRate: AI.TSNE_LEARNING_RATE, nIter: AI.TSNE_N_ITER };
            case 'autoencoder':
                return { encodingDim: AI.AE_ENCODING_DIM, hiddenLayers: AI.AE_HIDDEN_LAYERS };
            case 'vae':
                return { latentDim: AI.VAE_LATENT_DIM, klWeight: AI.VAE_KL_WEIGHT };
            default:
                return this.getDimensionalityReduction('pca');
        }
    },
    
    getHyperparameterOptimization: function() {
        const AI = PRISM_CONSTANTS.AI;
        return {
            nTrials: AI.HPO_N_TRIALS,
            timeout: AI.HPO_TIMEOUT,
            nJobs: AI.HPO_N_JOBS,
            sampler: AI.HPO_SAMPLER,
            pruner: AI.HPO_PRUNER,
            bayesOpt: {
                initPoints: AI.BAYESOPT_INIT_POINTS,
                nIter: AI.BAYESOPT_N_ITER,
                acqFunction: AI.BAYESOPT_ACQ_FUNCTION,
                kappa: AI.BAYESOPT_KAPPA,
                xi: AI.BAYESOPT_XI
            }
        };
    }
}