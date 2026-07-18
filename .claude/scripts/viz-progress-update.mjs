#!/usr/bin/env node
/**
 * viz-progress-update.mjs
 *
 * Live in-flight ghost-node state updater for the 6-chat synergy protocol.
 * Each phase in the master atomic roadmap is represented as a "ghost node"
 * in `state/shared/roadmap-ghosts.json`. Ghosts cycle through:
 *
 *     planned → claimed → in_progress → built → wired → complete → released
 *
 * Each `/run-continuous` call invokes this script at the boundaries:
 *   claim — when the chat claims the phase
 *   tick  — after every unit completes (in-flight progress signal)
 *   built — when all units are done but wiring not yet complete
 *   wired — when wiring is verified via viz coverage delta
 *   complete — after consensus + commit
 *   release — at /chat-cleanup or session Stop (handles orphans)
 *
 * The peer's `system-viz-on-commit.mjs` pipeline reads `roadmap-ghosts.json`
 * to render ghost nodes (dimmed) vs built nodes (solid + lit) and to draw
 * wire-target candidate edges for built-but-not-wired phases.
 *
 * Usage:
 *   node viz-progress-update.mjs claim    --phase <id> --owner <chat>
 *   node viz-progress-update.mjs tick     --phase <id> --owner <chat> --unit <id> --note <txt>
 *   node viz-progress-update.mjs built    --phase <id> --owner <chat> --produced <node-id,...>
 *   node viz-progress-update.mjs wired    --phase <id> --owner <chat> --target-dispatcher <id>
 *   node viz-progress-update.mjs complete --phase <id> --owner <chat>
 *   node viz-progress-update.mjs release  --phase <id> --owner <chat>
 *   node viz-progress-update.mjs status                                  (read-only summary)
 *
 * Idempotent — safe to call repeatedly; each call writes a fresh state
 * snapshot.
 */

import fs from "node:fs";
import path from "node:path";

const GHOSTS_FILE = "H:/prism/state/shared/roadmap-ghosts.json";
const ROADMAP_INDEX = "H:/prism/mcp-server/data/roadmap-index.json";
const GRAPH = "H:/prism/state/shared/system-viz/system-graph.json";
const CHAT_BUS_HELPER = "H:/prism/.claude/helpers/agent-coordination.mjs";

const VALID_STATES = ["planned", "claimed", "in_progress", "built", "wired", "complete", "released"];

function args() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const opts = {};
  for (let i = 1; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      opts[k] = v;
    }
  }
  return { cmd, opts };
}

function readJSON(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return fallback; }
}

function loadGhosts() {
  return readJSON(GHOSTS_FILE, {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    ghosts: {},
  });
}

function saveGhosts(state) {
  state.generatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(GHOSTS_FILE), { recursive: true });
  fs.writeFileSync(GHOSTS_FILE, JSON.stringify(state, null, 2));
}

function ensureGhost(state, phaseId) {
  if (!state.ghosts[phaseId]) {
    // Lazy seed: read the milestone envelope to populate metadata
    const env = readJSON(`H:/prism/mcp-server/data/milestones/${phaseId}.json`, null);
    state.ghosts[phaseId] = {
      phase_id: phaseId,
      title: env?.title || phaseId,
      tier: env?.tier ?? null,
      atomic_phase: env?.atomic_phase ?? null,
      leverage_score: env?.leverage_score ?? 0,
      suggested_dispatchers: env?.suggested_dispatchers || [],
      expected_wired_delta: env?.expected_wired_delta ?? null,
      consumes_node_ids: env?.consumes_node_ids || [],
      produces_node_ids: env?.produces_node_ids || [],
      state: "planned",
      owner_chat: null,
      claimed_at: null,
      last_tick_at: null,
      built_at: null,
      wired_at: null,
      complete_at: null,
      released_at: null,
      units_done: [],
      ticks: 0,
      latest_note: "",
      // Wire-target candidates surface for visualization. Populated when
      // produced engines exist + a dispatcher is suggested.
      wire_targets: [],
    };
  }
  return state.ghosts[phaseId];
}

function postBus(agent, lane, message) {
  if (!fs.existsSync(CHAT_BUS_HELPER)) return;
  const cp = require("node:child_process");
  cp.spawnSync(process.execPath, [
    CHAT_BUS_HELPER, "post",
    "--agent", agent,
    "--status", "viz-progress",
    "--lane", lane,
    "--current", message,
    "--next", "",
    "--message", message,
  ], { stdio: "ignore" });
}

function checkOwner(g, owner, allowMissing) {
  if (allowMissing && !g.owner_chat) return;
  if (!owner) {
    throw new Error(`--owner required for phase ${g.phase_id}`);
  }
  if (g.owner_chat && g.owner_chat !== owner) {
    throw new Error(`phase ${g.phase_id} owned by ${g.owner_chat}, not ${owner}`);
  }
}

function cmdClaim(opts) {
  const { phase, owner } = opts;
  if (!phase || !owner) throw new Error("claim requires --phase and --owner");
  const state = loadGhosts();
  const g = ensureGhost(state, phase);
  if (g.state !== "planned" && g.state !== "released") {
    throw new Error(`phase ${phase} is in state ${g.state}, cannot claim`);
  }
  g.owner_chat = owner;
  g.claimed_at = new Date().toISOString();
  g.state = "claimed";
  saveGhosts(state);
  postBus(owner, `phase=${phase}`, `viz-progress: ${phase} CLAIMED`);
  console.log(`CLAIMED ${phase} by ${owner}`);
}

