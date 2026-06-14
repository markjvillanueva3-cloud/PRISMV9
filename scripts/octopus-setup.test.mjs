import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { decideVoiceStatus, summarizeFleet, renderChecklist } from "./octopus-setup.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "octopus-setup.mjs");

// Test fixtures for env-var presence. Deliberately obvious non-secrets — the
// classifier only checks string-non-empty, never the contents.
const FIXTURE_NONEMPTY = "FIXTURE_NONEMPTY_NOT_A_REAL_KEY";

// ── decideVoiceStatus — per-voice classification + remediation ─────────────

test("anthropic is always ready (this Claude Code session)", () => {
  const r = decideVoiceStatus({ voice: "anthropic", probe: {} });
  assert.equal(r.status, "ready");
  assert.equal(r.remediation, "", "no remediation needed");
});

test("codex authenticated → ready", () => {
  const r = decideVoiceStatus({ voice: "codex", probe: { installed: true, loggedIn: true } });
  assert.equal(r.status, "ready");
  assert.match(r.reason, /logged in/);
});

test("codex installed but not authenticated → missing + `codex login` remediation", () => {
  const r = decideVoiceStatus({ voice: "codex", probe: { installed: true, loggedIn: false } });
  assert.equal(r.status, "missing");
  assert.match(r.remediation, /codex login/);
});

test("codex CLI not installed → missing + install link remediation", () => {
  const r = decideVoiceStatus({ voice: "codex", probe: { installed: false, loggedIn: false } });
  assert.equal(r.status, "missing");
  assert.match(r.remediation, /Install Codex CLI/);
});

test("ollama daemon up with models → ready", () => {
  const r = decideVoiceStatus({ voice: "ollama", probe: { up: true, modelCount: 3 } });
  assert.equal(r.status, "ready");
  assert.match(r.reason, /3 model\(s\)/);
});

test("ollama daemon up but no models pulled → missing + `ollama pull` remediation", () => {
  const r = decideVoiceStatus({ voice: "ollama", probe: { up: true, modelCount: 0 } });
  assert.equal(r.status, "missing");
  assert.match(r.remediation, /ollama pull/);
});

test("ollama daemon unreachable → missing + start-daemon remediation", () => {
  const r = decideVoiceStatus({ voice: "ollama", probe: { up: false, modelCount: 0 } });
  assert.equal(r.status, "missing");
  assert.match(r.remediation, /Start Ollama/);
});

test("xai with a non-empty XAI_API_KEY → ready", () => {
  const r = decideVoiceStatus({ voice: "xai", probe: { apiKey: FIXTURE_NONEMPTY } });
  assert.equal(r.status, "ready");
});

test("xai with empty XAI_API_KEY → missing + key-link remediation", () => {
  const r = decideVoiceStatus({ voice: "xai", probe: { apiKey: "" } });
  assert.equal(r.status, "missing");
  assert.match(r.remediation, /x\.ai\/api/);
  assert.match(r.remediation, /XAI_API_KEY=/);
});

test("google with a non-empty GEMINI_API_KEY → ready", () => {
  const r = decideVoiceStatus({ voice: "google", probe: { apiKey: FIXTURE_NONEMPTY } });
  assert.equal(r.status, "ready");
});

test("google with empty GEMINI_API_KEY → missing + key-link remediation", () => {
  const r = decideVoiceStatus({ voice: "google", probe: { apiKey: "" } });
  assert.equal(r.status, "missing");
  assert.match(r.remediation, /aistudio\.google\.com/);
  assert.match(r.remediation, /GEMINI_API_KEY=/);
});

test("unknown voice → error verdict with self-fix remediation (defensive)", () => {
  const r = decideVoiceStatus({ voice: "qwen", probe: {} });
  assert.equal(r.status, "error");
  assert.match(r.remediation, /octopus-setup\.mjs/);
});

// ── summarizeFleet — fleet verdict ─────────────────────────────────────────

test("summarizeFleet: 3 ready → 'ready' verdict (≥ floor)", () => {
  const s = summarizeFleet([
    { status: "ready" }, { status: "ready" }, { status: "ready" },
    { status: "missing" }, { status: "missing" },
  ]);
  assert.equal(s.readyCount, 3);
  assert.equal(s.totalCount, 5);
  assert.equal(s.verdict, "ready");
});

test("summarizeFleet: 4 ready → 'ready' (above floor)", () => {
  const s = summarizeFleet([
    { status: "ready" }, { status: "ready" }, { status: "ready" }, { status: "ready" },
    { status: "missing" },
  ]);
  assert.equal(s.verdict, "ready");
});

