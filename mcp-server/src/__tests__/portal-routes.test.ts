import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authEngine } from "../engines/AuthEngine.js";
import { quoteRevisionEngine } from "../engines/QuoteRevisionEngine.js";
import { registerRoutes } from "../routes/index.js";

let server: http.Server;
let port = 0;
let idSeq = 0;
let internalAuthHeaders: Record<string, string>;

function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`;
}

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: {
          ...(serialized
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(serialized).toString(),
              }
            : {}),
          ...(headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: text });
          }
        });
      },
    );
    req.on("error", reject);
    if (serialized) {
      req.write(serialized);
    }
    req.end();
  });
}

function portalRevisionInput(quoteId: string) {
  return {
    quote_id: quoteId,
    unit_price_usd: 45,
    total_price_usd: 4500,
    quantity: 100,
    quantity_breaks: [{ quantity: 250, unit_price: 38, total_price: 9500 }],
    lead_time_options: [{ tier: "standard", days: 14, unit_price: 45 }],
    dfm_score: 85,
    dfm_issues: [
      { severity: "warning", message: "Tight tolerance on bore" },
      { severity: "internal", message: "Fixture cost driver" },
    ],
  };
}

describe("Portal and milestone mounted routes", () => {
  beforeAll(async () => {
    const username = nextId("portal-admin");
    const password = "PortalAdmin123!";
    const registered = authEngine.register(username, password, ["admin"]);
    expect(registered.success).toBe(true);
    const login = authEngine.login(username, password);
    expect(login.success).toBe(true);
    expect(login.token).toBeDefined();
    internalAuthHeaders = {
      Authorization: `Bearer ${login.token!.access_token}`,
    };

    const app = express();
    app.use(express.json());
    registerRoutes(app, async () => ({ ok: true }));

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it("manages portal tokens and serves a quote view through the mounted public route", async () => {
    const quoteId = nextId("Q");
    quoteRevisionEngine.revise(portalRevisionInput(quoteId));
    const createResponse = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "quote",
      entity_id: quoteId,
      scope: ["view", "respond"],
      expires_in_days: 14,
      rate_limit: 12,
    }, internalAuthHeaders);

    expect(createResponse.status).toBe(200);
    expect(createResponse.data.data).toMatchObject({
      token_type: "quote",
      entity_id: quoteId,
      rate_limit: 12,
    });
    const token = createResponse.data.data.token as string;

    const listResponse = await httpRequest("GET", `/api/v1/portal/tokens/${encodeURIComponent(quoteId)}`, undefined, internalAuthHeaders);
    expect(listResponse.status).toBe(200);
    expect(listResponse.data.data).toHaveLength(1);
    expect(listResponse.data.data[0].token).toBe(token);

    const quoteView = await httpRequest("GET", `/api/v1/portal/quote/${encodeURIComponent(token)}`);
    expect(quoteView.status).toBe(200);
    expect(quoteView.data.data).toMatchObject({
      quote_id: quoteId,
      status: "draft",
      revision_number: 1,
      unit_price_usd: 45,
      total_price_usd: 4500,
      quantity: 100,
      dfm_score: 85,
    });
    expect(quoteView.data.data.quantity_breaks).toHaveLength(1);
    expect(quoteView.data.data.lead_time_options).toHaveLength(1);
    expect(quoteView.data.data.dfm_issues).toHaveLength(1);
    expect(quoteView.data.data.dfm_issues[0].severity).toBe("warning");

    const respondResponse = await httpRequest("POST", `/api/v1/portal/quote/${encodeURIComponent(token)}/respond`, {
      response: "accept",
      customer_name: "Acme Corp",
      message: "Looks good, release it.",
    });
    expect(respondResponse.status).toBe(200);
    expect(respondResponse.data.data).toMatchObject({
      recorded: true,
      response: "accept",
    });

    const revokeResponse = await httpRequest("DELETE", `/api/v1/portal/tokens/${encodeURIComponent(token)}`, undefined, internalAuthHeaders);
    expect(revokeResponse.status).toBe(200);
    expect(revokeResponse.data.data).toEqual({ revoked: true });

    const revokedQuoteView = await httpRequest("GET", `/api/v1/portal/quote/${encodeURIComponent(token)}`);
    expect(revokedQuoteView.status).toBe(403);
    expect(revokedQuoteView.data).toMatchObject({
      ok: false,
      error: "Token has been revoked",
    });
  });

  it("serves order milestones, approved quality docs, and customer messages through the public portal", async () => {
    const jobId = nextId("JOB-PORTAL");
    const orderTokenResponse = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "order",
      entity_id: jobId,
      scope: ["view", "documents", "messages"],
    }, internalAuthHeaders);
    const token = orderTokenResponse.data.data.token as string;

    const timelineResponse = await httpRequest("POST", "/api/v1/portal/milestones", {
      job_id: jobId,
      quote_id: nextId("Q"),
      customer_id: nextId("CUST"),
    }, internalAuthHeaders);
    expect(timelineResponse.status).toBe(200);
    expect(timelineResponse.data.data).toMatchObject({
      job_id: jobId,
      current_milestone: "quote_sent",
      total_milestones: 14,
    });

    const advanceResponse = await httpRequest("POST", `/api/v1/portal/milestones/${encodeURIComponent(jobId)}/advance`, {
      notes: "Customer accepted the quote",
      advanced_by: "planner",
    }, internalAuthHeaders);
    expect(advanceResponse.status).toBe(200);
    expect(advanceResponse.data.data.current_milestone).toBe("quote_accepted");

    const approvedDoc = await httpRequest("POST", "/api/v1/portal/quality-docs", {
      job_id: jobId,
      doc_type: "inspection_report",
      title: "Inspection packet",
      status: "approved",
    }, internalAuthHeaders);
    expect(approvedDoc.status).toBe(200);

    const draftDoc = await httpRequest("POST", "/api/v1/portal/quality-docs", {
      job_id: jobId,
      doc_type: "coc",
      title: "Certificate draft",
      status: "draft",
    }, internalAuthHeaders);
    expect(draftDoc.status).toBe(200);

    const orderStatus = await httpRequest("GET", `/api/v1/portal/order/${encodeURIComponent(token)}`);
    expect(orderStatus.status).toBe(200);
    expect(orderStatus.data.data).toMatchObject({
      job_id: jobId,
      current_milestone: "quote_accepted",
    });
    expect(orderStatus.data.data.milestones.length).toBeGreaterThan(0);

    const publicDocs = await httpRequest("GET", `/api/v1/portal/order/${encodeURIComponent(token)}/documents`);
    expect(publicDocs.status).toBe(200);
    expect(publicDocs.data.data).toHaveLength(1);
    expect(publicDocs.data.data[0]).toMatchObject({
      title: "Inspection packet",
      status: "approved",
    });

    const sendMessage = await httpRequest("POST", `/api/v1/portal/order/${encodeURIComponent(token)}/messages`, {
      sender_name: "Jamie Customer",
      message: "Can you confirm the next milestone?",
    });
    expect(sendMessage.status).toBe(200);
    expect(sendMessage.data.data).toMatchObject({
      entity_type: "order",
      entity_id: jobId,
      sender_type: "customer",
    });

    const listMessages = await httpRequest("GET", `/api/v1/portal/order/${encodeURIComponent(token)}/messages?limit=5`);
    expect(listMessages.status).toBe(200);
    expect(listMessages.data.data).toHaveLength(1);
    expect(listMessages.data.data[0].message).toBe("Can you confirm the next milestone?");

    const internalDocs = await httpRequest("GET", `/api/v1/portal/quality-docs/${encodeURIComponent(jobId)}`, undefined, internalAuthHeaders);
    expect(internalDocs.status).toBe(200);
    expect(internalDocs.data.data).toHaveLength(2);
  });

  it("creates, lists, escalates, and scores internal portal service cases", async () => {
    const entityId = nextId("JOB-SVC");

    const createdCase = await httpRequest("POST", "/api/v1/portal/service-cases", {
      entity_type: "order",
      entity_id: entityId,
      customer_id: nextId("CUST"),
      subject: "Delivery confidence check",
      summary: "Customer asked for a tighter ETA before approving dock scheduling.",
      severity: "high",
      owner: "customer-success",
      sla_hours: 24,
    }, internalAuthHeaders);

    expect(createdCase.status).toBe(200);
    expect(createdCase.data.data).toMatchObject({
      entity_type: "order",
      entity_id: entityId,
      subject: "Delivery confidence check",
      severity: "high",
      status: "waiting_on_shop",
      escalation_level: 0,
    });

    const caseId = createdCase.data.data.id as string;

    const listedCases = await httpRequest(
      "GET",
      `/api/v1/portal/service-cases/order/${encodeURIComponent(entityId)}`,
      undefined,
      internalAuthHeaders,
    );
    expect(listedCases.status).toBe(200);
    expect(listedCases.data.data).toHaveLength(1);

    const updatedCase = await httpRequest(
      "POST",
      `/api/v1/portal/service-cases/${encodeURIComponent(caseId)}/update`,
      {
        escalate: true,
        status: "resolved",
        satisfaction_score: 5,
      },
      internalAuthHeaders,
    );
    expect(updatedCase.status).toBe(200);
    expect(updatedCase.data.data).toMatchObject({
      id: caseId,
      status: "resolved",
      escalation_level: 1,
      satisfaction_score: 5,
    });
  });

  it("fails closed for invalid tokens, missing scope, and missing payloads", async () => {
    const noRevision = await httpRequest("GET", `/api/v1/portal/quote/${encodeURIComponent("missing-token")}`);
    expect(noRevision.status).toBe(403);
    expect(noRevision.data.ok).toBe(false);

    const quoteTokenResponse = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "quote",
      entity_id: nextId("Q"),
      scope: ["view"],
    }, internalAuthHeaders);
    const quoteToken = quoteTokenResponse.data.data.token as string;
    const quoteWithoutRevision = await httpRequest("GET", `/api/v1/portal/quote/${encodeURIComponent(quoteToken)}`);
    expect(quoteWithoutRevision.status).toBe(400);
    expect(quoteWithoutRevision.data).toMatchObject({
      ok: false,
      error: "Quote revision data unavailable for portal view",
    });

    const quoteTokenWithOrderScopesResponse = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "quote",
      entity_id: nextId("Q-WRONG-TYPE"),
      scope: ["view", "documents", "messages", "respond"],
    }, internalAuthHeaders);
    const quoteTokenWithOrderScopes = quoteTokenWithOrderScopesResponse.data.data.token as string;

    const quoteTokenOnOrderRoute = await httpRequest(
      "GET",
      `/api/v1/portal/order/${encodeURIComponent(quoteTokenWithOrderScopes)}/documents`,
    );
    expect(quoteTokenOnOrderRoute.status).toBe(400);
    expect(quoteTokenOnOrderRoute.data).toMatchObject({
      ok: false,
      error: "Token is not an order token",
    });

    const orderTokenResponse = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "order",
      entity_id: nextId("JOB-SCOPE"),
      scope: ["view"],
    }, internalAuthHeaders);
    const orderToken = orderTokenResponse.data.data.token as string;

    const missingScope = await httpRequest("GET", `/api/v1/portal/order/${encodeURIComponent(orderToken)}/messages`);
    expect(missingScope.status).toBe(403);
    expect(missingScope.data.ok).toBe(false);
    expect(missingScope.data.error).toContain("messages");

    const orderTokenWithMessagesResponse = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "order",
      entity_id: nextId("JOB-MISSING-FIELDS"),
      scope: ["view", "messages"],
    }, internalAuthHeaders);
    const orderTokenWithMessages = orderTokenWithMessagesResponse.data.data.token as string;

    const missingMessageFields = await httpRequest(
      "POST",
      `/api/v1/portal/order/${encodeURIComponent(orderTokenWithMessages)}/messages`,
      {
        sender_name: "",
        message: "",
      },
    );
    expect(missingMessageFields.status).toBe(400);
    expect(missingMessageFields.data).toMatchObject({
      ok: false,
      error: "sender_name and message are required",
    });

    const orderTokenWithRespondResponse = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "order",
      entity_id: nextId("JOB-WRONG-TYPE"),
      scope: ["view", "respond"],
    }, internalAuthHeaders);
    const orderTokenWithRespond = orderTokenWithRespondResponse.data.data.token as string;

    const orderTokenOnQuoteRoute = await httpRequest(
      "POST",
      `/api/v1/portal/quote/${encodeURIComponent(orderTokenWithRespond)}/respond`,
      {
        response: "accept",
        customer_name: "Portal Customer",
        message: "Trying the wrong token type",
      },
    );
    expect(orderTokenOnQuoteRoute.status).toBe(400);
    expect(orderTokenOnQuoteRoute.data).toMatchObject({
      ok: false,
      error: "Token is not a quote token",
    });

    const missingTimeline = await httpRequest("GET", `/api/v1/portal/milestones/${encodeURIComponent(nextId("JOB-MISSING"))}`);
    expect(missingTimeline.status).toBe(401);
    expect(missingTimeline.data).toMatchObject({
      error: { code: "AUTH_REQUIRED" },
    });

    const missingTimelineWithAuth = await httpRequest(
      "GET",
      `/api/v1/portal/milestones/${encodeURIComponent(nextId("JOB-MISSING-AUTH"))}`,
      undefined,
      internalAuthHeaders,
    );
    expect(missingTimelineWithAuth.status).toBe(404);
    expect(missingTimelineWithAuth.data).toMatchObject({
      ok: false,
      error: "No timeline found for this job",
    });
  });

  it("requires PRISM auth for internal portal routes", async () => {
    const quoteId = nextId("Q-INTERNAL");

    const unauthenticatedCreate = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "quote",
      entity_id: quoteId,
    });
    expect(unauthenticatedCreate.status).toBe(401);
    expect(unauthenticatedCreate.data.error.code).toBe("AUTH_REQUIRED");

    const unauthenticatedList = await httpRequest("GET", `/api/v1/portal/tokens/${encodeURIComponent(quoteId)}`);
    expect(unauthenticatedList.status).toBe(401);
    expect(unauthenticatedList.data.error.code).toBe("AUTH_REQUIRED");

    const unauthenticatedMilestones = await httpRequest("POST", "/api/v1/portal/milestones", {
      job_id: nextId("JOB-NOAUTH"),
      quote_id: nextId("Q"),
      customer_id: nextId("CUST"),
    });
    expect(unauthenticatedMilestones.status).toBe(401);
    expect(unauthenticatedMilestones.data.error.code).toBe("AUTH_REQUIRED");

    const unauthenticatedQualityDocs = await httpRequest("POST", "/api/v1/portal/quality-docs", {
      job_id: nextId("JOB-DOC"),
      doc_type: "coc",
      title: "Certificate",
    });
    expect(unauthenticatedQualityDocs.status).toBe(401);
    expect(unauthenticatedQualityDocs.data.error.code).toBe("AUTH_REQUIRED");
  });

  it("fails closed when a quote token has no revision authority behind it", async () => {
    const quoteTokenResponse = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "quote",
      entity_id: nextId("Q-NOREV"),
      scope: ["view"],
    }, internalAuthHeaders);
    const quoteToken = quoteTokenResponse.data.data.token as string;

    const quoteWithoutRevision = await httpRequest("GET", `/api/v1/portal/quote/${encodeURIComponent(quoteToken)}`);
    expect(quoteWithoutRevision.status).toBe(400);
    expect(quoteWithoutRevision.data).toMatchObject({
      ok: false,
      error: "Quote revision data unavailable for portal view",
    });
  });

  it("fails closed on malformed internal portal payloads", async () => {
    const badToken = await httpRequest("POST", "/api/v1/portal/tokens", {
      token_type: "order",
      entity_id: "",
    }, internalAuthHeaders);
    expect(badToken.status).toBe(400);
    expect(badToken.data.ok).toBe(false);

    const badMilestone = await httpRequest("POST", "/api/v1/portal/milestones", {
      job_id: nextId("JOB-BAD"),
      start_at_milestone: "nonexistent_key",
    }, internalAuthHeaders);
    expect(badMilestone.status).toBe(400);
    expect(badMilestone.data.ok).toBe(false);

    const badQualityDoc = await httpRequest("POST", "/api/v1/portal/quality-docs", {
      job_id: "",
      doc_type: "coc",
      title: "",
    }, internalAuthHeaders);
    expect(badQualityDoc.status).toBe(400);
    expect(badQualityDoc.data.ok).toBe(false);
  });
});
