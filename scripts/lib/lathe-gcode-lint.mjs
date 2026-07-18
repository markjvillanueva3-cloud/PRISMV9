// lathe-gcode-lint.mjs — pure turning-program PHYSICS/SAFETY lint lib (slot:whiskey)
//
// Encodes the whiskey galaxy's 8 validated lathe gotchas
// (mcp-server/src/engines/lathe/CLAUDE.md §5) as deterministic PASS/FAIL checks
// against turning G-code TEXT or a turning program-PLAN object. PURE — no engine,
// no dist build, no MCP. Runs in milliseconds when port 3100 is down.
//
// REUSE (R8 — orchestrate existing helpers, do not re-implement):
//   - extractProgramParameters(text) / parseBlocks(text)  ← lathe-quality-pipeline.mjs
//   - validateG76Thread({controller,blocks}, ctx)         ← lathe-g76-thread-validator.mjs (gotcha #4)
//
// DISTINCT from scripts/post-nc-dialect-lint.mjs (slot:echo) which lints controller
// DIALECT SYNTAX + safety-ORDERING — zero rule overlap (grep-verified: echo's tool
// has no G50/G96/G71/G75/G76/boring/parting/IPR coverage). The two compose: a lathe
// program should pass BOTH (dialect-correct AND physics-safe).
//
// Gotcha coverage:
//   #1 G96 CSS without G50 S cap        → css-no-rpm-cap      ERROR  (text)
//   #2 boring-bar L/D > limit           → boring-bar-ld       ERROR  (plan)
//   #3 nose-radius Ra over target       → nose-radius-ra      WARN   (plan)
//   #4 single-point threading           → thread-*            (delegated to G76 validator) (text)
//   #5 deep parting/groove without G75  → partoff-no-peck     INFO   (text)
//   #7 C-axis contour without polar     → caxis-no-polar      WARN   (text)
//   #8 IPR/IPM feed-mode confusion      → feed-mode-*         WARN/INFO (text)
// (#6 sub-spindle phase needs M-transfer + phase-sync semantics not detectable from
//  raw text without a controller M-map — deferred to a future plan-mode field.)
//
// Authored 2026-05-29 by slot:whiskey (claude-57dfea65) — /goal "generate skills,
// scripts and hooks for your domain for better efficiency, higher quality output".

import { parseBlocks, extractProgramParameters } from "../lathe-quality-pipeline.mjs";
import { validateG76Thread } from "./lathe-g76-thread-validator.mjs";

export const SEVERITY_RANK = { ERROR: 3, WARN: 2, INFO: 1 };
// Boring-bar L/D rule-of-thumb limits (Sandvik/Kennametal field practice). These are
// geometry heuristics, NOT cutting-force constants, so no physics/constants.ts import.
export const LD_LIMIT = { steel: 4, carbide: 6 };
// Max chars scanned per line — bounds the comment-strip regex cost (ReDoS/O(n²) guard).
const MAX_LINE = 10000;
// Map the G76 validator's severity convention (P0/P1/P2) onto ours.
const G76_SEV = { P0: "ERROR", P1: "WARN", P2: "INFO" };

const MOTION = new Set(["G00", "G01", "G02", "G03"]);

/**
 * Lint turning G-code TEXT against the code-detectable gotchas.
 * @param {string} text  raw NC / .MIN / .eia program text
 * @param {{controller?:string, iso_group?:string, material_grade?:string}} [ctx]
 * @returns {Array<{rule,severity,line,msg,fix,source}>}
 */
