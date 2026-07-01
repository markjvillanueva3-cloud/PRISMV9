#!/usr/bin/env node
/**
 * add-cleanup-roadmap-to-atomic.mjs — Register CLEANUP-MS0 in atomic-roadmap.json
 *
 * Per user directive 2026-05-13: the cleanup roadmap must be registered
 * alongside the 2 primary roadmaps (BACKEND-DEVTOOLS at roadmap_priority=0,
 * REVENUE at roadmap_priority=1) so `/pick-unit` can surface CLEANUP units
 * across all chats. This script ASSIGNS `roadmap_priority: 2` (cleanup) —
 * devtools still picks first, revenue second, cleanup third.
 *
 * Idempotent: re-running rewrites the CLEANUP entries with current envelope
 * state but never duplicates them (matches by milestone+unit_id).
 *
 * Inputs:
 *   - mcp-server/data/milestones/CLEANUP-MS0.json (source of truth for units)
 *   - state/shared/atomic-roadmap.json (target — append cleanup units)
 *   - state/shared/MILESTONE_PROGRESS.json (read shipped status if present)
 *
 * Output:
 *   Mutates atomic-roadmap.json in-place (atomic tmp+rename); prints summary.
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/prism";
const ENVELOPE = join(ROOT, "mcp-server/data/milestones/CLEANUP-MS0.json");
const ATOMIC = join(ROOT, "state/shared/atomic-roadmap.json");
const PROGRESS = join(ROOT, "state/shared/MILESTONE_PROGRESS.json");

const CLEANUP_ROADMAP_PRIORITY = 2;
const CLEANUP_AI_CATEGORY = "hygiene";

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function atomicWrite(path, obj) {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  renameSync(tmp, path);
}

// Map envelope phases → unit entries in atomic-roadmap schema.
function envelopeToUnits(envelope) {
  const units = [];
  for (const phase of envelope.phases || []) {
    // Derive tier from phase.id (e.g. "bootstrap-tier-0" → 0). Fall back to 6.
    const tierMatch = /tier-(\d+)/i.exec(phase.id || "");
    const tier = tierMatch ? Number(tierMatch[1]) : 6;
    for (const u of phase.units || []) {
      // Derive domain from unit_id (e.g. "U-CLEANUP-A1" → "cleanup-A")
      const domainMatch = /^U-CLEANUP-([A-Z])/i.exec(u.id || "");
      const domain = domainMatch ? `cleanup-${domainMatch[1].toLowerCase()}` : "cleanup";
      const shippedFraction = u.status === "complete" ? 1 : (u.status === "deferred" ? 0 : 0);

      units.push({
        milestone: envelope.id,                          // "CLEANUP-MS0"
        unit_id: u.id,                                   // "U-CLEANUP-A1"
        title: (u.title || "").slice(0, 200),            // truncated for table render
        tier,
        aiPriorityScore: envelope.ai_priority_score ?? 92,
        aiCategory: CLEANUP_AI_CATEGORY,
        leverage_score: 12,                              // baseline hygiene leverage
        domain,
        track: envelope.track || "CLEANUP",              // "CLEANUP"
        roadmap_priority: CLEANUP_ROADMAP_PRIORITY,      // 2 = cleanup (alongside devtools=0, revenue=1)
        shippedFraction,
        tribalVerdict: "novel",                          // no historical playbook for golf-slot work
        tribalCount: 0,
        blastRadius: 0,
        blastRadiusBoost: 0,
        evidenceScore: 5,                                // spec is heavily evidenced (4 iterations, 168 findings)
        driftFlag: false,
      });
    }
  }
  return units;
}

function main() {
  if (!existsSync(ENVELOPE)) {
    process.stderr.write(`fatal: envelope missing at ${ENVELOPE}\n`);
    process.exit(2);
  }
  if (!existsSync(ATOMIC)) {
    process.stderr.write(`fatal: atomic-roadmap.json missing at ${ATOMIC}\n`);
    process.exit(2);
  }

  const envelope = loadJson(ENVELOPE);
  const atomic = loadJson(ATOMIC);

  if (!Array.isArray(atomic.roadmap)) {
    process.stderr.write("fatal: atomic-roadmap.json missing .roadmap array\n");
    process.exit(2);
  }

  const cleanupUnits = envelopeToUnits(envelope);

  // Idempotent: remove any existing CLEANUP-MS0 entries, then re-insert fresh
  // ones from the current envelope. Match by milestone + unit_id.
  const existingKeys = new Set(cleanupUnits.map((u) => `${u.milestone}::${u.unit_id}`));
  const beforeCount = atomic.roadmap.length;
  atomic.roadmap = atomic.roadmap.filter((u) => !existingKeys.has(`${u.milestone}::${u.unit_id}`));
  const afterFilter = atomic.roadmap.length;
  const removed = beforeCount - afterFilter;

  atomic.roadmap.push(...cleanupUnits);

  // Refresh top-level total to match
  atomic.total = atomic.roadmap.length;

  // Drop a side-channel registration record so `/pick-unit` doc + future
  // tooling can identify all 3 priorities programmatically.
  atomic.registeredRoadmaps = atomic.registeredRoadmaps || {};
  atomic.registeredRoadmaps[String(CLEANUP_ROADMAP_PRIORITY)] = {
    name: "CLEANUP",
    description: envelope.title || "CLEANUP-MS0 — 7th 'golf' hygiene chat",
    milestones: [envelope.id],
    aiCategory: CLEANUP_AI_CATEGORY,
    pickOrder: CLEANUP_ROADMAP_PRIORITY, // devtools=0, revenue=1, cleanup=2
    spec: "state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md",
    envelope: "mcp-server/data/milestones/CLEANUP-MS0.json",
    updatedAt: new Date().toISOString(),
  };
  // Also stamp devtools/revenue baselines if absent (idempotent, doesn't overwrite)
  if (!atomic.registeredRoadmaps["0"]) {
    atomic.registeredRoadmaps["0"] = {
      name: "BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP",
      description: "Primary development-tools roadmap",
      pickOrder: 0,
      aiCategory: "dev-tools",
    };
  }
  if (!atomic.registeredRoadmaps["1"]) {
    atomic.registeredRoadmaps["1"] = {
      name: "REVENUE-ROADMAP-v7.6",
      description: "Primary revenue-track roadmap",
      pickOrder: 1,
      aiCategory: "revenue",
    };
  }

  atomicWrite(ATOMIC, atomic);

  const summary = {
    schemaVersion: 1,
    ok: true,
    addedUnits: cleanupUnits.length,
    removedStaleEntries: removed,
    totalRoadmapUnits: atomic.roadmap.length,
    roadmapPriority: CLEANUP_ROADMAP_PRIORITY,
    registeredRoadmaps: Object.keys(atomic.registeredRoadmaps).sort(),
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main();
