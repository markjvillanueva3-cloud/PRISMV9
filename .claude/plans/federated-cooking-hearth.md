# Slot-Binding Truth Enforcement — kill the "two chats in echo" class of bug

## Context

The user reported: *"theres already another chat logged into echo, we need to fix this so it can't happen."*

The investigation shows there isn't actually a double-claim in `chat-slots.json` — the truth file is consistent: I (claude-2081f435) am in **foxtrot**, not echo. Echo is correctly held by claude-a61bbf34.

The collision is in the *conversation's belief*: the pre-/compact handoff froze prose like "Slot echo, terminal tw-ps-24592" into its RESUME directive. After /compact, the slot was reclaimed by another chat during the multi-minute downtime, and the new session claimed `foxtrot` via terminal-pin's default walk. `session-start-auto-resume.mjs` then injected the OLD RESUME verbatim, so the post-/compact conversation walked around claiming to be in echo while chat-slots said foxtrot.

That gap — *the conversation can claim a slot it doesn't actually hold* — is what makes the user-visible bug feel like a double-claim. The fix has three defenses, prioritized by how directly each one kills the symptom:

| Layer | Where the lie lives | Where the fix goes |
|---|---|---|
| A. Cross-check (primary) | RESUME prose injected at SessionStart | `session-start-auto-resume.mjs` |
| B. Heartbeat protection (upstream) | Slot decays during /compact downtime | `precompact-handoff.mjs` |
| C. Live-collision guard (defense in depth) | `claimSlot` overwrites live chatIds | `chat-slots.mjs` terminal-pin branch |

All three are independent and additive. Each closes a different cause of the same class of bug.

## Plan

### Phase 1 — Layer A: auto-resume cross-checks the live slot
**File:** `H:/prism/.claude/hooks/session-start-auto-resume.mjs`

Before injecting the RESUME directive, query the actual slot from chat-slots and prepend a truth-banner. If the handoff filename embeds a slot name (the `<slot>-<topic>` convention precompact-handoff.mjs already uses), parse it and compare.

```javascript
import { findSlotForChat } from "H:/prism/.claude/helpers/chat-slots.mjs";

function parseSlotFromHandoffFile(filePath) {
  // HANDOFF-<instance>-<slot>-<topic>.md  → "<slot>"  (when slot prefix present)
  const m = /HANDOFF-[^-]+-([a-z]+)-/.exec(filePath || "");
  const SLOT_NAMES = new Set(["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett"]);
  return (m && SLOT_NAMES.has(m[1])) ? m[1] : null;
}

// In main(), after extractResume() succeeds:
let slotTruth;
try { slotTruth = findSlotForChat(chatId); } catch { slotTruth = null; }
const liveSlot = slotTruth?.slot || null;
const handoffSlot = parseSlotFromHandoffFile(handoff.file);

let slotBanner;
if (!liveSlot) {
  slotBanner = `⚠ **No slot currently owned by this chat** (chat-slots.json). The handoff RESUME below may reference a slot that has been reclaimed. Run \`/checkin\` to claim a slot before relying on slot-specific RESUME prose.`;
} else if (handoffSlot && handoffSlot !== liveSlot) {
  slotBanner = `⚠ **Slot drift during /compact**: handoff was written from slot \`${handoffSlot}\`, but this chat now holds slot \`${liveSlot}\`. Trust \`chat-slots.json\` (slot \`${liveSlot}\`), not slot prose in the RESUME directive below.`;
} else {
  slotBanner = `**Current slot: ${liveSlot}** (chat-slots.json — verified at SessionStart)`;
}
// Prepend slotBanner above the resume in additionalContext
```

This makes it physically impossible for the conversation to *silently* believe it's in a slot it doesn't hold. Either the banner says "you're in foxtrot now" or it says "you have no slot — go /checkin." The user-visible symptom dies here.

**Knob:** `PRISM_AUTO_RESUME_SLOT_CHECK_DISABLE=1` for emergency. Default is on.

---

### Phase 2 — Layer B: precompact protects the heartbeat
**File:** `H:/prism/.claude/helpers/precompact-handoff.mjs`

The PreCompact hook already reads chat-slots to pick `slotPrefix` (line 400-412). It should *also* call `heartbeat()` for this chatId at that moment, **and** forward-date `lastHeartbeat` by a configurable grace window so the multi-minute compact downtime can't trip the 10-min `CRASH_TTL_MS`.

```javascript
import { heartbeat } from "H:/prism/.claude/helpers/chat-slots.mjs";

