#!/usr/bin/env node
/**
 * Tests for the SLOT-COMPACT-SYNERGY-MS0 Wave 3 rate-gate added to
 * audit-viz-first-inject.mjs.
 *
 * Two layers:
 *   - Pure-function tests for shouldFire / extractNoun / detectAuditIntent.
 *   - Subprocess oracle: spawn the real hook with stdin, assert the
 *     UserPromptSubmit additionalContext is OR is not emitted per the gate.
 *
 * Per the standing PRISM lesson: a pure-core + injected-deps design MUST ship
 * a real subprocess integration oracle (the STRICT_FILTER env knob, the noun
 * source plumbing, and the silent-return path all live in main() — pure tests
 * alone cannot prove them).
 *
 * Run: node --test .claude/hooks/__tests__/audit-viz-first-rate-gate.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  detectAuditIntent,
  extractNoun,
  shouldFire,
  STRONG_AUDIT_KEYWORDS,
  WEAK_AUDIT_KEYWORDS,
  MIN_NOUN_LEN,
  buildBody,
} from "../audit-viz-first-inject.mjs";

const HOOK = path.resolve(import.meta.dirname, "..", "audit-viz-first-inject.mjs");
const PRISM_ROOT = path.resolve(import.meta.dirname, "..", "..", "..").replace(/\\/g, "/");

/** Fire the hook with a synthetic stdin; return {status, ctx, stderr}. */
function fire(prompt, extraEnv = {}) {
  const stdin = JSON.stringify({ prompt, session_id: "audit-viz-test", cwd: PRISM_ROOT });
  const r = spawnSync(process.execPath, [HOOK], {
    input: stdin,
    encoding: "utf8",
    cwd: PRISM_ROOT,
    timeout: 15000,
    env: { ...process.env, PRISM_ROOT, ...extraEnv },
  });
  if (r.status !== 0) {
    return { status: r.status, ctx: null, stderr: r.stderr || "" };
  }
  let ctx = null;
  if (r.stdout && r.stdout.trim()) {
    try {
      const json = JSON.parse(r.stdout);
      ctx = json?.hookSpecificOutput?.additionalContext ?? null;
    } catch {
      return { status: 0, ctx: null, stderr: `non-JSON stdout: ${r.stdout.slice(0, 200)}` };
    }
  }
  return { status: 0, ctx, stderr: r.stderr || "" };
}

describe("audit-viz-first-rate-gate — pure shouldFire", () => {
  it("returns false when matched is null", () => {
    assert.equal(shouldFire(null, { noun: "x", source: "camel" }), false);
  });

  it("returns false when nounResult is null", () => {
    assert.equal(shouldFire("audit", null), false);
  });

  it("returns false when noun is null", () => {
    assert.equal(shouldFire("audit", { noun: null, source: null }), false);
  });

  it("returns false when noun is shorter than MIN_NOUN_LEN", () => {
    const shortNoun = "ab"; // length 2 < MIN_NOUN_LEN (3)
    assert.ok(shortNoun.length < MIN_NOUN_LEN, "fixture invariant");
    assert.equal(shouldFire("audit", { noun: shortNoun, source: "camel" }), false);
  });

  it("STRONG keyword fires on any source (camel)", () => {
    for (const kw of STRONG_AUDIT_KEYWORDS) {
      assert.equal(shouldFire(kw, { noun: "WidgetEngine", source: "camel" }), true, `strong kw=${kw}`);
    }
  });

  it("STRONG keyword fires even on fallback noun", () => {
    assert.equal(shouldFire("audit", { noun: "widgets", source: "fallback" }), true);
  });

  it("WEAK keyword fires on quoted source", () => {
    for (const kw of WEAK_AUDIT_KEYWORDS) {
      assert.equal(shouldFire(kw, { noun: "MyThing", source: "quoted" }), true, `weak kw=${kw}`);
    }
  });

  it("WEAK keyword fires on camel source", () => {
    assert.equal(shouldFire("find all", { noun: "KienzleForceModelEngine", source: "camel" }), true);
  });

  it("WEAK keyword fires on kebab source", () => {
    assert.equal(shouldFire("how many", { noun: "system-viz-query", source: "kebab" }), true);
  });

  it("WEAK keyword does NOT fire on fallback source (the rate-gate)", () => {
    for (const kw of WEAK_AUDIT_KEYWORDS) {
      assert.equal(shouldFire(kw, { noun: "widgets", source: "fallback" }), false, `weak kw=${kw} should be gated`);
    }
  });

  it("strictFilter=false restores legacy behavior — all matches fire", () => {
    for (const kw of WEAK_AUDIT_KEYWORDS) {
      assert.equal(shouldFire(kw, { noun: "widgets", source: "fallback" }, false), true);
    }
  });

  it("unknown bucket (future keyword) falls back to legacy fire", () => {
    // A keyword neither in STRONG nor in WEAK — treated as legacy (fires).
    assert.equal(shouldFire("future-keyword", { noun: "thing", source: "fallback" }, true), true);
  });
});

