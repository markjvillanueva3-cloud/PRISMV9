/**
 * PRISM MCP Server — Intake Routes
 *
 * OBSIDIAN-COMPOUND-MS1/S3/U-CAPTURE-WEBHOOK
 *
 * Single endpoint: POST /api/intake/webhook
 *
 * Accepts external personal-knowledge sources (Readwise, Telegram, RSS,
 * manual) authenticated via HMAC-SHA256. Hands the raw body bytes to
 * IntakeWebhookEngine.ingest() — the engine owns all validation,
 * rate-limiting, and on-disk write logic.
 *
 * Body parser configuration:
 *   - express.raw({ limit: '256kb' }) caps body size BEFORE parsing and
 *     preserves the exact bytes for HMAC verification (JSON.stringify
 *     drift would break the signature).
 */
import { Router, raw as rawParser } from "express";
import { intakeWebhookEngine, PAYLOAD_CAP_BYTES } from "../engines/IntakeWebhookEngine.js";

/** Creates intake router. */
export function createIntakeRouter(): Router {
  const router = Router();

  router.post(
    "/webhook",
    rawParser({ type: "*/*", limit: PAYLOAD_CAP_BYTES }),
    (req, res) => {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      const signature = req.header("X-Intake-Signature") ?? undefined;
      const source = typeof req.query.source === "string"
        ? req.query.source
        : "";

      const result = intakeWebhookEngine.ingest({ rawBody, signature, source });

      // Never leak internal file paths in error responses; return error string only.
      if (!result.ok) {
        res.status(result.status).json({ ok: false, error: result.error });
        return;
      }
      res.status(200).json({ ok: true, source: result.source });
    }
  );

  return router;
}
