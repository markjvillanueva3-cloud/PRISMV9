/**
 * PipelineRegistryBridge — U-ARCH3
 *
 * Shared utility for all 9 pipeline engines to resolve materials, tools, and
 * machines from the canonical registries (2.9K materials, 95K tools, 910 machines).
 *
 * Resolution strategy per resource:
 *   Material: MaterialRegistry → CANONICAL_MATERIAL_DB → ISO group default
 *   Tool:     ToolRegistry (by catalog/ID) → input params → synthetic default
 *   Machine:  MachineRegistry (by brand+model) → input params → safe defaults
 *
 * All pipelines should call these resolvers instead of maintaining inline lookups.
 * Domain-specific properties (EDM Sato coefficients, laser Schulz constants, etc.)
 * remain in their respective engines — this bridge supplies base physics only.
 *
 * @module engines/PipelineRegistryBridge
 */
import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, CANONICAL_MATERIAL_DB, } from "../physics/constants.js";
import { tribalKnowledgeEngine } from "./TribalKnowledgeEngine.js";
// ============================================================================
// LAZY REGISTRY LOADERS (ESM-safe, never break build if registry unavailable)
// ============================================================================
let _materialRegistry = null;
let _machineRegistry = null;
let _toolRegistry = null;
async function getMaterialRegistry() {
    if (_materialRegistry)
        return _materialRegistry;
    try {
        const mod = await import("../registries/MaterialRegistry.js");
        _materialRegistry = mod.materialRegistry;
        return _materialRegistry;
    }
    catch (e) {
        log.warn(`[PipelineRegistryBridge] MaterialRegistry unavailable: ${e}`);
        return null;
    }
}
async function getMachineRegistry() {
    if (_machineRegistry)
        return _machineRegistry;
    try {
        const mod = await import("../registries/MachineRegistry.js");
        _machineRegistry = mod.machineRegistry;
        return _machineRegistry;
    }
    catch (e) {
        log.warn(`[PipelineRegistryBridge] MachineRegistry unavailable: ${e}`);
        return null;
    }
}
async function getToolRegistry() {
    if (_toolRegistry)
        return _toolRegistry;
    try {
        const mod = await import("../registries/ToolRegistry.js");
        _toolRegistry = mod.toolRegistry;
        return _toolRegistry;
    }
    catch (e) {
        log.warn(`[PipelineRegistryBridge] ToolRegistry unavailable: ${e}`);
        return null;
    }
}
// ============================================================================
// ISO GROUP DETECTION
// ============================================================================
const ISO_GROUP_KEYWORDS = {
    P: ["steel", "carbon steel", "alloy steel", "1018", "1045", "4140", "4340", "aisi", "sae", "c45"],
    M: ["stainless", "304", "316", "303", "duplex", "austenitic", "martensitic"],
    K: ["cast iron", "grey iron", "gray iron", "ductile iron", "malleable", "cgi", "ggg"],
    N: ["aluminum", "aluminium", "brass", "copper", "bronze", "6061", "7075", "2024", "plastic", "polymer", "nylon", "delrin"],
    S: ["titanium", "inconel", "hastelloy", "waspaloy", "monel", "nimonic", "superalloy", "ti-6al-4v", "ti6al4v", "nickel alloy"],
    H: ["hardened", "tool steel", "d2", "m2", "h13", "s7", "a2", "hrc", ">45hrc", ">50hrc", ">55hrc"],
};
function detectISOGroup(materialName) {
    const lower = materialName.toLowerCase();
    for (const [group, keywords] of Object.entries(ISO_GROUP_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw))) {
            return group;
        }
    }
    return "P"; // safe default: steel
}
// ============================================================================
// MATERIAL RESOLUTION
// ============================================================================
/**
 * Resolve material physics properties from the best available source.
 *
 * Priority: MaterialRegistry (2.9K materials) → CANONICAL_MATERIAL_DB (13 common)
 *           → ISO group defaults from CANONICAL_KIENZLE/CANONICAL_TAYLOR
 */
