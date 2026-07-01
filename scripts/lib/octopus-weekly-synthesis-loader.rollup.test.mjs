// scripts/lib/octopus-weekly-synthesis-loader.rollup.test.mjs — per-domain rollup tests (hermetic).
//
// Covers the U-FLEET-CONSUME consumption half: the WeeklySynthesis loader now reads the per-galaxy
// octopus-outcomes feeds (state/shared/octopus-outcomes/<domain>.jsonl) and folds a per-domain
// rollup into the weekly retro. The crown test is the E2E round-trip: publish a REAL outcome via
// the bridge → composeOctopusLoader → the returned weekly sources carry that verdict. That proves
// the producer→feed→consumer loop is actually closed (not dormant). All fs is sandboxed to a tmp
// outcomesDir — never touches state/shared/octopus-outcomes.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildPerDomainConsensusRollup,
  loadPerDomainRollupSource,
  composeOctopusLoader,
  OCTOPUS_ROLLUP_SENTINEL_PATH,
} from "./octopus-weekly-synthesis-loader.mjs";
import { publishConsensusOutcome, OUTCOME_KIND } from "./octopus-consumption-bridge.mjs";

const mkdir = (tag) => mkdtempSync(join(tmpdir(), tag));
const answered = (n) => Array.from({ length: n }, (_, i) => ({ id: `v${i}`, verdict: "answered" }));

// -- buildPerDomainConsensusRollup ----------------------------------------

