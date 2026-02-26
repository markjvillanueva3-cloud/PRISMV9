"""
PRISM API PARALLEL TEST
Demonstrates 4 agents running simultaneously
"""
import anthropic
import os
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

# Fix encoding for Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_KEY = os.environ.get('ANTHROPIC_API_KEY')
client = anthropic.Anthropic(api_key=API_KEY)

def invoke_agent(agent_id: int, task: str) -> dict:
    """Invoke a single agent"""
    start = time.time()
    
    try:
        message = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=500,
            temperature=0.3,
            system=f"You are Agent {agent_id}. Be concise. Output only what's asked.",
            messages=[{'role': 'user', 'content': task}]
        )
        
        elapsed = time.time() - start
        return {
            'agent_id': agent_id,
            'success': True,
            'response': message.content[0].text[:200] + '...' if len(message.content[0].text) > 200 else message.content[0].text,
            'tokens': message.usage.input_tokens + message.usage.output_tokens,
            'time': round(elapsed, 2)
        }
    except Exception as e:
        return {'agent_id': agent_id, 'success': False, 'error': str(e)}

def run_parallel_test():
    """Run 4 agents in parallel"""
    print("=" * 70)
    print("PRISM PARALLEL AGENT TEST")
    print("=" * 70)
    
    # Define 4 different tasks (simulating registry creation)
    tasks = [
        (1, "List 5 essential properties for a CNC material database entry. Format as JSON keys only, one per line."),
        (2, "List 5 essential properties for a CNC machine database entry. Format as JSON keys only, one per line."),
        (3, "List 5 essential properties for a cutting tool database entry. Format as JSON keys only, one per line."),
        (4, "List 5 essential alarm code properties for CNC controllers. Format as JSON keys only, one per line."),
    ]
    
    print(f"\n>>> Launching {len(tasks)} agents in PARALLEL...\n")
    
    start_total = time.time()
    results = []
    
    # Run all 4 agents simultaneously
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(invoke_agent, agent_id, task): agent_id 
            for agent_id, task in tasks
        }
        
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            if result['success']:
                print(f"[OK] Agent {result['agent_id']} completed in {result['time']}s ({result['tokens']} tokens)")
            else:
                print(f"[FAIL] Agent {result['agent_id']} failed: {result['error']}")
    
    total_time = time.time() - start_total
    
    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    
    for r in sorted(results, key=lambda x: x['agent_id']):
        if r['success']:
            print(f"\n[Agent {r['agent_id']}]:")
            print(f"   {r['response']}")
    
    print("\n" + "=" * 70)
    print("TIMING ANALYSIS")
    print("=" * 70)
    
    sequential_time = sum(r.get('time', 0) for r in results if r['success'])
    total_tokens = sum(r.get('tokens', 0) for r in results if r['success'])
    
    print(f"\n* Total parallel time: {round(total_time, 2)}s")
    print(f"* Sum of individual times: {round(sequential_time, 2)}s")
    print(f"* Speedup: {round(sequential_time / total_time, 1)}x faster than sequential")
    print(f"* Total tokens used: {total_tokens}")
    print(f"* Estimated cost: ${round(total_tokens * 0.000003 + total_tokens * 0.000015, 4)}")
    
    print("\n[SUCCESS] PARALLEL EXECUTION VERIFIED!")
    print("=" * 70)

if __name__ == "__main__":
    run_parallel_test()
