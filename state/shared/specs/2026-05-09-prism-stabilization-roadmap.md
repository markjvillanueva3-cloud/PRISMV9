---
title: PRISM Stabilization Roadmap (focused, this-work-only)
date: 2026-05-09
milestone-id: PRISM-STAB-MS0
brief: 2026-05-09-prism-stabilization-design.md (commit 4dfa4d212)
units: 15 (A1-A5, B1-B6, C1-C4)
phases: 3 (A foundation, B coordination, C re-arch)
chats: 4 (parallel within phase, sequential across phases)
sort-key: (tier ASC, aiPriorityScore DESC, leverage DESC) per /rgs6 v6.1
---

# PRISM Stabilization Roadmap

> Focused roadmap for the stabilization spec only — NOT integrated into the main PRISM atomic-roadmap (1068 units). Ingest later via milestone envelope if desired.

## Phase / tier mapping

| Phase | Tier | Why this tier | Gate |
|---|---|---|---|
| A — Stop the bleeding | T0 | Atomic, depends on nothing else in PRISM | A-acceptance must pass before B starts |
| B — Handoff/compact race fix | T1 | Builds on A (git tree clean, no orphans) + adds 2 dispatcher actions | B-acceptance must pass before C starts |
| C — Injection re-architecture | T2 | Builds on B (Quartz infra) + new daemon | C-acceptance closes the milestone |

## Unit ranking (sorted by tier ASC, aiPriority DESC, leverage DESC)

### Phase A — T0 foundation (5 units, ~3 days)

| Unit | AI | Lev | Lane | Files | LOC | Hours | Deps |
|---|---:|---:|---|---|---:|---:|---|
| **U-A1** git-sync-stop bounded push | 25 | 18 | 1 | `hooks/git-sync-stop.mjs` | 50 | 4 | — |
| **U-A3** orphan reaper Stop hook | 25 | 17 | 1 | `hooks/stop_close_prism_nodes_v2.mjs` (new) + settings | 120 | 6 | — |
| **U-A5** mirror direction enforcement | 20 | 14 | 2 | `hooks/c-to-h-mirror.mjs` (or replacement) | 40 | 3 | — |
| **U-A4** archive 23 disabled hooks | 15 | 16 | 3 | settings.json (both layers), 23 source files moved | 80 | 4 | — |
| **U-A2** .gitignore hygiene + helper audit | 10 | 20 | 2 | `.gitignore`, `state/shared/specs/2026-05-09-helper-audit.md`, `git add/rm` | 30 | 3 | — |

**Phase A acceptance criteria:**
- `git status --porcelain | wc -l` ≤ 50
- 0 orphan git.exe after Stop (30-min idle observation)
- `state/shared/git-sync-stop.log` exists, push success rate >95%
- Settings.json hash equality C: == H: at every SessionStart
- `state/shared/disabled-hooks/manifest.jsonl` exists with 23 entries

### Phase B — T1 multi-chat coordination (6 units, ~7 days)

| Unit | AI | Lev | Lane | Files | LOC | Hours | Deps |
|---|---:|---:|---|---|---:|---:|---|
| **U-B6** Quartz HTML build (port 8766) | 80 | 25 | 4 | `scripts/quartz/`, `scripts/quartz-serve.mjs`, `scripts/daemon-supervisor.mjs` (new) | 250 | 12 | A complete |
| **U-B1** hybrid handoff store + 2 dispatcher actions | 70 | 22 | 4 | `engines/HandoffCoordinatorEngine.ts` (new), `dispatchers/sessionDispatcher.ts` | 220 | 14 | A complete |
| **U-B5** Obsidian vault integration (NTFS junction) | 45 | 18 | 4 | NTFS junction setup, frontmatter convention | 60 | 4 | B1 |
| **U-B3** compact pipeline consolidation (5+ files → 2) | 40 | 20 | 4 | `helpers/precompact-handoff.mjs`, `hooks/precompact-bundle.mjs`, `hooks/postcompact-restore.mjs`, settings | 180 | 10 | B1 |
| **U-B2** ID resolution hardening (mandate stdin) | 35 | 16 | 4 | `helpers/stable-session-id.mjs`, `helpers/per-agent-handoff.mjs` | 80 | 5 | B1 |
| **U-B4** startup pipeline read path | 30 | 15 | 4 | `hooks/session-handoff-load.mjs` | 60 | 4 | B1, B2 |

**Phase B acceptance criteria:**
- 6-chat parallel `/compact` simulation: 0 cross-contamination across 100 trial runs
- PreCompact pipeline = 1 hook (down from 4); PostCompact = 1; Startup-handoff-load = 1
- Quartz dashboard reachable at http://localhost:8766/handoffs
- Obsidian opens any handoff with backlinks intact
- `state/shared/handoff-race-incidents.log` empty over 7-day observation

### Phase C — T2 injection re-architecture (4 units, ~14 days)

| Unit | AI | Lev | Lane | Files | LOC | Hours | Deps |
|---|---:|---:|---|---|---:|---:|---|
| **U-C1** context-bundle daemon | 95 | 30 | 4 | `scripts/context-bundle-daemon.mjs` (new), reuses daemon-supervisor | 300 | 18 | B6 |
| **U-C2** ONE prompt-context-inject hook | 90 | 28 | 4 | `hooks/prompt-context-inject.mjs` (new), settings.json edits | 180 | 10 | C1 |
| **U-C3** browseable context dashboard | 85 | 22 | 4 | Quartz config + content, `scripts/context-html-builder.mjs` | 200 | 12 | C1, B6 |
| **U-C4** retire 30+ redundant hooks | 75 | 32 | 4 | settings.json (both), `state/shared/disabled-hooks/<batch>.jsonl` | 100 | 8 | C2, C3 |

