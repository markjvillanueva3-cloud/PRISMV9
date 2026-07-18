/**
 * PostLibraryCatalogEngine — Searchable post processor catalog
 *
 * Indexes all available post processors (180+ Fusion 360 CPS posts +
 * PRISM-native posts) into a searchable, faceted catalog:
 *
 *   - Faceted search by: manufacturer, controller family, machine type, capabilities
 *   - Full-text search across post descriptions and property names
 *   - Compatibility scoring: how well a post matches a target machine profile
 *   - Post detail retrieval with full property listing
 *
 * Data sources:
 *   - CpsPostParserEngine output (180+ CPS files → properties)
 *   - ControllerDialectEngine (24+ dialects → feature sets)
 *   - MachinePostCrossRefEngine (machine → post mapping)
 *
 * Scoring algorithm:
 *   Controller match: 40 pts (exact) / 20 pts (same family) / 0 pts (different)
 *   Axis match: 20 pts (exact) / 10 pts (compatible)
 *   Feature overlap: up to 20 pts (each shared feature = pts / total_features)
 *   Vendor match: 10 pts (same manufacturer)
 *   Recency: 10 pts (recent CPS version / PRISM-native)
 *   Total: 0-100 compatibility score
 *
 * @module engines/PostLibraryCatalogEngine
 * @version 1.0.0
 */

import type { ControllerFamily, MachineContext } from "./PostProcessorPipelineEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export type PostSource = "cps" | "prism_native" | "community";
export type MachineType = "mill" | "lathe" | "mill_turn" | "swiss" | "wire_edm" | "sinker_edm" | "laser" | "waterjet" | "5axis";

export interface PostCatalogEntry {
  /** Unique post identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Post source */
  source: PostSource;
  /** Manufacturer / vendor */
  vendor: string;
  /** Controller family */
  controller: ControllerFamily;
  /** Controller variant (e.g., "840D sl", "31i-B") */
  controller_variant?: string;
  /** Machine type(s) this post supports */
  machine_types: MachineType[];
  /** Axis count (3, 4, or 5) */
  axes: number;
  /** Capabilities / features */
  capabilities: string[];
  /** Version or revision */
  version?: string;
  /** File path (CPS) or engine reference (PRISM native) */
  file_ref?: string;
  /** Tags for search */
  tags: string[];
}

export interface CatalogSearchQuery {
  /** Free text search */
  text?: string;
  /** Filter by manufacturer */
  vendor?: string;
  /** Filter by controller family */
  controller?: ControllerFamily;
  /** Filter by machine type */
  machine_type?: MachineType;
  /** Filter by capability */
  capability?: string;
  /** Filter by axis count */
  axes?: number;
  /** Filter by source */
  source?: PostSource;
  /** Maximum results */
  limit?: number;
}

export interface CompatibilityScore {
  /** Total score 0-100 */
  total: number;
  /** Breakdown */
  controller_pts: number;
  axis_pts: number;
  feature_pts: number;
  vendor_pts: number;
  recency_pts: number;
  /** Explanation */
  explanation: string[];
}

export interface CatalogSearchResult {
  /** Matching posts */
  posts: Array<PostCatalogEntry & { score?: CompatibilityScore }>;
  /** Total matching before limit */
  total_matches: number;
  /** Facet counts for UI */
  facets: {
    vendors: Record<string, number>;
    controllers: Record<string, number>;
    machine_types: Record<string, number>;
    sources: Record<string, number>;
  };
}

export interface CatalogInput {
  action: "search" | "detail" | "compatibility" | "list_facets";
  /** Search query (for search action) */
  query?: CatalogSearchQuery;
  /** Post ID (for detail action) */
  post_id?: string;
  /** Target machine (for compatibility scoring) */
  machine?: MachineContext;
}

// ─── Built-in Catalog ───────────────────────────────────────────────
// Seed catalog with known post processors. In production, this is
// augmented by CpsBatchIngestionEngine output and user uploads.

