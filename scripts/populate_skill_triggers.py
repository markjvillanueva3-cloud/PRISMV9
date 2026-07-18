#!/usr/bin/env python3
"""Populate SKILL_INDEX.json triggers from skill SKILL.md 'When To Use' sections.

Reads each skill directory, extracts keywords from When To Use, and populates
the triggers array in SKILL_INDEX.json. This enables autoSkillContextMatch
to fire when relevant tool calls happen.

Usage: py -3 scripts/populate_skill_triggers.py [--dry-run]
"""
import json
import os
import re
import sys

SKILL_DIR = r"C:\PRISM\skills-consolidated"
INDEX_PATH = os.path.join(SKILL_DIR, "SKILL_INDEX.json")

# Keywords to EXCLUDE (too generic, would match everything)
STOP_WORDS = {
    "the", "and", "for", "not", "use", "this", "that", "with", "from", "when",
    "how", "what", "why", "which", "where", "who", "you", "your", "are", "was",
    "were", "been", "being", "have", "has", "had", "will", "would", "could",
    "should", "may", "might", "must", "can", "does", "did", "doing", "done",
    "need", "want", "get", "got", "set", "let", "put", "make", "take", "give",
    "just", "also", "only", "even", "still", "already", "about", "after",
    "before", "during", "between", "into", "through", "over", "under",
    "each", "every", "some", "any", "all", "most", "more", "less", "than",
    "then", "them", "they", "their", "there", "here", "both", "same", "other",
    "very", "really", "too", "much", "many", "such", "like", "help",
    "using", "used", "uses", "skill", "prism", "claude", "file", "files",
    "run", "running", "runs", "see", "check", "look", "find", "read",
    "write", "create", "build", "add", "remove", "delete", "update",
    "new", "old", "first", "last", "next", "current", "specific",
    "section", "example", "result", "output", "input", "data",
    "line", "lines", "code", "system", "step", "steps",
}

# Domain-specific compound terms to preserve as single triggers
COMPOUND_TERMS = {
    "cutting force": "cutting_force",
    "tool life": "tool_life",
    "surface finish": "surface_finish",
    "chip thinning": "chip_thinning",
    "speed feed": "speed_feed",
    "tool wear": "tool_wear",
    "tool path": "toolpath",
    "tool holder": "toolholder",
    "work holding": "workholding",
    "anti regression": "anti_regression",
    "error handling": "error_handling",
    "error recovery": "error_recovery",
    "session recovery": "session_recovery",
    "context pressure": "context_pressure",
    "hook authoring": "hook_authoring",
    "hook enforcement": "hook_enforcement",
    "material removal": "material_removal",
    "cutting parameters": "cutting_parameters",
    "depth cut": "depth_of_cut",
    "spindle speed": "spindle_speed",
    "feed rate": "feed_rate",
    "machine dynamics": "machine_dynamics",
    "chatter vibration": "chatter_vibration",
    "thread milling": "thread_milling",
    "tap drill": "tap_drill",
    "thermal effects": "thermal_effects",
    "surface roughness": "surface_roughness",
    "process capability": "process_capability",
    "gcode generation": "gcode_generation",
    "alarm decode": "alarm_decode",
    "alarm code": "alarm_code",
    "nl hook": "nl_hook",
    "cadence function": "cadence_function",
    "phase gate": "phase_gate",
    "ralph validation": "ralph_validation",
    "omega score": "omega_score",
}

