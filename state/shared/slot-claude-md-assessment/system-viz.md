# system-viz — slot:sierra

## Current state

**File:** `H:/prism/mcp-server/src/engines/system-viz/CLAUDE.md`
**Size:** ~7,800 bytes / 130 lines
**Quality grade: GOOD**

The file is substantively correct and domain-specific. It was scaffolded by alpha then completed + corrected by sierra (2026-05-29). Key facts are verified on disk. The structure is solid: anti-patterns, operating rules (R-SVIZ-1..7), related galaxy PSN edges, wiki cross-refs, and closed-loop india integration.

**Stale / token-waste issues found:**

1. **ENGINE_DIGEST gap notice (line 20)** — the warning that MasterIndexEngine, VizAutoAugmentationEngine, GraphImportanceEngine, HybridIndexEngine are absent from ENGINE_DIGEST.md is accurate (verified: 0 hits in the digest). This is a real open gap, but it is a TODO item for the digest maintainer, not doctrine for sierra. It inflates the CLAUDE.md with a management note that belongs in a backlog item, not the domain OS.

2. **Karpathy 5-step block (lines 76-78)** — duplicates the universal rule from main CLAUDE.md verbatim (minus the 5 steps themselves, which it just references). Adds ~4 lines for zero domain-specific value; a pointer suffices.

3. **Cross-cutting methodology block (lines 104-114)** — 12 lines of generic PC-specs + Ollama routing + loop doctrine + CAG/RAG/LoRA harness. This is identical content auto-wired into TOOLBELT.md and repeated across all 34 galaxies. In the CLAUDE.md it is pure bloat: sierra already has TOOLBELT.md which carries the same block. Drop here; TOOLBELT.md is the right home.

4. **Critic + keep-working contract stanza (lines 125-130)** — explicitly labelled `(pointer -- global doctrine, do NOT duplicate)` but still occupies 6 lines reproducing the gist. The pointer label is correct; the body should shrink to a single line.

5. **AI-SYSTEMS-STATE comment block (lines 116-123)** — auto-injected pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md`. Useful, but at 8 lines including blank lines it could compress to 2 lines (path + regenerate command).

6. **Closed-loop india integration (lines 95-101)** — `xproc_outcome_publish`, `xproc_kg_project_features`, `xproc_calibration_monitor_record` are cited but not verified present as dispatcher actions (not found in KnowledgeDispatcher or SessionDispatcher during this assessment — marked `// UNVERIFIED` risk). The conceptual bridge is correct but the action names may be stale.

7. **Graph byte-count drift** — the file says "548 MB" in operating rules but PATHS.md says "370-575 MB / ~244K nodes" and GSD.md says "370-575 MB". The 548 MB figure is point-in-time. Should say "370-575 MB (grows with each regen; check .last-successful-regen.json)".

**No fabricated engine names or paths found.** All 4 core engines (MasterIndexEngine, VizAutoAugmentationEngine, GraphImportanceEngine, RankedHybridGraphSearchEngine), all 7 core scripts, and all 6 dispatcher actions (prism_session: master_index_query, master_index_node_status, master_index_utilization_dashboard, master_index_ranked_hybrid; prism_knowledge: obsidian_viz_regenerate, obsidian_viz_status, obsidian_viz_recall_top) are verified on disk.

---

## KEEP

These sections are accurate, load-bearing, and domain-specific — retain verbatim or with minor edits:

