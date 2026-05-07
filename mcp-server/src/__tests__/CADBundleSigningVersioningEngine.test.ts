/**
 * CADBundleSigningVersioningEngine.test.ts — U-FS-14 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADBundleSigningVersioningEngine,
  type SigningClock,
} from "../engines/CADBundleSigningVersioningEngine.js";

const DIGEST = (c: string) => c.repeat(64);

function makeClock(start = "2026-04-20T00:00:00Z"): SigningClock & {
  tick(seconds: number): void;
} {
  let t = new Date(start).getTime();
  return {
    now: () => new Date(t).toISOString(),
    tick: (s) => {
      t += s * 1000;
    },
  };
}

describe("CADBundleSigningVersioningEngine (U-FS-14)", () => {
  let eng: CADBundleSigningVersioningEngine;
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
    eng = new CADBundleSigningVersioningEngine({ clock });
    eng.createKey({ keyId: "K1", seedHex: "a".repeat(64) });
  });

  describe("key management", () => {
    it("creates and returns public key (without private)", () => {
      const pub = eng.publicKey("K1");
      expect(pub?.keyId).toBe("K1");
      expect(pub?.alg).toBe("ed25519-hmac");
      expect((pub as any).privateSeedHex).toBeUndefined();
    });

    it("rejects short seed", () => {
      expect(() => eng.createKey({ keyId: "K2", seedHex: "abc" })).toThrow();
    });

    it("deterministic public key for same seed", () => {
      eng.createKey({ keyId: "Kx", seedHex: "a".repeat(64) });
      const ky = eng.createKey({ keyId: "Ky", seedHex: "a".repeat(64) });
      expect(ky.publicKeyHex).toBe(eng.publicKey("Kx")!.publicKeyHex);
    });
  });

  describe("signing", () => {
    it("produces deterministic signature for same inputs", () => {
      const sig1 = eng.sign({
        bundleId: "B1",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "cad.bundle.v1", builder: "ci" },
        keyId: "K1",
      });
      const eng2 = new CADBundleSigningVersioningEngine({ clock });
      eng2.createKey({ keyId: "K1", seedHex: "a".repeat(64) });
      const sig2 = eng2.sign({
        bundleId: "B1",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "cad.bundle.v1", builder: "ci" },
        keyId: "K1",
      });
      expect(sig1.signatureHex).toBe(sig2.signatureHex);
    });

    it("rejects invalid semver", () => {
      expect(() =>
        eng.sign({
          bundleId: "B2",
          bundleDigestSha256: DIGEST("2"),
          version: "not.a.version",
          predicate: { predicateType: "p" },
          keyId: "K1",
        }),
      ).toThrow(/semver/);
    });

    it("rejects non-monotonic version", () => {
      eng.sign({
        bundleId: "B3",
        bundleDigestSha256: DIGEST("3"),
        version: "2.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      expect(() =>
        eng.sign({
          bundleId: "B3",
          bundleDigestSha256: DIGEST("4"),
          version: "1.5.0",
          predicate: { predicateType: "p" },
          keyId: "K1",
        }),
      ).toThrow(/Non-monotonic/);
    });

    it("enforces expected bump direction", () => {
      eng.sign({
        bundleId: "B4",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      expect(() =>
        eng.sign({
          bundleId: "B4",
          bundleDigestSha256: DIGEST("2"),
          version: "1.0.1",
          bump: "minor",
          predicate: { predicateType: "p" },
          keyId: "K1",
        }),
      ).toThrow(/minor bump/);
    });

    it("accepts valid minor bump", () => {
      eng.sign({
        bundleId: "B5",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      const sig2 = eng.sign({
        bundleId: "B5",
        bundleDigestSha256: DIGEST("2"),
        version: "1.1.0",
        bump: "minor",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      expect(sig2.version).toBe("1.1.0");
      expect(sig2.previousDigest).toBe(DIGEST("1"));
    });
  });

  describe("verification", () => {
    it("verify() passes for honest signature", () => {
      const sig = eng.sign({
        bundleId: "V1",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      const r = eng.verify(sig);
      expect(r.status).toBe("valid");
    });

    it("verify() fails on digest tamper", () => {
      const sig = eng.sign({
        bundleId: "V2",
        bundleDigestSha256: DIGEST("2"),
        version: "1.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      const tampered = { ...sig, bundleDigestSha256: DIGEST("3") };
      const r = eng.verify(tampered);
      expect(r.status).toBe("signature_mismatch");
    });

    it("verify() flags unknown key", () => {
      const sig = eng.sign({
        bundleId: "V3",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      const other = new CADBundleSigningVersioningEngine({ clock });
      const r = other.verify(sig);
      expect(r.status).toBe("unknown_key");
    });

    it("verify() with expectedDigest flags mismatch early", () => {
      const sig = eng.sign({
        bundleId: "V4",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      const r = eng.verify(sig, DIGEST("2"));
      expect(r.status).toBe("digest_mismatch");
    });
  });

  describe("chain verification", () => {
    it("verifyChain passes for 3 in-order signatures", () => {
      eng.sign({
        bundleId: "C1",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      eng.sign({
        bundleId: "C1",
        bundleDigestSha256: DIGEST("2"),
        version: "1.1.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      eng.sign({
        bundleId: "C1",
        bundleDigestSha256: DIGEST("3"),
        version: "2.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      const r = eng.verifyChain("C1");
      expect(r.status).toBe("valid");
      expect(r.reason).toMatch(/3 signatures/);
    });

    it("latest() returns most recent", () => {
      eng.sign({
        bundleId: "C2",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      const last = eng.sign({
        bundleId: "C2",
        bundleDigestSha256: DIGEST("2"),
        version: "1.1.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      expect(eng.latest("C2")?.version).toBe(last.version);
    });

    it("signaturesFor returns history", () => {
      eng.sign({
        bundleId: "C3",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      eng.sign({
        bundleId: "C3",
        bundleDigestSha256: DIGEST("2"),
        version: "1.0.1",
        predicate: { predicateType: "p" },
        keyId: "K1",
      });
      expect(eng.signaturesFor("C3").length).toBe(2);
    });
  });

  describe("metadata canonicalisation", () => {
    it("signatures match regardless of metadata insertion order", () => {
      const sig1 = eng.sign({
        bundleId: "M1",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: {
          predicateType: "cad.bundle.v1",
          metadata: { a: "1", b: "2", c: "3" },
        },
        keyId: "K1",
      });
      const eng2 = new CADBundleSigningVersioningEngine({ clock });
      eng2.createKey({ keyId: "K1", seedHex: "a".repeat(64) });
      const sig2 = eng2.sign({
        bundleId: "M1",
        bundleDigestSha256: DIGEST("1"),
        version: "1.0.0",
        predicate: {
          predicateType: "cad.bundle.v1",
          metadata: { c: "3", a: "1", b: "2" },
        },
        keyId: "K1",
      });
      expect(sig1.signatureHex).toBe(sig2.signatureHex);
    });
  });
});
