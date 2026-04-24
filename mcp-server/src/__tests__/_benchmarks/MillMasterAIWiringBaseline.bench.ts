/**
 * MILL-MASTER-AI-WIRING / U0-BASELINE — vitest bench reporter
 *
 * Runs one bench() per target engine using the shared INVOCATIONS fixture.
 * The authoritative baseline JSON is produced by the sibling `*.test.ts`
 * file (this reporter is advisory — `vitest bench` only runs bench blocks).
 *
 * @envelope mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json (U0-BASELINE)
 */

import { bench, describe } from "vitest";
import {
  INVOCATIONS,
  SAMPLE_COUNT,
  WARMUP_COUNT,
} from "./MillMasterAIWiringBaselineFixtures.js";

describe("MILL-MASTER-AI-WIRING / U0-BASELINE benches", () => {
  for (const inv of INVOCATIONS) {
    bench(
      `${inv.engine_id}.${inv.method}`,
      () => {
        try {
          inv.invoke();
        } catch {
          // The capture test records errors authoritatively; bench mode
          // just wants to observe perf of the happy path when possible.
        }
      },
      { iterations: SAMPLE_COUNT, warmupIterations: WARMUP_COUNT },
    );
  }
});
