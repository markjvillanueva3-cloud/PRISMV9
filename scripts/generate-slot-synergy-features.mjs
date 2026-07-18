#!/usr/bin/env node
/**
 * generate-slot-synergy-features.mjs — system-viz augmentation: slot-synergy map.
 *
 * Spec: SLOT-SYNERGY-MAP-MS0 (slot foxtrot, 2026-05-19).
 *
 * Walks each of the 13 chat slots (alpha..mike) through 14 PRISM subsystems
 * (handoff, queue, claims, commits, branch, skills, scripts, hooks, memories,
 * wikis, tribal, CLAUDE.md, GSD, TDD/DSL doctrine) and emits:
 *   - parent roost  `ghost.slot_synergy` (kind ghost-roost, under
 *     `ghost.planned_features`).
 *   - 14 SUBSYSTEM anchor nodes (one per subsystem).
 *   - 13 slot-node children (one per NATO slot), color-coded by role
 *     (golf=hygiene amber, work=domain blue).
 *   - per-slot edges to every subsystem the slot has non-zero connections to.
 *
 * The visualization makes the END-TO-END pipeline per slot legible:
 *
 *   slot.<nato>
 *     ├─ handoff:  state/shared/handoffs/HANDOFF-*-<topic>.md
 *     ├─ queue:    state/shared/slot-task-queues.json::queues.<nato>
 *     ├─ claims:   state/shared/slot-task-claims.json::<slot>
 *     ├─ commits:  git log (slot:<nato>) | [<NATO>]
 *     ├─ branch:   slot/<nato> (worktree-routed)
 *     ├─ skills:   /checkin-<nato> /handoff-<nato> /precompact-<nato> /startup-<nato>
 *     ├─ tribal:   domain-pipeline mapping (alpha→mill, golf→hygiene, …)
 *     ├─ memories: /knowledge/memories/ entries mentioning slot
 *     ├─ wikis:    /knowledge/wiki/ entries mentioning slot
 *     └─ doctrine: TDD per-file scrutiny + DSL shortcodes + CLAUDE.md sections
 *
 * Registered in scripts/regen-viz.mjs FAST[] + spliced by merge-augmentations.mjs.
 * Modeled on generate-bridge-synergy-features.mjs (same augmentation pattern).
 *
 * Usage:  node scripts/generate-slot-synergy-features.mjs
 * Exit:   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const SYNERGY_ROOST_ID = "ghost.slot_synergy";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const SLOT_LAYER = "L9";
export const SUBSYSTEM_LAYER = "L9";
export const MAX_LABEL = 80;
export const MAX_INFO = 220;
export const MAX_NODE_ID_BODY = 80;
export const GIT_LOG_LIMIT = 200;
export const GIT_TIMEOUT_MS = 20000;

// Slot-color palette: domain owners blue, hygiene amber.
export const COLOR_WORK_SLOT = "#3b82f6";   // blue — work slot (12 of 13)
export const COLOR_HYGIENE_SLOT = "#f59e0b"; // amber — golf hygiene
export const COLOR_SUBSYSTEM = "#8b5cf6";    // purple — subsystem anchor

// Per-slot subsystem-count defaults (when the corresponding *artifact* exists
// in the codebase but no read-time count is wired; doctrine layers like
// CLAUDE.md / GSD / TDD/DSL are uniform across slots so each gets count=1).
export const SKILLS_PER_SLOT = 4; // /checkin /handoff /precompact /startup wrappers
export const SLOT_AWARE_SCRIPTS = 5; // chat-slots, slot-task-claim, slot-queue, allocate-rgs-per-slot, topup-slot-queues
export const SLOT_AWARE_HOOKS_WORK = 3; // slot-bind-enforce, stop-slot-task-claims-advisory, fleet-task-health-stop
export const SLOT_AWARE_HOOKS_GOLF = 5; // work-3 + golf-write-allowlist + golf-reaper-guardian
export const DOCTRINE_BASE_COUNT = 1; // each doctrine subsystem connects once per slot

// Canonical 13-slot NATO list (must match .claude/helpers/chat-slots.mjs).
// KEEP IN SYNC: the test asserts SLOT_NAMES is identical to chat-slots.mjs.
export const SLOT_NAMES = Object.freeze([
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
  "golf",
  "hotel", "india", "juliett", "kilo", "lima", "mike",
]);

// Slot → primary domain (from DOMAIN-PIPELINE-MS0 doctrine in CLAUDE.md).
// Golf is the hygiene/integrator slot, not a work-domain owner.
export const SLOT_DOMAINS = Object.freeze({
  alpha:   "mill",
  bravo:   "lathe",
  charlie: "wire-edm",
  delta:   "cad",
  echo:    "cam",
  foxtrot: "machining-knowhow + tribal",
  golf:    "hygiene + database (integrator)",
  hotel:   "erp + business",
  india:   "post-processor + master-post",
  juliett: "speed-feed",
  kilo:    "print-to-program",
  lima:    "prism-academy + learning",
  mike:    "misc",
});

// 14 PRISM subsystems the synergy map plots per slot. Each gets a subsystem
// anchor node; per-slot edges land here when the slot has non-zero count.
export const SUBSYSTEMS = Object.freeze([
  { key: "handoff",   label: "Handoffs (per-slot)",                info: "state/shared/handoffs/HANDOFF-<chatId>-<topic>.md (instance-keyed) or HANDOFF-<slot>-<topic>.md (golf slot-keyed)" },
  { key: "queue",     label: "Task Queue (per-slot)",              info: "state/shared/slot-task-queues.json::queues.<slot> — slot's pickup pool, consumed by /loop head-to-tail" },
  { key: "claims",    label: "Unit Claims (per-slot)",             info: "state/shared/slot-task-claims.json — per-slot lockfile preventing two slots race-building the same MILESTONE::U-ID" },
  { key: "commits",   label: "Commits (per-slot routing)",         info: "git log subject markers: (slot:<nato>) modern · [<NATO>] legacy — slot-worktree commits route to slot/<nato>" },
  { key: "branch",    label: "Slot Worktree Branch",               info: "slot/<nato> branch in H:/prism-slot-<nato> worktree (SLOT-WORKTREE-MS0). Golf is the integrator, exempt from worktree" },
  { key: "skills",    label: "Per-slot Skills",                    info: "/checkin-<nato> /handoff-<nato> /precompact-<nato> /startup-<nato> (4 per slot × 13 = 52)" },
  { key: "scripts",   label: "Scripts (slot-aware)",               info: "chat-slots.mjs, slot-task-claim.mjs, slot-queue.mjs, allocate-rgs-per-slot.mjs, topup-slot-queues.mjs" },
  { key: "hooks",     label: "Hooks (slot-aware)",                 info: "slot-bind-enforce, golf-slot-write-allowlist, golf-slot-reaper-guardian, stop-slot-task-claims-advisory, fleet-task-health-stop" },
  { key: "memories",  label: "Memories (per-slot lineage)",        info: "knowledge/memories/{feedback,reference}/*.md referencing slot — auto-mirrored via stop-obsidian-memory-feed" },
  { key: "wikis",     label: "Wikis (per-slot lineage)",           info: "knowledge/wiki/architecture/**/*.md leaves referencing slot work — wiki-recall-index regen hourly via post-commit cron" },
  { key: "tribal",    label: "Tribal Knowledge (per-slot domain)", info: "Tribal corpus filtered by slot's domain (alpha→mill tips, charlie→wire-edm tips, etc.) via tribal-by-domain-inject hook" },
  { key: "claudemd",  label: "CLAUDE.md doctrine (slot-tagged)",   info: "Doctrine pointers + Recent regressions — sections referencing slot work feed back into next session's awareness inject" },
  { key: "gsd",       label: "GSD docs (session lifecycle)",       info: "mcp-server/data/docs/gsd/{GSD_QUICK,DEV_PROTOCOL}.md — shared across all slots (no per-slot variance)" },
  { key: "precompact", label: "PreCompact hook (handoff auto-write)", info: "precompact-handoff.mjs synthesizes RESUME via generateSmartResume() and atomically writes the slot's handoff before /compact boundary (U-PRECOMPACT-HOOK-AUTOWRITE)" },
  { key: "compact",   label: "Compact + auto-resume",                info: "session-start-auto-resume.mjs (SessionStart:compact) re-reads slot handoff post-/compact and injects RESUME so the new chat anchors to prior exit-state without operator typing 'continue'" },
  { key: "doctrine",  label: "TDD + DSL (cross-slot)",               info: "Per-file scrutiny gate (2 reviewer agents) + 3-of-3 Stop gate + DSL shortcodes (E####/D##/T####/A##) — apply uniformly" },
]);

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "slot-synergy-augmentation.json");

