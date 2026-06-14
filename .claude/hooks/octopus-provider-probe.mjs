#!/usr/bin/env node
// tier: T4
/**
 * octopus-provider-probe.mjs — SessionStart hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
 *
 * Each session start, runs the octopus doctor diagnostic and surfaces:
 *   - Which providers are installed/authenticated (Codex, Gemini, Qwen, Ollama, etc)
 *   - Which providers are missing
 *   - Whether the consensus pipeline can actually fan out (≥2 providers)
 *
 * Caches the result for 6 hours to avoid spawning octopus doctor on every prompt.
 * Outputs a one-line additionalContext when status changes (or first run).
 *
 * Failure mode: any error → emit {continue: true} and exit 0. Never blocks.
 */

import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const CACHE_FILE = "H:/prism/mcp-server/data/state/octopus-probe-cache.json";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const OCTOPUS_BIN = path.join(
  os.homedir(),
  ".claude/plugins/cache/nyldn-plugins/octo/9.30.0/bin/octopus",
);

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    const j = JSON.parse(raw);
    if (typeof j.ts !== "number") return null;
    if (Date.now() - j.ts > CACHE_TTL_MS) return null;
    return j;
  } catch {
    return null;
  }
}

async function saveCache(payload) {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify({ ts: Date.now(), ...payload }, null, 2));
  } catch {
    // best-effort
  }
}

function runDoctor() {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (r) => { if (!settled) { settled = true; resolve(r); } };
    let child;
    try {
      child = spawn("bash", [OCTOPUS_BIN, "doctor"], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (e) {
      return settle({ ok: false, error: `spawn: ${e.message}`, stdout: "", stderr: "" });
    }
    const t = setTimeout(() => {
      try { child.kill(); } catch { /* ignore */ }
      settle({ ok: false, error: "timeout", stdout, stderr });
    }, 30_000);
    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", (e) => {
      clearTimeout(t);
      settle({ ok: false, error: `process: ${e.message}`, stdout, stderr });
    });
    child.on("exit", (code) => {
      clearTimeout(t);
      settle({ ok: code === 0, error: code !== 0 ? `exit ${code}` : null, stdout, stderr });
    });
  });
}

function parseDoctor(out) {
  const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
  const text = stripAnsi(out);

  const status = (re) => {
    const m = text.match(re);
    if (!m) return "unknown";
    const line = m[0];
    if (line.includes("✓")) return "ok";
    if (line.includes("⚠")) return "missing";
    if (line.includes("✗")) return "fail";
    return "unknown";
  };

  return {
    claudeCode: status(/Claude Code version[^\n]*/),
    codex:      status(/Codex CLI[^\n]*/),
    gemini:     status(/Gemini CLI[^\n]*/),
    ollama:     status(/Ollama[^\n]*/),
    qwen:       status(/Qwen CLI[^\n]*/),
    copilot:    status(/Copilot CLI[^\n]*/),
    perplexity: status(/Perplexity[^\n]*/),
  };
}

async function checkCodexAuth() {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const settle = (r) => { if (!settled) { settled = true; resolve(r); } };
    let child;
    try {
      child = spawn("codex", ["login", "status"], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        shell: true,
      });
    } catch {
      return settle("missing");
    }
    const t = setTimeout(() => {
      try { child.kill(); } catch { /* ignore */ }
      settle("timeout");
    }, 10_000);
    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", () => { clearTimeout(t); settle("missing"); });
    child.on("exit", (code) => {
      clearTimeout(t);
      const text = (stdout + stderr).toLowerCase();
      if (text.includes("logged in")) settle("authed");
      else if (code === 0) settle("ok");
      else settle("missing");
    });
  });
}

async function checkOllama() {
  try {
    const r = await fetch("http://127.0.0.1:11434/api/tags");
    if (!r.ok) return { up: false, models: 0 };
    const j = await r.json();
    return { up: true, models: (j.models ?? []).length };
  } catch {
    return { up: false, models: 0 };
  }
}

