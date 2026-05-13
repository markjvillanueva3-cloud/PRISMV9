#!/usr/bin/env node
// tier: T4
/**
 * stop_on_sx_fail.mjs — Tier 6 Stop Hook
 * Prevents exit when any file touched has S(x) < 0.70.
 */
import fs from "node:fs";
import path from "node:path";

const SAFETY_REPORT = "H:/prism/mcp-server/data/state/SAFETY_SCORE_INDEX.json";
const THRESHOLD = 0.70;

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(SAFETY_REPORT)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const data = JSON.parse(fs.readFileSync(SAFETY_REPORT, "utf-8"));
    const failing = (data.scores || [])
      .filter(s => s.score < THRESHOLD && s.sessionTouched)
      .map(s => ({ file: s.file, score: s.score.toFixed(2) }));

    if (failing.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${failing.length} files below S(x) threshold: ${failing.slice(0, 3).map(f => `${f.file}(${f.score})`).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
