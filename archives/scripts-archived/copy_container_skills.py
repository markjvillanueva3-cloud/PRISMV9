"""
Copy container skills content to local folder.
Run this with the skill content piped in.
"""
import os
import sys

DEST_BASE = r"C:\\PRISM\_SKILLS_UPLOAD_COMPLETE"

CONTAINER_SKILLS = [
    "prism-all-skills",
    "prism-always-on-mindsets",
    "prism-anti-regression",
    "prism-code-complete-integration",
    "prism-codebase-packaging",
    "prism-life-safety-mindset",
    "prism-mandatory-microsession",
    "prism-material-enhancer",
    "prism-material-lookup",
    "prism-material-physics",
    "prism-material-schema",
    "prism-maximum-completeness",
    "prism-monolith-extractor",
    "prism-monolith-index",
    "prism-monolith-navigator",
    "prism-predictive-thinking",
    "prism-root-cause-tracing",
    "prism-session-master",
    "prism-skill-orchestrator",
    "prism-sp-brainstorm",
    "prism-sp-debugging",
    "prism-sp-execution",
    "prism-sp-handoff",
    "prism-sp-planning",
    "prism-sp-review-quality",
    "prism-sp-review-spec",
    "prism-sp-verification",
    "prism-tdd-enhanced"
]

# Create directories
for skill in CONTAINER_SKILLS:
    skill_dir = os.path.join(DEST_BASE, skill)
    os.makedirs(skill_dir, exist_ok=True)
    print(f"Created: {skill}")

print(f"\nCreated {len(CONTAINER_SKILLS)} directories")
print("Ready to receive skill content")
