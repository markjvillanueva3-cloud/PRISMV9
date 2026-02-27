import os
import re

UPLOAD_DIR = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\UPLOAD_ALL"

# Descriptions for each skill
DESCRIPTIONS = {
    "prism-cognitive-core": "Level 0 Always-On cognitive enhancement with 5 AI/ML patterns and 30 hooks. v2.0 includes 10 components for Omega(x) computation.",
    "prism-reasoning-engine": "12 reasoning metrics for R(x) score. Validates logical consistency, evidence quality, and inference validity.",
    "prism-code-perfection": "11 code quality metrics for C(x) score. Covers structure, patterns, error handling, and maintainability.",
    "prism-process-optimizer": "12 process metrics for P(x) score. Optimizes workflows, checkpoints, and efficiency.",
    "prism-safety-framework": "7 failure modes and 7 defense layers for S(x) score. CRITICAL for manufacturing safety.",
    "prism-universal-formulas": "109 formulas across 20 domains. Manufacturing physics, optimization, statistics, and AI/ML.",
    "prism-anomaly-detector": "7 anomaly types for D(x) score. Detects range violations, physics errors, and dangerous data patterns.",
    "prism-attention-focus": "Context prioritization for A(x) score. Manages 100K token context window efficiently.",
    "prism-causal-reasoning": "Cause-effect understanding for K(x) score. 50+ causal chains for manufacturing physics.",
    "prism-memory-augmentation": "Session continuity for M(x) score. 5 memory types with retrieval algorithms.",
    "prism-self-reflection": "Continuous improvement via REFL hooks. Error taxonomy and self-correction protocols.",
    "prism-master-equation": "Master quality equation Omega(x) v2.0. Integrates 10 components with dual hard constraints.",
    "prism-sp-brainstorm": "Socratic design methodology. MANDATORY STOP before implementation with chunked approval.",
    "prism-sp-planning": "Detailed task planning. Creates 2-5 minute executable tasks with zero ambiguity.",
    "prism-sp-execution": "Checkpoint execution with progress tracking. Safe interruption and state persistence.",
    "prism-sp-debugging": "4-phase debugging process. Evidence collection, root cause, hypothesis testing, fix with prevention.",
    "prism-sp-review-spec": "Specification compliance gate. Verifies output matches approved design.",
    "prism-sp-review-quality": "Code quality gate. Patterns, style, API contracts, 10 Commandments verification.",
    "prism-sp-verification": "Evidence-based completion proof. Level 5 verification standards.",
    "prism-sp-handoff": "Session transition protocol. State capture and next-session preparation.",
    "prism-fanuc-programming": "Complete FANUC CNC programming reference. G-codes, M-codes, macros, alarms.",
    "prism-siemens-programming": "Siemens SINUMERIK programming reference. 840D/828D controllers.",
    "prism-heidenhain-programming": "Heidenhain TNC programming reference. Conversational and ISO modes.",
    "prism-gcode-reference": "Universal G-code reference. Cross-controller compatibility tables.",
    "prism-controller-quick-ref": "Quick reference for CNC controllers. Navigation guide to detailed references.",
    "prism-material-schema": "Complete 127-parameter material structure. All categories and relationships defined.",
    "prism-material-physics": "Physics formulas using material parameters. Kienzle, Johnson-Cook, Taylor equations.",
    "prism-material-lookup": "Fast access patterns for material data. Search, filter, and caching strategies.",
    "prism-material-enhancer": "Enhancement workflows for 100% parameter coverage. Gap filling and estimation.",
    "prism-material-template": "Template for creating new materials. Ensures completeness and consistency.",
    "prism-material-templates": "Collection of material templates by category. Pre-filled starting points.",
    "prism-material-validator": "Validates material data completeness and physical consistency.",
    "prism-monolith-index": "Complete indexed map of v8.89 monolith. 986,621 lines, 831 modules cataloged.",
    "prism-monolith-navigator": "Search strategies for finding functionality in monolith. Pattern recognition.",
    "prism-monolith-navigator-sp": "Superpowers integration for monolith navigation.",
    "prism-monolith-extractor": "Protocols for safely extracting code from monolith. Validation and rollback.",
    "prism-session-master": "Unified session management. Lifecycle, context pressure, state persistence, recovery.",
    "prism-session-handoff": "Session transition and handoff protocols. Quick resume preparation.",
    "prism-session-buffer": "Graceful session limit management with buffer zones. Prevents lost progress.",
    "prism-state-manager": "CURRENT_STATE.json management. Read, update, and recovery protocols.",
    "prism-context-dna": "Context window optimization. Priority allocation and compression.",
    "prism-context-pressure": "Context overflow prevention. Pre-compaction save protocols.",
    "prism-quick-start": "Fast session initialization. 30-second resume capability.",
    "prism-task-continuity": "Task state preservation across sessions and compactions.",
    "prism-quality-master": "Unified quality and validation reference. Consolidates 5 quality skills.",
    "prism-quality-gates": "Gate definitions and pass/fail criteria. Blocking vs warning gates.",
    "prism-validator": "Automated quality checks. Syntax, ranges, cross-references, physical consistency.",
    "prism-verification": "Verification protocols and evidence requirements.",
    "prism-review": "Review standards and checklists. Specification and quality reviews.",
    "prism-tdd": "Enhanced Test-Driven Development with RED-GREEN-REFACTOR cycle for manufacturing.",
    "prism-debugging": "General debugging patterns and techniques.",
    "prism-error-recovery": "Error recovery strategies and fallback procedures.",
    "prism-error-catalog": "Comprehensive error reference. Codes 1000-9999 with causes and fixes.",
    "prism-code-master": "Unified code and architecture reference. Patterns, algorithms, dependencies.",
    "prism-coding-patterns": "MIT-based coding patterns. SOLID, DRY, design patterns for PRISM.",
    "prism-algorithm-selector": "Problem to algorithm mapping. Decision trees for algorithm selection.",
    "prism-dependency-graph": "Module dependency management. Topological sorting and cycle detection.",
    "prism-large-file-writer": "Chunked write patterns for large files. Prevents truncation.",
    "prism-tool-selector": "Tool selection decision trees. MCP vs filesystem vs embedded.",
    "prism-unit-converter": "Unit conversion utilities. SI, imperial, and custom units.",
    "prism-api-contracts": "Complete API interface definitions. 500+ gateway routes.",
    "prism-expert-master": "Unified AI expert team reference. Consolidates 10 domain experts.",
    "prism-expert-master-machinist": "40-year master machinist expertise. Shop floor troubleshooting.",
    "prism-expert-cam-programmer": "CAM programming expert. Toolpath strategy and optimization.",
    "prism-expert-cad-expert": "CAD feature recognition expert. Geometry analysis.",
    "prism-expert-materials-scientist": "Metallurgy and material selection expert.",
    "prism-expert-post-processor": "G-code and controller expert. Post processor development.",
    "prism-expert-mechanical-engineer": "Stress, deflection, and mechanical analysis expert.",
    "prism-expert-quality-control": "SPC and inspection expert. Quality metrics and control charts.",
    "prism-expert-quality-manager": "Process management and quality systems expert.",
    "prism-expert-thermodynamics": "Heat transfer and thermal analysis expert.",
    "prism-expert-mathematics": "Numerical methods and mathematical modeling expert.",
    "prism-ai-ml-master": "Unified AI/ML reference. Algorithm selection and implementation.",
    "prism-ai-bayesian": "Bayesian and probabilistic methods for PRISM Manufacturing Intelligence.",
    "prism-ai-optimization": "Optimization algorithms. Gradient, evolutionary, swarm methods.",
    "prism-ai-reinforcement": "Reinforcement learning patterns. Q-learning, policy gradient.",
    "prism-ai-deep-learning": "Deep Learning architectures for PRISM. Neural Networks, LSTM, Transformers.",
    "prism-aiml-engine-patterns": "AI/ML engine implementation patterns for PRISM.",
    "prism-extraction-index": "Index of extractable components from monolith.",
    "prism-extraction-orchestrator": "Multi-agent extraction coordination.",
    "prism-extractor": "Core extraction utilities and patterns.",
    "prism-module-builder": "Module construction from extracted code.",
    "prism-swarm-extraction": "Parallel extraction using agent swarms.",
    "prism-dev-utilities": "Unified development utilities. 8 tools consolidated.",
    "prism-development": "Development session protocols and workflows.",
    "prism-auditor": "Module auditing and inventory tools.",
    "prism-utilization": "Database and module utilization tracking.",
    "prism-consumer-mapper": "Consumer relationship mapping for databases.",
    "prism-hierarchy-manager": "4-layer database hierarchy management.",
    "prism-swarm-orchestrator": "Multi-agent swarm coordination patterns.",
    "prism-python-tools": "Python automation utilities for PRISM development.",
    "prism-knowledge-master": "Unified knowledge access. MIT/Stanford course integration.",
    "prism-knowledge-base": "Core knowledge base management.",
    "prism-physics-reference": "Quick physics reference tables.",
    "prism-physics-formulas": "Manufacturing physics formulas collection.",
    "prism-manufacturing-tables": "Complete manufacturing reference tables. Thread specs, tolerances.",
    "prism-derivation-helpers": "Formula derivation utilities and helpers.",
    "prism-all-skills": "Complete PRISM skill package with 99 skills, 64 agents, 22 formulas.",
    "prism-formal-definitions": "Formal mathematical definitions for PRISM concepts.",
    "prism-planning": "General planning utilities and templates.",
    "prism-post-processor-reference": "Post processor development reference.",
    "prism-product-calculators": "Product-specific calculator implementations.",
    "prism-wiring-templates": "Module wiring templates for 100% utilization.",
    "prism-category-defaults": "Default values by material/machine category.",
    "prism-deep-learning": "Deep learning mindset for continuous improvement.",
    "prism-skill-orchestrator": "Master integration skill for 37 PRISM skills and 56 API agents.",
}

