#!/usr/bin/env node
// stop-brain-refresh.mjs — Stop hook: fire-and-forget the consolidated brain-refresh.
// Spawns scripts/brain-refresh.mjs DETACHED (never synchronously — a full run is ~30min and would
// block the chat's Stop). Stamp-throttled so 13-26 simultaneous Stops collapse to ~one spawn per
// window. brain-refresh's own throttle + O_EXCL lock are the real serializer; this is just spawn
// hygiene. Always emits {continue:true}; never blocks. Knobs: PRISM_BRAIN_REFRESH_STOP_DISABLE=1,
// PRISM_BRAIN_REFRESH_STOP_THROTTLE_MS (default 1800000=30m).
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
const STAMP = path.join(ROOT, "state/shared/.brain-refresh-stop-stamp");
const THROTTLE_MS = Number(process.env.PRISM_BRAIN_REFRESH_STOP_THROTTLE_MS) || 30 * 60 * 1000;

function done() { try { process.stdout.write(JSON.stringify({ continue: true })); } catch {} process.exit(0); }

async function main() {
  // drain stdin (bounded) — Stop envelope unused, but read it so the pipe closes cleanly
  try { for await (const _ of process.stdin) { /* ignore */ } } catch {}
  if (process.env.PRISM_BRAIN_REFRESH_STOP_DISABLE === "1") return done();
  try {
    const last = Number(JSON.parse(fs.readFileSync(STAMP, "utf8")).ts) || 0;
    if (Date.now() - last < THROTTLE_MS) return done(); // a recent Stop already spawned a refresh
  } catch { /* no stamp → first run */ }
  try {
    const tmp = `${STAMP}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify({ ts: Date.now() })); fs.renameSync(tmp, STAMP);
  } catch {}
  try {
    const node = process.execPath;
    const script = path.join(ROOT, "scripts/brain-refresh.mjs");
    const child = spawn(node, [script], { cwd: ROOT, detached: true, stdio: "ignore" });
    child.unref(); // do NOT await — fire-and-forget
  } catch { /* spawn failure is non-fatal */ }
  return done();
}
main();
