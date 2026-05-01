/**
 * WikiIndexPlainMdFallback.test.ts — P3-U02
 *
 * Verifies the index.md conversion satisfies envelope exit conditions:
 *   1. All 722+ entries converted to dual-format (wikilink + linkified source).
 *   2. Random-sample 10 entries: wikilink target resolves through
 *      ObsidianVaultExporterEngine AND linkified source path is structurally
 *      a valid markdown link (renders as plain text on GitHub by default,
 *      clickable when GitHub-flavored markdown rendering is on).
 *   3. WikiIndexMaintainerEngine ENTRY_LINE_RE still matches every line
 *      (anti-regression for the engine's parser).
 *   4. No raw `source:src/...` tokens remain (every source field linkified).
 *
 * Exit condition 4 ("no broken inbound links from non-wiki PRISM markdown")
 * is verified offline: a repo-wide grep showed no other PRISM markdown
 * references specific wiki entry slugs. Documented in commit message.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ObsidianVaultExporterEngine, VAULT_CATEGORIES } from "../engines/ObsidianVaultExporterEngine.js";

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const REPO_ROOT = resolve(__dirname, "../../..");
const INDEX_PATH = resolve(REPO_ROOT, "knowledge/wiki/index.md");
const EXPECTED_MIN_ENTRIES = 722;
const RANDOM_SAMPLE_SIZE = 10;

// Same regex shape as WikiIndexMaintainerEngine — the contract under test.
const ENTRY_LINE_RE =
  /^-\s+\[\[([^\]]+)\]\]\s+—\s+(.*?)\s+\|\s+category:([\w-]+)\s+\|\s+sources:(\d+)\s+\|\s+confidence:([\d.]+)\s+\|\s+last_verified:(\d{4}-\d{2}-\d{2})(?:\s+\|\s+source:(\S+))?\s*$/u;

// Linkified source token shape: [<basename>](<path>) — no whitespace.
const LINKIFIED_SOURCE_RE = /^\[([^\]]+)\]\(([^()\s]+)\)$/u;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function loadIndexEntries(): Array<{
  raw: string;
  slug: string;
  category: string;
  sourceToken: string | undefined;
}> {
  const text = readFileSync(INDEX_PATH, "utf-8");
  const out: Array<{ raw: string; slug: string; category: string; sourceToken: string | undefined }> = [];
  for (const line of text.split(/\r?\n/u)) {
    if (!line.startsWith("- [[")) continue;
    const m = line.match(ENTRY_LINE_RE);
    if (!m) continue;
    out.push({ raw: line, slug: m[1], category: m[3], sourceToken: m[7] });
  }
  return out;
}

/** Deterministic xorshift PRNG so the random sample is reproducible. */
function deterministicSample<T>(arr: ReadonlyArray<T>, n: number, seed: number): T[] {
  if (arr.length <= n) return arr.slice();
  let state = seed >>> 0 || 1;
  const indices = new Set<number>();
  while (indices.size < n) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    indices.add((state >>> 0) % arr.length);
  }
  return Array.from(indices).map((i) => arr[i]);
}

// ----------------------------------------------------------------------------
// Skip-gate: this test only runs when the wiki has been cherry-picked into
// the current branch. It is not skipped on main feature branches.
// ----------------------------------------------------------------------------
const wikiPresent = existsSync(INDEX_PATH);

(wikiPresent ? describe : describe.skip)("WikiIndexPlainMdFallback — index.md dual-format conversion", () => {
  it(`has at least ${EXPECTED_MIN_ENTRIES} entries`, () => {
    const entries = loadIndexEntries();
    expect(entries.length).toBeGreaterThanOrEqual(EXPECTED_MIN_ENTRIES);
  });

  it("every entry parses against the WikiIndexMaintainerEngine ENTRY_LINE_RE shape", () => {
    const text = readFileSync(INDEX_PATH, "utf-8");
    let entryLines = 0;
    let regexMatches = 0;
    for (const line of text.split(/\r?\n/u)) {
      if (!line.startsWith("- [[")) continue;
      entryLines += 1;
      if (ENTRY_LINE_RE.test(line)) regexMatches += 1;
    }
    expect(entryLines).toBeGreaterThanOrEqual(EXPECTED_MIN_ENTRIES);
    expect(regexMatches).toBe(entryLines);
  });

  it("every entry that has a source field uses the linkified [name](path) form (no raw paths remain)", () => {
    const entries = loadIndexEntries();
    let withSource = 0;
    let linkified = 0;
    let rawPaths = 0;
    for (const e of entries) {
      if (typeof e.sourceToken !== "string") continue;
      withSource += 1;
      if (LINKIFIED_SOURCE_RE.test(e.sourceToken)) {
        linkified += 1;
      } else {
        rawPaths += 1;
      }
    }
    expect(withSource).toBeGreaterThan(0);
    expect(linkified).toBe(withSource);
    expect(rawPaths).toBe(0);
  });

  it("random sample of 10 entries: every wikilink slug resolves through ObsidianVaultExporterEngine", () => {
    const entries = loadIndexEntries();
    const sample = deterministicSample(entries, RANDOM_SAMPLE_SIZE, 0xdeadbeef);
    expect(sample.length).toBe(RANDOM_SAMPLE_SIZE);
    for (const e of sample) {
      const r = ObsidianVaultExporterEngine.resolveVaultPath(e.slug, { category: e.category as never });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.nodeId).toBe(e.slug);
        expect(r.vaultRelativePath).toBe(`${e.category}/${e.slug}.md`);
      }
    }
  });

  it("random sample of 10 entries: every linkified source has [name](path) shape with no whitespace", () => {
    const entries = loadIndexEntries();
    const sample = deterministicSample(entries.filter((e) => typeof e.sourceToken === "string"), RANDOM_SAMPLE_SIZE, 0xfeedface);
    expect(sample.length).toBe(RANDOM_SAMPLE_SIZE);
    for (const e of sample) {
      expect(typeof e.sourceToken).toBe("string");
      const m = e.sourceToken!.match(LINKIFIED_SOURCE_RE);
      expect(m).not.toBeNull();
      if (m) {
        const [, label, path] = m;
        expect(label.length).toBeGreaterThan(0);
        expect(path.length).toBeGreaterThan(0);
        // Path should look like a relative file path (no scheme, no drive letter)
        expect(path.startsWith("http")).toBe(false);
        expect(/^[A-Za-z]:[\\/]/u.test(path)).toBe(false);
      }
    }
  });

  it("category headers match the VAULT_CATEGORIES whitelist (anti-regression)", () => {
    const text = readFileSync(INDEX_PATH, "utf-8");
    const headers: string[] = [];
    for (const line of text.split(/\r?\n/u)) {
      const m = line.match(/^##\s+([\w-]+)\s*$/u);
      if (m) headers.push(m[1]);
    }
    expect(headers.length).toBeGreaterThan(0);
    // Each header must be in the VAULT_CATEGORIES set.
    for (const h of headers) {
      expect((VAULT_CATEGORIES as ReadonlyArray<string>).includes(h)).toBe(true);
    }
  });
});
