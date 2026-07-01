/**
 * PostLibraryEngine — query + download the consolidated post-processor library.
 *
 * Bridges the consolidated fleet (JM DIE/POST PROCESSORS/ — built by
 * scripts/post-processor-consolidate.mjs) to:
 *   - PPG (post-processor generator) page (`prism_cam:post_library_search`)
 *   - Employee portal download surface (`prism_cam:post_library_download`)
 *   - PRISM internal Master Post Processor (the end-mission)
 *
 * Reads POST-PROCESSOR-MANIFEST.json (576 posts as of 2026-05-25, across
 * .cps/.pst/.psb/.tcl/.lib formats spanning hurco/haas/mazak/fanuc/siemens/
 * heidenhain/okuma/makino/mitsubishi/etc.). The manifest is the single
 * source of truth — regenerate via `node scripts/post-processor-consolidate.mjs`.
 *
 * Three tiers exposed:
 *   - PRISM ENHANCED (17 as of 2026-05-25) — production-grade, sale-ready,
 *     downloadable to employees + listed on PPG public page
 *   - vanilla (stock vendor) — research/reference only
 *   - work-in-progress (partial enhancement) — internal only
 *
 * Authored 2026-05-25 (slot:echo, operator directive: "bridge post
 * processors to the post processor generator page and the employee portal
 * so they can download them when needed").
 */

import { log } from "../utils/Logger.js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = "H:/prism";
const MANIFEST_PATH = `${REPO_ROOT}/JM DIE/POST PROCESSORS/POST-PROCESSOR-MANIFEST.json`;

// ── Types ────────────────────────────────────────────────────────────────────

export type PostTier = "vanilla" | "wip" | "prism-enhanced";

export interface PostEntry {
  source: string;        // original location (relative to repo root)
  dest: string;          // consolidated location (relative to repo root)
  format: string;        // file extension (.cps, .pst, ...)
  cam: string;           // CAM system (autodesk-fusion, mastercam, hypermill, ...)
  brand: string;         // machine brand (hurco, okuma, haas, ...)
  domain: string;        // mill, lathe, mill-turn, wire-edm, ...
  tier: PostTier;
  size_bytes: number;
  copied: boolean;
}

export interface PostLibraryManifest {
  schemaVersion: string;
  generated_at: string;
  counts: {
    total: number;
    by_format: Record<string, number>;
    by_brand: Record<string, number>;
    by_domain: Record<string, number>;
    by_tier: Record<string, number>;
  };
  entries: PostEntry[];
}

export interface SearchQuery {
  /** Filter by CAM (autodesk-fusion / mastercam / hypermill / esprit / solidcam / powermill / nx-siemens / catia-delmia). */
  cam?: string;
  /** Filter by brand (hurco / haas / okuma / mazak / etc.) — case-insensitive. */
  brand?: string;
  /** Filter by machine domain (mill / lathe / mill-turn / wire-edm / ...). */
  domain?: string;
  /** Filter by tier — default "prism-enhanced" for public surfaces. */
  tier?: PostTier | "all";
  /** Free-text substring on entry.source filename. */
  q?: string;
  /** Max results. Default 50. */
  limit?: number;
}

export interface SearchResult {
  query: SearchQuery;
  matched: PostEntry[];
  total_matched: number;
  total_in_library: number;
  manifest_generated_at: string;
}

