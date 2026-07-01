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

import { promises as fs, existsSync, statSync } from "node:fs";
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

// All 7 octopus voices per /octopus skill + scripts/octopus-setup.mjs +
// MultiModelConsensusEngine's fan-out gates:
//   anthropic (Claude) + codex + ollama + xai/Grok + google/Gemini +
//   deepseek + zhipu/GLM.
// 2026-05-23 (slot:mike, octopus-consolidate): banner previously only
// reported Codex/Ollama/Claude -- Gemini and Grok voices were probed by the
// CLI but invisible to the SessionStart banner, systematically undercounting
// fan-out capacity fleet-wide. Now mirrors the CLI probe so the banner and
// the operator setup checklist agree.
// 2026-06-22 (slot:zulu, U-OCT-PROBE-GLM-DEEPSEEK): the consensus engine grew
// TWO more key-gated cross-vendor voices the banner was blind to -- DeepSeek
// (DEEPSEEK_API_KEY, engine includeDeepSeek gate ~L498) and GLM/Zhipu
// (GLM_API_KEY||ZHIPU_API_KEY, includeGLM gate ~L500). The banner reported
// "5 voices / All 5 live" while the engine fanned out to 7 -- the same
// systematic undercount U-OCT-PROBE-GROK-CLI fixed for Grok. Now 7-voice.
export function buildBanner(probe) {
  const ready = [];
  const missing = [];

  ready.push("Claude(this session)");

  if (probe.codex === "authed" || probe.codex === "ok") ready.push("Codex(gpt-5.5)");
  else missing.push("Codex");

  if (probe.ollamaUp) ready.push(`Ollama(${probe.ollamaModelCount} models)`);
  else missing.push("Ollama daemon");

  // Grok is reachable via THREE transports, mirroring MultiModelConsensusEngine's includeGrok
  // gate so the banner never under-reports a Grok voice the engine would actually use:
  // XAI_API_KEY (HTTP) -> keyless `grok` CLI on PATH (U-OCT-PROBE-GROK-CLI) -> the FREE local
  // Hermes OAuth proxy at :8645 (U-OCT-PROBE-HERMES, OCTOPUS-HERMES-SYNERGY 2026-06-23).
  if (probe.xaiKeyPresent) ready.push("Grok(XAI_API_KEY)");
  else if (probe.grokCliPresent) ready.push("Grok(grok CLI)");
  else if (probe.hermesProxyPresent) ready.push("Grok(hermes proxy)");
  else missing.push("Grok(XAI_API_KEY, grok CLI, or hermes proxy)");

  if (probe.geminiKeyPresent) ready.push("Gemini(API key)");
  else missing.push("Gemini(API key)");

  // DeepSeek -- key-gated cross-vendor voice; mirrors the engine's
  // includeDeepSeek gate (Boolean(DEEPSEEK_API_KEY)). Same category as
  // Grok/Gemini: counts toward the fan-out denominator, absent key => Missing.
  if (probe.deepseekKeyPresent) ready.push("DeepSeek(API key)");
  else missing.push("DeepSeek(DEEPSEEK_API_KEY)");

  // GLM/Zhipu -- key-gated cross-vendor voice; mirrors includeGLM
  // (GLM_API_KEY || ZHIPU_API_KEY). U-GLM-CONSENSUS-WIRE fast-follow.
  if (probe.glmKeyPresent) ready.push("GLM(GLM_API_KEY)");
  else missing.push("GLM(GLM_API_KEY or ZHIPU_API_KEY)");

  // claude + codex + ollama + grok + gemini + deepseek + glm = 7 candidate voices.
  const TOTAL_VOICES = 7;
  const fanOut = ready.length;
  // All 7 wired = "FULLY OPERATIONAL"; 3-6 = READY (real consensus);
  // 2 = partial (cross-vendor degraded); else DEGRADED.
  if (fanOut >= TOTAL_VOICES) {
    return `🐙 Consensus FULLY OPERATIONAL: ${ready.join(" + ")}. All ${TOTAL_VOICES} voices live -- prism_ai:consensus / TaskInput.consensus=true fans out at maximum cross-vendor coverage.`;
  }
  if (fanOut >= 3) {
    return `🐙 Multi-model consensus READY (${fanOut}/${TOTAL_VOICES} voices): ${ready.join(" + ")}. Missing: ${missing.join(", ")}. Use prism_ai:consensus or set TaskInput.consensus=true.`;
  }
  if (fanOut === 2) {
    return `🐙 Consensus partial (${fanOut}/${TOTAL_VOICES}): ${ready.join(" + ")}. Missing: ${missing.join(", ")}. Tier-6 routes will work but with reduced cross-vendor coverage.`;
  }
  return `🐙 Consensus DEGRADED (${fanOut}/${TOTAL_VOICES}): only ${ready.join(",")} reachable. Missing: ${missing.join(", ")}. Tier-6 will fall back to claude-only.`;
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

// Is the keyless `grok` CLI on PATH? PURE (injectable env + existsFn for tests).
// MIRRORS MultiModelConsensusEngine's gate (line ~487: includeGrok = XAI_API_KEY ||
// grokCLIClientEngine.isAvailable()) and GrokCLIClientEngine.resolveBinOnPath() exactly,
// so this SessionStart banner reports the SAME Grok availability the consensus engine
// actually uses. Before U-OCT-PROBE-GROK-CLI the banner only checked XAI_API_KEY, so a
// host with the `grok` CLI installed (keyless, account-auth) but no env key was reported
// "Missing Grok" even though the consensus engine WOULD fan out to it -- a systematic
// undercount. Bin name honors PRISM_GROK_CLI_BIN (default "grok"); win32 shim extensions.
// (HERMES-UTIL / U-OCT-PROBE-GROK-CLI, 2026-06-18 slot:zulu.)
export function grokCliOnPath({ env = process.env, existsFn = existsSync } = {}) {
  const bin = (env.PRISM_GROK_CLI_BIN && env.PRISM_GROK_CLI_BIN.trim()) || "grok";
  if (/[\\/]/.test(bin)) {
    try { return !!existsFn(bin); } catch { return false; }
  }
  const dirs = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  const exts = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat", ".ps1"] : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      try { if (existsFn(path.join(dir, bin + ext))) return true; } catch { /* skip unreadable dir */ }
    }
  }
  return false;
}

