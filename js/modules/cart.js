import { formatPrice } from './product-model.js';
import { openLayer, closeLayer } from './ui-shell.js';
import { showToast } from './toast.js';
import {
    getCart as getStoredCart,
    saveCart as saveStoredCart,
    addItem,
    removeItem,
    updateItemQuantity,
    getCartTotals,
    getFreeDeliveryHint,
} from './cart-service.js';

const DELIVERY_PRICES = { cdek: 350, post: 300, courier: 600 };

function sanitizeImageSrc(src) {
    const s = String(src ?? '');
    // Allow only safe URL schemes/paths for img.src.
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/') || s.startsWith('./') || s.startsWith('../')) return s;
    return '';
}

function isMiniCartOpen() {
    return Boolean(document.querySelector('#cartDrawer.is-open'));
}

export function initCart() {
    updateCartIcon();
    initMiniCart();
    initCartPageDelivery();

    // Attach to add to cart buttons
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    addToCartBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            // Support both old grid layout and new split-screen layout
            const card =
                e.target.closest('.product-card') ||
                e.target.closest('.product-info') ||
                e.target.closest('.product-info-sticky') ||
                e.target.closest('.product-detail-grid');
            if (!card) return;

            let product = {
                id: '',
                name: 'Product',
                price: 0,
                img: '',
                quantity: 1,
                selectedSize: '',
                selectedColor: '',
                url: '',
            };

            const nameEl = card.querySelector(
                '.product-card-name, .product-title, .product-title-premium'
            );
            if (nameEl) product.name = nameEl.textContent.trim();

            const priceEl = card.querySelector(
                '.price-current, .product-price, .product-price-premium'
            );
            if (priceEl) {
                // Parse integer from string like '3 400 ₽'
                product.price = parseInt(priceEl.textContent.replace(/\D/g, ''), 10) || 0;
            }

            // For product page, image is in gallery, which is outside info block
            const formContainer = e.target.closest('.product-split'); // new layout
            const gridContainer = e.target.closest('.product-detail-grid'); // old layout

            let imgEl = card.querySelector('img'); // For catalog cards
            if (!imgEl && formContainer) {
                imgEl = formContainer.querySelector('#productMainImg');
            } else if (!imgEl && gridContainer) {
                imgEl = gridContainer.querySelector('#productMainImg');
            }

            if (imgEl) product.img = imgEl.src;

            // Prefer explicit product id from dataset or URL.
            const datasetId = btn.dataset.productId || card.dataset.productId;
            const urlId = new URLSearchParams(window.location.search).get('id');
            if (datasetId) {
                product.id = datasetId;
            } else if (urlId) {
                product.id = urlId;
            } else {
                // Deterministic fallback for legacy static cards without product id.
                product.id =
                    'name_' + btoa(unescape(encodeURIComponent(product.name))).replace(/=+$/, '');
            }

            // Selected size (if any)
            // Scope to the current product UI to avoid picking "active" controls from other cards.
            const pickerRoot = formContainer || gridContainer || card;
            const activeSizeBtn = pickerRoot ? pickerRoot.querySelector('.size-btn.active') : null;
            if (activeSizeBtn) {
                product.selectedSize =
                    activeSizeBtn.dataset.size || activeSizeBtn.textContent.trim() || '';
            }

            // Selected color (if any)
            const activeColorDot = pickerRoot
                ? pickerRoot.querySelector('.color-dot.active')
                : null;
            if (activeColorDot) {
                product.selectedColor =
                    activeColorDot.dataset.color ||
                    activeColorDot.getAttribute('title') ||
                    activeColorDot.style.background ||
                    '';
            }

            // Product URL (for potential use in full cart / future features)
            const quickLink = card.querySelector('.product-quick-btn');
            if (quickLink && quickLink.href) {
                product.url = quickLink.href;
            } else if (product.id) {
                const url = new URL(window.location.href);
                url.pathname = url.pathname.replace(/[^/]+$/, 'product.html');
                url.searchParams.set('id', product.id);
                product.url = url.toString();
            } else {
                product.url = window.location.href;
            }

            addToCart(product);

            // Show feedback using toast and minicart instead of button text
            showToast(`«${product.name}» добавлено в корзину`);
            openMiniCart();
        });
    });

    // Render cart on cart page
    if (document.querySelector('.cart-items:not(.cart-drawer-items)')) {
        renderCartPage();
    }
}

