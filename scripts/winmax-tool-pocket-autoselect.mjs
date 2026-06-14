#!/usr/bin/env node
/**
 * winmax-tool-pocket-autoselect.mjs — operation-list → WinMax tool-pocket map (T1..Tn). slot:echo.
 *
 * THE GAP THIS FILLS (verified against the live magazine-engine fleet — see header §DEDUP):
 *   No existing engine takes a part's RESOLVED operation list (face/pocket/drill/tap…) and
 *   auto-assigns each required tool to a WinMax Tool-Setup pocket, de-duplicating identical tools
 *   to ONE pocket and emitting the exact artifact the WinMax course harness consumes
 *   (scripts/winmax-course-run.mjs `define-tool` course params + the Hurco master post's ATC table).
 *   ToolChangeOptimizationEngine / ToolMagazineOptimizationEngine optimize SLOT ORDER of an
 *   ALREADY-deduplicated tool[] + operation_sequence[]; none ingest raw per-operation tool
 *   requirements and produce the {T1:tool, …} setup table. This module does that one binding —
 *   pure, hermetically testable, ZERO edits to HurcoV11* / master-post engines.
 *
 * §DEDUP — what this WRAPS (does not reimplement): the WinMax course/harness contract
 *   (winmax-courses.json `define-tool`: fields 301=TOOL NUMBER, 303=DIAMETER, 310=TOOL CAL LENGTH),
 *   the WinMax tool-TYPE enum (winmax-ui-map.json ADD_TOOL_FORM.toolTypeList), and the INCH units
 *   discipline the courses doc itself flags ("A 25.4x mislabel is the #1 catastrophic error").
 *   TSP slot-reorder + sister-staging math live in ToolChangeOptimizationEngine; a downstream caller
 *   may pass this map into that engine for index-distance optimization — this module's ordering is
 *   FIRST-USE (the natural ATC fill order; the proven, operator-legible default).
 *
 * ALGORITHM (pure):
 *   1. NORMALIZE each op → a tool spec {type, diameter, flutes, length_of_cut?, corner_radius?,
 *      cal_length?, point_angle?, …} (defaults filled, units carried through verbatim — NO convert).
 *   2. DEDUP — collapse identical tools to one pocket via a canonical signature
 *      (type|Ø(6dp)|flutes|cr(6dp)|loc(6dp)|angle(2dp)). Same Ø endmill in 3 ops → ONE pocket.
 *   3. ORDER pockets by FIRST-USE (the op index at which each distinct tool first appears) so T1 is
 *      the first tool the program calls — the magazine fills in program order (operator-legible).
 *   4. RESERVE a sister pocket when predicted tool-life (min) < that tool's total cut time across its
 *      ops (min), so a 2nd identical tool is staged before the first wears out mid-cut.
 *   5. EMIT a units-tagged pocket map {pocket:'T#', tool:{…}, ops:[…], sister?} + a `define-tool`
 *      course-param array (one {toolNumber, diameter, calLength, toolType} per pocket) the harness
 *      replays via `node scripts/winmax-course-run.mjs define-tool --set toolNumber=N …`.
 *
 * UNITS: the input op list carries `units` ('inch'|'mm'); the emitter REFUSES to guess (fail-loud,
 *   R12) and stamps every output with it. JM jobs are INCH (G20). This module NEVER scales — a
 *   25.4x scale error is a units MISLABEL, not a math bug, so we surface units, never convert.
 *
 * Magazine capacity: the target test machine is the Hurco VMX42SRTi (40-pocket SWING-ARM ATC by
 *   default; override via opts.capacity). Pockets needed > capacity → `oversize:true` + every
 *   excess pocket flagged `overCapacity:true` (fail-loud; the operator must split the job or use a
 *   higher-capacity machine — we do NOT silently drop tools).
 *
 * CLI:
 *   node scripts/winmax-tool-pocket-autoselect.mjs <ops.json> [--capacity N] [--units inch|mm] [--course]
 *     <ops.json>     a JSON file: {units:'inch', capacity?:N, operations:[{type,tool:{…},cut_time_min?,…}]}
 *                    OR a bare array of operations (units then REQUIRED via --units).
 *     --course       print ONLY the define-tool course-param array (harness-replay input).
 *     --capacity N    override magazine capacity (default 40).
 *     --units U       declare units when the ops file does not (fail-loud if still unknown).
 *   Exit 0 = mapped within capacity · 3 = oversize (more pockets than capacity) · 2 = bad input.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// ── constants ────────────────────────────────────────────────────────────────

// Target test machine (GROUND TRUTH from the task brief): Hurco VMX42SRTi.
// 40-pocket swing-arm ATC is the standard VMX42 magazine. Overridable per call.
export const DEFAULT_CAPACITY = 40;

// WinMax Tool-TYPE enum — VERBATIM from winmax-ui-map.json ADD_TOOL_FORM.toolTypeList.
// The emitted toolType MUST be one of these (the ADD_TOOL_FORM dropdown only accepts these labels).
export const WINMAX_TOOL_TYPES = Object.freeze([
  'UNKNOWN', 'DRILL', 'TAP', 'BORING HEAD', 'END MILL', 'FACE MILL', 'BALL END MILL',
  'BACK SPOTFACE MILL', 'PROBE', 'GUN DRILL', 'CENTER DRILL', 'CHAMFER MILL', 'BULL NOSE MILL', 'REAM',
]);

// HurcoV11 master-post operation_type enum → WinMax tool-TYPE label.
// Source op enum (GROUND TRUTH): face|pocket|contour|drill|tap|bore|slot|3d_surface|adaptive.
// A per-op explicit tool.type/tool.winmax_type ALWAYS wins over this inference (R8 read-first:
//   the op author knows the real cutter; this map is only the fallback when type is unstated).
export const OP_TO_WINMAX_TYPE = Object.freeze({
  face: 'FACE MILL',
  pocket: 'END MILL',
  contour: 'END MILL',
  slot: 'END MILL',
  adaptive: 'END MILL',
  '3d_surface': 'BALL END MILL',
  drill: 'DRILL',
  tap: 'TAP',
  bore: 'BORING HEAD',
});

// Accept common cutter-name synonyms → canonical WinMax label (so an op can say "endmill"/"ball").
const TYPE_SYNONYMS = Object.freeze({
  endmill: 'END MILL', 'end mill': 'END MILL', 'flat end mill': 'END MILL', flat: 'END MILL',
  ballmill: 'BALL END MILL', ball: 'BALL END MILL', 'ball end mill': 'BALL END MILL', ballnose: 'BALL END MILL',
  bullnose: 'BULL NOSE MILL', 'bull nose': 'BULL NOSE MILL', 'bull nose mill': 'BULL NOSE MILL',
  facemill: 'FACE MILL', 'face mill': 'FACE MILL',
  chamfer: 'CHAMFER MILL', 'chamfer mill': 'CHAMFER MILL', 'spot drill': 'CENTER DRILL', spotdrill: 'CENTER DRILL',
  centerdrill: 'CENTER DRILL', 'center drill': 'CENTER DRILL', 'centre drill': 'CENTER DRILL',
  drill: 'DRILL', tap: 'TAP', ream: 'REAM', reamer: 'REAM', bore: 'BORING HEAD', 'boring head': 'BORING HEAD',
  probe: 'PROBE', 'gun drill': 'GUN DRILL', gundrill: 'GUN DRILL',
});

// ── pure helpers ─────────────────────────────────────────────────────────────

/** Round to N decimals as a Number (kills float fuzz in the dedup signature). */
function round(n, dp) {
  if (!Number.isFinite(n)) return n;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/**
 * Resolve a WinMax tool-TYPE label from an op + its tool spec.
 * Precedence (R8 read-first — explicit author intent beats inference):
 *   1. tool.winmax_type / tool.type (verbatim if already a WINMAX_TOOL_TYPES member)
 *   2. tool.type / op-level type via the synonym table
 *   3. op.type via OP_TO_WINMAX_TYPE
 *   4. 'UNKNOWN' (WinMax renders these as dia-0 unknown — NON-blocking per User Guide p99).
 */
export function resolveWinMaxType(op, tool) {
  const candidates = [tool && tool.winmax_type, tool && tool.type, op && op.type];
  for (const c of candidates) {
    if (c == null) continue;
    const up = String(c).toUpperCase().replace(/\s+/g, ' ').trim();
    if (WINMAX_TOOL_TYPES.includes(up)) return up;
    const syn = TYPE_SYNONYMS[String(c).toLowerCase().replace(/\s+/g, ' ').trim()];
    if (syn) return syn;
  }
  const byOp = op && op.type ? OP_TO_WINMAX_TYPE[String(op.type).toLowerCase()] : null;
  return byOp || 'UNKNOWN';
}

/**
 * Normalize one operation → a canonical tool spec. Units are carried through VERBATIM (never scaled).
 * Diameter resolution order: tool.diameter → tool.diameter_in → tool.diameter_mm → op.diameter.
 *   (We do NOT cross-convert *_in/*_mm: the declared `units` says which one is authoritative; a
 *    mismatched suffix is a data error the caller must fix, not something we silently rescale — 25.4x.)
 */
/**
 * Normalize the HOLDER the user populated in CAM alongside the tool. A tool in a different holder
 * (or at a different gauge/projection length) is a DIFFERENT physical setup — the gauge length sets
 * the Z tool-length offset — so the holder participates in pocket de-duplication (see toolSignature).
 * gauge_length is the spindle-gauge-line-to-tool-tip length WinMax uses as the calibrated tool length.
 * Accepts a nested op.tool.holder object OR flat holder_* fields on the tool. Returns null when no
 * holder was populated (back-compat — pre-holder callers behave exactly as before).
 */
export function normalizeHolder(tool) {
  if (!tool || typeof tool !== 'object') return null;
  // The holder source is ONLY a nested tool.holder (object or string) or explicit holder_* flat
  // fields — NEVER the tool's own `type` (that's the cutter; the old fallback `tool.holder || tool`
  // mis-read a holderless cutter's type as a bogus holder). A holderless tool → null (back-compat).
  const nested = (tool.holder && typeof tool.holder === 'object') ? tool.holder
    : (typeof tool.holder === 'string' && tool.holder.trim() ? { type: tool.holder } : null);
  const flat = (tool.holder_type || tool.holderType || tool.holder_taper || tool.holder_coupling)
    ? { type: tool.holder_type ?? tool.holderType, gauge_length: tool.gauge_length_mm ?? tool.gauge_length ?? tool.gaugeLength, coupling: tool.holder_taper ?? tool.holder_coupling }
    : null;
  const h = nested || flat;
  if (!h) return null;
  const type = h.type ?? h.holder_type ?? h.holderType ?? null;
  const gauge = numOrNull(h.gauge_length ?? h.gaugeLength ?? h.gauge ?? h.gauge_length_mm);
  const projection = numOrNull(h.projection ?? h.projection_length ?? h.stickout ?? h.stick_out);
  const coupling = (h.coupling ?? h.taper ?? h.shank ?? null);
  const typeStr = type == null ? null : String(type).trim() || null;
  const couplingStr = coupling == null ? null : String(coupling).trim() || null;
  if (!typeStr && gauge == null && projection == null && !couplingStr) return null;
  return { type: typeStr, gauge_length: gauge, projection, coupling: couplingStr };
}

export function normalizeTool(op, units) {
  const tool = (op && op.tool) || {};
  const dia = firstFinite([
    tool.diameter, units === 'mm' ? tool.diameter_mm : tool.diameter_in,
    tool.dia, op && op.diameter,
  ]);
  const winmaxType = resolveWinMaxType(op, tool);
  const holder = normalizeHolder(tool);
  return {
    type: winmaxType,
    diameter: Number.isFinite(dia) ? dia : 0,
    flutes: intOr(tool.flutes ?? tool.teeth ?? tool.cutting_edges, 0),
    length_of_cut: numOrNull(tool.length_of_cut ?? tool.loc ?? tool.flute_length),
    corner_radius: numOr(tool.corner_radius ?? tool.radius ?? tool.cr, 0),
    point_angle: numOrNull(tool.point_angle ?? tool.angle),
    // calibrated tool length: explicit field, else the holder gauge length (the holder defines it).
    cal_length: numOrNull(tool.cal_length ?? tool.tool_length ?? tool.length ?? tool.stickout) ?? (holder ? holder.gauge_length : null),
    units,
    // free-text label preserved for the operator / ADD_TOOL_FORM description.
    description: typeof tool.description === 'string' ? tool.description
      : (tool.name != null ? String(tool.name) : null),
    // tool-life inputs (optional) — drive sister-pocket reservation.
    life_min: numOrNull(tool.life_min ?? tool.tool_life_min ?? tool.predicted_life_min),
    // holder the user populated in CAM (null when none) — carried into the pocket + dedup signature.
    holder,
  };
}

/**
 * Canonical dedup signature: two ops share a pocket iff this string is identical.
 * Geometry-only (type+Ø+flutes+corner-radius+LOC+point-angle) — NOT description/life, so a re-used
 * cutter described differently in two ops still collapses. 6dp on lengths (inch fields show 4dp in
 * WinMax; 6dp here is strictly finer so it never falsely merges 0.2500 vs 0.2501).
 */
export function toolSignature(t) {
  const base = [
    t.type,
    round(t.diameter, 6),
    t.flutes,
    round(t.corner_radius, 6),
    t.length_of_cut == null ? '-' : round(t.length_of_cut, 6),
    t.point_angle == null ? '-' : round(t.point_angle, 2),
  ].join('|');
  // Holder identity (type + gauge length + coupling) joins the signature: the SAME cutter in a
  // different holder/gauge is a distinct setup (different Z tool-length offset) → its own pocket.
  const h = t.holder;
  const holderSig = h ? `${h.type ?? '-'}|${h.gauge_length == null ? '-' : round(h.gauge_length, 6)}|${h.coupling ?? '-'}` : '-';
  return `${base}||H:${holderSig}`;
}

// ── core ─────────────────────────────────────────────────────────────────────

/**
 * Build the pocket map from an operation list.
 * @param {Array} operations  each: { type, tool:{…}, cut_time_min?, op_id?, … }
 * @param {Object} opts        { units, capacity }
 * @returns {Object} pocket map (see §EMIT in the header)
 */
export function buildPocketMap(operations, opts = {}) {
  const units = opts.units;
  if (units !== 'inch' && units !== 'mm') {
    // Fail-loud (R12): a units mismatch is a 25.4x scale error — never guess.
    throw new Error("units must be declared 'inch' or 'mm' (refusing to guess — 25.4x hazard)");
  }
  const capacity = Number.isFinite(opts.capacity) && opts.capacity > 0 ? Math.floor(opts.capacity) : DEFAULT_CAPACITY;
  if (!Array.isArray(operations)) throw new Error('operations must be an array');

  // First pass: normalize + dedup, recording first-use index, member ops, and summed cut time.
  /** sig -> { tool, firstUse, ops:[…], cutTimeMin } */
  const bySig = new Map();
  operations.forEach((op, i) => {
    if (!op || typeof op !== 'object') throw new Error(`operation ${i}: not an object`);
    const tool = normalizeTool(op, units);
    const sig = toolSignature(tool);
    const opRef = {
      index: i,
      op_id: op.op_id ?? op.id ?? null,
      op_type: op.type ?? null,
      cut_time_min: numOr(op.cut_time_min ?? op.cycle_time_min ?? op.time_min, 0),
    };
    const entry = bySig.get(sig);
    if (entry) {
      entry.ops.push(opRef);
      entry.cutTimeMin += opRef.cut_time_min;
      // keep the RICHEST tool record (prefer the one that has a cal_length / life / description).
      entry.tool = mergeToolRecords(entry.tool, tool);
      if (entry.tool.life_min == null && tool.life_min != null) entry.tool.life_min = tool.life_min;
    } else {
      bySig.set(sig, { tool, firstUse: i, ops: [opRef], cutTimeMin: opRef.cut_time_min, sig });
    }
  });

  // Second pass: order distinct tools by first-use (stable — earliest program call = lowest T#).
  const ordered = [...bySig.values()].sort((a, b) => a.firstUse - b.firstUse);

  // Third pass: assign sequential pockets + reserve sister pockets where life < cut time.
  const pockets = [];
  let pocketNo = 0;
  for (const e of ordered) {
    pocketNo += 1;
    const lifeMin = e.tool.life_min;
    const cutMin = round(e.cutTimeMin, 4);
    const needsSister = lifeMin != null && Number.isFinite(lifeMin) && lifeMin > 0 && lifeMin < cutMin;
    const pocket = {
      pocket: `T${pocketNo}`,
      pocketNumber: pocketNo,
      tool: e.tool,
      signature: e.sig,
      ops: e.ops,
      cut_time_min: cutMin,
      first_use_op_index: e.firstUse,
      life_min: lifeMin ?? null,
      needs_sister: needsSister,
    };
    pockets.push(pocket);
  }
  // Sister pockets are appended AFTER all primaries (a sister never displaces a primary's first-use
  // order). Each reserves the next sequential T# and back-references its primary.
  for (const p of pockets.filter((x) => x.needs_sister)) {
    pocketNo += 1;
    const sister = {
      pocket: `T${pocketNo}`,
      pocketNumber: pocketNo,
      tool: p.tool,
      signature: p.signature,
      ops: [],
      cut_time_min: 0,
      first_use_op_index: p.first_use_op_index,
      life_min: p.life_min,
      needs_sister: false,
      is_sister_of: p.pocket,
      reason: `predicted life ${p.life_min}min < cut time ${p.cut_time_min}min`,
    };
    p.sister = sister.pocket;
    pockets.push(sister);
  }

  // Capacity check (fail-loud — we never drop a tool to fit).
  const oversize = pockets.length > capacity;
  for (const p of pockets) p.overCapacity = p.pocketNumber > capacity;

  return {
    schemaVersion: '1.0.0',
    generator: 'winmax-tool-pocket-autoselect',
    units,
    machine: 'Hurco VMX42SRTi',
    capacity,
    pocketCount: pockets.length,
    distinctTools: ordered.length,
    sisterCount: pockets.filter((p) => p.is_sister_of).length,
    operationCount: operations.length,
    oversize,
    overCapacityPockets: pockets.filter((p) => p.overCapacity).map((p) => p.pocket),
    pockets,
  };
}

/**
 * Render the pocket map as `define-tool` course-param rows the harness replays. One row per pocket;
 * each is the EXACT param set winmax-courses.json `define-tool` accepts (toolNumber/diameter/calLength)
 * plus toolType + description for the ADD_TOOL_FORM. Diameter/calLength are strings (the harness's
 * field op + valuesMatch compare strings; numeric-aware so '2' matches WinMax's '2.0000' padding).
 */
export function toDefineToolCourses(pocketMap) {
  return pocketMap.pockets.map((p) => ({
    toolNumber: p.pocketNumber,
    diameter: numToFieldStr(p.tool.diameter),
    // cal_length defaults to the diameter ONLY when the caller left it null AND it's a length-bearing
    // cutter? No — we must NOT invent geometry. Emit the real cal_length, or null (operator sets it).
    calLength: p.tool.cal_length == null ? null : numToFieldStr(p.tool.cal_length),
    toolType: p.tool.type,
    description: p.tool.description,
    // holder the user picked in CAM → WinMax Tool Setup (gauge length sets the tool-length offset).
    holderType: p.tool.holder ? p.tool.holder.type : null,
    gaugeLength: p.tool.holder && p.tool.holder.gauge_length != null ? numToFieldStr(p.tool.holder.gauge_length) : null,
    coupling: p.tool.holder ? p.tool.holder.coupling : null,
    units: pocketMap.units,
    isSister: !!p.is_sister_of,
  }));
}

/**
 * CAM-program → ops adapter. Maps a flat tools+holders list — the shape a CAM tool-library export
 * gives (universal_tool_export CSV rows parsed to objects, or a per-CAM extractor's JSON:
 * hypermill_extract_tools / cam_fusion360_tool_parse / mastercam_tool_import) — into the autoselect
 * op-list. Each tool the user populated in their CAM program becomes one operation so it earns a
 * pocket. This is the CAM-program → pocket-inputs ingestion link. Pure (no I/O).
 */
export function toolsToOps(tools) {
  if (!Array.isArray(tools)) throw new Error('tools must be an array');
  return tools.map((t) => {
    // accept nested {holder:{…}} OR flat holder_* fields; pass the tool through verbatim so
    // normalizeTool/normalizeHolder do the field resolution (single source of truth).
    const holder = t.holder || (t.holder_type || t.holderType || t.gauge_length_mm != null || t.gaugeLength != null || t.taper != null
      ? { type: t.holder_type ?? t.holderType, gauge_length: t.gauge_length_mm ?? t.gauge_length ?? t.gaugeLength, coupling: t.taper ?? t.coupling }
      : undefined);
    return {
      type: t.operation_type ?? t.op_type ?? t.tool_type ?? t.type,
      op_id: t.op_id ?? t.id ?? t.tool_id,
      tool: {
        type: t.tool_type ?? t.type,
        diameter: t.diameter_mm ?? t.diameter ?? t.dia,
        flutes: t.flutes ?? t.number_of_flutes ?? t.teeth,
        length_of_cut: t.cutting_length_mm ?? t.length_of_cut ?? t.loc,
        corner_radius: t.corner_radius_mm ?? t.corner_radius,
        point_angle: t.point_angle_deg ?? t.point_angle,
        cal_length: t.gauge_length_mm ?? t.cal_length ?? t.overall_length_mm,
        description: t.designation ?? t.description ?? t.comment,
        ...(holder ? { holder } : {}),
      },
    };
  });
}

/**
 * Pocket map → master_post_hurco_v11 parameter object. THE link that AUTO-POPULATES the
 * post-processor's tool/pocket inputs from the CAM tools+holders: each pocket becomes one operation
 * in the post call carrying its tool number, geometry, AND holder; the caller's machine + post
 * settings ride alongside. So a CAM tool list flows end-to-end with no manual re-entry:
 * CAM export → toolsToOps → buildPocketMap → buildPostParams → master_post_hurco_v11.
 * Diameters/gauge are inch→mm converted (the engine is mm-native) only when the map units are inch.
 */
export function buildPostParams(pocketMap, { machine = null, postSettings = {} } = {}) {
  const toMm = (v) => (v == null ? null : (pocketMap.units === 'inch' ? round(v * 25.4, 4) : v));
  const operations = pocketMap.pockets.map((p) => ({
    operation_type: postOpType(p.tool.type),
    tool_number: p.pocketNumber,
    tool_diameter_mm: toMm(p.tool.diameter),
    tool_flutes: p.tool.flutes || 1,
    tool_description: p.tool.description || `${p.tool.type} D${p.tool.diameter}`,
    holder: p.tool.holder
      ? { type: p.tool.holder.type, gauge_length_mm: toMm(p.tool.holder.gauge_length), coupling: p.tool.holder.coupling }
      : null,
    is_sister: !!p.is_sister_of,
  }));
  return { operations, units: pocketMap.units, machine, ...postSettings };
}

/** WinMax tool-TYPE label → master-post operation_type (for the post call). */
function postOpType(winmaxType) {
  const t = (winmaxType || '').toUpperCase();
  if (t.includes('FACE')) return 'face';
  if (t.includes('DRILL')) return 'drill';
  if (t === 'TAP') return 'tap';
  if (t.includes('BORING') || t === 'REAM') return 'bore';
  if (t.includes('CHAMFER')) return 'contour';
  return 'pocket';
}

/** Parse a tools file: JSON (array / {tools:[…]}) OR a universal_tool_export CSV (header + rows). */
export function readToolsFile(file) {
  const text = readFileSync(file, 'utf8');
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const raw = JSON.parse(trimmed);
    return Array.isArray(raw) ? raw : (raw.tools || (raw.library_data && raw.library_data.tools) || []);
  }
  return parseToolCsv(text);
}

