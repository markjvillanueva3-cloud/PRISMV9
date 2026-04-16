/**
 * PRISM MCP Server — Security Headers Middleware
 *
 * Adds OWASP-recommended security headers to all responses.
 * Equivalent to helmet.js but without the dependency.
 */
import type { Request, Response, NextFunction } from "express";

/**
 * Apply security headers to all responses.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Clickjacking protection
  res.setHeader("X-Frame-Options", "DENY");

  // XSS filter (legacy browsers)
  res.setHeader("X-XSS-Protection", "0");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy for API responses
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

  // Strict Transport Security (effective once behind HTTPS)
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Prevent caching of authenticated responses
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  // Remove server identification
  res.removeHeader("X-Powered-By");

  // Permissions policy — restrict browser features
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  next();
}
