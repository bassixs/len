import { formatPrice } from './product-model.js';

const STORAGE_KEY = 'njen_cart';

export function getCart() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

export function addItem(cart, product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: product.quantity ?? 1 });
    }
    return cart;
}

export function removeItem(cart, id) {
    return cart.filter(item => item.id !== id);
}

export function updateItemQuantity(cart, id, quantity) {
    if (quantity <= 0) {
        return removeItem(cart, id);
    }
    return cart.map(item =>
        item.id === id ? { ...item, quantity } : item
    );
}

export function cartSubtotal(cart) {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function formatCartPrice(value) {
    return formatPrice(value);
}

