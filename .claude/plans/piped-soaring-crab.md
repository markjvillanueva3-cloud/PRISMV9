# CADC34 Remediation — Git Corruption Purge + Envelope Cleanup

## Context

Git repository `H:/PRISM/.git` has a corrupted tree object: `18b53fe1232524bb3adafaacf7131ddfbb972005`. The tree file is **missing from disk entirely** (not empty — not present in `.git/objects/18/`). This causes `git status`, `git fsck`, and `git diff` to fail with `fatal: unable to read tree (18b5...)`. New commits still succeed (today's P0-19 commit `6c4275689` landed despite the corruption), but status/diff/log operations hang or crash, blocking the normal dev loop.

User has identified this corruption as originating from **`U-CADC34`** (`CADGauntletTestEngine — Draw every file from scratch`, the 9,794-file exhaustive regression harness in `CAD-COMPLETE-MS0`) and explicitly authorized deletion.

**Intended outcome**: (1) repo is healthy — `git status` / `git fsck` / `git log --all` run clean; (2) roadmap has zero references to U-CADC34; (3) the capability the gauntlet unit was meant to prove (every-file CAD regeneration) is preserved via the already-declared successor units.

## Scope — two independent tracks

### Track B — Envelope cleanup (ZERO-RISK, file edits only, ship first)

U-CADC34 is referenced in the following envelope positions. Each is a pure JSON edit:

| File | Location | Current state | After cleanup |
|---|---|---|---|
| `mcp-server/data/milestones/CAD-COMPLETE-MS0.json` | `units['U-CADC34']` (top-level keyed entry) | `status: "not_started"` with full CADGauntletTestEngine spec | `status: "superseded"` + `superseded_by: ["U-CADC-MSR05", "CAD-UIX-MS0:P8-SHOP-REAL-TIME"]` + `superseded_reason: "Git object corruption in implementation branch; remediated 2026-04-21; capability preserved by successor units."` Keep spec intact for audit. |
| Same file | `phases.PHASE-7.units[]` placeholder `U-CADC34 / "CAD-COMPLETE-MS0 unit 7"` | Duplicate placeholder stub | Remove this entry. The authoritative record is `units['U-CADC34']` (top-level). |
| Same file | `units['U-CADC-MSR05'].entry_conditions` | `["U-CADC-MSR04 complete", "U-CADC34 complete"]` | `["U-CADC-MSR04 complete"]`. `U-CADC-MSR05` itself already inherits the gauntlet scope (its title: "Regen-Full — All 9,794 files (existing U-CADC34 gauntlet wrapped)"); drop the circular dependency. |
| Same file | New top-level field `scrutiny_round_5_cleanup` | — | `{ date: "2026-04-21", action: "U-CADC34 superseded due to git object corruption in implementation branch", affected_units: ["U-CADC34", "U-CADC-MSR05"], corrupted_tree_oid: "18b53fe1232524bb3adafaacf7131ddfbb972005", capability_preserved_by: ["U-CADC-MSR05", "U-CUIX-P8-INFRA-02 GoldenCorpusRegistryEngine", "U-CUIX-P8-*-03 (6 per-CAD Print-to-CAD round-trip units)"] }` |
| `mcp-server/data/roadmap-index.json` | CAD-COMPLETE-MS0 entry `description` | — | Append `Round 5 cleanup (2026-04-21): U-CADC34 superseded — git corruption, capability preserved by MSR05 + CAD-UIX-MS0 P8 gauntlet units.` |

**Cross-check on my recent round-3/4 additions**: I added 163 + 14 + 56 = 233 units this session all prefixed `U-CUIX-*`, none reference `U-CADC34`. Verified by the same node -e scan I used earlier — no new dangling refs. Round 3 renames in CAD-COMPLETE-MS0 PHASE-30/31/33/34 touched only `U-CCCO*`, not `U-CADC34`.

**Track B ships independently** (one mutator script + one commit). Zero git-surgery risk. Does NOT fix the corruption — but removes the roadmap dangling reference so the envelope is internally consistent while Track A proceeds.

### Track A — Git repair (DESTRUCTIVE, needs explicit per-step confirmation)

The corrupt tree `18b5...` is referenced from somewhere in the commit graph (not a ref tip — all refs at `refs/heads/` and `refs/remotes/` resolved cleanly). Options, in safest-first order:

**A.option-1 (RECOMMENDED): Fresh clone from `origin` + replay local commits**

1. Read `.git/config` — remote is `https://github.com/markjvillanueva3-cloud/PRISMV9.git`. Remote has `origin/work/ai-aware-harden`, `origin/main`, several `claude/*` branches. **Does NOT currently have `origin/work/cad-complete-ms0`** (branch tip `6c4275689` is local-only).
2. Export local commits not on remote as patches: `git format-patch origin/main..HEAD -o /tmp/cad-patches/` (format-patch operates on the commit object itself — may succeed even with tree corruption elsewhere).
   - Today's commit `6c4275689` (P0-19 + 4 roadmap rounds) and any prior `work/cad-complete-ms0` commits since main divergence need to be rescued.
3. Preserve uncommitted working-tree changes: `rsync -a H:/PRISM/ H:/prism-backup-2026-04-21/` minus `.git`.
4. Fresh clone: `git clone https://github.com/markjvillanueva3-cloud/PRISMV9.git H:/prism-fresh/`.
5. Apply patches: `cd H:/prism-fresh && git checkout -b work/cad-complete-ms0 origin/main && git am /tmp/cad-patches/*.patch`.
6. Sync working-tree: merge any uncommitted-only files from the backup.
7. Rename folders atomically: `mv H:/PRISM H:/prism-broken-2026-04-21 && mv H:/prism-fresh H:/PRISM`.
8. Verify: `git status`, `git log --all --oneline`, `git fsck --full` — all must succeed without errors.
9. Push: `git push -u origin work/cad-complete-ms0` to persist the rescued work.

**Risk**: losing uncommitted work in non-mcp-server paths if backup missed anything. Mitigated by full rsync + manifest diff after folder swap. **Wall-clock**: ~10 min (clone dominated by network).

**Fallback A.option-2 (if format-patch fails): object surgery**

`git replace --graft HEAD HEAD~1` to sever the commit chain at the first post-corruption commit (making older ancestors unreachable), then `git reflog expire --expire=now --all && git gc --prune=now`. This keeps the repo in-place but rewrites history — changes commit hashes of anything on top of the graft. Only viable if nobody else has pulled `work/cad-complete-ms0` (and since it's not on origin, nobody has).

**Nuclear A.option-3 (last resort): filter-repo to strip the bad tree**

`git filter-repo --strip-blobs-with-ids <bad-tree-oid>`. Destroys ancestor-commit hashes but guarantees corruption is gone. Requires `git-filter-repo` install (not shipped with git). Avoid unless A.1 and A.2 both fail.

---

## Critical files

| File | Track | Change |
|---|---|---|
| `mcp-server/data/milestones/CAD-COMPLETE-MS0.json` | B | Mark `U-CADC34` superseded; remove PHASE-7 placeholder; update MSR05 entry_conditions; add `scrutiny_round_5_cleanup` |
| `mcp-server/data/roadmap-index.json` | B | Append round-5 note to CAD-COMPLETE-MS0 description |
| `scripts/one-off/cadc34-cleanup.mjs` | B (NEW) | Idempotent audit-trail mutator, pattern matching `cad-uix-round2/3/4.mjs` |
| `.git/` | A | Repair via clone/graft/filter-repo |

### Reused, not reinvented

- Envelope mutator pattern from `scripts/one-off/cad-uix-round2.mjs` / `round3.mjs` / `capability-lock.mjs` / `p8-realtime.mjs` — same JSON load → mutate → `JSON.stringify(…, null, 2) + "\n"` write shape
- `scrutiny_round_N_findings` field convention from existing envelope (rounds 1–4 already present)
- Superseded-by pattern from earlier cap-lock work that marked 10 CADCAM-AGI/DEEPAGI envelopes as `status: "superseded"` with `superseded_by: […]`

---

## Verification

### Track B (envelope cleanup)
1. **JSON parse gate** — `node -e "JSON.parse(readFileSync('.../CAD-COMPLETE-MS0.json'))"` silent.
2. **No dangling refs** — scan every `entry_conditions` / `depends_on` / `dependencies` field in both envelopes; zero mentions of `U-CADC34` remain outside the superseded record itself.
3. **Unit count parity** — CAD-COMPLETE-MS0 top-level `units` keyed map has same count (U-CADC34 kept but status=superseded); `phases.PHASE-7.units[]` length = prior length − 1.
4. **Round-5 block present** — `scrutiny_round_5_cleanup.corrupted_tree_oid === "18b5…"`.
5. **Index mirrored** — roadmap-index.json description ends with `Round 5 cleanup…`.

### Track A (git repair) — per option
1. **A.option-1**: `git fsck --full` exits 0; `git status` clean; `git log --oneline work/cad-complete-ms0 | head` shows `6c4275689 CAD-UIX-MS0/U-CUIX-P0-19:…`; `cd mcp-server && npx vitest run src/__tests__/CADAdapterRegistry.test.ts` → 37/37 pass.
2. **Push sanity**: `git push -u origin work/cad-complete-ms0` succeeds (so work is durable).
3. **Working-tree parity**: `diff -r H:/prism-broken-2026-04-21/mcp-server H:/PRISM/mcp-server` → no differences except known ephemeral files (state/, .cache/).

---

## Non-goals

- **Re-implementing the gauntlet unit**: U-CADC34's concept is intentionally preserved by the already-declared successor units (`U-CADC-MSR05` + `CAD-UIX-MS0/P8-SHOP-REAL-TIME` 48 per-CAD real-time tests + 8 shared infra). No new unit work is needed to cover the capability.
- **Touching other worktrees**: The 14 other worktrees (`H:/prism-*`) each have their own `.git` and are unaffected by this corruption. They stay untouched.
- **Changing remote URL or credentials**: we use existing `origin`.
- **Running the P8 gauntlet tests now**: those require live licenses and are a future milestone — this cleanup only PRESERVES the roadmap slot; it does not execute anything.

---

## Decision points the user needs to choose at ExitPlanMode

1. **Track order**: commit Track B first (envelope clean, roadmap consistent), then do Track A (repo repair) — vs — do A first so we can commit B without the hanging-status issue. **Recommended: B first.** B commits fine even with current corruption (as today's P0-19 did); once B lands, tackle A with a clean roadmap.
2. **Track A option**: A.option-1 (fresh clone) vs A.option-2 (graft) vs A.option-3 (filter-repo). **Recommended: A.option-1** — safest, preserves all commits, cleanest final state. Only blocker is ~10 min of network clone time.
3. **Push policy post-repair**: push `work/cad-complete-ms0` to origin after A completes so the rescued commit is durable. **Recommended: yes.**
