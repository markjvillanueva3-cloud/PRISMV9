// Tests for the pure core of hermes-unit-plan-verify-harness.mjs (node:test, no LLM calls).
// Real reference values: happy path + >=3 failure modes + >=2 adversarial inputs per R15.
// Reference data mirrors the LIVE drafts/gap files verified 2026-07-02:
//   UNIT-0030 gap: verdict=extend, 28 existing assets, ROI 9; draft names 25/28 (no dup flag).
//   UNIT-0027 draft: truncated at cap, 555-char body, 1/4 sections -> NEEDS-REWORK.
// NOTE: "—" is the em-dash -- kept as an escape so the source file stays pure-ASCII
// (ascii-guard) while the RUNTIME fixture still exercises the em-dash header variant the
// live drafts use. The section-detection regex must match it regardless of the tail.
import test from "node:test";
import assert from "node:assert/strict";
import {
  stripDraftHeader, hasUnreviewedHeader, isTruncated, detectSections,
  findPlaceholders, extractCitedPaths, parseGap, gateDraft, oneLine,
  upsertBuildQueue, needsVerify, deriveRoi, REQUIRED_SECTIONS,
} from "./hermes-unit-plan-verify-harness.mjs";

// A structurally-complete draft using the REAL section-header variants seen live
// (em-dash, "--", trailing period, parenthetical tail) so section detection is proven robust.
const GOOD_DRAFT = `> **UNREVIEWED HERMES DRAFT** -- UNIT-0018, generated 2026-07-02 via hermes (stepfun/step-3.7-flash:free) by hermes-unit-plan-harness.
> A specialist/Claude slot MUST verify before build or any safety-relevant use.
> Never wire numeric thresholds from this draft into gates without confirmation.

# UNIT-0018 Execution Package -- Data Governance and Knowledge Graph Construction

## Implementation Plan -- dependency-ordered concrete steps closing ONLY the real gaps.
Extend mcp-server/src/engines/EDMWireEngine.ts with the new governance pass. ${"detail ".repeat(120)}

## Draft Knowledge Content — the substantive domain knowledge (models, mechanisms, parameter ranges).
Threshold [UNVERIFIED] 0.42. ${"knowledge ".repeat(120)}

## Validation & Test Plan — real reference-value tests + live-data validation steps (JM Die where applicable).
${"validate ".repeat(80)}

## Risks & Open Questions
${"risk ".repeat(40)}
`;

// A real gap-file shape (mirrors UNIT-0030-gap.md structure exactly).
const GOOD_GAP = `# UNIT-0030 -- MIKE Wire EDM -- FALLBACK FORGE-AUDIT GAP ANALYSIS

## Verdict

- Verdict: **extend**
- ROI: **9**
- Operational assets found: **655**

## Existing Assets To Reuse / Extend

- mcp-server/src/engines/EDMWireEngine.ts
- mcp-server/src/engines/MicroEDMEngine.ts
- mcp-server/src/routes/wedm-erp.ts

## Gaps

- No high-priority axis absent.
`;

// ---------------------------------------------------------------------------
// stripDraftHeader
// ---------------------------------------------------------------------------
test("stripDraftHeader removes the blockquote header + blank lines, keeps body", () => {
  const body = stripDraftHeader(GOOD_DRAFT);
  assert.ok(body.startsWith("# UNIT-0018"), "body should start at the H1");
  assert.ok(!body.includes("UNREVIEWED"), "header must be stripped");
});
test("stripDraftHeader on header-only text returns empty-ish", () => {
  assert.equal(stripDraftHeader("> **UNREVIEWED**\n> line2\n").trim(), "");
});
test("stripDraftHeader adversarial: null/empty never throws", () => {
  assert.equal(stripDraftHeader(null), "");
  assert.equal(stripDraftHeader(""), "");
  assert.equal(stripDraftHeader(undefined), "");
});

