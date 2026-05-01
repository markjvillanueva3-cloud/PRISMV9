# Fusion 360 API Server — Security Remediation Code Examples

This document provides working code examples to fix all identified security vulnerabilities.

---

## FIX 1: Remove or Sandbox `/execute` Endpoint

### Option A: Complete Removal (RECOMMENDED)

**File:** `fusion360_api_server.py`

**Change:**
```python
# REMOVE from dispatch dictionary (line 94):
dispatch = {
    # "/execute": self._execute_code,  # DELETED
    "/sketch": self._create_sketch,
    # ... rest
}

# REMOVE the method entirely (lines 197-210):
# def _execute_code(self, body):
#     ...
```

**Justification:** The `/execute` endpoint is fundamentally unsafe. Fusion 360 add-ins can achieve any operation through the native API without needing arbitrary code execution.

---

### Option B: AST-Based Sandbox (If Removal Not Possible)

**Requires:** Python 3.8+

**Installation:**
```bash
pip install RestrictedPython
```

**Replacement Code:**
```python
from RestrictedPython import compile_restricted
import ast

ALLOWED_IMPORTS = {
    "math": ["pi", "sqrt", "cos", "sin", "tan", "radians", "degrees"],
    "json": ["dumps", "loads"],
}

FORBIDDEN_BUILTINS = {
    "exec", "eval", "compile", "__import__", "open", "input", "print",
    "globals", "locals", "vars", "dir", "delattr", "setattr", "getattr",
    "type", "object", "classmethod", "staticmethod", "property",
}

def _execute_code_safe(self, body):
    """Execute code with RestrictedPython sandbox."""
    code = body.get("code", "")
    if not code:
        return {"error": "Missing 'code' field"}
    
    # Compile with restrictions
    byte_code = compile_restricted(code, '<string>', 'exec')
    
    # Check for compilation errors
    if byte_code.errors:
        return {
            "success": False,
            "error": "Code contains disallowed operations",
            "details": byte_code.errors
        }
    
    # Create restricted namespace
    safe_builtins = {
        k: v for k, v in __builtins__.items()
        if k not in FORBIDDEN_BUILTINS
    }
    
    local_ns = {
        "__builtins__": safe_builtins,
        "adsk": adsk,
        "app": adsk.core.Application.get(),
        "math": __import__("math"),
    }
    
    try:
        exec(byte_code.code, local_ns)
        result_val = local_ns.get("result", None)
        return {"success": True, "result": result_val}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "type": type(e).__name__
        }
```

**Limitations:** Still vulnerable to resource exhaustion (infinite loops), but blocks file access and system calls.

---

## FIX 2: Restrict CORS to Localhost Only

**File:** `fusion360_api_server.py`, line 124-129

**Original Code:**
```python
def _respond(self, data, status=200):
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    self.send_header("Access-Control-Allow-Origin", "*")  # INSECURE
    self.end_headers()
    self.wfile.write(json.dumps(data, default=str).encode("utf-8"))
```

**Fixed Code:**
```python
def _respond(self, data, status=200):
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    
    # Only allow localhost origins
    origin = self.headers.get("Origin", "")
    allowed_origins = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:18360",
        "http://127.0.0.1:18360",
    }
    
    if origin in allowed_origins:
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    
    self.end_headers()
    self.wfile.write(json.dumps(data, default=str).encode("utf-8"))
```

**Alternative (BETTER): Remove CORS Entirely**
```python
def _respond(self, data, status=200):
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    # No CORS headers — same-origin only (Fusion 360 add-in runs on localhost)
    self.end_headers()
    self.wfile.write(json.dumps(data, default=str).encode("utf-8"))
```

---

## FIX 3: Validate Export Path

**File:** `fusion360_api_server.py`, lines 636-672

**Original Code:**
```python
def _export_model(self, body):
    app = adsk.core.Application.get()
    design = self._get_design()
    
    fmt = body.get("format", "step").lower()
    export_path = body.get("path", "")
    if not export_path:
        return {"success": False, "error": "Missing 'path' field"}
    
    export_mgr = design.exportManager
    # ... executes export to ARBITRARY PATH
```

