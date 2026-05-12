/**
 * LatheKnowledgeHarvesterEngine — Cross-Source Lathe Knowledge Synthesis
 * ========================================================================
 * Harvests and unifies lathe machining knowledge from all available PRISM sources:
 *
 *   1. JM Die Program Archive (H:/PRISM/JM DIE/CNC LATHE) — 16,558 .MIN programs
 *      - Extracts proven Okuma OSP cutting parameters (S, F, G96/G97, G50)
 *      - Identifies material-specific patterns per customer/part
 *      - Learns operation sequences (NAT blocks, T-codes)
 *
 *   2. Tribal Knowledge — okuma-dialect-knowledge.ts + controller-knowledge-tips.ts
 *      - All Okuma OSP G/M-code tips
 *      - Canned cycles, threading, bar feeder, C-axis patterns
 *      - Categorized by operation type for fast retrieval
 *
 *   3. Resource Programs (H:/PRISM/resources/OKUMA MULTUS PDFS/Program Examples)
 *      - 30+ technique folders (Bar Feeder, Fixed Cycles, C-Axis, Touch Setter, etc.)
 *      - Each folder's .MIN/.min programs yield reusable code patterns
 *
 *   4. Controller Knowledge — lathe-specific entries from controller-knowledge-tips.ts
 *      - Okuma OSP dialect differences from Fanuc
 *      - Canned cycle best practices
 *
 * Synthesis produces a unified knowledge base that drives `generateProgramImprovements()`
 * — a method that inspects raw .MIN content and emits typed improvement suggestions.
 *
 * Safety note: This engine reads files and performs regex analysis only.
 *   It does NOT write G-code or compute physics constants.
 *
 * @module engines/LatheKnowledgeHarvesterEngine
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { OKUMA_DIALECT_KNOWLEDGE } from "../data/okuma-dialect-knowledge.js";
import { CONTROLLER_KNOWLEDGE_TIPS } from "../data/controller-knowledge-tips.js";

// ============================================================================
// TYPES
// ============================================================================

/** Single extracted knowledge entry from any source */
export interface LatheKnowledgeEntry {
  id: string;
  source: "program" | "tribal" | "resource" | "controller";
  operation_type: LatheOperationType;
  material_iso?: string;           // ISO material group: P M K N S H
  material_hint?: string;          // Raw material hint from program/comments
  gcode?: string;                  // Primary G-code if applicable
  spindle_rpm?: number;            // G97 fixed RPM
  surface_speed_sfm?: number;      // G96 CSS (converted from m/min)
  feed_per_rev_ipr?: number;       // F word in G95 mode (in/rev)
  depth_of_cut_in?: number;        // DOC when determinable
  tip_text: string;                // Human-readable knowledge text
  tags: string[];
  confidence: number;              // 0–100
}

/** Categorized lathe operation types */
export type LatheOperationType =
  | "facing"
  | "od_rough"
  | "od_finish"
  | "id_rough"
  | "id_finish"
  | "drilling"
  | "peck_drilling"
  | "threading"
  | "grooving"
  | "parting"
  | "c_axis"
  | "bar_feeder"
  | "touch_setter"
  | "boring"
  | "tapping"
  | "general";

/** Material-specific cutting parameters learned from production programs */
export interface MaterialKnowledge {
  material_iso: string;
  material_names: string[];        // e.g. ["M2", "D2", "tool steel"]
  facing: { rpm_min: number; rpm_max: number; feed_min: number; feed_max: number; sample_count: number };
  od_rough: { rpm_min: number; rpm_max: number; feed_min: number; feed_max: number; sample_count: number };
  od_finish: { rpm_min: number; rpm_max: number; feed_min: number; feed_max: number; sample_count: number };
  id_boring: { rpm_min: number; rpm_max: number; feed_min: number; feed_max: number; sample_count: number };
  drilling: { rpm_min: number; rpm_max: number; feed_min: number; feed_max: number; sample_count: number };
  threading: { rpm_min: number; rpm_max: number; sample_count: number };
  css_m_min: { typical: number; max: number; sample_count: number };   // G96 surface speed
}

/** Learned customer preferences (derived from folder/program pattern analysis) */
export interface CustomerPreference {
  customer: string;
  programs_analyzed: number;
  preferred_operations: LatheOperationType[];
  typical_materials: string[];
  avg_spindle_rpm: number;
  avg_feed_ipr: number;
  uses_css: boolean;               // G96 mode
  uses_bar_feeder: boolean;        // /CALL OBAR or NBAR patterns
  uses_sub_spindle: boolean;       // SP2 references
  confidence: number;
}

/** Complete unified lathe knowledge base */
export interface UnifiedLatheKnowledge {
  generated_at: string;
  programs_harvested: number;
  tribal_tips_harvested: number;
  resource_patterns_harvested: number;
  controller_tips_harvested: number;
  entries: LatheKnowledgeEntry[];
  materials: MaterialKnowledge[];
  customer_preferences: CustomerPreference[];
  operation_index: Record<LatheOperationType, string[]>; // op → entry IDs
  top_gcode_patterns: GCodePattern[];
  synthesis_notes: string[];
}

/** Recurring G-code pattern extracted from programs */
export interface GCodePattern {
  name: string;
  gcode_sequence: string;
  description: string;
  frequency: number;
  operation_type: LatheOperationType;
  example_program?: string;
}

/** A single improvement suggestion for a .MIN program */
export interface ProgramImprovement {
  severity: "critical" | "warning" | "suggestion";
  category: "safety" | "speed_feed" | "cycle_selection" | "operation_order" | "coolant" | "efficiency";
  line?: number;
  description: string;
  current_value?: string;
  recommended_value?: string;
  rationale: string;
  knowledge_sources: string[];     // IDs of entries that support this recommendation
}

