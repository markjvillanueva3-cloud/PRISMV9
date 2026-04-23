#!/usr/bin/env python3
"""
Auto-Feature Selector - automatically utilizes Claude Code features when beneficial.

Triggers:
- Agent hooks for complex verification after engine edits
- Prompt hooks for quality checks on critical files
- Worktree isolation for risky operations
- Model escalation when lower-tier agents fail
- Auto-compact when context pressure is high
- Background agents for long-running tasks
- Cron activation for recurring maintenance

This runs as part of the PreToolUse unified hook to inject optimal features.
"""
import json, os, time
from datetime import datetime

STATS_FILE = os.path.expanduser("~/.prism/coordination-stats.json")
OPTIMIZER_FILE = os.path.expanduser("~/.prism/optimizer-config.json")

def get_feature_recommendations(tool_name, tool_input, session_context):
    recommendations = []

    # 1. Model escalation: if recent agent failures > 30%, suggest higher model
    stats = _load_json(STATS_FILE)
    agent_stats = stats.get("agent_stats", {})
    for model in ["haiku", "sonnet"]:
        ms = agent_stats.get(model, {})
        total = ms.get("total", 0)
        if total >= 5:
            success_rate = ms.get("success", 0) / total
            if success_rate < 0.7:
                next_model = "sonnet" if model == "haiku" else "opus"
                recommendations.append({
                    "feature": "model_escalation",
                    "trigger": f"{model} success rate {success_rate:.0%} < 70%",
                    "action": f"Consider using {next_model} for next agent spawn",
                    "priority": "high"
                })

    # 2. Auto-compact suggestion based on token tracking
    token_stats = stats.get("token_stats", [])
    if token_stats:
        recent = token_stats[-1] if token_stats else {}
        tokens = recent.get("tokens", 0)
        if tokens > 200000:
            recommendations.append({
                "feature": "auto_compact",
                "trigger": f"Session tokens estimated at {tokens:,}",
                "action": "Run /compact to free context space",
                "priority": "high" if tokens > 300000 else "medium"
            })

    # 3. Background agent for long tasks
    if tool_name == "Agent":
        prompt = tool_input.get("prompt", "")
        long_task_keywords = ["exhaustive", "all engines", "full sweep", "every file", "batch", "catalog"]
        if any(kw in prompt.lower() for kw in long_task_keywords):
            recommendations.append({
                "feature": "background_agent",
                "trigger": "Task appears long-running based on keywords",
                "action": "Consider run_in_background:true for this agent",
                "priority": "medium"
            })

    # 4. Worktree isolation for risky edits
    if tool_name in ("Edit", "Write"):
        file_path = tool_input.get("file_path", "")
        risky_patterns = ["dispatcher", "index.ts", "settings.json", "constants.ts", "schema"]
        if any(p in file_path.lower() for p in risky_patterns):
            recommendations.append({
                "feature": "worktree_isolation",
                "trigger": f"Editing critical file: {os.path.basename(file_path)}",
                "action": "Consider using worktree isolation for this change",
                "priority": "low"
            })

    # 5. Cron activation check
    cron_config = os.path.expanduser("~/.claude/skills/cron-manage/cron-templates.json")
    cron_active_file = os.path.expanduser("~/.prism/cron-active.json")
    if os.path.exists(cron_config) and not os.path.exists(cron_active_file):
        recommendations.append({
            "feature": "cron_activation",
            "trigger": "11 cron templates exist but none are active",
            "action": "Run /cron-bootstrap to activate scheduled maintenance",
            "priority": "low"
        })

    # 6. Self-healing check suggestion
    health_file = os.path.expanduser("~/.prism/telemetry/health-checks.jsonl")
    if os.path.exists(health_file):
        try:
            with open(health_file) as f:
                lines = f.readlines()
            if lines:
                last = json.loads(lines[-1].strip())
                score = last.get("health_score", 100)
                if score < 80:
                    recommendations.append({
                        "feature": "self_healing",
                        "trigger": f"Last health score: {score}/100",
                        "action": "Run /self-heal to detect and repair drift",
                        "priority": "high"
                    })
        except:
            pass

    # 7. Review suggestion after multiple edits
    edit_count_file = "/tmp/prism-edit-count"
    try:
        count = 0
        if os.path.exists(edit_count_file):
            with open(edit_count_file) as f:
                count = int(f.read().strip())
        if tool_name in ("Edit", "Write"):
            count += 1
            with open(edit_count_file, "w") as f:
                f.write(str(count))
        if count >= 10:
            recommendations.append({
                "feature": "code_review",
                "trigger": f"{count} edits this session without review",
                "action": "Consider running /prism-review to catch issues",
                "priority": "medium"
            })
    except:
        pass

    return recommendations

def _load_json(path):
    try:
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)
    except:
        pass
    return {}

if __name__ == "__main__":
    recs = get_feature_recommendations("Edit", {"file_path": "/src/engines/test.ts"}, {})
    print(json.dumps(recs, indent=2))
