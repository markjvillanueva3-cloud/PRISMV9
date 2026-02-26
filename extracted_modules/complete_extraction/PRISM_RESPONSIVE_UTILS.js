const PRISM_RESPONSIVE_UTILS = {
    breakpoints: PRISM_UI_SYSTEM_COMPLETE.responsive.breakpoints,
    check: function() {
        return {
            isMobile: PRISM_UI_SYSTEM_COMPLETE.responsive.isMobile(),
            isTablet: PRISM_UI_SYSTEM_COMPLETE.responsive.isTablet(),
            isDesktop: PRISM_UI_SYSTEM_COMPLETE.responsive.isDesktop()
        };
    }
}