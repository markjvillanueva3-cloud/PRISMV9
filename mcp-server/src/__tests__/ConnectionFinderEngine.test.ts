import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ConnectionFinderEngine,
  weekIsoUTC,
  mondayUTC,
  truncateBody,
  buildAnalyzerPrompt,
  parseAnalyzerJson,
  formatBrief,
  defaultLoader,
  MAX_SOURCE_BYTES,
  MIN_SOURCES_FOR_ANALYSIS,
  MAX_SOURCES_PER_RUN,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_MEMORY_LIMIT,
  DEFAULT_WIKI_LIMIT,
  DEFAULT_INBOX_LIMIT,
  type Connection,
  type ConnectionFinderConnectionFinderLoadedSource,
  type AnalyzerFn,
  type LoaderFn,
} from "../engines/ConnectionFinderEngine.js";

/* ─── fixtures ─────────────────────────────────────────────────────────── */

async function mkVault(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "prism-conn-finder-"));
  // Layout matches PRISM 5-namespace doctrine: <root>/memories, <root>/memories/inbox,
  // <root>/wiki/code-tribal. Per engine Arm B P1-3 fix (2026-05-15).
  await fs.mkdir(path.join(root, "memories"), { recursive: true });
  await fs.mkdir(path.join(root, "memories", "inbox"), { recursive: true });
  await fs.mkdir(path.join(root, "wiki", "code-tribal"), { recursive: true });
  return root;
}

async function seedMemos(root: string, count: number, kind: "memory" | "wiki" | "inbox"): Promise<void> {
  const sub =
    kind === "wiki"
      ? path.join("wiki", "code-tribal")
      : kind === "inbox"
        ? path.join("memories", "inbox")
        : "memories";
  for (let i = 0; i < count; i++) {
    await fs.writeFile(
      path.join(root, sub, `${kind}-${String(i).padStart(2, "0")}.md`),
      `# ${kind} memo ${i}\n\nContent body for ${kind} index ${i}. Lorem ipsum dolor sit amet.\n`,
    );
  }
}

function fixtureConnections(): Connection[] {
  return [
    {
      kind: "contradiction",
      title: "Karpathy R8 (read before write) vs R5 (model only for judgment)",
      summary:
        "Two memos disagree on when to invoke Claude. R8 says read existing exports first. " +
        "R5 says route deterministic transforms away from the model entirely.",
      sources: ["memory/feedback_r5.md", "memory/feedback_r8.md"],
    },
    {
      kind: "echo",
      title: "Three independent confirmations: never delete, always disable",
      summary:
        "Three separate sessions arrived at the rule that destructive ops should be reversible. " +
        "This is a strong consensus signal worth promoting to CLAUDE.md.",
      sources: [
        "memory/feedback_never_delete.md",
        "memory/feedback_alpha_disable.md",
        "wiki/code-tribal/disable-not-delete.md",
      ],
    },
    {
      kind: "cross-domain",
      title: "Chip evacuation in milling ↔ back-pressure in async queues",
      summary:
        "Coolant clearing chips from the cut prevents recutting; back-pressure in a queue " +
        "prevents producer overrun. Same problem class, different physics.",
      sources: ["memory/tribal_milling_chip.md", "wiki/code-tribal/queue-backpressure.md"],
    },
  ];
}

function deterministicAnalyzer(connections: Connection[]): AnalyzerFn {
  return async () => connections;
}

function failingAnalyzer(message: string): AnalyzerFn {
  return async () => {
    throw new Error(message);
  };
}

function fixtureSources(n: number): ConnectionFinderLoadedSource[] {
  const out: ConnectionFinderLoadedSource[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      kind: i % 3 === 0 ? "memory" : i % 3 === 1 ? "wiki-tribal" : "inbox",
      relPath: `vault/file-${String(i).padStart(3, "0")}.md`,
      mtimeMs: 1_700_000_000_000 + i * 1_000,
      body: `Body for memo ${i}. The text contains enough content to be analyzed.`,
    });
  }
  return out;
}

