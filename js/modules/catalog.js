export function initCatalog() {
    // ===== CATEGORY PAGE — FILTER GROUPS =====
    document.querySelectorAll('.filter-group-title').forEach(title => {
        title.addEventListener('click', () => {
            const body = title.nextElementSibling;
            if (body) body.classList.toggle('open');
            const icon = title.querySelector('i');
            if (icon) {
                icon.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
            }
        });
    });

    // Open first few filter groups by default
    document.querySelectorAll('.filter-group-body').forEach((body, i) => {
        if (i < 3) body.classList.add('open');
    });

    // ===== CATEGORY PAGE — FILTER SIDEBAR MOBILE TOGGLE =====
    const filterToggle = document.querySelector('.filter-toggle-btn');
    const filterSidebar = document.querySelector('.category-sidebar');

    if (filterToggle && filterSidebar) {
        filterToggle.addEventListener('click', () => {
            filterSidebar.classList.toggle('mobile-open');
            document.body.style.overflow = filterSidebar.classList.contains('mobile-open') ? 'hidden' : '';
        });
    }

    // ===== CATEGORY PAGE — VIEW TOGGLE =====
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ===== DYNAMIC PRODUCT RENDERING (из data/products/index.json + preview) =====
    const catalogGrid = document.querySelector('.catalog-grid');
    if (catalogGrid) {
        const dataBase = import.meta.env.DEV ? '/data/products/' : (import.meta.env.BASE_URL || '/') + 'data/products/';
        const base = import.meta.env.DEV ? '/' : (import.meta.env.BASE_URL || '/');
        fetch(dataBase + 'index.json')
            .then(response => response.json())
            .then(index => {
                const preview = index.preview || [];
                const total = index.total != null ? index.total : preview.length;
                renderProducts(preview, catalogGrid, base);
                updateCatalogCount(total);
            })
            .catch(error => {
                console.error('Error loading catalog index:', error);
                catalogGrid.innerHTML = '<p class="catalog-empty">Не удалось загрузить каталог. Попробуйте позже.</p>';
            });
    }
}

function updateCatalogCount(total) {
    const el = document.querySelector('.ch-count');
    if (el && total > 0) el.textContent = `Все изделия (${total}+)`;
}

function renderProducts(products, container, base = '') {
    if (!Array.isArray(products) || products.length === 0) {
        container.innerHTML = '<p class="catalog-empty">В каталоге пока нет товаров.</p>';
        return;
    }
    const imgBase = base || (import.meta.env.DEV ? '/' : (import.meta.env.BASE_URL || '/'));
    const html = products.map((product, index) => {
        const delay = (index % 4) + 1;
        const imgSrc = (product.image && product.image.startsWith('http')) ? product.image : (imgBase + (product.image || 'images/product.tablecloth.webp').replace(/^\//, ''));
        const name = escapeHtml(product.name || '');
        const price = Number(product.price) || 0;

        let badgesHtml = '';
        if (product.badges && product.badges.length > 0) {
            badgesHtml = `<div class="product-badges">
                ${product.badges.map(b => `<span class="badge badge-${String(b).toLowerCase()}">${escapeHtml(b)}</span>`).join('')}
            </div>`;
        }

        let sizesHtml = '';
        if (product.sizes && product.sizes.length > 0) {
            sizesHtml = `<div class="product-sizes">
                ${product.sizes.map(s => `<span class="size-item available">${escapeHtml(s)}</span>`).join('')}
            </div>`;
        }

        let colorsHtml = '';
        if (product.colors && product.colors.length > 0) {
            colorsHtml = `<div class="product-colors">
                ${product.colors.map(c => {
                    const extraStyle = c === '#FFFFFF' ? 'border-color:#ddd' : '';
                    return `<span class="color-dot" style="background:${c}; ${extraStyle}"></span>`;
                }).join('')}
            </div>`;
        }

        let priceHtml = `<span class="price-current">${price.toLocaleString('ru-RU')} ₽</span>`;
        if (product.oldPrice) {
            priceHtml += `<span class="price-old">${Number(product.oldPrice).toLocaleString('ru-RU')} ₽</span>`;
        }

        return `
            <div class="product-card reveal reveal-delay-${delay}">
                <div class="product-card-image">
                    <img src="${imgSrc}" loading="lazy" alt="${name}">
                    ${badgesHtml}
                    ${sizesHtml}
                    <div class="product-quick-view">
                        <a href="product.html?id=${encodeURIComponent(product.id || '')}" class="product-quick-btn">Подробнее</a>
                    </div>
                </div>
                <div class="product-card-info">
                    <h3 class="product-card-name">${name}</h3>
                    <div class="product-card-price">${priceHtml}</div>
                    ${colorsHtml}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
