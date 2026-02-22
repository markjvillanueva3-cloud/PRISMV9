/**
 * R3-MS4.5-T4: Progressive Response Streaming Tests
 *
 * 12 test cases covering all exported functions:
 *   1.  L0 returns only status + level fields
 *   2.  L1 adds verdict + key_metric
 *   3.  L2 adds reasoning + details
 *   4.  L3 adds full payload
 *   5.  Default max_level is 2
 *   6.  L3 with l3_transform applies transformation
 *   7.  estimateTokens returns a reasonable estimate
 *   8.  responseToProgressive mapping (pointer→1, summary→2, full→3)
 *   9.  progressiveToResponse mapping (0→pointer, 1→pointer, 2→summary, 3→full)
 *   10. buildBatchProgress with completed batch (all pass)
 *   11. buildBatchProgress with in-progress batch that has failures
 *   12. Each level is self-contained (L2 usable without needing L3)
 */

import {
  buildProgressiveResponse,
  estimateTokens,
  responseToProgressive,
  progressiveToResponse,
  buildBatchProgress,
} from "../../src/shared/progressive-response.js";

import type {
  ProgressiveLevel,
  ProgressiveConfig,
  ProgressiveResponse,
  BatchProgressConfig,
} from "../../src/shared/progressive-response.js";

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

interface SampleResult {
  score: number;
  label: string;
  _internal: string;
  extra: Record<string, unknown>;
}

const SAMPLE: SampleResult = {
  score: 0.87,
  label: "PASS",
  _internal: "debug-only",
  extra: { a: 1, b: 2 },
};

function makeConfig(
  max_level: ProgressiveLevel,
  l3_transform?: (r: SampleResult) => unknown
): ProgressiveConfig<SampleResult> {
  return {
    result: SAMPLE,
    max_level,
    status: "ok",
    l1: (r) => ({ verdict: r.label, key_metric: r.score }),
    l2: (r) => ({
      reasoning: `Score of ${r.score} meets threshold`,
      details: { score: r.score, extra: r.extra },
    }),
    l3_transform,
  };
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  run: () => string[]; // returns failure messages; empty = pass
}

