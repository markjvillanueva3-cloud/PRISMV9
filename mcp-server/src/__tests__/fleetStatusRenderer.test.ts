/**
 * fleetStatusRenderer.test.ts — tests for scripts/fleet-status.mjs (U-CLEANUP-A2)
 *
 * The renderer was extended for the 7-slot fleet topology (alpha..foxtrot work
 * + golf hygiene per CLEANUP-MS0). These tests pin the visual contract:
 *   - role taxonomy (golf = hygiene; everything else = work, including unknown
 *     slot names which default-fall-through)
 *   - compact-mode work/hygiene separator " | "
 *   - boxed-mode role-transition divider "─── hygiene slot (CLEANUP-MS0) ───"
 *     fires exactly once on the first work→hygiene crossing
 *   - per-role summary breakdown reconciles with the aggregate
 *   - width invariant (every boxed line is exactly 80 chars: 2 │ + 78 inner)
 *
 * Coverage floor (per comprehensive-build-enforce):
 *   - Happy path: realistic 7-slot snapshot
 *   - Failure 1: empty slots[]
 *   - Failure 2: hygiene-only snapshot (no divider should fire)
 *   - Failure 3: unknown slot name falls through to "work"
 *   - Adversarial 1: very long topic (>50 chars) → truncated cleanly
 *   - Adversarial 2: null state fields → "slot free" / "hygiene slot free"
 *   - Variability: 3 spanning status profiles (all-idle, mixed, all-crashed)
 */

import { describe, it, expect } from "vitest";

// @ts-expect-error: .mjs ESM import from .ts test file
import {
  renderBoxed,
  renderCompact,
  summaryByRole,
  roleOf,
  SLOT_ROLES,
} from "../../../scripts/fleet-status.mjs";

type Role = "work" | "hygiene";
type Status = "alive" | "stale" | "crashed" | "idle";

interface SlotFixture {
  slot: string;
  status: Status;
  ageMs: number | null;
  state: {
    chatId?: string;
    branch?: string;
    topic?: string;
    activity?: string;
  } | null;
}

interface Snapshot {
  ok: boolean;
  slots: SlotFixture[];
  summary: Record<Status, number>;
  lastUpdated: string;
}

function makeSlot(
  slot: string,
  status: Status,
  overrides: Partial<SlotFixture> = {}
): SlotFixture {
  if (status === "idle") {
    return { slot, status, ageMs: null, state: null, ...overrides };
  }
  return {
    slot,
    status,
    ageMs: 60_000,
    state: {
      chatId: `claude-${slot}-id`,
      branch: "cad-fusion-live-ms0",
      topic: `topic-${slot}`,
      activity: `activity-${slot}`,
    },
    ...overrides,
  };
}

function aggregate(slots: SlotFixture[]): Record<Status, number> {
  const acc: Record<Status, number> = { alive: 0, stale: 0, crashed: 0, idle: 0 };
  for (const s of slots) acc[s.status] = (acc[s.status] ?? 0) + 1;
  return acc;
}

function makeSnapshot(slots: SlotFixture[]): Snapshot {
  return {
    ok: true,
    slots,
    summary: aggregate(slots),
    lastUpdated: "2026-05-13T18:00:00.000Z",
  };
}

const WORK_SLOTS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];

// ─── roleOf / SLOT_ROLES ────────────────────────────────────────────────
describe("U-CLEANUP-A2 roleOf / SLOT_ROLES", () => {
  it("classifies the six work slots as role=work", () => {
    for (const s of WORK_SLOTS) {
      expect((roleOf as (s: string) => Role)(s)).toBe("work");
    }
  });

  it("classifies golf as role=hygiene", () => {
    expect((roleOf as (s: string) => Role)("golf")).toBe("hygiene");
  });

  it("SLOT_ROLES table mirrors chat-slots.mjs SLOT_NAMES ordering invariant", () => {
    // Work-first then hygiene — the renderer's divider math depends on this.
    const names = Object.keys(SLOT_ROLES as Record<string, Role>);
    expect(names).toEqual([
      "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
    ]);
    const roles = names.map(n => (SLOT_ROLES as Record<string, Role>)[n]);
    const firstHygiene = roles.indexOf("hygiene");
    const lastWork = roles.lastIndexOf("work");
    expect(lastWork).toBeLessThan(firstHygiene);
  });

  it("falls through to 'work' for unknown slot names (failure mode 3)", () => {
    expect((roleOf as (s: string) => Role)("unknown-slot")).toBe("work");
    expect((roleOf as (s: string) => Role)("")).toBe("work");
  });
});

