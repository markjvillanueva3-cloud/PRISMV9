import process from "node:process";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { analyzeTestLegitimacy } from "./lib/test-legitimacy-core.mjs";

const PRISM_DIR = "H:\\prism";
const SESSION_WRITE_SET = "H:\\prism\\.claude\\cache\\session-write-set.json";

function runGit(args, timeoutMs = 3000) {
  const result = spawnSync("git", args, {
    cwd: PRISM_DIR,
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

function readRepoFile(relativePath) {
  const normalized = relativePath.replace(/\//g, "\\");
  const fullPath = `${PRISM_DIR}\\${normalized}`;
  if (!existsSync(fullPath)) {
    return "";
  }
  try {
    return readFileSync(fullPath, "utf8");
  } catch {
    return "";
  }
}

function readSessionWriteSet() {
  if (!existsSync(SESSION_WRITE_SET)) {
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(SESSION_WRITE_SET, "utf8"));
    const files = raw.files && typeof raw.files === "object" ? raw.files : {};
    const cutoff = Date.now() - (12 * 60 * 60 * 1000);
    return Object.entries(files)
      .filter(([, timestamp]) => typeof timestamp === "number" && timestamp >= cutoff)
      .map(([filePath]) => filePath);
  } catch {
    return [];
  }
}

async function main() {
  const uncommitted = runGit(["status", "--porcelain"]);
  const reasons = [];

  if (uncommitted) {
    const lines = uncommitted
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const fileCount = lines.length;
    const fileList = lines.slice(0, 5).join(", ");
    const suffix = fileCount > 5 ? ` ... and ${fileCount - 5} more` : "";
    reasons.push(`UNCOMMITTED WORK: ${fileCount} files with changes: ${fileList}${suffix}. Consider committing or stashing before stopping.`);
  }

  const changedFiles = (() => {
    const tracked = readSessionWriteSet();
    if (tracked.length > 0) {
      return tracked;
    }
    return runGit(["diff", "--name-only", "HEAD"])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  })();
  const repoFiles = runGit(["ls-files"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const testGate = analyzeTestLegitimacy({
    command: "npx vitest run",
    changedFiles,
    repoFiles,
    readFile: readRepoFile,
  });

  if (testGate.decision === "block") {
    reasons.push(`TEST LEGITIMACY PENDING: ${testGate.reasons[0]}`);
  }

  if (reasons.length === 0) {
    process.stdout.write("{}");
    return;
  }

  process.stdout.write(
    JSON.stringify({
      decision: "allow",
      reason: reasons.join(" "),
    }),
  );
}

main().catch(() => {
  process.stdout.write("{}");
});
