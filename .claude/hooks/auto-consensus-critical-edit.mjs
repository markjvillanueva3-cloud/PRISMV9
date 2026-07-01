#!/usr/bin/env node
// tier: T1
/**
 * auto-consensus-critical-edit.mjs — PreToolUse hook for high-stakes file edits.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AUTO-FIRE.
 *
 * What this hook does
 * -------------------
 * Fires before Edit / Write / MultiEdit on critical-classified files:
 *   - mcp-server/src/physics/constants.ts (Kienzle/Taylor coefficients)
 *   - mcp-server/src/tools/dispatchers/*.ts (action enums + schemas)
 *   - mcp-server/src/engines/*Safety*.ts (safety validators)
 *   - mcp-server/src/engines/*Validator*.ts (S(x) calculators)
 *   - mcp-server/src/engines/Tolerance*.ts (tolerance logic)
 *
 * For these files we want EXTRA scrutiny. The hook does a CACHE-FIRST
 * recall:
 *   1. Compose a synthetic "should I make edit X to file Y?" prompt
 *   2. Hash + lookup in wiki/consensus/<sha8>.md
 *   3. If cache hit + recommendation=escalate → request "ask" decision
 *      (forces user confirmation before the edit lands)
 *   4. If cache hit + recommendation=accept/review → allow with context
 *   5. If cache miss → allow with a notice that consensus has been queued
 *
 * Hook contract
 * -------------
 * Reads stdin: { tool_name, tool_input: {file_path, old_string?, new_string?, ...}, ... }
 * Writes stdout: { continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow"|"ask"|"deny", permissionDecisionReason: "..." } }
 *
 * MUST be fast (<200ms) — runs before every Edit/Write/MultiEdit.
 * MUST NEVER throw — failure is silent (allows the edit).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

const PRISM_WIKI_ROOT = process.env.PRISM_WIKI_ROOT ?? "H:/prism/knowledge/wiki";
const QUEUE_PATH = process.env.PRISM_CONSENSUS_QUEUE ?? "H:/prism/state/shared/consensus-queue.jsonl";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_FILE_LEN = 1;

// Minimum distinct model voices for a recorded run to count as a REAL consensus.
// A single voice "agrees with itself" (agreement=1) -- presenting that as an
// authoritative "consensus: accept" on a SAFETY-CRITICAL edit (physics constants,
// dispatcher schemas, S(x) validators) is false confidence (R12). The octopus drain
// gracefully degrades to 1 voice under GPU contention (documented in
// consensus-queue-drain.mjs), so single-voter runs DO land in the cache; below this
// floor we re-queue a proper fan-out instead of trusting the degraded result.
// Mirrors octopus-first-live-record.mjs's requireMinVoices:2 (clone-don't-fork, R15).
const MIN_CONSENSUS_VOICES = Number(process.env.PRISM_CONSENSUS_MIN_VOICES) || 2;

/**
 * Count distinct model voices in a frontmatter `model_voters` value
 * (e.g. '["qwen2.5-coder:32b","gpt-oss:20b"]' -> 2). Fail-soft to 0 on any
 * unparseable input -- an unreadable voter list must NOT count as a quorum.
 * @param {unknown} votersRaw
 * @returns {number}
 */
export function voterCount(votersRaw) {
  if (Array.isArray(votersRaw)) return votersRaw.length;
  if (typeof votersRaw !== "string") return 0;
  const s = votersRaw.trim();
  if (!s || s === "[]") return 0;
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    // fallback ONLY for a bracketed-but-unparseable list (e.g. "[claude, ollama]" with
    // unquoted tokens). A non-bracketed string is not a voter list -> 0 (never a quorum).
    if (!s.startsWith("[") || !s.endsWith("]")) return 0;
    const inner = s.slice(1, -1).trim();
    if (!inner) return 0;
    return inner.split(",").map((t) => t.trim()).filter(Boolean).length;
  }
}

// Critical-file classifiers -- match against tool_input.file_path.
// Keyword-anywhere patterns use `.*` on BOTH sides (NOT `.+`): the dominant engine
// naming is `<Keyword>Engine.ts` (e.g. SafetyEngine.ts, ThermalEngine.ts) where the
// keyword is at the START -- `.+Keyword` would require a leading char and MISS those,
// a safety false-negative (the most obvious safety files would skip consensus scrutiny).
// A keyword-substring false-positive (e.g. "Enforce" matching "force") is harmless here
// -- it only adds extra scrutiny -- so the patterns favor recall over precision.
const CRITICAL_FILE_PATTERNS = [
  /\/physics\/constants\.ts$/i,
  /\/tools\/dispatchers\/.+\.ts$/i,
  /\/engines\/.*Safety.*\.ts$/i,
  /\/engines\/.*Validator.*\.ts$/i,
  /\/engines\/Tolerance.*\.ts$/i,
  /\/engines\/Kienzle.*\.ts$/i,
  /\/engines\/Taylor.*\.ts$/i,
  /\/engines\/.*Force.*\.ts$/i,
  /\/engines\/.*Thermal.*\.ts$/i,
  /\/engines\/.*Deflection.*\.ts$/i,
  /\/state\/shared\/omega-thresholds\.json$/i,
];

const TARGETED_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || raw.length === 0) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAllow(reason) {
  const out = {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: reason ?? "",
    },
  };
  process.stdout.write(JSON.stringify(out));
}

function writeAsk(reason) {
  const out = {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(out));
}

