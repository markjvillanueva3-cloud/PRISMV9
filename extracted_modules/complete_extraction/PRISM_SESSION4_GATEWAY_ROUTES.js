const PRISM_SESSION4_GATEWAY_ROUTES = {
    // Cutting mechanics
    'physics.merchantCircle': 'PRISM_CUTTING_MECHANICS.merchantCircle',
    'physics.obliqueCutting': 'PRISM_CUTTING_MECHANICS.obliqueCutting',
    'physics.kienzleForce': 'PRISM_CUTTING_MECHANICS.kienzleForce',
    'physics.calculateMRR': 'PRISM_CUTTING_MECHANICS.calculateMRR',
    
    // Thermal
    'physics.loewenShawTemp': 'PRISM_THERMAL_MODELING.loewenShawTemperature',
    'physics.triggerTemp': 'PRISM_THERMAL_MODELING.triggerTemperature',
    'physics.fourierConduction': 'PRISM_THERMAL_MODELING.fourierConduction1D',
    'physics.thermalExpansion': 'PRISM_THERMAL_MODELING.thermalExpansion',
    
    // Tool wear
    'physics.extendedTaylor': 'PRISM_TOOL_WEAR_MODELS.extendedTaylor',
    'physics.usuiWear': 'PRISM_TOOL_WEAR_MODELS.usuiWearModel',
    'physics.archardWear': 'PRISM_TOOL_WEAR_MODELS.archardWearModel',
    'physics.predictFlankWear': 'PRISM_TOOL_WEAR_MODELS.predictFlankWear',
    'physics.predictCraterWear': 'PRISM_TOOL_WEAR_MODELS.predictCraterWear',
    
    // Vibration
    'physics.singleDOF': 'PRISM_VIBRATION_ANALYSIS.singleDOF',
    'physics.frequencyResponse': 'PRISM_VIBRATION_ANALYSIS.frequencyResponse',
    'physics.stabilityLobes': 'PRISM_VIBRATION_ANALYSIS.stabilityLobeDiagram',
    'physics.detectChatter': 'PRISM_VIBRATION_ANALYSIS.detectChatter',
    
    // Structural
    'physics.hertzContact': 'PRISM_STRUCTURAL_MECHANICS.hertzContact',
    'physics.stressConcentration': 'PRISM_STRUCTURAL_MECHANICS.stressConcentration',
    'physics.goodmanFatigue': 'PRISM_STRUCTURAL_MECHANICS.goodmanFatigue',
    'physics.eulerBuckling': 'PRISM_STRUCTURAL_MECHANICS.eulerBuckling',
    
    // Dynamics
    'physics.newtonEuler': 'PRISM_DYNAMICS.newtonEulerDynamics',
    'physics.inertiaMatrix': 'PRISM_DYNAMICS.computeInertiaMatrix',
    'physics.coriolisEffect': 'PRISM_DYNAMICS.coriolisEffect',
    
    // Manufacturing applications
    'mfg.completeCuttingAnalysis': 'PRISM_MFG_PHYSICS.completeCuttingAnalysis',
    'mfg.checkMachineDynamics': 'PRISM_MFG_PHYSICS.checkMachineDynamics'
}