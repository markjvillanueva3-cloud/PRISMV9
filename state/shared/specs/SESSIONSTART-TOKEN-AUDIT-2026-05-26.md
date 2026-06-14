# SessionStart Token-Bloat Audit — 2026-05-26 (slot:golf)

**Trigger:** Operator directive "hunt what is causing massive token usage right at session startup, assess and optimize for better efficiency"

**Symptom observed this session:** `cache_read=19.34M` after a few turns; token-awareness state at `ctx=44% YELLOW`.

## Methodology

1. Sized every canonical surface that the harness OR a SessionStart hook auto-loads.
2. Probed all 32 SessionStart hooks (probe at `.claude/scratch/measure-sessionstart-token-cost.mjs`); Win32 spawn latency × ESM imports made the spawn-probe inconclusive (32/32 timed out at 8 s) — so the assessment below is based on emitted blocks visible in THIS session's SessionStart context dump (ground truth) plus disk-size of each underlying source file.
3. Cross-referenced against the documented inject-mode knobs in `H:/.claude/settings.json` env block.

## Sized inventory (auto-loaded by harness + hooks at SessionStart)

| Surface | Bytes | ~Tokens (÷4) | Loaded by |
|---|---:|---:|---|
| `H:/prism/CLAUDE.md` (project) | 73,987 | 18,500 | harness `claudeMd` block |
| `H:/prism/knowledge/memories/_index/MEMORY.md` (Obsidian index — separate from harness MEMORY.md) | 62,068 | 15,500 | NOT auto-loaded — referenced |
| `H:/prism/state/shared/BUILD_STATE.md` | 27,140 | 6,800 | `build-state-inject.mjs` (digest, NOT full file) |
| `C:/Users/wompu/.claude/CLAUDE.md` (user) | 19,744 | 4,940 | harness `claudeMd` block |
| `H:/prism/state/shared/CLAUDE-BRIEF.md` | 15,520 | 3,900 | `claude-brief-inject.mjs` (full mode) |
| `C:/.../memory/MEMORY.md` (harness auto-memory) | 24,382 | 6,100 | harness auto-load — AT 24,576 B ceiling |
| `H:/prism/state/shared/AWARENESS-SNAPSHOT.md` | 4,235 | 1,000 | `awareness-snapshot-inject.mjs` |
| `H:/prism/PRISM-INVENTORY-LATEST.md` | 2,870 | 700 | reference only |
| `C:/Users/wompu/.claude/RTK.md` | 993 | 250 | harness `claudeMd` block |
| **Skill registry** (≈900 skills × ~70 char avg) | ~63,000 | ~15,000 | harness skill-discovery |
| **Superpowers `using-superpowers` skill (mandatory inject)** | ~4,500 | 1,125 | harness skill auto-fire |
| **MCP server instructions (Figma + Linear)** | ~3,500 | 875 | MCP server bootstrap |
| Per-prompt hook injects (Σ of ~18 small banners) | ~13,000 | 3,250 | various UserPromptSubmit hooks |
| **Estimated TOTAL SessionStart baseline** | **~314,000** | **~78,000** | |

The 5-min Anthropic cache then re-hits this baseline every turn within the cache window — `cache_read=19.34M / ~50K-per-cache-hit = ~387 cache hits` so far this session, plausible for a multi-hour /loop run.

## Ranked optimizations

### Already-shipped this loop (env knobs in C:/Users/wompu/.claude/settings.json)
- `PRISM_BRIEF_INJECT_MODE=headline` — drops `claude-brief-inject` from ~4 KB to ~800 B → **~800 tokens/turn**
- `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` — kills skill-auto-trigger nudges (take-rate 0.2%) → **~75 tokens/turn**
- `PRISM_PSN_CHECKLIST_INJECT_DISABLE=1` — PSN-checklist doctrine ~400 B per prompt → **~100 tokens/turn**
- `PRISM_AI_MEMO_INJECT=0` — AI memo coverage banner, 0 actionable → **~50 tokens/turn**
- `PRISM_GOAL_SYNERGY_INJECT=0` — goal-synergy 3-leg yellow banner → **~75 tokens/turn**
- `PRISM_KNOWLEDGE_LINK_AUDIT_INJECT=0` — wiki-link audit banner, 4,136 broken yawned at each turn → **~75 tokens/turn**
- `PRISM_NN_GRAPH_INJECT=0` — NN-graph dormant banner, will stay dormant until pool seed → **~50 tokens/turn**
- `PRISM_SUBSTRATE_HEALTH_INJECT=0` — substrate health banner, advisory → **~50 tokens/turn**

