#!/usr/bin/env node
// extract-monolith-databases.mjs — deterministic extractor for EVERY data-store literal
// embedded in the non-modular PRISM monolith HTMLs + the already-split .js modules.
//
// WHY: the operator asked to "extract all other databases other than tooling … assume I want
// the whole neighborhood: inserts, fixtures, materials, machines, coolants/lubricants and all
// other databases we had in the monolith" ([[feedback_think_ahead_extract_adjacent_databases]]).
// Tooling already lives in jm-die-database/ — this is the SEPARATE, cross-referenced reference DB
// for everything else. Nothing in src/data is overwritten; output is a new tree.
//
// STRATEGY (comment-blind find, balanced extract, sandboxed eval):
//   1. Walk the source set (2 monolith HTMLs + extracted_modules/**.js + extracted/**.js +
//      data/materials_complete/**.js).
//   2. Regex-find every `IDENT = {` / `IDENT = [` assignment over RAW text (comment-blind — the
//      monolith's extracted files sometimes have the `const` technically inside a `//` comment with
//      literal newline junk; the object body after the bracket is still well-formed, so we extract
//      from the opening bracket onward).
//   3. Keep only data-store-shaped names (UPPER_SNAKE or a manufacturing-adjacency keyword).
//   4. Balanced-delimiter scan the literal (string/comment/template aware).
//   5. vm.runInNewContext of the parenthesized literal in a Proxy sandbox (undefined refs ->
//      undefined, real globals like Math/Infinity preserved) -> JSON.stringify.
//   6. Dedup by NAME, keep the RICHEST variant (most records, then most bytes).
//   7. Categorize by name; atomic-write prism-reference-db/<category>/<NAME>.json + MANIFEST.json.
//   8. Cross-reference (advisory) against mcp-server/src/data/* — nothing overwritten.
//
// FAIL-LOUD (Karpathy R12): every read error, unbalanced literal, eval throw, timeout, or
// serialize failure is recorded in manifest.failed with {name, source, reason, bytes}. A skipped
// data-store-ish candidate (UPPER name we chose NOT to capture) is sampled into skippedStoreIshSample
// so under-capture is visible, never silent.
//
// USAGE:
//   node scripts/extract-monolith-databases.mjs            # dry-run (default) — counts only, no writes
//   node scripts/extract-monolith-databases.mjs --apply    # write prism-reference-db/
//   node scripts/extract-monolith-databases.mjs --limit 20 # smoke: first 20 source files only
//   node scripts/extract-monolith-databases.mjs --json     # machine-readable summary to stdout

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { atomicWriteJson, atomicWriteText } from "./lib/atomic-json.mjs";

const REPO = "H:/prism";
const PRISM_ROOT = "H:/PRISM";
const OUT_DIR = path.join(REPO, "mcp-server/data/prism-reference-db");
const SRC_DATA_DIR = path.join(REPO, "mcp-server/src/data");

// Explicit source files (raw monolith HTMLs) + dirs to walk for *.js modules.
const HTML_SOURCES = [
  path.join(PRISM_ROOT, "PRISM_v8_89_002_TRUE_100_PERCENT.html"),
  path.join(PRISM_ROOT, "PRISMv1.html"),
];
const JS_SOURCE_DIRS = [
  path.join(PRISM_ROOT, "extracted_modules"),
  path.join(PRISM_ROOT, "extracted"),
  path.join(PRISM_ROOT, "data/materials_complete"),
];

const SKIP_DIR = /(^|[\\/])(node_modules|\.git|dist|build)([\\/]|$)/i;
const MAX_WALK_DEPTH = 6;
const EVAL_TIMEOUT_MS = 5000;
const MAX_LITERAL_BYTES = 24 * 1024 * 1024; // 24MB guard — a single literal bigger than this is suspect

