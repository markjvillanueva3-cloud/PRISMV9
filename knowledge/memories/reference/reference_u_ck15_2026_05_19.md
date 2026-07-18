---
name: reference-u-ck15-2026-05-19
description: U-CK15 (COMMAND-KERNEL-MS0) shipped 2026-05-19 — command frontmatter populator with CRLF/BOM tolerance + 49 hermetic tests
aliases: reference_u_ck15_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.234Z
---


U-CK15 (COMMAND-KERNEL-MS0) — populate `consumes:` and `composes_with:` frontmatter across ~628 commands. Shipped 2026-05-19 commit `f3dad18253` by slot bravo (claude-ddda9e7c) recovering claude-df944902's C:-ENOSPC-blocked work.

**Why:** The new command frontmatter schema (`.claude/schemas/command-frontmatter.schema.json`) gates command discoverability + cross-command composition graph. Bare files (1/628 with `composes_with`, 1/628 with `consumes`) made the graph nearly empty — the schema was load-bearing for `/forge-audit-v2`, `/dedup`, `/pick-unit`, `master-index-precheck-inject`.

**How to apply:** Re-run is idempotent + additive. `node scripts/populate-command-frontmatter.mjs --apply` re-merges into both `H:/prism/.claude/commands` and `H:/.claude/commands`. Exit codes: 0=ok, 1=arg-error, 2=schema-invalid, 3=I/O. `--report ""` suppresses dashboard for test-friendly invocation.

**Lessons (operator-facing):**
1. Round-1 review caught 9 P0/P1 silent-failure modes — the test suite was written second AFTER the impl. Per [[feedback_test_first]], next populator should write tests FIRST. The CRLF-corruption + degenerate-FM + missing-pathToFileURL classes were ALL silent — never threw.
2. The CLI bootstrap pattern `pathToFileURL(resolve(process.argv[1] || ""))` is the canonical form for ESM `if (import.meta.url === ...)` main-detection on Windows. The naive `\`file://${argv[1]}\`` fails on relative argv[1] and the failure is `exit 0 + empty stdout` — silent.
3. Recovery across `/compact`: per-agent handoff + slot-task-claim got me from a different chat-id (claude-df944902 the original session, now expired) to claude-ddda9e7c with the work intact on disk. The 10-step recovery plan in the handoff was load-bearing — without it I would have re-derived round-1's bugs.

**Linked:** [[u-ck15-command-frontmatter-populator]] (wiki) · [[knowledge-vault-schema]] (commands namespace) · [[reference_per_slot_claim_ms0_2026_05_16]] (slot-task-claim) · [[feedback_test_first]]
