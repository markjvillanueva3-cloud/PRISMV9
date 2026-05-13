#!/usr/bin/env node
// tier: T4
import fs from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
// Remove the next 2 lines to re-enable. See .claude/helpers/apply-hook-fixes.mjs
process.stdout.write(JSON.stringify({ continue: true })); process.exit(0);
/**
 * lathe-master-post-quality-gate.mjs — UserPromptSubmit hook
 *
 * Detects lathe G-code patterns in user prompts and:
 * 1. Validates via LatheMasterPostSelfAwarenessEngine
 * 2. Suggests Master Post corrections
 * 3. Warns on deprecated/unsafe constructs
 * 4. Recommends /lathe-master-post for complex operations
 *
 * FIRES ON: UserPromptSubmit
 * BLOCKING: never — adds context only
 *
 * @milestone LATHE-MASTER U-LTH32
 * @version 1.0.0
 */


function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// LATHE G-CODE PATTERNS
// ============================================================================

const LATHE_INDICATORS = {
  // Lathe-specific G-codes
  gcodes: [
    /G7[012]\b/i, // Canned cycles (G70 finishing, G71 roughing, G72 facing)
    /G7[345]\b/i, // Threading cycles (G73, G74 peck, G75 grooving)
    /G76\b/i, // Threading cycle
    /G32\b/i, // Thread cutting
    /G92\b[^.]/i, // Thread cutting (not G92.1 limit)
    /G96\b/i, // Constant surface speed
    /G97\b/i, // Constant RPM
    /G50\s+S/i, // Max spindle speed limit
  ],

  // Lathe-specific M-codes
  mcodes: [
    /M0?3\b/i, // Spindle CW
    /M0?4\b/i, // Spindle CCW
    /M0?5\b/i, // Spindle stop
    /M41\b/i, // Low gear
    /M42\b/i, // High gear
  ],

  // Lathe-specific keywords
  keywords: [
    /\bOD\s*(turn|rough|finish)/i,
    /\bID\s*(bore|rough|finish)/i,
    /\bfacing\b/i,
    /\bparting\b/i,
    /\bgrooving\b/i,
    /\bthreading\b/i,
    /\btapping\b/i,
    /\bturret\b/i,
    /\bchuck\b/i,
    /\btailstock\b/i,
    /\bcoolant\b.*\bturning\b/i,
    /\bbar\s*puller\b/i,
    /\blive\s*tool/i,
    /\bsub[-\s]*spindle/i,
    /\bc[-\s]*axis/i,
    /\by[-\s]*axis\b/i,
  ],

  // Machine controller hints
  controllers: [
    /okuma\s*(lb|genos|multus|osp)/i,
    /fanuc\s*(31i|30i|16i).*[tl]/i,
    /haas\s*(st|ds|tl)/i,
    /mazak\s*(quick|slant|nexus)/i,
    /citizen\s*(l\d|cincom)/i,
    /mitsubishi\s*m8[0-9]/i,
  ],
};

// Dangerous patterns to warn about
const DANGEROUS_PATTERNS = [
  { pattern: /G50\s+S\s*0\b/i, warning: "G50 S0 removes spindle speed limit — dangerous" },
  { pattern: /G96\s+S\s*[5-9]\d{2,}/i, warning: "G96 with high SFM — verify spindle limit (G50)" },
  { pattern: /G00\s+[XZ].*[XZ]/i, warning: "Rapid with multiple axes — verify clearance" },
  { pattern: /M0?3\b[^;]*\bS\s*0\b/i, warning: "Spindle start with S0 — missing speed" },
  { pattern: /G7[12]\s+[^;]*D\s*0\b/i, warning: "Canned cycle with D0 — missing depth of cut" },
  { pattern: /G76.*Q\s*0\b/i, warning: "Threading with Q0 — missing thread depth" },
];

// Deprecated patterns to suggest alternatives
const DEPRECATED_PATTERNS = [
  { pattern: /G92\s+[XZ]/i, alternative: "G71/G72 canned cycles", reason: "G92 threading deprecated on modern controllers" },
  { pattern: /N\d+\s*;/i, alternative: "Remove unnecessary line numbers", reason: "Line numbers in comments waste memory" },
  { pattern: /\(.*\)\s*\(.*\)\s*\(.*\)/i, alternative: "Consolidate comments", reason: "Multiple comment blocks reduce readability" },
];

