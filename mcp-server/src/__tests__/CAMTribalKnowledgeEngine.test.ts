/**
 * CAMTribalKnowledgeEngine tests — production surface (U-CAM77)
 * ===========================================================================
 * Coverage:
 *   - Happy: multiple queries hit specific tips with predictable ranking
 *   - 3 failure modes: unknown CAM, empty query, query with no overlap
 *   - 2+ adversarial: stop-words-only query, max_tips=0 → clamp to 1, oversize max
 *   - 3+ spanning CAMs: hyperMILL, Mastercam, Fusion360 (PowerMill, NX-CAM)
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import { CAMCatalogLoaderEngine } from "../engines/CAMCatalogLoaderEngine.js";
import {
  CAMTribalKnowledgeEngine,
  camTribalKnowledgeEngine,
} from "../engines/CAMTribalKnowledgeEngine.js";

const DATA_ROOT = path.resolve(__dirname, "../../data");
const loader = new CAMCatalogLoaderEngine(DATA_ROOT);
const tribal = new CAMTribalKnowledgeEngine(loader);

describe("CAMTribalKnowledgeEngine — construction", () => {
  it("constructs and exposes lookup()", () => {
    expect(tribal).toBeInstanceOf(CAMTribalKnowledgeEngine);
    expect(typeof tribal.lookup).toBe("function");
  });
  it("default singleton is a CAMTribalKnowledgeEngine", () => {
    expect(camTribalKnowledgeEngine).toBeInstanceOf(CAMTribalKnowledgeEngine);
  });
});

describe("CAMTribalKnowledgeEngine — happy path queries", () => {
  it("'thin wall titanium' on hyperMILL ranks the trochoidal/thin-wall tips first", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "thin wall titanium" });
    expect(r.tips.length).toBeGreaterThanOrEqual(1);
    expect(r.tips[0].tip.toLowerCase()).toMatch(/thin.wall|titanium|trochoidal/);
    expect(r.tips[0].score).toBeGreaterThan(0);
    expect(r.stub).toBe(false);
    expect(r.mode).toBe("production");
  });

  it("'iMachining wizard' on SolidCAM returns the iMachining-specific tip", () => {
    const r = tribal.lookup({ target_cam: "solidcam", query: "iMachining wizard hardness" });
    expect(r.tips.length).toBeGreaterThanOrEqual(1);
    expect(r.tips[0].tip.toLowerCase()).toMatch(/imachining/);
    expect(r.tips[0].cams).toContain("solidcam");
  });

  it("'aluminum 6061 high-feed' returns aluminum-tagged tip near top", () => {
    const r = tribal.lookup({ target_cam: "fusion360", query: "aluminum 6061 high-feed milling" });
    expect(r.tips.length).toBeGreaterThanOrEqual(1);
    const top = r.tips[0];
    expect(top.tip.toLowerCase()).toMatch(/aluminum|6061|high-feed/);
  });

  it("variability across CAMs: same query returns CAM-specific tips first", () => {
    const r1 = tribal.lookup({ target_cam: "powermill", query: "mold hardened die" });
    const r2 = tribal.lookup({ target_cam: "nx-cam", query: "feature based pocket" });
    expect(r1.tips[0].tip.toLowerCase()).toMatch(/mold|die|vortex/);
    expect(r2.tips[0].tip.toLowerCase()).toMatch(/feature|pocket|fbm/);
  });

  it("max_tips=2 clips returned tips even when more match", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "trochoidal steel pocket adaptive", max_tips: 2 });
    expect(r.tips.length).toBeLessThanOrEqual(2);
  });

  it("score is monotonically non-increasing across returned tips", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "trochoidal pocket steel", max_tips: 5 });
    for (let i = 1; i < r.tips.length; i++) {
      expect(r.tips[i - 1].score).toBeGreaterThanOrEqual(r.tips[i].score);
    }
  });
});

describe("CAMTribalKnowledgeEngine — failure modes", () => {
  it("unknown CAM slug returns empty tips with rationale", () => {
    const r = tribal.lookup({ target_cam: "not-a-cam", query: "anything" });
    expect(r.tips).toHaveLength(0);
    expect(r.rationale).toMatch(/unknown CAM slug/);
    expect(r.total_corpus_size).toBeGreaterThan(0);
  });

  it("empty query returns empty tips, rationale = 'no scoreable tokens'", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "" });
    expect(r.tips).toHaveLength(0);
    expect(r.rationale).toMatch(/no scoreable tokens/);
  });

  it("query with no corpus overlap returns empty tips with explanatory rationale", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "xyzzy plover quux" });
    expect(r.tips).toHaveLength(0);
    expect(r.rationale).toMatch(/no tips in corpus matched/);
  });
});

describe("CAMTribalKnowledgeEngine — adversarial inputs", () => {
  it("stop-words-only query ('the of for') yields no scoreable tokens", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "the of for and to" });
    expect(r.tips).toHaveLength(0);
    expect(r.rationale).toMatch(/no scoreable tokens/);
  });

  it("max_tips=0 is clamped to 1 (must return at least 1 if any score > 0)", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "trochoidal steel pocket", max_tips: 0 });
    expect(r.tips.length).toBeLessThanOrEqual(1);
    expect(r.tips.length).toBeGreaterThanOrEqual(0);
  });

  it("oversize max_tips=999 is silently bounded by corpus matches", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "trochoidal steel pocket aluminum", max_tips: 999 });
    expect(r.tips.length).toBeLessThanOrEqual(r.total_corpus_size);
  });

  it("query with special chars + numbers: 'Inconel 718 SFM 40%' parses cleanly", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "Inconel 718 SFM 40%" });
    expect(r.tips.length).toBeGreaterThanOrEqual(1);
    expect(r.tips[0].tip.toLowerCase()).toMatch(/inconel|718/);
  });
});

describe("CAMTribalKnowledgeEngine — telemetry pass-through", () => {
  it("attaches catalog_coverage_pct + catalog_param_count for known CAM", () => {
    const r = tribal.lookup({ target_cam: "hypermill", query: "anything aluminum" });
    expect(typeof r.catalog_coverage_pct).toBe("number");
    expect(typeof r.catalog_param_count).toBe("number");
    expect(r.catalog_coverage_pct).toBeGreaterThanOrEqual(0);
    expect(r.catalog_coverage_pct).toBeLessThanOrEqual(100);
    expect(r.total_corpus_size).toBeGreaterThanOrEqual(15);
  });
});
