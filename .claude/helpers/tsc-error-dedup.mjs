import process from "node:process";

const TSC_ERROR_PATTERN = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;
const MIN_OUTPUT_LENGTH = 1500;

function collectOutput() {
  const entries = Object.entries(process.env).filter(([key, value]) =>
    typeof value === "string" &&
    value.length > 0 &&
    (key === "TOOL_RESULT" ||
      key === "TOOL_OUTPUT" ||
      key.startsWith("TOOL_RESULT_") ||
      key.startsWith("TOOL_OUTPUT_"))
  );
  return entries.map(([, v]) => v).join("\n");
}

function main() {
  const cmd = process.env.TOOL_INPUT_command ?? "";
  const success = (process.env.TOOL_SUCCESS ?? "false") === "true";

  if (success) {
    process.stdout.write("{}");
    return;
  }

  if (!cmd.includes("tsc")) {
    process.stdout.write("{}");
    return;
  }

  const output = collectOutput();
  if (output.length < MIN_OUTPUT_LENGTH) {
    process.stdout.write("{}");
    return;
  }

  const lines = output.split(/\r?\n/);
  const errors = new Map();
  let totalErrors = 0;
  const filesWithErrors = new Set();

  for (const line of lines) {
    const match = TSC_ERROR_PATTERN.exec(line);
    if (match) {
      totalErrors++;
      const [, filePath, , , code, message] = match;
      filesWithErrors.add(filePath);
      if (!errors.has(code)) {
        errors.set(code, { message: message.slice(0, 120), count: 0, files: new Set() });
      }
      const entry = errors.get(code);
      entry.count++;
      entry.files.add(filePath);
    }
  }

  if (totalErrors < 3) {
    process.stdout.write("{}");
    return;
  }

  const sorted = [...errors.entries()].sort((a, b) => b[1].count - a[1].count);
  const top5 = sorted.slice(0, 5);

  const summary = top5
    .map(([code, info]) => `${code} (${info.count}x, ${info.files.size} files): ${info.message}`)
    .join(" | ");

  process.stdout.write(JSON.stringify({
    additionalContext: `TSC DEDUP: ${totalErrors} errors, ${errors.size} unique codes, ${filesWithErrors.size} files. Top errors: ${summary}. Fix the highest-count error code first — it likely has one root cause.`
  }));
}

main();