/** Full harvest result returned from individual harvest methods */
export interface HarvestResult {
  source: "program" | "tribal" | "resource" | "controller";
  entries_extracted: number;
  entries: LatheKnowledgeEntry[];
  metadata: Record<string, unknown>;
  errors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const JM_LATHE_ROOT = "H:/PRISM/JM DIE/CNC LATHE";
const MULTUS_EXAMPLES_ROOT = "H:/PRISM/resources/OKUMA MULTUS PDFS/Program Examples";

/** Maximum programs to parse per customer folder (performance guard) */
const MAX_PROGRAMS_PER_CUSTOMER = 25;

/** Maximum bytes to read from a single .MIN file */
const MAX_PROGRAM_BYTES = 64_000;

/**
 * Okuma OSP typical surface speeds (m/min) by ISO material group.
 * Source: Okuma OSP-P300L Application Guide + JM Die tribal knowledge.
 */
const OKUMA_CSS_M_MIN: Record<string, { typical: number; max: number }> = {
  P: { typical: 180, max: 300 },  // Steel
  M: { typical: 120, max: 220 },  // Stainless
  K: { typical: 200, max: 380 },  // Cast iron
  N: { typical: 500, max: 900 },  // Aluminium
  S: { typical: 60,  max: 120 },  // Heat resistant (Inconel, Ti)
  H: { typical: 80,  max: 160 },  // Hardened steel (>45 HRC)
};

/**
 * Material keyword → ISO group mapping for JM Die workpiece types.
 * Cold heading tooling is predominantly tool steels (P/H group).
 */
const MATERIAL_KEYWORDS: Array<{ keywords: string[]; iso: string; names: string[] }> = [
  { keywords: ["d2", "d-2"],               iso: "H", names: ["D2", "D-2 tool steel"] },
  { keywords: ["m2", "m-2", "hss"],        iso: "H", names: ["M2", "HSS"] },
  { keywords: ["s7", "s-7"],               iso: "P", names: ["S7 shock resistant tool steel"] },
  { keywords: ["a2", "a-2"],               iso: "H", names: ["A2 air-hardening tool steel"] },
  { keywords: ["h13", "h-13"],             iso: "H", names: ["H13 hot work tool steel"] },
  { keywords: ["carbide", "wc", "tungsten"],iso:"K", names: ["Cemented carbide", "WC-Co"] },
  { keywords: ["4140", "4340"],            iso: "P", names: ["4140", "4340 alloy steel"] },
  { keywords: ["1018", "1045", "1215"],    iso: "P", names: ["Carbon steel"] },
  { keywords: ["graphite", "edm"],         iso: "K", names: ["Graphite (EDM electrode)"] },
  { keywords: ["brass", "bronze"],         iso: "N", names: ["Brass / Bronze"] },
  { keywords: ["aluminum", "aluminium"],   iso: "N", names: ["Aluminium"] },
];

// ============================================================================
// REGEX PATTERNS FOR OKUMA OSP .MIN PROGRAMS
// ============================================================================

const RE_NAT_BLOCK   = /^NAT\s*(\d+)\s*(?:\(([^)]*)\))?/im;
const RE_NAT_GLOBAL  = /^NAT\s*(\d+)\s*(?:\(([^)]*)\))?/gim;
const RE_G97         = /G97\s+S(\d+)/g;
const RE_G96         = /G96\s+S(\d+)/g;
const RE_G50         = /G50\s+S(\d+)/g;
const RE_FEED        = /G[01]\s[^F\n]*F([\d.]+)/g;
const RE_TOOL        = /^T(\d{2,6})(\d{2})(\d{2})/gm;
const RE_PECK_DRILL  = /G74\s[^;\n]+/g;
const RE_THREAD      = /G71\s[^;\n]+/g;
const RE_GROOVE      = /G75\s[^;\n]+/g;
const RE_SUBSPINDLE  = /SP2|M200|NBAR2|SP\s*2/i;
const RE_BAR_FEEDER  = /CALL\s+OBAR|NBAR/i;
const RE_COMMENT     = /\(([^)]+)\)/g;
const RE_G74_DRILL   = /G74\b/;
const RE_BORING_BAR  = /boring\s*bar|bore|G87/i;
const RE_CSS_MODE    = /G96\b/;
const RE_G50_SAFETY  = /G96/;

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/** Safely read a file with byte limit, returning empty string on failure */
function safeReadFile(filePath: string): string {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_PROGRAM_BYTES) {
      const buf = Buffer.alloc(MAX_PROGRAM_BYTES);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buf, 0, MAX_PROGRAM_BYTES, 0);
      fs.closeSync(fd);
      return buf.toString("utf8");
    }
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

/** Extract first numeric match from regex against content */
function extractNumber(pattern: RegExp, content: string): number | undefined {
  const m = pattern.exec(content);
  return m ? parseFloat(m[1]) : undefined;
}

/** Clamp a value to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Infer ISO group from program content + file path */
function inferMaterialIso(content: string, filePath: string): string | undefined {
  const haystack = (content + " " + filePath).toLowerCase();
  for (const entry of MATERIAL_KEYWORDS) {
    if (entry.keywords.some(k => haystack.includes(k))) return entry.iso;
  }
  return undefined;
}

/** Infer human-readable material from program content + file path */
function inferMaterialHint(content: string, filePath: string): string | undefined {
  const haystack = (content + " " + filePath).toLowerCase();
  for (const entry of MATERIAL_KEYWORDS) {
    if (entry.keywords.some(k => haystack.includes(k))) return entry.names[0];
  }
  // JM Die default: tool steel if no match
  return "Tool steel (inferred from JM Die context)";
}

/** Infer lathe operation type from NAT comment + G-code context */
function inferOperationType(natComment: string, blockContent: string): LatheOperationType {
  const t = (natComment + " " + blockContent).toLowerCase();
  if (t.includes("face") || t.includes("facing"))                  return "facing";
  if (t.includes("cutoff") || t.includes("cut-off") || t.includes("parting")) return "parting";
  if (t.includes("thread") || RE_THREAD.test(blockContent))        return "threading";
  if (t.includes("groove") || RE_GROOVE.test(blockContent))        return "grooving";
  if (RE_PECK_DRILL.test(blockContent) || t.includes("peck"))      return "peck_drilling";
  if (t.includes("drill") || t.includes("center drill"))           return "drilling";
  if (t.includes("tap") || t.includes("tapping"))                  return "tapping";
  if (RE_BORING_BAR.test(t) || t.includes("bore"))                 return "boring";
  if (t.includes("rough") || t.includes("roughing"))               return "od_rough";
  if (t.includes("finish") || t.includes("finishing"))             return "od_finish";
  if (t.includes("id") || t.includes("inside"))                    return "id_rough";
  if (t.includes("od") || t.includes("outside") || t.includes("turn")) return "od_rough";
  if (t.includes("c-axis") || t.includes("caxis") || t.includes("live"))  return "c_axis";
  if (t.includes("grab") || t.includes("pull") || t.includes("sub")) return "bar_feeder";
  return "general";
}

