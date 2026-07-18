/**
 * WEDM Perception Hooks — WEDM AGI Phase 1 / P1-MS1 (U-P1-04, U-P1-05)
 *
 * Two hooks that wire the WEDM perception stack (MachineState → KalmanFusion
 * → VirtualMachine) into the PRISM hook bus:
 *
 *   1. wedm_sensor_anomaly (U-P1-04) — post-tool SPC-style anomaly detector.
 *      Consumes the fused channels produced by WEDMKalmanFusionEngine and
 *      applies a Nelson Rule 1 adaptation: warn when |innovation| exceeds
 *      3σ (σ derived from posterior variance + measurement noise), escalate
 *      when it persists for ≥3 consecutive frames on the same channel.
 *
 *   2. wedm_twin_sync (U-P1-05) — post-tool trigger that syncs the global
 *      WEDMVirtualMachineEngine from a freshly-ingested WEDMMachineState and
 *      raises a warning when the physical/virtual position delta exceeds
 *      the 1 mm budget (P1-MS1 exit gate).
 *
 * These hooks are stateless at the module level except for the per-channel
 * consecutive-violation counter, which is keyed by session id and reset
 * whenever the channel returns inside bounds. That mirrors the classical
 * SPC rule and avoids a global runtime leak.
 *
 * @see WEDMKalmanFusionEngine — source of FusedChannel.innovation/variance
 * @see WEDMVirtualMachineEngine — digital-twin state / discrepancy model
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning,
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";
import {
  wedmVirtualMachineEngine,
} from "../engines/WEDMVirtualMachineEngine.js";
import type {
  WEDMFusedState,
  FusedChannel,
} from "../engines/WEDMKalmanFusionEngine.js";
import type { WEDMMachineState } from "../engines/WEDMMachineStateEngine.js";

// ────────────────────────── Anomaly state ──────────────────────────

/** Consecutive-violation counter per (session, channel). Module-local. */
const anomalyCounters = new Map<string, Map<string, number>>();

/** Exposed for tests: clear the counter table. */
export function _resetAnomalyCounters(): void {
  anomalyCounters.clear();
}

const ANOMALY_SIGMA = 3; // Nelson Rule 1 threshold
const ANOMALY_PERSIST_FRAMES = 3; // 3 consecutive beyond 3σ ⇒ anomaly

function channelSigma(c: FusedChannel): number {
  // Innovation uncertainty = sqrt(P + R). We only have P exposed, but
  // approximate σ as sqrt(variance); for the Kalman we run, P absorbs R.
  return Math.sqrt(Math.max(0, c.variance));
}

function isAnomalous(c: FusedChannel): boolean {
  const sigma = channelSigma(c);
  if (sigma <= 0) return false;
  return Math.abs(c.innovation) >= ANOMALY_SIGMA * sigma;
}

// ────────────────────────── U-P1-04: sensor anomaly ──────────────────────────

