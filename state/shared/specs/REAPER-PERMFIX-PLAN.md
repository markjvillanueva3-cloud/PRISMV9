# REAPER-PERMFIX — Permanent Fleet-Reaper + CPU/GPU/Windows Optimization Plan
**Author:** claude-420260fa (slot alpha) · **Date:** 2026-05-17 · **Driver:** user directive 2026-05-17 — "find a permanent fix to keep reaper up and design it for 12 simultaneous chats calling 5-10 parallel chats at any given time. use gpu, cpu and docker further if we can or improve windows system to handle everything. right now reaper keeps crashing" + "it goes aways during your compaction which means its down for several minutes" + "add everything to your queue, loop until you complete all units"

---

## DIAGNOSIS — why the reaper keeps crashing

Three distinct root causes confirmed live:

| # | Cause | Where | Evidence |
|---|-------|-------|----------|
| 1 | **Compaction kills in-session Monitor** | Chat-bound `Monitor` armed by /fleet-reaper dies the moment /compact starts. Coverage gap = compaction duration (1-3 min). | User-reported: "it goes aways during your compaction" |
| 2 | **--monitor-loop forks 5 subprocesses/cycle** | nvidia-smi + curl(ollama/api/tags) + curl(api/ps) + docker-health spawn + git invocation, every 300s | At commit memory ≥95% any fork() returns ENOMEM → "xmalloc: cannot allocate 8192 bytes" |
| 3 | **Scheduled task is Interactive-only, no S4U, no AtStartup, no restart-on-fail** | install-fleet-reaper-task.ps1 default config | `schtasks /Query` shows `Logon Mode: Interactive only` — does not run when user is logged out / locked screen drops session |

Plus environmental gaps the user named explicitly:
- **Docker STOPPED** — Postgres + Prometheus + Qdrant all down → cross-process learning loop dead
- **Ollama loaded=0 models** — host-install, not Docker, not GPU-resident → cold-load every prompt
- **MemCompression OFF** — Windows feature disabled → losing ~30% effective RAM
- **Pagefile only 4GB** on a 64GB box (should be 96-128GB for fork() safety)
- **GPU RTX 4080 SUPER 15.1GB free / 16% util IDLE** — premium compute sitting unused

Fleet scope: **12 chats × 5-10 parallel subagents = 60-120 process tree**. Current 9 claude + 54 node + 7 bash = 70 procs already pushing 97% commit memory. Without an architectural fix this scales to OOM hang within a single multi-agent forge run.

---

## SOLUTION HIERARCHY

| Tier | Goal | Units | Reversibility | Time |
|------|------|-------|---------------|------|
| **Tier 1 (MS0)** | Immediate relief — make today's reaper survive 12-chat load | 6 | All env-var toggleable | 1 session |
| **Tier 2 (MS1)** | Architectural — eliminate fork-storm root cause | 4 | New code, old paths kept | 2-3 sessions |
| **Tier 3 (MS2)** | Permanent — reaper lifetime independent of Claude | 1-3 | Windows Service, uninstallable | Multi-day |

---

## TIER 1 — REAPER-PERMFIX-MS0 (6 units, all cheap+reversible)

Strictly additive; every change is one env var away from off.

### U-B1: aggressive reaper thresholds
**File:** `H:/prism/scripts/fleet-reaper-sweep.mjs` (constants block)
**Change:** drop `KILL_AFTER` from default 2 → tiered:
- `usedPct < 80` → kill-after 2 (current behavior)
- `usedPct ≥ 80 && < 95` → kill-after 1 (single-sweep confirmation)
- `usedPct ≥ 95` → kill-after 0 (immediate reap, no confirm)

**Why:** at 95% commit memory the cost of false-positive reap (kill a healthy proc) is much lower than the cost of waiting another 300s for confirmation while fork() ENOMEM-storms.
**Knob:** `PRISM_FLEET_REAPER_KILL_AFTER_TIERED=0` reverts to flat behavior.
**Smoke:** force memUsedPct=96 via env override; verify `decision: "tiered: immediate"` on candidates.

### U-B3: 256MB memory ballast
**File:** `H:/prism/scripts/fleet-reaper-sweep.mjs` (boot section, before main())
**Change:** `globalThis.__REAPER_BALLAST = Buffer.allocUnsafe(256 * 1024 * 1024);` at sweep start.
On `mem.usedPct >= 95` alarm in coordinator, release: `globalThis.__REAPER_BALLAST = null; global.gc?.();`