export async function resolveMaterial(input) {
    const { material_name, iso_group } = input;
    const warnings = [];
    // ── Layer 1: Try MaterialRegistry by name ──
    if (material_name) {
        const registry = await getMaterialRegistry();
        if (registry) {
            try {
                const mat = await registry.getByIdOrName(material_name);
                if (mat) {
                    const kz = mat.kienzle;
                    const tl = mat.taylor;
                    const hb = mat.mechanical?.hardness?.brinell ?? 200;
                    const isoG = (mat.iso_group ?? iso_group ?? detectISOGroup(material_name));
                    const canonical = CANONICAL_KIENZLE[isoG];
                    const canonicalT = CANONICAL_TAYLOR[isoG];
                    if (!kz?.kc1_1)
                        warnings.push(`No Kienzle kc1.1 for "${mat.name}" — using ISO ${isoG} default ${canonical.kc1_1}`);
                    if (!tl?.C)
                        warnings.push(`No Taylor C for "${mat.name}" — using ISO ${isoG} default ${canonicalT.C}`);
                    const result = {
                        name: mat.name,
                        iso_group: isoG,
                        kc1_1: kz?.kc1_1 ?? canonical.kc1_1,
                        mc: kz?.mc ?? canonical.mc,
                        taylor_C: tl?.C ?? canonicalT.C,
                        taylor_n: tl?.n ?? canonicalT.n,
                        k_thermal: mat.thermal?.thermal_conductivity ?? mat.physical?.thermal_conductivity ?? 40,
                        sigma_y_MPa: extractStrength(mat.mechanical?.yield_strength) ?? 400,
                        density_kg_m3: mat.physical?.density ?? 7850,
                        hardness_HB: hb,
                        vc_base_roughing: mat.machining?.recommended_speed_range?.carbide_min ?? 150,
                        vc_base_finishing: mat.machining?.recommended_speed_range?.carbide_max ?? 250,
                        machinability_factor: (mat.machining?.machinability_rating ?? 100) / 100,
                        cp_J_kgK: mat.physical?.specific_heat ?? 486,
                        E_GPa: mat.physical?.elastic_modulus ?? mat.mechanical?.elastic_modulus ?? 210,
                        source: "registry",
                        confidence: 0.90,
                        warnings,
                    };
                    return validateMaterialContext(result);
                }
            }
            catch (e) {
                log.warn(`[PipelineRegistryBridge] MaterialRegistry lookup failed for "${material_name}": ${e}`);
                warnings.push(`Registry lookup error for "${material_name}" — falling back`);
            }
        }
    }
    // ── Layer 2: Try CANONICAL_MATERIAL_DB (13 common materials) ──
    if (material_name) {
        const normalizedName = material_name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const dbEntry = CANONICAL_MATERIAL_DB[normalizedName]
            ?? Object.values(CANONICAL_MATERIAL_DB).find(m => m.name.toLowerCase().includes(material_name.toLowerCase())
                || material_name.toLowerCase().includes(m.name.toLowerCase().split(" ")[0]));
        if (dbEntry) {
            return validateMaterialContext(materialPhysicsToContext(dbEntry, "canonical_db", 0.85, warnings));
        }
    }
    // ── Layer 3: ISO group defaults ──
    const isoG = iso_group ?? (material_name ? detectISOGroup(material_name) : "P");
    warnings.push(`Material "${material_name ?? "unknown"}" not found — using ISO ${isoG} group defaults`);
    const isoEntry = Object.values(CANONICAL_MATERIAL_DB).find(m => m.iso_group === isoG);
    if (isoEntry) {
        return validateMaterialContext(materialPhysicsToContext(isoEntry, "iso_default", 0.65, warnings));
    }
    // Absolute fallback: Steel P
    warnings.push("No ISO group resolved — defaulting to ISO P (steel). Verify material input.");
    const fallback = CANONICAL_MATERIAL_DB["steel"];
    return validateMaterialContext(materialPhysicsToContext(fallback, "iso_default", 0.50, warnings));
}
function materialPhysicsToContext(mp, source, confidence, warnings = []) {
    return {
        name: mp.name,
        iso_group: mp.iso_group,
        kc1_1: mp.kc1_1,
        mc: mp.mc,
        taylor_C: mp.taylor_C,
        taylor_n: mp.taylor_n,
        k_thermal: mp.k_thermal,
        sigma_y_MPa: mp.sigma_y_MPa,
        density_kg_m3: mp.density_kg_m3,
        hardness_HB: mp.hardness_HB,
        vc_base_roughing: mp.vc_base_roughing,
        vc_base_finishing: mp.vc_base_finishing,
        machinability_factor: mp.machinability_factor,
        cp_J_kgK: mp.cp_J_kgK,
        E_GPa: mp.E_GPa,
        source,
        confidence,
        warnings,
    };
}
/** Sanity-check resolved material values — flag physically impossible results */
function validateMaterialContext(ctx) {
    if (ctx.kc1_1 < 100 || ctx.kc1_1 > 6000)
        ctx.warnings.push(`kc1.1=${ctx.kc1_1} N/mm² outside valid range [100-6000] — verify material`);
    if (ctx.mc < 0.05 || ctx.mc > 0.60)
        ctx.warnings.push(`mc=${ctx.mc} outside valid range [0.05-0.60] — verify Kienzle exponent`);
    if (ctx.taylor_n < 0.05 || ctx.taylor_n > 0.50)
        ctx.warnings.push(`taylor_n=${ctx.taylor_n} outside valid range [0.05-0.50] — verify Taylor exponent`);
    if (ctx.density_kg_m3 < 500 || ctx.density_kg_m3 > 20000)
        ctx.warnings.push(`density=${ctx.density_kg_m3} kg/m³ outside valid range [500-20000]`);
    if (ctx.hardness_HB < 10 || ctx.hardness_HB > 700)
        ctx.warnings.push(`hardness=${ctx.hardness_HB} HB outside valid range [10-700]`);
    if (ctx.E_GPa < 1 || ctx.E_GPa > 800)
        ctx.warnings.push(`E=${ctx.E_GPa} GPa outside valid range [1-800]`);
    // TK-MS2-U10: Enrich with tribal tips for this material's ISO group
    ctx.tribal_tips = queryTribalTipsForMaterial(ctx.name, ctx.iso_group);
    if (ctx.tribal_tips.length > 0) {
        log.debug(`[PipelineRegistryBridge] Found ${ctx.tribal_tips.length} tribal tips for material "${ctx.name}" (ISO ${ctx.iso_group})`);
    }
    return ctx;
}
/**
 * TK-MS2-U10: Query tribal knowledge for material-specific tips.
 * Searches by material name and ISO group, returns top tips by confidence.
 */
