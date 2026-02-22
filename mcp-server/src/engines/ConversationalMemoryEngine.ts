/**
 * ConversationalMemoryEngine.ts — R8-MS5 Conversational Memory & Context
 * ========================================================================
 *
 * State machine for tracking user's manufacturing workflow across sessions.
 * Five states define response behavior:
 *
 *   IDLE       → No active job context
 *   EXPLORING  → Browsing materials, tools, strategies
 *   PLANNING   → Building a specific job plan
 *   EXECUTING  → At the machine, real-time support
 *   REVIEWING  → Reporting outcomes, analyzing results
 *
 * Each state affects how PRISM responds:
 *   EXPLORING  → Broad, comparative, educational
 *   PLANNING   → Specific, detailed, actionable
 *   EXECUTING  → Terse, immediate, safety-first
 *   REVIEWING  → Analytical, improvement-focused
 *
 * @version 1.0.0 — R8-MS5
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConversationState = "idle" | "exploring" | "planning" | "executing" | "reviewing";

export interface JobContext {
  id: string;
  created: string;
  last_accessed: string;
  state: ConversationState;

  // Accumulated knowledge
  material?: string;
  machine?: string;
  part_description?: string;
  tools: string[];
  operations: {
    type: string;
    parameters?: Record<string, any>;
    outcome?: string;
  }[];
  issues: string[];
  notes: string[];

  // Recommendation tracking
  recommendations: { action: string; result_summary: string; timestamp: string }[];
  actual_results: { description: string; timestamp: string }[];
}

export interface ConversationContext {
  session_id: string;
  current_state: ConversationState;
  active_job: JobContext | null;
  recent_jobs: { id: string; material: string; state: ConversationState; last_accessed: string }[];
  response_style: ResponseStyle;
}

export interface ResponseStyle {
  verbosity: "terse" | "normal" | "detailed";
  focus: "safety" | "productivity" | "quality" | "cost" | "general";
  include_alternatives: boolean;
  include_safety_warnings: boolean;
}

// ─── State Storage ──────────────────────────────────────────────────────────

const sessions = new Map<string, ConversationContext>();
const allJobs = new Map<string, JobContext>();

let jobIdCounter = 0;

function generateJobContextId(): string {
  jobIdCounter++;
  const ts = Date.now().toString(36);
  return `JOB-${ts}-${jobIdCounter.toString().padStart(3, "0")}`;
}

function getSession(sessionId: string): ConversationContext {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      session_id: sessionId,
      current_state: "idle",
      active_job: null,
      recent_jobs: [],
      response_style: {
        verbosity: "normal",
        focus: "general",
        include_alternatives: true,
        include_safety_warnings: true,
      },
    });
  }
  return sessions.get(sessionId)!;
}

// ─── State Transitions ──────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  idle: ["exploring"],
  exploring: ["planning", "idle"],
  planning: ["executing", "exploring", "idle"],
  executing: ["reviewing", "idle"],
  reviewing: ["idle", "exploring"],
};

/** Transition keywords for auto-detection */
const TRANSITION_PATTERNS: Record<string, { to: ConversationState; keywords: string[] }[]> = {
  idle: [
    { to: "exploring", keywords: ["what", "how", "which", "compare", "help", "tell me", "looking for"] },
  ],
  exploring: [
    { to: "planning", keywords: ["this part", "my job", "let's go with", "I'm going to", "commit", "plan", "set up", "specific"] },
  ],
  planning: [
    { to: "executing", keywords: ["running it", "at the machine", "started", "cutting now", "in progress", "live", "real-time"] },
  ],
  executing: [
    { to: "reviewing", keywords: ["finished", "done", "completed", "results", "surface finish was", "tool lasted", "problems"] },
  ],
  reviewing: [
    { to: "idle", keywords: ["new job", "next part", "different material", "done reviewing", "thanks"] },
    { to: "exploring", keywords: ["what about", "another approach", "let's try", "alternative"] },
  ],
};

/**
 * Detect state transition from user message.
 * Returns new state if transition detected, null otherwise.
 */
export function detectTransition(
  currentState: ConversationState,
  message: string,
): ConversationState | null {
  const lower = message.toLowerCase();
  const patterns = TRANSITION_PATTERNS[currentState];
  if (!patterns) return null;

  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (lower.includes(keyword)) {
        return pattern.to;
      }
    }
  }
  return null;
}

