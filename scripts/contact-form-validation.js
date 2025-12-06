/**
 * Contact Form Validation & Anti-Bot Slider
 * AzenFlow - Professional Form Security
 */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================

    const CONFIG = {
        SLIDER_THRESHOLD: 95, // Pourcentage pour considérer le slider complété
        MIN_MESSAGE_LENGTH: 10,
        MAX_MESSAGE_LENGTH: 1000
    };

    // ==================== STATE ====================

    let sliderVerified = false;
    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    // ==================== DOM ELEMENTS ====================

    const form = document.getElementById('contactForm');
    const submitButton = document.getElementById('submitButton');
    const consentCheckbox = document.getElementById('consentCheckbox');
    const sliderThumb = document.getElementById('sliderThumb');
    const sliderProgress = document.getElementById('sliderProgress');
    const sliderText = document.getElementById('sliderText');
    const verificationSuccess = document.getElementById('verificationSuccess');
    const securityVerification = document.getElementById('securityVerification');

    // ==================== UTILITY FUNCTIONS ====================

    function getCurrentLanguage() {
        return 'ja';
    }

    function showError(inputElement, errorMessage) {
        inputElement.classList.add('error');
        const errorSpan = inputElement.parentElement.querySelector('.form-error-message');
        if (errorSpan) {
            errorSpan.style.display = 'block';
            if (errorMessage) {
                errorSpan.textContent = errorMessage;
            }
        }
    }

    function hideError(inputElement) {
        inputElement.classList.remove('error');
        const errorSpan = inputElement.parentElement.querySelector('.form-error-message');
        if (errorSpan) {
            errorSpan.style.display = 'none';
        }
    }

    function validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // ==================== FIELD VALIDATION ====================

    function validateField(input) {
        const value = input.value.trim();
        const lang = getCurrentLanguage();
        let isValid = true;
        let errorMessage = '';

        // 🔍 Log de debug (avec protection contre les valeurs vides)
        const valuePreview = value ? value.substring(0, 30) : '(empty)';
        console.log(`🔍 [validateField] Field: ${input.name}, Value: "${valuePreview}...", Type: ${input.type}`);

        // Validation selon le type de champ (avec fallbacks pour compatibilité)
        switch(input.name) {
            case 'firstname':  // Ancien nom (fallback)
            case 'name':       // Nom actuel
                if (!value || value.length < 2) {
                    isValid = false;
                    errorMessage = lang === 'ja'
                        ? '2文字以上入力してください'
                        : 'Please enter at least 2 characters';
                    console.warn(`❌ [validateField] ${input.name} too short: ${value.length} chars`);
                } else {
                    console.log(`✅ [validateField] ${input.name} valid`);
                }
                break;

            case 'email':
                if (!value) {
                    isValid = false;
                    errorMessage = lang === 'ja'
                        ? 'メールアドレスを入力してください'
                        : 'Please enter your email';
                    console.warn(`❌ [validateField] Email empty`);
                } else if (!validateEmail(value)) {
                    isValid = false;
                    errorMessage = lang === 'ja'
                        ? '有効なメールアドレスを入力してください'
                        : 'Please enter a valid email address';
                    console.warn(`❌ [validateField] Email invalid: ${value}`);
                } else {
                    console.log(`✅ [validateField] Email valid`);
                }
                break;

            case 'company':
                // Company is optional, so only validate if it has a value
                if (value && value.length < 2) {
                    isValid = false;
                    errorMessage = lang === 'ja'
                        ? '会社名は2文字以上で入力してください'
                        : 'Company name must be at least 2 characters';
                    console.warn(`❌ [validateField] Company too short`);
                } else {
                    console.log(`✅ [validateField] Company field is optional - valid`);
                }
                break;

            case 'project-type':  // Ancien nom (fallback)
            case 'service':       // Nom actuel
                // Service is optional
                if (value && value === '') {
                    isValid = false;
                    errorMessage = lang === 'ja'
                        ? 'サービスを選択してください'
                        : 'Please select a service';
                    console.warn(`❌ [validateField] ${input.name} not selected`);
                } else {
                    console.log(`✅ [validateField] ${input.name} field is optional - valid`);
                }
                break;

            case 'phone':
                // Phone is optional, no validation needed
                console.log(`✅ [validateField] Phone field is optional - valid`);
                break;

            case 'message':
                const MIN_LENGTH = CONFIG.MIN_MESSAGE_LENGTH;
                const MAX_LENGTH = CONFIG.MAX_MESSAGE_LENGTH;
                if (!value || value.length < MIN_LENGTH) {
                    isValid = false;
                    errorMessage = lang === 'ja'
                        ? `${MIN_LENGTH}文字以上入力してください`
                        : `Please enter at least ${MIN_LENGTH} characters`;
                    console.warn(`❌ [validateField] Message too short: ${value.length} chars`);
                } else if (value.length > MAX_LENGTH) {
                    isValid = false;
                    errorMessage = lang === 'ja'
                        ? `${MAX_LENGTH}文字以内で入力してください`
                        : `Please keep your message under ${MAX_LENGTH} characters`;
                    console.warn(`❌ [validateField] Message too long: ${value.length} chars`);
                } else {
                    console.log(`✅ [validateField] Message valid`);
                }
                break;

            default:
                // Champ inconnu - loguer pour debug
                console.warn(`⚠️ [validateField] Unknown field: ${input.name}`);
                break;
        }

        if (isValid) {
            hideError(input);
            console.log(`✅ [validateField] ${input.name} valid`);
        } else {
            showError(input, errorMessage);
            console.error(`❌ [validateField] ${input.name} invalid: ${errorMessage}`);
        }

        return isValid;
    }

    // ==================== FORM VALIDATION ====================

    function validateForm() {
        const lang = getCurrentLanguage();
        let isValid = true;
        let errors = [];

        console.log('🔍 [DEBUG] Starting form validation...');

        // Valider tous les champs requis (SAUF checkbox)
        const requiredFields = form.querySelectorAll('input[required]:not([type="checkbox"]), textarea[required], select[required]');

        requiredFields.forEach(field => {
            const fieldName = field.name || field.id;
            const fieldValue = field.value?.trim();

            console.log(`🔍 [DEBUG] Validating field: ${fieldName}, value: "${fieldValue?.substring(0, 30)}..."`);

            if (!validateField(field)) {
                isValid = false;
                errors.push(`Field "${fieldName}" is invalid`);
                console.warn(`❌ [DEBUG] Field validation failed: ${fieldName}`);
            } else {
                console.log(`✅ [DEBUG] Field OK: ${fieldName}`);
            }
        });

        // Valider la checkbox de consentement
        console.log('🔍 [DEBUG] Validating consent checkbox...');
        console.log('🔍 [DEBUG] Consent checked:', consentCheckbox?.checked);

        if (!consentCheckbox.checked) {
            isValid = false;
            errors.push('Consent checkbox not checked');
            const errorMsg = lang === 'ja'
                ? 'プライバシーポリシーに同意する必要があります'
                : 'You must agree to the privacy policy';
            showError(consentCheckbox, errorMsg);
            console.warn('❌ [DEBUG] Consent checkbox validation failed');
        } else {
            hideError(consentCheckbox);
            console.log('✅ [DEBUG] Consent checkbox OK');
        }

        // Valider le slider
        console.log('🔍 [DEBUG] Validating slider...');
        console.log('🔍 [DEBUG] Slider verified:', sliderVerified);

        if (!sliderVerified) {
            isValid = false;
            errors.push('Slider not verified');
            const verificationError = document.getElementById('verificationError');
            if (verificationError) {
                verificationError.style.display = 'block';
            }
            console.warn('❌ [DEBUG] Slider validation failed');
        } else {
            console.log('✅ [DEBUG] Slider OK');
        }

        // Résultat final
        if (isValid) {
            console.log('✅ [DEBUG] Validation SUCCESS - All fields valid');
        } else {
            console.error('❌ [DEBUG] Validation FAILED');
            console.error('❌ [DEBUG] Errors:', errors);
        }

        return isValid;
    }

    // ==================== SLIDER FUNCTIONALITY ====================

    function initSlider() {
        if (!sliderThumb || !sliderProgress) {
            console.error('❌ Slider elements not found');
            return;
        }

        const sliderTrack = sliderThumb.parentElement;
        if (!sliderTrack) {
            console.error('❌ Slider track not found');
            return;
        }

        console.log('✅ Slider initialized');

        let isDraggingLocal = false;
        let startPosition = 0;
        let currentPosition = 0;

        // Fonction pour obtenir la position X (souris ou touch)
        function getPositionX(e) {
            return e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        }

        // Fonction pour calculer le pourcentage
        function updatePosition(clientX) {
            const trackRect = sliderTrack.getBoundingClientRect();
            const thumbWidth = sliderThumb.offsetWidth;
            const maxPosition = trackRect.width - thumbWidth;

            // Calculer la nouvelle position
            const deltaX = clientX - startPosition;
            let newPosition = currentPosition + deltaX;

            // Limiter entre 0 et maxPosition
            newPosition = Math.max(0, Math.min(newPosition, maxPosition));

            // Calculer le pourcentage
            const percentage = (newPosition / maxPosition) * 100;

            // Appliquer visuellement
            sliderThumb.style.left = newPosition + 'px';
            sliderProgress.style.width = percentage + '%';

            // Vérifier si complété
            if (percentage >= 95) {
                completeSlider();
            }

            return newPosition;
        }

        // Fonction de complétion
        function completeSlider() {
            if (sliderVerified) return;

            sliderVerified = true;
            isDraggingLocal = false;

            console.log('✅ Slider verified!');

            // Verrouiller à 100%
            const trackRect = sliderTrack.getBoundingClientRect();
            const thumbWidth = sliderThumb.offsetWidth;
            const maxPosition = trackRect.width - thumbWidth;

            sliderThumb.style.left = maxPosition + 'px';
            sliderProgress.style.width = '100%';
            sliderThumb.classList.add('verified');
            sliderThumb.style.cursor = 'default';

            // Afficher succès
            setTimeout(() => {
                sliderTrack.style.display = 'none';
                if (sliderText) sliderText.style.display = 'none';
                if (verificationSuccess) {
                    verificationSuccess.style.display = 'flex';
                }
                securityVerification.classList.add('verified');

                // Activer le bouton
                checkFormValidity();
            }, 300);
        }

        // --- EVENT HANDLERS ---

        function handleStart(e) {
            if (sliderVerified) return;

            console.log('🟢 DRAG START:', e.type);

            isDraggingLocal = true;
            isDragging = true;
            startPosition = getPositionX(e);
            currentPosition = sliderThumb.offsetLeft;

            sliderThumb.classList.add('dragging');
            sliderTrack.classList.add('active');

            // Empêcher sélection de texte
            document.body.style.userSelect = 'none';

            e.preventDefault();
        }

        function handleMove(e) {
            if (!isDraggingLocal || sliderVerified) return;

            console.log('🟡 DRAGGING');

            const clientX = getPositionX(e);
            currentPosition = updatePosition(clientX);
            startPosition = clientX;

            e.preventDefault();
        }

        function handleEnd(e) {
            if (!isDraggingLocal) return;

            console.log('🔴 DRAG END');

            isDraggingLocal = false;
            isDragging = false;
            sliderThumb.classList.remove('dragging');
            sliderTrack.classList.remove('active');

            // Réactiver sélection
            document.body.style.userSelect = '';

            // Si pas complété, revenir à 0
            if (!sliderVerified) {
                sliderThumb.style.transition = 'all 0.3s ease';
                sliderProgress.style.transition = 'all 0.3s ease';

                setTimeout(() => {
                    sliderThumb.style.left = '0px';
                    sliderProgress.style.width = '0%';
                    currentPosition = 0;

                    setTimeout(() => {
                        sliderThumb.style.transition = 'none';
                        sliderProgress.style.transition = 'none';
                    }, 300);
                }, 10);
            }

            e.preventDefault();
        }

        // --- ATTACHER LES EVENT LISTENERS ---

        // SOURIS
        sliderThumb.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        // TOUCH
        sliderThumb.addEventListener('touchstart', handleStart, { passive: false });
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd, { passive: false });

        console.log('✅ Event listeners attached');
    }

    // ==================== SUBMIT BUTTON STATE ====================

    function checkFormValidity() {
        console.log('🔍 [checkFormValidity] Starting check...');

        // Vérifier que tous les champs REQUIS sont remplis ET valides
        // Champs requis dans le HTML: name, email, message, consent checkbox
        const requiredFields = Array.from(form.querySelectorAll('input[required], textarea[required]'))
            .filter(field => field.type !== 'checkbox');

        console.log('🔍 [checkFormValidity] Required fields:', requiredFields.map(f => f.name));

        const allFieldsValid = requiredFields.every(field => {
            const value = field.value ? field.value.trim() : '';
            const valuePreview = value ? value.substring(0, 20) : '(empty)';
            console.log(`  🔍 [checkFormValidity] Field ${field.name}: "${valuePreview}..."`);

            if (!value) {
                console.warn(`  ⚠️ [checkFormValidity] Field ${field.name} is empty`);
                return false;
            }

            // Validation spécifique email
            if (field.name === 'email') {
                const isValid = validateEmail(value);
                console.log(`  ${isValid ? '✅' : '❌'} [checkFormValidity] Email valid: ${isValid}`);
                return isValid;
            }

            // Validation spécifique message
            if (field.name === 'message') {
                const isValid = value.length >= CONFIG.MIN_MESSAGE_LENGTH && value.length <= CONFIG.MAX_MESSAGE_LENGTH;
                console.log(`  ${isValid ? '✅' : '❌'} [checkFormValidity] Message valid: ${isValid} (length: ${value.length})`);
                return isValid;
            }

            // Validation générique pour name (minimum 2 caractères)
            if (field.name === 'name') {
                const isValid = value.length >= 2;
                console.log(`  ${isValid ? '✅' : '❌'} [checkFormValidity] Name valid: ${isValid} (length: ${value.length})`);
                return isValid;
            }

            return true;
        });

        const consentGiven = consentCheckbox.checked;

        console.log(`🔍 [checkFormValidity] Result: allFieldsValid=${allFieldsValid}, consentGiven=${consentGiven}`);

        // Afficher/masquer le slider selon l'état du formulaire
        if (allFieldsValid && consentGiven) {
            // Tous les champs sont valides + consentement donné → Afficher le slider
            securityVerification.style.display = 'block';

            // Si déjà vérifié, activer le bouton
            if (sliderVerified) {
                submitButton.disabled = false;
                submitButton.classList.add('enabled');
            } else {
                submitButton.disabled = true;
                submitButton.classList.remove('enabled');
            }
        } else {
            // Formulaire incomplet → Masquer le slider
            securityVerification.style.display = 'none';
            submitButton.disabled = true;
            submitButton.classList.remove('enabled');
        }
    }

    // ==================== FORM SUBMISSION ====================
    // Note: La soumission est maintenant gérée dans le click listener du bouton (voir init())

    function showNotification(type, details = null) {
        const lang = getCurrentLanguage();

        const messages = {
            success: {
                ja: '✅ メッセージが正常に送信されました！24時間以内にご連絡いたします。',
                en: '✅ Message sent successfully! We\'ll get back to you within 24 hours.'
            },
            error: {
                ja: '❌ エラーが発生しました。もう一度お試しいただくか、メールでお問い合わせください：contact@azenflow.com',
                en: '❌ An error occurred. Please try again or contact us by email: contact@azenflow.com'
            },
            'rate-limit': {
                ja: '⏱️ 送信回数が多すぎます。しばらくしてから再度お試しください。',
                en: '⏱️ Too many requests. Please wait a moment and try again.'
            },
            timeout: {
                ja: '⏳ タイムアウトしました。インターネット接続を確認してもう一度お試しください。',
                en: '⏳ Request timeout. Please check your internet connection and try again.'
            },
            'network-error': {
                ja: '🌐 ネットワークエラーが発生しました。接続を確認してください。',
                en: '🌐 Network error. Please check your internet connection.'
            },
            'validation-error': {
                ja: '⚠️ 入力内容に誤りがあります。フォームを確認してください。',
                en: '⚠️ Validation error. Please check the form fields.'
            }
        };

        let message = messages[type]?.[lang] || messages['error'][lang];

        // Ajouter les détails de l'erreur si disponibles
        if (details && (type === 'error' || type === 'validation-error')) {
            console.error('[Contact Form] Error details:', details);
        }

        // Créer une notification toast élégante
        createToastNotification(message, type);
    }

    function createToastNotification(message, type) {
        // Supprimer les anciennes notifications
        const existingToast = document.querySelector('.contact-toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Créer la nouvelle notification
        const toast = document.createElement('div');
        toast.className = `contact-toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${getIconForType(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        document.body.appendChild(toast);

        // Animation d'entrée
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto-fermeture après 8 secondes
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 8000);
    }

    function getIconForType(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'rate-limit': '⏱️',
            'timeout': '⏳',
            'network-error': '🌐',
            'validation-error': '⚠️'
        };
        return icons[type] || '❌';
    }

    function resetForm() {
        console.log('🔴 [DEBUG] resetForm() called');
        console.trace('🔴 [DEBUG] resetForm() call stack');

        // Réinitialiser le slider
        sliderVerified = false;
        sliderThumb.style.left = '0px';
        sliderProgress.style.width = '0%';
        sliderThumb.classList.remove('verified');
        sliderThumb.parentElement.style.display = 'block';
        sliderText.style.display = 'block';
        verificationSuccess.style.display = 'none';
        securityVerification.classList.remove('verified');

        // Réinitialiser toutes les erreurs
        form.querySelectorAll('.error').forEach(element => {
            element.classList.remove('error');
        });
        form.querySelectorAll('.form-error-message').forEach(element => {
            element.style.display = 'none';
        });

        // Réactiver le bouton
        submitButton.disabled = true;
        submitButton.classList.remove('enabled');
        const buttonText = submitButton.querySelector('.button-text');
        const buttonLoader = submitButton.querySelector('.button-loader');
        if (buttonText) buttonText.style.display = 'inline-block';
        if (buttonLoader) buttonLoader.style.display = 'none';

        console.log('🔴 [DEBUG] resetForm() completed');
    }

    // ==================== EVENT LISTENERS ====================

    function init() {
        if (!form || !submitButton) {
            console.error('❌ Form or button not found');
            return;
        }

        console.log('✅ [Contact Form] Form found');

        // Masquer le slider par défaut
        if (securityVerification) {
            securityVerification.style.display = 'none';
        }

        // ✅ CAPTURER SUR LE CLICK DU BOUTON (pas sur submit)
        submitButton.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            console.log('🟢 [DEBUG] Button clicked - capturing data NOW');

            // ✅ CAPTURER LES VALEURS IMMÉDIATEMENT
            const capturedData = {
                name: form.querySelector('[name="name"]')?.value || '',
                email: form.querySelector('[name="email"]')?.value || '',
                company: form.querySelector('[name="company"]')?.value || '',
                phone: form.querySelector('[name="phone"]')?.value || '',
                service: form.querySelector('[name="service"]')?.value || '',
                message: form.querySelector('[name="message"]')?.value || '',
                consent: form.querySelector('[name="consent"]')?.checked || false
            };

            console.log('📊 [DEBUG] CAPTURED DATA:', capturedData);

            // Validation
            if (!capturedData.name || capturedData.name.trim().length < 2) {
                console.warn('❌ Name validation failed');
                showNotification('validation-error');
                return;
            }

            if (!capturedData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(capturedData.email)) {
                console.warn('❌ Email validation failed');
                showNotification('validation-error');
                return;
            }

            if (!capturedData.message || capturedData.message.trim().length < 10) {
                console.warn('❌ Message validation failed');
                showNotification('validation-error');
                return;
            }

            if (!capturedData.consent) {
                console.warn('❌ Consent validation failed');
                showNotification('validation-error');
                return;
            }

            if (!sliderVerified) {
                console.warn('❌ Slider validation failed');
                showNotification('validation-error');
                return;
            }

            console.log('✅✅✅ Validation SUCCESS - Sending...');

            // Désactiver le bouton
            submitButton.disabled = true;
            const buttonText = submitButton.querySelector('.button-text');
            const buttonLoader = submitButton.querySelector('.button-loader');
            if (buttonText) buttonText.style.display = 'none';
            if (buttonLoader) buttonLoader.style.display = 'inline-block';

            // Envoyer
            try {
                const response = await fetch('/.netlify/functions/contact-form-proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: capturedData.name.trim(),
                        email: capturedData.email.trim().toLowerCase(),
                        company: capturedData.company.trim(),
                        phone: capturedData.phone.trim(),
                        service: capturedData.service,
                        message: capturedData.message.trim(),
                        consent: capturedData.consent,
                        language: getCurrentLanguage(),
                        timestamp: new Date().toISOString(),
                        source: 'website-contact-form'
                    })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    console.log('✅✅✅ SUCCESS - Data sent to n8n!');
                    showNotification('success');
                    form.reset();
                    sliderVerified = false;
                    // Reset slider visuellement
                    const thumb = document.getElementById('sliderThumb');
                    const progress = document.getElementById('sliderProgress');
                    if (thumb) thumb.style.left = '0px';
                    if (progress) progress.style.width = '0%';
                } else {
                    console.error('❌ Error:', result);
                    showNotification('error', result);
                }

            } catch (error) {
                console.error('❌ Network error:', error);
                showNotification('network-error');
            } finally {
                submitButton.disabled = false;
                if (buttonText) buttonText.style.display = 'inline-block';
                if (buttonLoader) buttonLoader.style.display = 'none';
            }
        });

        // Empêcher le submit du form (au cas où)
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('⚠️ Form submit blocked - using button click instead');
        });

        // Initialiser le slider
        initSlider();

        // Validation en temps réel pour afficher le slider
        form.querySelectorAll('input, textarea, select').forEach(field => {
            if (field.type === 'checkbox') {
                field.addEventListener('change', () => {
                    checkFormValidity();
                });
            } else {
                field.addEventListener('input', () => {
                    checkFormValidity();
                });
            }
        });

        console.log('[Contact Form] Validation initialized successfully');
    }

    // Initialiser quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Réinitialiser après le chargement des composants
    document.addEventListener('componentsLoaded', () => {
        console.log('[Contact Form] Reinitializing after components loaded');
        setTimeout(init, 200);
    });

})();
