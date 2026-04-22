#!/usr/bin/env node
/**
 * per-agent-handoff.mjs — Per-Terminal Handoff & Pickup Queue System
 *
 * Solves: multiple Claude/Codex terminals clobbering a single HANDOFF.md
 * when they compact or stop simultaneously.
 *
 * Design:
 *   - Each terminal writes its own handoff: state/shared/handoffs/HANDOFF-{instance}.md
 *   - On stop, unfinished work moves to state/shared/PICKUP_QUEUE.md
 *   - On startup, terminal reads its own handoff + shows pickup queue items
 *   - Old handoffs from dead terminals become pickup items after staleness threshold
 *
 * Commands:
 *   write   --resume "..." --state "..." --context "..."   Write per-agent handoff
 *   read    [--agent <instance>]                           Read own or specific handoff
 *   stop    --resume "..." --state "..."                   Write handoff + queue orphans
 *   pickup  [--claim <item-id>] [--complete <item-id>]     List/claim/complete queue items
 *   list                                                   List all handoff files
 *   gc      [--stale-hours 6]                              Archive stale handoffs to queue
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { inferAgentIdentity } from "./agent-identity.mjs";

// Atomic write helper — tmp + rename pattern mirrors src/utils/atomicWrite.ts
// Required because 6+ concurrent Claude terminals + 1 Codex chat can otherwise
// interleave bytes on shared state files. See state/shared/HOOK_STATIC_AUDIT.json
// and CONTEXT-PIPELINE-PERFECTION-RGS.md CPP-MS1 for rationale.
function atomicWriteSync(filePath, data, encoding = "utf-8") {
  const tmpPath = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(tmpPath, data, encoding);
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch { /* tmp may not exist */ }
    throw err;
  }
}

const HANDOFFS_DIR = path.resolve("H:/prism/state/shared/handoffs");
const PICKUP_QUEUE = path.resolve("H:/prism/state/shared/PICKUP_QUEUE.json");
const PICKUP_QUEUE_MD = path.resolve("H:/prism/state/shared/PICKUP_QUEUE.md");
const LEGACY_HANDOFF = path.resolve("H:/prism/state/HANDOFF.md");
const SESSION_ID_FILE = path.resolve("H:/prism/state/shared/handoffs/.current-session-ids.json");
const STALE_HOURS_DEFAULT = 6;

// ── Session ID Management ────────────────────────────────────────
// Since hook processes get new PIDs each invocation, we need a stable
// session ID. The `register` command creates one at startup. The stop/
// compact hooks read it back using the terminal name passed via --terminal.

function loadSessionIds() {
  try { return JSON.parse(fs.readFileSync(SESSION_ID_FILE, "utf-8")); } catch { return {}; }
}

function saveSessionIds(ids) {
  fs.mkdirSync(path.dirname(SESSION_ID_FILE), { recursive: true });
  atomicWriteSync(SESSION_ID_FILE, JSON.stringify(ids, null, 2) + "\n");
}

function registerSession(terminalName, family) {
  const ids = loadSessionIds();
  const key = terminalName || `terminal-${crypto.randomUUID().slice(0, 8)}`;
  if (!ids[key]) {
    ids[key] = {
      id: `${family}-${key}`,
      family,
      terminal: key,
      created_at: now(),
      last_active: now(),
    };
  }
  ids[key].last_active = now();
  saveSessionIds(ids);
  return ids[key];
}

function getSessionId(terminalName) {
  const ids = loadSessionIds();
  return ids[terminalName] ?? null;
}

function removeSessionId(terminalName) {
  const ids = loadSessionIds();
  delete ids[terminalName];
  saveSessionIds(ids);
}

// ── Helpers ──────────────────────────────────────────────────────

function ensureDirs() {
  fs.mkdirSync(HANDOFFS_DIR, { recursive: true });
}

function sanitizeFilename(instance) {
  return instance.replace(/[^a-zA-Z0-9._@-]/g, "_").replace(/_+/g, "_");
}

function handoffPath(instance) {
  return path.join(HANDOFFS_DIR, `HANDOFF-${sanitizeFilename(instance)}.md`);
}

