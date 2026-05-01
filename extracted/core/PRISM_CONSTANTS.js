// ============================================================================
// PRISM_CONSTANTS - Extracted from v8.89 Monolith
// Extraction Date: 2026-01-29 17:32:10
// Source: C:\Users\Admin.DIGITALSTORM-PC\Box\C:\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html
// Lines: 7567 to 10016 (2450 lines)
// 
// TIVE Protocol: TRACE ✓ | ISOLATE ✓ | VALIDATE (pending) | EXTRACT ✓
// Dependencies: NONE (leaf node - foundation module)
// Consumers: 23+ helper modules, ALL other PRISM modules
// ============================================================================

// Version: 8.87.002 (post-audit)
// Date: January 19, 2026
// Purpose: Centralize ALL constants, add missing AI/UTILIZATION/MATERIALS sections
// ═══════════════════════════════════════════════════════════════════════════════════════

const PRISM_CONSTANTS = Object.freeze({
    // ═══════════════════════════════════════════════════════════════════════════════════
    // VERSION & BUILD INFO
    // ═══════════════════════════════════════════════════════════════════════════════════
    VERSION: '8.89.001',
    BUILD_DATE: '2026-01-19',
    CONSOLIDATION_PHASE: 'SESSION_1_3_TRUE_ABSOLUTE_MAXIMUM',
    SESSION: '1.3_EXPANDED',

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TOLERANCE - All modules MUST use these tolerances
    // Source: MIT 2.008 Manufacturing Processes, PRISM Engineering Standards
    // ═══════════════════════════════════════════════════════════════════════════════════
    TOLERANCE: Object.freeze({
        // Geometric tolerances
        POSITION: 1e-6,          // mm - geometric position comparisons
        ANGLE: 1e-6,             // radians - angular comparisons
        PARAMETER: 1e-10,        // NURBS/spline parameter space
        SINGULARITY: 0.01,       // radians (~0.57°) - kinematic singularity threshold
        CONVERGENCE: 1e-8,       // iterative solver convergence criterion
        ZERO: 1e-12,             // "is this effectively zero?" checks
        COPLANAR: 1e-5,          // coplanarity checks
        PARALLEL: 1e-6,          // parallelism checks
        PERPENDICULAR: 1e-6,     // perpendicularity checks
        UNIT_VECTOR: 1e-6,       // unit vector normalization check
        
        // Manufacturing tolerances (NEW)
        SURFACE_FINISH: 0.001,   // mm (1 micron) - Ra comparison tolerance
        TOOL_WEAR: 0.01,         // mm - VB flank wear measurement tolerance
        DIMENSIONAL: 0.005,      // mm - typical machining dimensional tolerance
        RUNOUT: 0.002,           // mm - tool/spindle runout tolerance
        DEFLECTION: 0.001,       // mm - acceptable deflection tolerance
        THERMAL: 0.01,           // °C - temperature comparison tolerance
        FORCE: 1.0,              // N - force comparison tolerance
        POWER: 0.01              // kW - power comparison tolerance
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // LIMITS - Numerical limits to prevent infinite loops, numerical instability
    // ═══════════════════════════════════════════════════════════════════════════════════
    LIMITS: Object.freeze({
        // Iteration limits
        MAX_ITERATIONS: 100,         // general iterative methods
        MAX_NEWTON_ITER: 50,         // Newton-Raphson specifically
        MAX_IK_ITER: 50,             // inverse kinematics iterations
        MAX_OPTIMIZATION_ITER: 500,  // optimization algorithms
        
        // Numerical stability
        DAMPING_FACTOR: 0.5,         // Levenberg-Marquardt damping
        DAMPING_MIN: 1e-6,
        DAMPING_MAX: 1e6,
        CONDITION_THRESHOLD: 1e10,   // matrix conditioning warning
        CONDITION_REJECT: 1e14,      // matrix conditioning rejection
        MIN_STEP_SIZE: 1e-12,
        
        // Data limits
        MAX_TOOLPATH_POINTS: 1e7,
        MAX_MESH_FACES: 1e7,
        MAX_ARRAY_SIZE: 1e8,
        
        // Machining limits (NEW)
        MAX_RPM: 100000,             // Maximum spindle RPM
        MIN_RPM: 1,                  // Minimum spindle RPM
        MAX_FEED: 100000,            // mm/min - Maximum feed rate
        MIN_FEED: 0.001,             // mm/min - Minimum feed rate
        MAX_DOC: 100,                // mm - Maximum depth of cut
        MIN_DOC: 0.001,              // mm - Minimum depth of cut
        MAX_WOC: 500,                // mm - Maximum width of cut
        MAX_POWER: 200,              // kW - Maximum spindle power
        MAX_TORQUE: 5000,            // Nm - Maximum spindle torque
        MAX_FORCE: 100000,           // N - Maximum cutting force
        MAX_TOOL_DIAMETER: 500,      // mm
        MIN_TOOL_DIAMETER: 0.1,      // mm
        MAX_TOOL_LENGTH: 500,        // mm
        MAX_STICKOUT: 300,           // mm - Maximum tool stickout
        MAX_TEMPERATURE: 1500,       // °C - Maximum cutting temperature
        
        // Scheduling limits
        MAX_JOBS: 10000,
        MAX_MACHINES: 1000,
        MAX_OPERATIONS: 100000
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // PHYSICS - Physical constants
    // Sources: MIT 2.008, MIT 3.22, NIST, Engineering handbooks
    // ═══════════════════════════════════════════════════════════════════════════════════
    PHYSICS: Object.freeze({
        // Fundamental constants
        GRAVITY: 9810,               // mm/s² (9.81 m/s²)
        GRAVITY_MS2: 9.81,           // m/s² - standard gravity
        AIR_DENSITY: 1.225e-9,       // kg/mm³
        ROOM_TEMP_C: 20,             // °C - standard room temperature
        ROOM_TEMP_K: 293.15,         // K - standard room temperature
        STEFAN_BOLTZMANN: 5.67e-8,   // W/(m²·K⁴)
        
        // Mathematical constants
        PI: Math.PI,
        TWO_PI: 2 * Math.PI,
        HALF_PI: Math.PI / 2,
        DEG_TO_RAD: Math.PI / 180,
        RAD_TO_DEG: 180 / Math.PI,
        GOLDEN_RATIO: 1.618033988749895,
        
        // Conversion constants
        MM_PER_INCH: 25.4,
        INCH_PER_MM: 0.03937007874
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // MATERIALS - Material physics constants (NEW SECTION)
    // Sources: MIT 3.22 Mechanical Behavior of Materials, ASM Handbook
    // ═══════════════════════════════════════════════════════════════════════════════════
    MATERIALS: Object.freeze({
        // Densities (kg/m³)
        STEEL_DENSITY: 7850,
        ALUMINUM_DENSITY: 2700,
        TITANIUM_DENSITY: 4500,
        CARBIDE_DENSITY: 14500,
        HSS_DENSITY: 8100,
        CAST_IRON_DENSITY: 7200,
        BRASS_DENSITY: 8500,
        COPPER_DENSITY: 8960,
        INCONEL_DENSITY: 8440,
        COOLANT_DENSITY: 1000,       // Water-based coolant
        
        // Young's Modulus (MPa)
        CARBIDE_YOUNGS_MODULUS: 620000,
        HSS_YOUNGS_MODULUS: 200000,
        STEEL_YOUNGS_MODULUS: 210000,
        ALUMINUM_YOUNGS_MODULUS: 70000,
        TITANIUM_YOUNGS_MODULUS: 114000,
        CAST_IRON_YOUNGS_MODULUS: 170000,
        BRASS_YOUNGS_MODULUS: 100000,
        COPPER_YOUNGS_MODULUS: 117000,
        
        // Poisson's Ratio (dimensionless)
        STEEL_POISSON: 0.30,
        ALUMINUM_POISSON: 0.33,
        TITANIUM_POISSON: 0.34,
        CARBIDE_POISSON: 0.22,
        
        // Thermal Conductivity (W/(m·K))
        STEEL_THERMAL_CONDUCTIVITY: 50,
        ALUMINUM_THERMAL_CONDUCTIVITY: 237,
        TITANIUM_THERMAL_CONDUCTIVITY: 17,
        CARBIDE_THERMAL_CONDUCTIVITY: 100,
        COPPER_THERMAL_CONDUCTIVITY: 401,
        
        // Specific Heat (J/(kg·K))
        STEEL_SPECIFIC_HEAT: 500,
        ALUMINUM_SPECIFIC_HEAT: 900,
        TITANIUM_SPECIFIC_HEAT: 520,
        CARBIDE_SPECIFIC_HEAT: 200,
        
        // Thermal Expansion Coefficient (1/K × 10⁻⁶)
        STEEL_THERMAL_EXPANSION: 12,
        ALUMINUM_THERMAL_EXPANSION: 23,
        TITANIUM_THERMAL_EXPANSION: 8.6,
        CARBIDE_THERMAL_EXPANSION: 5.0,
        
        // Melting Points (°C)
        STEEL_MELTING_POINT: 1450,
        ALUMINUM_MELTING_POINT: 660,
        TITANIUM_MELTING_POINT: 1668,
        CARBIDE_MELTING_POINT: 2870
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TAYLOR - Tool life equation constants (NEW SECTION)
    // Sources: MIT 2.008, Frederick Taylor research
    // ═══════════════════════════════════════════════════════════════════════════════════
    TAYLOR: Object.freeze({
        // Default Taylor exponents by material class
        DEFAULT_N_STEEL: 0.125,
        DEFAULT_N_ALUMINUM: 0.40,
        DEFAULT_N_TITANIUM: 0.20,
        DEFAULT_N_CAST_IRON: 0.25,
        DEFAULT_N_STAINLESS: 0.15,
        DEFAULT_N_SUPERALLOY: 0.10,
        
        // Temperature adjustment factors
        TEMP_FACTOR_THRESHOLD: 400,    // °C - above this, temp affects tool life
        TEMP_FACTOR_COEFFICIENT: 0.002, // per °C above threshold
        
        // Feed adjustment factor
        FEED_EXPONENT: 0.8,            // Tool life vs feed relationship
        
        // DOC adjustment factor
        DOC_EXPONENT: 0.15,            // Tool life vs DOC relationship
        
        // Wear criteria
        VB_MAX_ROUGHING: 0.6,          // mm - max flank wear for roughing
        VB_MAX_FINISHING: 0.3,         // mm - max flank wear for finishing
        VB_MAX_PRECISION: 0.15,        // mm - max flank wear for precision
        CRATER_WEAR_RATIO: 0.25,       // crater wear / flank wear ratio
        
        // Minimum tool life threshold
        MIN_TOOL_LIFE: 1,              // minutes - below this, parameters are bad
        WARNING_TOOL_LIFE: 5           // minutes - warn if below this
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // FORCE - Cutting force constants (NEW SECTION)
    // Sources: MIT 2.008, Merchant/Kienzle models
    // ═══════════════════════════════════════════════════════════════════════════════════
    FORCE: Object.freeze({
        // Default specific cutting force (N/mm²) by material class
        DEFAULT_KC_STEEL: 2000,
        DEFAULT_KC_ALUMINUM: 700,
        DEFAULT_KC_TITANIUM: 1400,
        DEFAULT_KC_CAST_IRON: 1200,
        DEFAULT_KC_STAINLESS: 2500,
        DEFAULT_KC_SUPERALLOY: 3000,
        
        // Kienzle exponent defaults
        DEFAULT_MC_STEEL: 0.25,
        DEFAULT_MC_ALUMINUM: 0.30,
        DEFAULT_MC_TITANIUM: 0.22,
        DEFAULT_MC_CAST_IRON: 0.28,
        
        // Force distribution factors
        TANGENTIAL_FACTOR: 1.0,
        RADIAL_FACTOR: 0.4,
        AXIAL_FACTOR: 0.25,
        
        // Merchant's shear angle constants
        MERCHANT_BETA: 0.5,            // Friction angle approximation
        
        // Safety factors
        FORCE_SAFETY_FACTOR: 1.5,
        POWER_SAFETY_FACTOR: 1.3
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // AI - Artificial Intelligence and Machine Learning constants (NEW SECTION)
    // Sources: MIT 6.036, Stanford CS229, Deep Learning best practices
    // ═══════════════════════════════════════════════════════════════════════════════════
    AI: Object.freeze({
        // Particle Swarm Optimization
        PSO_MAX_PARTICLES: 100,
        PSO_MAX_ITERATIONS: 200,
        PSO_INERTIA_WEIGHT: 0.7,
        PSO_COGNITIVE_FACTOR: 1.5,
        PSO_SOCIAL_FACTOR: 1.5,
        PSO_VELOCITY_CLAMP: 0.5,
        
        // Ant Colony Optimization
        ACO_MAX_ANTS: 50,
        ACO_MAX_ITERATIONS: 100,
        ACO_ALPHA: 1.0,               // Pheromone importance
        ACO_BETA: 2.0,                // Heuristic importance
        ACO_EVAPORATION: 0.5,
        ACO_Q: 100,                   // Pheromone deposit factor
        
        // Genetic Algorithm
        GA_MAX_POPULATION: 200,
        GA_MAX_GENERATIONS: 100,
        GA_MUTATION_RATE: 0.01,
        GA_CROSSOVER_RATE: 0.8,
        GA_ELITE_RATIO: 0.1,
        GA_TOURNAMENT_SIZE: 3,
        
        // Monte Carlo
        MONTE_CARLO_SAMPLES: 10000,
        MONTE_CARLO_MIN_SAMPLES: 1000,
        MONTE_CARLO_CONVERGENCE: 0.01,
        
        // Neural Networks
        NEURAL_MAX_LAYERS: 10,
        NEURAL_MAX_NEURONS: 1024,
        NEURAL_DEFAULT_LAYERS: 3,
        NEURAL_DEFAULT_NEURONS: 64,
        LEARNING_RATE_DEFAULT: 0.001,
        LEARNING_RATE_MIN: 1e-6,
        LEARNING_RATE_MAX: 0.1,
        BATCH_SIZE_DEFAULT: 32,
        DROPOUT_DEFAULT: 0.2,
        EPOCHS_DEFAULT: 100,
        EPOCHS_MAX: 1000,
        
        // Bayesian
        BAYESIAN_CONFIDENCE_THRESHOLD: 0.7,
        BAYESIAN_MIN_SAMPLES: 10,
        BAYESIAN_PRIOR_WEIGHT: 0.3,
        BAYESIAN_UPDATE_RATE: 0.1,
        
        // Reinforcement Learning
        RL_DISCOUNT_FACTOR: 0.99,
        RL_EPSILON_START: 1.0,
        RL_EPSILON_END: 0.01,
        RL_EPSILON_DECAY: 0.995,
        RL_REPLAY_BUFFER_SIZE: 10000,
        
        // Clustering
        KMEANS_MAX_CLUSTERS: 20,
        KMEANS_MAX_ITERATIONS: 300,
        DBSCAN_MIN_SAMPLES: 5,
        DBSCAN_EPSILON: 0.5,
        
        // Feature importance threshold
        FEATURE_IMPORTANCE_THRESHOLD: 0.05,
        
        // Model evaluation
        CV_FOLDS: 5,
        TEST_SPLIT_RATIO: 0.2,
        VALIDATION_SPLIT_RATIO: 0.1,
        
        // ═══════════════════════════════════════════════════════════════════════════
        // DEEP LEARNING - Comprehensive neural network architectures
        // Sources: MIT 6.867, Stanford CS229/CS231n, Deep Learning (Goodfellow)
        // ═══════════════════════════════════════════════════════════════════════════
        
        // Convolutional Neural Networks (CNN)
        CNN_DEFAULT_FILTERS: [32, 64, 128, 256],
        CNN_KERNEL_SIZE_DEFAULT: 3,
        CNN_POOL_SIZE_DEFAULT: 2,
        CNN_STRIDE_DEFAULT: 1,
        CNN_PADDING_SAME: 'same',
        CNN_PADDING_VALID: 'valid',
        
        // Recurrent Neural Networks (RNN/LSTM/GRU)
        RNN_HIDDEN_SIZE_DEFAULT: 128,
        RNN_NUM_LAYERS_DEFAULT: 2,
        LSTM_HIDDEN_SIZE_DEFAULT: 256,
        LSTM_NUM_LAYERS_DEFAULT: 2,
        LSTM_BIDIRECTIONAL: true,
        GRU_HIDDEN_SIZE_DEFAULT: 128,
        GRU_NUM_LAYERS_DEFAULT: 2,
        SEQUENCE_LENGTH_DEFAULT: 50,
        
        // Transformer Architecture
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
        // Minimum consumers per data source
        MIN_DATABASE_CONSUMERS: 10,
        MIN_DATABASE_CONSUMERS_CRITICAL: 15,  // For critical databases like materials
        
        // Minimum applications per AI engine
        MIN_AI_ENGINE_USES: 5,
        MIN_AI_ENGINE_USES_CRITICAL: 8,       // For critical engines like Bayesian
        
        // Minimum contexts per physics model
        MIN_PHYSICS_CONTEXTS: 5,
        MIN_PHYSICS_CONTEXTS_CRITICAL: 8,     // For critical models like Taylor
        
        // Minimum sources per calculation
        MIN_CALCULATION_SOURCES: 6,
        
        // Target utilization scores (%)
        TARGET_DATABASE_UTILIZATION: 100,
        TARGET_AI_UTILIZATION: 100,
        TARGET_PHYSICS_UTILIZATION: 100,
        TARGET_FUSION_UTILIZATION: 100,
        TARGET_LEARNING_UTILIZATION: 100,
        
        // Warning thresholds (%)
        WARNING_UTILIZATION: 80,
        CRITICAL_UTILIZATION: 50
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // MACHINING - Default machining parameters
    // ═══════════════════════════════════════════════════════════════════════════════════
    MACHINING: Object.freeze({
        DEFAULT_SPINDLE_RPM: 6000,
        DEFAULT_FEEDRATE_MMPM: 1000,
        DEFAULT_FEEDRATE_IPM: 40,
        DEFAULT_PLUNGE_PERCENT: 50,
        DEFAULT_APPROACH_DIST: 5,
        DEFAULT_RETRACT_DIST: 2,
        DEFAULT_CLEARANCE_PLANE: 50,
        DEFAULT_STOCK_ALLOWANCE: 0.5,
        MIN_TOOL_DIAMETER: 0.1,
        MAX_TOOL_DIAMETER: 200,
        
        // Surface speed ranges (m/min)
        MIN_SURFACE_SPEED: 1,
        MAX_SURFACE_SPEED: 1000,
        
        // Chip load ranges (mm/tooth)
        MIN_CHIP_LOAD: 0.001,
        MAX_CHIP_LOAD: 1.0,
        
        // Spindle efficiency
        SPINDLE_EFFICIENCY: 0.85,
        
        // Default tool life target (minutes)
        TARGET_TOOL_LIFE: 45
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // QUALITY - Quality and tolerance constants (NEW SECTION)
    // ═══════════════════════════════════════════════════════════════════════════════════
    QUALITY: Object.freeze({
        // Surface finish grades (Ra in μm)
        RA_ROUGH: 6.3,
        RA_SEMI_FINISH: 3.2,
        RA_FINISH: 1.6,
        RA_FINE_FINISH: 0.8,
        RA_PRECISION: 0.4,
        RA_MIRROR: 0.1,
        
        // IT tolerance grades (μm per mm)
        IT6: 10,
        IT7: 16,
        IT8: 25,
        IT9: 40,
        IT10: 64,
        IT11: 100,
        
        // Cpk targets
        CPK_MINIMUM: 1.0,
        CPK_ACCEPTABLE: 1.33,
        CPK_EXCELLENT: 1.67,
        CPK_SIX_SIGMA: 2.0
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // STABILITY - Chatter and vibration constants (NEW SECTION)
    // Sources: MIT 2.004 Dynamics and Control
    // ═══════════════════════════════════════════════════════════════════════════════════
    STABILITY: Object.freeze({
        // Damping ratio defaults
        DEFAULT_DAMPING_RATIO: 0.03,
        MIN_DAMPING_RATIO: 0.01,
        MAX_DAMPING_RATIO: 0.10,
        
        // Natural frequency estimation
        MIN_NATURAL_FREQ: 100,       // Hz
        MAX_NATURAL_FREQ: 5000,      // Hz
        
        // Stability margin
        STABILITY_MARGIN: 0.85,      // Stay within 85% of stability limit
        WARNING_MARGIN: 0.95,        // Warn at 95% of stability limit
        
        // FFT settings
        FFT_WINDOW_SIZE: 1024,
        FFT_OVERLAP: 0.5,
        FFT_SAMPLE_RATE: 10000,      // Hz
        
        // Chatter detection thresholds
        CHATTER_AMPLITUDE_THRESHOLD: 0.1,  // mm
        CHATTER_FREQUENCY_MIN: 500,        // Hz
        CHATTER_FREQUENCY_MAX: 3000        // Hz
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // THERMAL - Thermal constants (NEW SECTION)
    // Sources: MIT 3.21 Heat Transfer
    // ═══════════════════════════════════════════════════════════════════════════════════
    THERMAL: Object.freeze({
        // Coolant properties
        COOLANT_SPECIFIC_HEAT: 4186,    // J/(kg·K) - water-based
        COOLANT_EFFICIENCY: 0.15,       // Heat removal efficiency
        MIN_COOLANT_TEMP: 15,           // °C
        MAX_COOLANT_TEMP: 35,           // °C
        
        // Heat partition
        CHIP_HEAT_FRACTION: 0.80,       // Heat going to chip
        TOOL_HEAT_FRACTION: 0.10,       // Heat going to tool
        WORKPIECE_HEAT_FRACTION: 0.10,  // Heat going to workpiece
        
        // Temperature limits
        MAX_TOOL_TEMP_CARBIDE: 800,     // °C
        MAX_TOOL_TEMP_HSS: 600,         // °C
        MAX_TOOL_TEMP_CERAMIC: 1200,    // °C
        MAX_WORKPIECE_TEMP_STEEL: 300,  // °C - to avoid thermal damage
        MAX_WORKPIECE_TEMP_ALUMINUM: 150 // °C
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // COATINGS - Tool coating performance factors
    // Sources: Sandvik, Kennametal, empirical testing data
    // ═══════════════════════════════════════════════════════════════════════════════════
    COATINGS: Object.freeze({
        // Life multipliers (relative to uncoated = 1.0)
        LIFE_UNCOATED: 1.0,
        LIFE_TIN: 1.5,
        LIFE_TICN: 1.7,
        LIFE_TIALN: 2.2,
        LIFE_ALTIN: 2.5,
        LIFE_ALCRN: 2.8,
        LIFE_NACO: 3.0,
        LIFE_DLC: 3.5,
        LIFE_CVD: 2.0,
        LIFE_PVD: 2.3,
        LIFE_DIAMOND: 5.0,
        LIFE_CBN: 4.0,
        
        // Speed multipliers (relative to uncoated = 1.0)
        SPEED_UNCOATED: 1.0,
        SPEED_TIN: 1.2,
        SPEED_TICN: 1.3,
        SPEED_TIALN: 1.5,
        SPEED_ALTIN: 1.6,
        SPEED_ALCRN: 1.7,
        SPEED_NACO: 1.8,
        SPEED_DLC: 1.5,
        SPEED_CVD: 1.4,
        SPEED_PVD: 1.5,
        SPEED_DIAMOND: 2.0,
        SPEED_CBN: 1.8,
        
        // Cost multipliers (relative to uncoated = 1.0)
        COST_UNCOATED: 1.0,
        COST_TIN: 1.15,
        COST_TICN: 1.25,
        COST_TIALN: 1.35,
        COST_ALTIN: 1.40,
        COST_ALCRN: 1.45,
        COST_NACO: 1.55,
        COST_DLC: 1.60,
        COST_CVD: 1.30,
        COST_PVD: 1.35,
        COST_DIAMOND: 3.0,
        COST_CBN: 2.5,
        
        // Maximum operating temperature (°C)
        MAX_TEMP_UNCOATED: 400,
        MAX_TEMP_TIN: 550,
        MAX_TEMP_TICN: 450,
        MAX_TEMP_TIALN: 800,
        MAX_TEMP_ALTIN: 900,
        MAX_TEMP_ALCRN: 1100,
        MAX_TEMP_NACO: 1200,
        MAX_TEMP_DLC: 300,
        MAX_TEMP_CVD: 600,
        MAX_TEMP_PVD: 700,
        MAX_TEMP_DIAMOND: 600,
        MAX_TEMP_CBN: 1000
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // COOLANT - Coolant effectiveness factors
    // ═══════════════════════════════════════════════════════════════════════════════════
    COOLANT: Object.freeze({
        // Tool life multipliers
        LIFE_DRY: 0.7,
        LIFE_MIST: 0.85,
        LIFE_FLOOD: 1.0,
        LIFE_THROUGH_SPINDLE: 1.15,
        LIFE_CRYOGENIC: 1.4,
        LIFE_MQL: 0.95,
        
        // Speed multipliers
        SPEED_DRY: 0.8,
        SPEED_MIST: 0.9,
        SPEED_FLOOD: 1.0,
        SPEED_THROUGH_SPINDLE: 1.1,
        SPEED_CRYOGENIC: 1.3,
        SPEED_MQL: 0.95,
        
        // Pressure ranges (PSI)
        PRESSURE_LOW: 150,
        PRESSURE_STANDARD: 300,
        PRESSURE_HIGH: 1000,
        PRESSURE_ULTRA_HIGH: 2000,
        
        // Flow rates (GPM)
        FLOW_MINIMUM: 1.0,
        FLOW_STANDARD: 5.0,
        FLOW_HIGH_PERFORMANCE: 15.0
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // OPERATIONS - Operation-specific constants
    // Sources: MIT 2.008, Machinist's Handbook
    // ═══════════════════════════════════════════════════════════════════════════════════
    OPERATIONS: Object.freeze({
        // Roughing parameters (multipliers of tool diameter)
        ROUGHING_DOC_PERCENT: 100,
        ROUGHING_WOC_PERCENT: 50,
        ROUGHING_SPEED_FACTOR: 0.85,
        ROUGHING_FEED_FACTOR: 1.0,
        
        // Semi-finishing parameters
        SEMIFINISH_DOC_PERCENT: 25,
        SEMIFINISH_WOC_PERCENT: 25,
        SEMIFINISH_SPEED_FACTOR: 1.0,
        
        // Finishing parameters
        FINISHING_DOC_MAX: 0.5,
        FINISHING_WOC_MAX: 0.25,
        FINISHING_SPEED_FACTOR: 1.15,
        FINISHING_FEED_FACTOR: 0.8,
        
        // High-speed machining (HSM)
        HSM_RADIAL_ENGAGEMENT_MAX: 0.15,
        HSM_CHIPLOAD_FACTOR: 1.5,
        HSM_MIN_RPM: 10000,
        
        // Trochoidal/Adaptive milling
        TROCHOIDAL_STEPOVER_PERCENT: 10,
        TROCHOIDAL_SPEED_FACTOR: 1.3,
        TROCHOIDAL_DOC_FACTOR: 2.0,
        
        // Plunge milling
        PLUNGE_FEED_PERCENT: 30,
        PLUNGE_RETRACT_HEIGHT: 2.0,
        
        // Ramping/Helical entry
        RAMP_ANGLE_DEFAULT: 3.0,
        RAMP_ANGLE_MAX: 10.0,
        HELIX_ANGLE_DEFAULT: 2.0,
        HELIX_DIAMETER_PERCENT: 90
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // INTERPOLATION - Safety factors for interpolated/estimated values
    // ═══════════════════════════════════════════════════════════════════════════════════
    INTERPOLATION: Object.freeze({
        PARAMETER_SAFETY_FACTOR: 0.85,
        UNTESTED_SAFETY_FACTOR: 0.75,
        FIRST_TIME_SAFETY_FACTOR: 0.80,
        DIFFICULT_MATERIAL_SAFETY: 0.70,
        EXTRAPOLATION_CONFIDENCE_DECAY: 0.10,
        MAX_EXTRAPOLATION_PERCENT: 25
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // CONFIDENCE - Confidence level thresholds for AI/ML systems
    // ═══════════════════════════════════════════════════════════════════════════════════
    CONFIDENCE: Object.freeze({
        VERY_HIGH: 0.95,
        HIGH: 0.85,
        MEDIUM: 0.70,
        LOW: 0.50,
        VERY_LOW: 0.30,
        AUTO_PROCEED_THRESHOLD: 0.85,
        WARN_THRESHOLD: 0.70,
        BLOCK_THRESHOLD: 0.50,
        RECOMMEND_THRESHOLD: 0.75,
        STRONG_RECOMMEND_THRESHOLD: 0.90,
        UPDATE_THRESHOLD: 0.60,
        DISCARD_THRESHOLD: 0.30
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // MANUFACTURERS - Manufacturer quality ratings (0-100)
    // Sources: Industry surveys, tool performance data
    // ═══════════════════════════════════════════════════════════════════════════════════
    MANUFACTURERS: Object.freeze({
        QUALITY_SANDVIK: 95,
        QUALITY_KENNAMETAL: 92,
        QUALITY_ISCAR: 90,
        QUALITY_SECO: 90,
        QUALITY_MITSUBISHI: 93,
        QUALITY_WALTER: 91,
        QUALITY_TUNGALOY: 88,
        QUALITY_OSG: 90,
        QUALITY_GUHRING: 89,
        QUALITY_EMUGE: 91,
        QUALITY_HARVEY: 85,
        QUALITY_HELICAL: 86,
        QUALITY_SGS: 84,
        QUALITY_KYOCERA: 88,
        QUALITY_SUMITOMO: 89,
        QUALITY_MOLDINO: 94,
        QUALITY_YG1: 80,
        QUALITY_MA_FORD: 78,
        QUALITY_NACHI: 82,
        QUALITY_DEFAULT: 75,
        PREMIUM_THRESHOLD: 90,
        STANDARD_THRESHOLD: 80,
        ECONOMY_THRESHOLD: 70
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // GCODE - G-code and M-code constants
    // ═══════════════════════════════════════════════════════════════════════════════════
    GCODE: Object.freeze({
        // Motion G-codes
        G_RAPID: 0,
        G_LINEAR: 1,
        G_CW_ARC: 2,
        G_CCW_ARC: 3,
        G_DWELL: 4,
        
        // Unit G-codes
        G_INCH: 20,
        G_METRIC: 21,
        
        // Reference G-codes
        G_HOME: 28,
        G_SECONDARY_HOME: 30,
        
        // Coordinate G-codes
        G_ABSOLUTE: 90,
        G_INCREMENTAL: 91,
        
        // Feed mode G-codes
        G_FEED_PER_MIN: 94,
        G_FEED_PER_REV: 95,
        
        // Spindle G-codes (lathe)
        G_CONSTANT_SURFACE: 96,
        G_CONSTANT_RPM: 97,
        
        // Canned cycles
        G_CANCEL_CYCLE: 80,
        G_DRILL: 81,
        G_SPOT_DRILL: 82,
        G_PECK_DRILL: 83,
        G_TAP: 84,
        G_BORE: 85,
        G_BORE_STOP: 86,
        G_BACK_BORE: 87,
        
        // Compensation
        G_CUTTER_COMP_OFF: 40,
        G_CUTTER_COMP_LEFT: 41,
        G_CUTTER_COMP_RIGHT: 42,
        G_TOOL_LENGTH_COMP: 43,
        G_TOOL_LENGTH_COMP_NEG: 44,
        G_TOOL_LENGTH_CANCEL: 49,
        
        // M-codes
        M_PROGRAM_STOP: 0,
        M_OPTIONAL_STOP: 1,
        M_PROGRAM_END: 2,
        M_SPINDLE_CW: 3,
        M_SPINDLE_CCW: 4,
        M_SPINDLE_STOP: 5,
        M_TOOL_CHANGE: 6,
        M_MIST_COOLANT: 7,
        M_FLOOD_COOLANT: 8,
        M_COOLANT_OFF: 9,
        M_PROGRAM_END_RESET: 30,
        
        // Output precision
        POSITION_DECIMALS_INCH: 4,
        POSITION_DECIMALS_METRIC: 3,
        FEED_DECIMALS: 1,
        SPEED_DECIMALS: 0
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // THREADING - Thread cutting and tapping constants
    // Sources: Machinery's Handbook, OSG tap recommendations
    // ═══════════════════════════════════════════════════════════════════════════════════
    THREADING: Object.freeze({
        // Thread engagement percentages
        THREAD_PERCENT_MIN: 50,
        THREAD_PERCENT_STANDARD: 65,
        THREAD_PERCENT_MAX: 85,
        THREAD_PERCENT_ALUMINUM: 75,
        THREAD_PERCENT_STEEL: 65,
        THREAD_PERCENT_STAINLESS: 60,
        
        // Tap drill recommendations (% of minor diameter)
        TAP_DRILL_50_PERCENT: 0.786,
        TAP_DRILL_65_PERCENT: 0.846,
        TAP_DRILL_75_PERCENT: 0.891,
        TAP_DRILL_85_PERCENT: 0.936,
        
        // Thread milling constants
        THREAD_MILL_PASSES_MIN: 1,
        THREAD_MILL_PASSES_DEEP: 3,
        THREAD_MILL_ENTRY_RADIAL: 0.25,
        THREAD_MILL_SPRING_PASSES: 0.5,
        
        // Single-point threading
        INFEED_ANGLE_MODIFIED: 29.5,
        INFEED_ANGLE_RADIAL: 0,
        INFEED_ANGLE_COMPOUND: 30,
        PASSES_MIN_STEEL: 4,
        PASSES_MIN_ALUMINUM: 3,
        PASSES_MIN_TITANIUM: 6,
        SPRING_PASSES: 2,
        
        // Speed factors for tapping
        TAP_SPEED_FACTOR_HSS: 0.5,
        TAP_SPEED_FACTOR_COBALT: 0.65,
        TAP_SPEED_FACTOR_CARBIDE: 1.0,
        TAP_SPEED_FACTOR_FORM: 0.8
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // DRILLING - Drilling and hole-making constants
    // Sources: Kennametal drill recommendations, empirical data
    // ═══════════════════════════════════════════════════════════════════════════════════
    DRILLING: Object.freeze({
        // Peck drilling ratios (multiple of drill diameter)
        PECK_DEPTH_STANDARD: 1.5,
        PECK_DEPTH_DEEP_HOLE: 0.5,
        PECK_DEPTH_ALUMINUM: 2.0,
        PECK_DEPTH_STAINLESS: 0.75,
        PECK_DEPTH_TITANIUM: 0.5,
        
        // Deep hole thresholds (L/D ratio)
        DEEP_HOLE_THRESHOLD: 4,
        GUNDRILLING_THRESHOLD: 10,
        
        // Retract heights (mm)
        PECK_RETRACT_PARTIAL: 0.5,
        PECK_RETRACT_FULL: 2.0,
        RAPID_PLANE_HEIGHT: 5.0,
        
        // Point angles (degrees)
        POINT_ANGLE_STANDARD: 118,
        POINT_ANGLE_SELF_CENTERING: 135,
        POINT_ANGLE_ALUMINUM: 130,
        POINT_ANGLE_TITANIUM: 130,
        
        // Pilot hole recommendations
        PILOT_DIAMETER_RATIO: 0.5,
        PILOT_DEPTH_FACTOR: 1.5,
        
        // Spot drill recommendations
        SPOT_ANGLE_STANDARD: 90,
        SPOT_ANGLE_MATCHED: 118,
        SPOT_DEPTH_FACTOR: 0.33,
        
        // Through coolant pressure thresholds
        TSC_PRESSURE_MIN: 300,
        TSC_PRESSURE_OPTIMAL: 1000,
        
        // Countersink/Counterbore
        COUNTERSINK_ANGLE_STANDARD: 82,
        COUNTERSINK_ANGLE_METRIC: 90,
        COUNTERBORE_CLEARANCE: 0.005
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TOOL_GEOMETRY - Default tool geometry values
    // Sources: Manufacturer standards, empirical optimization
    // ═══════════════════════════════════════════════════════════════════════════════════
    TOOL_GEOMETRY: Object.freeze({
        // Helix angles (degrees)
        HELIX_STANDARD: 30,
        HELIX_HIGH_PERFORMANCE: 35,
        HELIX_ALUMINUM: 45,
        HELIX_FINISHING: 40,
        HELIX_HARDENED: 25,
        HELIX_VARIABLE_LOW: 35,
        HELIX_VARIABLE_HIGH: 38,
        
        // Rake angles (degrees)
        RAKE_POSITIVE: 12,
        RAKE_NEUTRAL: 0,
        RAKE_NEGATIVE: -6,
        RAKE_ALUMINUM: 15,
        RAKE_HARDENED: -5,
        
        // Relief/clearance angles (degrees)
        RELIEF_PRIMARY: 8,
        RELIEF_SECONDARY: 12,
        RELIEF_DRILLING: 10,
        
        // Corner radius ratios (of diameter)
        CORNER_RADIUS_STANDARD: 0.03,
        CORNER_RADIUS_FINISHING: 0.05,
        CORNER_RADIUS_ROUGHING: 0.02,
        CORNER_FULL: 0.5,
        
        // Length ratios
        LOC_TO_DIAMETER_STANDARD: 3,
        LOC_TO_DIAMETER_LONG: 4,
        LOC_TO_DIAMETER_STUB: 1.5,
        STICKOUT_TO_DIAMETER_MAX: 4,
        STICKOUT_TO_DIAMETER_OPTIMAL: 2.5,
        
        // Flute count defaults
        FLUTES_ALUMINUM: 2,
        FLUTES_STEEL: 4,
        FLUTES_FINISHING: 6,
        FLUTES_HARDENED: 6,
        FLUTES_TITANIUM: 5
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // WORK_HOLDING - Workholding and fixturing constants
    // Sources: Machining handbooks, setup guidelines
    // ═══════════════════════════════════════════════════════════════════════════════════
    WORK_HOLDING: Object.freeze({
        // Clamping force factors
        CLAMP_FORCE_SAFETY_FACTOR: 2.5,
        CLAMP_FORCE_FRICTION_STEEL: 0.15,
        CLAMP_FORCE_FRICTION_ALUMINUM: 0.12,
        
        // Minimum clamping contact (mm)
        MIN_CLAMP_CONTACT: 10,
        MIN_JAW_OVERLAP_PERCENT: 25,
        
        // Vise jaw parallels (mm)
        PARALLEL_HEIGHT_MIN: 10,
        PARALLEL_HEIGHT_STEP: 5,
        
        // Vacuum workholding
        VACUUM_PRESSURE_MIN: 0.7,
        VACUUM_SEAL_AREA_MIN: 25,
        
        // Magnetic workholding (kg/cm²)
        MAG_CHUCK_HOLDING_FORCE: 12,
        MAG_CHUCK_THICKNESS_MIN: 10,
        
        // Part support
        SUPPORT_SPACING_MAX: 150,
        OVERHANG_MAX_RATIO: 0.3,
        
        // Fixture plate
        FIXTURE_GRID_SPACING_INCH: 1.0,
        FIXTURE_GRID_SPACING_METRIC: 25,
        DOWEL_CLEARANCE: 0.0002,
        LOCATOR_REPEATABILITY: 0.0001
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // SURFACE_FINISH - Surface finish targets and Ra/Rz values
    // Sources: ISO standards, manufacturing guidelines
    // ═══════════════════════════════════════════════════════════════════════════════════
    SURFACE_FINISH: Object.freeze({
        // Ra targets (µm)
        RA_ROUGH: 6.3,
        RA_SEMI_FINISH: 3.2,
        RA_FINISH: 1.6,
        RA_FINE_FINISH: 0.8,
        RA_PRECISION: 0.4,
        RA_MIRROR: 0.1,
        
        // Ra targets (µin) - for inch users
        RA_ROUGH_INCH: 250,
        RA_SEMI_FINISH_INCH: 125,
        RA_FINISH_INCH: 63,
        RA_FINE_FINISH_INCH: 32,
        RA_PRECISION_INCH: 16,
        RA_MIRROR_INCH: 4,
        
        // Rz to Ra ratio (approximate)
        RZ_TO_RA_RATIO: 4.0,
        
        // Feed rate factors for surface finish
        FEED_FACTOR_RA_6_3: 1.0,
        FEED_FACTOR_RA_3_2: 0.7,
        FEED_FACTOR_RA_1_6: 0.5,
        FEED_FACTOR_RA_0_8: 0.35,
        FEED_FACTOR_RA_0_4: 0.25,
        
        // Nose radius effect (cusp height calculation)
        CUSP_STEPOVER_FACTOR: 0.707
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // WEAR - Tool wear modes, patterns, and thresholds
    // Sources: Tool Wear (ISO 3685), Machining Handbook, MIT 2.008
    // ═══════════════════════════════════════════════════════════════════════════════════
    WEAR: Object.freeze({
        // Flank wear (VB) thresholds (mm)
        VB_MAX_FINISHING: 0.15,
        VB_MAX_SEMI_FINISHING: 0.25,
        VB_MAX_ROUGHING: 0.30,
        VB_MAX_HEAVY_ROUGHING: 0.40,
        VB_UNIFORM_THRESHOLD: 0.30,
        VBN_NOTCH_THRESHOLD: 0.60,      // Notch wear limit
        
        // Crater wear (KT) thresholds (mm)
        KT_MAX: 0.10,
        KT_KB_RATIO: 0.4,               // Crater depth to width ratio
        
        // Built-up edge (BUE) indicators
        BUE_SPEED_MIN: 20,              // m/min - below this BUE likely
        BUE_SPEED_MAX: 100,             // m/min - above this BUE unlikely
        BUE_TEMP_THRESHOLD: 350,        // °C - temperature where BUE forms
        
        // Wear progression rates (mm/min typical)
        WEAR_RATE_INITIAL: 0.001,       // Break-in wear
        WEAR_RATE_STEADY: 0.0005,       // Steady-state wear
        WEAR_RATE_RAPID: 0.005,         // End-of-life rapid wear
        
        // Wear mode identification
        ABRASIVE_WEAR_HARDNESS_RATIO: 1.3,  // Tool/workpiece hardness
        DIFFUSION_WEAR_TEMP: 800,       // °C threshold
        ADHESION_WEAR_SPEED: 50,        // m/min threshold
        OXIDATION_WEAR_TEMP: 600,       // °C threshold
        
        // Tool life criteria
        TOOL_LIFE_VB: 0.30,             // mm - standard criterion
        TOOL_LIFE_SURFACE_FINISH: 2.0,  // Ra multiplication factor
        TOOL_LIFE_FORCE_INCREASE: 1.5,  // 50% force increase
        TOOL_LIFE_POWER_INCREASE: 1.3   // 30% power increase
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TURNING - Lathe operations, insert geometry, and turning-specific parameters
    // Sources: Sandvik Turning Guide, Kennametal, ISO 1832
    // ═══════════════════════════════════════════════════════════════════════════════════
    TURNING: Object.freeze({
        // Insert shapes (ISO designation approach angle effect)
        INSERT_CNMG_APPROACH: 95,       // degrees
        INSERT_DNMG_APPROACH: 93,
        INSERT_TNMG_APPROACH: 91,
        INSERT_VNMG_APPROACH: 72.5,
        INSERT_WNMG_APPROACH: 80,
        INSERT_SNMG_APPROACH: 75,
        INSERT_RCMT_APPROACH: 0,        // Round insert - variable
        
        // Insert nose radius (mm)
        NOSE_RADIUS_FINE: 0.2,
        NOSE_RADIUS_LIGHT: 0.4,
        NOSE_RADIUS_MEDIUM: 0.8,
        NOSE_RADIUS_HEAVY: 1.2,
        NOSE_RADIUS_MAX: 2.4,
        
        // Lead angle effect on chip thickness
        LEAD_ANGLE_CHIP_THIN_FACTOR: 0.707,  // At 45° lead
        
        // Feed rate limits by nose radius (feed ≤ 0.5 × nose radius)
        FEED_NOSE_RADIUS_RATIO_FINISH: 0.3,
        FEED_NOSE_RADIUS_RATIO_ROUGH: 0.5,
        
        // Depth of cut limits
        DOC_MIN_CHIP_THICKNESS: 0.05,   // mm - minimum for proper chip
        DOC_NOSE_RADIUS_RATIO_MIN: 0.5, // DOC ≥ 0.5 × nose radius
        DOC_INSERT_LENGTH_RATIO_MAX: 0.67, // DOC ≤ 2/3 cutting edge
        
        // Cutting speed factors by operation
        SPEED_FACTOR_FACING: 1.0,
        SPEED_FACTOR_LONGITUDINAL: 1.0,
        SPEED_FACTOR_PROFILING: 0.85,
        SPEED_FACTOR_GROOVING: 0.7,
        SPEED_FACTOR_PARTING: 0.5,
        SPEED_FACTOR_THREADING: 0.3,
        
        // Bar diameter to chuck overhang ratio
        OVERHANG_RATIO_SAFE: 3.0,       // L/D for unsupported
        OVERHANG_RATIO_WITH_TAILSTOCK: 8.0,
        OVERHANG_RATIO_STEADY_REST: 12.0,
        
        // Surface speed limits
        SURFACE_SPEED_MIN_DIAMETER: 0.1 // m/min minimum at small diameters
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // BORING - Boring bar parameters, L/D ratios, deflection limits
    // Sources: Sandvik Boring Guide, Big Kaiser, Kennametal
    // ═══════════════════════════════════════════════════════════════════════════════════
    BORING: Object.freeze({
        // L/D ratio limits
        LD_RATIO_STEEL_BAR_MAX: 4.0,
        LD_RATIO_CARBIDE_BAR_MAX: 6.0,
        LD_RATIO_HEAVY_METAL_MAX: 8.0,
        LD_RATIO_DAMPED_BAR_MAX: 10.0,
        LD_RATIO_ULTRA_PRECISION: 3.0,
        
        // Deflection limits (mm)
        DEFLECTION_MAX_FINISHING: 0.010,
        DEFLECTION_MAX_SEMI_FINISH: 0.025,
        DEFLECTION_MAX_ROUGHING: 0.050,
        
        // Bar diameter to bore diameter ratio
        BAR_TO_BORE_RATIO_MIN: 0.65,
        BAR_TO_BORE_RATIO_OPTIMAL: 0.70,
        
        // Speed/feed reductions for boring
        SPEED_REDUCTION_LD_4: 1.0,
        SPEED_REDUCTION_LD_6: 0.85,
        SPEED_REDUCTION_LD_8: 0.70,
        SPEED_REDUCTION_LD_10: 0.55,
        
        FEED_REDUCTION_LD_4: 1.0,
        FEED_REDUCTION_LD_6: 0.75,
        FEED_REDUCTION_LD_8: 0.50,
        FEED_REDUCTION_LD_10: 0.35,
        
        // Back boring factors
        BACK_BORING_SPEED_FACTOR: 0.7,
        BACK_BORING_FEED_FACTOR: 0.5,
        
        // Minimum bore diameter for different operations
        MIN_BORE_STANDARD: 3.0,         // mm
        MIN_BORE_MICRO: 0.5             // mm
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // REAMING - Reaming allowances, oversizing, and parameters
    // Sources: Machinery's Handbook, OSG, Guhring
    // ═══════════════════════════════════════════════════════════════════════════════════
    REAMING: Object.freeze({
        // Stock allowance (mm per side)
        STOCK_ALLOWANCE_SMALL: 0.10,    // < 6mm diameter
        STOCK_ALLOWANCE_MEDIUM: 0.15,   // 6-12mm diameter
        STOCK_ALLOWANCE_LARGE: 0.20,    // 12-25mm diameter
        STOCK_ALLOWANCE_XLARGE: 0.25,   // > 25mm diameter
        
        // Oversize (mm) - reamers cut slightly oversize
        OVERSIZE_HSS_STEEL: 0.010,
        OVERSIZE_HSS_ALUMINUM: 0.015,
        OVERSIZE_CARBIDE_STEEL: 0.008,
        OVERSIZE_CARBIDE_ALUMINUM: 0.012,
        
        // Speed factors (relative to drilling)
        SPEED_FACTOR_HSS: 0.5,
        SPEED_FACTOR_CARBIDE: 1.5,
        SPEED_FACTOR_COBALT: 0.7,
        
        // Feed factors (relative to drilling, reamers use higher feed)
        FEED_FACTOR_FINISH: 2.0,
        FEED_FACTOR_SEMI_FINISH: 2.5,
        FEED_FACTOR_ROUGH: 3.0,
        
        // Chamfer requirements
        CHAMFER_ANGLE_DEGREES: 45,
        CHAMFER_DEPTH_RATIO: 0.05,      // 5% of diameter
        
        // Floating holder recommendations
        FLOATING_HOLDER_RUNOUT_MAX: 0.003  // mm
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // GRINDING - Wheel specifications, G-ratios, and grinding parameters
    // Sources: Norton Grinding Manual, Machinery's Handbook, ANSI B74.13
    // ═══════════════════════════════════════════════════════════════════════════════════
    GRINDING: Object.freeze({
        // Wheel grades (hardness A=soft, Z=hard)
        GRADE_SOFT_START: 'A',
        GRADE_SOFT_END: 'G',
        GRADE_MEDIUM_START: 'H',
        GRADE_MEDIUM_END: 'P',
        GRADE_HARD_START: 'Q',
        GRADE_HARD_END: 'Z',
        
        // Recommended grades by material
        GRADE_ALUMINUM: 'H',            // Soft wheel for soft material
        GRADE_MILD_STEEL: 'K',
        GRADE_HARDENED_STEEL: 'J',
        GRADE_STAINLESS: 'I',
        GRADE_CAST_IRON: 'L',
        GRADE_CARBIDE: 'H',
        
        // Structure (1=dense, 16=open)
        STRUCTURE_DENSE: 4,
        STRUCTURE_MEDIUM: 8,
        STRUCTURE_OPEN: 12,
        
        // Bond types
        BOND_VITRIFIED: 'V',
        BOND_RESINOID: 'B',
        BOND_RUBBER: 'R',
        BOND_METAL: 'M',
        BOND_ELECTROPLATED: 'E',
        
        // G-ratio (volume ground / volume wheel worn)
        G_RATIO_AL2O3_STEEL: 60,
        G_RATIO_SIC_CAST_IRON: 40,
        G_RATIO_CBN_HARDENED: 5000,
        G_RATIO_DIAMOND_CARBIDE: 10000,
        
        // Surface speeds (m/s)
        WHEEL_SPEED_VITRIFIED_MAX: 35,
        WHEEL_SPEED_RESINOID_MAX: 50,
        WHEEL_SPEED_CBN_MAX: 80,
        WHEEL_SPEED_DIAMOND_MAX: 30,
        
        // Infeed rates (mm)
        INFEED_ROUGH: 0.025,
        INFEED_SEMI_FINISH: 0.010,
        INFEED_FINISH: 0.005,
        INFEED_SPARK_OUT: 0.002,
        
        // Dressing parameters
        DRESS_DEPTH: 0.025,             // mm per pass
        DRESS_LEAD: 0.15,               // mm per revolution
        DRESS_FREQUENCY_ROUGH: 5,       // parts between dress
        DRESS_FREQUENCY_FINISH: 20
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // EDM - Electrical Discharge Machining parameters
    // Sources: Makino EDM Guide, Sodick, Charmilles
    // ═══════════════════════════════════════════════════════════════════════════════════
    EDM: Object.freeze({
        // Spark gap (mm)
        SPARK_GAP_ROUGH: 0.05,
        SPARK_GAP_SEMI_FINISH: 0.025,
        SPARK_GAP_FINISH: 0.010,
        SPARK_GAP_MIRROR: 0.005,
        
        // Overburn (mm) - actual removal beyond electrode
        OVERBURN_ROUGH: 0.10,
        OVERBURN_FINISH: 0.02,
        
        // Electrode wear ratio (electrode wear / material removal)
        WEAR_RATIO_GRAPHITE_STEEL: 0.1,
        WEAR_RATIO_COPPER_STEEL: 0.3,
        WEAR_RATIO_COPPER_TUNGSTEN: 0.5,
        WEAR_RATIO_GRAPHITE_CARBIDE: 0.2,
        
        // Material removal rate (mm³/min typical)
        MRR_ROUGH_GRAPHITE: 500,
        MRR_FINISH_GRAPHITE: 10,
        MRR_ROUGH_COPPER: 200,
        MRR_FINISH_COPPER: 5,
        
        // Surface finish achievable (Ra µm)
        RA_ROUGH_EDM: 6.3,
        RA_FINISH_EDM: 0.8,
        RA_MIRROR_EDM: 0.1,
        
        // Recast layer thickness (µm)
        RECAST_ROUGH: 30,
        RECAST_SEMI_FINISH: 15,
        RECAST_FINISH: 5,
        RECAST_MIRROR: 2,
        
        // Wire EDM specific
        WIRE_DIAMETER_STANDARD: 0.25,   // mm
        WIRE_DIAMETER_FINE: 0.10,
        WIRE_TENSION_STANDARD: 1200,    // grams
        WIRE_SPEED_STANDARD: 10,        // m/min
        
        // Flushing pressure (bar)
        FLUSH_PRESSURE_ROUGH: 1.5,
        FLUSH_PRESSURE_FINISH: 0.5
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TIME_ESTIMATION - Cycle time calculation factors
    // Sources: Shop experience, MTConnect data, PRISM learning
    // ═══════════════════════════════════════════════════════════════════════════════════
    TIME_ESTIMATION: Object.freeze({
        // Non-cutting time factors
        RAPID_TRAVEL_FACTOR: 1.1,       // Account for accel/decel
        TOOL_CHANGE_STANDARD: 5,        // seconds
        TOOL_CHANGE_FAST: 2,            // seconds (high-speed ATC)
        TOOL_CHANGE_TURRET: 1,          // seconds (lathe turret)
        
        // Setup time estimates (minutes)
        SETUP_FIRST_PART: 30,
        SETUP_REPEAT_PART: 15,
        SETUP_FIXTURE_SIMPLE: 10,
        SETUP_FIXTURE_COMPLEX: 45,
        SETUP_TOOL_TOUCH_OFF: 2,        // per tool
        SETUP_WORK_OFFSET: 5,
        
        // Load/unload times (seconds)
        LOAD_UNLOAD_MANUAL_SMALL: 15,
        LOAD_UNLOAD_MANUAL_MEDIUM: 30,
        LOAD_UNLOAD_MANUAL_LARGE: 60,
        LOAD_UNLOAD_ROBOT: 10,
        LOAD_UNLOAD_PALLET: 20,
        
        // Inspection time factors
        INSPECTION_IN_PROCESS: 30,      // seconds
        INSPECTION_FIRST_ARTICLE: 300,  // seconds (5 min)
        
        // Efficiency factors
        MACHINE_EFFICIENCY_NEW: 0.95,
        MACHINE_EFFICIENCY_STANDARD: 0.85,
        MACHINE_EFFICIENCY_OLD: 0.75,
        
        // Contingency factors
        CONTINGENCY_FIRST_RUN: 1.5,
        CONTINGENCY_REPEAT: 1.1,
        CONTINGENCY_DIFFICULT: 1.3,
        
        // Batch factors
        BATCH_SETUP_AMORTIZATION: true,
        LEARNING_CURVE_FACTOR: 0.95     // Each doubling reduces time by 5%
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // MAINTENANCE - Machine maintenance schedules and thresholds
    // Sources: Machine tool manuals, TPM guidelines, PRISM learning
    // ═══════════════════════════════════════════════════════════════════════════════════
    MAINTENANCE: Object.freeze({
        // Spindle maintenance (hours)
        SPINDLE_BEARING_CHECK: 2000,
        SPINDLE_BEARING_REPLACE: 20000,
        SPINDLE_RUNOUT_CHECK: 500,
        SPINDLE_RUNOUT_MAX: 0.005,      // mm
        
        // Way/guideway maintenance (hours)
        WAY_LUBE_CHECK: 8,              // Daily
        WAY_LUBE_CHANGE: 2000,
        BALL_SCREW_CHECK: 1000,
        BALL_SCREW_REPLACE: 50000,
        LINEAR_GUIDE_CHECK: 500,
        
        // Coolant maintenance
        COOLANT_CONCENTRATION_CHECK: 8, // Daily (hours)
        COOLANT_CONCENTRATION_MIN: 5,   // %
        COOLANT_CONCENTRATION_MAX: 10,  // %
        COOLANT_PH_MIN: 8.5,
        COOLANT_PH_MAX: 9.5,
        COOLANT_CHANGE_INTERVAL: 2000,  // hours
        
        // Tool magazine maintenance
        TOOL_MAGAZINE_CLEAN: 500,       // hours
        ATC_FINGER_CHECK: 1000,
        
        // Hydraulic/pneumatic
        HYDRAULIC_FILTER_CHANGE: 2000,
        PNEUMATIC_FILTER_CHECK: 500,
        AIR_DRYER_CHECK: 1000,
        
        // Calibration intervals (hours)
        CALIBRATION_GEOMETRIC: 2000,
        CALIBRATION_LASER: 4000,
        CALIBRATION_PROBE: 500,
        
        // Predictive maintenance thresholds
        VIBRATION_WARNING_G: 2.0,       // mm/s²
        VIBRATION_CRITICAL_G: 5.0,
        TEMP_RISE_WARNING: 10,          // °C above baseline
        TEMP_RISE_CRITICAL: 25
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // SAFETY - Safety factors by application and criticality
    // Sources: ASME, aerospace standards, automotive standards
    // ═══════════════════════════════════════════════════════════════════════════════════
    SAFETY: Object.freeze({
        // Safety factors by application
        FACTOR_GENERAL_MACHINING: 1.5,
        FACTOR_PRECISION_MACHINING: 2.0,
        FACTOR_AEROSPACE: 2.5,
        FACTOR_MEDICAL_IMPLANT: 3.0,
        FACTOR_NUCLEAR: 4.0,
        FACTOR_PROTOTYPE: 1.25,
        FACTOR_PRODUCTION: 1.5,
        
        // Force safety factors
        FORCE_FACTOR_CLAMP: 2.5,
        FORCE_FACTOR_FIXTURE: 2.0,
        FORCE_FACTOR_TOOL: 1.5,
        
        // Speed safety factors (% of max)
        SPEED_LIMIT_FACTOR: 0.90,       // Never exceed 90% max
        SPEED_FIRST_RUN_FACTOR: 0.50,   // Start at 50% for new setup
        
        // Power safety factors
        POWER_LIMIT_FACTOR: 0.85,       // Keep 15% reserve
        POWER_PEAK_FACTOR: 0.75,        // Peak should be 75% max
        
        // Material criticality ratings
        CRITICALITY_STANDARD: 1,
        CRITICALITY_SAFETY: 2,
        CRITICALITY_FLIGHT_CRITICAL: 3,
        
        // Inspection requirements by criticality
        INSPECTION_STANDARD: 'SAMPLING',
        INSPECTION_SAFETY: '100_PERCENT',
        INSPECTION_FLIGHT: '100_PERCENT_NDT',
        
        // Documentation requirements
        DOC_STANDARD: 'BASIC',
        DOC_AEROSPACE: 'AS9100',
        DOC_MEDICAL: 'ISO_13485',
        DOC_AUTOMOTIVE: 'IATF_16949'
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // ERROR_CODES - Standardized error codes with severity and actions
    // Sources: PRISM error handling protocol
    // ═══════════════════════════════════════════════════════════════════════════════════
    ERROR_CODES: Object.freeze({
        // Severity levels
        SEVERITY_INFO: 0,
        SEVERITY_WARNING: 1,
        SEVERITY_ERROR: 2,
        SEVERITY_CRITICAL: 3,
        SEVERITY_FATAL: 4,
        
        // Input validation errors (1xxx)
        ERR_INVALID_INPUT: 1000,
        ERR_MISSING_REQUIRED: 1001,
        ERR_OUT_OF_RANGE: 1002,
        ERR_INVALID_TYPE: 1003,
        ERR_INVALID_UNIT: 1004,
        ERR_NEGATIVE_VALUE: 1005,
        ERR_ZERO_VALUE: 1006,
        
        // Calculation errors (2xxx)
        ERR_DIVISION_BY_ZERO: 2000,
        ERR_NEGATIVE_SQRT: 2001,
        ERR_OVERFLOW: 2002,
        ERR_UNDERFLOW: 2003,
        ERR_NON_CONVERGENT: 2004,
        ERR_SINGULAR_MATRIX: 2005,
        ERR_NUMERICAL_INSTABILITY: 2006,
        
        // Database errors (3xxx)
        ERR_NOT_FOUND: 3000,
        ERR_DUPLICATE_KEY: 3001,
        ERR_DATABASE_UNAVAILABLE: 3002,
        ERR_INVALID_REFERENCE: 3003,
        ERR_DATA_CORRUPTION: 3004,
        
        // Machine/physics errors (4xxx)
        ERR_EXCEEDS_RPM: 4000,
        ERR_EXCEEDS_FEED: 4001,
        ERR_EXCEEDS_POWER: 4002,
        ERR_EXCEEDS_TORQUE: 4003,
        ERR_CHATTER_PREDICTED: 4004,
        ERR_DEFLECTION_EXCEEDED: 4005,
        ERR_THERMAL_EXCEEDED: 4006,
        
        // AI/ML errors (5xxx)
        ERR_LOW_CONFIDENCE: 5000,
        ERR_INSUFFICIENT_DATA: 5001,
        ERR_MODEL_NOT_TRAINED: 5002,
        ERR_PREDICTION_FAILED: 5003,
        ERR_OPTIMIZATION_FAILED: 5004,
        ERR_CONVERGENCE_FAILED: 5005,
        
        // System errors (9xxx)
        ERR_SYSTEM_ERROR: 9000,
        ERR_TIMEOUT: 9001,
        ERR_NETWORK_ERROR: 9002,
        ERR_RESOURCE_EXHAUSTED: 9003,
        ERR_NOT_IMPLEMENTED: 9999
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // MILLING - Milling-specific constants (NEW - 5,323 codebase uses)
    // Sources: MIT 2.008, Machinery's Handbook, Sandvik Coromant
    // ═══════════════════════════════════════════════════════════════════════════════════
    MILLING: Object.freeze({
        // Helix angle defaults by tool type (degrees)
        HELIX_ANGLE_STANDARD: 30,
        HELIX_ANGLE_HIGH_HELIX: 45,
        HELIX_ANGLE_LOW_HELIX: 15,
        HELIX_ANGLE_ALUMINUM: 45,
        HELIX_ANGLE_STAINLESS: 35,
        HELIX_ANGLE_ROUGHING: 25,
        
        // Engagement angles and stepover
        DEFAULT_STEPOVER_PERCENT: 0.50,      // 50% of tool diameter
        FINISH_STEPOVER_PERCENT: 0.10,       // 10% for finishing
        ROUGH_STEPOVER_PERCENT: 0.65,        // 65% for roughing
        HSM_STEPOVER_PERCENT: 0.10,          // High-speed machining
        MAX_STEPOVER_PERCENT: 0.90,          // Never exceed 90%
        
        // Radial engagement factors
        RADIAL_ENGAGEMENT_SLOT: 1.0,         // Full slot
        RADIAL_ENGAGEMENT_SIDE: 0.5,         // Side milling
        RADIAL_ENGAGEMENT_FINISH: 0.1,       // Finishing pass
        
        // Axial depth factors (times diameter)
        AXIAL_DEPTH_ROUGHING: 1.0,           // 1x diameter
        AXIAL_DEPTH_FINISHING: 0.5,          // 0.5x diameter
        AXIAL_DEPTH_ALUMINUM: 1.5,           // 1.5x diameter for aluminum
        AXIAL_DEPTH_STEEL: 0.75,             // 0.75x diameter for steel
        AXIAL_DEPTH_STAINLESS: 0.5,          // 0.5x for stainless
        AXIAL_DEPTH_TITANIUM: 0.25,          // 0.25x for titanium
        
        // Ramp and helix entry
        RAMP_ANGLE_DEFAULT: 3,               // degrees
        RAMP_ANGLE_STEEL: 2,
        RAMP_ANGLE_ALUMINUM: 5,
        RAMP_ANGLE_TITANIUM: 1,
        HELIX_ENTRY_ANGLE: 2,                // degrees
        HELIX_ENTRY_RADIUS_FACTOR: 0.5,      // times tool diameter
        
        // Chip thinning compensation
        CHIP_THINNING_THRESHOLD: 0.7,        // Ae/D below this, apply compensation
        CHIP_THINNING_FACTOR_MAX: 1.5,       // Maximum feed increase
        
        // Face milling specifics
        FACE_MILL_OVERLAP: 0.75,             // 75% overlap for face milling
        FACE_MILL_ENTRY_ANGLE: 45,           // degrees from perpendicular
        
        // Plunge milling
        PLUNGE_FEED_FACTOR: 0.3,             // 30% of normal feed
        PLUNGE_RETRACT_CLEARANCE: 1.0,       // mm
        
        // Trochoidal/adaptive
        TROCHOIDAL_STEPOVER: 0.10,           // 10% of diameter
        TROCHOIDAL_MAX_ENGAGEMENT: 0.15,     // 15% radial engagement
        ADAPTIVE_ARC_RADIUS_FACTOR: 0.4      // times tool diameter
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // SPINDLE - Spindle dynamics and characteristics (NEW - 6,285 codebase uses)
    // Sources: MIT 2.75 Precision Machine Design, Machine tool specifications
    // ═══════════════════════════════════════════════════════════════════════════════════
    SPINDLE: Object.freeze({
        // Speed categories (RPM)
        SPEED_LOW_MAX: 3000,
        SPEED_MEDIUM_MAX: 12000,
        SPEED_HIGH_MAX: 30000,
        SPEED_ULTRA_HIGH_MAX: 60000,
        SPEED_MICRO_MAX: 100000,
        
        // Typical spindle speeds by machine type
        VMC_STANDARD_MAX: 10000,
        VMC_HIGH_SPEED_MAX: 24000,
        HMC_STANDARD_MAX: 15000,
        LATHE_STANDARD_MAX: 4000,
        LATHE_HIGH_SPEED_MAX: 8000,
        SWISS_LATHE_MAX: 12000,
        
        // Acceleration/deceleration
        ACCEL_TIME_STANDARD: 2.0,            // seconds to full speed
        ACCEL_TIME_HIGH_SPEED: 1.0,
        ACCEL_TIME_DIRECT_DRIVE: 0.5,
        DECEL_TIME_FACTOR: 1.2,              // usually slower than accel
        
        // Bearing characteristics
        BEARING_NATURAL_FREQ_LOW: 500,       // Hz
        BEARING_NATURAL_FREQ_MED: 1000,
        BEARING_NATURAL_FREQ_HIGH: 2000,
        BEARING_DAMPING_RATIO: 0.05,
        
        // Runout specifications (mm)
        RUNOUT_PRECISION: 0.002,
        RUNOUT_STANDARD: 0.005,
        RUNOUT_ECONOMY: 0.010,
        RUNOUT_MICRO_PRECISION: 0.001,
        
        // Power curves (percentage of rated power)
        POWER_AT_25_PERCENT_SPEED: 0.25,
        POWER_AT_50_PERCENT_SPEED: 0.50,
        POWER_AT_75_PERCENT_SPEED: 0.85,
        POWER_AT_100_PERCENT_SPEED: 1.00,
        CONSTANT_POWER_START: 0.30,          // Speed ratio where constant power begins
        
        // Torque curves
        TORQUE_AT_BASE_SPEED: 1.00,          // Maximum torque at base speed
        TORQUE_DROPOFF_FACTOR: 0.7,          // Torque at max speed as fraction of base
        
        // Thermal characteristics
        THERMAL_GROWTH_COEFFICIENT: 0.001,   // mm/°C
        WARMUP_TIME_MINUTES: 20,
        THERMAL_STABILIZATION_TIME: 60,      // minutes
        
        // Orient/rigid tapping
        ORIENT_ACCURACY: 0.1,                // degrees
        RIGID_TAP_SYNC_ACCURACY: 0.5,        // degrees
        
        // Motor types
        MOTOR_TYPE_BELT: 'belt',
        MOTOR_TYPE_GEAR: 'gear',
        MOTOR_TYPE_DIRECT: 'direct',
        MOTOR_TYPE_INTEGRAL: 'integral'
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TOOLPATH - CAM toolpath generation constants (NEW - 4,211 codebase uses)
    // Sources: CAM software documentation, Manufacturing best practices
    // ═══════════════════════════════════════════════════════════════════════════════════
    TOOLPATH: Object.freeze({
        // Arc fitting
        ARC_FIT_TOLERANCE: 0.001,            // mm
        ARC_FIT_MIN_RADIUS: 0.1,             // mm
        ARC_FIT_MAX_RADIUS: 10000,           // mm
        ARC_FIT_MIN_ANGLE: 5,                // degrees
        ARC_FIT_MAX_ANGLE: 180,              // degrees
        
        // Point reduction/optimization
        POINT_REDUCTION_TOLERANCE: 0.005,    // mm
        POINT_REDUCTION_ANGLE_TOL: 1.0,      // degrees
        MAX_POINTS_PER_MOVE: 10000,
        MIN_SEGMENT_LENGTH: 0.001,           // mm
        
        // Clearance planes
        CLEARANCE_PLANE_DEFAULT: 25.4,       // mm (1 inch)
        CLEARANCE_PLANE_MINIMUM: 5.0,        // mm
        RETRACT_PLANE_DEFAULT: 2.0,          // mm above part
        SAFE_Z_INCREMENT: 0.5,               // mm
        
        // Lead-in/Lead-out
        LEAD_IN_RADIUS_FACTOR: 0.5,          // times tool radius
        LEAD_IN_ANGLE: 90,                   // degrees
        LEAD_OUT_RADIUS_FACTOR: 0.5,
        LEAD_OUT_ANGLE: 90,
        TANGENT_EXTENSION: 1.0,              // mm
        
        // Linking moves
        LINK_CLEARANCE: 5.0,                 // mm above obstacles
        LINK_RETRACT_DISTANCE: 2.0,          // mm
        LINK_SAME_LEVEL_TOL: 0.1,            // mm - within this, stay at same Z
        
        // Stock recognition
        STOCK_OFFSET_DEFAULT: 0.5,           // mm
        STOCK_FLOOR_OFFSET: 0.1,             // mm
        IN_PROCESS_STOCK_UPDATE: true,
        
        // Smoothing
        CORNER_ROUNDING_RADIUS: 0.5,         // mm
        SMOOTHING_TOLERANCE: 0.01,           // mm
        FEED_OPTIMIZATION_LOOKAHEAD: 20,     // points
        
        // Containment
        BOUNDARY_OFFSET: 0.0,                // mm
        SILHOUETTE_BOUNDARY: true,
        KEEP_TOOL_DOWN: true,
        
        // 3D finishing
        SCALLOP_HEIGHT_DEFAULT: 0.01,        // mm
        CUSP_HEIGHT_DEFAULT: 0.01,           // mm
        CONTACT_POINT_SPACING: 1.0,          // mm
        GOUGE_CHECK_TOLERANCE: 0.001,        // mm
        
        // Rest machining
        REST_MATERIAL_OFFSET: 0.01,          // mm
        CORNER_BLEND_FACTOR: 0.9             // detect corners within this of tool radius
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // ECONOMICS - Cost and pricing constants (NEW - 23,666 codebase uses)
    // Sources: Manufacturing cost models, PRISM pricing strategy
    // ═══════════════════════════════════════════════════════════════════════════════════
    ECONOMICS: Object.freeze({
        // Hourly rates by machine type (USD)
        RATE_MANUAL_MILL: 45,
        RATE_VMC_3AXIS: 75,
        RATE_VMC_4AXIS: 95,
        RATE_VMC_5AXIS: 150,
        RATE_HMC: 125,
        RATE_LATHE_MANUAL: 40,
        RATE_LATHE_CNC: 65,
        RATE_LATHE_MULTITASK: 175,
        RATE_SWISS: 95,
        RATE_EDM_SINKER: 85,
        RATE_EDM_WIRE: 75,
        RATE_LASER: 100,
        RATE_WATERJET: 85,
        RATE_GRINDING: 90,
        
        // Labor rates (USD/hour)
        LABOR_OPERATOR: 25,
        LABOR_SETUP: 35,
        LABOR_PROGRAMMING: 75,
        LABOR_INSPECTION: 45,
        LABOR_ENGINEERING: 100,
        
        // Overhead factors
        OVERHEAD_FACTOR_SMALL_SHOP: 1.5,
        OVERHEAD_FACTOR_MEDIUM_SHOP: 1.75,
        OVERHEAD_FACTOR_LARGE_SHOP: 2.0,
        OVERHEAD_FACTOR_AEROSPACE: 2.5,
        
        // Material markup
        MATERIAL_MARKUP_DEFAULT: 1.25,       // 25% markup
        MATERIAL_MARKUP_EXOTIC: 1.15,        // Lower markup on expensive materials
        MATERIAL_MARKUP_ALUMINUM: 1.30,
        
        // Tooling cost factors
        TOOL_COST_PER_EDGE_CARBIDE: 3.50,
        TOOL_COST_PER_EDGE_CERAMIC: 8.00,
        TOOL_COST_PER_EDGE_CBN: 25.00,
        TOOL_COST_PER_EDGE_PCD: 50.00,
        TOOLING_BURDEN_FACTOR: 1.15,         // 15% for holders, presetters, etc.
        
        // Quantity breaks
        QTY_BREAK_1: 1,
        QTY_BREAK_2: 10,
        QTY_BREAK_3: 50,
        QTY_BREAK_4: 100,
        QTY_BREAK_5: 500,
        QTY_DISCOUNT_2: 0.95,                // 5% discount
        QTY_DISCOUNT_3: 0.88,                // 12% discount
        QTY_DISCOUNT_4: 0.82,                // 18% discount
        QTY_DISCOUNT_5: 0.75,                // 25% discount
        
        // Lead time factors (days)
        LEAD_STANDARD: 10,
        LEAD_EXPEDITE_FACTOR: 1.5,           // 50% premium
        LEAD_HOT_FACTOR: 2.0,                // 100% premium
        
        // Profit margins
        MARGIN_MINIMUM: 0.15,                // 15%
        MARGIN_TARGET: 0.25,                 // 25%
        MARGIN_PREMIUM: 0.35,                // 35% for specialty work
        
        // Currency
        DEFAULT_CURRENCY: 'USD',
        EXCHANGE_RATE_EUR: 1.08,
        EXCHANGE_RATE_GBP: 1.27,
        EXCHANGE_RATE_JPY: 0.0067,
        EXCHANGE_RATE_CNY: 0.14
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // SIMULATION - Toolpath verification and simulation (NEW - 3,565 codebase uses)
    // Sources: Vericut, NCSimul documentation, PRISM simulation engine
    // ═══════════════════════════════════════════════════════════════════════════════════
    SIMULATION: Object.freeze({
        // Resolution settings
        VOXEL_SIZE_COARSE: 1.0,              // mm
        VOXEL_SIZE_STANDARD: 0.5,            // mm
        VOXEL_SIZE_FINE: 0.25,               // mm
        VOXEL_SIZE_ULTRA: 0.1,               // mm
        
        // Time step
        TIME_STEP_DEFAULT: 0.01,             // seconds
        TIME_STEP_MIN: 0.001,
        TIME_STEP_MAX: 0.1,
        
        // Collision detection
        COLLISION_CHECK_TOLERANCE: 0.1,      // mm
        NEAR_MISS_THRESHOLD: 1.0,            // mm
        COLLISION_ZONE_EXPANSION: 2.0,       // mm
        
        // Gouge detection
        GOUGE_TOLERANCE: 0.001,              // mm
        GOUGE_CHECK_DENSITY: 10,             // points per mm
        
        // Material removal visualization
        STOCK_COLOR_UNMACHINED: '#808080',
        STOCK_COLOR_ROUGHED: '#A0A0A0',
        STOCK_COLOR_FINISHED: '#C0C0C0',
        EXCESS_MATERIAL_COLOR: '#FF0000',
        GOUGE_COLOR: '#FF00FF',
        
        // Animation
        ANIMATION_SPEED_SLOW: 0.25,
        ANIMATION_SPEED_NORMAL: 1.0,
        ANIMATION_SPEED_FAST: 4.0,
        ANIMATION_SPEED_MAX: 16.0,
        FRAME_RATE_TARGET: 30,               // fps
        
        // Verification thresholds
        STOCK_REMAINING_WARNING: 0.5,        // mm
        STOCK_REMAINING_ERROR: 1.0,          // mm
        UNDERCUT_WARNING: 0.01,              // mm
        
        // Machine simulation
        AXIS_POSITION_TOLERANCE: 0.001,      // mm
        AXIS_VELOCITY_MAX: 30000,            // mm/min
        AXIS_ACCEL_MAX: 5000,                // mm/s²
        ROTARY_VELOCITY_MAX: 10000,          // deg/min
        
        // Report generation
        REPORT_DECIMALS: 3,
        REPORT_INCLUDE_SCREENSHOTS: true,
        REPORT_MAX_WARNINGS: 100
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // FIXTURE - Workholding and fixturing constants (NEW - 2,215 codebase uses)
    // Sources: MIT 2.008, Workholding handbooks, PRISM fixture design
    // ═══════════════════════════════════════════════════════════════════════════════════
    FIXTURE: Object.freeze({
        // Clamping forces (N)
        CLAMP_FORCE_LIGHT: 500,
        CLAMP_FORCE_MEDIUM: 2000,
        CLAMP_FORCE_HEAVY: 5000,
        CLAMP_FORCE_MAX: 10000,
        
        // Friction coefficients
        FRICTION_STEEL_STEEL: 0.15,
        FRICTION_ALUMINUM_STEEL: 0.12,
        FRICTION_SOFT_JAWS: 0.25,
        FRICTION_SERRATED: 0.35,
        FRICTION_DIAMOND: 0.45,
        
        // Safety factors
        CLAMP_SAFETY_FACTOR: 2.5,
        STABILITY_SAFETY_FACTOR: 1.5,
        
        // Vise specifications
        VISE_JAW_WIDTH_STANDARD: 150,        // mm
        VISE_JAW_WIDTH_WIDE: 200,
        VISE_OPENING_MAX: 200,               // mm
        VISE_REPEATABILITY: 0.01,            // mm
        
        // Chuck specifications
        CHUCK_3JAW_ACCURACY: 0.05,           // mm TIR
        CHUCK_6JAW_ACCURACY: 0.025,
        CHUCK_COLLET_ACCURACY: 0.005,
        CHUCK_GRIP_LENGTH_MIN: 10,           // mm
        CHUCK_GRIP_LENGTH_RATIO: 1.5,        // times diameter minimum
        
        // Vacuum fixturing
        VACUUM_PRESSURE: 0.085,              // MPa (85 kPa)
        VACUUM_HOLD_FORCE: 8.5,              // N/cm² at 85 kPa
        VACUUM_SAFETY_FACTOR: 3.0,
        VACUUM_MIN_AREA: 100,                // mm² minimum contact
        
        // Magnetic fixturing
        MAGNETIC_FORCE_DENSITY: 10,          // N/cm²
        MAGNETIC_MATERIAL_FACTOR_STEEL: 1.0,
        MAGNETIC_MATERIAL_FACTOR_CAST_IRON: 0.85,
        
        // Pallet systems
        PALLET_REPEATABILITY: 0.005,         // mm
        PALLET_CHANGE_TIME: 20,              // seconds
        PALLET_CLAMP_FORCE: 15000,           // N
        
        // Tombstone/angle plate
        TOMBSTONE_FACES: 4,
        TOMBSTONE_TAPER_STANDARD: 'HSK63',
        ANGLE_PLATE_PERPENDICULARITY: 0.01,  // mm/100mm
        
        // 3-2-1 locating
        LOCATOR_SPACING_MIN: 25,             // mm
        LOCATOR_HEIGHT_VARIATION: 0.002,     // mm
        REST_PAD_PRELOAD: 50                 // N
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // KINEMATICS - Machine kinematics constants (NEW - 2,193 codebase uses)
    // Sources: MIT 2.12 Robotics, Machine tool specifications
    // ═══════════════════════════════════════════════════════════════════════════════════
    KINEMATICS: Object.freeze({
        // Axis travel limits (typical VMC, mm)
        X_TRAVEL_SMALL: 500,
        X_TRAVEL_MEDIUM: 1000,
        X_TRAVEL_LARGE: 2000,
        Y_TRAVEL_SMALL: 400,
        Y_TRAVEL_MEDIUM: 600,
        Y_TRAVEL_LARGE: 1000,
        Z_TRAVEL_SMALL: 400,
        Z_TRAVEL_MEDIUM: 600,
        Z_TRAVEL_LARGE: 1000,
        
        // Rotary axis limits (degrees)
        A_AXIS_TRAVEL: 120,                  // Typical trunnion
        B_AXIS_TRAVEL: 360,                  // Continuous B
        C_AXIS_TRAVEL: 360,                  // Continuous C
        A_AXIS_TILT_MIN: -120,
        A_AXIS_TILT_MAX: 30,
        
        // Feed rates (mm/min)
        RAPID_RATE_STANDARD: 30000,
        RAPID_RATE_HIGH_SPEED: 60000,
        CUTTING_FEED_MAX: 15000,
        ROTARY_RAPID_RATE: 10000,            // deg/min
        
        // Acceleration (mm/s², deg/s²)
        LINEAR_ACCEL_STANDARD: 3000,
        LINEAR_ACCEL_HIGH: 10000,
        ROTARY_ACCEL_STANDARD: 2000,
        ROTARY_ACCEL_HIGH: 5000,
        JERK_LIMIT: 50000,                   // mm/s³
        
        // Positioning accuracy
        LINEAR_ACCURACY: 0.005,              // mm
        LINEAR_REPEATABILITY: 0.002,         // mm
        ROTARY_ACCURACY: 0.001,              // degrees
        ROTARY_REPEATABILITY: 0.0005,        // degrees
        
        // Backlash compensation
        BACKLASH_X_DEFAULT: 0.005,           // mm
        BACKLASH_Y_DEFAULT: 0.005,
        BACKLASH_Z_DEFAULT: 0.003,
        BACKLASH_ROTARY: 0.001,              // degrees
        
        // Thermal compensation
        THERMAL_COMP_X: 0.001,               // mm/°C
        THERMAL_COMP_Y: 0.001,
        THERMAL_COMP_Z: 0.002,               // Z usually more affected
        
        // Home positions
        HOME_X: 0,
        HOME_Y: 0,
        HOME_Z_CLEARANCE: 50,                // mm above table
        
        // Work envelope margins
        SOFT_LIMIT_MARGIN: 5,                // mm from hard limit
        COLLISION_AVOIDANCE_MARGIN: 10,      // mm
        
        // Singularity handling
        SINGULARITY_THRESHOLD: 0.01,         // radians
        GIMBAL_LOCK_MARGIN: 5                // degrees from singular position
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // POST_PROCESSOR - G-code post processor constants (NEW - 1,077 codebase uses)
    // Sources: FANUC, Siemens, Haas, Mazak documentation
    // ═══════════════════════════════════════════════════════════════════════════════════
    POST_PROCESSOR: Object.freeze({
        // Coordinate precision
        LINEAR_DECIMALS: 4,                  // X, Y, Z
        ROTARY_DECIMALS: 3,                  // A, B, C
        FEED_DECIMALS: 1,
        SPEED_DECIMALS: 0,
        
        // Line numbering
        LINE_NUMBER_START: 10,
        LINE_NUMBER_INCREMENT: 10,
        MAX_LINE_NUMBER: 99999,
        
        // Block format
        MAX_BLOCK_LENGTH: 256,               // characters
        SPACE_BETWEEN_WORDS: true,
        UPPERCASE_ONLY: false,
        
        // Modal groups
        MOTION_MODAL: true,                  // G0, G1, G2, G3
        PLANE_MODAL: true,                   // G17, G18, G19
        UNITS_MODAL: true,                   // G20, G21
        WORK_OFFSET_MODAL: true,             // G54-G59
        
        // Feed output
        FEED_OUTPUT_MODE: 'always',          // 'always', 'change', 'never'
        FEED_INVERSE_TIME: false,            // G93 mode
        
        // Arc output
        ARC_CENTER_MODE: 'incremental',      // 'incremental' (I,J,K) or 'absolute' (R)
        ARC_MIN_RADIUS: 0.001,               // mm
        ARC_MAX_RADIUS: 10000,               // mm
        HELICAL_INTERPOLATION: true,
        
        // Tool change
        TOOL_CHANGE_RETRACT: true,
        TOOL_CHANGE_POSITION: 'home',        // 'home', 'current', 'specified'
        OPTIONAL_STOP_ON_TOOL_CHANGE: true,
        
        // Coolant codes
        COOLANT_FLOOD: 'M8',
        COOLANT_MIST: 'M7',
        COOLANT_THROUGH: 'M88',
        COOLANT_OFF: 'M9',
        
        // Safe start block
        SAFE_START_CODES: ['G90', 'G80', 'G40', 'G49', 'G54'],
        PROGRAM_END_CODES: ['M30'],
        REWIND_CODE: 'M99',
        
        // Comments
        COMMENT_START: '(',
        COMMENT_END: ')',
        COMMENT_MAX_LENGTH: 80,
        
        // Sequences
        SEQUENCE_NUMBER_PREFIX: 'N',
        TOOL_NUMBER_PREFIX: 'T',
        PROGRAM_NUMBER_PREFIX: 'O'
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // NURBS - NURBS and spline constants (NEW - 946 codebase uses)
    // Sources: MIT 2.158J, The NURBS Book (Piegl & Tiller)
    // ═══════════════════════════════════════════════════════════════════════════════════
    NURBS: Object.freeze({
        // Degree defaults
        CURVE_DEGREE_DEFAULT: 3,
        CURVE_DEGREE_MIN: 1,
        CURVE_DEGREE_MAX: 9,
        SURFACE_DEGREE_U_DEFAULT: 3,
        SURFACE_DEGREE_V_DEFAULT: 3,
        
        // Knot vector
        KNOT_TOLERANCE: 1e-10,
        KNOT_MULTIPLICITY_MAX: 3,            // For degree 3 curves
        
        // Parameter space
        PARAM_START: 0.0,
        PARAM_END: 1.0,
        PARAM_TOLERANCE: 1e-10,
        
        // Subdivision
        SUBDIVISION_MAX_DEPTH: 20,
        SUBDIVISION_FLATNESS: 0.001,         // mm
        BEZIER_CLIP_TOLERANCE: 1e-6,
        
        // Fitting
        FIT_TOLERANCE: 0.01,                 // mm
        FIT_MAX_ITERATIONS: 100,
        FIT_PARAMETERIZATION: 'chord',       // 'uniform', 'chord', 'centripetal'
        
        // Evaluation
        DERIVATIVE_MAX_ORDER: 3,
        CURVATURE_TOLERANCE: 1e-8,
        
        // Control point limits
        MAX_CONTROL_POINTS_CURVE: 10000,
        MAX_CONTROL_POINTS_SURFACE: 1000000,
        
        // Weight limits
        WEIGHT_MIN: 0.001,
        WEIGHT_MAX: 1000,
        WEIGHT_DEFAULT: 1.0,
        
        // Continuity
        G0_POSITION_TOL: 1e-6,               // mm
        G1_TANGENT_TOL: 1e-6,                // radians
        G2_CURVATURE_TOL: 0.001,             // 1/mm
        
        // Approximation
        TESSELLATION_CHORD_TOL: 0.1,         // mm
        TESSELLATION_ANGLE_TOL: 15,          // degrees
        MIN_SEGMENTS_PER_SPAN: 4
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // LASER - Laser cutting/marking constants (NEW - 485 codebase uses)
    // Sources: Trumpf, Amada, Bystronic documentation
    // ═══════════════════════════════════════════════════════════════════════════════════
    LASER: Object.freeze({
        // Laser types
        TYPE_CO2: 'CO2',
        TYPE_FIBER: 'fiber',
        TYPE_DISC: 'disc',
        TYPE_DIODE: 'diode',
        
        // Power ranges (watts)
        POWER_LOW: 500,
        POWER_MEDIUM: 2000,
        POWER_HIGH: 6000,
        POWER_ULTRA: 15000,
        
        // Kerf widths by material (mm for 1kW fiber)
        KERF_STEEL_THIN: 0.15,               // < 3mm
        KERF_STEEL_MEDIUM: 0.25,             // 3-10mm
        KERF_STEEL_THICK: 0.40,              // > 10mm
        KERF_ALUMINUM: 0.20,
        KERF_STAINLESS: 0.18,
        
        // Cutting speeds (m/min for 1kW fiber)
        SPEED_STEEL_1MM: 25,
        SPEED_STEEL_3MM: 8,
        SPEED_STEEL_6MM: 3,
        SPEED_ALUMINUM_1MM: 30,
        SPEED_ALUMINUM_3MM: 10,
        SPEED_STAINLESS_1MM: 20,
        
        // Piercing
        PIERCE_TIME_THIN: 0.1,               // seconds
        PIERCE_TIME_MEDIUM: 0.5,
        PIERCE_TIME_THICK: 2.0,
        PIERCE_POWER_FACTOR: 1.2,            // vs cutting power
        
        // Gas pressures (bar)
        OXYGEN_PRESSURE_LOW: 0.5,
        OXYGEN_PRESSURE_STANDARD: 1.0,
        OXYGEN_PRESSURE_HIGH: 3.0,
        NITROGEN_PRESSURE_LOW: 8,
        NITROGEN_PRESSURE_STANDARD: 15,
        NITROGEN_PRESSURE_HIGH: 25,
        
        // Focus
        FOCAL_LENGTH_SHORT: 5,               // inches
        FOCAL_LENGTH_STANDARD: 7.5,
        FOCAL_LENGTH_LONG: 10,
        FOCUS_POSITION_TOP: 0,               // mm below surface
        FOCUS_POSITION_MID: -1,
        FOCUS_POSITION_BOTTOM: -3,
        
        // Nozzle
        NOZZLE_DIAMETER_SMALL: 1.0,          // mm
        NOZZLE_DIAMETER_STANDARD: 1.5,
        NOZZLE_DIAMETER_LARGE: 2.5,
        NOZZLE_STANDOFF: 0.8,                // mm
        
        // Quality
        EDGE_ROUGHNESS_EXCELLENT: 10,        // Ra in microns
        EDGE_ROUGHNESS_GOOD: 25,
        EDGE_ROUGHNESS_ACCEPTABLE: 50,
        DROSS_HEIGHT_MAX: 0.1                // mm
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // TAPPING - Tapping and thread milling constants (NEW - 371 codebase uses)
    // Sources: OSG, Emuge, Sandvik threading guides
    // ═══════════════════════════════════════════════════════════════════════════════════
    TAPPING: Object.freeze({
        // Tap types
        TYPE_CUT: 'cutting',
        TYPE_FORM: 'forming',
        TYPE_ROLL: 'roll',
        TYPE_SPIRAL_POINT: 'spiral_point',
        TYPE_SPIRAL_FLUTE: 'spiral_flute',
        
        // Speed factors (vs drilling)
        SPEED_FACTOR_HSS: 0.5,
        SPEED_FACTOR_COBALT: 0.6,
        SPEED_FACTOR_CARBIDE: 1.0,
        SPEED_FACTOR_FORM: 0.7,
        
        // Hole size factors
        DRILL_SIZE_FACTOR_CUT_75: 0.785,     // 75% thread
        DRILL_SIZE_FACTOR_CUT_65: 0.813,     // 65% thread
        DRILL_SIZE_FACTOR_FORM: 0.96,        // Form tap
        
        // Depth factors
        CHAMFER_DEPTH_FACTOR: 0.5,           // times pitch
        THREAD_DEPTH_MIN: 1.5,               // times diameter
        THROUGH_HOLE_CLEARANCE: 3,           // threads beyond
        
        // Rigid tapping
        RIGID_TAP_SPEED_MAX: 3000,           // RPM
        RIGID_TAP_SYNC_TOL: 0.01,            // mm
        RIGID_TAP_RETRACT_FACTOR: 1.0,       // same speed as in
        
        // Floating holder
        FLOAT_AXIAL: 1.0,                    // mm
        FLOAT_RADIAL: 0.5,                   // mm
        TENSION_COMPRESSION_RATIO: 1.1,
        
        // Thread milling
        THREAD_MILL_STEPOVER: 0.5,           // times pitch
        THREAD_MILL_PASSES_ROUGHING: 2,
        THREAD_MILL_PASSES_FINISHING: 1,
        THREAD_MILL_CLIMB: true,             // climb vs conventional
        
        // Torque factors
        TORQUE_FACTOR_STEEL: 1.0,
        TORQUE_FACTOR_ALUMINUM: 0.4,
        TORQUE_FACTOR_STAINLESS: 1.5,
        TORQUE_FACTOR_TITANIUM: 1.8,
        
        // Lubrication
        COOLANT_REQUIRED: true,
        MIN_CONCENTRATION: 8,                // %
        THROUGH_COOLANT_RECOMMENDED: true
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // WATERJET - Waterjet cutting constants (NEW - 206 codebase uses)
    // Sources: OMAX, Flow International documentation
    // ═══════════════════════════════════════════════════════════════════════════════════
    WATERJET: Object.freeze({
        // Pressure settings (MPa)
        PRESSURE_LOW: 200,
        PRESSURE_STANDARD: 380,
        PRESSURE_HIGH: 600,
        PRESSURE_ULTRA: 700,
        
        // Orifice sizes (mm)
        ORIFICE_SMALL: 0.25,
        ORIFICE_STANDARD: 0.35,
        ORIFICE_LARGE: 0.45,
        
        // Nozzle (mixing tube) sizes (mm)
        NOZZLE_SMALL: 0.75,
        NOZZLE_STANDARD: 1.0,
        NOZZLE_LARGE: 1.5,
        
        // Nozzle to orifice ratio
        NOZZLE_ORIFICE_RATIO: 3.0,           // typical
        
        // Abrasive
        ABRASIVE_FLOW_LOW: 200,              // g/min
        ABRASIVE_FLOW_STANDARD: 350,
        ABRASIVE_FLOW_HIGH: 500,
        ABRASIVE_MESH_FINE: 120,
        ABRASIVE_MESH_STANDARD: 80,
        ABRASIVE_MESH_COARSE: 50,
        
        // Standoff distance (mm)
        STANDOFF_STANDARD: 2.0,
        STANDOFF_MIN: 0.5,
        STANDOFF_MAX: 10,
        
        // Kerf width (mm)
        KERF_SMALL_NOZZLE: 0.8,
        KERF_STANDARD_NOZZLE: 1.0,
        KERF_LARGE_NOZZLE: 1.5,
        
        // Taper compensation
        TAPER_ANGLE_MAX: 2,                  // degrees per side
        TAPER_COMPENSATION: true,
        TILT_AXIS_AVAILABLE: false,
        
        // Quality levels
        QUALITY_1_SEPARATION: 1,             // Fastest, rough edge
        QUALITY_2_THROUGH: 2,
        QUALITY_3_CLEAN: 3,
        QUALITY_4_GOOD: 4,
        QUALITY_5_EXCELLENT: 5,              // Slowest, best edge
        
        // Pierce
        PIERCE_TIME_LOW: 2,                  // seconds
        PIERCE_TIME_STANDARD: 5,
        PIERCE_TIME_THICK: 15,
        PIERCE_METHOD_MOVING: 'moving',
        PIERCE_METHOD_STATIONARY: 'stationary',
        
        // Material factors (vs mild steel at Q3)
        SPEED_FACTOR_ALUMINUM: 2.0,
        SPEED_FACTOR_STAINLESS: 0.8,
        SPEED_FACTOR_TITANIUM: 0.4,
        SPEED_FACTOR_GLASS: 1.5,
        SPEED_FACTOR_STONE: 0.6,
        SPEED_FACTOR_CARBON_FIBER: 1.2
    }),

    // ═══════════════════════════════════════════════════════════════════════════════════
    // DEBUG FLAGS
    // ═══════════════════════════════════════════════════════════════════════════════════
    DEBUG: false,
    LOG_GATEWAY_CALLS: false,
    LOG_UNIT_CONVERSIONS: false,
    VALIDATE_ALL_INPUTS: true,
    LOG_LEARNING_EVENTS: false,
    LOG_AI_DECISIONS: false
});

// Make PRISM_CONSTANTS globally accessible across all script blocks
window.PRISM_CONSTANTS = PRISM_CONSTANTS;
