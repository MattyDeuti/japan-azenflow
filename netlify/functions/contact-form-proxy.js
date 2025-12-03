/**
 * Contact Form Proxy - Netlify Function
 * Forwards contact form data to n8n webhook securely
 *
 * Security:
 * - Hides n8n webhook URL from frontend
 * - Adds X-API-Key authentication header
 * - Validates and sanitizes all input data
 * - Rate limiting (10 requests per hour per IP)
 * - CORS headers for security
 */

// Utilisation du fetch natif de Node.js 18+ (pas besoin d'import)
// Netlify Functions utilise Node.js 18+ où fetch est disponible globalement

// Configuration
const CONFIG = {
    N8N_WEBHOOK_URL: process.env.N8N_CONTACT_WEBHOOK_URL,
    API_KEY: process.env.N8N_WEBHOOK_SECRET,
    RATE_LIMIT_WINDOW: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS_PER_HOUR: 10,
    REQUEST_TIMEOUT: 30000 // 30 seconds
};

// In-memory rate limiting store (simple implementation)
const rateLimitStore = new Map();

// Rate limiting function
function checkRateLimit(ip) {
    const now = Date.now();
    const userRequests = rateLimitStore.get(ip) || [];

    // Clean old requests
    const recentRequests = userRequests.filter(
        timestamp => now - timestamp < CONFIG.RATE_LIMIT_WINDOW
    );

    if (recentRequests.length >= CONFIG.MAX_REQUESTS_PER_HOUR) {
        const oldestRequest = Math.min(...recentRequests);
        const retryAfter = Math.ceil((oldestRequest + CONFIG.RATE_LIMIT_WINDOW - now) / 1000);
        return { allowed: false, retryAfter };
    }

    recentRequests.push(now);
    rateLimitStore.set(ip, recentRequests);

    return { allowed: true };
}

// Input validation and sanitization
function validateAndSanitize(data) {
    const errors = [];

    // Normaliser les noms de champs pour compatibilité (anciens → nouveaux)
    const normalizedData = {
        name: data.name || data.firstname || '',
        email: data.email || '',
        company: data.company || '',
        phone: data.phone || '',
        service: data.service || data.projectType || '',
        message: data.message || '',
        consent: data.consent,
        language: data.language || 'ja'
    };

    // Required fields (only name, email, and message are required)
    const requiredFields = ['name', 'email', 'message'];
    for (const field of requiredFields) {
        if (!normalizedData[field] || typeof normalizedData[field] !== 'string' || normalizedData[field].trim() === '') {
            errors.push(`Missing or invalid field: ${field}`);
        }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (normalizedData.email && !emailRegex.test(normalizedData.email)) {
        errors.push('Invalid email format');
    }

    // Length limits
    if (normalizedData.message && normalizedData.message.length > 2000) {
        errors.push('Message too long (max 2000 characters)');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    // Sanitize (trim whitespace, remove potentially harmful characters)
    // Allowed sources for validation
    const allowedSources = ['website-contact-form', 'pdf-download'];
    const requestedSource = data.source && allowedSources.includes(data.source)
        ? data.source
        : 'website-contact-form';

    const sanitized = {
        name: normalizedData.name.trim().substring(0, 100),
        email: normalizedData.email.trim().toLowerCase().substring(0, 200),
        company: normalizedData.company ? normalizedData.company.trim().substring(0, 200) : '',
        phone: normalizedData.phone ? normalizedData.phone.trim().substring(0, 50) : '',
        service: normalizedData.service ? normalizedData.service.trim().substring(0, 100) : '',
        message: normalizedData.message.trim().substring(0, 2000),
        consent: normalizedData.consent === true || normalizedData.consent === 'true',
        language: normalizedData.language || 'ja',
        timestamp: new Date().toISOString(),
        source: requestedSource
    };

    return { valid: true, data: sanitized };
}

// Main handler
exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only POST allowed
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get client IP
        const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';

        console.log(`[Contact Form] Request from IP: ${clientIP}`);

        // Rate limiting
        const rateLimitCheck = checkRateLimit(clientIP);
        if (!rateLimitCheck.allowed) {
            console.warn(`[Contact Form] Rate limit exceeded for IP: ${clientIP}`);
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({
                    error: 'Too many requests',
                    retryAfter: rateLimitCheck.retryAfter
                })
            };
        }

        // Parse request body
        let requestData;
        try {
            requestData = JSON.parse(event.body);
        } catch (parseError) {
            console.error('[Contact Form] Invalid JSON:', parseError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid JSON format' })
            };
        }

        // Validate and sanitize
        const validation = validateAndSanitize(requestData);
        if (!validation.valid) {
            console.warn('[Contact Form] Validation errors:', validation.errors);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Validation failed',
                    details: validation.errors
                })
            };
        }

        const sanitizedData = validation.data;

        // Check configuration
        if (!CONFIG.N8N_WEBHOOK_URL || !CONFIG.API_KEY) {
            console.error('[Contact Form] Missing environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        console.log('[Contact Form] Sending to n8n webhook...');

        // Call n8n webhook with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': CONFIG.API_KEY
            },
            body: JSON.stringify(sanitizedData),
            signal: controller.signal
        });

        clearTimeout(timeout);

        console.log(`[Contact Form] n8n response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Contact Form] n8n error:', errorText);

            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: 'Failed to process form',
                    statusCode: response.status
                })
            };
        }

        // Success
        console.log('[Contact Form] Form submitted successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Form submitted successfully'
            })
        };

    } catch (error) {
        console.error('[Contact Form] Error:', error);

        // Handle timeout
        if (error.name === 'AbortError') {
            return {
                statusCode: 504,
                headers,
                body: JSON.stringify({ error: 'Request timeout' })
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