function now() {
  return new Date().toISOString();
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  atomicWriteSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function safeWrite(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  atomicWriteSync(filePath, content, "utf-8");
}

// Reject placeholder / boolean-flag values so a bare `--resume` (parsed as
// literal `true`) never lands as "## RESUME\ntrue" in the handoff file.
// Mirror of PLACEHOLDER_RESUMES in precompact-handoff.mjs.
const PLACEHOLDER_VALUES = new Set([
  "true",
  "false",
  "unknown",
  "null",
  "undefined",
  "",
  "compacting — read per-agent handoff on restore",
  "compacting — read per-agent handoff on restore.",
  "Check git log and roadmap for next steps.",
]);

function sanitizeResume(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s.length === 0) return null;
  if (PLACEHOLDER_VALUES.has(s)) return null;
  if (s.length < 10) return null; // arbitrary min; real resumes are phrase-length
  return s;
}

// ── Pickup Queue ─────────────────────────────────────────────────

function loadQueue() {
  return readJSON(PICKUP_QUEUE) ?? { items: [], version: 1 };
}

function saveQueue(queue) {
  writeJSON(PICKUP_QUEUE, queue);
  renderQueueMarkdown(queue);
}

function renderQueueMarkdown(queue) {
  const lines = [
    "# Pickup Queue",
    `Updated: ${now()}`,
    "",
    "Orphaned work from stopped terminals. Any terminal can claim these.",
    "",
  ];

  const available = queue.items.filter((i) => i.status === "available");
  const claimed = queue.items.filter((i) => i.status === "claimed");
  const completed = queue.items.filter((i) => i.status === "completed");

  if (available.length > 0) {
    lines.push(`## Available (${available.length})`, "");
    for (const item of available) {
      lines.push(`- **${item.id}** [${item.source_family}] ${item.summary}`);
      if (item.resume) lines.push(`  Resume: ${item.resume}`);
      lines.push(`  From: ${item.source_instance} | Stopped: ${item.created_at}`);
      lines.push("");
    }
  }

  if (claimed.length > 0) {
    lines.push(`## Claimed (${claimed.length})`, "");
    for (const item of claimed) {
      lines.push(`- **${item.id}** [${item.source_family}] ${item.summary}`);
      lines.push(`  Claimed by: ${item.claimed_by} at ${item.claimed_at}`);
      lines.push("");
    }
  }

  if (completed.length > 0) {
    lines.push(`## Recently Completed (${completed.length})`, "");
    for (const item of completed.slice(-5)) {
      lines.push(`- ~~${item.id}~~ ${item.summary} — done by ${item.completed_by}`);
    }
    lines.push("");
  }

  if (queue.items.length === 0) {
    lines.push("*No orphaned work. All terminals have active handoffs.*", "");
  }

  lines.push(`---`, `Total: ${queue.items.length} | Available: ${available.length} | Claimed: ${claimed.length}`);
  safeWrite(PICKUP_QUEUE_MD, lines.join("\n") + "\n");
}

function addToQueue(item) {
  const queue = loadQueue();
  // Dedup by source_instance — replace if exists
  queue.items = queue.items.filter(
    (i) => i.source_instance !== item.source_instance || i.status !== "available"
  );
  queue.items.push(item);
  saveQueue(queue);
  return item;
}

// ── Commands ─────────────────────────────────────────────────────

