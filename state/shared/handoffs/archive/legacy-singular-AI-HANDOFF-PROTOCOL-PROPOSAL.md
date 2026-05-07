# PRISM Claude ↔ Coordinator Handoff Protocol — PROPOSAL v0.1

**Status:** PROPOSAL (not yet wired). Resolves the §0.5 Tier-2 ambiguity.
**Generated:** 2026-05-02
**Companion docs:** `AI-HIERARCHY-INVENTORY.md`, `AI-LORA-ARTIFACTS.md`
**Aligned with:** `state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md`, `state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md`, MCP dispatcher contract.

---

## 0. Why this exists

Today there is no formal Claude ↔ Coordinator handoff protocol. The work order §0.5 audit identified four overlapping Tier-2 candidates:

- `PRISMUnifiedOrchestratorEngine`
- `AISystemRouterEngine`
- `MetaAIOrchestrationEngine`
- `AIIntelligenceMaximizerEngine`

…and an unbounded set of Tier-3 specialists that Claude calls **directly** without any supervision contract. Outcome:
- No single source of truth for "what is the system doing right now"
- No formal "Claude is in the loop" vs "Claude is supervising autonomous work" mode flag
- No structured way for the Coordinator to escalate back to Claude when a specialist fails / drifts / hits a safety gate
- No replay protocol when Claude resumes after `/handoff` or `/compact`

This proposal selects ONE canonical Tier-2 Coordinator, defines five operating modes, and specifies the handoff envelope.

---

## 1. Canonical selection

**Adopt `PRISMUnifiedOrchestratorEngine` as the canonical Tier-2 Coordinator** (rename to `PRISMCoordinatorEngine` in the next refactor). Rationale:

| Candidate | Strengths | Weaknesses | Verdict |
|-----------|-----------|------------|---------|
| PRISMUnifiedOrchestratorEngine | Already wired into `prism_orchestrate` + `prism_autonomous`; cross-domain by design; lock-aware | feedback_loop_wired=false (must fix) | **CANONICAL** |
| AISystemRouterEngine | Production-wired; good telemetry | Routing-only — not a coordinator | Demote to Tier-2.5 (router subordinate to coordinator) |
| MetaAIOrchestrationEngine | Good synthesis design | Overlaps; no telemetry | Fold into PRISMCoordinator as `synthesize` mode |
| AIIntelligenceMaximizerEngine | — | Stub | Deprecate |

After the rename, every Tier-3 specialist orchestration call MUST go through `PRISMCoordinatorEngine.coordinate(handoffEnvelope)`. Direct Claude→Tier-3 calls remain legal for *interactive* work but must register a passive observation event.

---

## 2. Operating modes

```typescript
type AIOperatingMode =
  | "interactive"        // Claude in loop on every step (default for human-driven CLI)
  | "supervised_autonomy"// Coordinator runs plan; Claude gets per-step approval gates
  | "delegated_autonomy" // Coordinator runs plan; Claude only sees milestones/exceptions
  | "background_safe"    // Coordinator owns plan; only safety violations escalate
  | "emergency_supervised"// Forced back to interactive (S(x)<0.70 or hard-block trigger)
```

### Mode transition rules

| From | To | Trigger |
|------|-----|---------|
| interactive | supervised_autonomy | User issues `/autopilot` or multi-step plan |
| supervised_autonomy | delegated_autonomy | User confirms 3+ approvals identically |
| delegated_autonomy | background_safe | User approves "background" explicitly |
| any | emergency_supervised | S(x) < 0.70 OR collision detected OR `duplicationGuardEngine` throws OR test failure |
| emergency_supervised | interactive | only after Claude human-approves rollback |

---

## 3. Handoff envelope (canonical schema)

Every Claude → Coordinator handoff carries this envelope. Coordinator persists it to `mcp-server/data/state/COORDINATOR_HANDOFF_LEDGER.json` (new state file, schemaVersion 1.0.0).

