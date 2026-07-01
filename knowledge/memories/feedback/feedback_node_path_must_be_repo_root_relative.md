---
name: feedback_node_path_must_be_repo_root_relative
description: "A node→path resolver must emit a path resolvable from the CONSUMER's cwd, not the index's root — verify with an existence check, not just shape."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.436Z
aliases: feedback_node_path_must_be_repo_root_relative
---


# Node→path output must be repo-root-relative (Readable from the consumer's cwd)

When a resolver maps a code/graph node to a file path that another tool will `Read`, emit the path **relative to the consumer's working directory** (the repo root), not relative to the index's internal root.

**Why:** PRISM's `CODE_SYSTEM_INDEX.json` stores paths relative to `_meta.root` = `mcp-server/` (`src/engines/X.ts`). A hook/skill that emits that bare path makes the model `Read src/engines/X.ts` from the repo-root cwd — which opens an **untracked, git-ignored top-level `H:/prism/src/` duplicate** (different inode, content drifts) instead of the canonical `mcp-server/src/...`, or 404s on a clean checkout / CI. Either way the token-save the feature exists to deliver does NOT land, and it can route a Read at a stale file. Caught by scrutiny arm B on U-SV-NODE-PATH-TEMPLATE (2026-06-03).

**How to apply:**
- Have the resolver expose BOTH `path` (index-root-relative, display/back-compat) AND `repoPath` (root + path, repo-root-relative). Derive the prefix from the index's own `_meta.root` (data-driven), default to the documented root.
- Consumers that emit a `Read <x>` line use `repoPath`, gated on its presence (`if (np.repoPath)`), so a bare path can never leak.
- **Test the path EXISTS, not just its shape:** `assert.ok(fs.existsSync(join(repoRoot, repoPath)))`. A shape-only test (`assert.match(out, /Read src\//)`) *encodes the bug* and won't catch it.

Related: [[reference_sierra_node_path_template_2026_06_03]] · [[node-path-template]] · [[feedback_sierra_graph_correctness_is_fleet_search]] · sibling hazard: a stale untracked `H:/prism/src/` shadows `mcp-server/src/` (golf hygiene candidate).