// ============================================================================
// DETECTION LOGIC
// ============================================================================

function detectLatheContext(prompt) {
  const detections = {
    isLathe: false,
    gcodes: [],
    mcodes: [],
    keywords: [],
    controllers: [],
    dangerous: [],
    deprecated: [],
    confidence: 0,
  };

  // Check G-codes
  for (const regex of LATHE_INDICATORS.gcodes) {
    const matches = prompt.match(regex);
    if (matches) {
      detections.gcodes.push(...matches);
    }
  }

  // Check M-codes
  for (const regex of LATHE_INDICATORS.mcodes) {
    const matches = prompt.match(regex);
    if (matches) {
      detections.mcodes.push(...matches);
    }
  }

  // Check keywords
  for (const regex of LATHE_INDICATORS.keywords) {
    if (regex.test(prompt)) {
      detections.keywords.push(regex.source);
    }
  }

  // Check controllers
  for (const regex of LATHE_INDICATORS.controllers) {
    const matches = prompt.match(regex);
    if (matches) {
      detections.controllers.push(...matches);
    }
  }

  // Check dangerous patterns
  for (const { pattern, warning } of DANGEROUS_PATTERNS) {
    if (pattern.test(prompt)) {
      detections.dangerous.push(warning);
    }
  }

  // Check deprecated patterns
  for (const { pattern, alternative, reason } of DEPRECATED_PATTERNS) {
    if (pattern.test(prompt)) {
      detections.deprecated.push({ alternative, reason });
    }
  }

  // Calculate confidence
  const hits =
    detections.gcodes.length * 3 +
    detections.mcodes.length * 1 +
    detections.keywords.length * 2 +
    detections.controllers.length * 4;

  detections.confidence = Math.min(hits / 10, 1);
  detections.isLathe = detections.confidence >= 0.3;

  return detections;
}

// ============================================================================
// HOOK MAIN
// ============================================================================

async function main() {
  const input = readStdinSafe();

  let hookData;
  try {
    hookData = JSON.parse(input);
  } catch {
    // Not JSON — ignore
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = hookData?.prompt || hookData?.message || "";
  if (!prompt || prompt.length < 10) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const detection = detectLatheContext(prompt);

  if (!detection.isLathe) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Build context injection
  const lines = [];
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("LATHE MASTER POST — Quality Gate (auto-detected lathe context)");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  if (detection.gcodes.length > 0) {
    lines.push(`G-codes detected: ${[...new Set(detection.gcodes)].join(", ")}`);
  }

  if (detection.controllers.length > 0) {
    lines.push(`Controller: ${detection.controllers[0]}`);
  }

  // Dangerous warnings (high priority)
  if (detection.dangerous.length > 0) {
    lines.push("");
    lines.push("⚠️  SAFETY WARNINGS:");
    for (const warning of detection.dangerous) {
      lines.push(`   • ${warning}`);
    }
  }

  // Deprecated suggestions
  if (detection.deprecated.length > 0) {
    lines.push("");
    lines.push("💡 MODERNIZATION SUGGESTIONS:");
    for (const { alternative, reason } of detection.deprecated) {
      lines.push(`   • Use ${alternative} — ${reason}`);
    }
  }

  // Recommend Master Post command
  lines.push("");
  lines.push("AVAILABLE COMMANDS:");
  lines.push("   /lathe-master-post <machine-id> — Full validation + emit pipeline");
  lines.push("   /lathe-master-post <machine-id> --explain — Deep reasoning on code choices");
  lines.push("   /lathe-master-post --regression — Regression matrix validation");
  lines.push("");
  lines.push("MCP ACTIONS:");
  lines.push("   prism_cam:lathe_masterpost_route — Route to correct sub-post");
  lines.push("   prism_cam:lathe_masterpost_validate — 27-validator check");
  lines.push("   prism_cam:lathe_masterpost_ensemble_run — Cross-check across posts");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log(
    JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: lines.join("\n"), } })
  );
}

main().catch((err) => {
  console.error("lathe-master-post-quality-gate error:", err.message);
  console.log(JSON.stringify({ continue: true }));
});
