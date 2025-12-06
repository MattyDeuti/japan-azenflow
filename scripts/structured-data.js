/**
 * STRUCTURED DATA (JSON-LD) - AzenFlow
 * Ajoute les données structurées Schema.org pour améliorer le SEO
 * Détecte automatiquement la langue et injecte les données appropriées
 */

(function() {
    'use strict';

    // Langue du site (japonais uniquement)
    const currentLang = 'ja';

    // ============================================
    // DONNÉES : ORGANIZATION (ENTREPRISE)
    // ============================================
    const organizationData = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': 'https://azenflow.com/#organization',
        name: 'AzenFlow',
        alternateName: 'アゼンフロー',

        // Description adaptée à la langue
        description: currentLang === 'ja'
            ? '日本の中小企業向けAIチャットボットソリューション。LINE、Webチャット、メールアシスタントで業務効率化を実現。'
            : 'AI Chatbot Solutions for Japanese SMEs. Streamline operations with LINE, Web Chat, and Email Assistant.',

        // URLs et images
        url: 'https://azenflow.com/',
        logo: 'https://azenflow.com/images/azenflow-logo.png',
        image: 'https://azenflow.com/images/og-image.jpg',

        // Adresse (Tokyo, Japon)
        address: {
            '@type': 'PostalAddress',
            addressRegion: 'Tokyo',
            addressCountry: 'JP'
        },

        // Zone de service
        areaServed: {
            '@type': 'Country',
            name: 'Japan'
        },

        // Réseaux sociaux
        sameAs: [
            'https://line.me/ti/p/@azenflow',
            'https://www.linkedin.com/company/azenflow'
        ],

        // Point de contact
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Service',
            availableLanguage: ['Japanese', 'English']
        }
    };

    // ============================================
    // DONNÉES : WEBSITE (SITE WEB)
    // ============================================
    const websiteData = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': 'https://azenflow.com/#website',
        url: 'https://azenflow.com/',
        name: 'AzenFlow',
        description: organizationData.description,
        publisher: {
            '@id': 'https://azenflow.com/#organization'
        },
        inLanguage: ['ja', 'en']
    };

    // ============================================
    // FONCTION : INJECTER LES DONNÉES STRUCTURÉES
    // ============================================
    function injectStructuredData() {
        // 1. Injecter Organization data
        const orgScript = document.createElement('script');
        orgScript.type = 'application/ld+json';
        orgScript.textContent = JSON.stringify(organizationData);
        document.head.appendChild(orgScript);

        // 2. Injecter Website data
        const webScript = document.createElement('script');
        webScript.type = 'application/ld+json';
        webScript.textContent = JSON.stringify(websiteData);
        document.head.appendChild(webScript);

        // 3. Log de confirmation
        console.log('✓ Structured data (JSON-LD) loaded');
        console.log('  - Organization schema: ✓');
        console.log('  - Website schema: ✓');
        console.log('  - Language detected:', currentLang);
    }

    // ============================================
    // EXÉCUTION : CHARGER AU DOM READY
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStructuredData);
    } else {
        injectStructuredData();
    }

})();
