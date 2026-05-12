#!/usr/bin/env node
/**
 * task-created-claim-guard.mjs — PreToolUse(TaskCreate) → deny duplicate task creation across chats.
 *
 * U-HKA09 of HOOKS-AUTOMATION-V2-MS0. (Spec calls it a `TaskCreated` hook; there's no such event
 * in this harness, but `TaskCreate` IS a tool, so a PreToolUse hook on it is the same thing —
 * and it can actually *deny* the creation, which is what we want.)
 *
 * WHY: ~6 concurrent chats; two of them independently TaskCreate "wire the X engine" and now the
 * work gets done twice (or, worse, half by each). This hook keeps a shared TTL'd ledger of created
 * task subjects (`state/shared/task-claims.jsonl`); if a fresh enough one (default 30 min) by a
 * DIFFERENT chat fuzzy-matches the new subject, the creation is denied with "duplicate of <chat>'s
 * task — coordinate, or --force". Same-chat re-creation is allowed (you can split/redo your own
 * task). Escape hatches: PRISM_TASK_CLAIM_GUARD=0, a `force` in the task's metadata, or `[force]`
 * in the subject.
 *
 * @hook PreToolUse:TaskCreate  (register in settings.json under matcher "TaskCreate" / "^TaskCreate$")
 *
 * Env:
 *   PRISM_TASK_CLAIM_GUARD=0      → disable entirely (allow everything)
 *   PRISM_TASK_CLAIM_TTL_MS       → claim staleness window (default 1800000 = 30 min)
 *   PRISM_TASK_CLAIM_THRESHOLD    → fuzzy-match threshold 0..1 for "duplicate" (default 0.72)
 *   PRISM_TASK_CLAIM_LEDGER       → override the ledger path
 */

import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_THRESHOLD = 0.72;
const SHORT_SUBJECT_TOKENS = 3; // ≤ this many tokens ⇒ require an EXACT normalized match, not fuzzy
const LEDGER_REL = path.join("state", "shared", "task-claims.jsonl");

// ── pure helpers (exported) ───────────────────────────────────────────────────

const STOPWORDS = new Set(["the", "a", "an", "to", "of", "in", "on", "for", "and", "or", "with", "into", "from", "at", "by", "this", "that", "it", "its", "be", "is", "are", "as"]);

export function normalizeSubject(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[`"'’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function tokensOf(s) {
  return normalizeSubject(s).split(" ").filter((t) => t && !STOPWORDS.has(t) && t.length > 1);
}

/** Token-set Jaccard similarity, 0..1. Exact normalized equality short-circuits to 1. */
export function similarity(a, b) {
  const na = normalizeSubject(a), nb = normalizeSubject(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const A = new Set(tokensOf(a)), B = new Set(tokensOf(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Detect a force-create escape hatch in the task input or env. */
export function isForced(toolInput, env = process.env) {
  if (String(env.PRISM_TASK_CLAIM_GUARD ?? "") === "0") return true;
  if (toolInput && typeof toolInput === "object") {
    const md = toolInput.metadata;
    if (md && typeof md === "object" && (md.force || md.forceClaim || md.force_create || md.allowDuplicate)) return true;
    if (typeof toolInput.subject === "string" && /(\[|\()force(\]|\))/i.test(toolInput.subject)) return true;
  }
  return false;
}

/**
 * Find a fresh-enough, fuzzy-matching claim by a *different* session.
 * @param {string} subject       the new task's subject
 * @param {Array}  entries       ledger entries [{subject, session, host, at}]
 * @param {{session:string|null, now:number, ttlMs:number, threshold:number}} opts
 * @returns {{match:object|null, score:number}}
 */
export function findDuplicate(subject, entries, { session, now, ttlMs = DEFAULT_TTL_MS, threshold = DEFAULT_THRESHOLD } = {}) {
  const subjTokens = tokensOf(subject).length;
  const wantExact = subjTokens <= SHORT_SUBJECT_TOKENS;
  const cutoff = now - ttlMs;
  let best = null, bestScore = 0;
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e || typeof e !== "object") continue;
    if (!Number.isFinite(e.at) || e.at < cutoff) continue;          // stale
    if (session && e.session && e.session === session) continue;     // your own claim — fine
    const score = similarity(subject, e.subject);
    if (wantExact ? score >= 1 : score >= threshold) {
      if (score > bestScore) { best = e; bestScore = score; }
    }
  }
  return { match: best, score: bestScore };
}

/**
 * @returns {{action:"allow"|"deny", reason:string, dup?:object, score?:number, append:boolean}}
 *  - append: whether the caller should record this subject in the ledger (true on allow-new, false on dup or force)
 */
export function decideClaim({ subject, session, entries, now = Date.now(), ttlMs = DEFAULT_TTL_MS, threshold = DEFAULT_THRESHOLD, forced = false }) {
  const norm = normalizeSubject(subject);
  if (!norm) return { action: "allow", reason: "empty subject — nothing to dedup", append: false };
  if (forced) return { action: "allow", reason: "forced (env / metadata.force / [force] in subject)", append: true };
  const { match, score } = findDuplicate(subject, entries, { session, now, ttlMs, threshold });
  if (match) {
    const ageMin = Math.max(0, Math.round((now - match.at) / 60000));
    return {
      action: "deny",
      score,
      dup: match,
      append: false,
      reason:
        `Duplicate task. "${match.subject}" was created ${ageMin}min ago by ${match.session || "another chat"}` +
        `${match.host ? ` (${match.host})` : ""} (match ${(score * 100).toFixed(0)}%). Don't re-create it — coordinate via the chat bus, ` +
        `claim a different unit, or if it really is distinct work pass a force escape hatch (metadata.force:true, "[force]" in the subject, or PRISM_TASK_CLAIM_GUARD=0).`,
    };
  }
  return { action: "allow", reason: "no fresh duplicate", append: true };
}

