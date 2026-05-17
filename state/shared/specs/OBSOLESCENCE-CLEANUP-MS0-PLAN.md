# OBSOLESCENCE-CLEANUP-MS0 — Forge v7 Plan (v2, post-peer-review)
**Created:** 2026-05-17 · **Revised:** 2026-05-17T00:50Z after peer-reviewer BLOCK
**Slot:** mike (13th, first live use)
**Author:** claude-416be9ac
**Folds:** T5, T7, T8, T9 from active TaskList
**Doctrine:** `/forge7` per `state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md`

---

## Change log from v1

Peer reviewer (worktree-isolated `reviewer` agent) returned **BLOCK** on v1 with 5 fixes. All addressed:

| # | v1 issue | v2 resolution |
|---|---|---|
| 1 | Proposed building 3 NEW META tools (`audit-claude-md-refs.mjs`, `audit-skill-refs.mjs`, `extract-claude-md-sections.mjs`) that already exist as `claude-md-drift.mjs`/`skill-lint.mjs`/`regen-claude-md-sections.mjs` | C/D/E units REDIRECTED to existing tools. NEW META waiver: redundancy-removal IS the compounding-gains contribution. |
| 2 | 3 of 4 prior-audit CRITs (F2 engine-digest stale, F3 envelope drift, F4 classifier) unaddressed | F4 was shipped in AUTO-INVOCATION-MS0 ITER 5. F2 + F3 added as new units U-OBS-F1, U-OBS-F2. |
| 3 | B-phase order inverted — watchdog (B3) should land FIRST so next regression is durably caught | Reordered: B3 → B1 → B2. |
| 4 | Every C/D verification baseline marked "TBD" — unfalsifiable | Real baselines captured via pre-execution runs: CLAUDE.md drift=11 findings; skill-lint=BROKEN (tsx missing); tip-auto-* in tribal-embed-index=0. |
| 5 | Synergy ratio target ≥21.1% non-decrease never proven against script behavior | Acknowledged as advisory-only target; script's `components` field is empty so dedup-positivity cannot be proven a priori. Treating synergy as monitor-only, not gate. |

**Bonus finding from baseline capture:** `skill-lint.mjs` is broken (`Cannot find package 'tsx'`). Added as U-OBS-FIX1. Without this fix, Phase E units E1/E2/E3 can't run.

**Bonus finding from baseline capture:** tip-auto-* count in tribal-embed-index.json = **0**. The noise we observed (`tip-auto-5033`, `tip-auto-5081`, `tip-auto-5220`, `tip-auto-5251`, `tip-auto-5311`) was coming from `knowledge/tribal/auto-ingested-tips-*.md` files surfaced by `wiki-precheck-inject` — NOT from the tribal-embed-index. U-OBS-A4 retargeted to those files.

---

## Scope statement (unchanged from v1)

> Audit and clean every written/cached reference in PRISM (session artifacts, memory namespace, CLAUDE.md project + global, hook chain, /checkin /loop /goal skill bodies) against the current built reality, and ensure Obsidian PRISM OS + /system-viz are utilized at every injection seam where they would outperform static content.

---

## Captured baselines (pre-execution)

```yaml
synergy_ratio:                0.211  # from system-synergy-map.mjs (components empty — monitor only)
claude_md_drift_findings:     11     # from claude-md-drift.mjs --json
skill_lint_status:            BROKEN # missing tsx package; can't audit until U-OBS-FIX1 lands
tribal_embed_tip_auto_pct:    0      # tribal-embed-index.json contains ZERO tip-auto-*
wiki_tribal_tip_auto_count:   326    # files under knowledge/tribal/auto-ingested-tips-*.md (A4 target)
memory_md_bytes:              24688  # 100.5% of 24576-byte ceiling, status=critical
ollama_offload_ratio:         0.196
envelope_drift_count:         11
engine_digest_age_hours:      72.5
directory_digest_age_hours:   103.1  # captured 2026-05-17; F3 target
wiki_index_age_hours:         32.7
orphans_post_F4:              12129  # F4 classifier fix surfaced these (pre-fix incorrectly reported 0)
ghosts_post_F4:               823    # F4 classifier fix corrected this (pre-fix incorrectly reported 281683)
regen_sections_check_dup_flag: MISSING  # script doesn't have --check-dup; C2 must use a different tool or visual diff
```

