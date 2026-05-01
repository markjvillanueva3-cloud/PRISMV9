# Hook Integration Guide for Python Orchestrators
## How to update prism_unified_system_v5.py and prism_orchestrator_v2.py

---

## 1. Import the Hook Module

At the top of your Python script:

```python
import sys
sys.path.insert(0, 'C:/PRISM/scripts')
from prism_hooks import hooks, HookContext, HookResult
```

---

## 2. Initialize at Script Start

```python
def main():
    # Load context from CURRENT_STATE.json
    context = hooks.load_context()
    
    # Execute session start hook
    result = hooks.execute('session:preStart', {
        'state_loaded': True,
        'session_type': 'orchestrator'
    }, context)
    
    if result.blocked:
        print(f"BLOCKED: {result.abort_reason}")
        return
```

---

## 3. Wrap Agent Execution

Before/after each agent runs:

```python
def run_agent(agent_name, prompt, context):
    # Pre-execution hook
    pre_result = hooks.execute('agent:preExecute', {
        'agent': agent_name,
        'prompt': prompt,
        'tier': get_agent_tier(agent_name)
    }, context)
    
    if pre_result.blocked:
        return {'error': pre_result.abort_reason}
    
    # Run the actual agent
    response = call_api(agent_name, prompt)
    
    # Post-execution hook
    post_result = hooks.execute('agent:postExecute', {
        'agent': agent_name,
        'response': response,
        'tokens': response.get('usage', {})
    }, context)
    
    # Check for learnings
    if post_result.learnings:
        save_learnings(post_result.learnings)
    
    return response
```

---

## 4. Wrap Swarm Operations

```python
def run_swarm(swarm_type, agents, task, context):
    # Swarm start
    hooks.execute('swarm:preStart', {
        'swarm_type': swarm_type,
        'agent_count': len(agents),
        'task': task
    }, context)
    
    results = []
    for i, agent in enumerate(agents):
        # Progress hook
        hooks.execute('swarm:progress', {
            'current': i + 1,
            'total': len(agents),
            'percent': (i + 1) / len(agents)
        }, context)
        
        result = run_agent(agent, task, context)
        results.append(result)
    
    # Synthesize
    hooks.execute('swarm:synthesize', {
        'results': results,
        'count': len(results)
    }, context)
    
    # Complete
    hooks.execute('swarm:postComplete', {
        'swarm_type': swarm_type,
        'success': True,
        'results': results
    }, context)
    
    return results
```

---

## 5. Wrap Ralph Loop

```python
def run_ralph_loop(agent, prompt, max_iterations, context):
    hooks.execute('ralph:preStart', {
        'agent': agent,
        'max_iterations': max_iterations
    }, context)
    
    for i in range(max_iterations):
        hooks.execute('ralph:iterationStart', {
            'iteration': i + 1,
            'max': max_iterations
        }, context)
        
        response = run_agent(agent, prompt, context)
        
        # Check completion
        complete_result = hooks.execute('ralph:completionCheck', {
            'response': response,
            'iteration': i + 1
        }, context)
        
        hooks.execute('ralph:iterationComplete', {
            'iteration': i + 1,
            'complete': is_complete(response)
        }, context)
        
        if is_complete(response):
            hooks.execute('ralph:postComplete', {
                'iterations_used': i + 1,
                'result': response
            }, context)
            return response
    
    # Max iterations reached
    hooks.execute('ralph:exhausted', {
        'max_iterations': max_iterations
    }, context)
    return None
```

---

## 6. Task Lifecycle Hooks

```python
def execute_task(task_spec, context):
    # Pre-plan (requires MATHPLAN)
    pre_result = hooks.execute('task:prePlan', {
        'task': task_spec,
        'mathPlan': task_spec.get('mathPlan')
    }, context)
    
    if pre_result.blocked:
        print(f"MATHPLAN REQUIRED: {pre_result.abort_reason}")
        return
    
    # Validate MATHPLAN
    hooks.execute('task:mathPlanValidate', {
        'mathPlan': task_spec['mathPlan']
    }, context)
    
    # Start task
    hooks.execute('task:start', {
        'task_id': task_spec['id'],
        'mathPlan': task_spec['mathPlan']
    }, context)
    
    # ... execute work ...
    
    # Pre-complete (validates C(T) = 1.0)
    hooks.execute('task:preComplete', {
        'completeness': 1.0,
        'phase': 'completion'
    }, context)
    
    # Post-complete (extracts learnings)
    hooks.execute('task:postComplete', {
        'result': result,
        'phase': 'completion'
    }, context)
```

