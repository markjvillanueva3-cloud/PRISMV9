#!/usr/bin/env node
// tier: T3
// handoff-memory-seed-stop.mjs — Stop hook
//
// SYSTEM-VIZ-BRAIN-MS0/U-P1-HANDOFF-MEMORY-SEED.
//
// After Stop fires (and the existing precompact/handoff-writer hooks have
// already written the per-agent handoff for this chat), append/replace a
// ## MEMORY_SEED section with top distilled signals (recent error events +
// just-shipped Obsidian memos + wiki code-tribal learnings) so the next
// chat starts with context instead of a blank slate.
//
// Also opportunistically fires the monthly handoff-prune cron
// (scripts/handoff-prune-cron.mjs --apply) — same post-Stop handoff-hygiene
// charter. That script self-throttles to one apply-run / 30 days, so this is
// a fast no-op on 29 days of 30; the spawn is detached so even the real
// archive run never blocks Stop.
//
// Non-blocking. Always returns {"continue":true}. Skip if disabled or if no
// session id resolvable.
//
// Knobs:
//   PRISM_HANDOFF_MEMORY_SEED_DISABLE=1   no-op
//   PRISM_HANDOFF_MEMORY_SEED_SYNC=1      run synchronously (default detached)
//   PRISM_HANDOFF_MEMORY_SEED_TIMEOUT_MS  default 5000 (sync mode only)
//   PRISM_HANDOFF_PRUNE_DISABLE=1         skip the prune-cron piggyback
//   PRISM_ROOT                            repo root (default H:/prism)

import { execFileSync, spawn } from "node:child_process";
import { existsSync, openSync, closeSync, mkdirSync, statSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 5000;
const DISABLE = process.env.PRISM_HANDOFF_MEMORY_SEED_DISABLE === "1";
const SYNC = process.env.PRISM_HANDOFF_MEMORY_SEED_SYNC === "1";
const TIMEOUT_MS = parseInt(process.env.PRISM_HANDOFF_MEMORY_SEED_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10) || DEFAULT_TIMEOUT_MS;
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";

function approve() { process.stdout.write(JSON.stringify({ continue: true })); }

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function resolveInstance(payload) {
  if (payload && (payload.session_id || payload.sessionId)) {
    return String(payload.session_id || payload.sessionId).slice(0, 32);
  }
  try {
    const helper = path.join(PRISM_ROOT, ".claude", "helpers", "stable-session-id.mjs");
    if (existsSync(helper)) {
      const out = execFileSync(process.execPath, [helper], {
        encoding: "utf8", timeout: 1500, stdio: ["ignore", "pipe", "ignore"],
        input: JSON.stringify(payload || {}),
      });
      const id = out.trim();
      if (id && id !== "unresolved") return id;
    }
  } catch { /* fallthrough */ }
  return null;
}

function runSync(scriptPath, instance) {
  try {
    execFileSync(process.execPath, [scriptPath, "--instance", instance], {
      encoding: "utf8", timeout: TIMEOUT_MS, stdio: ["ignore", "ignore", "ignore"],
    });
  } catch { /* non-blocking */ }
}

function runDetached(scriptPath, instance) {
  try {
    const logDir = path.join(PRISM_ROOT, "state", "shared");
    mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, ".handoff-memory-seed.log");
    const fd = openSync(logPath, "a");
    const child = spawn(process.execPath, [scriptPath, "--instance", instance], {
      detached: true,
      stdio: ["ignore", fd, fd],
      windowsHide: true,
    });
    child.unref();
    closeSync(fd);
  } catch { /* non-blocking */ }
}

