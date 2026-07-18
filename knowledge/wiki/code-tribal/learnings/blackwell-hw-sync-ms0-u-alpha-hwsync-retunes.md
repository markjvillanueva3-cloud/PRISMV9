# BLACKWELL-HW-SYNC-MS0/U-ALPHA-HWSYNC-RETUNES — [MAIN] [BLACKWELL-HW-SYNC-MS0]/U-ALPHA-HWSYNC-RETUNES (slot:alpha): apply operator-approved new-HW retunes (9950X3D2 16C/32T + RTX PRO 6000 Blackwell)

**Commit:** `e5ad4ea80295` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T10:34:36-05:00
**Tags:** blackwell-hw-sync-ms0, u-alpha-hwsync-retunes, auto-distilled

## Subject
[MAIN] [BLACKWELL-HW-SYNC-MS0]/U-ALPHA-HWSYNC-RETUNES (slot:alpha): apply operator-approved new-HW retunes (9950X3D2 16C/32T + RTX PRO 6000 Blackwell)

## Body
```
[MAIN] [BLACKWELL-HW-SYNC-MS0]/U-ALPHA-HWSYNC-RETUNES (slot:alpha): apply operator-approved new-HW retunes (9950X3D2 16C/32T + RTX PRO 6000 Blackwell)

Per HARDWARE-DRIVE-SYNC-AUDIT-2026-06-08 §6 (operator: apply safe retunes, keep 47 tasks disabled, docker/NIM audit-only):
- vitest.config.ts: maxThreads/maxConcurrency 8->16 for the 16-core CPU. BONUS: migrated poolOptions.threads.* -> top-level test.* — Vitest 4.1.5 REMOVED poolOptions, so the worker tuning was SILENTLY IGNORED (latent regression). Now the 16-thread setting actually applies.
- MIN/McxBatchExtractorEngine: defaultConcurrency() ceiling 8->16 + os.cpus().length -> os.availableParallelism() (honors cgroup/affinity). Both test assertions [1,8]->[1,16]. 33/33 green.
- gpu_health.py(3) + GpuStackHealthEngine.ts(2): operator-facing install strings cu129->cu128 (live torch verified 2.11.0+cu128 sm_120 GREEN; gate logic is version-agnostic).
- BLACKWELL-AI-UPGRADE-PLAN: AS-BUILT cu128 reconciliation banner (R7 — preserved researched cu129 training-stack rationale, did not delete).
- DOCKER-NIM-AUDIT-2026-06-08.md: report-only — no P0, compose+nim-launcher Blackwell-aligned, NIM dormant-by-design.

Live-applied (not in this commit): OLLAMA_MAX_LOADED 4->6 + FLASH_ATTENTION (05-soft-config-tweaks.ps1 blackwell tier); PRISM_EMBED_CONCURRENCY=16 + python-path + CPU-string in C: settings/memory (auto-mirrored).

3-of-3 scrutiny PASS (A holistic / B test+wiring / C analyst). Atomic-sync audit: graph+index fresh, galaxy CLAUDE.md/MEMORY.md complete, souls 26/26, anti-revert model guard 3/3, resolver routes blackwell->qwen2.5-coder:32b.
```

## Files touched (10)
- mcp-server/src/__tests__/MINBatchExtractorEngine.test.ts   |  4 ++--
- mcp-server/src/__tests__/McxBatchExtractorEngine.test.ts   |  4 ++--
- mcp-server/src/engines/GpuStackHealthEngine.ts             |  4 ++--
- mcp-server/src/engines/MINBatchExtractorEngine.ts          | 15 +++++++++++----
- mcp-server/src/engines/McxBatchExtractorEngine.ts          | 16 ++++++++++++----
- mcp-server/vitest.config.ts                                | 49 ++++++++++++++++++++++++++-----------------------
- scripts/py/gpu_health.py                                   |  6 +++---
- state/shared/DOCKER-NIM-AUDIT-2026-06-08.md                | 25 +++++++++++++++++++++++++
- state/shared/specs/BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md | 23 +++++++++++++++++++++++
- 9 files changed, 106 insertions(+), 40 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e5ad4ea80295`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-HW-SYNC-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._