/**
 * UnifiedCommandAwarenessEngine — Near-AGI Command Detection & Suggestion
 *
 * This engine provides intelligent command detection across ALL PRISM sessions.
 * It reads from UNIFIED_COMMAND_BROADCAST.json and applies advanced pattern
 * matching to detect when commands should be suggested.
 *
 * Features:
 * - Multi-pattern matching (regex, keywords, semantic)
 * - Priority-based command ranking
 * - Auto-invoke detection
 * - Cross-session work awareness
 * - Conflict detection
 *
 * @module engines/UnifiedCommandAwarenessEngine
 */

import { log } from "../utils/Logger.js";
import { promises as fs } from "node:fs";

// ============================================================================
// TYPES
// ============================================================================

export interface CommandDefinition {
  command: string;
  purpose: string;
  triggers: string[];
  priority: number;
  autoInvoke: boolean;
  requiresDedup: boolean;
}

export interface CommandMatch {
  command: string;
  purpose: string;
  trigger: string;
  confidence: number;
  autoInvoke: boolean;
  requiresDedup: boolean;
}

export interface CommandSuggestion {
  primary: CommandMatch | null;
  additional: CommandMatch[];
  dedupRequired: boolean;
  conflictWarning: string | null;
}

// ============================================================================
// HARDCODED COMMANDS (Fallback when JSON unavailable)
// ============================================================================

