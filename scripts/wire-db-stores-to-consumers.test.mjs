// node --test scripts/wire-db-stores-to-consumers.test.mjs
// Real-value assertions on the DB-store→consumer-galaxy wirer.
// Coverage: storesForGalaxy filtering · buildGalaxyBlock content · spliceSection
// idempotency + strip-stale + torn-write recovery + CRLF · failure modes (empty/null manifest).
import { test } from "node:test";
import assert from "node:assert/strict";
import { storesForGalaxy, buildGalaxyBlock, spliceSection, BEGIN, END } from "./wire-db-stores-to-consumers.mjs";

const MANIFEST = {
  databases: [
    { id: "PrismReferenceDB", name: "PRISM Unified Reference Database", source_dir: "mcp-server/data/prism-reference-db/", manifest_file: "mcp-server/data/prism-reference-db/MANIFEST.json", entry_count: 13920, consumers: ["speed-feed", "mill", "lathe", "wedm", "cam", "cad", "quality"] },
    { id: "VendorCatalogDB", name: "Vendor / Manufacturer Catalog Database", source_dir: "mcp-server/data/vendor-catalog-db/", manifest_file: "mcp-server/data/vendor-catalog-db/manifest.json", entry_count: 425, consumers: ["quoting", "speed-feed", "cam", "mill", "lathe"] },
    { id: "JMDieDocuStrataDB", name: "JM Die / DocuStrata Corpus Database", source_dir: "mcp-server/data/jm-die-database/", entry_count: 111745, consumers: ["quoting", "post-processor", "business"] },
    { id: "SomeFileDB", name: "unrelated", source_file: "x.json", entry_count: 5 }, // no consumers
  ],
};

test("storesForGalaxy — returns stores naming the galaxy, sorted by id", () => {
  const s = storesForGalaxy(MANIFEST, "mill");
  assert.deepEqual(s.map((x) => x.id), ["PrismReferenceDB", "VendorCatalogDB"]);
});

test("storesForGalaxy — a galaxy consuming one store", () => {
  const s = storesForGalaxy(MANIFEST, "wedm");
  assert.deepEqual(s.map((x) => x.id), ["PrismReferenceDB"]);
});

test("storesForGalaxy — a galaxy consuming THREE stores (quoting)", () => {
  const s = storesForGalaxy(MANIFEST, "quoting");
  assert.deepEqual(s.map((x) => x.id), ["JMDieDocuStrataDB", "VendorCatalogDB"]);
});

test("storesForGalaxy — a galaxy consuming none → empty", () => {
  assert.deepEqual(storesForGalaxy(MANIFEST, "nonexistent-galaxy"), []);
});

test("storesForGalaxy — null/malformed manifest → empty (no throw)", () => {
  assert.deepEqual(storesForGalaxy(null, "mill"), []);
  assert.deepEqual(storesForGalaxy({}, "mill"), []);
  assert.deepEqual(storesForGalaxy({ databases: "bad" }, "mill"), []);
});

test("buildGalaxyBlock — names the galaxy + every consumed store with count + query path", () => {
  const block = buildGalaxyBlock("mill", storesForGalaxy(MANIFEST, "mill"));
  assert.ok(block.startsWith(BEGIN) && block.endsWith(END));
  assert.ok(block.includes("the mill galaxy consumes"));
  assert.ok(block.includes("PrismReferenceDB") && block.includes("13,920 entries"));
  assert.ok(block.includes("VendorCatalogDB") && block.includes("425 entries"));
  assert.ok(block.includes("prism_data:database_search"));
});

test("buildGalaxyBlock — pure: same input → byte-identical", () => {
  const stores = storesForGalaxy(MANIFEST, "cam");
  assert.equal(buildGalaxyBlock("cam", stores), buildGalaxyBlock("cam", stores));
});

test("buildGalaxyBlock — file-backed store (source_file, no source_dir) renders its PATH, never 'undefined' [regression]", () => {
  // BLACKWELL-DB-GEN-MS0 fix: the renderer read only s.source_dir, so file-backed stores
  // (ReportTemplateDB/ToleranceDB/WorkholdingDB + the 3 JM financial stores) rendered "undefined".
  // The fleet needs a real pathway to each DB file — fall back to source_file.
  const fileBacked = {
    databases: [
      { id: "JMVendorAPLedgerDB", name: "JM Die Vendor A/P Ledger", source_file: "state/shared/quoting/jm-vendor-ap-ledger.jsonl", entry_count: 20736, consumers: ["quoting"] },
    ],
  };
  const block = buildGalaxyBlock("quoting", storesForGalaxy(fileBacked, "quoting"));
  assert.ok(block.includes("state/shared/quoting/jm-vendor-ap-ledger.jsonl"), "source_file path must render");
  assert.ok(!block.includes("undefined"), "must never emit the literal 'undefined' for a missing source_dir");
  assert.ok(block.includes("20,736 entries"));
});

