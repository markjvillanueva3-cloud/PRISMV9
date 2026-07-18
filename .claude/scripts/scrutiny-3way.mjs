#!/usr/bin/env node
/**
 * scrutiny-3way — multi-reviewer parallel scrutiny orchestrator.
 *
 * Three independent Claude PRISM agents, all required PASS to release the
 * Stop hook (NO external CLI dependency — Codex CLI was retired 2026-05-13
 * after persistent diff-size truncation on PRISM-scale commits exceeded its
 * 80 KB context budget):
 *   1. Claude reviewer agent A  — holistic strict review (acceptance criteria)
 *   2. Claude reviewer agent B  — independent second pass, weighted toward
 *                                 test integrity / dispatcher wiring / inlined constants
 *   3. Claude reviewer agent C  — analyst-weighted third pass, focused on hidden
 *                                 anti-patterns / regression risk / silent breakage,
 *                                 dispatched as `code-analyzer` subagent_type
 *
 * This script does NOT spawn any reviewer — all three run via the chat's Agent
 * tool. The script emits all three reviewer prompts (`opusReviewerPrompt` = A,
 * `opusReviewerPromptB` = B, `analystReviewerPrompt` = C) and awaits the chat's
 * `--mark-opus` (A) / `--mark-claude` (B) / `--mark-analyst` (C) marks.
 *
 * Strict 3-of-3 policy: the Stop hook releases ONLY when arm A (opus) AND arm
 * B (claude) AND arm C (analyst) have all been marked PASS for the session.
 *
 * Ledger flag mapping (back-compat with the pre-2026-05-13 Codex arm — same
 * slot, repurposed):
 *   armA → opusReviewed   (chat sets via --mark-opus / --mark-opus-a)
 *   armB → claudeReviewed (chat sets via --mark-claude; legacy --mark-opus-b / --mark-gemini)
 *   armC → codexReviewed  (chat sets via --mark-analyst; legacy --mark-codex)
 *
 * (History: arm 1 was the Codex CLI until 2026-05-13 — its 80 KB context limit
 *  truncated PRISM-scale commits and produced false-FAIL "diff-truncated"
 *  blockers that could not be resolved without splitting the commit. The arm
 *  was swapped for a third Claude reviewer agent dispatched via the chat's
 *  Agent tool, which sees the full diff. arm 2 was the Gemini CLI until
 *  2026-05-12, also swapped for a Claude reviewer for similar quota/trust-dir
 *  reasons. End result: three independent Claude passes with distinct
 *  attention-weighting, no external CLI dependencies.)
 *
 * Usage:
 *   node .claude/scripts/scrutiny-3way.mjs                        # review uncommitted diff
 *   node .claude/scripts/scrutiny-3way.mjs --target HEAD          # review last commit
 *   node .claude/scripts/scrutiny-3way.mjs --target c6663f95b     # review specific commit
 *   node .claude/scripts/scrutiny-3way.mjs --session-id abc       # explicit session id
 *   node .claude/scripts/scrutiny-3way.mjs --mark-opus     pass --session-id abc  # record arm A
 *   node .claude/scripts/scrutiny-3way.mjs --mark-claude   pass --session-id abc  # record arm B
 *   node .claude/scripts/scrutiny-3way.mjs --mark-analyst  pass --session-id abc  # record arm C
 *     (aliases: --mark-opus-b / --mark-gemini → arm B; --mark-codex → arm C)
 *
 * Output: JSON object with all three Claude-reviewer prompts, and the shell
 * commands the chat must run after the Agent tool reviews return.
 *
 * Authored: 2026-05-05 (claude-66471c04, CAD-COMPLETE-MS0 wrap-up).
 * Reworked: 2026-05-12 — Gemini→Claude-B swap.
 * Reworked: 2026-05-13 — Codex→Claude-C swap (user directive: "claude prism agents only").
 * Extended: 2026-05-18 — advisory Codex CLI review arm added (--codex-review
 *   subcommand + runCodexReview()). NON-GATE: it runs in parallel with the
 *   three Claude agents, surfaces an independent verdict, and degrades to
 *   "skipped" on any Codex failure (quota/auth/offline/hang). The strict
 *   3-of-3 ledger contract is unchanged — Codex never marks the ledger.
 */

