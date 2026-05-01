// PRISM_ERROR_LOOKUP - Lines 11465-11553 (89 lines) - Error code lookup\n\nconst PRISM_ERROR_LOOKUP = {
    MESSAGES: {
        // Input validation errors
        1000: { message: 'Invalid input provided', action: 'Check input format and try again' },
        1001: { message: 'Required field missing', action: 'Provide all required parameters' },
        1002: { message: 'Value out of acceptable range', action: 'Adjust value to be within limits' },
        1003: { message: 'Invalid data type', action: 'Check parameter type (number, string, etc.)' },
        1004: { message: 'Invalid unit specified', action: 'Use supported units (mm, inch, etc.)' },
        1005: { message: 'Negative value not allowed', action: 'Provide a positive value' },
        1006: { message: 'Zero value not allowed', action: 'Provide a non-zero value' },
        
        // Calculation errors
        2000: { message: 'Division by zero attempted', action: 'Check denominator values' },
        2001: { message: 'Square root of negative number', action: 'Check input values' },
        2002: { message: 'Numerical overflow', action: 'Reduce input values' },
        2003: { message: 'Numerical underflow', action: 'Increase input values' },
        2004: { message: 'Iteration did not converge', action: 'Adjust tolerance or initial guess' },
        2005: { message: 'Singular matrix encountered', action: 'Check for degenerate geometry' },
        2006: { message: 'Numerical instability detected', action: 'Use more robust algorithm' },
        
        // Database errors
        3000: { message: 'Item not found in database', action: 'Verify ID or search criteria' },
        3001: { message: 'Duplicate key exists', action: 'Use a unique identifier' },
        3002: { message: 'Database unavailable', action: 'Retry or contact support' },
        3003: { message: 'Invalid reference', action: 'Check foreign key relationships' },
        3004: { message: 'Data corruption detected', action: 'Restore from backup' },
        
        // Machine/physics errors
        4000: { message: 'RPM exceeds machine maximum', action: 'Reduce spindle speed' },
        4001: { message: 'Feed rate exceeds machine maximum', action: 'Reduce feed rate' },
        4002: { message: 'Power requirement exceeds machine capacity', action: 'Reduce cutting parameters' },
        4003: { message: 'Torque exceeds spindle capacity', action: 'Reduce DOC or feed' },
        4004: { message: 'Chatter predicted at these parameters', action: 'Adjust RPM or reduce DOC' },
        4005: { message: 'Tool deflection exceeds tolerance', action: 'Reduce stickout or use larger tool' },
        4006: { message: 'Cutting temperature exceeds safe limit', action: 'Reduce speed or improve cooling' },
        
        // AI/ML errors
        5000: { message: 'Prediction confidence too low', action: 'Provide more data or use conservative values' },
        5001: { message: 'Insufficient training data', action: 'Collect more historical data' },
        5002: { message: 'Model not trained', action: 'Train model before using' },
        5003: { message: 'Prediction failed', action: 'Check input data quality' },
        5004: { message: 'Optimization did not find solution', action: 'Relax constraints or adjust parameters' },
        5005: { message: 'Learning algorithm did not converge', action: 'Adjust learning rate or iterations' },
        
        // System errors
        9000: { message: 'Internal system error', action: 'Contact support' },
        9001: { message: 'Operation timed out', action: 'Retry with simpler request' },
        9002: { message: 'Network error', action: 'Check connection and retry' },
        9003: { message: 'System resources exhausted', action: 'Reduce request size' },
        9999: { message: 'Feature not implemented', action: 'Feature coming soon' }
    },
    
    getMessage: function(code) {
        const errorInfo = this.MESSAGES[code];
        if (!errorInfo) {
            return { code, message: 'Unknown error', action: 'Contact support', severity: 'ERROR' };
        }
        
        let severity = 'ERROR';
        if (code >= 5000 && code < 6000) severity = 'WARNING'; // AI errors often recoverable
        if (code >= 1000 && code < 2000) severity = 'WARNING'; // Input errors fixable
        if (code >= 9000) severity = 'CRITICAL';
        
        return { code, ...errorInfo, severity };
    },
    
    getSeverityLevel: function(code) {
        if (code >= 9000) return PRISM_CONSTANTS.ERROR_CODES.SEVERITY_CRITICAL;
        if (code >= 4000 && code < 5000) return PRISM_CONSTANTS.ERROR_CODES.SEVERITY_ERROR;
        if (code >= 2000 && code < 3000) return PRISM_CONSTANTS.ERROR_CODES.SEVERITY_ERROR;
        if (code >= 5000 && code < 6000) return PRISM_CONSTANTS.ERROR_CODES.SEVERITY_WARNING;
        return PRISM_CONSTANTS.ERROR_CODES.SEVERITY_WARNING;
    },
    
    isRecoverable: function(code) {
        // Input and AI errors are generally recoverable
        return (code >= 1000 && code < 2000) || (code >= 5000 && code < 6000);
    },
    
    formatError: function(code, context = {}) {
        const info = this.getMessage(code);
        return {
            ...info,
            context,
            timestamp: new Date().toISOString(),
            formatted: `[${info.severity}] ${info.message} (Code: ${code}). Action: ${info.action}`
        };
    }
};