---

## Phases + Units

### PHASE FIX — Unblocking repairs (NEW v2, must land before C/E)

#### U-OBS-FIX1: Repair `skill-lint.mjs`
**Bug:** `Cannot find package 'tsx'` on import; was working pre-some-recent-dep-change.
**Action:** Either install `tsx` as a devDependency OR refactor skill-lint to use `node:test` + plain JS instead. Prefer the refactor (no new dep).
**Verification:**
```yaml
tool: "node H:/prism/scripts/skill-lint.mjs --json | jq '.findings | length'"
expected_signal: "returns a number (any value) — proves script runs to completion"
re_run_cost: "10s"
baseline: { status: "BROKEN — ERR_MODULE_NOT_FOUND tsx" }
```

---

### PHASE A — Session artifact remediation (T7)

#### U-OBS-A1: DELETE `scripts/audit-auto-injectors.mjs`
**Why obsolete:** `prism_hook` dispatcher has 17 actions including `coverage`, `gaps`, `performance`, `failures`, `hook_efficiency_roi`, `hook_coverage_analyze`, `hook_telemetry_metrics`. The new script is a name-pattern flag (10% subset) of dispatcher's telemetry-backed ROI.
**Action:** delete file; grep for any caller; redirect to `prism_hook` actions
**Verification:**
```yaml
tool: "test ! -f H:/prism/scripts/audit-auto-injectors.mjs"
expected_signal: "exit 0 (file absent)"
re_run_cost: "5ms"
baseline: { exists: true, size_kb: 6 }
```

#### U-OBS-A2: REFACTOR `scripts/node-staleness-rank.mjs`
**Why partial dupe:** `MasterIndexEngine.classifyAllNodes()` + `orphan-inventory.mjs` + `refresh-orphan-report.mjs` cover the orphan/classify surface.
**Action:**
1. Drop `wikiCoverage()` + `utilizationClassificationHealth()` (delegate to dispatcher)
2. Keep `scanSurfaces()`, `memoryHealth()`, `ollamaOffloadHealth()`, `envelopeDrift()`, `gitUncommitted()`, `injectionAudit()` — unique to this tool
3. Update tool docstring to point to `prism_session:master_index_query` for classification needs
**Verification:**
```yaml
tool: "node scripts/node-staleness-rank.mjs --json | jq 'has(\"utilization\") | not'"
expected_signal: "true (utilization key removed)"
re_run_cost: "100ms"
baseline: { utilization_key_present: true }
```

#### U-OBS-A3: REFACTOR `.claude/helpers/meta-task-suppressor.mjs`
**Why partial dupe:** `contextPriorityEngine.classifyTask(prompt)`, `TaskAgentClassifier.classifyTask`, `ai_classify_task` action all exist.
**Action:**
1. Keep binary `{suppress, reason, ...}` contract — consumer interface
2. Add `--via-engine` path that calls `contextPriorityEngine.classifyTask` first; fall back to keyword buckets if MCP unreachable (hooks fire before MCP boot in some scenarios)
3. Add 2 new test cases for the engine-backed path
**Verification:**
```yaml
tool: "node --test H:/prism/.claude/helpers/meta-task-suppressor.test.mjs"
expected_signal: "pass count >= 18 (was 16; +2 new for engine path)"
re_run_cost: "200ms"
baseline: { tests_passing: 16 }
```