/** Parse a universal_tool_export-style CSV into header-keyed row objects. Pure. */
export function parseToolCsv(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

// ── CAM-program-file → tool+holder extraction (the live ingestion link) ────────────────────
//
// The LAST link: read the user's actual CAM program FILE and pull the tools+holders THEY populated,
// via the per-CAM extractor MCP actions over the :3100 HTTP bridge (verified schemas, 2026-05-31):
//   fusion    → cam_fusion360_tool_parse  { json_text: <.tools/.json content> } → { library:{tools|...} }
//   mastercam → mastercam_tool_import      { native_data: <parsed JSON> }        → { tools|imported|... }
//   hypermill → hypermill_extract_tools    { db_path: <SQLite .db/.hmt path> }    → { tools|records|... }  (server reads the path)
// The transport (fetchImpl) + file read (readFile) are injectable so this is hermetically testable
// without a live server. The returned raw tool array flows through toolsToOps → normalizeTool/
// normalizeHolder (already field-flexible: many key aliases + nested holder), so holders survive.

const MCP_HTTP_URL = process.env.MCP_HTTP_URL || 'http://127.0.0.1:3100/mcp';

/** Pull the tool array out of an extractor response, trying the known per-CAM shapes. */
function pickToolArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return null;
  const lib = payload.library;
  return (lib && Array.isArray(lib.tools) ? lib.tools : null)
    ?? (Array.isArray(payload.tools) ? payload.tools : null)
    ?? (Array.isArray(payload.imported) ? payload.imported : null)
    ?? (Array.isArray(payload.records) ? payload.records : null)
    ?? (payload.result && Array.isArray(payload.result.tools) ? payload.result.tools : null)
    ?? (Array.isArray(lib) ? lib : null);
}

