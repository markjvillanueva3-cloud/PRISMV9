#!/usr/bin/env node
// tier: T2
/**
 * session-start-dev-keyword-launcher.mjs — F6
 *
 * On SessionStart, scan the transcript tail for dev-work keywords in the
 * MOST RECENT user message (the prompt that triggered the session resume).
 * If found AND this chat has NOT yet claimed a slot (or has, but the slot
 * has no `pipelineStep` set), surface a 1-line "ready to /checkin <task>"
 * nudge so the operator (or autonomous /loop) launches the pipeline.
 *
 * Soft, never blocks. Suppresses if the chat is already in a pipeline.
 *
 * Knobs:
 *   PRISM_DEV_LAUNCHER_DISABLE=1   — off
 */

import fs from "node:fs";

const SLOTS_FILE = "H:/prism/state/shared/chat-slots.json";
const SILENCE = { continue: true, suppressOutput: true };
const TAIL_BYTES = 64 * 1024;
const KEYWORDS = [
  "build", "ship", "complete all", "/loop", "/goal", "wire", "engine", "dispatcher",
  "hook", "skill", "next unit", "pick a unit", "implement", "develop",
  "yolo", "continue with", "shipping", "/run-continuous",
];

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

function readTail(p, max) {
  try {
    const fd = fs.openSync(p, "r");
    const { size } = fs.fstatSync(fd);
    const start = size > max ? size - max : 0;
    const buf = Buffer.allocUnsafe(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    return buf.toString("utf-8");
  } catch { return ""; }
}

function lastUserMessage(tail) {
  const lines = tail.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t) continue;
    let entry;
    try { entry = JSON.parse(t); } catch { continue; }
    if (entry.type !== "user") continue;
    const content = entry?.message?.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map(c => typeof c === "string" ? c : (c?.text || "")).join(" ");
    }
  }
  return "";
}

function findKeyword(text) {
  const lower = text.toLowerCase();
  for (const kw of KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function chatInActivePipeline(sessionId) {
  try {
    if (!fs.existsSync(SLOTS_FILE)) return false;
    const s = JSON.parse(fs.readFileSync(SLOTS_FILE, "utf-8"));
    const chatId = `claude-${(sessionId || "").slice(0, 8)}`;
    for (const slot of Object.values(s.slots || {})) {
      if (slot && slot.chatId === chatId && slot.pipelineStep) return true;
    }
    return false;
  } catch { return false; }
}

function main() {
  if (process.env.PRISM_DEV_LAUNCHER_DISABLE === "1") { emit(SILENCE); return; }
  const stdin = readStdin() || {};
  const transcript = stdin.transcript_path;
  if (!transcript) { emit(SILENCE); return; }
  const tail = readTail(transcript, TAIL_BYTES);
  if (!tail) { emit(SILENCE); return; }
  const msg = lastUserMessage(tail);
  if (!msg || msg.length < 12) { emit(SILENCE); return; }
  const kw = findKeyword(msg);
  if (!kw) { emit(SILENCE); return; }
  if (chatInActivePipeline(stdin.session_id)) { emit(SILENCE); return; }

  const preview = msg.slice(0, 160).replace(/\n+/g, " ");
  emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: [
        `## 🚀 Dev-work detected — pipeline launch ready`,
        ``,
        `Last user prompt mentions "${kw}". Suggested entry:`,
        ``,
        `  \`/checkin /loop ${preview.slice(0, 100)}…\``,
        ``,
        `Or pick a unit explicitly: \`/pick-unit\` (devtools roadmap first) | \`/pick-build-close\` (full macro).`,
        `Disable: \`PRISM_DEV_LAUNCHER_DISABLE=1\``,
      ].join("\n"),
    },
  });
}

try { main(); } catch { emit(SILENCE); }
