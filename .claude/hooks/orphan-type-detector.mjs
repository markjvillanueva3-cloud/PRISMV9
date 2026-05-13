#!/usr/bin/env node
// tier: T3
/**
 * orphan-type-detector.mjs — Phase 0.9 Specific Orphan Type Detection
 *
 * PostToolUse hook that detects specific orphan types after file writes:
 * - Engine without dispatcher
 * - Action without schema
 * - Action without case
 * - Schema without action
 * - Skill without hook anchor
 * - Hook without registration
 *
 * @phase Universal 0.9 — Orphan Detection at Write-Time
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = process.env.PRISM_ROOT || "H:/prism/mcp-server";
const ENGINE_USAGE_PATH = path.join(ROOT, "data/state/ENGINE_USAGE_INDEX.json");
const ACTION_RESOLUTION_PATH = path.join(ROOT, "data/state/ACTION_RESOLUTION_INDEX.json");
const SKILL_MANIFEST_PATH = path.join(ROOT, "data/state/SKILL_MANIFEST_INDEX.json");
const HOOK_GUARD_PATH = path.join(ROOT, "data/state/HOOK_GUARD_INDEX.json");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));

async function main(rawInput) {
  try {
    const hookInput = JSON.parse(rawInput);
    await processHook(hookInput);
  } catch (error) {
    console.log(JSON.stringify({ orphanCheck: "error", message: error.message }));
  }
}

async function processHook(hookInput) {
  const { tool_name, tool_input } = hookInput;

  if (tool_name !== "Write" && tool_name !== "Edit") {
    return;
  }

  const filePath = tool_input?.file_path || "";
  const warnings = [];

  // Check engine files
  if (filePath.includes("/engines/") && filePath.endsWith(".ts") && !filePath.includes(".test.")) {
    const engineWarnings = await checkEngineOrphans(filePath);
    warnings.push(...engineWarnings);
  }

  // Check dispatcher files
  if (filePath.includes("/dispatchers/") && filePath.endsWith(".ts")) {
    const dispatcherWarnings = await checkDispatcherOrphans(filePath);
    warnings.push(...dispatcherWarnings);
  }

  // Check skill files
  if (filePath.includes("/commands/") && filePath.endsWith(".md")) {
    const skillWarnings = await checkSkillOrphans(filePath);
    warnings.push(...skillWarnings);
  }

  // Check hook files
  if (filePath.includes("/hooks/") && (filePath.endsWith(".mjs") || filePath.endsWith(".ts"))) {
    const hookWarnings = await checkHookOrphans(filePath);
    warnings.push(...hookWarnings);
  }

  if (warnings.length > 0) {
    console.log(`[orphan-type-detector] ${warnings.length} potential orphan(s) detected:`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

async function checkEngineOrphans(filePath) {
  const warnings = [];
  const fileName = path.basename(filePath, ".ts");

  if (!fileName.endsWith("Engine") || fileName === "index") {
    return warnings;
  }

  try {
    if (!fs.existsSync(ENGINE_USAGE_PATH)) {
      return warnings;
    }

    const usageIndex = JSON.parse(fs.readFileSync(ENGINE_USAGE_PATH, "utf-8"));
    const usage = usageIndex.engines?.[fileName];

    if (!usage) {
      warnings.push(`ENGINE_WITHOUT_DISPATCHER: ${fileName} not found in ENGINE_USAGE_INDEX (new or unindexed)`);
      return warnings;
    }

    if (!usage.dispatchers || usage.dispatchers.length === 0) {
      warnings.push(`ENGINE_WITHOUT_DISPATCHER: ${fileName} has no dispatcher imports`);
    }

  } catch {
    // Index not available
  }

  return warnings;
}

async function checkDispatcherOrphans(filePath) {
  const warnings = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // Check for actions defined in z.enum but missing schema
    const enumMatch = content.match(/z\.enum\(\s*\[([\s\S]*?)\]\s*\)/);
    if (enumMatch) {
      const actionsStr = enumMatch[1];
      const actions = actionsStr.match(/"([^"]+)"/g)?.map((a) => a.replace(/"/g, "")) || [];

      // Look for actionSchemas or schemas Record
      const schemasMatch = content.match(/(?:actionSchemas|schemas)\s*[=:]\s*\{([\s\S]*?)\}/);

      if (schemasMatch) {
        const schemasContent = schemasMatch[1];

        for (const action of actions) {
          if (!schemasContent.includes(action)) {
            warnings.push(`ACTION_WITHOUT_SCHEMA: "${action}" in enum but not in schemas`);
          }
        }
      }

      // Look for switch cases
      const switchMatch = content.match(/switch\s*\([^)]+\)\s*\{([\s\S]*?)\n\s*\}/);
      if (switchMatch) {
        const switchContent = switchMatch[1];

        for (const action of actions) {
          if (!switchContent.includes(`"${action}"`) && !switchContent.includes(`'${action}'`)) {
            warnings.push(`ACTION_WITHOUT_CASE: "${action}" in enum but no switch case`);
          }
        }
      }
    }

    // Check for schemas without corresponding action
    const schemaKeys = content.match(/["']([a-z_]+)["']\s*:/g);
    if (schemaKeys && enumMatch) {
      const actionsStr = enumMatch[1];
      for (const key of schemaKeys) {
        const actionName = key.match(/["']([a-z_]+)["']/)?.[1];
        if (actionName && !actionsStr.includes(`"${actionName}"`)) {
          warnings.push(`SCHEMA_WITHOUT_ACTION: "${actionName}" in schemas but not in enum`);
        }
      }
    }

  } catch {
    // File not readable
  }

  return warnings;
}

async function checkSkillOrphans(filePath) {
  const warnings = [];
  const skillName = path.basename(filePath, ".md");

  try {
    if (!fs.existsSync(SKILL_MANIFEST_PATH)) {
      return warnings;
    }

    const skillIndex = JSON.parse(fs.readFileSync(SKILL_MANIFEST_PATH, "utf-8"));
    const skill = skillIndex.skills?.[skillName];

    if (!skill) {
      warnings.push(`SKILL_UNINDEXED: ${skillName} not in SKILL_MANIFEST_INDEX`);
      return warnings;
    }

    if (!skill.hooks || skill.hooks.length === 0) {
      warnings.push(`SKILL_WITHOUT_HOOK_ANCHOR: ${skillName} not referenced by any hook`);
    }

  } catch {
    // Index not available
  }

  return warnings;
}

async function checkHookOrphans(filePath) {
  const warnings = [];
  const hookFile = path.basename(filePath);

  // Check if hook is in settings.json
  try {
    const settingsPath = "H:/prism/.claude/settings.json";
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      const settingsStr = JSON.stringify(settings);

      if (!settingsStr.includes(hookFile)) {
        warnings.push(`HOOK_WITHOUT_REGISTRATION: ${hookFile} not found in settings.json`);
      }
    }
  } catch {
    // Settings not readable
  }

  return warnings;
}
