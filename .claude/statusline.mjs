#!/usr/bin/env node
// Claude Code statusLine — HP/MP bars + party (NATO slots) + services + window title.
// Invoked by Claude Code on every prompt boundary; session JSON on stdin.
// Hard timeouts on every probe; ~60s cache on services to keep latency <100ms typical.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import { lastCompactMarkerOffset } from '../scripts/lib/transcript-token-counter.mjs';

const PRISM = 'H:/prism';
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;
const DOCKER_STATE = `${PRISM}/state/shared/DOCKER_RUNTIME_STATE.json`;
const REAPER_LOG = `${PRISM}/state/shared/.fleet-reaper-actions.jsonl`;
const REAPER_KILLS = `${PRISM}/state/shared/.fleet-reaper-kills.jsonl`;
const LOOP_DIR = `${PRISM}/state/shared/loop-state`;
const CACHE_FILE = `${PRISM}/state/shared/.statusline-cache.json`;
const CACHE_TTL_MS = 60_000;
// TOKEN-AWARENESS-MS0 / U-TA04: sidecar produced by token-awareness-sidecar.mjs
// statusline READS it for richer zone+quota display; statusline itself never writes it.
// 180s — kept equal to DEFAULT_STALE_TTL_MS (token-awareness-state.mjs) and
// precompact-auto-trigger's SIDECAR_TTL_MS. 60s false-flagged a healthy sidecar
// stale on any turn longer than a minute.
const TOKEN_AWARENESS_SIDECAR_TTL_MS = 180_000;
const STALE_HEARTBEAT_MS = 5 * 60_000;
const CTX_MAX = 1_000_000;            // Opus 4.7 1M context window
const BAR_WIDTH = 16;                 // chars per HP/MP bar
const HP_WARN = 0.60;                 // HP bar turns yellow at 60% fill (low-is-good)
const HP_CRIT = 0.85;                 // HP bar turns red at 85% fill
const MP_OK   = 0.30;                 // MP bar turns yellow above 30% (matches CLAUDE.md offload floor)
const MP_GOOD = 0.60;                 // MP bar turns green above 60% (high-is-good)
const REAPER_LIVE_WINDOW_MS = 10 * 60_000;
const OLLAMA_TIMEOUT_MS = 400;
const SCHTASKS_TIMEOUT_MS = 800;
const GIT_TIMEOUT_MS = 800;
const SLOT_LABEL_LEN = 3;
const TRANSCRIPT_TAIL_BYTES = 4 * 1024 * 1024;
const TELEMETRY_TAIL_BYTES = 256 * 1024;
const TOKEN_BYTES_PER_TOKEN = 3.5;
const DEFAULT_MP_BUDGET = 200_000;
const TASK_TRUNCATE = 60;
const MIN = 60_000;
const HOUR = 60 * MIN;
// Activity windows per subsystem — picked from observed write cadences.
const ACT = {
  viz:   { hot: 6 * HOUR,  cool: 24 * HOUR },
  obs:   { hot: 30 * MIN,  cool: 2  * HOUR },
  mem:   { hot: 2 * HOUR,  cool: 24 * HOUR },
  err:   { hot: 1 * HOUR,  cool: 6  * HOUR },
  scrut: { hot: 2 * HOUR,  cool: 12 * HOUR },
  bus:   { hot: 10 * MIN,  cool: 1  * HOUR },
};

// ─── stdin JSON ────────────────────────────────────────────────────────────
let raw = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) raw += chunk;
let cc = {};
try { cc = JSON.parse(raw); } catch { /* statusline must never throw */ }
const sid = cc.session_id || '';
const transcriptPath = cc.transcript_path || '';

// ─── helpers ───────────────────────────────────────────────────────────────
function safeJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }

// ─── slot lookup ───────────────────────────────────────────────────────────
const slotsDoc = safeJson(SLOTS_FILE) || { slots: {} };
const slotsObj = slotsDoc.slots || {};
let mySlot = '?';
for (const [name, data] of Object.entries(slotsObj)) {
  if (data && data.chatId && sid && (data.chatId === sid || sid.includes(data.chatId.replace(/^claude-/, '')))) {
    mySlot = name;
    break;
  }
}

