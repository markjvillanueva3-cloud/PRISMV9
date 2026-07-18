#!/usr/bin/env node
// U-P5-FLEET-AWARENESS-PANEL (SYSTEM-VIZ-BRAIN-MS0, slot=echo, 2026-05-17)
//
// Pure resolver + CLI that joins the live chat-slot table with the per-chat
// handoff directory and (optional) recent git log piped via stdin, emitting a
// JSON sidecar `state/shared/system-viz/fleet-awareness-panel.json` describing
// every concurrent chat: slot, topic, liveness, handoff, recent commits
// attributed by topic-match.
//
// Backend slice of U-P5-FLEET-AWARENESS-PANEL. The frontend (system-viz/web)
// reads this sidecar and renders the 13-chat awareness panel. The frontend
// hookup is intentionally deferred — the sidecar JSON IS the contract.
//
// NO dispatcher action surface (sidecar-only output) — same backend-clean
// pattern as U-P2-SLOT-OWNERSHIP-OVERLAY.
//
// CLI invocation pattern (git log piped in to keep this file process-spawn-free):
//   git log --since="24 hours ago" --format="%H|%s|%aI" | node scripts/system-viz-fleet-awareness.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..");
const HANDOFFS_DIR = path.join(REPO_ROOT, "state/shared/handoffs");
const DEFAULT_OUT_PATH = path.join(
  REPO_ROOT,
  "state/shared/system-viz/fleet-awareness-panel.json",
);

// ─── Freshness thresholds + parsing constants ───────────────────────────────
export const LIVE_HEARTBEAT_MS = 5 * 60 * 1000; // <5min = live
export const RECENT_HEARTBEAT_MS = 30 * 60 * 1000; // <30min = recent; >= = crashed
export const GIT_LOG_WINDOW_HOURS = 24;
export const MIN_TOPIC_SLUG_LEN = 3;
export const MAX_RECENT_COMMITS_PER_CHAT = 5;

// Handoff filename: `HANDOFF-<chatId>-<topic>.md` where chatId is `claude-<6-16 hex>`.
const HANDOFF_REGEX = /^HANDOFF-(claude-[a-f0-9]{6,16})-(.+)\.md$/;

// Commit subject scope: `[MAIN] [SCOPE-XXX]/...` OR `[SCOPE-XXX]/...`.
// Extracts the SCOPE-MS<N> token (e.g., "SYSTEM-VIZ-BRAIN-MS0").
const COMMIT_SCOPE_REGEX = /\[(?:MAIN\][\s]+\[)?([A-Z][A-Z0-9-]+-MS\d+)\]/;

// ─── 13-slot fallback (mirrors chat-slots.mjs::SLOT_NAMES) ──────────────────
export const SLOT_NAMES_FALLBACK = [
  "alpha",
  "bravo",
  "charlie",
  "delta",
  "echo",
  "foxtrot",
  "golf",
  "hotel",
  "india",
  "juliett",
  "kilo",
  "lima",
  "mike",
  // Slots 14-26 added 2026-05-19 (SLOT-RECLAIM 13->26). MUST mirror SLOT_NAMES in
  // .claude/helpers/chat-slots.mjs (the canonical fleet roster).
  "november",
  "oscar",
  "papa",
  "quebec",
  "romeo",
  "sierra",
  "tango",
  "uniform",
  "victor",
  "whiskey",
  "xray",
  "yankee",
  "zulu",
];

