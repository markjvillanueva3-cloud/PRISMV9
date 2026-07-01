---
name: reference_context_awareness_improvements_2026_06_21
description: "\"find improvements for context retention/utilization/awareness/obsidian\" -- reconciled against the rigorous 06-11 fleet-injection-budget audit (byte side already done, structural fix shipped 2026-06-09). The ONE genuinely-new high-value finding = AW-1: conflicting context-pressure signals (zulu-advisory byte-estimate \"critical\" vs authoritative \"green\"). My first-pass \"15-25KB/turn waste\" was an over-estimate (corrected: measured ceiling ~2.6K tok/turn)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.530Z
aliases: reference_context_awareness_improvements_2026_06_21
---


# Context/awareness/obsidian "find improvements" -- reconciled (2026-06-21, slot:alpha)

Operator: "find improvements for context retention and context utilization, prism awareness and obsidian vault." Deliverable: [`state/shared/specs/CONTEXT-AWARENESS-OBSIDIAN-IMPROVEMENTS-2026-06-21.md`].

**R8/dedup reconciliation (the pre-write graph caught the near-duplicate):** the BYTE side of this was already audited rigorously in `state/shared/specs/FLEET-INJECTION-BUDGET-AUDIT-2026-06-11.md` (10-agent measured pass over all 60 UserPromptSubmit + 57 SessionStart injectors). Measured per-turn injection = ~3,208 B (~917 tok) identical-prompt / ~9,247 B (~2,642 tok) changing-content ceiling. The big structural sink (slot-context-bundle) was already deduped 2026-06-09; the audit's own conclusion is the remainder is INCREMENTAL. So a fresh standalone "injection inventory" would mostly duplicate it.

**R12 self-correction:** my first pass claimed the static injection blocks waste "~15-25KB/turn." WRONG -- I conflated the galaxy-doctrine *persisted-to-disk* file (13KB, externalized; only a ~2KB preview is in-context) with in-context cost. The live-measured ceiling is ~2.6K tok/turn and the structural fix already shipped. (Second over-claim this session that verify-against-measurement corrected -- the depth/haste signal; cf. the tailread "~2.2MB largest" FALSE claim the 3-of-3 caught.)

**THE genuinely-new, verified, high-value finding -- AW-1:** conflicting context-pressure signals. Observed first-hand + repeatedly THIS session: `zulu-advisory-inject` emitted "pressure=critical ~1004K -> /compact recommended" while `slot-context-bundle-inject` simultaneously emitted "token-zone-green / noop". The model receives contradictory readings of its own context every turn (wasted attention + false-/compact risk + I was misled into mis-reading my own budget). Orthogonal to the byte audit (that measured size; this is signal CORRECTNESS). Root cause: zulu-advisory still derives "critical" from a transcript-byte estimate -- the same phantom class FIXED for chat-token-watch ([[reference_compact_phantom_byte_estimate_fix_2026_06_11]]) + token-awareness stale-zone ([[reference_token_awareness_stale_zone_fix_2026_06_11]]), but zulu-advisory was never brought onto the authoritative per-turn `usage`. **Fix = route zulu-advisory's verdict through the authoritative per-turn usage; demote byte-estimate to a labeled secondary line that can't actuate "critical".** #1 buildable unit (zulu-lane -- coordinate; consumes alpha-owned token-awareness libs).

**Downgraded (do NOT chase):** CAG 3% cold-hit-rate is near-optimal (headline itself: 243/283 misses are unavoidable cold-start, 2 recoverable; warm 82%). Retrieval-injector overlap already partially arbitrated (CAG skips master-index). TTL-too-short (CU-1) is a CANDIDATE bounded by the 2.6K ceiling -- needs a real cross-turn (>5min gap) measurement before building; the 06-11 back-to-back measure couldn't see TTL expiry.

**Meta-lesson:** before a "find improvements / audit X" pass, search for a PRIOR audit of the same scope (the pre-write-graph-inject + memory-recall surfaced the 06-11 audit + 3 ghost synthesis nodes -- the system flagged the duplicate). Reconcile against it; deliver only the delta. [[feedback_never_claim_absence_without_deep_search]] applies in reverse: don't claim NOVELTY without checking what already exists.
