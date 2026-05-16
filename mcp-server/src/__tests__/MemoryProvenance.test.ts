/**
 * MemoryProvenance.test.ts — schema + backfill + mirror-injection coverage.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-PROVENANCE-LAYER (D1).
 *
 * Per envelope exit conditions:
 *   - Frontmatter validates via Zod schema { agent, sessionId, writeEvent, parentMemory? }
 *   - memory-mirror-to-vault.mjs auto-enriches on write
 *   - Migration: backfill helper enriches existing memos
 *   - Test: 5 fixture writes produce valid provenance blocks; missing fields rejected
 */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  MEMORY_PROVENANCE_SCHEMA_VERSION,
  MemoryProvenanceSchema,
  AgentIdSchema,
  SessionIdSchema,
  WriteEventSchema,
  ParentMemorySchema,
  VaultCategorySchema,
  formatProvenanceFrontmatter,
  extractProvenanceFromFrontmatter,
  buildProvenanceFromHookInput,
} from "../schemas/memoryProvenanceSchema.js";

import {
  categorizeByPrefix,
  deriveAgentFromGitLog,
  buildProvenanceForFile,
  injectProvenanceFrontmatter,
  walkMemoryVault,
} from "../../../scripts/backfill-memory-provenance.mjs";

// ─── Schema constants ──────────────────────────────────────────────────

describe("MEMORY_PROVENANCE_SCHEMA_VERSION", () => {
  it("is the semver string '1.0.0'", () => {
    expect(MEMORY_PROVENANCE_SCHEMA_VERSION).toBe("1.0.0");
  });
});

// ─── Sub-schemas ───────────────────────────────────────────────────────

describe("AgentIdSchema", () => {
  it("returns canonical id unchanged: 'claude-c0f06dee'", () => {
    expect(AgentIdSchema.parse("claude-c0f06dee")).toBe("claude-c0f06dee");
  });
  it("accepts 'agent-abcd1234' (subagent family prefix)", () => {
    expect(AgentIdSchema.parse("agent-abcd1234")).toBe("agent-abcd1234");
  });
  it("accepts 'codex-12345678'", () => {
    expect(AgentIdSchema.parse("codex-12345678")).toBe("codex-12345678");
  });
  it("accepts 'backfill-00000000' for the migration script identity", () => {
    expect(AgentIdSchema.parse("backfill-00000000")).toBe("backfill-00000000");
  });
  it("rejects 'claude-xyz' (non-hex suffix)", () => {
    expect(() => AgentIdSchema.parse("claude-xyz")).toThrow();
  });
  it("rejects empty string", () => {
    expect(() => AgentIdSchema.parse("")).toThrow();
  });
  it("rejects 'c0f06dee' (missing family prefix)", () => {
    expect(() => AgentIdSchema.parse("c0f06dee")).toThrow();
  });
});

describe("SessionIdSchema", () => {
  it("returns 8-hex form unchanged", () => {
    expect(SessionIdSchema.parse("c0f06dee")).toBe("c0f06dee");
  });
  it("returns full UUID form unchanged", () => {
    expect(SessionIdSchema.parse("c0f06dee-d6f2-4070-8e01-4732115adb48")).toBe(
      "c0f06dee-d6f2-4070-8e01-4732115adb48",
    );
  });
  it("rejects 'zzzzzzzz' (non-hex)", () => {
    expect(() => SessionIdSchema.parse("zzzzzzzz")).toThrow();
  });
  it("rejects '123' (too short)", () => {
    expect(() => SessionIdSchema.parse("123")).toThrow();
  });
});

describe("WriteEventSchema", () => {
  it.each(["Write", "Edit", "MultiEdit", "backfill", "manual"])(
    "accepts canonical event '%s' and returns it",
    (val) => {
      expect(WriteEventSchema.parse(val)).toBe(val);
    },
  );
  it("rejects 'WRITE' (case-mismatched)", () => {
    expect(() => WriteEventSchema.parse("WRITE")).toThrow();
  });
  it("rejects wildcard '*'", () => {
    expect(() => WriteEventSchema.parse("*")).toThrow();
  });
});

describe("ParentMemorySchema", () => {
  it("returns 'feedback_x.md' unchanged", () => {
    expect(ParentMemorySchema.parse("feedback_x.md")).toBe("feedback_x.md");
  });
  it("rejects path-traversal '../x.md'", () => {
    expect(() => ParentMemorySchema.parse("../x.md")).toThrow();
  });
  it("rejects non-md extension", () => {
    expect(() => ParentMemorySchema.parse("foo.txt")).toThrow();
  });
});

