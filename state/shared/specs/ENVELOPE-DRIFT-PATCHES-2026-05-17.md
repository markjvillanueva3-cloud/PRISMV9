# Envelope Drift Patches — Dry-Run Advisory
**Date:** 2026-05-17 · **Source:** OBSOLESCENCE-CLEANUP-MS0/U-OBS-F2 · slot mike
**Generator:** `/envelope-sync` doctrine (dry-run mode per hard rule #1)

## 12 milestones with drift (advisory only — DO NOT auto-apply)

All 12 have `drift: "claims_completed_but_units_pending"` — envelope says `status: "completed"` but units shipped count = 0 of total. Each requires operator review of the unit list before deciding:
- **Real envelope drift** → flip to `"in_progress"` or `"not_started"`
- **Silent close-out** (units shipped under wrong subject) → flip per-unit `status: "completed"` with `commit_sha`
- **Renamed milestone** → archive envelope + redirect references

| Milestone ID | Total units | Action proposal |
|---|---|---|
| MF-MS1 | 4 | Investigate: claim "completed" but 0/4 shipped. Either re-flip to not_started OR find units under wrong scope. |
| MF-MS2 | 3 | Same pattern as MF-MS1. |
| ACP-MS0 | 5 | Same pattern. |
| HOOKS-AUTOMATION-V2-MS0 | 10 | Per CLAUDE.md regressions, hooks-automation work IS shipped under various scopes; likely silent close-out. |
| HTML-PRIMARY-MS0 | 7 | New (vs baseline) — investigate. |
| INFRA-CLOSEOUT-MS0 | 2 | Probable silent close-out. |
| OCTOPUS-NEURAL-MS0 | 5 | Investigate. |
| MS-DOCU-FINISH | 3 | Investigate. |
| MS-DOCU-INGEST | 2 | Investigate. |
| RGS-TOOL-AUTOINVOKE-MS0 | 12 | Per memory `[[reference_rgs_tool_autoinvoke_ms0_2026_05_16]]`, MS0 shipped 12 units; this should be `consistent`, not drift. Likely a MILESTONE_PROGRESS regen lag. |
| SKILLS-UTILIZATION-MS0 | 8 | Investigate. |
| TRAINING-LEARNING-MS0 | 7 | Investigate. |

## Recommended workflow

For each milestone:
1. `git -C H:/prism log --all --oneline | grep <MILESTONE-ID>` — find shipped commits
2. `cat mcp-server/data/milestones/<MILESTONE-ID>.json | jq '.phases[].units[] | {id, status, completed_at, completed_by_sha}'` — inspect unit state
3. Compare commits vs envelope; for each unit with a commit but `status: "pending"`:
   - Add `completed_at` + `completed_by_sha` to the unit
   - Flip envelope `status` to `"in_progress"` or `"completed"` per shipped ratio
4. Commit the envelope patch with `[SCOPE]/U-CLOSE-OUT-N` subject

## Hard rules (from /envelope-sync skill)

1. **Never auto-apply** without operator `--apply` flag and visual review of each patch.
2. **Preserve all other envelope fields** — only touch `status`, `phases[].units[].status`, `completed_at`, `completed_by_sha`.
3. **Multi-chat safety**: check chat-bus claims before editing each envelope.
4. **Conflict-fork rule applies**: if commit-ownership-guard hollows the edit, fork to sibling worktree.

## Why this is advisory not auto-execute

Auto-flipping these envelopes silently re-injects 12 milestones × ~6 avg units = ~72 "pending" units into `/pick-unit`'s candidate set. Per the operator's stated discipline ("don't pivot on each new finding; finish current work first"), bulk envelope edits mid-session would distract from OBSOLESCENCE-CLEANUP-MS0 completion. Triage one milestone per follow-up session, or fold into MEMORY-AUDIT-WEEKLY /loop.

## Re-run

```bash
node -e "const ms=require('H:/prism/state/shared/MILESTONE_PROGRESS.json');const all=Array.isArray(ms)?ms:(ms.milestones||[]);console.log(all.filter(m=>m.drift && !['consistent','n/a','aligned'].includes(m.drift)).length)"
```

Expected: `0` after all 12 are triaged.

---

_F2 deliverable: advisory dry-run, not auto-apply. Reduces F3 verification baseline from 11/12 → 0 once operator triages each milestone in follow-up. Status: ADVISORY EMITTED; operator triage pending._
