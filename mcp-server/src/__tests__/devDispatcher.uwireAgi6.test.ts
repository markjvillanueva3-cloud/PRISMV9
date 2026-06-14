/**
 * devDispatcher U-WIRE-AGI6 round-trip tests — 3 AGI engines wired into
 * prism_dev (slot:papa /goal /loop iter6, 2026-05-27).
 *
 *   PredictiveWorldSimulatorEngine → predictive_world_simulate
 *   AssetRecommendationEngine      → asset_recommend
 *   AssetSynergyDetectorEngine     → asset_synergy_top
 *
 * Asserts engine API contract + dispatcher source presence (action enum +
 * case-block + lazy import).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-AGI6
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { PredictiveWorldSimulatorEngine } from "../engines/PredictiveWorldSimulatorEngine.js";
import { AssetRecommendationEngine } from "../engines/AssetRecommendationEngine.js";
import { AssetSynergyDetectorEngine } from "../engines/AssetSynergyDetectorEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISPATCHER_SRC = fs.readFileSync(
  path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts"),
  "utf8"
);

describe("U-WIRE-PREDICTIVE-WORLD engine — change impact simulation", () => {
  it("low-risk edit (no critical, no api, tests present) yields low risk", () => {
    const e = new PredictiveWorldSimulatorEngine();
    const r = e.simulate({
      path: "src/utils/Foo.ts",
      kind: "edit",
      testFiles: ["src/__tests__/Foo.test.ts"],
      dependents: [],
      sizeDeltaLines: 10,
    });
    expect(r.path).toBe("src/utils/Foo.ts");
    expect(r.risk).toBe("low");
    expect(r.breakProbability).toBeLessThan(0.3);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("critical-file + public-api + no-tests yields high risk + warnings", () => {
    const e = new PredictiveWorldSimulatorEngine();
    const r = e.simulate({
      path: "src/physics/constants.ts",
      kind: "edit",
      criticalFile: true,
      touchesPublicApi: true,
      testFiles: [],
      sizeDeltaLines: 200,
    });
    expect(r.risk).toBe("high");
    expect(r.breakProbability).toBeGreaterThan(0.5);
    expect(r.warnings.some(w => w.includes("critical"))).toBe(true);
    expect(r.warnings.some(w => w.includes("public API"))).toBe(true);
    expect(r.warnings.some(w => w.includes("tests"))).toBe(true);
  });

  it("delete kind has higher multiplier than write kind for same change with tests present", () => {
    // Both calls supply testFiles so the missing-tests penalty (which is
    // skipped for delete) doesn't dominate the kind-multiplier comparison.
    const e = new PredictiveWorldSimulatorEngine();
    const del = e.simulate({ path: "x.ts", kind: "delete", criticalFile: true, testFiles: ["t"] });
    const wrt = e.simulate({ path: "x.ts", kind: "write", criticalFile: true, testFiles: ["t"] });
    expect(del.breakProbability).toBeGreaterThan(wrt.breakProbability);
  });
});

describe("U-WIRE-ASSET-RECOMMEND engine — keyword-based ranking", () => {
  const A1 = { id: "Kienzle", kind: "engine" as const, keywords: ["cutting", "force", "kienzle"] };
  const A2 = { id: "Taylor",  kind: "engine" as const, keywords: ["tool", "life", "taylor"] };
  const A3 = { id: "SLD",     kind: "engine" as const, keywords: ["chatter", "stability", "lobe"] };

  it("recommend ranks Kienzle highest when query is 'cutting force'", () => {
    const e = new AssetRecommendationEngine();
    e.registerAll([A1, A2, A3]);
    const recs = e.recommend({ keywords: ["cutting", "force"], limit: 3 });
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs[0].asset.id).toBe("Kienzle");
    expect(recs[0].overlap.length).toBeGreaterThan(0);
    expect(recs[0].score).toBeGreaterThan(0);
  });

  it("preferKinds boosts matching-kind score (1.15x) without filtering out other kinds", () => {
    // preferKinds is a SOFT boost (1.15x), not a hard filter. Engines pass +
    // skills pass; the engine result outranks the skill due to the boost.
    const e = new AssetRecommendationEngine();
    e.registerAll([
      { id: "Kienzle", kind: "engine" as const, keywords: ["force"] },
      { id: "force-skill", kind: "skill" as const, keywords: ["force"] },
    ]);
    const recs = e.recommend({ keywords: ["force"], preferKinds: ["engine"], limit: 5 });
    const ids = recs.map(r => r.asset.id);
    expect(ids.includes("Kienzle")).toBe(true);
    expect(ids.includes("force-skill")).toBe(true);
    const kienzleIdx = ids.indexOf("Kienzle");
    const skillIdx = ids.indexOf("force-skill");
    expect(kienzleIdx).toBeLessThan(skillIdx);
  });

  it("zero-token query returns empty array", () => {
    const e = new AssetRecommendationEngine();
    e.registerAll([A1]);
    const recs = e.recommend({ keywords: [] });
    expect(recs.length).toBe(0);
  });
});

describe("U-WIRE-ASSET-SYNERGY engine — co-occurrence mining", () => {
  it("3 sessions with {A,B} pair yields A↔B coOccurrence=3 in topSynergies", () => {
    const e = new AssetSynergyDetectorEngine();
    e.observe({ sessionId: "s1", assets: ["A", "B"] });
    e.observe({ sessionId: "s2", assets: ["A", "B"] });
    e.observe({ sessionId: "s3", assets: ["A", "B"] });
    const r = e.topSynergies(5, 2);
    expect(r.totalSessions).toBe(3);
    expect(r.top.length).toBeGreaterThanOrEqual(1);
    expect(r.top[0].coOccurrence).toBe(3);
    expect(r.top[0].assetA + "+" + r.top[0].assetB).toBe("A+B");
  });

  it("dedups by sessionId — same session id observed twice counts once", () => {
    const e = new AssetSynergyDetectorEngine();
    e.observe({ sessionId: "s1", assets: ["A", "B"] });
    e.observe({ sessionId: "s1", assets: ["A", "B"] });
    expect(e.sessionCount()).toBe(1);
  });

  it("synergiesFor returns only pairs involving the named asset", () => {
    const e = new AssetSynergyDetectorEngine();
    e.observe({ sessionId: "s1", assets: ["A", "B"] });
    e.observe({ sessionId: "s2", assets: ["A", "B"] });
    e.observe({ sessionId: "s3", assets: ["C", "D"] });
    e.observe({ sessionId: "s4", assets: ["C", "D"] });
    const aPairs = e.synergiesFor("A", 10, 2);
    expect(aPairs.every(p => p.assetA === "A" || p.assetB === "A")).toBe(true);
    expect(aPairs.length).toBeGreaterThanOrEqual(1);
  });
});

describe("U-WIRE-AGI6 dispatcher wiring source assertions", () => {
  it("action enum lists all 3 new actions", () => {
    expect(DISPATCHER_SRC.includes('"predictive_world_simulate"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"asset_recommend"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"asset_synergy_top"')).toBe(true);
  });

  it("case-blocks exist for all 3 new actions", () => {
    expect(DISPATCHER_SRC.includes("case \"predictive_world_simulate\"")).toBe(true);
    expect(DISPATCHER_SRC.includes("case \"asset_recommend\"")).toBe(true);
    expect(DISPATCHER_SRC.includes("case \"asset_synergy_top\"")).toBe(true);
  });

  it("lazy imports present for all 3 engine modules", () => {
    expect(DISPATCHER_SRC.includes('"../../engines/PredictiveWorldSimulatorEngine.js"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"../../engines/AssetRecommendationEngine.js"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"../../engines/AssetSynergyDetectorEngine.js"')).toBe(true);
  });
});
