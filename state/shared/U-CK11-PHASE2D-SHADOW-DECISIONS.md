# U-CK11 Phase 2D — Command-Corpus Shadow & Gitignore Decisions

**Status:** Decided 2026-05-23 by slot:mike (`claude-e5840fb7`)
**Echoes:** [`state/shared/U-CK09-lifecycle-decisions.md`](U-CK09-lifecycle-decisions.md) — same DOCUMENT-AS-EXISTING pattern
**Unblocks:** Phase 2BC retry — [`scripts/u-ck11-phase2bc-edits.mjs`](../../scripts/u-ck11-phase2bc-edits.mjs) (24 mechanical edits codified in iter-3, blocked from landing in git by the constraints resolved here)
**Pin to verdicts:** [`state/shared/U-CK11-scrutiny-verdicts.md`](U-CK11-scrutiny-verdicts.md) Phase 1 findings — many are about **shadowed** project-local files; the FIX has to target the canonical surface.

## The two stacked constraints

1. **`.gitignore` line 67** — the entire `.claude/commands/` directory is gitignored at the project root. Files inside are not tracked unless force-added. Of the 9 files Phase 1 reviewers identified P0/P1 findings against, only `big-blob-hunt.md` was pre-tracked.
2. **Skill-loader shadow rule** — for any slug present in BOTH `H:/.claude/commands/` (user-global, mirrored from `C:/Users/<user>/.claude/commands/` via the `c-to-h-mirror` hook) AND `H:/prism/.claude/commands/` (project-local), the **user-global wins** and the project-local copy is silently shadowed. Documented in `state/shared/U-CK09-lifecycle-decisions.md` §"Decision: /handoff → DOCUMENT-AS-EXISTING".

## Phase 1 reviewer methodology hole

Both Phase 1 reviewers (arm A holistic + arm B independent) sampled `H:/prism/.claude/commands/*.md` and reported findings as if those files were canonical. Per the shadow rule, for any slug also present user-global, **the project-local file is dead** — operators across the 26-slot fleet never see those edits.

Iter-3 found this empirically when applying `scripts/u-ck11-phase2bc-edits.mjs`:

| Slug | User-global present? | True canonical |
|---|---|---|
| `rgs` | YES (569L) | user-global |
| `forge-audit` | YES (156L) | user-global |
| `envelope-sync` | YES (123L) | user-global |
| `dedup` | YES (119L) | user-global |
| `continue-roadmap` | no | project-local |
| `generate-roadmap` | no | project-local |
| `rgs-sync` | no | project-local |
| `close-out` | no | project-local |
| `big-blob-hunt` | no | project-local (and tracked) |

## Decisions

### Decision A — user-global commands stay user-global-canonical (do NOT create project-local copies)

For these 4 slugs, the fix target is `C:/Users/<user>/.claude/commands/<slug>.md`, which the `c-to-h-mirror` hook auto-replicates to `H:/.claude/commands/<slug>.md`:

| Slug | Reason |
|---|---|
| `rgs` | Operator-facing brainstorm pipeline used across fleet |
| `forge-audit` | Fleet-wide codebase audit skill |
| `envelope-sync` | Roadmap-drift skill operators run from any slot |
| `dedup` | MANDATORY pre-create check (per CLAUDE.md §Duplication Guard) |

**Rationale (mirrors U-CK09):** A project-local copy would be shadowed by skill-loader. Adding a shadowed file misleads operators reading the project tree. User-global is the single canonical surface; the project tree gets out of its way.

**Fix application:** Re-run `scripts/u-ck11-phase2bc-edits.mjs` with `--commands-dir C:/Users/<user>/.claude/commands` (a Phase 2BC v2 spawn) targeting only these 4 files. The c-to-h-mirror hook propagates to H: on save. The project-local mirrors (currently containing iter-3 disk edits) get re-overwritten by the mirror hook on its next pass, returning them to whatever the C: source is post-edit.

### Decision B — project-local-only commands stay project-local-canonical, with gitignore exceptions