// ─── context HP (tokens after last compact boundary) ──────────────────────
function estimateCtx(transcriptPath) {
  try {
    if (!transcriptPath) return { tokens: 0 };
    const stat = safeStat(transcriptPath);
    if (!stat) return { tokens: 0 };
    const tailWindow = Math.min(stat.size, TRANSCRIPT_TAIL_BYTES);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(tailWindow);
    fs.readSync(fd, buf, 0, tailWindow, stat.size - tailWindow);
    fs.closeSync(fd);
    const text = buf.toString('utf8');
    // Both compact-boundary formats via the shared lib (current compact_boundary
    // record + legacy isCompactSummary flag). The legacy-only scan silently
    // broke on the 2026-06 transcript format change -> whole-file count ->
    // inflated HP bar while the auto-compact gate read GREEN.
    const compactIdx = lastCompactMarkerOffset(text);
    const activeBytes = compactIdx >= 0 ? (tailWindow - compactIdx) : stat.size;
    return { tokens: Math.round(activeBytes / TOKEN_BYTES_PER_TOKEN) };
  } catch { return { tokens: 0 }; }
}
const ctx = estimateCtx(transcriptPath);
// ctxPct retired 2026-05-28 (HP-CTX-MODEL-AWARE) — superseded by ctxPctEffective
// downstream which prefers the sidecar's model-aware pct over a hardcoded denominator.

// MP-5H-QUOTA (slot alpha 2026-05-28 — U-MPQ01): per-chat 5h Anthropic
// quota burn from the token-awareness sidecar. Mirrors HP's "low-is-good"
// orientation (high pct = closer to throttle) which is the binding
// constraint at fleet scale — 26 chats share one 5h org-quota window.
// Promoted from the small `fhTag` tag that already read this value at
// statusline.mjs:402-405. Falls back to the prior offload-based MP when the
// sidecar has no quota signal (Claude Code <v1.2.80 / rateLimits not present),
// then to per-session token telemetry. Final fallback is a no-data placeholder.
function mpFrom5hQuota(taSidecarLocal) {
  if (!taSidecarLocal) return null;
  const fh = taSidecarLocal?.quota?.fiveHour;
  if (!fh) return null;
  const pct = Number(fh.pct);
  if (!Number.isFinite(pct) || pct < 0) return null;
  const used = Number(fh.used) || 0;
  const budget = Number(fh.budget) || 0;
  return { used, budget, pct: Math.min(1, pct), kind: 'quota5h' };
}

// ─── MP — Ollama offload rate (fleet-wide, cumulative since lastReset) ────
// Retained as fallback when no 5h quota signal exists.
// High-is-good: % of work routed to local Ollama vs Claude. Target ≥30% per CLAUDE.md.
function mpFromOffload() {
  try {
    const stats = safeJson(`${PRISM}/mcp-server/data/state/ollama-offload-stats.json`);
    if (!stats) return null;
    const off = Number(stats.offloaded) || 0;
    const kept = Number(stats.keptOnClaude) || 0;
    const total = off + kept;
    if (total === 0) return null;
    return { used: off, budget: total, pct: off / total, kind: 'offload' };
  } catch { return null; }
}
// ─── MP fallback — per-session token spend from token-budget telemetry ────
function mpFromTelemetry(sid) {
  try {
    const tbFile = `${PRISM}/state/shared/token-budget-telemetry.jsonl`;
    const stat = safeStat(tbFile);
    if (!stat) return null;
    const tail = Math.min(stat.size, TELEMETRY_TAIL_BYTES);
    const fd = fs.openSync(tbFile, 'r');
    const buf = Buffer.alloc(tail);
    fs.readSync(fd, buf, 0, tail, stat.size - tail);
    fs.closeSync(fd);
    let used = 0, budget = 0;
    for (const line of buf.toString('utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.sid === sid || ev.sessionId === sid) {
          if (typeof ev.used === 'number') used = ev.used;
          if (typeof ev.budget === 'number') budget = ev.budget;
        }
      } catch {}
    }
    if (used > 0) return { used, budget: budget || DEFAULT_MP_BUDGET };
    return null;
  } catch { return null; }
}

