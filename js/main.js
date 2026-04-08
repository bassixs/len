const USE_WOO = import.meta.env.VITE_USE_WOO === 'true';

function extractWooIdFromHref(href) {
    try {
        const url = new URL(href, window.location.origin);
        if (!/product\.html$/i.test(url.pathname)) return '';
        return String(url.searchParams.get('woo') || '').trim();
    } catch {
        return '';
    }
}

function initWooProductPrefetch() {
    if (!USE_WOO) return;

    const prefetched = new Set();
    let wooClientPromise = null;

    const prefetchWooProduct = (wooId) => {
        const id = String(wooId || '').trim();
        if (!id || prefetched.has(id)) return;
        prefetched.add(id);

        if (!wooClientPromise) {
            wooClientPromise = import('./modules/woo-client.js');
        }

        wooClientPromise
            .then(({ fetchWooProduct }) => fetchWooProduct(id))
            .catch(() => {
                prefetched.delete(id);
            });
    };

    const getElementTarget = (event) => {
        const t = event?.target;
        return t && t.nodeType === 1 ? t : null;
    };

    const handlePrefetchFromEvent = (event) => {
        const targetEl = getElementTarget(event);
        if (!targetEl) return;
        const link = targetEl.closest('a[href*="product.html?woo="]');
        if (!link) return;
        const wooId = extractWooIdFromHref(link.getAttribute('href') || link.href || '');
        if (wooId) prefetchWooProduct(wooId);
    };

    document.addEventListener('pointerdown', handlePrefetchFromEvent, true);
    document.addEventListener('focusin', handlePrefetchFromEvent, true);
    document.addEventListener('touchstart', handlePrefetchFromEvent, {
        capture: true,
        passive: true,
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const tasks = [];

    tasks.push(
        import('./modules/navigation.js').then(({ initNavigation }) => {
            initNavigation();
        })
    );
    tasks.push(
        import('./modules/cart.js').then(({ initCart }) => {
            initCart();
        })
    );
    tasks.push(
        import('./modules/forms.js').then(({ initForms }) => {
            initForms();
        })
    );

    if (document.getElementById('productGallery')) {
        tasks.push(
            import('./modules/product.js').then(({ initProductPage }) => {
                initProductPage();
            })
        );
    }

    if (document.getElementById('productsSlider')) {
        tasks.push(
            import('./modules/sliders.js').then(({ initSliders }) => {
                initSliders();
            })
        );
    }

    if (document.querySelector('.reveal')) {
        tasks.push(
            import('./modules/animations.js').then(({ initAnimations }) => {
                initAnimations();
            })
        );
    }

    if (document.querySelector('.catalog-grid')) {
        tasks.push(
            import('./modules/catalog.js').then(({ initCatalog }) => {
                initCatalog();
            })
        );
    }

    if (document.querySelector('.new-products-grid')) {
        tasks.push(
            import('./modules/new-arrivals.js').then(({ initNewArrivals }) => {
                initNewArrivals();
            })
        );
    }

    if (document.getElementById('categoryGrid')) {
        tasks.push(
            import('./modules/category-products.js').then(({ initCategoryProducts }) => {
                initCategoryProducts();
            })
        );
    }

    if (document.querySelector('.product-card')) {
        tasks.push(
            import('./modules/product-cards.js').then(({ initProductCards }) => {
                initProductCards();
            })
        );
    }

    initWooProductPrefetch();

    Promise.allSettled(tasks).catch(() => {});
});
