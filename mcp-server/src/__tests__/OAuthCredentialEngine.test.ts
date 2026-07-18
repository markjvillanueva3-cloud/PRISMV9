/**
 * OAuthCredentialEngine tests — HMPI02.
 */
import { describe, it, expect } from "vitest";
import { OAuthCredentialEngine } from "../engines/OAuthCredentialEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const IN_2H = "2026-05-24T15:00:00.000Z";
const IN_30M = "2026-05-24T13:30:00.000Z";
const PAST = "2026-05-24T12:00:00.000Z";

describe("OAuthCredentialEngine.initial / authorize", () => {
  it("initial state is not-authorized with 0 failures", () => {
    const s = OAuthCredentialEngine.initial("github");
    expect(s.status).toBe("not-authorized");
    expect(s.refresh_failure_count).toBe(0);
  });

  it("authorize sets status=authorized + records expires + last_refreshed", () => {
    const s = OAuthCredentialEngine.authorize(OAuthCredentialEngine.initial("g"), IN_2H, ISO);
    expect(s.status).toBe("authorized");
    expect(s.expires_at).toBe(IN_2H);
    expect(s.last_refreshed_at).toBe(ISO);
    expect(s.refresh_failure_count).toBe(0);
  });
});

describe("OAuthCredentialEngine.reevaluate — expiry transitions", () => {
  it("authorized stays authorized when >1h until expiry", () => {
    let s = OAuthCredentialEngine.authorize(OAuthCredentialEngine.initial("g"), IN_2H, ISO);
    s = OAuthCredentialEngine.reevaluate(s, ISO);
    expect(s.status).toBe("authorized");
  });

  it("transitions to expiring-soon when ≤1h until expiry", () => {
    let s = OAuthCredentialEngine.authorize(OAuthCredentialEngine.initial("g"), IN_30M, ISO);
    s = OAuthCredentialEngine.reevaluate(s, ISO);
    expect(s.status).toBe("expiring-soon");
  });

  it("transitions to expired when expires_at in the past", () => {
    let s = OAuthCredentialEngine.authorize(OAuthCredentialEngine.initial("g"), PAST, ISO);
    s = OAuthCredentialEngine.reevaluate(s, ISO);
    expect(s.status).toBe("expired");
  });
});

describe("OAuthCredentialEngine.recordRefreshFailure", () => {
  it("increments failure count without status change until threshold", () => {
    let s = OAuthCredentialEngine.authorize(OAuthCredentialEngine.initial("g"), IN_2H, ISO);
    for (let i = 0; i < 4; i += 1) s = OAuthCredentialEngine.recordRefreshFailure(s);
    expect(s.refresh_failure_count).toBe(4);
    expect(s.status).toBe("authorized");
  });

  it("flips to refresh-failed at 5 failures", () => {
    let s = OAuthCredentialEngine.authorize(OAuthCredentialEngine.initial("g"), IN_2H, ISO);
    for (let i = 0; i < 5; i += 1) s = OAuthCredentialEngine.recordRefreshFailure(s);
    expect(s.status).toBe("refresh-failed");
    expect(s.refresh_failure_count).toBe(5);
  });
});

describe("OAuthCredentialEngine.revoke — terminal", () => {
  it("revoke sets status=revoked", () => {
    const s = OAuthCredentialEngine.revoke(OAuthCredentialEngine.initial("g"));
    expect(s.status).toBe("revoked");
  });

  it("reevaluate is a no-op on revoked credentials", () => {
    const s = OAuthCredentialEngine.revoke(OAuthCredentialEngine.initial("g"));
    expect(OAuthCredentialEngine.reevaluate(s, ISO).status).toBe("revoked");
  });

  it("reevaluate is a no-op on refresh-failed credentials", () => {
    let s = OAuthCredentialEngine.authorize(OAuthCredentialEngine.initial("g"), IN_2H, ISO);
    for (let i = 0; i < 5; i += 1) s = OAuthCredentialEngine.recordRefreshFailure(s);
    expect(OAuthCredentialEngine.reevaluate(s, ISO).status).toBe("refresh-failed");
  });
});

describe("OAuthCredentialEngine.renderState", () => {
  it("emits server_id + status + failures + expires", () => {
    const s = OAuthCredentialEngine.authorize(OAuthCredentialEngine.initial("github"), IN_2H, ISO);
    const md = OAuthCredentialEngine.renderState(s);
    expect(md.includes("[OAUTH] github")).toBe(true);
    expect(md.includes("authorized")).toBe(true);
    expect(md.includes("failures=0")).toBe(true);
  });

  it("rejects unknown status enum (zod adversarial)", () => {
    expect(() => OAuthCredentialEngine.validate({
      server_id: "g", status: "yolo", refresh_failure_count: 0,
    })).toThrow();
  });
});
