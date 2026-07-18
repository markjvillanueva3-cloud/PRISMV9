#!/usr/bin/env node
/**
 * hermes-unit-plan-verify-harness.mjs  (HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-VERIFY, slot:zulu)
 *
 * The MISSING pipeline stage for knowledge/hermes-outputs/MASTER-UNIT-PLAN.md.
 * hermes-unit-plan-harness.mjs DRAFTS units (UNREVIEWED) and has now drained
 * (`--status` -> actionable=0); the drafter idles while ~15 UNREVIEWED drafts sit
 * with NO autonomous path forward. autonomous-unit-plan-loop.mjs step 3 was a
 * literal `// Future: trigger scrutiny + auto-learning` stub. This harness fills
 * that gap: it VERIFIES each draft against deterministic build-readiness gates and
 * PROMOTES the ones that pass into a build-ready queue a specialist/build slot
 * consumes -- so the "no down time" pipeline keeps advancing after drafts drain.
 * Operator directive (2026-07-02): "engineer loops, harnesses and quick firing crons
 * to do this autonomously with no down time."
 *
 * WHAT ONE RUN DOES (cron-fired, cap-bounded, idempotent):
 *   1. Scans units/work/UNIT-*-draft.md.
 *   2. Skips drafts already verified (verify.json newer than the draft) -- re-verifies
 *      only when a draft was re-written since its last verdict.
 *   3. For up to --cap drafts, runs the DETERMINISTIC gate (pure core, no LLM):
 *        - non-empty body (content beyond the UNREVIEWED header)
 *        - UNREVIEWED provenance header present (safety marker must survive)
 *        - >= REQUIRED_SECTIONS of the 4 execution-package sections present
 *        - not truncated at the max_tokens cap (warn)
 *        - no unresolved placeholders (TODO/TBD/FILL IN/lorem/XXX) (warn)
 *        - cited repo paths resolve on disk (anti-hallucination; warn on strong signal)
 *        - dedup alignment: an `extend`-verdict draft references >=1 asset from its
 *          gap file's authoritative "Existing Assets" list (warn -- greenfield-dup risk)
 *      Critical gate fail -> NEEDS-REWORK; otherwise VERIFIED (+ any warnings).
 *   4. Optional (R5 judgment, Ollama-offloaded, fail-soft): a one-line build-readiness /
 *      hidden-duplication opinion per VERIFIED draft. Never blocks the deterministic verdict.
 *   5. Writes units/work/UNIT-<id>-verify.json (+ appends units/work/verify-report.md),
 *      promotes VERIFIED drafts into units/work/build-ready-queue.json (single atomic
 *      writer, ROI-ordered), appends state/shared/hermes-unit-plan-verify-ledger.jsonl.
 *
 * BOUNDARY (R12 + verify-only doctrine, sibling of hermes-unit-plan-harness):
 *   - NEVER touches repo source code and NEVER marks a unit Complete. Writes ONLY under
 *     knowledge/hermes-outputs/ and state/shared/. VERIFIED means "structurally build-ready
 *     for a specialist to pick up", NOT "correct" -- the per-unit build+test+3-of-3 stays
 *     with the owning slot. Draft numbers still never feed a safety gate unconfirmed.
 *
 * CLI:
 *   node scripts/hermes-unit-plan-verify-harness.mjs            # one capped verify pass
 *   node scripts/hermes-unit-plan-verify-harness.mjs --status   # coverage view, no writes
 *   node scripts/hermes-unit-plan-verify-harness.mjs --dry-run  # gate + plan, no writes
 *   node scripts/hermes-unit-plan-verify-harness.mjs --cap 20 --json
 *   node scripts/hermes-unit-plan-verify-harness.mjs --unit 0018 [--force]
 *   node scripts/hermes-unit-plan-verify-harness.mjs --no-llm   # deterministic gate only
 *
 * Env: PRISM_UNITPLAN_VERIFY_DISABLE=1 (no-op), PRISM_UNITPLAN_VERIFY_LLM_DISABLE=1
 *   (skip the Ollama opinion), PRISM_UNITPLAN_OLLAMA_URL (default 127.0.0.1:11434),
 *   PRISM_UNITPLAN_VERIFY_OLLAMA_MODEL (default qwen2.5-coder:32b),
 *   PRISM_UNITPLAN_VERIFY_MIN_SECTIONS (default 3), PRISM_UNITPLAN_VERIFY_MIN_BODY (default 800).
 * Exit: 0 = harness healthy (even if 0 verified). 2 = harness itself broke.
 * ASCII-only. Node 22 (global fetch).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");

export const PATHS = {
  unitsDir: path.join(REPO_ROOT, "knowledge/hermes-outputs/units"),
  workDir: path.join(REPO_ROOT, "knowledge/hermes-outputs/units/work"),
  ledger: path.join(REPO_ROOT, "state/shared/hermes-unit-plan-verify-ledger.jsonl"),
  report: path.join(REPO_ROOT, "knowledge/hermes-outputs/units/work/verify-report.md"),
  buildQueue: path.join(REPO_ROOT, "knowledge/hermes-outputs/units/work/build-ready-queue.json"),
  lockDir: path.join(REPO_ROOT, "state/shared/.cron-locks/hermes-unit-plan-verify-harness.lock"),
};

const REPORT_HEADER = "# Hermes Unit Plan Verify Harness -- Autonomous Verdict Log\n\n" +
  "> Append-only, harness-owned (O_APPEND, clobber-safe). Deterministic build-readiness gate over the\n" +
  "> UNREVIEWED drafts. VERIFIED != correct -- it means structurally build-ready for a specialist to pick\n" +
  "> up. Machine record: hermes-unit-plan-verify-ledger.jsonl; consumable pointer: build-ready-queue.json.\n\n";

const OLLAMA_URL = process.env.PRISM_UNITPLAN_OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.PRISM_UNITPLAN_VERIFY_OLLAMA_MODEL || "qwen2.5-coder:32b";
const STALE_LOCK_MS = 30 * 60 * 1000;

const MIN_SECTIONS = (() => {
  const n = Number(process.env.PRISM_UNITPLAN_VERIFY_MIN_SECTIONS);
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 3;
})();
const MIN_BODY_CHARS = (() => {
  const n = Number(process.env.PRISM_UNITPLAN_VERIFY_MIN_BODY);
  return Number.isInteger(n) && n > 0 ? n : 800;
})();
// >= this many cited repo paths, none resolving on disk, trips the anti-hallucination warning.
const MIN_CITES_FOR_HALLUCINATION_WARN = (() => {
  const n = Number(process.env.PRISM_UNITPLAN_VERIFY_MIN_CITES);
  return Number.isInteger(n) && n > 0 ? n : 3;
})();

// The 4 execution-package sections the drafter prompt mandates. Match on the section KEY
// (leading noun phrase) -- the live drafts vary the tail wildly (em-dash vs "--", trailing
// period, differing phrasing), so an exact-string match would false-miss most of them.
// "&|and" tolerance (scrutiny arm A P2): the live drafts all write "&", but an LLM re-draft may
// spell "Validation and Test Plan" / "Risks and Open Questions" -- accept both so a wording drift
// does not silently drop a real section and flip a complete draft to NEEDS-REWORK.
export const REQUIRED_SECTIONS = [
  { key: "implementation-plan", re: /^##\s*Implementation Plan\b/im },
  { key: "draft-knowledge", re: /^##\s*Draft Knowledge Content\b/im },
  { key: "validation-test", re: /^##\s*Validation\s*(?:&|and)\s*Test Plan\b/im },
  { key: "risks-open", re: /^##\s*Risks\s*(?:&|and)\s*Open Questions\b/im },
];

// Placeholder markers that mean "not build-ready" if they survive into a draft body.
// Deliberately NOT matching "[UNVERIFIED]" -- the drafter is INSTRUCTED to tag numeric
// thresholds that way, so it is expected content, not a stub.
// "<insert" is a SEPARATE alternative (scrutiny arm B P2): a leading \b cannot match between a
// space and "<" (two non-word chars), so nesting it inside \b(...)\b left the marker inert.
const PLACEHOLDER_RE = /\b(?:TODO|TBD|FIXME|FILL[ _-]?IN|lorem ipsum|XXX+|PLACEHOLDER|coming soon)\b|<insert\b/gi;

// Repo-path-looking tokens for the anti-hallucination check. Anchored to the real top-level
// dirs so prose like "the mill engine" is not mistaken for a path.
const REPO_PATH_RE = /\b(?:mcp-server\/[\w./-]+\.(?:ts|tsx|mjs|js)|scripts\/[\w./-]+\.(?:mjs|ts|js)|knowledge\/[\w./-]+\.md)\b/g;

// ---------------------------------------------------------------------------
// Pure core (exported for tests)
// ---------------------------------------------------------------------------

/** Strip the leading UNREVIEWED blockquote header (and truncation NOTE) to get the real body. */
export function stripDraftHeader(text) {
  const lines = String(text || "").split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (/^>\s/.test(lines[i]) || lines[i].trim() === "")) i++;
  return lines.slice(i).join("\n");
}

