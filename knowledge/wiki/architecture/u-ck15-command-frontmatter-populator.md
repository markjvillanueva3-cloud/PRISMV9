---
title: U-CK15 — Command Frontmatter Populator
unit: U-CK15
milestone: COMMAND-KERNEL-MS0
slot: bravo
shipped: 2026-05-19
commit: f3dad18253
---

# U-CK15 — Command Frontmatter Populator

Closes the COMMAND-KERNEL-MS0 gap: ~628 skill commands under `H:/prism/.claude/commands/*.md` and `H:/.claude/commands/*.md` had only 1 file with `composes_with:` and only 1 with `consumes:` populated. After this unit ships, 342 commands carry inferred `composes_with:` (other skills referenced by `/<name>` in their body) and 108 carry inferred `consumes:` (dispatcher actions in shape `prism_*:action_name` referenced in their body). `produces:` stays manual — too high false-positive rate to infer.

## Artifacts

| Path | Role |
|------|------|
| `scripts/populate-command-frontmatter.mjs` (443 LOC, 9 exports) | The populator. Pure-core + I/O shell |
| `scripts/populate-command-frontmatter.test.mjs` (465 LOC, 49 tests) | node:test, 100% pass, hermetic tmpdirs + CRLF/BOM oracles + CLI E2E |
| `state/shared/dashboards/command-frontmatter-coverage.md` | Operator dashboard — per-field existing/inferred/after/% |
| `.claude/commands/*.md` × 36 | Each gains the inferred frontmatter keys (additive, idempotent) |

## CLI surface

```bash
# Preview without writing
node scripts/populate-command-frontmatter.mjs --dry-run

# Apply (additive merge; pre-existing values are preserved)
node scripts/populate-command-frontmatter.mjs --apply

# Restrict fields
node scripts/populate-command-frontmatter.mjs --apply --field composes_with

# Custom corpus
node scripts/populate-command-frontmatter.mjs --corpus H:/some/dir --apply

# Suppress dashboard write (test-friendly)
node scripts/populate-command-frontmatter.mjs --apply --report ""
```

Exit codes: `0`=success, `1`=arg error, `2`=schema-invalid (R12 throw from `emitYamlStringArray` / `validateAdditions`), `3`=I/O error.

## Round-1 → round-2 hardening (the load-bearing audit trail)

First reviewer pass FAILED both arms with 9 P0/P1 findings. All fixed; round-2 PASS/PASS.

1. **digit-tolerant `DISPATCHER_ACTION_RE`** — `prism_5axis:*` and `*_v2` actions were silently rejected. New regex: `prism_[a-z0-9_]+:[a-z0-9_]+`.
2. **CRLF + BOM tolerance** — `stripBom` + `FM_RE_EOL` accepts `\r\n|\n`; `parseFrontmatter` LF-normalizes the FM inner block and slices body byte-stable; `rebuildFile` re-emits with host EOL. Was silently corrupting Windows-CRLF corpus.
3. **Symmetric `validateAdditions`** — now validates `consumes` too (was validating only `composes_with`).
4. **`emitYamlStringArray` R12 + escape order** — throws on embedded `\r|\n`; escapes `\\` BEFORE `"` (had reversed order, emitting invalid YAML).
5. **`transformFileText` byte-identity** — empty frontmatter + empty additions returns the original text byte-for-byte (was fabricating a degenerate `---\n\n---` block).
6. **Split counters** — `schemaInvalidCount` (exit 2) vs `ioErrorCount` (exit 3); routed by `/schema-invalid/i` on `err.message`.
7. **`parseArgs --field` allowlist** — rejects `produces` (manual-only) and any unknown field. R12 throw.
8. **`--report ""` suppresses write** — enables the relative-arg CLI E2E oracle.
9. **CLI bootstrap with relative argv[1]** — `pathToFileURL(resolve(argv[1] || ""))` instead of `\`file://${argv[1]}\``. The latter doesn't match for relative paths → `main()` silently never ran. Fail-on-revert test captured.

## Test integrity

Every test is a real invariant. Mentally returning a hardcoded constant from any pure-core function breaks the suite:
- `inferComposesWith` filter tests demand different outputs from different inputs.
- `transformFileText: byte-identical when nothing to add` is strict `assert.equal` round-trip.
- The CRLF round-trip oracle asserts `\r\nbody1\r\nbody2\r\n$` regex AND `fmDelims === 2`.
- The `--apply` idempotency oracle (`afterRun2 === afterRun1`) is the additive-only regression class.
- The relative-arg CLI oracle (`spawnSync` with `cwd: here`) is the exact fail-on-revert for the round-1 `pathToFileURL` bug.
- The digit-tolerance oracles are fail-on-revert for the round-1 regex bug.

## Deferred follow-ups (P2/P3, not blocking)

- **F1 (P2)** — slot-worktree advisory caveat: `--apply` from a slot worktree mutates files in `H:/prism/.claude/commands` which is outside that worktree's boundary. No `git-add-lane-guard` interaction (it's a write, not a stage) but worth a runbook note or refuse-with-hint.
- **F2 (P3)** — extract `emitYamlStringArray` / `mergeFrontmatterYaml` into `scripts/lib/yaml-additive-merge.mjs` for future YAML-emit consumers (close-out audits, envelope emitters, etc).
- **F3 (P3)** — `ALLOWED_TIMEOUT_MS = 30000` declared but unused; either wire into test `spawnSync` literals or delete.

## See also

- [[knowledge-vault-schema]] — namespace for `commands` (the surface this populates)
- [[command-frontmatter.schema]] — the JSON schema validated against
- [[checkin-bravo]] — slot wrapper that picked this up after the cross-session recovery
