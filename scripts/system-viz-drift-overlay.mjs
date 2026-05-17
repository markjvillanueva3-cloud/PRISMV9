#!/usr/bin/env node
// U-P2-LIVE-DRIFT-OVERLAY (SYSTEM-VIZ-BRAIN-MS0, slot=echo, 2026-05-17)
//
// Pure resolver + CLI that reads `mcp-server/data/state/roadmap-drift-report.json`
// (produced by `scripts/audit-roadmap-drift.mjs` — NOT `detect-system-viz-drift.mjs`,
// which produces a DIFFERENT filesystem-coverage drift report) and
// emits a JSON sidecar `state/shared/system-viz/drift-overlay.json` classifying
// every drifted milestone by severity (critical/warning/info) with a pulse-
// intensity score 0..1 and hex color for the /system-viz red-pulse overlay.
//
// Backend slice of U-P2-LIVE-DRIFT-OVERLAY. The frontend (system-viz/web) reads
// this sidecar and red-pulses milestone nodes where envelope-vs-git differ.
// The 5-min auto-regen cron part of the unit is deferred (operator wires the
// Windows Scheduled Task or /loop cron — script is cron-friendly already).
//
// NO dispatcher action surface (sidecar-only output) — same backend-clean
// pattern as U-P5-FLEET-AWARENESS-PANEL + U-P2-SLOT-OWNERSHIP-OVERLAY.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..");
const DRIFT_REPORT_PATH = path.join(
  REPO_ROOT,
  "mcp-server/data/state/roadmap-drift-report.json",
);
const DEFAULT_OUT_PATH = path.join(
  REPO_ROOT,
  "state/shared/system-viz/drift-overlay.json",
);

// ─── Severity classification constants ──────────────────────────────────────
export const CRITICAL_DELTA_ABS = 5;
export const WARNING_DELTA_ABS = 2;
// Status mismatch is treated as critical regardless of delta magnitude — a
// milestone whose recorded status disagrees with derived status is a
// trust-defeating bug, not a quantitative drift.
export const STATUS_MISMATCH_SEVERITY = "critical";

// Pulse intensity caps: delta=10+ saturates to 1.0; delta=0 → 0.05 (minimum
// visible pulse). Log-scale so small drifts are still noticeable but large
// drifts don't drown out the diff.
export const PULSE_MIN = 0.05;
export const PULSE_MAX = 1.0;
export const PULSE_LOG_CAP = 10;

// Severity → hex color (warm-to-cool: red=critical, orange=warning, yellow=info).
export const SEVERITY_COLORS = {
  critical: "#e53935", // red 600
  warning: "#fb8c00", // orange 600
  info: "#fdd835", // yellow 600
};

