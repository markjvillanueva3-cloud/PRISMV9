#!/usr/bin/env node
/**
 * hzp-dash-control-server.mjs — HZD-01 + HZD-04 (HZP-DASH-MS0)
 *
 * Loopback-only (127.0.0.1) HTTP control surface for the Hermes/Zulu ops
 * panel on the :8765 system-viz dashboard. Six POST endpoints (assign,
 * veto, promote-refuse, adopt-doctrine, escalate, bus-send) each guarded
 * by an inline copy of the ZuluFleetGovernorEngine algorithm + audited
 * via the HzpDashAuditEngine algorithm.
 *
 * Default port 8767 (env: PRISM_HZP_DASH_CONTROL_PORT). Bind 127.0.0.1
 * ONLY — never 0.0.0.0. CORS allowlist: http://127.0.0.1:8765.
 *
 * Why duplicate the algorithm here instead of importing the TS engines?
 *   Node ESM cannot import .ts directly, and the esbuild chunks under
 *   mcp-server/dist/ are hash-suffixed (no stable resolver path). The
 *   pure-JS copy below mirrors the TS engine line-for-line; the TS engines
 *   are the canonical MCP-callable surface. Two surfaces, one algorithm —
 *   both tested independently. Drift detection lives in the engine tests.
 */

"use strict";

import http from "node:http";
import { readFile, appendFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PRISM_HZP_DASH_CONTROL_PORT || 8767);
// STATE_DIR is env-overridable so a hermetic test can sandbox the souls/audit/claim paths
// (U-HERMES-ASSIGN-FAILLOUD) — production default unchanged.
const STATE_DIR = process.env.PRISM_HZP_DASH_STATE_DIR || path.join("H:/prism", "state/shared");

const PATHS = {
  audit:           path.join(STATE_DIR, "hzp-dash-audit.jsonl"),
  agentChat:       path.join(STATE_DIR, "AGENT_CHAT.jsonl"),
  slotClaims:      path.join(STATE_DIR, "slot-task-claims.json"),
  doctrineDrafts:  path.join(STATE_DIR, "specs"),
  escalationQueue: path.join(STATE_DIR, "hermes-escalation-queue.jsonl"),
  vetoLedger:      path.join(STATE_DIR, "hzp-dash-vetoes.jsonl"),
  refusePromote:   path.join(STATE_DIR, "soul-refuse-promotion-queue.jsonl"),
  soulsDir:        path.join(STATE_DIR, "slot-souls"),
};

const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:8765",
  "http://localhost:8765",
  "null",
]);

const MAX_BODY_BYTES = 64 * 1024;
const MAX_DRAFT_BYTES = 64 * 1024;
const AUDIT_TAIL_LINES = 50;

// ---- inline pure-JS governor (mirrors ZuluFleetGovernorEngine.ts) ----
const ORCHESTRATOR_ROLES = new Set([
  "fleet-orchestrator", "generalist", "hermes-router", "zulu-orchestrator",
]);

function safeRegex(src) { try { return new RegExp(src, "i"); } catch { return null; } }

function matchesAnyRefuse(taskText, refuses) {
  const lower = String(taskText || "").toLowerCase();
  for (const r of refuses || []) {
    const needle = String(r || "").toLowerCase().trim();
    if (needle && lower.includes(needle)) return r;
  }
  return null;
}

function checkAuthority(req, soul) {
  const informational = req.operation === "bus-send" || req.operation === "adopt-doctrine" || req.operation === "escalate";
  if (!soul) {
    return informational
      ? { authorized: true, reason: "informational-op-no-soul-required" }
      : { authorized: false, reason: `no-soul-resolved-for-slot:${req.slot}` };
  }
  const refuseHit = matchesAnyRefuse(req.task_text, soul.refuse_list);
  if (refuseHit) {
    return { authorized: false, reason: `refuse-rule-veto:${refuseHit}`, matched_refuse: refuseHit, hermes_role: soul.hermes_role };
  }
  if (informational) {
    return { authorized: true, reason: "informational-op-cleared", hermes_role: soul.hermes_role };
  }
  const df = String(soul.domain_filter || "").trim();
  if (df) {
    const re = safeRegex(df);
    // Mirror ZuluFleetGovernorEngine.ts P1 fix — fail-closed on malformed regex BEFORE orchestrator rule.
    if (!re) {
      return { authorized: false, reason: `domain-filter-malformed:${df}`, matched_domain: false, hermes_role: soul.hermes_role };
    }
    if (re.test(String(req.task_text || ""))) {
      return { authorized: true, reason: `domain-match:${df}`, matched_domain: true, hermes_role: soul.hermes_role };
    }
  }
  if (ORCHESTRATOR_ROLES.has(String(soul.hermes_role || "").toLowerCase())) {
    return { authorized: true, reason: `orchestrator-role:${soul.hermes_role}`, hermes_role: soul.hermes_role };
  }
  return {
    authorized: false,
    reason: df ? `domain-mismatch:${df}` : "no-domain-filter-and-not-orchestrator",
    matched_domain: false, hermes_role: soul.hermes_role,
  };
}