// ── IO ────────────────────────────────────────────────────────────────────────

function findRoot(start = process.cwd()) {
  let cur = start;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const p = path.dirname(cur); if (p === cur) break; cur = p;
  }
  return start;
}
export function ledgerPath(env = process.env, root = findRoot()) {
  return env.PRISM_TASK_CLAIM_LEDGER || path.join(root, LEDGER_REL);
}
export function readLedger(file, now = Date.now(), ttlMs = DEFAULT_TTL_MS, maxLines = 5000) {
  let raw = "";
  try { raw = fs.readFileSync(file, "utf8"); } catch { return { entries: [], pruneDue: false }; }
  let lines = raw.split("\n").filter((l) => l.trim().startsWith("{"));
  if (lines.length > maxLines) lines = lines.slice(-maxLines);
  const cutoff = now - ttlMs;
  const entries = [];
  for (const ln of lines) {
    let e; try { e = JSON.parse(ln); } catch { continue; }
    if (e && typeof e === "object" && typeof e.subject === "string" && Number.isFinite(e.at) && e.at >= cutoff) entries.push(e);
  }
  const pruneDue = lines.length > entries.length * 2 + 32;
  return { entries, pruneDue };
}
function appendEntry(file, entry) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(entry) + "\n"); // O_APPEND atomic for small writes
  } catch { /* ignore */ }
}
function rewriteLedger(file, entries) {
  try {
    const tmp = file + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : ""));
    fs.renameSync(tmp, file);
  } catch { /* ignore */ }
}
function telemetry(root, rec) {
  try {
    const f = path.join(root, ".claude", "cache", "hook-telemetry.jsonl");
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ hook: "task-created-claim-guard", t: new Date().toISOString(), ...rec }) + "\n");
  } catch { /* ignore */ }
}

function ttlMsOf(env) { const n = Number(env.PRISM_TASK_CLAIM_TTL_MS); return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_MS; }
function thresholdOf(env) { const n = Number(env.PRISM_TASK_CLAIM_THRESHOLD); return Number.isFinite(n) && n > 0 && n <= 1 ? n : DEFAULT_THRESHOLD; }

/**
 * @returns {{action:"allow"|"deny", reason:string, dup?:object, score?:number}}
 */
export function runGuard({ stdin, env = process.env, now = Date.now(), root = findRoot() }) {
  const toolInput = stdin?.tool_input || {};
  const subject = toolInput.subject;
  if (typeof subject !== "string" || !subject.trim()) return { action: "allow", reason: "no subject" };
  const session = stdin?.session_id || null;
  const ttlMs = ttlMsOf(env), threshold = thresholdOf(env);
  const file = ledgerPath(env, root);
  const { entries, pruneDue } = readLedger(file, now, ttlMs);
  const decision = decideClaim({ subject, session, entries, now, ttlMs, threshold, forced: isForced(toolInput, env) });
  if (decision.append) {
    appendEntry(file, { subject: subject.slice(0, 300), session, host: stdin?.host || stdin?.machine || null, at: now });
    if (pruneDue) rewriteLedger(file, [...entries, { subject: subject.slice(0, 300), session, host: stdin?.host || null, at: now }]);
  }
  return decision;
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function main() {
  let stdin = null;
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf8");
      if (raw && raw.trim().startsWith("{")) stdin = JSON.parse(raw);
    }
  } catch { stdin = null; }

  const root = findRoot();
  let res;
  try { res = runGuard({ stdin, root }); }
  catch { return emit({ continue: true }); }

  if (res.action === "deny") {
    telemetry(root, { event: "deny-duplicate", subject: stdin?.tool_input?.subject ?? null, dup: res.dup?.subject ?? null, score: res.score, session: stdin?.session_id ?? null });
    return emit({
      continue: true,
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: res.reason, additionalContext: res.reason },
    });
  }
  return emit({ continue: true });
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("task-created-claim-guard.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