```typescript
interface HandoffEnvelope {
  schemaVersion: "1.0.0";
  handoff_id: string;                    // ULID
  parent_session_id: string;             // Claude session (stable-session-id.mjs)
  created_at: string;                    // ISO-8601
  mode: AIOperatingMode;

  // What Claude is asking the Coordinator to do
  intent: {
    type: "plan_execute" | "single_specialist" | "multi_specialist_compose"
        | "verify" | "rollback" | "supervise_long_running";
    summary: string;                     // 1-line human-readable
    user_goal: string;                   // verbatim user request snippet
  };

  // Plan (delegated_autonomy / background_safe only)
  plan?: {
    steps: Array<{
      step_id: string;
      tier3_specialist: string;          // ai_id from inventory (sfc_ai, mill_ai, …)
      action: string;                    // dispatcher action (e.g. "prism_calc:sfc_calculate")
      params: Record<string, unknown>;
      depends_on: string[];              // step_ids
      checkpoint_after: boolean;
      escalate_on: ("safety_block" | "test_fail" | "drift" | "missing_artifact")[];
    }>;
    rollback_strategy: "stage_by_stage" | "all_or_nothing" | "manual";
  };

  // Supervision contract — when does Coordinator wake Claude up?
  supervision: {
    require_approval_before: string[];   // step_ids OR action patterns ("prism_safety:*")
    notify_on: ("milestone" | "warning" | "error" | "completion")[];
    escalate_on: ("safety_block" | "S<0.70" | "collision" | "test_fail"
                | "duplication_block" | "schema_drift" | "drift_canary"
                | "tier3_unavailable")[];
    max_autonomous_minutes: number;       // hard timeout → emergency_supervised
    max_token_budget: number;
  };

  // Snapshot of relevant state at handoff time
  context: {
    inventory_counts: Record<string, number>;   // from PRISM-INVENTORY-LATEST.md
    active_claims: string[];                    // from data/claims/
    open_safety_gates: string[];                // from SCRUTINY_LEDGER.json
    relevant_engines: string[];                 // from self-awareness search
    recent_handoffs: string[];                  // last 3 handoff_ids in this session
  };

  // Provenance — who/what triggered the handoff
  provenance: {
    triggered_by: "user" | "hook" | "schedule" | "coordinator_chain";
    skill?: string;                       // /skill name if applicable
    file?: string;                        // file being edited if applicable
  };
}
```

---

## 4. Result envelope (Coordinator → Claude)

```typescript
interface HandoffResult {
  schemaVersion: "1.0.0";
  handoff_id: string;
  status: "completed" | "escalated" | "blocked" | "timed_out" | "partial";
  completed_at: string;

  // What happened
  steps_executed: Array<{
    step_id: string;
    started_at: string; ended_at: string;
    tier3_specialist: string;
    success: boolean;
    output_summary: string;               // <2KB; full output → output_file_path
    output_file_path?: string;            // for large outputs
    safety_score?: number;                // S(x) if applicable
    feedback_signals_emitted: string[];  // what actuals/measurements were captured
  }>;

  // Escalation reason (if status=escalated)
  escalation?: {
    trigger: string;                      // matches supervision.escalate_on
    blocking_step_id: string;
    suggested_recovery: "rollback" | "skip" | "manual_intervention" | "retrain_specialist";
    diagnostic: Record<string, unknown>;
  };

  // Rollback receipt (if rollback was performed)
  rollback?: {
    steps_reverted: string[];
    files_restored: string[];
    state_restored_to: string;            // checkpoint id
  };

  // Resource accounting
  resources: {
    tokens_used: number;
    duration_ms: number;
    tier3_invocations: Record<string /* ai_id */, number>;
    feedback_events_recorded: number;     // ← key metric for closed-loop AIs
  };

  // Next-action recommendation for Claude (resume guidance)
  next_action: {
    summary: string;                      // 1-line directive
    suggested_skills: string[];
    suggested_actions: string[];
  };
}
```

---

## 5. Wiring requirements

### 5.1 New dispatcher actions (under `prism_orchestrate`)
- `coordinator_handoff_open` — Claude opens a new handoff envelope
- `coordinator_handoff_status` — poll status
- `coordinator_handoff_approve_step` — supervised_autonomy approval
- `coordinator_handoff_escalate` — Coordinator-side trigger to Claude
- `coordinator_handoff_close` — finalize and persist result envelope
- `coordinator_handoff_history` — list recent envelopes for current session