test("spliceSection — appends block to a clean file (one blank line before)", () => {
  const before = "# PATHS\n\nsome content";
  const block = buildGalaxyBlock("mill", storesForGalaxy(MANIFEST, "mill"));
  const after = spliceSection(before, block);
  assert.ok(after.includes("some content"));
  assert.ok(after.includes(BEGIN) && after.includes(END));
  assert.equal((after.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
});

test("spliceSection — IDEMPOTENT: re-splicing yields byte-identical output", () => {
  const before = "# PATHS\n\ncontent";
  const block = buildGalaxyBlock("cam", storesForGalaxy(MANIFEST, "cam"));
  const once = spliceSection(before, block);
  const twice = spliceSection(once, block);
  assert.equal(twice, once);
});

test("spliceSection — strips a STALE block when galaxy no longer consumes (block=null)", () => {
  const block = buildGalaxyBlock("mill", storesForGalaxy(MANIFEST, "mill"));
  const wired = spliceSection("# PATHS\n\ncontent", block);
  assert.ok(wired.includes(BEGIN));
  const stripped = spliceSection(wired, null);
  assert.ok(!stripped.includes(BEGIN) && !stripped.includes(END), "stale block must be removed");
  assert.ok(stripped.includes("content"), "non-marker content preserved");
});

test("spliceSection — never duplicates: re-splice a different store-set replaces in place", () => {
  const b1 = buildGalaxyBlock("mill", storesForGalaxy(MANIFEST, "mill"));
  const b2 = buildGalaxyBlock("wedm", storesForGalaxy(MANIFEST, "wedm"));
  const after = spliceSection(spliceSection("# x", b1), b2);
  assert.equal((after.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
  assert.ok(after.includes("the wedm galaxy consumes"));
  assert.ok(!after.includes("the mill galaxy consumes"));
});

test("spliceSection — recovers from a torn write (orphaned lone BEGIN marker)", () => {
  const torn = "# PATHS\n\ncontent\n\n" + BEGIN + "\nhalf-written";
  const block = buildGalaxyBlock("cad", storesForGalaxy(MANIFEST, "cad"));
  const fixed = spliceSection(torn, block);
  assert.equal((fixed.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
  assert.equal((fixed.match(new RegExp(END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
});

test("spliceSection — CHURN-FREE: does NOT move my block when a sibling block was appended after it", () => {
  // simulate charlie's wire-vendor-corpus appending its (different-marker) block AFTER ours
  const myBlock = buildGalaxyBlock("cam", storesForGalaxy(MANIFEST, "cam"));
  const sibling = "<!-- BEGIN:vendor-catalog-corpus -->\n## vendor corpus\n<!-- END:vendor-catalog-corpus -->";
  const content = "# PATHS\n\nbody\n\n" + myBlock + "\n\n" + sibling + "\n";
  const after = spliceSection(content, myBlock);
  assert.equal(after, content, "my block present verbatim → no-op, must NOT drag it past the sibling");
  // and my block stays ABOVE the sibling (no reorder)
  assert.ok(after.indexOf("registered-db-intake") < after.indexOf("vendor-catalog-corpus"));
});

test("spliceSection — re-appends when my block CONTENT changed (not a spurious move)", () => {
  const oldBlock = buildGalaxyBlock("cam", storesForGalaxy(MANIFEST, "cam"));
  const newBlock = buildGalaxyBlock("mill", storesForGalaxy(MANIFEST, "mill")); // different content
  const content = "# x\n\n" + oldBlock + "\n";
  const after = spliceSection(content, newBlock);
  assert.ok(after.includes("the mill galaxy consumes") && !after.includes("the cam galaxy consumes"));
});

test("spliceSection — CRLF content does not produce duplicate or torn blocks", () => {
  const before = "# PATHS\r\n\r\ncontent\r\n";
  const block = buildGalaxyBlock("lathe", storesForGalaxy(MANIFEST, "lathe"));
  const once = spliceSection(before, block);
  const twice = spliceSection(once, block);
  assert.equal(twice, once, "CRLF input must still be idempotent");
});
