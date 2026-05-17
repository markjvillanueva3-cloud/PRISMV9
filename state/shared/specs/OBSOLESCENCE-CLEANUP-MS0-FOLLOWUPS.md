# OBSOLESCENCE-CLEANUP-MS0 — Registered Follow-up Units
**Closed:** 2026-05-17 · slot mike (claude-416be9ac) · session 416be9ac-4e1a-45c6-8282-15f685d3064e

Per `/forge7` Phase 6O doctrine, follow-up units identified during MS0 close-out are recorded here for an operator to register with `/loop` or `/schedule` at their convenience.

## 1. AUTO-INVOCATION-MS1 — injector telemetry + viz-backed replacements

**Why:** D1 audit found 3/5 "good" injectors fire visibly but don't write to `mcp-server/data/state/hook-fire-counts.jsonl` (master-index-precheck-inject, memory-relevance-inject) and a 4th has a naming gap (audit-viz-first vs viz-first-redirect — same hook, two names).

**Scope:**
- Fix telemetry write gap in 2 injectors (add `tele("injected",...)` at the inject seam — mirror `wiki-precheck-inject`)
- Reconcile audit-viz-first/viz-first-redirect naming (pick one canonical + update CLAUDE.md/wiki refs)
- Investigate archived-skill-suggest (851 fires, 2nd most-firing hook) — operator survey or click-through telemetry to measure hit-rate vs noise
- Prototype viz-backed replacement for comprehensive-build-enforce on named-engine prompts (replace generic directive with engine-neighborhood query when prompt names a specific engine)

**Suggested cadence:** one-shot pickup, no recurring schedule.

## 2. MEMORY-AUDIT-WEEKLY — `/loop --interval 7d`

**Why:** B3 shipped `scripts/scan-memory-obsolete-refs.mjs` as advisory tool. Without a recurring run, memory namespace drift accumulates silently (current baseline: 61/271 files = 22.5% with stale refs).

**Schedule:**
```bash
echo "node H:/prism/scripts/scan-memory-obsolete-refs.mjs" | /loop --interval 7d --max 12
```

**Exit codes:** 0 fresh / 1 warn (≥25% stale) / 2 critical (≥50% stale) — cron-compatible.

## 3. CLAUDE-MD-DRIFT-DAILY — `/loop --interval 1d`

**Why:** `claude-md-drift.mjs` already exists but is operator-triggered. Daily run surfaces doctrine-vs-reality drift before it compounds.

**Schedule:**
```bash
echo "node H:/prism/scripts/claude-md-drift.mjs" | /loop --interval 1d --max 14
```

## 4. DIGEST-REGEN-DAILY — `/loop --interval 1d`

**Why:** ENGINE_DIGEST.md / DISPATCHER_DIGEST.md / DIRECTORY_DIGEST.md are pre-computed indexes. Daily regen keeps the duplication-guard, master-index search, and awareness injects honest. The 2026-05-14 finding (`DISPATCHER_DIGEST.md` shows 0 actions for 4 high-traffic dispatchers due to spread-array enum parser bug) is a reminder that stale digests propagate into every audit.

**Schedule:**
```bash
echo "node H:/prism/scripts/regen-digests.mjs" | /loop --interval 1d --max 14
```

## 5. CLAUDE.md duplicate-section collapse — 2026-05-24+

**Why:** C2 audit found 2 shared L2 headings between project + global CLAUDE.md. Phase A (cross-ref pointer comments) shipped this milestone. Phase B (collapse body to pointer) is gated on a 7-day grace window so concurrent chats don't lose context from the pre-collapse text.

**Action 2026-05-24+:**
- Verify no live chats have stale context referring to the duplicate
- Replace project `## EXPERT ROLE (ALWAYS ACTIVE)` body with single-line pointer to global file
- Replace global `## GOLF SLOT` body with single-line pointer to project file
- Verify with `comm -12 <(grep '^## ' H:/prism/CLAUDE.md | sort -u) <(grep '^## ' C:/Users/wompu/.claude/CLAUDE.md | sort -u)` → 0 lines

## 6. Deeper CLAUDE.md duplication audit — paragraph-level fingerprint

**Why:** C2 used heading-level diff which missed:
- Project §KARPATHY DISCIPLINE vs Global §KARPATHY DISCIPLINE (mental checklist) — different L2 names so heading-diff doesn't catch
- Project §TOKEN ECONOMY vs Global §TOKEN ECONOMY
- Project §RTK section vs Global §RTK

**Scope:** paragraph-level fingerprint diff in a future audit pass. Likely 1-2 units.
