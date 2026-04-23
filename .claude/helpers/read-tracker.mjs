import process from "node:process";
import { appendUniqueLine, cachePath } from "./hook-cache.mjs";

async function main() {
  const filePath = process.env.TOOL_INPUT_file_path ?? "";
  if (!filePath.trim()) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  await appendUniqueLine(cachePath("files-read"), filePath.trim());
  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
