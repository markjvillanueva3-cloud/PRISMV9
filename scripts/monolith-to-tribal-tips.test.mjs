// Tests for scripts/monolith-to-tribal-tips.mjs (U-KC-B2, Lane A direct-wire).
// node:test (vitest is broken in this repo). Real-value assertions only —
// no .toBeDefined()/notEqual(undefined) stubs (Karpathy R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  isDataLaneItem,
  categorizeMonolithItem,
  computeConfidence,
  humanizeName,
  buildTags,
  buildBody,
  buildTitle,
  itemToTip,
  convertAll,
  buildEnvelope,
  loadLedger,
  atomicWriteJson,
  VALID_KNOWLEDGE_CATEGORIES,
  CATEGORY_TO_KNOWLEDGE,
} from "./monolith-to-tribal-tips.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const SCRIPT_PATH = path.join(__dirname, "monolith-to-tribal-tips.mjs");
const ENGINE_SRC = path.join(REPO_ROOT, "mcp-server/src/engines/TribalKnowledgeEngine.ts");
const LIVE_LEDGER = path.join(REPO_ROOT, "state/shared/specs/monolith-port-ledger.json");

const FROZEN = "2026-05-16T00:00:00.000Z";
const FROZEN_DATE = new Date(FROZEN);

const LIVE_LEDGER_AVAILABLE = fs.existsSync(LIVE_LEDGER);
const LIVE_SKIP_REASON = LIVE_LEDGER_AVAILABLE ? false : `live ledger missing: ${LIVE_LEDGER}`;

// Collision-proof tmp path (randomBytes, not Date.now — parallel-run safe).
function tmpPath(label, ext) {
  return path.join(os.tmpdir(), `mtt-${label}-${randomBytes(6).toString("hex")}.${ext}`);
}

const DATA_LANE = { laneHint: "A/B2 (data -> tribal knowledge)" };
const CODE_LANE = { laneHint: "B/C (code -> engine/algorithm)" };

// -------- isDataLaneItem --------------------------------------------------

test("isDataLaneItem: A/B2 hint is data-lane, B/C is not", () => {
  assert.equal(isDataLaneItem({ ...DATA_LANE, name: "X" }), true);
  assert.equal(isDataLaneItem({ ...CODE_LANE, name: "X" }), false);
});

test("isDataLaneItem: missing/garbage laneHint is not data-lane", () => {
  assert.equal(isDataLaneItem({}), false);
  assert.equal(isDataLaneItem({ laneHint: null }), false);
  assert.equal(isDataLaneItem({ laneHint: 42 }), false);
  assert.equal(isDataLaneItem(null), false);
  assert.equal(isDataLaneItem("A/B2"), false);
  assert.equal(isDataLaneItem(undefined), false);
});

test("isDataLaneItem: prefix match is strict (A/B2 must START the hint)", () => {
  assert.equal(isDataLaneItem({ laneHint: "prefixed A/B2 (data)" }), false);
  assert.equal(isDataLaneItem({ laneHint: "A/B2" }), true);
});

// -------- categorizeMonolithItem ------------------------------------------

test("categorizeMonolithItem: name-pattern overrides win over category default", () => {
  // category=databases default → general, but POST pattern → post_processor
  assert.equal(categorizeMonolithItem({ name: "PRISM_FUSION_POST_DATABASE", category: "databases" }), "post_processor");
  assert.equal(categorizeMonolithItem({ name: "PRISM_HYPERMILL_FIXTURE_DATABASE", category: "databases" }), "fixturing");
  assert.equal(categorizeMonolithItem({ name: "PRISM_TOOL_PROPERTIES_DATABASE", category: "databases" }), "tooling");
  assert.equal(categorizeMonolithItem({ name: "PRISM_MATERIAL_PROPS", category: "databases" }), "materials_science");
});

test("categorizeMonolithItem: category default when no name pattern", () => {
  assert.equal(categorizeMonolithItem({ name: "PRISM_CONSOLIDATION_REGISTRY", category: "databases" }), "general");
  assert.equal(categorizeMonolithItem({ name: "PRISM_XYZ", category: "materials" }), "materials_science");
  assert.equal(categorizeMonolithItem({ name: "PRISM_XYZ", category: "machines" }), "setup");
  assert.equal(categorizeMonolithItem({ name: "PRISM_XYZ", category: "tools" }), "tooling");
  assert.equal(categorizeMonolithItem({ name: "PRISM_XYZ", category: "knowledge_bases" }), "general");
});

