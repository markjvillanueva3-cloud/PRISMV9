#!/usr/bin/env node
/**
 * generate-dashboard-html.mjs — OBSIDIAN-INTELLIGENCE-MS3 / C2 (U-HTML-DASHBOARD)
 *
 * Aggregator: reads 7 PRISM surface artifacts → emits a single self-contained
 * HTML dashboard at state/shared/system-viz/dashboard.html. Composes the C1
 * render lib (`scripts/lib/html-report-render.mjs`) — every visual primitive
 * comes from there; this script is pure data → section schema → HTML.
 *
 * Panels (in render order):
 *   1. system-viz       — EXECUTIVE-BRIEFING.json headline + link to live :8765 viz
 *   2. CLAUDE-BRIEF     — first N lines of CLAUDE-BRIEF.md (prose)
 *   3. BUILD_STATE      — headline cards (built/unwired/drift/pending) + drift table
 *   4. scrutiny ledger  — last 10 SCRUTINY_LEDGER entries (3-arm status)
 *   5. recall top-20    — wiki-recall-counts.json top entries by hit-count
 *   6. chat-bus / fleet — chat-slots.json + activity
 *   7. workboard        — AGENT_WORKBOARD.md (prose)
 *
 * FAILURE CONTRACT (mirrors C1 sibling lib):
 *   Every reader returns { data, error? } and never throws.
 *   Missing/malformed source → panel shows status="fail" with reason; the
 *   dashboard still renders. The Stop-hook regen path is async, so even a
 *   total failure here is just a stale dashboard.html, never a Stop block.
 *
 * KNOBS:
 *   PRISM_REPO_ROOT             override root (default H:/prism)
 *   PRISM_DASHBOARD_OUT         override output path
 *   PRISM_DASHBOARD_BRIEF_LINES brief preview line cap (default 60)
 *   PRISM_DASHBOARD_RECALL_TOP  recall panel top-K (default 20)
 *   PRISM_DASHBOARD_SCRUTINY_K  scrutiny panel rows (default 10)
 *
 * @module scripts/generate-dashboard-html
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  renderHtmlPage,
  renderSection,
  escapeHtml,
} from "./lib/html-report-render.mjs";

/* ---- config ---- */

const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const OUT_PATH = process.env.PRISM_DASHBOARD_OUT
  || path.join(REPO_ROOT, "state/shared/system-viz/dashboard.html");
const BRIEF_LINES = clampInt(process.env.PRISM_DASHBOARD_BRIEF_LINES, 60, 5, 500);
const RECALL_TOP = clampInt(process.env.PRISM_DASHBOARD_RECALL_TOP, 20, 1, 200);
const SCRUTINY_K = clampInt(process.env.PRISM_DASHBOARD_SCRUTINY_K, 10, 1, 100);

function clampInt(raw, def, lo, hi) {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return def;
  return Math.max(lo, Math.min(hi, n));
}

/* ---- pure readers (fail-soft) — each returns {data, error?} ---- */

export function readJsonSafe(absPath) {
  try {
    const raw = fs.readFileSync(absPath, "utf8");
    return { data: JSON.parse(raw) };
  } catch (err) {
    return { data: null, error: String(err.message || err).slice(0, 200) };
  }
}

export function readTextSafe(absPath, maxBytes = 64 * 1024) {
  try {
    const stat = fs.statSync(absPath);
    if (stat.size > maxBytes) {
      const fd = fs.openSync(absPath, "r");
      const buf = Buffer.alloc(maxBytes);
      fs.readSync(fd, buf, 0, maxBytes, 0);
      fs.closeSync(fd);
      return { data: buf.toString("utf8") + "\n…[truncated]" };
    }
    return { data: fs.readFileSync(absPath, "utf8") };
  } catch (err) {
    return { data: null, error: String(err.message || err).slice(0, 200) };
  }
}

export function readSystemVizBriefing(repoRoot) {
  return readJsonSafe(path.join(repoRoot, "state/shared/system-viz/EXECUTIVE-BRIEFING.json"));
}

