# Fleet Hygiene Galaxy — slot:golf

> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = fleet-hygiene-domain doctrine ONLY; never re-inline universal prose.

---

## 1. Domain scope + slot identity

**Owns:** fleet-reaper sweep (ancestry-confirmed orphan kill), chat-slot hygiene (stale heartbeats, dead-PID reclaim), MCP server lifecycle monitoring, fleet memory-pressure monitor, scheduled-task watchdog, Ollama health checks, fleet task-health advisory.

**EXCLUDES:** token-optimization telemetry → alpha; agent-fleet orchestration design → bravo/zulu; system-viz graph queries → sierra (golf queries it, does not own it); any domain feature work not in the fleet-hygiene list above.

**Slot:** golf · Worktree: `H:/prism-slot-golf` · Branch: `slot/golf` · **Main-tree commits: `[MAIN]`** (golf + sierra are the two slots that commit `[MAIN]` to shared `H:/prism`, not to their slot branch).

**Commit prefix:** `[MAIN] [FLEET-HYGIENE]/U-ID: title` — verified in TOOLBELT.md.

---

## 2. Verified engines

No local `.ts` engines under `mcp-server/src/engines/fleet-hygiene/` — the galaxy is implemented entirely in scripts/hooks/helpers (see §4). Golf uses engines from sibling galaxies:

| Role | Engine / script used |
|------|----------------------|
| PID → slot classifier | `.claude/helpers/process-slot-map.mjs` |
| Orphan node protection | `.claude/hooks/node-orphan-cleaner.mjs` |
| Fleet-reaper main sweep | `scripts/fleet-reaper-sweep.mjs` |
| Fleet memory monitor | `scripts/fleet-memory-monitor.mjs` |
| Fleet task-health watchdog | `scripts/fleet-task-health-watch.mjs` |
| Golf guardian (SessionStart) | `.claude/hooks/golf-slot-reaper-guardian.mjs` |
| Memory compact nudge | `.claude/hooks/critical-memory-compact-nudge.mjs` |
| Scheduled-task installer (reaper) | `.claude/helpers/install-fleet-reaper-task.ps1` |
| Scheduled-task installer (memmon) | `.claude/helpers/install-fleet-memory-monitor-task.ps1` |
| MCP orchestration | `mcp-server/scripts/ollama-docker-launcher.mjs` |
| Ollama offload stats | `scripts/ollama-offload-dashboard.mjs` |
| Docker / Ollama health | `scripts/ollama-docker-health.mjs` |

---

## 3. Dispatcher quick-ref

Golf has **no named MCP dispatcher** — all C2 routes via `prism_session`. Do NOT grep DISPATCHER_DIGEST for a `prism_fleet` entry; it does not exist.

Useful session actions via `prism_session`:
| Action | Use |
|--------|-----|
| `prism_session:master_index_query` | graph-search before any grep |
| `prism_memory:semantic_search` | recall fleet-hygiene history (`topK=20`) |

**MCP-down fallback** (port 3100 offline): all scripts above run as pure-node CLIs — no MCP needed.

---

## 4. Canonical constants + data paths

No physics constants (this is infra, not machining). Domain-specific stores:

| Store | Path | Access rule |
|-------|------|-------------|
| Reaper log | `mcp-server/data/state/fleet-reaper.log` | tail / grep — NEVER full-read (unbounded) |
| Offload stats | `mcp-server/data/state/ollama-offload-stats.json` | `node scripts/ollama-offload-dashboard.mjs` |
| Chat slots | `.claude/helpers/chat-slots.json` | `node .claude/helpers/chat-slots.mjs` CLI only — never raw edit |
| Slot task claims | `state/shared/slot-task-claims.json` | lockfile-guarded; use `slot-task-claim.mjs` CLI |
| AI systems state | `knowledge/memories/patterns/ai-systems-fleet-state.md` | query via `prism_memory:semantic_search` |

**NEVER inline** protection regex literals — read `DEFAULT_PRISM_WORKER_PROTECT_REGEX` from
`scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs` (single source of truth, verified commit `de66545dbe`).

---

## 5. Domain gotchas / safety rails

