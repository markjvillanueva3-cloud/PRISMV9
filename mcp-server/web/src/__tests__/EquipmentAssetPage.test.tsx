/**
 * PredictiveMaintenanceEngine.ts — R10-Rev6
 * ==========================================
 * Predicts machine maintenance needs from cutting data patterns.
 * Unlike traditional schedule-based maintenance, this looks at PARTS
 * quality to detect machine degradation before it causes failures.
 *
 * 5 prediction models:
 *   1. Spindle bearing degradation (vibration harmonics)
 *   2. Ballscrew wear (backlash from probing drift)
 *   3. Way lube system (axis motor current during rapids)
 *   4. Coolant degradation (systematic Ra worsening)
 *   5. Tool holder wear (runout from surface finish patterns)
 *
 * 10 dispatcher actions:
 *   maint_analyze, maint_trend, maint_predict, maint_schedule,
 *   maint_models, maint_thresholds, maint_alerts, maint_status,
 *   maint_history, maint_get
 */
// ─── Maintenance Models Database ────────────────────────────────────────────
const MAINTENANCE_MODELS = [
    {
        category: "spindle_bearing",
        component: "Spindle Bearing Assembly",
        signal: "Vibration amplitude at 1x and 2x spindle RPM harmonics",
        detection_method: "FFT analysis of accelerometer data via MTConnect; track peak amplitude trend over time",
        threshold_unit: "mm/s RMS",
        normal_range: [0.0, 2.5],
        warning_threshold: 4.5,
        critical_threshold: 7.0,
        typical_life_hours: 10000,
        cost_to_replace_usd: 8000,
        downtime_hours: 24,
    },
    {
        category: "ballscrew",
        component: "Ballscrew Assembly",
        signal: "Backlash detected from probing cycle inconsistency (bidirectional approach difference)",
        detection_method: "Statistical analysis of touch probe measurements; compare approach-from-positive vs approach-from-negative",
        threshold_unit: "mm",
        normal_range: [0.0, 0.005],
        warning_threshold: 0.015,
        critical_threshold: 0.025,
        typical_life_hours: 20000,
        cost_to_replace_usd: 5000,
        downtime_hours: 16,
    },
    {
        category: "way_lube",
        component: "Way Lubrication System",
        signal: "Axis motor current during rapid traverse moves (increased friction = increased current)",
        detection_method: "Monitor servo motor current at constant rapid speed via MTConnect; compare against baseline",
        threshold_unit: "% above baseline",
        normal_range: [0, 5],
        warning_threshold: 15,
        critical_threshold: 30,
        typical_life_hours: 4000,
        cost_to_replace_usd: 500,
        downtime_hours: 4,
    },
    {
        category: "coolant",
        component: "Coolant System",
        signal: "Surface finish (Ra) gradually worsening across all jobs despite same cutting parameters",
