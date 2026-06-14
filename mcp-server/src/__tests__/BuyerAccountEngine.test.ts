/**
 * BuyerAccountEngine.test.ts — real-value behavioral spec for the marketplace BUYER account model.
 *
 * Every assertion checks intent, not shape (R9): masked output is asserted to an EXACT masked
 * string (a***@domain / ***1234) so a regression in the masking width or the projection FAILS the
 * test; the raw-handle-leak guard JSON.stringifies the public record and asserts the raw email +
 * phone are ABSENT; canPostRFQ is asserted across the active×creditStatus matrix; never-hard-delete
 * is asserted via list-exclusion + getBuyer-still-returns + reactivate-restore. No toBeDefined /
 * truthy stubs.
 *
 * Determinism: createdAt/updatedAt are wall-clock metadata and are NEVER asserted to a fixed value
 * (only that updatedAt is a non-empty ISO string, and ≥ createdAt lexicographically) — no asserted
 * value reads the system clock.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  BuyerAccountEngine,
  maskEmail,
  maskPhone,
  isValidEmailShape,
  type BuyerAccount,
} from "../engines/BuyerAccountEngine.js";
import {
  DEFAULT_CREDIT_STATUS,
  CREDIT_STATUSES,
  MARKETPLACE_REGIONS,
} from "../data/buyer-account-policy.js";

beforeEach(() => {
  BuyerAccountEngine.__resetForTests();
});

// 3 spanning buyers: a verified US buyer w/ phone, an unverified intl buyer w/o phone, a
// south-region buyer linked to an ERP customer.
function seedThree(): void {
  BuyerAccountEngine.registerBuyer({
    buyerId: "B-001",
    companyName: "Acme Aerospace",
    contactEmail: "alice@acme-aero.com",
    contactPhone: "+1 (860) 555-0142",
    region: "northeast",
    creditStatus: "verified",
  });
  BuyerAccountEngine.registerBuyer({
    buyerId: "B-002",
    companyName: "Globex GmbH",
    contactEmail: "k@globex.de",
    region: "international",
    // creditStatus omitted → default
  });
  BuyerAccountEngine.registerBuyer({
    buyerId: "B-003",
    customerId: "CUST-0007",
    companyName: "Initech Machining",
    contactEmail: "bob.smith@initech.io",
    contactPhone: "210-555-9988",
    region: "south",
    creditStatus: "suspended",
  });
}

describe("BuyerAccountEngine.registerBuyer — spanning registrations + defaults", () => {
  it("registers 3 spanning buyers and applies the default credit status when omitted", () => {
    seedThree();
    const b1 = BuyerAccountEngine.getBuyer("B-001")!;
    const b2 = BuyerAccountEngine.getBuyer("B-002")!;
    const b3 = BuyerAccountEngine.getBuyer("B-003")!;

    expect(b1.creditStatus).toBe("verified");
    expect(b1.region).toBe("northeast");
    expect(b1.active).toBe(true);
    expect(b1.customerId).toBe(null);

    // default applied (sanity-check the default itself is 'unverified')
    expect(DEFAULT_CREDIT_STATUS).toBe("unverified");
    expect(b2.creditStatus).toBe("unverified");
    expect(b2.region).toBe("international");
    expect(b2.contactPhoneMasked).toBe(null); // no phone supplied → null

    // ERP customer reference carried, not re-storing CRM data
    expect(b3.customerId).toBe("CUST-0007");
    expect(b3.creditStatus).toBe("suspended");
  });

  it("stamps the policy schemaVersion and ISO timestamps on the stored record", () => {
    const rec = BuyerAccountEngine.registerBuyer({
      buyerId: "B-010",
      companyName: "Stark Industries",
      contactEmail: "tony@stark.com",
      region: "west",
    });
    expect(rec.schemaVersion).toBe("1.0.0");
    // ISO-8601 metadata (NOT asserted to a fixed clock value — only its shape + ordering invariant)
    expect(rec.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(rec.updatedAt >= rec.createdAt).toBe(true);
  });
});

describe("BuyerAccountEngine — PII masking (§8.2 HARD)", () => {
  it("masks the returned email to a***@domain and phone to last-4 (exact strings)", () => {
    seedThree();
    const b1 = BuyerAccountEngine.getBuyer("B-001")!;
    expect(b1.contactEmailMasked).toBe("a***@acme-aero.com");
    // phone strips non-digits then reveals last 4: +1 (860) 555-0142 → 18605550142 → ***0142
    expect(b1.contactPhoneMasked).toBe("***0142");

    const b3 = BuyerAccountEngine.getBuyer("B-003")!;
    expect(b3.contactEmailMasked).toBe("b***@initech.io");
    expect(b3.contactPhoneMasked).toBe("***9988"); // 2105559988 → last 4
  });

  it("never leaks the raw email or phone in JSON.stringify of the PUBLIC record", () => {
    seedThree();
    const pub = BuyerAccountEngine.getBuyer("B-001")!;
    const json = JSON.stringify(pub);
    // raw handles must be entirely absent — not the local-part, not the full phone digits
    expect(json).not.toContain("alice@acme-aero.com");
    expect(json).not.toContain("alice");
    expect(json).not.toContain("8605550142"); // raw phone digit run absent
    expect(json).not.toContain("18605550142"); // raw phone w/ country code absent
    // the last-4 (***0142) ARE intentionally visible per §8.2 — that is the masking contract,
    // not a leak; assert the masked forms are present and the raw forms above are not.
    expect(json).toContain("a***@acme-aero.com");
    expect(json).toContain("***0142");
    // the public record carries NO raw key at all
    expect(Object.prototype.hasOwnProperty.call(pub, "contactEmail")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(pub, "contactPhone")).toBe(false);
  });

  it("masking helpers are correct in isolation (single-char local, short phone, formatting)", () => {
    expect(maskEmail("a@b.com")).toBe("a***@b.com"); // single-char local still masks unambiguously
    expect(maskEmail("zoey@x.io")).toBe("z***@x.io");
    expect(maskPhone("(212) 867-5309")).toBe("***5309");
    expect(maskPhone("12")).toBe("***12"); // short phone reveals what it has, still ***-prefixed
    expect(isValidEmailShape("a@b.com")).toBe(true);
    expect(isValidEmailShape("no-at")).toBe(false);
    expect(isValidEmailShape("a@b")).toBe(false); // no TLD dot
  });
});

describe("BuyerAccountEngine.getBuyerInternal — the documented UNMASKED billing path", () => {
  it("returns the raw contact handle (unmasked) for internal billing", () => {
    seedThree();
    const internal = BuyerAccountEngine.getBuyerInternal("B-001");
    expect(internal.contactEmail).toBe("alice@acme-aero.com"); // RAW, unmasked
    expect(internal.contactPhone).toBe("+1 (860) 555-0142"); // RAW, unmasked
    expect(internal.creditStatus).toBe("verified");
  });

  it("returns a defensive copy — mutating it does not corrupt the registry", () => {
    seedThree();
    const internal = BuyerAccountEngine.getBuyerInternal("B-001");
    internal.contactEmail = "attacker@evil.com";
    internal.creditStatus = "verified";
    const reread = BuyerAccountEngine.getBuyerInternal("B-001");
    expect(reread.contactEmail).toBe("alice@acme-aero.com"); // unchanged
  });

  it("throws on an unknown id (fail loud on the internal path — never a null billing target)", () => {
    expect(() => BuyerAccountEngine.getBuyerInternal("NOPE")).toThrow(/unknown buyerId 'NOPE'/);
  });
});

describe("BuyerAccountEngine.registerBuyer — fail-loud validation", () => {
  it("throws on a duplicate buyerId (never silently overwrites)", () => {
    BuyerAccountEngine.registerBuyer({
      buyerId: "B-001",
      companyName: "Acme",
      contactEmail: "a@acme.com",
      region: "west",
    });
    expect(() =>
      BuyerAccountEngine.registerBuyer({
        buyerId: "B-001",
        companyName: "Acme Duplicate",
        contactEmail: "dupe@acme.com",
        region: "west",
      }),
    ).toThrow(/duplicate buyerId 'B-001'/);
  });

  it("throws on a malformed contactEmail", () => {
    expect(() =>
      BuyerAccountEngine.registerBuyer({
        buyerId: "B-bad",
        companyName: "Bad Email Co",
        contactEmail: "not-an-email",
        region: "west",
      }),
    ).toThrow(/malformed contactEmail/);
  });

  it("throws on an unknown region and an unknown creditStatus", () => {
    expect(() =>
      BuyerAccountEngine.registerBuyer({
        buyerId: "B-r",
        companyName: "Region Co",
        contactEmail: "r@region.com",
        region: "antarctica",
      }),
    ).toThrow(/unknown region 'antarctica'/);

    expect(() =>
      BuyerAccountEngine.registerBuyer({
        buyerId: "B-c",
        companyName: "Credit Co",
        contactEmail: "c@credit.com",
        region: "west",
        creditStatus: "platinum",
      }),
    ).toThrow(/unknown credit status 'platinum'/);
  });

  it("throws on empty required fields (Zod)", () => {
    expect(() =>
      BuyerAccountEngine.registerBuyer({
        buyerId: "",
        companyName: "X",
        contactEmail: "x@x.com",
        region: "west",
      }),
    ).toThrow();
    expect(() =>
      BuyerAccountEngine.registerBuyer({
        buyerId: "B-z",
        companyName: "",
        contactEmail: "x@x.com",
        region: "west",
      }),
    ).toThrow();
  });
});

describe("BuyerAccountEngine.canPostRFQ — active × creditStatus gate matrix", () => {
  it("verified + active → true; suspended + active → false", () => {
    seedThree();
    expect(BuyerAccountEngine.canPostRFQ("B-001")).toBe(true); // verified, active
    expect(BuyerAccountEngine.canPostRFQ("B-002")).toBe(true); // unverified CAN post (gated only by suspension)
    expect(BuyerAccountEngine.canPostRFQ("B-003")).toBe(false); // suspended → false even while active
  });

  it("an active unverified buyer can post, but is blocked the moment it is suspended", () => {
    BuyerAccountEngine.registerBuyer({
      buyerId: "B-100",
      companyName: "Toggle Co",
      contactEmail: "t@toggle.com",
      region: "midwest",
    });
    expect(BuyerAccountEngine.canPostRFQ("B-100")).toBe(true);
    BuyerAccountEngine.setCreditStatus("B-100", "suspended");
    expect(BuyerAccountEngine.canPostRFQ("B-100")).toBe(false);
  });

  it("a deactivated buyer cannot post even when verified", () => {
    BuyerAccountEngine.registerBuyer({
      buyerId: "B-101",
      companyName: "Deact Co",
      contactEmail: "d@deact.com",
      region: "south",
      creditStatus: "verified",
    });
    BuyerAccountEngine.deactivateBuyer("B-101");
    expect(BuyerAccountEngine.canPostRFQ("B-101")).toBe(false); // inactive overrides verified
  });

  it("throws on an unknown id (the gate fails loud rather than silently returning false)", () => {
    expect(() => BuyerAccountEngine.canPostRFQ("GHOST")).toThrow(/unknown buyerId 'GHOST'/);
  });
});

describe("BuyerAccountEngine.setCreditStatus — transitions", () => {
  it("transitions unverified → verified → suspended → unverified (all reachable)", () => {
    BuyerAccountEngine.registerBuyer({
      buyerId: "B-200",
      companyName: "Lifecycle Co",
      contactEmail: "l@life.com",
      region: "west",
    });
    expect(BuyerAccountEngine.getBuyer("B-200")!.creditStatus).toBe("unverified");
    expect(BuyerAccountEngine.setCreditStatus("B-200", "verified").creditStatus).toBe("verified");
    expect(BuyerAccountEngine.setCreditStatus("B-200", "suspended").creditStatus).toBe("suspended");
    expect(BuyerAccountEngine.setCreditStatus("B-200", "unverified").creditStatus).toBe("unverified");
  });

  it("throws on an unknown status and on an unknown buyer", () => {
    BuyerAccountEngine.registerBuyer({
      buyerId: "B-201",
      companyName: "S Co",
      contactEmail: "s@s.com",
      region: "west",
    });
    // cast through unknown to drive the runtime guard (compile-time the type would reject it)
    expect(() =>
      BuyerAccountEngine.setCreditStatus("B-201", "frozen" as unknown as (typeof CREDIT_STATUSES)[number]),
    ).toThrow(/unknown credit status 'frozen'/);
    expect(() => BuyerAccountEngine.setCreditStatus("NOBODY", "verified")).toThrow(/unknown buyerId 'NOBODY'/);
  });
});

describe("BuyerAccountEngine — never-hard-delete (deactivate / reactivate)", () => {
  it("deactivate excludes from listBuyers default but getBuyer still returns it", () => {
    seedThree();
    BuyerAccountEngine.deactivateBuyer("B-002");

    const activeIds = BuyerAccountEngine.listBuyers().map((b) => b.buyerId);
    expect(activeIds).toEqual(["B-001", "B-003"]); // B-002 excluded, sorted by id
    expect(activeIds).not.toContain("B-002");

    // still retrievable directly (preserved, not deleted)
    const dead = BuyerAccountEngine.getBuyer("B-002")!;
    expect(dead.active).toBe(false);
    expect(dead.companyName).toBe("Globex GmbH"); // data intact

    // includeInactive surfaces it again
    const allIds = BuyerAccountEngine.listBuyers({ includeInactive: true }).map((b) => b.buyerId);
    expect(allIds).toEqual(["B-001", "B-002", "B-003"]);
  });

  it("reactivate restores active=true but does NOT silently re-grant a suspended buyer", () => {
    BuyerAccountEngine.registerBuyer({
      buyerId: "B-300",
      companyName: "Restore Co",
      contactEmail: "r@restore.com",
      region: "midwest",
      creditStatus: "suspended",
    });
    BuyerAccountEngine.deactivateBuyer("B-300");
    const restored = BuyerAccountEngine.reactivateBuyer("B-300");
    expect(restored.active).toBe(true);
    expect(restored.creditStatus).toBe("suspended"); // credit status survives the round-trip
    expect(BuyerAccountEngine.canPostRFQ("B-300")).toBe(false); // still blocked — reactivation ≠ un-suspend
  });

  it("deactivate / reactivate throw on an unknown id", () => {
    expect(() => BuyerAccountEngine.deactivateBuyer("X")).toThrow(/unknown buyerId 'X'/);
    expect(() => BuyerAccountEngine.reactivateBuyer("X")).toThrow(/unknown buyerId 'X'/);
  });
});

describe("BuyerAccountEngine.updateBuyer — masked re-projection + validation", () => {
  it("updates mutable fields and re-masks the new contact handle", () => {
    seedThree();
    const updated = BuyerAccountEngine.updateBuyer("B-001", {
      companyName: "Acme Aerospace LLC",
      contactEmail: "newcontact@acme-aero.com",
      contactPhone: "999-888-7777",
      region: "west",
    });
    expect(updated.companyName).toBe("Acme Aerospace LLC");
    expect(updated.contactEmailMasked).toBe("n***@acme-aero.com"); // re-masked
    expect(updated.contactPhoneMasked).toBe("***7777"); // re-masked last-4
    expect(updated.region).toBe("west");
    // internal raw reflects the update too
    expect(BuyerAccountEngine.getBuyerInternal("B-001").contactEmail).toBe("newcontact@acme-aero.com");
  });

  it("links/relinks a customerId without re-storing CRM data", () => {
    seedThree();
    const linked = BuyerAccountEngine.updateBuyer("B-001", { customerId: "CUST-0042" });
    expect(linked.customerId).toBe("CUST-0042");
    // the public buyer record carries ONLY the reference, none of the CRM master fields
    expect(Object.prototype.hasOwnProperty.call(linked, "creditLimit")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(linked, "currentBalance")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(linked, "pricingTier")).toBe(false);
  });

  it("throws on an empty patch, a malformed email, an unknown region, and an unknown key", () => {
    seedThree();
    expect(() => BuyerAccountEngine.updateBuyer("B-001", {})).toThrow(/empty patch/);
    expect(() => BuyerAccountEngine.updateBuyer("B-001", { contactEmail: "bad" })).toThrow(/malformed contactEmail/);
    expect(() => BuyerAccountEngine.updateBuyer("B-001", { region: "moon" })).toThrow(/unknown region 'moon'/);
    // .strict() rejects an unknown key (would silently no-op otherwise)
    expect(() =>
      BuyerAccountEngine.updateBuyer("B-001", { creditStatus: "verified" } as unknown as { region: string }),
    ).toThrow();
    expect(() => BuyerAccountEngine.updateBuyer("GONE", { companyName: "X" })).toThrow(/unknown buyerId 'GONE'/);
  });
});

describe("BuyerAccountEngine.listBuyers — filters (adversarial / edge)", () => {
  it("filters by region and by creditStatus", () => {
    seedThree();
    expect(BuyerAccountEngine.listBuyers({ region: "south" }).map((b) => b.buyerId)).toEqual(["B-003"]);
    // B-003 is suspended; B-001 verified; B-002 unverified
    expect(BuyerAccountEngine.listBuyers({ creditStatus: "verified" }).map((b) => b.buyerId)).toEqual(["B-001"]);
    // suspended buyer is active so it appears under its status filter
    expect(BuyerAccountEngine.listBuyers({ creditStatus: "suspended" }).map((b) => b.buyerId)).toEqual(["B-003"]);
  });

  it("returns an empty array when no buyer matches, and on an empty registry", () => {
    expect(BuyerAccountEngine.listBuyers()).toEqual([]); // empty registry (reset in beforeEach)
    seedThree();
    expect(BuyerAccountEngine.listBuyers({ region: "midwest" })).toEqual([]); // no midwest buyer
  });

  it("getBuyer returns null (not throw) for an unknown id — the soft read path", () => {
    expect(BuyerAccountEngine.getBuyer("nope")).toBe(null);
  });

  it("policy taxonomies are the expected closed sets (guards the imported vocabulary)", () => {
    expect([...CREDIT_STATUSES]).toEqual(["unverified", "verified", "suspended"]);
    expect([...MARKETPLACE_REGIONS]).toEqual(["northeast", "midwest", "south", "west", "international"]);
  });
});
