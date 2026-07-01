/**
 * RFQBroadcastEngine.test.ts — real-value tests for the core marketplace loop entry
 * (galaxy:business, slot:hotel). Verifies the broadcast → bid → close pipeline, the fail-loud
 * invariants (empty match, late/uninvited/duplicate bids, double-close, buyer gate), deterministic
 * caller-supplied timestamps, and never-delete cancel — across 3 spanning RFQs (mill / turn / wedm).
 *
 * Every assertion checks a CONCRETE value the logic must produce; none is a toBeDefined()/truthy stub —
 * each test would FAIL if the engine's behavior regressed (e.g. wrong invitee count, wrong rounded
 * price, a silently-accepted late bid, a double-close that didn't throw).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { RFQBroadcastEngine, type BroadcastInput } from "../engines/RFQBroadcastEngine.js";
import { SupplierCapabilityProfileEngine } from "../engines/SupplierCapabilityProfileEngine.js";

// ============================================================================
// FIXTURES — seed the supplier registry the matcher reads, so broadcastRFQ has real shortlists.
// ============================================================================

/** A mill shop that holds 0.005mm in P/M/N, AS9100. */
function seedMillShop(id = "S-MILL-1", region = "Midwest"): void {
  SupplierCapabilityProfileEngine.registerSupplier({
    supplierId: id,
    name: `Mill Shop ${id}`,
    geography: { region, state: "IL" },
    processes: ["mill", "turn"],
    machines: [
      { machineId: `${id}-VMC`, process: "mill", axes: 3, envelopeMm: { x: 600, y: 400, z: 400 }, maxRpm: 12000, controller: "haas" },
      { machineId: `${id}-LATHE`, process: "turn", axes: 2, envelopeMm: { x: 300, y: 300, z: 600 }, maxRpm: 4000, controller: "fanuc" },
    ],
    materialGroups: ["P", "M", "N"],
    bestToleranceMm: 0.005,
    certifications: ["ISO9001", "AS9100"],
  });
}

/** A second mill shop, tighter tolerance, no aero cert — so a 2-shop shortlist ranks distinctly. */
function seedMillShop2(id = "S-MILL-2"): void {
  SupplierCapabilityProfileEngine.registerSupplier({
    supplierId: id,
    name: `Mill Shop ${id}`,
    geography: { region: "West", state: "CA" },
    processes: ["mill"],
    machines: [
      { machineId: `${id}-VMC`, process: "mill", axes: 5, envelopeMm: { x: 800, y: 600, z: 500 }, maxRpm: 18000, controller: "okuma" },
    ],
    materialGroups: ["P", "M", "N", "S"],
    bestToleranceMm: 0.0025,
    certifications: ["ISO9001"],
  });
}

/** A turning shop that holds 0.01mm in P/N. */
function seedTurnShop(id = "S-TURN-1"): void {
  SupplierCapabilityProfileEngine.registerSupplier({
    supplierId: id,
    name: `Turn Shop ${id}`,
    geography: { region: "South", state: "TX" },
    processes: ["turn", "swiss"],
    machines: [
      { machineId: `${id}-CNC`, process: "turn", axes: 2, envelopeMm: { x: 250, y: 250, z: 500 }, maxRpm: 6000, controller: "mazak" },
    ],
    materialGroups: ["P", "N"],
    bestToleranceMm: 0.01,
    certifications: ["ISO9001"],
  });
}

/** A wire-EDM shop that holds 0.002mm in P/H, ITAR. */
function seedWedmShop(id = "S-WEDM-1"): void {
  SupplierCapabilityProfileEngine.registerSupplier({
    supplierId: id,
    name: `WEDM Shop ${id}`,
    geography: { region: "Northeast", state: "CT" },
    processes: ["wedm"],
    machines: [
      { machineId: `${id}-WIRE`, process: "wedm", axes: 4, envelopeMm: { x: 400, y: 300, z: 300 }, maxRpm: 0, controller: "sodick" },
    ],
    materialGroups: ["P", "H"],
    bestToleranceMm: 0.002,
    certifications: ["ISO9001", "ITAR"],
  });
}

