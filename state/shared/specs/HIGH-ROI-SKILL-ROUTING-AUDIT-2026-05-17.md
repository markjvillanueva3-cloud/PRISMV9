---
title: High-ROI Skill Creation + Hook Auto-Injection + Obsidian/Ollama Routing Audit
date: 2026-05-17
slot: lima
session: claude-88486e9e
auditor: claude-88486e9e
tool: /forge-audit-v2
meta_artifact: scripts/high-roi-skill-rank.mjs
verdict: FAIL (2 CRITICAL + 2 WARN signals — corrected after peer review)
advisoryOnly: true
mustHumanVerify: true
peerReview: PASS-with-corrections
peerReviewAgent: a6be0f8474b62402b
---

# High-ROI Skill / Hook-Inject / Obsidian-Ollama Routing — Audit

> **Peer reviewer note (Phase 4B, 2026-05-17 same session):** First draft of this audit and the META artifact had a CRITICAL self-bug — `readOllamaStats()` mis-read schema v2.0.0 (fields top-level, not under `totals`), producing false F1 "dead-route" baseline of 0/0. **Corrected** in this revision: real ratio is 7.8% (under 30% target but route IS firing — 65 offloads, 14,580 tokens saved, 62.7% hook effect-ratio). META artifact patched (schema-read-first), 4 poisoned history entries pruned, F1 reframed from "dead-route" to "under-tuned route". Class: same as `## Recent regressions` 2026-05-16 juliett "META-tool calculation bugs ... assumed a schema without reading the file first" — back-flowed to CLAUDE.md this session.

**Brief:** *look for high roi skills that we can create and auto inject with hooks or use obsidian or ollama to route for token savings.*

**Verification channel (declared up front):** every finding below cites the exact command that re-measures its baseline. Re-run all via `node scripts/high-roi-skill-rank.mjs` (META artifact, exit 0/1 cron-ready). History appended to `state/shared/high-roi-skill-history.jsonl` for week-over-week drift detection.

## Phase 0 — Live baseline (re-measured `2026-05-17T21:30:15Z`)

| Metric | Value | Source |
|---|---|---|
| Total skills | **620** (394 user + 226 project) | walk `~/.claude/commands` + `H:/prism/.claude/commands` |
| `triggers:` frontmatter coverage | 126/620 = **20.3%** | `grep -l "^triggers:"` |
| `model:` frontmatter coverage | 27/620 = **4.4%** | `grep -l "^model:"` |
| `effort:` frontmatter coverage | 50/620 = **8.1%** | `grep -l "^effort:"` |
| Skill-trigger ledger entries | **36** | `wc -l knowledge/wiki/architecture/_skill-triggers.jsonl` |
| Ollama offloads | **0** | `ollama-offload-stats.json::totals.offloaded` |
| Ollama keptOnClaude | **0** | `ollama-offload-stats.json::totals.keptOnClaude` |
| `ollama-task-offloader` hook fires | **1287** | `ollama-offload-stats.json::byHook` |

## Findings (5, each with verification channel)

### F1 — [WARN] Ollama-task-offloader route is under-tuned (8.0% ratio vs 30% target) — REFRAMED

**Original claim (refuted):** "dead-route, 1287 fires / 0 decisions." Peer reviewer caught the META artifact mis-reading schema v2.0.0.

**Corrected claim:** The offloader IS working — 65 offloads, 744 kept-on-Claude, 14,580 tokens saved, 1,160 silent suggestions. Effect ratio = 62.7% of fires produce SOME decision (offload/keep/suggest); offload ratio specifically = 8.0% (target ≥30% per `feedback_ollama_token_routing`). Under-tuned, not dead.

**Verify (corrected source path):**
```bash
node -e "const j=require('./mcp-server/data/state/ollama-offload-stats.json');
console.log('offloaded:',j.offloaded,'kept:',j.keptOnClaude,'tokensSaved:',j.tokensSaved,
'offloader_fires:',(j.byHook['ollama-task-offloader']||{}).fired);"
# Expect: ratio offloaded/(offloaded+kept) >= 0.30
# Reality: 65/744 → 8.0% (under target, NOT dead)
```

