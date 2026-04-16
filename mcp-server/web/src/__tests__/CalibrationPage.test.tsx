/**
 * PRISM Manufacturing Intelligence - Machine Option Registry Engine
 * POST-ULT-MS4: Manages what each machine CAN have vs. what it DOES have
 *
 * Consolidates:
 *   U01 — MachineOptionSchema: TypeScript schema for ALL machine purchase options
 *   U02 — ManufacturerOptionCatalog: Per-manufacturer option availability
 *   U03 — OptionImpactMapper: Map each option to post properties & physics stages
 *   U04 — OptionValidationEngine: Validate option combinations are compatible
 *   U05 — OptionPresetGenerator: Generate presets per machine family
 *
 * Actions: get_options, set_options, validate_options, get_presets,
 *          get_option_impact, get_manufacturer_profile
 *
 * @version 1.0.0
 * @engine MachineOptionRegistryEngine
 */
// ============================================================================
// HELPER: default "all-false / standard" baseline
// ============================================================================
function defaultMachineOptions() {
    return {
        hasTSC: false,
        hasProbing: false,
        hasSSV: false,
        hasDWO: false,
        hasLiveTooling: false,
        hasYAxis: false,
        hasCAxis: false,
        hasSubSpindle: false,
        hasPartCatcher: false,
        hasChipConveyor: false,
        hasToolArm: false,
        hasBarFeeder: false,
        hasPalletChanger: false,
        hasSteadyRest: false,
        hasTailstock: false,
        hasAutoDoor: false,
        hasProgrammableCoolantNozzle: false,
        hasHighPressureCoolant: false,
        spindleOption: "standard",
        maxRpm: 8100,
        spindlePower_kW: 22.4,
        spindleTorque_Nm: 122,
        coolantPressure: "standard",
        coolantType: "flood",
        hasHSMPackage: false,
        has5AxisPackage: false,
        hasAdaptiveControl: false,
        hasThermalComp: false,
        hasCollisionAvoidance: false,
        hasConversational: false,
        hasRigidTapping: true,
        hasNURBS: false,
    };
}
/** Helper for creating an availability record from a base set of overrides. */
function makeAvailability(base, overrides) {
    const keys = [
        "hasTSC", "hasProbing", "hasSSV", "hasDWO", "hasLiveTooling",
        "hasYAxis", "hasCAxis", "hasSubSpindle", "hasPartCatcher",
        "hasChipConveyor", "hasToolArm", "hasBarFeeder", "hasPalletChanger",
        "hasSteadyRest", "hasTailstock", "hasAutoDoor", "hasProgrammableCoolantNozzle",
        "hasHighPressureCoolant", "spindleOption", "maxRpm", "spindlePower_kW",
        "spindleTorque_Nm", "coolantPressure", "coolantType", "hasHSMPackage",
        "has5AxisPackage", "hasAdaptiveControl", "hasThermalComp",
        "hasCollisionAvoidance", "hasConversational", "hasRigidTapping", "hasNURBS",
    ];
    const result = {};
    for (const k of keys) {
        result[k] = overrides[k] ?? base;
    }
    return result;
}
// ============================================================================
// MANUFACTURER DATA — Haas
// ============================================================================
const HAAS_PROFILES = [
    // ── VF Series (VMC) ──
    {
        family: "VF Series",
        models: ["VF-1", "VF-2", "VF-2SS", "VF-2SSYT", "VF-3", "VF-3SS", "VF-4", "VF-4SS", "VF-5", "VF-6", "VF-6SS", "VF-7", "VF-8", "VF-9", "VF-10", "VF-11", "VF-12"],
        machine_type: "vmc",
        option_availability: makeAvailability("purchasable", {
            hasTSC: "purchasable",
            hasProbing: "purchasable",
            hasSSV: "standard",
            hasDWO: "standard",
            hasLiveTooling: "unavailable",
            hasYAxis: "unavailable",
            hasCAxis: "unavailable",
            hasSubSpindle: "unavailable",
            hasPartCatcher: "unavailable",
            hasChipConveyor: "purchasable",
            hasToolArm: "purchasable",
            hasBarFeeder: "unavailable",
            hasPalletChanger: "unavailable",
            hasSteadyRest: "unavailable",
            hasTailstock: "unavailable",
            hasAutoDoor: "purchasable",
            hasProgrammableCoolantNozzle: "purchasable",
            hasHighPressureCoolant: "purchasable",
            spindleOption: "purchasable",
            maxRpm: "purchasable",
            spindlePower_kW: "purchasable",
            spindleTorque_Nm: "purchasable",
            coolantPressure: "purchasable",
            coolantType: "purchasable",
            hasHSMPackage: "purchasable",
            has5AxisPackage: "unavailable",
            hasAdaptiveControl: "unavailable",
            hasThermalComp: "purchasable",
            hasCollisionAvoidance: "unavailable",
            hasConversational: "standard",
            hasRigidTapping: "standard",
            hasNURBS: "unavailable",
        }),
        standard_config: {
            hasSSV: true,
            hasDWO: true,
            hasConversational: true,
            hasRigidTapping: true,
            spindleOption: "standard",
            maxRpm: 8100,
            spindlePower_kW: 22.4,
            spindleTorque_Nm: 122,
            coolantPressure: "standard",
            coolantType: "flood",
        },
    },
    // ── EC Series (HMC) ──
    {
        family: "EC Series",
        models: ["EC-400", "EC-500", "EC-630", "EC-1000", "EC-1600"],
        machine_type: "hmc",
        option_availability: makeAvailability("purchasable", {
            hasTSC: "purchasable",
            hasProbing: "purchasable",