import { spawn, execFileSync, execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { recordScrutiny, getEntry, parseVerdictLine, isCleared } from "../helpers/scrutiny-ledger.mjs";
import { slotForGalaxy } from "../../scripts/lib/slot-galaxy-map.mjs";

const STABLE_SESSION_HELPER_TIMEOUT_MS = 2000;

function findStableSessionId(explicitId) {
  if (explicitId) return explicitId;
  if (process.env.CLAUDE_SESSION_ID) return process.env.CLAUDE_SESSION_ID;
  const helper = path.resolve(".claude/helpers/stable-session-id.mjs");
  if (fs.existsSync(helper)) {
    try {
      const out = execSync(`node "${helper}"`, {
        stdio: ["ignore", "pipe", "ignore"],
        timeout: STABLE_SESSION_HELPER_TIMEOUT_MS,
      }).toString().trim();
      if (out) return out;
    } catch { /* fall through */ }
  }
  return "unknown-session";
}

/**
 * Resolve npx for the host. Honors $PRISM_NPX_BIN, then falls back to a
 * Windows-friendly default that's known to exist on this developer's
 * machine, then to a portable "npx" / "npx.cmd" name on PATH.
 *
 * Gemini blocker #4: prior code hardcoded "H:\\Tools\\nodejs\\npx.cmd"
 * which fails on Linux/macOS hosts and on Windows machines without that
 * specific layout.
 */
function resolveNpx() {
  if (process.env.PRISM_NPX_BIN) return process.env.PRISM_NPX_BIN;
  const winDefault = "H:\\Tools\\nodejs\\npx.cmd";
  if (process.platform === "win32") {
    try {
      if (fs.existsSync(winDefault)) return winDefault;
    } catch { /* fall through */ }
    return "npx.cmd";
  }
  return "npx";
}

/**
 * Resolve the Codex CLI binary for the advisory review arm. Mirrors
 * resolveNpx(): $PRISM_CODEX_BIN wins, then a Windows-friendly default (npm
 * installs `codex` into the Node prefix, H:\Tools\nodejs\, which is not always
 * on PATH), then bare `codex.cmd` / `codex` on PATH. The arm is advisory — an
 * unresolvable binary just yields a graceful "skipped", never a blocked gate.
 */
function resolveCodex() {
  if (process.env.PRISM_CODEX_BIN) return process.env.PRISM_CODEX_BIN;
  if (process.platform === "win32") {
    const winDefault = "H:\\Tools\\nodejs\\codex.cmd";
    try {
      if (fs.existsSync(winDefault)) return winDefault;
    } catch { /* fall through */ }
    return "codex.cmd";
  }
  return "codex";
}
const CODEX_BIN = process.env.CODEX_BIN ?? resolveNpx();
// Prompt is delivered via stdin, NOT argv. `codex exec` with no positional
// argument reads from stdin. Keeping args small also avoids the Windows
// 8191-char cmd-line limit when shell:true wraps .cmd invocations.
// Reasoning effort overridden to "medium" so a ~80 KB diff review finishes in
// ~3-5 min instead of the 8-12 min default xhigh on gpt-5.5.
const CODEX_ARGS = process.env.CODEX_ARGS
  ? process.env.CODEX_ARGS.split(" ")
  : ["--no-install", "codex", "exec", "--skip-git-repo-check", "-c", "model_reasoning_effort=\"medium\""];

const REVIEW_TIMEOUT_MS = 360_000; // 6 min per provider; covers cold-start + xhigh reasoning on diffs up to 80KB

// OBSIDIAN-AUTOMATE-MS3/U-LOCAL-PREFLIGHT: optional Ollama-driven pre-flight
// reviewer that runs before (or in parallel with) the Codex arm. Two modes:
//   PRISM_SCRUTINY_PREFLIGHT=parallel (default) — advisory, runs alongside Codex,
//                                                  surfaces an extra verdict in output
//   PRISM_SCRUTINY_PREFLIGHT=gate     — runs FIRST; local FAIL aborts before
//                                       the Codex arm is dispatched (saves quota)
//   PRISM_SCRUTINY_PREFLIGHT=0/off    — disabled, original 3-of-3 path
// The pre-flight is ADVISORY by default and never marks the gate ledger —
// the strict 3-of-3 contract (codex + Claude reviewer A + Claude reviewer B PASS)
// is unchanged.
const PREFLIGHT_MODE = (process.env.PRISM_SCRUTINY_PREFLIGHT ?? "parallel").toLowerCase();
const PREFLIGHT_ENABLED = PREFLIGHT_MODE !== "0" && PREFLIGHT_MODE !== "off" && PREFLIGHT_MODE !== "false";
const PREFLIGHT_GATE = PREFLIGHT_MODE === "gate";
const PREFLIGHT_URL = process.env.PRISM_SCRUTINY_PREFLIGHT_URL ?? "http://127.0.0.1:11434/api/generate";
const PREFLIGHT_MODEL = process.env.PRISM_SCRUTINY_PREFLIGHT_MODEL ?? "qwen2.5-coder:32b";
const PREFLIGHT_TIMEOUT_MS = Number(process.env.PRISM_SCRUTINY_PREFLIGHT_TIMEOUT_MS) || 90_000; // 90s — deepseek-r1 reasoning takes time
const PREFLIGHT_MAX_PROMPT_BYTES = 60_000; // tighter than cloud — local context window pressure

// ── Advisory Codex CLI review arm (2026-05-18) ──────────────────────────────
// `codex review` reviews the working tree directly — no diff is piped to it,
// so the 80 KB stdin-truncation false-FAIL that retired the 2026-05-13 Codex
// gate arm cannot recur. This arm is ADVISORY: it never marks the 3-of-3
// ledger; any Codex failure (quota / auth / offline / hang) yields "skipped".
// Default ON — PRISM_SCRUTINY_CODEX=off|0|false|no disables it.
const CODEX_ARM_MODE = String(process.env.PRISM_SCRUTINY_CODEX ?? "on").toLowerCase();
const CODEX_ARM_ENABLED = !["0", "off", "false", "no"].includes(CODEX_ARM_MODE);
const CODEX_REVIEW_BIN = resolveCodex();
const CODEX_REVIEW_TIMEOUT_MS = Number(process.env.PRISM_SCRUTINY_CODEX_TIMEOUT_MS) || 360_000; // 6 min — codex review of a real diff takes minutes; hard-kill backstop
const CODEX_REVIEW_EFFORT = process.env.PRISM_SCRUTINY_CODEX_EFFORT ?? "medium";
// Custom review instructions piped to `codex review -` via stdin. Mandates the
// same VERDICT contract the other arms use so parseVerdictLine() parses it.
const CODEX_REVIEW_INSTRUCTIONS = [
  "You are a strict code reviewer for the PRISM manufacturing-intelligence platform.",
  "Review the uncommitted changes (or the named commit) in this repository against these criteria:",
  "  1. No stub engines, TODOs, or placeholder returns",
  "  2. Tests use concrete assertions (no toBeDefined()/toBeTruthy() blanket stubs)",
  "  3. >=3 failure modes covered for any new engine",
  "  4. Physics constants imported from src/physics/constants.ts (never inlined)",
  "  5. New engines wired to every dispatcher that would naturally consume them",
  "  6. No floating promises, no any-spread anti-patterns, no silent breakage of peer modules",
  "",
  "Your response MUST begin with exactly one line: 'VERDICT: PASS' or 'VERDICT: FAIL'.",
  "Then list specific issues, one per line, each prefixed 'BLOCKER:'. Then <=5 notes lines.",
  "If unsure between PASS and FAIL, choose FAIL.",
].join("\n");

const DEFAULT_MAX_DIFF_BYTES = 80_000;     // truncate huge diffs so providers don't OOM
const MAX_DIFF_BYTES = (() => {
  const env = process.env.PRISM_SCRUTINY_MAX_DIFF_BYTES;
  if (!env) return DEFAULT_MAX_DIFF_BYTES;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_DIFF_BYTES;
})();
const MAX_OUTPUT_PEEK = 8_000;     // stored in ledger notes

// Refname allowlist for a review `target` (commit-ish / branch). Shared by
// captureDiff() and runCodexReview() so the two target consumers cannot drift
// — a target reaching an argv must satisfy this (no shell metacharacters).
const VALID_TARGET_RE = /^[A-Za-z0-9._/-]+$/;

// `git diff` timeout. The old value (8 s) was too short on this repo — with
// 7 000+ uncommitted files in the working tree, `git diff HEAD` routinely
// took >8 s, returned a "[git diff capture failed: …ETIMEDOUT]" placeholder,
// and that placeholder got fed to the reviewers as the "diff" — so Codex (and
// every arm) "reviewed" a one-line error string and returned garbage. Default
// 120 s; override with PRISM_SCRUTINY_GIT_TIMEOUT_MS for slower hosts.
const DEFAULT_GIT_DIFF_TIMEOUT_MS = 120_000;
const GIT_DIFF_TIMEOUT_MS = (() => {
  const env = process.env.PRISM_SCRUTINY_GIT_TIMEOUT_MS;
  if (!env) return DEFAULT_GIT_DIFF_TIMEOUT_MS;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_GIT_DIFF_TIMEOUT_MS;
})();

// Auto-regenerated artifact paths excluded from the reviewable diff. These are
// counters / snapshots / generated indexes that churn on every SessionStart;
// including them buries the actual code change under hundreds of KB of noise
// (and is a big chunk of why `git diff` was slow enough to hit the old 8 s
// timeout). Mirrors scrutinize-before-stop.mjs:meaningfulChangedFiles(). Set
// PRISM_SCRUTINY_NO_DIFF_FILTER=1 to review the unfiltered diff.
const DIFF_FILTER_ENABLED = !["1", "true", "yes"].includes(
  String(process.env.PRISM_SCRUTINY_NO_DIFF_FILTER || "").toLowerCase(),
);
const DIFF_EXCLUDE_PATHSPECS = [
  ":(exclude)mcp-server/data/state",
  ":(exclude)PRISM-INVENTORY-LATEST.md",
  ":(exclude)state/shared/SVI-watch-status.json",
  ":(exclude)state/shared/SVI-watch-status.md",
  ":(exclude)state/shared/system-viz",
];

const REVIEW_SYSTEM = `You are a strict code reviewer for the PRISM manufacturing-intelligence platform. \
You will be given a unified diff of recent changes and asked for a code review verdict.

Acceptance criteria (per PRISM CLAUDE.md):
  1. No stub engines, TODOs, or placeholder returns
  2. Tests use concrete assertions (no toBeDefined() blanket stubs, no synthetic threshold loops)
  3. ≥3 failure modes covered for any new engine
  4. Physics constants imported from src/physics/constants.ts (never inlined)
  5. New engines wired to every dispatcher that would naturally consume them
  6. New tests use vitest, exact values via toBe()/toEqual()/toBeCloseTo()
  7. No floating promises, no any-spread anti-patterns introduced

Respond with EXACTLY this format on the first line:
  VERDICT: PASS    (if all criteria met)
  VERDICT: FAIL    (if ANY criterion violated)

After the verdict line, list specific blockers (1 per line, prefix BLOCKER:).
Then optionally add up to 5 lines of additional notes.

Be strict. If unsure between PASS and FAIL, choose FAIL.`;

function parseArgs(argv) {
  const out = {
    target: "",
    sessionId: "",
    skip: [],
    markOpus: "",       // "pass" | "fail" — Claude reviewer arm A; runs in mark-only mode
    markOpusB: "",      // "pass" | "fail" — Claude reviewer arm B; runs in mark-only mode
    markAnalyst: "",    // "pass" | "fail" — Claude reviewer arm C (analyst); legacy --mark-codex alias
    notes: "",
    blockers: "",
    status: false,
    codexReview: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") out.target = argv[++i] || "";
    else if (a.startsWith("--target=")) out.target = a.slice("--target=".length);
    else if (a === "--session-id") out.sessionId = argv[++i] || "";
    else if (a.startsWith("--session-id=")) out.sessionId = a.slice("--session-id=".length);
    else if (a === "--skip") out.skip.push((argv[++i] || "").toLowerCase());
    // Arm B must be matched before the generic --mark-opus check below.
    else if (a === "--mark-opus-b") out.markOpusB = (argv[++i] || "").toLowerCase();
    else if (a.startsWith("--mark-opus-b=")) out.markOpusB = a.slice("--mark-opus-b=".length).toLowerCase();
    else if (a === "--mark-claude" || a === "--mark-gemini") out.markOpusB = (argv[++i] || "").toLowerCase();
    else if (a.startsWith("--mark-claude=")) out.markOpusB = a.slice("--mark-claude=".length).toLowerCase();
    else if (a.startsWith("--mark-gemini=")) out.markOpusB = a.slice("--mark-gemini=".length).toLowerCase();
    else if (a === "--mark-opus-a") out.markOpus = (argv[++i] || "").toLowerCase();          // alias for --mark-opus
    else if (a.startsWith("--mark-opus-a=")) out.markOpus = a.slice("--mark-opus-a=".length).toLowerCase();
    else if (a === "--mark-opus") out.markOpus = (argv[++i] || "").toLowerCase();
    else if (a.startsWith("--mark-opus=")) out.markOpus = a.slice("--mark-opus=".length).toLowerCase();
    // Arm C (analyst) — chat-settable mark for the third Claude reviewer.
    // --mark-codex is accepted as a legacy alias (the slot was named after the
    // retired Codex arm; the ledger field `codexReviewed` is unchanged for
    // backward compat with pre-2026-05-13 ledger entries).
    else if (a === "--mark-analyst" || a === "--mark-codex") out.markAnalyst = (argv[++i] || "").toLowerCase();
    else if (a.startsWith("--mark-analyst=")) out.markAnalyst = a.slice("--mark-analyst=".length).toLowerCase();
    else if (a.startsWith("--mark-codex=")) out.markAnalyst = a.slice("--mark-codex=".length).toLowerCase();
    else if (a === "--notes") out.notes = argv[++i] || "";
    else if (a.startsWith("--notes=")) out.notes = a.slice("--notes=".length);
    else if (a === "--blockers") out.blockers = argv[++i] || "";
    else if (a.startsWith("--blockers=")) out.blockers = a.slice("--blockers=".length);
    else if (a === "--status") out.status = true;
    else if (a === "--codex-review") out.codexReview = true;
  }
  return out;
}

function captureDiff(target, maxBytes = MAX_DIFF_BYTES) {
  try {
    // Codex blocker #4: previously did `git show ${target}` interpolated
    // into a shell. A maliciously named branch/tag could inject shell
    // metacharacters. Switch to execFileSync with an explicit argv array
    // and validate `target` against a strict refname allowlist before use.
    let args;
    if (!target || target === "diff") {
      args = ["diff", "HEAD", "--no-color"];
    } else if (target === "HEAD") {
      args = ["show", "HEAD", "--no-color"];
    } else {
      if (!VALID_TARGET_RE.test(target)) {
        return {
          text: `[scrutiny-3way: target "${String(target)}" rejected — must match /^[A-Za-z0-9._\\/-]+$/]`,
          truncated: false,
          totalBytes: 0,
          error: `target-rejected: ${String(target)}`,
        };
      }
      args = ["show", target, "--no-color"];
    }
    // Drop auto-regenerated noise from the reviewable diff (env-disableable).
    // Pathspec magic works for both `git diff` and `git show` — the `.`
    // positive pathspec is needed alongside the `:(exclude)` ones, and cwd is
    // already the repo root (main() chdir'd before calling us).
    if (DIFF_FILTER_ENABLED) {
      args = [...args, "--", ".", ...DIFF_EXCLUDE_PATHSPECS];
    }
    const out = execFileSync("git", args, {
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 16 * 1024 * 1024,
      timeout: GIT_DIFF_TIMEOUT_MS,
    }).toString();
    if (out.length > maxBytes) {
      return {
        text: out.slice(0, maxBytes) + `\n\n... [truncated at ${maxBytes} bytes — full diff is ${out.length} bytes]`,
        truncated: true,
        totalBytes: out.length,
      };
    }
    return { text: out, truncated: false, totalBytes: out.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: `[scrutiny-3way: git diff capture failed: ${msg}]`, truncated: false, totalBytes: 0, error: msg };
  }
}

function spawnReview(provider, bin, args, stdinPayload) {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (verdict, blockers, notes, errMsg) => {
      if (settled) return;
      settled = true;
      resolve({
        provider,
        verdict,
        blockers,
        notes,
        errMsg,
        durationMs: Date.now() - start,
        rawOutputPeek: stdout.slice(0, MAX_OUTPUT_PEEK),
      });
    };

    let child;
    try {
      // Windows .cmd/.bat needs shell:true (modern Node refuses direct spawn).
      const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(bin);
      child = spawn(bin, args, {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        shell: useShell,
      });
    } catch (err) {
      finish("fail", `spawn-failed: ${err.message}`, "", err.message);
      return;
    }

    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      finish("fail", `timeout-after-${REVIEW_TIMEOUT_MS}ms`, "", "review-timeout");
    }, REVIEW_TIMEOUT_MS);

    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => {
      clearTimeout(timer);
      finish("fail", `child-error: ${err.message}`, "", err.message);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = stdout.trim();
      // Codex blockers #2 + #3 + Gemini #2: parse via the shared, unit-
      // tested parseVerdictLine helper. The helper requires the first
      // non-empty line to start with `VERDICT:` followed by PASS/FAIL on
      // a word boundary — trailing notes are allowed (e.g.
      // "VERDICT: PASS — confidence high") since the system prompt itself
      // shows trailing parens. Missing or malformed VERDICT defaults to
      // FAIL ("if unsure choose FAIL"). The helper also strips known
      // Windows shim noise ("SUCCESS: The process with PID X has been
      // terminated.") that the Codex .cmd shim prepends on Windows.
      const { verdict: parsedVerdict, firstLine } = parseVerdictLine(text);
      const verdict = parsedVerdict ?? "fail";
      const blockerLines = text
        .split(/\r?\n/)
        .filter((l) => /^BLOCKER:/i.test(l.trim()))
        .map((l) => l.trim())
        .join("\n");
      const exitInfo = code === 0 ? "" : `[exit ${code}]`;
      const stderrPeek = stderr.length > 0 ? `\nstderr: ${stderr.slice(0, 500)}` : "";
      // Detect environmental failures that should be obvious to the operator.
      // These default to FAIL (correct — we got no real review) but the note
      // makes clear it's env-broken, not code-broken, so the operator knows
      // to wait for env recovery (quota reset, network) or use the 3-block
      // escape hatch rather than chasing phantom blockers.
      const envFailMarker = (() => {
        // Environmental failures (env-broken, NOT code-broken). The verdict is
        // already FAIL by this point — these markers just tell the operator to
        // wait for env recovery / use the block-ceiling escape hatch rather
        // than chase phantom blockers.
        if (/exhausted your daily|usage limit reached|rate.?limit(ed)?|too many requests|\b429\b|TerminalQuotaError/i.test(stderr))
          return "[ENV_FAIL: provider-rate-limit/quota — retry later or use the 3-block escape hatch]";
        if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/i.test(stderr)) return "[ENV_FAIL: network — provider host unreachable]";
        if (!parsedVerdict && code !== 0 && text.length === 0) return "[ENV_FAIL: empty-stdout — provider crashed before any output]";
        return "";
      })();
      const verdictNote = parsedVerdict
        ? ""
        : `[VERDICT line missing or malformed; defaulted to FAIL. firstLine="${firstLine.slice(0, 120)}"]`;
      finish(
        verdict,
        blockerLines,
        `${envFailMarker}${envFailMarker ? "\n" : ""}${verdictNote}${exitInfo}${stderrPeek}`.trim(),
        "",
      );
    });

    // Pipe prompt via stdin
    try {
      child.stdin.write(stdinPayload);
      child.stdin.end();
    } catch (err) {
      // some CLIs read prompt from argv instead — already passed
    }
  });
}

