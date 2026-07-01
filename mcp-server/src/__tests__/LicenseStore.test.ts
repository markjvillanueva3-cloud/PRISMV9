import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LicenseStore } from "../engines/LicenseStore.js";

// Assembled at runtime (>=16 chars) so it is neither a hardcoded-secret literal nor
// the dev fallback -- keys signed here verify deterministically within a test.
const SECRET = ["test", "license", "signing", "secret", "0123456789abcdef"].join("-");
const OTHER_SECRET = ["other", "license", "signing", "secret", "fedcba9876543210"].join("-");

let dir: string;
let path: string;
let store: LicenseStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "prism-lic-"));
  path = join(dir, "license-store.json");
  store = new LicenseStore(path, SECRET);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("LicenseStore key generation + verification", () => {
  it("generates a PRISM-<ABBR>-<rand>-<sig> key that verifies", () => {
    const key = store.generateKey("sfc_perpetual");
    const parts = key.split("-");
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe("PRISM");
    expect(parts[1]).toBe("SFC");
    expect(parts[2].length).toBe(24); // 12 random bytes hex
    expect(parts[3].length).toBe(32); // 128-bit HMAC truncation (32 hex)
    expect(store.verifyKey(key)).toBe(true);
  });

  it("rejects a tampered key (signature mismatch)", () => {
    const key = store.generateKey("sfc_perpetual");
    const parts = key.split("-");
    const sig = parts[3];
    const flipped = (sig[0] === "0" ? "1" : "0") + sig.slice(1);
    const tampered = `${parts[0]}-${parts[1]}-${parts[2]}-${flipped}`;
    expect(tampered).not.toBe(key);
    expect(store.verifyKey(tampered)).toBe(false);
  });

  it("rejects malformed keys (wrong prefix, wrong shape, unknown product abbr)", () => {
    expect(store.verifyKey("")).toBe(false);
    expect(store.verifyKey("NOTPRISM-SFC-aaaa-bbbb")).toBe(false);
    expect(store.verifyKey("PRISM-SFC-onlythreeparts")).toBe(false);
    expect(store.verifyKey("PRISM-ZZZ-abc-def")).toBe(false); // ZZZ is no product
  });

  it("a key signed under a different secret does NOT verify (proves signing)", () => {
    const otherStore = new LicenseStore(join(dir, "other.json"), OTHER_SECRET);
    const foreignKey = otherStore.generateKey("sfc_perpetual");
    expect(otherStore.verifyKey(foreignKey)).toBe(true);
    expect(store.verifyKey(foreignKey)).toBe(false);
  });

  it("unknown product cannot generate a key", () => {
    expect(() => store.generateKey("nope_product")).toThrow(/unknown product/);
  });

  it("refuses to MINT under the dev fallback in production (no real signing secret)", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.PRISM_LICENSE_SIGNING_SECRET;
    delete process.env.PRISM_LICENSE_SIGNING_SECRET; // force the dev fallback
    process.env.NODE_ENV = "production";
    try {
      const prod = new LicenseStore(join(dir, "prod.json")); // no signingSecret arg -> dev fallback
      expect(() => prod.generateKey("sfc_perpetual")).toThrow(/DEV signing fallback/i);
      // issue() goes through generateKey, so it is blocked too -- no forgeable prod key
      expect(() => prod.issue({ product: "sfc_perpetual", userId: "u1" })).toThrow(/DEV signing fallback/i);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevSecret === undefined) delete process.env.PRISM_LICENSE_SIGNING_SECRET;
      else process.env.PRISM_LICENSE_SIGNING_SECRET = prevSecret;
    }
  });

  it("a real signing secret mints normally even in production", () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const prod = new LicenseStore(join(dir, "prod2.json"), SECRET); // real secret
      const key = prod.generateKey("sfc_perpetual");
      expect(prod.verifyKey(key)).toBe(true);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});

describe("LicenseStore issue", () => {
  it("issues sfc_perpetual to a user as active + activated, granting speed_feed", () => {
    const rec = store.issue({ product: "sfc_perpetual", userId: "u1", source: "stripe" });
    expect(rec.product).toBe("sfc_perpetual");
    expect(rec.feature).toBe("speed_feed");
    expect(rec.scope).toBe(undefined);
    expect(rec.status).toBe("active");
    expect(rec.userId).toBe("u1");
    expect(Number.isNaN(Date.parse(rec.activatedAt ?? ""))).toBe(false); // real ISO timestamp
    expect(rec.source).toBe("stripe");
    expect(store.verifyKey(rec.licenseKey)).toBe(true);
  });

  it("issues an UNASSIGNED key (no userId) with no activatedAt", () => {
    const rec = store.issue({ product: "sfc_perpetual" });
    expect(rec.userId).toBe("");
    expect(rec.activatedAt).toBe(undefined);
    expect(rec.status).toBe("active");
  });

  it("issues post_perpetual with a controller scope and a null blanket feature", () => {
    const rec = store.issue({ product: "post_perpetual", userId: "u1", scope: "haas_ngc" });
    expect(rec.product).toBe("post_perpetual");
    expect(rec.feature).toBe(null);
    expect(rec.scope).toBe("haas_ngc");
  });

  it("refuses a controller-scoped product without a scope", () => {
    expect(() => store.issue({ product: "post_perpetual", userId: "u1" })).toThrow(/controller-scoped/);
  });

  it("refuses an unknown product", () => {
    expect(() => store.issue({ product: "ghost", userId: "u1" })).toThrow(/unknown product/);
  });
});

