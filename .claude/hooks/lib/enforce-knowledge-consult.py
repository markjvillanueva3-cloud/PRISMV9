#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Knowledge Consultation Gate
Fires BEFORE Write/Edit to src/engines/*.ts

Checks if tribal knowledge, playbook rules, and domain formulas
were consulted before writing engine code. Tracks consultation
state in H:/prism/state/knowledge-consult-tracker.json.

If no consultation happened for this engine's domain, WARNS
(first time) or BLOCKS (repeat offender).
"""
import json
import sys
import os
import re
from datetime import datetime

STATE_FILE = "H:/prism/state/knowledge-consult-tracker.json"

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"consultations": {}, "engine_writes": {}, "warnings_given": 0}

def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def detect_domain(file_path):
    """Detect the manufacturing domain from the engine filename."""
    name = os.path.basename(file_path).lower()
    domains = {
        "turning": ["turning", "lathe", "chuck", "tailstock", "steadyrest", "threading", "taper", "boring", "css"],
        "milling": ["milling", "pocket", "contour", "adaptive", "hsm", "trochoidal", "endmill"],
        "5axis": ["5axis", "fiveaxis", "multiaxis", "tcpm", "rtcp", "tilted", "swivel"],
        "millturn": ["millturn", "swiss", "livtool", "subspindle", "barfeed", "multichannel"],
        "grinding": ["grinding", "grind", "wheel", "dress", "honing", "burnish", "sparkout"],
        "edm": ["edm", "wire_edm", "sinker", "electrode", "dielectric", "spark"],
        "laser": ["laser", "pierce", "kerf", "beam", "nozzle"],
        "waterjet": ["waterjet", "abrasive", "garnet", "orifice"],
        "tooling": ["tool", "insert", "coating", "holder", "magazine", "crib", "inventory"],
        "physics": ["force", "kienzle", "taylor", "chatter", "stability", "thermal", "deflect", "wear"],
        "speed_feed": ["speed", "feed", "chipload", "engagement", "sfm", "ipm"],
        "strategy": ["strategy", "toolpath", "cam", "mastercam", "solidcam", "hypermill", "fusion"],
        "safety": ["safety", "collision", "veto", "escalation", "breakage"],
        "cost": ["cost", "quote", "roi", "oee", "capacity", "rate"],
        "quality": ["quality", "inspection", "cpk", "spc", "tolerance", "gdt"],
    }
    detected = []
    for domain, keywords in domains.items():
        for kw in keywords:
            if kw in name:
                detected.append(domain)
                break
    return detected if detected else ["general"]

def get_knowledge_sources(domains):
    """Map domains to specific knowledge sources that should be consulted."""
    source_map = {
        "turning": [
            "TribalKnowledgeEngine (query: turning tips)",
            "MachiningPlaybookEngine (query: turning rules + anti-patterns)",
            "src/data/solidcam-cam-tips.ts (iMachining turning tips)",
            "controller-knowledge-tips.ts (lathe controller specifics)",
            "Sandvik Turning catalog constants",
        ],
        "milling": [
            "TribalKnowledgeEngine (query: milling tips)",
            "MachiningPlaybookEngine (query: milling rules)",
            "src/data/mastercam-cam-tips.ts (Dynamic Motion tips)",
            "ToolpathStrategyRegistry (752 strategies)",
            "Manufacturer S/F data (Sandvik, Kennametal)",
        ],
        "5axis": [
            "TribalKnowledgeEngine (query: 5-axis tips)",
            "src/data/hypermill-cam-tips-ext.ts (MAXX/5X strategies)",
            "controller-knowledge-tips.ts (RTCP/TCPM specifics)",
            "MultiCamStrategyEngineExt (22 Mazatrol 5-axis mappings)",
        ],
        "millturn": [
            "TribalKnowledgeEngine (query: mill-turn + Swiss tips)",
            "controller-knowledge-tips.ts (Mazatrol UNIT format)",
            "MachiningPlaybookEngine (multi-process sequencing rules)",
        ],
        "grinding": [
            "TribalKnowledgeEngine (query: grinding tips)",
            "MachiningPlaybookEngine (grinding rules)",
            "Malkin grinding theory constants",
        ],
        "edm": [
            "TribalKnowledgeEngine (query: EDM tips)",
            "Sato EDM gap model constants",
            "Wire electrode specifications",
        ],
        "laser": [
            "TribalKnowledgeEngine (query: laser tips)",
            "Schulz thermal model constants",
            "Gas assist pressure tables",
        ],
        "waterjet": [
            "TribalKnowledgeEngine (query: waterjet tips)",
            "Zeng-Kim abrasive model constants",
            "Garnet mesh size selection data",
        ],
        "tooling": [
            "ToolCatalogEngine (95,608 tools)",
            "CoatingRegistry (coating properties by ISO group)",
            "ToolHolderDatabaseEngine (1,332 holders)",
            "InsertGradeSelectionEngine (ISO insert grades)",
        ],
        "physics": [
            "FormulaRegistry (499 formulas — find the RIGHT formula)",
            "src/physics/constants.ts (CANONICAL constants only)",
            "AlgorithmRegistry (50 algorithms — don't reinvent)",
            "Published data: Sandvik, Kennametal, Machining Data Handbook",
        ],
        "speed_feed": [
            "UltimateSpeedFeedEngine (31 physics models)",
            "src/data/manufacturer-speed-feed-data.ts (2,423 lines)",
            "src/data/guhring-iscar-speed-feed-data.ts",
            "MaterialRegistry (1,662 lines of material properties)",
            "FormulaRegistry (Kienzle, Taylor formulas)",
        ],
        "strategy": [
            "ToolpathStrategyRegistry (752 strategies)",
            "FeatureStrategyKnowledgeBaseEngine (203 rules)",
            "CrossCamRecommenderEngine (cross-CAM ranking)",
            "All 18 CAM system tip files",
        ],
        "safety": [
            "MachiningPlaybookEngine (296 rules — especially anti-patterns)",
            "GCodeSafetyAnalyzerEngine (24 rules × 6 controllers)",
            "TribalKnowledgeEngine (safety-related tips)",
        ],
        "cost": [
            "MachineRateDatabaseEngine (hourly rates)",
            "ToolCostPerPartEngine (amortization)",
            "MarketMaterialPricingEngine (material costs)",
        ],
        "quality": [
            "ProcessCapabilityPredictionEngine (Cpk models)",
            "ISO 4287/4288 surface roughness standards",
            "SPC methods: Cp, Cpk, control charts",
        ],
        "general": [
            "TribalKnowledgeEngine (query: related domain tips)",
            "MachiningPlaybookEngine (query: related rules)",
            "FormulaRegistry (query: related formulas)",
        ],
    }
    sources = []
    for d in domains:
        sources.extend(source_map.get(d, source_map["general"]))
    return list(dict.fromkeys(sources))  # deduplicate preserving order

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        # Can't parse input, allow
        print(json.dumps({"continue": True}))
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    # Only enforce on engine files
    if "src/engines/" not in file_path.replace("\\", "/"):
        print(json.dumps({"continue": True}))
        return
    if file_path.endswith(".test.ts"):
        print(json.dumps({"continue": True}))
        return
    if not file_path.endswith(".ts"):
        print(json.dumps({"continue": True}))
        return

    # Skip non-physics engines (course management, knowledge bases, etc.)
    NON_PHYSICS_ENGINES = {
        "CurriculumEngine.ts", "CourseBuilderEngine.ts", "CertificationTrackingEngine.ts",
        "ApprenticeEngine.ts", "ManufacturingKnowledgeGraphEngine.ts", "KnowledgeQueryEngine.ts",
        "CADDrawingKnowledgeEngine.ts", "TribalKnowledgeEngine.ts", "MachiningPlaybookEngine.ts",
        "FeatureStrategyKnowledgeBaseEngine.ts", "LessonRendererEngine.ts",
    }
    if os.path.basename(file_path) in NON_PHYSICS_ENGINES:
        print(json.dumps({"continue": True}))
        return

    # Detect if this is a NEW file (Write) vs editing existing (Edit)
    is_new_engine = (tool_name == "Write")
    is_small_edit = False
    if tool_name == "Edit":
        old_str = tool_input.get("old_string", "")
        new_str = tool_input.get("new_string", "")
        # Small edits (< 5 lines changed) are likely bug fixes — lighter enforcement
        old_lines = old_str.count("\n") + 1 if old_str else 0
        new_lines = new_str.count("\n") + 1 if new_str else 0
        is_small_edit = (max(old_lines, new_lines) < 5)

    state = load_state()
    domains = detect_domain(file_path)
    engine_name = os.path.basename(file_path)
    sources = get_knowledge_sources(domains)

    # Check if knowledge was consulted for this domain in this session
    session_key = datetime.now().strftime("%Y-%m-%d")
    consulted = state["consultations"].get(session_key, {})

    domain_consulted = any(consulted.get(d, False) for d in domains)

    if not domain_consulted:
        # Track warnings per engine
        if engine_name not in state["engine_writes"]:
            state["engine_writes"][engine_name] = 0
        state["engine_writes"][engine_name] += 1
        state["warnings_given"] += 1
        save_state(state)

        write_count = state["engine_writes"][engine_name]
        sources_text = "\\n  ".join(sources[:6])  # Top 6 sources
        domain_text = ", ".join(domains)

        # Small edits to existing engines = WARN only (bug fixes)
        # New engine creation = BLOCK after 1st warning
        # Repeated unconsulted writes = BLOCK
        should_block = (is_new_engine and write_count >= 2) or (not is_small_edit and write_count >= 3)

        msg = (
            f"KNOWLEDGE CONSULT {'BLOCKED' if should_block else 'REQUIRED'} for domain [{domain_text}] "
            f"before {'creating' if is_new_engine else 'editing'} {engine_name} "
            f"(unconsulted write #{write_count}). "
            f"Query these knowledge sources FIRST:\\n"
            f"  {sources_text}\\n"
            f"The tribal tips, playbook rules, and formulas contain decades of machining expertise "
            f"that should shape HOW you implement this engine's logic."
        )

        if should_block:
            print(json.dumps({
                "decision": "block",
                "reason": msg,
            }))
        else:
            result = {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "additionalContext": msg
                }
            }
            print(json.dumps(result))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
