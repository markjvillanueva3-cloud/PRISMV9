#!/usr/bin/env node
// tier: T0
/**
 * subagent-stop-verifier.mjs — SubagentStop hook: verify a subagent's deliverable claims.
 *
 * U-HKA05 of HOOKS-AUTOMATION-V2-MS0. Companion to the existing SubagentStart hook
 * (subagent-start-context.mjs) — agent-scoped hooks on the close side.
 *
 * WHY: subagents routinely report "wrote X / created Y / added the test at Z" and
 * occasionally the file isn't actually there (it returned early, mis-pathed, or
 * the summary drifted from reality). Catching that *before* the subagent returns —
 * by blocking its stop with a "you said you wrote these, they don't exist; create
 * them or correct your summary" message — lets the subagent self-correct, so the
 * parent chat gets a summary it can trust. If the subagent was merely mid-write,
 * the block lets it finish, and the next stop verifies clean.
 *
 * Safety rails (mirrors the spec's failure_modes):
 *   - claim-parse fail / nothing confidently claimed → pass-through (never false-flag)
 *   - already blocked once (`stop_hook_active`) and still failing → don't loop:
 *     record it (telemetry + a flag file the parent can grep) and let it stop
 *   - mid-write → the first block IS the grace period; if the file shows up by the
 *     re-verify it clears on its own
 *
 * @hook SubagentStop  (register in settings.json under "SubagentStop")
 *
 * Env: PRISM_SUBAGENT_VERIFY=0 → disable.
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ── project root ──────────────────────────────────────────────────────────────
export function findRoot(start = process.cwd()) {
  let cur = start;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const p = path.dirname(cur);
    if (p === cur) break;
    cur = p;
  }
  return start;
}

// ── claim extraction (pure) ───────────────────────────────────────────────────

// A path-ish token: chars allowed in a path, ending in a 1-6 char extension.
const PATHISH = "[\\w@./\\\\-]+\\.[A-Za-z0-9]{1,6}";
// Confident *past-tense* creation verbs only — "I'll write X" / "should add X" must NOT match,
// so no present-tense forms (no "write"/"writes"/"add"/"create").
const CREATE_VERB =
  "(?:created|wrote|added|generated|saved|emitted|produced|introduced|authored|committed|scaffolded|landed|delivered|implemented)";
const VERB_RX = new RegExp(`\\b${CREATE_VERB}\\b`, "i");
// after a creation verb: optional articles/quantifiers/descriptors, then the path.
// Global — there can be several creation verbs in one clause ("created X and added Y").
const VERB_ANCHOR_RX_G = new RegExp(
  `\\b${CREATE_VERB}\\s+(?:(?:a|an|the|new|its|two|three|four|five|six|several|the\\s+new)\\s+)*` +
  // a descriptor noun ("the test foo.ts") — but it must be a WHOLE word, not the first
  // segment of the path ("added scripts/foo.mjs": "scripts" is the path, not a noun;
  // "added scriptsomething.ts": "script" is not the noun "script").
  `(?:(?:files?|tests?|modules?|hooks?|engines?|scripts?|dispatchers?|schemas?|configs?|components?|specs?|skills?|wrappers?|versions?|cop(?:y|ies)|stubs?)(?![\\w/\\\\.]))?[\\s:]*` +
  // an optional preposition before the path: "added a test AT path", "saved it TO path"
  `(?:(?:at|in|into|under|to|named|called)\\s+)?` +
  `[\\\`"']?(${PATHISH})[\\\`"']?`, "ig");
const WRAPPED_PATH_RX = new RegExp(`[\\\`"'](${PATHISH})[\\\`"']`, "g");
const LIST_CONT_RX = new RegExp(`^(?:\\s*[,;]\\s*|\\s+(?:and|&|\\+|,?\\s*and|plus)\\s+)[\\\`"']?(${PATHISH})[\\\`"']?`, "i");
const CODE_EXT_RX = /\.(?:ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|c|h|cpp|hpp|cs|rb|php|swift|kt|sh|ps1|sql|css|scss|less|html?|vue|svelte|json|jsonl|md|markdown|yaml|yml|toml|xml|csv|txt|cfg|ini|lock|sln|gradle|cmake)$/i;
const STOPWORDS = new Set(["e.g.", "i.e.", "etc.", "vs.", "no.", "fig.", "et.al."]);

function cleanCandidate(raw) {
  let c = String(raw ?? "").trim().replace(/^[`"'(\[]+/, "").replace(/[`"')\].,;:!?]+$/, "");
  if (!c || c.length < 5 || c.length > 200) return null;
  if (/\s/.test(c)) return null;
  if (STOPWORDS.has(c.toLowerCase())) return null;
  if (!/\.[A-Za-z0-9]{1,6}$/.test(c)) return null;          // must end in an extension
  if (!CODE_EXT_RX.test(c)) return null;                    // ...and a recognised code/data extension
  // A claim must include a path separator. A bare basename ("Foo.ts") is too ambiguous to verify —
  // it could live anywhere — so flagging it "missing at the repo root" produces false positives
  // (e.g. a reviewer subagent that *cites* a file by basename in its prose). Real deliverable
  // claims give a real path ("created mcp-server/src/engines/Foo.ts").
  if (!/[\\/]/.test(c)) return null;
  if (/^https?:/i.test(c) || /[*?]|\$\{/.test(c)) return null; // not a URL / glob / template
  return c.replace(/\\/g, "/");
}

/** Extract distinct, plausibly-real file paths a piece of text *claims to have created*. */
export function extractFileClaims(text) {
  if (typeof text !== "string" || !text) return [];
  const found = new Set();
  const add = (raw) => { const c = cleanCandidate(raw); if (c) found.add(c); };
  // Split into clause-ish chunks; only chunks containing a creation verb get mined,
  // so "it imports `Bar.ts`" (no creation verb) never produces a claim.
  const clauses = text.split(/(?<=[.!?;])\s+|\n+/);
  for (const clause of clauses) {
    if (!VERB_RX.test(clause)) continue;
    // (a) every backtick/quote-wrapped path-ish token in a creation clause (high confidence)
    WRAPPED_PATH_RX.lastIndex = 0;
    let w;
    while ((w = WRAPPED_PATH_RX.exec(clause)) !== null) add(w[1]);
    // (b) every "<creation verb> ... <path>" in the clause, each followed by a possible
    //     comma/and-separated continuation of bare paths ("created a.ts, b.ts and c.ts").
    VERB_ANCHOR_RX_G.lastIndex = 0;
    let m;
    while ((m = VERB_ANCHOR_RX_G.exec(clause)) !== null) {
      add(m[1]);
      let tail = clause.slice(VERB_ANCHOR_RX_G.lastIndex);
      let cm;
      while ((cm = LIST_CONT_RX.exec(tail)) !== null) { add(cm[1]); tail = tail.slice(cm[0].length); }
      if (m[0].length === 0) VERB_ANCHOR_RX_G.lastIndex++; // guard against a zero-length match loop
    }
  }
  return [...found];
}

