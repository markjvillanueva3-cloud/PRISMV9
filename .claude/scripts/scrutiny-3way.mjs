#!/usr/bin/env node
/**
 * scrutiny-3way — Multi-CLI parallel review orchestrator.
 *
 * Spawns Codex CLI + Gemini CLI in parallel against the current session diff
 * and returns their verdicts. The Claude Opus reviewer agent is dispatched
 * separately by the chat (via the Agent tool) — this script emits the prompt
 * and awaits the chat's --opus mark via scrutiny-mark.mjs.
 *
 * Strict 3-of-3 policy: the Stop hook releases ONLY when --codex AND --gemini
 * AND --opus have been marked PASS for the session. This script auto-records
 * --codex and --gemini on completion; the chat must record --opus after the
 * Agent tool review returns.
 *
 * Usage:
 *   node .claude/scripts/scrutiny-3way.mjs                        # review uncommitted diff
 *   node .claude/scripts/scrutiny-3way.mjs --target HEAD          # review last commit
 *   node .claude/scripts/scrutiny-3way.mjs --target c6663f95b     # review specific commit
 *   node .claude/scripts/scrutiny-3way.mjs --session-id abc       # explicit session id
 *   node .claude/scripts/scrutiny-3way.mjs --skip codex            # skip one provider
 *
 * Output: JSON object with codex/gemini verdicts, prompt for Opus, and a
 * one-line shell command the chat must run after the Agent tool returns.
 *
 * Authored: 2026-05-05 (claude-66471c04, CAD-COMPLETE-MS0 wrap-up).
 */

