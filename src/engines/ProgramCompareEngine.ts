/**
 * ProgramCompareEngine — CK-MS12 U02
 *
 * Diff two G-code programs with physics overlay.
 *
 * Features:
 *   compare(program_a, program_b)              — full comparison report
 *   diffGCode(gcode_a, gcode_b)                — line-by-line diff
 *   comparePhysics(program_a, program_b)       — cutting parameters comparison
 *   compareCycleTime(program_a, program_b)     — time comparison per operation
 *   compareToolUsage(program_a, program_b)     — tool list differences
 *   generateReport(comparison)                 — formatted text report
 */

import { log } from "../utils/Logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DiffLineType = "equal" | "added" | "removed" | "changed";

export interface DiffLine {
  type:    DiffLineType;
  line_a?: string;
  line_b?: string;
  line_no_a?: number;
  line_no_b?: number;
}

export interface ToolEntry {
  number: number;
  description?: string;
  diameter_mm?: number;
  spindle_rpms: number[];
  feed_rates:   number[];
}

export interface PhysicsComparison {
  program_a: PhysicsSnapshot;
  program_b: PhysicsSnapshot;
  delta: {
    max_spindle_rpm:  number;
    max_feed_mmmin:   number;
    est_mrr_pct:      number;   // % difference in estimated MRR
    est_force_pct:    number;   // % difference in estimated cutting force
  };
}

export interface PhysicsSnapshot {
  max_spindle_rpm: number;
  min_spindle_rpm: number;
  max_feed_mmmin:  number;
  min_feed_mmmin:  number;
  est_mrr_cm3min:  number;
  est_force_n:     number;
  rapid_distance_mm: number;
  cut_distance_mm:   number;
}

export interface CycleTimeComparison {
  program_a_s: number;
  program_b_s: number;
  delta_s:     number;
  delta_pct:   number;
  breakdown_a: CycleBreakdown;
  breakdown_b: CycleBreakdown;
}

export interface CycleBreakdown {
  rapid_s:  number;
  feed_s:   number;
  dwell_s:  number;
  total_s:  number;
}

export interface ToolUsageComparison {
  only_in_a:    ToolEntry[];
  only_in_b:    ToolEntry[];
  in_both:      ToolEntry[];
  sf_changes:   Array<{ tool_no: number; rpm_a: number; rpm_b: number; feed_a: number; feed_b: number }>;
}

export interface SafetyDiff {
  issues_a: string[];
  issues_b: string[];
  improvements: string[];  // issues in A that are fixed in B
  regressions: string[];   // issues in B that were not in A
}

export interface FullComparison {
  summary: {
    lines_a:      number;
    lines_b:      number;
    blocks_a:     number;
    blocks_b:     number;
    diff_count:   number;
    similarity_pct: number;
  };
  diff:       DiffLine[];
  physics:    PhysicsComparison;
  cycle_time: CycleTimeComparison;
  tools:      ToolUsageComparison;
  safety:     SafetyDiff;
  dialect_notes: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalize a G-code line: strip comments, block numbers, collapse whitespace. */
function normalizeLine(line: string): string {
  return line
    .replace(/\(.*?\)/g, "")          // remove () comments
    .replace(/;.*$/,      "")          // remove ; comments
    .replace(/^N\d+\s*/i, "")          // strip block numbers
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Extract numeric value after a letter address (e.g. "S" → spindle RPM). */
function extractValues(lines: string[], addr: string): number[] {
  const re  = new RegExp(`${addr}(-?\\d+(?:\\.\\d+)?)`, "gi");
  const out: number[] = [];
  for (const line of lines) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      out.push(parseFloat(m[1]));
    }
  }
  return out;
}

/** Estimate XYZ cut/rapid distance from a list of G-code lines. */
function estimateDistance(lines: string[], modalCode: "G0" | "G1"): number {
  let dist = 0;
  let cx = 0, cy = 0, cz = 0;
  let activeModal = "G0";

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (/G0[^0-9]/.test(upper)) activeModal = "G0";
    if (/G1[^0-9]/.test(upper)) activeModal = "G1";

    if (activeModal !== modalCode) continue;

    const xM = /X(-?\d+(?:\.\d+)?)/.exec(upper);
    const yM = /Y(-?\d+(?:\.\d+)?)/.exec(upper);
    const zM = /Z(-?\d+(?:\.\d+)?)/.exec(upper);
    if (!xM && !yM && !zM) continue;

    const nx = xM ? parseFloat(xM[1]) : cx;
    const ny = yM ? parseFloat(yM[1]) : cy;
    const nz = zM ? parseFloat(zM[1]) : cz;
    dist += Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2 + (nz - cz) ** 2);
    cx = nx; cy = ny; cz = nz;
  }
  return dist;
}