export interface DownloadResult {
  /** Source path (relative to repo root). */
  source: string;
  /** File contents — base64-encoded for safe MCP transport (binary or text). */
  content_base64: string;
  /** Size in bytes. */
  size_bytes: number;
  /** Format extension. */
  format: string;
  /** CAM system. */
  cam: string;
  /** Tier — must be prism-enhanced for employee-portal access (gate-check at caller). */
  tier: PostTier;
  /** SHA-256 hex digest for integrity verification. */
  sha256: string;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class PostLibraryEngine {
  private cachedManifest: PostLibraryManifest | null = null;
  private cachedAt = 0;
  private static CACHE_TTL_MS = 5 * 60 * 1000;  // 5 min

  /**
   * Search the consolidated post-processor library.
   * Returns top N (default 50) entries matching the filter.
   */
  search(query: SearchQuery): SearchResult {
    const manifest = this.loadManifest();
    const tier = query.tier ?? "prism-enhanced";
    const limit = query.limit ?? 50;
    const q = query.q?.toLowerCase();

    let matched = manifest.entries.filter((e) => {
      if (tier !== "all" && e.tier !== tier) return false;
      if (query.cam && e.cam !== query.cam) return false;
      if (query.brand && e.brand.toLowerCase() !== query.brand.toLowerCase()) return false;
      if (query.domain && e.domain !== query.domain) return false;
      if (q && !e.source.toLowerCase().includes(q) && !e.dest.toLowerCase().includes(q)) return false;
      return true;
    });

    const total = matched.length;
    if (limit > 0) matched = matched.slice(0, limit);

    return {
      query,
      matched,
      total_matched: total,
      total_in_library: manifest.entries.length,
      manifest_generated_at: manifest.generated_at,
    };
  }

  /**
   * Download a single post by source path (or dest path). Returns base64-
   * encoded content + SHA-256 for integrity verification.
   *
   * SECURITY: caller MUST gate by tier — only PRISM ENHANCED should be
   * exposed externally (PPG public page or employee portal). Vanilla/WIP
   * tier downloads MUST be internal-only.
   */
  async download(pathOrDest: string): Promise<DownloadResult> {
    const manifest = this.loadManifest();
    const entry = manifest.entries.find(
      (e) => e.source === pathOrDest || e.dest === pathOrDest,
    );
    if (!entry) throw new Error(`PostLibraryEngine.download: not found in manifest: ${pathOrDest}`);

    // Prefer the consolidated dest copy; fall back to source if dest missing.
    const candidates = [
      resolve(REPO_ROOT, entry.dest),
      resolve(REPO_ROOT, entry.source),
    ];
    let resolved: string | null = null;
    for (const p of candidates) {
      if (existsSync(p)) { resolved = p; break; }
    }
    if (!resolved) throw new Error(`PostLibraryEngine.download: file gone from disk: ${pathOrDest}`);

    const buf = readFileSync(resolved);
    const { createHash } = await import("node:crypto");
    const sha256 = createHash("sha256").update(buf).digest("hex");

    log.info(`[PostLibrary] download ${entry.tier}/${entry.brand}/${entry.domain}/${entry.format} (${buf.length} bytes)`);

    return {
      source: entry.source,
      content_base64: buf.toString("base64"),
      size_bytes: buf.length,
      format: entry.format,
      cam: entry.cam,
      tier: entry.tier,
      sha256,
    };
  }

  /**
   * Manifest summary — light-weight stats for dashboards. Does NOT return
   * the full entry list (use search() for that).
   */
  summary(): {
    total: number;
    by_format: Record<string, number>;
    by_brand: Record<string, number>;
    by_domain: Record<string, number>;
    by_tier: Record<string, number>;
    generated_at: string;
    manifest_path: string;
  } {
    const m = this.loadManifest();
    return {
      total: m.counts.total,
      by_format: m.counts.by_format,
      by_brand: m.counts.by_brand,
      by_domain: m.counts.by_domain,
      by_tier: m.counts.by_tier,
      generated_at: m.generated_at,
      manifest_path: MANIFEST_PATH,
    };
  }

  /**
   * Per-(brand, domain) recommendation list — what should an employee see
   * when they pick "Hurco" + "mill" on the PPG page? Returns top-tier
   * matches preferring PRISM ENHANCED, then vanilla.
   */
  recommend(brand: string, domain: string, options?: { limit?: number; includeVanilla?: boolean }): PostEntry[] {
    const limit = options?.limit ?? 5;
    const includeVanilla = options?.includeVanilla ?? true;
    const m = this.loadManifest();
    const lower = brand.toLowerCase();
    const enhanced = m.entries.filter(
      (e) => e.tier === "prism-enhanced" && e.brand.toLowerCase() === lower && e.domain === domain,
    );
    if (enhanced.length >= limit) return enhanced.slice(0, limit);
    if (!includeVanilla) return enhanced;
    const vanilla = m.entries.filter(
      (e) => e.tier === "vanilla" && e.brand.toLowerCase() === lower && e.domain === domain,
    );
    return [...enhanced, ...vanilla].slice(0, limit);
  }

  /**
   * Force-reload the manifest. Call after `node scripts/post-processor-consolidate.mjs`.
   */
  refresh(): PostLibraryManifest {
    this.cachedManifest = null;
    this.cachedAt = 0;
    return this.loadManifest();
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private loadManifest(): PostLibraryManifest {
    const now = Date.now();
    if (this.cachedManifest && now - this.cachedAt < PostLibraryEngine.CACHE_TTL_MS) {
      return this.cachedManifest;
    }
    if (!existsSync(MANIFEST_PATH)) {
      throw new Error(
        `PostLibraryEngine: manifest not found at ${MANIFEST_PATH}. ` +
        `Run: node scripts/post-processor-consolidate.mjs`,
      );
    }
    const raw = readFileSync(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as PostLibraryManifest;
    this.cachedManifest = parsed;
    this.cachedAt = now;
    return parsed;
  }
}

export const postLibraryEngine = new PostLibraryEngine();
