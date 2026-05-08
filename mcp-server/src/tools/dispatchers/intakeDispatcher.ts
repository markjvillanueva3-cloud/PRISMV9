/**
 * PRISM Intake Dispatcher (prism_intake)
 * ======================================
 *
 * OBSIDIAN-COMPOUND-MS1/S3/U-CAPTURE-WEBHOOK
 *
 * Single action: webhook_ingest — accepts a base64-encoded raw body plus a
 * signature and a source enum, hands the bytes to IntakeWebhookEngine for
 * HMAC verify + rate limit + write to knowledge/memories/inbox/.
 *
 * The base64 wrapper exists so the MCP transport (JSON) can carry the EXACT
 * raw body bytes the HTTP route received — JSON.stringify drift would break
 * the HMAC signature.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_INTAKE_SCHEMAS } from "../../schemas/intakeActionSchemas.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatedServer = any;

const ACTIONS = ["webhook_ingest"] as const;

/** Registers prism_intake. */
export function registerIntakeDispatcher(server: McpServer): void {
  (server as ValidatedServer).tool(
    "prism_intake",
    "External personal-knowledge intake. Actions: webhook_ingest (HMAC-verified Readwise/Telegram/RSS/manual capture into knowledge/memories/inbox/).",
    {
      action: z.enum(ACTIONS).describe("Intake action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    },
    async (args: { action: string; params?: Record<string, any> }) => {
      const { action, params: rawParams = {} } = args;
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      const start = performance.now();

      const validation = validateActionParams(action, params, ACTION_INTAKE_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_intake"
        );
      }

      try {
        let result: unknown;
        switch (action) {
          case "webhook_ingest": {
            const { intakeWebhookEngine } = await import("../../engines/IntakeWebhookEngine.js");
            const b64 = typeof params.raw_body_b64 === "string"
              ? params.raw_body_b64
              : (typeof params.rawBodyB64 === "string" ? params.rawBodyB64 : "");
            if (!b64) {
              return dispatcherError("Missing 'raw_body_b64' parameter", action, "prism_intake");
            }
            let rawBody: Buffer;
            try {
              rawBody = Buffer.from(b64, "base64");
            } catch {
              return dispatcherError("'raw_body_b64' is not valid base64", action, "prism_intake");
            }
            const ingestResult = intakeWebhookEngine.ingest({
              rawBody,
              signature: typeof params.signature === "string" ? params.signature : undefined,
              source: typeof params.source === "string" ? params.source : "",
            });
            result = ingestResult;
            break;
          }
          default:
            result = { error: `Unknown action: ${action}`, available: ACTIONS };
        }

        const elapsed = (performance.now() - start).toFixed(1);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(slimResponse({ ...(result as Record<string, unknown>), _action: action, _elapsed_ms: elapsed })),
          }],
        };
      } catch (error) {
        return dispatcherError(error, action, "prism_intake");
      }
    }
  );

  log.info("[INTAKE_DISPATCH] prism_intake registered (1 action: webhook_ingest)");
}
