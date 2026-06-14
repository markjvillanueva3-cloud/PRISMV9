#!/usr/bin/env node
// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-06 — CLI wrapper for loadSlotContext.
//
// Usage:
//   node scripts/zebra-context-load.mjs <slot> [--session <sid>] [--json|--summary]
//
// Examples:
//   node scripts/zebra-context-load.mjs bravo                    # summary form
//   node scripts/zebra-context-load.mjs bravo --json             # full bundle JSON
//   node scripts/zebra-context-load.mjs bravo --session abc-..   # include loop-state
//
// This is the operator-facing entry point for the Zebra orchestrator's
// 5-surface context bundle (loadSlotContext from scripts/lib/zebra-context-bundle.mjs).
// The Zebra sweep itself calls `loadSlotContext` directly; this CLI is for
// shell-level inspection, scripted PSN consumers, and /system-viz
// discoverability (the script appears as an L8 node automatically).
//
// PSN-leg aggregation: this CLI composes signals from 5 of the 11 PSN legs:
//   - Leg #7 BUILD-VISION / CLAUDE-BRIEF (brief + vision sub-envelopes)
//   - Leg #9 ROADMAP-CONSOLIDATED (bridge_units sub-envelope)
//   - Leg #19 slot souls (soul.refuseList — hard-constraint on suggestions)
//   - Leg #29 loop-state per slot (running flag — mid-loop /compact bug fix)
//   - Leg #21 TOKEN-AWARENESS zone (recommend compact when RED+ + not stale)
//
// Exit codes:
//   0 — bundle loaded successfully OR fail-soft with valid envelope
//   1 — invocation error (missing slot arg, etc.)
//   2 — bundle disabled or invalid-slot

import { loadSlotContext } from "./lib/zebra-context-bundle.mjs";

function parseArgs(argv) {
  const args = { slot: null, sessionId: null, mode: "summary" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") { args.mode = "json"; continue; }
    if (a === "--summary") { args.mode = "summary"; continue; }
    if (a === "--session" && i + 1 < argv.length) { args.sessionId = argv[++i]; continue; }
    if (a === "--help" || a === "-h") { args.help = true; continue; }
    if (!args.slot && !a.startsWith("--")) { args.slot = a; continue; }
  }
  return args;
}

function printHelp() {
  process.stdout.write(`Usage: node scripts/zebra-context-load.mjs <slot> [--session <sid>] [--json|--summary]

Loads the ZEBRA-OMNISCIENT-MS0 5-surface context bundle for a slot.

Args:
  <slot>            NATO slot name (alpha..zulu)
  --session <sid>   Optional UUID-shape session id (enables loop-state read)
  --json            Emit full bundle as JSON
  --summary         (default) Emit one-line per surface + decision summary

See: knowledge/wiki/architecture/zebra-omniscient-ms0.md
`);
}

function fmtSummary(ctx) {
  const lines = [];
  lines.push(`slot=${ctx.slot ?? "?"} ok=${ctx.ok} reason=${ctx.reason ?? "-"}`);
  lines.push(`session=${ctx.sessionId ?? "(none)"} composedAt=${new Date(ctx.composedAt).toISOString()}`);
  lines.push(`surfaces:`);
  for (const [name, env] of Object.entries(ctx.surfaces ?? {})) {
    lines.push(`  ${name.padEnd(12)} ok=${env.ok} stale=${env.stale} reason=${env.reason ?? "-"}`);
  }
  if (ctx.decision) {
    lines.push(`decision:`);
    lines.push(`  recommend         = ${ctx.decision.recommend}`);
    lines.push(`  suppressCompact   = ${ctx.decision.suppressCompact}`);
    lines.push(`  rationale         = ${ctx.decision.rationale}`);
    lines.push(`  allowedSuggestions= ${(ctx.decision.allowedSuggestions || []).join(", ") || "(none)"}`);
  }
  return lines.join("\n");
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help) { printHelp(); return 0; }
  if (!args.slot) { process.stderr.write("error: <slot> required\n"); printHelp(); return 1; }
  const ctx = loadSlotContext(args.slot, { sessionId: args.sessionId });
  if (args.mode === "json") {
    process.stdout.write(JSON.stringify(ctx, null, 2) + "\n");
  } else {
    process.stdout.write(fmtSummary(ctx) + "\n");
  }
  if (!ctx.ok && (ctx.reason === "disabled-env" || ctx.reason === "invalid-slot")) return 2;
  return 0;
}

const exitCode = main(process.argv);
process.exit(exitCode);
