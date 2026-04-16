#!/usr/bin/env npx ts-node
/**
 * WEDM Digest Generator
 * Phase 0.11 U-WEDM-DOC1 - WEDM AGI Roadmap
 *
 * Auto-generates WEDM_DIGEST.md from live WEDM asset inventory.
 * Output: mcp-server/data/docs/WEDM_DIGEST.md
 *
 * Usage: npx ts-node scripts/wedm_generate_digest.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EngineInfo {
  name: string;
  path: string;
  description: string;
}

function scanWEDMEngines(): EngineInfo[] {
  const enginesDir = path.resolve(__dirname, "../src/engines");
  const engines: EngineInfo[] = [];

  const files = fs.readdirSync(enginesDir);
  const pattern = /^(WEDM|Wedm|EDM|WireEDM|MicroEDM|SinkerEDM|Stochastic EDM|RecastLayer)/;

  for (const file of files) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
    if (!pattern.test(file)) continue;

    const fullPath = path.join(enginesDir, file);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Extract description from JSDoc
    let description = "No description";
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n]+)/);
    if (jsdocMatch) {
      description = jsdocMatch[1].trim();
    }

    engines.push({
      name: file.replace(".ts", ""),
      path: `src/engines/${file}`,
      description,
    });
  }

  return engines.sort((a, b) => a.name.localeCompare(b.name));
}

function scanPlaybooks(): Array<{ id: string; name: string; steps: number }> {
  const playbooksDir = path.resolve(__dirname, "../data/playbooks");
  if (!fs.existsSync(playbooksDir)) return [];

  const files = fs.readdirSync(playbooksDir).filter((f) => f.startsWith("wedm_"));
  const playbooks: Array<{ id: string; name: string; steps: number }> = [];

  for (const file of files) {
    try {
      const content = JSON.parse(
        fs.readFileSync(path.join(playbooksDir, file), "utf-8")
      );
      playbooks.push({
        id: content.id ?? file.replace(".json", ""),
        name: content.name ?? file,
        steps: (content.steps ?? []).length,
      });
    } catch (err) {
      // skip
    }
  }

  return playbooks;
}

function scanStateFiles(): string[] {
  const stateDir = path.resolve(__dirname, "../data/state");
  if (!fs.existsSync(stateDir)) return [];

  return fs.readdirSync(stateDir).filter((f) => f.startsWith("WEDM_"));
}

function generateDigest(): string {
  const engines = scanWEDMEngines();
  const playbooks = scanPlaybooks();
  const stateFiles = scanStateFiles();

  const now = new Date().toISOString();

  let md = `# WEDM_DIGEST — Auto-Generated\n\n`;
  md += `**Generated:** ${now}\n`;
  md += `**Source:** \`scripts/wedm_generate_digest.ts\` (do not edit manually)\n\n`;
  md += `---\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|------:|\n`;
  md += `| Engines | ${engines.length} |\n`;
  md += `| Playbooks | ${playbooks.length} |\n`;
  md += `| State Files | ${stateFiles.length} |\n\n`;

  md += `## Engines (${engines.length})\n\n`;
  md += `| Engine | Description |\n`;
  md += `|--------|-------------|\n`;
  for (const e of engines) {
    const shortDesc = e.description.substring(0, 80);
    md += `| \`${e.name}\` | ${shortDesc} |\n`;
  }
  md += `\n`;

  md += `## Workflow Playbooks (${playbooks.length})\n\n`;
  md += `| Playbook | Name | Steps |\n`;
  md += `|----------|------|------:|\n`;
  for (const p of playbooks) {
    md += `| \`${p.id}\` | ${p.name} | ${p.steps} |\n`;
  }
  md += `\n`;

  md += `## State Files (${stateFiles.length})\n\n`;
  for (const f of stateFiles) {
    md += `- \`data/state/${f}\`\n`;
  }
  md += `\n`;

  md += `---\n`;
  md += `> Regenerate: \`npx ts-node scripts/wedm_generate_digest.ts\`\n`;

  return md;
}

async function main(): Promise<void> {
  console.log("\nGenerating WEDM_DIGEST.md...");

  const digest = generateDigest();
  const outputPath = path.resolve(__dirname, "../data/docs/WEDM_DIGEST.md");

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, digest);

  console.log(`Digest saved: ${outputPath}`);
  console.log(`  ${digest.split("\n").length} lines`);
}

main().catch(console.error);
