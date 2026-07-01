// cimco-control-map.mjs — PRISM ↔ CIMCO Edit 2026 control map (API-first, UIA-fallback)
//
// "Navigate the full map of CIMCO to actively control it without screenshots."
// Mirrors the proven WinMax driver pattern (scripts/winmax-ui-map.mjs): a screen/command
// FSM + path resolver, but API-FIRST — CIMCO exposes real channels (CLI file-open, DNC-Max
// API, bundled MariaDB, JSON machine defs) so we prefer those over UI-automation. UIA is the
// fallback ONLY for the GUI-only Machine-Simulation prove-out + Simulation-Report read.
//
// Evidence base (verified from the LOCAL install copy, 2026-06-02, slot echo):
//   - Install: H:/prism/resources/cimco-2026/CIMCOEdit/  (CIMCO Edit 2026.01.10)
//   - CIMCOSimulation.exe @ CIMCOEdit/Dll/ — parses a command line (CommandLineToArgvW) but
//     exposes NO discoverable public headless sim+report-export flags, and NO COM/OLE
//     automation server (no IDispatch/TypeLib in an ASCII string scan — UTF-16 caveat).
//   - Bundled help (edit_us.chm): Machine Simulation is GUI-driven (menu Ctrl+Shift+P /
//     "Backplot File" from disk); the Simulation Report is an on-screen docking-pane tab with
//     columns LINE / TYPE / DESCRIPTION / ACTION, plus collisions + limits when the Machine
//     Simulation add-on is licensed.
//   - Machine defs = JSON (.mcfg); posts = JS (.js); tool libs = .tmlib; controller defs =
//     .eRPost (binary/compiled). NC-Base/DNC-Max/MDC-Max datastore = bundled MariaDB.
//
// Confidence labels are honest: CONFIRMED (verified on disk/docs), LIKELY (standard behavior,
// needs a live-app smoke test), UNVERIFIED (needs the running licensed app or vendor API doc).
//
// Wiki: [[cimco-verification-simulation-integration]] · tribal: [[cimco-verification-tribal]]
// Memory: reference_cimco_install_corpus_2026_06_02

import { readFileSync } from "node:fs";

/** Control channels, ranked most→least robust (R5: deterministic API beats screen automation). */
export const CHANNELS = Object.freeze({
  FILE: "file", // read/write CIMCO file formats directly (no CIMCO process) — most robust
  SQL: "sql", // query the bundled MariaDB datastore (NC-Base/DNC-Max/MDC-Max)
  DNC_API: "dnc-api", // DNC-Max API / DNCMaxCtrl.exe / TCP
  CLI: "cli", // launch a CIMCO exe with command-line args
  UIA: "uia", // UI-Automation of the GUI (no screenshots — read element text) — fallback
});

const CONF = Object.freeze({ CONFIRMED: "CONFIRMED", LIKELY: "LIKELY", UNVERIFIED: "UNVERIFIED" });

const CIMCO_ROOT = "H:/prism/resources/cimco-2026/CIMCOEdit";

/**
 * COMMAND_CATALOG — the actionable map of how PRISM drives each CIMCO capability.
 * Each entry: { action, channel, invocation, confidence, evidence, fallback }.
 * `invocation` is a human/agent-readable recipe (the literal CLI/SQL/UIA step), NOT executed here.
 */
