import { promises as fs } from "node:fs";

const LARGE_TEXT_THRESHOLD = 5000;
const LARGE_FILE_BYTES = 120000;
const LARGE_FILE_LINES = 400;

function collectResultText() {
  const resultEntries = Object.entries(process.env).filter(([key, value]) => {
    return (
      typeof value === "string" &&
      value.length > 0 &&
      (key === "TOOL_RESULT" ||
        key === "TOOL_OUTPUT" ||
        key.startsWith("TOOL_RESULT_") ||
        key.startsWith("TOOL_OUTPUT_"))
    );
  });

  return resultEntries.map(([, value]) => value).join("\n");
}

function commandLooksHighVolume(command) {
  if (!command) {
    return false;
  }
  return /Get-ChildItem\s+-Recurse|git\s+diff|git\s+show|npm\s+run\s+build|vitest|Select-String|Get-Content|type\s+/i.test(
    command,
  );
}

async function fileLooksHighVolume(filePath) {
  if (!filePath) {
    return false;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.size >= LARGE_FILE_BYTES) {
      return true;
    }
    if (stat.size < 4096) {
      return false;
    }
    const text = await fs.readFile(filePath, "utf8");
    return text.split(/\r?\n/).length >= LARGE_FILE_LINES;
  } catch {
    return false;
  }
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const toolName = process.env.TOOL_NAME ?? "";
  const command = process.env.TOOL_INPUT_command ?? "";
  const filePath = process.env.TOOL_INPUT_file_path ?? "";
  const resultText = collectResultText();
  const resultLength = resultText.length;
  const largeFile = await fileLooksHighVolume(filePath);
  const heavyByPattern =
    (toolName === "Bash" && commandLooksHighVolume(command)) ||
    (toolName === "Read" && largeFile);
  const shouldWarn =
    resultLength >= LARGE_TEXT_THRESHOLD || heavyByPattern || largeFile;

  if (!shouldWarn) {
    return;
  }

  const reasons = [];
  if (resultLength >= LARGE_TEXT_THRESHOLD) {
    reasons.push(`result=${resultLength} chars`);
  }
  if (toolName === "Bash" && commandLooksHighVolume(command)) {
    reasons.push("high-volume bash pattern");
  }
  if (toolName === "Read" && largeFile) {
    reasons.push("large file read");
  }

  process.stdout.write(
    JSON.stringify({
      additionalContext:
        `TOKEN GUARD: ${reasons.join(", ")}. Summarize key lines only, reference file paths instead of echoing whole outputs, and prefer digest/registry/bridge files before broad dumps. If context pressure rises, compact or slim before continuing.`,
    }),
  );
}

main().catch(() => {});
