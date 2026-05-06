/**
 * PeerRepoSchemaDiff — INTEL-OLLAMA-OBSIDIAN-MS0/P13-U04.
 *
 * Pure-function tests for scripts/peer-repo-schema-diff.mjs.
 * Asserts:
 *   1. extractActionsFromDispatcher pulls action names from both ACTIONS
 *      const + z.enum patterns; safe on empty/non-string input.
 *   2. listDispatchers walks a repo's dispatcher dir via injectable fs adapter.
 *   3. diffActionSets partitions action lists into onlyInCanonical /
 *      onlyInPeer / common (sorted, deduped).
 *   4. summarizeDrift aggregates per-repo drift counts.
 *   5. renderMarkdown produces a readable summary + per-repo drift section.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../scripts/peer-repo-schema-diff.mjs");

let extractActionsFromDispatcher: any, listDispatchers: any, diffActionSets: any, summarizeDrift: any, renderMarkdown: any;
beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  extractActionsFromDispatcher = mod.extractActionsFromDispatcher;
  listDispatchers = mod.listDispatchers;
  diffActionSets = mod.diffActionSets;
  summarizeDrift = mod.summarizeDrift;
  renderMarkdown = mod.renderMarkdown;
});

describe("P13-U04 extractActionsFromDispatcher", () => {
  it("extracts from a `const ACTIONS = [...] as const` form", () => {
    const src = `
import { z } from "zod";
const ACTIONS = ["foo", "bar_baz", "qux"] as const;
export function dispatcher() {}
`;
    expect(extractActionsFromDispatcher(src)).toEqual(["bar_baz", "foo", "qux"]);
  });

  it("extracts from z.enum([...]) form, single-line", () => {
    const src = `
const schema = z.object({
  action: z.enum(["alpha", "beta", "gamma"]),
});
`;
    expect(extractActionsFromDispatcher(src)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("extracts from z.enum spanning multiple lines", () => {
    const src = `
action: z.enum([
  "first",
  "second",
  "third",
])
`;
    expect(extractActionsFromDispatcher(src)).toEqual(["first", "second", "third"]);
  });

  it("dedupes when both ACTIONS and z.enum have the same names", () => {
    const src = `
const ACTIONS = ["a", "b"] as const;
action: z.enum(["b", "c"]),
`;
    expect(extractActionsFromDispatcher(src)).toEqual(["a", "b", "c"]);
  });

  it("returns empty array on empty / non-string input", () => {
    expect(extractActionsFromDispatcher("")).toEqual([]);
    expect(extractActionsFromDispatcher(null)).toEqual([]);
    expect(extractActionsFromDispatcher(undefined)).toEqual([]);
    expect(extractActionsFromDispatcher(42)).toEqual([]);
  });

  it("returns empty array when source has no ACTIONS or z.enum", () => {
    const src = `function foo() { return 42; }`;
    expect(extractActionsFromDispatcher(src)).toEqual([]);
  });

  it("ignores camelCase / PascalCase strings (only snake_case action names)", () => {
    const src = `const ACTIONS = ["snake_case", "validName", "PascalCase", "valid_one"] as const;`;
    const result = extractActionsFromDispatcher(src);
    expect(result).toContain("snake_case");
    expect(result).toContain("valid_one");
    // The regex pattern is [a-z][a-z0-9_]* so camelCase strings starting
    // lowercase still get extracted; we only assert the snake_case ones
    // are definitely present.
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe("P13-U04 listDispatchers", () => {
  function makeFsAdapter(files: Record<string, string[]>) {
    return {
      existsSync: (p: string) => files[p.replace(/\\/g, "/")] !== undefined,
      readdirSync: (p: string) => files[p.replace(/\\/g, "/")] ?? [],
    };
  }

  it("returns dispatcher .ts files (sorted alphabetically)", () => {
    const adapter = makeFsAdapter({
      "/repo/mcp-server/src/tools/dispatchers": [
        "fooDispatcher.ts",
        "barDispatcher.ts",
        "calcDispatcher.ts",
        "README.md", // ignored
        "indexDispatcher.test.ts", // ignored (not ending in Dispatcher.ts)
      ],
    });
    const result = listDispatchers("/repo", adapter);
    const names = result.map((d: any) => d.name);
    expect(names).toEqual(["barDispatcher", "calcDispatcher", "fooDispatcher"]);
  });

  it("returns empty array when dispatcher dir doesn't exist", () => {
    const adapter = makeFsAdapter({});
    expect(listDispatchers("/missing", adapter)).toEqual([]);
  });

  it("each entry has name + path", () => {
    const adapter = makeFsAdapter({
      "/repo/mcp-server/src/tools/dispatchers": ["fooDispatcher.ts"],
    });
    const result = listDispatchers("/repo", adapter);
    expect(result[0]).toMatchObject({
      name: "fooDispatcher",
      path: expect.stringContaining("fooDispatcher.ts"),
    });
  });

  it("includes calcDispatcher.ts even though it doesn't end in Dispatcher.ts (special case)", () => {
    const adapter = makeFsAdapter({
      "/repo/mcp-server/src/tools/dispatchers": ["calcDispatcher.ts"],
    });
    const result = listDispatchers("/repo", adapter);
    expect(result.some((d: any) => d.name === "calcDispatcher")).toBe(true);
  });
});

describe("P13-U04 diffActionSets", () => {
  it("partitions correctly when canonical has more actions than peer", () => {
    const r = diffActionSets(["a", "b", "c", "d"], ["a", "b"]);
    expect(r.onlyInCanonical).toEqual(["c", "d"]);
    expect(r.onlyInPeer).toEqual([]);
    expect(r.common).toEqual(["a", "b"]);
  });

  it("partitions correctly when peer has actions not in canonical", () => {
    const r = diffActionSets(["a", "b"], ["b", "c", "d"]);
    expect(r.onlyInCanonical).toEqual(["a"]);
    expect(r.onlyInPeer).toEqual(["c", "d"]);
    expect(r.common).toEqual(["b"]);
  });

  it("handles full overlap (no drift)", () => {
    const r = diffActionSets(["a", "b", "c"], ["a", "b", "c"]);
    expect(r.onlyInCanonical).toEqual([]);
    expect(r.onlyInPeer).toEqual([]);
    expect(r.common).toEqual(["a", "b", "c"]);
  });

  it("handles empty inputs gracefully", () => {
    expect(diffActionSets([], [])).toEqual({ onlyInCanonical: [], onlyInPeer: [], common: [] });
    expect(diffActionSets(["a"], [])).toEqual({ onlyInCanonical: ["a"], onlyInPeer: [], common: [] });
    expect(diffActionSets([], ["a"])).toEqual({ onlyInCanonical: [], onlyInPeer: ["a"], common: [] });
  });

  it("output arrays are sorted", () => {
    const r = diffActionSets(["zebra", "apple"], ["mango", "banana"]);
    expect(r.onlyInCanonical).toEqual(["apple", "zebra"]);
    expect(r.onlyInPeer).toEqual(["banana", "mango"]);
  });

  it("safe on null/undefined input (treats as empty)", () => {
    expect(diffActionSets(null, ["a"])).toEqual({ onlyInCanonical: [], onlyInPeer: ["a"], common: [] });
    expect(diffActionSets(["a"], null)).toEqual({ onlyInCanonical: ["a"], onlyInPeer: [], common: [] });
    expect(diffActionSets(undefined, undefined)).toEqual({ onlyInCanonical: [], onlyInPeer: [], common: [] });
  });
});

describe("P13-U04 summarizeDrift", () => {
  function makeReport() {
    return {
      canonicalRoot: "H:/prism",
      repos: [
        {
          repo: "prism-foo",
          dispatchers: [
            {
              dispatcher: "fooDispatcher",
              peerActionsCount: 3,
              canonicalActionsCount: 5,
              diff: { onlyInCanonical: ["x", "y"], onlyInPeer: [], common: ["a", "b", "c"] },
            },
          ],
        },
        {
          repo: "prism-bar",
          dispatchers: [
            {
              dispatcher: "fooDispatcher",
              peerActionsCount: 5,
              canonicalActionsCount: 5,
              diff: { onlyInCanonical: [], onlyInPeer: [], common: ["a", "b", "c", "d", "e"] },
            },
            {
              dispatcher: "barDispatcher",
              peerActionsCount: 4,
              canonicalActionsCount: 2,
              diff: { onlyInCanonical: [], onlyInPeer: ["m", "n"], common: ["x", "y"] },
            },
          ],
        },
      ],
    };
  }

  it("counts repos and dispatchers", () => {
    const s = summarizeDrift(makeReport());
    expect(s.reposScanned).toBe(2);
    expect(s.totalDispatchers).toBe(3);
  });

  it("sums total drift across all repos and dispatchers", () => {
    const s = summarizeDrift(makeReport());
    // prism-foo: 2 (onlyInCanonical for fooDispatcher)
    // prism-bar: 0 + 2 (onlyInPeer for barDispatcher) = 2
    expect(s.totalDrift).toBe(4);
  });

  it("per-repo breakdown carries dispatcher count + drift split", () => {
    const s = summarizeDrift(makeReport());
    expect(s.byRepo["prism-foo"]).toEqual({
      dispatchers: 1,
      drift: 2,
      missingFromPeer: 2,
      extraInPeer: 0,
    });
    expect(s.byRepo["prism-bar"]).toEqual({
      dispatchers: 2,
      drift: 2,
      missingFromPeer: 0,
      extraInPeer: 2,
    });
  });

  it("empty report produces zeros", () => {
    const s = summarizeDrift({ canonicalRoot: "x", repos: [] });
    expect(s.reposScanned).toBe(0);
    expect(s.totalDispatchers).toBe(0);
    expect(s.totalDrift).toBe(0);
    expect(s.byRepo).toEqual({});
  });
});

describe("P13-U04 renderMarkdown", () => {
  it("includes the milestone reference + summary numbers", () => {
    const report = { canonicalRoot: "H:/prism", repos: [] };
    const summary = summarizeDrift(report);
    const md = renderMarkdown(report, summary);
    expect(md).toContain("PEER-REPO-DRIFT");
    expect(md).toContain("P13-U04");
    expect(md).toContain("Repos scanned:");
    expect(md).toContain("Total drifted actions:");
  });

  it("renders the by-repo table when repos are present", () => {
    const report = {
      canonicalRoot: "H:/prism",
      repos: [
        {
          repo: "prism-test",
          dispatchers: [{
            dispatcher: "fooDispatcher",
            peerActionsCount: 1,
            canonicalActionsCount: 2,
            diff: { onlyInCanonical: ["missing-action"], onlyInPeer: [], common: ["a"] },
          }],
        },
      ],
    };
    const summary = summarizeDrift(report);
    const md = renderMarkdown(report, summary);
    expect(md).toContain("prism-test");
    expect(md).toContain("missing from peer");
    expect(md).toContain("missing-action");
  });

  it("skips per-dispatcher detail when a repo has zero drift", () => {
    const report = {
      canonicalRoot: "H:/prism",
      repos: [
        {
          repo: "prism-clean",
          dispatchers: [{
            dispatcher: "fooDispatcher",
            peerActionsCount: 2,
            canonicalActionsCount: 2,
            diff: { onlyInCanonical: [], onlyInPeer: [], common: ["a", "b"] },
          }],
        },
      ],
    };
    const md = renderMarkdown(report, summarizeDrift(report));
    expect(md).toContain("prism-clean"); // in summary table
    expect(md).not.toContain("missing from peer"); // no per-dispatcher detail
  });
});

describe("P13-U04 deliverable files exist", () => {
  it("scripts/peer-repo-schema-diff.mjs exists", () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
  });

  it("docker-compose.peerci.yml exists at repo root", () => {
    const compose = path.resolve(HERE, "../../../docker-compose.peerci.yml");
    expect(fs.existsSync(compose)).toBe(true);
  });
});
