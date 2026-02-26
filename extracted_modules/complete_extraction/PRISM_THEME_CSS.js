const PRISM_THEME_CSS = {
    generate: function(theme) {
        return `
            :root {
                --prism-background: ${theme.background};
                --prism-surface: ${theme.surface};
                --prism-primary: ${theme.primary};
                --prism-secondary: ${theme.secondary};
                --prism-accent: ${theme.accent};
                --prism-text: ${theme.text};
                --prism-text-muted: ${theme.textMuted};
                --prism-border: ${theme.border};
            }
            body { background: var(--prism-background); color: var(--prism-text); }
            .prism-surface { background: var(--prism-surface); }
            .prism-primary { color: var(--prism-primary); }
            .prism-accent { color: var(--prism-accent); }
        `;
    },
    inject: function(themeName) {
        const theme = PRISM_THEME_MANAGER.themes[themeName];
        const css = this.generate(theme);
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }
}