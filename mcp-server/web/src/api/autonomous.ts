/**
 * LATHE-PRO-MS3, U-LPS12
 * SoftJawBoringGCodeEngine — G71/G70 Bore Cycle Generator for Soft Jaws
 *
 * Generates controller-specific G-code for boring soft jaws to finished OD.
 *
 * Bore diameter calculation by material:
 * - Steel: finished_OD + 0.05mm (spring-back to grip)
 * - Aluminum: finished_OD + 0.10mm (softer, more spring needed)
 * - Titanium: finished_OD + 0.03mm (low spring-back)
 *
 * Bolt clearance check ensures bore path doesn't intersect jaw bolt pattern.
 *
 * Reference: Peter Smid "CNC Programming Handbook" 3rd ed., Ch. 2
 * Reference: Kitagawa chuck manual — jaw bolt patterns
 */
// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════
/** Bore clearance over finished OD by material */
const CLEARANCE_BY_MATERIAL = {
    steel: 0.05,
    aluminum: 0.10,
    titanium: 0.03,
    custom: 0.05,
};
/** Default soft jaw bore depth (mm) */
const DEFAULT_BORE_DEPTH = 15;
/** Default rough pass depth (mm) */
const DEFAULT_ROUGH_DOC = 1.5;
/** Default rough feed (mm/rev) */
const DEFAULT_ROUGH_FEED = 0.15;
/** Default finish feed (mm/rev) */
const DEFAULT_FINISH_FEED = 0.08;
/** Default spindle RPM for soft jaw boring */
const DEFAULT_RPM = 800;
// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════
class SoftJawBoringGCodeEngine {
    /**
     * Generate soft jaw boring G-code with bolt clearance check.
     *
     * @param input Workpiece OD, chuck bolt pattern, controller dialect
     * @returns G-code lines, bore diameter, bolt clearance status
     */
    generate(input) {
        const { workpiece, chuck, machine, cutting_params } = input;
        const warnings = [];
        // Bore diameter calculation
        const material = workpiece.material ?? "steel";
        const clearance = workpiece.custom_clearance_mm ?? CLEARANCE_BY_MATERIAL[material];
        const boreDia = workpiece.finished_od_mm + clearance;