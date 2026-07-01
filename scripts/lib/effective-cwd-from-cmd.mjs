/**
 * effective-cwd-from-cmd.mjs -- resolve the ACTUAL execution cwd of a shell command
 * (U-LANE-CD-AWARE, slot:india 2026-06-11).
 *
 * THE BUG THIS CLOSES (fleet-wide commit-contention root cause): the slot-lane enforcement
 * hooks (git-add-lane-guard, worktree-commit-route, main-tree-write-block) resolve the chat's
 * cwd from the Bash tool PAYLOAD (`payload.cwd`), which is the session-pinned slot worktree
 * (e.g. H:/prism-slot-india). But a command like `cd /h/prism && git add scripts/X` changes the
 * REAL execution cwd to the main tree -- which the payload cwd does NOT reflect. So the hooks
 * evaluate the lane check against the SLOT worktree, see the relative path as "inside", and
 * ALLOW -- while git actually stages/commits in the MAIN tree. Every slot chat that prefixes
 * `cd /h/prism &&` (or commits with a [MAIN] subject) silently piles onto the shared index.lock
 * -> the lock contention the operator hit all session.
 *
 * THE FIX: parse a LEADING `cd <path>` chain off the command and return the resulting cwd, so
 * the hooks evaluate the lane against where git ACTUALLY runs. `cd /h/prism && git add X` now
 * resolves to /h/prism (main tree) -> OUTSIDE the slot worktree -> the guard fires.
 *
 * SCOPE (honest, R12): handles the COMMON, real pattern -- a leading run of `cd <path>` segments
 * before the first non-cd command (`cd A && cd B && git ...` -> B). It does NOT model a `cd` that
 * appears AFTER a git command in the same line (rare; `git x && cd /y && git z`) -- such a later
 * git runs under /y, but the leading-cd resolution still catches the dominant bypass and is
 * fail-safe: when no leading cd is present it returns the fallback (payload) cwd unchanged, so
 * existing in-worktree behavior is byte-identical. Pure -> hermetically testable, no fs/process.
 */

/** Split a string into shell tokens (quote-aware: strips matched single/double quotes). */
export function tokenizeShell(s) {
  const out = [];
  let buf = "";
  let q = null;
  let had = false; // track an (even empty) quoted token, so `cd ""` yields ""
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q) { q = null; continue; }
      buf += c;
      continue;
    }
    if (c === "'" || c === '"') { q = c; had = true; continue; }
    if (c === " " || c === "\t") {
      if (buf || had) { out.push(buf); buf = ""; had = false; }
      continue;
    }
    buf += c;
  }
  if (buf || had) out.push(buf);
  return out;
}

/**
 * Resolve `target` (a `cd` argument) against `base`, returning a forward-slash path with no
 * trailing slash. Absolute targets (POSIX `/x`, Windows `C:/x` or `C:\x`) replace base; relative
 * targets join onto base. `-`, `~`, `~/...`, and env-var targets ($X) are treated as
 * "unresolvable" -> return null (caller keeps the prior cwd, fail-safe).
 */
export function resolveCd(target, base) {
  if (typeof target !== "string" || !target) return null;
  if (target === "-" || target === "~" || target.startsWith("~/") || target.includes("$")) return null;
  const t = target.replace(/\\/g, "/");
  const isAbs = t.startsWith("/") || /^[A-Za-z]:\//.test(t);
  let parts;
  if (isAbs) {
    parts = t.split("/");
  } else {
    const b = String(base || "").replace(/\\/g, "/");
    parts = b.split("/").concat(t.split("/"));
  }
  const stack = [];
  for (const p of parts) {
    if (p === "" ) { if (stack.length === 0) stack.push(""); continue; } // keep leading "" for POSIX root
    if (p === ".") continue;
    if (p === "..") { if (stack.length > 1 || (stack.length === 1 && stack[0] !== "")) stack.pop(); continue; }
    stack.push(p);
  }
  let res = stack.join("/");
  if (res === "") res = "/";
  res = res.replace(/\/+$/, "") || "/";
  // MSYS/git-bash drive notation: `/h/prism` IS `H:/prism` on Windows. Normalize so the result
  // compares equal to the Windows-style worktree roots the lane hooks resolve (else `cd /h/prism`
  // and `cd H:/prism` look like different trees and the guard mis-decides). A single leading
  // `/<letter>/` maps to `<letter>:/`; a bare `/<letter>` (no trailing slash) maps to `<letter>:`.
  res = res.replace(/^\/([A-Za-z])(\/|$)/, (_, d, rest) => `${d}:${rest || "/"}`);
  return res;
}

/**
 * Given a shell command + a fallback cwd (the payload cwd), return the effective cwd that the
 * FIRST real (non-cd) command runs under. Walks leading `cd <path>` segments joined by `&&`,
 * `;`, or `||`. Returns the fallback unchanged when there is no leading cd or it is unresolvable.
 */
export function effectiveCwdFromCmd(cmd, fallbackCwd) {
  if (typeof cmd !== "string" || !cmd.trim()) return fallbackCwd;
  // Split into segments on shell separators OUTSIDE quotes.
  const segs = [];
  let buf = "";
  let q = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) { buf += c; if (c === q) q = null; continue; }
    if (c === "'" || c === '"') { q = c; buf += c; continue; }
    if ((c === "&" && cmd[i + 1] === "&") || (c === "|" && cmd[i + 1] === "|")) { segs.push(buf); buf = ""; i++; continue; }
    if (c === ";" || c === "\n") { segs.push(buf); buf = ""; continue; }
    buf += c;
  }
  if (buf) segs.push(buf);

  let cwd = fallbackCwd;
  for (const segRaw of segs) {
    const seg = segRaw.trim();
    if (!seg) continue;
    const toks = tokenizeShell(seg);
    if (toks[0] !== "cd") break; // first non-cd command -> its cwd is `cwd`
    // `cd` with flags/no-arg: find the first non-flag token as the target.
    const target = toks.slice(1).find((t) => t && !t.startsWith("-"));
    if (target === undefined) break; // bare `cd` (HOME) -> unresolvable, stop
    const next = resolveCd(target, cwd);
    if (next === null) break; // unresolvable (~, -, $VAR) -> keep prior cwd, stop
    cwd = next;
  }
  return cwd;
}
