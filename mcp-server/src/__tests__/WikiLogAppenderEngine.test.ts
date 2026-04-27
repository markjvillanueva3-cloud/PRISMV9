/**
 * WikiLogAppenderEngine.test.ts — KNOWLEDGE-WIKI-MS0 / U-WIKI02
 *
 * Real validations only — every assertion exercises actual behavior:
 * format produced, content reachable, dedup tuple respected, lock fence holds.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WikiLogAppenderEngine } from "../engines/WikiLogAppenderEngine.js";

let TMP: string;
let logPath: string;
let engine: WikiLogAppenderEngine;

const HEADER_RE = /^## \[(\d{4}-\d{2}-\d{2})\] ([^|]+?) \| (.+?) \| by:(.+?)$/;

beforeEach(async () => {
  TMP = await fs.mkdtemp(join(tmpdir(), "wiki-log-"));
  logPath = join(TMP, "log.md");
  engine = new WikiLogAppenderEngine(logPath);
});

afterEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

describe("WikiLogAppenderEngine.append — format contract", () => {
  it("emits exactly one header line that parses with the canonical grep regex", async () => {
    const r = await engine.append({
      date: "2026-04-27",
      op: "bootstrap",
      title: "initial seed from digests",
      agent: "wiki-bootstrap.mjs",
    });
    expect(r.appended).toStrictEqual(true);
    expect(r.line).toStrictEqual(
      "## [2026-04-27] bootstrap | initial seed from digests | by:wiki-bootstrap.mjs"
    );
    const raw = await fs.readFile(logPath, "utf-8");
    const headers = raw.split(/\r?\n/).filter((l) => l.startsWith("## ["));
    expect(headers).toStrictEqual([r.line]);
    const m = HEADER_RE.exec(headers[0]);
    expect(m).not.toBeNull();
    expect(m![1]).toStrictEqual("2026-04-27");
    expect(m![2].trim()).toStrictEqual("bootstrap");
    expect(m![3].trim()).toStrictEqual("initial seed from digests");
    expect(m![4].trim()).toStrictEqual("wiki-bootstrap.mjs");
  });

  it("seeds the file header on first write", async () => {
    await engine.append({ date: "2026-04-27", op: "lint", title: "first", agent: "claude-aaaaaaaa" });
    const raw = await fs.readFile(logPath, "utf-8");
    expect(raw.split(/\r?\n/, 1)[0]).toStrictEqual("# PRISM Wiki Log");
  });

  it("appends bullet details under the header verbatim", async () => {
    await engine.append({
      date: "2026-04-27",
      op: "merge",
      title: "conflict resolved on force-kienzle",
      agent: "claude-ce425dcc",
      details: ["winner: incoming (newer last_verified)", "loser preserved in conflicts/"],
    });
    const raw = await fs.readFile(logPath, "utf-8");
    const lines = raw.split(/\r?\n/);
    const headerIdx = lines.findIndex((l) => l.startsWith("## [2026-04-27] merge"));
    expect(headerIdx).toBeGreaterThanOrEqual(0);
    expect(lines[headerIdx + 1]).toStrictEqual("- winner: incoming (newer last_verified)");
    expect(lines[headerIdx + 2]).toStrictEqual("- loser preserved in conflicts/");
  });

  it("strips embedded newlines in detail lines (preserves grep contract)", async () => {
    await engine.append({
      date: "2026-04-27",
      op: "ingest",
      title: "weird detail",
      agent: "claude-aaaaaaaa",
      details: ["one\ntwo"],
    });
    const raw = await fs.readFile(logPath, "utf-8");
    expect(raw.split(/\r?\n/).filter((l) => l === "- one two")).toHaveLength(1);
    expect(raw.split(/\r?\n/).filter((l) => l === "- two")).toHaveLength(0);
    expect(raw.split(/\r?\n/).filter((l) => l === "- one")).toHaveLength(0);
  });
});

describe("WikiLogAppenderEngine.append — idempotency", () => {
  it("re-appending exact (date,op,title,agent) tuple produces no second line", async () => {
    const entry = {
      date: "2026-04-27",
      op: "ingest",
      title: "imported manuals/aluminum-7075",
      agent: "claude-ce425dcc",
    };
    const r1 = await engine.append(entry);
    const r2 = await engine.append(entry);
    expect(r1.reason).toStrictEqual("ok");
    expect(r2.reason).toStrictEqual("duplicate");
    expect(r2.appended).toStrictEqual(false);
    const raw = await fs.readFile(logPath, "utf-8");
    expect(raw.split(/\r?\n/).filter((l) => l === r1.line)).toHaveLength(1);
  });

  it("same (date,op,title) but different agent yields TWO lines", async () => {
    const base = { date: "2026-04-27", op: "lint", title: "drift scan" } as const;
    await engine.append({ ...base, agent: "claude-aaaaaaaa" });
    await engine.append({ ...base, agent: "claude-bbbbbbbb" });
    const lines = await engine.read();
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.agent).sort()).toStrictEqual([
      "claude-aaaaaaaa",
      "claude-bbbbbbbb",
    ]);
  });
});

describe("WikiLogAppenderEngine.append — failure modes", () => {
  it("rejects empty op with descriptive error", async () => {
    await expect(
      engine.append({ op: "", title: "x", agent: "claude-aaaaaaaa" } as never)
    ).rejects.toThrow(/op required/);
  });

  it("rejects whitespace-only title", async () => {
    await expect(
      engine.append({ op: "ingest", title: "   ", agent: "claude-aaaaaaaa" } as never)
    ).rejects.toThrow(/title required/);
  });

  it("rejects newline in title (would break grep contract)", async () => {
    await expect(
      engine.append({ op: "ingest", title: "line1\nline2", agent: "claude-aaaaaaaa" } as never)
    ).rejects.toThrow(/title must not contain newlines/);
  });

  it("rejects malformed date (US slash format)", async () => {
    await expect(
      engine.append({
        date: "04/27/26",
        op: "ingest",
        title: "x",
        agent: "claude-aaaaaaaa",
      } as never)
    ).rejects.toThrow(/date must be YYYY-MM-DD/);
  });

  it("rejects empty agent (would orphan attribution)", async () => {
    await expect(
      engine.append({ op: "ingest", title: "x", agent: "" } as never)
    ).rejects.toThrow(/agent required/);
  });
});

describe("WikiLogAppenderEngine.read", () => {
  beforeEach(async () => {
    await engine.append({
      date: "2026-04-25",
      op: "bootstrap",
      title: "seed",
      agent: "wiki-bootstrap.mjs",
    });
    await engine.append({
      date: "2026-04-26",
      op: "ingest",
      title: "manuals/al-7075",
      agent: "claude-aaaaaaaa",
    });
    await engine.append({
      date: "2026-04-27",
      op: "ingest",
      title: "manuals/ti-6al-4v",
      agent: "claude-bbbbbbbb",
    });
    await engine.append({
      date: "2026-04-27",
      op: "lint",
      title: "drift",
      agent: "claude-aaaaaaaa",
    });
  });

  it("returns 4 entries in file order", async () => {
    const all = await engine.read();
    expect(all).toHaveLength(4);
    expect(all.map((e) => e.date)).toStrictEqual([
      "2026-04-25",
      "2026-04-26",
      "2026-04-27",
      "2026-04-27",
    ]);
    expect(all[3].op).toStrictEqual("lint");
  });

  it("filters by date — returns 2 of 4", async () => {
    const r = await engine.read({ date: "2026-04-27" });
    expect(r).toHaveLength(2);
    expect(new Set(r.map((e) => e.date))).toStrictEqual(new Set(["2026-04-27"]));
  });

  it("filters by agent AND op (intersection) — returns the one drift", async () => {
    const r = await engine.read({ agent: "claude-aaaaaaaa", op: "lint" });
    expect(r).toHaveLength(1);
    expect(r[0].title).toStrictEqual("drift");
    expect(r[0].agent).toStrictEqual("claude-aaaaaaaa");
  });

  it("limit:2 returns the 2 newest by file order", async () => {
    const r = await engine.read({ limit: 2 });
    expect(r.map((e) => e.title)).toStrictEqual(["manuals/ti-6al-4v", "drift"]);
  });

  it("returns [] when log file is missing", async () => {
    const fresh = new WikiLogAppenderEngine(join(TMP, "absent.md"));
    expect(await fresh.read()).toStrictEqual([]);
  });
});

describe("WikiLogAppenderEngine — concurrency", () => {
  it("3 chats appending in parallel: all 3 lines reach the file", async () => {
    const chats = ["claude-11111111", "claude-22222222", "claude-33333333"] as const;
    await Promise.all(
      chats.map((agent, i) =>
        engine.append({
          date: "2026-04-27",
          op: "ingest",
          title: `parallel-write-${i}`,
          agent,
        })
      )
    );
    const lines = await engine.read();
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.title).sort()).toStrictEqual([
      "parallel-write-0",
      "parallel-write-1",
      "parallel-write-2",
    ]);
    const raw = await fs.readFile(engine.getLogPath(), "utf-8");
    expect(raw.endsWith("\n")).toStrictEqual(true);
    expect(raw.split(/\r?\n/).filter((l) => l.startsWith("## ["))).toHaveLength(3);
  });

  it("10 same-tuple writes converge to exactly one line", async () => {
    const entry = {
      date: "2026-04-27",
      op: "ingest",
      title: "dup-flood",
      agent: "claude-aaaaaaaa",
    };
    const results = await Promise.all(
      Array.from({ length: 10 }, () => engine.append(entry))
    );
    const lines = await engine.read();
    expect(lines).toHaveLength(1);
    expect(lines[0].title).toStrictEqual("dup-flood");
    const okCount = results.filter((r) => r.reason === "ok").length;
    const dupCount = results.filter((r) => r.reason === "duplicate").length;
    expect(okCount).toStrictEqual(1);
    expect(dupCount).toStrictEqual(9);
  });
});
