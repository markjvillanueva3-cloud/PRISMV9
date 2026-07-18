// scripts/lib/octopus-corpus-loader.test.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1 — corpus loader tests (hermetic).
//
// Tests use a tmp fixture tree for the filesystem legs (wiki/memories/skills)
// so they never touch the live 13K-file knowledge dirs and never hit the
// network. The index legs (tribal + master_index) are exercised via
// loadPsnCorpora's real lazy import, but with a 2-token query that the
// architecture-graph fallback can satisfy quickly; we assert SHAPE not content
// there (the index legs are allowed to be empty — that's a valid fail-soft).
//
// Coverage:
//   happy path     — loader returns non-empty corpora for a known query
//   failure mode 1 — missing leg dir → skipped, no throw
//   failure mode 2 — empty query → {} + working rerank
//   failure mode 3 — budget-exceeded truncation drops bytes past the cap
//   adversarial 1  — oversized query (50KB) is bounded, returns
//   adversarial 2  — NaN/garbage/non-string query → {} (no throw)
//   adversarial 3  — leg path exists but is empty → skipped, no throw
//   rerank adapter — contract {candidate,score}, sorts, topK, garbage-safe

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_LEG_ROOTS,
  DEFAULT_MAX_FILES_PER_LEG,
  DOMAIN_CORPUS_ROOTS,
  PRIVATE_MEMORY_ROOT,
  buildMasterIndexSnippet,
  buildTribalSnippet,
  loadPsnCorpora,
  makeRerankAdapter,
  resolveMemoryRoots,
  truncateCorporaToBudget,
} from "./octopus-corpus-loader.mjs";

// -- fixture helpers ------------------------------------------------------

function makeFixtureRoots() {
  const base = mkdtempSync(join(tmpdir(), "octopus-corpus-"));
  const wiki = join(base, "wiki");
  const mem = join(base, "memories");
  const skills = join(base, "skills");
  const empty = join(base, "empty-leg");
  mkdirSync(wiki, { recursive: true });
  mkdirSync(mem, { recursive: true });
  mkdirSync(skills, { recursive: true });
  mkdirSync(empty, { recursive: true });
  // Filename-matched files (the prefilter prefers these) + body content.
  writeFileSync(join(wiki, "kienzle-cutting-force.md"),
    "# Kienzle\nThe Kienzle specific cutting force model estimates milling force from kc1.1 and the chip thickness exponent.\n");
  writeFileSync(join(wiki, "unrelated-topic.md"), "# Misc\nSomething about lunchroom scheduling.\n");
  writeFileSync(join(mem, "milling-force-memory.md"),
    "Milling cutting force tribal note: feed per tooth drives the Kienzle force linearly below the exponent knee.\n");
  writeFileSync(join(skills, "auto-speed-feed.md"),
    "Speed and feed advisor uses cutting force and material to pick the milling parameters.\n");
  return {
    base,
    roots: { wiki: [wiki], memories: [mem], skills: [skills] },
    emptyRoots: { wiki: [empty], memories: [empty], skills: [empty] },
    missingRoots: { wiki: [join(base, "does-not-exist")], memories: [join(base, "nope")], skills: [join(base, "ghost")] },
  };
}

// -- module shape ---------------------------------------------------------

test("DEFAULT_LEG_ROOTS names only the 5 TEXT legs (no NN/AI/OS/algo/formula)", () => {
  const keys = Object.keys(DEFAULT_LEG_ROOTS);
  assert.deepEqual(keys.sort(), ["memories", "skills", "wiki"]);
  // tribal + master_index are index-leg derived (no fs root) — proven by the
  // happy-path test seeing them as optional keys, never as a hallucinated leg.
  assert.ok(DEFAULT_MAX_FILES_PER_LEG >= 1);
});

// -- happy path -----------------------------------------------------------

