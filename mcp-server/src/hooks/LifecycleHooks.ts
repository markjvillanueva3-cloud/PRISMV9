/**
 * PRISM MCP Server - Lifecycle Hooks
 * Session 6.2C: Session Management, State Persistence, Context Handling
 * 
 * These hooks manage the complete session lifecycle:
 * - Session start/end
 * - Checkpointing for recovery
 * - State persistence
 * - Context pressure management
 * - Compaction handling
 * - Resume from interruption
 * 
 * Memory application: #6 Session, #5 State-driven workflows
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

// Buffer zone thresholds (from memory #17)
const BUFFER_ZONES = {
  GREEN: { min: 0, max: 8 },
  YELLOW: { min: 9, max: 14 },
  RED: { min: 15, max: 18 },
  BLACK: { min: 19, max: Infinity }
};

const CHECKPOINT_INTERVAL = 5;  // Every 5 tool calls
const MAX_SESSION_DURATION_MS = 4 * 60 * 60 * 1000;  // 4 hours
const CONTEXT_PRESSURE_THRESHOLD = 0.75;  // 75% of context used

// ============================================================================
// SESSION START HOOKS
// ============================================================================

/**
 * Session initialization hook
 */
const onSessionStart: HookDefinition = {
  id: "on-session-start",
  name: "Session Initialization",
  description: "Initializes session state, loads previous state if resuming, sets up tracking.",
  
  phase: "on-session-start",
  category: "lifecycle",
  mode: "logging",
  priority: "critical",
  enabled: true,
  
  tags: ["session", "initialization", "state"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionStart;
    
    const sessionId = context.session?.id || `SESSION-${Date.now()}`;
    const isResume = context.metadata?.isResume === true;
    const previousState = context.metadata?.previousState as Record<string, unknown> | undefined;
    
    const actions: string[] = [];
    
    // Log session start
    log.info(`Session started: ${sessionId} (resume: ${isResume})`);
    actions.push(`session_started:${sessionId}`);
    
    // Check for previous state
    if (isResume && previousState) {
      log.info(`Resuming from previous state: ${JSON.stringify(previousState).slice(0, 200)}...`);
      actions.push("previous_state_loaded");
      
      // Check for incomplete tasks
      if (previousState.currentTask && previousState.taskStatus === "IN_PROGRESS") {
        actions.push(`resume_task:${previousState.currentTask}`);
      }
    }
    
    // Initialize tracking
    const sessionData = {
      id: sessionId,
      startTime: new Date().toISOString(),
      toolCalls: 0,
      checkpoints: 0,
      bufferZone: "GREEN",
      isResume,
      previousState: previousState ? true : false
    };
    
    return hookSuccess(hook, 
      isResume 
        ? `Session resumed: ${sessionId}` 
        : `Session initialized: ${sessionId}`,
      {
        actions,
        data: sessionData
      }
    );
  }
};

/**
 * State file load verification
 */
const onSessionStartStateLoad: HookDefinition = {
  id: "on-session-start-state-load",
  name: "State File Load",
  description: "Verifies CURRENT_STATE.json is accessible and loads it.",
  
  phase: "on-session-start",
  category: "lifecycle",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["session", "state", "load"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionStartStateLoad;
    
    const stateLoaded = context.metadata?.stateLoaded === true;
    const statePath = context.metadata?.statePath as string | undefined;
    const stateContent = context.metadata?.stateContent as Record<string, unknown> | undefined;
    
    if (!stateLoaded) {
      return hookWarning(hook, "State file not loaded - starting fresh session", {
        warnings: [
          "CURRENT_STATE.json not found or not loaded",
          "Previous progress may be lost",
          "Consider loading state file manually"
        ]
      });
    }
    
    // Validate state content
    const issues: string[] = [];
    
    if (stateContent) {
      if (!stateContent.version) issues.push("State missing version");
      if (!stateContent.currentSession) issues.push("State missing currentSession");
      if (!stateContent.quickResume) issues.push("State missing quickResume");
    }
    
    if (issues.length > 0) {
      return hookWarning(hook, `State file loaded but incomplete`, {
        warnings: issues
      });
    }
    
    return hookSuccess(hook, `State loaded from ${statePath}`, {
      data: {
        version: stateContent?.version,
        session: stateContent?.currentSession
      }
    });
  }
};

/**
 * Skills loading verification
 */