// ---- inline pure-JS audit envelope (mirrors HzpDashAuditEngine.ts) ----
function mintAuditId(now) {
  const t36 = now.getTime().toString(36);
  const rand = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  return `hzpd-${t36}-${rand}`;
}

function buildAudit(req) {
  const now = new Date();
  return {
    audit_id: mintAuditId(now),
    ts: now.toISOString(),
    operation: req.operation,
    actor: req.actor,
    target_slot: req.target_slot ?? null,
    task_id: req.task_id ?? null,
    task_text: req.task_text ?? null,
    payload: req.payload ?? null,
    authorized: req.authorized,
    authority_reason: req.authority_reason,
    schema_version: "hzp-dash-audit-1.0.0",
  };
}

// ---- minimal soul-frontmatter reader (subset of SoulFrontmatterReaderEngine) ----
function readSoulSync(md, slot) {
  if (!md || !md.startsWith("---")) return null;
  const end = md.indexOf("\n---", 3);
  if (end < 0) return null;
  const fm = md.slice(3, end).trim();
  const soul = { slot, role: "", voice: "", tone: "", refuse_list: [], preferred_subagent_type: "", domain_filter: "", hermes_role: "", body: md.slice(end + 4) };
  const lines = fm.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^([a-z_][a-z0-9_]*):\s*(.*)$/i);
    if (!m) { i++; continue; }
    const key = m[1];
    const val = m[2].trim();
    if (val === "" && key === "refuse_list") {
      const items = [];
      i++;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s+-\s+/, "").trim());
        i++;
      }
      soul.refuse_list = items;
      continue;
    }
    if (key in soul && key !== "body") soul[key] = val;
    i++;
  }
  return soul;
}

async function readSoulForSlot(slot) {
  try {
    const safe = String(slot).replace(/[^a-z0-9_-]/gi, "");
    if (!safe) return null;
    const soulPath = path.join(PATHS.soulsDir, `${safe}.md`);
    if (!existsSync(soulPath)) return null;
    const md = await readFile(soulPath, "utf-8");
    return readSoulSync(md, safe);
  } catch { return null; }
}

async function appendJsonl(filePath, obj) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, JSON.stringify(obj) + "\n", "utf-8");
}

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store", "X-PRISM-Server": "hzp-dash-control" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function applyCors(req, res) {
  const origin = req.headers.origin || "null";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (c) => {
      // P1 fix (2026-05-25 scrutiny arm A): check BEFORE appending so we don't
      // accept one chunk over the limit. Previously `total > MAX_BODY_BYTES`
      // ran AFTER `total += c.length`, allowing the first oversize chunk through.
      if (total + c.length > MAX_BODY_BYTES) { req.destroy(); reject(new Error("body-too-large")); return; }
      total += c.length;
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch { reject(new Error("invalid-json")); }
    });
    req.on("error", reject);
  });
}

async function runGuarded({ operation, body, target_slot, task_text, task_id, actor }) {
  const soul = target_slot ? await readSoulForSlot(target_slot) : null;
  const verdict = checkAuthority(
    { slot: target_slot || actor, task_text: task_text || "(no-task-text)", operation },
    soul,
  );
  const env = buildAudit({
    operation, actor, target_slot, task_id, task_text,
    payload: body, authorized: verdict.authorized, authority_reason: verdict.reason,
  });
  await appendJsonl(PATHS.audit, env);
  return { verdict, env };
}