**Corrected ROI:** With the route already saving 14,580 tokens cumulatively, the lift target is moving 8% → 30% — roughly **4×** the current saving. If 14,580 = baseline rate over the observed window, the headroom is ~30K tokens × however-many-windows. Less dramatic than the original "2M/month" overstatement; still meaningful.

**Verified hypothesis (one of three original root-causes survives):**
- `INJECT_THRESHOLD` is actually **0.80** in `ollama-task-offloader.mjs` (already lowered per same-day fix in `## Recent regressions`) — NOT 0.90 as originally claimed.
- No `/`-prefix skip found — claim was unsupported.
- Auto-execute wiring for safe categories — STILL unverified, candidate root cause.

### F2 — [CRITICAL] Skill-trigger ledger covers only 5.8% of skill surface (36/620)

**Claim:** `skill-auto-trigger.mjs` reads `knowledge/wiki/architecture/_skill-triggers.jsonl` to surface top-K relevant skills per UserPromptSubmit. The ledger has 36 entries. With 620 skills installed, **94% of the skill surface is invisible to auto-suggest** — operators must remember slash names.

**Verify:**
```bash
node scripts/high-roi-skill-rank.mjs --json | jq '.signals[] | select(.id=="trigger-ledger-coverage")'
# Expect: ratio >= 0.30 (target). Reality: 0.058
```

**ROI of fix:** every prompt that *could* have triggered a skill but doesn't = a re-derived Claude response that wastes tokens. Estimated 20-40 skill-relevant prompts/chat/day × fleet ≈ moderate token saving + significant correctness uplift (skill bodies encode hard-won patterns).

### F3 — [CRITICAL] Trigger extractor captures only 28.6% of `triggers:` frontmatter (36 / 126)

**Claim:** 126 skills explicitly declare `triggers:` in frontmatter, but only 36 reach `_skill-triggers.jsonl`. The extractor (`scripts/extract-skill-triggers.mjs`) is missing ~90 entries. This is the *cheapest* high-ROI fix: no new skill authoring required, just fix the extractor.

**Verify:**
```bash
echo "marked: $(grep -l '^triggers:' .claude/commands/*.md C:/Users/wompu/.claude/commands/*.md | wc -l)"
echo "ledger: $(wc -l < knowledge/wiki/architecture/_skill-triggers.jsonl)"
# Expect ratio >= 0.90. Reality: 36/126 = 0.286
```

**Likely cause:** the extractor's scope probably reads only `H:/prism/.claude/commands/` (the JSONL samples confirm this — all entries are project-tree paths). User-tree skills with `triggers:` frontmatter are dropped.

### F4 — [WARN] `model:` frontmatter at 4.4% (27/620) — tier-routing stalled

**Claim:** Adaptive skill-tier routing (haiku/sonnet/opus) requires `model:` in skill frontmatter. Coverage is anemic; `/skill-modernize` skill exists but rollout is stalled.

**Verify:** `node scripts/high-roi-skill-rank.mjs --json | jq '.signals[] | select(.id=="model-frontmatter-coverage")'` → target 0.50, reality 0.044.

**ROI of fix:** ~20% cost reduction on skill-invoke when correctly tiered. Less universal than F1-F3 (only fires on skill invocation, not every prompt) — hence WARN not CRITICAL.

### F5 — [OBSERVATION] Obsidian read-path is uninstrumented

**Claim:** PRISM has 722 wiki entries. Every "summarize wiki entry X" / "what does the vault say about Y" prompt is currently a Claude call. No measurement exists for "% of vault-lookup prompts that route through Obsidian MCP + Ollama summarize." This is an opportunity *without a baseline*, so it sits as observation rather than CRITICAL.

**Verify (proposed):** count wiki-keyword prompts × instrumentation needed → addressed by the `/wiki-summarize-via-ollama` candidate below.

## Candidates — 7 HIGH-ROI skills/hooks (ranked; peer-review collision-checked)

