/**
 * asset-check route — HTTP access to LayeredAssetCheckEngine
 *
 * PRISM hooks (e.g., ai-duplication-guard.mjs) spawn a short-lived Node
 * process on every PreToolUse. Loading Levenshtein + registries per-call is
 * fine; loading ONNX embeddings is not. This route exposes the composite
 * gate over HTTP so hooks can get a rich decision from the long-lived MCP
 * server with one fast request (≤50ms typical).
 *
 * Endpoints:
 *   POST /name-check    — name-only decision (fuzzy match against filesystem)
 *   POST /layered-check — accepts precomputed candidate+reference vectors so
 *                         the caller can feed a real embedder in; the server
 *                         never loads ONNX itself on this path.
 *
 * Both endpoints are idempotent, side-effect-free, and return the full
 * LayeredCheckResult so the caller can surface the reasoning.
 *
 * @module routes/asset-check
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  LayeredAssetCheckEngine,
  type NameCheckOutcome,
  type LayeredCheckInput,
} from "../engines/LayeredAssetCheckEngine.js";
import type { CallToolFn } from "./index.js";

// ---- Input schemas --------------------------------------------------------

const ASSET_TYPES = ["engine", "formula", "algorithm", "action", "skill", "hook"] as const;

const NameCheckRequestSchema = z.object({
  type: z.enum(ASSET_TYPES),
  proposedName: z.string().min(1),
  description: z.string(),
  keywords: z.array(z.string()).optional(),
  threshold: z.number().min(0).max(1).optional(),
});

const VectorSchema = z.array(z.number().finite()).min(1);

const LayeredCheckRequestSchema = NameCheckRequestSchema.extend({
  candidateVector: VectorSchema.optional(),
  references: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        vector: VectorSchema,
      })
    )
    .optional(),
  yellowAt: z.number().gt(0).lt(1).optional(),
  redAt: z.number().gt(0).lt(1).optional(),
});

// ---- Internal helpers -----------------------------------------------------

const DIR_BY_TYPE: Record<LayeredCheckInput["type"], string | null> = {
  engine: "src/engines",
  action: "src/tools/dispatchers",
  algorithm: "src/algorithms",
  skill: null,
  hook: "src/hooks",
  formula: null,
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/engine$/i, "")
    .replace(/algorithm$/i, "")
    .replace(/formula$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const costs: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    let prev = i - 1;
    costs[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const temp = costs[j];
      costs[j] = s1[i - 1] === s2[j - 1] ? prev : Math.min(prev, costs[j], costs[j - 1]) + 1;
      prev = temp;
    }
  }
  return costs[n];
}

function similarity(a: string, b: string): number {
  const longer = a.length >= b.length ? a : b;
  const shorter = longer === a ? b : a;
  if (longer.length === 0) return 1;
  return (longer.length - levenshtein(longer, shorter)) / longer.length;
}

async function listExistingAssets(type: LayeredCheckInput["type"], mcpRoot: string): Promise<string[]> {
  const rel = DIR_BY_TYPE[type];
  if (!rel) return [];
  const dir = path.join(mcpRoot, rel);
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith(".ts"))
      .map((f) => f.replace(/\.(ts|js|mjs)$/, ""));
  } catch {
    return [];
  }
}

export interface AssetCheckConfig {
  mcpRoot?: string;
}

// ---- Router ---------------------------------------------------------------

/**
 * `_callTool` is unused — this route does not need to invoke MCP tools; it
 * reads the filesystem directly. Keeping the signature for consistency with
 * sibling route factories.
 */
export function createAssetCheckRouter(
  _callTool: CallToolFn,
  config: AssetCheckConfig = {}
): Router {
  const router = Router();
  const mcpRoot = config.mcpRoot ?? process.cwd();

  async function resolveNameOutcome(input: LayeredCheckInput, threshold: number): Promise<NameCheckOutcome> {
    const existing = await listExistingAssets(input.type, mcpRoot);
    const n = normalize(input.proposedName);

    let best: { name: string; sim: number } | null = null;
    for (const other of existing) {
      const sim = similarity(n, normalize(other));
      if (!best || sim > best.sim) best = { name: other, sim };
    }

    if (!best) return { match: "none" };
    if (best.sim >= 1) {
      return { match: "exact", matchedName: best.name, matchedType: input.type, similarity: 1 };
    }
    if (best.sim >= threshold) {
      return {
        match: "fuzzy",
        matchedName: best.name,
        matchedType: input.type,
        similarity: Math.round(best.sim * 10000) / 10000,
      };
    }
    return {
      match: "none",
      matchedName: best.name,
      similarity: Math.round(best.sim * 10000) / 10000,
    };
  }

  router.post("/name-check", async (req: Request, res: Response) => {
    const parsed = NameCheckRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues });
    }
    const body = parsed.data;
    const threshold = body.threshold ?? 0.75;

    try {
      const engine = new LayeredAssetCheckEngine({
        name: () => resolveNameOutcome(body, threshold),
      });
      const result = await engine.check({
        type: body.type,
        proposedName: body.proposedName,
        description: body.description,
        keywords: body.keywords,
      });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({
        error: "CHECK_ERROR",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  router.post("/layered-check", async (req: Request, res: Response) => {
    const parsed = LayeredCheckRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "VALIDATION_ERROR", issues: parsed.error.issues });
    }
    const body = parsed.data;
    const threshold = body.threshold ?? 0.75;

    const yellowAt = body.yellowAt ?? 0.70;
    const redAt = body.redAt ?? 0.85;
    if (redAt <= yellowAt) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "redAt must be > yellowAt" });
    }

    try {
      const engine = new LayeredAssetCheckEngine({
        name: () => resolveNameOutcome(body, threshold),
        band: () => resolveBand(body, yellowAt, redAt),
      });
      const result = await engine.check({
        type: body.type,
        proposedName: body.proposedName,
        description: body.description,
        keywords: body.keywords,
      });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({
        error: "CHECK_ERROR",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", endpoints: ["POST /name-check", "POST /layered-check", "GET /health"] });
  });

  return router;
}

// ---- Band resolver --------------------------------------------------------

function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

type LayeredRequest = z.infer<typeof LayeredCheckRequestSchema>;

function resolveBand(body: LayeredRequest, yellowAt: number, redAt: number) {
  const candidate = body.candidateVector;
  const refs = body.references ?? [];
  if (!candidate || refs.length === 0) {
    return {
      band: "yellow" as const,
      rationale: "no candidate vector or references supplied; defaulting to yellow",
    };
  }
  let best: { name: string; sim: number } | null = null;
  for (const r of refs) {
    if (r.vector.length !== candidate.length) continue;
    const sim = cosine(candidate, r.vector);
    if (!best || sim > best.sim) best = { name: r.name, sim };
  }
  if (!best) {
    return {
      band: "yellow" as const,
      rationale: "no comparable reference (dimension mismatch)",
    };
  }
  const band =
    best.sim > redAt ? ("red" as const) : best.sim >= yellowAt ? ("yellow" as const) : ("green" as const);
  return {
    band,
    topMatchName: best.name,
    topSimilarity: Math.round(best.sim * 10000) / 10000,
    rationale: `cosine ${best.sim.toFixed(4)} vs '${best.name}' → ${band}`,
  };
}
