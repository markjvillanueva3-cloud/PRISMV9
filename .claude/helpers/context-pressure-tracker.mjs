import process from "node:process";
import { promises as fs } from "node:fs";
import { cachePath, ensureCacheDir } from "./hook-cache.mjs";

const TRACKER_FILE = cachePath("context-pressure");

// Token-aligned thresholds (Opus 4.7 drift zone ~400k; 3.5 char/token avg)
// Paired with auto-compact-gate.mjs: soft 300k tokens, hard 450k tokens
const WARN_THRESHOLD = 1_050_000;   // ~300k tokens — soft trigger
const CRITICAL_THRESHOLD = 1_575_000; // ~450k tokens — hard cap
const MIN_OUTPUT_SIZE = 100;     // Ignore tiny outputs (noise)

async function readTracker() {
  try {
    const raw = await fs.readFile(TRACKER_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { totalBytes: 0, callCount: 0, startTime: Date.now() };
  }
}

async function writeTracker(tracker) {
  await ensureCacheDir();
  await fs.writeFile(TRACKER_FILE, JSON.stringify(tracker), "utf8");
}

function collectOutputLength() {
  let total = 0;
  for (const [key, value] of Object.entries(process.env)) {
    if (
      typeof value === "string" &&
      value.length > 0 &&
      (key === "TOOL_RESULT" ||
        key === "TOOL_OUTPUT" ||
        key.startsWith("TOOL_RESULT_") ||
        key.startsWith("TOOL_OUTPUT_"))
    ) {
      total += value.length;
    }
  }
  return total;
}

async function main() {
  const outputLen = collectOutputLength();

  if (outputLen < MIN_OUTPUT_SIZE) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const tracker = await readTracker();
  tracker.totalBytes += outputLen;
  tracker.callCount += 1;
  await writeTracker(tracker);

  const totalKB = Math.round(tracker.totalBytes / 1000);
  const elapsedMin = Math.round((Date.now() - tracker.startTime) / 60000);

  if (tracker.totalBytes >= CRITICAL_THRESHOLD) {
    process.stdout.write(JSON.stringify({
      additionalContext: `CONTEXT CRITICAL: ~${totalKB}K chars accumulated (${tracker.callCount} calls, ${elapsedMin}m). Context window at ~75%. Run /compact NOW to avoid information loss. Finish current unit, then compact immediately.`,
    }));
    return;
  }

  if (tracker.totalBytes >= WARN_THRESHOLD) {
    process.stdout.write(JSON.stringify({
      additionalContext: `CONTEXT PRESSURE: ~${totalKB}K chars accumulated (${tracker.callCount} calls, ${elapsedMin}m). Context at ~60%. Plan to /compact within 1-2 more units. Summarize outputs instead of echoing them.`,
    }));
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
