#!/usr/bin/env node
// tier: T4
/**
 * H: Drive Audit Hook — SessionStart
 *
 * Scans for user-authored content on C:\Users\*\.claude\ that should be
 * migrated to H:\.claude\ for drive-swap portability. Reports any found
 * duplicates or C:-only content that needs migration.
 *
 * Also checks if H:\.claude\ content is being shadowed by C: versions.
 */
import fs from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";



function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

const USER_AUTHORED_DIRS = ["commands", "agents", "hooks", "skills", "rules", "plans"];

const cClaudeDir = join(homedir(), ".claude");
const hClaudeDir = "H:\\.claude";

function scanDir(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) return [];
    return fs.readdirSync(dir).filter(f => !f.startsWith("."));
  } catch {
    return [];
  }
}

function audit() {
  const issues = [];
  const migrations = [];

  for (const subdir of USER_AUTHORED_DIRS) {
    const cPath = join(cClaudeDir, subdir);
    const hPath = join(hClaudeDir, subdir);

    const cFiles = scanDir(cPath);
    const hFiles = new Set(scanDir(hPath));

    for (const file of cFiles) {
      const cFullPath = join(cPath, file);
      const hFullPath = join(hPath, file);

      if (hFiles.has(file)) {
        // Duplicate exists on both drives
        issues.push({
          type: "duplicate",
          file,
          subdir,
          cPath: cFullPath,
          hPath: hFullPath,
          message: `DUPLICATE: ${subdir}/${file} exists on BOTH C: and H: — C: version may shadow H:`,
        });
      } else {
        // Only on C:, needs migration
        migrations.push({
          type: "migrate",
          file,
          subdir,
          cPath: cFullPath,
          hPath: hFullPath,
          message: `MIGRATE: ${subdir}/${file} is only on C: — move to H:\\.claude\\${subdir}\\`,
        });
      }
    }
  }

  return { issues, migrations };
}

async function main() {
  // Read stdin (hook protocol)
  const input = readStdinSafe();

  const { issues, migrations } = audit();
  const total = issues.length + migrations.length;

  if (total === 0) {
    console.log(JSON.stringify({
      continue: true,
      suppressOutput: true,
    }));
    return;
  }

  // Build warning message
  const lines = ["## H: Drive Audit Warning\n"];

  if (issues.length > 0) {
    lines.push(`**${issues.length} DUPLICATES** (C: may shadow H:):`);
    for (const i of issues) {
      lines.push(`  - ${i.subdir}/${i.file}`);
    }
    lines.push("");
  }

  if (migrations.length > 0) {
    lines.push(`**${migrations.length} files need migration** from C: to H::`);
    for (const m of migrations) {
      lines.push(`  - ${m.subdir}/${m.file} → H:\\.claude\\${m.subdir}\\`);
    }
    lines.push("");
  }

  lines.push("**Fix:** Move user-authored content to H:\\.claude\\ and delete C: copies.");
  lines.push("**Why:** H: drive is portable; C: is machine-specific.");

  console.log(JSON.stringify({
    continue: true,
    additionalContext: lines.join("\n"),
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