**Phase C acceptance criteria:**
- UserPromptSubmit median latency <100ms (currently ~1500ms)
- Fork count per prompt ≤3 (currently ~35)
- All retained injection content findable via Quartz dashboard
- Settings.json hook entry count ≤80 (currently 319)
- Mark explicit sign-off

## Lane assignment (parallel within phase, sequential across)

```
                  Phase A (3 days)              Phase B (7 days)               Phase C (14 days)
Chat 1 (Lane 1):  ─[U-A1]─[U-A3]─────────────                                                                ─→ idle
Chat 2 (Lane 2):  ─[U-A2]─[U-A5]─────────────                                                                ─→ idle
Chat 3 (Lane 3):  ─[U-A4]──────────────────                                                                  ─→ idle
Chat 4 (Lane 4):  ────────────────────────────[U-B1]→[U-B2]→[U-B3]→[U-B4]→[U-B5]→[U-B6]─────[U-C1]→[U-C2]→[U-C3]→[U-C4]
                  └─ A-merge gate ──────────────────┴─ B-merge gate ──────────────────────────┴─ C-merge gate
```

Lane 4 owns the bulk of B+C because they share infrastructure (HandoffCoordinatorEngine, daemon-supervisor, Quartz). Splitting across chats would create internal coordination overhead worse than the lane has currently.

## Dependency graph

```
U-A1 ──┐
U-A3 ──┤
U-A5 ──┼──→ A-acceptance ──→ U-B1 ──→ U-B2 ──→ U-B3 ──→ U-B4 ──┐
U-A4 ──┤                       │                                 │
U-A2 ──┘                       └────→ U-B5 ──┐                   │
                               └────→ U-B6 ──┴──→ B-acceptance ──┴──→ U-C1 ──→ U-C2 ──┐
                                                                                       │
                                                                       U-C3 ←──────────┤
                                                                                       │
                                                                       U-C4 ←──────────┘
```

## Atomic-first invariant check (per /rgs6 law)

Each unit confirmed atomic — no T1 unit depends on a future T1 unit; no T2 unit depends on a future T2 unit. Every dependency arrow points to a *completed* phase or earlier-in-phase unit:

- All Phase A units have empty deps ✓
- B1 depends on A only ✓
- B2-B4 chain on B1 ✓
- B5-B6 fan from B1 ✓
- C1 depends on B6 (Quartz infra) ✓
- C2 depends on C1 ✓
- C3 fans from C1+B6 ✓
- C4 depends on C2+C3 ✓

## Per-unit rollback flags (env vars)

| Phase | Flag | Default | Effect when set to 0 |
|---|---|---|---|
| A1 | `PRISM_GIT_SYNC_BOUNDED` | 1 | Reverts to legacy detached unsupervised push |
| B1-B4 | `PRISM_HANDOFF_HYBRID` | 1 | Reverts to legacy filesystem-only handoff |
| C1-C2 | `PRISM_CONTEXT_BUNDLE` | 1 | Reverts to per-hook injection |

All flags persisted to `state/shared/feature-flags.json`. Rollback is <5 minutes per phase.

## Telemetry expectations (per /rgs6 SELF-OPTIMIZATION LAW)

For each unit during execution, telemetry SHOULD record:
- `S0 stage_entry` at unit start
- `tool_used` for each significant Bash/Edit/Write call
- `decision` for any branching choice (e.g. "fork to sibling worktree" / "stay on main")
- `outcome` at unit completion (pass/fail/partial)
- `artifact` for each new file/dispatcher action created
- `violation` for any rule-break (e.g. orphan git found post-Stop, race incident)

After phase close: re-run `adaptive-thresholds.mjs` and `compounding-gains-audit.mjs --apply`.

## Compounding gains expected per phase

| Phase | Cumulative artifact ledger entries | Velocity ratchet |
|---|---:|---:|
| A | +1 helper-audit doc + 1 reaper hook + 1 mirror guard | +5% (smaller `git status`, no orphan kills) |
| B | +2 dispatcher actions + 1 dashboard + Obsidian integration | +25% (compact survives multi-chat, Quartz HTML accelerates context lookup) |
| C | +1 context bundle + 30 hook retirements | +60% (prompts fast, fork count low) |

## Risks (from spec § 11) ranked by current probability

1. **R3 (B1)** MCP server crash during compact = handoff lost — Mitigated: filesystem fallback is primary
2. **R7 (C1)** Daemon stale data >60s causes wrong context — Mitigated: bundle includes `freshness_ms`, hook flags
3. **R8 (C4)** Retired hook turns out to be load-bearing — Mitigated: archive (not delete), telemetry flags
4. **R1 (A1)** Push timeout too aggressive — Mitigated: telemetry tracks killed=true rate
5. **R6 (B6)** Quartz incompatible — Mitigated: fall back to MkDocs

## What this roadmap is NOT

- Not the PRISM master roadmap (that's `state/shared/atomic-roadmap.json`, 1068 units, not modified by this work)
- Not auto-executed (Mark must trigger A1 explicitly to start)
- Not multi-machine (this single-PC roadmap; the peer machine picks up via git pull after each commit)

## Next action

Once Mark says "start Phase A":
1. Resolve fork-vs-stay-on-main decision (deferred per Mark)
2. Open the chosen worktree
3. Begin U-A1 (git-sync-stop bounded push) — smallest, highest-confidence change

Reference docs while executing:
- Spec: `state/shared/specs/2026-05-09-prism-stabilization-design.md`
- This roadmap: `state/shared/specs/2026-05-09-prism-stabilization-roadmap.md`
- Master roadmap (untouched): `state/shared/atomic-roadmap.json`
- Predicted collisions (general repo state, RED): `state/shared/predicted-collisions.json`
