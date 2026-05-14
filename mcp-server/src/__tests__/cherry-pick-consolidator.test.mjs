/**
 * Tests for scripts/cherry-pick-consolidator.mjs — the pure logic that the
 * safety of WORKTREE-CONSOLIDATE-MS0 landings rests on. Every assertion encodes
 * WHY the behavior matters (R9): a wrong `git cherry` parse lands already-landed
 * commits; a wrong unsafeTargetReason lets --execute cherry-pick onto an
 * integration branch; a wrong scope group reorders commits and breaks the
 * cherry-pick chain.
 *
 * Lives under mcp-server/src/__tests__/ so the canonical vitest suite discovers
 * it (vitest from mcp-server/ globs test.mjs files); the script under test is the
 * repo-root scripts/ tool, imported by relative path.
 */
import { describe, it, expect } from "vitest";
import {
  parseArgs,
  parseGitCherry,
  scopeOf,
  groupByScope,
  assessConflictRisk,
  unsafeTargetReason,
} from "../../../scripts/cherry-pick-consolidator.mjs";

describe("cherry-pick-consolidator: parseArgs", () => {
  it("accepts a minimal valid plan-mode invocation", () => {
    const { args, errors } = parseArgs(["--source", "work/ppgh05"]);
    expect(errors).toEqual([]);
    expect(args.source).toBe("work/ppgh05");
    expect(args.base).toBe("origin/cad-fusion-live-ms0"); // default
    expect(args.execute).toBe(false);
  });

  it("requires --source", () => {
    const { errors } = parseArgs(["--base", "origin/main"]);
    expect(errors).toContain("--source <branch> is required");
  });

  it("requires --target AND --target-worktree when --execute is set", () => {
    const { errors } = parseArgs(["--source", "work/x", "--execute"]);
    expect(errors).toContain("--execute requires --target <branch>");
    expect(errors).toContain(
      "--execute requires --target-worktree <path> (never cherry-pick in the main tree)",
    );
  });

  it("accepts the inline --flag=value form", () => {
    const { args, errors } = parseArgs(["--source=work/x", "--base=origin/main"]);
    expect(errors).toEqual([]);
    expect(args.source).toBe("work/x");
    expect(args.base).toBe("origin/main");
  });

  it("rejects an unknown argument and a value-flag missing its value", () => {
    const a = parseArgs(["--source", "work/x", "--bogus"]);
    expect(a.errors).toContain("unknown argument: --bogus");
    const b = parseArgs(["--source", "work/x", "--base", "--json"]);
    expect(b.errors).toContain("--base requires a value");
  });

  it("collects a full execute-mode invocation with no errors", () => {
    const { args, errors } = parseArgs([
      "--source", "work/ppgh05",
      "--execute",
      "--target", "work/merge-staging-ms0",
      "--target-worktree", "H:/prism-merge-staging",
    ]);
    expect(errors).toEqual([]);
    expect(args.execute).toBe(true);
    expect(args.target).toBe("work/merge-staging-ms0");
    expect(args.targetWorktree).toBe("H:/prism-merge-staging");
  });
});

describe("cherry-pick-consolidator: parseGitCherry", () => {
  it("splits `+` (to land) from `-` (already landed by patch-id)", () => {
    const sample = [
      "+ 1111111aaaa [CAM-EXHAUST-MS0]/U-1: add engine",
      "- 2222222bbbb [CAM-EXHAUST-MS0]/U-2: already on base",
      "+ 3333333cccc fix typo",
    ].join("\n");
    const { toLand, alreadyLanded } = parseGitCherry(sample);
    expect(toLand.map((c) => c.sha)).toEqual(["1111111aaaa", "3333333cccc"]);
    expect(alreadyLanded.map((c) => c.sha)).toEqual(["2222222bbbb"]);
    expect(toLand[0].subject).toBe("[CAM-EXHAUST-MS0]/U-1: add engine");
  });

  it("returns empty arrays for empty / whitespace / null input (no spurious commits)", () => {
    expect(parseGitCherry("")).toEqual({ toLand: [], alreadyLanded: [] });
    expect(parseGitCherry("\n  \n")).toEqual({ toLand: [], alreadyLanded: [] });
    expect(parseGitCherry(null)).toEqual({ toLand: [], alreadyLanded: [] });
  });

  it("ignores lines that are not git-cherry rows", () => {
    const { toLand, alreadyLanded } = parseGitCherry("garbage line\n+ deadbeef1 real one\nanother junk");
    expect(toLand).toEqual([{ sha: "deadbeef1", subject: "real one" }]);
    expect(alreadyLanded).toEqual([]);
  });
});

describe("cherry-pick-consolidator: scopeOf", () => {
  it("extracts the leading [SCOPE] tag and upper-cases it", () => {
    expect(scopeOf("[CAM-EXHAUST-MS0]/U-1: title")).toBe("CAM-EXHAUST-MS0");
    expect(scopeOf("[hook-synergy-ms0] lower scope")).toBe("HOOK-SYNERGY-MS0");
  });

  it("returns (unscoped) when there is no leading tag", () => {
    expect(scopeOf("fix typo in readme")).toBe("(unscoped)");
    expect(scopeOf("")).toBe("(unscoped)");
    expect(scopeOf(null)).toBe("(unscoped)");
  });

  it("only matches a tag at the very start, not mid-subject", () => {
    expect(scopeOf("merge branch [FOO] into bar")).toBe("(unscoped)");
  });
});

