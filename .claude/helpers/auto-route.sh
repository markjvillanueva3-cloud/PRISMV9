#!/usr/bin/env bash
# auto-route.sh — Smart prompt classifier for UserPromptSubmit hook.
# Analyzes user prompt → assigns role(s), model tier, effort level, and skills.
# Receives the user prompt as $1, outputs routing config to stdout.
# Always exits 0. Designed to run in < 150ms (no external calls).

prompt_raw="${1:-}"
prompt="$(echo "$prompt_raw" | tr '[:upper:]' '[:lower:]')"
prompt_len=${#prompt_raw}

# ─── DOMAIN DETECTION ─────────────────────────────────────────────
domains=()

if echo "$prompt" | grep -qiE '\b(typescript|\.ts\b|esbuild|tsc|npm|node|vitest|eslint|javascript|\.js\b|react|vue|angular|svelte|next\.?js|express|dispatcher|executor|registry|mcp.?server)'; then
  domains+=("typescript")
fi
if echo "$prompt" | grep -qiE '\b(python|\.py\b|pip|pytest|django|flask|pandas|numpy|torch|venv|script)'; then
  domains+=("python")
fi
if echo "$prompt" | grep -qiE '\b(manufactur|material|alloy|cnc|g.?code|lathe|mill|tolerance|cad|cam|machining|hardness|tensile|steel|aluminum|titanium|composite|injection.?mold|3d.?print|additive|weld|anneal|temper|forging|casting)'; then
  domains+=("manufacturing")
fi
if echo "$prompt" | grep -qiE '\b(architect|infrastructure|devops|docker|kubernetes|k8s|terraform|aws|azure|gcp|ci.?cd|pipeline|deploy|helm|nginx|microservice|monolith|scaling)'; then
  domains+=("architecture")
fi
if echo "$prompt" | grep -qiE '\b(security|vulnerab|exploit|cve|owasp|penetration|pentest|xss|injection|csrf|encrypt|ssl|tls|firewall|threat|attack|privilege|rbac)'; then
  domains+=("security")
fi
if echo "$prompt" | grep -qiE '\b(data.?analy|statistic|machine.?learn|\bml\b|deep.?learn|neural|model.?train|dataset|feature.?eng|regression|classif|cluster|nlp|llm|embedding|transformer)'; then
  domains+=("data_ml")
fi
if echo "$prompt" | grep -qiE '\b(database|sql|postgres|mysql|sqlite|mongo|redis|query|index|schema|migration|orm|prisma|drizzle|\bjoin\b|\btable\b)'; then
  domains+=("database")
fi
if echo "$prompt" | grep -qiE '\b(api|endpoint|rest\b|graphql|grpc|websocket|swagger|openapi|webhook|rate.?limit|cors)'; then
  domains+=("api")
fi
if echo "$prompt" | grep -qiE '\b(frontend|ui\b|ux\b|css|tailwind|html|component|layout|responsive|accessibility|a11y|animation|design.?system|figma)'; then
  domains+=("frontend")
fi
if echo "$prompt" | grep -qiE '\b(document|readme|jsdoc|tsdoc|changelog|api.?doc|tutorial|guide|wiki)'; then
  domains+=("documentation")
fi
if echo "$prompt" | grep -qiE '\b(test|spec\b|tdd|coverage|mock|stub|assert|fixture|e2e|integration.?test|unit.?test|vitest|jest|cypress|playwright)'; then
  domains+=("testing")
fi
if echo "$prompt" | grep -qiE '\b(perform|optimi|profil|benchmark|latency|throughput|cache|memo|lazy\b|speed|bottleneck|memory.?leak|bundle.?size)'; then
  domains+=("performance")
fi
if echo "$prompt" | grep -qiE '\b(math|formula|equation|calculate|calculus|physics|statics|dynamics|thermo|fluid|stress|strain|torque|force\b|friction|heat.?transfer|fea\b|cfd\b|deflection|beam|moment|inertia)'; then
  domains+=("math_physics")
fi
if echo "$prompt" | grep -qiE '\b(business|strategy|revenue|cost\b|roi\b|market|competi|stakeholder|roadmap|planning|budget|pricing)'; then
  domains+=("business")
fi

# Default domain if nothing matched
if [ ${#domains[@]} -eq 0 ]; then
  domains+=("general")
fi

# ─── ROLE ASSIGNMENT ──────────────────────────────────────────────
roles=()

for d in "${domains[@]}"; do
  case "$d" in
    typescript)     roles+=("Senior TypeScript Engineer") ;;
    python)         roles+=("Senior Python Engineer") ;;
    manufacturing)  roles+=("Manufacturing Process Expert") ;;
    architecture)   roles+=("Principal Systems Architect") ;;
    security)       roles+=("Senior Security Auditor") ;;
    data_ml)        roles+=("Data Scientist & ML Engineer") ;;
    database)       roles+=("Database Architect") ;;
    api)            roles+=("API Design Specialist") ;;
    frontend)       roles+=("Senior Frontend Engineer") ;;
    documentation)  roles+=("Technical Documentation Lead") ;;
    testing)        roles+=("Senior QA & Reliability Engineer") ;;
    performance)    roles+=("Performance Optimization Specialist") ;;
    math_physics)   roles+=("Applied Mathematics & Physics Expert") ;;
    business)       roles+=("Strategic Business Analyst") ;;
    general)        roles+=("Research Specialist") ;;
  esac
