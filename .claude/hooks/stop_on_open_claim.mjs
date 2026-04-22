#!/usr/bin/env node
/**
 * stop_on_open_claim.mjs — Tier 6 Stop Hook
 * Prevents exit when claims are held without completion record.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CLAIMS_DIR = "H:/prism/mcp-server/data/locks";
const SESSION_ID = `session-${process.pid}-${os.hostname()}`;

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(CLAIMS_DIR)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const openClaims = fs.readdirSync(CLAIMS_DIR)
      .filter(f => f.endsWith(".lock"))
      .map(f => {
        try {
          const content = fs.readFileSync(path.join(CLAIMS_DIR, f), "utf-8");
          const data = JSON.parse(content);
          const age = Date.now() - (data.claimedAt || 0);
          // Claims older than 2h are stale, let them pass
          if (age < 7200000 && data.status === "claimed") {
            return { file: f, unit: data.unitId || f };
          }
        } catch {}
        return null;
      })
      .filter(Boolean);

    if (openClaims.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${openClaims.length} open claims: ${openClaims.map(c => c.unit).slice(0, 3).join(", ")}. Complete or release before exit.`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
