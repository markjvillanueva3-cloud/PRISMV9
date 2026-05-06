/**
 * PeerRepoSignatureEngine tests — P16-U01.
 *
 * Covers:
 *  - classifyFile: all 5 asset kinds plus "other" + path normalization
 *  - isMachiningSpecific: positive + negative cases
 *  - basenameNoExt: extension stripping + path edge cases
 *  - buildSignature: multi-kind classification, dedup, machining segregation,
 *                    sort stability, oversize/non-string filtering
 *  - diffSignatures: peer-only, canonical-only, both-empty, identical
 *  - summarize: ranking by peer_only_count desc, tie-break alphabetical,
 *               cross-peer union counts
 *  - countUniqueAssets: sums all five kinds
 *  - adversarial: null, undefined, malformed inputs — must not throw
 */

import { describe, it, expect } from "vitest";
import { PeerRepoSignatureEngine, type RepoSignature, type PerRepoUniques } from "../engines/PeerRepoSignatureEngine.js";

const eng = new PeerRepoSignatureEngine();

describe("PeerRepoSignatureEngine — classifyFile", () => {
  it("classifies engine paths", () => {
    expect(eng.classifyFile("mcp-server/src/engines/FooEngine.ts")).toBe("engine");
    expect(eng.classifyFile("nested/mcp-server/src/engines/Bar.ts")).toBe("engine");
  });

  it("classifies dispatcher paths", () => {
    expect(eng.classifyFile("mcp-server/src/tools/dispatchers/fooDispatcher.ts")).toBe("dispatcher");
  });

  it("classifies hook paths (mjs/js/ts)", () => {
    expect(eng.classifyFile(".claude/hooks/foo-hook.mjs")).toBe("hook");
    expect(eng.classifyFile(".claude/hooks/bar.js")).toBe("hook");
    expect(eng.classifyFile(".claude/hooks/baz.ts")).toBe("hook");
  });

  it("classifies skill (.claude/commands) paths", () => {
    expect(eng.classifyFile(".claude/commands/dedup.md")).toBe("skill");
  });

  it("classifies script paths in scripts/ and mcp-server/scripts/", () => {
    expect(eng.classifyFile("scripts/foo.mjs")).toBe("script");
    expect(eng.classifyFile("mcp-server/scripts/bar.js")).toBe("script");
    expect(eng.classifyFile("scripts/baz.sh")).toBe("script");
    expect(eng.classifyFile("scripts/qux.ps1")).toBe("script");
    expect(eng.classifyFile("scripts/quux.py")).toBe("script");
  });

  it("returns other for unrecognized paths", () => {
    expect(eng.classifyFile("README.md")).toBe("other");
    expect(eng.classifyFile("docs/foo.txt")).toBe("other");
    expect(eng.classifyFile("mcp-server/src/schemas/foo.ts")).toBe("other");
  });

  it("normalizes Windows backslashes", () => {
    expect(eng.classifyFile("mcp-server\\src\\engines\\FooEngine.ts")).toBe("engine");
    expect(eng.classifyFile(".claude\\hooks\\foo.mjs")).toBe("hook");
  });

  it("is case-insensitive on path segments", () => {
    expect(eng.classifyFile("MCP-SERVER/src/engines/Foo.ts")).toBe("engine");
  });

  it("returns other for empty / non-string input", () => {
    expect(eng.classifyFile("")).toBe("other");
    // @ts-expect-error — adversarial input
    expect(eng.classifyFile(null)).toBe("other");
    // @ts-expect-error — adversarial input
    expect(eng.classifyFile(undefined)).toBe("other");
    // @ts-expect-error — adversarial input
    expect(eng.classifyFile(42)).toBe("other");
  });
});

