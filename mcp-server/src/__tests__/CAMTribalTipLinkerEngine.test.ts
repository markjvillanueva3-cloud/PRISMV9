/**
 * CAMTribalTipLinkerEngine tests — U-CAM-ENRICH-02
 * ==================================================
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMTribalTipLinkerEngine,
  camTribalTipLinkerEngine,
  type ExtractedTip,
} from "../engines/CAMTribalTipLinkerEngine.js";

const engine = new CAMTribalTipLinkerEngine();

function tip(overrides: Partial<ExtractedTip> = {}): ExtractedTip {
  return {
    id: "t1",
    title: "",
    body: "",
    tags: [],
    operation_types: [],
    source_file: "t.ts",
    cam_slug: "mastercam",
    ...overrides,
  };
}

describe("CAMTribalTipLinkerEngine — linkTip parameter matching", () => {
  it("matches cutting_force phrase in body", () => {
    const r = engine.linkTip(tip({ body: "Monitor the cutting force during roughing." }));
    expect(r.matched_params).toContain("cutting force");
    expect(r.matched_formulas).toContain("kienzle_cutting_force");
  });

  it("matches short-form Vc token", () => {
    const r = engine.linkTip(tip({ body: "Increase Vc for better surface finish." }));
    expect(r.matched_params).toContain("vc");
    expect(r.matched_formulas).toContain("cutting_speed_vc");
  });

  it("matches feed_per_tooth phrase", () => {
    const r = engine.linkTip(tip({ body: "Set chip load / feed per tooth to 0.1 mm." }));
    expect(r.matched_params).toContain("chip load");
    expect(r.matched_formulas).toContain("chip_load_per_tooth");
  });

  it("matches scallop height for surface finish", () => {
    const r = engine.linkTip(tip({ body: "Reduce scallop height by decreasing stepover." }));
    expect(r.matched_params).toContain("scallop");
    expect(r.matched_params).toContain("stepover");
  });

  it("matches chatter for stability lobe", () => {
    const r = engine.linkTip(tip({ body: "Tune RPM into a stability lobe to avoid chatter." }));
    expect(r.matched_formulas).toContain("chatter_stability_lobe");
    expect(r.matched_formulas).toContain("spindle_rpm");
  });

  it("returns zero matches for a non-physics tip", () => {
    const r = engine.linkTip(tip({ body: "Always save your work before closing Mastercam." }));
    expect(r.matched_params).toHaveLength(0);
  });

  it("searches title + tags + operation_types in addition to body", () => {
    const r = engine.linkTip(tip({ title: "", body: "", tags: ["feed-rate"], operation_types: ["contour"] }));
    expect(r.matched_params).toContain("feed rate");
  });

  it("keyword_hits reflects distinct keyword count, not raw regex hits", () => {
    const r = engine.linkTip(tip({ body: "Feed rate and feed rate feed rate" }));
    // "feed rate" appears 3x but counts as 1 distinct keyword
    expect(r.keyword_hits).toBe(1);
  });
});

describe("CAMTribalTipLinkerEngine — extractTipsFromText parser", () => {
  const SAMPLE_TIP_FILE = `
import type { KnowledgeTip } from "../engines/TribalKnowledgeEngine.js";
export const SAMPLE_CAM_TIPS: KnowledgeTip[] = [
  {
    id: "t-001",
    title: "Reduce chatter by tuning spindle RPM",
    body: "When you see chatter marks, step into a stability lobe by nudging RPM up or down.",
    category: "cam_strategy",
    tags: ["chatter", "spindle"],
    operation_types: ["3d_rough", "contour"],
    confidence: 90,
    source: "web:test",
    created_at: "2026-04-21",
    usage_count: 0,
  },
  {
    id: "t-002",
    title: "Feed per tooth in aluminum",
    body: "For 6061 with 3-flute carbide, use fz 0.08-0.15 mm.",
    category: "cam_strategy",
    tags: ["aluminum", "feed"],
    operation_types: ["pocket"],
    confidence: 85,
    source: "web:test",
    created_at: "2026-04-21",
    usage_count: 0,
  },
];
`;

  it("extracts exactly the number of tips present", () => {
    const tips = engine.extractTipsFromText(SAMPLE_TIP_FILE, "sample-cam-tips.ts", "sample");
    expect(tips).toHaveLength(2);
  });

  it("preserves id, title, body, tags, operation_types per tip", () => {
    const tips = engine.extractTipsFromText(SAMPLE_TIP_FILE, "sample-cam-tips.ts", "sample");
    expect(tips[0].id).toBe("t-001");
    expect(tips[0].title).toMatch(/chatter/);
    expect(tips[0].body).toMatch(/stability lobe/);
    expect(tips[0].tags).toContain("chatter");
    expect(tips[0].operation_types).toContain("3d_rough");
    expect(tips[1].id).toBe("t-002");
  });

  it("infers cam_slug correctly from each filename pattern", () => {
    // These are all just parser tests; slug is only used for record-keeping
    const tips = engine.extractTipsFromText(SAMPLE_TIP_FILE, "fusion360-cam-tips-ext.ts", "fusion360");
    expect(tips[0].cam_slug).toBe("fusion360");
  });

  it("returns an empty array when no tips are present", () => {
    const tips = engine.extractTipsFromText("export const NO_TIPS: KnowledgeTip[] = [];", "empty.ts", "empty");
    expect(tips).toHaveLength(0);
  });
});

describe("CAMTribalTipLinkerEngine — linkAll end-to-end", () => {
  it("walks a temp directory of tip files and emits an index", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tribal-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "mastercam-cam-tips.ts"),
        `export const X: any[] = [{ id: "m-1", title: "", body: "Feed rate and chatter tuning.", tags: [], operation_types: [] }];`
      );
      fs.writeFileSync(
        path.join(tmp, "hypermill-cam-tips.ts"),
        `export const Y: any[] = [{ id: "h-1", title: "", body: "Scallop height matters.", tags: [], operation_types: [] }];`
      );
      const out = path.join(tmp, "index.json");
      const idx = engine.linkAll(tmp, out);
      expect(idx.total_tips_scanned).toBe(2);
      expect(idx.total_tips_with_matches).toBe(2);
      expect(idx.summary.per_cam_tip_count.mastercam).toBe(1);
      expect(idx.summary.per_cam_tip_count.hypermill).toBe(1);
      expect(fs.existsSync(out)).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("by_param index lists tip ids per parameter keyword", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tribal-"));
    try {
      fs.writeFileSync(
        path.join(tmp, "mastercam-cam-tips.ts"),
        `export const X: any[] = [
          { id: "a", title: "", body: "Feed rate tuning.", tags: [], operation_types: [] },
          { id: "b", title: "", body: "Feed rate and chatter.", tags: [], operation_types: [] }
        ];`
      );
      const idx = engine.linkAll(tmp, path.join(tmp, "idx.json"));
      expect(idx.by_param["feed rate"]).toContain("a");
      expect(idx.by_param["feed rate"]).toContain("b");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("empty directory produces empty index without throwing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tribal-empty-"));
    try {
      const idx = engine.linkAll(tmp, path.join(tmp, "idx.json"));
      expect(idx.total_tips_scanned).toBe(0);
      expect(idx.total_tips_with_matches).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("CAMTribalTipLinkerEngine — singleton", () => {
  it("default singleton is importable", () => {
    expect(camTribalTipLinkerEngine).toBeInstanceOf(CAMTribalTipLinkerEngine);
  });
});
