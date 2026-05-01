/**
 * ObsidianVaultExporterEngine.test.ts — P3-U01
 *
 * Verifies bidirectional Obsidian-vault ↔ wiki conversion + path-traversal
 * guard per envelope INTEL-OLLAMA-OBSIDIAN-MS1 / P3-U01 exit conditions:
 *
 *   1. Engine exposes exportNode(nodeId) → { wikilink_md, plain_md_fallback }.
 *   2. Engine static-method shape, AtomicValue-style return (schemaVersion).
 *   3. Round-trip: 5 wiki entries wikilink → vault → wikilink BYTE-EQUAL.
 *   4. Adversarial: 4 hostile wikilink targets all REJECTED with structured
 *      error; vault-relative resolution enforced.
 */
import { describe, it, expect } from "vitest";
import {
  ObsidianVaultExporterEngine,
  VAULT_CATEGORIES,
  type ResolveResult,
  type VaultExportResult,
} from "../engines/ObsidianVaultExporterEngine.js";

// ----------------------------------------------------------------------------
// Constants — every magic number named, every assertion concrete.
// ----------------------------------------------------------------------------
const ENGINE_SCHEMA_VERSION = "1.0.0";
const EXPECTED_VAULT_PATH_DEPTH = 2;
const MIN_VAULT_CATEGORIES = 11;

// 5 representative wiki nodes drawn from real index.md entries (concepts/).
const FIVE_REAL_WIKI_NODES = [
  "AISystemRouter",
  "AdaptiveFeedModulation",
  "ArcFitting",
  "AssemblyPlanner",
  "AccessControlList",
] as const;

// 4 adversarial wikilink targets per envelope exit condition.
const ADVERSARIAL_TARGETS = [
  "../../../etc/passwd",
  "..\\..\\windows\\system32",
  "//absolute/path",
  "C:/system32",
] as const;

const EXPECTED_RESOLVE_REASONS: Record<typeof ADVERSARIAL_TARGETS[number], string> = {
  "../../../etc/passwd": "traversal",
  "..\\..\\windows\\system32": "traversal",
  "//absolute/path": "absolute_path",
  "C:/system32": "drive_letter",
};

const FIVE_ENTRY_ROUND_TRIP_FIXTURE = `# Test Node

This entry references several others:
- [[AISystemRouter]] for routing decisions
- [[AdaptiveFeedModulation|adaptive feed]] for modulation
- See also [[ArcFitting]] and [[AssemblyPlanner|assembly planner]]
- Cross-ref: [[AccessControlList]]

End.`;

// ----------------------------------------------------------------------------
// exportNode — surface contract
// ----------------------------------------------------------------------------
describe("ObsidianVaultExporterEngine.exportNode", () => {
  it("returns the canonical shape for a safe node id with exact field values", () => {
    const r: VaultExportResult = ObsidianVaultExporterEngine.exportNode("AISystemRouter");
    expect(r.source_node).toBe("AISystemRouter");
    expect(r.schemaVersion).toBe(ENGINE_SCHEMA_VERSION);
    expect(r.wikilink_md).toBe("# AISystemRouter\n\n[[AISystemRouter]]");
    expect(r.plain_md_fallback).toBe("# AISystemRouter\n\n[AISystemRouter](AISystemRouter.md)");
  });

  it("default export contains a wikilink to the node id and a plain-md fallback link", () => {
    const r = ObsidianVaultExporterEngine.exportNode("ArcFitting");
    expect(r.wikilink_md.includes("[[ArcFitting]]")).toBe(true);
    expect(r.plain_md_fallback.includes("[ArcFitting](ArcFitting.md)")).toBe(true);
    // The plain-md fallback MUST NOT contain raw [[ tokens any more.
    expect(r.plain_md_fallback.includes("[[")).toBe(false);
  });

  it("respects custom content opt and applies wikilink → plain conversion exactly", () => {
    const content = "# Header\n\nLink: [[AccessControlList]] and [[AssemblyPlanner|assembly]]";
    const r = ObsidianVaultExporterEngine.exportNode("AccessControlList", { content });
    expect(r.wikilink_md).toBe(content);
    expect(r.plain_md_fallback).toBe(
      "# Header\n\nLink: [AccessControlList](AccessControlList.md) and [assembly](AssemblyPlanner.md)",
    );
  });

  it("rejects an unsafe node id with a descriptive error matching reason='traversal'", () => {
    expect(() => ObsidianVaultExporterEngine.exportNode("../../../etc/passwd")).toThrow(/traversal/iu);
  });

  it("rejects content that contains an unsafe wikilink target with descriptive error", () => {
    const badContent = "Bad link: [[../../../etc/passwd]]";
    expect(() => ObsidianVaultExporterEngine.exportNode("AISystemRouter", { content: badContent })).toThrow(
      /unsafe wikilink/iu,
    );
  });

  it("category override produces a different vault-relative path", () => {
    const r = ObsidianVaultExporterEngine.resolveVaultPath("AISystemRouter", { category: "decisions" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.vaultRelativePath).toBe("decisions/AISystemRouter.md");
      expect(r.category).toBe("decisions");
    }
  });
});