done

# Cap at 3 roles
if [ ${#roles[@]} -gt 3 ]; then
  roles=("${roles[@]:0:3}")
fi

# Join roles with " + " separator
role_str="${roles[0]}"
for ((i=1; i<${#roles[@]}; i++)); do
  role_str="${role_str} + ${roles[$i]}"
done

# ─── COMPLEXITY / MODEL TIER ─────────────────────────────────────
tier="SONNET"
complexity="MODERATE"
reason="standard engineering task"

# SIMPLE triggers → HAIKU
if echo "$prompt" | grep -qiE '^\s*(status|what is|show me|list|how many|check|read|explain|count|where is|which file|help|what does)\b'; then
  tier="HAIKU"; complexity="SIMPLE"; reason="lookup/info query"
fi
# Short prompts with question words
if [ $prompt_len -lt 40 ] && echo "$prompt" | grep -qiE '\?$'; then
  tier="HAIKU"; complexity="SIMPLE"; reason="brief question"
fi

# COMPLEX triggers → OPUS (overrides SIMPLE if both match)
if echo "$prompt" | grep -qiE '\b(architect|design system|security audit|safety.?critical|multi.?system|integration|brainstorm|from scratch|refactor.*(entire|whole|all)|production.?ready|schema design|threat model)\b'; then
  tier="OPUS"; complexity="COMPLEX"; reason="complex/critical architecture"
fi
if echo "$prompt" | grep -qiE '\b(scrutin|review.*(complex|entire|full)|roadmap.?generat|parallel.?execut|swarm|novel.?algorithm|implement.*(from|new).*(scratch|system))\b'; then
  tier="OPUS"; complexity="COMPLEX"; reason="complex multi-step task"
fi
# Security always bumps to OPUS
if [[ " ${domains[*]} " =~ " security " ]]; then
  tier="OPUS"; complexity="COMPLEX"; reason="security-critical task"
fi
# Manufacturing precision → OPUS
if [[ " ${domains[*]} " =~ " manufacturing " ]] && echo "$prompt" | grep -qiE '\b(tolerance|precision|critical|safety|spec)\b'; then
  tier="OPUS"; complexity="COMPLEX"; reason="precision-critical manufacturing"
fi
# Very long prompts with multiple concerns → OPUS
if [ $prompt_len -gt 500 ]; then
  tier="OPUS"; complexity="COMPLEX"; reason="multi-concern detailed request"
fi

# ─── EFFORT LEVEL ─────────────────────────────────────────────────
case "$complexity" in
  SIMPLE)   effort="LOW" ;;
  MODERATE) effort="MEDIUM" ;;
  COMPLEX)  effort="HIGH" ;;
esac

# ─── SKILL DETECTION ─────────────────────────────────────────────
skills=()

if echo "$prompt" | grep -qiE '(continue roadmap|next unit|resume roadmap|what.s next)'; then
  skills+=("continue-roadmap")
fi
if echo "$prompt" | grep -qiE '(generate roadmap|create roadmap)'; then
  skills+=("generate-roadmap")
fi
if echo "$prompt" | grep -qiE '(scrutinize|review roadmap|validate roadmap)'; then
  skills+=("scrutinize")
fi
if echo "$prompt" | grep -qiE '(debug|fix|bug|error|exception|failing|broken|crash|null.?pointer|undefined|not working|doesn.t work|won.t)'; then
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
if echo "$prompt" | grep -qiE '(deploy|ci/cd|pipeline|github action)'; then
  skills+=("sparc:devops")
fi
if echo "$prompt" | grep -qiE '(review pr|code review|pull request)'; then
  skills+=("code-review:code-review")
fi

# ─── EXECUTION MODE ──────────────────────────────────────────────
exec_mode="SEQUENTIAL"
if echo "$prompt" | grep -qiE '\b(swarm|multi.agent|distributed)\b'; then
  exec_mode="SWARM"
elif echo "$prompt" | grep -qiE '\b(parallel|multiple|batch|independent)\b'; then
  exec_mode="PARALLEL"
fi

# ─── FORMAT OUTPUT ────────────────────────────────────────────────
if [ ${#skills[@]} -eq 0 ]; then
  skill_list="none"
else
  skill_list="$(IFS=', '; echo "${skills[*]}")"
fi

# Build effort directive
case "$effort" in
  HIGH) effort_dir="Read all relevant files, consider edge cases, validate approach, run builds/tests, explain thoroughly." ;;
  MEDIUM) effort_dir="Read key files, implement efficiently, brief explanation." ;;
  LOW) effort_dir="Answer directly, minimal exploration, no elaboration." ;;
esac

# Build the context string (must be single-line for JSON embedding)
context="SMART CONFIG: Role=[${role_str}] Model=${tier} (${reason}) Effort=${effort} Mode=${exec_mode} Skills=[${skill_list}] | DIRECTIVES: Adopt the role(s) above. At ${effort} effort: ${effort_dir}"

# Escape for JSON
context_escaped=$(echo "$context" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')

echo "{\"additionalContext\": \"${context_escaped}\"}"

exit 0