const onSessionStartSkillsLoad: HookDefinition = {
  id: "on-session-start-skills-load",
  name: "Skills Load Verification",
  description: "Verifies required skills are loaded for the session.",
  
  phase: "on-session-start",
  category: "lifecycle",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["session", "skills", "initialization"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionStartSkillsLoad;
    
    const loadedSkills = context.metadata?.loadedSkills as string[] | undefined;
    const requiredSkills = context.metadata?.requiredSkills as string[] | undefined;
    
    if (!loadedSkills || loadedSkills.length === 0) {
      return hookWarning(hook, "No skills loaded - consider loading relevant skills");
    }
    
    const missingSkills = requiredSkills?.filter(s => !loadedSkills.includes(s)) || [];
    
    if (missingSkills.length > 0) {
      return hookWarning(hook, `Missing required skills: ${missingSkills.join(", ")}`, {
        warnings: missingSkills.map(s => `Not loaded: ${s}`)
      });
    }
    
    return hookSuccess(hook, `${loadedSkills.length} skills loaded`, {
      data: { loadedSkills }
    });
  }
};

// ============================================================================
// CHECKPOINT HOOKS
// ============================================================================

/**
 * Auto checkpoint trigger
 */
const onSessionCheckpoint: HookDefinition = {
  id: "on-session-checkpoint",
  name: "Session Checkpoint",
  description: "Saves session state at regular intervals or on demand.",
  
  phase: "on-session-checkpoint",
  category: "lifecycle",
  mode: "logging",
  priority: "high",
  enabled: true,
  
  tags: ["session", "checkpoint", "state"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionCheckpoint;
    
    const session = context.session;
    if (!session) {
      return hookWarning(hook, "No session context for checkpoint");
    }
    
    const checkpointData = {
      timestamp: new Date().toISOString(),
      sessionId: session.id,
      toolCalls: session.toolCalls,
      checkpointNumber: (session.checkpoints || 0) + 1,
      currentTask: context.metadata?.currentTask,
      taskProgress: context.metadata?.taskProgress,
      completedItems: context.metadata?.completedItems,
      nextItem: context.metadata?.nextItem
    };
    
    log.info(`Checkpoint #${checkpointData.checkpointNumber}: ${session.toolCalls} tool calls`);
    
    return hookSuccess(hook, 
      `Checkpoint saved: #${checkpointData.checkpointNumber} (${session.toolCalls} calls)`,
      {
        data: checkpointData,
        actions: ["checkpoint_saved"]
      }
    );
  }
};

/**
 * Checkpoint interval checker
 */
const onToolCallCheckpointCheck: HookDefinition = {
  id: "on-tool-call-checkpoint-check",
  name: "Checkpoint Interval Check",
  description: "Triggers checkpoint if interval reached (every 5-8 tool calls).",
  
  phase: "post-calculation",  // After any significant operation
  category: "lifecycle",
  mode: "logging",
  priority: "low",
  enabled: true,
  
  tags: ["checkpoint", "interval", "auto"],
  
  condition: (context: HookContext): boolean => {
    const toolCalls = context.session?.toolCalls || 0;
    const lastCheckpoint = context.metadata?.lastCheckpointAt as number || 0;
    return (toolCalls - lastCheckpoint) >= CHECKPOINT_INTERVAL;
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onToolCallCheckpointCheck;
    
    const toolCalls = context.session?.toolCalls || 0;
    
    return hookSuccess(hook, `Checkpoint recommended at ${toolCalls} tool calls`, {
      actions: ["checkpoint_recommended"],
      data: { toolCalls, reason: "interval_reached" }
    });
  }
};

// ============================================================================
// CONTEXT PRESSURE HOOKS
// ============================================================================

/**
 * Context pressure monitoring
 */
