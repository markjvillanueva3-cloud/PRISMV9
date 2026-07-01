#!/usr/bin/env node
/**
 * fleet-orchestrate.mjs — the ZULU master's "wake the fleet" tool.
 *
 * Composes a resource-rich orchestration brief for each assigned fleet slot and
 * delivers it through the slot-brief channel (state/shared/slot-briefs/<slot>.md ->
 * slot-brief-inject.mjs -> that slot's next prompt). As each slot wakes (/checkin-<slot>),
 * it receives a targeted ZULU work order pointing at everything it needs to build right
 * the first time: its domain, galaxy brain, memory recall, next pickup unit, and the
 * standing build doctrine.
 *
 * Runtime arm of HERMES-MASTER-ORCHESTRATOR-MS0 — the Hermes app (as ZULU, connected to
 * PRISM's MCP) is the intended caller, but any chat / CLI can drive it. fs-only (no exec).
 *
 * Usage:
 *   node scripts/fleet-orchestrate.mjs                  # DRY RUN — print briefs, write nothing
 *   node scripts/fleet-orchestrate.mjs --apply          # write to every assigned slot (skip slots with a pending brief)
 *   node scripts/fleet-orchestrate.mjs --apply --force  # also overwrite existing pending briefs
 *   node scripts/fleet-orchestrate.mjs --slot kilo --apply
 *
 * Safety: DRY RUN default. --apply never clobbers a pending brief unless --force. The
 * orchestrator slot (zulu/zebra) and unmapped slots are skipped.
 * @module fleet-orchestrate
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { SLOT_GALAXY_MAP, UNMAPPED_SLOTS } from "./lib/slot-galaxy-map.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const DOMAINS_FILE = path.join(PRISM_ROOT, "state/shared/CHAT-SLOT-DOMAINS.md");
const BRIEFS_DIR = path.join(PRISM_ROOT, "state/shared/slot-briefs");

/** The orchestrator role — never brief itself. */
const ORCHESTRATOR_SLOTS = new Set(["zulu", "zebra"]);

/** Parse the slot->domain table from CHAT-SLOT-DOMAINS.md (`| **ALPHA** | domain |`). */
export function parseSlotDomains(md) {
  const out = {};
  const re = /\|\s*\*\*([A-Za-z]+)\*\*\s*\|\s*(.+?)\s*\|/g;
  let m;
  while ((m = re.exec(md)) !== null) {
    const slot = m[1].toLowerCase();
    const domain = m[2].replace(/\*\*/g, "").trim();
    if (slot && domain) out[slot] = domain;
  }
  return out;
}

/** Compose the resource-rich ZULU orchestration brief body for one slot. Pure. */
export function composeOrchestrationBrief(slot, domain, galaxy) {
  const g = galaxy || SLOT_GALAXY_MAP[slot] || "(unmapped)";
  const cmd = (s) => "`" + s + "`";
  return [
    `## ZULU orchestration brief — ${slot.toUpperCase()} (${domain})`,
    ``,
    `You are the **${domain}** specialist. Wake up and resume your domain's highest-value work — build it right the first time with no gaps.`,
    ``,
    `**Next unit (devtools/bridge-first):** ${cmd("node .claude/helpers/priority-queue.mjs --pick --slot " + slot + " --top 3")} or ${cmd("/pick-unit --slot " + slot)}`,
    ``,
    `**Your resources — everything you need is wired:**`,
    `- Galaxy brain: ${cmd("mcp-server/src/engines/" + g + "/MEMORY.md")} (+ CLAUDE.md / PATHS.md / TOOLBELT.md).`,
    `- Memory recall: ${cmd('prism_memory:semantic_search query="' + domain + '" topK=20')}.`,
    `- Wiki + tribal + master-index auto-inject on every prompt (slot-domain-aware). Query before re-deriving.`,
    ``,
    `**Build doctrine (non-negotiable):** per-file 2-arm scrutiny after each file -> 3-of-3 Stop gate -> no stubs / no inlined physics constants -> commit ${cmd("[SCOPE]/U-ID")} in your slot worktree -> handoff. Default shop_floor safety (Omega>=0.95, S(x)>=0.98).`,
    ``,
    `**Coordinate:** domain-crossing work -> chat-bus broadcast FIRST; the core-artifact owner ships, siblings provide composition surfaces. Report blockers to the bus.`,
    ``,
    `— ZULU / Hermes fleet orchestrator`,
    ``,
  ].join("\n");
}

