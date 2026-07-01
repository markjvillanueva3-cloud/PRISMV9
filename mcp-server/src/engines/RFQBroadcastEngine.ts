/**
 * RFQBroadcastEngine — the CORE MARKETPLACE LOOP ENTRY of the PRISM manufacturing networking
 * marketplace (galaxy:business, slot:hotel). It takes a buyer's RFQ, matches a supplier shortlist
 * (REUSING {@link RFQMatchScoringEngine}), BROADCASTS the RFQ to the matched suppliers by opening a
 * timed BID WINDOW, and COLLECTS the suppliers' sealed bids into that window.
 *
 * This engine OWNS the storage for three marketplace aggregates:
 *   - {@link MarketplaceRFQ}  — the posted RFQ (keyed by rfqId),
 *   - {@link BidWindow}       — the open/closed/awarded/cancelled bidding window for an RFQ (keyed by rfqId),
 *   - {@link SupplierBid}     — each supplier's bid into a window (keyed by bidId).
 * The downstream {@link BidCollectionRankingEngine} (sibling unit) READS a CLOSED window's bids and
 * produces an Award + a logged outcome tuple — it does NOT own the bid/window storage; this does.
 *
 * PIPELINE (broadcastRFQ → submitBid* → closeWindow → [BidCollectionRankingEngine awards]):
 *   1. broadcastRFQ — gate on the buyer being allowed to post (BuyerAccountEngine.canPostRFQ, see
 *      §BUYER-GATE), run {@link RFQMatchScoringEngine.scoreShortlist} to pick the top-N invitees,
 *      then open a BidWindow {opensAt=broadcastAt, closesAt=broadcastAt+bidWindowHours, status:'open'}.
 *      An EMPTY shortlist THROWS — there is no point broadcasting an RFQ into zero matches, so the
 *      no-match is surfaced loudly rather than persisted as a dead window.
 *   2. submitBid — a sealed bid from an INVITED supplier into an OPEN, NON-EXPIRED window. Validates
 *      window existence + open status + on-time (submittedAt <= closesAt) + invited + one-bid-per-
 *      supplier (a re-bid is an explicit {@link updateBid}, never a silent overwrite).
 *   3. closeWindow — flip 'open' → 'closed' (a double-close THROWS) and surface the received bids for
 *      the ranking engine to award.
 *
 * REUSES (never re-derives):
 *  - {@link RFQMatchScoringEngine.scoreShortlist} — the capability-hard-filter + TOPSIS shortlist. The
 *    invitee set is its `shortlist` consumed VERBATIM (ShortlistEntry[] → invitedSupplierIds).
 *  - {@link roundCentsHalfEven} from the shared money util (src/data/money.ts) — every money value (bid priceUsd) is half-even
 *    rounded to the cent, the marketplace-wide money rule. No bespoke rounding here.
 *
 * DETERMINISM (test-friendly, no wall-clock in asserted values):
 *  - EVERY timestamp that affects output — broadcastAt, the derived closesAt, submittedAt, the close
 *    `atTime`, the cancel time, and listOpenWindows' `asOf` — is a CALLER-SUPPLIED ISO string. The
 *    engine NEVER reads the system clock for any value a test asserts. closesAt is computed purely from
 *    broadcastAt + bidWindowHours (ms arithmetic on the parsed epoch), re-emitted as an ISO string.
 *
 * INVARIANTS (fail loud — never silent-coerce, never a bogus default):
 *  - a bad input shape THROWS via zod; a non-finite/zero/negative price or non-positive lead time / window
 *    hours THROWS; an unparseable ISO timestamp THROWS (never silently treated as epoch 0).
 *  - broadcasting an already-broadcast rfqId THROWS (a window already exists — re-broadcast is not a
 *    silent overwrite of the live window + its collected bids).
 *  - a bid into an unknown / non-open / expired window THROWS; an uninvited supplier THROWS; a duplicate
 *    supplier bid THROWS; a duplicate bidId THROWS.
 *  - never hard-delete: cancelWindow flips status='cancelled' ([[feedback_never_delete_only_disable]]);
 *    the RFQ, window, and any received bids are preserved for audit.
 *
 * §BUYER-GATE (BuyerAccountEngine integration point — sibling-race tolerant):
 *  - posting is gated on the buyer being allowed to post an RFQ. BuyerAccountEngine (the two-sided buyer
 *    account model) is being built in this SAME Phase-1 wave; at this engine's authoring time it is not
 *    yet present in the tree. To avoid a hard build-coupling on a sibling race, this engine accepts a
 *    `buyerCanPost: boolean` input that the CALLER (dispatcher / BuyerAccountEngine.canPostRFQ result)
 *    supplies. When BuyerAccountEngine lands, the MAIN dispatcher wiring resolves canPostRFQ(buyerId) and
 *    passes its boolean here. A false gate THROWS (a suspended/over-limit buyer cannot flood the market).
 *
 * PII (business/CLAUDE.md §8.2): the marketplace contract for MarketplaceRFQ / SupplierBid / BidWindow
 *  carries NO buyer/supplier contact email or phone — only opaque account ids (buyerId / supplierId),
 *  which are non-PII identifiers and safe to store + log. There is therefore no contact field to mask in
 *  any record this engine stores or returns. (Contact PII lives in BuyerAccountEngine /
 *  SupplierCapabilityProfileEngine, which mask it at their own boundary.)
 *
 * §MAIN-WIRING (post golf-merge, in MAIN where the dispatcher is not stale):
 *  - wire broadcastRFQ / submitBid / updateBid / closeWindow / cancelWindow / getWindow / getBids /
 *    listOpenWindows into businessDispatcher (the marketplace RFQ surface) — deferred per WIRE-EXEMPT.
 *  - resolve buyerCanPost from BuyerAccountEngine.canPostRFQ(buyerId) at the dispatcher boundary.
 *  - feed CLOSED windows to BidCollectionRankingEngine.award to close the loop.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.

import { z } from "zod";
import { RFQMatchScoringEngine, type ShortlistEntry } from "./RFQMatchScoringEngine.js";
import { roundCentsHalfEven } from "../data/money.js";
import { DEFAULT_MAX_INVITEES } from "../data/marketplace-policy.js";

// ============================================================================
// SHARED MARKETPLACE CONTRACT (all four Phase-1 marketplace engines agree on these shapes)
// ============================================================================

/** A 3-axis bounding box in millimetres (all axes > 0). */
export interface PartEnvelopeMm {
  x: number;
  y: number;
  z: number;
}

