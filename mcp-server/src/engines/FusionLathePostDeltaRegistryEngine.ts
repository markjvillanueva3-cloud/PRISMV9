/**
 * FusionLathePostDeltaRegistryEngine (E104)
 * ==========================================
 *
 * Registers and catalogs Fusion 360 lathe and mill-turn post processors
 * that are present in resources/FUSION BASIC POSTS but not yet registered
 * in PRISM's post processor system.
 *
 * Scans: resources/FUSION BASIC POSTS/*turning*.cps, *mill-turn*.cps, *st-*.cps
 * Outputs: data/post-processors/lathe-post-registry.json
 *
 * @module engines/FusionLathePostDeltaRegistryEngine
 * @version 1.0.0
 * @milestone MS7 (U-LAT52)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { log } from "../utils/Logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──────────────────────────────────────────────────────────────────

/** Controller family classification */
export type ControllerFamily =
  | "fanuc"
  | "siemens"
  | "haas"
  | "okuma"
  | "mazak"
  | "mitsubishi"
  | "heidenhain"
  | "hurco"
  | "grbl"
  | "pathpilot"
  | "other";

/** Machine type classification */
export type MachineType =
  | "lathe-2-axis"
  | "lathe-y-axis"
  | "lathe-sub-spindle"
  | "lathe-live-tooling"
  | "mill-turn"
  | "vtl"
  | "swiss";

/** Post processor entry in the registry */
export interface LathePostEntry {
  id: string;
  filename: string;
  displayName: string;
  manufacturer: string;
  machineModel?: string;
  machineType: MachineType;
  controllerFamily: ControllerFamily;
  controllerModel?: string;
  capabilities: LathePostCapability[];
  source: "fusion360" | "hsmworks" | "custom";
  sourcePath: string;
  fileSize: number;
  registered: string;  // ISO date
  verified: boolean;
}

/** Capabilities supported by a lathe post */
export type LathePostCapability =
  | "turning"
  | "facing"
  | "grooving"
  | "threading"
  | "drilling"
  | "boring"
  | "tapping"
  | "live-milling"
  | "c-axis"
  | "y-axis"
  | "sub-spindle"
  | "part-transfer"
  | "synchronization"
  | "css"
  | "canned-cycles"
  | "tool-nose-comp"
  | "inspection";

/** Registry schema */
export interface LathePostRegistry {
  schemaVersion: string;
  generated: string;
  postCount: number;
  byManufacturer: Record<string, number>;
  byControllerFamily: Record<string, number>;
  byMachineType: Record<string, number>;
  posts: LathePostEntry[];
}

/** Registration result */
export interface RegistrationResult {
  newPosts: number;
  updatedPosts: number;
  errors: string[];
  registry: LathePostRegistry;
}

// ── Pattern Matching ───────────────────────────────────────────────────────

const MANUFACTURER_PATTERNS: { pattern: RegExp; manufacturer: string }[] = [
  { pattern: /^haas/i, manufacturer: "Haas" },
  { pattern: /^okuma/i, manufacturer: "Okuma" },
  { pattern: /^mazak/i, manufacturer: "Mazak" },
  { pattern: /^doosan/i, manufacturer: "Doosan" },
  { pattern: /^dmg[\s-]?mori/i, manufacturer: "DMG Mori" },
  { pattern: /^siemens/i, manufacturer: "Siemens" },
  { pattern: /^fanuc/i, manufacturer: "Fanuc" },
  { pattern: /^mitsubishi/i, manufacturer: "Mitsubishi" },
  { pattern: /^heidenhain/i, manufacturer: "Heidenhain" },
  { pattern: /^hurco/i, manufacturer: "Hurco" },
  { pattern: /^hwacheon/i, manufacturer: "Hwacheon" },
  { pattern: /^nakamura/i, manufacturer: "Nakamura-Tome" },
  { pattern: /^toshiba/i, manufacturer: "Toshiba" },
  { pattern: /^tormach/i, manufacturer: "Tormach" },
  { pattern: /^grbl/i, manufacturer: "GRBL" },
  { pattern: /^milltronics/i, manufacturer: "Milltronics" },
];