// Is the local Hermes OAuth proxy up AND authenticated? PURE (injectable fetch + url for tests).
// MIRRORS GrokClientEngine.hermesProxyReachable + MultiModelConsensusEngine's includeGrok gate's
// 3rd Grok transport (route the Grok voice through the FREE :8645 OAuth proxy when no key/CLI),
// so this SessionStart banner reports the SAME Grok availability the consensus engine actually
// uses. Probes the proxy `/health` ROOT (not under /v1) with a hard timeout. Fail-CLOSED: any
// failure (down / non-2xx / unauthenticated / malformed / timeout) -> false, so a down proxy
// never inflates the fan-out count. (OCTOPUS-HERMES-SYNERGY / U-OCT-PROBE-HERMES, 2026-06-23 slot:zulu.)
export async function hermesProxyUp({
  url = process.env.PRISM_HERMES_PROXY_URL ?? "http://127.0.0.1:8645/v1",
  fetchImpl = fetch,
  timeoutMs = 1500,
} = {}) {
  const healthUrl = String(url).replace(/\/v1\/?$/, "") + "/health";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(healthUrl, { signal: ctrl.signal });
    if (!r || !r.ok) return false;
    const j = await r.json().catch(() => ({}));
    return j?.status === "ok" && j?.authenticated === true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const cached = await loadCache();
  if (cached) {
    process.stdout.write(JSON.stringify({ continue: true, additionalContext: cached.banner }));
    return;
  }

  // Fresh probe — run in parallel
  const [doctor, ollama, codexAuth, hermesUp] = await Promise.all([
    runDoctor(),
    checkOllama(),
    checkCodexAuth(),
    hermesProxyUp(),
  ]);

  const parsed = doctor.ok ? parseDoctor(doctor.stdout + "\n" + doctor.stderr) : {};
  // U-OCT-PROBE-FULL-FLEET (2026-05-23, slot:mike) + U-OCT-PROBE-GLM-DEEPSEEK
  // (2026-06-22, slot:zulu): probe all 7 voices including xai (Grok) + google
  // (Gemini) + deepseek + glm/zhipu via env-key presence so the SessionStart
  // banner matches octopus-setup.mjs CLI verdict. Previously the banner hid
  // Gemini/Grok/DeepSeek/GLM readiness even when keys were set.
  const probe = {
    ...parsed,
    codex: codexAuth,
    ollamaUp: ollama.up,
    ollamaModelCount: ollama.models,
    xaiKeyPresent: probeEnvKey("XAI_API_KEY", "GROK_API_KEY"),
    grokCliPresent: grokCliOnPath(),
    // U-OCT-PROBE-HERMES: the 3rd Grok transport -- the free :8645 OAuth proxy (probed above).
    hermesProxyPresent: hermesUp,
    geminiKeyPresent: probeEnvKey("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    // U-OCT-PROBE-GLM-DEEPSEEK: the two newest key-gated consensus voices.
    deepseekKeyPresent: probeEnvKey("DEEPSEEK_API_KEY"),
    glmKeyPresent: probeEnvKey("GLM_API_KEY", "ZHIPU_API_KEY"),
  };

  const banner = buildBanner(probe);
  await saveCache({ probe, banner });

  process.stdout.write(JSON.stringify({ continue: true, additionalContext: banner }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
});