function cmdWrite(identity, args) {
  ensureDirs();
  const filePath = handoffPath(identity.instance);

  // Preserve any existing meaningful RESUME if the caller only passed a
  // placeholder (bare --resume flag → true, "unknown", "", etc.).
  // This is the anti-clobber that stops per-hook fires from overwriting
  // a good resume with "true".
  const cleanResume = sanitizeResume(args.resume);
  let finalResume = cleanResume;
  if (!finalResume && fs.existsSync(filePath)) {
    try {
      const prior = fs.readFileSync(filePath, "utf-8");
      const m = prior.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
      const priorResume = sanitizeResume(m?.[1]);
      if (priorResume) finalResume = priorResume;
    } catch { /* fall through to default */ }
  }
  if (!finalResume) finalResume = "Check git log and roadmap for next steps.";

  const cleanState = sanitizeResume(args.state) || args.state || "No state provided.";

  const content = [
    `# HANDOFF: ${identity.instance}`,
    `Updated: ${now()}`,
    `Family: ${identity.family} | Machine: ${identity.machine} | Session: ${identity.sessionKey}`,
    "",
    "## STATE",
    cleanState,
    "",
    "## RESUME",
    finalResume,
    "",
    "## CONTEXT",
    args.context || "",
    "",
  ].join("\n");

  safeWrite(filePath, content);

  // Write legacy HANDOFF.md as INDEX of all active per-session handoffs
  // Each session gets its own file — HANDOFF.md is just the directory
  try {
    const allHandoffs = fs.readdirSync(HANDOFFS_DIR)
      .filter((f) => f.startsWith("HANDOFF-") && f.endsWith(".md"))
      .map((f) => {
        const fp = path.join(HANDOFFS_DIR, f);
        const stat = fs.statSync(fp);
        const ageMin = Math.round((Date.now() - stat.mtimeMs) / 60000);
        const content = fs.readFileSync(fp, "utf-8");
        const resumeMatch = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
        const stateMatch = content.match(/## STATE\n([\s\S]*?)(?=\n##|\n$)/);
        return {
          file: f,
          path: fp,
          age: ageMin,
          state: stateMatch?.[1]?.trim()?.split("\n")[0] || "unknown",
          resume: resumeMatch?.[1]?.trim()?.split("\n")[0] || "unknown",
        };
      })
      .sort((a, b) => a.age - b.age); // most recent first

    const legacyLines = [
      `# HANDOFF INDEX — ${now()}`,
      `## ${allHandoffs.length} active session handoffs`,
      "",
      "Each Claude/Codex session writes its own handoff file.",
      "Read YOUR session's file for context, not this index.",
      "",
      `## THIS SESSION: ${identity.instance}`,
      `File: ${filePath}`,
      `State: ${cleanState}`,
      `Resume: ${finalResume}`,
      "",
      "## ALL ACTIVE SESSIONS",
      "",
    ];
    for (const h of allHandoffs) {
      const fresh = h.age < 60 ? "FRESH" : h.age < 360 ? `${h.age}m ago` : `${Math.round(h.age / 60)}h ago`;
      legacyLines.push(`- **${h.file}** [${fresh}] — ${h.state}`);
      legacyLines.push(`  Resume: ${h.resume}`);
    }
    legacyLines.push("", "---", `> All handoffs: H:/prism/state/shared/handoffs/`);
    legacyLines.push(`> Pickup queue: H:/prism/state/shared/PICKUP_QUEUE.md`);
    safeWrite(LEGACY_HANDOFF, legacyLines.join("\n") + "\n");
  } catch {
    // Fallback: simple legacy write (uses already-sanitized values)
    const legacyContent = [
      `# HANDOFF: ${now()} — ${identity.family}@${identity.machine}`,
      "",
      "## STATE",
      cleanState,
      "",
      "## RESUME",
      finalResume,
      "",
      `> Per-agent handoff: ${filePath}`,
      `> All handoffs: H:/prism/state/shared/handoffs/`,
    ].join("\n");
    safeWrite(LEGACY_HANDOFF, legacyContent);
  }

  return { ok: true, file: filePath, instance: identity.instance };
}

function cmdRead(identity, args) {
  ensureDirs();
  const targetInstance = args.agent || identity.instance;
  const filePath = handoffPath(targetInstance);

  if (fs.existsSync(filePath)) {
    return { ok: true, content: fs.readFileSync(filePath, "utf-8"), file: filePath, matchedBy: "exact" };
  }

  // Fallback chain: (1) fuzzy name match, (2) most recent by family, (3) most recent overall
  const files = fs.readdirSync(HANDOFFS_DIR)
    .filter((f) => f.startsWith("HANDOFF-") && f.endsWith(".md"));

  // (1) Fuzzy: instance substring match
  const fuzzyKey = targetInstance.toLowerCase().replace(/[@/]/g, "_");
  const fuzzy = files.find((f) => f.toLowerCase().includes(fuzzyKey));
  if (fuzzy) {
    return { ok: true, content: fs.readFileSync(path.join(HANDOFFS_DIR, fuzzy), "utf-8"), file: fuzzy, matchedBy: "fuzzy" };
  }

  // (2) + (3) Sort by mtime, pick most recent within family; else most recent overall
  const family = (identity.family || "Claude").toLowerCase();
  const withStats = files.map((f) => {
    const fp = path.join(HANDOFFS_DIR, f);
    return { file: f, path: fp, mtime: fs.statSync(fp).mtimeMs };
  }).sort((a, b) => b.mtime - a.mtime);

  const familyMatch = withStats.find((h) => h.file.toLowerCase().includes(family));
  if (familyMatch) {
    const ageMin = Math.round((Date.now() - familyMatch.mtime) / 60000);
    return {
      ok: true,
      content: fs.readFileSync(familyMatch.path, "utf-8"),
      file: familyMatch.file,
      matchedBy: "family-latest",
      age_minutes: ageMin,
      fallback_note: `Targeted instance '${targetInstance}' not found. Using most recent handoff for family '${identity.family}' (${ageMin}m old).`,
    };
  }

  if (withStats.length > 0) {
    const latest = withStats[0];
    const ageMin = Math.round((Date.now() - latest.mtime) / 60000);
    return {
      ok: true,
      content: fs.readFileSync(latest.path, "utf-8"),
      file: latest.file,
      matchedBy: "global-latest",
      age_minutes: ageMin,
      fallback_note: `No handoff for '${targetInstance}'. Using most recent overall (${latest.file}, ${ageMin}m old).`,
    };
  }

  return { ok: false, error: `No handoff found for ${targetInstance}`, available: files };
}

function cmdLatest(identity, args) {
  // Return the most recent handoff, optionally filtered by family
  ensureDirs();
  const family = (args.family || identity.family || "").toLowerCase();
  const files = fs.readdirSync(HANDOFFS_DIR)
    .filter((f) => f.startsWith("HANDOFF-") && f.endsWith(".md"))
    .map((f) => {
      const fp = path.join(HANDOFFS_DIR, f);
      return { file: f, path: fp, mtime: fs.statSync(fp).mtimeMs };
    });

  const filtered = family ? files.filter((h) => h.file.toLowerCase().includes(family)) : files;
  if (filtered.length === 0) {
    return { ok: false, error: `No handoffs found${family ? ` for family ${family}` : ""}`, total: files.length };
  }
  filtered.sort((a, b) => b.mtime - a.mtime);
  const latest = filtered[0];
  const ageMin = Math.round((Date.now() - latest.mtime) / 60000);
  return {
    ok: true,
    content: fs.readFileSync(latest.path, "utf-8"),
    file: latest.file,
    age_minutes: ageMin,
    total_candidates: filtered.length,
  };
}

function cmdStop(identity, args) {
  // Write per-agent handoff
  const writeResult = cmdWrite(identity, args);

  // Add unfinished work to pickup queue if resume is non-trivial
  const resume = typeof args.resume === "string" ? args.resume : String(args.resume || "");
  const state = typeof args.state === "string" ? args.state : String(args.state || "");
  if (resume.trim().length > 10) {
    const item = {
      id: `PQ-${Date.now().toString(36)}`,
      source_instance: identity.instance,
      source_family: identity.family,
      source_machine: identity.machine,
      summary: state.split("\n")[0].slice(0, 200) || "Unfinished work from stopped terminal",
      resume: resume.slice(0, 500),
      status: "available",
      created_at: now(),
      handoff_file: writeResult.file,
    };
    addToQueue(item);
    return { ok: true, handoff: writeResult, queued: item };
  }

  return { ok: true, handoff: writeResult, queued: null };
}

function cmdPickup(identity, args) {
  const queue = loadQueue();

  if (args.claim) {
    const item = queue.items.find((i) => i.id === args.claim && i.status === "available");
    if (!item) return { ok: false, error: `Item ${args.claim} not found or not available` };
    item.status = "claimed";
    item.claimed_by = identity.instance;
    item.claimed_at = now();
    saveQueue(queue);
    return { ok: true, claimed: item };
  }

  if (args.complete) {
    const item = queue.items.find((i) => i.id === args.complete);
    if (!item) return { ok: false, error: `Item ${args.complete} not found` };
    item.status = "completed";
    item.completed_by = identity.instance;
    item.completed_at = now();
    saveQueue(queue);
    return { ok: true, completed: item };
  }

  // List available items
  const available = queue.items.filter((i) => i.status === "available");
  return { ok: true, available, total: queue.items.length };
}

function cmdList() {
  ensureDirs();
  const files = fs.readdirSync(HANDOFFS_DIR).filter((f) => f.startsWith("HANDOFF-"));
  const handoffs = files.map((f) => {
    const filePath = path.join(HANDOFFS_DIR, f);
    const stat = fs.statSync(filePath);
    const ageHours = (Date.now() - stat.mtimeMs) / 3_600_000;
    return {
      file: f,
      instance: f.replace("HANDOFF-", "").replace(".md", "").replace(/_/g, "/"),
      modified: stat.mtime.toISOString(),
      age_hours: Math.round(ageHours * 10) / 10,
      stale: ageHours > STALE_HOURS_DEFAULT,
    };
  });
  return { ok: true, handoffs, count: handoffs.length };
}

function cmdGC(args) {
  const staleHours = args.staleHours || STALE_HOURS_DEFAULT;
  const list = cmdList();
  const archived = [];

  for (const h of list.handoffs) {
    if (h.age_hours > staleHours) {
      // Read the handoff and extract resume
      const filePath = path.join(HANDOFFS_DIR, h.file);
      const content = fs.readFileSync(filePath, "utf-8");
      const resumeMatch = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
      const stateMatch = content.match(/## STATE\n([\s\S]*?)(?=\n##|\n$)/);

      const resume = resumeMatch?.[1]?.trim() || "";
      const state = stateMatch?.[1]?.trim() || "";

      if (resume.length > 10) {
        addToQueue({
          id: `PQ-gc-${Date.now().toString(36)}`,
          source_instance: h.instance,
          source_family: h.instance.split("@")[0] || "unknown",
          source_machine: "unknown",
          summary: `[STALE ${Math.round(h.age_hours)}h] ${state.split("\n")[0].slice(0, 150)}`,
          resume: resume.slice(0, 500),
          status: "available",
          created_at: now(),
          handoff_file: filePath,
        });
        archived.push(h.file);
      }

      // Move to archive
      const archiveDir = path.join(HANDOFFS_DIR, "archive");
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(filePath, path.join(archiveDir, h.file));
      archived.push(h.file);
    }
  }

  return { ok: true, archived, stale_threshold_hours: staleHours };
}

// ── CLI ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  let cmd = null;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!cmd && !arg.startsWith("--")) {
      cmd = arg;
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return { cmd, args };
}

const { cmd, args } = parseArgs(process.argv);

// Resolve identity: prefer --terminal for stable cross-invocation identity
let identity;
if (args.terminal) {
  const session = getSessionId(args.terminal);
  if (session) {
    identity = {
      family: session.family,
      machine: process.env.COMPUTERNAME || "machine",
      sessionKey: session.terminal,
      instance: session.id,
    };
  }
}
if (!identity) {
  identity = inferAgentIdentity({
    agent: args.agent,
    family: args.agentFamily,
    instance: args.agentInstance,
  });
}

let result;
switch (cmd) {
  case "register": {
    // Called at session startup to create a stable session ID
    const family = args.agentFamily || identity.family || "Claude";
    const terminal = args.terminal || args.name || `t-${Date.now().toString(36)}`;
    const session = registerSession(terminal, family);
    result = { ok: true, session, identity: { ...identity, instance: session.id, sessionKey: session.terminal } };
    break;
  }
  case "unregister": {
    const terminal = args.terminal || identity.sessionKey;
    removeSessionId(terminal);
    result = { ok: true, removed: terminal };
    break;
  }
  case "write":
    result = cmdWrite(identity, args);
    break;
  case "read":
    result = cmdRead(identity, args);
    break;
  case "latest":
    result = cmdLatest(identity, args);
    break;
  case "stop":
    result = cmdStop(identity, args);
    break;
  case "pickup":
    result = cmdPickup(identity, args);
    break;
  case "list":
    result = cmdList();
    break;
  case "gc":
    result = cmdGC(args);
    break;
  default:
    result = {
      ok: false,
      error: `Unknown command: ${cmd}`,
      usage: [
        "per-agent-handoff.mjs <command> [options]",
        "",
        "Commands:",
        "  register  --terminal <name> [--agent-family Claude|Codex]   Register terminal (startup)",
        "  write     --terminal <name> --resume '...' --state '...'    Write per-agent handoff",
        "  read      [--terminal <name>|--agent <instance>]            Read handoff (with latest-fallback)",
        "  latest    [--family Claude|Codex]                           Read most recent handoff (by mtime)",
        "  stop      --terminal <name> --resume '...' --state '...'    Write handoff + queue orphans",
        "  pickup    [--claim <id>] [--complete <id>]                  List/claim/complete queue items",
        "  list                                                        List all handoff files",
        "  gc        [--stale-hours 6]                                 Archive stale handoffs",
        "  unregister --terminal <name>                                Remove terminal registration",
      ].join("\n"),
      identity,
    };
}

console.log(JSON.stringify(result));