const CONTROLLER_PATTERNS: { pattern: RegExp; family: ControllerFamily; model?: string }[] = [
  { pattern: /fanuc/i, family: "fanuc" },
  { pattern: /siemens[\s-]?840c/i, family: "siemens", model: "840C" },
  { pattern: /siemens/i, family: "siemens" },
  { pattern: /haas/i, family: "haas" },
  { pattern: /okuma|osp/i, family: "okuma" },
  { pattern: /mazak|mazatrol/i, family: "mazak" },
  { pattern: /mitsubishi|meldas/i, family: "mitsubishi" },
  { pattern: /heidenhain/i, family: "heidenhain" },
  { pattern: /hurco|winmax/i, family: "hurco" },
  { pattern: /grbl/i, family: "grbl" },
  { pattern: /pathpilot/i, family: "pathpilot" },
];

const MACHINE_TYPE_PATTERNS: { pattern: RegExp; type: MachineType }[] = [
  { pattern: /mill[\s-]?turn/i, type: "mill-turn" },
  { pattern: /vtl/i, type: "vtl" },
  { pattern: /swiss/i, type: "swiss" },
  { pattern: /ssy|ss\b/i, type: "lathe-sub-spindle" },
  { pattern: /ly\b/i, type: "lathe-live-tooling" },
  { pattern: /[^a-z]y\b/i, type: "lathe-y-axis" },
  { pattern: /turning|st-|lathe/i, type: "lathe-2-axis" },
];

const CAPABILITY_PATTERNS: { pattern: RegExp; capability: LathePostCapability }[] = [
  { pattern: /mill[\s-]?turn|live/i, capability: "live-milling" },
  { pattern: /c[\s-]?axis/i, capability: "c-axis" },
  { pattern: /[^a-z]y[\s-]?axis/i, capability: "y-axis" },
  { pattern: /sub[\s-]?spindle|ss\b/i, capability: "sub-spindle" },
  { pattern: /transfer|handoff/i, capability: "part-transfer" },
  { pattern: /sync/i, capability: "synchronization" },
  { pattern: /inspection|probe/i, capability: "inspection" },
];

// ── Engine Implementation ──────────────────────────────────────────────────

class FusionLathePostDeltaRegistryEngineImpl {
  private fusionPostsDir: string;
  private hsmPostsDir: string;
  private registryPath: string;
  private registry: LathePostRegistry | null = null;

  constructor() {
    this.fusionPostsDir = path.resolve(__dirname, "../../../resources/FUSION BASIC POSTS");
    this.hsmPostsDir = path.resolve(__dirname, "../../../resources/HSMWorks 2026/posts");
    this.registryPath = path.resolve(__dirname, "../../data/post-processors/lathe-post-registry.json");
  }

  /**
   * Extract manufacturer from filename
   */
  private extractManufacturer(filename: string): string {
    for (const { pattern, manufacturer } of MANUFACTURER_PATTERNS) {
      if (pattern.test(filename)) return manufacturer;
    }
    return "Generic";
  }

  /**
   * Extract controller family from filename
   */
  private extractControllerFamily(filename: string): { family: ControllerFamily; model?: string } {
    for (const { pattern, family, model } of CONTROLLER_PATTERNS) {
      if (pattern.test(filename)) return { family, model };
    }
    return { family: "other" };
  }

  /**
   * Extract machine type from filename
   */
  private extractMachineType(filename: string): MachineType {
    for (const { pattern, type } of MACHINE_TYPE_PATTERNS) {
      if (pattern.test(filename)) return type;
    }
    return "lathe-2-axis";
  }

  /**
   * Extract machine model from filename (e.g., "st-20y" → "ST-20Y")
   */
  private extractMachineModel(filename: string): string | undefined {
    // Haas ST series
    const haasMatch = filename.match(/st-(\d+[lsy]*)/i);
    if (haasMatch) return `ST-${haasMatch[1].toUpperCase()}`;

    // Okuma LB series
    const okumaMatch = filename.match(/lb[\s-]?(\d+)/i);
    if (okumaMatch) return `LB-${okumaMatch[1]}`;

    // DMG NLX
    const dmgMatch = filename.match(/nlx/i);
    if (dmgMatch) return "NLX";

    return undefined;
  }

