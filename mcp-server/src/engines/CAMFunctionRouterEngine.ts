/**
 * CAMFunctionRouterEngine (stub) — routes an intent to a CAM-specific function
 * =============================================================================
 *
 * Phase-5 consumer engine. Loads catalogs via CAMCatalogLoaderEngine and resolves
 * "give me the adaptive-clearing operation in Mastercam" → concrete function ID.
 *
 * Ships as STUB per F5 fix: returns a deterministic best-effort resolution based
 * on fuzzy name match against the captured catalog's top_keys. Real routing
 * (scored against intent embeddings + per-CAM capability matrix) lands in
 * U-CAM71. The stub exists so every Phase-1 catalog addition produces a live
 * telemetry signal (resolution rate) instead of "not_started forever."
 *
 * Authored 2026-04-21 — CAM-EXHAUST-MS0 F5 fix.
 */

import {
  camCatalogLoaderEngine,
  type CAMCatalogLoaderEngine,
} from "./CAMCatalogLoaderEngine.js";
import { isCAMSlug, PRIORITY_5_SLUGS } from "../registries/CAMSystemRegistry.js";

export interface CAMRouteRequest {
  /** Natural-language intent — "adaptive roughing", "thread milling" */
  intent: string;
  /** Target CAM system slug (canonical). Undefined = any Priority-5 CAM */
  target_cam?: string;
}

export interface CAMRouteResult {
  target_cam: string;
  matched_function: string | null;
  confidence: number;
  candidates: Array<{ cam: string; function: string; score: number }>;
  fallback_used: boolean;
  stub: true;
}

export class CAMFunctionRouterEngine {
  constructor(private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine) {}

  route(req: CAMRouteRequest): CAMRouteResult {
    const targets = req.target_cam
      ? isCAMSlug(req.target_cam) ? [req.target_cam] : []
      : [...PRIORITY_5_SLUGS];

    const candidates: CAMRouteResult["candidates"] = [];
    for (const slug of targets) {
      const sys = this.loader.loadOne(slug);
      for (const file of [...sys.functions_files, ...sys.ui_files]) {
        for (const key of file.top_keys) {
          const score = this.fuzzyScore(req.intent, key);
          if (score > 0.3) candidates.push({ cam: slug, function: key, score });
        }
      }
    }
    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];
    return {
      target_cam: best?.cam ?? req.target_cam ?? "none",
      matched_function: best?.function ?? null,
      confidence: best?.score ?? 0,
      candidates: candidates.slice(0, 5),
      fallback_used: !best,
      stub: true,
    };
  }

  /** Simple token-overlap fuzzy match. Real impl uses embeddings. */
  private fuzzyScore(a: string, b: string): number {
    const ta = new Set(a.toLowerCase().split(/[\s_-]+/).filter(Boolean));
    const tb = new Set(b.toLowerCase().split(/[\s_-]+/).filter(Boolean));
    if (ta.size === 0 || tb.size === 0) return 0;
    let shared = 0;
    for (const t of ta) if (tb.has(t)) shared += 1;
    return shared / Math.max(ta.size, tb.size);
  }
}

export const camFunctionRouterEngine = new CAMFunctionRouterEngine();
