#!/usr/bin/env node
// tier: T2
/**
 * ollama-pipeline-injector.mjs — UserPromptSubmit hook
 *
 * Fires when the user invokes /forge, /forge-audit, /rgs, /scrutinize, /dedup,
 * /precompact, /handoff or any pipeline that historically did NOT route work
 * to Ollama even though the local models were loaded and idle.
 *
 * Injects an additionalContext block listing CONCRETE Ollama+Docker routes
 * the pipeline should use for this turn — model selection, expected token
 * saving, and the exact dispatcher action / CLI call to fire.
 *
 * Advisory only — never blocks. Auto-skips when:
 *   - PRISM_OLLAMA_PIPELINE_INJECT=0
 *   - Ollama daemon is not reachable
 *   - The prompt does not match any pipeline trigger
 *
 * Why a UserPromptSubmit hook (not a skill update):
 *   - Many chats invoke /forge-audit + /rgs without reading the skill body
 *     end-to-end (long docs, post-/compact context loss).
 *   - The skill body lives in markdown — easy to drift from real wiring.
 *   - A hook injects the SAME concrete routes every time, so /forge-audit
 *     run-3 fires the same Ollama calls as run-1.
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never — advisory only
 * KILL SWITCH: PRISM_OLLAMA_PIPELINE_INJECT=0
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const KILL_SWITCH = "PRISM_OLLAMA_PIPELINE_INJECT";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const PROBE_TIMEOUT_SEC = 2;

// Pipeline trigger detection. First match wins; the routes table below uses
// the matched key to surface the right model + service recommendations.
const PIPELINE_TRIGGERS = [
  { key: "forge-audit", re: /\/(forge-audit|forge2|forge3)\b/i },
  { key: "rgs", re: /\/(rgs2?|rgs-sync|rgs3)\b/i },
  { key: "forge-triple", re: /\/forge-triple\b/i },
  { key: "scrutinize", re: /\/(scrutinize|scrutiny-3way|scrutiny-batch)\b/i },
  { key: "dedup", re: /\/dedup\b/i },
  { key: "precompact", re: /\/precompact\b/i },
  { key: "deep-search", re: /\/deep-search\b/i },
  { key: "pdf-learn", re: /\/(pdf-learn|video-learn|doc-learn)\b/i },
  { key: "close-out", re: /\/close-out-audit\b/i },
];

// Concrete Ollama+Docker routes per pipeline. Phrased so a chat can copy-paste
// the right command — never abstract "consider using Ollama".
const PIPELINE_ROUTES = {
  "forge-audit": [
    "**Phase 0** (awareness summarize) — call `qwen2.5-coder:7b` to compress the 4 awareness layers into <500 tokens before Phase 1 fans out. Saves ~5K tokens/run.",
    "**Phase 1** (parallel domain audit) — add `deepseek-r1:14b` as a 4th reviewer role for cross-domain reasoning. Local, free, parallel to Claude agents A/B/C.",
    "**Phase 4** (synthesize) — use `nomic-embed-text` + Qdrant (if up) to detect finding-dedup against the wiki BEFORE writing AUDIT-LATEST.md. Saves manual review.",
    "**Phase 5** (wiki write) — call `qwen2.5-coder:14b` to draft the wiki entry stub; Claude only edits, doesn't write from scratch.",
  ],
  "rgs": [
    "**Brainstorm** — first-pass milestone proposals via `deepseek-r1:14b` (offloaded from Claude). Claude synthesizes the final list.",
    "**Utilize** — semantic search across 7,244+ MCP actions via `nomic-embed-text` + Qdrant. Better recall than substring grep.",
    "**Generate** stage 4 (test plan) — `qwen2.5-coder:32b` writes a draft test suite; Claude validates safety-critical assertions.",
  ],
  "forge-triple": [
    "**Engine generation** — `qwen2.5-coder:32b` for boilerplate; Claude for physics + safety logic.",
    "**Test writing** — `qwen2.5-coder:14b` writes assertion stubs; Claude validates real-value bounds.",
  ],
  "scrutinize": [
    "**Reviewer D** (4th opinion, free) — invoke `qwen2.5-coder:32b` in parallel with A/B/C. Cross-checks for inlined constants, stub assertions, integration coupling.",
    "**Embed-based regression check** — `nomic-embed-text` cosine against prior approved scrutiny findings (Qdrant if up, else local jsonl).",
  ],
  "dedup": [
    "**Embedding cosine pass** — `nomic-embed-text` for semantic dedup; current `duplicationGuardEngine` uses substring only.",
  ],
  "precompact": [
    "**Conversation summarize** — `qwen2.5-coder:14b` drafts the per-chat handoff RESUME; Claude polishes. Saves token-budget for the post-compact chat.",
  ],
  "deep-search": [
    "**Reasoning pass** — `deepseek-r1:14b` for the deep-search 'reason' stage after master-index hits return < 0.5 confidence.",
  ],
  "pdf-learn": [
    "**Vision OCR** — `llama3.2-vision:11b` for blueprint/PDF page-1 classification before vendor-API call (saves quota).",
    "**Knowledge extraction** — `qwen2.5-coder:14b` extracts structured facts; nomic-embed for vector ingest into Qdrant.",
  ],
  "close-out": [
    "**Envelope-vs-git diff summarize** — `qwen2.5-coder:7b` compresses the diff to a 1-line per drift; Claude decides flip-or-skip.",
  ],
};

function isOllamaUp() {
  const r = spawnSync(
    "curl",
    ["-fsS", "-m", String(PROBE_TIMEOUT_SEC), `${OLLAMA_URL}/api/tags`],
    { encoding: "utf8", timeout: (PROBE_TIMEOUT_SEC + 1) * 1000 }
  );
  return r.status === 0;
}

function loadWarmModels() {
  const r = spawnSync(
    "curl",
    ["-fsS", "-m", String(PROBE_TIMEOUT_SEC), `${OLLAMA_URL}/api/ps`],
    { encoding: "utf8", timeout: (PROBE_TIMEOUT_SEC + 1) * 1000 }
  );
  if (r.status !== 0) return [];
  try {
    const j = JSON.parse(r.stdout);
    if (Array.isArray(j.models)) return j.models.map(m => m.name || m.model).filter(Boolean);
  } catch { /* */ }
  return [];
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

