---
name: reference_charlie_quoting_galaxy_audit_2026_05_28
description: Charlie quoting-galaxy synergy audit — worktree-built galaxy is runtime-INVISIBLE until merged; soul was wrong on main; deterministic audit beats rate-limited workflow
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.055Z
aliases: reference_charlie_quoting_galaxy_audit_2026_05_28
---


Slot **charlie** quoting-galaxy synergy audit + fixes (2026-05-28, session claude-e75608b8). Operator goal: "synergize your domain, wired, tested, validated" across all 11 PSN legs.

## Central finding — worktree-built galaxy is runtime-INVISIBLE until golf merges
The galaxy buildout (commit 395d45e2ac) shipped soul + 4 docs + skill + 3 wiki + memories to the **slot/charlie worktree** (`H:/prism-slot-charlie`, ~1908 commits behind main). But runtime hooks read the **MAIN tree** (`H:/prism`, branch cad-fusion-live-ms0). Net: the runtime `slot-soul-inject` served the OLD `role: wire-edm-specialist` soul the whole time — charlie was being mis-guided as a wire-EDM chat despite the quoting soul existing (just stranded). **Lesson:** any galaxy artifact that a runtime hook reads from main (`state/shared/slot-souls/`, `.claude/hooks/`, settings.json) must reach main to be live — committing it to the worktree alone is not enough until golf merges. The engine-dir docs (CLAUDE/MEMORY/PATHS/TOOLBELT) cascade fine via file-read; the **runtime surfaces** are the ones that strand.

**How to apply:** after a galaxy buildout, verify the live surfaces on main — `grep ^role: H:/prism/state/shared/slot-souls/<slot>.md` should match your domain, not a stale one. If wrong, cp the corrected file worktree→main (restorative) so it's live before golf merges. See [[reference_charlie_quoting_galaxy_2026_05_28]].

## Fixes shipped this session (commit 2451375423 + main-tree cp)
- **Soul P0 FIXED:** main `state/shared/slot-souls/charlie.md` cp'd worktree→main → now `role: quoting-specialist` / `domain_filter: quote|quoting|pricing|margin|cost|estimat|bid|freight|import|docustrata`. Verified live. (mike's soul is the wire slot now but reads `misc-cleanup-specialist` on main — stale, mike's lane, chat-bussed.)
- **Custom domain-awareness built+tested:** `scripts/generate-quoting-awareness.mjs` (8 pure exports, self-enumerates the filesystem → `state/shared/quoting/QUOTING-AWARENESS.md`) + `charlie-quoting-awareness-inject.mjs` (charlie-gated UserPromptSubmit hook, fail-soft, injects the headline). 14 tests (9 generator + 5 hook). Mirrors echo's `echo-post-domain-inject` pattern exactly (U-PSGB-ECHO, same day). Live snapshot: **32 cost/quote engines, 16 cost-bridge hooks, 5 algorithms, 9 frontend pages, 1 .ts-1 anomaly, NN bridges QuotingNeural+QuotingDeepReasoning**.
- **Hook + soul placed on main tree** (runtime-read); hook fires + tests pass from the main path.

