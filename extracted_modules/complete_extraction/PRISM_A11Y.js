const PRISM_A11Y = {
    // Focus management
    focus: {
        trapStack: [],
        
        trap(container) {
            const focusable = this.getFocusableElements(container);
            if (focusable.length === 0) return;
            
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            
            const handler = (e) => {
                if (e.key !== 'Tab') return;
                
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            };
            
            container.addEventListener('keydown', handler);
            this.trapStack.push({ container, handler });
            first.focus();
            
            return () => this.release(container);
        },
        
        release(container) {
            const index = this.trapStack.findIndex(t => t.container === container);
            if (index >= 0) {
                const { handler } = this.trapStack[index];
                container.removeEventListener('keydown', handler);
                this.trapStack.splice(index, 1);
            }
        },
        
        getFocusableElements(container) {
            const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
            return Array.from(container.querySelectorAll(selector))
                .filter(el => !el.disabled && el.offsetParent !== null);
        }
    },
    
    // Screen reader announcements
    announce(message, priority = 'polite') {
        let region = document.getElementById('prism-live-region');
        if (!region) {
            region = document.createElement('div');
            region.id = 'prism-live-region';
            region.setAttribute('aria-live', priority);
            region.setAttribute('aria-atomic', 'true');
            region.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
            document.body.appendChild(region);
        }
        region.setAttribute('aria-live', priority);
        region.textContent = '';
        setTimeout(() => { region.textContent = message; }, 100);
    },
    
    // Keyboard navigation helpers
    keyboard: {
        handleArrowNavigation(container, items, options = {}) {
            const { vertical = true, horizontal = false, loop = true } = options;
            
            container.addEventListener('keydown', (e) => {
                const currentIndex = items.indexOf(document.activeElement);
                if (currentIndex < 0) return;
                
                let nextIndex = currentIndex;
                
                if ((vertical && e.key === 'ArrowDown') || (horizontal && e.key === 'ArrowRight')) {
                    nextIndex = loop ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
                } else if ((vertical && e.key === 'ArrowUp') || (horizontal && e.key === 'ArrowLeft')) {
                    nextIndex = loop ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
                } else if (e.key === 'Home') {
                    nextIndex = 0;
                } else if (e.key === 'End') {
                    nextIndex = items.length - 1;
                } else {
                    return;
                }
                
                e.preventDefault();
                items[nextIndex].focus();
            });
        }
    },
    
    // Color contrast checker
    checkContrast(foreground, background) {
        const getLuminance = (hex) => {
            const rgb = parseInt(hex.slice(1), 16);
            const r = ((rgb >> 16) & 0xff) / 255;
            const g = ((rgb >> 8) & 0xff) / 255;
            const b = (rgb & 0xff) / 255;
            
            const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
        };
        
        const l1 = getLuminance(foreground);
        const l2 = getLuminance(background);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        
        return {
            ratio: ratio.toFixed(2),
            AA: ratio >= 4.5,
            AAA: ratio >= 7,
            AALarge: ratio >= 3
        };
    },
    
    // Skip link generator
    addSkipLink(targetId, text = 'Skip to main content') {
        const link = document.createElement('a');
        link.href = '#' + targetId;
        link.className = 'prism-skip-link';
        link.textContent = text;
        link.style.cssText = `
            position: absolute; left: -9999px; z-index: 9999;
            padding: 1rem; background: #000; color: #fff;
        `;
        link.addEventListener('focus', () => { link.style.left = '0'; });
        link.addEventListener('blur', () => { link.style.left = '-9999px'; });
        document.body.insertBefore(link, document.body.firstChild);
    }
}