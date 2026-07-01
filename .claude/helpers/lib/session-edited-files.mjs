/**
 * session-edited-files.mjs -- PURE session-attribution helpers (no IO).
 *
 * THE PROBLEM (concurrent-fleet THRASH, ref memory
 * reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24):
 * fleet Stop gates (stop_on_failing_tests freshness, leave-a-copy-behind-guard) scan the
 * WHOLE shared `H:/prism` tree via `git status`. With up to 26 concurrent slots editing the
 * shared tree, a PEER slot's uncommitted edit (e.g. a test file) trips a gate against an
 * INNOCENT slot's Stop -- a false-positive that blocks a chat for work it never did.
 *
 * THE FIX (documented intent of stop_on_failing_tests.mjs lines ~180-188 -- "scope the INPUT
 * to the current slot's own changes ... session attribution; do NOT loosen the pure decision"):
 * the Claude Code Stop hook stdin carries `transcript_path`. The session transcript JSONL is
 * the AUTHORITATIVE per-session edit record -- every Edit/Write/MultiEdit/NotebookEdit this
 * session ran is a `tool_use` block `{type:"tool_use", name, input:{file_path|notebook_path}}`
 * inside `message.content[]`. Extract THIS session's edited files, intersect with the gate's
 * conservative stale candidates, and block ONLY on the session's own files. A peer's edit is
 * never in this session's transcript -> never blocks this session.
 *
 * SAFETY: these functions only ever NARROW a candidate set (remove peer files). The caller
 * keeps the never-under-block invariant by falling back to the conservative candidate when the
 * transcript cannot be read (so attribution-uncertainty errs toward OVER-blocking, matching the
 * existing gate doctrine). This lib NEVER widens / approves on its own.
 *
 * Pure + dependency-free (only string ops) so a T0 Stop hook imports it with ~zero cost and the
 * functions are R9-unit-testable with injected text. Reused by stop_on_failing_tests.mjs (and
 * the planned leave-a-copy-behind-guard session-scoping follow-up).
 */

// tool_use names whose blocks mutate a file on disk (the edit surface Claude Code exposes).
export const EDIT_TOOL_NAMES = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

// Known repo tree roots -- the shared main tree and any per-slot worktree. A transcript edit
// path is absolute (`H:\prism\...` or `H:\prism-slot-papa\...`); strip the root to a repo-rel
// path so it compares equal to a `git status` rel (`mcp-server/...`) regardless of which tree
// the session worked in. Lowercased + forward-slash compare (Windows FS is case-insensitive).
const REPO_ROOT_RES = [/^h:\/prism-slot-[a-z0-9._-]+\//, /^h:\/prism\//];

/**
 * Normalize ANY path (absolute Windows transcript path OR a repo-rel git-status path) to a
 * canonical, lowercased, forward-slash, repo-RELATIVE key for comparison.
 *   "H:\\prism\\mcp-server\\src\\__tests__\\Foo.test.ts" -> "mcp-server/src/__tests__/foo.test.ts"
 *   "H:/prism-slot-papa/mcp-server/a/Bar.test.ts"        -> "mcp-server/a/bar.test.ts"
 *   "mcp-server/src/X.test.ts" (already rel)             -> "mcp-server/src/x.test.ts"
 * Empty / non-string -> "".
 */
export function toRepoRel(p) {
  if (typeof p !== "string") return ""; // non-string (null/undefined/number/object) is not a path
  let s = p.replace(/\\/g, "/").trim();
  if (!s) return "";
  s = s.replace(/^file:\/\//i, ""); // defensive: strip a file:// scheme if present
  const lower = s.toLowerCase();
  for (const re of REPO_ROOT_RES) {
    const m = lower.match(re);
    if (m) { s = s.slice(m[0].length); break; }
  }
  return s.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
}

/**
 * Extract the set of repo-rel paths THIS session edited, from the transcript JSONL text.
 * Walks every line, parses only lines that mention an edit tool_use (cheap substring pre-filter),
 * and collects `input.file_path` / `input.notebook_path` from Edit/Write/MultiEdit/NotebookEdit
 * tool_use blocks. Fail-soft: a malformed line is skipped, never thrown. Returns a Set of
 * normalized repo-rel keys (possibly empty -- a session that edited nothing).
 *
 * NOTE: a tool_use recorded here may have FAILED at apply time, but that is harmless for the
 * caller -- it intersects this set with `git status` (which only lists files that actually
 * changed on disk), so a failed edit (no on-disk change) never produces a false block.
 *
 * @param {string} transcriptText  full transcript JSONL contents
 * @returns {Set<string>}
 */
export function extractSessionEditedFiles(transcriptText) {
  const out = new Set();
  if (!transcriptText || typeof transcriptText !== "string") return out;
  for (const raw of transcriptText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] !== "{") continue;
    if (!line.includes("tool_use")) continue; // cheap pre-filter -- skip the user/result bulk
    let obj;
    try { obj = JSON.parse(line); } catch { continue; } // partial/garbage line -> skip
    const content = obj?.message?.content ?? obj?.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
      if (!b || b.type !== "tool_use" || !EDIT_TOOL_NAMES.has(b.name)) continue;
      const fp = b.input?.file_path ?? b.input?.notebook_path;
      const rel = toRepoRel(fp);
      if (rel) out.add(rel);
    }
  }
  return out;
}

/**
 * Intersect the gate's stale-test CANDIDATES (repo-rel, from git status) with the files THIS
 * session actually edited. Returns only the candidates the session itself touched -- a peer's
 * edit is filtered out (kills the cross-chat thrash). An empty session set (this session edited
 * nothing) -> [] (nothing is attributable to me -> no block). Order of `candidates` is preserved.
 *
 * @param {string[]} candidates       repo-rel stale test paths (conservative gate output)
 * @param {Set<string>} sessionEdited result of extractSessionEditedFiles
 * @returns {string[]}
 */
export function filterToSessionOwned(candidates, sessionEdited) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  if (!(sessionEdited instanceof Set) || sessionEdited.size === 0) return [];
  return candidates.filter((c) => sessionEdited.has(toRepoRel(c)));
}
