---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_60gb_missing_inventory.md
source_filename: project_60gb_missing_inventory.md
content_hash: b7c09f3656013200221170c52192b2b7432206418dea721235293e3a76c0e028
mirror_ts: 2026-05-05T13:00:09.484Z
mirror_engine: ObsidianMemorySyncEngine
---
# Discovered 2026-04-27 (claude-9c056864)

User reported that ~60GB of PRISM files are MISSING from the current checkout — engines, skills, scripts, schemas, and "other critical folders and files." Source/cause not yet diagnosed (possible incomplete sync, deleted by mistake, or never propagated to this PC's H: drive checkout).

**Why:** PRISM is portable across PCs via H: drive (see `feedback_h_drive_master.md`). One PC's checkout is partial. Means current `PRISM-INVENTORY-LATEST.md` counts (2392 engines, 91 dispatchers, 5685 actions) UNDERCOUNT actual capability surface.

**Impact on recent work:**
- HOOK-SCHEMA-FIX commit `aa196ec4d` (PreCompact hook fixes, atomic write, session-handoff-load) is still valid — those bugs exist regardless of inventory size.
- BUT: skill/script enforcement audits performed earlier this session were INCOMPLETE. The "44 unindexed memory files" indexed into MEMORY.md is what we have NOW, but more memories may exist in the 60GB.
- Gap-fix backlog (deferred items: skill trigger frontmatter additions, stub deletions, etc.) needs RE-RUN after recovery.

**How to apply (when user triggers re-audit):**
1. Wait for the OTHER chat to finish current forge-audit run (chat bus will show idle).
2. Recover the 60GB (user will tell us source — Box cloud? other PC? backup?).
3. Re-run `/forge-audit` to discover all newly-surfaced skills, scripts, hooks.
4. Identify candidates for:
   - Auto-enforcement (e.g., things that should be hooks instead of optional skills, like the RTK enforcement we did for bash).
   - Ollama-routing offload (per `feedback_ollama_token_routing.md` — anything that's classification, summarization, docstring, lint, simple review, hook relevance-gating).
5. Update CLAUDE.md (project + global), GSD (`mcp-server/data/docs/gsd/GSD_QUICK.md`), shared directives in `state/shared/`, and any protocol docs to reflect new surface.
6. Re-index MEMORY.md with any new memories from the recovered set.
7. Verify hook coverage matches new asset surface (no more silently-broken PreCompact-class bugs).

**Status:** RESOLVED 2026-04-27T16:30 — user confirmed "all files should be back on h drive now". `resources/` restored to 49GB. Engine inventory grew from 2392 → 3011 in BASELINE_INVENTORY.json (the stale count was the cause of confusion — engines were never actually missing, only `resources/`). Commit `eb5081c21 [MAIN] FIX-DATA-LOSS-2026-04-27` from peer hardened asset-deletion guards to prevent recurrence.

**Lessons captured:**
1. PRISM-INVENTORY-LATEST counts can drift from reality between runs — always re-scan before treating count as authoritative.
2. The 60GB was *content* (training videos, CAD samples, `hyperMILL Basic` etc.) NOT *code*. Engine/dispatcher/hook/skill counts unaffected.
3. Asset-deletion-block hook needed hardening — peer chat (claude-2a125756) shipped that fix.

**Coordination:** Chat bus shows 3 peers active (claude-2c2c3e67, claude-a3adcd0c, claude-ce425dcc) plus claude-2a125756 (asset-deletion-block work, claim TTL ~12m left). Wait for these to drain before broad audits.
