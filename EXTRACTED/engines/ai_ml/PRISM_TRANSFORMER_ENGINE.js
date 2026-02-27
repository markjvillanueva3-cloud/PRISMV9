// PRISM_TRANSFORMER_ENGINE - Extracted from PRISM v8.89.002
// Lines 7904-8165 (262 lines)
// Category: attention
// Extracted: 2026-01-29T21:27:24.576959
// Source: MIT/Stanford AI/ML Courses

        TRANSFORMER_D_MODEL: 512,
        TRANSFORMER_N_HEADS: 8,
        TRANSFORMER_N_LAYERS: 6,
        TRANSFORMER_D_FF: 2048,
        TRANSFORMER_DROPOUT: 0.1,
        TRANSFORMER_MAX_SEQ_LENGTH: 512,
        
        // Attention Mechanisms
        ATTENTION_HEADS_DEFAULT: 8,
        ATTENTION_DIM_DEFAULT: 64,
        ATTENTION_DROPOUT: 0.1,
        SELF_ATTENTION_ENABLED: true,
        MULTI_HEAD_ATTENTION_ENABLED: true,
        
        // Optimizers
        ADAM_BETA1: 0.9,
        ADAM_BETA2: 0.999,
        ADAM_EPSILON: 1e-8,
        ADAM_WEIGHT_DECAY: 0.01,
        SGD_MOMENTUM: 0.9,
        SGD_NESTEROV: true,
        RMSPROP_ALPHA: 0.99,
        RMSPROP_EPSILON: 1e-8,
        ADAGRAD_LR_DECAY: 0,
        ADAMW_WEIGHT_DECAY: 0.01,
        
        // Learning Rate Schedules
        LR_SCHEDULER_STEP_SIZE: 10,
        LR_SCHEDULER_GAMMA: 0.1,
        LR_WARMUP_STEPS: 1000,
        LR_COSINE_T_MAX: 100,
        LR_EXPONENTIAL_GAMMA: 0.95,
        LR_PLATEAU_PATIENCE: 10,
        LR_PLATEAU_FACTOR: 0.1,
        
        // Regularization
        L1_LAMBDA: 0.0001,
        L2_LAMBDA: 0.001,
        DROPOUT_RATE_INPUT: 0.2,
        DROPOUT_RATE_HIDDEN: 0.5,
        DROPOUT_RATE_OUTPUT: 0.3,
        BATCH_NORM_MOMENTUM: 0.1,
        BATCH_NORM_EPSILON: 1e-5,
        LAYER_NORM_EPSILON: 1e-6,
        
        // Early Stopping
        EARLY_STOPPING_PATIENCE: 10,
        EARLY_STOPPING_MIN_DELTA: 0.0001,
        EARLY_STOPPING_RESTORE_BEST: true,
        
        // Gradient Control
        GRADIENT_CLIP_NORM: 1.0,
        GRADIENT_CLIP_VALUE: 0.5,
        GRADIENT_ACCUMULATION_STEPS: 4,
        
        // Weight Initialization
        INIT_XAVIER_GAIN: 1.0,
        INIT_KAIMING_MODE: 'fan_in',
        INIT_ORTHOGONAL_GAIN: 1.0,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ADVANCED ML ALGORITHMS
        // Sources: scikit-learn, XGBoost, LightGBM documentation
        // ═══════════════════════════════════════════════════════════════════════════
        
        // XGBoost
        XGB_MAX_DEPTH: 6,
        XGB_LEARNING_RATE: 0.1,
        XGB_N_ESTIMATORS: 100,
        XGB_SUBSAMPLE: 0.8,
        XGB_COLSAMPLE_BYTREE: 0.8,
        XGB_REG_ALPHA: 0,
        XGB_REG_LAMBDA: 1,
        XGB_MIN_CHILD_WEIGHT: 1,
        
        // Random Forest
        RF_N_ESTIMATORS: 100,
        RF_MAX_DEPTH: 20,
        RF_MIN_SAMPLES_SPLIT: 2,
        RF_MIN_SAMPLES_LEAF: 1,
        RF_MAX_FEATURES: 'sqrt',
        RF_BOOTSTRAP: true,
        RF_OOB_SCORE: true,
        
        // Support Vector Machine
        SVM_C: 1.0,
        SVM_KERNEL: 'rbf',
        SVM_GAMMA: 'scale',
        SVM_EPSILON: 0.1,
        SVM_DEGREE: 3,
        
        // LightGBM
        LGBM_NUM_LEAVES: 31,
        LGBM_MAX_DEPTH: -1,
        LGBM_LEARNING_RATE: 0.1,
        LGBM_N_ESTIMATORS: 100,
        LGBM_MIN_DATA_IN_LEAF: 20,
        LGBM_FEATURE_FRACTION: 0.9,
        LGBM_BAGGING_FRACTION: 0.8,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // DIMENSIONALITY REDUCTION
        // Sources: MIT 18.065, scikit-learn
        // ═══════════════════════════════════════════════════════════════════════════
        
        // PCA
        PCA_N_COMPONENTS: 0.95,          // Variance explained
        PCA_WHITEN: false,
        
        // UMAP
        UMAP_N_NEIGHBORS: 15,
        UMAP_MIN_DIST: 0.1,
        UMAP_N_COMPONENTS: 2,
        UMAP_METRIC: 'euclidean',
        
        // t-SNE
        TSNE_PERPLEXITY: 30,
        TSNE_LEARNING_RATE: 200,
        TSNE_N_ITER: 1000,
        TSNE_EARLY_EXAGGERATION: 12,
        
        // Autoencoders
        AE_ENCODING_DIM: 32,
        AE_HIDDEN_LAYERS: [128, 64],
        VAE_LATENT_DIM: 16,
        VAE_KL_WEIGHT: 1.0,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // TIME SERIES & FORECASTING
        // Sources: MIT 15.097, Forecasting Principles (Hyndman)
        // ═══════════════════════════════════════════════════════════════════════════
        
        // Kalman Filter
        KALMAN_PROCESS_NOISE: 0.01,
        KALMAN_MEASUREMENT_NOISE: 0.1,
        KALMAN_INITIAL_COVARIANCE: 1.0,
        
        // ARIMA
        ARIMA_MAX_P: 5,
        ARIMA_MAX_D: 2,
        ARIMA_MAX_Q: 5,
        ARIMA_SEASONAL_PERIOD: 12,
        
        // Exponential Smoothing
        EXP_SMOOTHING_ALPHA: 0.3,
        EXP_SMOOTHING_BETA: 0.1,
        EXP_SMOOTHING_GAMMA: 0.1,
        
        // Prophet-style
        PROPHET_CHANGEPOINT_PRIOR: 0.05,
        PROPHET_SEASONALITY_PRIOR: 10,
        PROPHET_HOLIDAYS_PRIOR: 10,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ANOMALY DETECTION
        // Sources: Anomaly Detection (Aggarwal), scikit-learn
        // ═══════════════════════════════════════════════════════════════════════════
        
        // Isolation Forest
        ISOFOREST_N_ESTIMATORS: 100,
        ISOFOREST_CONTAMINATION: 0.1,
        ISOFOREST_MAX_SAMPLES: 256,
        
        // One-Class SVM
        OCSVM_NU: 0.1,
        OCSVM_KERNEL: 'rbf',
        OCSVM_GAMMA: 'scale',
        
        // Local Outlier Factor
        LOF_N_NEIGHBORS: 20,
        LOF_CONTAMINATION: 0.1,
        LOF_METRIC: 'minkowski',
        
        // Statistical Thresholds
        ANOMALY_ZSCORE_THRESHOLD: 3.0,
        ANOMALY_IQR_MULTIPLIER: 1.5,
        ANOMALY_MAD_THRESHOLD: 3.5,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ENSEMBLE METHODS
        // Sources: Ensemble Methods (Zhou), scikit-learn
        // ═══════════════════════════════════════════════════════════════════════════
        
        // Bagging
        BAGGING_N_ESTIMATORS: 10,
        BAGGING_MAX_SAMPLES: 1.0,
        BAGGING_MAX_FEATURES: 1.0,
        BAGGING_BOOTSTRAP: true,
        
        // Boosting
        ADABOOST_N_ESTIMATORS: 50,
        ADABOOST_LEARNING_RATE: 1.0,
        GRADBOOST_N_ESTIMATORS: 100,
        GRADBOOST_MAX_DEPTH: 3,
        
        // Stacking
        STACKING_CV_FOLDS: 5,
        STACKING_PASSTHROUGH: false,
        
        // Voting
        VOTING_TYPE: 'soft',
        VOTING_WEIGHTS_EQUAL: true,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // TRANSFER LEARNING
        // Sources: Transfer Learning (Pan & Yang), Deep Learning
        // ═══════════════════════════════════════════════════════════════════════════
        
        TRANSFER_FREEZE_LAYERS: 0.7,     // Freeze 70% of layers
        TRANSFER_FINE_TUNE_LR: 0.0001,   // Lower LR for fine-tuning
        TRANSFER_WARM_START: true,
        TRANSFER_FEATURE_EXTRACT_ONLY: false,
        DOMAIN_ADAPTATION_LAMBDA: 0.1,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // HYPERPARAMETER OPTIMIZATION
        // Sources: AutoML (Hutter), Hyperopt, Optuna
        // ═══════════════════════════════════════════════════════════════════════════
        
        HPO_N_TRIALS: 100,
        HPO_TIMEOUT: 3600,               // seconds
        HPO_N_JOBS: -1,                  // All cores
        HPO_SAMPLER: 'tpe',              // Tree-structured Parzen Estimator
        HPO_PRUNER: 'median',
        HPO_WARM_START_TRIALS: 10,
        
        // Bayesian Optimization
        BAYESOPT_INIT_POINTS: 5,
        BAYESOPT_N_ITER: 25,
        BAYESOPT_ACQ_FUNCTION: 'ei',     // Expected Improvement
        BAYESOPT_KAPPA: 2.576,
        BAYESOPT_XI: 0.01,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // MODEL INTERPRETABILITY (XAI)
        // Sources: Interpretable ML (Molnar), SHAP, LIME
        // ═══════════════════════════════════════════════════════════════════════════
        
        SHAP_N_SAMPLES: 100,
        SHAP_MAX_DISPLAY: 20,
        LIME_N_SAMPLES: 5000,
        LIME_KERNEL_WIDTH: 0.75,
        FEATURE_PERMUTATION_REPEATS: 10,
        PARTIAL_DEPENDENCE_GRID: 50,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // ACTIVE LEARNING
        // Sources: Active Learning Literature Survey (Settles)
        // ═══════════════════════════════════════════════════════════════════════════
        
        ACTIVE_LEARNING_BATCH_SIZE: 10,
        ACTIVE_LEARNING_STRATEGY: 'uncertainty',
        UNCERTAINTY_THRESHOLD: 0.5,
        QUERY_BY_COMMITTEE_SIZE: 5,
        EXPECTED_MODEL_CHANGE_SAMPLES: 100
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // UTILIZATION - Utilization thresholds for 100% system usage (NEW SECTION)
    // Sources: PRISM Development Protocol v14.0
    // ═══════════════════════════════════════════════════════════════════════════════════
    UTILIZATION: Object.freeze({