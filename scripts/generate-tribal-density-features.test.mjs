// scripts/generate-tribal-density-features.test.mjs
//
// Tests for G5 tribal-density heatmap generator. node --test runner.
//
// Coverage: >=3 failure modes + >=2 adversarial cases per
// SYSTEM-VIZ-HIGH-ROI-MS0/U-VIZ-TRIBAL-DENSITY.
//
// Run: node --test scripts/generate-tribal-density-features.test.mjs
//
// Authored 2026-05-21 sierra (claude-e6145e8b).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  parseTipFrontmatter,
  classifyDensity,
  densityNodeId,
  listMarkdownFiles,
  ROOST_ID,
  HOT_THRESHOLD,
  WARM_THRESHOLD,
} from "./generate-tribal-density-features.mjs";

// ---------- failure-mode 1: non-array tipFiles throws ----------
test("generate() throws TypeError when tipFiles is not an array", () => {
  assert.throws(
    () => generate({ tipFiles: null, readTip: () => "" }),
    TypeError
  );
  assert.throws(
    () => generate({ tipFiles: "not-an-array", readTip: () => "" }),
    TypeError
  );
});

// ---------- failure-mode 2: missing readTip throws ----------
test("generate() throws TypeError when readTip is not a function", () => {
  assert.throws(
    () => generate({ tipFiles: [], readTip: undefined }),
    TypeError
  );
});

// ---------- failure-mode 3: malformed frontmatter -> counted, not crashed ----------
test("parseTipFrontmatter returns null on missing/malformed frontmatter", () => {
  assert.equal(parseTipFrontmatter(""), null);
  assert.equal(parseTipFrontmatter(null), null);
  assert.equal(parseTipFrontmatter("no frontmatter here"), null);
  // Opening --- but no closing fence.
  assert.equal(parseTipFrontmatter("---\ndomain: mill\n(never closes)"), null);
});

test("generate() buckets unparseable tips into tipsMalformed without aborting", () => {
  const tipFiles = ["a.md", "b.md", "c.md"];
  const readTip = (f) => {
    if (f === "a.md") return "---\ndomain: mill\n---\nbody";
    if (f === "b.md") return "garbage no frontmatter";   // malformed
    throw new Error("EBUSY simulated");                   // c.md read fails
  };
  const r = generate({ tipFiles, readTip });
  assert.equal(r.stats.tipsParsed, 1, "only a.md parsed");
  assert.equal(r.stats.tipsMalformed, 2, "b.md + c.md counted malformed");
  assert.equal(r.stats.domainsTotal, 1);
});

// ---------- adversarial 1: density band boundaries ----------
test("classifyDensity respects hot/warm/cold/desert boundaries exactly", () => {
  assert.equal(classifyDensity(0), "desert");
  assert.equal(classifyDensity(1), "cold");
  assert.equal(classifyDensity(WARM_THRESHOLD - 1), "cold");   // 4 -> cold
  assert.equal(classifyDensity(WARM_THRESHOLD), "warm");        // 5 -> warm
  assert.equal(classifyDensity(HOT_THRESHOLD - 1), "warm");     // 9 -> warm
  assert.equal(classifyDensity(HOT_THRESHOLD), "hot");          // 10 -> hot
  assert.equal(classifyDensity(1000), "hot");
  // Non-numeric / negative -> desert (R12 fail-safe, not a throw).
  assert.equal(classifyDensity(-3), "desert");
  assert.equal(classifyDensity(NaN), "desert");
  assert.equal(classifyDensity("5"), "desert");
});

// ---------- adversarial 2: domain id collision disambiguation ----------
test("densityNodeId disambiguates domains that slug-normalize identically", () => {
  // "mill-dev" and "mill_dev" both slug to "mill-dev" but the FNV hash of
  // the original strings differs, so node ids must NOT collide.
  const id1 = densityNodeId("mill-dev");
  const id2 = densityNodeId("mill_dev");
  assert.notEqual(id1, id2, "distinct originals must produce distinct ids");
  // Same input -> same id (deterministic).
  assert.equal(densityNodeId("mill-dev"), id1);
  // Empty / null -> stable fallback, never throws.
  assert.ok(densityNodeId("").startsWith("ghost.tribal_density."));
  assert.ok(densityNodeId(null).startsWith("ghost.tribal_density."));
});

