import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { cachePath, ensureCacheDir } from "./hook-cache.mjs";

const PRISM_ROOT = "H:\\prism";
const MCP_ROOT = "H:\\prism\\mcp-server";

function runCommand(command, cwd) {
  const result = spawnSync("powershell", ["-NoProfile", "-Command", command], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: PRISM_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

async function touch(filePath) {
  await ensureCacheDir();
  await fs.writeFile(filePath, `${new Date().toISOString()}\n`, "utf8");
}

async function removeIfExists(filePath) {
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // ignore
  }
}

async function main() {
  const cmd = process.env.TOOL_INPUT_command ?? "";
  const success = (process.env.TOOL_SUCCESS ?? "false") === "true";
  if (!success || !cmd.trim()) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  await ensureCacheDir();
  const buildCache = cachePath("build-success");
  const testCache = cachePath("test-success");
  const tscCache = cachePath("tsc-success");

  if (cmd.includes("npm run build")) {
    await touch(buildCache);
    const buildFile = "H:\\prism\\mcp-server\\dist\\index.js";
    try {
      const stats = await fs.stat(buildFile);
      const sizeMB = stats.size / (1024 * 1024);
      const sizeDisplay = sizeMB >= 1 ? `${Math.round(sizeMB)}M` : `${Math.round(stats.size / 1024)}K`;
      await fs.writeFile(cachePath("build-size"), `${sizeDisplay}\n`, "utf8");
    } catch {
      // ignore
    }
  }

  if (cmd.includes("vitest") || cmd.includes("npm test") || cmd.includes("npm run test")) {
    await touch(testCache);
  }

  if (cmd.includes("tsc --noEmit") || cmd.includes("tsc -noEmit")) {
    await touch(tscCache);
  }

  if (cmd.startsWith("git status")) {
    const status = runGit(["status", "--porcelain"]);
    await fs.writeFile(cachePath("git-status"), `${status}\n`, "utf8");
  }

  if (cmd.startsWith("git log")) {
    const headSha = runGit(["rev-parse", "HEAD"]) || "unknown";
    const log = runGit(["log", "--oneline", "-20"]);
    await fs.writeFile(cachePath("git-log"), `${headSha}\n${log}\n`, "utf8");
  }

  if (cmd.startsWith("git diff")) {
    const diff = runGit(["diff", "--stat"]);
    await fs.writeFile(cachePath("git-diff"), `${diff}\n`, "utf8");
  }

  if (cmd.includes("git commit") || cmd.includes("git add")) {
    await Promise.all([
      removeIfExists(cachePath("git-status")),
      removeIfExists(cachePath("git-log")),
      removeIfExists(cachePath("git-diff")),
    ]);
  }

  if (cmd.includes("JSON.parse") && cmd.includes("settings.json")) {
    await touch(cachePath("json-valid"));
  }

  if (
    cmd.includes("npm install") ||
    cmd.includes("npm add") ||
    cmd.includes("npm ci") ||
    cmd.includes("npm update") ||
    cmd.includes("npm remove")
  ) {
    await Promise.all([
      removeIfExists(cachePath("npm-list")),
      removeIfExists(buildCache),
      removeIfExists(testCache),
      removeIfExists(tscCache),
    ]);
  }

  if (cmd.startsWith("npm list") || cmd.startsWith("npm ls")) {
    const output = runCommand("npm list --depth=0 2>$null", MCP_ROOT);
    await fs.writeFile(cachePath("npm-list"), `${output}\n`, "utf8");
  }

  if (cmd.startsWith("wc -l ")) {
    const targetFile = cmd.slice("wc -l ".length).replace(/["']/g, "").trim();
    if (targetFile) {
      try {
        const raw = await fs.readFile(targetFile, "utf8");
        const lineCount = raw.split(/\r?\n/).length;
        const fileHash = crypto.createHash("md5").update(targetFile).digest("hex");
        await fs.writeFile(cachePath(`wc-${fileHash}`), `${lineCount}\n`, "utf8");
      } catch {
        // ignore
      }
    }
  }

  if (cmd.startsWith("cat ")) {
    const targetFile = cmd.slice("cat ".length).replace(/["']/g, "").trim();
    if (targetFile.endsWith("package.json") || targetFile.endsWith("tsconfig.json")) {
      try {
        const raw = await fs.readFile(targetFile, "utf8");
        const fileHash = crypto.createHash("md5").update(targetFile).digest("hex");
        await fs.writeFile(cachePath(`cat-${fileHash}`), raw, "utf8");
      } catch {
        // ignore
      }
    }
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
