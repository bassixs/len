import { formatPrice } from './product-model.js';
import { openLayer, closeLayer } from './ui-shell.js';
import {
    getCart as getStoredCart,
    saveCart as saveStoredCart,
    addItem,
    removeItem,
    updateItemQuantity,
    getCartTotals,
} from './cart-service.js';

const DELIVERY_PRICES = { cdek: 350, post: 300, courier: 600 };

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
            const activeSizeBtn =
                card.querySelector('.size-btn.active') || document.querySelector('.size-btn.active');
            if (activeSizeBtn) {
                product.selectedSize =
                    activeSizeBtn.dataset.size || activeSizeBtn.textContent.trim() || '';
            }

            // Selected color (if any)
            const activeColorDot =
                card.querySelector('.color-dot.active') || document.querySelector('.color-dot.active');
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

// ===== TOAST & MINICART LOGIC =====

function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) return; // Assuming it's in modals.html

    const toast = document.createElement('div');
    toast.className = 'toast reveal'; // simple animation class
    toast.innerHTML = `<i class="fas fa-check-circle"></i> <span>${message}</span>`;

    container.appendChild(toast);

    // Trigger reflow for animation
    setTimeout(() => toast.classList.add('toast--visible'), 10);

    setTimeout(() => {
        toast.classList.remove('toast--visible');
        setTimeout(() => toast.remove(), 300); // Wait for fade out
    }, 3000);
}

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
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const meta = [];
        if (item.selectedSize) meta.push(`Размер: ${item.selectedSize}`);
        if (item.selectedColor) meta.push(`Цвет: ${item.selectedColor}`);
        const metaHtml = meta.length
            ? `<div class="cart-drawer-meta">${meta.join(' · ')}</div>`
            : '';
        html += `
            <div class="cart-drawer-item">
                <img src="${item.img}" alt="${item.name}" class="cart-drawer-img">
                <div class="cart-drawer-info">
                    <h4 class="cart-drawer-name">${item.name}</h4>
                    ${metaHtml}
                    <div class="cart-drawer-price">${formatPrice(item.price)} x ${item.quantity}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    if (totalEl) totalEl.textContent = formatPrice(total);
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

export function removeFromCart(id) {
    const cart = removeItem(getStoredCart(), id);
    saveCart(cart);
    if (document.querySelector('.cart-items:not(.cart-drawer-items)')) {
        renderCartPage();
    }
    renderMiniCart();
}

export function updateQuantity(id, quantity) {
    const cart = updateItemQuantity(getStoredCart(), id, quantity);
    saveCart(cart);
    if (document.querySelector('.cart-items:not(.cart-drawer-items)')) {
        renderCartPage();
    }
    renderMiniCart();
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
        // Disable checkout button
        const checkoutBtn = document.querySelector('.checkout-summary-box .btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        }
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const meta = [];
        if (item.selectedSize) meta.push(`Размер: ${item.selectedSize}`);
        if (item.selectedColor) meta.push(`Цвет: ${item.selectedColor}`);
        const metaHtml = meta.length ? meta.join(' · ') : '';
        html += `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.img}" alt="${item.name}">
                </div>
                <div class="cart-item-info">
                    <h3 class="cart-item-name">${item.name}</h3>
                    <div class="cart-item-meta">${metaHtml}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn minus" aria-label="Уменьшить">−</button>
                        <input type="number" class="qty-input" value="${item.quantity}" min="1" aria-label="Количество">
                        <button class="qty-btn plus" aria-label="Увеличить">+</button>
                    </div>
                </div>
                <div class="cart-item-price-wrapper">
                    <div class="cart-item-price">${formatPrice(itemTotal)}</div>
                    <button class="cart-item-remove" aria-label="Удалить"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
    });

    cartContainer.innerHTML = html;

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countEl = document.getElementById('cart-item-count');
    if (countEl) countEl.textContent = pluralize(totalItems, 'товар', 'товара', 'товаров');

    if (summarySubtotal) summarySubtotal.textContent = formatPrice(total);
    updateCheckoutSummary(total);

    // Re-enable checkout button
    const checkoutBtn = document.querySelector('.checkout-summary-box .btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.cursor = 'pointer';
    }

    // Attach event listeners for the newly rendered buttons
    attachCartPageListeners();
}

function attachCartPageListeners() {
    const cartContainer = document.querySelector('.cart-items:not(.cart-drawer-items)');
    if (!cartContainer) return;

    cartContainer.querySelectorAll('.cart-item').forEach((itemEl) => {
        const id = itemEl.dataset.id;

        const minusBtn = itemEl.querySelector('.qty-btn.minus');
        const plusBtn = itemEl.querySelector('.qty-btn.plus');
        const input = itemEl.querySelector('.qty-input');
        const removeBtn = itemEl.querySelector('.cart-item-remove');

        minusBtn.addEventListener('click', () => {
            updateQuantity(id, parseInt(input.value, 10) - 1);
        });

        plusBtn.addEventListener('click', () => {
            updateQuantity(id, parseInt(input.value, 10) + 1);
        });

        input.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            updateQuantity(id, val);
        });

        removeBtn.addEventListener('click', () => {
            removeFromCart(id);
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
        deliveryEl.textContent = totals.subtotal === 0 ? '—' : formatPrice(totals.delivery);
    }
    if (totalEl) {
        totalEl.textContent = formatPrice(totals.total);
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