// ===== MINICART LOGIC =====

function initMiniCart() {
    const cartLinks = document.querySelectorAll('.header-cart');
    const overlay = document.getElementById('cartOverlay');
    const closeBtn = document.getElementById('cartDrawerClose');

    cartLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            // Only prevent default and open drawer if not on cart page
            if (!window.location.pathname.includes('cart.html')) {
                e.preventDefault();
                openMiniCart();
            }
        });
    });

    if (overlay) overlay.addEventListener('click', closeMiniCart);
    if (closeBtn) closeBtn.addEventListener('click', closeMiniCart);
}

function openMiniCart() {
    renderMiniCart();
    openLayer('#cartDrawer');
    openLayer('#cartOverlay');
}

function closeMiniCart() {
    closeLayer('#cartDrawer');
    closeLayer('#cartOverlay');
}

function renderMiniCart() {
    const container = document.getElementById('cartDrawerItems');
    const totalEl = document.getElementById('cartDrawerTotal');
    if (!container) return;

    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = '<div class="cart-drawer-empty">Ваша корзина пуста</div>';
        if (totalEl) totalEl.textContent = '0 ₽';
        renderMiniCartHint(0);
        return;
    }

    let total = 0;
    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    cart.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const meta = [];
        if (item.selectedSize) meta.push(`Размер: ${item.selectedSize}`);
        if (item.selectedColor) meta.push(`Цвет: ${item.selectedColor}`);
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-drawer-item';

        const imgEl = document.createElement('img');
        imgEl.className = 'cart-drawer-img';
        imgEl.src = sanitizeImageSrc(item.img);
        imgEl.alt = String(item.name ?? '');
        itemEl.appendChild(imgEl);

        const infoEl = document.createElement('div');
        infoEl.className = 'cart-drawer-info';

        const nameEl = document.createElement('h4');
        nameEl.className = 'cart-drawer-name';
        nameEl.textContent = String(item.name ?? '');
        infoEl.appendChild(nameEl);

        if (meta.length) {
            const metaEl = document.createElement('div');
            metaEl.className = 'cart-drawer-meta';
            metaEl.textContent = meta.join(' · ');
            infoEl.appendChild(metaEl);
        }

        const priceEl = document.createElement('div');
        priceEl.className = 'cart-drawer-price';
        priceEl.textContent = `${formatPrice(item.price)} x ${item.quantity}`;
        infoEl.appendChild(priceEl);

        itemEl.appendChild(infoEl);
        frag.appendChild(itemEl);
    });

    container.appendChild(frag);
    if (totalEl) totalEl.textContent = formatPrice(total);
    renderMiniCartHint(total);
}

function renderMiniCartHint(subtotal) {
    const el = document.getElementById('cartDrawerHint');
    if (!el) return;

    const hint = getFreeDeliveryHint(subtotal);

    if (subtotal <= 0) {
        el.innerHTML = '';
        el.className = 'cart-drawer-hint';
        return;
    }

    if (hint.eligible) {
        el.className = 'cart-drawer-hint cart-drawer-hint--reached';
        el.innerHTML =
            '<i class="fas fa-check-circle"></i> Доставка СДЭК — <strong>бесплатно!</strong>';
    } else {
        el.className = 'cart-drawer-hint';
        el.innerHTML =
            `До бесплатной доставки: <strong>${formatPrice(hint.remaining)}</strong>` +
            `<div class="cart-drawer-hint-bar"><div class="cart-drawer-hint-bar-fill" style="width:${hint.progress}%"></div></div>`;
    }
}

export function getCart() {
    return getStoredCart();
}

export function saveCart(cart) {
    saveStoredCart(cart);
    updateCartIcon();
}

export function addToCart(product) {
    const cart = addItem(getStoredCart(), product);
    saveCart(cart);
}