// ─── Pure-core resolver ─────────────────────────────────────────────────────
//
// Input shape (matches roadmap-drift-report.json):
//   {generated_at, total_milestones, drifts_found, drifts: [{id, title, track,
//     current_status, proposed_status, recorded_completed, observed_completed,
//     total_units, delta, sample_units}]}
//
// Returns the overlay object (NOT serialized).
export function buildDriftOverlay({
  driftReport = null,
  now = null,
} = {}) {
  const nowMs = typeof now === "number" ? now : Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const report = driftReport && typeof driftReport === "object" ? driftReport : {};
  const drifts = Array.isArray(report.drifts) ? report.drifts : [];

  // Object.create(null) on accumulators — proto-pollution safety
  // (lesson from U-P2-SLOT-OWNERSHIP-OVERLAY scrutiny).
  const driftMilestones = Object.create(null);
  const bySeverity = { critical: 0, warning: 0, info: 0 };
  const byTrack = Object.create(null);
  let malformedDrifts = 0;

  // Stable sort: severity DESC (critical first) → deltaAbs DESC → id ASC
  for (const d of drifts) {
    if (!d || typeof d !== "object" || !d.id || typeof d.id !== "string") {
      malformedDrifts += 1;
      continue;
    }
    const delta = Number.isFinite(d.delta) ? d.delta : 0;
    const deltaAbs = Math.abs(delta);
    const statusMismatch =
      typeof d.current_status === "string" &&
      typeof d.proposed_status === "string" &&
      d.current_status !== d.proposed_status;

    let severity;
    if (statusMismatch) {
      severity = STATUS_MISMATCH_SEVERITY;
    } else if (deltaAbs >= CRITICAL_DELTA_ABS) {
      severity = "critical";
    } else if (deltaAbs >= WARNING_DELTA_ABS) {
      severity = "warning";
    } else {
      severity = "info";
    }

    // Pulse intensity: log-scale on deltaAbs + status-mismatch boost.
    let pulseIntensity;
    if (deltaAbs === 0 && !statusMismatch) {
      pulseIntensity = PULSE_MIN;
    } else {
      const base = statusMismatch ? 0.5 : 0;
      const logComponent = Math.min(deltaAbs, PULSE_LOG_CAP) / PULSE_LOG_CAP;
      pulseIntensity = Math.min(PULSE_MAX, PULSE_MIN + base + logComponent * 0.5);
    }

    const track = typeof d.track === "string" ? d.track : "unknown";

    // direction semantics (per-file scrutiny arm B P2):
    //   delta < 0 → "overclaim" (envelope claims MORE done than git shipped — high-stakes false-positive close-out)
    //   delta > 0 → "underclaim" (envelope claims LESS done than git shipped — silent close-out debt)
    //   delta === 0 → "matched" (counts agree; only statusMismatch can flag this row)
    const direction = delta < 0 ? "overclaim" : delta > 0 ? "underclaim" : "matched";

    driftMilestones[d.id] = {
      id: d.id,
      track,
      title: typeof d.title === "string" ? d.title : "",
      currentStatus: d.current_status || null,
      proposedStatus: d.proposed_status || null,
      statusMismatch,
      delta,
      deltaAbs,
      direction,
      recordedCompleted: Number.isFinite(d.recorded_completed)
        ? d.recorded_completed
        : null,
      observedCompleted: Number.isFinite(d.observed_completed)
        ? d.observed_completed
        : null,
      totalUnits: Number.isFinite(d.total_units) ? d.total_units : null,
      sampleUnits: Array.isArray(d.sample_units) ? d.sample_units.slice() : [],
      severity,
      pulseIntensity,
      color: SEVERITY_COLORS[severity] || SEVERITY_COLORS.info,
    };

    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    byTrack[track] = (byTrack[track] || 0) + 1;
  }

  // Re-emit in stable sort order: severity rank DESC → deltaAbs DESC → id ASC.
  const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 };
  const sortedIds = Object.keys(driftMilestones).sort((a, b) => {
    const A = driftMilestones[a];
    const B = driftMilestones[b];
    const sa = SEVERITY_RANK[A.severity] || 0;
    const sb = SEVERITY_RANK[B.severity] || 0;
    if (sa !== sb) return sb - sa;
    if (A.deltaAbs !== B.deltaAbs) return B.deltaAbs - A.deltaAbs;
    return a.localeCompare(b);
  });

  const orderedMilestones = Object.create(null);
  for (const id of sortedIds) {
    orderedMilestones[id] = driftMilestones[id];
  }

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    sources: {
      driftReport: "mcp-server/data/state/roadmap-drift-report.json",
      sourceGenerator: "scripts/audit-roadmap-drift.mjs",
    },
    thresholds: {
      criticalDeltaAbs: CRITICAL_DELTA_ABS,
      warningDeltaAbs: WARNING_DELTA_ABS,
      statusMismatchSeverity: STATUS_MISMATCH_SEVERITY,
      pulseMin: PULSE_MIN,
      pulseMax: PULSE_MAX,
      pulseLogCap: PULSE_LOG_CAP,
    },
    palette: { ...SEVERITY_COLORS },
    sourceReportGeneratedAt: report.generated_at || null,
    driftMilestones: orderedMilestones,
    summary: {
      totalMilestones: Number.isFinite(report.total_milestones)
        ? report.total_milestones
        : null,
      driftsFound: Number.isFinite(report.drifts_found)
        ? report.drifts_found
        : sortedIds.length,
      driftClassified: sortedIds.length,
      malformedDrifts,
      bySeverity,
      byTrack,
      byDirection: {
        overclaim: Object.values(driftMilestones).filter((m) => m.direction === "overclaim").length,
        underclaim: Object.values(driftMilestones).filter((m) => m.direction === "underclaim").length,
        matched: Object.values(driftMilestones).filter((m) => m.direction === "matched").length,
      },
      // suspectedContractDrift: upstream reports drifts but resolver classified
      // ZERO critical AND ZERO warning → likely a field-rename in audit-roadmap-drift.mjs
      // that silently bucketed everything into info. Per-file scrutiny arm B P1.
      suspectedContractDrift:
        sortedIds.length > 0 &&
        bySeverity.critical === 0 &&
        bySeverity.warning === 0,
    },
    advisory: {
      mustHumanVerify: true,
      caveat:
        "Severity is heuristic: statusMismatch → critical; |delta|≥5 → critical; |delta|≥2 → warning; else → info. Pulse intensity uses log-scale on deltaAbs with optional status-mismatch boost. Upstream source-of-truth is `scripts/audit-roadmap-drift.mjs` (NOT detect-system-viz-drift.mjs — different domain). If `drifts_found` ≠ `driftClassified`, malformedDrifts records the gap. `suspectedContractDrift:true` fires when upstream reports drifts but the overlay finds zero critical/warning severities — heuristic for schema-rename bugs that silently classify everything as info (Karpathy R12 fail-loud).",
    },
  };
}