#### U-OBS-A4: ROOT-CAUSE FIX `tip-auto-*` in `knowledge/tribal/auto-ingested-tips-*.md`
**Retarget from v1:** noise is in `knowledge/tribal/auto-ingested-tips-*.md` (surfaced via `wiki-precheck-inject`), NOT `tribal-embed-index.json`.
**Baseline:** **326 files** under that glob (captured 2026-05-17). Non-trivial cleanup; may need batched approach.
**Action:**
1. Identify the ingestor that created the 326 files (grep for `auto-ingested-tips` in scripts/, mcp-server/scripts/)
2. Sample-review 5-10 files to determine whether ALL are noise (template-grade) or only a subset
3. If all noise: move directory to `knowledge/tribal/auto-ingested-quarantine/` so wiki-precheck-inject's BM25 over `knowledge/tribal/**` excludes them
4. If mixed quality: add a `quality` frontmatter field and gate wiki-precheck to require `quality >= curated`
5. Either way: gate the upstream ingestor behind a quality threshold so future runs don't re-introduce the noise
**Verification:**
```yaml
tool: "find H:/prism/knowledge/tribal -maxdepth 1 -name 'auto-ingested-tips-*.md' | wc -l"
expected_signal: "0 OR moved to quarantine subdir (verify wiki-precheck excludes)"
re_run_cost: "20ms"
baseline: { count: 326 }
```

---

### PHASE B — Memory namespace refresh (T8) — REORDERED v2

#### U-OBS-B1 (was B3): Wire `memory-size-watch.mjs` into durable cadence FIRST
**Why first:** without watchdog, next regression silently grows past ceiling again (the F1 root cause).
**Action:** Add advisory Stop hook `stop-memory-size-watchdog.mjs` (similar to `stop-cross-tree-collision-advisory.mjs` pattern, 45s stamp-throttle).
**Verification:**
```yaml
tool: "grep -c 'memory-size-watch' C:/Users/wompu/.claude/settings.json H:/prism/.claude/settings.json"
expected_signal: ">= 1 reference in either file"
re_run_cost: "20ms"
baseline: { refs_count: 0 }
```

#### U-OBS-B2 (was B1): Re-compress MEMORY.md to ≤22 KB
**Action:** U-MEMORY-COMPRESS protocol — pointers-only, ≤200 chars/entry.
**Verification:**
```yaml
tool: "node H:/prism/scripts/memory-size-watch.mjs --json | jq '.bytes, .status'"
expected_signal: "bytes < 22000 AND status == 'fresh'"
re_run_cost: "50ms"
baseline: { bytes: 24688, status: "critical" }
```

#### U-OBS-B3 (was B2): Scan ~150 memory files for obsolete refs
**Scope clarification (v2 minor fix):** memory namespace ONLY (`C:/Users/wompu/.claude/projects/H--prism/memory/*.md`, ~150 files). The 504 handoff files in `state/shared/handoffs/` are EXPLICITLY OUT-OF-SCOPE for this unit (deferred to follow-up MEMORY-AUDIT-WEEKLY /loop). Reason: handoffs are append-only chronological context; stale refs there are historical record, not load-bearing doctrine.
**Action:** Walk each `*.md` in memory namespace. For each `*Engine`/`*Dispatcher`/`*.mjs`/`prism_*:action_name`/`/skill-name`, verify via `prism_session:master_index_query`. Emit `state/shared/specs/MEMORY-OBSOLETE-REFS-2026-05-17.md`. Advisory only — operator triages.
**Verification:**
```yaml
tool: "test -f H:/prism/state/shared/specs/MEMORY-OBSOLETE-REFS-2026-05-17.md && jq '.scanned, .obsolete_count' H:/prism/state/shared/specs/MEMORY-OBSOLETE-REFS-2026-05-17.json"
expected_signal: "scanned >= 100 (proves walk completed)"
re_run_cost: "60s one-shot"
baseline: { scan_exists: false }
```

---

### PHASE C — CLAUDE.md optimization (T9 part 1) — REDIRECTED v2

#### U-OBS-C1: Run `claude-md-drift.mjs` → triage 11 findings → fix or defer
**Tool:** USE `scripts/claude-md-drift.mjs` (already exists, 18.7 KB, works). NOT building a new tool.
**Action:**
1. Run drift detector, get findings list
2. Triage each: P0 fix-now, P1 propose-edit, P2 defer/document
3. Edit CLAUDE.md (project + global as needed)
4. Re-run drift detector; gate on findings reduced
**Verification:**
```yaml
tool: "node H:/prism/scripts/claude-md-drift.mjs --json | jq '.findings | length'"
expected_signal: "<= 3 (down from 11 baseline)"
re_run_cost: "5s"
baseline: { findings: 11 }
```

