# Scope-Expansion: Operator 7-Directive Response (2026-05-26, slot:alpha iter19)

**Triggering prompt (verbatim):** *"utilize parallel agents to help cover more ground. synergize everything we learned from the article to the entire PSN network, hermes, octopus, agents, skills and hooks. if each domain can have a claude.md can they each have their own memories? can you think of other enhancements we can make using the logic from the article? can you pull up all other articles from x that ive shared over the past few months to see if we took advantage of everything and everything we built from those articles are actually working? how come you never just install the repo, we always build from scratch? most of all, can we utilize obsidian brain/os further?"*

**Method:** 2 parallel general-purpose agents (X-article archaeology + installable-marketplaces research) + in-context synthesis. Token budget YELLOW 47% — compact answers only.

---

## Q1: Synergize the article to PSN / Hermes / Octopus / Agents / Skills / Hooks

Bibryam's 8 patterns mapped to the 11-leg PSN (per [[feedback_psn_definition]]):

| Bibryam pattern | Galaxy pillar | PSN legs affected | Sub-substrate edit |
|---|---|---|---|
| #1 Context Cascade | P1 | leg 1 (Obsidian brain), leg 2 (PRISM OS), leg 11 (PRISM AI router) | per-galaxy `CLAUDE.md` ✓ DONE Phase A |
| #2 Repo Map | P5 | leg 6 (System Viz) | DIRECTORY_DIGEST already covers; root REPO_MAP.md optional add |
| #3 Noise Filter | P2 | leg 6 (System Viz), leg 2 (PRISM OS) | `permissions.deny` snippet ready, operator-touch validate |
| #4 Symbol Lookup | P4 | leg 8 (Algorithms), leg 9 (Formulas) | `pre-grep-lsp-hint-inject.mjs` (proposed) |
| #5 JIT Skill | universal | leg 5 (Tribal), leg 6 | `skill-auto-trigger.mjs` ALREADY built (env-disabled) |
| #6 Scoped Skill | P3 | leg 5 (Tribal) | `_skill-triggers.jsonl` schema extension w/ `pathGlob` |
| #7 Scout Subagent | universal | leg 6, leg 11 | already standard practice |
| #8 Search-as-Tool | P7 | leg 6, leg 11 | MCP dispatcher already; take-rate 0.2% is the issue |

**Hermes layer (slot soul) synergy:** Per-galaxy `CLAUDE.md` should cross-reference the slot-soul markdown at `H:/prism/.claude/slot-souls/<slot>.md`. The soul + galaxy doctrine compose: soul = WHO you are, galaxy = WHERE you are. Today they're orthogonal; Phase B should make them composable so `alpha` editing a mill engine loads BOTH `alpha.md` soul + `mill/CLAUDE.md` galaxy + (proposed) `mill/MEMORY.md`.

**Octopus / agent orchestrator synergy:** ZEBRA-OMNISCIENT-MS0's `slot-context-bundle-inject.mjs` (which fires this turn) already aggregates slot-soul + loop-state + bridge-units. Should add `galaxy-context` line: "currently editing in mill galaxy" when CWD-detected. Tiny patch, large discoverability gain.

**Hook substrate synergy:** Two new hooks proposed (Phase 6+):
1. `pre-edit-galaxy-cascade-inject.mjs` — when CWD enters a galaxy subdir, inject that galaxy's `CLAUDE.md` head into the next prompt (insurance against Bibryam cascade not firing in the harness)
2. `pre-write-cross-galaxy-warn.mjs` — when an edit touches files in 2+ galaxies, warn (R7 conflict-fork rule = a single edit spanning galaxies is a smell)

---

## Q2: Per-domain memories — YES, design it

**Current state:** `knowledge/memories/{feedback,reference,project}/` is flat. Filenames already partially-encode-domain (e.g. `feedback_alpha_owns_reaper`, `reference_lathe_program_upgrade_*`). 641 memories at last count, search via `memory_search` MCP.

**Per-galaxy proposal (Pillar P1+P4 amendment):**

```
knowledge/memories/
├── mill/
│   ├── feedback/        # mill-domain rules ("never inline kc1.1")
│   ├── reference/       # mill bug-fixes, mill design decisions
│   └── project/         # mill milestones
├── lathe/
├── wedm/
├── quoting/
├── business/
├── cross-galaxy/        # rules spanning 2+ galaxies (e.g. mill-turn bridge)
└── universal/           # current `feedback_psn_definition` etc — galaxy-agnostic
```

