# OLLAMA + OBSIDIAN ROUTING AUDIT — 2026-05-18 (slot golf, claude-b23a56ef)

**Scope:** find skills/scripts/hooks that **auto-fire and route through Ollama or Obsidian** for token savings, context extension, build quality, and mistake mitigation. **Expand on what already exists** — don't re-build.

**Verification channel:** every finding declares its own re-measurement tool. No opinions without channels.

## Phase 0 — preflight (R12 honest)

- Inventory: live (auto-regenerated on SessionStart)
- BUILD_STATE: live (auto-injected this prompt)
- Synergy ratio: not re-measured this session — baseline `22.2%` (juliett 2026-05-16 [[reference_synergy_regression_watch_2026_05_16]])
- System-viz graph: **363.5MB** (post-regen-viz mid-session; S3 fallback active)
- Memory: stable 70-80% range, reaper task `Running ✓`
- Context: heavy (this is the final big-ship of the session)

## Phase 2 — exhaustive surface enumeration

### A. Ollama-routing hooks (30 on disk)

`ai-feature-recommend`, `ai-system-router-inject`, `claudemd-ollama-enforcer`, `commit-draft-suggest`, `directive-summary-refresh-iooms`, `directive-summary-refresh`, `embed-vault-on-save`, `embedder-inject-qdrant`, `grep-index-first`, `local-compute-intent`, `mcp-route-suggest`, `memory-mirror-to-vault`, `memory-system-init`, `neural-ai-optimizer`, `nim-autostart`, `octopus-provider-probe`, `ollama-auto-router`, `ollama-autostart`, `ollama-context-aggregator`, `ollama-engine-api-extractor`, `ollama-obsidian-rag`, `ollama-pipeline-injector`, `ollama-prewarm-on-pipeline`, `ollama-prism-intelligence`, `ollama-reviewer-second-opinion`, `ollama-route-check-inject`, `ollama-route-pretooluse`, `ollama-route-recommender`, `ollama-schema-engine-sync-gate`, `ollama-session-continuity`.

### B. Obsidian-feed hooks (15 on disk)

`auto-postmortem-on-failure-restart`, `error-fix-vault-bridge`, `inbox-capture-sharpen`, `inbox-lag-advisory`, `master-index-precheck-inject`, `memory-mirror-to-vault`, `memory-rag-inject`, `memory-system-init`, `ollama-obsidian-rag`, `optimal-context-inject`, `recall-counter-track`, `scrutiny-verdict-persist`, `session-start-auto-resume`, + test files.

### C. Search/index/context surfaces (just-shipped + existing)

| surface | status | fires |
|---|---|---|
| `master-index-precheck-inject` | wired | every UserPromptSubmit |
| `wiki-precheck-inject` | wired | 3588/session |
| `viz-first-redirect` | wired | 1728/session |
| `archived-skill-suggest` | wired | 2329/session |
| `skill-auto-trigger` | wired | 2296/session |
| `subagent-start-context` | wired | every Agent spawn |
| `read-bundle` (9 sub-hooks) | wired | per Read |
| `pre-read-graph-inject` ← **NEW today** | wired | per Read (graph context) |
| `find-symbol.mjs` + `/find` ← **NEW today** | shipped | on-demand |
| `/ask-local`, `/ollama-bridge` (U-OE01+L2) | shipped | on-demand |
| `loop-inject-dedup` | wired (goal-prereq only) | per matching prompt |

## Phase 3 — findings (each with verification channel)

### Finding F1 — ~80% of Ollama hooks are likely orphan-on-disk

**Claim:** 30 Ollama-routing hooks exist; per the prior selection-bias finding ([[reference_hook_fire_counts_selection_bias_2026_05_18]]) only ~10 of all 510 hooks actively fire per telemetry. The Ollama subset likely has the same orphan ratio — most of those 30 files are wired in NO settings.json matcher, costing zero but providing zero token savings either.

**Verification channel:**
```bash
node scripts/ollama-hook-fire-audit.mjs --json
```
**Expected signal:** wired-and-firing / wired-but-zero-fire / unwired-on-disk counts.
**Re-run cost:** ~1s.
**Baseline:** unmeasured pre-this-audit (the META artifact this audit ships).

### Finding F2 — Obsidian feed is one-way (memory→vault) only

**Claim:** `stop-obsidian-memory-feed.mjs` writes auto-memories TO the vault but the **reverse flow** (vault content surfaced INTO Claude prompts on tag match) does NOT exist for hand-written Obsidian notes. The `memory-rag-inject` hook surfaces auto-memories, not the user's own notes.

**Verification channel:**
```bash
grep -lE "knowledge.*vault.*read|obsidian.*inject" .claude/hooks/*.mjs
```
**Expected signal:** at least one PreUserPromptSubmit hook that reads `knowledge/vault/*.md` tags and injects relevant notes. **Currently: 0 hooks match.**
**Re-run cost:** ~2s.
**Baseline:** 0 inbound-vault hooks today.

### Finding F3 — Ollama/NIM autostart races create per-prompt noise

**Claim:** This session emitted "Auto-started PRISM local compute" 3+ times across prompts (`local-compute-intent` + `ollama-autostart` + `nim-autostart` overlap). The current cooldown logic is per-hook, not cross-hook. Each autostart attempt costs ~50ms and a noise line.