#### U-OBS-C2: Collapse duplicated prose between project + global CLAUDE.md
**Tool retarget:** baseline capture revealed `regen-claude-md-sections.mjs` does NOT have `--check-dup` (it regenerates section pointers). Use manual diff approach.
**Action:**
1. Run `node scripts/regen-claude-md-sections.mjs` first (idempotent regen of section pointers)
2. Diff section HEADINGS between project + global CLAUDE.md: `grep '^## ' H:/prism/CLAUDE.md > /tmp/p.h; grep '^## ' C:/Users/wompu/.claude/CLAUDE.md > /tmp/g.h; comm -12 <(sort /tmp/p.h) <(sort /tmp/g.h)`
3. For each shared heading, decide canonical owner (project for PRISM-specific, global for cross-project doctrine)
4. Insert `## See <other-file> §<section>` pointer in the non-canonical file
**Verification:**
```yaml
tool: "comm -12 <(grep '^## ' H:/prism/CLAUDE.md | sort) <(grep '^## ' C:/Users/wompu/.claude/CLAUDE.md | sort) | wc -l"
expected_signal: "<= 2 shared headings (down from baseline; baseline captures during execute)"
re_run_cost: "100ms"
baseline_capture_command: "(same command as verification tool — runs at unit start)"
```

---

### PHASE D — Obsidian + viz utilization verification (T9 part 2 + T6)

#### U-OBS-D1: Verify 5 viz/obsidian-backed injectors are firing
**Tool:** USE `prism_hook:performance` action. NOT building new.
**Action:** For each named injector (`master-index-precheck-inject`, `audit-viz-first-inject`, `wiki-precheck-inject`, `memory-relevance-inject`, `tribal-by-domain-inject`), call `prism_hook:performance` and check `fired_count > 10` over last 24h.
**Verification:**
```yaml
tool: "node -e 'fetch(\"http://127.0.0.1:3100/mcp\",...)' — call prism_hook:performance for each named injector"
expected_signal: "all 5 named injectors return fired_count > 10"
re_run_cost: "1s per injector"
baseline_capture_command: "(captured during unit)"
```

#### U-OBS-D2: Propose viz/obsidian replacements for static-content inject seams (advisory only)
**Tool:** Walks UserPromptSubmit + SessionStart hooks. Emits `state/shared/specs/INJECTOR-VIZ-OBSIDIAN-CANDIDATES-2026-05-17.md` — advisory proposals, NOT auto-execute.
**Verification:**
```yaml
tool: "test -f H:/prism/state/shared/specs/INJECTOR-VIZ-OBSIDIAN-CANDIDATES-2026-05-17.md && wc -l < H:/prism/state/shared/specs/INJECTOR-VIZ-OBSIDIAN-CANDIDATES-2026-05-17.md"
expected_signal: "file exists AND >= 50 lines (proves substantive proposals, not stub)"
re_run_cost: "manual review"
baseline: { file_absent: true }
```

---

### PHASE E — /checkin /loop /goal capability audit (T5) — REDIRECTED v2

**Prereq:** PHASE FIX U-OBS-FIX1 must complete first (skill-lint broken).

#### U-OBS-E1: Audit `/checkin` skill body with `skill-lint.mjs`
**Tool:** USE `scripts/skill-lint.mjs --skill checkin --json` (after U-OBS-FIX1). NOT building new.
**Action:** Run linter; review R1 (vague verbs) / R3 (trigger floor) / R4 (placeholder language) findings; edit checkin.md to clear them.
**Verification:**
```yaml
tool: "node H:/prism/scripts/skill-lint.mjs --skill checkin --json | jq '.findings | length'"
expected_signal: "0 P0/P1 findings after edits"
re_run_cost: "2s"
baseline_capture_command: "(blocked on FIX1; capture after)"
```

