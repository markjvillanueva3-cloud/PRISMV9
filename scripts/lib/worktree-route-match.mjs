#!/usr/bin/env node
// worktree-route-match.mjs
// ----------------------------------------------------------------------------
// Pure scope<->branch matching logic for the worktree-commit-route PreToolUse
// hook (.claude/hooks/worktree-commit-route.mjs). Extracted to a side-effect-free
// importable module so it can be UNIT-TESTED (the hook itself reads stdin + git
// at top level and exits, so it cannot be imported in a test -- it had ZERO tests
// in tree, which is how the empty-token wildcard bug below shipped undetected).
//
// FIX HISTORY (U-WORKTREE-ROUTE-SLOT-FIX, 2026-06-12, slot:alpha):
//   * EMPTY-TOKEN WILDCARD BUG: the old inline `scopeMatchesBranch` used
//     `scopeToken.includes(branchHead.split("-")[0])`. A malformed worktree
//     branch with a LEADING dash (observed live: `work/-system-viz-brain-ms0-u--41db1b`)
//     makes `branchBasename` = `-system-viz-brain-...`, and `.split("-")[0]` = ""
//     (empty). `anyString.includes("")` is ALWAYS true -> that one malformed
//     worktree matched EVERY commit scope and blocked ALL slot commits fleet-wide.
//     Fixed by taking the first NON-EMPTY hyphen segment + a >=2-char guard.
//   * SLOT-BRANCH semantics: `isSlotBranch` lets the hook recognise slot
//     worktrees (branch `slot/<name>`), which are governed by slot-commit-enforce,
//     NOT by scope->branch matching (a slot branch is named by SLOT while its
//     commits carry MILESTONE scopes that never match the slot name).
//
// All functions are pure (no fs/git/env/exit). The hook imports them.

// Branch basename = last segment of the ref, lowercased
// (refs/heads/work/lathe-master -> "lathe-master"; slot/alpha -> "alpha").
export function branchBasename(b) {
  if (!b || typeof b !== "string") return "";
  return b.split("/").pop().toLowerCase();
}

// First NON-EMPTY hyphen segment of a branch basename. This is the load-bearing
// guard: `"-system-viz-brain".split("-")` = ["", "system", ...]; filter(Boolean)
// drops the empty leading segment so the lead token is "system", never "".
export function branchLeadToken(branchHead) {
  if (!branchHead || typeof branchHead !== "string") return "";
  return branchHead.split("-").filter(Boolean)[0] || "";
}

// SCOPE matches BRANCH iff the branch basename contains the full scope token, OR
// the scope token contains the branch's (>=2-char) lead segment. The >=2 guard
// prevents an empty/1-char lead from wildcard-matching every scope (the bug) and
// from a single stray character causing spurious matches. Pure + symmetric-ish
// substring heuristic, matching the hook's original intent ("LATHE" ~ "lathe-master").
export function scopeMatchesBranch(scopeToken, branchHead) {
  if (!scopeToken || !branchHead) return false;
  if (branchHead.includes(scopeToken)) return true;
  const lead = branchLeadToken(branchHead);
  return lead.length >= 2 && scopeToken.includes(lead);
}

// A slot worktree branch is `slot/<name>` (the SLOT-WORKTREE-MS0 model). Such a
// tree is routed by slot-commit-enforce, not this hook -- so the hook allows it
// unconditionally (its branch name never matches a milestone-scoped commit).
export function isSlotBranch(branch) {
  return /^slot\//i.test(String(branch || ""));
}