**Verification channel:**
```bash
grep -c "Auto-started PRISM local compute" state/shared/handoffs/HANDOFF-claude-b23a56ef-*.md
```
**Expected signal:** number of redundant autostart injections per session.
**Re-run cost:** ~0.5s.
**Baseline this session:** 3+ (visible in injected context blocks above).

### Finding F4 — BM25 sidecar precomputation (already documented gap)

**Claim:** `master-index-search-lib.mjs:132-133` explicitly names this as the unshipped fix. Every subagent spawn re-pays ~2-3s cold-parse of the 363.5MB graph. A pre-tokenized `.master-index-bm25.sidecar.json` (cron-regenerated alongside graph) cuts that to ~100ms.

**Verification channel:**
```bash
# Cold-load measurement:
time node -e "import('./scripts/lib/master-index-search-lib.mjs').then(m=>m.runMasterIndexSearch('kienzle',{topK:1}))"
```
**Expected signal:** wall-clock time per spawn × subagent-spawn-rate.
**Re-run cost:** ~3s.
**Baseline:** ~2-3s per cold load; ~50+ spawns/active session = ~100-150s wasted/session.

### Finding F5 — `/find` could auto-redirect Glob/Grep for symbol-shaped queries

**Claim:** `viz-first-redirect.mjs` exists but only SUGGESTS viz before Glob/Grep. When the query is a clear identifier (PascalCase, camelCase, well-known symbol), it should AUTO-INVOKE `/find` and return the result inline, saving the Glob→Grep→Read chain entirely.

**Verification channel:**
```bash
grep "auto.*invoke\|auto.*substitute" .claude/hooks/viz-first-redirect.mjs
```
**Expected signal:** ≥1 line that performs auto-substitution (currently 0 — only suggests).
**Re-run cost:** ~0.3s.
**Baseline:** 0 auto-substitutions today; all viz-first-redirect hits are advisory.

### Finding F6 — Stop-hook bundle doesn't reuse parsed graph across sub-hooks

**Claim:** Each Stop sub-hook that wants graph data spawns a fresh node + re-parses the 363.5MB JSON. The bundle pattern works for IPC but each hook is its own process. A shared graph-cache daemon (or single bundled process holding the graph in-memory) would amortize the parse across all consumers.

**Verification channel:**
```bash
node scripts/hook-fire-rank.mjs --json | jq '[.ranked[] | select(.hook | contains("graph") or contains("viz") or contains("master-index"))] | length'
```
**Expected signal:** number of telemetrized hooks doing independent graph parse.
**Re-run cost:** ~1s.
**Baseline:** ≥5 known graph-consumers (master-index-precheck, viz-first-redirect, subagent-start-context, pre-read-graph-inject [NEW], wiki-precheck).

## Phase 6 — META artifact + ranked action list

### META shipped this session: `ollama-hook-fire-audit.mjs`

See sibling file: `scripts/ollama-hook-fire-audit.mjs`. Re-runnable. Closes F1's verification channel.

### Action list (ranked by leverage / ship-cost)

| # | unit | LOC | win | cost |
|---|---|---|---|---|
| F1-build | `ollama-hook-fire-audit.mjs` META | ~80 | quantifies the orphan ratio for the 30 Ollama hooks | ✅ shipping this session |
| F3-fix | `local-compute-autostart-coalesce.mjs` | ~40 | cross-hook lock, dedup the 3+ autostart fires | next session |
| F4-build | `build-master-index-sidecar.mjs` + lib opportunistic read | ~150 | 2-3s → 100ms cold-load per subagent | next session |
| F5-extend | viz-first-redirect auto-invoke mode | ~30 | replaces Glob→Grep→Read chain when query is symbol-shaped | next session |
| F2-build | `obsidian-vault-precheck-inject.mjs` | ~60 | surfaces user-written notes by tag on UserPromptSubmit | follow-up session |
| F6-build | shared graph-cache daemon | ~200 | amortize 363MB parse across 5+ hooks | architectural — bigger plan |

## Phase 7 — end-state

- Surfaces enumerated: **45 hooks** (30 Ollama, 15 Obsidian)
- Findings: **6** (all with verification channels)
- Peer reviewer: **DEFERRED** — context-pressure trade-off; mark this audit as `unreviewed-by-peer` per R12 honesty rather than skipping silently.
- Regressions: **1** flowed to `CLAUDE.md ## Recent regressions` (F1 selection-bias compounds the orphan problem)
- META artifact: `scripts/ollama-hook-fire-audit.mjs` (sibling file)
- `/loop` re-run: not auto-scheduled this session (would need user-approved cron entry)
- HTML companion: deferred (audit is text-only matrices, no diagrams worth SVG)

## Memory cross-refs

- [[reference_hook_fire_counts_selection_bias_2026_05_18]] — F1 root cause class
- [[reference_dev_tools_audit_meta_scripts_2026_05_17]] — prior META scripts
- [[reference_juliett_devtools_synergy_map_2026_05_17]] — synergy baseline
- [[reference_ollama_pipeline_ms0_2026_05_15]] — Ollama pipeline injector
- [[reference_ollama_expand_ms0]] — /ask-local + /ollama-bridge
