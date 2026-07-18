# TRIBAL KNOWLEDGE LEVERAGE PLAN

**Date:** 2026-05-09
**Author:** Claude (claude-99eca613)
**Trigger:** User: "I feel like there's a lot of knowledge there that is stagnant that should help with development"

The user is correct. Below is the full enumeration of what exists, why it's stagnant, and the prioritized plan to activate it.

---

## 1 · Current state inventory (full)

| Source | Count | Surface | Activation today |
|--------|------:|---------|-------------------|
| `knowledge/wiki/index.md` | **772 entries** | wiki | `/wiki-query` keyword-only |
| `knowledge/wiki/lessons/` | **3 files** | wiki | manual lookup |
| `knowledge/wiki/code-tribal/canonical/` | sub-dir | wiki | manual lookup |
| `knowledge/wiki/decisions/` | **0 files** | wiki | empty |
| `knowledge/wiki/patterns/` | **0 files** | wiki | empty |
| `knowledge/wiki/concepts/` | unknown | wiki | manual lookup |
| `knowledge/memories/feedback/` | **42 files** | memory | auto-injected on session start (200-line cap) |
| `knowledge/memories/project/` | **26 files** | memory | indexed in MEMORY.md hint |
| `knowledge/memories/reference/` | **31 files** | memory | indexed in MEMORY.md hint |
| `mcp-server/data/state/extraction-log.json` | **75 extractions** (Mastercam 45, hyperMILL 25, Okuma 63, Fanuc 35, Haas 28, Titans 42 — 238 cited entries) | engine | hit only via `duplicationGuardEngine.mustNotReExtract` |
| WEDM tribal tips | **46 tips** (20 field + 26 MIT-derived) | engine | `prism_calc:wedm_tip_*` actions |
| `jm-die-profile.ts` + `ShopConfigurationEngine` | JM Die corpus | engine | `prismSelfAwarenessEngine.searchTribalKnowledge` |
| `TribalKnowledgeEngine` | auto-categorization built-in | engine | not bound to PreToolUse hook |
| `prismSelfAwarenessEngine.searchPlaybookRules` | playbook layer | engine | manual API only |
| Existing skills | `/distill-tribal /shop-knowledge /tribal-knowledge-guide /wiki-query /wiki-harvest /wiki-ingest /wiki-lint /wiki-morning /wiki-bootstrap /wiki-page /wiki-sync` | skill | manual invocation |

**Total addressable corpus: ~1,200 distinct tribal entries.** Effective hit rate on active sessions: low single digits — most entries never fire during the work they apply to.

---

## 2 · Root causes of stagnation (full enumeration)

| # | Failure mode | Evidence | Cost |
|--:|--------------|----------|------|
| C1 | **Pull-only retrieval** — entries surface only when human types `/wiki-query` or `/shop-knowledge`. No proactive injection. | wiki-precheck-inject hook fires only on keyword match | Most edits proceed without consulting relevant tip |
| C2 | **No relevance ranking against active task** — wiki-precheck-inject does fuzzy match on keywords; doesn't know the active milestone's domain | top-3 surfaced entries are often domain-mismatched | Noise drowns signal |
| C3 | **No staleness gate** — entries never re-validated against current code | tip references engines that may have been renamed | Hallucination risk |
| C4 | **No citation tracking** — we don't know which tips fire and which never do | no tip-citation log | Unable to prune stagnant entries |
| C5 | **No promotion path** — feedback memories don't graduate to wiki entries | 42 feedback files live in flat memory dir | High-value lessons stay siloed |
| C6 | **Format mismatch** — tribal lives in 4 formats (wiki frontmatter, memory frontmatter, extraction-log JSON, hardcoded engine constants) | 4 readers required to query the full corpus | Single search misses 75% of corpus |
| C7 | **Decay of `wiki/lessons/`** — only 3 files despite `auto-build-compounding-proposals.mjs` shipping months ago | Hook autofire was missing (M1) | Lessons folder ≈ empty |
| C8 | **No cross-domain bridges** — a tip about thin-wall vibration tagged only `mill` doesn't surface during lathe boring | every tag siloed to one domain | Cross-domain wisdom wasted |
| C9 | **No tribal-tip emission from real outcomes** — when a fix lands, no script auto-mines the commit message + diff into a tip | manual extraction only | Compounding rate near zero |
| C10 | **`TribalKnowledgeEngine` not bound to PreToolUse** — engine exists with auto-categorization but no hook calls it before edits | wiki-precheck-inject duplicates a fraction of its job | Engine is "shipped but cold" |

