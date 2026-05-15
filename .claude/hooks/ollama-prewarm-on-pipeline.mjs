#!/usr/bin/env node
// tier: T3
/**
 * ollama-prewarm-on-pipeline.mjs — UserPromptSubmit hook
 *
 * When a pipeline trigger fires (/forge*, /rgs, /scrutinize, /dedup,
 * /deep-search, /pdf-learn, /close-out-audit, /precompact) AND the
 * required Ollama model is NOT yet warm in VRAM, fire a tiny
 * background /api/generate request to pre-load it. Returns instantly;
 * the model warms while Claude is still processing the user prompt.
 *
 * First Ollama call in a hot session: ~150ms.
 * First Ollama call after cold-start of qwen2.5-coder:32b: 3-5s.
 * Pre-warming during the prompt-submit → first-tool-call window
 * (typically 2-4s of Claude reasoning) hides the cold-start entirely.
 *
 * Rate-limited via stamp file (10-min cooldown per model) so a chat
 * that fires /forge-audit twice in 30s doesn't re-warm.
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never — fire-and-forget background spawn
 * KILL SWITCH: PRISM_OLLAMA_PREWARM_DISABLE=1
 */

import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname } from "node:path";

const KILL_SWITCH = "PRISM_OLLAMA_PREWARM_DISABLE";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const STAMP_DIR = "H:/prism/.claude/cache/ollama-prewarm";
const COOLDOWN_MS = 10 * 60 * 1000; // 10 min per-model cooldown
const PROBE_TIMEOUT_SEC = 2;

// Pipeline-to-model mapping. The PRIMARY model warmed for each pipeline.
// (deepseek-r1:14b is intentionally NOT auto-warmed — 9GB cold-load,
// reviewer-D is opt-in for the operator.)
const PIPELINE_MODELS = {
  "forge-audit": "qwen2.5-coder:7b",
  "forge2": "qwen2.5-coder:7b",
  "forge-triple": "qwen2.5-coder:14b",
  "rgs": "qwen2.5-coder:7b",
  "rgs2": "qwen2.5-coder:7b",
  "rgs-sync": "qwen2.5-coder:7b",
  "scrutinize": "qwen2.5-coder:7b",
  "scrutiny-3way": "qwen2.5-coder:7b",
  "dedup": "nomic-embed-text",
  "precompact": "qwen2.5-coder:14b",
  "deep-search": "qwen2.5-coder:7b",
  "pdf-learn": "qwen2.5-coder:7b",
  "video-learn": "qwen2.5-coder:7b",
  "close-out-audit": "qwen2.5-coder:7b",
};

const TRIGGER_RE = new RegExp(`/(${Object.keys(PIPELINE_MODELS).join("|")})\\b`, "i");

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function matchTrigger(prompt) {
  const m = prompt.match(TRIGGER_RE);
  if (!m) return null;
  return m[1].toLowerCase();
}

function ollamaUp() {
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

function inCooldown(model) {
  const stamp = `${STAMP_DIR}/${model.replace(/[^a-z0-9.\-]/gi, "_")}.iso`;
  if (!existsSync(stamp)) return false;
  try {
    const mt = statSync(stamp).mtimeMs;
    return Date.now() - mt < COOLDOWN_MS;
  } catch { return false; }
}

function stampCooldown(model) {
  try {
    if (!existsSync(STAMP_DIR)) mkdirSync(STAMP_DIR, { recursive: true });
    const stamp = `${STAMP_DIR}/${model.replace(/[^a-z0-9.\-]/gi, "_")}.iso`;
    writeFileSync(stamp, new Date().toISOString());
  } catch { /* fail-soft */ }
}

function warmModel(model) {
  // Fire a 1-token generate request, detached. The keep_alive=10m parameter
  // keeps the model resident for 10 min after this hook returns.
  const body = JSON.stringify({
    model,
    prompt: "ok",
    stream: false,
    keep_alive: "10m",
    options: { num_predict: 1 },
  });
  // Spawn detached curl — never wait. The stdin pipe streams the body in,
  // then curl exits without parent dependency.
  try {
    const child = spawn(
      "curl",
      ["-fsS", "-m", "30", "-X", "POST", "-H", "Content-Type: application/json",
       "-d", body, `${OLLAMA_URL}/api/generate`],
      { detached: true, stdio: "ignore", windowsHide: true }
    );
    child.unref();
    return true;
  } catch {
    return false;
  }
}

(function main() {
  if (process.env[KILL_SWITCH] === "1") {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  const raw = readStdin();
  let input;
  try { input = JSON.parse(raw); } catch { input = {}; }
  const prompt = String(input.prompt || input.user_prompt || "");

  const trigger = matchTrigger(prompt);
  if (!trigger) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  const model = PIPELINE_MODELS[trigger];
  if (!model) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  if (inCooldown(model)) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  if (!ollamaUp()) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  // If model is already warm, just stamp + skip
  const warm = loadWarmModels();
  if (warm.some(w => w === model || w.startsWith(model + ":"))) {
    stampCooldown(model);
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  // Fire the warmup
  const ok = warmModel(model);
  if (ok) stampCooldown(model);

  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
})();
