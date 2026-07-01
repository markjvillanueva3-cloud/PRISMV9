## fleet-hygiene — slot:golf

### Current state

**Size:** 11,685 bytes · 95 lines (CLAUDE.md only; supported by MEMORY.md 168 lines, PATHS.md 89 lines, TOOLBELT.md 47 lines, SOUL.md 55 lines, AWARENESS.md exists).

**Quality grade: GOOD**

The file is substantially better than a stub. It has a real domain identity, verified asset paths, anti-patterns, a per-session contract, regression-class awareness, and the 2026-06-11 reaper-hardening incident properly documented. No outright fabrications found; all script paths cited (e.g. `scripts/fleet-reaper-sweep.mjs`, `.claude/helpers/process-slot-map.mjs`, `.claude/hooks/golf-slot-reaper-guardian.mjs`) are consistent with what PATHS.md independently enumerates, so cross-verification passes.

**Issues found:**
- The `## Cross-cutting methodology` block (lines 70-96) is generic enrichment-program boilerplate common to all 34 galaxies — it adds ~800 bytes of non-fleet-hygiene-specific content (LoRA deploy gates, CAG break-even math, RAG filter rule). Token waste for this slot.
- The `<!-- AI-SYSTEMS-STATE:BEGIN -->` block (lines 82-89) is an auto-generated pointer that already lives in MEMORY.md (lines 160-167) — duplicated verbatim, ~300 bytes wasted.
- The `<!-- CRITIC-KEEPWORKING-STANZA -->` block (lines 91-96) is explicitly flagged as "global doctrine, do NOT duplicate" — yet it IS duplicated here. Drop it; it belongs only in main CLAUDE.md.
- `## What lives here` lists `mcp-server/scripts/ollama-docker-launcher.mjs` and `mcp-server/dist/index.js` as golf-owned MCP lifecycle assets. These are not fleet-hygiene-authored files and could mislead a golf session into thinking it owns MCP source. The correct framing (in MEMORY.md) is that golf *monitors/restarts* MCP, not owns it.
- The `## Every golf session` contract section still references the 2026-06-11 reaper-parked state as a warning (`⚠️ PARKED`), but the banner directly above it says REAPER RE-ENABLED. This creates a contradictory read on a quick scan. The `PARKED` instruction should be dropped now that it is resolved.
- `## Related galaxies` is a 3-line list that is already covered in fuller form in MEMORY.md `## Cross-galaxy bridges`. It is a weak duplicate.
- The `SOUL.md`-level `domain_filter` regex (`reaper|orphan|zombie|pid|slot|docker|mcp|memory-monitor|task-health|compact|scheduled-task|jsonl`) is NOT referenced in CLAUDE.md. Golf sessions that skip SOUL.md miss the injection filter hint.

---

### KEEP

All of these are verified-accurate and load-bearing for fleet-hygiene work:

1. **Opening scope block** (lines 1-6) — canonical domain statement + MEMORY.md read-first pointer.
2. **`## ✅ REAPER RE-ENABLED + HARDENED` banner** (lines 8-12) — the incident summary, `DEFAULT_PRISM_WORKER_PROTECT_REGEX`, commit SHAs, and open follow-ups are operationally essential. Collapse the `PARKED` instruction inside `## Every golf session` to avoid contradiction.
3. **`## What lives here`** (lines 14-33) — accurate script/hook/helper enumeration, consistent with PATHS.md. Keep; trim MCP daemon lines to "golf monitors, does not own."
4. **`## Every golf session` contract** (lines 34-37) — keep the overall 3-step contract; remove the now-stale `PARKED` warning.
5. **`## Anti-patterns (golf refuses)`** (lines 39-46) — every entry here is real, non-obvious, and fleet-hygiene-specific. Highest-value section in the file.
6. **`## Karpathy 5-step for hygiene`** (lines 47-51) — the edge-case/failure-mode list is domain-specific and does not appear in main CLAUDE.md in this form.
7. **`## Diagnose before blaming RAM`** (lines 53-54) — the rate-limit diagnosis pattern (`effortLevel:xhigh` → org-rate-limit) is a hard-won golf-specific lesson.
8. **`## Doctrine: golf has full work-slot privileges`** (lines 56-57) — necessary because the historical "hygiene-only" myth still circulates.
9. **`## Wiki cross-refs`** (lines 64-66) — compact; verified wiki paths are load-bearing for Obsidian recall.

---

### DROP

Remove these to recover ~2,200 bytes (~19% of the file) with zero loss of golf-specific knowledge:

