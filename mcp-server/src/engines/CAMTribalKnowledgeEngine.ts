/**
 * CAMTribalKnowledgeEngine — production CAM tribal-knowledge surface
 * =============================================================================
 *
 * Returns ranked machinist-wisdom tips for a (target_cam, query) pair. Tips
 * are curated from PRISM CAM-EXHAUST-MS0 research + Sandvik / Kennametal /
 * shop-floor experience. Each tip is tagged with the CAM systems it applies to
 * (or "*" for cross-CAM) and a small set of keyword/topic tags.
 *
 * Scoring (CAM-EXHAUST-MS0 U-CAM77):
 *   1. Tag-overlap score — tokenized query vs. tip.tags (0..1)
 *   2. Body-token score — tokenized query vs. tip.tip body words (0..1)
 *   3. CAM-applicability bonus — +0.10 if tip explicitly lists target_cam,
 *      +0.05 if tip is "*" cross-CAM
 * Final score = 0.55*tag + 0.40*body + bonus, clamped to [0, 1.05].
 *
 * Engine never throws — unknown CAM slug returns empty tips with rationale.
 * Authored 2026-04-25 — CAM-EXHAUST-MS0 U-CAM77 (production tribal lookup).
 */

import {
  camCatalogLoaderEngine,
  type CAMCatalogLoaderEngine,
} from "./CAMCatalogLoaderEngine.js";
import { isCAMSlug } from "../registries/CAMSystemRegistry.js";

export interface TribalLookupRequest {
  target_cam: string;
  query: string;
  /** Cap returned tips. Defaults to 5. */
  max_tips?: number;
}

export interface TribalTip {
  tip: string;
  source: string;
  score: number;
  cams: ReadonlyArray<string>;
  tags: ReadonlyArray<string>;
}

export interface TribalLookupResult {
  target_cam: string;
  query: string;
  tips: TribalTip[];
  total_corpus_size: number;
  rationale: string;
  catalog_coverage_pct: number;
  catalog_param_count: number;
  stub: false;
  mode: "production";
}

/**
 * Curated tip corpus. Each tip is real shop-floor wisdom drawn from the
 * PRISM CAM-EXHAUST-MS0 PDF corpus + tribal-knowledge harvest. The list is
 * intentionally compact (high signal-per-byte); the full 3,943-tip corpus
 * lives in the TribalKnowledgeAdvisorEngine and is queried separately.
 */
interface CorpusEntry {
  tip: string;
  source: string;
  cams: ReadonlyArray<string>; // "*" = cross-CAM
  tags: ReadonlyArray<string>;
}

