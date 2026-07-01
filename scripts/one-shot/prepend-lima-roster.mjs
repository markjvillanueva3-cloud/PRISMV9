#!/usr/bin/env node
// One-shot: prepend LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17 entries ahead of
// the RGS bulk in queues.lima. Idempotent (no-op on second run).
// Author: claude-cdfb103c slot lima · 2026-05-18 · per /goal work order.

import fs from "node:fs";

const QUEUE_PATH = "H:/prism/state/shared/slot-task-queues.json";

function main() {
  const j = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  const lima = j.queues.lima;
  const beforeLen = lima.length;

  // Idempotency guard
  const already = lima.some(
    (u) => u && u.unit_id === "U-LIMA-A4-EXTRACT-SKILL-TRIGGERS-USERWALK",
  );
  if (already) {
    console.log("SKIP idempotent — roster already prepended");
    return;
  }

  // Backup
  const bakPath = QUEUE_PATH.replace(
    /\.json$/,
    `.bak-pre-lima-roster-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(bakPath, fs.readFileSync(QUEUE_PATH));

  const now = new Date().toISOString();
  const roster = [
    {
      unit_id: "U-LIMA-D-ZOMBIE-LOOP-CLOSE",
      wave: "LIMA-ROSTER",
      cost: "XS",
      spec: "state/shared/handoffs/LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17.md#D",
      depends_on: [],
      summary:
        "Close zombie loop 773c6214 (verified swept already this session)",
      status: "completed",
      roster_letter: "D",
    },
    {
      unit_id: "U-LIMA-A4-EXTRACT-SKILL-TRIGGERS-USERWALK",
      wave: "LIMA-ROSTER",
      cost: "XS",
      spec: "state/shared/handoffs/LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17.md#A4",
      depends_on: [],
      summary:
        "1-line fix: extract-skill-triggers.mjs walks user-tree (~/.claude/commands) — closes 28.6%→~100% ledger coverage, +90 entries",
      status: "pending",
      roster_letter: "A4",
    },
    {
      unit_id: "U-LIMA-A5-SKILL-TRIGGER-COVERAGE-SKILL",
      wave: "LIMA-ROSTER",
      cost: "S",
      spec: "state/shared/handoffs/LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17.md#A5",
      depends_on: ["U-LIMA-A4-EXTRACT-SKILL-TRIGGERS-USERWALK"],
      summary:
        "New /skill-trigger-coverage skill — surfaces F2 gap (5.8% of 620 skills covered). Audit-ranked ROI 9.0",
      status: "pending",
      roster_letter: "A5",
    },
    {
      unit_id: "U-LIMA-A1-OLLAMA-AUTO-EXEC-SAFE",
      wave: "LIMA-ROSTER",
      cost: "M",
      spec: "state/shared/handoffs/LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17.md#A1",
      depends_on: [],
      summary:
        "ollama-task-offloader.mjs:441 — auto-execute for safe categories (summarize/explain/triage); offload rate 8%→30%. Needs per-file scrutiny + R12",
      status: "pending",
      roster_letter: "A1",
    },
    {
      unit_id: "U-LIMA-B2-MEMORY-COMPRESS-V2",
      wave: "LIMA-ROSTER",
      cost: "S",
      spec: "state/shared/specs/UNITS/U-MEMORY-COMPRESS-V2.md",
      depends_on: [],
      summary:
        "U-MEMORY-COMPRESS-V2 impl — watchdog-auto-compact actuator. MEMORY.md=19587B/24576 (80%), recurring",
      status: "pending",
      roster_letter: "B2",
    },
    {
      unit_id: "U-LIMA-A6-RIE-ADAPTER",
      wave: "LIMA-ROSTER",
      cost: "M",
      spec: "state/shared/handoffs/LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17.md#A6",
      depends_on: [],
      summary:
        "RGS-TOOL-AUTOINVOKE-MS1 P1 backlog: U-RIE-ADAPTER (Rule Inference Engine adapter)",
      status: "pending",
      roster_letter: "A6",
    },
    {
      unit_id: "U-LIMA-A7-CALIBRATION",
      wave: "LIMA-ROSTER",
      cost: "M",
      spec: "state/shared/handoffs/LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17.md#A7",
      depends_on: [],
      summary: "RGS-TOOL-AUTOINVOKE-MS1 P1 backlog: U-CALIBRATION",
      status: "pending",
      roster_letter: "A7",
    },
    {
      unit_id: "U-LIMA-A8-TRANSFER-PRIORS",
      wave: "LIMA-ROSTER",
      cost: "M",
      spec: "state/shared/handoffs/LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17.md#A8",
      depends_on: [],
      summary:
        "RGS-TOOL-AUTOINVOKE-MS1 P1 backlog: U-TRANSFER (transfer priors)",
      status: "pending",
      roster_letter: "A8",
    },
    {
      unit_id: "U-LIMA-B1-SPLICE-CLAUDE-MD-PATCH-TOKEN-SAVINGS",
      wave: "LIMA-ROSTER",
      cost: "XS",
      spec: "state/shared/dashboards/patches/CLAUDE-MD-PATCH-token-savings-audit.md",
      depends_on: [],
      summary:
        "Splice CLAUDE-MD-PATCH-token-savings-audit.md → CLAUDE.md when peer-lock free",
      status: "pending",
      roster_letter: "B1",
    },
  ].map((u) => ({
    ...u,
    source_handoff: "LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17.md",
    added_at: now,
    added_by: "claude-cdfb103c slot lima",
  }));

  j.queues.lima = [...roster, ...lima];

  if (!Array.isArray(j.migrations)) j.migrations = [];
  j.migrations.push({
    ts: now,
    from: "LIMA-INCOMPLETE-TASKS-ROSTER-2026-05-17.md",
    to: "lima",
    moved: roster.length,
    reason:
      "compile prior-session lima incomplete units; prepend ahead of RGS bulk (work order claude-cdfb103c slot lima 2026-05-18)",
    backup: bakPath,
    prepended: true,
    roster_letters: ["D", "A4", "A5", "A1", "B2", "A6", "A7", "A8", "B1"],
  });

  // Atomic write
  const tmp = QUEUE_PATH + ".tmp." + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(j, null, 2));
  fs.renameSync(tmp, QUEUE_PATH);

  console.log(
    `OK before=${beforeLen} after=${j.queues.lima.length} delta=+${roster.length}`,
  );
  console.log(`backup=${bakPath}`);
  console.log("new head (12):");
  j.queues.lima.slice(0, 12).forEach((u, i) =>
    console.log(
      `  ${i.toString().padStart(2)} ${u.unit_id} wave=${u.wave} status=${u.status || "pending"}`,
    ),
  );
}

main();