export const COMMAND_CATALOG = Object.freeze([
  {
    action: "read_machine_def",
    channel: CHANNELS.FILE,
    invocation: "readMachineDef('<path>.mcfg') — parse the JSON machine definition directly",
    confidence: CONF.CONFIRMED,
    evidence: ".mcfg is plain JSON (MachineDefinition{Header,MachinePartGroups,Collision,Revolver})",
    fallback: null,
  },
  {
    action: "read_tool_lib",
    channel: CHANNELS.FILE,
    invocation: `read CIMCOEdit/ToolLibs/*.tmlib`,
    confidence: CONF.LIKELY,
    evidence: ".tmlib tool/holder libraries present (format not yet decoded — verify before parse)",
    fallback: null,
  },
  {
    action: "read_post",
    channel: CHANNELS.FILE,
    invocation: `read/author CIMCOEdit/Posts/*.js (globals + PostInfo{type} + field tables)`,
    confidence: CONF.CONFIRMED,
    evidence: ".js posts are readable, documented JavaScript",
    fallback: null,
  },
  {
    action: "open_nc",
    channel: CHANNELS.CLI,
    invocation: `"${CIMCO_ROOT}/CIMCOEdit.exe" "<file>.nc"`,
    confidence: CONF.LIKELY,
    evidence: "standard editor opens a file passed as arg; CIMCOEdit.exe parses a command line",
    fallback: { channel: CHANNELS.UIA, invocation: "UIA: File→Open dialog" },
  },
  {
    action: "backplot",
    channel: CHANNELS.UIA,
    invocation: "launch editor with NC → UIA: Backplot (Ctrl+Shift+P) OR 'Backplot File' from disk",
    confidence: CONF.LIKELY,
    evidence: "help documents menu/keyboard invocation; no headless backplot CLI found",
    fallback: null,
  },
  {
    action: "machine_simulation",
    channel: CHANNELS.UIA,
    invocation: "UIA: Backplot menu → 'Machine Simulation' (requires Machine Simulation license)",
    confidence: CONF.UNVERIFIED,
    evidence: "GUI-only per help; CIMCOSimulation.exe@Dll/ parses a cmdline but no public sim CLI found (UTF-16 scan pending)",
    fallback: { channel: CHANNELS.CLI, invocation: "probe CIMCOSimulation.exe args against the running licensed app" },
  },
  {
    action: "read_simulation_report",
    channel: CHANNELS.UIA,
    invocation: "UIA: read Simulation Report docking-pane rows (LINE/TYPE/DESCRIPTION/ACTION + collisions/limits) → parseSimulationReport()",
    confidence: CONF.LIKELY,
    evidence: "Simulation Report is an on-screen docking-pane tab; rows are UIA-readable text (no screenshot)",
    fallback: null,
  },
  {
    action: "file_compare",
    channel: CHANNELS.UIA,
    invocation: "UIA: File Compare (ignores block renumber + spacing) — for golden byte-check normalize whitespace yourself",
    confidence: CONF.LIKELY,
    evidence: "File Compare documented; lenient on trivial diffs — do strict byte-diff in PRISM for golden equivalence",
    fallback: { channel: CHANNELS.FILE, invocation: "PRISM-side normalized byte-diff vs golden NC" },
  },
  {
    action: "drip_feed_dnc",
    channel: CHANNELS.DNC_API,
    invocation: "DNCMaxCtrl.exe / DNC-Max API / TCP — send verified NC to a machine port",
    confidence: CONF.UNVERIFIED,
    evidence: "DNC-Max ships DNCMaxCtrl.exe + API (docs on request); not exercised here",
    fallback: null,
  },
  {
    action: "query_ncbase_db",
    channel: CHANNELS.SQL,
    invocation: "connect to the bundled MariaDB (mariadb.exe) — NC-Base/DNC-Max/MDC-Max datastore",
    confidence: CONF.UNVERIFIED,
    evidence: "mariadb.exe + mariadb-dump.exe bundled; schema/credentials not yet enumerated",
    fallback: { channel: CHANNELS.DNC_API, invocation: "DNC-Max API for program management" },
  },
]);

const _CATALOG_BY_ACTION = new Map(COMMAND_CATALOG.map((e) => [e.action, e]));

/** Resolve the control path for an action. Returns the catalog entry or null. */
export function resolveControlPath(action) {
  return _CATALOG_BY_ACTION.get(action) || null;
}

/** All actions whose primary channel is UIA (the genuine "needs the GUI" set). */
export function uiaOnlyActions() {
  return COMMAND_CATALOG.filter((e) => e.channel === CHANNELS.UIA).map((e) => e.action);
}