describe("PeerRepoSignatureEngine — isMachiningSpecific", () => {
  it("flags machining-domain names", () => {
    expect(eng.isMachiningSpecific("MillForceEngine")).toBe(true);
    expect(eng.isMachiningSpecific("LathePostEngine")).toBe(true);
    expect(eng.isMachiningSpecific("WedmCutEngine")).toBe(true);
    expect(eng.isMachiningSpecific("HypermillBridge")).toBe(true);
    expect(eng.isMachiningSpecific("MastercamPostGen")).toBe(true);
    expect(eng.isMachiningSpecific("KienzleSolver")).toBe(true);
    expect(eng.isMachiningSpecific("TaylorToolLifeEngine")).toBe(true);
    expect(eng.isMachiningSpecific("SpindleLoadAnalyzer")).toBe(true);
    expect(eng.isMachiningSpecific("cutting-force-calc")).toBe(true);
    expect(eng.isMachiningSpecific("ppg-fanuc-foo")).toBe(true);
    expect(eng.isMachiningSpecific("PostProcessorEngine")).toBe(true);
  });

  it("does not flag infrastructure names", () => {
    expect(eng.isMachiningSpecific("PeerRepoSignatureEngine")).toBe(false);
    expect(eng.isMachiningSpecific("MemoryDBAuditEngine")).toBe(false);
    expect(eng.isMachiningSpecific("KnowledgeIngestEngine")).toBe(false);
    expect(eng.isMachiningSpecific("VaultBacklinkEngine")).toBe(false);
    expect(eng.isMachiningSpecific("PlanTrajectoryExtractorEngine")).toBe(false);
  });

  it("returns false for empty / non-string input", () => {
    expect(eng.isMachiningSpecific("")).toBe(false);
    // @ts-expect-error — adversarial
    expect(eng.isMachiningSpecific(null)).toBe(false);
    // @ts-expect-error — adversarial
    expect(eng.isMachiningSpecific(undefined)).toBe(false);
  });
});

describe("PeerRepoSignatureEngine — basenameNoExt", () => {
  it("strips extension from file path", () => {
    expect(eng.basenameNoExt("foo/bar/Baz.ts")).toBe("Baz");
    expect(eng.basenameNoExt("Foo.mjs")).toBe("Foo");
  });

  it("handles files without extension", () => {
    expect(eng.basenameNoExt("foo/Bar")).toBe("Bar");
  });

  it("normalizes backslashes", () => {
    expect(eng.basenameNoExt("foo\\bar\\Baz.ts")).toBe("Baz");
  });

  it("returns empty string on empty / non-string", () => {
    expect(eng.basenameNoExt("")).toBe("");
    // @ts-expect-error — adversarial
    expect(eng.basenameNoExt(null)).toBe("");
  });
});

describe("PeerRepoSignatureEngine — buildSignature", () => {
  it("classifies multi-asset paths into the right buckets", () => {
    const sig = eng.buildSignature("/repo", [
      "mcp-server/src/engines/FooEngine.ts",
      "mcp-server/src/engines/BarEngine.ts",
      "mcp-server/src/tools/dispatchers/fooDispatcher.ts",
      ".claude/hooks/foo-hook.mjs",
      ".claude/commands/foo.md",
      "scripts/build.mjs",
      "README.md",
    ]);
    expect(sig.engines).toEqual(["BarEngine", "FooEngine"]);
    expect(sig.dispatchers).toEqual(["fooDispatcher"]);
    expect(sig.hooks).toEqual(["foo-hook"]);
    expect(sig.skills).toEqual(["foo"]);
    expect(sig.scripts).toEqual(["build"]);
    expect(sig.filtered_machining).toEqual([]);
  });

  it("segregates machining-domain assets into filtered_machining", () => {
    const sig = eng.buildSignature("/repo", [
      "mcp-server/src/engines/MillForceEngine.ts",
      "mcp-server/src/engines/PeerRepoSignatureEngine.ts",
      ".claude/hooks/lathe-helper.mjs",
    ]);
    expect(sig.engines).toEqual(["PeerRepoSignatureEngine"]);
    expect(sig.hooks).toEqual([]);
    expect(sig.filtered_machining.sort()).toEqual([
      "engine/MillForceEngine",
      "hook/lathe-helper",
    ]);
  });

  it("dedups same kind+basename across nested locations", () => {
    const sig = eng.buildSignature("/repo", [
      "mcp-server/src/engines/FooEngine.ts",
      "subdir/mcp-server/src/engines/FooEngine.ts",
    ]);
    expect(sig.engines).toEqual(["FooEngine"]);
  });

  it("filters out non-string and oversize entries silently", () => {
    const huge = "x".repeat(600);
    const sig = eng.buildSignature("/repo", [
      "mcp-server/src/engines/FooEngine.ts",
      // @ts-expect-error — adversarial
      null,
      // @ts-expect-error — adversarial
      42,
      "",
      huge,
    ]);
    expect(sig.engines).toEqual(["FooEngine"]);
  });

  it("normalizes repo_root backslashes", () => {
    const sig = eng.buildSignature("H:\\foo\\bar", []);
    expect(sig.repo_root).toBe("H:/foo/bar");
  });

  it("returns empty signature on non-array input", () => {
    // @ts-expect-error — adversarial
    const sig = eng.buildSignature("/repo", null);
    expect(sig.engines).toEqual([]);
    expect(sig.dispatchers).toEqual([]);
  });

  it("output arrays are sorted ascending", () => {
    const sig = eng.buildSignature("/repo", [
      "mcp-server/src/engines/Zeta.ts",
      "mcp-server/src/engines/Alpha.ts",
      "mcp-server/src/engines/Mu.ts",
    ]);
    expect(sig.engines).toEqual(["Alpha", "Mu", "Zeta"]);
  });
});

