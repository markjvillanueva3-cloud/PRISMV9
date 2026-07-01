// scripts/lib/octopus-consumption-bridge.test.mjs — consumption-substrate tests (hermetic).
//
// Verifies the producer→feed half of U-FLEET-CONSUME: an octopus consensus becomes a per-galaxy
// outcome record (pure map), is published O_APPEND to a safe per-domain feed, and reads back.
// All fs is sandboxed via opts.baseDir = a tmp dir (never touches state/shared/octopus-outcomes).

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  OUTCOME_KIND,
  consensusToOutcome,
  feedPathFor,
  publishConsensusOutcome,
  readConsensusOutcomes,
  listOutcomeDomains,
} from "./octopus-consumption-bridge.mjs";
import { mapConsensusToLedger } from "./octopus-dispatch.mjs";

const GOOD = {
  verdict: "use climb milling at 0.08mm/tooth",
  confidence: 0.82,
  voices: [{ id: "claude" }, { id: "gemini" }, { id: "ollama" }],
  dissent_items: [],
  semanticSummary: "three voices agreed on the feed",
};

// -- consensusToOutcome (pure) --------------------------------------------

test("consensusToOutcome: maps a consensus + SIBLING voices (the production wiring) to an outcome record", () => {
  // voices live as a SIBLING of consensus on the dispatch result (mapConsensusToLedger), so they
  // arrive via opts — NOT inside the consensus object. This is the path the orchestrator uses.
  const o = consensusToOutcome(
    "mill",
    { verdict: GOOD.verdict, confidence: 0.82, dissent_items: [], semanticSummary: GOOD.semanticSummary },
    { at: "2026-06-01T00:00:00Z", voices: [{ id: "claude", verdict: "answered" }, { id: "gemini", verdict: "answered" }, { id: "ollama", verdict: "answered" }], successCount: 3 },
  );
  assert.equal(o.kind, OUTCOME_KIND);
  assert.equal(o.domain, "mill");
  assert.equal(o.voiceCount, 3);
  assert.equal(o.successCount, 3);
  assert.equal(o.dissentItemCount, 0);
  assert.equal("unanimous" in o, false, "dropped — dissent_items emptiness was an unsound unanimity signal");
  assert.equal(o.confidence, 0.82);
  assert.equal(o.at, "2026-06-01T00:00:00Z");
  assert.match(o.verdict, /climb milling/);
});

test("consensusToOutcome: self-contained consensus.voices fallback (direct caller, no opts.voices)", () => {
  // A direct caller MAY pass a self-contained object with voices inside; honored only as a fallback.
  const o = consensusToOutcome("mill", GOOD, { at: "2026-06-01T00:00:00Z" });
  assert.equal(o.voiceCount, 3, "consensus.voices fallback");
  assert.equal(o.successCount, 3, "no 'answered' verdicts on the fallback voices → roster size");
  assert.equal(o.dissentItemCount, 0);
});

test("consensusToOutcome: dissent_items surface as dissentItemCount (noisy count, not a unanimity flag)", () => {
  const o = consensusToOutcome("lathe", { ...GOOD, dissent_items: [{ voice: "gemini" }, "recommendation:escalate"] });
  assert.equal(o.dissentItemCount, 2);
  assert.equal("unanimous" in o, false);
});

test("consensusToOutcome: null/garbage/stub → null (no fake outcome)", () => {
  assert.equal(consensusToOutcome("mill", null), null);
  assert.equal(consensusToOutcome("mill", 42), null);
  assert.equal(consensusToOutcome("mill", {}), null); // no verdict, no voices → stub
  assert.equal(consensusToOutcome("mill", { verdict: "", voices: [] }), null);
});

test("consensusToOutcome: unsafe / traversal domain → null", () => {
  assert.equal(consensusToOutcome("../etc", GOOD), null);
  assert.equal(consensusToOutcome("a/b", GOOD), null);
  assert.equal(consensusToOutcome("", GOOD), null);
  assert.equal(consensusToOutcome(42, GOOD), null);
});

test("consensusToOutcome: redacts secrets in verdict + summary", () => {
  const o = consensusToOutcome("mill", {
    verdict: "do it; Authorization: Bearer abc.def.ghi",
    voices: [{ id: "claude" }],
    semanticSummary: "key was api_key: zzz9secret here",
  });
  assert.ok(!o.verdict.includes("abc.def.ghi"), "bearer leaked");
  assert.ok(!o.semanticSummary.includes("zzz9secret"), "api_key leaked");
});

