#!/usr/bin/env node
// Extract incomplete work from all alpha-slot handoffs.
// Reads HANDOFF-claude-*-alpha-*.md, parses RESUME + STATE, classifies each
// referenced milestone as shipped | in-progress | blocked | pending by joining
// against MILESTONE_PROGRESS.json + roadmap-index.json. Output JSON to stdout.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "H:/prism";
const HANDOFF_DIR = join(ROOT, "state/shared/handoffs");
const MS_PROGRESS = join(ROOT, "state/shared/MILESTONE_PROGRESS.json");
const ROADMAP_INDEX = join(ROOT, "mcp-server/data/roadmap-index.json");

function safeReadJson(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

const progress = safeReadJson(MS_PROGRESS) || {};
const roadmap = safeReadJson(ROADMAP_INDEX) || {};

// Build milestone -> {claimedStatus, derivedStatus, shippedCount, totalCount, shippedUnits[]}
const msState = {};
const msArray = progress.milestones || [];
for (const m of msArray) {
  const id = m.milestone_id || m.id;
  if (!id) continue;
  msState[id] = {
    claimedStatus: m.claimed_status || m.claimedStatus || "?",
    derivedStatus: m.derived_status || m.derivedStatus || "?",
    shipped: m.shipped || m.shipped_count || 0,
    total: m.total || m.total_count || 0,
    shippedUnits: new Set((m.shipped_units || []).map(u => (u.unit_id || u).toUpperCase()))
  };
}

// Parse handoffs
const files = readdirSync(HANDOFF_DIR).filter(f =>
  /alpha-/.test(f) && f.endsWith(".md") && !f.endsWith(".tmp")
);

const handoffs = [];
for (const f of files) {
  const p = join(HANDOFF_DIR, f);
  const st = statSync(p);
  if (st.size < 80) continue;
  const c = readFileSync(p, "utf8");
  const topic = (c.match(/^topic:\s*(.+)$/m) || [, "?"])[1].trim();
  const written = (c.match(/^written_at:\s*(.+)$/m) || [, ""])[1].trim();
  const chatM = c.match(/^session:\s*(claude-[a-f0-9]+)/m);
  const chatId = chatM ? chatM[1] : "?";
  const resume = (c.match(/## RESUME\s*\n([\s\S]*?)(?=\n## |\n<!--|$)/) || [, ""])[1].trim();
  const state = (c.match(/## STATE\s*\n([\s\S]*?)(?=\n## )/) || [, ""])[1].trim();
  handoffs.push({ file: f, chatId, topic, written, resume, state });
}

handoffs.sort((a, b) => (b.written || "").localeCompare(a.written || ""));

// Extract milestone+unit references
const MS_PATTERN = /\b([A-Z][A-Z0-9-]{2,}-MS\d+(?:\.\d+)?)\b/g;
const UNIT_PATTERN = /\bU-[A-Z][A-Z0-9-]{1,}\b/g;
const NEXT_PATTERN = /\b(?:Next|NEXT|TODO|PENDING|BLOCKED|RESUME|Continue|continuing|claimed for|loop running|queued|backlog|left|missing|in progress|in-progress|not_started)\b/i;

const incompleteRefs = new Map(); // ms -> {firstSeen, lastSeen, sourceChats:Set, contexts:[], status}

for (const h of handoffs) {
  const blob = `${h.topic}\n${h.resume}\n${h.state}`;
  // Find every milestone reference
  const milestones = new Set([...(blob.match(MS_PATTERN) || [])]);
  // Find unit references
  const units = new Set([...(blob.match(UNIT_PATTERN) || [])]);

  // Heuristic: this handoff treats this MS as carry-over work iff it mentions Next/Continue/loop/etc.
  const looksIncomplete = NEXT_PATTERN.test(blob);

  for (const ms of milestones) {
    const status = msState[ms];
    // Skip MS that's already 100% complete per progress
    if (status && status.total > 0 && status.shipped >= status.total) continue;
    if (!incompleteRefs.has(ms)) {
      incompleteRefs.set(ms, {
        milestone: ms,
        firstSeenAlpha: h.written,
        lastSeenAlpha: h.written,
        sourceChats: new Set(),
        unitsMentioned: new Set(),
        sampleContext: h.resume.slice(0, 240),
        claimedStatus: status ? status.claimedStatus : "no-envelope",
        derivedStatus: status ? status.derivedStatus : "no-envelope",
        shipped: status ? status.shipped : 0,
        total: status ? status.total : 0
      });
    }
    const r = incompleteRefs.get(ms);
    r.sourceChats.add(h.chatId);
    // earliest = smaller string (ISO sorts naturally); latest = larger
    if (h.written && h.written < r.firstSeenAlpha) r.firstSeenAlpha = h.written;
    if (h.written && h.written > r.lastSeenAlpha) r.lastSeenAlpha = h.written;
    // Add any unit mentions from this handoff
    for (const u of units) {
      // unit not already shipped per envelope
      if (status && status.shippedUnits.has(u.toUpperCase())) continue;
      r.unitsMentioned.add(u);
    }
  }
}

// Convert to array, dehydrate sets
const out = [...incompleteRefs.values()].map(r => ({
  milestone: r.milestone,
  claimedStatus: r.claimedStatus,
  derivedStatus: r.derivedStatus,
  shipped: r.shipped,
  total: r.total,
  pendingPct: r.total > 0 ? Math.round((1 - r.shipped / r.total) * 100) : null,
  firstSeenAlpha: r.firstSeenAlpha,
  lastSeenAlpha: r.lastSeenAlpha,
  alphaChats: [...r.sourceChats].sort(),
  unitsMentioned: [...r.unitsMentioned].sort(),
  sampleContext: r.sampleContext
}));

// Sort by recency (most recent first), then by pendingPct desc
out.sort((a, b) => {
  if (b.lastSeenAlpha !== a.lastSeenAlpha) return b.lastSeenAlpha.localeCompare(a.lastSeenAlpha);
  return (b.pendingPct || 0) - (a.pendingPct || 0);
});

const summary = {
  scannedAt: new Date().toISOString(),
  handoffsScanned: handoffs.length,
  milestonesWithCarryover: out.length,
  alphaChatsHistorical: [...new Set(handoffs.map(h => h.chatId))].length,
  oldestHandoff: handoffs[handoffs.length - 1]?.written || null,
  newestHandoff: handoffs[0]?.written || null
};

console.log(JSON.stringify({ summary, backlog: out }, null, 2));
