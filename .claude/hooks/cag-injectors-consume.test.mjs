// tier: T2
// .claude/hooks/cag-injectors-consume.test.mjs
//
// TOKEN-SAVINGS-PIVOT/U-CAG-INJECTORS-CONSUME (sierra 2026-05-27).
// Hook-level integration tests proving the three doctrine injectors
// (master-index-precheck, memory-relevance, tribal-by-domain) honor a
// COLD-tier CAG-route sidecar by short-circuiting their expensive paths
// AND fall through to the regular inject when the sidecar is missing /
// HOT-tier / stale (fail-OPEN per cag-consume.mjs).
//
// Helper-level coverage is in `.claude/helpers/cag-consume.test.mjs` (26
// tests). This file proves the WIRING is correct end-to-end via subprocess
// invocation:
//   - reads session_id from the right field on the hook's stdin payload
//   - calls shouldSkip with the right consumer key
//   - emits the skipAdvisory envelope on skip
//   - leaves the normal path unchanged when no skip flag
//
// Tribal-by-domain skip-emit is the canonical CAG win (3-4s subprocess +
// Ollama embed avoided per COLD prompt).

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NODE = process.execPath;
const HOOKS_DIR = "H:/prism/.claude/hooks";
const HELPER_DIR = "H:/prism/.claude/helpers";

// Each test run gets a fresh session id so memory-relevance-inject's
// 24h per-(session, file) rate-limiter (`_recentlySeen`) can't carry state
// from a real session OR a prior test run into the assertion below.
import { randomUUID } from "node:crypto";
const SID = randomUUID();

function writeColdSidecar(dir, sessionId) {
  const sidecar = {
    schemaVersion: "1.0.0",
    writtenAt: new Date().toISOString(),
    sessionId,
    promptHash: "deadbeef00000000",
    decision: {
      tier: "COLD",
      confidence: 0.9,
      evidence: ["COLD:claude-md matched [doctrine, claude.md, scrutiny gate]"],
      coldSources: ["H:/prism/CLAUDE.md"],
      hotSources: [],
      scores: { cold: 6, hot: 0, hybrid: 0 },
      truncated: false,
    },
    estimatedSavings: { estimatedTokensSaved: 12000, estimatedLatencyMsSaved: 200, rationale: "COLD ≥0.4" },
    skip: {
      masterIndexInject: true,
      memoryRelevanceInject: true,
      tribalByDomainInject: true,
      wikiPrecheckInject: false,
    },
  };
  writeFileSync(join(dir, `latest-${sessionId}.json`), JSON.stringify(sidecar, null, 2));
}

// Scrub the operator's local disable knobs from the inherited env — these are
// real production overrides (e.g. user has PRISM_MASTER_INDEX_INJECT=0 in their
// shell) that would otherwise short-circuit the hook BEFORE our CAG check runs,
// causing the test to silently pass on the wrong code path. Any test that
// genuinely wants the disable behavior can re-set it via the `env` param.
function makeHookEnv(extra = {}) {
  const base = { ...process.env };
  delete base.PRISM_MASTER_INDEX_INJECT;
  delete base.PRISM_MEMORY_RELEVANCE;
  delete base.PRISM_TRIBAL_DOMAIN_INJECT_DISABLE;
  delete base.PRISM_CAG_CONSUME_DISABLE;
  return { ...base, ...extra };
}

function runHook(hookPath, stdin, env, timeoutMs = 12000) {
  return spawnSync(NODE, [hookPath], {
    input: JSON.stringify(stdin),
    encoding: "utf8",
    env: makeHookEnv(env),
    timeout: timeoutMs,
  });
}

function parseEnvelope(stdout) {
  if (!stdout || !stdout.trim()) return null;
  try { return JSON.parse(stdout); } catch { return null; }
}

