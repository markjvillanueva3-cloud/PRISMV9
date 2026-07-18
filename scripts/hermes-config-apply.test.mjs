/**
 * Behavioral test for hermes-config-apply.py (HERMES-LAUNCH-RELIABILITY-MS0).
 * Runs the real ruamel applier against a fixture config in a temp dir and asserts the
 * desired-state transform + comment/unknown-field preservation + idempotency. Skips
 * gracefully if no python+ruamel is available (the applier is python-env dependent).
 * Run: node scripts/hermes-config-apply.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const APPLY = join(HERE, "hermes-config-apply.py");

// Resolve a python that has ruamel.yaml. Run `--check` on an empty dir: exit 2 = no config
// (python+ruamel OK), exit 3 = ruamel missing / import error. Try candidates.
function resolvePython() {
  const cands = [
    process.env.PRISM_HERMES_PY || "C:/Users/wompu/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe",
    "H:/Tools/python/python.exe",
    "python",
    "py",
  ];
  const probe = mkdtempSync(join(tmpdir(), "hca-probe-"));
  try {
    for (const py of cands) {
      try {
        execFileSync(py, [APPLY, "--dir", probe, "--check"], { stdio: "pipe" });
      } catch (e) {
        // exit 2 (no config found) means python+ruamel imported fine -> usable
        if (e.status === 2) return py;
        // exit 3 (ruamel missing) or spawn error -> try next
      }
    }
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
  return null;
}

const PY = resolvePython();

const FIXTURE = `# my hermes config -- this comment MUST survive the round-trip
custom_user_field: keep-me
model:
  provider: ollama
  default: gpt-oss:20b          # drift: should become gpt-oss:120b
  base_url: http://127.0.0.1:11434/v1
  api_key: ollama-local
  ollama_num_ctx: 65536
fallback_providers:
  - provider: nvidia
    model: meta/llama-3.3-70b-instruct   # the 32K hard-fail -- must be STRIPPED
    base_url: https://integrate.api.nvidia.com/v1
    context_length: 32768
checkpoints:
  enabled: false          # drift: should become true (consistency + recovery)
  max_snapshots: 20
network:
  force_ipv4: false        # drift: should become true (IPv4-first, dead-IPv6 box)
`;

function runJson(py, dir, ...flags) {
  try {
    const out = execFileSync(py, [APPLY, "--dir", dir, "--json", ...flags], { encoding: "utf8" });
    return { code: 0, json: JSON.parse(out) };
  } catch (e) {
    let json = null;
    try { json = JSON.parse(e.stdout); } catch { /* */ }
    return { code: e.status, json };
  }
}

