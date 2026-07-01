/** WebhookSubscriptionEngine tests — HMPI12. */
import { describe, it, expect } from "vitest";
import {
  WebhookSubscriptionEngine,
  type WebhookSubscription,
} from "../engines/WebhookSubscriptionEngine.js";

const T0 = "2026-05-24T13:00:00.000Z";

const mk = (over: Partial<WebhookSubscription> = {}): WebhookSubscription => ({
  subscription_id: "s1",
  tenant_id: "t1",
  url: "https://example.com/hook",
  event: "order.created",
  active: true,
  created_at: T0,
  ...over,
});

describe("WebhookSubscriptionEngine.checkAdd — happy path", () => {
  it("valid https subscription → valid=true", () => {
    const v = WebhookSubscriptionEngine.checkAdd([], mk());
    expect(v.valid).toBe(true);
    expect(v.errors).toEqual([]);
  });

  it("renderVerdict shows [WEBHOOK OK] on valid", () => {
    const md = WebhookSubscriptionEngine.renderVerdict(WebhookSubscriptionEngine.checkAdd([], mk()));
    expect(md.includes("[WEBHOOK OK]")).toBe(true);
  });

  it("http allowed when test_mode=true", () => {
    const v = WebhookSubscriptionEngine.checkAdd(
      [],
      mk({ url: "http://localhost:9000/hook", test_mode: true }),
    );
    expect(v.valid).toBe(true);
  });
});

describe("WebhookSubscriptionEngine.checkAdd — security rejections", () => {
  it("http without test_mode → rejected", () => {
    const v = WebhookSubscriptionEngine.checkAdd([], mk({ url: "http://x.com/hook" }));
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes("test_mode"))).toBe(true);
  });

  it("ftp scheme → rejected", () => {
    const v = WebhookSubscriptionEngine.checkAdd([], mk({ url: "ftp://x.com/hook" }));
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes("scheme"))).toBe(true);
  });

  it("duplicate (url, event) active for same tenant → rejected", () => {
    const existing = [mk()];
    const v = WebhookSubscriptionEngine.checkAdd(existing, mk({ subscription_id: "s2" }));
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes("duplicate"))).toBe(true);
  });

  it("different tenant with same url+event → allowed", () => {
    const existing = [mk()];
    const v = WebhookSubscriptionEngine.checkAdd(existing, mk({ subscription_id: "s2", tenant_id: "t2" }));
    expect(v.valid).toBe(true);
  });
});

describe("WebhookSubscriptionEngine.checkAdd — caps + warnings", () => {
  it("tenant at MAX_PER_TENANT cap → rejected", () => {
    const existing: WebhookSubscription[] = Array.from({ length: 50 }, (_, i) =>
      mk({ subscription_id: `s${i}`, event: `e${i}` }),
    );
    const v = WebhookSubscriptionEngine.checkAdd(
      existing,
      mk({ subscription_id: "snew", event: "enew" }),
    );
    expect(v.valid).toBe(false);
    expect(v.errors.some((e) => e.includes("cap"))).toBe(true);
  });

  it("inactive subscriptions do not count toward cap", () => {
    const existing: WebhookSubscription[] = Array.from({ length: 50 }, (_, i) =>
      mk({ subscription_id: `s${i}`, event: `e${i}`, active: false }),
    );
    const v = WebhookSubscriptionEngine.checkAdd(
      existing,
      mk({ subscription_id: "snew", event: "enew" }),
    );
    expect(v.valid).toBe(true);
  });

  it("unusually long url → warning, not error", () => {
    const longUrl = "https://example.com/" + "a".repeat(600);
    const v = WebhookSubscriptionEngine.checkAdd([], mk({ url: longUrl }));
    expect(v.valid).toBe(true);
    expect(v.warnings.length).toBeGreaterThan(0);
  });
});

describe("WebhookSubscriptionEngine — schema rejection", () => {
  it("rejects empty url", () => {
    expect(() => WebhookSubscriptionEngine.validate({ ...mk(), url: "" })).toThrow();
  });

  it("rejects non-array existing", () => {
    expect(() => WebhookSubscriptionEngine.checkAdd(null as never, mk())).toThrow();
  });

  it("renderVerdict on rejected lists error count", () => {
    const md = WebhookSubscriptionEngine.renderVerdict(
      WebhookSubscriptionEngine.checkAdd([], mk({ url: "ftp://x.com/h" })),
    );
    expect(md.includes("[WEBHOOK REJECTED]")).toBe(true);
    expect(md.includes("errors=")).toBe(true);
  });
});