// ─── TOKEN-AWARENESS-MS0 / U-TA04+U-TA15 — read sidecar for richer display ──
// Sidecar is written by .claude/hooks/token-awareness-sidecar.mjs on every
// UserPromptSubmit/PostToolUse. We read it here but DEFER the colored-rendering
// to AFTER `C` is declared (line 302) — earlier the rendering used `C.grn` etc
// before `const C = {...}` was reached, triggering a TDZ ReferenceError and
// silently disabling the zone display fleet-wide (U-TA15 bug, 2026-05-20).
function readTokenAwarenessSidecar(slot) {
  if (!slot || slot === '?') return null;
  const fp = `${PRISM}/state/shared/token-budget-${slot}.json`;
  const s = safeJson(fp);
  if (!s || !s.capturedAt) return null;
  const age = Date.now() - Date.parse(s.capturedAt);
  if (!Number.isFinite(age)) return null;
  const stale = age > TOKEN_AWARENESS_SIDECAR_TTL_MS;
  // Single source of truth: return the sidecar EVEN when stale — annotated with
  // computed age/staleness. The HP bar then renders the SAME ctx number the
  // injected token-awareness block shows (with a ⚠stale flag), instead of
  // silently swapping to statusline's own estimateCtx() on staleness — a
  // different formula that made the bar and the tracker disagree.
  //
  // Mirror token-awareness-state.mjs `applyStaleness` doctrine: KEEP the real
  // measured zone when stale (do NOT bump GREEN->YELLOW). Staleness is a freshness
  // signal, not a budget signal -- the sidecar refreshes on every tool call, so a
  // stale read means IDLE (ctx stable), not unobserved growth. The _stale flag +
  // _ageMs carry the uncertainty; the bar shows "GREEN + stale" honestly rather
  // than fabricating "approaching budget" at e.g. 17% ctx (operator-reported
  // 2026-06-11). Kept consistent with the lib so bar + tracker agree.
  return { ...s, _ageMs: age, _stale: stale, zone: s.zone };
}
const taSidecar = readTokenAwarenessSidecar(mySlot);
// U-TA15: prefer sidecar's compact-boundary-aware count over our own
// estimateCtx() — sidecar uses 4 MB tail (8× wider window), is cached, and
// matches the precompact-auto-trigger's view of the world. The HP bar + token
// counter both pick up the more accurate number with no extra computation.
const ctxTokensFromSidecar = (taSidecar && Number.isFinite(Number(taSidecar?.ctx?.tokens)))
  ? Math.round(Number(taSidecar.ctx.tokens))
  : null;
const ctxTokensEffective = ctxTokensFromSidecar != null ? ctxTokensFromSidecar : ctx.tokens;
// HP-CTX-MODEL-AWARE (2026-05-28 alpha): prefer sidecar's model-aware maxTokens
// + pct over hardcoded 1M cap. The sidecar knows the active model's context
// window (1M for Opus 4.7, 200k for Sonnet 4.6, etc.) and writes both fields
// from a single source of truth. CTX_MAX stays as the fallback for the
// no-sidecar / cold-start path so the bar still renders before token-awareness
// fires. Without this fix a Sonnet chat at 150k showed HP=15% (looks fine)
// when it was actually 75% spent against the 200k window — bar lied.
const ctxMaxEffective = (taSidecar && Number.isFinite(Number(taSidecar?.ctx?.maxTokens)) && taSidecar.ctx.maxTokens > 0)
  ? Number(taSidecar.ctx.maxTokens)
  : CTX_MAX;
const sidecarPct = (taSidecar && Number.isFinite(Number(taSidecar?.ctx?.pct))) ? Number(taSidecar.ctx.pct) : null;
const ctxPctEffective = sidecarPct != null
  ? Math.min(1, sidecarPct)
  : Math.min(1, ctxTokensEffective / ctxMaxEffective);

// MP block relocated below taSidecar (U-MPQ01 TDZ fix, 2026-05-29 slot:bravo)
// MP source priority (U-MPQ01 alpha 2026-05-28):
//   1. 5h Anthropic quota burn (per-chat, low-is-good — same orientation as HP).
//      The binding constraint at 26-chat-fleet scale; promoted from the small
//      `fhTag` to the full MP bar so it gets one-glance attention.
//   2. Ollama offload rate (fleet-wide, high-is-good, inverted thresholds).
//      Fallback when the sidecar lacks the v1.2.80+ rateLimits field.
//   3. Per-session token-budget telemetry (low-is-good).
//   4. No-data placeholder.
// Never mirrors HP — MP must add a signal HP doesn't already show.
const mp = mpFrom5hQuota(taSidecar) ?? mpFromOffload() ?? mpFromTelemetry(sid) ?? { used: 0, budget: 0, kind: 'none' };
const mpPct = typeof mp.pct === 'number'
  ? mp.pct
  : (mp.budget > 0 ? Math.min(1, mp.used / mp.budget) : 0);
