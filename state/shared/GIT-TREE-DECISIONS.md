# Git-Tree Remediation — Decision Ledger

> Source of truth for the 5 v6-roadmap git-tree decision gates. Recorded as operator decisions land. **Planning-only artifacts have no git-mutation side effects.** Execution of any decision happens later in an explicit P3 quiesce window, only after the operator green-lights the run.

Last updated: 2026-05-12 (DELTA / claude-7361b856 / harness-stab continuation)

---

## U-GC-00 — Canonical Trunk

| Field | Value |
|-------|-------|
| **Decision** | ✅ **APPROVED** |
| **Choice** | `cad-fusion-live-ms0` becomes the formal trunk |
| **Decided by** | Operator (2026-05-12, in-chat) |
| **Recommendation source** | v6 roadmap convergent recommendation |
| **Rationale** | Branch already carries 150+ unpushed commits and is where every active chat lands. Forcing all fleet activity through `main` would require a massive forward merge under hostile multi-chat conditions. The fleet has already adopted `cad-fusion-live-ms0` as the trunk in practice — this just formalizes it. |
| **Execution status** | NOT EXECUTED — planning-only until P3 quiesce window |
| **Migration steps when executed** | 1. Push `cad-fusion-live-ms0` to `origin` <br> 2. Rename: `git branch -m main main-legacy && git branch -m cad-fusion-live-ms0 main` (locally, then `git push --set-upstream origin main`) <br> 3. Update `origin`'s default branch via web UI or `gh repo edit --default-branch main` <br> 4. Update every worktree's tracking: `git -C <worktree> branch --set-upstream-to=origin/main` <br> 5. Update CLAUDE.md "Main branch" reference <br> 6. Update milestone envelopes that reference branch by name <br> 7. Update CI/CD configs (.github/workflows/*.yml) <br> 8. Announce on AGENT_CHAT.md so all chats rebase their worktrees |
| **Reversal cost** | LOW — branches are cheap; can be renamed back atomically if a problem surfaces in the first 24h |
| **Cross-machine impact** | Every machine running PRISM (currently MarkV + DESKTOP-N7MI1VB at minimum) needs to fetch + retarget their main worktree. Trivial via the migration steps above. |

---

## U-GC-01 / U-GC-26 — Forge-Orphan Branches

| Field | Value |
|-------|-------|
| **Decision** | ⏸ PENDING USER DECISION |
| **Recommendation** | KEEP (do not bundle / archive into a single orphan branch) |
| **Rationale for KEEP** | Forge-orphan branches carry experimental work history that may inform future scrutiny / learning loops. Bundling collapses individual-branch lineage. Storage cost is low (most are <10 MB delta). Cost of keeping is far less than cost of losing context if anyone later needs to mine a forge-orphan for a pattern that worked. |
| **Counter-argument for BUNDLE** | 47 worktrees × N forge-orphan branches each = ref-storm; `git fetch` on origin is slow; `git branch -a` output is overwhelming. |
| **Open question** | If KEEP, do we move them to a dedicated `archive/` namespace prefix instead of staying in `work/`? Operator's call. |

---

## U-GC-02 — History Rewrite

| Field | Value |
|-------|-------|
| **Decision** | ⏸ PENDING DISCUSSION (operator wants blast-radius first) |
| **Recommendation** | YES — via `git-filter-repo` to strip large blobs + old monolith dumps |
| **Fallback ladder if NO on filter-repo** | (1) `git lfs migrate` — move large binaries to LFS, keep history intact; (2) BFG repo-cleaner — strip specific paths/blobs without full rewrite; (3) squashed-snapshot — orphan branch starting from current HEAD, abandon old history entirely |
| **Blast-radius** | _populated automatically below by `git count-objects -vH` and worktree census; see "Blast-Radius Snapshot" section_ |
| **Disruption** | EVERY active worktree (currently 47) must either re-clone or rebase from the new history. Multi-chat fleet must pause during the rewrite (P3 quiesce window). |
| **Size win estimate** | TBD — depends on what's in the big-blob census. If extracted monolith dumps (1,350 orphan `.js` from extracted/) are tracked in history, removing them could halve pack size. |

---

## U-GC-15 — Path B vs Path C

| Field | Value |
|-------|-------|
| **Decision** | ⏸ PENDING USER DECISION |
| **Recommendation** | Path B — post-analysis, after the U-GC-02 history-rewrite decision lands |
| **Why B over C** | Path B = incremental cleanup after rewrite (lower risk, reversible). Path C = aggressive monorepo restructure (higher payoff but harder to undo). Sequencing B first keeps the option open for C later if B's win is insufficient. |
| **Note** | Path B/C are defined in the v6 roadmap; if the operator wants the full B-vs-C contrast surfaced inline here, that's a follow-up. |

---

## P3 — Quiesce Window Scheduling

| Field | Value |
|-------|-------|
| **Decision** | ⏸ PENDING USER DECISION |
| **Recommendation** | Schedule a 30-60 min quiesce window when (a) all 6 fleet slots are intentionally idle, (b) no peer chat has uncommitted critical-class files, and (c) origin push backlog is drained. Best candidate: weekend off-hours. |
| **Pre-quiesce checklist** | 1. Announce on `AGENT_CHAT.md` 60 min in advance <br> 2. Operator pauses any auto-loops (`/loop` jobs, scheduled tasks that touch git) <br> 3. Drain `git-sync-stop` push queue <br> 4. Confirm `git status --short` is clean in main + all worktrees <br> 5. Snapshot full `H:/prism` to backup location before rewrite |
| **During quiesce** | Execute U-GC-00 trunk rename, U-GC-02 history rewrite (if approved), U-GC-15 Path B steps |
| **Post-quiesce** | Every chat session must re-checkin + verify their worktree's upstream tracking is correct before resuming work |

---

## Blast-Radius Snapshot

> Auto-populated; refresh before any quiesce-window execution.

_(Snapshot taken 2026-05-12 in this session — see chat transcript for raw `git count-objects -vH` output. Will be updated when operator green-lights execution.)_

| Metric | Value |
|--------|-------|
| Total `.git` size on disk | **41.51 GiB** (huge — loose-object hoard) |
| Pack size only | 732.73 MiB (56 packs) |
| Loose objects | 217,525 total; 190,506 in-pack; **16,511 prune-packable** (next `git gc --prune=now` would reclaim significant space) |
| Worktree count | 44 (verified via `git worktree list`) |
| Unpushed commits ahead of origin (cad-fusion-live-ms0) | 155 (as of 2026-05-12 21:00Z) |
| Total refs (branches + tags) | 110 (103 branches, 6 tags, 1 HEAD) |
| **Top-10 largest blobs** | **`models/ggml-large-v3.bin` — 2,951.65 MB (2.9 GB) — the Whisper model** (almost certainly committed by accident; should never have been tracked) <br> `state/shared/system-viz/system-graph.json` × 6 distinct snapshots — 91-174 MB each — auto-regenerated, each regen creates a new blob (~700 MB+ across history) <br> `state/shared/system-viz/obsidian-augmentation.json` — 127.89 MB (similar pattern) <br> `models/ggml-base.bin` — 141.10 MB (another Whisper model) |
| **Filter-repo win estimate** | **Conservative ~3.5 GiB** reclaim from history if `models/*.bin` (3 GB) + repeated `system-viz/*.json` snapshots (~500 MB across history) are stripped. Aggressive: ~5 GiB+ if other large model/state files exist deeper in history. |
| Lighter alternative (no rewrite) | `git lfs migrate import --include="models/*.bin,state/shared/system-viz/*.json"` would shrink working clones by moving these to LFS while preserving exact history. Disruption: every worktree needs `git lfs pull`. |

### Post-strip residual audit (2026-05-13, via `/big-blob-hunt` skill)

After the 2026-05-12 history strip removed `models/*.bin` + `state/shared/system-viz/*.json`, a re-scan via `/big-blob-hunt --threshold=10M --top=25` finds 25 surviving blobs ≥ 10MB totaling **~700 MB**. Full report: `state/shared/BIG-BLOB-CANDIDATES.json`.

| Class | Blobs | Size | U-GC-02 recommendation |
|-------|-------|------|----------------------|
| **AUTO_GEN_STATE** (LSP cache, audit logs, build artifacts) | 18 | ~510 MB | gitignore the path + `git-filter-repo --invert-paths` |
| **LEGACY_DUMP** (v8.89 monolith HTML/zip + `registries/_archive/COMPLETE_HIERARCHY_v15.json`) | 3  | ~81 MB | `git-filter-repo --invert-paths` (one-shot artifacts, no live refs) |
| **DATA** (`collision-avoidance-data.json` × 4 versions, `program-labels-full.json`) | 5  | ~77 MB | review case-by-case; lfs-migrate if confirmed source-of-truth, filter-repo if duplicate |

**Auto-safe paths for the next U-GC-02 strip pass** (no live code references found; ready to strip after .gitignore commits):
- `mcp-server/.serena/cache/**`
- `state/logs/audit.jsonl`
- `mcp-server/c/tmp/**`, `mcp-server/tmp/**`
- `_BUILD/**`
- `PRISM_v8_89_002_TRUE_100_PERCENT.html`
- `registries/_archive/COMPLETE_HIERARCHY_v15.json`

**Manual review still required**: `mcp-server/src/data/collision-avoidance-data.json` (grep for callers first) and `mcp-server/data/training/program-labels-full.json` (training corpus — lfs-migrate is the right home if it stays).

**Estimated additional reclaim from this strip pass**: ~535-600 MB on top of the 2026-05-12 strip's reclaim. The bulk of the 41 GiB on-disk is in loose-object hoard (16,511 prune-packable per the snapshot above) — a `git gc --prune=now` after the strip will reclaim that separately.

---

## Execution Log

_(Populated when any decision is actually executed. Until then this section stays empty — `git status` is the proof none have run.)_

(no executions yet)

---

## Cross-References

- v6 Roadmap source: `state/shared/atomic-roadmap.json` (git-tree-remediation section)
- Convergence ledger: scrutiny v5 SHA `e7a852c69` (Correctness 90 / Safety 91 / Completeness 93)
- Multi-chat coordination: `state/shared/AGENT_CHAT.md`, `AGENT_WORKBOARD.md`
- HS-day-0 / harness-stab batch (background): commits `8b4850866`, `f65f2b255`, `a947e17ff`, `c4a58ad63`, `75966fc1a`, `a47d08108`, `65bdddcd2` (HS-14+15)
- Per-machine deployment: `install-memory-pressure-task.ps1` must run on each machine independently