// ─── Units inference (U-CIMCO-MCFG-UNITS-INFER) ──────────────────────────────
// 44/86 vendor .mcfg omit `Header.Unit` (Haas/Doosan/DMG Mori/Hermle/Matsuura/Mikron/Quaser/...).
// CLAUDE.md §SAFETY RAILS forbids a blind units default — a 25.4× scale error is catastrophic — but
// the JM-inch default is the WRONG default here: the MACHINE GEOMETRY in a .mcfg is authored in mm
// (CIMCO library convention), independent of the inch/mm of the NC PROGRAM (carried by G20/G21).
// Defaulting the .mcfg to inch would mislabel a 508 mm Haas VF-1 travel as 508 inch = a 25.4× over-
// scaled envelope (the exact trap units-guard exists to stop). So we INFER from kinematic magnitude.
//
// Empirical basis (verified across the full 86-file CIMCO machine library, slot:echo 2026-06-03):
//   declared-Metric configs:  max linear travel ∈ [635, 2900]  (min 635)
//   undeclared vendor configs: max linear travel ∈ [305, 1626]  (min 305)
//   ZERO configs land in (0, 50].  An inch machine's linear travel rarely exceeds ~50"; a metric
//   VMC's smallest travel is ~250 mm. So max-linear-range > 50 ⇒ mm with a wide safety margin.
// We NEVER infer "inch" from magnitude — a SMALL range is ambiguous (inch vs micro-metric), so
// inference is mm-or-nothing (fail-safe: an unprovable file stays UNRESOLVED, never a false inch).
export const MM_INFERENCE_FLOOR = 50; // max linear range must EXCEED this to infer mm
export const MM_INFERENCE_HIGH_CONF = 150; // above this an inch machine is implausible → high confidence

/** Walk a CIMCO nested-axis chain (parent carries the next stage via `.Axis`) into a flat list. */
export function flattenAxisChain(axisObj, out = []) {
  let a = axisObj;
  let guard = 0;
  while (a && typeof a === "object" && guard++ < 64) {
    out.push(a);
    a = a.Axis;
  }
  return out;
}

/**
 * Max |Max−Min| across all TRANSLATION (linear) axes in the machine — the magnitude used for unit
 * inference. Rotary axes are in DEGREES (not a length scale) and are EXCLUDED. `topAxes` is the array
 * of top-of-chain axis objects (each may nest more via `.Axis`). Returns null if no usable linear axis.
 * @param {Array<object|string|null>} topAxes
 * @returns {number|null}
 */
export function maxLinearAxisRange(topAxes) {
  let mx = null;
  for (const top of Array.isArray(topAxes) ? topAxes : []) {
    for (const ax of flattenAxisChain(top)) {
      if (
        ax &&
        String(ax.Type) === "Translation" &&
        ax.Limits &&
        Number.isFinite(Number(ax.Limits.Min)) &&
        Number.isFinite(Number(ax.Limits.Max))
      ) {
        const r = Math.abs(Number(ax.Limits.Max) - Number(ax.Limits.Min));
        if (mx == null || r > mx) mx = r;
      }
    }
  }
  return mx;
}

/**
 * Infer machine units from kinematic travel magnitude. Returns mm-or-null (NEVER inch — magnitude
 * cannot positively prove inch). confidence: "high" (>150, an inch machine would be implausible) |
 * "medium" (>50, above the empirical floor but below the high-confidence band) | null (inconclusive).
 * @param {number|null} maxLinearRange
 * @returns {{unit: "mm"|null, confidence: "high"|"medium"|null}}
 */
export function inferUnitFromKinematics(maxLinearRange) {
  if (maxLinearRange == null || !Number.isFinite(maxLinearRange)) return { unit: null, confidence: null };
  if (maxLinearRange > MM_INFERENCE_FLOOR) {
    return { unit: "mm", confidence: maxLinearRange > MM_INFERENCE_HIGH_CONF ? "high" : "medium" };
  }
  return { unit: null, confidence: null };
}

/**
 * Read + summarize a CIMCO machine definition (.mcfg JSON).
 * @param {string|object} src - absolute/relative .mcfg path, or an already-parsed object.
 * @returns {{displayName,orientation,unit,unitsResolved,maxCuttingFeedrate,acceleration,
 *   version,guid,parts:Array,axes:Array,collisionPairs:Array,revolver:object|null,
 *   toolchangePositions:number,warnings:string[]}}
 */
