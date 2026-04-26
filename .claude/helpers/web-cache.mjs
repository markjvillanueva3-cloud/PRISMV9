import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import process from "node:process";
import path from "node:path";
import { CACHE_DIR, ensureCacheDir } from "./hook-cache.mjs";

function cacheFileForUrl(url) {
  const hash = crypto.createHash("md5").update(url).digest("hex");
  return path.join(CACHE_DIR, "web", hash);
}

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const url = (process.env.TOOL_INPUT_url ?? "").trim();
  if (!url) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const cacheFile = cacheFileForUrl(url);
  await ensureCacheDir();
  await fs.mkdir(path.dirname(cacheFile), { recursive: true });

  try {
    const stats = await fs.stat(cacheFile);
    const ageSeconds = Math.max(0, Math.floor((Date.now() - stats.mtimeMs) / 1000));
    if (ageSeconds < 900) {
      process.stdout.write(
        JSON.stringify({
          additionalContext: `WEB CACHE: This URL was fetched ${ageSeconds}s ago (within 15 min TTL). Content likely unchanged.`,
        }),
      );
      return;
    }
  } catch {
    // first fetch
  }

  await fs.writeFile(cacheFile, `${new Date().toISOString()}\n`, "utf8");
  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
