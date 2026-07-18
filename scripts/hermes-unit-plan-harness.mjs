#!/usr/bin/env node
/**
 * hermes-unit-plan-harness.mjs  (HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-HARNESS, slot:zulu)
 *
 * The REAL autonomous harness for knowledge/hermes-outputs/MASTER-UNIT-PLAN.md --
 * replaces the TODO stub at knowledge/hermes-outputs/units/autonomous-harness.mjs.
 * Operator directive (2026-07-02): "engineer loops, harnesses and quick firing crons
 * to do this autonomously with no down time... utilize obsidian vault, ollama
 * offloading and hermes agents as needed. build in high roi order."
 *
 * WHAT ONE RUN DOES (cron-fired, cap-bounded):
 *   1. Parses every units/UNIT-*.md spec (id, title, Status, Priority, domain).
 *   2. Merges the Claude domain-agent queue fragments (units/work/queue-*.json,
 *      written by the unit-plan-gap-analysis Workflow) into an ROI-ordered queue.
 *      No fragments yet -> falls back to Priority (P0>P1>P2) then id order.
 *   3. Picks up to --cap actionable units (Status "Not Started", no existing draft,
 *      verdict != already-covered) in ROI order.
 *   4. For each, fires ONE Hermes agent with vault context attached: the unit spec
 *      + its repo-grounded gap file (if present) + the domain galaxy MEMORY.md head.
 *      Lane ladder (fallback doctrine): Hermes proxy (grok) -> local Ollama (free).
 *      Both dark -> safe no-op, logged, exit still 0 (the CRON must never crash).
 *   5. Writes the draft to units/work/UNIT-<id>-draft.md (UNREVIEWED header),
 *      flips the unit's **Status** line to "Drafted (hermes <date>)", appends a row
 *      to state/shared/hermes-unit-plan-ledger.jsonl and a human-readable line to the
 *      harness-owned append-only log state/shared/hermes-unit-plan-progress.md
 *      (NOT the shared MASTER-UNIT-PLAN.md -- O_APPEND is clobber-safe vs concurrent peer edits).
 *
 * BOUNDARY (R12 + plan/draft-only doctrine, clone of hermes-work-loop-driver):
 *   - NEVER touches repo source code. Writes ONLY under knowledge/hermes-outputs/
 *     and state/shared/. Drafts are UNREVIEWED -- a Claude slot builds/verifies;
 *     the harness never marks a unit Complete.
 *   - Draft numbers must never feed a safety gate without specialist confirmation
 *     (same rule as hermes-domain-enrichment-loop staging tips).
 *
 * CLI:
 *   node scripts/hermes-unit-plan-harness.mjs                # one capped live pass
 *   node scripts/hermes-unit-plan-harness.mjs --status       # queue view, no LLM calls
 *   node scripts/hermes-unit-plan-harness.mjs --dry-run      # pick + plan, no LLM calls
 *   node scripts/hermes-unit-plan-harness.mjs --cap 3 --json
 *   node scripts/hermes-unit-plan-harness.mjs --unit 0003    # draft one specific ACTIONABLE unit
 *                                                            # (claimed/drafted/fail-capped units stay excluded)
 *
 * Env: PRISM_UNITPLAN_HERMES_URL (default http://127.0.0.1:8645/v1 -- the LOCAL proxy, NOT
 *   the fleet PRISM_HERMES_PROXY_URL which points at NVIDIA NIM and 401s), PRISM_HERMES_TOKEN,
 *   PRISM_UNITPLAN_MODEL (default grok-4.20-0309-reasoning; 404 -> rediscover from /v1/models),
 *   PRISM_UNITPLAN_OLLAMA_MODEL (default qwen2.5-coder:32b), PRISM_UNITPLAN_MAX_TOKENS (4096),
 *   PRISM_UNITPLAN_DISABLE=1.
 * Exit: 0 = harness healthy (even if 0 drafted / all lanes dark). 2 = harness itself broke.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");

export const PATHS = {
  plan: path.join(REPO_ROOT, "knowledge/hermes-outputs/MASTER-UNIT-PLAN.md"),
  unitsDir: path.join(REPO_ROOT, "knowledge/hermes-outputs/units"),
  workDir: path.join(REPO_ROOT, "knowledge/hermes-outputs/units/work"),
  ledger: path.join(REPO_ROOT, "state/shared/hermes-unit-plan-ledger.jsonl"),
  lockDir: path.join(REPO_ROOT, "state/shared/.cron-locks/hermes-unit-plan-harness.lock"),
  // Harness-owned, append-only draft narrative. The cron does NOT read-modify-write the SHARED,
  // human/peer-edited MASTER-UNIT-PLAN.md (scrutiny arm C P2: a peer's concurrent full-file edit
  // -- witnessed live this session -- would clobber the RMW). O_APPEND here is atomic + clobber-free.
  progressLog: path.join(REPO_ROOT, "state/shared/hermes-unit-plan-progress.md"),
};

const PROGRESS_HEADER = "# Hermes Unit Plan Harness -- Autonomous Draft Log\n\n" +
  "> Append-only, harness-owned (O_APPEND, clobber-safe). The shared MASTER-UNIT-PLAN.md is NOT\n" +
  "> written by the cron -- its Progress Log is for human/specialist narrative. Machine record: hermes-unit-plan-ledger.jsonl.\n\n";

// LANE: dedicated knob defaulting to the LOCAL Hermes proxy. Deliberately NOT the fleet
// PRISM_HERMES_PROXY_URL, which alpha repointed to NVIDIA NIM cloud 2026-06-30 -- that lane
// 401s the "prism" bearer (live-confirmed 2026-07-02). Same decision as
// hermes-domain-enrichment-loop.mjs PRISM_HERMES_ENRICH_PROXY_URL.
const HERMES_URL = process.env.PRISM_UNITPLAN_HERMES_URL || "http://127.0.0.1:8645/v1";
// Default model: the gateway's only FREE catalog entry (live-verified 2026-07-02; paid ids
// 404 with "requires available credits" on this zero-balance account). Reasoning model, so
// MAX_TOKENS must cover reasoning + content -- default 8192.
const HERMES_MODEL = process.env.PRISM_UNITPLAN_MODEL || "stepfun/step-3.7-flash:free";
const HERMES_TOKEN = process.env.PRISM_HERMES_TOKEN || "prism";
const OLLAMA_URL = process.env.PRISM_UNITPLAN_OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.PRISM_UNITPLAN_OLLAMA_MODEL || "qwen2.5-coder:32b";
const MAX_TOKENS = (() => {
  const n = Number(process.env.PRISM_UNITPLAN_MAX_TOKENS);
  return Number.isInteger(n) && n > 0 ? n : 8192;
})();
const FAIL_CAP = (() => {
  const n = Number(process.env.PRISM_UNITPLAN_FAIL_CAP);
  return Number.isInteger(n) && n > 0 ? n : 3;
})();
const STALE_LOCK_MS = 30 * 60 * 1000;

// Domain number -> galaxy whose MEMORY.md is the vault context for drafts.
export const DOMAIN_MEMORY_GALAXY = {
  1: "speed-feed", 2: "speed-feed", 3: "mill", 4: "ai-training",
  5: "business", 6: "business", 7: "quality", 8: "speed-feed",
};

const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2 };

// ---------------------------------------------------------------------------
// Pure core (exported for tests)
// ---------------------------------------------------------------------------

/** Parse one UNIT-*.md body. Missing fields degrade to nulls, never throw. */
export function parseUnitFile(text, filename) {
  const id = (filename.match(/^UNIT-(\d{4})/) || [])[1] || null;
  const domain = Number((filename.match(/DOMAIN(\d+)/i) || [])[1]) || null;
  const title = (text.match(/^#\s+(.+)$/m) || [])[1]?.trim() || filename;
  const status = (text.match(/^\*\*Status\*\*:\s*(.+)$/m) || [])[1]?.trim() || null;
  const priority = (text.match(/^\*\*Priority\*\*:\s*(\S+)/m) || [])[1]?.trim() || null;
  return { id, file: filename, domain, title, status, priority };
}

/** Merge queue-*.json fragment texts. Malformed JSON / wrong schema -> errors[], never throw. */
export function mergeQueueFragments(fragments) {
  const byId = new Map();
  const errors = [];
  for (const { name, text } of fragments) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      errors.push(`${name}: invalid JSON (${e.message})`);
      continue;
    }
    if (parsed?.schemaVersion !== "1.0.0" || !Array.isArray(parsed.units)) {
      errors.push(`${name}: wrong schemaVersion/shape`);
      continue;
    }
    for (const u of parsed.units) {
      if (!u?.id) { errors.push(`${name}: unit entry missing id`); continue; }
      const id = String(u.id).padStart(4, "0");
      if (byId.has(id)) errors.push(`${name}: duplicate id ${id} (kept first)`);
      else byId.set(id, { ...u, id });
    }
  }
  return { byId, errors };
}

