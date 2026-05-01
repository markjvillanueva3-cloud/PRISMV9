#!/usr/bin/env python3
"""
PRISM EXHAUSTIVE HOOK SYSTEM v1.0
Complete hook coverage for all PRISM functionality.

PRISM Products:
1. Speed & Feed Calculator
2. Post Processor Generator  
3. Shop Manager / Quoting
4. Auto CNC Programmer

PRISM Domains:
- Materials (1,047 × 127 parameters)
- Machines (824 × 43 manufacturers)
- Controllers (12 families, 9,200 alarms)
- Tooling (cutting tools, holders)
- Physics (Kienzle, Taylor, Johnson-Cook)
- AI/ML (27 modules)
- CAD/CAM (toolpaths, simulation)

Total Hooks Target: 400+ comprehensive hooks
"""

import json
from datetime import datetime
from typing import Dict, List, Any, Callable, Optional
from dataclasses import dataclass, field
from enum import Enum
import traceback

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: HOOK INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════════════════════════

class HookPriority(Enum):
    """Hook execution priority - lower numbers execute first."""
    CRITICAL = 0      # Safety, blocking checks
    HIGH = 10         # Validation, state management
    NORMAL = 50       # Standard operations
    LOW = 100         # Logging, metrics
    DEFERRED = 200    # Post-processing, cleanup

class HookCategory(Enum):
    """Major hook categories."""
    SYSTEM = "system"
    SESSION = "session"
    TASK = "task"
    SAFETY = "safety"
    DATABASE = "database"
    MATERIAL = "material"
    MACHINE = "machine"
    TOOL = "tool"
    CONTROLLER = "controller"
    ALARM = "alarm"
    CALCULATION = "calculation"
    PHYSICS = "physics"
    AI_ML = "ai_ml"
    CAD = "cad"
    CAM = "cam"
    TOOLPATH = "toolpath"
    POST_PROCESSOR = "post_processor"
    GCODE = "gcode"
    SIMULATION = "simulation"
    VERIFICATION = "verification"
    QUALITY = "quality"
    WORKFLOW = "workflow"
    AGENT = "agent"
    SWARM = "swarm"
    LEARNING = "learning"
    PREDICTION = "prediction"
    FORMULA = "formula"
    PRODUCT_SFC = "product_sfc"        # Speed & Feed Calculator
    PRODUCT_PPG = "product_ppg"        # Post Processor Generator
    PRODUCT_SHOP = "product_shop"      # Shop Manager
    PRODUCT_ACNC = "product_acnc"      # Auto CNC Programmer
    INTEGRATION = "integration"
    FILE_IO = "file_io"
    API = "api"
    USER = "user"
    ERROR = "error"
    METRICS = "metrics"
    AUDIT = "audit"

@dataclass
class HookDefinition:
    """Complete hook definition."""
    id: str
    name: str
    category: HookCategory
    priority: HookPriority
    trigger: str
    description: str
    action: str
    canDisable: bool = True
    isBlocking: bool = False
    timeout_ms: int = 5000
    retryCount: int = 0
    dependencies: List[str] = field(default_factory=list)
    consumers: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category.value,
            "priority": self.priority.value,
            "trigger": self.trigger,
            "description": self.description,
            "action": self.action,
            "canDisable": self.canDisable,
            "isBlocking": self.isBlocking,
            "timeout_ms": self.timeout_ms,
            "retryCount": self.retryCount,
            "dependencies": self.dependencies,
            "consumers": self.consumers
        }

