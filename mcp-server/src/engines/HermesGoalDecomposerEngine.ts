/**
 * HermesGoalDecomposerEngine -- decompose a raw parent GOAL into a SubtaskSchema dependency DAG,
 * producing the FanoutPlanRequest that HermesParallelFanoutPlannerEngine.plan() / the
 * ZuluWaveSchedulerEngine / the hermes-multiwave-build executor consume (U-HERMES-GOAL-DECOMPOSE,
 * slot:bravo). This is the FRONT-END of the C1 runtime driver: nothing previously turned a raw goal
 * into the subtask graph the planner needs -- plan() requires subtasks ALREADY decomposed.
 *
 * Decomposition is genuine reasoning, so per R5 it is LLM-backed -- but the LLM call is INJECTED
 * (opts.llm: (prompt) => Promise<string>), so this engine stays I/O-free + deterministic-given-the-llm
 * and fully unit-testable (tests pass a fake llm returning canned text). The dispatcher wires the real
 * local Ollama model. The risk surface -- prompt construction, LLM-response PARSING (JSON in fences /
 * prose), and DAG VALIDATION (cycle / missing-dep / self-dep / dup-id) -- is pure + real-tested.
 *
 * FAIL-LOUD (R12): a goal that the LLM cannot decompose into a valid acyclic DAG THROWS a descriptive
 * Error -- it NEVER returns a fabricated or malformed plan (a broken plan fed to the executor would
 * spawn agents onto a nonsense graph). No llm injected -> THROWS (never fabricate a decomposition).
 *
 * @module engines/HermesGoalDecomposerEngine
 */
import {
  SubtaskSchema,
  type Subtask,
  type SlotCandidate,
  FanoutPlanRequestSchema,
  type FanoutPlanRequest,
} from "./HermesParallelFanoutPlannerEngine.js";

/** Injected LLM: prompt in, raw completion text out. The dispatcher provides a local-Ollama impl. */
export type DecomposeLlm = (prompt: string) => Promise<string>;

export interface DecomposeParseResult {
  /** Coerced subtasks (may still be structurally invalid -- run validateDecomposition next). */
  subtasks: Subtask[];
  /** Non-null when no usable JSON could be extracted from the LLM text. */
  error: string | null;
}

export interface DecomposeValidateResult {
  valid: boolean;
  errors: string[];
}

const SIZE_HINTS = new Set(["short", "medium", "large"]);

export class HermesGoalDecomposerEngine {
  /**
   * Build the decomposition prompt. PURE. Instructs the model to emit a STRICT JSON DAG of subtasks
   * keyed to the available candidate domains, with no prose. Determinism: candidate domains are
   * listed in input order.
   */
  static buildDecomposePrompt(goal: string, candidates: readonly SlotCandidate[], opts: { maxSubtasks?: number } = {}): string {
    const maxSub = Math.max(2, Math.min(20, opts.maxSubtasks ?? 12));
    const domains = Array.from(new Set((candidates || []).map((c) => c && c.primary_domain).filter((d): d is string => typeof d === "string" && d.length > 0)));
    const domainLine = domains.length ? domains.join(", ") : "(no specific domains -- use a short lowercase noun)";
    return [
      "You are a build planner. Decompose the GOAL into a minimal dependency DAG of subtasks.",
      `Emit STRICT JSON ONLY (no prose, no markdown fences): {"subtasks":[{"subtask_id","description","domain","depends_on","size_hint"}...]}`,
      `Rules: 2..${maxSub} subtasks; subtask_id = a short lowercase-hyphen slug, UNIQUE; depends_on = array of EARLIER subtask_ids (a DAG -- NO cycles, NO self-deps); ` +
        `size_hint one of short|medium|large; domain = one of the available domains below (pick the best fit).`,
      `Available domains: ${domainLine}`,
      `GOAL: ${String(goal).slice(0, 4000)}`,
    ].join("\n");
  }

