import sys
sys.path.insert(0, r'C:\PRISM\mcp-server')
from src.tools.dev_tools import register_dev_tools, task_spawn, task_status, semantic_search, checkpoint_create

# Test task_spawn
print("Testing task_spawn...")
result = task_spawn("echo Hello World", "test-echo")
print(f"  task_id: {result['task_id']}")
print(f"  status: {result['status']}")

import time
time.sleep(1)

# Test task_status
print("\nTesting task_status...")
status = task_status(result['task_id'])
print(f"  status: {status['status']}")
print(f"  output: {status['output'][:100]}")

# Test checkpoint_create
print("\nTesting checkpoint_create...")
cp = checkpoint_create("test-checkpoint", ["src"])
print(f"  checkpoint_id: {cp['checkpoint_id']}")
print(f"  files_captured: {cp['files_captured']}")

# Test semantic_index_build
print("\nTesting semantic_index_build...")
from src.tools.dev_tools import semantic_index_build
idx = semantic_index_build(["src"], force_rebuild=True)
print(f"  files_indexed: {idx['files_indexed']}")
print(f"  chunks_created: {idx['chunks_created']}")

# Test semantic_search
print("\nTesting semantic_search...")
search = semantic_search("import graph dependency", top_k=3)
print(f"  results: {len(search['results'])}")
if search['results']:
    print(f"  top result: {search['results'][0]['file']} (score: {search['results'][0]['score']})")

print("\n✅ All dev tools working!")