class HookRegistry:
    """Central registry for all PRISM hooks."""
    
    def __init__(self):
        self.hooks: Dict[str, HookDefinition] = {}
        self.handlers: Dict[str, List[Callable]] = {}
        self.execution_log: List[Dict] = []
        
    def register(self, hook: HookDefinition):
        """Register a hook definition."""
        self.hooks[hook.id] = hook
        if hook.id not in self.handlers:
            self.handlers[hook.id] = []
            
    def on(self, hook_id: str, handler: Callable):
        """Attach a handler to a hook."""
        if hook_id not in self.handlers:
            self.handlers[hook_id] = []
        self.handlers[hook_id].append(handler)
        
    def emit(self, hook_id: str, context: Dict = None) -> Dict:
        """Emit a hook event and execute all handlers."""
        if hook_id not in self.hooks:
            return {"status": "unknown_hook", "hook_id": hook_id}
            
        hook = self.hooks[hook_id]
        context = context or {}
        results = []
        blocked = False
        
        # Sort handlers by priority
        handlers = self.handlers.get(hook_id, [])
        
        for handler in handlers:
            try:
                result = handler(context)
                results.append({"handler": handler.__name__, "result": result})
                
                # Check for blocking
                if hook.isBlocking and result.get("block"):
                    blocked = True
                    break
                    
            except Exception as e:
                results.append({"handler": handler.__name__, "error": str(e)})
                
        # Log execution
        self.execution_log.append({
            "hook_id": hook_id,
            "timestamp": datetime.now().isoformat(),
            "context_keys": list(context.keys()),
            "results_count": len(results),
            "blocked": blocked
        })
        
        return {
            "status": "blocked" if blocked else "complete",
            "hook_id": hook_id,
            "results": results
        }
        
    def get_all(self) -> List[Dict]:
        """Get all hook definitions."""
        return [h.to_dict() for h in self.hooks.values()]
        
    def get_by_category(self, category: HookCategory) -> List[Dict]:
        """Get hooks by category."""
        return [h.to_dict() for h in self.hooks.values() if h.category == category]

# Global registry instance
HOOK_REGISTRY = HookRegistry()

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: SYSTEM HOOKS (25 hooks)
# ═══════════════════════════════════════════════════════════════════════════════

