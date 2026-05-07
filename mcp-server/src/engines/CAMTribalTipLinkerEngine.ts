/**
 * CAMTribalTipLinkerEngine — U-CAM-ENRICH-02
 * ============================================
 *
 * Scans all `*-cam-tips(-ext).ts` files under src/data/ and links each
 * KnowledgeTip to the physics-relevant parameters it mentions, producing a
 * bidirectional index (tip→params and param→tips).
 *
 * Why text-scan instead of dynamic import: the 20 tip files total ~3,629
 * tips and are compiled as part of the main build. Re-importing them from
 * TypeScript at engine-runtime would require dynamic `import()` resolution
 * and module-specifier gymnastics. A text scan reads each file once, regex-
 * extracts id/title/body/tags, and produces a deterministic index in <1s.
 *
 * The index lives at data/state/CAM_TRIBAL_TIP_INDEX.json. Phase-5 consumers
 * (CAMTribalKnowledgeEngine stub in CAMPhase5Stubs.ts) will load it at
 * runtime for RAG-style retrieval.
 *
 * Downstream: U-CAM-ML-06 (tribal-tip RAG index) consumes this index to
 * build a vector store. Before this ships, ML-06 had no tip-to-param
 * mapping to index against.
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 PHASE-0.6 U-CAM-ENRICH-02.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  camCatalogPhysicsLinkerEngine,
  CAMCatalogPhysicsLinkerEngine,
} from "./CAMCatalogPhysicsLinkerEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export interface ExtractedTip {
  id: string;
  title: string;
  body: string;
  tags: string[];
  operation_types: string[];
  source_file: string;
  cam_slug: string;
}

export interface TipParamLink {
  tip_id: string;
  cam_slug: string;
  matched_params: string[];
  matched_formulas: string[];
  /** How many distinct keyword hits triggered the match (ranking signal). */
  keyword_hits: number;
}

export interface CAMTribalTipIndex {
  schemaVersion: 1;
  generated_at: string;
  total_tips_scanned: number;
  total_tips_with_matches: number;
  total_links: number;
  by_tip: Record<string, { params: string[]; formulas: string[]; cam_slug: string }>;
  by_param: Record<string, string[]>;
  by_cam_param: Record<string, string[]>;
  summary: {
    per_cam_tip_count: Record<string, number>;
    per_cam_linked_count: Record<string, number>;
    top_formulas: Record<string, number>;
  };
}

// ─── Engine ─────────────────────────────────────────────────────────

const PHYSICS_KEYWORDS: ReadonlyArray<string> = [
  // Short forms (must be whole-token after [_\s-] splitting)
  "vc", "fc", "fz", "ae", "ap", "ra", "rz", "vb", "mrr", "rpm",
  "hp", "kw", "sfm", "ipm", "ipr",
  // Multi-word phrases (matched as substrings after [_\s-] → space normalize)
  "cutting force", "normal force", "tangential force", "force n",
  "tool life", "life min", "wear rate", "flank wear",
  "deflection", "bending",
  "temperature", "thermal", "heat flux",
  "material removal", "volume removal",
  "surface finish", "roughness", "scallop",
  "power", "torque", "kilowatts",
  "chip load", "feed per tooth", "chip per tooth",
  "cutting speed", "surface speed",
  "feed rate", "plunge feed", "ramp feed",
  "depth of cut", "step down", "stepdown", "axial depth",
  "width of cut", "step over", "stepover", "radial engagement",
  "spindle speed", "spindle rpm",
  "chatter", "stability lobe", "regenerative",
  "coolant", "through tool",
];

export class CAMTribalTipLinkerEngine {
  readonly name = "CAMTribalTipLinkerEngine";

  constructor(
    private physicsLinker: CAMCatalogPhysicsLinkerEngine = camCatalogPhysicsLinkerEngine
  ) {}

  /** Scan all tip files under src/data + emit the index. */
  linkAll(
    dataDir: string = "H:/PRISM/mcp-server/src/data",
    outPath: string = "H:/PRISM/mcp-server/data/state/CAM_TRIBAL_TIP_INDEX.json"
  ): CAMTribalTipIndex {
    const files = this.listTipFiles(dataDir);
    const tips: ExtractedTip[] = [];
    for (const f of files) {
      try {
        const text = fs.readFileSync(f, "utf-8");
        const slug = this.slugFromFilename(path.basename(f));
        tips.push(...this.extractTipsFromText(text, f, slug));
      } catch {
        // skip unreadable files — a bad tip file should never block the whole run
      }
    }

    const links: TipParamLink[] = [];
    for (const tip of tips) {
      const link = this.linkTip(tip);
      if (link.matched_params.length > 0) links.push(link);
    }

    const byTip: CAMTribalTipIndex["by_tip"] = {};
    const byParam: CAMTribalTipIndex["by_param"] = {};
    const byCamParam: CAMTribalTipIndex["by_cam_param"] = {};
    const formulaCounts: Record<string, number> = {};
    const perCamCount: Record<string, number> = {};
    const perCamLinked: Record<string, number> = {};

    for (const tip of tips) perCamCount[tip.cam_slug] = (perCamCount[tip.cam_slug] ?? 0) + 1;

    for (const l of links) {
      byTip[l.tip_id] = { params: l.matched_params, formulas: l.matched_formulas, cam_slug: l.cam_slug };
      perCamLinked[l.cam_slug] = (perCamLinked[l.cam_slug] ?? 0) + 1;
      for (const p of l.matched_params) {
        byParam[p] = byParam[p] ?? [];
        if (!byParam[p].includes(l.tip_id)) byParam[p].push(l.tip_id);
        const key = `${l.cam_slug}::${p}`;
        byCamParam[key] = byCamParam[key] ?? [];
        if (!byCamParam[key].includes(l.tip_id)) byCamParam[key].push(l.tip_id);
      }
      for (const f of l.matched_formulas) {
        formulaCounts[f] = (formulaCounts[f] ?? 0) + 1;
      }
    }

    const index: CAMTribalTipIndex = {
      schemaVersion: 1,
      generated_at: new Date().toISOString(),
      total_tips_scanned: tips.length,
      total_tips_with_matches: links.length,
      total_links: links.reduce((sum, l) => sum + l.matched_params.length, 0),
      by_tip: byTip,
      by_param: byParam,
      by_cam_param: byCamParam,
      summary: {
        per_cam_tip_count: perCamCount,
        per_cam_linked_count: perCamLinked,
        top_formulas: formulaCounts,
      },
    };

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
    return index;
  }

