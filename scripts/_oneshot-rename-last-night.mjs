#!/usr/bin/env node
// One-shot batch rename — see CLAUDE chat 2026-05-19 (charlie a614edfb).
// 17 chats from last night → NATO slot labels (alpha..mike) + november..romeo
// + one objective slug. Skips a614edfb (current chat).
// Reversible: archives prior siblings to .archive.2026-05-19 (never deletes).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HANDOFFS_DIR = "H:/prism/state/shared/handoffs";
const HELPER = "H:/prism/.claude/helpers/per-agent-handoff.mjs";
const NODE = process.execPath;
const ARCHIVE_TAG = "archive.2026-05-19";

// (short8, newTopic) — 17 entries; a614edfb deliberately omitted.
const RENAMES = [
  ["1f861b7a", "bravo"],
  ["cedef311", "golf"],
  ["1c9a87e8", "alpha"],
  ["e91338dc", "juliett"],
  ["bca3789f", "lima"],
  ["c0eb54b9", "kilo"],
  ["58b92d2e", "lathe-tribal-wire"],
  ["be5e37e8", "mike"],
  ["82514795", "india"],
  ["9c7dcf3e", "hotel"],
  ["3c737257", "foxtrot"],
  ["00a9c6dc", "echo"],
  ["571d4bdd", "november"],
  ["396bc735", "oscar"],
  ["78d985bc", "papa"],
  ["24e5b0b2", "quebec"],
  ["b27aedbd", "romeo"],
];

function listHandoffsFor(short) {
  const prefix = `HANDOFF-claude-${short}-`;
  return fs
    .readdirSync(HANDOFFS_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".md"))
    .map((f) => ({ file: f, path: path.join(HANDOFFS_DIR, f), mtime: fs.statSync(path.join(HANDOFFS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

function carryForward(handoffs, newTopic) {
  if (!handoffs.length) {
    return {
      resume: `Resume chat under new label "${newTopic}". (Chat relabeled — no prior handoff content carried.)`,
      state: `Active chat: ${newTopic}.`,
    };
  }
  const body = fs.readFileSync(handoffs[0].path, "utf-8");
  // Extract ## Resume directive section
  const resumeMatch = body.match(/##\s+Resume\s+directive\s*\n([\s\S]*?)(?=\n##\s|\n<!--|$)/i) || body.match(/##\s+RESUME\s*\n([\s\S]*?)(?=\n##\s|\n<!--|$)/);
  const stateMatch = body.match(/##\s+State\s*\n([\s\S]*?)(?=\n##\s|\n<!--|$)/i);
  const trim = (s) => (s ? s.trim().slice(0, 4000) : "");
  return {
    resume: trim(resumeMatch?.[1]) || `Resume chat under label "${newTopic}". (Carried from ${handoffs[0].file} — Resume section not parseable.)`,
    state: trim(stateMatch?.[1]) || `Active chat: ${newTopic}. (Carried from ${handoffs[0].file}.)`,
  };
}

function writeHandoff(short, newTopic, resume, state) {
  const args = [
    HELPER,
    "write",
    "--source", "live-chat",
    "--terminal", `claude-${short}`,
    "--topic", newTopic,
    "--resume", resume,
    "--state", state,
  ];
  const out = execFileSync(NODE, args, { encoding: "utf-8", windowsHide: true });
  return out.trim();
}

function archiveSiblings(short, newTopic) {
  const target = `HANDOFF-claude-${short}-${newTopic}.md`;
  const siblings = listHandoffsFor(short).filter((h) => h.file !== target);
  const archived = [];
  for (const s of siblings) {
    if (s.file.includes(".archive.")) continue;  // already archived
    const dst = s.path.replace(/\.md$/, `.${ARCHIVE_TAG}`);
    try {
      fs.renameSync(s.path, dst);
      archived.push(path.basename(dst));
    } catch (e) {
      archived.push(`${s.file} (rename FAILED: ${e.message})`);
    }
  }
  return archived;
}

console.log(`Rename batch — ${RENAMES.length} chats — ${new Date().toISOString()}\n`);

const report = [];
for (const [short, newTopic] of RENAMES) {
  const siblings = listHandoffsFor(short);
  const carry = carryForward(siblings, newTopic);
  let writeResult, archived;
  try {
    writeResult = writeHandoff(short, newTopic, carry.resume, carry.state);
  } catch (e) {
    writeResult = `ERROR: ${e.message?.slice(0, 200)}`;
  }
  archived = archiveSiblings(short, newTopic);
  console.log(`[${short}] → ${newTopic}`);
  console.log(`  write: ${writeResult.slice(0, 160)}`);
  console.log(`  archived: ${archived.length ? archived.join(", ") : "(no siblings)"}`);
  report.push({ short, newTopic, write: writeResult, archived });
}

console.log(`\n--- summary ---`);
console.log(`Renamed: ${report.length}`);
console.log(`Total siblings archived: ${report.reduce((a, r) => a + r.archived.length, 0)}`);
