# SKILLS UPLOAD TO APP
## Add These Skills to Your Claude Project

---

## HOW TO UPLOAD SKILLS TO CLAUDE APP

1. Go to your Claude Project settings
2. Click on "Skills" or "Custom Skills" section
3. Click "Add Skill" or "Upload"
4. Navigate to this folder
5. Upload the folder(s) below

---

## NEW SKILL TO ADD (1 folder):

### prism-mandatory-microsession/
**This is the CRITICAL v8.0 skill that was missing!**

- Level 0 (Always-On)
- Enforces microsession decomposition
- Prevents work loss from context overflow
- Enables checkpoint/resume

---

## VERIFICATION

After uploading, start a new chat. You should see this skill listed in the available skills.

The skill will automatically:
- Enforce task decomposition
- Require checkpoint announcements
- Block work without microsession plan

---

## CURRENT SKILLS IN APP (29)

These are already uploaded and don't need changes:
- prism-all-skills
- prism-always-on-mindsets  
- prism-anti-regression
- prism-code-complete-integration
- prism-codebase-packaging
- prism-life-safety-mindset
- prism-material-enhancer
- prism-material-lookup
- prism-material-physics
- prism-material-schema
- prism-maximum-completeness
- prism-monolith-extractor
- prism-monolith-index
- prism-monolith-navigator
- prism-predictive-thinking
- prism-root-cause-tracing
- prism-session-master
- prism-skill-orchestrator
- prism-sp-brainstorm
- prism-sp-debugging
- prism-sp-execution
- prism-sp-handoff
- prism-sp-planning
- prism-sp-review-quality
- prism-sp-review-spec
- prism-sp-verification
- prism-tdd-enhanced

---

## AFTER ADDING NEW SKILL

Total skills: 30 (was 29)

The new mandatory-microsession skill integrates with:
- prism-skill-orchestrator (loads it at Level 0)
- prism-session-master (checkpoint coordination)
- prism-sp-planning (task decomposition)
