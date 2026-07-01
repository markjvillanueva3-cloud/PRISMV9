// tier: T2
/**
 * big-data-read-enforce.mjs -- PreToolUse(Read) guard (U-BIG-DATA-READ, india 2026-06-12, operator
 * "find more ways to offload to ollama / do everything").
 *
 * Blocks a FULL read of a big DATA/LOG file (.log/.jsonl/.ndjson/.csv/.tsv over the size threshold) --
 * dumping a 128KB+ data dump into the context window is pure token waste (~32K+ tokens). Routes to the
 * right cheap tool instead: a LOCAL OLLAMA digest for prose logs ($0), or grep/jq/Read-with-offset for
 * structured data.
 *
 * WHY this is safe (no quality loss, no workflow break):
 *  - PURE STAT-BASED decision -- NO in-hook Ollama/network call, so it adds ZERO latency (the offloader's
 *    own R12 note warns that a synchronous in-hook Ollama call taxes every fire; this avoids it).
 *  - Targets ONLY data/log extensions -- never source (.ts/.mjs/.py) or docs, so there is no
 *    Read-before-Edit break (you never Edit a .log/.jsonl by dumping it).
 *  - A TARGETED read (offset/limit set) is ALWAYS allowed -- need exact records? Read offset+limit.
 *  - Knob PRISM_BIG_DATA_READ_ENFORCE=0 disables; PRISM_BIG_DATA_READ_BYTES overrides the threshold.
 *  - FAIL-OPEN on any error (stat fail / parse fail / throw) -- a guard must never wedge a real read.
 *
 * evaluate({stdin, env, statImpl}) is pure over its inputs (stat injectable) so tests drive it without
 * touching disk or spawning the process.
 */
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const DATA_EXT = new Set([".log", ".jsonl", ".ndjson", ".csv", ".tsv"]);
export const DEFAULT_THRESHOLD_BYTES = 128 * 1024; // 128KB ~ 32K tokens

export function evaluate({ stdin, env = process.env, statImpl = statSync } = {}) {
  if (env.PRISM_BIG_DATA_READ_ENFORCE === "0") return { action: "allow", reason: "disabled" };
  if (String(stdin?.tool_name ?? stdin?.tool ?? "") !== "Read") return { action: "allow", reason: "not Read" };
  const ti = stdin?.tool_input ?? {};
  const fp = typeof ti.file_path === "string" ? ti.file_path : "";
  if (!fp) return { action: "allow", reason: "no file_path" };
  // A targeted read is already cheap -- never block it.
  if (ti.offset != null || ti.limit != null) return { action: "allow", reason: "targeted read (offset/limit)" };
  const ext = (fp.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
  if (!DATA_EXT.has(ext)) return { action: "allow", reason: "not a data/log extension" };
  let size;
  try { size = statImpl(fp).size; } catch { return { action: "allow", reason: "stat failed (fail-open)" }; }
  const threshold = Number(env.PRISM_BIG_DATA_READ_BYTES) > 0 ? Number(env.PRISM_BIG_DATA_READ_BYTES) : DEFAULT_THRESHOLD_BYTES;
  if (!(size > threshold)) return { action: "allow", reason: `under threshold (${size}<=${threshold})` };

  const kb = Math.round(size / 1024);
  const approxTokens = Math.round(size / 4);
  const isLog = ext === ".log";
  const route = isLog
    ? `node scripts/ask-ollama.mjs triage ${fp}    (local Ollama error/log digest, $0)`
    : `grep/jq for the specific records, or Read with offset+limit`;
  const reason = [
    `BIG DATA READ BLOCKED: ${fp} is ${kb}KB -- dumping it whole is ~${approxTokens} tokens of context waste.`,
    isLog
      ? `It's a log -- offload the read to a local digest instead of dumping it:`
      : `It's structured data -- query only the records you need instead of dumping the whole file:`,
    `  ${route}`,
    `Need exact bytes? Read with offset+limit (targeted reads pass), or set PRISM_BIG_DATA_READ_ENFORCE=0.`,
  ].join("\n");
  return { action: "deny", reason };
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const r = readFileSync(0, "utf8");
    return r.trim() ? JSON.parse(r) : null;
  } catch { return null; }
}

function main() {
  let v;
  try { v = evaluate({ stdin: readStdin() }); } catch { v = { action: "allow", reason: "threw -> fail-open" }; }
  if (v.action === "deny") {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: v.reason },
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
  process.exit(0);
}

const invokedAsScript = (() => {
  try { return fileURLToPath(import.meta.url) === (process.argv[1] ? fileURLToPath(new URL(`file://${process.argv[1].replace(/\\/g, "/")}`)) : ""); }
  catch { return process.argv[1] && process.argv[1].endsWith("big-data-read-enforce.mjs"); }
})();
if (invokedAsScript) main();
