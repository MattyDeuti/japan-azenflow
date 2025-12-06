// Chatbot Widget for AzenFlow Website - AI-Powered via n8n
(function() {
    'use strict';

    // =============================================
    // CONFIGURATION
    // =============================================

    const CONFIG = {
        API_ENDPOINT: '/.netlify/functions/chatbot-proxy',
        REQUEST_TIMEOUT: 30000, // 30 seconds
        MAX_MESSAGE_LENGTH: 450,
        MAX_HISTORY_LENGTH: 5,
        RETRY_ATTEMPTS: 2,
        USE_AI: true // Set to false to use fallback responses only
    };

    // Rate limiting configuration (frontend protection)
    const RATE_LIMITS = {
        PER_MINUTE: { max: 8, window: 60 * 1000 },              // 8 msg / 1 minute
        PER_10_MINUTES: { max: 20, window: 10 * 60 * 1000 },    // 20 msg / 10 minutes
        PER_DAY: { max: 50, window: 24 * 60 * 60 * 1000 }       // 50 msg / 24 heures
    };

    // Storage key for rate limiting
    const RATE_LIMIT_STORAGE_KEY = 'azenflow_chatbot_rate_limit';

    // =============================================
    // STATE MANAGEMENT
    // =============================================

    let isOpen = false;
    let messageHistory = [];
    let sessionId = null;
    let isProcessing = false;

    // =============================================
    // UTILITY FUNCTIONS
    // =============================================

    /**
     * Generate a unique session ID (UUID v4)
     */
    function generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Get current language (Japanese only)
     */
    function getCurrentLanguage() {
        return 'ja';
    }

    /**
     * Escapes HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Converts URLs in text to clickable HTML links
     * @param {string} text - Text potentially containing URLs
     * @returns {string} HTML with clickable links
     */
    function linkifyText(text) {
        // First escape all HTML to prevent XSS
        const escaped = escapeHtml(text);

        // Regex to detect URLs (http, https, www)
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

        return escaped.replace(urlRegex, (url) => {
            // Add https:// if URL starts with www
            const href = url.startsWith('www.') ? `https://${url}` : url;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="chatbot-link">${url}</a>`;
        });
    }

    /**
     * Checks if user has exceeded message sending limits
     * @returns {Object} { allowed: boolean, reason: string, retryAfter: number }
     */
    function checkRateLimit() {
        const now = Date.now();

        // Get timestamp history from localStorage
        let messageTimes = [];
        try {
            messageTimes = JSON.parse(localStorage.getItem(RATE_LIMIT_STORAGE_KEY) || '[]');
        } catch (error) {
            console.warn('[Chatbot] Failed to parse rate limit data:', error);
            messageTimes = [];
        }

        // Clean old timestamps (> 24h)
        messageTimes = messageTimes.filter(time => now - time < RATE_LIMITS.PER_DAY.window);

        // Check each limit
        const checks = [
            {
                name: 'PER_MINUTE',
                limit: RATE_LIMITS.PER_MINUTE,
                messages: {
                    ja: 'メッセージの送信が早すぎます。1分後に再試行してください。',
                    en: 'You are sending messages too quickly. Please wait 1 minute.'
                }
            },
            {
                name: 'PER_10_MINUTES',
                limit: RATE_LIMITS.PER_10_MINUTES,
                messages: {
                    ja: '10分間のメッセージ制限に達しました。しばらくお待ちください。',
                    en: 'You have reached the 10-minute message limit. Please wait a moment.'
                }
            },
            {
                name: 'PER_DAY',
                limit: RATE_LIMITS.PER_DAY,
                messages: {
                    ja: '本日のメッセージ制限に達しました。明日また試してください。',
                    en: 'You have reached the daily message limit. Please try again tomorrow.'
                }
            }
        ];

        for (const check of checks) {
            const recentMessages = messageTimes.filter(
                time => now - time < check.limit.window
            );

            if (recentMessages.length >= check.limit.max) {
                const oldestMessage = Math.min(...recentMessages);
                const retryAfter = Math.ceil((oldestMessage + check.limit.window - now) / 1000);

                const lang = getCurrentLanguage();
                return {
                    allowed: false,
                    reason: check.messages[lang],
                    retryAfter: retryAfter
                };
            }
        }

        // Add current timestamp
        messageTimes.push(now);
        try {
            localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(messageTimes));
        } catch (error) {
            console.warn('[Chatbot] Failed to store rate limit data:', error);
        }

        return { allowed: true };
    }

    /**
     * Get session ID (create if doesn't exist)
     */
    function getSessionId() {
        if (!sessionId) {
            // Try to get from sessionStorage first
            sessionId = sessionStorage.getItem('chatbot_session_id');
            if (!sessionId) {
                sessionId = generateSessionId();
                sessionStorage.setItem('chatbot_session_id', sessionId);
            }
        }
        return sessionId;
    }

    /**
     * Store conversation in sessionStorage
     */
    function storeConversation() {
        try {
            // Limit to last 50 messages for privacy and performance
            const limitedHistory = messageHistory.slice(-50);
            sessionStorage.setItem('chatbot_history', JSON.stringify(limitedHistory));
        } catch (error) {
            console.warn('[Chatbot] Failed to store conversation:', error);
        }
    }

    /**
     * Load conversation from sessionStorage
     */
    function loadConversation() {
        try {
            const stored = sessionStorage.getItem('chatbot_history');
            if (stored) {
                messageHistory = JSON.parse(stored);
                // Render stored messages
                const messagesContainer = document.getElementById('chatbotMessages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = '';
                    messageHistory.forEach(msg => {
                        addMessageToUI(msg.text, msg.isUser, false);
                    });
                }
            }
        } catch (error) {
            console.warn('[Chatbot] Failed to load conversation:', error);
        }
    }

    /**
     * Clear conversation history
     */
    function clearHistory() {
        messageHistory = [];
        sessionStorage.removeItem('chatbot_history');
        const messagesContainer = document.getElementById('chatbotMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        initGreeting();
    }

    // =============================================
    // FALLBACK RESPONSES (when AI is unavailable)
    // =============================================

    const fallbackResponses = {
        ja: {
            greeting: 'こんにちは！AzenFlowのAIアシスタントです。ご質問がありましたら、お気軽にお尋ねください。',
            error: '申し訳ございません。ただいま接続に問題が発生しています。後でお試しいただくか、メール（contact@azenflow.com）でお問い合わせください。',
            services: 'AzenFlowでは、LINEチャットボット、メールアシスタント、Webチャットボット、翻訳チャットボットの4つの主要サービスを提供しています。詳細は各サービスページをご覧ください。',
            contact: 'お問い合わせは、メール（contact@azenflow.com）またはお電話（080-3498-0640）で受け付けております。営業時間は平日9:00-18:00（JST）です。'
        },
        en: {
            greeting: "Hello! I'm AzenFlow's AI assistant. Please feel free to ask any questions you may have.",
            error: 'Sorry, we\'re experiencing connection issues. Please try again later or contact us at contact@azenflow.com.',
            services: 'AzenFlow offers four main services: LINE Chatbot, Email Assistant, Web Chatbot, and Translation Chatbot. Please visit each service page for details.',
            contact: 'Contact us by email (contact@azenflow.com) or phone (080-3498-0640). Business hours: Weekdays 9:00-18:00 (JST).'
        }
    };

    // =============================================
    // ERROR MESSAGES (bilingual)
    // =============================================

    const errorMessages = {
        network: {
            ja: '接続エラーが発生しました。インターネット接続をご確認ください。',
            en: 'Connection error occurred. Please check your internet connection.'
        },
        timeout: {
            ja: '応答に時間がかかっています。後でお試しください。',
            en: 'Response is taking too long. Please try again later.'
        },
        rateLimit: {
            ja: 'しばらくお待ちください。リクエストが多すぎます。',
            en: 'Please wait a moment. Too many requests.'
        },
        serverError: {
            ja: '申し訳ございません。サーバーエラーが発生しました。',
            en: 'Sorry, a server error occurred.'
        },
        invalidMessage: {
            ja: 'メッセージが長すぎます（最大500文字）。',
            en: 'Message is too long (max 500 characters).'
        },
        default: {
            ja: '申し訳ございません。後でお試しください。',
            en: 'Sorry, please try again later.'
        }
    };

    // =============================================
    // API COMMUNICATION
    // =============================================

    /**
     * Get conversation history in API format
     */
    function getHistoryForAPI() {
        return messageHistory
            .slice(-CONFIG.MAX_HISTORY_LENGTH)
            .map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
            }));
    }

    /**
     * Call AI API via Netlify Function
     */
    async function callAI(message, retryCount = 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        try {
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    language: getCurrentLanguage(),
                    sessionId: getSessionId(),
                    history: getHistoryForAPI()
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Handle specific error codes
                if (response.status === 429) {
                    throw new Error('RATE_LIMIT');
                } else if (response.status === 504) {
                    throw new Error('TIMEOUT');
                } else if (response.status >= 500) {
                    throw new Error('SERVER_ERROR');
                } else {
                    throw new Error('API_ERROR');
                }
            }

            const data = await response.json();

            // Validate response format
            if (!data.response || typeof data.response !== 'string') {
                throw new Error('INVALID_RESPONSE');
            }

            return data.response;

        } catch (error) {
            clearTimeout(timeoutId);

            console.error('[Chatbot] API error:', error);

            // Handle timeout
            if (error.name === 'AbortError') {
                throw new Error('TIMEOUT');
            }

            // Handle network errors
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('NETWORK_ERROR');
            }

            // Retry logic for transient errors
            if (retryCount < CONFIG.RETRY_ATTEMPTS &&
                (error.message === 'SERVER_ERROR' || error.message === 'API_ERROR')) {
                console.log(`[Chatbot] Retrying... (${retryCount + 1}/${CONFIG.RETRY_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return callAI(message, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Get error message based on error type
     */
    function getErrorMessage(error) {
        const lang = getCurrentLanguage();

        if (error.message === 'RATE_LIMIT') {
            return errorMessages.rateLimit[lang];
        } else if (error.message === 'TIMEOUT') {
            return errorMessages.timeout[lang];
        } else if (error.message === 'NETWORK_ERROR') {
            return errorMessages.network[lang];
        } else if (error.message === 'SERVER_ERROR') {
            return errorMessages.serverError[lang];
        } else {
            return errorMessages.default[lang];
        }
    }

    // =============================================
    // UI FUNCTIONS
    // =============================================

    /**
     * Toggle chatbot window
     */
    function toggleChatbot() {
        const toggle = document.getElementById('chatbotToggle');
        const chatWindow = document.getElementById('chatbotWindow');

        if (!toggle || !chatWindow) return;

        isOpen = !isOpen;
        toggle.classList.toggle('active');
        chatWindow.classList.toggle('active');

        // Détection mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

        // 🎯 Bloquer le scroll de la page et scroller vers le haut sur mobile
        if (isOpen) {
            if (isMobile) {
                // Scroller la page vers le haut pour que le widget soit visible
                window.scrollTo(0, 0);

                // Bloquer le scroll du body
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                document.body.style.top = '0';
            }

            const input = chatWindow.querySelector('input');
            if (input) setTimeout(() => input.focus(), 300);

            // Load conversation history
            if (messageHistory.length === 0) {
                loadConversation();
                if (messageHistory.length === 0) {
                    initGreeting();
                }
            }
        } else {
            // 🎯 Restaurer le scroll quand on ferme le chatbot
            if (isMobile) {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.top = '';
            }
        }
    }

    /**
     * Add message to UI
     */
    function addMessageToUI(text, isUser = false, animate = true, type = 'normal') {
        const messagesContainer = document.getElementById('chatbotMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');

        // Add appropriate class based on message type
        if (type === 'warning') {
            messageDiv.className = 'message warning-message';
        } else {
            messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Apply linkify to bot messages (but not warnings or user messages)
        if (!isUser && type === 'normal') {
            contentDiv.innerHTML = linkifyText(text);
        } else {
            contentDiv.textContent = text;
        }

        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);

        // 🎯 Scroll adaptatif selon l'état du clavier
        const chatbotWindow = document.getElementById('chatbotWindow');
        const isKeyboardActive = chatbotWindow && chatbotWindow.classList.contains('keyboard-active');

        if (isKeyboardActive) {
            // Clavier ouvert : Scroll immédiat et forcé (hauteur fixe)
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                // Re-forcer après un court délai (sécurité)
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 100);
            }, 50);
        } else {
            // Clavier fermé : Scroll smooth
            setTimeout(() => {
                messagesContainer.scrollTo({
                    top: messagesContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }

        // Animate message
        if (animate) {
            setTimeout(() => {
                messageDiv.style.opacity = '0';
                messageDiv.style.transform = 'translateY(10px)';
                messageDiv.style.transition = 'all 0.3s ease';

                setTimeout(() => {
                    messageDiv.style.opacity = '1';
                    messageDiv.style.transform = 'translateY(0)';
                }, 10);
            }, 10);
        }
    }

    /**
     * Add message to history and UI
     */
    function addMessage(text, isUser = false, type = 'normal') {
        addMessageToUI(text, isUser, true, type);

        // Only add to history if it's a normal message (not warnings)
        if (type === 'normal') {
            messageHistory.push({ text, isUser, timestamp: new Date() });
            // Store in sessionStorage
            storeConversation();
        }
    }

    /**
     * Show typing indicator
     */
    function showTypingIndicator() {
        const messagesContainer = document.getElementById('chatbotMessages');
        if (!messagesContainer) return null;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = '<div class="message-content"><span></span><span></span><span></span></div>';
        messagesContainer.appendChild(typingDiv);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Add typing animation CSS if not exists
        ensureTypingStyles();

        return typingDiv;
    }

    /**
     * Remove typing indicator
     */
    function removeTypingIndicator() {
        const typingDiv = document.getElementById('typing-indicator');
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    /**
     * Ensure typing animation styles are loaded
     */
    function ensureTypingStyles() {
        if (!document.getElementById('typing-style')) {
            const style = document.createElement('style');
            style.id = 'typing-style';
            style.textContent = `
                .typing-indicator .message-content {
                    display: flex;
                    gap: 4px;
                    padding: 12px 16px;
                }
                .typing-indicator span {
                    width: 8px;
                    height: 8px;
                    background: #9CA3AF;
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }
                .typing-indicator span:nth-child(2) {
                    animation-delay: 0.2s;
                }
                .typing-indicator span:nth-child(3) {
                    animation-delay: 0.4s;
                }
                @keyframes typing {
                    0%, 60%, 100% {
                        transform: translateY(0);
                        opacity: 0.7;
                    }
                    30% {
                        transform: translateY(-10px);
                        opacity: 1;
                    }
                }
                .user-message {
                    display: flex;
                    justify-content: flex-end;
                }
                .user-message .message-content {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .chatbot-input input:disabled,
                .send-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Disable input while processing
     */
    function setInputEnabled(enabled) {
        const input = document.querySelector('.chatbot-input input');
        const sendButton = document.querySelector('.send-button');

        if (input) input.disabled = !enabled;
        if (sendButton) sendButton.disabled = !enabled;

        isProcessing = !enabled;
    }

    // =============================================
    // MESSAGE HANDLING
    // =============================================

    /**
     * Handle user message
     */
    async function sendMessage(text) {
        if (!text.trim() || isProcessing) return;

        // Validate message length
        if (text.length > CONFIG.MAX_MESSAGE_LENGTH) {
            const lang = getCurrentLanguage();
            alert(errorMessages.invalidMessage[lang]);
            return;
        }

        // Check rate limiting
        const rateLimitCheck = checkRateLimit();
        if (!rateLimitCheck.allowed) {
            // Display warning message to user
            addMessage(rateLimitCheck.reason, false, 'warning');
            return;
        }

        // Add user message
        addMessage(text, true);

        // 🎯 Fermer le clavier sur mobile après envoi
        const input = document.querySelector('.chatbot-input input');
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        if (input && isMobile) {
            input.blur(); // Ferme le clavier
        }

        // Disable input
        setInputEnabled(false);

        // Show typing indicator
        const typingIndicator = showTypingIndicator();

        try {
            let response;

            if (CONFIG.USE_AI) {
                // Try to get AI response
                try {
                    response = await callAI(text);
                    console.log('[Chatbot] AI response received');
                } catch (error) {
                    console.error('[Chatbot] AI failed, using error message:', error);
                    response = getErrorMessage(error);
                }
            } else {
                // Use fallback
                const lang = getCurrentLanguage();
                response = fallbackResponses[lang].services;
            }

            // Remove typing indicator
            removeTypingIndicator();

            // Add bot response
            addMessage(response, false);

        } catch (error) {
            console.error('[Chatbot] Unexpected error:', error);
            removeTypingIndicator();

            const lang = getCurrentLanguage();
            addMessage(fallbackResponses[lang].error, false);
        } finally {
            // Re-enable input
            setInputEnabled(true);

            // Focus input SEULEMENT sur desktop (pas sur mobile pour éviter de rouvrir le clavier)
            const input = document.querySelector('.chatbot-input input');
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
            if (input && !isMobile) {
                setTimeout(() => input.focus(), 100);
            }
        }
    }

    // =============================================
    // MOBILE KEYBOARD DETECTION (Position Hybride)
    // =============================================

    /**
     * Détecte l'ouverture/fermeture du clavier et repositionne le widget
     * - Clavier fermé : Widget en bas (UX naturelle)
     * - Clavier ouvert : Widget en haut (reste visible)
     */
    function setupMobileKeyboardDetection() {
        // Détection mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                         || window.innerWidth <= 768;

        if (!isMobile) {
            console.log('[Chatbot] Desktop détecté - pas de détection clavier');
            return;
        }

        const input = document.querySelector('.chatbot-input input');
        const chatbotWindow = document.getElementById('chatbotWindow');
        const messagesContainer = document.getElementById('chatbotMessages');

        if (!input || !chatbotWindow) {
            console.warn('[Chatbot] Éléments introuvables pour détection clavier');
            return;
        }

        console.log('[Chatbot] Détection clavier mobile activée');

        let keyboardOpen = false;
        let initialViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

        /**
         * Active le mode clavier (widget en haut, hauteur fixe)
         */
        function activateKeyboardMode() {
            if (keyboardOpen) return;

            keyboardOpen = true;
            chatbotWindow.classList.add('keyboard-active');
            console.log('[Chatbot] 🎹 Clavier ouvert - Widget repositionné (top: 60px, height: 50vh FIXE)');

            // 🎯 Forcer le scroll vers le dernier message après l'animation
            setTimeout(() => {
                if (messagesContainer) {
                    // Premier scroll immédiat
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;

                    // Re-forcer après un court délai (sécurité)
                    setTimeout(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }, 100);
                }
            }, 350); // Après l'animation CSS (0.3s)
        }

        /**
         * Désactive le mode clavier (widget en bas)
         */
        function deactivateKeyboardMode() {
            if (!keyboardOpen) return;

            keyboardOpen = false;
            chatbotWindow.classList.remove('keyboard-active');
            console.log('[Chatbot] ⌨️ Clavier fermé - Widget repositionné en bas');
        }

        // ============================================
        // MÉTHODE 1: Détection via Focus/Blur
        // ============================================

        input.addEventListener('focus', () => {
            console.log('[Chatbot] 📝 Input focus détecté');

            // Délai pour laisser le clavier s'ouvrir
            setTimeout(() => {
                activateKeyboardMode();
            }, 300);
        });

        input.addEventListener('blur', () => {
            console.log('[Chatbot] 👋 Input blur détecté');

            // Délai pour vérifier si on refocus immédiatement
            setTimeout(() => {
                if (document.activeElement !== input) {
                    deactivateKeyboardMode();
                }
            }, 200);
        });

        // ============================================
        // MÉTHODE 2: Détection via Visual Viewport (iOS)
        // ============================================

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const currentHeight = window.visualViewport.height;
                const heightDiff = initialViewportHeight - currentHeight;

                // Clavier ouvert si hauteur réduite de >150px ET input a le focus
                if (heightDiff > 150 && document.activeElement === input) {
                    activateKeyboardMode();
                }
                // Clavier fermé si hauteur revenue à la normale
                else if (heightDiff < 50) {
                    deactivateKeyboardMode();
                }
            });

            console.log('[Chatbot] Visual Viewport API activée (iOS)');
        }
        // Fallback pour Android (window.resize)
        else {
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    const currentHeight = window.innerHeight;
                    const heightDiff = initialViewportHeight - currentHeight;

                    if (heightDiff > 150 && document.activeElement === input) {
                        activateKeyboardMode();
                    } else if (heightDiff < 50) {
                        deactivateKeyboardMode();
                    }
                }, 100);
            });

            console.log('[Chatbot] Window resize listener activé (Android)');
        }

        // ============================================
        // MÉTHODE 3: Reset au scroll (sécurité)
        // ============================================

        let scrollResetTimer;
        window.addEventListener('scroll', () => {
            // Si on scroll et que le clavier est ouvert mais input n'a plus le focus
            if (keyboardOpen && document.activeElement !== input) {
                clearTimeout(scrollResetTimer);
                scrollResetTimer = setTimeout(() => {
                    deactivateKeyboardMode();
                }, 500);
            }
        }, { passive: true });
    }

    // =============================================
    // EVENT LISTENERS
    // =============================================

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        const toggle = document.getElementById('chatbotToggle');
        const closeBtn = document.getElementById('chatbotCloseBtn');
        const input = document.querySelector('.chatbot-input input');
        const sendButton = document.querySelector('.send-button');

        if (toggle) {
            toggle.removeEventListener('click', toggleChatbot);
            toggle.addEventListener('click', toggleChatbot);
            console.log('✅ Chatbot toggle listener attached');
        }
        // Toggle button se charge via component-loader (silencieux si absent)

        // Close button dans le header du widget
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Empêcher la propagation
                if (isOpen) {
                    toggleChatbot(); // Fermer le widget
                }
            });
            console.log('✅ Chatbot close button listener attached');
        }

        if (sendButton && input) {
            const charCounter = document.getElementById('charCounter');

            const handleSendClick = () => {
                if (!isProcessing) {
                    sendMessage(input.value);
                    input.value = '';
                    // Réinitialiser le compteur
                    if (charCounter) {
                        charCounter.textContent = '0/450';
                        charCounter.classList.remove('warning', 'danger');
                    }
                }
            };

            sendButton.removeEventListener('click', handleSendClick);
            sendButton.addEventListener('click', handleSendClick);

            const handleKeyPress = (e) => {
                if (e.key === 'Enter' && !isProcessing) {
                    sendMessage(input.value);
                    input.value = '';
                    // Réinitialiser le compteur
                    if (charCounter) {
                        charCounter.textContent = '0/450';
                        charCounter.classList.remove('warning', 'danger');
                    }
                }
            };

            input.removeEventListener('keypress', handleKeyPress);
            input.addEventListener('keypress', handleKeyPress);

            // 🎯 Compteur de caractères en temps réel
            if (charCounter) {
                const updateCharCounter = () => {
                    const length = input.value.length;
                    const maxLength = CONFIG.MAX_MESSAGE_LENGTH;
                    charCounter.textContent = `${length}/${maxLength}`;

                    // Changer la couleur selon le nombre de caractères
                    charCounter.classList.remove('warning', 'danger');
                    if (length > maxLength * 0.9) {
                        charCounter.classList.add('danger');
                    } else if (length > maxLength * 0.7) {
                        charCounter.classList.add('warning');
                    }
                };

                input.addEventListener('input', updateCharCounter);
                console.log('✅ Compteur de caractères initialisé');
            }
        }

        // Close on escape key
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && isOpen) {
                toggleChatbot();
            }
        };

        document.removeEventListener('keydown', handleEscapeKey);
        document.addEventListener('keydown', handleEscapeKey);
    }

    // =============================================
    // INITIALIZATION
    // =============================================

    /**
     * Initialize greeting message
     */
    function initGreeting() {
        setTimeout(() => {
            const lang = getCurrentLanguage();
            const greeting = fallbackResponses[lang].greeting;

            const messagesContainer = document.getElementById('chatbotMessages');
            if (messagesContainer && messageHistory.length === 0) {
                messagesContainer.innerHTML = '';
                addMessage(greeting, false);
            }
        }, 500);
    }


    /**
     * Initialize chatbot
     */
    function init() {
        console.log('[Chatbot] Initializing...');
        setupEventListeners();
        setupMobileKeyboardDetection();
        // Don't init greeting here, wait for window to open
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Reinitialize after components loaded
    document.addEventListener('componentsLoaded', () => {
        console.log('🔄 Chatbot: Réinitialisation après chargement des composants');

        setTimeout(() => {
            const toggle = document.getElementById('chatbotToggle');
            const window = document.getElementById('chatbotWindow');

            if (toggle && window) {
                console.log('✅ Chatbot: Éléments trouvés, réattachement des listeners');
                setupEventListeners();
                setupMobileKeyboardDetection();
            } else {
                console.error('❌ Chatbot: Éléments introuvables!');
            }
        }, 200);
    });

    // =============================================
    // PUBLIC API
    // =============================================

    window.ChatbotWidget = {
        open: () => !isOpen && toggleChatbot(),
        close: () => isOpen && toggleChatbot(),
        sendMessage: sendMessage,
        getHistory: () => messageHistory,
        clearHistory: clearHistory,
        setAIEnabled: (enabled) => { CONFIG.USE_AI = enabled; }
    };

})();
