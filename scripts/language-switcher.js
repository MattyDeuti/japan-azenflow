// Language Switcher - VERSION AVEC IMAGES SVG
// Drapeaux professionnels garantis !

(function() {
    'use strict';

    // Détecter la langue du navigateur si aucune préférence sauvegardée
    const browserLang = navigator.language || navigator.userLanguage;
    const defaultLang = browserLang.startsWith('ja') ? 'ja' : 'en';
    let currentLang = localStorage.getItem('preferredLanguage') || defaultLang;

    // Utilise des images SVG de drapeaux (CDN Flagpack)
    const languages = {
        ja: {
            code: 'EN',
            flag: 'gb',  // Code ISO pour le drapeau UK
            htmlLang: 'ja'
        },
        en: {
            code: 'JP',
            flag: 'jp',  // Code ISO pour le drapeau Japon
            htmlLang: 'en'
        }
    };

    function initLanguage() {
        // Appliquer la langue immédiatement avant tout chargement
        document.documentElement.lang = languages[currentLang].htmlLang;
        setLanguage(currentLang, false);
        updateLanguageButton();
    }

    function setLanguage(lang, savePreference = true) {
        currentLang = lang;
        document.documentElement.lang = languages[lang].htmlLang;
        updateTextContent(lang);
        if (savePreference) {
            localStorage.setItem('preferredLanguage', lang);
        }
    }

    function updateTextContent(lang) {
        const attribute = `data-${lang}`;
        document.querySelectorAll(`[${attribute}]`).forEach(element => {
            const text = element.getAttribute(attribute);
            if (element.tagName === 'INPUT' && element.type === 'text') {
                // Ne mettre à jour que si différent
                if (element.placeholder !== text) {
                    element.placeholder = text;
                }
            } else {
                // Vérifier si le texte est déjà correct (évite le re-render pour LCP)
                const currentText = element.textContent.trim();
                if (currentText !== text) {
                    // Préserver les images dans le contenu
                    if (element.querySelector('img')) {
                        // Si l'élément contient une image, ne remplacer que le texte après l'image
                        const img = element.querySelector('img');
                        element.innerHTML = '';
                        element.appendChild(img);
                        element.appendChild(document.createTextNode(' ' + text));
                    } else {
                        element.innerHTML = text;
                    }
                }
            }
        });

        const placeholderAttr = `data-placeholder-${lang}`;
        document.querySelectorAll(`[${placeholderAttr}]`).forEach(element => {
            if (element.placeholder !== element.getAttribute(placeholderAttr)) {
                element.placeholder = element.getAttribute(placeholderAttr);
            }
        });
    }

    function updateLanguageButton() {
        const langSwitcher = document.getElementById('langSwitcher');
        if (!langSwitcher) return;

        const flagCode = languages[currentLang].flag;
        const textCode = languages[currentLang].code;

        // Utilise le CDN Flagpack pour les drapeaux SVG
        langSwitcher.innerHTML = `
            <img 
                src="https://flagcdn.com/24x18/${flagCode}.png" 
                srcset="https://flagcdn.com/48x36/${flagCode}.png 2x, https://flagcdn.com/72x54/${flagCode}.png 3x"
                width="24" 
                height="18" 
                alt="${textCode} flag"
                class="lang-flag-img">
            <span class="lang-code">${textCode}</span>
        `;
        
        console.log('✅ Language button updated with flag image:', flagCode, textCode);
    }

    function toggleLanguage() {
        const newLang = currentLang === 'ja' ? 'en' : 'ja';
        console.log('🔄 Switching language from', currentLang, 'to', newLang);
        
        setLanguage(newLang);
        updateLanguageButton();

        const langSwitcher = document.getElementById('langSwitcher');
        if (langSwitcher) {
            langSwitcher.classList.add('pulse-once');
            setTimeout(() => langSwitcher.classList.remove('pulse-once'), 500);
        }
    }

    function setupEventListeners() {
        const langSwitcher = document.getElementById('langSwitcher');
        if (langSwitcher) {
            langSwitcher.removeEventListener('click', toggleLanguage);
            langSwitcher.addEventListener('click', toggleLanguage);
            console.log('✅ Language switcher attached');
        }
    }

    function addStyles() {
        if (!document.getElementById('lang-switcher-styles')) {
            const style = document.createElement('style');
            style.id = 'lang-switcher-styles';
            style.textContent = `
                @keyframes pulseOnce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                .pulse-once {
                    animation: pulseOnce 0.5s ease;
                }
                .lang-flag-img {
                    border-radius: 2px;
                    object-fit: cover;
                }
                .lang-code {
                    font-weight: 700;
                    font-size: 0.875rem;
                    color: var(--text-primary);
                }
            `;
            document.head.appendChild(style);
        }
    }

    function init() {
        initLanguage();
        setupEventListeners();
        addStyles();
    }

    // Initialiser IMMÉDIATEMENT la langue (avant même DOMContentLoaded)
    // pour éviter le flash de texte japonais
    document.documentElement.lang = languages[currentLang].htmlLang;

    window.LanguageSwitcher = {
        getCurrentLanguage: () => currentLang,
        setLanguage: (lang) => {
            if (languages[lang]) {
                setLanguage(lang);
                updateLanguageButton();
            }
        },
        toggleLanguage,
        init,
        setupEventListeners,
        // Fonction exposée pour traduire un élément spécifique (utilisé par component-loader)
        translateElement: (element) => {
            if (!element) return;

            const lang = currentLang;
            const attribute = `data-${lang}`;

            // Traduire l'élément lui-même
            if (element.hasAttribute(attribute)) {
                const text = element.getAttribute(attribute);
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    if (element.placeholder !== text) {
                        element.placeholder = text;
                    }
                } else {
                    const currentText = element.textContent.trim();
                    if (currentText !== text) {
                        // Préserver les images dans le contenu
                        if (element.querySelector('img')) {
                            const img = element.querySelector('img');
                            element.innerHTML = '';
                            element.appendChild(img);
                            element.appendChild(document.createTextNode(' ' + text));
                        } else {
                            element.innerHTML = text;
                        }
                    }
                }
            }

            // Traduire tous les enfants
            element.querySelectorAll(`[${attribute}]`).forEach(el => {
                const text = el.getAttribute(attribute);
                if (el.tagName === 'INPUT' && el.type === 'text') {
                    if (el.placeholder !== text) {
                        el.placeholder = text;
                    }
                } else {
                    const currentText = el.textContent.trim();
                    if (currentText !== text) {
                        // Préserver les images dans le contenu
                        if (el.querySelector('img')) {
                            const img = el.querySelector('img');
                            el.innerHTML = '';
                            el.appendChild(img);
                            el.appendChild(document.createTextNode(' ' + text));
                        } else {
                            el.innerHTML = text;
                        }
                    }
                }
            });

            const placeholderAttr = `data-placeholder-${lang}`;
            element.querySelectorAll(`[${placeholderAttr}]`).forEach(el => {
                if (el.placeholder !== el.getAttribute(placeholderAttr)) {
                    el.placeholder = el.getAttribute(placeholderAttr);
                }
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    document.addEventListener('componentsLoaded', () => {
        console.log('🔄 Components loaded, reinitializing...');
        // Appliquer immédiatement sans délai pour éviter le flash de contenu japonais
        updateTextContent(currentLang);
        setupEventListeners();
        updateLanguageButton();
    });
})();