test("categorizeMonolithItem: unknown category falls back to general", () => {
  assert.equal(categorizeMonolithItem({ name: "PRISM_XYZ", category: "nonsense" }), "general");
  assert.equal(categorizeMonolithItem({ name: "PRISM_XYZ" }), "general");
  assert.equal(categorizeMonolithItem({}), "general");
  assert.equal(categorizeMonolithItem(null), "general");
});

test("categorizeMonolithItem: category match is case-insensitive", () => {
  assert.equal(categorizeMonolithItem({ name: "Z", category: "MATERIALS" }), "materials_science");
  assert.equal(categorizeMonolithItem({ name: "Z", category: "Databases" }), "general");
});

test("categorizeMonolithItem: every emitted category is a valid KnowledgeCategory", () => {
  const samples = [
    { name: "PRISM_FUSION_POST_DATABASE", category: "databases" },
    { name: "PRISM_FIXTURE_X", category: "databases" },
    { name: "PRISM_TOOL_X", category: "tools" },
    { name: "PRISM_MATERIAL_X", category: "materials" },
    { name: "PRISM_MACHINE_X", category: "machines" },
    { name: "PRISM_CMM_GAGE", category: "knowledge_bases" },
    { name: "PRISM_NC_PROGRAM", category: "databases" },
    { name: "PRISM_CAM_DB", category: "databases" },
    { name: "PRISM_QC_SPC", category: "databases" },
    { name: "PRISM_SAFETY_RULES", category: "knowledge_bases" },
    { name: "PRISM_WHATEVER", category: "nonsense" },
  ];
  for (const s of samples) {
    const cat = categorizeMonolithItem(s);
    assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(cat), `${s.name} → ${cat} must be a valid category`);
  }
});

// -------- CATEGORY_TO_KNOWLEDGE membership --------------------------------

test("CATEGORY_TO_KNOWLEDGE: every value is a valid KnowledgeCategory", () => {
  for (const [k, v] of Object.entries(CATEGORY_TO_KNOWLEDGE)) {
    assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(v), `CATEGORY_TO_KNOWLEDGE.${k} = ${v} not in VALID_KNOWLEDGE_CATEGORIES`);
  }
});

test("CATEGORY_TO_KNOWLEDGE: covers all 5 monolith data-lane categories", () => {
  for (const c of ["materials", "databases", "machines", "tools", "knowledge_bases"]) {
    assert.ok(c in CATEGORY_TO_KNOWLEDGE, `monolith category ${c} must be mapped`);
  }
});

// -------- VALID_KNOWLEDGE_CATEGORIES drift-detector -----------------------
// NOT self-referential: parses the engine source-of-truth and asserts the
// converter's constant stays a subset of what the engine actually accepts.

test("VALID_KNOWLEDGE_CATEGORIES: stays in sync with TribalKnowledgeEngine.ts source-of-truth", () => {
  if (!fs.existsSync(ENGINE_SRC)) {
    assert.fail(`engine source missing — cannot verify category drift: ${ENGINE_SRC}`);
  }
  const src = fs.readFileSync(ENGINE_SRC, "utf8");
  const coreMatch = src.match(/CORE_CATEGORIES\s*=\s*\[([\s\S]*?)\]\s*as const/);
  const unionMatch = src.match(/export type KnowledgeCategory\s*=([\s\S]*?);/);
  assert.ok(coreMatch, "could not locate CORE_CATEGORIES in engine source");
  assert.ok(unionMatch, "could not locate KnowledgeCategory union in engine source");
  const engineSet = new Set();
  for (const m of coreMatch[1].matchAll(/"([a-z0-9_-]+)"/g)) engineSet.add(m[1]);
  for (const m of unionMatch[1].matchAll(/"([a-z0-9_-]+)"/g)) engineSet.add(m[1]);
  assert.ok(engineSet.size >= 10, `engine category set suspiciously small (${engineSet.size})`);
  // The engine's CORE_CATEGORIES must all be representable by the converter
  // (we don't require the reverse — converter may carry a curated subset).
  for (const m of coreMatch[1].matchAll(/"([a-z0-9_-]+)"/g)) {
    assert.ok(
      VALID_KNOWLEDGE_CATEGORIES.includes(m[1]),
      `engine CORE_CATEGORIES has "${m[1]}" but converter VALID_KNOWLEDGE_CATEGORIES does not — drift`,
    );
  }
});