/**
 * ROI-order the actionable queue. Fragment entry wins ordering (roiScore desc);
 * units without an entry fall back to Priority rank then id. already-covered is
 * excluded here (nothing to draft); non-"Not Started" statuses are excluded too.
 */
export function orderQueue(units, fragmentById, draftExists = () => false, claims = {}) {
  const actionable = [];
  const skipped = [];
  for (const u of units) {
    const entry = u.id ? fragmentById.get(u.id) : undefined;
    if (!u.id) { skipped.push({ unit: u, reason: "no-id" }); continue; }
    if (claims[u.id]) { skipped.push({ unit: u, reason: `claimed:${claims[u.id]}` }); continue; }
    if (u.status && !/^not started$/i.test(u.status)) { skipped.push({ unit: u, reason: `status:${u.status}` }); continue; }
    if (entry?.verdict === "already-covered") { skipped.push({ unit: u, reason: "already-covered" }); continue; }
    if (draftExists(u.id)) { skipped.push({ unit: u, reason: "draft-exists" }); continue; }
    actionable.push({ ...u, roiScore: Number(entry?.roiScore) || 0, verdict: entry?.verdict || null, entry: entry || null });
  }
  actionable.sort((a, b) =>
    (b.roiScore - a.roiScore) ||
    ((PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)) ||
    a.id.localeCompare(b.id));
  return { actionable, skipped };
}