#### U-OBS-E2: Audit `/loop` skill body with `skill-lint.mjs`
Same shape as E1, `--skill loop`.

#### U-OBS-E3: Audit `/goal` skill body + `goal-complete-gate.mjs`
Skill-lint on `/goal`, then manually verify `goal-complete-gate.mjs` parses current `audit-close-out-candidates.mjs` output shape.
**Verification:**
```yaml
tool: "echo '{}' | node H:/prism/.claude/hooks/goal-complete-gate.mjs 2>&1; node H:/prism/scripts/skill-lint.mjs --skill goal --json | jq '.findings | length'"
expected_signal: "gate returns valid JSON AND skill-lint findings == 0 P0/P1"
re_run_cost: "3s"
baseline_capture_command: "(blocked on FIX1; capture after)"
```

---

### PHASE F — Prior-audit CRIT remediation (NEW v2, addresses reviewer fix #2)

#### U-OBS-F1: Regenerate `ENGINE_DIGEST.md` (clears F2 from prior audit)
**Why:** F2 in `STALE-NODES-AUDIT-2026-05-16.md` — ENGINE_DIGEST stale 72.5h; canonical "check before creating any engine" surface; stale digest → false-negative dedup.
**Action:** Find regen script (likely `scripts/generate-engine-digest.mjs` or similar); run it; verify mtime fresh.
**Verification:**
```yaml
tool: "node -e 'const s=require(\"fs\").statSync(\"H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md\");console.log(((Date.now()-s.mtimeMs)/3600000).toFixed(1))'"
expected_signal: "< 24h"
re_run_cost: "30ms"
baseline: { age_hours: 72.5 }
```

#### U-OBS-F3: Regenerate `DIRECTORY_DIGEST.md` (clears prior-audit F7)
**Why:** Captured baseline 103.1h stale (4+ days). Less load-bearing than ENGINE_DIGEST but still feeds the recall chain; was flagged WARN in prior audit.
**Action:** Find regen script (likely `scripts/generate-directory-digest.mjs` or similar; if missing, may need to be built — but check first per duplication doctrine).
**Verification:**
```yaml
tool: "node -e 'const s=require(\"fs\").statSync(\"H:/prism/mcp-server/data/docs/DIRECTORY_DIGEST.md\");console.log(((Date.now()-s.mtimeMs)/3600000).toFixed(1))'"
expected_signal: "< 48h"
re_run_cost: "30ms"
baseline: { age_hours: 103.1 }
```

#### U-OBS-F2: Run `/envelope-sync` against 11 drifted envelopes (clears F3)
**Why:** F3 in prior audit — 11 milestones `claims_completed_but_units_pending`. `/pick-unit` skips real work hiding behind false-positive completion.
**Action:** Invoke `/envelope-sync` skill; operator approves each proposed status flip; commit the patches.
**Verification:**
```yaml
tool: "node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.envelopeDrift.driftedMilestones'"
expected_signal: "<= 5"
re_run_cost: "150ms"
baseline: { drifted: 11 }
```

---

## Dependencies (v2 — corrected ordering)

```
FIX1 (repair skill-lint)  ──→  E1, E2, E3 (skill-lint consumers)
A1, A2, A3, A4            ──→  independent of each other; can run parallel
B1 (watchdog wire)        ──→  B2 (compress)
B2 (compress)             ──→  B3 (scan)
C1 (drift triage)         ──→  C2 (collapse depends on C1 cleanup)
D1 (verify firing)        ──→  D2 (propose replacements depends on knowing current ROI)
F1, F2                    ──→  independent of A/B/C/D/E
```

Critical path: `FIX1 → E1 → E2 → E3` (longest serial chain).
Parallelizable: A-phase units, F-phase units, B1+D1 (independent), C1 (after C2 only if C2 finishes first).

---

## META artifacts (compounding-gains waiver per /forge7 doctrine)

**v1 proposed 3 new META tools — all duplicated existing infrastructure.** v2 emits **ZERO net-new META** by design. The compounding-gains contribution comes from:

