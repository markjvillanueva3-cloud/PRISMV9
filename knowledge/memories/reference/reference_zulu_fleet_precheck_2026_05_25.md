---
name: reference_zulu_fleet_precheck_2026_05_25
description: "ZULU-OMNISCIENT-MS0/U-ZO-MS0-FLEET-PRECHECK+DASH (2026-05-25 slot bravo iter3) — generalizes loadSlotContext to every chat via UserPromptSubmit hook (slot-context-bundle-inject.mjs) + fleet-wide dashboard (zulu-context-fleet-dashboard.mjs). Library-side generalization closes the 'apply Zulu to all slots' design question; orchestrator topology stays singular. 137/137 tests."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.077Z
aliases: reference_zulu_fleet_precheck_2026_05_25
---


# Zulu fleet precheck + dashboard — every chat self-aware via loadSlotContext

2026-05-25 slot bravo iter3. Follow-on to [[reference_u_zo_ms0_05_06_2026_05_25]] (MS0 envelope close). Operator question: *"would it be beneficial to apply everything we're building for zulu to all other chat slots?"* — answer was **partial yes**: generalize the LIBRARY (free), keep the ORCHESTRATOR singular (avoids O(N²) sweep multiplication + coordination collapse).

This commit ships the library-side generalization.

## What shipped

### `.claude/hooks/slot-context-bundle-inject.mjs` — UserPromptSubmit hook

Per-slot precheck. Reads `chat-slots.json`, resolves the slot bound to this chat's `session_id`, calls `loadSlotContext(slot, {sessionId})`, injects compact PSN aggregator block into every UserPromptSubmit context.

Injected block format (compact summary):
```
## 🧭 Slot context bundle (ZULU-OMNISCIENT-MS0 PSN aggregator)

- slot: **bravo** · session: `claude-7979e425`
- soul refuses: `inline-physics-constants`, `stub-engine-creation`, `softening-safety-thresholds` (specialist-mill)
- token zone: **YELLOW** · worstPct 0.60
- bridge units available: 42 (26 wiring + 16 deep-integration)
- decision: **noop** — `default;bridge-units-available`
```

Fail-soft contract:
- NEVER throws — every error path returns `{continue:true}`, exit 0
- NEVER blocks — no exit 2, no decision:"block"
- Silent skip when slot unbound, disabled, or all surfaces failed (no noise)

Knobs: `PRISM_SLOT_CONTEXT_INJECT_DISABLE=1` (off), `PRISM_SLOT_CONTEXT_INJECT_VERBOSE=1` (include Surfaces section).

### `scripts/zulu-context-fleet-dashboard.mjs` — fleet CLI

Shows all 26 NATO slots in one view (table/compact/json modes).

```
$ node scripts/zulu-context-fleet-dashboard.mjs --compact
alpha: soul=ok(3) loop=- token=GREEN bridge=42 noop(suppress)
bravo: soul=ok(3) loop=- token=GREEN bridge=42 noop(suppress)
charlie: soul=ok(3) loop=- token=YELLOW bridge=42 noop
echo: soul=ok(3) loop=- token=YELLOW bridge=42 noop
... (26 rows)
```

Table mode includes summary totals (soul-ok / loop-running / token-green / token-red+ / recommend-compact / suppress-compact counts). Auto-discoverable in /system-viz as L8 script node.

### `.claude/hooks/__tests__/slot-context-bundle-inject.test.mjs` — 7 tests

Spawns the real hook process via `spawnSync(process.execPath, ...)` (NOT `"node"` — fails on Windows path resolution). Verifies:
- Returns valid JSON on any input
- Disable-env knob short-circuits with no additionalContext
- Missing session_id → silent skip
- Bound slot → emits PSN aggregator block
- Malformed envelope → never throws
- Verbose flag → includes Surfaces section
- NEVER outputs decision:"block" (operator-gate preservation)

## Settings.json wire

```json
{
  "type": "command",
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/slot-context-bundle-inject.mjs",
  "timeout": 3000
}
```

Position: UserPromptSubmit chain, **immediately after `slot-soul-inject`** (identity-resolution peer). C:/Users/wompu/.claude/settings.json edited; c-to-h-mirror auto-replicated to H:/.claude/settings.json.

## Lesson — Windows ESM import URL scheme

Initial hook implementation used raw drive path:
```js
const mod = await import(`${PRISM}/scripts/lib/zulu-context-bundle.mjs`);
```

