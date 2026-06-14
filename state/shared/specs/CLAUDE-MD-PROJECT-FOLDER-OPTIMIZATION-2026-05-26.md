# Deep Research — CLAUDE.md + Project Folder Utilization Optimization (2026-05-26, slot:bravo)

**Triggered by:** operator /goal "do deep research for claude.md utilization and project folder utilization and assess how we can maximize and optimize their potential. karpathy rules seem to be the dominant trend for claude.md remember we have souls.md too for agents"

**Companion specs (same session):**
- `MEMORY-WIKI-OPTIMIZATION-2026-05-26.md` — memory + wiki eager-load reduction
- `HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26.md` — staged-write receipt-bundle pattern
- Memory: [[reference_hermes_dreaming_and_webwright_2026_05_26]]

**Prior research not to re-derive (wiki precheck flagged):**
- `spec-hermes-evolving-skills-research-2026-05-17` — Hermes evolving-skills (2 weeks old; identified soul gap; never closed on naming convention)
- `claude-cli-app-design-capabilities-2026-05-21` — Claude CLI design surface research

---

## 1. The Karpathy CLAUDE.md doctrine — primary-source synthesis

**Origin** (Web research 2026-05-26):
- Karpathy's January 26 2026 post described agent failure modes (silent assumptions, overengineering, unauthorized scope creep, no clarification-seeking).
- Forrest Chang's `forrestchang/andrej-karpathy-skills` (now also mirrored at `multica-ai/andrej-karpathy-skills`) crystallized this into a CLAUDE.md template — **220K+ combined GitHub stars** by May 2026, fastest-growing repos in GitHub history.
- **Karpathy joined Anthropic 2026-05-19** working on Anthropic's pre-training team — this trend will deepen.

**The 4 rules (canonical):**
| Rule | Failure it addresses | PRISM today |
|------|---------------------|-------------|
| R1 — **Think Before Coding** | Silent wrong assumptions | ✅ in user global as "Karpathy 5-step pre-coding"; ❌ not in project CLAUDE.md |
| R2 — **Simplicity First** | Overengineered "future-proof" abstractions | ✅ in user global; ❌ not in project CLAUDE.md |
| R3 — **Surgical Changes** | Unauthorized adjacent edits | ✅ in user global; ❌ not in project CLAUDE.md |
| R4 — **Goal-Driven Execution** | Imperative noise; ignored success criteria | ✅ in user global; ❌ not in project CLAUDE.md |

**The critics' lesson — "steal the shape, not the file":** The 220K stars don't mean copy-paste; they mean adopt the 4-category SHAPE, delete what doesn't apply, ADD concrete commands/paths/test-gates as skills, put mechanical checks into hooks.

**PRISM is over-on-content, under-on-shape:**
- Project CLAUDE.md is **880 lines / 74 KB / 41 H2 sections** — the kitchen sink approach
- It published its own ceiling: *"past ~200 lines total, CLAUDE.md compliance collapses"* — we are **4.4× over**
- The 4 rules ARE in PRISM (R1-R4 in global, R5-R12 doctrine added in project), but the project file does NOT lead with them. It leads with EXPERT ROLE → CANONICAL SOURCES → SCRUTINY GATE — operational fragments instead of the rule spine

**Security note (Adversa AI / LayerX, Feb 2026):** Malicious CLAUDE.md files can exfiltrate SSH keys / API credentials via instructed pipelines. 13% of agent-skills packages contain critical security flaws. PRISM should never accept CLAUDE.md from untrusted forks — only the canonical multica-ai or our own. Verified safe today; standing rule.

## 2. Souls — current state (key finding, partially-built)

**Reality vs perception:**
- The slot-soul-inject hook fires every UserPromptSubmit (I saw mine fire 3× this session before dedup-suppression)
- Souls live at **`H:/prism/state/shared/slot-souls/`** (NOT `.claude/souls/` as a Hermes-naming convention would suggest)
- **28 files exist** (`alpha.md`..`zulu.md` + README.md)