/** Compose the Hermes draft prompt: unit spec + repo-grounded gap file + vault memory head. */
export function buildPrompt({ unitBody, gapText, memoryHead, title }) {
  const parts = [
    `You are a PRISM manufacturing-intelligence domain specialist drafting the execution package for the unit "${title}".`,
    ``,
    `## Unit specification`, unitBody.trim(),
  ];
  if (gapText) parts.push(``, `## Repo-grounded gap analysis (authoritative -- do NOT re-plan what already exists)`, gapText.trim());
  if (memoryHead) parts.push(``, `## Domain vault context (galaxy memory)`, memoryHead.trim());
  parts.push(
    ``,
    `Produce a DRAFT EXECUTION PACKAGE in markdown with exactly these sections:`,
    `## Implementation Plan -- dependency-ordered concrete steps closing ONLY the real gaps.`,
    `## Draft Knowledge Content -- the substantive domain knowledge (models, mechanisms, parameter ranges). Cite sources where known; mark every numeric threshold [UNVERIFIED] unless it comes from the gap analysis citations.`,
    `## Validation & Test Plan -- real reference-value tests + live-data validation steps (JM Die where applicable).`,
    `## Risks & Open Questions.`,
    `Be specific and complete; no placeholders.`,
  );
  return parts.join("\n");
}

/**
 * Append one progress line to the harness-owned log via O_APPEND (atomic, clobber-free, no
 * read-back so it never truncates as the log grows). Seeds the header on first create. The line
 * is single-lined so one draft is always exactly one log row. Cross-slot-safe: unlike a
 * read-modify-write on the shared MASTER-UNIT-PLAN.md, a concurrent peer write cannot clobber it.
 */
