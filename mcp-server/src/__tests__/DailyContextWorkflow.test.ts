/**
 * DailyContextWorkflow.test.ts — fixture-driven deterministic tests
 * for OBSIDIAN-INTELLIGENCE-MS3 / B1 (U-DAILY-CONTEXT-WORKFLOW).
 *
 * Strategy: every test injects a `LoaderFn` + `SummarizerFn`, so the suite
 * never hits Ollama, never reads the real vault, and runs in <100ms.
 * Filesystem reads/writes use os.tmpdir() scoped per-test.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  DailyContextWorkflowEngine,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
  MAX_SOURCE_BYTES,
  MIN_SOURCES_FOR_BRIEF,
  buildSummarizerPrompt,
  defaultLoader,
  defaultOllamaSummarizer,
  formatBrief,
  isoDateUTC,
  truncateBody,
  yesterdayUTC,
  type LoadedSource,
  type SummarizerFn,
} from "../engines/DailyContextWorkflowEngine.js";

/* ---------- fixture builders ---------- */

function fixtureSources(): LoadedSource[] {
  return [
    {
      kind: "daily",
      path: "H:/prism/knowledge/memories/daily/2026-05-15.md",
      body: "# 2026-05-15\nShipped C2 dashboard. Hotel queue 7/10.",
      bytes: 64,
    },
    {
      kind: "project",
      path: "H:/prism/knowledge/memories/projects/obsidian-intelligence.md",
      body: "Active: B1 daily-context. Pending: D5, B6, G2.",
      bytes: 51,
    },
    {
      kind: "inbox",
      path: "H:/prism/knowledge/memories/inbox/2026-05-15-tribal-tip.md",
      body: "Tribal: when 6 chats commit fast, lane-guard misattributes — fork to sibling tree.",
      bytes: 86,
    },
  ];
}

function deterministicSummarizer(text: string): SummarizerFn {
  return async () => ({ ok: true, text, model: "fixture-model" });
}

function failingSummarizer(error: string): SummarizerFn {
  return async () => ({ ok: false, error });
}

async function mkVault(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "prism-daily-ctx-"));
}

/* ---------- date helpers ---------- */

describe("isoDateUTC", () => {
  it("formats UTC date as YYYY-MM-DD", () => {
    const d = new Date(Date.UTC(2026, 4, 16, 23, 59));
    expect(isoDateUTC(d)).toBe("2026-05-16");
  });

  it("pads single-digit month + day", () => {
    const d = new Date(Date.UTC(2026, 0, 5));
    expect(isoDateUTC(d)).toBe("2026-01-05");
  });

  it("is timezone-agnostic at month boundary", () => {
    const d = new Date("2026-06-01T00:00:00Z");
    expect(isoDateUTC(d)).toBe("2026-06-01");
  });
});

describe("yesterdayUTC", () => {
  it("returns the previous UTC day", () => {
    const d = new Date("2026-05-16T12:00:00Z");
    expect(yesterdayUTC(d)).toBe("2026-05-15");
  });

  it("wraps across month boundary", () => {
    const d = new Date("2026-06-01T00:30:00Z");
    expect(yesterdayUTC(d)).toBe("2026-05-31");
  });

  it("wraps across year boundary", () => {
    const d = new Date("2027-01-01T00:00:00Z");
    expect(yesterdayUTC(d)).toBe("2026-12-31");
  });
});

/* ---------- truncateBody ---------- */

describe("truncateBody", () => {
  it("passes through bodies under the limit unchanged", () => {
    const body = "short body";
    expect(truncateBody(body, 100)).toBe(body);
  });

  it("truncates at the requested byte count and appends marker", () => {
    const body = "x".repeat(50);
    const out = truncateBody(body, 10);
    expect(out).toBe("x".repeat(10) + "\n\n[truncated]\n");
  });

  it("uses MAX_SOURCE_BYTES by default", () => {
    const body = "y".repeat(MAX_SOURCE_BYTES + 100);
    const out = truncateBody(body);
    expect(out.length).toBe(MAX_SOURCE_BYTES + "\n\n[truncated]\n".length);
    expect(out.endsWith("\n\n[truncated]\n")).toBe(true);
  });
});

/* ---------- buildSummarizerPrompt ---------- */

