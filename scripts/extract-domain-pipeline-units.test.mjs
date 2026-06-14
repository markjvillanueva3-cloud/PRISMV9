/**
 * Tests for extract-domain-pipeline-units.mjs
 * Run: node --test H:/prism/scripts/extract-domain-pipeline-units.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  loadConfig,
  extractCells,
  cellToUnit,
  buildStageLabelMap,
  buildMilestone,
  normalizeStatus,
  loadExistingMilestone,
} from "./extract-domain-pipeline-units.mjs";

// --- fixtures ---

const minimalCfg = {
  canonical_stages: [
    { id: "GEOMETRY_PARSE", label: "Geometry parse" },
    { id: "FIXTURE_DESIGN", label: "Fixture / workholding" },
    { id: "POST_PROCESS", label: "Post-process to NC" },
  ],
  domains: {
    mill: {
      slot: "alpha",
      stages: {
        GEOMETRY_PARSE: { engine: "STEPGeometryParserEngine", status: "built" },
        FIXTURE_DESIGN: { engine: "FixtureSelectionEngine", status: "missing", adaptive: "default vise" },
        POST_PROCESS: { engine: "MasterPostFineTuningEngine", status: "partial", note: "engine built, unwired" },
      },
    },
    wire: {
      slot: "charlie",
      stages: {
        FIXTURE_DESIGN: { engine: "ThreeRFixture", status: "missing" },
      },
    },
  },
};

// --- loadConfig ---

test("loadConfig — parses valid JSON", () => {
  const fakeRead = (_p) => JSON.stringify(minimalCfg);
  const got = loadConfig("/fake/path.json", fakeRead);
  assert.equal(got.domains.mill.slot, "alpha");
});

test("loadConfig — throws on missing .domains", () => {
  const fakeRead = () => JSON.stringify({ canonical_stages: [] });
  assert.throws(() => loadConfig("/fake/path.json", fakeRead), /missing .domains/);
});

test("loadConfig — throws SyntaxError on invalid JSON", () => {
  const fakeRead = () => "not json {";
  assert.throws(() => loadConfig("/fake/path.json", fakeRead), SyntaxError);
});

// --- normalizeStatus ---

test("normalizeStatus — lowercases + trims", () => {
  assert.equal(normalizeStatus("BUILT"), "built");
  assert.equal(normalizeStatus("Built"), "built");
  assert.equal(normalizeStatus("  built  "), "built");
  assert.equal(normalizeStatus("PARTIAL"), "partial");
});

test("normalizeStatus — null/empty → 'missing'", () => {
  assert.equal(normalizeStatus(null), "missing");
  assert.equal(normalizeStatus(undefined), "missing");
  assert.equal(normalizeStatus(""), "missing");
  assert.equal(normalizeStatus("   "), "missing");
});

test("extractCells — case-insensitive 'BUILT' is correctly skipped", () => {
  const cfg = {
    domains: {
      x: {
        slot: "alpha",
        stages: {
          A: { engine: "E", status: "BUILT" },
          B: { engine: "E", status: " Built " },
          C: { engine: "E", status: "missing" },
        },
      },
    },
  };
  const cells = extractCells(cfg);
  // A and B are built (case/space variants) → skipped; only C emitted
  assert.equal(cells.length, 1);
  assert.equal(cells[0].stageId, "C");
});

test("extractCells — unknown status pushes a warning but is emitted as not-built", () => {
  const warnings = [];
  const cfg = { domains: { x: { slot: "a", stages: { S: { engine: "E", status: "wip" } } } } };
  const cells = extractCells(cfg, { warnings });
  assert.equal(cells.length, 1);
  assert.ok(warnings.some((w) => /unknown status='wip'/.test(w)));
});

test("extractCells — malformed domain key pushes a warning", () => {
  const warnings = [];
  const cfg = { domains: { "Bad-Key": { slot: "a", stages: { S: { status: "missing" } } } } };
  extractCells(cfg, { warnings });
  assert.ok(warnings.some((w) => /violates/.test(w)));
});

// --- extractCells ---

test("extractCells — skips status=built cells", () => {
  const cells = extractCells(minimalCfg);
  // mill: 1 built (skip) + 1 missing + 1 partial = 2 emitted
  // wire: 1 missing = 1 emitted
  // total = 3
  assert.equal(cells.length, 3);
  const builtCount = cells.filter((c) => c.status === "built").length;
  assert.equal(builtCount, 0, "no built cell should be emitted");
});

test("extractCells — preserves domain → slot routing", () => {
  const cells = extractCells(minimalCfg);
  const mill = cells.filter((c) => c.domain === "mill");
  const wire = cells.filter((c) => c.domain === "wire");
  assert.ok(mill.every((c) => c.slot === "alpha"));
  assert.ok(wire.every((c) => c.slot === "charlie"));
});

test("extractCells — preserves adaptive + note fields", () => {
  const cells = extractCells(minimalCfg);
  const fixture = cells.find((c) => c.domain === "mill" && c.stageId === "FIXTURE_DESIGN");
  assert.equal(fixture.adaptive, "default vise");
  const post = cells.find((c) => c.domain === "mill" && c.stageId === "POST_PROCESS");
  assert.equal(post.note, "engine built, unwired");
});

test("extractCells — stable ordering (config insertion order)", () => {
  const cells = extractCells(minimalCfg);
  const ids = cells.map((c) => `${c.domain}:${c.stageId}`);
  // mill enumerated first, in stage insertion order, then wire
  assert.deepEqual(ids, [
    "mill:FIXTURE_DESIGN",
    "mill:POST_PROCESS",
    "wire:FIXTURE_DESIGN",
  ]);
});

test("extractCells — empty config returns []", () => {
  assert.deepEqual(extractCells({}), []);
  assert.deepEqual(extractCells({ domains: {} }), []);
});

test("extractCells — defaults missing status to 'missing' (treated as not-built)", () => {
  const cfg = {
    domains: {
      x: { slot: "alpha", stages: { S1: { engine: "E1" } } }, // no status field
    },
  };
  const cells = extractCells(cfg);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].status, "missing");
});

test("extractCells — null/non-object stage skipped silently", () => {
  const cfg = {
    domains: {
      x: { slot: "alpha", stages: { S1: null, S2: "junk", S3: { status: "missing" } } },
    },
  };
  const cells = extractCells(cfg);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].stageId, "S3");
});

// --- buildStageLabelMap ---

test("buildStageLabelMap — produces id → label map", () => {
  const m = buildStageLabelMap(minimalCfg);
  assert.equal(m.GEOMETRY_PARSE, "Geometry parse");
  assert.equal(m.FIXTURE_DESIGN, "Fixture / workholding");
});

test("buildStageLabelMap — empty when canonical_stages missing", () => {
  assert.deepEqual(buildStageLabelMap({}), {});
});

test("buildStageLabelMap — warns when domains present but no canonical_stages", () => {
  const warnings = [];
  buildStageLabelMap({ domains: { x: {} } }, { warnings });
  assert.ok(warnings.some((w) => /no canonical_stages/.test(w)));
});

// --- loadExistingMilestone ---

test("loadExistingMilestone — missing file → empty map", () => {
  const m = loadExistingMilestone("/no/such.json", () => "", () => false);
  assert.equal(m.size, 0);
});

test("loadExistingMilestone — parses units keyed by unit_id (fallback id)", () => {
  const prior = JSON.stringify({
    units: [
      { unit_id: "U-A", status: "completed" },
      { id: "U-B", status: "not_started" },
    ],
  });
  const m = loadExistingMilestone("/x.json", () => prior, () => true);
  assert.equal(m.size, 2);
  assert.equal(m.get("U-A").status, "completed");
  assert.equal(m.get("U-B").status, "not_started");
});

test("loadExistingMilestone — unparseable file → empty map (no throw)", () => {
  const m = loadExistingMilestone("/x.json", () => "garbage {{", () => true);
  assert.equal(m.size, 0);
});

// --- cellToUnit ---

test("cellToUnit — id format U-DPM0-<DOMAIN>-<STAGE>", () => {
  const cell = { domain: "mill", slot: "alpha", stageId: "FIXTURE_DESIGN", engine: "E", status: "missing" };
  const u = cellToUnit(cell, { FIXTURE_DESIGN: "Fixture" });
  assert.equal(u.id, "U-DPM0-MILL-FIXTURE_DESIGN");
  assert.equal(u.slot, "alpha");
  assert.equal(u.stage, "FIXTURE_DESIGN");
  assert.equal(u.status, "not_started");
});

test("cellToUnit — partial vs missing → different title prefix", () => {
  const cellPartial = { domain: "lathe", slot: "bravo", stageId: "OPERATION_SEQUENCE", engine: "E", status: "partial" };
  const cellMissing = { domain: "lathe", slot: "bravo", stageId: "SIMULATE", engine: "E", status: "missing" };
  const labels = { OPERATION_SEQUENCE: "Op seq", SIMULATE: "Sim" };
  const uP = cellToUnit(cellPartial, labels);
  const uM = cellToUnit(cellMissing, labels);
  assert.match(uP.title, /promote partial/);
  assert.match(uM.title, /build missing/);
});

test("cellToUnit — falls back to stageId when label missing", () => {
  const cell = { domain: "x", slot: "y", stageId: "UNMAPPED_STAGE", engine: "E", status: "missing" };
  const u = cellToUnit(cell, {});
  assert.equal(u.stage_label, "UNMAPPED_STAGE");
});

test("cellToUnit — emits the slot-queue.mjs reader contract keys", () => {
  const cell = { domain: "mill", slot: "alpha", stageId: "FIXTURE_DESIGN", engine: "E", status: "missing" };
  const u = cellToUnit(cell, { FIXTURE_DESIGN: "Fixture" });
  // slot-queue.mjs indexes: unit_id, wave, cost, spec, depends_on, summary
  assert.equal(u.unit_id, "U-DPM0-MILL-FIXTURE_DESIGN");
  assert.equal(u.unit_id, u.id);
  assert.equal(u.wave, "DOMAIN-PIPELINE-MS0");
  assert.equal(u.cost, "M"); // missing → M
  assert.equal(u.spec, "pending-generator");
  assert.deepEqual(u.depends_on, []);
  assert.ok(typeof u.summary === "string" && u.summary.length > 0);
});

test("cellToUnit — partial → cost S, missing → cost M", () => {
  const partial = cellToUnit({ domain: "l", slot: "b", stageId: "S", engine: "E", status: "partial" }, {});
  const missing = cellToUnit({ domain: "l", slot: "b", stageId: "T", engine: "E", status: "missing" }, {});
  assert.equal(partial.cost, "S");
  assert.equal(missing.cost, "M");
});

test("cellToUnit — preserves shipped status from existingUnit (idempotency)", () => {
  const cell = { domain: "mill", slot: "alpha", stageId: "SIMULATE", engine: "E", status: "missing" };
  const existing = {
    unit_id: "U-DPM0-MILL-SIMULATE",
    status: "completed",
    completed_at: "2026-05-18T01:00:00Z",
    completed_by: "claude-xyz",
    ship_notes: "shipped via U-X",
  };
  const u = cellToUnit(cell, {}, existing);
  assert.equal(u.status, "completed");
  assert.equal(u.completed_at, "2026-05-18T01:00:00Z");
  assert.equal(u.completed_by, "claude-xyz");
  assert.equal(u.ship_notes, "shipped via U-X");
});

test("cellToUnit — existingUnit with not_started status does NOT override", () => {
  const cell = { domain: "mill", slot: "alpha", stageId: "SIMULATE", engine: "E", status: "missing" };
  const existing = { unit_id: "U-DPM0-MILL-SIMULATE", status: "not_started" };
  const u = cellToUnit(cell, {}, existing);
  assert.equal(u.status, "not_started");
  assert.equal(u.completed_at, undefined);
});

// --- buildMilestone (integration) ---

test("buildMilestone — full assembly + routing.by_slot accounting", () => {
  const m = buildMilestone(minimalCfg, { now: "2026-05-17T23:50:00Z" });
  assert.equal(m.id, "DOMAIN-PIPELINE-MS0");
  // 3 cells + 1 always-present seed (U-DPM0-CELL-EXTRACT, slot=unassigned)
  assert.equal(m.cell_units, 3);
  assert.equal(m.seed_units, 1);
  assert.equal(m.total_units, 4);
  assert.equal(m.units.length, 4);
  assert.equal(m.routing.by_slot.alpha, 2);
  assert.equal(m.routing.by_slot.charlie, 1);
  assert.equal(m.routing.by_slot.unassigned, 1); // the seed
  assert.equal(m.advisory_only, true);
  assert.equal(m.must_human_verify, true);
});

test("buildMilestone — byStatus split distinguishes partial vs missing", () => {
  const m = buildMilestone(minimalCfg);
  assert.equal(m.routing.by_status.missing, 2);
  assert.equal(m.routing.by_status.partial, 1);
  assert.equal(m.routing.by_status.built ?? 0, 0);
});

test("buildMilestone — deterministic with stable ordering", () => {
  const a = buildMilestone(minimalCfg, { now: "2026-05-17T00:00:00Z" });
  const b = buildMilestone(minimalCfg, { now: "2026-05-17T00:00:00Z" });
  assert.deepEqual(a, b);
});

test("buildMilestone — handles unassigned slot (no .slot field on domain)", () => {
  const cfg = {
    canonical_stages: [{ id: "S1", label: "Stage 1" }],
    domains: { unrouted: { stages: { S1: { engine: "E", status: "missing" } } } },
  };
  const m = buildMilestone(cfg);
  // seed (slot absent) + the unrouted cell (slot:null) both land in unassigned
  assert.equal(m.routing.by_slot.unassigned, 2);
  const cell = m.units.find((u) => u.source === "domain-pipeline-config");
  assert.equal(cell.slot, null);
});

test("buildMilestone — round-trip preserves shipped status (close-out safety)", () => {
  // 1. fresh build — target a CELL unit (not the always-completed seed)
  const m1 = buildMilestone(minimalCfg);
  const target = m1.units.find((u) => u.source === "domain-pipeline-config");
  assert.equal(target.status, "not_started");

  // 2. simulate that cell shipping (envelope status flip per feedback_roadmap_close_out)
  const shippedUnits = m1.units.map((u) =>
    u.unit_id === target.unit_id
      ? { ...u, status: "completed", completed_at: "2026-05-18T02:00:00Z", completed_by: "claude-test", ship_notes: "done" }
      : u,
  );
  const existing = new Map(shippedUnits.map((u) => [u.unit_id, u]));

  // 3. re-run extractor with the prior state — must NOT revert shipped → not_started
  const m2 = buildMilestone(minimalCfg, { existing });
  const re = m2.units.find((u) => u.unit_id === target.unit_id);
  assert.equal(re.status, "completed", "re-run must preserve shipped status");
  assert.equal(re.completed_at, "2026-05-18T02:00:00Z");
  assert.equal(re.ship_notes, "done");
  // shipped = the flipped cell + the always-completed seed
  assert.equal(m2.shipped_units, 2);
  // unrelated CELL units stay not_started (exclude the seed which is completed)
  const other = m2.units.find(
    (u) => u.unit_id !== target.unit_id && u.source === "domain-pipeline-config",
  );
  assert.equal(other.status, "not_started");
});

test("buildMilestone — SEED_UNITS emitted deterministically with EMPTY existing (--no-merge safe)", () => {
  // The fragile-single-source fix: U-DPM0-CELL-EXTRACT must survive even
  // with zero prior state (operator deleted file / --no-merge).
  const m = buildMilestone(minimalCfg, { existing: new Map() });
  const seed = m.units.find((u) => u.unit_id === "U-DPM0-CELL-EXTRACT");
  assert.ok(seed, "seed meta-unit must be emitted with no prior file");
  assert.equal(seed.status, "completed");
  assert.equal(seed.source, "meta-bootstrap-seed");
  assert.equal(m.seed_units, 1);
  assert.ok(m.shipped_units >= 1);
});

test("buildMilestone — seed forward-merges richer existing copy (never reverts)", () => {
  const richer = {
    unit_id: "U-DPM0-CELL-EXTRACT",
    id: "U-DPM0-CELL-EXTRACT",
    status: "completed",
    completed_at: "2026-06-01T00:00:00Z",
    ship_notes: "operator-updated notes",
  };
  const m = buildMilestone(minimalCfg, { existing: new Map([[richer.unit_id, richer]]) });
  const seed = m.units.find((u) => u.unit_id === "U-DPM0-CELL-EXTRACT");
  assert.equal(seed.completed_at, "2026-06-01T00:00:00Z", "richer existing wins forward");
  assert.equal(seed.ship_notes, "operator-updated notes");
  assert.equal(seed.status, "completed");
});

test("buildMilestone — a not_started existing copy of a seed does NOT revert the seed", () => {
  const stale = { unit_id: "U-DPM0-CELL-EXTRACT", status: "not_started" };
  const m = buildMilestone(minimalCfg, { existing: new Map([[stale.unit_id, stale]]) });
  const seed = m.units.find((u) => u.unit_id === "U-DPM0-CELL-EXTRACT");
  assert.equal(seed.status, "completed", "seed completed floor cannot be reverted");
});

test("buildMilestone — carries forward OTHER shipped non-cell non-seed units", () => {
  const operatorMeta = {
    unit_id: "U-OPERATOR-EXTRA",
    id: "U-OPERATOR-EXTRA",
    status: "completed",
    completed_by: "operator",
  };
  const existing = new Map([[operatorMeta.unit_id, operatorMeta]]);
  const m = buildMilestone(minimalCfg, { existing });
  const carried = m.units.find((u) => u.unit_id === "U-OPERATOR-EXTRA");
  assert.ok(carried, "operator-added shipped non-cell unit must carry forward");
  assert.equal(carried.source, "carried-forward");
  // seed still present too, distinct from carried
  assert.ok(m.units.some((u) => u.unit_id === "U-DPM0-CELL-EXTRACT"));
});

test("buildMilestone — does NOT carry forward a not_started non-cell unit", () => {
  const stale = { unit_id: "U-STALE-NONCELL", status: "not_started" };
  const existing = new Map([[stale.unit_id, stale]]);
  const m = buildMilestone(minimalCfg, { existing });
  assert.equal(m.units.find((u) => u.unit_id === "U-STALE-NONCELL"), undefined);
});

test("buildMilestone — created_by from env, default 'extractor'", () => {
  const a = buildMilestone(minimalCfg, { createdBy: "claude-abc (juliett)" });
  assert.equal(a.created_by, "claude-abc (juliett)");
  const b = buildMilestone(minimalCfg);
  assert.equal(typeof b.created_by, "string");
});

test("buildMilestone — warnings surface on milestone object", () => {
  const cfg = { domains: { Bad: { slot: "a", stages: { S: { status: "wip" } } } } };
  const m = buildMilestone(cfg);
  assert.ok(Array.isArray(m.warnings) && m.warnings.length >= 1);
});

// --- regression oracle for live config ---
// Run against the real config; verifies the doctrine claim of 62 not-fully-built cells.
test("buildMilestone — live config produces 62 units (CLAUDE.md DPM0 doctrine)", () => {
  const cfgPath = path.join(
    process.env.PRISM_ROOT || "H:/prism",
    "state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json",
  );
  if (!fs.existsSync(cfgPath)) {
    // soft-skip in environments without the live config
    return;
  }
  const cfg = loadConfig(cfgPath);
  const m = buildMilestone(cfg);
  assert.equal(
    m.cell_units,
    62,
    `live config produced ${m.cell_units} cell units; CLAUDE.md DPM0 doctrine expects 62 not-fully-built cells. ` +
      `If the source config legitimately changed, update CLAUDE.md.`,
  );
  // sanity: slot routing — juliett owns speedfeed and speedfeed.SPEED_FEED is built,
  // so juliett should NOT appear in by_slot (all speedfeed cells are built).
  assert.equal(m.routing.by_slot.juliett ?? 0, 0, "speedfeed (juliett) has no non-built cells");
});