const MILL_RFQ: BroadcastInput["rfq"] = {
  rfqId: "RFQ-MILL-100",
  buyerId: "BUYER-ACME",
  process: "mill",
  materialGroup: "P",
  toleranceMm: 0.02,
  partEnvelopeMm: { x: 200, y: 150, z: 100 },
  quantity: 50,
  requiredCerts: [],
  needByDate: "2026-07-01",
};

const TURN_RFQ: BroadcastInput["rfq"] = {
  rfqId: "RFQ-TURN-200",
  buyerId: "BUYER-ACME",
  process: "turn",
  materialGroup: "N",
  toleranceMm: 0.03,
  partEnvelopeMm: { x: 100, y: 100, z: 200 },
  quantity: 25,
  requiredCerts: [],
  needByDate: "2026-07-15",
};

const WEDM_RFQ: BroadcastInput["rfq"] = {
  rfqId: "RFQ-WEDM-300",
  buyerId: "BUYER-DEFENSE",
  process: "wedm",
  materialGroup: "H",
  toleranceMm: 0.005,
  partEnvelopeMm: { x: 100, y: 80, z: 60 },
  quantity: 10,
  requiredCerts: ["ITAR"],
  needByDate: "2026-08-01",
};

const T0 = "2026-06-01T12:00:00.000Z"; // broadcastAt
// +48h → closesAt
const CLOSES_48H = "2026-06-03T12:00:00.000Z";

beforeEach(() => {
  RFQBroadcastEngine.__resetForTests();
  SupplierCapabilityProfileEngine.__resetForTests();
});

// ============================================================================
// 1. BROADCAST
// ============================================================================

describe("RFQBroadcastEngine.broadcastRFQ", () => {
  it("broadcasts to a seeded shortlist, opens an open window with the right close time + invitees", () => {
    seedMillShop();
    seedMillShop2();
    const res = RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 });

    expect(res.rfqId).toBe("RFQ-MILL-100");
    expect(res.window.status).toBe("open");
    expect(res.window.opensAt).toBe(T0);
    expect(res.window.closesAt).toBe(CLOSES_48H); // pure arithmetic: T0 + 48h
    // both mill shops can do P-group mill at 0.02mm → both invited; ranked shortlist consumed verbatim.
    expect(res.invited.length).toBe(2);
    // membership check via a COPY — never .sort() the returned array (it would corrupt the order assertion below).
    expect([...res.window.invitedSupplierIds].sort()).toEqual(["S-MILL-1", "S-MILL-2"]);
    expect(res.window.receivedBidIds).toEqual([]);
    // the matcher's rank-1 is the invitee[0] (verbatim shortlist order).
    expect(res.invited[0].rank).toBe(1);
    expect(res.window.invitedSupplierIds[0]).toBe(res.invited[0].supplierId);
  });

  it("caps invitees at maxInvitees, keeping the top-ranked", () => {
    seedMillShop();
    seedMillShop2();
    const res = RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 24, broadcastAt: T0, maxInvitees: 1 });
    expect(res.window.invitedSupplierIds.length).toBe(1);
    expect(res.invited.length).toBe(1);
    expect(res.invited[0].rank).toBe(1); // kept the best, dropped the rest
    expect(res.window.closesAt).toBe("2026-06-02T12:00:00.000Z"); // T0 + 24h
  });

  it("THROWS when no supplier matches (empty shortlist is surfaced, not a dead window)", () => {
    seedTurnShop(); // only a turning shop exists
    // ask for wedm — no shop offers it → empty shortlist → throw.
    expect(() => RFQBroadcastEngine.broadcastRFQ({ rfq: WEDM_RFQ, bidWindowHours: 48, broadcastAt: T0 })).toThrow(
      /no supplier matched/i,
    );
    // and nothing was persisted (the window must not exist after a failed broadcast).
    expect(RFQBroadcastEngine.getWindow("RFQ-WEDM-300")).toBeNull();
  });

  it("THROWS when re-broadcasting an already-broadcast rfqId (no silent clobber of live window)", () => {
    seedMillShop();
    RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 });
    expect(() => RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 })).toThrow(
      /already been broadcast/i,
    );
  });

  it("THROWS when the buyer is not permitted to post (buyerCanPost=false gate)", () => {
    seedMillShop();
    expect(() =>
      RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0, buyerCanPost: false }),
    ).toThrow(/not permitted to post/i);
    expect(RFQBroadcastEngine.getWindow("RFQ-MILL-100")).toBeNull(); // gated → never stored
  });

  it("ADVERSARIAL: THROWS on non-positive bidWindowHours and on a non-finite tolerance", () => {
    seedMillShop();
    expect(() => RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 0, broadcastAt: T0 })).toThrow();
    expect(() =>
      RFQBroadcastEngine.broadcastRFQ({
        rfq: { ...MILL_RFQ, toleranceMm: Number.POSITIVE_INFINITY },
        bidWindowHours: 48,
        broadcastAt: T0,
      }),
    ).toThrow();
  });

  it("ADVERSARIAL: THROWS on an unparseable broadcastAt ISO string", () => {
    seedMillShop();
    expect(() =>
      RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: "not-a-date" }),
    ).toThrow(/not a valid iso/i);
  });
});