/** The RFQ a buyer broadcasts to the marketplace (the shared contract shape). */
export interface MarketplaceRFQ {
  rfqId: string;
  buyerId: string;
  process: string;
  materialGroup: string;
  toleranceMm: number;
  partEnvelopeMm: PartEnvelopeMm;
  quantity: number;
  requiredCerts: string[];
  preferredRegion?: string;
  targetPriceUsd?: number;
  /** ISO date the part is needed by (caller-supplied; carried for ranking/audit). */
  needByDate: string;
}

/** One supplier's sealed bid into an RFQ's bid window. */
export interface SupplierBid {
  bidId: string;
  rfqId: string;
  supplierId: string;
  /** the quoted price in USD (half-even rounded to the cent on store). finite & > 0. */
  priceUsd: number;
  /** the quoted lead time in days (integer, > 0). */
  leadTimeDays: number;
  notes?: string;
  /** ISO timestamp the bid was submitted (caller-supplied — deterministic). */
  submittedAt: string;
}

/** The bidding window for an RFQ — open → closed → awarded, or cancelled. */
export interface BidWindow {
  rfqId: string;
  /** ISO open time (== the broadcastAt). */
  opensAt: string;
  /** ISO close time (== broadcastAt + bidWindowHours). */
  closesAt: string;
  status: "open" | "closed" | "awarded" | "cancelled";
  /** the supplier ids invited from the match shortlist. */
  invitedSupplierIds: string[];
  /** the ids of bids received into this window (append-order). */
  receivedBidIds: string[];
}

