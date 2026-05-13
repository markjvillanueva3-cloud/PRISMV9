#!/usr/bin/env node
// tier: T4
/**
 * stop_on_skill_unwired.mjs — Tier 6 Stop Hook
 * Warns when skill created without hook anchor.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const SKILLS_DIR = path.join(os.homedir(), ".claude", "commands");
const ORPHAN_REPORT = "H:/prism/mcp-server/data/state/orphan-report.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(ORPHAN_REPORT)) {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(ORPHAN_REPORT, "utf-8"));
    const age = Date.now() - (data.timestamp || 0);

    if (age > 14400000) {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
      return;
    }

    const orphanSkills = (data.orphans || [])
      .filter(o => o.type === "skill");

    if (orphanSkills.length > 0) {
      console.log(JSON.stringify({ continue: false,
        stopReason: `${orphanSkills.length} skills without hook anchors: ${orphanSkills.slice(0, 3).map(o => o.name).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ continue: true, systemMessage: "pass" })));