### 5.2 Engine work
- `PRISMUnifiedOrchestratorEngine` → rename `PRISMCoordinatorEngine`, add:
  - `coordinate(envelope: HandoffEnvelope): AsyncGenerator<HandoffEvent, HandoffResult>`
  - `recordFeedback(ai_id: string, signals: Record<string, number>): void`  ← **closes the loop universally**
  - `subscribeFeedback(ai_id: string, callback: (signals) => void): Subscription`

### 5.3 Tier-3 contract
Every Tier-3 specialist MUST implement:
```typescript
interface Tier3Specialist {
  ai_id: string;
  capabilities: { deep_learning: boolean; deep_reasoning: boolean; machine_learning: boolean };
  invoke(action: string, params: unknown): Promise<unknown>;
  reportFeedback(signals: Record<string, number>): void;   // ← MANDATORY for closed-loop
  isHealthy(): { ok: boolean; reason?: string };
}
```

This forces every specialist (mill_ai, lathe_ai, post_ai, …) to implement `reportFeedback()` — which **fixes the §0.5 finding that 16 of 24 AI nodes have feedback_loop_wired=false**.

### 5.4 New hooks
- `coordinator-handoff-open.mjs` (UserPromptSubmit) — auto-creates envelope when prompt matches multi-step pattern
- `coordinator-escalation-stop.mjs` (Stop) — blocks Stop if there's an open escalation
- `coordinator-feedback-capture.mjs` (PostToolUse on safety/calc/measure dispatchers) — auto-routes signals to `recordFeedback()`

### 5.5 New state files
- `mcp-server/data/state/COORDINATOR_HANDOFF_LEDGER.json` — append-only envelope log
- `mcp-server/data/state/AI_FEEDBACK_LEDGER.jsonl` — per-AI feedback events (for retraining triggers)

---

## 6. Compact / resume integration

On `/compact` precompact hook MUST:
1. Snapshot any open handoffs to `state/shared/handoffs/HANDOFF-<id>-<topic>.md`
2. Persist current `mode` and `supervision.escalate_on`
3. Record last 3 envelope ids

On `/startup` (post-compact):
1. Read per-chat handoff via `per-agent-handoff.mjs read`
2. If an open handoff envelope exists → Claude resumes in `interactive` mode and explicitly asks user whether to resume autonomous or stay manual
3. NEVER silently re-enter `delegated_autonomy` — always require user re-confirmation after a compaction

---

## 7. Migration phases

| Phase | Scope | Estimated effort |
|-------|-------|------------------|
| P1 | Rename + add `recordFeedback()` to PRISMCoordinatorEngine. Wire 6 new dispatcher actions. | 1 unit |
| P2 | Implement Tier3Specialist contract on sfc_ai + wedm_ai (already partially wired). | 1 unit |
| P3 | Roll out Tier3 contract to mill_ai, lathe_ai, post_ai, cam_ai, cad_ai. | 2 units |
| P4 | Hook wiring (open/escalate/capture) + ledger files. | 1 unit |
| P5 | Compact/resume integration; user-facing approval prompts. | 1 unit |
| P6 | Telemetry dashboard + drift triggers from `AI_FEEDBACK_LEDGER.jsonl`. | 1 unit |

---

## 8. Acceptance criteria

A Tier-3 specialist is considered **production / closed-loop** ONLY when:
1. It implements `Tier3Specialist` contract
2. `reportFeedback()` is called from at least one downstream measurement dispatcher (e.g. `prism_quality:measurement_analyze`, `prism_machine_live:thermal_status`, `prism_validate:prediction_validate`)
3. `AI_FEEDBACK_LEDGER.jsonl` shows ≥10 events in a 30-day rolling window
4. A drift / retraining trigger is wired (e.g. SFCDriftCanaryEngine pattern) — when drift fires, Coordinator opens a `retrain` handoff back to Claude for review

Until those four are true for a given AI node, its `feedback_loop_wired` field MUST report `partial` or `false` in `AI-HIERARCHY-INVENTORY.md`. **No more JSDoc-claimed-but-not-wired closed loops.**