// ─── I/O wrappers ───────────────────────────────────────────────────────────
export function readDriftReport(filePath = DRIFT_REPORT_PATH) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const txt = fs.readFileSync(filePath, "utf8");
    return JSON.parse(txt);
  } catch (e) {
    process.stderr.write(
      `[system-viz-drift-overlay] readDriftReport failed: ${e && e.message}\n`,
    );
    return null;
  }
}

export function writeOverlay(outPath, overlay) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // Atomic write — tmp + rename (per U-P2-SLOT-OWNERSHIP-OVERLAY lesson).
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(overlay, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, outPath);
  return outPath;
}

// ─── Arg parsing ────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const out = {
    outPath: DEFAULT_OUT_PATH,
    json: false,
    frozenTime: null,
    driftReportPath: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.outPath = argv[++i];
    else if (a === "--json") out.json = true;
    else if (a === "--frozen-time") out.frozenTime = argv[++i];
    else if (a === "--drift-report") out.driftReportPath = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const HELP = `system-viz-drift-overlay — emit drift overlay JSON for system-viz
  --out <path>           output path (default: state/shared/system-viz/drift-overlay.json)
  --json                 print to stdout, do not write file
  --frozen-time <ISO>    deterministic timestamp for tests
  --drift-report <path>  source path (default: mcp-server/data/state/roadmap-drift-report.json)
  --help                 show this

Severity classification:
  • statusMismatch (current_status ≠ proposed_status) → critical
  • |delta| ≥ 5 → critical
  • |delta| ≥ 2 → warning
  • else → info
`;

// ─── CLI ────────────────────────────────────────────────────────────────────
export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }
  const driftReport = readDriftReport(args.driftReportPath || DRIFT_REPORT_PATH);
  const nowMs = args.frozenTime ? Date.parse(args.frozenTime) : Date.now();
  const overlay = buildDriftOverlay({
    driftReport,
    now: Number.isFinite(nowMs) ? nowMs : Date.now(),
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(overlay, null, 2) + "\n");
    return 0;
  }

  writeOverlay(args.outPath, overlay);
  const s = overlay.summary;
  process.stdout.write(
    `drift-overlay written → ${path.relative(REPO_ROOT, args.outPath)}\n` +
      `  drifts=${s.driftClassified}/${s.driftsFound} ` +
      `critical=${s.bySeverity.critical} warning=${s.bySeverity.warning} info=${s.bySeverity.info}\n` +
      `  totalMilestones=${s.totalMilestones} malformed=${s.malformedDrifts}\n`,
  );
  return 0;
}

const _invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();
if (_invokedAsCli) {
  void main().then((code) => process.exit(code || 0));
}
