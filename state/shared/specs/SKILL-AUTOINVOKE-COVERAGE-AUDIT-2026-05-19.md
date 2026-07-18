---
title: Skill Auto-Invocation Coverage Audit
date: 2026-05-19
slot: foxtrot
session: claude-6437979f
tool: /forge-audit-v2
brief: "Read the '20 Claude Skills' article (sairahul1 X / BrowserAct) and apply its 'the right skill loads when relevant' thesis to PRISM's skill auto-invocation — measure which skills are dark to skill-auto-trigger.mjs. Utilize system-viz + obsidian + neural network."
meta_artifact: scripts/skill-trigger-coverage.mjs  (PRE-EXISTING — U-LIMA-A5, NOT rebuilt)
verdict: PARTIAL — F3-prior symptom resolved (parser fix, not scope); F2 reframed; F1/F4 corrected post-peer-review; F3/F5/F6 minor
peerReview: FAIL-then-corrected (agent ab5510c8, isolation:worktree — F1 + F4 failed, fixed with git-verified evidence)
advisoryOnly: true
mustHumanVerify: true
supersedes_partial: state/shared/specs/HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17.md (F3 leg)
---

# Skill Auto-Invocation Coverage — Audit

**Brief origin.** The "20 Claude Skills Most Builders Don't Know Exist" article (sairahul1 X long-form, login-walled; content traced to the BrowserAct blog via the Indie Hackers cross-post) makes one load-bearing claim: *"The right skill loads when relevant, the rest are ignored."* This audit measures how true that is for PRISM's 622-skill surface.

**Verification channel (declared up front, Phase 3 gate).** Every finding cites the exact command that re-measures its baseline. Primary tool: `node scripts/skill-trigger-coverage.mjs --json` (pre-existing META artifact, `U-LIMA-A5`). Wrapper-adjusted reading: `/tmp/cov-analysis.mjs` logic, folded below.

## Phase 0 — Live baseline (measured 2026-05-19)

| Metric | Value | Source |
|---|---|---|
| Total skills (project + 2 user trees, name-deduped) | **622** | `skill-trigger-coverage.mjs --json .total` |
| Covered (≥1 surfaceable ledger trigger) | **121** | `.covered` |
| Raw coverage | **19.5%** | `.coveragePct` |
| NATO slot-wrappers (checkin/handoff/precompact/startup-*) | **104** | wrapper-regex on `.uncovered` |
| `six-chat-*` (correctly dark) | **3** | regex |
| **Genuine dark-gap skills** (no `triggers:` block, not a wrapper) | **394** | `/tmp/dark-gap.txt` |
| Declared-but-broken (`triggers:` block emits 0) | **2** | `.declaredNotCaptured` |
| **Honest coverage** (covered / non-wrapper, n=515) | **23.5%** | 121 / (622−107) |
| Skill-trigger ledger entries | **481** | `wc -l _skill-triggers.jsonl` |
| Ledger trigger score quality | 32 strong (≥0.8) · 448 ok · **1 sub-floor** | ledger score histogram |
| Stale ledger rows (name in ledger, no `.md`) | **0** | `.staleLedgerCount` |

Two auto-invocation layers exist — the audit metric above measures **Layer 2 only**:

- **Layer 1 — model-level.** Every Claude session is injected ~440 skill names+descriptions at SessionStart; the model invokes via the `Skill` tool by relevance judgement. *This is the article's actual mechanism* ("the right skill loads") and it reaches the whole surface.
- **Layer 2 — `skill-auto-trigger.mjs`** (UserPromptSubmit/PostToolUse/Stop hook). BM25 keyword match against `_skill-triggers.jsonl`; injects a top-3 *suggestion* into prompt context. A hook physically cannot invoke a skill — it can only nudge. Layer 2 covers **121 skills**.

## Findings (6 — each with verification channel)

### F1 — [RESOLVED — but the prior audit MISDIAGNOSED the cause]

The ledger grew **36 → 481** entries since 2026-05-17, so the prior audit's F3 *symptom* ("only 36 entries reach the ledger") is gone. But the prior audit's stated *root cause* — "the extractor probably reads only `H:/prism/.claude/commands/`" — was **wrong**, and an earlier draft of this audit propagated it (caught by peer review — see F6). Git history, verified this session:

- **`2ba5d4baf3` — `U-HRR-PARSER-FLAT`** is the dominant fix: commit subject *"parseTriggers handles flat-string trigger shape — 36 → 399 ledger entries (11×)."* Body: 87 of 124 trigger-bearing skills declare triggers as bare strings (`- "wedm explain"`), not the nested `event/matcher/score` schema the parser expected — `parseTriggers` **silently dropped them**. A YAML-parser bug, not a directory-scope bug.
- **`ef1a44f4a4` — `U-LIMA-A4`** ("cross-tree trigger union") is a secondary contribution (399 → 481).

The extractor scope was never the primary defect. Lesson recorded as F6.

