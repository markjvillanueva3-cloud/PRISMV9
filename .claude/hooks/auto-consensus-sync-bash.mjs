#!/usr/bin/env node
// tier: T1
/**
 * auto-consensus-sync-bash.mjs — PreToolUse:Bash sync octopus trigger for
 * IRREVERSIBLE bash commands.
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-C2 + C3 + C4 (2026-05-22, slot echo).
 *
 * Closes three connected gaps at once:
 *   • C2 SYNC TRIGGER — auto-consensus-critical-edit.mjs is async (enqueue
 *     + drain on Stop). This hook adds the SYNCHRONOUS code path for
 *     decision points where the verdict must influence THE CURRENT turn.
 *   • C3 IN-CONTEXT SURFACING — the verdict is rendered into
 *     permissionDecisionReason, which Claude Code surfaces back into the
 *     live conversation. No "next session" wait.
 *   • C4 STAKES-GATED TRIGGERING — the classifier IS the stakes gate.
 *     Only fires on a precise irreversibility-class match; every other
 *     bash command (the 99% case) is allowed silently with zero cost.
 *
 * Trigger classes (each one tested) — classifyDestructiveBash():
 *   git-force-push           - `git push -f`, `--force`, `--force-with-lease`
 *   git-hard-reset           - `git reset --hard <ref>`
 *   git-branch-force-delete  - `git branch -D <name>`
 *   rm-recursive-force       - `rm -rf`, `rm -fr`, `rm --recursive --force`
 *   git-clean-force          - `git clean -f` / `-fd` / `-fdx`
 *
 * DEFAULT BEHAVIOR (no env): classifier match → permissionDecision:"ask"
 * with a clear reason explaining which irreversibility class matched. The
 * Claude Code chat then surfaces the ask to the operator. This is the
 * safe + fast path — no LLM call, predictable latency.
 *
 * OPT-IN: PRISM_AUTO_CONSENSUS_SYNC_BASH=1 enables the SYNC CONSENSUS
 * path — the hook spawns MultiModelConsensusEngine.ask() with a 10s
 * timeout (Promise.race against a timer), surfaces the 7-LLM verdict as
 * the permissionDecisionReason, and translates the recommendation into
 * permissionDecision:"ask"|"allow". On timeout / engine missing /
 * consensus throw, falls back to "ask" with reason naming the fallback.
 *
 * Karpathy discipline:
 *   CLASSIFY: PreToolUse:Bash sync-by-opt-in gate
 *   TECHNIQUE: regex-classify → (default ask) | (opt-in race(consensus,
 *     timer) → translate verdict)
 *   EDGE CASES: missing command, env-var prefix, `rtk` wrapper, multi-
 *     command chain (`&&`/`;`/`|`), --force-with-lease nuance, `rm -f`
 *     (NOT -rf — single-file force, not class), `git clean -n` (dry-run,
 *     NOT class), engine missing, timeout, ask-throw
 *   FAILURE MODES: every path either allow (no match) or ask (match +
 *     anything else); HOOK NEVER DENIES — operator decides on every ask
 *
 * Fail-open WITH SAFETY: a classifier match always at least asks. A
 * non-match always allows. The hook structurally cannot allow a matched
 * irreversibility class without operator visibility.
 *
 * Knobs:
 *   PRISM_AUTO_CONSENSUS_SYNC_DISABLE=1      — suppress the sync LLM call
 *                                              for a matched class; the
 *                                              hook still ASKS the operator
 *                                              (safety invariant preserved)
 *   PRISM_AUTO_CONSENSUS_SYNC_BASH=1         — enable the sync LLM path
 *   PRISM_AUTO_CONSENSUS_SYNC_TIMEOUT_MS=N   — sync call timeout (default 10000)
 *   PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH=P  — override the engine loader
 *                                              candidates (single path);
 *                                              used by tests to force
 *                                              engine-unreachable / stub
 *                                              the engine deterministically
 */

import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_TIMEOUT_MS = 60000;
const MIN_TIMEOUT_MS = 2000;

const ENGINE_CANDIDATES = [
  "H:/prism/mcp-server/dist/engines/MultiModelConsensusEngine.js",
  "H:/prism-iooms0/mcp-server/dist/engines/MultiModelConsensusEngine.js",
];

function readStdinSync() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function emit(obj) {
  try { process.stdout.write(JSON.stringify(obj)); } catch { /* stdout broken — non-fatal */ }
}

function allow(reason) {
  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: reason ?? "",
    },
  });
}

function ask(reason) {
  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  });
}

/**
 * Classify a bash command string against the irreversibility classes.
 * Pure, testable. Walks past env-var prefixes (FOO=bar VERB args) and
 * the `rtk` wrapper, then matches the post-verb argument set.
 *
 * Multi-command chains: classifies on the FIRST sub-command (split on
 * &&, ||, ;, |). A chain that begins with a safe command followed by a
 * destructive one would currently NOT classify the chain as destructive
 * — this is a conservative under-trigger (no false positives) rather
 * than a false-negative trap, documented for future hardening.
 *
 * @param {string} command
 * @returns {string|null}  one of the trigger-class labels, or null
 */
