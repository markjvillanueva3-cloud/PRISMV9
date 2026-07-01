// .claude/helpers/cag-consume.test.mjs
//
// TOKEN-SAVINGS-PIVOT/U-CAG-INJECTORS-CONSUME (sierra 2026-05-27).
// Unit tests for the CAG-route sidecar consumer helper. Pure-core (parseSidecar
// + decide) + IO layer (shouldSkip with a tmpdir sidecar).
//
// Coverage:
//   parseSidecar  — happy path + 8 reject modes
//   decide        — fail-open on every safety rail (no sidecar / bad key /
//                   bad timestamp / stale / flag-false) + happy COLD path
//   shouldSkip    — disable env / no session / missing file / stale file /
//                   tier=HOT (no skip) / tier=COLD-confident (skip)
//   skipAdvisory  — message shape + null-decision fallback

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseSidecar,
  decide,
  shouldSkip,
  skipAdvisory,
  SKIP_KEYS,
  EXPECTED_SCHEMA,
  DEFAULT_STALE_MS,
} from "./cag-consume.mjs";

const FRESH_NOW = Date.parse("2026-05-27T12:00:00.000Z");
const FRESH_WRITTEN = "2026-05-27T11:59:59.000Z"; // 1s before now

function validSidecar(overrides = {}) {
  return JSON.stringify({
    schemaVersion: EXPECTED_SCHEMA,
    writtenAt: FRESH_WRITTEN,
    sessionId: "test-session",
    promptHash: "abc123",
    decision: { tier: "COLD", confidence: 0.85, evidence: ["x"], coldSources: ["a"], hotSources: [], scores: {}, truncated: false },
    estimatedSavings: { estimatedTokensSaved: 12000, estimatedLatencyMsSaved: 200, rationale: "" },
    skip: {
      masterIndexInject: true,
      memoryRelevanceInject: true,
      tribalByDomainInject: true,
      wikiPrecheckInject: false,
    },
    ...overrides,
  });
}

describe("SKIP_KEYS", () => {
  it("exposes the four CAG-router-inject consumer names exactly", () => {
    assert.deepEqual(
      [...SKIP_KEYS].sort(),
      ["masterIndexInject", "memoryRelevanceInject", "tribalByDomainInject", "wikiPrecheckInject"].sort(),
    );
  });
});

describe("parseSidecar — pure-core", () => {
  it("accepts a well-formed v1.0.0 sidecar", () => {
    const sc = parseSidecar(validSidecar());
    assert.equal(sc.schemaVersion, EXPECTED_SCHEMA);
    assert.equal(sc.skip.masterIndexInject, true);
    assert.equal(sc.decision.tier, "COLD");
  });

  it("rejects null / non-string input", () => {
    assert.equal(parseSidecar(null), null);
    assert.equal(parseSidecar(undefined), null);
    assert.equal(parseSidecar(42), null);
    assert.equal(parseSidecar(""), null);
  });

  it("rejects malformed JSON", () => {
    assert.equal(parseSidecar("not json {"), null);
  });

  it("rejects JSON that isn't an object (array / scalar)", () => {
    assert.equal(parseSidecar("[]"), null);
    assert.equal(parseSidecar("42"), null);
    assert.equal(parseSidecar("\"hi\""), null);
    // JSON.parse("null") === null; non-object → rejected.
    assert.equal(parseSidecar("null"), null);
  });

  it("rejects on schemaVersion mismatch (forward-compat — old consumers refuse to interpret new producer)", () => {
    assert.equal(parseSidecar(validSidecar({ schemaVersion: "2.0.0" })), null);
    assert.equal(parseSidecar(validSidecar({ schemaVersion: undefined })), null);
  });

  it("rejects on missing writtenAt", () => {
    assert.equal(parseSidecar(validSidecar({ writtenAt: undefined })), null);
    assert.equal(parseSidecar(validSidecar({ writtenAt: 12345 })), null);
  });

  it("rejects on missing skip block", () => {
    assert.equal(parseSidecar(validSidecar({ skip: undefined })), null);
    assert.equal(parseSidecar(validSidecar({ skip: null })), null);
  });

  it("rejects on missing decision block", () => {
    assert.equal(parseSidecar(validSidecar({ decision: undefined })), null);
  });
});

