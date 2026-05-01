#!/usr/bin/env python3
"""
PRISM COMPREHENSIVE HOOK SYSTEM v2.0
=====================================
EXHAUSTIVE coverage of ALL possible events across the entire PRISM ecosystem.

PRISM Products:
1. Speed & Feed Calculator - Cutting parameter optimization
2. Post Processor Generator - G-code generation for CNC controllers
3. Shop Manager/Quoting - Cost estimation, scheduling, resource management
4. Auto CNC Programmer - Automated CAM programming

Core Domains:
- Materials (1,047 × 127 params) - Kienzle, Johnson-Cook, Taylor
- Machines (824 × 43 mfrs) - Spindle, axes, envelopes
- Tools (cutting tools, holders) - Geometry, coatings, wear
- Controllers (12 families) - FANUC, Siemens, Heidenhain, etc.
- Alarms (9,200 codes) - Diagnosis, recovery, prevention
- Physics engines - Force, thermal, vibration, deflection
- AI/ML systems - Optimization, prediction, learning

Total Hooks: 312 (organized into 26 categories)
"""

import json
from datetime import datetime
from typing import Dict, List, Any, Callable, Optional
from dataclasses import dataclass, field
from enum import Enum
import logging

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: HOOK INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════════════════════════

class HookPriority(Enum):
    """Hook execution priority - lower numbers execute first."""
    CRITICAL = 0      # Safety, blocking checks
    HIGH = 10         # State management, validation
    NORMAL = 50       # Standard processing
    LOW = 100         # Logging, analytics
    DEFERRED = 200    # Background, non-blocking

class HookCategory(Enum):
    """Hook categories for organization."""
    SYSTEM = "system"
    SESSION = "session"
    TASK = "task"
    MICROSESSION = "microsession"
    DATABASE = "database"
    MATERIAL = "material"
    MACHINE = "machine"
    TOOL = "tool"
    CONTROLLER = "controller"
    ALARM = "alarm"
    CALCULATION = "calculation"
    PHYSICS = "physics"
    SAFETY = "safety"
    QUALITY = "quality"
    FORMULA = "formula"
    PREDICTION = "prediction"
    AGENT = "agent"
    SWARM = "swarm"
    RALPH = "ralph"
    LEARNING = "learning"
    VERIFICATION = "verification"
    GCODE = "gcode"
    TOOLPATH = "toolpath"
    SIMULATION = "simulation"
    QUOTING = "quoting"
    INTEGRATION = "integration"

@dataclass
class HookDefinition:
    """Complete hook definition with all metadata."""
    id: str
    category: HookCategory
    priority: HookPriority
    trigger: str
    action: str
    description: str
    canDisable: bool = True
    isBlocking: bool = False
    timeout_ms: int = 5000
    retryCount: int = 0
    dependencies: List[str] = field(default_factory=list)
    consumers: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "category": self.category.value,
            "priority": self.priority.value,
            "trigger": self.trigger,
            "action": self.action,
            "description": self.description,
            "canDisable": self.canDisable,
            "isBlocking": self.isBlocking,
            "timeout_ms": self.timeout_ms,
            "retryCount": self.retryCount,
            "dependencies": self.dependencies,
            "consumers": self.consumers
        }

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: SYSTEM HOOKS (15) - Cannot be disabled
# ═══════════════════════════════════════════════════════════════════════════════

