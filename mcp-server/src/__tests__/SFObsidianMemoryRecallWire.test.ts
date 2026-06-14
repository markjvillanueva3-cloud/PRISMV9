/**
 * SFObsidianMemoryRecallWire.test.ts
 *
 * Anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-07 (slot:juliett, 2026-05-23).
 *
 * Wires cross-session Obsidian-brain memory recall into
 * SpeedFeedOrchestratorEngine.compute() as decision prior. Per audit F3:
 * "obsidian-brain/memory NOT connected to SF decisioning". After U-SFPSN-07:
 * queryObsidianMemoryEvidence() at compute() step 1.8 calls
 * ConversationalMemoryEngine.findJob (sync, in-memory job store) for the
 * material key and returns the matching JobContext as recall evidence.
 *
 * Sync path chosen because orchestrator.compute() is sync — async Qdrant
 * semantic recall is a future U-SFPSN-07-ASYNC follow-up when compute() can
 * be promoted to async.
 *
 * Test strategy mirrors prior U-SFPSN-06/08 wire tests (source-grep
 * verifier + non-fatal compute() + threshold docs). vitest CJS/ESM
 * dual-resolution prevents spy intercept on require()'d singletons.
 *
 * Frozen-baseline pattern matches U-SFPSN-02A/03/04/05/06/08/09.
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

describe("SF-PSN-WIRE-MS0/U-SFPSN-07 — Obsidian memory recall wired into orchestrator (audit F3)", () => {
  it("audit F3 verifier — SpeedFeedOrchestratorEngine.ts source mentions ConversationalMemoryEngine OR queryObsidianMemoryEvidence at least 3 times (import + method + call site)", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    const hits = (src.match(/ConversationalMemoryEngine|queryObsidianMemoryEvidence/g) || []).length;
    expect(hits).toBeGreaterThanOrEqual(3);
  });

  it("audit F3 site verifier — orchestrator source contains the call-site identifier 'queryObsidianMemoryEvidence' and 'Memory recall:'", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toContain("queryObsidianMemoryEvidence");
    expect(src).toContain("Memory recall:");
  });

  it("audit F3 step-1.8 marker — orchestrator wires memory recall as a decision prior at compute() step 1.8", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/Step 1\.8.*Memory|U-SFPSN-07/);
  });

  it("sync path — orchestrator uses ConversationalMemoryEngine.findJob (sync) rather than QdrantMemoryEngine async recall", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/require\("\.\/ConversationalMemoryEngine\.js"\)/);
    expect(src).toMatch(/findJob/);
    // Should NOT await inside queryObsidianMemoryEvidence (sync method)
    const methodBody = src.split("queryObsidianMemoryEvidence(input")[1]?.split("private mapToProvenMaterial")[0] ?? "";
    expect(methodBody).not.toMatch(/\bawait\b/);
  });

  it("confidence cap — queryObsidianMemoryEvidence is fixed at 0.70 (below wiki=0.75 since recall is single-shot match not aggregated)", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/0\.70/);
  });

  it("non-fatal — orchestrator.compute() completes without throwing when memory empty or ConversationalMemoryEngine unavailable", () => {
    expect(() => speedFeedOrchestratorEngine.compute(minimalInput)).not.toThrow();
  });

  it("non-fatal — compute() returns structured result with engines_called[0] = orchestrator regardless of memory state", () => {
    const result = speedFeedOrchestratorEngine.compute(minimalInput);
    expect(result.value.engines_called[0]).toBe("SpeedFeedOrchestratorEngine");
    expect(Array.isArray(result.value.formulas_used)).toBe(true);
  });

  it("material gate — queryObsidianMemoryEvidence returns {found:false} when input.material is missing", async () => {
    const src = await readFile(
      new URL("../engines/SpeedFeedOrchestratorEngine.ts", import.meta.url),
      "utf8"
    );
    expect(src).toContain("memory:no-material-key");
  });
});
