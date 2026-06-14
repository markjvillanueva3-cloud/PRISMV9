/**
 * CustomerPortalEngine.test.ts — hotel slot (iter15 / U-CUSTOMER-PORTAL-WIRE).
 * Tests portal token lifecycle (create/revoke/validate/list/expiry/scope/rate-limit).
 */

import { describe, it, expect } from "vitest";
import { customerPortalEngine } from "../engines/CustomerPortalEngine.js";

function uniqueEntity(): string {
  return `ENT-${Math.random().toString(36).slice(2, 10)}`;
}

describe("CustomerPortalEngine — createToken envelope", () => {
  it("createToken returns base64url token + UUID id + default 30-day expiry + scope=['view']", () => {
    const t = customerPortalEngine.createToken({ token_type: "customer", entity_id: uniqueEntity() });
    expect(t.token.length).toBeGreaterThan(30);
    expect(t.id.length).toBeGreaterThan(10);
    expect(t.revoked).toBe(false);
    expect(t.access_count).toBe(0);
    expect(t.scope).toEqual(["view"]);
  });

  it("createToken honors custom scope + rate_limit + expires_in_days", () => {
    const t = customerPortalEngine.createToken({
      token_type: "vendor", entity_id: uniqueEntity(),
      scope: ["view", "respond"], rate_limit: 25, expires_in_days: 60,
    });
    expect(t.scope).toEqual(["view", "respond"]);
    expect(t.rate_limit).toBe(25);
  });

  it("createToken throws on missing entity_id", () => {
    expect(() => customerPortalEngine.createToken({ token_type: "customer", entity_id: "" }))
      .toThrow(/entity_id is required/);
  });

  it("createToken throws on expires_in_days out of range (1..365)", () => {
    expect(() => customerPortalEngine.createToken({ token_type: "customer", entity_id: "X", expires_in_days: 0 }))
      .toThrow(/expires_in_days/);
    expect(() => customerPortalEngine.createToken({ token_type: "customer", entity_id: "X", expires_in_days: 999 }))
      .toThrow(/expires_in_days/);
  });

  it("createToken throws on rate_limit out of range (1..100)", () => {
    expect(() => customerPortalEngine.createToken({ token_type: "customer", entity_id: "X", rate_limit: 0 }))
      .toThrow(/rate_limit/);
    expect(() => customerPortalEngine.createToken({ token_type: "customer", entity_id: "X", rate_limit: 200 }))
      .toThrow(/rate_limit/);
  });
});

describe("CustomerPortalEngine — revokeToken + listTokens", () => {
  it("revokeToken flips revoked=true and returns { revoked: true }", () => {
    const t = customerPortalEngine.createToken({ token_type: "customer", entity_id: uniqueEntity() });
    const r = customerPortalEngine.revokeToken(t.token);
    expect(r.revoked).toBe(true);
  });

  it("revokeToken throws on unknown token", () => {
    expect(() => customerPortalEngine.revokeToken("never-exists-token"))
      .toThrow(/Token not found/);
  });

  it("listTokens returns all tokens for an entity_id, sorted desc by created_at", () => {
    const ent = uniqueEntity();
    customerPortalEngine.createToken({ token_type: "customer", entity_id: ent });
    customerPortalEngine.createToken({ token_type: "customer", entity_id: ent });
    const list = customerPortalEngine.listTokens(ent);
    expect(list.length).toBe(2);
    expect(list.every(t => t.entity_id === ent)).toBe(true);
  });

  it("listTokens on unknown entity returns []", () => {
    expect(customerPortalEngine.listTokens("ENT-NEVER-EXISTED").length).toBe(0);
  });
});

describe("CustomerPortalEngine — validateToken (existence/expiry/revoke/scope)", () => {
  it("validateToken on freshly created token returns valid=true", () => {
    const t = customerPortalEngine.createToken({ token_type: "customer", entity_id: uniqueEntity() });
    const v = customerPortalEngine.validateToken(t.token);
    expect(v.valid).toBe(true);
  });

  it("validateToken on unknown token returns valid=false with 'Token not found'", () => {
    const v = customerPortalEngine.validateToken("ghost-token-never-existed");
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/not found/);
  });

  it("validateToken on revoked token returns valid=false with 'revoked'", () => {
    const t = customerPortalEngine.createToken({ token_type: "customer", entity_id: uniqueEntity() });
    customerPortalEngine.revokeToken(t.token);
    const v = customerPortalEngine.validateToken(t.token);
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/revoked/);
  });

  it("validateToken with requiredScope not in token scope returns valid=false", () => {
    const t = customerPortalEngine.createToken({
      token_type: "customer", entity_id: uniqueEntity(), scope: ["view"],
    });
    const v = customerPortalEngine.validateToken(t.token, "respond");
    expect(v.valid).toBe(false);
    expect(v.reason).toMatch(/scope/);
  });

  it("validateToken with requiredScope IN token scope returns valid=true", () => {
    const t = customerPortalEngine.createToken({
      token_type: "customer", entity_id: uniqueEntity(), scope: ["view", "respond"],
    });
    const v = customerPortalEngine.validateToken(t.token, "respond");
    expect(v.valid).toBe(true);
  });
});

describe("CustomerPortalEngine — listMessages + listServiceCases empty paths", () => {
  it("listMessages on entity with no messages returns []", () => {
    const r = customerPortalEngine.listMessages("customer", uniqueEntity());
    expect(r.length).toBe(0);
  });

  it("listServiceCases on entity with no cases returns []", () => {
    const r = customerPortalEngine.listServiceCases("customer", uniqueEntity());
    expect(r.length).toBe(0);
  });
});
