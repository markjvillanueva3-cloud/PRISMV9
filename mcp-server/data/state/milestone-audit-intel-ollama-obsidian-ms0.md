# Milestone Integrity Audit — INTEL-OLLAMA-OBSIDIAN-MS0

**Generated:** 2026-05-07T12:26:48.908Z
**Verdict:** ⚠ DRIFT

## Summary
| Metric | Count |
| --- | --- |
| Total units | 92 |
| OK (completed + deliverables present) | 61 |
| Deliverable-gap (completed in JSON, files missing) | 29 |
| Ghost-shipped (commit found, JSON not closed) | 0 |
| Anachronism (closed in JSON, no commit) | 1 |
| Scope-invalidated (spec premise doesn't match branch) | 1 |
| Open (no commit, not completed) | 0 |
| **Drift total** | **30** |

## Per-unit detail
| Phase | Unit | Verdict | Commit | Notes |
| --- | --- | --- | --- | --- |
| P0 | P0-U01 | ok | 3b90e9de7 |  |
| P0 | P0-U02 | ok | 866ec6b50 |  |
| P0 | P0-U03 | ok | fc863882a |  |
| P0 | P0-U04 | ok | 246aa0120 |  |
| P1 | P1-U01 | ok | 0f210ced7 |  |
| P1 | P1-U02 | ok | 4258644cd |  |
| P1 | P1-U03 | deliverable-gap | cf7933488 | missing: scripts/populate-tribal-vault.mjs |
| P1 | P1-U04 | deliverable-gap | 2430cf4aa | missing: scripts/mirror-memories-bootstrap.mjs |
| P1 | P1-U05 | deliverable-gap | 7f30430ac | missing: scripts/chunk-claudemd-vault.mjs, .claude/hooks/claudemd-section-update.mjs |
| P10 | P10-U01 | deliverable-gap | 7e72c3826 | missing: .claude/hooks/.deprecated/ |
| P10 | P10-U02 | ok | aea03c6a0 |  |
| P10 | P10-U03 | ok | db2804dfe |  |
| P10 | P10-U04 | ok | 384ff9a3c |  |
| P10 | P10-U05 | ok | aa320ffe2 |  |
| P10 | P10-U06 | deliverable-gap | 738a851b4 | missing: scripts/.deprecated/ |
| P11 | P11-U01 | ok | af587c3ed |  |
| P11 | P11-U02 | ok | e02ca6436 |  |
| P11 | P11-U03 | ok | f88536279 |  |
| P11 | P11-U04 | ok | 9858dd653 |  |
| P11 | P11-U05 | ok | fb98ffba8 |  |
| P11 | P11-U06 | ok | 4f4fbc91c |  |
| P11 | P11-U07 | ok | e02ca6436 |  |
| P11 | P11-U08 | ok | 3b5dfb63a |  |
| P12 | P12-U01 | scope-invalidated | — |  |
| P13 | P13-U01 | ok | f666491e5 |  |
| P13 | P13-U02 | anachronism | — | closed in JSON but no commit subject matches |
| P13 | P13-U03 | ok | be5121aad |  |
| P13 | P13-U04 | ok | 6c11cb537 |  |
| P14 | P14-U01 | deliverable-gap | 2545b5817 | missing: scripts/resources-inventory.mjs, RESOURCES-INVENTORY.md |
| P14 | P14-U02 | deliverable-gap | 0ebf997e3 | missing: scripts/ingest-pdf-batch.mjs, knowledge/ingested/ |
| P14 | P14-U03 | deliverable-gap | 9316cbb86 | missing: scripts/auto-backlink-vault.mjs |
| P14 | P14-U04 | deliverable-gap | d978fb540 | missing: scripts/wiki-bootstrap-mit.mjs |
| P15 | P15-U01 | deliverable-gap | de5d5f90a | missing: scripts/csm-inventory.mjs |
| P15 | P15-U02 | deliverable-gap | 7d7a9d133 | missing: mcp-server/src/__tests__/CrossSessionMemoryBridge.test.ts |
| P15 | P15-U03 | deliverable-gap | 95f9efc55 | missing: scripts/ingest-plans-trajectories.mjs |
| P16 | P16-U01 | deliverable-gap | e3922114b | missing: scripts/peer-repo-signature-map.mjs, PEER-REPO-SIGNATURES.json |
| P16 | P16-U02 | deliverable-gap | ac1c24e66 | missing: PEER-REPO-MERGE-CANDIDATES.md |
| P16 | P16-U03 | ok | dce9c7fc3 |  |
| P17 | P17-U01 | ok | 7641eb2bd |  |
| P17 | P17-U02 | ok | f9ee44fff |  |
| P17 | P17-U03 | ok | 499effbc6 |  |
| P18 | P18-U01 | ok | ff7834384 |  |
| P18 | P18-U02 | ok | 4cead63b3 |  |
| P19 | P19-U01 | ok | 26eab3f25 |  |
| P19 | P19-U02 | ok | ecf1b5cba |  |
| P2 | P2-U01 | ok | 1ae96d32a |  |
| P2 | P2-U02 | deliverable-gap | 683a3606a | missing: .claude/hooks/error-block-capture.mjs, .claude/hooks/error-pattern-memory.mjs, .claude/hooks/error-recovery-memory.mjs, .claude/hooks/error-learner-hook.mjs |
| P2 | P2-U03 | ok | 2f20cd728 |  |
| P2 | P2-U04 | deliverable-gap | cab8c25c1 | missing: .claude/hooks/error-block-prewarn.mjs |
| P20 | P20-U01 | ok | 663569505 |  |
| P20 | P20-U02 | ok | ecf1b5cba |  |
| P20 | P20-U03 | ok | 8aa0a24a5 |  |
| P20 | P20-U04 | ok | ce02a8aaf |  |
| P21 | P21-U01 | ok | 0bae326c2 |  |
| P21 | P21-U02 | ok | 5175559e1 |  |
| P21 | P21-U03 | ok | ece84b983 |  |
| P22 | P22-U01 | ok | f96d7415f |  |
| P22 | P22-U02 | ok | 3f752ca45 |  |
| P22 | P22-U03 | ok | 3f752ca45 |  |
| P23 | P23-U01 | ok | f96d7415f |  |
| P23 | P23-U02 | ok | 3f752ca45 |  |
| P3 | P10-U04 | ok | 384ff9a3c |  |
| P3 | P3-U01 | deliverable-gap | 5f8e5d79b | missing: scripts/embed-all-skills.mjs, .claude/hooks/ollama-skill-suggester.mjs |
| P3 | P3-U02 | deliverable-gap | e81d2adc9 | missing: scripts/summarize-all-scripts-via-ollama.mjs, .claude/hooks/script-summary-inject.mjs |
| P3 | P3-U03 | deliverable-gap | 77588b431 | missing: scripts/embed-all-engines.mjs |
| P3 | P3-U04 | deliverable-gap | 45e2c9d6a | missing: scripts/embed-all-actions.mjs, .claude/hooks/ollama-route-recommender.mjs |
| P3 | P3-U05 | deliverable-gap | dbd1c797c | missing: .claude/hooks/ollama-obsidian-rag.mjs |
| P4 | P4-U01 | ok | 4cfbcb51e |  |
| P4 | P4-U02 | deliverable-gap | 3d8e499e5 | missing: scripts/summarize-directives-via-ollama.mjs |
| P4 | P4-U03 | ok | 33d1a6867 |  |
| P4 | P4-U04 | deliverable-gap | baa47b244 | missing: scripts/embed-wiki-index.mjs |
| P5 | P5-U01 | ok | aeaefb8de |  |
| P5 | P5-U02 | ok | aeaefb8de |  |
| P5 | P5-U03 | ok | aeaefb8de |  |
| P5 | P5-U04 | ok | aeaefb8de |  |
| P5 | P5-U05 | ok | aeaefb8de |  |
| P6 | P6-U01 | deliverable-gap | 915e42210 | missing: .claude/hooks/mirror-c-to-h.mjs, scripts/mirror-c-to-h-audit.mjs, scripts/bootstrap-h-mirror.mjs |
| P6 | P6-U02 | deliverable-gap | 3e3bbe018 | missing: .claude/hooks/engine-digest-precheck.mjs, .claude/hooks/rtk-prefix-reminder.mjs, .claude/hooks/commit-format-validator.mjs, .claude/hooks/compact-interval-warning.mjs |
| P6 | P6-U03 | deliverable-gap | aeaefb8de | missing: .claude/hooks/.deprecated/ |
| P7 | P7-U01 | ok | c9637f786 |  |
| P7 | P7-U02 | deliverable-gap | 6b192c147 | missing: scripts/cross-pc-handoff-verify.mjs, CROSS-PC-HANDOFF-TEST.md |
| P8 | P8-U01 | ok | 2da93ac07 |  |
| P8 | P8-U02 | ok | 07ec30e80 |  |
| P8 | P8-U03 | ok | 602643bc1 |  |
| P8 | P8-U04 | deliverable-gap | 1b4693d59 | missing: scripts/add-schema-describes.mjs |
| P8 | P8-U05 | deliverable-gap | e4a9c29a4 | missing: mcp-server/src/engines/SchemaQualityAuditEngine.ts, mcp-server/src/__tests__/SchemaCoverageAudit.test.ts |
| P8 | P8-U06 | ok | b72d880a5 |  |
| P9 | P9-U01 | ok | 8aa0a24a5 |  |
| P9 | P9-U02 | ok | f96d7415f |  |
| P9 | P9-U03 | ok | f96d7415f |  |
| P9 | P9-U04 | ok | f23798f5a |  |
| P9 | P9-U05 | ok | baa47b244 |  |