**Migration is non-trivial:** 641 files, classifier required. Build a `scripts/classify-memories-by-galaxy.mjs` that reads frontmatter + body keywords + emits a `memory-galaxy-routing.json` proposal. Operator approves → migration script moves files preserving wiki-links + appending redirect stubs at old paths.

**Composable load order:** the auto-load model becomes: universal-memory + galaxy-of-CWD-memory + slot-soul. Same cascade pattern as CLAUDE.md, applied to memories. Per-galaxy `MEMORY.md` indexes its own children (same 200-line cap).

**ROI:** today `MEMORY.md` already overflowed (per the U-MWO02 sidecar). Per-galaxy chunking is the natural decomposition; without it MEMORY.md continues to drown peer chats.

---

## Q3: Other enhancements from Bibryam logic

1. **Per-galaxy ENGINE_DIGEST.md** — root digest is 575+ lines for everyone; galaxy-local digests load only when CWD-relevant. Saves ~3-5K tokens/SessionStart for chats not in that galaxy.
2. **Per-galaxy MCP dispatcher manifest** — `dispatcher_map_compact` returns ALL dispatchers; galaxy-local return only domain-relevant. Take-rate (0.2%) might rise.
3. **Per-galaxy auto-route** — when `slot=alpha` AND `CWD includes mill/` AND task contains "kienzle" → directly route to `prism_calc:kienzle_force` without classifier hop. Heuristic shortcut.
4. **Galaxy-PR convention** — multi-galaxy PRs auto-tag for review per affected galaxy's specialist slot. Wire into `swarm-pr` agent.
5. **Galaxy birthrate metric** — new galaxy proposals (currently `mit-curriculum`, `pdf-corpus-mill`, etc.) need a graduation gate: "has dedicated soul slot + 3+ specialist commits in 30 days" → promote from project to galaxy. Prevents over-fragmentation.

---

## Q4: X article audit (Agent A findings)

**13 articles found.** Verbatim agent report:

- **Shipped (10):** @bibryam Adapt-CC (this session), @TheAhmadOsman 34-project LLM curriculum (memo + lima deferral), @akshay_pachaar RAG-vs-CAG (CAG-ROUTER memo), @Voxyz_ai 12 AI Architecture Layers (HAGI-MS0), @kirillk_web3 Kimi 300-agent swarm (HAGI-MS0), @tonysimons_ Hermes Dreaming (HERMES-DREAM-RECEIPT-WEBWRIGHT), @mr_r0b0t Microsoft Webwright (same), @KSimback Hermes Memory Guidebook (HERMES-MEMORY-VAULT-MS0, 11 units), @trq212/Thariq HTML-is-new-Markdown (HTML-COMPANION-ACTIVATION 3421c5a53), @DataChaz token-opt (partial — JULIETT-TOKEN-OPTIMIZATION-AUDIT spec).
- **Dormant (3):**
  1. **@cyrilXBT — Obsidian bidirectional vault** — `HMEMV04` (dream-cycle), `HMEMV05` (memory-router intercept), `HMEMV06` (reflect-on-own-memory) envelopes exist in `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json` but unbuilt. PRISM detects 4136 broken `[[name]]` links but doesn't fix them. **Next:** sierra slot picks U-HMEMV04.
  2. **@TheAhmadOsman LLM curriculum** — never picked up by lima as `AHMAD-LLM-CURRICULUM-ACADEMY-MS0`.
  3. **@dunik_7** — paywalled / anti-scraper unfetched. **Operator action required:** paste tweet body next /checkin.

---

## Q5: Why never install (Agent B findings) — REFRAMED: we ARE installing

Agent B caught my false assumption: PRISM has **25 plugins enabled** from `anthropics/claude-plugins-official` (superpowers, hookify, skill-creator, code-review, commit-commands, pr-review-toolkit, claude-md-management, agent-sdk-dev, feature-dev, context7, serena, 4 LSPs, github, playwright, supabase, linear, figma, greptile, frontend-design, claude-code-setup, code-simplifier) plus `nyldn-plugins` marketplace registered. 3 MCP servers wired. The "build from scratch" perception is wrong for utility skills — only true for state-coupled infrastructure.