def get_skill_name(filename):
    name = filename.replace("_SKILL.md", "")
    if "orchestrator_v6" in name:
        return "prism-skill-orchestrator"
    return name

def get_description(skill_name):
    return DESCRIPTIONS.get(skill_name, f"PRISM Manufacturing Intelligence skill for {skill_name.replace('prism-', '').replace('-', ' ')}.")

def fix_yaml_format(filepath):
    """Remove ALL YAML blocks and create single clean one at start"""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    filename = os.path.basename(filepath)
    skill_name = get_skill_name(filename)
    description = get_description(skill_name)
    
    # Remove ALL YAML frontmatter blocks (---\n...\n---)
    # Keep removing until none left
    while True:
        match = re.search(r'---\s*\n.*?\n---\s*\n?', content, flags=re.DOTALL)
        if match:
            content = content[:match.start()] + content[match.end():]
        else:
            break
    
    # Clean up leading whitespace and comment headers
    lines = content.split('\n')
    content_start = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Skip empty lines, comment lines starting with #, and box-drawing lines
        if stripped and not stripped.startswith('#') and '═' not in stripped and '─' not in stripped:
            content_start = i
            break
    
    main_content = '\n'.join(lines[content_start:]).strip()
    
    # If we stripped too much, use original cleaned content
    if not main_content or len(main_content) < 100:
        main_content = content.strip()
    
    # Build new file with single YAML block at start
    new_content = f"""---
name: {skill_name}
description: |
  {description}
---

{main_content}
"""
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

def main():
    print("=" * 60)
    print("REMOVING DUPLICATE YAML - FIXING ALL FILES")
    print("=" * 60)
    
    count = 0
    for filename in sorted(os.listdir(UPLOAD_DIR)):
        if filename.endswith('.md'):
            filepath = os.path.join(UPLOAD_DIR, filename)
            fix_yaml_format(filepath)
            count += 1
            print(f"  Fixed: {filename}")
    
    print("=" * 60)
    print(f"DONE: {count} files fixed")
    print("=" * 60)

if __name__ == "__main__":
    main()
