#!/usr/bin/env node
// distill-session-learnings.mjs
// SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL
//
// Extract session-end learnings from a chat session (most-recent commit
// metadata, scrutiny ledger notes, file-touch list, decision-log diffs)
// and write a single dedup'd entry to BOTH:
//   - knowledge/wiki/code-tribal/learnings/<unit-id>.md (project-lifetime, git-tracked)
//   - C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/reference_<slug>.md (Obsidian, cross-session)
//
// SHA-256 of normalized content prevents double-entries on re-runs.
//
// Trigger: invoked by .claude/hooks/post-ship-distill.mjs Stop hook when the
// most-recent commit body matches /[\[A-Z][A-Z0-9-]+\]\/U-\w+/.
//
// CLI:
//   node scripts/distill-session-learnings.mjs [--sha <40-char-sha>] [--dry-run]
//   --sha <sha>   distil from this commit (default: HEAD)
//   --dry-run     report what would be written, no fs change

import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { existsSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const WIKI_LEARNING_DIR = path.join(PRISM_ROOT, "knowledge", "wiki", "code-tribal", "learnings");
const OBSIDIAN_MEM_DIR = process.env.PRISM_OBSIDIAN_MEM_DIR || "C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory";
const DEDUP_LEDGER = path.join(PRISM_ROOT, "state", "shared", ".post-ship-distill-dedup.jsonl");

function git(args) {
  return execFileSync("git", ["-C", PRISM_ROOT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function parseCommit(sha) {
  const subject = git(["log", "-1", "--format=%s", sha]).trim();
  const body = git(["log", "-1", "--format=%B", sha]).trim();
  const author = git(["log", "-1", "--format=%an", sha]).trim();
  const date = git(["log", "-1", "--format=%cI", sha]).trim();
  const files = git(["show", "--stat", "--format=", sha]).trim().split("\n").map(l => l.trim()).filter(Boolean);
  const fullSha = git(["rev-parse", sha]).trim();
  return { sha: fullSha, subject, body, author, date, files };
}

function extractUnitId(subject) {
  const m = subject.match(/\[([A-Z][A-Z0-9-]+)\][/\-:\s]+(U-[A-Za-z0-9-]+|MS-[A-Za-z0-9-]+|P\d+(?:-[A-Za-z0-9]+)?)/);
  if (!m) return null;
  return { scope: m[1], unit: m[2] };
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function readDedupLedger() {
  if (!existsSync(DEDUP_LEDGER)) return new Set();
  try {
    const raw = readFileSync(DEDUP_LEDGER, "utf8");
    const set = new Set();
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try { set.add(JSON.parse(line).contentHash); } catch {}
    }
    return set;
  } catch {
    return new Set();
  }
}

async function appendDedupLedger(entry) {
  await fs.mkdir(path.dirname(DEDUP_LEDGER), { recursive: true });
  await fs.appendFile(DEDUP_LEDGER, JSON.stringify(entry) + "\n", "utf8");
}

function readScrutinyLedger() {
  const p = path.join(PRISM_ROOT, "mcp-server", "data", "state", "SCRUTINY_LEDGER.json");
  if (!existsSync(p)) return null;
  try {
    const j = JSON.parse(readFileSync(p, "utf8"));
    const sessions = j.sessions || j;
    if (typeof sessions !== "object") return null;
    const keys = Object.keys(sessions);
    if (keys.length === 0) return null;
    const last = sessions[keys[keys.length - 1]];
    return last;
  } catch {
    return null;
  }
}

function buildContent({ commit, unitId, scrutiny }) {
  const tags = [unitId.scope.toLowerCase(), unitId.unit.toLowerCase(), "auto-distilled"].join(", ");
  const fileCount = commit.files.length;
  const filesPreview = commit.files.slice(0, 10).map(f => `- ${f}`).join("\n");
  const moreFiles = commit.files.length > 10 ? `\n_(+${commit.files.length - 10} more)_` : "";
  const scrutinyNote = scrutiny
    ? `**Scrutiny ledger**: arms ${[scrutiny.opusReviewed ? "A✓" : "A✗", scrutiny.claudeReviewed ? "B✓" : "B✗", scrutiny.codexReviewed ? "C✓" : "C✗"].join(" ")} for session ${(scrutiny.sessionId || "").slice(0, 8)}`
    : "_(no scrutiny ledger entry — verification-only or pre-3-of-3 commit)_";
  const lessonsRx = /(?:lesson|gotcha|surprised|wrong|TIL|important note|note: )[^\n]{1,400}/gi;
  const lessons = (commit.body.match(lessonsRx) || []).slice(0, 5).map(l => `- ${l.trim()}`).join("\n");
  const lessonsBlock = lessons ? `## Lessons surfaced in commit body\n${lessons}\n` : "";

  return [
    `# ${unitId.scope}/${unitId.unit} — ${commit.subject.replace(/^\[[^\]]+\][\/-\s]+[A-Z0-9-]+:\s*/, "")}`,
    "",
    `**Commit:** \`${commit.sha.slice(0, 12)}\` · **By:** ${commit.author} · **At:** ${commit.date}`,
    `**Tags:** ${tags}`,
    "",
    "## Subject",
    commit.subject,
    "",
    "## Body",
    "```",
    commit.body || "(no body)",
    "```",
    "",
    "## Files touched (" + fileCount + ")",
    filesPreview + moreFiles,
    "",
    lessonsBlock,
    "## Verification",
    scrutinyNote,
    "",
    "## Cross-references",
    `- Full commit: \`git -C ${PRISM_ROOT} show ${commit.sha.slice(0, 12)}\``,
    `- Milestone envelope: \`mcp-server/data/milestones/${unitId.scope}.json\``,
    "",
    "---",
    "_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._",
  ].join("\n");
}

function buildObsidianMemo({ commit, unitId, wikiPath }) {
  const slug = slugify(`${unitId.scope}-${unitId.unit}`);
  const name = `reference_post_ship_${slug}`;
  const body = [
    "---",
    `name: ${name}`,
    `description: Auto-distilled learnings from shipping ${unitId.scope}/${unitId.unit} (commit ${commit.sha.slice(0, 9)}). Full content in wiki.`,
    "metadata:",
    "  type: reference",
    "  auto_distilled: true",
    `  unit_scope: ${unitId.scope}`,
    `  unit_id: ${unitId.unit}`,
    `  commit_sha: ${commit.sha.slice(0, 12)}`,
    "---",
    "",
    `# ${unitId.scope}/${unitId.unit}`,
    "",
    commit.subject,
    "",
    `**Shipped:** ${commit.date} by ${commit.author}`,
    `**Files:** ${commit.files.length} touched`,
    "",
    `Full distillation: [[${path.basename(wikiPath, ".md")}]] (in wiki/code-tribal/learnings/).`,
    "",
    "_Auto-distilled — see `scripts/distill-session-learnings.mjs`._",
  ].join("\n");
  return { name, body };
}

async function writeAtomicIfMissing(filePath, content) {
  if (existsSync(filePath)) {
    const existing = readFileSync(filePath, "utf8");
    if (sha256(existing) === sha256(content)) return { written: false, reason: "identical" };
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp-" + Date.now();
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, filePath);
  return { written: true };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const shaIdx = args.indexOf("--sha");
  const targetRef = shaIdx >= 0 ? args[shaIdx + 1] : "HEAD";

  let commit;
  try { commit = parseCommit(targetRef); } catch (e) {
    console.error("distill: failed to read commit", targetRef, "—", e.message);
    process.exit(1);
  }
  const unitId = extractUnitId(commit.subject);
  if (!unitId) {
    console.error(`distill: subject "${commit.subject}" has no [SCOPE]/U-<id> pattern — skipping`);
    process.exit(0);
  }

  const contentHash = sha256(`${commit.sha}|${unitId.scope}|${unitId.unit}`);
  const seen = readDedupLedger();
  if (seen.has(contentHash)) {
    console.error(`distill: already distilled ${unitId.scope}/${unitId.unit} (hash ${contentHash.slice(0, 12)})`);
    process.exit(0);
  }

  const scrutiny = readScrutinyLedger();
  const wikiContent = buildContent({ commit, unitId, scrutiny });
  const wikiFileName = `${unitId.scope.toLowerCase()}-${unitId.unit.toLowerCase()}.md`;
  const wikiPath = path.join(WIKI_LEARNING_DIR, wikiFileName);
  const obs = buildObsidianMemo({ commit, unitId, wikiPath });
  const obsPath = path.join(OBSIDIAN_MEM_DIR, `${obs.name}.md`);

  if (dryRun) {
    console.error(`distill: DRY-RUN — would write:`);
    console.error(`  wiki:     ${wikiPath} (${wikiContent.length} bytes)`);
    console.error(`  obsidian: ${obsPath} (${obs.body.length} bytes)`);
    process.exit(0);
  }

  const wikiResult = await writeAtomicIfMissing(wikiPath, wikiContent);
  const obsResult = await writeAtomicIfMissing(obsPath, obs.body);
  await appendDedupLedger({
    at: new Date().toISOString(),
    contentHash,
    sha: commit.sha,
    scope: unitId.scope,
    unit: unitId.unit,
    wikiWritten: wikiResult.written,
    obsidianWritten: obsResult.written,
  });

  console.error(`distill: ${unitId.scope}/${unitId.unit} — wiki=${wikiResult.written ? "written" : "identical"}, obsidian=${obsResult.written ? "written" : "identical"}`);
  process.stdout.write(JSON.stringify({ ok: true, unit: unitId, wikiPath, obsPath, wrote: { wiki: wikiResult.written, obsidian: obsResult.written } }) + "\n");
}

main().catch(e => {
  console.error("distill fatal:", e.message);
  process.exit(2);
});