**Population status — uneven:**
| Cohort | Count | Avg size | Status |
|--------|-------|----------|--------|
| Original 13 NATO (`alpha`..`mike`) | 13 | ~2 KB | **Rich** — frontmatter (role/voice/tone/escalation_path/refuse_list/preferred_subagent_type/domain_filter/hermes_role) + Voice/Behavior/Refuses/When-in-doubt sections |
| Post-SLOT-RECLAIM expansion (`november`..`zulu`) | 13 | ~800 B | **Placeholder** — "currently unallocated; picks units from priority queue like any work slot" |

So 13 souls do the work, 13 are stubs. The Hermes pattern (per KSimback's article) is per-slot first-class personality — every slot should be either deliberately specialized OR deliberately marked as a generic work slot with a documented charter. **13 thin placeholders is the unfinished half of U-HERMES02 / U-ZPSN02**.

**Hook convention:** `slot-soul-inject.mjs` reads `state/shared/slot-souls/<slot>.md` directly — naming is *intentional divergence* from Hermes' `.claude/souls/` because state/shared is multi-host shareable, .claude is per-machine. **Document this divergence in the README.md** (currently the README doesn't justify the choice).

## 3. `.claude/` project folder — measured utilization

| Subdir | Files | Use | Health |
|--------|-------|-----|--------|
| `hooks/` | **916** | UserPromptSubmit/Stop/PostToolUse/PreToolUse infrastructure | ⚠ session brief reports **391 orphan-on-disk** = **42.7% orphan ratio** |
| `worktrees/` | 324,411 | The 26 slot worktrees (1 per chat) | OK — gitignored; growth is expected |
| `skills-archived/` | 551 | Archived skills | OK — `commands-archive/` + `skills-archived/` are deliberate retention |
| `helpers/` | 462 | Pure-fn helpers (`per-agent-handoff.mjs`, `chat-slots.mjs`, `loop-state.mjs`, etc.) | OK |
| `commands/` | 314 | **Active** skills (`/checkin`, `/pick-unit`, `/forge-triple`, …) | OK — "~440" count in CLAUDE.md is stale; reality is 314 active + 668 archived = 982 |
| `commands-archive/` | 117 | Pre-deletion archive (HS-06 / SKILLS-UTILIZATION-MS0) | OK |
| `agents/` | **103** | Subagent definitions (used via Task tool `subagent_type`) | ⚠ **NO INDEX** — discoverability requires globbing |
| `scripts/` | 62 | One-off operator scripts | OK |
| `skills/` | 58 | Domain skill bundles | OK |
| `memory/` | 33 | Local memory engine state (separate from C:/auto-memory) | ⚠ relationship to C:/auto-memory unclear; needs naming clarity |
| `.tmp/` | 20 | Transient | OK |
| `global-rules-backup/` | 13 | Backups of CLAUDE.md & global settings | OK |
| `scratch/` | 7 | Scratch space | OK |
| `kernel/` | 5 | PSK kernel (10 syscalls) | OK |
| `bin/` | 4 | Portable binaries | OK |
| `schemas/` | 2 | JSON schemas | OK |
| `docs/` | 1 | (under-built) | ⚠ should index docs |
| `cache/` | **17,547** | Hook caches, dedup sidecars, claim caches | ⚠ needs prune policy |
| `state/` | 1 | (placeholder; state lives under `H:/prism/state/`) | OK |

**Hot spots:**
- **`hooks/` 42.7% orphan** — biggest cleanup. Per session brief: 916 on disk, 525 wired in settings.json, 391 orphan. Either prune-or-archive-or-wire. (Existing `audit-orphan-hooks.mjs` punch list — track as a roost.)
- **`agents/` 103 with no index** — `subagent_type` is a closed enum that operators reach for by memory. A 1-line-per-agent `AGENT_DIGEST.md` (Hermes-style; same shape as `ENGINE_DIGEST.md`) would close the discoverability gap with a 1-line cost.
- **`cache/` 17,547 files** — needs a retention/prune policy. Stop hook is the natural home.