// Input paths — each fail-soft (count → 0 if file missing/malformed).
const CHAT_SLOTS_PATH = path.join(ROOT, "state/shared/chat-slots.json");
const SLOT_QUEUES_PATH = path.join(ROOT, "state/shared/slot-task-queues.json");
const SLOT_CLAIMS_PATH = path.join(ROOT, "state/shared/slot-task-claims.json");
const HANDOFFS_DIR = path.join(ROOT, "state/shared/handoffs");

/** Filesystem-safe node id fragment (letters/digits/dash/underscore). */
export function safeId(raw) {
  const s = String(raw == null ? "" : raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, MAX_NODE_ID_BODY);
  if (!s || s.includes("..")) return "x";
  return s;
}

/**
 * Read JSON fail-soft → null if missing or malformed. The CALLER appends a
 * caveat string when this returns null so an operator inspecting the
 * augmentation output sees "input X was unavailable" rather than a silent
 * all-zero graph (R12 fail-loud at the surface, fail-soft in the read path).
 */
function readJsonSoft(p) {
  try {
    if (!fs.existsSync(p)) return { value: null, available: false, reason: "missing" };
    return { value: JSON.parse(fs.readFileSync(p, "utf8")), available: true, reason: null };
  } catch (e) { return { value: null, available: false, reason: `parse: ${e?.message ?? "unknown"}` }; }
}