const onContextPressure: HookDefinition = {
  id: "on-context-pressure",
  name: "Context Pressure Monitor",
  description: "Monitors context window usage and triggers compression when needed.",
  
  phase: "on-context-pressure",
  category: "lifecycle",
  mode: "warning",
  priority: "critical",
  enabled: true,
  
  tags: ["context", "pressure", "compression"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onContextPressure;
    
    const contextUsage = context.metadata?.contextUsage as number | undefined;
    const toolCalls = context.session?.toolCalls || 0;
    
    // Determine buffer zone
    let bufferZone: string;
    if (toolCalls <= BUFFER_ZONES.GREEN.max) {
      bufferZone = "GREEN";
    } else if (toolCalls <= BUFFER_ZONES.YELLOW.max) {
      bufferZone = "YELLOW";
    } else if (toolCalls <= BUFFER_ZONES.RED.max) {
      bufferZone = "RED";
    } else {
      bufferZone = "BLACK";
    }
    
    const warnings: string[] = [];
    const actions: string[] = [];
    
    // Check context usage
    if (contextUsage && contextUsage > CONTEXT_PRESSURE_THRESHOLD) {
      warnings.push(`Context usage: ${(contextUsage * 100).toFixed(1)}%`);
      actions.push("context_compression_recommended");
    }
    
    // Buffer zone actions
    switch (bufferZone) {
      case "YELLOW":
        warnings.push(`Buffer zone YELLOW (${toolCalls} calls) - plan checkpoint`);
        actions.push("plan_checkpoint");
        break;
      case "RED":
        warnings.push(`Buffer zone RED (${toolCalls} calls) - IMMEDIATE checkpoint needed`);
        actions.push("immediate_checkpoint");
        break;
      case "BLACK":
        return hookBlock(hook, 
          `🛑 Buffer zone BLACK (${toolCalls} calls) - STOP and checkpoint NOW`,
          {
            issues: ["Maximum tool calls reached", "Session state at risk"],
            score: 0
          }
        );
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook, `Context pressure: ${bufferZone}`, {
        warnings,
        data: { bufferZone, toolCalls, contextUsage }
      });
    }
    
    return hookSuccess(hook, `Context healthy: ${bufferZone} (${toolCalls} calls)`, {
      data: { bufferZone, toolCalls }
    });
  }
};

/**
 * Buffer zone transition detector
 */
const onBufferZoneTransition: HookDefinition = {
  id: "on-buffer-zone-transition",
  name: "Buffer Zone Transition",
  description: "Detects and handles buffer zone transitions (GREEN→YELLOW→RED→BLACK).",
  
  phase: "on-context-pressure",
  category: "lifecycle",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["buffer-zone", "transition", "alert"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onBufferZoneTransition;
    
    const previousZone = context.metadata?.previousBufferZone as string | undefined;
    const currentZone = context.metadata?.currentBufferZone as string | undefined;
    
    if (!previousZone || !currentZone || previousZone === currentZone) {
      return hookSuccess(hook, "No buffer zone transition");
    }
    
    const zoneOrder = ["GREEN", "YELLOW", "RED", "BLACK"];
    const prevIndex = zoneOrder.indexOf(previousZone);
    const currIndex = zoneOrder.indexOf(currentZone);
    
    if (currIndex > prevIndex) {
      // Escalation
      return hookWarning(hook, 
        `⚠️ Buffer zone escalated: ${previousZone} → ${currentZone}`,
        {
          warnings: [
            `Context pressure increased`,
            currIndex >= 2 ? "Checkpoint URGENTLY recommended" : "Plan checkpoint soon"
          ],
          data: { from: previousZone, to: currentZone }
        }
      );
    } else {
      // De-escalation
      return hookSuccess(hook, `Buffer zone improved: ${previousZone} → ${currentZone}`, {
        data: { from: previousZone, to: currentZone },
        actions: ["buffer_improved"]
      });
    }
  }
};

// ============================================================================
// COMPACTION HANDLING HOOKS
// ============================================================================

/**
 * Pre-compaction state save
 */
const onCompaction: HookDefinition = {
  id: "on-compaction",
  name: "Pre-Compaction Handler",
  description: "Saves critical state before context compaction occurs.",
  
  phase: "on-compaction",
  category: "lifecycle",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["compaction", "state", "critical"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onCompaction;
    
    const session = context.session;
    
    // Build critical state to preserve
    const criticalState = {
      timestamp: new Date().toISOString(),
      event: "pre_compaction",
      sessionId: session?.id,
      toolCalls: session?.toolCalls,
      currentTask: context.metadata?.currentTask,
      taskStatus: context.metadata?.taskStatus,
      progress: context.metadata?.progress,
      completedItems: context.metadata?.completedItems,
      nextItem: context.metadata?.nextItem,
      quickResume: context.metadata?.quickResume
    };
    
    log.info(`Pre-compaction state captured: ${JSON.stringify(criticalState).slice(0, 500)}`);
    
    return hookSuccess(hook, "Critical state saved before compaction", {
      data: criticalState,
      actions: ["state_preserved", "ready_for_compaction"]
    });
  }
};

/**
 * Post-compaction recovery guidance
 */
