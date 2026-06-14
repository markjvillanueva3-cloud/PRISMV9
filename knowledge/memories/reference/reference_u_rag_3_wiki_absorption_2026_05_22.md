---
name: u-rag-3-wiki-absorption-2026-05-22
description: "U-RAG-3 wiki entry (contextual-retrieval-batch-driver.md) absorbed into whiskey's NODE-MEM-POINTER commit 8c96ebb8b4 via shared-tree git-add window. Content correct; attribution misroute. Sibling to spec/code commits 48d68448de + 621ab1fc34."
aliases: reference_u_rag_3_wiki_absorption_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.020Z
---


# U-RAG-3 — wiki entry peer-absorption (2026-05-22, golf)

## What happened

I wrote `knowledge/wiki/architecture/contextual-retrieval-batch-driver.md` for the [[reference_u_rag_3_batch_context_plumbing_2026_05_22|U-RAG-3-BATCH-CONTEXT-PLUMBING]] doc-reflection. Between my `git add` of the wiki file and my `git commit -- pathspec`, whiskey slot ran their own commit with a broader pathspec for `[NODE-MEM-POINTER]/U-NMP-CORE` and absorbed my staged file into commit `8c96ebb8b4`.

Result: my wiki entry shipped (file content at HEAD is exactly what I wrote — title/frontmatter/commits cite my real commits 92aa9279d6 + 48d68448de), but the git blame attributes it to whiskey. The matching code commit `48d68448de` and spec commit `621ab1fc34` carry the correct attribution.

## Classification

Same class as [[reference_h8_misattribution_2026_05_20]] and [[reference_git_index_saturation_camx11_2026_05_18]] — peer-absorption in a shared-tree git-add window. Pre-existing risk class of the shared `H:/prism` tree multi-chat fleet. NOT a regression of my changes; the slot-worktree migration is the real fix and a separate doctrine.

## Pragmatic close-out (chose this)

Leave it. File content is correct. Frontmatter cites my real commits. Anyone digging the file's origin can chase the citation. Re-committing a duplicate just to claim attribution would add noise to the log and confuse future readers about which version is canonical.

## Pattern to use next time

In the shared `H:/prism` tree, when shipping multiple files for a single unit:
1. Stage all files in ONE `git add` block.
2. Immediately follow with `git commit -- pathspec1 pathspec2 ...` (pathspec arg to commit) in the SAME bash invocation — no intermediate tool calls between add and commit.
3. The bash chain holds the git index for the call's lifetime, reducing the absorption window to the actual `git add` + `git commit` sub-second span.

## See also

- [[reference_u_rag_3_batch_context_plumbing_2026_05_22]] — the main U-RAG-3 close-out
- [[reference_h8_misattribution_2026_05_20]] — prior incident of same class
- [[reference_git_index_saturation_camx11_2026_05_18]] — pathspec-only commit pattern
