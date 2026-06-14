#!/usr/bin/env node
/**
 * generate-hermes-zebra-ops-features.mjs — HZD-06 (HZP-DASH-MS0)
 *
 * Aggregates Hermes/Zebra orchestration state into a single roost JSON for
 * the system-viz dashboard's "Hermes/Zebra Ops" panel. Reads (never writes)
 * 6 sources:
 *
 *   1. hzp-dash-audit.jsonl           recent 30 control ops
 *   2. hzp-dash-vetoes.jsonl          recent 20 vetoes
 *   3. hermes-escalation-queue.jsonl  recent 20 escalations
 *   4. soul-refuse-promotion-queue.jsonl  recent 20 refuse-rule candidates
 *   5. AGENT_CHAT.jsonl               last 50 bus messages, zebra-flag marked
 *   6. slot-task-claims.json          active per-slot assignments
 *
 * Emits to state/shared/system-viz/staging/hermes-zebra-ops.json — picked up
 * by regen-viz.mjs FAST[] + merge-augmentations.mjs splice (when registered).
 *
 * Run standalone:
 *   node H:/prism/scripts/generate-hermes-zebra-ops-features.mjs
 *
 * R12 fail-soft: missing source files → empty arrays in the output, never
 * throw.
 */

"use strict";

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const STATE_DIR = "H:/prism/state/shared";
const OUT_PATH = path.join(STATE_DIR, "system-viz/staging/hermes-zebra-ops.json");

const SOURCES = {
  audit:           path.join(STATE_DIR, "hzp-dash-audit.jsonl"),
  vetoes:          path.join(STATE_DIR, "hzp-dash-vetoes.jsonl"),
  escalations:     path.join(STATE_DIR, "hermes-escalation-queue.jsonl"),
  refusePromote:   path.join(STATE_DIR, "soul-refuse-promotion-queue.jsonl"),
  agentChat:       path.join(STATE_DIR, "AGENT_CHAT.jsonl"),
  slotClaims:      path.join(STATE_DIR, "slot-task-claims.json"),
};

const AUDIT_KEEP = 30;
const VETO_KEEP = 20;
const ESCALATION_KEEP = 20;
const REFUSE_KEEP = 20;
const CHAT_KEEP = 50;

async function tailJsonl(filePath, keep) {
  if (!existsSync(filePath)) return [];
  try {
    const data = await readFile(filePath, "utf-8");
    const lines = data.split("\n").filter(Boolean).slice(-keep);
    return lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

async function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try { return JSON.parse(await readFile(filePath, "utf-8")); } catch { return null; }
}

async function safeStat(filePath) {
  try { return await stat(filePath); } catch { return null; }
}

function flagZebraAddressed(msg) {
  const to = String(msg?.to || "").toLowerCase();
  const body = String(msg?.message || "").toLowerCase();
  return to === "zebra" || to === "bravo" || /\@zebra\b/.test(body) || msg?.addressed_to_zebra === true;
}

async function main() {
  const [audit, vetoes, escalations, refusePromote, chat, claims] = await Promise.all([
    tailJsonl(SOURCES.audit, AUDIT_KEEP),
    tailJsonl(SOURCES.vetoes, VETO_KEEP),
    tailJsonl(SOURCES.escalations, ESCALATION_KEEP),
    tailJsonl(SOURCES.refusePromote, REFUSE_KEEP),
    tailJsonl(SOURCES.agentChat, CHAT_KEEP),
    readJson(SOURCES.slotClaims),
  ]);

  const chatRows = chat.map((m) => ({
    ts: m.ts || null,
    from: m.from || null,
    to: m.to || null,
    kind: m.kind || "msg",
    message: typeof m.message === "string" ? m.message.slice(0, 280) : null,
    audit_id: m.audit_id || null,
    addressed_to_zebra: flagZebraAddressed(m),
  }));

  const authStats = audit.reduce(
    (acc, e) => {
      if (e.authorized) acc.ok += 1; else acc.deny += 1;
      acc.by_op[e.operation] = (acc.by_op[e.operation] || 0) + 1;
      return acc;
    },
    { ok: 0, deny: 0, by_op: {} },
  );

  const claimRows = [];
  if (claims && typeof claims === "object") {
    for (const [slot, items] of Object.entries(claims)) {
      if (!Array.isArray(items)) continue;
      for (const c of items) {
        claimRows.push({
          slot, task_id: c.task_id, task_text: c.task_text,
          assigned_by: c.assigned_by, assigned_at: c.assigned_at, audit_id: c.audit_id, state: c.state,
        });
      }
    }
  }

  const auditStat = await safeStat(SOURCES.audit);
  const out = {
    schema_version: "hzp-dash-ops-1.0.0",
    generated_at: new Date().toISOString(),
    summary: {
      audit_lines: audit.length,
      vetoes_recent: vetoes.length,
      escalations_open: escalations.filter((e) => e.state !== "resolved").length,
      refuse_candidates_pending: refusePromote.length,
      claims_total: claimRows.length,
      chat_zebra_flagged: chatRows.filter((c) => c.addressed_to_zebra).length,
      audit_last_modified: auditStat ? new Date(auditStat.mtimeMs).toISOString() : null,
    },
    authority: authStats,
    panels: {
      audit_tail: audit,
      vetoes,
      escalations,
      refuse_promotion_queue: refusePromote,
      chat_bus_tail: chatRows,
      active_claims: claimRows,
    },
  };

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf-8");
  process.stdout.write(`hermes-zebra-ops: wrote ${OUT_PATH} (audit=${audit.length} vetoes=${vetoes.length} escal=${escalations.length} refuse=${refusePromote.length} chat=${chatRows.length} claims=${claimRows.length})\n`);
}

main().catch((err) => {
  process.stderr.write(`generate-hermes-zebra-ops-features FAILED: ${err?.message || err}\n`);
  process.exit(1);
});
