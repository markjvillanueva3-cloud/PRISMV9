---
name: feedback-edit-tool-not-powershell-for-repo-files
description: "Standing rule (golf 2026-06-01): NEVER edit repo/source files with PowerShell [IO.File]::WriteAllText (or sed/perl on git-bash) — it strips the UTF-8 BOM (breaks Windows PowerShell 5.1 `-File` parsing of non-ASCII glyphs) and fights autocrlf (CRLF flips show as whole-file diffs; perl/sed on git-bash re-add \\r). Use the Edit/Write tool, which preserves the UTF-8 BOM/encoding that PowerShell strips (the Edit tool does write CRLF working-copies, but the repo .gitattributes eol=lf normalizes that to LF on commit -- see feedback_edit_tool_crlf_flips_lf_files). PowerShell is for process/service/scheduled-task ops only."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.424Z
aliases: feedback_edit_tool_not_powershell_for_repo_files
---



# Edit repo files with the Edit/Write tool, never PowerShell WriteAllText

**Why:** PowerShell `[IO.File]::WriteAllText(path, text, UTF8Encoding $false)` strips the UTF-8 BOM. Windows PowerShell 5.1 (`powershell.exe -File`, the scheduled-task re-register path) then reads the no-BOM file under CP1252 → em-dash/arrow/smart-quote glyphs become mojibake (`â€"`) → `UnexpectedToken` parse failure. Separately the autocrlf working-tree CRLF gets committed, flipping every line (a 2-glyph edit reads as `465 ins/465 del`). `sed -i 's/\r$//'` and `perl -i -pe 's/\r//g'` on git-bash do NOT fix it (perl's Windows text-mode re-adds `\r`). `[Parser]::ParseFile` (UTF-8 aware) calls the file clean while `powershell.exe -File` chokes — that discrepancy is the tell.

**How to apply:** For ANY repo/source/`.ps1` content change, use the Edit or Write tool (preserves the file's UTF-8 BOM/encoding -- PowerShell strips it; the Edit tool's CRLF working-copy is normalized to LF by the repo .gitattributes on commit, see [[feedback_edit_tool_crlf_flips_lf_files]]). Reserve PowerShell strictly for process / service / scheduled-task operations. If a `.ps1` must stay PS-5.1-`-File`-parseable, keep its UTF-8 BOM. Cost when ignored (2026-06-01): a multi-commit phantom "CRLF regression" rabbit hole whose net change ended up zero. Full detail: wiki [[windows-harness-fileops-process-persistence-git-contention]] · pairs with [[feedback_verify_actual_contract_not_proxy]] (PS 5.1 codepage mangles non-ASCII).