import { spawn, execFileSync, execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { recordScrutiny, getEntry, parseVerdictLine } from "../helpers/scrutiny-ledger.mjs";

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
const CODEX_BIN = process.env.CODEX_BIN ?? resolveNpx();
// Prompt is delivered via stdin, NOT argv. `codex exec` with no positional
// argument reads from stdin. Keeping args small also avoids the Windows
// 8191-char cmd-line limit when shell:true wraps .cmd invocations.
// Reasoning effort overridden to "medium" so a 26 KB diff review finishes in
// ~3-5 min instead of the 8-12 min default xhigh on gpt-5.5.
const CODEX_ARGS = process.env.CODEX_ARGS
  ? process.env.CODEX_ARGS.split(" ")
  : ["--no-install", "codex", "exec", "--skip-git-repo-check", "-c", "model_reasoning_effort=\"medium\""];
const GEMINI_BIN = process.env.GEMINI_BIN ?? resolveNpx();
// Same stdin convention. `gemini` with no -p / no positional reads stdin.
// Pin gemini-2.5-pro for its 1M-token context — lets the Gemini arm review
// large diffs the Codex/Opus arms have to truncate. Override via GEMINI_ARGS
// or by changing the model flag if a newer pro variant ships.
const GEMINI_ARGS = process.env.GEMINI_ARGS
  ? process.env.GEMINI_ARGS.split(" ")
  : ["--no-install", "gemini", "-m", "gemini-2.5-pro"];

const REVIEW_TIMEOUT_MS = 360_000; // 6 min per provider; covers cold-start + xhigh reasoning on diffs up to 80KB

// OBSIDIAN-AUTOMATE-MS3/U-LOCAL-PREFLIGHT: optional Ollama-driven pre-flight
// reviewer that runs before (or in parallel with) the cloud trio. Two modes:
//   PRISM_SCRUTINY_PREFLIGHT=parallel (default) — advisory, runs alongside cloud,
//                                                  surfaces a 4th verdict in output
//   PRISM_SCRUTINY_PREFLIGHT=gate     — runs FIRST; local FAIL aborts before
//                                       cloud is dispatched (saves quota)
//   PRISM_SCRUTINY_PREFLIGHT=0/off    — disabled, original 3-of-3 path
// The pre-flight is ADVISORY by default and never marks the gate ledger —
// the strict 3-of-3 contract (Codex+Gemini+Opus PASS) is unchanged.
const PREFLIGHT_MODE = (process.env.PRISM_SCRUTINY_PREFLIGHT ?? "parallel").toLowerCase();
const PREFLIGHT_ENABLED = PREFLIGHT_MODE !== "0" && PREFLIGHT_MODE !== "off" && PREFLIGHT_MODE !== "false";
const PREFLIGHT_GATE = PREFLIGHT_MODE === "gate";
const PREFLIGHT_URL = process.env.PRISM_SCRUTINY_PREFLIGHT_URL ?? "http://127.0.0.1:11434/api/generate";
const PREFLIGHT_MODEL = process.env.PRISM_SCRUTINY_PREFLIGHT_MODEL ?? "deepseek-r1:14b";
const PREFLIGHT_TIMEOUT_MS = Number(process.env.PRISM_SCRUTINY_PREFLIGHT_TIMEOUT_MS) || 90_000; // 90s — deepseek-r1 reasoning takes time
const PREFLIGHT_MAX_PROMPT_BYTES = 60_000; // tighter than cloud — local context window pressure

const DEFAULT_MAX_DIFF_BYTES = 80_000;     // truncate huge diffs so providers don't OOM
const MAX_DIFF_BYTES = (() => {
  const env = process.env.PRISM_SCRUTINY_MAX_DIFF_BYTES;
  if (!env) return DEFAULT_MAX_DIFF_BYTES;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_DIFF_BYTES;
})();
// Gemini 2.5 Pro has a 1M-token context window — we can ship 10× the diff to
// the Gemini arm before truncating, so it can review large refactors that
// Codex/Opus have to read through a soda straw. Override via env if needed.
const DEFAULT_GEMINI_MAX_DIFF_BYTES = 800_000;
const GEMINI_MAX_DIFF_BYTES = (() => {
  const env = process.env.PRISM_SCRUTINY_GEMINI_MAX_DIFF_BYTES;
  if (!env) return DEFAULT_GEMINI_MAX_DIFF_BYTES;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_GEMINI_MAX_DIFF_BYTES;
})();
const MAX_OUTPUT_PEEK = 8_000;     // stored in ledger notes

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
    markOpus: "",       // "pass" | "fail" — runs in opus-mark-only mode
    notes: "",
    blockers: "",
    status: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") out.target = argv[++i] || "";
    else if (a.startsWith("--target=")) out.target = a.slice("--target=".length);
    else if (a === "--session-id") out.sessionId = argv[++i] || "";
    else if (a.startsWith("--session-id=")) out.sessionId = a.slice("--session-id=".length);
    else if (a === "--skip") out.skip.push((argv[++i] || "").toLowerCase());
    else if (a === "--mark-opus") out.markOpus = (argv[++i] || "").toLowerCase();
    else if (a.startsWith("--mark-opus=")) out.markOpus = a.slice("--mark-opus=".length).toLowerCase();
    else if (a === "--notes") out.notes = argv[++i] || "";
    else if (a.startsWith("--notes=")) out.notes = a.slice("--notes=".length);
    else if (a === "--blockers") out.blockers = argv[++i] || "";
    else if (a.startsWith("--blockers=")) out.blockers = a.slice("--blockers=".length);
    else if (a === "--status") out.status = true;
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
      if (!/^[A-Za-z0-9._/-]+$/.test(target)) {
        return `[scrutiny-3way: target "${String(target)}" rejected — must match /^[A-Za-z0-9._\\/-]+$/]`;
      }
      args = ["show", target, "--no-color"];
    }
    const out = execFileSync("git", args, {
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 16 * 1024 * 1024,
      timeout: 8000,
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
        if (/TerminalQuotaError|exhausted your daily/i.test(stderr)) return "[ENV_FAIL: gemini-daily-quota — quota resets at UTC midnight]";
        if (/not running in a trusted directory/i.test(stderr)) return "[ENV_FAIL: gemini-trust-dir — set GEMINI_CLI_TRUST_WORKSPACE=true]";
        if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(stderr)) return "[ENV_FAIL: network — provider host unreachable]";
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

function buildOpusReviewerPrompt(diffInfo, target) {
  const targetLabel = target ? `commit ${target}` : "uncommitted changes";
  const truncationWarning = diffInfo.truncated
    ? `NOTE: Diff was truncated at ${MAX_DIFF_BYTES} bytes (full size ${diffInfo.totalBytes}). If completeness cannot be assessed from the partial view, return VERDICT: FAIL with BLOCKER: diff-truncated.\n\n`
    : "";
  return [
    truncationWarning + "Review the following diff as a strict code reviewer for the PRISM platform.",
    `Target: ${targetLabel}.`,
    "",
    "Acceptance criteria:",
    "  1. No stubs, TODOs, or placeholder returns",
    "  2. Tests use concrete assertions (no toBeDefined()/toBeTruthy() blanket stubs)",
    "  3. ≥3 failure modes covered for any new engine",
    "  4. Physics constants imported from src/physics/constants.ts (never inlined)",
    "  5. New engines wired to every consuming dispatcher",
    "  6. No floating promises, no any-spread anti-patterns introduced",
    "",
    "First line of your response MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'.",
    "Then list BLOCKER: lines for any violations, then optional notes (≤5 lines).",
    "",
    "--- DIFF ---",
    diffInfo.text,
    "--- END DIFF ---",
  ].join("\n");
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

  // Sub-command: --mark-opus pass|fail — used by the chat after the Agent tool
  // reviewer returns. Records the third leg of the 3-of-3 strict gate.
  if (args.markOpus) {
    const normalized = args.markOpus.toLowerCase();
    if (normalized !== "pass" && normalized !== "fail") {
      console.log(JSON.stringify({
        ok: false,
        error: "invalid-mark-opus",
        message: `--mark-opus must be 'pass' or 'fail' (case-insensitive); got: ${JSON.stringify(args.markOpus)}`,
      }, null, 2));
      process.exit(2);
    }
    const sid = findStableSessionId(args.sessionId);
    const verdict = normalized;
    const entry = recordScrutiny(sid, {
      opusReviewed: verdict === "pass",
      opusDetail: { verdict, blockers: args.blockers, notes: args.notes },
    });
    console.log(JSON.stringify({
      ok: true,
      mode: "mark-opus",
      sessionId: sid,
      opusVerdict: verdict,
      cleared: entry.codexReviewed === true && entry.geminiReviewed === true && entry.opusReviewed === true,
      entry,
    }, null, 2));
    return;
  }

  const diffInfo = captureDiff(args.target);
  if (!diffInfo || !diffInfo.text || diffInfo.text.length < 20) {
    console.log(JSON.stringify({
      ok: false,
      error: "no-diff",
      message: `No reviewable diff found for target=${args.target || "(uncommitted)"}`,
    }, null, 2));
    process.exit(2);
  }
  // Gemini 2.5 Pro arm gets a separately captured (larger) diff. Skip the
  // second git call when no upgrade would happen — keeps the fast path fast.
  const geminiDiffInfo = GEMINI_MAX_DIFF_BYTES > MAX_DIFF_BYTES
    ? captureDiff(args.target, GEMINI_MAX_DIFF_BYTES)
    : diffInfo;

  const cliPrompt = buildPromptForCLI(diffInfo, args.target);
  const geminiPrompt = geminiDiffInfo === diffInfo
    ? cliPrompt
    : buildPromptForCLI(geminiDiffInfo, args.target);
  const opusPrompt = buildOpusReviewerPrompt(diffInfo, args.target);

  // Skip-aware parallel dispatch
  const skipCodex = args.skip.includes("codex");
  const skipGemini = args.skip.includes("gemini");
  const skipPreflight = args.skip.includes("preflight") || !PREFLIGHT_ENABLED;

  // OBSIDIAN-AUTOMATE-MS3/U-LOCAL-PREFLIGHT — gate mode: run local first;
  // a concrete FAIL aborts before paying for the cloud trio.
  let preflightResult = null;
  if (PREFLIGHT_GATE && !skipPreflight) {
    preflightResult = await runOllamaPreflight(cliPrompt);
    // Only short-circuit on a concrete FAIL with at least one BLOCKER —
    // a transport failure (skipped) must NOT block the cloud arm.
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
          "Local pre-flight reviewer (deepseek-r1:14b) flagged blockers BEFORE cloud dispatch. " +
          "Review BLOCKER lines, fix, and re-run. To override and force cloud review anyway: " +
          "--skip preflight, or PRISM_SCRUTINY_PREFLIGHT=parallel for advisory-only mode.",
        consensus: "preflight-blocked — cloud trio not dispatched (quota saved)",
      }, null, 2));
      return;
    }
  }

  const tasks = [];
  if (!skipCodex) tasks.push(spawnReview("codex", CODEX_BIN, [...CODEX_ARGS], cliPrompt));
  if (!skipGemini) tasks.push(spawnReview("gemini", GEMINI_BIN, [...GEMINI_ARGS], geminiPrompt));
  // Parallel mode: local arm runs alongside cloud, surfaces an advisory verdict.
  if (!PREFLIGHT_GATE && !skipPreflight) tasks.push(runOllamaPreflight(cliPrompt));

  const allResults = await Promise.all(tasks);
  // Separate the advisory pre-flight from the cloud trio so ledger marking
  // (which runs only over codex/gemini) sees a clean two-element array.
  const results = allResults.filter((r) => r.provider !== "ollama-preflight");
  const parallelPreflight = allResults.find((r) => r.provider === "ollama-preflight") ?? null;
  if (parallelPreflight) preflightResult = parallelPreflight;

  // Auto-record --codex and --gemini marks DIRECTLY via the ledger helper
  // (no shell to scrutiny-mark.mjs — that file is contested by peer chats).
  const sessionId = findStableSessionId(args.sessionId);
  for (const r of results) {
    if (r.provider !== "codex" && r.provider !== "gemini") continue;
    const detail = {
      verdict: r.verdict,
      blockers: r.blockers || "",
      notes: `[3way ${r.provider} ${r.durationMs}ms] ${r.notes || ""}`.slice(0, 480),
    };
    const marks = {};
    if (r.provider === "codex") {
      marks.codexReviewed = r.verdict === "pass";
      marks.codexDetail = detail;
    } else {
      marks.geminiReviewed = r.verdict === "pass";
      marks.geminiDetail = detail;
    }
    try {
      recordScrutiny(sessionId, marks);
    } catch (err) {
      // Gemini blocker #3: previously swallowed silently, hiding disk I/O
      // / permission errors that left the gate stuck. Surface to stderr so
      // the chat sees the failure even though stdout still gets the JSON.
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `scrutiny-3way: recordScrutiny(session=${sessionId}, ${r.provider}) failed: ${msg}\n`,
      );
    }
  }

  const out = {
    ok: true,
    target: args.target || "(uncommitted)",
    diffBytes: diffInfo.totalBytes,
    diffTruncated: diffInfo.truncated,
    results: results.map((r) => ({
      provider: r.provider,
      verdict: r.verdict,
      blockers: r.blockers,
      notes: r.notes,
      durationMs: r.durationMs,
    })),
    // Local pre-flight verdict surfaced as a 4th, advisory arm. Does NOT
    // affect the strict 3-of-3 ledger contract — it's signal, not gate.
    // When the local arm agrees with cloud, that's strong consensus; when
    // it disagrees, that's a triangulation flag for the operator.
    preflight: preflightResult ? {
      provider: preflightResult.provider,
      model: PREFLIGHT_MODEL,
      verdict: preflightResult.verdict,
      blockers: preflightResult.blockers,
      notes: preflightResult.notes,
      durationMs: preflightResult.durationMs,
      mode: PREFLIGHT_GATE ? "gate (cloud-saver)" : "parallel (advisory)",
    } : null,
    opusReviewerPrompt: opusPrompt,
    nextStep:
      "Dispatch the Claude Opus reviewer in this chat: Agent({ subagent_type: 'reviewer', " +
      "description: 'Review session diff (3way Opus arm)', prompt: <opusReviewerPrompt above> }). " +
      "When the agent returns, run: " +
      "node .claude/scripts/scrutiny-3way.mjs --mark-opus pass --notes \"<one-line agent summary>\" " +
      "(replace 'pass' with 'fail' if the agent reported FAIL).",
    consensus: results.every((r) => r.verdict === "pass")
      ? "codex+gemini PASS (need Opus mark to release Stop hook — 3-of-3 strict)"
      : "codex/gemini have FAILED — fix blockers before continuing; Opus dispatch optional",
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
  PREFLIGHT_MODE,
  PREFLIGHT_ENABLED,
  PREFLIGHT_GATE,
  PREFLIGHT_URL,
  PREFLIGHT_MODEL,
  PREFLIGHT_TIMEOUT_MS,
  PREFLIGHT_MAX_PROMPT_BYTES,
};