// ---------- adversarial 3: frontmatter with array values is skipped ----------
test("parseTipFrontmatter skips array/object values but keeps scalars", () => {
  const fm = parseTipFrontmatter("---\nname: foo\ntags: [a, b, c]\ndomain: lathe\n---\nbody");
  assert.equal(fm.name, "foo");
  assert.equal(fm.domain, "lathe");
  assert.equal(fm.tags, undefined, "array value must be skipped, not stored as string");
});

// ---------- end-to-end: roost + children + band tally ----------
test("generate() emits roost + ranked domain children with correct band tally", () => {
  // Construct 18 tips: 10 mill (hot), 5 lathe (warm), 2 cad (cold), 1 no-domain.
  const tipFiles = [];
  const domainOf = {};
  for (let i = 0; i < 10; i++) { tipFiles.push(`mill${i}.md`); domainOf[`mill${i}.md`] = "mill"; }
  for (let i = 0; i < 5; i++)  { tipFiles.push(`lathe${i}.md`); domainOf[`lathe${i}.md`] = "lathe"; }
  for (let i = 0; i < 2; i++)  { tipFiles.push(`cad${i}.md`); domainOf[`cad${i}.md`] = "cad"; }
  tipFiles.push("orphan.md"); // no domain field
  const readTip = (f) => {
    const d = domainOf[f];
    return d ? `---\nname: ${f}\ndomain: ${d}\n---\nbody` : `---\nname: orphan\n---\nbody`;
  };
  const r = generate({ tipFiles, readTip });

  assert.equal(r.stats.tipsParsed, 18);
  assert.equal(r.stats.tipsMalformed, 0);
  assert.equal(r.stats.domainsTotal, 4, "mill, lathe, cad, _unscoped");

  // Roost present.
  const roost = r.newNodes.find((n) => n.id === ROOST_ID);
  assert.ok(roost, "roost emitted");
  assert.equal(roost.kind, "ghost-roost");
  assert.equal(roost.parent, "ghost.planned_features");

  // 4 domain children.
  const children = r.newNodes.filter((n) => n.kind === "tribal-density-bucket");
  assert.equal(children.length, 4);
  // Band tally: mill=hot, lathe=warm, cad=cold, _unscoped(1)=cold.
  assert.equal(r.stats.bandTally.hot, 1);
  assert.equal(r.stats.bandTally.warm, 1);
  assert.equal(r.stats.bandTally.cold, 2);

  // Children carry tip_count + density_band fields.
  const millChild = children.find((c) => c.label.startsWith("mill:"));
  assert.equal(millChild.tip_count, 10);
  assert.equal(millChild.density_band, "hot");
});

test("generate() honors topN cap and skips already-present node ids", () => {
  const tipFiles = ["a.md", "b.md", "c.md"];
  const readTip = (f) => `---\ndomain: dom-${f}\n---\nx`;
  // topN=1 -> only the top-ranked domain becomes a child (all tie at 1, so 1 of 3).
  const r = generate({ tipFiles, readTip, topN: 1 });
  assert.equal(r.stats.childrenEmitted, 1);
  assert.equal(r.stats.topN, 1);

  // Pre-seed the roost id -> roost not re-emitted.
  const r2 = generate({ tipFiles, readTip, existingNodeIds: [ROOST_ID] });
  assert.equal(r2.stats.roostEmitted, 0);
  assert.ok(!r2.newNodes.some((n) => n.id === ROOST_ID));
});

// ---------- listMarkdownFiles — injectable fs ----------
test("listMarkdownFiles walks tree, skips dot-dirs + non-md files", () => {
  const tree = {
    "/root": ["a.md", "b.txt", "sub", ".hidden"],
    "/root/sub": ["c.md", "d.md"],
    "/root/.hidden": ["e.md"],   // must NOT be visited
  };
  const dirSet = new Set(["/root", "/root/sub", "/root/.hidden"]);
  // join() yields backslashes on Windows — normalize before fixture lookup
  // so the test is platform-agnostic (production uses real fs, unaffected).
  const fwd = (p) => p.replace(/\\/g, "/");
  const readdir = (d) => tree[fwd(d)] ?? [];
  const stat = (p) => ({ isDirectory: () => dirSet.has(fwd(p)) });
  const files = listMarkdownFiles("/root", { readdir, stat });
  const norm = files.map((f) => f.replace(/\\/g, "/")).sort();
  assert.deepEqual(norm, ["/root/a.md", "/root/sub/c.md", "/root/sub/d.md"]);
});