**Fixed Code:**
```python
import os
from pathlib import Path

# Define allowed export directories
ALLOWED_EXPORT_BASE = os.path.join(
    os.environ.get("APPDATA", os.path.expanduser("~")),
    "PRISM", "Exports"
)

def _validate_export_path(self, requested_path):
    """
    Validate that export path is within allowed directory.
    Prevents path traversal attacks.
    """
    # Get absolute path
    requested_abs = os.path.abspath(requested_path)
    allowed_abs = os.path.abspath(ALLOWED_EXPORT_BASE)
    
    # Ensure requested path is under allowed base
    try:
        Path(requested_abs).relative_to(allowed_abs)
    except ValueError:
        return None  # Path outside allowed directory
    
    # Additional check: no directory traversal
    if ".." in requested_abs:
        return None
    
    return requested_abs

def _export_model(self, body):
    app = adsk.core.Application.get()
    design = self._get_design()
    
    fmt = body.get("format", "step").lower()
    user_path = body.get("path", "")
    
    if not user_path:
        return {"success": False, "error": "Missing 'path' field"}
    
    # Validate and sanitize path
    export_path = self._validate_export_path(user_path)
    if not export_path:
        return {
            "success": False,
            "error": f"Export path must be under {ALLOWED_EXPORT_BASE}"
        }
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(export_path), exist_ok=True)
    
    export_mgr = design.exportManager
    
    try:
        if fmt in ("step", "stp"):
            options = export_mgr.createSTEPExportOptions(export_path)
            export_mgr.execute(options)
        elif fmt == "stl":
            options = export_mgr.createSTLExportOptions(design.rootComponent)
            options.filename = export_path
            mesh_refinement = body.get("refinement", "medium").lower()
            if mesh_refinement == "high":
                options.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
            elif mesh_refinement == "low":
                options.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementLow
            else:
                options.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementMedium
            export_mgr.execute(options)
        elif fmt == "f3d":
            options = export_mgr.createFusionArchiveExportOptions(export_path)
            export_mgr.execute(options)
        elif fmt == "iges":
            options = export_mgr.createIGESExportOptions(export_path)
            export_mgr.execute(options)
        else:
            return {"success": False, "error": f"Unsupported format: {fmt}"}
        
        return {"success": True, "format": fmt, "path": export_path}
    
    except Exception as e:
        return {"success": False, "error": str(e)}
```

---

## FIX 4: Add Content-Length Limit

**File:** `fusion360_api_server.py`, line 88-90

**Original Code:**
```python
def do_POST(self):
    content_length = int(self.headers.get("Content-Length", 0))
    body = json.loads(self.rfile.read(content_length)) if content_length > 0 else {}
```

**Fixed Code:**
```python
# Add at module level
MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_JSON_DEPTH = 10

def do_POST(self):
    content_length = int(self.headers.get("Content-Length", 0))
    
    # Enforce maximum body size
    if content_length > MAX_BODY_SIZE:
        self._respond(
            {"error": f"Request body too large (max {MAX_BODY_SIZE} bytes)"},
            413
        )
        return
    
    # Read body with size enforcement
    body = {}
    if content_length > 0:
        try:
            raw_body = self.rfile.read(content_length)
            body = json.loads(raw_body, parse_int=int, parse_float=float)
        except json.JSONDecodeError as e:
            self._respond({"error": f"Invalid JSON: {e}"}, 400)
            return
        except Exception as e:
            self._respond({"error": f"Failed to parse request: {e}"}, 400)
            return
    
    # Rest of handler continues...
```

---

## FIX 5: Cap Tool Import and Add Deduplication

**File:** `fusion360_api_server.py`, lines 783-881

**Original Code:**
```python
def _import_tools(self, body):
    tools = body.get("tools", [])  # NO LIMIT
    library_name = body.get("library_name", "PRISM")
    if not tools:
        return {"error": "Missing or empty 'tools' array", "success": False}
    # ... imports ALL tools without checking count
```

