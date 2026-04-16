/**
 * PRISM Manufacturing Intelligence - Physics Prediction Engine
 * R7-MS0: Surface integrity, thermal compensation, chatter stability,
 *         and coupled physics (unified machining model).
 *
 * Physics chains:
 *   surface_integrity: Johnson-Cook → Kienzle → Loewen-Shaw → Ra/Rz/residual stress
 *   chatter_predict:   Altintas stability lobes → FFT frequency prediction
 *   thermal_compensate: Spindle power → heat partition → axis growth
 *   unified_machining_model: Force → Temp → Wear → Surface → Dimensional (coupled)
 *   coupling_sensitivity: ±5% perturbation → output sensitivity map
 *
 * @version 1.0.0  R7-MS0
 */
/** Physics Source File Entry configuration/data structure.
 */
export interface PhysicsSourceFileEntry {
    filename: string;
    category: string;
    lines: number;
    safety_class: "CRITICAL";
    description: string;
    physics_domain: string;
    consumers: string[];
}
/** P H Y S I C S_ S O U R C E_ F I L E_ C A T A L O G constant.
 */
export declare const PHYSICS_SOURCE_FILE_CATALOG: Record<string, PhysicsSourceFileEntry>;
/** Operation Type type definition.
 */
export type OperationType = 'turning' | 'milling' | 'drilling' | 'grinding';
/** Tool Material type definition.
 */
export type ToolMaterial = 'carbide' | 'ceramic' | 'cbn' | 'diamond' | 'hss';
/** Coolant Type type definition.
 */
export type CoolantType = 'flood' | 'mql' | 'dry' | 'cryogenic';
/** Surface Integrity Input configuration/data structure.
 */
export interface SurfaceIntegrityInput {
    material: string;
    operation: OperationType;
    cutting_speed_mpm: number;
    feed_mmrev: number;
    depth_of_cut_mm: number;
    tool_material: ToolMaterial;
    tool_nose_radius_mm?: number;
    coolant: CoolantType;
}
/** Surface Integrity Result configuration/data structure.
 */
export interface SurfaceIntegrityResult {
    surface_roughness: {
        ra_predicted_um: number;
        rz_predicted_um: number;
        confidence: number;
        model: string;
    };
    residual_stress: {
        surface_mpa: number;
        depth_of_effect_mm: number;
        risk_level: 'low' | 'moderate' | 'high';
        mitigation: string[];
    };
    white_layer: {
        risk: boolean;
        thickness_um: number | null;
        contributing_factors: string[];
    };
    thermal: {
        max_tool_temp_c: number;
        max_workpiece_temp_c: number;
        heat_partition_ratio: number;
    };
    recommendations: string[];
    safety: {
        score: number;
        flags: string[];
    };
}
/** Chatter Input configuration/data structure.
 */
export interface ChatterInput {
    machine: string;
    tool_diameter_mm: number;
    tool_flutes: number;
    tool_overhang_mm: number;
    holder_type: string;
    operation: 'slotting' | 'side_milling' | 'face_milling' | 'turning';
    radial_depth_mm: number;
    axial_depth_mm: number;
    spindle_rpm: number;
    material: string;
}
/** Chatter Result configuration/data structure.
 */
export interface ChatterResult {
    stable: boolean;
    stability_margin: number;
    critical_depth_mm: number;
    recommended_rpm: number[];
    dominant_frequency_hz: number;
    sld_data: {
        rpm: number[];
        max_stable_depth_mm: number[];
    };
    recommendations: string[];
    safety: {
        score: number;
        flags: string[];
    };
}
/** Thermal Comp Input configuration/data structure.
 */
export interface ThermalCompInput {
    machine: string;
    spindle_rpm: number;
    runtime_minutes: number;
    prior_runtime_hours?: number;
    ambient_temp_c: number;
    spindle_power_kw: number;
}
/** Thermal Comp Result configuration/data structure.
 */
export interface ThermalCompResult {
    offsets: {
        x_um: number;
        y_um: number;
        z_um: number;
    };
    steady_state_minutes: number;
    recommendation: string;
    safety: {
        score: number;
        flags: string[];
    };
}
/** Unified Machining Input configuration/data structure.
 */
export interface UnifiedMachiningInput {
    material: string;
    operation: OperationType;
    cutting_speed_mpm: number;
    feed_mmrev: number;
    depth_of_cut_mm: number;
    width_of_cut_mm: number;
    tool_material: ToolMaterial;
    tool_diameter_mm: number;
    tool_overhang_mm?: number;
    tool_flutes?: number;
    tool_nose_radius_mm?: number;
    coolant: CoolantType;
    machine?: string;
}
/** Unified Machining Result configuration/data structure.
 */
export interface UnifiedMachiningResult {
    force: {
        tangential_n: number;
        feed_n: number;
        radial_n: number;
        resultant_n: number;
    };
    temperature: {
        tool_c: number;
        workpiece_c: number;
        chip_c: number;
    };
    wear_rate: {
        flank_um_per_min: number;
        crater_ratio: number;
        estimated_life_min: number;
    };
    surface_finish: {
        ra_um: number;
        rz_um: number;
    };
    dimensional_accuracy: {
        thermal_error_um: number;
        deflection_error_um: number;
        total_error_um: number;
    };
    convergence: {
        itera