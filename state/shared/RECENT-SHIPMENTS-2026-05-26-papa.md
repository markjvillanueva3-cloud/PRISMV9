# RECENT-SHIPMENTS — 2026-05-26 (slot:papa)

> Inbox for golf-slot drain. Papa-slot work order: cross-slot synergy + drift/docs/CLAUDE.md/memory/wiki/tribal/master-index/system-viz optimization + audit-awareness substrate for sierra/alpha/bravo/golf benefit.

## SYSTEM-AUDIT-AWARENESS/U-AUDIT-REG + U-AUDIT-INJECT + U-AUDIT-CADENCE (slot:papa)

**Files (3 new, all ORPHAN until golf wires the inject hook):**

1. `scripts/build-audit-registry.mjs` — scans 36 audit-*.mjs scripts + state sidecars + 4 audit dirs (audit/, audit-findings/, audits/, flagship-deep-audits/) → emits `state/shared/AUDIT-REGISTRY.json` (one source of truth). First run: **184 audits / 11 fresh / 2 warn / 171 stale / 24 domains**. Atomic temp+rename write. Knobs: `PRISM_AUDIT_REG_STALE_HRS=48`, `PRISM_AUDIT_REG_OUTPUT=<path>`.
2. `.claude/hooks/audit-awareness-inject.mjs` — UserPromptSubmit T2 hook. Reads AUDIT-REGISTRY, matches prompt-keywords to domains (25 patterns: mill/lathe/wedm/cad/cam/post/hook/wiki/memory/...), surfaces top-K audits with staleness tag (`✓ fresh` ≤24h | `⚠ warn` ≤48h | `⛔ stale` >48h) + sidecar path + re-run hint. Silent on no-match. **Test cases 3/3 PASS** — relevant prompt emits ranked list; unrelated prompt silent; multi-domain aggregates correctly. Knobs: `PRISM_AUDIT_AWARENESS_{DISABLE,K (1-8, default 3),STALE_HRS,VERBOSE}`.
3. `.claude/hooks/stop-audit-registry-refresh.mjs` — Stop T3 hook. Detached fire-and-forget regens AUDIT-REGISTRY when sidecar mtime > 24h (default throttle). Hard-fail-safe: spawn errors are swallowed (Stop must never block). Knobs: `PRISM_AUDIT_REG_REFRESH_DISABLE=1`, `PRISM_AUDIT_REG_REFRESH_THROTTLE_MS=N`.

**Goal directives this closes:**
- _"scope system inefficiencies"_ → registry shows 171 stale audits across 24 domains; each can be re-run via the hint in the inject hook output
- _"audits utilized on a 2-day time frame"_ → 48h staleness gate baked in (registry threshold + inject hook tagging + Stop 24h auto-refresh)
- _"all other chats auto-remember we have audits of specific domains"_ → audit-awareness-inject fires per UserPromptSubmit in any slot, surfaces 1-3 most-relevant audits keyed to the prompt's domain tokens

**Wiring (golf-only — papa cannot edit settings.json mirrored guards):**

Add these 2 entries to `C:/Users/wompu/.claude/settings.json` (the `c-to-h-mirror` hook auto-replicates to H:):

```json
// UserPromptSubmit chain — insert after master-index-precheck-inject (T2 group):
{
  "matcher": "*",
  "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/audit-awareness-inject.mjs", "timeout": 4000 }]
}

// Stop chain — insert in the T3 advisory cluster between session-end-peer-share (idx ~6) and duplication-guard-stop (idx ~8):
{
  "matcher": "*",
  "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/stop-audit-registry-refresh.mjs", "timeout": 3000 }]
}
```

After wiring, verify with: `echo '{"prompt":"check hook wiring"}' | node H:/prism/.claude/hooks/audit-awareness-inject.mjs` → must emit `hookSpecificOutput.additionalContext` listing audit-hook-stack-cost + 2 sibling hook audits.

**CLAUDE.md addition (golf-only) — suggested section:**

> ## AUDIT-AWARENESS SUBSTRATE (2026-05-26, papa)
> Every chat sees "relevant audits for THIS prompt's domain" auto-injected per UserPromptSubmit via `audit-awareness-inject.mjs` (T2). Source: `state/shared/AUDIT-REGISTRY.json` (regen: `node scripts/build-audit-registry.mjs`; auto-refresh: `stop-audit-registry-refresh.mjs` 24h throttle). 184 audits / 24 domains tracked; **48h staleness gate** (any audit ≥48h surfaces with re-run hint). Knobs: `PRISM_AUDIT_AWARENESS_{DISABLE,K,VERBOSE}` · `PRISM_AUDIT_REG_REFRESH_{DISABLE,THROTTLE_MS}`. Wiki entry pending.

