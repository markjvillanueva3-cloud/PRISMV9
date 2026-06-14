/**
 * Tests for galaxy-reasoning-bridge.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-BRIDGE).
 * Pure-function + fail-soft tests. Live Ollama integration is validated separately
 * (proven: `quality` galaxy returned a grounded answer). Run:
 *   node --test scripts/lib/galaxy-reasoning-bridge.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { firstIdentityLine, buildReasoningPrompt, assembleGalaxyContext, gatherGalaxyDocs, reasonForGalaxy, resolveDenseMode, resolveReasoningModel, masterBrainEnabled, resolveKeepAlive, buildOllamaRequestBody, extractWikiLinks, resolveGalaxyWikiDocs, resolveWikiMode, buildFallbackLadder } from "./galaxy-reasoning-bridge.mjs";
import { cagKey, corpusFingerprint, putCached, saveCache, loadCache } from "./galaxy-cag-cache.mjs";

const REASONERS = ["gpt-oss:120b", "deepseek-r1:32b", "gpt-oss:20b"];
const isReasoner = (m) => REASONERS.includes(m);

test("firstIdentityLine: strips frontmatter, returns heading text; fallback on empty", () => {
  assert.equal(firstIdentityLine("---\nx: 1\n---\n# Quality Galaxy\nbody", "fb"), "Quality Galaxy");
  assert.equal(firstIdentityLine("plain line\nmore", "fb"), "plain line");
  assert.equal(firstIdentityLine("", "fb"), "fb");
  assert.equal(firstIdentityLine(null, "fb"), "fb");
});

test("buildReasoningPrompt: PURE -- includes galaxy, identity, posture, synthesis, query", () => {
  const p = buildReasoningPrompt(
    { galaxy: "quality", identity: "Quality galaxy -- Cpk/SPC", posture: { score: 0.57, band: "partial", gaps: ["ownsOrWiresAi"] }, synthesis: "SPC gates for mill/lathe.", sources: ["CLAUDE.md"] },
    "What does this galaxy do?"
  );
  assert.ok(p.includes('reasoning bridge for the PRISM "quality" galaxy'));
  assert.ok(p.includes("Quality galaxy -- Cpk/SPC"));
  assert.ok(p.includes("score 0.57 (partial)"));
  assert.ok(p.includes("gaps: ownsOrWiresAi"));
  assert.ok(p.includes("SPC gates for mill/lathe."));
  assert.ok(p.includes("Question: What does this galaxy do?"));
  assert.ok(p.includes("ONLY from the galaxy context")); // anti-hallucination instruction
});

test("buildReasoningPrompt: default query when none given; tolerates empty context", () => {
  const p = buildReasoningPrompt({ galaxy: "x" }, "");
  assert.ok(p.includes("Summarize this galaxy's purpose"));
  assert.ok(p.includes('"x"'));
  // no posture/synthesis lines when absent
  assert.ok(!p.includes("AI-synergy posture:"));
  assert.ok(!p.includes("Known galaxy context"));
});

// --- RAG hybrid wiring ---
test("buildReasoningPrompt: RAG -- renders retrieved sections and PREFERS them over synthesis", () => {
  const p = buildReasoningPrompt(
    {
      galaxy: "mill",
      identity: "mill galaxy",
      synthesis: "FIXED SYNTHESIS PREFIX should be suppressed when retrieval hit.",
      retrieved: [
        { source: "mill/MEMORY.md", heading: "Speed and feed", text: "Kienzle force + rpm.", score: 9.6 },
        { source: "mill/CLAUDE.md", heading: "Gotchas", text: "Units-first.", score: 4.2 },
      ],
    },
    "how is force computed?"
  );
  assert.ok(p.includes("Most relevant galaxy context for THIS question"));
  assert.ok(p.includes("[mill/MEMORY.md # Speed and feed]"));
  assert.ok(p.includes("Kienzle force + rpm."));
  assert.ok(!p.includes("FIXED SYNTHESIS PREFIX")); // synthesis suppressed when retrieval present
  assert.ok(!p.includes("compounded synthesis"));
});

test("buildReasoningPrompt: RAG -- falls back to synthesis when retrieved is empty (contract preserved)", () => {
  const p = buildReasoningPrompt(
    { galaxy: "mill", identity: "mill galaxy", synthesis: "Fallback synthesis spine.", retrieved: [] },
    "off-topic"
  );
  assert.ok(p.includes("Known galaxy context (compounded synthesis):"));
  assert.ok(p.includes("Fallback synthesis spine."));
});

test("gatherGalaxyDocs: bounded set (<=5) of the galaxy's own doctrine files, real galaxy", () => {
  const docs = gatherGalaxyDocs("mill", undefined);
  assert.ok(Array.isArray(docs));
  assert.ok(docs.length >= 1 && docs.length <= 5, `expected 1..5 docs, got ${docs.length}`);
  assert.ok(docs.every((d) => typeof d.source === "string" && typeof d.text === "string"));
  // mill has CLAUDE.md at minimum
  assert.ok(docs.some((d) => d.source === "mill/CLAUDE.md"));
});

test("gatherGalaxyDocs: includes SOUL.md -- the /goal-named soul synergy surface is in the AI corpus", () => {
  // All 34 galaxies ship a SOUL.md (domain-specialist identity). The AI stack (RAG/CAG/dense/
  // LoRA/GNN node-features) reads gatherGalaxyDocs, so the soul MUST be a source or the synergy
  // is blind to it. Regression-lock: dropping SOUL.md from the candidate list fails this.
  const docs = gatherGalaxyDocs("mill", undefined);
  assert.ok(docs.some((d) => d.source === "mill/SOUL.md"), "expected mill/SOUL.md in the corpus");
});

test("assembleGalaxyContext: RAG -- a real galaxy + query yields retrieved sections + sources tag", () => {
  // Integration over the live repo (deterministic: mill's doctrine files are committed).
  const cForce = assembleGalaxyContext("mill", { query: "cutting force kienzle spindle rpm speed feed" });
  assert.ok(Array.isArray(cForce.retrieved));
  assert.ok(cForce.retrieved.length >= 1, "expected retrieved sections for a domain query");
  assert.ok(cForce.sources.some((s) => s.startsWith("retrieved:")));
  // No query -> NO retrieval (back-compat: old fixed-context behavior)
  const cNone = assembleGalaxyContext("mill", {});
  assert.deepEqual(cNone.retrieved, []);
  assert.ok(!cNone.sources.some((s) => s.startsWith("retrieved:")));
});

test("assembleGalaxyContext: FAILURE throws on empty galaxy", () => {
  assert.throws(() => assembleGalaxyContext(""), /galaxy/);
  assert.throws(() => assembleGalaxyContext(null), /galaxy/);
});

test("assembleGalaxyContext: fail-soft on a nonexistent galaxy -> identity fallback, no sources, no throw", () => {
  const c = assembleGalaxyContext("zzz-not-a-real-galaxy");
  assert.equal(c.galaxy, "zzz-not-a-real-galaxy");
  assert.equal(c.identity, "zzz-not-a-real-galaxy galaxy"); // fallback
  assert.equal(c.synthesis, null);
  assert.deepEqual(c.sources, []);
});

test("reasonForGalaxy: NEVER throws -- bad galaxy still resolves to a result object", async () => {
  // A nonexistent galaxy assembles an empty context; the Ollama call may succeed or
  // degrade, but the function must resolve (never reject) with ok=true.
  const r = await reasonForGalaxy("zzz-not-a-real-galaxy", "hi", { timeoutMs: 8000 });
  assert.equal(typeof r, "object");
  assert.equal(r.galaxy, "zzz-not-a-real-galaxy");
  assert.equal(r.ok, true); // either answered or degraded -- both are ok=true
  assert.ok(typeof r.degraded === "boolean");
});

// --- resolveDenseMode (FLEET-OLLAMA-ROUTING / U-FLOR-HYBRID-DEFAULT, slot:tango 2026-06-10) ---
// The dense/hybrid arm was built off-by-default (charlie U#3); these encode the operator-
// directed flip to ON-by-default. R9: each test fails if the gating intent regresses.

test("resolveDenseMode: DEFAULT ON when a real query is given (the operator flip; env unset)", () => {
  // This is the load-bearing change -- it would have returned FALSE under the old opt-in
  // default (env PRISM_GALAXY_RAG_DENSE !== '1'). Encodes WHY: utilize hybrids fleet-wide.
  assert.equal(resolveDenseMode({ env: {}, optsDense: undefined, queryGiven: true }), true);
});

test("resolveDenseMode: OFF when there is no query -- nothing to rerank (synthesis fallback)", () => {
  assert.equal(resolveDenseMode({ env: {}, optsDense: undefined, queryGiven: false }), false);
  // env=ON cannot force dense without a query to rerank.
  assert.equal(resolveDenseMode({ env: { PRISM_GALAXY_RAG_DENSE: "1" }, queryGiven: false }), false);
});

test("resolveDenseMode: explicit env opt-OUT (PRISM_GALAXY_RAG_DENSE=0) wins over the new default", () => {
  assert.equal(resolveDenseMode({ env: { PRISM_GALAXY_RAG_DENSE: "0" }, queryGiven: true }), false);
});

test("resolveDenseMode: explicit caller opt-OUT (opts.dense===false) wins over the new default", () => {
  assert.equal(resolveDenseMode({ env: {}, optsDense: false, queryGiven: true }), false);
});

test("resolveDenseMode: back-compat -- callers that set env '1' explicitly still get dense ON", () => {
  assert.equal(resolveDenseMode({ env: { PRISM_GALAXY_RAG_DENSE: "1" }, optsDense: undefined, queryGiven: true }), true);
});

test("resolveDenseMode: adversarial -- opt-out beats both query and any non-0 env truthy noise", () => {
  // Only the literal "0" / opts.dense===false disable; a random env value does NOT.
  assert.equal(resolveDenseMode({ env: { PRISM_GALAXY_RAG_DENSE: "yes" }, queryGiven: true }), true);
  assert.equal(resolveDenseMode({ env: { PRISM_GALAXY_RAG_DENSE: "0" }, optsDense: true, queryGiven: true }), false);
  // no-arg call must not throw (defensive default).
  assert.equal(resolveDenseMode(), false);
});

// --- resolveReasoningModel (FLEET-OLLAMA-ROUTING / U-FLOR-BRIDGE-DEEP-REASON, slot:tango 2026-06-11) ---
// Opt-in deep-reasoning routing: DEFAULT stays the fast coder model (per-galaxy sweep
// speed -- the author's deliberate choice); DEEP routes to the strongest INSTALLED local
// reasoning model. R9: each test fails if the routing/install-gate/fallback intent regresses.

test("resolveReasoningModel: FAST default when deep is not requested (env unset, opts undefined)", () => {
  const m = resolveReasoningModel({ env: {}, optsDeep: undefined, available: null });
  assert.ok(!isReasoner(m), `fast path must NOT pick a reasoning model, got ${m}`); // the coder default
});

test("resolveReasoningModel: DEEP picks the STRONGEST installed reasoner (120b over 32b)", () => {
  assert.equal(
    resolveReasoningModel({ env: {}, optsDeep: true, available: ["qwen2.5-coder:32b", "deepseek-r1:32b", "gpt-oss:120b"] }),
    "gpt-oss:120b",
  );
});

test("resolveReasoningModel: DEEP install-gates DOWN to deepseek when 120b is absent", () => {
  assert.equal(
    resolveReasoningModel({ env: {}, optsDeep: true, available: ["deepseek-r1:32b", "qwen2.5-coder:32b"] }),
    "deepseek-r1:32b",
  );
});

test("resolveReasoningModel: DEEP with NO reasoner installed -> fast fallback, never a missing tag", () => {
  const r = resolveReasoningModel({ env: {}, optsDeep: true, available: ["qwen2.5-coder:32b"] });
  assert.ok(!isReasoner(r), `must fall back to the fast model, not an absent reasoner, got ${r}`);
  assert.equal(r, resolveReasoningModel({ env: {}, optsDeep: false }), "fallback must equal the fast-path model");
});

test("resolveReasoningModel: DEEP with tag list UNAVAILABLE (Ollama down) -> top preference attempt", () => {
  // available=null means /api/tags was unreachable. A down Ollama fails the fast default
  // identically, so attempting the strongest reasoner costs nothing (the bridge degrades either way).
  assert.equal(resolveReasoningModel({ env: {}, optsDeep: true, available: null }), "gpt-oss:120b");
});

test("resolveReasoningModel: env PRISM_GALAXY_BRIDGE_DEEP=1 triggers deep (no opts)", () => {
  assert.equal(
    resolveReasoningModel({ env: { PRISM_GALAXY_BRIDGE_DEEP: "1" }, available: ["gpt-oss:120b"] }),
    "gpt-oss:120b",
  );
});

test("resolveReasoningModel: explicit opts.model OVERRIDES everything (deep + env + available)", () => {
  assert.equal(
    resolveReasoningModel({ env: { PRISM_GALAXY_BRIDGE_DEEP: "1" }, optsModel: "custom:7b", optsDeep: true, available: ["gpt-oss:120b"] }),
    "custom:7b",
  );
});

test("resolveReasoningModel: adversarial -- opts.deep===false beats env=1 (caller opt-out wins)", () => {
  const r = resolveReasoningModel({ env: { PRISM_GALAXY_BRIDGE_DEEP: "1" }, optsDeep: false, available: ["gpt-oss:120b"] });
  assert.ok(!isReasoner(r), `explicit opts.deep=false must force the fast path, got ${r}`);
  // no-arg call must not throw (defensive default).
  assert.ok(typeof resolveReasoningModel() === "string");
});

// --- A-06 master-brain compound recall (HERMES-ZULU-A06, slot:zulu 2026-06-11) ---
// Closes the gap where the bridge reasons over a galaxy's LOCAL doctrine only, blind to the
// MASTER brain. Opt-in (PRISM_GALAXY_BRIDGE_MASTER=1) + fail-soft + additive. R9: each test
// fails if the gating / fail-soft / fleet-awareness intent regresses.

test("masterBrainEnabled: OPT-IN -- only PRISM_GALAXY_BRIDGE_MASTER=1 enables it", () => {
  assert.equal(masterBrainEnabled({}), false);
  assert.equal(masterBrainEnabled({ PRISM_GALAXY_BRIDGE_MASTER: "1" }), true);
  assert.equal(masterBrainEnabled({ PRISM_GALAXY_BRIDGE_MASTER: "0" }), false);
  assert.equal(masterBrainEnabled({ PRISM_GALAXY_BRIDGE_MASTER: "yes" }), false); // strict "1"
});

test("gatherGalaxyDocs: includeMaster appends the MASTER-BRAIN cross-recall doc (the A-06 lift)", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "grb-master-"));
  const master = path.join(root, "MEMORY.md");
  fs.writeFileSync(master, "- [galaxy:mill] mcp-server/src/engines/mill/MEMORY.md -- mill galaxy\n- [galaxy:lathe] x -- lathe");
  const docs = gatherGalaxyDocs("mill", undefined, { includeMaster: true, masterMemoryPath: master });
  const md = docs.find((d) => d.source === "mill/MASTER-BRAIN");
  assert.ok(md, "expected a mill/MASTER-BRAIN doc when includeMaster=true");
  assert.match(md.text, /\[galaxy:mill\]/);                  // the galaxy's master back-pointer
  assert.match(md.text, /Fleet cross-recall \(2 galaxies\)/); // fleet awareness surfaced
  assert.ok(docs.some((d) => d.source === "mill/CLAUDE.md")); // local corpus still present
  fs.rmSync(root, { recursive: true, force: true });
});

test("gatherGalaxyDocs: master-brain is FAIL-SOFT -- a bad master path omits it, never throws", () => {
  const docs = gatherGalaxyDocs("mill", undefined, { includeMaster: true, masterMemoryPath: "Z:/nope/MEMORY.md" });
  assert.ok(!docs.some((d) => d.source === "mill/MASTER-BRAIN")); // omitted, not fabricated
  assert.ok(docs.some((d) => d.source === "mill/CLAUDE.md"));      // local corpus intact (no regression)
});

test("gatherGalaxyDocs: DEFAULT (no opts) stays local-only -- master is opt-in (bound preserved)", () => {
  const docs = gatherGalaxyDocs("mill", undefined);
  assert.ok(!docs.some((d) => d.source === "mill/MASTER-BRAIN"));
  assert.ok(docs.length <= 5, "local-only corpus must stay bounded <=5 when master is off");
});

// --- keep_alive warmth (BRAVO AI-SYNERGY-BRIDGE-WARMTH, slot:bravo 2026-06-13) ---
// The bridge's Ollama call shipped WITHOUT keep_alive, so a cold 32B reasoning model was
// evicted at Ollama's ~5min default between galaxies -> every call re-cold-loaded -> blew the
// 60s budget -> degraded to the caller's LLM (a token-economy leak: local per-galaxy reasoning
// silently bounces back to Claude). PROVEN LIVE: only nomic-embed resident, qwen2.5-coder:32b
// cold, a real bridge call returned { degraded:true, error:"This operation was aborted" } with
// no answer. R9: each test fails if the warmth/override intent regresses.

test("resolveKeepAlive: DEFAULT 30m (Blackwell host convention; clones ask-ollama.mjs)", () => {
  assert.equal(resolveKeepAlive({}), "30m");
});

test("resolveKeepAlive: OLLAMA_KEEP_ALIVE override wins (operator-tunable, same env var as ask-ollama)", () => {
  assert.equal(resolveKeepAlive({ OLLAMA_KEEP_ALIVE: "60m" }), "60m");
  assert.equal(resolveKeepAlive({ OLLAMA_KEEP_ALIVE: "0" }), "0"); // explicit no-retain is honored
});

test("buildOllamaRequestBody: PURE -- carries keep_alive so the model stays warm across the sweep", () => {
  const body = buildOllamaRequestBody("PROMPT", "qwen2.5-coder:32b", {});
  assert.equal(body.model, "qwen2.5-coder:32b");
  assert.equal(body.prompt, "PROMPT");
  assert.equal(body.stream, false);
  // THE load-bearing fix: keep_alive WAS ABSENT before this unit (the cold-evict degradation bug).
  assert.equal(body.keep_alive, "30m");
});

test("buildOllamaRequestBody: keep_alive threads from env; empty prompt still yields a valid body (never throws)", () => {
  assert.equal(buildOllamaRequestBody("p", "m", { OLLAMA_KEEP_ALIVE: "45m" }).keep_alive, "45m");
  assert.deepEqual(
    buildOllamaRequestBody("", "m", {}),
    { model: "m", prompt: "", stream: false, keep_alive: "30m" },
  );
});

// --- wiki synergy (BRAVO AI-SYNERGY-BRIDGE-WIKI, slot:bravo 2026-06-13) ---
// The /goal names "synergized with ... wikis across all galaxies". The reasoning corpus now
// resolves the galaxy's OWN [[wiki-links]] to their wiki bodies. Default OFF in gatherGalaxyDocs
// (the GNN node-feature consumer reads it directly -> must stay unchanged), default ON on the
// reasoning path. R9: each test fails if the gating/resolution/cross-consumer intent regresses.

test("extractWikiLinks: PURE -- [[name]] / [[name|alias]] / [[name#sec]]; dedupe + lowercase", () => {
  assert.deepEqual(
    extractWikiLinks("see [[Foo-Bar]] and [[baz|the baz]] and [[Foo-Bar#sec]] and [[baz]]"),
    ["foo-bar", "baz"], // deduped, lowercased, alias/section stripped
  );
  assert.deepEqual(extractWikiLinks(""), []);
  assert.deepEqual(extractWikiLinks(null), []);
  assert.deepEqual(extractWikiLinks("no links here"), []);
});

test("resolveGalaxyWikiDocs: resolves a referenced wiki entry, strips frontmatter, char-caps", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "grb-wiki-"));
  const wdir = path.join(root, "knowledge/wiki/architecture");
  fs.mkdirSync(wdir, { recursive: true });
  fs.writeFileSync(path.join(wdir, "my-topic.md"), "---\nx: 1\n---\nReal wiki body about my-topic.");
  const docs = resolveGalaxyWikiDocs("the galaxy references [[My-Topic]] here", root);
  const d = docs.find((x) => x.source === "wiki/my-topic");
  assert.ok(d, "expected wiki/my-topic resolved");
  assert.match(d.text, /Real wiki body about my-topic\./);
  assert.ok(!d.text.includes("x: 1"), "frontmatter must be stripped");
  assert.ok(resolveGalaxyWikiDocs("[[My-Topic]]", root, { charCap: 4 })[0].text.length <= 4, "charCap respected");
  fs.rmSync(root, { recursive: true, force: true });
});

test("resolveGalaxyWikiDocs: cap bounds count; non-wiki links skipped; fail-soft on missing wiki dir", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "grb-wiki2-"));
  const wdir = path.join(root, "knowledge/wiki");
  fs.mkdirSync(wdir, { recursive: true });
  for (const n of ["a", "b", "c"]) fs.writeFileSync(path.join(wdir, `${n}.md`), `body ${n}`);
  const docs = resolveGalaxyWikiDocs("[[a]] [[b]] [[c]] [[reference_not_a_wiki_entry]]", root, { cap: 2 });
  assert.equal(docs.length, 2, "cap=2 must bound the count");
  assert.ok(docs.every((d) => d.source.startsWith("wiki/")), "non-wiki [[links]] (memory refs) must be skipped");
  fs.rmSync(root, { recursive: true, force: true });
  assert.deepEqual(resolveGalaxyWikiDocs("[[x]]", "Z:/nope-no-root"), [], "missing wiki dir -> [] (never throws)");
});

test("gatherGalaxyDocs: includeWiki OPT-IN -- default OFF (protects GNN consumer), ON appends wiki", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "grb-wiki3-"));
  const gDir = path.join(root, "mcp-server/src/engines/zeta");
  fs.mkdirSync(gDir, { recursive: true });
  fs.writeFileSync(path.join(gDir, "MEMORY.md"), "zeta galaxy memory referencing [[zeta-doctrine]].");
  const wdir = path.join(root, "knowledge/wiki/architecture");
  fs.mkdirSync(wdir, { recursive: true });
  fs.writeFileSync(path.join(wdir, "zeta-doctrine.md"), "The zeta doctrine wiki body.");
  const off = gatherGalaxyDocs("zeta", root); // default -> NO wiki (GNN consumer path unchanged)
  assert.ok(!off.some((d) => d.source.startsWith("wiki/")), "default must NOT include wiki (GNN consumer safe)");
  const on = gatherGalaxyDocs("zeta", root, { includeWiki: true }); // opt-in -> wiki appended
  assert.ok(on.some((d) => d.source === "wiki/zeta-doctrine"), "includeWiki must append the referenced wiki");
  assert.ok(on.length > off.length, "wiki adds to the corpus");
  fs.rmSync(root, { recursive: true, force: true });
});

// --- model fallback ladder (BRAVO AI-SYNERGY-BRIDGE-FALLBACK, slot:bravo 2026-06-13) ---
// The resilience half of "robust leg #10": on a model load/generate failure, descend to a smaller
// installed reasoner before degrading to the caller's LLM. R9: each test fails if the descend-only /
// no-guess / override intent regresses.
test("buildFallbackLadder: descends from the requested model, NEVER tries a larger tier", () => {
  assert.deepEqual(buildFallbackLadder("qwen2.5-coder:32b", {}), ["qwen2.5-coder:32b", "gpt-oss:20b", "qwen2.5-coder:1.5b"]);
  assert.deepEqual(buildFallbackLadder("gpt-oss:120b", {}), ["gpt-oss:120b", "qwen2.5-coder:32b", "gpt-oss:20b", "qwen2.5-coder:1.5b"]);
  assert.deepEqual(buildFallbackLadder("qwen2.5-coder:1.5b", {}), ["qwen2.5-coder:1.5b"]); // smallest -> no further fallback
});

test("buildFallbackLadder: unknown/custom model gets NO fallback (never guess a substitute)", () => {
  assert.deepEqual(buildFallbackLadder("custom:7b", {}), ["custom:7b"]);
});

test("buildFallbackLadder: env override (csv, large->small) replaces default tiers; non-member -> no fallback", () => {
  assert.deepEqual(buildFallbackLadder("b", { PRISM_GALAXY_BRIDGE_FALLBACK: "a, b, c" }), ["b", "c"]);
  assert.deepEqual(buildFallbackLadder("z", { PRISM_GALAXY_BRIDGE_FALLBACK: "a,b,c" }), ["z"]);
});

test("resolveWikiMode: default ON; env PRISM_GALAXY_BRIDGE_WIKI=0 opts-out; explicit opts wins", () => {
  assert.equal(resolveWikiMode({ env: {} }), true); // default ON (reasoning path)
  assert.equal(resolveWikiMode({ env: { PRISM_GALAXY_BRIDGE_WIKI: "0" } }), false); // env opt-out
  assert.equal(resolveWikiMode({ optsIncludeWiki: false, env: {} }), false); // explicit off wins
  assert.equal(resolveWikiMode({ optsIncludeWiki: true, env: { PRISM_GALAXY_BRIDGE_WIKI: "0" } }), true); // explicit on beats env-out
  assert.equal(resolveWikiMode(), true); // no-arg defensive default
});

// P1 fix (3-of-3 scrutiny arm C): the dense rerank + CAG fingerprint must build over the SAME
// wiki-included corpus as the prompt -- before the fix they re-gathered WITHOUT wiki, silently
// dropping wiki on the live default path + leaving a wiki-blind fingerprint. This test exercises
// reasonForGalaxy END-TO-END via a seeded CAG hit: it seeds the cache keyed by the WIKI-INCLUDED
// corpus fingerprint, so a hit PROVES reasonForGalaxy computed its fingerprint over the wiki
// corpus. If includeWiki is dropped from the (now single) reasoningDocs gather, the fingerprint
// is wiki-less -> mismatch -> MISS -> no cached hit -> the assert FAILS. (Arm B's prior round
// proved the old direct-gather test passed even with the fix reverted; this one does not.)
test("P1 (REGRESSION-PINNED): reasonForGalaxy fingerprints over the WIKI-included corpus -> seeded CAG hit", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "grb-wiki4-"));
  const gDir = path.join(root, "mcp-server/src/engines/eta");
  fs.mkdirSync(gDir, { recursive: true });
  fs.writeFileSync(path.join(gDir, "MEMORY.md"), "eta galaxy memory citing [[eta-topic]] for its doctrine.");
  const wpath = path.join(root, "knowledge/wiki", "eta-topic.md");
  fs.mkdirSync(path.dirname(wpath), { recursive: true });
  fs.writeFileSync(wpath, "ETA wiki body -- the canonical eta doctrine.");
  const cagFile = path.join(root, "cag.json");
  const query = "what is the eta doctrine";
  const model = "test-model"; // explicit -> resolveReasoningModel returns it verbatim
  // Seed keyed by the WIKI-INCLUDED fingerprint + the dense+wiki model namespace (denseOn default
  // ON for a query, wiki default ON). corpusFingerprint is order-independent + pure.
  const wikiDocs = gatherGalaxyDocs("eta", root, { includeWiki: true });
  assert.ok(wikiDocs.some((d) => d.source === "wiki/eta-topic"), "precondition: wiki resolves into the corpus");
  const fp = corpusFingerprint(wikiDocs);
  const key = cagKey("eta", `${model}+dense+wiki`, query);
  saveCache(cagFile, putCached(loadCache(cagFile), key, { answer: "SEEDED-WIKI-ANSWER", sources: ["seed"], corpusHash: fp, ts: 2 }, {}));
  // dense:true pins the +dense key namespace deterministically (env-independent); includeWiki is
  // left to its DEFAULT (the thing under test). The hit path returns BEFORE the dense rerank + the
  // Ollama call, so NO live service is needed for the primary assertion.
  const r = await reasonForGalaxy("eta", query, { root, model, cagFile, dense: true });
  assert.equal(r.cached, true, "fingerprint MUST be over the wiki-included corpus -> CAG hit (fails if includeWiki dropped)");
  assert.equal(r.answer, "SEEDED-WIKI-ANSWER");
  // Control: SAME key but a wiki-LESS fingerprint must NOT hit -> proves the fingerprint genuinely
  // depends on wiki content (not just the key namespace).
  const cagFile2 = path.join(root, "cag2.json");
  const fpNoWiki = corpusFingerprint(gatherGalaxyDocs("eta", root)); // default OFF -> no wiki
  saveCache(cagFile2, putCached(loadCache(cagFile2), key, { answer: "STALE-WIKILESS", sources: ["seed"], corpusHash: fpNoWiki, ts: 2 }, {}));
  const r2 = await reasonForGalaxy("eta", query, { root, model, cagFile: cagFile2, dense: true });
  assert.notEqual(r2.answer, "STALE-WIKILESS", "a wiki-LESS fingerprint must NOT hit -> wiki genuinely in the fingerprint");
  fs.rmSync(root, { recursive: true, force: true });
});

// R9 (REGRESSION-PINNED): a CAG hit must report the model that ACTUALLY produced the cached answer
// (usedModel) -- not the requested model -- matching the live fallback path (line ~609 reports
// model: usedModel). The fallback ladder can descend (requested gpt-oss:120b -> produced by
// qwen2.5-coder:1.5b); before this fix a cache HIT misreported the requested model (R12 transparency
// bug, flagged by 3-of-3 arm C). Reverting `model: hit.usedModel || model` -> reports the requested
// model -> the primary assert FAILS. includeWiki:false pins the key namespace (model+dense, no +wiki)
// env-independently and makes the corpus wiki-off -> deterministic fingerprint.
test("R9 (REGRESSION-PINNED): CAG hit reports usedModel (actual producer), not the requested model", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "grb-usedmodel-"));
  const gDir = path.join(root, "mcp-server/src/engines/theta");
  fs.mkdirSync(gDir, { recursive: true });
  fs.writeFileSync(path.join(gDir, "MEMORY.md"), "theta galaxy memory doctrine (no wiki links).");
  const cagFile = path.join(root, "cag.json");
  const model = "gpt-oss:120b";
  const query = "what is theta?";
  const fp = corpusFingerprint(gatherGalaxyDocs("theta", root, { includeWiki: false }));
  const key = cagKey("theta", `${model}+dense`, query);
  // Seed an entry whose answer was produced by a FALLBACK model (descended from the requested one).
  saveCache(cagFile, putCached(loadCache(cagFile), key, { answer: "FALLBACK-ANSWER", sources: ["seed"], corpusHash: fp, ts: 2, usedModel: "qwen2.5-coder:1.5b" }, {}));
  const r = await reasonForGalaxy("theta", query, { root, model, cagFile, dense: true, includeWiki: false });
  assert.equal(r.cached, true, "precondition: seeded entry must hit");
  assert.equal(r.answer, "FALLBACK-ANSWER");
  assert.equal(r.model, "qwen2.5-coder:1.5b", "a cache HIT must report usedModel (the producer), not the requested model (FAILS on revert)");
  // Backward-compat: a LEGACY entry (pre-fix, no usedModel) falls back to the requested model.
  const cagFile2 = path.join(root, "cag2.json");
  saveCache(cagFile2, putCached(loadCache(cagFile2), key, { answer: "LEGACY-ANSWER", sources: ["seed"], corpusHash: fp, ts: 2 }, {}));
  const r2 = await reasonForGalaxy("theta", query, { root, model, cagFile: cagFile2, dense: true, includeWiki: false });
  assert.equal(r2.cached, true);
  assert.equal(r2.model, model, "legacy entry (no usedModel) -> reports requested model (backward-compat)");
  fs.rmSync(root, { recursive: true, force: true });
});