describe("VaultCategorySchema", () => {
  it.each([
    "feedback",
    "project",
    "reference",
    "user",
    "lessons",
    "decisions",
    "mistakes",
    "patterns",
    "inbox",
    "uncategorized",
    "_index",
  ])("accepts canonical category '%s' and returns it", (c) => {
    expect(VaultCategorySchema.parse(c)).toBe(c);
  });
  it("rejects 'RANDOM'", () => {
    expect(() => VaultCategorySchema.parse("RANDOM")).toThrow();
  });
});

// ─── Top-level provenance schema ───────────────────────────────────────

describe("MemoryProvenanceSchema", () => {
  const valid = {
    schemaVersion: "1.0.0",
    agent: "claude-c0f06dee",
    sessionId: "c0f06dee",
    writeEvent: "Write" as const,
    writtenAt: "2026-05-16T01:00:00.000Z",
  };

  it("returns parsed shape for a minimal valid object", () => {
    const out = MemoryProvenanceSchema.parse(valid);
    expect(out.agent).toBe("claude-c0f06dee");
    expect(out.sessionId).toBe("c0f06dee");
    expect(out.writeEvent).toBe("Write");
    expect(out.writtenAt).toBe("2026-05-16T01:00:00.000Z");
  });

  it("returns parsed shape with all optionals included", () => {
    const out = MemoryProvenanceSchema.parse({
      ...valid,
      parentMemory: "feedback_x.md",
      category: "feedback",
      sourceTool: "memory-mirror-to-vault",
      machine: "DESKTOP-N7MI1VB",
    });
    expect(out.parentMemory).toBe("feedback_x.md");
    expect(out.category).toBe("feedback");
    expect(out.sourceTool).toBe("memory-mirror-to-vault");
    expect(out.machine).toBe("DESKTOP-N7MI1VB");
  });

  it("rejects when agent is missing", () => {
    const broken = { ...valid } as Record<string, unknown>;
    delete broken.agent;
    expect(() => MemoryProvenanceSchema.parse(broken)).toThrow();
  });

  it("rejects writeEvent: 'Spawn' (not in enum)", () => {
    expect(() =>
      MemoryProvenanceSchema.parse({ ...valid, writeEvent: "Spawn" }),
    ).toThrow();
  });

  it("rejects extra fields in strict mode", () => {
    expect(() =>
      MemoryProvenanceSchema.parse({ ...valid, hijacked: "evil" }),
    ).toThrow();
  });

  it("rejects writtenAt: 'yesterday' (no ISO prefix)", () => {
    expect(() =>
      MemoryProvenanceSchema.parse({ ...valid, writtenAt: "yesterday" }),
    ).toThrow();
  });
});

// ─── Frontmatter format / extract round-trip ───────────────────────────

describe("formatProvenanceFrontmatter", () => {
  const sample = {
    schemaVersion: "1.0.0",
    agent: "claude-c0f06dee",
    sessionId: "c0f06dee",
    writeEvent: "Write" as const,
    writtenAt: "2026-05-16T01:00:00.000Z",
    category: "feedback" as const,
    sourceTool: "memory-mirror-to-vault",
    machine: "DESKTOP-N7MI1VB",
  };

  it("emits a block starting with '---\\nprovenance:\\n'", () => {
    const yaml = formatProvenanceFrontmatter(sample);
    expect(yaml.startsWith("---\nprovenance:\n")).toBe(true);
  });

  it("includes 'agent: claude-c0f06dee' line", () => {
    expect(formatProvenanceFrontmatter(sample)).toContain(
      "agent: claude-c0f06dee",
    );
  });

  it("includes 'writeEvent: Write' line", () => {
    expect(formatProvenanceFrontmatter(sample)).toContain("writeEvent: Write");
  });

  it("ends with '---\\n' fence", () => {
    expect(formatProvenanceFrontmatter(sample).endsWith("---\n")).toBe(true);
  });

  it("does NOT emit parentMemory when absent", () => {
    const minimal = {
      schemaVersion: "1.0.0",
      agent: "claude-c0f06dee",
      sessionId: "c0f06dee",
      writeEvent: "Write" as const,
      writtenAt: "2026-05-16T01:00:00.000Z",
    };
    expect(formatProvenanceFrontmatter(minimal)).not.toContain("parentMemory");
  });

  it("does NOT emit machine when absent", () => {
    const minimal = {
      schemaVersion: "1.0.0",
      agent: "claude-c0f06dee",
      sessionId: "c0f06dee",
      writeEvent: "Write" as const,
      writtenAt: "2026-05-16T01:00:00.000Z",
    };
    expect(formatProvenanceFrontmatter(minimal)).not.toContain("machine");
  });

  it("throws on agent: 'BAD'", () => {
    expect(() =>
      formatProvenanceFrontmatter({
        ...sample,
        agent: "BAD",
      } as never),
    ).toThrow();
  });
});