For these 5 slugs, no user-global copy exists; the project-local file is the canonical surface. Currently untracked. The right move is to **track them via gitignore exceptions**, not move them user-global, because their content is PRISM-specific (references PRISM milestones, roadmap files, dispatchers) and would not benefit other projects:

| Slug | Content scope |
|---|---|
| `continue-roadmap` | Drives PRISM-UNIFIED-ROADMAP-v2.md from current position |
| `generate-roadmap` | Generates PRISM milestone roadmaps |
| `rgs-sync` | Syncs `state/shared/ROADMAP_COLLABORATION_STATE.md` |
| `close-out` | Runs `scripts/close-out-milestone.mjs` |
| `big-blob-hunt` | Audits THIS repo's git pack for large blobs |

**Fix application:** Append a `.gitignore` exception block for these 5 slugs (`!.claude/commands/continue-roadmap.md`, etc.). Then `git add` them and commit. Phase 2BC's iter-3 disk edits already applied the right content — those edits land on first add. Re-runnable: `scripts/u-ck11-phase2bc-edits.mjs` is idempotent.

### Decision C — 11 cross-scope duplicate slugs from Phase 1 verdicts get pruned project-side

The Phase 1 verdicts flagged these 11 slugs as cross-scope duplicates causing shadow-rule risk:

`rgs`, `rgs2`, `rgs3`, `envelope-sync`, `awareness-check`, `dedup`, `scrutinize`, `verify-loop`, `forge-audit`, `forge-triple`, `forge2`