// Inserted near line 400, before the slotPrefix lookup loop:
const COMPACT_GRACE_MS = Number(process.env.PRISM_COMPACT_SLOT_GRACE_MS) || 5 * 60 * 1000;
try {
  // Refresh heartbeat AND mark a forward-dated lastHeartbeat so the slot
  // survives the typical /compact downtime (2-4 min) without falling into
  // CRASH_TTL_MS (10 min). The forward-date is bounded by COMPACT_GRACE_MS;
  // we never exceed 9 min so the safety floor still triggers if a session
  // genuinely crashes during compact.
  heartbeat({
    chatId: identity.instance,
    activity: "precompact-handoff-write",
    // forwardDateMs is a new optional field on heartbeat() — see Phase 2b
    forwardDateMs: Math.min(COMPACT_GRACE_MS, 9 * 60 * 1000),
  });
} catch { /* best-effort — never block /compact over heartbeat */ }
```

**Phase 2b — `heartbeat()` accepts `forwardDateMs`** (additive, backward-compat):
In `H:/prism/.claude/helpers/chat-slots.mjs`, `refreshState()` already writes `lastHeartbeat: new Date().toISOString()`. Extend it to honor `input.forwardDateMs` (bounded to ≤ `9 * 60 * 1000` so it can't disable the CRASH_TTL entirely):

```javascript
function refreshState(prev, input) {
  const nowMs = Date.now();
  const fwd = (typeof input.forwardDateMs === "number" && input.forwardDateMs > 0)
    ? Math.min(input.forwardDateMs, 9 * 60 * 1000)
    : 0;
  return {
    ...prev,
    lastHeartbeat: new Date(nowMs + fwd).toISOString(),
    // ... rest unchanged
  };
}
```

**Knob:** `PRISM_COMPACT_SLOT_GRACE_MS=300000` (default 5min). Cap is hard-coded at 9min to stay under CRASH_TTL_MS.

---

### Phase 3 — Layer C: terminal-pin refuses live-chatId collisions
**File:** `H:/prism/.claude/helpers/chat-slots.mjs`

The terminal-pin block (lines 319-344) currently inherits *any* slot matching the windowId — including slots held by a live, different chatId. This is intentional for /compact (same window, new chatId), but if the `terminal-window-id.mjs` resolver returns the *same* windowId for two different real windows (PID collision in a fallback tier, or wmic flake), both chats inherit the same slot and ping-pong.

Guard: in the terminal-pin branch, when `s.chatId !== input.chatId`, check whether the existing slot's `lastHeartbeat` is recent (within `LIVE_INHERIT_GUARD_MS`, default 60s). If yes, refuse the inheritance — fall through to default walk; surface `windowCollision: true` in the result so the hook caller can warn.

```javascript
const LIVE_INHERIT_GUARD_MS = Number(process.env.PRISM_LIVE_INHERIT_GUARD_MS) || 60 * 1000;