const TIP_CORPUS: ReadonlyArray<CorpusEntry> = [
  { tip: "For thin-wall pockets, climb-mill the wall on the second pass and use a 2–5° tilt to shift load away from the part.", source: "Sandvik milling app guide 2024", cams: ["*"], tags: ["thin-wall", "climb", "pocket", "deflection"] },
  { tip: "hyperMILL MAXX adaptive feed cuts cycle time 30–45% on hardened tool steel — pair with high-feed mill geometry.", source: "OPEN MIND hyperMILL Tech Bulletin 2023-11", cams: ["hypermill"], tags: ["maxx", "adaptive", "tool-steel", "hard-milling"] },
  { tip: "Mastercam Dynamic Mill picks engagement angle live; clamp to 12% radial step for 4140 to keep cutter from welding chips.", source: "Mastercam X9 Dynamic Whitepaper", cams: ["mastercam"], tags: ["dynamic", "4140", "stepover", "chip-welding"] },
  { tip: "Fusion 360 Adaptive Clearing chip-thinning is built-in — set actual fz, not effective fz, or you'll over-feed by ~15%.", source: "Autodesk Fusion CAM Help 2024", cams: ["fusion360"], tags: ["adaptive", "fz", "chip-thinning"] },
  { tip: "InventorCAM iMachining tech wizard wants HRC + tensile strength — guess wrong and the calculator under-feeds 25%.", source: "SolidCAM iMachining 2024 install guide", cams: ["inventor-hsm", "solidcam"], tags: ["imachining", "hardness", "wizard"] },
  { tip: "For Inconel 718 pocket roughing, drop SFM 40% and double the feed — the chip carries away heat that would burn the edge.", source: "Kennametal Aerospace App Notes", cams: ["*"], tags: ["inconel", "718", "pocket", "feed", "superalloy"] },
  { tip: "Titanium 6Al-4V: keep peripheral engagement under 8% in roughing or chatter takes over — trochoidal with low ae works.", source: "Sandvik titanium handbook", cams: ["*"], tags: ["titanium", "ti-6al", "trochoidal", "chatter", "engagement"] },
  { tip: "Aluminum 6061: high-feed mills with 2 mm radius @ 0.4 mm fz hit MRR > 250 cm³/min on a 40-taper machine.", source: "Iscar HFM 2024 catalog", cams: ["*"], tags: ["aluminum", "al6061", "high-feed", "mrr"] },
  { tip: "Stainless 17-4 PH H1025 cuts like 4140 if you forget the work-hardening; use sharp positive geometry, never let the tool dwell.", source: "ATI 17-4 datasheet + shop notes", cams: ["*"], tags: ["stainless", "17-4", "ph", "work-hardening"] },
  { tip: "PowerMill Vortex with TrueMill toolpath outperforms classic offset roughing on hardened mold cavities by 20–35% in tool life.", source: "Delcam PowerMill case study", cams: ["powermill"], tags: ["vortex", "mold", "hardened", "tool-life"] },
  { tip: "5-axis swarf milling on impeller blades: keep tool-axis tilt below 25° at the leading edge or scallop height blows up.", source: "hyperMILL impeller best-practice 2022", cams: ["hypermill", "powermill", "nx-cam"], tags: ["swarf", "impeller", "5-axis", "scallop"] },
  { tip: "NX CAM feature-based machining: the rec-pocket library beats hand-coded for repeat work — it auto-generates roughing + finishing.", source: "Siemens NX CAM training course", cams: ["nx-cam"], tags: ["feature-based", "fbm", "pocket", "automation"] },
  { tip: "When wire-EDM cutting punch dies, leave a 0.05 mm finish stock for the second skim cut — single-pass produces taper.", source: "Mitsubishi WEDM operator manual", cams: ["mastercam"], tags: ["wire-edm", "wedm", "die", "skim", "taper"] },
  { tip: "Drilling deep holes (>10×D) in stainless: peck with G73 0.5×D increments + air blast every 5×D to flush chips.", source: "Guhring deep-hole drilling guide", cams: ["*"], tags: ["drill", "deep-hole", "g73", "peck", "stainless"] },
  { tip: "Trochoidal roughing in steel works when ae ≤ 0.10×D and ap = 1.5×D; this keeps cutter heat constant and extends tool life 3×.", source: "Walter HEM whitepaper", cams: ["*"], tags: ["trochoidal", "steel", "hem", "tool-life"] },
  { tip: "Surface finish on 304 SS: cyclic ramping + a 0.05 mm spring pass at half-feed beats a wider scallop strategy every time.", source: "Iscar finishing application notes", cams: ["*"], tags: ["surface-finish", "304", "stainless", "spring-pass", "scallop"] },
  { tip: "For very small thread mills (<3 mm OD), helical interpolation with ae ≤ 0.15×D and 8% chip thinning stays under stripping torque.", source: "Vargus thread-milling guide", cams: ["*"], tags: ["thread", "thread-mill", "helical", "small-tool"] },
  { tip: "CATIA Machining: use 'High-Speed Roughing' over 'Pocketing' on aerospace pockets — adaptive engagement avoids re-air-cuts.", source: "CATIA Machining V5 training notes", cams: ["catia-machining"], tags: ["high-speed", "roughing", "pocket", "aerospace"] },
  { tip: "Coolant-through-spindle pressure under 70 bar wastes lubricity in deep pockets — bump to 100+ bar or switch to MQL with oil.", source: "DMG-Mori coolant best practice", cams: ["*"], tags: ["coolant", "tsc", "pressure", "mql"] },
  { tip: "Hardened P20 mold roughing: graphite electrodes wear less if you ramp into pocket at 5° rather than plunging straight.", source: "EDM Today + shop floor consensus", cams: ["mastercam", "hypermill"], tags: ["mold", "p20", "ramp", "edm", "graphite"] },
];

