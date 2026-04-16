/**
 * CORS Integration Test — U-SH06
 *
 * Tests that the CORS middleware correctly handles:
 * 1. No origin (file:// protocol from Fusion 360 add-in panel)
 * 2. localhost origins (development)
 * 3. OPTIONS preflight requests
 * 4. Unknown origins in non-production mode
 */
import { describe, it, expect } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { corsMiddleware } from "../middleware/cors.js";

/** Create a mock Express request with optional origin header */
function mockReq(origin?: string | null, method = "GET"): Partial<Request> {
  const headers: Record<string, string> = {};
  if (origin !== null && origin !== undefined) {
    headers.origin = origin;
  }
  return { headers, method } as Partial<Request>;
}

/** Create a mock Express response that captures setHeader calls */
function mockRes(): { res: Partial<Response>; headers: Map<string, string>; state: { statusCode: number; ended: boolean } } {
  const headerMap = new Map<string, string>();
  const state = { statusCode: 200, ended: false };
  const res: Partial<Response> = {
    setHeader: ((key: string, value: string) => {
      headerMap.set(key.toLowerCase(), value);
      return res as Response;
    }) as any,
    status: ((code: number) => {
      state.statusCode = code;
      return res as Response;
    }) as any,
    end: (() => { state.ended = true; }) as any,
  };
  return { res, headers: headerMap, state };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CORS Middleware — Fusion Add-in Compatibility", () => {

  describe("null/no origin (Fusion 360 file:// protocol)", () => {
    it("allows requests with no origin header (file:// context)", () => {
      const req = mockReq(undefined); // no origin header at all
      const { res, headers, state } = mockRes();
      let nextCalled = false;
      corsMiddleware(req as Request, res as Response, (() => { nextCalled = true; }) as NextFunction);

      expect(headers.get("access-control-allow-origin")).toBe("*");
      expect(nextCalled).toBe(true);
    });

    it("allows requests with null origin header", () => {
      // Some browsers send `Origin: null` for file:// and data: URLs
      const req = mockReq(null);
      const { res, headers, state } = mockRes();
      let nextCalled = false;
      corsMiddleware(req as Request, res as Response, (() => { nextCalled = true; }) as NextFunction);

      // When origin is falsy (null/undefined), should set *
      expect(headers.get("access-control-allow-origin")).toBe("*");
      expect(nextCalled).toBe(true);
    });
  });

  describe("localhost origins (development)", () => {
    it("allows localhost:3000", () => {
      const req = mockReq("http://localhost:3000");
      const { res, headers, state } = mockRes();
      let nextCalled = false;
      corsMiddleware(req as Request, res as Response, (() => { nextCalled = true; }) as NextFunction);

      expect(headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
      expect(nextCalled).toBe(true);
    });

    it("allows localhost:5173 (Vite dev server)", () => {
      const req = mockReq("http://localhost:5173");
      const { res, headers, state } = mockRes();
      let nextCalled = false;
      corsMiddleware(req as Request, res as Response, (() => { nextCalled = true; }) as NextFunction);

      expect(headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
      expect(nextCalled).toBe(true);
    });

    it("allows 127.0.0.1:3000", () => {
      const req = mockReq("http://127.0.0.1:3000");
      const { res, headers, state } = mockRes();
      let nextCalled = false;
      corsMiddleware(req as Request, res as Response, (() => { nextCalled = true; }) as NextFunction);

      expect(headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:3000");
      expect(nextCalled).toBe(true);
    });
  });

  describe("CORS headers", () => {
    it("sets Allow-Methods with GET, POST, PUT, DELETE, OPTIONS", () => {
      const req = mockReq(undefined);
      const { res, headers, state } = mockRes();
      corsMiddleware(req as Request, res as Response, (() => {}) as NextFunction);

      const methods = headers.get("access-control-allow-methods") || "";
      expect(methods).toContain("GET");
      expect(methods).toContain("POST");
      expect(methods).toContain("OPTIONS");
    });

    it("sets Allow-Headers with Content-Type", () => {
      const req = mockReq(undefined);
      const { res, headers, state } = mockRes();
      corsMiddleware(req as Request, res as Response, (() => {}) as NextFunction);

      const allowedHeaders = headers.get("access-control-allow-headers") || "";
      expect(allowedHeaders).toContain("Content-Type");
    });

    it("sets Max-Age for preflight caching", () => {
      const req = mockReq(undefined);
      const { res, headers, state } = mockRes();
      corsMiddleware(req as Request, res as Response, (() => {}) as NextFunction);

      const maxAge = headers.get("access-control-max-age");
      expect(maxAge).toBeDefined();
      expect(parseInt(maxAge!)).toBeGreaterThan(0);
    });
  });

  describe("OPTIONS preflight", () => {
    it("responds 204 to OPTIONS requests", () => {
      const req = mockReq("http://localhost:3000", "OPTIONS");
      const { res, headers, state } = mockRes();
      let nextCalled = false;
      corsMiddleware(req as Request, res as Response, (() => { nextCalled = true; }) as NextFunction);

      expect(state.statusCode).toBe(204);
      expect(state.ended).toBe(true);
      expect(nextCalled).toBe(false); // should NOT call next for preflight
    });

    it("OPTIONS without origin still works (Fusion CEF)", () => {
      const req = mockReq(undefined, "OPTIONS");
      const { res, state } = mockRes();
      corsMiddleware(req as Request, res as Response, (() => {}) as NextFunction);

      expect(state.statusCode).toBe(204);
      expect(state.ended).toBe(true);
    });
  });

  describe("unknown origins", () => {
    it("non-production mode allows unknown origins", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      try {
        const req = mockReq("http://some-other-site.com");
        const { res, headers, state } = mockRes();
        let nextCalled = false;
        corsMiddleware(req as Request, res as Response, (() => { nextCalled = true; }) as NextFunction);

        // In non-production, should allow (the origin matches the dev mode check)
        expect(headers.get("access-control-allow-origin")).toBe("http://some-other-site.com");
        expect(nextCalled).toBe(true);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });
});
