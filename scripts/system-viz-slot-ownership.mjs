#!/usr/bin/env node
// U-P2-SLOT-OWNERSHIP-OVERLAY (SYSTEM-VIZ-BRAIN-MS0, slot=echo, 2026-05-17)
//
// Pure-core resolver + CLI that joins `session-file-ownership.json` with the
// live chat-slot table (`chat-slots.mjs::readSlots()`) and emits a JSON
// sidecar `state/shared/system-viz/slot-ownership-overlay.json` mapping every
// tracked file to its owning chat session AND (when the owning session still
// holds a slot) the slot name + a deterministic color from a 13-slot palette.
//
// Backend slice of U-P2-SLOT-OWNERSHIP-OVERLAY. The frontend (system-viz/web)
// reads this sidecar and tints nodes by `files[<filekey>].slot`. The frontend
// hookup is intentionally deferred — the resolver IS the load-bearing contract.
//
// NO dispatcher action surface here (sidecar-only output) — avoids the
// dispatcher-contract bug class that bit U-P2-NODE-CLICK-DISPATCH.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Repo paths ──────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, "..");
const FILE_OWNERSHIP_PATH = path.join(
  REPO_ROOT,
  "mcp-server/data/state/session-file-ownership.json",
);
const DEFAULT_OUT_PATH = path.join(
  REPO_ROOT,
  "state/shared/system-viz/slot-ownership-overlay.json",
);

// ─── 13-slot palette (deterministic HSL spacing) ─────────────────────────────
// Order MUST match SLOT_NAMES in .claude/helpers/chat-slots.mjs.
// HSL: evenly-spaced hue, 70% sat, 55% light — maximum distinguishability.
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
];

export const PALETTE_SAT = 0.7;
export const PALETTE_LIGHT = 0.55;

function hslToHex(h, s, l) {
  // h: 0..360, s/l: 0..1
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function buildPalette(slotNames = SLOT_NAMES_FALLBACK) {
  const n = slotNames.length;
  if (n === 0) return {};
  const palette = {};
  for (let i = 0; i < n; i++) {
    const hue = (i * 360) / n;
    palette[slotNames[i]] = hslToHex(hue, PALETTE_SAT, PALETTE_LIGHT);
  }
  return palette;
}

// ─── Pure-core resolver ──────────────────────────────────────────────────────
//
// Inputs (all optional — defaults safe):
//   fileOwnership: {files: {<relpath>: {session, timestamp}}, sessions: {<sid>: {lastActive, hostname, filesOwned}}}
//   chatSlotsState: {schemaVersion, lastUpdated, slots: {<slotName>: {chatId, host, lastHeartbeat, branch, topic, ...}}}
//   slotNames: string[] (defaults to SLOT_NAMES_FALLBACK)
//   palette: {[slot]: "#hex"} (defaults to buildPalette(slotNames))
//   now: number (ms since epoch, defaults to Date.now())
//
// Returns the overlay object (NOT serialized).
export function buildSlotOwnership({
  fileOwnership = {},
  chatSlotsState = {},
  slotNames = SLOT_NAMES_FALLBACK,
  palette = null,
  now = null,
} = {}) {
  const nowMs = typeof now === "number" ? now : Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const resolvedPalette = palette || buildPalette(slotNames);

  const files = (fileOwnership && fileOwnership.files) || {};
  const sessions = (fileOwnership && fileOwnership.sessions) || {};
  const slots = (chatSlotsState && chatSlotsState.slots) || {};

  // Build chatId → slotName lookup from live slots table.
  // Object.create(null) prevents prototype-pollution if a chatId is literally
  // "__proto__" or "constructor" (per-file scrutiny arm A P2).
  const chatIdToSlot = Object.create(null);
  for (const [slotName, slotState] of Object.entries(slots)) {
    if (slotState && slotState.chatId) {
      chatIdToSlot[slotState.chatId] = slotName;
    }
  }

  const overlayFiles = Object.create(null);
  const perSlotFiles = Object.create(null);
  const perSessionFiles = Object.create(null);
  let filesWithSlot = 0;
  let filesSessionOnly = 0;
  let filesMalformed = 0;

  // Stable sort: file keys alphabetical.
  const sortedFileKeys = Object.keys(files).slice().sort();
  for (const fileKey of sortedFileKeys) {
    const entry = files[fileKey];
    if (!entry || typeof entry !== "object") {
      filesMalformed += 1;
      continue;
    }
    const sessionId = entry.session;
    const ts = typeof entry.timestamp === "number" ? entry.timestamp : null;
    if (!sessionId || typeof sessionId !== "string") {
      filesMalformed += 1;
      continue;
    }
    const slot = chatIdToSlot[sessionId] || null;
    const sessionMeta = sessions[sessionId] || {};
    const hostname = sessionMeta.hostname || null;

    const fileRec = {
      session: sessionId,
      slot,
      color: slot ? resolvedPalette[slot] || null : null,
      lastTouchMs: ts,
      lastTouchIso: ts ? new Date(ts).toISOString() : null,
      hostname,
    };
    overlayFiles[fileKey] = fileRec;

    if (slot) {
      filesWithSlot += 1;
      if (!perSlotFiles[slot]) {
        perSlotFiles[slot] = {
          fileCount: 0,
          chatId: sessionId,
          topic: slots[slot]?.topic || null,
          host: slots[slot]?.host || null,
          lastHeartbeat: slots[slot]?.lastHeartbeat || null,
        };
      }
      perSlotFiles[slot].fileCount += 1;
    } else {
      filesSessionOnly += 1;
    }

    if (!perSessionFiles[sessionId]) {
      perSessionFiles[sessionId] = {
        fileCount: 0,
        slot,
        hostname,
        lastActive: sessionMeta.lastActive || null,
      };
    }
    perSessionFiles[sessionId].fileCount += 1;
  }

  // Slot palette entries appear in canonical slot-name order.
  const orderedPalette = {};
  for (const name of slotNames) {
    if (resolvedPalette[name]) orderedPalette[name] = resolvedPalette[name];
  }

  return {
    schemaVersion: 1,
    generatedAt: nowIso,
    sources: {
      fileOwnership: "mcp-server/data/state/session-file-ownership.json",
      chatSlots: ".claude/helpers/chat-slots.mjs::readSlots()",
    },
    slotNames: slotNames.slice(),
    slotPalette: orderedPalette,
    files: overlayFiles,
    summary: {
      filesTotal: sortedFileKeys.length,
      filesWithSlot,
      filesSessionOnly,
      filesMalformed,
      slotsActive: Object.keys(perSlotFiles).length,
      sessionsTotal: Object.keys(perSessionFiles).length,
    },
    perSlot: perSlotFiles,
    perSession: perSessionFiles,
    advisory: {
      mustHumanVerify: true,
      caveat:
        "Slot assignment reflects the CURRENT live slot binding of the session that last touched the file — not the slot binding at touch time (chat-slots may have rotated since). Files whose owning session has no current slot are emitted with slot:null.",
    },
  };
}

// ─── I/O wrappers (the only impure surface) ──────────────────────────────────
export function readFileOwnership(filePath = FILE_OWNERSHIP_PATH) {
  try {
    if (!fs.existsSync(filePath)) return { files: {}, sessions: {} };
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return { files: {}, sessions: {}, _readError: String(e && e.message) };
  }
}

export async function readChatSlots() {
  try {
    // Windows: `import()` of an absolute path with backslashes fails — use file:// URL.
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
    // Fail-LOUD per Karpathy R12: emit on stderr so silent-empty doesn't masquerade
    // as "no slots claimed". Caller still gets safe defaults.
    process.stderr.write(
      `[system-viz-slot-ownership] readChatSlots failed: ${e && e.message}\n`,
    );
    return {
      state: { slots: {} },
      slotNames: SLOT_NAMES_FALLBACK,
      _readError: String(e && e.message),
    };
  }
}

export function writeOverlay(outPath, overlay) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // Atomic write: tmp + rename. A crash mid-write must NOT leave a truncated
  // sidecar that frontend readers parse-fail on (per-file scrutiny arm A P2).
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(overlay, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, outPath);
  return outPath;
}