/* ─── weekIsoUTC ───────────────────────────────────────────────────────── */

describe("weekIsoUTC", () => {
  it("computes ISO week label for a known midweek date", () => {
    // 2026-05-13 is a Wed → ISO week 20 of 2026.
    expect(weekIsoUTC(new Date("2026-05-13T12:00:00Z"))).toBe("2026-W20");
  });

  it("rolls a Sunday-evening UTC date into the same week as the preceding monday", () => {
    // 2026-05-17 is a Sun → ISO week 20.
    expect(weekIsoUTC(new Date("2026-05-17T23:30:00Z"))).toBe("2026-W20");
  });

  it("zero-pads single-digit week numbers", () => {
    expect(weekIsoUTC(new Date("2026-01-08T12:00:00Z"))).toBe("2026-W02");
  });

  it("handles the year-boundary edge — Jan 1 of 2024 was ISO 2024-W01", () => {
    expect(weekIsoUTC(new Date("2024-01-01T00:00:00Z"))).toBe("2024-W01");
  });

  it("handles the year-boundary edge — Dec 31 of a long year rolls into next year's W01", () => {
    // 2024-12-30 is a Mon → ISO 2025-W01 (week-of-thursday rule).
    expect(weekIsoUTC(new Date("2024-12-30T00:00:00Z"))).toBe("2025-W01");
  });
});

/* ─── mondayUTC ────────────────────────────────────────────────────────── */

describe("mondayUTC", () => {
  it("returns the input date itself when called on a monday", () => {
    const mon = new Date("2026-05-11T15:00:00Z");
    expect(mondayUTC(mon).toISOString()).toBe("2026-05-11T00:00:00.000Z");
  });

  it("rolls a wednesday back to the preceding monday", () => {
    expect(mondayUTC(new Date("2026-05-13T18:00:00Z")).toISOString())
      .toBe("2026-05-11T00:00:00.000Z");
  });

  it("rolls a sunday back to the preceding monday (six days)", () => {
    expect(mondayUTC(new Date("2026-05-17T23:59:00Z")).toISOString())
      .toBe("2026-05-11T00:00:00.000Z");
  });

  it("strips the time component to 00:00:00.000Z", () => {
    const out = mondayUTC(new Date("2026-05-15T07:30:45.123Z"));
    expect(out.getUTCHours()).toBe(0);
    expect(out.getUTCMinutes()).toBe(0);
    expect(out.getUTCSeconds()).toBe(0);
    expect(out.getUTCMilliseconds()).toBe(0);
  });
});

/* ─── truncateBody ─────────────────────────────────────────────────────── */

describe("truncateBody", () => {
  it("passes short bodies through unchanged", () => {
    expect(truncateBody("hello world")).toBe("hello world");
  });

  it("truncates and appends a byte-count marker", () => {
    const big = "x".repeat(MAX_SOURCE_BYTES + 200);
    const out = truncateBody(big);
    expect(out.length).toBeLessThan(big.length);
    expect(out).toContain("…[truncated 200 bytes]");
  });

  it("respects an explicit limit", () => {
    expect(truncateBody("abcdef", 3)).toBe("abc\n…[truncated 3 bytes]");
  });

  it("returns empty string for non-string input", () => {
    // @ts-expect-error — exercising defensive runtime guard
    expect(truncateBody(null)).toBe("");
    // @ts-expect-error
    expect(truncateBody(undefined)).toBe("");
    // @ts-expect-error
    expect(truncateBody(42)).toBe("");
  });
});

/* ─── buildAnalyzerPrompt ──────────────────────────────────────────────── */

