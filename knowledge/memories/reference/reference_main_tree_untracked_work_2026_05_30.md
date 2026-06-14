---
name: main-tree-untracked-work-2026-05-30
description: "The H:/prism main tree (cad-fusion-live-ms0) has ~34,200 UNTRACKED files — dominated by real content (wiki 3272, memories 1136, milestones 387) + real source (cad-engine/src, .claude/hooks/helpers/scripts), never git add'd. Not cruft — uncommitted fleet work."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.201Z
aliases: reference_main_tree_untracked_work_2026_05_30
---


**Finding (2026-05-30, slot golf).** `git status --short` in the shared main tree `H:/prism` (branch `cad-fusion-live-ms0`) shows **39,964 entries**: **34,200 untracked (`??`)** + 5,837 modified (`M`) + 3 deleted (`D`). The bulk is NOT line-ending churn (though `core.autocrlf=true` + NO `.gitattributes` does cause LF→CRLF warnings on the 5,837 M) and NOT generated cruft — it is **real fleet work that was created in the working tree but never committed.**

**Top untracked dirs (sample of 6000):**
| dir | count | nature |
|---|---|---|
| knowledge/wiki | 3272 | wiki entries (LLM-wiki) |
| knowledge/memories | 1136 | memory mirror (Obsidian brain) |
| data/milestones | 387 | milestone envelopes |
| Docustrata/.index | 99 | index (maybe generated) |
| data/docs | 69 | docs |
| cad-engine/src | 62 | **source code** |
| .claude/hooks | 61 | **hooks** |
| .claude/helpers | 48 | **helpers** |
| .claude/scripts | 23 | **scripts** |

**Why it matters:**
1. **Fragility** — 34K uncommitted files are lost on any `git reset --hard` / `git clean`, absent from the other PC, and absent from every merge. The wiki + memories + milestone envelopes + cad-engine source are all at risk.
2. **Operational drag** — a 34K-untracked working tree makes `git status` / `find` / `git` ops slow enough to hit the harness's 30s kill (observed: multiple bash exit-255 this session). Likely a contributor to the merge backlog being "fraught."
3. **Misreads as filth** — the tree LOOKS catastrophically dirty; it's actually buried under un-committed work.

**Do NOT blanket-act (R8/R12 + peer-absorption + never-delete):**
- `git add -A` → sweeps junk + 34K peer files into one commit (the peer-absorption hazard golf has been avoiding all session).
- blanket `.gitignore` → HIDES real work (wiki/memories/source).
- `git clean` → DESTROYS real work.

**Correct path (deliberate, fleet-coordinated — NOT golf-unilateral):** per-category triage to separate (a) intentionally-local regenerated artifacts (some `knowledge/wiki` + `data/*` may be regen-output that SHOULD be gitignored) from (b) genuinely-uncommitted source/hooks/helpers/scripts that SHOULD be committed by their owning slot. Owning slots commit their own (delta=cad-engine, each slot=its hooks, alpha=wiki/memories tooling). golf flagged it; resolution needs operator direction on the wiki/memory tracking policy first (are those meant to be git-tracked on this branch, or regen-local?). Related: [[reference_tmp_orphan_leak_janitor_2026_05_30]] (the tmp-leak was a SYMPTOM of the same un-hygienic tree).
