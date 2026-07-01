# HS-06 — Smart Skill-Recall Architecture (Brainstorm + Plan)

> Forge-7 style plan. Boris-loop discipline: each phase has a hard gate. Subagent work happens in isolated worktrees. No implementation until operator approves the picked architecture at P3.

**Owner:** delta / claude-7361b856 (DESKTOP-N7MI1VB)
**Branch:** cad-fusion-live-ms0 (planning here, implementation in `work/skill-recall-ms0` worktree)
**Started:** 2026-05-12

---

## P0 — Brief

### Problem

The Claude Code harness injects the **full slash-command manifest** (~400 entries × ~20 tokens each ≈ 8K tokens) into every prompt's system context. Cannot be turned off via `settings.json` (HS-06 prior notes confirm). This is the largest single token tax in the PRISM session, repeated on every prompt — at 100 prompts per session, that's ~800K tokens of pure manifest. Compounding badly with multi-chat fleet.

### Acceptance criteria

- Active manifest reduced to **≤50 skills** without losing the operator's ability to invoke any of the other ~350 archived skills.
- Reduction is **reversible** (no destructive deletes — `mv` only into a separate folder the harness doesn't scan).
- Discoverability preserved: when operator's prompt mentions a domain or capability covered by an archived skill, that skill is **surfaced as context** (not silently invisible).
- No regression in daily-use workflows.
- Works on Windows (no `chmod`, no fancy permissions, no symlinks unless we verify they survive Git operations).

---

## P1 — Existing recall infrastructure (Discover)

PRISM already has substantial semantic-recall machinery that we can extend rather than build from scratch:

| Component | Where | What it does today | Reusable for HS-06? |
|-----------|-------|--------------------|--------------------|
| Wiki entries | `knowledge/wiki/architecture/` — 23,585 total, **639 are skill entries** | Markdown per artifact with frontmatter description | YES — already documents every skill |
| Semantic embeddings | `knowledge/wiki/architecture/_embeddings.jsonl` — 14,343 vectors (nomic-embed-text, 768-d, int8-quantized) | Cosine search fallback for paraphrase queries | YES — subset is skill rows |
| BM25 leaf index | `knowledge/wiki/architecture/_leaf-index.jsonl` | Fast lexical match on wiki entry titles + keywords | YES — covers exact-word lookups |
| `wiki-precheck-inject.mjs` | `.claude/hooks/`, UserPromptSubmit | On every prompt, runs BM25 over leaf-index + cosine fallback, injects top-3 relevant entries as `additionalContext` | YES — extend its filter to surface archived skills |
| `wiki-recall-on-read.mjs` | `.claude/hooks/`, PostToolUse:Read | When you open a documented source file, injects wiki summary | NOT directly relevant — but proves the pattern works |
| `obsidian-cache.mjs` | `.claude/hooks/bundles/lib/` | Caches advisory hook results so identical inputs don't re-run | NOT directly relevant — but proves caching is wired |
| `file-read-cache.mjs` | `.claude/hooks/`, PreToolUse:Read | Hard-deny re-reads of unchanged files | NOT directly relevant |
| `_orphans-rescue.md` | `knowledge/wiki/architecture/` | Hub linking every orphan so effective orphan rate ≈0 | YES — pattern we can mirror for archived-skills directory |

### Key facts

1. The harness injects the manifest **at session-start AND on each prompt**, before any hook fires. To reduce the manifest, files must not be in `.claude/commands/` (the path the harness scans).
2. Hooks fire via `additionalContext` on UserPromptSubmit — that's how `wiki-precheck-inject` currently surfaces wiki entries. **We can use the same channel to surface archived-skill descriptions.**
3. Slash-command resolution `/<name>` happens at the harness layer, not the hook layer. If a skill isn't in `.claude/commands/`, typing `/<name>` fails with "unknown command" — no hook can intercept that. Reactive intercept is **only possible** if we read the user's RAW prompt text on UserPromptSubmit (before the harness parses slash commands) — verify this is feasible before designing on it.

---

## P2 — Architecture alternatives (Brainstorm — diverge before converging)

### Option A — Dumb archive
- **Mechanism:** `mv` ~350 skill files to `.claude/commands-archive/`. Harness manifest shrinks.
- **Token win:** ~80% on the manifest.
- **Discoverability:** None. Operator must remember which are archived. To use one: manual `mv` back.
- **Build cost:** 5 minutes.
- **Reversibility:** High (`mv` back).
- **Failure modes:** Operator wastes time hunting for archived skills.

### Option B — Archive + proactive recall hook
- **Mechanism:** A like above. PLUS new hook `archived-skill-suggest.mjs` on UserPromptSubmit. Reuses `wiki-precheck-inject`'s BM25+cosine machinery, filtered to skill-type wiki entries that map to files in `commands-archive/`. On match above threshold, injects `→ archived skill /name may be relevant (sim 0.82). To activate: mv .claude/commands-archive/name.md .claude/commands/`.
- **Token win:** ~80% on baseline manifest, +~100-200 tokens added back when a recall actually matches.
- **Discoverability:** High — wiki similarity will surface archived skills the operator was about to need.
- **Build cost:** 1-2 hr (one new hook, mostly reusing existing search code).
- **Reversibility:** High.
- **Failure modes:** Wiki entries for skills must be accurate. False-positive matches add noise.

### Option C — Archive + proactive recall + reactive slash intercept
- **Mechanism:** B + UserPromptSubmit hook scans prompt text for `/<name>` patterns. If pattern matches a file in `commands-archive/` but not in `commands/`, hook auto-`mv`s it back to active + tells operator "auto-restored /<name>, please re-invoke."
- **Token win:** Same as B baseline.
- **Discoverability:** Complete — every archived skill is accessible by exact name with one-prompt delay.
- **Build cost:** 2-3 hr (B + new intercept hook + safety for `mv` race).
- **Reversibility:** High but `mv` is filesystem state.
- **Failure modes:** False-positive on `/path/file` patterns. Race with concurrent prompts.

### Option D — Session-topic-aware skill curation (NEW — user's instinct, refined)
- **Mechanism:** All skills live in `.claude/commands-store/` (NOT scanned by harness). A SessionStart hook (`skill-curator.mjs`) populates `.claude/commands/` by:
  1. Reading the session's `topic` from the slot binding (e.g. `harness-stab`, `lathe-pro-v3-ms2`, etc.).
  2. Loading a topic-to-skill-set mapping from `.claude/skill-curation-map.json` (we'd build this).
  3. Copying only the curated subset for this topic into `commands/`.
  4. Plus always-essentials (~28 daily-use skills): handoff, scrutinize, dedup, etc.
- **Discoverability fallback:** B's proactive recall hook for cross-topic skills.
- **Token win:** ~85-90% — each session sees ~50 active skills curated for its topic.
- **Build cost:** 3-4 hr (curator hook + curation map + B's recall hook).
- **Reversibility:** High — recurate by editing the map.
- **Failure modes:** Stale curation map if domain shifts. New skills aren't auto-added to any topic until the map updates.

### Option E — Hot/cold tier with copy-on-curate (variant of D)
- **Mechanism:** Like D, but instead of a static topic-to-skill map, the curator runs continuous `wiki-precheck-inject`-style matching against the session's **recent prompt history** (last N prompts in transcript). Skills semantically relevant to recent topics auto-promote to `commands/`; skills not used in N prompts auto-demote back to `commands-store/`.
- **Discoverability:** Highest — skills appear/disappear based on actual demand.
- **Build cost:** 4-6 hr (most complex; need transcript-tail reader + hot/cold mover + race-safe atomic mv).
- **Reversibility:** Auto-converges back to baseline if disabled.
- **Failure modes:** Thrash if topics shift rapidly within one session. File-system churn (every prompt could move files).

### Option F — Hybrid: dumb archive NOW + smart-recall LATER (staged delivery)
- **Mechanism:** Phase 1 = Option A (5 min, immediate ~80% win on the obvious archive candidates — bucket E claude-flow namespaced). Phase 2 = Option B or D as a follow-up unit with proper scrutiny.
- **Token win:** ~20% immediate (bucket E only), expanding to ~80% after Phase 2.
- **Build cost:** Phase 1 = 5 min. Phase 2 = 1-4 hr depending on which (B/C/D/E) wins.
- **Reversibility:** Highest of all.
- **Failure modes:** Phase 2 never lands (becomes deferred-forever). Mitigate with explicit P6 task carrying acceptance gate.

---

## P3 — Scoring + recommended winner (PENDING operator approval)

| Option | Token win | Discoverability | Build cost | Reversibility | Win-cost ratio | Notes |
|--------|-----------|-----------------|------------|---------------|----------------|-------|
| A | 80% | 0% | 5 min | High | best raw ratio | Loses discoverability completely |
| B | 80% | ~70% (fuzzy) | 1-2 hr | High | very good | Best balance of effort vs value |
| C | 80% | ~95% | 2-3 hr | High | good | B+intercept; verify UserPromptSubmit sees /<name> |
| D | 85-90% | ~95% (curated + B) | 3-4 hr | High | excellent if topic-stable | User's instinct, refined |
| E | 90% | ~99% | 4-6 hr | High | excellent but high build cost | Most elegant; highest risk of thrash |
| **F** | 20% now, 80%+ later | progressive | 5 min + later | Highest | **best risk-managed** | **Recommended.** Phase 1 unblocks immediately, Phase 2 picks B/C/D after Phase 1 telemetry. |

### Recommendation: **Option F** (staged delivery)

**Phase 1 (this session, 5-15 min):** Archive the obvious-no-loss bucket E (claude-flow namespaced: sparc:*, github:*, automation:*, monitoring:*, optimization:*, hooks:*, analysis:* — ~83 skills). These are general claude-flow swarm utilities, never used in PRISM daily flow. **Zero discoverability loss** because we've never used them. Net: ~20% token-tax reduction. Reversible by `mv` back.

**Phase 2 (next session, 2-4 hr):** Build B or D based on Phase 1 telemetry (how often did the operator wish for an archived skill?). Promote bucket E to confirmed-archive + add recall hook. Then aggressive-archive buckets C/D/F/G/H.

### Why F over D-now:

- D's curation map needs real session-topic data to build correctly. After Phase 1, we have a session's worth of telemetry showing what skills the operator actually used. The map informed by that data will be far better than a guessed one.
- D's build cost (3-4 hr) is too much for a "we'll find out if it works" deployment. Phase 1 is risk-free and informs the Phase-2 design.
- Forge-7 Boris-loop discipline: don't build the complex thing first. Build the simple thing, measure, then build the complex thing with measurements in hand.

### Why not just A:

A is what Phase 1 of F is, structurally. The difference is F **commits** to Phase 2 via a tracked task + handoff-resume directive — A doesn't.

---

## P4 — Implementation plan (executes after operator approves P3)

### Phase 1 (immediate)

1. Create `.claude/commands-archive/` directory.
2. Move bucket E namespaced subfolders: `mv .claude/commands/{sparc,github,automation,monitoring,optimization,hooks,analysis} .claude/commands-archive/`.
3. Verify harness manifest count drops (compare SessionStart skills list before/after).
4. Commit as `[MAIN] [HARNESS-STAB]/U-HS-06-PHASE-1: archive bucket E claude-flow namespaced skills (~83)`.
5. Update handoff RESUME to point at Phase 2.

### Phase 2 (follow-up unit, separate session)

1. Fork worktree: `git worktree add ../prism-skill-recall -b work/skill-recall-ms0`.
2. Implement `archived-skill-suggest.mjs` hook in worktree (per-file scrutiny gate after).
3. Wire into UserPromptSubmit settings.json.
4. Test: archive 1 obscure skill, prompt for its function, confirm recall fires.
5. Bulk-archive buckets C/D/F/G/H per the framework.
6. Merge worktree back via reverse-merge pattern (per [[reference_reverse_merge_then_ff_only]]).

---

## P5 — Verification (Boris-loop hard gate)

**Phase 1 verification:**
- [ ] `find .claude/commands -name '*.md' | wc -l` is reduced by ~83.
- [ ] `find .claude/commands-archive -name '*.md' | wc -l` is ~83.
- [ ] No daily-use workflow regression (run `/handoff`, `/scrutinize`, `/dedup`, `/forge` — all still resolve).
- [ ] Peer-Claude reviewer agent confirms commit matches Phase 1 spec.

**Phase 2 verification:**
- [ ] Archive 1 test skill (`/test-archive-recall`). Confirm `/test-archive-recall` typed in prompt gets recall-suggestion injection.
- [ ] Type a prompt matching skill description (no `/` prefix). Confirm injection still fires.
- [ ] Type unrelated prompt. Confirm no false-positive injection.
- [ ] Token count of manifest is measurably lower (use the harness's session-start system-prompt size as proxy).

---

## P6 — Ship + handoff

1. Phase 1 commit + push.
2. Update `MEMORY.md` with `feedback_smart_skill_archive.md` describing the architecture.
3. HANDOFF directive for Phase 2: brief, link to this plan, target worktree name.
4. Schedule Phase 2 via `/loop` or `/schedule` if calendar-driven (per forge-7).

---

## Cross-references

- HS-14/15 commit `65bdddcd2` (prior HS-day-0 work)
- `state/shared/GIT-TREE-DECISIONS.md` (companion decision ledger)
- `knowledge/wiki/architecture/_stats.md` (wiki count source of truth)
- `WIKI_SCHEMA.md` (wiki layer protocol)
- `feedback_never_delete_only_disable.md` (reversibility rule)
- Peer-Claude reviewer agent type: `reviewer` (Boris-loop arm B)

---

## Open questions for operator

1. **Approve Option F (staged delivery)** as the architecture, or push back further?
2. **Phase 1 scope** — confirm bucket E (claude-flow namespaced) is the right initial archive target, or expand to include obvious bucket-D (WEDM variants)?
3. **Phase 2 timing** — same session as Phase 1, or follow-up session?
4. **Phase 2 picker** — start with B (proactive recall only) or D (topic curation + recall)? My recommendation: B first, escalate to D only if telemetry shows B isn't enough.