/**
 * Local pre-flight reviewer via Ollama. Uses the same VERDICT contract as
 * the cloud arm so parseVerdictLine works unchanged. Returns the same
 * shape spawnReview() returns so downstream output is uniform.
 *
 * Never throws on transport failure — returns `skipped: true` instead.
 * The cloud arm is always allowed to proceed when the local arm is
 * unreachable; preventing local-Ollama outages from blocking cloud
 * review is the whole point of this being advisory by default.
 */
async function runOllamaPreflight(prompt, opts = {}) {
  const start = Date.now();
  // Test-time injectable overrides; production callers pass nothing and
  // the module-scoped env-derived constants apply.
  const enabled = opts.enabled ?? PREFLIGHT_ENABLED;
  const url = opts.url ?? PREFLIGHT_URL;
  const model = opts.model ?? PREFLIGHT_MODEL;
  const timeoutMs = opts.timeoutMs ?? PREFLIGHT_TIMEOUT_MS;
  const maxPromptBytes = opts.maxPromptBytes ?? PREFLIGHT_MAX_PROMPT_BYTES;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  if (!enabled) {
    return {
      provider: "ollama-preflight",
      verdict: "skipped",
      blockers: "",
      notes: "preflight disabled (PRISM_SCRUTINY_PREFLIGHT=off)",
      durationMs: 0,
      skipped: true,
    };
  }
  // Trim prompt to local context window — strip the diff middle if needed.
  const safePrompt = prompt.length > maxPromptBytes
    ? prompt.slice(0, maxPromptBytes) +
      `\n\n[preflight: prompt truncated to ${maxPromptBytes} bytes; full diff is ${prompt.length}]`
    : prompt;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: safePrompt,
        stream: false,
        options: { temperature: 0.2, num_predict: 600 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        provider: "ollama-preflight",
        verdict: "skipped",
        blockers: "",
        notes: `[preflight: http-${res.status} ${res.statusText} — falling through]`,
        durationMs: Date.now() - start,
        skipped: true,
      };
    }
    const body = await res.json();
    const text = typeof body.response === "string" ? body.response : "";
    // deepseek-r1 wraps reasoning in <think>...</think>; strip before parsing.
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    const { verdict: parsedVerdict, firstLine } = parseVerdictLine(cleaned);
    const verdict = parsedVerdict ?? "fail";
    const blockerLines = cleaned
      .split(/\r?\n/)
      .filter((l) => /^BLOCKER:/i.test(l.trim()))
      .map((l) => l.trim())
      .join("\n");
    const verdictNote = parsedVerdict
      ? ""
      : `[VERDICT line missing or malformed; defaulted to FAIL. firstLine="${firstLine.slice(0, 120)}"]`;
    return {
      provider: "ollama-preflight",
      verdict,
      blockers: blockerLines,
      notes: `[advisory ${model} ${Date.now() - start}ms] ${verdictNote}`.trim(),
      durationMs: Date.now() - start,
      skipped: false,
      rawOutputPeek: cleaned.slice(0, MAX_OUTPUT_PEEK),
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      provider: "ollama-preflight",
      verdict: "skipped",
      blockers: "",
      notes: `[preflight: ${msg.includes("abort") ? "timeout" : "fetch-failed"} — ${msg.slice(0, 120)}]`,
      durationMs: Date.now() - start,
      skipped: true,
    };
  }
}