For each: per Decisions A+B, the project-local copy serves no purpose (always shadowed). Resolution: **delete the project-local copy** from `H:/prism/.claude/commands/` for any slug whose user-global copy exists. The `c-to-h-mirror` hook is C: → H: only and does NOT propagate H: deletions back to C:, so deletion is safe (won't damage user-global).

**Out-of-scope guard:** do NOT touch `H:/.claude/commands/<slug>.md` user-global from a project-tree commit. Those edits go through the `c-to-h-mirror` chain only (edit C:, mirror to H:). Per CLAUDE.md global instructions: "Editing H: directly is allowed but won't replicate back to C: — the hook is C: → H: only." Direct H: edits drift; correct.

### Decision D — out-of-scope items not addressed by this doc

- **`forge-triple`** appears in the dup-slug list but its disposition wasn't in iter-3's 9-file edit set. Phase 2BC v2 should include it explicitly (currently the user-global version owns it; project-local is shadowed).
- **`forge2`/`rgs2`/`rgs3`** — these are version-suffixed variants. Phase 1 verdicts flagged inventory listing them under project scope when only user-global exists. Inventory regeneration (separate Phase 2E item) fixes this; no decision needed here.
- **MCP dispatcher-action wiring** — psk syscalls already in-process invokable per U-CK09; no new dispatcher action needed for `/big-blob-hunt`, `/close-out`, etc.

## Acceptance (mirrors U-CK11 envelope exit conditions for Phase 2)

- [x] Phase 2BC v2 re-run: ran from `C:/Users/wompu` cwd against user-global dir — 12 replacements applied to `rgs.md` (5), `forge-audit.md` (6), `envelope-sync.md` (1); `dedup.md` was already clean (0 matches). Mirror verified: `diff -q C:/Users/wompu/.claude/commands/<slug>.md H:/.claude/commands/<slug>.md` returns empty for all 4.
- [x] `.gitignore` exception block added for the 5 project-local-only slugs (commit `18cc9e3f1a`, Phase 2BC v2-1 / iter-4)
- [x] Project-local shadowed copies deleted — 8 of 11 (`rgs`, `envelope-sync`, `awareness-check`, `dedup`, `scrutinize`, `verify-loop`, `forge-audit`, `forge-triple`); 3 already absent (`rgs2`, `rgs3`, `forge2`). All untracked → plain `rm`, no `git rm` needed. c-to-h-mirror is C:→H: only, so deletions don't propagate to user-global.
- [x] Phase 2BC v2 commit lands on `cad-fusion-live-ms0` (v2-1 `18cc9e3f1a` for tracked artifacts; v2-2 / v2-3 are operator-side state with no PRISM repo footprint by design)
- [ ] Wiki entity stubs from Phase 2A (`knowledge/wiki/os/commands/<slug>.md`) reflect the canonical-scope decision via a `canonical_scope:` frontmatter field (next iter's enrichment pass; not blocking this acceptance)

## Phase 2BC v2 — concrete ordered work for the next /loop iter

1. **Edit `.gitignore`** — append `!.claude/commands/continue-roadmap.md` (etc.) for the 5 project-local-only slugs in the block right after line 67's `.claude/commands/` entry.
2. **Re-run `scripts/u-ck11-phase2bc-edits.mjs`** — apply the 24 mechanical edits to the canonical surface. For the 4 user-global commands, target `C:/Users/<user>/.claude/commands/` (mirror auto-propagates). For the 5 project-local-only, the H: edits from iter-3 may have been overwritten by a c-to-h-mirror pass; re-run is safe (idempotent).
3. **Delete shadowed project-local copies** — 11 slugs per Decision C. `git rm` the tracked one (`big-blob-hunt.md` is NOT in this set; it's project-local-only and stays). Plain `rm` for untracked.
4. **`git add` + commit** — single commit titled `[MAIN] [COMMAND-KERNEL-MS0]/U-CK11-PHASE2BC-V2 (slot:mike): apply Phase 2D-resolved Phase 2BC edits to canonical surfaces`.
5. **Update `MILESTONE_PROGRESS.json`** — regen (Phase 2A already exposed exit #3 satisfaction; Phase 2BC v2 closes the remaining P0s).

## Source-of-truth pointers (do NOT relitigate)

- The shadow rule itself: [`state/shared/U-CK09-lifecycle-decisions.md`](U-CK09-lifecycle-decisions.md) §"Decision: /handoff → DOCUMENT-AS-EXISTING" + §"Future migration path"
- The c-to-h-mirror hook (C: → H:, one-way): `H:/prism/.claude/hooks/mirror-c-to-h.mjs` + global CLAUDE.md header note
- The 9-file finding set: [`state/shared/U-CK11-scrutiny-verdicts.md`](U-CK11-scrutiny-verdicts.md) §"Bucket: roadmap/audit/forge"
- The codified edit script (iter-3 deliverable): [`scripts/u-ck11-phase2bc-edits.mjs`](../../scripts/u-ck11-phase2bc-edits.mjs)

— Decided 2026-05-23, slot:mike (claude-e5840fb7), COMMAND-KERNEL-MS0/U-CK11 Phase 2D, iter-4 of the /loop campaign.

## Phase 2BC v2 close-out — iter-5 of the /loop campaign (2026-05-23)

Phase 2BC v2 items #2/#3/#5 closed in iter-5 (this session, slot:mike, `claude-e5840fb7`):

- **v2-2** (Decision A edits to user-global commands at C:): 12 replacements landed across `rgs.md` (5), `forge-audit.md` (6), `envelope-sync.md` (1). `dedup.md` had 0 matches (already-clean from prior peer work). H: mirror in sync.
- **v2-3** (Decision C deletions of shadowed project-local copies): 8 plain-`rm` deletions on `H:/prism/.claude/commands/`. 3 of the original 11 (`rgs2`, `rgs3`, `forge2`) were already absent — no-op. All 8 were untracked per the `.gitignore` post-v2-1 state (only the 5 negation-excepted commands are tracked), so deletions produce no git footprint.
- **v2-5** (MILESTONE_PROGRESS regen): re-run picked up the v2-1 commit `18cc9e3f1a` along with the rest of the fleet's recent shipping → 2590/5487 shipped (192 drift cases remain, fleet-wide — separate close-out drift, not blocking U-CK11).

The Phase 2A wiki entity stubs (`canonical_scope:` frontmatter field per Decision A/B) remain as a non-blocking deferral. U-CK11 envelope status is canonical at the task-list level (`completed` per task #4). This doc serves as the historical record for the Phase 2D resolution + v2 close-out evidence.