export function appendProgressLog(filePath, line) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, PROGRESS_HEADER);
  }
  fs.appendFileSync(filePath, oneLine(line) + "\n");
}

/** Flip the **Status** line to Drafted. Returns null when no Status line exists (caller logs, skips write). */
export function markDrafted(unitText, dateStr) {
  if (!/^\*\*Status\*\*:/m.test(unitText)) return null;
  return unitText.replace(/^\*\*Status\*\*:\s*.+$/m, `**Status**: Drafted (hermes ${dateStr})`);
}

/** Trailing consecutive all-lane-failed draft rows across ALL units (dark-lane streak; ok row breaks it). */
export function darkStreak(ledgerText) {
  let n = 0;
  for (const line of String(ledgerText || "").trim().split(/\r?\n/).reverse()) {
    let row; try { row = JSON.parse(line); } catch { continue; }
    if (row?.action !== "draft") continue;
    if (row.ok) break;
    n++;
  }
  return n;
}

/** Collapse whitespace/newlines from externally-controlled strings before interpolation into md/ledger lines. */
export function oneLine(s) { return String(s ?? "").replace(/\s*[\r\n]+\s*/g, " ").trim(); }

/**
 * Try each lane in order, returning the first that resolves; a rejecting lane records its error
 * and falls through to the next. Both dark -> { out: null, laneErrors }. This is the fail-open
 * "no down time" fallback ladder made injectable so the Hermes->Ollama fall-through is unit-tested,
 * not merely live-observed (scrutiny arm B P2). Lanes: [{ name, fn: async(prompt)->out }].
 */
export async function runLaneLadder(prompt, lanes) {
  const laneErrors = [];
  for (const { name, fn } of lanes) {
    try {
      const out = await fn(prompt);
      if (out) return { out, laneErrors };
      laneErrors.push(`${name}: empty result`);
    } catch (e) { laneErrors.push(`${name}: ${e.message}`); }
  }
  return { out: null, laneErrors };
}

/** Accept either a {claims:{id:owner}} wrapper or a flat id->owner map; non-object -> {}. */
export function unwrapClaims(raw) {
  if (!raw || typeof raw !== "object") return {};
  const inner = raw.claims;
  return (inner && typeof inner === "object") ? inner : raw;
}

/** Parse+validate --cap (1..20 integer). Returns {ok, cap} so main can fail loud on garbage. */
export function validateCap(raw, dflt = 2) {
  const cap = Number(raw ?? dflt);
  return (Number.isInteger(cap) && cap >= 1 && cap <= 20) ? { ok: true, cap } : { ok: false, cap: null };
}

/**
 * Which units have a repo-grounded gap file vs not. Surfaces the gap-analysis coverage hole the
 * 6-agent workflow can leave when a domain-soul agent returns an empty final (observed 2026-07-02:
 * the whiskey-lathe + foxtrot-mill arms wrote no fragments -> those units draft WITHOUT repo grounding,
 * and their owning specialist has no dedup analysis waiting). hasGap: (id)->bool.
 */
export function gapCoverage(units, hasGap) {
  const withGap = [], withoutGap = [];
  for (const u of units) {
    if (!u.id) continue;
    (hasGap(u.id) ? withGap : withoutGap).push(u.id);
  }
  return { total: withGap.length + withoutGap.length, withGap: withGap.length, withoutGap: withoutGap.length, missingIds: withoutGap };
}

/**
 * Fail-cap: unit ids whose ledger shows >= cap CONSECUTIVE trailing draft failures
 * (a success resets the streak). Stops the 23-min cron re-burning a broken unit
 * forever; clear by fixing the cause and appending an ok:true row or trimming the ledger.
 */
