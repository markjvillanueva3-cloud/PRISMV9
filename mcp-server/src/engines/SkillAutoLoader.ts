/**
 * PRISM Skill Auto-Loader Engine
 * D1.4: Smart skill loading with chain awareness and domain mapping
 * 
 * PURPOSE: Proactively load relevant skill content (not just hints) based on
 * task domain classification from TaskAgentClassifier. Maps domains to 
 * predefined chains and extracts key content sections.
 * 
 * DESIGN: 
 * - Reads MORE than autoSkillHint's 10 lines (extracts key sections)
 * - Maps domains to predefined chains for multi-skill workflows
 * - Pressure-adaptive: full excerpts at low pressure, compact at high
 * - Caches loaded excerpts per-session to avoid re-reading disk
 * 
 * @version 1.0.0
 * @date 2026-02-12
 */

import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../constants.js";

const SKILLS_DIR = PATHS.SKILLS;
const STATE_DIR = PATHS.STATE_DIR;

// ============================================================================
// TYPES
// ============================================================================

export interface SkillExcerpt {
  skill_id: string;
  title: string;
  sections: string[];        // Key section headers found
  key_content: string;       // Extracted formulas, tables, decision points
  lines_total: number;       // Total lines in skill
  lines_extracted: number;   // Lines we kept
}

export interface ChainRecommendation {
  chain_name: string;
  purpose: string;
  skills: string[];
  match_reason: string;
}

export interface SkillAutoLoadResult {
  success: boolean;
  call_number: number;
  domain: string;
  chain?: ChainRecommendation;
  excerpts: SkillExcerpt[];
  total_lines_loaded: number;
  hint: string;
  cached: boolean;
}

// ============================================================================
// DOMAIN → CHAIN MAPPING
// Maps TaskAgentClassifier domains to SkillExecutor predefined chains
// ============================================================================

const DOMAIN_CHAIN_MAP: Record<string, { chain: string; priority: "high" | "medium" | "low" }> = {
  // Manufacturing core domains
  calculations:    { chain: "speed-feed-full",     priority: "high" },
  materials:       { chain: "material-complete",   priority: "high" },
  tooling:         { chain: "speed-feed-full",     priority: "medium" },
  safety:          { chain: "speed-feed-full",     priority: "high" },
  physics:         { chain: "speed-feed-full",     priority: "high" },
  toolpath:        { chain: "toolpath-optimize",   priority: "high" },
  alarms:          { chain: "alarm-diagnose",      priority: "high" },
  threading:       { chain: "speed-feed-full",     priority: "medium" },
  // Quality/validation domains
  quality:         { chain: "quality-release",     priority: "high" },
  validation:      { chain: "quality-release",     priority: "medium" },
  // Session/context domains
  session:         { chain: "session-recovery",    priority: "low" },
  // Optimization
  optimization:    { chain: "toolpath-optimize",   priority: "medium" },
};

// Chain definitions (mirrors SkillExecutor.PREDEFINED_CHAINS but readable here)
const CHAIN_SKILLS: Record<string, { skills: string[]; purpose: string }> = {
  "speed-feed-full": {
    skills: ["prism-speed-feed-engine", "prism-cutting-mechanics", "prism-material-physics", "prism-cutting-tools", "prism-safety-framework"],
    purpose: "Speed/feed calculation with physics validation and safety"
  },
  "toolpath-optimize": {
    skills: ["prism-cam-strategies", "prism-cutting-mechanics", "prism-speed-feed-engine", "prism-process-optimizer", "prism-safety-framework"],
    purpose: "Toolpath strategy with cutting parameter optimization"
  },
  "material-complete": {
    skills: ["prism-material-lookup", "prism-material-physics", "prism-material-enhancer", "prism-cutting-mechanics", "prism-universal-formulas"],
    purpose: "Full material analysis with physics and machinability"
  },
  "alarm-diagnose": {
    skills: ["prism-controller-quick-ref", "prism-fanuc-programming", "prism-heidenhain-programming", "prism-siemens-programming", "prism-error-recovery"],
    purpose: "Cross-controller alarm diagnosis with fix procedures"
  },
  "quality-release": {
    skills: ["prism-quality-gates", "prism-anti-regression", "prism-ralph-validation", "prism-master-equation", "prism-safety-framework"],
    purpose: "Full quality validation pipeline for release readiness"
  },
  "session-recovery": {
    skills: ["prism-state-manager", "prism-session-handoff", "prism-task-continuity", "prism-context-engineering", "prism-context-pressure"],
    purpose: "Session recovery and context reconstruction"
  }
};

// ============================================================================
// ACTION → SPECIFIC SKILLS (supplementary to SKILL_DOMAIN_MAP in cadenceExecutor)
// These are the "most critical" skills per action — loaded with deeper excerpts
// ============================================================================

