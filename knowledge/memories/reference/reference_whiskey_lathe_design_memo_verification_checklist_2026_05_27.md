---
name: reference-whiskey-lathe-design-memo-verification-checklist-2026-05-27
description: Mechanical verification checklist next session runs BEFORE implementing any of the 14 design memos. Catches assumptions that have rotted or never matched code, per [[feedback_verify_actual_contract_not_proxy]].
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:11.048Z
aliases: reference_whiskey_lathe_design_memo_verification_checklist_2026_05_27
---


# Design-memo verification checklist (next-session pre-flight)

## Why this exists

Design memos written in iter105-iter121 reference files, engine names, and JSON structures that exist NOW. By the time next session implements, some of these may have:
- Been renamed by another slot
- Had their schema change
- Been deleted by a roadmap-cleanup pass
- Never matched the actual on-disk state (memo wrote based on this session's mental model, not verified contracts)

Per CLAUDE.md memory-rule "A memory that names a specific function, file, or flag is a claim that it existed *when the memory was written*" — verify before relying.

## Pre-flight checks (run as a single batched script)

### Files referenced (existence check)
```bash
ls -la \
  mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json \
  mcp-server/data/ingestion_cache/lathe-vendor-expansion-2026-05-26.json \
  mcp-server/data/ingestion_cache/lathe-videos-tribal-2026-05-26.json \
  scripts/lathe-quality-pipeline.mjs \
  scripts/lathe-training-loop.mjs \
  scripts/lathe-baseline-analyzer.mjs \
  scripts/query-lathe-tribal.mjs \
  scripts/extract-lathe-videos-tribal.mjs \
  scripts/extract-lathe-pdfs-per-page.mjs \
  scripts/lib/lathe-academy-priors.mjs
```

Any missing → flag the corresponding design memo as needs-update.

### Engines referenced (grep check)
```
grep -l "class LatheCAMIntelligenceEngine"
grep -l "class LathePostProcessor"
grep -l "class LatheCSSOptimizerEngine"
grep -l "class LatheChipMechanicsEngine"
grep -l "class BoringBarDeflectionEngine"
grep -l "class LatheAITrainingEngine"
grep -l "class LathePrintSequencePlannerEngine"
grep -l "class DuplicationGuardEngine"
```

If any class missing → engine was renamed or deleted; affected memos need refactor.

### JSON schemas referenced (jq/node check)
```
node -e "const j = require('mcp-server/data/ingestion_cache/lathe-tribal-master-index-2026-05-26.json'); console.log({vendors: Object.keys(j.vendors).length, has_indexes: !!j.indexes, has_wizard_records: !!j.wizard_query_records, schemaVersion: j.schemaVersion})"
```

Verify:
- vendors count ≥ 14
- `indexes.grades_by_iso_p` array exists + has entries
- `wizard_query_records[]` exists + has entries
- `ai_query_synonyms{}` exists
- schemaVersion ≥ 2.0.0

### Dispatcher actions referenced (DISPATCHER_DIGEST check)
```
grep "prism_lathe" mcp-server/data/docs/DISPATCHER_DIGEST.md
grep "prism_calc" mcp-server/data/docs/DISPATCHER_DIGEST.md
grep "prism_safety" mcp-server/data/docs/DISPATCHER_DIGEST.md
```

If `prism_lathe` dispatcher doesn't exist yet → that's expected (iter111 builds it). But document the gap.

### Build state references (BUILD_STATE check)
```
grep -i "lathe" state/shared/BUILD_STATE.md
```

Cross-check against design memos' claims about what's "already built" vs "needs building." Any mismatch → memo needs update.

### Existing wiki entries (avoid duplication)
```
ls knowledge/wiki/lessons/video-extract-*.md | wc -l
ls knowledge/wiki/lessons/pdf-extract-*.md | wc -l
ls knowledge/wiki/architecture/lathe-*.md
```

Compare against iter101 claim of "300+ video stubs" — if much smaller, the slot-worktree may not have synced.

### Sub-graph siblings (dedup gate per CLAUDE.md)
```
node scripts/dedup-search.mjs --query "shop tool library bridge"
node scripts/dedup-search.mjs --query "lathe vendor lookup"
node scripts/dedup-search.mjs --query "tribal query dispatcher"
node scripts/dedup-search.mjs --query "AB version locator"
```

If dedup-search returns existing matches → either repurpose existing OR justify why net-new (R7 surface-conflict-not-average).

### JM-Die archive scan (precondition for AB-locator)
```
node -e "const g = require('glob'); g('JM DIE/CNC LATHE/**/*.{MIN,PIM}', {nocase: true}, (e,f) => console.log({total: f.length, sample: f.slice(0,3)}))"
```

Verify file count matches the ~15,251 program claim. If much smaller → AB-locator scope adjusts.

### Cron + slot state
```
node H:/prism/.claude/helpers/chat-slots.mjs status --slot whiskey
```

Verify whiskey slot is bound + branch is `slot/whiskey` + heartbeat is fresh.

## Run-as-one script (recommended)

Save the above as `scripts/whiskey-lathe-preflight-2026-05-27.mjs`. Next session runs ONE command:
```
node scripts/whiskey-lathe-preflight-2026-05-27.mjs
```
Output: green/yellow/red per check + concrete action items if anything's red.

This is more efficient than running each check inline + needing 20+ tool calls.

## What to do with the output

**All green** → proceed to Phase 1 implementation per [[reference_whiskey_lathe_complete_design_synthesis_2026_05_27]] pickup procedure.

**Yellow (warnings, e.g. file exists but smaller than expected)** → note in handoff, proceed cautiously, may need to update a memo before relying.

**Red (file missing, engine deleted, schema bumped, dedup conflict)** → STOP. Read the affected design memo + verify what changed + update memo BEFORE writing any code. Per CLAUDE.md "do not delegate understanding."

## Anti-pattern to prevent

❌ Skipping pre-flight and going straight to implementation because "the memos look complete." Memos are claims about past state; the verification is the only way to confirm they still hold.

## Related

- [[reference_whiskey_lathe_complete_design_synthesis_2026_05_27]] — landing page (read second, after pre-flight passes)
- [[feedback_verify_actual_contract_not_proxy]] — the doctrine driving this checklist
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — corpus baseline claim to verify
- CLAUDE.md "Before recommending from memory" section — the explicit doctrine of verifying memory claims
