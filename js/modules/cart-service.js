import { formatPrice } from './product-model.js';

const STORAGE_KEY = 'njen_cart';

function makeCartKey({ id = '', selectedSize = '', selectedColor = '' } = {}) {
    // Stable key for a unique cart line (product + size + color).
    // Encode components to avoid delimiter collisions.
    return [id, selectedSize, selectedColor]
        .map((v) => encodeURIComponent(String(v ?? '')))
        .join('|');
}

export function getCart() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const cart = Array.isArray(parsed) ? parsed : [];
        // Migration: older cart items may miss selectedSize/selectedColor/cartKey.
        return cart.map((item) => {
            const selectedSize = item?.selectedSize ?? '';
            const selectedColor = item?.selectedColor ?? '';
            const id = item?.id ?? '';
            const cartKey = item?.cartKey || makeCartKey({ id, selectedSize, selectedColor });
            return {
                ...item,
                id,
                selectedSize,
                selectedColor,
                cartKey,
            };
        });
    } catch {
        return [];
    }
}

export function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

export function addItem(cart, product) {
    const cartKey = makeCartKey(product);
    const existing = cart.find((item) => item.cartKey === cartKey || makeCartKey(item) === cartKey);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: product.quantity ?? 1, cartKey });
    }
    return cart;
}

export function removeItem(cart, cartKey) {
    return cart.filter((item) => item.cartKey !== cartKey);
}

export function updateItemQuantity(cart, cartKey, quantity) {
    if (quantity <= 0) {
        return removeItem(cart, cartKey);
    }
    return cart.map((item) => (item.cartKey === cartKey ? { ...item, quantity } : item));
}

export function cartSubtotal(cart) {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function formatCartPrice(value) {
    return formatPrice(value);
}

export function getDeliveryCost(method, subtotal, basePrices) {
    const prices = basePrices || { cdek: 350, post: 300, courier: 600 };
    // Пример бизнес-логики: бесплатная доставка СДЭК от 5000 ₽
    if (method === 'cdek' && subtotal >= 5000) {
        return 0;
    }
    return prices[method] ?? prices.cdek;
}

export function getCartTotals(cart, method, basePrices) {
    const subtotal = cartSubtotal(cart);
    const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const delivery = subtotal === 0 ? 0 : getDeliveryCost(method, subtotal, basePrices);
    const total = subtotal + delivery;
    return { subtotal, delivery, total, itemsCount };
}

const FREE_DELIVERY_THRESHOLD = 5000;

export function getFreeDeliveryHint(subtotal) {
    if (subtotal <= 0) return { eligible: false, remaining: FREE_DELIVERY_THRESHOLD, progress: 0 };
    if (subtotal >= FREE_DELIVERY_THRESHOLD) return { eligible: true, remaining: 0, progress: 100 };
    const remaining = FREE_DELIVERY_THRESHOLD - subtotal;
    const progress = Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100);
    return { eligible: false, remaining, progress };
}

export { makeCartKey };
