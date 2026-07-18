// Tests for wire-vendor-corpus-to-galaxies.mjs — node:test, real-value assertions.
// Run: node --test scripts/wire-vendor-corpus-to-galaxies.test.mjs < /dev/null
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BEGIN, END, resolveArtifact, buildGalaxyBlock, spliceSection, discoverTargets,
} from "./wire-vendor-corpus-to-galaxies.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- hermetic fixture (logic does not depend on the real file) ----
const FIX = {
  schemaVersion: "1.0.0",
  owner: "charlie",
  consumers: ["speed-feed", "business"],
  summary: { sfc_makers: 131, sfc_high_extract: 44, sfc_on_disk: 57, pulled_dir_pdfs: 164, directory_vendors: 433 },
  artifacts: [
    { id: "sfc_extraction_manifest", path: "state/shared/quoting/catalog-sfc-extraction-manifest.json", kind: "json", role: "per-maker SFC worklist" },
    { id: "vendor_directory_jsonl", path: "state/shared/quoting/vendor-directory.jsonl", kind: "jsonl", role: "433-vendor directory" },
    { id: "pulled_pdfs_dir", path: "H:/PRISM/Resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29", kind: "dir", role: "pulled PDFs" },
  ],
  galaxyConsumers: {
    "speed-feed": { label: "oscar — SFC", why: "extract S/F into per-vendor .ts", artifacts: ["sfc_extraction_manifest", "pulled_pdfs_dir"] },
    "business": { label: "hotel — ERP", why: "supplier master for procurement", artifacts: ["vendor_directory_jsonl"] },
  },
};

test("resolveArtifact: known id returns record; unknown returns null", () => {
  assert.equal(resolveArtifact(FIX, "vendor_directory_jsonl").kind, "jsonl");
  assert.equal(resolveArtifact(FIX, "no_such_id"), null);
  assert.equal(resolveArtifact({}, "x"), null); // no artifacts array
});

test("discoverTargets: returns the sorted consumer keys", () => {
  assert.deepEqual(discoverTargets(FIX), ["business", "speed-feed"]);
  assert.deepEqual(discoverTargets({}), []);
});

test("buildGalaxyBlock: declared consumer → marked block with label, why, resolved artifact paths", () => {
  const b = buildGalaxyBlock("speed-feed", FIX);
  assert.ok(b.startsWith(BEGIN) && b.endsWith(END));
  assert.match(b, /Why speed-feed \(oscar — SFC\):/);
  assert.match(b, /extract S\/F into per-vendor \.ts/);
  // only its declared artifacts appear (manifest + pulled dir), NOT the directory (that's hotel's)
  assert.match(b, /catalog-sfc-extraction-manifest\.json/);
  assert.match(b, /pulled-2026-05-29/);
  assert.doesNotMatch(b, /vendor-directory\.jsonl/);
  // summary counts surfaced
  assert.match(b, /131 makers/);
  assert.match(b, /44 HIGH/);
});

test("buildGalaxyBlock: per-galaxy tailoring — hotel gets the directory, not the SFC manifest", () => {
  const b = buildGalaxyBlock("business", FIX);
  assert.match(b, /vendor-directory\.jsonl/);
  assert.doesNotMatch(b, /catalog-sfc-extraction-manifest\.json/);
});

test("buildGalaxyBlock: non-consumer galaxy → null (caller skips)", () => {
  assert.equal(buildGalaxyBlock("wedm", FIX), null);
  assert.equal(buildGalaxyBlock("cad", FIX), null);
});

test("buildGalaxyBlock: unresolved artifact id emits a loud ⚠ line, does not throw", () => {
  const bad = { ...FIX, galaxyConsumers: { "speed-feed": { label: "x", why: "y", artifacts: ["ghost_id"] } } };
  const b = buildGalaxyBlock("speed-feed", bad);
  assert.match(b, /unresolved artifact id `ghost_id`/);
});

test("spliceSection: appends block once; second apply is byte-identical (idempotent)", () => {
  const base = "# PATHS\n\nsome content\n";
  const block = buildGalaxyBlock("speed-feed", FIX);
  const once = spliceSection(base, block);
  const twice = spliceSection(once, block);
  assert.equal(once, twice, "re-applying the same block must be a no-op");
  assert.equal((once.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
  assert.match(once, /some content/); // non-marker content preserved
});

test("spliceSection: replaces a stale block in place (no duplication)", () => {
  const base = "# PATHS\n";
  const v1 = spliceSection(base, buildGalaxyBlock("speed-feed", FIX));
  // simulate updated index (different summary count) → updated block
  const FIX2 = { ...FIX, summary: { ...FIX.summary, sfc_makers: 999 } };
  const v2 = spliceSection(v1, buildGalaxyBlock("speed-feed", FIX2));
  assert.match(v2, /999 makers/);
  assert.doesNotMatch(v2, /131 makers/); // stale block gone
  assert.equal((v2.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
});

test("spliceSection: drops orphaned lone marker (torn-write residue), preserves prose", () => {
  const torn = "# PATHS\n\nkeep me\n" + BEGIN + "\nhalf written\n";
  const fixed = spliceSection(torn, buildGalaxyBlock("speed-feed", FIX));
  assert.match(fixed, /keep me/);
  assert.equal((fixed.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
  assert.ok(fixed.trimEnd().endsWith(END));
});

// ---- real-data smoke test (hermetic fakes don't prove production wiring) ----
test("real index: builds a block for all 6 declared consumers with resolvable artifacts", () => {
  const idxPath = path.join(REPO, "state/shared/quoting/VENDOR-CATALOG-CORPUS-INDEX.json");
  const idx = JSON.parse(fs.readFileSync(idxPath, "utf-8"));
  const targets = discoverTargets(idx);
  assert.deepEqual(
    targets,
    ["business", "cam", "database-expansion", "mill", "post-processor", "speed-feed"],
    "the 6 named consumer galaxies",
  );
  for (const g of targets) {
    const b = buildGalaxyBlock(g, idx);
    assert.ok(b && b.startsWith(BEGIN) && b.endsWith(END), `block for ${g}`);
    assert.doesNotMatch(b, /unresolved artifact id/, `all artifact ids resolve for ${g}`);
  }
});
