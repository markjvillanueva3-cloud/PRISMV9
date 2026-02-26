// PRISM_UI_ADAPTER - Lines 58909-59170 (262 lines) - UI adapter\n\nconst PRISM_UI_ADAPTER = {
    version: '1.0.0',

    // Component registry
    _components: {},

    // Pending DOM updates (batched for performance)
    _pendingUpdates: [],
    _updateScheduled: false,

    /**
     * Register a UI component
     */
    registerComponent(id, config) {
        this._components[id] = {
            ...config,
            mounted: false,
            element: null
        };
    },
    /**
     * Schedule a DOM update (batched via requestAnimationFrame)
     */
    scheduleUpdate(updateFn) {
        this._pendingUpdates.push(updateFn);

        if (!this._updateScheduled) {
            this._updateScheduled = true;
            requestAnimationFrame(() => this._processBatch());
        }
    },
    /**
     * Process all pending updates in one batch
     */
    _processBatch() {
        const updates = this._pendingUpdates;
        this._pendingUpdates = [];
        this._updateScheduled = false;

        for (const update of updates) {
            try {
                update();
            } catch (error) {
                console.error('[PRISM_UI_ADAPTER] Update error:', error);
            }
        }
    },
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PUBLIC API - Modules call these, adapter handles DOM
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    /**
     * Show a result/output to the user
     */
    showResult(data, options = {}) {
        const { type = 'info', title = 'Result', visualization = null, persistent = false } = options;

        this.scheduleUpdate(() => {
            const container = document.getElementById('prism-results-panel') ||
                             document.getElementById('output-panel') ||
                             document.body;

            const resultEl = document.createElement('div');
            resultEl.className = `prism-result prism-result--${type}`;
            resultEl.innerHTML = `
                <div class="prism-result__header">
                    <span class="prism-result__title">${title}</span>
                    <button class="prism-result__close">Ã—</button>
                </div>
                <div class="prism-result__content">${this._formatData(data)}</div>
            `;

            resultEl.querySelector('.prism-result__close').onclick = () => resultEl.remove();
            container.prepend(resultEl);

            if (!persistent) {
                setTimeout(() => resultEl.remove(), 30000);
            }
        });

        PRISM_EVENT_BUS.publish('ui:result:shown', { data, options }, { source: 'UI_ADAPTER' });
    },
    /**
     * Show an error message
     */
    showError(error, options = {}) {
        const { context = '', recoverable = true } = options;

        this.scheduleUpdate(() => {
            const container = document.getElementById('prism-notifications') ||
                             document.getElementById('error-panel') ||
                             document.body;

            const errorEl = document.createElement('div');
            errorEl.className = 'prism-error';
            errorEl.innerHTML = `
                <div class="prism-error__icon">âš ï¸</div>
                <div class="prism-error__content">
                    <div class="prism-error__message">${error.message || error}</div>
                    ${context ? `<div class="prism-error__context">${context}</div>` : ''}
                </div>
                <button class="prism-error__dismiss">Ã—</button>
            `;

            errorEl.querySelector('.prism-error__dismiss').onclick = () => errorEl.remove();
            container.appendChild(errorEl);

            setTimeout(() => errorEl.remove(), 10000);
        });

        PRISM_EVENT_BUS.publish('ui:error:shown', { error, options }, { source: 'UI_ADAPTER' });
    },
    /**
     * Update a progress indicator
     */
    updateProgress(operationId, percent, message = '') {
        this.scheduleUpdate(() => {
            let progressEl = document.getElementById(`prism-progress-${operationId}`);

            if (!progressEl) {
                const container = document.getElementById('prism-progress-container') ||
                                 document.getElementById('status-bar') ||
                                 document.body;

                progressEl = document.createElement('div');
                progressEl.id = `prism-progress-${operationId}`;
                progressEl.className = 'prism-progress';
                progressEl.innerHTML = `
                    <div class="prism-progress__label"></div>
                    <div class="prism-progress__bar">
                        <div class="prism-progress__fill"></div>
                    </div>
                `;
                container.appendChild(progressEl);
            }
            progressEl.querySelector('.prism-progress__label').textContent = message;
            progressEl.querySelector('.prism-progress__fill').style.width = `${percent}%`;

            if (percent >= 100) {
                setTimeout(() => progressEl.remove(), 2000);
            }
        });

        PRISM_EVENT_BUS.publish('ui:progress:updated', { operationId, percent, message }, { source: 'UI_ADAPTER' });
    },
    /**
     * Request user input via a dialog
     */
    requestInput(schema, callback) {
        return new Promise((resolve) => {
            this.scheduleUpdate(() => {
                const overlay = document.createElement('div');
                overlay.className = 'prism-dialog-overlay';
                overlay.innerHTML = `
                    <div class="prism-dialog">
                        <div class="prism-dialog__header">${schema.title || 'Input Required'}</div>
                        <form class="prism-dialog__form">
                            ${schema.fields.map(f => this._createFormField(f)).join('')}
                            <div class="prism-dialog__actions">
                                <button type="button" class="prism-btn--cancel">Cancel</button>
                                <button type="submit" class="prism-btn--submit">OK</button>
                            </div>
                        </form>
                    </div>
                `;

                const form = overlay.querySelector('form');
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const result = {};
                    for (const [key, value] of formData) {
                        result[key] = value;
                    }
                    overlay.remove();
                    resolve(result);
                    if (callback) callback(result);
                };
                overlay.querySelector('.prism-btn--cancel').onclick = () => {
                    overlay.remove();
                    resolve(null);
                    if (callback) callback(null);
                };
                document.body.appendChild(overlay);
            });
        });
    },
    /**
     * Update a specific panel/component
     */
    updatePanel(panelId, content) {
        this.scheduleUpdate(() => {
            const panel = document.getElementById(panelId);
            if (!panel) return;

            if (typeof content === 'string') {
                panel.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                panel.innerHTML = '';
                panel.appendChild(content);
            } else {
                panel.innerHTML = this._formatData(content);
            }
        });
    },
    /**
     * Refresh visualization (3D view, canvas, etc.)
     */
    refreshVisualization(type, data) {
        PRISM_EVENT_BUS.publish('ui:visualization:refresh', { type, data }, { source: 'UI_ADAPTER' });
    },
    // Helper methods
    _formatData(data) {
        if (typeof data === 'string') return data;
        if (data === null || data === undefined) return '';
        try {
            return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        } catch {
            return String(data);
        }
    },
    _createFormField(field) {
        const { name, type, label, defaultValue, options, min, max } = field;

        switch (type) {
            case 'select':
                return `
                    <label class="prism-field">
                        <span>${label}</span>
                        <select name="${name}">
                            ${(options || []).map(o =>
                                `<option value="${o.value || o}">${o.label || o}</option>`
                            ).join('')}
                        </select>
                    </label>
                `;
            case 'number':
                return `
                    <label class="prism-field">
                        <span>${label}</span>
                        <input type="number" name="${name}" value="${defaultValue || ''}"
                               ${min !== undefined ? `min="${min}"` : ''}
                               ${max !== undefined ? `max="${max}"` : ''}>
                    </label>
                `;
            case 'checkbox':
                return `
                    <label class="prism-field prism-field--checkbox">
                        <input type="checkbox" name="${name}" ${defaultValue ? 'checked' : ''}>
                        <span>${label}</span>
                    </label>
                `;
            default:
                return `
                    <label class="prism-field">
                        <span>${label}</span>
                        <input type="text" name="${name}" value="${defaultValue || ''}">
                    </label>
                `;
        }
    }
};
