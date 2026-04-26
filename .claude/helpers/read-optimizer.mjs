import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

const INDEX_HINT =
  "INDEX SURFACE: You are reading a shared low-token discovery surface. Prefer extracting only the specific section you need and use it to avoid broader repo sweeps.";

function toWindowsPath(candidate) {
  if (!candidate) {
    return candidate;
  }
  if (candidate.startsWith("/c/")) {
    return `C:\\${candidate.slice(3).replaceAll("/", "\\")}`;
  }
  if (candidate.startsWith("C:/")) {
    return candidate.replaceAll("/", "\\");
  }
  return candidate;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function countLines(filePath) {
  let lineCount = 0;
  const input = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const _line of rl) {
      lineCount += 1;
      if (lineCount > 5000) {
        break;
      }
    }
  } finally {
    rl.close();
    input.destroy();
  }
  return lineCount;
}

function printContext(additionalContext) {
  process.stdout.write(`${JSON.stringify(additionalContext ? { continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext } } : { continue: true })}`);
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const rawFilePath = process.env.TOOL_INPUT_file_path ?? "";
  const offset = process.env.TOOL_INPUT_offset ?? "";
  const limit = process.env.TOOL_INPUT_limit ?? "";

  if (!rawFilePath.trim()) {
    printContext(null);
    return;
  }

  const filePath = toWindowsPath(rawFilePath.trim());
  const normalized = filePath.replaceAll("/", "\\");
  const lower = normalized.toLowerCase();

  const indexNames = [
    "master_index.md",
    "master_index_compact.md",
    "directory_digest.md",
    "dispatcher_digest.md",
    "engine_digest.md",
    "path_index.md",
    "code_system_index.json",
    "prism_shared_index_surfaces.md",
  ];
  if (indexNames.some((name) => lower.endsWith(`\\${name}`) || lower.endsWith(`/${name}`))) {
    printContext(INDEX_HINT);
    return;
  }

  if (lower.endsWith("\\state\\current_state.json")) {
    printContext(
      "NOTE: CURRENT_STATE.json is a legacy file. Current state is in mcp-server/data/state/HEALTH_CHECK_REPORT.json.",
    );
    return;
  }

  if (lower.endsWith("\\session_memory.json")) {
    printContext(
      "NOTE: SESSION_MEMORY.json is legacy. Session memory is now managed by MEMORY.md (auto-synced).",
    );
    return;
  }

  if ((await fileExists(filePath)) && !offset && !limit) {
    const lineCount = await countLines(filePath);
    if (lineCount > 2000) {
      printContext(
        `LARGE FILE: ${rawFilePath} has ${lineCount}+ lines. Consider using offset/limit parameters to read specific sections. Also check whether a digest or index file can answer the question first. First 100 lines: offset=0, limit=100.`,
      );
      return;
    }
  }

  printContext(null);
}

main().catch(() => {
  printContext(null);
});