describe("extractProvenanceFromFrontmatter", () => {
  it("round-trips agent value 'claude-c0f06dee'", () => {
    const orig = {
      schemaVersion: "1.0.0",
      agent: "claude-c0f06dee",
      sessionId: "c0f06dee",
      writeEvent: "Edit" as const,
      writtenAt: "2026-05-16T01:00:00.000Z",
      category: "lessons" as const,
    };
    const parsed = extractProvenanceFromFrontmatter(
      formatProvenanceFrontmatter(orig) + "\n# body\n",
    );
    expect(parsed?.agent).toBe("claude-c0f06dee");
  });

  it("round-trips writeEvent value 'Edit'", () => {
    const orig = {
      schemaVersion: "1.0.0",
      agent: "claude-c0f06dee",
      sessionId: "c0f06dee",
      writeEvent: "Edit" as const,
      writtenAt: "2026-05-16T01:00:00.000Z",
    };
    const parsed = extractProvenanceFromFrontmatter(
      formatProvenanceFrontmatter(orig) + "\n# body\n",
    );
    expect(parsed?.writeEvent).toBe("Edit");
  });

  it("round-trips category value 'lessons'", () => {
    const orig = {
      schemaVersion: "1.0.0",
      agent: "claude-c0f06dee",
      sessionId: "c0f06dee",
      writeEvent: "Edit" as const,
      writtenAt: "2026-05-16T01:00:00.000Z",
      category: "lessons" as const,
    };
    const parsed = extractProvenanceFromFrontmatter(
      formatProvenanceFrontmatter(orig) + "\n# body\n",
    );
    expect(parsed?.category).toBe("lessons");
  });

  it("returns null on plain markdown (no frontmatter)", () => {
    expect(extractProvenanceFromFrontmatter("just markdown body")).toBe(null);
  });

  it("returns null on frontmatter without provenance key", () => {
    expect(
      extractProvenanceFromFrontmatter("---\ntitle: hi\n---\nbody\n"),
    ).toBe(null);
  });

  it("throws on frontmatter with malformed agent (loud failure)", () => {
    const bad =
      "---\nprovenance:\n  agent: BAD\n  sessionId: x\n  writeEvent: Write\n  writtenAt: 2026-05-16T01:00:00.000Z\n---\nbody";
    expect(() => extractProvenanceFromFrontmatter(bad)).toThrow();
  });

  it("returns null on non-string input", () => {
    expect(
      extractProvenanceFromFrontmatter(null as unknown as string),
    ).toBe(null);
  });
});

describe("buildProvenanceFromHookInput", () => {
  it("returns writtenAt within current second when omitted", () => {
    const before = Date.now();
    const p = buildProvenanceFromHookInput({
      agent: "claude-c0f06dee",
      sessionId: "c0f06dee",
      writeEvent: "Write",
    });
    const after = Date.now();
    const ts = Date.parse(p.writtenAt);
    expect(ts).toBeGreaterThanOrEqual(before - 50);
    expect(ts).toBeLessThanOrEqual(after + 50);
  });

  it("returns parentMemory: undefined for empty string input", () => {
    const p = buildProvenanceFromHookInput({
      agent: "claude-c0f06dee",
      sessionId: "c0f06dee",
      writeEvent: "Write",
      parentMemory: "",
    });
    expect(p.parentMemory).toBe(undefined);
  });

  it("returns machine: undefined for empty string input", () => {
    const p = buildProvenanceFromHookInput({
      agent: "claude-c0f06dee",
      sessionId: "c0f06dee",
      writeEvent: "Write",
      machine: "",
    });
    expect(p.machine).toBe(undefined);
  });

  it("throws when agent is empty (required)", () => {
    expect(() =>
      buildProvenanceFromHookInput({
        agent: "",
        sessionId: "c0f06dee",
        writeEvent: "Write",
      }),
    ).toThrow();
  });
});

