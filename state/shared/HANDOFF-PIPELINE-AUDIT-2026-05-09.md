# Handoff Pipeline Audit — 6-Chat /compact Storm

**Date:** 2026-05-09
**Auditor:** claude-d9860be8 (resolved as claude-0be8c29c by stable-session-id — see GAP3)
**Scope:** precompact → handoff write → /compact → SessionStart → /startup → handoff read

## TL;DR

| Surface | Verdict | Notes |
|---------|---------|-------|
| `per-agent-handoff.mjs` atomic write | ✅ SAFE | tmp+rename via `atomicWriteSync` (lines 33-42); no lost-update path |
| `--source live-chat` writer ban | ✅ SAFE | hooks rejected; only live chat can write (2026-05-06 rule) |
| Topic suffix discipline | ✅ SAFE | `enforce-handoff-topic.mjs` Stop hook auto-renames topicless files; mtime-newer wins on collision |
| `session-id-pin.mjs` PID ancestry | ✅ SAFE | bulk WMIC single shellout, atomic write of `.active-sessions-by-pid.json`, in-memory ancestry walk |
| `precompact-pending-guard.mjs` | ⚠️ ADVISORY | reads PENDING_GAP_ENGINES + GOAL_STACK; **no `--mark` flag exists** — `/precompact` skill doc is stale |
| `stable-session-id.mjs` fallback chain | ❌ **3 SILENT-COLLISION GAPS** | see below |

**Net:** the storage layer is correct. The **identity-resolution layer** has 3 silent failure modes that misroute handoffs to the wrong chat. This audit landed the proof in real-time: my chat bus identity is `claude-d9860be8` but `stable-session-id.mjs` resolved me as `claude-0be8c29c` — the previous session's ID — because the PID-pin lookup failed and a fallback grabbed a stale fresh entry.

## Pipeline Trace

1. **/compact fires** → PreCompact hook chain runs (banned `precompact-handoff.mjs` no-ops; user must run `/precompact` skill in live chat first).
2. **`/precompact` skill** writes via `per-agent-handoff.mjs write --source live-chat --terminal "$STABLE"`. `$STABLE` comes from `node stable-session-id.mjs` — which is where the GAPs live.
3. **`per-agent-handoff.mjs cmdWrite`** atomically writes `HANDOFF-{stableId}-{topic}.md`. Topic auto-derived from commit scope / CURRENT_POSITION.md / branch.
4. **/compact runs**, summarizes conversation.
5. **SessionStart hook chain** rebuilds awareness. `session-id-pin.mjs` (UserPromptSubmit + SessionStart) bulk-loads (pid,ppid) via WMIC, walks our ancestry, writes `.active-sessions-by-pid.json` with the new session_id pinned to every ancestor PID.
6. **/startup Step 1B** invokes `per-agent-handoff.mjs read --terminal "$STABLE"`. `$STABLE` resolves via the same chain. **If chain hits a fallback that returns the wrong ID, /startup reads the wrong chat's handoff.**

## The 3 Gaps (`H:/prism/.claude/helpers/stable-session-id.mjs`)

### GAP 1 — Time-slot fallback silently collides 6 chats (lines 236-239)

```js
// (5) Fallback: machine + 15-min time slot (degraded — rotates every 15 min)
const machine = os.hostname() || "unknown";
const timeSlot = Math.floor(Date.now() / (15 * 60 * 1000));
return `slot-${machine}-${timeSlot}`;
```

If all 6 chats hit this fallback within the same 15-min window (post-reboot, post-/compact storm) they all get the **same** ID. Subsequent handoff writes silently overwrite each other. There's no signal — no error, no warning, no log line.

**Fix:** return `null`. Force the caller (per-agent-handoff.mjs, /startup) to surface "no resolved session ID" rather than pin 6 chats onto one identity.

### GAP 2 — Transcript-mtime fallback flips winner under concurrent writers (lines 91-107)

```js
let best = null;
for (const pd of projectDirs) {
  // ... scan .jsonl files ...
  for (const j of jsonls) {
    const fp = path.join(full, j);
    const mt = fs.statSync(fp).mtimeMs;
    if (!best || mt > best.mtime) {
      best = { mtime: mt, id: j.replace(/\.jsonl$/, "") };
    }
  }
}
if (best && (Date.now() - best.mtime) < TRANSCRIPT_ACTIVE_MS) {
  return best.id;
}
```

When 6 chats are actively writing their transcripts, "most-recently-modified .jsonl" rotates between all 6 every few hundred ms. The 5-min freshness window is meaningless — every chat appears fresh.

**Fix:** gate behind `PRISM_ALLOW_TRANSCRIPT_FALLBACK=1` env var. Default off. Single-chat dev still works by setting the env; multi-chat prod gets deterministic-or-explicit-failure.

### GAP 3 — Dead "single-fresh" branch unreachable with N>1 (lines 143-144)

```js
const uniqueSids = [...new Set(Object.values(fresh).map(e => e.session_id))];
if (uniqueSids.length === 1) return uniqueSids[0];
return null;
```

This branch only fires when exactly ONE unique session is fresh. With 6 concurrent chats, `uniqueSids.length === 6` always. Falls through to `null`, then upstream caller hits GAP 1.

**Fix:** disambiguate by `cwd`. Each chat runs in its own worktree; fresh pins whose `entry.cwd === process.cwd()` likely belong to THIS chat.

## Other Races Considered (verdict: not load-bearing)

- **Topic-collision rename race** in `enforce-handoff-topic.mjs:120-148`: two chats both end up with topicless `HANDOFF-{id}.md` and try to rename to the same `{id}-{topic}.md`. Outcome: mtime-wins; one wins, one loses content. Real risk only if topic collision *and* same chat ID — which already requires GAP1/2/3 to fire first.
- **`.active-sessions-by-pid.json` lost-update**: `session-id-pin.mjs` does atomic write but doesn't lock during read-modify. If two SessionStart hooks fire within ~1ms across two chats, the second write wins. Damage bounded — only ancestor entries from the loser are dropped, both writers still pin under their own PID. GC on next fire restores. Accept.

## Recommended Fixes (ranked by impact)

1. **GAP3 cwd-disambiguation** (highest): single most likely route to recover correct identity for 6-chat case. Patch is ~10 lines.
2. **GAP1 remove time-slot fallback** (highest): silent → loud. Forces visible failure instead of cross-chat clobber.
3. **GAP2 env-gate transcript fallback**: removes the noisiest false positive.
4. **/precompact skill doc**: remove `node ... precompact-pending-guard.mjs --mark` line. Flag does not exist.

## Chat-Bus Broadcast (post on completion)

```
AUDIT COMPLETE: handoff pipeline storage = SAFE; identity resolution = 3 GAPS in stable-session-id.mjs.
Patches applied to GAP1 (return null), GAP2 (env gate), GAP3 (cwd disambiguation).
Smoke-tested. /precompact skill doc has stale --mark instruction; not auto-fixed (peer chats may rely on it).
```