/** Simple LCS-based line diff between two string arrays. */
function lcsDiff(a: string[], b: string[]): DiffLine[] {
  const m = a.length;
  const n = b.length;

  // Build LCS table (capped at 500×500 for performance)
  const maxLen = 500;
  const am = Math.min(m, maxLen);
  const bm = Math.min(n, maxLen);

  const dp: number[][] = Array.from({ length: am + 1 }, () => new Array(bm + 1).fill(0));
  for (let i = 1; i <= am; i++) {
    for (let j = 1; j <= bm; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack
  const result: DiffLine[] = [];
  let i = am, j = bm;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: "equal", line_a: a[i - 1], line_b: b[j - 1], line_no_a: i, line_no_b: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "added", line_b: b[j - 1], line_no_b: j });
      j--;
    } else {
      result.push({ type: "removed", line_a: a[i - 1], line_no_a: i });
      i--;
    }
  }

  // For lines beyond the cap, mark as added/removed
  for (let k = maxLen; k < m; k++) result.push({ type: "removed", line_a: a[k], line_no_a: k + 1 });
  for (let k = maxLen; k < n; k++) result.push({ type: "added",   line_b: b[k], line_no_b: k + 1 });

  return result.reverse();
}

/** Extract tool entries from G-code lines. */
function extractTools(lines: string[]): ToolEntry[] {
  const tools = new Map<number, ToolEntry>();
  let activeTool = 0;

  for (const line of lines) {
    const upper = line.toUpperCase();

    // T1 M6 or T01 M06
    const tM = /T(\d+)/.exec(upper);
    if (tM && /M0?6/.test(upper)) {
      activeTool = parseInt(tM[1]);
      if (!tools.has(activeTool)) {
        tools.set(activeTool, { number: activeTool, spindle_rpms: [], feed_rates: [] });
      }
    }

    if (activeTool === 0) continue;
    const entry = tools.get(activeTool)!;

    const sM = /S(\d+(?:\.\d+)?)/.exec(upper);
    if (sM) {
      const rpm = parseFloat(sM[1]);
      if (!entry.spindle_rpms.includes(rpm)) entry.spindle_rpms.push(rpm);
    }

    const fM = /F(\d+(?:\.\d+)?)/.exec(upper);
    if (fM) {
      const f = parseFloat(fM[1]);
      if (!entry.feed_rates.includes(f)) entry.feed_rates.push(f);
    }
  }

  return Array.from(tools.values()).sort((a, b) => a.number - b.number);
}

/** Estimate cycle time in seconds from G-code lines. */
function estimateCycleTime(lines: string[]): CycleBreakdown {
  let rapidDist  = 0;
  let feedDist   = 0;
  let totalDwell = 0;
  let currentFeed = 500; // mm/min default
  let cx = 0, cy = 0, cz = 0;
  let activeModal = "G0";
  const RAPID_SPEED_MM_MIN = 15000;

  for (const line of lines) {
    const upper = line.toUpperCase();

    // Modal G codes
    if (/G0[^0-9]/.test(upper)) activeModal = "G0";
    if (/G1[^0-9]/.test(upper)) activeModal = "G1";
    if (/G2[^0-9]/.test(upper)) activeModal = "G2";
    if (/G3[^0-9]/.test(upper)) activeModal = "G3";

    // Feed rate
    const fM = /F(\d+(?:\.\d+)?)/.exec(upper);
    if (fM) currentFeed = parseFloat(fM[1]);

    // Dwell G4
    if (/G4/.test(upper)) {
      const pM = /P(\d+(?:\.\d+)?)/.exec(upper);
      if (pM) totalDwell += parseFloat(pM[1]) / 1000; // P in ms
    }

    // Movement
    const xM = /X(-?\d+(?:\.\d+)?)/.exec(upper);
    const yM = /Y(-?\d+(?:\.\d+)?)/.exec(upper);
    const zM = /Z(-?\d+(?:\.\d+)?)/.exec(upper);
    if (!xM && !yM && !zM) continue;

    const nx = xM ? parseFloat(xM[1]) : cx;
    const ny = yM ? parseFloat(yM[1]) : cy;
    const nz = zM ? parseFloat(zM[1]) : cz;
    const d  = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2 + (nz - cz) ** 2);

    if (activeModal === "G0") rapidDist += d;
    else feedDist += d;

    cx = nx; cy = ny; cz = nz;
  }

  const rapid_s = rapidDist / (RAPID_SPEED_MM_MIN / 60);
  const feed_s  = currentFeed > 0 ? feedDist / (currentFeed / 60) : 0;
  return { rapid_s, feed_s, dwell_s: totalDwell, total_s: rapid_s + feed_s + totalDwell };
}

