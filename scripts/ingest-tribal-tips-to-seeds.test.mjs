// Test -- ingest-tribal-tips-to-seeds.mjs pure helpers.
// Run: node scripts/ingest-tribal-tips-to-seeds.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { seedFromTips, mergeSeeds, videoTipText, hermesTipDomain, readHermesEnrichmentTips } from "./ingest-tribal-tips-to-seeds.mjs";

test("videoTipText: reads the youtube .body field (the real shape) + prefixes title", () => {
  // The bug this guards: video tips are {title, body, category}, NOT {tip}/{text}.
  assert.equal(
    videoTipText({ id: "x", title: "Shrink Fit Balance", body: "2.5 g-mm at 25000 rpm." }),
    "Shrink Fit Balance: 2.5 g-mm at 25000 rpm.",
  );
});
test("videoTipText: body alone when no title (or title === body); legacy tip/text still work", () => {
  assert.equal(videoTipText({ body: "Climb mill aluminum." }), "Climb mill aluminum.");
  assert.equal(videoTipText({ title: "same", body: "same" }), "same");
  assert.equal(videoTipText({ tip: "legacy tip field" }), "legacy tip field");
  assert.equal(videoTipText({ text: "legacy text field" }), "legacy text field");
  assert.equal(videoTipText("plain string tip"), "plain string tip");
});
test("videoTipText: empty/garbage -> '' (never throws)", () => {
  assert.equal(videoTipText(null), "");
  assert.equal(videoTipText({}), "");
  assert.equal(videoTipText({ title: "no body" }), "");
  assert.equal(videoTipText(42), "");
});

test("seedFromTips: builds a bulleted text + tipCount + tags from a tip list", () => {
  const s = seedFromTips({ id: "t1", domain: "cam", software: "hypermill", title: "Roughing", tips: ["Climb mill aluminum.", "Use 0.03 stepover."] });
  assert.equal(s.id, "t1");
  assert.equal(s.tipCount, 2);
  assert.match(s.text, /- Climb mill aluminum\./);
  assert.match(s.text, /- Use 0\.03 stepover\./);
  assert.ok(s.tags.includes("tribal") && s.tags.includes("cam") && s.tags.includes("hypermill"));
  assert.equal(s.sourceType, "ai-generated-hermes");
});

test("seedFromTips: trims + drops empty tips; defaults domain", () => {
  const s = seedFromTips({ id: "t2", tips: ["  real tip  ", "", "   "] });
  assert.equal(s.tipCount, 1);
  assert.equal(s.domain, "manufacturing");
});

test("seedFromTips: tolerates non-array tips (never throws)", () => {
  assert.equal(seedFromTips({ id: "t3", tips: null }).tipCount, 0);
  assert.equal(seedFromTips({ id: "t4" }).tipCount, 0);
});

test("mergeSeeds: new entries win by id; prior entries preserved; totals recomputed", () => {
  const existing = { tips: [{ id: "a", tipCount: 1 }, { id: "b", tipCount: 2 }] };
  const fresh = [seedFromTips({ id: "b", tips: ["x", "y", "z"] }), seedFromTips({ id: "c", tips: ["q"] })];
  const m = mergeSeeds(existing, fresh);
  assert.equal(m.totalSeeds, 3);                       // a (kept) + b (replaced) + c (new)
  assert.equal(m.tips.find((e) => e.id === "b").tipCount, 3); // new b won
  assert.equal(m.tips.find((e) => e.id === "a").tipCount, 1); // a preserved
  assert.equal(m.totalTips, 1 + 3 + 1);
  assert.equal(m.schemaVersion, "2.0.0");
});

test("mergeSeeds: tolerates empty/garbage existing (never throws)", () => {
  const m = mergeSeeds({}, [seedFromTips({ id: "z", tips: ["only"] })]);
  assert.equal(m.totalSeeds, 1);
  assert.equal(m.totalTips, 1);
});

// -- Hermes enrichment-loop source (U-HERMES-TRIBAL-INJECT) --

test("hermesTipDomain: extracts domain from the `domain:<x>` tag; falls back to manufacturing", () => {
  assert.equal(hermesTipDomain({ tags: ["domain:mill", "hermes:grok-4.20"] }), "mill");
  assert.equal(hermesTipDomain({ tags: ["safety:gate-candidate", "domain:WEDM"] }), "wedm"); // lowercased
  assert.equal(hermesTipDomain({ tags: ["no-domain-here"] }), "manufacturing");
  assert.equal(hermesTipDomain({}), "manufacturing");
  assert.equal(hermesTipDomain(null), "manufacturing");
});

test("readHermesEnrichmentTips: one seed PER TIP w/ domain + advisory boundary; idempotent ids", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-seed-"));
  const f = path.join(dir, "staging.json");
  fs.writeFileSync(f, JSON.stringify({
    schemaVersion: "1.0.0", artifact: "x", count: 2, tips: [
      { id: "hkl-mill-001", title: "Shrink-fit under 6mm to hold TIR < 0.003mm.", tags: ["domain:mill"], source: "Sandvik p.68", confidence: 45, safety: true, needs_specialist_confirm: true },
      { id: "hkl-cad-002", title: "AP242 preserves PMI; AP214 drops it.", body: "...", tags: ["domain:cad"], source: "ISO 10303-242", confidence: 60 },
    ],
  }));
  const seeds = readHermesEnrichmentTips(f);
  assert.equal(seeds.length, 2);
  const mill = seeds.find((s) => s.id === "hkl-mill-001");
  assert.equal(mill.domain, "mill");
  assert.equal(mill.tipCount, 1);                                  // per-tip granularity
  assert.equal(mill.sourceCorpus, "hermes-enrichment-loop");
  assert.equal(mill.needsSpecialistConfirm, true);                 // safety item flagged
  assert.ok(mill.tags.includes("verify:unreviewed-cron"));         // advisory boundary -> no gate fires
  assert.equal(mill.confidence, 45);
  const cad = seeds.find((s) => s.id === "hkl-cad-002");
  assert.equal(cad.domain, "cad");
  assert.ok(!cad.needsSpecialistConfirm);                          // non-safety stays advisory-clean
  assert.ok(!cad.tags.includes("verify:unreviewed-cron"));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readHermesEnrichmentTips: missing file / garbage / empty -> [] (never throws)", () => {
  assert.deepEqual(readHermesEnrichmentTips("/no/such/staging-xyz.json"), []);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-seed-"));
  const bad = path.join(dir, "bad.json");
  fs.writeFileSync(bad, "{not json");
  assert.deepEqual(readHermesEnrichmentTips(bad), []);
  const empty = path.join(dir, "empty.json");
  fs.writeFileSync(empty, JSON.stringify({ tips: [] }));
  assert.deepEqual(readHermesEnrichmentTips(empty), []);
  fs.rmSync(dir, { recursive: true, force: true });
});