1. **Ancestry walk before any kill.** A node with RSS=0 / sub-5MB is NOT an orphan if any `claude.exe` is in its ancestor chain. The 2026-06-11 incident reaped legitimate idle fleet workers — fixed by `DEFAULT_PRISM_WORKER_PROTECT_REGEX` in `scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs`.
2. **`non-claude-parent` MCP zombie reports are NOT orphans.** These are live chats' MCP servers parented to the node launcher wrapper. The hunter REFUSES to kill them — that refusal is correct. Do NOT override.
3. **`stop_close_prism_nodes_v2.mjs` has the same reaping vector (OPEN).** Its `OUR_PATTERNS` matches `H:/prism/scripts` → detached workers (miners/sidecars) get reaped. Fix = add `DEFAULT_PRISM_WORKER_PROTECT_REGEX` exclusion. Edit is hard-blocked by cross-worktree harness firewall from a slot chat — needs main-tree edit or `PRISM_CROSS_WORKTREE_BYPASS=1`.
4. **`schtasks /Query` in git-bash mangles the `/Query` flag** — use `Get-ScheduledTask` in PowerShell only.
5. **`--monitor-loop` forks nvidia-smi/curl/docker probes** — runs these under the exact memory pressure the reaper exists to relieve. Use `--once` + the durable scheduled task instead.
6. **Ollama cold-load stall:** moving models without updating `OLLAMA_MODELS` env var causes `/api/chat` to hang >150s (mmap-load from `H:` spinning HDD instead of VRAM). `OLLAMA_MODELS=H:/Tools/ollama/models` must match actual model location.
7. **Confirm-before-reap:** default 2 × 300s continuous candidacy window before any kill. Never shorten for speed.
8. **Docker daemon auto-restart kills ALL containers** (Qdrant/Postgres → BM25-only degraded fleet). Advise operator only; never auto-restart.

---

## 6. What NOT to do (domain refuses)

- **NEVER kill a PID the slot classifier returns `indeterminate` for** — PID-reuse class; wait for next sweep cycle.
- **NEVER destructive cleanup without a `.bak` snapshot** (H1-BIBRYAM lesson).
- **NEVER run `schtasks /Query` in Bash** — use `Get-ScheduledTask` in PowerShell.
- **NEVER `--monitor-loop` under memory pressure** — use `--once` + scheduled task.
- **NEVER auto-restart Docker daemon** — kills every container fleet-wide; advise operator only.
- **NEVER disable golf's own reaper/guardian** — self-DOS deny; kill switch is operator-only (`PRISM_FLEET_REAPER_DISABLE=1` / `PRISM_GOLF_GUARDIAN_DISABLE=1`).
- **NEVER treat `kept` reaper output as `reaped`** — false-positive class; log it and move on.
- **NEVER read `fleet-reaper.log` in full** — unbounded file; tail/grep only.
- **NEVER move Ollama models** without updating `OLLAMA_MODELS` env var first.

---

## 7. Domain workflow — per-session contract (`/checkin-golf`)

1. **Claim** — slot-claim golf (force-take) + bind topic `golf-work` via `per-agent-handoff.mjs`.
2. **Sweep** — `node scripts/fleet-reaper-sweep.mjs --once --json` → `node .claude/helpers/chat-slots.mjs reclaim` (dead slots) → confirm `PRISM Fleet Reaper` task Ready.
3. **Work** — pick unit from roadmap or act on work order.

### Reaper decision flowchart (inline — 6-step)
```
CLASSIFY PID:
  1. Full ancestor walk → any live claude.exe? → KEEP (live chat child)
  2. age < 45s?                                → KEEP (age floor)
  3. firstSeenAt confirm window < 2×300s?      → KEEP (confirm window)
  4. cmdline matches DEFAULT_PRISM_WORKER_PROTECT_REGEX? → KEEP (fleet worker)
  5. class == non-claude-parent MCP node?      → KEEP (live MCP server)
  6. All filters passed → REAP (soft-relief first, then Stop-Process)
```

---

## 8. Tribal + corpus pointers

Wiki entries (query before re-deriving):
- `[[architecture/fleet-reaper-ms1]]` · `[[architecture/fleet-task-health-ms0]]` · `[[architecture/fleet-memory-monitor]]`
- `[[feedback_golf_owns_reaper]]` · `[[feedback_all_slots_free_access]]` · `[[feedback_never_delete_only_disable]]`
- `[[reference_fleet_rate_limit_diagnosis_2026_05_29]]` (effortLevel:xhigh → org rate-limit pattern)
- `[[feedback_reapers_disabled_2026_06_11]]` · `[[reference_golf_inventory_of_record_2026_06_11]]`

JM Die corpus: not applicable to this galaxy (fleet infra only).

Tribal capture rule: `prism_knowledge:tribal_capture slot=golf` — never write `knowledge/tribal/*.md` directly (auto-overwritten).

Domain keywords (SOUL.md `domain_filter` — drives injection matching):
`reaper|orphan|zombie|pid|slot|docker|mcp|memory-monitor|task-health|compact|scheduled-task|jsonl`

---

## 9. Cross-galaxy edges (PSN)

