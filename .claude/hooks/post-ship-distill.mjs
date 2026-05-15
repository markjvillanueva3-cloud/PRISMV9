#!/usr/bin/env node
// tier: T3
// post-ship-distill.mjs — Stop hook (T3 observer).
//
// SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL.
//
// When a chat ends and the most-recent commit body has [SCOPE]/U-<id>
// pattern, fire distill-session-learnings.mjs in the background to write
// auto-memory to BOTH wiki/code-tribal/learnings/ AND the Obsidian memory
// dir. Dedup ledger prevents double-distillation. Non-blocking — Stop never
// fails because of distillation.
//
// Knobs:
//   PRISM_POST_SHIP_DISTILL_DISABLE=1    no-op
//   PRISM_POST_SHIP_DISTILL_SYNC=1       run synchronously (default detached)
//   PRISM_POST_SHIP_DISTILL_TIMEOUT_MS   default 8000 (sync mode only)
//   PRISM_ROOT                           repo root (default H:/prism)

import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const DEFAULT_TIMEOUT_MS = 8000;
const DISABLE = process.env.PRISM_POST_SHIP_DISTILL_DISABLE === "1";
const SYNC = process.env.PRISM_POST_SHIP_DISTILL_SYNC === "1";
const TIMEOUT_MS = parseInt(process.env.PRISM_POST_SHIP_DISTILL_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10) || DEFAULT_TIMEOUT_MS;
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";

const UNIT_PATTERN = /\[([A-Z][A-Z0-9-]+)\][/\-:\s]+(U-[A-Za-z0-9-]+|MS-[A-Za-z0-9-]+|P\d+(?:-[A-Za-z0-9]+)?)/;

function approve() { process.stdout.write(JSON.stringify({ continue: true })); }

function readHeadSubject() {
  try {
    return execFileSync("git", ["-C", PRISM_ROOT, "log", "-1", "--format=%s"], {
      encoding: "utf8", timeout: 2000, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function shouldDistill(subject) {
  if (!subject) return false;
  return UNIT_PATTERN.test(subject);
}

function distillSync() {
  try {
    const scriptPath = path.join(PRISM_ROOT, "scripts", "distill-session-learnings.mjs");
    if (!fs.existsSync(scriptPath)) return;
    execFileSync(process.execPath, [scriptPath], {
      encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    // Non-blocking — distillation failures never block Stop.
  }
}

function distillDetached() {
  try {
    const scriptPath = path.join(PRISM_ROOT, "scripts", "distill-session-learnings.mjs");
    if (!fs.existsSync(scriptPath)) return;
    const logPath = path.join(PRISM_ROOT, "state", "shared", ".post-ship-distill.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const fd = fs.openSync(logPath, "a");
    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio: ["ignore", fd, fd],
      windowsHide: true,
    });
    child.unref();
    fs.closeSync(fd);
  } catch {
    // Non-blocking.
  }
}

function main() {
  if (DISABLE) { approve(); return; }
  const subject = readHeadSubject();
  if (!shouldDistill(subject)) { approve(); return; }
  if (SYNC) distillSync(); else distillDetached();
  approve();
}

main();
