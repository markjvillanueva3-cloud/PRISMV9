const PRISM_SESSION3_GATEWAY_ROUTES = {
    // Unconstrained optimization
    'optimize.lbfgs': 'PRISM_UNCONSTRAINED_OPTIMIZATION.lbfgs',
    'optimize.trustRegion': 'PRISM_UNCONSTRAINED_OPTIMIZATION.trustRegion',
    'optimize.conjugateGradient': 'PRISM_UNCONSTRAINED_OPTIMIZATION.conjugateGradient',
    
    // Constrained optimization
    'optimize.augmentedLagrangian': 'PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED.augmentedLagrangian',
    'optimize.sqp': 'PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED.sqp',
    
    // Metaheuristics
    'optimize.tabuSearch': 'PRISM_METAHEURISTIC_OPTIMIZATION.tabuSearch',
    
    // Multi-objective
    'optimize.nsgaII': 'PRISM_MULTI_OBJECTIVE.nsgaII',
    'optimize.moead': 'PRISM_MULTI_OBJECTIVE.moead',
    'optimize.pareto.hypervolume': 'PRISM_MULTI_OBJECTIVE.paretoUtils.hypervolume',
    'optimize.pareto.kneePoint': 'PRISM_MULTI_OBJECTIVE.paretoUtils.findKneePoint',
    'optimize.pareto.closestToIdeal': 'PRISM_MULTI_OBJECTIVE.paretoUtils.selectClosestToIdeal',
    
    // Manufacturing applications
    'mfg.optimizeCuttingMO': 'PRISM_MFG_OPTIMIZATION_ADVANCED.optimizeCuttingParametersMO',
    'mfg.scheduleJobShopTabu': 'PRISM_MFG_OPTIMIZATION_ADVANCED.scheduleJobShopTabu',
    'mfg.optimizeToolpathSeq': 'PRISM_MFG_OPTIMIZATION_ADVANCED.optimizeToolpathSequence'
}