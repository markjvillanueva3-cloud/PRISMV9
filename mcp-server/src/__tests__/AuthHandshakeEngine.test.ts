/** AuthHandshakeEngine tests — HMPI08. */
import { describe, it, expect } from "vitest";
import { AuthHandshakeEngine } from "../engines/AuthHandshakeEngine.js";

const T0 = "2026-05-24T13:00:00.000Z";
const T10S = "2026-05-24T13:00:10.000Z";
const T40S = "2026-05-24T13:00:40.000Z"; // past 30s timeout
const PLUGIN = "p1";

describe("AuthHandshakeEngine — happy path", () => {
  it("initial state is idle with 0 attempts", () => {
    const r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    expect(r.state).toBe("idle");
    expect(r.attempt_count).toBe(0);
  });

  it("idle → challenged increments attempt_count + sets nonce", () => {
    const r = AuthHandshakeEngine.challenge(AuthHandshakeEngine.initial("h1", PLUGIN, T0), "n1", T0);
    expect(r.state).toBe("challenged");
    expect(r.nonce).toBe("n1");
    expect(r.attempt_count).toBe(1);
  });

  it("challenged → responded within timeout", () => {
    let r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    r = AuthHandshakeEngine.challenge(r, "n1", T0);
    r = AuthHandshakeEngine.respond(r, T10S);
    expect(r.state).toBe("responded");
  });

  it("responded → verified (ok=true)", () => {
    let r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    r = AuthHandshakeEngine.challenge(r, "n1", T0);
    r = AuthHandshakeEngine.respond(r, T10S);
    r = AuthHandshakeEngine.verify(r, true, T10S);
    expect(r.state).toBe("verified");
    expect(r.finalized_at).toBe(T10S);
  });

  it("responded → failed (ok=false) with reason", () => {
    let r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    r = AuthHandshakeEngine.challenge(r, "n1", T0);
    r = AuthHandshakeEngine.respond(r, T10S);
    r = AuthHandshakeEngine.verify(r, false, T10S, "bad signature");
    expect(r.state).toBe("failed");
    expect(r.failure_reason).toBe("bad signature");
  });
});

describe("AuthHandshakeEngine — failure modes", () => {
  it("challenge from non-idle/non-challenged state throws", () => {
    let r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    r = AuthHandshakeEngine.challenge(r, "n1", T0);
    r = AuthHandshakeEngine.respond(r, T10S);
    expect(() => AuthHandshakeEngine.challenge(r, "n2", T10S)).toThrow();
  });

  it("respond from non-challenged state throws", () => {
    const r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    expect(() => AuthHandshakeEngine.respond(r, T0)).toThrow();
  });

  it("verify from non-responded state throws", () => {
    let r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    r = AuthHandshakeEngine.challenge(r, "n1", T0);
    expect(() => AuthHandshakeEngine.verify(r, true, T0)).toThrow();
  });

  it("max attempts triggers failed state on next challenge", () => {
    let r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    for (let i = 0; i < 5; i += 1) r = AuthHandshakeEngine.challenge(r, `n${i}`, T0);
    // 6th attempt → failed
    r = AuthHandshakeEngine.challenge(r, "n6", T0);
    expect(r.state).toBe("failed");
    expect(r.failure_reason).toContain("max attempts");
  });

  it("respond after timeout → failed with timeout reason", () => {
    let r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    r = AuthHandshakeEngine.challenge(r, "n1", T0);
    r = AuthHandshakeEngine.respond(r, T40S);
    expect(r.state).toBe("failed");
    expect(r.failure_reason).toContain("timeout");
  });

  it("renderRecord shows verified state", () => {
    let r = AuthHandshakeEngine.initial("h1", PLUGIN, T0);
    r = AuthHandshakeEngine.challenge(r, "n1", T0);
    r = AuthHandshakeEngine.respond(r, T10S);
    r = AuthHandshakeEngine.verify(r, true, T10S);
    const md = AuthHandshakeEngine.renderRecord(r);
    expect(md.includes("[AUTH VERIFIED]")).toBe(true);
    expect(md.includes("h1")).toBe(true);
    expect(md.includes(PLUGIN)).toBe(true);
  });
});