// ---------------------------------------------------------------------------
// hasUnreviewedHeader / isTruncated
// ---------------------------------------------------------------------------
test("hasUnreviewedHeader true on real header, false on plain body", () => {
  assert.equal(hasUnreviewedHeader(GOOD_DRAFT), true);
  assert.equal(hasUnreviewedHeader("# Just a title\nbody"), false);
  assert.equal(hasUnreviewedHeader(null), false);
});
test("isTruncated true only when the max_tokens cap NOTE is present", () => {
  assert.equal(isTruncated("> NOTE: completion hit the max_tokens cap (8192) -- may be incomplete."), true);
  assert.equal(isTruncated(GOOD_DRAFT), false);
  assert.equal(isTruncated(null), false);
});

// ---------------------------------------------------------------------------
// detectSections -- the robustness-critical gate
// ---------------------------------------------------------------------------
test("detectSections finds all 4 across em-dash / -- / trailing-period / parenthetical variants", () => {
  const d = detectSections(GOOD_DRAFT);
  assert.equal(d.count, 4);
  assert.deepEqual(d.missing, []);
});
test("detectSections counts partial (2/4) and reports the missing keys", () => {
  const partial = `## Implementation Plan -- x\nbody\n## Draft Knowledge Content -- y\nbody`;
  const d = detectSections(partial);
  assert.equal(d.count, 2);
  assert.ok(d.missing.includes("validation-test"));
  assert.ok(d.missing.includes("risks-open"));
});
test("detectSections 0/4 on prose with no section headers", () => {
  assert.equal(detectSections("just some prose\nwith no headers").count, 0);
});
test("REQUIRED_SECTIONS is exactly the 4 canonical keys", () => {
  assert.deepEqual(REQUIRED_SECTIONS.map(s => s.key),
    ["implementation-plan", "draft-knowledge", "validation-test", "risks-open"]);
});

// ---------------------------------------------------------------------------
// findPlaceholders
// ---------------------------------------------------------------------------
test("findPlaceholders catches TODO/TBD/XXX but NOT the sanctioned [UNVERIFIED] tag", () => {
  const found = findPlaceholders("Step 1 TODO. Value TBD. XXX fixme. Threshold [UNVERIFIED] 0.4.");
  assert.ok(found.some(f => /todo/i.test(f)));
  assert.ok(found.some(f => /tbd/i.test(f)));
  assert.ok(!found.some(f => /UNVERIFIED/i.test(f)), "[UNVERIFIED] must NOT be flagged (it is instructed content)");
});
test("findPlaceholders empty on a clean body", () => {
  assert.deepEqual(findPlaceholders("concrete complete steps with real values 0.42 mm"), []);
});
test("findPlaceholders adversarial: null + caps the list at 5", () => {
  assert.deepEqual(findPlaceholders(null), []);
  assert.equal(findPlaceholders("TODO ".repeat(50)).length, 5);
});

// ---------------------------------------------------------------------------
// extractCitedPaths
// ---------------------------------------------------------------------------
test("extractCitedPaths pulls repo paths, dedups, ignores prose", () => {
  const paths = extractCitedPaths("See mcp-server/src/engines/EDMWireEngine.ts and mcp-server/src/engines/EDMWireEngine.ts and scripts/foo.mjs. The mill engine is nice.");
  assert.ok(paths.includes("mcp-server/src/engines/EDMWireEngine.ts"));
  assert.ok(paths.includes("scripts/foo.mjs"));
  assert.equal(paths.filter(p => p === "mcp-server/src/engines/EDMWireEngine.ts").length, 1, "must dedup");
  assert.ok(!paths.some(p => /mill engine/.test(p)), "prose is not a path");
});
test("extractCitedPaths adversarial: null + long benign string is linear (no hang)", () => {
  assert.deepEqual(extractCitedPaths(null), []);
  assert.deepEqual(extractCitedPaths("a ".repeat(100000)), []);
});