(function main() {
  if (process.env[KILL_SWITCH] === "0") {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  const raw = readStdin();
  let input;
  try { input = JSON.parse(raw); } catch { input = {}; }
  const prompt = String(input.prompt || input.user_prompt || "");

  // Match pipeline trigger
  let matched = null;
  for (const t of PIPELINE_TRIGGERS) {
    if (t.re.test(prompt)) { matched = t.key; break; }
  }
  if (!matched) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  // Probe Ollama — if down, advise auto-start instead of routes
  const ollamaUp = isOllamaUp();
  const warm = ollamaUp ? loadWarmModels() : [];

  let block = `## 🧠 Ollama pipeline routes for /${matched}\n\n`;
  if (!ollamaUp) {
    block += "_Ollama is **down**. Auto-start: `node H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs --services=ollama --skip-pull`._\n\n";
    block += "_When up, the following routes apply:_\n";
  } else {
    block += `_Ollama is **up** · ${warm.length} model(s) warm in VRAM (${warm.slice(0, 3).join(", ") || "none — first call cold-starts"})_.\n\n`;
  }

  const routes = PIPELINE_ROUTES[matched] || [];
  for (const r of routes) block += `- ${r}\n`;

  block += `\n_Probe all local services: \`node H:/prism/scripts/ollama-docker-health.mjs\`_\n`;
  block += `_Disable this hook: \`${KILL_SWITCH}=0\`_\n`;

  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: block,
      },
    })
  );
})();