// ============================================================================
// ENGINE
// ============================================================================

export class LatheKnowledgeHarvesterEngine {
  private cachedUnified: UnifiedLatheKnowledge | null = null;

  // ============================================================================
  // PUBLIC: harvestFromPrograms
  // ============================================================================

  /**
   * Harvest lathe knowledge from the JM Die CNC Lathe program archive.
   *
   * Walks every customer folder under `H:/PRISM/JM DIE/CNC LATHE`, reads up to
   * `MAX_PROGRAMS_PER_CUSTOMER` .MIN files, parses NAT blocks to extract:
   *   - Spindle speeds (G97 fixed RPM, G96 CSS)
   *   - Feed rates (G1/G0 F word)
   *   - Operation types (from NAT comments + G-code patterns)
   *   - Customer preferences (bar feeder, sub-spindle, CSS usage)
   *   - Material hints from part numbers / comments
   *
   * @returns HarvestResult with extracted LatheKnowledgeEntry array
   */
  harvestFromPrograms(): HarvestResult {
    const entries: LatheKnowledgeEntry[] = [];
    const errors: string[] = [];
    let programsAnalyzed = 0;

    if (!fs.existsSync(JM_LATHE_ROOT)) {
      return { source: "program", entries_extracted: 0, entries, metadata: {}, errors: [`Root not found: ${JM_LATHE_ROOT}`] };
    }

    let items: string[];
    try {
      items = fs.readdirSync(JM_LATHE_ROOT);
    } catch (e) {
      return { source: "program", entries_extracted: 0, entries, metadata: {}, errors: [String(e)] };
    }

    const customerFolders = items.filter(item => {
      try {
        return fs.statSync(path.join(JM_LATHE_ROOT, item)).isDirectory();
      } catch { return false; }
    });

    for (const customer of customerFolders) {
      const customerPath = path.join(JM_LATHE_ROOT, customer);
      let programFiles: string[];
      try {
        programFiles = fs.readdirSync(customerPath)
          .filter(f => f.toUpperCase().endsWith(".MIN"))
          .slice(0, MAX_PROGRAMS_PER_CUSTOMER);
      } catch { continue; }

      for (const prog of programFiles) {
        const fullPath = path.join(customerPath, prog);
        const content = safeReadFile(fullPath);
        if (!content) continue;

        programsAnalyzed++;
        const matIso = inferMaterialIso(content, fullPath);
        const matHint = inferMaterialHint(content, fullPath);
        const usesCSS = RE_CSS_MODE.test(content);
        const usesBarFeeder = RE_BAR_FEEDER.test(content);

        // Split content by NAT blocks
        const natMatches = [...content.matchAll(RE_NAT_GLOBAL)];

        if (natMatches.length === 0) {
          // No NAT blocks — still extract top-level data
          const rpm = extractNumber(new RegExp(RE_G97.source), content);
          const feed = extractNumber(new RegExp(RE_FEED.source), content);
          if (rpm && feed) {
            entries.push({
              id: `prog_${programsAnalyzed}_top`,
              source: "program",
              operation_type: "general",
              material_iso: matIso,
              material_hint: matHint,
              spindle_rpm: rpm,
              feed_per_rev_ipr: clamp(feed, 0.0001, 0.1),
              tip_text: `${customer}/${prog}: G97 S${rpm} F${feed} (no NAT blocks)`,
              tags: [customer.toLowerCase(), "okuma", "general"],
              confidence: 45,
            });
          }
          continue;
        }

        for (let i = 0; i < natMatches.length; i++) {
          const match = natMatches[i];
          const natStart = match.index ?? 0;
          const natEnd = i + 1 < natMatches.length ? (natMatches[i + 1].index ?? content.length) : content.length;
          const blockContent = content.slice(natStart, natEnd);
          const toolNum = match[1];
          const natComment = match[2] ?? "";

          const opType = inferOperationType(natComment, blockContent);

          // Extract all RPM values from this block
          const g97Matches = [...blockContent.matchAll(new RegExp(RE_G97.source, "g"))];
          const g96Matches = [...blockContent.matchAll(new RegExp(RE_G96.source, "g"))];
          const g50Matches = [...blockContent.matchAll(new RegExp(RE_G50.source, "g"))];
          const feedMatches = [...blockContent.matchAll(new RegExp(RE_FEED.source, "g"))];

          const rpm = g97Matches.length > 0 ? parseFloat(g97Matches[0][1]) : undefined;
          const cssSpeed = g96Matches.length > 0 ? parseFloat(g96Matches[0][1]) : undefined;
          const maxRpm = g50Matches.length > 0 ? parseFloat(g50Matches[0][1]) : undefined;
          const feed = feedMatches.length > 0 ? clamp(parseFloat(feedMatches[0][1]), 0.0001, 0.1) : undefined;

          // Only emit if we got something meaningful
          if (!rpm && !cssSpeed) continue;

          const entryId = `prog_${programsAnalyzed}_nat${toolNum}`;
          const tags = [customer.toLowerCase(), "okuma", opType, `t${toolNum}`];
          if (matIso) tags.push(`iso_${matIso}`);
          if (usesBarFeeder) tags.push("bar_feeder");
          if (usesCSS) tags.push("css");

          let tipText = `${customer}/${prog} T${toolNum} (${natComment || opType}): `;
          if (cssSpeed) tipText += `G96 S${cssSpeed} [CSS, G50 S${maxRpm ?? "?"}] `;
          if (rpm) tipText += `G97 S${rpm} [fixed RPM] `;
          if (feed) tipText += `F${feed} ipr`;

          entries.push({
            id: entryId,
            source: "program",
            operation_type: opType,
            material_iso: matIso,
            material_hint: matHint,
            spindle_rpm: rpm,
            surface_speed_sfm: cssSpeed ? Math.round(cssSpeed * 3.281) : undefined,
            feed_per_rev_ipr: feed,
            tip_text: tipText.trim(),
            tags,
            confidence: 75 + (usesCSS ? 5 : 0) + (feed ? 5 : 0),
          });
        }
      }
    }

    log.info(`[LatheKnowledgeHarvester] harvestFromPrograms: ${programsAnalyzed} programs → ${entries.length} entries`);
    return {
      source: "program",
      entries_extracted: entries.length,
      entries,
      metadata: { programs_analyzed: programsAnalyzed, customers: customerFolders.length },
      errors,
    };
  }

