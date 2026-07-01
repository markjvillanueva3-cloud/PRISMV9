#!/usr/bin/env node
// scripts/galaxy-push.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-PUSH.
//
//   node scripts/galaxy-push.mjs build                 # selective cross-galaxy learning fan-out → PUSH-QUEUE.json
//   node scripts/galaxy-push.mjs inbox <galaxy>         # one-line pointers pushed TO <galaxy>
//   node scripts/galaxy-push.mjs show                   # summary of the current queue
//   node scripts/galaxy-push.mjs build --json
//
// FAIL-SOFT — always exits 0. Reads MASTER-DIGEST.json + KNOWS-MAP.json; writes only PUSH-QUEUE.json.

import fs from "node:fs";
import { pushBuild, DEFAULT_QUEUE_PATH } from "./lib/galaxy-push.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const positional = args.filter((a) => !a.startsWith("--"));
const cmd = positional[0] || "build";

function loadQueue() { try { return JSON.parse(fs.readFileSync(DEFAULT_QUEUE_PATH, "utf8")); } catch { return null; } }
function out(o) { console.log(json ? JSON.stringify(o, null, 2) : o); }

try {
  if (cmd === "inbox") {
    const galaxy = positional[1];
    const q = loadQueue();
    if (!galaxy) { out(json ? { ok: false, reason: "no-galaxy" } : "usage: galaxy-push.mjs inbox <galaxy>"); process.exit(0); }
    if (!q) { out(json ? { ok: false, reason: "no-queue", hint: "run: node scripts/galaxy-push.mjs build" } : "(no PUSH-QUEUE.json — run `build` first)"); process.exit(0); }
    const items = (q.inbox && q.inbox[galaxy]) || [];
    if (json) { out({ ok: true, galaxy, count: items.length, items }); }
    else if (!items.length) { out(`no incoming pushes for "${galaxy}"`); }
    else { out(`📥 ${galaxy} — ${items.length} incoming push(es):`); for (const it of items) console.log(`  ${it.pointer}`); }
  } else if (cmd === "show") {
    const q = loadQueue();
    if (!q) { out(json ? { ok: false, reason: "no-queue" } : "(no PUSH-QUEUE.json — run `build` first)"); process.exit(0); }
    if (json) out(q);
    else {
      out(`PUSH-QUEUE: ${q.sourceCount} sources · ${q.totalPushes} pushes · ${Object.keys(q.inbox || {}).length} galaxies with inbox (k=${q.k}, threshold=${q.threshold})`);
      for (const p of (q.pushes || []).slice(0, 12)) console.log(`  ${p.source} → ${p.targets.map((t) => t.galaxy).join(", ")}`);
    }
  } else {
    const res = pushBuild();
    if (json) out(res);
    else if (res.disabled) out("push disabled (PRISM_GCF_PUSH_DISABLE=1)");
    else if (!res.written) out(`push: not written — ${res.reason}${res.error ? " (" + res.error + ")" : ""}`);
    else out(`✓ PUSH-QUEUE: ${res.sourceCount} sources fanned out to ${res.totalPushes} targeted push(es) across ${res.inboxGalaxies} galaxies\n  ${res.queuePath}\n  read one: node scripts/galaxy-push.mjs inbox <galaxy>`);
  }
} catch (e) {
  out(json ? { ok: false, reason: "cli-error", error: String((e && e.message) || e) } : `push CLI error (non-fatal): ${String((e && e.message) || e)}`);
}
process.exit(0);