const TESTS: TestCase[] = [
  // =========================================================================
  // 1. L0 returns only status + level fields
  // =========================================================================
  {
    name: "L0: only status + level fields present",
    run: () => {
      const errs: string[] = [];
      const r = buildProgressiveResponse(makeConfig(0));

      if (r.level !== 0) errs.push(`level should be 0, got ${r.level}`);
      if (r.status !== "ok") errs.push(`status should be "ok", got ${r.status}`);
      if (r.verdict !== undefined) errs.push("verdict should be absent at L0");
      if (r.key_metric !== undefined) errs.push("key_metric should be absent at L0");
      if (r.reasoning !== undefined) errs.push("reasoning should be absent at L0");
      if (r.details !== undefined) errs.push("details should be absent at L0");
      if (r.full !== undefined) errs.push("full should be absent at L0");

      return errs;
    },
  },

  // =========================================================================
  // 2. L1 adds verdict + key_metric
  // =========================================================================
  {
    name: "L1: adds verdict + key_metric, no L2/L3 fields",
    run: () => {
      const errs: string[] = [];
      const r = buildProgressiveResponse(makeConfig(1));

      if (r.level !== 1) errs.push(`level should be 1, got ${r.level}`);
      if (r.status !== "ok") errs.push("status missing");
      if (r.verdict !== "PASS") errs.push(`verdict should be "PASS", got ${r.verdict}`);
      if (r.key_metric !== 0.87) errs.push(`key_metric should be 0.87, got ${r.key_metric}`);
      if (r.reasoning !== undefined) errs.push("reasoning should be absent at L1");
      if (r.details !== undefined) errs.push("details should be absent at L1");
      if (r.full !== undefined) errs.push("full should be absent at L1");

      return errs;
    },
  },

  // =========================================================================
  // 3. L2 adds reasoning + details (includes all L0+L1 fields)
  // =========================================================================
  {
    name: "L2: adds reasoning + details, inherits L0+L1 fields",
    run: () => {
      const errs: string[] = [];
      const r = buildProgressiveResponse(makeConfig(2));

      if (r.level !== 2) errs.push(`level should be 2, got ${r.level}`);
      if (r.status !== "ok") errs.push("status missing");
      if (r.verdict !== "PASS") errs.push("verdict missing at L2");
      if (r.key_metric !== 0.87) errs.push("key_metric missing at L2");
      if (!r.reasoning) errs.push("reasoning missing at L2");
      if (!r.details) errs.push("details missing at L2");
      if (r.full !== undefined) errs.push("full should be absent at L2");

      return errs;
    },
  },

  // =========================================================================
  // 4. L3 adds full payload (includes all L0+L1+L2 fields)
  // =========================================================================
  {
    name: "L3: adds full payload, inherits all lower-level fields",
    run: () => {
      const errs: string[] = [];
      const r = buildProgressiveResponse(makeConfig(3));

      if (r.level !== 3) errs.push(`level should be 3, got ${r.level}`);
      if (r.status !== "ok") errs.push("status missing at L3");
      if (r.verdict !== "PASS") errs.push("verdict missing at L3");
      if (r.key_metric !== 0.87) errs.push("key_metric missing at L3");
      if (!r.reasoning) errs.push("reasoning missing at L3");
      if (!r.details) errs.push("details missing at L3");
      if (r.full === undefined) errs.push("full should be present at L3");

      const full = r.full as SampleResult;
      if (full.score !== 0.87) errs.push("full.score incorrect");
      if (full._internal !== "debug-only") errs.push("full should contain _internal by default");

      return errs;
    },
  },

  // =========================================================================
  // 5. Default max_level is 2
  // =========================================================================
  {
    name: "Default max_level is 2 when omitted",
    run: () => {
      const errs: string[] = [];
      const r = buildProgressiveResponse<SampleResult>({
        result: SAMPLE,
        status: "ok",
        l1: (res) => ({ verdict: res.label, key_metric: res.score }),
        l2: (res) => ({
          reasoning: `Score: ${res.score}`,
          details: { score: res.score },
        }),
        // max_level intentionally omitted
      });

      if (r.level !== 2) errs.push(`Default level should be 2, got ${r.level}`);
      if (!r.reasoning) errs.push("reasoning should be present at default level");
      if (r.full !== undefined) errs.push("full should be absent at default level");

      return errs;
    },
  },

  // =========================================================================
  // 6. L3 with l3_transform strips fields before full output
  // =========================================================================
  {
    name: "L3 with l3_transform: strips internal fields from full payload",
    run: () => {
      const errs: string[] = [];
      const r = buildProgressiveResponse(
        makeConfig(3, (res) => ({
          score: res.score,
          label: res.label,
          extra: res.extra,
          // _internal deliberately excluded
        }))
      );

      if (r.full === undefined) errs.push("full should be present");
      const full = r.full as Partial<SampleResult>;
      if ((full as any)._internal !== undefined) {
        errs.push("l3_transform should have stripped _internal");
      }
      if (full.score !== 0.87) errs.push("full.score should be preserved");
      if (full.label !== "PASS") errs.push("full.label should be preserved");

      return errs;
    },
  },

  // =========================================================================
  // 7. estimateTokens returns reasonable estimate
  // =========================================================================
  {
    name: "estimateTokens: returns positive estimate that grows with level",
    run: () => {
      const errs: string[] = [];

      const r0 = buildProgressiveResponse(makeConfig(0));
      const r2 = buildProgressiveResponse(makeConfig(2));
      const r3 = buildProgressiveResponse(makeConfig(3));

      const t0 = estimateTokens(r0);
      const t2 = estimateTokens(r2);
      const t3 = estimateTokens(r3);

      if (t0.level !== 0) errs.push(`t0.level should be 0, got ${t0.level}`);
      if (t2.level !== 2) errs.push(`t2.level should be 2, got ${t2.level}`);
      if (t3.level !== 3) errs.push(`t3.level should be 3, got ${t3.level}`);

      if (t0.estimated_tokens <= 0) errs.push("L0 token estimate should be > 0");
      if (t2.estimated_tokens <= t0.estimated_tokens) {
        errs.push("L2 should have more estimated tokens than L0");
      }
      if (t3.estimated_tokens <= t2.estimated_tokens) {
        errs.push("L3 should have more estimated tokens than L2");
      }

      // Sanity: L0 JSON is small (< 50 tokens)
      if (t0.estimated_tokens > 50) {
        errs.push(`L0 token estimate seems too large: ${t0.estimated_tokens}`);
      }

      return errs;
    },
  },

  // =========================================================================
  // 8. responseToProgressive mapping
  // =========================================================================
  {
    name: "responseToProgressive: pointer→1, summary→2, full→3",
    run: () => {
      const errs: string[] = [];

      const p = responseToProgressive("pointer");
      const s = responseToProgressive("summary");
      const f = responseToProgressive("full");

      if (p !== 1) errs.push(`pointer should map to 1, got ${p}`);
      if (s !== 2) errs.push(`summary should map to 2, got ${s}`);
      if (f !== 3) errs.push(`full should map to 3, got ${f}`);

      return errs;
    },
  },

  // =========================================================================
  // 9. progressiveToResponse mapping
  // =========================================================================
  {
    name: "progressiveToResponse: 0→pointer, 1→pointer, 2→summary, 3→full",
    run: () => {
      const errs: string[] = [];

      const l0 = progressiveToResponse(0);
      const l1 = progressiveToResponse(1);
      const l2 = progressiveToResponse(2);
      const l3 = progressiveToResponse(3);

      if (l0 !== "pointer") errs.push(`0 should map to "pointer", got ${l0}`);
      if (l1 !== "pointer") errs.push(`1 should map to "pointer", got ${l1}`);
      if (l2 !== "summary") errs.push(`2 should map to "summary", got ${l2}`);
      if (l3 !== "full") errs.push(`3 should map to "full", got ${l3}`);

      return errs;
    },
  },

  // =========================================================================
  // 10. buildBatchProgress — completed batch, no failures
  // =========================================================================
  {
    name: "buildBatchProgress: completed batch sets status=ok and verdict=COMPLETE",
    run: () => {
      const errs: string[] = [];
      const r = buildBatchProgress(
        { total: 50, completed: 50, failed: 0 },
        2
      );

      if (r.status !== "ok") errs.push(`status should be "ok", got ${r.status}`);
      if (r.verdict !== "COMPLETE") errs.push(`verdict should be "COMPLETE", got ${r.verdict}`);
      if (r.key_metric !== "50/50") errs.push(`key_metric should be "50/50", got ${r.key_metric}`);
      if (!r.reasoning) errs.push("reasoning should be present at L2");

      const details = r.details as Record<string, unknown>;
      if (details.completed !== 50) errs.push("details.completed incorrect");
      if (details.failed !== 0) errs.push("details.failed incorrect");
      if (details.total !== 50) errs.push("details.total incorrect");

      return errs;
    },
  },

  // =========================================================================
  // 11. buildBatchProgress — in-progress batch with failures
  // =========================================================================
  {
    name: "buildBatchProgress: in-progress batch with failures sets status=partial",
    run: () => {
      const errs: string[] = [];
      const cfg: BatchProgressConfig = {
        total: 100,
        completed: 60,
        failed: 5,
        current_item: "widget-061",
        estimated_remaining_ms: 4500,
      };
      const r = buildBatchProgress(cfg, 2);

      if (r.status !== "partial") errs.push(`status should be "partial", got ${r.status}`);
      if (r.key_metric !== "60/100") errs.push(`key_metric should be "60/100", got ${r.key_metric}`);

      // Verdict should show percentage, not COMPLETE
      if (r.verdict === "COMPLETE") errs.push("verdict should not be COMPLETE for partial batch");
      if (typeof r.verdict !== "string") errs.push("verdict should be a string");

      const details = r.details as Record<string, unknown>;
      if (details.current !== "widget-061") errs.push("details.current should reflect current_item");
      if (details.eta_ms !== 4500) errs.push("details.eta_ms should reflect estimated_remaining_ms");
      if (!r.reasoning) errs.push("reasoning should be present");
      if (typeof r.reasoning === "string" && !r.reasoning.includes("failed")) {
        errs.push("reasoning should mention failures");
      }

      return errs;
    },
  },

  // =========================================================================
  // 12. Each level is self-contained (L2 usable without L3)
  // =========================================================================
  {
    name: "Self-contained levels: L2 response is independently usable without L3",
    run: () => {
      const errs: string[] = [];

      // A consumer that only cares about L2 fields should not need L3
      const r = buildProgressiveResponse(makeConfig(2));

      // Verify all fields needed for a useful response are present at L2
      const hasStatus = typeof r.status === "string" && r.status.length > 0;
      const hasVerdict = typeof r.verdict === "string" && r.verdict.length > 0;
      const hasKeyMetric = r.key_metric !== undefined;
      const hasReasoning = typeof r.reasoning === "string" && r.reasoning.length > 0;
      const hasDetails = r.details !== null && typeof r.details === "object";

      if (!hasStatus) errs.push("L2 missing status");
      if (!hasVerdict) errs.push("L2 missing verdict");
      if (!hasKeyMetric) errs.push("L2 missing key_metric");
      if (!hasReasoning) errs.push("L2 missing reasoning");
      if (!hasDetails) errs.push("L2 missing details");

      // full should NOT be present — L2 stands alone without it
      if (r.full !== undefined) {
        errs.push("L2 should not contain full payload — it is self-contained at its own tier");
      }

      // Round-trip: serialise L2, deserialise, still usable
      const serialised = JSON.stringify(r);
      const deserialised: ProgressiveResponse = JSON.parse(serialised);
      if (deserialised.reasoning !== r.reasoning) {
        errs.push("L2 round-trip serialization failed");
      }

      return errs;
    },
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const test of TESTS) {
  const errs = test.run();
  if (errs.length === 0) {
    console.log(`  PASS  ${test.name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${test.name}`);
    for (const e of errs) {
      console.log(`         - ${e}`);
    }
    failed++;
    failures.push(test.name);
  }
}

console.log("");
console.log(`Results: ${passed} passed, ${failed} failed out of ${TESTS.length} tests`);

if (failed > 0) {
  console.log(`\nFailed tests:`);
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
  process.exit(1);
}
