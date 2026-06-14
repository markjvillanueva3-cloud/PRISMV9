# PATCH-SIBLING: fix the /precompact->/compact race in the self-compaction actuator

> Surface: `scripts/lib/zulu-orchestrator-lib.mjs` + `scripts/zulu-orchestrator-sweep.mjs`
> + `scripts/lib/zulu-orchestrator-lib.test.mjs` — all THREE are PEER-DIRTY this session
> (an uncommitted `zebra` -> `zulu` rename refactor is in flight), so this is a patch-sibling,
> not a direct commit, to avoid clobbering the peer's rename WIP. Apply once the rename settles.
> Unit: SELF-COMPACTION / U-ZULU-PRECOMPACT-WAIT (slot:alpha, 2026-06-11).

## The bug (verified by reading the live code)
The self-compaction actuator (`zulu-orchestrator-sweep.mjs`) SendKeys-types the plan
`["/precompact", "/compact", "/checkin-<slot>"]` into each opt-in chat window. Between lines it
waits `staggerAfterLine(line)`:
- after `/compact` -> `DEFAULT_COMPACT_WAIT_MS` (90s) ✓
- after `/precompact` -> falls through to `DEFAULT_STAGGER_MS` (**5s**) ✗

But `/precompact` makes the MODEL author its handoff (~30-60s). So `/compact` lands ~5s later,
**while the model is still writing the handoff** -> the compaction races/defeats the very
model-authored-handoff guarantee the /precompact-first design exists to provide (the chat then
compacts with a partial/stale/stub handoff). This is the one real code gap for true autonomous
self-compaction; everything else (sequencing, window targeting, scheduled task, gating, tests)
is already built.

## Fix (3 files, post-rename `zulu` names)

### 1. `scripts/lib/zulu-orchestrator-lib.mjs`
After `export const DEFAULT_COMPACT_WAIT_MS = 90 * 1000;` add:
```js
// SELF-COMPACTION (2026-06-11): a /precompact line makes the MODEL author its handoff
// (~30-60s), so /compact must NOT land 5s later (the old stagger) mid-authoring. Give
// /precompact the same generous flat window as /compact. Knob: PRISM_ZULU_PRECOMPACT_WAIT_MS.
export const DEFAULT_PRECOMPACT_WAIT_MS = 75 * 1000;
```
In `staggerAfterLine(line, opts = {})`, after the `compactWait` resolution add:
```js
  const precompactWait = Number.isFinite(opts.precompactWaitMs) && opts.precompactWaitMs >= 0
    ? opts.precompactWaitMs
    : DEFAULT_PRECOMPACT_WAIT_MS;
```
and after the `/compact` branch (`if (norm === "/compact" ...) return compactWait;`) add:
```js
  // A /precompact line makes the MODEL author its handoff (slow); /compact must not land
  // mid-authoring. Give it a generous flat window like /compact's.
  if (norm === "/precompact" || norm.startsWith("/precompact ")) return precompactWait;
```

### 2. `scripts/zulu-orchestrator-sweep.mjs`
Add `DEFAULT_PRECOMPACT_WAIT_MS` to the import block from `./lib/zulu-orchestrator-lib.mjs`.
After the `compactWaitMs()` helper add:
```js
function precompactWaitMs() {
  const raw = Number(process.env.PRISM_ZULU_PRECOMPACT_WAIT_MS);
  if (Number.isFinite(raw) && raw >= MIN_STAGGER_MS) return raw;
  return DEFAULT_PRECOMPACT_WAIT_MS;
}
```
In `sendLines()`, extend the `staggerAfterLine(line, {...})` opts with:
```js
        precompactWaitMs: precompactWaitMs(),
```

### 3. `scripts/lib/zulu-orchestrator-lib.test.mjs`
In `describe("staggerAfterLine (G3)" ...)` add (import `DEFAULT_PRECOMPACT_WAIT_MS` at top):
```js
  it("waits the long precompact window after /precompact (model authors handoff)", () => {
    assert.equal(staggerAfterLine("/precompact"), DEFAULT_PRECOMPACT_WAIT_MS);
    assert.notEqual(staggerAfterLine("/precompact"), DEFAULT_STAGGER_MS);
  });
  it("honors a precompactWaitMs override", () => {
    assert.equal(staggerAfterLine("/precompact", { precompactWaitMs: 1234 }), 1234);
  });
```

## Verify after apply
`node --test scripts/lib/zulu-orchestrator-lib.test.mjs` -> all green incl. the 2 new cases.

## Note on the other two "gaps" (NOT code — operator decisions)
The system is otherwise complete and live-wired. To turn on true autonomous self-compaction:
1. **Opt-in the slots:** set `slots[<name>].zuluOptIn = true` (via `/zulu-opt-in`) for each chat you
   want auto-managed (default is OFF by design).
2. **Graduate from dry-run:** each opted-in slot runs 24h dry-run grace then goes live; `PRISM_ZULU_DRY_RUN=1`
   forces dry-run, `PRISM_ZULU_DISABLE=1` is the kill switch.
The scheduled task "PRISM Zulu Orchestrator" already runs the recurring sweep.