/**
 * Advisory Codex CLI review arm. Spawns `codex exec review` against the
 * working tree (or a commit) and parses its VERDICT line. ADVISORY ONLY —
 * like runOllamaPreflight(), it never marks the strict 3-of-3 ledger.
 *
 * Failure handling is the whole reason this is advisory: a spawn error,
 * non-zero exit, empty output, timeout, or any quota/auth/network signature
 * resolves to verdict:"skipped" — never a "fail" an operator could mistake
 * for a real code blocker. Codex's CLI quota/offline failures are exactly
 * why it was retired as a gate arm 2026-05-13; here they degrade silently
 * and the strict 3-of-3 Claude gate is wholly unaffected.
 *
 * Returns the runOllamaPreflight() shape so downstream output is uniform:
 *   { provider, verdict, blockers, notes, durationMs, skipped, rawOutputPeek? }
 *
 * @param {string} target  "" / "diff" → review uncommitted; "HEAD" or a sha →
 *                          review that commit (mirrors captureDiff semantics).
 * @param {object} opts     test seam — { enabled, bin, timeoutMs, effort,
 *                          instructions, spawnImpl }.
 */
async function runCodexReview(target, opts = {}) {
  const start = Date.now();
  const enabled = opts.enabled ?? CODEX_ARM_ENABLED;
  const bin = opts.bin ?? CODEX_REVIEW_BIN;
  const timeoutMs = opts.timeoutMs ?? CODEX_REVIEW_TIMEOUT_MS;
  const effort = opts.effort ?? CODEX_REVIEW_EFFORT;
  const instructions = opts.instructions ?? CODEX_REVIEW_INSTRUCTIONS;
  const spawnImpl = opts.spawnImpl ?? spawn;
  const skip = (notes) => ({
    provider: "codex-review",
    verdict: "skipped",
    blockers: "",
    notes,
    durationMs: Date.now() - start,
    skipped: true,
  });
  if (!enabled) {
    // Mirror runOllamaPreflight's disabled return exactly (durationMs 0).
    return {
      provider: "codex-review",
      verdict: "skipped",
      blockers: "",
      notes: "codex arm disabled (PRISM_SCRUTINY_CODEX=off)",
      durationMs: 0,
      skipped: true,
    };
  }
  // Reject an unsafe target before it reaches the codex argv — same refname
  // allowlist captureDiff() applies to its `git show` argv (shared VALID_TARGET_RE
  // so the two consumers cannot drift). Load-bearing: the --codex-review
  // subcommand calls runCodexReview() directly, BEFORE captureDiff()'s own
  // validation would run, and on Windows the shell:true .cmd path re-tokenizes
  // argv through cmd.exe where metacharacters would be live.
  if (target && target !== "diff" && !VALID_TARGET_RE.test(target)) {
    return skip(`[codex-review: target "${String(target).slice(0, 60)}" rejected — must match ${String(VALID_TARGET_RE)}]`);
  }

  // `codex review` reads the working tree itself — no piped diff, no 80 KB cap.
  const scopeArgs = (!target || target === "diff")
    ? ["--uncommitted"]
    : ["--commit", target];
  const args = [
    "exec", "review",
    ...scopeArgs,
    "--skip-git-repo-check",
    "-c", `model_reasoning_effort="${effort}"`,
    "-", // read the custom review instructions from stdin
  ];

  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };

    let child;
    try {
      // Windows .cmd shim needs shell:true (modern Node refuses direct spawn).
      const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(bin);
      child = spawnImpl(bin, args, {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        shell: useShell,
      });
    } catch (err) {
      done(skip(`[codex-review: spawn failed — ${String(err?.message ?? err).slice(0, 200)}]`));
      return;
    }

    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* already gone */ }
      done(skip(`[codex-review: timeout after ${timeoutMs}ms — codex review did not finish; advisory arm skipped]`));
    }, timeoutMs);

    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => {
      clearTimeout(timer);
      done(skip(`[codex-review: child error — ${String(err?.message ?? err).slice(0, 200)}]`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = stdout.trim();
      // Environmental failure → advisory skip (NOT a "fail" that reads as a
      // real code blocker). Quota / auth / network are env-broken, not
      // code-broken. Classified from stderr ONLY — Codex's review *output*
      // (stdout) may legitimately mention "rate limit" / "429" when reviewing
      // such code; matching stdout would false-skip a real verdict.
      if (/exhausted your daily|usage limit reached|rate.?limit(ed)?|too many requests|\b429\b|TerminalQuotaError|not logged in|unauthoriz|invalid (api )?key|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EPIPE/i.test(stderr)) {
        done(skip(`[codex-review: ENV_FAIL — codex quota/auth/network (exit ${code}); advisory arm skipped. stderr: ${stderr.slice(0, 240)}]`));
        return;
      }
      const { verdict: parsed, firstLine } = parseVerdictLine(text);
      if (!parsed) {
        // Codex produced no parseable VERDICT line — advisory no-signal, NOT a
        // block. A real gate arm defaults missing-VERDICT to FAIL; an advisory
        // arm has nothing to assert, so it abstains via "skipped".
        done(skip(`[codex-review: no VERDICT line (exit ${code}); advisory no-signal. firstLine="${firstLine.slice(0, 120)}"]`));
        return;
      }
      const blockers = text
        .split(/\r?\n/)
        .filter((l) => /^BLOCKER:/i.test(l.trim()))
        .map((l) => l.trim())
        .join("\n");
      done({
        provider: "codex-review",
        verdict: parsed,
        blockers,
        notes: `[codex-review ${Date.now() - start}ms, exit ${code}]`,
        durationMs: Date.now() - start,
        skipped: false,
        rawOutputPeek: text.slice(0, MAX_OUTPUT_PEEK),
      });
    });

    // Prompt via stdin (the `-` arg) — newline-safe and immune to the Windows
    // 8191-char cmd-line limit when shell:true wraps the .cmd shim. The stdin
    // 'error' listener swallows the async EPIPE/destroyed-stream error that
    // fires when a write races a child that already exited (e.g. the timeout
    // killed it) — without it that error would escalate to an unhandled
    // exception in the very subprocess that feeds the fleet-wide Stop gate.
    child.stdin?.on("error", () => { /* destroyed-stream write race — non-fatal */ });
    try {
      child.stdin?.write(instructions);
      child.stdin?.end();
    } catch { /* some codex builds read prompt from argv — non-fatal */ }
  });
}

