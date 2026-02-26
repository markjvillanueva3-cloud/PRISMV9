const PRISM_UI_SYSTEM = {
    version: "2.0",

    // Theme management
    themes: {
        dark: {
            name: "Dark Mode",
            colors: {
                background: "#1a1a2e",
                surface: "#16213e",
                primary: "#4a90d9",
                secondary: "#0f3460",
                accent: "#e94560",
                text: "#eaeaea",
                textMuted: "#888888",
                border: "#333333",
                success: "#4caf50",
                warning: "#ff9800",
                error: "#f44336"
            }
        },
        light: {
            name: "Light Mode",
            colors: {
                background: "#f5f5f5",
                surface: "#ffffff",
                primary: "#1976d2",
                secondary: "#424242",
                accent: "#ff4081",
                text: "#212121",
                textMuted: "#757575",
                border: "#e0e0e0",
                success: "#4caf50",
                warning: "#ff9800",
                error: "#f44336"
            }
        }
    },
    // Responsive breakpoints
    breakpoints: {
        mobile: 480,
        tablet: 768,
        desktop: 1024,
        wide: 1440
    },
    // UI Components
    components: {
        // Tab navigation
        tabs: {
            create: function(tabDefs, container) {
                const tabBar = document.createElement('div');
                tabBar.className = 'prism-tab-bar';

                const tabContent = document.createElement('div');
                tabContent.className = 'prism-tab-content';

                tabDefs.forEach((tab, index) => {
                    const tabBtn = document.createElement('button');
                    tabBtn.className = 'prism-tab-btn' + (index === 0 ? ' active' : '');
                    tabBtn.textContent = tab.label;
                    tabBtn.onclick = () => this.switchTab(index, tabDefs, tabContent);
                    tabBar.appendChild(tabBtn);
                });

                container.appendChild(tabBar);
                container.appendChild(tabContent);
                this.switchTab(0, tabDefs, tabContent);
            },
            switchTab: function(index, tabDefs, contentContainer) {
                contentContainer.innerHTML = '';
                if (tabDefs[index].content) {
                    contentContainer.innerHTML = tabDefs[index].content;
                }
                if (tabDefs[index].onActivate) {
                    tabDefs[index].onActivate(contentContainer);
                }
            }
        },
        // Input forms
        forms: {
            createInput: function(config) {
                const wrapper = document.createElement('div');
                wrapper.className = 'prism-input-wrapper';

                const label = document.createElement('label');
                label.textContent = config.label;
                wrapper.appendChild(label);

                const input = document.createElement('input');
                input.type = config.type || 'text';
                input.name = config.name;
                input.value = config.defaultValue || '';
                input.placeholder = config.placeholder || '';

                if (config.min !== undefined) input.min = config.min;
                if (config.max !== undefined) input.max = config.max;
                if (config.step !== undefined) input.step = config.step;

                wrapper.appendChild(input);

                if (config.unit) {
                    const unit = document.createElement('span');
                    unit.className = 'prism-input-unit';
                    unit.textContent = config.unit;
                    wrapper.appendChild(unit);
                }
                return wrapper;
            },
            createSelect: function(config) {
                const wrapper = document.createElement('div');
                wrapper.className = 'prism-select-wrapper';

                const label = document.createElement('label');
                label.textContent = config.label;
                wrapper.appendChild(label);

                const select = document.createElement('select');
                select.name = config.name;

                config.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    if (opt.selected) option.selected = true;
                    select.appendChild(option);
                });

                wrapper.appendChild(select);
                return wrapper;
            }
        },
        // Results display
        results: {
            createCard: function(title, content, type = 'info') {
                const card = document.createElement('div');
                card.className = `prism-card prism-card-${type}`;

                const header = document.createElement('div');
                header.className = 'prism-card-header';
                header.textContent = title;
                card.appendChild(header);

                const body = document.createElement('div');
                body.className = 'prism-card-body';
                body.innerHTML = content;
                card.appendChild(body);

                return card;
            },
            createTable: function(headers, rows) {
                const table = document.createElement('table');
                table.className = 'prism-table';

                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                headers.forEach(h => {
                    const th = document.createElement('th');
                    th.textContent = h;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                rows.forEach(row => {
                    const tr = document.createElement('tr');
                    row.forEach(cell => {
                        const td = document.createElement('td');
                        td.textContent = cell;
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);

                return table;
            }
        },
        // Toast notifications
        toast: {
            show: function(message, type = 'info', duration = 3000) {
                const toast = document.createElement('div');
                toast.className = `prism-toast prism-toast-${type}`;
                toast.textContent = message;

                document.body.appendChild(toast);

                setTimeout(() => {
                    toast.classList.add('prism-toast-show');
                }, 10);

                setTimeout(() => {
                    toast.classList.remove('prism-toast-show');
                    setTimeout(() => toast.remove(), 300);
                }, duration);
            }
        },
        // Loading indicator
        loading: {
            show: function(container, message = 'Loading...') {
                const overlay = document.createElement('div');
                overlay.className = 'prism-loading-overlay';
                overlay.innerHTML = `
                    <div class="prism-spinner"></div>
                    <div class="prism-loading-text">${message}</div>
                `;
                container.appendChild(overlay);
                return overlay;
            },
            hide: function(overlay) {
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }
        }
    },
    // CSS Styles
    styles: `
        :root {
            --prism-bg: #1a1a2e;
            --prism-surface: #16213e;
            --prism-primary: #4a90d9;
            --prism-text: #eaeaea;
            --prism-border: #333333;
        }
        .prism-tab-bar {
            display: flex;
            gap: 4px;
            padding: 8px;
            background: var(--prism-surface);
            border-radius: 8px;
        }
        .prism-tab-btn {
            padding: 10px 20px;
            border: none;
            background: transparent;
            color: var(--prism-text);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
        }
        .prism-tab-btn:hover { background: rgba(255,255,255,0.1); }
        .prism-tab-btn.active { background: var(--prism-primary); }

        .prism-input-wrapper {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 12px;
        }
        .prism-input-wrapper input,
        .prism-select-wrapper select {
            padding: 8px 12px;
            border: 1px solid var(--prism-border);
            border-radius: 4px;
            background: var(--prism-surface);
            color: var(--prism-text);
        }
        .prism-card {
            background: var(--prism-surface);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 16px;
        }
        .prism-card-header {
            padding: 12px 16px;
            background: rgba(0,0,0,0.2);
            font-weight: bold;
        }
        .prism-card-body { padding: 16px; }

        .prism-table {
            width: 100%;
            border-collapse: collapse;
        }
        .prism-table th,
        .prism-table td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--prism-border);
            text-align: left;
        }
        .prism-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 4px;
            color: white;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s;
        }
        .prism-toast-show { transform: translateY(0); opacity: 1; }
        .prism-toast-info { background: #2196f3; }
        .prism-toast-success { background: #4caf50; }
        .prism-toast-warning { background: #ff9800; }
        .prism-toast-error { background: #f44336; }

        .prism-loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
        }
        .prism-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: var(--prism-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
            .prism-tab-bar { flex-wrap: wrap; }
            .prism-tab-btn { flex: 1 1 auto; min-width: 100px; }
        }
    `,

    // Initialize UI
    init: function() {
        // Inject styles
        const styleEl = document.createElement('style');
        styleEl.textContent = this.styles;
        document.head.appendChild(styleEl);

        // Apply theme
        this.applyTheme('dark');
    },
    applyTheme: function(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;

        const root = document.documentElement;
        for (const [key, value] of Object.entries(theme.colors)) {
            root.style.setProperty(`--prism-${key}`, value);
        }
    }
}