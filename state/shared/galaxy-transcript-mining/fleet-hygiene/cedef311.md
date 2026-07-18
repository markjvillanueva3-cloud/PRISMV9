# fleet-hygiene session cedef311 (2026-05-19, 23.9MB, spine 143KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `scripts/enrich-roadmap‑knowledge.mjs` (f5403a8274) – 439 roadmap units enriched; 2302 verified wiki paths, 6 hallucinations, 106 csCoreGaps.  
- Docker Desktop 29.4.3 re‑installed with WSL2 backend; `docker-desktop` distro provisioned and engine running.  
- NIM image `nim‑llama32‑3b` pulled; autostart hook wired to launch on Docker availability (Tier‑3 keepalive).  
- Fleet‑Reaper registered as SYSTEM principal; scheduled task “PRISM Fleet Reaper” (5‑min cadence) created.  
- PRISM_PRESSURE_GATE=1, PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT=78 set.  
- Ollama reconfigured: NUM_PARALLEL=3, KEEP_ALIVE=5m, MAX_LOADED_MODELS=3, CONTEXT_LENGTH=16384.  
- Legacy allowlist hook bypassed via `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1`; monitor now uses `tail -F`.  
- Commit 6063055e65 – full 3‑pass knowledge enrichment; commit 92432b01dc – “no‑delete‑files” hook, slot‑worktree bootstrap helper, alphabetic slot expansion.  
- Commit 64d1793dc4 – Wave 1 autocompact/compact‑watchdog tuning (80 % threshold, 48 K output cap) + slot‑bind‑enforce integration.  
- Commits e05d90be96 & 302aab881b – pointer‑mode conversion for ai‑deep‑intelligence, claude‑brief‑inject, ai‑command‑awareness, awareness‑snapshot‑inject, build‑state‑inject.  
- Tier‑3 (NIM keepalive) and Tier‑4 (global memory compaction) added to fleet‑reaper sweep; all tests green.

**DECISIONS**  
- Fleet‑Reaper ownership → golf (2026‑05‑16).  
- Slot‑bind‑enforce hook deterministically claims golf slot on `/startup‑golf`.  
- Autocompact threshold lowered to 80 % (plan to drop to 60 %).  
- Memory compaction tier triggers at ≥88 % commit pressure; uses `EmptyWorkingSet` via PowerShell.  
- NIM keepalive integrated into fleet‑reaper sweep (Tier‑3) with 300 s cooldown.  
- Pointer‑mode conversion for SessionStart hooks reduces context bloat >70 %.  
- Slot‑worktree‑cwd‑advisory.mjs warns when chat in shared tree.  
- Legacy allowlist hook bypassed (`PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1`).  
- Use `tail -F` for monitor logs to survive rotation.  
- Reinstall Docker with WSL2 backend; avoid manual distro provisioning.  
- Apply BOM to PowerShell installer scripts containing em‑dash characters.

**OPERATOR DIRECTIVES**  
- Keep fleet‑reaper, NIM, Docker, and Ollama running to maintain stability for ≥12 chats.  
- Verify all 15 chat slots receive enriched knowledge (slot‑task‑queues.json remains empty).  
- Monitor context size: confirm `Downloads\context.png` shows 7 m vs 1 m cap; adjust token savings if needed.  
- Enable auto‑compaction with context retention features to sustain autonomous workflow.  
- Run final `/compact` on heaviest chat to drop memory pressure below 80 %.  
- Schedule periodic health checks (every 5 min) for fleet‑reaper monitor and scheduled task status.

