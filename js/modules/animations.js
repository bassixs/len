export function initAnimations() {
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

    function observeReveals(root = document) {
        root.querySelectorAll('.reveal:not(.visible)').forEach(el => {
            revealObserver.observe(el);
        });
    }

    observeReveals(document);

    // Observe dynamically rendered sections (catalog/category cards and other async blocks).
    const mutationObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                if (node.classList && node.classList.contains('reveal')) {
                    revealObserver.observe(node);
                } else {
                    observeReveals(node);
                }
            });
        });
    });

    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

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