- **"What lives here" preamble** (lines 10-12) — the "doctrine/orchestration hub" clarification is essential: the galaxy dir has no .ts files, the code is in the repo root engines/scripts. Without this, every sierra session wastes time looking for code in the wrong place.
- **Engines + dispatcher actions** (lines 14-20) — accurate, verified. The ENGINE_DIGEST gap notice should be trimmed to one line (the detail belongs in a backlog ticket).
- **Graph core generators list** (lines 22-30) — accurate, verified on disk. The dual-role of `generate-system-viz.mjs` vs `regen-viz.mjs` is critical to get right.
- **Ghost-roost dual-registration rule** (lines 32-33) — the most important operational fact in this domain. Keep.
- **Graph + GNN libs** (lines 35-41) — accurate, verified.
- **Hooks inventory** (lines 43-49) — accurate; hook names corrected by sierra 2026-05-29 and verified.
- **Skills list** (lines 51-54) — accurate.
- **Anti-patterns block** (lines 56-63) — the most operationally critical safety section. Every anti-pattern maps to a real regression class. Keep every bullet.
- **Operating rules R-SVIZ-1..7** (lines 65-73) — domain-specific doctrine with no equivalent in main CLAUDE.md. Keep all 7. Fix byte-count drift on R-SVIZ-3 ("548 MB" → "370-575 MB").
- **GSD.md pointer** (line 74) — keep as the executable runbook reference.
- **Related galaxies PSN edges** (lines 79-85) — symmetric cross-references, load-bearing for sierra to know what breaks downstream when the graph degrades.
- **Wiki cross-refs** (lines 87-93) — the `[[architecture/system-viz-knowledge-index]]` START HERE pointer is valuable.
- **Closed-loop india integration** (lines 95-100) — keep the CONCEPT but mark the 3 `xproc_*` action names `// UNVERIFIED` until confirmed in a dispatcher file, or replace with verified equivalents.

---

## DROP

These sections waste tokens and are redundant with universal doctrine or other galaxy brain files:

1. **Karpathy 5-step block** (lines 76-78) — 4 lines referencing what is already in main CLAUDE.md §KARPATHY DISCIPLINE. Replace with: `> Karpathy 5-step pre-code: see main CLAUDE.md §KARPATHY DISCIPLINE. Domain failure modes: OOM on 548MB parse/stringify, race on write-lock, stale fingerprint, SIGKILLed-merge silent-continue.` (1 line pointer + 1 line domain-specific failure mode list).

2. **Cross-cutting methodology block** (lines 104-114) — PC specs + Ollama routing + loop doctrine + CAG/RAG/LoRA is auto-wired into TOOLBELT.md §OPERATIONAL CONTEXT. Exact duplicate. Drop entirely from CLAUDE.md.

3. **Critic + keep-working stanza body** (lines 126-130) — the label says "pointer -- global doctrine, do NOT duplicate" but then gives 5 lines of body. Shrink to: `> Critic + keep-working: global CLAUDE.md HONESTY RULES + R6 + R12. Run scrutiny 3-of-3 gate before Stop.` (1 line).

4. **AI-SYSTEMS-STATE comment block** (lines 116-123) — 8 lines. Compress to 2: path to the file + regenerate command. The HTML comment wrapper is fine but the prose is verbose.

5. **ENGINE_DIGEST gap notice** (line 20, the `⚠ DIGEST GAP:` paragraph) — shorten from 3 lines to 1: `⚠ ENGINE_DIGEST gap: MasterIndexEngine/VizAutoAugmentationEngine/GraphImportanceEngine/HybridIndexEngine missing — regen digest or add entries.` The detail is in MEMORY.md.

Total estimated DROP savings: ~20 lines / ~30% of current file.

---

## ADD (domain-specific — the heart of this assessment)

The following are absent from the current CLAUDE.md and would make sierra fully self-contained for daily system-viz work:

### 1. Query CLI verified subcommand table (currently only in GSD.md §5)
Sierra chats reach for `system-viz-query.mjs` every session. Inline the verified subcommand table so it is visible without opening GSD.md:

```
system-viz-query subcommands (verified):
  find <noun>             — ranked node hits (the canonical lookup)
  headline                — graph headline metrics
  node-card <id>          — ~200-token node card (CHEAP-NODE-ACCESS-MS0; prefer over full graph read)
  roadmap-candidates      — unwired + pending + drift
  blast-radius <id>       — downstream edge fan-out (refactor planning)
  dispatcher-summary      — dispatcher coverage
  coverage-by-domain      — L5 domain coverage
  build-order             — dependency topological order
```

### 2. Three-graph consumer map (currently only in GSD.md §6 and MEMORY.md)
This is the #1 confusion source for sierra — which graph to regenerate for which purpose:

| Graph file | Size | Writer | Consumer |
|---|---|---|---|
| `system-graph.json` | 370-575 MB | `regen-viz.mjs` | master-index / awareness / all 26 pre-*-graph hooks |
| `architecture-graph.json` | 53 MB | `generate-system-viz.mjs` | 3D viewer (`_server.cjs`) |
| `_node-embeddings.jsonl` | ~555 MB | `seed-ghost-from-unwired.mjs` | india GNN tier-5 |

### 3. Regen verify ritual (currently only in GSD.md §3)
The 2-command post-regen verification that every sierra session needs:
```bash
node -e "console.log(JSON.stringify(require('H:/prism/state/shared/system-viz/.last-successful-regen.json')))"
# GREEN: pendingCount=0 AND sidecarOk=true AND ts > .last-regen-failure.json ts
node H:/prism/scripts/system-viz-query.mjs find system-viz   # smoke test: ≥1 hit
```

### 4. FAST[] + splice dual-registration verification command
Currently described but no one-liner verify is in CLAUDE.md:
```bash
# After adding a new ghost-roost generator, verify both registrations are live:
node H:/prism/scripts/regen-viz.mjs && node H:/prism/scripts/system-viz-query.mjs find <roost-noun>
# Empty result = one of FAST[] or merge-augmentations splice is missing
```

### 5. Node-card cheap-read path (CHEAP-NODE-ACCESS-MS0 — shipped 2026-06-04)
Not mentioned in CLAUDE.md at all. This is sierra's own shipped milestone and saves ~98.7% tokens vs full graph read:
```bash
node H:/prism/scripts/system-viz-query.mjs node-card <id>   # ~200 tokens vs 186K for raw graph read
# Seek path: node-card-offsets.json (24MB) + node-cards.jsonl (159MB); never reads system-graph.json
```
Pair with: `find <noun>` → ids → `node-card <ids>`.

### 6. Worktree / CWD gotcha (currently only in PATHS.md)
Load-bearing for avoiding silent misses:
> CWD is `H:/prism-slot-sierra` (slot worktree). All viz assets live in `H:/prism` main tree. Always use absolute `H:/prism/...` paths in Glob/Read/grep — relative paths silently miss the graph and scripts.

### 7. Dispatcher action quick-ref with owner dispatcher (currently scattered)
```
prism_session:master_index_query             — top-K graph + wiki + memory hits
prism_session:master_index_node_status       — single node status
prism_session:master_index_utilization_dashboard — utilization view
prism_session:master_index_ranked_hybrid     — RRF-fused confidence+utilization (RankedHybridGraphSearchEngine)
prism_knowledge:obsidian_viz_regenerate      — trigger viz regen from dispatcher
prism_knowledge:obsidian_viz_status          — viz regen status
prism_knowledge:obsidian_viz_recall_top      — top recalled viz nodes
prism_knowledge:tribal_capture slot=sierra   — tribal write (not direct markdown)
Fallback when :3100 down: node H:/prism/scripts/system-viz-query.mjs find <noun>
```

### 8. Regression class quick-reference
The MEMORY.md has this but it is not in CLAUDE.md. A condensed table of the 5 regression classes sierra must never re-introduce belongs in doctrine:

| Class | Symptom | Guard |
|---|---|---|
| Silent clobber | independent writer overwrites system-graph.json | system-graph-write-lock.mjs |
| Merge OOM exit 134 | merge-augmentations killed, .last-regen-failure.json updated | regen-viz-merge-guard.mjs |
| SIGKILL silent-continue | stale graph used post-OOM without abort | regen-viz-merge-guard.mjs (R12) |
| Stale fingerprint | re-emit blocked by stale hash even when source changed | check .wiki-regen-fingerprint mtime |
| Un-spliced generator | FAST[] added, merge-augmentations splice missing → ghost data silently dropped | dual-reg verify command |

### 9. What NOT to do in this domain (explicit prohibitions)
Currently spread across anti-patterns + SOUL.md "Refuses". Consolidate into one block that a new sierra session reads on first turn:

