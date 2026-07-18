#!/usr/bin/env node
/**
 * octopus-setup.mjs -- operator credential checklist for the octopus (7-LLM
 * consensus) subsystem.
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-C5.
 * U-OCT-PROBE-GLM-DEEPSEEK (2026-06-22, slot:zulu): grew from 5 to 7 voices to
 * stay in lockstep with MultiModelConsensusEngine's fan-out + the SessionStart
 * banner (octopus-provider-probe.mjs) -- DeepSeek + GLM/Zhipu were added there
 * and this operator checklist must report the same set so the two surfaces agree.
 *
 * Probes the 7 octopus voices and prints a per-voice status checklist with
 * the EXACT next-step command for any voice that is missing or
 * unauthenticated. The companion SessionStart hook
 * `.claude/hooks/octopus-provider-probe.mjs` already does verification on
 * every session start; this script packages it as an operator-callable CLI
 * that surfaces actionable remediation in one place.
 *
 * Voices (probed in order):
 *   1. anthropic  -- this Claude Code session. Always READY.
 *   2. codex      -- Codex CLI (`codex login status`).
 *   3. ollama     -- local daemon at http://127.0.0.1:11434.
 *   4. xai        -- Grok via XAI_API_KEY env var (the GrokCLIClientEngine is
 *                   already wired; needs only the credential).
 *   5. google     -- Gemini via GEMINI_API_KEY env var.
 *   6. deepseek   -- DeepSeek via DEEPSEEK_API_KEY env var.
 *   7. glm        -- GLM/Zhipu via GLM_API_KEY OR ZHIPU_API_KEY env var.
 *
 * Exit code: 0 if >=3 voices ready (real consensus possible), 1 otherwise.
 * Honors --json for machine consumption.
 *
 * Run: node scripts/octopus-setup.mjs [--json]
 */

import { spawnSync } from "node:child_process";

const READY_FLOOR_FOR_CONSENSUS = 3;
const CODEX_PROBE_TIMEOUT_MS = 10_000;
const OLLAMA_PROBE_TIMEOUT_MS = 3_000;

/**
 * Decide the status + remediation step for a single voice given its raw
 * probe inputs. Pure — no I/O, fully testable.
 *
 * @param {object} a
 * @param {string} a.voice                  one of: anthropic | codex | ollama | xai | google | deepseek | glm
 * @param {object} a.probe                  probe payload (shape depends on voice)
 * @returns {{voice:string, status:"ready"|"missing"|"error", reason:string, remediation:string}}
 */
