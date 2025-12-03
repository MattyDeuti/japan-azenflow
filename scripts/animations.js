// Animation Controller for AzenFlow Website
(function() {
    'use strict';

    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    // Initialize reveal on scroll observer
    function initRevealOnScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    // Optional: unobserve after revealing for performance
                    // observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all elements with reveal-on-scroll class
        document.querySelectorAll('.reveal-on-scroll').forEach(element => {
            observer.observe(element);
        });
    }

    // Parallax effect for mouse movement
    function initParallaxEffect() {
        const parallaxElements = document.querySelectorAll('.parallax');
        
        if (parallaxElements.length === 0) return;

        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;

            parallaxElements.forEach((element, index) => {
                const speed = (index + 1) * 0.05;
                const x = (mouseX - 0.5) * 50 * speed;
                const y = (mouseY - 0.5) * 50 * speed;

                element.style.transform = `translate(${x}px, ${y}px)`;
            });
        });
    }

    // Smooth scroll for anchor links
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Skip if it's just "#"
                if (href === '#') {
                    e.preventDefault();
                    return;
                }

                const target = document.querySelector(href);
                
                if (target) {
                    e.preventDefault();
                    const rect = target.getBoundingClientRect();
                    const offsetTop = rect.top + window.pageYOffset - 100; // Account for fixed navbar

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // Navbar scroll effect
    function initNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            // Add scrolled class when scrolled down
            if (currentScroll > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        });
    }

    // Animated counter for statistics
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        const isDecimal = target % 1 !== 0;

        const timer = setInterval(() => {
            start += increment;
            
            if (start >= target) {
                element.textContent = isDecimal ? target.toFixed(1) : Math.floor(target);
                clearInterval(timer);
            } else {
                element.textContent = isDecimal ? start.toFixed(1) : Math.floor(start);
            }
        }, 16);
    }

    // Initialize counters when visible
    function initCounters() {
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.counted) {
                    const target = parseFloat(entry.target.dataset.target);
                    animateCounter(entry.target, target);
                    entry.target.dataset.counted = 'true';
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('[data-target]').forEach(element => {
            counterObserver.observe(element);
        });
    }

    // Add floating animation to cards
    function initFloatingCards() {
        const cards = document.querySelectorAll('.floating-card');
        
        cards.forEach((card, index) => {
            // Random delay for more natural effect
            const delay = Math.random() * 2;
            card.style.animationDelay = `${delay}s`;
        });
    }

    // Tilt effect on hover for cards - DÉSACTIVÉ
    function initTiltEffect() {
        // Fonction désactivée - pas d'effet tilt sur les cartes
    }

    // Progress bar animation
    function initProgressBars() {
        const progressObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const progressBar = entry.target.querySelector('.progress-bar');
                    if (progressBar && !progressBar.classList.contains('animated')) {
                        progressBar.classList.add('animated');
                        progressBar.style.animation = 'progressLoad 2s ease-in-out forwards';
                    }
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('.card-progress').forEach(element => {
            progressObserver.observe(element);
        });
    }

    // Stagger animation for lists
    function initStaggerAnimation() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const items = entry.target.querySelectorAll('li');
                    items.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'translateX(0)';
                        }, index * 100);
                    });
                }
            });
        }, { threshold: 0.3 });

        document.querySelectorAll('.summary-list, .service-features').forEach(list => {
            const items = list.querySelectorAll('li');
            items.forEach(item => {
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                item.style.transition = 'all 0.5s ease';
            });
            observer.observe(list);
        });
    }

    // Button ripple effect
    function initRippleEffect() {
        document.querySelectorAll('.btn-primary, .btn-secondary, .cta-button, .btn-cta').forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.5);
                    left: ${x}px;
                    top: ${y}px;
                    pointer-events: none;
                    animation: rippleEffect 0.6s ease-out;
                `;

                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);

                setTimeout(() => ripple.remove(), 600);
            });
        });

        // Add ripple animation CSS
        if (!document.getElementById('ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes rippleEffect {
                    0% {
                        transform: scale(0);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Loading animation
    function initPageLoad() {
        window.addEventListener('load', () => {
            document.body.classList.add('loaded');
            
            // Trigger initial animations
            setTimeout(() => {
                document.querySelectorAll('.fade-in-up, .fade-in-right').forEach(element => {
                    element.style.opacity = '1';
                    element.style.transform = 'translate(0, 0)';
                });
            }, 100);
        });
    }

    // Image lazy loading
    function initLazyLoading() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Initialize all animations
    function init() {
        initRevealOnScroll();
        initParallaxEffect();
        initSmoothScroll();
        initNavbarScroll();
        initCounters();
        initFloatingCards();
        initTiltEffect();
        initProgressBars();
        initStaggerAnimation();
        initRippleEffect();
        initPageLoad();
        initLazyLoading();
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for external use
    window.AzenFlowAnimations = {
        animateCounter,
        init
    };
})();