describe("decide — pure-core", () => {
  it("returns skip=false when sidecar is null", () => {
    const r = decide(null, "masterIndexInject", { now: FRESH_NOW });
    assert.equal(r.skip, false);
    assert.equal(r.reason, "no-sidecar");
  });

  it("returns skip=false on unknown skip key", () => {
    const sc = parseSidecar(validSidecar());
    const r = decide(sc, "notARealKey", { now: FRESH_NOW });
    assert.equal(r.skip, false);
    assert.equal(r.reason, "bad-key");
  });

  it("returns skip=false on stale sidecar (>staleMs)", () => {
    const sc = parseSidecar(validSidecar({ writtenAt: "2026-05-27T11:59:00.000Z" })); // 60s old
    const r = decide(sc, "masterIndexInject", { now: FRESH_NOW, staleMs: 30_000 });
    assert.equal(r.skip, false);
    assert.equal(r.reason, "stale-sidecar");
  });

  it("returns skip=false when the flag is explicitly false (HOT tier)", () => {
    const sc = parseSidecar(validSidecar({
      decision: { tier: "HOT", confidence: 0.7, evidence: [], coldSources: [], hotSources: ["x"], scores: {}, truncated: false },
      skip: { masterIndexInject: false, memoryRelevanceInject: false, tribalByDomainInject: false, wikiPrecheckInject: false },
    }));
    const r = decide(sc, "masterIndexInject", { now: FRESH_NOW });
    assert.equal(r.skip, false);
    assert.equal(r.reason, "flag-false");
  });

  it("returns skip=true with tier+confidence when COLD confident", () => {
    const sc = parseSidecar(validSidecar());
    const r = decide(sc, "tribalByDomainInject", { now: FRESH_NOW });
    assert.equal(r.skip, true);
    assert.equal(r.reason, "cag-cold");
    assert.equal(r.tier, "COLD");
    assert.equal(r.confidence, 0.85);
  });

  it("respects DEFAULT_STALE_MS at the 30s boundary", () => {
    const sc = parseSidecar(validSidecar({ writtenAt: new Date(FRESH_NOW - DEFAULT_STALE_MS + 5).toISOString() })); // 29.995s old
    const justFresh = decide(sc, "masterIndexInject", { now: FRESH_NOW });
    assert.equal(justFresh.skip, true);
    const sc2 = parseSidecar(validSidecar({ writtenAt: new Date(FRESH_NOW - DEFAULT_STALE_MS - 5).toISOString() })); // 30.005s old
    const justStale = decide(sc2, "masterIndexInject", { now: FRESH_NOW });
    assert.equal(justStale.skip, false);
    assert.equal(justStale.reason, "stale-sidecar");
  });

  it("returns skip=false on un-parseable writtenAt", () => {
    // parseSidecar gates on typeof string only — a non-ISO string survives parse
    // and surfaces here at decide() as bad-timestamp.
    const sc = parseSidecar(validSidecar({ writtenAt: "not-a-date-at-all" }));
    const r = decide(sc, "masterIndexInject", { now: FRESH_NOW });
    assert.equal(r.skip, false);
    assert.equal(r.reason, "bad-timestamp");
  });
});

