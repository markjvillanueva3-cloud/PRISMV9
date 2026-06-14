/**
 * assemble-fleet-lora-corpus.test.mjs -- unit tests for the manifest-consuming
 * fleet LoRA corpus assembler (U-LORA-CORPUS-ASSEMBLE, slot:india 2026-06-10).
 *
 * R9: every test encodes WHY, with real reference values. Pure functions are
 * tested hermetically (injected readImpl, no disk). Covers happy path + >=3
 * failure modes + >=2 adversarial + a live-inventory scan (R15 step-3 in-suite).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sourceWeight,
  isAdvisorySource,
  loadInventory,
  selectLoraSources,
  parseAlpacaJsonl,
  normalizeAlpacaRow,
  assembleCorpus,
  deriveStatsPath,
} from "./assemble-fleet-lora-corpus.mjs";
import path from "node:path";

// ---- sourceWeight / isAdvisorySource ---------------------------------------

test("sourceWeight: explicit manifest advisory flag is AUTHORITATIVE", () => {
  // WHY: the manifest's advisory:true/false is the source of truth; advisory
  // LLM-distilled synthesis must NOT train at verified weight (R7 -- distinct
  // trust, not blended). The explicit flag overrides any id/description text.
  assert.equal(sourceWeight({ id: "anything", advisory: true }), 0.5);
  assert.equal(sourceWeight({ id: "vault-galaxy-synthesis-lora", advisory: false }), 1.0,
    "explicit advisory:false wins even over a synthesis-matching id");
});

test("sourceWeight: free-text description NEVER down-weights a verified source (closes C-P2)", () => {
  // WHY (3-of-3 C-P2): the original guard matched /advisor|synthesis/ over the
  // free-text DESCRIPTION, so a verified source whose description merely said
  // "cross-domain synthesis study" was silently down-weighted to 0.5. The fallback
  // now matches the CONTROLLED id only. This test FAILS under the old description-
  // matching guard -> proves the fix.
  assert.equal(sourceWeight({ id: "cam-master-training-set", description: "cross-domain synthesis study" }), 1.0);
  assert.equal(sourceWeight({ id: "verified-corpus", description: "advisory notes referenced" }), 1.0);
});

test("sourceWeight: id-only heuristic fallback when no explicit flag", () => {
  // WHY: legacy/unflagged sources still get a sensible default from the controlled id.
  assert.equal(sourceWeight({ id: "vault-galaxy-synthesis-lora" }), 0.5);
  assert.equal(sourceWeight({ id: "cam-master-training-set" }), 1.0);
  assert.equal(sourceWeight({}), 1.0);
});

test("isAdvisorySource reflects the weight via the authoritative flag", () => {
  assert.equal(isAdvisorySource({ id: "x", advisory: true }), true);
  assert.equal(isAdvisorySource({ id: "vault-galaxy-synthesis-lora" }), true); // id fallback
  assert.equal(isAdvisorySource({ id: "cam-master-training-set" }), false);
  assert.equal(isAdvisorySource({}), false);
});

test("deriveStatsPath sits the sidecar next to the corpus (closes A-P1)", () => {
  // WHY (3-of-3 A-P1): a fixed stats path orphaned the sidecar at the default
  // location when --out pointed elsewhere. The stats file must follow the corpus.
  assert.equal(deriveStatsPath("/a/b/fleet-lora-combined.jsonl"), "/a/b/fleet-lora-combined.stats.json");
  const custom = path.join("X:", "tmp", "my-corpus.jsonl");
  assert.equal(deriveStatsPath(custom), path.join("X:", "tmp", "my-corpus") + ".stats.json");
  assert.ok(deriveStatsPath(null).endsWith(".stats.json"), "falsy input derives from the default corpus path");
});

// ---- loadInventory ----------------------------------------------------------

test("loadInventory fails LOUD when the manifest is absent (R12)", () => {
  // WHY: a missing manifest means the builder never ran; that must surface, not
  // degrade to a silent empty corpus the operator mistakes for "nothing to train".
  const throwingRead = () => { throw new Error("ENOENT"); };
  assert.throws(() => loadInventory("/nope.json", throwingRead), /run: node scripts\/build-fleet-training-corpus-inventory/);
});

test("loadInventory parses a present manifest", () => {
  const read = () => JSON.stringify({ sources: [{ id: "a", kind: "lora-training-jsonl", status: "present" }] });
  const inv = loadInventory("/x.json", read);
  assert.equal(inv.sources.length, 1);
});

// ---- selectLoraSources ------------------------------------------------------

test("selectLoraSources keeps only PRESENT lora-training-jsonl sources", () => {
  // WHY: a missing source (path absent on this host) or a non-lora kind must not
  // be read -- the assembler unions training sets, not arbitrary manifests.
  const inv = {
    sources: [
      { id: "lora-present", kind: "lora-training-jsonl", status: "present" },
      { id: "lora-missing", kind: "lora-training-jsonl", status: "missing" },
      { id: "manifest", kind: "aggregate-manifest", status: "present" },
      { id: "pdf", kind: "pdf-extracted-text", status: "present" },
    ],
  };
  const sel = selectLoraSources(inv);
  assert.deepEqual(sel.map((s) => s.id), ["lora-present"]);
});

test("selectLoraSources handles a malformed inventory (adversarial)", () => {
  assert.deepEqual(selectLoraSources(null), []);
  assert.deepEqual(selectLoraSources({}), []);
  assert.deepEqual(selectLoraSources({ sources: null }), []);
});

// ---- parseAlpacaJsonl -------------------------------------------------------

test("parseAlpacaJsonl keeps valid triples, skips blanks, counts invalid", () => {
  const text = [
    JSON.stringify({ instruction: "Q1", input: "i1", output: "A1" }),
    "",
    "{ not json",
    JSON.stringify({ instruction: "Q2", output: "A2" }), // input optional
    JSON.stringify({ instruction: "", output: "A3" }),    // empty instruction -> invalid
    JSON.stringify({ instruction: "Q4" }),                 // missing output -> invalid
  ].join("\n");
  const { rows, invalid } = parseAlpacaJsonl(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].input, "i1");
  assert.equal(rows[1].input, "", "missing input defaults to empty string");
  assert.equal(invalid, 3, "bad-json + empty-instruction + missing-output");
});

test("parseAlpacaJsonl on empty/garbage input returns no rows (edge case)", () => {
  assert.deepEqual(parseAlpacaJsonl(""), { rows: [], invalid: 0 });
  assert.deepEqual(parseAlpacaJsonl(null), { rows: [], invalid: 0 });
});

// ---- normalizeAlpacaRow: dual-convention acceptance (U-FLOR-WIKI-CANON-WIRE) -
// WHY: the wiki-canonical training pairs use {prompt,completion} (the OpenAI fine-tune
// convention), NOT the native {instruction,output}. Those 282 real wiki pairs were
// DORMANT (0 consumable) until the parser accepted both. R9: each test fails if the
// alias mapping, the native-wins precedence, or the reject-empty guard regresses.

test("normalizeAlpacaRow: ACCEPTS the {prompt,completion} convention (the dormant-wiki fix)", () => {
  const r = normalizeAlpacaRow({ prompt: "What is the CAM gap?", completion: "33 unwired engines.", weight: 0.6, meta: { x: 1 } });
  assert.equal(r.instruction, "What is the CAM gap?", "prompt -> instruction");
  assert.equal(r.output, "33 unwired engines.", "completion -> output");
  assert.equal(r.input, "", "no input key -> empty string");
});

test("normalizeAlpacaRow: native {instruction,output} still works (no regression)", () => {
  const r = normalizeAlpacaRow({ instruction: "Q", input: "i", output: "A" });
  assert.deepEqual(r, { instruction: "Q", input: "i", output: "A" });
});

test("normalizeAlpacaRow: native keys WIN when BOTH conventions are present", () => {
  // A row carrying both must not double-map; the native instruction/output is authoritative.
  const r = normalizeAlpacaRow({ instruction: "NATIVE-Q", output: "NATIVE-A", prompt: "ALIAS-Q", completion: "ALIAS-A" });
  assert.equal(r.instruction, "NATIVE-Q");
  assert.equal(r.output, "NATIVE-A");
});

test("normalizeAlpacaRow: REJECTS when neither convention yields a non-empty pair (failure mode)", () => {
  assert.equal(normalizeAlpacaRow({ prompt: "Q", completion: "" }), null, "empty completion -> null");
  assert.equal(normalizeAlpacaRow({ instruction: "", output: "A" }), null, "empty instruction -> null");
  assert.equal(normalizeAlpacaRow({ prompt: "   ", completion: "A" }), null, "whitespace-only prompt -> null");
  assert.equal(normalizeAlpacaRow({ foo: "bar" }), null, "no recognized keys -> null");
});

test("normalizeAlpacaRow: adversarial -- non-object / null inputs return null, never throw", () => {
  assert.equal(normalizeAlpacaRow(null), null);
  assert.equal(normalizeAlpacaRow(undefined), null);
  assert.equal(normalizeAlpacaRow("a string"), null);
  assert.equal(normalizeAlpacaRow(42), null);
});

test("parseAlpacaJsonl: a MIXED file (native + prompt/completion) parses both conventions", () => {
  // The fleet corpus unions sources of both schemas; one file could carry either.
  const text = [
    JSON.stringify({ instruction: "NQ", input: "", output: "NA" }),
    JSON.stringify({ prompt: "PQ", completion: "PA" }),     // alias convention
    JSON.stringify({ prompt: "", completion: "X" }),         // invalid (empty prompt)
  ].join("\n");
  const { rows, invalid } = parseAlpacaJsonl(text);
  assert.equal(rows.length, 2, "both the native and the prompt/completion row land");
  assert.equal(rows[1].instruction, "PQ");
  assert.equal(rows[1].output, "PA");
  assert.equal(invalid, 1, "the empty-prompt row is the only invalid");
});

// ---- assembleCorpus ---------------------------------------------------------

function mkInv(ids) {
  return { sources: ids.map((id) => ({ id, kind: "lora-training-jsonl", status: "present", resolvedPath: `/${id}.jsonl` })) };
}

test("assembleCorpus unions present sources and tags weight/source/advisory", () => {
  const inv = mkInv(["vault-feedback-lora", "vault-galaxy-synthesis-lora"]);
  const files = {
    "/vault-feedback-lora.jsonl": JSON.stringify({ instruction: "FQ", input: "", output: "FA" }),
    "/vault-galaxy-synthesis-lora.jsonl": JSON.stringify({ instruction: "GQ", input: "", output: "GA" }),
  };
  const r = assembleCorpus(inv, { readImpl: (p) => files[p] });
  assert.equal(r.totalRows, 2);
  assert.equal(r.verifiedRows, 1);
  assert.equal(r.advisoryRows, 1);
  const fb = r.rows.find((x) => x.source === "vault-feedback-lora");
  const gx = r.rows.find((x) => x.source === "vault-galaxy-synthesis-lora");
  assert.equal(fb.weight, 1.0);
  assert.equal(fb.advisory, false);
  assert.equal(gx.weight, 0.5);
  assert.equal(gx.advisory, true);
});

test("assembleCorpus dedupes the same (instruction,output) ACROSS sources (failure mode)", () => {
  // WHY: a rule that appears in two source datasets must not be trained twice
  // (it would over-weight that example). Dedup is global across all sources.
  const inv = mkInv(["a", "b"]);
  const dup = JSON.stringify({ instruction: "SAME", input: "", output: "SAME-OUT" });
  const files = {
    "/a.jsonl": dup,
    "/b.jsonl": dup + "\n" + JSON.stringify({ instruction: "UNIQUE", input: "", output: "U" }),
  };
  const r = assembleCorpus(inv, { readImpl: (p) => files[p] });
  assert.equal(r.totalRows, 2, "SAME counted once, UNIQUE once");
  assert.equal(r.duplicates, 1, "the second SAME is a dedup-drop");
  assert.equal(r.bySource["b"].duplicates, 1);
});

test("assembleCorpus is fail-soft on a source read error (no total loss, adversarial)", () => {
  // WHY: one unreadable dataset must not lose every other source's rows.
  const inv = mkInv(["good", "broken"]);
  const r = assembleCorpus(inv, {
    readImpl: (p) => {
      if (p === "/broken.jsonl") throw new Error("EACCES");
      return JSON.stringify({ instruction: "Q", input: "", output: "A" });
    },
  });
  assert.equal(r.totalRows, 1, "the good source still contributes");
  assert.equal(r.bySource["broken"].error, "read-failed");
});

test("assembleCorpus reports trainingReady against the row floor", () => {
  // WHY: a small staged corpus is NOT training-ready (mirrors export-ledger-lora
  // option-value threshold); the flag must be derived, not hardcoded true.
  const inv = mkInv(["a"]);
  const r = assembleCorpus(inv, { readImpl: () => JSON.stringify({ instruction: "Q", input: "", output: "A" }) });
  assert.equal(r.trainingReady, r.totalRows >= r.minTrainingRows);
  assert.equal(r.trainingReady, false, "1 row is below the 1000 floor");
  assert.equal(r.minTrainingRows, 1000);
});

// ---- per-galaxy track field (U-LORA-PER-GALAXY-TRACK) ----------------------

test("parseAlpacaJsonl preserves a galaxy tag when present, omits when absent", () => {
  // WHY: the galaxy tag is the track field a downstream splitter groups on to
  // build per-galaxy adapters. A feedback (cross-cutting) row must NOT gain a
  // spurious galaxy -- it belongs in the shared/_unclassified track.
  const text = [
    JSON.stringify({ instruction: "Q1", input: "", output: "A1", galaxy: "mill" }),
    JSON.stringify({ instruction: "Q2", input: "", output: "A2" }),
  ].join("\n");
  const { rows } = parseAlpacaJsonl(text);
  assert.equal(rows[0].galaxy, "mill");
  assert.equal("galaxy" in rows[1], false, "a row with no galaxy must not gain one");
});

test("assembleCorpus carries the galaxy tag through the union and reports byGalaxy", () => {
  // WHY: per-galaxy slicing (self-owned per-domain AI stack) requires the galaxy
  // to survive the union. byGalaxy is the "no dormant nodes across galaxies"
  // coverage surface.
  const inv = mkInv(["vault-galaxy-synthesis-lora", "vault-feedback-lora"]);
  const files = {
    "/vault-galaxy-synthesis-lora.jsonl": [
      JSON.stringify({ instruction: "MQ", input: "", output: "MA", galaxy: "mill" }),
      JSON.stringify({ instruction: "WQ", input: "", output: "WA", galaxy: "wedm" }),
    ].join("\n"),
    "/vault-feedback-lora.jsonl": JSON.stringify({ instruction: "FQ", input: "", output: "FA" }),
  };
  const r = assembleCorpus(inv, { readImpl: (p) => files[p] });
  assert.equal(r.galaxiesCovered, 2);
  assert.deepEqual(r.byGalaxy, { mill: 1, wedm: 1 });
  assert.ok(r.rows.find((x) => x.galaxy === "mill"), "galaxy tag survives the union");
  const fb = r.rows.find((x) => x.source === "vault-feedback-lora");
  assert.equal("galaxy" in fb, false, "cross-cutting feedback carries NO galaxy -> splitter _unclassified track");
});

// ---- live inventory scan (R15 step-3 validation in-suite) -------------------

test("assembleCorpus consumes the live inventory and unions the vault datasets", () => {
  // WHY: the validation gate. The 2 vault LoRA datasets are present on this host
  // (~245 feedback + ~500 galaxy). Assert conservative floors so a broken manifest
  // read or parser regression (-> 0) fails loud while corpus growth does not.
  // Skip gracefully if the inventory has not been built on this checkout.
  let inv;
  try { inv = loadInventory(); } catch { return; }
  const r = assembleCorpus(inv);
  assert.ok(r.sources >= 1, `expected >=1 present lora source, got ${r.sources}`);
  assert.ok(r.totalRows >= 200, `expected >=200 combined rows, got ${r.totalRows}`);
  assert.ok(r.advisoryRows > 0, "galaxy-synthesis (advisory) rows should be present");
  assert.ok(r.verifiedRows > 0, "feedback (verified) rows should be present");
  for (const row of r.rows) {
    assert.ok(typeof row.weight === "number", "every row carries a numeric weight");
    assert.ok(row.source && row.source.length > 0, "every row carries its source id");
    assert.ok(row.instruction.length > 0 && row.output.length > 0, "complete triple");
  }
});

// -- assertNoClobber (slot:zulu 2026-06-12) ----------------------------------
// R9: a --out run with an empty/withered assembly must REFUSE to overwrite a
// populated combined corpus (live near-miss: the 11:26 inventory regen left 0
// 'present' lora sources; an unguarded --out would have written 0 rows over the
// 1219-row LEG-B gate artifact -- tribal-clobber class 8bf1873577).
import { assertNoClobber } from "./assemble-fleet-lora-corpus.mjs";

test("assertNoClobber: 0 rows over a populated file THROWS naming cause + bypass", () => {
  const fsImpl = { readFileSync: () => "r1\nr2\nr3\n" };
  assert.throws(() => assertNoClobber("/x/combined.jsonl", 0, fsImpl, {}), /REFUSING.*3-row.*PRISM_LORA_ALLOW_SHRINK/s);
});

test("assertNoClobber: >50% shrink throws; <50% shrink and growth pass; no existing file passes (first write)", () => {
  const fsImpl = { readFileSync: () => Array.from({ length: 100 }, (_, i) => `r${i}`).join("\n") };
  assert.throws(() => assertNoClobber("/x/c.jsonl", 49, fsImpl, {}), /REFUSING/);
  assert.doesNotThrow(() => assertNoClobber("/x/c.jsonl", 51, fsImpl, {}));
  assert.doesNotThrow(() => assertNoClobber("/x/c.jsonl", 500, fsImpl, {}));
  assert.doesNotThrow(() => assertNoClobber("/x/c.jsonl", 0, { readFileSync: () => { throw new Error("ENOENT"); } }, {}));
});

test("assertNoClobber: PRISM_LORA_ALLOW_SHRINK=1 bypasses (deliberate, logged-intent escape)", () => {
  const fsImpl = { readFileSync: () => "r1\nr2\n" };
  assert.doesNotThrow(() => assertNoClobber("/x/c.jsonl", 0, fsImpl, { PRISM_LORA_ALLOW_SHRINK: "1" }));
});
