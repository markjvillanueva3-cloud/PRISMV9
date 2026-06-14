// scripts/ollama-nav-rerank.test.mjs
// Hermetic tests for the verified SEARCH/navigation offload (U-VERIFIED-OFFLOAD-NAV).
// run / resolve / fallback are INJECTED -> zero ollama + zero fs dependency.
// R9: assert concrete ranked ids and source decisions, never toBeDefined-style.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRerankPrompt,
  parseRankedIds,
  makeRerankVerifier,
  rerankNavCandidates,
  parseCliArgs,
  MAX_CANDIDATES,
  DEFAULT_TOP_K,
} from "./ollama-nav-rerank.mjs";

const CANDS = [
  { id: "eng.mill", label: "Mill galaxy engine" },
  { id: "disp.prism_calc", label: "physics dispatcher" },
  { id: "ghost.galaxy.wedm", label: "Wire EDM galaxy" },
  { id: "eng.lathe", label: "Lathe wizard" },
];
const CAND_IDS = CANDS.map((c) => c.id);
const resolveAll = (id) => CAND_IDS.includes(id); // every candidate is a live node

// ---- buildRerankPrompt ----

test("buildRerankPrompt embeds the query verbatim", () => {
  const p = buildRerankPrompt("how does mill speed/feed work", CANDS, 3);
  assert.ok(p.includes("how does mill speed/feed work"));
});

test("buildRerankPrompt lists every candidate id", () => {
  const p = buildRerankPrompt("q", CANDS, 3);
  for (const c of CANDS) assert.ok(p.includes(c.id), `missing ${c.id}`);
});

test("buildRerankPrompt states the topK count in the instruction", () => {
  const p = buildRerankPrompt("q", CANDS, 7);
  assert.ok(p.includes("Return the 7 ids"));
});

test("buildRerankPrompt caps candidate lines at MAX_CANDIDATES", () => {
  const many = Array.from({ length: MAX_CANDIDATES + 10 }, (_, i) => ({ id: `cand${i}`, label: `n${i}` }));
  const p = buildRerankPrompt("q", many, 5);
  assert.ok(p.includes(`cand${MAX_CANDIDATES - 1}`), "kept last in-cap id");
  assert.ok(!p.includes(`cand${MAX_CANDIDATES}`), "dropped first over-cap id");
});

test("buildRerankPrompt handles empty/missing candidates without throwing", () => {
  assert.doesNotThrow(() => buildRerankPrompt("q", [], 3));
  assert.doesNotThrow(() => buildRerankPrompt("q", undefined, 3));
});

// ---- parseRankedIds ----

test("parseRankedIds parses a JSON array", () => {
  assert.deepEqual(parseRankedIds('["eng.mill","disp.prism_calc"]'), ["eng.mill", "disp.prism_calc"]);
});

test("parseRankedIds parses newline form and strips numbering/bullets", () => {
  assert.deepEqual(parseRankedIds("1. eng.mill\n2) disp.prism_calc\n- eng.lathe"), [
    "eng.mill",
    "disp.prism_calc",
    "eng.lathe",
  ]);
});

test("parseRankedIds parses comma form", () => {
  assert.deepEqual(parseRankedIds("eng.mill, disp.prism_calc"), ["eng.mill", "disp.prism_calc"]);
});

test("parseRankedIds strips wrapping backticks", () => {
  assert.deepEqual(parseRankedIds("`eng.mill`\n`eng.lathe`"), ["eng.mill", "eng.lathe"]);
});

test("parseRankedIds keeps only the first token of an 'id  label' echo", () => {
  assert.deepEqual(parseRankedIds("eng.mill  Mill galaxy engine"), ["eng.mill"]);
});

test("parseRankedIds de-dupes preserving first-seen order", () => {
  assert.deepEqual(parseRankedIds("eng.mill\neng.lathe\neng.mill"), ["eng.mill", "eng.lathe"]);
});

test("parseRankedIds returns [] on empty / non-string", () => {
  assert.deepEqual(parseRankedIds("   "), []);
  assert.deepEqual(parseRankedIds(null), []);
  assert.deepEqual(parseRankedIds(42), []);
});

// ---- makeRerankVerifier ----

test("verifier accepts an all-valid ranking, preserving model order", () => {
  const v = makeRerankVerifier(CAND_IDS, resolveAll);
  const r = v("disp.prism_calc\neng.mill");
  assert.deepEqual(r, { ok: true, value: ["disp.prism_calc", "eng.mill"] });
});

test("verifier DROPS a hallucinated id not in the candidate set", () => {
  const v = makeRerankVerifier(CAND_IDS, resolveAll);
  const r = v("eng.mill\neng.NONEXISTENT\neng.lathe");
  assert.deepEqual(r, { ok: true, value: ["eng.mill", "eng.lathe"] });
});