// ─── Pure-core resolver ─────────────────────────────────────────────────────
export function buildFleetAwarenessPanel({
  chatSlotsState = {},
  handoffEntries = [],
  gitCommits = [],
  slotNames = SLOT_NAMES_FALLBACK,
  now = null,
} = {}) {
  const nowMs = typeof now === "number" ? now : Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const slots = (chatSlotsState && chatSlotsState.slots) || {};

  // Map chatId → slot info from live slots table.
  // Object.create(null) prevents prototype-pollution if a chatId happens to be
  // literally "__proto__" or "constructor" (per-file scrutiny lesson from
  // U-P2-SLOT-OWNERSHIP-OVERLAY).
  const chatIdToSlot = Object.create(null);
  for (const [slotName, slotState] of Object.entries(slots)) {
    if (slotState && slotState.chatId) {
      chatIdToSlot[slotState.chatId] = { slotName, slotState };
    }
  }

  // Group handoffs by chatId (one chat may have multiple topic handoffs).
  const handoffsByChatId = Object.create(null);
  for (const entry of handoffEntries) {
    if (!entry || !entry.chatId) continue;
    if (!handoffsByChatId[entry.chatId]) handoffsByChatId[entry.chatId] = [];
    handoffsByChatId[entry.chatId].push(entry);
  }
  // Most-recent handoff per chatId (sort by lastModifiedMs DESC).
  for (const chatId of Object.keys(handoffsByChatId)) {
    handoffsByChatId[chatId].sort(
      (a, b) => (b.lastModifiedMs || 0) - (a.lastModifiedMs || 0),
    );
  }

  // Union of all chatIds: every chatId in slots PLUS every chatId with handoffs.
  const chatIdsSeen = new Set();
  for (const slotState of Object.values(slots)) {
    if (slotState && slotState.chatId) chatIdsSeen.add(slotState.chatId);
  }
  for (const chatId of Object.keys(handoffsByChatId)) chatIdsSeen.add(chatId);

  const chats = Object.create(null);
  let chatsLive = 0;
  let chatsRecent = 0;
  let chatsCrashed = 0;
  let chatsWithHandoff = 0;
  let chatsWithSlot = 0;

  for (const chatId of [...chatIdsSeen].sort()) {
    const slotInfo = chatIdToSlot[chatId] || null;
    const handoff = (handoffsByChatId[chatId] || [])[0] || null;
    const slotState = slotInfo ? slotInfo.slotState : null;

    let heartbeatAgeMs = null;
    let liveness = "unknown";
    if (slotState && slotState.lastHeartbeat) {
      const hb = Date.parse(slotState.lastHeartbeat);
      if (Number.isFinite(hb)) {
        heartbeatAgeMs = Math.max(0, nowMs - hb);
        if (heartbeatAgeMs < LIVE_HEARTBEAT_MS) liveness = "live";
        else if (heartbeatAgeMs < RECENT_HEARTBEAT_MS) liveness = "recent";
        else liveness = "crashed";
      }
    } else if (handoff && handoff.lastModifiedMs) {
      // No slot binding but handoff exists — derive liveness from handoff mtime.
      const age = Math.max(0, nowMs - handoff.lastModifiedMs);
      if (age < LIVE_HEARTBEAT_MS) liveness = "live-no-slot";
      else if (age < RECENT_HEARTBEAT_MS) liveness = "recent-no-slot";
      else liveness = "crashed-no-slot";
    }

    // Topic→commit attribution: slot topic is typically `<slot>-<scope-slug>`,
    // e.g. `echo-system-viz-brain`. Commit scope is `SYSTEM-VIZ-BRAIN-MS0`.
    // Bidirectional substring match — BOTH sides gated by MIN_TOPIC_SLUG_LEN to
    // kill the "VIZ" → "system-viz-brain" false-positive class (per-file
    // scrutiny arm A P1-1 + arm B P2-3).
    //
    // Slot-prefix strip is anchored to slotNames so `multi-axis-rough` doesn't
    // get its `multi-` stripped as if it were a slot name (arm B P3-4).
    const topic = (slotState && slotState.topic) || (handoff && handoff.topic) || "";
    const slotPrefixRegex = new RegExp(`^(${slotNames.join("|")})-`, "i");
    const topicSlug = topic.replace(slotPrefixRegex, "").toLowerCase();
    const matchedCommits = [];
    if (topicSlug && topicSlug.length >= MIN_TOPIC_SLUG_LEN) {
      for (const commit of gitCommits) {
        const scopeLower = (commit.scope || "").toLowerCase();
        if (!scopeLower) continue;
        const scopeNoMs = scopeLower.replace(/-ms\d+$/, "");
        const fwdMatch = scopeLower.length >= MIN_TOPIC_SLUG_LEN &&
          scopeLower.includes(topicSlug);
        const revMatch = scopeNoMs.length >= MIN_TOPIC_SLUG_LEN &&
          topicSlug.includes(scopeNoMs);
        if (fwdMatch || revMatch) {
          matchedCommits.push({
            sha: commit.sha,
            subject: commit.subject,
            timestamp: commit.timestamp,
          });
        }
      }
    }
    matchedCommits.sort((a, b) => {
      const ta = Date.parse(a.timestamp || "") || 0;
      const tb = Date.parse(b.timestamp || "") || 0;
      return tb - ta;
    });

    chats[chatId] = {
      chatId,
      slot: slotInfo ? slotInfo.slotName : null,
      slotMeta: slotState
        ? {
            host: slotState.host || null,
            topic: slotState.topic || null,
            branch: slotState.branch || null,
            activity: slotState.activity || null,
            lastHeartbeat: slotState.lastHeartbeat || null,
            terminalWindowId: slotState.terminalWindowId || null,
          }
        : null,
      liveness,
      heartbeatAgeMs,
      handoff: handoff
        ? {
            filename: handoff.filename,
            topic: handoff.topic,
            lastModifiedMs: handoff.lastModifiedMs,
            lastModifiedIso: handoff.lastModifiedMs
              ? new Date(handoff.lastModifiedMs).toISOString()
              : null,
            allTopicsCount: handoffsByChatId[chatId].length,
          }
        : null,
      recentCommits: matchedCommits.slice(0, MAX_RECENT_COMMITS_PER_CHAT),
      recentCommitCount: matchedCommits.length,
    };

    if (slotInfo) chatsWithSlot += 1;
    if (handoff) chatsWithHandoff += 1;
    if (liveness === "live" || liveness === "live-no-slot") chatsLive += 1;
    else if (liveness === "recent" || liveness === "recent-no-slot")
      chatsRecent += 1;
    else if (liveness === "crashed" || liveness === "crashed-no-slot")
      chatsCrashed += 1;
  }

  const totalCommits24h = gitCommits.length;
  const attributedCommits = Object.values(chats).reduce(
    (s, c) => s + c.recentCommitCount,
    0,
  );
  const slotsOccupied = Object.values(slots).filter((s) => s && s.chatId).length;

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    sources: {
      chatSlots: ".claude/helpers/chat-slots.mjs::readSlots()",
      handoffs: "state/shared/handoffs/HANDOFF-<chatId>-<topic>.md",
      gitLog:
        "git log --since='24 hours ago' --format='%H|%s|%aI' piped via stdin",
    },
    thresholds: {
      liveHeartbeatMs: LIVE_HEARTBEAT_MS,
      recentHeartbeatMs: RECENT_HEARTBEAT_MS,
      gitLogWindowHours: GIT_LOG_WINDOW_HOURS,
    },
    slotNames: slotNames.slice(),
    chats,
    summary: {
      chatsTotal: chatIdsSeen.size,
      chatsLive,
      chatsRecent,
      chatsCrashed,
      chatsWithSlot,
      chatsWithHandoff,
      slotsOccupied,
      slotsAvailable: slotNames.length - slotsOccupied,
      totalCommits24h,
      attributedCommits,
      unattributedCommits: Math.max(0, totalCommits24h - attributedCommits),
    },
    advisory: {
      mustHumanVerify: true,
      caveat:
        "Liveness from last-heartbeat freshness (live<5min, recent<30min, crashed>=30min); chats without slot binding fall back to handoff mtime. Commit-to-chat attribution is a topic-substring heuristic — a single commit MAY be attributed to multiple chats whose topic slugs overlap, so attributedCommits can exceed totalCommits24h. unattributedCommits is floored at 0 and only meaningful when ≤ totalCommits24h. Per-chat counts are independent; cross-chat dedup is NOT performed (operator review surface).",
    },
  };
}

