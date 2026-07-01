---
name: reference_post_ship_blackwell-vram-guard-u-vram-admission-guard
description: Auto-distilled learnings from shipping BLACKWELL-VRAM-GUARD/U-VRAM-ADMISSION-GUARD (commit f3eb0c1c1). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.766Z
aliases: reference_post_ship_blackwell-vram-guard-u-vram-admission-guard
---


# BLACKWELL-VRAM-GUARD/U-VRAM-ADMISSION-GUARD

[MAIN] [BLACKWELL-VRAM-GUARD]/U-VRAM-ADMISSION-GUARD (slot:golf): PreToolUse:Bash GPU-VRAM admission guard -- warns/defers heavy local-inference launches (>=20b model) that would not fit free VRAM on the single 96GB Blackwell card (footprint-vs-free + 90% pressure floor), preventing the gpt-oss:120b-evicts-warm-32b thrash that hits every slot. Shared dep-free lib gpu-vram-guard.mjs (readGpuVram superset-shape-ready for fleet-reaper consolidation) + hook (warn|ask|block|off modes, fail-open, test seam). 33/33 tests (lib 24 + hook 9, real ref values incl the live 88.5%/120b case), live-validated vs real nvidia-smi (80048MiB est > 66449 safe-free -> warned at 24.6% pressure). Wired global Bash matcher (all 26 slots). R15 WIRE+TEST+VALIDATE+APPLY-ALL.

**Shipped:** 2026-06-10T09:34:30-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[blackwell-vram-guard-u-vram-admission-guard]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._