// ============================================================================
// RESULT SHAPES
// ============================================================================

/** The result of {@link RFQBroadcastEngine.broadcastRFQ}. */
export interface BroadcastResult {
  rfqId: string;
  window: BidWindow;
  /** the ranked shortlist (the matcher's verdict) consumed verbatim as the invitee set. */
  invited: ShortlistEntry[];
}

/** The result of {@link RFQBroadcastEngine.closeWindow}: the closed window + every received bid. */
export interface CloseWindowResult {
  window: BidWindow;
  bids: SupplierBid[];
}

export const RFQ_BROADCAST_SCHEMA_VERSION = "1.0.0";

// ============================================================================
// SCHEMAS — z.input (NOT z.infer) so defaulted/optional fields stay optional for callers
// ============================================================================

const EnvelopeSchema = z.object({
  x: z.number().finite("rfq partEnvelopeMm.x must be finite").positive("rfq partEnvelopeMm.x must be > 0"),
  y: z.number().finite("rfq partEnvelopeMm.y must be finite").positive("rfq partEnvelopeMm.y must be > 0"),
  z: z.number().finite("rfq partEnvelopeMm.z must be finite").positive("rfq partEnvelopeMm.z must be > 0"),
});

const MarketplaceRfqSchema = z.object({
  rfqId: z.string().min(1, "rfq.rfqId is required"),
  buyerId: z.string().min(1, "rfq.buyerId is required"),
  process: z.string().min(1, "rfq.process is required"),
  materialGroup: z.string().min(1, "rfq.materialGroup is required"),
  toleranceMm: z.number().finite("rfq.toleranceMm must be finite").positive("rfq.toleranceMm must be > 0"),
  partEnvelopeMm: EnvelopeSchema,
  quantity: z.number().int("rfq.quantity must be an integer").positive("rfq.quantity must be > 0"),
  requiredCerts: z.array(z.string().min(1)).optional(),
  preferredRegion: z.string().min(1).optional(),
  targetPriceUsd: z.number().finite("rfq.targetPriceUsd must be finite").positive("rfq.targetPriceUsd must be > 0").optional(),
  needByDate: z.string().min(1, "rfq.needByDate is required"),
});

const BroadcastSchema = z.object({
  rfq: MarketplaceRfqSchema,
  bidWindowHours: z.number().finite("bidWindowHours must be finite").positive("bidWindowHours must be > 0"),
  broadcastAt: z.string().min(1, "broadcastAt (ISO) is required"),
  /** how many top-ranked suppliers to invite from the shortlist. */
  maxInvitees: z.number().int("maxInvitees must be an integer").positive("maxInvitees must be > 0").optional(),
  /** caller-supplied buyer-can-post gate (BuyerAccountEngine.canPostRFQ — see §BUYER-GATE). */
  buyerCanPost: z.boolean().optional(),
});
export type BroadcastInput = z.input<typeof BroadcastSchema>;

const SubmitBidSchema = z.object({
  bidId: z.string().min(1, "bidId is required"),
  rfqId: z.string().min(1, "rfqId is required"),
  supplierId: z.string().min(1, "supplierId is required"),
  priceUsd: z.number().finite("priceUsd must be finite").positive("priceUsd must be > 0"),
  leadTimeDays: z.number().int("leadTimeDays must be an integer").positive("leadTimeDays must be > 0"),
  notes: z.string().min(1).optional(),
  submittedAt: z.string().min(1, "submittedAt (ISO) is required"),
});
export type SubmitBidInput = z.input<typeof SubmitBidSchema>;

