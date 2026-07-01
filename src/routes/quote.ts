/**
 * PRISM MCP Server — Quote Compatibility Routes
 *
 * The frontend still calls bare /api/v1/quote/* endpoints while the backend
 * evolved into /quotes, /erp/quote, and dispatcher-backed specialty routes.
 * This router preserves the bare-path contract so current web desks can
 * converge on the live backend without a broad client rewrite.
 */
import { Router } from "express";
import type { Response } from "express";
import type { CallToolFn } from "./index.js";

type QuoteMeta = {
  formula_used: string;
  uncertainty: number;
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorPayload(value: unknown): value is { error: string } {
  return isObjectLike(value) && typeof value["error"] === "string" && Object.keys(value).length === 1;
}

function sendCompatResponse(res: Response, result: unknown): void {
  if (isErrorPayload(result)) {
    res.status(500).json({
      ok: false,
      error: result.error,
      result: null,
      data: null,
    });
    return;
  }

  const safety = isObjectLike(result) && isObjectLike(result["safety"])
    ? result["safety"]
    : { score: 1, warnings: [] };
  const meta = isObjectLike(result) && isObjectLike(result["meta"])
    ? result["meta"]
    : ({ formula_used: "quote-route-compat", uncertainty: 0 } satisfies QuoteMeta);

  res.json({
    ok: true,
    result,
    data: result,
    safety,
    meta,
  });
}

function quotePost(callTool: CallToolFn, action: string) {
  return async (req: any, res: Response) => {
    try {
      const result = await callTool("prism_business", action, req.body ?? {});
      sendCompatResponse(res, result);
    } catch (e: any) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        result: null,
        data: null,
      });
    }
  };
}

function quoteGet(callTool: CallToolFn, action: string) {
  return async (_req: any, res: Response) => {
    try {
      const result = await callTool("prism_business", action, {});
      sendCompatResponse(res, result);
    } catch (e: any) {
      res.status(500).json({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        result: null,
        data: null,
      });
    }
  };
}

export function createQuoteRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.post("/generate", quotePost(callTool, "quoting_generate"));
  router.post("/price-breaks", quotePost(callTool, "quoting_price_breaks"));

  router.post("/estimate", quotePost(callTool, "quote_estimate"));
  router.post("/compare-materials", quotePost(callTool, "quote_compare_materials"));
  router.post("/what-if", quotePost(callTool, "quote_what_if"));

  router.post("/analytics-record", quotePost(callTool, "analytics_record"));
  router.post("/analytics-update-outcome", quotePost(callTool, "analytics_update_outcome"));
  router.post("/analytics-record-actuals", quotePost(callTool, "analytics_record_actuals"));
  router.post("/analytics-accuracy", quotePost(callTool, "analytics_accuracy"));
  router.get("/analytics-conversion", quoteGet(callTool, "analytics_conversion"));
  router.get("/analytics-calibration", quoteGet(callTool, "analytics_calibration"));

  router.post("/blueprint", quotePost(callTool, "blueprint_to_quote"));
  router.post("/blueprint-resolve-material", quotePost(callTool, "blueprint_resolve_material"));

  router.post("/sec-ops-list", quotePost(callTool, "sec_ops_list"));
  router.post("/sec-ops-quote", quotePost(callTool, "sec_ops_quote"));
  router.post("/sec-ops-batch", quotePost(callTool, "sec_ops_batch_quote"));
  router.post("/sec-ops-vendors", quotePost(callTool, "sec_ops_find_vendors"));
  router.post("/sec-ops-recommend", quotePost(callTool, "sec_ops_recommend"));

  router.post("/sheet-metal", quotePost(callTool, "sheet_metal_quote"));

  router.post("/additive", quotePost(callTool, "additive_quote"));
  router.post("/additive-materials", quotePost(callTool, "additive_list_materials"));
  router.post("/additive-compare", quotePost(callTool, "additive_compare_technologies"));

  router.post("/injection-mold", quotePost(callTool, "injection_mold_quote"));
  router.get("/injection-mold-materials", quoteGet(callTool, "injection_mold_materials"));
  router.post("/injection-mold-dfm", quotePost(callTool, "injection_mold_dfm"));

  router.post("/stock-optimize", quotePost(callTool, "stock_size_optimize"));
  router.post("/stock-catalog", quotePost(callTool, "stock_size_catalog"));
  router.post("/stock-nesting", quotePost(callTool, "stock_size_nesting"));

  router.post("/material-price", quotePost(callTool, "material_price_lookup"));
  router.post("/material-compare", quotePost(callTool, "material_price_compare"));
  router.post("/material-surcharge", quotePost(callTool, "material_surcharge"));

  return router;
}
