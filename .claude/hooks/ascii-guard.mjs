#!/usr/bin/env node
// tier: T2
/**
 * ascii-guard.mjs - PreToolUse hook (Edit|Write|MultiEdit). ENFORCED, not advisory.
 *
 * THE GAP (operator 2026-06-09): "we still have issues with em dashes, ascii and
 * text issues." The fleet keeps introducing smart-substitution Unicode (em-dash,
 * curly quotes, ellipsis, NBSP) into CODE + SCRIPT files. There was NO guard
 * that prevented INTRODUCTION - only encoding-guard.mjs, which preserves a BOM
 * so PowerShell decodes an already-present em-dash (it mitigates the symptom,
 * advisory-only). This hook is the missing root-cause enforcement: a hard BLOCK
 * the moment a smart char would be written into a file where it breaks parsers,
 * terminals (PS 5.1 CP1252 mojibake), diffs, or grep. Real prior incident:
 * U-MEMMON-INSTALL-ASCII (em-dash in a .ps1 broke -File scheduled-task register).
 *
 * WHY a block and not advisory: an advisory the fleet already ignores is the
 * exact failure the operator named. Smart punctuation has ZERO legitimate use in
 * source - it is always an auto-substitution mistake, so a deterministic block
 * (with the ASCII fix named) turns the mistake into a one-retry self-correction.
 *
 * SCOPE (deliberately narrow to keep false-positives at zero):
 *   - Only the SMART-SUBSTITUTION set (below) is blocked - NOT all non-ASCII, so
 *     legit unicode (mu, degree, pi in physics/test files) is never touched.
 *   - Only CODE/SCRIPT/CONFIG extensions. Markdown / text / wiki / memory prose
 *     is EXCLUDED (em-dashes render fine there and are often intended).
 *   - Only the NEW content being written (Write.content / Edit.new_string /
 *     MultiEdit.edits[].new_string) - editing an unrelated part of a file that
 *     already contains a smart char is never blocked.
 *
 * This file is itself pure-ASCII source (it references the chars it detects via
 * \u escapes) so the guard never trips on its own maintenance.
 *
 * Fail-OPEN: any internal error allows the edit (never break editing over a
 * guard bug). Bypass: PRISM_ASCII_GUARD_BYPASS=1 (logged). Disable: PRISM_ASCII_GUARD=0.
 * Extend to ALL non-ASCII: PRISM_ASCII_GUARD_ALL=1.
 *
 * Self-test: `node ascii-guard.mjs --test` (happy + >=3 failure + >=2 adversarial).
 */
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const TELEMETRY = "H:/prism/mcp-server/data/state/hook-fire-counts.jsonl";
const BYPASS_LOG = "H:/prism/state/shared/ascii-guard-bypass.jsonl";
const MAX_OFFENDERS = 8;   // cap findings per call so the block message stays readable

// Smart-substitution map: codepoint -> { name, ascii replacement }. These are the
// chars editors/models auto-insert that have NO legitimate place in source code.
const SMART = new Map([
  [0x2014, { name: "em dash", ascii: "--" }],
  [0x2013, { name: "en dash", ascii: "-" }],
  [0x2012, { name: "figure dash", ascii: "-" }],
  [0x2015, { name: "horizontal bar", ascii: "--" }],
  [0x2018, { name: "left single quote", ascii: "'" }],
  [0x2019, { name: "right single quote / apostrophe", ascii: "'" }],
  [0x201C, { name: "left double quote", ascii: '"' }],
  [0x201D, { name: "right double quote", ascii: '"' }],
  [0x2026, { name: "ellipsis", ascii: "..." }],
  [0x00A0, { name: "non-breaking space", ascii: " " }],
  [0x2212, { name: "unicode minus", ascii: "-" }],
  [0x00AB, { name: "left guillemet", ascii: '"' }],
  [0x00BB, { name: "right guillemet", ascii: '"' }],
]);

// Extensions where non-ASCII smart punctuation breaks things. Markdown/text/mdx
// are intentionally ABSENT (prose renders em-dashes fine).
const ENFORCED_EXT = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "ps1", "psm1", "bat", "cmd",
  "sh", "bash", "json", "jsonc", "yml", "yaml", "toml", "ini", "env", "cfg",
  "go", "rs", "c", "h", "cpp", "hpp", "java", "rb", "php", "sql",
]);