function buildPromptForCLI(diffInfo, target) {
  const targetLabel = target ? `commit ${target}` : "uncommitted changes";
  const truncationWarning = diffInfo.truncated
    ? `\n\n⚠ DIFF TRUNCATED — only the first ${MAX_DIFF_BYTES} bytes of ${diffInfo.totalBytes} are shown. If you cannot evaluate completeness from a partial view, return VERDICT: FAIL with BLOCKER: diff-truncated.\n`
    : "";
  return [
    REVIEW_SYSTEM,
    truncationWarning,
    `--- DIFF (target: ${targetLabel}) ---`,
    diffInfo.text,
    "--- END DIFF ---",
    "",
    "Now respond with VERDICT: PASS or VERDICT: FAIL on the first line, then BLOCKER lines, then notes.",
  ].join("\n");
}

/**
 * Build the prompt for a Claude reviewer agent (dispatched by the chat via the
 * Agent tool). Three arms, all required PASS, deliberately differentiated so the
 * three passes are complementary rather than redundant:
 *   arm "A" — holistic strict review (acceptance criteria)
 *   arm "B" — independent second pass weighted toward the highest-risk axes:
 *             test integrity, dispatcher-wiring completeness, inlined constants,
 *             and scope discipline. Does NOT assume arm A caught everything.
 *   arm "C" — analyst-weighted third pass dispatched as `code-analyzer`,
 *             focused on hidden anti-patterns, regression risk, silent breakage,
 *             error budget completeness, and integration coupling.
 * All emit the same VERDICT: PASS|FAIL contract on the first line.
 */