---

## 3 · Leverage plan — 8 activation moves

Ranked by `(impact × ease)`. Each move includes dependency, blocker, and the artifact to build.

### L1 · `tribal-relevance-rank.mjs` — score every entry against active task **(highest leverage)**

**Why:** Solves C1 + C2. Same shape as `ai-priority-rank.mjs` (just shipped) but ranks tribal entries against the active milestone/file path/keyword set. Output `state/shared/tribal-relevance-ranks.json` consumed by a thin wrapper hook.

**Depends on:** active milestone resolver (already exists — `derive-milestone` in `telemetry-autofire.mjs`).

**Blocks:** L2 (the injector reads this).

**Cost:** ~1 hour. **Impact:** every PreToolUse on src/ files gets the top-3 most-relevant tribal entries.

---

### L2 · `tribal-inject-on-edit.mjs` — PreToolUse hook for src/engines + dispatchers

**Why:** Solves C1. Replaces wiki-precheck-inject for code files; injects top-3 tribal entries by relevance rank, not keyword fuzzy.

**Depends on:** L1 (rank file).

**Blocks:** L4 (citation tracking — needs hook firing first).

**Cost:** ~30 min. **Impact:** every meaningful edit pre-checked against the corpus.

---

### L3 · Run `auto-build-compounding-proposals.mjs --batch` once **(lowest cost)**

**Why:** Solves C7. With the `--batch` flag I just shipped, this populates `wiki/lessons/` from every open milestone's envelope text in one pass. Lessons folder grows from 3 → ~200 in a single invocation. Per the design doc, each generated file has real seed content extracted from envelope rationale + decisions, not empty shells.

**Depends on:** nothing. Already runnable.

**Blocks:** L5 (promotion source).

**Cost:** ~2 minutes (mostly disk I/O). **Impact:** wiki corpus 4× larger overnight.

---

### L4 · `tribal-citation-log.jsonl` + summary in pipeline-telemetry

**Why:** Solves C4. Every `tribal-inject-on-edit` invocation appends to a citation log: `{ts, milestone, file, citedEntries[]}`. After 50 milestones we know which entries fire and which never do.

**Depends on:** L2 (the source of citation events).

