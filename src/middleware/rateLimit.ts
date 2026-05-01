/**
 * PRISM MCP Server — Rate Limit Middleware
 * *** SECURITY CRITICAL ***
 *
 * Express middleware wiring for RateLimitEngine.
 * Applies per-IP, per-user, or per-endpoint rate limiting.
 *
 * Usage:
 *   app.use("/api", rateLimitMiddleware("RL-API-GLOBAL", "global"))
 *   router.post("/login", rateLimitMiddleware("RL-AUTH", "ip"), handler)
 */
import type { Request, Response, NextFunction } from "express";
import { rateLimitEngine } from "../engines/RateLimitEngine.js";

type KeyExtractor = "ip" | "user" | "global";

/**
 * Create rate limit middleware for a given rule.
 * @param ruleId - Rate limit rule ID (from RateLimitEngine defaults or custom)
 * @param keyFrom - How to derive the rate limit key: "ip", "user", or "global"
 */
export function rateLimitMiddleware(ruleId: string, keyFrom: KeyExtractor = "ip") {
  return (req: Request, res: Response, next: NextFunction): void => {
    let key: string;
    switch (keyFrom) {
      case "ip":
        key = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace("::ffff:", "");
        break;
      case "user":
        key = req.userId ?? req.ip ?? "anonymous";
        break;
      case "global":
        key = "global";
        break;
    }

    const result = rateLimitEngine.consume(ruleId, key);

    // Set standard rate limit headers
    res.setHeader("X-RateLimit-Limit", String(result.limit));
    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    res.setHeader("X-RateLimit-Reset", result.reset_at);

    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retry_after_sec));
      res.status(429).json({
        error: {
          status: 429,
          message: "Too many requests",
          code: "RATE_LIMITED",
          retry_after_sec: result.retry_after_sec,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