export function lintLatheGcode(text, ctx = {}) {
  const findings = [];
  if (typeof text !== "string" || text.trim() === "") return findings;
  const controller = ctx.controller || "fanuc";
  // Comment-stripped view (Fanuc () + Okuma OSP []), per-line so line indices and
  // counts are preserved. Feeds ALL detection — including the reused
  // extractProgramParameters / parseBlocks (which regex raw text) — so a code inside
  // a comment can never false-trigger a rule.
  // Per-line length cap BEFORE the comment-strip regexes: /\([^)]*\)/ is O(n²) on a
  // single pathological long line (unmatched parens). No real NC line approaches 10k
  // chars, so truncating a longer line for the scan is safe and defuses the regex-DoS
  // surface for both the CLI (8MB single-line case) and the PostToolUse hook.
  const codeText = text.split(/\r?\n/)
    .map((l) => (l.length > MAX_LINE ? l.slice(0, MAX_LINE) : l).replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " "))
    .join("\n");
  const blocks = parseBlocks(codeText);          // [{idx, text, g:"G01", x, z, f, ...}] — Y/C NOT captured (lathe-centric BLOCK_ARG_RE)
  const params = extractProgramParameters(codeText); // {rpm_cap, css_m_min, ...}
  const upper = codeText.toUpperCase();

  // R1 (#1) — CSS overspeed cap: G96 active but no G50 S<max> clamp. FLAGSHIP (ERROR).
  if (params.css_m_min != null && params.rpm_cap == null) {
    const g96 = blocks.find((b) => b.g === "G96");
    findings.push({
      rule: "css-no-rpm-cap", severity: "ERROR", line: g96 ? g96.idx + 1 : 0,
      msg: "G96 constant-surface-speed without a G50 S<max> spindle clamp — RPM runs up as diameter shrinks → chuck overspeed / part ejection.",
      fix: "Add G50 S<max-rpm> before the first G96 move (canonical fail-loud check; missing = -20 quality rubric).",
    });
  }

  // R2 (#8) — feed-mode IPR/IPM.
  const g94 = /\bG94\b/.test(upper);
  const g95 = /\bG95\b/.test(upper);
  const hasFeed = /\bF\s*\.?\d/.test(upper);
  if (g94 && g95) {
    findings.push({ rule: "feed-mode-mixed", severity: "WARN", line: 0,
      msg: "Both G94 (feed/min, IPM) and G95 (feed/rev, IPR) present — a mid-program mode switch risks a 10x feed error.",
      fix: "Use one feed mode; turning is normally G95 (IPR)." });
  } else if (g94 && !g95) {
    findings.push({ rule: "feed-mode-ipm", severity: "WARN", line: 0,
      msg: "G94 (feed/min, IPM) in a turning program — turning is normally G95 (feed/rev, IPR); confirm F values aren't a 10x error.",
      fix: "Confirm IPM is intended; else switch to G95 (feed/rev)." });
  } else if (hasFeed && !g94 && !g95) {
    findings.push({ rule: "feed-mode-undeclared", severity: "INFO", line: 0,
      msg: "F feed words present but no G94/G95 feed-mode declared — relying on controller default (IPR vs IPM ambiguity).",
      fix: "Declare G95 (or G94) explicitly at program top." });
  }

  // R3 (#4) — threading: delegate to the existing G76 validator (no re-implement).
  const thr = validateG76Thread({ controller, blocks }, ctx);
  for (const i of (thr && Array.isArray(thr.issues) ? thr.issues : [])) {
    findings.push({
      rule: `thread-${i.rule || "g76"}`, severity: G76_SEV[i.severity] || "INFO",
      line: Number.isInteger(i.block_index) ? i.block_index + 1 : 0,
      msg: i.message || "Threading rule violation.", fix: i.suggestion || "",
    });
  }

  // R4/R5 — single modal-aware pass for parting plunge (#5) + C-axis polar (#7).
  let modal = null, plungeLine = -1, caxisLine = -1;
  for (const b of blocks) {
    if (MOTION.has(b.g)) modal = b.g;
    const cutting = modal === "G01" || modal === "G02" || modal === "G03";
    if (plungeLine < 0 && modal === "G01" && typeof b.x === "number" && Math.abs(b.x) <= 1.0) plungeLine = b.idx;
    // parseBlocks does not capture Y/C addresses — detect them from the (comment-stripped) line text.
    if (caxisLine < 0 && cutting && /\bC-?\d/i.test(b.text || "") && /\bY-?\d/i.test(b.text || "")) caxisLine = b.idx;
  }
  const hasG75 = /\bG75\b/.test(upper);
  if (plungeLine >= 0 && !hasG75) {
    findings.push({ rule: "partoff-no-peck", severity: "INFO", line: plungeLine + 1,
      msg: "Cut toward center (X≈0) with no G75 peck-groove cycle anywhere — deep grooves/part-offs (>3x tool width) trap chips and snap the blade.",
      fix: "Use G75 (Q peck) when groove depth exceeds ~3x the tool width." });
  }
  const hasPolar = /\bG1[23]\.1\b/.test(upper);
  if (caxisLine >= 0 && !hasPolar) {
    findings.push({ rule: "caxis-no-polar", severity: "WARN", line: caxisLine + 1,
      msg: "C-axis live-tool contour with Y interpolation but no G12.1/G13.1 polar mode — wrong coordinate mode cuts wrong geometry.",
      fix: "Enter polar interpolation (G12.1) for C-axis face/OD contouring, or verify the post intends Cartesian." });
  }

  return findings.map((f) => ({ ...f, source: "gcode" }));
}

