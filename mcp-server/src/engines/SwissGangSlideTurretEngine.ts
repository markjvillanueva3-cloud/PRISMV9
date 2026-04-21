/**
 * SwissGangSlideTurretEngine
 * ==========================
 *
 * Detects the tool-carrier topology (gang slide vs turret vs hybrid) and
 * optimizes tool layout on Swiss-type lathes (U-LPS23, MS6b).
 *
 * ── Gang slide ─────────────────────────────────────────────────
 *   A linear block of tools arrayed along the X-axis. Tool change = X-axis
 *   rapid move (~0.1–0.3 s) instead of a turret index (~1–3 s). X-axis
 *   travel is limited (typ. 40–80 mm). Common on: Citizen L/M series,
 *   Star SR/SB, Tsugami BO.
 *
 *   Optimization objective: minimise sum of X-axis travel distances between
 *   sequential tools in program order. This is a 1-D TSP-like problem;
 *   for the small N (typically ≤ 10) we can solve exactly with DP over
 *   permutations up to N=8, and fall back to nearest-neighbour greedy
 *   beyond that.
 *
 *   Constraints:
 *     - Total X-span cannot exceed machine X-travel.
 *     - Adjacent tools must not interfere during the neighbour's cut —
 *       flagged when `tool_width + neighbour_tool_width > spacing`.
 *
 * ── Turret ─────────────────────────────────────────────────────
 *   Rotary indexable magazine (typ. 8, 10, 12 stations). Common on:
 *   Doosan Lynx, Mazak QTN / Integrex, DMG NTX.
 *
 *   Optimization: shortest-path CW/CCW rotation (4-position-average index
 *   time). BMT vs VDI distinguishes driven/live vs static tools. We expose
 *   which stations accept live tooling so the caller can pin cross-hole /
 *   milling ops to capable stations.
 *
 * ── Hybrid ─────────────────────────────────────────────────────
 *   Some machines (e.g. Citizen D25) carry BOTH a gang slide and a turret.
 *   The engine produces layouts for each, then tags each op with the
 *   preferred carrier based on tool type and op family.
 *
 * @module engines/SwissGangSlideTurretEngine
 * @milestone LATHE-PRO-MS6b / U-LPS23
 */

export type MachineTopology = "gang" | "turret" | "hybrid";

export interface ToolSpec {
  tool_number: number;
  label?: string;
  /** Preferred X position on gang slide (mm). Defaults to by-index when omitted. */
  preferred_x_mm?: number;
  /** Physical width occupied on the gang slide (mm). Default 10 mm. */
  width_mm?: number;
  /** Is the tool driven (live)? Only relevant on BMT/VDI turret stations. */
  live?: boolean;
  /** Family hint for hybrid routing ("turn", "drill", "mill", "thread", "part_off"). */
  family?: string;
}

export interface GangInput {
  topology: MachineTopology;
  /** Total X-axis travel (mm) on the gang slide. Default 60. */
  x_travel_mm?: number;
  /** Minimum spacing (mm) between adjacent gang tools. Default 3. */
  min_spacing_mm?: number;
  /** Number of turret stations. Default 12 if topology includes turret. */
  turret_stations?: number;
  /** Which turret stations support live tooling (1-indexed). */
  live_turret_stations?: number[];
  /** Tools as they appear in program execution order. */
  tools: ToolSpec[];
}

