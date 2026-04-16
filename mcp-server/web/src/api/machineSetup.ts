/**
 * PRISM Product Engine — R11 Product Packaging
 * =============================================
 * Composition layer that orchestrates existing physics engines into
 * unified product workflows. Each product (SFC, PPG, ShopManager, ACNC)
 * composes multiple engine calls into a single end-to-end pipeline.
 *
 * MS0: Speed & Feed Calculator (SFC) — 10 actions
 * MS1: Post Processor Generator (PPG) — 10 actions
 * MS2: Shop Manager / Quoting — 10 actions
 * MS3: Auto CNC Programmer (ACNC) — 10 actions
 *
 * Design principle: Products COMPOSE engines, they don't replace them.
 * Every product action calls 2-6 existing engine functions and merges results.
 */
import { algorithmEngine } from "./AlgorithmEngine.js";
/** B U S I N E S S_ S O U R C E_ F I L E_ C A T A L O G constant.
 */
export declare const BUSINESS_SOURCE_FILE_CATALOG: Record<string, {
    filename: string;
    source_dir: string;
    category: string;
    lines: number;
    safety_class: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    target_engine: string;
    consumers: string[];
}>;
/** Product Tier type definition.
 */
export type ProductTier = "free" | "pro" | "enterprise";
/** S F C Action type definition.
 */
export type SFCAction = "sfc_calculate" | "sfc_compare" | "sfc_optimize" | "sfc_quick" | "sfc_materials" | "sfc_tools" | "sfc_formulas" | "sfc_safety" | "sfc_history" | "sfc_get";
/** P P G Action type definition.
 */
export type PPGAction = "ppg_validate" | "ppg_translate" | "ppg_templates" | "ppg_generate" | "ppg_controllers" | "ppg_compare" | "ppg_syntax" | "ppg_batch" | "ppg_history" | "ppg_get";
/** Shop Action type definition.
 */
export type ShopAction = "shop_quote" | "shop_cost" | "shop_job" | "shop_schedule" | "shop_dashboard" | "shop_report" | "shop_compare" | "shop_materials" | "shop_history" | "shop_get";
/** A C N C Action type definition.
 */
export type ACNCAction = "acnc_program" | "acnc_feature" | "acnc_simulate" | "acnc_output" | "acnc_tools" | "acnc_strategy" | "acnc_validate" | "acnc_batch" | "acnc_history" | "acnc_get";
/** Product Action type definition.
 */
export type ProductAction = SFCAction | PPGAction | ShopAction | ACNCAction;
/** S F C Input configuration/data structure.
 */
export interface SFCInput {
    material?: string;
    material_hardness?: number;
    material_group?: string;
    tool_material?: string;
    tool_diameter?: number;
    number_of_teeth?: number;
    operation?: string;
    depth_of_cut?: number;
    width_of_cut?: number;
    machine_power_kw?: number;
    machine_max_rpm?: number;
    tier?: ProductTier;
}
/** S F C Result configuration/data structure.
 */
export interface SFCResult {
    cutting_speed_m_min: number;
    spindle_rpm: number;
    feed_per_tooth_mm: number;
    table_feed_mm_min: number;
    depth_of_cut_mm: number;
    width_of_cut_mm: number;
    cutting_force_N: number;
    power_kW: number;
    torque_Nm: number;
    specific_cutting_force_N_mm2: number;
    tool_life_min: number;
    optimal_speed_m_min: number;
    surface_roughness_Ra_um: number;
    surface_finish_grade: string;
    mrr_cm3_min: number;
    safety_score: number;
    safety_status: "safe" | "warning" | "danger";
    safety_warnings: string[];
    uncertainty: {
        cutting_speed_range: [number, number];
        force_range: [number, number];
        tool_life_range: [number, number];
        surface_roughness_range: [number, number];
    };
    sustainability?: {
        energy_kWh_per_part: number;
        co2_kg_per_part: number;
        coolant_liters_per_hour: number;
    };
    formulas_used: string[];
    calculation_time_ms: number;
    tier: ProductTier;
    tier_limited: boolean;
}
/** S F C Compare Result configuration/data structure.
 */
export interface SFCCompareResult {
    approaches: Array<{
        name: string;
        cutting_speed: number;
        feed: number;
        tool_life: number;
        mrr: number;
        power: number;
        surface_roughness: number;
        score: number;
    }>;
    recommended: string;
    comparison_notes: string[];
}
/** S F C Optimize Result configuration/data structure.
 */
export interface SFCOptimizeResult {
    objective: string;
    original: {
        vc: number;
        fz: number;
        ap: number;
        ae: number;
    };
    optimized: {
        vc: number;
        fz: number;
        ap: number;
        ae: number;
    };
    improvement_pct: number;
    constraints_met: boolean;
    iterations: number;
}
/** Product S F C.
 * @param action - action string
 * @param params - params for the operation
 * @returns any
 */
export declare function productSFC(action: string, params: Record<string, any>): any;
/** Product P P G.
 * @param action - action string
 * @param params - params for the operation
 * @returns any
 */
export declare function productPPG(action: string, params: Record<string, any>): any;
/** Product Shop.
 * @param action - action string
 * @param params - params for the operation
 * @returns any
 */
export declare function productShop(action: string, params: Record<string, any>): any;
/** ACNC product dispatcher */
export declare function productACNC(action: string, params: Record<string, any>): any;
/**
 * Returns the full business source file catalog, optionally filtered by
 * target engine or category.
 *
 * @param filter.target_engine - Filter to entries targeting a specific engine
 * @param filter.category      - Filter to a specific category (e.g. "costing")
 * @param filter.safety_class  - Filter by safety classification
 * @returns Matching catalog entries with summary statistics
 */
export { algorithmEngine };
/** Gets source file catalog.
 * @param filter - filter
 * @returns {
  entries: typeof  b u s i n e s s_ s o u r c e_ f i l e_ c a t a l o g;
  summary: {
    total_files: number;
    total_lines: number;
    by_engine:  record<string, number>;
    by_category:  record<string, number>;
    by_safety:  record<string, number>;
  };
}
 */
export declare function getSourceFileCatalog(filter?: {
    target_engine?: string;
    category?: string;
    safety_class?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}): {
    entries: typeof BUSINESS_SOURCE_FILE_CATALOG;
    summary