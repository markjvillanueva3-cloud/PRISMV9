---
name: reference_brain_refresh_task_unregistered_2026_06_09
description: "Galaxy-synthesis auto-refresh silently rots because the PRISM Brain Refresh scheduled task is unregistered on this host — all artifacts exist, only elevated registration is missing"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.482Z
aliases: reference_brain_refresh_task_unregistered_2026_06_09
---


**Finding (slot:papa, 2026-06-09):** the per-galaxy `*_synthesis.md` distillations (the Obsidian brain's *compounding arm*) silently go stale between manual runs — a 9-galaxy backlog had accumulated by 2026-06-09 (`quality, quoting, shop-floor, speed-feed, system-viz, token-optimization, tribal-knowledge, wedm, wiring`), cleared manually via `node scripts/galaxy-synthesis-refresh.mjs` (commit `c422543813` did 8; peer `synth-92788` did `quality`).

**Root cause — NOT a missing build (R8 dedup catch):** every artifact already exists —
- `scripts/galaxy-synthesis-refresh.mjs` — surgical, only regens galaxies whose memory-cluster `sourceHash` drifted; fleet-coordination claim (won't race peers); benign-defers when Ollama `/api/generate` down.
- It is **already wired** as stage 6 (`id: "galaxy-synth"`, `requires: "generate"`, `benignExits:{3:"deferred"}`) of `scripts/brain-refresh.mjs:53` (the 5→6-pipeline brain-fresh orchestrator).
- The installer already exists: `.claude/helpers/install-brain-refresh-task.ps1` (registers `PRISM Brain Refresh`, 45-min cadence, self-throttled 30m).

**The only gap:** `PRISM Brain Refresh` is **NOT FOUND** in the live scheduled-task list on this host (`node scripts/fleet-task-health-watch.mjs --json`) — the installer was never *run elevated* here. So the orchestrator (and its galaxy-synth stage) never fires automatically; syntheses only refresh when a chat runs the script by hand.

**Fix (golf / operator lane — needs an ELEVATED shell; papa has none):**
`powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-brain-refresh-task.ps1 -RunNow`
This is the SAME elevation-gated task-registration class as the recurring `scheduled-task safety net WARN` (`PRISM Blueprint OCR Batch`=stale, `PRISM Zombie Reaper v2`=disabled) — batch them in one elevated session.

**Caveat:** even once registered, the `galaxy-synth` step `requires: "generate"` (gpt-oss/qwen via `/api/generate`); when generate flaps it benign-defers (exit 3) while embeddings-gated steps still run — so a stale window can persist across runs if generate is down at every fire. Verify a real `galaxy-synth=ok` (not `deferred`) after registration. Related: [[reference_obsidian_fully_operational_2026_06_09]].
