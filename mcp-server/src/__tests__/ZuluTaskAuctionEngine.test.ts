/** ZebraTaskAuctionEngine tests — HZP06. */
import { describe, it, expect } from "vitest";
import {
  ZebraTaskAuctionEngine,
  type AuctionRequest,
  type Bidder,
} from "../engines/ZebraTaskAuctionEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const SOUL = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "bravo",
  role: "mill-specialist",
  voice: "v",
  tone: "t",
  refuse_list: [],
  preferred_subagent_type: "physics-reviewer",
  domain_filter: "mill|kienzle",
  hermes_role: "specialist-mill",
  body: "",
  ...over,
});

const bidder = (slot: string, over: Partial<Bidder> = {}): Bidder => ({
  slot,
  queue_depth: 0,
  success_rate: 0.5,
  success_sample_size: 0,
  ...over,
});

const req = (over: Partial<AuctionRequest> = {}): AuctionRequest => ({
  task_id: "t1",
  task_text: "compute kienzle force",
  bidders: [bidder("bravo")],
  ...over,
});

describe("ZebraTaskAuctionEngine.auction — happy", () => {
  it("single domain-matched bidder wins", () => {
    const r = ZebraTaskAuctionEngine.auction(req(), { bravo: SOUL() });
    expect(r.winner_slot).toBe("bravo");
    expect(r.bids[0].vetoed).toBe(false);
  });

  it("domain match boosts bid score by 4.0", () => {
    const r = ZebraTaskAuctionEngine.auction(req(), { bravo: SOUL() });
    expect(r.bids[0].components.domain_match).toBe(4.0);
  });

  it("queue depth penalty applied (log10-scaled)", () => {
    const r = ZebraTaskAuctionEngine.auction(req({ bidders: [bidder("bravo", { queue_depth: 99 })] }), { bravo: SOUL() });
    expect(r.bids[0].components.queue_penalty).toBeLessThan(0);
  });

  it("success_prior only applied when sample_size ≥ 3", () => {
    const r1 = ZebraTaskAuctionEngine.auction(req({ bidders: [bidder("bravo", { success_rate: 0.9, success_sample_size: 2 })] }), { bravo: SOUL() });
    const r2 = ZebraTaskAuctionEngine.auction(req({ bidders: [bidder("bravo", { success_rate: 0.9, success_sample_size: 5 })] }), { bravo: SOUL() });
    expect(r1.bids[0].components.success_prior).toBe(0);
    expect(r2.bids[0].components.success_prior).toBeGreaterThan(0);
  });
});

describe("ZebraTaskAuctionEngine.auction — refuse + veto + multi-bid", () => {
  it("refuse_list hit on task_text → veto", () => {
    const r = ZebraTaskAuctionEngine.auction(
      req({ task_text: "we need stub-engine-creation here" }),
      { bravo: SOUL({ refuse_list: ["stub-engine-creation"] }) },
    );
    expect(r.bids[0].vetoed).toBe(true);
    expect(r.bids[0].veto_reason).toContain("stub-engine-creation");
    expect(r.winner_slot).toBeNull();
  });

  it("two bidders — higher bid wins, deterministic tie-break by slot name", () => {
    const r = ZebraTaskAuctionEngine.auction(
      req({ bidders: [bidder("zulu"), bidder("alpha")] }),
      { zulu: SOUL({ slot: "zulu" }), alpha: SOUL({ slot: "alpha" }) },
    );
    // Equal bid → alpha wins by tie-break (alphabetical).
    expect(r.winner_slot).toBe("alpha");
  });

  it("unresolved soul → veto + listed in unresolved_slots", () => {
    const r = ZebraTaskAuctionEngine.auction(
      req({ bidders: [bidder("bravo"), bidder("delta")] }),
      { bravo: SOUL() },
    );
    expect(r.unresolved_slots).toEqual(["delta"]);
    expect(r.winner_slot).toBe("bravo");
  });

  it("all bidders vetoed → no winner + reason 'all bidders vetoed'", () => {
    const r = ZebraTaskAuctionEngine.auction(
      req({ task_text: "use stub-engine-creation pattern" }),
      { bravo: SOUL({ refuse_list: ["stub-engine-creation"] }) },
    );
    expect(r.winner_slot).toBeNull();
    expect(r.winner_reason).toContain("all bidders vetoed");
  });
});

describe("ZebraTaskAuctionEngine — validation + render", () => {
  it("duplicate bidder slot throws", () => {
    expect(() =>
      ZebraTaskAuctionEngine.auction(req({ bidders: [bidder("bravo"), bidder("bravo")] }), { bravo: SOUL() }),
    ).toThrow();
  });

  it("empty bidders → zod throws", () => {
    expect(() => ZebraTaskAuctionEngine.auction(req({ bidders: [] }), {})).toThrow();
  });

  it("missing souls map throws", () => {
    expect(() => ZebraTaskAuctionEngine.auction(req(), null as never)).toThrow();
  });

  it("bad regex in domain_filter → no veto, no boost (fail-soft)", () => {
    const r = ZebraTaskAuctionEngine.auction(req(), { bravo: SOUL({ domain_filter: "[unclosed" }) });
    expect(r.bids[0].components.domain_match).toBe(0);
    expect(r.bids[0].vetoed).toBe(false);
  });

  it("domain-mismatch bidder bids 0 → no winner with positive bid", () => {
    const r = ZebraTaskAuctionEngine.auction(
      req({ task_text: "lathe turning" }),
      { bravo: SOUL() },
    );
    expect(r.winner_slot).toBeNull();
    expect(r.winner_reason).toContain("no positive-bid winner");
  });

  it("renderResult shows tag + winner", () => {
    const md = ZebraTaskAuctionEngine.renderResult(ZebraTaskAuctionEngine.auction(req(), { bravo: SOUL() }));
    expect(md.includes("[AUCTION WON]")).toBe(true);
    expect(md.includes("winner=bravo")).toBe(true);
  });
});
