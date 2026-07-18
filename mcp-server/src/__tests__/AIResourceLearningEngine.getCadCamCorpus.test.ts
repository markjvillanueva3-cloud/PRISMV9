/**
 * AIResourceLearningEngine.getCadCamCorpus + aiReasoning.ai_cadcam_corpus_pointers
 * dispatcher round-trip.
 *
 * Wires the india iter23/24/25/26 3-layer cad+cam consolidated training-corpus
 * handoff (21 CAD + 598 CAM + 5 dual) into the PRISM AI orchestration layer.
 *
 * Shipped 2026-05-24 (slot:india iter26 — claude-orchestration PSN-leg closure).
 */

import { describe, it, expect } from "vitest";
import { aiResourceLearningEngine } from "../engines/AIResourceLearningEngine.js";

describe("AIResourceLearningEngine.getCadCamCorpus — happy path", () => {
  it("returns the canonical consolidated artifact paths", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.consolidatedJson).toBe("state/shared/cadcam-consolidated-corpus.json");
    expect(r.consolidatedMdIndex).toBe("state/shared/CADCAM-CONSOLIDATED-INDEX-2026-05-24.md");
    expect(r.cadTribalJsonl).toBe("state/shared/cad-tribal-corpus.jsonl");
    expect(r.camTribalJsonl).toBe("state/shared/cam-tribal-corpus.jsonl");
    expect(r.cadWikiIndex).toBe("knowledge/wiki/training/cad-corpus-index.md");
    expect(r.camWikiIndex).toBe("knowledge/wiki/training/cam-corpus-index.md");
    expect(r.vizAugmentationFile).toBe("state/shared/system-viz/cadcam-training-corpus-augmentation.json");
  });

  it("returns the shipped corpus counts (21 CAD + 598 CAM + 5 dual)", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.cadCount).toBe(21);
    expect(r.camCount).toBe(598);
    expect(r.dualClassified).toBe(5);
  });

  it("returns audience routing (cad→delta, cam→kilo) per JULIETT-12CHAT-ALLOCATION-MS0", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.audienceMap.cad).toBe("delta");
    expect(r.audienceMap.cam).toBe("kilo");
  });

  it("returns the system-viz graph node ids (roost + 2 pivots)", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.vizRoostId).toBe("ghost.cadcam_training_corpus");
    expect(r.vizCadPivotId).toBe("ghost.cadcam_training_corpus.cad");
    expect(r.vizCamPivotId).toBe("ghost.cadcam_training_corpus.cam");
  });

  it("returns the regen-script paths for all 3 layers", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.regenScripts.consolidate).toBe("scripts/consolidate-cadcam-corpus.mjs");
    expect(r.regenScripts.tribalWiki).toBe("scripts/extract-cadcam-tribal-wiki.mjs");
    expect(r.regenScripts.vizRoost).toBe("scripts/generate-cadcam-training-corpus-features.mjs");
  });

  it("returns the youtube + book curation counts", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.youtubeChannelCount.cad).toBe(8);
    expect(r.youtubeChannelCount.cam).toBe(7);
    expect(r.bookCount).toBe(11);
  });

  it("returns the source commit shas (full traceability across 4 commits)", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.sourceCommits.consolidate).toBe("1bdcbff625");
    expect(r.sourceCommits.tribalWiki).toBe("2256216327");
    expect(r.sourceCommits.vizRoost).toBe("13362c6e7f");
    expect(r.sourceCommits.vizRoostScript).toBe("54bd1e47b7");
  });
});

