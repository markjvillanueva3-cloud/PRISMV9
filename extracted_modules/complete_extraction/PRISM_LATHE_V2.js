const PRISM_LATHE_V2 = {
    version: "1.0.0",
    lastUpdated: "2025-12-25",

    // Main function
    calculateOptimizedParameters: calculateLatheOptimizedParameters,

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
        machines: LATHE_MACHINE_DATABASE,
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