let windowCollisionDetected = false;
if (typeof input.terminalWindowId === "string" && input.terminalWindowId.length > 0) {
  for (const n of SLOT_NAMES) {
    const s = file.slots[n];
    if (s && s.terminalWindowId === input.terminalWindowId) {
      // LIVE-COLLISION GUARD: if a DIFFERENT chatId holds this slot AND its
      // heartbeat is fresh, refuse to overwrite — falls through to the
      // default walk and surfaces a collision flag for the hook to log.
      if (s.chatId !== input.chatId) {
        const lastHbMs = Date.parse(s.lastHeartbeat);
        const ageMs = Number.isFinite(lastHbMs) ? (now - lastHbMs) : Infinity;
        if (ageMs < LIVE_INHERIT_GUARD_MS) {
          windowCollisionDetected = true;
          continue;  // skip — don't inherit this slot, look at others or fall through
        }
      }
      // ... (rest of inheritance branch unchanged: build inherited, write, return)
    }
  }
}
// If we fell out of the loop without inheriting AND windowCollisionDetected,
// the result returned from the eventual freshState() walk below gets the
// windowCollision flag attached.
```

The `session-start-terminal-pin.mjs` hook surfaces `windowCollision: true` as an additionalContext warning:

```
⚠ Terminal-window collision detected: slot 'echo' is held by claude-XYZ
(heartbeat 12s ago) but your window resolver returned the same windowId
(tw-ps-24592). Two live chats cannot share a windowId. Your terminal-window-id
resolver may be returning a degraded tier — see [[reference_twid_resolver_cache_2026_05_15]].
This chat will claim a fresh slot via the default walk.
```

**Knob:** `PRISM_LIVE_INHERIT_GUARD_MS=60000` (default 60s).

---

### Phase 4 — Tests (per-file scrutiny doctrine applies)

| Test file | What it covers | New cases |
|---|---|---|
| `H:/prism/.claude/helpers/chat-slots.test.mjs` | `heartbeat({forwardDateMs})` + terminal-pin live-collision guard | +12: forward-date bounded by 9min cap, live-collision guard fires, guard skipped when heartbeat stale, guard skipped when same chatId, windowCollision flag surfaced |
| `H:/prism/.claude/hooks/__tests__/session-start-auto-resume.test.mjs` *(new file)* | slot cross-check banner emission | +8: no-slot banner, drift banner, in-sync banner, parseSlotFromHandoffFile happy + 4 edge cases (no slot in filename, unknown slot name, empty path, slot at wrong segment) |
| `H:/prism/.claude/helpers/precompact-handoff.test.mjs` | heartbeat refresh in main() | +4: heartbeat called with forwardDateMs, never throws on heartbeat failure, knob disables forward-date, fwd capped at 9min |

Per-file scrutiny: after each of the 3 source files is edited, dispatch **2 parallel reviewer agents** (content reviewer A + independent second-pass reviewer B) before moving to the next file. Both review end-to-end. Fix all P0/P1 findings before proceeding.

---

### Phase 5 — Close-out

1. **Verify on the live state**: run `node H:/prism/.claude/helpers/chat-slots.mjs find --chatId claude-2081f435` — should return slot=foxtrot. Confirm.
2. **Per-file scrutiny PASS/PASS for all 3 source files** before commit.
3. **End-of-task 3-of-3 scrutiny gate**: code-analyzer + 2 Claude reviewers via `node H:/prism/.claude/scripts/scrutiny-3way.mjs --session-id <id>`.
4. **Commit format**: `[SLOT-BINDING-MS0]/U-SLOT-TRUTH: enforce slot truth — auto-resume cross-checks, precompact heartbeat grace, terminal-pin live-collision guard`.
5. **Memory file**: `reference_slot_binding_truth_2026_05_15.md` — covers the bug class + 3 defenses + knobs.
6. **MEMORY.md index entry** — one line.
7. **Wiki entry**: `H:/prism/knowledge/wiki/architecture/slot-binding-truth.md`.
8. **CLAUDE.md update**: short section in §SESSION CONTINUITY STACK referencing the 3 defenses + the new knobs.
9. **Handoff** with fresh RESUME pointing at next work (return to U-PPL-C2 or operator-directed next unit).

---

## Critical files to modify
- `H:/prism/.claude/hooks/session-start-auto-resume.mjs` (~30 LOC added near main())
- `H:/prism/.claude/helpers/precompact-handoff.mjs` (~15 LOC added near slotPrefix lookup at line 400)
- `H:/prism/.claude/helpers/chat-slots.mjs` (~25 LOC added in `claimSlot` terminal-pin branch + `refreshState`)
- `H:/prism/.claude/helpers/chat-slots.test.mjs` (extend)
- `H:/prism/.claude/hooks/__tests__/session-start-auto-resume.test.mjs` (new)
- `H:/prism/.claude/helpers/precompact-handoff.test.mjs` (extend)

## Existing functions to reuse (no duplication)
- `findSlotForChat(chatId)` — `H:/prism/.claude/helpers/chat-slots.mjs:694` (already public)
- `heartbeat(input)` — `H:/prism/.claude/helpers/chat-slots.mjs:547` (already public; extend with `forwardDateMs`)
- `refreshState(prev, input)` — `H:/prism/.claude/helpers/chat-slots.mjs:496` (extend)
- `extractResume(content)` — `H:/prism/.claude/hooks/session-start-auto-resume.mjs:80` (reuse output, layer banner above)
- `generateSmartResume(identity)` — `H:/prism/.claude/helpers/precompact-handoff.mjs:230` (unchanged)

## Verification (end-to-end)
1. **Unit tests**: `npx vitest run .claude/helpers/chat-slots.test.mjs` + `npx vitest run .claude/helpers/precompact-handoff.test.mjs` + `npx vitest run .claude/hooks/__tests__/session-start-auto-resume.test.mjs` — all green.
2. **Simulated /compact**: write a fake handoff with `## RESUME\nSlot echo\n` content for a chatId that chat-slots has in foxtrot. Run `session-start-auto-resume.mjs` with that chatId via piped stdin. Expect `additionalContext` to include the drift banner (`Slot drift during /compact: ... was 'echo', now 'foxtrot'`).
3. **Live-collision smoke**: claim slot alpha with `chatId=claude-A, windowId=tw-test-1`, heartbeat fresh. Try claiming with `chatId=claude-B, windowId=tw-test-1`. Expect: result is alpha NOT inherited (claude-B walks to next free), and `windowCollision: true` in result.
4. **Heartbeat grace**: claim a slot, run precompact-handoff for that chatId, inspect `chat-slots.json` — lastHeartbeat should be forward-dated by up to 5 min (default grace). Wait 9 min — sweep should still classify the slot as alive.

## Out of scope
- Cleaning up the *current* drift between my conversation belief (echo) and chat-slots truth (foxtrot). The fix prevents this for future /compacts; the current session can be reconciled by running `/checkin` after the fix lands.
- Renaming the slot binding mechanism. The 7→10-slot fleet stays as-is.
- Changing `terminal-window-id.mjs` itself. That's a separate hardening (the auto-upgrade probe from `[[reference_twid_cache_hit_autoupgrade_2026_05_15]]` already exists). Layer C closes the residual gap when the resolver is *briefly* degraded.