async function handleAssign(req, res, body) {
  const { slot, task_id, task_text, actor = "operator" } = body || {};
  if (!slot || !task_text) return send(res, 400, { ok: false, error: "missing slot+task_text" });
  const { verdict, env } = await runGuarded({ operation: "assign", body, target_slot: slot, task_text, task_id, actor });
  if (!verdict.authorized) return send(res, 200, { ok: false, audit_id: env.audit_id, reason: verdict.reason });
  // FAIL-LOUD GUARD (U-HERMES-ASSIGN-FAILLOUD, slot:bravo, R12). The prior write pushed a per-slot ARRAY as a
  // sibling of the canonical claim store ({schemaVersion,claims:{<unit>:row}}); slot-task-claim.mjs readStore()
  // SILENTLY IGNORES it, so the assignment was lost while this returned ok:true (lying success + claim-store
  // corruption risk). The correct fix (write through the canonical claimStore + pickup consumer) is gated behind
  // GOVERNANCE (safety order — see state/shared/specs/HERMES-CONTROL-READINESS-2026-06-01.md). Until then, fail loud.
  return send(res, 501, {
    ok: false,
    audit_id: env.audit_id,
    reason: verdict.reason,
    error: "assign-not-wired-to-canonical-claim-store",
    detail:
      "PUSH-assign is not yet wired to the slot-task-claim canonical store (a write here is silently " +
      "dropped by readStore, so no slot would pick the task up). Fail-loud pending COMMAND_CONTROL + " +
      "GOVERNANCE closure — see state/shared/specs/HERMES-CONTROL-READINESS-2026-06-01.md.",
  });
}

async function handleVeto(req, res, body) {
  const { slot, task_id, reason: vetoReason, actor = "operator" } = body || {};
  if (!slot || !task_id || !vetoReason) return send(res, 400, { ok: false, error: "missing slot+task_id+reason" });
  const { verdict, env } = await runGuarded({
    operation: "veto", body, target_slot: slot,
    task_text: `veto-task-${task_id}:${vetoReason}`, task_id, actor,
  });
  if (!verdict.authorized) return send(res, 200, { ok: false, audit_id: env.audit_id, reason: verdict.reason });
  await appendJsonl(PATHS.vetoLedger, { audit_id: env.audit_id, ts: env.ts, slot, task_id, reason: vetoReason, actor });
  return send(res, 200, { ok: true, audit_id: env.audit_id });
}

async function handlePromoteRefuse(req, res, body) {
  const { slot, rule, actor = "operator" } = body || {};
  if (!slot || !rule) return send(res, 400, { ok: false, error: "missing slot+rule" });
  const safeSlot = String(slot).replace(/[^a-z0-9_-]/gi, "");
  const safeRule = String(rule).replace(/[\r\n]/g, " ").trim();
  if (!safeSlot || !safeRule) return send(res, 400, { ok: false, error: "invalid slot or rule" });
  const { verdict, env } = await runGuarded({
    operation: "promote-refuse", body, target_slot: safeSlot,
    task_text: `promote-refuse:${safeRule}`, actor,
  });
  if (!verdict.authorized) return send(res, 200, { ok: false, audit_id: env.audit_id, reason: verdict.reason });
  await appendJsonl(PATHS.refusePromote, { audit_id: env.audit_id, ts: env.ts, slot: safeSlot, rule: safeRule, actor });
  return send(res, 200, { ok: true, audit_id: env.audit_id, queued_to: PATHS.refusePromote });
}

async function handleAdoptDoctrine(req, res, body) {
  const { draft_markdown, actor = "operator" } = body || {};
  if (!draft_markdown || typeof draft_markdown !== "string") return send(res, 400, { ok: false, error: "missing draft_markdown" });
  if (draft_markdown.length > MAX_DRAFT_BYTES) return send(res, 400, { ok: false, error: "draft-too-large" });
  const { env } = await runGuarded({
    operation: "adopt-doctrine", body: { length: draft_markdown.length },
    task_text: "adopt-doctrine-draft", actor,
  });
  await mkdir(PATHS.doctrineDrafts, { recursive: true });
  const fpath = path.join(PATHS.doctrineDrafts, `CLAUDE-MD-DRAFT-${env.audit_id}.md`);
  await writeFile(fpath, draft_markdown, "utf-8");
  return send(res, 200, { ok: true, audit_id: env.audit_id, written_to: fpath });
}