test("consensusToOutcome: clamps confidence to [0,1], drops non-finite", () => {
  assert.equal(consensusToOutcome("mill", { ...GOOD, confidence: 5 }).confidence, 1);
  assert.equal(consensusToOutcome("mill", { ...GOOD, confidence: -2 }).confidence, 0);
  assert.equal("confidence" in consensusToOutcome("mill", { ...GOOD, confidence: "x" }), false);
});

// -- feedPathFor -----------------------------------------------------------

test("feedPathFor: safe domain → <base>/<domain>.jsonl; unsafe → null", () => {
  assert.match(feedPathFor("mill", "/tmp/base"), /mill\.jsonl$/);
  assert.equal(feedPathFor("../secret", "/tmp/base"), null);
  assert.equal(feedPathFor("a/b", "/tmp/base"), null);
  assert.equal(feedPathFor("..", "/tmp/base"), null);
});

// -- publish + read round-trip (hermetic) ---------------------------------

test("publish + read: round-trips outcomes; O_APPEND accumulates", () => {
  const base = mkdtempSync(join(tmpdir(), "octo-consume-"));
  try {
    const r1 = publishConsensusOutcome("mill", GOOD, { baseDir: base, at: "2026-06-01T00:00:00Z" });
    assert.equal(r1.ok, true);
    const r2 = publishConsensusOutcome("mill", { ...GOOD, verdict: "second decision", dissent_items: [{ v: "x" }] }, { baseDir: base });
    assert.equal(r2.ok, true);
    const recs = readConsensusOutcomes("mill", { baseDir: base });
    assert.equal(recs.length, 2, "both appended");
    assert.equal(recs[0].verdict, "use climb milling at 0.08mm/tooth");
    assert.equal(recs[1].verdict, "second decision");
    assert.equal(recs[1].dissentItemCount, 1);
    // A different domain has its own disjoint feed.
    assert.deepEqual(readConsensusOutcomes("lathe", { baseDir: base }), []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("publish: unsafe domain or unpublishable consensus → {ok:false}, no write", () => {
  const base = mkdtempSync(join(tmpdir(), "octo-consume-"));
  try {
    assert.equal(publishConsensusOutcome("../etc", GOOD, { baseDir: base }).ok, false);
    assert.equal(publishConsensusOutcome("mill", {}, { baseDir: base }).ok, false); // stub
    assert.deepEqual(readConsensusOutcomes("mill", { baseDir: base }), []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("read: absent feed → []; respects limit; skips unparseable lines", () => {
  const base = mkdtempSync(join(tmpdir(), "octo-consume-"));
  try {
    assert.deepEqual(readConsensusOutcomes("mill", { baseDir: base }), []);
    mkdirSync(base, { recursive: true });
    const feed = join(base, "mill.jsonl");
    const good = JSON.stringify({ kind: OUTCOME_KIND, domain: "mill", verdict: "v1" });
    const good2 = JSON.stringify({ kind: OUTCOME_KIND, domain: "mill", verdict: "v2" });
    writeFileSync(feed, `${good}\nNOT JSON GARBAGE\n${good2}\n{"kind":"other"}\n`);
    const recs = readConsensusOutcomes("mill", { baseDir: base });
    assert.equal(recs.length, 2, "2 valid octopus_consensus lines (garbage + foreign-kind skipped)");
    const limited = readConsensusOutcomes("mill", { baseDir: base, limit: 1 });
    assert.equal(limited.length, 1);
    assert.equal(limited[0].verdict, "v2", "limit keeps most-recent");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// -- REAL SEAM: drive an actual mapConsensusToLedger() output through the bridge ----------
// This is the regression lock for the sibling-voices P0. mapConsensusToLedger returns
// `{ voices, consensus:{verdict,confidence,dissent_items}, successCount }` — voices is a SIBLING
// of consensus, NOT a field inside it. The earlier code read `consensus.voices` (never present),
// so production outcomes always carried voiceCount:0. This test feeds the genuine engine-mapper
// output through publish→read and asserts a NON-ZERO voiceCount — it FAILS on the old code,
// proving the fix is load-bearing (R9: a test that fails when the business logic regresses).
test("seam: a real mapConsensusToLedger output publishes a NON-ZERO voiceCount (sibling-voices P0 lock)", () => {
  const base = mkdtempSync(join(tmpdir(), "octo-seam-"));
  try {
    // A minimal but real ConsensusResult — 3 voices answered, accept recommendation.
    const cr = {
      ok: true,
      successCount: 3,
      recommendation: "accept",
      agreementScore: 0.9,
      consensus: { answer: "use climb milling at 0.08mm/tooth", confidence: 0.9 },
      responses: [
        { vendor: "anthropic", model: "claude-opus", ok: true },
        { vendor: "google", model: "gemini-2.5", ok: true },
        { vendor: "ollama", model: "qwen2.5-coder", ok: true },
      ],
    };
    const mapped = mapConsensusToLedger(cr);
    // Sanity: voices ARE a sibling, consensus carries none — this is the trap the old code fell into.
    assert.equal(mapped.voices.length, 3, "mapper emits sibling voices");
    assert.equal(mapped.consensus.voices, undefined, "consensus object itself carries NO voices");

    // Publish via the exact production call shape (orchestrator passes the sibling voices/successCount).
    const pub = publishConsensusOutcome("mill", mapped.consensus, {
      baseDir: base,
      at: "2026-06-01T00:00:00Z",
      voices: mapped.voices,
      successCount: mapped.successCount,
    });
    assert.equal(pub.ok, true);

    const recs = readConsensusOutcomes("mill", { baseDir: base });
    assert.equal(recs.length, 1);
    assert.equal(recs[0].voiceCount, 3, "voiceCount MUST come from the sibling voices[], not consensus.voices");
    assert.equal(recs[0].successCount, 3);
    assert.equal(recs[0].dissentItemCount, 0);
    assert.equal(recs[0].confidence, 0.9);
    assert.match(recs[0].verdict, /climb milling/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// Companion: a failed fan-out (no voice answered) still maps + publishes honestly — the verdict
// names the blocker, voiceCount reflects the canonical roster, successCount is 0 (no fake merge).
test("seam: a no-voice-reachable consensus publishes an honest blocker (successCount 0, not faked)", () => {
  const base = mkdtempSync(join(tmpdir(), "octo-seam-fail-"));
  try {
    const cr = {
      ok: false,
      successCount: 0,
      recommendation: "escalate",
      consensus: { answer: "" },
      responses: [
        { vendor: "anthropic", model: "claude", ok: false, error: "429 quota exceeded" },
        { vendor: "ollama", model: "qwen", ok: false, error: "ECONNREFUSED" },
      ],
    };
    const mapped = mapConsensusToLedger(cr);
    const pub = publishConsensusOutcome("mill", mapped.consensus, {
      baseDir: base,
      voices: mapped.voices,
      successCount: mapped.successCount,
    });
    assert.equal(pub.ok, true, "an honest no-consensus is still a publishable outcome");
    const recs = readConsensusOutcomes("mill", { baseDir: base });
    assert.equal(recs.length, 1);
    assert.equal(recs[0].successCount, 0, "no voice answered → zero, never a faked count");
    assert.match(recs[0].verdict, /^no-consensus:/, "verdict names the real blocker");
    assert.ok(recs[0].dissentItemCount >= 2, "per-voice failure reasons surface as dissent items");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// -- listOutcomeDomains (feed enumeration for per-domain consumers) --------
test("listOutcomeDomains: enumerates safe <domain>.jsonl feeds, sorted+unique; skips non-jsonl + unsafe names", () => {
  const base = mkdtempSync(join(tmpdir(), "octo-domains-"));
  try {
    mkdirSync(base, { recursive: true });
    writeFileSync(join(base, "mill.jsonl"), "");
    writeFileSync(join(base, "lathe.jsonl"), "");
    writeFileSync(join(base, "speed-feed.jsonl"), "");      // hyphen is SAFE_DOMAIN_RE-legal
    writeFileSync(join(base, "README.md"), "not a feed");   // non-jsonl → skipped
    writeFileSync(join(base, "notes.txt"), "not a feed");   // non-jsonl → skipped
    writeFileSync(join(base, ".hidden.jsonl"), "");          // leading dot → fails SAFE_DOMAIN_RE
    const domains = listOutcomeDomains({ baseDir: base });
    assert.deepEqual(domains, ["lathe", "mill", "speed-feed"], "sorted, safe, jsonl-only");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("listOutcomeDomains: absent dir / read error → [] (fail-soft)", () => {
  assert.deepEqual(listOutcomeDomains({ baseDir: join(tmpdir(), "octo-nope-does-not-exist-xyz") }), []);
});