export function readMachineDef(src) {
  let json;
  if (typeof src === "string") {
    let raw;
    try {
      raw = readFileSync(src, "utf8");
    } catch (e) {
      throw new Error(`cimco machine-def not readable: ${src} (${e.code || e.message})`);
    }
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error(`cimco machine-def not valid JSON: ${src} (${e.message})`);
    }
  } else if (src && typeof src === "object") {
    json = src;
  } else {
    throw new Error("readMachineDef: expected a .mcfg path or a parsed object");
  }

  const md = json.MachineDefinition || json;
  if (!md || typeof md !== "object") throw new Error("cimco machine-def: missing MachineDefinition root");

  const header = md.Header || {};
  const warnings = [];

  const partGroups = Array.isArray(md.MachinePartGroups) ? md.MachinePartGroups : [];
  const parts = partGroups.map((g, i) => ({
    index: i,
    type: g.Type ?? "unknown",
    axis: g.Axis ?? null,
    guid: g.GUID ?? null,
  }));
  const axes = parts.filter((p) => p.axis != null).map((p) => p.axis);

  // UNITS-FIRST (safety rule): Header.Unit is the AUTHORITATIVE scale when declared. When absent
  // (44/86 vendor files), INFER from kinematic travel magnitude (mm-or-nothing) — never a blind
  // inch default (the 25.4× trap). See inferUnitFromKinematics() for the empirical basis.
  const rawUnit = String(header.Unit ?? "").trim().toLowerCase();
  let unit = "unknown";
  let unitSource = "unknown";
  if (rawUnit === "metric" || rawUnit === "mm" || rawUnit === "millimeter") {
    unit = "mm";
    unitSource = "declared";
  } else if (rawUnit === "inch" || rawUnit === "imperial" || rawUnit === "in") {
    unit = "inch";
    unitSource = "declared";
  }

  const maxLinearRange = maxLinearAxisRange(axes);
  let unitsInferred = false;
  let inferenceConfidence = null;
  if (unitSource === "unknown") {
    const inf = inferUnitFromKinematics(maxLinearRange);
    if (inf.unit) {
      unit = inf.unit; // only ever "mm" — magnitude cannot positively prove inch
      unitSource = "inferred-magnitude";
      unitsInferred = true;
      inferenceConfidence = inf.confidence;
      warnings.push(
        `units INFERRED ${unit} (no Header.Unit; max linear travel ${maxLinearRange} ⇒ mm, ${inf.confidence} confidence) — NOT declared; verify vs the real machine before clearing for a live run`,
      );
    } else {
      warnings.push(
        `units UNRESOLVED (Header.Unit='${header.Unit ?? ""}', max linear travel ${maxLinearRange ?? "n/a"} inconclusive) — 25.4x scale risk; verify before geometry`,
      );
    }
  } else if (maxLinearRange != null && unit === "inch" && maxLinearRange > MM_INFERENCE_HIGH_CONF) {
    // Defensive contradiction check (R12): a DECLARED inch unit fighting mm-scale geometry is a mislabel.
    warnings.push(`units DECLARED inch but max linear travel ${maxLinearRange} implies mm — possible mislabel (25.4x risk), verify`);
  }
  // unitsResolved = AUTHORITATIVELY DECLARED only (an inferred unit is a best-guess, not a resolution).
  const unitsResolved = unitSource === "declared";

  const collisions = Array.isArray(md.Collision) ? md.Collision : [];
  const collisionPairs = collisions.map((c) => ({
    name: c.Name ?? null,
    groupOne: Array.isArray(c.GroupOne) ? c.GroupOne : [],
    groupTwo: Array.isArray(c.GroupTwo) ? c.GroupTwo : [],
  }));

  if (parts.length === 0) warnings.push("no MachinePartGroups — kinematic chain empty/unparsed");
  if (collisionPairs.length === 0) warnings.push("no Collision pairs — collision detection unconfigured");

  return {
    displayName: header.DisplayName ?? null,
    orientation: header.Orientation ?? null, // observed CIMCO values: "Horizontal" / "Vertical" / "Lathe"
    unit,
    unitsResolved,
    unitSource, // "declared" | "inferred-magnitude" | "unknown"
    unitsInferred, // true when `unit` came from the kinematic-magnitude heuristic, not Header.Unit
    inferenceConfidence, // "high" | "medium" | null
    maxLinearRange, // max linear-axis travel (the inference magnitude); null if no linear axis
    maxCuttingFeedrate: typeof header.MaxCuttingFeedrate === "number" ? header.MaxCuttingFeedrate : null,
    acceleration: typeof header.Acceleration === "number" ? header.Acceleration : null,
    version: header.Version ?? null,
    guid: header.GUID ?? null,
    parts,
    axes,
    collisionPairs,
    revolver: md.Revolver ?? null,
    toolchangePositions: Array.isArray(md.ToolchangePositions) ? md.ToolchangePositions.length : 0,
    warnings,
  };
}

