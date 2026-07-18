---
name: reference_statusline_tdz_regression_2026_05_29
description: statusline.mjs crashed fleet-wide — `const mp` used `taSidecar` 38 lines before its `const` declaration (TDZ ReferenceError); single end-of-file stdout write means ANY throw blanks the entire 4-line UI
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.211Z
aliases: reference_statusline_tdz_regression_2026_05_29
---


2026-05-29 (slot:bravo): operator reported "can't see the chat names and the hp bar anymore." Root cause in `H:/prism/.claude/statusline.mjs`: commit `1dbda26868` (U-PLB01, MP-5h-quota) added `const mp = mpFrom5hQuota(taSidecar) ?? …` at line 167, but `const taSidecar = readTokenAwarenessSidecar(mySlot)` wasn't declared until line 205 → **temporal dead zone** `ReferenceError: Cannot access 'taSidecar' before initialization`.

**Why the WHOLE UI vanished (not just one line):** statusline.mjs computes everything top-level then does ONE `process.stdout.write(\`${line1}\n${line2}\n${line3}\n${line4}\`)` at the very end. A throw anywhere above → zero output → Claude Code shows its bare default → operator loses slot badge, HP bar (line2), chat-names party row (line3), services, worktrees — all at once. The file's OWN comment (lines 177-182) documented this exact TDZ class biting before (U-TA15: `C.grn` used before `const C`). It regressed anyway.

**Fix** (`15602c5a0d`, `[MAIN] [STATUSLINE-HOTFIX]`): relocated the MP-derivation block (`const mp`/`mpPct`/`mpInvert` + comments) to AFTER the `taSidecar`+ctx declarations. Pure move, no logic change. Verified: `node --check` clean + live re-run emits 4 lines, exit 0, HP+🤝party+MP all present.

**Lesson:** in a long top-level module whose only output is one terminal write, a `const`/`let` used before its declaration is fatal to the ENTIRE render, and silent (statusline is `try/catch`-wrapped per-probe but a top-level TDZ throws before the final write). When adding a consumer of a module-scope `const`, place it BELOW the declaration — or the file needs a TDZ guard / lint rule (`no-use-before-define`). Reproduce/verify any statusline edit with: `echo '{"session_id":"<sid>","transcript_path":"<path>"}' | node H:/prism/.claude/statusline.mjs` → expect 4 lines, exit 0.

**Gotcha:** the file is CRLF (`\r\n`) on this PC — string fixes must be EOL-tolerant (line-array split, not raw `\n\n` match). See [[feedback_verify_actual_contract_not_proxy]] (verify the real render, not a proxy). Lane note: live shared file in main tree `H:/prism`; fixed via operator-authorized `node`-Bash write + path-scoped `[MAIN]` commit from slot:bravo (Edit-tool guard `main-tree-write-block` doesn't cover Bash writes). Related: [[feedback_all_slots_free_access]].