test("rollup: empty / absent feed dir → '' (no source)", () => {
  const dir = mkdir("octo-rollup-empty-");
  try {
    assert.equal(buildPerDomainConsensusRollup({ outcomesDir: dir }), "");
    assert.equal(buildPerDomainConsensusRollup({ outcomesDir: join(dir, "nope") }), "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rollup: one line per galaxy, latest outcome wins, with conf + voice tally", () => {
  const dir = mkdir("octo-rollup-");
  try {
    publishConsensusOutcome("mill", { verdict: "older mill call", confidence: 0.5 },
      { baseDir: dir, at: "2026-06-01T00:00:00Z", voices: answered(1), successCount: 1 });
    publishConsensusOutcome("mill", { verdict: "use climb milling 0.08", confidence: 0.91 },
      { baseDir: dir, at: "2026-06-01T01:00:00Z", voices: answered(3), successCount: 3 });
    publishConsensusOutcome("lathe", { verdict: "CSS at 1200", confidence: 0.7 },
      { baseDir: dir, at: "2026-06-01T02:00:00Z", voices: answered(1), successCount: 1 });

    const body = buildPerDomainConsensusRollup({ outcomesDir: dir });
    assert.match(body, /# Octopus per-domain fleet consensus/);
    assert.match(body, /2 galaxy\(ies\)/, "mill + lathe");
    // mill: 2 outcomes, latest is the climb-milling call (most-recent-last)
    assert.match(body, /\*\*mill\*\* — 2 recent outcome\(s\); latest @ 2026-06-01T01:00:00Z: use climb milling 0\.08 conf=0\.91 \(3\/3 voices\)/);
    assert.match(body, /\*\*lathe\*\* — 1 recent outcome\(s\); latest @ 2026-06-01T02:00:00Z: CSS at 1200 conf=0\.70 \(1\/1 voices\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rollup: re-redacts a legacy raw-secret feed line (defense-in-depth)", () => {
  const dir = mkdir("octo-rollup-redact-");
  try {
    mkdirSync(dir, { recursive: true });
    // Simulate a PRE-FIX/legacy feed line that escaped write-time redaction.
    const raw = JSON.stringify({
      kind: OUTCOME_KIND, domain: "mill",
      verdict: "leak Authorization: Bearer abc.def.ghi", at: "2026-06-01T00:00:00Z",
      voiceCount: 1, successCount: 1,
    });
    writeFileSync(join(dir, "mill.jsonl"), raw + "\n");
    const body = buildPerDomainConsensusRollup({ outcomesDir: dir });
    assert.ok(body.includes("**mill**"), "mill row present");
    assert.ok(!body.includes("abc.def.ghi"), "legacy raw secret must be re-masked at render");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// -- loadPerDomainRollupSource --------------------------------------------

test("loadPerDomainRollupSource: no feeds → null; with feeds → a WeeklySource (anchored + sized)", () => {
  const empty = mkdir("octo-src-empty-");
  try {
    assert.equal(loadPerDomainRollupSource({ outcomesDir: empty }), null);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
  const dir = mkdir("octo-src-");
  try {
    publishConsensusOutcome("cam", { verdict: "adaptive clear", confidence: 0.6 },
      { baseDir: dir, at: "2026-06-01T00:00:00Z", voices: answered(1), successCount: 1 });
    const src = loadPerDomainRollupSource({ outcomesDir: dir, anchorDate: "2026-06-01" });
    assert.ok(src, "source built");
    assert.equal(src.path, OCTOPUS_ROLLUP_SENTINEL_PATH);
    assert.equal(src.date, "2026-06-01", "anchored to the retro date");
    assert.equal(src.bytes, Buffer.byteLength(src.body, "utf8"), "bytes match body");
    assert.match(src.body, /adaptive clear/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// -- composeOctopusLoader integration (E2E) -------------------------------

test("E2E: publish → composeOctopusLoader yields a per-domain rollup source carrying the verdict", async () => {
  const dir = mkdir("octo-e2e-");
  try {
    publishConsensusOutcome("mill", { verdict: "E2E climb milling verdict", confidence: 0.9 },
      { baseDir: dir, at: "2026-06-01T00:00:00Z", voices: answered(2), successCount: 2 });
    const base = async () => [{ date: "2026-06-01", path: "daily://x", body: "ctx", bytes: 3 }];
    const composed = composeOctopusLoader(base, {
      env: { PRISM_WEEKLY_SYNTHESIS_OCTOPUS: "1" },
      outcomesDir: dir,
      ledgerPath: join(dir, "no-ledger.jsonl"), // no ledger → only base + rollup
    });
    const sources = await composed({ vaultRoot: "/x", date: "2026-06-01" });
    const rollup = sources.find((s) => s.path === OCTOPUS_ROLLUP_SENTINEL_PATH);
    assert.ok(rollup, "per-domain rollup source appended to the weekly sources");
    assert.match(rollup.body, /E2E climb milling verdict/, "the published verdict reached the consumer");
    assert.equal(rollup.date, "2026-06-01");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("composeOctopusLoader: WITHOUT outcomesDir → NO per-domain rollup source (backward-compat)", async () => {
  const dir = mkdir("octo-noflag-");
  try {
    publishConsensusOutcome("mill", { verdict: "should not appear", confidence: 0.9 },
      { baseDir: dir, at: "2026-06-01T00:00:00Z", voices: answered(1), successCount: 1 });
    const base = async () => [{ date: "2026-06-01", path: "daily://x", body: "ctx", bytes: 3 }];
    // knob ON, ledger empty, but NO outcomesDir → the rollup must NOT activate (existing callers).
    const composed = composeOctopusLoader(base, {
      env: { PRISM_WEEKLY_SYNTHESIS_OCTOPUS: "1" },
      ledgerPath: join(dir, "no-ledger.jsonl"),
    });
    const sources = await composed({ vaultRoot: "/x", date: "2026-06-01" });
    assert.ok(!sources.some((s) => s.path === OCTOPUS_ROLLUP_SENTINEL_PATH), "no rollup without outcomesDir");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("composeOctopusLoader: knob OFF → base loader returned unchanged (no octopus sources at all)", async () => {
  const dir = mkdir("octo-off-");
  try {
    publishConsensusOutcome("mill", { verdict: "ignored when knob off", confidence: 0.9 },
      { baseDir: dir, at: "2026-06-01T00:00:00Z", voices: answered(1), successCount: 1 });
    const base = async () => [{ date: "2026-06-01", path: "daily://x", body: "ctx", bytes: 3 }];
    const composed = composeOctopusLoader(base, { env: {}, outcomesDir: dir });
    assert.equal(composed, base, "knob off → identical base loader reference (zero behavior change)");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