1. **DELETION** of duplicate `audit-auto-injectors.mjs` — future audits will use `prism_hook:hook_efficiency_roi` instead, which has telemetry backing my name-pattern flag never had
2. **REPAIR** of `skill-lint.mjs` (FIX1) — currently broken; unblocks the 3 skill audits AND every future skill-lint invocation
3. **REDIRECT** of C/E units to existing tools — codifies the "use what exists" doctrine the user explicitly asked for

Per the doctrine: "the audit must emit ≥1 re-runnable measurement tool." The `claude-md-drift.mjs` + `skill-lint.mjs` (repaired) + `regen-claude-md-sections.mjs` ARE the re-runnable measurement tools — pre-existing, now actively used. **Waiver claimed: removing duplication and repairing broken tools provides MORE compounding-gains than adding new ones.**

---

## Synergy delta target (revised v2)

**v1 claimed:** ≥21.1% non-decrease.
**v2 honest:** synergy script's `components` field is empty so dedup-positivity cannot be proven a priori. **Treating synergy as MONITOR ONLY — not a gate.** If post-execution ratio drops by >1.0pp, flag for investigation; otherwise advisory.

---

## Risk register (v2 — reviewer-flagged additions)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| B3 false-positive flags cause operator to delete still-valid memory | High | High | Advisory-only output; explicit "review before delete" in MEMORY-OBSOLETE-REFS doc |
| C1 audit edits CLAUDE.md while peer chats read it mid-prompt | Medium | Medium | Lock via `prism_context:claim_file`; small windowed edits; commit ASAP after each section |
| C2 (collapse sections) breaks chats reading the moved section | Medium | High | Phase C2 LAST; emit deprecation pointer in both files for 7 days before removal |
| Slot mike drift (first live use of 13th slot) | Low | Low | Already verified via U-OBS-FIX runs; SLOT_NAMES backfilled atomically |
| A4 ingestor not found; tip-auto-* files hand-written | Medium | Low | Drop A4 to "advisory note in INGESTION-NOISE-INVENTORY.md" if no ingestor |
| A3 engine-backed classifier requires MCP reachable from hook process | Medium | Low | Keyword fallback path retained (already shipped) |
| D1 telemetry shows GOOD injectors have low ROI | Medium | High | Fold into AUTO-INVOCATION-MS1; do NOT regress to noise hooks |
| Author motivated reasoning when auditing own session work | High | Medium | Phase 5 consensus scrutiny + adversarial peer review |
| FIX1 skill-lint repair introduces regression | Low | Medium | After repair, run test suite covering R1-R5 rules with synthetic skill fixtures |

---

## Out-of-scope follow-ups (for /loop registration at milestone close)

- AUTO-INVOCATION-MS1 if D1 surfaces low-ROI signal injectors
- MEMORY-AUDIT-WEEKLY (/loop --interval 7d running B3 scan)
- CLAUDE-MD-DRIFT-DAILY (/loop --interval 1d running C1)
- DIGEST-REGEN-DAILY (/loop --interval 1d running F1)

---

## Estimated effort (v2 — revised)

| Phase | Units | Hours |
|---|---|---|
| FIX | 1 | 0.5 |
| A | 4 | 1.5 |
| B | 3 | 2.0 |
| C | 2 | 1.5 (down from 2.5 — no new tool build) |
| D | 2 | 1.0 (down from 1.5 — uses dispatcher) |
| E | 3 | 1.5 (down from 2.0 — no new tool build) |
| F | 2 | 1.0 |
| **Total** | **17** | **~9.0h** |

Net unit count INCREASED (13 → 17) but TIME DROPPED because we're using existing tools.

---

## Execution mode

After v2 peer-review PASS:
- Default: sequential per-phase with operator gating (user's prior directive)
- Override: `--loop` to enter Step-12 autonomous continuous-work like AUTO-INVOCATION-MS0

---

_Revised by /forge7 Phase 3 v2 · slot mike · claude-416be9ac · 2026-05-17T00:50Z_
_Awaiting Phase 4.5 v2 peer-review before execute._
