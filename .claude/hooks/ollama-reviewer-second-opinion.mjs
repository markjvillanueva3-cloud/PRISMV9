#!/usr/bin/env node
// tier: T0
/**
 * ollama-reviewer-second-opinion — PreToolUse hook on Bash for `git commit`.
 *
 * Before every autonomous-mode commit, runs `git diff --staged` and asks
 * Ollama (qwen2.5-coder:32b by default) for a one-shot second-opinion review.
 * Ollama returns JSON of shape:
 *
 *   { "verdict": "PASS" | "CONCERN" | "FAIL",
 *     "reason":  string,
 *     "confidence": 0..1 }
 *
 * Behavior:
 *   - PASS   → continue silently
 *   - CONCERN → continue but append CONCERN row to REVIEWER_VERDICTS.json so
 *               U-AF03 reviewer-fail-latch can act if a CONCERN sequence
 *               escalates over the session
 *   - FAIL   → BLOCK the commit, append FAIL to REVIEWER_VERDICTS.json
 *
 * Off-switches:
 *   - PRISM_AUTONOMOUS != 1            → no-op
 *   - PRISM_REVIEW_OPINION_OVERRIDE=1  → escape hatch
 *   - diff <5 lines or >5000 lines     → skip (not worth reviewing)
 *   - Ollama unreachable / unparseable → fail-OPEN
 *
 * Pure decision logic in lib/autonomous-foolproof-logic.mjs:
 *   - parseOllamaReviewVerdict()
 *   - decideOllamaReviewSecondOpinion()
 *
 * U-AF08 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import {
  isGitCommitCommand,
  parseOllamaReviewVerdict,
  decideOllamaReviewSecondOpinion,
} from "./lib/autonomous-foolproof-logic.mjs";
import { recordOllamaEvent } from "./lib/ollama-stats.mjs";

const HOOK_NAME = "ollama-reviewer-second-opinion";
// A successful Ollama review of a staged diff substitutes for Claude doing
// the same review on the autonomous-mode commit path. ~250 tokens saved per
// review (the LLM-generated verdict reasoning that doesn't have to flow
// through Claude).
const TOKENS_SAVED_PER_REVIEW = 250;

const STATE_RELATIVE = "state/shared/AUTONOMOUS_STATE.json";
const VERDICTS_RELATIVE = "state/shared/REVIEWER_VERDICTS.json";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_HOOK_MODEL ?? "qwen2.5-coder:32b";
const OLLAMA_TIMEOUT_MS = 12 * 1000;
const OLLAMA_MAX_TOKENS = 400;

const SYSTEM_PROMPT =
  "You are a strict code reviewer for a safety-critical CNC manufacturing codebase. " +
  "Given a `git diff --staged` chunk, return JSON ONLY (no prose) of shape: " +
  '{"verdict": "PASS" | "CONCERN" | "FAIL", "reason": string (≤300 chars), "confidence": 0..1}.\n' +
  "FAIL when: hardcoded physics constants (Kienzle kc1.1, Taylor C/n, material density), " +
  "stub returns / placeholder asserts, broken or weakened safety gates, exec/eval injection risks, " +
  "obvious security holes (leaked secrets, missing auth checks).\n" +
  "CONCERN when: minor code smells, possible bugs that aren't safety-critical, missing error handling " +
  "in non-critical paths, inconsistent style.\n" +
  "PASS when: clean, no blockers — even if not perfect. Output JSON only, no markdown fences.";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function findProjectRoot(startCwd = process.cwd()) {
  let cur = startCwd;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startCwd;
}

function loadJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getStagedDiff(cwd) {
  try {
    const out = execSync("git diff --staged --no-color", {
      cwd,
      timeout: 10 * 1000,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, GIT_PAGER: "" },
    });
    return out.toString();
  } catch {
    return "";
  }
}

async function callOllamaForReview(diffText) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `Review this staged diff:\n\n${diffText}`,
        system: SYSTEM_PROMPT,
        stream: false,
        options: {
          temperature: 0,
          num_predict: OLLAMA_MAX_TOKENS,
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (typeof json?.response !== "string" || json.response.length === 0) return null;
    return json.response;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function recordVerdict(verdictsPath, sessionId, verdict, reasonText) {
  try {
    fs.mkdirSync(path.dirname(verdictsPath), { recursive: true });
    let payload = { schemaVersion: "1.0.0", verdicts: [] };
    if (fs.existsSync(verdictsPath)) {
      try {
        payload = JSON.parse(fs.readFileSync(verdictsPath, "utf8"));
        if (!Array.isArray(payload.verdicts)) payload.verdicts = [];
      } catch {
        // fall through to fresh payload
      }
    }
    payload.verdicts.push({
      session_id: sessionId,
      unit_id: "ollama-review",
      verdict,
      at: new Date().toISOString(),
      summary: String(reasonText ?? "").slice(0, 400),
      agent_id: "ollama-reviewer-second-opinion",
    });
    fs.writeFileSync(verdictsPath, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    // best-effort
  }
}

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";
  const overrideEnabled = process.env.PRISM_REVIEW_OPINION_OVERRIDE === "1";

  const raw = readStdinSafe();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  const cmd = payload?.tool_input?.command ?? "";
  const isCommit = isGitCommitCommand(cmd);

  if (!isCommit || !isAutonomous || overrideEnabled) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const root = findProjectRoot();
  const diffText = getStagedDiff(root);
  const diffLineCount = diffText.split("\n").length;

  let ollamaVerdict = null;
  let ollamaCalled = false;
  let ollamaResponded = false;
  // Only call Ollama if the diff size is in the reviewable band — saves cycles.
  if (diffLineCount >= 5 && diffLineCount <= 5000) {
    ollamaCalled = true;
    const rawResponse = await callOllamaForReview(diffText);
    if (rawResponse) {
      ollamaResponded = true;
      ollamaVerdict = parseOllamaReviewVerdict(rawResponse);
    }
  }

  if (!ollamaCalled) {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: "keep", category: "diff-out-of-band",
      extras: { diffLineCount },
    });
  } else if (!ollamaResponded) {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: "suggest",
      category: "review",
      extras: { mode: "ollama-down", diffLineCount },
    });
  } else {
    recordOllamaEvent({
      hook: HOOK_NAME, decision: "offload",
      category: "review", tokensSaved: TOKENS_SAVED_PER_REVIEW,
      extras: {
        mode: "review-completed",
        verdict: ollamaVerdict?.verdict || "unparseable",
        diffLineCount,
      },
    });
  }

  const decision = decideOllamaReviewSecondOpinion({
    isAutonomous,
    isCommit,
    overrideEnabled,
    diffLineCount,
    ollamaVerdict,
  });

  // Record CONCERN/FAIL to verdicts ledger so U-AF03 latch can see it.
  if (decision.record_verdict) {
    const stateFile = loadJsonSafe(path.join(root, STATE_RELATIVE));
    const sessionId = stateFile?.session_id ?? "unknown-session";
    recordVerdict(
      path.join(root, VERDICTS_RELATIVE),
      sessionId,
      decision.verdict === "FAIL" ? "FAIL" : "CONCERN",
      decision.review_reason,
    );
  }

  if (decision.continue) {
    const note = decision.reason
      ? `ollama-reviewer-second-opinion: ${decision.reason}${decision.verdict ? ` (${decision.verdict})` : ""}`
      : "ollama-reviewer-second-opinion: continue";
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: note,
      },
    }));
    return;
  }

  // BLOCK path
  const human = [
    "🛑 OLLAMA REVIEWER SECOND OPINION — verdict: FAIL",
    "",
    `Reason: ${decision.review_reason ?? "(none)"}`,
    `Confidence: ${typeof decision.confidence === "number" ? decision.confidence.toFixed(2) : "n/a"}`,
    "",
    "Resolve the issue Ollama flagged, OR override one-shot:",
    "  PRISM_REVIEW_OPINION_OVERRIDE=1 git commit ...",
    "",
    "Verdict logged to REVIEWER_VERDICTS.json (FAIL).",
    "U-AF03 reviewer-fail-latch will block subsequent units in this session.",
  ].join("\n");

  console.log(JSON.stringify({
    decision: "block",
    reason: human,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: human,
      review: {
        verdict: decision.verdict,
        review_reason: decision.review_reason,
        confidence: decision.confidence,
      },
    },
  }));
}

if (process.argv[1]?.endsWith("ollama-reviewer-second-opinion.mjs")) {
  main();
}
