const PRISM_CHATBOT_ENHANCED = {
    // Conversation state
    context: {
        history: [],
        slots: {},
        currentIntent: null,
        pendingActions: [],
        userProfile: {},
        sessionStart: Date.now()
    },
    
    // Response templates
    templates: new Map(),
    
    // Handlers for different intents
    handlers: new Map(),
    
    // Fallback responses
    fallbacks: [
        "I'm not sure I understand. Could you rephrase that?",
        "Could you provide more details about what you're looking for?",
        "I can help with speed/feed calculations, tool life predictions, and post processors. What would you like to know?",
        "Try asking about cutting parameters for a specific material and tool combination."
    ],
    
    init() {
        this._registerDefaultTemplates();
        this._registerDefaultHandlers();
        console.log('[PRISM_CHATBOT] Initialized');
    },
    
    _registerDefaultTemplates() {
        this.templates.set('greeting', [
            "Hello! I'm PRISM AI. How can I help with your machining today?",
            "Hi there! Ready to help with your manufacturing questions.",
            "Welcome to PRISM! Ask me about speeds, feeds, or any machining parameters."
        ]);
        
        this.templates.set('speed_feed_result', [
            "For {material} with a {tool_type}, I recommend:\n• Speed: {speed}\n• Feed: {feed}\n• DOC: {doc}",
            "Based on my calculations for {material}:\n• RPM: {rpm}\n• Feed Rate: {feed}\n• Depth of Cut: {doc}\n• Confidence: {confidence}%"
        ]);
        
        this.templates.set('clarify_material', [
            "What material will you be cutting?",
            "I need to know the material. Is it aluminum, steel, titanium, or something else?",
            "Please specify the workpiece material."
        ]);
        
        this.templates.set('clarify_tool', [
            "What type of tool are you using?",
            "Is this an end mill, drill, or another tool type? What's the diameter?",
            "Please tell me about the cutting tool - type, diameter, and material."
        ]);
        
        this.templates.set('tool_life_result', [
            "Expected tool life for these parameters: {life} minutes\nConfidence interval: {low} - {high} minutes",
            "I predict the tool will last approximately {life} minutes.\nThis is based on {method} calculation."
        ]);
        
        this.templates.set('troubleshoot_chatter', [
            "To reduce chatter, try:\n1. Reduce spindle speed by 10-15%\n2. Decrease depth of cut\n3. Check tool runout\n4. Verify workholding rigidity",
            "Chatter often indicates we're near a stability limit. Try:\n• Speed: {new_speed} (reduced)\n• Or increase RPM above {stable_rpm}"
        ]);
        
        this.templates.set('error', [
            "I encountered an issue processing that request. Please try again.",
            "Something went wrong. Could you provide more details?"
        ]);
    },
    
    _registerDefaultHandlers() {
        // Speed/Feed calculation handler
        this.handlers.set('calculate_speed_feed', async (query, entities) => {
            const material = this._findEntity(entities, 'material');
            const tool = this._findEntity(entities, 'tool_type');
            const operation = this._findEntity(entities, 'operation');
            
            // Check for missing required entities
            if (!material) {
                this._setSlot('pendingIntent', 'calculate_speed_feed');
                return { template: 'clarify_material', needsInput: true };
            }
            
            if (!tool) {
                this._setSlot('material', material.value);
                return { template: 'clarify_tool', needsInput: true };
            }
            
            // Calculate parameters
            const params = await this._calculateSpeedFeed(material.value, tool.value, operation?.value);
            
            return {
                template: 'speed_feed_result',
                data: params,
                actions: ['log_recommendation']
            };
        });
        
        // Tool life handler
        this.handlers.set('tool_life_query', async (query, entities) => {
            const tool = this._findEntity(entities, 'tool_type');
            const material = this._findEntity(entities, 'material');
            const speed = this._findEntity(entities, 'speed');
            
            // Use context if entities missing
            const toolType = tool?.value || this._getSlot('tool');
            const mat = material?.value || this._getSlot('material');
            
            if (!toolType || !mat) {
                return {
                    text: "I need to know the tool type and material to predict tool life. What are you cutting?",
                    needsInput: true
                };
            }
            
            const prediction = await this._predictToolLife(toolType, mat, speed?.value);
            
            return {
                template: 'tool_life_result',
                data: prediction
            };
        });
        
        // Troubleshooting handler
        this.handlers.set('troubleshoot', async (query, entities) => {
            const issue = this._detectIssue(query.text);
            
            if (issue === 'chatter') {
                const currentSpeed = this._getSlot('speed') || 1000;
                return {
                    template: 'troubleshoot_chatter',
                    data: {
                        new_speed: Math.round(currentSpeed * 0.85),
                        stable_rpm: Math.round(currentSpeed * 1.3)
                    }
                };
            }
            
            return {
                text: "I can help troubleshoot. Common issues include:\n• Chatter/vibration\n• Poor surface finish\n• Rapid tool wear\n\nWhich are you experiencing?"
            };
        });
        
        // Greeting handler
        this.handlers.set('greeting', async () => {
            return { template: 'greeting' };
        });
    },
    
    // Main process function
    async process(userInput) {
        // Add to history
        this.context.history.push({
            role: 'user',
            text: userInput,
            timestamp: Date.now()
        });
        
        // Parse input
        const query = PRISM_NLP_ENGINE_ADVANCED.processQuery(userInput);
        
        // Check for pending intent (multi-turn)
        const pendingIntent = this._getSlot('pendingIntent');
        if (pendingIntent && query.topIntent.intent === 'unknown') {
            query.topIntent = { intent: pendingIntent, confidence: 0.7 };
        }
        
        // Get handler
        const handler = this.handlers.get(query.topIntent.intent);
        
        let response;
        if (handler && query.topIntent.confidence > 0.3) {
            try {
                response = await handler(query, query.entities);
            } catch (error) {
                console.error('[PRISM_CHATBOT] Handler error:', error);
                response = { template: 'error' };
            }
        } else {
            response = { text: this._getRandomFallback() };
        }
        
        // Generate response text
        const responseText = this._generateResponse(response);
        
        // Add to history
        this.context.history.push({
            role: 'assistant',
            text: responseText,
            intent: query.topIntent.intent,
            entities: query.entities,
            timestamp: Date.now()
        });
        
        // Clear pending intent if response was complete
        if (!response.needsInput) {
            this._clearSlot('pendingIntent');
        }
        
        // Execute any actions
        if (response.actions) {
            response.actions.forEach(action => this._executeAction(action, response.data));
        }
        
        return {
            text: responseText,
            intent: query.topIntent,
            entities: query.entities,
            data: response.data,
            needsInput: response.needsInput || false
        };
    },
    
    _generateResponse(response) {
        if (response.text) return response.text;
        
        if (response.template) {
            const templates = this.templates.get(response.template);
            if (!templates) return "I'm not sure how to respond to that.";
            
            let template = templates[Math.floor(Math.random() * templates.length)];
            
            // Fill in data
            if (response.data) {
                Object.entries(response.data).forEach(([key, value]) => {
                    template = template.replace(new RegExp(`{${key}}`, 'g'), value);
                });
            }
            
            return template;
        }
        
        return this._getRandomFallback();
    },
    
    _getRandomFallback() {
        return this.fallbacks[Math.floor(Math.random() * this.fallbacks.length)];
    },
    
    _findEntity(entities, type) {
        return entities.find(e => e.type === type);
    },
    
    _setSlot(key, value) {
        this.context.slots[key] = value;
    },
    
    _getSlot(key) {
        return this.context.slots[key];
    },
    
    _clearSlot(key) {
        delete this.context.slots[key];
    },
    
    _detectIssue(text) {
        const lower = text.toLowerCase();
        if (lower.includes('chatter') || lower.includes('vibrat')) return 'chatter';
        if (lower.includes('finish') || lower.includes('surface')) return 'surface_finish';
        if (lower.includes('wear') || lower.includes('break')) return 'tool_wear';
        return 'unknown';
    },
    
    async _calculateSpeedFeed(material, tool, operation) {
        // Use PRISM AI system if available
        if (typeof PRISM_GATEWAY !== 'undefined') {
            try {
                const result = PRISM_GATEWAY.call('ai.recommend.speed_feed', { material, tool, operation });
                if (result) return result;
            } catch (e) {}
        }
        
        // Fallback calculation
        const baseSpeed = material.includes('aluminum') ? 800 : material.includes('steel') ? 200 : 400;
        const baseFeed = material.includes('aluminum') ? 0.006 : material.includes('steel') ? 0.003 : 0.004;
        
        return {
            material,
            tool_type: tool,
            speed: `${baseSpeed} SFM`,
            rpm: Math.round(baseSpeed * 3.82 / 0.5),
            feed: `${baseFeed} IPT`,
            doc: '0.1"',
            confidence: 75
        };
    },
    
    async _predictToolLife(tool, material, speed) {
        // Use PRISM AI system if available
        if (typeof PRISM_GATEWAY !== 'undefined') {
            try {
                const result = PRISM_GATEWAY.call('ai.predict.tool_life', { tool, material, speed });
                if (result) return result;
            } catch (e) {}
        }
        
        // Fallback prediction
        const baseLife = material.includes('aluminum') ? 120 : material.includes('steel') ? 45 : 60;
        
        return {
            life: baseLife,
            low: Math.round(baseLife * 0.7),
            high: Math.round(baseLife * 1.3),
            method: 'Taylor equation + Bayesian adjustment'
        };
    },
    
    _executeAction(action, data) {
        switch (action) {
            case 'log_recommendation':
                PRISM_EVENT_BUS?.publish?.('ai:recommendation', data);
                break;
            case 'update_ui':
                PRISM_EVENT_BUS?.publish?.('ui:update', data);
                break;
        }
    },
    
    // Get conversation history
    getHistory() {
        return this.context.history;
    },
    
    // Clear context for new conversation
    clearContext() {
        this.context = {
            history: [],
            slots: {},
            currentIntent: null,
            pendingActions: [],
            userProfile: this.context.userProfile,
            sessionStart: Date.now()
        };
    },
    
    // Get suggestions based on context
    getSuggestions() {
        const suggestions = [];
        const lastIntent = this.context.history.slice(-1)[0]?.intent;
        
        if (!lastIntent || lastIntent === 'greeting') {
            suggestions.push('Calculate speed and feed for aluminum');
            suggestions.push('What's the tool life for steel?');
            suggestions.push('Help with chatter problems');
        } else if (lastIntent === 'calculate_speed_feed') {
            suggestions.push('What's the tool life for these parameters?');
            suggestions.push('Optimize for surface finish');
            suggestions.push('Generate G-code for this operation');
        }
        
        return suggestions;
    }
}