describe("PeerRepoSignatureEngine — diffSignatures", () => {
  function mkSig(name: string, engines: string[], hooks: string[] = []): RepoSignature {
    return {
      repo_root: name,
      engines: [...engines].sort(),
      dispatchers: [],
      hooks: [...hooks].sort(),
      skills: [],
      scripts: [],
      filtered_machining: [],
    };
  }

  it("identifies engines unique to peer", () => {
    const canonical = mkSig("/canonical", ["A", "B"]);
    const peer = mkSig("/peer", ["A", "C"]);
    const diff = eng.diffSignatures(canonical, peer);
    expect(diff.unique_to_peer.engines).toEqual(["C"]);
    expect(diff.unique_to_canonical.engines).toEqual(["B"]);
  });

  it("returns empty arrays on identical signatures", () => {
    const a = mkSig("/a", ["X", "Y"], ["h1"]);
    const b = mkSig("/b", ["X", "Y"], ["h1"]);
    const diff = eng.diffSignatures(a, b);
    expect(diff.unique_to_peer.engines).toEqual([]);
    expect(diff.unique_to_canonical.engines).toEqual([]);
    expect(diff.unique_to_peer.hooks).toEqual([]);
  });

  it("handles null inputs without throwing", () => {
    // @ts-expect-error — adversarial
    const diff = eng.diffSignatures(null, null);
    expect(diff.unique_to_peer.engines).toEqual([]);
    expect(diff.unique_to_canonical.engines).toEqual([]);
  });

  it("diffs all five asset kinds independently", () => {
    const canonical: RepoSignature = {
      repo_root: "/c",
      engines: ["E1"], dispatchers: ["D1"], hooks: ["H1"],
      skills: ["S1"], scripts: ["X1"], filtered_machining: [],
    };
    const peer: RepoSignature = {
      repo_root: "/p",
      engines: ["E2"], dispatchers: ["D2"], hooks: ["H2"],
      skills: ["S2"], scripts: ["X2"], filtered_machining: [],
    };
    const diff = eng.diffSignatures(canonical, peer);
    expect(diff.unique_to_peer.engines).toEqual(["E2"]);
    expect(diff.unique_to_peer.dispatchers).toEqual(["D2"]);
    expect(diff.unique_to_peer.hooks).toEqual(["H2"]);
    expect(diff.unique_to_peer.skills).toEqual(["S2"]);
    expect(diff.unique_to_peer.scripts).toEqual(["X2"]);
  });
});

