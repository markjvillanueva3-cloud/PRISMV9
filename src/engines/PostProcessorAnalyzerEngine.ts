/**
 * PostProcessorAnalyzerEngine — Analyze Fusion 360 Post Processor .cps Files
 *
 * Parses .cps (Cloud Post Script / JavaScript) files from the Fusion POST
 * PROCESSORS folder. Extracts controller target, post version, supported
 * cycles, custom modifications, and output format rules.
 *
 * .cps files are JavaScript with specific Autodesk/HSM post processor API calls.
 * Key patterns to extract:
 *   - description/vendor/model/certificationLevel in the header properties
 *   - onCycle*() handlers indicate supported canned cycles
 *   - onLinear/onCircular/onRapid/onCommand indicate motion capabilities
 *   - custom functions and property modifications indicate shop customizations
 *
 * @module PostProcessorAnalyzerEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface PostProcessorInfo {
  file_path: string;
  filename: string;
  description: string | null;
  vendor: string | null;
  model: string | null;
  controller: string | null;
  certification_level: number | null;
  version: string | null;
  file_extension: string | null;
  supported_cycles: string[];
  motion_handlers: string[];
  custom_properties: PostProperty[];
  has_multi_axis: boolean;
  has_turning: boolean;
  has_milling: boolean;
  has_probing: boolean;
  line_count: number;
  size_bytes: number;
}

export interface PostProperty {
  name: string;
  type: string;
  default_value: string | null;
  description: string | null;
}

export interface PostAnalysisSummary {
  total_posts: number;
  by_controller: Record<string, number>;
  by_capability: Record<string, number>;
  posts: PostProcessorInfo[];
  scan_duration_ms: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PostProcessorAnalyzerEngine {
  /**
   * Analyze all .cps files in a directory.
   */
  analyzeDirectory(dirPath: string): PostAnalysisSummary {
    const start = Date.now();
    const posts: PostProcessorInfo[] = [];

    if (!fs.existsSync(dirPath)) {
      return { total_posts: 0, by_controller: {}, by_capability: {}, posts: [], scan_duration_ms: 0 };
    }

    this._walkForCps(dirPath, posts, 0, 5);

    const byController: Record<string, number> = {};
    const byCapability: Record<string, number> = { milling: 0, turning: 0, multi_axis: 0, probing: 0 };

    for (const post of posts) {
      const ctrl = post.controller ?? post.vendor ?? "unknown";
      byController[ctrl] = (byController[ctrl] ?? 0) + 1;
      if (post.has_milling) byCapability.milling++;
      if (post.has_turning) byCapability.turning++;
      if (post.has_multi_axis) byCapability.multi_axis++;
      if (post.has_probing) byCapability.probing++;
    }

    return {
      total_posts: posts.length,
      by_controller: byController,
      by_capability: byCapability,
      posts,
      scan_duration_ms: Date.now() - start,
    };
  }

  /**
   * Analyze a single .cps file.
   */
  analyzeFile(filePath: string): PostProcessorInfo | null {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const stat = fs.statSync(filePath);
      return this._parseCps(content, filePath, stat.size);
    } catch (err) {
      log.warn(`PostProcessorAnalyzer: Cannot read ${filePath}: ${(err as Error).message}`);
      return null;
    }
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _walkForCps(dirPath: string, posts: PostProcessorInfo[], depth: number, maxDepth: number): void {
    if (depth > maxDepth) return;

    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        this._walkForCps(fullPath, posts, depth + 1, maxDepth);
        continue;
      }

      if (!item.isFile() || !item.name.toLowerCase().endsWith(".cps")) continue;

      const info = this.analyzeFile(fullPath);
      if (info) posts.push(info);
    }
  }

  private _parseCps(content: string, filePath: string, sizeBytes: number): PostProcessorInfo {
    const lines = content.split(/\r?\n/);
    const info: PostProcessorInfo = {
      file_path: filePath,
      filename: path.basename(filePath),
      description: null,
      vendor: null,
      model: null,
      controller: null,
      certification_level: null,
      version: null,
      file_extension: null,
      supported_cycles: [],
      motion_handlers: [],
      custom_properties: [],
      has_multi_axis: false,
      has_turning: false,
      has_milling: false,
      has_probing: false,
      line_count: lines.length,
      size_bytes: sizeBytes,
    };

    // Extract header properties
    this._extractProperties(content, info);

    // Extract supported cycles from onCycle* handlers
    this._extractCycles(content, info);

    // Extract motion handlers
    this._extractMotionHandlers(content, info);

    // Extract custom properties
    this._extractCustomProperties(content, info);

    // Detect capabilities
    info.has_milling = content.includes("onLinear") || content.includes("onCircular");
    info.has_turning = content.includes("onCycleTurning") || content.includes("TURNING") ||
      content.includes("G96") || content.includes("CSS");
    info.has_multi_axis = content.includes("onLinear5D") || content.includes("onRewindMachine") ||
      content.includes("TCP") || content.includes("G43.4") || content.includes("G43.5");
    info.has_probing = content.includes("onProbing") || content.includes("PROBING") ||
      content.includes("P9811") || content.includes("CYCLE977") || content.includes("G65");

    return info;
  }

  private _extractProperties(content: string, info: PostProcessorInfo): void {
    // description = "..." pattern
    const descMatch = content.match(/description\s*=\s*"([^"]+)"/);
    if (descMatch) info.description = descMatch[1];

    // vendor = "..."
    const vendorMatch = content.match(/vendor\s*=\s*"([^"]+)"/);
    if (vendorMatch) info.vendor = vendorMatch[1];

    // model = "..."
    const modelMatch = content.match(/(?:^|\s)model\s*=\s*"([^"]+)"/);
    if (modelMatch) info.model = modelMatch[1];

    // certificationLevel = N
    const certMatch = content.match(/certificationLevel\s*=\s*(\d+)/);
    if (certMatch) info.certification_level = parseInt(certMatch[1], 10);

    // extension = "..."
    const extMatch = content.match(/extension\s*=\s*"([^"]+)"/);
    if (extMatch) info.file_extension = extMatch[1];

    // version (various patterns)
    const verMatch = content.match(/(?:version|postVersion)\s*[:=]\s*"?(\d[\d.]+)"?/i);
    if (verMatch) info.version = verMatch[1];

    // Controller inference from description/vendor
    const combined = `${info.description ?? ""} ${info.vendor ?? ""} ${info.model ?? ""}`.toUpperCase();
    if (combined.includes("FANUC")) info.controller = "fanuc";
    else if (combined.includes("HAAS")) info.controller = "haas";
    else if (combined.includes("OKUMA") || combined.includes("OSP")) info.controller = "okuma";
    else if (combined.includes("SIEMENS") || combined.includes("SINUMERIK")) info.controller = "siemens";
    else if (combined.includes("HURCO")) info.controller = "hurco";
    else if (combined.includes("MITSUBISHI") || combined.includes("MELDAS")) info.controller = "mitsubishi";
    else if (combined.includes("MAZAK") || combined.includes("MAZATROL")) info.controller = "mazak";
    else if (combined.includes("DMG") || combined.includes("CELOS")) info.controller = "dmg";
    else if (combined.includes("HEIDENHAIN")) info.controller = "heidenhain";
  }

  private _extractCycles(content: string, info: PostProcessorInfo): void {
    // Match onCycle*() function definitions
    const cyclePattern = /function\s+(onCycle\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = cyclePattern.exec(content)) !== null) {
      const cycleName = match[1];
      // Convert to friendly name
      const friendly = cycleName
        .replace("onCycle", "")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .toLowerCase();
      info.supported_cycles.push(friendly);
    }

    // Also detect cycles from case statements
    const casePattern = /case\s+"(CYCLE_\w+)"/g;
    while ((match = casePattern.exec(content)) !== null) {
      const cycleName = match[1].toLowerCase().replace("cycle_", "").replace(/_/g, " ");
      if (!info.supported_cycles.includes(cycleName)) {
        info.supported_cycles.push(cycleName);
      }
    }
  }

  private _extractMotionHandlers(content: string, info: PostProcessorInfo): void {
    const handlers = [
      "onRapid", "onLinear", "onCircular", "onLinear5D", "onRapid5D",
      "onRewindMachine", "onCommand", "onDwell", "onSpindleSpeed",
      "onMovement", "onToolChange", "onSectionEnd",
    ];

    for (const handler of handlers) {
      if (content.includes(`function ${handler}`)) {
        info.motion_handlers.push(handler);
      }
    }
  }

  private _extractCustomProperties(content: string, info: PostProcessorInfo): void {
    // Match createProperty() or properties.* definitions
    const propPattern = /properties\s*\.\s*(\w+)\s*=\s*\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = propPattern.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];

      const typeMatch = body.match(/type\s*:\s*"(\w+)"/);
      const defaultMatch = body.match(/value\s*:\s*([^,}\s]+)/);
      const descMatch = body.match(/description\s*:\s*"([^"]+)"/);

      info.custom_properties.push({
        name,
        type: typeMatch?.[1] ?? "unknown",
        default_value: defaultMatch?.[1] ?? null,
        description: descMatch?.[1] ?? null,
      });
    }
  }
}

export const postProcessorAnalyzerEngine = new PostProcessorAnalyzerEngine();