describe("buildAnalyzerPrompt", () => {
  it("includes the three connection-kind labels in the rules", () => {
    const p = buildAnalyzerPrompt(fixtureSources(3));
    expect(p).toContain('"contradiction"');
    expect(p).toContain('"echo"');
    expect(p).toContain('"cross-domain"');
  });

  it("embeds every source's relPath in the corpus block", () => {
    const sources = fixtureSources(4);
    const p = buildAnalyzerPrompt(sources);
    for (const s of sources) expect(p).toContain(s.relPath);
  });

  it("numbers the sources sequentially starting at 1", () => {
    const p = buildAnalyzerPrompt(fixtureSources(3));
    expect(p).toContain("### Source 1 ");
    expect(p).toContain("### Source 2 ");
    expect(p).toContain("### Source 3 ");
  });

  it("instructs JSON-only output (no markdown fence)", () => {
    const p = buildAnalyzerPrompt(fixtureSources(2));
    expect(p).toContain("Return ONLY a single JSON object");
  });

  it("handles an empty corpus without throwing", () => {
    const p = buildAnalyzerPrompt([]);
    expect(p).toContain("Corpus:");
    expect(typeof p).toBe("string");
  });
});

/* ─── parseAnalyzerJson ────────────────────────────────────────────────── */

describe("parseAnalyzerJson", () => {
  it("parses a clean JSON object with a connections array", () => {
    const raw = JSON.stringify({
      connections: [
        {
          kind: "echo",
          title: "Three confirmations of X",
          summary: "Memos A, B, C all converge on the same insight repeatedly across sessions.",
          sources: ["a.md", "b.md", "c.md"],
        },
      ],
    });
    const parsed = parseAnalyzerJson(raw);
    expect(parsed.length).toBe(1);
    expect(parsed[0]?.kind).toBe("echo");
    expect(parsed[0]?.sources.length).toBe(3);
  });

  it("ignores leading commentary and parses the embedded JSON", () => {
    const raw =
      "Sure! Here is the analysis you requested:\n\n" +
      JSON.stringify({
        connections: [
          {
            kind: "contradiction",
            title: "Title here long enough",
            summary: "Two memos disagree about something specific and concrete.",
            sources: ["x.md", "y.md"],
          },
        ],
      }) +
      "\n\nHope that helps!";
    const parsed = parseAnalyzerJson(raw);
    expect(parsed.length).toBe(1);
    expect(parsed[0]?.kind).toBe("contradiction");
  });

  it("returns [] on empty string", () => {
    expect(parseAnalyzerJson("")).toEqual([]);
  });

  it("returns [] on non-JSON garbage", () => {
    expect(parseAnalyzerJson("plain prose, no braces at all")).toEqual([]);
  });

  it("returns [] when JSON is well-formed but has no connections key", () => {
    expect(parseAnalyzerJson(JSON.stringify({ other: "field" }))).toEqual([]);
  });

  it("drops malformed connection records but keeps valid siblings", () => {
    const raw = JSON.stringify({
      connections: [
        { kind: "echo" }, // missing title/summary/sources → dropped
        {
          kind: "echo",
          title: "Valid echo title",
          summary: "Three memos converge on this useful insight repeatedly.",
          sources: ["a.md", "b.md", "c.md"],
        },
      ],
    });
    const parsed = parseAnalyzerJson(raw);
    expect(parsed.length).toBe(1);
    expect(parsed[0]?.title).toBe("Valid echo title");
  });

  it("rejects an invalid kind value via the closed enum", () => {
    const raw = JSON.stringify({
      connections: [
        {
          kind: "bogus-kind",
          title: "Has all other fields right",
          summary: "But the kind value is not in the closed enum, so it must be dropped.",
          sources: ["a.md", "b.md"],
        },
      ],
    });
    expect(parseAnalyzerJson(raw)).toEqual([]);
  });

  it("tolerates nested braces inside string values", () => {
    const raw = JSON.stringify({
      connections: [
        {
          kind: "echo",
          title: "Title with } and { embedded",
          summary: "The summary string itself contains { and } which must not confuse the walker.",
          sources: ["a.md", "b.md", "c.md"],
        },
      ],
    });
    const parsed = parseAnalyzerJson(raw);
    expect(parsed.length).toBe(1);
  });

  it("recovers the real connections payload when preceded by a valid-but-empty JSON object (Ollama sidecar pattern)", () => {
    // Ollama qwen2.5-coder:7b sometimes prepends {"_metadata":...} sidecar objects
    // before the requested payload. The walker MUST scan past valid-but-empty
    // objects to find the real connections array. Per Arm A P0 scrutiny
    // finding (2026-05-15) — first-valid-wins silently dropped real payloads.
    const raw =
      JSON.stringify({ _metadata: { provider: "ollama" } }) +
      "garbage" +
      JSON.stringify({
        connections: [
          {
            kind: "echo",
            title: "Real connection that must be recovered",
            summary: "Three memos converge on the same insight — this is the real payload.",
            sources: ["a.md", "b.md", "c.md"],
          },
        ],
      });
    const parsed = parseAnalyzerJson(raw);
    expect(parsed.length).toBe(1);
    expect(parsed[0]?.title).toBe("Real connection that must be recovered");
  });

  it("returns [] when ALL parseable objects lack a connections array (no real payload exists)", () => {
    const raw =
      JSON.stringify({ unrelated: true }) +
      " " +
      JSON.stringify({ also_unrelated: 42 }) +
      " " +
      JSON.stringify({ third_object: null });
    expect(parseAnalyzerJson(raw)).toEqual([]);
  });

  it("recovers a real payload past a MALFORMED but BRACE-CLOSED leading object (E1 original lesson)", () => {
    // {not_valid_json} closes its own braces but is not valid JSON — walker
    // hits the catch, advances past the close brace, finds the real payload.
    // (A prefix with unmatched braces would swallow the real JSON; that's a
    // separate hostile class covered by the unbalanced-braces test below.)
    const raw =
      "{not_valid_json}" +
      JSON.stringify({
        connections: [
          {
            kind: "contradiction",
            title: "Real connection past the malformed prefix",
            summary: "The walker must skip the malformed leading object and find this one.",
            sources: ["a.md", "b.md"],
          },
        ],
      });
    const parsed = parseAnalyzerJson(raw);
    expect(parsed.length).toBe(1);
    expect(parsed[0]?.kind).toBe("contradiction");
  });

  it("returns [] on unbalanced braces", () => {
    expect(parseAnalyzerJson("{ \"connections\": [")).toEqual([]);
  });

  it("returns [] when input is not a string", () => {
    // @ts-expect-error — defensive runtime guard
    expect(parseAnalyzerJson(null)).toEqual([]);
    // @ts-expect-error
    expect(parseAnalyzerJson(undefined)).toEqual([]);
    // @ts-expect-error
    expect(parseAnalyzerJson(42)).toEqual([]);
  });
});