// ─── summaryByRole ──────────────────────────────────────────────────────
describe("U-CLEANUP-A2 summaryByRole", () => {
  it("tallies work + hygiene independently and totals reconcile with the aggregate", () => {
    const snap = makeSnapshot([
      makeSlot("alpha", "alive"),
      makeSlot("bravo", "stale"),
      makeSlot("charlie", "stale"),
      makeSlot("delta", "crashed"),
      makeSlot("echo", "idle"),
      makeSlot("foxtrot", "idle"),
      makeSlot("golf", "alive"),
    ]);
    const by = (summaryByRole as (s: Snapshot) => Record<Role, Record<Status, number>>)(snap);
    expect(by.work).toEqual({ alive: 1, stale: 2, crashed: 1, idle: 2 });
    expect(by.hygiene).toEqual({ alive: 1, stale: 0, crashed: 0, idle: 0 });
    // Reconciliation invariant: work + hygiene per-status === summary per-status.
    for (const k of Object.keys(snap.summary) as Status[]) {
      expect(by.work[k] + by.hygiene[k]).toBe(snap.summary[k]);
    }
  });

  it("derives status keys from snapshot.summary (variability — drift-safe)", () => {
    const snap: Snapshot = {
      ok: true,
      slots: [makeSlot("alpha", "alive")],
      // Pretend classifySlot grows a "reclaiming" status — initializer must include it.
      summary: { alive: 1, stale: 0, crashed: 0, idle: 0, reclaiming: 0 } as Snapshot["summary"],
      lastUpdated: "2026-05-13T18:00:00.000Z",
    };
    const by = (summaryByRole as (s: Snapshot) => Record<Role, Record<string, number>>)(snap);
    expect(Object.keys(by.work)).toContain("reclaiming");
    expect(by.work.reclaiming).toBe(0);
  });

  it("handles empty slots[] cleanly (failure mode 1)", () => {
    const snap = makeSnapshot([]);
    const by = (summaryByRole as (s: Snapshot) => Record<Role, Record<Status, number>>)(snap);
    expect(by.work).toEqual({ alive: 0, stale: 0, crashed: 0, idle: 0 });
    expect(by.hygiene).toEqual({ alive: 0, stale: 0, crashed: 0, idle: 0 });
  });

  it("tallies unknown slot names under 'work' (failure mode 3)", () => {
    const snap = makeSnapshot([
      makeSlot("ghostslot", "alive"),
      makeSlot("golf", "alive"),
    ]);
    const by = (summaryByRole as (s: Snapshot) => Record<Role, Record<Status, number>>)(snap);
    expect(by.work.alive).toBe(1);
    expect(by.hygiene.alive).toBe(1);
  });
});

// ─── renderCompact ──────────────────────────────────────────────────────
describe("U-CLEANUP-A2 renderCompact", () => {
  it("separates work pool from hygiene with ' | ' when both present (happy path)", () => {
    const snap = makeSnapshot([
      makeSlot("alpha", "alive"),
      makeSlot("bravo", "alive"),
      makeSlot("charlie", "idle"),
      makeSlot("delta", "idle"),
      makeSlot("echo", "idle"),
      makeSlot("foxtrot", "idle"),
      makeSlot("golf", "idle"),
    ]);
    const out = (renderCompact as (s: Snapshot) => string)(snap);
    expect(out.startsWith("PRISM ")).toBe(true);
    expect(out).toContain("alpha✓");
    expect(out).toContain(" | golf·");
    // Separator must appear exactly once.
    expect(out.split(" | ").length - 1).toBe(1);
  });

  it("omits the ' | ' tail when no hygiene slot is present (failure mode 2)", () => {
    const snap = makeSnapshot([makeSlot("alpha", "alive"), makeSlot("bravo", "alive")]);
    const out = (renderCompact as (s: Snapshot) => string)(snap);
    expect(out.includes(" | ")).toBe(false);
    expect(out).toContain("alpha✓");
    expect(out).toContain("bravo✓");
  });

  it("renders cleanly with empty slots[] (failure mode 1)", () => {
    const snap = makeSnapshot([]);
    const out = (renderCompact as (s: Snapshot) => string)(snap);
    expect(out.startsWith("PRISM ")).toBe(true);
    expect(out.includes(" | ")).toBe(false);
  });

  it("renders hygiene-only snapshot without leading work parts (adversarial)", () => {
    const snap = makeSnapshot([makeSlot("golf", "alive")]);
    const out = (renderCompact as (s: Snapshot) => string)(snap);
    // No work parts → leading separator is just two spaces before " | golf✓".
    expect(out).toMatch(/PRISM\s+🟢\s+\|\s+golf✓/);
  });
});