// Opportunistic monthly handoff-prune. The cron self-throttles to one
// apply-run / 30d, so spawning it every Stop is cheap (a ~10ms throttle check
// 29 days of 30). Detached + non-blocking — failure here never affects Stop.
function pruneStaleHandoffs() {
  if (process.env.PRISM_HANDOFF_PRUNE_DISABLE === "1") return;
  try {
    const cron = path.join(PRISM_ROOT, "scripts", "handoff-prune-cron.mjs");
    if (!existsSync(cron)) return;
    const logDir = path.join(PRISM_ROOT, "state", "shared");
    mkdirSync(logDir, { recursive: true });
    const fd = openSync(path.join(logDir, ".handoff-prune-cron.log"), "a");
    const child = spawn(process.execPath, [cron, "--apply"], {
      detached: true, stdio: ["ignore", fd, fd], windowsHide: true,
    });
    child.unref();
    closeSync(fd);
  } catch { /* non-blocking */ }
}

// Synergy: refresh the zebra-awareness substrate index once per 24h. The CLI
// scripts/zebra-awareness-run.mjs reads 10 PRISM surfaces (memories / wiki /
// tribal / system-viz / OS / NN-GRAPH checkpoint / etc.) and writes
// state/shared/zebra-awareness-{index,weights}.json — the cross-surface
// capability fingerprint every downstream router/orchestrator consumes. The
// CLI was previously fired only by hand, so the index went stale; this
// piggyback closes the producer-side gap toward a "self-operating" ecosystem.
// External 24h throttle via .zebra-awareness-refresh.lock mtime keeps the
// zebra-owned script untouched. Touch-before-spawn collapses concurrent Stop
// bursts; the ~1ms race window is benign (the script's atomic writes are
// last-writer-wins on identical inputs).
function refreshZebraAwareness() {
  if (process.env.PRISM_ZEBRA_AWARE_REFRESH_DISABLE === "1") return;
  try {
    const script = path.join(PRISM_ROOT, "scripts", "zebra-awareness-run.mjs");
    if (!existsSync(script)) return;
    const logDir = path.join(PRISM_ROOT, "state", "shared");
    mkdirSync(logDir, { recursive: true });
    const lockPath = path.join(logDir, ".zebra-awareness-refresh.lock");
    try {
      const st = statSync(lockPath);
      const ageMs = Date.now() - st.mtimeMs;
      if (ageMs < 24 * 60 * 60 * 1000) return;  // fresh — skip
    } catch { /* missing lock = first run, proceed */ }
    // Touch lock BEFORE spawn so a concurrent Stop burst sees a fresh lock.
    writeFileSync(lockPath, new Date().toISOString());
    const fd = openSync(path.join(logDir, ".zebra-awareness-refresh.log"), "a");
    const child = spawn(process.execPath, [script], {
      detached: true, stdio: ["ignore", fd, fd], windowsHide: true,
    });
    child.unref();
    closeSync(fd);
  } catch { /* non-blocking */ }
}

// Synergy iter 3 (echo, /goal): weekly audit of Obsidian-style [[name]] links
// across wiki/memory namespaces. scripts/knowledge-link-audit.mjs scans both
// trees, emits state/shared/.knowledge-link-audit.json with broken-vs-resolved
// counts. Broken links are silently-failing tribal/memory-rag lookups — the
// substrate degrades quietly as renames accumulate. This is the producer side
// (the report); consumer-side surfacing comes in a later iter. Weekly mtime
// throttle (audit is read-mostly; daily would be noise) via
// .knowledge-link-audit.lock. Touch-before-spawn collapses concurrent Stop
// bursts. Detached + non-blocking — never affects Stop.
function auditKnowledgeLinks() {
  if (process.env.PRISM_KNOWLEDGE_LINK_AUDIT_DISABLE === "1") return;
  try {
    const script = path.join(PRISM_ROOT, "scripts", "knowledge-link-audit.mjs");
    if (!existsSync(script)) return;
    const logDir = path.join(PRISM_ROOT, "state", "shared");
    mkdirSync(logDir, { recursive: true });
    const lockPath = path.join(logDir, ".knowledge-link-audit.lock");
    // Atomic-acquire via writeFileSync wx (O_EXCL): closes the check-then-write
    // race that lets 2+ concurrent Stops past a stale-mtime check. The OS
    // guarantees exactly ONE Stop hook lands the lock in any sub-ms burst;
    // every other hook gets EEXIST → freshness check → return. The stale-lock
    // path (>7d old) uses unlink+retry, racing-safe: if a peer unlinks first,
    // the EEXIST-after-unlink path lets exactly one writer win the second
    // round. (Reviewer-B P0 fix on iter 3.)
    const THROTTLE_MS = 7 * 24 * 60 * 60 * 1000;
    let acquired = false;
    try {
      writeFileSync(lockPath, new Date().toISOString(), { flag: "wx" });
      acquired = true;
    } catch {
      try {
        const st = statSync(lockPath);
        if (Date.now() - st.mtimeMs < THROTTLE_MS) return;  // fresh peer owns this window
        try { unlinkSync(lockPath); } catch { return; }      // lost the stale-clear race
        try {
          writeFileSync(lockPath, new Date().toISOString(), { flag: "wx" });
          acquired = true;
        } catch { return; }                                  // lost the post-unlink race
      } catch { return; }
    }
    if (!acquired) return;
    const fd = openSync(path.join(logDir, ".knowledge-link-audit.log"), "a");
    const child = spawn(process.execPath, [script], {
      detached: true, stdio: ["ignore", fd, fd], windowsHide: true,
    });
    child.unref();
    closeSync(fd);
  } catch { /* non-blocking */ }
}