const CAM_EXTRACTORS = Object.freeze({
  fusion:    { action: 'cam_fusion360_tool_parse', needsContent: true,  build: (content) => ({ json_text: content }) },
  mastercam: { action: 'mastercam_tool_import',    needsContent: true,  build: (content) => { let nd; try { nd = JSON.parse(content); } catch { nd = content; } return { native_data: nd }; } },
  hypermill: { action: 'hypermill_extract_tools',  needsContent: false, build: (_content, file) => ({ db_path: file }) },
});

/**
 * Read a CAM program/tool-DB FILE and return the raw tools+holders the user populated, via the
 * per-CAM extractor over MCP. cam ∈ {fusion, mastercam, hypermill}. Async (network). The returned
 * array is the input to toolsToOps(). Transport + file-read injectable for hermetic testing.
 */
export async function camProgramToTools({ cam, file, url = MCP_HTTP_URL, fetchImpl, readFile } = {}) {
  const ex = CAM_EXTRACTORS[cam];
  if (!ex) throw new Error(`unknown cam '${cam}'. Known: ${Object.keys(CAM_EXTRACTORS).join(', ')}`);
  if (!file) throw new Error('camProgramToTools: file is required');
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw new Error('no fetch transport available');
  const read = readFile || ((f) => readFileSync(f, 'utf8'));
  const content = ex.needsContent ? read(file) : null;
  const args = ex.build(content, file);
  const body = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'prism_cam', arguments: { action: ex.action, params: args } } };
  const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`extractor HTTP ${r.status} (${cam})`);
  const j = await r.json();
  if (j && j.error) throw new Error(`extractor error (${cam}): ${j.error.message || JSON.stringify(j.error)}`);
  const text = j && j.result && j.result.content && j.result.content[0] && j.result.content[0].text;
  let payload;
  try { payload = text ? JSON.parse(text) : (j && j.result); } catch { payload = text; }
  const tools = pickToolArray(payload);
  if (!Array.isArray(tools)) throw new Error(`extractor (${cam}) returned no recognizable tool array`);
  return tools;
}

