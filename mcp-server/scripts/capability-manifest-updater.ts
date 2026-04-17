#!/usr/bin/env npx ts-node
/**
 * capability-manifest-updater.ts — Phase 0.17 Manifest Updater
 *
 * Updates PRISM-COMMANDS-MANIFEST.md with current command inventory.
 * Scans H:/.claude/commands/ and generates manifest entries.
 */

import * as fs from "fs";
import * as path from "path";

const COMMANDS_DIR = "H:/.claude/commands";
const MANIFEST_PATH = "state/shared/PRISM-COMMANDS-MANIFEST.md";

interface CommandInfo {
  name: string;
  title: string;
  phase: string;
  description: string;
}

function extractCommandInfo(filePath: string): CommandInfo {
  const content = fs.readFileSync(filePath, "utf-8");
  const name = path.basename(filePath, ".md");

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].split("—")[0].trim() : name;

  // Extract phase
  const phaseMatch = content.match(/## Phase\s*\n+([^\n]+)/);
  const phase = phaseMatch ? phaseMatch[1].trim() : "unknown";

  // Extract description (first paragraph after title)
  const lines = content.split("\n");
  let description = "";
  let foundTitle = false;
  for (const line of lines) {
    if (line.startsWith("# ")) {
      foundTitle = true;
      continue;
    }
    if (foundTitle && line.trim() && !line.startsWith("#") && !line.startsWith("```")) {
      description = line.trim();
      break;
    }
  }

  return { name, title, phase, description };
}

function groupByDomain(commands: CommandInfo[]): Record<string, CommandInfo[]> {
  const domains: Record<string, CommandInfo[]> = {
    WEDM: [],
    Forge: [],
    Machine: [],
    Quality: [],
    Learning: [],
    AGI: [],
    Other: []
  };

  for (const cmd of commands) {
    if (cmd.name.startsWith("wedm")) domains.WEDM.push(cmd);
    else if (cmd.name.startsWith("forge")) domains.Forge.push(cmd);
    else if (cmd.name.includes("machine")) domains.Machine.push(cmd);
    else if (cmd.name.includes("quality") || cmd.name.includes("audit")) domains.Quality.push(cmd);
    else if (cmd.name.includes("learn") || cmd.name.includes("pdf") || cmd.name.includes("video")) domains.Learning.push(cmd);
    else if (cmd.name.includes("aware") || cmd.name.includes("reflect") || cmd.name.includes("svi")) domains.AGI.push(cmd);
    else domains.Other.push(cmd);
  }

  return domains;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       CAPABILITY MANIFEST UPDATER — Phase 0.17                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  // Scan commands
  if (!fs.existsSync(COMMANDS_DIR)) {
    console.error(`Commands directory not found: ${COMMANDS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith(".md"));
  const commands: CommandInfo[] = files.map(f => extractCommandInfo(path.join(COMMANDS_DIR, f)));

  console.log(`Found ${commands.length} commands`);

  // Group by domain
  const domains = groupByDomain(commands);

  // Generate manifest content
  let manifest = `# PRISM Commands Manifest\n\n`;
  manifest += `**Generated**: ${new Date().toISOString()}\n`;
  manifest += `**Total Commands**: ${commands.length}\n\n`;

  for (const [domain, cmds] of Object.entries(domains)) {
    if (cmds.length === 0) continue;

    manifest += `## ${domain} Commands (${cmds.length})\n\n`;
    manifest += `| Command | Description |\n`;
    manifest += `|---------|-------------|\n`;

    for (const cmd of cmds.sort((a, b) => a.name.localeCompare(b.name))) {
      manifest += `| \`/${cmd.name}\` | ${cmd.description.slice(0, 60)}${cmd.description.length > 60 ? "..." : ""} |\n`;
    }
    manifest += "\n";
  }

  if (dryRun) {
    console.log("[DRY RUN] Would write:");
    console.log(manifest.slice(0, 500) + "...");
  } else {
    const manifestPath = path.resolve(process.cwd(), "..", MANIFEST_PATH);
    const dir = path.dirname(manifestPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(manifestPath, manifest);
    console.log(`✓ Written: ${MANIFEST_PATH}`);
  }

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
