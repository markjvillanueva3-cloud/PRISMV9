# BLACKWELL-VRAM-GUARD/U-VRAM-ADMISSION-GUARD — [MAIN] [BLACKWELL-VRAM-GUARD]/U-VRAM-ADMISSION-GUARD (slot:golf): PreToolUse:Bash GPU-VRAM admission guard -- warns/defers heavy local-inference launches (>=20b model) that would not fit free VRAM on the single 96GB Blackwell card (footprint-vs-free + 90% pressure floor), preventing the gpt-oss:120b-evicts-warm-32b thrash that hits every slot. Shared dep-free lib gpu-vram-guard.mjs (readGpuVram superset-shape-ready for fleet-reaper consolidation) + hook (warn|ask|block|off modes, fail-open, test seam). 33/33 tests (lib 24 + hook 9, real ref values incl the live 88.5%/120b case), live-validated vs real nvidia-smi (80048MiB est > 66449 safe-free -> warned at 24.6% pressure). Wired global Bash matcher (all 26 slots). R15 WIRE+TEST+VALIDATE+APPLY-ALL.

**Commit:** `f3eb0c1c15ab` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T09:34:30-05:00
**Tags:** blackwell-vram-guard, u-vram-admission-guard, auto-distilled

## Subject
[MAIN] [BLACKWELL-VRAM-GUARD]/U-VRAM-ADMISSION-GUARD (slot:golf): PreToolUse:Bash GPU-VRAM admission guard -- warns/defers heavy local-inference launches (>=20b model) that would not fit free VRAM on the single 96GB Blackwell card (footprint-vs-free + 90% pressure floor), preventing the gpt-oss:120b-evicts-warm-32b thrash that hits every slot. Shared dep-free lib gpu-vram-guard.mjs (readGpuVram superset-shape-ready for fleet-reaper consolidation) + hook (warn|ask|block|off modes, fail-open, test seam). 33/33 tests (lib 24 + hook 9, real ref values incl the live 88.5%/120b case), live-validated vs real nvidia-smi (80048MiB est > 66449 safe-free -> warned at 24.6% pressure). Wired global Bash matcher (all 26 slots). R15 WIRE+TEST+VALIDATE+APPLY-ALL.

## Body
```
[MAIN] [BLACKWELL-VRAM-GUARD]/U-VRAM-ADMISSION-GUARD (slot:golf): PreToolUse:Bash GPU-VRAM admission guard -- warns/defers heavy local-inference launches (>=20b model) that would not fit free VRAM on the single 96GB Blackwell card (footprint-vs-free + 90% pressure floor), preventing the gpt-oss:120b-evicts-warm-32b thrash that hits every slot. Shared dep-free lib gpu-vram-guard.mjs (readGpuVram superset-shape-ready for fleet-reaper consolidation) + hook (warn|ask|block|off modes, fail-open, test seam). 33/33 tests (lib 24 + hook 9, real ref values incl the live 88.5%/120b case), live-validated vs real nvidia-smi (80048MiB est > 66449 safe-free -> warned at 24.6% pressure). Wired global Bash matcher (all 26 slots). R15 WIRE+TEST+VALIDATE+APPLY-ALL.
```

## Files touched (5)
- .../__tests__/gpu-vram-admission-guard.test.mjs    | 101 +++++++++++
- .claude/hooks/gpu-vram-admission-guard.mjs         | 137 +++++++++++++++
- scripts/lib/gpu-vram-guard.mjs                     | 194 +++++++++++++++++++++
- scripts/lib/gpu-vram-guard.test.mjs                | 153 ++++++++++++++++
- 4 files changed, 585 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f3eb0c1c15ab`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-VRAM-GUARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._