import process from "node:process";
import { cachePath, readLines } from "./hook-cache.mjs";

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const toolName = process.env.TOOL_NAME ?? "unknown";
  const toolError = process.env.TOOL_ERROR ?? "";
  const errorLines = await readLines(cachePath("error-log"));
  const recentEntries = errorLines
    .slice(-5)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const consecutive = recentEntries.filter((entry) => entry.tool === toolName).length;
  let hint = "";

  if (consecutive >= 3) {
    hint =
      `REPEATED FAILURE: '${toolName}' has failed ${consecutive} times in recent attempts. Consider a different approach, verify prerequisites, and inspect whether the error pattern points to a systemic issue.`;
  }

  if (toolError.includes("TS2307")) {
    hint = "TS2307 (Cannot find module): Check the import path and whether the file or package moved. Install missing packages if needed.";
  } else if (toolError.includes("TS2345")) {
    hint = "TS2345 (Type mismatch): The argument type does not match the parameter type. Check the function signature and any missing narrowing/casting.";
  } else if (toolError.includes("TS2339")) {
    hint = "TS2339 (Property doesn't exist): The property or method is missing on the current type. Check the interface/type definition or narrow the value first.";
  } else if (toolError.includes("TS2304")) {
    hint = "TS2304 (Cannot find name): A variable/type is not imported or defined. Add the missing import or declaration.";
  } else if (toolError.includes("ENOENT")) {
    hint = "ENOENT: A file or directory was not found. Verify the working directory and whether the target file/path was renamed or moved.";
  } else if (/EACCES|permission denied/i.test(toolError)) {
    hint = "Permission denied: the file may be protected or read-only. Inspect file attributes and the active hook protection rules.";
  } else if (/heap|JavaScript heap/i.test(toolError)) {
    hint = "Heap overflow: for builds, prefer the faster build path or increase NODE_OPTIONS=--max-old-space-size when appropriate.";
  }

  if (hint) {
    process.stdout.write(
      JSON.stringify({
        additionalContext: `SMART RECOVERY: ${hint}`,
      }),
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
