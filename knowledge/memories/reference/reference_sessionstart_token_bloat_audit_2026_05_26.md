---
name: reference_sessionstart_token_bloat_audit_2026_05_26
description: "SessionStart token-bloat audit — ~78K token baseline identified, 8 env knobs shipped saving ~1.3K tokens/turn, Tier-1 structural follow-ups named."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.921Z
aliases: reference_sessionstart_token_bloat_audit_2026_05_26
---


# SessionStart Token-Bloat Audit (2026-05-26, slot:golf /loop iter1)

Operator directive: "hunt what is causing massive token usage right at session startup, assess and optimize for better efficiency". Session hit `ctx=44% YELLOW` with `cache_read=19.34M` after ~5 turns of /checkin-golf orchestration.

## Sized baseline (~78K tokens auto-loaded at every SessionStart)

- CLAUDE.md project = **74 KB / ~18.5K tokens** (doctrine literally says "≤200 lines" — currently ~880 lines, biggest single offender)
- Skill registry = **~60 KB / ~15K tokens** (≈900 .md skill files harness-discovered; 104 are NATO `<verb>-<slot>` wrappers that could collapse to template)
- MEMORY.md harness auto-load = **24 KB / ~6.1K tokens** (AT 24576B ceiling per `memory-size-watch.mjs`)
- CLAUDE.md user = **20 KB / ~4.9K tokens**
- BUILD_STATE digest = **~6.8K tokens** (full file 27 KB, injector emits digest)
- CLAUDE-BRIEF full mode = **~4K tokens** (headline mode would be 800B)
- Superpowers `using-superpowers` mandatory inject = **~1.1K tokens**
- MCP server instructions (Figma + Linear) = **~875 tokens**
- Σ small UserPromptSubmit injectors (~18 banners) = **~3.3K tokens**

Cache amplifier: every turn within the 5-min Anthropic cache window re-reads the baseline → `cache_read=19.34M / ~50K-per-cache-hit ≈ 387 hits` over the session.

## Shipped fixes (commit forthcoming)

Eight env knobs added to `C:/Users/wompu/.claude/settings.json` (c-to-h-mirror auto-replicated to H:):

- `PRISM_BRIEF_INJECT_MODE=headline` — CLAUDE-BRIEF 4 KB → 800 B (~800 tokens/turn)
- `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` — skill-auto-trigger take-rate was 0.2% (~75 tokens/turn)
- `PRISM_PSN_CHECKLIST_INJECT_DISABLE=1` — doctrine reminder, redundant after a few turns (~100 tokens/turn)
- `PRISM_AI_MEMO_INJECT=0` — AI-memo-coverage advisory, 4 of 7 PRISM-AI engines blind (~50 tokens/turn)
- `PRISM_GOAL_SYNERGY_INJECT=0` — 3-leg yellow banner (~75 tokens/turn)
- `PRISM_KNOWLEDGE_LINK_AUDIT_INJECT=0` — 4136/97673 broken yawn (~75 tokens/turn)
- `PRISM_NN_GRAPH_INJECT=0` — GraphSAGE dormant until pool seed (~50 tokens/turn)
- `PRISM_SUBSTRATE_HEALTH_INJECT=0` — declared-vs-actual advisory (~50 tokens/turn)

Subtotal: **~1.3K tokens/turn × 5-min cache hits over remainder of session ≈ 500K tokens reclaimed**

Plus orphan-ref cleanup: `linear-roadmap-sync` and `supabase-state-sync` were referenced in `H:/prism/.claude/settings.json` (SessionStart + Stop chains) but the files lived in `_disabled/` since SLOT-COMPACT-SYNERGY-MS0/U-WAVE4a — every SessionStart + Stop emitted `node:internal/modules/cjs/loader:1252` MODULE_NOT_FOUND silently. The Wave 4a retire cycle left the settings.json refs orphaned; this commit closes that cleanup. See [[reference_post_ship_slot-compact-synergy-ms0-u-wave4a]].

## Tier-1 structural follow-ups (deferred to separate sessions, not started in this loop)

1. **CLAUDE.md project trim 74 KB → 20 KB** (~12.5K tokens/turn saved). Every `## SECTION` already cites a wiki entry it could collapse to. Highest single win.
2. **Skill registry NATO dedupe** (~12.5K tokens/turn). 104 wrappers (`<verb>-<slot>` × 4 verbs × 26 slots) collapse to one template. Needs harness skill-discovery change or rename-pattern.
3. **MEMORY.md compress to ≤120 chars/entry** (~1.75K tokens/turn). Entries average ~180 chars; trim to pointer-only.
4. **BUILD_STATE injector digest cap** (~500 tokens/turn). Emit counters + pointer at SessionStart; full file behind on-demand Read.

## Tier-2 (lower ROI)

- `/loop awareness` lists 116 fleet loops → keep count + top-3 newest.
- `slot-soul-inject` caches hash, re-emit only on change.
- `awareness-snapshot-inject` keyed on AWARENESS-SNAPSHOT.md mtime.

## Verification

After `/compact`, the next SessionStart should NOT show: AI-memo-coverage banner, goal-synergy banner, wiki-link-audit banner, NN-graph banner, substrate-health banner, PSN-checklist block, skill-auto-trigger nudge, or the 4KB CLAUDE-BRIEF full block. If any still appear → corresponding hook is ignoring its documented disable knob → file follow-up.

## Related

- [[feedback_settings_wiring_drift_2026_05_16]] — settings.json wiring silently reverts in multi-chat; commit fast
- [[feedback_token_budget_advisory_not_optional]] (R6)
- [[reference_post_ship_slot-compact-synergy-ms0-u-wave4a]] — Wave 4a retired the offending hooks; this audit completes the cleanup
- `state/shared/specs/SESSIONSTART-TOKEN-AUDIT-2026-05-26.md` — full audit spec on disk
- `scripts/memory-size-watch.mjs` — existing watchdog for the 24576B ceiling
