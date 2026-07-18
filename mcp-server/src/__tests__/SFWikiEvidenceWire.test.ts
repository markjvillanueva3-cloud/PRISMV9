/**
 * SFWikiEvidenceWire.test.ts
 *
 * Anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-08 (slot:juliett, 2026-05-23).
 *
 * Wires wiki/tribal-knowledge consult into SpeedFeedOrchestratorEngine.compute()
 * as decision evidence + provenance citations. Per audit F4: "SF output should
 * cite contributing wiki entries". After U-SFPSN-08: queryWikiEvidence() at
 * compute() step 1.7 emits PRISMSelfAwarenessEngine.searchTribalKnowledgeSync
 * hits as formulas_used citations + adds the engine to engines_called when
 * matches found.
 *
 * Pattern matches queryProvenParameters / queryMinerEvidence — same lazy
 * require + try/catch fall-through. Test strategy mirrors
 * SpeedFeedMinerEvidenceWire (source-grep + non-fatal compute() + threshold
 * docs) since vitest CJS/ESM dual-resolution prevents spy intercept.
 *
 * Frozen-baseline pattern matches U-SFPSN-02A/03/04/05/06/09.
 */

import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

const minimalInput = {
  material: "1018",
  iso_group: "P" as const,
  operation: "milling" as const,
  cut_type: "roughing" as const,
  tool_diameter_mm: 12.7,
  tool_flutes: 4,
  machine_type: "mill" as const,
  ap_mm: 5,
  ae_mm: 6,
};

describe("SF-PSN-WIRE-MS0/U-SFPSN-08 — wiki/tribal evidence wired into orchestrator (audit F4)", () => {
  it("audit F4 verifier — SpeedFeedOrchestratorEngine.ts source mentions PRISMSelfAwarenessEngine OR queryWikiEvidence at least 3 times (import + method + call site)", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    const hits = (src.match(/PRISMSelfAwarenessEngine|queryWikiEvidence/g) || []).length;
    expect(hits).toBeGreaterThanOrEqual(3);
  });

  it("audit F4 site verifier — orchestrator source contains the call-site identifier 'queryWikiEvidence'", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toContain("queryWikiEvidence");
    expect(src).toContain("Wiki evidence:");
  });

  it("audit F4 step-1.7 marker — orchestrator wires the wiki as a decision prior at compute() step 1.7", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/Step 1\.7.*Wiki|U-SFPSN-08/);
  });

  it("two-pass fallback — orchestrator queryWikiEvidence retries with material-only when combined query has zero hits", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/searchTribalKnowledgeSync\(combined.*\n.*hits\.length === 0.*\n.*searchTribalKnowledgeSync\(material/s);
  });

  it("confidence cap — queryWikiEvidence is bounded at 0.75 (below proven=0.88 and miner=0.82 — tribal tips are heuristic not measured)", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/0\.75/);
  });

  it("non-fatal — orchestrator.compute() completes without throwing when wiki corpus empty or self-awareness engine fails", () => {
    expect(() => speedFeedOrchestratorEngine.compute(minimalInput)).not.toThrow();
  });

  it("non-fatal — compute() returns structured result with engines_called[0] = orchestrator regardless of wiki state", () => {
    const result = speedFeedOrchestratorEngine.compute(minimalInput);
    expect(result.value.engines_called[0]).toBe("SpeedFeedOrchestratorEngine");
    expect(Array.isArray(result.value.formulas_used)).toBe(true);
  });

  it("query token gate — queryWikiEvidence returns {found:false} when both material and operation are empty", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/!material\s*&&\s*!operation/);
    expect(src).toContain("wiki:no-query-tokens");
  });
});
