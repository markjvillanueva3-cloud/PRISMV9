"""
MCP Dev Tools - Integration Test
Tests all 20 tools across 5 categories
"""
import sys
import time
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.tools.dev_tools import (
    # Background Tasks
    task_spawn, task_status, task_stream, task_kill, task_list,
    # Checkpoints
    checkpoint_create, checkpoint_list, checkpoint_diff, checkpoint_restore, checkpoint_delete,
    # Impact Analysis
    code_impact, impact_test_map, impact_dependency_graph,
    # Semantic Search
    semantic_index_build, semantic_search, semantic_similar,
    # Context Sync
    context_watch_start, context_watch_stop, context_changes, context_snapshot
)

def test_background_tasks():
    print("\n=== BACKGROUND TASKS ===")
    
    # Test task_spawn
    result = task_spawn("ping localhost -n 3", "Test ping")
    task_id = result["task_id"]
    print(f"1. task_spawn: {result['status']} (pid: {result['pid']})")
    
    # Wait for task
    time.sleep(4)
    
    # Test task_status
    status = task_status(task_id)
    print(f"2. task_status: {status['status']} (exit: {status['exit_code']})")
    
    # Test task_stream
    stream = task_stream(task_id, 0)
    print(f"3. task_stream: {stream['total_lines']} lines, completed={stream['completed']}")
    
    # Test task_list
    tasks = task_list(limit=5)
    print(f"4. task_list: {len(tasks['tasks'])} tasks")
    
    # Test task_kill (on a long-running task)
    long_task = task_spawn("ping localhost -n 100", "Long task")
    time.sleep(1)
    kill_result = task_kill(long_task["task_id"])
    print(f"5. task_kill: killed={kill_result['killed']}")
    
    return True

def test_checkpoints():
    print("\n=== CHECKPOINTS ===")
    
    # Test checkpoint_create
    result = checkpoint_create("Test checkpoint", ["state"])
    cp_id = result["checkpoint_id"]
    print(f"1. checkpoint_create: {result['files_captured']} files, {result['size_bytes']} bytes")
    
    # Test checkpoint_list
    cps = checkpoint_list(limit=5)
    print(f"2. checkpoint_list: {len(cps['checkpoints'])} checkpoints")
    
    # Test checkpoint_diff
    diff = checkpoint_diff(cp_id)
    print(f"3. checkpoint_diff: {diff['total_changes']} changes")
    
    # Test checkpoint_restore (dry run)
    restore = checkpoint_restore(cp_id, dry_run=True)
    print(f"4. checkpoint_restore (dry): {len(restore['restored_files'])} files would restore")
    
    # Test checkpoint_delete
    delete = checkpoint_delete(cp_id)
    print(f"5. checkpoint_delete: deleted={delete['deleted']}, freed={delete['freed_bytes']} bytes")
    
    return True

def test_impact_analysis():
    print("\n=== IMPACT ANALYSIS ===")
    
    # Test code_impact
    result = code_impact("src/tools/dev_tools.py")
    print(f"1. code_impact: risk={result['breaking_risk']}, importers={len(result['direct_importers'])}")
    
    # Test impact_test_map
    tests = impact_test_map("src/tools/dev_tools.py")
    print(f"2. impact_test_map: {len(tests['tests'])} tests, {tests['coverage_percent']}% coverage")
    
    # Test impact_dependency_graph
    graph = impact_dependency_graph("src/tools/dev_tools.py", depth=2)
    print(f"3. impact_dependency_graph: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges")
    
    return True

def test_semantic_search():
    print("\n=== SEMANTIC SEARCH ===")
    
    # Test semantic_index_build
    result = semantic_index_build(["src/tools"], force_rebuild=True)
    print(f"1. semantic_index_build: {result['files_indexed']} files, {result['chunks_created']} chunks")
    
    # Test semantic_search
    search = semantic_search("checkpoint rollback restore", top_k=3)
    print(f"2. semantic_search: {len(search['results'])} results")
    if search['results']:
        print(f"   Top result: {search['results'][0]['file']} (score: {search['results'][0]['score']})")
    
    # Test semantic_similar
    similar = semantic_similar("src/tools/dev_tools.py", 100, 150, top_k=3)
    print(f"3. semantic_similar: {len(similar['similar'])} similar chunks")
    
    return True

def test_context_sync():
    print("\n=== CONTEXT SYNC ===")
    
    # Test context_watch_start
    result = context_watch_start(["state"], ["create", "modify", "delete"])
    watcher_id = result["watcher_id"]
    print(f"1. context_watch_start: watching {result['watching']}")
    
    # Test context_snapshot
    snapshot = context_snapshot(watcher_id)
    print(f"2. context_snapshot: {snapshot['total_files']} files")
    
    # Test context_changes
    changes = context_changes(watcher_id)
    print(f"3. context_changes: {changes['files_affected']} affected, stale={changes['context_stale']}")
    
    # Test context_watch_stop
    stop = context_watch_stop(watcher_id)
    print(f"4. context_watch_stop: stopped={stop['stopped']}")
    
    return True

def main():
    print("=" * 60)
    print("MCP DEV TOOLS - INTEGRATION TEST")
    print("=" * 60)
    
    results = {}
    
    try:
        results["background_tasks"] = test_background_tasks()
    except Exception as e:
        print(f"ERROR: {e}")
        results["background_tasks"] = False
    
    try:
        results["checkpoints"] = test_checkpoints()
    except Exception as e:
        print(f"ERROR: {e}")
        results["checkpoints"] = False
    
    try:
        results["impact_analysis"] = test_impact_analysis()
    except Exception as e:
        print(f"ERROR: {e}")
        results["impact_analysis"] = False
    
    try:
        results["semantic_search"] = test_semantic_search()
    except Exception as e:
        print(f"ERROR: {e}")
        results["semantic_search"] = False
    
    try:
        results["context_sync"] = test_context_sync()
    except Exception as e:
        print(f"ERROR: {e}")
        results["context_sync"] = False
    
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, passed_test in results.items():
        status = "PASS" if passed_test else "FAIL"
        print(f"  {name}: {status}")
    
    print(f"\nTotal: {passed}/{total} passed")
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