// ── source-store-name discrimination ──────────────────────────────────────────
// A name is a data store if it's UPPER_SNAKE (>=1 underscore) OR carries a manufacturing-data keyword.
// The keyword set encodes the operator's adjacency doctrine (tooling/inserts/holders/fixtures/
// materials/machines/coolants/...) so a lowercase-tailed var like P_STEELS_complete still qualifies.
const STORE_KEYWORDS =
  /(database|catalog|registry|library|dataset|_db$|^db_|inventory|specs?|grades?|table|knowledge|tribal|material|steel|stainless|alumin|alloy|titanium|inconel|carbide|tool|insert|holder|fixture|workhold|vise|chuck|collet|coolant|lubric|machine|spindle|controller|post|coating|abrasive|fastener|gauge|gage|feeds?|speeds?|gcode|mcode|dialect|program|template|strateg|model|stock|pallet|clamp|tombstone|jaw)/i;
const UPPER_SNAKE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;

function isDataStore(name) {
  if (!name || name.length < 4) return false;
  if (UPPER_SNAKE.test(name)) return true;
  if (/^PRISM/i.test(name)) return true;
  return STORE_KEYWORDS.test(name);
}
// "looks like a store but we skipped it" — for under-capture auditing. Surfaces both ALLCAPS-ish
// names and camelCase names ending in a data-ish suffix (so a skipped `barStockList`/`gageData`
// stays visible even though isDataStore declined it).
function looksStoreIsh(name) {
  if (!name || name.length < 5) return false;
  if (/^[A-Z]/.test(name) && /[A-Z]{3,}/.test(name)) return true;
  return /(Database|Catalog|Registry|Library|Inventory|Data|Table|List|Specs?|Grades?|Stock|Map)$/.test(name);
}

// ── categorization (ordered, most-specific first) ─────────────────────────────
const CATEGORY_RULES = [
  [/HOLDER|TOOLHOLDER|SHRINK|COLLET_CHUCK|CAPTO|HSK|BT[0-9]|CAT[0-9]/i, "holders"],
  [/INSERT|GRADE_CHIPBREAK|CHIPBREAK/i, "inserts"],
  [/COOLANT|LUBRIC|\bOIL\b|FLOOD|MIST|MQL|EMULSION/i, "coolants"],
  [/COATING|TIALN|ALTIN|\bTIN\b|TICN|\bDLC\b|NACRO|ZRN|ALCRN/i, "coatings"],
  [/FIXTURE|WORKHOLD|\bVISE\b|\bVICE\b|CHUCK|CLAMP|COLLET|PALLET|TOMBSTONE/i, "workholding"],
  [/ABRASIVE|GRINDING_WHEEL|\bWHEEL\b/i, "abrasives"],
  [/MATERIAL|STEEL|STAINLESS|ALUMIN|TITANIUM|ALLOY|INCONEL|BRASS|COPPER|\bISO_[PMKNSH]\b|SUPERALLOY|EXOTIC|HARDNESS/i, "materials"],
  [/CONTROLLER|FANUC|HAAS|OKUMA|SIEMENS|HEIDENHAIN|MAZAK|MITSUBISHI|BROTHER|FAGOR|MELDAS|\bGCODE\b|G_CODE|M_CODE/i, "controllers"],
  [/POST_PROCESSOR|POSTPROC|\bPOST\b/i, "post"],
  [/MACHINE|SPINDLE|\bVMC\b|\bHMC\b|\bLATHE\b|KINEMATIC|TRAVEL|RAPID|AXIS_LIMIT|ENVELOPE/i, "machines"],
  [/TOOLPATH|TOOL_PATH/i, "process"],
  [/TOOLS?\b|_TOOLS?\b|CUTTING_TOOL|DETAILED_TOOL|INSERT|DRILL|\bTAP\b|THREAD|REAMER|ENDMILL|END_MILL|FACE_MILL|BORING/i, "tools"],
  [/COST|PRICE|\bRATE\b|QUOTE|LABOR|MARKUP|OVERHEAD/i, "cost"],
  [/SAFETY|LIMIT|ALARM|GUARD|INTERLOCK|HAZARD/i, "safety"],
  [/CAD|GEOMETRY|FEATURE|NURBS|\bSTEP\b|\bDXF\b|TOPOLOGY|SURFACE/i, "cad"],
  [/PROCESS|OPERATION|STRATEG|CYCLE|MILLING|TURNING|GRIND|\bEDM\b|WIRE|PROGRAM|GCODE|MCODE|DIALECT/i, "process"],
  [/CONSTANT|PHYSICS|KIENZLE|TAYLOR|FORMULA|COEFFICIENT/i, "physics"],
  [/PROTOCOL|MTCONNECT|OPCUA|MACRO/i, "controllers"],
];
function categorize(name) {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(name)) return cat;
  return "other";
}

