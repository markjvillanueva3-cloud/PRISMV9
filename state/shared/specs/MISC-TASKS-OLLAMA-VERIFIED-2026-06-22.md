# MISC-TASKS Ollama recall verification -- 2026-06-22T02:46:32.213Z

> Local-model (qwen2.5-coder:32b) classification of the 40 deterministic-needs-review items that name a code file. Conservative: only an explicit `closed` verdict counts. Re-run: `node scripts/verify-misc-tasks-ollama.mjs`.

- candidates classified: **40**
- **likely-closed (ollama): 2** -- re-check before picking up
- still-open (ollama): 11
- unknown: 27

## Ollama-flagged likely-closed
| misc_id | title | reason |
|---|---|---|
| MISC-124 | scrutiny-ledger.test.mjs not in vitest include glob (never runs in CI) | File no longer exists in repo. |
| MISC-220 | camxMs22U01ActionSchemas.ts missing — flagged as cross-chat coordinati | File exists with expected content. |
