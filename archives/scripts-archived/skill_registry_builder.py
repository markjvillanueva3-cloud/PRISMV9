#!/usr/bin/env python3
"""
PRISM Skill Registry Builder - R2.4
Extracts comprehensive metadata from all skills and wires them to MCP registry.

Session: R2.4.1 - Cognitive + Core Skills
Target: 141 skills with full metadata, capabilities, hooks, dependencies
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path

# Paths
SKILLS_PATH = r"C:\PRISM\skills-consolidated"
REGISTRY_PATH = r"C:\PRISM\registries\RESOURCE_REGISTRY.json"
OUTPUT_PATH = r"C:\PRISM\registries\SKILL_REGISTRY.json"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits\skill_registry_r2_4.json"

def extract_skill_metadata(skill_path: str) -> dict:
    """Extract comprehensive metadata from a skill file."""
    skill_name = os.path.basename(os.path.dirname(skill_path))
    
    with open(skill_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    lines = content.split('\n')
    size_bytes = os.path.getsize(skill_path)
    
    # Extract YAML frontmatter
    description = ""
    if content.startswith('---'):
        try:
            end_idx = content.index('---', 3)
            frontmatter = content[3:end_idx]
            desc_match = re.search(r'description:\s*\|?\s*\n?\s*(.*?)(?:\n[a-z]|\n---|\Z)', frontmatter, re.DOTALL)
            if desc_match:
                description = desc_match.group(1).strip()
        except:
            pass
    
    # If no frontmatter description, try first paragraph
    if not description:
        for line in lines[5:20]:
            if line.strip() and not line.startswith('#') and not line.startswith('```'):
                description = line.strip()[:200]
                break
    
    # Extract hooks mentioned
    hooks = list(set(re.findall(r'([A-Z]+-\d{3})', content)))
    
    # Extract capabilities (look for bullet points describing what it does)
    capabilities = []
    cap_patterns = [
        r'- ([A-Z][^-\n]{10,80})',  # Bullet points starting with caps
        r'\* ([A-Z][^*\n]{10,80})',  # Star bullets
        r'CAN:\s*(.*?)(?:\n|$)',    # Explicit CAN: statements
    ]
    for pattern in cap_patterns:
        matches = re.findall(pattern, content)
        for match in matches[:5]:  # Limit to 5 per pattern
            if len(match) > 15 and not match.startswith('PRISM') and 'http' not in match.lower():
                capabilities.append(match.strip()[:100])
    capabilities = list(set(capabilities))[:10]
    
    # Extract dependencies (other skills referenced)
    dependencies = list(set(re.findall(r'prism-[a-z\-]+', content.lower())))
    dependencies = [d for d in dependencies if d != skill_name][:15]
    
    # Determine level based on content/name
    level = determine_level(skill_name, content)
    
    # Determine category
    category = determine_category(skill_name)
    
    # Extract formulas referenced
    formulas = list(set(re.findall(r'[A-Z]-[A-Z]+-\d{3}', content)))
    
    # Count sections
    sections = len(re.findall(r'^#{1,3}\s+', content, re.MULTILINE))
    
    return {
        "id": f"SKILL-{skill_name.upper().replace('PRISM-', '').replace('-', '_')}",
        "name": skill_name,
        "displayName": skill_name.replace('prism-', '').replace('-', ' ').title(),
        "description": description[:300] if description else f"PRISM skill: {skill_name}",
        "path": skill_path,
        "category": category,
        "level": level,
        "sizeBytes": size_bytes,
        "sizeKB": round(size_bytes / 1024, 1),
        "lineCount": len(lines),
        "sectionCount": sections,
        "capabilities": capabilities,
        "dependencies": dependencies,
        "hooks": hooks,
        "formulas": formulas,
        "consumers": [],  # Will be populated by wiring phase
        "lastUpdated": datetime.now().isoformat(),
        "status": "INDEXED"
    }

def determine_level(name: str, content: str) -> str:
    """Determine skill level (L0-L8)."""
    name_lower = name.lower()
    
    if any(x in name_lower for x in ['cognitive-core', 'life-safety', 'anti-regression', 'microsession', 'predictive']):
        return "L0_ALWAYS_ON"
    elif any(x in name_lower for x in ['universal-formulas', 'reasoning-engine', 'code-perfection', 'safety-framework', 'master-equation', 'process-optimizer']):
        return "L1_COGNITIVE"
    elif 'sp-' in name_lower:
        return "L2_WORKFLOW"
    elif any(x in name_lower for x in ['master', 'orchestrator', 'index', 'navigator', 'extractor']):
        return "L3_DOMAIN_MASTER"
    elif any(x in name_lower for x in ['ai-', 'ml', 'bayesian', 'deep-learning', 'reinforcement', 'optimization']):
        return "L4_AI_ML"
    elif 'material' in name_lower:
        return "L5_MATERIALS"
    elif 'expert' in name_lower:
        return "L6_EXPERT"
    elif any(x in name_lower for x in ['fanuc', 'siemens', 'heidenhain', 'gcode', 'api-contracts', 'error-catalog', 'tables']):
        return "L7_REFERENCE"
    else:
        return "L8_UTILITY"

def determine_category(name: str) -> str:
    """Determine skill category."""
    name_lower = name.lower()
    
    categories = {
        'COGNITIVE': ['cognitive', 'reasoning', 'master-equation', 'causal', 'attention', 'anomaly'],
        'CORE': ['code-', 'coding', 'debugging', 'monolith', 'extraction', 'all-skills', 'orchestrator'],
        'SESSION': ['session', 'state', 'quick-start', 'buffer', 'handoff', 'continuity'],
        'QUALITY': ['quality', 'validator', 'tdd', 'verification', 'review', 'auditor'],
        'MATERIALS': ['material'],
        'MANUFACTURING': ['manufacturing', 'cutting', 'speed', 'feed', 'cam', 'tool-'],
        'AI_ML': ['ai-', '-ml', 'bayesian', 'deep-learning', 'reinforcement', 'optimization'],
        'CONTROLLERS': ['fanuc', 'siemens', 'heidenhain', 'gcode', 'controller', 'post-processor', 'alarm'],
        'EXPERTS': ['expert-'],
        'SP_WORKFLOW': ['sp-'],
        'KNOWLEDGE': ['knowledge', 'formula', 'physics'],
        'SAFETY': ['safety', 'life-safety', 'anti-regression']
    }
    
    for cat, keywords in categories.items():
        if any(kw in name_lower for kw in keywords):
            return cat
    
    return 'UTILITY'

def build_skill_registry(categories_to_process=None):
    """Build complete skill registry."""
    skills = []
    processed = 0
    errors = []
    
    print("=" * 70)
    print("PRISM SKILL REGISTRY BUILDER - R2.4")
    print("=" * 70)
    
    # Scan all skills
    for item in sorted(os.listdir(SKILLS_PATH)):
        item_path = os.path.join(SKILLS_PATH, item)
        if os.path.isdir(item_path):
            skill_file = os.path.join(item_path, 'SKILL.md')
            if os.path.exists(skill_file):
                try:
                    metadata = extract_skill_metadata(skill_file)
                    
                    # Filter by category if specified
                    if categories_to_process:
                        if metadata['category'] not in categories_to_process:
                            continue
                    
                    skills.append(metadata)
                    processed += 1
                    print(f"  [{processed:3d}] {metadata['name']}: {metadata['category']} / {metadata['level']}")
                    
                except Exception as e:
                    errors.append({'skill': item, 'error': str(e)})
                    print(f"  [ERR] {item}: {e}")
    
    print()
    print(f"Processed: {processed} skills")
    print(f"Errors: {len(errors)}")
    
    # Build registry structure
    registry = {
        "version": "2.4.1",
        "generatedAt": datetime.now().isoformat(),
        "session": "R2.4.1",
        "summary": {
            "total": len(skills),
            "byCategory": {},
            "byLevel": {}
        },
        "skills": skills
    }
    
    # Compute summaries
    for skill in skills:
        cat = skill['category']
        level = skill['level']
        registry['summary']['byCategory'][cat] = registry['summary']['byCategory'].get(cat, 0) + 1
        registry['summary']['byLevel'][level] = registry['summary']['byLevel'].get(level, 0) + 1
    
    return registry, errors

def update_main_registry(skill_registry):
    """Update the main RESOURCE_REGISTRY with skills."""
    with open(REGISTRY_PATH, 'r') as f:
        main_registry = json.load(f)
    
    # Update skills array
    main_registry['skills'] = skill_registry['skills']
    
    # Update summary
    if 'summary' not in main_registry:
        main_registry['summary'] = {}
    main_registry['summary']['skills'] = len(skill_registry['skills'])
    main_registry['summary']['total'] = sum([
        len(main_registry.get('skills', [])),
        len(main_registry.get('engines', [])),
        main_registry['summary'].get('scripts', 0),
        main_registry['summary'].get('agents', 0),
        main_registry['summary'].get('formulas', 0),
        main_registry['summary'].get('hooks', 0),
    ])
    
    with open(REGISTRY_PATH, 'w') as f:
        json.dump(main_registry, f, indent=2)
    
    print(f"\nUpdated {REGISTRY_PATH}")
    print(f"  Skills: {len(skill_registry['skills'])}")

def main():
    import sys
    
    # Check for category filter
    categories = None
    if len(sys.argv) > 1:
        categories = sys.argv[1].split(',')
        print(f"Filtering by categories: {categories}")
    
    # Build registry
    skill_registry, errors = build_skill_registry(categories)
    
    # Save skill registry
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(skill_registry, f, indent=2)
    print(f"\nSaved skill registry to {OUTPUT_PATH}")
    
    # Save audit
    audit = {
        "session": "R2.4.1",
        "timestamp": datetime.now().isoformat(),
        "skillsProcessed": len(skill_registry['skills']),
        "errors": errors,
        "summary": skill_registry['summary']
    }
    with open(AUDIT_PATH, 'w') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit to {AUDIT_PATH}")
    
    # Update main registry
    update_main_registry(skill_registry)
    
    # Print summary
    print("\n" + "=" * 70)
    print("SKILL REGISTRY SUMMARY")
    print("=" * 70)
    print("\nBy Category:")
    for cat, count in sorted(skill_registry['summary']['byCategory'].items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")
    print("\nBy Level:")
    for level, count in sorted(skill_registry['summary']['byLevel'].items()):
        print(f"  {level}: {count}")

if __name__ == "__main__":
    main()