test("summarizeFleet: 2 ready → 'partial'", () => {
  const s = summarizeFleet([
    { status: "ready" }, { status: "ready" },
    { status: "missing" }, { status: "missing" }, { status: "missing" },
  ]);
  assert.equal(s.verdict, "partial");
});

test("summarizeFleet: 1 ready → 'degraded'", () => {
  const s = summarizeFleet([
    { status: "ready" },
    { status: "missing" }, { status: "missing" }, { status: "missing" }, { status: "missing" },
  ]);
  assert.equal(s.verdict, "degraded");
});

test("summarizeFleet: 0 ready → 'degraded' (catastrophic — never throw)", () => {
  const s = summarizeFleet([
    { status: "missing" }, { status: "missing" }, { status: "missing" }, { status: "missing" }, { status: "missing" },
  ]);
  assert.equal(s.verdict, "degraded");
  assert.equal(s.readyCount, 0);
});

// ── renderChecklist — operator-facing output ───────────────────────────────

test("renderChecklist: includes a remediation for each missing voice", () => {
  const out = renderChecklist([
    { voice: "anthropic", status: "ready", reason: "this session", remediation: "" },
    { voice: "codex", status: "missing", reason: "not authed", remediation: "Run `codex login`" },
    { voice: "ollama", status: "missing", reason: "daemon down", remediation: "Start Ollama" },
    { voice: "xai", status: "ready", reason: "key set", remediation: "" },
    { voice: "google", status: "missing", reason: "key missing", remediation: "Get a key from aistudio" },
  ]);
  assert.match(out, /Octopus 5-voice setup — 2\/5 ready \(PARTIAL\)/);
  assert.match(out, /Run `codex login`/);
  assert.match(out, /Start Ollama/);
  assert.match(out, /Get a key from aistudio/);
  // anthropic + xai are ready → no Next line for them.
  assert.equal((out.match(/Next:/g) || []).length, 3,
    "exactly 3 missing voices must have a Next-step line");
});

test("renderChecklist: all-ready case emits the success summary", () => {
  const out = renderChecklist([
    { voice: "anthropic", status: "ready", reason: "x", remediation: "" },
    { voice: "codex", status: "ready", reason: "x", remediation: "" },
    { voice: "ollama", status: "ready", reason: "x", remediation: "" },
    { voice: "xai", status: "ready", reason: "x", remediation: "" },
    { voice: "google", status: "ready", reason: "x", remediation: "" },
  ]);
  assert.match(out, /5\/5 ready \(READY\)/);
  assert.match(out, /real cross-vendor consensus is possible/);
});

test("renderChecklist: degraded case emits the fallback warning", () => {
  const out = renderChecklist([
    { voice: "anthropic", status: "ready", reason: "x", remediation: "" },
    { voice: "codex", status: "missing", reason: "x", remediation: "y" },
    { voice: "ollama", status: "missing", reason: "x", remediation: "y" },
    { voice: "xai", status: "missing", reason: "x", remediation: "y" },
    { voice: "google", status: "missing", reason: "x", remediation: "y" },
  ]);
  assert.match(out, /1\/5 ready \(DEGRADED\)/);
  assert.match(out, /fall back to claude-only/);
});

// ── E2E — real subprocess executes and exits with the right code ───────────

test("script E2E: --json mode emits a parseable summary; xai+google forced missing", () => {
  // Force blank XAI/GEMINI in the subprocess env so the test is hermetic
  // for those two voices regardless of the live host's state.
  const r = spawnSync(process.execPath, [SCRIPT, "--json"], {
    encoding: "utf-8",
    env: { ...process.env, XAI_API_KEY: "", GEMINI_API_KEY: "" },
    timeout: 30_000,
  });
  // Exit 0 if ≥3 voices ready, 1 otherwise — both are valid host outcomes;
  // assert the binary range + JSON shape so the test is hermetic.
  assert.ok(r.status === 0 || r.status === 1, `unexpected exit ${r.status}: ${r.stderr}`);
  const payload = JSON.parse(r.stdout);
  assert.equal(typeof payload.readyCount, "number");
  assert.equal(payload.totalCount, 5);
  assert.ok(Array.isArray(payload.voices));
  assert.equal(payload.voices.length, 5);
  const voiceNames = payload.voices.map((v) => v.voice).sort();
  assert.deepEqual(voiceNames, ["anthropic", "codex", "google", "ollama", "xai"]);
  const xai = payload.voices.find((v) => v.voice === "xai");
  const google = payload.voices.find((v) => v.voice === "google");
  assert.equal(xai.status, "missing", "blank XAI_API_KEY must classify missing");
  assert.equal(google.status, "missing", "blank GEMINI_API_KEY must classify missing");
});
