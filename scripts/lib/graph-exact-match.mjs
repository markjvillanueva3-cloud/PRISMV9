// graph-exact-match.mjs — shared exact-match predicate + node→path render line
// for the PreToolUse graph-context-inject hooks (pre-bash / pre-grep / pre-write).
// SYSTEM-VIZ / U-SV-NAV-INJECT-GREP-WRITE (sierra).
//
// WHY shared: pre-bash first grew the "exact-match collapse" (when the derived
// keys match exactly ONE concrete graph node, emit a short banner + a
// `→ Read <repoPath>` line instead of the 3-hit block). pre-grep and pre-write
// want the SAME behavior. Rather than copy the predicate into each (drift risk —
// three subtly-different "is this an exact match" tests), the predicate + the
// path-line renderer live here once, consumed by all three. Pure, no I/O.

const MAX_INFO = 120;

/**
 * The single high-confidence exact-match hit, or null.
 * Exact = hits[0].label equals one of the derived keys (case-insensitive) AND
 * status is concrete (non-ghost) AND the rank-2 hit isn't the same label
 * (genuine ambiguity → no collapse). Identical semantics across all three hooks.
 * @param {string[]} keys
 * @param {Array<{label?:string,status?:string,layer?:string,info?:string}>} hits
 * @returns {object|null}
 */
export function exactMatchHit(keys, hits) {
  if (!Array.isArray(hits) || hits.length < 1 || !Array.isArray(keys) || keys.length === 0) return null;
  const h0 = hits[0];
  const label0 = h0 && h0.label ? String(h0.label).toLowerCase() : "";
  if (!label0) return null;
  const exact = keys.some((k) => String(k).toLowerCase() === label0);
  const concrete = !!h0.status && !String(h0.status).startsWith("ghost");
  const noDuplicateRank2 = !(hits[1] && hits[1].label && String(hits[1].label).toLowerCase() === label0);
  return (exact && concrete && noDuplicateRank2) ? h0 : null;
}

/**
 * Render the `→ Read <repoPath>` nav line from a code-path-resolver result.
 * Gated on `repoPath` (the repo-root-relative, directly-Readable path) — a bare
 * index-root `path` would open the untracked top-level src/ dup, so only
 * `repoPath` is ever emitted. Returns "" when there's no resolvable path.
 * @param {{repoPath?:string,type?:string}|null} np  resolver result
 * @returns {string}  leading-newline line, or ""
 */
export function navPathLine(np) {
  if (!np || !np.repoPath) return "";
  return `\n  → \`Read ${np.repoPath}\`${np.type ? ` (${np.type})` : ""}`;
}

/**
 * Render the `📂 vault paths` line from a node-id→doc-pointer resolver (a seekCard
 * wrapper). Surfaces the node's Obsidian wiki/memory paths INLINE so the model
 * gets node→vault paths with zero follow-up node-card/wiki-query/Read. Returns ""
 * when there's no resolver, no card, or no doc pointers. Fail-soft: a throwing
 * resolver yields "" (never breaks the banner). (CHEAP-NODE-ACCESS-MS0 ·
 * U-SV-NODE-VAULT-PATHS — shared by pre-grep / pre-write; pre-bash inlines the same.)
 * @param {((id:string)=>({wiki?:string[],mem?:string[]}|null))|undefined} seekDocs
 * @param {object} h0  the exact-match hit (id preferred over label for the seek)
 * @returns {string}  leading-newline line, or ""
 */
export function vaultPathsLine(seekDocs, h0) {
  if (typeof seekDocs !== "function" || !h0) return "";
  try {
    const d = seekDocs(h0.id || h0.label);
    if (!d) return "";
    const bits = [];
    if (Array.isArray(d.wiki) && d.wiki.length) bits.push(`wiki: ${d.wiki.slice(0, 2).join(" · ")}`);
    if (Array.isArray(d.mem) && d.mem.length) bits.push(`mem: ${d.mem.slice(0, 2).join(" · ")}`);
    return bits.length ? `\n  • 📂 vault paths — ${bits.join("  ·  ")}` : "";
  } catch {
    return ""; // card seek never breaks the banner
  }
}

/**
 * Build the collapsed EXACT-MATCH banner for a hook. Tool-specific header/footer
 * are passed in so each hook keeps its own framing while sharing the structure
 * + the path line. `resolve` (optional) is the node-label→path resolver; when an
 * exact node resolves, the banner gains the `→ Read <repoPath>` line. `seekDocs`
 * (optional) is the node-id→doc-pointer resolver; when the node has Obsidian
 * docs, the banner gains the `📂 vault paths` line.
 * @param {object} h0     the exact-match hit (from exactMatchHit)
 * @param {{header:string, footer:string, maxBytes:number, resolve?:Function, seekDocs?:Function}} opts
 * @returns {string}  the banner (truncated to maxBytes)
 */
export function exactMatchBanner(h0, { header, footer, maxBytes, resolve, seekDocs }) {
  const layer = h0.layer ? `[${h0.layer}/${h0.status || "?"}]` : "[?]";
  const info = (h0.info || "").slice(0, MAX_INFO);
  let navLine = "";
  if (typeof resolve === "function") {
    try { navLine = navPathLine(resolve(h0.label)); } catch { /* resolver never breaks the banner */ }
  }
  const docLine = vaultPathsLine(seekDocs, h0);
  const banner = `${header} \`${h0.label}\`\n  • ${layer} ${h0.label}${info ? " — " + info : ""}${navLine}${docLine}\n${footer}`;
  return banner.length <= maxBytes ? banner : banner.slice(0, maxBytes) + "…";
}