// ── balanced-delimiter literal extractor (string/comment/template aware) ──────
// Starts at the opening { or [. Returns the literal substring (inclusive) or null if unbalanced.
// Handles ' " ` strings (with backslash escapes), // and block comments, and template
// interpolation (which re-enters code mode so nested braces/strings count correctly).
function extractLiteral(src, start) {
  const stack = []; // '{' '[' for containers, '$' sentinel for an open template interpolation
  let mode = "code"; // code | sq | dq | tmpl | line | block
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (mode === "line") { if (c === "\n") mode = "code"; continue; }
    if (mode === "block") { if (c === "*" && n === "/") { i++; mode = "code"; } continue; }
    if (mode === "sq") { if (c === "\\") i++; else if (c === "'") mode = "code"; continue; }
    if (mode === "dq") { if (c === "\\") i++; else if (c === '"') mode = "code"; continue; }
    if (mode === "tmpl") {
      if (c === "\\") { i++; continue; }
      if (c === "`") { mode = "code"; continue; }
      if (c === "$" && n === "{") { stack.push("$"); i++; mode = "code"; continue; }
      continue;
    }
    // mode === "code"
    if (c === "/" && n === "/") { mode = "line"; i++; continue; }
    if (c === "/" && n === "*") { mode = "block"; i++; continue; }
    if (c === "/") {
      // regex literal vs division: a regex starts only where an expression is expected.
      // Look back to the previous significant char; if it begins an expression context,
      // skip the whole regex (incl. [char classes] whose [ ] { } must NOT affect depth).
      let j = i - 1;
      while (j >= start && /\s/.test(src[j])) j--;
      const p = j >= start ? src[j] : "";
      let regexCtx = p === "" || "=([{,:;!&|?+-*%^~<>".includes(p);
      if (!regexCtx && /[A-Za-z0-9_$]/.test(p)) {
        // preceding token may be a keyword that expects an expression (return /re/, typeof /re/, …)
        let w = j;
        while (w >= start && /[A-Za-z0-9_$]/.test(src[w])) w--;
        if (/^(return|typeof|instanceof|in|of|new|delete|void|yield|case|do|else|throw|await)$/.test(src.slice(w + 1, j + 1))) regexCtx = true;
      }
      if (regexCtx) {
        let k = i + 1;
        let inClass = false;
        for (; k < src.length; k++) {
          const rc = src[k];
          if (rc === "\\") { k++; continue; }
          if (rc === "\n") break; // unterminated — bail (treat as div, leave i)
          if (inClass) { if (rc === "]") inClass = false; continue; }
          if (rc === "[") { inClass = true; continue; }
          if (rc === "/") break; // closing delimiter; flags consumed as normal code next
        }
        if (k < src.length && src[k] === "/") { i = k; continue; }
      }
      continue; // division operator — just a normal code char
    }
    if (c === "'") { mode = "sq"; continue; }
    if (c === '"') { mode = "dq"; continue; }
    if (c === "`") { mode = "tmpl"; continue; }
    if (c === "{" || c === "[") { stack.push(c); continue; }
    if (c === "}") {
      const top = stack.pop();
      if (top === "$") { mode = "tmpl"; continue; } // end of template interpolation -> back into the string
      if (stack.length === 0) return src.slice(start, i + 1);
      continue;
    }
    if (c === "]") {
      stack.pop();
      if (stack.length === 0) return src.slice(start, i + 1);
      continue;
    }
    if (i - start > MAX_LITERAL_BYTES) return null; // runaway guard
  }
  return null; // never balanced
}

