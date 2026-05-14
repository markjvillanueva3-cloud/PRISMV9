/**
 * memory-garden-scan.test.mjs — verification of CLEANUP-MS0/U-CLEANUP-H1.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes
 *   - >= 2 adversarial inputs
 *   - >= 3 spanning variability configs
 *   - round-trip via runCli
 *
 * Real reference values — no toBeDefined() / toBeUndefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseArgs,
  scanMemoryDir,
  parseIndexLinks,
  findStalePathRefs,
  loadChatSlots,
  activeSlotCount,
  scanMemoryGarden,
  renderMarkdown,
  runCli,
  writeAtomic,
} from "../memory-garden-scan.mjs";

// ──────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "memory-garden-"));
  mkdirSync(join(root, "state/shared"), { recursive: true });
  mkdirSync(join(root, "memory"), { recursive: true });
  return root;
}

function writeMemoryFile(root, name, body) {
  writeFileSync(join(root, "memory", name), body, "utf8");
}

function writeSlots(root, slotsObj) {
  writeFileSync(join(root, "state/shared/chat-slots.json"), JSON.stringify({ schemaVersion: 1, slots: slotsObj }), "utf8");
}

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs(["node", "x.mjs"]);
    expect(a.json).toBe(false);
    expect(a.frozenTime).toBe(null);
    expect(a.memoryDir).toBe(null);
    expect(a.slotsFile).toBe(null);
  });

  it("--json + --frozen-time + --memory-dir + --slots-file", () => {
    const a = parseArgs(["node", "x.mjs", "--json", "--frozen-time", "t", "--memory-dir", "/m", "--slots-file", "/s"]);
    expect(a.json).toBe(true);
    expect(a.frozenTime).toBe("t");
    expect(a.memoryDir).toBe("/m");
    expect(a.slotsFile).toBe("/s");
  });
});

// ──────────────────────────────────────────────────────────────────────
// scanMemoryDir
// ──────────────────────────────────────────────────────────────────────

describe("scanMemoryDir", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("returns sorted .md files with bytes + mtime", () => {
    writeMemoryFile(root, "zebra.md", "z");
    writeMemoryFile(root, "alpha.md", "alpha-content");
    writeMemoryFile(root, "ignored.txt", "skip me");
    const out = scanMemoryDir(join(root, "memory"));
    expect(out.ok).toBe(true);
    expect(out.files.map((f) => f.name)).toEqual(["alpha.md", "zebra.md"]);
    expect(out.files[0].bytes).toBe(13);
    expect(out.files[0].mtime).toBeGreaterThan(0);
  });

  it("ok:false on missing dir", () => {
    const out = scanMemoryDir(join(root, "nope"));
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/not found/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// parseIndexLinks
// ──────────────────────────────────────────────────────────────────────

describe("parseIndexLinks", () => {
  it("extracts markdown link targets ending in .md", () => {
    const md = "Some text\n- [Title One](file_one.md)\n- [Title Two](feedback_two.md)\n";
    const refs = parseIndexLinks(md);
    expect([...refs].sort()).toEqual(["feedback_two.md", "file_one.md"]);
  });

  it("extracts wikilinks [[name]] with auto .md suffix", () => {
    const md = "Refs: [[reference_a]] and [[other.md]]";
    const refs = parseIndexLinks(md);
    expect(refs.has("reference_a.md")).toBe(true);
    expect(refs.has("other.md")).toBe(true);
  });

  it("ignores http(s):// links + paths with slashes", () => {
    const md = "[Ext](https://x.com/foo.md) and [Sub](dir/file.md)";
    const refs = parseIndexLinks(md);
    expect(refs.size).toBe(0);
  });

  it("non-string input returns empty Set", () => {
    expect(parseIndexLinks(null).size).toBe(0);
    expect(parseIndexLinks(42).size).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// findStalePathRefs
// ──────────────────────────────────────────────────────────────────────

describe("findStalePathRefs", () => {
  it("flags absolute paths that don't resolve via injected checkExists", () => {
    const present = new Set(["H:/prism/exists.ts"]);
    const checkExists = (p) => present.has(p);
    const body = "see H:/prism/exists.ts and H:/prism/gone.ts and C:/Users/wompu/missing.md";
    const stale = findStalePathRefs(body, { checkExists });
    expect(stale.sort()).toEqual(["C:/Users/wompu/missing.md", "H:/prism/gone.ts"]);
  });

  it("ignores URL-like strings (https://)", () => {
    const checkExists = () => false;
    const stale = findStalePathRefs("https://example.com/foo.md", { checkExists });
    expect(stale).toEqual([]);
  });

  it("returns [] for non-string content", () => {
    expect(findStalePathRefs(null, { checkExists: () => false })).toEqual([]);
  });

  it("strips trailing punctuation from candidate paths", () => {
    const seen = [];
    const checkExists = (p) => { seen.push(p); return false; };
    findStalePathRefs("see H:/prism/foo.ts. Also H:/prism/bar.ts,", { checkExists });
    expect(seen).toContain("H:/prism/foo.ts");
    expect(seen).toContain("H:/prism/bar.ts");
  });
});

// ──────────────────────────────────────────────────────────────────────
// loadChatSlots / activeSlotCount
// ──────────────────────────────────────────────────────────────────────

describe("loadChatSlots / activeSlotCount", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("loadChatSlots returns ok:true with .slots on a valid file", () => {
    writeSlots(root, { alpha: { lastHeartbeat: "t" }, bravo: null });
    const out = loadChatSlots(join(root, "state/shared/chat-slots.json"));
    expect(out.ok).toBe(true);
    expect(Object.keys(out.slots).sort()).toEqual(["alpha", "bravo"]);
  });

  it("loadChatSlots returns ok:false on missing / malformed", () => {
    expect(loadChatSlots(join(root, "no.json")).ok).toBe(false);
    writeFileSync(join(root, "state/shared/chat-slots.json"), "{not", "utf8");
    expect(loadChatSlots(join(root, "state/shared/chat-slots.json")).ok).toBe(false);
  });

  it("activeSlotCount counts slots whose lastHeartbeat is within window", () => {
    const now = Date.parse("2026-05-13T22:30:00Z");
    const slots = {
      alpha: { lastHeartbeat: "2026-05-13T22:25:00Z" }, // 5 min ago — active
      bravo: { lastHeartbeat: "2026-05-13T22:00:00Z" }, // 30 min ago — stale
      charlie: { lastHeartbeat: "2026-05-13T22:29:00Z" }, // 1 min ago — active
      delta: null,
      echo: { lastHeartbeat: "garbage" },
    };
    expect(activeSlotCount(slots, now)).toBe(2);
  });

  it("activeSlotCount handles missing/non-object input", () => {
    expect(activeSlotCount(null, Date.now())).toBe(0);
    expect(activeSlotCount({}, Date.now())).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// scanMemoryGarden — full integration
// ──────────────────────────────────────────────────────────────────────

describe("scanMemoryGarden (integration)", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("happy: clean memory garden → recommend:false, deferred:false, reason:no_debt", async () => {
    writeMemoryFile(root, "MEMORY.md", "# index\n- [A](feedback_a.md)\n- [B](reference_b.md)");
    writeMemoryFile(root, "feedback_a.md", "body a");
    writeMemoryFile(root, "reference_b.md", "body b");
    writeSlots(root, {});
    const r = await scanMemoryGarden({ repo: root, memoryDir: "memory", frozenTime: "t", nowMs: Date.parse("2026-05-13T22:30:00Z") });
    expect(r.ok).toBe(true);
    expect(r.counts.memory_files).toBe(3);
    expect(r.counts.indexed_in_memory_md).toBe(2);
    expect(r.counts.unreferenced).toBe(0);
    expect(r.counts.dangling_pointers).toBe(0);
    expect(r.prune_verdict).toEqual({ recommended: false, deferred: false, reason: "no_debt — memory garden is clean" });
  });

  it("flags unreferenced files (orphan) NOT in MEMORY.md", async () => {
    writeMemoryFile(root, "MEMORY.md", "- [A](feedback_a.md)");
    writeMemoryFile(root, "feedback_a.md", "body");
    writeMemoryFile(root, "feedback_orphan.md", "this isn't indexed anywhere");
    writeMemoryFile(root, "reference_orphan2.md", "also not indexed");
    writeSlots(root, {});
    const r = await scanMemoryGarden({ repo: root, memoryDir: "memory", frozenTime: "t", nowMs: 0 });
    expect(r.counts.unreferenced).toBe(2);
    expect(r.unreferenced.map((u) => u.name).sort()).toEqual(["feedback_orphan.md", "reference_orphan2.md"]);
  });

  it("flags dangling pointers in MEMORY.md whose target file is missing", async () => {
    writeMemoryFile(root, "MEMORY.md", "- [A](feedback_a.md)\n- [Gone](feedback_deleted.md)\n- [Also](feedback_alsogone.md)");
    writeMemoryFile(root, "feedback_a.md", "body");
    writeSlots(root, {});
    const r = await scanMemoryGarden({ repo: root, memoryDir: "memory", frozenTime: "t", nowMs: 0 });
    expect(r.counts.dangling_pointers).toBe(2);
    expect(r.dangling_pointers).toEqual(["feedback_alsogone.md", "feedback_deleted.md"]);
  });

  it("flags stale path refs inside memory bodies", async () => {
    writeMemoryFile(root, "MEMORY.md", "- [A](feedback_a.md)");
    writeMemoryFile(root, "feedback_a.md", "see H:/prism/missing-script.ts and C:/users/missing/file.md");
    writeSlots(root, {});
    const present = new Set();
    const r = await scanMemoryGarden({
      repo: root, memoryDir: "memory", frozenTime: "t", nowMs: 0,
      checkExists: (p) => present.has(p),
    });
    expect(r.counts.files_with_stale_path_refs).toBe(1);
    expect(r.counts.total_stale_path_refs).toBe(2);
    expect(r.files_with_stale_path_refs[0].name).toBe("feedback_a.md");
  });

  it("DEFERS prune verdict when any chat slot is active", async () => {
    writeMemoryFile(root, "MEMORY.md", "");  // empty index — everything is unref
    writeMemoryFile(root, "feedback_orphan.md", "x");
    writeSlots(root, { alpha: { lastHeartbeat: "2026-05-13T22:29:00Z" } });
    const r = await scanMemoryGarden({
      repo: root, memoryDir: "memory", frozenTime: "t",
      nowMs: Date.parse("2026-05-13T22:30:00Z"),
    });
    expect(r.counts.unreferenced).toBe(1);
    expect(r.counts.active_chats).toBe(1);
    expect(r.prune_verdict.deferred).toBe(true);
    expect(r.prune_verdict.recommended).toBe(false);
  });

  it("RECOMMENDS prune when debt > 0 AND no active chats", async () => {
    writeMemoryFile(root, "MEMORY.md", "");
    writeMemoryFile(root, "feedback_orphan.md", "x");
    writeSlots(root, {});
    const r = await scanMemoryGarden({ repo: root, memoryDir: "memory", frozenTime: "t", nowMs: 0 });
    expect(r.prune_verdict.recommended).toBe(true);
    expect(r.prune_verdict.reason).toMatch(/safe to \/memory-prune/);
  });

  it("failure: missing memory dir → ok:false with empty shape preserved", async () => {
    writeSlots(root, {});
    const r = await scanMemoryGarden({ repo: root, memoryDir: "no-such-dir", frozenTime: "t", nowMs: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^memory:/);
    expect(r.schemaVersion).toBe(1);
    expect(r.counts.memory_files).toBe(0);
    expect(r.unreferenced).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Adversarial + spanning
// ──────────────────────────────────────────────────────────────────────

describe("adversarial + spanning", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("adversarial: missing MEMORY.md → all .md files counted as unreferenced", async () => {
    writeMemoryFile(root, "feedback_a.md", "x");
    writeMemoryFile(root, "feedback_b.md", "y");
    writeSlots(root, {});
    const r = await scanMemoryGarden({ repo: root, memoryDir: "memory", frozenTime: "t", nowMs: 0 });
    expect(r.counts.indexed_in_memory_md).toBe(0);
    expect(r.counts.unreferenced).toBe(2);
  });

  it("adversarial: empty memory dir → 0 files, no_debt verdict", async () => {
    writeSlots(root, {});
    const r = await scanMemoryGarden({ repo: root, memoryDir: "memory", frozenTime: "t", nowMs: 0 });
    expect(r.ok).toBe(true);
    expect(r.counts.memory_files).toBe(0);
    expect(r.prune_verdict.reason).toMatch(/no_debt/);
  });

  it("spanning: 50 memory files, 25 indexed — exactly 25 unreferenced", async () => {
    const indexLines = ["# index"];
    for (let i = 0; i < 25; i++) {
      indexLines.push(`- [F${i}](feedback_${i}.md)`);
      writeMemoryFile(root, `feedback_${i}.md`, "x");
    }
    writeMemoryFile(root, "MEMORY.md", indexLines.join("\n"));
    for (let i = 0; i < 25; i++) writeMemoryFile(root, `feedback_orphan_${i}.md`, "y");
    writeSlots(root, {});
    const r = await scanMemoryGarden({ repo: root, memoryDir: "memory", frozenTime: "t", nowMs: 0 });
    expect(r.counts.memory_files).toBe(51); // 50 + MEMORY.md
    expect(r.counts.indexed_in_memory_md).toBe(25);
    expect(r.counts.unreferenced).toBe(25);
  });

  it("spanning: chat-slots file missing → active_chats=0 (treated as quiet, not blocking)", async () => {
    writeMemoryFile(root, "MEMORY.md", "");
    writeMemoryFile(root, "feedback_orphan.md", "x");
    // do NOT write slots file
    const r = await scanMemoryGarden({ repo: root, memoryDir: "memory", frozenTime: "t", nowMs: 0 });
    expect(r.counts.active_chats).toBe(0);
    expect(r.prune_verdict.recommended).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown + writeAtomic + runCli
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("renders headline + verdict + sample tables", () => {
    const md = renderMarkdown({
      ok: true,
      generated_at: "t",
      memory_dir: "/m",
      slots_file: "/s",
      counts: { memory_files: 5, indexed_in_memory_md: 3, unreferenced: 1, dangling_pointers: 1, files_with_stale_path_refs: 1, total_stale_path_refs: 2, active_chats: 0 },
      unreferenced: [{ name: "x.md", bytes: 100, mtime: "t1" }],
      dangling_pointers: ["gone.md"],
      files_with_stale_path_refs: [{ name: "y.md", stale_path_count: 2, sample: ["H:/a", "C:/b"] }],
      prune_verdict: { recommended: true, deferred: false, reason: "ok" },
    });
    expect(md).toContain("# Memory Garden Report");
    expect(md).toContain("RECOMMENDED");
    expect(md).toContain("`x.md`");
    expect(md).toContain("`gone.md`");
    expect(md).toContain("`y.md`");
  });

  it("renders error banner on ok:false", () => {
    const md = renderMarkdown({ ok: false, reason: "memory: not found", generated_at: "t" });
    expect(md).toContain("**ERROR:** memory: not found");
  });
});

describe("writeAtomic + runCli round-trip", () => {
  let root;
  let stdoutBuf;
  let origStdout;

  beforeEach(() => {
    root = makeRepo();
    stdoutBuf = [];
    origStdout = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { stdoutBuf.push(String(s)); return true; };
  });

  afterEach(() => {
    process.stdout.write = origStdout;
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it("writeAtomic creates parent + 100 rapid writes never collide", () => {
    const target = join(root, "state/shared/HOT.md");
    for (let i = 0; i < 100; i++) writeAtomic(target, `iter-${i}`);
    expect(readFileSync(target, "utf8")).toBe("iter-99");
    const residue = readdirSync(join(root, "state/shared")).filter((nm) => nm.includes(".tmp-"));
    expect(residue).toEqual([]);
  });

  it("--json mode emits to stdout, writes ZERO MEMORY_GARDEN_REPORT files", async () => {
    writeMemoryFile(root, "MEMORY.md", "");
    writeMemoryFile(root, "feedback_a.md", "x");
    writeFileSync(join(root, "state/shared/chat-slots.json"), JSON.stringify({ slots: {} }), "utf8");
    const r = await runCli(["node", "x.mjs", "--json", "--frozen-time", "t"], { repo: root, memoryDir: "memory", nowMs: 0 });
    expect(r.ok).toBe(true);
    expect(JSON.parse(stdoutBuf.join("").trim()).ok).toBe(true);
    const reportFiles = readdirSync(join(root, "state/shared")).filter((nm) => nm.startsWith("MEMORY_GARDEN_REPORT"));
    expect(reportFiles).toEqual([]);
  });

  it("default mode writes both report files atomically + summary", async () => {
    writeMemoryFile(root, "MEMORY.md", "- [A](feedback_a.md)");
    writeMemoryFile(root, "feedback_a.md", "x");
    writeFileSync(join(root, "state/shared/chat-slots.json"), JSON.stringify({ slots: {} }), "utf8");
    await runCli(["node", "x.mjs", "--frozen-time", "t"], { repo: root, memoryDir: "memory", nowMs: 0 });
    expect(existsSync(join(root, "state/shared/MEMORY_GARDEN_REPORT.json"))).toBe(true);
    expect(existsSync(join(root, "state/shared/MEMORY_GARDEN_REPORT.md"))).toBe(true);
    expect(stdoutBuf.join("")).toMatch(/memory-garden-scan: files=2/);
  });

  it("idempotency: same input twice → byte-identical markdown", async () => {
    writeMemoryFile(root, "MEMORY.md", "- [A](feedback_a.md)");
    writeMemoryFile(root, "feedback_a.md", "x");
    writeFileSync(join(root, "state/shared/chat-slots.json"), JSON.stringify({ slots: {} }), "utf8");
    await runCli(["node", "x.mjs", "--frozen-time", "frozen-t"], { repo: root, memoryDir: "memory", nowMs: 0 });
    const md1 = readFileSync(join(root, "state/shared/MEMORY_GARDEN_REPORT.md"), "utf8");
    await runCli(["node", "x.mjs", "--frozen-time", "frozen-t"], { repo: root, memoryDir: "memory", nowMs: 0 });
    const md2 = readFileSync(join(root, "state/shared/MEMORY_GARDEN_REPORT.md"), "utf8");
    expect(md1).toBe(md2);
  });
});