// ============================================================================
// 2. SUBMIT BID
// ============================================================================

describe("RFQBroadcastEngine.submitBid", () => {
  beforeEach(() => {
    seedMillShop();
    seedMillShop2();
    RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 });
  });

  it("stores a happy-path bid, half-even rounds the price, and appends to receivedBidIds", () => {
    const bid = RFQBroadcastEngine.submitBid({
      bidId: "BID-1",
      rfqId: "RFQ-MILL-100",
      supplierId: "S-MILL-1",
      priceUsd: 1234.565, // half-even: .565 → 1234.56 (5 rounds to even cent 6)
      leadTimeDays: 14,
      submittedAt: "2026-06-02T09:00:00.000Z",
    });
    expect(bid.priceUsd).toBe(1234.56);
    expect(bid.leadTimeDays).toBe(14);
    const window = RFQBroadcastEngine.getWindow("RFQ-MILL-100")!;
    expect(window.receivedBidIds).toEqual(["BID-1"]);
    expect(RFQBroadcastEngine.getBids("RFQ-MILL-100").map((b) => b.bidId)).toEqual(["BID-1"]);
  });

  it("accepts a bid submitted EXACTLY at the close instant (boundary on-time)", () => {
    const bid = RFQBroadcastEngine.submitBid({
      bidId: "BID-EDGE",
      rfqId: "RFQ-MILL-100",
      supplierId: "S-MILL-1",
      priceUsd: 999.99,
      leadTimeDays: 7,
      submittedAt: CLOSES_48H, // submittedAt === closesAt → on time (<=)
    });
    expect(bid.bidId).toBe("BID-EDGE");
  });

  it("THROWS on a LATE bid (submittedAt strictly after closesAt)", () => {
    expect(() =>
      RFQBroadcastEngine.submitBid({
        bidId: "BID-LATE",
        rfqId: "RFQ-MILL-100",
        supplierId: "S-MILL-1",
        priceUsd: 500,
        leadTimeDays: 7,
        submittedAt: "2026-06-03T12:00:00.001Z", // 1ms after close
      }),
    ).toThrow(/late bids are rejected/i);
  });

  it("THROWS on an UNINVITED supplier", () => {
    seedTurnShop(); // S-TURN-1 exists in the registry but was NOT invited to the mill RFQ
    expect(() =>
      RFQBroadcastEngine.submitBid({
        bidId: "BID-UNINV",
        rfqId: "RFQ-MILL-100",
        supplierId: "S-TURN-1",
        priceUsd: 500,
        leadTimeDays: 7,
        submittedAt: "2026-06-02T09:00:00.000Z",
      }),
    ).toThrow(/was not invited/i);
  });

  it("THROWS on a DUPLICATE bid from the same supplier (one bid per supplier per RFQ)", () => {
    RFQBroadcastEngine.submitBid({
      bidId: "BID-A",
      rfqId: "RFQ-MILL-100",
      supplierId: "S-MILL-1",
      priceUsd: 800,
      leadTimeDays: 10,
      submittedAt: "2026-06-02T09:00:00.000Z",
    });
    expect(() =>
      RFQBroadcastEngine.submitBid({
        bidId: "BID-B",
        rfqId: "RFQ-MILL-100",
        supplierId: "S-MILL-1", // same supplier, different bidId → still rejected
        priceUsd: 750,
        leadTimeDays: 9,
        submittedAt: "2026-06-02T10:00:00.000Z",
      }),
    ).toThrow(/already bid/i);
  });

  it("THROWS on a DUPLICATE bidId (globally unique)", () => {
    RFQBroadcastEngine.submitBid({
      bidId: "BID-DUP",
      rfqId: "RFQ-MILL-100",
      supplierId: "S-MILL-1",
      priceUsd: 800,
      leadTimeDays: 10,
      submittedAt: "2026-06-02T09:00:00.000Z",
    });
    expect(() =>
      RFQBroadcastEngine.submitBid({
        bidId: "BID-DUP", // same id, different supplier
        rfqId: "RFQ-MILL-100",
        supplierId: "S-MILL-2",
        priceUsd: 700,
        leadTimeDays: 8,
        submittedAt: "2026-06-02T09:30:00.000Z",
      }),
    ).toThrow(/duplicate bidId/i);
  });

  it("ADVERSARIAL: THROWS on zero / negative / NaN price and on a non-integer lead time", () => {
    const base = { rfqId: "RFQ-MILL-100", supplierId: "S-MILL-2", submittedAt: "2026-06-02T09:00:00.000Z", leadTimeDays: 7 };
    expect(() => RFQBroadcastEngine.submitBid({ ...base, bidId: "B0", priceUsd: 0 })).toThrow();
    expect(() => RFQBroadcastEngine.submitBid({ ...base, bidId: "Bneg", priceUsd: -5 })).toThrow();
    expect(() => RFQBroadcastEngine.submitBid({ ...base, bidId: "Bnan", priceUsd: Number.NaN })).toThrow();
    expect(() =>
      RFQBroadcastEngine.submitBid({ ...base, bidId: "Bfrac", priceUsd: 100, leadTimeDays: 3.5 }),
    ).toThrow();
  });

  it("THROWS when bidding into an unknown RFQ window", () => {
    expect(() =>
      RFQBroadcastEngine.submitBid({
        bidId: "BID-X",
        rfqId: "RFQ-DOES-NOT-EXIST",
        supplierId: "S-MILL-1",
        priceUsd: 100,
        leadTimeDays: 5,
        submittedAt: "2026-06-02T09:00:00.000Z",
      }),
    ).toThrow(/no bid window/i);
  });
});

