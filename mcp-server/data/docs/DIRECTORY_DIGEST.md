/**
 * SchedulingStudyAggregatorEngine — Multi-Algorithm Scheduling Aggregator
 * ========================================================================
 *
 * Aggregates results from multiple scheduling algorithms (job-shop, single-machine,
 * Johnson's two-machine, CPM) into unified study records for the scheduling desk.
 *
 * Backs the SchedulingProvider contract from
 * web/src/features/operating-system/contracts.ts.
 *
 * @version 1.0.0 — Sprint C1
 */
// ─── Engine ───────────────────────────────────────────────────────────────────
export class SchedulingStudyAggregatorEngine {
    /**
     * Build study records from scheduling algorithm outputs.
     * @param inputs - Results from job-shop, single-machine, Johnson's, and CPM solvers
     */
    static buildStudies(inputs) {
        const studies = [];
        if (inputs.jobShopResult) {
            studies.push(SchedulingStudyAggregatorEngine.buildJobShopStudy(inputs.jobShopResult));
        }
        if (inputs.singleResult) {
            studies.push(SchedulingStudyAggregatorEngine.buildSingleMachineStudy(inputs.singleResult));
        }
        if (inputs.johnsonsResult) {
            studies.push(SchedulingStudyAggregatorEngine.buildJohnsonsStudy(inputs.johnsonsResult));
        }
        if (inputs.cpmResult) {
            studies.push(SchedulingStudyAggregatorEngine.buildCpmStudy(inputs.cpmResult));
        }
        if (studies.length === 0) {
            studies.push(SchedulingStudyAggregatorEngine.buildEmptyStudy());
        }
        return studies;
    }
    /**
     * Build a schedule release record for approval workflow.
     */
    static buildScheduleRelease(input) {
        const criticalCount = input.exceptions.filter((e) => e.severity === "critical").length;
        return {
            studyKey: input.studyKey,
            owner: "Scheduling Lead",
            publishSummary: criticalCount > 0
                ? `${criticalCount} critical exception(s) — review before release`
                : "Schedule ready for release",
            approvals: [
                { id: `appr-sched-${input.studyKey}`, label: "Scheduling", owner: "Scheduling Lead", status: input.tone === "critical" ? "blocked" : "ready", detail: "Schedule feasibility review" },
                { id: `appr-floor-${input.studyKey}`, label: "Floor Lead", owner: "Shift Lead", status: "waiting", detail: "Capacity and resource confirmation" },
            ],
            shortages: [],
            checks: input.checks,
        };
    }
    // ─── Private Builders ─────────────────────────────────────────────────────
    static determineTone(utilization, exceptions) {
        if (exceptions > 0)
            return "critical";
        if (utilization > 0.9)
            return "loaded";
        if (utilization > 0.7)
            return "watch";
        return "ready";
    }
    static buildJobShopStudy(result) {
        const machines = Object.keys(result.utilization);
        const avgUtil = machines.length > 0
            ? machines.reduce((sum, m) => sum + (result.utilization[m] || 0), 0) / machines.length
            : 0;
        const bottleneck = machines.reduce((best, m) => (result.utilization[m] || 0) > (result.utilization[best] || 0) ? m : best, machines[0] || "none");
        const exceptions = [];
        if (avgUtil > 0.95) {
            exceptions.push({ id: "exc-overload", title: "Near capacity", detail: `Average utilization ${(avgUtil * 100).toFixed(0)}% — no buffer for breakdowns`, severity: "critical" });
        }
        const tone = SchedulingStudyAggregatorEngine.determineTone(avgUtil, exceptions.length);
        return {
            key: "job-shop",
            label: "Job Shop Schedule",
            detail: `${result.jobs.length} operations across ${machines.length} machines`,
            tone,
            statusLabel: tone === "ready" ? "Feasible" : tone === "loaded" ? "Tight" : "Review",
            postureValue: `${(avgUtil * 100).toFixed(0)}% util`,
            bottleneckValue: bottleneck,
            publishValue: exceptions.length > 0 ? "Hold" : "Ready",
            boardTitle: "Job Shop Gantt",
       