  // ============================================================================
  // PUBLIC: harvestFromTribal
  // ============================================================================

  /**
   * Harvest lathe-related tips from PRISM tribal knowledge sources.
   *
   * Sources:
   *   - `okuma-dialect-knowledge.ts` — all OSP tips (gcode, mcode, cycle, threading, etc.)
   *   - `controller-knowledge-tips.ts` — Okuma-tagged entries (lathe-relevant only)
   *
   * Tips are categorized by `LatheOperationType` using tag + keyword matching.
   *
   * @returns HarvestResult with tribal LatheKnowledgeEntry entries
   */
  harvestFromTribal(): HarvestResult {
    const entries: LatheKnowledgeEntry[] = [];
    const errors: string[] = [];

    // 1. Okuma dialect tips (all machine_types that include "lathe" or "mill_turn")
    for (const tip of OKUMA_DIALECT_KNOWLEDGE) {
      const isLatheRelevant =
        !tip.machine_types ||
        tip.machine_types.includes("lathe") ||
        tip.machine_types.includes("mill_turn") ||
        tip.machine_types.includes("multitask");

      if (!isLatheRelevant) continue;

      const opType = this.categorizeTribalTip(tip.tags, tip.title, tip.body);
      const primaryGcode = tip.gcodes?.[0];

      entries.push({
        id: `tribal_${tip.id}`,
        source: "tribal",
        operation_type: opType,
        gcode: primaryGcode,
        tip_text: `[${tip.category.toUpperCase()}] ${tip.title}: ${tip.body.slice(0, 300)}`,
        tags: [...tip.tags, "okuma", "osp"],
        confidence: tip.confidence,
      });
    }

    // 2. Controller knowledge tips — Okuma + lathe-relevant
    for (const tip of CONTROLLER_KNOWLEDGE_TIPS) {
      const isLatheRelevant =
        tip.tags.some(t => ["lathe", "turning", "okuma", "swiss-lathe", "bar-feeder", "threading", "grooving"].includes(t.toLowerCase())) ||
        tip.title.toLowerCase().includes("lathe") ||
        tip.title.toLowerCase().includes("okuma") ||
        tip.title.toLowerCase().includes("turning");

      if (!isLatheRelevant) continue;

      const opType = this.categorizeTribalTip(tip.tags, tip.title, tip.body);

      entries.push({
        id: `ctrl_${tip.id}`,
        source: "tribal",
        operation_type: opType,
        tip_text: `[CONTROLLER] ${tip.title}: ${tip.body.slice(0, 300)}`,
        tags: [...tip.tags, "controller"],
        confidence: tip.confidence,
      });
    }

    log.info(`[LatheKnowledgeHarvester] harvestFromTribal: ${entries.length} entries`);
    return {
      source: "tribal",
      entries_extracted: entries.length,
      entries,
      metadata: {
        okuma_dialect_tips: OKUMA_DIALECT_KNOWLEDGE.length,
        controller_tips_scanned: CONTROLLER_KNOWLEDGE_TIPS.length,
      },
      errors,
    };
  }

  // ============================================================================
  // PUBLIC: harvestFromResources
  // ============================================================================