| Block | Lines | Reason |
|-------|-------|--------|
| `## Cross-cutting methodology` | ~70-81 | Generic enrichment boilerplate (LoRA gates, CAG math, RAG write-time filter) — not golf-specific; covered by global CLAUDE.md + TOOLBELT.md operational context block |
| `<!-- AI-SYSTEMS-STATE -->` | 82-89 | Verbatim duplicate of the same block already in MEMORY.md lines 160-167 |
| `<!-- CRITIC-KEEPWORKING-STANZA -->` | 91-96 | Explicitly "global doctrine, do NOT duplicate" per its own header; belongs only in main CLAUDE.md |
| `## Related galaxies` (CLAUDE.md) | 59-62 | Superseded by the fuller `## Cross-galaxy bridges` in MEMORY.md |
| `PARKED` warning inside `## Every golf session` | line 36 sub-bullet | Contradicts the resolved banner above; creates confusion |

---

### ADD (domain-specific — the heart of this assessment)

These are gaps: content a golf session CRITICALLY needs daily that is currently absent or buried in MEMORY.md but not in the fast-load CLAUDE.md.

**1. Reaper decision flowchart (inline, not a wiki pointer)**
The current CLAUDE.md says "reap only ancestry-confirmed orphans" but does not give the decision sequence. A golf session must know this without reading MEMORY.md:
```
CLASSIFY PID:
  1. Full ancestor walk → any live claude.exe? → KEEP (it is a live chat's child)
  2. age < 45s? → KEEP (age floor)
  3. firstSeenAt confirm window < 2×300s? → KEEP (confirm window)
  4. cmdline matches DEFAULT_PRISM_WORKER_PROTECT_REGEX? → KEEP (fleet worker)
  5. class == non-claude-parent MCP node? → KEEP (live MCP server)
  6. All filters passed → REAP (soft-relief first, then Stop-Process)
```

**2. Scheduled-task roster with current state**
Golf must check these on every session. Currently scattered across MEMORY.md prose. The CLAUDE.md should carry the canonical list with knobs:

| Task | Cadence | Phase offset | Knob |
|------|---------|-------------|------|
| `PRISM Fleet Reaper` | 5 min | +210s | `PRISM_FLEET_REAPER_DISABLE` |
| `PRISM Fleet Memory Monitor` | 5 min | +330s | `PRISM_FLEET_MEMMON_*` |
| `PRISM Fleet Task Health` | (advisory Stop hook) | — | `PRISM_FLEET_TASKHEALTH_*` |

Check state: `Get-ScheduledTask -TaskName "PRISM Fleet Reaper" | Get-ScheduledTaskInfo` — NOT `schtasks /Query` via bash (git-bash mangles `/Query`). Re-register elevated: `powershell -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow`.

**3. Open follow-ups (the 4 unresolved threads from 2026-06-11)**
These are currently in the banner comment but not in a scannable checklist. Golf loses track of them across sessions. Needs a `## Open threads` section with:
- ⓪ Fix Zombie Reaper v2 (`stop_close_prism_nodes_v2.mjs`) — same vector as the legit-node-reaping bug; needs `DEFAULT_PRISM_WORKER_PROTECT_REGEX` exclusion; blocked by cross-worktree harness firewall from a slot chat (needs main-tree edit or `PRISM_CROSS_WORKTREE_BYPASS=1`).
- ① Merge + wire `AGENT-TIER-MS0` (Ollama→Haiku→Sonnet→Opus tier router, U-AT01-03, 20 tests, stranded on `slot/golf`).
- ② `U-MCP-FACTORY-REFACTOR` (live MCP factory leak).
- ③ `U-RAG-1` index key-unify (operator decision pending).
- ④ Audit `Orphan Process Reaper (PS)` + `Cleanup Orchestrator` for the same cmdline-allowlist gap.

**4. Live-state quick-read commands (operational)**
Currently in MEMORY.md but not in CLAUDE.md. Golf needs them every session start:
```bash
# Slot roster (dead PIDs, stale heartbeats):
node H:/prism/.claude/helpers/chat-slots.mjs reclaim && node H:/prism/.claude/helpers/chat-slots.mjs find

# Reaper sweep (safe dry-run first):
node H:/prism/scripts/fleet-reaper-sweep.mjs --once --dry-run --json

# Ollama offload health (target ≥30%):
node H:/prism/scripts/ollama-offload-dashboard.mjs

# Task health:
Get-ScheduledTask -TaskName "PRISM*" | Get-ScheduledTaskInfo | Select TaskName,LastRunTime,LastTaskResult
```

**5. MCP server restart procedure**
Currently not in CLAUDE.md at all. Golf is the slot called when MCP fails fleet-wide:
```bash
# Check if :3100 is up:
curl -s http://localhost:3100/health || echo "MCP DOWN"

# Restart:
node H:/prism/mcp-server/scripts/ollama-docker-launcher.mjs --services=mcp

# If Docker wedged (Qdrant/Postgres all DOWN → BM25-only degradation):
node H:/prism/scripts/ollama-docker-health.mjs
# DO NOT auto-restart Docker daemon (kills all containers) — advise operator only
```

**6. SOUL.md domain_filter hint**
Add a one-liner: `Domain keywords (for injection filtering, per SOUL.md): reaper|orphan|zombie|pid|slot|docker|mcp|memory-monitor|task-health|compact|scheduled-task|jsonl`. This tells golf what topics trigger its domain context injections.

