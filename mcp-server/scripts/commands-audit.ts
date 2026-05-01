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

const STATE_DIR = fs.existsSync(path.resolve(process.cwd(), "data", "state"))
  ? path.resolve(process.cwd(), "data", "state")
  : path.resolve(process.cwd(), "mcp-server", "data", "state");
const LEDGER_PATH = "H:/prism/state/shared/AGENT_UTILIZATION_LEDGER.jsonl";

interface CommandAudit {
  name: string;
  hasUsage: boolean;
  hasImplementation: boolean;
  hasRelated: boolean;
  hasPhase: boolean;
  lineCount: number;
  inManifest: boolean;
}

interface AgentEntry { name: string; category: string; description?: string; }
interface LedgerRow { ts: string; agent: string; subagent_type: string | null; exitCode?: number; }

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

  // ─── Phase 0.17 U-PLG7 utilization layer ─────────────────────────────────
  // Reads AGENT_REGISTRY + AGENT_UTILIZATION_LEDGER. Reports which Task-tool
  // agents are unused or low-used. Slash-command utilization cannot be
  // reported yet (no UserPromptSubmit instrumentation).
  const since = (() => {
    const i = process.argv.indexOf("--since");
    if (i > -1 && process.argv[i + 1]) return process.argv[i + 1];
    return "30d";
  })();
  const days = (() => {
    const m = /^(\d+)([dh])$/.exec(since);
    if (!m) return 30;
    return m[2] === "d" ? Number(m[1]) : Number(m[1]) / 24;
  })();
  const cutoff = Date.now() - days * 86400_000;

  const regPath = path.join(STATE_DIR, "AGENT_REGISTRY.json");
  const agents: AgentEntry[] = fs.existsSync(regPath)
    ? (JSON.parse(fs.readFileSync(regPath, "utf8")).entries || [])
    : [];

  const bySubagent = new Map<string, number>();
  let ledgerTotal = 0;
  let ledgerFails = 0;
  if (fs.existsSync(LEDGER_PATH)) {
    const raw = fs.readFileSync(LEDGER_PATH, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim() || line.startsWith("#")) continue;
      try {
        const r = JSON.parse(line) as LedgerRow;
        if (new Date(r.ts).getTime() < cutoff) continue;
        ledgerTotal++;
        if (r.exitCode && r.exitCode !== 0) ledgerFails++;
        if (r.subagent_type) {
          bySubagent.set(r.subagent_type, (bySubagent.get(r.subagent_type) || 0) + 1);
        }
      } catch { /* skip bad line */ }
    }
  }

  const unused: AgentEntry[] = [];
  const low: Array<{ a: AgentEntry; n: number }> = [];
  const heavy: Array<{ a: AgentEntry; n: number }> = [];
  for (const a of agents) {
    const n = bySubagent.get(a.name) ?? 0;
    if (n === 0) unused.push(a);
    else if (n <= 2) low.push({ a, n });
    else heavy.push({ a, n });
  }
  heavy.sort((x, y) => y.n - x.n);
  const registered = new Set(agents.map((a) => a.name));
  const orphans = [...bySubagent.entries()].filter(([n]) => !registered.has(n));

  const unusedByCat = unused.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`UTILIZATION AUDIT (last ${days}d)`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Ledger: ${ledgerTotal} Task invocations, ${ledgerFails} fails`);
  console.log(`Agents: ${agents.length} registered`);
  console.log(`  heavy (≥3):  ${heavy.length}`);
  console.log(`  low (1-2):   ${low.length}`);
  console.log(`  unused:      ${unused.length}   ← utilization gap`);
  const util = agents.length ? ((heavy.length + low.length) / agents.length) * 100 : 0;
  console.log(`  utilization: ${util.toFixed(1)}% reached at least once`);
  if (orphans.length) {
    console.log(`  orphans (ledger but not registry): ${orphans.length} — ${orphans.slice(0, 5).map(([n, c]) => `${n}(${c})`).join(", ")}`);
  }
  if (heavy.length) {
    console.log();
    console.log("Top heavy agents:");
    for (const h of heavy.slice(0, 10)) console.log(`  ${String(h.n).padStart(4)}x ${h.a.name} (${h.a.category})`);
  }
  const topCats = Object.entries(unusedByCat).sort((a, b) => b[1] - a[1]);
  if (topCats.length) {
    console.log();
    console.log("Unused by category:");
    for (const [cat, n] of topCats.slice(0, 8)) console.log(`  ${String(n).padStart(4)} x ${cat}`);
  }
  console.log();
  console.log("Slash-command utilization: no-telemetry-source-yet");
  console.log("  (Slash invocations don't flow through PostToolUse. Needs a");
  console.log("   UserPromptSubmit matcher that logs prompts starting with '/'.)");
}

main().catch(console.error);
