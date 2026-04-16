/**
 * ProcessPlanEngine — Manufacturing Intelligence Layer
 *
 * Generates complete manufacturing process plans from part features.
 * Composes ToolSelection + MaterialSelection + GenerativeProcessEngine
 * to produce ordered operation sequences with tool/speed/feed assignments.
 *
 * Actions: plan_generate, plan_optimize, plan_estimate_time, plan_validate
 */
// ============================================================================
// OPERATION TEMPLATES
// ============================================================================
const FEATURE_OPERATION_MAP = {
    face: { ops: ["Face Mill"], tools: ["face_mill"] },
    pocket: { ops: ["Rough Pocket", "Finish Pocket"], tools: ["end_mill", "end_mill"] },
    slot: { ops: ["Slot Mill"], tools: ["end_mill"] },
    hole: { ops: ["Center Drill", "Drill"], tools: ["center_drill", "drill"] },
    bore: { ops: ["Rough Bore", "Finish Bore"], tools: ["boring_bar", "boring_bar"] },
    thread: { ops: ["Drill", "Thread Mill"], tools: ["drill", "thread_mill"] },
    chamfer: { ops: ["Chamfer"], tools: ["chamfer_mill"] },
    profile: { ops: ["Rough Profile", "Finish Profile"], tools: ["end_mill", "end_mill"] },
    groove: { ops: ["Groove"], tools: ["grooving_tool"] },
    freeform: { ops: ["Rough 3D", "Semi-Finish 3D", "Finish 3D"], tools: ["end_mill", "ball_mill", "ball_mill"] },
};
/** ISO group → base surface speed m/min for carbide */
const ISO_SPEEDS = { P: 250, M: 120, K: 200, N: 600, S: 45, H: 80 };
/** Tool change time seconds */
const TOOL_CHANGE_SEC = 8;
// ============================================================================
// CALCULATION HELPERS
// ============================================================================
function calcRPM(speed_mpm, diameter_mm) {
    return Math.round((speed_mpm * 1000) / (Math.PI * Math.max(diameter_mm, 0.1)));
}
function calcFeedRate(feed_mmrev, rpm) {
    return Math.round(feed_mmrev * rpm);
}
function estimateOpTime(feature, toolDia, depthOfCut, feedRate, isFinish) {
    const d = feature.dimensions;
    let volume_mm3 = 0;
    if (feature.type === "pocket" || feature.type === "slot") {
        const w = d.width_mm || d.diameter_mm || 20;
        const l = d.length_mm || w;
        const depth = d.depth_mm || 5;
        volume_mm3 = w * l * depth;
    }
    else if (feature.type === "hole" || feature.type === "bore" || feature.type === "thread") {
        const dia = d.diameter_mm || 10;
        const depth = d.depth_mm || 20;
        volume_mm3 = Math.PI * Math.pow(dia / 2, 2) * depth;
    }
    else if (feature.type === "face") {
        const w = d.width_mm || 100;
        const l = d.length_mm || 100;
        volume_mm3 = w * l * (depthOfCut);
    }
    else if (feature.type === "profile" || feature.type === "chamfer") {
        const l = d.length_mm || (d.diameter_mm ? Math.PI * d.diameter_mm : 50);
        volume_mm3 = l * toolDia * (depthOfCut);
    }
    else {
        volume_mm3 = 1000; // default
    }
    const count = feature.count || 1;
    volume_mm3 *= count;
    // MRR = ap × ae × f × n (simplified)
    const ae = isFinish ? toolDia * 0.1 : toolDia * 0.6;
    const mrr = ae * depthOfCut * feedRate; // mm³/min
    const time = volume_mm3 / Math.max(mrr, 1);
    return Math.max(0.1, Math.round(time * 100) / 100);
}
function selectToolDiameter(feature, toolType) {
    const d = feature.dimensions;
    if (toolType === "face_mill")
        return Math.min(80, Math.max(40, (d.width_mm || 50) * 1.3));
    if (toolType === "drill" || toolType === "center_drill")
        return d.diameter_mm || 10;
    if (toolType === "boring_bar")
        return Math.max(8, (d.diameter_mm || 20) * 0.8);
    if (toolType === "thread_mill")
        return (d.diameter_mm || 10) * 0.7;
    if (toolType === "ball_mill")
        return Math.min(12, (d.width_mm || 10) * 0.4);
    if (toolType === "chamfer_mill")
        return 10;
    if (toolType === "grooving_tool")
        return d.width_mm || 3;
    // end_mill for pockets, slots, profiles
    if (d.width_mm)
        return Math.min(d.width_mm * 0.7, 25);
    if (d.diameter_mm)
        return Math.min(d.diameter_mm * 0.6, 20);
    return 10;
}
// ============================================================================
// ENGINE CLASS
// ============================================================================
/** Process Plan Engine engine/manager.
 */
