#!/usr/bin/env node
/**
 * CIMCO sim-report node normalizer -- U-CIMCO-SIM-1A.
 *
 * Turns the `PrismCimcoUI.exe --op read-report` MSAA node dump into the
 * `{line,type,description,action}[]` rows that `parseSimulationReport`
 * (scripts/cimco-control-map.mjs) consumes -- the testable half of the report
 * read. The C# reader walks the report docking-pane subtree (compile-proven,
 * live-validation operator-gated); this assembles rows from whatever MSAA shape
 * the live grid turns out to be, via a FAIL-CLOSED fallback ladder.
 *
 * Fallback ladder (spec CIMCO-SPINE2-LIVESIM-PLAN A-section, each a tagged
 * `source`, NEVER silently degraded):
 *   grid       -- per-row-joined OR per-cell-grouped (GridPattern/TablePattern-like)
 *   textscrape -- sequential numeric-anchored scrape (TextPattern/Win32-like)
 *   empty-report -- container found, 0 nodes (clean OR unconfirmed -> parseSimulationReport's
 *                   fail-OPEN guard keeps it NOT cleared; never a silent pass here)
 *   header-only -- grid realized with its column headers but ZERO data rows. AMBIGUOUS
 *                  (sim ran clean OR the collision pass never executed) -> NON-clearing,
 *                  blockedBy report-headers-only-no-data-rows-ambiguous. Distinct from
 *                  `opaque` so triage sees "reader worked, no findings" not "reader broke".
 *   no-report  -- container not found (sim not run / report not enabled) -> blockedBy
 *   blocked    -- ribbon/window unrealized (cold launch) -> blockedBy
 *   opaque     -- nodes exist but no rows parse AND no header signature -> blockedBy
 *                 uia-report-grid-opaque (OCR is the next arm -- it can NEVER alone clear)
 *   error      -- the exe/transport failed
 *
 * A clearance-CAPABLE read is `grid` or `textscrape` (real MSAA reads). Every other
 * source carries rows:[] AND a blockedBy/empty marker so it can NEVER read as a clean
 * pass (the "empty report reads clean" hazard the whole CIMCO arm guards against).
 */

export const NORMALIZE_SOURCE = Object.freeze({
  GRID: "grid",
  TEXTSCRAPE: "textscrape",
  EMPTY: "empty-report",
  HEADER_ONLY: "report-header-only",
  NO_REPORT: "no-report",
  BLOCKED: "blocked",
  OPAQUE: "opaque",
  ERROR: "error",
});

// A read whose rows can contribute to a live-run clearance (a real MSAA read, not a guess).
// HEADER_ONLY is deliberately EXCLUDED: a column-headers-only grid is ambiguous between a
// clean run and a collision pass that never executed, so it must never clear a live run.
export const CLEARANCE_CAPABLE = Object.freeze(new Set([NORMALIZE_SOURCE.GRID, NORMALIZE_SOURCE.TEXTSCRAPE, NORMALIZE_SOURCE.EMPTY]));

// CIMCO sim-report column labels (the live grid header row). >=2 present + 0 data rows = header-only.
const REPORT_COLUMN_TOKENS = Object.freeze(["start time", "type", "message", "action"]);

// Same delimiter heuristic parseSimulationReport uses for string rows: pipe, tab, or 2+ spaces.
const DELIM = /\s*\|\s*|\t+|\s{2,}/;
const looksLine = (s) => /^\s*N?\d+\b/i.test(String(s ?? ""));
const parseLineNum = (s) => {
  const m = String(s ?? "").match(/^\s*N?(\d+)/i);
  return m ? Number(m[1]) : null;
};

/**
 * Normalize a read-report payload to verdict-ready rows.
 * @param {object|null} payload - the `--op read-report` JSON (or a runUiDriver fail envelope).
 * @returns {{rows:Array<{line:number|null,type:string,description:string,action:string}>,
 *            source:string, blockedBy:(string|null), nodeCount:number, confidence:number,
 *            container?:object|null, candidates?:Array|null}}
 */
export function normalizeReportNodes(payload) {
  // 1. transport / exe failure (runUiDriver wraps timeout/spawn/bad-output as ok:false).
  //    An array/scalar is not a read-report envelope -> error (never a degenerate empty-report).
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return fail(NORMALIZE_SOURCE.ERROR, "read-failed-no-payload", null);
  if (payload.ok === false) {
    return fail(NORMALIZE_SOURCE.ERROR, payload.error || payload.code || payload.blockedBy || "read-failed", payload);
  }
  // 2. exe fail-closed gates, distinguished by LEVEL (not mere blockedBy presence):
  //    frameRealized:false = the whole window/ribbon never realized (cold launch) -> blocked;
  //    found:false with the frame realized = window fine but no report pane -> no-report.
  if (payload.frameRealized === false) return fail(NORMALIZE_SOURCE.BLOCKED, payload.blockedBy || "ribbon-uia-unrealized", payload);
  if (payload.found === false) return fail(NORMALIZE_SOURCE.NO_REPORT, payload.blockedBy || "report-grid-not-found", payload);

  // 3. found:true -- assemble rows from the node dump.
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  if (nodes.length === 0) {
    // Container found but empty. Could be a genuinely clean sim OR a read miss -- do NOT decide here.
    // rows:[] flows to parseSimulationReport whose fail-OPEN guard keeps an unconfirmed empty NOT cleared.
    return result([], NORMALIZE_SOURCE.EMPTY, null, 0, 0.3, payload);
  }
  const ext = extractRows(nodes);
  if (ext.rows.length > 0) return result(ext.rows, ext.source, null, nodes.length, ext.confidence, payload);
  // 4. nodes exist but nothing parsed to a row. Distinguish a well-formed-but-empty grid
  //    (column headers present, 0 data rows -- AMBIGUOUS, NON-clearing) from genuinely opaque
  //    nodes (reader returned something unintelligible). Neither clears; the label differs so
  //    triage knows whether the reader worked.
  if (looksHeaderOnly(nodes)) {
    return result([], NORMALIZE_SOURCE.HEADER_ONLY, "report-headers-only-no-data-rows-ambiguous", nodes.length, 0, payload);
  }
  return result([], NORMALIZE_SOURCE.OPAQUE, "uia-report-grid-opaque", nodes.length, 0, payload);
}

