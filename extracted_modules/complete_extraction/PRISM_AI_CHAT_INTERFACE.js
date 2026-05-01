const PRISM_AI_CHAT_INTERFACE = {

    conversations: new Map(),
    activeConversation: null,

    createConversation: function() {
        const id = `conv_${Date.now()}`;
        this.conversations.set(id, {
            id,
            messages: [],
            context: {},
            created: Date.now()
        });
        this.activeConversation = id;
        return id;
    },
    sendMessage: async function(message, conversationId = null) {
        const convId = conversationId || this.activeConversation || this.createConversation();
        const conversation = this.conversations.get(convId);

        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: Date.now()
        });

        // Try Claude first, fall back to local
        let response;
        if (PRISM_CLAUDE_API.isAvailable()) {
            const result = await PRISM_CLAUDE_API.query(message, conversation.context);
            response = result.success ?
                { text: result.response, source: 'claude' } :
                { text: result.fallback, source: 'local' };
        } else {
            response = {
                text: PRISM_CLAUDE_API._generateLocalResponse(message, conversation.context),
                source: 'local'
            };
        }
        conversation.messages.push({
            role: 'assistant',
            content: response.text,
            source: response.source,
            timestamp: Date.now()
        });

        return response;
    },
    setContext: function(context, conversationId = null) {
        const convId = conversationId || this.activeConversation;
        if (!convId) return;

        const conv = this.conversations.get(convId);
        if (conv) {
            conv.context = { ...conv.context, ...context };
        }
    },
    getHistory: function(conversationId = null) {
        const convId = conversationId || this.activeConversation;
        if (!convId) return [];

        const conv = this.conversations.get(convId);
        return conv ? conv.messages : [];
    },
    clearConversation: function(conversationId = null) {
        const convId = conversationId || this.activeConversation;
        if (convId) {
            this.conversations.delete(convId);
            if (this.activeConversation === convId) {
                this.activeConversation = null;
            }
        }
    }
}