---
name: feedback_scripted_multifile_edit_corruption_guard
description: Scripted bulk multi-file source edits (PowerShell WriteAllText / sed-style) can silently corrupt a file; ALWAYS re-run tsc + a corruption scan + git-diff-vs-HEAD before landing. Prefer the Edit tool for source mutations.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.443Z
aliases: feedback_scripted_multifile_edit_corruption_guard
---


**2026-05-31, slot:hotel — money-util hoist (U-QBP-P1).** While migrating ~24 engines' `roundCentsHalfEven` import via PowerShell `[System.IO.File]::WriteAllText`, a follow-up *comment-fix* literal-replace pass silently **corrupted `SalesOrderEngine.ts` with systematic uppercase R→E** (`THROWS`→`THEOWS`, `WIRE`→`WIEE`, the IDENTIFIER `SALES_ORDER_POLICY_SCHEMA_VERSION`→`SALES_OEDEE_POLICY_SCHEMA_VEESION`, method `backorderReport`→`backorderEeport`). Lowercase was untouched; the literal `.Replace()` logic could not produce R→E — the mechanism was never explained (suspected encoding/IO artifact on this exFAT/H: drive, same family as the documented BusinessSyncEngine 320-byte stub corruption).

**Why:** a corrupted financial engine landed to MAIN would have broken `SALES_ORDER_POLICY_SCHEMA_VERSION` resolution + renamed a public method — a real regression, and it nearly shipped because the corruption sat in a comment-fix pass run AFTER the verifying tsc/vitest.

**How to apply:**
1. **Prefer the Edit tool over scripted find-replace for SOURCE files.** Reserve PowerShell `WriteAllText`/literal-replace for genuinely mechanical, identical-line changes — and even then, treat the output as unverified.
2. **After ANY scripted multi-file edit, BEFORE staging/landing:** (a) re-run `tsc --noEmit` (count must equal the pre-edit baseline), (b) run a corruption scan for telltales (`rg 'PEISM|THEOW|VEESION|OEDEE|WIEE'` — uppercase-R→E markers), (c) `git diff` the touched files and confirm the diff is ONLY the intended change (no surprise hunks in unchanged regions).
3. **Recovery:** `git checkout HEAD -- <file>` restores the clean committed version; re-apply only the intended change via Edit. (Here: restored SalesOrderEngine from HEAD, re-did the 1-line import via Edit, re-verified tsc-0 + 136 vitest + corruption-0, then landed.)
4. The reviewers' per-file PASS was issued on the (clean) reviewed content; the corruption was a transient working-tree artifact caught + reverted, so the landed state matched what was approved. Don't let a green review lull you past the final pre-land diff check. [[feedback_verify_actual_contract_not_proxy]] · sister to [[feedback_each_slot_merges_own_galaxy]].
