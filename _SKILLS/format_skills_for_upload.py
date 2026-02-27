#!/usr/bin/env python3
"""
Format PRISM skills for Claude Projects upload.
Ensures YAML frontmatter is on line 1 (required format).
"""

import os
import re
import shutil

# Paths
SKILLS_DIR = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS"
OUTPUT_DIR = os.path.join(SKILLS_DIR, "UPLOAD_PACKAGE")

# Skills that need to be uploaded (missing from Claude)
MISSING_SKILLS = [
    # Cognitive Enhancement v7.0 (CRITICAL)
    "prism-anomaly-detector",
    "prism-attention-focus",
    "prism-causal-reasoning",
    "prism-memory-augmentation",
    "prism-self-reflection",
    "prism-cognitive-core",
    "prism-master-equation",
    
    # Original Cognitive (CRITICAL)
    "prism-universal-formulas",
    "prism-reasoning-engine",
    "prism-code-perfection",
    "prism-process-optimizer",
    "prism-safety-framework",
    "prism-cognitive-enhancement",
    
    # AI/ML Skills
    "prism-ai-bayesian",
    "prism-ai-deep-learning",
    "prism-ai-ml-master",
    "prism-ai-optimization",
    "prism-ai-reinforcement",
    "prism-aiml-engine-patterns",
    
    # Extraction Skills
    "prism-extraction-index",
    "prism-extraction-orchestrator",
    "prism-module-builder",
    "prism-swarm-extraction",
    
    # Controller Programming (CRITICAL)
    "prism-fanuc-programming",
    "prism-siemens-programming",
    "prism-heidenhain-programming",
    "prism-gcode-reference",
    
    # Core Development
    "prism-algorithm-selector",
    "prism-auditor",
    "prism-coding-patterns",
    "prism-consumer-mapper",
    "prism-dependency-graph",
    "prism-development",
    "prism-extractor",
    "prism-hierarchy-manager",
    "prism-python-tools",
    
    # Materials System
    "prism-material-template",
    "prism-material-templates",
    "prism-material-validator",
    
    # Session/Context
    "prism-category-defaults",
    "prism-context-dna",
    "prism-context-pressure",
    "prism-quick-start",
    "prism-session-buffer",
    "prism-session-handoff",
    "prism-state-manager",
    
    # Quality/Validation
    "prism-debugging",
    "prism-quality-gates",
    "prism-review",
    "prism-tdd",
    "prism-verification",
    "prism-error-recovery",
    
    # Expert Roles (10)
    "prism-expert-cad-expert",
    "prism-expert-cam-programmer",
    "prism-expert-master-machinist",
    "prism-expert-materials-scientist",
    "prism-expert-mathematics",
    "prism-expert-mechanical-engineer",
    "prism-expert-post-processor",
    "prism-expert-quality-control",
    "prism-expert-quality-manager",
    "prism-expert-thermodynamics",
    
    # Other
    "prism-formal-definitions",
    "prism-knowledge-base",
    "prism-large-file-writer",
    "prism-physics-formulas",
    "prism-physics-reference",
    "prism-planning",
    "prism-post-processor-reference",
    "prism-product-calculators",
    "prism-swarm-orchestrator",
    "prism-task-continuity",
    "prism-tool-selector",
    "prism-unit-converter",
    "prism-utilization",
    "prism-wiring-templates",
]

def extract_yaml_and_content(text):
    """Extract YAML frontmatter and content from skill file."""
    
    # Try to find existing YAML frontmatter
    yaml_pattern = r'^---\s*\n(.*?)\n---\s*\n'
    match = re.search(yaml_pattern, text, re.DOTALL)
    
    if match:
        yaml_content = match.group(1)
        rest_content = text[match.end():]
        # Get any header comments before the YAML
        pre_yaml = text[:match.start()].strip()
        return yaml_content, rest_content, pre_yaml
    else:
        # No YAML found - need to create one
        return None, text, None

def clean_yaml_value(value):
    """Clean a value for YAML - escape special characters."""
    if ':' in value or '"' in value or "'" in value or '\n' in value:
        # Use pipe for multi-line or complex values
        return None  # Signal to use pipe format
    return value

def create_yaml_frontmatter(skill_name, description, existing_yaml=None):
    """Create clean YAML frontmatter."""
    
    # Clean description for YAML
    desc_lines = description.strip().split('\n')
    if len(desc_lines) > 1 or ':' in description:
        # Multi-line description - use pipe format
        desc_formatted = "|\n" + '\n'.join('  ' + line for line in desc_lines)
    else:
        desc_formatted = description.strip()
    
    yaml = f"""---
name: {skill_name}
description: {desc_formatted}
---"""
    
    return yaml

