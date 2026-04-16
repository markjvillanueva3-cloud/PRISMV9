"""
PRISM MCP Exceptions

Custom exception classes for the PRISM Python client.
"""


class PRISMError(Exception):
    """Base exception for PRISM errors."""

    def __init__(self, message: str, code: str = None, details: dict = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}

    def __str__(self) -> str:
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message


class EngineNotFoundError(PRISMError):
    """Raised when an engine is not found."""

    def __init__(self, engine_name: str, available: list = None):
        super().__init__(
            f"Engine '{engine_name}' not found",
            code="ENGINE_NOT_FOUND",
            details={"engine": engine_name, "available": available or []},
        )
        self.engine_name = engine_name
        self.available = available or []


class MethodNotFoundError(PRISMError):
    """Raised when a method is not found on an engine."""

    def __init__(self, engine_name: str, method_name: str, available: list = None):
        super().__init__(
            f"Method '{method_name}' not found on engine '{engine_name}'",
            code="METHOD_NOT_FOUND",
            details={
                "engine": engine_name,
                "method": method_name,
                "available": available or [],
            },
        )
        self.engine_name = engine_name
        self.method_name = method_name
        self.available = available or []


class ValidationError(PRISMError):
    """Raised when input validation fails."""

    def __init__(self, message: str, issues: list = None):
        super().__init__(
            message,
            code="VALIDATION_ERROR",
            details={"issues": issues or []},
        )
        self.issues = issues or []


class FormulaError(PRISMError):
    """Raised when formula calculation fails."""

    def __init__(self, formula: str, message: str):
        super().__init__(
            f"Formula '{formula}' calculation failed: {message}",
            code="FORMULA_ERROR",
            details={"formula": formula},
        )
        self.formula = formula


class APIError(PRISMError):
    """Raised when the API returns an error."""

    def __init__(self, status_code: int, message: str, response: dict = None):
        super().__init__(
            f"API error (HTTP {status_code}): {message}",
            code="API_ERROR",
            details={"status_code": status_code, "response": response or {}},
        )
        self.status_code = status_code
        self.response = response or {}


class ConnectionError(PRISMError):
    """Raised when connection to the API fails."""

    def __init__(self, url: str, original_error: Exception = None):
        super().__init__(
            f"Failed to connect to PRISM API at {url}",
            code="CONNECTION_ERROR",
            details={"url": url, "error": str(original_error) if original_error else None},
        )
        self.url = url
        self.original_error = original_error
