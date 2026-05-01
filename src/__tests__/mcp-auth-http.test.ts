import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  buildMcpDiscoveryDocument,
  registerOAuthHttpRoutes,
} from "../mcp/authHttp.js";
import {
  computeCodeChallenge,
  generateCodeVerifier,
  resetOAuthServer,
} from "../mcp/auth.js";
import { resetAuthConfig } from "../mcp/authConfig.js";

let server: http.Server;
let port = 0;

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: serialized
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(serialized).toString(),
            }
          : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({
              status: res.statusCode ?? 0,
              data: text ? JSON.parse(text) : null,
              headers: res.headers,
            });
          } catch {
            resolve({
              status: res.statusCode ?? 0,
              data: text,
              headers: res.headers,
            });
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

describe("MCP OAuth HTTP contract", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerOAuthHttpRoutes(app);

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

  beforeEach(async () => {
    process.env.PRISM_JWT_SECRET = "prism-http-test-secret-must-be-at-least-32chars!!";
    process.env.PRISM_AUTH_ENABLED = "true";
    process.env.PRISM_AUTH_ISSUER = `http://127.0.0.1:${port}`;
    resetAuthConfig();
    await resetOAuthServer();
  });

  it("builds MCP discovery with conditional oauth metadata", () => {
    const discovery = buildMcpDiscoveryDocument(`http://127.0.0.1:${port}`) as {
      authentication?: Record<string, string>;
    };

    expect(discovery.authentication?.authorizationUrl).toBe(
      `http://127.0.0.1:${port}/oauth/authorize`,
    );
    expect(discovery.authentication?.tokenUrl).toBe(
      `http://127.0.0.1:${port}/oauth/token`,
    );
  });

  it("serves OAuth discovery, authorize, token, introspect, and revoke endpoints", async () => {
    const metadata = await httpRequest("GET", "/.well-known/oauth-authorization-server");
    expect(metadata.status).toBe(200);
    expect(metadata.data.issuer).toBe(`http://127.0.0.1:${port}`);
    expect(metadata.data.authorization_endpoint).toBe(
      `http://127.0.0.1:${port}/oauth/authorize`,
    );

    const protectedResource = await httpRequest("GET", "/.well-known/oauth-protected-resource");
    expect(protectedResource.status).toBe(200);
    expect(protectedResource.data.resource).toBe(`http://127.0.0.1:${port}/mcp`);

    const discoveryAlias = await httpRequest("GET", "/oauth/discovery");
    expect(discoveryAlias.status).toBe(200);
    expect(discoveryAlias.data.token_endpoint).toBe(
      `http://127.0.0.1:${port}/oauth/token`,
    );

    const verifier = generateCodeVerifier();
    const challenge = computeCodeChallenge(verifier);
    const authorize = await httpRequest(
      "GET",
      `/oauth/authorize?response_type=code&client_id=prism-web&redirect_uri=${encodeURIComponent("http://localhost:3000/callback")}&scope=${encodeURIComponent("read operate program")}&code_challenge=${challenge}&code_challenge_method=S256&state=abc123`,
    );
    expect(authorize.status).toBe(302);
    expect(String(authorize.headers.location)).toContain("http://localhost:3000/callback");
    expect(String(authorize.headers.location)).toContain("state=abc123");

    const redirectUrl = new URL(String(authorize.headers.location));
    const code = redirectUrl.searchParams.get("code");
    expect(code).toBeTruthy();

    const token = await httpRequest("POST", "/oauth/token", {
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: "prism-web",
      redirect_uri: "http://localhost:3000/callback",
    });
    expect(token.status).toBe(200);
    expect(token.data.token_type).toBe("Bearer");
    expect(token.data.access_token).toBeTruthy();
    expect(token.data.refresh_token).toBeTruthy();

    const introspect = await httpRequest("POST", "/oauth/introspect", {
      token: token.data.access_token,
    });
    expect(introspect.status).toBe(200);
    expect(introspect.data.active).toBe(true);
    expect(introspect.data.sub).toBe("prism-local-admin");
    expect(introspect.data.iss).toBe(`http://127.0.0.1:${port}`);

    const revoke = await httpRequest("POST", "/oauth/revoke", {
      token: token.data.refresh_token,
    });
    expect(revoke.status).toBe(200);
    expect(revoke.data).toMatchObject({ revoked: true });
  });
});