describe("audit-viz-first-rate-gate — extractNoun source classification", () => {
  it("classifies quoted as 'quoted'", () => {
    const r = extractNoun("audit 'my-thing' please", "audit");
    assert.equal(r.source, "quoted");
    assert.equal(r.noun, "my-thing");
  });

  it("classifies CamelCase as 'camel'", () => {
    const r = extractNoun("audit KienzleForceModelEngine", "audit");
    assert.equal(r.source, "camel");
    assert.equal(r.noun, "KienzleForceModelEngine");
  });

  it("classifies kebab-≥2-segs as 'kebab'", () => {
    const r = extractNoun("how many system-viz-query hooks", "how many");
    assert.equal(r.source, "kebab");
    assert.equal(r.noun, "system-viz-query");
  });

  it("classifies bare lowercase token as 'fallback'", () => {
    const r = extractNoun("find all widgets", "find all");
    assert.equal(r.source, "fallback");
    assert.equal(r.noun, "widgets");
  });

  it("returns null when no noun present", () => {
    const r = extractNoun("audit", "audit");
    assert.equal(r.noun, null);
    assert.equal(r.source, null);
  });

  it("returns null when prompt or matchedKw is missing", () => {
    assert.deepEqual(extractNoun(null, "audit"), { noun: null, source: null });
    assert.deepEqual(extractNoun("audit foo", null), { noun: null, source: null });
  });
});

describe("audit-viz-first-rate-gate — detectAuditIntent", () => {
  it("matches multi-word phrase before single word (longest-prefix)", () => {
    // "gap analysis" comes before "gap" — current list doesn't have bare "gap",
    // so the multi-word form is what fires.
    assert.equal(detectAuditIntent("can you do a gap analysis"), "gap analysis");
  });

  it("returns null on non-audit prompt", () => {
    assert.equal(detectAuditIntent("hello there friend"), null);
  });

  it("returns null on null/empty", () => {
    assert.equal(detectAuditIntent(null), null);
    assert.equal(detectAuditIntent(""), null);
  });
});

describe("audit-viz-first-rate-gate — STRONG/WEAK bucket invariants", () => {
  it("STRONG and WEAK are disjoint", () => {
    for (const kw of STRONG_AUDIT_KEYWORDS) {
      assert.equal(WEAK_AUDIT_KEYWORDS.has(kw), false, `kw "${kw}" must not be in both buckets`);
    }
  });

  it("each keyword in the detection list belongs to exactly one bucket", () => {
    // Pulled directly from the hook's AUDIT_KEYWORDS array (frozen here as a
    // regression guard — adding a keyword to the hook without classifying it
    // will fail this test).
    const expected = [
      "are there any", "gap analysis", "find all", "where is", "check for",
      "how many", "list all", "what exists",
      "audit", "inventory", "orphan", "duplicate", "unwired",
      "missing", "survey", "reconcile", "enumerate",
    ];
    for (const kw of expected) {
      const inStrong = STRONG_AUDIT_KEYWORDS.has(kw);
      const inWeak = WEAK_AUDIT_KEYWORDS.has(kw);
      assert.ok(inStrong || inWeak, `kw "${kw}" must be classified (strong or weak)`);
      assert.ok(!(inStrong && inWeak), `kw "${kw}" must not be in both`);
    }
  });
});

