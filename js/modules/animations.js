export function initAnimations() {
    const revealElements = document.querySelectorAll('.reveal');

    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    }

    // ===== PRELOAD IMAGES =====
    function preloadImage(src) {
        const img = new Image();
        img.src = src;
    }

    // Preload hero and collection images after page load
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');

        // Preload collection images
        document.querySelectorAll('.collection-card-bg').forEach(bg => {
            const src = bg.style.backgroundImage.replace(/url\(['"]?/, '').replace(/['"]?\)/, '');
            if (src) preloadImage(src);
        });
    });

    // ===== ABOUT PAGE — BRUTAL MINIMALISM CURSOR IMAGE =====
    const cursorContainer = document.getElementById('cursor-img-container');
    const hoverWords = document.querySelectorAll('.hover-img-word');

    if (cursorContainer && hoverWords.length > 0) {
        let imgEl = cursorContainer.querySelector('img');
        if (!imgEl) {
            imgEl = document.createElement('img');
            cursorContainer.appendChild(imgEl);
        }

        document.addEventListener('mousemove', (e) => {
            requestAnimationFrame(() => {
                cursorContainer.style.left = e.clientX + 'px';
                cursorContainer.style.top = e.clientY + 'px';
            });
        });

        hoverWords.forEach(word => {
            word.addEventListener('mouseenter', () => {
                const imgSrc = word.getAttribute('data-img');
                if (imgSrc) {
                    imgEl.src = imgSrc;
                    cursorContainer.classList.add('active');
                }
            });

            word.addEventListener('mouseleave', () => {
                cursorContainer.classList.remove('active');
            });
        });
    }
}