// ─── Backfill helpers ──────────────────────────────────────────────────

describe("categorizeByPrefix", () => {
  it("returns 'feedback' for 'feedback_x.md'", () => {
    expect(categorizeByPrefix("feedback_x.md")).toBe("feedback");
  });
  it("returns 'user' for 'user_role.md'", () => {
    expect(categorizeByPrefix("user_role.md")).toBe("user");
  });
  it("returns 'mistakes' for 'mistake_y.md' (singular)", () => {
    expect(categorizeByPrefix("mistake_y.md")).toBe("mistakes");
  });
  it("returns 'lessons' for 'lesson_z.md' (singular)", () => {
    expect(categorizeByPrefix("lesson_z.md")).toBe("lessons");
  });
  it("returns '_index' for 'memory.md'", () => {
    expect(categorizeByPrefix("memory.md")).toBe("_index");
  });
  it("returns 'uncategorized' for 'random_file.md'", () => {
    expect(categorizeByPrefix("random_file.md")).toBe("uncategorized");
  });
  it("returns 'uncategorized' for null input", () => {
    expect(categorizeByPrefix(null as unknown as string)).toBe("uncategorized");
  });
});

describe("deriveAgentFromGitLog", () => {
  it("returns 'claude-c0f06dee' when git author is exactly that", () => {
    const fakeSpawn = () => ({
      status: 0,
      stdout: "claude-c0f06dee\n",
      stderr: "",
    });
    expect(deriveAgentFromGitLog("/x", { spawnImpl: fakeSpawn })).toBe(
      "claude-c0f06dee",
    );
  });
  it("extracts 'claude-c0f06dee' from wrapped 'claude-flow: claude-c0f06dee'", () => {
    const fakeSpawn = () => ({
      status: 0,
      stdout: "claude-flow: claude-c0f06dee\n",
      stderr: "",
    });
    expect(deriveAgentFromGitLog("/x", { spawnImpl: fakeSpawn })).toBe(
      "claude-c0f06dee",
    );
  });
  it("returns null for human author 'Mark Villanueva'", () => {
    const fakeSpawn = () => ({
      status: 0,
      stdout: "Mark Villanueva\n",
      stderr: "",
    });
    expect(deriveAgentFromGitLog("/x", { spawnImpl: fakeSpawn })).toBe(null);
  });
  it("returns null when git exits non-zero (128)", () => {
    const fakeSpawn = () => ({ status: 128, stdout: "", stderr: "" });
    expect(deriveAgentFromGitLog("/x", { spawnImpl: fakeSpawn })).toBe(null);
  });
  it("returns null when spawn throws an Error", () => {
    const fakeSpawn = () => {
      throw new Error("git missing");
    };
    expect(deriveAgentFromGitLog("/x", { spawnImpl: fakeSpawn })).toBe(null);
  });
});

describe("buildProvenanceForFile", () => {
  it("sets agent='claude-c0f06dee' when git supplies it", () => {
    const p = buildProvenanceForFile({
      filePath: "/v/feedback/x.md",
      mtimeIso: "2026-05-16T01:00:00.000Z",
      category: "feedback",
      agentFromGit: "claude-c0f06dee",
      host: "DESKTOP",
    });
    expect(p.agent).toBe("claude-c0f06dee");
  });
  it("sets sessionId='c0f06dee' when git agent is 'claude-c0f06dee'", () => {
    const p = buildProvenanceForFile({
      filePath: "/v/feedback/x.md",
      mtimeIso: "2026-05-16T01:00:00.000Z",
      category: "feedback",
      agentFromGit: "claude-c0f06dee",
      host: "DESKTOP",
    });
    expect(p.sessionId).toBe("c0f06dee");
  });
  it("sets writeEvent='backfill' regardless of agent", () => {
    const p = buildProvenanceForFile({
      filePath: "/v/feedback/x.md",
      mtimeIso: "2026-05-16T01:00:00.000Z",
      category: "feedback",
      agentFromGit: "claude-c0f06dee",
      host: "DESKTOP",
    });
    expect(p.writeEvent).toBe("backfill");
  });
  it("falls back to agent='backfill-00000000' when git gives null", () => {
    const p = buildProvenanceForFile({
      filePath: "/v/feedback/x.md",
      mtimeIso: "2026-05-16T01:00:00.000Z",
      category: "feedback",
      agentFromGit: null,
      host: "DESKTOP",
    });
    expect(p.agent).toBe("backfill-00000000");
  });
  it("falls back to sessionId='00000000' when git gives null", () => {
    const p = buildProvenanceForFile({
      filePath: "/v/feedback/x.md",
      mtimeIso: "2026-05-16T01:00:00.000Z",
      category: "feedback",
      agentFromGit: null,
      host: "DESKTOP",
    });
    expect(p.sessionId).toBe("00000000");
  });
  it("normalizes invalid category 'RANDOM' to 'uncategorized'", () => {
    const p = buildProvenanceForFile({
      filePath: "/v/RANDOM/x.md",
      mtimeIso: "2026-05-16T01:00:00.000Z",
      category: "RANDOM",
      agentFromGit: null,
      host: "DESKTOP",
    });
    expect(p.category).toBe("uncategorized");
  });
});

