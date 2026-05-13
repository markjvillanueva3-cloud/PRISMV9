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

// Critical-file classifiers — match against tool_input.file_path.
const CRITICAL_FILE_PATTERNS = [
  /\/physics\/constants\.ts$/i,
  /\/tools\/dispatchers\/.+\.ts$/i,
  /\/engines\/.+Safety.+\.ts$/i,
  /\/engines\/.+Validator.+\.ts$/i,
  /\/engines\/Tolerance.+\.ts$/i,
  /\/engines\/Kienzle.+\.ts$/i,
  /\/engines\/Taylor.+\.ts$/i,
  /\/engines\/.+Force.+\.ts$/i,
  /\/engines\/.+Thermal.+\.ts$/i,
  /\/engines\/.+Deflection.+\.ts$/i,
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
    if (cached.recommendation === "escalate") {
      const reason = `🛑 Critical-file edit on \`${filePath}\` was previously consensus-flagged ESCALATE (sha8 ${cached.sha8}, agreement ${cached.agreement}, voters ${cached.voters}). Request user confirmation before applying.`;
      return writeAsk(reason);
    }
    const reason = `✅ Critical-file edit consensus cache hit: rec=${cached.recommendation}, agreement=${cached.agreement}, factuality=${cached.factuality} (sha8 ${cached.sha8})`;
    return writeAllow(reason);
  }

  // Cache miss — allow with a queue notice (don't block; live consensus would be 30-60s)
  const queued = enqueueBackground(prompt, filePath, toolName);
  const reason = queued
    ? `🧠 Critical-file edit on \`${filePath}\` — no consensus cache. Queued for async fan-out (drain via Stop hook).`
    : "";
  return writeAllow(reason);
}

main().catch(() => writeAllow(""));
