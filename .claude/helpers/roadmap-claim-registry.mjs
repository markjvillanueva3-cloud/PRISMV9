#!/usr/bin/env node
/**
 * roadmap-claim-registry.mjs — Cross-session roadmap milestone claim registry
 *
 * Solves: 4+ concurrent Claude/Codex sessions all try to work on the same
 * roadmap milestone after compaction because nothing tells them what the
 * OTHER sessions are holding. Per-agent handoffs only cover this session;
 * they don't cross-reference.
 *
 * Design:
 *   - Single shared JSON (proper-lockfile via atomic tmp+rename)
 *   - Append-only event log for audit: state/shared/CLAIM_EVENTS.jsonl
 *   - Active registry: state/shared/ACTIVE_ROADMAP_CLAIMS.json
 *   - TTL-based staleness: claims expire after 2h without heartbeat
 *   - PreCompact marks current claims as status="compacted" so peers know
 *     this session is in-flight, not stale, during the compact window
 *
 * Commands:
 *   claim    --milestone ID --unit ID --terminal ID   — record new claim
 *   release  --milestone ID [--unit ID]               — release claim(s)
 *   heartbeat --milestone ID                          — refresh heartbeat
 *   list                                              — dump active claims
 *   list --milestone ID                               — who claims this?
 *   compact-flush --terminal ID                       — mark all as compacted
 *   compact-restore --terminal ID                     — flip compacted→active
 *   gc                                                — expire stale claims
 *
 * Hook integration:
 *   SessionStart        → list (surfaces peer activity in boot brief)
 *   SessionStart:compact → compact-restore for this terminal
 *   PreCompact          → compact-flush for this terminal
 *   Stop/SessionEnd     → release for this terminal
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const REGISTRY = path.resolve("H:/prism/state/shared/ACTIVE_ROADMAP_CLAIMS.json");
const EVENTS = path.resolve("H:/prism/state/shared/CLAIM_EVENTS.jsonl");
const STALE_MS = 2 * 60 * 60 * 1000; // 2h
const COMPACT_GRACE_MS = 15 * 60 * 1000; // 15min grace during compaction

function now() {
  return new Date().toISOString();
}

function atomicWriteSync(filePath, data) {
  const tmp = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(tmp, data, "utf-8");
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY, "utf-8"));
  } catch {
    return { schemaVersion: 1, updatedAt: now(), claims: [] };
  }
}

function saveRegistry(reg) {
  reg.updatedAt = now();
  fs.mkdirSync(path.dirname(REGISTRY), { recursive: true });
  atomicWriteSync(REGISTRY, JSON.stringify(reg, null, 2) + "\n");
}

function appendEvent(event) {
  fs.mkdirSync(path.dirname(EVENTS), { recursive: true });
  fs.appendFileSync(EVENTS, JSON.stringify(event) + "\n", "utf-8");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function isStale(claim) {
  const hb = new Date(claim.heartbeatAt || claim.claimedAt).getTime();
  const limit = claim.status === "compacted" ? COMPACT_GRACE_MS : STALE_MS;
  return Date.now() - hb > limit;
}

function gcRegistry(reg) {
  const before = reg.claims.length;
  const live = [];
  for (const c of reg.claims) {
    if (isStale(c)) {
      appendEvent({ type: "expire", claim: c, at: now() });
    } else {
      live.push(c);
    }
  }
  reg.claims = live;
  return { expired: before - live.length };
}

function cmdClaim(args) {
  if (!args.milestone || !args.terminal) {
    console.error("claim requires --milestone and --terminal");
    process.exit(2);
  }
  const reg = loadRegistry();
  gcRegistry(reg);
  const existing = reg.claims.find(
    (c) => c.milestoneId === args.milestone && (!args.unit || c.unitId === args.unit)
  );
  if (existing && existing.terminalId !== args.terminal) {
    console.error(
      `CLAIM_CONFLICT: ${args.milestone}${args.unit ? "/" + args.unit : ""} already claimed by ${existing.terminalId} (${existing.heartbeatAt})`
    );
    process.exit(1);
  }
  if (existing) {
    existing.heartbeatAt = now();
    existing.status = "active";
    saveRegistry(reg);
    console.log(`refreshed ${existing.claimId}`);
    return;
  }
  const claim = {
    claimId: `clm_${crypto.randomBytes(6).toString("hex")}`,
    milestoneId: args.milestone,
    unitId: args.unit || null,
    terminalId: args.terminal,
    claimedAt: now(),
    heartbeatAt: now(),
    status: "active",
  };
  reg.claims.push(claim);
  saveRegistry(reg);
  appendEvent({ type: "claim", claim, at: now() });
  console.log(`claimed ${claim.claimId}`);
}

function cmdRelease(args) {
  if (!args.terminal) {
    console.error("release requires --terminal");
    process.exit(2);
  }
  const reg = loadRegistry();
  const kept = [];
  let released = 0;
  for (const c of reg.claims) {
    if (
      c.terminalId === args.terminal &&
      (!args.milestone || c.milestoneId === args.milestone) &&
      (!args.unit || c.unitId === args.unit)
    ) {
      appendEvent({ type: "release", claim: c, at: now() });
      released++;
    } else {
      kept.push(c);
    }
  }
  reg.claims = kept;
  saveRegistry(reg);
  console.log(`released ${released}`);
}

function cmdHeartbeat(args) {
  if (!args.terminal) {
    console.error("heartbeat requires --terminal");
    process.exit(2);
  }
  const reg = loadRegistry();
  let hit = 0;
  for (const c of reg.claims) {
    if (c.terminalId === args.terminal && (!args.milestone || c.milestoneId === args.milestone)) {
      c.heartbeatAt = now();
      c.status = "active";
      hit++;
    }
  }
  saveRegistry(reg);
  console.log(`heartbeat ${hit}`);
}

function cmdList(args) {
  const reg = loadRegistry();
  gcRegistry(reg);
  saveRegistry(reg);
  const claims = args.milestone
    ? reg.claims.filter((c) => c.milestoneId === args.milestone)
    : reg.claims;
  if (claims.length === 0) {
    console.log("no-active-claims");
    return;
  }
  // Group by terminal
  const byTerminal = new Map();
  for (const c of claims) {
    const arr = byTerminal.get(c.terminalId) || [];
    arr.push(c);
    byTerminal.set(c.terminalId, arr);
  }
  const lines = [];
  for (const [t, arr] of byTerminal) {
    const ids = arr.map((c) => {
      const marker = c.status === "compacted" ? "⏸" : "●";
      return `${marker}${c.milestoneId}${c.unitId ? "/" + c.unitId : ""}`;
    });
    lines.push(`${t}: ${ids.join(" ")}`);
  }
  console.log(`active-claims: ${lines.join(" | ")}`);
}

function cmdCompactFlush(args) {
  if (!args.terminal) {
    console.error("compact-flush requires --terminal");
    process.exit(2);
  }
  const reg = loadRegistry();
  let flushed = 0;
  for (const c of reg.claims) {
    if (c.terminalId === args.terminal && c.status === "active") {
      c.status = "compacted";
      c.heartbeatAt = now();
      flushed++;
    }
  }
  saveRegistry(reg);
  appendEvent({ type: "compact-flush", terminal: args.terminal, flushed, at: now() });
  console.log(`compact-flushed ${flushed}`);
}

function cmdCompactRestore(args) {
  if (!args.terminal) {
    console.error("compact-restore requires --terminal");
    process.exit(2);
  }
  const reg = loadRegistry();
  let restored = 0;
  for (const c of reg.claims) {
    if (c.terminalId === args.terminal && c.status === "compacted" && !isStale(c)) {
      c.status = "active";
      c.heartbeatAt = now();
      restored++;
    }
  }
  saveRegistry(reg);
  appendEvent({ type: "compact-restore", terminal: args.terminal, restored, at: now() });
  console.log(`compact-restored ${restored}`);
}

function cmdGc() {
  const reg = loadRegistry();
  const result = gcRegistry(reg);
  saveRegistry(reg);
  console.log(`gc expired=${result.expired} remaining=${reg.claims.length}`);
}

function main() {
  const cmd = process.argv[2];
  const args = parseArgs(process.argv);
  switch (cmd) {
    case "claim":
      return cmdClaim(args);
    case "release":
      return cmdRelease(args);
    case "heartbeat":
      return cmdHeartbeat(args);
    case "list":
      return cmdList(args);
    case "compact-flush":
      return cmdCompactFlush(args);
    case "compact-restore":
      return cmdCompactRestore(args);
    case "gc":
      return cmdGc();
    default:
      console.error(
        "roadmap-claim-registry: expected claim|release|heartbeat|list|compact-flush|compact-restore|gc"
      );
      process.exit(2);
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