## DONE 2026-05-29 (cost-bridge wiring + awareness hook live)
- **U-QP-WIRE-AWARENESS-HOOK ✓** — `charlie-quoting-awareness-inject.mjs` wired into settings.json UserPromptSubmit (both C:+H: parse, fires). Live.
- **U-COST-BRIDGE-DISPATCH ✓** — the 16 `cost-bridge-on-*.mjs` hooks were on disk but **0-wired** (gotcha #7). Instead of 16 settings entries (16 spawns/tool-call), built ONE consolidated `cost-bridge-dispatch.mjs` (PostToolUse, matcher `mcp__prism__prism_.*`, 16 action-regex rules in-process = 1 spawn). 9 tests PASS. Wired both trees, both parse, fires from main path. The 16 originals stay canonical full-detail (DRY). Commit `2451375423`-family + U-COST-BRIDGE-DISPATCH commit. **Lesson:** consolidate N orphan event-hooks into 1 matcher-scoped dispatcher — efficiency + "all nodes wired" in one move. Guard bug found+fixed: a plain `endsWith()` invokedDirectly guard fired under `node --test` → `readFileSync(0)` stdin-block hang → use `fileURLToPath(import.meta.url)===resolve(argv[1])`.

## DONE 2026-05-29 (engine node-wiring — ALL 32 quoting engines wired)
- **U-QP-CLOSED-LOOP-DISPATCHER ✓** — deterministic audit vs MAIN: 32 quoting engines, **30 already wired, 2 orphan** = `QuotingClosedLoopEngine` + `QuotingClosedLoopRunnerEngine` (iter46/47 self-improving cycle, 0 refs). iter57/58 orphan claims were STALE. Wired both via new `prism_quoting:quoting_closed_loop_run` (action accepts `outcomes[]` → supplies the `loadOutcomes` closure that can't cross JSON — course-forge closure-input pattern). Schema+enum 5/5 vitest PASS; engine round-trip self-skips in the stale worktree (missing `FairMarketValueEngine` transitive dep), validates on main post-merge. **Lesson:** audit orphan-status vs MAIN not a stale worktree (orphan claims rot); a 1686-behind worktree can import deps it lacks → vitest only the dep-free schema layer there.

## Remaining (genuinely blocked / delegated)
- **golf merge:** slot/charlie → cad-fusion-live-ms0 — makes soul+skills+hooks+galaxy-docs+engine-wiring permanent on main + runs the closed-loop round-trip there (chat-bussed; hooks+soul already cp'd live).
- **Tribal leg — SOURCE-SEEDED (corrected, was wrongly "MCP-blocked"):** the canonical tribal surface `tribal-by-domain-inject` reads `state/shared/tribal-embed-index.json` (**382.7 MB / 24,986 entries**, schema `{id,source,domain,title,path,text,hash,embedding[768]}`) — fed by 3 pipelines: `embed-wiki-into-tribal-index`, `embed-cited-tips-into-tribal-index` (curriculum candidates), `embed-knowledge-store`. **Embeddings WORK** (probed `/api/embeddings` nomic-embed-text → real 768-vec; only `/api/chat` is dead). charlie's 3 quoting wiki entries (quoting-galaxy / quoting-pipeline-verify / quoting-filter-conservative-match) ALREADY feed `embed-wiki-into-tribal-index` → they embed into the index on the next canonical rebuild. So quoting tribal knowledge IS in the canonical SOURCE corpus; the embed runs via the fleet rebuild/cron (Ollama up). **Did NOT hand-rewrite the 382MB index** — R8 (multi-writer, canonical-writer-owned) + the documented 370MB-JSON V8-string-cap/corruption regressions make a degraded-session hand-rewrite unsafe. **Lesson:** "tribal" ≠ MCP-only; wiki entries ARE a tribal source feeder; verify the real pipeline before declaring a leg blocked.
- **Degraded-env note (2026-05-29):** bash intermittently died (255) under fleet rate-limit + slow PreToolUse Bash hook; MCP (3100) + Ollama both down. Patch-siblings written for blocked hook-wiring; engine-wiring committed to worktree (golf integrates).

## Method lesson — deterministic audit beats rate-limited workflow
Ultracode + operator both said "utilize workflow." The Workflow fan-out (8 plain-text auditors) RATE-LIMITED — all 9 agents returned "Server is temporarily limiting requests" (0 tokens; the 144-loop fleet saturates the API). The gaps were **binary facts** (does file X exist on tree Y? is hook Z wired?), so per R5 *code answered them* — `git show --stat`, Grep, `ls`, the generator's own enumeration. A deterministic audit was both rate-limit-immune AND equally accurate for these facts. **Reserve the subagent workflow for judgment calls; use code for binary facts.** (The workflow design — plain-text, no schema — was correct; only the API was down.)
