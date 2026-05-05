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
const GEMINI_ARGS = process.env.GEMINI_ARGS
  ? process.env.GEMINI_ARGS.split(" ")
  : ["--no-install", "gemini"];

const REVIEW_TIMEOUT_MS = 360_000; // 6 min per provider; covers cold-start + xhigh reasoning on diffs up to 80KB
const DEFAULT_MAX_DIFF_BYTES = 80_000;     // truncate huge diffs so providers don't OOM
const MAX_DIFF_BYTES = (() => {
  const env = process.env.PRISM_SCRUTINY_MAX_DIFF_BYTES;
  if (!env) return DEFAULT_MAX_DIFF_BYTES;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_DIFF_BYTES;
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

function captureDiff(target) {
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
    if (out.length > MAX_DIFF_BYTES) {
      return {
        text: out.slice(0, MAX_DIFF_BYTES) + `\n\n... [truncated at ${MAX_DIFF_BYTES} bytes — full diff is ${out.length} bytes]`,
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
      // FAIL ("if unsure choose FAIL").
      const { verdict: parsedVerdict, firstLine } = parseVerdictLine(text);
      const verdict = parsedVerdict ?? "fail";
      const blockerLines = text
        .split(/\r?\n/)
        .filter((l) => /^BLOCKER:/i.test(l.trim()))
        .map((l) => l.trim())
        .join("\n");
      const exitInfo = code === 0 ? "" : `[exit ${code}]`;
      const stderrPeek = stderr.length > 0 ? `\nstderr: ${stderr.slice(0, 500)}` : "";
      const verdictNote = parsedVerdict
        ? ""
        : `[VERDICT line missing or malformed; defaulted to FAIL. firstLine="${firstLine.slice(0, 120)}"]`;
      finish(
        verdict,
        blockerLines,
        `${verdictNote}${exitInfo}${stderrPeek}`.trim(),
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

  const cliPrompt = buildPromptForCLI(diffInfo, args.target);
  const opusPrompt = buildOpusReviewerPrompt(diffInfo, args.target);

  // Skip-aware parallel dispatch
  const skipCodex = args.skip.includes("codex");
  const skipGemini = args.skip.includes("gemini");

  const tasks = [];
  if (!skipCodex) tasks.push(spawnReview("codex", CODEX_BIN, [...CODEX_ARGS], cliPrompt));
  if (!skipGemini) tasks.push(spawnReview("gemini", GEMINI_BIN, [...GEMINI_ARGS], cliPrompt));

  const results = await Promise.all(tasks);

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

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, error: "uncaught", message: err?.message || String(err) }, null, 2));
  process.exit(2);
});
