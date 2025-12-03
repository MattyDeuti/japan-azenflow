/**
 * Cookie Consent Manager - RGPD/GDPR Compliant
 * Manages user consent for Google Analytics and other tracking cookies
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        STORAGE_KEY: 'azenflow_cookie_consent',
        EXPIRY_DAYS: 395, // 13 months in days (RGPD requirement)
        GA_MEASUREMENT_ID: 'G-XXXXXXXXXX', // TODO: Replace with actual GA4 ID
        CONSENT_STATES: {
            ACCEPTED: 'accepted',
            REJECTED: 'rejected',
            PENDING: 'pending'
        }
    };

    // Cookie Consent Manager
    const CookieConsent = {
        /**
         * Initialize the cookie consent system
         */
        init() {
            // Check for Do Not Track browser setting
            if (this.isDoNotTrackEnabled()) {
                console.log('[Cookie Consent] Do Not Track is enabled - respecting user preference');
                this.saveConsent(CONFIG.CONSENT_STATES.REJECTED);
                return;
            }

            // Wait for components to load
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        },

        /**
         * Setup the consent banner and check existing consent
         */
        setup() {
            const consent = this.getConsent();

            if (consent.status === CONFIG.CONSENT_STATES.PENDING || this.isConsentExpired(consent)) {
                // Show banner if no consent or expired
                this.showBanner();
            } else if (consent.status === CONFIG.CONSENT_STATES.ACCEPTED) {
                // Load analytics if consent was given
                this.initGoogleAnalytics();
            }

            // Setup event listeners
            this.attachEventListeners();
        },

        /**
         * Get current consent status from localStorage
         */
        getConsent() {
            try {
                const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
                if (!stored) {
                    return { status: CONFIG.CONSENT_STATES.PENDING, timestamp: null };
                }
                return JSON.parse(stored);
            } catch (error) {
                console.error('[Cookie Consent] Error reading consent:', error);
                return { status: CONFIG.CONSENT_STATES.PENDING, timestamp: null };
            }
        },

        /**
         * Save consent choice to localStorage
         */
        saveConsent(status) {
            try {
                const consent = {
                    status: status,
                    timestamp: Date.now(),
                    version: '1.0'
                };
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(consent));
                console.log('[Cookie Consent] Consent saved:', status);
            } catch (error) {
                console.error('[Cookie Consent] Error saving consent:', error);
            }
        },

        /**
         * Check if consent has expired (>13 months)
         */
        isConsentExpired(consent) {
            if (!consent.timestamp) return true;
            const expiryTime = CONFIG.EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Convert days to milliseconds
            return (Date.now() - consent.timestamp) > expiryTime;
        },

        /**
         * Check if browser has Do Not Track enabled
         */
        isDoNotTrackEnabled() {
            return navigator.doNotTrack === '1' ||
                   window.doNotTrack === '1' ||
                   navigator.msDoNotTrack === '1';
        },

        /**
         * Show the cookie banner
         */
        showBanner() {
            // Wait for componentsLoaded event if not already loaded
            const showBannerElement = () => {
                const banner = document.getElementById('cookie-banner');
                if (banner) {
                    banner.style.display = 'flex';
                    // Apply translations if language switcher is active
                    if (window.LanguageSwitcher && window.LanguageSwitcher.currentLang) {
                        window.LanguageSwitcher.applyTranslations();
                    }
                } else {
                    console.warn('[Cookie Consent] Banner element not found');
                }
            };

            if (document.getElementById('cookie-banner')) {
                showBannerElement();
            } else {
                // Wait for components to load
                document.addEventListener('componentsLoaded', showBannerElement);
            }
        },

        /**
         * Hide the cookie banner with animation
         */
        hideBanner() {
            const banner = document.getElementById('cookie-banner');
            if (banner) {
                banner.classList.add('hiding');
                setTimeout(() => {
                    banner.style.display = 'none';
                    banner.classList.remove('hiding');
                }, 400); // Match animation duration in CSS
            }
        },

        /**
         * Attach event listeners to accept/decline buttons
         */
        attachEventListeners() {
            // Use event delegation since buttons might not exist yet
            document.addEventListener('click', (e) => {
                if (e.target.id === 'cookie-accept' || e.target.closest('#cookie-accept')) {
                    e.preventDefault();
                    this.handleAccept();
                } else if (e.target.id === 'cookie-decline' || e.target.closest('#cookie-decline')) {
                    e.preventDefault();
                    this.handleDecline();
                }
            });

            // Keyboard accessibility
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const banner = document.getElementById('cookie-banner');
                    if (banner && banner.style.display !== 'none') {
                        this.handleDecline(); // Treat ESC as decline
                    }
                }
            });
        },

        /**
         * Handle accept button click
         */
        handleAccept() {
            console.log('[Cookie Consent] User accepted cookies');
            this.saveConsent(CONFIG.CONSENT_STATES.ACCEPTED);
            this.hideBanner();
            this.initGoogleAnalytics();

            // Dispatch custom event for other scripts
            window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
                detail: { consent: CONFIG.CONSENT_STATES.ACCEPTED }
            }));
        },

        /**
         * Handle decline button click
         */
        handleDecline() {
            console.log('[Cookie Consent] User declined cookies');
            this.saveConsent(CONFIG.CONSENT_STATES.REJECTED);
            this.hideBanner();

            // Dispatch custom event for other scripts
            window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
                detail: { consent: CONFIG.CONSENT_STATES.REJECTED }
            }));
        },

        /**
         * Initialize Google Analytics (GA4)
         * ONLY called after user consent
         */
        initGoogleAnalytics() {
            if (CONFIG.GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
                console.warn('[Cookie Consent] Google Analytics ID not configured');
                return;
            }

            // Prevent double-loading
            if (window.gtag || document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
                console.log('[Cookie Consent] Google Analytics already loaded');
                return;
            }

            console.log('[Cookie Consent] Loading Google Analytics...');

            // Load gtag.js script
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_MEASUREMENT_ID}`;
            document.head.appendChild(script);

            // Initialize gtag
            window.dataLayer = window.dataLayer || [];
            function gtag() {
                window.dataLayer.push(arguments);
            }
            window.gtag = gtag;

            gtag('js', new Date());
            gtag('config', CONFIG.GA_MEASUREMENT_ID, {
                'anonymize_ip': true, // RGPD requirement
                'cookie_flags': 'SameSite=None;Secure'
            });

            console.log('[Cookie Consent] Google Analytics initialized');
        },

        /**
         * Public method to check if analytics can be used
         */
        hasAnalyticsConsent() {
            const consent = this.getConsent();
            return consent.status === CONFIG.CONSENT_STATES.ACCEPTED &&
                   !this.isConsentExpired(consent);
        },

        /**
         * Public method to revoke consent (for privacy settings page)
         */
        revokeConsent() {
            this.saveConsent(CONFIG.CONSENT_STATES.REJECTED);
            // Reload page to stop any active tracking
            window.location.reload();
        }
    };

    // Make CookieConsent available globally for external access
    window.CookieConsent = CookieConsent;

    // Initialize immediately
    CookieConsent.init();

})();
