---
name: feedback_ollama_pull_monitoring_discipline
description: "How to monitor a large `ollama pull` without sabotaging it — the only valid progress signal is the pull's own output / API `completed`, NEVER disk partial-blob bytes; never kill a running pull."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.438Z
aliases: feedback_ollama_pull_monitoring_discipline
---


When babysitting a large `ollama pull` (e.g. gpt-oss:120b, 65GB), follow this discipline. Violating it cost ~30GB of wasted re-download + ~1h on 2026-06-05/06 (a "stalled" download was actually healthy the whole time).

**Valid progress signals (use these):**
- The pull CLI's own stdout/stderr: `pulling <blob>: 45% ▕…▏ 29 GB/ 65 GB  4.5 MB/s`.
- The streamed `/api/pull` NDJSON: `{"completed":N,"total":M}` — `completed` is truth.

**INVALID signal (the trap):** total bytes of `*-partial*` files in `…/models/blobs`. Killed/prior attempts leave ORPHANED chunk files that inflate the on-disk total, so a *progressing* download reads as static. A stall-watchdog keyed on this byte-total will kill a healthy pull. (mtime of the newest chunk is an OK *liveness* hint, but `completed` is authoritative.)

**Never kill a running `ollama pull` on a perceived stall.** Killing makes ollama lose chunk accounting → it re-fetches from a lower point (we dropped 60GB→29GB). Ollama self-retries transient drops; just let it run.

**`ollama list` / `/api/tags` HANG while a pull saturates the server** — never build a monitor/driver that calls them mid-pull (it hangs the monitor; that's how the retry-driver got stuck). Detect completion via the pull's EXIT CODE, not a server query.

**Detached `Start-Process powershell -File <pull>.ps1` may silently NOT run the script body** (observed: no log markers, no pull CLI). Launch `ollama.exe pull <model>` DIRECTLY via `Start-Process` instead. For a guaranteed long pull, the user's own terminal (`ollama pull <model>`) is the most reliable — it keeps one CLI alive and visible.

**Resume is free:** re-running `ollama pull <model>` resumes from valid on-disk chunks (blob-dedup). A bare detached pull has no auto-restart on a hard exit — re-run to resume.

**Poison partials from concurrent/killed drivers (2026-06-06):** running >1 pull driver at once — or killing one mid-finalize — leaves orphaned `…-partial-N` temp files. ollama then hard-exits with `Error: remove …-partial-0: The system cannot find the file specified` and DISCARDS the completed layer, restarting that blob from 0% (we lost a finished ~21GB layer this way → full 65GB re-pull on the gpt-oss:120b home-network pull). Rule: **exactly ONE pull driver at a time, never concurrent**; if you see that error the layer is already gone — just let the single clean `ollama pull` re-download it (it self-heals once no competing driver leaves poison partials). Blobs on this box live at `H:\Tools\ollama\models\blobs`.

**Why:** [[reference_kimi_k26_ollama_cloud_free_verdict_2026_06]] sibling — both from the BLACKWELL home-network model pull. Relates to [[feedback_close_background_tasks_at_stop]] (don't leave pull drivers as orphans) and the BLACKWELL-MODEL-UPGRADE plan.

**How to apply:** monitoring a pull → poll the pull output or `/api/pull` `completed`; never sum partial bytes; never kill a live pull; prefer a direct `ollama.exe pull` (or the user's terminal) over a script-wrapped detached driver.
