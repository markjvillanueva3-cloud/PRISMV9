# PRISM Multi-Chat Crash Diagnosis & Fix Kit

**Date:** 2026-05-08
**Trigger:** User report - "all my chats keep crashing"
**Status:** Root cause identified, fix kit deployed, pagefile fix pending user reboot

---

## Root cause (one-liner)

**31 GB RAM + fixed 8 GB pagefile on a 92%-full C: drive = 39 GB total commit limit.**
Idle commit usage sits at **88%**. Any LLM model load, ts-language-server expansion,
or chat-context spike pushes past the limit, at which point Windows refuses
allocations *system-wide* until something releases.

Symptoms ALL trace to this single exhaustion class:
- ONNX `bad allocation` on MinerU/magika imports
- Transformers OOM during Qwen2.5-VL CPU init
- `dwm.exe` (window manager) crashes
- Docker Desktop, PowerShell, GameManagerService crashes
- WerFault.exe itself crashing (the system can't even report errors)
- Claude chats dying randomly

## Evidence

| Signal | Value | Implication |
|---|---|---|
| Total RAM | 31.2 GB | OK |
| **Pagefile** | **fixed 8/8 GB on C:** | **The bug** |
| Commit limit | 39.2 GB | Too small for the workload |
| Commit at idle | 34.6 GB (88%) | Always near the wall |
| C: free | 143 GB / 1906 GB used (92% full) | Pagefile can't grow even if set auto |
| H: free | 2,860 GB | Where pagefile *should* live |
| Resource-Exhaustion events (6h) | 35+ | One every 10 min |
| Top virtual-memory consumer | `node.exe` 38 GB | A 6.9M-token Claude chat |
| Concurrent Claude chats | 5-6 | Each 1-3 GB private |
| Ollama instances | 2-3 | Each 2-7 GB resident |

The 38 GB node process was an exhausted Claude Code chat - JS heap grows roughly
linearly with conversation token count. A 6.9M-token session = 6-8 GB JS heap +
hook tree + tsserver = the single chat alone exceeded the original 39 GB limit.

## Fix kit deployed

All under `H:/prism/scripts/system-health/`:

| Script | Effect | Admin? | Reboot? |
|---|---|---|---|
| `01-pagefile-relocate.ps1` | Move pagefile C: -> H:, system-managed (39 GB -> 60-90 GB on demand) | yes | yes |
| `02-kill-zombie-tsservers.ps1` | Reap leaked tsserver/MCP/playwright nodes | no | no |
| `03-commit-pressure-check.mjs` | CLI snapshot + Stop-hook gate | no | no |
| `04-pre-launch-check.ps1` | Composite pre-chat sanity report | no | no |
| `05-soft-config-tweaks.ps1` | Ollama keep-alive, parallelism caps, tsserver memory | no | no |

Plus a wired Stop hook: `H:/prism/.claude/hooks/commit-pressure-stop-gate.mjs`
(75% advisory, 85% warn, 92% BLOCK with override env).

Wired into `Stop` chain in `H:/.claude/settings.json` after `stop_on_failing_tests`.

## Run order (do this once)

1. `powershell -File H:/prism/scripts/system-health/02-kill-zombie-tsservers.ps1` (already run, reclaimed ~720 MB)
2. `powershell -File H:/prism/scripts/system-health/05-soft-config-tweaks.ps1` (sets ollama env vars)
3. **Manually** add to VS Code/Cursor settings.json:
   ```json
   "typescript.tsserver.maxTsServerMemory": 4096,
   "typescript.tsserver.experimental.enableProjectDiagnostics": false
   ```
4. Open elevated PowerShell, run `01-pagefile-relocate.ps1`, REBOOT.
5. After reboot, baseline commit usage should drop from 88% to 50-60%.

## Operating policy (post-fix)

These rules keep you in the green zone:

1. **Cap concurrent Claude chats at 3.** Above that, hook trees alone consume 2+ GB.
2. **`/compact` at <=2M tokens, never >4M.** A single chat at 6.9M tokens =
   that 38 GB process you saw.
3. **Stop ollama models you aren't using:** `ollama stop <model>`. Each is 2-7 GB.
4. **Don't load FP32 LLMs on CPU.** Always quantize (4-bit GGUF) or
   `device_map="cuda"` only. Transformers' CPU init phase allocates the full
   FP32 weights *before* moving to GPU - that's what kills MinerU/Phase 9.
5. **MinerU/magika imports cost ~1 GB ONNX commit.** Don't combine with active
   FP32 LLM loads. They share the commit pool.
6. **Run `04-pre-launch-check.ps1` once per work session.** Reaps zombies and
   shows headroom.

## Additional gaps identified (not yet addressed)

### Disk-space gaps on C: (limits pagefile growth)

- **Box at `C:\Users\wompu\AppData\Local\Box` = 249 GB.** Single biggest C:
  hog. Box client supports relocation: open Box -> Settings -> "Local files
  and folders" -> change to `H:\Box-cache`. Frees up to 249 GB.
- **`AppData\Local\npm-cache` = 5.9 GB on C:.** `npm cache clean --force`
  needs admin (Box / Windows ACL). Run from elevated shell to reclaim.
  (Cleared 3.4 GB of pip cache during this session.)
- **`AppData\Local\Temp` = 3.4 GB.** Reboot clears most of it.
- **`AppData\Local\Docker` = 22.2 GB.** Docker Desktop supports moving the
  data root to H: via Settings -> Resources -> Disk image location.

### Process / hook gaps

- **39+ baseline node processes.** Each is ~75 MB minimum (V8 baseline). MCP
  servers don't share a host process. Future: shared MCP host (~2 GB savings).
- **194 handoff files across 135 distinct session IDs.** Stop-hook scanners
  iterate the whole directory. Future: `prism_session:archive_old_handoffs`.
- **`compaction-budget-nudge.mjs` exists but is NOT wired.** It's a PostToolUse
  hook that reads `state/token-economy-session.json` and nudges /precompact at
  60% / 80% thresholds. The state file is being maintained. To enable, add to
  the PostToolUse chain in `settings.json`:
  ```json
  {"type":"command","command":"\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/compaction-budget-nudge.mjs","timeout":3000}
  ```
  Defer wiring until commit pressure is healthy (post-pagefile-fix).
- **HuggingFace cache not in Defender exclusions.** Add
  `H:/Tools/huggingface_cache` to exclusions if you see Defender CPU spikes
  during model loads.
- **Ollama and Claude both compete for the same physical RAM.** GPU offload
  (`ollama run --gpu`) helps but only some models support full GPU offload.

### TypeScript Server gaps (the recurring 3 GB leak path)

- IDE settings cap is `typescript.tsserver.maxTsServerMemory: 4096` (manual).
- After hours of editing 3000+ engine files, tsserver project graph balloons
  past 3 GB on its own. The reaper handles >60-min-old leaks but the IDE
  respawns immediately. Cap in editor settings is the only durable fix.
- **Two simultaneous IDE workspaces open on the PRISM repo = 2 tsservers
  = 6+ GB.** Close any duplicate VS Code / Cursor windows on the same repo.

## Related files

- `state/shared/handoffs/HANDOFF-claude-d6649069-docustrata-phase8-9.md` -
  the original "Phase 9 blocked by env memory fragmentation" handoff that
  led to this diagnosis
- `state/shared/PHASE9-BUILD-STATUS-2026-05-09.md` - documents the specific
  ONNX `bad_alloc` symptom set
- `H:/prism/.claude/hooks/commit-pressure-stop-gate.mjs` - the Stop-hook gate
- `H:/.claude/settings.json` line ~329 - where the hook is wired