// ============================================================================
// 3. UPDATE BID (explicit re-bid)
// ============================================================================

describe("RFQBroadcastEngine.updateBid", () => {
  beforeEach(() => {
    seedMillShop();
    RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 });
    RFQBroadcastEngine.submitBid({
      bidId: "BID-1",
      rfqId: "RFQ-MILL-100",
      supplierId: "S-MILL-1",
      priceUsd: 1000,
      leadTimeDays: 14,
      submittedAt: "2026-06-02T09:00:00.000Z",
    });
  });

  it("revises price/leadTime on an open window, keeping identity, and does NOT add a 2nd bid", () => {
    const updated = RFQBroadcastEngine.updateBid("BID-1", {
      priceUsd: 950.5,
      leadTimeDays: 12,
      submittedAt: "2026-06-02T11:00:00.000Z",
    });
    expect(updated.bidId).toBe("BID-1");
    expect(updated.supplierId).toBe("S-MILL-1"); // immutable
    expect(updated.priceUsd).toBe(950.5);
    expect(updated.leadTimeDays).toBe(12);
    expect(updated.submittedAt).toBe("2026-06-02T11:00:00.000Z");
    // still exactly ONE received bid (a re-bid replaces, never appends).
    expect(RFQBroadcastEngine.getBids("RFQ-MILL-100").length).toBe(1);
  });

  it("THROWS on a late revision and on an unknown bidId", () => {
    expect(() =>
      RFQBroadcastEngine.updateBid("BID-1", { priceUsd: 900, submittedAt: "2026-06-03T12:00:00.001Z" }),
    ).toThrow(/late revision is rejected/i);
    expect(() => RFQBroadcastEngine.updateBid("NOPE", { priceUsd: 900, submittedAt: "2026-06-02T11:00:00.000Z" })).toThrow(
      /unknown bidId/i,
    );
  });
});