/** True when the UNREVIEWED provenance header is present (safety/provenance marker). */
export function hasUnreviewedHeader(text) {
  return /^>\s*\*\*UNREVIEWED/im.test(String(text || ""));
}

/** True when the draft hit the max_tokens cap (drafter writes an explicit NOTE line). */
export function isTruncated(text) {
  return /hit the max_tokens cap/i.test(String(text || ""));
}

/** Which of the 4 required sections are present. Returns { present:[keys], missing:[keys], count }. */
export function detectSections(text) {
  const s = String(text || "");
  const present = [], missing = [];
  for (const { key, re } of REQUIRED_SECTIONS) (re.test(s) ? present : missing).push(key);
  return { present, missing, count: present.length };
}

/** First few placeholder markers found in the body (empty => clean). Caps the list. */
export function findPlaceholders(body, cap = 5) {
  const re = new RegExp(PLACEHOLDER_RE.source, "gi");
  const found = [...String(body || "").matchAll(re)].map(m => m[0]);
  return found.slice(0, cap);
}

/** Distinct repo-path tokens the draft cites (deduped, capped). */
export function extractCitedPaths(text, cap = 40) {
  const re = new RegExp(REPO_PATH_RE.source, "g");
  const all = [...String(text || "").matchAll(re)].map(m => m[0].replace(/\\/g, "/"));
  return [...new Set(all)].slice(0, cap);
}