/** Safety checks on G-code lines. */
function safetyCheck(lines: string[]): string[] {
  const issues: string[] = [];
  const upper = lines.map(l => l.toUpperCase());

  if (!upper.some(l => /G28|G30|G53/.test(l)))  issues.push("No home/reference return found");
  if (!upper.some(l => /M8|M7|M9/.test(l)))     issues.push("No coolant command found");
  if (!upper.some(l => /G17|G18|G19/.test(l)))  issues.push("No plane selection (G17/G18/G19)");
  if (!upper.some(l => /G54|G55|G56/.test(l)))  issues.push("No work offset (G54-G59) found");
  if (!upper.some(l => /G49/.test(l)))           issues.push("No tool length cancel (G49) found");
  if (!upper.some(l => /G40/.test(l)))           issues.push("No cutter comp cancel (G40) found");
  if (!upper.some(l => /M30|M2/.test(l)))        issues.push("No program end (M30/M2) found");

  // Check for missing spindle before feedrate moves
  let hasSpindle = false;
  for (const l of upper) {
    if (/M3|M4/.test(l)) hasSpindle = true;
    if (!hasSpindle && /G1|G2|G3/.test(l)) {
      issues.push("Feed move without prior spindle start");
      break;
    }
  }

  return issues;
}

// ── ProgramCompareEngine ─────────────────────────────────────────────────────

export class ProgramCompareEngine {
  readonly name    = "ProgramCompareEngine";
  readonly version = "1.0.0";

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Full comparison of two G-code programs.
   */
  compare(program_a: string, program_b: string): FullComparison {
    log.debug(`[ProgramCompareEngine] compare: ${program_a.length}B vs ${program_b.length}B`);

    const linesA = program_a.split(/\r?\n/).filter(l => l.trim());
    const linesB = program_b.split(/\r?\n/).filter(l => l.trim());

    const normA  = linesA.map(normalizeLine).filter(l => l);
    const normB  = linesB.map(normalizeLine).filter(l => l);

    const diff       = this.diffGCode(program_a, program_b);
    const changeCount = diff.filter(d => d.type !== "equal").length;
    const maxLines   = Math.max(normA.length, normB.length);
    const similarity = maxLines > 0 ? Math.round(((maxLines - changeCount) / maxLines) * 100) : 100;

    return {
      summary: {
        lines_a:  linesA.length,
        lines_b:  linesB.length,
        blocks_a: normA.length,
        blocks_b: normB.length,
        diff_count:     changeCount,
        similarity_pct: Math.max(0, similarity),
      },
      diff,
      physics:    this.comparePhysics(program_a, program_b),
      cycle_time: this.compareCycleTime(program_a, program_b),
      tools:      this.compareToolUsage(program_a, program_b),
      safety:     this._compareSafety(linesA, linesB),
      dialect_notes: this._detectDialectDiffs(normA, normB),
    };
  }

  /**
   * Line-by-line diff using LCS, ignoring comments, whitespace, block numbers.
   */
  diffGCode(gcode_a: string, gcode_b: string): DiffLine[] {
    const normA = gcode_a.split(/\r?\n/).map(normalizeLine).filter(l => l);
    const normB = gcode_b.split(/\r?\n/).map(normalizeLine).filter(l => l);
    return lcsDiff(normA, normB);
  }

  /**
   * Compare cutting physics parameters between programs.
   */
  comparePhysics(program_a: string, program_b: string): PhysicsComparison {
    const lA = program_a.split(/\r?\n/);
    const lB = program_b.split(/\r?\n/);

    const snap = (lines: string[]): PhysicsSnapshot => {
      const rpms  = extractValues(lines, "S");
      const feeds = extractValues(lines, "F");
      const maxRpm  = rpms.length  ? Math.max(...rpms)  : 0;
      const minRpm  = rpms.length  ? Math.min(...rpms)  : 0;
      const maxFeed = feeds.length ? Math.max(...feeds) : 0;
      const minFeed = feeds.length ? Math.min(...feeds) : 0;

      // Rough MRR: ap=1mm, ae=50% Dc, Dc=10mm assumed → MRR ≈ feed*ap*ae
      const ap = 1; const ae = 5; // mm
      const estMRR  = (maxFeed * ap * ae) / 1000; // cm³/min
      // Force: Kienzle approx kc1.1=1500 MPa, h=0.1mm, b=1mm
      const estForce = 1500 * 0.1 * 1; // N

      return {
        max_spindle_rpm:  maxRpm,
        min_spindle_rpm:  minRpm,
        max_feed_mmmin:   maxFeed,
        min_feed_mmmin:   minFeed,
        est_mrr_cm3min:   Math.round(estMRR * 100) / 100,
        est_force_n:      estForce,
        rapid_distance_mm: Math.round(estimateDistance(lines, "G0")),
        cut_distance_mm:   Math.round(estimateDistance(lines, "G1")),
      };
    };

    const a = snap(lA);
    const b = snap(lB);

    const pctDiff = (va: number, vb: number) =>
      va > 0 ? Math.round(((vb - va) / va) * 100) : 0;

    return {
      program_a: a,
      program_b: b,
      delta: {
        max_spindle_rpm: b.max_spindle_rpm - a.max_spindle_rpm,
        max_feed_mmmin:  b.max_feed_mmmin  - a.max_feed_mmmin,
        est_mrr_pct:     pctDiff(a.est_mrr_cm3min, b.est_mrr_cm3min),
        est_force_pct:   pctDiff(a.est_force_n,    b.est_force_n),
      },
    };
  }

