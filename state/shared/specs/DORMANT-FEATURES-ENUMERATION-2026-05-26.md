# DORMANT / UNDERUTILIZED FEATURES — full enumeration (2026-05-26, slot:alpha iter3)

**Source:** `state/shared/dashboards/hook-injection-roi-audit.md` (1613 injections, 242,882 tokens) + SessionStart context + `mcp-route-takerate-audit.md` + `## Recent regressions`.

**Comprehensive-build directive:** every item lists (a) **why it's needed**, (b) **what it depends on**, (c) **what it blocks**. No "and others" — all N items.

## TIER A — Token-burn waste (firing but high-cost / low-value)

### A1. Slot-soul re-injection — 73 fires/session, 39,073 tokens (16.1%)
- **Why:** Largest single token-burn block. Soul body is 2048-byte static. Per-prompt re-injection is the wrong cache layer.
- **Depends-on:** SessionStart `additionalContext` cache (Anthropic prefix-cache holds the first ~4 breakpoints).
- **Blocks:** U-CACHE-BREAKPOINT-SWEEPER (P0-3) effectiveness.

### A2. Master-index pre-search per-prompt — 68 fires, 20,082 tokens (8.3%)
- **Why:** Reads `system-graph.json` for top-K hits every UserPromptSubmit. Consecutive prompts share keywords.
- **Depends-on:** session-scoped LRU cache keyed on `(sessionId, keyword-hash)`.
- **Blocks:** /system-viz brain query throughput (PSN leg #6).

### A3. Memory vault pre-search per-prompt — 69 fires, 15,539 tokens (6.4%)
- **Why:** Same redundancy class as A2 — re-reads memory index every prompt.
- **Depends-on:** Same LRU cache pattern as A2.
- **Blocks:** PSN leg #4 (Memories) query throughput.

### A4. Wiki precheck per-prompt — 68 fires, 12,183 tokens (5.0%)
- **Why:** Re-reads wiki index every prompt. Same redundancy class.
- **Depends-on:** Cache pattern from A2.
- **Blocks:** PSN leg #3 (Wiki) query throughput.

### A5. Obsidian vault precheck per-prompt — 65 fires, 11,245 tokens (4.6%)
- **Why:** Same redundancy class as A4.
- **Depends-on:** A2 cache pattern.
- **Blocks:** PSN leg #1 (Obsidian brain) query throughput.

### A6. PSN-CHECKLIST forcing-function — 37 fires, 10,282 tokens (4.2%)
- **Why:** Static 6-item checklist appended to every "real" prompt. Same content every fire.
- **Depends-on:** SessionStart additionalContext + per-session suppression marker.
- **Blocks:** nothing — purely additive.

### A7. `━━━━━━━━━━` separator markers — 53 fires, 18,890 tokens (7.8%)
- **Why:** Pure typography. 75,558 raw chars of visual borders. NO information value.
- **Depends-on:** None. Replace with `---` or drop.
- **Blocks:** nothing.

### A8. TEST COVERAGE REMINDER — 41 fires, 6,727 tokens (2.8%)
- **Why:** Static directive re-injected per prompt.
- **Depends-on:** SessionStart cache.
- **Blocks:** nothing.

### A9. CODE COMPLETENESS WARNING — 45 fires, 5,347 tokens (2.2%)
- **Why:** Static directive re-injected per prompt. Already fires advisory I just received twice this session.
- **Depends-on:** SessionStart cache + dedup-per-session.
- **Blocks:** nothing.

### A10. Doctrine/command-surface nudge — 45 fires, 9,640 tokens (4.0%)
- **Why:** Take-rate post-window-fix still ~0.2%. Classifier over-fires; messages aren't actionable enough.
- **Depends-on:** Classifier-retune for `backendAuditChain` + `doctrineSurface` (audit dashboard already says retune).
- **Blocks:** PSN leg #11 (PRISM AI router) telemetry credibility.

### A11. `↻ HOOK_REGISTRY.json regen queued` — 125 fires, 3,032 tokens (1.2%)
- **Why:** Fires on every hook-file edit. Pure-noise — operator never acts on this.
- **Depends-on:** Move to PostToolUse stderr (no prompt-context cost) OR dedup-per-session.
- **Blocks:** nothing.

### A12. `recall-counter-write` log lines — 21 unique markers, ~50 bytes each
- **Why:** Pure telemetry leaking into prompt context. Should be file-only.
- **Depends-on:** Remove from `systemMessage` field; keep file-side append.
- **Blocks:** nothing.

### A13. `[watchdog] previous tool: Bash ran XXXms` — 17 unique entries (rows 117-135)
- **Why:** Each fire has a unique millisecond value → dedup never matches → spam.
- **Depends-on:** Quantize duration to 10s bucket (e.g. "30-40s") so dedup compresses 17 entries → 1-2.
- **Blocks:** nothing.

### A14. `🔁 AUTO-RESUME after /compact` — 3 fires but 3,108 tokens/fire (top-tier per-fire cost)
- **Why:** Re-injects the full RESUME directive across /compact. Structural skeleton is static within a session.
- **Depends-on:** Split RESUME into structural-prefix (cache) + per-session payload.
- **Blocks:** /compact UX cleanliness.

## TIER B — Dormant features (built but NOT firing / measuring zero)

### B1. Ollama `/api/chat` daemon DEAD — 50/50 timeout
- **Why:** Single root cause of: prompt-rewriter-ollama 100% skip, Ollama offload at 6% (target 30%), `/ollama-*` skill chain dark, ai-deep-intelligence advisory empty. Touches PSN leg #11 (PRISM AI router) directly.
- **Depends-on:** GPU contention diagnosis (NIM endpoint, daemon stuck, model unload).
- **Blocks:** B2, B3, U-OLLAMA-DAEMON-REVIVE (P0-1 in PLAN-FILL-GAPS), every Ollama-offload-dependent unit.

### B2. `prompt-rewriter-ollama` hook 100% skipped — daughter of B1
- **Why:** Hook is wired and firing, but every call times out on `/api/chat`. Fix is B1.
- **Depends-on:** B1.
- **Blocks:** Verb-trigger token-savings layer (was supposed to rewrite verbose prompts to terse).

### B3. NN/GNN AUROC UNGRADED (~10 days deferred)
- **Why:** PSN leg #10 (NN/GNN) — embeddingSource mismatch deferred eval; per `feedback_psn_definition` this is the wiring-inference cascade tier-5.
- **Depends-on:** U-NN-PREDICTOR-EMBED-WIRE (already named candidate in CLAUDE.md NN-GRAPH-MS2).
- **Blocks:** Tier-5 ghost-node classification accuracy measurement (no go/no-go signal possible).

### B4. System-viz regen FAILED at `merge augmentations` step, exit 134
- **Why:** Last success 66h ago; master-index search uses stale 14h+ graph; PSN leg #6 (System Viz) degraded.
- **Depends-on:** Root-cause exit 134 (memory? race? augmentation script error?).
- **Blocks:** Every per-prompt master-index inject reads stale data.

### B5. `scripts/audit-mcp-route-takerate.mjs` MISSING on disk
- **Why:** `state/shared/dashboards/mcp-route-takerate-audit.md` references it as "Re-run via" but file is absent. Silent-overwrite candidate per `feedback_commit_to_slot_worktree`.
- **Depends-on:** Restore via `git log --all -- scripts/audit-mcp-route-takerate.mjs` cherry-pick OR rewrite from dashboard schema.
- **Blocks:** Manual take-rate refresh; advisory PSN leg #6 surface.

### B6. `loop-state.mjs tick --session-id` rejected (wants `--session`)
- **Why:** CLI mismatch — my iter-1 tick failed silently. Likely other hooks call it with `--session-id` too.
- **Depends-on:** None — accept both flags in arg parser.
- **Blocks:** /loop iter counter accuracy.

### B7. Memory archive (`MEMORY-ARCHIVE.md` 32.7K) — never query-surfaced
- **Why:** Rotated entries are "discoverable, read on demand" per memory-compact doctrine, but no surface ever auto-points at it. Stale knowledge graveyard.
- **Depends-on:** Either query-surfacing hook OR semantic-search index that includes archive.
- **Blocks:** Cross-session recall of pre-rotation memories.

## TIER C — Underutilized / wrong-threshold (firing right but not optimally)

### C1. `backendAuditChain` classifier — 1675/2277 fires (73.6% of all route-suggest)
- **Why:** Per `mcp-route-takerate-audit.md` audit (post-fix dashboard re-run pending), this single classifier dominates noise. Even with the 600s window fix, it's likely overshooting.
- **Depends-on:** Retune trigger condition (e.g. only fire when ≥2 sequential Reads of `*_DIGEST.md`).
- **Blocks:** Useful take-rate signal-to-noise.

### C2. `<EXTREMELY_IMPORTANT>` superpowers skill expansion — 5,632 tokens/fire
- **Why:** Highest per-fire cost in the whole catalog (rank 12). Some calls legitimate (skill discovery), most repeat.
- **Depends-on:** Dedup-per-session — only inject the full text once.
- **Blocks:** Nothing — but trims 22KB×N savings.

### C3. PSN savings banner — 2 fires, 707 tokens — efficient already
- **Why:** Shows current dedup discipline works when applied. Reference point, not a gap.
- **Depends-on:** N/A.
- **Blocks:** N/A. Keep as-is.

### C4. `git-lock-sweeper` injection — 4 fires, 819 tokens (small but firing into prompt context)
- **Why:** Maintenance noise — operator doesn't act on it.
- **Depends-on:** Suppress from `systemMessage`; log to telemetry file only.
- **Blocks:** Nothing.

## SCOPE EXPANSION — better-efficiency / more-token-savings ideas

### S1. Promote dedup-per-session from per-marker to shared mechanism
The audit shows ONLY 5 markers use the `🔁 [<name>] dedup` discipline (slot-soul, goal-prereq, prompt-rules, prompt-rewriter, master-index). Generalizing dedup-per-session to a library function applied to EVERY UserPromptSubmit injector would clip A1-A14 in one shot.

### S2. SessionStart prefix-cache discipline
Anthropic prefix-cache holds the first 4 cache-control breakpoints. Moving A1+A6+A8+A9 to SessionStart additionalContext (single ~20KB block) replaces ~73K tokens of per-prompt re-injection with ~20K cached-once. Net: ~50K/session saved on long sessions.

### S3. Quantize all bucketed values before dedup
A13 (watchdog millisecond), A12 (recall-counter timestamps), and most `recall-counter-write` lines fail dedup because the byte content is unique. A 10-bucket-or-coarser quantizer fixes the whole class.

### S4. Telemetry — separate write path from prompt-context path
Many hooks emit telemetry into `systemMessage` because the file path is "the easy place to log". A `systemMessage` field is paid-for by the model every prompt. Telemetry should NEVER use it; only operator-actionable advisories should.

### S5. Hook-firing budget per UserPromptSubmit
Currently 30+ UserPromptSubmit hooks fire on every prompt. A 5-fire/prompt budget with priority-ranked drop-the-rest behavior would force operators to compete for prompt space — same effect as physical context budgets.

## Synthesis — sequencing recommendation

**Phase 1 (this iter / next 2 iters, no new deps, pure-cleanup wins):**
- A7 (separator drop) — trivial regex strip
- A12, C4 (telemetry-to-file) — `systemMessage` → file append
- A11 (HOOK_REGISTRY queued → PostToolUse) — move hook trigger
- A13 (watchdog quantize) — 1-line bucket
- B6 (loop-state.mjs flag-accept-both) — 3-line arg-parser fix

**Phase 2 (operator-touch / off-process):**
- B1 (Ollama daemon revive) — restart + GPU diagnose; unblocks B2, B3, S1 via Ollama-routed deduplicator
- B4 (system-viz regen exit 134) — root-cause merge-augmentations crash

**Phase 3 (architectural):**
- S1+S2+A1-A6 (cache-breakpoint-sweeper) — the U-CACHE-BREAKPOINT-SWEEPER unit in PLAN-FILL-GAPS

**Phase 4 (signal-quality):**
- C1 (backendAuditChain retune) — observed in this very session
- B5 (audit-mcp-route-takerate.mjs restore)
- S5 (hook-firing budget)

## Cross-refs

- `state/shared/dashboards/hook-injection-roi-audit.md` (source dashboard)
- `state/shared/dashboards/mcp-route-takerate-audit.md` (source dashboard)
- `state/shared/specs/PLAN-FILL-GAPS-RTK-EFFICIENCY-2026-05-26.md` (parent plan; this enumeration is its Phase-A discovery output)
- `state/shared/specs/FORGE-AUDIT-TOKEN-CONTEXT-2026-05-26.md` (parent forge audit)
- [[feedback_commit_to_slot_worktree]] (silent-overwrite class affecting B5)
- [[reference_memory_compact_null_holder_fix_2026_05_26]] (iter1 ship)
- [[reference_mcp_route_takeup_window_extend_2026_05_26]] (iter2 ship)
