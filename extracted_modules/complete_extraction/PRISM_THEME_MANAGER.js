const PRISM_THEME_MANAGER = {
    version: "2.0",

    // All available themes
    themes: {
        dark: {
            name: "Dark Theme",
            background: "#1a1a2e",
            surface: "#16213e",
            primary: "#4a90d9",
            secondary: "#0f3460",
            accent: "#e94560",
            text: "#eaeaea",
            textMuted: "#888888",
            border: "#333333"
        },
        light: {
            name: "Light Theme",
            background: "#f5f5f5",
            surface: "#ffffff",
            primary: "#1976d2",
            secondary: "#424242",
            accent: "#ff4081",
            text: "#212121",
            textMuted: "#757575",
            border: "#e0e0e0"
        },
        contrast: {
            name: "High Contrast Theme",
            background: "#000000",
            surface: "#1a1a1a",
            primary: "#00ff00",
            secondary: "#ffff00",
            accent: "#ff0000",
            text: "#ffffff",
            textMuted: "#cccccc",
            border: "#ffffff"
        },
        blue: {
            name: "Blue Theme",
            background: "#0d1b2a",
            surface: "#1b263b",
            primary: "#415a77",
            secondary: "#778da9",
            accent: "#e0e1dd",
            text: "#e0e1dd",
            textMuted: "#778da9",
            border: "#415a77"
        },
        machinist: {
            name: "Machinist Theme",
            background: "#1c1c1c",
            surface: "#2d2d2d",
            primary: "#ff6b00",
            secondary: "#4a4a4a",
            accent: "#00ff88",
            text: "#f0f0f0",
            textMuted: "#888888",
            border: "#444444"
        }
    },
    // Current theme
    currentTheme: "dark",

    // Apply theme to document
    applyTheme: function(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return false;

        this.currentTheme = themeName;

        // Apply CSS variables
        const root = document.documentElement;
        Object.keys(theme).forEach(key => {
            if (key !== 'name') {
                root.style.setProperty('--prism-' + key, theme[key]);
            }
        });

        // Store preference
        localStorage.setItem('prism-theme', themeName);

        return true;
    },
    // Get current theme
    getTheme: function() {
        return this.themes[this.currentTheme];
    },
    // Theme switching
    switchTheme: function(themeName) {
        return this.applyTheme(themeName);
    },
    // Toggle between dark/light
    toggleTheme: function() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        return this.applyTheme(newTheme);
    },
    // Get all theme names
    getThemeNames: function() {
        return Object.keys(this.themes);
    },
    // Initialize from storage
    init: function() {
        const savedTheme = localStorage.getItem('prism-theme') || 'dark';
        this.applyTheme(savedTheme);
    }
}