#!/usr/bin/env node
// tier: T3
/**
 * memory-mirror-to-vault.mjs — PostToolUse hook
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P1-U04.
 *
 * When Claude writes/edits a file in the user's memory directory
 * (C:/Users/.../.claude/projects/H--prism/memory/), copy it to the H:
 * vault under H:/prism/knowledge/memories/{category}/ and embed it via
 * prism_memory:remember through the running MCP server.
 *
 * Why a PostToolUse hook (not Stop): we want each memory to land in the
 * vault as soon as it's written, so concurrent chats can recall it via
 * semantic_search within the same session.
 *
 * Categories are inferred from the filename prefix; same logic as the
 * bootstrap script. Embedding failures are non-fatal — the on-disk
 * mirror is the durability win.
 *
 * Stdin: PostToolUse hook event (Write/Edit only matter)
 * Stdout: hookSpecificOutput.additionalContext on success (terse)
 * Exit: always 0 (never block tool flow)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P1-U04
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { hostname } from "node:os";

// ─── Provenance frontmatter (D1 — OBSIDIAN-INTELLIGENCE-MS3) ──────────
//
// Inlined here (not imported) because the harness invokes hooks via portable
// node WITHOUT --experimental-strip-types, so loading the TypeScript schema
// at mcp-server/src/schemas/memoryProvenanceSchema.ts would always fail. The
// canonical schema + Zod validation lives in that .ts file; this hook
// implements the minimum-viable subset for live writes. Backfill is where
// Zod validation runs (scripts/backfill-memory-provenance.mjs imports the
// .ts file via tsx).
//
// Contract: emit a `---\nprovenance:\n  ...\n---\n` block prepended to the
// mirrored file iff (a) the content has no existing frontmatter, and (b) we
// have a valid agent id derived from the harness session_id.

const MEMORY_PROVENANCE_SCHEMA_VERSION_INLINE = "1.0.0";

function yamlScalarInline(s) {
  return /^[\w.\-+/:T]+$/.test(s) ? s : JSON.stringify(s);
}

function formatProvenanceInline(prov) {
  // Mirror the key order used by the canonical TS implementation so diffs
  // stay clean across the two code paths.
  const KEY_ORDER = [
    "schemaVersion",
    "agent",
    "sessionId",
    "writeEvent",
    "writtenAt",
    "category",
    "parentMemory",
    "sourceTool",
    "machine",
  ];
  const lines = ["---", "provenance:"];
  for (const k of KEY_ORDER) {
    const v = prov[k];
    if (v === undefined || v === null || v === "") continue;
    lines.push(`  ${k}: ${yamlScalarInline(String(v))}`);
  }
  lines.push("---");
  return lines.join("\n") + "\n";
}

// Strip BOM + check for opening frontmatter fence.
function contentHasFrontmatter(content) {
  if (typeof content !== "string") return false;
  return /^---\s*\n/.test(content.replace(/^﻿/, ""));
}

// ── D2 (U-ONTOLOGY-LAYER) inline helpers ─────────────────────────────
// Mirror the canonical TS schema at src/schemas/memoryOntologySchema.ts
// because portable node hooks can't import from .ts. Keep logic in lockstep:
// any change here MUST also change the TS file (the test suite locks both).

function classifyOntologyInline(filename, body) {
  const base = String(filename).toLowerCase().replace(/^.*[\\/]/, "");
  const b = String(body || "").toLowerCase();
  let kind = "fact";
  if (/^feedback[_-]/.test(base)) kind = "interpretation";
  let state = "current";
  // Body-side state classification is restricted to frontmatter-style
  // declarations only (status: deprecated). The earlier loose `[deprecated]`
  // body substring match misclassified legitimate memos that mention the
  // word in narrative context (e.g., "this is [deprecated] in favor of Y"
  // describing an OTHER thing, not the memo itself).  Filename-side keeps
  // its broader matching since filenames are authored, not narrative.
  if (/\[deprecated\]|\[stale\]|^deprecated[_-]/.test(base) || /^status:\s*deprecated/m.test(b)) {
    state = "deprecated";
  } else if (/^draft[_-]|[_-]draft[_-]|[_-]draft\.md$|[_-]wip[_-]|^wip[_-]|[_-]wip\.md$/.test(base) || /^status:\s*draft/m.test(b)) {
    state = "draft";
  }
  let visibility = "internal";
  if (/(^|[_-])(private|confidential|incident|secret)([_-]|\.md$)/.test(base) || /^visibility:\s*confidential/m.test(b)) {
    visibility = "confidential";
  }
  return { kind, state, visibility };
}

function formatOntologyInline(ont) {
  return [
    "ontology:",
    `  schemaVersion: 1.0.0`,
    `  kind: ${ont.kind}`,
    `  state: ${ont.state}`,
    `  visibility: ${ont.visibility}`,
  ].join("\n");
}

function hasOntologyBlock(content) {
  if (typeof content !== "string") return false;
  const t = content.replace(/^﻿/, "");
  if (!/^---\s*\n/.test(t)) return false;
  const end = t.indexOf("\n---", 4);
  if (end === -1) return false;
  const block = t.slice(4, end);
  // Column-0 only — matches the scanner regex in mergeOntologyInline so the
  // two functions agree on "ontology block exists" (P0-2 from scrutiny: a
  // nested `metadata:\n  ontology:` was previously detected here but missed
  // by merge → would have caused duplicate-block insertion).
  return /^ontology\s*:/m.test(block);
}

// State-machine merge — mirrors mergeIntoExistingFrontmatter in the schema.
// Splices out any existing `ontology:` block (between its line and the next
// top-level key) then injects `ontBlock` before the closing `---`.
function mergeOntologyInline(content, ontBlock) {
  const hasBom = content.startsWith("﻿");
  const body = hasBom ? content.slice(1) : content;
  if (!/^---\s*\n/.test(body)) {
    const fresh = `---\n${ontBlock}\n---\n${body}`;
    return hasBom ? "﻿" + fresh : fresh;
  }
  const endIdx = body.indexOf("\n---", 4);
  if (endIdx === -1) return content; // unterminated — bail without corrupting
  const existing = body.slice(4, endIdx);
  const rest = body.slice(endIdx + 4);
  const lines = existing.split("\n");
  let startLine = -1, endLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (startLine === -1) {
      if (/^ontology\s*:/.test(lines[i])) startLine = i;
      continue;
    }
    if (/^[A-Za-z][A-Za-z0-9_]*\s*:/.test(lines[i])) {
      endLine = i - 1;
      break;
    }
  }
  let cleaned = lines;
  if (startLine !== -1) {
    if (endLine === -1) endLine = lines.length - 1;
    cleaned = lines.slice(0, startLine).concat(lines.slice(endLine + 1));
  }
  const cleanExisting = cleaned
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
  const merged = `---\n${cleanExisting}${cleanExisting.length > 0 ? "\n" : ""}${ontBlock}\n---${rest}`;
  return hasBom ? "﻿" + merged : merged;
}

const VAULT_TARGET = "H:/prism/knowledge/memories";
const MCP_URL = process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp";
const EMBED_TIMEOUT_MS = 8_000;
const MEMORY_DIR_PATTERN = /[\\/]\.claude[\\/]projects[\\/][^\\/]*[\\/]memory[\\/]/i;

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_CLASSIFY_MODEL = process.env.OLLAMA_CLASSIFY_MODEL ?? "qwen2.5-coder:7b";
const OLLAMA_CLASSIFY_TIMEOUT_MS = 3_500;
const VALID_CATEGORIES = new Set([
  "feedback", "project", "reference", "user",
  "lessons", "decisions", "mistakes", "patterns", "inbox",
]);

const CATEGORY_PREFIXES = {
  feedback_: "feedback",
  project_: "project",
  user_: "user",
  reference_: "reference",
  mistakes_: "mistakes",
  mistake_: "mistakes",
  patterns_: "patterns",
  pattern_: "patterns",
  lesson_: "lessons",
  lessons_: "lessons",
  decision_: "decisions",
  decisions_: "decisions",
  inbox_: "inbox",
};

function categorize(filename) {
  const base = filename.toLowerCase();
  if (base === "memory.md") return "_index";
  for (const [prefix, cat] of Object.entries(CATEGORY_PREFIXES)) {
    if (base.startsWith(prefix)) return cat;
  }
  return "uncategorized";
}

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function readStdin() {
  try {
    const buf = readFileSync(0);
    if (buf.length === 0) return null;
    try { return JSON.parse(buf.toString("utf8")); } catch { return null; }
  } catch { return null; }
}

async function embedRemote(kind, id, text, metadata) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "prism_memory", arguments: { action: "remember", params: { kind, id, text, metadata } } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? "";
    try {
      const parsed = JSON.parse(inner);
      return { ok: parsed?.ok === true, reason: parsed?.error ?? null };
    } catch {
      return { ok: false, reason: "bad-inner-json" };
    }
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

async function categorizeViaOllama(content, filename) {
  // Strip frontmatter + truncate so the prompt stays small (qwen2.5-coder:7b is fast on short inputs).
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, "").slice(0, 1_500);
  const prompt =
    `Classify this memory note into ONE category. Reply with ONLY the category word, nothing else.\n\n` +
    `Categories:\n` +
    `- feedback: rules/preferences user gave (e.g. "always use X", "never do Y")\n` +
    `- project: ongoing work, milestones, who is doing what, deadlines\n` +
    `- reference: pointers to where info lives (URLs, file paths, dashboards, system maps)\n` +
    `- user: facts about who the user is, their role, expertise, goals\n` +
    `- lessons: things learned the hard way; post-mortem insights\n` +
    `- decisions: choices made between alternatives, with rationale\n` +
    `- mistakes: errors to avoid repeating, with cause + fix\n` +
    `- patterns: recurring shapes/structures seen across the system\n` +
    `- inbox: ungrouped raw capture not yet processed\n\n` +
    `Filename: ${filename}\n\n` +
    `Body:\n${body}\n\n` +
    `Category (one word):`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OLLAMA_CLASSIFY_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_CLASSIFY_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 8 },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { cat: null, reason: `HTTP ${res.status}` };
    const body = await res.json();
    const raw = String(body?.response ?? "").trim().toLowerCase();
    // Match the first valid category word in the response (defends against verbose models)
    const match = raw.match(/\b(feedback|project|reference|user|lessons?|decisions?|mistakes?|patterns?|inbox)\b/);
    if (!match) return { cat: null, reason: `unparseable: ${raw.slice(0, 40)}` };
    let normalized = match[1];
    // singular → plural where the vault dir uses plural
    if (normalized === "lesson") normalized = "lessons";
    if (normalized === "decision") normalized = "decisions";
    if (normalized === "mistake") normalized = "mistakes";
    if (normalized === "pattern") normalized = "patterns";
    if (!VALID_CATEGORIES.has(normalized)) return { cat: null, reason: `invalid: ${normalized}` };
    return { cat: normalized, reason: null };
  } catch (e) {
    clearTimeout(timer);
    return { cat: null, reason: e?.name === "AbortError" ? "timeout" : (e?.message ?? String(e)) };
  }
}

async function main() {
  const input = readStdin();
  if (!input) { console.log(JSON.stringify({ continue: true })); return; }
  const tool = input.tool_name ?? input.toolName ?? "";
  if (!["Write", "Edit", "MultiEdit"].includes(tool)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const filePath = String(input.tool_input?.file_path ?? input.tool_input?.filePath ?? "").replace(/\\/g, "/");
  if (!filePath || !MEMORY_DIR_PATTERN.test(filePath.replace(/\//g, "\\"))) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  if (!existsSync(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const filename = basename(filePath);
  if (!filename.endsWith(".md")) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let content;
  try { content = readFileSync(filePath, "utf8"); }
  catch (e) {
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `memory-mirror: read failed (${e?.message ?? e})` } }));
    return;
  }

  let cat = categorize(filename);
  let classifierNote = "";
  // If filename prefix didn't match a category, ask Ollama to classify by content.
  // This is what populates lessons/, decisions/, mistakes/, patterns/ when the
  // user's auto-memory protocol only generates 4 prefix types.
  if (cat === "uncategorized" && process.env.PRISM_MEMORY_CLASSIFIER !== "0") {
    const result = await categorizeViaOllama(content, filename);
    if (result.cat) {
      cat = result.cat;
      classifierNote = ` (ollama→${cat})`;
    } else {
      classifierNote = ` (ollama-skip:${result.reason})`;
    }
  }

  const targetDir = join(VAULT_TARGET, cat);
  const targetPath = join(targetDir, filename);
  ensureDir(targetDir);

  // Provenance injection (D1 — OBSIDIAN-INTELLIGENCE-MS3).
  // Prepend the YAML provenance frontmatter when the file doesn't already
  // have one. Live mirror only adds provenance to UNFRONTMATTERED memos;
  // memos that already carry their own frontmatter are deferred to the
  // backfill script (which can do a structural merge with Zod validation).
  let contentToWrite = content;
  let provenanceNote = "";
  try {
    const sid = String(input?.session_id ?? input?.sessionId ?? "");
    const eightHex = sid.slice(0, 8);
    const agent = /^[0-9a-f]{8}$/i.test(eightHex) ? `claude-${eightHex}` : null;
    if (!agent || sid.length < 8) {
      provenanceNote = ` (prov-skip:no-sid)`;
    } else if (contentHasFrontmatter(content)) {
      provenanceNote = ` (prov-defer:fm-exists)`;
    } else {
      const built = {
        schemaVersion: MEMORY_PROVENANCE_SCHEMA_VERSION_INLINE,
        agent,
        sessionId: sid,
        writeEvent: tool,
        writtenAt: new Date().toISOString(),
        category: cat,
        sourceTool: "memory-mirror-to-vault",
        machine: hostname(),
      };
      const block = formatProvenanceInline(built);
      // Strip BOM from content before prepending — otherwise the BOM ends up
      // stranded between the closing `---` and the body (scrutiny P0-1).
      const contentNoBom = content.startsWith("﻿") ? content.slice(1) : content;
      contentToWrite = block + contentNoBom;
      provenanceNote = ` +prov(${agent})`;
    }
  } catch (e) {
    provenanceNote = ` (prov-error:${e?.message ?? "unknown"})`;
  }

  // Ontology injection (D2 — OBSIDIAN-INTELLIGENCE-MS3).
  // Soft-launch: always inject inferred ontology when missing (no env gate,
  // matches the "warn-only by default" decision in the engine until backfill
  // covers all legacy memos). Existing ontology blocks are KEPT as-is —
  // never overwrite a memo's own classification.
  let ontologyNote = "";
  try {
    if (hasOntologyBlock(contentToWrite)) {
      ontologyNote = ` (ont-kept)`;
    } else {
      const inferred = classifyOntologyInline(filename, content);
      const ontBlock = formatOntologyInline(inferred);
      contentToWrite = mergeOntologyInline(contentToWrite, ontBlock);
      ontologyNote = ` +ont(${inferred.kind}/${inferred.state}/${inferred.visibility})`;
    }
  } catch (e) {
    ontologyNote = ` (ont-error:${e?.message ?? "unknown"})`;
  }

  try { writeFileSync(targetPath, contentToWrite); }
  catch (e) {
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `memory-mirror: write failed (${e?.message ?? e})` } }));
    return;
  }

  const embedResult = await embedRemote("note", `${cat}/${filename}`, contentToWrite.slice(0, 16_384), { source: "memory-mirror", category: cat, filename });
  const status = embedResult.ok ? "ok" : `embed-skip(${embedResult.reason ?? "unknown"})`;
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `memory-mirror: ${cat}/${filename}${classifierNote}${provenanceNote}${ontologyNote} → vault, embed=${status}`,
    },
  }));
}

main().catch((e) => {
  // Never block — log to stderr, return continue:true
  process.stderr.write(`memory-mirror error: ${e?.message ?? e}\n`);
  console.log(JSON.stringify({ continue: true }));
});
