/**
 * Tests for galaxy-soul-render.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-SOULS).
 * Run: node --test scripts/lib/galaxy-soul-render.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  firstHeadline,
  renderGalaxySoul,
  SOUL_SCHEMA_VERSION,
  AI_SYNERGY_STACK_MARKER,
  buildAiStackBlock,
  hasAiStackBlock,
} from "./galaxy-soul-render.mjs";
import { parseSlotSoul } from "../generate-galaxy-souls.mjs";

test("parseSlotSoul: matches BOTH refuse_list: and refuses: keys (R12 no silent drop)", () => {
  const a = parseSlotSoul("---\nrole: r\nvoice: v\ntone: t\nrefuse_list:\n  - x\n  - y\n---");
  assert.deepEqual(a.refuseList, ["x", "y"]);
  assert.equal(a.role, "r");
  assert.equal(a.voice, "v");
  assert.equal(a.tone, "t");
  // the OTHER key spelling (14/26 slots use this) must ALSO parse
  assert.deepEqual(parseSlotSoul("---\nrefuses:\n  - p\n  - q\n---").refuseList, ["p", "q"]);
  // tolerate a blank line before items
  assert.deepEqual(parseSlotSoul("---\nrefuses:\n\n  - z\n---").refuseList, ["z"]);
  // empty/null -> empty array, no throw
  assert.deepEqual(parseSlotSoul("").refuseList, []);
  assert.deepEqual(parseSlotSoul(null).refuseList, []);
});

test("firstHeadline: strips frontmatter, returns heading text", () => {
  assert.equal(firstHeadline("---\nslot: x\n---\n# Quoting Galaxy\nbody"), "Quoting Galaxy");
  assert.equal(firstHeadline("# Mill\n\nfirst para"), "Mill");
});

test("firstHeadline: skips blockquote/hr, strips bullet, returns first real line", () => {
  assert.equal(firstHeadline("> a quote\n- bullet text\n"), "bullet text");
  assert.equal(firstHeadline("plain first line\nmore"), "plain first line");
});

test("firstHeadline: empty/null -> fallback (no throw)", () => {
  assert.equal(firstHeadline("", "fb"), "fb");
  assert.equal(firstHeadline(null, "fb"), "fb");
  assert.equal(firstHeadline(undefined), "");
});

test("renderGalaxySoul: happy path (slot-owned galaxy with posture + refuses)", () => {
  const md = renderGalaxySoul({
    galaxy: "quoting",
    slot: "charlie",
    role: "quoting-specialist",
    voice: "margin-rigorous",
    tone: "precise",
    refuseList: ["inline-shop-rate", "soften-thresholds"],
    claudeHeadline: "Quoting galaxy -- print-to-quote",
    posture: {
      score: 0.96,
      band: "strong",
      rank: 1,
      total: 34,
      gaps: [],
      topRec: null,
      subScores: { discoverability: 1, ownsOrWiresAi: 1, vaultSynergy: 1, crossSubstrate: 0.8, awarenessSurface: 1 },
    },
    generatedAt: "2026-06-10T22:00:00.000Z",
  });
  assert.ok(md.includes("galaxy: quoting"));
  assert.ok(md.includes("slot: charlie"));
  assert.ok(md.includes("ai_synergy_score: 0.96"));
  assert.ok(md.includes(`schemaVersion: ${SOUL_SCHEMA_VERSION}`));
  assert.ok(md.includes("# quoting -- galaxy soul"));
  assert.ok(md.includes("Owner slot: **charlie**"));
  assert.ok(md.includes("score **0.96** (strong) | fleet rank 1/34"));
  assert.ok(md.includes("## Refuses (inherited from owner slot)"));
  assert.ok(md.includes("- inline-shop-rate"));
  assert.ok(md.includes("## Substrate links"));
});

test("renderGalaxySoul: slotless infra galaxy + no posture", () => {
  const md = renderGalaxySoul({ galaxy: "quality" });
  assert.ok(md.includes("slot: (none)"));
  assert.ok(md.includes("Slotless infra galaxy"));
  assert.ok(md.includes("not yet measured"));
  assert.ok(!md.includes("## Refuses")); // no refuses without a slot
  assert.ok(!md.includes("ai_synergy_score")); // no posture -> no AI fm
});

test("renderGalaxySoul: gaps + topRec surfaced when present (partial galaxy)", () => {
  const md = renderGalaxySoul({
    galaxy: "speed-feed",
    slot: "oscar",
    posture: { score: 0.6, band: "partial", rank: 28, total: 34, gaps: ["ownsOrWiresAi"], topRec: "Wire a reasoning bridge." },
  });
  assert.ok(md.includes("gaps: ownsOrWiresAi"));
  assert.ok(md.includes("next: Wire a reasoning bridge."));
});

test("renderGalaxySoul: FAILURE throws on missing/empty galaxy", () => {
  assert.throws(() => renderGalaxySoul({}), /galaxy/);
  assert.throws(() => renderGalaxySoul({ galaxy: "  " }), /galaxy/);
  assert.throws(() => renderGalaxySoul(null), /galaxy/);
});

test("renderGalaxySoul: ADVERSARIAL non-array refuseList / non-string headline -> no crash", () => {
  const md = renderGalaxySoul({ galaxy: "x", slot: "y", refuseList: "not-an-array", claudeHeadline: 123 });
  assert.ok(md.includes("# x -- galaxy soul"));
  assert.ok(!md.includes("## Refuses"));
});

// --- domain enrichment (the fix for the 23 weak slotless souls) ---
test("renderGalaxySoul: domain enrichment renders filter + specialist body + domain refuses", () => {
  const md = renderGalaxySoul({
    galaxy: "compliance-safety",
    slot: null, // slotless infra galaxy -- the weak case
    domainFilter: "sx|alarm|gate|compliance",
    domainRefuses: ["approving-output-below-the-S(x)-gate", "softening-an-alarm-severity"],
    specialistBody: "Obsesses over the safety gate; speaks in S(x) and sigma; never ships below five-sigma.",
  });
  assert.ok(md.includes("domain_filter: sx|alarm|gate|compliance")); // frontmatter
  assert.ok(md.includes("## What this specialist does"));
  assert.ok(md.includes("never ships below five-sigma"));
  assert.ok(md.includes("## Refuses (domain-specific)")); // slotless -> domain-specific label
  assert.ok(md.includes("- approving-output-below-the-S(x)-gate"));
});

test("renderGalaxySoul: domain + slot refuses merge + dedup, labeled as both", () => {
  const md = renderGalaxySoul({
    galaxy: "quoting",
    slot: "charlie",
    refuseList: ["inline-shop-rate", "shared-refuse"],
    domainRefuses: ["shared-refuse", "emitting-quote-without-margin-floor"], // 'shared-refuse' dups
  });
  assert.ok(md.includes("## Refuses (domain-specific + inherited from owner slot)"));
  // dedup: 'shared-refuse' appears exactly once
  assert.equal((md.match(/^- shared-refuse$/gm) || []).length, 1);
  assert.ok(md.includes("- emitting-quote-without-margin-floor"));
  assert.ok(md.includes("- inline-shop-rate"));
});

test("renderGalaxySoul: no enrichment -> back-compat (no domain_filter line, no specialist section)", () => {
  const md = renderGalaxySoul({ galaxy: "x", slot: null });
  assert.ok(!md.includes("domain_filter:"));
  assert.ok(!md.includes("## What this specialist does"));
  // Multi-domain access (op 2026-06-30) is emitted for EVERY soul, even the
  // back-compat no-enrichment case -- full codebase access is fleet-wide, not opt-in.
  assert.ok(md.includes("codebase_access: full"));
  assert.ok(md.includes("multi_domain: true"));
  assert.ok(md.includes("## Codebase access"));
  assert.ok(md.includes("Full multi-domain access"));
  assert.equal(SOUL_SCHEMA_VERSION, "1.2.0");
});

// --- AI Stack (synergized) block: the DURABLE AI-synergy section a regen must never strip ---
test("renderGalaxySoul: ALWAYS emits the AI-SYNERGY-STACK block (regression-pin -- regen must not strip it)", () => {
  // every galaxy soul -- slot-owned, slotless, posture or not -- must carry the AI stack section,
  // because a regen overwrites the file and the manual tango block would otherwise be deleted fleet-wide.
  for (const d of [
    { galaxy: "mill", slot: "foxtrot", posture: { score: 1, band: "strong" } },
    { galaxy: "quality" }, // slotless, no posture
    { galaxy: "ai-training", slot: "india" },
  ]) {
    const md = renderGalaxySoul(d);
    assert.ok(md.includes("<!-- AI-SYNERGY-STACK -->"), `${d.galaxy}: marker present`);
    assert.ok(md.includes("## AI Stack (synergized -- fleet-wide)"), `${d.galaxy}: heading present`);
    // the four named systems the goal demands -- all must be cited
    assert.ok(md.includes("**hybrid RAG**"), `${d.galaxy}: RAG`);
    assert.ok(md.includes("**CAG**"), `${d.galaxy}: CAG`);
    assert.ok(md.includes("**LoRA**"), `${d.galaxy}: LoRA`);
    assert.ok(md.includes("GNN node-features"), `${d.galaxy}: GNN cross-substrate`);
    assert.ok(md.includes("galaxy-reasoning-bridge"), `${d.galaxy}: reasoning bridge (PSN leg #10)`);
  }
});

test("renderGalaxySoul: AI-Stack block is galaxy-TEMPLATED (bridge cmd + synthesis brain name)", () => {
  const md = renderGalaxySoul({ galaxy: "wedm", slot: "mike" });
  // the reasoning-bridge invocation + the synthesis-brain filename must carry THIS galaxy's name,
  // not a hardcoded one -- fails if the template degrades to a constant.
  assert.ok(md.includes('galaxy-reasoning-bridge.mjs wedm "<question>"'), "bridge cmd templated");
  assert.ok(md.includes("`wedm_synthesis.md`"), "synthesis brain templated");
  // and it must NOT leak a different galaxy's name into the block
  assert.ok(!md.includes("mill_synthesis.md"), "no cross-galaxy leak");
});

// --- single-source builder + tolerant idempotency (the P1 fix: renderer<->stamper must not drift) ---
test("buildAiStackBlock: returns galaxy-templated lines starting with the canonical marker", () => {
  const block = buildAiStackBlock("lathe");
  assert.equal(block[0], AI_SYNERGY_STACK_MARKER);
  assert.equal(AI_SYNERGY_STACK_MARKER, "<!-- AI-SYNERGY-STACK -->");
  const joined = block.join("\n");
  assert.ok(joined.includes('galaxy-reasoning-bridge.mjs lathe "<question>"'));
  assert.ok(joined.includes("`lathe_synthesis.md`"));
  assert.ok(joined.includes("**hybrid RAG**") && joined.includes("**CAG**") && joined.includes("**LoRA**"));
});

test("hasAiStackBlock: matches BOTH the canonical AND the legacy dated marker (no double-stamp)", () => {
  assert.equal(hasAiStackBlock("...\n<!-- AI-SYNERGY-STACK -->\n## AI Stack"), true); // canonical
  assert.equal(hasAiStackBlock("...\n<!-- AI-SYNERGY-STACK:tango-2026-06-11 -->\n"), true); // LEGACY dated
  assert.equal(hasAiStackBlock("# soul\nno block here"), false);
  assert.equal(hasAiStackBlock(""), false);
  assert.equal(hasAiStackBlock(null), false);
});

test("renderGalaxySoul AI-Stack block is recognized by hasAiStackBlock (round-trip: renderer output is idempotent for the stamper)", () => {
  const md = renderGalaxySoul({ galaxy: "cad", slot: "delta" });
  // a soul produced by the renderer must be SKIPPED by the stamper -- else the two writers double up.
  assert.equal(hasAiStackBlock(md), true);
});