SYSTEM_HOOKS = [
    HookDefinition("SYS-LAW1-SAFETY", HookCategory.SYSTEM, HookPriority.CRITICAL,
        "Any output generation", "BLOCK if S(x) < 0.70",
        "Enforces safety threshold on ALL outputs - CANNOT BE BYPASSED",
        canDisable=False, isBlocking=True),
    HookDefinition("SYS-LAW2-MICROSESSION", HookCategory.SYSTEM, HookPriority.HIGH,
        "Task exceeds 25 items", "Force chunking",
        "Enforces microsession limits to prevent context overflow",
        canDisable=False, isBlocking=True),
    HookDefinition("SYS-LAW3-COMPLETENESS", HookCategory.SYSTEM, HookPriority.HIGH,
        "Task completion claim", "Verify C(T) = 1.0",
        "Blocks 'done' claims without evidence of 100% completion",
        canDisable=False, isBlocking=True),
    HookDefinition("SYS-LAW4-REGRESSION", HookCategory.SYSTEM, HookPriority.HIGH,
        "Any replacement operation", "Compare old vs new counts",
        "BLOCKS any operation that would lose data (new < old)",
        canDisable=False, isBlocking=True),
    HookDefinition("SYS-LAW5-PREDICTIVE", HookCategory.SYSTEM, HookPriority.NORMAL,
        "Before any significant action", "Generate 3 failure modes",
        "Requires prediction of what could go wrong before proceeding",
        canDisable=False, isBlocking=False),
    HookDefinition("SYS-LAW6-CONTINUITY", HookCategory.SYSTEM, HookPriority.HIGH,
        "Session start", "Load CURRENT_STATE.json",
        "Enforces state loading for session continuity",
        canDisable=False, isBlocking=True),
    HookDefinition("SYS-LAW7-VERIFICATION", HookCategory.SYSTEM, HookPriority.CRITICAL,
        "Major milestone claim", "Require 95% confidence evidence",
        "Blocks completion claims without verification evidence",
        canDisable=False, isBlocking=True),
    HookDefinition("SYS-LAW8-MATH-EVOLUTION", HookCategory.SYSTEM, HookPriority.NORMAL,
        "Formula application", "Verify M(x) >= 0.60",
        "Ensures mathematical rigor in all calculations",
        canDisable=False, isBlocking=True),
    HookDefinition("SYS-MATHPLAN-GATE", HookCategory.SYSTEM, HookPriority.HIGH,
        "Before complex task execution", "Validate MATHPLAN exists",
        "Requires mathematical planning before execution",
        canDisable=False, isBlocking=True),
    HookDefinition("SYS-CMD1-WIRING", HookCategory.SYSTEM, HookPriority.NORMAL,
        "Module creation", "Verify 6+ consumers",
        "Ensures no orphaned modules - everything must be wired",
        canDisable=False, isBlocking=False),
    HookDefinition("SYS-CMD5-UNCERTAINTY", HookCategory.SYSTEM, HookPriority.NORMAL,
        "Any numeric output", "Auto-inject ± uncertainty",
        "Automatically adds uncertainty bounds to calculations",
        canDisable=False, isBlocking=False),
    HookDefinition("SYS-PREDICTION-LOG", HookCategory.SYSTEM, HookPriority.LOW,
        "Prediction made", "Log for calibration tracking",
        "Records all predictions for accuracy analysis",
        canDisable=False, isBlocking=False),
    HookDefinition("SYS-CALIBRATION-MONITOR", HookCategory.SYSTEM, HookPriority.LOW,
        "Formula use", "Track prediction vs actual",
        "Monitors formula health and drift over time",
        canDisable=False, isBlocking=False),
    HookDefinition("SYS-LEARNING-EXTRACT", HookCategory.SYSTEM, HookPriority.LOW,
        "Session end", "Extract learnings automatically",
        "Captures session learnings for future application",
        canDisable=False, isBlocking=False),
    HookDefinition("SYS-BUFFER-ZONE", HookCategory.SYSTEM, HookPriority.CRITICAL,
        "Tool call count >= 19", "FORCE STOP",
        "Hard stop at buffer zone black to prevent context loss",
        canDisable=False, isBlocking=True),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: SESSION HOOKS (18)
# ═══════════════════════════════════════════════════════════════════════════════

SESSION_HOOKS = [
    HookDefinition("session:preStart", HookCategory.SESSION, HookPriority.HIGH,
        "Before session initialization", "Prepare environment",
        "Validates paths, checks disk space, loads configuration"),
    HookDefinition("session:postStart", HookCategory.SESSION, HookPriority.HIGH,
        "After session starts", "Validate context loaded",
        "Confirms state file loaded, announces session ID"),
    HookDefinition("session:stateLoad", HookCategory.SESSION, HookPriority.HIGH,
        "State file read", "Parse and validate JSON",
        "Loads CURRENT_STATE.json with integrity checks"),
    HookDefinition("session:stateSave", HookCategory.SESSION, HookPriority.HIGH,
        "State persistence requested", "Write with backup",
        "Saves state with atomic write and backup creation"),
    HookDefinition("session:checkpointCreate", HookCategory.SESSION, HookPriority.NORMAL,
        "Checkpoint triggered", "Persist progress",
        "Creates checkpoint with current progress and context"),
    HookDefinition("session:checkpointRestore", HookCategory.SESSION, HookPriority.HIGH,
        "Resume from checkpoint", "Restore state",
        "Restores session from checkpoint data"),
    HookDefinition("session:bufferGreen", HookCategory.SESSION, HookPriority.LOW,
        "Tool calls 0-8", "Normal operation",
        "Logs green zone status"),
    HookDefinition("session:bufferYellow", HookCategory.SESSION, HookPriority.NORMAL,
        "Tool calls 9-14", "Plan checkpoint",
        "Warns of approaching limit, suggests checkpoint"),
    HookDefinition("session:bufferRed", HookCategory.SESSION, HookPriority.HIGH,
        "Tool calls 15-18", "IMMEDIATE checkpoint",
        "Forces immediate checkpoint creation"),
    HookDefinition("session:bufferBlack", HookCategory.SESSION, HookPriority.CRITICAL,
        "Tool calls 19+", "STOP ALL WORK",
        "Halts execution, creates emergency state dump",
        isBlocking=True),
    HookDefinition("session:preCompact", HookCategory.SESSION, HookPriority.CRITICAL,
        "Context compaction imminent", "Emergency state save",
        "Saves all state before compaction occurs"),
    HookDefinition("session:postCompact", HookCategory.SESSION, HookPriority.HIGH,
        "After context compaction", "Recover state",
        "Restores context from saved state after compaction"),
    HookDefinition("session:preEnd", HookCategory.SESSION, HookPriority.HIGH,
        "Before session ends", "Final state save",
        "Ensures all progress saved before session termination"),
    HookDefinition("session:postEnd", HookCategory.SESSION, HookPriority.LOW,
        "After session ends", "Cleanup and logging",
        "Cleans temporary files, logs session summary"),
    HookDefinition("session:resumeDetected", HookCategory.SESSION, HookPriority.HIGH,
        "Previous session found", "Load continuation context",
        "Detects and loads previous incomplete session"),
    HookDefinition("session:skillLoad", HookCategory.SESSION, HookPriority.NORMAL,
        "Skill loading requested", "Load and validate skill",
        "Loads skill file with dependency checking"),
    HookDefinition("session:memoryCheck", HookCategory.SESSION, HookPriority.NORMAL,
        "Periodic memory check", "Validate context usage",
        "Monitors context window usage and triggers cleanup"),
    HookDefinition("session:errorRecovery", HookCategory.SESSION, HookPriority.HIGH,
        "Session error detected", "Attempt recovery",
        "Handles session errors with graceful recovery"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: TASK HOOKS (20)
# ═══════════════════════════════════════════════════════════════════════════════

TASK_HOOKS = [
    HookDefinition("task:received", HookCategory.TASK, HookPriority.HIGH,
        "New task received", "Parse and classify",
        "Parses task, identifies type, estimates complexity"),
    HookDefinition("task:classify", HookCategory.TASK, HookPriority.NORMAL,
        "Task classification", "Determine domain and skills",
        "Classifies task into domain, selects required skills"),
    HookDefinition("task:prePlan", HookCategory.TASK, HookPriority.NORMAL,
        "Before planning phase", "Validate requirements",
        "Validates task has clear requirements before planning"),
    HookDefinition("task:mathPlanCreate", HookCategory.TASK, HookPriority.NORMAL,
        "MATHPLAN creation", "Generate mathematical approach",
        "Creates mathematical plan for task execution"),
    HookDefinition("task:mathPlanValidate", HookCategory.TASK, HookPriority.HIGH,
        "MATHPLAN validation gate", "Verify approach is sound",
        "Validates mathematical approach before execution",
        isBlocking=True),
    HookDefinition("task:decompose", HookCategory.TASK, HookPriority.NORMAL,
        "Complex task detected", "Break into subtasks",
        "Decomposes large task into manageable chunks"),
    HookDefinition("task:prioritize", HookCategory.TASK, HookPriority.NORMAL,
        "Multiple subtasks", "Order by priority",
        "Orders subtasks by dependencies and value"),
    HookDefinition("task:resourceSelect", HookCategory.TASK, HookPriority.NORMAL,
        "Before execution", "Select optimal resources via ILP",
        "Uses F-PSI-001 to select skills, agents, formulas"),
    HookDefinition("task:preExecute", HookCategory.TASK, HookPriority.HIGH,
        "Before task execution", "Final validation",
        "Final checks before task execution begins"),
    HookDefinition("task:start", HookCategory.TASK, HookPriority.NORMAL,
        "Task execution starts", "Initialize tracking",
        "Starts progress tracking and logging"),
    HookDefinition("task:progress", HookCategory.TASK, HookPriority.LOW,
        "Progress update", "Log and track",
        "Records progress for monitoring"),
    HookDefinition("task:checkpoint", HookCategory.TASK, HookPriority.NORMAL,
        "Checkpoint interval (5-8 items)", "Persist progress",
        "Creates task checkpoint for recovery"),
    HookDefinition("task:blocked", HookCategory.TASK, HookPriority.HIGH,
        "Task blocked", "Identify blocker, escalate",
        "Handles task blocking with escalation"),
    HookDefinition("task:unblocked", HookCategory.TASK, HookPriority.NORMAL,
        "Blocker resolved", "Resume execution",
        "Resumes task after blocker resolution"),
    HookDefinition("task:postExecute", HookCategory.TASK, HookPriority.NORMAL,
        "After execution", "Validate outputs",
        "Validates task outputs meet requirements"),
    HookDefinition("task:complete", HookCategory.TASK, HookPriority.NORMAL,
        "Task completion", "Verify deliverables",
        "Confirms all deliverables produced correctly"),
    HookDefinition("task:failed", HookCategory.TASK, HookPriority.HIGH,
        "Task failure", "Log, analyze, recover",
        "Handles task failure with root cause analysis"),
    HookDefinition("task:retry", HookCategory.TASK, HookPriority.NORMAL,
        "Task retry requested", "Reset and retry",
        "Handles task retry with fresh state"),
    HookDefinition("task:cancel", HookCategory.TASK, HookPriority.HIGH,
        "Task cancellation", "Cleanup and log",
        "Handles task cancellation with proper cleanup"),
    HookDefinition("task:handoff", HookCategory.TASK, HookPriority.NORMAL,
        "Task handoff to next session", "Prepare continuation",
        "Prepares task state for continuation in next session"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: MICROSESSION HOOKS (10)
# ═══════════════════════════════════════════════════════════════════════════════

MICROSESSION_HOOKS = [
    HookDefinition("microsession:start", HookCategory.MICROSESSION, HookPriority.NORMAL,
        "Batch begins", "Set boundaries (15-25 items)",
        "Initializes microsession with item limits"),
    HookDefinition("microsession:itemStart", HookCategory.MICROSESSION, HookPriority.LOW,
        "Item processing begins", "Track item",
        "Tracks individual item processing start"),
    HookDefinition("microsession:itemComplete", HookCategory.MICROSESSION, HookPriority.LOW,
        "Item processing ends", "Update counter",
        "Updates progress counter after item completion"),
    HookDefinition("microsession:progress", HookCategory.MICROSESSION, HookPriority.LOW,
        "Progress milestone", "Log progress",
        "Logs progress at defined intervals"),
    HookDefinition("microsession:midpointCheck", HookCategory.MICROSESSION, HookPriority.NORMAL,
        "Halfway through batch", "Validate trajectory",
        "Checks if batch is on track at midpoint"),
    HookDefinition("microsession:bufferWarning", HookCategory.MICROSESSION, HookPriority.NORMAL,
        "Approaching 25 items", "Plan wrap-up",
        "Warns that batch limit approaching"),
    HookDefinition("microsession:overflow", HookCategory.MICROSESSION, HookPriority.HIGH,
        "Exceeds 25 items", "Force split",
        "Forces microsession split when limit exceeded",
        isBlocking=True),
    HookDefinition("microsession:preComplete", HookCategory.MICROSESSION, HookPriority.NORMAL,
        "Before batch completion", "Prepare summary",
        "Prepares batch summary and handoff"),
    HookDefinition("microsession:complete", HookCategory.MICROSESSION, HookPriority.NORMAL,
        "Batch complete", "Summarize and checkpoint",
        "Completes batch with summary and checkpoint"),
    HookDefinition("microsession:transition", HookCategory.MICROSESSION, HookPriority.NORMAL,
        "Moving to next batch", "Handoff state",
        "Handles transition between microsessions"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6: DATABASE HOOKS (20)
# ═══════════════════════════════════════════════════════════════════════════════

DATABASE_HOOKS = [
    HookDefinition("database:preConnect", HookCategory.DATABASE, HookPriority.HIGH,
        "Before database connection", "Validate connection params",
        "Validates database path and permissions"),
    HookDefinition("database:postConnect", HookCategory.DATABASE, HookPriority.NORMAL,
        "After connection established", "Verify integrity",
        "Verifies database integrity after connection"),
    HookDefinition("database:preRead", HookCategory.DATABASE, HookPriority.NORMAL,
        "Before read operation", "Validate query",
        "Validates read query before execution"),
    HookDefinition("database:postRead", HookCategory.DATABASE, HookPriority.LOW,
        "After read operation", "Log access",
        "Logs read operation for audit"),
    HookDefinition("database:preWrite", HookCategory.DATABASE, HookPriority.HIGH,
        "Before write operation", "Validate data",
        "Validates data before write"),
    HookDefinition("database:postWrite", HookCategory.DATABASE, HookPriority.NORMAL,
        "After write operation", "Verify write",
        "Verifies write completed successfully"),
    HookDefinition("database:preUpdate", HookCategory.DATABASE, HookPriority.HIGH,
        "Before update operation", "Snapshot original",
        "Creates snapshot before update for rollback"),
    HookDefinition("database:postUpdate", HookCategory.DATABASE, HookPriority.NORMAL,
        "After update operation", "Validate result",
        "Validates update result matches expectation"),
    HookDefinition("database:preDelete", HookCategory.DATABASE, HookPriority.CRITICAL,
        "Before delete operation", "Confirm and backup",
        "Requires confirmation and creates backup before delete",
        isBlocking=True),
    HookDefinition("database:postDelete", HookCategory.DATABASE, HookPriority.NORMAL,
        "After delete operation", "Log deletion",
        "Logs deletion with recovery info"),
    HookDefinition("database:antiRegressionCheck", HookCategory.DATABASE, HookPriority.CRITICAL,
        "Before any replacement", "Compare counts (new >= old)",
        "BLOCKS if replacement would lose data",
        isBlocking=True),
    HookDefinition("database:consumerWiringCheck", HookCategory.DATABASE, HookPriority.NORMAL,
        "After creation", "Verify 6+ consumers",
        "Ensures new data has adequate consumers"),
    HookDefinition("database:sizeThreshold", HookCategory.DATABASE, HookPriority.NORMAL,
        "Size change > 20%", "Flag for review",
        "Flags significant size changes for review"),
    HookDefinition("database:migrationStart", HookCategory.DATABASE, HookPriority.HIGH,
        "Migration begins", "Lock source, create backup",
        "Prepares for migration with safety measures"),
    HookDefinition("database:migrationProgress", HookCategory.DATABASE, HookPriority.LOW,
        "Migration progress", "Track progress",
        "Tracks migration progress for monitoring"),
    HookDefinition("database:migrationComplete", HookCategory.DATABASE, HookPriority.HIGH,
        "Migration done", "Verify counts match",
        "Verifies migration completed without data loss"),
    HookDefinition("database:migrationRollback", HookCategory.DATABASE, HookPriority.CRITICAL,
        "Migration failed", "Restore from backup",
        "Handles migration failure with rollback"),
    HookDefinition("database:backupCreate", HookCategory.DATABASE, HookPriority.NORMAL,
        "Backup triggered", "Create timestamped backup",
        "Creates database backup with timestamp"),
    HookDefinition("database:indexRebuild", HookCategory.DATABASE, HookPriority.LOW,
        "After bulk operations", "Rebuild indexes",
        "Rebuilds indexes for performance"),
    HookDefinition("database:integrityCheck", HookCategory.DATABASE, HookPriority.NORMAL,
        "Periodic or on-demand", "Validate integrity",
        "Runs integrity checks on database"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7: MATERIAL HOOKS (25) - 1,047 materials × 127 parameters
# ═══════════════════════════════════════════════════════════════════════════════

MATERIAL_HOOKS = [
    HookDefinition("material:lookup", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Material search requested", "Search by name/UNS/category",
        "Searches material database with fuzzy matching"),
    HookDefinition("material:found", HookCategory.MATERIAL, HookPriority.LOW,
        "Material found", "Return with metadata",
        "Returns material with full 127-parameter data"),
    HookDefinition("material:notFound", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Material not found", "Suggest alternatives",
        "Suggests similar materials when exact match not found"),
    HookDefinition("material:create", HookCategory.MATERIAL, HookPriority.NORMAL,
        "New material creation", "Initialize with defaults",
        "Creates new material entry with category defaults"),
    HookDefinition("material:preUpdate", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Before material update", "Snapshot original",
        "Snapshots material before modification"),
    HookDefinition("material:postUpdate", HookCategory.MATERIAL, HookPriority.NORMAL,
        "After material update", "Recalculate derived",
        "Recalculates derived parameters after update"),
    HookDefinition("material:completenessCheck", HookCategory.MATERIAL, HookPriority.NORMAL,
        "After any change", "Compute coverage %",
        "Computes parameter coverage percentage"),
    HookDefinition("material:gradeCompute", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Quality assessment", "Calculate A-F grade",
        "Computes material data quality grade"),
    HookDefinition("material:cascade", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Parent condition change", "Update children",
        "Cascades changes to child conditions"),
    HookDefinition("material:kienzleValidate", HookCategory.MATERIAL, HookPriority.HIGH,
        "Kienzle coefficient use", "Validate kc1.1 and mc",
        "Validates Kienzle coefficients before calculation"),
    HookDefinition("material:taylorValidate", HookCategory.MATERIAL, HookPriority.HIGH,
        "Taylor coefficient use", "Validate C and n",
        "Validates Taylor tool life coefficients"),
    HookDefinition("material:johnsonCookValidate", HookCategory.MATERIAL, HookPriority.HIGH,
        "J-C model use", "Validate A, B, n, C, m",
        "Validates Johnson-Cook constitutive parameters"),
    HookDefinition("material:physicsConsistency", HookCategory.MATERIAL, HookPriority.HIGH,
        "Multi-parameter calculation", "Check physics consistency",
        "Ensures parameters are physically consistent"),
    HookDefinition("material:hardnessConvert", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Hardness conversion needed", "Convert HRC/HB/HV",
        "Handles hardness unit conversions"),
    HookDefinition("material:strengthEstimate", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Missing strength data", "Estimate from hardness",
        "Estimates tensile/yield from hardness correlation"),
    HookDefinition("material:machinabilityCompute", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Machinability needed", "Compute from composition",
        "Computes machinability rating"),
    HookDefinition("material:thermalCompute", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Thermal properties needed", "Calculate or estimate",
        "Computes thermal conductivity, specific heat"),
    HookDefinition("material:gapIdentify", HookCategory.MATERIAL, HookPriority.LOW,
        "Enhancement request", "List missing parameters",
        "Identifies gaps in material data"),
    HookDefinition("material:sourceVerify", HookCategory.MATERIAL, HookPriority.NORMAL,
        "New data added", "Verify source tier",
        "Verifies data source meets quality tier"),
    HookDefinition("material:categoryAssign", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Material classification", "Assign ISO 513 category",
        "Assigns P/M/K/N/S/H classification"),
    HookDefinition("material:aliasResolve", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Alias lookup", "Resolve to canonical name",
        "Resolves material aliases to canonical names"),
    HookDefinition("material:unitConvert", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Unit conversion needed", "Convert with precision",
        "Handles material property unit conversions"),
    HookDefinition("material:temperatureAdjust", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Non-standard temperature", "Adjust properties",
        "Adjusts properties for temperature variation"),
    HookDefinition("material:conditionMatch", HookCategory.MATERIAL, HookPriority.NORMAL,
        "Condition lookup", "Find matching condition",
        "Matches material to specific heat treat condition"),
    HookDefinition("material:exportFormat", HookCategory.MATERIAL, HookPriority.LOW,
        "Export requested", "Format for output",
        "Formats material data for export"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8: MACHINE HOOKS (20) - 824 machines × 43 manufacturers
# ═══════════════════════════════════════════════════════════════════════════════

MACHINE_HOOKS = [
    HookDefinition("machine:lookup", HookCategory.MACHINE, HookPriority.NORMAL,
        "Machine search", "Search by model/manufacturer",
        "Searches machine database"),
    HookDefinition("machine:found", HookCategory.MACHINE, HookPriority.LOW,
        "Machine found", "Return full specs",
        "Returns machine with complete specifications"),
    HookDefinition("machine:notFound", HookCategory.MACHINE, HookPriority.NORMAL,
        "Machine not found", "Suggest similar",
        "Suggests similar machines"),
    HookDefinition("machine:create", HookCategory.MACHINE, HookPriority.NORMAL,
        "New machine entry", "Initialize with manufacturer defaults",
        "Creates machine entry"),
    HookDefinition("machine:envelopeCheck", HookCategory.MACHINE, HookPriority.HIGH,
        "Part vs machine", "Verify part fits envelope",
        "Checks part fits within machine envelope",
        isBlocking=True),
    HookDefinition("machine:spindleCheck", HookCategory.MACHINE, HookPriority.HIGH,
        "Spindle requirements", "Verify speed/torque/power",
        "Validates spindle can handle requirements"),
    HookDefinition("machine:axisCheck", HookCategory.MACHINE, HookPriority.NORMAL,
        "Axis requirements", "Verify travel and dynamics",
        "Validates axis capabilities"),
    HookDefinition("machine:controllerMatch", HookCategory.MACHINE, HookPriority.NORMAL,
        "Controller lookup", "Match to controller family",
        "Identifies machine's controller family"),
    HookDefinition("machine:postMatch", HookCategory.MACHINE, HookPriority.NORMAL,
        "Post processor match", "Find compatible post",
        "Matches machine to post processor"),
    HookDefinition("machine:capabilityScore", HookCategory.MACHINE, HookPriority.NORMAL,
        "Machine evaluation", "Score capabilities",
        "Scores machine for specific operation"),
    HookDefinition("machine:optionCheck", HookCategory.MACHINE, HookPriority.NORMAL,
        "Option verification", "Check installed options",
        "Verifies required options are installed"),
    HookDefinition("machine:accuracyValidate", HookCategory.MACHINE, HookPriority.NORMAL,
        "Precision requirement", "Validate positioning accuracy",
        "Validates machine accuracy meets requirements"),
    HookDefinition("machine:coolantCheck", HookCategory.MACHINE, HookPriority.LOW,
        "Coolant requirements", "Verify coolant system",
        "Checks coolant system compatibility"),
    HookDefinition("machine:toolChangeValidate", HookCategory.MACHINE, HookPriority.NORMAL,
        "Tool change needs", "Verify ATC capacity",
        "Validates ATC capacity and tool handling"),
    HookDefinition("machine:workHoldingCheck", HookCategory.MACHINE, HookPriority.NORMAL,
        "Workholding needs", "Verify table/chuck specs",
        "Validates workholding compatibility"),
    HookDefinition("machine:kinematics", HookCategory.MACHINE, HookPriority.NORMAL,
        "Multi-axis operation", "Validate kinematic model",
        "Validates machine kinematic configuration"),
    HookDefinition("machine:limitCheck", HookCategory.MACHINE, HookPriority.HIGH,
        "Operating limits", "Check vs machine limits",
        "Validates parameters within machine limits"),
    HookDefinition("machine:maintenanceAlert", HookCategory.MACHINE, HookPriority.LOW,
        "Maintenance tracking", "Check maintenance status",
        "Alerts on maintenance requirements"),
    HookDefinition("machine:utilizationTrack", HookCategory.MACHINE, HookPriority.LOW,
        "Usage tracking", "Log machine usage",
        "Tracks machine utilization"),
    HookDefinition("machine:exportFormat", HookCategory.MACHINE, HookPriority.LOW,
        "Export requested", "Format for output",
        "Formats machine data for export"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 9: TOOL HOOKS (22) - Cutting tools and holders
# ═══════════════════════════════════════════════════════════════════════════════

TOOL_HOOKS = [
    HookDefinition("tool:lookup", HookCategory.TOOL, HookPriority.NORMAL,
        "Tool search", "Search by type/size/manufacturer",
        "Searches cutting tool database"),
    HookDefinition("tool:found", HookCategory.TOOL, HookPriority.LOW,
        "Tool found", "Return with geometry and recommendations",
        "Returns tool with complete data"),
    HookDefinition("tool:select", HookCategory.TOOL, HookPriority.NORMAL,
        "Tool selection needed", "Recommend optimal tool",
        "Selects optimal tool for operation"),
    HookDefinition("tool:validate", HookCategory.TOOL, HookPriority.HIGH,
        "Tool validation", "Verify tool suitable for operation",
        "Validates tool suitability"),
    HookDefinition("tool:geometryCheck", HookCategory.TOOL, HookPriority.NORMAL,
        "Geometry validation", "Check angles, radii, flutes",
        "Validates tool geometry parameters"),
    HookDefinition("tool:coatingMatch", HookCategory.TOOL, HookPriority.NORMAL,
        "Coating selection", "Match coating to material",
        "Selects appropriate coating for material"),
    HookDefinition("tool:gradeMatch", HookCategory.TOOL, HookPriority.NORMAL,
        "Grade selection", "Match carbide grade to application",
        "Selects appropriate insert grade"),
    HookDefinition("tool:holderMatch", HookCategory.TOOL, HookPriority.NORMAL,
        "Holder selection", "Match holder to tool and machine",
        "Selects compatible tool holder"),
    HookDefinition("tool:stickoutCalculate", HookCategory.TOOL, HookPriority.NORMAL,
        "Stickout determination", "Calculate minimum safe stickout",
        "Calculates tool stickout"),
    HookDefinition("tool:deflectionCheck", HookCategory.TOOL, HookPriority.HIGH,
        "Deflection validation", "Check tool deflection within limits",
        "Validates tool deflection acceptable"),
    HookDefinition("tool:wearEstimate", HookCategory.TOOL, HookPriority.NORMAL,
        "Wear prediction", "Estimate tool wear rate",
        "Estimates tool wear based on conditions"),
    HookDefinition("tool:lifeEstimate", HookCategory.TOOL, HookPriority.NORMAL,
        "Life prediction", "Estimate tool life (Taylor)",
        "Estimates tool life using Taylor equation"),
    HookDefinition("tool:breakageRisk", HookCategory.TOOL, HookPriority.HIGH,
        "Breakage assessment", "Evaluate breakage risk",
        "Assesses tool breakage probability"),
    HookDefinition("tool:chipLoadValidate", HookCategory.TOOL, HookPriority.HIGH,
        "Chip load check", "Verify chip load within limits",
        "Validates chip load acceptable"),
    HookDefinition("tool:depthValidate", HookCategory.TOOL, HookPriority.HIGH,
        "Depth of cut check", "Verify DOC within tool limits",
        "Validates depth of cut"),
    HookDefinition("tool:speedValidate", HookCategory.TOOL, HookPriority.HIGH,
        "Speed check", "Verify surface speed within limits",
        "Validates cutting speed"),
    HookDefinition("tool:insertOrientation", HookCategory.TOOL, HookPriority.NORMAL,
        "Insert setup", "Determine insert orientation",
        "Specifies insert mounting orientation"),
    HookDefinition("tool:coolantRequirement", HookCategory.TOOL, HookPriority.NORMAL,
        "Coolant needs", "Determine coolant requirements",
        "Specifies coolant type and delivery"),
    HookDefinition("tool:inventoryCheck", HookCategory.TOOL, HookPriority.LOW,
        "Inventory lookup", "Check tool availability",
        "Checks tool inventory status"),
    HookDefinition("tool:alternateFind", HookCategory.TOOL, HookPriority.NORMAL,
        "Alternative needed", "Find alternate tool",
        "Finds alternative tools when primary unavailable"),
    HookDefinition("tool:costEstimate", HookCategory.TOOL, HookPriority.LOW,
        "Cost calculation", "Estimate tooling cost",
        "Estimates tooling cost per part"),
    HookDefinition("tool:exportFormat", HookCategory.TOOL, HookPriority.LOW,
        "Export requested", "Format for output",
        "Formats tool data for export"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 10: CONTROLLER HOOKS (18) - 12 controller families
# ═══════════════════════════════════════════════════════════════════════════════

CONTROLLER_HOOKS = [
    HookDefinition("controller:identify", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Controller identification", "Identify controller family",
        "Identifies controller type from machine or code"),
    HookDefinition("controller:lookup", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Controller search", "Search controller database",
        "Searches controller specifications"),
    HookDefinition("controller:featureCheck", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Feature verification", "Check controller features",
        "Verifies controller has required features"),
    HookDefinition("controller:versionCheck", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Version validation", "Check software version",
        "Validates controller software version"),
    HookDefinition("controller:optionCheck", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Option verification", "Check installed options",
        "Verifies required controller options"),
    HookDefinition("controller:syntaxMatch", HookCategory.CONTROLLER, HookPriority.HIGH,
        "Syntax validation", "Match G-code syntax to controller",
        "Validates G-code syntax for controller"),
    HookDefinition("controller:modalCheck", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Modal state", "Verify modal codes",
        "Validates modal code states"),
    HookDefinition("controller:macroCheck", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Macro validation", "Check macro compatibility",
        "Validates macro syntax and availability"),
    HookDefinition("controller:parameterLookup", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Parameter search", "Look up controller parameter",
        "Looks up controller parameters"),
    HookDefinition("controller:alarmLookup", HookCategory.CONTROLLER, HookPriority.HIGH,
        "Alarm search", "Look up alarm code",
        "Looks up alarm code meaning"),
    HookDefinition("controller:errorTranslate", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Error translation", "Translate error to plain language",
        "Translates controller errors"),
    HookDefinition("controller:postMatch", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Post processor match", "Match to post processor",
        "Matches controller to appropriate post"),
    HookDefinition("controller:cycleConvert", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Cycle conversion", "Convert cycles between controllers",
        "Converts canned cycles"),
    HookDefinition("controller:formatConvert", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Format conversion", "Convert between controller formats",
        "Converts G-code formats"),
    HookDefinition("controller:limitCheck", HookCategory.CONTROLLER, HookPriority.HIGH,
        "Limit validation", "Check values against controller limits",
        "Validates against controller limits"),
    HookDefinition("controller:axisMap", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Axis mapping", "Map logical to physical axes",
        "Maps axis designations"),
    HookDefinition("controller:toolOffsetFormat", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Tool offset format", "Format tool offsets for controller",
        "Formats tool offset data"),
    HookDefinition("controller:workOffsetFormat", HookCategory.CONTROLLER, HookPriority.NORMAL,
        "Work offset format", "Format work offsets for controller",
        "Formats work coordinate data"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 11: ALARM HOOKS (15) - 9,200 alarm codes
# ═══════════════════════════════════════════════════════════════════════════════

ALARM_HOOKS = [
    HookDefinition("alarm:lookup", HookCategory.ALARM, HookPriority.HIGH,
        "Alarm code search", "Search alarm database",
        "Searches alarm code across all controller families"),
    HookDefinition("alarm:found", HookCategory.ALARM, HookPriority.NORMAL,
        "Alarm found", "Return with diagnosis",
        "Returns alarm with full diagnostic info"),
    HookDefinition("alarm:notFound", HookCategory.ALARM, HookPriority.NORMAL,
        "Alarm not in database", "Log for addition",
        "Flags unknown alarm for database addition"),
    HookDefinition("alarm:diagnose", HookCategory.ALARM, HookPriority.HIGH,
        "Diagnosis requested", "Analyze alarm causes",
        "Provides detailed alarm diagnosis"),
    HookDefinition("alarm:quickFix", HookCategory.ALARM, HookPriority.HIGH,
        "Quick fix requested", "Provide immediate action",
        "Provides quick fix steps"),
    HookDefinition("alarm:fullProcedure", HookCategory.ALARM, HookPriority.NORMAL,
        "Full procedure requested", "Provide complete fix steps",
        "Provides comprehensive troubleshooting"),
    HookDefinition("alarm:relatedFind", HookCategory.ALARM, HookPriority.NORMAL,
        "Related alarms", "Find related alarm codes",
        "Identifies related alarms"),
    HookDefinition("alarm:historyCheck", HookCategory.ALARM, HookPriority.LOW,
        "Alarm history", "Check alarm frequency",
        "Checks alarm occurrence history"),
    HookDefinition("alarm:severityClassify", HookCategory.ALARM, HookPriority.HIGH,
        "Severity assessment", "Classify alarm severity",
        "Classifies alarm as critical/high/medium/low"),
    HookDefinition("alarm:safetyCheck", HookCategory.ALARM, HookPriority.CRITICAL,
        "Safety alarm", "Check for safety implications",
        "Identifies safety-related alarms",
        isBlocking=True),
    HookDefinition("alarm:resetProcedure", HookCategory.ALARM, HookPriority.NORMAL,
        "Reset needed", "Provide reset procedure",
        "Provides alarm reset procedure"),
    HookDefinition("alarm:preventionTips", HookCategory.ALARM, HookPriority.LOW,
        "Prevention requested", "Suggest prevention measures",
        "Suggests alarm prevention measures"),
    HookDefinition("alarm:partCorrelate", HookCategory.ALARM, HookPriority.NORMAL,
        "Part correlation", "Identify parts that may be affected",
        "Correlates alarm to affected parts"),
    HookDefinition("alarm:serviceEscalate", HookCategory.ALARM, HookPriority.NORMAL,
        "Service needed", "Escalate to service",
        "Triggers service escalation"),
    HookDefinition("alarm:documentIncident", HookCategory.ALARM, HookPriority.LOW,
        "Incident documentation", "Log incident details",
        "Documents alarm incident"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 12: CALCULATION HOOKS (18)
# ═══════════════════════════════════════════════════════════════════════════════

CALCULATION_HOOKS = [
    HookDefinition("calc:preExecute", HookCategory.CALCULATION, HookPriority.NORMAL,
        "Before calculation", "Validate inputs",
        "Validates calculation inputs"),
    HookDefinition("calc:postExecute", HookCategory.CALCULATION, HookPriority.NORMAL,
        "After calculation", "Validate outputs",
        "Validates calculation outputs"),
    HookDefinition("calc:uncertaintyInject", HookCategory.CALCULATION, HookPriority.NORMAL,
        "Numeric output", "Add ± uncertainty",
        "Injects uncertainty bounds into results"),
    HookDefinition("calc:safetyBoundsCheck", HookCategory.CALCULATION, HookPriority.CRITICAL,
        "Safety-critical calc", "Verify within safe bounds",
        "Verifies results within safety limits",
        isBlocking=True),
    HookDefinition("calc:physicsValidation", HookCategory.CALCULATION, HookPriority.HIGH,
        "Physics result", "Check physical plausibility",
        "Validates results are physically plausible"),
    HookDefinition("calc:rangeValidation", HookCategory.CALCULATION, HookPriority.HIGH,
        "Result validation", "Check within expected range",
        "Validates results within expected ranges"),
    HookDefinition("calc:unitConversion", HookCategory.CALCULATION, HookPriority.NORMAL,
        "Unit conversion needed", "Convert with precision tracking",
        "Handles unit conversions"),
    HookDefinition("calc:precisionCheck", HookCategory.CALCULATION, HookPriority.NORMAL,
        "Precision tracking", "Monitor numeric precision",
        "Monitors floating-point precision"),
    HookDefinition("calc:overflow", HookCategory.CALCULATION, HookPriority.HIGH,
        "Numeric overflow", "Handle gracefully",
        "Handles numeric overflow conditions"),
    HookDefinition("calc:underflow", HookCategory.CALCULATION, HookPriority.NORMAL,
        "Numeric underflow", "Handle gracefully",
        "Handles numeric underflow conditions"),
    HookDefinition("calc:divisionByZero", HookCategory.CALCULATION, HookPriority.HIGH,
        "Division by zero", "Prevent and handle",
        "Prevents and handles division by zero"),
    HookDefinition("calc:negativeRoot", HookCategory.CALCULATION, HookPriority.NORMAL,
        "Negative root", "Handle complex result",
        "Handles negative square root cases"),
    HookDefinition("calc:cacheHit", HookCategory.CALCULATION, HookPriority.LOW,
        "Repeated calculation", "Return cached result",
        "Returns cached result for repeated calcs"),
    HookDefinition("calc:cacheMiss", HookCategory.CALCULATION, HookPriority.LOW,
        "New calculation", "Compute and cache",
        "Computes and caches new calculation"),
    HookDefinition("calc:interpolate", HookCategory.CALCULATION, HookPriority.NORMAL,
        "Interpolation needed", "Interpolate with method",
        "Handles interpolation calculations"),
    HookDefinition("calc:extrapolateWarning", HookCategory.CALCULATION, HookPriority.NORMAL,
        "Extrapolation detected", "Warn user",
        "Warns when extrapolating beyond data"),
    HookDefinition("calc:sensitivityAnalysis", HookCategory.CALCULATION, HookPriority.LOW,
        "Sensitivity requested", "Compute sensitivity",
        "Performs sensitivity analysis"),
    HookDefinition("calc:logResult", HookCategory.CALCULATION, HookPriority.LOW,
        "Calculation complete", "Log for analysis",
        "Logs calculation for analysis"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 13: PHYSICS HOOKS (20)
# ═══════════════════════════════════════════════════════════════════════════════

PHYSICS_HOOKS = [
    HookDefinition("physics:forceCalculate", HookCategory.PHYSICS, HookPriority.NORMAL,
        "Force calculation", "Calculate cutting forces",
        "Calculates cutting forces using Kienzle/Merchant"),
    HookDefinition("physics:forceValidate", HookCategory.PHYSICS, HookPriority.HIGH,
        "Force validation", "Verify forces within limits",
        "Validates forces within machine/tool limits"),
    HookDefinition("physics:powerCalculate", HookCategory.PHYSICS, HookPriority.NORMAL,
        "Power calculation", "Calculate cutting power",
        "Calculates required cutting power"),
    HookDefinition("physics:powerValidate", HookCategory.PHYSICS, HookPriority.HIGH,
        "Power validation", "Verify power available",
        "Validates power within machine capacity"),
    HookDefinition("physics:torqueCalculate", HookCategory.PHYSICS, HookPriority.NORMAL,
        "Torque calculation", "Calculate spindle torque",
        "Calculates required spindle torque"),
    HookDefinition("physics:torqueValidate", HookCategory.PHYSICS, HookPriority.HIGH,
        "Torque validation", "Verify torque available",
        "Validates torque within spindle capacity"),
    HookDefinition("physics:thermalCalculate", HookCategory.PHYSICS, HookPriority.NORMAL,
        "Thermal calculation", "Calculate cutting temperature",
        "Calculates cutting zone temperature"),
    HookDefinition("physics:thermalValidate", HookCategory.PHYSICS, HookPriority.HIGH,
        "Thermal validation", "Verify temperature acceptable",
        "Validates temperature within limits"),
    HookDefinition("physics:chatterPredict", HookCategory.PHYSICS, HookPriority.HIGH,
        "Chatter prediction", "Predict chatter likelihood",
        "Predicts chatter using stability lobes"),
    HookDefinition("physics:chatterAvoid", HookCategory.PHYSICS, HookPriority.HIGH,
        "Chatter avoidance", "Suggest stable parameters",
        "Suggests parameters to avoid chatter"),
    HookDefinition("physics:deflectionCalculate", HookCategory.PHYSICS, HookPriority.NORMAL,
        "Deflection calculation", "Calculate tool deflection",
        "Calculates tool/workpiece deflection"),
    HookDefinition("physics:deflectionValidate", HookCategory.PHYSICS, HookPriority.HIGH,
        "Deflection validation", "Verify deflection acceptable",
        "Validates deflection within tolerance"),
    HookDefinition("physics:chipFormation", HookCategory.PHYSICS, HookPriority.NORMAL,
        "Chip formation", "Predict chip type",
        "Predicts chip formation characteristics"),
    HookDefinition("physics:chipBreaking", HookCategory.PHYSICS, HookPriority.NORMAL,
        "Chip breaking", "Evaluate chip breaking",
        "Evaluates chip breaking conditions"),
    HookDefinition("physics:surfaceFinish", HookCategory.PHYSICS, HookPriority.NORMAL,
        "Surface finish", "Predict surface roughness",
        "Predicts achievable surface finish"),
    HookDefinition("physics:residualStress", HookCategory.PHYSICS, HookPriority.LOW,
        "Residual stress", "Estimate residual stress",
        "Estimates machining-induced residual stress"),
    HookDefinition("physics:builtUpEdge", HookCategory.PHYSICS, HookPriority.NORMAL,
        "BUE prediction", "Predict built-up edge risk",
        "Predicts built-up edge likelihood"),
    HookDefinition("physics:toolWear", HookCategory.PHYSICS, HookPriority.NORMAL,
        "Wear mechanism", "Identify dominant wear",
        "Identifies dominant tool wear mechanism"),
    HookDefinition("physics:energyEfficiency", HookCategory.PHYSICS, HookPriority.LOW,
        "Energy efficiency", "Calculate specific energy",
        "Calculates specific cutting energy"),
    HookDefinition("physics:mrr", HookCategory.PHYSICS, HookPriority.NORMAL,
        "MRR calculation", "Calculate material removal rate",
        "Calculates material removal rate"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 14: SAFETY HOOKS (15) - CRITICAL FOR MANUFACTURING
# ═══════════════════════════════════════════════════════════════════════════════

SAFETY_HOOKS = [
    HookDefinition("safety:parameterBounds", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Any parameter output", "Verify within safe bounds",
        "Verifies ALL parameters within safe manufacturing bounds",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:speedLimit", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Spindle speed output", "Check against maximum",
        "Enforces maximum spindle speed limits",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:feedLimit", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Feed rate output", "Check against maximum",
        "Enforces maximum feed rate limits",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:depthLimit", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Depth of cut output", "Check against maximum",
        "Enforces maximum depth of cut limits",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:forceLimit", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Force calculation", "Check against maximum",
        "Enforces maximum cutting force limits",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:powerLimit", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Power calculation", "Check against machine capacity",
        "Enforces power within machine capacity",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:temperatureLimit", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Temperature calculation", "Check against maximum",
        "Enforces temperature limits",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:collisionRisk", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Toolpath validation", "Check collision potential",
        "Detects potential collision risks",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:rapidTraverse", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Rapid move output", "Verify clear path",
        "Validates rapid traverse moves are safe",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:toolBreakage", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Tool stress", "Check breakage risk",
        "Warns of potential tool breakage",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:workpieceEjection", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Workholding force", "Verify holding adequate",
        "Validates workholding prevents ejection",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:chipEvacuation", HookCategory.SAFETY, HookPriority.HIGH,
        "Chip conditions", "Verify evacuation adequate",
        "Validates chip evacuation conditions"),
    HookDefinition("safety:coolantRequired", HookCategory.SAFETY, HookPriority.HIGH,
        "Thermal conditions", "Verify coolant if needed",
        "Enforces coolant for high-temp conditions"),
    HookDefinition("safety:emergencyStop", HookCategory.SAFETY, HookPriority.CRITICAL,
        "Critical condition", "Trigger emergency stop",
        "Triggers emergency stop conditions",
        canDisable=False, isBlocking=True),
    HookDefinition("safety:operatorWarning", HookCategory.SAFETY, HookPriority.HIGH,
        "Hazardous condition", "Generate operator warning",
        "Generates warnings for operators"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 15: QUALITY HOOKS (12)
# ═══════════════════════════════════════════════════════════════════════════════

QUALITY_HOOKS = [
    HookDefinition("quality:gateCheck", HookCategory.QUALITY, HookPriority.HIGH,
        "Quality gate reached", "Evaluate gate criteria",
        "Evaluates quality gate criteria"),
    HookDefinition("quality:gatePass", HookCategory.QUALITY, HookPriority.NORMAL,
        "Gate passed", "Log and proceed",
        "Logs gate passage and proceeds"),
    HookDefinition("quality:gateFail", HookCategory.QUALITY, HookPriority.HIGH,
        "Gate failed", "Block and report",
        "Blocks output and reports failure",
        isBlocking=True),
    HookDefinition("quality:gateWarning", HookCategory.QUALITY, HookPriority.NORMAL,
        "Gate marginal", "Warn and proceed",
        "Warns of marginal quality"),
    HookDefinition("quality:omegaCompute", HookCategory.QUALITY, HookPriority.NORMAL,
        "Quality score requested", "Compute Ω(x)",
        "Computes master quality equation"),
    HookDefinition("quality:componentScore", HookCategory.QUALITY, HookPriority.NORMAL,
        "Component score", "Compute R/C/P/S/L",
        "Computes individual quality components"),
    HookDefinition("quality:thresholdCheck", HookCategory.QUALITY, HookPriority.HIGH,
        "Threshold validation", "Check all thresholds",
        "Validates all quality thresholds met"),
    HookDefinition("quality:evidenceVerify", HookCategory.QUALITY, HookPriority.NORMAL,
        "Evidence required", "Verify evidence level",
        "Verifies evidence meets required level"),
    HookDefinition("quality:auditTrail", HookCategory.QUALITY, HookPriority.LOW,
        "Quality action", "Log to audit trail",
        "Logs quality decisions to audit trail"),
    HookDefinition("quality:nonConformance", HookCategory.QUALITY, HookPriority.HIGH,
        "Non-conformance detected", "Log and escalate",
        "Handles non-conformance conditions"),
    HookDefinition("quality:correctiveAction", HookCategory.QUALITY, HookPriority.NORMAL,
        "Corrective action needed", "Generate action item",
        "Generates corrective action items"),
    HookDefinition("quality:preventiveAction", HookCategory.QUALITY, HookPriority.LOW,
        "Prevention opportunity", "Generate prevention item",
        "Generates preventive action items"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 16: FORMULA HOOKS (15)
# ═══════════════════════════════════════════════════════════════════════════════

FORMULA_HOOKS = [
    HookDefinition("formula:select", HookCategory.FORMULA, HookPriority.NORMAL,
        "Formula needed", "Select appropriate formula",
        "Selects optimal formula for calculation"),
    HookDefinition("formula:validate", HookCategory.FORMULA, HookPriority.HIGH,
        "Before formula use", "Validate inputs",
        "Validates inputs meet formula requirements"),
    HookDefinition("formula:execute", HookCategory.FORMULA, HookPriority.NORMAL,
        "Formula execution", "Execute calculation",
        "Executes formula calculation"),
    HookDefinition("formula:resultValidate", HookCategory.FORMULA, HookPriority.HIGH,
        "After formula use", "Validate output",
        "Validates formula output is reasonable"),
    HookDefinition("formula:coefficientLookup", HookCategory.FORMULA, HookPriority.NORMAL,
        "Coefficient needed", "Look up coefficient",
        "Looks up required coefficients"),
    HookDefinition("formula:coefficientValidate", HookCategory.FORMULA, HookPriority.HIGH,
        "Coefficient use", "Validate coefficient",
        "Validates coefficient is appropriate"),
    HookDefinition("formula:calibrationCheck", HookCategory.FORMULA, HookPriority.NORMAL,
        "Formula use", "Check calibration status",
        "Checks formula calibration status"),
    HookDefinition("formula:driftDetect", HookCategory.FORMULA, HookPriority.NORMAL,
        "Prediction vs actual", "Detect drift",
        "Detects formula prediction drift"),
    HookDefinition("formula:recalibrate", HookCategory.FORMULA, HookPriority.NORMAL,
        "Drift detected", "Trigger recalibration",
        "Triggers formula recalibration"),
    HookDefinition("formula:versionCheck", HookCategory.FORMULA, HookPriority.NORMAL,
        "Formula selection", "Check version",
        "Checks formula version is current"),
    HookDefinition("formula:deprecationWarn", HookCategory.FORMULA, HookPriority.NORMAL,
        "Old formula used", "Warn of deprecation",
        "Warns of deprecated formula use"),
    HookDefinition("formula:alternateFind", HookCategory.FORMULA, HookPriority.NORMAL,
        "Primary unavailable", "Find alternate",
        "Finds alternate formula"),
    HookDefinition("formula:accuracyLog", HookCategory.FORMULA, HookPriority.LOW,
        "Formula result", "Log for accuracy tracking",
        "Logs results for accuracy tracking"),
    HookDefinition("formula:healthReport", HookCategory.FORMULA, HookPriority.LOW,
        "Health check", "Generate health report",
        "Generates formula health report"),
    HookDefinition("formula:evolutionTrigger", HookCategory.FORMULA, HookPriority.LOW,
        "Improvement opportunity", "Trigger evolution",
        "Triggers formula evolution process"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 17: PREDICTION HOOKS (10)
# ═══════════════════════════════════════════════════════════════════════════════

PREDICTION_HOOKS = [
    HookDefinition("prediction:create", HookCategory.PREDICTION, HookPriority.NORMAL,
        "Prediction generated", "Log with confidence",
        "Logs prediction with confidence level"),
    HookDefinition("prediction:confidenceCheck", HookCategory.PREDICTION, HookPriority.NORMAL,
        "Prediction made", "Verify confidence threshold",
        "Validates prediction confidence meets threshold"),
    HookDefinition("prediction:actualRecord", HookCategory.PREDICTION, HookPriority.NORMAL,
        "Outcome observed", "Record actual result",
        "Records actual outcome for comparison"),
    HookDefinition("prediction:compare", HookCategory.PREDICTION, HookPriority.NORMAL,
        "Actual available", "Compare to predicted",
        "Compares prediction to actual"),
    HookDefinition("prediction:accuracyCompute", HookCategory.PREDICTION, HookPriority.NORMAL,
        "Comparison complete", "Compute accuracy",
        "Computes prediction accuracy"),
    HookDefinition("prediction:errorAnalyze", HookCategory.PREDICTION, HookPriority.NORMAL,
        "Significant error", "Analyze error source",
        "Analyzes prediction error sources"),
    HookDefinition("prediction:modelUpdate", HookCategory.PREDICTION, HookPriority.NORMAL,
        "Learning opportunity", "Update model",
        "Updates prediction model with new data"),
    HookDefinition("prediction:thresholdAlert", HookCategory.PREDICTION, HookPriority.HIGH,
        "Accuracy below threshold", "Alert for review",
        "Alerts when accuracy falls below threshold"),
    HookDefinition("prediction:confidenceAdjust", HookCategory.PREDICTION, HookPriority.NORMAL,
        "Calibration complete", "Adjust confidence",
        "Adjusts confidence levels based on performance"),
    HookDefinition("prediction:historyPrune", HookCategory.PREDICTION, HookPriority.LOW,
        "History maintenance", "Prune old predictions",
        "Prunes old prediction history"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 18: AGENT HOOKS (12)
# ═══════════════════════════════════════════════════════════════════════════════

AGENT_HOOKS = [
    HookDefinition("agent:select", HookCategory.AGENT, HookPriority.NORMAL,
        "Agent needed", "Select optimal agent",
        "Selects optimal agent for task"),
    HookDefinition("agent:tierSelect", HookCategory.AGENT, HookPriority.NORMAL,
        "Task complexity", "Select appropriate tier",
        "Selects OPUS/SONNET/HAIKU tier"),
    HookDefinition("agent:preExecute", HookCategory.AGENT, HookPriority.HIGH,
        "Before agent execution", "Validate inputs",
        "Validates agent inputs"),
    HookDefinition("agent:execute", HookCategory.AGENT, HookPriority.NORMAL,
        "Agent execution", "Run agent",
        "Executes agent task"),
    HookDefinition("agent:postExecute", HookCategory.AGENT, HookPriority.NORMAL,
        "After agent execution", "Validate outputs",
        "Validates agent outputs"),
    HookDefinition("agent:costTrack", HookCategory.AGENT, HookPriority.LOW,
        "API call complete", "Track cost",
        "Tracks agent API costs"),
    HookDefinition("agent:timeout", HookCategory.AGENT, HookPriority.HIGH,
        "Execution timeout", "Handle gracefully",
        "Handles agent timeout"),
    HookDefinition("agent:retry", HookCategory.AGENT, HookPriority.NORMAL,
        "Agent failure", "Retry with backoff",
        "Retries failed agent with exponential backoff"),
    HookDefinition("agent:fallback", HookCategory.AGENT, HookPriority.NORMAL,
        "Primary failed", "Use fallback agent",
        "Falls back to alternate agent"),
    HookDefinition("agent:resultMerge", HookCategory.AGENT, HookPriority.NORMAL,
        "Multiple agents", "Merge results",
        "Merges results from multiple agents"),
    HookDefinition("agent:qualityCheck", HookCategory.AGENT, HookPriority.NORMAL,
        "Agent output", "Check quality",
        "Checks agent output quality"),
    HookDefinition("agent:learningExtract", HookCategory.AGENT, HookPriority.LOW,
        "Agent complete", "Extract learnings",
        "Extracts learnings from agent execution"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 19: SWARM HOOKS (12)
# ═══════════════════════════════════════════════════════════════════════════════

SWARM_HOOKS = [
    HookDefinition("swarm:patternSelect", HookCategory.SWARM, HookPriority.NORMAL,
        "Swarm needed", "Select swarm pattern",
        "Selects appropriate swarm pattern"),
    HookDefinition("swarm:configure", HookCategory.SWARM, HookPriority.NORMAL,
        "Pattern selected", "Configure swarm",
        "Configures swarm parameters"),
    HookDefinition("swarm:preStart", HookCategory.SWARM, HookPriority.HIGH,
        "Before swarm launch", "Validate configuration",
        "Validates swarm configuration"),
    HookDefinition("swarm:launch", HookCategory.SWARM, HookPriority.NORMAL,
        "Swarm launch", "Start all agents",
        "Launches swarm agents"),
    HookDefinition("swarm:agentComplete", HookCategory.SWARM, HookPriority.NORMAL,
        "Individual agent done", "Track completion",
        "Tracks individual agent completion"),
    HookDefinition("swarm:progress", HookCategory.SWARM, HookPriority.LOW,
        "Progress update", "Log swarm progress",
        "Logs swarm progress"),
    HookDefinition("swarm:synthesize", HookCategory.SWARM, HookPriority.NORMAL,
        "All agents done", "Synthesize results",
        "Synthesizes results from all agents"),
    HookDefinition("swarm:complete", HookCategory.SWARM, HookPriority.NORMAL,
        "Swarm complete", "Finalize results",
        "Finalizes swarm results"),
    HookDefinition("swarm:partialComplete", HookCategory.SWARM, HookPriority.NORMAL,
        "Some agents failed", "Handle partial results",
        "Handles partial swarm completion"),
    HookDefinition("swarm:costAudit", HookCategory.SWARM, HookPriority.LOW,
        "Swarm done", "Sum total cost",
        "Audits total swarm cost"),
    HookDefinition("swarm:efficiencyAnalyze", HookCategory.SWARM, HookPriority.LOW,
        "Swarm complete", "Analyze efficiency",
        "Analyzes swarm efficiency"),
    HookDefinition("swarm:patternLearn", HookCategory.SWARM, HookPriority.LOW,
        "Swarm complete", "Extract pattern learnings",
        "Extracts learnings for pattern improvement"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 20: RALPH HOOKS (10)
# ═══════════════════════════════════════════════════════════════════════════════

RALPH_HOOKS = [
    HookDefinition("ralph:configure", HookCategory.RALPH, HookPriority.NORMAL,
        "Ralph loop needed", "Configure iterations",
        "Configures Ralph loop parameters"),
    HookDefinition("ralph:iterationStart", HookCategory.RALPH, HookPriority.NORMAL,
        "Iteration begins", "Set iteration context",
        "Sets up iteration context"),
    HookDefinition("ralph:iterationExecute", HookCategory.RALPH, HookPriority.NORMAL,
        "Iteration running", "Execute iteration",
        "Executes iteration logic"),
    HookDefinition("ralph:iterationComplete", HookCategory.RALPH, HookPriority.NORMAL,
        "Iteration done", "Evaluate results",
        "Evaluates iteration results"),
    HookDefinition("ralph:progressCheck", HookCategory.RALPH, HookPriority.NORMAL,
        "After iteration", "Check progress",
        "Checks progress toward goal"),
    HookDefinition("ralph:convergenceTest", HookCategory.RALPH, HookPriority.NORMAL,
        "Progress check", "Test for convergence",
        "Tests if loop has converged"),
    HookDefinition("ralph:earlyExit", HookCategory.RALPH, HookPriority.NORMAL,
        "Goal achieved", "Exit loop early",
        "Exits loop when goal achieved"),
    HookDefinition("ralph:maxIterations", HookCategory.RALPH, HookPriority.HIGH,
        "Max iterations reached", "Escalate or accept",
        "Handles max iterations condition"),
    HookDefinition("ralph:complete", HookCategory.RALPH, HookPriority.NORMAL,
        "Loop complete", "Finalize results",
        "Finalizes Ralph loop results"),
    HookDefinition("ralph:learningExtract", HookCategory.RALPH, HookPriority.LOW,
        "Loop complete", "Extract iteration learnings",
        "Extracts learnings from iterations"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 21: LEARNING HOOKS (12)
# ═══════════════════════════════════════════════════════════════════════════════

LEARNING_HOOKS = [
    HookDefinition("learning:opportunityDetect", HookCategory.LEARNING, HookPriority.LOW,
        "Pattern detected", "Identify learning opportunity",
        "Identifies learning opportunities"),
    HookDefinition("learning:extract", HookCategory.LEARNING, HookPriority.LOW,
        "Session end", "Extract learnings",
        "Extracts learnings from session"),
    HookDefinition("learning:classify", HookCategory.LEARNING, HookPriority.LOW,
        "Learning extracted", "Classify by type",
        "Classifies learning type"),
    HookDefinition("learning:store", HookCategory.LEARNING, HookPriority.LOW,
        "Learning classified", "Store for future",
        "Stores learning for future use"),
    HookDefinition("learning:match", HookCategory.LEARNING, HookPriority.NORMAL,
        "New task", "Match to learnings",
        "Matches task to stored learnings"),
    HookDefinition("learning:apply", HookCategory.LEARNING, HookPriority.NORMAL,
        "Match found", "Apply learning",
        "Applies matched learning"),
    HookDefinition("learning:verify", HookCategory.LEARNING, HookPriority.NORMAL,
        "Learning applied", "Verify effectiveness",
        "Verifies learning was effective"),
    HookDefinition("learning:reinforce", HookCategory.LEARNING, HookPriority.LOW,
        "Learning effective", "Reinforce pattern",
        "Reinforces effective learning"),
    HookDefinition("learning:deprecate", HookCategory.LEARNING, HookPriority.LOW,
        "Learning ineffective", "Mark deprecated",
        "Deprecates ineffective learning"),
    HookDefinition("learning:propagate", HookCategory.LEARNING, HookPriority.LOW,
        "Learning verified", "Propagate to similar",
        "Propagates learning to similar contexts"),
    HookDefinition("learning:prune", HookCategory.LEARNING, HookPriority.LOW,
        "Maintenance cycle", "Remove stale learnings",
        "Prunes stale learnings"),
    HookDefinition("learning:analyze", HookCategory.LEARNING, HookPriority.LOW,
        "Periodic analysis", "Analyze learning effectiveness",
        "Analyzes overall learning effectiveness"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 22: VERIFICATION HOOKS (10)
# ═══════════════════════════════════════════════════════════════════════════════

VERIFICATION_HOOKS = [
    HookDefinition("verify:levelDetermine", HookCategory.VERIFICATION, HookPriority.NORMAL,
        "Verification needed", "Determine required level",
        "Determines verification level needed"),
    HookDefinition("verify:start", HookCategory.VERIFICATION, HookPriority.NORMAL,
        "Verification begins", "Set criteria",
        "Sets verification criteria"),
    HookDefinition("verify:evidenceCollect", HookCategory.VERIFICATION, HookPriority.NORMAL,
        "Evidence needed", "Collect evidence",
        "Collects verification evidence"),
    HookDefinition("verify:evidenceEvaluate", HookCategory.VERIFICATION, HookPriority.NORMAL,
        "Evidence collected", "Evaluate sufficiency",
        "Evaluates evidence sufficiency"),
    HookDefinition("verify:levelComplete", HookCategory.VERIFICATION, HookPriority.NORMAL,
        "Level achieved", "Log and proceed",
        "Logs level completion"),
    HookDefinition("verify:levelFail", HookCategory.VERIFICATION, HookPriority.HIGH,
        "Level not achieved", "Report gaps",
        "Reports verification gaps"),
    HookDefinition("verify:escalate", HookCategory.VERIFICATION, HookPriority.NORMAL,
        "User verification needed", "Escalate to user",
        "Escalates to user verification"),
    HookDefinition("verify:userConfirm", HookCategory.VERIFICATION, HookPriority.HIGH,
        "User response", "Record confirmation",
        "Records user verification"),
    HookDefinition("verify:timeout", HookCategory.VERIFICATION, HookPriority.NORMAL,
        "Verification timeout", "Handle gracefully",
        "Handles verification timeout"),
    HookDefinition("verify:complete", HookCategory.VERIFICATION, HookPriority.NORMAL,
        "Verification done", "Record result",
        "Records verification result"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 23: G-CODE HOOKS (15)
# ═══════════════════════════════════════════════════════════════════════════════

GCODE_HOOKS = [
    HookDefinition("gcode:generate", HookCategory.GCODE, HookPriority.NORMAL,
        "G-code generation", "Generate code block",
        "Generates G-code block"),
    HookDefinition("gcode:validate", HookCategory.GCODE, HookPriority.HIGH,
        "Before output", "Validate syntax",
        "Validates G-code syntax"),
    HookDefinition("gcode:modalTrack", HookCategory.GCODE, HookPriority.NORMAL,
        "Modal code used", "Track modal state",
        "Tracks modal code states"),
    HookDefinition("gcode:safetyCheck", HookCategory.GCODE, HookPriority.CRITICAL,
        "Before output", "Check for unsafe moves",
        "Checks for unsafe G-code",
        isBlocking=True),
    HookDefinition("gcode:formatConvert", HookCategory.GCODE, HookPriority.NORMAL,
        "Format change needed", "Convert format",
        "Converts G-code format"),
    HookDefinition("gcode:commentAdd", HookCategory.GCODE, HookPriority.LOW,
        "Comment needed", "Add comment",
        "Adds comments to G-code"),
    HookDefinition("gcode:blockNumber", HookCategory.GCODE, HookPriority.LOW,
        "Block output", "Add/increment block number",
        "Handles block numbering"),
    HookDefinition("gcode:lineLength", HookCategory.GCODE, HookPriority.NORMAL,
        "Line generated", "Check length limit",
        "Validates line length"),
    HookDefinition("gcode:optimize", HookCategory.GCODE, HookPriority.NORMAL,
        "Block generated", "Optimize if possible",
        "Optimizes G-code output"),
    HookDefinition("gcode:macroExpand", HookCategory.GCODE, HookPriority.NORMAL,
        "Macro call", "Expand macro",
        "Expands macro calls"),
    HookDefinition("gcode:subprogramCall", HookCategory.GCODE, HookPriority.NORMAL,
        "Subprogram needed", "Generate call",
        "Generates subprogram calls"),
    HookDefinition("gcode:toolChangeInsert", HookCategory.GCODE, HookPriority.NORMAL,
        "Tool change needed", "Insert tool change code",
        "Inserts tool change sequence"),
    HookDefinition("gcode:coolantControl", HookCategory.GCODE, HookPriority.NORMAL,
        "Coolant control needed", "Insert coolant codes",
        "Inserts coolant control codes"),
    HookDefinition("gcode:programEnd", HookCategory.GCODE, HookPriority.NORMAL,
        "Program complete", "Add end codes",
        "Adds program end codes"),
    HookDefinition("gcode:outputWrite", HookCategory.GCODE, HookPriority.NORMAL,
        "Output ready", "Write to file",
        "Writes G-code to file"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 24: TOOLPATH HOOKS (15)
# ═══════════════════════════════════════════════════════════════════════════════

TOOLPATH_HOOKS = [
    HookDefinition("toolpath:strategySelect", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Toolpath needed", "Select strategy",
        "Selects optimal toolpath strategy"),
    HookDefinition("toolpath:parameterSet", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Strategy selected", "Set parameters",
        "Sets toolpath parameters"),
    HookDefinition("toolpath:generate", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Parameters set", "Generate toolpath",
        "Generates toolpath geometry"),
    HookDefinition("toolpath:validate", HookCategory.TOOLPATH, HookPriority.HIGH,
        "Toolpath generated", "Validate path",
        "Validates toolpath"),
    HookDefinition("toolpath:collisionCheck", HookCategory.TOOLPATH, HookPriority.CRITICAL,
        "Before approval", "Check collisions",
        "Checks for toolpath collisions",
        isBlocking=True),
    HookDefinition("toolpath:gougeCheck", HookCategory.TOOLPATH, HookPriority.HIGH,
        "Surface path", "Check for gouging",
        "Checks for toolpath gouging"),
    HookDefinition("toolpath:linkGenerate", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Path complete", "Generate linking moves",
        "Generates linking moves"),
    HookDefinition("toolpath:retractSet", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Move needed", "Set retract height",
        "Sets retract parameters"),
    HookDefinition("toolpath:feedOptimize", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Path generated", "Optimize feed rates",
        "Optimizes feed rates along path"),
    HookDefinition("toolpath:cornerTreatment", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Corner encountered", "Apply corner treatment",
        "Handles corner treatments"),
    HookDefinition("toolpath:stepoverCalculate", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Area coverage", "Calculate stepover",
        "Calculates optimal stepover"),
    HookDefinition("toolpath:stepdownCalculate", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Depth coverage", "Calculate stepdown",
        "Calculates optimal stepdown"),
    HookDefinition("toolpath:restMaterialTrack", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Material removed", "Track rest material",
        "Tracks remaining material"),
    HookDefinition("toolpath:timeEstimate", HookCategory.TOOLPATH, HookPriority.LOW,
        "Path complete", "Estimate cycle time",
        "Estimates toolpath cycle time"),
    HookDefinition("toolpath:outputGenerate", HookCategory.TOOLPATH, HookPriority.NORMAL,
        "Path validated", "Generate output format",
        "Generates toolpath output"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 25: SIMULATION HOOKS (12)
# ═══════════════════════════════════════════════════════════════════════════════

SIMULATION_HOOKS = [
    HookDefinition("simulation:stockDefine", HookCategory.SIMULATION, HookPriority.NORMAL,
        "Simulation setup", "Define stock geometry",
        "Defines initial stock geometry"),
    HookDefinition("simulation:toolDefine", HookCategory.SIMULATION, HookPriority.NORMAL,
        "Tool needed", "Define tool geometry",
        "Defines tool geometry for simulation"),
    HookDefinition("simulation:fixtureDefine", HookCategory.SIMULATION, HookPriority.NORMAL,
        "Setup needed", "Define fixtures",
        "Defines fixture geometry"),
    HookDefinition("simulation:start", HookCategory.SIMULATION, HookPriority.NORMAL,
        "Simulation requested", "Start simulation",
        "Starts toolpath simulation"),
    HookDefinition("simulation:stepExecute", HookCategory.SIMULATION, HookPriority.LOW,
        "Simulation running", "Execute step",
        "Executes simulation step"),
    HookDefinition("simulation:collisionDetect", HookCategory.SIMULATION, HookPriority.CRITICAL,
        "During simulation", "Detect collision",
        "Detects simulation collisions",
        isBlocking=True),
    HookDefinition("simulation:gougeDetect", HookCategory.SIMULATION, HookPriority.HIGH,
        "During simulation", "Detect gouge",
        "Detects simulation gouges"),
    HookDefinition("simulation:materialRemove", HookCategory.SIMULATION, HookPriority.LOW,
        "Cut simulated", "Update stock model",
        "Updates stock model after cut"),
    HookDefinition("simulation:compare", HookCategory.SIMULATION, HookPriority.NORMAL,
        "Simulation complete", "Compare to target",
        "Compares result to target geometry"),
    HookDefinition("simulation:deviationReport", HookCategory.SIMULATION, HookPriority.NORMAL,
        "Comparison done", "Report deviations",
        "Reports geometric deviations"),
    HookDefinition("simulation:complete", HookCategory.SIMULATION, HookPriority.NORMAL,
        "Simulation done", "Generate report",
        "Generates simulation report"),
    HookDefinition("simulation:visualize", HookCategory.SIMULATION, HookPriority.LOW,
        "Report ready", "Generate visualization",
        "Generates visual output"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 26: QUOTING/BUSINESS HOOKS (15)
# ═══════════════════════════════════════════════════════════════════════════════

QUOTING_HOOKS = [
    HookDefinition("quote:partAnalyze", HookCategory.QUOTING, HookPriority.NORMAL,
        "Quote requested", "Analyze part requirements",
        "Analyzes part for quoting"),
    HookDefinition("quote:materialCost", HookCategory.QUOTING, HookPriority.NORMAL,
        "Material identified", "Calculate material cost",
        "Calculates material cost"),
    HookDefinition("quote:toolingCost", HookCategory.QUOTING, HookPriority.NORMAL,
        "Tools identified", "Calculate tooling cost",
        "Calculates tooling cost"),
    HookDefinition("quote:machineTime", HookCategory.QUOTING, HookPriority.NORMAL,
        "Operations defined", "Estimate machine time",
        "Estimates machine time"),
    HookDefinition("quote:setupTime", HookCategory.QUOTING, HookPriority.NORMAL,
        "Setup identified", "Estimate setup time",
        "Estimates setup time"),
    HookDefinition("quote:laborCost", HookCategory.QUOTING, HookPriority.NORMAL,
        "Time estimated", "Calculate labor cost",
        "Calculates labor cost"),
    HookDefinition("quote:overheadApply", HookCategory.QUOTING, HookPriority.NORMAL,
        "Direct costs calculated", "Apply overhead",
        "Applies overhead factors"),
    HookDefinition("quote:marginApply", HookCategory.QUOTING, HookPriority.NORMAL,
        "Cost calculated", "Apply margin",
        "Applies profit margin"),
    HookDefinition("quote:quantityBreak", HookCategory.QUOTING, HookPriority.NORMAL,
        "Quantity specified", "Calculate quantity breaks",
        "Calculates quantity price breaks"),
    HookDefinition("quote:leadTime", HookCategory.QUOTING, HookPriority.NORMAL,
        "Quote generated", "Estimate lead time",
        "Estimates delivery lead time"),
    HookDefinition("quote:riskAssess", HookCategory.QUOTING, HookPriority.NORMAL,
        "Quote complete", "Assess risk factors",
        "Assesses quote risk factors"),
    HookDefinition("quote:generate", HookCategory.QUOTING, HookPriority.NORMAL,
        "All costs calculated", "Generate quote document",
        "Generates quote document"),
    HookDefinition("quote:submit", HookCategory.QUOTING, HookPriority.NORMAL,
        "Quote approved", "Submit to customer",
        "Submits quote to customer"),
    HookDefinition("quote:track", HookCategory.QUOTING, HookPriority.LOW,
        "Quote submitted", "Track status",
        "Tracks quote status"),
    HookDefinition("quote:analyze", HookCategory.QUOTING, HookPriority.LOW,
        "Quote won/lost", "Analyze outcome",
        "Analyzes quote outcome"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 27: INTEGRATION HOOKS (12)
# ═══════════════════════════════════════════════════════════════════════════════

INTEGRATION_HOOKS = [
    HookDefinition("integration:apiCall", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "External API needed", "Execute API call",
        "Executes external API call"),
    HookDefinition("integration:apiResponse", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "API response received", "Process response",
        "Processes API response"),
    HookDefinition("integration:apiError", HookCategory.INTEGRATION, HookPriority.HIGH,
        "API error", "Handle error",
        "Handles API errors"),
    HookDefinition("integration:fileImport", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "File import needed", "Import file",
        "Imports external file"),
    HookDefinition("integration:fileExport", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "File export needed", "Export file",
        "Exports to external file"),
    HookDefinition("integration:cadImport", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "CAD import", "Import CAD geometry",
        "Imports CAD geometry"),
    HookDefinition("integration:cadExport", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "CAD export", "Export CAD geometry",
        "Exports CAD geometry"),
    HookDefinition("integration:erpSync", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "ERP sync needed", "Sync with ERP",
        "Synchronizes with ERP system"),
    HookDefinition("integration:mesSync", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "MES sync needed", "Sync with MES",
        "Synchronizes with MES system"),
    HookDefinition("integration:mtConnect", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "Machine data needed", "Connect via MTConnect",
        "Connects to machine via MTConnect"),
    HookDefinition("integration:opcua", HookCategory.INTEGRATION, HookPriority.NORMAL,
        "PLC data needed", "Connect via OPC-UA",
        "Connects via OPC-UA"),
    HookDefinition("integration:webhookTrigger", HookCategory.INTEGRATION, HookPriority.LOW,
        "Event occurred", "Trigger webhook",
        "Triggers external webhook"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# COMBINE ALL HOOKS
# ═══════════════════════════════════════════════════════════════════════════════

ALL_HOOKS = (
    SYSTEM_HOOKS +
    SESSION_HOOKS +
    TASK_HOOKS +
    MICROSESSION_HOOKS +
    DATABASE_HOOKS +
    MATERIAL_HOOKS +
    MACHINE_HOOKS +
    TOOL_HOOKS +
    CONTROLLER_HOOKS +
    ALARM_HOOKS +
    CALCULATION_HOOKS +
    PHYSICS_HOOKS +
    SAFETY_HOOKS +
    QUALITY_HOOKS +
    FORMULA_HOOKS +
    PREDICTION_HOOKS +
    AGENT_HOOKS +
    SWARM_HOOKS +
    RALPH_HOOKS +
    LEARNING_HOOKS +
    VERIFICATION_HOOKS +
    GCODE_HOOKS +
    TOOLPATH_HOOKS +
    SIMULATION_HOOKS +
    QUOTING_HOOKS +
    INTEGRATION_HOOKS
)

# ═══════════════════════════════════════════════════════════════════════════════
# HOOK REGISTRY CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class HookRegistry:
    """Central registry for all PRISM hooks."""
    
    def __init__(self):
        self.hooks: Dict[str, HookDefinition] = {}
        self.handlers: Dict[str, List[Callable]] = {}
        self.logger = logging.getLogger("HookRegistry")
        
        # Register all hooks
        for hook in ALL_HOOKS:
            self.hooks[hook.id] = hook
            self.handlers[hook.id] = []
    
    def get_hook(self, hook_id: str) -> Optional[HookDefinition]:
        """Get hook definition by ID."""
        return self.hooks.get(hook_id)
    
    def get_hooks_by_category(self, category: HookCategory) -> List[HookDefinition]:
        """Get all hooks in a category."""
        return [h for h in self.hooks.values() if h.category == category]
    
    def get_blocking_hooks(self) -> List[HookDefinition]:
        """Get all blocking hooks."""
        return [h for h in self.hooks.values() if h.isBlocking]
    
    def get_non_disableable_hooks(self) -> List[HookDefinition]:
        """Get hooks that cannot be disabled."""
        return [h for h in self.hooks.values() if not h.canDisable]
    
    def register_handler(self, hook_id: str, handler: Callable):
        """Register a handler for a hook."""
        if hook_id in self.handlers:
            self.handlers[hook_id].append(handler)
        else:
            self.logger.warning(f"Unknown hook: {hook_id}")
    
    def fire(self, hook_id: str, context: Dict[str, Any] = None) -> bool:
        """Fire a hook with context. Returns False if blocked."""
        hook = self.hooks.get(hook_id)
        if not hook:
            self.logger.warning(f"Firing unknown hook: {hook_id}")
            return True
        
        context = context or {}
        
        # Execute all handlers
        for handler in sorted(self.handlers.get(hook_id, []), 
                            key=lambda h: getattr(h, 'priority', 50)):
            try:
                result = handler(context)
                if hook.isBlocking and result is False:
                    self.logger.warning(f"Hook {hook_id} BLOCKED execution")
                    return False
            except Exception as e:
                self.logger.error(f"Hook {hook_id} handler error: {e}")
                if hook.isBlocking:
                    return False
        
        return True
    
    def to_dict(self) -> Dict:
        """Export registry to dictionary."""
        return {
            "version": "2.0.0",
            "generatedAt": datetime.now().isoformat(),
            "totalHooks": len(self.hooks),
            "summary": {
                "byCategory": {},
                "blocking": len(self.get_blocking_hooks()),
                "nonDisableable": len(self.get_non_disableable_hooks())
            },
            "hooks": [h.to_dict() for h in self.hooks.values()]
        }


def build_hook_registry():
    """Build and export the hook registry."""
    registry = HookRegistry()
    
    print("=" * 70)
    print("PRISM COMPREHENSIVE HOOK SYSTEM v2.0")
    print("=" * 70)
    
    # Count by category
    category_counts = {}
    for hook in ALL_HOOKS:
        cat = hook.category.value
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    print(f"\nTotal Hooks: {len(ALL_HOOKS)}")
    print(f"Categories: {len(category_counts)}")
    print(f"Blocking Hooks: {len([h for h in ALL_HOOKS if h.isBlocking])}")
    print(f"Non-Disableable: {len([h for h in ALL_HOOKS if not h.canDisable])}")
    
    print("\nBy Category:")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")
    
    return registry


if __name__ == "__main__":
    import sys
    
    # Build registry
    registry = build_hook_registry()
    
    # Export to JSON
    output_path = r"C:\PRISM\registries\HOOK_REGISTRY.json"
    audit_path = r"C:\PRISM\mcp-server\audits\hook_registry_r2_7.json"
    
    registry_dict = registry.to_dict()
    
    # Update category summary
    for hook in ALL_HOOKS:
        cat = hook.category.value
        registry_dict["summary"]["byCategory"][cat] = \
            registry_dict["summary"]["byCategory"].get(cat, 0) + 1
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry_dict, f, indent=2)
    print(f"\nSaved to {output_path}")
    
    # Save audit
    audit = {
        "session": "R2.7",
        "timestamp": datetime.now().isoformat(),
        "hooksProcessed": len(ALL_HOOKS),
        "summary": registry_dict["summary"]
    }
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit to {audit_path}")
    
    # Update main registry
    main_registry_path = r"C:\PRISM\registries\RESOURCE_REGISTRY.json"
    with open(main_registry_path, 'r', encoding='utf-8') as f:
        main_registry = json.load(f)
    
    main_registry['hooks'] = [h.to_dict() for h in ALL_HOOKS]
    main_registry['summary']['hooks'] = len(ALL_HOOKS)
    
    with open(main_registry_path, 'w', encoding='utf-8') as f:
        json.dump(main_registry, f, indent=2)
    print(f"Updated {main_registry_path}")
    
    print("\n" + "=" * 70)
    print("HOOK REGISTRY COMPLETE")
    print("=" * 70)
