const PRISM_UI_SYSTEM_COMPLETE = {
    version: "2.1",

    // Modal system
    modal: {
        types: ["info", "warning", "error", "success", "confirm"],
        create: function(config) {
            const modal = document.createElement('div');
            modal.className = 'prism-modal-wrapper';
            modal.innerHTML = `<div class="prism-modal prism-modal-${config.type || 'info'}">
                <div class="prism-modal-header">${config.title}</div>
                <div class="prism-modal-body">${config.content}</div>
                <div class="prism-modal-footer">
                    <button class="prism-btn prism-btn-primary">OK</button>
                    ${config.showCancel ? '<button class="prism-btn">Cancel</button>' : ''}
                </div>
            </div>`;
            return modal;
        },
        show: function(config) { document.body.appendChild(this.create(config)); },
        alert: function(msg) { this.show({ title: 'Alert', content: msg, type: 'info' }); },
        confirm: function(msg, cb) { this.show({ title: 'Confirm', content: msg, type: 'confirm', showCancel: true }); }
    },
    // Theme system
    theme: {
        current: 'dark',
        themes: {
            dark: { bg: '#1a1a2e', surface: '#16213e', primary: '#4a90d9', text: '#eaeaea' },
            light: { bg: '#f5f5f5', surface: '#ffffff', primary: '#1976d2', text: '#212121' },
            contrast: { bg: '#000000', surface: '#1a1a1a', primary: '#00ff00', text: '#ffffff' }
        },
        apply: function(themeName) {
            this.current = themeName;
            const theme = this.themes[themeName];
            Object.keys(theme).forEach(k => document.documentElement.style.setProperty('--prism-' + k, theme[k]));
        }
    },
    // Button system
    button: {
        types: ['primary', 'secondary', 'danger', 'success', 'warning', 'outline'],
        sizes: ['small', 'medium', 'large'],
        create: function(text, type, size, onclick) {
            const button = document.createElement('button');
            button.className = `prism-btn prism-btn-${type || 'primary'} prism-btn-${size || 'medium'}`;
            button.textContent = text;
            if (onclick) button.onclick = onclick;
            return button;
        }
    },
    // Dropdown system
    dropdown: {
        create: function(options) {
            const dropdown = document.createElement('div');
            dropdown.className = 'prism-dropdown';
            dropdown.innerHTML = `<button class="prism-dropdown-toggle">${options.label} ▼</button>
                <ul class="prism-dropdown-menu">${options.items.map(i =>
                    `<li class="prism-dropdown-item" data-value="${i.value}">${i.label}</li>`
                ).join('')}</ul>`;
            dropdown.querySelector('.prism-dropdown-toggle').onclick = () =>
                dropdown.querySelector('.prism-dropdown-menu').classList.toggle('show');
            return dropdown;
        },
        select: function(id, items) { return this.create({ label: 'Select', items }); }
    },
    // Slider system
    slider: {
        create: function(config) {
            const slider = document.createElement('div');
            slider.className = 'prism-slider-wrapper';
            slider.innerHTML = `<label>${config.label}</label>
                <input type="range" class="prism-slider" min="${config.min}" max="${config.max}"
                       value="${config.value}" step="${config.step || 1}">
                <span class="prism-slider-value">${config.value}</span>`;
            const input = slider.querySelector('input');
            const display = slider.querySelector('.prism-slider-value');
            input.oninput = () => { display.textContent = input.value; if(config.onChange) config.onChange(input.value); };
            return slider;
        },
        range: function(min, max, value) { return this.create({ min, max, value, label: '' }); }
    },
    // Responsive utilities
    responsive: {
        breakpoints: { mobile: 480, tablet: 768, desktop: 1024, wide: 1440 },
        isMobile: () => window.innerWidth <= 480,
        isTablet: () => window.innerWidth <= 768 && window.innerWidth > 480,
        isDesktop: () => window.innerWidth > 768,
        onResize: function(callback) { window.addEventListener('resize', callback); }
    },
    // Form components
    form: {
        input: function(config) {
            const wrapper = document.createElement('div');
            wrapper.className = 'prism-input-group';
            wrapper.innerHTML = `<label>${config.label}</label>
                <input type="${config.type || 'text'}" name="${config.name}"
                       placeholder="${config.placeholder || ''}" value="${config.value || ''}">`;
            return wrapper;
        },
        textarea: function(config) {
            const wrapper = document.createElement('div');
            wrapper.className = 'prism-textarea-group';
            wrapper.innerHTML = `<label>${config.label}</label>
                <textarea name="${config.name}" rows="${config.rows || 4}">${config.value || ''}</textarea>`;
            return wrapper;
        }
    }
}