/** Mutable fields for an explicit re-bid ({@link RFQBroadcastEngine.updateBid}). */
const UpdateBidSchema = z
  .object({
    priceUsd: z.number().finite("priceUsd must be finite").positive("priceUsd must be > 0").optional(),
    leadTimeDays: z.number().int("leadTimeDays must be an integer").positive("leadTimeDays must be > 0").optional(),
    notes: z.string().min(1).optional(),
    /** the ISO time of the re-bid (must still be within the open window). */
    submittedAt: z.string().min(1, "submittedAt (ISO) is required"),
  })
  .strict();
export type UpdateBidInput = z.input<typeof UpdateBidSchema>;

// ============================================================================
// ENGINE
// ============================================================================

export class RFQBroadcastEngine {
  /** rfqId → the posted RFQ. OWNED here (the marketplace RFQ store). */
  private static rfqs = new Map<string, MarketplaceRFQ>();
  /** rfqId → its bid window. OWNED here. */
  private static windows = new Map<string, BidWindow>();
  /** bidId → the stored bid. OWNED here (one bid per supplier per RFQ, indexed globally by bidId). */
  private static bids = new Map<string, SupplierBid>();

  /**
   * Broadcast an RFQ: gate on the buyer, match a shortlist (REUSES {@link RFQMatchScoringEngine}),
   * invite the top-N, and open a timed bid window.
   *
   * @param input rfq + bidWindowHours(>0) + broadcastAt(ISO) + optional maxInvitees(default 5) +
   *              optional buyerCanPost gate (see §BUYER-GATE).
   * @returns { rfqId, window, invited } — the open window + the ranked invitee shortlist (verbatim).
   * @throws if the buyer cannot post, the rfqId was already broadcast, the shortlist is EMPTY (no match
   *         is surfaced, not stored), or any input/timestamp is invalid.
   */
  static broadcastRFQ(input: BroadcastInput): BroadcastResult {
    const c = BroadcastSchema.parse(input); // throws on bad shape / non-positive hours / bad qty

    // §BUYER-GATE — a false gate is a loud refusal (a suspended/over-limit buyer cannot flood the market).
    if (c.buyerCanPost === false) {
      throw new Error(
        `RFQBroadcastEngine.broadcastRFQ: buyer '${c.rfq.buyerId}' is not permitted to post RFQ ` +
          `'${c.rfq.rfqId}' (buyerCanPost=false — resolve via BuyerAccountEngine.canPostRFQ).`,
      );
    }

    // a window already exists for this rfqId → re-broadcast would silently clobber a live window + bids.
    if (RFQBroadcastEngine.windows.has(c.rfq.rfqId)) {
      throw new Error(
        `RFQBroadcastEngine.broadcastRFQ: RFQ '${c.rfq.rfqId}' has already been broadcast (a live bid ` +
          `window exists) — cancel it before re-broadcasting; re-broadcast is not a silent overwrite.`,
      );
    }

    const opensAtMs = RFQBroadcastEngine.#parseIso(c.broadcastAt, "broadcastAt");
    const closesAtMs = opensAtMs + c.bidWindowHours * 3_600_000; // hours → ms, pure arithmetic
    const closesAt = new Date(closesAtMs).toISOString();

    const maxInvitees = c.maxInvitees ?? DEFAULT_MAX_INVITEES;

    // ---- MATCH: reuse the RFQ matcher; consume its shortlist shape verbatim ----
    const match = RFQMatchScoringEngine.scoreShortlist({
      rfq: {
        rfqId: c.rfq.rfqId,
        process: c.rfq.process as never, // matcher validates the enum via canSatisfy (fail-loud)
        materialGroup: c.rfq.materialGroup as never,
        toleranceMm: c.rfq.toleranceMm,
        partEnvelopeMm: c.rfq.partEnvelopeMm,
        quantity: c.rfq.quantity,
        requiredCerts: (c.rfq.requiredCerts ?? []) as never,
        ...(c.rfq.preferredRegion !== undefined ? { preferredRegion: c.rfq.preferredRegion } : {}),
      },
    });

    if (match.shortlist.length === 0) {
      throw new Error(
        `RFQBroadcastEngine.broadcastRFQ: no supplier matched RFQ '${c.rfq.rfqId}' ` +
          `(${match.noMatch ?? "empty shortlist"}) — broadcasting into zero matches is a surfaced no-op, ` +
          `not a dead window.`,
      );
    }

    const invited = match.shortlist.slice(0, maxInvitees);
    const invitedSupplierIds = invited.map((s) => s.supplierId);

    const rfq: MarketplaceRFQ = {
      rfqId: c.rfq.rfqId,
      buyerId: c.rfq.buyerId,
      process: c.rfq.process,
      materialGroup: c.rfq.materialGroup,
      toleranceMm: c.rfq.toleranceMm,
      partEnvelopeMm: { x: c.rfq.partEnvelopeMm.x, y: c.rfq.partEnvelopeMm.y, z: c.rfq.partEnvelopeMm.z },
      quantity: c.rfq.quantity,
      requiredCerts: [...(c.rfq.requiredCerts ?? [])],
      ...(c.rfq.preferredRegion !== undefined ? { preferredRegion: c.rfq.preferredRegion } : {}),
      ...(c.rfq.targetPriceUsd !== undefined ? { targetPriceUsd: roundCentsHalfEven(c.rfq.targetPriceUsd) } : {}),
      needByDate: c.rfq.needByDate,
    };

    const window: BidWindow = {
      rfqId: c.rfq.rfqId,
      opensAt: c.broadcastAt,
      closesAt,
      status: "open",
      invitedSupplierIds,
      receivedBidIds: [],
    };

    RFQBroadcastEngine.rfqs.set(rfq.rfqId, rfq);
    RFQBroadcastEngine.windows.set(window.rfqId, window);

    return { rfqId: rfq.rfqId, window: RFQBroadcastEngine.#cloneWindow(window), invited };
  }

  /**
   * Submit a supplier's sealed bid into an OPEN window.
   *
   * Validates (fail loud — every violation THROWS):
   *  - the window exists and its status === 'open';
   *  - the bid is on time: submittedAt <= the window's closesAt (a late bid THROWS);
   *  - the supplier was INVITED (an uninvited bid THROWS — the window is not an open call);
   *  - the supplier has not already bid (one bid per supplier per RFQ — a re-bid is {@link updateBid});
   *  - the bidId is globally unique (a duplicate bidId THROWS).
   *
   * priceUsd is half-even rounded to the cent on store. The bidId is appended to receivedBidIds.
   *
   * @param input bidId + rfqId + supplierId + priceUsd(>0) + leadTimeDays(int>0) + submittedAt(ISO).
   * @returns the stored {@link SupplierBid}.
   */
  static submitBid(input: SubmitBidInput): SupplierBid {
    const c = SubmitBidSchema.parse(input); // throws on non-finite/zero/negative price, bad lead time

    const window = RFQBroadcastEngine.#mustGetWindow(c.rfqId, "submitBid");

    if (window.status !== "open") {
      throw new Error(
        `RFQBroadcastEngine.submitBid: bid window for RFQ '${c.rfqId}' is '${window.status}', not open — ` +
          `bids are only accepted while the window is open.`,
      );
    }

    // on-time check: submittedAt must not be after closesAt (a late bid is rejected, never silently kept).
    const submittedMs = RFQBroadcastEngine.#parseIso(c.submittedAt, "submittedAt");
    const closesMs = RFQBroadcastEngine.#parseIso(window.closesAt, "window.closesAt");
    if (submittedMs > closesMs) {
      throw new Error(
        `RFQBroadcastEngine.submitBid: bid '${c.bidId}' submittedAt ${c.submittedAt} is AFTER the window ` +
          `close ${window.closesAt} for RFQ '${c.rfqId}' — late bids are rejected.`,
      );
    }

    if (!window.invitedSupplierIds.includes(c.supplierId)) {
      throw new Error(
        `RFQBroadcastEngine.submitBid: supplier '${c.supplierId}' was not invited to RFQ '${c.rfqId}' ` +
          `(invited: ${window.invitedSupplierIds.join(", ") || "none"}) — uninvited bids are rejected.`,
      );
    }

    if (RFQBroadcastEngine.bids.has(c.bidId)) {
      throw new Error(
        `RFQBroadcastEngine.submitBid: duplicate bidId '${c.bidId}' — bid ids must be globally unique.`,
      );
    }

    // one bid per supplier per RFQ — a resubmission is an explicit updateBid, never a silent 2nd row.
    for (const existingId of window.receivedBidIds) {
      const existing = RFQBroadcastEngine.bids.get(existingId);
      if (existing && existing.supplierId === c.supplierId) {
        throw new Error(
          `RFQBroadcastEngine.submitBid: supplier '${c.supplierId}' has already bid on RFQ '${c.rfqId}' ` +
            `(bid '${existing.bidId}') — use updateBid to revise an existing bid (one bid per supplier).`,
        );
      }
    }

    const bid: SupplierBid = {
      bidId: c.bidId,
      rfqId: c.rfqId,
      supplierId: c.supplierId,
      priceUsd: roundCentsHalfEven(c.priceUsd),
      leadTimeDays: c.leadTimeDays,
      ...(c.notes !== undefined ? { notes: c.notes } : {}),
      submittedAt: c.submittedAt,
    };

    RFQBroadcastEngine.bids.set(bid.bidId, bid);
    window.receivedBidIds.push(bid.bidId);

    return { ...bid };
  }

  /**
   * Revise an EXISTING bid (the explicit re-bid path; submitBid refuses a second bid from the same
   * supplier). The bid must still be in an OPEN window and the new submittedAt must be on time. The
   * bidId, rfqId, and supplierId are immutable; only priceUsd / leadTimeDays / notes / submittedAt change.
   *
   * @param bidId the existing bid to revise.
   * @param patch the new priceUsd / leadTimeDays / notes + the (on-time) submittedAt.
   * @returns the updated {@link SupplierBid}.
   * @throws if the bid is unknown, its window is not open, the new submittedAt is late, or the patch is bad.
   */
  static updateBid(bidId: string, patch: UpdateBidInput): SupplierBid {
    if (typeof bidId !== "string" || bidId.length === 0) {
      throw new Error("RFQBroadcastEngine.updateBid: bidId is required.");
    }
    const c = UpdateBidSchema.parse(patch); // throws on unknown keys / bad shape

    const bid = RFQBroadcastEngine.bids.get(bidId);
    if (!bid) throw new Error(`RFQBroadcastEngine.updateBid: unknown bidId '${bidId}'.`);

    const window = RFQBroadcastEngine.#mustGetWindow(bid.rfqId, "updateBid");
    if (window.status !== "open") {
      throw new Error(
        `RFQBroadcastEngine.updateBid: bid window for RFQ '${bid.rfqId}' is '${window.status}', not open — ` +
          `a bid can only be revised while the window is open.`,
      );
    }

    const submittedMs = RFQBroadcastEngine.#parseIso(c.submittedAt, "submittedAt");
    const closesMs = RFQBroadcastEngine.#parseIso(window.closesAt, "window.closesAt");
    if (submittedMs > closesMs) {
      throw new Error(
        `RFQBroadcastEngine.updateBid: revised submittedAt ${c.submittedAt} is AFTER the window close ` +
          `${window.closesAt} for RFQ '${bid.rfqId}' — a late revision is rejected.`,
      );
    }

    const updated: SupplierBid = {
      bidId: bid.bidId,
      rfqId: bid.rfqId,
      supplierId: bid.supplierId,
      priceUsd: c.priceUsd !== undefined ? roundCentsHalfEven(c.priceUsd) : bid.priceUsd,
      leadTimeDays: c.leadTimeDays ?? bid.leadTimeDays,
      ...(c.notes !== undefined ? { notes: c.notes } : bid.notes !== undefined ? { notes: bid.notes } : {}),
      submittedAt: c.submittedAt,
    };
    RFQBroadcastEngine.bids.set(bidId, updated);
    return { ...updated };
  }

  /**
   * Close a bid window (transition 'open' → 'closed') so the ranking engine can award it.
   *
   * @param rfqId the RFQ whose window to close.
   * @param atTime the ISO close time (caller-supplied; recorded as the moment of close, validated ISO).
   * @returns { window, bids } — the closed window + every received bid (in receivedBidIds order).
   * @throws if the window is unknown, is not currently 'open' (a double-close / closing a cancelled or
   *         awarded window THROWS — the illegal transition is surfaced), or atTime is not a valid ISO.
   */
  static closeWindow(rfqId: string, atTime: string): CloseWindowResult {
    const window = RFQBroadcastEngine.#mustGetWindow(rfqId, "closeWindow");
    if (typeof atTime !== "string" || atTime.length === 0) {
      throw new Error(`RFQBroadcastEngine.closeWindow: atTime (ISO) is required for RFQ '${rfqId}'.`);
    }
    RFQBroadcastEngine.#parseIso(atTime, "atTime"); // validate (throws on bad ISO); not persisted as a field

    if (window.status !== "open") {
      throw new Error(
        `RFQBroadcastEngine.closeWindow: bid window for RFQ '${rfqId}' is already '${window.status}' — ` +
          `only an open window can be closed (a double-close is a surfaced illegal transition).`,
      );
    }

    window.status = "closed";
    return {
      window: RFQBroadcastEngine.#cloneWindow(window),
      bids: RFQBroadcastEngine.#bidsFor(window),
    };
  }

  /**
   * Cancel a bid window (transition to 'cancelled') — NEVER hard-deletes
   * ([[feedback_never_delete_only_disable]]). The RFQ, window, and received bids are preserved for audit.
   *
   * @param rfqId the RFQ whose window to cancel.
   * @param reason a human-readable cancel reason (required — a cancel must carry a why for the audit trail).
   * @returns the cancelled window.
   * @throws if the window is unknown, is already cancelled, or has already been awarded (an awarded
   *         window cannot be retroactively cancelled).
   */
  static cancelWindow(rfqId: string, reason: string): BidWindow {
    const window = RFQBroadcastEngine.#mustGetWindow(rfqId, "cancelWindow");
    if (typeof reason !== "string" || reason.trim().length === 0) {
      throw new Error(
        `RFQBroadcastEngine.cancelWindow: a non-empty reason is required to cancel RFQ '${rfqId}' (audit trail).`,
      );
    }
    if (window.status === "cancelled") {
      throw new Error(`RFQBroadcastEngine.cancelWindow: RFQ '${rfqId}' window is already cancelled.`);
    }
    if (window.status === "awarded") {
      throw new Error(
        `RFQBroadcastEngine.cancelWindow: RFQ '${rfqId}' window is 'awarded' and cannot be cancelled — ` +
          `an awarded window is terminal.`,
      );
    }
    window.status = "cancelled";
    return RFQBroadcastEngine.#cloneWindow(window);
  }

  /**
   * Fetch a stored RFQ by id.
   * @returns the {@link MarketplaceRFQ}, or null if none has that id.
   */
  static getRFQ(rfqId: string): MarketplaceRFQ | null {
    const r = RFQBroadcastEngine.rfqs.get(rfqId);
    return r ? RFQBroadcastEngine.#cloneRfq(r) : null;
  }

  /**
   * Fetch the bid window for an RFQ.
   * @returns the {@link BidWindow} (defensive copy), or null if none exists.
   */
  static getWindow(rfqId: string): BidWindow | null {
    const w = RFQBroadcastEngine.windows.get(rfqId);
    return w ? RFQBroadcastEngine.#cloneWindow(w) : null;
  }

  /**
   * Fetch every bid received for an RFQ, in receivedBidIds (append) order.
   * @returns the bids (defensive copies); empty array if the window exists but has no bids.
   * @throws if the window is unknown (a getBids on a phantom RFQ is a caller bug, not an empty result).
   */
  static getBids(rfqId: string): SupplierBid[] {
    const window = RFQBroadcastEngine.#mustGetWindow(rfqId, "getBids");
    return RFQBroadcastEngine.#bidsFor(window);
  }

  /**
   * List the bid windows still open as of a caller-supplied time: status === 'open' AND closesAt > asOf.
   * (A window whose closesAt has passed is effectively expired even if not yet explicitly closed.)
   *
   * @param asOf the ISO "now" to test against (caller-supplied — deterministic).
   * @returns the open, non-expired windows (defensive copies), sorted by rfqId.
   * @throws if asOf is not a valid ISO timestamp.
   */
  static listOpenWindows(asOf: string): BidWindow[] {
    if (typeof asOf !== "string" || asOf.length === 0) {
      throw new Error("RFQBroadcastEngine.listOpenWindows: asOf (ISO) is required.");
    }
    const asOfMs = RFQBroadcastEngine.#parseIso(asOf, "asOf");
    const out: BidWindow[] = [];
    for (const w of RFQBroadcastEngine.windows.values()) {
      if (w.status !== "open") continue;
      const closesMs = RFQBroadcastEngine.#parseIso(w.closesAt, "window.closesAt");
      if (closesMs > asOfMs) out.push(RFQBroadcastEngine.#cloneWindow(w));
    }
    return out.sort((a, b) => a.rfqId.localeCompare(b.rfqId));
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /** Fetch a window or THROW (fail loud — never operate on a missing window). */
  static #mustGetWindow(rfqId: string, method: string): BidWindow {
    const w = RFQBroadcastEngine.windows.get(rfqId);
    if (!w) {
      throw new Error(`RFQBroadcastEngine.${method}: no bid window for RFQ '${rfqId}' (was it broadcast?).`);
    }
    return w;
  }

  /**
   * Parse a caller-supplied ISO timestamp to epoch ms, THROWING on anything unparseable. This guards
   * every timestamp the engine compares — a bad ISO is a caller bug, never silently coerced to NaN/0.
   */
  static #parseIso(iso: string, field: string): number {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) {
      throw new Error(`RFQBroadcastEngine: ${field} '${iso}' is not a valid ISO timestamp.`);
    }
    return ms;
  }