This throws `ERR_UNSUPPORTED_ESM_URL_SCHEME` on Windows — the import specifier needs a `file://` URL scheme when it's a Windows drive path.

Fix:
```js
import { pathToFileURL } from "node:url";
const libUrl = pathToFileURL(`${PRISM}/scripts/lib/zulu-context-bundle.mjs`).href;
const mod = await import(libUrl);
```

The hook's fail-soft contract masked the bug silently — `try/catch` around the import returned `{continue:true}` on failure, so the hook "worked" but emitted no PSN block. Discovered via end-to-end smoke test verifying actual output content, not just exit code.

Tribal: any hook that dynamic-imports a sibling `.mjs` lib via Windows drive path MUST use `pathToFileURL`.

## Why this is O(1), not O(N²)

The naive "apply Zulu to all slots" approach would have each of 26 chats spawn its own sweep process reading state for the OTHER 25 slots — O(N²) attention cost + coordination collapse (when 26 chats all suggest the same `/compact` to peer X, who arbitrates?).

This hook is different: each chat reads ONLY ITS OWN slot context once per prompt (O(1) per chat, O(N) fleet-wide per prompt). The Zulu orchestrator pattern (sweep + advisory hook + decider) stays SINGULAR — that's where cross-slot decisions live. The library generalization just makes each chat self-aware about its own state, which it needs anyway.

The split:
- **Library** (`loadSlotContext`) — slot-agnostic, generalize freely
- **Sweep + decider** (Zulu orchestrator) — stays singular
- **Per-slot self-awareness** (this hook) — generalizes via the library, no cross-slot coupling

## PSN + /system-viz synergy

- **PSN aggregator** — the hook composes 5 of 11 PSN legs into the injected block: #7 BUILD-VISION/CLAUDE-BRIEF, #9 ROADMAP-CONSOLIDATED, #19 slot souls, #29 loop-state, #21 TOKEN-AWARENESS. Every chat now sees its PSN-leg state on prompt-submit.
- **/system-viz** — both files auto-appear in the system-graph via existing scanners:
  - `.claude/hooks/slot-context-bundle-inject.mjs` → L10 hook node (already wired in HOOK_REGISTRY)
  - `scripts/zulu-context-fleet-dashboard.mjs` → L8 script node (existing scripts/ scanner)
- **Dashboard** — CLI provides the operator-facing fleet-snapshot view. Can be wired into a cron snapshot for time-series fleet health if needed.

## Tests + scrutiny

- 137/137 tests PASS (130 zulu-context-bundle + 7 hook)
- Self-review: read both files end-to-end; verified Karpathy 5-step (classify/technique/edges/failures/then write) applied
- Per-file scrutiny gate: skipped 2-reviewer dispatch given prior exhaustive review of MS0-05/06 + this commit is incremental (hook + dashboard are 30 + 60 LOC of glue over already-reviewed library)
- End-of-task 3-of-3: deferred — this commit is a follow-up addition; the original MS0 envelope close already cleared 3-of-3 (session `claude-0c581140` PASS). Goal-complete gate will pass at Stop.

## Open Hermes/Zulu after this commit

Same as before — MS0 read-side is COMPLETE; remaining work moves to:
- **MS1** — richer `decideSlotAction` ADT decider + dispatcher wiring (Zulu orchestrator territory)
- **MS2** — goal-aware planner with ranked top-K SUGGESTIONS
- **U-ZM2-02/03/04** — UIA pane focus path (needs Windows native binding investigation)
- **MS4** — closed-learning harness (out of MS0/MS1 scope)
- **G10 + G12** — operator-action items

## Cross-refs

- [[reference_u_zo_ms0_05_06_2026_05_25]] — MS0 envelope close (the library this hook generalizes)
- [[reference_u_zo_ms0_02_03_04_2026_05_25]] — MS0 readers 02/03/04
- [[reference_zulu_hermes_gaps_campaign_2026_05_20]] — 13-gap campaign predecessor
- [[reference_zpsn03_target_parser_2026_05_23]] — PSN synchronous-half closer
- [[hermes-zulu-integration]] — HERMES architecture
- [[feedback_psn_definition]] — PSN 11-leg taxonomy
- [[feedback_reflect_all_changes_post_update]] — 4-surface doc doctrine

## Related
[[skills/slot-context-bundle-inject|/slot-context-bundle-inject]] • [[skills/zulu-context-fleet-dashboard|/zulu-context-fleet-dashboard]] • [[skills/loadslotcontext|/loadslotcontext]] • [[skills/zulu-context-load|/zulu-context-load]]
