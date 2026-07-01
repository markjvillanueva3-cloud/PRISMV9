---
unit: COMMAND-KERNEL-MS0/U-CK11
phase: P1 (Phase 1 of N — top-3 high-finding-count buckets)
shipped: 2026-05-22
shipped_by: slot:mike (claude-e5840fb7) iter 2/20
status: phase-1-complete · overall-unit-FAIL (P0/P1 fixes pending)
reviewers:
  arm-A (holistic): FAIL — agentId a19121fab04d4a4ea, 25 tool uses, 230s
  arm-B (independent): FAIL — agentId a3ae2ecaa823ff063, 14 tool uses, 153s
methodology: command-migrate.mjs --dry-run + 2-reviewer parallel scrutiny on top-3 buckets by finding count
---

# U-CK11 Phase 1 — Per-category scrutiny verdicts

## Scope

**Spec drift surfaced.** ACP-MS0 envelope says "13 categories"; the actual `state/shared/slash-commands-inventory.json` (schemaVersion 1, generated 2026-05-13) has **31 buckets** containing 663 commands (project=158, archive=114, user=391; 302 unique by slug). U-CK11's envelope inherited the stale "13" — per R7 (surface conflicts, don't average them), this verdicts doc adopts the 31-bucket reality and recommends amending the ACP-MS0 doctrine.

**Phase 1 scope:** the 3 highest-finding-count buckets per `command-migrate.mjs --dry-run`:

| Bucket | Cmds | Anti-pattern hits | Verdict |
|--------|-----:|------------------:|---------|
| roadmap | 23 | 36 | **FAIL** |
| audit   | 29 | 27 | **FAIL** |
| forge   | 35 | 21 | **FAIL** |

**Out of scope (deferred to Phase 2):** the remaining 28 buckets (28 buckets with 0–19 findings each), the 1400 `(unbucketed)` findings (slug-join bug, see §Corpus-level findings), and remediation of all P0/P1 findings below.

## Codemod baseline

`node .claude/scripts/command-migrate.mjs --dry-run` over `.claude/commands/` (302 files):
- 1638 anti-pattern hits total
- ~80 `description:` warnings (frontmatter gaps)
- ~250 "would apply: added name:" entries (deterministic frontmatter synthesis the codemod offers in `--apply`; not applied this phase per scope discipline)

The codemod is intentionally over-broad — every absolute path is flagged regardless of whether the command **executes** against it or merely **points** to it for the operator. Phase 1 reviewers separated real from false-positive by reading sampled commands.

## Bucket: `roadmap` — FAIL

**Sampled:** 6/23 (close-out, continue-roadmap, envelope-drift-fix, envelope-sync, foresight, rgs, rgs-sync; plus close-out-audit cross-bucket peek)

**Real P0 findings:**
- **continue-roadmap.md L33,L95** — hardcoded counts `"79 dispatchers, 3,310+ actions"` baked into mandatory pre-flight + validation guidance. These rot daily per CLAUDE.md "do NOT rely on counts baked into this document" — dispatcher count was 70+ → 75+ → 79 in 3 weeks.
- **rgs.md L64** — hardcoded `"576+ MCP actions"` in execution-relevant utilize action description.
- **rgs-sync.md L37–40 + envelope-sync.md L43 + close-out.md L54,108** — hardcoded `H:/prism/...` paths in scripts the command **executes** (not doc pointers). Slot worktrees at `H:/prism-slot-<nato>` exist per CLAUDE.md §SLOT-WORKTREE-MS0; these paths break there. Should be repo-relative or `$REPO_ROOT`-resolved.

**Real P1 findings:**
- **continue-roadmap.md** has `policy/consumes` frontmatter only — no `name:` or `description:`. Per `.claude/schemas/command-frontmatter.schema.json` these are required.
- 4 cross-scope duplicate slugs (project ↔ user-global): `envelope-sync`, `rgs`, `rgs2`, `rgs3`. Per CLAUDE.md skill-loader shadow rule, the project-local copies are silently shadowed and unused. Either delete the shadowed project copies or rename.

**False-positive estimate:** ~50% of bucket's 36 hits — many flagged `H:/prism/state/shared/...` and `mcp-server/data/...` are durable repo-internal doc pointers, not execution paths.

**Wiki entity registration:** 0/6 sampled present in `knowledge/wiki/os/commands/`. (Corpus-level finding — see §Corpus.)

## Bucket: `audit` — FAIL

**Sampled:** 5/29 (big-blob-hunt, dedup, dispatcher-coverage, scrutinize, staged-sanity, scrutiny-batch via cross-pick)

**Real P1 findings:**
- **dispatcher-coverage.md L246** — hardcoded illustrative counts `"524 engines / 468 engines / 116 engines"` in advisor text. These specific numbers will drift; should be templated `<N>` placeholders or read live.
- **big-blob-hunt.md L101–102** — `git -C H:/prism` pinned in the executable Step-1 enumerate command. Slot-worktree-portability issue (operator in `H:/prism-slot-alpha` runs the wrong tree). Drop `-C` or use `"$REPO_ROOT"`.
- **dedup.md L31** — hardcoded `H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md` read path in execution step.
- 4 cross-scope duplicate slugs: `awareness-check`, `dedup`, `scrutinize`, `verify-loop`. Same shadow risk.

**False-positive estimate:** ~30%.

**Frontmatter gaps:** `dedup` missing `description:`; `scrutinize` has `policy/triggers` only (no `name:` or `description:`); `dispatcher-coverage` missing both in head section. `staged-sanity` and `scrutiny-batch` OK.

**Wiki entity registration:** 0/5 sampled. (Corpus-level.)