  /**
   * Compare cycle time estimates.
   */
  compareCycleTime(program_a: string, program_b: string): CycleTimeComparison {
    const lA = program_a.split(/\r?\n/);
    const lB = program_b.split(/\r?\n/);

    const brA = estimateCycleTime(lA);
    const brB = estimateCycleTime(lB);
    const delta = brB.total_s - brA.total_s;

    return {
      program_a_s: Math.round(brA.total_s),
      program_b_s: Math.round(brB.total_s),
      delta_s:     Math.round(delta),
      delta_pct:   brA.total_s > 0 ? Math.round((delta / brA.total_s) * 100) : 0,
      breakdown_a: { ...brA, rapid_s: Math.round(brA.rapid_s), feed_s: Math.round(brA.feed_s), total_s: Math.round(brA.total_s) },
      breakdown_b: { ...brB, rapid_s: Math.round(brB.rapid_s), feed_s: Math.round(brB.feed_s), total_s: Math.round(brB.total_s) },
    };
  }

  /**
   * Compare tool usage between programs.
   */
  compareToolUsage(program_a: string, program_b: string): ToolUsageComparison {
    const toolsA = extractTools(program_a.split(/\r?\n/));
    const toolsB = extractTools(program_b.split(/\r?\n/));

    const numA   = new Set(toolsA.map(t => t.number));
    const numB   = new Set(toolsB.map(t => t.number));

    const only_in_a = toolsA.filter(t => !numB.has(t.number));
    const only_in_b = toolsB.filter(t => !numA.has(t.number));
    const in_both   = toolsA.filter(t =>  numB.has(t.number));

    const sf_changes = in_both.flatMap(ta => {
      const tb  = toolsB.find(t => t.number === ta.number)!;
      const changes: ToolUsageComparison["sf_changes"] = [];
      const rpmA  = ta.spindle_rpms[0]  ?? 0;
      const rpmB  = tb.spindle_rpms[0]  ?? 0;
      const feedA = ta.feed_rates[0]    ?? 0;
      const feedB = tb.feed_rates[0]    ?? 0;
      if (rpmA !== rpmB || feedA !== feedB) {
        changes.push({ tool_no: ta.number, rpm_a: rpmA, rpm_b: rpmB, feed_a: feedA, feed_b: feedB });
      }
      return changes;
    });

    return { only_in_a, only_in_b, in_both, sf_changes };
  }