/**
 * Lint a turning program-PLAN against the parameter-driven physics gotchas
 * (boring-bar L/D #2, nose-radius Ra #3) — these need tool/feed parameters not
 * present in raw G-code text.
 * @param {{operations?: Array<{name?, boringBar?:{stickout,diameter,material}, finish?:{feed,noseRadius,targetRa}}>}} plan
 * @returns {Array<{rule,severity,op,msg,fix,source}>}
 */
export function lintLathePlan(plan) {
  const findings = [];
  const ops = plan && Array.isArray(plan.operations) ? plan.operations : [];
  ops.forEach((op, idx) => {
    const where = (op && op.name) || `op[${idx}]`;

    // P1 (#2) — boring-bar L/D ratio.
    const bb = op && op.boringBar;
    if (bb && Number.isFinite(bb.stickout) && Number.isFinite(bb.diameter) && bb.diameter > 0) {
      const mat = String(bb.material || "steel").toLowerCase();
      const limit = LD_LIMIT[mat] != null ? LD_LIMIT[mat] : LD_LIMIT.steel;
      const ld = bb.stickout / bb.diameter;
      if (ld > limit) {
        findings.push({ rule: "boring-bar-ld", severity: "ERROR", op: where, line: 0,
          msg: `Boring bar L/D=${ld.toFixed(2)} exceeds ${limit} for ${mat} (deflection ∝ L³/D⁴ → bore chatter / taper / scrap).`,
          fix: `Shorten stickout to ≤ ${(limit * bb.diameter).toFixed(2)} (D=${bb.diameter}) or switch to ${mat === "carbide" ? "a damped / heavy-metal" : "a carbide-shank"} bar.` });
      }
    }

    // P2 (#3) — nose-radius surface finish: Ra ≈ f²/(32·rε). f,rε in mm → Ra in µm (×1000).
    const fin = op && op.finish;
    if (fin && Number.isFinite(fin.feed) && fin.feed > 0 &&
        Number.isFinite(fin.noseRadius) && fin.noseRadius > 0 &&
        Number.isFinite(fin.targetRa) && fin.targetRa > 0) {
      const raUm = (fin.feed * fin.feed / (32 * fin.noseRadius)) * 1000;
      if (raUm > fin.targetRa) {
        const maxFeed = Math.sqrt(32 * fin.noseRadius * fin.targetRa / 1000);
        findings.push({ rule: "nose-radius-ra", severity: "WARN", op: where, line: 0,
          msg: `Predicted Ra ${raUm.toFixed(2)} µm (f=${fin.feed} mm/rev, rε=${fin.noseRadius} mm) exceeds target ${fin.targetRa} µm.`,
          fix: `Reduce finish feed to ≤ ${maxFeed.toFixed(3)} mm/rev (Ra≈f²/(32·rε)).` });
      }
    }
  });
  return findings.map((f) => ({ ...f, source: "plan" }));
}

/** Highest severity rank in a findings list (0 = none). */
export function maxSeverity(findings) {
  return (findings || []).reduce((m, f) => Math.max(m, SEVERITY_RANK[f.severity] || 0), 0);
}

/** Human-readable rendering. Sorted ERROR→WARN→INFO then by line. */
export function formatFindings(findings, opts = {}) {
  const { quiet = false, file = "" } = opts;
  if (!findings || !findings.length) {
    return quiet ? "" : `✓ lathe-gcode-lint${file ? " " + file : ""}: no findings`;
  }
  const order = { ERROR: 0, WARN: 1, INFO: 2 };
  const sorted = [...findings].sort(
    (a, b) => (order[a.severity] - order[b.severity]) || ((a.line || 0) - (b.line || 0)),
  );
  return sorted.map((f) => {
    const loc = f.op ? ` (${f.op})` : `:${f.line || "-"}`;
    return `${f.severity}\t${file}${loc}\t[${f.rule}] ${f.msg}${f.fix ? `\n\t→ ${f.fix}` : ""}`;
  }).join("\n");
}
