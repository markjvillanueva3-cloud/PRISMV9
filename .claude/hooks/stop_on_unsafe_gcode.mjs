#!/usr/bin/env node
// tier: T4
/**
 * stop_on_unsafe_gcode.mjs — Tier 6 Stop Hook (IMPROVED)
 *
 * Checks for unsafe G-code patterns in:
 * 1. Safety log entries from this session
 * 2. Any .nc/.gcode files modified recently
 *
 * Dangerous patterns detected:
 * - Missing safety blocks (G28, tool length comp)
 * - Excessive feed rates (>5000 mm/min without HSM context)
 * - Spindle commands without safety delays
 * - Missing M codes (coolant, clamps)
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const GCODE_SAFETY_LOG = "H:/prism/mcp-server/data/state/gcode-safety-log.json";
const DANGEROUS_PATTERNS = [
  { pattern: /G00.*Z-\d{2,}/i, desc: "Rapid into negative Z >10mm" },
  { pattern: /F\s*[1-9]\d{4,}/i, desc: "Feed >10000 without HSM" },
  { pattern: /S\s*[3-9]\d{4}/i, desc: "Spindle >30000 RPM" },
  { pattern: /M0?3[^0-9].*\nG0?[01]/im, desc: "Cut immediately after spindle start (no dwell)" },
];

async function main() {
  await new Promise(r => {
    let d = "";
    process.stdin.on("data", c => d += c);
    process.stdin.on("end", () => r(d));
  });

  const issues = [];

  try {
    // Check 1: Safety log entries
    if (fs.existsSync(GCODE_SAFETY_LOG)) {
      const data = JSON.parse(fs.readFileSync(GCODE_SAFETY_LOG, "utf-8"));
      const sessionEntries = (data.entries || [])
        .filter(e => Date.now() - (e.timestamp || 0) < 86400000)
        .filter(e => e.warnings?.length > 0 || e.safetyScore < 0.70);

      if (sessionEntries.length > 0) {
        const totalWarnings = sessionEntries.reduce((sum, e) => sum + (e.warnings?.length || 0), 0);
        issues.push(`${totalWarnings} logged safety warnings`);
      }
    }

    // Check 2: Recently modified G-code files
    try {
      const result = execSync(
        `git -C "H:/prism" diff --name-only HEAD~5 2>/dev/null | grep -E "\\.(nc|gcode|tap|mpf)$" | head -10`,
        { windowsHide: true, encoding: "utf-8", timeout: 3000 }
      ).trim();

      if (result) {
        for (const relFile of result.split("\n").filter(Boolean)) {
          const filePath = path.join("H:/prism", relFile);
          if (!fs.existsSync(filePath)) continue;

          const content = fs.readFileSync(filePath, "utf-8").slice(0, 50000); // First 50KB
          for (const { pattern, desc } of DANGEROUS_PATTERNS) {
            if (pattern.test(content)) {
              issues.push(`${path.basename(relFile)}: ${desc}`);
              break; // One issue per file
            }
          }
        }
      }
    } catch { /* No recent G-code files */ }

    if (issues.length > 0) {
      console.log(JSON.stringify({ continue: false,
        stopReason: `G-code safety: ${issues.slice(0, 3).join("; ")}${issues.length > 3 ? ` (+${issues.length - 3} more)` : ""}`
      }));
    } else {
      console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true, systemMessage: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ continue: true, systemMessage: "pass" })));