export function readClaudeBrief(repoRoot, maxLines = BRIEF_LINES) {
  const r = readTextSafe(path.join(repoRoot, "state/shared/CLAUDE-BRIEF.md"));
  if (!r.data) return r;
  const lines = r.data.split("\n").slice(0, maxLines);
  return { data: lines.join("\n") };
}

export function readBuildState(repoRoot) {
  return readJsonSafe(path.join(repoRoot, "state/shared/BUILD_STATE.json"));
}

export function readScrutinyLedger(repoRoot, topK = SCRUTINY_K) {
  const r = readJsonSafe(path.join(repoRoot, "mcp-server/data/state/SCRUTINY_LEDGER.json"));
  if (!r.data) return r;
  // Ledger is a flat object keyed by sessionId → entry. Take the K most recent.
  const entries = Object.entries(r.data)
    .filter(([, v]) => v && typeof v === "object")
    .map(([sid, v]) => ({ sid, ...v }))
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
    .slice(0, topK);
  return { data: entries };
}

export function readWikiRecallTop(repoRoot, topK = RECALL_TOP) {
  const r = readJsonSafe(path.join(repoRoot, "mcp-server/data/state/wiki-recall-counts.json"));
  if (!r.data) return r;
  // File shape: { "<wiki-entry>": N, ... }  OR  { counts: { ... } }
  const counts = r.data.counts && typeof r.data.counts === "object"
    ? r.data.counts
    : r.data;
  const rows = Object.entries(counts)
    .filter(([k, v]) => typeof k === "string" && Number.isFinite(Number(v)))
    .map(([k, v]) => ({ entry: k, count: Number(v) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topK);
  return { data: rows };
}

export function readChatSlots(repoRoot) {
  const r = readJsonSafe(path.join(repoRoot, "state/shared/chat-slots.json"));
  if (!r.data) return r;
  const slots = r.data.slots || {};
  const rows = Object.entries(slots).map(([slot, state]) => {
    const s = state && typeof state === "object" ? state : {};
    return {
      slot,
      chatId: s.chatId || "(idle)",
      branch: s.branch || "",
      topic: s.topic || "",
      activity: s.activity || "",
      lastHeartbeat: s.lastHeartbeat || "",
    };
  });
  return { data: rows };
}

export function readWorkboard(repoRoot, maxLines = 40) {
  const r = readTextSafe(path.join(repoRoot, "state/shared/AGENT_WORKBOARD.md"));
  if (!r.data) return r;
  const lines = r.data.split("\n").slice(0, maxLines);
  return { data: lines.join("\n") };
}

/* ---- pure age helper ---- */

export function formatAgeMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function heartbeatStatus(lastHeartbeatIso, now = Date.now()) {
  if (!lastHeartbeatIso) return { age: "—", status: undefined };
  const t = Date.parse(lastHeartbeatIso);
  if (Number.isNaN(t)) return { age: "—", status: "fail" };
  const ageMs = now - t;
  if (ageMs < 5 * 60_000) return { age: formatAgeMs(ageMs), status: "ok" };
  if (ageMs < 10 * 60_000) return { age: formatAgeMs(ageMs), status: "warn" };
  return { age: formatAgeMs(ageMs), status: "fail" };
}

/* ---- pure panel renderers — each takes reader-output, returns Section[] ---- */

export function panelSystemViz({ data, error }) {
  if (error || !data) {
    return [{
      kind: "headline",
      cards: [{
        label: "system-viz",
        value: "unavailable",
        status: "fail",
        hint: error ? error.slice(0, 80) : "no briefing data",
      }],
    }];
  }
  const cards = [];
  if (Number.isFinite(data.totalNodes)) cards.push({ label: "graph nodes", value: String(data.totalNodes), status: "info" });
  if (Number.isFinite(data.totalEdges)) cards.push({ label: "graph edges", value: String(data.totalEdges), status: "info" });
  if (Number.isFinite(data.totalFiles)) cards.push({ label: "files indexed", value: String(data.totalFiles), status: "info" });
  if (Number.isFinite(data.totalNamespaces)) cards.push({ label: "namespaces", value: String(data.totalNamespaces), status: "info" });
  if (cards.length === 0) {
    cards.push({ label: "system-viz", value: "(no headline counts in briefing)", status: "warn" });
  }
  const link = "<p>Live 3D viz: <a href=\"http://localhost:8765\">http://localhost:8765</a> · regenerate with <code>node scripts/regen-wiki-from-viz.mjs</code></p>";
  return [
    { kind: "headline", cards },
    { kind: "prose", title: "PRISM Brain — Live 3D Map", trustedHtml: link },
  ];
}

export function panelClaudeBrief({ data, error }) {
  if (error || !data) {
    return [{ kind: "prose", title: "CLAUDE-BRIEF", text: error ? `(unavailable: ${error})` : "(no brief)" }];
  }
  // Convert markdown ## headers to <h3>, fence safely otherwise.
  const htmlLines = data.split("\n").map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) return `<h3>${escapeHtml(trimmed.slice(3))}</h3>`;
    if (trimmed.startsWith("# ")) return `<h2>${escapeHtml(trimmed.slice(2))}</h2>`;
    if (trimmed === "") return "<br/>";
    return `<p>${escapeHtml(line)}</p>`;
  });
  return [{ kind: "prose", title: "CLAUDE-BRIEF (preview)", trustedHtml: htmlLines.join("\n") }];
}