export function failCappedIds(ledgerText, cap = 3) {
  const streak = new Map();
  for (const line of String(ledgerText || "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let row; try { row = JSON.parse(line); } catch { continue; }
    if (row?.action !== "draft" || !row.unitId) continue;
    streak.set(row.unitId, row.ok ? 0 : (streak.get(row.unitId) || 0) + 1);
  }
  return new Set([...streak].filter(([, n]) => n >= cap).map(([id]) => id));
}

export function draftHeader(unitId, lane, model, dateStr) {
  return [
    `> **UNREVIEWED HERMES DRAFT** -- UNIT-${unitId}, generated ${dateStr} via ${lane} (${model}) by hermes-unit-plan-harness.`,
    `> A specialist/Claude slot MUST verify before build or any safety-relevant use.`,
    `> Never wire numeric thresholds from this draft into gates without confirmation.`,
    ``,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Impure shell
// ---------------------------------------------------------------------------

function readUnits() {
  const files = fs.readdirSync(PATHS.unitsDir)
    .filter(f => /^UNIT-\d{4}-/.test(f) && f.endsWith(".md") && !/TEMPLATE|README/i.test(f))
    .sort();
  return files.map(f => parseUnitFile(fs.readFileSync(path.join(PATHS.unitsDir, f), "utf8"), f));
}

function readFragments() {
  if (!fs.existsSync(PATHS.workDir)) return [];
  return fs.readdirSync(PATHS.workDir)
    .filter(f => /^queue-.*\.json$/.test(f))
    .sort() // deterministic duplicate-id resolution (first-wins must not depend on FS enumeration order)
    .map(name => ({ name, text: fs.readFileSync(path.join(PATHS.workDir, name), "utf8") }));
}

/**
 * Atomic write (temp + rename) -- unit specs and the master plan are shared fleet files.
 * On Windows renameSync over a file another process holds open (peer/editor/AV) raises
 * EPERM/EBUSY; retry briefly, then surface a clear error and ALWAYS unlink the tmp so a
 * failed write never leaves a .tmp-<pid> orphan (the tmp-orphan class juliett flagged).
 */
export function writeAtomic(p, text) {
  const tmp = `${p}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmp, text);
    for (let attempt = 0; ; attempt++) {
      try { fs.renameSync(tmp, p); return; }
      catch (e) {
        if (attempt < 3 && (e.code === "EPERM" || e.code === "EBUSY" || e.code === "EACCES")) {
          const until = Date.now() + 120; while (Date.now() < until) { /* brief spin; scheduled-task ctx has no sleep */ }
          continue;
        }
        throw e;
      }
    }
  } finally {
    try { if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true }); } catch { /* best-effort */ }
  }
}

function readOptional(p, maxChars = 6000, fromTail = false) {
  // fromTail: the ledger is append-only and never rotates; failCappedIds/darkStreak need the
  // MOST-RECENT rows, so slice the TAIL (a truncated leading line is JSON.parse-catch-tolerated).
  // Head-slice (default) is correct for gap files / memory heads.
  try { const s = fs.readFileSync(p, "utf8"); return fromTail ? s.slice(-maxChars) : s.slice(0, maxChars); }
  catch { return null; }
}

function appendLedger(row) {
  fs.mkdirSync(path.dirname(PATHS.ledger), { recursive: true });
  fs.appendFileSync(PATHS.ledger, JSON.stringify({ schemaVersion: "1.0.0", ts: new Date().toISOString(), ...row }) + "\n");
}

const DARK_ALARM_AT = (() => { const n = Number(process.env.PRISM_UNITPLAN_DARK_ALARM); return Number.isInteger(n) && n > 0 ? n : 4; })();
/**
 * Escalate a persistent all-lane-dark condition to the fleet chat bus (arm A P1: a 23-min cron
 * that fails dark forever is invisible -- Fleet Task Health only catches HRESULT launch failures,
 * not a clean exit 0 with 0 drafts). Throttled: posts only when the trailing dark streak lands on
 * a multiple of the alarm threshold (fires at 4, 8, 12...), so it never spams every tick.
 */
function maybePostDarkAlarm() {
  try {
    const streak = darkStreak(readOptional(PATHS.ledger, 5_000_000, true) || "");
    if (streak < DARK_ALARM_AT || streak % DARK_ALARM_AT !== 0) return { alarmed: false, streak };
    const busPath = path.join(REPO_ROOT, "state/shared/AGENT_CHAT.jsonl");
    if (!fs.existsSync(path.dirname(busPath))) return { alarmed: false, streak };
    fs.appendFileSync(busPath, JSON.stringify({
      timestamp: new Date().toISOString(), from: "zulu", to: "all", kind: "unit-plan-harness-dark-alarm",
      summary: `hermes-unit-plan-harness has ${streak} consecutive all-lane-failed draft attempts -- both Hermes (${HERMES_URL}) and Ollama (${OLLAMA_URL}) lanes dark. Autonomy stalled; verify the local proxy + Ollama serve. Cron 'PRISM Unit Plan Harness' still fires but produces no drafts.`,
      streak,
    }) + "\n");
    return { alarmed: true, streak };
  } catch { return { alarmed: false, streak: -1 }; }
}

function acquireLock() {
  fs.mkdirSync(path.dirname(PATHS.lockDir), { recursive: true }); // missing parent must not masquerade as "lock held"
  try {
    fs.mkdirSync(PATHS.lockDir, { recursive: false });
    fs.writeFileSync(path.join(PATHS.lockDir, "pid"), String(process.pid));
    return true;
  } catch {
    try {
      const age = Date.now() - fs.statSync(PATHS.lockDir).mtimeMs;
      if (age > STALE_LOCK_MS) { // stale takeover via rename: only ONE contender wins, never deletes a fresh lock
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
  // Release ONLY if we still own it: if this run overran STALE_LOCK_MS and a peer took the lock
  // over (rename-takeover), the pid file now holds the peer's pid -- rmSync here would delete the
  // peer's FRESH lock (arm C P2). Compare the pid before removing.
  try {
    const owner = fs.readFileSync(path.join(PATHS.lockDir, "pid"), "utf8").trim();
    if (owner !== String(process.pid)) return; // not ours anymore -- leave the peer's lock intact
  } catch { /* pid file gone/unreadable -- fall through to best-effort remove */ }
  fs.rmSync(PATHS.lockDir, { recursive: true, force: true });
}

async function callHermes(prompt, { timeoutMs = 180000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  const chat = async (model) => fetch(`${HERMES_URL}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${HERMES_TOKEN}` },
    body: JSON.stringify({ model, max_tokens: MAX_TOKENS, messages: [{ role: "user", content: prompt }] }),
    signal: ctl.signal,
  });
  try {
    let model = HERMES_MODEL;
    let r = await chat(model);
    if (r.status === 404) { // pinned model absent/paid on this lane -> rediscover once, FREE ids first (paid ids 404 on zero balance)
      const mr = await fetch(`${HERMES_URL}/models`, { headers: { authorization: `Bearer ${HERMES_TOKEN}` }, signal: ctl.signal });
      if (!mr.ok) throw new Error(`models HTTP ${mr.status}`);
      const ids = ((await mr.json())?.data || []).map(m => m?.id).filter(Boolean);
      model = ids.find(id => /:free$/i.test(id) && id !== HERMES_MODEL) || ids.find(id => /grok/i.test(id)) || ids[0];
      if (!model) throw new Error("proxy lists no models");
      r = await chat(model);
    }
    if (!r.ok) throw new Error(`chat HTTP ${r.status}`);
    const choice = (await r.json())?.choices?.[0];
    const text = choice?.message?.content?.trim();
    if (!text) throw new Error(choice?.message?.reasoning ? "reasoning-only completion (raise PRISM_UNITPLAN_MAX_TOKENS)" : "empty completion");
    return { text, lane: "hermes", model, truncated: choice?.finish_reason === "length" };
  } finally { clearTimeout(t); }
}

async function callOllama(prompt, { timeoutMs = 300000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, options: { num_predict: MAX_TOKENS } }),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`ollama HTTP ${r.status}`);
    const j = await r.json();
    const text = j?.response?.trim();
    if (!text) throw new Error("empty ollama response");
    return { text, lane: "ollama", model: OLLAMA_MODEL, truncated: j?.done_reason === "length" };
  } finally { clearTimeout(t); }
}

async function draftUnit(u, { dryRun }) {
  const unitBody = fs.readFileSync(path.join(PATHS.unitsDir, u.file), "utf8");
  const gapText = readOptional(path.join(PATHS.workDir, `UNIT-${u.id}-gap.md`));
  const galaxy = DOMAIN_MEMORY_GALAXY[u.domain];
  const memoryHead = galaxy ? readOptional(path.join(REPO_ROOT, `mcp-server/src/engines/${galaxy}/MEMORY.md`), 4000) : null;
  const prompt = buildPrompt({ unitBody, gapText, memoryHead, title: u.title });
  if (dryRun) return { ok: true, dryRun: true, unitId: u.id, promptChars: prompt.length, hasGap: !!gapText };

  const started = Date.now();
  const { out, laneErrors } = await runLaneLadder(prompt, [
    { name: "hermes", fn: callHermes },
    { name: "ollama", fn: callOllama },
  ]);
  if (!out) return { ok: false, unitId: u.id, error: laneErrors.join(" | "), durationMs: Date.now() - started };

  const dateStr = new Date().toISOString().slice(0, 10);
  const draftPath = path.join(PATHS.workDir, `UNIT-${u.id}-draft.md`);
  fs.mkdirSync(PATHS.workDir, { recursive: true });
  const truncNote = out.truncated ? `> NOTE: completion hit the max_tokens cap (${MAX_TOKENS}) -- package may be incomplete.\n\n` : "";
  writeAtomic(draftPath, draftHeader(u.id, out.lane, oneLine(out.model), dateStr) + truncNote + out.text + "\n");

  // Stale-guard (scrutiny arm B P1): the LLM window is minutes long and unit specs are
  // SHARED fleet files -- re-read fresh and flip Status only if the unit is still unclaimed;
  // writing the stale unitBody back would silently revert a peer slot's mid-draft edits.
  const fresh = fs.readFileSync(path.join(PATHS.unitsDir, u.file), "utf8");
  const freshStatus = (fresh.match(/^\*\*Status\*\*:\s*(.+)$/m) || [])[1]?.trim() || null;
  let marked = null;
  if (!freshStatus || /^not started$/i.test(freshStatus)) {
    marked = markDrafted(fresh, dateStr);
    if (marked) writeAtomic(path.join(PATHS.unitsDir, u.file), marked);
  }

  appendProgressLog(PATHS.progressLog,
    `- ${dateStr}: UNIT-${u.id} drafted via ${out.lane} (${oneLine(out.model)}), roi=${u.roiScore}${u.verdict ? `, verdict=${oneLine(u.verdict)}` : ""} -> units/work/UNIT-${u.id}-draft.md [harness]`);

  return { ok: true, unitId: u.id, lane: out.lane, model: out.model, draftPath, statusMarked: !!marked, hasGap: !!gapText, durationMs: Date.now() - started };
}

export async function main(argv = process.argv.slice(2)) {
  if (process.env.PRISM_UNITPLAN_DISABLE === "1") { console.log("PRISM_UNITPLAN_DISABLE=1 -- no-op"); return 0; }
  const arg = (name, dflt) => { const i = argv.indexOf(name); return i === -1 ? dflt : argv[i + 1]; };
  const has = (name) => argv.includes(name);
  const capRaw = arg("--cap", "2");
  const capCheck = validateCap(capRaw);
  if (!capCheck.ok) { console.error(`invalid --cap (want integer 1..20): ${capRaw}`); return 2; }
  const cap = capCheck.cap;
  const json = has("--json");
  const dryRun = has("--dry-run");
  const statusOnly = has("--status");
  const onlyUnit = arg("--unit", null);

  let units, merged, claims, capped;
  try {
    units = readUnits();
    merged = mergeQueueFragments(readFragments());
    // claims.json is peer-written; a torn/partial read must NOT brick the whole cron (degrade to
    // no-claims, matching mergeQueueFragments' bad-JSON tolerance) -- own try/catch, not the read-phase catch.
    let claimsRaw = {};
    try { claimsRaw = JSON.parse(readOptional(path.join(PATHS.workDir, "claims.json"), 100000) || "{}"); }
    catch (e) { console.error(`claims.json unparseable (${e.message}) -- proceeding with no claims`); }
    claims = unwrapClaims(claimsRaw); // {claims:{id:owner}} wrapper or a flat id->owner map
    capped = failCappedIds(readOptional(PATHS.ledger, 5_000_000, true) || "", FAIL_CAP);
  } catch (e) {
    console.error(`HARNESS BROKEN (read phase): ${e.message}`);
    return 2;
  }
  const { actionable: rawActionable, skipped } = orderQueue(units, merged.byId,
    (id) => fs.existsSync(path.join(PATHS.workDir, `UNIT-${id}-draft.md`)), claims);
  const actionable = rawActionable.filter(u => {
    if (!capped.has(u.id)) return true;
    skipped.push({ unit: u, reason: `fail-capped(${FAIL_CAP})` });
    return false;
  });
  merged.errors.forEach(e => console.error(`fragment warning: ${e}`)); // surfaced in ALL modes incl --dry-run/--status

  if (statusOnly) {
    const cov = gapCoverage(units, (id) => fs.existsSync(path.join(PATHS.workDir, `UNIT-${id}-gap.md`)));
    const view = {
      units: units.length, actionable: actionable.length, fragmentEntries: merged.byId.size,
      fragmentErrors: merged.errors, gapCoverage: cov,
      queueTop: actionable.slice(0, 10).map(u => ({ id: u.id, roi: u.roiScore, verdict: u.verdict, priority: u.priority, title: u.title })),
      skipped: skipped.map(s => ({ id: s.unit.id, reason: s.reason })),
    };
    console.log(json ? JSON.stringify(view, null, 2) : `units=${view.units} actionable=${view.actionable} fragments=${view.fragmentEntries} errors=${view.fragmentErrors.length}\n` +
      `gap-analysis coverage: ${cov.withGap}/${cov.total} units have a gap file (${cov.withoutGap} missing${cov.withoutGap ? `: ${cov.missingIds.join(",")}` : ""})\n` +
      view.queueTop.map(q => `  ${q.id} roi=${q.roi} ${q.priority ?? "?"} ${q.verdict ?? "-"} ${q.title}`).join("\n"));
    return 0;
  }

  if (!acquireLock()) { console.log("another harness run holds the lock -- exiting clean"); return 0; }
  const results = [];
  try {
    let picked = onlyUnit ? actionable.filter(u => u.id === String(onlyUnit).padStart(4, "0")) : actionable.slice(0, cap);
    if (onlyUnit && picked.length === 0) console.error(`--unit ${onlyUnit}: not actionable (check --status)`);
    for (const u of picked) {
      const r = await draftUnit(u, { dryRun });
      results.push(r);
      if (!dryRun) appendLedger({ unitId: u.id, action: "draft", ...r });
      console.log(`${r.ok ? "OK" : "FAIL"} UNIT-${u.id}${r.lane ? ` via ${r.lane}` : ""}${r.error ? ` -- ${r.error}` : ""}`);
    }
  } catch (e) {
    console.error(`HARNESS BROKEN (draft phase): ${e.message}`);
    return 2;
  } finally {
    releaseLock();
  }
  const drafted = results.filter(r => r.ok && !r.dryRun).length;
  const alarm = (!dryRun && drafted === 0 && results.length > 0) ? maybePostDarkAlarm() : { alarmed: false };
  if (alarm.alarmed) console.error(`DARK-ALARM: ${alarm.streak} consecutive dark draft attempts -- posted advisory to AGENT_CHAT`);
  const summary = { picked: results.length, drafted, failed: results.filter(r => !r.ok).length, dryRun, darkAlarm: alarm, results };
  if (json) console.log(JSON.stringify(summary, null, 2));
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().then(code => process.exit(code), e => { console.error(`HARNESS BROKEN: ${e?.stack || e}`); process.exit(2); });
