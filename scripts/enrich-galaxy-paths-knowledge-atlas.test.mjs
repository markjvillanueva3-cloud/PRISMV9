// Tests for the galaxy PATHS.md knowledge-atlas enricher. R9: assertions encode WHY
// (uniform routing, no-fabrication, idempotency, no-clobber). Pure -- injected exists
// probe, no filesystem writes.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAtlasBlock,
  upsertBlock,
  listGalaxies,
  BEGIN,
  END,
} from "./enrich-galaxy-paths-knowledge-atlas.mjs";

const allExist = () => true;
const noneExist = () => false;
const count = () => 7;

test("buildAtlasBlock: includes markers, galaxy name, and the UNIFORM recall routing", () => {
  const b = buildAtlasBlock("mill", { exists: allExist, count });
  assert.ok(b.startsWith(BEGIN));
  assert.ok(b.trimEnd().endsWith(END));
  // uniform recall routing -- identical contract for every galaxy
  assert.match(b, /semantic_search query="mill"/);
  assert.match(b, /galaxy-reasoning-bridge\.mjs mill/);
  assert.match(b, /UP \(pull from master\)/);
  assert.match(b, /DOWN \(push to master\)/);
});

test("buildAtlasBlock: plots ALL resources via INDEX + usage (every pdf/file reachable, search-not-rescan)", () => {
  const b = buildAtlasBlock("mill", { exists: allExist, count });
  assert.match(b, /resources\/RESOURCES-INDEX\.md/);                 // trove index
  assert.match(b, /jm-die-database/);                                // 38K shop files
  assert.match(b, /Docustrata\/\.index/);                            // 257K business docs
  assert.match(b, /vendor-catalog-db\/manifest\.json/);              // vendor catalogs
  assert.match(b, /database_search|globalSearch/);                   // USAGE: query every resource
  assert.match(b, /never re-scan|NEVER re-OCR|do NOT re-OCR/i);      // R8 discipline surfaced
});

test("buildAtlasBlock: plots wiki dir + synthesis brain when they EXIST", () => {
  const b = buildAtlasBlock("lathe", { exists: allExist, count });
  assert.match(b, /knowledge\/wiki\/lathe\//);
  assert.match(b, /knowledge\/memories\/patterns\/lathe_synthesis\.md/);
});

test("buildAtlasBlock: R12 no-fabrication -- omits surfaces that DON'T exist", () => {
  const b = buildAtlasBlock("ghostdomain", { exists: noneExist, count });
  assert.doesNotMatch(b, /knowledge\/wiki\/ghostdomain\//); // wiki dir absent -> not plotted
  assert.doesNotMatch(b, /ghostdomain_synthesis\.md/);      // synthesis absent -> not plotted
  // but the uniform recall routing (commands, not file paths) is still present
  assert.match(b, /semantic_search query="ghostdomain"/);
});

test("buildAtlasBlock: routing is IDENTICAL across galaxies (only the name token differs)", () => {
  const a = buildAtlasBlock("mill", { exists: allExist, count });
  const c = buildAtlasBlock("wedm", { exists: allExist, count });
  const norm = (s, g) => s.replaceAll(g, "<G>");
  assert.equal(norm(a, "mill"), norm(c, "wedm")); // same routing shape -> "routed the same way for each domain"
});

test("upsertBlock: appends when no block present (additive, keeps existing body)", () => {
  const body = "# mill PATHS\n\n## Engines\n- foo.ts\n";
  const block = buildAtlasBlock("mill", { exists: allExist, count });
  const out = upsertBlock(body, block);
  assert.ok(out.includes("## Engines")); // existing content preserved
  assert.ok(out.includes(BEGIN));
});

test("upsertBlock: REPLACES an existing block, never duplicates it", () => {
  const block1 = buildAtlasBlock("mill", { exists: allExist, count });
  const body = "# x\n\n" + block1 + "\n";
  const block2 = buildAtlasBlock("mill", { exists: noneExist, count }); // different content
  const out = upsertBlock(body, block2);
  assert.equal((out.match(new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1); // exactly one block
  assert.ok(out.includes(block2));
});

test("upsertBlock: IDEMPOTENT -- upsert(upsert(x)) === upsert(x)", () => {
  const body = "# mill\n\nbody text\n";
  const block = buildAtlasBlock("mill", { exists: allExist, count });
  const once = upsertBlock(body, block);
  const twice = upsertBlock(once, block);
  assert.equal(twice, once);
});

test("upsertBlock: never touches content OUTSIDE the markers (no-clobber)", () => {
  const hand = "## Hand-built mill wiki\n- knowledge/wiki/architecture/actions/calc/kienzle-milling.md\n";
  const body = "# mill\n\n" + hand + "\n";
  const block = buildAtlasBlock("mill", { exists: allExist, count });
  const out = upsertBlock(body, block);
  assert.ok(out.includes(hand)); // the hand-built section survives untouched
});

test("listGalaxies: returns a sorted non-empty set of real galaxies with PATHS.md", () => {
  const gs = listGalaxies();
  assert.ok(Array.isArray(gs));
  assert.ok(gs.length >= 30, "expected >=30 galaxies, got " + gs.length);
  assert.ok(gs.includes("mill") && gs.includes("bug-hunting"));
  assert.deepEqual(gs, [...gs].sort()); // stable order -> deterministic runs
});