export function removeFromCart(cartKey) {
    const cart = removeItem(getStoredCart(), cartKey);
    saveCart(cart);
    if (document.querySelector('.cart-items:not(.cart-drawer-items)')) {
        renderCartPage();
    }
    if (isMiniCartOpen()) {
        renderMiniCart();
    }
}

export function updateQuantity(cartKey, quantity) {
    const cart = updateItemQuantity(getStoredCart(), cartKey, quantity);
    saveCart(cart);
    if (document.querySelector('.cart-items:not(.cart-drawer-items)')) {
        renderCartPage();
    }
    if (isMiniCartOpen()) {
        renderMiniCart();
    }
}

export function updateCartIcon() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach((badge) => {
        badge.textContent = totalItems;
        if (totalItems > 0) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

export function renderCartPage() {
    const cartContainer = document.querySelector('.cart-items:not(.cart-drawer-items)');
    const summarySubtotal = document.getElementById('cart-subtotal');
    if (!cartContainer) return;

    const cart = getCart();

    if (cart.length === 0) {
        cartContainer.innerHTML =
            '<p class="cart-empty-message">Ваша корзина пуста. <a href="catalog.html">Перейти к покупкам</a></p>';
        if (summarySubtotal) summarySubtotal.textContent = '0 ₽';
        const countEl = document.getElementById('cart-item-count');
        if (countEl) countEl.textContent = 'Товары';
        updateCheckoutSummary(0);
        const checkoutBtn = document.querySelector('.checkout-summary-box .btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.classList.add('btn--disabled');
        }
        return;
    }

    let total = 0;
    cartContainer.innerHTML = '';
    const frag = document.createDocumentFragment();

    cart.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const meta = [];
        if (item.selectedSize) meta.push(`Размер: ${item.selectedSize}`);
        if (item.selectedColor) meta.push(`Цвет: ${item.selectedColor}`);

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.dataset.cartKey = String(item.cartKey ?? '');

        const imgWrap = document.createElement('div');
        imgWrap.className = 'cart-item-image';
        const imgEl = document.createElement('img');
        imgEl.src = sanitizeImageSrc(item.img);
        imgEl.alt = String(item.name ?? '');
        imgWrap.appendChild(imgEl);
        itemEl.appendChild(imgWrap);

        const infoEl = document.createElement('div');
        infoEl.className = 'cart-item-info';

        const nameEl = document.createElement('h3');
        nameEl.className = 'cart-item-name';
        nameEl.textContent = String(item.name ?? '');
        infoEl.appendChild(nameEl);

        if (meta.length) {
            const metaEl = document.createElement('div');
            metaEl.className = 'cart-item-meta';
            metaEl.textContent = meta.join(' · ');
            infoEl.appendChild(metaEl);
        }

        const qtyEl = document.createElement('div');
        qtyEl.className = 'cart-item-qty';

        const minusBtn = document.createElement('button');
        minusBtn.type = 'button';
        minusBtn.className = 'qty-btn minus';
        minusBtn.setAttribute('aria-label', 'Уменьшить');
        minusBtn.textContent = '−';

        const inputEl = document.createElement('input');
        inputEl.type = 'number';
        inputEl.className = 'qty-input';
        inputEl.value = String(item.quantity ?? 1);
        inputEl.min = '1';
        inputEl.setAttribute('aria-label', 'Количество');

        const plusBtn = document.createElement('button');
        plusBtn.type = 'button';
        plusBtn.className = 'qty-btn plus';
        plusBtn.setAttribute('aria-label', 'Увеличить');
        plusBtn.textContent = '+';

        qtyEl.appendChild(minusBtn);
        qtyEl.appendChild(inputEl);
        qtyEl.appendChild(plusBtn);
        infoEl.appendChild(qtyEl);

        itemEl.appendChild(infoEl);

        const priceWrap = document.createElement('div');
        priceWrap.className = 'cart-item-price-wrapper';

        const priceLine = document.createElement('div');
        priceLine.className = 'cart-item-price';
        priceLine.textContent = formatPrice(itemTotal);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'cart-item-remove';
        removeBtn.setAttribute('aria-label', 'Удалить');
        const timesIcon = document.createElement('i');
        timesIcon.className = 'fas fa-times';
        removeBtn.appendChild(timesIcon);

        priceWrap.appendChild(priceLine);
        priceWrap.appendChild(removeBtn);
        itemEl.appendChild(priceWrap);

        frag.appendChild(itemEl);
    });

    cartContainer.appendChild(frag);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countEl = document.getElementById('cart-item-count');
    if (countEl) countEl.textContent = pluralize(totalItems, 'товар', 'товара', 'товаров');

    if (summarySubtotal) summarySubtotal.textContent = formatPrice(total);
    updateCheckoutSummary(total);

    const checkoutBtn = document.querySelector('.checkout-summary-box .btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('btn--disabled');
    }

    // Attach event listeners for the newly rendered buttons
    attachCartPageListeners();
}