/* ─── formatBrief ──────────────────────────────────────────────────────── */

describe("formatBrief", () => {
  it("emits YAML frontmatter with audit fields", () => {
    const md = formatBrief("2026-W20", "2026-05-13T12:00:00.000Z", fixtureConnections(), 25);
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("week: 2026-W20");
    expect(md).toContain("kind: weekly-connections");
    expect(md).toContain("sources_scanned: 25");
    expect(md).toContain("connections_count: 3");
  });

  it("includes the week-name heading after the frontmatter", () => {
    const md = formatBrief("2026-W20", "ts", fixtureConnections(), 25);
    expect(md).toContain("# Weekly Connections — 2026-W20");
  });

  it("groups connections under per-kind h2 headers with counts", () => {
    const md = formatBrief("2026-W20", "ts", fixtureConnections(), 25);
    expect(md).toContain("## contradiction (1)");
    expect(md).toContain("## echo (1)");
    expect(md).toContain("## cross-domain (1)");
  });

  it("renders each connection with title, summary, and source list", () => {
    const md = formatBrief("2026-W20", "ts", fixtureConnections(), 25);
    expect(md).toContain("### Karpathy R8 (read before write) vs R5 (model only for judgment)");
    expect(md).toContain("- `memory/feedback_r5.md`");
    expect(md).toContain("- `memory/feedback_r8.md`");
  });

  it("emits the 'no connections' fallback when the list is empty", () => {
    const md = formatBrief("2026-W20", "ts", [], 25);
    expect(md).toContain("_No connections surfaced this week.");
    // It must still emit a valid frontmatter + heading
    expect(md).toContain("connections_count: 0");
  });

  it("skips a kind section entirely when its bucket is empty", () => {
    const onlyEcho: Connection[] = [
      {
        kind: "echo",
        title: "Only echo here",
        summary: "Three memos converge on the same insight that recurs through the corpus.",
        sources: ["a.md", "b.md", "c.md"],
      },
    ];
    const md = formatBrief("2026-W20", "ts", onlyEcho, 12);
    expect(md).toContain("## echo (1)");
    expect(md).not.toContain("## contradiction");
    expect(md).not.toContain("## cross-domain");
  });
});