export class ProcessPlanEngine {
    generate(input) {
        const operations = [];
        let seq = 0;
        const setup = 1; // single-setup for now
        const toolSet = new Set();
        const baseSpeed = ISO_SPEEDS[input.material_iso_group] || 200;
        // Always start with face mill if stock has top face
        const faceFeature = {
            id: "__face__", type: "face",
            dimensions: { width_mm: input.stock.x_mm, length_mm: input.stock.y_mm, depth_mm: 1 },
        };
        const faceOps = this.generateOpsForFeature(faceFeature, ++seq, setup, baseSpeed, toolSet, false);
        operations.push(...faceOps);
        seq += faceOps.length - 1;
        // Sort features: larger features first, then holes, then finishing
        const sorted = [...input.features].sort((a, b) => {
            const order = { face: 0, pocket: 1, slot: 2, profile: 3, hole: 4, bore: 5, thread: 6, groove: 7, chamfer: 8, freeform: 9 };
            return (order[a.type] || 5) - (order[b.type] || 5);
        });
        /** For.
         * @param const - const
         * @returns void
         */
        for (const feature of sorted) {
            const ops = this.generateOpsForFeature(feature, ++seq, setup, baseSpeed, toolSet, false);
            operations.push(...ops);
            seq += ops.length - 1;
            // If tight tolerance or finish needed, add finish pass
            /** If.
             * @param feature.tolerance_mm - feature.tolerance_mm
             * @returns void
             */
            if (feature.tolerance_mm && feature.tolerance_mm < 0.05) {
                const finishOps = this.generateOpsForFeature(feature, ++seq, setup, baseSpeed * 0.8, toolSet, true);
                operations.push(...finishOps);
                seq += finishOps.length - 1;
            }
        }
        // Renumber sequentially
        operations.forEach((op, i) => { op.seq = i + 1; });
        const totalTime = operations.reduce((s, op) => s + op.estimated_time_min, 0);
        // Playbook validation — inject sequencing wisdom
        const featureTypes = input.features.map(f => f.type);
        let playbookWarnings = [];
        let playbookSuggestions = [];
        let recommendedOrder = [];
        try {
            const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
            const advice = machiningPlaybookEngine.sequenceAdvice(featureTypes, input.material_iso_group);
            recommendedOrder = advice.recommended_order;
            playbookWarnings = advice.warnings;
            const antiPatterns = machiningPlaybookEngine.antiPatterns({
                features: featureTypes,
                material_iso: input.material_iso_group,
            });
            for (const r of antiPatterns) {
                playbookSuggestions.push(`${r.id}: ${r.title} — ${r.rule}`);
            }
        }
        catch { /* playbook not available */ }
        return {
            part_name: input.part_name,
            material: `${input.material_name || input.material_iso_group}`,
            total_setups: 1,
            total_operations: operations.length,
            total_time_min: Math.round(totalTime * 100) / 100,
            operations,
            tool_list: Array.from(toolSet),
            setup_summary: [{ setup: 1, description: "Main setup — top face access", operations: operations.length }],
            playbook_warnings: playbookWarnings.length > 0 ? playbookWarnings : undefined,
            playbook_suggestions: playbookSuggestions.length > 0 ? playbookSuggestions : undefined,
            recommended_order: recommendedOrder.length > 0 ? recommendedOrder : undefined,
        };
    }
    /** Optimize.
     * @param plan - plan
     * @returns plan optimization
     */
    optimize(plan) {
        const changes = [];
        let savings = 0;
        // Optimization 1: Combine sequential operations using same tool
        let prevTool = "";
        /** For.
         * @param const - const
         * @returns void
         */
        for (const op of plan.operations) {
            /** If.
             * @param op.tool.description - op.tool.description
             * @returns void
             */
            if (op.tool.description === prevTool) {
                savings += TOOL_CHANGE_SEC / 60; // save one tool change
                changes.push(`Combine ${op.operation} with previous (same tool) — save tool change`);
            }
            prevTool = op.tool.description;
        }
        // Optimization 2: Increase feed rates for roughing by 10%
        /** For.
         * @param const - const
         * @returns void
         */
        for (const op of plan.operations) {
            if (op.operation.includes("Rough")) {
                const oldTime = op.estimated_time_min;
                op.cutting_params.feed_rate_mmmin *= 1.1;
                op.estimated_time_min *= 0.91;
                savings += oldTime - op.estimated_time_min;
                changes.push(`Increased roughing feed for ${op.operation} by 10%`);
            }
        }
        const optimizedTime = plan.total_time_min - savings;
        return {
            original_time_min: Math.round(plan.total_time_min * 100) / 100,
            optimized_time_min: Math.round(optimizedTime * 100) / 100,
            savings_pct: Math.round((savings / plan.total_time_min) * 10000) / 100,
            changes,
        };
    }
    /** Estimates time.
     * @param plan - plan
     * @param setupTimeMin - setup time min
     * @returns time estimate
     */
    estimateTime(plan, setupTimeMin = 20) {
        let cuttingTime = 0;
        const rapidTime = plan.total_operations * 0.05; // ~3 sec rapid per op
        const toolChangeTime = (new Set(plan.operations.map(o => o.tool.description)).size * TOOL_CHANGE_SEC) / 60;
        /** For.
         * @param const - const
         * @returns void
         */
        for (const op of plan.operations) {
            cuttingTime += op.estimated_time_min;
        }
        const totalCycle = cuttingTime + rapidTime + toolChangeTime;
        return {
            cutting_time_min: Math.round(cuttingTime * 100) / 100,
            rapid_time_min: Math.round(rapidTime * 100) / 100,
            tool_change_time_min: Math.round(toolChangeTime * 100) / 100,
            setup_time_min: setupTimeMin,
            total_cycle_time_min: Math.round(totalCycle * 100) / 100,
            total_with_setup_min: Math.round((totalCycle + setupTimeMin) * 100) / 100,
        };
    }
    /** Validate.
     * @param plan - plan
     * @returns { valid: boolean; issues: string[] }
     */
    validate(plan) {
        const issues = [];
        if (plan.operations.length === 0)
            issues.push("Empty process plan");
        if (plan.total_time_min <= 0)
            issues.push("Invalid total time");
        // Check sequential ordering
        /** For.
         * @param let - let
         * @returns void
         */
        for (let i = 1; i < plan.operations.length; i++) {
            const prev = plan.operations[i - 1];
            const curr = plan.operations[i];
            if (curr.seq <= prev.seq)
                issues.push(`Sequence error: op ${curr.seq} after ${prev.seq}`);
        }
        // Check roughing before finishing
        const roughIdx = plan.operations.findIndex(o => o.operation.includes("Rough"));
        const finishIdx = plan.operations.findIndex(o => o.operation.includes("Finish"));
        /** If.
         * @param roughIdx - rough idx
         * @returns void
         */
        if (roughIdx >= 0 && finishIdx >= 0 && roughIdx > finishIdx) {
            issues.push("Finishing before roughing — incorrect sequence");
        }
        // Check each operation has valid params
        /** For.
         * @param const - const
         * @returns void
         */
        for (const op of plan.operations) {
            if (op.cutting_params.rpm <= 0)
                issues.push(`Op ${op.seq}: Invalid RPM`);
            if (op.cutting_params.feed_rate_mmmin <= 0)
                issues.push(`Op ${op.seq}: Invalid feed rate`);
            if (op.estimated_time_min <= 0)
                issues.push(`Op ${op.seq}: Invalid time estimate`);
        }
        return { valid: issues.length === 0, issues };
    }
    generateOpsForFeature(feature, startSeq, setup, baseSpeed, toolSet, isFinish) {
        const template = FEATURE_OPERATION_MAP[feature.type] || FEATURE_OPERATION_MAP["pocket"];
        const ops = [];
        const opsToUse = isFinish ? [template.ops[template.ops.length - 1]] : template.ops;
        const toolsToUse = isFinish ? [template.tools[template.tools.length - 1]] : template.tools;
        /** For.
         * @param let - let
         * @returns void
         */
        for (let i = 0; i < opsToUse.length; i++) {
            const toolType = toolsToUse[i];
            const diameter = selectToolDiameter(feature, toolType);
            const isFinishOp = opsToUs