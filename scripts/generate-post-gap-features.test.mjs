#!/usr/bin/env node
/**
 * generate-post-gap-features.test.mjs — tests for the viz-augmentation
 * generator (pure layer + the tempfile-driven I/O layer).
 *
 * Spec: FEATURE-GAP-AUDIT-MS0 / U-JMDIE-POST-GAPS-VIZ-ROOST.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  SCHEMA_VERSION,
  POST_GAP_ROOST_ID,
  PLANNED_PARENT,
  ROOST_LAYER,
  CORPUS_GAP_LAYER,
  POST_GAP_LAYER,
  SEVERITY_SEVERE_MAX,
  SEVERITY_MODERATE_MAX,
  POST_LAG_MAX,
  COLOR_SEVERE,
  COLOR_MODERATE,
  COLOR_MILD,
  COLOR_POST_HEALTHY,
  COLOR_POST_LAG,
  COLOR_POST_DEEP_LAG,
  SOURCE_CANDIDATES,
  severityColor,
  postSeverityColor,
  safeId,
  readCorpusProfiles,
  resolveCorpusDir,
  generate,
} from "./generate-post-gap-features.mjs";

import { buildProfile, buildGapReport } from "./lib/jmdie-post-gap-detect.mjs";

// =============================================================================
// Constant + identity invariants
// =============================================================================
describe("constants", () => {
  it("SCHEMA_VERSION is '1.0.0'", () => assert.equal(SCHEMA_VERSION, "1.0.0"));

  it("POST_GAP_ROOST_ID is the canonical id", () => {
    assert.equal(POST_GAP_ROOST_ID, "ghost.post_gap_surface");
  });

  it("parent is the planned-features roost", () => {
    assert.equal(PLANNED_PARENT, "ghost.planned_features");
  });

  it("layers match the established augmentation convention", () => {
    assert.equal(ROOST_LAYER, "L8");
    assert.equal(CORPUS_GAP_LAYER, "L9");
    assert.equal(POST_GAP_LAYER, "L9");
  });

  it("severity thresholds are ordered", () => {
    assert.ok(SEVERITY_SEVERE_MAX < SEVERITY_MODERATE_MAX);
    assert.equal(POST_LAG_MAX, 2);
  });

  it("colors are distinct hex strings", () => {
    const all = [COLOR_SEVERE, COLOR_MODERATE, COLOR_MILD, COLOR_POST_HEALTHY, COLOR_POST_LAG, COLOR_POST_DEEP_LAG];
    for (const c of all) assert.match(c, /^#[0-9a-f]{6}$/i);
    // 4 unique values (LAG === MODERATE === amber-500; DEEP_LAG === SEVERE === red-600).
    assert.equal(new Set(all).size, 4);
  });

  it("SOURCE_CANDIDATES is a non-empty list of strings", () => {
    assert.ok(Array.isArray(SOURCE_CANDIDATES));
    assert.ok(SOURCE_CANDIDATES.length >= 1);
    for (const c of SOURCE_CANDIDATES) assert.equal(typeof c, "string");
  });
});

// =============================================================================
// severityColor / postSeverityColor
// =============================================================================
describe("severityColor", () => {
  it("coverage 0 → SEVERE", () => assert.equal(severityColor(0), COLOR_SEVERE));
  it("coverage at boundary (SEVERE_MAX) → SEVERE", () => {
    assert.equal(severityColor(SEVERITY_SEVERE_MAX), COLOR_SEVERE);
  });
  it("just over SEVERE_MAX → MODERATE", () => {
    assert.equal(severityColor(SEVERITY_SEVERE_MAX + 0.01), COLOR_MODERATE);
  });
  it("just under MODERATE_MAX → MODERATE", () => {
    assert.equal(severityColor(SEVERITY_MODERATE_MAX - 0.01), COLOR_MODERATE);
  });
  it("at MODERATE_MAX → MILD", () => {
    assert.equal(severityColor(SEVERITY_MODERATE_MAX), COLOR_MILD);
  });
  it("non-finite coverage → SEVERE (treated as 0)", () => {
    assert.equal(severityColor(NaN), COLOR_SEVERE);
    assert.equal(severityColor(null), COLOR_SEVERE);
  });
});

describe("postSeverityColor", () => {
  it("0 lag → HEALTHY", () => assert.equal(postSeverityColor(0), COLOR_POST_HEALTHY));
  it("1 lag → LAG", () => assert.equal(postSeverityColor(1), COLOR_POST_LAG));
  it("POST_LAG_MAX → LAG", () => assert.equal(postSeverityColor(POST_LAG_MAX), COLOR_POST_LAG));
  it("over POST_LAG_MAX → DEEP_LAG", () => {
    assert.equal(postSeverityColor(POST_LAG_MAX + 1), COLOR_POST_DEEP_LAG);
  });
  it("non-integer → HEALTHY (treated as 0)", () => {
    assert.equal(postSeverityColor(undefined), COLOR_POST_HEALTHY);
    assert.equal(postSeverityColor("3"), COLOR_POST_HEALTHY);
  });
});

// =============================================================================
// safeId
// =============================================================================
describe("safeId", () => {
  it("preserves alphanumerics + dashes + underscores", () => {
    assert.equal(safeId("Haas_VF-2"), "haas_vf-2");
  });
  it("collapses special chars to a single dash", () => {
    assert.equal(safeId("PRISM Hurco@VM30i!"), "prism-hurco-vm30i");
  });
  it("returns 'x' for empty input", () => assert.equal(safeId(""), "x"));
  it("returns 'x' for null/undefined", () => {
    assert.equal(safeId(null), "x");
    assert.equal(safeId(undefined), "x");
  });
  it("truncates to 80 chars", () => {
    const long = "a".repeat(200);
    assert.equal(safeId(long).length, 80);
  });
  it("rejects path traversal '..' fragments", () => {
    assert.equal(safeId("../escape"), "x");
  });
});

// =============================================================================
// readCorpusProfiles (I/O via tempfile fixtures)
// =============================================================================
describe("readCorpusProfiles", () => {
  function withTempCorpus(files, fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "post-gap-test-"));
    try {
      for (const [name, content] of files) fs.writeFileSync(path.join(dir, name), content, "utf8");
      return fn(dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  it("reads every .cps file + skips non-.cps", () => {
    withTempCorpus(
      [
        ["Haas-A.cps", "iMachining"],
        ["readme.txt", "iMachining"],
        ["HURCO-B.cps", "rigid tap"],
      ],
      (dir) => {
        const profiles = readCorpusProfiles(dir);
        assert.equal(profiles.length, 2);
        const haas = profiles.find((p) => p.file === "Haas-A.cps");
        assert.equal(haas.family, "haas");
        assert.equal(haas.markers.imachining_variable_feed, true);
        const hurco = profiles.find((p) => p.file === "HURCO-B.cps");
        assert.equal(hurco.family, "hurco");
      },
    );
  });

  it("returns [] for missing directory (fail-soft)", () => {
    const fake = path.join(os.tmpdir(), "post-gap-fake-" + Date.now());
    const profiles = readCorpusProfiles(fake);
    assert.deepEqual(profiles, []);
  });

  it("results are stable (sorted by filename)", () => {
    withTempCorpus(
      [["z.cps", ""], ["a.cps", ""], ["m.cps", ""]],
      (dir) => {
        const profiles = readCorpusProfiles(dir);
        assert.deepEqual(profiles.map((p) => p.file), ["a.cps", "m.cps", "z.cps"]);
      },
    );
  });
});

// =============================================================================
// resolveCorpusDir
// =============================================================================
describe("resolveCorpusDir", () => {
  it("returns a string or null (never throws)", () => {
    const r = resolveCorpusDir();
    if (r !== null) assert.equal(typeof r, "string");
  });
});

// =============================================================================
// generate (pure graph emission)
// =============================================================================
describe("generate", () => {
  function makeReport() {
    return buildGapReport([
      buildProfile({ file: "haas-1.cps", content: "iMachining sidecar" }),
      buildProfile({ file: "hurco-1.cps", content: "iMachining" }),
      buildProfile({ file: "hurco-2.cps", content: "" }),
      buildProfile({ file: "okuma-1.cps", content: "" }),
    ]);
  }

  it("emits the roost when the id is not already present", () => {
    const r = generate(makeReport(), []);
    const roost = r.newNodes.find((n) => n.id === POST_GAP_ROOST_ID);
    assert.ok(roost);
    assert.equal(roost.kind, "ghost-roost");
    assert.equal(roost.layer, ROOST_LAYER);
    assert.equal(roost.parent, PLANNED_PARENT);
    assert.equal(r.stats.roostEmitted, 1);
  });

  it("does NOT re-emit the roost when its id is in existingNodeIds", () => {
    const r = generate(makeReport(), [POST_GAP_ROOST_ID]);
    const roost = r.newNodes.find((n) => n.id === POST_GAP_ROOST_ID);
    assert.equal(roost, undefined);
    assert.equal(r.stats.roostEmitted, 0);
  });

  it("emits one corpus-gap child per corpus-wide gap", () => {
    const r = generate(makeReport(), []);
    const corpusKids = r.newNodes.filter((n) => n.kind === "post-gap-corpus");
    assert.ok(corpusKids.length > 0);
    for (const k of corpusKids) {
      assert.equal(k.parent, POST_GAP_ROOST_ID);
      assert.equal(k.layer, CORPUS_GAP_LAYER);
      assert.ok(typeof k.coverage === "number");
      assert.ok(k.coverage >= 0 && k.coverage <= 1);
    }
  });

  it("emits one post-gap-unit per profile", () => {
    const r = generate(makeReport(), []);
    const postKids = r.newNodes.filter((n) => n.kind === "post-gap-unit");
    assert.equal(postKids.length, 4);
    for (const k of postKids) {
      assert.equal(k.parent, POST_GAP_ROOST_ID);
      assert.equal(k.layer, POST_GAP_LAYER);
      assert.ok(typeof k.valueScore === "number");
      assert.ok(k.valueScore >= 0 && k.valueScore <= 1);
    }
  });

  it("colors corpus-gap children by severity threshold", () => {
    const r = generate(makeReport(), []);
    for (const k of r.newNodes.filter((n) => n.kind === "post-gap-corpus")) {
      assert.equal(k.color, severityColor(k.coverage));
    }
  });

  it("never emits duplicate node ids within the run", () => {
    const r = generate(makeReport(), []);
    const ids = r.newNodes.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("returns stats with all required fields", () => {
    const r = generate(makeReport(), []);
    for (const key of ["roostEmitted", "profileCount", "corpusEmitted", "postEmitted", "severeCount", "moderateCount", "mildCount"]) {
      assert.ok(key in r.stats, `stats.${key} missing`);
      assert.equal(typeof r.stats[key], "number");
    }
  });

  it("empty report yields roost + no children", () => {
    const r = generate({ profileCount: 0, postGaps: [], corpusWideGaps: [], familyCounts: {} }, []);
    assert.equal(r.stats.roostEmitted, 1);
    assert.equal(r.stats.corpusEmitted, 0);
    assert.equal(r.stats.postEmitted, 0);
    assert.equal(r.newNodes.length, 1);
  });

  it("null/undefined report degrades gracefully (no throw)", () => {
    const r1 = generate(null, []);
    const r2 = generate(undefined, []);
    assert.equal(r1.stats.profileCount, 0);
    assert.equal(r2.stats.profileCount, 0);
  });

  it("output is deterministic across invocations", () => {
    const a = generate(makeReport(), []);
    const b = generate(makeReport(), []);
    assert.deepEqual(a.newNodes, b.newNodes);
    assert.deepEqual(a.stats, b.stats);
  });
});