// -------- computeConfidence ------------------------------------------------

test("computeConfidence: score 0..1 maps to 1..100", () => {
  assert.equal(computeConfidence(0.5), 50);
  assert.equal(computeConfidence(1), 100);
  assert.equal(computeConfidence(0.275), 28); // Math.round(27.5) = 28
  assert.equal(computeConfidence(0.608), 61);
});

test("computeConfidence: FLOOR at 1 (defeats engine confidence||70 falsy-promote of 0)", () => {
  assert.equal(computeConfidence(0), 1, "score 0 must floor to 1, NOT promote to 70");
  assert.equal(computeConfidence(0.001), 1, "round(0.1)=0 → floor 1");
  assert.equal(computeConfidence(-1), 1);
});

test("computeConfidence: clamp at 100 for score > 1", () => {
  assert.equal(computeConfidence(1.5), 100);
  assert.equal(computeConfidence(99), 100);
});

test("computeConfidence: IEEE 754 edge cases floor to 1 (deterministic)", () => {
  assert.equal(computeConfidence(Number.NaN), 1);
  assert.equal(computeConfidence(Number.POSITIVE_INFINITY), 1);
  assert.equal(computeConfidence(Number.NEGATIVE_INFINITY), 1);
  assert.equal(computeConfidence(Number.MIN_VALUE), 1); // ~5e-324 → round 0 → floor 1
  assert.equal(computeConfidence(Number.EPSILON), 1);
  assert.equal(computeConfidence(-0), 1);
  assert.equal(computeConfidence("0.8"), 1, "string is non-number → floor 1");
  assert.equal(computeConfidence(null), 1);
  assert.equal(computeConfidence(undefined), 1);
});

test("computeConfidence: 1000-input fuzz never escapes [1,100]", () => {
  for (let i = 0; i < 1000; i++) {
    const s = (Math.random() * 4) - 1.5; // [-1.5, 2.5]
    const c = computeConfidence(s);
    assert.ok(Number.isInteger(c) && c >= 1 && c <= 100, `score ${s} → ${c} escaped [1,100]`);
  }
});

// -------- humanizeName -----------------------------------------------------

test("humanizeName: strips PRISM_ prefix and title-cases", () => {
  assert.equal(humanizeName("PRISM_FUSION_POST_DATABASE"), "Fusion Post Database");
  assert.equal(humanizeName("PRISM_TOOL_PROPERTIES_DATABASE"), "Tool Properties Database");
  assert.equal(humanizeName("PRISM_MATERIAL_PHYSICS"), "Material Physics");
});

test("humanizeName: handles non-string + empty + no-prefix", () => {
  assert.equal(humanizeName(null), "");
  assert.equal(humanizeName(42), "");
  assert.equal(humanizeName(""), "");
  assert.equal(humanizeName("NO_PREFIX_HERE"), "No Prefix Here");
  assert.equal(humanizeName("PRISM_"), "");
});

// -------- buildTags --------------------------------------------------------

test("buildTags: includes monolith provenance + state + category + ported tags", () => {
  const tags = buildTags({
    name: "PRISM_FUSION_POST_DATABASE",
    category: "databases",
    state: "ported",
    type: "object",
    match: "mcp-server/src/engines/FusionLathePostDeltaRegistryEngine.ts",
  });
  assert.ok(tags.includes("monolith"));
  assert.ok(tags.includes("data-lane"));
  assert.ok(tags.includes("monolith:PRISM_FUSION_POST_DATABASE"), "provenance survives engine source-override");
  assert.ok(tags.includes("monolith-category:databases"));
  assert.ok(tags.includes("state:ported"));
  assert.ok(tags.includes("type:object"));
  assert.ok(tags.some((t) => t.startsWith("ported:")), "ported PRISM home surfaced as navigable tag");
});

