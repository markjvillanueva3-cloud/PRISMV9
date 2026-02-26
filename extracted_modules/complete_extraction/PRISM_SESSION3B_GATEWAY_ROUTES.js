const PRISM_SESSION3B_GATEWAY_ROUTES = {
    // Multi-objective scalarization
    'optimize.epsilonConstraint': 'PRISM_MULTI_OBJECTIVE_SCALARIZATION.epsilonConstraint',
    'optimize.generateParetoEpsilon': 'PRISM_MULTI_OBJECTIVE_SCALARIZATION.generateParetoEpsilon',
    'optimize.goalProgramming': 'PRISM_MULTI_OBJECTIVE_SCALARIZATION.goalProgramming',
    'optimize.lexicographic': 'PRISM_MULTI_OBJECTIVE_SCALARIZATION.lexicographic',
    
    // LP solvers
    'optimize.simplex': 'PRISM_LP_SOLVERS.revisedSimplex',
    'optimize.primalDualIP': 'PRISM_LP_SOLVERS.primalDualInteriorPoint',
    'optimize.activeSetQP': 'PRISM_LP_SOLVERS.activeSetQP',
    
    // Robust optimization
    'optimize.robust': 'PRISM_ROBUST_OPTIMIZATION.robustOptimization',
    'optimize.generateScenarios': 'PRISM_ROBUST_OPTIMIZATION.generateScenarios',
    'optimize.sensitivityAnalysis': 'PRISM_ROBUST_OPTIMIZATION.sensitivityAnalysis',
    
    // Manufacturing applications
    'mfg.goalCuttingParams': 'PRISM_MFG_OPTIMIZATION_ADVANCED_B.goalBasedCuttingParams',
    'mfg.robustCuttingParams': 'PRISM_MFG_OPTIMIZATION_ADVANCED_B.robustCuttingParams',
    'mfg.safetyCriticalOptim': 'PRISM_MFG_OPTIMIZATION_ADVANCED_B.safetyCriticalOptimization'
}