// ============================================================================
// 4. CLOSE / CANCEL / LIST
// ============================================================================

describe("RFQBroadcastEngine.closeWindow / cancelWindow / listOpenWindows", () => {
  it("closeWindow flips to 'closed' and returns all received bids in order", () => {
    seedMillShop();
    seedMillShop2();
    RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 });
    RFQBroadcastEngine.submitBid({ bidId: "B1", rfqId: "RFQ-MILL-100", supplierId: "S-MILL-1", priceUsd: 1000, leadTimeDays: 14, submittedAt: "2026-06-02T08:00:00.000Z" });
    RFQBroadcastEngine.submitBid({ bidId: "B2", rfqId: "RFQ-MILL-100", supplierId: "S-MILL-2", priceUsd: 900, leadTimeDays: 10, submittedAt: "2026-06-02T09:00:00.000Z" });

    const res = RFQBroadcastEngine.closeWindow("RFQ-MILL-100", CLOSES_48H);
    expect(res.window.status).toBe("closed");
    expect(res.bids.map((b) => b.bidId)).toEqual(["B1", "B2"]); // append order
    expect(res.bids.map((b) => b.priceUsd)).toEqual([1000, 900]);
  });

  it("THROWS on a double-close (illegal transition surfaced)", () => {
    seedMillShop();
    RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 });
    RFQBroadcastEngine.closeWindow("RFQ-MILL-100", CLOSES_48H);
    expect(() => RFQBroadcastEngine.closeWindow("RFQ-MILL-100", CLOSES_48H)).toThrow(/already 'closed'/i);
  });

  it("cancelWindow sets status='cancelled' (never deletes) and requires a reason", () => {
    seedMillShop();
    RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 });
    const cancelled = RFQBroadcastEngine.cancelWindow("RFQ-MILL-100", "buyer withdrew the part");
    expect(cancelled.status).toBe("cancelled");
    // preserved, not deleted — getWindow + getRFQ still return it.
    expect(RFQBroadcastEngine.getWindow("RFQ-MILL-100")!.status).toBe("cancelled");
    expect(RFQBroadcastEngine.getRFQ("RFQ-MILL-100")!.rfqId).toBe("RFQ-MILL-100");
    // a closed-out window cannot accept new bids.
    expect(() =>
      RFQBroadcastEngine.submitBid({ bidId: "BX", rfqId: "RFQ-MILL-100", supplierId: "S-MILL-1", priceUsd: 100, leadTimeDays: 5, submittedAt: "2026-06-02T09:00:00.000Z" }),
    ).toThrow(/not open/i);
    // empty reason throws.
    seedTurnShop();
    RFQBroadcastEngine.broadcastRFQ({ rfq: TURN_RFQ, bidWindowHours: 24, broadcastAt: T0 });
    expect(() => RFQBroadcastEngine.cancelWindow("RFQ-TURN-200", "  ")).toThrow(/reason is required/i);
  });

  it("listOpenWindows is time-filtered: drops closed, cancelled, and expired windows", () => {
    seedMillShop();
    seedTurnShop();
    seedWedmShop();
    RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 }); // closes 06-03 12:00
    RFQBroadcastEngine.broadcastRFQ({ rfq: TURN_RFQ, bidWindowHours: 2, broadcastAt: T0 }); // closes 06-01 14:00 (expires early)
    RFQBroadcastEngine.broadcastRFQ({ rfq: WEDM_RFQ, bidWindowHours: 72, broadcastAt: T0 }); // closes 06-04 12:00
    RFQBroadcastEngine.cancelWindow("RFQ-WEDM-300", "duplicate posting");

    // asOf 06-02: MILL still open (closes 06-03), TURN expired (closed 06-01 14:00), WEDM cancelled.
    const open = RFQBroadcastEngine.listOpenWindows("2026-06-02T00:00:00.000Z");
    expect(open.map((w) => w.rfqId)).toEqual(["RFQ-MILL-100"]);

    // asOf before any close → both non-cancelled windows are open (sorted by rfqId).
    const earlyOpen = RFQBroadcastEngine.listOpenWindows("2026-06-01T12:30:00.000Z");
    expect(earlyOpen.map((w) => w.rfqId)).toEqual(["RFQ-MILL-100", "RFQ-TURN-200"]);
  });
});

