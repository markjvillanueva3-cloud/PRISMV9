---
name: prism-skill-deployer
version: "1.0"
level: 0
category: always-on
description: |
  AUTOMATIC skill deployment to /mnt/skills/user/ tree.
  Level 0 Always-On - triggers whenever a skill is created or updated.
  NEVER forget to deploy new skills to the skill tree.
  Provides: Deployment commands, verification, registry updates.
  Key principle: If a skill is created, it MUST be deployed.
hooks:
  - skill:postCreate (Priority 0)
  - skill:postUpdate (Priority 0)
triggers:
  - "create skill"
  - "new skill"
  - "update skill"
  - "deploy skill"
  - "skill tree"
  - "SKILL.md"
safety_critical: false
---

# PRISM-SKILL-DEPLOYER
## Automatic Skill Tree Deployment | Level 0 Always-On
### Version 1.0 | Auto-Deploy on Skill Creation

---

## PURPOSE

**NEVER FORGET TO DEPLOY SKILLS TO THE TREE.**

This skill ensures that whenever a new PRISM skill is created or updated:
1. It is automatically copied to `/mnt/skills/user/`
2. The resource registry is updated
3. The skill hierarchy is maintained

---

## TRIGGER CONDITIONS

This skill auto-activates when:
- A new SKILL.md file is created
- An existing skill is updated
- User mentions "create skill", "new skill", "deploy skill"
- Any file path contains "SKILL.md"

---

## DEPLOYMENT PROCESS

### Step 1: Detect Skill Creation
When you create or update a skill at:
- `C:\PRISM\skills\<skill-name>\SKILL.md`
- `C:\PRISM\skills-consolidated\<skill-name>\SKILL.md`
- `C:\_SKILLS\<skill-name>\SKILL.md`

### Step 2: Deploy to Skill Tree
```bash
# Method A: Direct copy (if small skill)
mkdir -p /mnt/skills/user/<skill-name>
# Then create_file with content

# Method B: Bundle and deploy (if multiple skills)
# 1. Copy from user filesystem to Claude
Filesystem:copy_file_user_to_claude -> path: <skill_path>

# 2. Copy to skill tree
bash_tool -> cp /mnt/user-data/uploads/SKILL.md /mnt/skills/user/<skill-name>/SKILL.md
```

### Step 3: Verify Deployment
```bash
ls -la /mnt/skills/user/<skill-name>/
cat /mnt/skills/user/<skill-name>/SKILL.md | head -20
```

### Step 4: Update Registries (on C: drive)
- RESOURCE_REGISTRY.json - add new skill entry
- SKILL_HIERARCHY.json - classify into correct level
- SKILL_TRIGGER_MAP.json - add trigger patterns

---

## QUICK DEPLOY COMMANDS

### Single Skill Deploy
```python
# Step 1: Copy to Claude's computer
Filesystem:copy_file_user_to_claude
path: C:\PRISM\skills-consolidated\<skill-name>\SKILL.md

# Step 2: Create directory and copy
bash_tool:
mkdir -p /mnt/skills/user/<skill-name>
cp /mnt/user-data/uploads/SKILL.md /mnt/skills/user/<skill-name>/SKILL.md
```

### Bulk Deploy (Multiple Skills)
```python
# Step 1: Create bundle on C: drive
py -3 C:\PRISM\scripts\bundle_skills.py

# Step 2: Copy bundle to Claude
Filesystem:copy_file_user_to_claude
path: C:\PRISM\deployment\skills_bundle.json

# Step 3: Deploy all from bundle
python3 << 'EOF'
import json, os
with open('/mnt/user-data/uploads/skills_bundle.json') as f:
    bundle = json.load(f)
for skill, content in bundle.items():
    os.makedirs(f"/mnt/skills/user/{skill}", exist_ok=True)
    with open(f"/mnt/skills/user/{skill}/SKILL.md", 'w') as f:
        f.write(content)
print(f"Deployed {len(bundle)} skills")
EOF
```

---

## AUTO-DEPLOY CHECKLIST

When creating ANY new skill, ALWAYS:

```
□ 1. Create skill on C: drive (skills-consolidated preferred)
□ 2. Copy to /mnt/skills/user/ using commands above
□ 3. Verify: ls /mnt/skills/user/<skill-name>/
□ 4. Update RESOURCE_REGISTRY.json on C: drive
□ 5. Update SKILL_HIERARCHY.json with level classification
□ 6. Update SKILL_TRIGGER_MAP.json with patterns
□ 7. Confirm in response: "✅ Skill deployed to tree"
```

---

## LEVEL CLASSIFICATION RULES

When deploying, classify the skill:

| Level | Criteria | Examples |
|-------|----------|----------|
| L0 | Always-On, cannot disable | combination-engine, hook-system |
| L1 | Cognitive, multi-resource | swarm-coordinator, reasoning-engine |
| L2 | Workflow, development phase | sp-brainstorm, sp-debugging |
| L3 | Domain, task-specific | material-physics, fanuc-programming |
| L4 | Reference, lookup only | api-contracts, error-catalog |

---

## PATHS

| Purpose | Path |
|---------|------|
| User Skills (C:) | C:\PRISM\skills-consolidated\ |
| Deployed Skills | /mnt/skills/user/ |
| Bundle Script | C:\PRISM\scripts\bundle_skills.py |
| Resource Registry | C:\PRISM\data\coordination\RESOURCE_REGISTRY.json |
| Skill Hierarchy | C:\PRISM\state\SKILL_HIERARCHY.json |
| Trigger Map | C:\PRISM\data\coordination\SKILL_TRIGGER_MAP.json |

---

## VERIFICATION

After deploying, always verify:
```bash
# Count total skills
ls /mnt/skills/user/ | grep prism- | wc -l

# Check specific skill
ls -la /mnt/skills/user/<skill-name>/
head -30 /mnt/skills/user/<skill-name>/SKILL.md
```

---

## RESPONSE TEMPLATE

After creating any skill, include:

```
✅ Skill deployed to tree:
   - Name: prism-<skill-name>
   - Level: L<0-4>
   - Path: /mnt/skills/user/prism-<skill-name>/
   - Size: <X> lines
   - Triggers: <patterns>
```

---

## HOOK IMPLEMENTATION

```javascript
// This hook fires after any skill creation
const HOOKS = {
  "skill:postCreate": {
    priority: 0,
    handler: async (skill) => {
      // 1. Deploy to /mnt/skills/user/
      await deployToSkillTree(skill);
      
      // 2. Update registries
      await updateResourceRegistry(skill);
      await updateSkillHierarchy(skill);
      await updateTriggerMap(skill);
      
      // 3. Confirm
      console.log(`✅ ${skill.name} deployed to skill tree`);
    },
    required: true,
    cannotBypass: true
  }
};

async function deployToSkillTree(skill) {
  const targetPath = `/mnt/skills/user/${skill.name}/SKILL.md`;
  // Copy skill content to target
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, skill.content);
}
```

---

## ANTI-PATTERN: NEVER DO THIS

❌ Create skill on C: drive and forget to deploy
❌ Update skill without updating tree version
❌ Create skill without updating registries
❌ Claim "skill created" without verifying deployment

---

**Version:** 1.0 | **Date:** 2026-01-30 | **Level:** 0 (Always-On)
**Key Rule:** IF A SKILL IS CREATED, IT MUST BE DEPLOYED TO THE TREE