describe("audit-viz-first-rate-gate — subprocess oracle", () => {
  it("silent (no ctx) on a weak keyword + fallback noun by default", () => {
    // "find all widgets" — weak kw, fallback noun → rate-gate skips
    const r = fire("find all widgets in the system", {
      // Disable the actual viz subprocess so test does not depend on it
      // — the hook returns silently when shouldFire is false BEFORE
      // running the viz subprocess, so this should be silent regardless.
    });
    assert.equal(r.status, 0);
    assert.equal(r.ctx, null, "weak kw + fallback noun must NOT fire");
  });

  it("strictFilter=0 restores legacy fire path", () => {
    // Same prompt as above, but strictFilter disabled. The hook then proceeds
    // to call the viz subprocess; that may or may not return hits. So we
    // assert ONLY that the gate no longer blocks (status 0 still); if hits
    // exist, ctx is non-null; if not, the silent-no-match path also returns
    // ctx=null but that is the viz-subprocess silent path, not the gate.
    // The proof that the gate is not blocking lives in the pure tests above.
    const r = fire("find all widgets in the system", {
      PRISM_AUDIT_VIZ_FIRST_STRICT_FILTER: "0",
    });
    assert.equal(r.status, 0);
  });

  it("silent when DISABLE=1", () => {
    const r = fire("audit MyEngine please", { PRISM_AUDIT_VIZ_FIRST_DISABLE: "1" });
    assert.equal(r.status, 0);
    assert.equal(r.ctx, null);
  });

  it("silent on non-audit prompt", () => {
    const r = fire("hello there friend, how are you");
    assert.equal(r.status, 0);
    assert.equal(r.ctx, null);
  });

  it("silent on empty prompt", () => {
    const r = fire("");
    assert.equal(r.status, 0);
    assert.equal(r.ctx, null);
  });

  it("first-match-wins: weak kw before strong kw → gate evaluates weak", () => {
    // "find all audit log entries" — detectAuditIntent iterates AUDIT_KEYWORDS
    // in order and returns the FIRST hit. "find all" appears before "audit"
    // in the list. With strict filter on AND fallback noun ("log") → silent.
    // This pins the first-match-wins behavior so future maintainers cannot
    // silently assume "any STRONG keyword anywhere in the prompt fires".
    const matched = detectAuditIntent("find all audit log entries");
    assert.equal(matched, "find all");
    const nounResult = extractNoun("find all audit log entries", matched);
    // "audit" is in STOPWORDS (pre-existing — not changed by Wave 3) so the
    // fallback token-scan skips it; next non-stopword ≥4 chars is "entries".
    assert.equal(nounResult.source, "fallback");
    assert.equal(shouldFire(matched, nounResult, true), false);
  });

  it("defensive: shouldFire returns false on non-string noun (typeof guard)", () => {
    // extractNoun only ever returns strings, but an external caller passing
    // a number/object should not crash the predicate.
    assert.equal(shouldFire("audit", { noun: 42, source: "camel" }), false);
    assert.equal(shouldFire("audit", { noun: { x: 1 }, source: "camel" }), false);
  });

  it("silent when stdin is not JSON (graceful)", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: "not json at all",
      encoding: "utf8",
      cwd: PRISM_ROOT,
      timeout: 15000,
      env: { ...process.env, PRISM_ROOT },
    });
    assert.equal(r.status, 0);
    assert.equal((r.stdout || "").trim(), "");
  });
});

describe("audit-viz-first — synergy-ask routing (orientation reflex -> combiner)", () => {
  // Orientation (WEAK) intents want a GROUNDED answer, so buildBody must surface the
  // synergy-ask combiner pointer. Audit (STRONG) intents want the raw node list only,
  // so the pointer must be ABSENT. This pins the routing so a future maintainer cannot
  // silently drop the synergy-ask link (utilization regression) or leak it onto pure
  // audit prompts (noise). Fails if either direction breaks.
  const HITS = "Found 2 node(s):\n  L10/built  eng.x  X";

  it("WEAK orientation intents surface the synergy-ask pointer", () => {
    for (const kw of WEAK_AUDIT_KEYWORDS) {
      const body = buildBody(kw, "system-viz", HITS);
      assert.match(body, /synergy-ask\.mjs/, `weak kw "${kw}" must route to synergy-ask`);
      assert.match(body, /graph \+ vault \+ Ollama/, `weak kw "${kw}" must name all three substrates`);
      // the noun is threaded into the suggested command
      assert.match(body, /synergy-ask\.mjs "system-viz"/, `weak kw "${kw}" must thread the noun`);
    }
  });

  it("STRONG audit intents do NOT surface the synergy-ask pointer", () => {
    for (const kw of STRONG_AUDIT_KEYWORDS) {
      const body = buildBody(kw, "OrphanEngine", HITS);
      assert.doesNotMatch(body, /synergy-ask/, `strong kw "${kw}" must NOT nudge synergy-ask (wants the node list)`);
    }
  });

  it("the node list + Knobs survive in BOTH branches (additive, not replacing)", () => {
    const weak = buildBody("where is", "FooEngine", HITS);
    const strong = buildBody("audit", "FooEngine", HITS);
    for (const body of [weak, strong]) {
      assert.match(body, /Found 2 node\(s\)/, "node-list hits preserved");
      assert.match(body, /PRISM_AUDIT_VIZ_FIRST_DISABLE=1/, "knobs footer preserved");
      assert.match(body, /prefer system-viz-query over fs scans/, "doctrine line preserved");
    }
  });

  it("the inserted pointer is pure ASCII (ascii-guard / multi-consumer safe)", () => {
    const body = buildBody("how many", "system-viz", HITS);
    const pointerLine = body.split("\n").find((l) => l.includes("synergy-ask.mjs"));
    assert.ok(pointerLine, "pointer line present");
    assert.doesNotMatch(pointerLine, /[^\x00-\x7F]/, "pointer line must be ASCII-only");
  });
});