describe("PeerRepoSignatureEngine — summarize", () => {
  function mkPerRepo(repo: string, peerOnly: number, engines: string[] = []): PerRepoUniques {
    return {
      repo_root: repo,
      unique_to_peer: { engines, dispatchers: [], hooks: [], skills: [], scripts: [] },
      unique_to_canonical: { engines: [], dispatchers: [], hooks: [], skills: [], scripts: [] },
      peer_only_count: peerOnly,
    };
  }

  it("ranks peers by peer_only_count desc with alphabetical tie-break", () => {
    const summary = eng.summarize([
      mkPerRepo("/c", 5),
      mkPerRepo("/a", 10),
      mkPerRepo("/b", 5),
    ]);
    expect(summary.peerRanking.map((p) => p.repo_root)).toEqual(["/a", "/b", "/c"]);
  });

  it("counts unique engines/hooks/skills as union across all peers", () => {
    const summary = eng.summarize([
      {
        repo_root: "/a", peer_only_count: 2,
        unique_to_peer: { engines: ["E1", "E2"], dispatchers: [], hooks: ["H1"], skills: ["S1"], scripts: [] },
        unique_to_canonical: { engines: [], dispatchers: [], hooks: [], skills: [], scripts: [] },
      },
      {
        repo_root: "/b", peer_only_count: 2,
        unique_to_peer: { engines: ["E2", "E3"], dispatchers: [], hooks: ["H1", "H2"], skills: ["S2"], scripts: [] },
        unique_to_canonical: { engines: [], dispatchers: [], hooks: [], skills: [], scripts: [] },
      },
    ]);
    expect(summary.totalPeers).toBe(2);
    expect(summary.totalUniqueEnginesAcrossPeers).toBe(3); // E1, E2, E3
    expect(summary.totalUniqueHooksAcrossPeers).toBe(2);   // H1, H2
    expect(summary.totalUniqueSkillsAcrossPeers).toBe(2);  // S1, S2
  });

  it("returns zero-baseline on empty / null input", () => {
    expect(eng.summarize([]).totalPeers).toBe(0);
    // @ts-expect-error — adversarial
    expect(eng.summarize(null).totalPeers).toBe(0);
  });

  it("treats non-finite peer_only_count as zero", () => {
    const summary = eng.summarize([
      // @ts-expect-error — adversarial
      mkPerRepo("/a", NaN),
      mkPerRepo("/b", 1),
    ]);
    expect(summary.peerRanking[0].repo_root).toBe("/b");
    expect(summary.peerRanking[1].peer_only_count).toBe(0);
  });
});

describe("PeerRepoSignatureEngine — countUniqueAssets", () => {
  it("sums lengths across all five kinds", () => {
    const n = eng.countUniqueAssets({
      engines: ["a", "b"], dispatchers: ["c"], hooks: ["d", "e", "f"],
      skills: [], scripts: ["g"],
    });
    expect(n).toBe(7);
  });

  it("returns 0 for null input", () => {
    // @ts-expect-error — adversarial
    expect(eng.countUniqueAssets(null)).toBe(0);
  });

  it("ignores non-array fields", () => {
    const n = eng.countUniqueAssets({
      // @ts-expect-error — adversarial
      engines: "not-an-array",
      dispatchers: ["a"], hooks: [], skills: [], scripts: [],
    });
    expect(n).toBe(1);
  });
});

describe("PeerRepoSignatureEngine — emptySignature", () => {
  it("returns the canonical empty shape", () => {
    const sig = eng.emptySignature("/repo");
    expect(sig.repo_root).toBe("/repo");
    expect(sig.engines).toEqual([]);
    expect(sig.dispatchers).toEqual([]);
    expect(sig.hooks).toEqual([]);
    expect(sig.skills).toEqual([]);
    expect(sig.scripts).toEqual([]);
    expect(sig.filtered_machining).toEqual([]);
  });

  it("coerces non-string repoRoot to empty string", () => {
    // @ts-expect-error — adversarial
    expect(eng.emptySignature(null).repo_root).toBe("");
  });
});