function queryTribalTipsForMaterial(materialName, isoGroup) {
    try {
        // Search for tips matching this material
        const tips = tribalKnowledgeEngine.search({
            query: materialName,
            limit: 10,
        });
        // Filter to tips with matching material_groups or generic tips
        const filtered = tips.filter(tip => {
            if (!tip.material_groups || tip.material_groups.length === 0)
                return true;
            return tip.material_groups.includes(isoGroup);
        });
        // Sort by confidence and return top 5
        return filtered
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }
    catch (e) {
        log.debug(`[PipelineRegistryBridge] Tribal tip query failed for material "${materialName}": ${e}`);
        return [];
    }
}
function extractStrength(val) {
    if (val == null)
        return undefined;
    if (typeof val === "number")
        return val;
    if (typeof val === "object" && val.typical != null)
        return val.typical;
    if (typeof val === "object" && val.min != null && val.max != null)
        return (val.min + val.max) / 2;
    return undefined;
}
// ============================================================================
// MACHINE RESOLUTION
// ============================================================================
/**
 * Resolve machine context from the best available source.
 *
 * Priority: MachineRegistry (910 machines) → input params → safe defaults
 */
export async function resolveMachine(input) {
    const { brand, model, machine_id, max_rpm, max_power_kw } = input;
    const warnings = [];
    // ── Layer 1: Try MachineRegistry ──
    const registry = await getMachineRegistry();
    if (registry) {
        try {
            let machine = null;
            if (machine_id)
                machine = registry.getByIdOrModel(machine_id);
            if (!machine && brand && model)
                machine = registry.getByModel(brand, model);
            if (!machine && (brand || model)) {
                machine = registry.getByIdOrModel([brand, model].filter(Boolean).join(" "));
            }
            if (machine) {
                const result = {
                    id: machine.id ?? "unknown",
                    manufacturer: machine.manufacturer ?? brand ?? "Unknown",
                    model: machine.model ?? model ?? "Unknown",
                    type: machine.type ?? "VMC",
                    max_spindle_rpm: machine.spindle?.max_rpm ?? max_rpm ?? 10000,
                    min_spindle_rpm: machine.spindle?.min_rpm ?? 50,
                    max_power_kw: machine.spindle?.power_continuous ?? max_power_kw ?? 15,
                    max_torque_nm: machine.spindle?.torque_max ?? 120,
                    spindle_nose: machine.spindle?.spindle_nose ?? "BT40",
                    controller_manufacturer: machine.controller?.manufacturer ?? "FANUC",
                    controller_model: machine.controller?.model ?? "0i-MF",
                    simultaneous_axes: machine.simultaneous_axes ?? 3,
                    x_travel_mm: machine.envelope?.x_travel ?? 1020,
                    y_travel_mm: machine.envelope?.y_travel ?? 510,
                    z_travel_mm: machine.envelope?.z_travel ?? 510,
                    tool_changer_capacity: machine.tool_changer?.capacity ?? 24,
                    coolant_through: machine.spindle?.coolant_through ?? false,
                    source: "registry",
                    confidence: 0.90,
                    warnings,
                };
                return validateMachineContext(result);
            }
        }
        catch (e) {
            log.warn(`[PipelineRegistryBridge] MachineRegistry lookup failed: ${e}`);
            warnings.push(`Registry lookup failed — using input/defaults`);
        }
    }
    // ── Layer 2: Input params with defaults ──
    if (max_rpm || max_power_kw || brand || model) {
        if (!max_rpm)
            warnings.push("No spindle RPM provided — using default 10000");
        if (!max_power_kw)
            warnings.push("No spindle power provided — using default 15 kW");
        const searchStr = [brand, model].filter(Boolean).join(" ");
        if (searchStr)
            warnings.push(`Machine "${searchStr}" not found in registry (910 machines)`);
        return validateMachineContext({
            id: "input",
            manufacturer: brand ?? "Generic",
            model: model ?? "VMC-4020",
            type: "VMC",
            max_spindle_rpm: max_rpm ?? 10000,
            min_spindle_rpm: 50,
            max_power_kw: max_power_kw ?? 15,
            max_torque_nm: 120,
            spindle_nose: "BT40",
            controller_manufacturer: "FANUC",
            controller_model: "0i-MF",
            simultaneous_axes: 3,
            x_travel_mm: 1020,
            y_travel_mm: 510,
            z_travel_mm: 510,
            tool_changer_capacity: 24,
            coolant_through: false,
            source: "input",
            confidence: 0.50,
            warnings,
        });
    }
    // ── Layer 3: Safe defaults ──
    warnings.push("No machine specified — using conservative generic VMC defaults. Provide machine brand/model for accurate limits.");
    return validateMachineContext({
        id: "default",
        manufacturer: "Generic",
        model: "VMC-4020",
        type: "VMC",
        max_spindle_rpm: 10000,
        min_spindle_rpm: 50,
        max_power_kw: 15,
        max_torque_nm: 120,
        spindle_nose: "BT40",
        controller_manufacturer: "FANUC",
        controller_model: "0i-MF",
        simultaneous_axes: 3,
        x_travel_mm: 1020,
        y_travel_mm: 510,
        z_travel_mm: 510,
        tool_changer_capacity: 24,
        coolant_through: false,
        source: "default",
        confidence: 0.30,
        warnings,
    });
}
/** Sanity-check resolved machine values */
function validateMachineContext(ctx) {
    if (ctx.max_spindle_rpm < 100 || ctx.max_spindle_rpm > 100000)
        ctx.warnings.push(`max_rpm=${ctx.max_spindle_rpm} outside valid range [100-100000]`);
    if (ctx.max_power_kw < 0.5 || ctx.max_power_kw > 200)
        ctx.warnings.push(`power=${ctx.max_power_kw} kW outside valid range [0.5-200]`);
    if (ctx.max_torque_nm < 1 || ctx.max_torque_nm > 5000)
        ctx.warnings.push(`torque=${ctx.max_torque_nm} Nm outside valid range [1-5000]`);
    // TK-MS2-U10: Enrich with tribal tips for this machine
    ctx.tribal_tips = queryTribalTipsForMachine(ctx.id, ctx.manufacturer, ctx.model, ctx.controller_manufacturer);
    if (ctx.tribal_tips.length > 0) {
        log.debug(`[PipelineRegistryBridge] Found ${ctx.tribal_tips.length} tribal tips for machine "${ctx.manufacturer} ${ctx.model}"`);
    }
    return ctx;
}
/**
 * TK-MS2-U10: Query tribal knowledge for machine-specific tips.
 * Searches by machine ID, manufacturer, model, and controller.
 */