const wedmSensorAnomaly: HookDefinition = {
  id: "wedm-sensor-anomaly",
  name: "WEDM Sensor Anomaly Detector",
  description:
    "Nelson-rule SPC anomaly on fused WEDM sensor channels. Warns when |innovation| > 3σ on a single frame; escalates after 3 consecutive frames out-of-bounds.",
  phase: "post-tool",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["wedm", "perception", "spc", "anomaly", "warning"],
  handler: (ctx: HookContext): HookResult => {
    const action = ctx.target?.action ?? ctx.operation ?? "";
    const data = (ctx.target?.data ?? {}) as Record<string, unknown>;

    // Only fire for WEDM sense/fuse actions.
    const isWedm =
      action.startsWith("wedm_fuse") ||
      action.startsWith("wedm_ingest") ||
      action.startsWith("wedm_machine_state") ||
      action.startsWith("wedm_sense");
    if (!isWedm) {
      return hookSuccess(wedmSensorAnomaly, "Not a perception action", {
        data: { skipped: true },
      });
    }

    const fused = (data.fused ?? data.fusedState ?? null) as WEDMFusedState | null;
    if (!fused) {
      return hookSuccess(wedmSensorAnomaly, "No fused state in payload", {
        data: { skipped: true },
      });
    }

    const sessionId = ctx.session?.id ?? "_default";
    let counters = anomalyCounters.get(sessionId);
    if (!counters) {
      counters = new Map<string, number>();
      anomalyCounters.set(sessionId, counters);
    }

    const channelKeys = [
      "gap_voltage_V",
      "discharge_current_A",
      "wire_tension_N",
      "flush_pressure_bar",
      "bath_temperature_C",
      "spark_frequency_Hz",
      "servo_voltage_V",
    ] as const;

    const warnings: string[] = [];
    const persisted: string[] = [];

    for (const key of channelKeys) {
      const ch = fused[key] as FusedChannel | null;
      if (!ch) continue;
      if (isAnomalous(ch)) {
        const n = (counters.get(key) ?? 0) + 1;
        counters.set(key, n);
        const sigma = channelSigma(ch);
        const magnitude =
          sigma > 0 ? Math.abs(ch.innovation) / sigma : Infinity;
        warnings.push(
          `${key}: |innovation|=${Math.abs(ch.innovation).toFixed(3)} ` +
            `≈ ${magnitude.toFixed(1)}σ (frame ${n})`,
        );
        if (n >= ANOMALY_PERSIST_FRAMES) persisted.push(key);
      } else {
        counters.set(key, 0);
      }
    }

    if (persisted.length > 0) {
      log.warn(
        "wedm-sensor-anomaly",
        `Persistent anomaly on ${persisted.join(", ")} (≥${ANOMALY_PERSIST_FRAMES} consecutive frames)`,
      );
      return hookWarning(
        wedmSensorAnomaly,
        `Persistent sensor anomaly: ${persisted.join(", ")}`,
        {
          warnings,
          data: {
            warnings,
            persisted,
            persistFrames: ANOMALY_PERSIST_FRAMES,
            sigmaThreshold: ANOMALY_SIGMA,
          },
        },
      );
    }

    if (warnings.length > 0) {
      return hookWarning(
        wedmSensorAnomaly,
        `Transient anomaly: ${warnings.length} channel(s) > ${ANOMALY_SIGMA}σ`,
        {
          warnings,
          data: { warnings, sigmaThreshold: ANOMALY_SIGMA },
        },
      );
    }

    return hookSuccess(wedmSensorAnomaly, "All channels within SPC bounds", {
      data: {
        channelsObserved: channelKeys.filter((k) => fused[k] !== null).length,
      },
    });
  },
};

// ────────────────────────── U-P1-05: twin sync ──────────────────────────

const wedmTwinSync: HookDefinition = {
  id: "wedm-twin-sync",
  name: "WEDM Virtual Machine Sync",
  description:
    "Post-tool trigger that syncs the WEDMVirtualMachineEngine from a fresh WEDMMachineState and warns when physical/virtual position delta exceeds 1 mm (P1-MS1 exit gate).",
  phase: "post-tool",
  category: "automation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["wedm", "perception", "twin", "trigger"],
  handler: (ctx: HookContext): HookResult => {
    const action = ctx.target?.action ?? ctx.operation ?? "";
    const data = (ctx.target?.data ?? {}) as Record<string, unknown>;

    const isStateAction =
      action.startsWith("wedm_machine_state") ||
      action.startsWith("wedm_twin_sync") ||
      action.startsWith("wedm_ingest");
    if (!isStateAction) {
      return hookSuccess(wedmTwinSync, "Not a machine-state action", {
        data: { skipped: true },
      });
    }

    const machine = (data.machineState ??
      data.state ??
      data.machine ??
      null) as WEDMMachineState | null;
    if (!machine || typeof machine.t_ms !== "number") {
      return hookSuccess(wedmTwinSync, "No machine state in payload", {
        data: { skipped: true },
      });
    }

    // Compare first (uses prior twin state) then sync so the discrepancy
    // reflects the physical frame arriving against the last-known twin.
    const discrepancy = wedmVirtualMachineEngine.compareToPhysical(machine);
    const twin = wedmVirtualMachineEngine.sync(machine);

    if (discrepancy && !discrepancy.withinBudget) {
      log.warn(
        "wedm-twin-sync",
        `Twin drift ${discrepancy.position_error_mm.toFixed(3)} mm exceeds 1 mm budget`,
      );
      return hookWarning(
        wedmTwinSync,
        `Twin position drift ${discrepancy.position_error_mm.toFixed(3)} mm > 1 mm`,
        {
          data: {
            discrepancy,
            twin_t_ms: twin.t_ms,
            twin_mode: twin.mode,
            syncLatencyMs: twin.syncLatencyMs,
          },
        },
      );
    }

    return hookSuccess(wedmTwinSync, "Twin synced within budget", {
      data: {
        twin_t_ms: twin.t_ms,
        twin_mode: twin.mode,
        position_error_mm: discrepancy?.position_error_mm ?? 0,
        syncLatencyMs: twin.syncLatencyMs,
      },
    });
  },
};

// ────────────────────────── Exports ──────────────────────────

export const wedmPerceptionHooks: HookDefinition[] = [
  wedmSensorAnomaly,
  wedmTwinSync,
];

export { wedmSensorAnomaly, wedmTwinSync };
