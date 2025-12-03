// ============================================
// COMPONENT LOADER
// Charge automatiquement header et footer
// ============================================

(function() {
    'use strict';

    // Fonction pour charger un composant HTML
    async function loadComponent(elementId, componentPath) {
        try {
            const response = await fetch(componentPath);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            const element = document.getElementById(elementId);

            if (element) {
                element.innerHTML = html;

                // Appliquer immédiatement la langue si LanguageSwitcher est déjà chargé
                if (window.LanguageSwitcher && typeof window.LanguageSwitcher.translateElement === 'function') {
                    window.LanguageSwitcher.translateElement(element);
                }

                return true;
            } else {
                console.error(`Element with id "${elementId}" not found`);
                return false;
            }
        } catch (error) {
            console.error(`Error loading component from ${componentPath}:`, error);
            return false;
        }
    }

    // Fonction pour définir la classe active sur le lien de navigation
    function setActiveNavLink() {
        // Attendre un peu que le DOM soit complètement chargé
        setTimeout(() => {
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const navLinks = document.querySelectorAll('.nav-link');
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                const href = link.getAttribute('href');
                
                // Vérifier si c'est la page actuelle
                if (href === currentPage || 
                    (currentPage === '' && href === 'index.html') ||
                    (currentPage === '/' && href === 'index.html')) {
                    link.classList.add('active');
                }
                
                // Pour les liens avec ancres
                if (href && href.includes('#')) {
                    const page = href.split('#')[0];
                    if (page === currentPage || (page === 'index.html' && currentPage === '')) {
                        // Ne pas marquer comme actif les liens avec ancres, sauf si on est sur la page
                    }
                }
            });
        }, 100);
    }

    // Initialiser le chargement des composants
    async function initComponents() {
        // Charger le header
        const headerLoaded = await loadComponent('header-placeholder', 'components/header.html');

        // Charger le footer
        const footerLoaded = await loadComponent('footer-placeholder', 'components/footer.html');

        // Charger la bulle flottante CTA
        const floatingCtaLoaded = await loadComponent('floating-cta-placeholder', 'components/floating-cta.html');

        // Charger le bouton back-to-top
        const backToTopLoaded = await loadComponent('back-to-top-placeholder', 'components/back-to-top.html');

        // Charger le chatbot widget
        const chatbotLoaded = await loadComponent('chatbot-widget-placeholder', 'components/chatbot-widget.html');

        // Charger la bannière de cookies
        const cookieBannerLoaded = await loadComponent('cookie-banner-placeholder', 'components/cookie-banner.html');

        // Si tous sont chargés, initialiser les fonctionnalités
        if (headerLoaded && footerLoaded && floatingCtaLoaded && backToTopLoaded && chatbotLoaded && cookieBannerLoaded) {
            // Définir le lien actif
            setActiveNavLink();

            // Réinitialiser les event listeners (ils seront ajoutés par main.js)
            // Dispatch un événement personnalisé pour signaler que les composants sont chargés
            document.dispatchEvent(new CustomEvent('componentsLoaded'));

            console.log('✅ Header, Footer, Floating CTA, Back to Top, Chatbot Widget et Cookie Banner chargés avec succès');
        }
    }

    // Charger les composants quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComponents);
    } else {
        initComponents();
    }

    // Export pour utilisation externe si nécessaire
    window.ComponentLoader = {
        loadComponent,
        reload: initComponents
    };
})();