function queryTribalTipsForMachine(machineId, manufacturer, model, controller) {
    try {
        // Build search terms
        const searchTerms = [manufacturer, model, controller].filter(Boolean).join(" ");
        if (!searchTerms)
            return [];
        // Search for tips matching this machine
        const tips = tribalKnowledgeEngine.search({
            query: searchTerms,
            limit: 15,
        });
        // Filter to tips that mention this machine or are machine-agnostic
        const filtered = tips.filter(tip => {
            // If tip has machine_ids, check for match
            if (tip.machine_ids && tip.machine_ids.length > 0) {
                return tip.machine_ids.includes(machineId) ||
                    tip.machine_ids.some(mid => mid.toLowerCase().includes(model.toLowerCase()));
            }
            // Accept tips in relevant categories (machine setup, troubleshooting)
            const relevantCategories = ["machine_setup", "troubleshooting", "workholding", "coolant"];
            return relevantCategories.includes(tip.category) || !tip.category;
        });
        // Sort by confidence and return top 5
        return filtered
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }
    catch (e) {
        log.debug(`[PipelineRegistryBridge] Tribal tip query failed for machine "${manufacturer} ${model}": ${e}`);
        return [];
    }
}
// ============================================================================
// TOOL RESOLUTION
// ============================================================================
/**
 * Resolve tool context from the best available source.
 *
 * Priority: ToolRegistry (95K tools by catalog#/ID) → input params → synthetic defaults
 *
 * Note: For full tool selection logic (material-aware, operation-aware),
 * use SmartToolSelectorEngine. This resolver handles direct tool lookups
 * when a tool ID or catalog number is already known.
 */
