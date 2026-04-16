/**
 * QuoteAutopilotEngine — ACP-MS6
 *
 * ERP/Quote product autopilot chain:
 *   1. Part analysis (material, features, complexity)
 *   2. DFM assessment (manufacturability warnings)
 *   3. Cycle time estimation (per-feature, per-operation)
 *   4. Cost calculation (material + machine + labor + overhead)
 *   5. Quantity break computation (learning curve, fixture amort)
 *   6. Quote document generation (structured output)
 *
 * Plus telemetry chain for self-calibration:
 *   - Track predicted vs actual cycle times
 *   - Compute prediction accuracy
 *   - Generate calibration suggestions
 *
 * Sources:
 *   - ACP-MS6: ERP/Quote Autopilot + Telemetry
 *   - QuoteToShipOrchestratorEngine (21 stages)
 *   - AUTOMATION_CENSUS.json gap: erp_autopilot missing
 */
// ============================================================================
// CONSTANTS
// ============================================================================
/** Machine hourly rates ($/hr) */
const MACHINE_RATES = {
    "3axis_vmc": 85,
    "4axis_hmc": 110,
    "5axis": 150,
    "turning": 75,
    "mill_turn": 130,
    "edm_wire": 95,
    "edm_sinker": 90,
    "grinding": 100,
    "laser": 120,
    "waterjet": 80,
};
/** Material cost per kg */
const MATERIAL_COSTS_PER_KG = {
    steel: 3.50,
    aluminum: 8.00,
    stainless: 12.00,
    titanium: 65.00,
    inconel: 85.00,
    copper: 15.00,
    brass: 12.00,
    cast_iron: 4.00,
    tool_steel: 25.00,
    plastic: 5.00,
};
/** Material density kg/m³ for volume→weight */
const MATERIAL_DENSITY = {
    steel: 7850, aluminum: 2700, stainless: 7930, titanium: 4430,
    inconel: 8190, copper: 8960, brass: 8500, cast_iron: 7200,
    tool_steel: 7800, plastic: 1200,
};
/** Default margin percentages by priority */
const MARGIN_PCT = {
    standard: 0.30,
    rush: 0.50,
    prototype: 0.45,
};
/** Learning curve factor: cost reduction per doubling of quantity */
const LEARNING_RATE = 0.90; // 90% curve (10% reduction per doubling)
// ============================================================================
// ENGINE
// ============================================================================
export class QuoteAutopilotEngine {
    telemetryLog = [];
    // ── Full Quote Chain ───────────────────────────────────────
    /**
     * Execute the full quote autopilot chain.
     *
     * @param input Quote parameters
     * @returns Full quote with quantity breaks and recommendations
     */
    generateQuote(input) {
        const startTime = Date.now();
        const steps = [];
        const dfmWarnings = [];
        const recommendations = [];
        // Step 1: Complexity assessment
        const cxStart = Date.now();
        const complexity = this.assessComplexity(input.features, input.tolerances);
        steps.push({
            name: "complexity_assessment",
            status: "pass",
            duration_ms: Date.now() - cxStart,
            output_summary: `Complexity: ${complexity} (${input.features.length} features)`,
        });
        // Step 2: DFM check
        const dfmStart = Date.now();
        dfmWarnings.push(...this.checkDFM(input));
        steps.push({
            name: "dfm_check",
            status: dfmWarnings.length > 0 ? "warn" : "pass",
            duration_ms: Date.now() - dfmStart,
            output_summary: dfmWarnings.length > 0 ? `${dfmWarnings.length} warning(s)` : "Clean",
        });
        // Step 3: Cycle time estimation
        const ctStart = Date.now();
        const baseCycleTime = this.estimateCycleTime(input);
        steps.push({
            name: "cycle_time",
            status: "pass",
            duration_ms: Date.now() - ctStart,
            output_summary: `${baseCycleTime.toFixed(1)} min base cycle`,
        });
        // Step 4: Quantity breaks
        const qbStart = Date.now();
        const breaks = input.batch_sizes.map(qty => this.computeQuantityBreak(input, baseCycleTime, qty, complexity));
        steps.push({
            name: "quantity_breaks",
            status: "pass",
            duration_ms: Date.now() - qbStart,
            output_summary: `${breaks.length} qty breaks: ${input.batch_sizes.join(", ")}`,
        });
        // Step 5: Recommendation generation
        if (complexity === "very_high") {
            recommendations.push("Complex part — request 3D model for accurate cycle time estimate");
        }
        if (baseCycleTime > 60) {
            recommendations.push("Long cycle time — consider fixture pallet system for efficiency");
        }
        if (input.secondary_ops && input.secondary_ops.length > 3) {
            recommendations.push("Multiple secondary ops — evaluate outsourcing vs in-house tradeoff");
        }
        if (input.priority === "rush") {
            recommendations.push("Rush order — 50% premium applied. Lead time 3-5 days vs standard 10-15.");
        }
        // Log telemetry
        this.logTe