describe("U-CAG-INJECTORS-CONSUME — end-to-end wiring", () => {
  let sidecarDir;

  beforeEach(() => { sidecarDir = mkdtempSync(join(tmpdir(), "cag-wire-")); });
  afterEach(() => { try { rmSync(sidecarDir, { recursive: true, force: true }); } catch { /* swallow */ } });

  // ────────────────────────────────────────────────────────────────────────
  // master-index-precheck-inject — UserPromptSubmit
  // ────────────────────────────────────────────────────────────────────────
  describe("master-index-precheck-inject", () => {
    const HOOK = join(HOOKS_DIR, "master-index-precheck-inject.mjs");

    it("COLD-confident sidecar → emits skip advisory, no master-index search", () => {
      writeColdSidecar(sidecarDir, SID);
      const r = runHook(
        HOOK,
        { prompt: "any prompt — sidecar drives the decision, not the text", session_id: SID },
        { PRISM_CAG_CONSUME_SIDECAR_DIR: sidecarDir },
      );
      assert.equal(r.status, 0);
      const env = parseEnvelope(r.stdout);
      assert.ok(env?.hookSpecificOutput?.additionalContext, "expected hookSpecificOutput envelope");
      assert.match(env.hookSpecificOutput.additionalContext, /Master-index precheck skipped/);
      assert.match(env.hookSpecificOutput.additionalContext, /tier=COLD/);
      assert.match(env.hookSpecificOutput.additionalContext, /PRISM_CAG_CONSUME_DISABLE=1/);
      // Critical: the master-index block header must NOT appear (would mean the
      // search ran AND the skip advisory was emitted — wrong: skip should be
      // exclusive). The "Master-index pre-search" header is the regular block.
      assert.ok(
        !/🧭 Master-index pre-search/.test(env.hookSpecificOutput.additionalContext),
        "skip path must not also run the regular search",
      );
    });

    it("no sidecar → falls through to normal master-index path (fail-OPEN)", () => {
      // Use the empty tmpdir → no sidecar file → fail-open.
      const r = runHook(
        HOOK,
        { prompt: "totally unrelated nonsensical xyzqq query that matches nothing", session_id: SID },
        { PRISM_CAG_CONSUME_SIDECAR_DIR: sidecarDir },
      );
      assert.equal(r.status, 0);
      // No skip advisory should be emitted; the regular path either no-ops
      // (no hits) or emits a master-index block — both are valid fail-OPEN.
      const env = parseEnvelope(r.stdout);
      if (env?.hookSpecificOutput?.additionalContext) {
        assert.ok(
          !/Master-index precheck skipped/.test(env.hookSpecificOutput.additionalContext),
          "should not skip when sidecar absent",
        );
      }
    });

    it("PRISM_CAG_CONSUME_DISABLE=1 → no skip even with valid COLD sidecar", () => {
      writeColdSidecar(sidecarDir, SID);
      const r = runHook(
        HOOK,
        { prompt: "what does doctrine say about scrutiny", session_id: SID },
        { PRISM_CAG_CONSUME_SIDECAR_DIR: sidecarDir, PRISM_CAG_CONSUME_DISABLE: "1" },
      );
      assert.equal(r.status, 0);
      const env = parseEnvelope(r.stdout);
      if (env?.hookSpecificOutput?.additionalContext) {
        assert.ok(
          !/Master-index precheck skipped/.test(env.hookSpecificOutput.additionalContext),
          "disable env must override sidecar skip",
        );
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // memory-relevance-inject — PreToolUse
  // ────────────────────────────────────────────────────────────────────────
  describe("memory-relevance-inject", () => {
    const HOOK = join(HOOKS_DIR, "memory-relevance-inject.mjs");

    it("COLD-confident sidecar → emits PreToolUse skip advisory, no memo scan", () => {
      writeColdSidecar(sidecarDir, SID);
      const r = runHook(
        HOOK,
        {
          tool_name: "Edit",
          tool_input: { file_path: "H:/prism/.claude/hooks/cag-router-inject.mjs" },
          session_id: SID,
        },
        { PRISM_CAG_CONSUME_SIDECAR_DIR: sidecarDir },
      );
      assert.equal(r.status, 0);
      const env = parseEnvelope(r.stdout);
      assert.ok(env?.hookSpecificOutput?.additionalContext, "expected envelope");
      assert.match(env.hookSpecificOutput.additionalContext, /Memory recall.*skipped/);
      assert.match(env.hookSpecificOutput.additionalContext, /tier=COLD/);
      // The "Memory recall — feedback that may apply" header is the regular
      // block; it must not appear alongside the skip advisory.
      assert.ok(
        !/feedback that may apply to this edit/.test(env.hookSpecificOutput.additionalContext),
        "skip path must not also run the recall",
      );
    });

    it("non-edit tool → exits early without invoking CAG check", () => {
      writeColdSidecar(sidecarDir, SID);
      const r = runHook(
        HOOK,
        {
          tool_name: "Read",
          tool_input: { file_path: "H:/prism/CLAUDE.md" },
          session_id: SID,
        },
        { PRISM_CAG_CONSUME_SIDECAR_DIR: sidecarDir },
      );
      assert.equal(r.status, 0);
      // Read is not in RELEVANT_TOOLS — the hook exits before reaching the CAG check.
      assert.equal(r.stdout.trim(), "");
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // tribal-by-domain-inject — UserPromptSubmit (canonical CAG win)
  // ────────────────────────────────────────────────────────────────────────
  describe("tribal-by-domain-inject", () => {
    const HOOK = join(HOOKS_DIR, "tribal-by-domain-inject.mjs");

    it("COLD-confident sidecar → emits skip advisory, no rerank subprocess", () => {
      writeColdSidecar(sidecarDir, SID);
      // Force a low subprocess timeout — if the skip DOESN'T fire, the test would
      // hang on the Ollama embed subprocess. Skip path completes in <50ms.
      const r = runHook(
        HOOK,
        { prompt: "any prompt — sidecar drives", session_id: SID },
        { PRISM_CAG_CONSUME_SIDECAR_DIR: sidecarDir, PRISM_TRIBAL_DOMAIN_INJECT_TIMEOUT_MS: "500" },
        3000,
      );
      assert.equal(r.status, 0);
      const env = parseEnvelope(r.stdout);
      assert.ok(env?.hookSpecificOutput?.additionalContext, "expected envelope");
      assert.match(env.hookSpecificOutput.additionalContext, /Tribal-by-domain precontext skipped/);
      assert.match(env.hookSpecificOutput.additionalContext, /tier=COLD/);
    });

    it("disabled-via-env → exits 0 immediately, no envelope output", () => {
      const r = runHook(
        HOOK,
        { prompt: "any prompt", session_id: SID },
        { PRISM_TRIBAL_DOMAIN_INJECT_DISABLE: "1" },
      );
      assert.equal(r.status, 0);
      // approve() with no body emits `{"continue":true}` — that's fine.
      // What matters: no skip-advisory leaked when the disable env wins.
      const env = parseEnvelope(r.stdout);
      if (env?.hookSpecificOutput?.additionalContext) {
        assert.ok(
          !/Tribal-by-domain.*skipped/.test(env.hookSpecificOutput.additionalContext),
          "disable env wins; no CAG advisory should fire",
        );
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Consume-helper import smoke test — every consumer can resolve the helper.
  // Catches a future filename rename / path-relative-to-hook bug before it
  // ships silently as fail-OPEN-on-everything.
  // ────────────────────────────────────────────────────────────────────────
  it("cag-consume helper imports cleanly from .claude/helpers/", async () => {
    const mod = await import(`file:///${join(HELPER_DIR, "cag-consume.mjs").replace(/\\/g, "/")}`);
    assert.equal(typeof mod.shouldSkip, "function");
    assert.equal(typeof mod.skipAdvisory, "function");
    assert.equal(typeof mod.parseSidecar, "function");
    assert.equal(typeof mod.decide, "function");
    assert.ok(Array.isArray(mod.SKIP_KEYS));
    assert.equal(mod.SKIP_KEYS.length, 4);
  });
});