const SEED_CATALOG: PostCatalogEntry[] = [
  // Fanuc family
  { id: "fanuc-generic-3ax", name: "Fanuc Generic 3-Axis Mill", description: "Standard Fanuc 3-axis milling post with G43 TLO and M06 tool change", source: "prism_native", vendor: "Fanuc", controller: "fanuc", machine_types: ["mill"], axes: 3, capabilities: ["tool_length_comp", "cutter_comp", "rigid_tapping", "subprograms"], tags: ["fanuc", "mill", "3-axis", "generic"], version: "1.0" },
  { id: "fanuc-5ax-tcp", name: "Fanuc 5-Axis with TCP", description: "Fanuc 31i/32i 5-axis with RTCP and tilted work plane support", source: "prism_native", vendor: "Fanuc", controller: "fanuc", machine_types: ["5axis", "mill"], axes: 5, capabilities: ["tcp", "tilted_workplane", "tool_length_comp", "cutter_comp", "hsm", "subprograms"], tags: ["fanuc", "5-axis", "tcp", "rtcp"], version: "1.0" },
  { id: "fanuc-lathe", name: "Fanuc Turning Post", description: "Fanuc 0i/30i turning post with G96/G97, TNRC, threading cycles", source: "prism_native", vendor: "Fanuc", controller: "fanuc", machine_types: ["lathe"], axes: 3, capabilities: ["css", "tnrc", "threading", "drilling_canned", "subprograms"], tags: ["fanuc", "lathe", "turning"], version: "1.0" },
  // Siemens family
  { id: "siemens-840d-3ax", name: "Siemens 840D 3-Axis Mill", description: "Siemens SINUMERIK 840D sl 3-axis milling with CYCLE832 smoothing", source: "prism_native", vendor: "Siemens", controller: "siemens", machine_types: ["mill"], axes: 3, capabilities: ["smoothing", "tool_length_comp", "cutter_comp", "rigid_tapping", "subprograms"], tags: ["siemens", "840d", "mill", "3-axis"], version: "1.0" },
  { id: "siemens-840d-5ax", name: "Siemens 840D 5-Axis", description: "Siemens 840D sl 5-axis with TRAORI and CYCLE800 swivel", source: "prism_native", vendor: "Siemens", controller: "siemens", machine_types: ["5axis", "mill"], axes: 5, capabilities: ["tcp", "traori", "swivel", "smoothing", "tool_length_comp", "hsm", "subprograms"], tags: ["siemens", "840d", "5-axis", "traori"], version: "1.0" },
  { id: "siemens-turning", name: "Siemens Turning Post", description: "Siemens 840D turning with CYCLE95/CYCLE97 and constant surface speed", source: "prism_native", vendor: "Siemens", controller: "siemens", machine_types: ["lathe"], axes: 3, capabilities: ["css", "tnrc", "threading", "canned_cycles", "subprograms"], tags: ["siemens", "turning", "lathe"], version: "1.0" },
  // Haas
  { id: "haas-ngc-mill", name: "Haas NGC Mill", description: "Haas Next Generation Control mill post with M130 subprograms and WIPS probing", source: "prism_native", vendor: "Haas", controller: "haas", machine_types: ["mill"], axes: 3, capabilities: ["probing", "tool_length_comp", "cutter_comp", "rigid_tapping", "subprograms", "visual_programming"], tags: ["haas", "ngc", "mill"], version: "1.0" },
  { id: "haas-5ax", name: "Haas UMC 5-Axis", description: "Haas UMC 500/750 5-axis with DWO and TCPC", source: "prism_native", vendor: "Haas", controller: "haas", machine_types: ["5axis", "mill"], axes: 5, capabilities: ["dwo", "tcpc", "probing", "tool_length_comp", "hsm", "subprograms"], tags: ["haas", "umc", "5-axis", "dwo"], version: "1.0" },
  { id: "haas-lathe", name: "Haas Lathe Post", description: "Haas ST/DS series turning with live tooling support", source: "prism_native", vendor: "Haas", controller: "haas", machine_types: ["lathe"], axes: 3, capabilities: ["css", "tnrc", "threading", "live_tooling", "subprograms"], tags: ["haas", "lathe", "turning", "st-series"], version: "1.0" },
  // Mazak
  { id: "mazak-smooth-mill", name: "Mazak SmoothG Mill", description: "Mazak Smooth G/Ai mill with intelligent machining functions", source: "prism_native", vendor: "Mazak", controller: "mazak", machine_types: ["mill"], axes: 3, capabilities: ["smooth_ai", "tool_length_comp", "cutter_comp", "rigid_tapping", "subprograms"], tags: ["mazak", "smooth", "mill"], version: "1.0" },
  { id: "mazak-integrex", name: "Mazak Integrex Mill-Turn", description: "Mazak Integrex i-series mill-turn with B-axis and second spindle", source: "prism_native", vendor: "Mazak", controller: "mazak", machine_types: ["mill_turn", "lathe", "mill"], axes: 5, capabilities: ["css", "live_tooling", "second_spindle", "b_axis", "subprograms", "sync_machining"], tags: ["mazak", "integrex", "mill-turn", "multi-axis"], version: "1.0" },
  // Okuma
  { id: "okuma-osp-mill", name: "Okuma OSP Mill", description: "Okuma OSP-P300 mill post with Machining Navi and collision avoidance", source: "prism_native", vendor: "Okuma", controller: "okuma", machine_types: ["mill"], axes: 3, capabilities: ["collision_avoidance", "machining_navi", "tool_length_comp", "subprograms"], tags: ["okuma", "osp", "mill"], version: "1.0" },
  { id: "okuma-lathe", name: "Okuma OSP Lathe", description: "Okuma OSP turning post with LB/LU series support", source: "prism_native", vendor: "Okuma", controller: "okuma", machine_types: ["lathe"], axes: 3, capabilities: ["css", "tnrc", "threading", "subprograms"], tags: ["okuma", "osp", "lathe", "turning"], version: "1.0" },
  // Heidenhain
  { id: "heidenhain-tnc640-mill", name: "Heidenhain TNC 640 Mill", description: "Heidenhain TNC 640 conversational + ISO mill post with AFC and KinematicsOpt", source: "prism_native", vendor: "Heidenhain", controller: "heidenhain", machine_types: ["mill", "5axis"], axes: 5, capabilities: ["afc", "kinematics_opt", "tcp", "smoothing", "probing", "subprograms"], tags: ["heidenhain", "tnc640", "mill", "5-axis"], version: "1.0" },
  // Brother
  { id: "brother-speedio", name: "Brother Speedio Compact Mill", description: "Brother Speedio S/M/W series compact machining center", source: "prism_native", vendor: "Brother", controller: "brother", machine_types: ["mill"], axes: 3, capabilities: ["high_speed_tapping", "tool_length_comp", "subprograms"], tags: ["brother", "speedio", "compact", "mill"], version: "1.0" },
  // Doosan
  { id: "doosan-fanuc-mill", name: "Doosan Mill (Fanuc)", description: "Doosan DNM/DVF series with Fanuc 0i-Plus control", source: "prism_native", vendor: "Doosan", controller: "fanuc", machine_types: ["mill"], axes: 3, capabilities: ["tool_length_comp", "cutter_comp", "rigid_tapping", "subprograms"], tags: ["doosan", "dnm", "mill", "fanuc"], version: "1.0" },
  // Hurco
  { id: "hurco-max5-mill", name: "Hurco MAX5 Mill", description: "Hurco WinMax conversational + NC mill post with UltiMotion", source: "prism_native", vendor: "Hurco", controller: "hurco", machine_types: ["mill"], axes: 3, capabilities: ["ultimotion", "conversational", "tool_length_comp", "subprograms"], tags: ["hurco", "max5", "mill", "winmax"], version: "1.0" },
  // EDM
  { id: "fanuc-robocut-wedm", name: "Fanuc Robocut Wire EDM", description: "Fanuc ROBOcut wire EDM post with taper and skim pass support", source: "prism_native", vendor: "Fanuc", controller: "fanuc", machine_types: ["wire_edm"], axes: 4, capabilities: ["taper", "skim_passes", "threading", "submerged_cutting"], tags: ["fanuc", "robocut", "wire-edm"], version: "1.0" },
  { id: "sodick-wedm", name: "Sodick Wire EDM", description: "Sodick LN/AQ/AG series wire EDM with SVC power supply", source: "prism_native", vendor: "Sodick", controller: "fanuc", machine_types: ["wire_edm"], axes: 4, capabilities: ["svc_power", "taper", "skim_passes", "auto_threading"], tags: ["sodick", "wire-edm", "svc"], version: "1.0" },
];