// ─── renderBoxed ────────────────────────────────────────────────────────
describe("U-CLEANUP-A2 renderBoxed", () => {
  const fullFleet = (): Snapshot =>
    makeSnapshot([
      makeSlot("alpha", "alive"),
      makeSlot("bravo", "stale"),
      makeSlot("charlie", "crashed"),
      makeSlot("delta", "idle"),
      makeSlot("echo", "idle"),
      makeSlot("foxtrot", "idle"),
      makeSlot("golf", "idle"),
    ]);

  it("emits the hygiene-slot divider exactly once (happy path)", () => {
    const out = (renderBoxed as (s: Snapshot, r: unknown) => string)(fullFleet(), null);
    const matches = out.match(/hygiene slot \([A-Z]+-MS\d+\)/g) ?? [];
    expect(matches.length).toBe(1);
    // Divider must appear between foxtrot and golf rows.
    const foxIdx = out.indexOf("FOXTROT");
    const divIdx = out.indexOf("hygiene slot (CLEANUP-MS0)");
    const golfIdx = out.indexOf("GOLF");
    expect(foxIdx).toBeLessThan(divIdx);
    expect(divIdx).toBeLessThan(golfIdx);
  });

  it("includes the three-line Total/Work/Hygiene summary breakdown", () => {
    const out = (renderBoxed as (s: Snapshot, r: unknown) => string)(fullFleet(), null);
    expect(out).toMatch(/Total\s+Active:1\s+Stale:1\s+Crashed:1\s+Free:4/);
    expect(out).toMatch(/Work\s+Active:1\s+Stale:1\s+Crashed:1\s+Free:3/);
    expect(out).toMatch(/Hygiene\s+Active:0\s+Stale:0\s+Crashed:0\s+Free:1/);
  });

  it("uses 'hygiene slot free' wording for idle golf, plain 'slot free' for work (adversarial 2)", () => {
    const snap = makeSnapshot([
      makeSlot("alpha", "idle"),
      makeSlot("golf", "idle"),
    ]);
    const out = (renderBoxed as (s: Snapshot, r: unknown) => string)(snap, null);
    expect(out).toMatch(/ALPHA[\s\S]*?slot free/);
    expect(out).toMatch(/GOLF[\s\S]*?hygiene slot free/);
  });

  it("does NOT emit a divider when no work→hygiene transition exists (failure mode 2)", () => {
    const golfOnly = makeSnapshot([makeSlot("golf", "alive")]);
    const out = (renderBoxed as (s: Snapshot, r: unknown) => string)(golfOnly, null);
    expect(out.includes("hygiene slot (CLEANUP-MS0)")).toBe(false);
  });

  it("preserves 80-char boxed width on every horizontal line (width invariant)", () => {
    // 78 inner + 2 │ = 80. Use a snapshot with a deliberately long topic to
    // exercise the truncation path. The `pad()` emoji compensation routes
    // glyphs through "x x" so the visible width matches the byte count for
    // this assertion (we strip the emoji width before measuring).
    const snap = makeSnapshot([
      makeSlot("alpha", "alive", {
        state: {
          chatId: "claude-alpha-id",
          branch: "cad-fusion-live-ms0",
          topic: "this-is-an-intentionally-very-long-topic-that-should-be-truncated-aggressively",
          activity: "stress-test",
        },
      }),
      makeSlot("golf", "idle"),
    ]);
    const out = (renderBoxed as (s: Snapshot, r: unknown) => string)(snap, null);
    const lines = out.split("\n");
    // Box border lines (top/bottom + dividers) must be exactly 80 chars.
    const borderLines = lines.filter(l => /^[┌├└]/.test(l) || /^│─/.test(l));
    expect(borderLines.length).toBeGreaterThan(0);
    for (const l of borderLines) {
      expect(l.length).toBe(80);
    }
  });

  it("truncates topic strings >50 chars (adversarial 1)", () => {
    const snap = makeSnapshot([
      makeSlot("alpha", "alive", {
        state: {
          chatId: "claude-alpha-id",
          branch: "main",
          topic: "x".repeat(120),
          activity: "x",
        },
      }),
    ]);
    const out = (renderBoxed as (s: Snapshot, r: unknown) => string)(snap, null);
    expect(out).toMatch(/topic: x+…/);
    expect(out).not.toContain("x".repeat(60));
  });

  it("renders empty slots[] cleanly without throwing (failure mode 1)", () => {
    const snap = makeSnapshot([]);
    expect(() => (renderBoxed as (s: Snapshot, r: unknown) => string)(snap, null)).not.toThrow();
    const out = (renderBoxed as (s: Snapshot, r: unknown) => string)(snap, null);
    expect(out).toContain("PRISM FLEET STATUS");
    expect(out).toContain("Total");
    expect(out).toContain("Work");
    expect(out).toContain("Hygiene");
  });

  it("surfaces the 'Reclaimed crashed slots this pass:' line when reclaimed is non-null", () => {
    const snap = makeSnapshot([
      makeSlot("alpha", "alive"),
      makeSlot("bravo", "idle"),
      makeSlot("golf", "idle"),
    ]);
    const reclaimed = [{ slot: "charlie" }, { slot: "delta" }];
    const out = (renderBoxed as (s: Snapshot, r: unknown) => string)(snap, reclaimed);
    expect(out).toContain("Reclaimed crashed slots this pass: charlie, delta");
  });

  it("compensates emoji visible-width on every slot-content row (pad() drift guard)", () => {
    // pad() replaces each status glyph with "x x" (2 cells) before measuring,
    // so the visible width matches 80 even though the glyph is 1 codepoint.
    // Pin that every slot identifier row is 80 cells wide regardless of status.
    const snap = makeSnapshot([
      makeSlot("alpha", "alive"),
      makeSlot("bravo", "stale"),
      makeSlot("charlie", "crashed"),
      makeSlot("golf", "idle"),
    ]);
    const out = (renderBoxed as (s: Snapshot, r: unknown) => string)(snap, null);
    const slotRows = out
      .split("\n")
      .filter(l => /^│  [\u{1F7E2}\u{1F7E1}\u{1F534}\u{26AB}]/u.test(l));
    expect(slotRows.length).toBe(snap.slots.length);
    for (const row of slotRows) {
      const visible = row.replace(/[\u{1F7E2}\u{1F7E1}\u{1F534}\u{26AB}]/gu, "x x");
      expect(visible.length).toBe(80);
    }
  });
});