// ─── I/O wrappers ───────────────────────────────────────────────────────────
export async function readChatSlots() {
  try {
    // Windows: import() of absolute path needs file:// URL (per-file scrutiny
    // P1 lesson from U-P2-SLOT-OWNERSHIP-OVERLAY).
    const absPath = path.join(REPO_ROOT, ".claude/helpers/chat-slots.mjs");
    const url = pathToFileURL(absPath).href;
    const mod = await import(url);
    const state =
      typeof mod.readSlots === "function" ? mod.readSlots() : { slots: {} };
    const slotNames =
      Array.isArray(mod.SLOT_NAMES) && mod.SLOT_NAMES.length
        ? mod.SLOT_NAMES
        : SLOT_NAMES_FALLBACK;
    return { state, slotNames };
  } catch (e) {
    process.stderr.write(
      `[system-viz-fleet-awareness] readChatSlots failed: ${e && e.message}\n`,
    );
    return {
      state: { slots: {} },
      slotNames: SLOT_NAMES_FALLBACK,
      _readError: String(e && e.message),
    };
  }
}

export function readHandoffsDir(dirPath = HANDOFFS_DIR) {
  const entries = [];
  try {
    if (!fs.existsSync(dirPath)) return entries;
    const files = fs.readdirSync(dirPath);
    for (const filename of files) {
      const m = HANDOFF_REGEX.exec(filename);
      if (!m) continue;
      const [, chatId, topic] = m;
      let lastModifiedMs = null;
      try {
        lastModifiedMs = fs.statSync(path.join(dirPath, filename)).mtimeMs;
      } catch {
        // stat failure — keep null; the record still appears.
      }
      entries.push({ filename, chatId, topic, lastModifiedMs });
    }
  } catch (e) {
    process.stderr.write(
      `[system-viz-fleet-awareness] readHandoffsDir failed: ${e && e.message}\n`,
    );
  }
  return entries;
}

