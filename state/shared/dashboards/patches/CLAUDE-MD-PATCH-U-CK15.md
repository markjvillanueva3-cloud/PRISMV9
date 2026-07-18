# CLAUDE-MD-PATCH-U-CK15 — patch-sibling for U-CK15 ship

CLAUDE.md was peer-dirty (`M CLAUDE.md`) at the start of slot bravo's session 2026-05-19. Per [[patch-sibling-convention]] this file carries the canonical edit that should land in `H:/PRISM/CLAUDE.md` when the peer-lock clears.

## Target file
`H:/PRISM/CLAUDE.md`

## Target section
`## Recent regressions` (append a new entry at the top, matching the date-descending ordering)

## Proposed entry
```
- 2026-05-19 | **U-CK15 command-frontmatter populator (COMMAND-KERNEL-MS0)** — recovers claude-df944902's C:-ENOSPC-blocked work. 49/49 tests PASS; round-2 per-file scrutiny PASS/PASS (0 P0/P1). Apply delta: ~342 `composes_with:` + ~108 `consumes:` inferences across 36 commands (additive, idempotent on re-run; CRLF/BOM tolerant). 9 round-1 P0/P1 fixes verified: digit-tolerant `DISPATCHER_ACTION_RE`, CRLF+BOM-tolerant `parseFrontmatter`/`rebuildFile`, symmetric `validateAdditions`, `emitYamlStringArray` R12-throws on newline + escape order, `transformFileText` byte-identity on empty-FM, split `schemaInvalidCount` (exit 2) vs `ioErrorCount` (exit 3), `parseArgs --field` allowlist, `--report ""` suppresses dashboard, CLI bootstrap via `pathToFileURL(resolve(argv[1] || ""))`. Slot bravo recovery commit: `f3dad18253`. | observed-by: claude-ddda9e7c slot bravo `/startup-bravo /goal compile + clear bravo tasks` /loop iter 1. | verify: `node --test H:/prism/scripts/populate-command-frontmatter.test.mjs` → 49/49 PASS; `git -C H:/prism show f3dad18253 --stat \| tail -3` → 40 files changed, 1198 ins, 36 del.
```

## When the peer-lock clears
- Operator (or next non-peer-dirty bravo chat) inserts the entry above into `H:/PRISM/CLAUDE.md` `## Recent regressions` section at the top, and then deletes this patch-sibling file.
