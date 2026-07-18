import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LicenseStore } from "../engines/LicenseStore.js";
import { activateLicenseOp, listLicensesOp, issueLicenseOp } from "../routes/billing.js";

// U-COMM-08b: the license endpoint ops are pure + store-injectable (mirrors
// applyWebhookToStore), so we drive them with a temp LicenseStore -- no supertest.
const SECRET = ["test", "license", "signing", "secret", "0123456789abcdef"].join("-");

let dir: string;
let store: LicenseStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "prism-lic-route-"));
  store = new LicenseStore(join(dir, "license-store.json"), SECRET);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("issueLicenseOp (admin issuance)", () => {
  it("issues sfc_perpetual to a user (200) returning the key + granted feature", () => {
    const r = issueLicenseOp({ product: "sfc_perpetual", userId: "u1" }, store);
    expect(r.status).toBe(200);
    expect(r.body.product).toBe("sfc_perpetual");
    expect(r.body.feature).toBe("speed_feed");
    expect(r.body.userId).toBe("u1");
    expect(typeof r.body.licenseKey).toBe("string");
    expect(store.verifyKey(r.body.licenseKey)).toBe(true);
  });

  it("400 MISSING_FIELD when product is absent", () => {
    const r = issueLicenseOp({}, store);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("MISSING_FIELD");
  });

  it("400 ISSUE_FAILED on an unknown product", () => {
    const r = issueLicenseOp({ product: "ghost", userId: "u1" }, store);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("ISSUE_FAILED");
    expect(r.body.error.message).toMatch(/unknown product/);
  });

  it("400 ISSUE_FAILED on a controller-scoped product without a scope", () => {
    const r = issueLicenseOp({ product: "post_perpetual", userId: "u1" }, store);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("ISSUE_FAILED");
    expect(r.body.error.message).toMatch(/controller-scoped/);
  });
});

describe("activateLicenseOp", () => {
  it("activates an unassigned key for the authenticated user (200) and the grant becomes live", () => {
    const issued = issueLicenseOp({ product: "sfc_perpetual" }, store); // unassigned
    expect(issued.body.userId).toBe("");
    const r = activateLicenseOp(issued.body.licenseKey, "u9", store);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("active");
    expect(Number.isNaN(Date.parse(r.body.activatedAt))).toBe(false);
    // the activate -> grant path is now live for that user
    expect(store.grantedFeatures("u9")).toEqual(["speed_feed"]);
  });

  it("400 MISSING_FIELD when licenseKey is absent", () => {
    const r = activateLicenseOp(undefined, "u1", store);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("MISSING_FIELD");
  });

  it("401 UNAUTHENTICATED when there is no userId", () => {
    const issued = issueLicenseOp({ product: "sfc_perpetual" }, store);
    const r = activateLicenseOp(issued.body.licenseKey, undefined, store);
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("400 INVALID_KEY on a bad signature", () => {
    const r = activateLicenseOp("PRISM-SFC-deadbeef-00000000000000000000000000000000", "u1", store);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("INVALID_KEY");
  });

  it("400 UNKNOWN_KEY on a valid signature that was never issued", () => {
    const orphan = store.generateKey("sfc_perpetual"); // signed but not persisted
    const r = activateLicenseOp(orphan, "u1", store);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("UNKNOWN_KEY");
  });

  it("409 ALREADY_ACTIVATED when the key is bound to a different user", () => {
    const issued = issueLicenseOp({ product: "sfc_perpetual", userId: "owner" }, store);
    const r = activateLicenseOp(issued.body.licenseKey, "intruder", store);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("ALREADY_ACTIVATED");
  });

  it("400 REVOKED on a revoked key", () => {
    const issued = issueLicenseOp({ product: "sfc_perpetual" }, store);
    store.revoke(issued.body.licenseKey);
    const r = activateLicenseOp(issued.body.licenseKey, "u1", store);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("REVOKED");
  });
});

describe("listLicensesOp", () => {
  it("returns the user's licenses with a count (200)", () => {
    issueLicenseOp({ product: "sfc_perpetual", userId: "u1" }, store);
    issueLicenseOp({ product: "post_perpetual", userId: "u1", scope: "haas_ngc" }, store);
    const r = listLicensesOp("u1", store);
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(2);
    expect(r.body.licenses.map((l: { product: string }) => l.product).sort()).toEqual(["post_perpetual", "sfc_perpetual"]);
  });

  it("returns an empty list for an unauthenticated/empty user (200)", () => {
    const r = listLicensesOp(undefined, store);
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(0);
    expect(r.body.licenses).toEqual([]);
  });
});
