import process from "node:process";
import { promises as fs } from "node:fs";
import { spawnSync } from "node:child_process";
import { cachePath } from "./hook-cache.mjs";

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readLines(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getRtkGain() {
  try {
    const result = spawnSync("rtk", ["gain"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    });
    if (result.status === 0) {
      return result.stdout.trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const parts = [];
  parts.push("TOKEN-OPT SAVINGS REPORT");
  parts.push("========================\n");

  // 1. RTK stats
  const rtkOutput = getRtkGain();
  if (rtkOutput) {
    const savedMatch = rtkOutput.match(/Tokens saved:\s+([^\n]+)/);
    const effMatch = rtkOutput.match(/Efficiency meter:.*?(\d+\.?\d*%)/);
    parts.push(`RTK: ${savedMatch ? savedMatch[1] : "installed"} ${effMatch ? `(${effMatch[1]} efficiency)` : ""}`);
  } else {
    parts.push("RTK: not available or no data");
  }

  // 2. Bash intercept cache hits
  const cacheFiles = [
    { name: "build-success", label: "Build cache" },
    { name: "test-success", label: "Test cache" },
    { name: "tsc-success", label: "TSC cache" },
    { name: "git-status", label: "Git status cache" },
    { name: "git-log", label: "Git log cache" },
    { name: "git-diff", label: "Git diff cache" },
    { name: "npm-list", label: "NPM list cache" },
  ];

  const activeCaches = [];
  for (const cf of cacheFiles) {
    if (await fileExists(cachePath(cf.name))) {
      activeCaches.push(cf.label);
    }
  }
  parts.push(`Bash caches active: ${activeCaches.length > 0 ? activeCaches.join(", ") : "none"}`);

  // 3. Read-once registry
  const readOnce = await readJson(cachePath("read-once-registry"));
  if (readOnce) {
    const fileCount = Object.keys(readOnce).length;
    parts.push(`Read-once cache: ${fileCount} files tracked (re-reads blocked for unchanged files)`);
  } else {
    parts.push("Read-once cache: not yet populated");
  }

  // 4. Context pressure
  const pressure = await readJson(cachePath("context-pressure"));
  if (pressure) {
    const totalKB = Math.round(pressure.totalBytes / 1000);
    const pct = Math.round((pressure.totalBytes / 1000000) * 100);
    const elapsedMin = Math.round((Date.now() - pressure.startTime) / 60000);
    parts.push(`Context pressure: ~${totalKB}K chars (~${pct}% of 1M window), ${pressure.callCount} calls, ${elapsedMin}m elapsed`);
  } else {
    parts.push("Context pressure: tracker not initialized");
  }

  // 5. Loop detector history
  const toolHistory = await readLines(cachePath("tool-history"));
  parts.push(`Tool call history: ${toolHistory.length} entries tracked`);

  // 6. Search optimizer
  const refFirstFlag = await fileExists(cachePath("ref-first-injected.flag"));
  parts.push(`Search optimizer: reference map ${refFirstFlag ? "injected" : "not yet injected"}`);

  // Summary
  parts.push("\nHOOKS ACTIVE:");
  parts.push("  PreToolUse:  bash-intercept (cache), read-optimizer, read-once-cache, search-optimizer, token-saver");
  parts.push("  PostToolUse: tsc-error-dedup, output-compression-guide, context-pressure-tracker, posttooluse-compressor, loop-detector, cache-writer");
  parts.push("  SessionStart: context-pressure reset, read-once reset");
  parts.push("  External: RTK (CLAUDE.md instruction mode for vitest/npm)");

  console.log(parts.join("\n"));
}

main().catch(console.error);