const ACTION_PRIMARY_SKILL: Record<string, string> = {
  // Calc actions → primary skill
  "cutting_force": "prism-cutting-mechanics",
  "tool_life": "prism-cutting-tools",
  "speed_feed": "prism-speed-feed-engine",
  "flow_stress": "prism-material-physics",
  "surface_finish": "prism-cam-strategies",
  "mrr": "prism-cutting-mechanics",
  "power": "prism-cutting-mechanics",
  "chip_load": "prism-cutting-mechanics",
  "stability": "prism-cutting-mechanics",
  "deflection": "prism-cutting-tools",
  "thermal": "prism-expert-thermodynamics",
  "cost_optimize": "prism-process-optimizer",
  "multi_optimize": "prism-mathematical-planning",
  "trochoidal": "prism-cam-strategies",
  "hsm": "prism-cam-strategies",
  // Safety actions → primary skill
  "check_toolpath_collision": "prism-safety-framework",
  "predict_tool_breakage": "prism-cutting-tools",
  "check_spindle_torque": "prism-cutting-mechanics",
  "validate_workholding_setup": "prism-safety-framework",
  // Thread actions → primary skill
  "calculate_tap_drill": "prism-universal-formulas",
  "generate_thread_gcode": "prism-gcode-reference",
  // Toolpath actions → primary skill
  "strategy_select": "prism-cam-strategies",
  "params_calculate": "prism-cam-strategies",
  "material_strategies": "prism-cam-strategies",
  // Data actions → primary skill
  "material_get": "prism-material-lookup",
  "material_compare": "prism-material-physics",
  "alarm_decode": "prism-controller-quick-ref",
  "alarm_fix": "prism-error-recovery",
  "tool_recommend": "prism-tool-selector",
  "tool_facets": "prism-cutting-tools",
};

// ============================================================================
// SESSION CACHE — avoid re-reading disk for same skills
// ============================================================================

const excerptCache = new Map<string, SkillExcerpt>();
let cacheSessionId = "";

function resetCacheIfNewSession(): void {
  const stateFile = path.join(STATE_DIR, "CURRENT_STATE.json");
  try {
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
      const sid = state.session_id || "";
      if (sid !== cacheSessionId) {
        excerptCache.clear();
        cacheSessionId = sid;
      }
    }
  } catch { /* ignore */ }
}

// ============================================================================
// SMART EXCERPT EXTRACTION
// Reads skill files and extracts key sections:
// - Section headers (## SECTION X)
// - Formulas (lines with = or ← or → or containing F-xxx)
// - Tables (lines with |)
// - Decision points (lines with "IF", "WHEN", "WARNING", "CRITICAL")
// - First substantive paragraph of each section
// ============================================================================

