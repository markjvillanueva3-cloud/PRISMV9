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

import { log } from "../utils/Logger.js";

// ── Interfaces ──────────────────────────────────────────────────────────────

/** Servo position-loop gain. Kv ≈ 20 m/min/mm = 333 1/s for Fanuc αi. */
export interface ServoParams { Kv_per_s: number; }

/** Rotary axis kinematic limits */
export interface RotaryLimits { max_vel_deg_s: number; max_accel_deg_s2: number; }

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
  x: number; y: number; z: number;
  a?: number; b?: number; c?: number;
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
export interface StageConfig { [stageName: string]: boolean; }

/** Stage filter result */
export interface StageFilterResult {
  stages: StageConfig;
  disabled: string[];
  warnings: string[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_KV_PER_S = 333.33;
const DEFAULT_ROTARY_MAX_VEL = 20;   // deg/s
const DEFAULT_ROTARY_MAX_ACCEL = 50; // deg/s²

/** Controller capability DB — mirrors ControllerDialectEngine feature sets */
const CTRL_CAPS: Record<string, ControllerCapabilities> = {
  fanuc_0i:        { nurbs: false, tcp: false, look_ahead_blocks: 40,  macro_b: true,  high_speed_mode: false, max_block_rate: 1000  },
  fanuc_16i:       { nurbs: false, tcp: false, look_ahead_blocks: 80,  macro_b: true,  high_speed_mode: true,  max_block_rate: 2000  },
  fanuc_18i:       { nurbs: false, tcp: false, look_ahead_blocks: 80,  macro_b: true,  high_speed_mode: true,  max_block_rate: 2000  },
  fanuc_30i:       { nurbs: true,  tcp: true,  look_ahead_blocks: 200, macro_b: true,  high_speed_mode: true,  max_block_rate: 5000  },
  fanuc_31i:       { nurbs: true,  tcp: true,  look_ahead_blocks: 200, macro_b: true,  high_speed_mode: true,  max_block_rate: 7000  },
  siemens_828d:    { nurbs: false, tcp: true,  look_ahead_blocks: 100, macro_b: false, high_speed_mode: true,  max_block_rate: 4000  },
  siemens_840d:    { nurbs: true,  tcp: true,  look_ahead_blocks: 200, macro_b: false, high_speed_mode: true,  max_block_rate: 10000 },
  siemens_one:     { nurbs: true,  tcp: true,  look_ahead_blocks: 300, macro_b: false, high_speed_mode: true,  max_block_rate: 15000 },
  heidenhain_tnc640:{ nurbs: true, tcp: true,  look_ahead_blocks: 150, macro_b: false, high_speed_mode: true,  max_block_rate: 5000  },
  heidenhain_tnc7: { nurbs: true,  tcp: true,  look_ahead_blocks: 200, macro_b: false, high_speed_mode: true,  max_block_rate: 8000  },
  haas_ngc:        { nurbs: false, tcp: false, look_ahead_blocks: 80,  macro_b: true,  high_speed_mode: true,  max_block_rate: 1000  },
  mazak_smooth_ai: { nurbs: true,  tcp: true,  look_ahead_blocks: 200, macro_b: true,  high_speed_mode: true,  max_block_rate: 10000 },
  mazak_smooth_g:  { nurbs: false, tcp: true,  look_ahead_blocks: 100, macro_b: true,  high_speed_mode: true,  max_block_rate: 4000  },
  okuma_osp_p300:  { nurbs: false, tcp: true,  look_ahead_blocks: 80,  macro_b: true,  high_speed_mode: true,  max_block_rate: 3000  },
  okuma_osp_p500:  { nurbs: true,  tcp: true,  look_ahead_blocks: 200, macro_b: true,  high_speed_mode: true,  max_block_rate: 8000  },
  brother_speedio: { nurbs: false, tcp: false, look_ahead_blocks: 60,  macro_b: true,  high_speed_mode: true,  max_block_rate: 2000  },
  mitsubishi_m80:  { nurbs: true,  tcp: true,  look_ahead_blocks: 160, macro_b: true,  high_speed_mode: true,  max_block_rate: 5400  },
  fagor_8065:      { nurbs: true,  tcp: true,  look_ahead_blocks: 150, macro_b: false, high_speed_mode: true,  max_block_rate: 5000  },
  generic_fanuc:   { nurbs: false, tcp: false, look_ahead_blocks: 40,  macro_b: true,  high_speed_mode: false, max_block_rate: 1000  },
  generic_iso:     { nurbs: false, tcp: false, look_ahead_blocks: 20,  macro_b: false, high_speed_mode: false, max_block_rate: 500   },
};

/** HSM G-code → controllers that support it */
const HSM_MAP: Record<string, string[]> = {
  "G05.1":    ["fanuc_16i", "fanuc_18i", "fanuc_30i", "fanuc_31i"],
  "CYCLE832": ["siemens_828d", "siemens_840d", "siemens_one"],
  "G187":     ["heidenhain_tnc640", "heidenhain_tnc7"],
  "G134":     ["okuma_osp_p300", "okuma_osp_p500"],
  "G05P10000":["haas_ngc"],
  "G08P1":    ["fanuc_30i", "fanuc_31i", "mazak_smooth_ai", "mazak_smooth_g"],
};

/** Pipeline stages → required controller capability */
const STAGE_REQS: Record<string, keyof ControllerCapabilities> = {
  hsm_injection: "high_speed_mode", nurbs_conversion: "nurbs",
  tcp_mode_activation: "tcp", macro_subroutine_call: "macro_b",
  look_ahead_optimization: "high_speed_mode", corner_smoothing: "high_speed_mode",
  five_axis_tcp: "tcp", nurbs_fitting: "nurbs",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalize3d(dx: number, dy: number, dz: number) {
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return len < 1e-12 ? { dx: 0, dy: 0, dz: 0 } : { dx: dx / len, dy: dy / len, dz: dz / len };
}

function dist3d(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function toMmps(v: number): number { return v / 60; }

function angleDelta(from: number | undefined, to: number | undefined): number {
  if (from === undefined || to === undefined) return 0;
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// ── Engine ──────────────────────────────────────────────────────────────────

class MotionCompensationEngineImpl {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SERVO LAG COMPENSATION (P1-U01)
  // ═══════════════════════════════════════════════════════════════════════════

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
  servoLagCompensation(blocks: MotionBlock[], params?: MachineMotionParams): ServoCompensationResult {
    const empty: ServoCompensationResult = {
      blocks: [], max_compensation_um: 0, avg_compensation_um: 0, blocks_compensated: 0, blocks_skipped: 0,
    };
    if (!blocks || blocks.length === 0) return empty;

    const Kv = params?.servo?.Kv_per_s ?? DEFAULT_KV_PER_S;
    if (Kv <= 0) {
      log.warn("MotionCompensationEngine: Kv must be positive, using default");
      return this.servoLagCompensation(blocks, { ...params, servo: { Kv_per_s: DEFAULT_KV_PER_S } });
    }

    const result: MotionBlock[] = [];
    let maxComp = 0, totalComp = 0, compensated = 0, skipped = 0;
    let prevX = blocks[0].x, prevY = blocks[0].y, prevZ = blocks[0].z;

    for (let i = 0; i < blocks.length; i++) {
      const blk = { ...blocks[i] };

      // Skip rapids — servo error on rapids handled by exact-stop / in-position check
      if (blk.type === "rapid" || blk.feed_mmmin <= 0) {
        result.push(blk);
        prevX = blk.x; prevY = blk.y; prevZ = blk.z;
        skipped++;
        continue;
      }

      const dx = blk.x - prevX, dy = blk.y - prevY, dz = blk.z - prevZ;
      const moveLen = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (moveLen < 1e-9) {
        result.push(blk); skipped++; continue;
      }

      const v_mmps = toMmps(blk.feed_mmmin);
      const delta_mm = v_mmps / Kv;          // Following error δ = v / Kv
      const delta_um = delta_mm * 1000;
      const dir = normalize3d(dx, dy, dz);

      // Offset target forward along feed direction
      blk.x += dir.dx * delta_mm;
      blk.y += dir.dy * delta_mm;
      blk.z += dir.dz * delta_mm;

      result.push(blk);
      compensated++;
      maxComp = Math.max(maxComp, delta_um);
      totalComp += delta_um;
      prevX = blocks[i].x; prevY = blocks[i].y; prevZ = blocks[i].z;
    }

    const avgComp = compensated > 0 ? totalComp / compensated : 0;
    log.info(`MotionCompensationEngine: servo lag compensated ${compensated}/${blocks.length} blocks, max=${maxComp.toFixed(1)}µm, avg=${avgComp.toFixed(1)}µm`);

    return {
      blocks: result,
      max_compensation_um: Math.round(maxComp * 100) / 100,
      avg_compensation_um: Math.round(avgComp * 100) / 100,
      blocks_compensated: compensated,
      blocks_skipped: skipped,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ROTARY AXIS DYNAMICS (P1-U02)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enforce rotary axis velocity/acceleration limits on 5-axis toolpath blocks.
   *
   * For simultaneous 5-axis moves the linear feed rate must be constrained so
   * rotary axes stay within kinematic limits. Generates G93 inverse-time feed:
   *   F_g93 = 1/t_block (min⁻¹) where t_block = max(t_linear, t_rotary).
   *
   * @param blocks  Toolpath blocks with A/B/C positions
   * @param params  Machine motion parameters (rotary limits)
   */
  rotaryAxisLimits(blocks: MotionBlock[], params?: MachineMotionParams): RotaryAxisResult {
    const emptyRes: RotaryAxisResult = {
      blocks: [], feeds_limited: 0, g93_blocks_generated: 0,
      max_angular_vel_deg_s: 0, recommendations: [],
    };
    if (!blocks || blocks.length === 0) return emptyRes;

    const maxVel = params?.rotary?.max_vel_deg_s ?? DEFAULT_ROTARY_MAX_VEL;
    const maxAccel = params?.rotary?.max_accel_deg_s2 ?? DEFAULT_ROTARY_MAX_ACCEL;

    const result: MotionBlock[] = [];
    let feedsLimited = 0, g93Count = 0, maxAngVel = 0;
    const recs: string[] = [];
    let prevBlock: MotionBlock | null = null;
    let prevAngVel = 0;

    for (let i = 0; i < blocks.length; i++) {
      const blk = { ...blocks[i] };
      const hasRotary = (blk.a !== undefined || blk.b !== undefined || blk.c !== undefined) && prevBlock !== null;

      if (!hasRotary || blk.type === "rapid" || blk.feed_mmmin <= 0) {
        result.push(blk);
        prevBlock = blocks[i];
        prevAngVel = 0;
        continue;
      }

      const linDist = dist3d(prevBlock!.x, prevBlock!.y, prevBlock!.z, blk.x, blk.y, blk.z);
      const dA = angleDelta(prevBlock!.a, blk.a);
      const dB = angleDelta(prevBlock!.b, blk.b);
      const dC = angleDelta(prevBlock!.c, blk.c);
      const totalAng = Math.sqrt(dA * dA + dB * dB + dC * dC);

      if (totalAng < 1e-9) {
        result.push(blk); prevBlock = blocks[i]; prevAngVel = 0; continue;
      }

      // Time for linear move at commanded feed
      const v_mmps = toMmps(blk.feed_mmmin);
      const t_linear = linDist > 1e-9 ? linDist / v_mmps : 0;
      const t_rotary_min = totalAng / maxVel;

      let t_block = Math.max(t_linear, t_rotary_min, 1e-6);
      let limited = t_rotary_min > t_linear || t_linear < 1e-9;

      // Check angular acceleration constraint: α = Δω / Δt
      const angVel = totalAng / t_block;
      const angAccel = Math.abs(angVel - prevAngVel) / Math.max(t_block, 1e-6);
      if (angAccel > maxAccel) {
        const t_accel = Math.abs(angVel - prevAngVel) / maxAccel;
        if (t_accel > t_block) { t_block = t_accel; limited = true; }
      }

      const actualAngVel = totalAng / t_block;
      maxAngVel = Math.max(maxAngVel, actualAngVel);

      if (limited && linDist > 1e-9) {
        blk.feed_mmmin = Math.round(clamp((linDist / t_block) * 60, 1, blk.feed_mmmin));
        feedsLimited++;
      }

      // G93 inverse-time feed: F = 1/t_block(min)
      const g93_feed = 1 / (t_block / 60);
      blk.gcode = `G93 F${g93_feed.toFixed(3)}`;
      g93Count++;

      result.push(blk);
      prevBlock = blocks[i];
      prevAngVel = actualAngVel;
    }

    if (feedsLimited > 0) {
      recs.push(`${feedsLimited} blocks (${((feedsLimited / blocks.length) * 100).toFixed(1)}%) feed-limited by rotary axis constraints`);
    }
    if (maxAngVel > maxVel * 0.9) {
      recs.push(`Peak rotary velocity ${maxAngVel.toFixed(1)} deg/s near limit (${maxVel}) — reduce angular change per block`);
    }
    if (g93Count > 0 && g93Count < blocks.length * 0.5) {
      recs.push("Mixed G93/G94 feed mode — ensure post-processor handles mode switching");
    }

    log.info(`MotionCompensationEngine: rotary limits — ${feedsLimited} limited, ${g93Count} G93, max ω=${maxAngVel.toFixed(1)} deg/s`);
    return {
      blocks: result, feeds_limited: feedsLimited, g93_blocks_generated: g93Count,
      max_angular_vel_deg_s: Math.round(maxAngVel * 100) / 100, recommendations: recs,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. POST-PROCESSOR COMPATIBILITY FILTER (P1-U10)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check whether a controller supports a set of required features.
   *
   * Gates injection of G05.1 (AICC/Fanuc only), CYCLE832 (Siemens only),
   * G187 (Heidenhain only), TCP, NURBS, Macro B, etc.
   *
   * @param controllerDialect  Controller id (e.g. "fanuc_31i")
   * @param requiredFeatures   Feature names to check
   */
  checkControllerCompatibility(controllerDialect: string, requiredFeatures: string[]): CompatibilityResult {
    const caps = CTRL_CAPS[controllerDialect];

    if (!caps) {
      return {
        compatible: false, supported: [], unsupported: requiredFeatures,
        recommendations: [
          `Unknown controller "${controllerDialect}". Supported: ${Object.keys(CTRL_CAPS).join(", ")}`,
          "Falling back to generic_iso — all advanced features disabled",
        ],
      };
    }

    const supported: string[] = [], unsupported: string[] = [], recs: string[] = [];
    const checks: Record<string, { ok: boolean; rec: string }> = {
      nurbs_interpolation: { ok: caps.nurbs, rec: "NURBS not supported — use linear segmentation" },
      nurbs:               { ok: caps.nurbs, rec: "NURBS not supported — fallback to G01" },
      tcp_mode:            { ok: caps.tcp, rec: "TCP/RTCP not available — use pre-computed IK in CAM" },
      tcp:                 { ok: caps.tcp, rec: "TCP not available — pre-compute inverse kinematics" },
      look_ahead:          { ok: caps.look_ahead_blocks > 0, rec: `Look-ahead: ${caps.look_ahead_blocks} blocks` },
      macro_b:             { ok: caps.macro_b, rec: "Macro B (G65/G66) not supported — inline subroutines" },
      high_speed_mode:     { ok: caps.high_speed_mode, rec: "HSM not available — HSM G-codes will not be injected" },
      aicc:                { ok: caps.high_speed_mode && (HSM_MAP["G05.1"]?.includes(controllerDialect) ?? false), rec: "AICC (G05.1) not supported — use G64 if available" },
      cycle832:            { ok: caps.high_speed_mode && (HSM_MAP["CYCLE832"]?.includes(controllerDialect) ?? false), rec: "CYCLE832 is Siemens-only" },
      g187:                { ok: caps.high_speed_mode && (HSM_MAP["G187"]?.includes(controllerDialect) ?? false), rec: "G187 is Heidenhain-only" },
    };

    for (const feat of requiredFeatures) {
      const entry = checks[feat.toLowerCase()];
      if (!entry) {
        unsupported.push(feat);
        recs.push(`Unknown feature "${feat}" — treating as unsupported`);
      } else if (entry.ok) {
        supported.push(feat);
      } else {
        unsupported.push(feat);
        recs.push(entry.rec);
      }
    }

    const compatible = unsupported.length === 0;
    log.info(`MotionCompensationEngine: ${controllerDialect} — ${supported.length} supported, ${unsupported.length} unsupported`);
    return { compatible, supported, unsupported, recommendations: recs };
  }

  /**
   * Filter pipeline stages based on controller capabilities.
   * Disables stages that require features the controller does not support.
   *
   * @param stageFlags          Stage config (name → enabled)
   * @param controllerDialect   Controller id
   */
  filterPipelineStages(stageFlags: StageConfig, controllerDialect: string): StageFilterResult {
    const caps = CTRL_CAPS[controllerDialect];
    const stages = { ...stageFlags };
    const disabled: string[] = [], warnings: string[] = [];

    if (!caps) {
      warnings.push(`Unknown controller "${controllerDialect}" — disabling all capability-gated stages`);
      for (const stage of Object.keys(STAGE_REQS)) {
        if (stages[stage]) { stages[stage] = false; disabled.push(stage); }
      }
      return { stages, disabled, warnings };
    }

    for (const [stage, reqCap] of Object.entries(STAGE_REQS)) {
      if (!stages[stage]) continue;
      const val = caps[reqCap];
      const ok = typeof val === "boolean" ? val : val > 0;
      if (!ok) {
        stages[stage] = false;
        disabled.push(stage);
        warnings.push(`Stage "${stage}" disabled — requires "${reqCap}" unsupported by ${controllerDialect}`);
      }
    }

    if (disabled.length > 0) {
      log.info(`MotionCompensationEngine: filtered ${disabled.length} stages for ${controllerDialect}`);
    }
    return { stages, disabled, warnings };
  }

  // ── Utility ─────────────────────────────────────────────────────────────

  /** Look up controller capabilities. Returns null if unknown. */
  getCapabilities(dialect: string): ControllerCapabilities | null {
    return CTRL_CAPS[dialect] ?? null;
  }

  /** List all supported controller dialects with capabilities. */
  listControllers(): Array<{ id: string; capabilities: ControllerCapabilities }> {
    return Object.entries(CTRL_CAPS).map(([id, capabilities]) => ({ id, capabilities }));
  }
}

// ── Singleton Export ────────────────────────────────────────────────────────

/** Singleton instance — PRISM DSL convention */
export const motionCompensationEngine = new MotionCompensationEngineImpl();

/** Class export for type access and testing */
export { MotionCompensationEngineImpl as MotionCompensationEngine };