// ─── Variability — three spanning status profiles ──────────────────────
describe("U-CLEANUP-A2 status-profile variability", () => {
  const profiles: Array<{ name: string; build: () => Snapshot }> = [
    {
      name: "all-idle (cold fleet)",
      build: () => makeSnapshot([
        ...WORK_SLOTS.map(s => makeSlot(s, "idle")),
        makeSlot("golf", "idle"),
      ]),
    },
    {
      name: "mixed (alive + stale + crashed)",
      build: () => makeSnapshot([
        makeSlot("alpha", "alive"),
        makeSlot("bravo", "alive"),
        makeSlot("charlie", "stale"),
        makeSlot("delta", "stale"),
        makeSlot("echo", "crashed"),
        makeSlot("foxtrot", "idle"),
        makeSlot("golf", "alive"),
      ]),
    },
    {
      name: "all-crashed (total reset needed)",
      build: () => makeSnapshot([
        ...WORK_SLOTS.map(s => makeSlot(s, "crashed")),
        makeSlot("golf", "crashed"),
      ]),
    },
  ];

  for (const p of profiles) {
    it(`renders ${p.name} with stable invariants`, () => {
      const snap = p.build();
      const compact = (renderCompact as (s: Snapshot) => string)(snap);
      const boxed = (renderBoxed as (s: Snapshot, r: unknown) => string)(snap, null);
      const by = (summaryByRole as (s: Snapshot) => Record<Role, Record<Status, number>>)(snap);

      // Reconciliation: per-role tallies sum to aggregate.
      for (const k of Object.keys(snap.summary) as Status[]) {
        expect(by.work[k] + by.hygiene[k]).toBe(snap.summary[k]);
      }
      // Compact always has the " | golf" tail when golf is present.
      expect(compact).toContain(" | golf");
      // Boxed always emits exactly one divider when both roles are present.
      const matches = boxed.match(/hygiene slot \([A-Z]+-MS\d+\)/g) ?? [];
      expect(matches.length).toBe(1);
    });
  }
});
