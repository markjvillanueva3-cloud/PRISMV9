const PRISM_SANITIZER = {
    // Escape HTML to prevent XSS
    escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    // Unescape HTML
    unescapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent;
    },
    
    // Sanitize numeric input
    sanitizeNumber(value, min = -Infinity, max = Infinity, fallback = 0) {
        const num = parseFloat(value);
        if (isNaN(num) || !isFinite(num)) return fallback;
        return Math.max(min, Math.min(max, num));
    },
    
    // Sanitize integer
    sanitizeInteger(value, min = -Infinity, max = Infinity, fallback = 0) {
        const num = parseInt(value, 10);
        if (isNaN(num)) return fallback;
        return Math.max(min, Math.min(max, num));
    },
    
    // Sanitize string input
    sanitizeString(str, maxLength = 1000) {
        if (typeof str !== 'string') return '';
        return str.slice(0, maxLength).trim();
    },
    
    // Sanitize ID (alphanumeric + underscore/hyphen only)
    sanitizeId(id) {
        if (!id) return '';
        return String(id).replace(/[^a-zA-Z0-9_-]/g, '');
    },
    
    // Sanitize filename
    sanitizeFilename(filename) {
        if (!filename) return '';
        return String(filename)
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\.\./g, '')
            .slice(0, 255);
    },
    
    // Sanitize file path
    sanitizePath(path) {
        if (!path) return '';
        return String(path)
            .replace(/\.\./g, '')  // No directory traversal
            .replace(/[<>:"|?*]/g, '');  // No invalid chars
    },
    
    // Validate and sanitize G-code
    sanitizeGCode(code) {
        if (!code) return '';
        
        // Remove potentially dangerous commands
        const dangerous = [
            'M98', 'M99',  // Subprogram calls
            'GOTO',        // Jump statements
            'POPEN', 'PCLOS',  // File operations
            'DPRNT',       // Print to file
            'BPRNT'        // Binary print
        ];
        
        let safe = code;
        dangerous.forEach(cmd => {
            const regex = new RegExp(cmd, 'gi');
            safe = safe.replace(regex, `; BLOCKED: ${cmd}`);
        });
        
        return safe;
    },
    
    // Validate email format
    isValidEmail(email) {
        if (typeof email !== 'string') return false;
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    },
    
    // Validate URL
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    // Strip all HTML tags
    stripHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/<[^>]*>/g, '');
    },
    
    selfTest() {
        const results = [];
        
        // Test HTML escape
        const escaped = this.escapeHTML('<script>alert("xss")</script>');
        results.push({
            test: 'HTML escape',
            passed: !escaped.includes('<script>'),
            message: `Escaped: ${escaped.slice(0, 30)}...`
        });
        
        // Test number sanitize
        const num = this.sanitizeNumber('abc', 0, 100, 50);
        results.push({
            test: 'Number sanitize fallback',
            passed: num === 50,
            message: `Result: ${num}`
        });
        
        // Test ID sanitize
        const id = this.sanitizeId('test<script>123');
        results.push({
            test: 'ID sanitize',
            passed: id === 'testscript123',
            message: `Result: ${id}`
        });
        
        // Test G-code sanitize
        const gcode = this.sanitizeGCode('G0 X1 Y2\nM98 P1000');
        results.push({
            test: 'G-code sanitize',
            passed: gcode.includes('BLOCKED'),
            message: 'Dangerous commands blocked'
        });
        
        return results;
    }
}