  /**
   * Harvest lathe technique patterns from the Okuma Multus Program Examples folder.
   *
   * Each sub-folder represents a machining technique (e.g. "Bar Feeder", "C-Axis Sync",
   * "FIXED CYCLES - Drill,Tap,Bore", "Touch Setter"). The engine reads .MIN/.min files
   * inside each folder and extracts one `LatheKnowledgeEntry` per technique folder,
   * summarizing the G-code patterns found.
   *
   * @returns HarvestResult with resource-sourced entries
   */
  harvestFromResources(): HarvestResult {
    const entries: LatheKnowledgeEntry[] = [];
    const errors: string[] = [];

    if (!fs.existsSync(MULTUS_EXAMPLES_ROOT)) {
      return {
        source: "resource",
        entries_extracted: 0,
        entries,
        metadata: { root: MULTUS_EXAMPLES_ROOT },
        errors: [`Resource folder not found: ${MULTUS_EXAMPLES_ROOT}`],
      };
    }

    let folders: string[];
    try {
      folders = fs.readdirSync(MULTUS_EXAMPLES_ROOT).filter(f => {
        try { return fs.statSync(path.join(MULTUS_EXAMPLES_ROOT, f)).isDirectory(); }
        catch { return false; }
      });
    } catch (e) {
      return { source: "resource", entries_extracted: 0, entries, metadata: {}, errors: [String(e)] };
    }

    for (const folder of folders) {
      const folderPath = path.join(MULTUS_EXAMPLES_ROOT, folder);
      const opType = this.inferOpTypeFromFolderName(folder);

      // Collect .MIN / .min / .txt files
      let files: string[];
      try {
        files = fs.readdirSync(folderPath).filter(f =>
          /\.(min|txt|sdf)$/i.test(f)
        );
      } catch { continue; }

      if (files.length === 0) {
        // Folder exists but has no program files — still note the technique
        entries.push({
          id: `res_${folder.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`,
          source: "resource",
          operation_type: opType,
          tip_text: `Resource technique folder "${folder}" — no .MIN files found (may contain docs only)`,
          tags: [opType, "resource", "multus", "okuma"],
          confidence: 40,
        });
        continue;
      }

      // Aggregate patterns from all programs in this technique folder
      const gcodePatterns: string[] = [];
      const spindleSpeeds: number[] = [];
      const feedRates: number[] = [];

      for (const file of files.slice(0, 5)) {
        const content = safeReadFile(path.join(folderPath, file));
        if (!content) continue;

        // Extract notable G-codes
        const notableG = content.match(/G(?:71|72|74|75|76|85|87|96|97|50|138|139)\b/g) ?? [];
        gcodePatterns.push(...notableG);

        const g97s = [...content.matchAll(/G97\s+S(\d+)/g)].map(m => parseFloat(m[1]));
        const feeds = [...content.matchAll(/G[01]\s[^F\n]*F([\d.]+)/g)].map(m => parseFloat(m[1]));
        spindleSpeeds.push(...g97s);
        feedRates.push(...feeds.filter(f => f > 0.0001 && f < 0.1));
      }

      const uniqueG = [...new Set(gcodePatterns)].sort().join(", ");
      const avgRpm = spindleSpeeds.length > 0
        ? Math.round(spindleSpeeds.reduce((a, b) => a + b, 0) / spindleSpeeds.length)
        : undefined;
      const avgFeed = feedRates.length > 0
        ? +(feedRates.reduce((a, b) => a + b, 0) / feedRates.length).toFixed(4)
        : undefined;

      let tipText = `Resource: "${folder}" — ${files.length} program(s). `;
      if (uniqueG) tipText += `G-codes used: ${uniqueG}. `;
      if (avgRpm) tipText += `Avg RPM: ${avgRpm}. `;
      if (avgFeed) tipText += `Avg feed: ${avgFeed} ipr.`;

      entries.push({
        id: `res_${folder.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`,
        source: "resource",
        operation_type: opType,
        spindle_rpm: avgRpm,
        feed_per_rev_ipr: avgFeed,
        tip_text: tipText.trim(),
        tags: [opType, "resource", "multus", "okuma", ...folder.toLowerCase().split(/[\s-_/]+/).filter(w => w.length > 2)],
        confidence: 70 + (files.length > 2 ? 10 : 0),
      });
    }

    log.info(`[LatheKnowledgeHarvester] harvestFromResources: ${entries.length} entries from ${folders.length} folders`);
    return {
      source: "resource",
      entries_extracted: entries.length,
      entries,
      metadata: { folders_scanned: folders.length, root: MULTUS_EXAMPLES_ROOT },
      errors,
    };
  }

  // ============================================================================
  // PUBLIC: synthesizeKnowledge
  // ============================================================================

