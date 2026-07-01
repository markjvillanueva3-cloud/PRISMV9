---
name: reference-memory-index-inject-disabled-finding-2026-06-01
description: "CORRECTED 2026-06-01 (slot:golf): PRISM_MEMORY_INDEX_INJECT='0' is NOT a stale accident — it is part of a DELIBERATE context-economy CLUSTER in settings.json (lines 39-41: PRISM_MASTER_INDEX_INJECT=0 + PRISM_MEMORY_INDEX_INJECT=0 + PRISM_WIKI_PRECHECK_INJECT=0 — all three per-prompt injectors turned off to conserve context). runMemoryIndexSearch's ONLY runtime consumer is this deliberately-disabled hook, so the supersession-exclusion + domain-boost are ready-but-dormant BY DESIGN. DO NOT re-enable (flip 0->1) as a 'gap fill' — that REVERSES a deliberate fleet context-economy policy. Re-enable only on explicit operator request."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.654Z
aliases: reference_memory_index_inject_disabled_finding_2026_06_01
---


# memory-index-precheck injector is DISABLED fleet-wide (the invocation lever)

## The finding
`PRISM_MEMORY_INDEX_INJECT: "0"` in `C:/Users/wompu/.claude/settings.json` (line ~40,
mirrored to `H:/.claude/settings.json`) turns OFF the per-prompt memory-vault recall
injector `memory-index-precheck-inject.mjs`. The hook IS wired (UserPromptSubmit,
settings line ~1293) — it's the ENV that disables it. Confirms alpha's "no-fire"
observation ([[reference_alpha_memory_index_nofire_2026_05_29]]): the hook fired 0× in
production not (only) from a bug but because it's env-gated off.

## Why it matters (reach analysis)
`runMemoryIndexSearch` (the hybrid BM25+dense+RRF recall) has exactly ONE runtime
consumer: this disabled hook (grep: 3 files reference the lib — the hook, the sidecar
builder, a codegen). There is NO mcp-server/brain_recall consumer of this function.
Therefore:
- **Supersession exclusion** ([[reference_memory_recall_supersede_exclusion_2026_06_01]],
  U-MRS-EXCLUDE) is PARTIALLY live — the rebuilt BM25 sidecar physically omits the
  superseded record, so any sidecar reader benefits — but its per-prompt injection is off.
- **Domain boost** (U-MRDB-WIRE, commit 3172f51903) is search-time only → INERT until
  the hook is re-enabled.

So the per-prompt injection is the activation gate — but it is **deliberately off** (see below).

## CORRECTION (2026-06-01) — it's a DELIBERATE context-economy cluster, NOT stale
Reading settings.json lines 39-41 shows a CLUSTER of three per-prompt injectors set to 0:
`PRISM_MASTER_INDEX_INJECT=0` · `PRISM_MEMORY_INDEX_INJECT=0` · `PRISM_WIKI_PRECHECK_INJECT=0`.
master-index + memory-index honor their `_INJECT` knob and are correctly off. This cluster
+ the live context-budget pressure (YELLOW zone) = a DELIBERATE decision to suppress
per-prompt context injection fleet-wide. My earlier "stale disable, re-enable it"
speculation was WRONG (false-gap lesson again — verify the WHY before acting). DO NOT flip
INJECT 0→1 as an autonomous "gap fill": it reverses a deliberate context-economy policy and
adds per-prompt context the operator chose to avoid.

## Sibling finding + fix (U-WIKI-KNOB-HONOR, commit 1b52f99194)
wiki-precheck-inject gated on `PRISM_WIKI_PRECHECK` (no `_INJECT`), so the operator's
`PRISM_WIKI_PRECHECK_INJECT=0` was a DEAD knob and wiki-precheck kept firing every prompt
across 26 chats — the ONE cluster member that leaked. FIXED: the hook now also honors
`PRISM_WIKI_PRECHECK_INJECT=0` (+ legacy knob). This realized the operator's intent and
closed the context leak — the context-economy-aligned gap fill (vs. the wrong move of
re-enabling memory-index).

## If the operator WANTS per-prompt recall back (explicit request only)
The recall units are READY: supersession exclusion (U-MRS-EXCLUDE), domain boost
(U-MRDB-WIRE), and the prompt-hash throttle (U-MRT-IMPL, commit 9800c262a7 — the doc-vs-code
throttle gap is now CLOSED, /loop-safe). Then: flip `PRISM_MEMORY_INDEX_INJECT=1` in C:
settings.json + `build-memory-embeddings-sidecar.mjs --resume`. Latency ~200ms/prompt.
But default posture = LEAVE OFF (deliberate policy).

## Related
[[reference_memory_recall_supersede_exclusion_2026_06_01]] · [[reference_alpha_memory_index_nofire_2026_05_29]]
· [[reference_u_memory_index_sidecar_2026_05_20]] · [[feedback_verify_actual_contract_not_proxy]]