test("hermes-config-apply.py: detects drift+violations, fixes them, preserves comments/unknown fields, idempotent", () => {
  if (!PY) { console.warn("[skip] no python+ruamel available -- skipping config-apply behavioral test"); return; }
  const dir = mkdtempSync(join(tmpdir(), "hca-"));
  try {
    writeFileSync(join(dir, "config.yaml"), FIXTURE, "utf8");

    // 1. --check: drift + violations (the NVIDIA-32K cloud fallback), exit 1
    const check = runJson(PY, dir, "--check");
    assert.equal(check.code, 1, "check exits 1 on drift");
    assert.equal(check.json.drift, true);
    assert.equal(check.json.violations, true);
    const vio = check.json.results[0].violations.join(" | ");
    assert.match(vio, /cloud auto-fallback nvidia/, "flags the cloud auto-fallback");
    assert.match(vio, /< 64000/, "flags the <64K context");

    // 2. --apply: fixes it, exit 0
    const apply = runJson(PY, dir, "--apply");
    assert.equal(apply.code, 0, "apply exits 0");
    assert.equal(apply.json.results[0].status, "applied");
    // post-fix violations must be empty (the recompute-after-write fix)
    assert.deepEqual(apply.json.results[0].violations, [], "no residual violations reported after apply");

    // 3. the written file: desired state + preservation
    const written = readFileSync(join(dir, "config.yaml"), "utf8");
    assert.match(written, /default:\s*gpt-oss:20b/, "validator PRESERVES the operator's valid local pick (not force-pinned to 120b)");
    assert.ok(!/llama-3\.3-70b/.test(written), "the 32K NVIDIA fallback is stripped");
    assert.match(written, /this comment MUST survive/, "ruamel preserved the comment");
    assert.match(written, /custom_user_field:\s*keep-me/, "unknown operator field preserved");
    assert.match(written, /prism-mcp-for-hermes\.mjs/, "lean PRISM facade wired into mcp_servers");
    assert.match(written, /checkpoints:\s+enabled:\s*true/, "checkpoints enabled (root<->zulu consistency)");
    assert.match(written, /network:\s+force_ipv4:\s*true/, "force_ipv4 enabled (IPv4-first, dead-IPv6 box)");
    assert.match(written, /custom_providers:/, "custom_providers block written for the /model picker");
    assert.match(written, /Local Ollama/, "Local Ollama provider added (all 17 local models become pickable)");
    assert.match(written, /discover_models:\s*true/, "discover_models -> live /v1/models fills the picker");
    assert.match(written, /quick_commands:[\s\S]*use120b/, "quick_commands one-word switch added");
    assert.ok(readdirSync(dir).some((f) => f.startsWith("config.yaml.bak-apply-")), "a backup was written");
    assert.ok(!readdirSync(dir).some((f) => f.includes(".tmp-")), "no temp file left behind (atomic replace)");

    // 4. idempotent: a second --check is clean (exit 0, no drift)
    const recheck = runJson(PY, dir, "--check");
    assert.equal(recheck.code, 0, "re-check exits 0 (idempotent)");
    assert.equal(recheck.json.drift, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hermes-config-apply.py: a BROKEN cloud primary (cloud reasoning model) IS reset to gpt-oss:120b", () => {
  if (!PY) { console.warn("[skip] no python+ruamel available"); return; }
  const dir = mkdtempSync(join(tmpdir(), "hca-bad-"));
  try {
    // a reasoning model on a CLOUD provider hangs the agent loop (the nemo3 break) -> validator MUST reset
    writeFileSync(join(dir, "config.yaml"), [
      "model:",
      "  provider: nvidia",
      "  default: nvidia/nemotron-3-ultra-550b-a55b",
      "  base_url: https://integrate.api.nvidia.com/v1",
      "",
    ].join("\n"), "utf8");
    const apply = runJson(PY, dir, "--apply");
    assert.equal(apply.code, 0, "apply exits 0");
    const written = readFileSync(join(dir, "config.yaml"), "utf8");
    assert.match(written, /provider:\s*ollama/, "broken cloud primary -> provider reset to ollama");
    assert.match(written, /default:\s*gpt-oss:120b/, "broken primary -> default reset to the safe gpt-oss:120b");
    assert.ok(!/nemotron/.test(written), "the hang-prone nemotron primary is gone");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hermes-config-apply.py: key-gated Grok provider appears ONLY when XAI_API_KEY is in env", () => {
  if (!PY) { console.warn("[skip] no python+ruamel available"); return; }
  const dir = mkdtempSync(join(tmpdir(), "hca-grok-"));
  try {
    writeFileSync(join(dir, "config.yaml"), "model:\n  provider: ollama\n  default: gpt-oss:120b\n", "utf8");
    // WITHOUT the key -> Grok NOT added (no clutter of a dead entry)
    execFileSync(PY, [APPLY, "--dir", dir, "--apply"], { encoding: "utf8", env: { ...process.env, XAI_API_KEY: "" } });
    assert.ok(!/xAI Grok/.test(readFileSync(join(dir, "config.yaml"), "utf8")), "no XAI_API_KEY -> Grok NOT added");
    // WITH the key -> Grok auto-appears in the picker
    execFileSync(PY, [APPLY, "--dir", dir, "--apply"], { encoding: "utf8", env: { ...process.env, XAI_API_KEY: "present" } });
    const w = readFileSync(join(dir, "config.yaml"), "utf8");
    assert.match(w, /xAI Grok/, "XAI_API_KEY present -> Grok provider auto-added to the picker");
    assert.match(w, /api\.x\.ai/, "Grok base_url wired");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
