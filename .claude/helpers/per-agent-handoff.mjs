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
import { isatty } from "node:tty";
import { inferAgentIdentity } from "./agent-identity.mjs";
import { deriveSessionTopic } from "./derive-session-topic.mjs";

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

// HANDOFFS_DIR is overridable via PRISM_HANDOFFS_DIR env for test isolation —
// production callers leave it unset (defaults to canonical state/shared/handoffs).
const HANDOFFS_DIR = process.env.PRISM_HANDOFFS_DIR
  ? path.resolve(process.env.PRISM_HANDOFFS_DIR)
  : path.resolve("H:/prism/state/shared/handoffs");
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
    // CRITICAL: Don't double-prefix. If terminal already starts with "claude-",
    // use it directly as the instance ID. This prevents collision between:
    //   - HANDOFF-Claude-claude-9bccf61e.md (double-prefixed)
    //   - HANDOFF-claude-9bccf61e.md (direct from stable-session-id.mjs)
    const instanceId = key.startsWith("claude-") || key.startsWith("codex-")
      ? key
      : `${family}-${key}`;
    ids[key] = {
      id: instanceId,
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

function sanitizeTopic(topic) {
  if (!topic) return null;
  return topic.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 20);
}

function handoffPath(instance, topic = null) {
  const base = sanitizeFilename(instance);
  const topicSuffix = sanitizeTopic(topic) ? `-${sanitizeTopic(topic)}` : "";
  return path.join(HANDOFFS_DIR, `HANDOFF-${base}${topicSuffix}.md`);
}

