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

function buildBanner(probe) {
  const ready = [];
  const missing = [];

  if (probe.codex === "authed" || probe.codex === "ok") ready.push("Codex(gpt-5.5)");
  else missing.push("Codex");

  if (probe.ollamaUp) ready.push(`Ollama(${probe.ollamaModelCount} models)`);
  else missing.push("Ollama daemon");

  ready.push("Claude(this session)");

  const fanOut = ready.length;
  if (fanOut >= 3) {
    return `🐙 Multi-model consensus READY: ${ready.join(" + ")}. Use prism_ai:consensus or set TaskInput.consensus=true to fan out.`;
  }
  if (fanOut === 2) {
    return `🐙 Consensus partial: ${ready.join(" + ")}. Missing: ${missing.join(", ")}. Tier-6 routes will work but with reduced cross-vendor coverage.`;
  }
  return `🐙 Consensus DEGRADED: only ${ready.join(",")} reachable. Missing: ${missing.join(", ")}. Tier-6 will fall back to claude-only.`;
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
  const probe = {
    ...parsed,
    codex: codexAuth,
    ollamaUp: ollama.up,
    ollamaModelCount: ollama.models,
  };

  const banner = buildBanner(probe);
  await saveCache({ probe, banner });

  process.stdout.write(JSON.stringify({ continue: true, additionalContext: banner }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
});