// ─── Engine ─────────────────────────────────────────────────────────

class PostLibraryCatalogEngineImpl {
  private catalog: PostCatalogEntry[] = [...SEED_CATALOG];

  /**
   * Process a catalog request.
   */
  async process(input: CatalogInput): Promise<CatalogSearchResult | PostCatalogEntry | { facets: CatalogSearchResult["facets"] }> {
    switch (input.action) {
      case "search":
        return this.search(input.query ?? {}, input.machine);
      case "detail":
        return this.getDetail(input.post_id ?? "");
      case "compatibility":
        return this.searchWithCompatibility(input.query ?? {}, input.machine!);
      case "list_facets":
        return { facets: this.buildFacets(this.catalog) };
      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  }

  /**
   * Register additional posts (from CPS ingestion or user uploads).
   */
  addPosts(posts: PostCatalogEntry[]): void {
    for (const p of posts) {
      if (!this.catalog.find(e => e.id === p.id)) {
        this.catalog.push(p);
      }
    }
  }

  private search(query: CatalogSearchQuery, machine?: MachineContext): CatalogSearchResult {
    let results = [...this.catalog];

    // Apply filters
    if (query.vendor) {
      const v = query.vendor.toLowerCase();
      results = results.filter(p => p.vendor.toLowerCase().includes(v));
    }
    if (query.controller) {
      results = results.filter(p => p.controller === query.controller);
    }
    if (query.machine_type) {
      results = results.filter(p => p.machine_types.includes(query.machine_type!));
    }
    if (query.capability) {
      const cap = query.capability.toLowerCase();
      results = results.filter(p => p.capabilities.some(c => c.toLowerCase().includes(cap)));
    }
    if (query.axes) {
      results = results.filter(p => p.axes >= query.axes!);
    }
    if (query.source) {
      results = results.filter(p => p.source === query.source);
    }

    // Full-text search
    if (query.text) {
      const terms = query.text.toLowerCase().split(/\s+/);
      results = results.filter(p => {
        const haystack = [p.name, p.description, p.vendor, ...p.tags, ...p.capabilities].join(" ").toLowerCase();
        return terms.every(t => haystack.includes(t));
      });
    }

    const totalMatches = results.length;

    // Score against machine if provided
    let scored: Array<PostCatalogEntry & { score?: CompatibilityScore }> = results;
    if (machine) {
      scored = results.map(p => ({ ...p, score: this.computeCompatibility(p, machine) }));
      scored.sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0));
    }