/**
 * List handoff filenames fail-soft. Returns empty array if dir missing.
 * Exported for test injection.
 */
export function listHandoffsSoft(dir = HANDOFFS_DIR) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => /^HANDOFF-.*\.md$/i.test(f));
  } catch { return []; }
}

/**
 * Match a handoff filename to a slot. Two attribution paths:
 *   (a) topic suffix contains the slot name (e.g. "...-alpha-...", "-foxtrot-work.md")
 *   (b) explicit slot-keyed name like "HANDOFF-golf-<task>.md"
 * Case-insensitive. A file may match multiple slots if its topic mentions
 * more than one — that's a real signal of cross-slot work.
 */
export function handoffMatchesSlot(filename, slot) {
  if (!filename || !slot) return false;
  const lower = String(filename).toLowerCase();
  const slotLower = String(slot).toLowerCase();
  if (lower.startsWith(`handoff-${slotLower}-`)) return true;
  if (lower.includes(`-${slotLower}-`)) return true;
  if (lower.endsWith(`-${slotLower}.md`)) return true;
  return false;
}

/**
 * Match a commit subject to a slot. Two attribution paths:
 *   (a) modern: "(slot:<nato>)"
 *   (b) legacy: "[<NATO>]" prefix (uppercase only; [MAIN]/[FIX] would otherwise
 *       false-positive against any slot).
 */