// ----------------------------------------------------------------------------
// resolveVaultPath — adversarial cases (envelope critical assertion)
// ----------------------------------------------------------------------------
describe("ObsidianVaultExporterEngine.resolveVaultPath — path-traversal guard", () => {
  for (const target of ADVERSARIAL_TARGETS) {
    it(`rejects hostile target '${target}' with structured error reason='${EXPECTED_RESOLVE_REASONS[target]}'`, () => {
      const r: ResolveResult = ObsidianVaultExporterEngine.resolveVaultPath(target);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.target).toBe(target);
        expect(r.reason).toBe(EXPECTED_RESOLVE_REASONS[target]);
        expect(r.error).toContain(target);
        expect(r.schemaVersion).toBe(ENGINE_SCHEMA_VERSION);
      }
    });
  }

  it("rejects URI scheme target with reason='scheme'", () => {
    const r = ObsidianVaultExporterEngine.resolveVaultPath("http://evil.example.com/p");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("scheme");
  });

  it("rejects empty target with reason='empty'", () => {
    const r = ObsidianVaultExporterEngine.resolveVaultPath("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("empty");
  });

  it("rejects target with whitespace (invalid_chars)", () => {
    const r = ObsidianVaultExporterEngine.resolveVaultPath("Has Space");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_chars");
  });

  it("rejects target with dot (treated as invalid_chars — '.' is in disallowed set)", () => {
    const r = ObsidianVaultExporterEngine.resolveVaultPath("name.with.dot");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_chars");
  });

  it("accepts a clean alphanumeric node id and returns exact vault-relative path", () => {
    const r = ObsidianVaultExporterEngine.resolveVaultPath("AISystemRouter");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.vaultRelativePath).toBe("concepts/AISystemRouter.md");
      expect(r.category).toBe("concepts");
      expect(r.nodeId).toBe("AISystemRouter");
      expect(r.schemaVersion).toBe(ENGINE_SCHEMA_VERSION);
    }
  });

  it("accepts node ids with hyphens and underscores", () => {
    const r = ObsidianVaultExporterEngine.resolveVaultPath("Code-Tribal_Engine");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.vaultRelativePath).toBe("concepts/Code-Tribal_Engine.md");
  });

  it("rejects category outside the whitelist (wrong_category reason)", () => {
    const r = ObsidianVaultExporterEngine.resolveVaultPath("AISystemRouter", {
      category: "concepts",
      allowedCategories: ["decisions"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("wrong_category");
  });

  it("vault-relative resolution NEVER produces a path that escapes the vault root", () => {
    // Every safe target produces a path with exactly one /
    // (category/nodeId.md), no leading '/', no '..', no Windows separators.
    const safeTargets = ["A", "B1", "Test_Node", "Hyphen-Name"];
    for (const t of safeTargets) {
      const r = ObsidianVaultExporterEngine.resolveVaultPath(t);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.vaultRelativePath.startsWith("/")).toBe(false);
        expect(r.vaultRelativePath.startsWith("\\")).toBe(false);
        expect(r.vaultRelativePath.includes("..")).toBe(false);
        expect(r.vaultRelativePath.split("/").length).toBe(EXPECTED_VAULT_PATH_DEPTH);
      }
    }
  });
});

// ----------------------------------------------------------------------------
// Round-trip: 5 wiki entries wikilink → vault → wikilink BYTE-EQUAL
// ----------------------------------------------------------------------------
describe("ObsidianVaultExporterEngine round-trip — byte-equality across 5 entries", () => {
  for (const node of FIVE_REAL_WIKI_NODES) {
    it(`round-trips a plain wikilink for '${node}' with byte equality`, () => {
      const orig = `[[${node}]]`;
      const back = ObsidianVaultExporterEngine.roundTrip(orig);
      expect(back).toBe(orig);
    });

    it(`round-trips an aliased wikilink for '${node}' with byte equality`, () => {
      const orig = `[[${node}|display ${node}]]`;
      const back = ObsidianVaultExporterEngine.roundTrip(orig);
      expect(back).toBe(orig);
    });
  }

  it("round-trips a multi-entry markdown body referencing all 5 nodes byte-equal", () => {
    const back = ObsidianVaultExporterEngine.roundTrip(FIVE_ENTRY_ROUND_TRIP_FIXTURE);
    expect(back).toBe(FIVE_ENTRY_ROUND_TRIP_FIXTURE);
  });

  it("intermediate plain-md form contains all 5 [Display](Target.md) links", () => {
    const plain = ObsidianVaultExporterEngine.toPlainMarkdown(FIVE_ENTRY_ROUND_TRIP_FIXTURE);
    expect(plain.includes("[AISystemRouter](AISystemRouter.md)")).toBe(true);
    expect(plain.includes("[adaptive feed](AdaptiveFeedModulation.md)")).toBe(true);
    expect(plain.includes("[ArcFitting](ArcFitting.md)")).toBe(true);
    expect(plain.includes("[assembly planner](AssemblyPlanner.md)")).toBe(true);
    expect(plain.includes("[AccessControlList](AccessControlList.md)")).toBe(true);
    // No raw wikilinks remain.
    expect(plain.includes("[[")).toBe(false);
  });

  it("non-vault markdown links (external URLs) survive untouched in toWikilinkFromPlain", () => {
    const md = "Visit [Anthropic](https://anthropic.com) for more.";
    const back = ObsidianVaultExporterEngine.toWikilinkFromPlain(md);
    expect(back).toBe(md);
  });
});

