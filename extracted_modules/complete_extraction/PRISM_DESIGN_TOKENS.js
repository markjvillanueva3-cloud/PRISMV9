const PRISM_DESIGN_TOKENS = {
    colors: {
        // Primary palette
        primary: { 50: '#E3F2FD', 100: '#BBDEFB', 500: '#2196F3', 700: '#1976D2', 900: '#0D47A1' },
        // Semantic colors
        success: { light: '#81C784', main: '#4CAF50', dark: '#388E3C' },
        warning: { light: '#FFB74D', main: '#FF9800', dark: '#F57C00' },
        error: { light: '#E57373', main: '#F44336', dark: '#D32F2F' },
        info: { light: '#64B5F6', main: '#2196F3', dark: '#1976D2' },
        // Neutrals
        grey: { 50: '#FAFAFA', 100: '#F5F5F5', 200: '#EEEEEE', 300: '#E0E0E0', 
                400: '#BDBDBD', 500: '#9E9E9E', 600: '#757575', 700: '#616161',
                800: '#424242', 900: '#212121' },
        // Backgrounds
        background: { default: '#FFFFFF', paper: '#F5F5F5', elevated: '#FFFFFF' }
    },
    typography: {
        fontFamily: {
            primary: '"Inter", "Roboto", -apple-system, sans-serif',
            mono: '"JetBrains Mono", "Fira Code", monospace'
        },
        fontSize: {
            xs: '0.75rem',    // 12px
            sm: '0.875rem',   // 14px
            base: '1rem',     // 16px
            lg: '1.125rem',   // 18px
            xl: '1.25rem',    // 20px
            '2xl': '1.5rem',  // 24px
            '3xl': '1.875rem' // 30px
        },
        fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
        lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 }
    },
    spacing: {
        0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem',
        5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem',
        16: '4rem', 20: '5rem', 24: '6rem'
    },
    borderRadius: {
        none: '0', sm: '0.125rem', base: '0.25rem', md: '0.375rem',
        lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', full: '9999px'
    },
    shadows: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        base: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        md: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
        xl: '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)'
    },
    transitions: {
        duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
        easing: { 
            default: 'cubic-bezier(0.4, 0, 0.2, 1)',
            in: 'cubic-bezier(0.4, 0, 1, 1)',
            out: 'cubic-bezier(0, 0, 0.2, 1)',
            inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
    },
    zIndex: { dropdown: 1000, sticky: 1100, modal: 1300, popover: 1400, tooltip: 1500 },
    
    // Helper to get CSS variable string
    toCSS() {
        const vars = [];
        const flatten = (obj, prefix = '') => {
            Object.entries(obj).forEach(([key, value]) => {
                const varName = prefix ? `${prefix}-${key}` : key;
                if (typeof value === 'object') flatten(value, varName);
                else vars.push(`--${varName}: ${value};`);
            });
        };
        flatten(this.colors, 'color');
        flatten(this.spacing, 'space');
        flatten(this.borderRadius, 'radius');
        return `:root { ${vars.join(' ')} }`;
    }
}