**Why:** guarantees fork() always has ≥256MB free even when host commit hits 100%. The reaper IS the relief mechanism — it cannot itself xmalloc-fail.
**Knob:** `PRISM_FLEET_REAPER_BALLAST_MB=N` (default 256, 0 disables).
**Smoke:** stress host to 98% via Buffer.allocUnsafe(8GB) ladder, verify reaper still spawns sub-calls.

### U-E1: Docker probe-down auto-restart (gated)
**File:** `H:/prism/scripts/ollama-docker-health.mjs` + coordinator hook in sweep
**Change:** when probe reports `docker.available=false` AND `PRISM_FLEET_REAPER_AUTO_DOCKER_RESTART=1`, spawn detached `"Docker Desktop.exe"` startup. Single attempt per 30-min cooldown stamp.
**Why:** Postgres/Prometheus/Qdrant downtime breaks the cross-process learning bus (NN-STACK-INTEG depends on Qdrant). Auto-restart instead of silent-degrade.
**Default:** OFF — flip on after manual smoke shows it doesn't loop-restart on shutdown.

### U-E2: Postgres + Prometheus probe-down auto-restart (gated)
**Same file/gate as E1.** Additional service-name array (`postgresql-x64-16`, `prometheus`) reached via `Get-Service | Start-Service` (PowerShell child) when docker is reachable but containers are down.
**Why:** services occasionally stop after Windows Update; manual diagnosis wastes operator time.
**Default:** OFF.

### U-D4: drop Ollama offload threshold
**File:** `H:/prism/.claude/hooks/ollama-task-offloader.mjs`
**Change:** `INJECT_THRESHOLD` 0.90 → 0.50 (loosened — more tasks classify as offload-eligible). Current 22.2% offload rate vs 30% target.
**Why:** with GPU sitting at 16% util the cost of false-offload (round-trip to Ollama) is cheap; the cost of false-keep (Claude burns context) is expensive at high-iteration loops.
**Knob:** `PRISM_OLLAMA_INJECT_THRESHOLD=0.5` (already exists, just retune default).
**Smoke:** /loop iteration should now route summarize/explain/classify/lint to Ollama.

### U-F2: scheduled-task priority Normal + RestartCount
**File:** `H:/prism/.claude/helpers/install-fleet-reaper-task.ps1`
**Change:** add to settings block:
- `-Priority 5` (Normal, not Below-Normal default)
- `-RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)`
- Document the elevated re-install one-liner.

**Why:** Below-Normal lets the reaper get starved during exactly the host stress when it's most needed. RestartCount catches crashes (xmalloc, ENOMEM).
**Reversal:** `Set-ScheduledTask -Priority 7` restores Below-Normal.

### U-G1+G2+G4: surface operator UAC commands
**File:** new `H:/prism/state/shared/specs/HOST-OPTIMIZATION-UAC-COMMANDS.md` + /checkin-alpha skill report line.
**Content:** copy-paste-ready elevated PowerShell commands the operator runs manually (NOT code commits, NOT auto-run):
- **G1 pagefile→96GB:** `wmic computersystem set AutomaticManagedPagefile=False; wmic pagefileset set InitialSize=98304, MaximumSize=131072`
- **G2 MemCompression on:** `Enable-MMAgent -MemoryCompression`
- **G4 Defender exclusions:** `Add-MpPreference -ExclusionPath "H:\prism","H:\Tools\nodejs","H:\.claude" -ExclusionProcess "node.exe","claude.exe","esbuild.exe"`
**Why:** these are the highest-ROI Windows host changes but require UAC. PRISM should surface the exact commands, not silently expect them.

---

## TIER 2 — REAPER-PERMFIX-MS1 (4 units, architectural)

Eliminate fork-storm at the source. Tier 1 mitigates symptoms; Tier 2 removes the disease.

