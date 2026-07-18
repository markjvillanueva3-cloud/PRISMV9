/**
 * octopus-provider-probe.test.mjs
 *
 * U-OCT-PROBE-FULL-FLEET (2026-05-23, slot:mike) -- banner-builder behavior
 * coverage. The pre-fix banner only ever reported Codex+Ollama+Claude even
 * when Gemini/Grok were live, systematically undercounting fan-out capacity
 * fleet-wide. These tests pin the banner behavior + the `probeEnvKey()`
 * helper used to drive it.
 *
 * U-OCT-PROBE-GLM-DEEPSEEK (2026-06-22, slot:zulu) -- the consensus engine
 * fans out to 7 voices (added DeepSeek + GLM/Zhipu, both key-gated). The
 * banner was still 5-voice -- these tests pin the 7-voice denominator and
 * the new DeepSeek + GLM crediting (R9 bites the old /5 code).
 *
 * Run: node --test .claude/hooks/octopus-provider-probe.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildBanner, probeEnvKey, grokCliOnPath, hermesProxyUp } from "./octopus-provider-probe.mjs";

// ── probeEnvKey ────────────────────────────────────────────────────────────
test("probeEnvKey: returns true on first non-empty env var", () => {
  process.env.__OCT_TEST_A = "yes";
  delete process.env.__OCT_TEST_B;
  try {
    assert.equal(probeEnvKey("__OCT_TEST_A"), true);
    assert.equal(probeEnvKey("__OCT_TEST_B", "__OCT_TEST_A"), true);
  } finally {
    delete process.env.__OCT_TEST_A;
  }
});

test("probeEnvKey: returns false when none set or all empty", () => {
  delete process.env.__OCT_TEST_X;
  process.env.__OCT_TEST_EMPTY = "   ";
  try {
    assert.equal(probeEnvKey("__OCT_TEST_X"), false);
    assert.equal(probeEnvKey("__OCT_TEST_EMPTY"), false);
  } finally {
    delete process.env.__OCT_TEST_EMPTY;
  }
});

test("probeEnvKey: ignores non-string values defensively", () => {
  // process.env coerces non-strings; this still must not throw.
  const before = process.env.__OCT_TEST_TYPE;
  process.env.__OCT_TEST_TYPE = "";
  try {
    assert.equal(probeEnvKey("__OCT_TEST_TYPE"), false);
  } finally {
    if (before === undefined) delete process.env.__OCT_TEST_TYPE;
    else process.env.__OCT_TEST_TYPE = before;
  }
});

// ── buildBanner -- 7-voice fleet view ───────────────────────────────────────
test("buildBanner: FULLY OPERATIONAL when all 7 voices ready", () => {
  const out = buildBanner({
    codex: "authed",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: true,
    geminiKeyPresent: true,
    deepseekKeyPresent: true,
    glmKeyPresent: true,
  });
  assert.match(out, /FULLY OPERATIONAL/);
  assert.match(out, /All 7 voices live/);
  assert.match(out, /Claude/);
  assert.match(out, /Codex/);
  assert.match(out, /Ollama\(8 models\)/);
  assert.match(out, /Grok/);
  assert.match(out, /Gemini/);
  assert.match(out, /DeepSeek/);
  assert.match(out, /GLM/);
  assert.doesNotMatch(out, /Missing/);
});

test("buildBanner: 5 core voices but no DeepSeek/GLM -> READY 5/7 (NOT fully operational)", () => {
  // R9: the old code returned FULLY OPERATIONAL at 5 voices. The engine now
  // fans out to 7, so the 5-core host is honestly 5/7 -- two cross-vendor
  // voices still addable. This bites the stale /5 "all voices live" claim.
  const out = buildBanner({
    codex: "authed",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: true,
    geminiKeyPresent: true,
    deepseekKeyPresent: false,
    glmKeyPresent: false,
  });
  assert.match(out, /READY \(5\/7 voices\)/);
  assert.doesNotMatch(out, /FULLY OPERATIONAL/);
  assert.match(out, /Missing:.*DeepSeek/);
  assert.match(out, /Missing:.*GLM/);
});

test("buildBanner: READY with 3-of-7 (the live state today)", () => {
  // Mirrors the current production probe: Claude + Ollama + Gemini live;
  // Codex unauth + no XAI_API_KEY + no DeepSeek/GLM keys. The pre-fix banner
  // misreported this as "Consensus partial: Ollama + Claude" hiding Gemini.
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: false,
    geminiKeyPresent: true,
  });
  assert.match(out, /READY \(3\/7 voices\)/);
  assert.match(out, /Claude/);
  assert.match(out, /Ollama/);
  assert.match(out, /Gemini/);
  assert.match(out, /Missing:.*Codex/);
  assert.match(out, /Missing:.*Grok/);
});

test("buildBanner: READY with 4-of-7", () => {
  const out = buildBanner({
    codex: "authed",
    ollamaUp: true, ollamaModelCount: 4,
    xaiKeyPresent: false,
    geminiKeyPresent: true,
  });
  assert.match(out, /READY \(4\/7 voices\)/);
  assert.match(out, /Missing:.*Grok/);
});

test("buildBanner: partial with 2-of-7 (Claude + Ollama only)", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 2,
    xaiKeyPresent: false,
    geminiKeyPresent: false,
  });
  assert.match(out, /partial \(2\/7\)/);
  assert.match(out, /Missing:.*Codex/);
  assert.match(out, /Missing:.*Grok/);
  assert.match(out, /Missing:.*Gemini/);
  assert.match(out, /Missing:.*DeepSeek/);
  assert.match(out, /Missing:.*GLM/);
});

test("buildBanner: DEGRADED with Claude only", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: false, ollamaModelCount: 0,
    xaiKeyPresent: false,
    geminiKeyPresent: false,
  });
  assert.match(out, /DEGRADED \(1\/7\)/);
  assert.match(out, /Missing:.*Ollama daemon/);
});

test("buildBanner: codex 'ok' status counts as ready (back-compat)", () => {
  const out = buildBanner({
    codex: "ok",
    ollamaUp: true, ollamaModelCount: 1,
    xaiKeyPresent: false,
    geminiKeyPresent: false,
  });
  assert.match(out, /Codex/);
  assert.match(out, /3\/7/);
});

test("buildBanner: ollama model count surfaces verbatim", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 12,
    xaiKeyPresent: false,
    geminiKeyPresent: false,
  });
  assert.match(out, /Ollama\(12 models\)/);
});

// ── Grok keyless-CLI voice (U-OCT-PROBE-GROK-CLI 2026-06-18) ─────────────────
// The banner must credit Grok when the keyless `grok` CLI is on PATH (no env key),
// matching MultiModelConsensusEngine's includeGrok gate. Pre-fix it only checked
// XAI_API_KEY, undercounting fan-out on grok-CLI hosts.
test("buildBanner: grok CLI present (no key) -> Grok counted READY (the fix; R9 bites old code)", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: false,
    grokCliPresent: true,        // keyless CLI voice the consensus engine WOULD use
    geminiKeyPresent: true,
  });
  assert.match(out, /READY \(4\/7 voices\)/);   // was 3/7 before crediting the CLI
  assert.match(out, /Grok\(grok CLI\)/);
  assert.doesNotMatch(out, /Missing:.*Grok/);   // must NOT be listed missing
});

// ── DeepSeek + GLM key-gated voices (U-OCT-PROBE-GLM-DEEPSEEK 2026-06-22) ────
// The banner must credit DeepSeek (DEEPSEEK_API_KEY) and GLM/Zhipu
// (GLM_API_KEY || ZHIPU_API_KEY) -- the two newest consensus voices --
// matching MultiModelConsensusEngine's includeDeepSeek/includeGLM gates.
// Pre-fix the engine fanned out to 7 while the banner only counted 5.
test("buildBanner: DeepSeek key present -> credited READY, not missing", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: false,
    geminiKeyPresent: true,
    deepseekKeyPresent: true,    // the voice the engine WOULD fan out to
  });
  assert.match(out, /READY \(4\/7 voices\)/);   // Claude+Ollama+Gemini+DeepSeek
  assert.match(out, /DeepSeek\(API key\)/);
  assert.doesNotMatch(out, /Missing:.*DeepSeek/);
});

test("buildBanner: GLM key present -> credited READY, not missing (the named fast-follow)", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: false,
    geminiKeyPresent: true,
    glmKeyPresent: true,         // GLM_API_KEY or ZHIPU_API_KEY set
  });
  assert.match(out, /READY \(4\/7 voices\)/);   // Claude+Ollama+Gemini+GLM
  assert.match(out, /GLM\(GLM_API_KEY\)/);
  assert.doesNotMatch(out, /Missing:.*GLM/);
});

test("buildBanner: no DeepSeek/GLM keys -> both named missing with their env vars", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: false,
    geminiKeyPresent: false,
  });
  assert.match(out, /Missing:.*DeepSeek\(DEEPSEEK_API_KEY\)/);
  assert.match(out, /Missing:.*GLM\(GLM_API_KEY or ZHIPU_API_KEY\)/);
});

test("buildBanner: XAI key wins the label over CLI when both present", () => {
  const out = buildBanner({
    codex: "missing", ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: true, grokCliPresent: true, geminiKeyPresent: false,
  });
  assert.match(out, /Grok\(XAI_API_KEY\)/);
  assert.doesNotMatch(out, /Grok\(grok CLI\)/);
});

test("buildBanner: neither key nor CLI nor proxy -> Grok missing names ALL THREE paths", () => {
  const out = buildBanner({
    codex: "missing", ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: false, grokCliPresent: false, hermesProxyPresent: false, geminiKeyPresent: true,
  });
  assert.match(out, /Missing:.*Grok\(XAI_API_KEY, grok CLI, or hermes proxy\)/);
});

// ── Grok hermes-proxy voice (U-OCT-PROBE-HERMES 2026-06-23, OCTOPUS-HERMES-SYNERGY) ──
// The banner must credit Grok when the FREE local Hermes OAuth proxy (:8645) is up --
// the 3rd Grok transport MultiModelConsensusEngine's includeGrok gate now opens on.
// Pre-fix it checked only key/CLI, undercounting fan-out on a host where the engine
// WOULD fan out to Grok via the proxy (the operator's box: no key, no CLI, proxy up).
test("buildBanner: hermes proxy up (no key/CLI) -> Grok counted READY (the fix; R9 bites old code)", () => {
  const out = buildBanner({
    codex: "missing",
    ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: false, grokCliPresent: false,
    hermesProxyPresent: true,    // the free OAuth transport the consensus engine WOULD use
    geminiKeyPresent: true,
  });
  assert.match(out, /READY \(4\/7 voices\)/);   // was 3/7 before crediting the proxy
  assert.match(out, /Grok\(hermes proxy\)/);
  assert.doesNotMatch(out, /Missing:.*Grok/);   // must NOT be listed missing
});

test("buildBanner: grok CLI wins the label over the hermes proxy when both present", () => {
  const out = buildBanner({
    codex: "missing", ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: false, grokCliPresent: true, hermesProxyPresent: true, geminiKeyPresent: false,
  });
  assert.match(out, /Grok\(grok CLI\)/);
  assert.doesNotMatch(out, /Grok\(hermes proxy\)/);   // CLI has priority (one voice, one label)
});

test("buildBanner: XAI key wins the label over the hermes proxy when both present", () => {
  const out = buildBanner({
    codex: "missing", ollamaUp: true, ollamaModelCount: 8,
    xaiKeyPresent: true, hermesProxyPresent: true, geminiKeyPresent: false,
  });
  assert.match(out, /Grok\(XAI_API_KEY\)/);
  assert.doesNotMatch(out, /Grok\(hermes proxy\)/);
});

// ── grokCliOnPath (mirrors GrokCLIClientEngine.resolveBinOnPath) ─────────────
test("grokCliOnPath: finds 'grok' in a PATH dir (injected existsFn, platform-correct join)", () => {
  // Build PATH + expected path with path.delimiter/path.join so the test is correct
  // on win32 (delimiter ';', join '\\') AND posix (':' , '/') -- mirrors the code.
  const dirs = ["/usr/bin", "/opt/grok/bin"];
  const target = path.join("/opt/grok/bin", "grok");
  const ok = grokCliOnPath({
    env: { PATH: dirs.join(path.delimiter) },
    existsFn: (p) => p === target,
  });
  assert.equal(ok, true);
});

test("grokCliOnPath: absent on every PATH dir -> false", () => {
  const ok = grokCliOnPath({ env: { PATH: ["/usr/bin", "/bin"].join(path.delimiter) }, existsFn: () => false });
  assert.equal(ok, false);
});

test("grokCliOnPath: honors PRISM_GROK_CLI_BIN override", () => {
  const target = path.join("/x", "grok-dev");
  const ok = grokCliOnPath({
    env: { PATH: "/x", PRISM_GROK_CLI_BIN: "grok-dev" },
    existsFn: (p) => p === target,
  });
  assert.equal(ok, true);
});

test("grokCliOnPath: explicit path with separator is checked directly", () => {
  const ok = grokCliOnPath({
    env: { PRISM_GROK_CLI_BIN: "/custom/grok" },
    existsFn: (p) => p === "/custom/grok",
  });
  assert.equal(ok, true);
});

test("grokCliOnPath: empty PATH -> false, never throws", () => {
  assert.equal(grokCliOnPath({ env: {}, existsFn: () => true }), false); // no dirs to walk
});

test("grokCliOnPath: existsFn throwing is swallowed -> false", () => {
  assert.equal(grokCliOnPath({ env: { PATH: "/a" }, existsFn: () => { throw new Error("EACCES"); } }), false);
});

// ── hermesProxyUp (mirrors GrokClientEngine.hermesProxyReachable; fail-closed) ──
// U-OCT-PROBE-HERMES: the banner's 3rd Grok transport. Injected fetchImpl so no real
// :8645 probe fires in the unit test (no-network rule). Only {status:ok,authenticated:true}
// counts; every failure path returns false so a down proxy never inflates the fan-out.
const fakeResp = (ok, body) => ({ ok, json: async () => body });

test("hermesProxyUp: true only on {status:'ok', authenticated:true}", async () => {
  const got = await hermesProxyUp({ url: "http://x/v1", fetchImpl: async () => fakeResp(true, { status: "ok", authenticated: true }) });
  assert.equal(got, true);
});

test("hermesProxyUp: false when up but NOT authenticated", async () => {
  const got = await hermesProxyUp({ url: "http://x/v1", fetchImpl: async () => fakeResp(true, { status: "ok", authenticated: false }) });
  assert.equal(got, false);
});

test("hermesProxyUp: false on non-2xx health (fail-closed)", async () => {
  const got = await hermesProxyUp({ url: "http://x/v1", fetchImpl: async () => fakeResp(false, { status: "down" }) });
  assert.equal(got, false);
});

test("hermesProxyUp: false when fetch rejects (fail-closed)", async () => {
  const got = await hermesProxyUp({ url: "http://x/v1", fetchImpl: async () => { throw new Error("ECONNREFUSED"); } });
  assert.equal(got, false);
});

test("hermesProxyUp: false on malformed JSON body (fail-closed)", async () => {
  const got = await hermesProxyUp({ url: "http://x/v1", fetchImpl: async () => ({ ok: true, json: async () => { throw new Error("not json"); } }) });
  assert.equal(got, false);
});

test("hermesProxyUp: probes the /health ROOT, not under /v1", async () => {
  let captured = "";
  await hermesProxyUp({ url: "http://127.0.0.1:8645/v1", fetchImpl: async (u) => { captured = String(u); return fakeResp(true, { status: "ok", authenticated: true }); } });
  assert.ok(captured.endsWith("/health"));
  assert.ok(!captured.includes("/v1/health"));
});
