const PRISM_CSS = {
  version: '1.0.0',

  // Prefixed class name generator to avoid conflicts
  class(name) {
    return 'prism-' + name;
  },
  // Add styles dynamically
  addStyles(id, css) {
    let styleEl = document.getElementById('prism-style-' + id);

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'prism-style-' + id;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
    return styleEl;
  },
  // Remove dynamic styles
  removeStyles(id) {
    const styleEl = document.getElementById('prism-style-' + id);
    if (styleEl) {
      styleEl.remove();
      return true;
    }
    return false;
  },
  // Apply inline styles safely
  style(element, styles) {
    if (!element) return;

    for (const [prop, value] of Object.entries(styles)) {
      // Convert camelCase to kebab-case
      const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
      element.style.setProperty(cssProp, value);
    }
  },
  // Toggle classes
  toggleClass(element, className, force) {
    if (!element) return;
    return element.classList.toggle(this.class(className), force);
  },
  // Add scoped styles for a component
  scopedStyles(componentId, styles) {
    // Prefix all selectors with component ID
    const scopedCss = styles.replace(/([^{}]+)\{/g, (match, selectors) => {
      const scopedSelectors = selectors.split(',')
        .map(s => `#${componentId} ${s.trim()}`)
        .join(', ');
      return scopedSelectors + ' {';
    });

    return this.addStyles(componentId, scopedCss);
  }
}