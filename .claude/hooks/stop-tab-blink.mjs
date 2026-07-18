#!/usr/bin/env node
// tier: T3
/**
 * stop-tab-blink.mjs - Flash this terminal tab when Claude's turn ends.
 *
 * On every Stop event (Claude finished and is waiting for the operator), this
 * hook causes the BEL control character (U+0007) to be written to the console
 * output device (\\.\CONOUT$ on Windows). Windows Terminal turns a BEL into a
 * visual signal per the profile `bellStyle` setting:
 *   - a bell glyph on the tab, so a BACKGROUND tab is visibly marked; and
 *   - a window flash + taskbar flash when bellStyle includes "window"/"taskbar".
 *
 * Purpose: an operator running the 15-tab PRISM fleet (see
 * H:/Tools/prism-fleet/Launch-PRISM-Fleet.ps1) can see at a glance which tab
 * just finished its turn and needs attention. SESSION-CONTINUITY-MS0.
 *
 * Non-blocking by construction: the BEL write is performed by a DETACHED,
 * unref'd child process -- this same file re-invoked with --emit-bel -- never
 * on the hook's own critical path. spawn() returns immediately, so the Stop
 * hook cannot delay or stall the Stop chain even if the console write itself
 * blocks (e.g. a legacy console paused in selection mode). The detached writer
 * is an orphan that completes whenever the console accepts the byte.
 *
 * Why \\.\CONOUT$ and not process.stdout: a Stop hook's stdout is the JSON
 * protocol channel consumed by Claude Code. The BEL must reach the real
 * console device, so the detached writer targets \\.\CONOUT$ directly -- that
 * handle resolves to THIS tab's console (each WT tab has its own console).
 *
 * Failure policy: ANY failure (spawn error, no console attached, non-Windows
 * host) is silent - the hook always emits {continue:true} and never throws.
 *
 * Knob: PRISM_TAB_BLINK_DISABLE=1 - disable entirely.
 *
 * Wiring: Stop event only (NOT SubagentStop - a subagent finishing is not the
 * operator's turn-end). Tier T3 advisory; wired last in the Stop chain. The
 * settings.json entry also carries a 2000ms timeout as a defence-in-depth
 * backstop, though the detached-writer design makes a stall unreachable.
 */

import fs from "node:fs";
import { spawn } from "node:child_process";

const BEL = "\x07";
const CONSOLE_DEVICE = "\\\\.\\CONOUT$"; // Windows active console screen buffer
const SILENCE = { continue: true, suppressOutput: true };

// --- Detached BEL-writer mode -------------------------------------------
// When re-invoked with --emit-bel, THIS process is the detached writer: do the
// (potentially blocking) console write here, in an orphan process that nothing
// downstream waits on, then exit. Keep this branch before emit()/main() so the
// writer process never touches the JSON protocol channel.
if (process.argv.includes("--emit-bel")) {
  try { fs.writeFileSync(CONSOLE_DEVICE, BEL); } catch { /* no console - ignore */ }
  process.exit(0);
}

function emit(o) {
  try { process.stdout.write(JSON.stringify(o)); } catch { /* stdout gone - ignore */ }
}

function main() {
  if (process.env.PRISM_TAB_BLINK_DISABLE === "1") { emit(SILENCE); return; }
  // BEL-to-console only applies on Windows; other platforms no-op silently.
  // process.argv[1] (this file's path) is required to re-invoke the writer.
  if (process.platform === "win32" && process.argv[1]) {
    try {
      // Detached, unref'd copy of THIS file in --emit-bel mode. The child owns
      // the blocking risk; spawn() returns immediately so the Stop hook never
      // blocks. stdio ignored so the child holds no inherited handles.
      const child = spawn(process.execPath, [process.argv[1], "--emit-bel"], {
        detached: true, windowsHide: true,
        stdio: "ignore",
      });
      child.unref();
    } catch { /* spawn failed - cosmetic only, ignore */ }
  }
  emit(SILENCE);
}

main();
