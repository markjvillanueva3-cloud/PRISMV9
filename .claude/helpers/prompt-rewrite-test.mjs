#!/usr/bin/env node
/**
 * prompt-rewrite-test.mjs — CLI exerciser for the prompt-rewriter hook
 *
 * USAGE:
 *   node H:/prism/.claude/helpers/prompt-rewrite-test.mjs --prompt "your raw prompt"
 *   node H:/prism/.claude/helpers/prompt-rewrite-test.mjs --prompt "..." --debug
 *   node H:/prism/.claude/helpers/prompt-rewrite-test.mjs --check-only
 *
 * --check-only: report Ollama reachability and model selection without
 *               running a rewrite.
 * --model:      override auto-picked model.
 * --debug:      pass OLLAMA_REWRITE_DEBUG=1 to the hook.
 * --timeout:    override OLLAMA_REWRITE_TIMEOUT (default 3000ms).
 *
 * WHAT IT DOES: spawns the prompt-rewriter hook as a subprocess, feeds
 * it a synthetic UserPromptSubmit payload, prints the hook's stdout
 * (additionalContext if any) and stderr (diagnostics in debug mode).
 *
 * This is the only supported way to unit-test the hook end-to-end
 * without submitting an actual Claude Code prompt.
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

// ── arg parse (no deps) ───────────────────────────────────────────────
function parseArgs(argv) {
  const out = { prompt: null, model: null, debug: false, timeout: null, checkOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--prompt") out.prompt = argv[++i];
    else if (a === "--model") out.model = argv[++i];
    else if (a === "--timeout") out.timeout = argv[++i];
    else if (a === "--debug") out.debug = true;
    else if (a === "--check-only") out.checkOnly = true;
    else if (a === "-h" || a === "--help") {
      process.stdout.write(
        "usage: prompt-rewrite-test.mjs --prompt \"…\" [--model M] [--debug] [--timeout ms] [--check-only]\n",
      );
      process.exit(0);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

// ── Ollama reachability probe (independent of hook) ───────────────────
async function probeOllama() {
  const url = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
  const ctl = new AbortController();
  const deadline = setTimeout(() => ctl.abort(), 1500);
  try {
    const res = await fetch(`${url}/api/tags`, { signal: ctl.signal });
    if (!res.ok) return { reachable: false, reason: `HTTP ${res.status}`, url };
    const data = await res.json();
    const models = (data?.models || []).map((m) => m.name).filter(Boolean);
    return { reachable: true, url, models };
  } catch (err) {
    return { reachable: false, reason: String(err?.message || err), url };
  } finally {
    clearTimeout(deadline);
  }
}

// ── Main ──────────────────────────────────────────────────────────────
(async () => {
  const probe = await probeOllama();
  process.stdout.write(`Ollama probe: ${probe.url}\n`);
  if (!probe.reachable) {
    process.stdout.write(`  REACHABLE: no (${probe.reason})\n`);
    process.stdout.write(`  Start Ollama with: ollama serve   (or: docker compose up -d ollama)\n`);
  } else {
    process.stdout.write(`  REACHABLE: yes\n`);
    process.stdout.write(`  Installed models: ${probe.models.length > 0 ? probe.models.join(", ") : "(none — run `ollama pull qwen2.5-coder:32b`)"}\n`);
  }
  process.stdout.write("\n");

  if (args.checkOnly) process.exit(probe.reachable ? 0 : 1);
  if (!args.prompt) {
    process.stderr.write("ERROR: --prompt is required (or use --check-only)\n");
    process.exit(2);
  }

  // Spawn the hook with a synthetic UserPromptSubmit payload.
  const payload = JSON.stringify({
    prompt: args.prompt,
    session_id: "rewrite-test-session",
  });
  const env = { ...process.env };
  if (args.debug) env.OLLAMA_REWRITE_DEBUG = "1";
  if (args.model) env.OLLAMA_REWRITE_MODEL = args.model;
  if (args.timeout) env.OLLAMA_REWRITE_TIMEOUT = String(args.timeout);

  const t0 = Date.now();
  const res = spawnSync(
    process.execPath,
    ["H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs"],
    { windowsHide: true,
      input: payload,
      env,
      encoding: "utf-8",
      timeout: (parseInt(args.timeout || "3000", 10)) + 2000,
    },
  );
  const wallMs = Date.now() - t0;

  process.stdout.write(`Hook exit: ${res.status} (wall ${wallMs}ms)\n\n`);

  if (res.stderr && res.stderr.trim()) {
    process.stdout.write("---- stderr (debug) ----\n");
    process.stdout.write(res.stderr);
    process.stdout.write("\n");
  }

  const out = (res.stdout || "").trim();
  if (!out) {
    process.stdout.write("Hook produced NO output — this means it no-op'd.\n");
    process.stdout.write("Expected when: Ollama down, no models, prompt too short, [RAW] opt-out,\n");
    process.stdout.write("low confidence, timeout, or parse error. Check the log at\n");
    process.stdout.write("  H:/prism/.claude/cache/prompt-rewrites.jsonl\n");
    process.exit(0);
  }

  // Try to pretty-print the additionalContext if we got one.
  try {
    const parsed = JSON.parse(out);
    const ctx = parsed?.hookSpecificOutput?.additionalContext;
    if (ctx) {
      process.stdout.write("---- injected additionalContext ----\n");
      process.stdout.write(ctx);
      process.stdout.write("\n");
    } else {
      process.stdout.write("Hook emitted JSON with no additionalContext:\n");
      process.stdout.write(out + "\n");
    }
  } catch {
    process.stdout.write("Hook emitted non-JSON output (unexpected):\n");
    process.stdout.write(out + "\n");
  }
})().catch((err) => {
  process.stderr.write(`tester error: ${err?.message || err}\n`);
  process.exit(1);
});