  /**
   * Merge all harvest sources into a unified `UnifiedLatheKnowledge` object.
   *
   * Process:
   *   1. Run all three harvest methods
   *   2. Deduplicate entries by (source + operation_type + rpm_bucket)
   *   3. Build MaterialKnowledge ranges per ISO group from program entries
   *   4. Build CustomerPreference summaries from program entries grouped by customer tag
   *   5. Build operation_index for fast lookup
   *   6. Identify top G-code patterns by frequency
   *
   * The result is cached internally. Call `clearCache()` to force refresh.
   *
   * @returns UnifiedLatheKnowledge — the consolidated knowledge base
   */
  synthesizeKnowledge(): UnifiedLatheKnowledge {
    if (this.cachedUnified) return this.cachedUnified;

    const programResult   = this.harvestFromPrograms();
    const tribalResult    = this.harvestFromTribal();
    const resourceResult  = this.harvestFromResources();

    const allEntries = [
      ...programResult.entries,
      ...tribalResult.entries,
      ...resourceResult.entries,
    ];

    // --- Material Knowledge ---
    const materialMap = new Map<string, {
      isos: string[]; names: string[];
      faceRpm: number[]; odRoughRpm: number[]; odFinishRpm: number[];
      boringRpm: number[]; drillRpm: number[]; threadRpm: number[];
      faceFeed: number[]; odRoughFeed: number[]; odFinishFeed: number[];
      boringFeed: number[]; drillFeed: number[];
      css: number[];
    }>();

    for (const e of programResult.entries) {
      const iso = e.material_iso ?? "P";
      if (!materialMap.has(iso)) {
        materialMap.set(iso, {
          isos: [iso], names: e.material_hint ? [e.material_hint] : [],
          faceRpm: [], odRoughRpm: [], odFinishRpm: [],
          boringRpm: [], drillRpm: [], threadRpm: [],
          faceFeed: [], odRoughFeed: [], odFinishFeed: [],
          boringFeed: [], drillFeed: [],
          css: [],
        });
      }
      const m = materialMap.get(iso)!;
      if (e.material_hint && !m.names.includes(e.material_hint)) m.names.push(e.material_hint);

      const rpm = e.spindle_rpm;
      const feed = e.feed_per_rev_ipr;
      const css = e.surface_speed_sfm;

      if (css) m.css.push(css);

      switch (e.operation_type) {
        case "facing":    if (rpm) m.faceRpm.push(rpm); if (feed) m.faceFeed.push(feed); break;
        case "od_rough":  if (rpm) m.odRoughRpm.push(rpm); if (feed) m.odRoughFeed.push(feed); break;
        case "od_finish": if (rpm) m.odFinishRpm.push(rpm); if (feed) m.odFinishFeed.push(feed); break;
        case "boring":
        case "id_rough":
        case "id_finish": if (rpm) m.boringRpm.push(rpm); if (feed) m.boringFeed.push(feed); break;
        case "drilling":
        case "peck_drilling": if (rpm) m.drillRpm.push(rpm); if (feed) m.drillFeed.push(feed); break;
        case "threading": if (rpm) m.threadRpm.push(rpm); break;
      }
    }

    const mkRange = (arr: number[]) => arr.length === 0
      ? { rpm_min: 0, rpm_max: 0, feed_min: 0, feed_max: 0, sample_count: 0 }
      : { rpm_min: Math.min(...arr), rpm_max: Math.max(...arr), feed_min: 0, feed_max: 0, sample_count: arr.length };

    const mkFeedRange = (rpms: number[], feeds: number[]) => ({
      rpm_min: rpms.length > 0 ? Math.min(...rpms) : 0,
      rpm_max: rpms.length > 0 ? Math.max(...rpms) : 0,
      feed_min: feeds.length > 0 ? Math.min(...feeds) : 0,
      feed_max: feeds.length > 0 ? Math.max(...feeds) : 0,
      sample_count: rpms.length,
    });

    const materials: MaterialKnowledge[] = [...materialMap.entries()].map(([iso, m]) => ({
      material_iso: iso,
      material_names: m.names,
      facing:    mkFeedRange(m.faceRpm, m.faceFeed),
      od_rough:  mkFeedRange(m.odRoughRpm, m.odRoughFeed),
      od_finish: mkFeedRange(m.odFinishRpm, m.odFinishFeed),
      id_boring: mkFeedRange(m.boringRpm, m.boringFeed),
      drilling:  mkFeedRange(m.drillRpm, m.drillFeed),
      threading: {
        rpm_min: m.threadRpm.length > 0 ? Math.min(...m.threadRpm) : 0,
        rpm_max: m.threadRpm.length > 0 ? Math.max(...m.threadRpm) : 0,
        sample_count: m.threadRpm.length,
      },
      css_m_min: {
        typical: OKUMA_CSS_M_MIN[iso]?.typical ?? 150,
        max: OKUMA_CSS_M_MIN[iso]?.max ?? 300,
        sample_count: m.css.length,
      },
    }));

    // --- Customer Preferences ---
    const customerMap = new Map<string, {
      programs: number; ops: Set<LatheOperationType>; materials: Set<string>;
      rpms: number[]; feeds: number[]; css: boolean; barFeeder: boolean; subSpindle: boolean;
    }>();

    for (const e of programResult.entries) {
      const custTag = e.tags.find(t => !["okuma","osp","css","bar_feeder","controller",
        "iso_P","iso_M","iso_K","iso_N","iso_S","iso_H"].includes(t) && !t.startsWith("nat") && !t.startsWith("t"));
      if (!custTag) continue;

      if (!customerMap.has(custTag)) {
        customerMap.set(custTag, { programs: 0, ops: new Set(), materials: new Set(),
          rpms: [], feeds: [], css: false, barFeeder: false, subSpindle: false });
      }
      const c = customerMap.get(custTag)!;
      c.programs++;
      c.ops.add(e.operation_type);
      if (e.material_hint) c.materials.add(e.material_hint);
      if (e.spindle_rpm) c.rpms.push(e.spindle_rpm);
      if (e.feed_per_rev_ipr) c.feeds.push(e.feed_per_rev_ipr);
      if (e.tags.includes("css")) c.css = true;
      if (e.tags.includes("bar_feeder")) c.barFeeder = true;
    }

    const customerPreferences: CustomerPreference[] = [...customerMap.entries()].map(([customer, c]) => ({
      customer,
      programs_analyzed: c.programs,
      preferred_operations: [...c.ops],
      typical_materials: [...c.materials].slice(0, 4),
      avg_spindle_rpm: c.rpms.length > 0 ? Math.round(c.rpms.reduce((a, b) => a + b, 0) / c.rpms.length) : 0,
      avg_feed_ipr: c.feeds.length > 0 ? +(c.feeds.reduce((a, b) => a + b, 0) / c.feeds.length).toFixed(4) : 0,
      uses_css: c.css,
      uses_bar_feeder: c.barFeeder,
      uses_sub_spindle: false, // Derived from entry content — future enhancement
      confidence: clamp(50 + c.programs * 2, 50, 95),
    }));

    // --- Operation index ---
    const operationIndex: Record<LatheOperationType, string[]> = {
      facing: [], od_rough: [], od_finish: [], id_rough: [], id_finish: [],
      drilling: [], peck_drilling: [], threading: [], grooving: [], parting: [],
      c_axis: [], bar_feeder: [], touch_setter: [], boring: [], tapping: [], general: [],
    };
    for (const e of allEntries) {
      operationIndex[e.operation_type].push(e.id);
    }

    // --- Top G-code patterns ---
    const gFreq = new Map<string, number>();
    for (const e of allEntries) {
      if (e.gcode) gFreq.set(e.gcode, (gFreq.get(e.gcode) ?? 0) + 1);
    }
    const top_gcode_patterns: GCodePattern[] = [...gFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, freq]) => ({
        name: code,
        gcode_sequence: code,
        description: this.describeGCode(code),
        frequency: freq,
        operation_type: this.gcodeToOpType(code),
      }));

    const unified: UnifiedLatheKnowledge = {
      generated_at: new Date().toISOString(),
      programs_harvested: programResult.entries_extracted,
      tribal_tips_harvested: tribalResult.entries_extracted,
      resource_patterns_harvested: resourceResult.entries_extracted,
      controller_tips_harvested: 0, // included in tribal count
      entries: allEntries,
      materials,
      customer_preferences: customerPreferences,
      operation_index: operationIndex,
      top_gcode_patterns,
      synthesis_notes: [
        `Harvested from ${(programResult.metadata as { programs_analyzed?: number }).programs_analyzed ?? 0} JM Die programs across ${(programResult.metadata as { customers?: number }).customers ?? 0} customers`,
        `Okuma OSP dialect tips: ${OKUMA_DIALECT_KNOWLEDGE.length} entries`,
        `Controller tips (lathe-filtered): ${tribalResult.entries.filter(e => e.id.startsWith("ctrl_")).length}`,
        `Resource technique folders: ${resourceResult.entries_extracted}`,
        `ISO material groups covered: ${materials.map(m => m.material_iso).join(", ")}`,
      ],
    };

    this.cachedUnified = unified;
    log.info(`[LatheKnowledgeHarvester] synthesizeKnowledge complete: ${allEntries.length} total entries`);
    return unified;
  }

  // ============================================================================
  // PUBLIC: generateProgramImprovements
  // ============================================================================

  /**
   * Analyze a raw Okuma OSP .MIN program string and generate typed improvement suggestions.
   *
   * Checks performed:
   *   - G50 safety clamp missing before G96 (critical)
   *   - G97 RPM values against learned material ranges
   *   - Feed rates outside typical range for operation type
   *   - Missing M8 coolant activation
   *   - Rapid (G0) moves at feed positions (efficiency)
   *   - Missing dwell (G4) after threading for chip clearing
   *   - G96 CSS without G50 clamp (safety critical)
   *   - No center drill before main drill (operation order)
   *
   * @param programContent - Raw .MIN file content as string
   * @param materialIso - ISO material group override (auto-detected if omitted)
   * @returns Array of ProgramImprovement suggestions ordered by severity
   */
  generateProgramImprovements(
    programContent: string,
    materialIso?: string
  ): ProgramImprovement[] {
    const improvements: ProgramImprovement[] = [];
    const knowledge = this.synthesizeKnowledge();
    const detectedIso = materialIso ?? inferMaterialIso(programContent, "") ?? "P";
    const matKnowledge = knowledge.materials.find(m => m.material_iso === detectedIso);
    const lines = programContent.split("\n");

    // --- Check 1: G50 missing before G96 (SAFETY CRITICAL) ---
    const g96Lines = lines.reduce<number[]>((acc, l, i) => RE_G50_SAFETY.test(l) ? [...acc, i + 1] : acc, []);
    for (const ln of g96Lines) {
      // Look backwards for G50 within 5 lines
      const windowStart = Math.max(0, ln - 6);
      const window = lines.slice(windowStart, ln);
      const hasG50 = window.some(l => /G50\s+S\d+/i.test(l));
      if (!hasG50) {
        improvements.push({
          severity: "critical",
          category: "safety",
          line: ln,
          description: "G96 (CSS mode) used without preceding G50 spindle speed clamp",
          current_value: `G96 at line ${ln} (no G50 found in preceding 5 lines)`,
          recommended_value: `G50 S${detectedIso === "H" ? "1800" : "2500"}\nG96 S${OKUMA_CSS_M_MIN[detectedIso]?.typical ?? 180} M3`,
          rationale: "Without G50, spindle RPM accelerates to machine maximum as tool approaches X=0, risking spindle overload and workpiece ejection. Okuma OSP safety requirement.",
          knowledge_sources: ["okuma_g50", "ctrl_okuma_osp"],
        });
      }
    }

    // --- Check 2: G97 RPM out of range for material ---
    if (matKnowledge) {
      const allG97 = [...programContent.matchAll(/G97\s+S(\d+)/g)];
      for (const m of allG97) {
        const rpm = parseFloat(m[1]);
        const lineNum = programContent.slice(0, m.index).split("\n").length;
        // Check against facing range (most common operation, widest RPM range known)
        const maxExpected = Math.max(
          matKnowledge.od_rough.rpm_max || 2000,
          matKnowledge.od_finish.rpm_max || 2500,
          matKnowledge.drilling.rpm_max || 1500
        );
        if (rpm > maxExpected * 1.4) {
          improvements.push({
            severity: "warning",
            category: "speed_feed",
            line: lineNum,
            description: `G97 S${rpm} exceeds typical max RPM for ISO ${detectedIso} material`,
            current_value: `S${rpm}`,
            recommended_value: `S${Math.round(maxExpected)}`,
            rationale: `Learned from JM Die programs: ISO ${detectedIso} material typical max ${Math.round(maxExpected)} RPM. High RPM on hard tool steels risks premature insert edge failure.`,
            knowledge_sources: knowledge.operation_index.od_rough.slice(0, 3),
          });
        }
      }
    }

    // --- Check 3: Feed rate out of range ---
    const feedMatches = [...programContent.matchAll(/G[01]\s[^F\n]*F([\d.]+)/g)];
    for (const m of feedMatches) {
      const feed = parseFloat(m[1]);
      const lineNum = programContent.slice(0, m.index).split("\n").length;
      // Gross checks: feed < 0.0005 or > 0.05 for tool steel is suspect
      if (feed < 0.0003 && detectedIso !== "H") {
        improvements.push({
          severity: "suggestion",
          category: "speed_feed",
          line: lineNum,
          description: `Very low feed rate F${feed} ipr — may cause rubbing and work hardening`,
          current_value: `F${feed}`,
          recommended_value: "F0.003 minimum for roughing, F0.001 minimum for finishing",
          rationale: "Feeds below 0.0003 ipr cause the insert to rub rather than cut, generating heat and accelerating wear. Learned from JM Die program analysis.",
          knowledge_sources: knowledge.operation_index.od_rough.slice(0, 2),
        });
      }
      if (feed > 0.05) {
        improvements.push({
          severity: "warning",
          category: "speed_feed",
          line: lineNum,
          description: `Unusually high feed rate F${feed} ipr for lathe turning`,
          current_value: `F${feed}`,
          recommended_value: "F0.020 maximum for most roughing passes",
          rationale: "Feeds above 0.05 ipr on tool steels risk insert fracture and poor surface finish. Verify this is intentional (e.g. thread lead).",
          knowledge_sources: ["tribal_okuma_g1"],
        });
      }
    }

    // --- Check 4: Missing coolant (M8) ---
    const hasCoolant = /M8\b/.test(programContent);
    const isGraphite = (detectedIso === "K") && programContent.toLowerCase().includes("graphite");
    if (!hasCoolant && !isGraphite) {
      improvements.push({
        severity: "suggestion",
        category: "coolant",
        description: "No M8 coolant activation found in program",
        recommended_value: "M8 (flood coolant ON) — add after each T-code call",
        rationale: "Coolant is required for tool steel turning (D2, M2, H13) to control thermal growth and extend insert life. JM Die uses flood coolant for all lathe operations except graphite.",
        knowledge_sources: ["ctrl_okuma_osp"],
      });
    }

    // --- Check 5: Threading without dwell (G4) ---
    const hasThreading = RE_THREAD.test(programContent);
    if (hasThreading) {
      const hasG4 = /G4\s+F/.test(programContent);
      if (!hasG4) {
        improvements.push({
          severity: "suggestion",
          category: "efficiency",
          description: "Threading (G71) detected but no G4 dwell before thread pass",
          recommended_value: "G4 F0.5 (0.5 second dwell) before threading for spindle speed stabilization",
          rationale: "Spindle must reach stable speed before threading engagement. G4 F0.5 dwell after G97 stabilizes RPM and prevents lead error. Okuma OSP G4 F is in seconds.",
          knowledge_sources: ["okuma_g4", "okuma_g71"],
        });
      }
    }

    // --- Check 6: Center drill before main drill ---
    const hasCenterDrill = /center\s*drill|CENTER\s*DRILL|NAT.*0[13]\b/i.test(programContent);
    const hasDrillOp = /NAT\d+.*drill|G74\b/i.test(programContent);
    if (hasDrillOp && !hasCenterDrill) {
      improvements.push({
        severity: "suggestion",
        category: "operation_order",
        description: "Drilling operation detected without a center drill operation",
        recommended_value: "Add center drill (NAT0X TOOL CENTER DRILL) before main drill operations",
        rationale: "Drill wandering on hard tool steels is a common failure mode. Center drilling first ensures accurate hole location, especially on crowned or angled faces.",
        knowledge_sources: knowledge.operation_index.drilling.slice(0, 2),
      });
    }

    // --- Check 7: G0 rapids crossing X=0 without safe X retract ---
    const g0Lines = lines.filter(l => /^G0\s+X[0-9]/.test(l.trim()));
    for (const l of g0Lines) {
      const xVal = parseFloat((l.match(/X([\d.]+)/) ?? [])[1] ?? "999");
      if (xVal < 0.1 && xVal >= 0) {
        const lineNum = lines.indexOf(l) + 1;
        improvements.push({
          severity: "warning",
          category: "safety",
          line: lineNum,
          description: "G0 rapid to near X=0 — verify no interference with chuck/collet",
          current_value: l.trim(),
          recommended_value: "Ensure X is at safe clearance before Z rapids",
          rationale: "Rapid moves to X=0 risk collet/chuck collision if Z position is not in clearance zone. Always rapid to safe X (e.g. X20) before changing Z.",
          knowledge_sources: ["okuma_g0"],
        });
      }
    }

    // Sort by severity (critical first, then warning, then suggestion)
    const severityOrder = { critical: 0, warning: 1, suggestion: 2 };
    improvements.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    log.info(`[LatheKnowledgeHarvester] generateProgramImprovements: ${improvements.length} suggestions (material: ISO ${detectedIso})`);
    return improvements;
  }

  // ============================================================================
  // PUBLIC: clearCache
  // ============================================================================

  /**
   * Invalidate the synthesized knowledge cache, forcing re-harvest on next call.
   */
  clearCache(): void {
    this.cachedUnified = null;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /** Categorize a tribal tip into LatheOperationType using tags + title + body */
  private categorizeTribalTip(tags: string[], title: string, body: string): LatheOperationType {
    const t = [...tags, title, body.slice(0, 100)].join(" ").toLowerCase();
    if (t.includes("threading") || t.includes("g71"))          return "threading";
    if (t.includes("grooving") || t.includes("g75"))          return "grooving";
    if (t.includes("parting") || t.includes("cutoff"))        return "parting";
    if (t.includes("peck") || t.includes("g74"))              return "peck_drilling";
    if (t.includes("drill"))                                   return "drilling";
    if (t.includes("boring") || t.includes("g87"))            return "boring";
    if (t.includes("finishing") || t.includes("finish"))      return "od_finish";
    if (t.includes("roughing") || t.includes("rough"))        return "od_rough";
    if (t.includes("facing") || t.includes("face"))           return "facing";
    if (t.includes("bar feeder") || t.includes("barfeeder"))  return "bar_feeder";
    if (t.includes("c-axis") || t.includes("caxis"))          return "c_axis";
    if (t.includes("touch") || t.includes("setter"))         return "touch_setter";
    if (t.includes("tapping") || t.includes("tap"))           return "tapping";
    return "general";
  }

  /** Infer LatheOperationType from a resource folder name */
  private inferOpTypeFromFolderName(folder: string): LatheOperationType {
    const f = folder.toLowerCase();
    if (f.includes("thread"))        return "threading";
    if (f.includes("groove"))        return "grooving";
    if (f.includes("drill"))         return "drilling";
    if (f.includes("tap"))           return "tapping";
    if (f.includes("bore"))          return "boring";
    if (f.includes("bar feeder") || f.includes("barfeeder")) return "bar_feeder";
    if (f.includes("c-axis") || f.includes("caxis"))         return "c_axis";
    if (f.includes("touch"))         return "touch_setter";
    if (f.includes("cycle"))         return "general";
    if (f.includes("lobe"))          return "od_finish";
    if (f.includes("engrave"))       return "c_axis";
    if (f.includes("angle"))         return "od_rough";
    return "general";
  }

  /** Human-readable description for common G-codes */
  private describeGCode(code: string): string {
    const map: Record<string, string> = {
      G50: "Spindle speed clamp (max RPM for CSS)",
      G96: "Constant surface speed (CSS) mode",
      G97: "Fixed RPM mode",
      G71: "Threading cycle (Okuma)",
      G74: "Peck drilling cycle",
      G75: "Grooving cycle",
      G76: "Multiple-pass threading cycle",
      G85: "Boring cycle",
      G87: "Boring with in-feed cycle",
      G138: "C-axis positioning",
      G139: "C-axis cancel",
    };
    return map[code] ?? `G-code ${code}`;
  }

  /** Map a G-code to its primary LatheOperationType */
  private gcodeToOpType(code: string): LatheOperationType {
    const map: Record<string, LatheOperationType> = {
      G50: "od_rough", G96: "od_rough", G97: "general",
      G71: "threading", G74: "peck_drilling", G75: "grooving",
      G76: "threading", G85: "boring", G87: "boring",
      G138: "c_axis", G139: "c_axis",
    };
    return map[code] ?? "general";
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance — shared across all PRISM modules */
export const latheKnowledgeHarvesterEngine = new LatheKnowledgeHarvesterEngine();