**FINDINGS/BUGS**  
- Docker wedged due to unregistered distro; resolved by reinstall + WSL2.  
- PowerShell scripts had UTF‑8 em‑dash without BOM → parse errors in 3 installer scripts.  
- Monitor died on log rotation (`tail -f`); fixed with `tail -F`.  
- Legacy allowlist hook blocked writes outside hygiene paths; bypassed via env var.  
- Memory critical (90–93 %) during NIM image pull; dropped to 76–80 % after sweeps.  
- Hallucinations cluster in speculative leaf‑engine wikis (`engines/<dir>/<engine>.md`).  
- 106 csCoreGaps across units.  
- 12 chats crashed due to stale slots before memory compaction tier.  
- NIM down at sweep start; restart logic now works (Tier‑3).  
- Docker probe shows malformed state; requires manual `docker compose up` with mem_limit.  
- `require("node:child_process")` error in ES‑module NIM keepalive code fixed.  
- Heartbeat‑keepalive timeout bug corrected from 8 ms → 8000 ms.

**DOMAIN SPECIFICS**  
- **Fleet‑Reaper sweep JSON**:  
  - `slots["owned‑by‑crashed"]`  
  - `softRelief.{priorityDemoted,workingSetTrimmed,rssReclaimedBytes}`  
  - `gpu.{freeMb,utilizationPct}`  
  - `ollama.{reachable,loaded[]}`  
  - `coordinator.{shouldPrewarm,prewarmFired,hintWritten,thresholdDelta,hintMode}`  
- **Chat‑slot helpers**: `H:/prism/.claude/helpers/chat-slots.mjs` (claim/reclaim).  
- **Monitoring paths**: `state/shared/golf-bypass.jsonl`, `state/shared/fleet-reaper.log`.  
- **Enrichment files**: `state/shared/roadmap-tool-plans.json` (439 units), `scripts/enrich-roadmap‑knowledge.mjs`.  
- **Wiki enrichment passes**: pass 1 (arch, se, cs, build); pass 2 (gap‑fill); pass 3 (verify+consolidate).  
- **Session‑start auto‑resume**: reads `HANDOFF‑<slot>‑<topic>.md`, injects `RESUME`.  
- **Auto‑precompact watchdog**: triggers every 15 turns or on compact‑signal keywords.  
- **Memory compaction tier**: `$p.MinWorkingSet=-1` for all claude/node/bash processes; fires at ≥88 % commit pressure.

**TOOLS USED**  
- PRISM scripts/hooks: `fleet-reaper-sweep.mjs`, `chat-slots.mjs`, `slot-bind-enforce.mjs`, `slot-worktree-bootstrap.mjs`, `claude-no-delete-files.mjs`, `mcp-connectivity-check.mjs`, `auto-precompact-watchdog.mjs`, `session-start-auto-resume.mjs`, `slot-worktree-cwd-advisory.mjs`.  
- Skills: `/checkin-golf`, `fleet-reaper`, `golf-slot-reaper-guardian.mjs`, `golf-slot-write-allowlist.mjs`.  
- Installer scripts: `install-fleet-reaper-task.ps1`, `install-<task>-task.ps1` (5 tasks).  
- External tools: Docker Desktop, WSL2 (`wsl --list`, `wsl --shutdown`), Ollama CLI, NIM container runtime.  
- Test harnesses: Node test framework, PowerShell memory‑compaction scripts.

**OPEN THREADS**  
1. **Wave 3** – audit‑viz‑first‑inject rate‑gate (~100 KB/session).  
2. **Wave 4** – retire `linear-roadmap-sync`, `supabase-state-sync`, `curiosity-explorer`.  
3. **Wave 5** – slot‑worktree migration runbook for `/checkin-<nato>` skills; extend bootstrap to write `chat-slots.json:branch`.  
4. **Task 5** – audit & implement slot ↔ system‑viz / Obsidian / NN auto‑sync (new hook + dashboard integration).  
5. **Autocompact threshold** – evaluate 60 % vs 80 % impact on quality; confirm no regressions before global flip.  
6. **NIM keepalive** – monitor long‑term stability under heavy chat load; adjust cooldown if needed.  
7. Verify all 15 chat slots receive enriched knowledge (slot‑task‑queues.json empty).  
8. Confirm NIM fully running after Docker re‑install and autostart hook fires on next SessionStart.  
9. Run final `/compact` on heaviest chat to ensure memory pressure < 80 %.  
10. Schedule periodic health checks (every 5 min) for fleet‑reaper monitor and scheduled task status.
