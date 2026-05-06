/**
 * SkillModernize — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U01.
 *
 * Pure-function tests for scripts/skill-modernize.mjs. Asserts:
 *   1. parseExistingFrontmatter detects/extracts YAML frontmatter,
 *      degrades gracefully on missing or empty input.
 *   2. deriveTriggers extracts the skill name + body keywords + slash
 *      invocations and caps the result at 8.
 *   3. deriveTier maps tier-1/tier-2/tier-3 keywords correctly and
 *      respects in-body explicit `tier: <n>` declarations.
 *   4. renderFrontmatter produces a canonical YAML block (between ---
 *      fences) with tier coerced to a valid 1..3 value.
 *   5. modernizeSkill is idempotent (no double-writing) and produces
 *      well-formed output that round-trips through parseExistingFrontmatter.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../scripts/skill-modernize.mjs");

let parseExistingFrontmatter: any, deriveTriggers: any, deriveTier: any, renderFrontmatter: any, modernizeSkill: any;
beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  parseExistingFrontmatter = mod.parseExistingFrontmatter;
  deriveTriggers = mod.deriveTriggers;
  deriveTier = mod.deriveTier;
  renderFrontmatter = mod.renderFrontmatter;
  modernizeSkill = mod.modernizeSkill;
});

describe("P11-U01 parseExistingFrontmatter", () => {
  it("returns hasFrontmatter=false on empty input", () => {
    expect(parseExistingFrontmatter("")).toEqual({ hasFrontmatter: false, body: "" });
  });

  it("returns hasFrontmatter=false on input without leading ---", () => {
    const md = "# Some Skill\n\nBody only.\n";
    const r = parseExistingFrontmatter(md);
    expect(r.hasFrontmatter).toBe(false);
    expect(r.body).toBe(md);
  });

  it("extracts YAML between --- fences and body after", () => {
    const md = "---\npolicy:\n  tier: 1\n---\n# Skill\n\nBody.\n";
    const r = parseExistingFrontmatter(md);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.yamlRaw).toContain("tier: 1");
    expect(r.body).toBe("# Skill\n\nBody.\n");
  });

  it("handles CRLF line endings", () => {
    const md = "---\r\npolicy:\r\n  tier: 2\r\n---\r\n# Skill\r\n";
    const r = parseExistingFrontmatter(md);
    expect(r.hasFrontmatter).toBe(true);
    expect(r.body).toBe("# Skill\r\n");
  });

  it("non-string input returns hasFrontmatter=false safely", () => {
    expect(parseExistingFrontmatter(null as any).hasFrontmatter).toBe(false);
    expect(parseExistingFrontmatter(undefined as any).hasFrontmatter).toBe(false);
  });

  it("does not match a --- that appears mid-file (not at start)", () => {
    const md = "# Heading\n\n---\nfake: false\n---\n";
    expect(parseExistingFrontmatter(md).hasFrontmatter).toBe(false);
  });
});

describe("P11-U01 deriveTriggers", () => {
  it("always includes the skill name as a trigger", () => {
    const triggers = deriveTriggers("audit", "");
    expect(triggers).toContain("audit");
  });

  it("strips leading slash from skill name when normalising", () => {
    const triggers = deriveTriggers("/scrutinize", "");
    expect(triggers).toContain("scrutinize");
  });

  it("extracts quoted strings from a 'Trigger policy' section", () => {
    const body = `## Trigger policy
\`\`\`yaml
policy:
  triggers:
    - keyword:"audit X"
    - keyword:"second opinion"
    - on:UserPromptSubmit
\`\`\`
`;
    const triggers = deriveTriggers("review", body);
    expect(triggers).toContain("review");
    expect(triggers.some((t: string) => t.includes("audit"))).toBe(true);
    expect(triggers.some((t: string) => t.includes("second opinion"))).toBe(true);
  });

  it("extracts slash-prefixed names from Usage section", () => {
    const body = `## Usage
\`\`\`
/audit context
/audit security
\`\`\`
`;
    const triggers = deriveTriggers("audit", body);
    expect(triggers).toContain("audit");
  });

  it("caps result at 8 triggers (readability)", () => {
    const body = `## Trigger policy
- keyword:"alpha alpha"
- keyword:"beta beta"
- keyword:"gamma gamma"
- keyword:"delta delta"
- keyword:"epsilon epsilon"
- keyword:"zeta zeta"
- keyword:"eta eta"
- keyword:"theta theta"
- keyword:"iota iota"
- keyword:"kappa kappa"
`;
    const triggers = deriveTriggers("manyword", body);
    expect(triggers.length).toBeLessThanOrEqual(8);
  });

  it("dedupes overlapping triggers", () => {
    const body = `## Trigger policy
- keyword:"audit"
- keyword:"audit"
`;
    const triggers = deriveTriggers("audit", body);
    const auditCount = triggers.filter((t: string) => t === "audit").length;
    expect(auditCount).toBe(1);
  });

  it("safe on empty/null body", () => {
    expect(deriveTriggers("foo", "")).toEqual(["foo"]);
    expect(deriveTriggers("foo", null as any)).toEqual(["foo"]);
  });
});

describe("P11-U01 deriveTier", () => {
  it("tier-1 names: audit, review, memory, search, validate, learn", () => {
    expect(deriveTier("audit", "")).toBe(1);
    expect(deriveTier("review", "")).toBe(1);
    expect(deriveTier("memory-search", "")).toBe(1);
    expect(deriveTier("validate-program", "")).toBe(1);
    expect(deriveTier("learn", "")).toBe(1);
  });

  it("tier-2 names: scrutinize, dedup, handoff, forge, harden", () => {
    expect(deriveTier("scrutinize", "")).toBe(2);
    expect(deriveTier("dedup", "")).toBe(2);
    expect(deriveTier("handoff", "")).toBe(2);
    expect(deriveTier("forge-triple", "")).toBe(2);
    expect(deriveTier("machine-harden", "")).toBe(2);
  });

  it("unknown names default to tier-3", () => {
    expect(deriveTier("some-niche-thing", "")).toBe(3);
    expect(deriveTier("xyz", "")).toBe(3);
  });

  it("body 'tier: 1' override beats name heuristic", () => {
    expect(deriveTier("xyz", "Tier: 1\nbody...\n")).toBe(1);
    expect(deriveTier("xyz", "policy.tier=2\n")).toBe(2);
  });

  it("body invalid tier value falls through to name heuristic", () => {
    expect(deriveTier("audit", "tier: 99\n")).toBe(1); // name wins
  });

  it("body explicit override only accepts 1, 2, or 3", () => {
    expect(deriveTier("xyz", "tier: 4")).toBe(3); // 4 ignored, fallback
  });
});

describe("P11-U01 renderFrontmatter", () => {
  it("emits YAML between --- fences with trailing newline", () => {
    const fm = renderFrontmatter({ tier: 1, triggers: ["audit"] });
    expect(fm.startsWith("---\n")).toBe(true);
    expect(fm).toContain("policy:");
    expect(fm).toContain("tier: 1");
    expect(fm).toContain('"audit"');
    expect(fm).toMatch(/---\n$/);
  });

  it("coerces invalid tier to 3", () => {
    const fm = renderFrontmatter({ tier: "not-a-number", triggers: [] });
    expect(fm).toContain("tier: 3");
  });

  it("renders empty triggers array as `[]`", () => {
    const fm = renderFrontmatter({ tier: 2, triggers: [] });
    expect(fm).toContain("triggers: []");
  });

  it("escapes embedded double quotes in trigger strings", () => {
    const fm = renderFrontmatter({ tier: 1, triggers: ['has "quotes"'] });
    expect(fm).toContain('\\"quotes\\"');
  });

  it("non-array triggers treated as empty", () => {
    const fm = renderFrontmatter({ tier: 1, triggers: "not-array" });
    expect(fm).toContain("triggers: []");
  });

  it("missing policy object → tier 3, empty triggers", () => {
    const fm = renderFrontmatter(undefined);
    expect(fm).toContain("tier: 3");
    expect(fm).toContain("triggers: []");
  });
});

describe("P11-U01 modernizeSkill", () => {
  it("inserts frontmatter when none exists", () => {
    const original = "# Some Skill\n\nBody.\n";
    const r = modernizeSkill(original, "audit");
    expect(r.changed).toBe(true);
    expect(r.content.startsWith("---\n")).toBe(true);
    expect(r.content).toContain("# Some Skill");
    expect(r.derivedTier).toBe(1); // audit → tier 1
  });

  it("preserves existing frontmatter (idempotent without --force)", () => {
    const original = "---\npolicy:\n  tier: 2\n  triggers: []\n---\n# Skill\n\nBody.\n";
    const r = modernizeSkill(original, "audit");
    expect(r.changed).toBe(false);
    expect(r.content).toBe(original);
    expect(r.reason).toContain("already");
  });

  it("rewrites existing frontmatter under --force", () => {
    const original = "---\npolicy:\n  tier: 2\n---\n# Skill\n\nBody.\n";
    const r = modernizeSkill(original, "audit", { force: true });
    expect(r.changed).toBe(true);
    expect(r.content).toContain("tier: 1"); // audit derives tier 1, beats stored tier 2
  });

  it("output round-trips through parseExistingFrontmatter", () => {
    const r = modernizeSkill("# Foo\n\nBody.\n", "audit");
    const parsed = parseExistingFrontmatter(r.content);
    expect(parsed.hasFrontmatter).toBe(true);
    expect(parsed.body).toBe("# Foo\n\nBody.\n");
  });

  it("tier-3 default for unknown skill names", () => {
    const r = modernizeSkill("# Niche\n\nBody.\n", "some-niche-thing");
    expect(r.derivedTier).toBe(3);
  });

  it("derivedTriggers includes the skill name", () => {
    const r = modernizeSkill("# Memory\n\nBody.\n", "memory");
    expect(r.derivedTriggers).toContain("memory");
  });
});