/** Build the orchestration plan: which slots get briefs + their composed bodies. */
export function buildFleetPlan(slotDomains) {
  const unmapped = new Set(UNMAPPED_SLOTS);
  const plan = [];
  for (const [slot, domain] of Object.entries(slotDomains)) {
    if (ORCHESTRATOR_SLOTS.has(slot)) continue;
    if (unmapped.has(slot)) continue;
    if (!SLOT_GALAXY_MAP[slot]) continue;
    plan.push({ slot, domain, galaxy: SLOT_GALAXY_MAP[slot], body: composeOrchestrationBrief(slot, domain, SLOT_GALAXY_MAP[slot]) });
  }
  return plan.sort((a, b) => a.slot.localeCompare(b.slot));
}

/** Report fleet orchestration state per slot: pending (queued, awaiting wake) vs delivered vs un-briefed. Pure given a dir. */
export function fleetStatus(briefsDir, plan) {
  let delivered = [];
  try { delivered = fs.readdirSync(path.join(briefsDir, "_delivered")).filter((n) => n.endsWith(".md")); }
  catch { /* no _delivered yet */ }
  return plan.map((p) => ({
    slot: p.slot,
    galaxy: p.galaxy,
    pending: fs.existsSync(path.join(briefsDir, `${p.slot}.md`)),
    deliveredCount: delivered.filter((n) => n.split("-")[0] === p.slot).length,
  }));
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const force = args.includes("--force");
  const slotArg = (() => { const i = args.indexOf("--slot"); return i >= 0 ? args[i + 1] : null; })();

  let md;
  try { md = fs.readFileSync(DOMAINS_FILE, "utf8"); }
  catch { console.error(`cannot read ${DOMAINS_FILE}`); process.exit(1); }

  let plan = buildFleetPlan(parseSlotDomains(md));
  if (slotArg) plan = plan.filter((p) => p.slot === slotArg.toLowerCase());

  if (args.includes("--status")) {
    const status = fleetStatus(BRIEFS_DIR, plan);
    const queued = status.filter((s) => s.pending).length;
    console.log(`Fleet orchestration status — ${queued}/${status.length} slots have a pending (queued) ZULU brief:\n`);
    for (const s of status) {
      const state = s.pending ? "PENDING (queued, awaiting /checkin)" : s.deliveredCount > 0 ? `consumed (delivered x${s.deliveredCount})` : "un-briefed";
      console.log(`  ${s.slot.padEnd(9)} (${s.galaxy.padEnd(20)}) — ${state}`);
    }
    return;
  }

  if (!apply) {
    console.log(`[DRY RUN] ${plan.length} orchestration brief(s) would be issued (use --apply to deliver):\n`);
    for (const p of plan) console.log(`  -> ${p.slot.padEnd(9)} (${p.galaxy}) — ${p.domain.slice(0, 60)}`);
    console.log(`\nSample brief (${plan[0]?.slot ?? "n/a"}):\n${"-".repeat(60)}\n${plan[0]?.body ?? ""}`);
    return;
  }

  let written = 0, skipped = 0, failed = 0;
  for (const p of plan) {
    const dest = path.join(BRIEFS_DIR, `${p.slot}.md`);
    if (!force && fs.existsSync(dest)) { console.log(`  skip ${p.slot} (pending brief exists)`); skipped++; continue; }
    try {
      fs.mkdirSync(BRIEFS_DIR, { recursive: true });
      const tmp = `${dest}.tmp`;
      fs.writeFileSync(tmp, `> _brief from: zulu_\n\n${p.body}`, "utf8");
      fs.renameSync(tmp, dest);
      console.log(`  ok ${p.slot} <- ${p.galaxy}`);
      written++;
    } catch (e) {
      console.error(`  fail ${p.slot}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }
  console.log(`\nFleet orchestration: ${written} delivered · ${skipped} skipped (pending) · ${failed} failed. As each slot wakes (/checkin-<slot>), its brief delivers + consumes once.`);
}

const invokedAsScript = !!(process.argv[1] && path.basename(process.argv[1]) === "fleet-orchestrate.mjs");
if (invokedAsScript) main();