/* ─── defaultLoader ────────────────────────────────────────────────────── */

describe("defaultLoader", () => {
  it("loads memory + wiki/code-tribal + inbox in a single batch", async () => {
    const root = await mkVault();
    await seedMemos(root, 3, "memory");
    await seedMemos(root, 2, "wiki");
    await seedMemos(root, 4, "inbox");
    const sources = await defaultLoader(root);
    const kinds = sources.map((s) => s.kind).sort();
    expect(kinds).toContain("memory");
    expect(kinds).toContain("wiki-tribal");
    expect(kinds).toContain("inbox");
    expect(sources.length).toBe(9);
  });

  it("returns the most recently modified memos first within each kind", async () => {
    const root = await mkVault();
    const dir = path.join(root, "memories");
    await fs.writeFile(path.join(dir, "old.md"), "old");
    await fs.writeFile(path.join(dir, "new.md"), "new");
    // Backdate the "old" file by 1 day
    const past = new Date(Date.now() - 86_400_000);
    await fs.utimes(path.join(dir, "old.md"), past, past);
    const sources = await defaultLoader(root, { memoryLimit: 5 });
    const mem = sources.filter((s) => s.kind === "memory");
    expect(mem.length).toBe(2);
    expect(mem[0]?.relPath.endsWith("new.md")).toBe(true);
  });

  it("respects per-kind limit options", async () => {
    const root = await mkVault();
    await seedMemos(root, 50, "memory");
    const sources = await defaultLoader(root, { memoryLimit: 7, wikiLimit: 0, inboxLimit: 0 });
    expect(sources.length).toBe(7);
  });

  it("hard-caps total sources at MAX_SOURCES_PER_RUN with per-kind reservation", async () => {
    const root = await mkVault();
    await seedMemos(root, 100, "memory");
    await seedMemos(root, 100, "inbox");
    const sources = await defaultLoader(root, {
      memoryLimit: 100,
      wikiLimit: 0,
      inboxLimit: 100,
    });
    // Per-kind reservation caps each kind at DEFAULT_*_LIMIT even when the
    // caller bumps the loader limits. This prevents a fat memory dir from
    // crowding out wiki/inbox. Per Arm A P1-2 + Arm B P1-4 scrutiny.
    const memCount = sources.filter((s) => s.kind === "memory").length;
    const inboxCount = sources.filter((s) => s.kind === "inbox").length;
    expect(memCount).toBe(DEFAULT_MEMORY_LIMIT);
    expect(inboxCount).toBe(DEFAULT_INBOX_LIMIT);
    expect(sources.length).toBeLessThanOrEqual(MAX_SOURCES_PER_RUN);
    expect(sources.length).toBe(DEFAULT_MEMORY_LIMIT + DEFAULT_INBOX_LIMIT);
  });

  it("enforces per-kind reservation even when one kind dominates the on-disk corpus", async () => {
    const root = await mkVault();
    // Memory has way more than wiki/inbox — the per-kind cap should still
    // leave room for the smaller kinds to be represented in the final batch.
    await seedMemos(root, 100, "memory");
    await seedMemos(root, 5, "wiki");
    await seedMemos(root, 5, "inbox");
    const sources = await defaultLoader(root, {
      memoryLimit: 100,
      wikiLimit: 50,
      inboxLimit: 50,
    });
    const wikiCount = sources.filter((s) => s.kind === "wiki-tribal").length;
    const inboxCount = sources.filter((s) => s.kind === "inbox").length;
    expect(wikiCount).toBe(5);   // every wiki entry on disk made it through
    expect(inboxCount).toBe(5);  // every inbox entry on disk made it through
  });

  it("returns [] silently when subdirectories are missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "prism-conn-finder-bare-"));
    const sources = await defaultLoader(root);
    expect(sources).toEqual([]);
  });

  it("skips non-markdown files in each kind directory", async () => {
    const root = await mkVault();
    await fs.writeFile(path.join(root, "memories", "real.md"), "ok");
    await fs.writeFile(path.join(root, "memories", "junk.txt"), "skip");
    await fs.writeFile(path.join(root, "memories", "image.png"), "binary");
    const sources = await defaultLoader(root, { memoryLimit: 10, wikiLimit: 0, inboxLimit: 0 });
    expect(sources.length).toBe(1);
    expect(sources[0]?.relPath.endsWith("real.md")).toBe(true);
  });
});

