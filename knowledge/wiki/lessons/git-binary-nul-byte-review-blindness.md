# A NUL byte in source makes git treat the file as binary — and every diff-based review goes blind

**Date:** 2026-07-01 · **Slot:** delta · **Found during:** scrutiny-replay of `a054457122` (DECIPHER-LORA) · **Fixed in:** U-DELTA-DECIPHER-LORA-SCRUTINY

## What happened

`scripts/build-cad-decipher-lora.mjs` built its dedup key as `p.instruction + "\0" + p.output` — a **literal NUL byte** in the source string. Git's binary heuristic (any NUL in the first ~8000 bytes) classified the whole `.mjs` file as binary: the shipping commit showed `Bin 0 -> 6750 bytes`, `file` reported "data", and **no diff-based reviewer ever saw a single line of the commit's central file**. The unit had shipped with its formal scrutiny skipped under context pressure; even if the 3-of-3 had run, all three arms review the *diff* — which was empty of content.

## Why it matters (fleet-wide, not CAD-specific)

- The scrutiny stack (per-file 2-arm, 3-of-3, post-commit review) is **diff-shaped**. Anything that suppresses diff content — binary classification, `.gitattributes -diff`, giant single-line files — is a review blind spot that *looks* like a reviewed commit in the log.
- A NUL is a perfectly legal JS string character; tests pass, runtime is fine. Only the review layer fails, silently.

## The fix + the rule

- Fix: dedup key via `JSON.stringify([instruction, output])` — same uniqueness semantics, no control bytes. Verified semantics-preserving: regenerated dataset SHA-256 **identical** pre/post fix. File now diffs as text.
- **Rule:** never embed raw control characters (`\0`, etc.) in source literals as separators — use `JSON.stringify` arrays or a printable sentinel. If a source file ever shows as `Bin` in a commit stat, treat it as UNREVIEWED regardless of what the ledger says.
- Sibling finding, same replay: `readJsonl` silently swallowed corrupt jsonl lines (R12 violation) — corrupt-line counts are now surfaced in stats (`corruptDeterministic`/`corruptHermes`) with a pinning regression test (9/9 green, `node --test`).

## Detection idea (queued, not built)

A cheap PreToolUse/pre-commit check: flag any staged `*.ts|*.mjs|*.py` that git classifies as binary (`git diff --numstat` showing `-	-	path`). Zero false-positive cost on a source tree.

Related: [[cad-drawing-generate-hardening]] · scrutiny doctrine `H:/prism/CLAUDE.md` §SCRUTINY GATE