function cmdTick(opts) {
  const { phase, owner, unit, note } = opts;
  if (!phase || !owner) throw new Error("tick requires --phase and --owner");
  const state = loadGhosts();
  const g = ensureGhost(state, phase);
  checkOwner(g, owner);
  g.state = "in_progress";
  g.last_tick_at = new Date().toISOString();
  g.ticks++;
  if (unit) {
    if (!g.units_done.includes(unit)) g.units_done.push(unit);
  }
  if (note) g.latest_note = String(note).slice(0, 200);
  saveGhosts(state);
  console.log(`TICK ${phase} (unit=${unit || "?"}, total ticks=${g.ticks})`);
}

function cmdBuilt(opts) {
  const { phase, owner } = opts;
  if (!phase || !owner) throw new Error("built requires --phase and --owner");
  const produced = (opts.produced || "").split(",").filter(Boolean);
  const state = loadGhosts();
  const g = ensureGhost(state, phase);
  checkOwner(g, owner);
  g.state = "built";
  g.built_at = new Date().toISOString();
  if (produced.length) g.produces_node_ids = produced;
  // Compute wire targets from produced engines + suggested dispatchers
  const G = readJSON(GRAPH, null);
  if (G && produced.length) {
    g.wire_targets = produced.map((nodeId) => {
      const n = G.nodes?.find((x) => x.id === nodeId);
      return {
        produced_node: nodeId,
        candidates: n?.suggestedDispatchers || g.suggested_dispatchers,
      };
    });
  }
  saveGhosts(state);
  postBus(owner, `phase=${phase}`, `viz-progress: ${phase} BUILT (${produced.length} engines, ${g.wire_targets.length} wire-targets ready)`);
  console.log(`BUILT ${phase} (${produced.length} engines, ${g.wire_targets.length} wire-targets)`);
}

function cmdWired(opts) {
  const { phase, owner } = opts;
  if (!phase || !owner) throw new Error("wired requires --phase and --owner");
  const state = loadGhosts();
  const g = ensureGhost(state, phase);
  checkOwner(g, owner);
  if (g.state !== "built" && g.state !== "in_progress") {
    throw new Error(`cannot mark wired from state ${g.state}`);
  }
  g.state = "wired";
  g.wired_at = new Date().toISOString();
  if (opts["target-dispatcher"]) {
    g.actual_dispatcher = opts["target-dispatcher"];
  }
  saveGhosts(state);
  postBus(owner, `phase=${phase}`, `viz-progress: ${phase} WIRED into ${g.actual_dispatcher || "dispatcher"}`);
  console.log(`WIRED ${phase}`);
}

function cmdComplete(opts) {
  const { phase, owner } = opts;
  if (!phase || !owner) throw new Error("complete requires --phase and --owner");
  const state = loadGhosts();
  const g = ensureGhost(state, phase);
  checkOwner(g, owner);
  g.state = "complete";
  g.complete_at = new Date().toISOString();
  saveGhosts(state);
  postBus(owner, `phase=${phase}`, `viz-progress: ${phase} COMPLETE — solid, lit, ready for consensus`);
  console.log(`COMPLETE ${phase}`);
}

function cmdRelease(opts) {
  const { phase, owner } = opts;
  if (!phase) throw new Error("release requires --phase");
  const state = loadGhosts();
  const g = ensureGhost(state, phase);
  checkOwner(g, owner, /* allowMissing */ true);
  g.state = "released";
  g.released_at = new Date().toISOString();
  g.owner_chat = null;
  saveGhosts(state);
  if (owner) postBus(owner, `phase=${phase}`, `viz-progress: ${phase} RELEASED (back to planned for next chat)`);
  // After release, demote back to planned so a new chat can claim
  g.state = "planned";
  saveGhosts(state);
  console.log(`RELEASED ${phase}`);
}

function cmdStatus() {
  const state = loadGhosts();
  const ghosts = Object.values(state.ghosts);
  const counts = {};
  for (const g of ghosts) counts[g.state] = (counts[g.state] || 0) + 1;
  console.log("VIZ-PROGRESS STATUS");
  console.log("===================");
  console.log(`Total phases: ${ghosts.length}`);
  for (const s of VALID_STATES) {
    console.log(`  ${s.padEnd(12)} ${counts[s] || 0}`);
  }
  console.log("");
  console.log("In-flight phases:");
  for (const g of ghosts.filter((x) => ["claimed", "in_progress", "built", "wired"].includes(x.state))) {
    console.log(`  ${g.phase_id} [${g.state}] owner=${g.owner_chat} ticks=${g.ticks} units=${g.units_done.length}`);
  }
}

const { cmd, opts } = args();
try {
  switch (cmd) {
    case "claim": cmdClaim(opts); break;
    case "tick": cmdTick(opts); break;
    case "built": cmdBuilt(opts); break;
    case "wired": cmdWired(opts); break;
    case "complete": cmdComplete(opts); break;
    case "release": cmdRelease(opts); break;
    case "status": cmdStatus(); break;
    default:
      console.error("usage: viz-progress-update.mjs <claim|tick|built|wired|complete|release|status> [--phase <id>] [--owner <chat>] [--unit <id>] [--note <txt>] [--produced <id,id>] [--target-dispatcher <id>]");
      process.exit(2);
  }
} catch (e) {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
}