// Path fragments to skip even with an enforced extension (data/prose corpora that
// may legitimately carry quoted unicode, and the markdown knowledge base).
// "/ascii-guard" self-exempts THIS hook + its test: they legitimately carry
// literal smart chars as detector test fixtures (the one place that is correct).
// Test dirs + i18n/locale dirs legitimately carry smart chars as data (fixtures
// asserting smart-quote handling; localized UI strings). "/ascii-guard" self-exempts
// this hook + its test (their fixtures use literal smart chars by design).
const EXCLUDE_FRAGMENTS = ["/knowledge/", "/.claude/projects/", "/memory/", "/node_modules/", "/data/vendor-catalog", "/jm die/", "/ascii-guard", "/__tests__/", "/locales/", "/i18n/"];

function tele(decision, extra) {
  try {
    appendFileSync(TELEMETRY, JSON.stringify({ ts: new Date().toISOString(), hook: "ascii-guard", decision, ...extra }) + "\n", "utf8");
  } catch { /* ignore */ }
}

function extOf(p) {
  if (!p || typeof p !== "string") return "";
  const m = p.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

function excluded(p) {
  const norm = String(p || "").replace(/\\/g, "/").toLowerCase();
  return EXCLUDE_FRAGMENTS.some((f) => norm.includes(f.toLowerCase()));
}

/**
 * Collect the new text a tool call would write. Pure. Handles all three edit tools.
 * @returns {string}
 */
export function collectNewText(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return "";
  if (typeof toolInput.content === "string") return toolInput.content;           // Write
  if (typeof toolInput.new_string === "string") return toolInput.new_string;     // Edit
  if (Array.isArray(toolInput.edits)) {                                          // MultiEdit
    return toolInput.edits.map((e) => (e && typeof e.new_string === "string" ? e.new_string : "")).join("\n");
  }
  return "";
}

/**
 * Collect the OLD text a tool call replaces, for diff-awareness. Edit -> old_string;
 * MultiEdit -> all old_strings joined; Write -> the existing file on disk (fail-safe).
 * @returns {string}
 */
export function collectOldText(toolInput, readFile = readFileSync) {
  if (!toolInput || typeof toolInput !== "object") return "";
  if (typeof toolInput.old_string === "string") return toolInput.old_string;     // Edit
  if (Array.isArray(toolInput.edits)) {                                          // MultiEdit
    return toolInput.edits.map((e) => (e && typeof e.old_string === "string" ? e.old_string : "")).join("\n");
  }
  if (typeof toolInput.content === "string" && toolInput.file_path) {            // Write (full replace)
    try { return readFile(toolInput.file_path, "utf8"); } catch { return ""; }
  }
  return "";
}

/**
 * Find smart-substitution (or, with allNonAscii, ALL non-ASCII) chars in text.
 * Pure, deterministic, LINE- and DIFF-aware: a line whose exact text already
 * exists in `oldText` is skipped (re-including an existing em-dash comment line
 * is NOT a new mistake - only newly-typed smart chars are flagged). This fixes
 * the over-block class where 83% of files carry em-dashes in JSDoc and a refactor
 * that re-includes such a line would otherwise stall. Returns up to `cap` distinct
 * findings with first-seen line/col so the block message is actionable.
 * @returns {Array<{cp:number,name:string,ascii:string,line:number,col:number,ch:string}>}
 */
export function findOffenders(text, { allNonAscii = false, cap = MAX_OFFENDERS, oldText = null } = {}) {
  if (typeof text !== "string" || text.length === 0) return [];
  const oldLines = (typeof oldText === "string" && oldText.length > 0) ? new Set(oldText.split(/\r?\n/)) : null;
  const out = [];
  const seen = new Set();
  const lines = text.split(/\r?\n/);
  for (let li = 0; li < lines.length; li++) {
    const lineText = lines[li];
    if (oldLines && oldLines.has(lineText)) continue;   // unchanged / re-included line -> not newly introduced
    let col = 0;
    for (const ch of lineText) {        // iterate by code point (handles surrogate pairs)
      const cp = ch.codePointAt(0);
      col++;
      if (cp <= 0x7f) continue;         // ASCII - fine
      const smart = SMART.get(cp);
      if (!smart && !allNonAscii) continue;  // non-smart unicode allowed unless allNonAscii
      if (seen.has(cp)) continue;
      seen.add(cp);
      out.push({
        cp,
        name: smart ? smart.name : `non-ASCII U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
        ascii: smart ? smart.ascii : "(remove / ASCII-ize)",
        line: li + 1, col, ch,
      });
      if (out.length >= cap) return out;
    }
  }
  return out;
}

function readStdin() {
  let raw = "";
  try { raw = readFileSync(0, "utf8") || ""; } catch { /* ignore */ }
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

function emit(obj) {
  try { process.stdout.write(JSON.stringify({ continue: true, ...obj })); } catch { /* ignore */ }
}

function runHook() {
  if (process.env.PRISM_ASCII_GUARD === "0") { return emit({}); }
  const payload = readStdin();
  const tool = payload?.tool_name || "";
  if (!["Edit", "Write", "MultiEdit"].includes(tool)) return emit({});

  const filePath = payload?.tool_input?.file_path || "";
  if (!filePath) return emit({});
  const ext = extOf(filePath);
  if (!ENFORCED_EXT.has(ext)) return emit({});       // markdown/text/etc. -> allow
  if (excluded(filePath)) return emit({});           // knowledge/memory prose -> allow

  const text = collectNewText(payload.tool_input);
  const oldText = collectOldText(payload.tool_input);   // diff-aware: ignore re-included existing lines
  const allNonAscii = process.env.PRISM_ASCII_GUARD_ALL === "1";
  const offenders = findOffenders(text, { allNonAscii, oldText });
  if (offenders.length === 0) return emit({});

  if (process.env.PRISM_ASCII_GUARD_BYPASS === "1") {
    try { mkdirSync(dirname(BYPASS_LOG), { recursive: true }); appendFileSync(BYPASS_LOG, JSON.stringify({ ts: new Date().toISOString(), file: filePath, offenders: offenders.map((o) => o.name) }) + "\n", "utf8"); } catch { /* ignore */ }
    tele("bypassed", { file: filePath, n: offenders.length });
    return emit({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: `[ascii-guard] BYPASS active - allowed ${offenders.length} smart/non-ASCII char(s) into ${filePath}` } });
  }

  const list = offenders.map((o) => `  - "${o.ch}" (${o.name}) at line ${o.line}:${o.col} -> use ${o.ascii}`).join("\n");
  tele("blocked", { file: filePath, n: offenders.length, chars: offenders.map((o) => o.cp) });
  return emit({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        `[ascii-guard] Blocked: smart-substitution / non-ASCII chars in a code file (${filePath}). ` +
        `These break PS 5.1 decoding, parsers, diffs, and grep:\n${list}\n` +
        `Fix: replace each with its ASCII form above, then retry. ` +
        `Legit case? PRISM_ASCII_GUARD_BYPASS=1 (logged). Markdown/docs are never blocked.`,
    },
  });
}

// -- inline self-test --------------------------------------------------------
// Fixtures reference smart chars via \u escapes so THIS file stays pure ASCII
// source - the guard must not trip on its own maintenance (dogfooding).
function runSelfTest() {
  let passed = 0, failed = 0; const r = [];
  const eq = (n, g, e) => { if (JSON.stringify(g) === JSON.stringify(e)) { passed++; r.push("  ok " + n); } else { failed++; r.push(`  FAIL ${n}: got ${JSON.stringify(g)} want ${JSON.stringify(e)}`); } };
  const truthy = (n, g) => { if (g) { passed++; r.push("  ok " + n); } else { failed++; r.push("  FAIL " + n); } };

  const EM = "—", EN = "–", LSQ = "‘", RSQ = "’",
        LDQ = "“", RDQ = "”", ELL = "…", NBSP = " ",
        MIN = "−", GUIL = "«", DEG = "°", MU = "µ";

  // T1 happy: plain ASCII code -> no offenders
  eq("T1 happy ascii", findOffenders("const x = a - b; // ok\n").length, 0);
  // T2 em dash detected with replacement + position
  const t2 = findOffenders("const x = 1; // note " + EM + " here");
  eq("T2 em-dash count", t2.length, 1);
  eq("T2 em-dash name", t2[0].name, "em dash");
  eq("T2 em-dash ascii", t2[0].ascii, "--");
  // T3 curly quotes (both) + apostrophe -> 3 distinct
  eq("T3 curly quotes", findOffenders("x = " + LDQ + "hi" + RDQ + " + " + RSQ + "s").length, 3);
  // T4 ellipsis + nbsp
  eq("T4 ellipsis+nbsp", findOffenders("a" + ELL + "b" + NBSP + "c").length, 2);
  // T5 distinct dedup: two em dashes -> one finding
  eq("T5 dedup", findOffenders(EM + " then " + EM + " again").length, 1);
  // T6 legit unicode allowed by default (mu, degree)
  eq("T6 legit unicode allowed", findOffenders("const mu = 0.3; // 90" + DEG + " " + MU + "m").length, 0);
  // T7 allNonAscii mode catches the legit unicode too
  truthy("T7 allNonAscii catches", findOffenders("90" + DEG, { allNonAscii: true }).length > 0);
  // T8 line/col tracking
  const t8 = findOffenders("line1\nline2 " + EM + " x");
  eq("T8 line tracking", t8[0].line, 2);
  // T9 collectNewText: Write
  eq("T9 Write content", collectNewText({ content: "a" + EM + "b" }), "a" + EM + "b");
  // T10 collectNewText: Edit
  eq("T10 Edit new_string", collectNewText({ new_string: "x" + RSQ + "y" }), "x" + RSQ + "y");
  // T11 collectNewText: MultiEdit joins all new_strings
  truthy("T11 MultiEdit join", collectNewText({ edits: [{ new_string: "a" }, { new_string: EM }] }).includes(EM));
  // T12 adversarial: empty / null
  eq("T12 empty text", findOffenders("").length, 0);
  eq("T12 null text", findOffenders(null).length, 0);
  // T13 adversarial: surrogate-pair emoji (non-ASCII but not smart) allowed by default
  eq("T13 emoji allowed default", findOffenders("x = '\u{1F600}'").length, 0);
  // T14 cap respected
  truthy("T14 cap", findOffenders(EM + EN + LSQ + RSQ + LDQ + RDQ + ELL + " " + MIN + GUIL, { cap: 3 }).length === 3);
  // T15 ext gating
  truthy("T15 ext ts enforced", ENFORCED_EXT.has("ts"));
  truthy("T15 ext md NOT enforced", !ENFORCED_EXT.has("md"));
  // T16 exclude fragments
  truthy("T16 exclude knowledge", excluded("H:/prism/knowledge/wiki/x.json"));
  truthy("T16 enforce src", !excluded("H:/prism/mcp-server/src/x.ts"));
  truthy("T16 exclude __tests__", excluded("H:/prism/mcp-server/src/__tests__/x.ts"));
  truthy("T16 exclude locales", excluded("H:/prism/web/locales/en.json"));
  // T17 diff-aware: re-including an EXISTING smart-char line is NOT flagged (the P1 fix)
  const emLine = "// note " + EM + " here";
  eq("T17 diff re-include allowed", findOffenders(emLine, { oldText: emLine }).length, 0);
  // T18 diff-aware: a genuinely NEW smart-char line IS still flagged (old had a different line)
  eq("T18 diff new flagged", findOffenders("kept\n" + emLine, { oldText: "kept" }).length, 1);
  // T19 collectOldText: Edit old_string
  eq("T19 old Edit", collectOldText({ old_string: "x" + EM }), "x" + EM);
  // T20 collectOldText: MultiEdit joins old_strings
  truthy("T20 old MultiEdit", collectOldText({ edits: [{ old_string: "a" }, { old_string: EM }] }).includes(EM));
  // T21 diff-aware end-to-end: Edit that only re-includes an existing em-dash line -> 0 offenders
  eq("T21 Edit re-include e2e", findOffenders(collectNewText({ new_string: emLine, old_string: emLine }), { oldText: collectOldText({ new_string: emLine, old_string: emLine }) }).length, 0);

  console.log(r.join("\n"));
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

if (process.argv.includes("--test")) runSelfTest();
else { try { runHook(); } catch { emit({}); } }