export function decideVoiceStatus({ voice, probe }) {
  switch (voice) {
    case "anthropic":
      // The host session IS Claude — always ready, no setup needed.
      return {
        voice, status: "ready", reason: "this Claude Code session",
        remediation: "",
      };

    case "codex":
      if (probe && probe.loggedIn === true) {
        return { voice, status: "ready", reason: "codex login status: logged in", remediation: "" };
      }
      if (probe && probe.installed === false) {
        return {
          voice, status: "missing", reason: "codex CLI not on PATH",
          remediation: "Install Codex CLI (https://github.com/openai/codex), then run `codex login`",
        };
      }
      return {
        voice, status: "missing", reason: "codex CLI present but not authenticated",
        remediation: "Run `codex login` (interactive OAuth) — re-run this script to verify",
      };

    case "ollama":
      if (probe && probe.up === true) {
        const m = Number(probe.modelCount);
        if (Number.isFinite(m) && m >= 1) {
          return { voice, status: "ready", reason: `ollama daemon up, ${m} model(s)`, remediation: "" };
        }
        return {
          voice, status: "missing", reason: "ollama daemon up but no models pulled",
          remediation: "Pull a model: `ollama pull qwen2.5-coder:7b` (the default PRISM offload target)",
        };
      }
      return {
        voice, status: "missing", reason: "ollama daemon unreachable at http://127.0.0.1:11434",
        remediation: "Start Ollama (https://ollama.com/download) and pull a model: `ollama pull qwen2.5-coder:7b`",
      };

    case "xai":
      if (probe && typeof probe.apiKey === "string" && probe.apiKey.length > 0) {
        return { voice, status: "ready", reason: "XAI_API_KEY is set", remediation: "" };
      }
      return {
        voice, status: "missing", reason: "XAI_API_KEY env var is not set",
        remediation: "Get a key at https://x.ai/api, then set `XAI_API_KEY=<key>` in this PC's environment",
      };

    case "google":
      if (probe && typeof probe.apiKey === "string" && probe.apiKey.length > 0) {
        return { voice, status: "ready", reason: "GEMINI_API_KEY is set", remediation: "" };
      }
      return {
        voice, status: "missing", reason: "GEMINI_API_KEY env var is not set",
        remediation: "Get a key at https://aistudio.google.com/apikey, then set `GEMINI_API_KEY=<key>` in this PC's environment",
      };

    case "deepseek":
      // DEEPSEEK_API_KEY-gated cross-vendor voice (mirrors MultiModelConsensusEngine
      // includeDeepSeek). Key-only -- the DeepSeekClientEngine is already wired.
      if (probe && typeof probe.apiKey === "string" && probe.apiKey.length > 0) {
        return { voice, status: "ready", reason: "DEEPSEEK_API_KEY is set", remediation: "" };
      }
      return {
        voice, status: "missing", reason: "DEEPSEEK_API_KEY env var is not set",
        remediation: "Get a key at https://platform.deepseek.com/api_keys, then set `DEEPSEEK_API_KEY=<key>` in this PC's environment",
      };

    case "glm":
      // GLM/Zhipu voice, gated on EITHER GLM_API_KEY or ZHIPU_API_KEY (mirrors the
      // includeGLM OR-gate). The probe's apiKey is the first non-empty of the two.
      if (probe && typeof probe.apiKey === "string" && probe.apiKey.length > 0) {
        return { voice, status: "ready", reason: "GLM_API_KEY / ZHIPU_API_KEY is set", remediation: "" };
      }
      return {
        voice, status: "missing", reason: "GLM_API_KEY / ZHIPU_API_KEY env var is not set",
        remediation: "Get a key at https://open.bigmodel.cn/ (or z.ai), then set `GLM_API_KEY=<key>` in this PC's environment",
      };

    default:
      return {
        voice, status: "error", reason: `unknown voice "${voice}"`,
        remediation: "Update octopus-setup.mjs to register this voice",
      };
  }
}

/**
 * Summarize a list of voice statuses into a one-line fleet verdict.
 *
 * @param {Array<{status:string}>} statuses
 * @returns {{readyCount:number, totalCount:number, verdict:"ready"|"partial"|"degraded"}}
 */
export function summarizeFleet(statuses) {
  const readyCount = statuses.filter((s) => s.status === "ready").length;
  const totalCount = statuses.length;
  let verdict;
  if (readyCount >= READY_FLOOR_FOR_CONSENSUS) verdict = "ready";
  else if (readyCount === 2) verdict = "partial";
  else verdict = "degraded";
  return { readyCount, totalCount, verdict };
}

/**
 * Render the operator checklist as a markdown string.
 *
 * @param {Array<{voice:string, status:string, reason:string, remediation:string}>} statuses
 * @returns {string}
 */
export function renderChecklist(statuses) {
  const { readyCount, totalCount, verdict } = summarizeFleet(statuses);
  const icon = { ready: "[ok]", missing: "[--]", error: "[xx]" };
  const lines = [
    `# 🐙 Octopus ${totalCount}-voice setup -- ${readyCount}/${totalCount} ready (${verdict.toUpperCase()})`,
    "",
  ];
  for (const s of statuses) {
    lines.push(`## ${icon[s.status] || "[??]"} ${s.voice} — ${s.status}`);
    lines.push(`- Reason: ${s.reason}`);
    if (s.remediation) lines.push(`- Next: ${s.remediation}`);
    lines.push("");
  }
  if (verdict === "ready") {
    lines.push(`✓ ≥${READY_FLOOR_FOR_CONSENSUS} voices ready — real cross-vendor consensus is possible.`);
  } else if (verdict === "partial") {
    lines.push(`⚠ Only 2 voices ready — consensus runs with reduced cross-vendor coverage. Enable one more (above) to unblock the ${READY_FLOOR_FOR_CONSENSUS}-voice floor.`);
  } else {
    lines.push(`✗ ${readyCount}/${totalCount} voices ready — consensus will fall back to claude-only. Follow the remediation steps above.`);
  }
  return lines.join("\n");
}

