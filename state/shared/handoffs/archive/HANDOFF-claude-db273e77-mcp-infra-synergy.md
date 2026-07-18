---
session: claude-db273e77
topic: mcp-infra-synergy
slot: alpha
written_at: 2026-06-09T07:10:58.683Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-db273e77
status: active
---

# HANDOFF: claude-db273e77
Updated: 2026-06-09T07:10:58.683Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-db273e77

## STATE
Golf-lane MCP/infra/hooks synergy under the unbounded /goal (14 surfaces + 7 galaxy lanes, unclearable in one chat).

COMMITTED (4 builds): U-MCP-FIXSTART e2081e0780 + d22681f5d2 (--fix reaps-pileup-THEN-respawns one cmd; 3-of-3 PASS; live-proven BOTH branches all-wedged->reap+start AND not-running->start on real outages) · U-MCP-CMDMATCH-FIX ed6662f45e (slash-agnostic cmdMatch + port-owner union; guard was BLIND to fwd-slash daemon -> daemonCount=0 while it owned :3100; reviewer-PASS; 0->1) · U-HOOK-UNREG-PROTOCOL-FIX 29fb555f13 (anti-hook-unreg gate was a NO-OP through its bundle: exit-code protocol vs bundle's JSON-stdout protocol -> 'NOT evaluated' every Stop AND couldn't block; pure buildVerdict + isMain guard; reviewer-PASS; LIVE-VALIDATED: the every-turn WARN is GONE).

3 live MCP outages recovered (consolidate counters 1,10,4). The recurring MCP CRASH (forces cold-boot) is the deeper root = 06-04 plan FIX-1 (papa, NOT golf).

VERIFIED ~11/14 surfaces: MCP-health(built+live) · ollama(Blackwell 96GB, models correct, live defaults->pulled) · docker(4/4) · qdrant(3 coll, NO tribal) · PSN/tribal(live, 159MB) · obsidian-vault(11886 files) · wiki(1965) · memories(recall live) · awareness · /system-viz(root-caused, self-bump CONTRAINDICATED) · hooks(FIXED). 1 prevented-bad-fix (system-viz self-bump). 10 reference_* memories.

REMAINING = fresh-budget architectural (Qdrant migration, findInGraph frugality, MCP FIX-1/2) + operator-dependent (migration-marker, CLAUDE.md doctrine) + peer-owned (galaxies, frontend). Golf-lane infra/hooks surfaces are materially hardened + correctly understood.

## RESUME
FRESH-BUDGET next golf units (dependency order, all recorded with full root-cause): (1) Qdrant tribal-collection migration — THE durable fix for the 159MB tribal-embed-index.json scaling ceiling (V8 512MB string cap + ~150MB portable-node heap cap); repoint tribal-rerank off per-prompt JSON.parse. (2) fleet-task-health migration-AWARE marker — the WARN is cry-wolf (all 9 degraded = documented ~47-task HW-migration freeze, mustExistHardDown empty); fix needs an operator-agreed machine-readable migration-active marker, NOT a static allowlist (would hide post-migration re-enable reminders). See [[reference_fleet_task_health_cry_wolf_2026_06_09]]. (3) findInGraph frugality (system-viz) — ONLY if find OOMs become frequent; do NOT self-bump (find is 1060x/day, re-exec doubles hot-path spawns — see [[reference_systemviz_find_heap_oom_2026_06_09]]). OPERATOR-DEPENDENT/PEER: CLAUDE.md ollama doc-drift 7b->32b (alpha/doctrine); MCP FIX-1/FIX-2 server-core (papa); per-galaxy synergy (7 peer slots).

## CONTEXT