export async function resolveTool(input) {
    const { tool_id, catalog_number, type, diameter_mm, flutes, corner_radius_mm } = input;
    const warnings = [];
    // ── Layer 1: Try ToolRegistry by ID or catalog number ──
    const registry = await getToolRegistry();
    if (registry && (tool_id || catalog_number)) {
        try {
            const tool = await registry.getByIdOrCatalog(tool_id ?? catalog_number);
            if (tool) {
                const result = {
                    id: tool.id,
                    name: tool.name ?? `${tool.manufacturer} ${tool.catalog_number}`,
                    type: tool.type ?? type ?? "endmill",
                    manufacturer: tool.manufacturer ?? "Unknown",
                    catalog_number: tool.catalog_number ?? catalog_number ?? "",
                    diameter_mm: tool.geometry?.diameter ?? tool.cutting_diameter_mm ?? diameter_mm ?? 10,
                    flutes: tool.geometry?.flutes ?? tool.flute_count ?? flutes ?? 4,
                    corner_radius_mm: tool.geometry?.corner_radius ?? corner_radius_mm ?? 0,
                    flute_length_mm: tool.geometry?.flute_length ?? (tool.geometry?.diameter ?? 10) * 2,
                    overall_length_mm: tool.geometry?.overall_length ?? (tool.geometry?.diameter ?? 10) * 5,
                    coating: typeof tool.coating === "string" ? tool.coating : (tool.coating?.type ?? tool.coating_type ?? "TiAlN"),
                    substrate: tool.substrate ?? "carbide",
                    material_groups: tool.material_groups ?? ["P", "M", "K"],
                    source: "registry",
                    confidence: 0.90,
                    warnings,
                };
                return validateToolContext(result);
            }
            else {
                warnings.push(`Tool "${tool_id ?? catalog_number}" not found in registry (95K tools)`);
            }
        }
        catch (e) {
            log.warn(`[PipelineRegistryBridge] ToolRegistry lookup failed: ${e}`);
            warnings.push(`Registry lookup failed for tool "${tool_id ?? catalog_number}"`);
        }
    }
    // ── Layer 2: Input params with synthetic defaults ──
    const d = diameter_mm ?? 10;
    if (!diameter_mm)
        warnings.push("No tool diameter specified — using default 10mm");
    if (!flutes)
        warnings.push(`No flute count specified — using default ${d <= 6 ? 3 : 4}`);
    if (!(tool_id || catalog_number))
        warnings.push("No tool ID/catalog# — using synthetic tool geometry");
    return validateToolContext({
        id: "synthetic",
        name: `Synthetic ${type ?? "endmill"} ${d}mm`,
        type: type ?? "endmill",
        manufacturer: "Synthetic",
        catalog_number: "",
        diameter_mm: d,
        flutes: flutes ?? (d <= 6 ? 3 : 4),
        corner_radius_mm: corner_radius_mm ?? 0,
        flute_length_mm: d * 2,
        overall_length_mm: d * 5,
        coating: "TiAlN",
        substrate: "carbide",
        material_groups: ["P", "M", "K", "N", "S", "H"],
        source: input.tool_id || input.catalog_number ? "input" : "default",
        confidence: 0.30,
        warnings,
    });
}
/** Sanity-check resolved tool values */
function validateToolContext(ctx) {
    if (ctx.diameter_mm < 0.1 || ctx.diameter_mm > 200)
        ctx.warnings.push(`diameter=${ctx.diameter_mm}mm outside valid range [0.1-200]`);
    if (ctx.flutes < 1 || ctx.flutes > 20)
        ctx.warnings.push(`flutes=${ctx.flutes} outside valid range [1-20]`);
    if (ctx.corner_radius_mm < 0)
        ctx.warnings.push(`corner_radius=${ctx.corner_radius_mm}mm is negative — must be >= 0`);
    if (ctx.flute_length_mm < ctx.diameter_mm * 0.5)
        ctx.warnings.push(`flute_length=${ctx.flute_length_mm}mm suspiciously short for ${ctx.diameter_mm}mm tool`);
    return ctx;
}
/**
 * Resolve all pipeline context in parallel.
 * Used by PipelineOptimizationEngine for efficient context resolution.
 */