    // Apply limit
    const limit = query.limit ?? 50;
    scored = scored.slice(0, limit);

    return {
      posts: scored,
      total_matches: totalMatches,
      facets: this.buildFacets(results),
    };
  }

  private searchWithCompatibility(query: CatalogSearchQuery, machine: MachineContext): CatalogSearchResult {
    return this.search(query, machine);
  }

  private getDetail(postId: string): PostCatalogEntry {
    const entry = this.catalog.find(p => p.id === postId);
    if (!entry) throw new Error(`Post not found: ${postId}`);
    return entry;
  }

  /**
   * Compute compatibility score between a post and a target machine.
   *
   * Scoring: controller=40, axes=20, features=20, vendor=10, recency=10 → max 100
   */
  private computeCompatibility(post: PostCatalogEntry, machine: MachineContext): CompatibilityScore {
    const explanation: string[] = [];
    let controllerPts = 0;
    let axisPts = 0;
    let featurePts = 0;
    let vendorPts = 0;
    let recencyPts = 0;

    // Controller match (40 pts)
    if (post.controller === machine.controller) {
      controllerPts = 40;
      explanation.push("Controller: exact match (+40)");
    } else {
      // Same broad family? (e.g., both Fanuc-based)
      const fanucLike = ["fanuc", "haas", "brother", "doosan"];
      if (fanucLike.includes(post.controller) && fanucLike.includes(machine.controller)) {
        controllerPts = 20;
        explanation.push("Controller: compatible Fanuc-family (+20)");
      } else {
        explanation.push("Controller: mismatch (+0)");
      }
    }

    // Axis match (20 pts)
    if (post.axes === machine.axes) {
      axisPts = 20;
      explanation.push(`Axes: exact match ${post.axes}-axis (+20)`);
    } else if (post.axes >= machine.axes) {
      axisPts = 10;
      explanation.push(`Axes: post supports ${post.axes}, machine has ${machine.axes} (+10)`);
    } else {
      explanation.push(`Axes: post ${post.axes}-axis < machine ${machine.axes}-axis (+0)`);
    }

    // Feature overlap (20 pts)
    const machineFeatures: string[] = [];
    if (machine.coolant_types?.includes("tsc")) machineFeatures.push("tsc");
    if (machine.coolant_types?.includes("flood")) machineFeatures.push("flood_coolant");
    if (machine.axes >= 5) machineFeatures.push("tcp");
    if (machine.atc_capacity && machine.atc_capacity > 0) machineFeatures.push("tool_change");

    if (machineFeatures.length > 0) {
      const overlap = machineFeatures.filter(f =>
        post.capabilities.some(c => c.toLowerCase().includes(f.toLowerCase()))
      ).length;
      featurePts = Math.round((overlap / machineFeatures.length) * 20);
      explanation.push(`Features: ${overlap}/${machineFeatures.length} overlap (+${featurePts})`);
    } else {
      featurePts = 10; // No features to compare, give partial credit
      explanation.push("Features: no machine features to compare (+10)");
    }

    // Vendor match (10 pts)
    if (post.vendor.toLowerCase() === machine.brand.toLowerCase()) {
      vendorPts = 10;
      explanation.push(`Vendor: ${post.vendor} matches machine brand (+10)`);
    } else {
      explanation.push(`Vendor: ${post.vendor} ≠ ${machine.brand} (+0)`);
    }

    // Recency (10 pts) — PRISM native gets full, CPS gets partial
    if (post.source === "prism_native") {
      recencyPts = 10;
      explanation.push("Source: PRISM native (+10)");
    } else if (post.source === "cps") {
      recencyPts = 5;
      explanation.push("Source: CPS (+5)");
    } else {
      recencyPts = 3;
      explanation.push("Source: community (+3)");
    }

    return {
      total: controllerPts + axisPts + featurePts + vendorPts + recencyPts,
      controller_pts: controllerPts,
      axis_pts: axisPts,
      feature_pts: featurePts,
      vendor_pts: vendorPts,
      recency_pts: recencyPts,
      explanation,
    };
  }

  private buildFacets(posts: PostCatalogEntry[]): CatalogSearchResult["facets"] {
    const vendors: Record<string, number> = {};
    const controllers: Record<string, number> = {};
    const machineTypes: Record<string, number> = {};
    const sources: Record<string, number> = {};

    for (const p of posts) {
      vendors[p.vendor] = (vendors[p.vendor] ?? 0) + 1;
      controllers[p.controller] = (controllers[p.controller] ?? 0) + 1;
      for (const mt of p.machine_types) {
        machineTypes[mt] = (machineTypes[mt] ?? 0) + 1;
      }
      sources[p.source] = (sources[p.source] ?? 0) + 1;
    }

    return { vendors, controllers, machine_types: machineTypes, sources };
  }
}

/** Singleton export */
export const postLibraryCatalogEngine = new PostLibraryCatalogEngineImpl();
