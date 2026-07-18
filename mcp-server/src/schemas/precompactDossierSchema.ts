/**
 * precompactDossierSchema.ts — U-CTX03 PreCompact Dossier Schema
 *
 * Zod schema for the rich 50-100K dossier emitted by PreCompact hooks.
 * Captures mental model, reasoning chains, bandit state, SVI trajectory,
 * and active work context for PostCompact restoration.
 */

import { z } from "zod";

export const ReasoningStepSchema = z.object({
  stepNumber: z.number(),
  question: z.string(),
  reasoning: z.string(),
  evidenceSources: z.array(z.string()),
  conclusion: z.string(),
  confidence: z.number().min(0).max(1),
});

export const ReasoningChainSchema = z.object({
  chainId: z.string(),
  startedAt: z.string(),
  topic: z.string(),
  steps: z.array(ReasoningStepSchema),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  outcome: z.string().optional(),
});

export const TodoItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "blocked"]),
  createdAt: z.string(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  blockedBy: z.string().optional(),
});

export const DiffSummarySchema = z.object({
  filesChanged: z.number(),
  insertions: z.number(),
  deletions: z.number(),
  topFiles: z.array(
    z.object({
      path: z.string(),
      insertions: z.number(),
      deletions: z.number(),
    })
  ),
  uncommittedChanges: z.boolean(),
  lastCommit: z.string().optional(),
});

export const BanditArmSchema = z.object({
  armId: z.string(),
  armName: z.string(),
  alpha: z.number(),
  beta: z.number(),
  pulls: z.number(),
  meanReward: z.number(),
});

export const BanditStateSchema = z.object({
  algorithm: z.enum(["thompson", "ucb", "linucb"]),
  totalPulls: z.number(),
  topArm: z.string().nullable(),
  explorationRate: z.number(),
  arms: z.array(BanditArmSchema),
  lastUpdate: z.string(),
});

export const SVITargetSchema = z.object({
  name: z.string(),
  weight: z.number(),
  current: z.number(),
  target: z.number(),
  gap: z.number(),
});

export const SVITrajectorySchema = z.object({
  currentPsi: z.number(),
  targetPsi: z.number(),
  velocity: z.number(),
  targets: z.array(SVITargetSchema),
  lastUpdate: z.string(),
});

export const LiveClaimSchema = z.object({
  claimId: z.string(),
  track: z.string(),
  milestone: z.string().optional(),
  claimedAt: z.string(),
  sessionId: z.string(),
  status: z.enum(["active", "paused", "completed"]),
});

export const ToolOutcomeSchema = z.object({
  tool: z.string(),
  action: z.string().optional(),
  status: z.enum(["success", "error", "blocked"]),
  summary: z.string(),
  timestamp: z.string(),
  durationMs: z.number().optional(),
});

export const MentalModelSchema = z.object({
  currentObjective: z.string(),
  approachTaken: z.string(),
  keyDecisions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  blockers: z.array(z.string()),
  nextSteps: z.array(z.string()),
  lessonsLearned: z.array(z.string()).optional(),
});

export const PrecompactDossierSchema = z.object({
  schemaVersion: z.literal(1),
  sessionId: z.string(),
  capturedAt: z.string(),
  tokenEstimate: z.number(),

  // Core mental model (what was being solved, what was tried)
  mentalModel: MentalModelSchema,

  // Recent reasoning chains (last 10)
  reasoningChains: z.array(ReasoningChainSchema).max(10),

  // Open todos (pending work)
  openTodos: z.array(TodoItemSchema),

  // Git state since session start
  diffSummary: DiffSummarySchema,

  // Bandit state (Thompson posterior)
  banditState: BanditStateSchema.optional(),

  // SVI trajectory (where are we vs. target)
  sviTrajectory: SVITrajectorySchema.optional(),

  // Active claims (to avoid collision)
  liveClaims: z.array(LiveClaimSchema),

  // Last 20 tool outcomes
  recentToolOutcomes: z.array(ToolOutcomeSchema).max(20),

  // Context window state at compaction time
  contextUsage: z.object({
    totalTokens: z.number(),
    percentUsed: z.number(),
    largestSource: z.string(),
    largestSourceTokens: z.number(),
  }),

  // Identity info for restoration
  identity: z.object({
    family: z.string(),
    machine: z.string(),
    instance: z.string(),
    sessionKey: z.string(),
  }),
});

export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;
export type ReasoningChain = z.infer<typeof ReasoningChainSchema>;
export type TodoItem = z.infer<typeof TodoItemSchema>;
export type DiffSummary = z.infer<typeof DiffSummarySchema>;
export type BanditArm = z.infer<typeof BanditArmSchema>;
export type BanditState = z.infer<typeof BanditStateSchema>;
export type SVITarget = z.infer<typeof SVITargetSchema>;
export type SVITrajectory = z.infer<typeof SVITrajectorySchema>;
export type LiveClaim = z.infer<typeof LiveClaimSchema>;
export type ToolOutcome = z.infer<typeof ToolOutcomeSchema>;
export type MentalModel = z.infer<typeof MentalModelSchema>;
export type PrecompactDossier = z.infer<typeof PrecompactDossierSchema>;

export function validateDossier(data: unknown): { ok: true; dossier: PrecompactDossier } | { ok: false; errors: string[] } {
  const result = PrecompactDossierSchema.safeParse(data);
  if (result.success) {
    return { ok: true, dossier: result.data };
  }
  return {
    ok: false,
    errors: result.error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`),
  };
}

export function estimateDossierTokens(dossier: PrecompactDossier): number {
  const json = JSON.stringify(dossier);
  return Math.ceil(json.length / 3.5);
}
