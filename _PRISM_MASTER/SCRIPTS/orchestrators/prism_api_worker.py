"""
PRISM API Worker - Direct Anthropic API calls from Desktop App
Usage: python prism_api_worker.py [task_file]
"""

import anthropic
import json
import sys
import os
from datetime import datetime
from pathlib import Path

# Configuration
API_KEY = "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"
DEFAULT_MODEL = "claude-sonnet-4-20250514"  # Fast & capable
PRISM_ROOT = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")
RESULTS_DIR = PRISM_ROOT / "API_RESULTS"
TASKS_DIR = PRISM_ROOT / "_TASKS"

# Ensure directories exist
RESULTS_DIR.mkdir(exist_ok=True)
TASKS_DIR.mkdir(exist_ok=True)

def load_task(task_file: str) -> dict:
    """Load task from JSON file"""
    task_path = TASKS_DIR / task_file if not os.path.isabs(task_file) else Path(task_file)
    with open(task_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def run_task(task: dict) -> dict:
    """Execute task via Anthropic API"""
    client = anthropic.Anthropic(api_key=API_KEY)
    
    # Build messages
    messages = [{"role": "user", "content": task["prompt"]}]
    
    # Add any files as context
    if "files" in task:
        file_contents = []
        for file_path in task["files"]:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                file_contents.append(f"=== FILE: {file_path} ===\n{content}\n=== END FILE ===")
            except Exception as e:
                file_contents.append(f"=== FILE: {file_path} === ERROR: {e} ===")
        
        # Prepend file contents to prompt
        messages[0]["content"] = "\n\n".join(file_contents) + "\n\n" + task["prompt"]
    
    # System prompt
    system = task.get("system", "You are helping with PRISM Manufacturing Intelligence development. Follow all instructions precisely. Output clean, usable results.")
    
    # Make API call
    response = client.messages.create(
        model=task.get("model", DEFAULT_MODEL),
        max_tokens=task.get("max_tokens", 8192),
        system=system,
        messages=messages
    )
    
    return {
        "task": task.get("name", "unnamed"),
        "model": response.model,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "content": response.content[0].text,
        "timestamp": datetime.now().isoformat(),
        "stop_reason": response.stop_reason
    }

def save_result(result: dict, task_name: str):
    """Save result to file"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save JSON with metadata
    json_path = RESULTS_DIR / f"{task_name}_{timestamp}.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)
    
    # Save just the content as .txt for easy reading
    txt_path = RESULTS_DIR / f"{task_name}_{timestamp}.txt"
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(result["content"])
    
    return json_path, txt_path

def main():
    if len(sys.argv) < 2:
        # No task file - run quick test
        print("No task file provided. Running API test...")
        task = {
            "name": "api_test",
            "prompt": "What is 2+2? Reply with just the number.",
            "max_tokens": 100
        }
    else:
        task = load_task(sys.argv[1])
    
    print(f"Running task: {task.get('name', 'unnamed')}")
    print(f"Model: {task.get('model', DEFAULT_MODEL)}")
    
    try:
        result = run_task(task)
        json_path, txt_path = save_result(result, task.get("name", "task"))
        
        print(f"\n[SUCCESS]")
        print(f"Tokens: {result['input_tokens']} in / {result['output_tokens']} out")
        print(f"Results saved to:")
        print(f"  {json_path}")
        print(f"  {txt_path}")
        print(f"\n--- RESPONSE ---")
        # Safe print for Windows console
        response_text = result["content"][:2000]
        try:
            print(response_text)
        except UnicodeEncodeError:
            print(response_text.encode('ascii', 'replace').decode('ascii'))
        if len(result["content"]) > 2000:
            print(f"\n... ({len(result['content']) - 2000} more characters in file)")
        
    except Exception as e:
        print(f"\n[ERROR]: {e}")
        raise

if __name__ == "__main__":
    main()
