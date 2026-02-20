const PRISM_SESSION1B_GATEWAY_ROUTES = {
    // Time Series (15 routes)
    'ai.timeseries.ses': 'PRISM_TIME_SERIES_COMPLETE.simpleExponentialSmoothing',
    'ai.timeseries.holt': 'PRISM_TIME_SERIES_COMPLETE.holtSmoothing',
    'ai.timeseries.holtwinters': 'PRISM_TIME_SERIES_COMPLETE.holtWinters',
    'ai.timeseries.seasonality': 'PRISM_TIME_SERIES_COMPLETE.detectSeasonality',
    'ai.timeseries.decompose': 'PRISM_TIME_SERIES_COMPLETE.decompose',
    'ai.timeseries.anomaly': 'PRISM_TIME_SERIES_COMPLETE.detectAnomalies',
    'ai.timeseries.rul': 'PRISM_TIME_SERIES_COMPLETE.predictRUL',
    'ai.timeseries.toolwear': 'PRISM_TIME_SERIES_COMPLETE.predictToolWear',
    'ai.timeseries.machinehealth': 'PRISM_TIME_SERIES_COMPLETE.analyzeMachineHealth',
    
    // GNN (10 routes)
    'ai.gnn.gcn.create': 'PRISM_GNN_COMPLETE.createGCNLayer',
    'ai.gnn.gat.create': 'PRISM_GNN_COMPLETE.createGATLayer',
    'ai.gnn.mpnn.create': 'PRISM_GNN_COMPLETE.createMPNNLayer',
    'ai.gnn.pool.mean': 'PRISM_GNN_COMPLETE.pooling.mean',
    'ai.gnn.pool.max': 'PRISM_GNN_COMPLETE.pooling.max',
    'ai.gnn.pool.sum': 'PRISM_GNN_COMPLETE.pooling.sum',
    'ai.gnn.pool.attention': 'PRISM_GNN_COMPLETE.pooling.attention',
    'ai.gnn.mfg.partgraph': 'PRISM_GNN_COMPLETE.createPartGraph',
    'ai.gnn.mfg.opgraph': 'PRISM_GNN_COMPLETE.createOperationGraph',
    
    // Online Learning (12 routes)
    'ai.online.buffer.create': 'PRISM_ONLINE_LEARNING_COMPLETE.createExperienceBuffer',
    'ai.online.drift.create': 'PRISM_ONLINE_LEARNING_COMPLETE.createDriftDetector',
    'ai.online.ewc.create': 'PRISM_ONLINE_LEARNING_COMPLETE.createEWC',
    'ai.online.bandit.create': 'PRISM_ONLINE_LEARNING_COMPLETE.createBandit',
    
    // Hyperparameter Optimization (6 routes)
    'ai.hyperopt.grid': 'PRISM_HYPEROPT_COMPLETE.gridSearch',
    'ai.hyperopt.random': 'PRISM_HYPEROPT_COMPLETE.randomSearch',
    'ai.hyperopt.bayesian': 'PRISM_HYPEROPT_COMPLETE.bayesianOptimization',
    'ai.hyperopt.sample': 'PRISM_HYPEROPT_COMPLETE.sampleSpace',
    
    // Learning Rate Schedulers (12 routes)
    'ai.lr.step': 'PRISM_LR_SCHEDULER_COMPLETE.stepDecay',
    'ai.lr.exponential': 'PRISM_LR_SCHEDULER_COMPLETE.exponentialDecay',
    'ai.lr.cosine': 'PRISM_LR_SCHEDULER_COMPLETE.cosineAnnealing',
    'ai.lr.cosine_warm_restarts': 'PRISM_LR_SCHEDULER_COMPLETE.cosineAnnealingWarmRestarts',
    'ai.lr.warmup': 'PRISM_LR_SCHEDULER_COMPLETE.linearWarmup',
    'ai.lr.warmup_cosine': 'PRISM_LR_SCHEDULER_COMPLETE.warmupCosineDecay',
    'ai.lr.onecycle': 'PRISM_LR_SCHEDULER_COMPLETE.oneCycle',
    'ai.lr.cyclic': 'PRISM_LR_SCHEDULER_COMPLETE.cyclicLR',
    'ai.lr.polynomial': 'PRISM_LR_SCHEDULER_COMPLETE.polynomialDecay',
    'ai.lr.plateau.create': 'PRISM_LR_SCHEDULER_COMPLETE.createReduceOnPlateau',
    'ai.lr.scheduler.create': 'PRISM_LR_SCHEDULER_COMPLETE.createScheduler',
    
    // Active Learning (6 routes)
    'ai.active.select': 'PRISM_ACTIVE_LEARNING_COMPLETE.selectQueries',
    'ai.active.add_labeled': 'PRISM_ACTIVE_LEARNING_COMPLETE.addLabeledSample',
    'ai.active.add_unlabeled': 'PRISM_ACTIVE_LEARNING_COMPLETE.addUnlabeledSamples',
    'ai.active.stats': 'PRISM_ACTIVE_LEARNING_COMPLETE.getStatistics',
    
    // Uncertainty (8 routes)
    'ai.uncertainty.mcdropout': 'PRISM_UNCERTAINTY_COMPLETE.mcDropout',
    'ai.uncertainty.ensemble': 'PRISM_UNCERTAINTY_COMPLETE.deepEnsemble',
    'ai.uncertainty.temperature.fit': 'PRISM_UNCERTAINTY_COMPLETE.temperatureScaling.fit',
    'ai.uncertainty.temperature.calibrate': 'PRISM_UNCERTAINTY_COMPLETE.temperatureScaling.calibrate',
    'ai.uncertainty.ece': 'PRISM_UNCERTAINTY_COMPLETE.computeECE',
    'ai.uncertainty.entropy': 'PRISM_UNCERTAINTY_COMPLETE.predictiveEntropy',
    'ai.uncertainty.mutual_info': 'PRISM_UNCERTAINTY_COMPLETE.mutualInformation'
}