function extractKeyContent(skillPath: string, maxLines: number): SkillExcerpt | null {
  if (!fs.existsSync(skillPath)) return null;

  try {
    const raw = fs.readFileSync(skillPath, "utf-8");
    const lines = raw.split("\n");
    const skillId = path.basename(path.dirname(skillPath));
    
    // Check cache first
    if (excerptCache.has(skillId)) {
      return excerptCache.get(skillId)!;
    }

    let title = "";
    const sections: string[] = [];
    const keyLines: string[] = [];
    let linesKept = 0;
    let inCodeBlock = false;
    let currentSectionLines = 0;
    const MAX_SECTION_LINES = 8; // Max lines to keep per section

    for (const line of lines) {
      // Track code blocks
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Title (# heading)
      if (line.startsWith("# ") && !title) {
        title = line.replace("# ", "").trim();
        continue;
      }

      // Section headers (## or ### )
      if (line.startsWith("## ")) {
        sections.push(line.replace("## ", "").trim());
        currentSectionLines = 0;
        if (keyLines.length > 0) keyLines.push(""); // spacer between sections
        keyLines.push(line.trim());
        linesKept++;
        if (linesKept >= maxLines) break;
        continue;
      }

      // Key content detection
      const isFormula = /[=←→]/.test(line) && /[A-Z]/.test(line) && line.trim().length > 5;
      const isTable = line.trim().startsWith("|") && line.includes("|", 2);
      const isDecision = /\b(IF|WHEN|WARNING|CRITICAL|MUST|NEVER|ALWAYS|REQUIRED)\b/.test(line);
      const isFormulaRef = /F-[A-Z]+-\d+/.test(line);
      const isSubsection = line.startsWith("### ");
      const isBulletKey = line.trim().startsWith("- **") || line.trim().startsWith("* **");

      if (isFormula || isTable || isDecision || isFormulaRef || isSubsection || isBulletKey) {
        if (currentSectionLines < MAX_SECTION_LINES) {
          keyLines.push(line.trimEnd());
          linesKept++;
          currentSectionLines++;
          if (linesKept >= maxLines) break;
        }
      }
      // Also keep first 2 substantive lines per section (context)
      else if (line.trim().length > 20 && currentSectionLines < 2 && !inCodeBlock) {
        keyLines.push(line.trimEnd());
        linesKept++;
        currentSectionLines++;
        if (linesKept >= maxLines) break;
      }
    }

    const excerpt: SkillExcerpt = {
      skill_id: skillId,
      title: title || skillId,
      sections,
      key_content: keyLines.join("\n"),
      lines_total: lines.length,
      lines_extracted: linesKept
    };

    // Cache it
    excerptCache.set(skillId, excerpt);
    return excerpt;
  } catch {
    return null;
  }
}

// ============================================================================
// CHAIN RECOMMENDATION
// ============================================================================

export function getChainForDomain(domain: string): ChainRecommendation | null {
  const mapping = DOMAIN_CHAIN_MAP[domain];
  if (!mapping) return null;

  const chain = CHAIN_SKILLS[mapping.chain];
  if (!chain) return null;

  return {
    chain_name: mapping.chain,
    purpose: chain.purpose,
    skills: chain.skills,
    match_reason: `Domain "${domain}" → chain "${mapping.chain}" (${mapping.priority} priority)`
  };
}

// ============================================================================
// MAIN AUTO-LOAD FUNCTION
// Called by autoSkillAutoLoad cadence function
// ============================================================================

/**
 * Auto-load skills for a task based on domain classification.
 * 
 * Loading strategy (pressure-adaptive):
 * - <50% pressure: Load primary skill (deep) + chain skills (shallow) — max 80 lines
 * - 50-70%: Load primary skill (medium) + chain recommendation — max 40 lines
 * - 70-85%: Primary skill hint only — max 15 lines
 * - >85%: Skip (autoSkillHint handles minimal hints)
 */
export function autoLoadForTask(
  callNumber: number,
  domain: string,
  action: string,
  params?: Record<string, any>
): SkillAutoLoadResult {
  resetCacheIfNewSession();

  // Get current pressure
  let pressurePct = 0;
  try {
    const pFile = path.join(STATE_DIR, "context_pressure.json");
    if (fs.existsSync(pFile)) {
      const p = JSON.parse(fs.readFileSync(pFile, "utf-8"));
      pressurePct = p.pressure_pct || 0;
    }
  } catch { /* ignore */ }

  // Bail at high pressure — autoSkillHint handles minimal hints
  if (pressurePct > 85) {
    return {
      success: true, call_number: callNumber, domain,
      excerpts: [], total_lines_loaded: 0,
      hint: "⚡ Skill auto-load suppressed (pressure >85%)", cached: false
    };
  }

  // Determine budget
  const maxPrimaryLines = pressurePct > 70 ? 15 : pressurePct > 50 ? 30 : 50;
  const maxChainLines = pressurePct > 70 ? 0 : pressurePct > 50 ? 10 : 20;
  const loadChain = pressurePct <= 70;

  const excerpts: SkillExcerpt[] = [];
  let totalLines = 0;

  // 1. Load PRIMARY skill for this action (deep excerpt)
  const primarySkillId = ACTION_PRIMARY_SKILL[action];
  if (primarySkillId) {
    const skillPath = path.join(SKILLS_DIR, primarySkillId, "SKILL.md");
    const excerpt = extractKeyContent(skillPath, maxPrimaryLines);
    if (excerpt) {
      excerpts.push(excerpt);
      totalLines += excerpt.lines_extracted;
    }
  }

  // 2. Get chain recommendation for domain
  const chain = loadChain ? getChainForDomain(domain) : null;

  // 3. Load chain skills (shallow excerpts, skip primary to avoid duplicate)
  if (chain && maxChainLines > 0) {
    const perSkillBudget = Math.max(5, Math.floor(maxChainLines / Math.min(chain.skills.length, 3)));
    for (const skillId of chain.skills) {
      if (skillId === primarySkillId) continue; // already loaded deep
      if (totalLines >= maxPrimaryLines + maxChainLines) break;
      
      const skillPath = path.join(SKILLS_DIR, skillId, "SKILL.md");
      const excerpt = extractKeyContent(skillPath, perSkillBudget);
      if (excerpt) {
        excerpts.push(excerpt);
        totalLines += excerpt.lines_extracted;
      }
    }
  }

  // 4. Build hint
  const hintParts: string[] = [];
  if (excerpts.length > 0) {
    const ids = excerpts.map(e => e.skill_id).join(", ");
    hintParts.push(`📚 Loaded ${excerpts.length} skills (${totalLines} lines): [${ids}]`);
  }
  if (chain) {
    hintParts.push(`🔗 Chain: ${chain.chain_name} — ${chain.purpose}`);
  }

  const cached = excerpts.every(e => excerptCache.has(e.skill_id));

  return {
    success: true,
    call_number: callNumber,
    domain,
    chain: chain || undefined,
    excerpts,
    total_lines_loaded: totalLines,
    hint: hintParts.join(" | ") || "No skills matched",
    cached
  };
}

// ============================================================================
// UTILITY: Get all loaded excerpts as a single context block
// Used by _context injection to include skill knowledge
// ============================================================================

export function getLoadedExcerptsBlock(result: SkillAutoLoadResult): string {
  if (result.excerpts.length === 0) return "";
  
  const parts: string[] = [];
  for (const ex of result.excerpts) {
    if (ex.key_content.trim()) {
      parts.push(`--- ${ex.title} (${ex.lines_total} lines, ${ex.sections.length} sections) ---`);
      parts.push(ex.key_content);
    }
  }
  return parts.join("\n");
}

// ============================================================================
// UTILITY: Clear cache (for testing or session reset)
// ============================================================================

export function clearSkillCache(): void {
  excerptCache.clear();
  cacheSessionId = "";
}