function buildClaudeReviewerPrompt(diffInfo, target, arm = "A") {
  const targetLabel = target ? `commit ${target}` : "uncommitted changes";
  const truncationWarning = diffInfo.truncated
    ? `NOTE: Diff was truncated at ${MAX_DIFF_BYTES} bytes (full size ${diffInfo.totalBytes}). If completeness cannot be assessed from the partial view, return VERDICT: FAIL with BLOCKER: diff-truncated.\n\n`
    : "";
  const armUpper = String(arm).toUpperCase();
  const isB = armUpper === "B";
  const isC = armUpper === "C";
  let role;
  let criteria;
  if (isC) {
    role =
      "You are reviewer C of three independent Claude PRISM agents — an ANALYST-weighted third pass for the PRISM manufacturing-intelligence platform. " +
      "Reviewers A and B cover holistic acceptance + test/wiring/scope axes; your job is what THEY are likely to under-emphasize. Do not assume they caught everything.";
    criteria = [
      "Weight your attention toward analyst axes — hidden anti-patterns, silent regression risk, and integration breakage. FAIL on any violation you find:",
      "  1. Silent breakage — type drift across module boundaries, peer engines whose contract this diff secretly invalidates, swallowed errors that bury real failures",
      "  2. Hidden anti-patterns — sync fs in async paths that should yield, race conditions across concurrent chats, fields that look load-bearing but are dead code, dual-source constants that will drift",
      "  3. Error budget completeness — are ALL error variants reachable? Are ALL fs.write paths defended against EACCES / ENOENT / EEXIST without burying the failure? Does graceful-degrade log enough to debug post-incident?",
      "  4. Integration coupling — engines wired to EVERY dispatcher that would naturally consume them; type-level coupling between sibling engines surfaces compile-time errors on rename (not silent runtime degradation)",
      "  5. Security at I/O boundaries — every interpolated string sanitized for the medium it lands in (filenames, comment bodies, shell args, SQL, etc); path-traversal guards re-checked after construction (defense in depth)",
      "  6. Regression risk for downstream pipelines — does this diff change a type that downstream engines depend on without updating them? Does it change the shape of a dispatcher result without updating slimResponse exclusions?",
    ];
  } else if (isB) {
    role =
      "You are reviewer B of three independent Claude PRISM agents — an INDEPENDENT second pass. Do not assume reviewer A caught everything; review the diff yourself, end to end.";
    criteria = [
      "Weight your attention toward these high-risk axes (PRISM CLAUDE.md), but FAIL on any violation you find:",
      "  1. Test integrity — no assertions weakened or removed vs the prior version; no toBeDefined()/toBeTruthy() blanket stubs; no synthetic threshold/loop tests; tests must fail if the business logic changes",
      "  2. Dispatcher wiring — every new engine wired (import + call + action enum + Zod schema) to EVERY dispatcher that would naturally consume it (not just one)",
      "  3. Constants — Kienzle/Taylor/material/physics constants imported from src/physics/constants.ts, never inlined or duplicated in docs",
      "  4. Scope discipline — no changes beyond what the stated task requires; no stubs, TODOs, placeholder returns, facades, or 'deferred to follow-up'",
      "  5. Hygiene — no floating promises, no any-spread anti-patterns, no swallowed errors",
    ];
  } else {
    role =
      "You are reviewer A of three independent Claude PRISM agents — a strict, holistic code reviewer for the PRISM manufacturing-intelligence platform.";
    criteria = [
      "Acceptance criteria:",
      "  1. No stubs, TODOs, or placeholder returns",
      "  2. Tests use concrete assertions (no toBeDefined()/toBeTruthy() blanket stubs)",
      "  3. ≥3 failure modes covered for any new engine",
      "  4. Physics constants imported from src/physics/constants.ts (never inlined)",
      "  5. New engines wired to every consuming dispatcher",
      "  6. No floating promises, no any-spread anti-patterns introduced",
    ];
  }
  return [
    truncationWarning + role,
    `Target: ${targetLabel}.`,
    "",
    ...criteria,
    "",
    "First line of your response MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'.",
    "Then list BLOCKER: lines for any violations, then optional notes (≤5 lines).",
    "If unsure between PASS and FAIL, choose FAIL.",
    "",
    "--- DIFF ---",
    diffInfo.text,
    "--- END DIFF ---",
  ].join("\n");
}

