#!/usr/bin/env node
// tier: T3
/**
 * wiki-recall-on-write.mjs — PostToolUse hook for Write|Edit|MultiEdit on vault files
 *
 * Mirror of recall-counter-track.mjs (which only fires on Read) for the
 * write side of the recall signal: closes OBSIDIAN-INTELLIGENCE-MS3 A2.
 * Without this, a memo / wiki entry that's only ever WRITTEN-TO (never
 * read back in the same session) has count=0 forever — masking the real
 * "compounding" signal that the recall counter is supposed to surface.
 *
 * Counts here increment ONE step per matched tool call:
 *   - Write              → +1 (full rewrite is one write event)
 *   - Edit               → +1
 *   - MultiEdit          → +1 (entire batch, not per-edit-in-batch — a multi-edit
 *                              is still semantically one author touch of the file)
 *
 * Path-matching, schema, atomic write, and state file are identical to
 * recall-counter-track.mjs so the two hooks contribute to the same sidecar
 * with no schema fork.
 *
 * Disable: env PRISM_RECALL_COUNTER=0 (shared with read-side hook so a single
 *          knob disables BOTH directions of recall counting)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, basename } from "node:path";

const STATE_FILE = "H:/prism/mcp-server/data/state/wiki-recall-counts.json";
const SCHEMA_VERSION = "1.0.0";
const MEMORY_VAULT_PATTERN = /[\\/]knowledge[\\/]memories[\\/]/i;
const WIKI_VAULT_PATTERN = /[\\/]knowledge[\\/]wiki[\\/]/i;
const SOURCE_MEMORY_PATTERN = /[\\/]\.claude[\\/]projects[\\/][^\\/]*[\\/]memory[\\/]/i;
const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

function emitContinue(msg) {
  const out = { continue: true };
  if (msg) out.hookSpecificOutput = { hookEventName: "PostToolUse", additionalContext: `recall-counter-write: ${msg}` };
  process.stdout.write(JSON.stringify(out));
}

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    return JSON.parse(buf.toString("utf8"));
  } catch { return null; }
}

export function deriveKey(filePath) {
  const norm = String(filePath || "").replace(/\\/g, "/");
  const memMatch = norm.match(/[\/\\]knowledge[\/\\]memories[\/\\]([^\/\\]+)[\/\\]([^\/\\]+)\.md$/i);
  if (memMatch) return { kind: "memory", key: `memory/${memMatch[1]}/${basename(memMatch[2])}` };
  const wikiMatch = norm.match(/[\/\\]knowledge[\/\\]wiki[\/\\]([^\/\\]+)[\/\\]([^\/\\]+)\.md$/i);
  if (wikiMatch) return { kind: "wiki", key: `wiki/${wikiMatch[1]}/${basename(wikiMatch[2])}` };
  const srcMatch = norm.match(/[\/\\]\.claude[\/\\]projects[\/\\][^\/\\]+[\/\\]memory[\/\\]([^\/\\]+)\.md$/i);
  if (srcMatch) return { kind: "memory", key: `memory/source/${srcMatch[1]}` };
  return null;
}

export function isVaultPath(filePath) {
  const norm = String(filePath || "").replace(/\\/g, "/");
  if (MEMORY_VAULT_PATTERN.test(norm) || WIKI_VAULT_PATTERN.test(norm)) return true;
  return SOURCE_MEMORY_PATTERN.test(norm.replace(/\//g, "\\"));
}

export function isWriteTool(toolName) {
  return WRITE_TOOLS.has(String(toolName || ""));
}

function loadState(stateFile = STATE_FILE) {
  if (!existsSync(stateFile)) {
    return { schemaVersion: SCHEMA_VERSION, totalRecalls: 0, entryCount: 0, updatedAtIso: new Date().toISOString(), entries: {} };
  }
  try {
    const raw = readFileSync(stateFile, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion === SCHEMA_VERSION && parsed.entries && typeof parsed.entries === "object") {
      return parsed;
    }
  } catch { /* fall through to fresh */ }
  return { schemaVersion: SCHEMA_VERSION, totalRecalls: 0, entryCount: 0, updatedAtIso: new Date().toISOString(), entries: {} };
}

function writeStateAtomic(state, stateFile = STATE_FILE) {
  const dir = dirname(stateFile);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = stateFile + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, stateFile);
}

export function recordWriteEvent(filePath, toolName, opts = {}) {
  const stateFile = opts.stateFile || STATE_FILE;
  if (!isWriteTool(toolName)) return { ok: false, reason: "not-a-write-tool" };
  if (!filePath || !String(filePath).endsWith(".md")) return { ok: false, reason: "not-a-md-file" };
  if (!isVaultPath(filePath)) return { ok: false, reason: "not-a-vault-path" };
  const derived = deriveKey(filePath);
  if (!derived) return { ok: false, reason: "could-not-derive-key" };
  const state = loadState(stateFile);
  const nowIso = new Date().toISOString();
  const existing = state.entries[derived.key];
  const updated = existing
    ? { ...existing, count: existing.count + 1, lastSeenIso: nowIso }
    : { kind: derived.kind, key: derived.key, count: 1, firstSeenIso: nowIso, lastSeenIso: nowIso };
  state.entries[derived.key] = updated;
  state.totalRecalls = (state.totalRecalls ?? 0) + 1;
  state.entryCount = Object.keys(state.entries).length;
  state.updatedAtIso = nowIso;
  writeStateAtomic(state, stateFile);
  return { ok: true, key: derived.key, count: updated.count };
}

function main() {
  if (process.env.PRISM_RECALL_COUNTER === "0") return emitContinue(null);
  const input = readStdin();
  if (!input) return emitContinue(null);
  const tool = input.tool_name ?? input.toolName ?? "";
  if (!isWriteTool(tool)) return emitContinue(null);
  const filePath = String(input.tool_input?.file_path ?? input.tool_input?.filePath ?? "");
  if (!filePath || !filePath.endsWith(".md")) return emitContinue(null);
  if (!isVaultPath(filePath)) return emitContinue(null);
  try {
    const r = recordWriteEvent(filePath, tool);
    if (r.ok) emitContinue(`+1 ${r.key} via ${tool} (count=${r.count})`);
    else emitContinue(r.reason);
  } catch (e) {
    emitContinue(`write-fail (${e?.message ?? e})`);
  }
}

const isCli = typeof process !== "undefined" && process.argv?.[1] && /wiki-recall-on-write\.mjs$/.test(process.argv[1].replace(/\\/g, "/"));
if (isCli) {
  try { main(); } catch (e) {
    process.stderr.write(`wiki-recall-on-write error: ${e?.message ?? e}\n`);
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}