export function commitMatchesSlot(subject, slot) {
  if (!subject || !slot) return false;
  const slotLower = String(slot).toLowerCase();
  if (subject.toLowerCase().includes(`(slot:${slotLower})`)) return true;
  const slotUpper = String(slot).toUpperCase();
  if (subject.startsWith(`[${slotUpper}]`)) return true;
  if (/^\[[A-Z0-9-]+\]\s*\[/.test(subject) && subject.includes(`] [${slotUpper}]`)) return true;
  return false;
}

/**
 * Pure: build {newNodes,newEdges,stats} from already-read inputs.
 *
 * @param {Object} inputs
 * @param {Object|null} inputs.chatSlots   — chat-slots.json contents (or null)
 * @param {Object|null} inputs.slotQueues  — slot-task-queues.json contents (or null)
 * @param {Object|null} inputs.slotClaims  — slot-task-claims.json contents (or null)
 * @param {string[]}    inputs.commits     — recent commit subjects (or empty)
 * @param {string[]}    inputs.handoffs    — handoff filenames (or empty)
 * @param {Set|Array}   inputs.existingNodeIds — graph ids to skip
 */
export function generate(inputs = {}) {
  const ids = inputs.existingNodeIds instanceof Set
    ? new Set(inputs.existingNodeIds)
    : new Set(inputs.existingNodeIds || []);

  const chatSlots = (inputs.chatSlots && typeof inputs.chatSlots === "object") ? inputs.chatSlots : null;
  const slotQueues = (inputs.slotQueues && typeof inputs.slotQueues === "object") ? inputs.slotQueues : null;
  const slotClaims = (inputs.slotClaims && typeof inputs.slotClaims === "object") ? inputs.slotClaims : null;
  const commits = Array.isArray(inputs.commits) ? inputs.commits : [];
  const handoffs = Array.isArray(inputs.handoffs) ? inputs.handoffs : [];

  const newNodes = [];
  const newEdges = [];
  let roostEmitted = 0;
  let subsystemAnchorsEmitted = 0;
  let slotsEmitted = 0;
  let edgesEmitted = 0;

  // ── roost ─────────────────────────────────────────────────────────────────
  if (!ids.has(SYNERGY_ROOST_ID)) {
    newNodes.push({
      id: SYNERGY_ROOST_ID,
      label: "Slot Synergy Map (13 slots × 14 subsystems)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: "End-to-end pipeline per chat slot: handoff → queue → claims → branch → commits → memories → wikis. Source: scripts/generate-slot-synergy-features.mjs.",
    });
    ids.add(SYNERGY_ROOST_ID);
    roostEmitted = 1;
  }

  // ── 14 subsystem anchor nodes ─────────────────────────────────────────────
  for (const sub of SUBSYSTEMS) {
    const anchorId = `ghost.slot_synergy.subsystem.${safeId(sub.key)}`;
    if (ids.has(anchorId)) continue;
    newNodes.push({
      id: anchorId,
      label: sub.label.slice(0, MAX_LABEL),
      layer: SUBSYSTEM_LAYER,
      ghost: true,
      status: "ghost",
      kind: "synergy-subsystem",
      parent: SYNERGY_ROOST_ID,
      color: COLOR_SUBSYSTEM,
      info: sub.info.slice(0, MAX_INFO),
    });
    ids.add(anchorId);
    subsystemAnchorsEmitted++;
  }

  // ── per-slot node + edges to non-zero subsystems ─────────────────────────
  for (const slot of SLOT_NAMES) {
    const slotId = `ghost.slot_synergy.slot.${safeId(slot)}`;
    if (ids.has(slotId)) continue;

    const slotState = chatSlots?.slots?.[slot] ?? null;
    const queueLen = Array.isArray(slotQueues?.queues?.[slot]) ? slotQueues.queues[slot].length : 0;
    const claimCount = slotClaims && typeof slotClaims === "object"
      ? Object.values(slotClaims).filter(c => c && typeof c === "object" && c.slot === slot).length
      : 0;
    const commitCount = commits.filter(s => commitMatchesSlot(s, slot)).length;
    const handoffCount = handoffs.filter(f => handoffMatchesSlot(f, slot)).length;
    const isBound = !!(slotState && slotState.chatId);
    const branchBound = !!(slotState && typeof slotState.branch === "string" && slotState.branch.startsWith(`slot/${slot}`));
    const isGolf = slot === "golf";

    const counts = {
      handoff: handoffCount,
      queue: queueLen,
      claims: claimCount,
      commits: commitCount,
      branch: branchBound ? 1 : 0,
      skills: SKILLS_PER_SLOT,
      scripts: SLOT_AWARE_SCRIPTS,
      hooks: isGolf ? SLOT_AWARE_HOOKS_GOLF : SLOT_AWARE_HOOKS_WORK,
      memories: DOCTRINE_BASE_COUNT,
      wikis: DOCTRINE_BASE_COUNT,
      tribal: DOCTRINE_BASE_COUNT,
      claudemd: DOCTRINE_BASE_COUNT,
      gsd: DOCTRINE_BASE_COUNT,
      precompact: DOCTRINE_BASE_COUNT,
      compact: DOCTRINE_BASE_COUNT,
      doctrine: DOCTRINE_BASE_COUNT,
    };

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const bound = isBound ? "BOUND" : "FREE";
    const domain = SLOT_DOMAINS[slot] || "(unmapped)";

    newNodes.push({
      id: slotId,
      label: `${slot.toUpperCase()} — ${domain} — ${bound} (${total} conn)`.slice(0, MAX_LABEL),
      layer: SLOT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "slot-synergy-node",
      parent: SYNERGY_ROOST_ID,
      color: isGolf ? COLOR_HYGIENE_SLOT : COLOR_WORK_SLOT,
      info: `[${slot}] domain=${domain} · bound=${isBound ? "yes" : "no"} · queue=${queueLen} · claims=${claimCount} · handoffs=${handoffCount} · commits(recent)=${commitCount} · branch=${branchBound ? "slot/" + slot : "(unmigrated)"} · totalConn=${total}`.slice(0, MAX_INFO),
    });
    ids.add(slotId);
    slotsEmitted++;

    // edges to every subsystem with > 0 connections
    for (const sub of SUBSYSTEMS) {
      const n = counts[sub.key] || 0;
      if (n <= 0) continue;
      const anchorId = `ghost.slot_synergy.subsystem.${safeId(sub.key)}`;
      newEdges.push({
        from: slotId,
        to: anchorId,
        type: "slot-uses-subsystem",
        weight: n,
        label: `${sub.key}=${n}`,
      });
      edgesEmitted++;
    }
  }

  return {
    newNodes,
    newEdges,
    stats: {
      roostEmitted,
      subsystemAnchorsEmitted,
      slotsEmitted,
      edgesEmitted,
      totalNewNodes: newNodes.length,
      totalNewEdges: newEdges.length,
    },
  };
}

/** Read last GIT_LOG_LIMIT commit subjects via execFile (no shell). Returns
 * `{value, available, reason}` so the caller can surface a caveat (R12). */
function readRecentCommits() {
  try {
    const out = execFileSync(
      "git",
      ["-C", ROOT, "log", `--format=%s`, `-${GIT_LOG_LIMIT}`],
      { encoding: "utf8", timeout: GIT_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"] },
    );
    const lines = out.split("\n").map(s => s.trim()).filter(Boolean);
    return { value: lines, available: true, reason: null };
  } catch (e) {
    return { value: [], available: false, reason: `git log: ${e?.message ?? "unknown"}` };
  }
}

export function main() {
  const chatSlotsResult = readJsonSoft(CHAT_SLOTS_PATH);
  const slotQueuesResult = readJsonSoft(SLOT_QUEUES_PATH);
  const slotClaimsResult = readJsonSoft(SLOT_CLAIMS_PATH);
  const handoffs = listHandoffsSoft();
  const commitsResult = readRecentCommits();

  // R12 fail-loud at the surface: collect a caveat per unavailable input so
  // the operator running regen-viz sees WHY counts are zero — never a silent
  // all-zero graph (was: silent-degrade on git-missing / corrupt JSON).
  const caveats = [];
  if (!chatSlotsResult.available)  caveats.push(`chat-slots.json unavailable (${chatSlotsResult.reason}) — all slots will render as FREE`);
  if (!slotQueuesResult.available)  caveats.push(`slot-task-queues.json unavailable (${slotQueuesResult.reason}) — per-slot queue counts = 0`);
  if (!slotClaimsResult.available)  caveats.push(`slot-task-claims.json unavailable (${slotClaimsResult.reason}) — per-slot claim counts = 0`);
  if (!commitsResult.available)     caveats.push(`git log unavailable (${commitsResult.reason}) — per-slot commit counts = 0`);

  let result;
  try {
    const { newNodes, newEdges, stats } = generate({
      chatSlots: chatSlotsResult.value,
      slotQueues: slotQueuesResult.value,
      slotClaims: slotClaimsResult.value,
      commits: commitsResult.value,
      handoffs,
      existingNodeIds: [],
    });
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: [
        "state/shared/chat-slots.json",
        "state/shared/slot-task-queues.json",
        "state/shared/slot-task-claims.json",
        "state/shared/handoffs/",
        `git log --format=%s -${GIT_LOG_LIMIT}`,
      ],
      caveats, // R12: never a silent all-zero graph — surface input degradation.
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) {
    console.error(`FATAL: generate failed — ${e.message}`);
    return 2;
  }

  try {
    if (!fs.existsSync(VIZ_DIR)) fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost emitted:        ${result.stats.roostEmitted}`);
  console.log(`  subsystem anchors:    ${result.stats.subsystemAnchorsEmitted}`);
  console.log(`  slot nodes:           ${result.stats.slotsEmitted}/${SLOT_NAMES.length}`);
  console.log(`  edges emitted:        ${result.stats.edgesEmitted}`);
  console.log(`  total new nodes:      ${result.newNodes.length}`);
  console.log(`  total new edges:      ${result.newEdges.length}`);

  // R12 fail-loud: surface caveats to stderr so operators reading the regen-viz
  // console output see input degradation immediately (the augmentation JSON
  // also carries them but most operators won't open it).
  if (caveats.length > 0) {
    console.error(`[slot-synergy] ${caveats.length} caveat(s) — counts may be partial:`);
    for (const c of caveats) console.error(`  - ${c}`);
  }
  return 0;
}

const isMain = (() => {
  try {
    return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url));
  } catch { return false; }
})();
if (isMain) process.exit(main());
