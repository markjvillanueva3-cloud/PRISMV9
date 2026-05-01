const PRISM_SESSION2B_GATEWAY_ROUTES = {
    // Memory-efficient search
    'search.idaStar': 'PRISM_MEMORY_EFFICIENT_SEARCH.idaStar',
    'search.depthLimited': 'PRISM_MEMORY_EFFICIENT_SEARCH.depthLimitedSearch',
    'search.iterativeDeepening': 'PRISM_MEMORY_EFFICIENT_SEARCH.iterativeDeepeningDFS',
    
    // Local search
    'search.hillClimbing': 'PRISM_LOCAL_SEARCH.hillClimbing',
    'search.hillClimbingRestarts': 'PRISM_LOCAL_SEARCH.hillClimbingRestarts',
    'search.simulatedAnnealing': 'PRISM_LOCAL_SEARCH.simulatedAnnealing',
    'search.localBeam': 'PRISM_LOCAL_SEARCH.localBeamSearch',
    'search.twoOpt': 'PRISM_LOCAL_SEARCH.twoOpt',
    'search.threeOpt': 'PRISM_LOCAL_SEARCH.threeOpt',
    
    // Particle filter
    'ai.particleFilter.create': 'PRISM_PARTICLE_FILTER.create',
    'ai.particleFilter.toolWear': 'PRISM_PARTICLE_FILTER.createToolWearFilter',
    
    // Combinatorial
    'optimize.hungarian': 'PRISM_COMBINATORIAL.hungarian',
    'optimize.christofides': 'PRISM_COMBINATORIAL.christofides',
    'optimize.nearestNeighborTSP': 'PRISM_COMBINATORIAL.nearestNeighborTSP',
    
    // Manufacturing
    'mfg.optimizeRapidPath': 'PRISM_MFG_OPTIMIZATION.optimizeRapidPath',
    'mfg.optimizeToolAssignment': 'PRISM_MFG_OPTIMIZATION.optimizeToolAssignment',
    'mfg.optimizeCuttingParams': 'PRISM_MFG_OPTIMIZATION.optimizeCuttingParams'
}