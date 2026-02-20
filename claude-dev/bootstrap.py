# PRISM Session Bootstrap v2.0
# Auto-loads Claude Development Enhancement Package
# Run at session start: exec(open('C:/PRISM/claude-dev/bootstrap.py').read())

import sys
import json
from pathlib import Path
from datetime import datetime

# Add claude-dev to path
CLAUDE_DEV = Path("C:/PRISM/claude-dev")
sys.path.insert(0, str(CLAUDE_DEV))

def bootstrap_session():
    """Initialize session with all enhancement tools loaded."""
    
    print("=" * 60)
    print("🚀 PRISM Claude Development Enhancement - Session Bootstrap")
    print(f"   Timestamp: {datetime.now().isoformat()}")
    print("=" * 60)
    
    results = {}
    
    # 1. Load Cognitive Wiring
    try:
        from hooks.cognitive_wiring import CognitiveWiringEngine, fire as cog_fire
        cw = CognitiveWiringEngine()
        results['cognitive'] = f"✅ 7 hooks loaded"
        # Fire session start hooks
        cog_fire('BAYES-001', {'domain': 'development', 'session_start': True})
        cog_fire('RL-001', {'session_id': datetime.now().strftime('%Y%m%d_%H%M')})
    except Exception as e:
        results['cognitive'] = f"❌ {e}"
    
    # 2. Load Context Hooks (Manus 6 Laws)
    try:
        from hooks.context_hooks import ContextHooks
        ch = ContextHooks()
        results['context'] = f"✅ 6 Laws loaded"
    except Exception as e:
        results['context'] = f"❌ {e}"
    
    # 3. Load Auto-Orchestrator
    try:
        from orchestration.auto_orchestrator import AutoOrchestrator, orchestrate
        ao = AutoOrchestrator()
        results['orchestrator'] = f"✅ 9 task types, 297 tools mapped"
    except Exception as e:
        results['orchestrator'] = f"❌ {e}"
    
    # 4. Load Pressure Monitor
    try:
        from context.pressure_monitor import ContextPressureMonitor, check_pressure, status_bar
        pm = ContextPressureMonitor()
        results['pressure'] = f"✅ 5 zones active"
    except Exception as e:
        results['pressure'] = f"❌ {e}"
    
    # 5. Load Memory Manager
    try:
        from context.memory_manager import HierarchicalMemoryManager, store, retrieve
        mm = HierarchicalMemoryManager()
        results['memory'] = f"✅ 3-tier memory ready"
    except Exception as e:
        results['memory'] = f"❌ {e}"
    
    # 6. Load Swarm Templates
    try:
        swarm_dir = CLAUDE_DEV / "swarms"
        templates = list(swarm_dir.glob("*.json"))
        results['swarms'] = f"✅ {len(templates)} patterns available"
    except Exception as e:
        results['swarms'] = f"❌ {e}"
    
    # 7. Load Dev Hooks (NEW)
    try:
        from hooks.dev_hooks import DevHookManager, fire_dev_hook, dev_hook_status
        dhm = DevHookManager()
        # Fire session start hook (starts context watcher)
        fire_dev_hook('session_start')
        results['dev_hooks'] = f"✅ 3 dev hooks active"
    except Exception as e:
        results['dev_hooks'] = f"❌ {e}"
    
    # Print results
    print("\n📦 Components Loaded:")
    for component, status in results.items():
        print(f"   {component.capitalize()}: {status}")
    
    # Load current state
    try:
        state_file = Path("C:/PRISM/state/CURRENT_STATE.json")
        if state_file.exists():
            state = json.loads(state_file.read_text())
            print(f"\n📊 Session State:")
            print(f"   Version: {state.get('version', 'unknown')}")
            print(f"   Session: {state.get('session', 'unknown')}")
            print(f"   Phase: {state.get('roadmap', {}).get('currentPhase', 'unknown')}")
            if 'quickResume' in state:
                print(f"\n📝 Quick Resume:")
                print(f"   {state['quickResume']}")
    except Exception as e:
        print(f"\n⚠️ Could not load state: {e}")
    
    # Return loaded modules for use
    print("\n" + "=" * 60)
    print("✅ Bootstrap complete! Available functions:")
    print("   - orchestrate(task) → auto-select tools/agents")
    print("   - check_pressure() → current context pressure")
    print("   - status_bar() → visual pressure indicator")
    print("   - store(key, value) → save to memory")
    print("   - retrieve(key) → load from memory")
    print("   - cog_fire(hook, data) → fire cognitive hook")
    print("   - fire_dev_hook(event) → fire dev tool hook")
    print("   - dev_hook_status() → check dev hook status")
    print("\n📦 Dev Tools (20 MCP tools):")
    print("   - dev_task_* → background tasks")
    print("   - dev_checkpoint_* → snapshot/rollback")
    print("   - dev_code_impact → change analysis")
    print("   - dev_semantic_* → code search")
    print("   - dev_context_* → file watching")
    print("=" * 60)
    
    return {
        'cognitive_wiring': cw if 'cw' in dir() else None,
        'context_hooks': ch if 'ch' in dir() else None,
        'orchestrator': ao if 'ao' in dir() else None,
        'pressure_monitor': pm if 'pm' in dir() else None,
        'memory_manager': mm if 'mm' in dir() else None,
        'dev_hooks': dhm if 'dhm' in dir() else None
    }

# Auto-run on import
if __name__ == "__main__":
    session = bootstrap_session()