---

## 7. Register Custom Hooks

```python
from prism_hooks import hooks, HookPriority

def my_custom_validator(payload, context):
    if payload.get('risk') > 0.8:
        return HookResult(
            warnings=['High risk operation detected']
        )
    return HookResult()

# Register
hooks.register(
    'my-validator',
    'agent:preExecute',
    my_custom_validator,
    HookPriority.BUSINESS_RULES
)
```

---

## 8. Key Hook Points for Orchestrators

| Phase | Hook Point | Fires When |
|-------|-----------|------------|
| Session | `session:preStart` | Script starts |
| | `session:postStart` | After initialization |
| Task | `task:prePlan` | Before MATHPLAN validation |
| | `task:mathPlanValidate` | Validating MATHPLAN |
| | `task:start` | Task begins execution |
| | `task:checkpoint` | Progress checkpoint |
| | `task:preComplete` | Before marking complete |
| | `task:postComplete` | After completion |
| Agent | `agent:preExecute` | Before API call |
| | `agent:postExecute` | After API response |
| | `agent:error` | On error |
| Swarm | `swarm:preStart` | Swarm begins |
| | `swarm:progress` | Each agent completes |
| | `swarm:synthesize` | Results combined |
| | `swarm:postComplete` | Swarm ends |
| Ralph | `ralph:iterationStart` | Each iteration starts |
| | `ralph:completionCheck` | Checking if done |
| | `ralph:postComplete` | Loop finishes |

---

## 9. System Hooks (Auto-Enforced)

These fire automatically - you don't need to call them:

- **SYS-LAW1-SAFETY**: Blocks if S(x) < 0.70
- **SYS-LAW2-MICROSESSION**: Requires MATHPLAN
- **SYS-LAW3-COMPLETENESS**: Requires C(T) = 1.0
- **SYS-LAW4-REGRESSION**: Blocks data loss
- **SYS-LAW7-VERIFICATION**: Requires 95% confidence
- **SYS-LAW8-MATH-EVOLUTION**: Requires M(x) >= 0.60
- **SYS-CMD5-UNCERTAINTY**: Auto-injects uncertainty
- **SYS-BUFFER-ZONE**: Enforces microsession limits
- **SYS-PREDICTION-LOG**: Logs predictions
- **SYS-LEARNING-EXTRACT**: Extracts learnings

---

## 10. Full Example

```python
#!/usr/bin/env python3
"""Example orchestrator with hook integration"""

import sys
sys.path.insert(0, 'C:/PRISM/scripts')
from prism_hooks import hooks

def main():
    # Initialize
    context = hooks.load_context()
    print(f"Zone: {context.buffer_zone.value}")
    
    # Session start
    result = hooks.execute('session:preStart', {'state_loaded': True}, context)
    if result.blocked:
        print(f"BLOCKED: {result.abort_reason}")
        return
    
    # Task with MATHPLAN
    task = {
        'id': 'TASK-001',
        'name': 'Extract materials',
        'mathPlan': {
            'scope': 1540,
            'effort': 412,
            'uncertainty': 85
        }
    }
    
    # Pre-plan (validates MATHPLAN exists)
    result = hooks.execute('task:prePlan', task, context)
    if result.blocked:
        print(f"MATHPLAN REQUIRED: {result.abort_reason}")
        return
    
    print("Task approved - executing...")
    
    # ... do work ...
    
    # Complete
    hooks.execute('task:postComplete', {
        'result': 'success',
        'completeness': 1.0,
        'phase': 'completion'
    }, context)
    
    # Show stats
    print(f"Hook stats: {hooks.stats()}")

if __name__ == "__main__":
    main()
```

---

**Files:**
- `C:\PRISM\scripts\prism_hooks.py` - Hook integration module (635 lines)
- `C:\PRISM\src\core\hooks\` - TypeScript implementation (3,328 lines)
- `C:\PRISM\skills\prism-hook-system.md` - Complete reference
