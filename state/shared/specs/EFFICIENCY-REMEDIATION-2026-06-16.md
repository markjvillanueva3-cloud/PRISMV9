# PRISM Efficiency Remediation — verified action plan (2026-06-16, slot:bravo)

> Driven by operator /goal: "max out MCP server efficiency relative to PC specs; chats lose connection + enforcements don't work — automate+enforce; optimize PC/CLI/Ollama/Obsidian/Hermes settings; commit-memory hangs."
> Host: RTX PRO 6000 Blackwell **96GB VRAM**, Ryzen 9950X3D **32T**, **136GB RAM** (os.totalmem; ~127GB usable), commit limit **>227GB** (RAM + C: 64GB-max + H: 128GB pagefiles), NVMe.
> Every value below was LIVE-VERIFIED 2026-06-16 (ollama `/api/ps` + `/api/tags`, registry env, config files, `Win32_PageFileSetting`, `powercfg`). Corrections to the first investigation pass are flagged **[CORRECTED]**.

---

## ✅ DONE THIS SESSION (shipped + live-validated)

**Connection auto-enforcement** — `MCP-CLIENT-ENFORCE-MS1` (commits `U-PRETOOL-GATE`, `-EXEMPT`, `-SAFE` on slot/bravo).
A PreToolUse hard-gate (`.claude/hooks/mcp-bridge-enforce-pretool.mjs` + `scripts/lib/mcp-bridge-enforce.mjs`) DENIES a tool call when **this chat's own** MCP bridge sentinel is `pid-dead`/`stale-heartbeat`, converting the previously-ignored advisory banner into a hard interrupt. Block-once-per-3min (no deadlock). Fleet-wide outage auto-broadcasts the `/mcp` signal to all 26 slots. **Staging-safe** (operator-reported harm fixed): never blocks on the shared fleet-count, never blocks `git`/orchestration tools. Wired PreToolUse `.*` in global settings.json. 30 tests. Knobs: `PRISM_MCP_ENFORCE_DISABLE=1`, `PRISM_MCP_ENFORCE_EXEMPT_TOOLS`.
Memory: [[reference_mcp_enforce_gate_staging_harm_2026_06_16]].

---

## ✅ APPLIED 2026-06-16 (slot:bravo, post-reconnect "continue")
- **`OLLAMA_NUM_PARALLEL` 8→4** — set in User env (durable). Takes effect on next ollama restart (NOT force-restarted to avoid fleet-offload disruption). Make live now: `taskkill /IM ollama.exe /F` then relaunch the Ollama app (or `ollama serve`).
- **Power plan Balanced → Ultimate Performance** (`2330ee89-...`) — **LIVE NOW** (`powercfg /setactive`, no elevation needed). Better than High-Perf for the 9950X3D workstation.
- **Hermes `config.yaml`** compression+curator `qwen3-coder:32b → qwen3-coder:30b` (the `:32b` tag is not installed; `:30b` is). Takes effect on next Hermes restart. (Vision `qwen2.5vl:32b` left as-is — verified installed.)
- NOT applied (deliberate): `CONTEXT_LENGTH` (Hermes 120b needs 131072 — server-default drop risks truncation); `KEEP_ALIVE` (10m is better for the commit-hang than 30m); portable-node hook-heap (golf-coordinated); daemon rebuild items (operator).

## 🔴 REMAINING OPERATOR ACTIONS (ROI-ordered, exact commands)

### 1. Ollama KV bloat — `NUM_PARALLEL` + `CONTEXT_LENGTH` (highest efficiency ROI)
Live: `OLLAMA_NUM_PARALLEL=8`, `OLLAMA_CONTEXT_LENGTH=131072` (128K). A 32b model loaded with **8 parallel KV slots × 128K ctx** = the **~88GB VRAM** single-model spike observed in `/api/ps` (most of the 96GB card on ONE model). Most PRISM Ollama work (explain/summarize/lint/classify) needs ≤32K ctx.
```powershell
# elevated NOT required (User-scope env); Ollama restart IS required to take effect
setx OLLAMA_NUM_PARALLEL 4
setx OLLAMA_CONTEXT_LENGTH 32768
# then restart ollama:  taskkill /IM ollama.exe /F ; ollama serve  (or restart the launcher)
```
Effect: KV cache roughly **(4/8)×(32768/131072) = 1/8th** → frees ~50-70GB VRAM headroom for concurrent models (gpt-oss:120b @65GB resident becomes comfortable). Validated direction: memory `reference_blackwell_ollama_utilization_optimize_2026_06_03` (4 slots halved KV bloat).
- **[CORRECTED]** `scripts/system-health/05-soft-config-tweaks.ps1 -RestartOllama` sets NUM_PARALLEL=4 BUT also sets `KEEP_ALIVE=30m`. **R7 conflict:** 30m keeps models resident longer = MORE commit charge = works AGAINST the commit-memory hang. Live `KEEP_ALIVE=10m` is *better* for the hang. If commit-hangs persist, keep KEEP_ALIVE short (10m), only raise to 30m for warmth if commit pressure is comfortable.

