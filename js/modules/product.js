import { normalizeProduct, formatPrice, resolveImageUrl, safeText } from './product-model.js';
import { initAccordionGroup } from './accordion.js';

const DATA_PRODUCTS_BASE = `${import.meta.env.BASE_URL || '/'}data/products/`;
const CATEGORY_LABELS = {
    'home-textile': 'Домашний текстиль',
    women: 'Женская одежда',
    men: 'Мужская одежда',
    socks: 'Льняные носки',
    gifts: 'Подарки и сувениры',
    accessories: 'Аксессуары',
    fabrics: 'Льняные ткани',
};

export function initProductPage() {
    // Подгружаем данные товара по id из URL
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    loadProduct(productId).catch((err) => {
        console.error('Product load error:', err);
        showProductLoadError();
    });

    // Accordion Logic
    initAccordionGroup({
        triggerSelector: '.accordion-head',
        triggerActiveClass: 'active',
        bodyOpenClass: 'open',
        closeOthers: false,
    });

    // Color Selector UI Logic
    const colorOptions = document.querySelectorAll('.color-dot');
    const colorNameDisplay = document.getElementById('colorName');

    colorOptions.forEach((option) => {
        option.addEventListener('click', function () {
            colorOptions.forEach((btn) => btn.classList.remove('active'));
            this.classList.add('active');
            if (colorNameDisplay) {
                colorNameDisplay.textContent = this.dataset.color || '';
            }
        });
    });

    // Size Selector UI Logic
    const sizeBtns = document.querySelectorAll('.size-btn');
    sizeBtns.forEach((btn) => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            sizeBtns.forEach((b) => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Quantity Logic
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const qtyInput = document.getElementById('qtyInput');

    if (qtyMinus && qtyPlus && qtyInput) {
        qtyMinus.addEventListener('click', (e) => {
            e.preventDefault();
            let val = parseInt(qtyInput.value) || 1;
            if (val > 1) qtyInput.value = val - 1;
        });

        qtyPlus.addEventListener('click', (e) => {
            e.preventDefault();
            let val = parseInt(qtyInput.value) || 1;
            if (val < parseInt(qtyInput.max || 10)) qtyInput.value = val + 1;
        });
    }
}

async function loadProduct(id) {
    const indexResp = await fetch(`${DATA_PRODUCTS_BASE}index.json`);
    if (!indexResp.ok) {
        throw new Error(`Cannot load index.json: HTTP ${indexResp.status}`);
    }
    const index = await indexResp.json();
    const productCategory = index.productCategory || {};
    let resolvedId = id;
    if (!resolvedId) {
        const fallbackId =
            (Array.isArray(index.preview) && index.preview[0] && index.preview[0].id) ||
            Object.keys(productCategory)[0];
        if (!fallbackId) {
            throw new Error('No products available for fallback');
        }
        resolvedId = fallbackId;
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('id', resolvedId);
        window.history.replaceState({}, '', nextUrl.toString());
    }

    const cat = productCategory[resolvedId];
    if (!cat) {
        throw new Error(`Category for product not found: ${resolvedId}`);
    }

    const catResp = await fetch(`${DATA_PRODUCTS_BASE}${encodeURIComponent(cat)}.json`);
    if (!catResp.ok) {
        throw new Error(`Cannot load category file ${cat}.json: HTTP ${catResp.status}`);
    }
    const products = await catResp.json();
    const product = products.find((p) => p.id === resolvedId);
    if (!product) {
        throw new Error(`Product not found in category file ${cat}.json for ${resolvedId}`);
    }

    renderProduct(product, cat);
}

function renderProduct(rawProduct, cat) {
    const product = normalizeProduct(rawProduct);
    // Заголовок и цена
    const titleEl = document.getElementById('productTitle');
    const priceEl = document.getElementById('productPrice');
    if (titleEl) titleEl.textContent = product.name || '';
    if (priceEl) {
        priceEl.textContent = formatPrice(product.price);
    }
    document.title = `${product.name || 'Товар'} — нжен ЛЁН`;

    // Хлебные крошки: категория и имя товара
    const categoryCrumb = document.querySelector('.breadcrumbs a[href*="category.html"]');
    if (categoryCrumb) {
        categoryCrumb.href = `category.html?cat=${encodeURIComponent(cat)}`;
        categoryCrumb.textContent = CATEGORY_LABELS[cat] || 'Категория';
    }
    const crumbs = document.querySelector('.breadcrumbs span:last-child');
    if (crumbs) crumbs.textContent = product.name || '';

    // Галерея
    const galleryRoot = document.getElementById('productGallery');
    if (!galleryRoot) return;

    const images = [];
    if (product.image) images.push(product.image);
    if (Array.isArray(rawProduct.gallery) && rawProduct.gallery.length) {
        images.push(...rawProduct.gallery);
    }
    if (!images.length) return;

    const srcs = images.map((src) => resolveImageUrl(src));

    const mainSrc = srcs[0];
    const thumbs = srcs.slice(1);

    const mainHtml = `
        <div class="product-main-image">
            <img src="${mainSrc}" alt="${safeText(product.name || '')}" id="productMainImg">
        </div>
    `;

    let thumbsHtml = '';
    if (thumbs.length) {
        thumbsHtml = `
            <div class="product-thumbs">
                ${thumbs
                    .map(
                        (src, i) =>
                            `<button class="product-thumb${i === 0 ? ' active' : ''}" type="button" data-src="${src}">
                                <img src="${src}" alt="${safeText(product.name || '')}">
                            </button>`
                    )
                    .join('')}
            </div>
        `;
    }

    galleryRoot.innerHTML = mainHtml + thumbsHtml;

    const addBtn = document.querySelector('.add-to-cart-btn');
    if (addBtn) {
        addBtn.dataset.productId = product.id || '';
    }

    if (thumbs.length) {
        const mainImg = galleryRoot.querySelector('#productMainImg');
        const thumbBtns = Array.from(galleryRoot.querySelectorAll('.product-thumb'));
        thumbBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const src = btn.getAttribute('data-src');
                if (src && mainImg) {
                    mainImg.setAttribute('src', src);
                }
                thumbBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
}

function showProductLoadError() {
    const titleEl = document.getElementById('productTitle');
    const priceEl = document.getElementById('productPrice');
    const galleryRoot = document.getElementById('productGallery');
    if (titleEl) titleEl.textContent = 'Товар временно недоступен';
    if (priceEl) priceEl.textContent = '—';
    if (galleryRoot) {
        galleryRoot.innerHTML =
            '<div class="category-empty">Не удалось загрузить карточку товара. Попробуйте позже.</div>';
    }
}

// Legacy utility kept for reference; not used in current renderer.
// function escapeHtml(s) {
//     if (s == null) return '';
//     const div = document.createElement('div');
//     div.textContent = s;
//     return div.innerHTML;
// }