// ============================================================================
// 5. SPANNING RFQs (mill / turn / wedm) — three distinct process configurations
// ============================================================================

describe("RFQBroadcastEngine spanning configurations", () => {
  it("routes a TURN RFQ only to turn-capable shops (not the mill-only shop)", () => {
    seedMillShop2(); // mill-only S-MILL-2
    seedTurnShop(); // turn-capable S-TURN-1
    const res = RFQBroadcastEngine.broadcastRFQ({ rfq: TURN_RFQ, bidWindowHours: 24, broadcastAt: T0 });
    expect(res.window.invitedSupplierIds).toEqual(["S-TURN-1"]);
  });

  it("routes a WEDM RFQ requiring ITAR only to the ITAR-holding wedm shop", () => {
    seedWedmShop(); // wedm + ITAR + H-group
    seedMillShop(); // no wedm, no H, no ITAR
    const res = RFQBroadcastEngine.broadcastRFQ({ rfq: WEDM_RFQ, bidWindowHours: 96, broadcastAt: T0 });
    expect(res.window.invitedSupplierIds).toEqual(["S-WEDM-1"]);
    expect(res.window.closesAt).toBe("2026-06-05T12:00:00.000Z"); // T0 + 96h
    // and the full loop closes with the ITAR shop's bid.
    RFQBroadcastEngine.submitBid({ bidId: "W1", rfqId: "RFQ-WEDM-300", supplierId: "S-WEDM-1", priceUsd: 4250.005, leadTimeDays: 21, submittedAt: "2026-06-02T00:00:00.000Z" });
    const closed = RFQBroadcastEngine.closeWindow("RFQ-WEDM-300", "2026-06-05T12:00:00.000Z");
    expect(closed.bids.length).toBe(1);
    expect(closed.bids[0].priceUsd).toBe(4250.0); // 4250.005 → half-even → 4250.00 (round to even cent 0)
  });

  it("a MILL RFQ with a sole capable shop invites exactly that shop (n===1 shortlist)", () => {
    seedMillShop(); // the only mill shop
    seedWedmShop(); // wedm-only, cannot do mill
    const res = RFQBroadcastEngine.broadcastRFQ({ rfq: MILL_RFQ, bidWindowHours: 48, broadcastAt: T0 });
    expect(res.window.invitedSupplierIds).toEqual(["S-MILL-1"]);
    expect(res.invited[0].score).toBe(1.0); // lone survivor is the ideal (matcher n===1 → closeness 1.0)
  });
});