**Fixed Code:**
```python
MAX_TOOLS_PER_IMPORT = 1000

def _import_tools(self, body):
    tools = body.get("tools", [])
    library_name = body.get("library_name", "PRISM")
    
    # Validate inputs
    if not tools:
        return {"error": "Missing or empty 'tools' array", "success": False}
    
    # Enforce tool count limit
    if len(tools) > MAX_TOOLS_PER_IMPORT:
        return {
            "error": f"Too many tools (max {MAX_TOOLS_PER_IMPORT}, got {len(tools)})",
            "success": False
        }
    
    # Validate and deduplicate
    seen_pids = set()
    unique_tools = []
    skipped_count = 0
    
    for i, tool in enumerate(tools):
        # Validate tool is dict
        if not isinstance(tool, dict):
            return {
                "error": f"Tool at index {i} is not a dictionary",
                "success": False
            }
        
        # Check required fields
        required = ["type", "geometry", "description"]
        if not all(k in tool for k in required):
            return {
                "error": f"Tool at index {i} missing required fields: {required}",
                "success": False
            }
        
        # Deduplicate by product-id
        pid = tool.get("product-id", f"auto-{i}")
        if pid in seen_pids:
            skipped_count += 1
            continue
        
        seen_pids.add(pid)
        unique_tools.append(tool)
    
    # Try adsk.cam API first
    try:
        app = adsk.core.Application.get()
        cam_product = adsk.cam.CAM.cast(app.activeProduct)
        if cam_product is None:
            raise RuntimeError("CAM workspace not active")
        
        tool_libs = cam_product.toolLibraries
        lib_url = None
        local_libs = tool_libs.toolLibraryUrls
        
        for i in range(local_libs.count):
            url = local_libs.item(i)
            if url.toString().endswith(library_name) or url.leafName == library_name:
                lib_url = url
                break
        
        if lib_url is None:
            local_folder = tool_libs.urlByLocation(adsk.cam.LibraryLocations.LocalLibraryLocation)
            lib_url = local_folder.clone()
            lib_url.appendPath(library_name)
        
        imported = 0
        failed = 0
        for tool_data in unique_tools:
            try:
                tool_lib = tool_libs.toolLibraryAtUrl(lib_url)
                new_tool = adsk.cam.Tool.createFromJson(json.dumps(tool_data))
                tool_lib.add(new_tool)
                imported += 1
            except Exception as e:
                failed += 1
                continue
        
        return {
            "success": True,
            "imported": imported,
            "failed": failed,
            "total": len(tools),
            "deduplicated": skipped_count,
            "library": library_name,
            "method": "cam_api",
        }
    
    except Exception:
        # Fallback to file method with same validation
        lib_dir = self._get_tool_library_dir()
        file_path = os.path.join(lib_dir, f"{library_name}.tools")
        
        existing_tools = []
        if os.path.isfile(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)
                existing_tools = existing_data.get("data", [])
            except Exception:
                existing_tools = []
        
        existing_pids = {t.get("product-id") for t in existing_tools}
        
        for tool in unique_tools:
            pid = tool.get("product-id")
            if pid and pid in existing_pids:
                # Update existing
                for i, t in enumerate(existing_tools):
                    if t.get("product-id") == pid:
                        existing_tools[i] = tool
                        break
            else:
                existing_tools.append(tool)
        
        library_data = {"version": 2, "data": existing_tools}
        
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(library_data, f, indent=2)
        except Exception as e:
            return {"success": False, "error": f"Failed to write library: {e}"}
        
        return {
            "success": True,
            "imported": len(unique_tools),
            "deduplicated": skipped_count,
            "total": len(tools),
            "library": library_name,
            "path": file_path,
            "method": "file_fallback",
        }
```

---

## FIX 6: Sanitize Library Name in DELETE

**File:** `fusion360_api_server.py`, lines 1020-1059

**Original Code:**
```python
def _delete_tool_library(self, name):
    # ...
    lib_dir = self._get_tool_library_dir()
    file_path = os.path.join(lib_dir, f"{name}.tools")
    if os.path.isfile(file_path):
        os.remove(file_path)
```

**Fixed Code:**
```python
import re

def _sanitize_library_name(self, name):
    """
    Sanitize library name to prevent path traversal.
    Allow only alphanumeric, dash, underscore.
    """
    # Whitelist allowed characters
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', name)
    
    if not sanitized:
        return None
    
    # Limit length
    return sanitized[:50]

def _delete_tool_library(self, name):
    # Sanitize name
    safe_name = self._sanitize_library_name(name)
    if not safe_name:
        return {
            "success": False,
            "error": "Invalid library name (alphanumeric, dash, underscore only)"
        }
    
    lib_dir = self._get_tool_library_dir()
    file_path = os.path.join(lib_dir, f"{safe_name}.tools")
    
    # Final verification: path must be within lib_dir
    abs_file = os.path.abspath(file_path)
    abs_lib_dir = os.path.abspath(lib_dir)
    
    if not abs_file.startswith(abs_lib_dir):
        return {"success": False, "error": "Invalid path"}
    
    # Try adsk.cam API first
    try:
        app = adsk.core.Application.get()
        cam_product = adsk.cam.CAM.cast(app.activeProduct)
        if cam_product is None:
            raise RuntimeError("CAM workspace not active")
        
        tool_libs = cam_product.toolLibraries
        lib_urls = tool_libs.toolLibraryUrls
        
        for i in range(lib_urls.count):
            url = lib_urls.item(i)
            leaf = url.leafName if hasattr(url, "leafName") else url.toString().split("/")[-1]
            if leaf == safe_name:
                tool_libs.removeToolLibrary(url)
                return {
                    "success": True,
                    "deleted": safe_name,
                    "method": "cam_api",
                }
        
        raise RuntimeError("Library not found via CAM API")
    
    except Exception:
        # Fallback: delete .tools file
        if os.path.isfile(abs_file):
            try:
                os.remove(abs_file)
                return {
                    "success": True,
                    "deleted": safe_name,
                    "path": abs_file,
                    "method": "file_fallback",
                }
            except Exception as e:
                return {"success": False, "error": f"Failed to delete: {e}"}
        
        return {"success": False, "error": f"Tool library '{safe_name}' not found"}
```

