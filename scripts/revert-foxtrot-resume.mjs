#!/usr/bin/env node
// scripts/revert-foxtrot-resume.mjs
// Per operator correction: FOXTROT-RESUME items synthesized from handoff RESUMEs
// are not real roadmap-tracked units. Remove them from the foxtrot queue;
// restore the original juliett-allocated DOMAIN/GAP/BRIDGE/PROSE waves.

import fs from "node:fs";

const QUEUE_PATH = "H:/prism/state/shared/slot-task-queues.json";
const j = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
const before = j.queues.foxtrot.length;
j.queues.foxtrot = j.queues.foxtrot.filter(u => u.wave !== "FOXTROT-RESUME");
const removed = before - j.queues.foxtrot.length;

j.lastInject = {
  at: new Date().toISOString(),
  by: "claude-3c737257 (foxtrot)",
  action: "revert",
  reason: "FOXTROT-RESUME items were synthesized from handoff RESUMEs, not real roadmap units (operator correction)",
  removed_count: removed
};
j.updatedAt = new Date().toISOString();
j.updatedBy = "claude-3c737257 (foxtrot)";

const tmp = QUEUE_PATH + ".tmp-revert-" + process.pid;
fs.writeFileSync(tmp, JSON.stringify(j, null, 2));
fs.renameSync(tmp, QUEUE_PATH);
console.log(JSON.stringify({ ok: true, removed, foxtrot_now: j.queues.foxtrot.length }, null, 2));
