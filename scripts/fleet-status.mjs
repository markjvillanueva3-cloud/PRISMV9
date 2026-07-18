#!/usr/bin/env node
/**
 * fleet-status.mjs — visual dashboard for the 7-chat PRISM fleet.
 *
 * Slot taxonomy (CLEANUP-MS0):
 *   alpha · bravo · charlie · delta · echo · foxtrot   → role=work   (feature commits OK)
 *   golf                                                → role=hygiene (cleanup-only, write-allowlist enforced via U-CLEANUP-A5)
 *
 * Renders chat-slots.json as a boxed ASCII dashboard. Shows per-slot status
 * (alive/stale/crashed/idle), branch, topic, heartbeat age, current
 * activity, and aggregate fleet stats broken down by role.
 *
 * Usage:
 *   node scripts/fleet-status.mjs               # one-shot render
 *   node scripts/fleet-status.mjs --watch       # auto-refresh every 5s
 *   node scripts/fleet-status.mjs --watch=2     # custom interval (seconds)
 *   node scripts/fleet-status.mjs --compact     # one-line variant
 *   node scripts/fleet-status.mjs --json        # raw JSON (includes per-slot role)
 *   node scripts/fleet-status.mjs --reclaim     # sweep crashed slots
 *
 * Exit codes:
 *   0 — success
 *   1 — read failure
 *   2 — fleet has crashed slots (CI-friendly advisory)
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HELPER_PATH = resolve(__dirname, "..", ".claude", "helpers", "chat-slots.mjs");
const SLOT_SOULS_DIR = resolve(__dirname, "..", "state", "shared", "slot-souls");
// Canonical chat-slot domain catalog (operator-maintained, NOT slot-soul .md
// frontmatter — souls carry Hermes personality voice + refuses, the file
// below carries the operator's per-slot WORK ASSIGNMENT). Path lives at the
// H:\ drive root, outside the repo, mirroring the c-to-h-mirror discipline.
const CHAT_SLOT_DOMAINS_FILE = "H:/CHAT-SLOT-DOMAINS.md";

// ─── Glyphs ─────────────────────────────────────────────────────────────
const GLYPH = { alive: "🟢", stale: "🟡", crashed: "🔴", idle: "⚫" };
const COMPACT_FLAG = { alive: "✓", stale: "…", crashed: "✗", idle: "·" };

// ─── Slot taxonomy ──────────────────────────────────────────────────────
// "work" slots commit feature code; "hygiene" slot (golf) is cleanup-only
// and bound by golf-slot-write-allowlist.mjs (U-CLEANUP-A5). Keep this
// table aligned with .claude/helpers/chat-slots.mjs SLOT_NAMES.
const SLOT_ROLES = {
  alpha:   "work",
  bravo:   "work",
  charlie: "work",
  delta:   "work",
  echo:    "work",
  foxtrot: "work",
  golf:    "hygiene",
};
function roleOf(slot) {
  return SLOT_ROLES[slot] ?? "work";
}

// ─── Chat-slot domain catalog (operator-canonical) ─────────────────────
// Source of truth: H:/CHAT-SLOT-DOMAINS.md — operator-maintained file
// listing each NATO slot's WORK ASSIGNMENT in the format:
//   ALPHA - TOKEN OPTIMIZATION + EFFICIENCY HUNTING + OBSIDIAN ...
//   BRAVO - HERMES/ZEBRA BUILDING + STUB HUNTING
//   ...
//
// NOT the slot-soul .md frontmatter — souls carry Hermes personality
// (voice/tone/refuses) which is orthogonal to the work assignment.
// Cached on first parse. Returns null if file missing/unreadable (graceful).
let __DOMAIN_CACHE = null;
function parseChatSlotDomains(src) {
  const out = {};
  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Match "SLOTNAME - description" — slot is uppercase NATO; description
    // is anything after the first dash with surrounding whitespace.
    const m = line.match(/^([A-Z]+)\s*-\s*(.+?)\s*$/);
    if (!m) continue;
    const slot = m[1].toLowerCase();
    // Sanity: ignore header lines like "CURRENT CHAT SLOT DESIGINATION"
    // which lack the slot-name structure and won't have a dash anyway, or
    // pseudo-slots that aren't in the NATO universe.
    out[slot] = m[2];
  }
  return out;
}
export function readChatSlotDomains() {
  if (__DOMAIN_CACHE) return __DOMAIN_CACHE;
  try {
    if (!existsSync(CHAT_SLOT_DOMAINS_FILE)) { __DOMAIN_CACHE = {}; return __DOMAIN_CACHE; }
    const src = readFileSync(CHAT_SLOT_DOMAINS_FILE, "utf8");
    __DOMAIN_CACHE = parseChatSlotDomains(src);
  } catch { __DOMAIN_CACHE = {}; }
  return __DOMAIN_CACHE;
}

export function domainOf(slot) {
  const map = readChatSlotDomains();
  return map[slot] || null;
}

// Back-compat shim: callers that imported domainFilterOf from the prior
// slot-soul-based implementation continue to work; we just return the full
// description (the same string domainOf returns) since CHAT-SLOT-DOMAINS.md
// doesn't separate domain-filter from work-assignment.
export function domainFilterOf(slot) {
  return domainOf(slot);
}

// Test-injection helper — clears the cache so unit tests can swap fixtures.
export function __resetChatSlotDomainsCache() { __DOMAIN_CACHE = null; }

// ─── Formatting helpers ─────────────────────────────────────────────────
function formatAge(ms) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${String(rs).padStart(2, "0")}s ago`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${String(rm).padStart(2, "0")}m ago`;
}

function trunc(s, w) {
  s = String(s ?? "—");
  return s.length <= w ? s : s.slice(0, w - 1) + "…";
}

// ─── Compact one-line variant ──────────────────────────────────────────
// Work-slots and hygiene-slot are separated by " | " so a reader can tell
// where the work pool ends and the hygiene slot begins at a glance.
function renderCompact(snapshot) {
  const glyphs = snapshot.slots.map(s => GLYPH[s.status]).join("");
  const workParts = snapshot.slots
    .filter(s => roleOf(s.slot) === "work")
    .map(s => `${s.slot}${COMPACT_FLAG[s.status]}`);
  const hygieneParts = snapshot.slots
    .filter(s => roleOf(s.slot) === "hygiene")
    .map(s => `${s.slot}${COMPACT_FLAG[s.status]}`);
  const tail = hygieneParts.length > 0 ? ` | ${hygieneParts.join(" ")}` : "";
  return `PRISM ${glyphs}  ${workParts.join(" ")}${tail}`;
}

// ─── Summary breakdown by role ─────────────────────────────────────────
// Status keys are derived from snapshot.summary so a future classifySlot()
// status (e.g. "reclaiming") flows through without a renderer code change.
function summaryByRole(snapshot) {
  const keys = Object.keys(snapshot.summary ?? { alive: 0, stale: 0, crashed: 0, idle: 0 });
  const init = () => Object.fromEntries(keys.map(k => [k, 0]));
  const out = { work: init(), hygiene: init() };
  for (const s of snapshot.slots) {
    const r = roleOf(s.slot);
    if (out[r]) out[r][s.status] = (out[r][s.status] ?? 0) + 1;
  }
  return out;
}

// ─── Boxed dashboard render — fixed-width, no ANSI inside the box ─────
//
// Box dimensions: total 80 chars wide, content area 78 chars between │.
// Plain text only inside the box for predictable padding. Color goes on
// the OUTSIDE: we render the row first as plain text, measure it, then
// optionally wrap status glyphs / row prefixes with ANSI color codes after
// the box is fully composed. Avoids the visible-vs-byte-length mismatch
// that breaks alignment when ANSI codes live mid-row.
function renderBoxed(snapshot, reclaimed, opts = {}) {
  const W = 78;
  const dash = "─".repeat(W);
  const lines = [];
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const watchTag = opts.watch ? ` (refresh:${opts.watchIntervalS ?? 5}s)` : "";

  const headerL = "  PRISM FLEET STATUS";
  const headerR = `${ts}${watchTag}  `;
  const headerSpace = Math.max(1, W - headerL.length - headerR.length);
  const header = headerL + " ".repeat(headerSpace) + headerR;

  lines.push(`┌${dash}┐`);
  lines.push(`│${pad(header, W)}│`);
  lines.push(`├${dash}┤`);

  // Track role transitions so we can drop a divider between the work pool
  // and the hygiene slot. SLOT_NAMES is intentionally ordered work-then-
  // hygiene in chat-slots.mjs, so the first non-work slot is the transition.
  // We emit the divider only ONCE (on first work→hygiene crossing) so that
  // any future reordering of SLOT_NAMES (or a slot list shuffled by external
  // sorters) doesn't produce duplicate dividers.
  let lastRole = null;
  let dividerEmitted = false;
  for (const s of snapshot.slots) {
    const role = roleOf(s.slot);
    if (
      !dividerEmitted &&
      lastRole === "work" &&
      role === "hygiene"
    ) {
      const label = ` ${role} slot (CLEANUP-MS0) `;
      const pad1 = Math.floor((W - label.length) / 2);
      const pad2 = W - label.length - pad1;
      lines.push(`│${"─".repeat(pad1)}${label}${"─".repeat(pad2)}│`);
      dividerEmitted = true;
    }
    lastRole = role;

    const glyph = GLYPH[s.status];
    const slotName = s.slot.toUpperCase().padEnd(8);
    const chatId = (s.state?.chatId ?? "—").padEnd(18);
    const branch = trunc(s.state?.branch ?? "—", 28).padEnd(28);
    const age = formatAge(s.ageMs).padStart(13);

    lines.push(`│${pad(`  ${glyph} ${slotName}${chatId}${branch}${age}  `, W)}│`);

    let act;
    if (!s.state) {
      act = role === "hygiene" ? "              hygiene slot free" : "              slot free";
    } else if (s.status === "crashed") {
      act = `              CRASHED — slot reclaimable now (${formatAge(s.ageMs)})`;
    } else {
      act = `              ${trunc(s.state.activity ?? "(no activity reported)", 56)}`;
    }
    lines.push(`│${pad(act, W)}│`);

    if (s.state) {
      lines.push(`│${pad(`              topic: ${trunc(s.state.topic ?? "(no topic)", 50)}`, W)}│`);
    }
    // Per-slot domain assignment — operator-canonical source is
    // H:/CHAT-SLOT-DOMAINS.md (read via readChatSlotDomains()). Renders for
    // ALL slots — claimed or idle — so the dashboard answers "which chat
    // does what?" alongside "which chat is alive?". Long descriptions get
    // truncated to fit the 78-col box.
    const domain = domainOf(s.slot);
    if (domain) {
      lines.push(`│${pad(`              domain: ${trunc(domain, 60)}`, W)}│`);
    }
    lines.push(`│${pad("", W)}│`);
  }

  lines.push(`├${dash}┤`);
  const sum = snapshot.summary;
  const byRole = summaryByRole(snapshot);
  lines.push(`│${pad(`  Total    Active:${sum.alive}  Stale:${sum.stale}  Crashed:${sum.crashed}  Free:${sum.idle}`, W)}│`);
  lines.push(`│${pad(`  Work     Active:${byRole.work.alive}  Stale:${byRole.work.stale}  Crashed:${byRole.work.crashed}  Free:${byRole.work.idle}`, W)}│`);
  lines.push(`│${pad(`  Hygiene  Active:${byRole.hygiene.alive}  Stale:${byRole.hygiene.stale}  Crashed:${byRole.hygiene.crashed}  Free:${byRole.hygiene.idle}`, W)}│`);
  if (reclaimed && reclaimed.length > 0) {
    lines.push(`│${pad(`  Reclaimed crashed slots this pass: ${reclaimed.map(r => r.slot).join(", ")}`, W)}│`);
  }
  lines.push(`└${dash}┘`);

  if (opts.watch) lines.push("press ctrl+c to exit");
  return lines.join("\n");
}

// Emoji-width compensation set — derived from GLYPH so a future glyph
// added to that table doesn't silently misalign rendered rows.
const GLYPH_VISUAL_WIDTH_RE = new RegExp(
  `[${Object.values(GLYPH).join("")}]`,
  "gu"
);
function pad(s, w) {
  s = String(s ?? "");
  // glyph (🟢, etc.) renders as 2 cells in most terminals but counts as 1
  // codepoint after the surrogate pair. Approximate: replace each glyph
  // with two cells of placeholder before measuring length.
  const visual = s.replace(GLYPH_VISUAL_WIDTH_RE, "x x"); // each glyph ≈ 2 cells
  if (visual.length >= w) return s.slice(0, w);
  return s + " ".repeat(w - visual.length);
}

// Pure helpers are exported so vitest can render synthetic snapshots
// without spawning a subprocess or depending on live chat-slots state.
export { renderBoxed, renderCompact, summaryByRole, roleOf, SLOT_ROLES };
// readSlotSoul + domainOf + domainFilterOf are exported inline at their
// definitions (above) — see "Slot-soul domain reader" section.

// ─── Main driver ────────────────────────────────────────────────────────
// Everything below runs ONLY when invoked as the main script. Tests that
// `import` from this module get the pure surface above without triggering
// argv parsing, helper imports, or process.exit.
async function main() {
  const args = process.argv.slice(2);
  const flags = {};
  for (const a of args) {
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = "true";
    }
  }
  const WATCH = flags.watch !== undefined;
  const WATCH_INTERVAL_S = flags.watch === "true" ? 5 : (parseInt(flags.watch, 10) || 5);
  const COMPACT = flags.compact === "true";
  const AS_JSON = flags.json === "true";
  const RECLAIM_FIRST = flags.reclaim === "true";

  let helper;
  try {
    helper = await import(`file://${HELPER_PATH.replace(/\\/g, "/")}`);
  } catch (e) {
    process.stderr.write(`fleet-status: cannot load helper at ${HELPER_PATH}: ${e.message}\n`);
    process.exit(1);
  }

  async function renderOnce() {
    let reclaimed = null;
    if (RECLAIM_FIRST) {
      const r = helper.reclaimCrashed();
      if (r.ok) reclaimed = r.reclaimed;
    }
    const snapshot = helper.getStatus();
    if (!snapshot.ok) {
      process.stderr.write("fleet-status: cannot read slot state\n");
      return 1;
    }
    if (AS_JSON) {
      // Augment each slot with its role so machine-readable consumers can
      // distinguish work vs hygiene without re-importing chat-slots.mjs.
      const enriched = {
        ...snapshot,
        slots: snapshot.slots.map(s => ({
          ...s,
          role: roleOf(s.slot),
          domain: domainOf(s.slot),
          domain_filter: domainFilterOf(s.slot),
        })),
        summaryByRole: summaryByRole(snapshot),
        reclaimed,
      };
      process.stdout.write(JSON.stringify(enriched, null, 2) + "\n");
    } else if (COMPACT) {
      process.stdout.write(renderCompact(snapshot) + "\n");
    } else {
      if (WATCH) process.stdout.write("\x1b[2J\x1b[H");
      process.stdout.write(
        renderBoxed(snapshot, reclaimed, { watch: WATCH, watchIntervalS: WATCH_INTERVAL_S }) + "\n"
      );
    }
    return snapshot.summary.crashed > 0 ? 2 : 0;
  }

  if (WATCH) {
    await renderOnce();
    setInterval(async () => {
      try { await renderOnce(); } catch (e) {
        process.stderr.write(`fleet-status: render error: ${e.message}\n`);
      }
    }, WATCH_INTERVAL_S * 1000);
  } else {
    process.exit(await renderOnce());
  }
}

// Run as main script only — `import` consumers skip this.
const __isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("/fleet-status.mjs");
if (__isMain) {
  await main();
}
