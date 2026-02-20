import sys, importlib
modules = ['template_optimizer', 'prompt_builder', 'queue_manager', 'skill_preloader', 'resource_accessor', 'clone_factory']
sys.path.insert(0, r'C:\PRISM\scripts\core')

for mod in modules:
    try:
        m = importlib.import_module(mod)
        print(f"  OK  {mod}")
    except Exception as e:
        print(f"  FAIL {mod}: {e}")