test("buildTags: provenance tag is EXEMPT from MAX_TAG_LEN; cosmetic tags are clamped", () => {
  const longName = "PRISM_" + "X".repeat(120); // monolith:<longName> = 135 chars > 80
  const tags = buildTags({ name: longName, category: "databases", state: "ported" });
  // The provenance tag MUST survive even when oversized — it is the only link
  // back to the monolith module after the engine overrides `source` (R12).
  assert.ok(
    tags.includes(`monolith:${longName}`),
    "oversized provenance tag must NOT be silently dropped (attribution is load-bearing)",
  );
  // Every NON-provenance tag must still respect MAX_TAG_LEN.
  for (const t of tags) {
    if (t.startsWith("monolith:PRISM_")) continue; // the exempt provenance tag
    assert.ok(t.length <= 80, `cosmetic tag exceeded MAX_TAG_LEN: ${t}`);
  }
  // dedup
  const set = new Set(tags);
  assert.equal(set.size, tags.length, "tags must be unique");
});

test("buildTags: an oversized cosmetic tag IS dropped (clamp still applies to non-provenance)", () => {
  const tags = buildTags({
    name: "PRISM_X",
    category: "Z".repeat(120), // monolith-category:ZZZ... > 80 → dropped
    state: "ported",
  });
  assert.ok(!tags.some((t) => t.startsWith("monolith-category:")), "oversized cosmetic tag dropped");
  assert.ok(tags.includes("monolith:PRISM_X"), "short provenance tag still present");
  assert.ok(tags.includes("state:ported"), "in-bounds cosmetic tag retained");
});

test("buildTags: tolerates missing fields without throwing", () => {
  const tags = buildTags({ name: "PRISM_X" });
  assert.ok(Array.isArray(tags));
  assert.ok(tags.includes("monolith"));
  assert.ok(tags.includes("monolith:PRISM_X"));
});

test("buildTags: handles null/garbage item", () => {
  assert.deepEqual(buildTags(null).sort(), ["data-lane", "monolith"].sort());
  assert.deepEqual(buildTags(undefined).sort(), ["data-lane", "monolith"].sort());
});

// -------- buildBody --------------------------------------------------------

test("buildBody: structured fact list with state + match + note", () => {
  const body = buildBody({
    name: "PRISM_MATERIAL_PHYSICS",
    category: "materials",
    type: "object",
    state: "ported",
    match: "mcp-server/src/engines/FusionMaterialPhysicsBridge.ts",
    note: "3 strong matches — ported (possibly duplicated)",
  });
  assert.ok(body.includes("PRISM_MATERIAL_PHYSICS"));
  assert.ok(body.includes("ported"));
  assert.ok(body.includes("FusionMaterialPhysicsBridge.ts"));
  assert.ok(body.includes("3 strong matches"));
});

test("buildBody: NEVER blank — fallback for missing fields", () => {
  const b1 = buildBody({ name: "PRISM_X" });
  assert.ok(b1.length > 0);
  assert.ok(b1.includes("PRISM_X"));
  const b2 = buildBody(null);
  assert.ok(b2.length > 0, "null item must still produce a non-empty body");
  const b3 = buildBody({});
  assert.ok(b3.length > 0);
});

test("buildBody: surfaces alternatives when present", () => {
  const body = buildBody({
    name: "PRISM_MATERIAL_PHYSICS",
    state: "ported",
    alternatives: [
      { file: "mcp-server/src/engines/A.ts", kind: "engine", score: 1 },
      { file: "mcp-server/src/engines/B.ts", kind: "engine", score: 1 },
    ],
  });
  assert.ok(body.includes("A.ts"));
  assert.ok(body.includes("B.ts"));
  assert.ok(/alternatives/i.test(body));
});

test("buildBody: no-match item states the absence explicitly (fail-loud)", () => {
  const body = buildBody({ name: "PRISM_ORPHAN", state: "unported", match: null });
  assert.ok(/no matching prism file/i.test(body), "unmatched module must say so, not imply a match");
});

