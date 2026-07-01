/**
 * graph-key-derive.mjs — per-tool key-derivation strategies for the four
 * PreToolUse graph-injection hooks (pre-read / pre-write / pre-grep /
 * pre-bash).
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A1.
 *
 * The hooks all share the same shape: derive a small set of "high-ROI" keys
 * from the tool's raw input, then call `runMasterIndexSearch` on each. The
 * derivation strategy is per-tool:
 *
 *   - read / write   — filename basename stem, dash/underscore-split (so
 *                       "system-viz-on-commit.mjs" → ["system", "viz",
 *                       "commit"]).
 *   - grep           — the pattern itself, run through `tokenize` (which
 *                       strips ALL regex metachars via `[^\p{L}\p{N}_\s]`,
 *                       drops STOPWORDS, dedupes, caps at maxTokens).
 *   - bash           — NARROW: only fires on file-search verbs (grep / rg /
 *                       find / cat / head / tail / ls). Everything else
 *                       returns [] (no inject) — bash commands like `git`,
 *                       `npm`, `node` don't carry graph-relevant signal.
 *
 * Pure — no I/O. Reuses `master-index-search-lib.mjs`'s tokenize so the
 * stopword set + length caps + dedup are a single source of truth across
 * the four hooks.
 *
 * @module scripts/lib/graph-key-derive
 */

import { tokenize } from "./master-index-search-lib.mjs";

const DEFAULT_MAX_KEYS = 5;

// Bash verbs that genuinely look at file contents / names — these are the
// only commands worth deriving keys from. Anything else (`git`, `npm`,
// `node`, `cargo`, …) returns [] so the hook stays quiet on the 95% of
// bash invocations that have no graph relevance.
const FILE_SEARCH_CMDS = new Set(["grep", "rg", "find", "cat", "head", "tail", "ls"]);

// Match leading shell env-var assignments (`FOO=bar VERB args`) so an
// env-prefixed file-search command still resolves to the verb.
const ENV_ASSIGN_RE = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * Derive high-ROI graph-search keys from a tool's raw input.
 *
 * @param {object} a
 * @param {string} a.input                                        raw tool input
 * @param {"read"|"write"|"grep"|"bash"} a.tool                   the PreToolUse tool
 * @param {number} [a.maxKeys=5]                                  cap returned keys
 * @returns {string[]}                                            0+ keys (empty = no inject)
 */
export function deriveGraphKeys({ input, tool, maxKeys = DEFAULT_MAX_KEYS }) {
  if (typeof input !== "string" || input.length === 0) return [];
  if (!Number.isFinite(maxKeys) || maxKeys < 1) return [];

  switch (tool) {
    case "read":
    case "write":
      return deriveFromFilePath(input, maxKeys);
    case "grep":
      // tokenize strips regex metachars + STOPWORDS + dedupes + caps.
      return tokenize(input, { maxTokens: maxKeys });
    case "bash":
      return deriveFromBashCommand(input, maxKeys);
    default:
      return [];
  }
}

/**
 * Read/write strategy: take the basename stem, split dashes + underscores,
 * tokenize. e.g.:
 *   "H:/prism/scripts/system-viz-on-commit.mjs"
 *     → basename "system-viz-on-commit.mjs"
 *     → stem    "system-viz-on-commit"
 *     → space   "system viz on commit"
 *     → tokens  ["system", "viz", "commit"]   (stopword "on" dropped)
 *
 * @param {string} input
 * @param {number} maxKeys
 * @returns {string[]}
 */
function deriveFromFilePath(input, maxKeys) {
  const base = input.replace(/\\/g, "/").split("/").pop();
  if (!base) return [];
  // Drop the last extension (foo.test.ts → foo.test; mostly we want the
  // stem before the FIRST dot). But "foo.test" is meaningful (catches the
  // `.test` modality), so split on `.` and KEEP the first segment.
  const stem = base.split(".")[0];
  if (!stem) return [];
  const spaced = stem.replace(/[-_]+/g, " ").trim();
  return tokenize(spaced, { maxTokens: maxKeys });
}

/**
 * Bash strategy: only fire on file-search verbs. Walk past leading env-var
 * assignments and the `rtk` wrapper, then check whether the verb is in
 * FILE_SEARCH_CMDS. If so, tokenize the non-flag arguments.
 *
 * @param {string} input
 * @param {number} maxKeys
 * @returns {string[]}
 */
function deriveFromBashCommand(input, maxKeys) {
  const tokens = input.trim().split(/\s+/);
  let i = 0;
  // Skip env-var prefixes (e.g. `FOO=bar BAZ=qux grep ...`).
  while (i < tokens.length && ENV_ASSIGN_RE.test(tokens[i])) i++;
  // Skip the rtk wrapper if present.
  if (tokens[i] === "rtk") i++;
  const verb = (tokens[i] || "").toLowerCase();
  if (!FILE_SEARCH_CMDS.has(verb)) return [];
  // Keep only non-flag tokens after the verb. (Flag values like `-r` or
  // `--include=*.ts` carry no graph signal and would just pollute the
  // results via the include glob's literal text.)
  const args = tokens.slice(i + 1).filter((t) => t.length > 0 && !t.startsWith("-"));
  if (args.length === 0) return [];
  return tokenize(args.join(" "), { maxTokens: maxKeys });
}

// Re-exports for callers that want to inspect the verb set or knobs without
// reaching into the module's internals.
export { FILE_SEARCH_CMDS, DEFAULT_MAX_KEYS };
