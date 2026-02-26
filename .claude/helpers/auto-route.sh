#!/usr/bin/env bash
# auto-route.sh — Classify user prompts into tiers + detect applicable skills.
# Receives the user prompt as $1, outputs a routing decision to stdout.
# Always exits 0. Designed to run in < 100ms (no external calls).

prompt="$(echo "${1:-}" | tr '[:upper:]' '[:lower:]')"

# --- Default values ---
tier="T2"
model="Sonnet"
reason="standard task"
effort="SEQUENTIAL"
skills=()

# --- Tier classification (T3 checked last so it overrides T1 if both match) ---
if echo "$prompt" | grep -qiE '\b(status|what is|show me|list|how many|check|read|explain|count|where is|which file|help)\b'; then
  tier="T1"; model="Haiku"; reason="simple lookup/info task"
fi

if echo "$prompt" | grep -qiE '\b(architect|design|security|safety|scrutin|review complex|multi.system|integration|roadmap generat|parallel|swarm|schema|brainstorm)\b'; then
  tier="T3"; model="Opus"; reason="complex/critical task"
fi

# Empty or unrecognizable prompt falls through to T2 defaults.

# --- Skill detection (all matching skills are collected) ---
if echo "$prompt" | grep -qiE '(continue roadmap|next unit|resume roadmap|what.s next)'; then
  skills+=("continue-roadmap")
fi
if echo "$prompt" | grep -qiE '(generate roadmap|create roadmap)'; then
  skills+=("generate-roadmap")
fi
if echo "$prompt" | grep -qiE '(scrutinize|review roadmap|validate roadmap)'; then
  skills+=("scrutinize")
fi
if echo "$prompt" | grep -qiE '(debug|fix bug|error|failing|broken)'; then
  skills+=("sparc:debug")
fi
if echo "$prompt" | grep -qiE '(security|vulnerability|cve|audit)'; then
  skills+=("sparc:security-review")
fi
if echo "$prompt" | grep -qiE '(test|tdd|spec|coverage)'; then
  skills+=("sparc:tester")
fi
if echo "$prompt" | grep -qiE '(refactor|optimize|clean up|simplify)'; then
  skills+=("sparc:optimizer")
fi
if echo "$prompt" | grep -qiE '(document|docs|readme|jsdoc)'; then
  skills+=("sparc:docs-writer")
fi
if echo "$prompt" | grep -qiE '(deploy|ci/cd|pipeline|github action)'; then
  skills+=("sparc:devops")
fi
if echo "$prompt" | grep -qiE '(plan|design|architect|brainstorm)'; then
  skills+=("superpowers:brainstorming")
fi
if echo "$prompt" | grep -qiE '(review pr|code review|pull request)'; then
  skills+=("code-review:code-review")
fi

# --- Effort level ---
if echo "$prompt" | grep -qiE '\b(swarm|multi.agent|distributed)\b'; then
  effort="SWARM"
elif echo "$prompt" | grep -qiE '\b(parallel|multiple|batch|independent units)\b'; then
  effort="PARALLEL"
fi

# --- Format skill list ---
if [ ${#skills[@]} -eq 0 ]; then
  skill_list="none"
else
  skill_list="$(IFS=', '; echo "${skills[*]}")"
fi

# --- Output ---
cat <<EOF
ROUTING DECISION (auto-detected):
- Model: ${tier}/${model} (${reason})
- Skills: [${skill_list}] — invoke BEFORE any other response
- Effort: ${effort}
ENFORCEMENT RULES:
- If detected tier does NOT match current model: STOP. Tell the user:
  "This task requires ${model}. Please switch models before I proceed."
  DO NOT attempt the task on a mismatched model. Wait for confirmation.
- If skills detected: You MUST invoke them via Skill tool before responding.
- If effort=PARALLEL: You MUST use Task(isolation:"worktree") for independent units.
EOF

exit 0