// -------- buildTitle -------------------------------------------------------

test("buildTitle: humanized + prefixed + length-clamped", () => {
  assert.equal(buildTitle({ name: "PRISM_FUSION_POST_DATABASE" }), "Monolith: Fusion Post Database");
  assert.equal(buildTitle(null), "Monolith module");
  assert.equal(buildTitle({}), "Monolith module");
  const long = buildTitle({ name: "PRISM_" + "WORD_".repeat(60) });
  assert.ok(long.length <= 200, "title must be clamped to MAX_TITLE_LEN");
});

// -------- itemToTip --------------------------------------------------------

test("itemToTip: full data-lane item produces a complete KnowledgeTip", () => {
  const tip = itemToTip({
    ...DATA_LANE,
    name: "PRISM_TOOL_PROPERTIES_DATABASE",
    category: "tools",
    type: "object",
    state: "ported",
    score: 0.85,
    match: "mcp-server/src/engines/ToolCatalogEngine.ts",
  }, FROZEN_DATE);
  assert.equal(typeof tip.title, "string");
  assert.ok(tip.title.length > 0);
  assert.equal(typeof tip.body, "string");
  assert.ok(tip.body.length > 0);
  assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(tip.category));
  assert.ok(Array.isArray(tip.tags) && tip.tags.length > 0);
  assert.ok(Number.isInteger(tip.confidence) && tip.confidence >= 1 && tip.confidence <= 100);
  assert.equal(tip.source, "monolith:PRISM_TOOL_PROPERTIES_DATABASE");
  assert.match(tip.created_at, /^\d{4}-\d{2}-\d{2}$/);
});

test("itemToTip: rejects non-data-lane / nameless / garbage", () => {
  assert.equal(itemToTip({ ...CODE_LANE, name: "X" }, FROZEN_DATE), null);
  assert.equal(itemToTip({ ...DATA_LANE }, FROZEN_DATE), null, "no name → null");
  assert.equal(itemToTip({ ...DATA_LANE, name: "" }, FROZEN_DATE), null);
  assert.equal(itemToTip(null, FROZEN_DATE), null);
  assert.equal(itemToTip("string", FROZEN_DATE), null);
});

test("itemToTip: created_at is the frozen date (deterministic)", () => {
  const tip = itemToTip({ ...DATA_LANE, name: "PRISM_X", score: 0.5 }, FROZEN_DATE);
  assert.equal(tip.created_at, "2026-05-16");
});

// -------- convertAll -------------------------------------------------------

test("convertAll: sorts by name, filters non-data-lane, preserves count", () => {
  const items = [
    { ...DATA_LANE, name: "PRISM_ZEBRA", score: 0.5 },
    { ...CODE_LANE, name: "PRISM_CODE", score: 0.9 }, // filtered out
    { ...DATA_LANE, name: "PRISM_ALPHA", score: 0.7 },
    { ...DATA_LANE, name: "PRISM_MIKE", score: 0.3 },
  ];
  const tips = convertAll(items, FROZEN_DATE);
  assert.equal(tips.length, 3, "code-lane item must be excluded");
  const sources = tips.map((t) => t.source);
  assert.deepEqual(sources, [
    "monolith:PRISM_ALPHA",
    "monolith:PRISM_MIKE",
    "monolith:PRISM_ZEBRA",
  ], "must be name-sorted, deterministic");
});

test("convertAll: handles non-array / empty", () => {
  assert.deepEqual(convertAll(null, FROZEN_DATE), []);
  assert.deepEqual(convertAll([], FROZEN_DATE), []);
  assert.deepEqual(convertAll("nope", FROZEN_DATE), []);
});

// -------- buildEnvelope ----------------------------------------------------

test("buildEnvelope: canonical advisory envelope shape", () => {
  const env = buildEnvelope([], { now: FROZEN_DATE, relativeSource: "x", sourceRecords: 0 });
  assert.equal(env.schemaVersion, "1.0.0");
  assert.equal(env.kind, "monolith-data-lane-tips");
  assert.equal(env.advisoryOnly, true);
  assert.equal(env.mustHumanVerify, true);
  assert.equal(env.milestone, "KNOWLEDGE-CONVERSION-MS0");
  assert.equal(env.unit, "U-KC-B2");
  assert.equal(env.generator, "scripts/monolith-to-tribal-tips.mjs");
  assert.ok(Array.isArray(env.tips));
});

