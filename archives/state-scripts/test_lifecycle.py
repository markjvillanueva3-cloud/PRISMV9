import sys, traceback
sys.path.insert(0, r'C:\PRISM\scripts\core')
try:
    from session_lifecycle import get_session_lifecycle
    lc = get_session_lifecycle()
    result = lc.prism_session_start()
    import json
    print(json.dumps(result, default=str, indent=2))
except Exception as e:
    traceback.print_exc()