test("verifier DROPS an in-set id that does not resolve", () => {
  const resolve = (id) => id !== "eng.lathe"; // lathe is a dead node
  const v = makeRerankVerifier(CAND_IDS, resolve);
  const r = v("eng.lathe\neng.mill");
  assert.deepEqual(r, { ok: true, value: ["eng.mill"] });
});

test("adversarial: a RESOLVABLE id that is NOT a candidate is still dropped (subset check)", () => {
  // resolve says yes for everything, but the id was never a candidate -> no leak.
  const v = makeRerankVerifier(CAND_IDS, () => true);
  const r = v("eng.mill\neng.SMUGGLED_IN");
  assert.deepEqual(r, { ok: true, value: ["eng.mill"] });
});

test("verifier returns false when NO id survives (forces fallback)", () => {
  const v = makeRerankVerifier(CAND_IDS, resolveAll);
  assert.equal(v("eng.ghost1\neng.ghost2"), false);
});

test("verifier returns false on empty model output", () => {
  const v = makeRerankVerifier(CAND_IDS, resolveAll);
  assert.equal(v(""), false);
});

test("verifier survives a throwing resolve for one id (drops just that id)", () => {
  const resolve = (id) => {
    if (id === "eng.mill") throw new Error("seek blew up");
    return true;
  };
  const v = makeRerankVerifier(CAND_IDS, resolve);
  const r = v("eng.mill\neng.lathe");
  assert.deepEqual(r, { ok: true, value: ["eng.lathe"] });
});

// ---- rerankNavCandidates (verifiedOffload integration) ----

test("happy: verified ollama re-rank -> source=ollama, model order", async () => {
  const r = await rerankNavCandidates({
    query: "physics",
    candidates: CANDS,
    run: async () => "disp.prism_calc\neng.mill",
    resolve: resolveAll,
  });
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
  assert.deepEqual(r.value, ["disp.prism_calc", "eng.mill"]);
});

test("run throws -> falls back to trusted original order (top-K)", async () => {
  const r = await rerankNavCandidates({
    query: "q",
    candidates: CANDS,
    topK: 2,
    run: async () => { throw new Error("ollama down"); },
    resolve: resolveAll,
  });
  assert.equal(r.source, "fallback");
  assert.equal(r.fellBack, true);
  assert.deepEqual(r.value, ["eng.mill", "disp.prism_calc"]); // original order, capped
});

test("run returns empty -> falls back", async () => {
  const r = await rerankNavCandidates({
    query: "q",
    candidates: CANDS,
    run: async () => "",
    resolve: resolveAll,
  });
  assert.equal(r.source, "fallback");
});

test("model hallucinates every id -> falls back (no bad id surfaced)", async () => {
  const r = await rerankNavCandidates({
    query: "q",
    candidates: CANDS,
    run: async () => "eng.fake1\neng.fake2",
    resolve: resolveAll,
  });
  assert.equal(r.source, "fallback");
  assert.deepEqual(r.value, CAND_IDS.slice(0, DEFAULT_TOP_K));
});

test("model partial (one good, one bad) -> ollama with only the good id", async () => {
  const r = await rerankNavCandidates({
    query: "q",
    candidates: CANDS,
    run: async () => "eng.lathe\neng.BOGUS",
    resolve: resolveAll,
  });
  assert.equal(r.source, "ollama");
  assert.deepEqual(r.value, ["eng.lathe"]);
});

test("adversarial: model REVERSES the order -> accepted (proves real re-rank, not echo)", async () => {
  const reversed = [...CAND_IDS].reverse().join("\n");
  const r = await rerankNavCandidates({
    query: "q",
    candidates: CANDS,
    run: async () => reversed,
    resolve: resolveAll,
  });
  assert.equal(r.source, "ollama");
  assert.deepEqual(r.value, [...CAND_IDS].reverse());
});

test("verified ollama list is capped to topK", async () => {
  const big = Array.from({ length: 12 }, (_, i) => ({ id: `eng.n${i}`, label: `n${i}` }));
  const ids = big.map((c) => c.id);
  const r = await rerankNavCandidates({
    query: "q",
    candidates: big,
    topK: 5,
    run: async () => ids.join("\n"),
    resolve: (id) => ids.includes(id),
  });
  assert.equal(r.source, "ollama");
  assert.equal(r.value.length, 5);
});

// ---- parseCliArgs ----

test("parseCliArgs keeps --top-k value out of the query", () => {
  const a = parseCliArgs(["how", "does", "mill", "work", "--top-k", "5"]);
  assert.equal(a.query, "how does mill work");
  assert.equal(a.topK, 5);
  assert.equal(a.json, false);
});

test("parseCliArgs detects --json", () => {
  const a = parseCliArgs(["mill", "--json"]);
  assert.equal(a.query, "mill");
  assert.equal(a.json, true);
});

test("parseCliArgs defaults topK and handles a bare query", () => {
  const a = parseCliArgs(["lathe", "boring", "bar"]);
  assert.equal(a.query, "lathe boring bar");
  assert.equal(a.topK, DEFAULT_TOP_K);
});