/* ─── ConnectionFinderEngine.runWeekly ─────────────────────────────────── */

describe("ConnectionFinderEngine.runWeekly", () => {
  it("returns invalid-vault-root on a missing path", async () => {
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: path.join(os.tmpdir(), `does-not-exist-${Date.now()}`),
      analyzer: deterministicAnalyzer([]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid-vault-root");
  });

  it("returns invalid-vault-root when vaultRoot is empty string", async () => {
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: "",
      analyzer: deterministicAnalyzer([]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid-vault-root");
  });

  it("returns invalid-vault-root when vaultRoot is a file, not a directory", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "prism-conn-finder-file-"));
    const file = path.join(tmp, "not-a-dir.md");
    await fs.writeFile(file, "x");
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: file,
      analyzer: deterministicAnalyzer([]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("invalid-vault-root");
  });

  it("returns no-sources when the loader returns fewer than MIN_SOURCES_FOR_ANALYSIS", async () => {
    const root = await mkVault();
    await seedMemos(root, 2, "memory"); // way below the floor
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      analyzer: deterministicAnalyzer([]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("no-sources");
      expect(result.detail).toContain(String(MIN_SOURCES_FOR_ANALYSIS));
    }
  });

  it("returns loader-failed when an injected loader throws (discriminated-union contract holds)", async () => {
    const root = await mkVault();
    const throwingLoader: LoaderFn = async () => {
      throw new Error("EACCES on a vault subdir");
    };
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      loader: throwingLoader,
      analyzer: deterministicAnalyzer([]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("loader-failed");
      expect(result.detail).toContain("EACCES");
    }
  });

  it("returns analyzer-failed when the analyzer throws", async () => {
    const root = await mkVault();
    await seedMemos(root, 15, "memory");
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      analyzer: failingAnalyzer("ollama 500 connection-refused"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("analyzer-failed");
      expect(result.detail).toContain("ollama 500");
    }
  });

  it("returns write-failed when the output directory cannot be created", async () => {
    const root = await mkVault();
    await seedMemos(root, 15, "memory");
    // Point outputDir at an existing FILE so mkdir recursive fails
    const blocker = path.join(root, "blocker.md");
    await fs.writeFile(blocker, "x");
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      outputDir: blocker,
      analyzer: deterministicAnalyzer(fixtureConnections()),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("write-failed");
  });

  it("ships ok=true with a well-formed brief when the analyzer returns connections", async () => {
    const root = await mkVault();
    await seedMemos(root, 12, "memory");
    await seedMemos(root, 3, "wiki");
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      date: new Date("2026-05-13T12:00:00Z"),
      analyzer: deterministicAnalyzer(fixtureConnections()),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.week).toBe("2026-W20");
      expect(result.connections_count).toBe(3);
      expect(result.sources_scanned).toBeGreaterThanOrEqual(MIN_SOURCES_FOR_ANALYSIS);
      expect(result.bytes_written).toBeGreaterThan(0);
      const text = await fs.readFile(result.path, "utf8");
      expect(text).toContain("# Weekly Connections — 2026-W20");
      expect(text).toContain("## contradiction (1)");
    }
  });

  it("writes to a custom outputDir when supplied", async () => {
    const root = await mkVault();
    await seedMemos(root, 12, "memory");
    const customOut = path.join(root, "elsewhere", "deep");
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      outputDir: customOut,
      date: new Date("2026-05-13T12:00:00Z"),
      analyzer: deterministicAnalyzer(fixtureConnections()),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path.includes("elsewhere") && result.path.includes("deep")).toBe(true);
      expect(result.path.endsWith("CONNECTIONS-2026-W20.md")).toBe(true);
    }
  });

  it("emits the 'no connections this week' line when analyzer returns []", async () => {
    const root = await mkVault();
    await seedMemos(root, 12, "memory");
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      analyzer: deterministicAnalyzer([]),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const text = await fs.readFile(result.path, "utf8");
      expect(text).toContain("_No connections surfaced this week.");
      expect(result.connections_count).toBe(0);
    }
  });

  it("the rendered brief contains ≥3 bulleted source citations across all connections (spec exit-condition)", async () => {
    const root = await mkVault();
    await seedMemos(root, 12, "memory");
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      analyzer: deterministicAnalyzer(fixtureConnections()),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const text = await fs.readFile(result.path, "utf8");
      const bulletCount = (text.match(/^- `/gm) ?? []).length;
      expect(bulletCount).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses an injected loader when supplied (DI bypass for hostile/oversize fixtures)", async () => {
    const root = await mkVault();
    // No memos on disk — loader is fully synthetic
    const synthetic: LoaderFn = async () => fixtureSources(15);
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      loader: synthetic,
      analyzer: deterministicAnalyzer(fixtureConnections()),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.sources_scanned).toBe(15);
  });

  it("propagates non-Error analyzer rejections as analyzer-failed (string thrown)", async () => {
    const root = await mkVault();
    await seedMemos(root, 12, "memory");
    const stringThrower: AnalyzerFn = async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "bare string error from analyzer";
    };
    const result = await ConnectionFinderEngine.runWeekly({
      vaultRoot: root,
      analyzer: stringThrower,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("analyzer-failed");
      expect(result.detail).toContain("bare string error");
    }
  });
});

/* ─── module defaults ──────────────────────────────────────────────────── */

describe("module defaults", () => {
  it("DEFAULT_OLLAMA_MODEL is qwen2.5-coder:7b unless overridden", () => {
    expect(DEFAULT_OLLAMA_MODEL).toBe("qwen2.5-coder:7b");
  });

  it("MAX_SOURCE_BYTES is a positive integer ≤ 16K", () => {
    expect(Number.isInteger(MAX_SOURCE_BYTES)).toBe(true);
    expect(MAX_SOURCE_BYTES).toBeGreaterThan(0);
    expect(MAX_SOURCE_BYTES).toBeLessThanOrEqual(16_000);
  });

  it("MIN_SOURCES_FOR_ANALYSIS is at least 5 (otherwise weekly synthesis is meaningless)", () => {
    expect(MIN_SOURCES_FOR_ANALYSIS).toBeGreaterThanOrEqual(5);
  });

  it("MAX_SOURCES_PER_RUN exceeds the floor so the engine can always succeed when sufficient corpus exists", () => {
    expect(MAX_SOURCES_PER_RUN).toBeGreaterThan(MIN_SOURCES_FOR_ANALYSIS);
  });
});