  /**
   * Infer capabilities from filename and machine type
   */
  private inferCapabilities(filename: string, machineType: MachineType): LathePostCapability[] {
    const caps: LathePostCapability[] = ["turning", "facing", "css", "canned-cycles", "tool-nose-comp"];

    // Always have threading, grooving, drilling for lathes
    caps.push("threading", "grooving", "drilling", "boring");

    // Check filename patterns
    for (const { pattern, capability } of CAPABILITY_PATTERNS) {
      if (pattern.test(filename) && !caps.includes(capability)) {
        caps.push(capability);
      }
    }

    // Machine type implies certain capabilities
    switch (machineType) {
      case "mill-turn":
        if (!caps.includes("live-milling")) caps.push("live-milling");
        if (!caps.includes("c-axis")) caps.push("c-axis");
        break;
      case "lathe-live-tooling":
        if (!caps.includes("live-milling")) caps.push("live-milling");
        if (!caps.includes("c-axis")) caps.push("c-axis");
        break;
      case "lathe-y-axis":
        if (!caps.includes("y-axis")) caps.push("y-axis");
        if (!caps.includes("live-milling")) caps.push("live-milling");
        break;
      case "lathe-sub-spindle":
        if (!caps.includes("sub-spindle")) caps.push("sub-spindle");
        if (!caps.includes("part-transfer")) caps.push("part-transfer");
        break;
    }

    // Y-axis posts often have live tooling
    if (filename.match(/ly\b/i)) {
      if (!caps.includes("live-milling")) caps.push("live-milling");
      if (!caps.includes("y-axis")) caps.push("y-axis");
    }

    return caps;
  }

