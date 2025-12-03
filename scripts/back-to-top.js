/**
 * Back to Top Button Component
 * Affiche un bouton pour remonter en haut de la page lors du scroll
 */
(function() {
    'use strict';

    function initBackToTop() {
        const backToTop = document.getElementById('backToTop');

        if (!backToTop) {
            // Bouton se charge via component-loader (silencieux si absent)
            return;
        }

        // Afficher/masquer le bouton selon la position de scroll
        function toggleVisibility() {
            if (window.pageYOffset > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }

        // Remonter en haut de la page
        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Event listeners
        window.addEventListener('scroll', toggleVisibility);
        backToTop.addEventListener('click', scrollToTop);

        // Vérifier la position initiale
        toggleVisibility();
    }

    // Initialiser quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackToTop);
    } else {
        initBackToTop();
    }

    // Réinitialiser après le chargement des composants
    document.addEventListener('componentsLoaded', () => {
        setTimeout(initBackToTop, 100);
    });
})();