// ── Live probes (I/O) ──────────────────────────────────────────────────────

function probeCodex() {
  try {
    const r = spawnSync("codex", ["login", "status"], {
      encoding: "utf-8", shell: true, windowsHide: true,
      timeout: CODEX_PROBE_TIMEOUT_MS,
    });
    if (r.error && r.error.code === "ENOENT") return { installed: false, loggedIn: false };
    const text = ((r.stdout || "") + (r.stderr || "")).toLowerCase();
    if (text.includes("logged in")) return { installed: true, loggedIn: true };
    return { installed: true, loggedIn: false };
  } catch {
    return { installed: false, loggedIn: false };
  }
}

async function probeOllama() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), OLLAMA_PROBE_TIMEOUT_MS);
    try {
      const r = await fetch("http://127.0.0.1:11434/api/tags", { signal: ctrl.signal });
      if (!r.ok) return { up: false, modelCount: 0 };
      const j = await r.json();
      return { up: true, modelCount: Array.isArray(j.models) ? j.models.length : 0 };
    } finally { clearTimeout(t); }
  } catch {
    return { up: false, modelCount: 0 };
  }
}

function probeEnv(name) {
  const v = process.env[name];
  return { apiKey: typeof v === "string" && v.length > 0 ? v : "" };
}

// OR-gated env probe: returns the first non-empty of `names` (e.g. the GLM voice
// accepts EITHER GLM_API_KEY or ZHIPU_API_KEY, mirroring the includeGLM gate).
function probeEnvAny(...names) {
  for (const name of names) {
    const v = process.env[name];
    if (typeof v === "string" && v.length > 0) return { apiKey: v };
  }
  return { apiKey: "" };
}

async function probeAllVoices() {
  // Anthropic, xAI, Google, DeepSeek, GLM are trivial; Codex + Ollama are external.
  const [codex, ollama] = await Promise.all([
    Promise.resolve(probeCodex()),
    probeOllama(),
  ]);
  return [
    decideVoiceStatus({ voice: "anthropic", probe: {} }),
    decideVoiceStatus({ voice: "codex", probe: codex }),
    decideVoiceStatus({ voice: "ollama", probe: ollama }),
    decideVoiceStatus({ voice: "xai", probe: probeEnv("XAI_API_KEY") }),
    decideVoiceStatus({ voice: "google", probe: probeEnv("GEMINI_API_KEY") }),
    decideVoiceStatus({ voice: "deepseek", probe: probeEnv("DEEPSEEK_API_KEY") }),
    decideVoiceStatus({ voice: "glm", probe: probeEnvAny("GLM_API_KEY", "ZHIPU_API_KEY") }),
  ];
}

async function main() {
  const json = process.argv.includes("--json");
  const statuses = await probeAllVoices();
  const summary = summarizeFleet(statuses);
  if (json) {
    process.stdout.write(JSON.stringify({ ...summary, voices: statuses }, null, 2) + "\n");
  } else {
    process.stdout.write(renderChecklist(statuses) + "\n");
  }
  process.exit(summary.readyCount >= READY_FLOOR_FOR_CONSENSUS ? 0 : 1);
}

// Entry-point guard: run only when invoked directly.
const invoked = process.argv[1] ? process.argv[1].replace(/\\/g, "/") : null;
const here = import.meta.url.replace(/^file:\/\/\/?/, "").replace(/\\/g, "/");
if (invoked && (invoked === here || here.endsWith(invoked.replace(/^.*[\\/]/, "")))) {
  main().catch((e) => { process.stderr.write(`octopus-setup: ${e.message}\n`); process.exit(2); });
}