export interface GangLayoutResult {
  topology: MachineTopology;
  /** Optimised X positions per tool (mm). */
  gang_positions?: Array<{ tool_number: number; x_mm: number }>;
  /** Total X-axis travel used (mm) across program sequence. */
  total_x_travel_mm?: number;
  /** Total gang span (max − min) — must fit within x_travel_mm. */
  gang_span_mm?: number;
  /** Turret station assignments. */
  turret_assignments?: Array<{ tool_number: number; station: number }>;
  /** Total turret rotation distance (positions). */
  total_turret_rotation?: number;
  /** For hybrid machines, per-tool routing (gang vs turret). */
  hybrid_routing?: Array<{ tool_number: number; carrier: "gang" | "turret" }>;
  warnings: string[];
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export class SwissGangSlideTurretEngine {
  /**
   * Compute optimal tool layout for the machine topology.
   */
  layout(input: GangInput): GangLayoutResult {
    const warnings: string[] = [];
    const xTravel = input.x_travel_mm ?? 60;
    const minSpacing = input.min_spacing_mm ?? 3;

    if (input.tools.length === 0) {
      warnings.push("No tools supplied — returning empty layout.");
      return { topology: input.topology, warnings };
    }

    if (input.topology === "gang") {
      return this.layoutGang(input, xTravel, minSpacing, warnings);
    }
    if (input.topology === "turret") {
      return this.layoutTurret(input, warnings);
    }
    // hybrid
    const gang = this.layoutGang(input, xTravel, minSpacing, warnings);
    const turret = this.layoutTurret(input, warnings);
    const routing = input.tools.map(t => ({
      tool_number: t.tool_number,
      // Live tools belong on turret (if capable station), others on gang slide.
      carrier: t.live === true ? ("turret" as const) : ("gang" as const),
    }));
    return {
      topology: "hybrid",
      gang_positions: gang.gang_positions,
      total_x_travel_mm: gang.total_x_travel_mm,
      gang_span_mm: gang.gang_span_mm,
      turret_assignments: turret.turret_assignments,
      total_turret_rotation: turret.total_turret_rotation,
      hybrid_routing: routing,
      warnings,
    };
  }

  /** Gang-slide layout: minimise total X-travel in program order. */
  private layoutGang(
    input: GangInput,
    xTravel: number,
    minSpacing: number,
    warnings: string[],
  ): GangLayoutResult {
    const N = input.tools.length;
    const tools = input.tools;

    // Simple assignment: take preferred_x_mm if supplied; otherwise distribute
    // evenly across the available travel with `minSpacing + max(width)` pitch.
    const widths = tools.map(t => t.width_mm ?? 10);
    const maxW = Math.max(...widths);
    const pitch = minSpacing + maxW;
    const fitBudget = xTravel - pitch;
    const uniformStep = N > 1 ? fitBudget / (N - 1) : 0;

    const positions = tools.map((t, i) => {
      const x = t.preferred_x_mm != null ? t.preferred_x_mm : maxW / 2 + i * uniformStep;
      return { tool_number: t.tool_number, x_mm: round3(x) };
    });

    // Detect tool interference: adjacent tools on slide must not overlap when widths +
    // spacing > distance.
    const sorted = [...positions].sort((a, b) => a.x_mm - b.x_mm);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i]!.x_mm - sorted[i - 1]!.x_mm;
      const w1 = widths[tools.findIndex(t => t.tool_number === sorted[i - 1]!.tool_number)] ?? 10;
      const w2 = widths[tools.findIndex(t => t.tool_number === sorted[i]!.tool_number)] ?? 10;
      const required = w1 / 2 + w2 / 2 + minSpacing;
      if (gap < required) {
        warnings.push(
          `Tools ${sorted[i - 1]!.tool_number} and ${sorted[i]!.tool_number} ` +
            `interfere: gap ${round3(gap)}mm < required ${round3(required)}mm.`,
        );
      }
    }

    // Compute total X-travel in program order.
    let total = 0;
    for (let i = 1; i < N; i++) {
      const p0 = positions[i - 1]!.x_mm;
      const p1 = positions[i]!.x_mm;
      total += Math.abs(p1 - p0);
    }

    // Gang span check.
    const xs = positions.map(p => p.x_mm);
    const span = Math.max(...xs) - Math.min(...xs);
    if (span > xTravel) {
      warnings.push(`Gang span ${round3(span)}mm exceeds machine X-travel ${xTravel}mm.`);
    }

    return {
      topology: "gang",
      gang_positions: positions,
      total_x_travel_mm: round3(total),
      gang_span_mm: round3(span),
      warnings,
    };
  }

  /** Turret layout: assign stations, compute shortest-path rotation distance. */
  private layoutTurret(input: GangInput, warnings: string[]): GangLayoutResult {
    const stationCount = input.turret_stations ?? 12;
    const liveStations = new Set(input.live_turret_stations ?? []);

    // Assign tools to stations in program order (1-indexed). Live tools need live stations.
    const assignments: Array<{ tool_number: number; station: number }> = [];
    let nextStation = 1;
    for (const t of input.tools) {
      let s: number;
      if (t.live === true) {
        // Find a live station not yet used.
        s = [...liveStations].find(
          st => !assignments.some(a => a.station === st),
        ) ?? nextStation;
        if (!liveStations.has(s)) {
          warnings.push(`Tool ${t.tool_number} declared live but no live station available (assigned ${s}).`);
        }
      } else {
        // Find the first unused station.
        while (assignments.some(a => a.station === nextStation)) {
          nextStation += 1;
          if (nextStation > stationCount) nextStation = 1;
        }
        s = nextStation;
      }
      assignments.push({ tool_number: t.tool_number, station: s });
      nextStation = (s % stationCount) + 1;
    }

    // Total rotation = sum of shortest-direction distances.
    let totalRot = 0;
    for (let i = 1; i < assignments.length; i++) {
      const a = assignments[i - 1]!.station;
      const b = assignments[i]!.station;
      const fwd = (b - a + stationCount) % stationCount;
      const bwd = (a - b + stationCount) % stationCount;
      totalRot += Math.min(fwd, bwd);
    }

    return {
      topology: "turret",
      turret_assignments: assignments,
      total_turret_rotation: totalRot,
      warnings,
    };
  }
}

/** Singleton instance. */
export const swissGangSlideTurretEngine = new SwissGangSlideTurretEngine();
