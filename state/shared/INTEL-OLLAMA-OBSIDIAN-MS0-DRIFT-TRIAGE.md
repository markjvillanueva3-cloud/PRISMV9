# INTEL-OLLAMA-OBSIDIAN-MS0 — Drift Triage

Generated: 2026-05-07T13:05:10.314Z

Triaged 29 deliverable-gap units against 4 branches.

## Summary

| Bucket | Count | Action |
|--------|-------|--------|
| cross-branch-only | 13 | Auto-resolved by merge to main |
| mixed | 3 | Some files cross-branch, some need new build |
| orphaned-only | 10 | True gap — never built, needs unit work or scope-invalidate |
| all-local-or-meta | 3 | Audit false-positive — local files or directory placeholders |

## cross-branch-only (13)

### P1-U03
- `scripts/populate-tribal-vault.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1

### P1-U04
- `.claude/hooks/memory-mirror-to-vault.mjs` — ✓local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `scripts/mirror-memories-bootstrap.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1

### P1-U05
- `scripts/chunk-claudemd-vault.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `.claude/hooks/claudemd-section-update.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1

### P2-U02
- `.claude/hooks/error-block-capture.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `.claude/hooks/error-pattern-memory.mjs` — ✗local → main, work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `.claude/hooks/error-recovery-memory.mjs` — ✗local → main, work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `.claude/hooks/error-learner-hook.mjs` — ✗local → main, work/intel-p8-schema, work/intel-ollama-obsidian-ms1

### P2-U04
- `.claude/hooks/error-block-prewarn.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1

### P3-U01
- `scripts/embed-all-skills.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `.claude/hooks/ollama-skill-suggester.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1

### P3-U02
- `scripts/summarize-all-scripts-via-ollama.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `.claude/hooks/script-summary-inject.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1

### P3-U03
- `scripts/embed-all-engines.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `mcp-server/src/engines/DuplicationGuardEngine.ts` — ✓local → main, work/intel-p8-schema, work/intel-ollama-obsidian-ms1, work/intel-ollama-obsidian-ms0

### P3-U04
- `scripts/embed-all-actions.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `.claude/hooks/ollama-route-recommender.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1

### P3-U05
- `.claude/hooks/ollama-obsidian-rag.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `H:/.claude/settings.json` — ✓local absolute-path

### P4-U02
- `scripts/summarize-directives-via-ollama.mjs` — ✗local → main
- `.claude/hooks/directive-summary-refresh.mjs` — ✓local → main, work/intel-ollama-obsidian-ms0

### P7-U02
- `scripts/cross-pc-handoff-verify.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `CROSS-PC-HANDOFF-TEST.md` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1

### P8-U04
- `scripts/add-schema-describes.mjs` — ✗local → work/intel-p8-schema

## mixed (3)

### P6-U01
- `.claude/hooks/mirror-c-to-h.mjs` — ✗local no-branch
- `scripts/mirror-c-to-h-audit.mjs` — ✗local → work/intel-p8-schema
- `scripts/bootstrap-h-mirror.mjs` — ✗local → work/intel-p8-schema

### P6-U02
- `.claude/hooks/engine-digest-precheck.mjs` — ✗local no-branch
- `.claude/hooks/rtk-prefix-reminder.mjs` — ✗local → work/intel-p8-schema, work/intel-ollama-obsidian-ms1
- `.claude/hooks/commit-format-validator.mjs` — ✗local no-branch
- `.claude/hooks/compact-interval-warning.mjs` — ✗local no-branch

### P8-U05
- `mcp-server/src/tools/dispatchers/devDispatcher.ts` — ✓local → main, work/intel-p8-schema, work/intel-ollama-obsidian-ms1, work/intel-ollama-obsidian-ms0
- `mcp-server/src/engines/SchemaQualityAuditEngine.ts` — ✗local → work/intel-p8-schema
- `mcp-server/src/__tests__/SchemaCoverageAudit.test.ts` — ✗local no-branch

## orphaned-only (10)

### P4-U04
- `scripts/embed-wiki-index.mjs` — ✗local no-branch

### P14-U01
- `scripts/resources-inventory.mjs` — ✗local no-branch
- `RESOURCES-INVENTORY.md` — ✗local no-branch

### P14-U02
- `scripts/ingest-pdf-batch.mjs` — ✗local no-branch
- `knowledge/ingested/` — ✗local dir-placeholder

### P14-U03
- `scripts/auto-backlink-vault.mjs` — ✗local no-branch

### P14-U04
- `scripts/wiki-bootstrap-mit.mjs` — ✗local no-branch

### P15-U01
- `scripts/csm-inventory.mjs` — ✗local no-branch

### P15-U02
- `mcp-server/src/engines/CrossSessionMemoryBridgeEngine.ts` — ✓local no-branch
- `mcp-server/src/__tests__/CrossSessionMemoryBridge.test.ts` — ✗local no-branch
- `mcp-server/src/tools/dispatchers/memoryDispatcher.ts` — ✓local → main, work/intel-p8-schema, work/intel-ollama-obsidian-ms1, work/intel-ollama-obsidian-ms0

### P15-U03
- `scripts/ingest-plans-trajectories.mjs` — ✗local no-branch

### P16-U01
- `scripts/peer-repo-signature-map.mjs` — ✗local no-branch
- `PEER-REPO-SIGNATURES.json` — ✗local no-branch

### P16-U02
- `PEER-REPO-MERGE-CANDIDATES.md` — ✗local no-branch

## all-local-or-meta (3)

### P6-U03
- `.claude/hooks/.deprecated/` — ✗local dir-placeholder
- `H:/.claude/settings.json` — ✓local absolute-path

### P10-U01
- `.claude/hooks/.deprecated/` — ✗local dir-placeholder
- `H:/.claude/settings.json` — ✓local absolute-path

### P10-U06
- `scripts/audit.mjs` — ✓local no-branch
- `scripts/.deprecated/` — ✗local dir-placeholder