export async function resolvePipelineContext(input) {
    const startTime = Date.now();
    const warnings = [];
    // Resolve all contexts in parallel
    const [material, machine, tool] = await Promise.all([
        resolveMaterial({ material_name: input.material_name, iso_group: input.iso_group }),
        resolveMachine({
            brand: input.machine_brand,
            model: input.machine_model,
            machine_id: input.machine_id,
            max_rpm: input.max_rpm,
            max_power_kw: input.max_power_kw,
        }),
        input.tool_id || input.catalog_number || input.diameter_mm
            ? resolveTool({
                tool_id: input.tool_id,
                catalog_number: input.catalog_number,
                type: input.tool_type,
                diameter_mm: input.diameter_mm,
                flutes: input.flutes,
            })
            : Promise.resolve(undefined),
    ]);
    // Aggregate warnings
    warnings.push(...material.warnings);
    warnings.push(...machine.warnings);
    if (tool)
        warnings.push(...tool.warnings);
    return {
        material,
        machine,
        tool,
        resolutionTime_ms: Date.now() - startTime,
        warnings,
    };
}
// ============================================================================
// SINGLETON EXPORT
// ============================================================================
export const pipelineRegistryBridge = {
    resolveMaterial,
    resolveMachine,
    resolveTool,
    resolvePipelineContext,
};
//# sourceMappingURL=PipelineRegistryBridge.js.map