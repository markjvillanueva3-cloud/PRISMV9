/**
 * Tests for galaxy-soul-render.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-SOULS).
 * Run: node --test scripts/lib/galaxy-soul-render.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { firstHeadline, renderGalaxySoul, SOUL_SCHEMA_VERSION } from "./galaxy-soul-render.mjs";
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
  assert.equal(SOUL_SCHEMA_VERSION, "1.1.0");
});