  /** The received bids for a window, in append order (defensive copies). */
  static #bidsFor(window: BidWindow): SupplierBid[] {
    const out: SupplierBid[] = [];
    for (const id of window.receivedBidIds) {
      const b = RFQBroadcastEngine.bids.get(id);
      if (!b) {
        // Unreachable: a receivedBidId always points at a stored bid. Never trust a dangling id silently.
        throw new Error(
          `RFQBroadcastEngine: window for RFQ '${window.rfqId}' references missing bid '${id}'.`,
        );
      }
      out.push({ ...b });
    }
    return out;
  }

  /** Deep-ish copy of a window so callers cannot mutate the stored aggregate's arrays. */
  static #cloneWindow(w: BidWindow): BidWindow {
    return {
      rfqId: w.rfqId,
      opensAt: w.opensAt,
      closesAt: w.closesAt,
      status: w.status,
      invitedSupplierIds: [...w.invitedSupplierIds],
      receivedBidIds: [...w.receivedBidIds],
    };
  }

  /** Defensive copy of a stored RFQ. */
  static #cloneRfq(r: MarketplaceRFQ): MarketplaceRFQ {
    return {
      ...r,
      partEnvelopeMm: { x: r.partEnvelopeMm.x, y: r.partEnvelopeMm.y, z: r.partEnvelopeMm.z },
      requiredCerts: [...r.requiredCerts],
    };
  }

  /** TEST-ONLY: clear the RFQ / window / bid stores (this engine's owned state). */
  static __resetForTests(): void {
    RFQBroadcastEngine.rfqs.clear();
    RFQBroadcastEngine.windows.clear();
    RFQBroadcastEngine.bids.clear();
  }
}

export const rfqBroadcastEngine = RFQBroadcastEngine;