const onPostCompaction: HookDefinition = {
  id: "on-post-compaction",
  name: "Post-Compaction Recovery",
  description: "Provides guidance for resuming after context compaction.",
  
  phase: "on-session-resume",
  category: "lifecycle",
  mode: "logging",
  priority: "high",
  enabled: true,
  
  tags: ["compaction", "recovery", "resume"],
  
  condition: (context: HookContext): boolean => {
    return context.metadata?.isPostCompaction === true;
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onPostCompaction;
    
    const savedState = context.metadata?.savedState as Record<string, unknown> | undefined;
    
    if (!savedState) {
      return hookWarning(hook, "No saved state found after compaction", {
        warnings: [
          "State was not preserved before compaction",
          "Some progress may be lost",
          "Check SESSION_MEMORY.json for last checkpoint"
        ]
      });
    }
    
    return hookSuccess(hook, "Post-compaction state recovered", {
      data: savedState,
      actions: [
        "state_recovered",
        `resume_from:${savedState.nextItem || "last_checkpoint"}`
      ]
    });
  }
};

// ============================================================================
// SESSION END HOOKS
// ============================================================================

/**
 * Session end handler
 */
const onSessionEnd: HookDefinition = {
  id: "on-session-end",
  name: "Session End Handler",
  description: "Finalizes session, saves state, generates handoff notes.",
  
  phase: "on-session-end",
  category: "lifecycle",
  mode: "logging",
  priority: "critical",
  enabled: true,
  
  tags: ["session", "end", "handoff"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionEnd;
    
    const session = context.session;
    const status = context.metadata?.status as string || "UNKNOWN";
    
    const sessionSummary = {
      sessionId: session?.id,
      startTime: session?.startTime,
      endTime: new Date().toISOString(),
      duration: session?.startTime 
        ? Date.now() - new Date(session.startTime as unknown as string).getTime()
        : 0,
      toolCalls: session?.toolCalls,
      checkpoints: session?.checkpoints,
      status,
      completedTasks: context.metadata?.completedTasks,
      nextTasks: context.metadata?.nextTasks,
      quickResume: context.metadata?.quickResume
    };
    
    log.info(`Session ended: ${session?.id} - ${status}`);
    log.info(`Session summary: ${JSON.stringify(sessionSummary).slice(0, 500)}`);
    
    return hookSuccess(hook, `Session ${status}: ${session?.id}`, {
      data: sessionSummary,
      actions: ["session_ended", "state_saved", "handoff_ready"]
    });
  }
};

/**
 * Handoff notes generator
 */
const onSessionEndHandoff: HookDefinition = {
  id: "on-session-end-handoff",
  name: "Handoff Notes Generator",
  description: "Generates handoff notes for next session.",
  
  phase: "on-session-end",
  category: "lifecycle",
  mode: "logging",
  priority: "high",
  enabled: true,
  
  tags: ["session", "handoff", "notes"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionEndHandoff;
    
    const session = context.session;
    
    const handoffNotes = {
      sessionId: session?.id,
      timestamp: new Date().toISOString(),
      
      // What was accomplished
      completed: context.metadata?.completedTasks || [],
      itemsProcessed: context.metadata?.itemsProcessed || 0,
      
      // What's next
      nextTask: context.metadata?.nextTask,
      nextItem: context.metadata?.nextItem,
      blockers: context.metadata?.blockers || [],
      
      // Quick resume string
      quickResume: context.metadata?.quickResume || 
        `Session ${session?.id} ended. ${context.metadata?.itemsProcessed || 0} items processed. Next: ${context.metadata?.nextTask || "Continue from last checkpoint"}`,
      
      // Important state
      criticalState: {
        phase: context.metadata?.currentPhase,
        progress: context.metadata?.progress,
        lastFile: context.metadata?.lastFile
      }
    };
    
    return hookSuccess(hook, "Handoff notes generated", {
      data: handoffNotes,
      actions: ["handoff_generated"]
    });
  }
};

/**
 * State file update on session end
 */