test("buildEnvelope: caveat retains advisory + human-gated markers", () => {
  const env = buildEnvelope([], { now: FROZEN_DATE, relativeSource: "x", sourceRecords: 0 });
  assert.match(env.caveat, /advisory/i);
  assert.match(env.caveat, /human-(gated|vetted)/i);
  assert.strictEqual(env.mustHumanVerify, true);
  // It must NOT claim to be authoritative tribal knowledge.
  assert.match(env.caveat, /NOT vetted|NOT authoritative|do NOT treat/i);
});

// -------- Hostile-payload coverage (ledger is audit-emitted, but defense-in-depth) ----

test("hostile-payload: prototype-pollution attempt does NOT escalate", () => {
  const rec = JSON.parse('{"__proto__":{"polluted":true},"laneHint":"A/B2 (data)","name":"PRISM_P","category":"databases","score":0.5}');
  const tips = convertAll([rec], FROZEN_DATE);
  assert.equal(tips.length, 1);
  assert.ok(!tips[0].tags.includes("polluted"));
  assert.equal(({}).polluted, undefined, "no global prototype pollution");
});

test("hostile-payload: control chars in name/note survive (documented passthrough)", () => {
  // Source-escape via fromCharCode so the Read/Edit pipeline cannot silently
  // strip the test bytes (per [[feedback_read_tool_strips_control_chars]]).
  const SOH = String.fromCharCode(0x01);
  const US = String.fromCharCode(0x1f);
  const tip = itemToTip({
    ...DATA_LANE,
    name: "PRISM_" + SOH + "X",
    category: "databases",
    state: "ported",
    note: "audit" + US + "note",
    score: 0.5,
  }, FROZEN_DATE);
  assert.ok(tip, "control-char name still produces a tip");
  assert.equal(tip.body.includes(US), true, "U+001F in note must survive into body");
  assert.equal(tip.source.includes(SOH), true, "U+0001 in name must survive into source");
});

test("hostile-payload: oversized note does not unbound the body catastrophically", () => {
  const huge = "Z".repeat(50000);
  const tip = itemToTip({ ...DATA_LANE, name: "PRISM_HUGE", note: huge, score: 0.5 }, FROZEN_DATE);
  assert.ok(tip.body.length >= 50000, "body carries the note (documented unbounded passthrough)");
  // The contract is per-tip; we pin that it does not THROW and stays a string.
  assert.equal(typeof tip.body, "string");
});

test("hostile-payload: malicious match path with separators stays one token", () => {
  const tags = buildTags({
    name: "PRISM_M",
    state: "ported",
    match: "../../../etc/passwd\\..\\..\\windows\\system32",
  });
  const ported = tags.find((t) => t.startsWith("ported:"));
  assert.ok(ported, "ported tag present");
  assert.ok(!ported.includes("/etc/"), "path traversal segments collapsed to basename tail");
  assert.ok(ported.length <= 80, "still within MAX_TAG_LEN");
});

test("hostile-payload: multi-byte unicode in name is preserved, not corrupted", () => {
  const name = "PRISM_工具_데이터베이스_БД";
  const tip = itemToTip({ ...DATA_LANE, name, score: 0.5 }, FROZEN_DATE);
  assert.equal(tip.source, `monolith:${name}`);
  assert.ok(tip.title.length > 0);
});

// -------- Integration with the live ledger --------------------------------

test("integration: live ledger filters to 133 data-lane items", { skip: LIVE_SKIP_REASON }, () => {
  const items = loadLedger(LIVE_LEDGER);
  assert.equal(items.length, 133, "data-lane subset must be exactly 133 (per U-KC-A1 audit)");
  for (const it of items) {
    assert.ok(isDataLaneItem(it), "every loaded item is data-lane");
  }
});