## 4. Synthesis — what to do (4 optimization axes)

### Axis A — Restructure project CLAUDE.md around the Karpathy 4-rule SPINE
Today's 41 H2 sections collapse into 4 spine sections + 1 operational pointer block:

```
H:/prism/CLAUDE.md (target: ≤200 lines / ~10 KB, down from 880 / 74 KB)

## EXPERT ROLE                                        (unchanged — operator identity)

## THE 4 RULES (Karpathy-derived, R1-R4)              ← NEW spine, leads the file
   - Think Before Coding (with PRISM-specific Karpathy 5-step)
   - Simplicity First (with PRISM-specific don't-overengineer doctrine)
   - Surgical Changes (with conflict-fork rule + slot-worktree pointer)
   - Goal-Driven Execution (with success-criteria-first pattern)

## R5-R12 — AGENT-ERA EXTENSIONS                      (already in user global; pointer here)

## SOULS — per-slot personality layer                 ← NEW; documents state/shared/slot-souls
   - Naming-convention divergence rationale
   - 13 specialist + 13 generic placeholder status
   - Refuse_list semantics

## OPERATIONAL GATES (pointer block)                  ← compressed; each is 1 line + wiki link
   - SCRUTINY GATE → wiki/architecture/scrutiny-3way
   - PER-FILE SCRUTINY GATE → wiki/architecture/per-file-scrutiny
   - GOAL-COMPLETE GATE → wiki/architecture/goal-complete-gate
   - CLOSE-OUT AUTOMATION → wiki/architecture/close-out-audit
   - 15+ other gates → wiki/architecture/hook-gates-catalog

## CANONICAL SOURCES (pointer to PRISM-INVENTORY-LATEST + BUILD_STATE + MILESTONE_PROGRESS)

## SAFETY (one block — never inline physics constants + tiered Ω thresholds)

## ROADMAP (one line — ONLY roadmap is PRISM-UNIFIED-ROADMAP-v2.md)

## RECENT REGRESSIONS                                 ← move to state/shared/RECENT-REGRESSIONS.md (already a pattern)
```

**Everything else** moves into `knowledge/wiki/architecture/` (PRISM already has the 5-namespace KNOWLEDGE VAULT schema for exactly this).

### Axis B — Materialize the missing 13 specialist souls or formalize the placeholder doctrine
Two options:
1. **Domain-assign november-zulu** to the 13 unassigned domains (CAD-AI, post-processor-AI, ERP, vendor-portal, video-learn, audit-only, etc.) — gives 26 deliberately-specialized chats
2. **Keep them as generic work pool** but expand the placeholder soul to a real charter: "picks from priority queue, default subagent code-analyzer, never claims domain expertise, escalates physics/safety to bravo and post/CAM to india/echo"

Recommend #2 for 6-8 of them (acknowledging we don't need 26 specialists), #1 for the 5-7 we do have natural homes for.

### Axis C — Index the indices (`agents/`, `hooks/`, `commands/`)
- **`AGENT_DIGEST.md`** at `.claude/agents/` — 1 line per agent: `forge-team (4-agent team for engine+skill+hook+test)` × 103.
- **`HOOK_DIGEST.md`** at `.claude/hooks/` — group by event (UserPromptSubmit / Stop / PostToolUse / PreToolUse), mark each as `wired` / `orphan` / `archive-candidate`. Use the same generator pattern as ENGINE_DIGEST/DISPATCHER_DIGEST.
- **`COMMAND_DIGEST.md`** at `.claude/commands/` — already partly covered by `state/shared/PRISM-COMMANDS-MANIFEST.md` but inconsistent. Standardize.
- All three digests are kept current by the same nightly cron that updates ENGINE_DIGEST.md.

### Axis D — Cache prune policy
- 17,547 files in `.claude/cache/` — operator-invisible cost. Stop hook adds a 1-min cap with size-based eviction (default: 90d retention, max 200 MB). Knob: `PRISM_CACHE_RETENTION_DAYS=N`.

## 5. Composition with the 3 other specs from this session