// ---------------------------------------------------------------------------
// parseGap -- silent-no-op guard (must actually parse a real gap file)
// ---------------------------------------------------------------------------
test("parseGap extracts verdict=extend + the existing-assets bullet list", () => {
  const g = parseGap(GOOD_GAP);
  assert.equal(g.verdict, "extend");
  assert.equal(g.existingAssets.length, 3);
  assert.ok(g.existingAssets.includes("mcp-server/src/engines/EDMWireEngine.ts"));
});
test("parseGap adversarial: null / no-section returns safe empties (never throws)", () => {
  assert.deepEqual(parseGap(null), { verdict: null, existingAssets: [] });
  assert.deepEqual(parseGap("# Nothing here"), { verdict: null, existingAssets: [] });
});
// The india/analyst gap format -- 26/31 of the LIVE gap files (UNIT-0002..0027). Would have
// silently returned {verdict:null, existingAssets:[]} against the pre-fix machine-only parser.
const INDIA_GAP = `# UNIT-0018 -- gap analysis

## Existing coverage

- \`mcp-server/src/engines/MemoryGovernanceEngine.ts:1-30\` -- TTL + audit log; wired sessionDispatcher.
- \`scripts/regen-viz.mjs:1-25\` -- single-shot system-viz graph builder.

## Real gaps

- KnowledgeGraphEngine graph is a seeded in-memory demo.

## Verdict
**extend**

## ROI
**5/10** -- real value in unifying governance, but ~70% already exists.
`;
test("parseGap handles the india '## Verdict' / '## Existing coverage' format (majority of live gaps)", () => {
  const g = parseGap(INDIA_GAP);
  assert.equal(g.verdict, "extend");
  assert.ok(g.existingAssets.includes("mcp-server/src/engines/MemoryGovernanceEngine.ts"));
  assert.ok(g.existingAssets.includes("scripts/regen-viz.mjs"));
});
test("deriveRoi handles the india '## ROI' '**N/10**' format", () => {
  assert.equal(deriveRoi(INDIA_GAP), 5);
});

// ---------------------------------------------------------------------------
// deriveRoi
// ---------------------------------------------------------------------------
test("deriveRoi reads the gap file ROI line", () => {
  assert.equal(deriveRoi(GOOD_GAP), 9);
  assert.equal(deriveRoi("no roi here"), 0);
  assert.equal(deriveRoi(null), 0);
});

// ---------------------------------------------------------------------------
// gateDraft -- the whole verdict
// ---------------------------------------------------------------------------
test("gateDraft VERIFIED on a complete draft (happy path)", () => {
  const g = gateDraft({ text: GOOD_DRAFT });
  assert.equal(g.verdict, "VERIFIED");
  assert.deepEqual(g.critical, []);
  assert.equal(g.metrics.sections, 4);
});
test("gateDraft NEEDS-REWORK when the UNREVIEWED header is missing (failure 1)", () => {
  const g = gateDraft({ text: GOOD_DRAFT.replace(/> \*\*UNREVIEWED[\s\S]*?\n\n/, "") });
  assert.equal(g.verdict, "NEEDS-REWORK");
  assert.ok(g.critical.some(c => /header/i.test(c)));
});
test("gateDraft NEEDS-REWORK when body too short (failure 2)", () => {
  const g = gateDraft({ text: "> **UNREVIEWED**\n\n# t\n## Implementation Plan\nx\n## Draft Knowledge Content\ny\n## Validation & Test Plan\nz\n## Risks & Open Questions\nw" });
  assert.equal(g.verdict, "NEEDS-REWORK");
  assert.ok(g.critical.some(c => /too short/i.test(c)));
});
test("gateDraft NEEDS-REWORK when <3 sections (failure 3, mirrors live UNIT-0027)", () => {
  const truncated = `> **UNREVIEWED HERMES DRAFT** -- UNIT-0027\n> NOTE: completion hit the max_tokens cap (8192) -- may be incomplete.\n\n# UNIT-0027\n## Implementation Plan -- steps\n${"x ".repeat(500)}`;
  const g = gateDraft({ text: truncated });
  assert.equal(g.verdict, "NEEDS-REWORK");
  assert.ok(g.critical.some(c => /required sections/i.test(c)));
  assert.ok(g.warnings.some(w => /truncated/i.test(w)), "truncation is also flagged as a warning");
});
test("gateDraft warns (not fails) on truncation when structure is otherwise complete", () => {
  const g = gateDraft({ text: "> **UNREVIEWED**\n> NOTE: completion hit the max_tokens cap (8192).\n\n" + GOOD_DRAFT.split("\n\n").slice(1).join("\n\n") });
  assert.equal(g.verdict, "VERIFIED");
  assert.ok(g.warnings.some(w => /truncated/i.test(w)));
});
test("gateDraft dedup-alignment WARNS when an extend draft names none of the gap's existing assets (adversarial 1)", () => {
  const gap = { verdict: "extend", existingAssets: ["mcp-server/src/engines/ZZZNeverMentioned.ts"] };
  const g = gateDraft({ text: GOOD_DRAFT, gap });
  assert.equal(g.verdict, "VERIFIED", "still structurally build-ready");
  assert.ok(g.warnings.some(w => /greenfield-dup risk/i.test(w)));
});
test("gateDraft NO dedup warning when the extend draft names an existing asset (live 0030 shape)", () => {
  const gap = { verdict: "extend", existingAssets: ["mcp-server/src/engines/EDMWireEngine.ts"] };
  const g = gateDraft({ text: GOOD_DRAFT, gap }); // GOOD_DRAFT cites EDMWireEngine.ts
  assert.ok(!g.warnings.some(w => /greenfield-dup risk/i.test(w)));
});
test("gateDraft anti-hallucination warns on many cited paths that never resolve (adversarial 2)", () => {
  const text = "> **UNREVIEWED**\n\n# t\n## Implementation Plan -- a\nUses mcp-server/src/a.ts mcp-server/src/b.ts scripts/c.mjs.\n## Draft Knowledge Content -- b\n" + "z ".repeat(500) + "\n## Validation & Test Plan -- c\nx\n## Risks & Open Questions\ny";
  const g = gateDraft({ text, resolves: () => false });
  assert.ok(g.warnings.some(w => /0 resolve on disk/i.test(w)));
});
test("gateDraft adversarial: empty text does not throw and yields NEEDS-REWORK", () => {
  const g = gateDraft({ text: "" });
  assert.equal(g.verdict, "NEEDS-REWORK");
  assert.ok(g.critical.length >= 1);
});

