/**
 * Chatbot Proxy - Secure Netlify Function
 *
 * This serverless function acts as a secure proxy between the frontend chatbot
 * and the n8n webhook, ensuring that sensitive credentials are never exposed
 * to the client.
 *
 * Security features:
 * - Rate limiting (10 req/min per IP)
 * - Input validation and sanitization
 * - Webhook secret authentication
 * - Request timeout (30s)
 * - Comprehensive error handling
 * - CORS headers
 */

const https = require('https');
const http = require('http');

// Configuration from environment variables
const CONFIG = {
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
    RATE_LIMIT_PER_MINUTE: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '10'),
    REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    MAX_MESSAGE_LENGTH: 500,
    MAX_HISTORY_LENGTH: 5
};

// In-memory rate limiting store (resets when function cold starts)
// For production, consider using Redis or similar
const rateLimitStore = new Map();

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimitStore() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    for (const [key, data] of rateLimitStore.entries()) {
        if (data.timestamp < oneMinuteAgo) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Check rate limit for an IP address
 * @param {string} ip - Client IP address
 * @returns {boolean} - True if within limit, false if exceeded
 */
function checkRateLimit(ip) {
    cleanupRateLimitStore();

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, { count: 1, timestamp: now });
        return true;
    }

    const data = rateLimitStore.get(ip);

    // Reset counter if last request was more than 1 minute ago
    if (data.timestamp < oneMinuteAgo) {
        rateLimitStore.set(ip, { count: 1, timestamp: now });
        return true;
    }

    // Check if within limit
    if (data.count >= CONFIG.RATE_LIMIT_PER_MINUTE) {
        return false;
    }

    // Increment counter
    data.count++;
    data.timestamp = now;
    return true;
}

/**
 * Validate and sanitize input
 * @param {object} body - Request body
 * @returns {object} - { valid: boolean, error?: string, data?: object }
 */
function validateInput(body) {
    // Check required fields
    if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Invalid request format' };
    }

    if (!body.message || typeof body.message !== 'string') {
        return { valid: false, error: 'Message is required and must be a string' };
    }

    if (!body.language || !['ja', 'en'].includes(body.language)) {
        return { valid: false, error: 'Language must be "ja" or "en"' };
    }

    if (!body.sessionId || typeof body.sessionId !== 'string') {
        return { valid: false, error: 'Session ID is required' };
    }

    // Validate message length
    if (body.message.length > CONFIG.MAX_MESSAGE_LENGTH) {
        return {
            valid: false,
            error: `Message too long (max ${CONFIG.MAX_MESSAGE_LENGTH} characters)`
        };
    }

    // Validate message is not empty after trimming
    if (body.message.trim().length === 0) {
        return { valid: false, error: 'Message cannot be empty' };
    }

    // Sanitize and validate history if present
    let history = [];
    if (body.history && Array.isArray(body.history)) {
        // Limit history length
        history = body.history.slice(-CONFIG.MAX_HISTORY_LENGTH);

        // Validate history format
        for (const item of history) {
            if (!item.role || !item.content ||
                typeof item.role !== 'string' ||
                typeof item.content !== 'string') {
                return { valid: false, error: 'Invalid history format' };
            }

            if (!['user', 'assistant'].includes(item.role)) {
                return { valid: false, error: 'History role must be "user" or "assistant"' };
            }
        }
    }

    // Return sanitized data
    return {
        valid: true,
        data: {
            message: body.message.trim(),
            language: body.language,
            sessionId: body.sessionId,
            history: history
        }
    };
}

/**
 * Call n8n webhook with timeout
 * @param {object} data - Data to send to webhook
 * @returns {Promise<object>} - Response from n8n
 */
