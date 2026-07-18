---
name: feedback_write_tool_space_to_nul_separator
description: A literal space inside a template-literal delimiter can land as a NUL byte (0x00) on Write — git binary-flags the file and cross-file parity silently breaks
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.455Z
aliases: feedback_write_tool_space_to_nul_separator
---


When writing a source file, a space character used as a **delimiter inside a template literal** (e.g. `` `${a} ${b}` ``) can be encoded as a **NUL byte (0x00)** rather than a real space (0x20). Observed 2026-05-29 (slot:india, MS1-U6): three separators in `cheapFingerprint`/`corpusFingerprint` became NUL.

**Why it's dangerous (silent + compound):**
- TS/esbuild/vitest **tolerate** the NUL (it parses; tests pass) because the file is self-consistent — so the engine's own tests never catch it.
- `git` flags the file **binary** (`Bin 0 -> N bytes` in `git show --stat`) — diffs/reviews/tooling break.
- A sibling file (a vendored CLI, a KEEP-IN-SYNC copy) written with a *real* space then hashes **differently** for identical input → cross-file parity is silently broken even though both "look identical" in an editor.

**How to apply:**
1. For hash/fingerprint delimiters, prefer an explicit printable char that can't appear in the data — `|` is illegal in Windows filenames (collision-safe) and printable (keeps the file text). Avoid relying on a typed space, and never use a literal NUL.
2. After writing a source file with separators/delimiters, verify: `node -e 'console.log(require("fs").readFileSync("F").indexOf(0))'` (must be `-1`) and watch for `Bin` in `git show --stat`.
3. When two files must agree (KEEP-IN-SYNC), assert byte-identity of the shared construct (`grep -hoE '<pattern>' fileA fileB`), don't eyeball it.

This is exactly the compound-error class the [[feedback_parallel_scrutiny_per_file]] gate + [[feedback_verify_actual_contract_not_proxy]] discipline exist to catch — the engine's own green tests are not sufficient proof of cross-file correctness. Related: [[feedback_read_tool_strips_control_chars]].
