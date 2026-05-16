/**
 * rgs-tool-planner.test.mjs
 * node:test suite for the runPlanner() exported core.
 * All I/O is injected — no real graph, no real Ollama, no real files.
 * Uses node:os tmpdir for sidecar/checkpoint paths; cleaned up in after().
 *
 * Run:
 *   "H:/.claude/bin/portable-node" --test scripts/rgs-tool-planner.test.mjs
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runPlanner } from "./rgs-tool-planner.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a fresh temp dir per test (cleaned up in after()). */
const tmpDirs = [];
function makeTmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "rgs-planner-test-"));
  tmpDirs.push(d);
  return d;
}

/** Build minimal fake units. */
function fakeUnits(n = 3) {
  return Array.from({ length: n }, (_, i) => ({
    key: `MS-TEST::U-${i + 1}`,
    milestone: "MS-TEST",
    unitId: `U-${i + 1}`,
    title: `Unit ${i + 1} build something`,
    description: `Description for unit ${i + 1} integrating existing modules`,
    effort: 60, // M tier
    dependencies: [],
  }));
}

/**
 * Build a complete readers object with all stubs returning valid data.
 * fuseSignals minimum-plan contract requires:
 *   - pipelines.length >= 1 (comes from matchPipelines internally via readers)
 *   - tribal.length >= 1 OR skills.length >= 1 OR mcpTools.length >= 1
 *   - valid verdict + tier
 * We satisfy it by returning >=1 skill trigger and >=1 tribal entry.
 */
function makeReaders({ includeOllama = false } = {}) {
  const readers = {
    async capabilities(_text) {
      return { engines: ["FakeEngine"], mcpTools: ["prism_fake:do_thing"] };
    },
    async tribal(_text, _opts) {
      return [{ id: "tip-1", tip: "Use the existing module", score: 0.9, domain: "mill" }];
    },
    async skillTriggers(_text) {
      return ["forge-triple"];
    },
    async buildState(_unit) {
      return { shipped: false };
    },
    async outcomes(_opts) {
      return { shipped: 2, blocked: 0, reverted: 0 };
    },
  };
  if (includeOllama) {
    readers.ollama = async (_prompt) => ({
      success: true,
      response: JSON.stringify({
        toolchain: ["prism_cam:toolpath_generate"],
        confidence: 0.85,
        rationale: "Fake Ollama rationale",
      }),
    });
  }
  return readers;
}

/** complexityFor that returns a stable M/integrate pair for all units. */
function stableComplexity(_unit) {
  return { tier: "M", verdict: "integrate" };
}

// ---------------------------------------------------------------------------
// T1: 3 fake units → runPlanner writes plans with 3 entries, sidecar has schemaVersion
// ---------------------------------------------------------------------------

describe("T1: basic 3-unit run", () => {
  let result;
  let sidecarPath;
  let checkpointPath;

  before(async () => {
    const tmp = makeTmpDir();
    sidecarPath = path.join(tmp, "roadmap-tool-plans.json");
    checkpointPath = path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl");

    result = await runPlanner({
      units: fakeUnits(3),
      complexityFor: stableComplexity,
      readers: makeReaders(),
      sidecarPath,
      checkpointPath,
      force: false,
    });
  });

  it("returns planned=3, skipped=0", () => {
    assert.equal(result.planned, 3, `planned=${result.planned}`);
    assert.equal(result.skipped, 0, `skipped=${result.skipped}`);
  });

  it("sidecar file exists and has schemaVersion 1.0.0", () => {
    assert.ok(fs.existsSync(sidecarPath), "sidecar file missing");
    const data = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(data.schemaVersion, "1.0.0");
  });

  it("sidecar plans has 3 entries", () => {
    const data = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(Object.keys(data.plans).length, 3);
  });

  it("each plan has expected fields", () => {
    const data = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    for (const plan of Object.values(data.plans)) {
      assert.ok(Array.isArray(plan.pipelines), "pipelines missing");
      assert.ok(typeof plan.confidence === "number", "confidence missing");
      assert.ok(typeof plan.source === "string", "source missing");
    }
  });
});

// ---------------------------------------------------------------------------
// T2: re-run with same checkpoint (hashes unchanged) + no force → all 3 skipped
// ---------------------------------------------------------------------------

