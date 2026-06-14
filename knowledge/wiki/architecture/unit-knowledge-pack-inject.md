---
title: BACKEND-DEV-LOOP — unit-knowledge-pack-inject (live per-unit injection hook)
type: architecture
milestone: BACKEND-DEV-LOOP
unit: U-UKP02
created: 2026-05-18
slot: charlie
---

# `unit-knowledge-pack-inject` — UserPromptSubmit hook for per-unit knowledge

## What it answers

U-UKP01 shipped a composer (`scripts/unit-knowledge-pack.mjs`) but it was
CLI-only — a slot only got dedicated knowledge if it remembered to invoke
the script. U-UKP02 closes the on-demand → live gap: every prompt fires the
hook, and if the slot has an active unit claim, the compact knowledge
summary auto-injects into context.

## Deliverable — `.claude/hooks/unit-knowledge-pack-inject.mjs`

UserPromptSubmit T2 injector. Pipeline:

```
stdin.session_id → deriveChatId() → resolveSlotForChat() → readActiveClaim()
                                                                    │
                              ┌─ no active claim → silent no-op    ▼
                              │  (return {continue: true})
                              └─ active claim → shouldInject() (throttle)
                                                  │
                              ┌─ fresh stamp → silent no-op
                              │
                              └─ stale / missing stamp → composePack()
                                                          → renderCompact()
                                                          → write stamp
                                                          → emit additionalContext
```

| Layer | Function | Behavior |
|---|---|---|
| Stdin parse | `readStdinJson` | fail-soft; non-JSON / TTY → null |
| Chat-id | `deriveChatId` | `claude-<first-8-hex>` (uppercase → lowercase) |
| Slot resolution | `resolveSlotForChat` | walks `chat-slots.json` `slots.*.chatId` |
| Claim freshness | `readActiveClaim` | `lastHeartbeat` < 30 min |
| Throttle | `shouldInject` + `stampPath` | `state/shared/.unit-pack-inject-stamps/<slot>__<unitId>.stamp` ; default TTL 4h |
| Compose | imports `scripts/unit-knowledge-pack.mjs::composePack` | in-process, no subprocess |
| Render | `renderCompact` | ≤800 chars; full pack stays on-disk for drill |
| Emit | `hookSpecificOutput.additionalContext` | injects into prompt context |

## Wiring (settings.json — NOT git-tracked)

Wired in `C:/Users/<user>/.claude/settings.json` UserPromptSubmit chain
**after `goal-prereq-inject`** (timeout 8s). The `c-to-h-mirror` hook
auto-replicates the C: edit to H:/.claude/settings.json. Both settings
files live OUTSIDE the `H:/prism` repository, so the wiring step does NOT
appear in the U-UKP02 git commit — verify via:

```bash
grep unit-knowledge-pack-inject "C:/Users/<user>/.claude/settings.json"
```

## Knobs

| Variable | Default | Purpose |
|---|---|---|
| `PRISM_UNIT_PACK_INJECT_DISABLE=1` | off | kill switch |
| `PRISM_UNIT_PACK_INJECT_TTL_MS=<ms>` | `14400000` (4h) | throttle window per (slot, unitId) |
| `PRISM_UNIT_PACK_INJECT_MAX_CHARS=<N>` | `800` | summary cap |
| `PRISM_UNIT_PACK_STAMPS_DIR=<path>` | `state/shared/.unit-pack-inject-stamps/` | stamp dir (tests) |
| `PRISM_CHAT_SLOTS_PATH=<path>` | `state/shared/chat-slots.json` | override |
| `PRISM_SLOT_TASK_CLAIMS_PATH=<path>` | `state/shared/slot-task-claims.json` | override |

## Safety properties

- **Never blocks.** Every error path returns `{continue: true}`.
- **Never crashes.** Stdin parse, slot read, claim read, compose, render,
  stamp-write — all fail-soft.
- **Throttle gate** prevents repeated injection within the TTL window.
- **Path-traversal defense.** `stampPath` whitelist-sanitizes `(slot,unitId)`
  via `/[^A-Za-z0-9_\-]/g` → `_`; `MS::U-X` becomes `MS__U-X`.
- **No subprocess.** `composePack` is dynamically imported in-process so
  the hook is bounded by the harness timeout (8s budget).
- **Composer fail-soft propagates.** If `composePack` throws, the hook
  swallows and emits `{continue: true}` — never surfaces the trace.

## Tests

34 `node:test` cases across 6 describe blocks:
- `deriveChatId` (4): UUID format, uppercase normalization, short/non-string rejection
- `resolveSlotForChat` (5): matching slot, no match, null chatId, throw, malformed JSON
- `readActiveClaim` (6): fresh claim, stale heartbeat, unknown slot, missing/non-string unitId, malformed JSON, null slot
- `shouldInject` + `stampPath` (6): no stamp, fresh stamp, stale stamp, empty inputs, composite-id sanitization, path-traversal rejection
- `renderCompact` (5): full render, empty sections, warning surface, max-char truncation, null pack
- `runHook end-to-end` (8): DISABLE knob, no-stdin, no-slot, no-claim, happy path with stamp-write assertion, throttled with composer-call-counter, stale-stamp override, composer-throw fail-soft

## Git attribution note

Files shipped in `5709f19d7b` (peer-collision: my `git add` collected
alongside a peer's OCR work; the auto-unstage hook ran ONCE on a separate
attempt but the working-tree-clean state shows the hook files entered the
peer's commit). The capability ships; this wiki entry + the sibling
[[reference_unit_knowledge_pack_inject_2026_05_18]] memory record U-UKP02
attribution for future audits. Lesson: when the cross-chat write-collision
hook strips files, stage ONLY the deliverable paths in the retry and
verify `git diff --cached --name-only` before committing.

## Related

- [[unit-knowledge-pack]] — the composer this hook fires (U-UKP01)
- [[ollama-prism-bridge]] — Layer 2 of Ollama bridge ladder
- [[ollama-expand-ms0]] — Layer 1 (`ask-ollama.mjs`)
- `.claude/hooks/pick-prefresh-inject.mjs` — sibling injector (freshness state)
- `.claude/hooks/goal-prereq-inject.mjs` — sibling injector (pre-`/goal` gate)
