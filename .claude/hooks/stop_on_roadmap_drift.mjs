#!/usr/bin/env node
// tier: T4
/**
 * stop_on_roadmap_drift.mjs — Tier 6 Stop Hook
 * Warns when work doesn't match claimed roadmap unit.
 */
import fs from "node:fs";

const POSITION_FILE = "H:/prism/state/CURRENT_POSITION.md";
const ROADMAP_INDEX = "H:/prism/mcp-server/data/roadmap-index.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(POSITION_FILE)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const position = fs.readFileSync(POSITION_FILE, "utf-8");
    const match = position.match(/Phase:\s*([^\n]+)/);
    const claimedPhase = match ? match[1].trim() : null;

    if (!claimedPhase) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    // Check if claimed phase exists in roadmap
    if (fs.existsSync(ROADMAP_INDEX)) {
      const roadmap = JSON.parse(fs.readFileSync(ROADMAP_INDEX, "utf-8"));
      const milestones = roadmap.milestones || [];
      const found = milestones.some(m =>
        m.id === claimedPhase || m.title?.includes(claimedPhase) || claimedPhase.includes(m.id)
      );

      if (!found && milestones.length > 0) {
        console.log(JSON.stringify({
          result: "warn",
          message: `Claimed phase "${claimedPhase}" not found in roadmap-index.json`
        }));
        return;
      }
    }

    console.log(JSON.stringify({ result: "pass" }));
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
