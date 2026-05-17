/**
 * DashboardHtml.test.ts — OBSIDIAN-INTELLIGENCE-MS3 / C2 (U-HTML-DASHBOARD)
 *
 * Panel-presence + failure-mode + adversarial-input assertions for the
 * dashboard aggregator `scripts/generate-dashboard-html.mjs`.
 *
 * Coverage floor (per CLAUDE.md comprehensive-build):
 *   - happy path: each reader + panel renders with a populated tmp fixture
 *   - ≥3 failure modes: missing source file · malformed JSON · oversize source
 *   - ≥2 adversarial inputs: invalid ISO heartbeat · XSS-shaped prose
 *   - variability: drift-table present vs absent · scrutiny cleared vs partial
 *     · recall populated vs empty · 3 heartbeat freshness bands (ok/warn/fail)
 *
 * Hermetic: every read targets PRISM_REPO_ROOT (tmpdir); production state is
 * never touched. assembleDashboard() runs in-process; no spawn, no real dashboard.html.
 * Every assertion checks an exact expected value (no .toBeDefined() stubs).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const SCRIPT_PATH = path.resolve(__dirname, "../../../scripts/generate-dashboard-html.mjs");
const SCRIPT_URL = "file://" + SCRIPT_PATH.replace(/\\/g, "/");

type DashboardModule = {
  readJsonSafe: (p: string) => { data: unknown; error?: string };
  readTextSafe: (p: string, maxBytes?: number) => { data: string | null; error?: string };
  readSystemVizBriefing: (root: string) => { data: unknown; error?: string };
  readClaudeBrief: (root: string, maxLines?: number) => { data: string | null; error?: string };
  readBuildState: (root: string) => { data: unknown; error?: string };
  readScrutinyLedger: (root: string, topK?: number) => { data: unknown[] | null; error?: string };
  readWikiRecallTop: (root: string, topK?: number) => { data: Array<{ entry: string; count: number }> | null; error?: string };
  readChatSlots: (root: string) => { data: unknown[] | null; error?: string };
  readWorkboard: (root: string, maxLines?: number) => { data: string | null; error?: string };
  formatAgeMs: (ms: number) => string;
  heartbeatStatus: (iso: string | null | undefined, now?: number) => { age: string; status?: "ok" | "warn" | "fail" };
  panelSystemViz: (r: { data: unknown; error?: string }) => unknown[];
  panelClaudeBrief: (r: { data: string | null; error?: string }) => unknown[];
  panelBuildState: (r: { data: unknown; error?: string }) => unknown[];
  panelScrutinyLedger: (r: { data: unknown[] | null; error?: string }) => unknown[];
  panelRecallTop: (r: { data: unknown[] | null; error?: string }) => unknown[];
  panelChatBus: (r: { data: unknown[] | null; error?: string }, now?: number) => unknown[];
  panelWorkboard: (r: { data: string | null; error?: string }) => unknown[];
  assembleDashboard: (root: string, now?: number) => string;
};

let mod: DashboardModule;
let tmpRoot: string;
let prevRepoRoot: string | undefined;

beforeAll(async () => {
  mod = (await import(SCRIPT_URL)) as DashboardModule;
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-html-test-"));
  prevRepoRoot = process.env.PRISM_REPO_ROOT;
  process.env.PRISM_REPO_ROOT = tmpRoot;
});

afterAll(() => {
  if (prevRepoRoot === undefined) delete process.env.PRISM_REPO_ROOT;
  else process.env.PRISM_REPO_ROOT = prevRepoRoot;
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function writeFixture(relPath: string, content: string): string {
  const abs = path.join(tmpRoot, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  return abs;
}

function writeFullFixtureSet(): void {
  writeFixture(
    "state/shared/system-viz/EXECUTIVE-BRIEFING.json",
    JSON.stringify({ totalNodes: 372731, totalEdges: 591479, totalFiles: 13456, totalNamespaces: 14 }),
  );
  writeFixture(
    "state/shared/CLAUDE-BRIEF.md",
    "# PRISM Brief\n\n## Section A\n\nLine 1\nLine 2\n## Section B\nLine 3\n",
  );
  writeFixture(
    "state/shared/BUILD_STATE.json",
    JSON.stringify({
      headline: { enginesWired: 2421, enginesUnwired: 836, envelopeDrift: 11, frontendsPending: 2 },
      envelopeDrift: [
        { milestone: "MF-MS1", claimedStatus: "completed", derivedStatus: "not_started_real", note: "0/4 shipped" },
        { milestone: "ACP-MS0", claimedStatus: "completed", derivedStatus: "not_started_real", note: "0/5 shipped" },
      ],
    }),
  );
  writeFixture(
    "mcp-server/data/state/SCRUTINY_LEDGER.json",
    JSON.stringify({
      "sess-cleared": { sid: "sess-cleared", target: "abc1234", opusReviewed: true, claudeReviewed: true, codexReviewed: true, updatedAt: "2026-05-16T22:00:00Z" },
      "sess-partial": { sid: "sess-partial", target: "def5678", opusReviewed: true, claudeReviewed: false, codexReviewed: false, updatedAt: "2026-05-16T21:00:00Z" },
      "sess-empty": { sid: "sess-empty", target: "ghi9012", updatedAt: "2026-05-16T20:00:00Z" },
    }),
  );
  writeFixture(
    "mcp-server/data/state/wiki-recall-counts.json",
    JSON.stringify({ "checkin": 42, "system-viz": 38, "scrutiny-batch": 27, "dedup": 15 }),
  );
  writeFixture(
    "state/shared/chat-slots.json",
    JSON.stringify({
      slots: {
        charlie: { chatId: "claude-c0f06dee", branch: "cad-fusion-live-ms0", topic: "charlie-cost-cascade", activity: "ship", lastHeartbeat: new Date().toISOString() },
        bravo: { chatId: "claude-339c8ff7", branch: "slot/bravo", topic: "bravo-slash-cmd-fidelity", activity: "idle", lastHeartbeat: new Date(Date.now() - 7 * 60_000).toISOString() },
        delta: { chatId: "claude-deadbeef", branch: "slot/delta", topic: "delta-crashed", activity: "stale", lastHeartbeat: new Date(Date.now() - 60 * 60_000).toISOString() },
      },
    }),
  );
  writeFixture(
    "state/shared/AGENT_WORKBOARD.md",
    "# Workboard\n\n## Active\n- charlie: shipping U-MULTI-AGENT-COST-TELEMETRY\n- bravo: SLASH-CMD-FIDELITY-MS0\n",
  );
}

// --- pure helpers ---

describe("dashboard-html — pure helpers", () => {
  it("formatAgeMs returns expected scale-based labels", () => {
    expect(mod.formatAgeMs(0)).toBe("0s");
    expect(mod.formatAgeMs(30_000)).toBe("30s");
    expect(mod.formatAgeMs(90_000)).toBe("1m");
    expect(mod.formatAgeMs(3_600_000)).toBe("1h");
    expect(mod.formatAgeMs(48 * 3_600_000)).toBe("2d");
  });

  it("formatAgeMs returns em-dash sentinel for non-finite / negative ms", () => {
    expect(mod.formatAgeMs(NaN)).toBe("—");
    expect(mod.formatAgeMs(Infinity)).toBe("—");
    expect(mod.formatAgeMs(-1)).toBe("—");
  });

  it("heartbeatStatus returns ok/warn/fail across 5- and 10-minute boundaries", () => {
    const now = Date.parse("2026-05-16T22:00:00Z");
    const ok = mod.heartbeatStatus("2026-05-16T21:59:30Z", now);
    expect(ok.status).toBe("ok");
    expect(ok.age).toBe("30s");
    const warn = mod.heartbeatStatus("2026-05-16T21:54:00Z", now);
    expect(warn.status).toBe("warn");
    expect(warn.age).toBe("6m");
    const fail = mod.heartbeatStatus("2026-05-16T21:40:00Z", now);
    expect(fail.status).toBe("fail");
    expect(fail.age).toBe("20m");
  });

  it("heartbeatStatus returns em-dash age and no status for empty heartbeat", () => {
    const r1 = mod.heartbeatStatus(undefined);
    expect(r1.age).toBe("—");
    expect(r1.status).toBe(undefined);
    const r2 = mod.heartbeatStatus(null);
    expect(r2.age).toBe("—");
    expect(r2.status).toBe(undefined);
    const r3 = mod.heartbeatStatus("");
    expect(r3.age).toBe("—");
    expect(r3.status).toBe(undefined);
  });

  it("heartbeatStatus returns fail status on invalid ISO date (adversarial)", () => {
    const r = mod.heartbeatStatus("not-a-date");
    expect(r.status).toBe("fail");
    expect(r.age).toBe("—");
  });
});

// --- readers ---

describe("dashboard-html — readers fail-soft on missing/malformed", () => {
  it("readJsonSafe returns null data + non-empty error string on missing file", () => {
    const r = mod.readJsonSafe(path.join(tmpRoot, "__nope__.json"));
    expect(r.data).toBe(null);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("readJsonSafe returns null data + non-empty error string on malformed JSON", () => {
    const p = writeFixture("scratch/bad.json", "{not valid json,,,");
    const r = mod.readJsonSafe(p);
    expect(r.data).toBe(null);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("readTextSafe truncates oversize input to ≤ maxBytes + trailer marker", () => {
    const p = writeFixture("scratch/huge.txt", "x".repeat(200_000));
    const r = mod.readTextSafe(p, 1024);
    expect(typeof r.data).toBe("string");
    const out = r.data ?? "";
    expect(out.length).toBeLessThanOrEqual(1024 + "\n…[truncated]".length);
    expect(out.endsWith("[truncated]")).toBe(true);
  });

  it("readBuildState happy path returns parsed JSON with headline counts", () => {
    writeFullFixtureSet();
    const r = mod.readBuildState(tmpRoot);
    expect(r.error ?? null).toBe(null);
    const headline = (r.data as { headline: { enginesWired: number; enginesUnwired: number } }).headline;
    expect(headline.enginesWired).toBe(2421);
    expect(headline.enginesUnwired).toBe(836);
  });

  it("readScrutinyLedger sorts by updatedAt DESC and slices top-K", () => {
    writeFullFixtureSet();
    const r = mod.readScrutinyLedger(tmpRoot, 2);
    const list = (r.data ?? []) as { sid: string }[];
    expect(list.length).toBe(2);
    expect(list[0].sid).toBe("sess-cleared");
    expect(list[1].sid).toBe("sess-partial");
  });

  it("readWikiRecallTop sorts by count DESC and slices top-K", () => {
    writeFullFixtureSet();
    const r = mod.readWikiRecallTop(tmpRoot, 2);
    const list = r.data ?? [];
    expect(list.length).toBe(2);
    expect(list[0].entry).toBe("checkin");
    expect(list[0].count).toBe(42);
    expect(list[1].entry).toBe("system-viz");
    expect(list[1].count).toBe(38);
  });

  it("readChatSlots reads slot map and yields exactly the seeded slots", () => {
    writeFullFixtureSet();
    const r = mod.readChatSlots(tmpRoot);
    const list = (r.data ?? []) as { slot: string }[];
    expect(list.length).toBe(3);
    expect(list.map((s) => s.slot).sort()).toEqual(["bravo", "charlie", "delta"]);
  });
});

// --- panel renderers ---

describe("dashboard-html — panel renderers", () => {
  beforeAll(() => writeFullFixtureSet());

  it("panelSystemViz renders headline + prose link when briefing has counts", () => {
    const viz = mod.readSystemVizBriefing(tmpRoot);
    const sections = mod.panelSystemViz(viz);
    expect(sections.length).toBe(2);
    expect((sections[0] as { kind: string }).kind).toBe("headline");
    expect((sections[1] as { kind: string }).kind).toBe("prose");
    const cards = (sections[0] as { cards: Array<{ label: string; value: string }> }).cards;
    expect(cards.length).toBe(4);
    expect(cards[0].label).toBe("graph nodes");
    expect(cards[0].value).toBe("372731");
  });

  it("panelSystemViz degrades to fail card on missing briefing", () => {
    const sections = mod.panelSystemViz({ data: null, error: "missing" });
    const card = (sections[0] as { cards: Array<{ status: string; value: string }> }).cards[0];
    expect(card.status).toBe("fail");
    expect(card.value).toBe("unavailable");
  });

  it("panelBuildState emits headline + drift table when drift rows present (variability)", () => {
    const bs = mod.readBuildState(tmpRoot);
    const sections = mod.panelBuildState(bs);
    expect(sections.length).toBe(2);
    expect((sections[1] as { kind: string }).kind).toBe("table");
    const rows = (sections[1] as { rows: string[][] }).rows;
    expect(rows.length).toBe(2);
    expect(rows[0][0]).toBe("MF-MS1");
    expect(rows[1][0]).toBe("ACP-MS0");
  });

  it("panelBuildState omits drift table when no drift rows (variability)", () => {
    const sections = mod.panelBuildState({ data: { headline: { enginesWired: 100, enginesUnwired: 0, envelopeDrift: 0, frontendsPending: 0 } } });
    expect(sections.length).toBe(1);
    expect((sections[0] as { kind: string }).kind).toBe("headline");
  });

  it("panelScrutinyLedger classifies CLEARED vs OPEN per 3-arm consensus", () => {
    const led = mod.readScrutinyLedger(tmpRoot);
    const sections = mod.panelScrutinyLedger(led);
    const table = sections[0] as { rows: string[][] };
    const cleared = table.rows.find((r) => r[0] === "sess-cleared") ?? [];
    expect(cleared.length).toBeGreaterThan(0);
    expect(cleared[5]).toBe("CLEARED");
    const partial = table.rows.find((r) => r[0] === "sess-partial") ?? [];
    expect(partial.length).toBeGreaterThan(0);
    expect(partial[5]).toBe("OPEN");
  });

  it("panelRecallTop renders barchart with sorted entries (variability — populated)", () => {
    const recall = mod.readWikiRecallTop(tmpRoot);
    const sections = mod.panelRecallTop(recall);
    expect((sections[0] as { kind: string }).kind).toBe("barchart");
    const data = (sections[0] as { data: Array<{ label: string; value: number }> }).data;
    expect(data[0].label).toBe("checkin");
    expect(data[0].value).toBe(42);
  });

  it("panelRecallTop degrades to prose 'no recall counts' on empty data (variability — empty)", () => {
    const sections = mod.panelRecallTop({ data: [] });
    expect((sections[0] as { kind: string }).kind).toBe("prose");
    expect((sections[0] as { text: string }).text).toContain("no recall");
  });

  it("panelChatBus marks fresh slot ✓, stale slot ⚠, ancient slot ✗", () => {
    const cb = mod.readChatSlots(tmpRoot);
    const sections = mod.panelChatBus(cb, Date.now());
    const table = sections[0] as { rows: string[][] };
    const charlieRow = table.rows.find((r) => r[0] === "charlie") ?? [];
    const bravoRow = table.rows.find((r) => r[0] === "bravo") ?? [];
    const deltaRow = table.rows.find((r) => r[0] === "delta") ?? [];
    expect(charlieRow.length).toBeGreaterThan(0);
    expect(bravoRow.length).toBeGreaterThan(0);
    expect(deltaRow.length).toBeGreaterThan(0);
    expect(charlieRow[4]).toContain("✓");
    expect(bravoRow[4]).toContain("⚠");
    expect(deltaRow[4]).toContain("✗");
  });

  it("panelWorkboard escapes adversarial HTML in markdown lines (XSS guard)", () => {
    const xss = "<script>alert(1)</script>\n- <img onerror=evil>\nPlain line";
    const sections = mod.panelWorkboard({ data: xss });
    const html = (sections[0] as { trustedHtml: string }).trustedHtml;
    // The literal text 'onerror=evil' will appear inside the escaped
    // &lt;img onerror=evil&gt; — that IS correct XSS defense (browser sees
    // it as text, not an executable attribute). The MUST-be-absent forms
    // are the raw tags `<script>` and `<img ` that the browser would parse.
    expect(html.includes("<script>")).toBe(false);
    expect(html.includes("<img ")).toBe(false);
    expect(html.includes("&lt;script&gt;")).toBe(true);
  });

  it("panelClaudeBrief escapes adversarial HTML in markdown body (XSS guard)", () => {
    const xss = "## Header <img src=x onerror=alert(1)>\nbenign line\n";
    const sections = mod.panelClaudeBrief({ data: xss });
    const html = (sections[0] as { trustedHtml: string }).trustedHtml;
    // The literal substring 'onerror=alert(1)' will appear inside the
    // escaped &lt;img ...&gt; — that is correct XSS defense (browser sees
    // text, not an executable attribute). What MUST be absent is the raw
    // unescaped `<img ` form that the browser would parse as a tag.
    expect(html.includes("<img ")).toBe(false);
    expect(html.includes("&lt;img")).toBe(true);
  });

  // Arm-B follow-up: 3 table-rendering panels also flow user-controlled
  // (PRISM-internal-JSON-controlled) strings into HTML. Verify the renderer
  // escapes them — assemble through assembleDashboard so the full page is
  // covered, not just the panel function (the renderer lib may apply escape
  // at the table-cell layer, in which case the panel's raw String(…) is fine).

  it("assembleDashboard escapes adversarial milestone name in BUILD_STATE drift row", () => {
    writeFixture(
      "state/shared/BUILD_STATE.json",
      JSON.stringify({
        headline: { enginesWired: 1, enginesUnwired: 0, envelopeDrift: 1, frontendsPending: 0 },
        envelopeDrift: [{ milestone: "<script>alert(1)</script>", claimedStatus: "x", derivedStatus: "y", note: "n" }],
      }),
    );
    const html = mod.assembleDashboard(tmpRoot);
    expect(html.includes("<script>alert(1)</script>")).toBe(false);
    expect(html.includes("&lt;script&gt;")).toBe(true);
  });

  it("assembleDashboard escapes adversarial topic in chat-slots row", () => {
    writeFixture(
      "state/shared/chat-slots.json",
      JSON.stringify({
        slots: {
          alpha: {
            chatId: "claude-x",
            branch: "b",
            topic: "<img src=x onerror=alert(1)>",
            activity: "i",
            lastHeartbeat: new Date().toISOString(),
          },
        },
      }),
    );
    const html = mod.assembleDashboard(tmpRoot);
    expect(html.includes("<img src=x")).toBe(false);
    expect(html.includes("&lt;img")).toBe(true);
  });

  it("assembleDashboard escapes adversarial sid in scrutiny-ledger row", () => {
    writeFixture(
      "mcp-server/data/state/SCRUTINY_LEDGER.json",
      JSON.stringify({
        "evil-sid": {
          sid: "<script>x</script>",
          target: "<b>t</b>",
          opusReviewed: true,
          claudeReviewed: true,
          codexReviewed: true,
          updatedAt: "2026-05-16T22:00:00Z",
        },
      }),
    );
    const html = mod.assembleDashboard(tmpRoot);
    expect(html.includes("<script>x</script>")).toBe(false);
    expect(html.includes("&lt;script&gt;")).toBe(true);
  });
});

// --- assembleDashboard E2E ---

describe("dashboard-html — assembleDashboard E2E", () => {
  it("assembles a self-contained HTML5 doc with all 7 panels when full fixture present", () => {
    writeFullFixtureSet();
    const html = mod.assembleDashboard(tmpRoot);
    expect(/^<!doctype html>/i.test(html)).toBe(true);
    expect(html.includes("graph nodes")).toBe(true);
    expect(html.includes("engines wired")).toBe(true);
    expect(html.includes("charlie")).toBe(true);
    expect(html.includes("Section A")).toBe(true);
    expect(html.includes("checkin")).toBe(true);
    expect(html.includes("CLEARED")).toBe(true);
    expect(html.includes("shipping U-MULTI-AGENT-COST-TELEMETRY")).toBe(true);
    expect(/<link\s+rel=["']stylesheet["']\s+href=["']https?:/i.test(html)).toBe(false);
    expect(/<script[^>]+src=["']https?:/i.test(html)).toBe(false);
  });

  it("assembleDashboard degrades gracefully when every source surface is missing", () => {
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-empty-"));
    try {
      const html = mod.assembleDashboard(emptyRoot);
      expect(/^<!doctype html>/i.test(html)).toBe(true);
      expect(html.includes("unavailable")).toBe(true);
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it("assembleDashboard never throws on malformed JSON inputs (fail-soft contract)", () => {
    const badRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dashboard-bad-"));
    try {
      fs.mkdirSync(path.join(badRoot, "state/shared/system-viz"), { recursive: true });
      fs.writeFileSync(path.join(badRoot, "state/shared/system-viz/EXECUTIVE-BRIEFING.json"), "{{{not json", "utf8");
      fs.mkdirSync(path.join(badRoot, "mcp-server/data/state"), { recursive: true });
      fs.writeFileSync(path.join(badRoot, "mcp-server/data/state/SCRUTINY_LEDGER.json"), "[[[also bad", "utf8");
      const html = mod.assembleDashboard(badRoot);
      expect(/^<!doctype html>/i.test(html)).toBe(true);
      expect(html.includes("unavailable")).toBe(true);
    } finally {
      fs.rmSync(badRoot, { recursive: true, force: true });
    }
  });
});