**Subtotal shipped: ~1,275 tokens/turn × ~387 cache hits = ~500K tokens already-saved for the remainder of this session.**

### Tier-1 follow-up (high ROI, structural — separate units)
1. **`CLAUDE.md` project trim** — currently 74 KB, doctrine literally says "past ~200 lines total, CLAUDE.md compliance collapses". Most milestone summaries in `## Recent regressions` + every `## <SCOPE>` section can be moved to a wiki entry and replaced by a one-line pointer.
   - **Potential save: ~50 KB → ~12,500 tokens/turn**
   - **Risk: low** — every section already cites the wiki entry it could collapse to.

2. **Skill registry dedupe** — 26 NATO `checkin-<slot>` + 26 `precompact-<slot>` + 26 `startup-<slot>` + 26 `handoff-<slot>` = 104 NATO wrappers; collapse to one template entry each. Plus archive ~150 skills that haven't fired in 90 days.
   - **Potential save: ~50 KB → ~12,500 tokens/turn**
   - **Risk: medium** — wrapper skills must still be invokable by name; needs harness-side discovery change OR rename to `*-<slot>.md.archived` while keeping the template.

3. **MEMORY.md compress to ≤120 chars/entry** — currently the harness MEMORY.md is at the 24,576 B ceiling (99.2% full). Entries average ~180 chars; trimming to ≤120 chars/entry would buy ~30% headroom.
   - **Potential save: ~7 KB → ~1,750 tokens/turn**
   - **Risk: low** — entries are pointers anyway.

4. **`BUILD_STATE` injector digest size cap** — currently emits a multi-section block with envelope drift + top-unwired + frontends. Move details to the `BUILD_STATE.md` file behind a "see BUILD_STATE.md for detail" pointer; emit only counters at SessionStart.
   - **Potential save: ~2 KB → ~500 tokens/turn**
   - **Risk: low** — operators can still `Read state/shared/BUILD_STATE.md` on demand.

### Tier-2 (worth doing but lower ROI)
5. `/loop awareness` lists every fleet loop (116 at this session start) — keep this session's loop + count + top-3 newest, hide the rest behind a `--verbose` flag.
6. `slot-soul-inject` re-injects the same 2 KB block every prompt; cache the slot-soul hash and re-inject only when it changes (or once per `/compact` boundary).
7. `awareness-snapshot-inject` emits ~1.5 KB; the AWARENESS-SNAPSHOT.md regenerates ≤ daily, so cache the inject and only re-emit when the snapshot file mtime changes.

## Verification

After this commit lands and a `/compact` resets the session, the next SessionStart should show:
- No `## 🧭 PRISM CLAUDE-BRIEF — auto-generated system context on disk` block beyond the 800 B headline (or no block at all in `silent` mode).
- No `## ⚙ /goal synergy health` banner.
- No `## 🤖 PRISM-AI engine memo coverage` banner.
- No `## 🔗 Wiki↔Memory link integrity` banner.
- No `## 🧠 NN-GRAPH (GraphSAGE tier-5) health` banner.
- No `## 🧪 Substrate health` banner.
- No `## 🎯 PSN-CHECKLIST` block.
- No `🔔 Skill auto-trigger` block.

If any of the above STILL appear after `/compact`, the corresponding inject-disable knob is being ignored — file a follow-up for the offending hook to honor its documented knob.

## Related

- `feedback_settings_wiring_drift_2026_05_16.md` — settings.json wiring silently reverts in multi-chat fleets; commit FAST after edits.
- `feedback_token_budget_advisory_not_optional.md` (R6 of the R5-R12 doctrine).
- `scripts/memory-size-watch.mjs` — existing watchdog for the harness MEMORY.md ceiling.
- `state/shared/specs/RESUME_AT_WORK.md` §8 — historical context on SessionStart-context-blowup.