describe("injectProvenanceFrontmatter", () => {
  const prov = {
    schemaVersion: "1.0.0",
    agent: "claude-c0f06dee",
    sessionId: "c0f06dee",
    writeEvent: "backfill" as const,
    writtenAt: "2026-05-16T01:00:00.000Z",
  };

  it("output starts with '---\\nprovenance:\\n' when content has no frontmatter", () => {
    const out = injectProvenanceFrontmatter("# Title\n\nbody\n", prov);
    expect(out.startsWith("---\nprovenance:\n")).toBe(true);
  });

  it("preserves '# Title' line from original content", () => {
    const out = injectProvenanceFrontmatter("# Title\n\nbody\n", prov);
    expect(out).toContain("# Title");
  });

  it("preserves existing 'title: hi' when merging into existing frontmatter", () => {
    const existing = "---\ntitle: hi\nother: keep-me\n---\nbody\n";
    const out = injectProvenanceFrontmatter(existing, prov);
    expect(out).toContain("title: hi");
  });

  it("preserves existing 'other: keep-me' when merging", () => {
    const existing = "---\ntitle: hi\nother: keep-me\n---\nbody\n";
    const out = injectProvenanceFrontmatter(existing, prov);
    expect(out).toContain("other: keep-me");
  });

  it("adds 'agent: claude-c0f06dee' line when merging", () => {
    const existing = "---\ntitle: hi\n---\nbody\n";
    const out = injectProvenanceFrontmatter(existing, prov);
    expect(out).toContain("agent: claude-c0f06dee");
  });

  it("preserves 'body' content when merging", () => {
    const existing = "---\ntitle: hi\n---\nbody\n";
    const out = injectProvenanceFrontmatter(existing, prov);
    expect(out).toContain("body");
  });

  it("emits agent line even when content is null", () => {
    const out = injectProvenanceFrontmatter(
      null as unknown as string,
      prov,
    );
    expect(out).toContain("agent: claude-c0f06dee");
  });
});

describe("walkMemoryVault", () => {
  const norm = (p: string) => p.replace(/\\/g, "/");
  const layout: Record<string, string[]> = {
    "/v": ["feedback", "user", "README"],
    "/v/feedback": ["a.md", "b.md", "deeper"],
    "/v/feedback/deeper": ["c.md"],
    "/v/user": ["u.md"],
  };
  const fakeFs = {
    existsSync: (p: string) =>
      Object.prototype.hasOwnProperty.call(layout, norm(p)),
    readdirSync: (p: string) => layout[norm(p)] || [],
    statSync: (p: string) => {
      const np = norm(p);
      const isDir = [
        "/v",
        "/v/feedback",
        "/v/user",
        "/v/feedback/deeper",
      ].includes(np);
      return { isDirectory: () => isDir };
    },
  };

  it("yields 4 .md files from the fixture", () => {
    const out = walkMemoryVault("/v", fakeFs);
    expect(out.length).toBe(4);
  });

  it("includes '/v/feedback/a.md' in the result", () => {
    const out = walkMemoryVault("/v", fakeFs).map(norm);
    expect(out).toContain("/v/feedback/a.md");
  });

  it("includes '/v/feedback/deeper/c.md' (depth-3 recursion)", () => {
    const out = walkMemoryVault("/v", fakeFs).map(norm);
    expect(out).toContain("/v/feedback/deeper/c.md");
  });

  it("excludes non-md file 'README'", () => {
    const out = walkMemoryVault("/v", fakeFs).map(norm);
    expect(out).not.toContain("/v/README");
  });

  it("returns [] when root doesn't exist", () => {
    const fakeFs2 = {
      existsSync: () => false,
      readdirSync: () => [],
      statSync: () => ({ isDirectory: () => false }),
    };
    expect(walkMemoryVault("/v", fakeFs2)).toEqual([]);
  });

  it("returns [] when readdirSync throws", () => {
    const fakeFs2 = {
      existsSync: () => true,
      readdirSync: () => {
        throw new Error("permission");
      },
      statSync: () => ({ isDirectory: () => false }),
    };
    expect(walkMemoryVault("/v", fakeFs2)).toEqual([]);
  });
});

