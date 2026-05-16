// KNOWLEDGE-CONVERSION-MS0/U-KC-B1 — tests for the course-to-tribal-tips
// converter. node:test (vitest is broken in this repo, see CLAUDE.md).
//
// Coverage targets (from Arm A + Arm B per-file scrutiny):
//   - mapDomainsToCategory: table-driven, every live-corpus domain maps to a
//     non-"general" category; separator normalization works
//   - normalizeDomainKey: hyphen/underscore/space collapse + case-insensitivity
//   - computeConfidence: floor at 1 (load-bearing — engine has confidence ||
//     70 falsy-promotion); clamp at 100; NaN safety
//   - buildTags: dedup + sort + MAX_TAG_LEN drop + missing field tolerance
//   - assetToTip: frozen-time created_at; empty rationale → non-empty body
//   - convertAll: deterministic byte-output across runs
//   - buildEnvelope: schema markers + provenance
//   - loadCandidates: corrupt line throws with line number; unknown kind skip
//   - Membership: every DOMAIN_TO_CATEGORY value is a valid KnowledgeCategory
//   - Integration: emitted JSON matches TribalKnowledgeEngine.loadDocument-
//     LearnedTips() contract (raw.tips / per-item field names)

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  DOMAIN_TO_CATEGORY,
  VALID_KNOWLEDGE_CATEGORIES,
  mapDomainsToCategory,
  normalizeDomainKey,
  computeConfidence,
  buildTags,
  assetToTip,
  convertAll,
  buildEnvelope,
  loadCandidates,
} from "./course-to-tribal-tips.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SCRIPT_PATH = path.join(__dirname, "course-to-tribal-tips.mjs");
const LIVE_JSONL  = path.join(REPO_ROOT, "state/shared/tribal-graph/course-content-candidates.jsonl");

const FROZEN = "2026-05-16T00:00:00Z";
const FROZEN_DATE = new Date(FROZEN);

// LIVE_JSONL is gitignored — integration tests must skip-LOUD when it's absent,
// not silently no-op. node:test surfaces `{ skip: <reason> }` in TAP output.
const LIVE_JSONL_AVAILABLE = fs.existsSync(LIVE_JSONL);
const LIVE_SKIP_REASON = LIVE_JSONL_AVAILABLE ? false : `live corpus missing: ${LIVE_JSONL}`;

