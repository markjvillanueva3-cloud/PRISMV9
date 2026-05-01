const PRISM_FORMS = {
    validators: {
        required: (value) => value !== '' && value !== null && value !== undefined,
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        minLength: (min) => (value) => String(value).length >= min,
        maxLength: (max) => (value) => String(value).length <= max,
        min: (min) => (value) => Number(value) >= min,
        max: (max) => (value) => Number(value) <= max,
        pattern: (regex) => (value) => regex.test(value),
        numeric: (value) => !isNaN(parseFloat(value)) && isFinite(value),
        integer: (value) => Number.isInteger(Number(value)),
        positive: (value) => Number(value) > 0,
        url: (value) => { try { new URL(value); return true; } catch { return false; } },
        date: (value) => !isNaN(Date.parse(value)),
        custom: (fn) => fn
    },
    
    messages: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        minLength: (min) => `Minimum ${min} characters required`,
        maxLength: (max) => `Maximum ${max} characters allowed`,
        min: (min) => `Value must be at least ${min}`,
        max: (max) => `Value must be at most ${max}`,
        pattern: 'Invalid format',
        numeric: 'Please enter a number',
        integer: 'Please enter a whole number',
        positive: 'Value must be positive',
        url: 'Please enter a valid URL',
        date: 'Please enter a valid date'
    },
    
    validate(value, rules) {
        const errors = [];
        
        for (const [rule, param] of Object.entries(rules)) {
            if (!this.validators[rule]) continue;
            
            const validator = typeof param === 'boolean' ? 
                this.validators[rule] : 
                this.validators[rule](param);
            
            if (!validator(value)) {
                const message = typeof this.messages[rule] === 'function' ?
                    this.messages[rule](param) : this.messages[rule];
                errors.push(message);
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateForm(formElement, schema) {
        const formData = new FormData(formElement);
        const results = {};
        let isValid = true;
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = formData.get(field);
            const result = this.validate(value, rules);
            results[field] = result;
            if (!result.valid) isValid = false;
        }
        
        return { valid: isValid, fields: results };
    },
    
    showError(input, message) {
        const container = input.closest('.form-field') || input.parentElement;
        let errorEl = container.querySelector('.error-message');
        
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            errorEl.style.cssText = 'color: #f44336; font-size: 12px; margin-top: 4px;';
            container.appendChild(errorEl);
        }
        
        errorEl.textContent = message;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', errorEl.id || (errorEl.id = 'error-' + Math.random().toString(36).slice(2)));
    },
    
    clearError(input) {
        const container = input.closest('.form-field') || input.parentElement;
        const errorEl = container.querySelector('.error-message');
        if (errorEl) errorEl.remove();
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
    },
    
    // Real-time validation
    attachValidation(form, schema, options = {}) {
        const { validateOn = 'blur', showErrorsOn = 'blur' } = options;
        
        for (const [field, rules] of Object.entries(schema)) {
            const input = form.elements[field];
            if (!input) continue;
            
            input.addEventListener(validateOn, () => {
                const result = this.validate(input.value, rules);
                if (!result.valid && showErrorsOn === validateOn) {
                    this.showError(input, result.errors[0]);
                } else {
                    this.clearError(input);
                }
            });
        }
        
        form.addEventListener('submit', (e) => {
            const result = this.validateForm(form, schema);
            if (!result.valid) {
                e.preventDefault();
                for (const [field, fieldResult] of Object.entries(result.fields)) {
                    const input = form.elements[field];
                    if (!fieldResult.valid) {
                        this.showError(input, fieldResult.errors[0]);
                    }
                }
            }
        });
    }
}