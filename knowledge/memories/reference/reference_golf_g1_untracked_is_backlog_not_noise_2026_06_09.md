---
name: reference_golf_g1_untracked_is_backlog_not_noise_2026_06_09
description: "G1 (golf plan) FINDING + R12 premise-correction: the 22,302 git-status untracked lines (= 75,233 individual files) are NOT ignorable noise — they're a genuine fleet-wide UNCOMMITTED-WORK BACKLOG (16,662 wiki/tribal knowledge in alpha's domain + 68 real src .ts + 648 milestone envelopes). No safe broad gitignore exists (knowledge/wiki has 17,472 TRACKED files; *.hash has 56 tracked; *.out/*.err have tracked members). Golf safely quarantined ONLY 51 unambiguous ephemeral strays (.tmp-*/*.pid/scrutiny/audit/commit-msg) to LOCAL .git/info/exclude; the knowledge-tracking decision is pending operator policy (matches the pre-existing golf 05-30 quarantine note)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.596Z
aliases: reference_golf_g1_untracked_is_backlog_not_noise_2026_06_09
---


**2026-06-09 (slot golf, /loop budget-iter-A G1 = noise-filter the untracked files).** Outcome: **CLOSED with R12 premise-correction.** The G1 spec ("noise-filter ~22K untracked → drop the count via exclusion globs") was substantially WRONG about what those files are.

**Ground truth (git ls-files evidence, not assumption):**
- `git status --porcelain` = **22,302 untracked lines**; `git ls-files --others --exclude-standard` = **75,233 individual files** (status collapses untracked dirs to one `?? dir/` line).
- Dominant bucket: `knowledge/wiki/` = **16,662 untracked** — but it ALSO has **17,472 TRACKED** files. It's an actively-tracked source tree, NOT a regenerable mirror. `architecture/formulas` was deliberately committed before (`bc8d2abadf` "133 formula/algorithm wikis"); `architecture/actions` = 9,242 tracked. The untracked are a **commit backlog of genuine knowledge**, not junk.
- `mcp-server/src` untracked = **68 genuine .ts** (HypervolumeIndicator, LBFGSBOptimizer, PersonalizedPageRank, TSNEAlgorithm, academy course data) — real uncommitted source.
- `mcp-server/data` untracked = 648 milestone envelopes + 228 state + 83 docs — genuine generated state.
- **No safe broad exclusion exists:** `*.hash` has 56 tracked, `*.out`/`*.err` have tracked members, and the bulk dirs are tracked source trees. Any blanket `knowledge/wiki/**` or extension glob would HIDE genuine tracked-adjacent work — the exact silent-source-hiding the plan's done-criterion ("0 tracked/real asset excluded") forbids.

**What golf DID (the safe slice):** appended 14 verified-zero-tracked patterns to **`.git/info/exclude`** (LOCAL-only, uncommitted, unmirrored, reversible) — `.tmp-*`, `*.pid`, `/.scrutiny-prompt*`, `/.cache-hook-audit-*`, `/.audit-*`, `/.bucket-cache.json`, `/.resume_iter*.txt`, `/.commit-msg-*.txt`, `/.git-*-msg.txt`, `/.mcp.json.bak-*`, `/viz-*.png`, `/viz3d-*.png`, `/wiring-audit-output.txt`. Clears **51 ephemeral root strays** from this tree's status. `git check-ignore` verified: junk caught, genuine files (`.dockerignore`, `.env.example`, real `.ts`, wiki `.gitkeep`) stay visible. Zero blast radius.

**What golf did NOT do (soul + precedent):** did NOT gitignore the 16K knowledge corpus or 68 src files. The pre-existing `.git/info/exclude` block (`# golf 2026-05-30 quarantine … NOT a tracking decision … pending operator policy on wiki/memory/milestone tracking`) already established that golf DEFERS the knowledge-tracking decision to the operator. Gitignoring alpha's wiki corpus is also not-my-galaxy creep (golf soul refuse).

**HAND-OFF / OPERATOR DECISION:** the 75K untracked is a fleet-wide commit backlog. Owners should commit (or the operator should set a tracking policy): wiki/tribal corpus → **alpha** (Obsidian-brain/wiki owner); src `.ts` → respective galaxy owners; milestone envelopes → milestone owners. The git-status slowness (100s+ on the 31K-entry tree) is largely this backlog, not removable by golf alone.

Relates to [[reference_golf_queue_completion_plan_2026_06_09]] (G1), the pre-existing golf 05-30 .git/info/exclude quarantine, [[feedback_enumerate_before_read]].
