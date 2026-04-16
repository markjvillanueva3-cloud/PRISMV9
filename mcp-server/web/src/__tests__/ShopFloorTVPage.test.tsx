/**
 * PRISM Manufacturing Intelligence — Motion Compensation Engine
 *
 * CPL-MS1 pipeline integration: three motion dynamics extensions.
 *
 * 1. **Servo Lag Compensation (P1-U01)** — Pre-compensate toolpath geometry for
 *    servo following error: δ = v / Kv. Ref: Altintas §6.2 Position Loop Dynamics.
 * 2. **Rotary Axis Dynamics (P1-U02)** — A/B/C axis velocity/acceleration limits
 *    with proportional feed reduction + G93 inverse-time feed.
 * 3. **Post-Processor Compatibility Filter (P1-U10)** — Gate controller feature
 *    injection against declared capabilities.
 *
 * Dispatcher actions: servo_lag_compensate, rotary_axis_check,
 *   controller_compatibility, filter_stages
 *
 * @version 1.0.0
 * @module MotionCompensationEngine
 */
/** Servo position-loop gain. Kv ≈ 20 m/min/mm = 333 1/s for Fanuc αi. */
export interface ServoParams {
    Kv_per_s: number;
}
/** Rotary axis kinematic limits */
export interface RotaryLimits {
    max_vel_deg_s: number;
    max_accel_deg_s2: number;
}
/** Machine motion parameters for compensation */
export interface MachineMotionParams {
    servo?: ServoParams;
    rotary?: RotaryLimits;
    controller?: string;
}
/** Controller capability declaration for feature gating */
export interface ControllerCapabilities {
    nurbs: boolean;
    tcp: boolean;
    look_ahead_blocks: number;
    macro_b: boolean;
    high_speed_mode: boolean;
    max_block_rate: number;
}
/** G-code block with optional rotary axes */
export interface MotionBlock {
    index: number;
    x: number;
    y: number;
    z: number;
    a?: number;
    b?: number;
    c?: number;
    feed_mmmin: number;
    type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
    gcode?: string;
}
/** Servo lag compensation result */
export interface ServoCompensationResult {
    blocks: MotionBlock[];
    max_compensation_um: number;
    avg_compensation_um: number;
    blocks_compensated: number;
    blocks_skipped: number;
}
/** Rotary axis limit check result */
export interface RotaryAxisResult {
    blocks: MotionBlock[];
    feeds_limited: number;
    g93_blocks_generated: number;
    max_angular_vel_deg_s: number;
    recommendations: string[];
}
/** Controller compatibility result */
export interface CompatibilityResult {
    compatible: boolean;
    supported: string[];
    unsupported: string[];
    recommendations: string[];
}
/** Stage configuration flags */
export interface StageConfig {
    [stageName: string]: boolean;
}
/** Stage filter result */
export interface StageFilterResult {
    stages: StageConfig;
    disabled: string[];
    warnings: string[];
}
declare class MotionCompensationEngineImpl {
    /**
     * Pre-compensate toolpath coordinates for servo following error.
     *
     * Position-loop following error: δ = v / Kv (mm).
     * Each block target is offset forward along the feed direction by δ so the
     * actual servo position tracks the intended path more closely.
     *
     * @param blocks  Toolpath blocks to compensate
     * @param params  Machine motion parameters (servo gain)
     */
    servoLagCompensation(blocks: MotionBlock[], params?: MachineMotionParams): ServoCompensationResult;
    /**
     * Enforce rotary axis velocity/acceleration limits on 5-axis toolpath blocks.
     *
     * For simultaneous 5-axis moves the linear feed rate must be constrained so
     * rotary axes stay within kinematic limits. Generates G93 inverse-time feed:
     *   F_g93 = 1/t_block (min⁻¹) where t_block = max(t_linear, t_rotary).
     *
     * 