describe("buildSummarizerPrompt", () => {
  it("includes the target date and every source", () => {
    const prompt = buildSummarizerPrompt(fixtureSources(), "2026-05-16");
    expect(prompt).toContain("DATE: 2026-05-16");
    expect(prompt).toContain("DAILY : 2026-05-15.md");
    expect(prompt).toContain("PROJECT : obsidian-intelligence.md");
    expect(prompt).toContain("INBOX : 2026-05-15-tribal-tip.md");
    expect(prompt).toMatch(/BRIEF:\s*$/);
  });

  it("is deterministic — same inputs → byte-identical output", () => {
    const a = buildSummarizerPrompt(fixtureSources(), "2026-05-16");
    const b = buildSummarizerPrompt(fixtureSources(), "2026-05-16");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(100);
  });

  it("truncates oversize source bodies", () => {
    const big: LoadedSource = {
      kind: "project",
      path: "/x/p.md",
      body: "Z".repeat(MAX_SOURCE_BYTES + 50),
      bytes: MAX_SOURCE_BYTES + 50,
    };
    const prompt = buildSummarizerPrompt([big], "2026-05-16");
    expect(prompt).toContain("[truncated]");
    // truncation cap means the full body cannot be present
    expect(prompt.indexOf("Z".repeat(MAX_SOURCE_BYTES + 1))).toBe(-1);
  });
});

/* ---------- formatBrief ---------- */

describe("formatBrief", () => {
  it("emits valid YAML frontmatter listing all sources", () => {
    const md = formatBrief({
      summary: "Test brief.",
      sources: fixtureSources(),
      date: "2026-05-16",
      model: "fixture-model",
    });
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("kind: daily-context");
    expect(md).toContain("date: 2026-05-16");
    expect(md).toContain("sources_count: 3");
    expect(md).toContain("summarizer_model: fixture-model");
    expect(md).toContain("- kind: daily");
    expect(md).toContain("- kind: project");
    expect(md).toContain("- kind: inbox");
  });

  it("includes the summary in the body", () => {
    const md = formatBrief({
      summary: "Carryover from yesterday is the dashboard ship.",
      sources: fixtureSources(),
      date: "2026-05-16",
    });
    expect(md).toContain("Carryover from yesterday is the dashboard ship.");
    expect(md).toContain("# Daily Context — 2026-05-16");
  });

  it("references each source path in the sources section", () => {
    const md = formatBrief({
      summary: "x",
      sources: fixtureSources(),
      date: "2026-05-16",
    });
    const body = md.split("## Sources")[1];
    expect(body).toContain("2026-05-15.md");
    expect(body).toContain("obsidian-intelligence.md");
    expect(body).toContain("2026-05-15-tribal-tip.md");
  });

  it("normalizes Windows backslashes to forward slashes", () => {
    const md = formatBrief({
      summary: "x",
      sources: [
        {
          kind: "daily",
          path: "H:\\prism\\knowledge\\memories\\daily\\2026-05-15.md",
          body: "y",
          bytes: 1,
        },
      ],
      date: "2026-05-16",
    });
    expect(md).toContain("H:/prism/knowledge/memories/daily/2026-05-15.md");
    expect(md.indexOf("H:\\prism")).toBe(-1);
  });

  it("omits summarizer_model when not provided", () => {
    const md = formatBrief({ summary: "x", sources: fixtureSources(), date: "2026-05-16" });
    expect(md.indexOf("summarizer_model:")).toBe(-1);
  });
});

/* ---------- defaultLoader (real fs, scoped to tmp) ---------- */