export function parseGitLog(out) {
  if (!out || typeof out !== "string") return [];
  const commits = [];
  for (const line of out.split(/\r?\n/)) {
    if (!line) continue;
    const idx1 = line.indexOf("|");
    const idx2 = line.indexOf("|", idx1 + 1);
    if (idx1 < 0 || idx2 < 0) continue;
    const sha = line.slice(0, idx1);
    const subject = line.slice(idx1 + 1, idx2);
    const timestamp = line.slice(idx2 + 1);
    const sm = COMMIT_SCOPE_REGEX.exec(subject);
    const scope = sm ? sm[1] : null;
    commits.push({ sha, subject, timestamp, scope });
  }
  return commits;
}

export function readStdinSync() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

export function writePanel(outPath, panel) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // Atomic write — tmp + rename (per U-P2-SLOT-OWNERSHIP-OVERLAY lesson).
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(panel, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, outPath);
  return outPath;
}

// ─── Arg parsing ────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const out = {
    outPath: DEFAULT_OUT_PATH,
    json: false,
    frozenTime: null,
    gitLogFile: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.outPath = argv[++i];
    else if (a === "--json") out.json = true;
    else if (a === "--frozen-time") out.frozenTime = argv[++i];
    else if (a === "--git-log-file") out.gitLogFile = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const HELP = `system-viz-fleet-awareness — emit fleet-awareness panel JSON
  --out <path>           output path (default: state/shared/system-viz/fleet-awareness-panel.json)
  --json                 print to stdout, do not write file
  --frozen-time <ISO>    deterministic timestamp for tests
  --git-log-file <path>  read git log output from file (else stdin)
  --help                 show this

Pipe git log in via stdin OR pass --git-log-file:
  git log --since="24 hours ago" --format="%H|%s|%aI" | node system-viz-fleet-awareness.mjs
`;

// ─── CLI ────────────────────────────────────────────────────────────────────
export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const { state: chatSlotsState, slotNames } = await readChatSlots();
  const handoffEntries = readHandoffsDir();

  let gitLogTxt = "";
  if (args.gitLogFile) {
    try {
      gitLogTxt = fs.readFileSync(args.gitLogFile, "utf8");
    } catch (e) {
      process.stderr.write(
        `[system-viz-fleet-awareness] --git-log-file read failed: ${e.message}\n`,
      );
    }
  } else {
    gitLogTxt = readStdinSync();
  }
  const gitCommits = parseGitLog(gitLogTxt);

  const nowMs = args.frozenTime ? Date.parse(args.frozenTime) : Date.now();
  const panel = buildFleetAwarenessPanel({
    chatSlotsState,
    handoffEntries,
    gitCommits,
    slotNames,
    now: Number.isFinite(nowMs) ? nowMs : Date.now(),
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(panel, null, 2) + "\n");
    return 0;
  }

  writePanel(args.outPath, panel);
  const s = panel.summary;
  process.stdout.write(
    `fleet-awareness-panel written → ${path.relative(REPO_ROOT, args.outPath)}\n` +
      `  chats=${s.chatsTotal} live=${s.chatsLive} recent=${s.chatsRecent} crashed=${s.chatsCrashed}\n` +
      `  slots=${s.slotsOccupied}/${slotNames.length} occupied  commits24h=${s.totalCommits24h} attributed=${s.attributedCommits}\n`,
  );
  return 0;
}

const _invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();
if (_invokedAsCli) {
  void main().then((code) => process.exit(code || 0));
}