/** First non-blank, non-heading line after an H2 header (india "## Verdict\n**extend**" shape). */
export function h2FirstValue(text, headerRe) {
  const idx = String(text).search(headerRe);
  if (idx < 0) return null;
  for (const line of String(text).slice(idx).split(/\r?\n/).slice(1)) {
    const t = line.trim();
    if (t && !/^#/.test(t)) return t;
  }
  return null;
}

/** The block of text between an H2 header match and the next H2 (or EOF). null if no match. */
export function h2Block(text, headerRe) {
  const parts = String(text).split(headerRe);
  return parts.length < 2 ? null : parts[1].split(/^##\s+/m)[0];
}

/**
 * Parse a gap file's verdict + existing-asset list. Handles BOTH live formats (scrutiny arm B P1):
 *  - machine cross-galaxy-audit format ("Verdict: **extend**" inline, "## Existing Assets To Reuse /
 *    Extend" bullet list of bare paths -- UNIT-0028..0032, 5 files);
 *  - india/analyst format ("## Verdict" H2 with "**extend**" on the next line, "## Existing coverage"
 *    with inline `path:line` cites -- UNIT-0002..0027, 26/31 of the live files).
 * Without both, the dedup-alignment warning + ROI ordering silently no-op on 84% of inputs.
 * Missing file/section -> { verdict:null, existingAssets:[] }.
 */
export function parseGap(gapText) {
  if (!gapText) return { verdict: null, existingAssets: [] };
  const text = String(gapText);
  let verdict = (text.match(/^-?\s*Verdict:\s*\**\s*([\w-]+)/im) || [])[1]?.toLowerCase() || null;
  if (!verdict) {
    const v = h2FirstValue(text, /^##\s+Verdict\b[^\n]*$/im);
    verdict = v ? ((v.match(/([\w-]+)/) || [])[1]?.toLowerCase() || null) : null;
  }
  const existingAssets = [];
  const block = h2Block(text, /^##\s+Existing\s+(?:Assets|coverage)\b[^\n]*$/im);
  if (block) {
    for (const line of block.split(/\r?\n/)) {
      const a = line.match(/^-\s+([\w./-]+\.(?:ts|tsx|mjs|js|md))\b/); // machine bare-path bullet
      if (a) existingAssets.push(a[1].replace(/\\/g, "/"));
    }
    for (const p of extractCitedPaths(block)) if (!existingAssets.includes(p)) existingAssets.push(p); // india inline cites
  }
  return { verdict, existingAssets };
}

/**
 * The deterministic build-readiness gate. Pure: no fs, no network. Given the raw draft text,
 * its resolver (path -> bool exists) and its gap info, returns a structured verdict.
 *   verdict: "VERIFIED" | "NEEDS-REWORK"
 *   critical: [reasons that forced NEEDS-REWORK]
 *   warnings: [non-blocking flags]
 *   metrics: { bodyChars, sections, citedPaths, resolvedPaths }
 */
export function gateDraft({ text, resolves = () => false, gap = { verdict: null, existingAssets: [] },
  minSections = MIN_SECTIONS, minBody = MIN_BODY_CHARS } = {}) {
  const critical = [], warnings = [];
  const body = stripDraftHeader(text);
  const bodyChars = body.trim().length;
  const sections = detectSections(text);
  const cited = extractCitedPaths(text);
  const resolved = cited.filter(p => resolves(p));

  // --- critical gates ---
  if (!hasUnreviewedHeader(text)) critical.push("missing UNREVIEWED provenance header");
  if (bodyChars < minBody) critical.push(`body too short (${bodyChars} < ${minBody} chars)`);
  if (sections.count < minSections) critical.push(`only ${sections.count}/4 required sections (need >=${minSections}; missing: ${sections.missing.join(",")})`);

  // --- warnings (do not block promotion, but travel with the verdict) ---
  if (isTruncated(text)) warnings.push("truncated at max_tokens cap -- last section may be incomplete");
  if (sections.count === 3) warnings.push(`3/4 sections (missing: ${sections.missing.join(",")})`);
  const placeholders = findPlaceholders(body);
  if (placeholders.length) warnings.push(`placeholders present: ${placeholders.join(", ")}`);
  // anti-hallucination: many cited existing-looking paths, none on disk == likely fabricated cites
  if (cited.length >= MIN_CITES_FOR_HALLUCINATION_WARN && resolved.length === 0) warnings.push(`${cited.length} cited repo paths, 0 resolve on disk -- verify citations`);
  else if (cited.length > 0 && resolved.length < cited.length) warnings.push(`${resolved.length}/${cited.length} cited repo paths resolve`);
  // dedup alignment: an extend draft that names zero existing assets risks a parallel greenfield build
  if (gap.verdict === "extend" && gap.existingAssets.length) {
    const draftLc = String(text || "").replace(/\\/g, "/").toLowerCase();
    const namedAny = gap.existingAssets.some(a => draftLc.includes(a.toLowerCase()) || draftLc.includes(path.basename(a).toLowerCase()));
    if (!namedAny) warnings.push("extend-verdict draft references NONE of the gap's existing assets -- greenfield-dup risk");
  }

  return {
    verdict: critical.length ? "NEEDS-REWORK" : "VERIFIED",
    critical, warnings,
    metrics: { bodyChars, sections: sections.count, sectionsPresent: sections.present, citedPaths: cited.length, resolvedPaths: resolved.length },
    gapVerdict: gap.verdict,
  };
}

/** Collapse whitespace/newlines before interpolation into md/ledger lines. */
export function oneLine(s) { return String(s ?? "").replace(/\s*[\r\n]+\s*/g, " ").trim(); }

/**
 * Merge a freshly-verified unit into the build-ready queue (pure): VERIFIED units are upserted
 * (newest verdict wins), NEEDS-REWORK units are REMOVED (a re-drafted unit that regressed must
 * not linger as build-ready). Returns the new queue object, ROI-desc then id-asc ordered.
 */
export function upsertBuildQueue(queue, entry) {
  const base = (queue && Array.isArray(queue.units)) ? queue.units.filter(u => u.id !== entry.id) : [];
  if (entry.verdict === "VERIFIED") base.push(entry);
  base.sort((a, b) => (Number(b.roi) || 0) - (Number(a.roi) || 0) || String(a.id).localeCompare(String(b.id)));
  return { schemaVersion: "1.0.0", updatedAt: entry.verifiedAt, units: base };
}

/** A draft needs verifying when it has no verdict yet OR was rewritten since its last verdict. */
export function needsVerify(draftMtimeMs, verifyMtimeMs) {
  if (!Number.isFinite(verifyMtimeMs)) return true;
  return draftMtimeMs > verifyMtimeMs;
}

/** ROI signal (0..10): machine "ROI: N" inline OR india "## ROI\n**N/10**" (arm B P1). 0 if absent. */
export function deriveRoi(gapText) {
  const text = String(gapText || "");
  const inline = text.match(/^-?\s*ROI:\s*\**\s*(\d+)/im);
  if (inline) return Number(inline[1]);
  const v = h2FirstValue(text, /^##\s+ROI\b[^\n]*$/im);
  const m = v && v.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

// ---------------------------------------------------------------------------
// Impure shell
// ---------------------------------------------------------------------------

function listDrafts() {
  if (!fs.existsSync(PATHS.workDir)) return [];
  return fs.readdirSync(PATHS.workDir)
    .filter(f => /^UNIT-(\d{4})-draft\.md$/.test(f))
    .sort()
    .map(f => ({ id: (f.match(/^UNIT-(\d{4})/) || [])[1], file: f, path: path.join(PATHS.workDir, f) }));
}

function mtimeMs(p) { try { return fs.statSync(p).mtimeMs; } catch { return NaN; } }
function readOptional(p, maxChars = 200000) { try { return fs.readFileSync(p, "utf8").slice(0, maxChars); } catch { return null; } }
function readJsonOptional(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

/** Resolver for the anti-hallucination gate: does a repo-relative path exist on disk?
 *  Rejects any draft-controlled path containing `..` before touching the filesystem (scrutiny
 *  arm A P2) so a cited path can never escape REPO_ROOT even for a read-only existsSync probe. */
function repoResolves(rel) {
  try {
    if (/(^|[\\/])\.\.([\\/]|$)/.test(rel)) return false;
    return fs.existsSync(path.join(REPO_ROOT, rel));
  } catch { return false; }
}

/** Atomic write (temp + rename) with Windows EPERM/EBUSY retry; always cleans the tmp. */
function writeAtomic(p, text) {
  const tmp = `${p}.tmp-${process.pid}`;
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(tmp, text);
    for (let attempt = 0; ; attempt++) {
      try { fs.renameSync(tmp, p); return; }
      catch (e) {
        if (attempt < 3 && (e.code === "EPERM" || e.code === "EBUSY" || e.code === "EACCES")) {
          const until = Date.now() + 120; while (Date.now() < until) { /* brief spin */ }
          continue;
        }
        throw e;
      }
    }
  } finally { try { if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true }); } catch { /* best-effort */ } }
}

function appendReport(line) {
  if (!fs.existsSync(PATHS.report)) { fs.mkdirSync(path.dirname(PATHS.report), { recursive: true }); fs.writeFileSync(PATHS.report, REPORT_HEADER); }
  fs.appendFileSync(PATHS.report, oneLine(line) + "\n");
}

function appendLedger(row) {
  fs.mkdirSync(path.dirname(PATHS.ledger), { recursive: true });
  fs.appendFileSync(PATHS.ledger, JSON.stringify({ schemaVersion: "1.0.0", ts: new Date().toISOString(), ...row }) + "\n");
}

function acquireLock() {
  fs.mkdirSync(path.dirname(PATHS.lockDir), { recursive: true });
  try {
    fs.mkdirSync(PATHS.lockDir, { recursive: false });
    fs.writeFileSync(path.join(PATHS.lockDir, "pid"), String(process.pid));
    return true;
  } catch {
    try {
      const age = Date.now() - fs.statSync(PATHS.lockDir).mtimeMs;
      if (age > STALE_LOCK_MS) {
        const grave = `${PATHS.lockDir}.stale-${process.pid}`;
        fs.renameSync(PATHS.lockDir, grave);
        fs.rmSync(grave, { recursive: true, force: true });
        return acquireLock();
      }
    } catch { /* lost the takeover race; treat as held */ }
    return false;
  }
}
function releaseLock() {
  try {
    const owner = fs.readFileSync(path.join(PATHS.lockDir, "pid"), "utf8").trim();
    if (owner !== String(process.pid)) return; // peer took it over -- do not delete their lock
  } catch { /* pid gone -- best-effort */ }
  fs.rmSync(PATHS.lockDir, { recursive: true, force: true });
}

/** Optional Ollama opinion (R5 judgment, fail-soft). Never throws; returns null on any failure. */
async function ollamaOpinion(id, body, { timeoutMs = 90000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const prompt =
      `You are auditing an UNREVIEWED draft execution package for PRISM unit ${id}. In ONE sentence (<=40 words), ` +
      `state whether it is build-ready for a specialist to implement, and flag any sign it duplicates an existing ` +
      `system or lacks concrete steps. Draft:\n\n${String(body).slice(0, 6000)}`;
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, options: { num_predict: 160 } }),
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    const txt = (await r.json())?.response?.trim();
    return txt ? oneLine(txt).slice(0, 400) : null;
  } catch { return null; } finally { clearTimeout(t); }
}

/** Verify one draft end-to-end: gate + optional opinion + write verify.json. Returns the verdict record. */
async function verifyDraft(d, { dryRun, useLlm }) {
  const text = readOptional(d.path) || "";
  const gapText = readOptional(path.join(PATHS.workDir, `UNIT-${d.id}-gap.md`));
  const unitTitle = (text.match(/^#\s+(.+)$/m) || [])[1]?.trim() || `UNIT-${d.id}`;
  const gap = parseGap(gapText);
  const gated = gateDraft({ text, resolves: repoResolves, gap });
  const roi = deriveRoi(gapText);

  let opinion = null;
  if (useLlm && gated.verdict === "VERIFIED") opinion = await ollamaOpinion(d.id, stripDraftHeader(text));

  const verifiedAt = new Date().toISOString();
  const record = {
    schemaVersion: "1.0.0", id: d.id, title: oneLine(unitTitle), verdict: gated.verdict, roi,
    critical: gated.critical, warnings: gated.warnings, metrics: gated.metrics, gapVerdict: gated.gapVerdict,
    opinion, verifiedAt, draftPath: d.path,
  };
  if (dryRun) return record;

  // WRITE ORDER (scrutiny arm A P1): the build-ready queue is written FIRST and the verify.json
  // idempotency marker LAST. needsVerify() keys "already verified" solely on verify.json mtime, so
  // if the queue writeAtomic faulted AFTER verify.json was committed, the unit would read verified-
  // but-not-queued forever (the drafter also skips draft-exists -> unrecoverable orphan). Committing
  // verify.json last means a queue-write fault leaves the draft `stale` -> retried next tick.
  const queue = readJsonOptional(PATHS.buildQueue);
  const next = upsertBuildQueue(queue, {
    id: d.id, title: record.title, verdict: gated.verdict, roi, warningCount: gated.warnings.length,
    verifiedAt, draftPath: d.path,
  });
  writeAtomic(PATHS.buildQueue, JSON.stringify(next, null, 2) + "\n");
  appendReport(`- ${verifiedAt.slice(0, 10)}: UNIT-${d.id} ${gated.verdict}` +
    ` (sections=${gated.metrics.sections}/4, roi=${roi}${gated.warnings.length ? `, warnings=${gated.warnings.length}` : ""}` +
    `${gated.critical.length ? `, critical=${gated.critical.join("; ")}` : ""})`);
  writeAtomic(path.join(PATHS.workDir, `UNIT-${d.id}-verify.json`), JSON.stringify(record, null, 2) + "\n");
  return record;
}

export async function main(argv = process.argv.slice(2)) {
  if (process.env.PRISM_UNITPLAN_VERIFY_DISABLE === "1") { console.log("PRISM_UNITPLAN_VERIFY_DISABLE=1 -- no-op"); return 0; }
  const arg = (name, dflt) => { const i = argv.indexOf(name); return i === -1 ? dflt : argv[i + 1]; };
  const has = (name) => argv.includes(name);
  const capRaw = arg("--cap", "10");
  const cap = Number(capRaw);
  if (!(Number.isInteger(cap) && cap >= 1 && cap <= 100)) { console.error(`invalid --cap (want integer 1..100): ${capRaw}`); return 2; }
  const json = has("--json");
  const dryRun = has("--dry-run");
  const statusOnly = has("--status");
  const force = has("--force");
  const onlyUnit = arg("--unit", null);
  const useLlm = !has("--no-llm") && process.env.PRISM_UNITPLAN_VERIFY_LLM_DISABLE !== "1";

  let drafts;
  try { drafts = listDrafts(); }
  catch (e) { console.error(`VERIFY HARNESS BROKEN (scan phase): ${e.message}`); return 2; }

  // Which drafts are actionable-for-verify (no verdict yet, or re-drafted since last verdict).
  const withState = drafts.map(d => {
    const verifyPath = path.join(PATHS.workDir, `UNIT-${d.id}-verify.json`);
    const stale = needsVerify(mtimeMs(d.path), mtimeMs(verifyPath));
    return { ...d, stale };
  });
  let actionable = withState.filter(d => force || d.stale);
  if (onlyUnit) actionable = withState.filter(d => d.id === String(onlyUnit).padStart(4, "0"));

  if (statusOnly) {
    const verified = withState.filter(d => !d.stale);
    const q = readJsonOptional(PATHS.buildQueue);
    const view = {
      drafts: drafts.length, actionable: actionable.length, alreadyVerified: verified.length,
      buildReady: q?.units?.filter(u => u.verdict === "VERIFIED").length || 0,
      actionableIds: actionable.map(d => d.id),
    };
    console.log(json ? JSON.stringify(view, null, 2)
      : `drafts=${view.drafts} actionable=${view.actionable} already-verified=${view.alreadyVerified} build-ready=${view.buildReady}` +
        (view.actionableIds.length ? `\n  pending: ${view.actionableIds.join(",")}` : ""));
    return 0;
  }

  if (!acquireLock()) { console.log("another verify run holds the lock -- exiting clean"); return 0; }
  const results = [];
  try {
    const picked = actionable.slice(0, cap);
    if (onlyUnit && picked.length === 0) console.error(`--unit ${onlyUnit}: no such draft (check --status)`);
    for (const d of picked) {
      const r = await verifyDraft(d, { dryRun, useLlm });
      results.push(r);
      if (!dryRun) appendLedger({ id: d.id, action: "verify", verdict: r.verdict, critical: r.critical, warnings: r.warnings, roi: r.roi });
      console.log(`${r.verdict === "VERIFIED" ? "VERIFIED" : "NEEDS-REWORK"} UNIT-${d.id}` +
        ` (sections=${r.metrics.sections}/4${r.warnings.length ? `, ${r.warnings.length} warn` : ""}${r.critical.length ? ` -- ${r.critical.join("; ")}` : ""})`);
    }
  } catch (e) {
    console.error(`VERIFY HARNESS BROKEN (verify phase): ${e.message}`);
    return 2;
  } finally { releaseLock(); }

  const verified = results.filter(r => r.verdict === "VERIFIED").length;
  const summary = { picked: results.length, verified, needsRework: results.length - verified, dryRun, results };
  if (json) console.log(JSON.stringify(summary, null, 2));
  else console.log(`verify pass: ${verified} VERIFIED, ${results.length - verified} NEEDS-REWORK of ${results.length} checked`);
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().then(code => process.exit(code), e => { console.error(`VERIFY HARNESS BROKEN: ${e?.stack || e}`); process.exit(2); });