describe("T2: checkpoint resume — all 3 already hashed → skipped", () => {
  let result1;
  let result2;
  let sidecarPath;
  let checkpointPath;

  before(async () => {
    const tmp = makeTmpDir();
    sidecarPath = path.join(tmp, "roadmap-tool-plans.json");
    checkpointPath = path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl");
    const units = fakeUnits(3);

    // First run — builds checkpoint
    result1 = await runPlanner({
      units,
      complexityFor: stableComplexity,
      readers: makeReaders(),
      sidecarPath,
      checkpointPath,
      force: false,
    });

    // Second run — same units, same hashes
    result2 = await runPlanner({
      units,
      complexityFor: stableComplexity,
      readers: makeReaders(),
      sidecarPath,
      checkpointPath,
      force: false,
    });
  });

  it("first run planned 3", () => {
    assert.equal(result1.planned, 3);
  });

  it("second run planned=0, skipped=3", () => {
    assert.equal(result2.planned, 0, `planned=${result2.planned}`);
    assert.equal(result2.skipped, 3, `skipped=${result2.skipped}`);
  });
});

// ---------------------------------------------------------------------------
// T3: force=true → all 3 re-planned despite existing checkpoint
// ---------------------------------------------------------------------------

describe("T3: force flag re-plans all units", () => {
  let result1;
  let result2;
  let sidecarPath;
  let checkpointPath;

  before(async () => {
    const tmp = makeTmpDir();
    sidecarPath = path.join(tmp, "roadmap-tool-plans.json");
    checkpointPath = path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl");
    const units = fakeUnits(3);

    result1 = await runPlanner({
      units,
      complexityFor: stableComplexity,
      readers: makeReaders(),
      sidecarPath,
      checkpointPath,
      force: false,
    });

    result2 = await runPlanner({
      units,
      complexityFor: stableComplexity,
      readers: makeReaders(),
      sidecarPath,
      checkpointPath,
      force: true,
    });
  });

  it("first run planned 3", () => {
    assert.equal(result1.planned, 3);
  });

  it("force run planned 3 again", () => {
    assert.equal(result2.planned, 3, `force run planned=${result2.planned}`);
  });
});

// ---------------------------------------------------------------------------
// T4: RGS_DETERMINISTIC_PLAN_INVALID → that unit skipped, others still planned
// ---------------------------------------------------------------------------

describe("T4: RGS_DETERMINISTIC_PLAN_INVALID skips-not-aborts", () => {
  let result;
  let sidecarPath;
  let checkpointPath;

  before(async () => {
    const tmp = makeTmpDir();
    sidecarPath = path.join(tmp, "roadmap-tool-plans.json");
    checkpointPath = path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl");

    const units = fakeUnits(3);

    // Readers that throw RGS_DETERMINISTIC_PLAN_INVALID for unit index 1 (U-2)
    let callCount = 0;
    const readersWithBomb = {
      async capabilities(_text) {
        callCount++;
        // Throw on second unit call to capabilities — triggers invalid plan path
        if (callCount === 2) {
          throw new Error("RGS_DETERMINISTIC_PLAN_INVALID: test bomb");
        }
        return { engines: ["FakeEngine"], mcpTools: ["prism_fake:do_thing"] };
      },
      async tribal(_text, _opts) {
        return [{ id: "tip-1", tip: "tip", score: 0.9, domain: "mill" }];
      },
      async skillTriggers(_text) {
        return ["forge-triple"];
      },
      async buildState(_unit) {
        return { shipped: false };
      },
      async outcomes(_opts) {
        return { shipped: 1, blocked: 0, reverted: 0 };
      },
    };

    result = await runPlanner({
      units,
      complexityFor: stableComplexity,
      readers: readersWithBomb,
      sidecarPath,
      checkpointPath,
      force: false,
    });
  });

  it("batch not aborted — returns a result object", () => {
    assert.ok(result, "result must exist");
    assert.equal(typeof result.planned, "number");
    assert.equal(typeof result.skipped, "number");
  });

  it("only 2 units planned (1 bomb-skipped)", () => {
    assert.equal(result.planned + result.skipped, 3);
    assert.equal(result.planned, 2, `planned=${result.planned}`);
  });

  it("sidecar contains exactly 2 entries", () => {
    const data = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(Object.keys(data.plans).length, 2);
  });
});

// ---------------------------------------------------------------------------
// T5: checkpoint resume — pre-seed 1 of 3 keys → only 2 planned
// ---------------------------------------------------------------------------

