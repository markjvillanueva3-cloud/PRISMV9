#!/usr/bin/env npx ts-node
/**
 * commands-audit.ts — Phase 0.17 Command Audit Script
 *
 * Audits all slash commands for documentation coverage,
 * wiring completeness, and manifest synchronization.
 */

import * as fs from "fs";
import * as path from "path";

const COMMANDS_DIR = "H:/.claude/commands";
const MANIFEST_PATH = "state/shared/PRISM-COMMANDS-MANIFEST.md";

interface CommandAudit {
  name: string;
  hasUsage: boolean;
  hasImplementation: boolean;
  hasRelated: boolean;
  hasPhase: boolean;
  lineCount: number;
  inManifest: boolean;
}

function auditCommand(filePath: string): CommandAudit {
  const content = fs.readFileSync(filePath, "utf-8");
  const name = path.basename(filePath, ".md");

  return {
    name,
    hasUsage: content.includes("## Usage"),
    hasImplementation: content.includes("## Implementation"),
    hasRelated: content.includes("## Related"),
    hasPhase: content.includes("## Phase"),
    lineCount: content.split("\n").length,
    inManifest: false // Set later
  };
}

function loadManifestCommands(): Set<string> {
  const manifestPath = path.resolve(process.cwd(), "..", MANIFEST_PATH);
  const commands = new Set<string>();

  if (!fs.existsSync(manifestPath)) {
    return commands;
  }

  const content = fs.readFileSync(manifestPath, "utf-8");
  const matches = content.matchAll(/`\/([a-z-]+)`/g);
  for (const match of matches) {
    commands.add(match[1]);
  }

  return commands;
}

async function main() {
  const verbose = process.argv.includes("--verbose");
  const fix = process.argv.includes("--fix");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           COMMANDS AUDIT — Phase 0.17                         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  // Scan commands directory
  if (!fs.existsSync(COMMANDS_DIR)) {
    console.error(`Commands directory not found: ${COMMANDS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith(".md"));
  const manifestCommands = loadManifestCommands();
  const audits: CommandAudit[] = [];

  for (const file of files) {
    const audit = auditCommand(path.join(COMMANDS_DIR, file));
    audit.inManifest = manifestCommands.has(audit.name);
    audits.push(audit);
  }

  // Calculate stats
  const total = audits.length;
  const fullyDocumented = audits.filter(a => a.hasUsage && a.hasImplementation && a.hasRelated && a.hasPhase).length;
  const missingUsage = audits.filter(a => !a.hasUsage);
  const missingImpl = audits.filter(a => !a.hasImplementation);
  const missingRelated = audits.filter(a => !a.hasRelated);
  const missingPhase = audits.filter(a => !a.hasPhase);
  const notInManifest = audits.filter(a => !a.inManifest);

  // Report
  console.log(`Total Commands: ${total}`);
  console.log(`Fully Documented: ${fullyDocumented} (${((fullyDocumented / total) * 100).toFixed(1)}%)`);
  console.log();

  if (missingUsage.length > 0) {
    console.log(`Missing ## Usage: ${missingUsage.length}`);
    if (verbose) missingUsage.forEach(a => console.log(`  - /${a.name}`));
  }

  if (missingImpl.length > 0) {
    console.log(`Missing ## Implementation: ${missingImpl.length}`);
    if (verbose) missingImpl.forEach(a => console.log(`  - /${a.name}`));
  }

  if (missingRelated.length > 0) {
    console.log(`Missing ## Related: ${missingRelated.length}`);
    if (verbose) missingRelated.forEach(a => console.log(`  - /${a.name}`));
  }

  if (missingPhase.length > 0) {
    console.log(`Missing ## Phase: ${missingPhase.length}`);
    if (verbose) missingPhase.forEach(a => console.log(`  - /${a.name}`));
  }

  if (notInManifest.length > 0) {
    console.log();
    console.log(`Not in Manifest: ${notInManifest.length}`);
    if (verbose) notInManifest.forEach(a => console.log(`  - /${a.name}`));
  }

  // Find orphaned (in manifest but no file)
  const commandNames = new Set(audits.map(a => a.name));
  const orphaned = [...manifestCommands].filter(c => !commandNames.has(c));
  if (orphaned.length > 0) {
    console.log();
    console.log(`Orphaned (in manifest, no file): ${orphaned.length}`);
    if (verbose) orphaned.forEach(c => console.log(`  - /${c}`));
  }

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Coverage: ${((fullyDocumented / total) * 100).toFixed(1)}%`);
}

main().catch(console.error);