export function panelBuildState({ data, error }) {
  if (error || !data) {
    return [{ kind: "headline", cards: [{ label: "BUILD_STATE", value: "unavailable", status: "fail", hint: error || "" }] }];
  }
  const h = data.headline || {};
  const cards = [
    { label: "engines wired", value: String(h.enginesWired ?? 0), status: "ok" },
    { label: "engines unwired", value: String(h.enginesUnwired ?? 0), status: Number(h.enginesUnwired) > 0 ? "warn" : "ok" },
    { label: "envelope drift", value: String(h.envelopeDrift ?? 0), status: Number(h.envelopeDrift) > 0 ? "warn" : "ok" },
    { label: "frontends pending", value: String(h.frontendsPending ?? 0), status: Number(h.frontendsPending) > 0 ? "warn" : "ok" },
  ];
  const sections = [{ kind: "headline", cards }];
  // Optional drift table
  const drifts = Array.isArray(data.envelopeDrift) ? data.envelopeDrift.slice(0, 10) : [];
  if (drifts.length > 0) {
    sections.push({
      kind: "table",
      caption: `Envelope drift — top ${drifts.length}`,
      headers: ["milestone", "claimed", "derived", "notes"],
      rows: drifts.map((d) => [
        String(d.milestone || d.id || "—"),
        String(d.claimedStatus || d.claimed || "—"),
        String(d.derivedStatus || d.derived || "—"),
        String(d.note || d.reason || "—").slice(0, 80),
      ]),
    });
  }
  return sections;
}

export function panelScrutinyLedger({ data, error }) {
  if (error || !data || data.length === 0) {
    return [{ kind: "prose", title: "Scrutiny ledger", text: error ? `(unavailable: ${error})` : "(no entries)" }];
  }
  const rows = data.map((e) => {
    const armA = !!(e.opusReviewed);
    const armB = !!(e.claudeReviewed || e.opusBReviewed || e.geminiReviewed);
    const armC = !!(e.codexReviewed || e.analystReviewed);
    const cleared = armA && armB && armC;
    return [
      String(e.sid || "").slice(0, 32),
      String(e.target || e.commit || "—").slice(0, 16),
      armA ? "✓" : "—",
      armB ? "✓" : "—",
      armC ? "✓" : "—",
      cleared ? "CLEARED" : "OPEN",
      String(e.updatedAt || e.createdAt || "—").slice(0, 19),
    ];
  });
  return [{
    kind: "table",
    caption: `Scrutiny ledger — last ${data.length}`,
    headers: ["session", "target", "A", "B", "C", "status", "updated"],
    rows,
  }];
}