// Consumer: regenerate the human-readable per-slot capability report
// (state/shared/SLOT-CAPABILITY-MAP.md) whenever the zebra-awareness index has
// changed since the report's last write. mtime-gated — naturally chases the
// async detached refresh above; the first Stop after a refresh completes
// renders the new map. Disable: PRISM_ZEBRA_REPORT_DISABLE=1.
function regenCapabilityReport() {
  if (process.env.PRISM_ZEBRA_REPORT_DISABLE === "1") return;
  try {
    const script = path.join(PRISM_ROOT, "scripts", "zebra-capability-report.mjs");
    const idxPath = path.join(PRISM_ROOT, "state/shared/zebra-awareness-index.json");
    const reportPath = path.join(PRISM_ROOT, "state/shared/SLOT-CAPABILITY-MAP.md");
    if (!existsSync(script) || !existsSync(idxPath)) return;
    let idxMtime = 0, reportMtime = 0;
    try { idxMtime = statSync(idxPath).mtimeMs; } catch { return; }
    try { reportMtime = statSync(reportPath).mtimeMs; } catch { /* missing report → regen */ }
    if (reportMtime >= idxMtime) return;  // report already current
    const fd = openSync(path.join(PRISM_ROOT, "state/shared/.zebra-capability-report.log"), "a");
    const child = spawn(process.execPath, [script], {
      detached: true, stdio: ["ignore", fd, fd], windowsHide: true,
    });
    child.unref();
    closeSync(fd);
  } catch { /* non-blocking */ }
}

function main() {
  if (DISABLE) { approve(); return; }

  // Handoff hygiene: fire the monthly prune cron before the memory-seed work.
  // It does not depend on the resolved instance, so it runs ahead of the
  // early-returns below.
  pruneStaleHandoffs();

  // Synergy substrate: keep the cross-surface zebra-awareness index fresh
  // (24h-throttled internally). Producer side of the self-operating loop.
  refreshZebraAwareness();

  // Consumer side: regenerate the human-readable per-slot capability report
  // whenever the index has changed (mtime-gated, detached, non-blocking).
  regenCapabilityReport();

  // Synergy iter 3: weekly audit of wiki/memory [[name]] cross-references —
  // surfaces broken tribal/memory-rag links that silently fail at lookup.
  auditKnowledgeLinks();

  const payload = readStdin();
  const instance = resolveInstance(payload);
  if (!instance) { approve(); return; }

  const scriptPath = path.join(PRISM_ROOT, "scripts", "handoff-memory-seed.mjs");
  if (!existsSync(scriptPath)) { approve(); return; }

  if (SYNC) runSync(scriptPath, instance);
  else runDetached(scriptPath, instance);
  approve();
}

main();