// ── verification (IO, injectable) ─────────────────────────────────────────────

/** Resolve a claimed path against the repo root (absolute paths used as-is) and check existence. */
export function verifyClaims(claims, { existsFn = (p) => fs.existsSync(p), root = findRoot() } = {}) {
  const verified = [];
  const missing = [];
  for (const c of claims) {
    const candidates = path.isAbsolute(c) || /^[A-Za-z]:[\\/]/.test(c)
      ? [c]
      : [path.join(root, c), c]; // try repo-relative first, then literal (in case cwd differs)
    let ok = false;
    for (const cand of candidates) {
      try { if (existsFn(cand)) { ok = true; break; } } catch { /* ignore */ }
    }
    (ok ? verified : missing).push(c);
  }
  return { verified, missing };
}

/**
 * @param {{missing:string[], claimsCount:number, stopHookActive:boolean}} p
 * @returns {{action:"pass"|"block"|"warn", message:string}}
 */
export function decideVerdict({ missing, claimsCount, stopHookActive }) {
  if (claimsCount === 0) return { action: "pass", message: "" };           // nothing to verify
  if (missing.length === 0) return { action: "pass", message: "" };        // all good
  const list = missing.join(", ");
  if (stopHookActive) {
    // we already blocked once and it's still wrong → don't loop; surface + stop
    return { action: "warn", message: `Subagent finished still claiming files that don't exist on disk: ${list}. Its summary is unreliable on those.` };
  }
  return {
    action: "block",
    message:
      `⚠️ Self-verify (subagent-stop-verifier): your summary says you created/wrote these files, ` +
      `but they don't exist on disk: ${list}. Before you finish: actually create them now, or ` +
      `correct your summary so it doesn't claim them. (If you were mid-write, finish the write.)`,
  };
}