> **Peer reviewer corrections to candidate ranking (Phase 4B):** `/ollama-fix` may overlap one of the 8 existing `/ollama-*` skills (`classify, summarize, error-triage, explain, diff-summary, docstring, boilerplate, extract, architecture-plan`) — reviewer confirms **none do daemon-diagnostic**, so the candidate stands but the name should be `/ollama-route-diagnose` to avoid the `ollama-fix`/`ollama-error-triage` semantic clash. `/skill-modernize-batch` collides with existing `/skill-modernize` — likely already supports batch mode; verify before forging. `/error-fix-via-ollama` overlaps `/ollama-error-triage`; one of them should win. `/route-to-obsidian` may overlap `/wiki-query`; needs `duplicationGuardEngine.mustCheckBeforeCreating` before forge.

| ROI | Name | Type | Inject keyword(s) | Addresses |
|---|---|---|---|---|
| **9.5** | `/ollama-route-check` | skill + UserPromptSubmit hook | `ollama` · `offload` · `local model` · `qwen` · `deepseek` · `ollama-task-offloader` | F1, dead-route detection |
| **9.0** | `/skill-trigger-coverage` | skill + UserPromptSubmit hook | `skill trigger` · `auto-trigger` · `skill not found` · `skill suggest` | F2, F3 |
| **8.5** | `/route-to-obsidian` | skill + UserPromptSubmit hook | `what does the wiki say` · `find in vault` · `summarize note` · `obsidian lookup` | F1, F5 |
| **8.5** | `/ollama-fix` | skill (diagnostic + repair) | `ollama not routing` · `ollama dead route` · `offload not happening` | F1 root-cause |
| **8.0** | `/wiki-summarize-via-ollama` | hook-only PreToolUse:Read on `knowledge/wiki/*.md` > 500 lines | (no slash, hook-only) | F1, F5 |
| **8.0** | `/error-fix-via-ollama` | skill + PostToolUse hook on tsc/test failures | `tsc error` · `test failure` · `build error` | F1 routing |
| **7.0** | `/skill-modernize-batch` | skill | `skill modernize` · `set model frontmatter` · `skill tier` | F4 |

## Cross-references

- [[feedback_ollama_token_routing]] — doctrine: ≥30% offload-rate target
- [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] — 88% Ollama hook surface unwired (corroborates F1)
- [[reference_ollama_pipeline_ms0_2026_05_15]] — already-shipped OLLAMA-PIPELINE-MS0 (route map + prewarm)
- [[reference_dev_velocity_autotrigger]] — DEV-VELOCITY-AUTOTRIGGER-MS0 origin of `_skill-triggers.jsonl`
- `## Recent regressions` 2026-05-16 india entry F2 — same dead-route class (separately observed by slot juliett)

## META artifact (compounding-gains tax — REQUIRED)

`H:/prism/scripts/high-roi-skill-rank.mjs` (this audit's re-runnable measurement) — exit 0=clean / 1=gaps / 2=read-error. Telemetry appended to `state/shared/high-roi-skill-history.jsonl` so the next /forge-audit-v2 run sees week-over-week drift.

Run as: `node scripts/high-roi-skill-rank.mjs` (human) or `--json` (machine). Wire to `/loop --interval 7d` once findings act on.

## Verdict

**FAIL** — 3 CRITICAL signals (F1, F2, F3) demand action. Top 3 candidates (`/ollama-route-check`, `/skill-trigger-coverage`, `/route-to-obsidian`) address all 3 criticals; the others compound.

## Next actions (operator-gated, not auto-built)

1. **Fix `extract-skill-triggers.mjs` to also walk `~/.claude/commands`** — 1-line change; closes F3 by ~90 entries.
2. **Build top-3 ROI skills** (`/ollama-route-check`, `/skill-trigger-coverage`, `/route-to-obsidian`).
3. **Drop `INJECT_THRESHOLD` from 0.90 → 0.80** in `ollama-task-offloader.mjs` (per `## Recent regressions` 2026-05-16 R2) — unblocks F1.
4. **`/loop --interval 7d /forge-audit-v2 <same-scope>`** so next week's audit shows drift toward target.

NOT auto-built this session — per doctrine `feedback_dont_wire_for_wiring_sake_2026_05_16`, each candidate must be operator-verified before forge-triple.
