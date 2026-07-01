// live-fleet-heartbeat-push.mjs
// ZULU Master Galaxy — Real-time slot heartbeat pusher
// Appends to state/shared/live-fleet-heartbeat.jsonl on every turn (throttled)

import fs from 'fs';
import path from 'path';

const HEARTBEAT_FILE = path.resolve('H:/prism/state/shared/live-fleet-heartbeat.jsonl');
const THROTTLE_MS = 60000; // 1 per minute per slot

let lastPush = {};

export async function onUserPromptSubmit(context) {
  const slot = context.slot || 'unknown';
  const now = Date.now();
  if (lastPush[slot] && (now - lastPush[slot]) < THROTTLE_MS) return;

  const heartbeat = {
    ts: new Date().toISOString(),
    slot,
    lane: context.lane || 'unspecified',
    current: context.current || null,
    next: context.next || null,
    rss_mb: Math.round((process.memoryUsage?.().rss || 0) / 1024 / 1024),
    status: context.status || 'active',
    chatId: context.chatId || null
  };

  try {
    fs.appendFileSync(HEARTBEAT_FILE, JSON.stringify(heartbeat) + '\n');
    lastPush[slot] = now;
  } catch (e) {
    // Silent fail — do not block user turn
    console.error('[live-fleet-heartbeat] append failed:', e.message);
  }
}

export async function onTurnEnd(context) {
  // Optional: push again at turn end if needed
  // Currently throttled on prompt submit
}

// Register hook (PRISM/Hermes compatible)
export default { onUserPromptSubmit, onTurnEnd };