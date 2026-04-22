import process from "node:process";
import { appendUniqueLine, cachePath } from "./hook-cache.mjs";

async function main() {
  const filePath = process.env.TOOL_INPUT_file_path ?? "";
  if (!filePath.trim()) {
    process.stdout.write("{}");
    return;
  }

  await appendUniqueLine(cachePath("files-read"), filePath.trim());
  process.stdout.write("{}");
}

main().catch(() => {
  process.stdout.write("{}");
});
