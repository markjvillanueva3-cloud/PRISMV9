// scripts/lib/cag-cold-sources-domains.test.mjs
// Run: node scripts/lib/cag-cold-sources-domains.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { domainColdSources, DOMAIN_COLD_GALAXIES } from "./cag-cold-sources-domains.mjs";
import { COLD_SOURCES, coldSourcesFor, classifyQuery } from "./cag-router.mjs";

const GALAXIES = ["cad", "post-processor", "mill", "wedm", "lathe", "cam"];

// ---- shape + non-fabrication ----

test("domainColdSources returns one entry per domain with the COLD_SOURCES shape", () => {
  const ds = domainColdSources({});
  assert.equal(ds.length, GALAXIES.length);
  for (const e of ds) {
    assert.equal(typeof e.id, "string");
    assert.match(e.id, /-doctrine$/);
    assert.equal(typeof e.path, "string");
    assert.ok(Array.isArray(e.keywords) && e.keywords.length > 0, `keywords for ${e.id}`);
    assert.equal(typeof e.coldRationale, "string");
    assert.ok(Number.isFinite(e.sizeBytes) && e.sizeBytes > 0);
  }
  assert.deepEqual([...DOMAIN_COLD_GALAXIES], GALAXIES);
});

test("NON-FABRICATION: every anchored MEMORY.md path actually exists on disk", () => {
  // The whole point is to anchor EXISTING curated doctrine. A bad path would cache nothing
  // (or throw in the inject hook). This fails loud if a galaxy MEMORY.md is missing/renamed.
  for (const e of domainColdSources({})) {
    assert.ok(existsSync(e.path), `${e.id} -> missing file ${e.path}`);
  }
});

test("ids are <galaxy>-doctrine and unique", () => {
  const ids = domainColdSources({}).map((e) => e.id);
  assert.deepEqual(ids, GALAXIES.map((g) => `${g}-doctrine`));
  assert.equal(ids.length, new Set(ids).size);
});

test("keywords are non-empty lowercase strings, no per-entry dupes", () => {
  for (const e of domainColdSources({})) {
    const seen = new Set();
    for (const k of e.keywords) {
      assert.equal(typeof k, "string");
      assert.ok(k.length > 0);
      assert.equal(k, k.toLowerCase(), `keyword "${k}" in ${e.id} must be lowercase`);
      assert.ok(!seen.has(k), `dup keyword "${k}" in ${e.id}`);
      seen.add(k);
    }
  }
});

// ---- kill switch ----

test("PRISM_CAG_DOMAIN_COLD_DISABLE=1 returns [] (reversible)", () => {
  assert.deepEqual(domainColdSources({ PRISM_CAG_DOMAIN_COLD_DISABLE: "1" }), []);
});

// ---- integration with cag-router COLD_SOURCES (no regression) ----

test("COLD_SOURCES includes the 6 domain anchors AND keeps the base global anchors", () => {
  const ids = COLD_SOURCES.map((s) => s.id);
  for (const g of GALAXIES) assert.ok(ids.includes(`${g}-doctrine`), `missing ${g}-doctrine`);
  // base anchors must survive (no regression)
  for (const base of ["claude-md", "memory-md", "engine-digest", "dispatcher-digest", "physics-constants", "wiki-index", "tribal-tips", "galaxy-cards", "galaxy-digest"]) {
    assert.ok(ids.includes(base), `base anchor ${base} lost`);
  }
  assert.equal(ids.length, new Set(ids).size, "duplicate COLD_SOURCES id");
});

// ---- round-trip recall: a domain query must auto-recall that domain's doctrine ----

// coldSourcesFor returns an array of PATH strings; classifyQuery returns
// { tier:"COLD"|"HOT"|"HYBRID", evidence:["COLD:<id> matched [...]"], coldSources:[paths] }.
const pulls = (query, galaxy) =>
  (coldSourcesFor(query) || []).some((p) => String(p).includes(`/${galaxy}/MEMORY.md`));

test("a lathe query auto-recalls the lathe doctrine via the cold tier", () => {
  assert.ok(pulls("lathe turning g50 css chuck jaw force boring bar", "lathe"), "lathe MEMORY.md not recalled");
});

test("a wedm query recalls wedm doctrine (and NOT lathe doctrine)", () => {
  const q = "wedm wire edm sodick dielectric flush wire break";
  assert.ok(pulls(q, "wedm"), "wedm MEMORY.md not recalled");
  assert.ok(!pulls(q, "lathe"), "wedm query must not pull lathe doctrine");
});

test("classifyQuery on a mill query is COLD/HYBRID and surfaces mill doctrine", () => {
  const r = classifyQuery("mill domain trochoidal chip thinning stability lobe");
  assert.ok(["COLD", "HYBRID"].includes(r.tier), `tier=${r.tier}`);
  const hit =
    (r.coldSources || []).some((p) => String(p).includes("/mill/MEMORY.md")) ||
    (r.evidence || []).some((e) => String(e).includes("mill-doctrine"));
  assert.ok(hit, `expected mill-doctrine in ${JSON.stringify(r.evidence)}`);
});

// ---- adversarial: a non-domain doctrine query must NOT pull a domain anchor ----

test("ADVERSARIAL: a pure-doctrine query (scrutiny gate) does not pull any domain anchor", () => {
  for (const g of GALAXIES) {
    assert.ok(!pulls("scrutiny 3-of-3 gate handoff naming karpathy fail-loud", g), `${g} doctrine over-matched a generic doctrine query`);
  }
});

// REGRESSION GUARD (scrutiny arm C P1, 2026-06-28): generic-English / frontend prose containing
// words that were WRONGLY domain keywords (css/turning/groove/chatter/esprit/boring bar/tool crib/
// thread pass/skim pass/spark gap) must NOT classify COLD on a domain anchor -- a COLD verdict
// suppresses master-index/memory/tribal recall downstream. Each of these previously over-matched.
test("REGRESSION GUARD: benign prose does NOT pull a domain anchor (no recall suppression)", () => {
  const benign = [
    "css styling for the web frontend",
    "the turning point of the project this quarter",
    "the boring bar chart in the dashboard",
    "skim pass over the server logs",
    "check the spark gap in the wiring diagram",
    "esprit de corps on the team",
    "chatter between the agents on the bus",
    "thread pass the auth token through middleware",
    "the tool crib of dev utilities",
    "a groove music playlist",
    "end mill the meeting agenda early",
    "face mill at the lobby",
    "rest machining schedule for the team next sprint",
    "battery discharge energy levels are low",
  ];
  for (const q of benign) {
    const r = classifyQuery(q);
    const domainHit = (r.coldSources || []).some((p) => /\/engines\/[^/]+\/MEMORY\.md$/.test(String(p)));
    assert.ok(!domainHit, `"${q}" wrongly pulled a domain anchor (tier=${r.tier} conf=${r.confidence}; ${JSON.stringify(r.coldSources)})`);
  }
});
