// .claude/hooks/cag-router-inject.test.mjs
//
// TOKEN-SAVINGS-PIVOT/U-CAG-HOOK-INJECT (sierra iter28 2026-05-26):
// Hook-level integration tests for cag-router-inject.mjs. Spawns the
// hook as a real subprocess with JSON on stdin and verifies the stdout
// envelope + sidecar files. Hermetic — uses an isolated tmpdir for the
// sidecar directory via PRISM_CAG_ROUTER_SIDECAR_DIR so concurrent test
// runs and production state never collide.
//
// Per CLAUDE.md per-file scrutiny + the comprehensive-build-enforce
// floor: this exercises happy path + 3 failure modes (no input, bad
// json, disabled-via-env) + verbose-mode + sidecar-shape + cold/hot/hybrid
// + KNOWN-GOOD evidence + truncation.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOOK_PATH = "H:/prism/.claude/hooks/cag-router-inject.mjs";
const NODE = process.execPath;

// Default subprocess timeout is generous because Windows + node-cold-start
// + concurrent harness telemetry can push a single spawn past 5s under load.
// Each individual test can pass its own timeoutMs override.
function runHook({ stdin, env = {}, timeoutMs = 15000 }) {
  const r = spawnSync(NODE, [HOOK_PATH], {
    input: typeof stdin === "string" ? stdin : JSON.stringify(stdin),
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: timeoutMs,
  });
  return {
    status: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

function parseEnvelope(stdout) {
  if (!stdout.trim()) return null;
  return JSON.parse(stdout);
}

describe("cag-router-inject hook", () => {
  let sidecarDir;

  beforeEach(() => {
    sidecarDir = mkdtempSync(join(tmpdir(), "cag-route-test-"));
  });

  afterEach(() => {
    try { rmSync(sidecarDir, { recursive: true, force: true }); } catch { /* swallow */ }
  });

  it("classifies a pure-cold doctrine query and emits cold-tier sidecar", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: "what does CLAUDE.md say about the scrutiny gate doctrine?", session_id: "test-cold-1" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    const env = parseEnvelope(stdout);
    assert.ok(env?.hookSpecificOutput?.additionalContext?.includes("CAG-route"));
    // Sidecar written
    const files = readdirSync(sidecarDir);
    assert.ok(files.some((f) => f.startsWith("route-test-cold-1-")));
    assert.ok(files.includes("latest-test-cold-1.json"));
    const sc = JSON.parse(readFileSync(join(sidecarDir, "latest-test-cold-1.json"), "utf8"));
    // Doctrine keywords trigger COLD or HYBRID — both are acceptable;
    // assert specifically that the cold-tier sources were detected.
    assert.ok(["COLD", "HYBRID"].includes(sc.decision.tier));
    assert.ok(sc.decision.coldSources.length > 0);
    assert.equal(sc.schemaVersion, "1.0.0");
  });

  it("classifies a pure-hot live-state query and skips=false for cold-skip flags", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: "what is the current chat-slots state right now? who claims sierra?", session_id: "test-hot-1" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    const env = parseEnvelope(stdout);
    assert.ok(env?.hookSpecificOutput?.additionalContext);
    const sc = JSON.parse(readFileSync(join(sidecarDir, "latest-test-hot-1.json"), "utf8"));
    // HOT tier expected — temporal + surface markers both fire
    assert.equal(sc.decision.tier, "HOT");
    // No skip-flags should be set for cold injectors when tier is HOT
    assert.equal(sc.skip.masterIndexInject, false);
    assert.equal(sc.skip.memoryRelevanceInject, false);
    assert.equal(sc.skip.tribalByDomainInject, false);
  });

  it("classifies a hybrid-marker query as HYBRID even with cold-leaning keywords", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: "audit of the scrutiny gate as applied to recent commits", session_id: "test-hyb-1" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    void parseEnvelope(stdout);
    const sc = JSON.parse(readFileSync(join(sidecarDir, "latest-test-hyb-1.json"), "utf8"));
    assert.equal(sc.decision.tier, "HYBRID");
    // Hybrid-marker evidence should be present
    assert.ok(sc.decision.evidence.some((e) => e.startsWith("HYBRID-FORCE")));
  });

  it("emits estimated savings line ONLY when cold-tier ≥0.4 confidence or hybrid ≥0.5", () => {
    // Stack multiple cold keywords to push confidence high
    const { status, stdout } = runHook({
      stdin: { prompt: "scrutiny gate per-file scrutiny scrutiny three-of-three handoff naming claude.md doctrine", session_id: "test-savings" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    const env = parseEnvelope(stdout);
    // Should mention token savings when the hit qualifies
    const ctx = env?.hookSpecificOutput?.additionalContext || "";
    // Either savings present OR low-confidence; assert one of the two
    const sc = JSON.parse(readFileSync(join(sidecarDir, "latest-test-savings.json"), "utf8"));
    if (sc.estimatedSavings.estimatedTokensSaved > 0) {
      assert.ok(/Est\. savings/.test(ctx), "expected savings line when estimatedTokensSaved>0");
    } else {
      assert.ok(!/Est\. savings/.test(ctx), "should not emit savings line when 0");
    }
  });

  it("verbose mode surfaces evidence list", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: "claude.md doctrine", session_id: "test-verbose" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir, PRISM_CAG_ROUTER_INJECT_VERBOSE: "1" },
    });
    assert.equal(status, 0);
    const env = parseEnvelope(stdout);
    assert.match(env?.hookSpecificOutput?.additionalContext || "", /Evidence:/);
  });

  it("disable env var short-circuits to exit 0 with empty stdout", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: "any query at all", session_id: "test-disable" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir, PRISM_CAG_ROUTER_INJECT_DISABLE: "1" },
    });
    assert.equal(status, 0);
    assert.equal(stdout.trim(), "");
    // Sidecar dir untouched (no files written when disabled)
    assert.equal(readdirSync(sidecarDir).length, 0);
  });

  it("empty prompt short-circuits to exit 0 with no sidecar", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: "", session_id: "test-empty" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    assert.equal(stdout.trim(), "");
    assert.equal(readdirSync(sidecarDir).length, 0);
  });

  it("malformed json on stdin → exit 0, no sidecar, no crash", () => {
    const { status, stdout } = runHook({
      stdin: "this is not json {{{",
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    assert.equal(stdout.trim(), "");
    assert.equal(readdirSync(sidecarDir).length, 0);
  });

  it("oversize prompt (>64KB) is truncated; sidecar carries truncated=true", () => {
    const huge = "doctrine ".repeat(20000); // ~180KB
    const { status } = runHook({
      stdin: { prompt: huge, session_id: "test-truncate" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
      timeoutMs: 8000,
    });
    assert.equal(status, 0);
    const sc = JSON.parse(readFileSync(join(sidecarDir, "latest-test-truncate.json"), "utf8"));
    assert.equal(sc.decision.truncated, true);
  });

  it("session-id missing from stdin → uses 'unknown-session' marker", () => {
    const { status } = runHook({
      stdin: { prompt: "claude.md doctrine" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    assert.ok(existsSync(join(sidecarDir, "latest-unknown-session.json")));
  });

  it("sidecar prompt-hash differs for different prompts in same session", () => {
    runHook({
      stdin: { prompt: "claude.md doctrine", session_id: "test-hash" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    runHook({
      stdin: { prompt: "what is current chat-slots state", session_id: "test-hash" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    const files = readdirSync(sidecarDir).filter((f) => f.startsWith("route-test-hash-"));
    assert.equal(files.length, 2);
    const hashes = files.map((f) => f.match(/route-test-hash-([^.]+)\.json/)?.[1]);
    assert.notEqual(hashes[0], hashes[1]);
  });

  it("emit envelope shape matches Claude Code hookSpecificOutput contract", () => {
    const { stdout } = runHook({
      stdin: { prompt: "claude.md doctrine", session_id: "test-shape" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    const env = parseEnvelope(stdout);
    assert.equal(typeof env, "object");
    assert.equal(env.hookSpecificOutput.hookEventName, "UserPromptSubmit");
    assert.equal(typeof env.hookSpecificOutput.additionalContext, "string");
    // Should NOT carry any other top-level keys (e.g. `permissionDecision`) —
    // those would change the operator-prompt's permission semantics and
    // this is an advisory injector only.
    assert.deepEqual(Object.keys(env), ["hookSpecificOutput"]);
  });

  it("sidecar carries the four boolean skip-flags with the right type", () => {
    const { status } = runHook({
      stdin: { prompt: "claude.md doctrine scrutiny gate", session_id: "test-skip-shape" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    const sc = JSON.parse(readFileSync(join(sidecarDir, "latest-test-skip-shape.json"), "utf8"));
    assert.equal(typeof sc.skip.masterIndexInject, "boolean");
    assert.equal(typeof sc.skip.memoryRelevanceInject, "boolean");
    assert.equal(typeof sc.skip.tribalByDomainInject, "boolean");
    assert.equal(typeof sc.skip.wikiPrecheckInject, "boolean");
    // wikiPrecheckInject is always false (too cheap to skip per hook source)
    assert.equal(sc.skip.wikiPrecheckInject, false);
  });

  // ── U-CAG-NOSIGNAL-SUPPRESS (2026-06-10 slot:bravo) ──────────────────────
  // The no-signal route (HYBRID conf 0% / no sources) is the MOST COMMON
  // classification fleet-wide. The visible block carries no operator value, so
  // it is suppressed -- but the sidecar (the real product consumers read) is
  // STILL written. "describe quantum entanglement briefly" matches zero cold/
  // hot/hybrid keywords -> the deterministic no-signal route.
  const NO_SIGNAL_PROMPT = "describe quantum entanglement briefly";

  it("no-signal route suppresses the VISIBLE block but STILL writes the sidecar", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: NO_SIGNAL_PROMPT, session_id: "test-nosignal" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    // VISIBLE emit suppressed -- no context burned on a no-opinion classify.
    assert.equal(stdout.trim(), "", "no-signal route emits no visible block");
    // BUT the sidecar IS persisted -- the consume path is byte-identical.
    const latest = join(sidecarDir, "latest-test-nosignal.json");
    assert.ok(existsSync(latest), "sidecar still written when block suppressed");
    const sc = JSON.parse(readFileSync(latest, "utf8"));
    assert.equal(sc.decision.tier, "HYBRID");
    assert.equal(sc.decision.confidence, 0);
    assert.equal(sc.decision.coldSources.length, 0);
    assert.equal(sc.decision.hotSources.length, 0);
    assert.equal(sc.estimatedSavings.estimatedTokensSaved, 0);
  });

  it("verbose mode OVERRIDES no-signal suppression (operator opted into the full surface)", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: NO_SIGNAL_PROMPT, session_id: "test-nosignal-verbose" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir, PRISM_CAG_ROUTER_INJECT_VERBOSE: "1" },
    });
    assert.equal(status, 0);
    const env = parseEnvelope(stdout);
    assert.ok(env?.hookSpecificOutput?.additionalContext?.includes("CAG-route"),
      "verbose still emits the block on a no-signal route");
  });

  it("PRISM_CAG_ROUTER_MIN_CONF=0 restores legacy always-emit on the no-signal route", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: NO_SIGNAL_PROMPT, session_id: "test-nosignal-legacy" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir, PRISM_CAG_ROUTER_MIN_CONF: "0" },
    });
    assert.equal(status, 0);
    const env = parseEnvelope(stdout);
    assert.ok(env?.hookSpecificOutput?.additionalContext?.includes("(no sources)"),
      "minConf=0 restores the legacy no-source block");
  });

  it("a route WITH sources is never suppressed (HOT live-state query still emits)", () => {
    const { status, stdout } = runHook({
      stdin: { prompt: "what is the current chat-slots state right now?", session_id: "test-hassrc" },
      env: { PRISM_CAG_ROUTER_SIDECAR_DIR: sidecarDir },
    });
    assert.equal(status, 0);
    const env = parseEnvelope(stdout);
    assert.ok(env?.hookSpecificOutput?.additionalContext?.includes("CAG-route"),
      "a route that names sources is always surfaced");
    const sc = JSON.parse(readFileSync(join(sidecarDir, "latest-test-hassrc.json"), "utf8"));
    assert.ok(sc.decision.hotSources.length > 0, "HOT route carries sources -> not suppressed");
  });
});