---

## FIX 7: Implement Rate Limiting

**File:** `fusion360_api_server.py` (add at module level and in handler)

**Add Module-Level Code:**
```python
from collections import defaultdict
import time
import threading

class RateLimiter:
    """Token bucket rate limiter per IP address."""
    
    def __init__(self, max_requests=100, window_seconds=60, cleanup_interval=300):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.cleanup_interval = cleanup_interval
        self.requests = defaultdict(list)
        self.lock = threading.Lock()
        self.last_cleanup = time.time()
    
    def is_allowed(self, client_ip):
        with self.lock:
            now = time.time()
            
            # Cleanup old entries periodically
            if now - self.last_cleanup > self.cleanup_interval:
                self._cleanup(now)
                self.last_cleanup = now
            
            # Get requests for this IP
            client_requests = self.requests[client_ip]
            
            # Remove old requests outside window
            client_requests[:] = [
                req_time for req_time in client_requests
                if now - req_time < self.window_seconds
            ]
            
            # Check if limit exceeded
            if len(client_requests) >= self.max_requests:
                return False
            
            # Add new request
            client_requests.append(now)
            return True
    
    def _cleanup(self, now):
        """Remove IPs with no recent requests."""
        to_delete = []
        for ip, requests in self.requests.items():
            requests[:] = [
                req_time for req_time in requests
                if now - req_time < self.window_seconds
            ]
            if not requests:
                to_delete.append(ip)
        
        for ip in to_delete:
            del self.requests[ip]

# Global rate limiter instance
rate_limiter = RateLimiter(max_requests=100, window_seconds=60)
```

**Modify Handler:**
```python
class FusionAPIHandler(BaseHTTPRequestHandler):
    # ... existing code ...
    
    def do_GET(self):
        # Check rate limit
        client_ip = self.client_address[0]
        if not rate_limiter.is_allowed(client_ip):
            self._respond(
                {"error": "Rate limit exceeded (100 requests per 60 seconds)"},
                429
            )
            return
        
        # ... rest of do_GET handler
        parsed = urlparse(self.path)
        # ... existing code ...
    
    def do_POST(self):
        # Check rate limit
        client_ip = self.client_address[0]
        if not rate_limiter.is_allowed(client_ip):
            self._respond(
                {"error": "Rate limit exceeded (100 requests per 60 seconds)"},
                429
            )
            return
        
        # ... rest of do_POST handler
        content_length = int(self.headers.get("Content-Length", 0))
        # ... existing code ...
```

---

## FIX 8: Add Request Validation and Input Sanitization

**File:** `export_tool_library.py`, lines 223-241

**Original Code:**
```python
def partition_tools(tools):
    groups = {}
    for t in tools:
        mfr = (t.get("manufacturer") or "Generic").replace(" ", "")[:20]
        ttype = (t.get("type") or "end_mill").replace(" ", "")
        key = f"PRISM-{mfr}-{ttype}"
        groups.setdefault(key, []).append(t)
```

**Fixed Code:**
```python
import re

def sanitize_filename_component(name):
    """
    Remove Windows invalid filename characters.
    Allow: alphanumeric, dash, underscore, dot
    """
    # Remove invalid Windows chars: < > : " / \ | ? *
    sanitized = re.sub(r'[<>:"/\\|?*]', '', name)
    # Replace spaces with underscore
    sanitized = sanitized.replace(" ", "_")
    # Remove leading/trailing dots and spaces
    sanitized = sanitized.strip(". ")
    # Truncate
    return sanitized[:20]

def partition_tools(tools):
    """Group tools by manufacturer+type, split into ≤500-tool libraries."""
    groups = {}
    
    for t in tools:
        # Validate tool is dict
        if not isinstance(t, dict):
            continue
        
        # Sanitize names
        mfr = sanitize_filename_component(t.get("manufacturer") or "Generic")
        ttype = sanitize_filename_component(t.get("type") or "end_mill")
        
        # Ensure non-empty
        if not mfr:
            mfr = "Generic"
        if not ttype:
            ttype = "tool"
        
        key = f"PRISM-{mfr}-{ttype}"
        groups.setdefault(key, []).append(t)
    
    # Split large groups
    libraries = {}
    for key, group_tools in groups.items():
        if len(group_tools) <= MAX_TOOLS_PER_LIBRARY:
            libraries[key] = group_tools
        else:
            for i in range(0, len(group_tools), MAX_TOOLS_PER_LIBRARY):
                chunk = group_tools[i:i + MAX_TOOLS_PER_LIBRARY]
                part = i // MAX_TOOLS_PER_LIBRARY + 1
                libraries[f"{key}-Part{part}"] = chunk
    
    return libraries
```

