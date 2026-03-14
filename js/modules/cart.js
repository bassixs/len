export function initCart() {
    updateCartIcon();

    // Attach to add to cart buttons
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn, .btn-primary:not(a)'); 
    // Need a specific class or ID, let's use .add-to-cart-btn
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Need to parse product data from DOM or data attributes
            // Let's assume a structure or simply add a dummy product for now to prove concept
            const card = e.target.closest('.product-card') || e.target.closest('.product-info') || e.target.closest('.product-detail-grid');
            if (!card) return;

            let product = {
                id: Date.now().toString(), // Should ideally be a real ID
                name: 'Product',
                price: 0,
                img: '',
                quantity: 1
            };

            const nameEl = card.querySelector('.product-card-name, .product-title');
            if (nameEl) product.name = nameEl.textContent.trim();

            const priceEl = card.querySelector('.price-current, .product-price');
            if (priceEl) {
                // Parse integer from string like '3 400 ₽'
                product.price = parseInt(priceEl.textContent.replace(/\D/g, ''), 10) || 0;
            }

            // For product page, image is in .product-gallery, which is a sibling of .product-info
            const imgEl = card.querySelector('img') || (card.closest('.product-detail-grid') && card.closest('.product-detail-grid').querySelector('#productMainImg'));
            if (imgEl) product.img = imgEl.src;

            // Simple ID generation based on name to prevent duplicates if same product added
            product.id = 'prod_' + btoa(unescape(encodeURIComponent(product.name))).substring(0, 10);

            addToCart(product);
            
            // Show feedback (e.g., text change)
            const originalText = btn.textContent;
            btn.textContent = 'В корзине';
            btn.classList.add('btn-success');
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('btn-success');
            }, 2000);
        });
    });

    // Render cart on cart page
    if (document.querySelector('.cart-items')) {
        renderCartPage();
    }
}

export function getCart() {
    return JSON.parse(localStorage.getItem('njen_cart')) || [];
}

export function saveCart(cart) {
    localStorage.setItem('njen_cart', JSON.stringify(cart));
    updateCartIcon();
}

export function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push(product);
    }
    saveCart(cart);
}

export function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== id);
    saveCart(cart);
    if (document.querySelector('.cart-items')) {
        renderCartPage();
    }
}

export function updateQuantity(id, quantity) {
    if (quantity <= 0) {
        removeFromCart(id);
        return;
    }
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity = quantity;
        saveCart(cart);
        if (document.querySelector('.cart-items')) {
            renderCartPage();
        }
    }
}

export function updateCartIcon() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
        badge.textContent = totalItems;
        if (totalItems > 0) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

export function renderCartPage() {
    const cartContainer = document.querySelector('.cart-items');
    const summarySubtotal = document.getElementById('cart-subtotal');
    const summaryTotal = document.getElementById('cart-total');
    if (!cartContainer) return;

    const cart = getCart();
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="cart-empty-message">Ваша корзина пуста. <a href="catalog.html">Перейти к покупкам</a></p>';
        if (summarySubtotal) summarySubtotal.textContent = '0 ₽';
        if (summaryTotal) summaryTotal.textContent = '0 ₽';
        // Disable checkout button
        const checkoutBtn = document.querySelector('.cart-summary .btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        }
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        html += `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.img}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-info">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <div class="cart-item-price">${formatPrice(item.price)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="qty-btn minus" aria-label="Уменьшить">-</button>
                    <input type="number" class="qty-input" value="${item.quantity}" min="1" aria-label="Количество">
                    <button class="qty-btn plus" aria-label="Увеличить">+</button>
                </div>
                <div class="cart-item-total">${formatPrice(itemTotal)}</div>
                <button class="cart-item-remove" aria-label="Удалить"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
    });

    cartContainer.innerHTML = html;

    if (summarySubtotal) summarySubtotal.textContent = formatPrice(total);
    if (summaryTotal) summaryTotal.textContent = formatPrice(total);
    
    // Re-enable checkout button
    const checkoutBtn = document.querySelector('.cart-summary .btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.cursor = 'pointer';
    }

    // Attach event listeners for the newly rendered buttons
    attachCartPageListeners();
}

function attachCartPageListeners() {
    const cartContainer = document.querySelector('.cart-items');
    if (!cartContainer) return;

    cartContainer.querySelectorAll('.cart-item').forEach(itemEl => {
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

function formatPrice(number) {
    return new Intl.NumberFormat('ru-RU').format(number) + ' ₽';
}