SYSTEM_HOOKS = [
    # Core System Laws
    HookDefinition("SYS-LAW1-SAFETY", "Safety Enforcement", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Every output", "Blocks any output with S(x) < 0.70", "BLOCK if safety threshold violated",
                   canDisable=False, isBlocking=True),
    HookDefinition("SYS-LAW2-MICROSESSION", "Microsession Enforcement", HookCategory.SYSTEM, HookPriority.HIGH,
                   "Task start", "Requires tasks be broken into 15-25 item chunks", "Validate chunk size"),
    HookDefinition("SYS-LAW3-COMPLETENESS", "Completeness Enforcement", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Before delivery", "Blocks incomplete deliverables", "BLOCK if C(T) < 1.0",
                   canDisable=False, isBlocking=True),
    HookDefinition("SYS-LAW4-REGRESSION", "Anti-Regression", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Before replacement", "Prevents data loss on updates", "BLOCK if new < old",
                   canDisable=False, isBlocking=True),
    HookDefinition("SYS-LAW5-PREDICTIVE", "Predictive Thinking", HookCategory.SYSTEM, HookPriority.HIGH,
                   "Before action", "Requires 3 failure mode analysis", "Validate failure modes identified"),
    HookDefinition("SYS-LAW6-CONTINUITY", "Session Continuity", HookCategory.SYSTEM, HookPriority.HIGH,
                   "Session start", "Enforces state loading from previous session", "Load CURRENT_STATE.json"),
    HookDefinition("SYS-LAW7-VERIFICATION", "Verification Requirement", HookCategory.SYSTEM, HookPriority.HIGH,
                   "Completion claim", "Requires 95% confidence with evidence", "Validate evidence level"),
    HookDefinition("SYS-LAW8-MATH", "Mathematical Rigor", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Calculation output", "Blocks if M(x) < 0.60", "BLOCK if math rigor insufficient",
                   canDisable=False, isBlocking=True),
    
    # System Operations
    HookDefinition("SYS-INIT", "System Initialize", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "System start", "Initialize all subsystems", "Load configs, validate paths"),
    HookDefinition("SYS-SHUTDOWN", "System Shutdown", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "System stop", "Graceful shutdown with state save", "Persist all state"),
    HookDefinition("SYS-HEARTBEAT", "System Heartbeat", HookCategory.SYSTEM, HookPriority.LOW,
                   "Periodic (30s)", "Monitor system health", "Log health metrics"),
    HookDefinition("SYS-MEMORY-CHECK", "Memory Check", HookCategory.SYSTEM, HookPriority.NORMAL,
                   "Periodic (60s)", "Monitor memory usage", "Alert if > 80%"),
    HookDefinition("SYS-CONTEXT-PRESSURE", "Context Pressure", HookCategory.SYSTEM, HookPriority.HIGH,
                   "Tool call", "Track context window usage", "Trigger checkpoint if yellow/red zone"),
    HookDefinition("SYS-BUFFER-ZONE", "Buffer Zone Monitor", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Each tool call", "Track tool call count", "BLOCK at 19+ calls",
                   canDisable=False, isBlocking=True),
    HookDefinition("SYS-MATHPLAN-GATE", "MATHPLAN Gate", HookCategory.SYSTEM, HookPriority.HIGH,
                   "Before execution", "Validate mathematical approach planned", "Require MATHPLAN"),
    
    # Configuration
    HookDefinition("SYS-CONFIG-LOAD", "Config Load", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Startup", "Load configuration files", "Parse and validate configs"),
    HookDefinition("SYS-CONFIG-CHANGE", "Config Change", HookCategory.SYSTEM, HookPriority.HIGH,
                   "Config modified", "Handle configuration changes", "Reload affected subsystems"),
    HookDefinition("SYS-ENV-VALIDATE", "Environment Validate", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Startup", "Validate environment requirements", "Check paths, permissions, dependencies"),
    
    # Logging & Monitoring
    HookDefinition("SYS-LOG-ROTATE", "Log Rotation", HookCategory.SYSTEM, HookPriority.LOW,
                   "Daily", "Rotate log files", "Archive and compress old logs"),
    HookDefinition("SYS-METRICS-COLLECT", "Metrics Collection", HookCategory.SYSTEM, HookPriority.LOW,
                   "Periodic (10s)", "Collect system metrics", "CPU, memory, disk, network"),
    HookDefinition("SYS-ALERT-TRIGGER", "Alert Trigger", HookCategory.SYSTEM, HookPriority.HIGH,
                   "Threshold exceeded", "Trigger system alerts", "Notify appropriate channels"),
    
    # Recovery
    HookDefinition("SYS-CRASH-RECOVER", "Crash Recovery", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Abnormal start", "Recover from crash state", "Restore from last checkpoint"),
    HookDefinition("SYS-BACKUP-CREATE", "Backup Create", HookCategory.SYSTEM, HookPriority.NORMAL,
                   "Scheduled", "Create system backup", "Backup state, configs, data"),
    HookDefinition("SYS-BACKUP-RESTORE", "Backup Restore", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Recovery requested", "Restore from backup", "Validate and restore"),
    HookDefinition("SYS-ROLLBACK", "System Rollback", HookCategory.SYSTEM, HookPriority.CRITICAL,
                   "Critical failure", "Rollback to stable state", "Revert recent changes"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: SESSION HOOKS (20 hooks)
# ═══════════════════════════════════════════════════════════════════════════════

SESSION_HOOKS = [
    # Lifecycle
    HookDefinition("SESSION-PRE-START", "Session Pre-Start", HookCategory.SESSION, HookPriority.CRITICAL,
                   "Before session", "Prepare session environment", "Load state, validate resources"),
    HookDefinition("SESSION-POST-START", "Session Post-Start", HookCategory.SESSION, HookPriority.HIGH,
                   "After session start", "Complete session initialization", "Log start, set context"),
    HookDefinition("SESSION-PRE-END", "Session Pre-End", HookCategory.SESSION, HookPriority.HIGH,
                   "Before session end", "Prepare for session end", "Save state, create handoff"),
    HookDefinition("SESSION-POST-END", "Session Post-End", HookCategory.SESSION, HookPriority.NORMAL,
                   "After session end", "Cleanup session", "Release resources, log metrics"),
    
    # State Management
    HookDefinition("SESSION-STATE-LOAD", "State Load", HookCategory.SESSION, HookPriority.CRITICAL,
                   "Session start", "Load session state", "Read CURRENT_STATE.json"),
    HookDefinition("SESSION-STATE-SAVE", "State Save", HookCategory.SESSION, HookPriority.HIGH,
                   "State change", "Persist session state", "Write CURRENT_STATE.json"),
    HookDefinition("SESSION-STATE-MERGE", "State Merge", HookCategory.SESSION, HookPriority.HIGH,
                   "Resume detected", "Merge with previous state", "Reconcile state differences"),
    HookDefinition("SESSION-STATE-VALIDATE", "State Validate", HookCategory.SESSION, HookPriority.HIGH,
                   "After load", "Validate loaded state", "Check integrity, version"),
    
    # Checkpoints
    HookDefinition("SESSION-CHECKPOINT-CREATE", "Checkpoint Create", HookCategory.SESSION, HookPriority.HIGH,
                   "Every 5-8 items", "Create progress checkpoint", "Snapshot current state"),
    HookDefinition("SESSION-CHECKPOINT-RESTORE", "Checkpoint Restore", HookCategory.SESSION, HookPriority.HIGH,
                   "Recovery needed", "Restore from checkpoint", "Load checkpoint state"),
    HookDefinition("SESSION-CHECKPOINT-CLEANUP", "Checkpoint Cleanup", HookCategory.SESSION, HookPriority.LOW,
                   "Session end", "Clean old checkpoints", "Remove stale checkpoints"),
    
    # Context Management
    HookDefinition("SESSION-CONTEXT-COMPACT", "Context Compact", HookCategory.SESSION, HookPriority.HIGH,
                   "Context overflow", "Handle context compaction", "Save state, prepare recovery"),
    HookDefinition("SESSION-CONTEXT-RECOVER", "Context Recover", HookCategory.SESSION, HookPriority.CRITICAL,
                   "Post-compaction", "Recover from compaction", "Reload state, continue"),
    HookDefinition("SESSION-CONTEXT-OPTIMIZE", "Context Optimize", HookCategory.SESSION, HookPriority.NORMAL,
                   "Yellow zone", "Optimize context usage", "Trim non-essential data"),
    
    # Handoff
    HookDefinition("SESSION-HANDOFF-CREATE", "Handoff Create", HookCategory.SESSION, HookPriority.HIGH,
                   "Session end", "Create handoff document", "Summarize state, next steps"),
    HookDefinition("SESSION-HANDOFF-RECEIVE", "Handoff Receive", HookCategory.SESSION, HookPriority.HIGH,
                   "Session start", "Process incoming handoff", "Parse and apply handoff"),
    
    # Resume
    HookDefinition("SESSION-RESUME-DETECT", "Resume Detect", HookCategory.SESSION, HookPriority.HIGH,
                   "Session start", "Detect if resuming", "Check for IN_PROGRESS state"),
    HookDefinition("SESSION-RESUME-APPLY", "Resume Apply", HookCategory.SESSION, HookPriority.HIGH,
                   "Resume confirmed", "Apply resume state", "Restore context, continue"),
    
    # Memory
    HookDefinition("SESSION-MEMORY-EXTRACT", "Memory Extract", HookCategory.SESSION, HookPriority.NORMAL,
                   "Session end", "Extract session learnings", "Identify patterns, insights"),
    HookDefinition("SESSION-MEMORY-APPLY", "Memory Apply", HookCategory.SESSION, HookPriority.NORMAL,
                   "Session start", "Apply relevant memories", "Load applicable patterns"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: SAFETY HOOKS (25 hooks)
# ═══════════════════════════════════════════════════════════════════════════════

SAFETY_HOOKS = [
    # Core Safety Checks
    HookDefinition("SAFETY-SCORE-COMPUTE", "Safety Score Compute", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Before output", "Compute S(x) safety score", "Evaluate all safety factors",
                   isBlocking=True),
    HookDefinition("SAFETY-THRESHOLD-CHECK", "Safety Threshold Check", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "After S(x) compute", "Check S(x) >= 0.70", "BLOCK if below threshold",
                   canDisable=False, isBlocking=True),
    HookDefinition("SAFETY-OVERRIDE-PREVENT", "Safety Override Prevent", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Override attempt", "Prevent safety bypasses", "Log and reject override",
                   canDisable=False, isBlocking=True),
    
    # Manufacturing Safety
    HookDefinition("SAFETY-SPEED-LIMIT", "Speed Limit Check", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Speed calculation", "Validate spindle speed within limits", "Check machine max RPM",
                   isBlocking=True),
    HookDefinition("SAFETY-FEED-LIMIT", "Feed Limit Check", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Feed calculation", "Validate feed rate within limits", "Check machine max feed",
                   isBlocking=True),
    HookDefinition("SAFETY-DOC-LIMIT", "Depth of Cut Limit", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "DOC calculation", "Validate depth within limits", "Check tool/machine limits",
                   isBlocking=True),
    HookDefinition("SAFETY-POWER-CHECK", "Power Check", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Parameter calculation", "Validate power requirements", "Check machine power capacity",
                   isBlocking=True),
    HookDefinition("SAFETY-TORQUE-CHECK", "Torque Check", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Parameter calculation", "Validate torque requirements", "Check spindle torque capacity",
                   isBlocking=True),
    HookDefinition("SAFETY-FORCE-CHECK", "Cutting Force Check", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Force calculation", "Validate cutting forces", "Check tool/fixture capacity",
                   isBlocking=True),
    HookDefinition("SAFETY-DEFLECTION-CHECK", "Deflection Check", HookCategory.SAFETY, HookPriority.HIGH,
                   "Setup validation", "Check tool deflection", "Warn if excessive"),
    HookDefinition("SAFETY-CHATTER-CHECK", "Chatter Check", HookCategory.SAFETY, HookPriority.HIGH,
                   "Stability analysis", "Check for chatter risk", "Warn if in unstable zone"),
    HookDefinition("SAFETY-THERMAL-CHECK", "Thermal Check", HookCategory.SAFETY, HookPriority.HIGH,
                   "Thermal analysis", "Check temperature limits", "Warn if overheating risk"),
    
    # Tool Safety
    HookDefinition("SAFETY-TOOL-LIFE", "Tool Life Check", HookCategory.SAFETY, HookPriority.HIGH,
                   "Before cut", "Check remaining tool life", "Warn if tool worn"),
    HookDefinition("SAFETY-TOOL-BREAKAGE", "Tool Breakage Risk", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Force calculation", "Evaluate tool breakage risk", "BLOCK if high risk",
                   isBlocking=True),
    HookDefinition("SAFETY-TOOL-HOLDER", "Tool Holder Check", HookCategory.SAFETY, HookPriority.HIGH,
                   "Setup validation", "Validate tool holder match", "Check compatibility"),
    
    # Collision Safety
    HookDefinition("SAFETY-COLLISION-CHECK", "Collision Check", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Toolpath validation", "Check for collisions", "BLOCK if collision detected",
                   canDisable=False, isBlocking=True),
    HookDefinition("SAFETY-CLEARANCE-CHECK", "Clearance Check", HookCategory.SAFETY, HookPriority.HIGH,
                   "Move validation", "Validate clearance planes", "Warn if insufficient"),
    HookDefinition("SAFETY-LIMIT-CHECK", "Axis Limit Check", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Position command", "Check axis travel limits", "BLOCK if out of range",
                   isBlocking=True),
    
    # G-code Safety
    HookDefinition("SAFETY-GCODE-VALIDATE", "G-code Validate", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Code generation", "Validate G-code safety", "Check for dangerous commands",
                   isBlocking=True),
    HookDefinition("SAFETY-RAPID-CHECK", "Rapid Move Check", HookCategory.SAFETY, HookPriority.HIGH,
                   "G0 command", "Validate rapid moves", "Check for obstacles"),
    HookDefinition("SAFETY-SPINDLE-CHECK", "Spindle Command Check", HookCategory.SAFETY, HookPriority.HIGH,
                   "M3/M4 command", "Validate spindle commands", "Check direction, speed"),
    HookDefinition("SAFETY-COOLANT-CHECK", "Coolant Check", HookCategory.SAFETY, HookPriority.NORMAL,
                   "Machining start", "Validate coolant settings", "Check for material compatibility"),
    
    # Operator Safety
    HookDefinition("SAFETY-OPERATOR-WARN", "Operator Warning", HookCategory.SAFETY, HookPriority.HIGH,
                   "Dangerous condition", "Generate operator warning", "Display/log warning"),
    HookDefinition("SAFETY-DOOR-INTERLOCK", "Door Interlock Check", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Spindle start", "Verify door interlock", "BLOCK if door open",
                   isBlocking=True),
    HookDefinition("SAFETY-EMERGENCY-STOP", "Emergency Stop", HookCategory.SAFETY, HookPriority.CRITICAL,
                   "Emergency condition", "Trigger emergency stop", "Halt all motion",
                   canDisable=False, isBlocking=True),
]

# Continue in next chunk...