// Collision-proof tmp paths — Date.now() ms-resolution alone allows two parallel
// runs to land on the same filename (P1 from Arm B scrutiny).
function tmpPath(prefix, ext = "jsonl") {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`);
}

// -------- normalizeDomainKey ----------------------------------------------

test("normalizeDomainKey: lowercase + trim", () => {
  assert.equal(normalizeDomainKey("CAM"), "cam");
  assert.equal(normalizeDomainKey("  Thermal  "), "thermal");
});

test("normalizeDomainKey: collapses hyphen/underscore/space runs", () => {
  assert.equal(normalizeDomainKey("process optimization"), "process optimization");
  assert.equal(normalizeDomainKey("process-optimization"), "process optimization");
  assert.equal(normalizeDomainKey("process_optimization"), "process optimization");
  assert.equal(normalizeDomainKey("process   optimization"), "process optimization");
  assert.equal(normalizeDomainKey("process-_- optimization"), "process optimization");
});

test("normalizeDomainKey: non-string returns empty", () => {
  assert.equal(normalizeDomainKey(null), "");
  assert.equal(normalizeDomainKey(undefined), "");
  assert.equal(normalizeDomainKey(42), "");
  assert.equal(normalizeDomainKey({}), "");
});

// -------- mapDomainsToCategory --------------------------------------------

test("mapDomainsToCategory: every live-corpus domain maps to a known category", () => {
  // From the live JSONL profile (size 65 records). Any one of these falling
  // through to "general" is a P1 regression.
  const LIVE_DOMAINS = [
    "cam", "thermal", "metrology", "scheduling", "control", "cad",
    "materials", "tool-life", "process optimization", "vibration",
    "mill", "lathe",
  ];
  for (const d of LIVE_DOMAINS) {
    const cat = mapDomainsToCategory([d]);
    assert.notEqual(cat, "general", `domain ${d} fell through to general`);
    assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(cat), `domain ${d} → ${cat} (not a valid KnowledgeCategory)`);
  }
});

test("mapDomainsToCategory: first domain wins when multiple", () => {
  assert.equal(mapDomainsToCategory(["cam", "thermal"]), "cam_strategy");
  assert.equal(mapDomainsToCategory(["thermal", "cam"]), "process_engineering");
});

test("mapDomainsToCategory: empty/missing inputs → general", () => {
  assert.equal(mapDomainsToCategory([]), "general");
  assert.equal(mapDomainsToCategory(null), "general");
  assert.equal(mapDomainsToCategory(undefined), "general");
  assert.equal(mapDomainsToCategory("not-an-array"), "general");
});

test("mapDomainsToCategory: separator-variant matches same category", () => {
  // The bug Arm B flagged: "process-optimization" should NOT silently fall
  // through to "general" just because the table key uses a space.
  assert.equal(mapDomainsToCategory(["process-optimization"]), "optimization");
  assert.equal(mapDomainsToCategory(["process_optimization"]), "optimization");
  assert.equal(mapDomainsToCategory(["process optimization"]), "optimization");
  assert.equal(mapDomainsToCategory(["Process Optimization"]), "optimization");
});

test("mapDomainsToCategory: unknown domain falls through to general", () => {
  assert.equal(mapDomainsToCategory(["quantum-foo"]), "general");
});

// -------- DOMAIN_TO_CATEGORY membership invariant -------------------------

test("DOMAIN_TO_CATEGORY: every VALUE is a valid KnowledgeCategory", () => {
  // Load-bearing: if this fails, the engine's typed `category:` slot gets a
  // string that downstream enum-filters won't recognise.
  for (const [domain, cat] of Object.entries(DOMAIN_TO_CATEGORY)) {
    assert.ok(
      VALID_KNOWLEDGE_CATEGORIES.includes(cat),
      `DOMAIN_TO_CATEGORY[${domain}] = ${cat} is NOT a valid KnowledgeCategory member`,
    );
  }
});

test("VALID_KNOWLEDGE_CATEGORIES: smoke-check well-known members", () => {
  for (const expected of ["setup", "cam_strategy", "general", "multi_axis", "post_processor"]) {
    assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(expected), `missing: ${expected}`);
  }
});

test("VALID_KNOWLEDGE_CATEGORIES: stays in sync with TribalKnowledgeEngine.ts source-of-truth", () => {
  // The script's VALID_KNOWLEDGE_CATEGORIES list is hand-maintained. If the
  // engine's KnowledgeCategory union evolves (member added/renamed/dropped),
  // the script silently emits stale categories. Catch the drift by regex-
  // parsing the engine source — brittle but strictly better than a self-
  // referential tautology. (Arm B P0-2 from per-file scrutiny.)
  const enginePath = path.join(REPO_ROOT, "mcp-server/src/engines/TribalKnowledgeEngine.ts");
  if (!fs.existsSync(enginePath)) {
    assert.fail(`engine source missing at ${enginePath} — drift undetectable`);
    return;
  }
  const src = fs.readFileSync(enginePath, "utf-8");
  const coreMatch = src.match(/CORE_CATEGORIES\s*=\s*\[([\s\S]*?)\]\s*as const/);
  assert.ok(coreMatch, "could not locate CORE_CATEGORIES in engine source");
  const core = [...coreMatch[1].matchAll(/"([a-z_]+)"/g)].map(m => m[1]);
  assert.ok(core.length > 0, "CORE_CATEGORIES regex captured zero members");
  const unionMatch = src.match(/export type KnowledgeCategory\s*=([\s\S]*?);/);
  assert.ok(unionMatch, "could not locate KnowledgeCategory union");
  const extended = [...unionMatch[1].matchAll(/"([a-z_]+)"/g)].map(m => m[1]);
  const engineUnion = new Set([...core, ...extended]);
  // Every category the script emits MUST exist in the engine union.
  for (const cat of VALID_KNOWLEDGE_CATEGORIES) {
    assert.ok(engineUnion.has(cat), `script emits "${cat}" but engine union does NOT include it (drift)`);
  }
  // And conversely: every CORE_CATEGORIES member must be in our list (drop
  // detection — adding new ones is forward-compat-safe; dropping is not).
  for (const cat of core) {
    assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(cat), `engine CORE_CATEGORIES has "${cat}" but our list is missing it`);
  }
});

// -------- computeConfidence -----------------------------------------------

test("computeConfidence: live-corpus range produces 32..72", () => {
  // Boundary-equivalence check against the observed live profile.
  assert.equal(computeConfidence({ mfgRelevance: 0.4, confidence: 0.8 }), 32);
  assert.equal(computeConfidence({ mfgRelevance: 0.8, confidence: 0.9 }), 72);
  assert.equal(computeConfidence({ mfgRelevance: 0.5, confidence: 0.5 }), 25);
});

test("computeConfidence: clamps to [1,100]", () => {
  assert.equal(computeConfidence({ mfgRelevance: 1.0, confidence: 1.0 }), 100);
  assert.equal(computeConfidence({ mfgRelevance: 5.0, confidence: 5.0 }), 100);
  assert.equal(computeConfidence({ mfgRelevance: 0.0, confidence: 0.0 }), 1);
  assert.equal(computeConfidence({ mfgRelevance: -1, confidence: 1 }), 1);
  assert.equal(computeConfidence({ mfgRelevance: 1, confidence: -1 }), 1);
});

test("computeConfidence: NaN inputs floor to 1 (NOT 0 — engine || promotes 0→70)", () => {
  assert.equal(computeConfidence({}), 1);
  assert.equal(computeConfidence({ mfgRelevance: NaN, confidence: NaN }), 1);
  assert.equal(computeConfidence({ mfgRelevance: "not-a-number", confidence: 0.5 }), 1);
  assert.equal(computeConfidence(null), 1);
  assert.equal(computeConfidence(undefined), 1);
});

test("computeConfidence: 1 is the lowest emission (load-bearing regression guard)", () => {
  // If anyone ever weakens this to allow 0, the engine's
  // `confidence: item.confidence || 70` (TribalKnowledgeEngine.ts:706)
  // silently promotes EVERY tip to 70/100 confidence.
  for (let i = 0; i < 1000; i++) {
    const r = Math.random() * 0.01;
    const c = Math.random() * 0.01;
    const out = computeConfidence({ mfgRelevance: r, confidence: c });
    assert.ok(out >= 1, `computeConfidence({${r},${c}}) = ${out} — must be ≥1`);
  }
});

test("computeConfidence: IEEE 754 edge cases floor to 1 (deterministic)", () => {
  // Math.random can't produce 0, MIN_VALUE, EPSILON, or -0. Pin them explicitly.
  assert.equal(computeConfidence({ mfgRelevance: 0, confidence: 0.5 }), 1);
  assert.equal(computeConfidence({ mfgRelevance: 0.5, confidence: 0 }), 1);
  assert.equal(computeConfidence({ mfgRelevance: Number.MIN_VALUE, confidence: 1 }), 1);
  assert.equal(computeConfidence({ mfgRelevance: Number.EPSILON, confidence: Number.EPSILON }), 1);
  assert.equal(computeConfidence({ mfgRelevance: -0, confidence: 1 }), 1);
  // Infinity is NOT finite → falls into the NaN branch → 1.
  assert.equal(computeConfidence({ mfgRelevance: Infinity, confidence: 0.5 }), 1);
  assert.equal(computeConfidence({ mfgRelevance: 0.5, confidence: -Infinity }), 1);
  // String coercion path — Number("0.8") = 0.8 (NOT NaN), should flow through.
  assert.equal(computeConfidence({ mfgRelevance: "0.8", confidence: "0.9" }), 72);
  // String "0" coerces to 0, hits the clamp branch (not the NaN branch).
  assert.equal(computeConfidence({ mfgRelevance: "0", confidence: "0" }), 1);
});

// -------- buildTags --------------------------------------------------------

test("buildTags: includes techniques, kind, course tag, mit-ocw, advisory", () => {
  const tags = buildTags(
    { courseId: "2.008", techniques: ["thermal modeling", "vibration analysis"], prismDomains: ["thermal"] },
    { kind: "algorithm", name: "rk4" },
  );
  assert.ok(tags.includes("mit-ocw"));
  assert.ok(tags.includes("advisory"));
  assert.ok(tags.includes("algorithm"));
  assert.ok(tags.includes("course:2.008"));
  assert.ok(tags.includes("thermal modeling"));
  assert.ok(tags.includes("vibration analysis"));
  assert.ok(tags.includes("thermal"));
});

test("buildTags: case-insensitive dedup", () => {
  const tags = buildTags(
    { courseId: "X", techniques: ["CAM", "cam", "Cam"] },
    { kind: "technique", name: "x" },
  );
  const camCount = tags.filter(t => t.toLowerCase() === "cam").length;
  assert.equal(camCount, 1);
});

test("buildTags: sorted output is deterministic", () => {
  const a = buildTags({ courseId: "A", techniques: ["zebra", "alpha", "kappa"] }, { kind: "tip", name: "x" });
  const b = buildTags({ courseId: "A", techniques: ["kappa", "alpha", "zebra"] }, { kind: "tip", name: "x" });
  assert.deepEqual(a, b);
  // Sorted ascending
  const sorted = [...a].sort();
  assert.deepEqual(a, sorted);
});

test("buildTags: drops over-length tags", () => {
  const tooLong = "x".repeat(81);
  const tags = buildTags(
    { courseId: "X", techniques: [tooLong, "short"] },
    { kind: "tip", name: "x" },
  );
  assert.ok(!tags.includes(tooLong));
  assert.ok(tags.includes("short"));
});

test("buildTags: missing optional fields tolerated", () => {
  const tags = buildTags({}, {});
  assert.ok(tags.includes("mit-ocw"));
  assert.ok(tags.includes("advisory"));
  assert.ok(!tags.some(t => t.startsWith("course:")));
});

// -------- assetToTip -------------------------------------------------------

test("assetToTip: frozen-time created_at is UTC date", () => {
  const tip = assetToTip(
    { courseId: "1.060", courseTitle: "Fluid Dynamics", prismDomains: ["cam"], mfgRelevance: 0.7, confidence: 0.9 },
    { kind: "algorithm", name: "navier-stokes", rationale: "Improves CAM cooling models." },
    FROZEN_DATE,
  );
  assert.equal(tip.created_at, "2026-05-16");
  assert.equal(tip.source, "mit-ocw:1.060");
  assert.equal(tip.category, "cam_strategy");
  assert.equal(tip.subcategory, "algorithm");
  assert.equal(tip.confidence, 63); // round(0.7 * 0.9 * 100)
});

test("assetToTip: empty rationale produces non-empty body (no constant-string stub)", () => {
  const tip = assetToTip(
    { courseId: "X", courseTitle: "", prismDomains: ["cam"] },
    { kind: "engine", name: "WidgetEngine", rationale: "" },
    FROZEN_DATE,
  );
  assert.ok(tip.body.includes("Candidate engine: WidgetEngine"));
  // The constant-tail caveat still appears for advisory framing.
  assert.ok(tip.body.includes("MIT-OpenCourseWare"));
});

test("assetToTip: undefined name → (unnamed) fallback", () => {
  const tip = assetToTip(
    { courseId: "X", prismDomains: ["cam"] },
    { kind: "tip", name: undefined, rationale: "r" },
    FROZEN_DATE,
  );
  assert.ok(tip.title.includes("(unnamed)"));
});

test("assetToTip: emits exactly the engine-readable fields plus subcategory", () => {
  const tip = assetToTip(
    { courseId: "X", prismDomains: ["cam"], mfgRelevance: 0.5, confidence: 0.5 },
    { kind: "algorithm", name: "x", rationale: "y" },
    FROZEN_DATE,
  );
  const keys = new Set(Object.keys(tip));
  // engine reads these on auto-load:
  for (const k of ["title", "body", "category", "tags", "confidence", "source", "created_at"]) {
    assert.ok(keys.has(k), `missing field: ${k}`);
  }
  // engine does NOT read these but they're useful for direct readers:
  assert.ok(keys.has("subcategory"));
  // engine generates `id` and `usage_count` — we must NOT emit them.
  assert.ok(!keys.has("id"));
  assert.ok(!keys.has("usage_count"));
});

// -------- convertAll ------------------------------------------------------

test("convertAll: deterministic across two runs with same input", () => {
  const recs = [
    { courseId: "b", prismDomains: ["cam"], mfgRelevance: 0.5, confidence: 0.5, candidateAssets: [{ kind: "algorithm", name: "z" }, { kind: "engine", name: "a" }] },
    { courseId: "a", prismDomains: ["cad"], mfgRelevance: 0.4, confidence: 0.8, candidateAssets: [{ kind: "tip", name: "x" }] },
  ];
  const a = convertAll(recs, FROZEN_DATE);
  const b = convertAll([...recs].reverse(), FROZEN_DATE);
  assert.deepEqual(a, b);
  // Sort stability: records by courseId asc, then assets by kind+name.
  assert.equal(a[0].title, "MIT OCW a — tip: x");
  assert.equal(a[1].title, "MIT OCW b — algorithm: z");
  assert.equal(a[2].title, "MIT OCW b — engine: a");
});

test("convertAll: records without candidateAssets contribute nothing", () => {
  const recs = [
    { courseId: "x", prismDomains: ["cam"] },
    { courseId: "y", prismDomains: ["cam"], candidateAssets: [] },
  ];
  assert.equal(convertAll(recs, FROZEN_DATE).length, 0);
});

// -------- buildEnvelope ---------------------------------------------------

test("buildEnvelope: contains advisory-only + provenance markers", () => {
  const env = buildEnvelope([{ title: "t", body: "b", category: "general", tags: [], confidence: 50, source: "x", created_at: "2026-05-16" }], {
    now: FROZEN_DATE, relativeSource: "src.jsonl", sourceRecords: 1,
  });
  assert.equal(env.schemaVersion, "1.0.0");
  assert.equal(env.advisoryOnly, true);
  assert.equal(env.mustHumanVerify, true);
  assert.equal(env.kind, "mit-ocw-course-tips");
  assert.equal(env.tips.length, 1);
  assert.equal(env.sourceAssets, 1);
  assert.equal(env.milestone, "KNOWLEDGE-CONVERSION-MS0");
  assert.equal(env.unit, "U-KC-B1");
});

// -------- loadCandidates --------------------------------------------------

test("loadCandidates: throws with line number on corrupt JSON", () => {
  const tmp = tmpPath("course-test");
  fs.writeFileSync(tmp, '{"kind":"course-content-candidate","courseId":"a"}\n{not-json}\n', "utf-8");
  try {
    assert.throws(() => loadCandidates(tmp), /line 2/);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test("loadCandidates: skips unknown record kind with stderr warn", () => {
  const tmp = tmpPath("course-test2");
  fs.writeFileSync(tmp, '{"kind":"course-content-candidate","courseId":"a"}\n{"kind":"something-else"}\n', "utf-8");
  try {
    const recs = loadCandidates(tmp);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].courseId, "a");
  } finally {
    fs.unlinkSync(tmp);
  }
});

test("loadCandidates: missing file throws", () => {
  assert.throws(() => loadCandidates("/nonexistent/path/to/file.jsonl"), /input not found/);
});

test("loadCandidates: empty file returns empty array", () => {
  const tmp = tmpPath("course-test3");
  fs.writeFileSync(tmp, "", "utf-8");
  try {
    assert.deepEqual(loadCandidates(tmp), []);
  } finally {
    fs.unlinkSync(tmp);
  }
});

// -------- Hostile-payload coverage (LLM-output boundary) ------------------

test("hostile-payload: control chars in name/rationale survive end-to-end (documented behavior)", () => {
  // We do NOT strip C0 control chars today — they pass through into title/body.
  // This pins the CURRENT contract so a future change to strip them surfaces as
  // an intentional refactor, not a silent break. Source-escape via fromCharCode
  // so the Read/Edit pipeline does not silently strip the test bytes themselves
  // (per [[feedback_read_tool_strips_control_chars]]).
  const SOH = String.fromCharCode(0x01); // U+0001
  const US  = String.fromCharCode(0x1f); // U+001F
  const name = "a" + SOH + "b";
  const rationale = "r" + SOH + "xyz" + US;
  const tip = assetToTip(
    { courseId: "X", prismDomains: ["cam"], mfgRelevance: 0.5, confidence: 0.5 },
    { kind: "tip", name, rationale },
    FROZEN_DATE,
  );
  // Pin by exact char-code presence — if any boundary stripped the control bytes
  // these assertions fail (whereas a .includes("ab") check would still pass).
  assert.equal(tip.title.includes(SOH), true, "U+0001 (SOH) must survive into title");
  assert.equal(tip.body.includes(SOH), true, "U+0001 (SOH) must survive into body");
  assert.equal(tip.body.includes(US), true, "U+001F (UNIT SEP) must survive into body");
  // Byte-length lower bound — title must contain at least name.length chars.
  assert.ok(tip.title.length >= name.length, "title shrank below source length");
});

test("hostile-payload: prototype-pollution attempt does NOT escalate", () => {
  // JSON.parse treats __proto__ as a regular own property since 2020; we still
  // verify the converter doesn't propagate the polluted property as a tag.
  const rec = JSON.parse('{"__proto__":{"polluted":true},"courseId":"P","prismDomains":["cam"],"mfgRelevance":0.5,"confidence":0.5,"candidateAssets":[{"kind":"tip","name":"x","rationale":"r"}]}');
  const tips = convertAll([rec], FROZEN_DATE);
  assert.equal(tips.length, 1);
  assert.ok(!tips[0].tags.includes("polluted"));
  // And no global pollution sticks (defense-in-depth).
  assert.equal(({}).polluted, undefined);
});

test("hostile-payload: oversized tag (>MAX_TAG_LEN) is silently dropped", () => {
  const longTech = "x".repeat(120);
  const tags = buildTags(
    { courseId: "X", techniques: [longTech, "short-tech"] },
    { kind: "tip", name: "x" },
  );
  assert.ok(!tags.includes(longTech));
  assert.ok(tags.includes("short-tech"));
});

test("hostile-payload: very long rationale survives into body (unbounded — documented)", () => {
  const longRationale = "x".repeat(10000);
  const tip = assetToTip(
    { courseId: "X", prismDomains: ["cam"], mfgRelevance: 0.5, confidence: 0.5 },
    { kind: "tip", name: "n", rationale: longRationale },
    FROZEN_DATE,
  );
  assert.ok(tip.body.length >= 10000, "body is intentionally unbounded — upstream miner caps it");
});

test("hostile-payload: multi-byte unicode tags counted by UTF-16 code units", () => {
  // 🔧 is 2 UTF-16 code units; `MAX_TAG_LEN=80` counts code units (s.length).
  const fortyEmoji = "🔧".repeat(40); // 80 code units exactly
  const fortyOneEmoji = "🔧".repeat(41); // 82 code units → dropped
  const tags = buildTags(
    { courseId: "X", techniques: [fortyEmoji, fortyOneEmoji] },
    { kind: "tip", name: "x" },
  );
  assert.ok(tags.includes(fortyEmoji), "exactly-80-code-unit tag survives");
  assert.ok(!tags.includes(fortyOneEmoji), "82-code-unit tag dropped");
});

// -------- Integration: live corpus + CLI byte-determinism -----------------

test("integration: live corpus produces 126 tips with valid categories + confidence floor", { skip: LIVE_SKIP_REASON }, () => {
  const recs = loadCandidates(LIVE_JSONL);
  const tips = convertAll(recs, FROZEN_DATE);
  assert.equal(recs.length, 65, "live corpus profile: 65 records");
  assert.equal(tips.length, 126, "live corpus profile: 126 assets");
  for (const t of tips) {
    assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(t.category), `tip "${t.title}" has invalid category: ${t.category}`);
    assert.ok(t.confidence >= 1, `tip "${t.title}" has confidence ${t.confidence} — must be ≥1 (engine || promotes 0→70)`);
    assert.ok(t.confidence <= 100);
    assert.ok(t.source.startsWith("mit-ocw:"));
    assert.ok(t.body.length > 0);
    assert.ok(t.title.startsWith("MIT OCW "));
  }
});

// CLI integration tests SCRUB PRISM_*_FROZEN_TIME from the spawned env. Otherwise
// a test runner with either var set would let CLI tests pass for the wrong reason
// (the converter reads them as defaults — see course-to-tribal-tips.mjs).
const CLEAN_ENV = (() => {
  const e = { ...process.env };
  delete e.PRISM_AUDIT_FROZEN_TIME;
  delete e.PRISM_FROZEN_TIME;
  return e;
})();

test("integration: CLI --frozen-time produces byte-identical output across two runs", { skip: LIVE_SKIP_REASON }, () => {
  const tmp1 = tmpPath("ck-cli1", "json");
  const tmp2 = tmpPath("ck-cli2", "json");
  try {
    execFileSync(process.execPath, [SCRIPT_PATH, "--frozen-time", FROZEN, "--output", tmp1], { cwd: REPO_ROOT, env: CLEAN_ENV });
    execFileSync(process.execPath, [SCRIPT_PATH, "--frozen-time", FROZEN, "--output", tmp2], { cwd: REPO_ROOT, env: CLEAN_ENV });
    const a = fs.readFileSync(tmp1);
    const b = fs.readFileSync(tmp2);
    assert.equal(Buffer.compare(a, b), 0, "two runs at same --frozen-time should be byte-identical");
    // P1-C — atomic-write contract: after a successful run, no .tmp sidecar lingers.
    // Converter writes <out>.tmp then renames atomically; on success only <out> exists.
    assert.equal(fs.existsSync(tmp1 + ".tmp"), false, "successful run must not leave .tmp sidecar for tmp1");
    assert.equal(fs.existsSync(tmp2 + ".tmp"), false, "successful run must not leave .tmp sidecar for tmp2");
  } finally {
    for (const p of [tmp1, tmp2, tmp1 + ".tmp", tmp2 + ".tmp"]) {
      if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch {}
    }
  }
});

test("integration: CLI rejects invalid --limit values with a useful stderr message", () => {
  // execFileSync throws on non-zero exit. Capture exit codes via try/catch.
  const cases = ["0", "-5", "abc", "1.5"];
  for (const v of cases) {
    let threw = false;
    try {
      execFileSync(process.execPath, [SCRIPT_PATH, "--limit", v], { cwd: REPO_ROOT, stdio: "pipe", env: CLEAN_ENV });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 2, `--limit ${v} should exit 2, got ${err.status}`);
      const stderr = err.stderr ? err.stderr.toString() : "";
      assert.match(stderr, /invalid --limit|expected positive integer/, `--limit ${v} stderr lacks user-facing reason: ${stderr}`);
    }
    assert.ok(threw, `--limit ${v} should have failed`);
  }
});

test("integration: CLI rejects --limit / --input with missing value", () => {
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

// -------- Engine-contract: emitted shape matches loadDocumentLearnedTips()

test("engine-contract: emitted fields have correct TYPES and SHAPES, not just presence", () => {
  // Arm B P0-1 fix: `assert.notEqual(x, undefined)` would pass on null, 0, "",
  // false, NaN, {}, [] — none valid for the engine reader. Pin each field's
  // type + format invariants explicitly.
  const rec = {
    courseId: "X", courseTitle: "T", prismDomains: ["cam"],
    techniques: ["t1"], mfgRelevance: 0.5, confidence: 0.5,
    candidateAssets: [{ kind: "algorithm", name: "a", rationale: "r" }],
  };
  const tips = convertAll([rec], FROZEN_DATE);
  const env = buildEnvelope(tips, { now: FROZEN_DATE, relativeSource: "x", sourceRecords: 1 });
  assert.ok(Array.isArray(env.tips), "envelope must have tips[] (engine reads raw.tips)");
  const tip = env.tips[0];

  // title — non-empty string
  assert.equal(typeof tip.title, "string");
  assert.ok(tip.title.length > 0);
  // body — non-empty string
  assert.equal(typeof tip.body, "string");
  assert.ok(tip.body.length > 0);
  // category — string AND member of the valid category set
  assert.equal(typeof tip.category, "string");
  assert.ok(VALID_KNOWLEDGE_CATEGORIES.includes(tip.category), `category=${tip.category} not in VALID_KNOWLEDGE_CATEGORIES`);
  // tags — array of strings
  assert.ok(Array.isArray(tip.tags));
  assert.ok(tip.tags.every(t => typeof t === "string" && t.length > 0));
  // confidence — integer in [1,100], not 0 (engine || 70 falsy-promotes 0)
  assert.equal(typeof tip.confidence, "number");
  assert.ok(Number.isInteger(tip.confidence));
  assert.ok(tip.confidence >= 1 && tip.confidence <= 100);
  // source — string starting with mit-ocw:
  assert.equal(typeof tip.source, "string");
  assert.match(tip.source, /^mit-ocw:/);
  // created_at — YYYY-MM-DD
  assert.equal(typeof tip.created_at, "string");
  assert.match(tip.created_at, /^\d{4}-\d{2}-\d{2}$/);
});

test("engine-contract: emulated loadDocumentLearnedTips() reader preserves confidence floor", () => {
  // Arm B P1-3 partial-fix: emulate the engine reader's per-item construction
  // (TribalKnowledgeEngine.ts:697-710) on a tip with the minimum legal
  // confidence (1). Asserts the reader's `confidence: item.confidence || 70`
  // path does NOT falsy-promote 1 to 70.
  const tip = assetToTip(
    { courseId: "X", prismDomains: ["cam"], mfgRelevance: 0, confidence: 0 }, // floors to 1
    { kind: "tip", name: "x", rationale: "r" },
    FROZEN_DATE,
  );
  assert.equal(tip.confidence, 1, "preconditions: emitted confidence must be 1");
  // Mirror the engine's per-item logic (TribalKnowledgeEngine.ts:697-710):
  const engineLoaded = {
    id: `TK-DL-mit-ocw-course-tips-${"1".padStart(3, "0")}`,
    title: tip.title || tip.name || `Document tip 1`,
    body: tip.body || tip.content || tip.text || "",
    category: tip.category || "general",
    tags: [...(tip.tags || []), "document-learned", "doc:mit-ocw-course-tips"],
    confidence: tip.confidence || 70,
    source: `document:mit-ocw-course-tips`,
    created_at: tip.created_at || new Date().toISOString().slice(0, 10),
    usage_count: 0,
  };
  assert.equal(engineLoaded.confidence, 1, "engine || 70 must NOT promote confidence=1");
  // Engine OVERRIDES source — verify our tip's per-record source is lost
  // (documented in script header; this test pins the loss is intentional).
  assert.equal(engineLoaded.source, "document:mit-ocw-course-tips");
  assert.notEqual(engineLoaded.source, tip.source);
});

test("engine-contract: buildEnvelope caveat retains advisory + human-gated markers", () => {
  const env = buildEnvelope([], { now: FROZEN_DATE, relativeSource: "x", sourceRecords: 0 });
  assert.match(env.caveat, /advisory/i);
  // Caveat surfaces the human-in-the-loop requirement via "human-vetted" + "human-gated".
  // The structural `mustHumanVerify:true` flag is asserted separately in the envelope test.
  assert.match(env.caveat, /human-(gated|vetted)/i);
  assert.strictEqual(env.mustHumanVerify, true);
});
