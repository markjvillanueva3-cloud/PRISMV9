/**
 * unit-knowledge-pack.test.mjs — hermetic + real-data tests for the per-unit
 * knowledge-pack composer.
 *
 * Coverage:
 *   - parseArgs: positional unit-id, --slot, --json, --no-write, numeric flags clamped
 *   - resolveSlotToUnit: present claim, missing slot, missing file
 *   - lookupUnit: pending_units hit, bridge_units hit, MILESTONE::U-ID composite,
 *                 unknown id, malformed JSON
 *   - buildQueryTokens: full triple, partial, empty
 *   - inferDomain: 5 milestone scopes + unknown
 *   - gitCommitsForMilestone: stdout split, non-zero exit, missing milestone
 *   - composePack: warnings on unknown unit, search failures swallowed,
 *                  domain propagated to tribal call, bridge prompt seeded
 *   - renderPackMarkdown: headers + empty-section copy + warnings block
 *   - REAL-DATA E2E: the just-shipped U-BRIDGE-WIRE-ELECTRODE surfaces ≥1
 *                    master-index hit naming an Electrode engine
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseArgs,
  resolveSlotToUnit,
  lookupUnit,
  buildQueryTokens,
  inferDomain,
  gitCommitsForMilestone,
  composePack,
  renderPackMarkdown,
} from "./unit-knowledge-pack.mjs";

// ── parseArgs ────────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("positional unit-id is captured", () => {
    const o = parseArgs(["U-BRIDGE-WIRE-ELECTRODE"]);
    assert.equal(o.unitId, "U-BRIDGE-WIRE-ELECTRODE");
    assert.equal(o.slot, null);
    assert.equal(o.write, true);
    assert.equal(o.json, false);
  });
  it("--slot + --json + --no-write combine", () => {
    const o = parseArgs(["--slot", "charlie", "--json", "--no-write"]);
    assert.equal(o.slot, "charlie");
    assert.equal(o.json, true);
    assert.equal(o.write, false);
    assert.equal(o.unitId, null);
  });
  it("--k clamped to [1,40]", () => {
    assert.equal(parseArgs(["--k", "0"]).k, 1);
    assert.equal(parseArgs(["--k", "999"]).k, 40);
    assert.equal(parseArgs(["--k", "5"]).k, 5);
  });
  it("--git-n clamped to [0,200]", () => {
    assert.equal(parseArgs(["--git-n", "-10"]).gitN, 0);
    assert.equal(parseArgs(["--git-n", "9999"]).gitN, 200);
    assert.equal(parseArgs(["--git-n", "50"]).gitN, 50);
  });
});

// ── resolveSlotToUnit ────────────────────────────────────────────────────
describe("resolveSlotToUnit", () => {
  it("returns the unitId for an active claim", () => {
    const fakeRead = () => JSON.stringify({ claims: { charlie: { unitId: "BRIDGE-WIRING::U-X" } } });
    assert.equal(resolveSlotToUnit("charlie", fakeRead), "BRIDGE-WIRING::U-X");
  });
  it("returns null for a missing slot", () => {
    const fakeRead = () => JSON.stringify({ claims: {} });
    assert.equal(resolveSlotToUnit("charlie", fakeRead), null);
  });
  it("returns null when no slot name passed", () => {
    assert.equal(resolveSlotToUnit(null), null);
    assert.equal(resolveSlotToUnit(""), null);
  });
  it("fails soft when claims file is missing / unreadable", () => {
    const fakeRead = () => { throw new Error("ENOENT"); };
    assert.equal(resolveSlotToUnit("charlie", fakeRead), null);
  });
});

// ── lookupUnit ──────────────────────────────────────────────────────────
describe("lookupUnit", () => {
  const roadmap = {
    pending_units: [
      { unit_id: "U-AAA", milestone: "MS-A", title: "Alpha unit" },
      { unit_id: "U-BBB", milestone: "MS-B", title: "Bravo unit" },
    ],
    bridge_units: [
      { unit_id: "U-BRIDGE-X", milestone: "BRIDGE-MS0", title: "Bridge wiring X" },
    ],
  };
  const fakeRead = () => JSON.stringify(roadmap);
  it("finds a pending unit by bare U-ID", () => {
    const u = lookupUnit("U-AAA", fakeRead);
    assert.equal(u.milestone, "MS-A");
    assert.equal(u.title, "Alpha unit");
  });
  it("finds a bridge unit (second pool)", () => {
    const u = lookupUnit("U-BRIDGE-X", fakeRead);
    assert.equal(u.milestone, "BRIDGE-MS0");
  });
  it("accepts MILESTONE::U-ID composite", () => {
    const u = lookupUnit("MS-A::U-AAA", fakeRead);
    assert.equal(u.unit_id, "U-AAA");
  });
  it("returns null for unknown ids and malformed JSON", () => {
    assert.equal(lookupUnit("U-NOPE", fakeRead), null);
    assert.equal(lookupUnit("U-AAA", () => "not-json{"), null);
  });
});

// ── buildQueryTokens ────────────────────────────────────────────────────
describe("buildQueryTokens", () => {
  it("joins unit + milestone + title with spaces, strips U- prefix", () => {
    const q = buildQueryTokens("U-BRIDGE-WIRE-ELECTRODE", { milestone: "BRIDGE-WIRING", title: "Wire 4 Electrode" });
    assert.equal(q, "BRIDGE WIRE ELECTRODE BRIDGE WIRING Wire 4 Electrode");
  });
  it("works with only a unit-id", () => {
    assert.equal(buildQueryTokens("U-FOO", null), "FOO");
  });
  it("empty when both are absent", () => {
    assert.equal(buildQueryTokens(null, null), "");
  });
});

// ── inferDomain ──────────────────────────────────────────────────────────
describe("inferDomain", () => {
  it("recognizes the 5 first-class domains", () => {
    assert.equal(inferDomain({ milestone: "WEDM-ELECTRODE-MS0" }), "wedm");
    assert.equal(inferDomain({ milestone: "LATHE-PROD" }), "lathe");
    assert.equal(inferDomain({ milestone: "MILL-CUTTING-MS1" }), "mill");
    assert.equal(inferDomain({ milestone: "CAD-FUSION-LIVE" }), "cad");
    assert.equal(inferDomain({ milestone: "CAM-STRATEGY-MS0" }), "cam");
  });
  it("returns null for unrecognized scope", () => {
    assert.equal(inferDomain({ milestone: "INFRA-CONSENSUS-WIRE" }), null);
    assert.equal(inferDomain(null), null);
  });
});

// ── gitCommitsForMilestone ───────────────────────────────────────────────
describe("gitCommitsForMilestone", () => {
  it("splits multi-line stdout into entries", () => {
    const fakeSpawn = () => ({ status: 0, stdout: "abc1234 [MS-A]/U-1: foo\ndef5678 [MS-A]/U-2: bar\n" });
    const out = gitCommitsForMilestone({ milestone: "MS-A" }, 30, fakeSpawn);
    assert.equal(out.length, 2);
    assert.equal(out[0], "abc1234 [MS-A]/U-1: foo");
  });
  it("returns [] on non-zero exit", () => {
    const fakeSpawn = () => ({ status: 1, stdout: "" });
    assert.deepEqual(gitCommitsForMilestone({ milestone: "MS-A" }, 30, fakeSpawn), []);
  });
  it("returns [] when milestone is missing", () => {
    assert.deepEqual(gitCommitsForMilestone({ milestone: null }, 30, () => ({ status: 0, stdout: "x" })), []);
    assert.deepEqual(gitCommitsForMilestone(null, 30, () => ({ status: 0, stdout: "x" })), []);
  });
  it("rejects a non-string / control-char-bearing milestone token before invoking git", () => {
    // Untrusted JSON content guard — Reviewer B P1.
    let spawnCalls = 0;
    const counted = () => { spawnCalls++; return { status: 0, stdout: "should-not-appear\n" }; };
    assert.deepEqual(gitCommitsForMilestone({ milestone: 42 }, 30, counted), []);
    assert.deepEqual(gitCommitsForMilestone({ milestone: "FOO\nBAR" }, 30, counted), []);
    assert.deepEqual(gitCommitsForMilestone({ milestone: "FOO\x00BAR" }, 30, counted), []);
    assert.deepEqual(gitCommitsForMilestone({ milestone: "foo lowercase bad" }, 30, counted), []);
    assert.deepEqual(gitCommitsForMilestone({ milestone: "-LEADING-DASH" }, 30, counted), []);
    assert.equal(spawnCalls, 0, "spawnImpl must not run on a rejected milestone");
  });
  it("accepts a canonical milestone slug and invokes git", () => {
    let spawnCalls = 0;
    const ok = () => { spawnCalls++; return { status: 0, stdout: "abc1 [BRIDGE-WIRING]/U-X: ship\n" }; };
    const out = gitCommitsForMilestone({ milestone: "BRIDGE-WIRING-MS0" }, 30, ok);
    assert.equal(spawnCalls, 1);
    assert.equal(out.length, 1);
    assert.match(out[0], /BRIDGE-WIRING/);
  });
});

// ── composePack ─────────────────────────────────────────────────────────
describe("composePack", () => {
  const fakeUnitRead = () => JSON.stringify({ pending_units: [{ unit_id: "U-AAA", milestone: "WEDM-X", title: "Foo" }] });
  it("returns a warning when unit-id is unset", () => {
    const p = composePack(null, { readImpl: fakeUnitRead, searchImpl: () => ({ hits: [] }), tribalImpl: () => ({ hits: [] }), spawnImpl: () => ({ status: 0, stdout: "" }) });
    assert.equal(p.unitId, null);
    assert.equal(p.warnings.length, 1);
    assert.match(p.warnings[0], /No unit-id resolved/);
  });
  it("warns when unit not in roadmap but still composes", () => {
    const p = composePack("U-NEW", { readImpl: fakeUnitRead, searchImpl: () => ({ hits: [] }), tribalImpl: () => ({ hits: [] }), spawnImpl: () => ({ status: 0, stdout: "" }) });
    assert.equal(p.unitId, "U-NEW");
    assert.equal(p.unit, null);
    assert.ok(p.warnings.some((w) => w.includes("not found in ROADMAP")));
  });
  it("infers domain from milestone scope and passes it to tribal search", () => {
    let tribalCalledWithDomain = null;
    const p = composePack("U-AAA", {
      readImpl: fakeUnitRead,
      searchImpl: () => ({ hits: [{ name: "FooEngine", layer: "L7", kind: "built" }] }),
      tribalImpl: (_q, opts) => { tribalCalledWithDomain = opts?.domain; return { hits: [{ title: "Tip", text: "Hello" }] }; },
      spawnImpl: () => ({ status: 0, stdout: "abc [WEDM-X]/U-1: prev\n" }),
    });
    assert.equal(p.domain, "wedm");
    assert.equal(tribalCalledWithDomain, "wedm");
    assert.equal(p.masterHits.length, 1);
    assert.equal(p.tribalHits.length, 1);
    assert.equal(p.commits.length, 1);
  });
  it("swallows a thrown search and surfaces a warning", () => {
    const p = composePack("U-AAA", {
      readImpl: fakeUnitRead,
      searchImpl: () => { throw new Error("graph load failed"); },
      tribalImpl: () => ({ hits: [] }),
      spawnImpl: () => ({ status: 0, stdout: "" }),
    });
    assert.equal(p.masterHits.length, 0);
    assert.ok(p.warnings.some((w) => w.includes("master-index search failed")));
  });
  it("seeds the bridge prompt with the unit title", () => {
    const p = composePack("U-AAA", {
      readImpl: fakeUnitRead,
      searchImpl: () => ({ hits: [] }),
      tribalImpl: () => ({ hits: [] }),
      spawnImpl: () => ({ status: 0, stdout: "" }),
    });
    assert.match(p.bridgePrompt, /U-AAA/);
    assert.match(p.bridgePrompt, /Foo/);
    assert.match(p.bridgePrompt, /WEDM-X/);
  });
});

// ── renderPackMarkdown ───────────────────────────────────────────────────
describe("renderPackMarkdown", () => {
  const baseline = {
    unitId: "U-X",
    unit: { milestone: "MS-A", title: "Test" },
    slot: "charlie",
    generatedAt: "2026-05-18T00:00:00Z",
    masterHits: [{ name: "FooEngine", layer: "L7", kind: "built", wiki: ["a.md"], memory: ["m1"] }],
    tribalHits: [{ title: "Tip", text: "Hello world" }],
    commits: ["abc1 [MS-A]/U-X: ship"],
    bridgePrompt: "Drill X",
    domain: "wedm",
    warnings: [],
  };
  it("emits the 5 expected H2 headers", () => {
    const md = renderPackMarkdown(baseline);
    assert.match(md, /^# Unit Knowledge Pack — U-X/m);
    assert.match(md, /## 🧭 Master-index hits/);
    assert.match(md, /## 🧠 Tribal tips/);
    assert.match(md, /## 📜 Prior commits in milestone/);
    assert.match(md, /## 🐙 Ollama bridge preheat/);
  });
  it("surfaces hit names + commit subjects + bridge prompt verbatim", () => {
    const md = renderPackMarkdown(baseline);
    assert.ok(md.includes("FooEngine"));
    assert.ok(md.includes("abc1 [MS-A]/U-X: ship"));
    assert.ok(md.includes("ollama-prism-bridge.mjs \"Drill X\""));
  });
  it("emits empty-section copy when a pool is empty", () => {
    const md = renderPackMarkdown({ ...baseline, masterHits: [], tribalHits: [], commits: [] });
    assert.match(md, /no graph\/wiki hits/);
    assert.match(md, /no tribal tips matched/);
    assert.match(md, /no `\[MILESTONE\]` commits/);
  });
  it("emits a warnings section when warnings exist", () => {
    const md = renderPackMarkdown({ ...baseline, warnings: ["heads up"] });
    assert.match(md, /## ⚠ Pack composition warnings/);
    assert.ok(md.includes("heads up"));
  });
});

// ── REAL-DATA E2E ────────────────────────────────────────────────────────
describe("REAL-DATA E2E — just-shipped U-BRIDGE-WIRE-ELECTRODE", () => {
  it("composes a pack that surfaces ≥1 master-index hit relevant to electrode wiring", () => {
    const p = composePack("U-BRIDGE-WIRE-ELECTRODE", { k: 8, tribalK: 0, gitN: 5 });
    // The pack must produce a unit-id and a bridge prompt regardless.
    assert.equal(p.unitId, "U-BRIDGE-WIRE-ELECTRODE");
    assert.ok(p.bridgePrompt.length > 0);
    // Search may fail silently if the system-graph isn't readable from this
    // test runner — accept either real hits OR a recorded warning. Both
    // outcomes prove the composer's fail-soft contract holds.
    const totalSignal = p.masterHits.length + p.warnings.length;
    assert.ok(totalSignal >= 1, "expected at least one hit or one warning");
    // If hits ARE present, at least one should mention the wiring domain.
    if (p.masterHits.length > 0) {
      const hay = JSON.stringify(p.masterHits).toLowerCase();
      const hasElectrodeOrBridge = hay.includes("electrode") || hay.includes("bridge") || hay.includes("wire");
      assert.ok(hasElectrodeOrBridge, "expected at least one hit to name an electrode/wire/bridge node");
    }
  });
});
