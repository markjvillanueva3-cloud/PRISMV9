const PRISM_PHYSICS_CONSTANTS_V2 = {

    // Modulus of Elasticity (E) in N/mm² (MPa)
    modulusOfElasticity: {
        steel: 207000, carbide: 620000, heavyMetal: 345000,
        aluminum: 69000, titanium: 114000, cast_iron: 170000, stainless: 193000
    },
    // Boring Bar Materials
    boringBarMaterials: {
        steel: { E: 207000, maxOverhang: 4, dampingFactor: 0.02 },
        carbide: { E: 620000, maxOverhang: 6, dampingFactor: 0.01 },
        heavyMetal: { E: 345000, maxOverhang: 5, dampingFactor: 0.015 },
        carbide_dampened: { E: 620000, maxOverhang: 10, dampingFactor: 0.05 }
    },
    // Friction Coefficients
    frictionCoefficients: {
        steel_steel_dry: 0.6, steel_steel_serrated: 0.85,
        steel_aluminum: 0.5, collet_steel: 0.95
    },
    // Material Specific Cutting Forces (Kc) N/mm²
    specificCuttingForce: {
        low_carbon_steel: 1700, medium_carbon_steel: 2000, steel: 2000,
        alloy_steel: 2300, tool_steel: 2600, stainless: 2200,
        aluminum: 800, titanium: 1600, cast_iron: 1200,
        brass: 780, copper: 700, inconel: 2800
    },
    // Thermal Properties
    thermalExpansion: {
        steel: 12e-6, stainless: 17e-6, aluminum: 23e-6,
        titanium: 8.6e-6, cast_iron: 10e-6, brass: 19e-6, copper: 17e-6
    },
    specificHeat: {
        steel: 500, stainless: 500, aluminum: 900,
        titanium: 520, cast_iron: 460, brass: 380, copper: 385
    },
    density: {
        steel: 7850, stainless: 8000, aluminum: 2700,
        titanium: 4500, cast_iron: 7200, brass: 8500, copper: 8900
    }
}