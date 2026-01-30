"""
PRISM ORCHESTRATOR PATCH v1.0
=============================
Patches the orchestrator to use comprehensive agent system prompts.

This is CRITICAL - without system prompts, agents produce garbage data.

Usage:
    from orchestrator_patch import patch_orchestrator
    patch_orchestrator()
    
Or run directly:
    python orchestrator_patch.py
"""

import sys
import os
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

ORCHESTRATOR_PATH = Path(r"C:\PRISM\scripts\prism_unified_system_v6.py")


def get_patched_run_single_agent():
    """Returns the patched run_single_agent method code"""
    return '''
    def run_single_agent(self, agent_name: str, task: str) -> Dict:
        """
        Run a single agent on a task WITH COMPREHENSIVE SYSTEM PROMPT.
        
        CRITICAL: This version includes full context for the agent including:
        - PRISM mission and safety requirements
        - Data quality rules
        - Anti-placeholder instructions
        - Role-specific expertise
        """
        if agent_name not in AGENT_DEFINITIONS:
            return {"error": f"Unknown agent: {agent_name}"}
        
        agent = AGENT_DEFINITIONS[agent_name]
        tier = ModelTier[agent["tier"]]
        
        print(f"\\n[{agent_name}] ({agent['tier']}) - {agent['role']}")
        print(f"Task: {task[:80]}...")
        
        if not self.client:
            return {"error": "No API key configured"}
        
        # GET COMPREHENSIVE SYSTEM PROMPT
        try:
            from agents.agent_definitions import get_agent_system_prompt
            system_prompt = get_agent_system_prompt(agent_name)
        except ImportError:
            # Fallback to basic prompt if module not available
            system_prompt = f"""You are {agent['role']} for PRISM Manufacturing Intelligence.

CRITICAL RULES:
1. NO PLACEHOLDERS - Never use TBD, TODO, N/A, or fake data
2. All data must be real and validated
3. All values must be within physical ranges
4. Lives depend on accurate data

If you cannot provide real data, say so - do not use placeholders."""
        
        try:
            response = self.client.messages.create(
                model=tier.value,
                max_tokens=8192,  # Increased for comprehensive responses
                system=system_prompt,  # NOW INCLUDES SYSTEM PROMPT!
                messages=[{"role": "user", "content": task}]
            )
            
            result = response.content[0].text
            cost = (response.usage.input_tokens * MODEL_COSTS[tier]["input"] + 
                   response.usage.output_tokens * MODEL_COSTS[tier]["output"]) / 1_000_000
            
            self.total_cost += cost
            
            return {
                "agent": agent_name,
                "result": result,
                "cost": cost,
                "tokens": response.usage.input_tokens + response.usage.output_tokens,
                "has_system_prompt": True
            }
            
        except Exception as e:
            return {"error": str(e)}
'''


def patch_orchestrator():
    """Apply the patch to the orchestrator"""
    print("="*70)
    print("PRISM ORCHESTRATOR PATCH v1.0")
    print("="*70)
    
    # Read current orchestrator
    with open(ORCHESTRATOR_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Backup
    backup_path = ORCHESTRATOR_PATH.with_suffix('.py.backup_before_prompt_patch')
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n[1/3] Backup created: {backup_path}")
    
    # Find and replace the run_single_agent method
    # Look for the method signature and replace until the next method
    import re
    
    # Pattern to find the existing run_single_agent method
    pattern = r'(    def run_single_agent\(self, agent_name: str, task: str\) -> Dict:.*?)(    def run_swarm)'
    
    # Check if pattern exists
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print("[ERROR] Could not find run_single_agent method to patch")
        return False
    
    # Create the replacement
    new_method = get_patched_run_single_agent()
    replacement = new_method + "\n\n    def run_swarm"
    
    # Apply the patch
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Write patched content
    with open(ORCHESTRATOR_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("[2/3] Patched run_single_agent to use system prompts")
    
    # Verify the patch
    with open(ORCHESTRATOR_PATH, 'r', encoding='utf-8') as f:
        verify = f.read()
    
    if "from agents.agent_definitions import get_agent_system_prompt" in verify:
        print("[3/3] Verification: PATCH APPLIED SUCCESSFULLY")
        print("\n✓ Agents now receive comprehensive system prompts")
        print("✓ Data quality rules are enforced")
        print("✓ Anti-placeholder instructions included")
        return True
    else:
        print("[ERROR] Patch verification failed")
        return False


def verify_patch():
    """Verify the patch is applied"""
    with open(ORCHESTRATOR_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    checks = [
        ("System prompt import", "from agents.agent_definitions import get_agent_system_prompt"),
        ("System parameter", "system=system_prompt"),
        ("Increased max_tokens", "max_tokens=8192"),
        ("has_system_prompt flag", '"has_system_prompt": True'),
    ]
    
    print("\nPatch Verification:")
    all_passed = True
    for name, pattern in checks:
        if pattern in content:
            print(f"  ✓ {name}")
        else:
            print(f"  ✗ {name} - NOT FOUND")
            all_passed = False
    
    return all_passed


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--verify":
        verify_patch()
    else:
        success = patch_orchestrator()
        if success:
            verify_patch()
            print("\n" + "="*70)
            print("PATCH COMPLETE - Agents now have comprehensive system prompts")
            print("="*70)