// ── small utilities ──────────────────────────────────────────────────────────

function firstFinite(arr) { for (const v of arr) { const n = Number(v); if (Number.isFinite(n)) return n; } return NaN; }
function numOr(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function numOrNull(v) { if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
function intOr(v, d) { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : d; }
function numToFieldStr(n) { return Number.isFinite(n) ? String(round(n, 6)) : '0'; }

/** Merge two normalized tool records of the SAME signature, preferring present/richer fields. */
function mergeToolRecords(a, b) {
  return {
    ...a,
    cal_length: a.cal_length ?? b.cal_length,
    length_of_cut: a.length_of_cut ?? b.length_of_cut,
    point_angle: a.point_angle ?? b.point_angle,
    description: a.description ?? b.description,
    life_min: a.life_min ?? b.life_min,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const a = { file: null, capacity: undefined, units: undefined, course: false, fromTools: false, fromCam: null, emit: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--capacity') a.capacity = Number(argv[++i]);
    else if (t === '--units') a.units = argv[++i];
    else if (t === '--course') a.course = true;
    else if (t === '--from-tools') a.fromTools = true;          // input is a CAM tools+holders export (CSV/JSON)
    else if (t === '--from-cam') a.fromCam = argv[++i];          // input is a live CAM program FILE; arg = fusion|mastercam|hypermill
    else if (t === '--emit') a.emit = argv[++i];                 // --emit post-params → master_post_hurco_v11 params
    else if (!t.startsWith('--') && !a.file) a.file = t;
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.file) {
    console.error(JSON.stringify({ ok: false, error: 'usage: winmax-tool-pocket-autoselect.mjs <ops.json|tools.csv|cam-file> [--from-tools | --from-cam fusion|mastercam|hypermill] [--capacity N] [--units inch|mm] [--course | --emit post-params]' }));
    process.exit(2);
  }

  // Resolve the operation list:
  //   --from-cam <cam>  → read the live CAM program FILE via the extractor, then adapt.
  //   --from-tools      → input is a CAM tool-library export (CSV/JSON), adapt to ops.
  //   (default)         → input is an ops.json.
  let operations, units, capacity = a.capacity;
  try {
    if (a.fromCam) {
      operations = toolsToOps(await camProgramToTools({ cam: a.fromCam, file: resolve(a.file) }));
      units = a.units;
    } else if (a.fromTools) {
      operations = toolsToOps(readToolsFile(resolve(a.file)));
      units = a.units;
    } else {
      const doc = JSON.parse(readFileSync(resolve(a.file), 'utf8'));
      operations = Array.isArray(doc) ? doc : (doc.operations || []);
      units = a.units || (Array.isArray(doc) ? undefined : doc.units);
      capacity = capacity ?? (Array.isArray(doc) ? undefined : doc.capacity);
    }
  } catch (e) { console.error(JSON.stringify({ ok: false, error: `cannot read input: ${e.message}` })); process.exit(2); }

  let map;
  try { map = buildPocketMap(operations, { units, capacity }); }
  catch (e) { console.error(JSON.stringify({ ok: false, error: e.message })); process.exit(2); }

  if (a.emit === 'post-params') {
    console.log(JSON.stringify(buildPostParams(map, { machine: { spindle_type: 'CAT40', max_rpm: 12000 } }), null, 2));
  } else if (a.course) {
    console.log(JSON.stringify({ ok: !map.oversize, units: map.units, courses: toDefineToolCourses(map) }, null, 2));
  } else {
    console.log(JSON.stringify({ ok: !map.oversize, ...map }, null, 2));
  }
  process.exit(map.oversize ? 3 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(JSON.stringify({ ok: false, error: String(e && e.message || e) })); process.exit(2); });
}