// All 5 octopus voices per /octopus skill + scripts/octopus-setup.mjs:
// anthropic (Claude) + codex + ollama + xai/Grok + google/Gemini.
// 2026-05-23 (slot:mike, octopus-consolidate): banner previously only
// reported Codex/Ollama/Claude — Gemini and Grok voices were probed by the
// CLI but invisible to the SessionStart banner, systematically undercounting
// fan-out capacity fleet-wide. Now mirrors the CLI probe so the banner and
// the operator setup checklist agree.
export function buildBanner(probe) {
  const ready = [];
  const missing = [];

  ready.push("Claude(this session)");

  if (probe.codex === "authed" || probe.codex === "ok") ready.push("Codex(gpt-5.5)");
  else missing.push("Codex");

  if (probe.ollamaUp) ready.push(`Ollama(${probe.ollamaModelCount} models)`);
  else missing.push("Ollama daemon");

  if (probe.xaiKeyPresent) ready.push("Grok(XAI_API_KEY)");
  else missing.push("Grok(XAI_API_KEY)");

  if (probe.geminiKeyPresent) ready.push("Gemini(API key)");
  else missing.push("Gemini(API key)");

  const fanOut = ready.length;
  // 5 voices wired = "FULLY OPERATIONAL"; 3-4 = READY (real consensus);
  // 2 = partial (cross-vendor degraded); else DEGRADED.
  if (fanOut >= 5) {
    return `🐙 Consensus FULLY OPERATIONAL: ${ready.join(" + ")}. All 5 voices live — prism_ai:consensus / TaskInput.consensus=true fans out at maximum cross-vendor coverage.`;
  }
  if (fanOut >= 3) {
    return `🐙 Multi-model consensus READY (${fanOut}/5 voices): ${ready.join(" + ")}. Missing: ${missing.join(", ")}. Use prism_ai:consensus or set TaskInput.consensus=true.`;
  }
  if (fanOut === 2) {
    return `🐙 Consensus partial (${fanOut}/5): ${ready.join(" + ")}. Missing: ${missing.join(", ")}. Tier-6 routes will work but with reduced cross-vendor coverage.`;
  }
  return `🐙 Consensus DEGRADED (${fanOut}/5): only ${ready.join(",")} reachable. Missing: ${missing.join(", ")}. Tier-6 will fall back to claude-only.`;
}

// Env-var presence probe (no external process — fast, deterministic).
// Mirrors scripts/octopus-setup.mjs probeEnv() semantics.
export function probeEnvKey(...names) {
  for (const n of names) {
    const v = process.env[n];
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

async function main() {
  const cached = await loadCache();
  if (cached) {
    process.stdout.write(JSON.stringify({ continue: true, additionalContext: cached.banner }));
    return;
  }

  // Fresh probe — run in parallel
  const [doctor, ollama, codexAuth] = await Promise.all([
    runDoctor(),
    checkOllama(),
    checkCodexAuth(),
  ]);

  const parsed = doctor.ok ? parseDoctor(doctor.stdout + "\n" + doctor.stderr) : {};
  // U-OCT-PROBE-FULL-FLEET (2026-05-23, slot:mike): probe all 5 voices
  // including xai (Grok) + google (Gemini) via env-key presence so the
  // SessionStart banner matches octopus-setup.mjs CLI verdict. Previously
  // the banner hid Gemini/Grok readiness even when keys were set.
  const probe = {
    ...parsed,
    codex: codexAuth,
    ollamaUp: ollama.up,
    ollamaModelCount: ollama.models,
    xaiKeyPresent: probeEnvKey("XAI_API_KEY", "GROK_API_KEY"),
    geminiKeyPresent: probeEnvKey("GEMINI_API_KEY", "GOOGLE_API_KEY"),
  };

  const banner = buildBanner(probe);
  await saveCache({ probe, banner });

  process.stdout.write(JSON.stringify({ continue: true, additionalContext: banner }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
});
