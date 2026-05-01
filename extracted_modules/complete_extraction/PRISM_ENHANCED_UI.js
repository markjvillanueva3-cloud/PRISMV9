const PRISM_ENHANCED_UI = {
    version: "2.0",

    // Modal dialog system
    modal: {
        create: function(options) {
            const overlay = document.createElement('div');
            overlay.className = 'prism-modal-overlay';
            overlay.innerHTML = `
                <div class="prism-modal">
                    <div class="prism-modal-header">
                        <h3>${options.title}</h3>
                        <button class="prism-modal-close">&times;</button>
                    </div>
                    <div class="prism-modal-body">${options.content}</div>
                    <div class="prism-modal-footer">
                        ${options.buttons.map(b =>
                            `<button class="prism-btn prism-btn-${b.type || 'default'}">${b.text}</button>`
                        ).join('')}
                    </div>
                </div>
            `;
            return overlay;
        },
        show: function(options) {
            const modal = this.create(options);
            document.body.appendChild(modal);

            modal.querySelector('.prism-modal-close').onclick = () => modal.remove();
            modal.querySelectorAll('.prism-modal-footer button').forEach((btn, i) => {
                btn.onclick = () => {
                    if (options.buttons[i].action) options.buttons[i].action();
                    modal.remove();
                };
            });

            return modal;
        }
    },
    // Progress bar
    progress: {
        create: function(container, options = {}) {
            const wrapper = document.createElement('div');
            wrapper.className = 'prism-progress-wrapper';
            wrapper.innerHTML = `
                <div class="prism-progress-label">${options.label || ''}</div>
                <div class="prism-progress-bar">
                    <div class="prism-progress-fill" style="width: 0%"></div>
                </div>
                <div class="prism-progress-text">0%</div>
            `;
            container.appendChild(wrapper);
            return {
                update: (percent) => {
                    wrapper.querySelector('.prism-progress-fill').style.width = `${percent}%`;
                    wrapper.querySelector('.prism-progress-text').textContent = `${Math.round(percent)}%`;
                },
                complete: () => {
                    wrapper.querySelector('.prism-progress-fill').style.width = '100%';
                    wrapper.querySelector('.prism-progress-fill').classList.add('complete');
                },
                remove: () => wrapper.remove()
            };
        }
    },
    // Dropdown menu
    dropdown: {
        create: function(options) {
            const wrapper = document.createElement('div');
            wrapper.className = 'prism-dropdown';
            wrapper.innerHTML = `
                <button class="prism-dropdown-toggle">${options.label} ▼</button>
                <ul class="prism-dropdown-menu">
                    ${options.items.map(item =>
                        `<li class="prism-dropdown-item" data-value="${item.value}">${item.label}</li>`
                    ).join('')}
                </ul>
            `;

            const toggle = wrapper.querySelector('.prism-dropdown-toggle');
            const menu = wrapper.querySelector('.prism-dropdown-menu');

            toggle.onclick = () => menu.classList.toggle('show');
            menu.querySelectorAll('li').forEach(li => {
                li.onclick = () => {
                    if (options.onSelect) options.onSelect(li.dataset.value);
                    menu.classList.remove('show');
                };
            });

            return wrapper;
        }
    },
    // Slider input
    slider: {
        create: function(options) {
            const wrapper = document.createElement('div');
            wrapper.className = 'prism-slider-wrapper';
            wrapper.innerHTML = `
                <label>${options.label}</label>
                <div class="prism-slider-container">
                    <input type="range" class="prism-slider"
                           min="${options.min}" max="${options.max}"
                           value="${options.value}" step="${options.step || 1}">
                    <span class="prism-slider-value">${options.value}${options.unit || ''}</span>
                </div>
            `;

            const slider = wrapper.querySelector('.prism-slider');
            const display = wrapper.querySelector('.prism-slider-value');

            slider.oninput = () => {
                display.textContent = slider.value + (options.unit || '');
                if (options.onChange) options.onChange(parseFloat(slider.value));
            };
            return wrapper;
        }
    },
    // Responsive table
    table: {
        create: function(data, options = {}) {
            const table = document.createElement('div');
            table.className = 'prism-responsive-table';

            let html = '<table><thead><tr>';
            for (const header of options.headers || Object.keys(data[0])) {
                html += `<th>${header}</th>`;
            }
            html += '</tr></thead><tbody>';

            for (const row of data) {
                html += '<tr>';
                for (const key of options.headers || Object.keys(row)) {
                    html += `<td data-label="${key}">${row[key]}</td>`;
                }
                html += '</tr>';
            }
            html += '</tbody></table>';

            table.innerHTML = html;
            return table;
        }
    },
    // Enhanced styles
    styles: `
        .prism-modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex; align-items: center; justify-content: center;
            z-index: 1000;
        }
        .prism-modal {
            background: var(--prism-surface, #16213e);
            border-radius: 8px; min-width: 400px; max-width: 90%;
        }
        .prism-modal-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px; border-bottom: 1px solid var(--prism-border, #333);
        }
        .prism-modal-close {
            background: none; border: none; font-size: 24px;
            cursor: pointer; color: var(--prism-text, #eee);
        }
        .prism-modal-body { padding: 20px; }
        .prism-modal-footer { padding: 16px; display: flex; gap: 10px; justify-content: flex-end; }

        .prism-btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
        .prism-btn-primary { background: var(--prism-primary, #4a90d9); color: white; }
        .prism-btn-danger { background: #e94560; color: white; }

        .prism-progress-wrapper { margin: 10px 0; }
        .prism-progress-bar { background: #333; height: 8px; border-radius: 4px; overflow: hidden; }
        .prism-progress-fill { background: var(--prism-primary, #4a90d9); height: 100%; transition: width 0.3s; }
        .prism-progress-fill.complete { background: #4caf50; }

        .prism-dropdown { position: relative; display: inline-block; }
        .prism-dropdown-menu {
            display: none; position: absolute; background: var(--prism-surface, #16213e);
            border: 1px solid var(--prism-border, #333); border-radius: 4px;
            list-style: none; padding: 0; margin: 4px 0; min-width: 150px; z-index: 100;
        }
        .prism-dropdown-menu.show { display: block; }
        .prism-dropdown-item { padding: 8px 12px; cursor: pointer; }
        .prism-dropdown-item:hover { background: rgba(255,255,255,0.1); }

        .prism-slider-wrapper { margin: 10px 0; }
        .prism-slider-container { display: flex; align-items: center; gap: 10px; }
        .prism-slider { flex: 1; }

        .prism-responsive-table { overflow-x: auto; }
        .prism-responsive-table table { width: 100%; border-collapse: collapse; }

        @media (max-width: 768px) {
            .prism-modal { min-width: 90%; }
            .prism-responsive-table thead { display: none; }
            .prism-responsive-table tr { display: block; margin-bottom: 10px; }
            .prism-responsive-table td {
                display: flex; justify-content: space-between;
                padding: 8px; border-bottom: 1px solid #333;
            }
            .prism-responsive-table td::before { content: attr(data-label); font-weight: bold; }
        }
    `
}