function callN8nWebhook(data) {
    return new Promise((resolve, reject) => {
        // Check if webhook URL is configured
        if (!CONFIG.N8N_WEBHOOK_URL) {
            reject(new Error('N8N_WEBHOOK_URL not configured'));
            return;
        }

        // Parse webhook URL
        const url = new URL(CONFIG.N8N_WEBHOOK_URL);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        // Prepare payload
        const payload = JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
            source: 'azenflow-website'
        });

        // Prepare request options
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'User-Agent': 'AzenFlow-Chatbot/1.0'
            },
            timeout: CONFIG.REQUEST_TIMEOUT
        };

        // Add secret header if configured
        if (CONFIG.N8N_WEBHOOK_SECRET) {
            options.headers['X-API-Key'] = CONFIG.N8N_WEBHOOK_SECRET;
        }

        console.log(`[Chatbot Proxy] Calling n8n webhook: ${url.hostname}${url.pathname}`);

        const req = httpModule.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`[Chatbot Proxy] n8n response status: ${res.statusCode}`);

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsedData = JSON.parse(responseData);
                        resolve(parsedData);
                    } catch (error) {
                        console.error('[Chatbot Proxy] Failed to parse n8n response:', error);
                        reject(new Error('Invalid response from AI service'));
                    }
                } else {
                    console.error(`[Chatbot Proxy] n8n error response: ${responseData}`);
                    reject(new Error(`AI service returned error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('[Chatbot Proxy] Request error:', error);
            reject(new Error('Failed to connect to AI service'));
        });

        req.on('timeout', () => {
            req.destroy();
            console.error('[Chatbot Proxy] Request timeout');
            reject(new Error('AI service timeout'));
        });

        req.write(payload);
        req.end();
    });
}

/**
 * CORS headers
 */
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
    // Log function invocation (without sensitive data)
    console.log(`[Chatbot Proxy] Request from ${event.headers['x-forwarded-for'] || 'unknown'}`);

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: ''
        };
    }

    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                error: 'Method not allowed',
                message: 'Only POST requests are accepted'
            })
        };
    }

    try {
        // Get client IP for rate limiting
        const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                        event.headers['client-ip'] ||
                        'unknown';

        // Check rate limit
        if (!checkRateLimit(clientIp)) {
            console.warn(`[Chatbot Proxy] Rate limit exceeded for IP: ${clientIp}`);
            return {
                statusCode: 429,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    error: 'rate_limit_exceeded',
                    message: {
                        ja: 'しばらくお待ちください。リクエストが多すぎます。',
                        en: 'Please wait a moment. Too many requests.'
                    }
                })
            };
        }

        // Parse request body
        let body;
        try {
            body = JSON.parse(event.body || '{}');
        } catch (error) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    error: 'invalid_json',
                    message: 'Invalid JSON in request body'
                })
            };
        }

        // Validate input
        const validation = validateInput(body);
        if (!validation.valid) {
            console.warn(`[Chatbot Proxy] Validation error: ${validation.error}`);
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                    error: 'validation_error',
                    message: validation.error
                })
            };
        }

        // Call n8n webhook
        console.log(`[Chatbot Proxy] Processing message (lang: ${validation.data.language})`);
        const response = await callN8nWebhook(validation.data);

        // Return successful response
        console.log('[Chatbot Proxy] Successfully processed request');
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('[Chatbot Proxy] Error processing request:', error);

        // Determine appropriate error response
        let statusCode = 500;
        let errorMessage = {
            ja: '申し訳ございません。後でお試しください。',
            en: 'Sorry, please try again later.'
        };

        if (error.message.includes('timeout')) {
            statusCode = 504;
            errorMessage = {
                ja: '応答に時間がかかっています。後でお試しください。',
                en: 'Response is taking too long. Please try again later.'
            };
        } else if (error.message.includes('connect')) {
            statusCode = 503;
            errorMessage = {
                ja: '接続エラーが発生しました。後でお試しください。',
                en: 'Connection error occurred. Please try again later.'
            };
        } else if (error.message.includes('not configured')) {
            statusCode = 500;
            errorMessage = {
                ja: 'サービス設定エラー。管理者に連絡してください。',
                en: 'Service configuration error. Please contact administrator.'
            };
        }

        return {
            statusCode: statusCode,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                error: 'server_error',
                message: errorMessage
            })
        };
    }
};
