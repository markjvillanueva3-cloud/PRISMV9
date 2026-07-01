r"""
autodesk_mcp_client.py — PRISM-side client for the Autodesk Fusion MCP server.

The Autodesk MCP add-in runs INSIDE Fusion's process and serves MCP over
HTTP at 127.0.0.1:8765 by default. This module is a small Python client
that the unified PRISM Fusion add-in's panel handlers can use to drive
Fusion via that endpoint, instead of the in-process adsk API.

Why we want both paths:

  * In-process adsk API (existing `_auto_fill_fusion_params`)
      Direct, fast, no network — but only works when the call originates
      from inside Fusion's Python interpreter (i.e. our own add-in).

  * Autodesk MCP HTTP API (this module)
      Works from ANY caller — Claude orchestrating across chats, headless
      CI test runs, the panel's "Apply to Fusion" button, the cross-CAM
      bridge talking from a non-Fusion CAM. Single MCP-protocol surface.

Exposed Python API:

    client = AutodeskFusionMCPClient()      # default endpoint
    client.is_available()                   # quick reachability probe
    client.list_tools()                     # MCP tools/list
    client.call_tool(name, arguments)       # MCP tools/call

The client is intentionally synchronous — Fusion's API is single-tenant
so adding async wouldn't increase throughput, and the panel handlers
are already running on Fusion's UI thread.
"""

import json
import os
import time
import urllib.error
import urllib.request


DEFAULT_URL = os.environ.get(
    "AUTODESK_FUSION_MCP_URL", "http://127.0.0.1:8765/mcp"
)
DEFAULT_TIMEOUT_S = 30.0
JSONRPC_VERSION = "2.0"
MCP_PROTOCOL_VERSION = "2025-03-26"


class AutodeskFusionMCPError(RuntimeError):
    """Raised when the Autodesk Fusion MCP add-in returns an error."""

    def __init__(self, message, code=None, data=None):
        super().__init__(message)
        self.code = code
        self.data = data


class AutodeskFusionMCPClient:
    """Lightweight JSON-RPC over HTTP client for Autodesk's Fusion MCP add-in."""

    def __init__(self, url=DEFAULT_URL, timeout_s=DEFAULT_TIMEOUT_S):
        self.url = url
        self.timeout_s = timeout_s
        self._next_id = 1
        self._initialized = False
        self._tool_cache = None

    # ── transport ────────────────────────────────────────────────

    def _post(self, payload):
        """Single JSON-RPC round trip. Raises on transport / RPC error."""
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-PRISM-Client": "fusion-addin",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
                raw = resp.read().decode("utf-8")
        except urllib.error.URLError as e:
            reason = getattr(e, "reason", str(e))
            raise AutodeskFusionMCPError(
                f"Cannot reach Autodesk Fusion MCP at {self.url}: {reason}. "
                "Is Fusion running with the MCP add-in enabled?"
            ) from e

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise AutodeskFusionMCPError(
                f"Autodesk Fusion MCP returned non-JSON: {raw[:200]}"
            ) from e

        if "error" in data:
            err = data["error"]
            raise AutodeskFusionMCPError(
                err.get("message", "Unknown MCP error"),
                code=err.get("code"),
                data=err.get("data"),
            )

        return data.get("result")

    def _rpc(self, method, params=None):
        """Build a JSON-RPC request envelope and send it."""
        rid = self._next_id
        self._next_id += 1
        return self._post({
            "jsonrpc": JSONRPC_VERSION,
            "id": rid,
            "method": method,
            "params": params or {},
        })

    # ── lifecycle ────────────────────────────────────────────────

    def initialize(self):
        """MCP initialize handshake. Idempotent — skips repeat calls."""
        if self._initialized:
            return True
        self._rpc("initialize", {
            "protocolVersion": MCP_PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": {"name": "prism-fusion-addin", "version": "1.0.0"},
        })
        # The MCP spec requires sending an initialized notification
        # after a successful initialize. We don't expect a response.
        self._post({
            "jsonrpc": JSONRPC_VERSION,
            "method": "notifications/initialized",
        })
        self._initialized = True
        return True

    def is_available(self, max_wait_s=2.0):
        """Quick probe — used by the panel to show a connected/disconnected dot.

        Returns True iff the endpoint accepts an MCP initialize within
        max_wait_s. Network errors -> False (NOT raised).
        """
        prev_timeout = self.timeout_s
        self.timeout_s = max_wait_s
        try:
            self.initialize()
            return True
        except AutodeskFusionMCPError:
            return False
        except Exception:
            return False
        finally:
            self.timeout_s = prev_timeout

    # ── tools ────────────────────────────────────────────────────

    def list_tools(self, force_refresh=False):
        """Return the list of tools Autodesk's MCP add-in exposes.

        Cached after first call — Fusion's tool surface doesn't change
        during a session. force_refresh=True bypasses the cache.
        """
        if self._tool_cache is not None and not force_refresh:
            return self._tool_cache
        self.initialize()
        result = self._rpc("tools/list")
        self._tool_cache = (result or {}).get("tools", []) or []
        return self._tool_cache

    def call_tool(self, name, arguments=None):
        """Invoke an MCP tool by name. arguments is a dict.

        Returns the tool's result content array (per MCP spec). Raises
        AutodeskFusionMCPError on RPC error or missing tool.
        """
        if not name:
            raise ValueError("tool name is required")
        self.initialize()
        result = self._rpc("tools/call", {
            "name": name,
            "arguments": arguments or {},
        })
        return result

    # ── high-level helpers used by the unified add-in panel ──────
    # These wrap specific tools that the Autodesk MCP add-in exposes.
    # If the add-in renames a tool (older versions used different names),
    # update only here — callers stay unchanged.

    def export_active_to_step(self, file_path):
        """Export the active design to a STEP file. Returns the path."""
        return self.call_tool("export_step", {"path": file_path})

    def get_active_document_info(self):
        """High-level info about the currently active Fusion document."""
        return self.call_tool("get_active_document", {})

    def create_setup(self, name, stock=None, wcs=None):
        """Create a new CAM Setup. `stock` and `wcs` are optional dicts."""
        args = {"name": name}
        if stock is not None:
            args["stock"] = stock
        if wcs is not None:
            args["wcs"] = wcs
        return self.call_tool("create_cam_setup", args)

    def post_active_program(self, post_path, output_path):
        """Run Fusion's post processor on the active CAM program.

        Args:
          post_path: Absolute path to the .cps file (e.g.
                     H:/PRISM/scripts/fusion360-post/PRISM-Master-Hurco-V11.cps).
          output_path: Where the .nc file should be written.
        """
        return self.call_tool("post_program", {
            "post_path": post_path,
            "output_path": output_path,
        })


# ── module-level convenience cache ───────────────────────────────
# Most callers want a single shared client; build one lazily so the
# import cost stays free for users who never touch Autodesk MCP.

_default_client = None


def get_default_client():
    """Return a process-wide singleton AutodeskFusionMCPClient."""
    global _default_client
    if _default_client is None:
        _default_client = AutodeskFusionMCPClient()
    return _default_client


def is_autodesk_mcp_available(max_wait_s=2.0):
    """Module-level shortcut for the panel status indicator."""
    return get_default_client().is_available(max_wait_s=max_wait_s)