// ---- Advisory DOMAIN-EXPERT arm (2026-07-01) -------------------------------
// Resolve the galaxy(ies) a diff touches from its changed engine paths, so a
// galaxy-specific diff ALSO gets a domain-soul reviewer for DOMAIN correctness the
// generic arms (A/B) do not carry. Pure + string-only: emits a prompt + a
// <slot>-<galaxy> subagent_type; this script NEVER spawns the domain agent (zero
// runtime surface, so deadlock-impossible) and NEVER marks the ledger (advisory,
// mirrors the Codex arm). No galaxy resolved => { agent:null } => skipped.
const ENGINE_PATH_RE = /^[+-]{3}\s+[ab]\/mcp-server\/src\/engines\/([A-Za-z0-9_-]+)\//;
function galaxiesInDiff(diffText) {
  const found = [];
  const seen = new Set();
  for (const line of String(diffText).split(/\r?\n/)) {
    const m = ENGINE_PATH_RE.exec(line);
    if (!m) continue;
    const galaxy = m[1];
    const owner = slotForGalaxy(galaxy); // {slot, source} -- source:"map" only for a real owner
    if (owner.source !== "map" || !owner.slot) continue; // fallback/none => not domain-owned => skip
    if (seen.has(galaxy)) continue;
    seen.add(galaxy);
    found.push({ galaxy, slot: owner.slot });
  }
  return found;
}
function resolveDomainExpert(diffText) {
  const hits = galaxiesInDiff(diffText);
  if (hits.length === 0) return { agent: null, galaxies: [], prompt: null, reason: "no-galaxy-in-diff" };
  const primary = hits[0]; // first-touched, insertion-stable
  const agent = `${primary.slot}-${primary.galaxy}`; // e.g. delta-cad, kilo-cam
  const galaxies = hits.map((h) => h.galaxy);
  const otherGalaxies = galaxies.slice(1);
  const prompt = [
    `You are the ${primary.galaxy} DOMAIN EXPERT reviewing a PRISM diff for DOMAIN CORRECTNESS -- the axis the generic reviewers (A/B) do not carry.`,
    `You carry the ${primary.slot} slot soul; obey your galaxy's CLAUDE.md/MEMORY.md doctrine and refuse-list.`,
    otherGalaxies.length
      ? `This diff also touches: ${otherGalaxies.join(", ")}. Flag any cross-galaxy contract, but focus on ${primary.galaxy}.`
      : `This diff is scoped to the ${primary.galaxy} galaxy.`,
    "",
    "Weight your attention toward DOMAIN axes the generic reviewers under-emphasize:",
    "  1. Domain correctness -- physics/units/formulas/constants right for THIS galaxy (imported from canonical sources, never inlined)",
    "  2. Domain-specific safety -- this galaxy's refuse-list + hard rails not softened or bypassed",
    "  3. Domain conventions -- reads like the surrounding galaxy code; canonical dispatchers/engines used, not reinvented",
    "  4. Domain evidence -- every existence/behavior claim cited file:line, not asserted bare (R12)",
    "",
    "First line of your response MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then notes (<=5 lines).",
    "This verdict is ADVISORY -- it informs the summary but does NOT mark the gate. If unsure, choose FAIL.",
    "",
    "--- DIFF ---",
    diffText,
    "--- END DIFF ---",
  ].join("\n");
  return { agent, galaxies, prompt, reason: "resolved" };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = (() => {
    let cur = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
      const parent = path.dirname(cur);
      if (parent === cur) break;
      cur = parent;
    }
    return process.cwd();
  })();
  process.chdir(projectRoot);

  // Sub-command: --status — print current ledger entry for this session
  if (args.status) {
    const sid = findStableSessionId(args.sessionId);
    const entry = getEntry(sid);
    console.log(JSON.stringify(entry ? { sessionId: sid, ...entry } : { sessionId: sid, status: "no-entry" }, null, 2));
    return;
  }

  // Sub-command: --codex-review — run the advisory Codex CLI review arm and
  // print its verdict. ADVISORY: does NOT touch the 3-of-3 ledger. The chat
  // runs this in parallel with dispatching the three Claude reviewer agents.
  if (args.codexReview) {
    const r = await runCodexReview(args.target);
    console.log(JSON.stringify({
      ok: true,
      mode: "codex-review-arm",
      advisory: true,
      target: args.target || "(uncommitted)",
      ...r,
    }, null, 2));
    return;
  }

  // Sub-command: --mark-opus / --mark-claude / --mark-analyst pass|fail — used
  // by the chat after the Agent-tool reviewers return. Records the three
  // Claude-reviewer legs (arm A holistic / arm B independent / arm C analyst)
  // of the strict 3-of-3 gate. Any combination may be supplied in one call.
  // Accepted aliases: --mark-opus-a → arm A; --mark-opus-b / --mark-gemini → arm B;
  // --mark-codex → arm C (legacy alias — the slot was named after the retired Codex arm).
  if (args.markOpus || args.markOpusB || args.markAnalyst) {
    const marks = {};
    const marked = [];
    for (const [argVal, flag, detailKey, flagName, armLabel] of [
      [args.markOpus,    "opusReviewed",   "opusDetail",    "--mark-opus",    "A"],
      [args.markOpusB,   "claudeReviewed", "claudeDetail",  "--mark-claude",  "B"],
      [args.markAnalyst, "codexReviewed",  "analystDetail", "--mark-analyst", "C"],
    ]) {
      if (!argVal) continue;
      const verdict = String(argVal).toLowerCase();
      if (verdict !== "pass" && verdict !== "fail") {
        console.log(JSON.stringify({
          ok: false,
          error: "invalid-mark",
          message: `${flagName} must be 'pass' or 'fail' (case-insensitive); got: ${JSON.stringify(argVal)}`,
        }, null, 2));
        process.exit(2);
      }
      marks[flag] = verdict === "pass";
      marks[detailKey] = { verdict, blockers: args.blockers, notes: args.notes };
      marked.push({ arm: armLabel, verdict });
    }
    const sid = findStableSessionId(args.sessionId);
    const entry = recordScrutiny(sid, marks);
    // isCleared() is the single source of truth — alias-aware (arm B may be
    // stored as claudeReviewed | opusBReviewed | geminiReviewed) and it honors
    // the pre-3way legacy-entry fallback.
    console.log(JSON.stringify({
      ok: true,
      mode: "mark-claude-reviewer",
      sessionId: sid,
      marked,
      cleared: isCleared(sid),
      entry,
    }, null, 2));
    return;
  }

  const diffInfo = captureDiff(args.target);
  // Genuine capture failure (git timeout, bad ref, git error) — abort cleanly
  // rather than feeding a "[git diff capture failed: …]" placeholder string to
  // the reviewers, which is exactly the bug that made Codex look broken.
  if (!diffInfo || diffInfo.error) {
    console.log(JSON.stringify({
      ok: false,
      error: "diff-capture-failed",
      message: diffInfo?.error || "captureDiff returned nothing",
      hint:
        `git diff/show failed for target=${args.target || "(uncommitted)"}. ` +
        `If it timed out, raise PRISM_SCRUTINY_GIT_TIMEOUT_MS (currently ${GIT_DIFF_TIMEOUT_MS}ms) ` +
        `or check repo health (git status, .git/index.lock). Re-run when git is responsive.`,
    }, null, 2));
    process.exit(2);
  }
  if (!diffInfo.text || diffInfo.text.length < 20) {
    console.log(JSON.stringify({
      ok: false,
      error: "no-diff",
      message: `No reviewable diff found for target=${args.target || "(uncommitted)"}`,
    }, null, 2));
    process.exit(2);
  }

  // 2026-05-13 redesign — three Claude-reviewer prompts, no external CLI arm.
  // The legacy `cliPrompt` (Codex-formatted) is retained for the optional
  // Ollama pre-flight reviewer, which is purely advisory.
  const cliPrompt = buildPromptForCLI(diffInfo, args.target);
  const opusPrompt = buildClaudeReviewerPrompt(diffInfo, args.target, "A");
  const opusPromptB = buildClaudeReviewerPrompt(diffInfo, args.target, "B");
  const analystPrompt = buildClaudeReviewerPrompt(diffInfo, args.target, "C");

  const skipPreflight = args.skip.includes("preflight") || !PREFLIGHT_ENABLED;

  // OBSIDIAN-AUTOMATE-MS3/U-LOCAL-PREFLIGHT — gate mode: run local first; a
  // concrete FAIL aborts before the chat pays for the three-Claude trio. The
  // pre-flight stays as a single-shot advisory; the 3-of-3 trio is all Claude.
  let preflightResult = null;
  if (PREFLIGHT_GATE && !skipPreflight) {
    preflightResult = await runOllamaPreflight(cliPrompt);
    // Only short-circuit on a concrete FAIL with at least one BLOCKER —
    // a transport failure (skipped) must NOT block the Claude arms.
    if (preflightResult.verdict === "fail" && preflightResult.blockers && !preflightResult.skipped) {
      console.log(JSON.stringify({
        ok: true,
        target: args.target || "(uncommitted)",
        diffBytes: diffInfo.totalBytes,
        diffTruncated: diffInfo.truncated,
        gateAborted: true,
        gateReason: "local-preflight-fail",
        preflight: {
          provider: preflightResult.provider,
          model: PREFLIGHT_MODEL,
          verdict: preflightResult.verdict,
          blockers: preflightResult.blockers,
          notes: preflightResult.notes,
          durationMs: preflightResult.durationMs,
        },
        nextStep:
          "Local pre-flight reviewer (qwen2.5-coder:32b) flagged blockers BEFORE the three Claude arms were dispatched. " +
          "Review BLOCKER lines, fix, and re-run. To override and force the Claude trio anyway: " +
          "--skip preflight, or PRISM_SCRUTINY_PREFLIGHT=parallel for advisory-only mode.",
        consensus: "preflight-blocked — Claude-reviewer dispatch deferred (token cost saved)",
      }, null, 2));
      return;
    }
  }

  // Parallel-mode pre-flight (advisory only — does NOT affect the 3-of-3 gate).
  const tasks = [];
  if (!PREFLIGHT_GATE && !skipPreflight) tasks.push(runOllamaPreflight(cliPrompt));
  const allResults = await Promise.all(tasks);
  const parallelPreflight = allResults.find((r) => r.provider === "ollama-preflight") ?? null;
  if (parallelPreflight) preflightResult = parallelPreflight;

  // Three Claude reviewer arms are ALL chat-dispatched + chat-marked. No
  // ledger auto-record happens here; the chat invokes
  // --mark-opus / --mark-claude / --mark-analyst after the Agent tool returns.
  const sessionId = findStableSessionId(args.sessionId);

  // Advisory Codex arm command — the chat runs this in parallel with the three
  // Claude reviewer agents. null when PRISM_SCRUTINY_CODEX=off.
  // Defense in depth: only interpolate args.target into the emitted command
  // string when it satisfies VALID_TARGET_RE. main() already bails via
  // captureDiff() on a bad target before reaching here, but this guard means
  // the emitted shell command can never carry an unvalidated target.
  const codexReviewCommand = (CODEX_ARM_ENABLED && (!args.target || VALID_TARGET_RE.test(args.target)))
    ? `node .claude/scripts/scrutiny-3way.mjs --codex-review${args.target ? ` --target ${args.target}` : ""} --session-id ${sessionId}`
    : null;

  // Advisory HERMES-SOUL arm (OCTOPUS-SCRUTINY-SOULS Part B, 2026-06-30): 5 DISTINCT scrutiny souls
  // (correctness-hawk / security-skeptic / test-integrity / regression-hunter / convention-enforcer)
  // review the diff IN PARALLEL via the Hermes (NVIDIA) lane -- $0/off-Claude review DIVERSITY the 3
  // Claude arms might miss. ADVISORY ONLY: never marks the 3-of-3 ledger, never blocks (R7). Default on;
  // PRISM_SCRUTINY_HERMES_SOULS=off|0|false|no disables. Same target-validation guard as the codex arm.
  const HERMES_SOULS_ENABLED = !["off", "0", "false", "no"].includes(String(process.env.PRISM_SCRUTINY_HERMES_SOULS ?? "on").toLowerCase());
  const hermesSoulReviewCommand = (HERMES_SOULS_ENABLED && (!args.target || VALID_TARGET_RE.test(args.target)))
    ? `node scripts/scrutiny-hermes-souls.mjs --target ${args.target || "HEAD"} --json`
    : null;

  // Advisory DOMAIN-EXPERT arm (2026-07-01): resolve the galaxy(ies) the diff touches and
  // -- ONLY when a mapped galaxy resolves -- emit a domain-soul reviewer prompt + the
  // <slot>-<galaxy> subagent_type. ADVISORY: never marks the ledger; {agent:null} => skipped
  // (mirrors the Codex arm). Default on; PRISM_SCRUTINY_DOMAIN_EXPERT=off|0|false|no disables.
  const DOMAIN_EXPERT_ENABLED = !["off", "0", "false", "no"].includes(String(process.env.PRISM_SCRUTINY_DOMAIN_EXPERT ?? "on").toLowerCase());
  const domainReview = DOMAIN_EXPERT_ENABLED
    ? resolveDomainExpert(diffInfo.text)
    : { agent: null, galaxies: [], prompt: null, reason: "disabled" };

  const out = {
    ok: true,
    target: args.target || "(uncommitted)",
    diffBytes: diffInfo.totalBytes,
    diffTruncated: diffInfo.truncated,
    diffFilter: DIFF_FILTER_ENABLED ? "noise paths excluded" : "unfiltered (PRISM_SCRUTINY_NO_DIFF_FILTER=1)",
    sessionId,
    // No `results` array — all three arms run in the chat via Agent tool.
    results: [],
    // Local pre-flight verdict surfaced as an advisory arm. Does NOT affect the
    // strict 3-of-3 ledger contract — it's signal, not gate. Agreement among
    // all three Claude arms is strong consensus; disagreement is a triangulation flag.
    preflight: preflightResult ? {
      provider: preflightResult.provider,
      model: PREFLIGHT_MODEL,
      verdict: preflightResult.verdict,
      blockers: preflightResult.blockers,
      notes: preflightResult.notes,
      durationMs: preflightResult.durationMs,
      mode: PREFLIGHT_GATE ? "gate (token-saver)" : "parallel (advisory)",
    } : null,
    opusReviewerPrompt: opusPrompt,        // arm A — holistic acceptance criteria
    opusReviewerPromptB: opusPromptB,      // arm B — independent (test/wiring/constants/scope)
    analystReviewerPrompt: analystPrompt,  // arm C — analyst (silent breakage / regression risk / I/O security)
    // Advisory Codex CLI arm — run in parallel with the three Claude agents.
    // Its verdict is signal, NOT a gate: it never marks the 3-of-3 ledger.
    // null when PRISM_SCRUTINY_CODEX=off.
    codexReviewCommand,
    // Advisory Hermes-soul arm: 5 distinct scrutiny souls review the diff $0/off-Claude via the
    // NVIDIA Hermes lane (review diversity). Signal, NOT a gate. null when PRISM_SCRUTINY_HERMES_SOULS=off.
    hermesSoulReviewCommand,
    // Advisory DOMAIN-EXPERT arm (2026-07-01): a galaxy domain-soul reviews the diff for DOMAIN
    // correctness -- emitted ONLY when the diff touches a mapped galaxy. Signal, NOT a gate: never
    // marks the ledger. null prompt/agent => skipped (no galaxy resolved or arm disabled).
    domainReviewerPrompt: domainReview.prompt,
    domainReviewerAgent: domainReview.agent,
    domainReviewGalaxies: domainReview.galaxies,
    domainReviewSkipped: domainReview.agent === null,
    nextStep:
      "Dispatch BOTH required Claude PRISM agents in this chat, in parallel (2-of-2 gate per 2026-05-20):\n" +
      "  Agent({ subagent_type: 'reviewer', description: 'Review session diff (2way reviewer A)',               prompt: <opusReviewerPrompt above> })\n" +
      "  Agent({ subagent_type: 'reviewer', description: 'Review session diff (2way reviewer B — independent)', prompt: <opusReviewerPromptB above> })\n" +
      "  (Optional advisory: Agent({ subagent_type: 'code-analyzer', ... prompt: <analystReviewerPrompt> }) — does NOT block the gate.)\n" +
      (codexReviewCommand
        ? "Also optional — advisory Codex review arm (Bash):\n" +
          `  ${codexReviewCommand}\n` +
          "  Its verdict is advisory — fold it into your summary; it does NOT mark the gate.\n"
        : "") +
      (hermesSoulReviewCommand
        ? "Also optional -- advisory Hermes-SOUL arm (Bash, $0/off-Claude, 5 distinct review souls):\n" +
          `  ${hermesSoulReviewCommand}\n` +
          "  Returns {grade, results:[{soul,verdict}]}; fold the soul concerns into your summary. Advisory -- does NOT mark the gate.\n"
        : "") +
      (domainReview.agent
        ? "Also optional -- advisory DOMAIN-EXPERT arm (Agent tool), the galaxy domain-soul for domain correctness:\n" +
          `  Agent({ subagent_type: '${domainReview.agent}', description: 'Domain review (${domainReview.galaxies.join(",")})', prompt: <domainReviewerPrompt above> })\n` +
          "  Its verdict is advisory -- fold it into your summary; it does NOT mark the gate.\n"
        : "") +
      "When the two required agents return, record both verdicts (use 'fail' instead of 'pass' for any FAIL):\n" +
      `  node .claude/scripts/scrutiny-3way.mjs --mark-opus   pass --session-id ${sessionId} --notes "<reviewer A summary>"\n` +
      `  node .claude/scripts/scrutiny-3way.mjs --mark-claude pass --session-id ${sessionId} --notes "<reviewer B summary>"\n` +
      "  (legacy aliases: --mark-opus-b / --mark-gemini → arm B. Arm C --mark-analyst is OPTIONAL — only record if you ran the advisory analyst pass.)\n" +
      "The Stop hook releases once arms A + B are both PASS (strict 2-of-2, both Claude).",
    consensus: "two Claude arms pending chat dispatch — arm C demoted to advisory 2026-05-20 per user directive",
  };
  console.log(JSON.stringify(out, null, 2));
}

// Only run main() when invoked as a CLI, not when imported by tests.
// Vitest imports this module to test runOllamaPreflight() in isolation;
// without this guard, every import would re-trigger the full CLI flow.
const isCliEntry = (() => {
  try {
    const argvUrl = fileURLToPath(import.meta.url);
    return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(argvUrl);
  } catch { return false; }
})();

if (isCliEntry) {
  main().catch((err) => {
    console.log(JSON.stringify({ ok: false, error: "uncaught", message: err?.message || String(err) }, null, 2));
    process.exit(2);
  });
}

// Exports for test harness — see OllamaPreflight.test.ts.
// Public test surface is intentionally minimal: only the local-arm function
// + the env-config readback so tests can verify mode parsing.
export {
  runOllamaPreflight,
  runCodexReview,
  CODEX_ARM_MODE,
  CODEX_ARM_ENABLED,
  PREFLIGHT_MODE,
  PREFLIGHT_ENABLED,
  PREFLIGHT_GATE,
  PREFLIGHT_URL,
  PREFLIGHT_MODEL,
  PREFLIGHT_TIMEOUT_MS,
  PREFLIGHT_MAX_PROMPT_BYTES,
};