// ── sandboxed eval ────────────────────────────────────────────────────────────
// has:()=>true makes the with-scope claim every identifier, so undefined refs resolve via
// get -> undefined instead of throwing ReferenceError. Real globals (Math, Infinity, NaN, Date)
// are passed through so data using them survives. (vm is used intentionally; input is a literal
// substring of a repo-owned source file, not user input.)
function makeSandbox() {
  return new Proxy(Object.create(null), {
    has: () => true,
    get: (_t, k) => {
      if (k === Symbol.unscopables) return undefined;
      if (typeof k === "string" && k in globalThis) return globalThis[k];
      return undefined;
    },
  });
}
// Tolerant repair for the monolith's generated-data quirk: array/object elements emitted WITHOUT
// separating commas (e.g. `{...}\n{...}`). Mask strings/comments to spaces (preserving brackets +
// newlines + offsets), find every code-region value-closer `}`/`]` immediately followed by whitespace
// then a value-opener `{`/`[`, and splice a comma into the ORIGINAL literal at that gap. Only ever
// applied as a fallback AFTER a strict parse already failed — so it cannot corrupt a good store.
// Single-pass scanner that finds separator-repair edits WITHOUT building a masked copy of the literal
// (the prior mask-then-regex approach allocated an N-element array per call — OOM on the 11.6MB
// cutting-tool literal). O(n) time, O(edits) space. It walks the literal tracking string/comment mode
// (so a `}{` or `,,` inside a string/comment is ignored) and the last significant CODE char:
//   • value-closer `}`/`]` immediately followed (only whitespace between) by opener `{`/`[`  → INSERT a comma
//   • a comma right after another comma (`},,{`) or right after an opener (`{,` / `[,`)        → DELETE that comma
// Trailing commas (`,}` / `,]`) are legal JS and left untouched. `S` marks a just-closed string value.
function findRepairEdits(literal) {
  const inserts = []; // insert a comma at this index (between the closer and the opener)
  const deletes = []; // delete the char at this index (an extra comma)
  let mode = "code";
  let lastSig = "";   // last significant code char; "S" = a closed-string value
  let lastSigPos = -1;
  for (let i = 0; i < literal.length; i++) {
    const c = literal[i], n = literal[i + 1];
    if (mode === "line") { if (c === "\n") mode = "code"; continue; }
    if (mode === "block") { if (c === "*" && n === "/") { i++; mode = "code"; } continue; }
    if (mode === "sq") { if (c === "\\" && n !== undefined) i++; else if (c === "'") { mode = "code"; lastSig = "S"; lastSigPos = i; } continue; }
    if (mode === "dq") { if (c === "\\" && n !== undefined) i++; else if (c === '"') { mode = "code"; lastSig = "S"; lastSigPos = i; } continue; }
    if (mode === "tmpl") { if (c === "\\" && n !== undefined) i++; else if (c === "`") { mode = "code"; lastSig = "S"; lastSigPos = i; } continue; }
    if (c === "/" && n === "/") { mode = "line"; i++; continue; }
    if (c === "/" && n === "*") { mode = "block"; i++; continue; }
    if (c === "'") { mode = "sq"; continue; }
    if (c === '"') { mode = "dq"; continue; }
    if (c === "`") { mode = "tmpl"; continue; }
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v") continue; // whitespace keeps lastSig
    if (c === "{" || c === "[") {
      if (lastSig === "}" || lastSig === "]") inserts.push(lastSigPos + 1);
    } else if (c === ",") {
      if (lastSig === "," || lastSig === "{" || lastSig === "[") deletes.push(i);
    }
    lastSig = c;
    lastSigPos = i;
  }
  return { inserts, deletes };
}

// Combined tolerant repair — only ever called as a post-failure fallback; never touches a valid store.
// Applies inserts (+",") and deletes (skip char) in one ascending segment-join. O(n).
function repairSeparators(literal) {
  const { inserts, deletes } = findRepairEdits(literal);
  if (!inserts.length && !deletes.length) return null;
  const insSet = new Set(inserts);
  const delSet = new Set(deletes);
  const positions = [...new Set([...inserts, ...deletes])].sort((a, b) => a - b);
  const parts = [];
  let last = 0;
  for (const p of positions) {
    parts.push(literal.slice(last, p));
    if (insSet.has(p)) parts.push(",");
    last = delSet.has(p) ? p + 1 : p; // delete skips the char at p; insert keeps it for the next slice
  }
  parts.push(literal.slice(last));
  return parts.join("");
}

