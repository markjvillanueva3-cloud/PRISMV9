#!/usr/bin/env node
// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-FLEET-DASH — fleet-wide context bundle dashboard.
//
// Calls loadSlotContext for every NATO slot (alpha..zulu) and prints a compact
// per-slot dashboard: soul ok / loop running / token zone / decision. Used by:
//   - operators surveying fleet state at a glance
//   - the /system-viz dashboard surface (auto-discoverable script node)
//   - cron jobs that snapshot fleet decisions periodically
//
// Usage:
//   node scripts/zebra-context-fleet-dashboard.mjs                # all 26 slots
//   node scripts/zebra-context-fleet-dashboard.mjs --json         # JSON output
//   node scripts/zebra-context-fleet-dashboard.mjs --compact      # one-line per slot
//
// Exit codes:
//   0 — dashboard rendered (whether per-slot bundle was ok or fail-soft)
//   1 — invocation error (bad arg)

import { loadSlotContext, KNOWN_SLOTS } from "./lib/zebra-context-bundle.mjs";

function parseArgs(argv) {
  const args = { mode: "table" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.mode = "json";
    else if (a === "--compact") args.mode = "compact";
    else if (a === "--table") args.mode = "table";
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function printHelp() {
  process.stdout.write(`Usage: node scripts/zebra-context-fleet-dashboard.mjs [--json|--compact|--table]

Fleet-wide loadSlotContext dashboard. Renders per-slot bundle for all 26 NATO slots.

  --table      (default) Multi-column table view
  --compact    One-line per slot
  --json       Full JSON array
  --help       This message

See: knowledge/wiki/architecture/zebra-omniscient-ms0.md
`);
}

function loadAll() {
  return KNOWN_SLOTS.map(slot => ({ slot, ctx: loadSlotContext(slot) }));
}

function summaryFields(ctx) {
  return {
    soul: ctx.soul?.ok ? `ok(${(ctx.soul.refuseList || []).length})` : (ctx.soul?.reason || "?"),
    loop: ctx.loop?.ok && ctx.loop.running ? `run/${ctx.loop.iter}` : "-",
    token: ctx.tokenZone?.ok ? (ctx.tokenZone.zone || "?") + (ctx.tokenZone.stale ? "*" : "") : "-",
    bridge: ctx.bridgeUnits?.ok ? String(ctx.bridgeUnits.totalAvailable) : "-",
    recommend: ctx.decision?.recommend || "?",
    suppress: ctx.decision?.suppressCompact ? "S" : "-",
  };
}

function fmtTable(rows) {
  const lines = [];
  lines.push("ZEBRA-OMNISCIENT-MS0 — Fleet Context Bundle Dashboard");
  lines.push("─".repeat(80));
  lines.push("slot       soul         loop        token     bridge  rec      suppress");
  lines.push("─".repeat(80));
  for (const { slot, ctx } of rows) {
    const f = summaryFields(ctx);
    lines.push(
      `${slot.padEnd(11)}${f.soul.padEnd(13)}${f.loop.padEnd(12)}${f.token.padEnd(10)}${f.bridge.padEnd(8)}${f.recommend.padEnd(9)}${f.suppress}`
    );
  }
  lines.push("─".repeat(80));
  const counts = rows.reduce((acc, { ctx }) => {
    if (ctx.soul?.ok) acc.soulOk++;
    if (ctx.loop?.ok && ctx.loop.running) acc.loopRunning++;
    if (ctx.tokenZone?.ok && ctx.tokenZone.zone === "GREEN") acc.tokenGreen++;
    if (ctx.tokenZone?.ok && (ctx.tokenZone.zone === "RED" || ctx.tokenZone.zone === "CRITICAL")) acc.tokenRedPlus++;
    if (ctx.decision?.recommend === "compact") acc.recommendCompact++;
    if (ctx.decision?.suppressCompact) acc.suppressCompact++;
    return acc;
  }, { soulOk: 0, loopRunning: 0, tokenGreen: 0, tokenRedPlus: 0, recommendCompact: 0, suppressCompact: 0 });
  lines.push(`Totals: ${counts.soulOk}/26 soul-ok · ${counts.loopRunning} running · ${counts.tokenGreen} green · ${counts.tokenRedPlus} red+ · ${counts.recommendCompact} recommend-compact · ${counts.suppressCompact} suppress`);
  return lines.join("\n");
}

function fmtCompact(rows) {
  return rows.map(({ slot, ctx }) => {
    const f = summaryFields(ctx);
    return `${slot}: soul=${f.soul} loop=${f.loop} token=${f.token} bridge=${f.bridge} ${f.recommend}${f.suppress === "S" ? "(suppress)" : ""}`;
  }).join("\n");
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help) { printHelp(); return 0; }
  const rows = loadAll();
  if (args.mode === "json") {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
  } else if (args.mode === "compact") {
    process.stdout.write(fmtCompact(rows) + "\n");
  } else {
    process.stdout.write(fmtTable(rows) + "\n");
  }
  return 0;
}

const code = main(process.argv);
process.exit(code);