describe("T5: partial checkpoint resume — 1 pre-seeded → 2 planned", () => {
  let result;
  let sidecarPath;
  let checkpointPath;

  before(async () => {
    const tmp = makeTmpDir();
    sidecarPath = path.join(tmp, "roadmap-tool-plans.json");
    checkpointPath = path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl");

    const units = fakeUnits(3);

    // Build the correct sourceHash for the first unit so the checkpoint is valid
    // sourceHash = sha256(nfc(title).replace(/\s+/g," ").trim() + "" + nfc(desc)... + tier + verdict)
    const { createHash } = await import("node:crypto");
    const u = units[0];
    const complexity = stableComplexity(u);
    const nfc = (s) => String(s).normalize("NFC");
    const raw =
      nfc(u.title).replace(/\s+/g, " ").trim() +
      "\x00" +
      nfc(u.description).replace(/\s+/g, " ").trim() +
      "\x00" +
      complexity.tier +
      "\x00" +
      complexity.verdict;
    const hash = createHash("sha256").update(raw, "utf8").digest("hex");

    // Pre-seed checkpoint JSONL with unit[0]
    const line = JSON.stringify({ key: u.key, hash, completedAt: new Date().toISOString() });
    fs.writeFileSync(checkpointPath, line + "\n", "utf8");

    result = await runPlanner({
      units,
      complexityFor: stableComplexity,
      readers: makeReaders(),
      sidecarPath,
      checkpointPath,
      force: false,
    });
  });

  it("planned=2, skipped=1", () => {
    assert.equal(result.planned, 2, `planned=${result.planned}`);
    assert.equal(result.skipped, 1, `skipped=${result.skipped}`);
  });

  it("sidecar has 2 new entries (not 3)", () => {
    const data = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(Object.keys(data.plans).length, 2);
  });
});

// ---------------------------------------------------------------------------
// T6: degraded flag — when readers.ollama is absent, sidecar degraded:true
//     and every plan source="deterministic"
// ---------------------------------------------------------------------------

describe("T6: degraded mode — no ollama reader → source=deterministic", () => {
  let result;
  let sidecarPath;
  let checkpointPath;

  before(async () => {
    const tmp = makeTmpDir();
    sidecarPath = path.join(tmp, "roadmap-tool-plans.json");
    checkpointPath = path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl");

    // readers WITHOUT ollama — runPlanner sets degraded:true
    result = await runPlanner({
      units: fakeUnits(3),
      complexityFor: stableComplexity,
      readers: makeReaders({ includeOllama: false }),
      sidecarPath,
      checkpointPath,
      force: false,
      degraded: true, // caller signals degraded mode
    });
  });

  it("result.degraded is true", () => {
    assert.equal(result.degraded, true);
  });

  it("sidecar degraded is true", () => {
    const data = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(data.degraded, true);
  });

  it("every plan has source=deterministic", () => {
    const data = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    for (const [key, plan] of Object.entries(data.plans)) {
      assert.equal(plan.source, "deterministic", `plan ${key} source=${plan.source}`);
    }
  });
});

// ---------------------------------------------------------------------------
// T7: generic (non-sentinel) error for one unit → skipped, batch continues
// ---------------------------------------------------------------------------

describe("T7: generic error (no RGS_DETERMINISTIC_PLAN_INVALID sentinel) for 1 unit → skipped, others planned", () => {
  let result;
  let sidecarPath;
  let checkpointPath;

  before(async () => {
    const tmp = makeTmpDir();
    sidecarPath = path.join(tmp, "roadmap-tool-plans.json");
    checkpointPath = path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl");

    const units = fakeUnits(3);

    // Throw a GENERIC error (no sentinel) for exactly the second unit (index 1).
    let callCount = 0;
    const readersWithGenericBomb = {
      async capabilities(_text) {
        callCount++;
        if (callCount === 2) {
          // Generic error — does NOT contain RGS_DETERMINISTIC_PLAN_INVALID
          throw new Error("network boom");
        }
        return { engines: ["FakeEngine"], mcpTools: ["prism_fake:do_thing"] };
      },
      async tribal(_text, _opts) {
        return [{ id: "tip-1", tip: "tip", score: 0.9, domain: "mill" }];
      },
      async skillTriggers(_text) {
        return ["forge-triple"];
      },
      async buildState(_unit) {
        return { shipped: false };
      },
      async outcomes(_opts) {
        return { shipped: 1, blocked: 0, reverted: 0 };
      },
    };

    result = await runPlanner({
      units,
      complexityFor: stableComplexity,
      readers: readersWithGenericBomb,
      sidecarPath,
      checkpointPath,
      force: false,
    });
  });

  it("batch does NOT throw — result object is returned", () => {
    assert.ok(result, "result must exist");
    assert.equal(typeof result.planned, "number");
    assert.equal(typeof result.skipped, "number");
  });

  it("failed unit counted in skipped, not planned", () => {
    assert.equal(result.planned + result.skipped, 3, "total must still be 3");
    assert.equal(result.skipped, 1, `skipped=${result.skipped} — 1 generic-error unit must be skipped`);
  });

  it("the other 2 units ARE planned (planned===2)", () => {
    assert.equal(result.planned, 2, `planned=${result.planned}`);
  });
});

// ---------------------------------------------------------------------------
// T8: --time-budget — injected nowFn trips the budget mid-batch (U-CRON)
// ---------------------------------------------------------------------------

