---
name: gptoss-pull-synergy-golf-2026-06-04
description: "gpt-oss:120b (65GB) finish-the-pull made durable via scripts/ollama-resilient-pull.ps1 (detached self-resuming loop, survives session, MaxWallClockMin deadline). Synergy ALREADY auto-arms (R8 no-dup): ollama-cost-router best-tier lists gpt-oss:120b first install-gated; resolveSynthesisModel down-walk promotes it the moment ollama list shows it. Reaped 3 stale curl pull-orphans."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.133Z
aliases: reference_gptoss_pull_synergy_golf_2026_06_04
---


2026-06-04 (slot golf). Operator + alpha (chat bus, U-BW-RESEARCH-REFINE 74077e38cb): "finish the 65GB gpt-oss pull + synergize to the full system."

**State found.** gpt-oss:120b pull was ~94% on disk (60.88GB partial blob intact) but kept dying — alpha's raw `curl ... /api/pull` exited 255 repeatedly (the ollama SERVER aborts a pull when its requesting client disconnects). 3 orphaned curl clients (parent-dead, 57-82min) were littering. Models on `H:/Tools/ollama/models` (2.1TB free). ollama CLI at `C:\Users\wompu\AppData\Local\Programs\Ollama\ollama.exe` (not on git-bash PATH; IS in PowerShell).

**Did:**
1. Reaped the 3 confirmed curl orphans (parent-dead + >30min + :11434 pull-curls; re-verified at kill time).
2. Built `scripts/ollama-resilient-pull.ps1` (commit b3026dfb51 + scrutiny-fix 3e39feeaaa) — a detached, self-resuming `ollama pull` loop: resumes from the partial (blob-level, forward-only), retries on every drop, MaxTries cap + always-on `MaxWallClockMin` wall-clock deadline (12h default) so it can't spin forever, exact NAME-column install-detection. Launched detached (PID 65904) so it survives session-end. Pull advancing (~23GB/65GB at ~8MB/s, ETA ~1.5h when last checked).

**Synergy = ALREADY WIRED (R8 — did NOT rebuild).** `.claude/hooks/lib/ollama-cost-router.mjs routeModelForTask`: `TIER_PREFERENCES.best` lists `gpt-oss:120b` FIRST, `strong` lists `gpt-oss:20b` FIRST, both **install-gated** — the down-walk only ever returns an INSTALLED model, so it auto-promotes the moment `ollama list` shows gpt-oss. Consumers route through `resolveSynthesisModel` (host-aware-synthesis-model.mjs): `ask-ollama.mjs`, the 3 galaxy-synthesis scripts, `summarize-all-scripts-via-ollama.mjs`, `ollama-task-offloader.mjs`. So on pull completion the whole local-synthesis/reasoning tier auto-upgrades to the 120B MoE (134 t/s) on the Blackwell 96GB. **Remaining: a smoke test once installed** (confirm gpt-oss:120b loads on GPU + generates + is selected) — the monitoring /loop or a future tick should run it; check `ollama list` for `gpt-oss:120b` then `ollama run gpt-oss:120b "hi"`.

Builds on [[reference_blackwell_gpu_synergy_golf_2026_06_04]]. Pull log: `state/shared/ollama-resilient-pull.log`.
