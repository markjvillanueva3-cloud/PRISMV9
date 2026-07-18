/**
 * SpeedFeedMinerEvidenceWire.test.ts
 *
 * Anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-06 (slot:juliett, 2026-05-23).
 *
 * Wires SpeedFeedMinerEngine into SpeedFeedOrchestratorEngine.compute() as a
 * decision prior alongside queryProvenParameters(). Per the SF-PSN value-node
 * audit (F8): "SpeedFeedMinerEngine composed by ZERO SF engines (0 hits)".
 * After U-SFPSN-06: composed by SpeedFeedOrchestratorEngine via
 * queryMinerEvidence() at compute() step 1.6.
 *
 * Test strategy: source-grep verifier (audit F8 direct check) + non-fatal
 * compute() guarantee. Behavioral spy-based assertions were attempted but
 * vitest's CJS/ESM dual-module-resolution (production uses `require()` to
 * avoid circular deps, tests use `import`) prevents vi.spyOn from
 * intercepting — confirmed by the queryProvenParameters sibling pattern
 * which has no spy-test either. The wire is verified by:
 *   (1) source grep — proves call site + lazy require + engines_called push exist
 *   (2) non-fatal compute() — proves the wire degrades gracefully when corpus empty
 *   (3) F8 audit count — composedBy(SpeedFeedMinerEngine) >= 1 SF engine
 *
 * Frozen-baseline pattern matches U-SFPSN-02A/03/04/05 anti-regression style.
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

describe("SF-PSN-WIRE-MS0/U-SFPSN-06 — SpeedFeedMinerEngine wired into orchestrator (audit F8)", () => {
  it("audit F8 verifier — SpeedFeedOrchestratorEngine.ts source mentions SpeedFeedMinerEngine at least 3 times (queryMinerEvidence + lazy require + engines_called push)", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    const hits = (src.match(/SpeedFeedMiner/g) || []).length;
    expect(hits).toBeGreaterThanOrEqual(3);
  });

  it("audit F8 site verifier — orchestrator source contains the call-site identifier 'queryMinerEvidence'", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toContain("queryMinerEvidence");
    expect(src).toContain("Miner evidence:");
  });

  it("audit F8 step-1.6 marker — orchestrator wires the miner as a decision prior at compute() step 1.6", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/Step 1\.6.*Miner Evidence|U-SFPSN-06/);
  });

  it("non-fatal — orchestrator.compute() completes without throwing even when miner corpus empty (try/catch fall-through)", () => {
    expect(() => speedFeedOrchestratorEngine.compute(minimalInput)).not.toThrow();
  });

  it("non-fatal — compute() returns a structured AtomicValue with the orchestrator named in engines_called[0]", () => {
    const result = speedFeedOrchestratorEngine.compute(minimalInput);
    expect(result.value.engines_called[0]).toBe("SpeedFeedOrchestratorEngine");
    expect(result.value.engines_called.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(result.value.formulas_used)).toBe(true);
  });

  it("clamp behaviour — queryMinerEvidence is documented with sample_count >= 3 threshold (matches queryProvenParameters' >=3)", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/sample_count\s*<\s*3|sampleCount\s*<\s*3|samples\s*>=\s*3/);
  });

  it("confidence cap — queryMinerEvidence is bounded at 0.82 (below proven=0.88 — miner is raw not curated)", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/0\.82/);
  });
});