function evalOnce(literal) {
  const value = vm.runInNewContext("(" + literal + ")", makeSandbox(), { timeout: EVAL_TIMEOUT_MS });
  if (value === null || typeof value !== "object") return { ok: false, reason: "not-an-object-or-array" };
  let json;
  try {
    json = JSON.stringify(value);
  } catch (e) {
    return { ok: false, reason: "stringify:" + (e?.message || e) };
  }
  if (json === undefined) return { ok: false, reason: "serialized-undefined" };
  // recordCount MUST reflect what actually persists: JSON.stringify drops functions + undefined,
  // so count keys on the PARSED json, not the live object (else an all-method object reports
  // records but writes an empty {} — manifest lie). Re-parse also re-confirms the json is sound.
  let parsed;
  try { parsed = JSON.parse(json); } catch (e) { return { ok: false, reason: "reparse:" + (e?.message || e) }; }
  if (parsed === null || typeof parsed !== "object") return { ok: false, reason: "serialized-non-object" };
  const recordCount = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
  return { ok: true, json, recordCount, kind: Array.isArray(parsed) ? "array" : "object" };
}

// Skip the vm-compile of enormous literals: V8's parse phase is NOT covered by the execution timeout
// and a multi-MB compile both stalls the run (long enough for an external reaper to kill it) and spikes
// memory. The only literal over this cap in the corpus is an 11.6MB code+data hybrid that fails to
// eval anyway. Recorded loud in failed[] so it stays visible (R12), never silently dropped.
const MAX_EVAL_BYTES = 8 * 1024 * 1024;
function safeEval(literal) {
  if (literal.length > MAX_EVAL_BYTES) {
    return { ok: false, reason: `literal-too-large-skipped:${literal.length}` };
  }
  try {
    return evalOnce(literal);
  } catch (e) {
    // fallback: repair missing element separators and retry once
    const reason = (e?.message || String(e)).slice(0, 200);
    if (/Unexpected token|Invalid or unexpected/i.test(reason)) {
      const repaired = repairSeparators(literal);
      if (repaired && repaired !== literal) {
        try {
          const r = evalOnce(repaired);
          if (r.ok && r.recordCount > 0) return { ...r, recovered: true };
        } catch { /* fall through to original failure */ }
      }
    }
    return { ok: false, reason };
  }
}

// ── fs walk ──────────────────────────────────────────────────────────────────
function walkJs(dir, depth, out) {
  if (depth > MAX_WALK_DEPTH) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR.test(full)) continue;
      walkJs(full, depth + 1, out);
    } else if (e.isFile() && /\.js$/i.test(e.name)) {
      out.push(full);
    }
  }
}