**7. Commit prefix rule**
Golf commits to the main tree (`H:/prism`) with prefix `[MAIN]` — verified in TOOLBELT.md but missing from CLAUDE.md. A one-liner: "Golf commits: `[MAIN] [FLEET-HYGIENE]/U-ID: title` (main tree, not slot worktree) per [[feedback_commit_prefix_main_on_shared_tree]]."

**8. What NOT to do in this domain**
The existing `## Anti-patterns` is good but misses two high-value additions based on tribal knowledge in MEMORY.md:
- Do NOT read scheduled-task state via `schtasks /Query` in Bash — git-bash mangles the `/Query` flag to a path. Use `Get-ScheduledTask` in PowerShell.
- Do NOT run `--monitor-loop` (forks nvidia-smi/curl/docker probes) under memory pressure — use `--once` + the durable scheduled task instead.
- Do NOT interpret `non-claude-parent` MCP-zombie hunter hits as orphans — they are live chats' MCP servers parented to the node launcher wrapper. The hunter REFUSES to kill them and that refusal is CORRECT.
- Do NOT move Ollama models without updating `OLLAMA_MODELS` env var — cold-load stall from `H:` (`OLLAMA_MODELS=H:/Tools/ollama/models`) causes `/api/chat` to hang >150s while model mmap-loads from spinning HDD rather than VRAM.

---

### IDEAL SECTION OUTLINE

```
# Fleet Hygiene Galaxy (GOLF slot)
## 1. Domain identity + read-first pointer
## 2. Current reaper status (2026-06-11 hardening — ✅ RE-ENABLED; open threads)
## 3. Reaper decision flowchart (inline — 6-step ancestry → KEEP/REAP)
## 4. What golf owns (asset enumeration: scripts / helpers / hooks / skills)
## 5. Scheduled-task roster (3 tasks, cadences, knobs, check command)
## 6. Every golf session — /checkin-golf contract (3-step: claim → sweep → work)
## 7. Live-state quick-reads (4 bash/PS one-liners)
## 8. MCP server restart procedure
## 9. Anti-patterns — golf REFUSES (expanded, 9 items)
## 10. Commit rule (prefix + branch)
## 11. Open threads (4 unresolved follow-ups with blockers)
## 12. Diagnose before blaming RAM (rate-limit / effortLevel pattern)
## 13. Full-work-slot privileges doctrine
## 14. Domain filter hint (SOUL.md keyword list)
## 15. Cross-galaxy bridges (pointers: alpha/bravo-zulu/sierra)
## 16. Wiki cross-refs (6 links)
→ UNIVERSAL-CORE POINTER (see below)
```

Omit: cross-cutting methodology boilerplate, AI-systems-state duplicate block, critic/keep-working stanza, related-galaxies duplicate.

---

### UNIVERSAL-CORE POINTER

The following rules must remain available to golf but should appear ONLY as a pointer to `H:/PRISM/CLAUDE.md`, not re-duplicated in the galaxy file:

- **R1-R15** (Karpathy + agent-era rules) — pointer: `H:/PRISM/CLAUDE.md §EXPERT ROLE` + `§CLAUDE.md RULES 5-13`
- **Scrutiny 3-of-3 gate** — pointer: `H:/PRISM/CLAUDE.md §SCRUTINY GATE`
- **Per-file 2-arm scrutiny** — pointer: `H:/PRISM/CLAUDE.md §PER-FILE SCRUTINY GATE`
- **Per-chat handoff** (HANDOFF-golf-<task>.md, `per-agent-handoff.mjs --slot golf`) — pointer: `H:/PRISM/CLAUDE.md §PER-CHAT HANDOFF`
- **Commit format** (`[SCOPE]/U-ID: title`) — pointer: `H:/PRISM/CLAUDE.md §SESSION HYGIENE`; golf-specific prefix `[MAIN]` stays in galaxy file
- **Units-first / no-stub / no-inline-constants** — pointer: `H:/PRISM/CLAUDE.md §SAFETY RAILS`
- **Duplication guard** (`duplicationGuardEngine.checkBeforeCreating`) — pointer: `H:/PRISM/CLAUDE.md §MANDATORY SELF-AWARENESS`
- **Engine wiring / R15 apply-to-all** — pointer: `H:/PRISM/CLAUDE.md §ENGINE WIRING`
- **Ollama fallback ladder** (Ollama → Sonnet subagent → Opus) — pointer: `H:/PRISM/CLAUDE.md §AI SYSTEM ROUTING`
- **RTK prefix on bash** — pointer: global `~/.claude/CLAUDE.md @RTK.md`

Suggested pointer block (1 line in galaxy CLAUDE.md):
```
> Universal rails (R1-R15 · scrutiny gate · handoff · commit format · units-first · no-stub · dedup · engine wiring):
> → `H:/PRISM/CLAUDE.md` (do not duplicate here — it drifts)
```