function attachCartPageListeners() {
    const cartContainer = document.querySelector('.cart-items:not(.cart-drawer-items)');
    if (!cartContainer) return;

    cartContainer.querySelectorAll('.cart-item').forEach((itemEl) => {
        const cartKey = itemEl.dataset.cartKey;
        if (!cartKey) return;

        const minusBtn = itemEl.querySelector('.qty-btn.minus');
        const plusBtn = itemEl.querySelector('.qty-btn.plus');
        const input = itemEl.querySelector('.qty-input');
        const removeBtn = itemEl.querySelector('.cart-item-remove');

        if (!minusBtn || !plusBtn || !input || !removeBtn) return;

        minusBtn.addEventListener('click', () => {
            updateQuantity(cartKey, parseInt(input.value, 10) - 1);
        });

        plusBtn.addEventListener('click', () => {
            updateQuantity(cartKey, parseInt(input.value, 10) + 1);
        });

        input.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            updateQuantity(cartKey, val);
        });

        removeBtn.addEventListener('click', () => {
            removeFromCart(cartKey);
        });
    });
}

function pluralize(n, one, few, many) {
    const mod10 = n % 10,
        mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return `${n} ${many}`;
    if (mod10 === 1) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
    return `${n} ${many}`;
}

function updateCheckoutSummary(_subtotal) {
    const deliveryEl = document.getElementById('deliveryCostText');
    const totalEl = document.getElementById('cart-total');
    const cart = getCart();
    const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
    let method = 'cdek';
    if (deliveryRadios.length) {
        const checked = document.querySelector('input[name="delivery"]:checked');
        if (checked && checked.value) method = checked.value;
    }
    const totals = getCartTotals(cart, method, DELIVERY_PRICES);

    if (deliveryEl) {
        if (totals.subtotal === 0) {
            deliveryEl.textContent = '—';
            deliveryEl.classList.remove('delivery-free-label');
        } else if (totals.delivery === 0) {
            deliveryEl.textContent = 'Бесплатно';
            deliveryEl.classList.add('delivery-free-label');
        } else {
            deliveryEl.textContent = formatPrice(totals.delivery);
            deliveryEl.classList.remove('delivery-free-label');
        }
    }
    if (totalEl) {
        totalEl.textContent = formatPrice(totals.total);
    }

    renderFreeDeliveryHint(totals.subtotal);
}

function renderFreeDeliveryHint(subtotal) {
    const container = document.getElementById('freeDeliveryHint');
    if (!container) return;

    const hint = getFreeDeliveryHint(subtotal);

    if (subtotal <= 0) {
        container.innerHTML = '';
        container.className = 'free-delivery-hint';
        return;
    }

    if (hint.eligible) {
        container.className = 'free-delivery-hint free-delivery-hint--reached';
        container.innerHTML =
            '<i class="fas fa-check-circle"></i> Доставка СДЭК — <strong>бесплатно!</strong>';
    } else {
        container.className = 'free-delivery-hint';
        container.innerHTML =
            `До бесплатной доставки СДЭК осталось <strong>${formatPrice(hint.remaining)}</strong>` +
            `<div class="free-delivery-bar"><div class="free-delivery-bar-fill" style="width:${hint.progress}%"></div></div>`;
    }
}

function initCartPageDelivery() {
    document.querySelectorAll('input[name="delivery"]').forEach((radio) => {
        radio.addEventListener('change', () => {
            const cart = getCart();
            const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            updateCheckoutSummary(subtotal);
        });
    });
}