// ── assignment finder (comment-blind) ─────────────────────────────────────────
// Preceding char is any non-identifier char (incl. `.` so `window.NAME =` captures NAME).
// Uses matchAll (global) — no shell, no child_process.
const ASSIGN_RE = /(?:^|[^A-Za-z0-9_$])([A-Za-z_$][A-Za-z0-9_$]*)\s*=(?!=)\s*([[{])/g;

function relSource(p) {
  return p.replace(/\\/g, "/").replace(PRISM_ROOT + "/", "PRISM/").replace(REPO + "/", "");
}

function main() {
  const args = process.argv.slice(2);
  const APPLY = args.includes("--apply");
  const JSON_OUT = args.includes("--json");
  const limIdx = args.indexOf("--limit");
  const LIMIT = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) : 0;
  if (APPLY && LIMIT > 0) {
    console.error("✗ refusing --apply with --limit: that would overwrite the full reference DB with a partial subset. --limit is for dry-run smoke only.");
    process.exitCode = 1;
    return;
  }

  // 1. collect source files
  const files = [...HTML_SOURCES.filter((f) => fs.existsSync(f))];
  for (const d of JS_SOURCE_DIRS) walkJs(d, 0, files);
  const sourceFiles = LIMIT > 0 ? files.slice(0, LIMIT) : files;

  // 2. extract
  const stores = new Map(); // NAME -> {name, category, source, kind, recordCount, bytes, json, prismPrefixed}
  const failed = [];
  const skippedNames = new Set();
  let candidateCount = 0;
  let fileReadErrors = 0;
  let emptyDropped = 0;
  let recoveredCount = 0;

  for (const file of sourceFiles) {
    let src;
    try {
      src = fs.readFileSync(file, "utf8");
    } catch (e) {
      fileReadErrors++;
      failed.push({ name: "(file)", source: relSource(file), reason: "read:" + (e?.message || e), bytes: 0 });
      continue;
    }
    for (const m of src.matchAll(ASSIGN_RE)) {
      const name = m[1];
      const bracketIdx = m.index + m[0].length - 1; // index of the [ or {
      if (!isDataStore(name)) {
        if (looksStoreIsh(name)) skippedNames.add(name);
        continue;
      }
      candidateCount++;
      const literal = extractLiteral(src, bracketIdx);
      if (literal == null) {
        failed.push({ name, source: relSource(file), reason: "unbalanced-literal", bytes: 0 });
        continue;
      }
      const ev = safeEval(literal);
      if (!ev.ok) {
        failed.push({ name, source: relSource(file), reason: ev.reason, bytes: literal.length });
        continue;
      }
      if (ev.recordCount === 0) { emptyDropped++; continue; } // all-method/code object or empty literal — not data
      if (ev.recovered) recoveredCount++;
      const bytes = ev.json.length;
      const prev = stores.get(name);
      // dedup: keep richest (more records, tiebreak more bytes)
      if (!prev || ev.recordCount > prev.recordCount || (ev.recordCount === prev.recordCount && bytes > prev.bytes)) {
        stores.set(name, {
          name,
          category: categorize(name),
          source: relSource(file),
          kind: ev.kind,
          recordCount: ev.recordCount,
          bytes,
          json: ev.json,
          prismPrefixed: /^PRISM/i.test(name),
          recovered: Boolean(ev.recovered),
        });
      }
    }
  }

  // 2b. failure-reason histogram (R12 — size the "are we losing real data?" question).
  // computed-runtime-ref = the literal references this./other objects/new X() → not pure data (correct miss).
  // parse-error = the only class that could hide recoverable data; tracked separately so it stays visible.
  const failReasonHistogram = {};
  const classifyFail = (r) => {
    if (/not a constructor|is not a function|not iterable|Cannot read propert|is not defined|Cannot convert/i.test(r)) return "computed-runtime-ref";
    if (/Unexpected token|Invalid or unexpected/i.test(r)) return "parse-error";
    if (/unbalanced-literal/i.test(r)) return "unbalanced";
    if (/timed out|timeout/i.test(r)) return "timeout";
    if (/stringify|serialized-undefined/i.test(r)) return "serialize";
    if (/^read:/i.test(r)) return "file-read";
    if (/not-an-object-or-array/i.test(r)) return "not-object";
    return "other";
  };
  for (const f of failed) failReasonHistogram[classifyFail(f.reason)] = (failReasonHistogram[classifyFail(f.reason)] || 0) + 1;

  // 3. category tallies
  const byCategory = {};
  for (const s of stores.values()) {
    (byCategory[s.category] ||= { count: 0, records: 0, bytes: 0 });
    byCategory[s.category].count++;
    byCategory[s.category].records += s.recordCount;
    byCategory[s.category].bytes += s.bytes;
  }

  // 4. advisory cross-ref against src/data (nothing overwritten — different tree)
  let srcDataFiles = [];
  try {
    srcDataFiles = fs.readdirSync(SRC_DATA_DIR).filter((f) => /\.(json|ts)$/i.test(f));
  } catch {}
  const srcDataLower = srcDataFiles.map((f) => ({ file: f, norm: f.toLowerCase().replace(/[^a-z0-9]/g, "") }));
  const crossRef = [];
  for (const s of stores.values()) {
    const tokens = s.name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
    const hits = new Set();
    for (const t of tokens) for (const d of srcDataLower) if (d.norm.includes(t)) hits.add(d.file);
    if (hits.size) crossRef.push({ name: s.name, category: s.category, srcDataOverlap: [...hits].slice(0, 8) });
  }

  // 5. summary
  const summary = {
    schemaVersion: "1.0.0",
    generatedFromSession: "claude-a6304a93/juliett",
    mode: APPLY ? "apply" : "dry-run",
    sourceFilesScanned: sourceFiles.length,
    sourceFilesTotal: files.length,
    fileReadErrors,
    candidateAssignments: candidateCount,
    storesExtracted: stores.size,
    storesFailed: failed.length,
    emptyDropped,
    recoveredViaCommaRepair: recoveredCount,
    totalRecords: [...stores.values()].reduce((a, s) => a + s.recordCount, 0),
    totalBytes: [...stores.values()].reduce((a, s) => a + s.bytes, 0),
    prismPrefixed: [...stores.values()].filter((s) => s.prismPrefixed).length,
    byCategory,
    failReasonHistogram,
    skippedStoreIshSample: [...skippedNames].sort().slice(0, 60),
    crossRefCount: crossRef.length,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("\n=== extract-monolith-databases (" + summary.mode + ") ===");
    console.log(`source files: ${summary.sourceFilesScanned}/${summary.sourceFilesTotal}  (read errors: ${fileReadErrors})`);
    console.log(`candidate assignments: ${candidateCount}  ->  stores extracted: ${stores.size}  failed: ${failed.length}`);
    console.log(`total records: ${summary.totalRecords.toLocaleString()}  bytes: ${(summary.totalBytes / 1e6).toFixed(1)}MB  (PRISM_-prefixed: ${summary.prismPrefixed}, comma-repaired: ${recoveredCount})`);
    console.log("\nby category:");
    for (const [cat, v] of Object.entries(byCategory).sort((a, b) => b[1].records - a[1].records)) {
      console.log(`  ${cat.padEnd(13)} ${String(v.count).padStart(4)} stores  ${String(v.records).padStart(8)} records  ${(v.bytes / 1e6).toFixed(1)}MB`);
    }
    const top = [...stores.values()].sort((a, b) => b.recordCount - a.recordCount).slice(0, 15);
    console.log("\ntop 15 stores by record count:");
    for (const s of top) console.log(`  ${String(s.recordCount).padStart(6)}  ${s.category.padEnd(12)} ${s.name}  <- ${s.source}`);
    if (failed.length) {
      console.log(`\nfailed (${failed.length}) by reason:`);
      for (const [r, n] of Object.entries(failReasonHistogram).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${String(n).padStart(5)}  ${r}`);
      }
      console.log(`empty-dropped (all-method/code or empty literal, not data): ${emptyDropped}`);
      const parseFails = failed.filter((f) => /Unexpected token|Invalid or unexpected/i.test(f.reason));
      if (parseFails.length) {
        console.log(`\nparse-error stores (the only class that could hide real data) — first 12:`);
        for (const f of parseFails.slice(0, 12)) console.log(`  ${f.name}  <- ${f.source}`);
      }
    }
    if (summary.skippedStoreIshSample.length) {
      console.log(`\nskipped store-ish names (audit for under-capture) — sample:`);
      console.log("  " + summary.skippedStoreIshSample.join(", "));
    }
    console.log(`\ncross-ref vs src/data: ${crossRef.length} stores overlap an existing src/data file (advisory — nothing overwritten)`);
  }

  // 6. writes — ONE bundle file per category (NOT one file per store). 1859 tiny files triggered a
    // per-file Defender/AV scan storm on Windows that made the write take minutes (long enough for an
    // external reaper to kill the run mid-write). ~17 bundles write in <1s. Bundles are still
    // "separate by category + cross-referenced" and distinct-case names (MACHINES vs machines) are
    // distinct JSON keys, so the NTFS case-collision problem disappears entirely.
  if (APPLY) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    // Prune stale artifacts from a prior run: a category that produces zero stores this run must not
    // leave an orphan <category>.json that a directory-enumerating consumer would still pick up
    // (MANIFEST + every current bundle are rewritten fresh immediately below).
    try {
      for (const f of fs.readdirSync(OUT_DIR)) if (/\.(json|md)$/i.test(f)) fs.rmSync(path.join(OUT_DIR, f), { force: true });
    } catch { /* fresh dir */ }
    const manifestStores = [];
    const writeErrors = [];
    // group stores by category (preserve insertion order); names are globally unique post-dedup.
    const buckets = new Map(); // category -> [{name, json}]
    for (const s of stores.values()) {
      if (!buckets.has(s.category)) buckets.set(s.category, []);
      buckets.get(s.category).push(s);
      manifestStores.push({
        name: s.name, category: s.category, source: s.source, kind: s.kind,
        recordCount: s.recordCount, bytes: s.bytes, prismPrefixed: s.prismPrefixed,
        recovered: s.recovered, bundle: `${s.category}.json`,
      });
    }
    for (const [cat, list] of buckets) {
      const outPath = path.join(OUT_DIR, cat + ".json");
      // build the bundle JSON by concatenating ALREADY-serialized store strings — no parse/re-stringify.
      const body = list.map((s) => JSON.stringify(s.name) + ":" + s.json).join(",");
      const json = `{"category":${JSON.stringify(cat)},"count":${list.length},"stores":{${body}}}`;
      try {
        const tmp = `${outPath}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, json);
        fs.renameSync(tmp, outPath);
      } catch (e) {
        writeErrors.push({ category: cat, error: (e?.message || String(e)).slice(0, 150) });
      }
    }
    if (writeErrors.length) console.log(`\n⚠ ${writeErrors.length} bundle(s) failed to write (see MANIFEST.writeErrors)`);
    manifestStores.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    atomicWriteJson(path.join(OUT_DIR, "MANIFEST.json"), {
      ...summary,
      generatedBy: "scripts/extract-monolith-databases.mjs",
      layout: "one JSON bundle per category; each bundle = {category, count, stores:{<NAME>:<data>}}",
      storeNamesCaseSensitive: true, // MACHINES / Machines / machines are DISTINCT stores — consumers must NOT lowercase-key
      bundlesWritten: buckets.size - writeErrors.length,
      storesWritten: manifestStores.length,
      writeErrorCount: writeErrors.length,
      note: "Separate, cross-referenced PRISM reference DB extracted from monolith HTMLs + split modules. Tooling lives in jm-die-database/ (cross-ref, not duplicated here). Nothing in src/data was overwritten.",
      stores: manifestStores,
      writeErrors,
      failed,
      crossRef,
    });
    atomicWriteText(path.join(OUT_DIR, "README.md"),
      "# PRISM Reference DB (extracted from the monolith)\n\n" +
      `Generated by \`scripts/extract-monolith-databases.mjs\`. ${stores.size} data stores across ${Object.keys(byCategory).length} categories ` +
      `(${summary.totalRecords.toLocaleString()} records, ${(summary.totalBytes / 1e6).toFixed(1)}MB), written as one \`<category>.json\` bundle per category.\n\n` +
      "Each bundle is `{ category, count, stores: { <NAME>: <data>, … } }`. Look up a store by name inside its category bundle; `MANIFEST.json` maps every store name → category + bundle + recordCount.\n\n" +
      "**Store names are case-sensitive.** `MACHINES`, `Machines`, and `machines` are THREE distinct stores (different monolith definitions) and coexist as distinct keys. Consumers (ERP / quoting / post) must key by the exact name — do NOT lowercase-normalize, or you will collide distinct datasets.\n\n" +
      "Sources: the 2 non-modular monolith HTMLs + `extracted_modules/` + `extracted/` + `data/materials_complete/` on `H:/PRISM`.\n\n" +
      "This is **separate and cross-referenced** — tooling/holders live in `../jm-die-database/`; nothing in `mcp-server/src/data/` was overwritten. " +
      "See `MANIFEST.json` for the per-store index, `failed[]` for fail-loud extraction misses, and `crossRef[]` for src/data overlaps.\n\n" +
      "## Categories\n\n" +
      Object.entries(byCategory).sort((a, b) => b[1].records - a[1].records)
        .map(([c, v]) => `- **${c}** (\`${c}.json\`) — ${v.count} stores, ${v.records.toLocaleString()} records`).join("\n") + "\n");
    console.log(`\nwrote ${buckets.size} category bundles (${stores.size} stores) + MANIFEST.json + README.md -> ${path.relative(REPO, OUT_DIR).replace(/\\/g, "/")}`);
  } else if (!JSON_OUT) {
    console.log(`\n(dry-run — no files written. Re-run with --apply to write ${stores.size} stores to ${path.relative(REPO, OUT_DIR).replace(/\\/g, "/")})`);
  }

  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

export {
  extractLiteral, safeEval, isDataStore, categorize, looksStoreIsh, ASSIGN_RE,
  repairSeparators, findRepairEdits,
};