const onSessionEndStateUpdate: HookDefinition = {
  id: "on-session-end-state-update",
  name: "State File Update",
  description: "Updates CURRENT_STATE.json with session results.",
  
  phase: "on-session-end",
  category: "lifecycle",
  mode: "logging",
  priority: "critical",
  enabled: true,
  
  tags: ["session", "state", "save"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionEndStateUpdate;
    
    const session = context.session;
    const status = context.metadata?.status as string || "UNKNOWN";
    
    const stateUpdate = {
      version: context.metadata?.newVersion || "UPDATE",
      lastUpdated: new Date().toISOString(),
      currentSession: {
        id: session?.id,
        status,
        completedAt: new Date().toISOString(),
        toolCalls: session?.toolCalls,
        checkpoints: session?.checkpoints
      },
      nextSession: context.metadata?.nextSession,
      quickResume: context.metadata?.quickResume
    };
    
    return hookSuccess(hook, "State file update prepared", {
      data: stateUpdate,
      actions: ["state_update_prepared"]
    });
  }
};

// ============================================================================
// SESSION RESUME HOOKS
// ============================================================================

/**
 * Session resume handler
 */
const onSessionResume: HookDefinition = {
  id: "on-session-resume",
  name: "Session Resume Handler",
  description: "Handles resuming from previous session state.",
  
  phase: "on-session-resume",
  category: "lifecycle",
  mode: "logging",
  priority: "critical",
  enabled: true,
  
  tags: ["session", "resume", "continuity"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionResume;
    
    const previousSession = context.metadata?.previousSession as Record<string, unknown> | undefined;
    const quickResume = context.metadata?.quickResume as string | undefined;
    
    if (!previousSession && !quickResume) {
      return hookSuccess(hook, "Starting fresh - no previous session to resume");
    }
    
    const resumeInfo = {
      previousSessionId: previousSession?.id,
      previousStatus: previousSession?.status,
      lastTask: previousSession?.currentTask,
      lastProgress: previousSession?.progress,
      quickResume
    };
    
    log.info(`Resuming session: ${quickResume?.slice(0, 200)}`);
    
    return hookSuccess(hook, `Resuming from: ${previousSession?.id || "saved state"}`, {
      data: resumeInfo,
      actions: [
        "session_resumed",
        previousSession?.currentTask ? `resume_task:${previousSession.currentTask}` : "start_fresh"
      ]
    });
  }
};

/**
 * Progress verification on resume
 */
const onSessionResumeProgressVerify: HookDefinition = {
  id: "on-session-resume-progress-verify",
  name: "Progress Verification",
  description: "Verifies progress claims match actual file state.",
  
  phase: "on-session-resume",
  category: "lifecycle",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["session", "resume", "verification"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onSessionResumeProgressVerify;
    
    const claimedProgress = context.metadata?.claimedProgress as Record<string, unknown> | undefined;
    const actualProgress = context.metadata?.actualProgress as Record<string, unknown> | undefined;
    
    if (!claimedProgress || !actualProgress) {
      return hookSuccess(hook, "No progress claims to verify");
    }
    
    const discrepancies: string[] = [];
    
    // Compare claimed vs actual
    for (const [key, claimed] of Object.entries(claimedProgress)) {
      const actual = actualProgress[key];
      if (actual !== claimed) {
        discrepancies.push(`${key}: claimed ${claimed}, actual ${actual}`);
      }
    }
    
    if (discrepancies.length > 0) {
      return hookWarning(hook, "Progress discrepancies detected", {
        warnings: discrepancies
      });
    }
    
    return hookSuccess(hook, "Progress verified - matches file state");
  }
};

// ============================================================================
// EXPORT ALL LIFECYCLE HOOKS
// ============================================================================

export const lifecycleHooks: HookDefinition[] = [
  // Session start
  onSessionStart,
  onSessionStartStateLoad,
  onSessionStartSkillsLoad,
  
  // Checkpoints
  onSessionCheckpoint,
  onToolCallCheckpointCheck,
  
  // Context pressure
  onContextPressure,
  onBufferZoneTransition,
  
  // Compaction
  onCompaction,
  onPostCompaction,
  
  // Session end
  onSessionEnd,
  onSessionEndHandoff,
  onSessionEndStateUpdate,
  
  // Session resume
  onSessionResume,
  onSessionResumeProgressVerify
];

export {
  onSessionStart,
  onSessionStartStateLoad,
  onSessionStartSkillsLoad,
  onSessionCheckpoint,
  onToolCallCheckpointCheck,
  onContextPressure,
  onBufferZoneTransition,
  onCompaction,
  onPostCompaction,
  onSessionEnd,
  onSessionEndHandoff,
  onSessionEndStateUpdate,
  onSessionResume,
  onSessionResumeProgressVerify,
  BUFFER_ZONES,
  CHECKPOINT_INTERVAL
};
