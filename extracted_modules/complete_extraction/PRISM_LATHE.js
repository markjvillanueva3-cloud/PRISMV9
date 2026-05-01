const PRISM_LATHE = {
    version: "1.0.0",
    lastUpdated: "2025-12-25",

    // Main function (unit-aware)
    calculateOptimizedParameters: calculateLatheParametersWithUnits,

    // Raw metric function (for internal use)
    calculateOptimizedParametersMetric: calculateLatheOptimizedParameters,

    // Unit conversion helpers
    normalizeInputs: normalizeLatheInputs,
    localizeResults: localizeLatheResults,

    // Individual calculators
    calculators: {
        cuttingForce: calculateCuttingForce,
        allCuttingForces: calculateAllCuttingForces,
        workpieceDeflection: calculateWorkpieceDeflection,
        boringBarDeflection: calculateBoringBarDeflection,
        clampingForce: calculateClampingForce,
        surfaceFinish: calculateSurfaceFinish,
        chipFormation: analyzeChipFormation,
        thermalEffects: calculateThermalEffects,
        toolLife: predictToolLife,
        threading: calculateThreadingParameters,
        grooving: calculateGroovingParameters,
        ssv: calculateSSVParameters
    },
    // Databases
    databases: {
        machines: PRISM_LATHE_MACHINE_DB,
        chucks: CHUCK_DATABASE,
        physics: PHYSICS_CONSTANTS
    },
    // Utilities
    utils: {
        getMachineData,
        getMaterialKc,
        getRecommendedCuttingSpeed,
        getAvailableTorque
    }
}