  /**
   * Generate a human-readable text report from a FullComparison.
   */
  generateReport(comparison: FullComparison): string {
    const { summary, physics, cycle_time, tools, safety } = comparison;
    const lines: string[] = [];

    lines.push("=== G-CODE COMPARISON REPORT ===");
    lines.push(`Similarity: ${summary.similarity_pct}%  |  Differences: ${summary.diff_count} blocks`);
    lines.push(`Program A: ${summary.lines_a} lines / ${summary.blocks_a} blocks`);
    lines.push(`Program B: ${summary.lines_b} lines / ${summary.blocks_b} blocks`);
    lines.push("");

    lines.push("--- CYCLE TIME ---");
    const ctSign = cycle_time.delta_s >= 0 ? "+" : "";
    lines.push(`A: ${this._fmtTime(cycle_time.program_a_s)}  B: ${this._fmtTime(cycle_time.program_b_s)}  Delta: ${ctSign}${cycle_time.delta_s}s (${ctSign}${cycle_time.delta_pct}%)`);
    lines.push(`  A → Rapid: ${this._fmtTime(cycle_time.breakdown_a.rapid_s)}  Feed: ${this._fmtTime(cycle_time.breakdown_a.feed_s)}`);
    lines.push(`  B → Rapid: ${this._fmtTime(cycle_time.breakdown_b.rapid_s)}  Feed: ${this._fmtTime(cycle_time.breakdown_b.feed_s)}`);
    lines.push("");

    lines.push("--- CUTTING PHYSICS ---");
    const pa = physics.program_a;
    const pb = physics.program_b;
    lines.push(`Spindle RPM  A: ${pa.max_spindle_rpm}  B: ${pb.max_spindle_rpm}  Δ: ${physics.delta.max_spindle_rpm >= 0 ? "+" : ""}${physics.delta.max_spindle_rpm}`);
    lines.push(`Feed mm/min  A: ${pa.max_feed_mmmin}  B: ${pb.max_feed_mmmin}  Δ: ${physics.delta.max_feed_mmmin >= 0 ? "+" : ""}${physics.delta.max_feed_mmmin}`);
    lines.push(`Cut dist mm  A: ${pa.cut_distance_mm}  B: ${pb.cut_distance_mm}`);
    lines.push(`Est. MRR     Δ: ${physics.delta.est_mrr_pct >= 0 ? "+" : ""}${physics.delta.est_mrr_pct}%`);
    lines.push("");

    lines.push("--- TOOLS ---");
    if (tools.only_in_a.length)  lines.push(`  Only in A: T${tools.only_in_a.map(t => t.number).join(", T")}`);
    if (tools.only_in_b.length)  lines.push(`  Only in B: T${tools.only_in_b.map(t => t.number).join(", T")}`);
    if (tools.sf_changes.length) {
      lines.push("  S/F changes:");
      for (const c of tools.sf_changes) {
        lines.push(`    T${c.tool_no}: RPM ${c.rpm_a}→${c.rpm_b}  Feed ${c.feed_a}→${c.feed_b}`);
      }
    }
    if (!tools.only_in_a.length && !tools.only_in_b.length && !tools.sf_changes.length) {
      lines.push("  No tool differences.");
    }
    lines.push("");

    lines.push("--- SAFETY ---");
    if (safety.regressions.length)   lines.push(`  Regressions in B: ${safety.regressions.join("; ")}`);
    if (safety.improvements.length)  lines.push(`  Improvements in B: ${safety.improvements.join("; ")}`);
    if (!safety.regressions.length && !safety.improvements.length) lines.push("  No safety changes.");

    if (comparison.dialect_notes.length) {
      lines.push("");
      lines.push("--- DIALECT NOTES ---");
      for (const n of comparison.dialect_notes) lines.push(`  ${n}`);
    }

    return lines.join("\n");
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private _compareSafety(linesA: string[], linesB: string[]): SafetyDiff {
    const issA = safetyCheck(linesA);
    const issB = safetyCheck(linesB);
    const setA = new Set(issA);
    const setB = new Set(issB);
    return {
      issues_a:     issA,
      issues_b:     issB,
      improvements: issA.filter(i => !setB.has(i)),
      regressions:  issB.filter(i => !setA.has(i)),
    };
  }

  private _detectDialectDiffs(normA: string[], normB: string[]): string[] {
    const notes: string[] = [];
    const hasA = (pat: RegExp) => normA.some(l => pat.test(l));
    const hasB = (pat: RegExp) => normB.some(l => pat.test(l));

    if (hasA(/G41|G42/) && !hasB(/G41|G42/))
      notes.push("Program A uses cutter compensation (G41/G42); B does not");
    if (!hasA(/G41|G42/) && hasB(/G41|G42/))
      notes.push("Program B adds cutter compensation (G41/G42)");
    if (hasA(/G91/) && !hasB(/G91/))
      notes.push("Program A uses incremental mode (G91); B uses absolute");
    if (hasA(/G05\.1|CYCLE832|G187/)  && !hasB(/G05\.1|CYCLE832|G187/))
      notes.push("Program A uses HSM/AI contour; B does not");
    if (!hasA(/G05\.1|CYCLE832|G187/) && hasB(/G05\.1|CYCLE832|G187/))
      notes.push("Program B adds HSM/AI contour mode");
    if (hasA(/G96/) && !hasB(/G96/))
      notes.push("Program A uses CSS (G96); B uses constant RPM");
    if (hasA(/CYCLE800|PLANE/) && !hasB(/CYCLE800|PLANE/))
      notes.push("Program A uses multi-axis plane cycle; B does not");

    return notes;
  }

  private _fmtTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m${s}s`;
  }
}

export const programCompareEngine = new ProgramCompareEngine();