export function panelRecallTop({ data, error }) {
  if (error || !data || data.length === 0) {
    return [{ kind: "prose", title: "Wiki recall top", text: error ? `(unavailable: ${error})` : "(no recall counts)" }];
  }
  return [{
    kind: "barchart",
    label: `Wiki recall — top ${data.length} entries by hit-count`,
    data: data.map((r) => ({ label: r.entry, value: r.count, status: "info" })),
  }];
}

export function panelChatBus({ data, error }, now = Date.now()) {
  if (error || !data || data.length === 0) {
    return [{ kind: "prose", title: "Chat fleet", text: error ? `(unavailable: ${error})` : "(no slot data)" }];
  }
  const rows = data.map((s) => {
    const hb = heartbeatStatus(s.lastHeartbeat, now);
    const stamp = hb.status === "ok" ? "✓" : hb.status === "warn" ? "⚠" : hb.status === "fail" ? "✗" : "·";
    return [
      String(s.slot),
      String(s.chatId).slice(0, 24),
      String(s.topic).slice(0, 32),
      String(s.activity).slice(0, 16),
      `${stamp} ${hb.age}`,
    ];
  });
  return [{
    kind: "table",
    caption: `Chat fleet — ${data.length} slots`,
    headers: ["slot", "chat", "topic", "activity", "heartbeat"],
    rows,
  }];
}

export function panelWorkboard({ data, error }) {
  if (error || !data) {
    return [{ kind: "prose", title: "Workboard", text: error ? `(unavailable: ${error})` : "(no workboard)" }];
  }
  const htmlLines = data.split("\n").map((line) => {
    const t = line.trim();
    if (t.startsWith("## ")) return `<h3>${escapeHtml(t.slice(3))}</h3>`;
    if (t.startsWith("# ")) return `<h2>${escapeHtml(t.slice(2))}</h2>`;
    if (t === "") return "<br/>";
    if (t.startsWith("- ")) return `<li>${escapeHtml(t.slice(2))}</li>`;
    return `<p>${escapeHtml(line)}</p>`;
  });
  return [{ kind: "prose", title: "Agent workboard", trustedHtml: htmlLines.join("\n") }];
}

/* ---- assembleDashboard — composes all 7 panels into a single HTML page ---- */

export function assembleDashboard(repoRoot, now = Date.now()) {
  const viz = readSystemVizBriefing(repoRoot);
  const brief = readClaudeBrief(repoRoot);
  const buildState = readBuildState(repoRoot);
  const scrutiny = readScrutinyLedger(repoRoot);
  const recall = readWikiRecallTop(repoRoot);
  const chatBus = readChatSlots(repoRoot);
  const workboard = readWorkboard(repoRoot);

  const sections = [
    ...panelSystemViz(viz),
    ...panelBuildState(buildState),
    ...panelChatBus(chatBus, now),
    ...panelClaudeBrief(brief),
    ...panelRecallTop(recall),
    ...panelScrutinyLedger(scrutiny),
    ...panelWorkboard(workboard),
  ];

  return renderHtmlPage({
    title: "PRISM Dashboard",
    subtitle: "Unified PRISM brain — viz / build_state / fleet / brief / recall / scrutiny / workboard",
    generatedAt: new Date(now).toISOString(),
    sections,
    note: "Auto-regenerated by .claude/hooks/stop-dashboard-regen.mjs (T3, async, throttled). C2 / OBSIDIAN-INTELLIGENCE-MS3.",
  });
}

/* ---- CLI entry ---- */

function main() {
  const html = assembleDashboard(REPO_ROOT);
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, html, "utf8");
  process.stdout.write(`dashboard.html → ${OUT_PATH} (${html.length} bytes)\n`);
}

const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
const here = fileURLToPath(import.meta.url);
if (argv1 === here || argv1.endsWith("generate-dashboard-html.mjs")) {
  main();
}