def extract_when_to_use(skill_dir):
    """Read SKILL.md, extract text from 'When To Use' section."""
    skill_path = os.path.join(skill_dir, "SKILL.md")
    if not os.path.exists(skill_path):
        return ""
    try:
        with open(skill_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except:
        return ""
    
    # Find 'When To Use' section
    match = re.search(r'##\s*When\s+To\s+Use\b(.*?)(?=##|$)', content, re.DOTALL | re.IGNORECASE)
    if not match:
        # Fallback: use description from frontmatter
        desc_match = re.search(r'description:\s*(.+)', content)
        if desc_match:
            return desc_match.group(1)
        return ""
    return match.group(1)

def extract_triggers(text, skill_name):
    """Extract meaningful trigger keywords from text."""
    triggers = set()
    text_lower = text.lower()
    
    # Check compound terms first
    for compound, token in COMPOUND_TERMS.items():
        if compound in text_lower:
            triggers.add(token)
    
    # Extract individual words
    words = re.findall(r'[a-z][a-z0-9_]+', text_lower)
    for word in words:
        if len(word) < 4:  # Skip very short words
            continue
        if word in STOP_WORDS:
            continue
        # Keep domain-specific terms
        if any([
            word.endswith('ing') and len(word) > 6,  # machining, threading, etc.
            word.endswith('tion') and len(word) > 6,  # validation, optimization
            word.endswith('ment') and len(word) > 6,  # measurement, alignment
            word in {'material', 'machine', 'tool', 'alarm', 'formula', 'cutting',
                     'milling', 'turning', 'drilling', 'threading', 'grinding',
                     'roughing', 'finishing', 'toolpath', 'spindle', 'coolant',
                     'fixture', 'workpiece', 'insert', 'carbide', 'coating',
                     'diameter', 'depth', 'width', 'speed', 'feed', 'force',
                     'torque', 'power', 'temperature', 'deflection', 'vibration',
                     'chatter', 'stability', 'wear', 'breakage', 'fatigue',
                     'safety', 'collision', 'clearance', 'tolerance',
                     'fanuc', 'haas', 'okuma', 'siemens', 'heidenhain',
                     'gcode', 'program', 'cycle', 'trochoidal',
                     'hook', 'cadence', 'session', 'checkpoint', 'compaction',
                     'recovery', 'validation', 'regression', 'deployment',
                     'dispatcher', 'engine', 'registry', 'script', 'skill',
                     'ralph', 'omega', 'manus', 'agent', 'brainstorm',
                     'debug', 'error', 'failure', 'pattern', 'strategy',
                     'cache', 'performance', 'optimization', 'efficiency',
                     'titanium', 'steel', 'aluminum', 'inconel', 'stainless',
                     'hardened', 'superalloy', 'ceramic', 'composite',
                     },
        ]):
            triggers.add(word)
    
    # Add skill name parts as triggers (prism-cutting-tools -> cutting, tools)
    name_parts = skill_name.replace('prism-', '').split('-')
    for part in name_parts:
        if len(part) > 3 and part not in STOP_WORDS:
            triggers.add(part)
    
    return sorted(triggers)

def main():
    dry_run = '--dry-run' in sys.argv
    
    # Load index
    with open(INDEX_PATH, 'r', encoding='utf-8') as f:
        index = json.load(f)
    
    skills = index.get('skills', {})
    updated = 0
    skipped = 0
    total_triggers = 0
    
    for skill_name, meta in skills.items():
        skill_dir = os.path.join(SKILL_DIR, skill_name)
        
        # Extract triggers from SKILL.md
        when_text = extract_when_to_use(skill_dir)
        triggers = extract_triggers(when_text, skill_name)
        
        if not triggers:
            skipped += 1
            continue
        
        # Merge with existing triggers (don't clobber manual ones)
        existing = set(meta.get('triggers', []))
        merged = sorted(existing | set(triggers))
        
        if merged != sorted(existing):
            meta['triggers'] = merged
            updated += 1
            total_triggers += len(merged)
            if dry_run:
                print(f"  {skill_name}: {len(existing)} -> {len(merged)} triggers")
                if len(merged) <= 8:
                    print(f"    {merged}")
        else:
            skipped += 1
    
    print(f"\nResults: {updated} skills updated, {skipped} skipped, {total_triggers} total triggers")
    
    if not dry_run:
        # Write back
        with open(INDEX_PATH, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2, ensure_ascii=False)
        print(f"Written to {INDEX_PATH}")
    else:
        print("DRY RUN — no changes written")

if __name__ == '__main__':
    main()