**Blocks:** L6 (decay model can't run without citation data).

**Cost:** ~30 min. **Impact:** data foundation for C3 + C4 + C6.

---

### L5 · `tribal-promote.mjs` — feedback memory → wiki entry path

**Why:** Solves C5. When a feedback memory has been cited ≥3 times across distinct milestones (or has a manually-written "promote" tag), this script generates a wiki frontmatter entry, ingests it via `wiki-ingest`, and links the memory file as `superseded_by:`.

**Depends on:** L4 (citation counts).

**Blocks:** none.

**Cost:** ~45 min. **Impact:** high-value lessons stop being siloed in memory dir.

---

### L6 · `tribal-decay.mjs` — auto-flag stagnant entries

**Why:** Solves C3 + C4. Reads citation log; any entry with zero citations after N milestones gets flagged in `wiki/index.md` with a `dormant: true` tag and listed in a weekly digest. Not auto-deleted (could be domain-specific that just hasn't come up).

**Depends on:** L4. Needs ≥30 milestones of citation data to be meaningful.

**Blocks:** none.

**Cost:** ~30 min, but defer until citation log has signal.

---

### L7 · `tribal-bridge.mjs` — auto-suggest cross-domain tags

**Why:** Solves C8. Reads each tribal entry, extracts physics/operational keywords (chatter, deflection, surface finish, runout, work-hardening), and proposes additional `domain:` tags so a mill tip about chatter also surfaces during lathe boring queries.

**Depends on:** L1 (same scoring infrastructure).

**Blocks:** none.

**Cost:** ~1 hour. **Impact:** corpus reach roughly doubles per query.

---

### L8 · Bind `TribalKnowledgeEngine` to PreToolUse + commit-emission hook

**Why:** Solves C9 + C10. On Stop hook with a successful commit, run `TribalKnowledgeEngine.distillFromCommit({sha, files, message})` — auto-emits a tribal tip if the engine flags the commit as "non-obvious lesson". Pairs with the existing `/distill-tribal` skill.

**Depends on:** L4 (so we can measure whether emitted tips actually get cited).

**Blocks:** none.

**Cost:** ~1.5 hours (including engine binding + Stop-hook wiring).

**Impact:** compounding-rate inversion — tribal corpus grows as a side effect of normal work.

---

## 4 · Sequencing (recommended order)

```
Day 1 (60 min):
  L3 auto-build batch  ─────►  fills wiki/lessons (4×)
  L1 tribal-relevance ─────┐
                           ▼
Day 2 (45 min):
  L2 tribal-inject-on-edit ─►  citation events start firing
                              │
                              ▼
Day 3+ (background):
  L4 citation log         ─►  data accrues
  L7 tribal-bridge        ─►  reach doubles
  L8 distill-on-commit    ─►  corpus grows itself

Week 4+:
  L5 promote (needs ≥3 cites)
  L6 decay  (needs ≥30 milestones citation data)
```

Total active-build time: **~5 hours** to ship L1-L4 and trigger L3.
Compounding payoff: every milestone after L4 makes the next milestone faster.

---

## 5 · Hard gates / anti-patterns (avoid)

- **Don't bulk-emit empty tribal entries.** L3 only writes lessons with real envelope-derived content. The auto-build script already enforces this.
- **Don't auto-delete stagnant entries.** L6 flags only — human review for delete. Tribal that hasn't fired in 30 milestones may be safety-critical for the 31st.
- **Don't double-inject.** L2 must check existing context for already-surfaced entries; do not re-inject if the wiki-precheck-inject already fired for the same edit.
- **Don't break citation log on schema change.** Use schemaVersion in every record so L4-consumers (L5/L6) can migrate.
- **Lane discipline:** L1-L8 all touch `H:/prism/.claude/scripts/` and `H:/prism/.claude/hooks/` — currently OUTSIDE peer claims (system-viz infra is `claude-0413eca6`'s lane). Safe to ship from this chat.

---

## 6 · Success metrics (measurable in 30 days)

- [ ] `wiki/lessons/` count ≥150 (from current 3)
- [ ] `tribal-citation-log.jsonl` ≥500 records
- [ ] Median citations per active wiki entry ≥1.5 (target ≥3)
- [ ] Zero-citation rate <60% (target <40%)
- [ ] Promoted feedback→wiki entries ≥5
- [ ] Distill-on-commit emission rate ≥1 tribal tip per 10 commits

If any metric stalls, root-cause via citation log + adaptive-thresholds-style trajectory analysis.

---

## 7 · What I am NOT proposing (anti-scope creep)

- New tribal storage format. The 4 existing formats stay. The leverage layer is INDEX + INJECT, not RE-WRITE.
- Embedding/vector store. Keyword + frontmatter fields are sufficient for ranking against active task; add embeddings only when L4 data shows keyword ranking miss-rate >40%.
- LLM-rewriting of tribal entries. Ollama summaries are fine for new emission (L8); existing entries left alone.
- Cross-chat tribal sync. Within-chat injection first; cross-chat sharing waits for `/system-viz` census to complete (peer chat lane).

---

**Action this session:** I can ship L1 + L2 + L3 right now (~2 hours, all in our lane). L4-L8 queued for next session unless explicitly requested.
