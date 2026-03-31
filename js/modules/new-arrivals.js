import { normalizeProduct, formatPrice, resolveImageUrl, safeText } from './product-model.js';
import { showToast } from './toast.js';
import { fetchWooProducts } from './woo-client.js';
import { wooProductToCard } from './woo-map.js';

const USE_WOO = import.meta.env.VITE_USE_WOO === 'true';
const WOO_LIST_FIELDS = 'id,name,price,regular_price,sale_price,images,sku,categories,stock_status';

function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function renderCard(raw, index) {
    const product = normalizeProduct(raw);
    const delay = (index % 4) + 1;
    const imgSrc = resolveImageUrl(product.image);
    const name = safeText(product.name);
    const idParam = encodeURIComponent(product.id || '');
    const detailHref = USE_WOO ? `product.html?woo=${idParam}` : `product.html?id=${idParam}`;
    const oldPrice =
        product.oldPrice != null
            ? `<span class="price-old">${formatPrice(product.oldPrice)}</span>`
            : '';
    const isOutOfStock = !product.inStock;
    const stockBadge = isOutOfStock
        ? '<span class="badge badge-out">Нет в наличии</span>'
        : '<span class="badge badge-new">NEW</span>';

    return `
        <div class="product-card reveal reveal-delay-${delay}" data-product-id="${safeText(product.id)}">
            <div class="product-card-image">
                <img src="${safeText(imgSrc)}" loading="lazy" alt="${name}" />
                <div class="product-badges">
                    ${stockBadge}
                </div>
                <div class="product-quick-view">
                    <a href="${detailHref}" class="product-quick-btn">Подробнее</a>
                </div>
            </div>
            <div class="product-card-info">
                <h3 class="product-card-name">${name}</h3>
                <div class="product-card-price">
                    <span class="price-current">${formatPrice(product.price)}</span>${oldPrice}
                </div>
                <button
                    type="button"
                    class="btn btn-outline add-to-cart-btn"
                    data-product-id="${safeText(product.id)}"
                    style="margin-top: 0.5rem; width: 100%"
                    ${isOutOfStock ? 'disabled' : ''}
                >
                    ${isOutOfStock ? 'Нет в наличии' : 'В корзину'}
                </button>
            </div>
        </div>
    `;
}

async function loadWooRandomProducts() {
    const { products } = await fetchWooProducts({
        page: 1,
        perPage: 100,
        orderBy: 'date',
        order: 'desc',
        fields: WOO_LIST_FIELDS,
    });
    return products.map((p) => normalizeProduct(wooProductToCard(p))).filter((p) => p.id && p.name);
}

async function loadFallbackProducts() {
    const base = (import.meta.env.BASE_URL || '/') + 'data/products/';
    const res = await fetch(base + 'index.json');
    if (!res.ok) throw new Error(`Cannot load index.json: HTTP ${res.status}`);
    const index = await res.json();
    const preview = Array.isArray(index.preview) ? index.preview.map(normalizeProduct) : [];
    return preview;
}

export function initNewArrivals() {
    const grid = document.querySelector('.new-products-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="catalog-loading">Загрузка новинок...</div>';

    const countEl = document.getElementById('newArrivalsCount');
    const loader = USE_WOO ? loadWooRandomProducts : loadFallbackProducts;

    loader()
        .then((products) => {
            if (!products.length) {
                grid.innerHTML = '<p class="catalog-empty">Новинки пока не найдены.</p>';
                if (countEl) countEl.textContent = '(0)';
                return;
            }

            const picks = shuffle(products).slice(0, 12);
            grid.innerHTML = picks.map(renderCard).join('');
            if (countEl) countEl.textContent = `(${picks.length})`;
        })
        .catch((err) => {
            console.error('New arrivals load error:', err);
            grid.innerHTML = '<p class="catalog-empty">Не удалось загрузить новинки.</p>';
            showToast('Ошибка загрузки новинок', 'error');
        });
}
