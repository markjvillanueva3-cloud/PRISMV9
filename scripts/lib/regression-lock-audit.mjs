// scripts/lib/regression-lock-audit.mjs
// U-REGRESSION-LOCK-AUDIT (2026-06-09, slot:alpha): the fleet-wide application of
// the Opik "self-repairing harness" L3 finding -- "every documented failure should
// become a runnable regression test, so the harness gets harder to break each
// cycle." (src: akshay_pachaar X article "Your Agent Harness Should Repair Itself",
// read via Playwright 2026-06-09.)
//
// THE GAP: PRISM documents regressions richly (CLAUDE.md `## Recent regressions`,
// bug-finding memories, the bug-finding->wiki gate) but does NOT enforce that each
// fix shipped a companion TEST that would FAIL if the bug recurred. This audits
// that: for each documented regression, did the fix commit touch a test file?
//   LOCKED       = fix commit touched >=1 test file (recurrence is caught)
//   UNLOCKED     = fix commit touched SOURCE but NO test (recurrence risk -- the punch list)
//   UNVERIFIABLE = no sha / git can't resolve it / doc-only fix (no code to test) --
//                  NEVER counted as unlocked (inflating the scare number is the
//                  over-reporting failure direction; honest is better than alarmist).
//
// SIBLING (R8/DRY note): `scripts/regression-staleness-auditor.mjs` already parses
// the same `## Recent regressions` section (its local `parseEntries` + the
// `observed-in:\s*<sha>` regex). It is NOT exported. This lib intentionally keeps a
// small self-contained parser rather than coupling to that file in place (the
// graph-stream-degree precedent). FUTURE: export a shared parseRegressionSection
// from one place and have both consumers import it.
//
// PURE-CORE + INJECTED READER (R9 hermetic tests): parse/classify/audit are pure;
// commitFilesFn(sha)->string[]|null is injected (prod = a git-show wrapper, tests =
// a fixture map). No I/O in this file.

const SHA_OBSERVED = /observed-in:\s*([0-9a-f]{7,40})/i;
const SHA_VERIFY = /show\s+([0-9a-f]{7,40})/i;
const SHA_BARE = /\b([0-9a-f]{7,40})\b/; // last-resort
const TEST_RE = /\.test\.|\.spec\.|(^|[\\/])__tests__[\\/]/i;
const SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|java)$/i;

export const LOCK = Object.freeze({
  LOCKED: "LOCKED",
  UNLOCKED: "UNLOCKED",
  UNVERIFIABLE: "UNVERIFIABLE",
});

/**
 * parseRegressionEntries -- PURE. Extract entries from a markdown body's
 * `## Recent regressions` section. Each bullet starts `- YYYY-MM-DD | **desc** ...`.
 * Stops at the next `## ` heading so it never bleeds into the following section.
 * @returns {Array<{date, description, sha, raw}>}  sha is null when none found.
 */
export function parseRegressionEntries(markdown) {
  const md = String(markdown || "");
  // isolate the LAST `## Recent regressions` section (CLAUDE.md may have older
  // duplicate headings; the live one is last). Slice to the next `## ` heading.
  const headIdx = md.lastIndexOf("## Recent regressions");
  if (headIdx < 0) return [];
  let section = md.slice(headIdx);
  const nextHead = section.indexOf("\n## ", 4); // skip the heading's own `## `
  if (nextHead > 0) section = section.slice(0, nextHead);

  const out = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^-\s*(\d{4}-\d{2}-\d{2})\s*\|/);
    if (!m) continue; // only dated bullets are entries
    const date = m[1];
    const descM = line.match(/\*\*(.+?)\*\*/);
    const description = descM ? descM[1].trim() : line.slice(0, 80).trim();
    // sha precedence: observed-in: (the canonical commit) > verify-line show <sha> > bare hex
    let sha = null;
    const o = line.match(SHA_OBSERVED);
    if (o) sha = o[1];
    else {
      const v = line.match(SHA_VERIFY);
      if (v) sha = v[1];
      else {
        // bare hex only AFTER the description (avoid matching hex inside the desc)
        const tail = descM ? line.slice(line.indexOf(descM[0]) + descM[0].length) : line;
        const b = tail.match(SHA_BARE);
        if (b) sha = b[1];
      }
    }
    out.push({ date, description, sha, raw: line.trim() });
  }
  return out;
}

/**
 * classifyLock -- PURE. Decide LOCKED / UNLOCKED / UNVERIFIABLE for one entry.
 * @param entry          {date, description, sha, ...}
 * @param commitFilesFn  (sha) -> string[] of files in that commit, or null when
 *                       the sha can't be resolved (bad/stale sha -> UNVERIFIABLE).
 * @returns {{...entry, status, hasTest, hasSource, fileCount}}
 */
export function classifyLock(entry, commitFilesFn) {
  const e = entry || {};
  if (!e.sha) return { ...e, status: LOCK.UNVERIFIABLE, reason: "no-sha", hasTest: false, hasSource: false, fileCount: 0 };
  let files;
  try { files = commitFilesFn(e.sha); } catch { files = null; }
  if (!Array.isArray(files) || files.length === 0) {
    return { ...e, status: LOCK.UNVERIFIABLE, reason: "sha-unresolved", hasTest: false, hasSource: false, fileCount: 0 };
  }
  const hasTest = files.some((f) => TEST_RE.test(f));
  const hasSource = files.some((f) => SOURCE_RE.test(f) && !TEST_RE.test(f));
  let status, reason;
  if (hasTest) { status = LOCK.LOCKED; reason = "fix-shipped-with-test"; }
  else if (hasSource) { status = LOCK.UNLOCKED; reason = "source-fix-no-test"; }
  else { status = LOCK.UNVERIFIABLE; reason = "doc-or-data-only-fix"; } // no code -> no recurrence test applicable
  return { ...e, status, reason, hasTest, hasSource, fileCount: files.length };
}

/**
 * auditRegressions -- PURE. Parse + classify every entry, summarize. UNLOCKED
 * first (the punch list). lockRate is over the JUDGEABLE set (locked+unlocked) so
 * unverifiable entries don't drag the rate -- honest denominator.
 */
export function auditRegressions(markdown, commitFilesFn) {
  const entries = parseRegressionEntries(markdown).map((e) => classifyLock(e, commitFilesFn));
  const locked = entries.filter((e) => e.status === LOCK.LOCKED).length;
  const unlocked = entries.filter((e) => e.status === LOCK.UNLOCKED).length;
  const unverifiable = entries.filter((e) => e.status === LOCK.UNVERIFIABLE).length;
  const judgeable = locked + unlocked;
  const order = { [LOCK.UNLOCKED]: 0, [LOCK.LOCKED]: 1, [LOCK.UNVERIFIABLE]: 2 };
  entries.sort((a, b) => (order[a.status] - order[b.status]) || String(b.date).localeCompare(String(a.date)));
  return {
    total: entries.length,
    locked,
    unlocked,
    unverifiable,
    lockRate: judgeable > 0 ? locked / judgeable : null, // null = nothing judgeable yet
    entries,
  };
}
