---
name: feedback_git_bash_large_file_garbage
description: "Git Bash (MSYS) stat/wc/head/du return GARBAGE on files >2GB on H: — use PowerShell or node fs for large-file sizing"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.428Z
aliases: feedback_git_bash_large_file_garbage
---


**Git Bash (MSYS coreutils) silently mis-reports files larger than ~2GB on this host (H: drive).** `stat -c %s`, `wc -l`, `head`, and even `du` return WRONG sizes AND corrupted content for a multi-GB file — not an error, just garbage that looks plausible.

**Why:** the MSYS coreutils build uses narrow (32-bit/signed) file-offset handling for some ops, so a >2GB (and especially >4GB / >2^37) file overflows. Observed live 2026-06-17 (slot:oscar): a **221.5GB** `speed_feed.jsonl` was reported by Git Bash `stat` as **7,191,450 bytes (7.2MB)**, by `wc -l` as **688 lines**, and `head` returned content with a DIFFERENT (older) first-line timestamp than reality — its mtime even appeared to go *backwards*. This sent a whole investigation down a false "the 222GB vanished / was restored from a backup" path before PowerShell `Get-Item .Length` gave the truth (still 221.5GB, real mtime).

**How to apply:** for any file that might be >2GB, size/inspect it with a tool that handles 64-bit offsets:
- **PowerShell** (authoritative on Windows): `(Get-Item $f).Length`, `Get-ChildItem $d -File | Measure-Object Length -Sum`.
- **node** `require('fs').statSync(path).size` (Number, fine to 2^53) — works in Bash too, unlike `stat`.
- For content sampling of a huge file, stream via node, not `head`/`tail`/`sed`.
- A file's mtime appearing to move *backwards*, or a size that shrank impossibly between two reads, is the signature of this bug — re-measure with PowerShell before concluding anything was deleted/restored.

Sibling of the V8 512MB string-cap findings (`reference_tribal_index_v8_string_cap_2026_06_08`): both are "a tool silently returns wrong data on a too-big input." Related: [[reference_oscar_sfc_per_machine_core_complete_2026_06_17]].