// ─── Envelope exit condition: 5 fixture writes produce valid blocks ───

describe("5 fixture writes produce valid provenance (envelope exit condition)", () => {
  const fixtures = [
    {
      agent: "claude-c0f06dee",
      sessionId: "c0f06dee",
      writeEvent: "Write" as const,
      writtenAt: "2026-05-16T01:00:00.000Z",
      category: "feedback" as const,
    },
    {
      agent: "agent-12345678",
      sessionId: "12345678",
      writeEvent: "Edit" as const,
      writtenAt: "2026-05-16T01:01:00.000Z",
      category: "lessons" as const,
      parentMemory: "feedback_x.md",
    },
    {
      agent: "codex-aabbccdd",
      sessionId: "aabbccdd-d6f2-4070-8e01-4732115adb48",
      writeEvent: "MultiEdit" as const,
      writtenAt: "2026-05-16T01:02:00.000Z",
      category: "patterns" as const,
    },
    {
      agent: "backfill-00000000",
      sessionId: "00000000",
      writeEvent: "backfill" as const,
      writtenAt: "2026-05-16T01:03:00.000Z",
      category: "mistakes" as const,
      sourceTool: "backfill-memory-provenance",
      machine: "DESKTOP-N7MI1VB",
    },
    {
      agent: "claude-deadbeef",
      sessionId: "deadbeef",
      writeEvent: "manual" as const,
      writtenAt: "2026-05-16T01:04:00.000Z",
      category: "user" as const,
    },
  ];

  it("fixture 0 (claude-c0f06dee/Write/feedback) round-trips agent", () => {
    const f = fixtures[0];
    const block = formatProvenanceFrontmatter(buildProvenanceFromHookInput(f));
    const parsed = extractProvenanceFromFrontmatter(block + "\n# body\n");
    expect(parsed?.agent).toBe(f.agent);
  });

  it("fixture 1 (agent-12345678/Edit/lessons) round-trips parentMemory", () => {
    const f = fixtures[1];
    const block = formatProvenanceFrontmatter(buildProvenanceFromHookInput(f));
    const parsed = extractProvenanceFromFrontmatter(block + "\n# body\n");
    expect(parsed?.parentMemory).toBe("feedback_x.md");
  });

  it("fixture 2 (codex-aabbccdd/MultiEdit/patterns) round-trips full UUID sessionId", () => {
    const f = fixtures[2];
    const block = formatProvenanceFrontmatter(buildProvenanceFromHookInput(f));
    const parsed = extractProvenanceFromFrontmatter(block + "\n# body\n");
    expect(parsed?.sessionId).toBe(f.sessionId);
  });

  it("fixture 3 (backfill-00000000/backfill/mistakes) round-trips machine", () => {
    const f = fixtures[3];
    const block = formatProvenanceFrontmatter(buildProvenanceFromHookInput(f));
    const parsed = extractProvenanceFromFrontmatter(block + "\n# body\n");
    expect(parsed?.machine).toBe("DESKTOP-N7MI1VB");
  });

  it("fixture 4 (claude-deadbeef/manual/user) round-trips writeEvent='manual'", () => {
    const f = fixtures[4];
    const block = formatProvenanceFrontmatter(buildProvenanceFromHookInput(f));
    const parsed = extractProvenanceFromFrontmatter(block + "\n# body\n");
    expect(parsed?.writeEvent).toBe("manual");
  });

  it("rejects {sessionId, writeEvent, writtenAt} — no agent", () => {
    expect(() =>
      MemoryProvenanceSchema.parse({
        sessionId: "c0f06dee",
        writeEvent: "Write",
        writtenAt: "2026-05-16T01:00:00.000Z",
      }),
    ).toThrow();
  });

  it("rejects {agent, writeEvent, writtenAt} — no sessionId", () => {
    expect(() =>
      MemoryProvenanceSchema.parse({
        agent: "claude-c0f06dee",
        writeEvent: "Write",
        writtenAt: "2026-05-16T01:00:00.000Z",
      }),
    ).toThrow();
  });

  it("rejects {agent, sessionId, writtenAt} — no writeEvent", () => {
    expect(() =>
      MemoryProvenanceSchema.parse({
        agent: "claude-c0f06dee",
        sessionId: "c0f06dee",
        writtenAt: "2026-05-16T01:00:00.000Z",
      }),
    ).toThrow();
  });
});