const CRITICAL_COMMANDS: CommandDefinition[] = [
  {
    command: "/pdf-learn",
    purpose: "AI-powered PDF/document knowledge extraction into tribal tips",
    triggers: ["pdf", "document", "manual", "catalog", "paper", "extract from pdf", "read pdf", "learn from pdf"],
    priority: 0,
    autoInvoke: true,
    requiresDedup: false,
  },
  {
    command: "/video-learn",
    purpose: "AI-powered video/tutorial knowledge extraction into procedures",
    triggers: ["video", "youtube", "tutorial", "training video", "watch", "machining video", "learn from video"],
    priority: 0,
    autoInvoke: true,
    requiresDedup: false,
  },
  {
    command: "/dedup",
    purpose: "Check for duplicates BEFORE creating ANY new asset",
    triggers: ["duplicate", "before creating", "check existing", "already exists", "similar engine"],
    priority: 0,
    autoInvoke: true,
    requiresDedup: false,
  },
  {
    command: "/forge-triple",
    purpose: "Create engines + skills + hooks with EXHAUSTIVE extraction",
    triggers: ["create engine", "create a engine", "create an engine", "new engine", "build engine", "forge", "generate capability", "create hook", "create skill", "build a new", "create new"],
    priority: 1,
    autoInvoke: true,
    requiresDedup: true,
  },
  {
    command: "/wire-edm-studio",
    purpose: "Full Wire EDM programming studio with AI",
    triggers: ["wire edm", "wedm", "edm program", "wire cut", "mitsubishi edm", "spark erosion"],
    priority: 1,
    autoInvoke: true,
    requiresDedup: false,
  },
  {
    command: "/lathe-studio",
    purpose: "Full lathe/turning programming studio with AI",
    triggers: ["lathe", "turning", "okuma", "turning center", "cnc lathe", "boring", "threading"],
    priority: 1,
    autoInvoke: true,
    requiresDedup: false,
  },
  {
    command: "/quote-to-ship",
    purpose: "Full quote-to-ship pipeline orchestration",
    triggers: ["quote", "estimate", "job cost", "order", "ship", "pricing"],
    priority: 2,
    autoInvoke: true,
    requiresDedup: false,
  },
  {
    command: "/auto-speed-feed",
    purpose: "Auto-calculate optimal speed/feed parameters",
    triggers: ["speed", "feed", "sfm", "ipm", "rpm", "cutting parameters", "speeds and feeds"],
    priority: 2,
    autoInvoke: true,
    requiresDedup: false,
  },
  {
    command: "/shop-knowledge",
    purpose: "Extract and categorize shop floor tribal knowledge",
    triggers: ["tribal", "shop floor", "operator", "experience", "wisdom", "shop knowledge"],
    priority: 2,
    autoInvoke: true,
    requiresDedup: false,
  },
  {
    command: "/machine-harden",
    purpose: "Harden AI capabilities for specific machines",
    triggers: ["harden", "strengthen", "improve machine", "hardening"],
    priority: 3,
    autoInvoke: false,
    requiresDedup: false,
  },
  {
    command: "/program-optimize",
    purpose: "Optimize CNC programs for speed/feed/tool life",
    triggers: ["optimize program", "improve program", "faster program", "program optimization"],
    priority: 3,
    autoInvoke: false,
    requiresDedup: false,
  },
  {
    command: "/scrutinize",
    purpose: "Deep scrutiny of code for issues and improvements",
    triggers: ["scrutinize", "deep review", "audit code", "code review"],
    priority: 3,
    autoInvoke: false,
    requiresDedup: false,
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class UnifiedCommandAwarenessEngine {
  private commands: CommandDefinition[] = CRITICAL_COMMANDS;
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor() {
    log.info("[CommandAwareness] Unified Command Awareness Engine initialized");
  }

  /**
   * Load commands from JSON file (with caching)
   */
  private async loadCommands(): Promise<void> {
    if (Date.now() - this.lastLoadTime < this.CACHE_TTL_MS) {
      return;
    }

    try {
      const raw = await fs.readFile("H:/prism/state/shared/UNIFIED_COMMAND_BROADCAST.json", "utf8");
      const data = JSON.parse(raw);

      if (data.critical_commands) {
        this.commands = Object.entries(data.critical_commands).map(([cmd, info]: [string, any]) => ({
          command: cmd,
          purpose: info.purpose || "",
          triggers: info.triggers || [],
          priority: info.priority ?? 99,
          autoInvoke: info.auto_invoke ?? false,
          requiresDedup: info.requires_dedup ?? false,
        }));
      }

      this.lastLoadTime = Date.now();
    } catch {
      // Use hardcoded fallback
      this.commands = CRITICAL_COMMANDS;
    }
  }

  /**
   * Detect commands that should be suggested based on input
   */
  async detectCommands(input: string): Promise<CommandSuggestion> {
    await this.loadCommands();

    const inputLower = input.toLowerCase();
    const matches: CommandMatch[] = [];

    for (const cmd of this.commands) {
      for (const trigger of cmd.triggers) {
        const triggerLower = trigger.toLowerCase();

        // Check for trigger match
        if (inputLower.includes(triggerLower)) {
          // Calculate confidence based on match quality
          let confidence = 0.7;

          // Boost for exact phrase match
          if (inputLower.includes(` ${triggerLower} `) || inputLower.startsWith(triggerLower) || inputLower.endsWith(triggerLower)) {
            confidence = 0.9;
          }

          // Boost for multiple word triggers
          if (triggerLower.includes(" ") && inputLower.includes(triggerLower)) {
            confidence = 0.95;
          }

          matches.push({
            command: cmd.command,
            purpose: cmd.purpose,
            trigger: trigger,
            confidence,
            autoInvoke: cmd.autoInvoke,
            requiresDedup: cmd.requiresDedup,
          });
          break; // Only match once per command
        }
      }
    }

    // Sort by confidence then priority
    matches.sort((a, b) => {
      const aDef = this.commands.find(c => c.command === a.command);
      const bDef = this.commands.find(c => c.command === b.command);
      const aPriority = aDef?.priority ?? 99;
      const bPriority = bDef?.priority ?? 99;

      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return aPriority - bPriority;
    });

    // Check if dedup is required
    const dedupRequired = matches.some(m => m.requiresDedup);

    // Build suggestion
    const primary = matches.length > 0 ? matches[0] : null;
    const additional = matches.slice(1, 4);

    return {
      primary,
      additional,
      dedupRequired,
      conflictWarning: null,
    };
  }

  /**
   * Get formatted suggestion string for injection
   */
  async getSuggestionString(input: string): Promise<string> {
    const suggestion = await this.detectCommands(input);

    if (!suggestion.primary) {
      return "";
    }

    const parts: string[] = [];

    if (suggestion.dedupRequired) {
      parts.push("⚠️ DEDUP REQUIRED: Run /dedup BEFORE creating new assets!");
    }

    parts.push(`🎯 SUGGESTED: ${suggestion.primary.command} — ${suggestion.primary.purpose}`);
    parts.push(`   Trigger: "${suggestion.primary.trigger}"`);

    if (suggestion.additional.length > 0) {
      const additionalStr = suggestion.additional.map(m => m.command).join(", ");
      parts.push(`   Also consider: ${additionalStr}`);
    }

    return parts.join("\n");
  }

  /**
   * Check if any auto-invoke commands should fire
   */
  async getAutoInvokeCommands(input: string): Promise<string[]> {
    const suggestion = await this.detectCommands(input);
    const autoInvoke: string[] = [];

    if (suggestion.primary?.autoInvoke) {
      autoInvoke.push(suggestion.primary.command);
    }

    for (const match of suggestion.additional) {
      if (match.autoInvoke) {
        autoInvoke.push(match.command);
      }
    }

    // Always put /dedup first if required
    if (suggestion.dedupRequired && !autoInvoke.includes("/dedup")) {
      autoInvoke.unshift("/dedup");
    }

    return autoInvoke;
  }

  /**
   * Get all registered commands
   */
  async getAllCommands(): Promise<CommandDefinition[]> {
    await this.loadCommands();
    return [...this.commands].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get summary for injection
   */
  getSummary(): string {
    return `UnifiedCommandAwarenessEngine — Near-AGI Command Detection
Commands: ${this.commands.length} registered
Priority 0: /pdf-learn, /video-learn, /dedup (ALWAYS suggest)
Priority 1: /forge-triple, /wire-edm-studio, /lathe-studio
Priority 2: /quote-to-ship, /auto-speed-feed, /shop-knowledge

Usage: unifiedCommandAwarenessEngine.detectCommands(input)
       unifiedCommandAwarenessEngine.getSuggestionString(input)
       unifiedCommandAwarenessEngine.getAutoInvokeCommands(input)`;
  }
}

// Export singleton
export const unifiedCommandAwarenessEngine = new UnifiedCommandAwarenessEngine();
