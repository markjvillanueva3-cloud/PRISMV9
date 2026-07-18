# Slot-Worktree Staleness Sweep — 2026-07-01 (slot:golf)

> Ref-level `git rev-list --left-right <slot>...cad-fusion-live-ms0` sweep after the kilo
> integration (`c069938c4c`) recovered 214 stranded commits / 237 lost CAM files. Every other
> slot branch carries the same class of debt. **~1,850 ahead-commits are stranded across 25
> branches** — kilo's case proved they can hold BOTH already-absorbed work AND genuinely
> unrecovered files (verify per-branch, never assume either way).

## Sweep (sorted by stranded ahead-commits — the recovery-risk order)

| branch | ahead (stranded) | behind trunk | last commit |
|---|---|---|---|
| slot/delta | 432 | 6410 | 2026-06-13 |
| slot/whiskey | 0 | ~0 | ✅ integrated 2026-07-01 (merge `888c7d2deb` on slot/whiskey; landed `95a7f88ca7` + post-merge fixes `c9de984128`: 30 grafted dispatcher actions, LoRA closed-loop engines, calibration-gate dual-wire to prism_safety; 4 superseded lathe_lora_model_* actions dropped for trunk's model_selector_* family; backup ref + stash + rescue dir kept pending whiskey ack) |
| slot/oscar | 225 adds staged | 0 (refreshed) | 🔶 REFRESHED 2026-07-02 (golf): trunk merged into slot/oscar (`225af2bb07` + defer-mods commit); branch = trunk + 225 pure adds. The 25 slot-side MODIFIED files (JohnsonCookModel, AutoSpeedFeed*, UltimateSpeedFeed etc.) took TRUNK -- oscar develops SFC on trunk (Loewen-Shaw fix landed same night); slot deltas preserved in `refs/backup/slot-oscar-pre-integration-20260702` + `H:/prism-slot-oscar-rescue-20260702/DEFERRED-SLOT-MODS-vs-trunk.diff` (577KB, 50 files) for oscar review. **TRUNK LANDING PARKED**: 25 of the 225 adds collide with oscar's LIVE UNCOMMITTED same-path rebuilds on the shared tree (sfc-combinatorial-*, CoatingVcModifier, SpeedFeedCatalogJoinerEngine...) -- git refuses the merge, and clobbering live work is the delta-consent boundary. Oscar: commit your in-flight files, then golf lands (or you cherry-pick from slot/oscar). |
| slot/mike | 0 | ~0 | ✅ integrated 2026-07-02 (golf): merge `85742a5f47` on slot/mike, landed `fa80d13cec` + paired-tests defer `cc82663ad9`. 146 adds recovered (WEDM comprehensive-training tests, JM lathe capability tests, print-accuracy gate hook, vision-OCR scripts); 16 slot-side engine mods deferred to trunk (content-conflicts vs actively-developed files) incl the **competing WEDMLoRADatasetBuilder implementations** -- india's live 4.9KB wrapper kept on trunk, mike's stranded 34KB comprehensive version banked in `H:/prism-slot-mike-rescue-20260702/` for mike+india reconciliation (R7). 2 recovered tests paired with deferred engine mods also deferred (banked in rescue/paired-tests -- reconcile engine+test together). Remaining recovered tests 36/36 + build green. Backup `refs/backup/slot-mike-pre-integration-20260702`. |
| slot/charlie | 0 | ~0 | ✅ integrated 2026-07-02 (golf): merge `6f59b6b69f` on slot/charlie, landed `b8159f4437` + paired-tests defer `863d343168`. 33 adds recovered net (prism-os-precheck hook+test 13/13, quote-charlie command, quoting wiki entries, VENDOR-DISTRIBUTOR-NETWORK spec); 25 slot code mods deferred to trunk (charlie develops quoting on trunk -- awareness regen shipped same day); 5 stale data snapshots dropped for live regen-owned copies; 2 paired hook tests deferred with their trunk-wins hooks (rescue/paired-tests); LatheCostPanel.test restore was whiskey's same-night new test racing in. Backup `refs/backup/slot-charlie-pre-integration-20260702`; rescue `H:/prism-slot-charlie-rescue-20260702/`. |
| slot/november | 100 | 6227 | 2026-05-26 |
| slot/bravo | 94 | 3003 | 2026-06-30 |
| slot/alpha | 89 | 6505 | 2026-06-17 |
| slot/lima | 85 | 6343 | 2026-05-29 |
| slot/foxtrot | 78 | 7342 | 2026-06-02 |
| slot/sierra | 58 | 4012 | 2026-06-12 |
| slot/golf | 54 | 6147 | 2026-06-12 |
| slot/hotel | 43 | 3220 | 2026-06-28 |
| slot/india (+premerge-backup 24) | 14 | 3201 | 2026-06-15 |
| slot/papa | 19 | 6224 | 2026-06-24 |
| slot/juliett | 16 | 7026 | 2026-05-25 |
| slot/echo | 13 | 7342 | 2026-06-29 |
| slot/tango | 10 | 6223 | 2026-05-25 |
| slot/zulu | 8 | 6221 | 2026-06-17 |
| slot/xray | 5 | 6222 | 2026-06-11 |
| slot/victor | 4 | 6222 | 2026-05-27 |
| slot/romeo | 3 | 2594 | 2026-06-16 |
| slot/quebec, uniform, yankee | 0 | 0 | ✅ fast-forwarded 2026-07-01 (golf; CRLF noise stashed, real changes rescue-copied to `H:/prism-slot-<s>-rescue-20260701/`, quebec's iOS-theme edit verified already-absorbed-and-evolved on trunk) |
| slot/kilo | 0 | ~0 | ✅ integrated 2026-07-01 (`c069938c4c`) |

**5 of 26 done** (kilo + whiskey integrated + 3 zero-ahead fast-forwards). Whiskey lessons for
the next integrations: (a) the schema/dispatcher graft must pull TRANSITIVE helper consts, not
just the named defs (ReferenceError at module load otherwise); (b) recovered test files can be
ASPIRATIONAL — whiskey shipped a test asserting a prism_safety dual-wire that never existed on
any branch (built it per R15 rather than deleting the test); (c) landing on the live shared tree
races peer-STAGED index entries — ort needs a clean index; retry in a clean window (seconds).
Note for the remaining 20:
every stale worktree checked so far carries the same ~35K-file CRLF-noise mask over a
handful of real changes — `git diff --numstat --ignore-cr-at-eol` is the mandatory first
triage step (recipe step 2).

## The proven reconciliation recipe (from the kilo integration — reuse verbatim)

1. **Backup ref first** (makes every later step reversible):
   `git update-ref refs/backup/slot-<name>-pre-integration-<date> slot/<name>`
2. **Dirty-tree triage** — `git -C <wt> diff --numstat --ignore-cr-at-eol` separates CRLF
   noise from real changes (kilo: 36,454 "dirty" → 12 real). Rescue-copy the real ones +
   untracked to `H:/prism-slot-<name>-rescue-<date>/` (plain FS copy, no git bloat), then
   `git stash push -m "pre-integration rescue"` (hook-sanctioned; never checkout-discard).
   ⚠ Untracked test fixtures may live in gitignored dirs (kilo: `JM_DIE_FEATURE_VECTORS_SAMPLE.json`)
   — tests will ENOENT after the sweep; restore fixtures from the rescue dir post-merge.
3. **Conflict probe without touching any tree**: `git merge-tree --write-tree trunk slot/<name>`
   → conflict list + the auto-merge tree id.
4. **Absorption verification (never assume — kilo's own "likely absorbed" was WRONG)**:
   diff the auto-merge tree vs trunk (`git diff --name-only trunk <mergetree>`) = what the
   merge genuinely adds; classify adds (recovered work, safe) vs modifications (inspect API
   surface + trunk consumers per file). `git cherry` alone is too strict (patch-id misses
   re-landed evolved work).
5. **Merge trunk → slot branch in the slot worktree** (NOT the shared tree — the MERGING
   window there entangles peers). Resolve conflicts with per-file verification; "trunk-wins"
   is usually right for fleet-shared files + anything the slot's owner kept developing in the
   shared tree, but PROVE it per file (check trunk supersedes, e.g. contains the slot fix in
   evolved form).
6. **Validate before landing**: esbuild syntax-sweep every merge-affected code file +
   conflict-marker grep; then land on trunk with an immediate commit (no `--no-commit` — a
   held index in the shared tree gets absorbed by peer commits), and run `build:fast` + the
   affected tests right after. Merge-revert (`git revert -m1`) is the escape hatch.
7. **Signal the slot owner** with backup/stash/rescue paths (240-char cap on golf-signal).

## Delta pre-integration analysis (2026-07-01, read-only — MERGE PARKED pending delta consent)

Delta is next in risk order but its worktree is ACTIVELY USED (207 real uncommitted
changes + 6,683 untracked — CAD regen outputs/corpus; the CAD CLIs run from
`H:/prism-slot-delta`). Unlike kilo (explicit request) and the 0-ahead trio (config-only
dirt), mutating it uninvited risks disrupting live work → consent requested via chat-bus.
Banked recon (refs-only, no tree touched):
- base `aa58c8f3eb` (2026-05-18); merge-tree `fcaf144f7ca1d2eca5f46dbab94af7e9393925a0`
- merge would change **3,390 files on trunk**: 265 code ADDS (recovered CAD work) + 9 code
  modifications (inspect API surface) + docs/data
- **31 conflicts** (`/tmp/delta-conflicts.txt` shape): fleet-shared → trunk-wins likely
  (CLAUDE.md, .gitignore, wiki index/log, precompact-handoff, MultiModelConsensus pair,
  graphsage-trainer, ollama-prism-bridge pair); delta-domain needs judgment
  (cadDispatcher.ts, cad galaxy docs ×4, cad-analyze-step.mjs, **13 cad-action-template
  JSONs + ARCHETYPE-RECIPES.json** — both sides evolved).
- Worktree rescue will be bigger than kilo's: 207 real changes to triage (not 12).

## Disposition

- Golf processes these gradually (≈1 per hygiene session, recovery-risk order: **delta →
  whiskey → oscar → mike → charlie …**), or a slot owner can request theirs next via
  chat-bus (kilo pattern). Each takes ~30-60 min with the recipe.
- Root cause remains: slots committing to the shared tree instead of their worktrees (see
  [[feedback_commit_to_slot_worktree]]) — the staleness re-accumulates until the
  commit-from-slot discipline is actually followed, which needs the worktrees usable, which
  needs these integrations. Chicken-and-egg broken one slot at a time.