/** Categories the Simulation Report distinguishes. */
const REPORT_CATEGORIES = new Set(["error", "warning", "collision", "limit"]);

/**
 * Parse a CIMCO Simulation Report into a structured pass/fail verdict.
 *
 * Input is what a UIA extractor yields from the docking-pane (no screenshot): either
 *  (a) an array of row objects { line?, type, description?, action?, category? }, or
 *  (b) an array of raw strings (pipe/tab/multi-space delimited: LINE | TYPE | DESCRIPTION | ACTION), or
 *  (c) an object { errors?, warnings?, collisions?, limits? } already grouped.
 *
 * Documented columns: LINE / TYPE / DESCRIPTION / ACTION; collisions + limits appear when the
 * Machine Simulation add-on is licensed. pass = no errors && no collisions && no limits
 * (warnings do not fail — they are advisory).
 *
 * @returns {{pass:boolean, counts:{error,warning,collision,limit}, firstOffendingLine:number|null,
 *   errors:Array, warnings:Array, collisions:Array, limits:Array, summary:string}}
 */
export function parseSimulationReport(input) {
  const buckets = { error: [], warning: [], collision: [], limit: [] };

  // Fail-OPEN guard: a null/empty report is AMBIGUOUS — a clean sim, OR the "Check collision and limit
  // errors" pass never executed. A grouped-object caller may assert it ran via `collisionCheckRan:true`.
  const explicitCheckRan =
    input != null && !Array.isArray(input) && typeof input === "object" ? input.collisionCheckRan === true : undefined;

  const classify = (typeStr, descr) => {
    const t = String(typeStr ?? "").trim().toLowerCase();
    if (!t) return "error"; // a typeless report row is an unclassified problem — fail-safe to error
    // A gouge is a cutting crash (tool removes material it shouldn't) — fail it as a collision.
    if (t.includes("collision") || t.includes("gouge")) return "collision";
    if (t.includes("limit") || t.includes("over-travel") || t.includes("overtravel") || t.includes("travel")) return "limit";
    // NORMAL stop events (tool change, M00/M01/M30 program/optional stop, program end) are NOT crashes —
    // route to the advisory bucket so a stop-event row never FALSE-FAILS a good program. Only EXPLICIT
    // stop labels match; anything ambiguous stays fail-safe (error). (Stop-Condition events per CIMCO
    // backplotsimulationreport.htm / menubackplottoolpath.htm — U-CIMCO-SIM-VERDICT-HARDEN.)
    if (
      t.includes("tool change") || t.includes("toolchange") ||
      t.includes("program stop") || t.includes("optional stop") || t.includes("program end")
    ) {
      // DEFENSE-IN-DEPTH: this downgrade is the ONE branch that removes a fail. Never downgrade a
      // stop-event row whose DESCRIPTION carries a real hazard (e.g. {type:"Tool Change", desc:"COLLISION
      // with fixture"}) — scan the description before clearing it to advisory.
      const d = String(descr ?? "").toLowerCase();
      if (d.includes("collision") || d.includes("gouge")) return "collision";
      if (d.includes("over-travel") || d.includes("overtravel") || d.includes("limit") || d.includes("travel")) return "limit";
      return "warning";
    }
    if (t.includes("warn")) return "warning";
    return "error";
  };

  const pushRow = (row) => {
    const category = REPORT_CATEGORIES.has(row.category) ? row.category : classify(row.type ?? row.category, row.description);
    const line = row.line != null && Number.isFinite(Number(row.line)) ? Number(row.line) : null;
    buckets[category].push({
      line,
      type: row.type ?? category,
      description: row.description ?? "",
      action: row.action ?? "",
    });
  };

  if (input == null) {
    // empty report = clean run (sim ran, found nothing)
  } else if (Array.isArray(input)) {
    for (const item of input) {
      if (item == null) continue;
      if (typeof item === "string") {
        const parts = item.split(/\s*\|\s*|\t+|\s{2,}/).map((s) => s.trim()).filter(Boolean);
        if (parts.length === 0) continue;
        // heuristic: [LINE, TYPE, DESCRIPTION, ACTION] — LINE may be "N123" or a bare number
        const maybeLine = parts[0].replace(/^N/i, "");
        const hasLine = /^\d+$/.test(maybeLine);
        pushRow({
          line: hasLine ? maybeLine : null,
          type: parts[hasLine ? 1 : 0] ?? "",
          description: parts[hasLine ? 2 : 1] ?? "",
          action: parts[hasLine ? 3 : 2] ?? "",
        });
      } else if (typeof item === "object") {
        pushRow(item);
      }
    }
  } else if (typeof input === "object") {
    for (const cat of ["error", "warning", "collision", "limit"]) {
      const arr = input[cat] || input[`${cat}s`];
      if (Array.isArray(arr)) for (const r of arr) pushRow({ ...(typeof r === "object" ? r : { description: String(r) }), category: cat });
    }
  } else {
    throw new Error("parseSimulationReport: expected array, grouped object, or null");
  }

  const counts = {
    error: buckets.error.length,
    warning: buckets.warning.length,
    collision: buckets.collision.length,
    limit: buckets.limit.length,
  };
  const pass = counts.error === 0 && counts.collision === 0 && counts.limit === 0;

  // Findings present = the collision-check pass demonstrably ran. Otherwise require explicit
  // confirmation; an UNCONFIRMED empty report is conformance-pass but NOT cleared for a live run.
  const anyFindings = counts.error + counts.warning + counts.collision + counts.limit > 0;
  const collisionCheckConfirmed = anyFindings || explicitCheckRan === true;
  const clearedForLiveRun = pass && collisionCheckConfirmed;

  const offenders = [...buckets.error, ...buckets.collision, ...buckets.limit]
    .map((r) => r.line)
    .filter((l) => l != null)
    .sort((a, b) => a - b);
  const firstOffendingLine = offenders.length ? offenders[0] : null;

  const summary = !collisionCheckConfirmed
    ? `CIMCO-sim report EMPTY + collision-check-ran UNCONFIRMED — an empty report may mean the check never executed; NOT cleared for live run (pass is conformance-only)`
    : pass
      ? `CIMCO-sim CLEAN (0 collisions, 0 limits, 0 errors, ${counts.warning} warning(s)) — conformance-clean, NOT controller-verified`
      : `CIMCO-sim FAIL: ${counts.collision} collision(s), ${counts.limit} limit(s), ${counts.error} error(s)` +
        (firstOffendingLine != null ? ` (first @ line ${firstOffendingLine})` : "");

  return {
    pass,
    counts,
    firstOffendingLine,
    errors: buckets.error,
    warnings: buckets.warning,
    collisions: buckets.collision,
    limits: buckets.limit,
    collisionCheckConfirmed, // did the collision/limit check demonstrably run?
    clearedForLiveRun, // pass AND the check ran — the ONLY safe "go" signal (fail-OPEN guard)
    summary,
  };
}