### 2. Windows power plan: Balanced → High Performance (NEEDS-OPERATOR, elevated, no reboot)
Live: **Balanced** (`381b4222-...`). 32T 9950X3D running 26 slots + Ollama gets clock-gating latency spikes on burst compute.
```powershell
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635a   # High Performance (run elevated)
```

### 3. Commit-memory hangs — Stop-hook fork-storm (golf-coordinated / operator)
Root cause (verified): **102 Stop hooks** (65 in `H:/.claude/settings.json` + 37 in `H:/prism/.claude/settings.json`), each launched via `H:/.claude/bin/portable-node` which reserves `--max-old-space-size=384MB` (a Windows COMMIT reservation; `portable-node:42-46`). 102 × 384MB ≈ **39GB commit-charge per Stop**; concurrent chats stack it. **[CORRECTED]** Pagefile is NOT the bottleneck — it is already large (C: 64GB-max + H: 128GB; commit ceiling >227GB) and 78GB RAM was free at probe. The lever is the per-Stop reservation, not the ceiling.
- **SAFE lever (golf-coordinated):** lower `PRISM_HOOK_HEAP_MB` default 384→256 in `portable-node:45` (saves ~13GB/Stop; heavy graph-parsing hooks opt into more via their own `NODE_OPTIONS`; OOM fails loud, never silent). Touches fleet-wide config → coordinate with golf (hygiene owner). Rollback: revert the default.
- **NOT recommended:** raising the tribal-rerank timeout (`tribal-rerank-spawn.mjs:28`, 4000ms) — that would make UserPromptSubmit *slower* (waits longer), the wrong direction for hangs. Leave it; the 4s fail-fast is protective.
- **NOT touched:** `scrutinize-before-stop.mjs:136` `git status` 4s scan — it is a SAFETY gate; a 4s worst-case is not worth the risk of weakening it.

### 4. Hermes config — one missing-model reference (NEEDS-OPERATOR, Hermes restart)
`C:/Users/wompu/AppData/Local/hermes/config.yaml`:
- lines 53, 61 (`auxiliary.compression.model`, `auxiliary.curator.model`) = `qwen3-coder:32b` — **NOT installed** (roster has `qwen3-coder:30b`). Change to `qwen3-coder:30b` (or `qwen2.5-coder:32b`).
- **[CORRECTED]** line 111 `auxiliary.vision.model = qwen2.5vl:32b` — **IS installed** (live `/api/tags`). The first pass flagged this as missing using a stale roster; NO change needed.
- line 208 `delegation.max_concurrent_children=10` → consider 4-6 to match `NUM_PARALLEL`.

### 5. MCP daemon — minor (NEEDS-OPERATOR, rebuild + daemon respawn)
Daemon heap is **already well-tuned**: `mcp-server-daemon.mjs:171` + `mcp-server-supervisor.mjs:40` both use `ensureHeapFloor` → **24GB** floor (`PRISM_MCP_HEAP_FLOOR_MB`) on every supervised launch path. No heap action needed.
- `mcp-server/src/engines/ComputationCache.ts:193` `MAX_CACHE_SIZE = 500` → make env-tunable (`process.env.PRISM_CACHE_MAX_SIZE || "500"`), set 50000 (negligible RAM, fewer recomputes). Rebuild required.
- `mcp-server/src/index.ts:1070,1136` health threshold `heapUsedMB < 3500` → make env-tunable / raise to track the 24GB floor (else false-503 under load). Rebuild required.

### 6. Obsidian (NEEDS-OPERATOR, UI) — low ROI
Vault `H:/prism/knowledge/` = **68,890 .md files**. Config (`knowledge/.obsidian/app.json`) is already sane; only `obsidian-local-rest-api` plugin. The one lever: Settings → Files & Links → Excluded files → add auto-generated/cache dirs so the open-time index is faster. Markdown vaults have few tunables.

---

## Connection-loss: why it still happens + what's now enforced
The shared daemon (:3100) is kept alive by scheduled tasks, but each chat talks to it through its OWN stdio bridge (`mcp-http-bridge.mjs`); when THAT dies mid-session the harness drops every `mcp__prism__*` tool while :3100 stays healthy → silent degradation. A hook CANNOT reconnect the harness client (`/mcp` is harness-owned). The MS1 gate (DONE above) now makes a genuinely-dead per-chat bridge a HARD, unmissable interrupt and auto-broadcasts the fleet `/mcp` nudge — the enforcement the prior banner-only approach lacked. The operator must still type `/mcp` to reconnect (no automated path exists for a hook to respawn the harness bridge).

---

_Verification commands re-runnable: `node -e "fetch('http://127.0.0.1:11434/api/ps')..."`, `powercfg /getactivescheme`, `Get-CimInstance Win32_PageFileSetting`. Re-validate if >7 days old._