test("integration: live conversion produces 133 valid tips", { skip: LIVE_SKIP_REASON }, () => {
  const items = loadLedger(LIVE_LEDGER);
  const tips = convertAll(items, FROZEN_DATE);
  assert.equal(tips.length, 133);
  for (const t of tips) {
    assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(t.category), `tip category ${t.category} invalid`);
    assert.ok(t.confidence >= 1 && t.confidence <= 100);
    assert.ok(t.source.startsWith("monolith:PRISM_"));
    assert.ok(t.title.startsWith("Monolith: "));
    assert.ok(t.body.length > 0);
    assert.match(t.created_at, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("integration: live conversion is byte-stable across two in-process runs", { skip: LIVE_SKIP_REASON }, () => {
  const items = loadLedger(LIVE_LEDGER);
  const a = JSON.stringify(buildEnvelope(convertAll(items, FROZEN_DATE), { now: FROZEN_DATE, relativeSource: "x", sourceRecords: items.length }));
  const b = JSON.stringify(buildEnvelope(convertAll(items, FROZEN_DATE), { now: FROZEN_DATE, relativeSource: "x", sourceRecords: items.length }));
  assert.equal(a, b, "same frozen-time input must yield byte-identical output");
});

// -------- CLI integration (env-scrubbed) ----------------------------------
// CLEAN_ENV strips PRISM_*_FROZEN_TIME so a runner with either set can't make
// the determinism test pass for the wrong reason.
const CLEAN_ENV = (() => {
  const e = { ...process.env };
  delete e.PRISM_AUDIT_FROZEN_TIME;
  delete e.PRISM_FROZEN_TIME;
  return e;
})();

test("integration: CLI --frozen-time byte-identical across two runs + no .tmp leak", { skip: LIVE_SKIP_REASON }, () => {
  const tmp1 = tmpPath("cli1", "json");
  const tmp2 = tmpPath("cli2", "json");
  try {
    execFileSync(process.execPath, [SCRIPT_PATH, "--frozen-time", FROZEN, "--output", tmp1], { cwd: REPO_ROOT, env: CLEAN_ENV });
    execFileSync(process.execPath, [SCRIPT_PATH, "--frozen-time", FROZEN, "--output", tmp2], { cwd: REPO_ROOT, env: CLEAN_ENV });
    const a = fs.readFileSync(tmp1);
    const b = fs.readFileSync(tmp2);
    assert.equal(Buffer.compare(a, b), 0, "two runs at same --frozen-time must be byte-identical");
    // Atomic-write contract: a successful run leaves no .tmp sidecar.
    assert.equal(fs.existsSync(tmp1 + ".tmp"), false, "no .tmp sidecar for tmp1");
    assert.equal(fs.existsSync(tmp2 + ".tmp"), false, "no .tmp sidecar for tmp2");
  } finally {
    for (const p of [tmp1, tmp2, tmp1 + ".tmp", tmp2 + ".tmp"]) {
      if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch {}
    }
  }
});

test("integration: CLI rejects invalid --limit with useful stderr (exit 2)", () => {
  for (const v of ["0", "-5", "abc", "1.5"]) {
    let threw = false;
    try {
      execFileSync(process.execPath, [SCRIPT_PATH, "--limit", v], { cwd: REPO_ROOT, stdio: "pipe", env: CLEAN_ENV });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 2, `--limit ${v} should exit 2, got ${err.status}`);
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.match(stderr, /invalid --limit|expected positive integer/, `--limit ${v} stderr lacks reason: ${stderr}`);
    }
    assert.ok(threw, `--limit ${v} should have failed`);
  }
});

test("integration: CLI rejects flags with missing value (exit 2)", () => {
  for (const flag of ["--limit", "--input", "--output", "--frozen-time"]) {
    let threw = false;
    try {
      execFileSync(process.execPath, [SCRIPT_PATH, flag], { cwd: REPO_ROOT, stdio: "pipe", env: CLEAN_ENV });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 2);
    }
    assert.ok(threw, `${flag} (no value) should have failed`);
  }
});

test("integration: CLI --help exits 0 and prints usage", () => {
  const out = execFileSync(process.execPath, [SCRIPT_PATH, "--help"], { cwd: REPO_ROOT, env: CLEAN_ENV }).toString();
  assert.match(out, /Usage:/);
  assert.match(out, /--frozen-time/);
});

// -------- atomicWriteJson + loadLedger unit-level -------------------------

test("atomicWriteJson: writes valid JSON and removes the .tmp sidecar", () => {
  const out = tmpPath("aw", "json");
  try {
    atomicWriteJson(out, { hello: "world", n: 1 });
    assert.equal(fs.existsSync(out), true);
    assert.equal(fs.existsSync(out + ".tmp"), false, "tmp must be renamed away");
    const parsed = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.deepEqual(parsed, { hello: "world", n: 1 });
  } finally {
    for (const p of [out, out + ".tmp"]) if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch {}
  }
});

test("loadLedger: throws on malformed JSON (caller maps to exit 3)", () => {
  const bad = tmpPath("bad", "json");
  try {
    fs.writeFileSync(bad, "{ not json ", "utf8");
    assert.throws(() => loadLedger(bad), /JSON|Unexpected|token/i);
  } finally {
    if (fs.existsSync(bad)) try { fs.unlinkSync(bad); } catch {}
  }
});

test("loadLedger: empty indexedModules yields empty data-lane list", () => {
  const f = tmpPath("empty", "json");
  try {
    fs.writeFileSync(f, JSON.stringify({ indexedModules: {} }), "utf8");
    assert.deepEqual(loadLedger(f), []);
  } finally {
    if (fs.existsSync(f)) try { fs.unlinkSync(f); } catch {}
  }
});

// -------- engine-contract: type-pinned + emulated reader ------------------

test("engine-contract: emitted fields have correct types/shapes (not just presence)", () => {
  const tip = itemToTip({
    ...DATA_LANE, name: "PRISM_CONTRACT", category: "tools", type: "object",
    state: "ported", score: 0.6, match: "mcp-server/src/engines/X.ts",
  }, FROZEN_DATE);
  assert.equal(typeof tip.title, "string");
  assert.ok(tip.title.length > 0 && tip.title.length <= 200);
  assert.equal(typeof tip.body, "string");
  assert.ok(tip.body.length > 0);
  assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(tip.category));
  assert.ok(Array.isArray(tip.tags));
  for (const t of tip.tags) {
    assert.equal(typeof t, "string");
    assert.ok(t.length > 0 && t.length <= 80);
  }
  assert.ok(Number.isInteger(tip.confidence) && tip.confidence >= 1 && tip.confidence <= 100);
  assert.match(tip.source, /^monolith:/);
  assert.match(tip.created_at, /^\d{4}-\d{2}-\d{2}$/);
});

