#!/usr/bin/env node
/**
 * Tests for prism-ai-memo-coverage-inject.mjs (/goal synergy iter 14, echo).
 *
 * Run: node --test .claude/hooks/prism-ai-memo-coverage-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadAudit, pickTopMissing, formatDigest } from "./prism-ai-memo-coverage-inject.mjs";

const VALID_DRIFTED = Object.freeze({
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-21T17:00:00Z",
  stats: { engineCount: 7, memoCount: 863, missing: 4, coverage: 0.4286 },
  engines: [
    { name: "PRISMContextInjectorEngine", strictCount: 1, lenientCount: 1, sampleMemos: ["a.md"] },
    { name: "PRISMCreativeReasoningEngine", strictCount: 0, lenientCount: 3, sampleMemos: [] },
    { name: "PRISMLoRAAdapterEngine", strictCount: 0, lenientCount: 0, sampleMemos: [] },
    { name: "PRISMNeuralKnowledgeSynthesisEngine", strictCount: 0, lenientCount: 0, sampleMemos: [] },
    { name: "PRISMSelfAwarenessEngine", strictCount: 6, lenientCount: 13, sampleMemos: ["b.md"] },
    { name: "PRISMUnifiedOrchestratorEngine", strictCount: 1, lenientCount: 1, sampleMemos: ["c.md"] },
    { name: "PRISMVerificationPluginEngine", strictCount: 0, lenientCount: 0, sampleMemos: [] },
  ],
  missingFromMemos: [
    "PRISMCreativeReasoningEngine",
    "PRISMLoRAAdapterEngine",
    "PRISMNeuralKnowledgeSynthesisEngine",
    "PRISMVerificationPluginEngine",
  ],
});

const VALID_CLEAN = Object.freeze({
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-21T17:00:00Z",
  stats: { engineCount: 7, memoCount: 1000, missing: 0, coverage: 1.0 },
  engines: [],
  missingFromMemos: [],
});

// ───────────────────────── loadAudit ─────────────────────────

test("loadAudit: valid JSON → { audit, ageMs }", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-memo-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, JSON.stringify(VALID_DRIFTED));
  const r = loadAudit(f, Date.now() + 1000);
  assert.ok(r);
  assert.equal(r.audit.stats.missing, 4);
  assert.ok(r.ageMs >= 0);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: missing file → null", () => {
  assert.equal(loadAudit("/no/such/file.json"), null);
});

test("loadAudit: corrupt JSON → null", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-memo-corrupt-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, "{not valid json");
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: wrong-shape JSON (no .stats) → null", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-memo-shape-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, JSON.stringify({ schemaVersion: "1.0.0" })); // no .stats
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: .stats present but missing required keys → null (fail-closed)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-memo-keys-"));
  const f = path.join(dir, "audit.json");
  // .stats exists but lacks engineCount + missing — producer-contract drift.
  writeFileSync(f, JSON.stringify({ stats: { coverage: 0.5 } }));
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: zero-byte file → null", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-memo-zero-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, "");
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── pickTopMissing ─────────────────────────

test("pickTopMissing: default K=3 picks first 3", () => {
  const r = pickTopMissing(["a", "b", "c", "d", "e"]);
  assert.deepEqual(r, ["a", "b", "c"]);
});

test("pickTopMissing: K=0 → empty array", () => {
  assert.deepEqual(pickTopMissing(["a", "b"], 0), []);
});

test("pickTopMissing: K clamped to [0, 20]", () => {
  const big = Array.from({ length: 30 }, (_, i) => `e${i}`);
  assert.equal(pickTopMissing(big, 999).length, 20, "upper clamp");
  assert.equal(pickTopMissing(big, -5).length, 0, "lower clamp");
});

test("pickTopMissing: non-array → empty", () => {
  assert.deepEqual(pickTopMissing(null), []);
  assert.deepEqual(pickTopMissing(undefined), []);
  assert.deepEqual(pickTopMissing("string"), []);
});

test("pickTopMissing: K is NaN → uses default", () => {
  assert.equal(pickTopMissing(["a", "b", "c", "d"], NaN).length, 3);
});

test("pickTopMissing: null entries coerced to empty string (no throw)", () => {
  const r = pickTopMissing(["a", null, "c"]);
  assert.deepEqual(r, ["a", "", "c"]);
});

// ───────────────────────── formatDigest ─────────────────────────

test("formatDigest: drifted audit + missing>=threshold → digest with samples", () => {
  const out = formatDigest(VALID_DRIFTED, 0);
  assert.ok(out, "renders when missing>=1 (default threshold)");
  assert.ok(out.includes("PRISM-AI engine memo coverage"));
  assert.ok(out.includes("**4**"), "missing count rendered");
  assert.ok(out.includes("7 PRISM-AI engines"), "engine total rendered");
  assert.ok(out.includes("863"), "memo count rendered");
  assert.ok(out.includes("42.9%"), "coverage% rendered");
  // Top-3 of the 4 missing engines
  assert.ok(out.includes("PRISMCreativeReasoningEngine"));
  assert.ok(out.includes("PRISMLoRAAdapterEngine"));
  assert.ok(out.includes("PRISMNeuralKnowledgeSynthesisEngine"));
  // 4th missing engine NOT in top-3 default
  assert.ok(!out.includes("PRISMVerificationPluginEngine"));
});

test("formatDigest: clean audit (missing=0) → null (below threshold)", () => {
  assert.equal(formatDigest(VALID_CLEAN, 0), null);
});

test("formatDigest: threshold=5 with missing=4 → null", () => {
  assert.equal(formatDigest(VALID_DRIFTED, 0, { threshold: 5 }), null);
});

test("formatDigest: threshold=0 → fires even on clean audit", () => {
  // Edge case: operator wants to surface coverage even when there's no drift.
  const out = formatDigest(VALID_CLEAN, 0, { threshold: 0 });
  assert.ok(out, "fires when threshold=0 (explicit operator intent)");
  assert.ok(out.includes("100.0%"));
});

test("formatDigest: stale audit (> staleHrs) → null", () => {
  const ageMs = 31 * 24 * 3600_000; // 31 days
  assert.equal(formatDigest(VALID_DRIFTED, ageMs, { staleHrs: 720 }), null);
});

test("formatDigest: null/empty audit → null", () => {
  assert.equal(formatDigest(null, 0), null);
  assert.equal(formatDigest({}, 0), null);
  assert.equal(formatDigest({ stats: null }, 0), null);
});

test("formatDigest: age label fresh (<1h) vs N h old", () => {
  assert.ok(formatDigest(VALID_DRIFTED, 30 * 60_000).includes("fresh"));
  assert.ok(formatDigest(VALID_DRIFTED, 5 * 3600_000).includes("5h old"));
});

test("formatDigest: deterministic — same input twice → identical output", () => {
  const a = formatDigest(VALID_DRIFTED, 1000);
  const b = formatDigest(VALID_DRIFTED, 1000);
  assert.equal(a, b);
});

test("formatDigest: topK=0 → no sample list", () => {
  const out = formatDigest(VALID_DRIFTED, 0, { topK: 0 });
  assert.ok(out, "still renders header lines");
  assert.ok(!out.includes("Top "), "no Top-K subsection when topK=0");
});

test("formatDigest: singular vs plural blind-spot label", () => {
  const oneMissing = {
    ...VALID_DRIFTED,
    stats: { ...VALID_DRIFTED.stats, missing: 1 },
    missingFromMemos: ["PRISMLoRAAdapterEngine"],
  };
  const out = formatDigest(oneMissing, 0);
  assert.ok(out.includes("Top 1 blind-spot engine:"), "singular form");
  assert.ok(!out.includes("blind-spot engines:"), "no plural when missing=1");
});

// ───────────────────────── iter-5 P1-1 anti-regression ─────────────────────────

test("anti-regression: env-undefined behaves like default, env=0 honored", () => {
  // formatDigest takes opts.threshold directly (env parsing is in main()).
  // Validate the threshold path honors explicit 0 (not collapses to default).
  const a = formatDigest(VALID_DRIFTED, 0, { threshold: 0 });
  assert.ok(a, "threshold=0 explicit fires");
  // undefined → falls back to default 1 (which still fires for missing=4)
  const b = formatDigest(VALID_DRIFTED, 0, {});
  assert.ok(b, "default threshold fires when missing>=1");
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: live audit renders digest", () => {
  const live = "H:/prism/state/shared/.prism-ai-memo-cross-ref-audit.json";
  if (!existsSync(live)) {
    console.log("  SKIP: live audit missing (run scripts/prism-ai-memo-cross-ref-audit.mjs first)");
    return;
  }
  const r = loadAudit(live);
  assert.ok(r, "live audit parses");
  // The live audit may be healthy OR drifted — both code paths must return
  // the right shape (null OR string). Permissively assert either.
  const out = formatDigest(r.audit, 0);
  if (out !== null) {
    assert.ok(out.includes("PRISM-AI engine memo coverage"));
    assert.ok(out.length < 2000, "digest under 2KB (context-budget guard)");
  }
});
