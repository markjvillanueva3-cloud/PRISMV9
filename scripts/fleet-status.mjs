#!/usr/bin/env node
/**
 * fleet-status.mjs — visual dashboard for the 7-chat PRISM fleet (alpha..foxtrot work + golf hygiene per CLEANUP-MS0).
 *
 * Renders chat-slots.json as a boxed ASCII dashboard. Shows per-slot status
 * (alive/stale/crashed/idle), branch, topic, heartbeat age, current
 * activity, and aggregate fleet stats.
 *
 * Usage:
 *   node scripts/fleet-status.mjs               # one-shot render
 *   node scripts/fleet-status.mjs --watch       # auto-refresh every 5s
 *   node scripts/fleet-status.mjs --watch=2     # custom interval (seconds)
 *   node scripts/fleet-status.mjs --compact     # one-line variant
 *   node scripts/fleet-status.mjs --json        # raw JSON
 *   node scripts/fleet-status.mjs --reclaim     # sweep crashed slots
 *
 * Exit codes:
 *   0 — success
 *   1 — read failure
 *   2 — fleet has crashed slots (CI-friendly advisory)
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HELPER_PATH = resolve(__dirname, "..", ".claude", "helpers", "chat-slots.mjs");

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

// ─── Glyphs ─────────────────────────────────────────────────────────────
const GLYPH = { alive: "🟢", stale: "🟡", crashed: "🔴", idle: "⚫" };
const COMPACT_FLAG = { alive: "✓", stale: "…", crashed: "✗", idle: "·" };

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
function renderCompact(snapshot) {
  const glyphs = snapshot.slots.map(s => GLYPH[s.status]).join("");
  const parts = snapshot.slots.map(s => `${s.slot}${COMPACT_FLAG[s.status]}`);
  return `PRISM ${glyphs}  ${parts.join(" ")}`;
}

// ─── Boxed dashboard render — fixed-width, no ANSI inside the box ─────
//
// Box dimensions: total 80 chars wide, content area 78 chars between │.
// Plain text only inside the box for predictable padding. Color goes on
// the OUTSIDE: we render the row first as plain text, measure it, then
// optionally wrap status glyphs / row prefixes with ANSI color codes after
// the box is fully composed. Avoids the visible-vs-byte-length mismatch
// that breaks alignment when ANSI codes live mid-row.
function renderBoxed(snapshot, reclaimed) {
  const W = 78;
  const dash = "─".repeat(W);
  const lines = [];
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const watchTag = WATCH ? ` (refresh:${WATCH_INTERVAL_S}s)` : "";

  const headerL = "  PRISM FLEET STATUS";
  const headerR = `${ts}${watchTag}  `;
  const headerSpace = Math.max(1, W - headerL.length - headerR.length);
  const header = headerL + " ".repeat(headerSpace) + headerR;

  lines.push(`┌${dash}┐`);
  lines.push(`│${pad(header, W)}│`);
  lines.push(`├${dash}┤`);

  for (const s of snapshot.slots) {
    const glyph = GLYPH[s.status];
    const slotName = s.slot.toUpperCase().padEnd(8);
    const chatId = (s.state?.chatId ?? "—").padEnd(18);
    const branch = trunc(s.state?.branch ?? "—", 28).padEnd(28);
    const age = formatAge(s.ageMs).padStart(13);

    lines.push(`│${pad(`  ${glyph} ${slotName}${chatId}${branch}${age}  `, W)}│`);

    let act;
    if (!s.state) {
      act = "              slot free";
    } else if (s.status === "crashed") {
      act = `              CRASHED — slot reclaimable now (${formatAge(s.ageMs)})`;
    } else {
      act = `              ${trunc(s.state.activity ?? "(no activity reported)", 56)}`;
    }
    lines.push(`│${pad(act, W)}│`);

    if (s.state) {
      lines.push(`│${pad(`              topic: ${trunc(s.state.topic ?? "(no topic)", 50)}`, W)}│`);
    }
    lines.push(`│${pad("", W)}│`);
  }

  lines.push(`├${dash}┤`);
  const sum = snapshot.summary;
  lines.push(`│${pad(`  Active: ${sum.alive}    Stale: ${sum.stale}    Crashed: ${sum.crashed}    Free: ${sum.idle}`, W)}│`);
  if (reclaimed && reclaimed.length > 0) {
    lines.push(`│${pad(`  Reclaimed crashed slots this pass: ${reclaimed.map(r => r.slot).join(", ")}`, W)}│`);
  }
  lines.push(`└${dash}┘`);

  if (WATCH) lines.push("press ctrl+c to exit");
  return lines.join("\n");
}

function pad(s, w) {
  s = String(s ?? "");
  // glyph (🟢, etc.) renders as 2 cells in most terminals but counts as 1
  // codepoint after the surrogate pair. Approximate: count emoji chars and
  // bump them by 1 for visible-width.
  const visual = s.replace(/[\u{1F7E2}\u{1F7E1}\u{1F534}\u{26AB}]/gu, "x x"); // each glyph ≈ 2 cells
  if (visual.length >= w) return s.slice(0, w);
  return s + " ".repeat(w - visual.length);
}

// ─── Main ───────────────────────────────────────────────────────────────
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
    process.stdout.write(JSON.stringify({ ...snapshot, reclaimed }, null, 2) + "\n");
  } else if (COMPACT) {
    process.stdout.write(renderCompact(snapshot) + "\n");
  } else {
    if (WATCH) process.stdout.write("\x1b[2J\x1b[H");
    process.stdout.write(renderBoxed(snapshot, reclaimed) + "\n");
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