---

## FIX 9: Hide Production Tracebacks

**File:** `fusion360_api_server.py`, lines 84, 120, 210

**Original Code:**
```python
except Exception as e:
    self._respond({"error": str(e), "traceback": traceback.format_exc()}, 500)
```

**Fixed Code:**
```python
import os
import logging

# Configure logging
logging.basicConfig(
    filename=os.path.join(os.path.expanduser("~"), ".prism", "fusion360.log"),
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add at module level
DEBUG_MODE = os.environ.get("FUSION360_DEBUG", "false").lower() == "true"

# In do_GET exception handler:
except Exception as e:
    # Log full traceback server-side
    logger.error(f"GET {self.path} failed: {traceback.format_exc()}")
    
    # Return limited info to client
    if DEBUG_MODE:
        error_response = {"error": str(e), "traceback": traceback.format_exc()}
    else:
        error_response = {"error": "Internal server error"}
    
    self._respond(error_response, 500)

# In do_POST exception handler:
except Exception as e:
    logger.error(f"POST {path} failed: {traceback.format_exc()}")
    
    if DEBUG_MODE:
        error_response = {"error": str(e), "traceback": traceback.format_exc()}
    else:
        error_response = {"error": "Internal server error"}
    
    self._respond(error_response, 500)
```

---

## FIX 10: Add API Token Authentication

**File:** `fusion360_api_server.py` (add before run function)

**Add at Module Level:**
```python
import secrets
import hashlib

# Generate or load API token from environment
API_TOKEN = os.environ.get("FUSION360_API_TOKEN")
if not API_TOKEN:
    API_TOKEN = secrets.token_hex(32)
    print(f"Generated API token (set FUSION360_API_TOKEN env var): {API_TOKEN}")
```

**Add Validation Method to Handler:**
```python
class FusionAPIHandler(BaseHTTPRequestHandler):
    
    def _verify_auth(self):
        """Verify Authorization header contains valid token."""
        auth_header = self.headers.get("Authorization", "")
        
        if not auth_header.startswith("Bearer "):
            return False
        
        token = auth_header[7:]  # Remove "Bearer "
        return token == API_TOKEN
    
    def do_GET(self):
        # Add auth check
        if not self._verify_auth():
            self._respond({"error": "Unauthorized"}, 401)
            return
        
        # ... rest of do_GET
    
    def do_POST(self):
        # Add auth check
        if not self._verify_auth():
            self._respond({"error": "Unauthorized"}, 401)
            return
        
        # ... rest of do_POST
```

**Client Usage:**
```bash
# Set environment variable before running
export FUSION360_API_TOKEN="your-secret-token-here"
python fusion360_api_server.py

# Or call with Authorization header:
curl -H "Authorization: Bearer your-secret-token-here" \
     http://localhost:18360/status
```

---

## Summary of Fixes

| Issue | Fix | Severity | Lines Changed |
|-------|-----|----------|---------------|
| /execute RCE | Remove or RestrictedPython | CRITICAL | -20 or +50 |
| CORS bypass | Restrict to localhost | CRITICAL | +8 |
| Path traversal | Validate export path | CRITICAL | +30 |
| No size limit | Content-Length check | HIGH | +15 |
| Unlimited imports | Cap at 1000 + dedupe | HIGH | +40 |
| DELETE traversal | Sanitize library names | HIGH | +25 |
| No rate limiting | Token bucket limiter | MEDIUM | +60 |
| Traceback exposure | Hide in production | LOW | +20 |
| No authentication | Add Bearer token auth | LOW | +20 |
| Filename injection | Sanitize with regex | MEDIUM | +15 |

**Total Lines Added:** ~283 (for comprehensive remediation)  
**Recommended Effort:** 4-6 hours for experienced developer

---

