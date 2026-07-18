---
session: claude-16769ed0
topic: mcp-route-nudge-supp
slot: alpha
written_at: 2026-06-20T15:42:42.783Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-16769ed0
status: active
---

# HANDOFF: claude-16769ed0
Updated: 2026-06-20T15:42:42.783Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-16769ed0

## STATE
Slot alpha. Session 16769ed0 (very long). Token GREEN. Self-compact broken -- do not re-run. 6 token-efficiency units shipped this session. CORRECTED my premature exhaustion call -- the never-idle hunt surfaced a real unit (audit-viz dedup) + a real next unit (prune TTL-asymmetry). The genuine queue is NOT dry: next = pruneExpired per-tag-TTL fix (high-value, in-domain, scoped). Keep hunting deeper before claiming exhaustion.

## RESUME
SHIPPED U-AUDIT-VIZ-DEDUP (8d344941fe, 6th unit this session, 2-of-3 PASS): audit-viz-first-inject adopts the shared injection-dedup lib, INPUT-keyed on intent::noun so a dedup-hit skips BOTH the 8s system-viz-query subprocess AND the re-injection (it fired ~12x identically this session on directive boilerplate). 9/9 + 31/31 no-regression + live A/B proven. Detail: [[reference_audit_viz_dedup_and_prune_ttl_asymmetry_2026_06_20]]. LESSON (R12 self-correction): I had prematurely concluded "domain exhausted" -- the never-idle hunt found a real high-value in-domain unit I had OBSERVED the symptom of (12x identical injection) but not connected. Deeper hunting beats premature exhaustion claims. NEXT UNIT (genuine, scoped, in-domain -- surfaced by scrutiny arm C): the shared injection-dedup pruneExpired is TAG-AGNOSTIC, so a shorter-TTL adopter (audit-viz/slot-domain 5min) pruning+writing-back the SHARED injection-dedup-cache.json evicts still-live LONGER-TTL sibling entries (galaxy-claudemd 30min, psn-prompt-checklist 24h) -> dedup misses on exactly the big blocks. Fix in scripts/lib/injection-dedup.mjs: each hook prunes ONLY its own tag bucket before write-back (read-merge-write your tag), OR make pruneExpired per-tag-TTL-aware. Real token-economy bug, fleet-wide. ask-ollama loaded-first PARKED (zulu).

## CONTEXT

