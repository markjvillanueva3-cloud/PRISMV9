# PRISM System Health Toolkit

Diagnostic + remediation scripts for the recurring multi-chat crash class
documented in `state/shared/handoffs/HANDOFF-claude-d6649069-docustrata-phase8-9.md`
and the 2026-05-08 diagnosis session.

## The crash class (one-liner)

Concurrent Claude chats + ollama + ts-language-servers + pytorch on a 31 GB
RAM box with an 8 GB **fixed C: pagefile** = commit limit ~39 GB. Idle baseline
sits at 88%. Any LLM model load or chat-context spike pushes past 100%, at
which point Windows refuses allocations system-wide. Symptoms: ONNX
`bad_alloc`, dwm.exe crashes, Docker/PowerShell crashes, "chats die randomly".

## Scripts (numbered = recommended run order)

### `01-pagefile-relocate.ps1` (admin, one-shot, REBOOTS)

The single biggest fix. Moves pagefile from C:\ (143 GB free) to H:\ (2.8 TB
free) and switches to system-managed sizing so it can grow on demand.

```powershell
# Right-click PowerShell -> Run as Administrator
cd H:\prism\scripts\system-health
powershell -ExecutionPolicy Bypass -File .\01-pagefile-relocate.ps1
```

After reboot, commit limit grows from a fixed 39 GB to roughly 60-90 GB
on demand. **Expected to eliminate ~80% of the random crash incidents.**

### `02-kill-zombie-tsservers.ps1` (no admin, safe, fast)

Kills leaked TypeScript language servers (>60 min old, often holding 1-3 GB),
stale MCP `dist/index.js` orphans, and dead playwright MCP launchers. VS Code
auto-respawns tsserver on next file save - no data loss.

```powershell
# Dry-run first to see what would happen
powershell -ExecutionPolicy Bypass -File .\02-kill-zombie-tsservers.ps1 -DryRun

# Real run
powershell -ExecutionPolicy Bypass -File .\02-kill-zombie-tsservers.ps1
```

Run any time commit pressure is in the WATCH zone (>=75%).

### `03-commit-pressure-check.mjs` (no admin, fast, scriptable)

CLI snapshot of current commit pressure + top consumers. Exit codes:
0 healthy, 1 watch (>=75%), 2 critical (>=85%).

```bash
node H:/prism/scripts/system-health/03-commit-pressure-check.mjs
node H:/prism/scripts/system-health/03-commit-pressure-check.mjs --json
node H:/prism/scripts/system-health/03-commit-pressure-check.mjs --quiet
```

Wired into the Stop hook `H:/prism/.claude/hooks/commit-pressure-stop-gate.mjs`
so it fires automatically at end of every chat task.

### `04-pre-launch-check.ps1` (no admin)

Run before opening a new Claude chat or starting a heavy local-LLM run.
Composes the pressure check, zombie scan, and ollama-loaded-models view
into one report.

```powershell
powershell -ExecutionPolicy Bypass -File H:/prism/scripts/system-health/04-pre-launch-check.ps1
```

## Operating policy (post-fix)

After running 01 + the Stop-gate hook, follow these rules to stay healthy:

1. **Cap concurrent Claude chats at 3.** Each chat + its hook tree consumes
   1.5-3 GB private commit; 6 chats x 2.5 GB = ~15 GB just for Claude.
2. **`/compact` at <=2M tokens, never >4M.** A 6.9M-token session is a 38 GB
   private node process - one accident from kernel OOM.
3. **Stop ollama models you aren't using:** `ollama stop <model>`. Each is 2-7 GB.
4. **Don't load FP32 LLMs on CPU.** Always quantize (4-bit GGUF) or use
   `device_map="cuda"`. Transformers' CPU init phase allocates the full FP32
   weights *before* moving to GPU.
5. **Don't run MinerU / magika imports while a chat is active.** Their ONNX
   sessions allocate ~500 MB-1 GB pinned. Combine with point 4 = crash.
6. **Heartbeat health check: run `04-pre-launch-check.ps1` once per work
   session.** If WATCH or CRITICAL, run `02-kill-zombie-tsservers.ps1` first.

## Hook integration

Add to `.claude/settings.json` Stop hook chain (after the existing scrutiny
gate so it doesn't block scrutiny):

```json
{
  "type": "command",
  "command": "H:/.claude/bin/portable-node H:/prism/.claude/hooks/commit-pressure-stop-gate.mjs",
  "continueOnError": false,
  "name": "commit-pressure-gate"
}
```

The hook outputs JSON on stdout: `{continue: false, stopReason: "..."}` at
>=92%. Set env `PRISM_PRESSURE_GATE=0` to bypass for one session.

## Known further gaps (TODO)

- **HuggingFace cache on H:** confirmed at `H:/Tools/huggingface_cache/`,
  good - keeps 15 GB Qwen2.5-VL off C:.
- **Ollama keep-alive default is 5 min.** Set `OLLAMA_KEEP_ALIVE=30s` in
  shell env if you find models linger past use.
- **Defender exclusions look correct** for `H:/.claude`, `H:/prism/.claude`,
  `H:/prism/cad-engine/.venv`, `H:/prism/mcp-server/data/state`. Add
  `H:/Tools/huggingface_cache` if you see Defender CPU spikes during model
  loads.
- **Multiple ollama.exe instances** (3 visible at last check) - no built-in
  cap. If problematic, set `OLLAMA_NUM_PARALLEL=1`.
- **39 node processes baseline** is high. Each MCP server is its own node.
  Future work: shared MCP host process (would save ~2 GB at idle).