test("engine-contract: emulated loadDocumentLearnedTips() reader preserves confidence floor + overrides source", () => {
  // Mirror TribalKnowledgeEngine.ts:697-710 reader assembly.
  const tip = itemToTip({ ...DATA_LANE, name: "PRISM_FLOOR", score: 0 }, FROZEN_DATE);
  assert.equal(tip.confidence, 1, "converter floors confidence at 1");
  const docId = "monolith-data-lane-tips";
  const idx = 0;
  const engineLoaded = {
    id: `TK-DL-${docId}-${String(idx + 1).padStart(3, "0")}`,
    title: tip.title,
    body: tip.body,
    category: tip.category,
    tags: tip.tags,
    confidence: tip.confidence || 70, // the engine's falsy-promote — floor(1) defeats it
    source: `document:${docId}`,        // engine OVERRIDES source
    created_at: tip.created_at,
    usage_count: 0,
  };
  assert.equal(engineLoaded.confidence, 1, "floor(1) survives engine confidence||70 — NOT promoted to 70");
  assert.match(engineLoaded.id, /^TK-DL-monolith-data-lane-tips-001$/);
  assert.equal(engineLoaded.source, "document:monolith-data-lane-tips");
  assert.notEqual(engineLoaded.source, tip.source, "engine source override loses per-tip provenance");
  // Provenance must therefore live in tags (the monolith:<name> tag).
  assert.ok(tip.tags.some((t) => t.startsWith("monolith:PRISM_FLOOR")), "provenance survives in tags");
});