describe("shouldSkip — IO", () => {
  let dir;
  const SID = "abcd1234-aaaa-bbbb-cccc-deadbeefcafe";

  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cag-consume-")); });
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* swallow */ } });

  it("disable env var → skip=false", () => {
    const prev = process.env.PRISM_CAG_CONSUME_DISABLE;
    process.env.PRISM_CAG_CONSUME_DISABLE = "1";
    try {
      const r = shouldSkip("masterIndexInject", { sessionId: SID, sidecarDir: dir });
      assert.equal(r.skip, false);
      assert.equal(r.reason, "disabled");
    } finally {
      if (prev === undefined) delete process.env.PRISM_CAG_CONSUME_DISABLE;
      else process.env.PRISM_CAG_CONSUME_DISABLE = prev;
    }
  });

  it("missing session id → skip=false", () => {
    assert.equal(shouldSkip("masterIndexInject", { sidecarDir: dir }).skip, false);
    assert.equal(shouldSkip("masterIndexInject", { sessionId: "", sidecarDir: dir }).skip, false);
  });

  it("missing sidecar file → skip=false", () => {
    const r = shouldSkip("masterIndexInject", { sessionId: SID, sidecarDir: dir });
    assert.equal(r.skip, false);
    assert.equal(r.reason, "no-sidecar");
  });

  it("HOT-tier sidecar → skip=false", () => {
    writeFileSync(
      join(dir, `latest-${SID}.json`),
      validSidecar({
        writtenAt: new Date().toISOString(),
        decision: { tier: "HOT", confidence: 0.6, evidence: [], coldSources: [], hotSources: ["a"], scores: {}, truncated: false },
        skip: { masterIndexInject: false, memoryRelevanceInject: false, tribalByDomainInject: false, wikiPrecheckInject: false },
      }),
    );
    const r = shouldSkip("masterIndexInject", { sessionId: SID, sidecarDir: dir });
    assert.equal(r.skip, false);
    assert.equal(r.reason, "flag-false");
  });

  it("fresh COLD-confident sidecar → skip=true", () => {
    writeFileSync(
      join(dir, `latest-${SID}.json`),
      validSidecar({ writtenAt: new Date().toISOString() }),
    );
    const r = shouldSkip("tribalByDomainInject", { sessionId: SID, sidecarDir: dir });
    assert.equal(r.skip, true);
    assert.equal(r.reason, "cag-cold");
  });

  it("malformed sidecar JSON → skip=false (fail-open)", () => {
    writeFileSync(join(dir, `latest-${SID}.json`), "this is not json {{{");
    const r = shouldSkip("masterIndexInject", { sessionId: SID, sidecarDir: dir });
    assert.equal(r.skip, false);
  });

  it("schema-mismatch sidecar → skip=false (forward-compat refuse)", () => {
    writeFileSync(
      join(dir, `latest-${SID}.json`),
      validSidecar({ schemaVersion: "2.0.0", writtenAt: new Date().toISOString() }),
    );
    const r = shouldSkip("masterIndexInject", { sessionId: SID, sidecarDir: dir });
    assert.equal(r.skip, false);
  });

  it("stale sidecar (>30s old) → skip=false even if COLD-confident", () => {
    const staleWritten = new Date(Date.now() - 60_000).toISOString();
    writeFileSync(join(dir, `latest-${SID}.json`), validSidecar({ writtenAt: staleWritten }));
    const r = shouldSkip("masterIndexInject", { sessionId: SID, sidecarDir: dir });
    assert.equal(r.skip, false);
    assert.equal(r.reason, "stale-sidecar");
  });
});

describe("skipAdvisory", () => {
  it("includes consumer label + tier + confidence + disable knob", () => {
    const msg = skipAdvisory("Master-index precheck", { tier: "COLD", confidence: 0.92 });
    assert.match(msg, /Master-index precheck skipped/);
    assert.match(msg, /tier=COLD/);
    assert.match(msg, /confidence=0\.92/);
    assert.match(msg, /PRISM_CAG_CONSUME_DISABLE=1/);
  });

  it("falls back gracefully when decision is null/empty", () => {
    const msg = skipAdvisory("X", null);
    assert.match(msg, /tier=COLD/);
    assert.match(msg, /confidence=n\/a/);
  });
});