async function handleEscalate(req, res, body) {
  const { task_id, task_text, failure_reason, attempts_so_far, actor = "operator" } = body || {};
  if (!task_id || !failure_reason) return send(res, 400, { ok: false, error: "missing task_id+failure_reason" });
  const { env } = await runGuarded({
    operation: "escalate", body, task_id,
    task_text: task_text || `escalation-of-${task_id}`, actor,
  });
  await appendJsonl(PATHS.escalationQueue, {
    audit_id: env.audit_id, ts: env.ts, task_id, task_text: task_text || null,
    failure_reason, attempts_so_far: attempts_so_far ?? null, actor, state: "queued",
  });
  return send(res, 200, { ok: true, audit_id: env.audit_id });
}

async function handleBusSend(req, res, body) {
  const { from, to, message, kind = "msg", actor = "operator" } = body || {};
  if (!from || !message) return send(res, 400, { ok: false, error: "missing from+message" });
  const { env } = await runGuarded({
    operation: "bus-send", body,
    target_slot: to || undefined, task_text: `bus:${kind}`, actor,
  });
  await appendJsonl(PATHS.agentChat, {
    ts: env.ts, audit_id: env.audit_id, from, to: to || "fleet", kind, message,
    addressed_to_zulu: /\b(zulu|bravo)\b/i.test(String(to || "")),
  });
  return send(res, 200, { ok: true, audit_id: env.audit_id });
}

async function handleAuditTail(req, res) {
  try {
    const data = await readFile(PATHS.audit, "utf-8");
    const lines = data.split("\n").filter(Boolean).slice(-AUDIT_TAIL_LINES);
    const tail = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    return send(res, 200, { ok: true, count: tail.length, tail });
  } catch { return send(res, 200, { ok: true, count: 0, tail: [] }); }
}

async function handleStateSnapshot(req, res) {
  const snap = { ts: new Date().toISOString(), port: PORT };
  try {
    const files = (await readdir(PATHS.soulsDir)).filter((f) => f.endsWith(".md"));
    snap.souls = { count: files.length, slots: files.map((f) => f.replace(/\.md$/, "")) };
  } catch { snap.souls = { count: 0, slots: [] }; }
  try { snap.audit_lines = (await readFile(PATHS.audit, "utf-8")).split("\n").filter(Boolean).length; } catch { snap.audit_lines = 0; }
  try { snap.escalation_depth = (await readFile(PATHS.escalationQueue, "utf-8")).split("\n").filter(Boolean).length; } catch { snap.escalation_depth = 0; }
  return send(res, 200, snap);
}

const ROUTES = {
  "POST /api/fleet/assign":         handleAssign,
  "POST /api/fleet/veto":           handleVeto,
  "POST /api/fleet/promote-refuse": handlePromoteRefuse,
  "POST /api/fleet/adopt-doctrine": handleAdoptDoctrine,
  "POST /api/fleet/escalate":       handleEscalate,
  "POST /api/fleet/bus-send":       handleBusSend,
  "GET /api/audit/tail":            handleAuditTail,
  "GET /api/state":                 handleStateSnapshot,
};

const server = http.createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") return send(res, 204, "", "text/plain");
  if (req.method === "GET" && (req.url === "/" || req.url === "/healthz")) {
    return send(res, 200, { ok: true, server: "hzp-dash-control", port: PORT, ts: new Date().toISOString() });
  }
  const key = `${req.method} ${(req.url || "").split("?")[0]}`;
  const handler = ROUTES[key];
  if (!handler) return send(res, 404, { ok: false, error: `no-route:${key}`, routes: Object.keys(ROUTES) });
  try {
    const body = req.method === "POST" ? await readJsonBody(req) : null;
    await handler(req, res, body);
  } catch (err) {
    send(res, 400, { ok: false, error: String(err?.message || err) });
  }
});

// Listen ONLY when run as the main entry — importing the module (e.g. from a hermetic test) must NOT
// bind :8767. (U-HERMES-ASSIGN-FAILLOUD) Handlers + PATHS are exported below for testability.
const _argv1 = (process.argv[1] || "").replace(/\\/g, "/");
if (_argv1.endsWith("hzp-dash-control-server.mjs")) {
  server.listen(PORT, HOST, () => {
    process.stdout.write(`hzp-dash-control on http://${HOST}:${PORT}/ (routes: ${Object.keys(ROUTES).length})\n`);
  });
}

export { handleAssign, handleVeto, ROUTES, PATHS, checkAuthority };
