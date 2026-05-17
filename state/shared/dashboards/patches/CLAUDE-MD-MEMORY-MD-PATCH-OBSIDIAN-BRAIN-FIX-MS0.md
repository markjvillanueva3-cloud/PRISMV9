# PATCH-SIBLING — OBSIDIAN-BRAIN-FIX-MS0 doc-reflection (CLAUDE.md + MEMORY.md were peer-locked)

**Created:** 2026-05-17 by claude-339c8ff7 (slot bravo)
**Reason:** `H:/prism/CLAUDE.md` (claude-41db1b82) and `MEMORY.md` (claude-23c10eea)
were peer-claimed at doc-reflection time. Per the never-commit-peer-claimed rule +
PATCH-SIBLING convention, the two doc-surface edits are recorded here for a later
integrator (or the next session that finds these surfaces unlocked) to apply.
The other two surfaces (wiki, Obsidian memory) were written directly:
`knowledge/wiki/architecture/obsidian-brain-fix-ms0.md` +
`memory/reference_obsidian_brain_fix_ms0_2026_05_17.md`.

---

## Patch 1 — `H:/prism/CLAUDE.md` §Recent regressions

Append under the most-recent `## Recent regressions` bullet:

```
- 2026-05-17 | **handoff topic-drift orphaned cross-topic work — the proven "obsidian brain not aware" root cause.** Per-agent handoffs are replace-not-merge; resume-read reads only the newest handoff for the instance, so a session that /compacts under a new topic orphans the prior topic's unfinished `## RESUME`. Confirmed live: the HTML-COMPANION→HTML-PRIMARY→MEMORY-SLOT-VIEW queue (the "bravo task queue" the operator kept asking to continue) sat unread for days in HANDOFF-...-bravo-html-stack.md. | fix: OBSIDIAN-BRAIN-FIX-MS0 — U-OBF01 `scripts/handoff-consolidate.mjs` (per-slot merger, fail-PRESERVE, commit `6eae58748c`) + U-OBF02 `session-start-auto-resume.mjs` bounded consolidated block wired into resume-read (commit `182df1aa35`). Both per-file-gate FAIL→fix→round2 BOTH PASS. Live: 39 orphaned bravo threads now surface post-/compact. | observed-by: claude-339c8ff7 slot bravo. Remaining: U-OBF03 MEMORY.md auto-compaction (acts not alerts). | verify: `git -C H:/prism show 182df1aa35`; `echo '{"source":"compact","session_id":"339c8ff7-..."}' | node .claude/hooks/session-start-auto-resume.mjs` shows the consolidated block.
```

## Patch 2 — `MEMORY.md` (`C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md`) index pointer

Add to the `## Indexed memories` list (≤200 chars/entry; check the 24,576-byte
ceiling — if at/over, run U-MEMORY-COMPRESS first, do NOT push it over):

```
- [OBSIDIAN-BRAIN-FIX-MS0](reference_obsidian_brain_fix_ms0_2026_05_17.md) — 2026-05-17 bravo. Handoff topic-drift orphaning = proven "brain not aware" root cause. U-OBF01 consolidator + U-OBF02 resume-read wiring. 39 bravo threads resurrected. U-OBF03 pending.
```

---

## Application checklist (for the integrator)

- [ ] Confirm CLAUDE.md no longer peer-claimed (chat-bus / claim TTL expired)
- [ ] Apply Patch 1 to CLAUDE.md §Recent regressions
- [ ] Confirm MEMORY.md not peer-claimed AND `wc -c` < 24576 after the add
- [ ] Apply Patch 2 to MEMORY.md `## Indexed memories`
- [ ] Delete this patch-sibling once both are applied