/**
 * Header-only detection: the report grid realized with its column-name headers but extracted
 * ZERO data rows. Requires >=2 distinct CIMCO report column labels among the node texts -- a
 * strong, version-stable signature (the literal column captions, not the volatile oleacc role
 * codes). Used ONLY to relabel an otherwise-opaque read; it never makes a read clearance-capable.
 */
function looksHeaderOnly(nodes) {
  const texts = nodes
    .map((n) => String((n && (n.text || n.value)) || "").trim().toLowerCase())
    .filter(Boolean);
  const hdrHits = REPORT_COLUMN_TOKENS.filter((tok) => texts.some((t) => t.includes(tok))).length;
  return hdrHits >= 2;
}

function result(rows, source, blockedBy, nodeCount, confidence, payload) {
  return { rows, source, blockedBy, nodeCount, confidence, container: payload?.container ?? null };
}
function fail(source, blockedBy, payload) {
  return {
    rows: [], source, blockedBy,
    nodeCount: payload && Array.isArray(payload.nodes) ? payload.nodes.length : 0,
    confidence: 0,
    candidates: payload?.candidates ?? null,
  };
}

/**
 * The row-extraction ladder. Tries the most-structured shape first, degrading to
 * sequential text scrape. Returns {rows, source, confidence}; empty rows => caller
 * tags opaque. A cell's text is `text || value` (grid cells carry text in either).
 */
export function extractRows(nodes) {
  const cells = nodes
    .map((n) => ({ text: String((n && (n.text || n.value)) || "").trim(), path: String((n && n.path) || ""), role: String((n && n.role) || "") }))
    .filter((n) => n.text);
  if (cells.length === 0) return { rows: [], source: NORMALIZE_SOURCE.OPAQUE, confidence: 0 };

  // A) joined-row: one node whose text splits into >=2 fields with a numeric first field
  //    ("12 | Collision | tool vs fixture | retract").
  const joined = [];
  for (const c of cells) {
    const parts = c.text.split(DELIM).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2 && looksLine(parts[0])) joined.push(rowFromParts(parts));
  }
  if (joined.length) return { rows: joined, source: NORMALIZE_SOURCE.GRID, confidence: 0.8 };

  // B) per-cell grouped: siblings share a row-parent path; a group with a numeric cell is a row.
  const groups = new Map();
  for (const c of cells) {
    if (!groups.has(c.path)) groups.set(c.path, []);
    groups.get(c.path).push(c.text);
  }
  const grouped = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const li = g.findIndex(looksLine);
    if (li < 0) continue;
    const rest = g.filter((_, i) => i !== li);
    grouped.push(rowFromLineAndCells(g[li], rest));
  }
  if (grouped.length) return { rows: grouped, source: NORMALIZE_SOURCE.GRID, confidence: 0.7 };

  // C) sequential scrape: a numeric text starts a row; following non-numeric texts are its cells.
  const seq = [];
  let cur = null;
  for (const c of cells) {
    if (looksLine(c.text)) {
      if (cur) seq.push(flushSeq(cur));
      cur = { line: c.text, parts: [] };
      const tail = c.text.replace(/^\s*N?\d+[\s.:|-]*/i, "").trim();
      if (tail) cur.parts.push(tail);
    } else if (cur) {
      cur.parts.push(c.text);
    }
  }
  if (cur) seq.push(flushSeq(cur));
  const seqRows = seq.filter((r) => r && (r.type || r.description));
  if (seqRows.length) return { rows: seqRows, source: NORMALIZE_SOURCE.TEXTSCRAPE, confidence: 0.5 };

  return { rows: [], source: NORMALIZE_SOURCE.OPAQUE, confidence: 0 };
}

function rowFromParts(parts) {
  return { line: parseLineNum(parts[0]), type: parts[1] || "", description: parts[2] || "", action: parts[3] || "" };
}
function rowFromLineAndCells(lineCell, rest) {
  const line = parseLineNum(lineCell);
  const type = rest[0] || "";
  let description = "";
  let action = "";
  if (rest.length === 2) description = rest[1];
  else if (rest.length >= 3) { description = rest.slice(1, -1).join(" "); action = rest[rest.length - 1]; }
  return { line, type, description, action };
}
function flushSeq(cur) {
  return { line: parseLineNum(cur.line), type: cur.parts[0] || "", description: cur.parts.slice(1).join(" "), action: "" };
}