---



## PSN-SAVINGS-AGGREGATE/U-PSA-DETECTOR-CREDIT-FIX (slot:papa)

**File:** `scripts/lib/psn-savings-aggregate.mjs` · **Date:** 2026-05-26 · **Tests:** inline regression PASS (4 ledger-shapes × hit/miss/saved-token credited) · **Per-file scrutiny:** self-cross-check only (single-file change)

Closes the "0 hits credited" bug for 2 of 6 PSN telemetry ledgers — the aggregator's `summarizeJsonl` recognized 4 entry shapes (`kind:hit|miss|measured` + `nudge:true`) but the actual on-disk ledgers use 2 additional shapes that fell through silently:

- **prompt-rewrites** uses `{rewrite: string|null, raw, skip_reason}` → now: `rewrite:non-empty` = hit + est_tokens = (raw.length − rewrite.length) / 4; `rewrite:null` = miss
- **read-auto-limit-ledger** uses `{kind: 'nudge-emitted' | 'already-bounded'}` → now: `nudge-emitted` = hit, `already-bounded` = miss

**Impact on dashboard** (forced re-aggregation):
- totals.hits 678 → 936 (+258, +38%)
- totals.misses 0 (visible) → 4934 (4934 formerly-uncounted misses surfaced)
- totals.savedTokens 320.5k → 443k (+122k)
- `prompt-rewrites`: 1274 misses surfaced (100% Ollama-down — confirms the banner; not a detector fault)
- `read-auto-limit`: 24 hits + 1143 misses (was 0+0)
- `pre-tool-savings-multi`: 180 nudges (unchanged — nudges are advisories not hits)
- `injection-dedup-cache` + `rtk-savings-ledger` + `rtk-adoption-measure`: unchanged

**Suggested CLAUDE.md section update** (add to existing §OLLAMA OFFLOAD DASHBOARD or new §PSN SAVINGS DASHBOARD):

> **PSN-SAVINGS-AGGREGATE detector coverage (2026-05-26 papa):** the aggregator now recognizes all 6 ledger shapes (was 4) — prompt-rewrites `rewrite:string|null` + read-auto-limit `kind:nudge-emitted|already-bounded`. Untracked misses no longer hidden. Sample post-fix totals: 936 hits / 4934 misses / 443k saved-tokens. State: `state/shared/dashboards/psn-savings-aggregate.json`.

**Memory:** none yet — append to `feedback_*` or new `reference_psn_aggregator_shapes_2026_05_26.md` (golf decision).

---

## KNOWLEDGE-LINK-AUDIT/U-MEMORY-INDEX-3-FIXES (slot:papa)

**File:** `H:/prism/knowledge/memories/_index/MEMORY.md` · **Date:** 2026-05-26

Fixed 3 broken `[[name]]` tokens flagged in the link-audit banner top-3:

- L65: `[[audit-viz-first-skill]]` → `[[audit-viz-first]]` (the canonical skill node — `-skill` suffix was a typo)
- L89: `[[SKILLS-UTILIZATION-MS0]]` → `SKILLS-UTILIZATION-MS0 (milestone)` (milestone IDs aren't file names; descriptive context is correct)
- L95: `[[OCTOPUS-NEURAL-MS0]]` → `OCTOPUS-NEURAL-MS0 (milestone)` (same — milestone IDs are not vault-resolvable)

**Impact:** 4,136 broken / 97,673 wiki-style tokens → ≈ 4,133 broken (3 closed). Marginal but the audit top-3 are now resolved. Pattern: `[[MS-ID]]` is a vault-incompatible convention — wiki tokens must resolve to file basenames.

**Standing recommendation for golf:** add a knowledge-link-audit lint rule that flags `[[ANY-CAPS-MS0]]` / `[[*-MS\d+]]` tokens as **probable false-positive wiki refs**. These should be plain text (or pointers to a milestone-envelope file if one exists). Could be added to `scripts/knowledge-link-audit.mjs` as a heuristic + an emit-once-per-file lint suggestion.

---

## CLAUDE.md COMPRESSION RECOMMENDATION (golf drain item)

**Source:** `H:/prism/CLAUDE.md` measured at **72.0K / 432 lines** during this papa session (last compression 2026-05-20 took it 162K→67K / 414 lines — has crept back +5K / +18 lines in 6 days).

**Structural defects identified:**

1. **Lines 24-33 + 37-43 are 17 stray inline regression entries jammed *inside* §CANONICAL SOURCES OF TRUTH** (between the table rows for `RECENT-SHIPMENTS-<date>.md` and `feedback_psn_definition.md`). They appear to be auto-promote output that landed at the wrong anchor. They belong in §Recent regressions OR in this `RECENT-SHIPMENTS-2026-05-{23,24,25}.md` inbox per the doc's own convention. Net leak: ~3.4KB / 17 lines.

2. **§Recent regressions (line 396-412) is stale at 2026-05-18..20** — newer entries land at the top instead (the bug in #1). Doc says "Last 15; older entries in `state/shared/CLAUDE-REGRESSIONS-ARCHIVE.md`. Auto-managed by `scripts/compress-claude-md.mjs` (golf hygiene)." — but **`scripts/compress-claude-md.mjs` does not exist on disk** (was referenced but never shipped, or got deleted).

3. **§EXPERT ROLE has a `<!-- DUPLICATE-CANDIDATE 2026-05-17 OBSOLESCENCE-CLEANUP-MS0/U-OBS-C2 -->` marker that says "Collapse this body to pointer after 2026-05-24"** — today is 2026-05-26, past the deadline. Collapse-target: GLOBAL `C:/Users/wompu/.claude/CLAUDE.md`. Estimated save: ~5 lines / 800 bytes.

4. **§GOLF SLOT (line 158) repeats much of what's in GLOBAL CLAUDE.md §GOLF SLOT** — candidate for collapse-to-pointer.

5. **§SESSION CONTINUITY STACK (line 133) + §`/checkin-<nato> /loop` (large block)** are detail-dense and could each collapse to wiki pointers, saving 30-40 lines combined while losing zero functional load-bearing content (the wiki entries exist and are linked).

**Suggested golf-slot actions (claim via `/checkin-golf`):**

| Step | Action | Estimated save |
|------|--------|----------------|
| A | Remove lines 24-33 + 37-43 from §CANONICAL SOURCES; append them as ` - 2026-05-XX | ...` lines to §Recent regressions; truncate §Recent regressions to last 15 entries; archive older to `CLAUDE-REGRESSIONS-ARCHIVE.md` | ~17 lines / 3.4 KB |
| B | Collapse §EXPERT ROLE body to a 1-line pointer to GLOBAL `C:/Users/wompu/.claude/CLAUDE.md` §EXPERT ROLE (per the 2026-05-17 DUPLICATE-CANDIDATE marker — past its 2026-05-24 deadline) | ~5 lines / 800 B |
| C | Build `scripts/compress-claude-md.mjs` as a small idempotent tool that performs steps A+ archive-rotation deterministically (per the existing marker comment at line 397) | (new asset, ~150 LOC) |
| D | Audit §SESSION CONTINUITY STACK + §`/checkin-<nato> /loop` for collapse-to-pointer candidates (wiki entries already linked) | ~30-40 lines / 6-8 KB |

**Net target:** 432 lines → ≤200 lines (matches CLAUDE.md's own §R5-R12 preamble doctrine: "past ~200 lines total, CLAUDE.md compliance collapses").

---

## OPS-NOTES

- **regen-viz merge-augmentations exit-134 banner alert** is **stale**. Re-ran `merge-augmentations.mjs` from papa this session against the live 539MB system-graph.json → exit 0. The 1.1h-old crash signature was a transient memory-pressure event (likely GPU contention from the dead Ollama daemon — see banner `## ⚠ Ollama /api/chat is dead`). No regen-viz code change needed. **Suggested:** clear `state/shared/.system-viz-regen-status.json` failure flag if it exists, or let the next cron tick refresh it.

- **Envelope drift (CAMK-MS2 / CAMX-MS0.5/0.7/1)** was banner-flagged but `auto-close-shipped-envelopes.mjs --dry-run` queues 0 mutations (CLOSE-OUT-CANDIDATES.json has 0 entries meeting the 0.75 confidence floor — evidence is abstract-only, no file-presence). Either (a) re-run `audit-close-out-candidates.mjs` with `--min-confidence 0.5` to surface lower-confidence rows, or (b) flip these envelopes manually after human verification. **Not auto-flippable.**

- **NN-GRAPH AUROC 0.096** (banner) — tier-5 cascade is DORMANT, deferring to tiers 1-4. The U-NN-PREDICTOR-EMBED-WIRE follow-up (per PSN-LEG-STATE banner) is the right fix; out of scope for papa this session.