test("happy path: returns non-empty fs-leg corpora for a known query", async () => {
  const fx = makeFixtureRoots();
  try {
    const { psnCorpora, rerank, meta } = await loadPsnCorpora(
      "Kienzle cutting force milling",
      { legRoots: fx.roots, modelBudget: 4000 },
    );
    assert.equal(typeof rerank, "function");
    // At least one fs leg must have produced candidates.
    const fsLegs = ["wiki", "memories", "skills"].filter((l) => Array.isArray(psnCorpora[l]) && psnCorpora[l].length > 0);
    assert.ok(fsLegs.length >= 1, `expected ≥1 fs leg, got: ${JSON.stringify(Object.keys(psnCorpora))}`);
    // The wiki Kienzle snippet must surface (filename + body both match).
    assert.ok(Array.isArray(psnCorpora.wiki) && psnCorpora.wiki.length > 0, "wiki leg expected");
    assert.match(psnCorpora.wiki.join(" "), /Kienzle/i);
    // Every candidate is a non-empty string.
    for (const leg of Object.values(psnCorpora)) {
      assert.ok(Array.isArray(leg));
      for (const c of leg) assert.ok(typeof c === "string" && c.length > 0);
    }
    assert.ok(meta.durationMs >= 0 && Number.isFinite(meta.durationMs));
    assert.ok(meta.totalBudget > 0);
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

// -- leg-starvation fix (smoke-test finding 2026-05-31) -------------------
// The real bug (index legs' 17s graph load starving the fs legs to 1/5) only
// reproduces against the live 543MB graph — proven empirically by the smoke
// test, not reproducible with fixtures. These tests deterministically lock in
// the two code-level guarantees the fix added: (a) fs legs populate regardless
// of the index stage, and (b) PRISM_OCTOPUS_SKIP_INDEX_LEGS=1 is an honest
// latency escape hatch that skips the expensive index legs entirely.

test("leg-starvation fix: a slow index stage does NOT starve the fs legs (fail-on-revert lock)", async () => {
  const fx = makeFixtureRoots();
  try {
    // Inject an index stage that deliberately overruns the deadline (800ms vs a
    // 500ms deadline). Under the OLD index-first order this consumed the whole
    // deadline and EVERY fs leg was then skipped with `deadline-before:<leg>` —
    // the production bug. Under the fix (fs legs run FIRST) the fs legs populate
    // before the slow stage runs. Reverting the reorder makes this assertion fail
    // (on a revert the real ~2.2s graph load also blows the 500ms deadline), so
    // this is a genuine regression lock, not a vacuous always-green test.
    const slowIndexLegs = async () => {
      await new Promise((r) => setTimeout(r, 800));
      return { tribal: [], master_index: [] };
    };
    const { psnCorpora, meta } = await loadPsnCorpora(
      "Kienzle cutting force milling",
      { legRoots: fx.roots, modelBudget: 4000, deadlineMs: 500, loadIndexLegs: slowIndexLegs },
    );
    assert.ok(Array.isArray(psnCorpora.wiki) && psnCorpora.wiki.length > 0, "wiki leg starved by slow index stage");
    assert.ok(Array.isArray(psnCorpora.memories) && psnCorpora.memories.length > 0, "memories leg starved");
    assert.ok(Array.isArray(psnCorpora.skills) && psnCorpora.skills.length > 0, "skills leg starved");
    // No deadline-before:<leg> marker for the fs legs — they ran before the slow stage.
    assert.ok(!meta.errors.some((e) => e.startsWith("deadline-before:")), `fs leg starved: ${JSON.stringify(meta.errors)}`);
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

test("leg-starvation fix: fs-first insertion order makes fs legs win the budget cap over index legs", () => {
  // truncateCorporaToBudget keeps whole candidates in insertion (leg) order until
  // the budget is spent, then stops. The reorder puts fs legs first, so under budget
  // pressure the cheap fs legs survive and the slow index legs are dropped. Here the
  // three fs candidates sum to exactly the 1500-byte budget → the index legs are
  // never reached. (Reverting to index-first would drop the fs legs instead.)
  const big = "x".repeat(500);
  const corpora = {
    wiki: [big, big],     // fs legs first (as the loader now inserts them)
    memories: [big],
    tribal: [big, big],   // index legs last
    master_index: [big],
  };
  const capped = truncateCorporaToBudget(corpora, 1500);
  assert.ok(Array.isArray(capped.wiki) && capped.wiki.length === 2, "wiki (fs) must survive the cap whole");
  assert.ok(Array.isArray(capped.memories) && capped.memories.length === 1, "memories (fs) must survive the cap");
  assert.equal(capped.tribal, undefined, "tribal (index) dropped under budget pressure");
  assert.equal(capped.master_index, undefined, "master_index (index) dropped under budget pressure");
});

test("leg-starvation fix: PRISM_OCTOPUS_SKIP_INDEX_LEGS=1 skips index legs, keeps fs legs", async () => {
  const fx = makeFixtureRoots();
  try {
    const { psnCorpora, meta } = await loadPsnCorpora(
      "Kienzle cutting force milling",
      { legRoots: fx.roots, modelBudget: 4000, env: { PRISM_OCTOPUS_SKIP_INDEX_LEGS: "1" } },
    );
    // fs legs still flow…
    assert.ok(Array.isArray(psnCorpora.wiki) && psnCorpora.wiki.length > 0, "wiki leg should survive the skip");
    // …but the index legs are explicitly skipped (never hallucinated as a leg).
    assert.equal(psnCorpora.tribal, undefined, "tribal must be absent when index legs skipped");
    assert.equal(psnCorpora.master_index, undefined, "master_index must be absent when index legs skipped");
    assert.ok(meta.errors.includes("index-legs:skipped-by-env"), `expected skip marker, got ${JSON.stringify(meta.errors)}`);
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

// -- failure mode 1: missing leg dir --------------------------------------

test("failure mode: missing leg dir is skipped, never throws", async () => {
  const fx = makeFixtureRoots();
  try {
    const { psnCorpora, meta } = await loadPsnCorpora(
      "Kienzle cutting force",
      { legRoots: fx.missingRoots, modelBudget: 4000 },
    );
    // No fs candidates (all dirs missing) — fs legs absent, no throw, no error spew.
    assert.equal(psnCorpora.wiki, undefined);
    assert.equal(psnCorpora.memories, undefined);
    assert.equal(psnCorpora.skills, undefined);
    assert.ok(Array.isArray(meta.errors)); // present, possibly empty (missing-dir is silent skip)
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

// -- failure mode 2: empty query ------------------------------------------

test("failure mode: empty query → {} corpora + a working rerank", async () => {
  const { psnCorpora, rerank, meta } = await loadPsnCorpora("", { modelBudget: 4000 });
  assert.deepEqual(psnCorpora, {});
  assert.equal(typeof rerank, "function");
  assert.ok(meta.errors.includes("empty-or-nonstring-query"));
  // The handed-back rerank still honors its contract.
  const out = rerank("q", ["q match", "no"], 1);
  assert.equal(out.length, 1);
  assert.equal(typeof out[0].candidate, "string");
  assert.equal(typeof out[0].score, "number");
});

// -- failure mode 3: budget-exceeded truncation ---------------------------

test("failure mode: total bytes never exceed the derived budget", async () => {
  const fx = makeFixtureRoots();
  try {
    // Tiny budget → MIN_TOTAL_CORPUS_BYTES floor (2000). Stuff many big files.
    const big = "Kienzle cutting force ".repeat(200); // ~4200 bytes each
    for (let i = 0; i < 12; i++) {
      writeFileSync(join(fx.roots.wiki[0], `kienzle-big-${i}.md`), `# Kienzle ${i}\n${big}\n`);
    }
    const { psnCorpora, meta } = await loadPsnCorpora(
      "Kienzle cutting force",
      { legRoots: fx.roots, modelBudget: 1 /* → floor 2000 */ },
    );
    let total = 0;
    for (const leg of Object.values(psnCorpora)) for (const c of leg) total += c.length;
    assert.ok(total <= meta.totalBudget, `total ${total} > budget ${meta.totalBudget}`);
    assert.ok(meta.totalBudget >= 2000); // MIN floor applied
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

test("truncateCorporaToBudget: drops candidates past the cap, keeps a fitting tail", () => {
  const corpora = { wiki: ["a".repeat(100), "b".repeat(100), "c".repeat(100)] };
  const out = truncateCorporaToBudget(corpora, 250);
  let total = 0;
  for (const leg of Object.values(out)) for (const c of leg) total += c.length;
  assert.ok(total <= 250);
  // First two whole (200) fit; the third is dropped or truncated to ≤50 — but
  // 50 < 80 room floor, so it's dropped. Expect exactly 2 kept.
  assert.equal(out.wiki.length, 2);
});

test("truncateCorporaToBudget: non-array / empty legs are skipped safely", () => {
  const out = truncateCorporaToBudget({ wiki: null, memories: [], skills: ["x"] }, 1000);
  assert.equal(out.wiki, undefined);
  assert.equal(out.memories, undefined);
  assert.deepEqual(out.skills, ["x"]);
  assert.deepEqual(truncateCorporaToBudget(null, 1000), {});
});

// -- adversarial 1: oversized query ---------------------------------------

test("adversarial: oversized 50KB query is bounded and still returns", async () => {
  const fx = makeFixtureRoots();
  try {
    const huge = "Kienzle cutting force " + "x".repeat(50000);
    const { psnCorpora, rerank } = await loadPsnCorpora(huge, { legRoots: fx.roots, modelBudget: 4000 });
    assert.equal(typeof rerank, "function");
    // Should not throw; should still find the Kienzle wiki snippet via tokens.
    assert.ok(Object.keys(psnCorpora).length >= 1);
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

// -- adversarial 2: garbage query -----------------------------------------

test("adversarial: NaN / number / null / object query → {} (no throw)", async () => {
  for (const bad of [NaN, 42, null, undefined, {}, [], true]) {
    const { psnCorpora, rerank, meta } = await loadPsnCorpora(bad, { modelBudget: 4000 });
    assert.deepEqual(psnCorpora, {}, `query=${String(bad)}`);
    assert.equal(typeof rerank, "function");
    assert.ok(meta.errors.includes("empty-or-nonstring-query"));
  }
});

// -- adversarial 3: leg path exists but is empty --------------------------

test("adversarial: empty leg dir is skipped, never throws", async () => {
  const fx = makeFixtureRoots();
  try {
    const { psnCorpora } = await loadPsnCorpora(
      "Kienzle cutting force",
      { legRoots: fx.emptyRoots, modelBudget: 4000 },
    );
    // No .md files in the empty dir → no fs-leg candidates.
    assert.equal(psnCorpora.wiki, undefined);
    assert.equal(psnCorpora.memories, undefined);
    assert.equal(psnCorpora.skills, undefined);
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

// -- rerank adapter contract (the curator's {candidate,score} shape) ------

test("rerank adapter: returns {candidate,score}, sorted desc, sliced to topK", () => {
  const rerank = makeRerankAdapter();
  const cands = [
    "lunchroom scheduling notes",
    "Kienzle cutting force model for milling",
    "a brief mention of cutting force",
  ];
  const out = rerank("Kienzle cutting force milling", cands, 2);
  assert.equal(out.length, 2);
  for (const r of out) {
    assert.equal(typeof r.candidate, "string");
    assert.equal(typeof r.score, "number");
    assert.ok(Number.isFinite(r.score));
  }
  // Best (full phrase + coverage) ranks first.
  assert.match(out[0].candidate, /Kienzle cutting force model/);
  assert.ok(out[0].score >= out[1].score);
});

test("rerank adapter: non-array candidates → [], garbage query → input order", () => {
  const rerank = makeRerankAdapter();
  assert.deepEqual(rerank("q", null, 3), []);
  assert.deepEqual(rerank("q", "not-array", 3), []);
  // Untokenizable query: neutral scores, stable input order preserved.
  const out = rerank("", ["first", "second", "third"], 3);
  assert.equal(out.length, 3);
  assert.equal(out[0].candidate, "first");
  assert.equal(out[1].candidate, "second");
  // Non-string candidates coerced, never throw.
  const out2 = rerank("x", [1, { a: 1 }, null], 3);
  assert.equal(out2.length, 3);
  for (const r of out2) assert.equal(typeof r.candidate, "string");
});

// -- FIX 1(b): redaction of secrets in fs-leg output ----------------------

test("data-leak guard: secrets in a fs-leg file are REDACTED in loader output", async () => {
  const fx = makeFixtureRoots();
  try {
    // A wiki file whose body quotes a bearer token, a Google key, and an
    // api_key: assignment — all must be masked before they reach a voice/ledger.
    const leak =
      "# Kienzle force notes\n" +
      "cutting force model. Authorization: Bearer abc.def.ghi\n" +
      "google key AIza" + "B".repeat(35) + "\n" +
      "api_key: superSecretValue123\n";
    writeFileSync(join(fx.roots.wiki[0], "kienzle-force-leak.md"), leak);
    const { psnCorpora } = await loadPsnCorpora(
      "Kienzle cutting force",
      { legRoots: fx.roots, modelBudget: 4000 },
    );
    const allText = JSON.stringify(psnCorpora);
    // The raw secrets must NOT survive anywhere in the corpora.
    assert.ok(!allText.includes("abc.def.ghi"), "bearer token leaked");
    assert.ok(!allText.includes("AIza" + "B".repeat(35)), "google key leaked");
    assert.ok(!allText.includes("superSecretValue123"), "api_key value leaked");
    // And at least one mask token must be present (proves redaction ran on the
    // snippet that actually surfaced, not that the snippet was simply dropped).
    assert.match(allText, /\[redacted-(?:google-key|secret)\]|Bearer \[redacted\]/);
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

// -- FIX 1(a): private C: auto-memory root gating -------------------------

test("data-leak guard: C: private memory root is NOT in DEFAULT_LEG_ROOTS.memories", () => {
  assert.ok(!DEFAULT_LEG_ROOTS.memories.includes(PRIVATE_MEMORY_ROOT));
  assert.deepEqual(DEFAULT_LEG_ROOTS.memories, ["H:/prism/knowledge/memories"]);
});

test("resolveMemoryRoots: private root excluded by default, included only on opt-in", () => {
  const base = ["H:/prism/knowledge/memories"];
  // default (env unset) → no private root
  assert.deepEqual(resolveMemoryRoots(base, {}), base);
  assert.deepEqual(resolveMemoryRoots(base, { PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY: "0" }), base);
  // opt-in → private root appended exactly once
  const optIn = resolveMemoryRoots(base, { PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY: "1" });
  assert.ok(optIn.includes(PRIVATE_MEMORY_ROOT));
  assert.equal(optIn.length, 2);
  // idempotent — already-present private root is not duplicated
  const already = resolveMemoryRoots([...base, PRIVATE_MEMORY_ROOT], { PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY: "1" });
  assert.equal(already.filter((r) => r === PRIVATE_MEMORY_ROOT).length, 1);
});

test("loadPsnCorpora: private memory root only scanned when env opt-in is set", async () => {
  const fx = makeFixtureRoots();
  try {
    // Stand in a tmp dir for the "private" root and seed a uniquely-named hit.
    const fakePrivate = join(fx.base, "private-mem");
    mkdirSync(fakePrivate, { recursive: true });
    writeFileSync(join(fakePrivate, "kienzle-private-secret-note.md"),
      "# Kienzle private\nPRIVATE_MARKER_TOKEN cutting force private memory note about kienzle.\n");
    // Override the memories leg base root + the private root via legRoots so the
    // test never touches the real C: path. resolveMemoryRoots appends the REAL
    // PRIVATE_MEMORY_ROOT, which won't exist in tmp — so we instead assert the
    // gating logic via resolveMemoryRoots (above) + here prove the env toggle
    // changes whether the appended private root is attempted at all by checking
    // that the curated-only default never pulls the private marker.
    const baseRoots = { wiki: fx.roots.wiki, memories: [fakePrivate], skills: fx.roots.skills };

    // DEFAULT (no env): only the explicitly-listed roots are scanned. The
    // private marker IS reachable here because we listed fakePrivate directly —
    // so this sub-case proves the LISTED roots work; the gating is proven by the
    // env-driven resolveMemoryRoots append, asserted in the test above and below.
    const def = await loadPsnCorpora("Kienzle cutting force private", {
      legRoots: baseRoots, modelBudget: 4000, env: {},
    });
    assert.ok(JSON.stringify(def.psnCorpora).includes("Kienzle"), "listed root should be scanned");

    // Now prove the REAL private root is appended ONLY on opt-in: point the
    // memories base at the real default, env opt-in ON, and confirm the loader
    // attempts the private root (it will be absent on a tmp test box, so we
    // assert no throw + that resolveMemoryRoots reflects the toggle).
    const resolvedOff = resolveMemoryRoots(["H:/prism/knowledge/memories"], {});
    const resolvedOn = resolveMemoryRoots(["H:/prism/knowledge/memories"], { PRISM_OCTOPUS_INCLUDE_PRIVATE_MEMORY: "1" });
    assert.ok(!resolvedOff.includes(PRIVATE_MEMORY_ROOT));
    assert.ok(resolvedOn.includes(PRIVATE_MEMORY_ROOT));
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

// -- FIX 3: index-leg snippet field-read fix ------------------------------

test("buildTribalSnippet: surfaces title + domain + source (NOT h.text, which never exists)", () => {
  // The real ranked tribal hit shape — note there is no `text` field.
  const hit = { id: "t1", source: "MIT-2.830", domain: "wedm", title: "spark-gap servo tuning", path: "x", score: 3 };
  const snip = buildTribalSnippet(hit);
  assert.match(snip, /spark-gap servo tuning/);   // title surfaced
  assert.match(snip, /domain: wedm/);              // domain detail (non-title content)
  assert.match(snip, /source: MIT-2\.830/);        // source detail
  // A reader of the old code (h.text) would have produced ONLY the title; this
  // proves the snippet is genuinely richer than bare title.
  assert.ok(snip.length > "spark-gap servo tuning".length);
  // Phantom field is ignored, never crashes.
  assert.equal(buildTribalSnippet({ text: "should-not-appear", title: "T", domain: "mill" }).includes("should-not-appear"), false);
});

test("buildMasterIndexSnippet: surfaces status + wiki/memory back-pointers (NOT h.info, which never exists)", () => {
  // The real ranked master-index hit shape — note there is no `info` field.
  const hit = {
    id: "n1", score: 5, layer: "L10", label: "kienzle-force-model", status: "built",
    wiki: ["kienzle-cutting-force"], memory: ["reference_sfc_kienzle"],
  };
  const snip = buildMasterIndexSnippet(hit);
  assert.match(snip, /\[L10\] kienzle-force-model/); // layer + label
  assert.match(snip, /status: built/);               // status detail (non-label content)
  assert.match(snip, /wiki: kienzle-cutting-force/);  // wiki back-pointer
  assert.match(snip, /memory: reference_sfc_kienzle/); // memory back-pointer
  // Richer than bare label.
  assert.ok(snip.length > "[L10] kienzle-force-model".length);
  // Phantom `info` field is ignored.
  assert.equal(buildMasterIndexSnippet({ label: "L", layer: "L1", info: "should-not-appear" }).includes("should-not-appear"), false);
});

test("buildMasterIndexSnippet/buildTribalSnippet: redact secrets embedded in fields", () => {
  const tsnip = buildTribalSnippet({ title: "leak Bearer abc.def.ghi", domain: "x" });
  assert.ok(!tsnip.includes("abc.def.ghi"));
  assert.match(tsnip, /Bearer \[redacted\]/);
  const msnip = buildMasterIndexSnippet({ label: "node", layer: "L1", status: "ok", wiki: ["api_key: zzz9secret"] });
  assert.ok(!msnip.includes("zzz9secret"));
});

// -- domain-aware corpus legs (P1 per-galaxy tuning, PSN-OCTOPUS-FLEET-SYNERGY-MS0) --
// Hermetic: a tmp domain-corpus tree injected via the opts.domainRoots seam, so these
// never depend on the real H:/PRISM corpus dirs.

function makeDomainFixture() {
  const base = mkdtempSync(join(tmpdir(), "octopus-domain-"));
  const wedm = join(base, "wedm");
  const post = join(base, "post");
  const sf = join(base, "sf");
  mkdirSync(wedm, { recursive: true });
  mkdirSync(post, { recursive: true });
  mkdirSync(sf, { recursive: true });
  // wedm: text files (collected) + a secret (must redact) + a binary (must skip).
  writeFileSync(join(wedm, "wire-edm-cutting.txt"),
    "Wire EDM cutting parameters: a skim pass at low power follows multi-pass roughing.\n");
  writeFileSync(join(wedm, "spark-notes.json"),
    `${JSON.stringify({ note: "wire edm spark gap, flushing pressure, and skim cutting strategy" })}\n`);
  writeFileSync(join(wedm, "leaky.txt"),
    "wire edm setup — Authorization: Bearer abc.def.ghi do not leak this\n");
  writeFileSync(join(wedm, "program.mcx"),
    "BINARYHEADER wire edm machine program glyphs that must never surface\n");
  // post-processor: .cps post language (collected).
  writeFileSync(join(post, "fanuc-mill.cps"),
    "// Fanuc post processor: coolant M8, spindle M3, G-code dialect for milling.\n");
  // speed-feed: .ts data (collected).
  writeFileSync(join(sf, "kienzle-data.ts"),
    "export const kienzle = { note: 'Kienzle cutting force speed feed material P1800' };\n");
  return { base, domainRoots: { wedm: [wedm], "post-processor": [post], "speed-feed": [sf] } };
}

test("domain leg: surfaces text corpus for 3 spanning domains (leg name normalized)", async () => {
  const fx = makeDomainFixture();
  try {
    const cases = [
      ["wedm", "wire edm cutting skim pass", "wedm_corpus"],
      ["post-processor", "fanuc post processor coolant", "post_processor_corpus"],
      ["speed-feed", "kienzle cutting force speed feed", "speed_feed_corpus"],
    ];
    for (const [domain, q, leg] of cases) {
      const { psnCorpora } = await loadPsnCorpora(q, {
        domain, domainRoots: fx.domainRoots, modelBudget: 4000,
        env: { PRISM_OCTOPUS_SKIP_INDEX_LEGS: "1" },
      });
      assert.ok(Array.isArray(psnCorpora[leg]) && psnCorpora[leg].length > 0,
        `expected ${leg} for domain ${domain}, got ${JSON.stringify(Object.keys(psnCorpora))}`);
    }
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

test("domain leg: binary files are NOT read, secrets in domain corpus ARE redacted", async () => {
  const fx = makeDomainFixture();
  try {
    const { psnCorpora } = await loadPsnCorpora("wire edm cutting setup program", {
      domain: "wedm", domainRoots: fx.domainRoots, modelBudget: 4000,
      env: { PRISM_OCTOPUS_SKIP_INDEX_LEGS: "1" },
    });
    const blob = JSON.stringify(psnCorpora.wedm_corpus || []);
    assert.ok((psnCorpora.wedm_corpus || []).length > 0, "wedm text corpus expected");
    assert.ok(!blob.includes("BINARYHEADER"), "binary .mcx content leaked into corpus");
    assert.ok(!blob.includes("must never surface"), "binary content leaked");
    assert.ok(!blob.includes("abc.def.ghi"), "Bearer secret leaked from a collected .txt");
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

test("domain leg: unknown / non-string / empty domain is a clean no-op (no throw, no *_corpus leg)", async () => {
  const fx = makeDomainFixture();
  try {
    for (const domain of ["not-a-real-galaxy", "", 42, null, {}, undefined]) {
      const { psnCorpora } = await loadPsnCorpora("wire edm cutting", {
        domain, domainRoots: fx.domainRoots, modelBudget: 4000,
        env: { PRISM_OCTOPUS_SKIP_INDEX_LEGS: "1" },
      });
      const corpusLegs = Object.keys(psnCorpora).filter((k) => k.endsWith("_corpus"));
      assert.equal(corpusLegs.length, 0, `unexpected corpus leg for domain=${JSON.stringify(domain)}: ${corpusLegs}`);
    }
  } finally {
    rmSync(fx.base, { recursive: true, force: true });
  }
});

test("domain leg: additive — core wiki/memories/skills legs still flow alongside it", async () => {
  const core = makeFixtureRoots();
  const dom = makeDomainFixture();
  try {
    const { psnCorpora } = await loadPsnCorpora("Kienzle wire edm cutting milling force", {
      legRoots: core.roots, domain: "wedm", domainRoots: dom.domainRoots, modelBudget: 8000,
      env: { PRISM_OCTOPUS_SKIP_INDEX_LEGS: "1" },
    });
    assert.ok(Array.isArray(psnCorpora.wiki) && psnCorpora.wiki.length > 0, "core wiki leg starved by domain leg");
    assert.ok(Array.isArray(psnCorpora.wedm_corpus) && psnCorpora.wedm_corpus.length > 0, "domain leg missing");
  } finally {
    rmSync(core.base, { recursive: true, force: true });
    rmSync(dom.base, { recursive: true, force: true });
  }
});

test("DOMAIN_CORPUS_ROOTS registry: names the 8 deep-corpus domains with absolute string roots", () => {
  const domains = Object.keys(DOMAIN_CORPUS_ROOTS);
  for (const d of ["wedm", "speed-feed", "cam", "cad", "post-processor", "mill", "lathe", "quoting"]) {
    assert.ok(domains.includes(d), `registry missing domain ${d}`);
    const roots = DOMAIN_CORPUS_ROOTS[d];
    assert.ok(Array.isArray(roots) && roots.length > 0, `domain ${d} has no roots`);
    for (const r of roots) {
      assert.equal(typeof r, "string");
      assert.match(r, /^[A-Za-z]:[/\\]/, `root must be absolute: ${r}`);
    }
  }
});

test("brain-dir fallback: an uncurated domain resolves src/engines/<domain> (hermetic via galaxyEnginesBase)", async () => {
  const base = mkdtempSync(join(tmpdir(), "octopus-galaxy-"));
  const g = join(base, "zztestgalaxy");
  mkdirSync(g, { recursive: true });
  writeFileSync(join(g, "MEMORY.md"), "# zztestgalaxy\nThis galaxy handles cutting force tool life knowledge.\n");
  try {
    // zztestgalaxy is NOT in DOMAIN_CORPUS_ROOTS → must resolve via the brain-dir fallback.
    const { psnCorpora } = await loadPsnCorpora("cutting force tool life", {
      domain: "zztestgalaxy", galaxyEnginesBase: base, modelBudget: 4000,
      env: { PRISM_OCTOPUS_SKIP_INDEX_LEGS: "1" },
    });
    assert.ok(Array.isArray(psnCorpora.zztestgalaxy_corpus) && psnCorpora.zztestgalaxy_corpus.length > 0,
      `expected fallback brain-dir leg, got ${JSON.stringify(Object.keys(psnCorpora))}`);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("brain-dir fallback: path-traversal domains are blocked (no leg, no escape to a sibling dir)", async () => {
  const base = mkdtempSync(join(tmpdir(), "octopus-trav-"));
  const secret = join(base, "secret");
  mkdirSync(secret, { recursive: true });
  writeFileSync(join(secret, "MEMORY.md"), "leaked-secret-content must never surface\n");
  const sub = join(base, "sub"); // the "engines base" — traversal would try to climb out of it
  mkdirSync(sub, { recursive: true });
  try {
    const nulKey = `sub${String.fromCharCode(0)}${join("..", "secret")}`; // NUL-injection vector
    for (const evil of ["../secret", "..", "a/b", "./x", "..\\secret", "C:/secret", nulKey]) {
      const { psnCorpora } = await loadPsnCorpora("secret content", {
        domain: evil, galaxyEnginesBase: sub, modelBudget: 4000,
        env: { PRISM_OCTOPUS_SKIP_INDEX_LEGS: "1" },
      });
      const corpusLegs = Object.keys(psnCorpora).filter((k) => k.endsWith("_corpus"));
      assert.equal(corpusLegs.length, 0, `traversal ${JSON.stringify(evil)} produced a leg: ${corpusLegs}`);
      assert.ok(!JSON.stringify(psnCorpora).includes("leaked-secret-content"), `traversal ${evil} leaked sibling content`);
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("text-extension allowlist: .md/.json/.cps collected; .mcx/.pdf binaries skipped", async () => {
  const base = mkdtempSync(join(tmpdir(), "octopus-allow-"));
  const dir = join(base, "mixed");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "note-cutting.md"), "cutting tool note in markdown\n");
  writeFileSync(join(dir, "data-cutting.json"), `${JSON.stringify({ t: "cutting json" })}\n`);
  writeFileSync(join(dir, "post-cutting.cps"), "cutting cps post language\n");
  writeFileSync(join(dir, "model-cutting.mcx"), "BINARYMCX cutting model do-not-read\n");
  writeFileSync(join(dir, "scan-cutting.pdf"), "%PDF cutting binary do-not-read\n");
  try {
    const { psnCorpora } = await loadPsnCorpora("cutting", {
      legRoots: { wiki: [dir] }, modelBudget: 4000,
      env: { PRISM_OCTOPUS_SKIP_INDEX_LEGS: "1" },
    });
    const blob = JSON.stringify(psnCorpora.wiki || []);
    assert.ok((psnCorpora.wiki || []).length > 0, "text files should be collected");
    assert.ok(!blob.includes("BINARYMCX"), ".mcx must not be read");
    assert.ok(!blob.includes("%PDF"), ".pdf must not be read");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("binary sniff: a TEXT-extension file holding REAL binary bytes is not snippeted (no mojibake to a voice)", async () => {
  const base = mkdtempSync(join(tmpdir(), "octopus-bin-"));
  const dir = join(base, "leg");
  mkdirSync(dir, { recursive: true });
  // A .json (allowlisted EXTENSION) whose CONTENT is real binary — NUL + control + high bytes.
  // Its filename matches the query, so it would be read & snippeted if only the extension
  // allowlist gated it; the content sniff is what must reject it.
  const bin = Buffer.alloc(600);
  for (let i = 0; i < bin.length; i++) bin[i] = i % 7 === 0 ? 0x00 : i % 3 === 0 ? 0x01 : 0xff;
  writeFileSync(join(dir, "cutting-blob.json"), bin);
  // A legit text file so the leg isn't empty for an unrelated reason.
  writeFileSync(join(dir, "cutting-notes.md"), "cutting parameters: real prose that should surface\n");
  try {
    const { psnCorpora } = await loadPsnCorpora("cutting", {
      legRoots: { wiki: [dir] }, modelBudget: 4000,
      env: { PRISM_OCTOPUS_SKIP_INDEX_LEGS: "1" },
    });
    const arr = psnCorpora.wiki || [];
    const blob = arr.join("");
    assert.ok(arr.length > 0, "the legit .md prose should still surface");
    assert.match(blob, /real prose that should surface/);
    // No NUL / C0 control (excl. whitespace \t\n\v\f\r) / U+FFFD replacement char from the binary
    // .json may appear — checked by char code so the source stays pure-ASCII (no control bytes).
    let hasBinaryChar = false;
    for (let i = 0; i < blob.length; i++) {
      const c = blob.charCodeAt(i);
      if (c === 0xfffd || (c < 32 && c !== 9 && c !== 10 && c !== 11 && c !== 12 && c !== 13)) { hasBinaryChar = true; break; }
    }
    assert.ok(!hasBinaryChar, "binary mojibake leaked into the corpus");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
