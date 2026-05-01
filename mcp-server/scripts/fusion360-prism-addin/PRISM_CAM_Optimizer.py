"""
PRISM_CAM_Optimizer.py — Fusion 360 add-in entry shim.

Fusion 360 loads add-ins by importing `<FolderName>.py` from the deployed add-in
directory and calling its module-level `run(context)` and `stop(context)`
functions. Some Fusion versions reject re-exported (`from X import Y`) entry
points, so this shim defines `run` and `stop` locally and delegates.

Any failure during the delegated import or call is surfaced via a Fusion
messageBox so the user is never left with a silent toggle revert.
"""

import os
import sys
import traceback

# Ensure this directory is on sys.path so `import prism_addin` resolves
# to the implementation file in the same folder regardless of how Fusion
# launched the entry script.
_ADDIN_DIR = os.path.dirname(os.path.abspath(__file__))
if _ADDIN_DIR not in sys.path:
    sys.path.insert(0, _ADDIN_DIR)


def _show_error(title, exc_text):
    """Surface an exception via Fusion's UI so failures are visible."""
    try:
        import adsk.core
        app = adsk.core.Application.get()
        if app and app.userInterface:
            app.userInterface.messageBox(
                title + "\n\n" + exc_text,
                "PRISM CAM Optimizer",
            )
    except Exception:
        pass


def run(context):
    """Fusion 360 calls this on add-in startup."""
    try:
        import prism_addin
        return prism_addin.run(context)
    except Exception:
        _show_error("PRISM startup failed:", traceback.format_exc())


def stop(context):
    """Fusion 360 calls this on add-in shutdown."""
    try:
        import prism_addin
        return prism_addin.stop(context)
    except Exception:
        _show_error("PRISM shutdown failed:", traceback.format_exc())