export function classifyDestructiveBash(command) {
  if (typeof command !== "string" || command.length === 0) return null;
  const head = command.split(/&&|\|\||;|\|/)[0].trim();
  if (head.length === 0) return null;

  const tokens = head.split(/\s+/);
  let i = 0;
  // Skip env-var prefixes (FOO=bar BAZ=qux verb ...).
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
  // Skip the rtk wrapper if present.
  if (tokens[i] === "rtk") i++;
  const verb = (tokens[i] || "").toLowerCase();
  const args = tokens.slice(i + 1);

  if (verb === "git") {
    const sub = (args[0] || "").toLowerCase();
    const rest = args.slice(1);
    if (sub === "push") {
      // -f / --force / --force-with-lease (the last is safer but still
      // rewrites remote history and merits operator visibility).
      if (rest.some((a) => a === "-f" || a === "--force" || a === "--force-with-lease")) {
        return "git-force-push";
      }
    }
    if (sub === "reset") {
      if (rest.some((a) => a === "--hard")) return "git-hard-reset";
    }
    if (sub === "branch") {
      if (rest.some((a) => a === "-D" || a === "--delete-force")) return "git-branch-force-delete";
    }
    if (sub === "clean") {
      // `-f` alone is the force flag; `-n` is dry-run (NOT a class match).
      const hasForce = rest.some((a) => /^-[a-z]*f[a-z]*$/.test(a) || a === "--force");
      const hasDryRun = rest.some((a) => /^-[a-z]*n[a-z]*$/.test(a) || a === "--dry-run");
      if (hasForce && !hasDryRun) return "git-clean-force";
    }
  }

  if (verb === "rm") {
    // -rf / -fr / --recursive --force — irreversible recursive delete.
    // -f alone (no -r) is single-file force; deliberately NOT a class
    // match (e.g. `rm -f .git/index.lock` is a normal stale-lock fix).
    const flat = args.join(" ");
    const hasR = /-[a-z]*r[a-z]*\b/.test(flat) || flat.includes("--recursive");
    const hasF = /-[a-z]*f[a-z]*\b/.test(flat) || flat.includes("--force");
    if (hasR && hasF) return "rm-recursive-force";
  }

  return null;
}

/**
 * Render a sync-consensus verdict into a permissionDecisionReason string.
 * Pure, testable.
 *
 * @param {string} className  the trigger-class label
 * @param {object} verdict    { recommendation, agreementScore?, consensus?: {voters?} }
 * @returns {string}
 */
export function renderVerdict(className, verdict) {
  if (verdict === null || typeof verdict !== "object") {
    return `🛑 ${className}: consensus returned no verdict — defaulting to ASK`;
  }
  const rec = typeof verdict.recommendation === "string" ? verdict.recommendation : "review";
  const ag = (verdict.agreementScore !== null && verdict.agreementScore !== undefined)
    ? String(verdict.agreementScore) : "n/a";
  const voters = (verdict.consensus !== null && verdict.consensus !== undefined && Array.isArray(verdict.consensus.voters))
    ? verdict.consensus.voters.join(",") : "n/a";
  const icon = rec === "accept" ? "✅" : (rec === "escalate" ? "🛑" : "⚠️");
  return `${icon} ${className}: octopus rec=${rec}, agreement=${ag}, voters=[${voters}]`;
}

function clampTimeoutMs(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_TIMEOUT_MS;
  if (n < MIN_TIMEOUT_MS) return MIN_TIMEOUT_MS;
  if (n > MAX_TIMEOUT_MS) return MAX_TIMEOUT_MS;
  return Math.floor(n);
}

function clip(s) {
  return typeof s === "string" && s.length > 200 ? s.slice(0, 200) + "…" : (s ?? "");
}

async function loadConsensusEngine() {
  // PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH overrides the default candidate
  // list — used by tests to force engine-unreachable (point at a non-
  // existent path) OR to inject a stub engine (point at a stub .mjs).
  const override = process.env.PRISM_AUTO_CONSENSUS_SYNC_ENGINE_PATH;
  const candidates = (typeof override === "string" && override.length > 0)
    ? [override]
    : ENGINE_CANDIDATES;
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      const mod = await import(pathToFileURL(candidate).href);
      const engine = mod.multiModelConsensusEngine
        ?? (typeof mod.MultiModelConsensusEngine === "function" ? new mod.MultiModelConsensusEngine() : null);
      if (engine !== null && typeof engine.ask === "function") return engine;
    } catch {
      /* fall through to next candidate */
    }
  }
  return null;
}

