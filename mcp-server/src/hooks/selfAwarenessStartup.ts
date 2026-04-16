/**
 * Self-Awareness Startup Hook
 *
 * Automatically injects PRISM self-awareness context at session start.
 * Works with both Claude Code CLI and Codex web interface.
 *
 * USAGE:
 * 1. Add to .claude/hooks/SessionStart.json (CLI)
 * 2. Include in CLAUDE.md auto-generated section (Codex)
 * 3. Call refreshSelfAwareness() at session start
 *
 * @module hooks/selfAwarenessStartup
 */

import {
  prismSelfAwarenessEngine,
  generateClaudeMdContext,
  generateMinimalContext,
  refreshSelfAwareness,
  CapabilityManifest
} from "../engines/PRISMSelfAwarenessEngine.js";
import * as fs from "fs/promises";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface StartupResult {
  success: boolean;
  manifest: CapabilityManifest | null;
  contextInjected: boolean;
  contextSize: "full" | "minimal" | "none";
  message: string;
  timing: {
    totalMs: number;
    manifestMs: number;
    contextMs: number;
  };
}

export interface StartupConfig {
  contextMode: "full" | "minimal" | "auto";
  injectToClaudeMd: boolean;
  claudeMdPath?: string;
  reportToStdout: boolean;
  maxTokenBudget?: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: StartupConfig = {
  contextMode: "auto",
  injectToClaudeMd: false,
  claudeMdPath: undefined,
  reportToStdout: true,
  maxTokenBudget: 1000
};

// ============================================================================
// STARTUP FUNCTIONS
// ============================================================================

/**
 * Run self-awareness startup
 * Call this at the beginning of each session
 */
export async function runSelfAwarenessStartup(
  config: Partial<StartupConfig> = {}
): Promise<StartupResult> {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const timing = {
    totalMs: 0,
    manifestMs: 0,
    contextMs: 0
  };

  try {
    // Refresh manifest
    const manifestStart = Date.now();
    const { manifest, context, minimalContext } = await refreshSelfAwareness();
    timing.manifestMs = Date.now() - manifestStart;

    // Determine context size
    const contextStart = Date.now();
    let contextSize: "full" | "minimal" | "none" = "none";
    let contextToUse = "";

    if (cfg.contextMode === "full") {
      contextToUse = context;
      contextSize = "full";
    } else if (cfg.contextMode === "minimal") {
      contextToUse = minimalContext;
      contextSize = "minimal";
    } else {
      // Auto mode: use minimal if budget is tight
      const fullTokens = estimateTokens(context);
      const minimalTokens = estimateTokens(minimalContext);

      if (cfg.maxTokenBudget && fullTokens > cfg.maxTokenBudget) {
        contextToUse = minimalContext;
        contextSize = "minimal";
      } else {
        contextToUse = context;
        contextSize = "full";
      }
    }

    // Inject to CLAUDE.md if configured
    let contextInjected = false;
    if (cfg.injectToClaudeMd && cfg.claudeMdPath) {
      try {
        await injectToClaudeMd(cfg.claudeMdPath, contextToUse);
        contextInjected = true;
      } catch {
        // Injection failed, continue without it
      }
    }

    timing.contextMs = Date.now() - contextStart;
    timing.totalMs = Date.now() - startTime;

    // Report to stdout if configured
    if (cfg.reportToStdout) {
      console.log(formatStartupReport(manifest, contextSize, timing));
    }

    return {
      success: true,
      manifest,
      contextInjected,
      contextSize,
      message: `Self-awareness loaded: ${manifest.counts.dispatchers}d/${manifest.counts.actions}a/${manifest.counts.engines}e`,
      timing
    };

  } catch (error) {
    timing.totalMs = Date.now() - startTime;

    return {
      success: false,
      manifest: null,
      contextInjected: false,
      contextSize: "none",
      message: `Self-awareness startup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      timing
    };
  }
}

/**
 * Quick self-awareness check (minimal overhead)
 * Returns a one-liner suitable for status displays
 */
export function quickSelfAwarenessCheck(): string {
  const manifest = prismSelfAwarenessEngine.getManifest();
  return `PRISM: ${manifest.counts.dispatchers}d/${manifest.counts.actions}a/${manifest.counts.engines}e ready`;
}

/**
 * Get self-awareness context for injection
 * Use this when you need the context string without running full startup
 */
export function getSelfAwarenessContext(mode: "full" | "minimal" = "full"): string {
  return mode === "full" ? generateClaudeMdContext() : generateMinimalContext();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Inject context to CLAUDE.md file
 */
async function injectToClaudeMd(claudeMdPath: string, context: string): Promise<void> {
  const fullPath = path.resolve(claudeMdPath);

  let content: string;
  try {
    content = await fs.readFile(fullPath, "utf-8");
  } catch {
    content = "";
  }

  // Find and replace self-awareness section, or append
  const sectionStart = "# PRISM Agent Self-Awareness Context";
  const sectionEnd = "# "; // Next section header

  const startIndex = content.indexOf(sectionStart);

  if (startIndex !== -1) {
    // Find next section header after self-awareness
    const afterStart = content.indexOf(sectionEnd, startIndex + sectionStart.length);
    const endIndex = afterStart !== -1 ? afterStart : content.length;

    // Replace existing section
    content = content.slice(0, startIndex) + context + "\n\n" + content.slice(endIndex);
  } else {
    // Append to end
    content = content.trim() + "\n\n" + context + "\n";
  }

  await fs.writeFile(fullPath, content, "utf-8");
}

/**
 * Estimate token count
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

/**
 * Format startup report for stdout
 */
function formatStartupReport(
  manifest: CapabilityManifest,
  contextSize: "full" | "minimal" | "none",
  timing: { totalMs: number; manifestMs: number; contextMs: number }
): string {
  const lines = [
    "┌─────────────────────────────────────────────────────┐",
    "│ PRISM Self-Awareness Loaded                         │",
    "├─────────────────────────────────────────────────────┤",
    `│ Dispatchers: ${manifest.counts.dispatchers.toString().padEnd(4)} Actions: ${manifest.counts.actions.toString().padEnd(5)} Engines: ${manifest.counts.engines.toString().padEnd(5)}│`,
    `│ Context: ${contextSize.padEnd(8)} Loaded in: ${timing.totalMs}ms${" ".repeat(Math.max(0, 18 - timing.totalMs.toString().length))}│`,
    "└─────────────────────────────────────────────────────┘"
  ];

  return lines.join("\n");
}

// ============================================================================
// HOOK EXPORTS (for use in hooks system)
// ============================================================================

/**
 * SessionStart hook handler
 * Register this in .claude/hooks/
 */
export const sessionStartHook = {
  name: "self-awareness-startup",
  phase: "pre",
  priority: 100, // Run early

  async execute(): Promise<{ success: boolean; output: string }> {
    const result = await runSelfAwarenessStartup({
      contextMode: "auto",
      reportToStdout: false
    });

    return {
      success: result.success,
      output: result.message
    };
  }
};

/**
 * Compact survival hook handler
 * Preserves self-awareness across compaction
 */
export const compactSurvivalHook = {
  name: "self-awareness-survival",
  phase: "post",

  async execute(): Promise<{ success: boolean; output: string }> {
    // Re-inject minimal context after compaction
    const context = generateMinimalContext();
    return {
      success: true,
      output: `Self-awareness preserved: ${context}`
    };
  }
};