describe("defaultLoader", () => {
  it("reads yesterday's daily note + projects + inbox", async () => {
    const vault = await mkVault();
    try {
      await fs.mkdir(path.join(vault, "daily"), { recursive: true });
      await fs.mkdir(path.join(vault, "projects"), { recursive: true });
      await fs.mkdir(path.join(vault, "inbox"), { recursive: true });
      await fs.writeFile(path.join(vault, "daily", "2026-05-15.md"), "# yesterday");
      await fs.writeFile(path.join(vault, "projects", "alpha.md"), "alpha project");
      await fs.writeFile(path.join(vault, "projects", "bravo.md"), "bravo project");
      await fs.writeFile(path.join(vault, "inbox", "tip-1.md"), "inbox tip 1");

      const sources = await defaultLoader({ vaultRoot: vault, date: "2026-05-16" });
      expect(sources.length).toBe(4);
      const daily = sources.find((s) => s.kind === "daily");
      expect(daily?.body).toBe("# yesterday");
      expect(sources.filter((s) => s.kind === "project").length).toBe(2);
      expect(sources.filter((s) => s.kind === "inbox").length).toBe(1);
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("returns empty array when no source dirs exist (fail-soft)", async () => {
    const vault = await mkVault();
    try {
      const sources = await defaultLoader({ vaultRoot: vault, date: "2026-05-16" });
      expect(sources).toEqual([]);
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("skips non-markdown files in projects/inbox dirs", async () => {
    const vault = await mkVault();
    try {
      await fs.mkdir(path.join(vault, "projects"), { recursive: true });
      await fs.writeFile(path.join(vault, "projects", "notes.txt"), "ignored");
      await fs.writeFile(path.join(vault, "projects", "kept.md"), "kept");

      const sources = await defaultLoader({ vaultRoot: vault, date: "2026-05-16" });
      expect(sources.length).toBe(1);
      expect(sources[0].path.endsWith("kept.md")).toBe(true);
      expect(sources[0].body).toBe("kept");
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("returns paths in stable lexicographic order", async () => {
    const vault = await mkVault();
    try {
      await fs.mkdir(path.join(vault, "projects"), { recursive: true });
      await fs.writeFile(path.join(vault, "projects", "z.md"), "z");
      await fs.writeFile(path.join(vault, "projects", "a.md"), "a");
      await fs.writeFile(path.join(vault, "projects", "m.md"), "m");
      const sources = await defaultLoader({ vaultRoot: vault, date: "2026-05-16" });
      const names = sources.map((s) => path.basename(s.path));
      expect(names).toEqual(["a.md", "m.md", "z.md"]);
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });
});

/* ---------- engine — runDaily integration ---------- */

describe("DailyContextWorkflowEngine.runDaily", () => {
  it("produces a deterministic markdown file given fixed loader+summarizer", async () => {
    const vault = await mkVault();
    try {
      const engine = new DailyContextWorkflowEngine({
        loader: async () => fixtureSources(),
        summarizer: deterministicSummarizer("Today: ship B1."),
      });
      const result = await engine.runDaily({ vaultRoot: vault, date: "2026-05-16" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("unreachable");
      const body = await fs.readFile(result.path, "utf8");
      expect(body).toContain("Today: ship B1.");
      expect(body).toContain("2026-05-15.md");
      expect(body).toContain("obsidian-intelligence.md");
      expect(body).toContain("2026-05-15-tribal-tip.md");
      expect(result.sources_used).toBe(3);
      expect(result.bytes_written).toBe(Buffer.byteLength(body, "utf8"));
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("writes to <vaultRoot>/generated/DAILY-CONTEXT-<date>.md by default", async () => {
    const vault = await mkVault();
    try {
      const engine = new DailyContextWorkflowEngine({
        loader: async () => fixtureSources(),
        summarizer: deterministicSummarizer("x"),
      });
      const result = await engine.runDaily({ vaultRoot: vault, date: "2026-05-16" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("unreachable");
      const expected = path.join(vault, "generated", "DAILY-CONTEXT-2026-05-16.md");
      expect(result.path.replace(/\\/g, "/")).toBe(expected.replace(/\\/g, "/"));
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("honors custom outputDir", async () => {
    const vault = await mkVault();
    const customOut = await fs.mkdtemp(path.join(os.tmpdir(), "prism-daily-ctx-out-"));
    try {
      const engine = new DailyContextWorkflowEngine({
        loader: async () => fixtureSources(),
        summarizer: deterministicSummarizer("x"),
      });
      const result = await engine.runDaily({
        vaultRoot: vault,
        date: "2026-05-16",
        outputDir: customOut,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("unreachable");
      expect(result.path.startsWith(customOut)).toBe(true);
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
      await fs.rm(customOut, { recursive: true, force: true });
    }
  });

  it("fails with invalid-vault-root when vaultRoot does not exist", async () => {
    const engine = new DailyContextWorkflowEngine({
      loader: async () => fixtureSources(),
      summarizer: deterministicSummarizer("x"),
    });
    const missing = path.join(
      os.tmpdir(),
      "prism-daily-ctx-does-not-exist-" + Date.now() + "-" + Math.random(),
    );
    const result = await engine.runDaily({ vaultRoot: missing, date: "2026-05-16" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toBe("invalid-vault-root");
  });

  it("fails with no-sources when loader returns < MIN_SOURCES_FOR_BRIEF", async () => {
    const vault = await mkVault();
    try {
      const engine = new DailyContextWorkflowEngine({
        loader: async () => fixtureSources().slice(0, 2),
        summarizer: deterministicSummarizer("x"),
      });
      const result = await engine.runDaily({ vaultRoot: vault, date: "2026-05-16" });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("unreachable");
      expect(result.error).toBe("no-sources");
      expect(result.detail).toContain("2 sources");
      expect(result.detail).toContain(`${MIN_SOURCES_FOR_BRIEF} required`);
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("fails with no-sources when loader throws (fail-soft)", async () => {
    const vault = await mkVault();
    try {
      const engine = new DailyContextWorkflowEngine({
        loader: async () => {
          throw new Error("synthetic loader crash");
        },
        summarizer: deterministicSummarizer("x"),
      });
      const result = await engine.runDaily({ vaultRoot: vault, date: "2026-05-16" });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("unreachable");
      expect(result.error).toBe("no-sources");
      expect(result.detail).toContain("synthetic loader crash");
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("fails with summarizer-failed when Ollama is unreachable", async () => {
    const vault = await mkVault();
    try {
      const engine = new DailyContextWorkflowEngine({
        loader: async () => fixtureSources(),
        summarizer: failingSummarizer("ECONNREFUSED 127.0.0.1:11434"),
      });
      const result = await engine.runDaily({ vaultRoot: vault, date: "2026-05-16" });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("unreachable");
      expect(result.error).toBe("summarizer-failed");
      expect(result.detail).toContain("ECONNREFUSED");
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("defaults date to today when not provided", async () => {
    const vault = await mkVault();
    try {
      const engine = new DailyContextWorkflowEngine({
        loader: async () => fixtureSources(),
        summarizer: deterministicSummarizer("x"),
      });
      const result = await engine.runDaily({ vaultRoot: vault });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("unreachable");
      const today = isoDateUTC();
      expect(result.path).toContain(`DAILY-CONTEXT-${today}.md`);
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("creates outputDir if it does not exist", async () => {
    const vault = await mkVault();
    try {
      const nested = path.join(vault, "nested", "output", "dir");
      // pre-condition: directory absent
      let preExists = true;
      try {
        await fs.stat(nested);
      } catch {
        preExists = false;
      }
      expect(preExists).toBe(false);

      const engine = new DailyContextWorkflowEngine({
        loader: async () => fixtureSources(),
        summarizer: deterministicSummarizer("x"),
      });
      const result = await engine.runDaily({
        vaultRoot: vault,
        date: "2026-05-16",
        outputDir: nested,
      });
      expect(result.ok).toBe(true);
      const stat = await fs.stat(nested);
      expect(stat.isDirectory()).toBe(true);
      // post-condition: file actually present at the path the engine claimed
      if (!result.ok) throw new Error("unreachable");
      const fileStat = await fs.stat(result.path);
      expect(fileStat.size).toBeGreaterThan(0);
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });

  it("output references >= MIN_SOURCES_FOR_BRIEF source files (exit_conditions[1])", async () => {
    const vault = await mkVault();
    try {
      const engine = new DailyContextWorkflowEngine({
        loader: async () => fixtureSources(),
        summarizer: deterministicSummarizer("morning brief here"),
      });
      const result = await engine.runDaily({ vaultRoot: vault, date: "2026-05-16" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("unreachable");
      const body = await fs.readFile(result.path, "utf8");
      const sourcesSection = body.split("## Sources")[1] || "";
      const bulletCount = (sourcesSection.match(/^- \*\*/gm) || []).length;
      expect(bulletCount).toBeGreaterThanOrEqual(MIN_SOURCES_FOR_BRIEF);
    } finally {
      await fs.rm(vault, { recursive: true, force: true });
    }
  });
});

/* ---------- defaults sanity ---------- */

describe("module defaults", () => {
  it("exposes the spec's required Ollama model + URL", () => {
    expect(DEFAULT_OLLAMA_MODEL).toBe("qwen2.5-coder:7b");
    expect(DEFAULT_OLLAMA_URL).toBe("http://127.0.0.1:11434/api/generate");
  });

  it("MIN_SOURCES_FOR_BRIEF is 3 (matches exit_conditions[1])", () => {
    expect(MIN_SOURCES_FOR_BRIEF).toBe(3);
  });

  it("defaultOllamaSummarizer returns ok=false on unreachable host without throwing", async () => {
    process.env.PRISM_DAILY_CONTEXT_OLLAMA_URL = "http://127.0.0.1:1/nope";
    process.env.PRISM_DAILY_CONTEXT_OLLAMA_TIMEOUT_MS = "500";
    try {
      const result = await defaultOllamaSummarizer({ sources: fixtureSources(), date: "2026-05-16" });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("unreachable");
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    } finally {
      delete process.env.PRISM_DAILY_CONTEXT_OLLAMA_URL;
      delete process.env.PRISM_DAILY_CONTEXT_OLLAMA_TIMEOUT_MS;
    }
  });
});