/**
 * Force a state transition (manual override).
 */
export function transitionState(
  sessionId: string,
  newState: ConversationState,
): ConversationContext {
  const ctx = getSession(sessionId);
  const valid = VALID_TRANSITIONS[ctx.current_state];
  if (!valid.includes(newState) && newState !== "idle") {
    // Allow force-reset to idle from any state
    if (newState !== "idle") {
      throw new Error(
        `Invalid transition: ${ctx.current_state} → ${newState}. ` +
        `Valid: ${valid.join(", ")}`,
      );
    }
  }

  ctx.current_state = newState;

  // Update response style based on state
  ctx.response_style = getResponseStyle(newState);

  return { ...ctx };
}

/** Get response style for a given state */
function getResponseStyle(state: ConversationState): ResponseStyle {
  switch (state) {
    case "idle":
      return { verbosity: "normal", focus: "general", include_alternatives: true, include_safety_warnings: true };
    case "exploring":
      return { verbosity: "detailed", focus: "general", include_alternatives: true, include_safety_warnings: true };
    case "planning":
      return { verbosity: "detailed", focus: "productivity", include_alternatives: false, include_safety_warnings: true };
    case "executing":
      return { verbosity: "terse", focus: "safety", include_alternatives: false, include_safety_warnings: true };
    case "reviewing":
      return { verbosity: "detailed", focus: "quality", include_alternatives: true, include_safety_warnings: false };
  }
}

// ─── Job Context Management ─────────────────────────────────────────────────

/**
 * Start a new job context.
 */
export function startJob(
  sessionId: string,
  details?: { material?: string; machine?: string; part_description?: string },
): JobContext {
  const ctx = getSession(sessionId);
  const now = new Date().toISOString();

  const job: JobContext = {
    id: generateJobContextId(),
    created: now,
    last_accessed: now,
    state: "exploring",
    material: details?.material,
    machine: details?.machine,
    part_description: details?.part_description,
    tools: [],
    operations: [],
    issues: [],
    notes: [],
    recommendations: [],
    actual_results: [],
  };

  allJobs.set(job.id, job);
  ctx.active_job = job;
  ctx.current_state = "exploring";
  ctx.response_style = getResponseStyle("exploring");

  // Add to recent jobs
  ctx.recent_jobs.unshift({
    id: job.id,
    material: job.material ?? "Unknown",
    state: job.state,
    last_accessed: now,
  });
  // Keep only last 10
  if (ctx.recent_jobs.length > 10) ctx.recent_jobs.pop();

  return { ...job };
}

/**
 * Update the active job context with new information.
 */
export function updateJob(
  sessionId: string,
  updates: {
    material?: string;
    machine?: string;
    part_description?: string;
    tool?: string;
    operation?: { type: string; parameters?: Record<string, any> };
    issue?: string;
    note?: string;
    recommendation?: { action: string; result_summary: string };
    actual_result?: string;
  },
): JobContext | null {
  const ctx = getSession(sessionId);
  if (!ctx.active_job) return null;

  const job = ctx.active_job;
  const now = new Date().toISOString();
  job.last_accessed = now;

  if (updates.material) job.material = updates.material;
  if (updates.machine) job.machine = updates.machine;
  if (updates.part_description) job.part_description = updates.part_description;
  if (updates.tool && !job.tools.includes(updates.tool)) job.tools.push(updates.tool);
  if (updates.operation) job.operations.push(updates.operation);
  if (updates.issue && !job.issues.includes(updates.issue)) job.issues.push(updates.issue);
  if (updates.note) job.notes.push(updates.note);
  if (updates.recommendation) {
    job.recommendations.push({ ...updates.recommendation, timestamp: now });
  }
  if (updates.actual_result) {
    job.actual_results.push({ description: updates.actual_result, timestamp: now });
  }

  // Update recent jobs list
  const recent = ctx.recent_jobs.find(r => r.id === job.id);
  if (recent) {
    recent.material = job.material ?? "Unknown";
    recent.state = job.state;
    recent.last_accessed = now;
  }

  return { ...job };
}

/**
 * Find a job by search query (material, part description, etc.)
 */
