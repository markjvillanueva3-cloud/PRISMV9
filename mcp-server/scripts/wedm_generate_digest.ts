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

function scanSkills(): string[] {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (!home) return [];
  const skillsDir = path.resolve(home, ".claude/commands");
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir)
    .filter((f) => /^(wedm|wire-edm)/i.test(f));
}

function scanHooks(): string[] {
  const hooksDir = path.resolve(__dirname, "../src/hooks");
  if (!fs.existsSync(hooksDir)) return [];
  const out: string[] = [];
  const files = fs
    .readdirSync(hooksDir)
    .filter((f) => /^WEDM.*Hooks\.ts$/.test(f) || /^WireEDM.*Hooks\.ts$/.test(f));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(hooksDir, file), "utf-8");
      const idMatches = content.match(/id:\s*"(wedm-[a-z0-9-]+)"/g) || [];
      for (const m of idMatches) {
        const id = (m.match(/"(wedm-[a-z0-9-]+)"/) || [])[1];
        if (id) out.push(`${file}::${id}`);
      }
    } catch {}
  }
  return out.sort();
}

function scanActions(): number {
  const dispatchersDir = path.resolve(__dirname, "../src/tools/dispatchers");
  if (!fs.existsSync(dispatchersDir)) return 0;
  const edmDispatcher = path.join(dispatchersDir, "edmDispatcher.ts");
  if (!fs.existsSync(edmDispatcher)) return 0;
  const content = fs.readFileSync(edmDispatcher, "utf-8");
  const enumMatches = content.match(/z\.enum\(\[([\s\S]*?)\]\)/);
  if (!enumMatches) return 0;
  const strings = enumMatches[1].match(/"[a-z_][a-z0-9_]*"/gi) || [];
  return new Set(strings).size;
}

interface DigestJSON {
  schemaVersion: 1;
  generated: string;
  source: "scripts/wedm_generate_digest.ts";
  engines: { count: number; names: string[] };
  playbooks: { count: number; ids: string[] };
  state_files: { count: number; names: string[] };
  skills: { count: number; names: string[] };
  hooks: { count: number; names: string[] };
  actions: { count: number; source: "edmDispatcher.ts z.enum" };
}

function generateJSON(): DigestJSON {
  const engines = scanWEDMEngines();
  const playbooks = scanPlaybooks();
  const stateFiles = scanStateFiles();
  const skills = scanSkills();
  const hooks = scanHooks();
  const actionCount = scanActions();
  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    source: "scripts/wedm_generate_digest.ts",
    engines: { count: engines.length, names: engines.map((e) => e.name) },
    playbooks: { count: playbooks.length, ids: playbooks.map((p) => p.id) },
    state_files: { count: stateFiles.length, names: stateFiles },
    skills: { count: skills.length, names: skills },
    hooks: { count: hooks.length, names: hooks },
    actions: { count: actionCount, source: "edmDispatcher.ts z.enum" },
  };
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
  console.log("\nGenerating WEDM_DIGEST.md + WEDM_DIGEST.json...");

  const digest = generateDigest();
  const mdPath = path.resolve(__dirname, "../data/docs/WEDM_DIGEST.md");
  const mdDir = path.dirname(mdPath);
  if (!fs.existsSync(mdDir)) fs.mkdirSync(mdDir, { recursive: true });
  fs.writeFileSync(mdPath, digest);
  console.log(`  MD  saved: ${mdPath} (${digest.split("\n").length} lines)`);

  const json = generateJSON();
  const jsonPath = path.resolve(__dirname, "../data/state/WEDM_DIGEST.json");
  const jsonDir = path.dirname(jsonPath);
  if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n");
  console.log(`  JSON saved: ${jsonPath}`);
  console.log(
    `    engines=${json.engines.count} hooks=${json.hooks.count} skills=${json.skills.count} playbooks=${json.playbooks.count} state_files=${json.state_files.count} actions=${json.actions.count}`
  );
}

main().catch(console.error);
