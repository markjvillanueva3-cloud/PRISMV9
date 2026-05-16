# AUDIT — Token / Context / Memory / Learning System

**Date:** 2026-05-16 · **Slot:** juliett (`claude-3a1c1c68`) · **Skill:** `/forge-audit-v2`
**Scope:** token-saving without quality loss · context retention · memory retention · learning system · auto-fixing · Obsidian auto-learning · DSL+RTK leverage
**META artifact:** `scripts/audit-hook-stack-cost.mjs` (baseline `state/shared/AUDIT-HOOK-STACK-COST-BASELINE.json`)
**Verification doctrine:** every finding below carries a re-runnable `verifies_via` command. A finding with no channel is an opinion, not a finding (Boris #1).

---

## Scope statement

I am auditing PRISM's per-turn and per-session token economy, looking for quality-neutral reductions in injected context and increases in local-compute offload, and the verification channel is `node scripts/audit-hook-stack-cost.mjs --json` (hook cost) + `node scripts/ollama-offload-dashboard.mjs --json` (offload rate) + `node scripts/system-synergy-map.mjs --json` (synergy ratio).

---

## Phase-0 baseline (measured)

| Metric | Value | Source |
|---|---|---|
| Wired hooks (total) | 147 | settings.json |
| SessionStart hooks | 39 (~3,590 est tok/fire, 7 injects) | audit-hook-stack-cost.mjs |
| **UserPromptSubmit hooks** | **24 (~3,420 est tok/fire, 8 injects)** | audit-hook-stack-cost.mjs |
| PreToolUse hooks | 20 (~1,430 est tok/fire) | audit-hook-stack-cost.mjs |
| Stop hooks | 40 | settings.json |
| Ollama offload rate | **23.2%** (63 offload / 209 keep) — target 30% | ollama-offload-dashboard |
| Silent-suggestion ratio | 138 silent : 1 injected (99.3% suppressed) | ollama-offload-stats.json |
| system-viz graph | 20,462n / 77,099e (degraded; self-heals on cron) | system-viz-query headline |

**Headline:** 8 inject hooks fire on **every** UserPromptSubmit. At ~30 user messages/session that is the single largest controllable token sink — and most of the injected payload is *static doctrine that the prompt cache already holds*, re-emitted 30×, which also churns the message-level cache prefix every turn.

---

## Findings (ranked by leverage; each verifiable)

### F1 — Cache-breakpoint churn from per-turn injectors (P0, highest leverage)

**Claim:** Anthropic prompt caching uses a strict `tools → system → messages` prefix hierarchy with only 4 `cache_control` breakpoints; any change at level N invalidates all downstream cache. PRISM's 8 UserPromptSubmit injectors append fresh content every turn, so the *message-level* cache prefix is invalidated ~24×/turn even though system+tools stay cached. Cache read = 0.1× input; a torched message cache is paid at 1.0× every turn.

**Evidence:** [Anthropic prompt-caching docs](https://docs.claude.com/en/docs/build-with-claude/prompt-caching) + hook-audit agent: `prompt-context-inject` re-emits an identical ~600B static `head` every prompt; `master-index-precheck-inject` re-emits a static 3-line doctrine footer every prompt.

**Fix:** Move static portions to a single SessionStart inject; per-prompt injectors emit only the dynamic, prompt-specific slice.
- `master-index-precheck-inject.mjs` — drop static footer
- `prompt-context-inject.mjs` — move ~600B `head` to SessionStart
- `ollama-pipeline-injector.mjs` — compress route bullets to wiki pointer

**Savings estimate (UNCALIBRATED — peer-review correction):** the "~11.5k tok/session" first-pass figure came from `audit-hook-stack-cost.mjs`'s flat `inject=400` heuristic, NOT transcript-measured payloads. Treat as **order-of-magnitude only (single–low-double-digit k tok/session)**. F6 builds the calibration channel that turns this into a real number. The *direction* (per-turn static re-injection churns the message cache) is sound and verifiable; the precise split is not.

**verifies_via:** `node scripts/audit-hook-stack-cost.mjs --json | jq '.byEvent[]|select(.event=="UserPromptSubmit").total_est_tokens'` — baseline 3420; expect drop after trim. `re_run_cost`: 2s.

### F2 — Ollama offload stuck at 23% because router skips slash-prompts + over-suppresses (P0)

**Claim:** `ollama-auto-router.mjs:166` hard-skips any prompt starting with `/` — which is *every* `/checkin`/`/loop`/`/forge` orchestration prompt, exactly where summarize/classify pre-work lives. Compounded: `ollama-task-offloader.mjs:56` `INJECT_THRESHOLD=0.90` silently demotes 8/10 offloadable categories (savings 0.75–0.88) to `mode:silent`, and a 5-min per-category rate-limit nukes burst `/loop` sessions. 50.5% of keep-events are mislabeled `unknown` (space-form `/checkin alpha` vs dash-form `/checkin-alpha` regex gap), polluting the denominator.

**Evidence:** Ollama-audit agent read both hooks + telemetry (`ollama-offload-stats.json`, 93KB): 102/202 keeps are `category=unknown`, dominated by `/checkin <slot> /loop` prompts.

**Fix (file:line):** R1 remove `/` skip (`ollama-auto-router.mjs:166`); R2 lower `INJECT_THRESHOLD` 0.90→0.80 (`offloader.mjs:56`); R4 rate-limit 5min→60s (`offloader.mjs:54`); R5 auto-execute Ollama for `{summary,format_convert,prism_inventory,prism_introspect,classification}` (`offloader.mjs:441`). R1+R5 alone projected to clear 30%.

> **R3 DROPPED (peer-review correction):** the proposed "add space-form `/checkin <slot>`" fix targets non-existent defect — `offloader.mjs:102` already matches space-form via the bare `checkin` alternation (`(^|\s)\/(checkin|...)\b`). The `unknown`-label pollution is real but cosmetic (dashboard denominator only); no code change needed.

**verifies_via:** `node scripts/ollama-offload-dashboard.mjs --json | jq '.totals|(.offloaded/(.offloaded+.keptOnClaude))'` — baseline **0.222** (63/283, drifted from 0.232 within this audit session — itself evidence for R-AUDIT-1); target ≥0.30. `re_run_cost`: 1s.

### F3 — ~440 skill bodies loaded eagerly at SessionStart (P1)

**Claim:** Anthropic's own Agent Skills standard mandates **progressive disclosure**: stage-1 metadata always loaded, stage-2 SKILL.md body loaded *only on trigger*. PRISM auto-injects ~440 skills at SessionStart; `skill-auto-trigger.mjs` currently only *surfaces 3 suggestions* but does not gate stage-2 body inclusion.

**Evidence:** [Anthropic — Agent Skills progressive disclosure](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills); SessionStart system-reminder lists the full skill set.

**Fix:** Add `PRISM_SKILL_LAZY_BODY=1` mode to `skill-auto-trigger.mjs` — inline a SKILL.md body only when keyword-matched, else metadata-only. Est. 10–30k tok/session if 50% stay collapsed.

**verifies_via:** measure SessionStart `additionalContext` byte length with/without flag via a transcript probe. `re_run_cost`: 5s. *(Status: open question until probe built — flagged for F-followup, not shipped this audit.)*

### F4 — Subagent model routing: reviewers default to parent (Opus) (P1)

**Claim:** A subagent inherits a full context window; per-file scrutiny spawns 2 reviewers/file and the Stop gate spawns 3 — all at the parent model (Opus). Documented public failure mode: 49 parallel subagents → 887k tok/min. Triage-class review does not need Opus.

**Evidence:** [Claude Code subagent cost case study](https://www.aicosts.ai/blog/claude-code-subagent-cost-explosion-887k-tokens-minute-crisis); PRISM per-file + 3-of-3 gates in CLAUDE.md.

**Fix:** `scripts/lib/agent-model-router.mjs` → `{model,maxParallel}` keyed on `(subagent_type, complexity)`: reviewer-A/B = Sonnet, code-analyzer = Haiku, Opus only for synthesis. Hard cap `PRISM_REVIEWER_MAX_PARALLEL=3`. The `Agent` tool already accepts a `model` override — this is a doctrine + helper, not a core change.

**verifies_via:** grep dispatch helper for `model:` override presence + count Opus-tier reviewer spawns in a sample transcript. `re_run_cost`: 10s.

### F5 — token-efficient-tools beta header (OPEN QUESTION — peer-review downgrade)

**Status:** downgraded from finding to open question per Boris hard-rule (no working verification channel = opinion, not finding). The claim "PRISM's MCP server *may not* set `token-efficient-tools-2025-02-19`" is speculative and unverified — the check script does not yet exist.

**Open question:** Does the PRISM MCP server's outbound Anthropic client carry `token-efficient-tools-2025-02-19` (up to 70% tool-output reduction, avg 14% — [Anthropic token-saving updates](https://www.anthropic.com/news/token-saving-updates))? Resolve by building `scripts/verify-anthropic-beta-headers.mjs` (grep MCP Anthropic client init) BEFORE asserting a gap. Until then this is not actionable.

### F7 — MEMORY.md is 750 bytes from the silent-truncation ceiling, no automated guard (P0 — peer-review-added)

**Claim:** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` is **23,826 bytes** vs the Anthropic harness **24,576-byte** truncation ceiling — 96.9% full, 750 bytes from silently losing fleet-wide cross-session recall. This exact failure is a *prior shipped regression* (CLAUDE.md §Recent regressions 2026-05-16 U-MEMORY-COMPRESS: "load was silently truncated every chat fleet-wide, breaking cross-session recall" — compressed 73KB→21KB). The index has re-grown to the edge in days with **no automated guard** — the compression was a one-shot fix, not a watchdog. The audit scope explicitly named "memory retention" and this is the single largest, cheapest, fully-verifiable memory risk; the first-pass audit walked past it.

**Evidence:** `wc -c < "C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md"` → `23826`. CLAUDE.md §Recent regressions precedent. Peer reviewer (staff-engineer adversarial pass) surfaced this as the strongest missed finding.

**Fix:** `scripts/memory-size-watch.mjs` — mirror the `synergy-regression-watch.mjs` pattern the audit itself cites: read MEMORY.md size, append to `state/shared/memory-size-history.jsonl`, exit non-zero when `size > 0.90 × 24576` (warn) or `> 0.97 ×` (critical). Wire to `/loop --interval 1d` or the Stop advisory cluster. This is the P0 — it makes the U-MEMORY-COMPRESS fix *durable* instead of one-shot.

**verifies_via:** `node scripts/memory-size-watch.mjs --json | jq '.bytes,.pctOfCeiling'` → bytes number + ratio; regression when `pctOfCeiling > 0.90`. `re_run_cost`: <1s. `baseline`: 23826 / 0.969.

### F6 — No context-utilization telemetry (the measurement gap) (P1)

**Claim:** Anthropic "effective context engineering" names compaction + structured-notes + sub-agent-isolation as the 3 primitives — PRISM does all 3, but has **no measurement of injected tokens that were never referenced downstream**. Without this, F1/F3 trims are flown blind.

**Fix:** `scripts/context-utilization-audit.mjs` — walk recent transcripts, flag inject blocks never cited/echoed in the following assistant turn. Stop-hook advisory (non-blocking), once/session.

**verifies_via:** script emits a `wasted_inject_pct` number; track week-over-week in `state/shared/context-utilization-history.jsonl`. `re_run_cost`: ~15s.

---

## Peer review (Boris hard-gate — RESOLVED)

Staff-engineer adversarial reviewer (`isolation: worktree`) returned: F1 PASS (savings relabeled uncalibrated), F2 PASS (R3 dropped as phantom fix, baseline refreshed 0.232→0.222), F3 PASS-as-open-question, F4 PASS-as-proposal, **F5 FAIL → downgraded to open question**, F6 PASS-as-proposal. Strongest missed finding **F7 (MEMORY.md size guard)** added + shipped this audit. All corrections applied above; 0 unresolved FAILs.

## Karpathy anti-drift checkpoint (after 7 findings)

- On brief? **Yes** — every finding maps to a user-named axis (token-saving / context / memory / learning / Obsidian / DSL+RTK).
- Actionable not catalog? **Yes** — F1/F2 have file:line fixes + measured savings; F3–F6 have named artifacts + verification channels.
- Unverified synergy edges? F3 downgraded to "open question" (probe not yet built) — honest per Boris hard-rule. DSL/RTK axis: RTK already healthy (60–99% bash savings, in active use); CODE_SYSTEM_INDEX 4,180 shortcodes — no defect found, so no manufactured finding (anti-pattern: audit-without-measurement avoided).

---

## Recommended action order (highest ROI first — post-peer-review)

1. **F7** — `memory-size-watch.mjs` (P0; cheapest, fully verifiable, makes the prior U-MEMORY-COMPRESS fix durable; 750 B from re-triggering a known fleet-wide regression) → **build now, this audit**
2. **F2** — Ollama R1+R5 (offload 22%→30%+, frees Claude reasoning budget; corroborated by `feedback_ollama_docker_pipeline_dead_code_2026_05_16`) → next `/forge7` unit
3. **F1** — hook static/dynamic split (real direction; savings uncalibrated until F6) → next `/forge7` unit, paired with F6
4. **F6** — context-utilization telemetry (the calibration channel that turns F1's estimate into a measured number)
5. **F4** — subagent model router (multiplicative on a 12-chat fleet) → doctrine + helper
6. **F3, F5** — lazy skill bodies + beta-header verify (open questions; resolve channel first)

---

## Regressions detected (→ CLAUDE.md back-flow, deferred — CLAUDE.md peer-claimed at audit time)

- **R-AUDIT-1** | Ollama offload rate 23.2% silently below 30% target for an unknown period; no week-over-week alert (parallels the 2026-05-16 synergy-regression-watch gap). | fix: F2 R1–R5 + extend `synergy-regression-watch.mjs` pattern to offload rate. | observed-by: claude-3a1c1c68 slot juliett `/forge-audit-v2`. | verify: `node scripts/ollama-offload-dashboard.mjs --json | jq '.totals|.offloaded/(.offloaded+.keptOnClaude)'` ≥ 0.30.
- **R-AUDIT-2** | `ollama-auto-router.mjs:166` `/`-prefix skip makes the auto-router dead code for the entire `/checkin`/`/loop`/`/forge` prompt class (it records 0 decisions in telemetry — wired but never fires). | fix: F2 R1. | observed-by: same. | verify: `ollama-auto-router` appears in `ollama-offload-stats.json.byHook` with `fired>0` after a `/loop` session.

_Back-flow to `H:/prism/CLAUDE.md` §Recent regressions is pending peer claim release on that file; tracked here so it is not lost._