async function runConsensusWithTimeout(engine, command, className, timeoutMs) {
  const prompt = `Critical-bash review: a session is about to run \`${command}\` (irreversibility class: ${className}). Should it proceed?`;
  // Arm A P1 — capture the setTimeout handle and clearTimeout in finally
  // so a winning consensus return doesn't leave the timer keeping the
  // event loop alive for the rest of timeoutMs.
  let timerHandle;
  const timerPromise = new Promise((resolve) => {
    timerHandle = setTimeout(() => resolve({ __timeout: true }), timeoutMs);
  });
  try {
    const askPromise = engine.ask({
      prompt,
      taskType: "auto-irreversible-bash",
      timeoutMs,
      persist: true,
    });
    const result = await Promise.race([askPromise, timerPromise]);
    if (result !== null && typeof result === "object" && "__timeout" in result) {
      return { ok: false, reason: "timeout" };
    }
    return { ok: true, verdict: result };
  } finally {
    if (timerHandle !== undefined) clearTimeout(timerHandle);
  }
}

async function main() {
  let stdin;
  try {
    const raw = readStdinSync();
    if (!raw) { allow(""); return; }
    stdin = JSON.parse(raw);
  } catch {
    allow("");
    return;
  }

  if (stdin.tool_name !== "Bash") { allow(""); return; }
  const command = stdin?.tool_input?.command;
  if (typeof command !== "string" || command.length === 0) { allow(""); return; }

  // CLASSIFY FIRST — the safety invariant requires that NO knob and NO
  // defensive catch can ever silently allow a matched destructive command
  // without operator visibility. Reordered from a prior version where
  // PRISM_AUTO_CONSENSUS_SYNC_DISABLE=1 short-circuited to allow() before
  // classification (Arm A P0 in U-GO-C2 scrutiny).
  let className;
  try {
    className = classifyDestructiveBash(command);
  } catch {
    // A classifier throw could hide a destructive class — fail SAFE = ASK.
    ask(`🛑 Bash classification failed unexpectedly — defaulting to ASK for \`${clip(command)}\``);
    return;
  }
  if (className === null) {
    // Non-match → silent allow. Disable knob may apply here too, but the
    // outcome is the same (allow), so just allow directly.
    allow("");
    return;
  }

  // ── From here, className is non-null (destructive class matched). ───────
  // Safety invariant: ALL remaining paths terminate in either `ask(…)` or
  // an `allow(…)` predicated on consensus rec === "accept". A matched
  // command CANNOT be silently allowed regardless of env state.

  if (process.env.PRISM_AUTO_CONSENSUS_SYNC_DISABLE === "1") {
    // The disable knob suppresses the LLM call, but the ASK still fires —
    // operator visibility is preserved. (Fixes Arm A P0.)
    ask(`🛑 ${className}: PRISM_AUTO_CONSENSUS_SYNC_DISABLE=1 — sync consensus suppressed, operator confirm before \`${clip(command)}\``);
    return;
  }

  if (process.env.PRISM_AUTO_CONSENSUS_SYNC_BASH !== "1") {
    ask(`🛑 Irreversibility-class match (${className}): operator confirm before \`${clip(command)}\`. Set PRISM_AUTO_CONSENSUS_SYNC_BASH=1 to consult octopus consensus instead.`);
    return;
  }

  // Opt-in sync consensus path. Every failure mode below ends in ASK.
  const timeoutMs = clampTimeoutMs(process.env.PRISM_AUTO_CONSENSUS_SYNC_TIMEOUT_MS);
  const engine = await loadConsensusEngine();
  if (engine === null) {
    ask(`🛑 ${className}: octopus engine not loadable (MCP dist missing?); defaulting to ASK for \`${clip(command)}\``);
    return;
  }

  let runResult;
  try {
    runResult = await runConsensusWithTimeout(engine, command, className, timeoutMs);
  } catch {
    ask(`🛑 ${className}: octopus call threw; defaulting to ASK for \`${clip(command)}\``);
    return;
  }
  if (!runResult.ok) {
    ask(`🛑 ${className}: octopus timed out after ${timeoutMs}ms; defaulting to ASK for \`${clip(command)}\``);
    return;
  }

  const verdict = runResult.verdict;
  const rendered = renderVerdict(className, verdict);
  const rec = (verdict !== null && verdict !== undefined && typeof verdict.recommendation === "string")
    ? verdict.recommendation : "review";
  // Only "accept" auto-allows; everything else (escalate / review / unknown)
  // bubbles to operator confirmation so consensus disagreement is never
  // silently swallowed.
  if (rec === "accept") {
    allow(rendered);
  } else {
    ask(rendered);
  }
}

// Allow direct unit-test imports of pure helpers without firing main().
const invokedDirectly = process.argv[1]
  && process.argv[1].replace(/\\/g, "/").endsWith("auto-consensus-sync-bash.mjs");
if (invokedDirectly) {
  void main().catch(() => allow(""));
}
