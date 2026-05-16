import { test } from "node:test";
import assert from "node:assert/strict";
import { enumerateOpenUnits } from "./rgs-unit-enum.mjs";

// ── Fixtures using phases[].units[] structure (384 envelopes in real data) ──
const envs = {
  "MS-A": {
    id: "MS-A",
    phases: [
      {
        units: [
          { id: "P0-U01", title: "Alpha", description: "a", effort: 30, dependencies: [] },
          { id: "P0-U02", title: "Beta",  description: "b", effort: 60, dependencies: ["P0-U01"] },
        ],
      },
    ],
  },
};
const prog = {
  milestones: [
    {
      id: "MS-A",
      units: [
        { id: "P0-U01", shipped: true },
        { id: "P0-U02", shipped: false },
      ],
    },
  ],
};

test("only non-shipped returned, composite key synthesized", () => {
  const o = enumerateOpenUnits({ envelopes: envs, progress: prog });
  assert.equal(o.length, 1);
  assert.equal(o[0].key, "MS-A::P0-U02");
  assert.equal(o[0].title, "Beta");
  assert.equal(o[0].milestone, "MS-A");
});

test("unit absent from progress = open (no shipped row means not shipped)", () => {
  const p = { milestones: [{ id: "MS-A", units: [{ id: "P0-U01", shipped: true }] }] };
  assert.deepEqual(
    enumerateOpenUnits({ envelopes: envs, progress: p }).map((u) => u.key).sort(),
    ["MS-A::P0-U02"]
  );
});

test("phase-relative ids do not collide across milestones", () => {
  const e2 = {
    ...envs,
    "MS-B": {
      id: "MS-B",
      phases: [{ units: [{ id: "P0-U01", title: "X", description: "x", effort: 1, dependencies: [] }] }],
    },
  };
  const p2 = {
    milestones: [
      { id: "MS-A", units: [{ id: "P0-U01", shipped: false }, { id: "P0-U02", shipped: false }] },
      { id: "MS-B", units: [{ id: "P0-U01", shipped: false }] },
    ],
  };
  assert.deepEqual(
    enumerateOpenUnits({ envelopes: e2, progress: p2 }).map((u) => u.key).sort(),
    ["MS-A::P0-U01", "MS-A::P0-U02", "MS-B::P0-U01"]
  );
});

// ── 4th test: real top-level units[] structure (254 envelopes in real data) ──
// Real example shape: envelope has units[] at top level (no phases),
// progress has units[] with shipped:bool keyed by same id.
test("top-level units[] envelope (real shape found in 254/694 envelopes)", () => {
  const topLevelEnvs = {
    "5AXIS-AI": {
      id: "5AXIS-AI",
      title: "5-Axis AI",
      units: [
        { id: "5AXIS-AI-U1", title: "Domains", description: "16 domains", effort: 90, dependencies: [] },
        { id: "5AXIS-AI-U2", title: "Tests",   description: "test suite",  effort: 30, dependencies: ["5AXIS-AI-U1"] },
      ],
    },
  };
  const topLevelProg = {
    milestones: [
      {
        id: "5AXIS-AI",
        units: [
          { id: "5AXIS-AI-U1", shipped: true  },
          { id: "5AXIS-AI-U2", shipped: false },
        ],
      },
    ],
  };
  const o = enumerateOpenUnits({ envelopes: topLevelEnvs, progress: topLevelProg });
  assert.equal(o.length, 1);
  assert.equal(o[0].key, "5AXIS-AI::5AXIS-AI-U2");
  assert.equal(o[0].milestone, "5AXIS-AI");
  assert.equal(o[0].unitId, "5AXIS-AI-U2");
});

// ── 5th test: envelope with BOTH phases AND top-level units (7 envelopes) — phases win ──
test("when envelope has both phases and top-level units, phases take precedence", () => {
  const bothEnvs = {
    "BOTH-MS": {
      id: "BOTH-MS",
      phases: [
        { units: [{ id: "P0-U01", title: "Phase unit", description: "from phases", effort: 10, dependencies: [] }] },
      ],
      units: [
        { id: "TOP-U01", title: "Top unit", description: "from top-level", effort: 20, dependencies: [] },
      ],
    },
  };
  const bothProg = {
    milestones: [
      {
        id: "BOTH-MS",
        units: [
          { id: "P0-U01",  shipped: false },
          { id: "TOP-U01", shipped: false },
        ],
      },
    ],
  };
  // phases take precedence → only P0-U01 (from phases) is collected, not TOP-U01
  const o = enumerateOpenUnits({ envelopes: bothEnvs, progress: bothProg });
  assert.equal(o.length, 1);
  assert.equal(o[0].key, "BOTH-MS::P0-U01");
});

// ── 6th test: envelope absent from progress entirely → all units open ──
test("milestone absent from progress entirely means all units are open", () => {
  const o = enumerateOpenUnits({ envelopes: envs, progress: { milestones: [] } });
  assert.deepEqual(
    o.map((u) => u.key).sort(),
    ["MS-A::P0-U01", "MS-A::P0-U02"]
  );
});

// ── 7th test: returned object shape is complete ──
test("returned items carry all required fields", () => {
  const o = enumerateOpenUnits({ envelopes: envs, progress: prog });
  assert.equal(o.length, 1);
  const item = o[0];
  assert.ok("key"          in item, "key missing");
  assert.ok("milestone"    in item, "milestone missing");
  assert.ok("unitId"       in item, "unitId missing");
  assert.ok("title"        in item, "title missing");
  assert.ok("description"  in item, "description missing");
  assert.ok("effort"       in item, "effort missing");
  assert.ok("dependencies" in item, "dependencies missing");
  assert.equal(item.key, `${item.milestone}::${item.unitId}`);
});

// ── 8th test: shipped:true row skips the unit ──
test("shipped:true rows are excluded", () => {
  const allShipped = {
    milestones: [
      { id: "MS-A", units: [{ id: "P0-U01", shipped: true }, { id: "P0-U02", shipped: true }] },
    ],
  };
  const o = enumerateOpenUnits({ envelopes: envs, progress: allShipped });
  assert.equal(o.length, 0);
});
