---
title: Context-economy injector cluster + the disable-knob-mismatch leak class
type: lesson
domain: dev-infra
slot: golf
created: 2026-06-01
tags: [context-economy, hooks, settings, knob-mismatch, false-gap, token-budget]
related:
  - "[[reference_memory_index_inject_disabled_finding_2026_06_01]]"
  - "[[feedback_verify_actual_contract_not_proxy]]"
  - "[[crossroad-brainstorm-workflow]]"
---

# Context-economy injector cluster + the disable-knob-mismatch leak class

**One-line:** PRISM deliberately disables its per-prompt context injectors for token
economy — and a settings disable-knob only works if the hook reads that *exact* env
name. A name mismatch silently leaks context every prompt across all 26 chats.

## The deliberate cluster (do NOT "re-enable" as a gap fill)

`C:/Users/wompu/.claude/settings.json` env block (lines ~39-41) sets a **cluster** of
per-prompt UserPromptSubmit injectors to off:

```
"PRISM_MASTER_INDEX_INJECT": "0",
"PRISM_MEMORY_INDEX_INJECT": "0",
"PRISM_WIKI_PRECHECK_INJECT": "0",
```

This is a **deliberate context-economy decision**, not a stale accident. Each injector
adds top-K context to *every* qualifying prompt × 26 chats — real token burn. Combined
with the live YELLOW token-budget pressure, the intent is clear: suppress per-prompt
PUSH context injection fleet-wide.

**Trap:** a chat finds one of these disabled (e.g. `PRISM_MEMORY_INDEX_INJECT=0`),
concludes "stale — re-enable it for ROI," and flips it. That **reverses a deliberate
fleet policy** and re-introduces the exact per-prompt cost it was designed to avoid.
The recall-quality work (supersession exclusion, per-galaxy domain boost, prompt-hash
throttle) is **ready-but-dormant by design** — activate only on explicit operator
request, never as an autonomous "gap fill." The context-economy-aligned channel for
"memory invocation per galaxy" is the **pull path** (on-demand recall / CAG cold-anchor
galaxy-cards cached once per session), NOT per-prompt push.

## The leak class: disable-knob name mismatch

A hook's disable knob only works if the hook reads the **exact** env name the operator
set. `wiki-precheck-inject.mjs` gated on `PRISM_WIKI_PRECHECK` (no `_INJECT` suffix),
but the operator set `PRISM_WIKI_PRECHECK_INJECT=0` (matching the sibling convention).
Result: the knob was **dead** (referenced by no hook) and wiki-precheck kept firing
every prompt × 26 chats — the operator believed it was off. Fix (`U-WIKI-KNOB-HONOR`,
commit `1b52f99194`): the gate now honors **both** names (`||`), realizing intent while
staying backward-compatible.

### Audit recipe (run after touching any injector or settings knob)

For every `PRISM_*` env in settings whose value means "off" (`*_INJECT/*_PRECHECK/*_ENABLE=0`
or `*_DISABLE=1`), confirm at least one `.claude/hooks/*.mjs` reads that **exact** name:

```js
// settings OFF-knob → must appear verbatim in some hook source, else it's a dead/leaking knob
const offKnobs = Object.entries(env).filter(([k,v]) =>
  /^PRISM_/.test(k) && ((/(_INJECT|_PRECHECK|_ENABLE)$/.test(k) && v==='0') || (/_DISABLE$/.test(k) && v==='1')));
for (const [k] of offKnobs) if (!allHookSource.includes(k)) console.log('LEAK?', k);
```

As of 2026-06-01 all 10 OFF-knobs are honored (wiki-precheck was the only leak).

## Meta-lesson: verify the WHY before acting (false-gap, twice in one session)

1. "brain-refresh wiki→tribal is mis-gated on dead `/api/chat`" → FALSE (correctly gated
   on `/api/embeddings`).
2. "`PRISM_MEMORY_INDEX_INJECT=0` is a stale disable, re-enable it" → FALSE (deliberate
   cluster).

Both would have caused harm (wasted work / reversed policy). The discipline: when a
setting/gate looks wrong, read the *surrounding cluster + the why* before changing it.
A single knob in isolation lies; the cluster tells the truth. See
[[feedback_verify_actual_contract_not_proxy]].