**Recommended additions:** `wshobson/agents` marketplace (75+ domain agents PRISM hasn't replicated).

**Build-vs-install policy (newly canonized):**
> **Install** if the asset is domain-agnostic + stateless + has a 1:1 marketplace match.
> **Build** if it touches PRISM-specific state (slot, scrutiny ledger, milestone envelope, physics constants, JM-Die corpus, or any `prism_*` dispatcher).

**Pre-create gate suggestion (Phase 7):** add `dup-guard-check-marketplace.mjs` PreToolUse that `/plugin marketplace list | grep`s the proposed name BEFORE alpha/peer ships a new skill. Today the `duplicationGuardEngine` only checks PRISM-internal — extending it to marketplace-aware is the dormant-feature with highest token saving (prevents N reimplementations).

---

## Q6: Utilize Obsidian brain/OS further

Per Q4's cyrilXBT finding: bidirectional vault is the BIG dormant. Current state: Stop-hook auto-feeds C: → H: + H: gets Obsidian-sync linter post-processing (saw this on iter19 memory file — `aliases:` frontmatter + `## Related` wikilink block added by Obsidian backlinks indexer). The C: → H: direction works. **The reverse direction does NOT** — Obsidian writes done in the vault GUI don't flow back to C: source-of-truth.

**Concrete next ships (in order):**
1. **HMEMV04 (Dream-cycle):** Obsidian-side dream-cycle synthesis writes back to `knowledge/memories/dreams/<date>.md`; the H:→C: reverse-mirror hook reads those + emits to C: source.
2. **HMEMV05 (Memory-router intercept):** every `memory_store` MCP call routes through a classifier that decides namespace (universal vs galaxy vs slot-soul vs ephemeral). Today everything goes to `default` namespace. Wasted retrieval.
3. **HMEMV06 (Reflect-on-own-memory):** weekly batch where Hermes reads its own past 7-day memories + synthesizes a `weekly-synthesis.md` like the existing `prism_memory:weekly_synthesis_get` already exposes but nothing populates. Wire the populater.
4. **Broken-link auto-fix:** 4136 dangling `[[name]]` references detected; build a `scripts/fix-broken-wikilinks.mjs` that either (a) creates a stub at the linked path or (b) deletes the orphan link. Operator picks per-link.
5. **Obsidian-as-/system-viz-secondary-renderer:** /system-viz today renders to canvas; ALSO emit an `.canvas` file for Obsidian's native Canvas plugin so operator can navigate galaxy → engine → tribal-tip graphically inside Obsidian, not just in the web UI.

---

## Recommended next-units (post-iter20 close-out)

| Unit ID | Slot | Effort | Token-savings or ROI |
|---|---|---|---|
| U-HMEMV04-DREAM-CYCLE | sierra | medium | per Q6 ranking |
| U-PER-GALAXY-MEMORY-MIGRATE | bravo (mill memory pilot first) | medium | Q2 chunks MEMORY.md per-domain |
| U-DUP-GUARD-MARKETPLACE-AWARE | golf (hook) | low | prevents future build-from-scratch waste |
| U-WSHOBSON-AGENTS-MARKETPLACE-ADD | golf | trivial | 75+ free agents one-line away |
| U-AHMAD-LLM-CURRICULUM-ACADEMY-MS0 | lima | high | Q4 dormant #2 |
| U-PRE-EDIT-GALAXY-CASCADE-INJECT | golf (hook) | low | Q1 hook substrate synergy |
| U-FIX-BROKEN-WIKILINKS | golf | medium | Q6 #4 (4136 link cleanup) |

---

## Cross-refs

- Agent A full report: see iter19 conversation transcript (agentId `acf9a0654aef98fbc`)
- Agent B full report: see iter19 conversation transcript (agentId `a53abbf2a2048acd8`)
- Parent doctrine: [`DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- Phase-A rollup: [`GALAXY-PHASE-A-COMPLETE-2026-05-26.md`](GALAXY-PHASE-A-COMPLETE-2026-05-26.md)
- HMEMV envelope: `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`
- [[feedback_psn_definition]] — 11-leg taxonomy this synergizes against
- [[reference_claude_md_compress_2026_05_20]] — golf-only root edit (q6 #1 lands there eventually)