// ── glue ──────────────────────────────────────────────────────────────────────

/** Pull the subagent's final text from the stop payload (several shapes) or its transcript. */
export function getSubagentText(stdin, { readFileSafe = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } } } = {}) {
  if (!stdin || typeof stdin !== "object") return "";
  for (const k of ["result", "last_assistant_message", "lastAssistantMessage", "output", "summary", "final_message"]) {
    if (typeof stdin[k] === "string" && stdin[k]) return stdin[k];
  }
  // fall back to the subagent's transcript: last assistant message's text blocks
  const tp = stdin.transcript_path || stdin.transcriptPath;
  if (typeof tp === "string" && tp) {
    const raw = readFileSafe(tp);
    if (raw) {
      const lines = raw.split("\n").filter((l) => l.trim().startsWith("{"));
      for (let i = lines.length - 1; i >= 0; i--) {
        let obj; try { obj = JSON.parse(lines[i]); } catch { continue; }
        const msg = obj?.message || obj;
        const role = msg?.role || obj?.role || obj?.type;
        if (role !== "assistant") continue;
        const content = msg?.content;
        if (typeof content === "string") return content;
        if (Array.isArray(content)) {
          const txt = content.filter((b) => b && (b.type === "text" || typeof b.text === "string")).map((b) => b.text || "").join("\n").trim();
          if (txt) return txt;
        }
      }
    }
  }
  return "";
}

function flagFile(root) { return path.join(root, ".claude", "cache", "subagent-false-claims.jsonl"); }
function recordFlag(root, rec) {
  try {
    const f = flagFile(root);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ t: new Date().toISOString(), ...rec }) + "\n");
  } catch { /* ignore */ }
}
function telemetry(root, rec) {
  try {
    const f = path.join(root, ".claude", "cache", "hook-telemetry.jsonl");
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ hook: "subagent-stop-verifier", t: new Date().toISOString(), ...rec }) + "\n");
  } catch { /* ignore */ }
}

export function runVerifier({ stdin, env = process.env, existsFn, root = findRoot(), getText = getSubagentText }) {
  if (String(env.PRISM_SUBAGENT_VERIFY ?? "") === "0") return { action: "pass", message: "", claims: [], missing: [], disabled: true };
  const text = getText(stdin);
  const claims = extractFileClaims(text);
  if (claims.length === 0) return { action: "pass", message: "", claims, missing: [] };
  const { verified, missing } = verifyClaims(claims, { existsFn, root });
  const stopHookActive = !!(stdin && (stdin.stop_hook_active || stdin.stopHookActive));
  const v = decideVerdict({ missing, claimsCount: claims.length, stopHookActive });
  return { ...v, claims, verified, missing, stopHookActive };
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
  try { res = runVerifier({ stdin, root }); }
  catch { return emit({ continue: true }); }

  if (res.disabled || res.action === "pass") {
    if (res.claims?.length) telemetry(root, { event: "verified-ok", claims: res.claims.length, session: stdin?.session_id ?? null });
    return emit({ continue: true });
  }
  if (res.action === "block") {
    telemetry(root, { event: "false-claim-block", missing: res.missing, claims: res.claims.length, session: stdin?.session_id ?? null });
    recordFlag(root, { event: "block", missing: res.missing, session: stdin?.session_id ?? null });
    return emit({ decision: "block", reason: res.message });
  }
  // warn (already blocked once, still failing) — surface, but let it stop
  telemetry(root, { event: "false-claim-persisted", missing: res.missing, claims: res.claims.length, session: stdin?.session_id ?? null });
  recordFlag(root, { event: "persisted", missing: res.missing, session: stdin?.session_id ?? null });
  return emit({ continue: true, systemMessage: res.message });
}

const invokedDirectly = (() => {
  try { return path.resolve(process.argv[1] || "").endsWith("subagent-stop-verifier.mjs"); }
  catch { return false; }
})();
if (invokedDirectly) main();
