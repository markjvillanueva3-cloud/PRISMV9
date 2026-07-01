#!/usr/bin/env node
// tier: T2
/**
 * galaxy-brain-startup-inject.mjs -- SessionStart injector (HERMES-ZULU-A06 finish)
 *
 * Closes the A-06 "hook-consumer wire deferred (session rate-limit)" gap: the
 * compound master-brain reader (scripts/lib/galaxy-brain-read.mjs) shipped + was
 * wired into the ON-DEMAND reasoning bridge, but NO SessionStart consumer existed --
 * so a galaxy chat never actually READ the master brain at startup, only its own
 * LOCAL synthesis. This is that consumer: ONE galaxy-PARAMETRIC hook that resolves
 * the session's slot -> galaxy and injects the bounded compound-recall card ONCE per
 * SessionStart (back-pointer + fleet cross-recall set + local-synthesis head).
 *
 * Why one hook, not 34: the deferred deliverable was "wire to all 34 galaxy startup
 * hooks". A single slot->galaxy-parametric injector serves EVERY galaxy with no clones
 * (R15 APPLY-TO-ALL-GALAXIES via one asset). SessionStart granularity (once/session,
 * NOT per-prompt) keeps it OUT of the per-prompt injection-budget CAP this domain owns.
 *
 * Fail-soft on every path (no slot / unmapped slot / absent master / read error ->
 * silent no-emit; the local corpus + session are never affected). R12.
 *
 * Disable: PRISM_GALAXY_BRAIN_STARTUP_DISABLE=1
 */

import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { readGalaxyBrain, buildCompactBrainCard } from "../../scripts/lib/galaxy-brain-read.mjs";
import { galaxyForSlot } from "../../scripts/lib/slot-galaxy-map.mjs";
import { incrementFeature } from "../helpers/feature-counter.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;

function safeJsonRead(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

// Mirror of slot-context-bundle-inject.resolveSlot (R11 -- same convention): exact
// chatId match, then tolerate the stable-id short form ("claude-abc12345" vs a full
// session uuid that starts-with "abc12345"). Returns the slot NAME or null.
export function resolveSlotName(sessionId, slotsDoc) {
  if (!sessionId || !slotsDoc || !slotsDoc.slots) return null;
  for (const [name, data] of Object.entries(slotsDoc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return name;
    const short = data.chatId?.replace(/^claude-/, "");
    if (short && sessionId.startsWith(short)) return name;
  }
  return null;
}

/**
 * Pure builder: session -> the compound master-brain SessionStart card, or null when
 * there is nothing to surface (unresolvable slot, unmapped galaxy, or a master brain
 * with no back-pointer AND no local synthesis -- i.e. zero added signal). Injectable
 * prismRoot/masterMemoryPath for the real-fixture test (no mocks; R9).
 */
export function buildStartupInjection({ sessionId, slotsDoc, prismRoot, masterMemoryPath } = {}) {
  const slot = resolveSlotName(sessionId, slotsDoc);
  if (!slot) return null;
  const galaxy = galaxyForSlot(slot);          // null for november/yankee (deliberately unmapped)
  if (!galaxy) return null;
  let brain;
  try {
    brain = readGalaxyBrain(galaxy, { prismRoot, masterMemoryPath });
  } catch {
    return null;                                // best-effort -- never break SessionStart
  }
  // Suppress an empty card: nothing from the master brain AND no local synthesis is
  // zero added signal over the existing slot-context injectors (no noise).
  const hasMaster = !!(brain.master && brain.master.present && brain.master.backPointer);
  if (!hasMaster && !brain.local.synthesis) return null;
  const card = buildCompactBrainCard(brain);
  return [
    `## Galaxy master-brain -- ${galaxy} (slot ${slot}, compound recall @ SessionStart)`,
    "",
    card,
    "",
    "_A galaxy reads the MASTER brain (cross-galaxy recall), not just its own synthesis " +
      "(HERMES-ZULU-A06). Disable: `PRISM_GALAXY_BRAIN_STARTUP_DISABLE=1`._",
  ].join("\n");
}

function emit(additionalContext) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
  }));
}

function main() {
  if (process.env.PRISM_GALAXY_BRAIN_STARTUP_DISABLE === "1") return;
  let envelope = {};
  try { envelope = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { /* no stdin */ }
  const sessionId = envelope.session_id || envelope.sessionId ||
    process.env.CLAUDE_CODE_SESSION_ID || null;
  const slotsDoc = safeJsonRead(SLOTS_FILE);
  let injection = null;
  try { injection = buildStartupInjection({ sessionId, slotsDoc }); } catch { injection = null; }
  if (!injection) return;                       // fail-soft: emit nothing
  try { incrementFeature("GalaxyBrainStartup"); } catch { /* counter optional */ }
  emit(injection);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
