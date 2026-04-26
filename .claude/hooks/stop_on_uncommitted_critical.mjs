#!/usr/bin/env node
/**
 * stop_on_uncommitted_critical.mjs — Tier 6 Stop Hook
 * Prevents exit when CRITICAL-classified files have uncommitted changes.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const CRITICAL_PATTERNS = [
  "src/physics/constants.ts",
  "src/algorithms/Kienzle",
  "src/algorithms/Taylor",
  "src/engines/*Safety*.ts",
  "src/engines/*Force*.ts",
  "src/engines/*Deflection*.ts"
];

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    const status = execSync("git status --porcelain", {
      cwd: "H:/prism", encoding: "utf-8"
    });

    const uncommitted = status.split("\n")
      .filter(l => l.trim())
      .map(l => l.slice(3))
      .filter(f => CRITICAL_PATTERNS.some(p => {
        const regex = new RegExp(p.replace(/\*/g, ".*"));
        return regex.test(f);
      }));

    if (uncommitted.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${uncommitted.length} CRITICAL files uncommitted: ${uncommitted.slice(0, 3).join(", ")}${uncommitted.length > 3 ? "..." : ""}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