```
verify:   git log -1 --format=%s 2ba5d4baf3        # → the parser fix, "36 → 399 ... (11x)"
          node -e "console.log(require('fs').readFileSync('H:/prism/knowledge/wiki/architecture/_skill-triggers.jsonl','utf8').split('\n').filter(Boolean).length)"
expected: parser-fix commit subject + current ledger line count
baseline: ledger 481 (was 36 on 2026-05-17); cause = U-HRR-PARSER-FLAT (parser), NOT directory scope
```

No action on the symptom — recorded so a future audit neither re-raises it nor re-misattributes it.

### F2 — [CRITICAL → REFRAMED] Layer-2 coverage is 23.5%; 394 genuine skills are keyword-dark — but 100% is the *wrong target*

121 of 515 non-wrapper skills carry a keyword trigger. 394 do not, and they include high-value, frequently-relevant skills — `ai-analyze`, `ai-optimize`, `ai-reason`, `auto-speed-feed`, `blueprint-read`, `cad-review`, `calc`, `dfm-check`, `troubleshoot`, … (full list: `/tmp/dark-gap.txt`).

**The reframe (this is the audit's core insight).** Layer 2 surfaces the **top-3** by BM25 keyword score. If all 622 skills carried triggers, the top-3 slots would be *more contested and noisier*, not more useful. The article's "the right skill loads" works for Anthropic's native Skills because the **model** judges relevance from each skill's `description` — a precision mechanism — not a keyword top-3. PRISM already has that precision mechanism: **Layer 1**. So the correct target is **not** 100% Layer-2 coverage — it is *precision-weighted* coverage: author triggers for the high-frequency-relevance dark skills, and deliberately leave the long tail dark.

```
verify:   node scripts/skill-trigger-coverage.mjs --json   → .coveragePct (raw) ; /tmp/dark-gap.txt (the 394)
expected: honest coverage = covered / (total − wrappers − six-chat)
baseline: 23.5%  (121 / 515)   re-run cost: ~3s
```

**Recommended fix (bounded, NOT 394 units of busywork):** rank the 394 dark-gap skills by relevance/usage (the prior audit's `scripts/high-roi-skill-rank.mjs` is the ranking input), author `triggers:` frontmatter for the **top ~40-60 high-ROI tail** only. Mechanism for authoring at scale → see *Neural angle* below.

### F3 — [MINOR BUG] 2 skills declare a `triggers:` block that emits 0 ledger entries

`checkin-mike` and `wedm-hook-disable` each have a `triggers:` frontmatter block, but neither reaches the ledger.
- `checkin-mike` — a NATO slot-wrapper; it should be dark *anyway* (explicit-invocation only). Its `triggers:` block is mis-authored — harmless, but should be removed for cleanliness.
- `wedm-hook-disable` — a genuine skill; its trigger block is malformed (parse failure, non-`UserPromptSubmit` event, or all scores below the 0.50 extract floor). This is a real, tiny dark-by-bug case.

```
verify:   node scripts/skill-trigger-coverage.mjs --json   → .uncovered[] | select(.declared==true)
expected: list of declared-but-uncovered skill names
baseline: ["checkin-mike","wedm-hook-disable"]  (2)
```

### F4 — [ARCHITECTURAL] 32% of project skills have no `description:` — the lever that feeds Layer 1

Layer 1 (the model picking from skill descriptions) is the article's real mechanism and reaches every skill — *if* each skill has a sharp, disambiguating `description`. Measured this session: of **294** project command files, **199 (67.7%)** carry a `description:` field; **95 (32.3%) have none**. A skill with no description is weakly picked by Layer 1 **and**, if also trigger-less, dark to Layer 2 — doubly invisible. Description coverage lifts the layer that spans the whole surface, and is higher-leverage than authoring keyword triggers.

```
verify:   node -e "const fs=require('fs'),d='H:/prism/.claude/commands';const f=fs.readdirSync(d).filter(x=>x.endsWith('.md'));let n=0;for(const x of f){const m=fs.readFileSync(d+'/'+x,'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);if(m&&/^description:/m.test(m[1]))n++;}console.log(n+'/'+f.length);"
expected: skills-with-description / total project commands
baseline: 199/294 = 67.7%  (measured 2026-05-19)
```

### F5 — [VIZ GAP] The 394 dark-gap skills are invisible in `/system-viz`

The system-viz graph (243,687 nodes / 11 layers) carries ghost roosts for unwired engines (`ghost.unwired-engine`), misc-tasks, priority-queue, and the feature-gap-audit — but **no `ghost.dark_skills` roost**. The graph's only skill nodes are the `core.skills` aggregate ("247 → 14 buckets") and the `skillScript` dispatcher; dark skills have no representation. Adding a `ghost.dark_skills` roost (mirroring `scripts/generate-feature-gap-features.mjs` — emit roost + per-skill child, register in `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice) would surface the auto-invoke gap on the live system map.

```
verify:   grep -rl "ghost.dark_skills" H:/prism/scripts/
expected: ≥1 generator file
baseline: 0  (roost does not exist)
```

### F6 — [META / recurring class] A superseding audit must verify *why* the prior finding was wrong

Surfaced by this audit's own peer review (Phase 4B): the first draft of F1 copied the prior audit's misdiagnosis (extractor directory scope) instead of checking git. This is the recurring class CLAUDE.md `## Recent regressions` already logs twice ("META-tool assumed a schema without reading the file first", 2026-05-16/17) — here as "audit asserted a root cause without reading the source." An audit that supersedes a prior audit must confirm the prior *root cause* against primary evidence (git, source), not merely observe that the metric moved.

```
verify:   F1 now cites commit 2ba5d4baf3; peer-review verdict (agent ab5510c8) records the catch
expected: every finding's root cause traceable to a commit/source, not an assumption
baseline: caught by peer reviewer Phase 4B, corrected before ship
```

## Neural angle (honest scope)

The user asked to "utilize the neural network." Stated plainly:

- **NN-graph tier-5 (GraphSAGE, `NN-GRAPH-MS0..2`) does NOT apply here.** It is a link-prediction GNN that classifies *unwired engine* nodes into a dispatcher. Skill-trigger authoring is a keyword/semantic task, not a graph-edge-prediction task. Forcing it would be a category error.
- **The genuine neural lever is embedding similarity.** `nomic-embed-text` is warm in VRAM. The scalable way to author the F2 top-tail triggers: embed each dark skill's `description`, embed each *covered* skill's trigger keyword-set, and for each dark skill propose a `triggers:` block by analogy to its nearest covered neighbour. This makes "author 40-60 triggers" a review-and-approve task, not a from-scratch task. This is the recommended mechanism for the F2 fix — it is a follow-up unit, not built by this audit.

## What the article validates (no action — confirms PRISM design)

| Article item | PRISM equivalent | Status |
|---|---|---|
| Skill Creator (meta-skill) | `/forge-triple`, `/forge`..`/forge7` | Exceeded |
| Superpowers (planning phase) | `prism_sp` dispatcher + per-file scrutiny + 3-of-3 gate | Exceeded — Superpowers is a first-class dispatcher |
| Document skills (PDF/DOCX/…) | `pdf` skill, `/pdf-learn`, `/video-learn`, `prism_doc_learn` | Covered |
| Obsidian skills (auto-tag/link) | `stop-obsidian-memory-feed.mjs`, wiki, auto-`[[link]]` | Covered |
| "Skills > prompts / build > consume" | 622 skills, forge pipeline, 100% self-built | Exceeded |

The article is a beginner→intermediate listicle about *consuming* official skills; PRISM is the advanced "build your own" case it points toward. The single genuine gap it surfaces is the Layer-2 coverage tail (F2) — and even that is bounded, not a 394-unit deficit.

## META artifact (compounding-gains tax)

`scripts/skill-trigger-coverage.mjs` — **pre-existing** (`U-LIMA-A5`, BACKEND-DEV-LOOP). NOT rebuilt this audit; the duplication guard correctly blocked a re-create. Known defect surfaced here: its raw `coveragePct` (19.5%) counts the 104 correctly-dark NATO wrappers, deflating the honest figure (23.5%). **Recommended follow-up:** add an `--exclude-wrappers` flag so the tool's own number is honest for future re-runs (1-flag change, foxtrot worktree).

## Verdict

**PARTIAL.** The prior audit's F3 *symptom* (36 ledger entries) is resolved — but via a YAML-parser fix (`U-HRR-PARSER-FLAT`), not the directory-scope cause the prior audit claimed (see F1, F6). F2 is reframed from "80% broken" to "23.5% Layer-2 coverage, and 100% is the wrong target" — the genuine gap is the high-ROI dark-skill tail (~40-60 skills), not 394; the peer reviewer independently validated this reframe as a sound precision property, not rationalization. F3 (2 broken trigger blocks), F4 (32% of skills lack a `description`), F5 (no viz roost) are minor/architectural. PRISM's auto-invocation is **healthy and correctly designed** — the article validates it.

**Peer review (Phase 4B — agent `ab5510c8`, `isolation:worktree`):** first pass returned **FAIL** — F1 (wrong root cause) + F4 (no runnable verify command). Both corrected here with git-verified evidence + a live measurement; F2's core reframe validated PASS; F3/F5 PASS. F6 added per the reviewer's missed-finding. A second full review pass was not re-dispatched — the corrections rest on git history (`2ba5d4baf3`, `ef1a44f4a4`) and a re-runnable measurement, which are objective, not opinion.

## Next actions (operator-gated — NOT auto-built)

1. **F3 fix** — remove the mis-authored `triggers:` block from `checkin-mike`; repair `wedm-hook-disable`'s block. Tiny.
2. **F2 fix** — rank dark-gap skills via `high-roi-skill-rank.mjs`; author triggers for the top ~40-60 via the embedding-similarity mechanism above.
3. **F4 fix** — author a `description:` for the 95 project skills that lack one (raises Layer-1 pick quality — the layer that spans the whole surface).
4. **F5** — `ghost.dark_skills` viz roost (mirror `generate-feature-gap-features.mjs`).
5. **META** — `--exclude-wrappers` flag on `skill-trigger-coverage.mjs` so its raw number is honest.
6. Re-run this audit: `node scripts/skill-trigger-coverage.mjs --json` weekly; coverage should drift up as the F2/F4 tails are authored.