  /**
   * Generate display name from filename
   */
  private generateDisplayName(filename: string): string {
    const base = filename.replace(/\.cps$/, "");
    return base
      .split(/[\s-]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Generate unique ID from filename
   */
  private generateId(filename: string): string {
    const base = filename.replace(/\.cps$/, "");
    return `fusion-lathe-${base.replace(/\s+/g, "-").toLowerCase()}`;
  }

  /**
   * Scan directory for lathe/mill-turn posts
   */
  private scanDirectory(dir: string, source: "fusion360" | "hsmworks"): LathePostEntry[] {
    const entries: LathePostEntry[] = [];

    if (!fs.existsSync(dir)) {
      log.warn(`Post directory not found: ${dir}`);
      return entries;
    }

    const files = fs.readdirSync(dir);
    const lathePatterns = [/turning/i, /mill-turn/i, /st-\d+/i, /lathe/i, /vtl/i];

    for (const file of files) {
      if (!file.endsWith(".cps")) continue;

      // Check if this is a lathe-related post
      const isLathe = lathePatterns.some((p) => p.test(file));
      if (!isLathe) continue;

      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const { family, model } = this.extractControllerFamily(file);
      const machineType = this.extractMachineType(file);

      const entry: LathePostEntry = {
        id: this.generateId(file),
        filename: file,
        displayName: this.generateDisplayName(file),
        manufacturer: this.extractManufacturer(file),
        machineModel: this.extractMachineModel(file),
        machineType,
        controllerFamily: family,
        controllerModel: model,
        capabilities: this.inferCapabilities(file, machineType),
        source,
        sourcePath: filePath,
        fileSize: stats.size,
        registered: new Date().toISOString().split("T")[0],
        verified: false,
      };

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Build registry statistics
   */
  private buildStats(posts: LathePostEntry[]): Pick<LathePostRegistry, "byManufacturer" | "byControllerFamily" | "byMachineType"> {
    const byManufacturer: Record<string, number> = {};
    const byControllerFamily: Record<string, number> = {};
    const byMachineType: Record<string, number> = {};

    for (const post of posts) {
      byManufacturer[post.manufacturer] = (byManufacturer[post.manufacturer] || 0) + 1;
      byControllerFamily[post.controllerFamily] = (byControllerFamily[post.controllerFamily] || 0) + 1;
      byMachineType[post.machineType] = (byMachineType[post.machineType] || 0) + 1;
    }

    return { byManufacturer, byControllerFamily, byMachineType };
  }

  /**
   * Scan all directories and register posts
   */
  scanAndRegister(): RegistrationResult {
    const errors: string[] = [];
    let newPosts = 0;
    let updatedPosts = 0;

    // Load existing registry
    let existingPosts: Map<string, LathePostEntry> = new Map();
    if (fs.existsSync(this.registryPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(this.registryPath, "utf8")) as LathePostRegistry;
        for (const post of existing.posts) {
          existingPosts.set(post.id, post);
        }
      } catch (err) {
        errors.push(`Failed to load existing registry: ${err}`);
      }
    }

    // Scan directories
    const fusionPosts = this.scanDirectory(this.fusionPostsDir, "fusion360");
    const hsmPosts = this.scanDirectory(this.hsmPostsDir, "hsmworks");
    const allPosts = [...fusionPosts, ...hsmPosts];

    // Merge with existing
    const mergedPosts: LathePostEntry[] = [];
    for (const post of allPosts) {
      const existing = existingPosts.get(post.id);
      if (existing) {
        // Update with new data but preserve verification status
        mergedPosts.push({ ...post, verified: existing.verified });
        updatedPosts++;
      } else {
        mergedPosts.push(post);
        newPosts++;
      }
    }

    // Sort by manufacturer then model
    mergedPosts.sort((a, b) => {
      const mfgCompare = a.manufacturer.localeCompare(b.manufacturer);
      if (mfgCompare !== 0) return mfgCompare;
      return (a.machineModel || "").localeCompare(b.machineModel || "");
    });

    // Build registry
    const stats = this.buildStats(mergedPosts);
    const registry: LathePostRegistry = {
      schemaVersion: "1.0.0",
      generated: new Date().toISOString(),
      postCount: mergedPosts.length,
      ...stats,
      posts: mergedPosts,
    };

    this.registry = registry;

    log.info(`Lathe post registry built: ${mergedPosts.length} posts (${newPosts} new, ${updatedPosts} updated)`);

    return { newPosts, updatedPosts, errors, registry };
  }

  /**
   * Save registry to disk
   */
  saveRegistry(): void {
    if (!this.registry) {
      throw new Error("No registry to save. Call scanAndRegister() first.");
    }

    // Ensure directory exists
    const dir = path.dirname(this.registryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
    log.info(`Lathe post registry saved to ${this.registryPath}`);
  }

  /**
   * Get current registry (load if not in memory)
   */
  getRegistry(): LathePostRegistry {
    if (this.registry) return this.registry;

    if (fs.existsSync(this.registryPath)) {
      this.registry = JSON.parse(fs.readFileSync(this.registryPath, "utf8"));
      return this.registry!;
    }

    // Build fresh registry
    const result = this.scanAndRegister();
    return result.registry;
  }

  /**
   * Lookup a post by various criteria
   */
  lookupPost(query: {
    manufacturer?: string;
    controllerFamily?: ControllerFamily;
    machineModel?: string;
    machineType?: MachineType;
    capability?: LathePostCapability;
  }): LathePostEntry[] {
    const registry = this.getRegistry();
    let results = [...registry.posts];

    if (query.manufacturer) {
      results = results.filter((p) =>
        p.manufacturer.toLowerCase().includes(query.manufacturer!.toLowerCase())
      );
    }

    if (query.controllerFamily) {
      results = results.filter((p) => p.controllerFamily === query.controllerFamily);
    }

    if (query.machineModel) {
      results = results.filter((p) =>
        p.machineModel?.toLowerCase().includes(query.machineModel!.toLowerCase())
      );
    }

    if (query.machineType) {
      results = results.filter((p) => p.machineType === query.machineType);
    }

    if (query.capability) {
      results = results.filter((p) => p.capabilities.includes(query.capability!));
    }

    return results;
  }

  /**
   * Get posts by manufacturer
   */
  getPostsByManufacturer(manufacturer: string): LathePostEntry[] {
    return this.lookupPost({ manufacturer });
  }

  /**
   * Get posts by controller family
   */
  getPostsByController(family: ControllerFamily): LathePostEntry[] {
    return this.lookupPost({ controllerFamily: family });
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalPosts: number;
    byManufacturer: Record<string, number>;
    byControllerFamily: Record<string, number>;
    byMachineType: Record<string, number>;
    verifiedCount: number;
  } {
    const registry = this.getRegistry();
    const verifiedCount = registry.posts.filter((p) => p.verified).length;

    return {
      totalPosts: registry.postCount,
      byManufacturer: registry.byManufacturer,
      byControllerFamily: registry.byControllerFamily,
      byMachineType: registry.byMachineType,
      verifiedCount,
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const fusionLathePostDeltaRegistryEngine = new FusionLathePostDeltaRegistryEngineImpl();
export type { FusionLathePostDeltaRegistryEngineImpl };
