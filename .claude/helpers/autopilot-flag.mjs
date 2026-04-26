/**
 * autopilot-flag.mjs — Manages the autopilot active flag
 *
 * Usage:
 *   node autopilot-flag.mjs set --track HM-KC --milestone HM-KC-MS0
 *   node autopilot-flag.mjs clear
 *   node autopilot-flag.mjs status
 *
 * The flag file tells hooks whether automated roadmap execution is active.
 * When active:
 *   - Stop hook blocks stopping at critical context pressure
 *   - PostCompact hook injects mandatory auto-resume
 *   - Context pressure tracker uses lower thresholds
 */
import { promises as fs } from "node:fs";
import process from "node:process";
import { cachePath, ensureCacheDir } from "./hook-cache.mjs";

const FLAG_FILE = cachePath("autopilot-active");

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const [, , action, ...rest] = process.argv;

  switch (action) {
    case "set": {
      await ensureCacheDir();
      const data = {
        active: true,
        track: null,
        milestone: null,
        startedAt: new Date().toISOString(),
      };
      for (let i = 0; i < rest.length; i += 2) {
        const key = rest[i]?.replace(/^--/, "");
        const val = rest[i + 1];
        if (key && val) data[key] = val;
      }
      await fs.writeFile(FLAG_FILE, JSON.stringify(data, null, 2), "utf8");
      console.log(`Autopilot ACTIVATED: track=${data.track || "any"}, milestone=${data.milestone || "any"}`);
      break;
    }
    case "clear": {
      try {
        await fs.unlink(FLAG_FILE);
        console.log("Autopilot DEACTIVATED");
      } catch {
        console.log("Autopilot was not active");
      }
      break;
    }
    case "status": {
      try {
        const data = JSON.parse(await fs.readFile(FLAG_FILE, "utf8"));
        console.log(`Autopilot: ${data.active ? "ACTIVE" : "INACTIVE"}`);
        if (data.track) console.log(`Track: ${data.track}`);
        if (data.milestone) console.log(`Milestone: ${data.milestone}`);
        console.log(`Started: ${data.startedAt}`);
      } catch {
        console.log("Autopilot: INACTIVE (no flag file)");
      }
      break;
    }
    default:
      console.log("Usage: node autopilot-flag.mjs [set|clear|status] [--track X] [--milestone Y]");
  }
}

main().catch(console.error);