- Do NOT read `system-graph.json` with raw `JSON.parse` — OOM every time (use `scripts/lib/system-viz-graph.mjs`)
- Do NOT `JSON.stringify(graph, null, 2)` on the merged graph — exit 134 string-cap OOM
- Do NOT run `generate-system-viz.mjs` standalone expecting the merged graph to update — it only writes `architecture-graph.json`
- Do NOT add a generator to regen-viz FAST[] without the `merge-augmentations.mjs` splice block
- Do NOT trust "regen printed done" without verifying `.last-successful-regen.json`
- Do NOT mint dispatcher-id edges with `dispatcher.` prefix — SSOT is `disp.` (file-derived)
- Do NOT write tribal learnings directly to `knowledge/tribal/system-viz-*.md` — use `prism_knowledge:tribal_capture` (auto-overwritten on regen)
- Do NOT glob `H:/prism/**` recursively — the tree contains a 555 MB embedding partial and times out

---

## IDEAL SECTION OUTLINE

```
# System-Viz Galaxy (slot: SIERRA)
## 0. Galaxy shape + CWD worktree gotcha         [2 lines — the "no code here" + absolute path rule]
## 1. Engines + dispatcher actions quick-ref      [verified names + dispatchers; drop ENGINE_DIGEST todo]
## 2. Graph core scripts                          [regen-viz / merge-augmentations / system-viz-query]
## 3. Three-graph consumer map                    [table: system-graph / arch-graph / embeddings]
## 4. Ghost-roost generators                      [dual-registration rule + verify command]
## 5. Graph + GNN libs                            [lib paths, write-lock, merge-guard]
## 6. Hooks inventory                             [pre-*-graph-inject / audit-viz-first / staleness]
## 7. Skills                                      [/system-viz /master-index /viz-audit-sierra etc.]
## 8. What NOT to do (prohibitions)               [consolidated anti-pattern + SOUL refuses list]
## 9. Operating rules R-SVIZ-1..7                 [domain doctrine, fix byte-count drift]
## 10. Regen verify ritual + OOM recovery         [2-command verify + exit-134 recovery steps]
## 11. system-viz-query subcommand table          [including node-card cheap-read path]
## 12. Dispatcher action quick-ref                [all verified actions + fallback when :3100 down]
## 13. Regression class table                     [5 known classes + their guards]
## 14. Related galaxies PSN edges                 [india/golf/alpha/delta/echo/all-26]
## 15. India closed-loop integration              [outcome publish / feature emit / tribal capture — unverify xproc_* until confirmed]
## 16. Wiki cross-refs                            [START HERE pointer + 4 wiki entries]
## 17. AI-systems fleet state                     [2-line pointer: path + regen command]
## Universal-core pointer                         [1-line pointer to main CLAUDE.md]
```

Total target: ~90 lines (down from 130, +new domain content). Every section is sierra-specific or sierra-critical; no generic prose.

---

## UNIVERSAL-CORE POINTER

The following rules must remain available to sierra but should NOT be duplicated in the galaxy CLAUDE.md — a single pointer line suffices:

```
> Universal rails (all slots): see H:/prism/CLAUDE.md §SAFETY RAILS (no-stub, units-first, no-inline-constants),
> §SCRUTINY GATE (3-of-3 before Stop), §PER-CHAT HANDOFF (per-agent-handoff.mjs), §COMMIT FORMAT ([SCOPE]/U-ID),
> §KARPATHY DISCIPLINE (5-step pre-code + R5..R15), §HOOK ENFORCEMENT GATES.
> Sierra commits to main tree: subject prefix [MAIN] [SCOPE]/U-ID per [[feedback_commit_prefix_main_on_shared_tree]].
```

Specific universal rules sierra needs to NOT re-derive (already enforced by hooks, pointer is enough):
- R12 fail-loud (enforced by `regen-viz-merge-guard.mjs` — already baked into R-SVIZ-1)
- R15 wire+test+validate+apply-to-all-galaxies (enforced by `stop_on_unwired_assets`)
- No-stub engine rule (enforced by `comprehensive-build-enforce`)
- 3-of-3 scrutiny gate (enforced by `scrutinize-before-stop.mjs`)
- Per-chat handoff (`enforce-handoff-topic.mjs`)

These are hook-enforced: no need to restate the body in the galaxy file.
