/**
 * fleet-reaper-crash-watch.mjs — FLEET-REAPER-MS1 U-FR-CRASH-WATCH
 *
 * The reaper kills orphan PROCESSES but is BLIND to chat CRASHES — it never
 * reconciles "slot X's chat just died" into an actionable signal. When 1-2
 * chats keep crashing the operator has no forensic trail (which slot, when,
 * at what heartbeat age, under what memory pressure).
 *
 * This module is the missing detection layer. It is STRICTLY ADDITIVE — it
 * never changes a reap decision. It only:
 *   1. snapshots per-slot { chatId, lastHeartbeatMs } each sweep,
 *   2. diffs against the previous sweep's snapshot,
 *   3. flags slots whose heartbeat FROZE while the chatId stayed the same
 *      (a live chat heartbeats every prompt; a crashed one's lastHeartbeat
 *      stops advancing — chatId change = intentional re-claim, NOT a crash),
 *   4. writes a postmortem JSONL row + surfaces a count.
 *
 * Pure core + injected IO — fully testable without a real filesystem.
 *
 * KNOB: PRISM_FR_CRASH_WATCH_DISABLE=1 (checked by the sweep caller, not here).
 */

export const CRASH_WATCH_SCHEMA_VERSION = 1;
// A slot whose heartbeat hasn't advanced for >= this AND whose chatId is
// unchanged is treated as crashed. 10 min mirrors process-slot-map's
// "owned-by-crashed" heartbeat threshold so the two layers agree.
export const DEFAULT_CRASH_STALE_MS = 10 * 60 * 1000;
export const CRASH_WATCH_LOG_ROTATE_BYTES = 256 * 1024;

/**
 * Parse a chat-slots.json content object into a flat per-slot snapshot.
 * Pure. Tolerates the two on-disk shapes (`{slots:{...}}` and flat).
 *
 * @param {object} slotsData — parsed chat-slots.json
 * @param {number} now       — wall-clock ms
 * @returns {{ts:number, slots:Record<string,{chatId:string,lastHeartbeatMs:number}>}}
 */
export function snapshotSlotState(slotsData, now) {
  const out = { ts: Number.isFinite(now) ? now : Date.now(), slots: {} };
  if (!slotsData || typeof slotsData !== "object") return out;
  const map = (slotsData.slots && typeof slotsData.slots === "object")
    ? slotsData.slots : slotsData;
  for (const [slot, state] of Object.entries(map)) {
    if (!state || typeof state !== "object") continue;
    if (typeof state.chatId !== "string" || !state.chatId) continue;
    const hbMs = Date.parse(state.lastHeartbeat);
    out.slots[slot] = {
      chatId: state.chatId,
      lastHeartbeatMs: Number.isFinite(hbMs) ? hbMs : null,
    };
  }
  return out;
}

/**
 * Diff a previous snapshot against the current one. Pure.
 *
 * A slot is a CRASH iff ALL hold:
 *   - present in BOTH prev and curr,
 *   - curr.chatId === prev.chatId (chatId change = re-claim, never a crash),
 *   - curr.lastHeartbeatMs === prev.lastHeartbeatMs (heartbeat did NOT advance
 *     between the two sweeps -- a live chat always advances it),
 *   - now - curr.lastHeartbeatMs >= staleMs (frozen long enough to be real,
 *     not just a slow sweep cadence),
 *   - curr.lastHeartbeatMs is a finite number (a null heartbeat can't be
 *     reasoned about -- skip rather than false-positive),
 *   - AND, when a liveness gate is supplied (opts.deadSlots), the slot is
 *     CONFIRMED window-pid-dead. A frozen heartbeat ALONE is NOT a crash: an
 *     idle-but-alive chat (operator away -> no prompts -> heartbeat frozen, but
 *     the terminal window + process live on) has a frozen heartbeat yet is
 *     NOT crashed. opts.deadSlots is a Set of `${slot} ${chatId}` keys for the
 *     slots a reclaim WOULD actually free (heartbeat-crashed AND window-pid-dead,
 *     from chat-slots.previewReclaimable) -- matched on slot AND chatId so a
 *     re-claim race can't slip a live chat through. When opts.deadSlots is absent
 *     the gate is skipped (back-compat: a caller with no liveness signal keeps
 *     the heartbeat-only behavior). This mirrors the reclaim side, which already
 *     refuses to free a window-pid-alive slot -- detection now stops crying wolf
 *     for live windows the same way reclaim does.
 *
 *     FORENSIC LATENCY: deadSlots derives from previewReclaimable, whose window
 *     liveness is primarily transcript-mtime freshness (~4h default). So a
 *     genuinely crashed chat is suppressed from the postmortem for up to ~4h
 *     after death, then recorded once its transcript ages out -- a DELAY, never
 *     a permanent miss (the persisted snapshot re-fires it every sweep). This
 *     trades real-time crash forensics for zero idle-but-alive false rows, by
 *     design; the operator still has chat-slots.json for a real-time signal.
 *
 * Re-emission (NOT dedup): this re-emits the SAME crash every sweep while
 * prev/curr stay frozen (the persisted snapshot keeps
 * prev.lastHeartbeatMs === curr.lastHeartbeatMs); only a chatId change (reclaim)
 * clears it. The deadSlots gate removes the idle-but-alive false rows, but a
 * genuinely dead-window crash still appends one row per sweep until reclaim --
 * a caller wanting once-per-crash must dedupe on (slot, chatId, lastHeartbeatMs).
 *
 * @param {object} prev
 * @param {object} curr
 * @param {number} now
 * @param {number} [staleMs]
 * @param {{deadSlots?:Set<string>}} [opts] deadSlots: Set of `${slot} ${chatId}`
 *        keys confirmed window-pid-dead. When a Set, every crash must be a member.
 * @returns {Array<{slot,chatId,lastHeartbeatMs,frozenMs,sweepGapMs}>}
 */
