const PRISM_ANIMATION = {
    // Easing functions
    easing: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => t === 0 ? 0 : t === 1 ? 1 : 
            Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1,
        easeOutBounce: t => {
            if (t < 1/2.75) return 7.5625 * t * t;
            if (t < 2/2.75) return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
            if (t < 2.5/2.75) return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
            return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
        },
        spring: (t, tension = 0.5) => 1 - Math.cos(t * Math.PI * (0.5 + tension)) * Math.exp(-t * 6)
    },
    
    // Presets
    presets: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 }, duration: 300 },
        fadeOut: { from: { opacity: 1 }, to: { opacity: 0 }, duration: 300 },
        slideInLeft: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' }, duration: 300 },
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' }, duration: 300 },
        slideInUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' }, duration: 300 },
        slideInDown: { from: { transform: 'translateY(-100%)' }, to: { transform: 'translateY(0)' }, duration: 300 },
        scaleIn: { from: { transform: 'scale(0.9)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 }, duration: 200 },
        scaleOut: { from: { transform: 'scale(1)', opacity: 1 }, to: { transform: 'scale(0.9)', opacity: 0 }, duration: 200 },
        shake: { keyframes: [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(0)' }
        ], duration: 400 },
        pulse: { keyframes: [
            { transform: 'scale(1)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' }
        ], duration: 300 }
    },
    
    // Animate element
    animate(element, preset, options = {}) {
        const config = typeof preset === 'string' ? this.presets[preset] : preset;
        const duration = options.duration || config.duration || 300;
        const easing = options.easing || 'easeOutCubic';
        
        return element.animate(
            config.keyframes || [config.from, config.to],
            { duration, easing: this.getEasingCSS(easing), fill: 'forwards', ...options }
        );
    },
    
    getEasingCSS(name) {
        const map = {
            linear: 'linear',
            easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
            easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
            easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
            easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
            easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
            spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        };
        return map[name] || name;
    },
    
    // Stagger animations
    stagger(elements, preset, delay = 50) {
        return Array.from(elements).map((el, i) => 
            this.animate(el, preset, { delay: i * delay })
        );
    },
    
    // Check for reduced motion preference
    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
}