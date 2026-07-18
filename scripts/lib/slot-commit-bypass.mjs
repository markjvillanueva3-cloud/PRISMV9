/**
 * slot-commit-bypass.mjs -- pure bypass decision for slot-branch commit enforcement
 * (U-SLOT-COMMIT-ENFORCE-LIVE, slot:india 2026-06-11).
 *
 * THE BUG THIS CLOSES (operator directive 2026-06-11: "commits and staging should always be on
 * chat slot nato name branch ... fix the build that is supposed to make [it] auto enforced for all
 * galaxies and chat slots"):
 *
 *   `slot-commit-worktree-enforce.mjs` HARD-blocks a slot-bound chat from `git commit` unless the
 *   live branch in the commit cwd is slot/<name>. It was meant to end the operator's manual nagging
 *   ("I have to manually tell each chat to commit to their designated worktree"). But it carried a
 *   ONE-SHOT migration escape -- `if (cmd.includes("[BOOTSTRAP-SLOT-ENFORCE]")) allow()` -- and that
 *   marker became the STANDARD commit prefix on every chat fleet-wide (7 of the last 12 commits carry
 *   it). So the gate silently fail-opened on EVERY commit: the enforcement existed, was wired, and
 *   never once fired. The whole fleet kept committing to the shared cad-fusion-live-ms0 tree -> the
 *   index.lock contention the operator hit all session.
 *
 * THE FIX: the bootstrap marker is no longer a blanket bypass. It is honored ONLY inside an explicit
 * operator-opened transition window (PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1, default OFF). The
 * narrow, audited cross-cutting escape is `[MAIN-FORCE]` -- genuine fleet-wide infra that belongs on
 * the shared tree (this very hook fix is one), mirroring the same token in worktree-commit-route.mjs
 * + main-tree-write-block.mjs (R11 -- one escape convention across all three lane hooks). Golf (the
 * integrator) stays exempt in the hook; the kill switch stays the operator emergency stop.
 *
 * Pure -> hermetically testable, no fs/process/spawn. The hook imports `commitBypass`.
 */

/** The legacy one-shot migration marker that became a universal (gate-neutering) commit prefix. */
export const BOOTSTRAP_MARKER = "[BOOTSTRAP-SLOT-ENFORCE]";

/**
 * Decide whether a `git commit` command is EXEMPT from slot-branch enforcement.
 * Returns a short reason string when bypassed, or null to ENFORCE (let the branch check run).
 *
 * Precedence (first match wins):
 *   1. PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1  -> "kill-switch"   (operator emergency; always wins)
 *   2. [MAIN-FORCE] in the command          -> "main-force"    (genuine cross-cutting fleet infra
 *                                              that belongs on the shared tree -- narrow + audited)
 *   3. [BOOTSTRAP-SLOT-ENFORCE] marker      -> "bootstrap-optin" ONLY when
 *                                              PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1
 *                                              (operator-opened transition window; default OFF so
 *                                              the gate ENFORCES by default).
 *   else                                    -> null            (ENFORCE)
 *
 * Note: matching against the whole command (not an extracted subject) deliberately mirrors the
 * hook's existing `cmd.includes(BOOTSTRAP_MARKER)` style -- a chat does not write `[MAIN-FORCE]`
 * into an unrelated commit by accident, and the cost of a rare false-bypass is one commit landing
 * on the shared tree (today's status quo), never a wrong block.
 */
export function commitBypass(cmd, env = {}) {
  const c = typeof cmd === "string" ? cmd : "";
  const e = env || {};
  if (e.PRISM_SLOT_COMMIT_ENFORCE_DISABLE === "1") return "kill-switch";
  if (/\[\s*MAIN-FORCE\s*\]/i.test(c)) return "main-force";
  if (e.PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP === "1" && c.includes(BOOTSTRAP_MARKER)) {
    return "bootstrap-optin";
  }
  return null;
}