def get_description_from_content(content, skill_name):
    """Extract a description from the content if no YAML exists."""
    
    # Try to find a Purpose or Description section
    purpose_match = re.search(r'##?\s*Purpose\s*\n+(.+?)(?=\n##|\n---|\Z)', content, re.IGNORECASE | re.DOTALL)
    if purpose_match:
        desc = purpose_match.group(1).strip()
        # Clean up markdown formatting
        desc = re.sub(r'\*\*([^*]+)\*\*', r'\1', desc)  # Remove bold
        desc = re.sub(r'\n+', ' ', desc)  # Single line
        desc = desc[:200]  # Limit length
        return desc
    
    # Try first meaningful paragraph
    paragraphs = re.split(r'\n\n+', content)
    for p in paragraphs:
        p = p.strip()
        if p and not p.startswith('#') and not p.startswith('```') and len(p) > 20:
            desc = re.sub(r'\*\*([^*]+)\*\*', r'\1', p)
            desc = re.sub(r'\n+', ' ', desc)
            return desc[:200]
    
    # Default description
    return f"PRISM skill: {skill_name}"

def process_skill(skill_name):
    """Process a single skill and create properly formatted version."""
    
    skill_dir = os.path.join(SKILLS_DIR, skill_name)
    skill_file = os.path.join(skill_dir, "SKILL.md")
    
    if not os.path.exists(skill_file):
        print(f"  [SKIP] {skill_name} - SKILL.md not found")
        return False
    
    # Read original content
    with open(skill_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract YAML and content
    yaml_content, main_content, pre_yaml = extract_yaml_and_content(content)
    
    # If we have header comments (pre_yaml), add them after the YAML
    if pre_yaml:
        main_content = pre_yaml + "\n\n" + main_content
    
    # Create or use description
    if yaml_content:
        # Extract description from existing YAML
        desc_match = re.search(r'description:\s*\|?\s*\n?(.*?)(?=\n\w+:|\Z)', yaml_content, re.DOTALL)
        if desc_match:
            description = desc_match.group(1).strip()
            # Clean indentation
            description = re.sub(r'\n\s+', '\n', description)
        else:
            description = get_description_from_content(main_content, skill_name)
    else:
        description = get_description_from_content(main_content, skill_name)
    
    # Clean description for safe YAML
    description = description.replace('"', "'")
    description = re.sub(r'[^\x00-\x7F]+', '', description)  # Remove non-ASCII
    
    # Create output directory
    output_skill_dir = os.path.join(OUTPUT_DIR, skill_name)
    os.makedirs(output_skill_dir, exist_ok=True)
    
    # Create properly formatted file
    # YAML must be on line 1!
    formatted_content = f"""---
name: {skill_name}
description: |
  {description}
---

{main_content.strip()}
"""
    
    output_file = os.path.join(output_skill_dir, "SKILL.md")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(formatted_content)
    
    # Get file size
    size = os.path.getsize(output_file)
    print(f"  [OK] {skill_name} ({size:,} bytes)")
    return True

def main():
    print("=" * 70)
    print("PRISM Skill Formatter for Claude Projects Upload")
    print("=" * 70)
    print()
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    success_count = 0
    fail_count = 0
    
    print(f"Processing {len(MISSING_SKILLS)} skills...\n")
    
    for skill_name in MISSING_SKILLS:
        if process_skill(skill_name):
            success_count += 1
        else:
            fail_count += 1
    
    print()
    print("=" * 70)
    print(f"COMPLETE: {success_count} formatted, {fail_count} skipped")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 70)
    
    # Create README for upload
    readme = f"""# PRISM Skills Upload Package
## {success_count} Skills Ready for Claude Projects

Upload each folder to Claude Projects as a skill.
Each folder contains a SKILL.md file with proper YAML frontmatter.

## Upload Order (Priority)

### 1. CRITICAL - Cognitive Enhancement v7.0
- prism-cognitive-core (30 hooks)
- prism-master-equation (10 components)
- prism-safety-framework (S(x) scoring)
- prism-anomaly-detector (D(x) scoring)
- prism-attention-focus (A(x))
- prism-causal-reasoning (K(x))
- prism-memory-augmentation (M(x))
- prism-self-reflection

### 2. CRITICAL - Original Cognitive
- prism-reasoning-engine (R(x))
- prism-code-perfection (C(x))
- prism-process-optimizer (P(x))
- prism-universal-formulas (109 formulas)

### 3. Controller Programming
- prism-fanuc-programming
- prism-siemens-programming
- prism-heidenhain-programming
- prism-gcode-reference

### 4. Expert Roles (10)
- prism-expert-*

### 5. All Others
- AI/ML, Extraction, Development, etc.

## Format Notes
- All files have YAML frontmatter on line 1
- Description uses pipe (|) format for multi-line
- No special characters that break YAML parsing
"""
    
    with open(os.path.join(OUTPUT_DIR, "README.md"), 'w') as f:
        f.write(readme)
    
    print(f"\nREADME created at: {os.path.join(OUTPUT_DIR, 'README.md')}")

if __name__ == "__main__":
    main()
