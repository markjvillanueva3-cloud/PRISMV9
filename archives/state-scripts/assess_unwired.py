import os
files = [f for f in os.listdir(r'C:\PRISM\scripts\core') if f.endswith('.py') and f != '__init__.py']
print(f"Total: {len(files)}")

wired = {
    'resume_detector.py', 'graceful_shutdown.py', 'next_session_prep.py', 'wip_capturer.py',
    'state_rollback.py', 'recovery_scorer.py', 'checkpoint_mgr.py', 'session_lifecycle.py',
    'phase0_hooks.py', 'pattern_detector.py', 'learning_store.py', 'lkg_tracker.py',
    'priority_scorer.py', 'error_extractor.py', 'attention_scorer.py', 'focus_optimizer.py',
    'relevance_filter.py', 'context_monitor.py', 'context_compressor.py', 'context_expander.py',
    'compaction_detector.py', 'gsd_sync_v2.py', 'gsd_sync.py'
}

unwired = sorted([f for f in files if f not in wired])
print(f"\nWired: {len(wired)}")
print(f"Unwired: {len(unwired)}")

# Get sizes
print("\n--- UNWIRED MODULES ---")
total_lines = 0
for f in unwired:
    path = os.path.join(r'C:\PRISM\scripts\core', f)
    lines = sum(1 for _ in open(path, encoding='utf-8', errors='ignore'))
    total_lines += lines
    print(f"  {lines:>4}L  {f}")
print(f"\nTotal unwired lines: {total_lines}")