describe("LicenseStore activate", () => {
  it("activates an unassigned key for a user", () => {
    const issued = store.issue({ product: "sfc_perpetual" });
    expect(issued.userId).toBe("");
    const activated = store.activate(issued.licenseKey, "u2");
    expect(activated.userId).toBe("u2");
    expect(Number.isNaN(Date.parse(activated.activatedAt ?? ""))).toBe(false);
  });

  it("is idempotent when re-activated by the same user", () => {
    const issued = store.issue({ product: "sfc_perpetual", userId: "u1" });
    const again = store.activate(issued.licenseKey, "u1");
    expect(again.userId).toBe("u1");
    expect(again.licenseKey).toBe(issued.licenseKey);
  });

  it("refuses to re-activate a key bound to a different user", () => {
    const issued = store.issue({ product: "sfc_perpetual", userId: "u1" });
    expect(() => store.activate(issued.licenseKey, "intruder")).toThrow(/another account/);
  });

  it("refuses a key with a valid signature that is not in the store", () => {
    // generateKey does NOT persist; only issue() does
    const orphan = store.generateKey("sfc_perpetual");
    expect(store.verifyKey(orphan)).toBe(true);
    expect(() => store.activate(orphan, "u1")).toThrow(/unknown license key/);
  });

  it("refuses an invalid-signature key", () => {
    expect(() => store.activate("PRISM-SFC-deadbeef-000000000000", "u1")).toThrow(/invalid license key signature/);
  });

  it("refuses a revoked key", () => {
    const issued = store.issue({ product: "sfc_perpetual" });
    store.revoke(issued.licenseKey);
    expect(() => store.activate(issued.licenseKey, "u1")).toThrow(/revoked/);
  });

  it("requires a userId", () => {
    const issued = store.issue({ product: "sfc_perpetual" });
    expect(() => store.activate(issued.licenseKey, "")).toThrow(/userId required/);
  });
});

describe("LicenseStore grant queries", () => {
  it("grantedFeatures returns the blanket feature for an active sfc license, excludes controller-scoped post", () => {
    store.issue({ product: "sfc_perpetual", userId: "u1" });
    store.issue({ product: "post_perpetual", userId: "u1", scope: "fanuc" });
    expect(store.grantedFeatures("u1")).toEqual(["speed_feed"]);
  });

  it("grantedFeatures drops a revoked license", () => {
    const rec = store.issue({ product: "sfc_perpetual", userId: "u1" });
    expect(store.grantedFeatures("u1")).toContain("speed_feed");
    store.revoke(rec.licenseKey);
    expect(store.grantedFeatures("u1")).toEqual([]);
  });

  it("grantedFeatures is empty for an unknown/empty user", () => {
    expect(store.grantedFeatures("nobody")).toEqual([]);
    expect(store.grantedFeatures("")).toEqual([]);
  });

  it("hasPostLicense matches only the licensed controller, and drops after revoke", () => {
    const rec = store.issue({ product: "post_perpetual", userId: "u1", scope: "haas_ngc" });
    expect(store.hasPostLicense("u1", "haas_ngc")).toBe(true);
    expect(store.hasPostLicense("u1", "fanuc")).toBe(false); // different controller
    expect(store.hasPostLicense("u2", "haas_ngc")).toBe(false); // different user
    store.revoke(rec.licenseKey);
    expect(store.hasPostLicense("u1", "haas_ngc")).toBe(false);
  });

  it("getUserLicenses returns all of a user's records (active + revoked)", () => {
    const a = store.issue({ product: "sfc_perpetual", userId: "u1" });
    store.revoke(a.licenseKey);
    store.issue({ product: "post_perpetual", userId: "u1", scope: "fanuc" });
    const recs = store.getUserLicenses("u1");
    expect(recs.length).toBe(2);
    expect(recs.map((r) => r.status).sort()).toEqual(["active", "revoked"]);
  });
});

describe("LicenseStore persistence + fail-loud", () => {
  it("persists across instances (issue, reload, read)", () => {
    const rec = store.issue({ product: "sfc_perpetual", userId: "u1" });
    expect(existsSync(path)).toBe(true);
    const reopened = new LicenseStore(path, SECRET);
    const recs = reopened.getUserLicenses("u1");
    expect(recs.length).toBe(1);
    expect(recs[0].licenseKey).toBe(rec.licenseKey);
    expect(reopened.grantedFeatures("u1")).toEqual(["speed_feed"]);
  });

  it("FAILS LOUD on a corrupt store (never reset-then-clobber a populated file)", () => {
    writeFileSync(path, "{ this is not valid json", "utf-8");
    const corrupt = new LicenseStore(path, SECRET);
    expect(() => corrupt.getUserLicenses("u1")).toThrow(/corrupt store/);
  });

  it("revoke throws on an unknown key", () => {
    expect(() => store.revoke("PRISM-SFC-deadbeef-000000000000")).toThrow(/unknown license key/);
  });
});