describe("cherry-pick-consolidator: groupByScope", () => {
  it("groups by scope, sorts groups by count desc, and preserves commit order", () => {
    const commits = [
      { sha: "a1", subject: "[ALPHA] first" },
      { sha: "b1", subject: "[BETA] only" },
      { sha: "a2", subject: "[ALPHA] second" },
      { sha: "a3", subject: "[ALPHA] third" },
    ];
    const groups = groupByScope(commits);
    expect(groups.map((g) => g.scope)).toEqual(["ALPHA", "BETA"]); // ALPHA(3) before BETA(1)
    expect(groups[0].count).toBe(3);
    // order within the group must be the original (cherry-pick chain order)
    expect(groups[0].commits.map((c) => c.sha)).toEqual(["a1", "a2", "a3"]);
  });

  it("returns an empty array for no commits", () => {
    expect(groupByScope([])).toEqual([]);
  });
});

describe("cherry-pick-consolidator: assessConflictRisk", () => {
  it("flags HIGH when most commits touch contention hot-spots", () => {
    const commits = [{ sha: "x1", subject: "a" }, { sha: "x2", subject: "b" }];
    const filesBySha = {
      x1: ["mcp-server/src/tools/dispatchers/camDispatcher.ts"],
      x2: ["mcp-server/src/schemas/camActionSchemas.ts"],
    };
    const r = assessConflictRisk(commits, filesBySha);
    expect(r.level).toBe("high");
    expect(r.hotCommits).toBe(2);
    expect(r.hotFiles.length).toBe(2);
  });

  it("returns LOW when no commit touches a hot-spot", () => {
    const commits = [{ sha: "x1", subject: "a" }];
    const r = assessConflictRisk(commits, { x1: ["docs/readme.md", "src/engines/Foo.ts"] });
    expect(r.level).toBe("low");
    expect(r.hotCommits).toBe(0);
  });

  it("returns MEDIUM when a minority of commits are hot", () => {
    const commits = Array.from({ length: 10 }, (_, i) => ({ sha: String(i + 1), subject: "" }));
    const filesBySha = { 1: ["package.json"] }; // 1 of 10 hot → ratio 0.1, hotCommits>0
    const r = assessConflictRisk(commits, filesBySha);
    expect(r.level).toBe("medium");
    expect(r.hotCommits).toBe(1);
  });

  it("handles empty input without dividing by zero", () => {
    const r = assessConflictRisk([], {});
    expect(r.level).toBe("low");
    expect(r.totalCommits).toBe(0);
  });
});

describe("cherry-pick-consolidator: unsafeTargetReason", () => {
  const BASE = "origin/cad-fusion-live-ms0";

  it("refuses the base branch itself", () => {
    expect(unsafeTargetReason("cad-fusion-live-ms0", BASE)).toMatch(/IS the base branch/);
  });

  it("refuses base ref via origin/ alias from either direction (symmetric normalize)", () => {
    // operator types --base cad-fusion-live-ms0 (local), --target origin/cad-fusion-live-ms0
    expect(unsafeTargetReason("origin/cad-fusion-live-ms0", "cad-fusion-live-ms0")).toMatch(/IS the base branch/);
    // and the reverse
    expect(unsafeTargetReason("cad-fusion-live-ms0", "origin/cad-fusion-live-ms0")).toMatch(/IS the base branch/);
  });

  it("refuses the original protected integration-branch shapes", () => {
    expect(unsafeTargetReason("main", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("master", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("origin/work/x", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("cad-fusion-live-ms1", BASE)).toMatch(/protected/);
  });

  it("refuses the expanded protected shapes (develop/release/*/prod/staging/HEAD/trunk)", () => {
    // These were missing in the original list — adding them was a P0 fix from
    // scrutiny: a 47-worktree consolidation that lands onto `develop` would be
    // a P0 incident the script claims to prevent.
    expect(unsafeTargetReason("develop", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("release/v1", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("prod", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("production", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("staging", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("HEAD", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("trunk", BASE)).toMatch(/protected/);
  });

  it("trims whitespace so clipboard-paste artifacts cannot bypass the regex check", () => {
    // adversarial input from a tired 2am operator pasting from a terminal:
    expect(unsafeTargetReason(" main", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("main\n", BASE)).toMatch(/protected/);
    expect(unsafeTargetReason("\tmain\t", BASE)).toMatch(/protected/);
    // whitespace-only target → still "no target branch"
    expect(unsafeTargetReason("   ", BASE)).toBe("no target branch");
  });

  it("refuses target == source (would be a no-op or self-overwrite)", () => {
    expect(unsafeTargetReason("work/foo", BASE, "work/foo")).toMatch(/IS the source branch/);
    // also works through origin/ normalization
    expect(unsafeTargetReason("origin/work/foo", BASE, "work/foo")).toMatch(/IS the source branch/);
  });

  it("allows a genuine staging branch", () => {
    expect(unsafeTargetReason("work/merge-staging-ms0", BASE)).toBeNull();
    expect(unsafeTargetReason("work/worktree-consolidate-ms0", BASE)).toBeNull();
    // un-set source argument must not break the genuine-staging case
    expect(unsafeTargetReason("work/merge-staging-ms0", BASE, undefined)).toBeNull();
  });

  it("refuses an empty / missing target", () => {
    expect(unsafeTargetReason("", BASE)).toBe("no target branch");
    expect(unsafeTargetReason(null, BASE)).toBe("no target branch");
  });
});