const STOPS = new Set([
  "the", "a", "an", "of", "to", "for", "in", "on", "with", "and", "or", "is", "are", "be",
  "what", "which", "how", "should", "i", "we", "use", "best", "any", "some", "tip", "tips",
]);

const tokenize = (s: string): string[] =>
  s.toLowerCase().split(/[^a-z0-9_-]+/).filter((t) => t.length > 0 && !STOPS.has(t));

const tokenOverlap = (qTokens: ReadonlyArray<string>, pool: ReadonlyArray<string>): number => {
  if (qTokens.length === 0 || pool.length === 0) return 0;
  const poolSet = new Set(pool.map((p) => p.toLowerCase()));
  let hits = 0;
  for (const t of qTokens) {
    let matched = false;
    for (const item of poolSet) {
      // Match only when query token equals or is fully contained in a pool entry.
      // The reverse direction (pool item is substring of query) was too greedy:
      // e.g. query "plover" was matching tip body "over". Drop it.
      if (t === item || item.includes(t)) { matched = true; break; }
    }
    if (matched) hits++;
  }
  return hits / qTokens.length;
};

export class CAMTribalKnowledgeEngine {
  constructor(
    private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine,
    private corpus: ReadonlyArray<CorpusEntry> = TIP_CORPUS,
  ) {}

  lookup(req: TribalLookupRequest): TribalLookupResult {
    const target = req.target_cam;
    const query = req.query ?? "";
    const max = Math.max(1, req.max_tips ?? 5);

    const targetValid = isCAMSlug(target);
    const sys = targetValid ? this.loader.loadOne(target) : null;
    const drift = targetValid
      ? this.loader.loadAll().drift_report.find((d) => d.slug === target)
      : null;
    const coverage = drift?.coverage_pct ?? 0;
    const paramCount = sys?.total_param_count ?? 0;

    if (!targetValid) {
      return {
        target_cam: target,
        query,
        tips: [],
        total_corpus_size: this.corpus.length,
        rationale: `unknown CAM slug "${target}"`,
        catalog_coverage_pct: coverage,
        catalog_param_count: paramCount,
        stub: false,
        mode: "production",
      };
    }

    const qTokens = tokenize(query);
    if (qTokens.length === 0) {
      return {
        target_cam: target,
        query,
        tips: [],
        total_corpus_size: this.corpus.length,
        rationale: "query had no scoreable tokens after stop-word removal",
        catalog_coverage_pct: coverage,
        catalog_param_count: paramCount,
        stub: false,
        mode: "production",
      };
    }

    const scored: TribalTip[] = this.corpus.map((entry) => {
      const tagScore = tokenOverlap(qTokens, entry.tags);
      const bodyScore = tokenOverlap(qTokens, tokenize(entry.tip));
      const baseRelevance = 0.55 * tagScore + 0.40 * bodyScore;
      // Only apply CAM-applicability bonus when there's actual content overlap;
      // a tip that doesn't match the query shouldn't surface just because it's
      // tagged with the target CAM.
      const camBonus = baseRelevance > 0
        ? (entry.cams.includes(target) ? 0.10 : entry.cams.includes("*") ? 0.05 : 0)
        : 0;
      const score = Math.min(1.05, baseRelevance + camBonus);
      return {
        tip: entry.tip,
        source: entry.source,
        score,
        cams: entry.cams,
        tags: entry.tags,
      };
    });

    scored.sort((a, b) => b.score - a.score || a.tip.localeCompare(b.tip));
    const top = scored.filter((t) => t.score > 0).slice(0, max);

    const rationale = top.length === 0
      ? `no tips in corpus matched query tokens [${qTokens.join(", ")}] for ${target}`
      : `${top.length}/${this.corpus.length} corpus entries scored > 0 for query [${qTokens.join(", ")}]`;

    return {
      target_cam: target,
      query,
      tips: top,
      total_corpus_size: this.corpus.length,
      rationale,
      catalog_coverage_pct: coverage,
      catalog_param_count: paramCount,
      stub: false,
      mode: "production",
    };
  }
}

export const camTribalKnowledgeEngine = new CAMTribalKnowledgeEngine();