describe("AIResourceLearningEngine.getCadCamCorpus — invariants", () => {
  it("is pure (same return on every call)", () => {
    const r1 = aiResourceLearningEngine.getCadCamCorpus();
    const r2 = aiResourceLearningEngine.getCadCamCorpus();
    expect(r2).toEqual(r1);
  });

  it("all numeric counts are non-negative integers", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    for (const c of [r.cadCount, r.camCount, r.dualClassified, r.youtubeChannelCount.cad, r.youtubeChannelCount.cam, r.bookCount]) {
      expect(Number.isInteger(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
    }
  });

  it("file paths are POSIX-style (no Windows backslash leakage)", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    const paths = [
      r.consolidatedJson, r.consolidatedMdIndex,
      r.cadTribalJsonl, r.camTribalJsonl,
      r.cadWikiIndex, r.camWikiIndex,
      r.vizAugmentationFile,
      r.regenScripts.consolidate, r.regenScripts.tribalWiki, r.regenScripts.vizRoost,
    ];
    for (const p of paths) {
      expect(p).not.toMatch(/\\/);
    }
  });

  it("viz node ids use dot-separated ghost.* namespace", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.vizRoostId).toMatch(/^ghost\./);
    expect(r.vizCadPivotId.startsWith(r.vizRoostId + ".")).toBe(true);
    expect(r.vizCamPivotId.startsWith(r.vizRoostId + ".")).toBe(true);
  });

  it("tribal jsonl paths end with .jsonl; md indexes end with .md; viz aug ends with .json", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.cadTribalJsonl.endsWith(".jsonl")).toBe(true);
    expect(r.camTribalJsonl.endsWith(".jsonl")).toBe(true);
    expect(r.cadWikiIndex.endsWith(".md")).toBe(true);
    expect(r.camWikiIndex.endsWith(".md")).toBe(true);
    expect(r.consolidatedMdIndex.endsWith(".md")).toBe(true);
    expect(r.vizAugmentationFile.endsWith(".json")).toBe(true);
    expect(r.consolidatedJson.endsWith(".json")).toBe(true);
  });
});

describe("AIResourceLearningEngine.getCadCamCorpus — schema contract", () => {
  it("returns the documented top-level keys", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(Object.keys(r).sort()).toEqual([
      "audienceMap",
      "bookCount",
      "cadCount",
      "cadTribalJsonl",
      "cadWikiIndex",
      "camCount",
      "camTribalJsonl",
      "camWikiIndex",
      "consolidatedJson",
      "consolidatedMdIndex",
      "dualClassified",
      "regenScripts",
      "sourceCommits",
      "vizAugmentationFile",
      "vizCadPivotId",
      "vizCamPivotId",
      "vizRoostId",
      "youtubeChannelCount",
    ]);
  });

  it("sourceCommits has exactly 4 keys (consolidate/tribalWiki/vizRoost/vizRoostScript)", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(Object.keys(r.sourceCommits).sort()).toEqual(["consolidate", "tribalWiki", "vizRoost", "vizRoostScript"]);
  });

  it("every commit sha is a 10-char hex string", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    for (const sha of Object.values(r.sourceCommits)) {
      expect(sha).toMatch(/^[0-9a-f]{10}$/);
    }
  });

  it("regenScripts has exactly 3 entries matching the 3-layer chain", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(Object.keys(r.regenScripts).sort()).toEqual(["consolidate", "tribalWiki", "vizRoost"]);
  });
});

describe("AIResourceLearningEngine.getCadCamCorpus — adversarial / spanning", () => {
  it("returns an object (not array, not null) regardless of call context", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r).not.toBeNull();
    expect(Array.isArray(r)).toBe(false);
    expect(typeof r).toBe("object");
  });

  it("camCount strictly exceeds cadCount (598 > 21 — CAM corpus dominates)", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.camCount).toBeGreaterThan(r.cadCount);
  });

  it("dualClassified is bounded by min(cad, cam)", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    expect(r.dualClassified).toBeLessThanOrEqual(Math.min(r.cadCount, r.camCount));
  });

  it("audienceMap values are valid NATO slot names from SLOT_NAMES", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    const validSlots = new Set(["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike"]);
    expect(validSlots.has(r.audienceMap.cad)).toBe(true);
    expect(validSlots.has(r.audienceMap.cam)).toBe(true);
  });

  it("survives 100 rapid sequential calls (no internal mutation)", () => {
    const baseline = aiResourceLearningEngine.getCadCamCorpus();
    for (let i = 0; i < 100; i++) {
      const r = aiResourceLearningEngine.getCadCamCorpus();
      expect(r).toEqual(baseline);
    }
  });

  it("returned object can be safely JSON-round-tripped", () => {
    const r = aiResourceLearningEngine.getCadCamCorpus();
    const round = JSON.parse(JSON.stringify(r));
    expect(round).toEqual(r);
  });
});