| Spec | Axis owned | This spec's intersect |
|------|-----------|----------------------|
| MEMORY-WIKI-OPTIMIZATION-MS0 | CLAUDE.md / MEMORY.md sizing + on-demand recall | Axis A is the CLAUDE.md execution lever for MEMORY-WIKI's Shift A |
| HERMES-DREAM-RECEIPT-WEBWRIGHT-2026-05-26 | Receipt-bundle staged-write pattern | Axis A's CLAUDE.md edits + Axis B's soul edits should land via dream-receipt for review |
| WEBWRIGHT-SKILL-PROMOTION-MS0 | Browser session → reusable skill | Axis C's COMMAND_DIGEST consumers feed into Webwright's skill-promotion pipeline |

**Recommendation:** the 4 specs from this session belong under one super-milestone — call it **PRISM-OPERATING-DISCIPLINE-MS0** (or rolled into existing HZP-DASH-PSN-MS0 since bravo's been on that line). All four converge on: *"the substrate is there, we just don't use it in a disciplined way."*

## 6. New units to add (extends MEMORY-WIKI-OPTIMIZATION-MS0)

| Unit | Title | Effort |
|------|-------|--------|
| U-MWO10 | Restructure CLAUDE.md to Karpathy 4-rule SPINE; move sections to wiki | M |
| U-MWO11 | Materialize specialist souls for november-zulu OR formalize generic-pool charter | M |
| U-MWO12 | `AGENT_DIGEST.md` + `HOOK_DIGEST.md` + standardize `COMMAND_DIGEST.md`; nightly cron update | M |
| U-MWO13 | `.claude/cache/` retention policy + Stop-hook prune | S |
| U-MWO14 | Update slot-souls README to document state/shared vs .claude/souls divergence | XS |
| U-MWO15 | CLAUDE.md security harden: never accept untrusted CLAUDE.md from forks (Adversa AI lesson) | S |

Now **15 units across MEMORY-WIKI-OPTIMIZATION-MS0** (was 9). Still ~2 days for one slot. Composes cleanly.

## 7. Decision points (extends prior decision set)

5. **Adopt Karpathy 4-rule SPINE in project CLAUDE.md?** (Axis A) — recommend yes; it's "steal the shape" applied to ourselves. Highest doctrine-clarity ROI.
6. **Specialist-souls plan for november-zulu?** — recommend mixed (5-7 specialists + 6-8 generic pool with real charter).
7. **`AGENT_DIGEST.md` / `HOOK_DIGEST.md`?** — recommend yes; mirrors the existing ENGINE_DIGEST pattern; 1-line costs.
8. **Cache retention default?** — recommend 90d / 200 MB hard cap.
9. **CLAUDE.md security policy doc** — recommend yes; one-page rule + a Stop hook that flags any untrusted CLAUDE.md additions in commits.

---

## Sources

- [Karpathy CLAUDE.md Skills: Use the Viral Rules as a Menu, Not a Template — Developers Digest](https://www.developersdigest.tech/blog/karpathy-claude-md-skills-menu)
- [Andrej Karpathy's CLAUDE.md Rules: The File That Fixes Claude Code — AI Builder Club](https://www.aibuilderclub.com/blog/karpathy-claude-md-rules)
- [`multica-ai/andrej-karpathy-skills` (GitHub, official mirror)](https://github.com/multica-ai/andrej-karpathy-skills)
- [Karpathy-Inspired CLAUDE.md Passes 220,000 Combined GitHub Stars — TechTimes](https://www.techtimes.com/articles/316798/20260518/karpathy-inspired-claudemd-passes-220000-combined-github-stars-four-rules-that-stop-ai-breaking.htm)
- [Karpathy Joins Anthropic: What CLAUDE.md Rules Mean for AI Agents — Jackson Yew](https://jacksonyew.com/blog/karpathy-anthropic-claude-md-ai-agent-rules)
- KSimback Hermes Memory Guidebook (per-slot soul.md pattern reference) — https://x.com/KSimback/status/2058262328496554021
