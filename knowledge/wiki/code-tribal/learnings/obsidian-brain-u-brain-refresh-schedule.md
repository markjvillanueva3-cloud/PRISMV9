# OBSIDIAN-BRAIN/U-BRAIN-REFRESH-SCHEDULE — [MAIN] [OBSIDIAN-BRAIN]/U-BRAIN-REFRESH-SCHEDULE (slot:golf): durable installer for PRISM Brain Refresh task

**Commit:** `57174e495b01` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T20:58:17-05:00
**Tags:** obsidian-brain, u-brain-refresh-schedule, auto-distilled

## Subject
[MAIN] [OBSIDIAN-BRAIN]/U-BRAIN-REFRESH-SCHEDULE (slot:golf): durable installer for PRISM Brain Refresh task

## Body
```
[MAIN] [OBSIDIAN-BRAIN]/U-BRAIN-REFRESH-SCHEDULE (slot:golf): durable installer for PRISM Brain Refresh task

brain-refresh.mjs (the 5-pipeline brain-refresh orchestrator) was wired NOWHERE -> dense
embeddings sidecar went 33h stale (recent memories BM25-reachable but dense-invisible).
This is alpha's #1-identified brain weakness (UNWIRED REFRESH PIPELINES). golf registered
'PRISM Brain Refresh' scheduled task (every 45m, non-elevated) + this installer artifact.
brain-refresh self-throttles 30m / O_EXCL lock-serialized / benign-defers when Ollama down.
Immediate relief already applied: re-embed 11035->11114 vecs. Found via 9-agent workflow
audit (3 layers of false gaps peeled by adversarial verify).
```

## Files touched (2)
- .claude/helpers/install-brain-refresh-task.ps1 | 94 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 94 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 57174e495b01`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-BRAIN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._