// U-CLEANUP-A4 (2026-05-13): when the live chat is the hygiene slot (golf),
// it writes its handoff as HANDOFF-golf-<task>.md rather than the regular
// HANDOFF-<claude-id>-<topic>.md. Rationale: hygiene work is *slot-keyed*,
// not instance-keyed — operators looking for "what is the cleanup chat
// doing right now" want HANDOFF-golf-<task>.md, not a stable-session-id
// they have to map back to a slot. Only the literal "golf" slot remaps;
// alpha..foxtrot work slots stay instance-keyed because multiple distinct
// chat-ids can rotate through a work slot over a multi-day milestone and
// each handoff is the authoritative continuation for THAT chat-id, not
// the slot. Returns the canonical filename base to feed into handoffPath().
function resolveHandoffBase(identity, args) {
  const slot = (args?.slot || "").toString().trim().toLowerCase();
  if (slot === "golf") return "golf";
  return identity.instance;
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

// Writers banned to live chat ONLY (with one strictly-gated exception below).
// Hooks (PreCompact auto-writer) and subagents (Agent-spawned) produced
// generic stubs like "Pre-compact snapshot (RESUME generated)" that clobbered
// the meaningful RESUME directives the live chat had crafted. After /compact,
// /startup would read these stubs and have no idea what the chat was actually
// doing. User feedback 2026-05-06: "ban handlers and subagents from writing
// handoffs. live chat claude needs to handle it, we always have issues with
// per agent handoffs being generics and stubs". The /precompact and /handoff
// skills (run by the live chat) pass --source live-chat explicitly.
//
// EXCEPTION (2026-05-15, /compact-auto-precompact directive):
// --source precompact-hook is accepted ONLY when ALL of:
//   (a) resume is non-empty and not a known placeholder
//   (b) resume.length >= 30 (real content, not a stub)
//   (c) the target handoff file does NOT have a fresh live-chat RESUME within
//       the last 5 minutes (anti-clobber — never overwrite real /precompact)
// The hook still writes a slot-prefixed handoff so /startup can resume. If
// the live chat ran /precompact this session, that RESUME is preserved.
const PLACEHOLDER_RESUMES_FOR_GATE = new Set([
  "",
  "true",
  "unknown",
  "compacting",
  "compacting — read per-agent handoff on restore",
  "compacting - read per-agent handoff on restore",
  "check git log and roadmap for next steps.",
  "pre-compact snapshot (resume generated)",
]);

/**
 * Scan ALL handoff files for the given instance and return true if ANY
 * carries a meaningful (non-placeholder, >=30 chars) RESUME written within
 * the last `maxAgeMin` minutes. This is topic-agnostic — closes the
 * topic-mismatch hole scrutiny caught (a hook writing under topic A could
 * silently shadow a real /precompact RESUME under topic B).
 */
function anyFreshLiveChatHandoffForInstance(instance, maxAgeMin = 5) {
  try {
    if (!fs.existsSync(HANDOFFS_DIR)) return false;
    const safeInstance = sanitizeFilename(instance);
    const prefix = `HANDOFF-${safeInstance}`;
    const now = Date.now();
    const cutoff = now - maxAgeMin * 60_000;
    for (const f of fs.readdirSync(HANDOFFS_DIR)) {
      if (!f.startsWith(prefix) || !f.endsWith(".md")) continue;
      const fp = path.join(HANDOFFS_DIR, f);
      try {
        const st = fs.statSync(fp);
        if (st.mtimeMs < cutoff) continue;
        const content = fs.readFileSync(fp, "utf-8");
        const m = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
        if (!m) continue;
        const resume = (m[1] || "").trim();
        if (resume.length < 30) continue;
        if (PLACEHOLDER_RESUMES_FOR_GATE.has(resume.toLowerCase())) continue;
        return true;
      } catch { /* skip unreadable */ }
    }
    return false;
  } catch { return false; }
}

function isLiveChatSource(args) {
  const src = (args.source || "").toString().trim().toLowerCase();
  return src === "live-chat";
}

function isPrecompactHookSource(args) {
  const src = (args.source || "").toString().trim().toLowerCase();
  return src === "precompact-hook";
}

function precompactHookResumeIsValid(args) {
  const r = (args.resume || "").toString().trim();
  if (!r) return false;
  if (r.length < 30) return false;
  if (PLACEHOLDER_RESUMES_FOR_GATE.has(r.toLowerCase())) return false;
  return true;
}

function freshLiveChatHandoffExists(identity, args, maxAgeMin = 5) {
  try {
    const base = resolveHandoffBase(identity, args);
    const file = handoffPath(base, args.topic);
    if (!fs.existsSync(file)) return false;
    const ageMin = (Date.now() - fs.statSync(file).mtimeMs) / 60_000;
    if (ageMin > maxAgeMin) return false;
    const content = fs.readFileSync(file, "utf-8");
    // Heuristic: any RESUME section length >= 30 chars that isn't a placeholder
    const m = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
    if (!m) return false;
    const resume = (m[1] || "").trim();
    if (resume.length < 30) return false;
    if (PLACEHOLDER_RESUMES_FOR_GATE.has(resume.toLowerCase())) return false;
    return true;
  } catch { return false; }
}

function rejectNonLiveChat(args, op, identity) {
  if (isLiveChatSource(args)) return null;
  // Precompact-hook exception — strict validation
  if (op === "write" && isPrecompactHookSource(args)) {
    if (!precompactHookResumeIsValid(args)) {
      return {
        ok: false,
        error: "writer_banned",
        op,
        rejectedBy: "precompact-hook-validation",
        message:
          "--source precompact-hook requires a non-placeholder resume of >=30 chars. " +
          "Got: " + JSON.stringify(((args.resume || "") + "").slice(0, 60)),
      };
    }
    // Topic-agnostic anti-clobber: scan ALL handoffs for this instance, not
    // just the topic the hook computed. Closes the scrutiny-caught hole where
    // a hook writing under topic A could shadow a real /precompact RESUME
    // under topic B for the same chat instance.
    if (identity && anyFreshLiveChatHandoffForInstance(identity.instance, 5)) {
      return {
        ok: false,
        error: "writer_banned",
        op,
        rejectedBy: "fresh-live-chat-resume-exists",
        message:
          "Fresh /precompact handoff already exists (<5min old) with a real RESUME " +
          "somewhere under this instance. Hook write skipped to avoid clobbering live-chat directive.",
      };
    }
    return null; // accepted via the strictly-gated exception
  }
  return {
    ok: false,
    error: "writer_banned",
    op,
    message:
      "Per-agent handoffs may be written ONLY by the live Claude chat. " +
      "Hooks (PreCompact auto-writer) and subagents are banned — they produce " +
      "generic stubs that overwrite real RESUME directives. To write a handoff, " +
      "have the LIVE chat run /precompact or /handoff (those skills pass " +
      "--source live-chat explicitly). See memory: feedback_handoff_writers.md. " +
      "PreCompact hooks may use --source precompact-hook with strict validation.",
  };
}

function cmdWrite(identity, args) {
  const banned = rejectNonLiveChat(args, "write", identity);
  if (banned) return banned;
  ensureDirs();
  // SAFETY NET: auto-derive topic when caller omits --topic. Prevents bare-named
  // HANDOFF-{id}.md files from accumulating and being picked up by /startup's
  // exact-match read. The rogue session-handoff-auto.mjs hook used to write
  // bare files; this catches any future regression of that class. Topic
  // derivation has its own fallback chain (manual handoff > state marker >
  // auto handoff > git/branch). If none resolve, topic stays null and we
  // fall through to bare path (legitimate edge case).
  let effectiveTopic = args.topic;
  if (!effectiveTopic) {
    try {
      const derived = deriveSessionTopic(identity.instance);
      if (derived?.topic) effectiveTopic = derived.topic;
    } catch { /* deriveSessionTopic must never throw, but defensive */ }
  }
  const handoffBase = resolveHandoffBase(identity, args);
  const filePath = handoffPath(handoffBase, effectiveTopic);

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

  // PRISM-STAB-MS0/U-B5 (2026-05-09): Obsidian-friendly YAML frontmatter.
  // The knowledge/handoffs/ NTFS junction maps to state/shared/handoffs/, so
  // Obsidian sees these files natively. Frontmatter gives backlinks, search,
  // and graph view by session/topic/status.
  const slotTag = (args?.slot || "").toString().trim().toLowerCase();
  const isGolf = slotTag === "golf";
  const frontmatter = [
    "---",
    `session: ${identity.instance}`,
    `topic: ${effectiveTopic || ""}`,
    // Slot keying: only "golf" remaps the filename base (U-CLEANUP-A4).
    // alpha..foxtrot work chats stay instance-keyed (slot field empty).
    `slot: ${isGolf ? "golf" : ""}`,
    `written_at: ${now()}`,
    `machine: ${identity.machine}`,
    `family: ${identity.family}`,
    `session_key: ${identity.sessionKey}`,
    `status: active`,
    "---",
    "",
  ];
  const content = [
    ...frontmatter,
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
  const targetTopic = args.topic || null;

  // U-CLEANUP-A4 (2026-05-13): --slot golf reads from HANDOFF-golf[-<topic>].md
  // first. If the operator passes --slot golf this is authoritative — we do
  // NOT fall back to instance-keyed lookups, because a hygiene chat asking
  // for its own handoff should not pick up a peer work-chat's file by
  // accident. The other read fallback paths (same-instance-newest, fuzzy,
  // family-latest, latest) stay disabled in this branch.
  const slotTag = (args?.slot || "").toString().trim().toLowerCase();
  if (slotTag === "golf") {
    if (targetTopic) {
      const golfTopicedPath = handoffPath("golf", targetTopic);
      if (fs.existsSync(golfTopicedPath)) {
        return { ok: true, content: fs.readFileSync(golfTopicedPath, "utf-8"), file: golfTopicedPath, matchedBy: "slot-golf-topic" };
      }
    }
    const golfPath = handoffPath("golf");
    if (fs.existsSync(golfPath)) {
      return { ok: true, content: fs.readFileSync(golfPath, "utf-8"), file: golfPath, matchedBy: "slot-golf" };
    }
    // Same-base-newest within the golf slot: any HANDOFF-golf-*.md authored
    // by whichever chat is currently the hygiene slot.
    const golfBase = `HANDOFF-golf-`;
    const golfFiles = fs.readdirSync(HANDOFFS_DIR)
      .filter((f) => f.startsWith(golfBase) && f.endsWith(".md"))
      .map((f) => { const fp = path.join(HANDOFFS_DIR, f); return { file: f, path: fp, mtime: fs.statSync(fp).mtimeMs }; })
      .sort((a, b) => b.mtime - a.mtime);
    if (golfFiles.length > 0) {
      const pick = golfFiles[0];
      const ageMin = Math.round((Date.now() - pick.mtime) / 60000);
      return { ok: true, content: fs.readFileSync(pick.path, "utf-8"), file: pick.file, matchedBy: "slot-golf-newest", age_minutes: ageMin };
    }
    return { ok: false, error: "no_golf_handoff", message: "No HANDOFF-golf*.md found. Hygiene slot has not written a handoff yet." };
  }

  // (0) Exact topic match — required for multi-chat partitioning so each chat
  //     reads HANDOFF-<id>-<topic>.md, not the bare HANDOFF-<id>.md from a
  //     different branch's session. Re-applied 2026-05-09 after peer revert.
  if (targetTopic) {
    const topicedPath = handoffPath(targetInstance, targetTopic);
    if (fs.existsSync(topicedPath)) {
      return { ok: true, content: fs.readFileSync(topicedPath, "utf-8"), file: topicedPath, matchedBy: "exact-topic" };
    }
  }

  const filePath = handoffPath(targetInstance);
  if (fs.existsSync(filePath)) {
    return { ok: true, content: fs.readFileSync(filePath, "utf-8"), file: filePath, matchedBy: "exact" };
  }

  // (0.5) Same-instance-newest — any HANDOFF-<sameInstance>-*.md authored by
  //       this chat under any topic, preferring the most recent. Prevents the
  //       fuzzy/family fallbacks from grabbing a peer chat's handoff when our
  //       branch happens to differ from the one the writer used.
  const baseName = `HANDOFF-${sanitizeFilename(targetInstance)}-`;
  const files = fs.readdirSync(HANDOFFS_DIR)
    .filter((f) => f.startsWith("HANDOFF-") && f.endsWith(".md"));
  const sameInstanceFiles = files
    .filter((f) => f.startsWith(baseName))
    .map((f) => { const fp = path.join(HANDOFFS_DIR, f); return { file: f, path: fp, mtime: fs.statSync(fp).mtimeMs }; })
    .sort((a, b) => b.mtime - a.mtime);
  if (sameInstanceFiles.length > 0) {
    const pick = sameInstanceFiles[0];
    const ageMin = Math.round((Date.now() - pick.mtime) / 60000);
    return { ok: true, content: fs.readFileSync(pick.path, "utf-8"), file: pick.file, matchedBy: "same-instance-newest", age_minutes: ageMin };
  }

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
  const banned = rejectNonLiveChat(args, "stop");
  if (banned) return banned;
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

/**
 * PRISM-STAB-MS0/U-B2 (2026-05-09): stdin session_id is authoritative.
 *
 * When this helper is invoked from a Claude hook, stdin carries a JSON
 * payload containing the authoritative session_id. Using it as the
 * primary identity source aligns with file-claim-guard.mjs (which already
 * does this) and closes the cross-helper namespace mismatch that caused
 * "wrong handoff loaded" on simultaneous /compact across multiple chats.
 *
 * Rollback: set PRISM_HANDOFF_STDIN_AUTH=0 to fall back to legacy
 * --terminal-first resolution.
 */
function readStdinSessionId() {
  if (process.env.PRISM_HANDOFF_STDIN_AUTH === "0") return null;
  try {
    // isatty(0) — NOT process.stdin.isTTY. Touching the `process.stdin` getter
    // lazily constructs a Stream over fd 0; when fd 0 is a pipe (a Claude hook
    // invocation, or the Bash tool) that Stream is a *referenced* net.Socket
    // that keeps the event loop alive after this helper's work is done — the
    // process then hangs on "cleanup" with nothing left to do (observed: a
    // /handoff Bash call hanging >45s, killed manually, handoff already on
    // disk). isatty(0) answers the same question via uv_guess_handle without
    // ever creating the Stream.
    if (isatty(0)) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    const parsed = JSON.parse(buf);
    const sid = parsed?.session_id || parsed?.sessionId;
    if (typeof sid === "string" && sid.length >= 8) return sid.slice(0, 36);
  } catch { /* no stdin or not JSON — fall through to legacy resolution */ }
  return null;
}

const stdinSid = readStdinSessionId();

// Resolve identity. Priority order (U-B2):
//   1) stdin session_id from hook payload — authoritative; produces canonical
//      claude-XXXXXXXX form matching file-claim-guard.mjs.
//   2) --terminal arg with auto-register fallback (legacy path; still primary
//      for Bash invocations like /handoff, /precompact).
//   3) inferAgentIdentity() — last resort, derives from env.
let identity;
if (stdinSid) {
  const canonicalInstance = `claude-${stdinSid.slice(0, 8)}`;
  // Auto-register so getSessionId() works for follow-up reads in same chat.
  const existing = getSessionId(canonicalInstance);
  if (!existing) registerSession(canonicalInstance, "Claude");
  identity = {
    family: "Claude",
    machine: process.env.COMPUTERNAME || "machine",
    sessionKey: canonicalInstance,
    instance: canonicalInstance,
    stdinAuthoritative: true,
  };
}
if (!identity && args.terminal) {
  let session = getSessionId(args.terminal);
  if (!session && cmd !== "unregister") {
    const family = args.agentFamily || "Claude";
    session = registerSession(args.terminal, family);
  }
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