// ─── Arg parsing ─────────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const out = {
    outPath: DEFAULT_OUT_PATH,
    json: false,
    frozenTime: null,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.outPath = argv[++i];
    else if (a === "--json") out.json = true;
    else if (a === "--frozen-time") out.frozenTime = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const HELP = `system-viz-slot-ownership — emit slot-ownership overlay JSON
  --out <path>           output path (default: state/shared/system-viz/slot-ownership-overlay.json)
  --json                 print to stdout, do not write file
  --frozen-time <ISO>    deterministic timestamp for tests
  --help                 show this
`;

// ─── CLI ─────────────────────────────────────────────────────────────────────
export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP);
    return 0;
  }
  const fileOwnership = readFileOwnership();
  const { state: chatSlotsState, slotNames } = await readChatSlots();
  const nowMs = args.frozenTime
    ? Date.parse(args.frozenTime)
    : Date.now();
  const overlay = buildSlotOwnership({
    fileOwnership,
    chatSlotsState,
    slotNames,
    now: Number.isFinite(nowMs) ? nowMs : Date.now(),
  });

  if (args.json) {
    process.stdout.write(JSON.stringify(overlay, null, 2) + "\n");
    return 0;
  }

  writeOverlay(args.outPath, overlay);
  const s = overlay.summary;
  process.stdout.write(
    `slot-ownership-overlay written → ${path.relative(REPO_ROOT, args.outPath)}\n` +
      `  files=${s.filesTotal} withSlot=${s.filesWithSlot} sessionOnly=${s.filesSessionOnly} malformed=${s.filesMalformed}\n` +
      `  slotsActive=${s.slotsActive}/${slotNames.length} sessionsTotal=${s.sessionsTotal}\n`,
  );
  return 0;
}

const _invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    // Use pathToFileURL for cross-platform CLI detection — works on Windows
    // (drive letters), POSIX paths, and UNC paths uniformly (per-file scrutiny
    // arm A P1 + arm B P2-2; replaces fragile manual URL construction).
    const argvUrl = pathToFileURL(process.argv[1]).href;
    return import.meta.url === argvUrl;
  } catch {
    return false;
  }
})();
if (_invokedAsCli) {
  void main().then((code) => process.exit(code || 0));
}