// Color inversion: high-is-good metrics flip the threshold semantics.
//   - offload: high pct = green (more local, less Claude burn)
//   - quota5h: high pct = red (closer to throttle — same as HP)
//   - telemetry/none: high pct = red (low-is-good token spend)
const mpInvert = mp.kind === 'offload';

// ─── service probes (cached 60s) ───────────────────────────────────────────
function readCache() {
  const c = safeJson(CACHE_FILE);
  if (c && (Date.now() - c.at) < CACHE_TTL_MS) return c;
  return null;
}
function writeCache(obj) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ at: Date.now(), ...obj }));
  } catch {}
}
function probeOllama(timeoutMs = OLLAMA_TIMEOUT_MS) {
  return new Promise(resolve => {
    const req = http.request(
      { host: '127.0.0.1', port: 11434, path: '/api/tags', method: 'GET', timeout: timeoutMs },
      res => { res.resume(); resolve(res.statusCode === 200); }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}
function probeDocker() {
  // Cheapest: did the autostart say daemon was ready?
  const drs = safeJson(DOCKER_STATE);
  if (drs?.steps?.docker_ready?.ok) return true;
  // Fallback: named-pipe stat on Windows
  try { fs.statSync('\\\\.\\pipe\\docker_engine'); return true; } catch {}
  return false;
}
function probeReaper() {
  // Live: kills/actions log written recently (<10min)
  for (const p of [REAPER_KILLS, REAPER_LOG]) {
    const stat = safeStat(p);
    if (stat && (Date.now() - stat.mtimeMs) < REAPER_LIVE_WINDOW_MS) return 'live';
  }
  // Fallback: scheduled task registered?
  try {
    execFileSync('schtasks.exe', ['/Query', '/TN', 'PRISM Fleet Reaper'],
      { stdio: ['ignore', 'pipe', 'ignore'], timeout: SCHTASKS_TIMEOUT_MS });
    return 'task';
  } catch { return 'off'; }
}

let svc = readCache();
if (!svc) {
  const docker = probeDocker();
  const ollama = await probeOllama();
  const reaper = probeReaper();
  svc = { docker, ollama, reaper };
  writeCache(svc);
}

// ─── current task ──────────────────────────────────────────────────────────
function currentTask(sid, mySlot) {
  // 1) /loop state for this session
  const loopFile = `${LOOP_DIR}/loop-${sid}.json`;
  const loop = safeJson(loopFile);
  if (loop && (loop.status === 'running' || loop.status === 'active')) {
    const target = loop.target || loop.task || '';
    const iter = loop.iter != null ? ` ·iter ${loop.iter}` : '';
    return `🔁 ${String(target).slice(0, TASK_TRUNCATE)}${iter}`;
  }
  // 2) Slot pipelineTarget
  const data = slotsObj[mySlot];
  if (data?.pipelineTarget) return `📋 ${String(data.pipelineTarget).slice(0, TASK_TRUNCATE)}`;
  // 3) Latest commit subject
  try {
    const subj = execFileSync('git', ['-C', PRISM, 'log', '-1', '--format=%s'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: GIT_TIMEOUT_MS }).trim();
    return `📌 ${subj.slice(0, TASK_TRUNCATE)}`;
  } catch { return ''; }
}
const task = currentTask(sid, mySlot);

// ─── feature activity (LED row) ────────────────────────────────────────────
function getMtime(p) { const s = safeStat(p); return s ? s.mtimeMs : null; }
function activityState(mtimeMs, hot, cool) {
  if (mtimeMs == null) return 'off';
  const age = Date.now() - mtimeMs;
  if (age < hot)  return 'on';
  if (age < cool) return 'cool';
  return 'stale';
}
const features = [
  { tag: 'viz',   state: activityState(getMtime(`${PRISM}/state/shared/system-viz/system-graph.json`), ACT.viz.hot, ACT.viz.cool) },
  (() => {
    // OBS — real wiki-recall usage from wiki-recall-counts.json (24h window).
    // Replaces the binary "hook exists" check with an actual hit count so the
    // LED shows how much the obsidian/wiki brain is informing real work.
    try {
      const wrc = safeJson(`${PRISM}/mcp-server/data/state/wiki-recall-counts.json`);
      if (!wrc?.entries) return { tag: 'obs', state: 'off' };
      const cutoff = Date.now() - 24 * HOUR;
      let count = 0;
      for (const e of Object.values(wrc.entries)) {
        const t = Date.parse(e.lastSeenIso || '');
        if (Number.isFinite(t) && t >= cutoff) count += Number(e.count) || 0;
      }
      const state = count >= 20 ? 'on' : count >= 1 ? 'cool' : 'stale';
      return { tag: 'obs', state, count };
    } catch { return { tag: 'obs', state: 'off' }; }
  })(),
  { tag: 'mem',   state: activityState(getMtime(`C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`), ACT.mem.hot, ACT.mem.cool) },
  { tag: 'err',   state: activityState(getMtime(`${PRISM}/state/shared/ERROR_LEDGER.jsonl`), ACT.err.hot, ACT.err.cool) },
  { tag: 'scrut', state: activityState(getMtime(`${PRISM}/mcp-server/data/state/SCRUTINY_LEDGER.json`), ACT.scrut.hot, ACT.scrut.cool) },
  { tag: 'karp',  state: fs.existsSync(`${PRISM}/.claude/hooks/karpathy-discipline-inject.mjs`) ? 'on' : 'off' },
  { tag: 'rtk',   state: fs.existsSync('H:/.claude/bin/rtk.exe') ? 'on' : 'off' },
  { tag: 'bus',   state: activityState(getMtime(`${PRISM}/state/shared/AGENT_CHAT.jsonl`), ACT.bus.hot, ACT.bus.cool) },
];

// ─── worktree map (slot → branch) ──────────────────────────────────────────
function getWorktreeMap() {
  try {
    const out = execFileSync('git', ['-C', PRISM, 'worktree', 'list', '--porcelain'],
      { encoding: 'utf8', stdio: ['ignore','pipe','ignore'], timeout: GIT_TIMEOUT_MS });
    const map = {};
    let curPath = null;
    for (const line of out.split('\n')) {
      if (line.startsWith('worktree ')) curPath = line.slice(9);
      else if (line.startsWith('branch ') && curPath) {
        const branch = line.slice(7).replace(/^refs\/heads\//, '');
        const m = curPath.match(/prism-slot-([a-z]+)$/i);
        if (m) map[m[1].toLowerCase()] = branch;
        else if (curPath.toLowerCase().endsWith('/prism')) map.__main = branch;
      }
    }
    return map;
  } catch { return {}; }
}
const wtMap = getWorktreeMap();

// ─── ANSI + render ─────────────────────────────────────────────────────────
const C = {
  R: '\x1b[0m', B: '\x1b[1m', D: '\x1b[2m',
  red: '\x1b[31m', grn: '\x1b[32m', ylw: '\x1b[33m', blu: '\x1b[34m',
  mag: '\x1b[35m', cyn: '\x1b[36m', gry: '\x1b[90m',
  blk: '\x1b[30m',                                  // text outline color
  // Bright backgrounds (100-107) — lighter shades give better contrast for black text
  bgRed: '\x1b[101m', bgGrn: '\x1b[102m', bgYlw: '\x1b[103m',
  bgBlu: '\x1b[104m', bgMag: '\x1b[105m', bgCyn: '\x1b[106m',
};
function bar(pct, { width = BAR_WIDTH, invert = false } = {}) {
  const filled = Math.max(0, Math.min(width, Math.round(pct * width)));
  const color = invert
    ? (pct >= MP_GOOD ? C.grn : pct >= MP_OK ? C.ylw : C.red)   // high-is-good
    : (pct < HP_WARN ? C.grn : pct < HP_CRIT ? C.ylw : C.red);  // low-is-good
  return color + '█'.repeat(filled) + C.gry + '░'.repeat(width - filled) + C.R;
}
function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return String(n);
}

// Party — render ALL slots always; tri-state: alive / stale / empty.
// Slot list derives from the already-loaded chat-slots state object — its keys
// are seeded from SLOT_NAMES in .claude/helpers/chat-slots.mjs — so the bar
// tracks fleet expansion (alpha..zulu) with no statusline edit. Never hard-code.
const SLOT_NAMES = Object.keys(slotsObj);
const party = SLOT_NAMES.map(name => {
  const data = slotsObj[name];
  if (!data) return { name, state: 'empty', isMe: false };
  const hb = new Date(data.lastHeartbeat || 0).getTime();
  const alive = (Date.now() - hb) < STALE_HEARTBEAT_MS;
  return { name, state: alive ? 'alive' : 'stale', isMe: name === mySlot };
});
const partyStr = party.map(p => {
  const label = p.name.slice(0, SLOT_LABEL_LEN).toUpperCase();
  if (p.isMe) return `${C.B}${C.cyn}●${label}*${C.R}`;
  if (p.state === 'alive') return `${C.grn}●${label}${C.R}`;
  if (p.state === 'stale') return `${C.gry}○${label}${C.R}`;
  return `${C.gry}${C.D}·${label}${C.R}`;                  // empty slot
}).join(' ');

// Service cell — green ✓ when up, red ✗ when down, ◐ when scheduled but idle
function svcCell(label, state) {
  const ok = state === true || state === 'live' || state === 'task';
  const col = ok ? C.grn : C.red;
  const mark = state === 'live' ? '✓' : state === 'task' ? '◐' : ok ? '✓' : '✗';
  return `${C.D}${label}${C.R}:${col}${mark}${C.R}`;
}

// Window/tab title (OSC 0) — terminals honor this inline
const SLOT_UP = mySlot.toUpperCase();
const title = `⚔ ${SLOT_UP} — Claude`;
const osc = `\x1b]0;${title}\x07`;

// Slot badge — bright bg + bold black fg = "highlighter sticker" readable on any terminal theme.
// Clean 6-color cycle so adjacent slots look distinct; slot N and slot N+6 share a color.
const badgeColor = {
  alpha: C.bgRed,    bravo: C.bgBlu,    charlie: C.bgMag, delta: C.bgGrn,   echo: C.bgYlw,   foxtrot: C.bgCyn,
  golf:  C.bgRed,    hotel: C.bgBlu,    india:   C.bgMag, juliett: C.bgGrn, kilo: C.bgYlw,   lima:    C.bgCyn,
}[mySlot] || C.bgRed;
// Bold black text on bright colored bg → the contrast IS the outline.
const badge = `${badgeColor}${C.B}${C.blk} ${SLOT_UP} ${C.R}`;

// ─── U-TA15: zone badge + alert text (NOW safe — C is declared) ───────────
// Visual scheme:
//   Line 1 — slot badge + zone badge (only when zone != GREEN, saves real estate)
//   Line 2 — HP bar + MP bar + alert text (only when RED+; one-glance "do /compact")
// Zone badge mirrors the slot badge style — bright bg, bold black fg — so the
// operator sees the zone in their peripheral vision the same way they see slot.
const zoneBadge = (() => {
  if (!taSidecar) return '';
  const z = taSidecar.zone;
  if (z === 'GREEN') return ''; // save real estate when fine
  // Bright bg + bold black fg = "highlighter sticker", legible on any terminal theme
  // CRITICAL uses bgMag (magenta/violet) — distinguishable from RED's bgRed
  // so the operator can tell at a glance whether they're at the 95% wall
  // (CRITICAL — write handoff NOW) or still in the 85–95% band (RED — voluntary compact).
  const bg = z === 'CRITICAL' ? C.bgMag : z === 'RED' ? C.bgRed : z === 'YELLOW' ? C.bgYlw : C.bgGrn;
  const emoji = z === 'CRITICAL' ? '⛔' : z === 'RED' ? '🔴' : z === 'YELLOW' ? '🟡' : '🟢';
  const ctxPctStr = Math.round(ctxPctEffective * 100) + '%';
  return ` ${bg}${C.B}${C.blk} ${emoji} ${z} ctx ${ctxPctStr} ${C.R}`;
})();
// Optional 5h quota tag — Claude Code v1.2.80+ rate_limits
const fhPct = Number(taSidecar?.quota?.fiveHour?.pct);
const fhTag = Number.isFinite(fhPct)
  ? ` ${C.D}5h${C.R}${fhPct >= 0.85 ? C.red : fhPct >= 0.6 ? C.ylw : C.grn}${(fhPct * 100).toFixed(0)}%${C.R}`
  : '';
// One-glance alert text — only at RED+ to keep line2 clean otherwise
const alertText = (() => {
  if (!taSidecar) return '';
  const z = taSidecar.zone;
  if (z === 'CRITICAL') return `   ${C.red}${C.B}⛔ /compact NOW${C.R}`;
  if (z === 'RED')      return `   ${C.red}⚠ /compact recommended${C.R}`;
  return '';
})();
// Stale flag — sidecar older than the 180s TTL (computed in readTokenAwarenessSidecar)
const staleFlag = (taSidecar && taSidecar._stale === true) ? ` ${C.ylw}⚠stale${C.R}` : '';

// Output (4 lines)
// fhTag was a small 5h-quota indicator at line1's right edge. With U-MPQ01
// promoting 5h quota to the full MP bar, fhTag becomes redundant when
// mp.kind === 'quota5h' (same number twice on the same line). Suppress it
// then so line1 doesn't double-print the quota; keep it for offload/telemetry/none
// so the operator still sees quota burn somewhere on the screen.
const fhTagEffective = mp.kind === 'quota5h' ? '' : fhTag;
const line1 = `${osc}${badge}${zoneBadge}${fhTagEffective}${staleFlag}  ${task}`;
// MP metric tag — ⏱ = 5h quota burn (binding fleet-scale constraint, low-is-good);
// ⚡ = Ollama offload rate (target ≥30%, high-is-good); 🪙 = per-session token spend; · = no data
const mpTag = mp.kind === 'quota5h' ? '⏱' : mp.kind === 'offload' ? '⚡' : mp.kind === 'none' ? '·' : '🪙';
const mpLabel = mp.budget > 0 ? `${fmt(mp.used)}/${fmt(mp.budget)}` : '–/–';
const line2 = `${C.red}HP${C.R} ${bar(ctxPctEffective)} ${(ctxPctEffective*100).toFixed(0)}% ${C.D}${fmt(ctxTokensEffective)}/${fmt(ctxMaxEffective)}${C.R}   ` +
              `${C.blu}MP${C.R}${mpTag} ${bar(mpPct, { invert: mpInvert })} ${(mpPct*100).toFixed(0)}% ${C.D}${mpLabel}${C.R}` +
              alertText;
const line3 = `${C.D}🤝${C.R} ${partyStr}   ${svcCell('reaper', svc.reaper)} ${svcCell('ollama', svc.ollama)} ${svcCell('docker', svc.docker)}`;

// Worktrees per active slot — green=on own slot/<name>, yellow=on shared trunk,
// red=on another slot's branch (drift), grey=unknown.
const wtParts = party.filter(p => p.state !== 'empty').map(p => {
  const branch = wtMap[p.name] || slotsObj[p.name]?.branch || '';
  const tail = branch.replace(/^slot\//, '').replace(/^cad-fusion-live-ms0$/, 'ms0').slice(0, 14) || '?';
  let col;
  if (branch === `slot/${p.name}`) col = C.grn;
  else if (/^(main|master|cad-fusion-live-ms0|trunk)$/.test(branch)) col = C.ylw;
  else if (branch.startsWith('slot/')) col = C.red;
  else col = C.gry;
  const label = p.name.slice(0, SLOT_LABEL_LEN).toUpperCase();
  return `${C.D}${label}:${C.R}${col}${tail}${p.isMe ? '*' : ''}${C.R}`;
}).join(' ');
const wtSection = wtParts || `${C.gry}(no active slots)${C.R}`;

// Feature activity LEDs — green=hot, yellow=cool, grey=stale, dim=off/missing.
const featStr = features.map(f => {
  const col = f.state === 'on'   ? C.grn
            : f.state === 'cool' ? C.ylw
            : f.state === 'stale'? C.gry
            : C.D + C.gry;
  // Append count when telemetry is available (e.g. obs●192 = 192 wiki recalls/24h).
  const suffix = f.count != null ? `${f.count}` : '';
  return `${col}${f.tag}●${suffix}${C.R}`;
}).join(' ');

const line4 = `${C.D}🌳${C.R} ${wtSection}   ${C.D}✨${C.R} ${featStr}`;

process.stdout.write(`${line1}\n${line2}\n${line3}\n${line4}`);
