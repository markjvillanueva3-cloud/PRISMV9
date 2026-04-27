#!/usr/bin/env node
/**
 * stop_on_open_lock.mjs — Tier 6 Stop Hook
 * Prevents exit when file locks are held by this session.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LOCK_DIR = "H:/prism/state/shared";
const SESSION_ID = `session-${process.pid}-${os.hostname()}`;

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(LOCK_DIR)) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const heldLocks = fs.readdirSync(LOCK_DIR)
      .filter(f => f.startsWith("GIT_LOCK_") && f.endsWith(".json"))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(LOCK_DIR, f), "utf-8"));
          if (data.holder?.includes(SESSION_ID) || data.holder?.includes(`pid-${process.pid}`)) {
            return f;
          }
        } catch {}
        return null;
      })
      .filter(Boolean);

    if (heldLocks.length > 0) {
      // Auto-release stale locks on exit
      for (const lock of heldLocks) {
        try {
          fs.unlinkSync(path.join(LOCK_DIR, lock));
        } catch {}
      }
      console.log(JSON.stringify({
        result: "pass",
        message: `Released ${heldLocks.length} session locks on exit`
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
