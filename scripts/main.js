// Main JavaScript for AzenFlow Website
(function() {
    'use strict';

    // Mobile menu toggle
    function initMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');

        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                menuToggle.classList.toggle('active');

                // Animate hamburger
                const spans = menuToggle.querySelectorAll('span');
                if (menuToggle.classList.contains('active')) {
                    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                    spans[1].style.opacity = '0';
                    spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    spans[0].style.transform = 'none';
                    spans[1].style.opacity = '1';
                    spans[2].style.transform = 'none';
                }
            });

            // Mobile dropdown toggle
            const dropdowns = document.querySelectorAll('.dropdown');
            dropdowns.forEach(dropdown => {
                const link = dropdown.querySelector('.nav-link');
                if (link) {
                    link.addEventListener('click', (e) => {
                        if (window.innerWidth <= 768) {
                            e.preventDefault();
                            dropdown.classList.toggle('active');
                        }
                    });
                }
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.navbar') && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    menuToggle.classList.remove('active');

                    const spans = menuToggle.querySelectorAll('span');
                    spans[0].style.transform = 'none';
                    spans[1].style.opacity = '1';
                    spans[2].style.transform = 'none';
                }
            });

            // Close menu when clicking a link (except dropdown parent)
            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    // Don't close if it's a dropdown parent on mobile
                    if (window.innerWidth <= 768 && link.parentElement.classList.contains('dropdown')) {
                        return;
                    }

                    if (window.innerWidth <= 768) {
                        navMenu.classList.remove('active');
                        menuToggle.classList.remove('active');

                        const spans = menuToggle.querySelectorAll('span');
                        spans[0].style.transform = 'none';
                        spans[1].style.opacity = '1';
                        spans[2].style.transform = 'none';
                    }
                });
            });
        }
    }

    // Update active nav link on scroll
    function initActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        window.addEventListener('scroll', () => {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                
                if (window.pageYOffset >= sectionTop - 100) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }

    // CTA buttons functionality
    function initCTAButtons() {
        const ctaButtons = document.querySelectorAll('.cta-button, .btn-primary, .btn-cta');
        
        ctaButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const text = button.textContent.trim();
                
                // Check if it's a consultation button
                if (text.includes('無料相談') || text.includes('Free Consultation') || 
                    text.includes('無料相談を予約')) {
                    e.preventDefault();
                    // Redirect to contact page or open modal
                    window.location.href = 'contact.html';
                }
            });
        });
    }

    // Form validation
    function initFormValidation() {
        // Exclude PDF download form - it has its own handler in index.html
        const forms = document.querySelectorAll('form:not(#pdfDownloadForm)');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const inputs = form.querySelectorAll('input[required], textarea[required]');
                let isValid = true;

                inputs.forEach(input => {
                    if (!input.value.trim()) {
                        isValid = false;
                        input.classList.add('error');
                        
                        // Remove error class on input
                        input.addEventListener('input', function() {
                            this.classList.remove('error');
                        });
                    }
                });

                if (isValid) {
                    // Show success message
                    showNotification('success');
                    form.reset();
                }
            });
        });
    }

    // Notification system
    function showNotification(type = 'success') {
        const messages = {
            success: 'お問い合わせありがとうございます。担当者より折り返しご連絡させていただきます。',
            error: 'エラーが発生しました。もう一度お試しください。'
        };

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = messages[type];
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#8B6F47' : '#EF4444'};
            color: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 3s;
            max-width: 350px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3300);
    }

    // Add notification animations
    function addNotificationStyles() {
        if (!document.getElementById('notification-style')) {
            const style = document.createElement('style');
            style.id = 'notification-style';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
                input.error, textarea.error {
                    border-color: #EF4444 !important;
                    animation: shake 0.3s;
                }
            `;
            document.head.appendChild(style);
        }
    }


    // Print current page info in console
    function printPageInfo() {
        console.log('%c⚡ AzenFlow Website', 'color: #4F46E5; font-size: 24px; font-weight: bold;');
        console.log('%cBuilt with modern web technologies', 'color: #6B7280; font-size: 14px;');
        console.log('%c© 2025 AzenFlow. All rights reserved.', 'color: #9CA3AF; font-size: 12px;');
    }

    // Performance monitoring
    function monitorPerformance() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = window.performance.timing;
                    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                    
                    if (pageLoadTime < 3000) {
                        console.log('%c✓ Page load time: ' + pageLoadTime + 'ms (Excellent)', 'color: #8B6F47');
                    } else if (pageLoadTime < 5000) {
                        console.log('%c⚠ Page load time: ' + pageLoadTime + 'ms (Good)', 'color: #F59E0B');
                    } else {
                        console.log('%c⚠ Page load time: ' + pageLoadTime + 'ms (Could be improved)', 'color: #EF4444');
                    }
                }, 0);
            });
        }
    }

    // Detect user preferences
    function detectUserPreferences() {
        // Detect dark mode preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            console.log('User prefers dark mode');
            // Could implement dark mode here
        }

        // Detect reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            console.log('User prefers reduced motion');
            document.body.classList.add('reduce-motion');
        }
    }

    // Table scroll indicator for mobile
    function initTableScrollIndicator() {
        const tableWrapper = document.querySelector('.table-responsive');
        const scrollHint = document.querySelector('.table-scroll-hint');

        if (!tableWrapper || !scrollHint) {
            // Pas de tableau sur cette page (normal)
            return;
        }

        // Détection mobile plus robuste
        function isMobile() {
            return window.innerWidth <= 768 ||
                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }

        // Fonction pour vérifier si on peut scroller
        function checkScrollable() {
            // Attendre que le DOM soit complètement rendu
            setTimeout(() => {
                const table = tableWrapper.querySelector('.comparison-table');
                if (!table) return;

                const canScroll = tableWrapper.scrollWidth > tableWrapper.clientWidth;
                const mobile = isMobile();

                console.log('Scroll check:', {
                    canScroll,
                    mobile,
                    scrollWidth: tableWrapper.scrollWidth,
                    clientWidth: tableWrapper.clientWidth,
                    windowWidth: window.innerWidth
                });

                if (mobile) {
                    scrollHint.style.display = 'block';

                    // Ajouter un indicateur visuel de gradient
                    if (!tableWrapper.querySelector('.scroll-gradient-right')) {
                        const gradientRight = document.createElement('div');
                        gradientRight.className = 'scroll-gradient-right';
                        gradientRight.style.cssText = `
                            position: absolute;
                            top: 0;
                            right: 0;
                            width: 60px;
                            height: 100%;
                            background: linear-gradient(to left, rgba(255,255,255,0.95), rgba(255,255,255,0));
                            pointer-events: none;
                            z-index: 5;
                            transition: opacity 0.3s;
                        `;
                        tableWrapper.appendChild(gradientRight);
                    }
                } else {
                    scrollHint.style.display = 'none';
                }
            }, 100);
        }

        // Gérer le scroll pour masquer/afficher le gradient
        tableWrapper.addEventListener('scroll', () => {
            const gradient = tableWrapper.querySelector('.scroll-gradient-right');
            if (gradient) {
                const isScrolledToEnd = tableWrapper.scrollLeft + tableWrapper.clientWidth >= tableWrapper.scrollWidth - 10;
                gradient.style.opacity = isScrolledToEnd ? '0' : '1';
            }

            // Masquer le hint après le premier scroll
            if (tableWrapper.scrollLeft > 0 && scrollHint) {
                scrollHint.style.opacity = '0.5';
            }
        });

        // Vérifier au chargement, après un délai et au redimensionnement
        checkScrollable();
        setTimeout(checkScrollable, 500); // Vérifier à nouveau après 500ms
        setTimeout(checkScrollable, 1000); // Et après 1s pour être sûr
        window.addEventListener('resize', checkScrollable);
        window.addEventListener('orientationchange', checkScrollable);

        // Animation pulse pour attirer l'attention
        if (scrollHint) {
            scrollHint.style.animation = 'pulse 2s infinite';
        }
    }

    // Initialize all functions
    function init() {
        initMobileMenu();
        initActiveNavLink();
        initCTAButtons();
        initFormValidation();
        addNotificationStyles();
        initTableScrollIndicator();
        printPageInfo();
        monitorPerformance();
        detectUserPreferences();
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Réinitialiser après le chargement des composants
    document.addEventListener('componentsLoaded', () => {
        console.log('🔄 Réinitialisation du menu mobile après chargement des composants');
        setTimeout(() => {
            initMobileMenu();
            initCTAButtons();
            initTableScrollIndicator();
        }, 100);
    });

    // Export for external use
    window.AzenFlow = {
        showNotification,
        version: '1.0.0'
    };
})();