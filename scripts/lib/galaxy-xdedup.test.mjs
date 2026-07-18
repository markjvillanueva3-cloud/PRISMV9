// scripts/lib/galaxy-xdedup.test.mjs — U-GCF-XDEDUP hermetic test suite (node:test).
// Run: node --test scripts/lib/galaxy-xdedup.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardDomainFacts,
  memoryFactLines,
  jaccard,
  clusterDuplicates,
  selectCanonical,
  estClusterSavings,
  loadGalaxyFacts,
  xdedup,
  MIN_FACT_TOKENS,
} from "./galaxy-xdedup.mjs";

// ── cardDomainFacts ───────────────────────────────────────────────────────────
const CARD = [
  "## wedm — Wire EDM Wizard",
  "- **UP (pull):** recall",
  "- **Last master-sync:** 2026-05-29",
  "1. **discharge physics** — spark gap dielectric flushing controls the cut",
  "2. **wire tension** — tension affects taper accuracy and breakage risk",
].join("\n");

test("cardDomainFacts: returns domain facts after the master-sync boundary, skips boilerplate", () => {
  const f = cardDomainFacts(CARD);
  assert.equal(f.length, 2);
  assert.match(f[0], /discharge physics/);
  assert.ok(!f.some((x) => /UP \(pull|master-sync/.test(x)));
});

// ── memoryFactLines ─────────────────────────────────────────────────────────────
const MEMORY = [
  "# WEDM Galaxy Memory",
  "## Master-brain link",
  "- **UP (pull):** recall",
  "- recall: prism_memory:semantic_search",
  "## Domain facts",
  "- discharge spark gap dielectric flushing controls the cut quality",
  "- Parent doctrine: state/shared/specs/DOMAIN-GALAXY-DOCTRINE applies here too",
  "plain prose line not a bullet — ignored",
  "- short one",  // below MIN_FACT_TOKENS → ignored
].join("\n");

test("memoryFactLines: bullet/numbered facts only; skips master-brain section, headers, prose, short lines", () => {
  const f = memoryFactLines(MEMORY);
  assert.ok(f.some((x) => /discharge spark gap/.test(x)));
  assert.ok(!f.some((x) => /Parent doctrine/.test(x)), "Parent doctrine scaffold line excluded (DOCTRINE_SCAFFOLD, U-GCF-XDEDUP-SCAFFOLD)");
  assert.ok(!f.some((x) => /UP \(pull|recall:/.test(x)), "master-brain section excluded");
  assert.ok(!f.some((x) => /plain prose/.test(x)), "non-bullet prose excluded");
  assert.ok(!f.some((x) => /short one/.test(x)), "below MIN_FACT_TOKENS excluded");
});

// FAIL-ON-REVERT: bullet-styled lines INSIDE a ``` code fence are NOT domain facts (would pollute dedup).
test("memoryFactLines: bullets inside a code fence are excluded", () => {
  const md = [
    "## facts",
    "- a real domain fact with plenty of tokens to clear the floor",
    "```bash",
    "- this is a shell list line, not a fact, with enough tokens to clear",
    "```",
    "- another real domain fact with plenty of tokens to clear it too",
  ].join("\n");
  const f = memoryFactLines(md);
  assert.ok(f.some((x) => /real domain fact/.test(x)));
  assert.ok(f.some((x) => /another real domain fact/.test(x)));
  assert.ok(!f.some((x) => /shell list line/.test(x)), "fenced code bullet must be excluded");
});

test("memoryFactLines: maxPerDoc caps extraction (90KB-brain guard)", () => {
  const many = ["## facts"].concat(Array.from({ length: 200 }, (_, i) => `- fact number ${i} with enough tokens here`)).join("\n");
  assert.equal(memoryFactLines(many, { maxPerDoc: 50 }).length, 50);
});

test("memoryFactLines drops DOMAIN-GALAXY-DOCTRINE scaffold lines (xdedup false-positive guard)", () => {
  const mem = [
    "## quoting galaxy",
    "- Parent doctrine: [`state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](x)",
    "- Companion sibling indexes: `../post-processor/MEMORY.md`, `../business/MEMORY.md`",
    "- Migration unit: `U-GALAXY-MS1-C1-PER-GALAXY-MEMORY-MIGRATE`",
    "- Soul assignment: `U-GALAXY-MS1-D3-WEDM-LATHE-SOUL-ASSIGN`",
    "- Quotes route print -> multi-process pricing via DocuStrata cost tables and quote-vs-actual reconcile",
  ].join("\n");
  const facts = memoryFactLines(mem);
  // the 4 scaffold lines are excluded; only the genuine domain fact survives
  assert.ok(!facts.some((f) => /Parent doctrine|Companion sibling|Migration unit|Soul assignment/i.test(f)), "scaffold lines must be dropped");
  assert.ok(facts.some((f) => /DocuStrata|quote-vs-actual/i.test(f)), "genuine domain fact must survive");
});

// ── jaccard ─────────────────────────────────────────────────────────────────────
test("jaccard: identical=1, disjoint=0, partial in (0,1), empty=0; Set or array", () => {
  assert.equal(jaccard(["a", "b", "c"], ["a", "b", "c"]), 1);
  assert.equal(jaccard(["a", "b"], ["c", "d"]), 0);
  const p = jaccard(["a", "b", "c", "d"], ["a", "b", "x", "y"]); // inter 2 / union 6
  assert.ok(Math.abs(p - 2 / 6) < 1e-9);
  assert.equal(jaccard([], ["a"]), 0);
  assert.equal(jaccard(new Set(["a", "b"]), ["a", "b"]), 1);
});

// ── clusterDuplicates ─────────────────────────────────────────────────────────
test("clusterDuplicates: clusters near-dup facts spanning ≥2 galaxies, sorted by galaxy-count", () => {
  const facts = [
    { galaxy: "mill", fact: "Parent doctrine state shared specs domain galaxy doctrine applies" },
    { galaxy: "lathe", fact: "Parent doctrine state shared specs domain galaxy doctrine applies" },
    { galaxy: "wedm", fact: "Parent doctrine state shared specs domain galaxy doctrine applies" },
    { galaxy: "quoting", fact: "totally unrelated pricing margin cost estimation quote logic" },
  ];
  const c = clusterDuplicates(facts, { threshold: 0.6 });
  assert.equal(c.length, 1); // the unrelated fact is a singleton → dropped (needs ≥2 galaxies)
  assert.equal(c[0].galaxies.length, 3);
  assert.deepEqual(c[0].galaxies.slice().sort(), ["lathe", "mill", "wedm"]);
});

// FAIL-ON-REVERT: an intra-galaxy repeat (same galaxy twice) is NOT a cross-galaxy duplicate.
test("clusterDuplicates: same fact repeated within ONE galaxy is NOT a cross-dup", () => {
  const facts = [
    { galaxy: "mill", fact: "identical fact tokens alpha beta gamma delta epsilon" },
    { galaxy: "mill", fact: "identical fact tokens alpha beta gamma delta epsilon" },
  ];
  assert.deepEqual(clusterDuplicates(facts, { threshold: 0.6 }), []);
});

test("clusterDuplicates: below-threshold facts do NOT cluster; non-array → []", () => {
  const facts = [
    { galaxy: "a", fact: "one two three four five six seven" },
    { galaxy: "b", fact: "completely different nine ten eleven twelve thirteen" },
  ];
  assert.deepEqual(clusterDuplicates(facts, { threshold: 0.6 }), []);
  assert.deepEqual(clusterDuplicates(null), []);
});

// ── selectCanonical ─────────────────────────────────────────────────────────────
test("selectCanonical: highest INDEX salience wins; tie-break alpha; empty→null", () => {
  const cluster = { galaxies: ["mill", "quoting", "lathe"] };
  assert.equal(selectCanonical(cluster, { mill: 5, quoting: 7.6, lathe: 4 }), "quoting");
  assert.equal(selectCanonical({ galaxies: ["b", "a"] }, {}), "a"); // no salience → alpha tie-break
  assert.equal(selectCanonical({ galaxies: [] }), null);
});

// ── estClusterSavings ─────────────────────────────────────────────────────────
test("estClusterSavings: (n-1)×(avgTokens-pointer); <2 facts → 0; never negative", () => {
  const cluster = { facts: [
    { galaxy: "a", fact: "alpha beta gamma delta epsilon zeta eta theta" },
    { galaxy: "b", fact: "alpha beta gamma delta epsilon zeta eta theta" },
    { galaxy: "c", fact: "alpha beta gamma delta epsilon zeta eta theta" },
  ] };
  assert.ok(estClusterSavings(cluster) > 0); // 3 copies of an 8-token fact → keep 1, replace 2 with pointers
  assert.equal(estClusterSavings({ facts: [{ galaxy: "a", fact: "x y z w" }] }), 0); // single → 0
  assert.equal(estClusterSavings({ facts: [{ galaxy: "a", fact: "a b" }, { galaxy: "b", fact: "a b" }] }), 0); // tiny → max(0,...)
});

// ── loadGalaxyFacts ─────────────────────────────────────────────────────────────
test("loadGalaxyFacts: memories source (injected readdir/read) + salienceMap from INDEX", () => {
  const dirs = [{ name: "mill", isDirectory: () => true }, { name: "wedm", isDirectory: () => true }];
  const files = {
    "/eng/mill/MEMORY.md": "## f\n- mill domain fact one with enough tokens here now",
    "/eng/wedm/MEMORY.md": "## f\n- wedm domain fact one with enough tokens here now",
    "/idx": JSON.stringify({ cards: [{ galaxy: "mill", salience: 5 }, { galaxy: "wedm", salience: 7 }] }),
  };
  const r = loadGalaxyFacts({ source: "memories", roots: { enginesDir: "/eng" }, indexPath: "/idx", readdirImpl: () => dirs, readImpl: (f) => files[f] ?? null });
  assert.equal(r.facts.length, 2);
  assert.deepEqual(r.facts.map((f) => f.galaxy).sort(), ["mill", "wedm"]);
  assert.equal(r.salienceMap.wedm, 7);
});

test("loadGalaxyFacts: cards source path", () => {
  const r = loadGalaxyFacts({ source: "cards", cards: [{ galaxy: "wedm", text: CARD }], readImpl: () => null });
  assert.ok(r.facts.length >= 2 && r.facts.every((f) => f.galaxy === "wedm"));
});

// ── xdedup orchestrator (hermetic) ───────────────────────────────────────────────
function hermeticXdedup(extra = {}) {
  const writes = {};
  const facts = [
    { galaxy: "mill", fact: "Parent doctrine state shared specs domain galaxy doctrine applies here" },
    { galaxy: "lathe", fact: "Parent doctrine state shared specs domain galaxy doctrine applies here" },
    { galaxy: "quoting", fact: "Parent doctrine state shared specs domain galaxy doctrine applies here" },
  ];
  const res = xdedup({
    roots: { cardsDir: "/cards" }, reportPath: "/cards/DEDUP-REPORT.json",
    facts, salienceMap: { quoting: 7.6, mill: 5, lathe: 4 }, threshold: 0.6,
    writeImpl: (f, d) => { writes[f] = d; }, now: () => 1735689600000, ...extra,
  });
  return { res, writes };
}

test("xdedup: writes DEDUP-REPORT.json; canonical = highest salience; duplicateGalaxies excludes canonical", () => {
  const { res, writes } = hermeticXdedup();
  assert.equal(res.ok, true);
  assert.equal(res.written, true);
  assert.equal(res.clusterCount, 1);
  const j = JSON.parse(writes["/cards/DEDUP-REPORT.json"]);
  assert.equal(j.schemaVersion, "1.0.0");
  assert.equal(j.clusters[0].canonical, "quoting"); // highest salience
  assert.ok(!j.clusters[0].duplicateGalaxies.includes("quoting"));
  assert.deepEqual(j.clusters[0].duplicateGalaxies.slice().sort(), ["lathe", "mill"]);
});

test("xdedup: SINGLE-WRITER — only DEDUP-REPORT.json, never INDEX.json / a MEMORY.md", () => {
  const { writes } = hermeticXdedup();
  assert.deepEqual(Object.keys(writes), ["/cards/DEDUP-REPORT.json"]);
  for (const p of Object.keys(writes)) { assert.ok(!/INDEX\.json$/i.test(p)); assert.ok(!/MEMORY\.md$/i.test(p)); }
});

test("xdedup: no facts → no-facts; disabled knob; write-error fail-soft; null opts no throw", () => {
  assert.equal(xdedup({ facts: [], writeImpl: () => {} }).reason, "no-facts");
  const prev = process.env.PRISM_GCF_XDEDUP_DISABLE;
  process.env.PRISM_GCF_XDEDUP_DISABLE = "1";
  try { assert.equal(hermeticXdedup({ writeImpl: () => { throw new Error("x"); } }).res.disabled, true); }
  finally { if (prev === undefined) delete process.env.PRISM_GCF_XDEDUP_DISABLE; else process.env.PRISM_GCF_XDEDUP_DISABLE = prev; }
  assert.equal(hermeticXdedup({ writeImpl: () => { throw new Error("disk"); } }).res.reason, "write-error");
  assert.doesNotThrow(() => xdedup(null));
});

// ── LIVE soft integration ──────────────────────────────────────────────────────
test("LIVE: real galaxy memories → dup clusters; canonical never in its own duplicateGalaxies", () => {
  let captured = null;
  const res = xdedup({ writeImpl: (_f, d) => { captured = d; } });
  if (!res.ok || res.reason === "no-facts") { console.log("  (skipped — no live memories)"); return; }
  const j = JSON.parse(captured);
  for (const c of j.clusters) {
    assert.ok(c.galaxies.length >= 2, "every cluster spans ≥2 galaxies");
    assert.ok(!c.duplicateGalaxies.includes(c.canonical), "canonical must not be in its own duplicates");
  }
});
