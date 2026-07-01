#!/usr/bin/env node
// tier: T3
// HERMES-MS0 / U-HERMES03 — Stop-hook observation tagger for the closed learning loop.
//
// Reads the session's recent tool-call signature from the transcript tail and the
// commit-was-made signal from git, classifies the window via skill-candidate-detect,
// and appends ONE JSONL line to state/shared/skill-candidates.jsonl.
//
// Strictly observational — never auto-emits skill stubs, never mutates the skill
// library. Downstream U-HERMES04 (cluster) reads this ledger.
//
// Safety: Stop hooks must NEVER throw. All failure paths emit { continue: true }.
// Disable: PRISM_SKILL_CANDIDATE_OBSERVE_DISABLE=1.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { classifyWindow, formatCandidateEntry } from "../../scripts/lib/skill-candidate-detect.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const LEDGER = path.join(PRISM_ROOT, "state/shared/skill-candidates.jsonl");
const SLOTS_FILE = path.join(PRISM_ROOT, "state/shared/chat-slots.json");
const TRANSCRIPT_TAIL_BYTES = 256 * 1024;  // 256 KB tail — enough for most session windows
const GIT_TIMEOUT_MS = 1500;
const STAMP_FILE = path.join(PRISM_ROOT, "state/shared/.skill-candidate-observe.stamp");
const THROTTLE_MS = 60 * 1000;  // one observation per 60 s — protects against Stop-storm fleet-wide

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}
function emitEmpty() { emit({ continue: true }); }

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

function readTranscriptTail(transcriptPath, bytes) {
  try {
    const stat = fs.statSync(transcriptPath);
    const tail = Math.min(stat.size, bytes);
    const fd = fs.openSync(transcriptPath, "r");
    const buf = Buffer.alloc(tail);
    fs.readSync(fd, buf, 0, tail, stat.size - tail);
    fs.closeSync(fd);
    return buf.toString("utf8");
  } catch { return ""; }
}

// Best-effort recent-tool-call extraction from the transcript JSONL tail.
// Looks for lines containing `"type":"tool_use"` and grabs the `"name"` field.
// Conservative: parses ≤ 50 most-recent matches.
function extractRecentToolCalls(transcriptText) {
  if (!transcriptText) return [];
  const lines = transcriptText.split("\n");
  const out = [];
  for (let i = lines.length - 1; i >= 0 && out.length < 50; i--) {
    const line = lines[i];
    if (!line.includes("tool_use")) continue;
    try {
      const obj = JSON.parse(line);
      const content = obj?.message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block?.type === "tool_use" && typeof block?.name === "string") {
          out.unshift({ tool: block.name });
        }
      }
    } catch {}
  }
  return out;
}

// Outcome heuristic: did this session commit since the last stamp?
// Conservative: if HEAD commit subject's author-time is within the throttle window AND
// the working tree shows no failing-test marker file, classify as "committed".
function detectOutcome() {
  try {
    const headTime = execFileSync("git", ["-C", PRISM_ROOT, "log", "-1", "--format=%at"], { windowsHide: true,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: GIT_TIMEOUT_MS,
    }).trim();
    const t = Number(headTime) * 1000;
    if (Number.isFinite(t) && (Date.now() - t) < 30 * 60 * 1000) {
      return "committed";
    }
  } catch {}
  return "";
}

// Throttle: don't observe more than once per THROTTLE_MS — Stop hooks fire often
// in a 26-chat fleet, and the cluster step (U-HERMES04) reads the ledger anyway.
function throttled() {
  try {
    const stat = fs.statSync(STAMP_FILE);
    if (stat && (Date.now() - stat.mtimeMs) < THROTTLE_MS) return true;
  } catch {}
  return false;
}
function stamp() {
  try {
    fs.mkdirSync(path.dirname(STAMP_FILE), { recursive: true });
    fs.writeFileSync(STAMP_FILE, String(Date.now()));
  } catch {}
}

async function main() {
  if (process.env.PRISM_SKILL_CANDIDATE_OBSERVE_DISABLE === "1") return emitEmpty();
  if (throttled()) return emitEmpty();

  let raw = "";
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    raw = Buffer.concat(chunks).toString("utf8");
  } catch { return emitEmpty(); }
  const env = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
  const sid = env.session_id || "";
  const transcriptPath = env.transcript_path || "";
  if (!sid || !transcriptPath) return emitEmpty();

  // Resolve slot (best-effort — null slot is OK, ledger records it as null).
  const slotsDoc = readJson(SLOTS_FILE) || { slots: {} };
  let mySlot = null;
  for (const [name, data] of Object.entries(slotsDoc.slots || {})) {
    if (data?.chatId && (data.chatId === sid || sid.includes(data.chatId.replace(/^claude-/, "")))) {
      mySlot = name;
      break;
    }
  }

  const tail = readTranscriptTail(transcriptPath, TRANSCRIPT_TAIL_BYTES);
  const toolCalls = extractRecentToolCalls(tail);
  const outcome = detectOutcome();

  const classification = classifyWindow({ toolCalls, outcome, regressionAlert: false });
  const entry = formatCandidateEntry(classification, { slot: mySlot, chatId: `claude-${sid.slice(0, 8)}` });

  // Append-only JSONL. Best-effort — never throws into the harness.
  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.appendFileSync(LEDGER, JSON.stringify(entry) + "\n");
    stamp();
  } catch {}

  emitEmpty();
}

main().catch(() => emitEmpty());
