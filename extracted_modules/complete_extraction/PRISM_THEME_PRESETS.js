const PRISM_THEME_PRESETS = {
    manufacturing: "machinist",
    office: "light",
    workshop: "dark",
    presentation: "contrast",
    blueprint: "blue",

    applyPreset: function(preset) {
        const themeName = this[preset] || "dark";
        return PRISM_THEME_MANAGER.applyTheme(themeName);
    }
}