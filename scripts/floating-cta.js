// ============================================
// FLOATING CTA BUTTON SCRIPT
// Fichier: scripts/floating-cta.js
// ============================================

(function() {
    'use strict';

    function initFloatingCta() {
        const floatingCta = document.getElementById('floatingCta');
        const floatingButton = floatingCta?.querySelector('.floating-cta-button');

        if (!floatingButton) {
            console.warn('[Floating CTA] Button not found');
            return;
        }

        // Si c'est un bouton (pas un lien), ajouter un event listener
        if (floatingButton.tagName === 'BUTTON') {
            floatingButton.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'contact.html';
                console.log('[Floating CTA] Clicked - Redirecting to contact page');
            });
            console.log('[Floating CTA] Event listener attached to button');
        } else if (floatingButton.tagName === 'A') {
            console.log('[Floating CTA] Link detected - href:', floatingButton.href);
        }
    }

    // Initialiser quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFloatingCta);
    } else {
        initFloatingCta();
    }

    // Réinitialiser après le chargement des composants
    document.addEventListener('componentsLoaded', () => {
        console.log('[Floating CTA] Reinitializing after components loaded');
        setTimeout(initFloatingCta, 100);
    });

})();