  /** Match a single tip body to parameter keywords. Exposed for testing. */
  linkTip(tip: ExtractedTip): TipParamLink {
    // Haystack is already surrounded by sentinel spaces (" ...text... ").
    // Each keyword needs to be wrapped with exactly one space on each side to
    // enforce whole-token matching without double-wrapping.
    const haystack = this.normalizeHaystack(
      [tip.title, tip.body, tip.tags.join(" "), tip.operation_types.join(" ")].join(" ")
    );
    const matchedParams = new Set<string>();
    let hits = 0;
    for (const kw of PHYSICS_KEYWORDS) {
      // Normalize keyword inline (same replacement rules) but without sentinel pad
      const normKw = kw.toLowerCase().replace(/[_\-/]+/g, " ").replace(/\s+/g, " ").trim();
      if (haystack.includes(` ${normKw} `)) {
        matchedParams.add(kw);
        hits += 1;
      }
    }
    // Also resolve to canonical formula IDs via the physics linker
    const formulas = new Set<string>();
    for (const param of matchedParams) {
      const r = this.physicsLinker.matchParameter(param);
      for (const f of r.matched_formulas) formulas.add(f);
    }
    return {
      tip_id: tip.id,
      cam_slug: tip.cam_slug,
      matched_params: [...matchedParams],
      matched_formulas: [...formulas],
      keyword_hits: hits,
    };
  }

  /** Regex-based tip extraction from a TypeScript tip file. Public for tests. */
  extractTipsFromText(text: string, sourceFile: string, camSlug: string): ExtractedTip[] {
    const tips: ExtractedTip[] = [];
    // Match each { id: "...", ... } block — tolerate multiline bodies + trailing commas
    // Lazy match to the nearest `}` — tip files don't nest objects inside tips
    const objectRegex = /\{\s*id:\s*"([^"]+)"[\s\S]*?\}/g;
    const matches = text.matchAll(objectRegex);
    for (const m of matches) {
      const block = m[0];
      const id = m[1];
      const title = this.extractStringField(block, "title");
      const body = this.extractStringField(block, "body");
      const tags = this.extractStringArrayField(block, "tags");
      const operation_types = this.extractStringArrayField(block, "operation_types");
      tips.push({
        id,
        title: title ?? "",
        body: body ?? "",
        tags,
        operation_types,
        source_file: path.basename(sourceFile),
        cam_slug: camSlug,
      });
    }
    return tips;
  }

  // ─── Private ──────────────────────────────────────────────────────

  private listTipFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => /-cam-tips(?:-ext)?\.ts$/i.test(f))
      .map((f) => path.join(dir, f));
  }

  private slugFromFilename(basename: string): string {
    // mastercam-cam-tips.ts → mastercam
    // fusion360-cam-tips-ext.ts → fusion360
    // nx-cam-tips.ts → nx
    // inventor-hsm-cam-tips.ts → inventor-hsm
    return basename
      .replace(/-cam-tips(?:-ext)?\.ts$/i, "")
      .toLowerCase();
  }

  private extractStringField(block: string, field: string): string | null {
    // Match either a simple string or a multiline template string
    const re = new RegExp(`${field}:\\s*"((?:\\\\.|[^"\\\\])*)"`, "s");
    const m = block.match(re);
    if (m) return m[1];
    const reTpl = new RegExp(`${field}:\\s*\`((?:\\\\.|[^\`\\\\])*)\``, "s");
    const mt = block.match(reTpl);
    return mt ? mt[1] : null;
  }

  private extractStringArrayField(block: string, field: string): string[] {
    const re = new RegExp(`${field}:\\s*\\[([^\\]]*)\\]`, "s");
    const m = block.match(re);
    if (!m) return [];
    const inner = m[1];
    const out: string[] = [];
    for (const str of inner.matchAll(/"((?:\\.|[^"\\])*)"/g)) out.push(str[1]);
    return out;
  }

  private normalizeHaystack(text: string): string {
    // Replace separators + punctuation with spaces so tokens are cleanly bounded
    return (
      " " +
      text.toLowerCase().replace(/[_\-/.,;:!?()\[\]{}'"]+/g, " ").replace(/\s+/g, " ") +
      " "
    );
  }
}

export const camTribalTipLinkerEngine = new CAMTribalTipLinkerEngine();