// ---------------------------------------------------------------------------
// upsertBuildQueue -- promotion / demotion
// ---------------------------------------------------------------------------
test("upsertBuildQueue adds a VERIFIED unit and ROI-orders desc", () => {
  let q = upsertBuildQueue(null, { id: "0020", verdict: "VERIFIED", roi: 5, verifiedAt: "t1" });
  q = upsertBuildQueue(q, { id: "0030", verdict: "VERIFIED", roi: 9, verifiedAt: "t2" });
  assert.deepEqual(q.units.map(u => u.id), ["0030", "0020"], "higher ROI first");
  assert.equal(q.schemaVersion, "1.0.0");
});
test("upsertBuildQueue REMOVES a unit that regressed to NEEDS-REWORK (no stale build-ready)", () => {
  let q = upsertBuildQueue(null, { id: "0020", verdict: "VERIFIED", roi: 5, verifiedAt: "t1" });
  q = upsertBuildQueue(q, { id: "0020", verdict: "NEEDS-REWORK", roi: 5, verifiedAt: "t2" });
  assert.equal(q.units.length, 0, "regressed unit must not linger as build-ready");
});
test("upsertBuildQueue re-verify of a VERIFIED unit does not duplicate the entry", () => {
  let q = upsertBuildQueue(null, { id: "0020", verdict: "VERIFIED", roi: 5, verifiedAt: "t1" });
  q = upsertBuildQueue(q, { id: "0020", verdict: "VERIFIED", roi: 7, verifiedAt: "t2" });
  assert.equal(q.units.length, 1);
  assert.equal(q.units[0].roi, 7, "newest verdict wins");
});

// ---------------------------------------------------------------------------
// needsVerify -- idempotency
// ---------------------------------------------------------------------------
test("needsVerify: no prior verdict -> true; draft newer -> true; verify newer -> false", () => {
  assert.equal(needsVerify(1000, NaN), true, "never verified");
  assert.equal(needsVerify(2000, 1000), true, "re-drafted since last verdict");
  assert.equal(needsVerify(1000, 2000), false, "already verified, draft unchanged");
});

// ---------------------------------------------------------------------------
// oneLine
// ---------------------------------------------------------------------------
test("oneLine collapses newlines/whitespace and trims", () => {
  assert.equal(oneLine("a\n  b\r\n c "), "a b c");
  assert.equal(oneLine(null), "");
});