// ----------------------------------------------------------------------------
// parseWikilinks / parsePlainVaultLinks — token correctness
// ----------------------------------------------------------------------------
describe("ObsidianVaultExporterEngine.parseWikilinks", () => {
  it("returns empty for empty input", () => {
    const tokens = ObsidianVaultExporterEngine.parseWikilinks("");
    expect(tokens).toEqual([]);
  });

  it("returns empty for non-string (null) input", () => {
    const tokens = ObsidianVaultExporterEngine.parseWikilinks(null as never);
    expect(tokens).toEqual([]);
  });

  it("captures multiple wikilinks in source order with correct alias semantics", () => {
    const md = "First [[A]] then [[B|bee]] and [[C-1]] last [[D|delta echo]]";
    const tokens = ObsidianVaultExporterEngine.parseWikilinks(md);
    expect(tokens.length).toBe(4);
    // Use shape-equality so the alias=undefined case is asserted concretely
    expect({ target: tokens[0].target, alias: tokens[0].alias, raw: tokens[0].raw })
      .toEqual({ target: "A", alias: undefined, raw: "[[A]]" });
    expect({ target: tokens[1].target, alias: tokens[1].alias, raw: tokens[1].raw })
      .toEqual({ target: "B", alias: "bee", raw: "[[B|bee]]" });
    expect({ target: tokens[2].target, alias: tokens[2].alias, raw: tokens[2].raw })
      .toEqual({ target: "C-1", alias: undefined, raw: "[[C-1]]" });
    expect({ target: tokens[3].target, alias: tokens[3].alias, raw: tokens[3].raw })
      .toEqual({ target: "D", alias: "delta echo", raw: "[[D|delta echo]]" });
  });

  it("indexes are monotonic (source order) and point at the [[ in the source string", () => {
    const md = "[[X]] middle [[Y]]";
    const tokens = ObsidianVaultExporterEngine.parseWikilinks(md);
    expect(tokens.length).toBe(2);
    expect(tokens[0].index).toBe(0);
    expect(tokens[1].index).toBe(md.indexOf("[[Y]]"));
    expect(tokens[0].index).toBeLessThan(tokens[1].index);
  });
});

describe("ObsidianVaultExporterEngine.parsePlainVaultLinks", () => {
  it("captures only [Display](Target.md) flat links — not absolute URLs", () => {
    const md = "Vault: [Foo](Foo.md) but external: [Site](https://x.com)";
    const tokens = ObsidianVaultExporterEngine.parsePlainVaultLinks(md);
    expect(tokens.length).toBe(1);
    expect(tokens[0].display).toBe("Foo");
    expect(tokens[0].target).toBe("Foo");
    expect(tokens[0].raw).toBe("[Foo](Foo.md)");
  });
});

// ----------------------------------------------------------------------------
// Anti-regression: VAULT_CATEGORIES whitelist
// ----------------------------------------------------------------------------
describe("VAULT_CATEGORIES — anti-regression on whitelist", () => {
  it(`matches the on-disk wiki layout — at least ${MIN_VAULT_CATEGORIES} entries`, () => {
    expect(VAULT_CATEGORIES.length).toBeGreaterThanOrEqual(MIN_VAULT_CATEGORIES);
    expect(VAULT_CATEGORIES.includes("concepts")).toBe(true);
    expect(VAULT_CATEGORIES.includes("entities")).toBe(true);
    expect(VAULT_CATEGORIES.includes("decisions")).toBe(true);
    expect(VAULT_CATEGORIES.includes("patterns")).toBe(true);
    expect(VAULT_CATEGORIES.includes("trajectories")).toBe(true);
    expect(VAULT_CATEGORIES.includes("lessons")).toBe(true);
    expect(VAULT_CATEGORIES.includes("code-tribal")).toBe(true);
  });

  it("each category is a unique string (no dupes)", () => {
    const unique = new Set(VAULT_CATEGORIES);
    expect(unique.size).toBe(VAULT_CATEGORIES.length);
  });
});
