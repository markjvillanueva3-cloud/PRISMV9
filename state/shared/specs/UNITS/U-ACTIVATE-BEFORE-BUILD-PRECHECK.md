---
unit_id: U-ACTIVATE-BEFORE-BUILD-PRECHECK
milestone: JULIETT-12CHAT-ALLOCATION-MS0
owner_slot: alpha
wave: W1
cost: S
status: pending
peer_claims_check_at: 2026-05-17T00:00:00Z
tool_plan_ref: pending-rgs-build
depends_on: []
unblocks: [12-chat-parallel-W2-W4-without-duplicate-builds]
roi_score: 8.0
generated_at: 2026-05-17
generator_version: hand-written-v1
---

# U-ACTIVATE-BEFORE-BUILD-PRECHECK

## Goal
Add a Tier-0 PreToolUse:Write advisory hook that surfaces top-5 system-viz + master-index + ENGINE_DIGEST hits BEFORE chats create new engines/hooks/skills. **Doctrine driver:** 4 collision incidents in 24h prove chats still build before searching ([[feedback_dont_wire_for_wiring_sake_2026_05_16]]). This is NOT a hard block — `duplication-hard-block.mjs` already covers exact-name match. This is the "what's similar / what should I activate first" advisory layer.

**Acceptance:** when a chat attempts `Write` of `src/engines/*Engine.ts` or `.claude/hooks/*.mjs` or `.claude/commands/*.md`, the chat sees a `## 🔍 Activate-before-build precheck` block with top-5 similar existing assets BEFORE the write proceeds.

## Activate (do-not-build)
- `H:/prism/.claude/hooks/duplication-hard-block.mjs` — Tier-0 PreToolUse:Write hard-block pattern (clone)
- `H:/prism/.claude/hooks/master-index-precheck-inject.mjs` — UserPromptSubmit injector; reuse for the search call (but at PreToolUse layer instead)
- `H:/prism/scripts/lib/master-index-search-lib.mjs` — BM25 search lib (depends on S5 F1 fix: 200MB→512MB graph cap)
- `H:/prism/.claude/hooks/dedup-auto-invoke.mjs` — silent dedup pattern
- `H:/prism/.claude/hooks/inventory-check-guard.mjs` + `master-index-search-gate.mjs` + `build-create-detector.mjs` — all sibling pre-build gates; this is the 8th in the family (S3 proposes consolidating ALL 8 into composite later)

## Build (net-new)
ONE new hook: `H:/prism/.claude/hooks/activate-before-build-precheck.mjs`
- PreToolUse:Write/MultiEdit matcher
- Path filter: matches `src/engines/.*Engine\.ts$`, `.claude/hooks/.*\.mjs$`, `.claude/commands/.*\.md$`
- Calls `master-index-search-lib.runMasterIndexSearch(<filename-as-query>, K=5)`
- Emits `## 🔍 Activate-before-build precheck` block in `additionalContext`
- Knob: `PRISM_ACTIVATE_PRECHECK_DISABLE=1`
- Timeout: 2000ms (PreToolUse latency budget tight)
- Silent-fail: empty hits → `{continue:true, suppressOutput:true}` (don't spam if no matches)

## Files-touched
- `H:/prism/.claude/hooks/activate-before-build-precheck.mjs` (Write, new)
- `H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs` (Write, new)
- `C:/Users/wompu/.claude/settings.json` (Edit, add PreToolUse:Write matcher AT INDEX 0 — runs before duplication-hard-block)
- `H:/.claude/settings.json` (cp manually)

## Pre-flight
1. Claim: `node H:/prism/.claude/helpers/slot-task-claim.mjs claim --slot alpha --chatId <id> --unitId JULIETT-12CHAT-ALLOCATION-MS0::U-ACTIVATE-BEFORE-BUILD-PRECHECK`
2. **DEPENDS-ON:** S5 F1 silent-degrade fix (raise PRISM_GRAPH_MAX_BYTES to 512MB) MUST land first — otherwise the search-lib silently returns empty hits on the 331MB graph
3. `Read .claude/hooks/duplication-hard-block.mjs` (verify pattern still current)
4. `prism_dev:master_index_query { q: "activate before build precheck" }` (confirm nothing already-built — strong signal of dedup risk for this very unit)

## Test plan
- New engine path → emits 5 hits if similar existing assets
- Test file path (`*.test.ts`) → does NOT emit (filters to source paths only)
- Empty graph (search-lib returns [], silent fallback) → `{continue:true,suppressOutput:true}` exit
- Knob disabled → no output
- Timeout simulation (search-lib mock takes >2000ms) → silent timeout, never blocks
- Real-data: simulate `Write src/engines/DuplicationGuardEngine.ts` (exists) → emits ≥1 hit for itself + similar Guard engines

## Wiring
- Append to `C:/Users/wompu/.claude/settings.json` PreToolUse[0]:
  ```json
  { "matcher": "Write|MultiEdit", "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/activate-before-build-precheck.mjs", "timeout": 2000 }] }
  ```
  AT THE TOP (runs before duplication-hard-block so advisory surfaces before block)
- Mirror to H:/.claude/settings.json

## Test-shipped-criteria
- `node --test H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs` all pass
- Smoke: simulate Write of an engine name with existing analog → block emitted with 5 hits
- No regression in `duplication-hard-block.mjs` (still fires post-precheck, still hard-blocks on exact match)
- `grep activate-before-build-precheck C:/Users/wompu/.claude/settings.json` returns ≥1 in PreToolUse
- `grep activate-before-build-precheck H:/.claude/settings.json` returns ≥1

## Rollback
- Knob `PRISM_ACTIVATE_PRECHECK_DISABLE=1` (immediate)
- Remove settings.json arm + `git revert` hook .mjs
- Hook auto-archives per [[feedback_never_delete_only_disable]] — never delete the .mjs file

## References
- [[feedback_dont_wire_for_wiring_sake_2026_05_16]] — charlie's doctrine driving this
- [[reference_master_index_surface]] — master_index_query API
- [[reference_awareness_stack]] — sibling injectors
- S3 SYNERGY (iter-3): this hook is the 8th in the family eligible for composite consolidation later (U-PREBUILD-GATE-COMPOSITE)
- V1 allocation §2 W1 row + §3 alpha assignment
