#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { analyzeTestLegitimacy } from "./lib/test-legitimacy-core.mjs";

const REPO_ROOT = "H:\\PRISM";
const SESSION_WRITE_SET = "H:\\PRISM\\.claude\\cache\\session-write-set.json";
const command = process.env.TOOL_INPUT_command || "";

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

function readRepoFile(relativePath) {
  const normalized = relativePath.replace(/\//g, "\\");
  const fullPath = `${REPO_ROOT}\\${normalized}`;
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

if (!/(vitest|npm\s+(run\s+)?test)/i.test(command)) {
  process.stdout.write("{}");
  process.exit(0);
}

const trackedFiles = readSessionWriteSet();
const changedFiles = (trackedFiles.length > 0 ? trackedFiles : runGit(["diff", "--name-only", "HEAD"])
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean));
const repoFiles = runGit(["ls-files"])
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const analysis = analyzeTestLegitimacy({
  command,
  changedFiles,
  repoFiles,
  readFile: readRepoFile,
});

if (analysis.decision === "block") {
  const reason = [
    "TEST LEGITIMACY GATE BLOCKED:",
    ...analysis.reasons.map((issue, index) => `${index + 1}. ${issue}`),
    "",
    "Before running tests, make sure the tests map to the changed code and prove upstream/downstream effects where routes or workflow continuity changed.",
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason,
    }),
  );
  process.exit(0);
}

if (analysis.summary) {
  process.stdout.write(
    JSON.stringify({
      additionalContext: `TEST LEGITIMACY: ${analysis.summary}.`,
    }),
  );
  process.exit(0);
}

process.stdout.write("{}");