## Bucket: `forge` — FAIL

**Sampled:** 3 project-local (forge-audit, forge-supervised, forge-triple)

**P0 — INVENTORY MISMATCH:**
- ACP-MS0 inventory lists **35 commands** in the `forge` bucket; `H:/prism/.claude/commands/forge*.md` contains only **3**. The other 32 live in `H:/.claude/commands/` (user-global). U-CK08 either (a) migrated user-global commands without distinguishing the corpus, or (b) the inventory conflates two trees as one. This silently doubles the maintenance surface and means the codemod audits two corpora as one. Reviewer A and B independently identified this.

**Real P1 findings:**
- **forge-audit.md L25** — hardcoded `node H:/prism/.claude/scripts/forge-audit-omniscient.mjs` in executable Run section. Slot-worktree-portability.
- **forge-triple.md L1–32** — missing `name:` and `description:` in frontmatter (has `triggers/composes_with/consumes` only).
- 3 cross-scope duplicate slugs: `forge-audit`, `forge-triple`, `forge2`.

**False-positive estimate:** ~20%.

**Wiki entity registration:** 0/3 sampled.

## Corpus-level findings (apply across all 31 buckets, not just the 3 in scope)

**P0 — Wiki entity registration is essentially 0%.** `knowledge/wiki/os/commands/` contains exactly **2 files** (`.gitkeep` + `checkin.md`). U-CK08 exit condition #3 ("every command registered as a `knowledge/wiki/os/commands/` entity") is unmet across 301/302 commands. Both arms independently surfaced this.

**P0 — Inventory drift.** `state/shared/slash-commands-inventory.json` lists commands like `forge2.md`, `rgs2.md`, `rgs3.md` under `H:/prism/.claude/commands/` that **don't exist there** (only user-global copies). The inventory needs regeneration before Phase 2 — downstream scrutiny will mis-target if a command is named in the inventory but the file isn't in the tree the reviewer reads.

**P2 — Inventory schema field-name mismatch.** `records[].slug` reads `undefined` for many entries; the consumer code (this verdict-builder script + likely others) expected `slug` but the inventory uses a different key. Document the canonical schema in the schemas dir.

**Doctrine drift — "13 categories" vs 31 buckets.** ACP-MS0 envelope spec says 13; inventory has 31. Per R7, do not silently average — amend ACP-MS0's doctrine to match the 31-bucket reality, OR collapse the 31 down to 13 macro-categories with rationale. (Recommend the former — the 31-bucket grouping landed deliberately during inventory regen 2026-05-13.)

## Phase 2 remediation order (recommended)

1. **Backfill wiki entities** — generate 301 stubs in `knowledge/wiki/os/commands/<slug>.md` (1-line description + frontmatter `kind: command, slug: <name>`). Stub generator is the safe minimum-viable fix; richer entries can be co-authored later. Single biggest exit-condition gap.
2. **Templatize the ~15 high-impact hardcoded counts** in `continue-roadmap.md`, `rgs.md`, `dispatcher-coverage.md`, anywhere else baking `"576+ actions"` / `"79 dispatchers"` / `"3310+ actions"`. Either inject from `PRISM-INVENTORY-LATEST.md` at invocation or replace with `<N>` placeholders.
3. **Sweep executable hardcoded paths → repo-relative** in commands that execute the path (NOT doc pointers). Slot-worktree portability is load-bearing — without this, `/checkin-<slot>` worktrees produce stale results.
4. **Resolve cross-scope duplicate slugs** — 11 slugs span both project (`H:/prism/.claude/commands/`) and user-global (`H:/.claude/commands/`); pick one canonical scope per slug or rename (echo of U-CK09's `/handoff` + `/boot` decisions doc).
5. **Backfill ~80 missing `description:` fields** — human-authored, not synthesized. Codemod surfaces the list via `--dry-run | grep "missing/empty required \`description\`"`.
6. **Regenerate `slash-commands-inventory.json`** to fix the drift (commands listed-but-absent + `slug` field name).
7. **Reconcile ACP-MS0 "13 categories" doctrine** with the 31-bucket reality.
8. **Scrutinize the remaining 28 buckets** (Phase 3+).

## Phase 1 deferrables (per `tests_required:false` + envelope exit "P2/P3 logged here")

- **Tools-allowlist gaps (P2)** — most commands omit `allowed-tools:` frontmatter. Advisory until a command actually invokes a tool the operator hasn't pre-authorized.
- **Name-slug mismatches (P2)** — codemod's `--apply` deterministically fixes these.
- **Boilerplate-hash sweep (P2)** — codemod has bucket-level summary but no `--json` output today; expose JSON for downstream consumption.

## Verdict

**Phase 1 verdict: FAIL** (3-of-3 buckets sampled all FAIL — arm A holistic + arm B independent both FAIL, convergent on the same P0s).

**Unit status:** COMMAND-KERNEL-MS0/U-CK11 stays `(none)` (NOT flipped to `complete`) until at least the wiki-entity backfill (#1) + the high-impact baked-count templatization (#2) ship. The envelope's third exit condition ("all P0/P1 findings fixed") is far from met; this doc IS the comprehensive enumeration of those findings.

**Next iter (per /loop):** Phase 2 = wiki-entity backfill (the single biggest gap). Stub generator is mechanical and unblocks U-CK08 exit #3 across 301 commands in one pass.

---
*Reviewer agentIds — for SendMessage follow-up if needed:*
- arm A: `a19121fab04d4a4ea` (25 tool uses, 230s)
- arm B: `a3ae2ecaa823ff063` (14 tool uses, 153s)