### U-A5: refactor sweep to pure-Node API
**File:** `H:/prism/scripts/fleet-reaper-sweep.mjs`
**Change:** replace every `execFileSync`/`spawnSync` in the hot path:
- `nvidia-smi --query-gpu=...` → cached read from new probe-cache (U-C3) OR direct NVML binding (`nvidia-ml-py` equiv for Node — package `node-nvidia-ml`)
- `curl http://127.0.0.1:11434/api/tags` → native `node:http` request (already in stdlib)
- `docker-health` subprocess → inline the probe in-process (it's just 3 curl calls)
- `git rev-parse` → read `.git/HEAD` directly

**Why:** each sweep currently forks 5 subprocesses. At 12-chat × every-5-min cadence = 720 forks/hour just for the reaper. Pure-Node = 0 forks per sweep.
**Backward compat:** keep old execFileSync paths behind `PRISM_FLEET_REAPER_LEGACY_EXEC=1` for one milestone before deletion.

### U-C1: Windows Job Object per slot
**File:** new `H:/prism/.claude/helpers/slot-job-object.ps1`
**Change:** wrap each slot's `claude.exe` launch in a Windows Job Object with:
- `JOB_OBJECT_LIMIT_ACTIVE_PROCESS = 50` (cap child-process count per slot)
- `JOB_OBJECT_LIMIT_JOB_MEMORY = 8GB` (commit limit per slot)
- `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` (auto-reap on chat exit)

**Why:** today a single runaway forge run can spawn 200+ node procs and bring down the host. Job Objects = OS-level fork containment. Kernel enforces, no userspace polling.
**Integration:** `/checkin-<slot>` adds the Job Object membership check.

### U-C3: shared 5s-TTL probe cache
**File:** new `H:/prism/scripts/probe-cache-daemon.mjs` + `state/shared/.probe-cache.json`
**Change:** single daemon polls nvidia-smi + ollama + docker every 5s; all 12 slots READ the JSON. Locked via file-lock (lockfile-guarded atomic write).
**Why:** today 12 chats × 5 probes × 12 sweeps/hour = 720 nvidia-smi forks/hour. After cache = 720 forks/hour → 12 forks/hour (just the daemon).
**Failure mode:** stale cache (>15s) → individual sweeps fall back to direct probe (graceful degrade).

### U-D1+D2: Ollama in Docker GPU container
**File:** new `H:/prism/docker/ollama-gpu/docker-compose.yml`
**Change:** containerize Ollama with `--gpus all` + persistent volume + `qwen2.5-coder:32b-q4` preloaded (14GB VRAM, fits in 16GB).
**Why:** host-install Ollama has 0 models loaded — cold-load every prompt = 30-90s latency. Container with `keep_alive=24h` + GPU residency = <100ms first-token.
**Side effect:** frees 0.5GB CPU RAM (host ollama daemon process gone).

---

## TIER 3 — REAPER-PERMFIX-MS2 (1-3 units, THE PERMANENT FIX)

The canonical answer to the compaction-gap problem: own the reaper lifetime at the OS level.

### U-H1: prism-fleet-supervisor Windows Service
**Files:**
- `H:/prism/services/prism-fleet-supervisor/main.mjs` (Node.js daemon)
- `H:/prism/services/prism-fleet-supervisor/install-service.ps1` (NSSM wrapper or node-windows)
- `H:/prism/services/prism-fleet-supervisor/README.md`

**Architecture:**
- Windows Service `PRISMFleetSupervisor` runs as LocalSystem (S4U-equivalent, survives logout)
- Auto-start at boot, restart-on-failure (3 attempts, 60s interval)
- Owns: fleet-reaper sweep cadence (replaces scheduled task), probe-cache daemon (U-C3), Ollama container watchdog (U-D1)
- Exposes: named-pipe `\\.\pipe\prism-fleet-supervisor` for status query from any chat

**Why this is THE permanent fix:**
- Independent of any Claude chat lifetime
- Survives /compact (the user's stated pain)
- Survives logout, lock-screen, RDP disconnect
- One install, set-and-forget — no per-chat arming
- OS-managed restart (kernel does the restart, not userspace polling)
- LocalSystem privilege = can soft-kill any user-mode process without UAC prompts

**Why deferred to MS2 not MS0:**
- Windows Service install needs UAC + careful service-account selection
- Replacing the scheduled task is a single-point cutover (failure = no reaper at all)
- Node.js service runtime needs hardening (uncaught-exception handler must not crash the service)
- Want Tier 1 + Tier 2 stable first as fallback layers

### U-H2 (optional): supervisor health endpoint + dashboard
HTTP `/health` endpoint on `127.0.0.1:8765` mirroring `/system-viz` port. Status panel in the system-viz UI showing supervisor liveness + last reap + ballast state.

### U-H3 (optional): WSL2 namespace isolation
Move the per-slot Job Objects (U-C1) into a WSL2 namespace for true memory governor (cgroups v2). Linux kernel has better OOM behavior than Windows commit-charge. Tier-3 stretch goal.

---

## SAFETY + REVERSIBILITY MATRIX

| Unit | Touches production | Reversal |
|------|--------------------|----------|
| B1 | reaper thresholds | `PRISM_FLEET_REAPER_KILL_AFTER_TIERED=0` |
| B3 | reaper memory | `PRISM_FLEET_REAPER_BALLAST_MB=0` |
| E1 | service lifetime | gate `PRISM_FLEET_REAPER_AUTO_DOCKER_RESTART=1` default OFF |
| E2 | service lifetime | gate default OFF |
| D4 | hook threshold | `PRISM_OLLAMA_INJECT_THRESHOLD=0.9` reverts |
| F2 | scheduled task | `Set-ScheduledTask -Priority 7` reverts |
| G1/G2/G4 | host (UAC) | operator-manual, fully reversible by operator |
| A5 | sweep API | `PRISM_FLEET_REAPER_LEGACY_EXEC=1` one milestone |
| C1 | slot launch | unwrap Job Object membership |
| C3 | probe cache | daemon stops → sweeps fall back to direct probe |
| D1/D2 | Ollama install | `docker compose down` |
| H1 | Windows service | `nssm remove PRISMFleetSupervisor` |

Universal kill: `PRISM_FLEET_REAPER_DISABLE=1` still disables ALL reaping fleet-wide.

---

## WORKTREE STRATEGY

- Branch: `work/reaper-permfix-ms0` from `cad-fusion-live-ms0`
- Worktree: `H:/prism-reaper-permfix`
- One commit per unit (B1, B3, E1, E2, D4, F2, G124) with subject `[REAPER-PERMFIX-MS0]/U-<TAG>: <title>`
- After MS0 complete: ff-merge worktree → cad-fusion-live-ms0, close envelope, post chat-bus
- MS1/MS2 each get fresh worktrees (`work/reaper-permfix-ms1`, `work/reaper-permfix-ms2`)

## PER-FILE 2-REVIEWER GATE (every file)

Per `CLAUDE.md §PER-FILE SCRUTINY GATE`:
1. Generate file
2. Self-cross-check
3. **Dispatch 2 parallel reviewer agents in one tool block:**
   - Arm A: `code-analyzer` (or specialty agent if file type matches)
   - Arm B: independent `reviewer` weighted on integration + security + naming
4. Wait both verdicts → fix P0/P1 → only then next file

## PEER CLAIMS — DO NOT TOUCH

- `H:/prism/CLAUDE.md` — claude-416be9ac
- `H:/prism/state/shared/specs/CLAUDE-MD-DUPLICATION-CANDIDATES-2026-05-17.md` — claude-416be9ac
- `H:/prism/state/shared/specs/INJECTOR-UTILIZATION-2026-05-17.md` — claude-416be9ac
- `H:/prism/.claude/commands/checkin-mike.md` — claude-416be9ac
- `H:/prism/.claude/helpers/chat-slots.mjs` + `chat-slots-pid-gate.test.mjs` — claude-339c8ff7
- `H:/prism/scripts/fleet-memory-monitor.mjs` + `.test.mjs` — claude-629a6355
- `H:/prism/.claude/hooks/pick-prefresh-inject.mjs` + tests — claude-77971357
- infraDispatcher — claude-6655163e

If any Tier-2 architectural change would touch a peer-claimed file: fork to a sibling worktree, don't fight.

---

## SUCCESS CRITERIA (measurable)

- **MS0:** commit memory stays ≤95% under 12-chat × 10-subagent load (today: hits 97% in 1-2 forge runs)
- **MS0:** zero "xmalloc: cannot allocate" errors in fleet-reaper.log over 24h
- **MS0:** Ollama offload rate ≥30% (today: 22.2%)
- **MS1:** sweep fork count <2/cycle (today: 5)
- **MS1:** per-slot proc count capped at 50 (today: unbounded)
- **MS2:** reaper continuity through /compact verified — no `>60s reaper-down` window
- **MS2:** reaper continuity through logout verified — task runs unattended

---

## STATUS

- Plan written ✓
- Worktree NOT YET created
- Tasks #24-#33 created in TaskList
- Next: create worktree + post chat-bus claim + begin U-B1