// ─── CLI (argv-guarded, mirrors winmax-ui-map.mjs) ───────────────────────────
function _main(argv) {
  const cmd = argv[0];
  if (cmd === "catalog") {
    process.stdout.write(JSON.stringify({ channels: CHANNELS, catalog: COMMAND_CATALOG, uiaOnly: uiaOnlyActions() }) + "\n");
    return 0;
  }
  if (cmd === "machine") {
    const p = argv[1];
    if (!p) { process.stderr.write("usage: cimco-control-map.mjs machine <path.mcfg>\n"); return 2; }
    try { process.stdout.write(JSON.stringify(readMachineDef(p)) + "\n"); return 0; }
    catch (e) { process.stderr.write(`error: ${e.message}\n`); return 1; }
  }
  if (cmd === "parse-report") {
    const p = argv[1];
    if (!p) { process.stderr.write("usage: cimco-control-map.mjs parse-report <report.json>\n"); return 2; }
    try {
      const data = JSON.parse(readFileSync(p, "utf8"));
      process.stdout.write(JSON.stringify(parseSimulationReport(data)) + "\n");
      return 0;
    } catch (e) { process.stderr.write(`error: ${e.message}\n`); return 1; }
  }
  process.stderr.write("usage: cimco-control-map.mjs {catalog | machine <path.mcfg> | parse-report <report.json>}\n");
  return 2;
}

const _argv1 = process.argv[1];
if (_argv1 && (_argv1.endsWith("cimco-control-map.mjs") || _argv1.endsWith("cimco-control-map"))) {
  process.exit(_main(process.argv.slice(2)));
}