export function detectCrashes(prev, curr, now, staleMs = DEFAULT_CRASH_STALE_MS, opts = {}) {
  const crashes = [];
  if (!prev || !curr || typeof prev !== "object" || typeof curr !== "object") return crashes;
  const prevSlots = prev.slots || {};
  const currSlots = curr.slots || {};
  const nowMs = Number.isFinite(now) ? now : Date.now();
  const floor = Number.isFinite(staleMs) && staleMs > 0 ? staleMs : DEFAULT_CRASH_STALE_MS;
  // Optional window-liveness gate. A Set => require confirmed window-pid-dead;
  // anything else (undefined/null) => no gate (heartbeat-only back-compat).
  const deadSlots = opts && opts.deadSlots instanceof Set ? opts.deadSlots : null;
  for (const [slot, c] of Object.entries(currSlots)) {
    const p = prevSlots[slot];
    if (!p) continue;                                  // new this sweep -- no prior to diff
    if (c.chatId !== p.chatId) continue;               // re-claim, not a crash
    if (!Number.isFinite(c.lastHeartbeatMs)) continue; // can't reason about null hb
    if (c.lastHeartbeatMs !== p.lastHeartbeatMs) continue; // heartbeat advanced -> alive
    const frozenMs = nowMs - c.lastHeartbeatMs;
    if (frozenMs < floor) continue;                    // not frozen long enough yet
    // Frozen heartbeat is necessary but NOT sufficient -- an idle-but-alive chat
    // also has a frozen heartbeat. When a gate is supplied, require the slot be
    // confirmed window-pid-dead (matched on slot AND chatId).
    if (deadSlots && !deadSlots.has(`${slot} ${c.chatId}`)) continue;
    crashes.push({
      slot,
      chatId: c.chatId,
      lastHeartbeatMs: c.lastHeartbeatMs,
      frozenMs,
      sweepGapMs: Number.isFinite(curr.ts) && Number.isFinite(prev.ts)
        ? curr.ts - prev.ts : null,
    });
  }
  return crashes;
}

/**
 * Build a postmortem JSONL row object from a detected crash. Pure.
 *
 * @param {object} crash — one element of detectCrashes()
 * @param {object} ctx   — { memUsedPct, pressureTier, now }
 */
export function formatPostmortemRow(crash, ctx = {}) {
  const nowMs = Number.isFinite(ctx.now) ? ctx.now : Date.now();
  return {
    schemaVersion: CRASH_WATCH_SCHEMA_VERSION,
    ts: new Date(nowMs).toISOString(),
    kind: "chat-crash",
    slot: crash.slot,
    chatId: crash.chatId,
    lastHeartbeatIso: Number.isFinite(crash.lastHeartbeatMs)
      ? new Date(crash.lastHeartbeatMs).toISOString() : null,
    frozenMs: crash.frozenMs,
    frozenMinutes: Number.isFinite(crash.frozenMs)
      ? Math.round(crash.frozenMs / 60000) : null,
    sweepGapMs: crash.sweepGapMs ?? null,
    memUsedPct: Number.isFinite(ctx.memUsedPct) ? ctx.memUsedPct : null,
    pressureTier: typeof ctx.pressureTier === "string" ? ctx.pressureTier : null,
  };
}

// ─── Injected-IO helpers (all fail-soft — crash-watch must never abort a sweep) ──

/**
 * Read the previous snapshot. Returns null on any failure (first run,
 * corrupt file, missing). Caller treats null as "no prior — skip detection".
 */
export function readPrevSnapshot(path, readImpl) {
  try {
    const raw = readImpl(path);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.slots) return null;
    return parsed;
  } catch { return null; }
}

/**
 * Atomically persist the current snapshot (tmp + rename). Fail-soft —
 * returns {ok:boolean,error?}. A failed persist only means the NEXT sweep
 * can't diff (no crash false-positive, no abort).
 */
export function writeSnapshot(path, snapshot, io) {
  try {
    const tmp = `${path}.tmp.${io.pid || process.pid}`;
    io.write(tmp, JSON.stringify(snapshot));
    io.rename(tmp, path);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

/**
 * Append postmortem rows as JSONL, rotating the file if it exceeds the
 * size cap. Fail-soft — returns {ok, written, error?}.
 */
export function appendPostmortems(rows, path, io) {
  if (!Array.isArray(rows) || rows.length === 0) return { ok: true, written: 0 };
  try {
    let size = 0;
    try { size = io.size(path); } catch { size = 0; }
    if (Number.isFinite(size) && size >= CRASH_WATCH_LOG_ROTATE_BYTES) {
      try { io.rotate(path, `${path}.1`); } catch { /* best-effort rotate */ }
    }
    const blob = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
    io.append(path, blob);
    return { ok: true, written: rows.length };
  } catch (e) {
    return { ok: false, written: 0, error: String(e?.message || e) };
  }
}