describe("T8: time budget truncates the batch and defers the rest", () => {
  let result;
  let sidecarPath;
  let checkpointPath;

  before(async () => {
    const tmp = makeTmpDir();
    sidecarPath = path.join(tmp, "roadmap-tool-plans.json");
    checkpointPath = path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl");

    // nowFn is called once for startTime, then once per loop iteration (top).
    // Calls 1-3 return 0 (under budget) → units 1 & 2 process; call 4 returns
    // a large value → iteration 3 trips the budget and breaks.
    let nowCalls = 0;
    const nowFn = () => {
      nowCalls++;
      return nowCalls <= 3 ? 0 : 999999;
    };

    result = await runPlanner({
      units: fakeUnits(3),
      complexityFor: stableComplexity,
      readers: makeReaders(),
      sidecarPath,
      checkpointPath,
      force: false,
      timeBudgetMs: 1,
      nowFn,
    });
  });

  it("budgetExhausted is true", () => {
    assert.equal(result.budgetExhausted, true);
  });

  it("planned=2, deferred=1 (third unit cut off)", () => {
    assert.equal(result.planned, 2, `planned=${result.planned}`);
    assert.equal(result.deferred, 1, `deferred=${result.deferred}`);
  });

  it("only the 2 processed units are in the sidecar", () => {
    const data = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.equal(Object.keys(data.plans).length, 2);
  });

  it("the 2 processed units are checkpointed for resume", () => {
    const raw = fs.readFileSync(checkpointPath, "utf8");
    const lines = raw.split("\n").filter((l) => l.trim());
    assert.equal(lines.length, 2, "checkpoint must hold exactly the 2 processed units");
  });
});

// ---------------------------------------------------------------------------
// T9: a budget-truncated run resumes — deferred unit is planned next run
// ---------------------------------------------------------------------------

describe("T9: resume after budget truncation plans the deferred unit", () => {
  let result2;

  before(async () => {
    const tmp = makeTmpDir();
    const sidecarPath = path.join(tmp, "roadmap-tool-plans.json");
    const checkpointPath = path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl");
    const units = fakeUnits(3);

    let nowCalls = 0;
    const nowFn = () => { nowCalls++; return nowCalls <= 3 ? 0 : 999999; };

    // Run 1 — budget trips at unit 3 → 2 planned, 1 deferred.
    await runPlanner({
      units, complexityFor: stableComplexity, readers: makeReaders(),
      sidecarPath, checkpointPath, force: false, timeBudgetMs: 1, nowFn,
    });

    // Run 2 — no budget. The 2 checkpointed units skip; the deferred one plans.
    result2 = await runPlanner({
      units, complexityFor: stableComplexity, readers: makeReaders(),
      sidecarPath, checkpointPath, force: false,
    });
  });

  it("resume run planned=1, skipped=2", () => {
    assert.equal(result2.planned, 1, `planned=${result2.planned}`);
    assert.equal(result2.skipped, 2, `skipped=${result2.skipped}`);
  });

  it("resume run budgetExhausted=false, deferred=0", () => {
    assert.equal(result2.budgetExhausted, false);
    assert.equal(result2.deferred, 0);
  });
});

// ---------------------------------------------------------------------------
// T10: onFlush fires (CLI wires it to planner-lock refresh)
// ---------------------------------------------------------------------------

describe("T10: onFlush callback fires after the sidecar flush", () => {
  let flushCount;

  before(async () => {
    const tmp = makeTmpDir();
    flushCount = 0;
    await runPlanner({
      units: fakeUnits(3),
      complexityFor: stableComplexity,
      readers: makeReaders(),
      sidecarPath: path.join(tmp, "roadmap-tool-plans.json"),
      checkpointPath: path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl"),
      force: false,
      onFlush: () => { flushCount++; },
    });
  });

  it("onFlush was invoked at least once (final flush)", () => {
    assert.ok(flushCount >= 1, `onFlush fired ${flushCount} times, expected >=1`);
  });
});

// ---------------------------------------------------------------------------
// T11: no time budget → budgetExhausted false, deferred 0, all planned
// ---------------------------------------------------------------------------

describe("T11: unlimited (no timeBudgetMs) — all units planned, nothing deferred", () => {
  let result;

  before(async () => {
    const tmp = makeTmpDir();
    result = await runPlanner({
      units: fakeUnits(4),
      complexityFor: stableComplexity,
      readers: makeReaders(),
      sidecarPath: path.join(tmp, "roadmap-tool-plans.json"),
      checkpointPath: path.join(tmp, ".roadmap-tool-plans.checkpoint.jsonl"),
      force: false,
    });
  });

  it("budgetExhausted false, deferred 0, planned 4", () => {
    assert.equal(result.budgetExhausted, false);
    assert.equal(result.deferred, 0);
    assert.equal(result.planned, 4);
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

after(() => {
  for (const d of tmpDirs) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
});