| Edge | Direction | Bridge |
|------|-----------|--------|
| golf → alpha (token-optimization) | golf reaper telemetry feeds alpha's token-waste audit | `prism_memory:semantic_search` |
| golf → bravo/zulu (hermes-zulu) | golf detects crashed chats + reaps their subagents | `chat-slots.mjs reclaim` |
| golf ← sierra (system-viz) | golf queries graph for orphan/utilization detection | `system-viz-query find` |
| golf ← india (ai-training) | AGENT-TIER-MS0 (stranded on slot/golf, awaiting merge) | manual merge |

---

## 10. Closed-loop integration (india)

On any reaper outcome or fleet-health finding: `xproc_outcome_publish {slot:'golf', domain:'fleet-hygiene'}` // UNVERIFIED — grep `prism_atcs` dispatcher source to confirm action name before calling.

Capture tribal lessons via `prism_knowledge:tribal_capture slot=golf`. Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## 11. Test commands

```bash
# Fleet-hygiene unit tests (none yet — galaxy is script-only):
cd mcp-server && rtk npx vitest run -t "fleet|reaper|orphan|slot"

# Live dry-run sweep (safe — read-only):
node H:/prism/scripts/fleet-reaper-sweep.mjs --once --dry-run --json

# Slot roster (dead PIDs, stale heartbeats):
node H:/prism/.claude/helpers/chat-slots.mjs reclaim && node H:/prism/.claude/helpers/chat-slots.mjs find

# Ollama offload health (target ≥30%):
node H:/prism/scripts/ollama-offload-dashboard.mjs

# Scheduled-task health (PowerShell only — NOT bash):
Get-ScheduledTask -TaskName "PRISM*" | Get-ScheduledTaskInfo | Select TaskName,LastRunTime,LastTaskResult

# MCP liveness:
curl -s http://localhost:3100/health || echo "MCP DOWN"
```

---

## 12. Known bugs / open threads

**Reaper status: ✅ RE-ENABLED + HARDENED (2026-06-11)** — fixed `DEFAULT_PRISM_WORKER_PROTECT_REGEX` gating legit fleet workers. Commits `de66545dbe` + `1b49790a70` (44/44 tests) + `8ee957e6ee` (10/10).

Open follow-ups:
- **⓪** Fix `stop_close_prism_nodes_v2.mjs` same vector — needs main-tree edit or `PRISM_CROSS_WORKTREE_BYPASS=1` (cross-worktree harness blocks slot chat).
- **①** Merge + wire **AGENT-TIER-MS0** (Ollama→Haiku→Sonnet→Opus tier router, U-AT01-03, 20 tests) — stranded on `slot/golf`.
- **②** `U-MCP-FACTORY-REFACTOR` (live MCP factory leak).
- **③** `U-RAG-1` index key-unify (operator decision pending).
- **④** Audit `Orphan Process Reaper (PS)` + `Cleanup Orchestrator` for same cmdline-allowlist gap.

Re-register elevated if task drops: `powershell -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow`

---

## 13. AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs fleet-hygiene "<question>"
```

Ollama routing for this domain:
- Triage a reaper candidate / summarize orphan sweep → `gpt-oss:20b`
- Reaper kill-decisions → **deterministic only** (ancestry-confirmed; never route to LLM)
- Deep fleet-health reasoning → `gpt-oss:120b`

### Scheduled-task roster

| Task | Cadence | Phase offset | Knob |
|------|---------|-------------|------|
| `PRISM Fleet Reaper` | 5 min | +210s | `PRISM_FLEET_REAPER_DISABLE` |
| `PRISM Fleet Memory Monitor` | 5 min | +330s | `PRISM_FLEET_MEMMON_*` |
| `PRISM Fleet Task Health` | advisory Stop hook | — | `PRISM_FLEET_TASKHEALTH_*` |

### Diagnose before blaming RAM

Box baseline: RTX PRO 6000 Blackwell 96GB · Ryzen 9 9950X3D 32T · 127GB RAM (usually <55% mem). When fleet feels sick — chats throttled, "server is temporarily limiting requests," premature compaction — check Anthropic-side rate limits + per-chat `effortLevel` config BEFORE blaming local resources. `effortLevel:xhigh` fleet-wide → ultracode agent fan-out → org rate-limit. See `[[reference_fleet_rate_limit_diagnosis_2026_05_29]]`.

### Full work-slot privileges doctrine

The legacy "hygiene-only" restriction was lifted (operator directive 2026-05-20). `golf-slot-write-allowlist.mjs` is **unwired** (preserved on disk per `[[feedback_never_delete_only_disable]]`). Golf picks up, builds, tests, wires, and commits like any work slot. The fleet-reaper role is layered ON TOP of normal work — golf is the slot that MUST run the reaper, not the slot that can ONLY run hygiene.

## AI Synergy (PSN leg #10)

This galaxy is an AI-substrate **consumer** (no dedicated AI engines of its own; `aiEngineCount` 0).
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs fleet-hygiene "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/fleet-hygiene_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