export function findJob(query: string): JobContext | null {
  const lower = query.toLowerCase();
  for (const [, job] of allJobs) {
    if (
      job.material?.toLowerCase().includes(lower) ||
      job.part_description?.toLowerCase().includes(lower) ||
      job.id.toLowerCase().includes(lower)
    ) {
      return { ...job };
    }
  }
  return null;
}

/**
 * Resume a previously active job.
 */
export function resumeJob(sessionId: string, jobId: string): JobContext | null {
  const job = allJobs.get(jobId);
  if (!job) return null;

  const ctx = getSession(sessionId);
  const now = new Date().toISOString();
  job.last_accessed = now;
  ctx.active_job = job;

  // Set state based on job's last state
  ctx.current_state = job.state === "idle" ? "exploring" : job.state;
  ctx.response_style = getResponseStyle(ctx.current_state);

  return { ...job };
}

/**
 * Get the active job context for a session.
 */
export function getActiveJob(sessionId: string): JobContext | null {
  const ctx = getSession(sessionId);
  return ctx.active_job ? { ...ctx.active_job } : null;
}

/**
 * Get the conversation context for a session.
 */
export function getConversationContext(sessionId: string): ConversationContext {
  return { ...getSession(sessionId) };
}

/**
 * Get recent jobs for a session.
 */
export function getRecentJobs(sessionId: string): { id: string; material: string; state: ConversationState; last_accessed: string }[] {
  return [...getSession(sessionId).recent_jobs];
}

/**
 * Complete the active job and transition to IDLE.
 */
export function completeJob(sessionId: string): JobContext | null {
  const ctx = getSession(sessionId);
  if (!ctx.active_job) return null;

  ctx.active_job.state = "idle";
  ctx.current_state = "idle";
  ctx.response_style = getResponseStyle("idle");

  const completed = { ...ctx.active_job };
  ctx.active_job = null;
  return completed;
}

/**
 * Reset session (for testing).
 */
export function resetConversation(sessionId: string): void {
  sessions.delete(sessionId);
}

// ─── Dispatcher Entry Point ─────────────────────────────────────────────────

/**
 * Dispatcher entry for intelligenceDispatcher routing.
 * Actions:
 *   conversation_context   — Get current conversation context
 *   conversation_transition — Detect or force state transition
 *   job_start              — Start a new job context
 *   job_update             — Update active job with new info
 *   job_find               — Find a previous job by search
 *   job_resume             — Resume a previous job
 *   job_complete           — Complete active job
 *   job_list_recent        — List recent jobs
 */
export function conversationalMemory(action: string, params: Record<string, any>): any {
  const sessionId = params.session_id ?? "default";

  switch (action) {
    case "conversation_context": {
      return getConversationContext(sessionId);
    }

    case "conversation_transition": {
      if (params.message) {
        // Auto-detect from message
        const ctx = getConversationContext(sessionId);
        const detected = detectTransition(ctx.current_state, params.message);
        if (detected) {
          const updated = transitionState(sessionId, detected);
          return { ...updated, transition_detected: true, from: ctx.current_state, to: detected };
        }
        return { ...ctx, transition_detected: false };
      } else if (params.target_state) {
        // Force transition
        return transitionState(sessionId, params.target_state);
      }
      return getConversationContext(sessionId);
    }

    case "job_start": {
      const job = startJob(sessionId, {
        material: params.material,
        machine: params.machine,
        part_description: params.part_description,
      });
      return job;
    }

    case "job_update": {
      const job = updateJob(sessionId, {
        material: params.material,
        machine: params.machine,
        part_description: params.part_description,
        tool: params.tool,
        operation: params.operation,
        issue: params.issue,
        note: params.note,
        recommendation: params.recommendation,
        actual_result: params.actual_result,
      });
      return job ?? { error: "No active job" };
    }

    case "job_find": {
      const job = findJob(params.query ?? "");
      return job ?? { found: false, query: params.query };
    }

    case "job_resume": {
      const job = resumeJob(sessionId, params.job_id ?? "");
      return job ?? { error: "Job not found", job_id: params.job_id };
    }

    case "job_complete": {
      const job = completeJob(sessionId);
      return job ?? { error: "No active job" };
    }

    case "job_list_recent": {
      return { recent: getRecentJobs(sessionId) };
    }

    default:
      throw new Error(`ConversationalMemoryEngine: unknown action "${action}"`);
  }
}