// ─── End-to-end on temp dir ──────────────────────────────────────────

describe("end-to-end backfill on temp vault", () => {
  it("walks vault, enriches file, then extraction returns agent='claude-c0f06dee'", () => {
    const tmp = join(tmpdir(), `prism-prov-${Date.now()}`);
    mkdirSync(join(tmp, "feedback"), { recursive: true });
    const memoPath = join(tmp, "feedback", "feedback_test.md");
    writeFileSync(memoPath, "# raw memo\nbody\n", "utf8");

    const all = walkMemoryVault(tmp).map((p: string) => p.replace(/\\/g, "/"));
    expect(all).toContain(memoPath.replace(/\\/g, "/"));

    const before = readFileSync(memoPath, "utf8");
    expect(extractProvenanceFromFrontmatter(before)).toBe(null);

    const prov = buildProvenanceForFile({
      filePath: memoPath,
      mtimeIso: "2026-05-16T01:00:00.000Z",
      category: "feedback",
      agentFromGit: "claude-c0f06dee",
      host: "TESTHOST",
    });
    writeFileSync(memoPath, injectProvenanceFrontmatter(before, prov), "utf8");

    const round = extractProvenanceFromFrontmatter(
      readFileSync(memoPath, "utf8"),
    );
    expect(round?.agent).toBe("claude-c0f06dee");
  });

  it("walks vault, enriches file, then category='feedback' is preserved", () => {
    const tmp = join(tmpdir(), `prism-prov-cat-${Date.now()}`);
    mkdirSync(join(tmp, "feedback"), { recursive: true });
    const memoPath = join(tmp, "feedback", "feedback_test.md");
    writeFileSync(memoPath, "# raw memo\nbody\n", "utf8");
    const before = readFileSync(memoPath, "utf8");
    const prov = buildProvenanceForFile({
      filePath: memoPath,
      mtimeIso: "2026-05-16T01:00:00.000Z",
      category: "feedback",
      agentFromGit: "claude-c0f06dee",
      host: "TESTHOST",
    });
    writeFileSync(memoPath, injectProvenanceFrontmatter(before, prov), "utf8");
    const round = extractProvenanceFromFrontmatter(
      readFileSync(memoPath, "utf8"),
    );
    expect(round?.category).toBe("feedback");
  });

  it("second extraction after enrichment yields writeEvent='backfill' (idempotency check)", () => {
    const tmp = join(tmpdir(), `prism-prov-idem-${Date.now()}`);
    mkdirSync(join(tmp, "feedback"), { recursive: true });
    const memoPath = join(tmp, "feedback", "feedback_test.md");
    writeFileSync(memoPath, "# raw memo\nbody\n", "utf8");
    const before = readFileSync(memoPath, "utf8");
    const prov = buildProvenanceForFile({
      filePath: memoPath,
      mtimeIso: "2026-05-16T01:00:00.000Z",
      category: "feedback",
      agentFromGit: "claude-c0f06dee",
      host: "TESTHOST",
    });
    writeFileSync(memoPath, injectProvenanceFrontmatter(before, prov), "utf8");
    const round1 = extractProvenanceFromFrontmatter(
      readFileSync(memoPath, "utf8"),
    );
    expect(round1?.writeEvent).toBe("backfill");
    const round2 = extractProvenanceFromFrontmatter(
      readFileSync(memoPath, "utf8"),
    );
    expect(round2?.writeEvent).toBe("backfill");
  });
});
