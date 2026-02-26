#!/usr/bin/env python3
"""
PRISM Peak Resource Activator v1.0
Ensures all critical resources are loaded and tracked every session.

Usage:
    py -3 C:\\PRISM\\scripts\\peak_activator.py [--task "description"]
    
Called automatically by gsd_startup.py
"""
import sys

# Only set encoding for direct execution
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

# Paths
PRISM_ROOT = Path("C:/PRISM")
CONFIG_PATH = PRISM_ROOT / "config" / "PEAK_RESOURCES.json"
STATE_PATH = PRISM_ROOT / "state" / "CURRENT_STATE.json"
UTILIZATION_PATH = PRISM_ROOT / "state" / "UTILIZATION_LOG.json"
SKILLS_PATH = PRISM_ROOT / "skills-consolidated"
MCP_SKILLS_PATH = Path("/mnt/skills/user")  # For MCP-uploaded skills

class PeakActivator:
    def __init__(self):
        self.config = self._load_config()
        self.session_id = f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.utilization = {
            "session_id": self.session_id,
            "started_at": datetime.now().isoformat(),
            "hooks_triggered": [],
            "skills_loaded": [],
            "formulas_applied": [],
            "metrics_computed": [],
            "tool_calls": 0,
            "utilization_score": 0.0
        }
    
    def _load_config(self) -> Dict:
        """Load PEAK_RESOURCES.json configuration"""
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, 'r') as f:
                return json.load(f)
        return self._default_config()
    
    def _default_config(self) -> Dict:
        """Default peak resources if config missing"""
        return {
            "alwaysLoad": {
                "skills": [
                    {"name": "prism-cognitive-core", "critical": True},
                    {"name": "prism-master-equation", "critical": True},
                    {"name": "prism-safety-framework", "critical": True},
                    {"name": "prism-quick-start", "critical": True}
                ]
            },
            "alwaysTrigger": {
                "hooks": [
                    {"id": "BAYES-001", "when": "session_start"},
                    {"id": "OPT-001", "when": "session_start"},
                    {"id": "RES-ACT-002", "when": "session_start"}
                ]
            },
            "alwaysCompute": {
                "metrics": [
                    {"id": "S(x)", "threshold": 0.70, "enforcement": "HARD_BLOCK"},
                    {"id": "Ω(x)", "threshold": 0.70, "enforcement": "WARN"}
                ]
            },
            "utilizationTracking": {
                "checkEveryNTools": 5,
                "targetUtilization": 0.50
            }
        }
    
    def get_skills_to_load(self) -> List[Dict]:
        """Return list of skills that should be loaded"""
        skills = self.config.get("alwaysLoad", {}).get("skills", [])
        return [s for s in skills if s.get("critical", False)]
    
    def get_hooks_to_trigger(self) -> List[Dict]:
        """Return hooks that should trigger at session start"""
        hooks = self.config.get("alwaysTrigger", {}).get("hooks", [])
        return [h for h in hooks if h.get("when") == "session_start"]
    
    def get_metrics_to_compute(self) -> List[Dict]:
        """Return metrics that must be computed for every output"""
        return self.config.get("alwaysCompute", {}).get("metrics", [])
    
    def generate_activation_report(self) -> str:
        """Generate report for Claude to read at session start"""
        skills = self.get_skills_to_load()
        hooks = self.get_hooks_to_trigger()
        metrics = self.get_metrics_to_compute()
        
        report = []
        report.append("=" * 70)
        report.append("PRISM PEAK PERFORMANCE ACTIVATION")
        report.append("=" * 70)
        report.append("")
        
        # Skills to load
        report.append("## SKILLS TO LOAD (read these at session start):")
        for skill in skills:
            skill_path = SKILLS_PATH / skill["name"] / "SKILL.md"
            mcp_path = MCP_SKILLS_PATH / skill["name"] / "SKILL.md"
            if mcp_path.exists():
                report.append(f"  → view /mnt/skills/user/{skill['name']}/SKILL.md")
            elif skill_path.exists():
                report.append(f"  → Filesystem:read_file {skill_path}")
            else:
                report.append(f"  ⚠ {skill['name']} NOT FOUND - create it!")
        report.append("")
        
        # Hooks to trigger
        report.append("## HOOKS AUTO-TRIGGERED:")
        for hook in hooks:
            report.append(f"  ✓ {hook['id']}: Active")
        report.append("")
        
        # Metrics required
        report.append("## METRICS REQUIRED FOR EVERY OUTPUT:")
        for metric in metrics:
            enforcement = metric.get("enforcement", "WARN")
            threshold = metric.get("threshold", "N/A")
            if enforcement == "HARD_BLOCK":
                report.append(f"  🛑 {metric['id']} ≥ {threshold} (HARD BLOCK if failed)")
            else:
                report.append(f"  ⚠ {metric['id']} ≥ {threshold} (WARN if failed)")
        report.append("")
        
        # Utilization tracking
        report.append("## UTILIZATION TRACKING:")
        check_interval = self.config.get("utilizationTracking", {}).get("checkEveryNTools", 5)
        target = self.config.get("utilizationTracking", {}).get("targetUtilization", 0.50)
        report.append(f"  → Check every {check_interval} tool calls")
        report.append(f"  → Target utilization: {target*100:.0f}%")
        report.append(f"  → Track: hooks, skills, formulas, cognitive patterns")
        report.append("")
        
        report.append("=" * 70)
        report.append("REMEMBER: IF IT EXISTS, USE IT EVERYWHERE")
        report.append("=" * 70)
        
        return "\n".join(report)
    
    def track_hook_trigger(self, hook_id: str):
        """Record that a hook was triggered"""
        if hook_id not in self.utilization["hooks_triggered"]:
            self.utilization["hooks_triggered"].append(hook_id)
    
    def track_skill_load(self, skill_name: str):
        """Record that a skill was loaded"""
        if skill_name not in self.utilization["skills_loaded"]:
            self.utilization["skills_loaded"].append(skill_name)
    
    def track_formula_apply(self, formula_id: str):
        """Record that a formula was applied"""
        if formula_id not in self.utilization["formulas_applied"]:
            self.utilization["formulas_applied"].append(formula_id)
    
    def track_metric_compute(self, metric_id: str):
        """Record that a metric was computed"""
        if metric_id not in self.utilization["metrics_computed"]:
            self.utilization["metrics_computed"].append(metric_id)
    
    def track_tool_call(self):
        """Increment tool call counter"""
        self.utilization["tool_calls"] += 1
        
        # Check utilization every N calls
        check_interval = self.config.get("utilizationTracking", {}).get("checkEveryNTools", 5)
        if self.utilization["tool_calls"] % check_interval == 0:
            return self.compute_utilization_warning()
        return None
    
    def compute_utilization_score(self) -> float:
        """Compute current utilization of available resources"""
        # Count what's being used vs what should be used
        hooks_used = len(self.utilization["hooks_triggered"])
        hooks_available = len(self.get_hooks_to_trigger()) + 15  # +15 for cognitive hooks
        
        skills_used = len(self.utilization["skills_loaded"])
        skills_critical = len([s for s in self.get_skills_to_load() if s.get("critical")])
        
        metrics_used = len(self.utilization["metrics_computed"])
        metrics_required = len(self.get_metrics_to_compute())
        
        # Weighted average
        if (hooks_available + skills_critical + metrics_required) == 0:
            return 1.0
            
        score = (
            (hooks_used / max(hooks_available, 1)) * 0.3 +
            (skills_used / max(skills_critical, 1)) * 0.4 +
            (metrics_used / max(metrics_required, 1)) * 0.3
        )
        
        self.utilization["utilization_score"] = min(score, 1.0)
        return self.utilization["utilization_score"]
    
    def compute_utilization_warning(self) -> str:
        """Generate warning if utilization is low"""
        score = self.compute_utilization_score()
        target = self.config.get("utilizationTracking", {}).get("targetUtilization", 0.50)
        warn_threshold = self.config.get("utilizationTracking", {}).get("warnThreshold", 0.30)
        
        if score < warn_threshold:
            return f"⚠ LOW UTILIZATION: {score*100:.0f}% (target: {target*100:.0f}%)\n" \
                   f"  Hooks used: {len(self.utilization['hooks_triggered'])}\n" \
                   f"  Skills loaded: {len(self.utilization['skills_loaded'])}\n" \
                   f"  Consider activating more resources!"
        return None
    
    def save_utilization_log(self):
        """Save utilization data for analysis"""
        self.utilization["ended_at"] = datetime.now().isoformat()
        self.utilization["final_score"] = self.compute_utilization_score()
        
        # Load existing log or create new
        log = []
        if UTILIZATION_PATH.exists():
            try:
                with open(UTILIZATION_PATH, 'r') as f:
                    log = json.load(f)
            except:
                log = []
        
        # Append this session
        log.append(self.utilization)
        
        # Keep last 50 sessions
        if len(log) > 50:
            log = log[-50:]
        
        # Save
        with open(UTILIZATION_PATH, 'w') as f:
            json.dump(log, f, indent=2)
        
        return self.utilization["final_score"]


def main():
    """Generate activation report for session start"""
    activator = PeakActivator()
    print(activator.generate_activation_report())
    
    # Also output JSON summary for programmatic use
    summary = {
        "session_id": activator.session_id,
        "skills_to_load": [s["name"] for s in activator.get_skills_to_load()],
        "hooks_to_trigger": [h["id"] for h in activator.get_hooks_to_trigger()],
        "metrics_required": [m["id"] for m in activator.get_metrics_to_compute()]
    }
    
    print("\n## JSON SUMMARY:")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