function isCriticalFile(filePath) {
  if (typeof filePath !== "string" || filePath.length < MIN_FILE_LEN) return false;
  const norm = filePath.replace(/\\/g, "/");
  for (const pat of CRITICAL_FILE_PATTERNS) {
    if (pat.test(norm)) return true;
  }
  return false;
}

function hashPrompt(prompt) {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized, "utf-8").digest("hex");
}

function parseFrontmatter(body) {
  const out = {};
  if (!body.startsWith("---\n")) return out;
  const end = body.indexOf("\n---\n", 4);
  if (end === -1) return out;
  for (const line of body.slice(4, end).split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    out[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return out;
}

/**
 * Compose a "should I make this edit?" prompt that's stable for the same
 * (file, old, new) tuple — so duplicate edit attempts hit the same cache.
 */
function composePrompt(toolName, toolInput) {
  const file = toolInput.file_path ?? "";
  const oldStr = (toolInput.old_string ?? "").slice(0, 800);
  const newStr = (toolInput.new_string ?? toolInput.content ?? "").slice(0, 800);
  return `Critical-file edit review for ${file} via ${toolName}\n\nOLD:\n${oldStr}\n\nNEW:\n${newStr}`;
}

function tryRecall(prompt) {
  const promptHash = hashPrompt(prompt);
  const sha8 = promptHash.slice(0, 8);
  const wikiPath = path.join(PRISM_WIKI_ROOT, "consensus", `${sha8}.md`);
  if (!fs.existsSync(wikiPath)) return null;
  let stat;
  let body;
  try {
    stat = fs.statSync(wikiPath);
    body = fs.readFileSync(wikiPath, "utf-8");
  } catch {
    return null;
  }
  const ageMs = Date.now() - stat.mtimeMs;
  if (ageMs > TTL_MS) return null;
  const fm = parseFrontmatter(body);
  return {
    sha8,
    ageMs,
    recommendation: fm.recommendation ?? "review",
    agreement: fm.agreement_score ?? "0",
    voters: fm.model_voters ?? "[]",
    factuality: fm.mean_factuality ?? "null",
  };
}

function enqueueBackground(prompt, file, toolName) {
  try {
    fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      task_type: "auto-critical-edit",
      file,
      tool: toolName,
      prompt: prompt.length > 8192 ? prompt.slice(0, 8192) + "...[truncated]" : prompt,
      prompt_hash: hashPrompt(prompt),
    };
    fs.appendFileSync(QUEUE_PATH, JSON.stringify(entry) + "\n", "utf-8");
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const input = readStdinJson();
  const toolName = typeof input.tool_name === "string" ? input.tool_name : "";
  const toolInput = (input.tool_input && typeof input.tool_input === "object") ? input.tool_input : {};
  const filePath = typeof toolInput.file_path === "string" ? toolInput.file_path : "";

  // Only run on Edit/Write/MultiEdit against critical files
  if (!TARGETED_TOOLS.has(toolName) || !isCriticalFile(filePath)) {
    return writeAllow("");
  }

  const prompt = composePrompt(toolName, toolInput);
  const cached = tryRecall(prompt);

  if (cached !== null) {
    // ESCALATE forces extra human scrutiny -- safe-direction regardless of voice count
    // (a lone voice flagging "escalate" erring toward MORE review never hurts).
    if (cached.recommendation === "escalate") {
      const reason = `🛑 Critical-file edit on \`${filePath}\` was previously consensus-flagged ESCALATE (sha8 ${cached.sha8}, agreement ${cached.agreement}, voters ${cached.voters}). Request user confirmation before applying.`;
      return writeAsk(reason);
    }
    // Only an accept/review backed by a real multi-voice quorum may be surfaced as an
    // authoritative consensus. A single-voice run is NOT a consensus -- fall through to
    // the cache-miss path so a proper fan-out is re-queued (R12: never overclaim).
    const nVoices = voterCount(cached.voters);
    if (nVoices >= MIN_CONSENSUS_VOICES) {
      const reason = `✅ Critical-file edit consensus cache hit: rec=${cached.recommendation}, agreement=${cached.agreement}, factuality=${cached.factuality}, voters=${nVoices} (sha8 ${cached.sha8})`;
      return writeAllow(reason);
    }
  }

  // Cache miss OR a degraded single-voice hit -- allow with a queue notice (never block;
  // live consensus is 30-60s). The degraded path re-queues for a proper multi-voice run.
  const degraded = cached !== null;
  const queued = enqueueBackground(prompt, filePath, toolName);
  let reason = "";
  if (queued && degraded) {
    reason = `⚠ Critical-file edit on \`${filePath}\`: cached run had only ${voterCount(cached.voters)} voice (sha8 ${cached.sha8}), BELOW the ${MIN_CONSENSUS_VOICES}-voice quorum, so it is NOT a real consensus. Re-queued for a proper multi-model fan-out; treat as UNREVIEWED until then.`;
  } else if (queued) {
    reason = `🧠 Critical-file edit on \`${filePath}\`: no consensus cache. Queued for async fan-out (drain via Stop hook).`;
  }
  return writeAllow(reason);
}

export { isCriticalFile, composePrompt, hashPrompt, tryRecall, enqueueBackground, main };

// Run only as a direct hook invocation, never on import (keeps the test harness clean
// and stops a test import from blocking on fd 0 / running a live main). Mirrors the
// isDirect guard in consensus-queue-drain.mjs.
const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("auto-consensus-critical-edit.mjs");
if (isDirect) {
  main().catch(() => writeAllow(""));
}