  /**
   * Parse an LLM completion into coerced subtasks. PURE + fail-soft: extracts the first JSON object
   * (whole text, then a ```json fence, then the first balanced {...}), accepts {subtasks:[...]} or a
   * bare [...], and coerces each entry to the SubtaskSchema shape (string id/description/domain,
   * array depends_on, size_hint defaulted to "medium" when missing/invalid). On NO usable JSON it
   * returns { subtasks: [], error } -- never throws (the caller decides; decompose() fails loud).
   */
  static parseDecomposition(text: string): DecomposeParseResult {
    const raw = typeof text === "string" ? text : "";
    const candidates: string[] = [];
    candidates.push(raw.trim());
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) candidates.push(fence[1].trim());
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) candidates.push(objMatch[0]);
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) candidates.push(arrMatch[0]);

    let parsed: unknown = null;
    for (const c of candidates) {
      if (!c) continue;
      try { parsed = JSON.parse(c); break; } catch { /* try next candidate */ }
    }
    if (parsed === null || typeof parsed !== "object") {
      return { subtasks: [], error: "no parseable JSON in LLM response" };
    }
    const list = Array.isArray(parsed) ? parsed : (parsed as { subtasks?: unknown }).subtasks;
    if (!Array.isArray(list)) {
      return { subtasks: [], error: "parsed JSON has no `subtasks` array" };
    }

    const subtasks: Subtask[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.subtask_id === "string" ? o.subtask_id.trim() : "";
      const description = typeof o.description === "string" ? o.description.trim() : "";
      const domain = typeof o.domain === "string" && o.domain.trim() ? o.domain.trim() : "general";
      const depends_on = Array.isArray(o.depends_on) ? o.depends_on.filter((d): d is string => typeof d === "string") : [];
      const sizeRaw = typeof o.size_hint === "string" ? o.size_hint.trim().toLowerCase() : "";
      const size_hint = (SIZE_HINTS.has(sizeRaw) ? sizeRaw : "medium") as Subtask["size_hint"];
      if (!id || !description) continue; // a subtask with no id/description is unusable -- drop it
      subtasks.push({ subtask_id: id, description: description.slice(0, 2000), domain: domain.slice(0, 60), depends_on, size_hint });
    }
    return { subtasks, error: subtasks.length === 0 ? "no usable subtasks parsed" : null };
  }

  /**
   * Validate a decomposed subtask set as a well-formed acyclic DAG. PURE. Checks: each passes
   * SubtaskSchema; subtask_ids unique; every depends_on references a KNOWN id; no self-dependency;
   * NO cycle (Kahn level-walk). Returns { valid, errors } -- collects ALL problems (does not throw),
   * so decompose() can surface a precise failure.
   */
  static validateDecomposition(subtasks: readonly Subtask[]): DecomposeValidateResult {
    const errors: string[] = [];
    if (!Array.isArray(subtasks) || subtasks.length === 0) {
      return { valid: false, errors: ["no subtasks"] };
    }
    for (const s of subtasks) {
      const r = SubtaskSchema.safeParse(s);
      if (!r.success) errors.push(`subtask ${(s && (s as Subtask).subtask_id) || "?"}: schema invalid (${r.error.issues.map((i) => i.path.join(".")).join(",")})`);
    }
    const ids = new Set<string>();
    for (const s of subtasks) {
      if (ids.has(s.subtask_id)) errors.push(`duplicate subtask_id ${s.subtask_id}`);
      ids.add(s.subtask_id);
    }
    for (const s of subtasks) {
      for (const dep of s.depends_on) {
        if (dep === s.subtask_id) errors.push(`subtask ${s.subtask_id} depends on itself`);
        else if (!ids.has(dep)) errors.push(`subtask ${s.subtask_id} depends on unknown ${dep}`);
      }
    }
    // Cycle detection via Kahn level-walk over the (now structurally-checked) graph.
    if (errors.length === 0) {
      const indeg = new Map<string, number>();
      for (const s of subtasks) indeg.set(s.subtask_id, s.depends_on.length);
      const scheduled = new Set<string>();
      let progressed = true;
      while (scheduled.size < subtasks.length && progressed) {
        progressed = false;
        const level = subtasks.filter((s) => !scheduled.has(s.subtask_id) && (indeg.get(s.subtask_id) ?? 0) === 0).map((s) => s.subtask_id);
        if (level.length === 0) break;
        const levelSet = new Set(level);
        for (const id of level) scheduled.add(id);
        for (const s of subtasks) {
          if (scheduled.has(s.subtask_id)) continue;
          let dec = 0;
          for (const d of s.depends_on) if (levelSet.has(d)) dec++;
          if (dec > 0) indeg.set(s.subtask_id, (indeg.get(s.subtask_id) ?? 0) - dec);
        }
        progressed = true;
      }
      if (scheduled.size < subtasks.length) {
        const stuck = subtasks.filter((s) => !scheduled.has(s.subtask_id)).map((s) => s.subtask_id);
        errors.push(`dependency cycle among: ${stuck.join(", ")}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Decompose a goal into a validated FanoutPlanRequest via the injected LLM. FAIL-LOUD: throws on an
   * empty goal, missing candidates, no injected llm, an unparseable LLM response, or an invalid/cyclic
   * DAG -- it never returns a fabricated or malformed plan. The returned object is FanoutPlanRequestSchema-
   * parsed, so it drops straight into plan() / the wave scheduler / the multiwave-build executor.
   *
   * @param goal        the raw parent goal text
   * @param candidates  the slot candidates (>=1) the planner will route subtasks to
   * @param opts.llm    REQUIRED injected LLM (prompt -> completion text)
   * @param opts.parentId / opts.maxParallel / opts.maxSubtasks  optional overrides
   */
  static async decompose(
    goal: string,
    candidates: readonly SlotCandidate[],
    opts: { llm?: DecomposeLlm; parentId?: string; maxParallel?: number; maxSubtasks?: number } = {},
  ): Promise<FanoutPlanRequest> {
    if (typeof goal !== "string" || goal.trim().length === 0) {
      throw new Error("HermesGoalDecomposer.decompose: goal must be a non-empty string");
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error("HermesGoalDecomposer.decompose: at least one slot candidate is required");
    }
    if (typeof opts.llm !== "function") {
      throw new Error("HermesGoalDecomposer.decompose: opts.llm is required (no decomposition is fabricated without a model)");
    }

    const prompt = this.buildDecomposePrompt(goal, candidates, { maxSubtasks: opts.maxSubtasks });
    const raw = await opts.llm(prompt);
    const parsed = this.parseDecomposition(raw);
    if (parsed.error) {
      throw new Error(`HermesGoalDecomposer.decompose: could not parse a subtask DAG from the model -- ${parsed.error}`);
    }
    const v = this.validateDecomposition(parsed.subtasks);
    if (!v.valid) {
      throw new Error(`HermesGoalDecomposer.decompose: model produced an invalid DAG -- ${v.errors.join("; ")}`);
    }

    const parentId = (typeof opts.parentId === "string" && opts.parentId.trim())
      ? opts.parentId.trim().slice(0, 120)
      : `goal-${goal.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "decomposed"}`;
    const maxParallel = Math.max(1, Math.min(20, opts.maxParallel ?? Math.min(candidates.length, 20)));

    // FanoutPlanRequestSchema.parse THROWS if the assembled request is out of bounds (e.g. >20
    // subtasks) -- the final fail-loud gate so only a schema-valid request ever reaches the executor.
    return FanoutPlanRequestSchema.parse({
      parent_task_id: parentId,
      subtasks: parsed.subtasks,
      candidates,
      max_parallel: maxParallel,
    });
  }
}

export const hermesGoalDecomposerEngine = HermesGoalDecomposerEngine;
