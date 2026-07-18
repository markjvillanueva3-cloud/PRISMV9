// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA04 — drift detection for chat slots.
//
// Two pure detectors covering the "orchestrate each chat to stay on task and
// avoid drifting" requirement:
//
//   detectStaleLoopTick(loopState, opts) — a /loop whose status==="running"
//     but whose lastTickAt is older than the staleness threshold has stalled
//     mid-iteration. The orchestrator can re-anchor the chat with a
//     /checkin-<slot> directive carrying the loop's original goal text.
//
//   detectTopicDrift(slotEntry, recentCommits, opts) — the slot's
//     advertised topic (chat-slots[name].topic) should appear as a [SCOPE]
//     tag in at least one recent commit. If the last N commits all bear
//     different SCOPE tags, the chat is working off-topic.
//
// Pure: no I/O. Tests inject fixtures via opts.now (epoch ms).
// R12: every "drift" return carries a `reason` string naming the signal.

export const DEFAULT_STALE_LOOP_TICK_MS = 15 * 60 * 1000; // 15 min
export const DEFAULT_TOPIC_DRIFT_LOOKBACK = 5;
export const DRIFT_KINDS = Object.freeze(["stale-loop-tick", "topic-drift", "none"]);

// Pure: classify a loopState envelope (from state/shared/loop-state/loop-<sid>.json).
// Expected shape: { status: "running"|..., lastTickAt: ISO, goal?, iter?, target? }.
// Returns { drift, reason, ageMs?, goal? }.
export function detectStaleLoopTick(loopState, opts = {}) {
  if (!loopState || typeof loopState !== "object") {
    return { drift: false, reason: "no-loop-state" };
  }
  if (loopState.status !== "running") {
    return { drift: false, reason: `loop-status-${loopState.status || "missing"}` };
  }
  const now = typeof opts.now === "number" ? opts.now : Date.now();
  const threshold = typeof opts.staleMs === "number" ? opts.staleMs : DEFAULT_STALE_LOOP_TICK_MS;
  const t = typeof loopState.lastTickAt === "string" ? Date.parse(loopState.lastTickAt) : NaN;
  if (!Number.isFinite(t)) {
    return { drift: false, reason: "lastTickAt-unparseable" };
  }
  const ageMs = now - t;
  if (ageMs < threshold) {
    return { drift: false, reason: "tick-fresh", ageMs };
  }
  return {
    drift: true,
    kind: "stale-loop-tick",
    reason: `loop-tick-stale:${ageMs}ms>=${threshold}ms`,
    ageMs,
    goal: typeof loopState.goal === "string" ? loopState.goal : null,
  };
}

// Pure: extract the [SCOPE-TAG] from a commit subject. Returns null if absent.
// Commit format per project convention: "[SCOPE]/U-ID: title" — the SCOPE
// captures from the first `[...]` block, ignoring a leading `[MAIN]` lane tag.
export function extractCommitScope(subject) {
  if (typeof subject !== "string") return null;
  const match = subject.match(/\[([^\]]+)\]/g);
  if (!match || match.length === 0) return null;
  // If the first tag is [MAIN] (lane label), prefer the SECOND tag (real scope).
  for (const tag of match) {
    const inner = tag.slice(1, -1).trim();
    if (inner === "MAIN") continue;
    return inner;
  }
  return null;
}

// Pure: do the most-recent N commit subjects carry any SCOPE matching the
// slot's advertised topic? Conservative: if topic is empty OR if any one of
// the recent commits matches, NO drift. (Tolerates legitimate context-switches
// across recent commits — drift fires only on sustained divergence.)
export function detectTopicDrift(slotEntry, recentCommits, opts = {}) {
  if (!slotEntry || typeof slotEntry !== "object") {
    return { drift: false, reason: "no-slot-entry" };
  }
  const topicRaw = typeof slotEntry.topic === "string" ? slotEntry.topic.trim() : "";
  if (topicRaw.length === 0) {
    return { drift: false, reason: "no-topic-advertised" };
  }
  if (!Array.isArray(recentCommits) || recentCommits.length === 0) {
    return { drift: false, reason: "no-recent-commits" };
  }
  const lookback = typeof opts.lookback === "number"
    ? Math.max(1, Math.min(opts.lookback, recentCommits.length))
    : Math.min(DEFAULT_TOPIC_DRIFT_LOOKBACK, recentCommits.length);
  const window = recentCommits.slice(0, lookback);

  // Normalize topic + scopes to a comparable token set. We do case-insensitive
  // substring match in either direction — the topic may be "bravo-zebra-
  // orchestrator-ms0" while the SCOPE is "ZEBRA-ORCHESTRATOR-MS0", and we want
  // those to match.
  const topicLc = topicRaw.toLowerCase();
  const scopes = window.map(c => extractCommitScope(c?.subject || c?.message || c)).filter(Boolean);
  if (scopes.length === 0) {
    return { drift: false, reason: "no-scopes-extracted" };
  }
  let anyMatch = false;
  const seenScopes = [];
  for (const s of scopes) {
    const sLc = s.toLowerCase();
    seenScopes.push(s);
    if (topicLc.includes(sLc) || sLc.includes(topicLc)) {
      anyMatch = true;
      break;
    }
  }
  if (anyMatch) {
    return { drift: false, reason: "topic-matches-recent" };
  }
  return {
    drift: true,
    kind: "topic-drift",
    reason: `topic-no-match:topic=${topicRaw};scopes=${seenScopes.join(",")}`,
    topic: topicRaw,
    seenScopes,
  };
}

// Pure: combined report — caller passes both signals + envelope, returns the
// strongest single recommendation. Stale-loop wins over topic drift (an
// actually-stalled loop is more urgent than a tangential commit history).
export function summarizeDrift(loopState, slotEntry, recentCommits, opts = {}) {
  const stale = detectStaleLoopTick(loopState, opts);
  if (stale.drift) return stale;
  const topic = detectTopicDrift(slotEntry, recentCommits, opts);
  if (topic.drift) return topic;
  return { drift: false, reason: stale.reason || topic.reason || "no-drift-signal" };
}
