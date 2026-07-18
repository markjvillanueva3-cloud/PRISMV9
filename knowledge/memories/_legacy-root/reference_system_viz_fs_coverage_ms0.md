---
name: system-viz-fs-coverage-ms0
description: "2026-05-15 — L11 (bundles) + L12 (canonical files) layers added to system-viz so every H: file is represented. Augment script + 49 tests + 10 namespaces shipped, graph 92,405 → 157,020 nodes."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.979Z
aliases: reference_system_viz_fs_coverage_ms0
---


2026-05-15 — SYSTEM-VIZ-FS-COVERAGE-MS0 Phase 0+1 shipped by slot bravo (claude-b6c4b196). Pivoted mid-session from INTEL-OLLAMA-OBSIDIAN-MS0 work after a fork-storm crash (see [[feedback_no_parallel_agents_high_pressure]]). The pivot: "/loop until every single file in the h drive is represented in system-viz."

**Deliverables:**

- `scripts/expand-system-viz-l12-files.mjs` (26KB, 9 pure-helper exports) — augment script that walks any H: subtree and adds L11 (bundle) + L12 (canonical file) nodes to `state/shared/system-viz/system-graph.json`. Per-walkRoot idempotent + cross-root canonical dedup via `namespace="prism"` collapsing all `prism-*` worktrees to one logical namespace.
- `scripts/expand-system-viz-l12-files.test.mjs` — 49 real-value tests (no stubs) covering all 10 per-file-scrutiny invariants. Plain node:assert per helpers/ vitest-config-infra-bug pattern.
- `mcp-server/data/milestones/SYSTEM-VIZ-FS-COVERAGE-MS0.json` — milestone envelope with explicit phase split (Phase 0+1 complete, Phase 2+3 pending).
- Wiki: [[system-viz-fs-coverage]].

**Cumulative coverage this session:** 10 namespaces, 239,364 files walked, 65,010 fs-nodes added, graph 92,405→157,020 (+70%). schemaVersion bumped to 2.2.0.

**Key invariants (proved by tests):**

1. Same-root re-walk = no duplicate nodes/edges (filter step 2 evicts our prior, append step 3 adds fresh).
2. Cross-root canonical dedup: H:/prism + H:/prism-foo produce same canonical fileId; ONE L12 node with multi-source edges.
3. L0-L10 nodes preserved (purely additive).
4. Atomic write with EBUSY retry + copy fallback (handles viz-server :8765 reads).
5. Truncation-point partial dir NOT recorded (avoids misclassification).
6. Symlink loop protected via realpath visited set.

**Per-file scrutiny (CLAUDE.md PER-FILE SCRUTINY GATE):** 2 reviewers per file. Arm A=code-analyzer + arm B=reviewer.

- Script reviewers: P0×4 (worktree-dedup merge bug, source node mislayered L11→L9, canonicalRel out-of-root silent fallthrough, walkRoot field on bundle/file nodes). All P0 fixed in same turn.
- Test reviewers: arm A PASS clean; arm B FAIL on P0 orphan-from-CI (test only runs via `node` direct, not in npm test glob — deferred, follows existing helpers/ pattern) + P0 edge-dedup contradiction (FALSE positive; test line 366 already locks `m2.edges.length === m1.edges.length`).
- P1 fixes added (adversarial inputs, schemaVersion precondition, fsCoverage lastWalkedAt freshness, dedupedAgainstCanonical counter, data-heavy bundling for archive dirs).

**Critical tribal learnings (the load-bearing parts):**

- **Walk leaf subtrees, not parents.** Full H:/prism walk takes 30+ min and TRUNCATES at the file cap mid-deep-subtree (e.g. inside `mcp-server/data/`), which then skips siblings (`src/`, `web/`, `state/`). Per-leaf walks (≤30k files each) complete in seconds.
- **`tail -30` truncates the `[merge]` success log line.** I lost visibility on a mcp-server apply that may have failed silently. Always capture full stderr+stdout of `--apply`. The pattern is: walk done → `[augment] N nodes...` → `[merge] wrote ...` → summary JSON. If no `[merge]` line, the write didn't happen.
- **Single-process walker safe even at 91% commit pressure.** The fork-storm risk is parallel Agent+bash+node combos, not one node walker. Verified by walking under 91-95% pressure with no crashes.
- **Data-heavy bundling crushes archive dirs.** Docustrata 80k PDFs collapsed to 11 bundles. mcp-server/dist 2,752 files → 1 flat bundle. This is the right tradeoff for renderer-performance.
- **bundle-threshold=200 too generous for many-small-customer-dirs.** JM DIE produced 53,235 individual L12 nodes from 80k files because each customer dir has <200 .min files. Future archive walks (`prism-backups`, `extracted`) should use `--bundle-threshold 50`.
- **Concurrent writers trample.** Atomic-rename retry handles concurrent reads (viz server :8765) but NOT concurrent writers. Enforce sequential walks across the chat fleet — launch one walker, wait for it to merge, then start the next.

**Remaining work (Phase 2+3 — pending):**

- Phase 2: H:/prism subtrees not yet walked (extracted, Resources, BOX, any other top-level).
- Phase 3: Non-prism H: roots — H:/.claude, H:/Tools, 15× H:/prism-* worktrees (canonical-dedup → mostly source + edge additions, not file nodes), H:/prism-backups (must use threshold=50).
- Close-out completion: roadmap-index entry, MILESTONE_PROGRESS regen, BUILD_STATE regen, chat-bus post, /system-viz refresh.

Companion files: see [[system-viz-fs-coverage]] for the wiki, the envelope JSON for the unit list with metrics.


## Related
[[skills/loop|/loop]] • [[skills/expand-system-viz-l|/expand-system-viz-l]] • [[skills/shared|/shared]] • [[skills/system-viz|/system-viz]] • [[skills/system-graph|/system-graph]] • [[skills/data|/data]] • [[skills/milestones|/milestones]] • [[skills/edges|/edges]] • [[skills/prism|/prism]] • [[skills/prism-foo|/prism-foo]]